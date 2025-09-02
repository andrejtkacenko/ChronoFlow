
'use client';

import { useEffect, useState } from 'react';
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
import { ChevronLeft } from 'lucide-react';
import NewEventDialog from '@/components/NewEventDialog';
import { addDays, format, isSameDay } from 'date-fns';
import type { ScheduleItem } from '@/lib/types';

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


export default function SchedulePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  
  // For creating new events
  const [newEventTime, setNewEventTime] = useState<{ date: Date; startTime: string } | null>(null);
  // For editing existing events
  const [editingEvent, setEditingEvent] = useState<ScheduleItem | null>(null);
  // For creating a new task from inbox
  const [isNewTask, setIsNewTask] = useState(false);

  const [numberOfDays, setNumberOfDays] = useState(3);
  const [hourHeight, setHourHeight] = useState(60);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  useEffect(() => {
    const savedDays = localStorage.getItem('numberOfDays');
    if (savedDays) {
      setNumberOfDays(parseInt(savedDays, 10));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('numberOfDays', String(numberOfDays));
  }, [numberOfDays]);

  const handleCreateNewEvent = (date: Date, startTime: string) => {
    setNewEventTime({ date, startTime });
    setEditingEvent(null);
    setIsNewTask(false);
    setIsEventDialogOpen(true);
  };

  const handleEditEvent = (event: ScheduleItem) => {
    setEditingEvent(event);
    setNewEventTime(null);
    setIsNewTask(false);
    setIsEventDialogOpen(true);
  }

  const handleCreateNewTask = () => {
    setEditingEvent(null);
    setNewEventTime(null);
    setIsNewTask(true);
    setIsEventDialogOpen(true);
  }
  
  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>, day: Date) => {
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
      handleCreateNewEvent(day, startTime);
  }

  const handleDialogClose = () => {
    setIsEventDialogOpen(false);
    setNewEventTime(null);
    setEditingEvent(null);
    setIsNewTask(false);
  }

  const days = Array.from({ length: numberOfDays }, (_, i) => addDays(currentDate, i));

  if (loading || !user) {
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
          <main className="flex flex-1 overflow-hidden">
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
                                    userId={user.uid}
                                    hourHeight={hourHeight}
                                    onEventClick={handleEditEvent}
                                />
                            </div>
                        </div>
                    ))}
                    <CurrentTimeIndicator days={days} hourHeight={hourHeight} />
                  </div>
              </div>
               <div
                  className={cn("transition-all duration-300 ease-in-out bg-card border-l",
                      isRightSidebarOpen ? "w-[250px]" : "w-0"
                  )}
               >
                  <RightSidebar
                      isOpen={isRightSidebarOpen}
                      numberOfDays={numberOfDays}
                      onNumberOfDaysChange={setNumberOfDays}
                      hourHeight={hourHeight}
                      onHourHeightChange={setHourHeight}
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
