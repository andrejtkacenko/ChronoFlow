
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

export default function SchedulePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [isNewEventDialogOpen, setIsNewEventDialogOpen] = useState(false);
  const [newEventData, setNewEventData] = useState<{ date: Date; startTime: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleTimeSlotClick = (startTime: string) => {
    setNewEventData({ date: currentDate, startTime });
    setIsNewEventDialogOpen(true);
  };
  
  const handleDialogClose = () => {
    setIsNewEventDialogOpen(false);
    setNewEventData(null);
  }

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
              <div className="w-[250px] flex flex-col border-r">
                  <div className="px-4 pt-4 flex-1 flex flex-col overflow-y-auto">
                      <Inbox userId={user.uid} />
                  </div>
                  <Separator />
                  <div className="py-4 flex justify-center">
                  <MiniCalendar onDateSelect={(date) => setCurrentDate(date)} />
                  </div>
              </div>
              <div className="flex-1 h-full overflow-y-auto py-4">
                  <DailyOverview 
                    date={currentDate} 
                    onTimeSlotClick={handleTimeSlotClick} 
                    newEventStartTime={newEventData?.startTime}
                    userId={user.uid}
                  />
              </div>
               <div
                  className={cn("transition-all duration-300 ease-in-out bg-card border-l",
                      isRightSidebarOpen ? "w-[64px]" : "w-0"
                  )}
               >
                  <RightSidebar
                      isOpen={isRightSidebarOpen}
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
