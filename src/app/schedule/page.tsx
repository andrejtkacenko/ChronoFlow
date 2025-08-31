
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
import { Separator } from '@/components/ui/separator';
import RightSidebar from '@/components/RightSidebar';
import { cn } from '@/lib/utils';

export default function SchedulePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

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
        isRightSidebarOpen={isRightSidebarOpen}
        onToggleRightSidebar={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
      />
      <main className="flex flex-1 overflow-hidden">
        <div className="w-[340px] border-r flex flex-col">
            <div className="flex-1 flex flex-col overflow-y-auto">
              <div className="px-4 pt-4 flex-1 flex flex-col">
                <Inbox />
              </div>
            </div>
            <Separator />
            <div className="pb-4 pt-4 flex justify-center">
              <MiniCalendar onDateSelect={(date) => setCurrentDate(date)} />
            </div>
        </div>
        <div className="flex-1 h-full overflow-y-auto">
            <DailyOverview date={currentDate} />
        </div>
        <div className={cn("border-l transition-all duration-300", isRightSidebarOpen ? "w-[240px]" : "w-[68px]")}>
            <RightSidebar isOpen={isRightSidebarOpen} />
        </div>
      </main>
    </div>
  );
}
