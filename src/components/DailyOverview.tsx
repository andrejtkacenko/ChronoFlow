
"use client";

import type { ScheduleItem } from "@/lib/types";
import { iconMap } from "@/lib/types";
import { useEffect, useState } from "react";
import { format, isSameDay } from 'date-fns';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";

const HOUR_HEIGHT_PX = 80;
const MINUTE_HEIGHT_PX = HOUR_HEIGHT_PX / 60;

const hours = Array.from({ length: 24 }, (_, i) => {
    const hour24 = i;
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const ampm = hour24 < 12 ? 'AM' : 'PM';
    if (hour24 === 0) return '12 AM';
    if (hour24 === 12) return '12 PM';
    return `${hour12} ${ampm}`;
});

const EventCard = ({ item }: { item: ScheduleItem }) => {
  const top = (parseInt(item.startTime.split(":")[0]) * 60 + parseInt(item.startTime.split(":")[1])) * MINUTE_HEIGHT_PX;
  const height = item.duration * MINUTE_HEIGHT_PX;
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

const CurrentTimeIndicator = ({ date }: { date: Date }) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    if (!isSameDay(date, currentTime)) return null;

    const top = (currentTime.getHours() * 60 + currentTime.getMinutes()) * MINUTE_HEIGHT_PX;

    return (
        <div className="absolute left-14 right-0" style={{ top: `${top}px`}}>
            <div className="relative h-px w-full">
                <div className="absolute -left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary"></div>
                <div className="h-[1px] w-full bg-primary"></div>
            </div>
        </div>
    );
};

const NewEventPlaceholder = ({ startTime }: { startTime: string | null }) => {
    if (!startTime) return null;

    const top = (parseInt(startTime.split(":")[0]) * 60 + parseInt(startTime.split(":")[1])) * MINUTE_HEIGHT_PX;
    const height = 60 * MINUTE_HEIGHT_PX; // Default 60 min height

    return (
        <div 
            className="absolute left-[4.5rem] right-0 rounded-lg bg-primary/10 border-2 border-dashed border-primary/50 mr-4 z-20"
            style={{
                top: `${top}px`,
                height: `${height}px`,
            }}
        />
    )
}

interface DailyOverviewProps {
    date: Date;
    onTimeSlotClick: (startTime: string) => void;
    newEventStartTime: string | null;
    userId: string;
}

export default function DailyOverview({ date, onTimeSlotClick, newEventStartTime, userId }: DailyOverviewProps) {
    const [dailySchedule, setDailySchedule] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentHour, setCurrentHour] = useState(new Date().getHours());

    useEffect(() => {
        const timer = setInterval(() => {
            if (isSameDay(date, new Date())){
                setCurrentHour(new Date().getHours());
            } else {
                setCurrentHour(-1); // Not today, don't highlight any hour
            }
        }, 60000);
        return () => clearInterval(timer);
    }, [date]);

    const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const grid = e.currentTarget.querySelector('#schedule-grid');
        if (!grid) return;

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
        onTimeSlotClick(startTime);
    }
      
    useEffect(() => {
        if (!userId) return;
        setLoading(true);
        const dateString = format(date, 'yyyy-MM-dd');
        const q = query(
            collection(db, "scheduleItems"), 
            where("userId", "==", userId),
            where("date", "==", dateString)
        );

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
    }, [date, userId]);

  return (
    <div className="relative h-full" onClick={handleGridClick}>
        <div id="schedule-grid" className='relative'>
            <CurrentTimeIndicator date={date} />
            <div className="grid grid-cols-1">
                {hours.map((hour, index) => (
                    <div key={hour} className={cn(
                        "relative flex h-[--hour-height]",
                        index === currentHour && "bg-primary/5"
                        )}
                        style={{'--hour-height': `${HOUR_HEIGHT_PX}px`} as React.CSSProperties}
                    >
                        <div className="w-16 flex-shrink-0 pr-2 text-right text-xs text-muted-foreground -translate-y-2">
                           {index > 0 && <span className="relative top-px">{hour}</span>}
                        </div>
                        <div className="flex-1 border-t border-border/80"></div>
                    </div>
                ))}
            </div>
             {loading ? (
                 <div className="absolute inset-0 top-0 pointer-events-none">
                    <Skeleton
                        className="absolute left-[4.5rem] right-0 rounded-lg mr-4"
                        style={{ top: '760px', height: '80px' }}
                    />
                    <Skeleton
                        className="absolute left-[4.5rem] right-0 rounded-lg mr-4"
                        style={{ top: '960px', height: '120px' }}
                    />
                    <Skeleton
                        className="absolute left-[4.5rem] right-0 rounded-lg mr-4"
                        style={{ top: '1200px', height: '60px' }}
                    />
                </div>
             ) : (
                <div className="absolute inset-0 top-0 pointer-events-none">
                    {dailySchedule.length > 0 ? dailySchedule.map((item) => (
                        <EventCard key={item.id} item={item} />
                    )) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-muted-foreground">No events scheduled for this day.</p>
                        </div>
                    )}
                </div>
            )}
             <NewEventPlaceholder startTime={newEventStartTime} />
        </div>
    </div>
  );
}
