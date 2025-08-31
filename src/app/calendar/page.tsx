
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ScheduleItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import Header from '@/components/Header';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const CalendarHeader = ({
  currentMonth,
  onNextMonth,
  onPreviousMonth,
}: {
  currentMonth: Date;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
}) => (
  <div className="flex items-center justify-between">
    <h2 className="text-2xl font-bold">
      {format(currentMonth, 'MMMM yyyy')}
    </h2>
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={onPreviousMonth}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={onNextMonth}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  </div>
);

const DayCell = ({
  day,
  isCurrentMonth,
  isToday,
  events,
}: {
  day: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: ScheduleItem[];
}) => (
  <div
    className={cn(
      'relative flex h-32 flex-col rounded-lg border bg-card p-2',
      !isCurrentMonth && 'bg-muted/50 text-muted-foreground'
    )}
  >
    <span
      className={cn(
        'mb-1 self-end text-sm font-medium',
        isToday &&
          'flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground'
      )}
    >
      {format(day, 'd')}
    </span>
    <div className="flex-1 space-y-1 overflow-y-auto">
      {events.map((event) => (
        <div
          key={event.id}
          className="rounded-sm px-1.5 text-xs"
          style={{
            backgroundColor: event.color
              .replace(')', ', 0.2)')
              .replace('hsl', 'hsla'),
            borderLeft: `3px solid ${event.color}`,
          }}
        >
          {event.title}
        </div>
      ))}
    </div>
  </div>
);

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  useEffect(() => {
    if (user) {
      setLoading(true);
      const firstDay = format(startDate, 'yyyy-MM-dd');
      const lastDay = format(endDate, 'yyyy-MM-dd');
      
      const q = query(
        collection(db, "scheduleItems"),
        where("date", ">=", firstDay),
        where("date", "<=", lastDay)
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const items: ScheduleItem[] = [];
        querySnapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as ScheduleItem);
        });
        setScheduleItems(items);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching schedule items: ", error);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [currentMonth, user, startDate, endDate]);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const eventsByDay = useMemo(() => {
    const eventsMap = new Map<string, ScheduleItem[]>();
    scheduleItems.forEach((item) => {
      const dateString = item.date; // Date is already YYYY-MM-DD
      if (!eventsMap.has(dateString)) {
        eventsMap.set(dateString, []);
      }
      eventsMap.get(dateString)?.push(item);
    });
    return eventsMap;
  }, [scheduleItems]);

  const getEventsForDay = (day: Date) => {
    const dateString = format(day, 'yyyy-MM-dd');
    return eventsByDay.get(dateString) || [];
  };

  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Skeleton className="h-24 w-24 rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-svh flex-col">
      <Header />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="space-y-4">
          <CalendarHeader
            currentMonth={currentMonth}
            onNextMonth={() => setCurrentMonth(addMonths(currentMonth, 1))}
            onPreviousMonth={() =>
              setCurrentMonth(subMonths(currentMonth, 1))
            }
          />
          <div className="grid grid-cols-7 gap-2 text-center text-sm font-semibold text-muted-foreground">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {days.map((day) => (
              <DayCell
                key={day.toString()}
                day={day}
                isCurrentMonth={isSameMonth(day, currentMonth)}
                isToday={isSameDay(day, new Date())}
                events={getEventsForDay(day)}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
