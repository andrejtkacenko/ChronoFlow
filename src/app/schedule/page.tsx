
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Header from "@/components/Header";
import DailyOverview from "@/components/DailyOverview";
import { Skeleton } from '@/components/ui/skeleton';
import { addDays, subDays } from 'date-fns';
import MiniCalendar from '@/components/MiniCalendar';

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
      <main className="flex-1 overflow-y-auto relative">
        <DailyOverview date={currentDate} />
        <div className="absolute bottom-4 left-4 z-20 hidden md:block">
            <MiniCalendar onDateSelect={(date) => setCurrentDate(date)} />
        </div>
      </main>
    </div>
  );
}
