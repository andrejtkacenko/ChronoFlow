
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Header from "@/components/Header";
import DailyOverview from "@/components/DailyOverview";
import { Skeleton } from '@/components/ui/skeleton';
import { addDays, subDays } from 'date-fns';
import MiniCalendar from '@/components/MiniCalendar';
import Inbox from '@/components/Inbox';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

export default function SchedulePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleNextDay = () => setCurrentDate(addDays(currentDate, 1));
  const handlePreviousDay = () => setCurrentDate(subDays(currentDate, 1));
  const handleSetToday = () => setCurrentDate(new Date());

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Skeleton className="h-24 w-24 rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-svh flex-col">
      <Header
        currentDate={currentDate}
        onNext={handleNextDay}
        onPrevious={handlePreviousDay}
        onToday={handleSetToday}
        showDateNav
      />
      <main className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={25} minSize={20} maxSize={30}>
            <div className="flex h-full flex-col gap-4 p-4">
              <MiniCalendar onDateSelect={(date) => setCurrentDate(date)} />
              <Inbox />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={75}>
              <div className="h-full overflow-y-auto">
                <DailyOverview date={currentDate} />
              </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}
