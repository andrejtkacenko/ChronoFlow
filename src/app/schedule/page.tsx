
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
import { addDays, format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

const MINUTE_HEIGHT_PX = 80 / 60;

export default function SchedulePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [isNewEventDialogOpen, setIsNewEventDialogOpen] = useState(false);
  const [newEventData, setNewEventData] = useState<{ date: Date; startTime: string } | null>(null);
  const [numberOfDays, setNumberOfDays] = useState(1);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) {
      setNumberOfDays(1);
    }
  }, [isMobile]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleTimeSlotClick = (date: Date, startTime: string) => {
    setNewEventData({ date, startTime });
    setIsNewEventDialogOpen(true);
  };
  
  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>, day: Date) => {
      const grid = e.currentTarget;
      if (!grid) return;
      
      const relativeTarget = e.target as HTMLElement;
      if (relativeTarget.closest('[data-no-grid-click]')) {
        return;
      }

      const rect = grid.getBoundingClientRect();
      const y = e.clientY - rect.top;
      
      if (y < 0) return;

      const totalMinutes = Math.floor(y / MINUTE_HEIGHT_PX);
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
      handleTimeSlotClick(day, startTime);
  }

  const handleDialogClose = () => {
    setIsNewEventDialogOpen(false);
    setNewEventData(null);
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
                      <Inbox userId={user.uid} />
                  </div>
                  <Separator />
                  <div className="py-4 flex justify-center">
                  <MiniCalendar onDateSelect={(date) => setCurrentDate(date)} />
                  </div>
              </div>
              <div className="flex-1 flex flex-col overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                     {days.map(day => (
                        <div key={day.toString()} className="min-w-0 border-r">
                            <div className="p-4 border-b text-center sticky top-0 bg-background/95 backdrop-blur-sm z-20">
                                <p className="font-semibold">{format(day, 'eeee')}</p>
                                <p className="text-2xl font-bold">{format(day, 'd')}</p>
                            </div>
                        </div>
                     ))}
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 h-full">
                        {days.map(day => (
                            <div key={day.toString()} className="min-w-0 border-r" onClick={(e) => handleGridClick(e, day)}>
                                <DailyOverview 
                                    date={day} 
                                    newEventStartTime={newEventData?.date && newEventData.date.getTime() === day.getTime() ? newEventData.startTime : null}
                                    userId={user.uid}
                                />
                            </div>
                        ))}
                    </div>
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
                      isMobile={isMobile}
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
      {newEventData && user && (
        <NewEventDialog
            isOpen={isNewEventDialogOpen}
            onOpenChange={handleDialogClose}
            eventData={newEventData}
            userId={user.uid}
        />
      )}
    </>
  );
}
