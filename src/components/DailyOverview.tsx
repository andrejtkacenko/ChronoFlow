
"use client";

import type { ScheduleItem } from "@/lib/types";
import { iconMap } from "@/lib/types";
import { useEffect, useState } from "react";
import { format, isSameDay } from 'date-fns';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from "./ui/skeleton";

const EventCard = ({ item, hourHeight, onClick }: { item: ScheduleItem, hourHeight: number, onClick: (e: React.MouseEvent) => void }) => {
  const minuteHeight = hourHeight / 60;
  const top = (parseInt(item.startTime.split(":")[0]) * 60 + parseInt(item.startTime.split(":")[1])) * minuteHeight;
  const height = item.duration * minuteHeight;
  const Icon = iconMap[item.icon] || iconMap.Default;

  return (
    <div
      className="absolute left-2 right-2 rounded-lg p-3 transition-all ease-in-out mr-4 z-10 cursor-pointer hover:opacity-80"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: item.color.replace(')', ', 0.2)').replace('hsl', 'hsla'),
        borderLeft: `3px solid ${item.color}`
      }}
      onClick={onClick}
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

const NewEventPlaceholder = ({ startTime, hourHeight }: { startTime: string | null, hourHeight: number }) => {
    if (!startTime) return null;

    const minuteHeight = hourHeight / 60;
    const top = (parseInt(startTime.split(":")[0]) * 60 + parseInt(startTime.split(":")[1])) * minuteHeight;
    const height = 60 * minuteHeight; // Default 60 min height

    return (
        <div 
            className="absolute left-2 right-2 rounded-lg bg-primary/10 border-2 border-dashed border-primary/50 mr-4 z-20"
            style={{
                top: `${top}px`,
                height: `${height}px`,
            }}
        />
    )
}

interface DailyOverviewProps {
    date: Date;
    newEventStartTime: string | null;
    userId: string;
    hourHeight: number;
    onEventClick: (event: ScheduleItem) => void;
}

export default function DailyOverview({ date, newEventStartTime, userId, hourHeight, onEventClick }: DailyOverviewProps) {
    const [dailySchedule, setDailySchedule] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState(true);
      
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
    
    const handleEventClick = (e: React.MouseEvent, item: ScheduleItem) => {
        e.stopPropagation();
        onEventClick(item);
    }

  return (
    <>
        {loading ? (
             <div className="absolute inset-0 top-0 pointer-events-none p-2">
                <Skeleton
                    className="absolute rounded-lg"
                    style={{ top: '760px', height: '80px', left: '0.5rem', right: '0.5rem' }}
                />
                <Skeleton
                    className="absolute rounded-lg"
                    style={{ top: '960px', height: '120px', left: '0.5rem', right: '0.5rem' }}
                />
                <Skeleton
                    className="absolute rounded-lg"
                    style={{ top: '1200px', height: '60px', left: '0.5rem', right: '0.5rem' }}
                />
            </div>
         ) : (
            <div className="absolute inset-0 top-0">
                {dailySchedule.length > 0 && dailySchedule.map((item) => (
                    <EventCard key={item.id} item={item} hourHeight={hourHeight} onClick={(e) => handleEventClick(e, item)} />
                ))}
            </div>
        )}
         <NewEventPlaceholder startTime={newEventStartTime} hourHeight={hourHeight} />
    </>
  );
}
