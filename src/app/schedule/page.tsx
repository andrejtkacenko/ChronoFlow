
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
      <main className="flex flex-1 overflow-hidden">
        <div className="w-[340px] border-r flex flex-col">
            <div className="flex-1 flex flex-col overflow-y-auto pt-4">
              <div className="px-4 flex-1">
                <Inbox />
              </div>
            </div>
            <Separator className="my-4"/>
            <div className="pb-4 px-4">
              <MiniCalendar onDateSelect={(date) => setCurrentDate(date)} />
            </div>
        </div>
        <div className="flex-1 h-full overflow-y-auto">
            <DailyOverview date={currentDate} />
        </div>
      </main>
    </div>
  );
}
