
"use client";

import type { ScheduleItem } from "@/lib/types";
import { iconMap } from "@/lib/types";
import { useEffect, useState } from "react";
import { format, isSameDay } from 'date-fns';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from "./ui/skeleton";

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
  const Icon = iconMap[item.icon] || iconMap.Default;

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
        <div className="flex items-center gap-2">
            <Icon className="size-4" style={{color: item.color}} />
            <h3 className="font-semibold truncate text-sm" style={{color: item.color}}>{item.title}</h3>
        </div>
        <p className="text-xs text-muted-foreground pl-6">{item.startTime} - {item.endTime}</p>
        {item.description && <p className="mt-1 text-xs text-muted-foreground truncate pl-6">{item.description}</p>}
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
    const [dailySchedule, setDailySchedule] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState(true);
      

    useEffect(() => {
        setLoading(true);
        const dateString = format(date, 'yyyy-MM-dd');
        const q = query(collection(db, "scheduleItems"), where("date", "==", dateString));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const items: ScheduleItem[] = [];
            querySnapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() } as ScheduleItem);
            });
            setDailySchedule(items.sort((a,b) => a.startTime.localeCompare(b.startTime)));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching schedule items: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [date]);

    if (loading) {
        return (
            <div className="relative h-full">
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
                <div className="absolute inset-0 top-0 mr-4">
                    <Skeleton
                        className="absolute left-[4.5rem] right-0 rounded-lg"
                        style={{ top: '760px', height: '80px' }}
                    />
                    <Skeleton
                        className="absolute left-[4.5rem] right-0 rounded-lg"
                        style={{ top: '960px', height: '120px' }}
                    />
                    <Skeleton
                        className="absolute left-[4.5rem] right-0 rounded-lg"
                        style={{ top: '1200px', height: '60px' }}
                    />
                </div>
            </div>
        )
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
            {dailySchedule.length > 0 ? dailySchedule.map((item) => (
               <EventCard key={item.id} item={item} />
            )) : (
              !loading && (
                <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No events scheduled for this day.</p>
                </div>
              )
            )}
        </div>
    </div>
  );
}
