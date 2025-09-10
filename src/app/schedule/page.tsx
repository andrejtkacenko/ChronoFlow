
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Header from "@/components/Header";
import DailyOverview from "@/components/DailyOverview";
import { Skeleton } from '@/components/ui/skeleton';
import MiniCalendar from '@/components/MiniCalendar';
import Inbox from '@/components/Inbox';
import { Separator } from '@/components/ui/separator';
import RightSidebar from '@/components/RightSidebar';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Check, ChevronLeft, X } from 'lucide-react';
import NewEventDialog from '@/components/NewEventDialog';
import { addDays, format, isSameDay, parse, startOfDay, endOfDay, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import type { ScheduleItem, DisplayScheduleItem } from '@/lib/types';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { deleteScheduleItemsInRange } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

const hours = Array.from({ length: 24 }, (_, i) => {
    const hour24 = i;
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const ampm = hour24 < 12 ? 'AM' : 'PM';
    if (hour24 === 0) return '12 AM';
    if (hour24 === 12) return '12 PM';
    return `${hour12} ${ampm}`;
});


const CurrentTimeIndicator = ({ days, hourHeight }: { days: Date[], hourHeight: number }) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    const todayExists = days.some(day => isSameDay(day, currentTime));
    if (!todayExists) return null;
    
    const minuteHeight = hourHeight / 60;
    const top = (currentTime.getHours() * 60 + currentTime.getMinutes()) * minuteHeight;

    return (
        <div className="absolute left-16 right-0" style={{ top: `${top}px`}}>
            <div className="relative h-px w-full">
                <div className="absolute -left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary z-30"></div>
                <div className="h-[1px] w-full bg-primary z-30"></div>
            </div>
        </div>
    );
};

interface Projection {
  date: Date;
  startTime: string; // "HH:mm"
  duration: number; // minutes
}

const ProjectionCard = ({ 
    projection, 
    hourHeight, 
    onConfirm, 
    onCancel 
}: { 
    projection: Projection, 
    hourHeight: number, 
    onConfirm: () => void,
    onCancel: () => void
}) => {
  const minuteHeight = hourHeight / 60;
  const top = (parseInt(projection.startTime.split(":")[0]) * 60 + parseInt(projection.startTime.split(":")[1])) * minuteHeight;
  const height = projection.duration * minuteHeight;

  return (
    <div
      className="absolute left-2 right-2 rounded-lg p-2 transition-all ease-in-out mr-4 z-20 flex flex-col justify-between"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: 'hsla(var(--primary) / 0.1)',
        border: `2px dashed hsl(var(--primary))`,
      }}
    >
      <p className="text-xs font-semibold text-primary">New Event</p>
      <div className="flex justify-end items-center gap-2">
        <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={(e) => { e.stopPropagation(); onCancel(); }}>
          <X className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={(e) => { e.stopPropagation(); onConfirm(); }}>
          <Check className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const processScheduleForDisplay = (items: ScheduleItem[], visibleDays: Date[]): Map<string, DisplayScheduleItem[]> => {
    const displayMap = new Map<string, DisplayScheduleItem[]>();
    const visibleInterval = { start: startOfDay(visibleDays[0]), end: endOfDay(visibleDays[visibleDays.length - 1])};

    visibleDays.forEach(day => {
        displayMap.set(format(day, 'yyyy-MM-dd'), []);
    });

    items.forEach(item => {
        if (!item.date || !item.startTime || !item.endTime) return;

        const itemDate = parse(item.date, 'yyyy-MM-dd', new Date());
        if (!isWithinInterval(itemDate, visibleInterval)) {
             // Basic check to exclude items far out of view
             // This can be improved with more robust logic
            return;
        }
       
        const crossesMidnight = item.startTime > item.endTime;

        if (!crossesMidnight) {
            const dateStr = format(itemDate, 'yyyy-MM-dd');
            if (displayMap.has(dateStr)) {
                displayMap.get(dateStr)!.push({ ...item, isStart: true, isEnd: true });
            }
        } else {
            // Event crosses midnight, so we split it
            const day1DateStr = format(itemDate, 'yyyy-MM-dd');
            const day2Date = addDays(itemDate, 1);
            const day2DateStr = format(day2Date, 'yyyy-MM-dd');

            // Part 1: from startTime to end of day 1
            if (displayMap.has(day1DateStr)) {
                 const startMins = parseInt(item.startTime.split(':')[0]) * 60 + parseInt(item.startTime.split(':')[1]);
                 const duration1 = 24 * 60 - startMins;

                displayMap.get(day1DateStr)!.push({
                    ...item,
                    endTime: '23:59',
                    duration: duration1,
                    isStart: true,
                    isEnd: false, // This part doesn't end here
                });
            }

            // Part 2: from start of day 2 to endTime
            if (displayMap.has(day2DateStr)) {
                const endMins = parseInt(item.endTime.split(':')[0]) * 60 + parseInt(item.endTime.split(':')[1]);
                displayMap.get(day2DateStr)!.push({
                    ...item,
                    date: day2DateStr,
                    startTime: '00:00',
                    duration: endMins,
                    isStart: false, // This part is a continuation
                    isEnd: true,
                });
            }
        }
    });

    // Sort items within each day by start time
    for (const key of displayMap.keys()) {
        displayMap.get(key)!.sort((a,b) => (a.startTime || "00:00").localeCompare(b.startTime || "00:00"));
    }

    return displayMap;
}

export default function SchedulePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [projection, setProjection] = useState<Projection | null>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  
  // For creating new events
  const [newEventTime, setNewEventTime] = useState<{ date: Date; startTime: string } | null>(null);
  // For editing existing events
  const [editingEvent, setEditingEvent] = useState<ScheduleItem | null>(null);
  // For creating a new task from inbox
  const [isNewTask, setIsNewTask] = useState(false);

  const [numberOfDays, setNumberOfDays] = useState(3);
  const [hourHeight, setHourHeight] = useState(60);

  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
        setLoadingSchedule(true);
        const q = query(
            collection(db, "scheduleItems"), 
            where("userId", "==", user.uid)
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const items: ScheduleItem[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // Filter out unscheduled tasks (inbox items)
                if (data.date) {
                    items.push({ id: doc.id, ...data } as ScheduleItem);
                }
            });
            setScheduleItems(items);
            setLoadingSchedule(false);
        }, (error) => {
            console.error("Error fetching schedule items: ", error);
            setLoadingSchedule(false);
        });

        return () => unsubscribe();
    }
  }, [user]);
  
  useEffect(() => {
    const savedDays = localStorage.getItem('numberOfDays');
    if (savedDays) {
      setNumberOfDays(parseInt(savedDays, 10));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('numberOfDays', String(numberOfDays));
  }, [numberOfDays]);

  const days = Array.from({ length: numberOfDays }, (_, i) => addDays(currentDate, i));

  const displaySchedule = processScheduleForDisplay(scheduleItems, days);

  const handleCreateNewEvent = (date: Date, startTime: string) => {
    setNewEventTime({ date, startTime });
    setEditingEvent(null);
    setIsNewTask(false);
    setIsEventDialogOpen(true);
    setProjection(null);
  };

  const handleEditEvent = (event: ScheduleItem) => {
    setEditingEvent(event);
    setNewEventTime(null);
    setIsNewTask(false);
    setIsEventDialogOpen(true);
    setProjection(null);
  }

  const handleCreateNewTask = () => {
    setEditingEvent(null);
    setNewEventTime(null);
    setIsNewTask(true);
    setIsEventDialogOpen(true);
    setProjection(null);
  }
  
  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>, day: Date) => {
      const target = e.target as HTMLElement;
      // If we click on an existing event, do nothing here. The event's own onClick will fire.
      if (target.closest('.z-10')) { 
        setProjection(null);
        return;
      }
      
      const grid = e.currentTarget;
      if (!grid) return;

      const rect = grid.getBoundingClientRect();
      const y = e.clientY - rect.top;
      
      if (y < 0) return;
      
      const minuteHeight = hourHeight / 60;
      const totalMinutes = Math.floor(y / minuteHeight);
      const hour = Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;
      const roundedMinute = Math.round(minute / 15) * 15;
      
      let finalHour = hour + Math.floor(roundedMinute / 60);
      let finalMinute = roundedMinute % 60;

      if (finalHour >= 24) {
          finalHour = 23;
          finalMinute = 45;
      }
      
      const startTime = `${String(finalHour).padStart(2, '0')}:${String(finalMinute).padStart(2, '0')}`;
      
      setProjection({
        date: day,
        startTime: startTime,
        duration: 60,
      });
  }

  const handleDialogClose = () => {
    setIsEventDialogOpen(false);
    setNewEventTime(null);
    setEditingEvent(null);
    setIsNewTask(false);
  }

  const handleConfirmProjection = () => {
    if (projection) {
        handleCreateNewEvent(projection.date, projection.startTime);
    }
  }

  const handleDeleteEvents = async (period: 'day' | 'week' | 'month' | 'all') => {
    if (!user) return;
    let startDate: string | null = null;
    let endDate: string | null = null;
    if (period !== 'all') {
        const d = new Date(currentDate);
        if (period === 'day') { startDate = format(d, 'yyyy-MM-dd'); endDate = format(d, 'yyyy-MM-dd'); }
        if (period === 'week') { startDate = format(startOfWeek(d), 'yyyy-MM-dd'); endDate = format(endOfWeek(d), 'yyyy-MM-dd'); }
        if (period === 'month') { startDate = format(startOfMonth(d), 'yyyy-MM-dd'); endDate = format(endOfMonth(d), 'yyyy-MM-dd'); }
    }
    
    const result = await deleteScheduleItemsInRange(user.uid, startDate, endDate);
    if (result.deletedCount > 0) {
      toast({
        title: 'Events Deleted',
        description: `${result.deletedCount} events have been deleted.`,
      });
    } else {
      toast({
        title: 'No Events Found',
        description: 'There were no events to delete in the selected range.',
      });
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Skeleton className="h-24 w-24 rounded-full" />
      </div>
    );
  }

  return (
    <>
      <div className="flex h-svh flex-col relative overflow-hidden">
          <Header />
          <main className="flex flex-1 overflow-hidden" ref={mainContentRef}>
              <div className="w-[250px] flex-col border-r hidden md:flex">
                  <div className="px-4 pt-4 flex-1 flex flex-col overflow-y-auto">
                      <Inbox userId={user.uid} onNewTask={handleCreateNewTask} onEditTask={handleEditEvent}/>
                  </div>
                  <Separator />
                  <div className="py-4 flex justify-center">
                  <MiniCalendar onDateSelect={(date) => setCurrentDate(date)} />
                  </div>
              </div>
              <div className="flex-1 flex flex-col overflow-auto">
                  <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-20 grid" style={{ gridTemplateColumns: `64px repeat(${numberOfDays}, minmax(0, 1fr))`}}>
                     <div className="w-16 border-r border-b"></div>
                     {days.map(day => (
                        <div key={day.toString()} className="min-w-0 border-r border-b">
                            <div className="p-4 text-center">
                                <p className="font-semibold">{format(day, 'eeee')}</p>
                                <p className="text-2xl font-bold">{format(day, 'd')}</p>
                            </div>
                        </div>
                     ))}
                  </div>
                  <div className="relative grid" style={{ gridTemplateColumns: `64px repeat(${numberOfDays}, minmax(0, 1fr))`}}>
                    <div className="w-16 border-r">
                         {hours.map((hour, index) => (
                            <div key={hour} className="relative flex h-[--hour-height]" style={{'--hour-height': `${hourHeight}px`} as React.CSSProperties}>
                                <div className="w-16 flex-shrink-0 pr-2 text-right text-xs text-muted-foreground -translate-y-2">
                                {index > 0 && <span className="relative top-px">{hour}</span>}
                                </div>
                            </div>
                        ))}
                    </div>

                    {days.map(day => (
                        <div key={day.toString()} className="min-w-0 border-r relative" onClick={(e) => handleGridClick(e, day)}>
                             <div className="absolute inset-0">
                                {hours.map((_, index) => (
                                    <div key={index} className="h-[--hour-height] border-t" style={{'--hour-height': `${hourHeight}px`} as React.CSSProperties} />
                                ))}
                            </div>
                            <div className='relative h-full'>
                                <DailyOverview 
                                    date={day}
                                    dailySchedule={displaySchedule.get(format(day, 'yyyy-MM-dd')) || []}
                                    loading={loadingSchedule}
                                    hourHeight={hourHeight}
                                    onEventClick={handleEditEvent}
                                />
                                 {projection && isSameDay(projection.date, day) && (
                                    <ProjectionCard 
                                        projection={projection} 
                                        hourHeight={hourHeight} 
                                        onConfirm={handleConfirmProjection}
                                        onCancel={() => setProjection(null)}
                                    />
                                )}
                            </div>
                        </div>
                    ))}
                    {isClient && <CurrentTimeIndicator days={days} hourHeight={hourHeight} />}
                  </div>
              </div>
               <div
                  className={cn("transition-all duration-300 ease-in-out bg-card border-l",
                      isRightSidebarOpen ? "w-[300px]" : "w-0"
                  )}
               >
                  <RightSidebar
                      isOpen={isRightSidebarOpen}
                      numberOfDays={numberOfDays}
                      onNumberOfDaysChange={setNumberOfDays}
                      hourHeight={hourHeight}
                      onHourHeightChange={setHourHeight}
                      onDeleteEvents={handleDeleteEvents}
                  />
              </div>
          </main>
           <Button
              variant="outline"
              className={cn(
                  "fixed bottom-4 right-0 z-50 h-12 w-8 rounded-l-full rounded-r-none p-0 flex items-center justify-center transition-all duration-300 ease-in-out group hover:w-10"
              )}
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              >
              <ChevronLeft className={cn("h-5 w-5 transition-transform", !isRightSidebarOpen && "rotate-180")} />
          </Button>
      </div>
      {(isEventDialogOpen) && user && (
        <NewEventDialog
            isOpen={isEventDialogOpen}
            onOpenChange={handleDialogClose}
            newEventTime={newEventTime}
            existingEvent={editingEvent}
            isNewTask={isNewTask}
            userId={user.uid}
        />
      )}
    </>
  );
}
