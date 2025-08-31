"use client";

import { scheduleItems } from "@/lib/data";
import type { ScheduleItem } from "@/lib/types";
import { useEffect, useState } from "react";
import { format, isSameDay } from 'date-fns';

const hours = Array.from({ length: 24 }, (_, i) => {
    const hour24 = i;
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const ampm = hour24 < 12 ? 'AM' : (hour24 === 12 ? 'PM' : 'PM');
    if (hour24 === 0) return '12 AM';
    if (hour24 === 12) return '12 PM';
    return `${hour12} ${ampm}`;
});

const EventCard = ({ item }: { item: ScheduleItem }) => {
  const top = (parseInt(item.startTime.split(":")[0]) * 60 + parseInt(item.startTime.split(":")[1])) * 1.3333; // 80px per hour
  const height = item.duration * 1.3333;

  return (
    <div
      className="absolute left-[4.5rem] right-0 rounded-lg p-3 transition-all ease-in-out mr-4 z-10"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: item.color.replace(')', ', 0.2)').replace('hsl', 'hsla'),
        borderLeft: `3px solid ${item.color}`
      }}
    >
      <div className="flex h-full flex-col overflow-hidden">
        <h3 className="font-semibold truncate text-sm" style={{color: item.color}}>{item.title}</h3>
        <p className="text-xs text-muted-foreground">{item.startTime} - {item.endTime}</p>
        {item.description && <p className="mt-1 text-xs text-muted-foreground truncate">{item.description}</p>}
      </div>
    </div>
  );
};

const CurrentTimeIndicator = () => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    const top = (currentTime.getHours() * 60 + currentTime.getMinutes()) * 1.3333;

    return (
        <div className="absolute left-14 right-0" style={{ top: `${top}px`}}>
            <div className="relative h-px w-full">
                <div className="absolute -left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary"></div>
                <div className="h-[1px] w-full bg-primary"></div>
            </div>
        </div>
    );
};

export default function DailyOverview({ date }: { date: Date }) {
    const [isClient, setIsClient] = useState(false);
    
    // This is a placeholder to simulate fetching events for the given date
    const dailySchedule = scheduleItems.filter(item => {
        // In a real app, you would parse and compare dates.
        // For this demo, we'll just show all items if it's the current date for simplicity.
        return isSameDay(new Date(), date);
    });

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return null;
    }

  return (
    <div className="relative h-full">
        {isSameDay(date, new Date()) && <CurrentTimeIndicator />}
        <div className="grid grid-cols-1 divide-y divide-border/80">
            {hours.map((hour) => (
            <div key={hour} className="relative flex h-[80px]">
                <div className="w-16 flex-shrink-0 -translate-y-3 pr-2 text-right text-xs text-muted-foreground">
                <span className="relative top-px">{hour}</span>
                </div>
                <div className="flex-1"></div>
            </div>
            ))}
        </div>
        <div className="absolute inset-0 top-0">
            {dailySchedule.map((item) => (
            <EventCard key={item.id} item={item} />
            ))}
        </div>
    </div>
  );
}
