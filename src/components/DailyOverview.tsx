
"use client";

import type { ScheduleItem, DisplayScheduleItem } from "@/lib/types";
import { iconMap } from "@/lib/types";
import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";

const EventCard = ({ item, hourHeight, onClick }: { item: DisplayScheduleItem, hourHeight: number, onClick: (e: React.MouseEvent) => void }) => {
  if (!item.startTime || !item.duration) return null; 
  
  const minuteHeight = hourHeight / 60;
  const top = (parseInt(item.startTime.split(":")[0]) * 60 + parseInt(item.startTime.split(":")[1])) * minuteHeight;
  let height = item.duration * minuteHeight;
  if(height <= 0) height = minuteHeight * 15; // Min height for 0-duration or negative

  const Icon = iconMap[item.icon || 'Default'] || iconMap.Default;

  const cardClasses = cn(
    "absolute left-2 right-2 p-2 transition-all ease-in-out mr-4 z-10 cursor-pointer hover:opacity-80 flex flex-col",
    {
        "rounded-lg": item.isStart && item.isEnd,
        "rounded-t-lg": item.isStart && !item.isEnd,
        "rounded-b-lg": !item.isStart && item.isEnd,
        "rounded-none": !item.isStart && !item.isEnd,
    },
    height < 40 ? "p-1.5" : "p-3" // Less padding for small cards
  );

  const isTooSmallForDetails = height < 45;

  return (
    <div
      className={cardClasses}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: item.color ? item.color.replace(')', ', 0.2)').replace('hsl', 'hsla') : undefined,
        borderLeft: `3px solid ${item.color || 'transparent'}`
      }}
      onClick={onClick}
    >
      <div className="flex h-full flex-col overflow-hidden">
        <div className={cn("flex items-start gap-2", isTooSmallForDetails && "gap-1.5")}>
            <Icon className={cn("flex-shrink-0", isTooSmallForDetails ? "size-3.5 mt-0.5" : "size-4 mt-0.5")} style={{color: item.color}} />
            <h3 className="font-semibold text-sm leading-tight" style={{color: item.color}}>{item.title}</h3>
        </div>
        {!isTooSmallForDetails && (
          <>
            <p className="text-xs text-muted-foreground pl-6">{item.startTime} - {item.endTime}</p>
            {item.description && <p className="mt-1 text-xs text-muted-foreground truncate pl-6">{item.description}</p>}
          </>
        )}
      </div>
    </div>
  );
};

interface DailyOverviewProps {
    date: Date;
    dailySchedule: DisplayScheduleItem[];
    loading: boolean;
    hourHeight: number;
    onEventClick: (event: ScheduleItem) => void;
}

export default function DailyOverview({ date, dailySchedule, loading, hourHeight, onEventClick }: DailyOverviewProps) {
    
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
                    style={{ top: '600px', height: '60px', left: '0.5rem', right: '0.5rem' }}
                />
                <Skeleton
                    className="absolute rounded-lg"
                    style={{ top: '800px', height: '90px', left: '0.5rem', right: '0.5rem' }}
                />
                <Skeleton
                    className="absolute rounded-lg"
                    style={{ top: '1000px', height: '60px', left: '0.5rem', right: '0.5rem' }}
                />
            </div>
         ) : (
            <div className="absolute inset-0 top-0">
                {dailySchedule.length > 0 && dailySchedule.map((item) => (
                    <EventCard key={`${item.id}-${item.date}-${item.startTime}`} item={item} hourHeight={hourHeight} onClick={(e) => handleEventClick(e, item)} />
                ))}
            </div>
        )}
    </>
  );
}
