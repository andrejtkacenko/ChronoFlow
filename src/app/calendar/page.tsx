
'use client';

import { useState, useMemo } from 'react';
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
import { scheduleItems } from '@/lib/data';
import type { ScheduleItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import SidebarNav from '@/components/SidebarNav';
import Header from '@/components/Header';

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
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const eventsByDay = useMemo(() => {
    const eventsMap = new Map<string, ScheduleItem[]>();
    scheduleItems.forEach((item) => {
      // In a real app, you'd parse item.date. For this demo, we'll fake it based on title.
      // This is a crude way to put events on different days for demo purposes.
      const dayOfMonth = (item.id.charCodeAt(0) % 28) + 1;
      const eventDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayOfMonth);

      const dateString = format(eventDate, 'yyyy-MM-dd');
      if (!eventsMap.has(dateString)) {
        eventsMap.set(dateString, []);
      }
      eventsMap.get(dateString)?.push(item);
    });
    return eventsMap;
  }, [currentMonth]);

  const getEventsForDay = (day: Date) => {
    const dateString = format(day, 'yyyy-MM-dd');
    return eventsByDay.get(dateString) || [];
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarNav />
      </Sidebar>
      <SidebarInset>
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
      </SidebarInset>
    </SidebarProvider>
  );
}
