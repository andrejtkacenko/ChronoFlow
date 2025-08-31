"use client";

import { scheduleItems } from "@/lib/data";
import type { ScheduleItem } from "@/lib/types";
import { useEffect, useState } from "react";

const hours = Array.from({ length: 24 }, (_, i) => {
    const hour24 = i;
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const ampm = hour24 < 12 ? 'AM' : 'PM';
    return `${hour12} ${ampm}`;
});

const EventCard = ({ item }: { item: ScheduleItem }) => {
  const top = (parseInt(item.startTime.split(":")[0]) * 60 + parseInt(item.startTime.split(":")[1])) * 2;
  const height = item.duration * 2;

  return (
    <div
      className="absolute left-[4.5rem] right-0 rounded-lg p-3 transition-all ease-in-out mr-4"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: item.color.replace(')', ', 0.15)').replace('hsl', 'hsla'),
        borderLeft: `3px solid ${item.color}`
      }}
    >
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <item.icon className="h-5 w-5 flex-shrink-0" style={{ color: item.color }} />
            <h3 className="font-semibold truncate">{item.title}</h3>
          </div>
          <p className="text-sm text-muted-foreground flex-shrink-0">{item.startTime} - {item.endTime}</p>
        </div>
        {item.description && <p className="mt-2 text-sm text-muted-foreground truncate">{item.description}</p>}
      </div>
    </div>
  );
};

export default function DailyOverview() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // You can return a skeleton loader here for better UX
    return null;
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-1">
        {hours.map((hour, index) => (
          <div key={hour} className="relative flex h-[120px]">
            <div className="w-16 -translate-y-3 pr-2 text-right text-sm text-muted-foreground">
              {hour}
            </div>
            <div className={`flex-1 ${index < hours.length - 1 ? 'border-b' : ''}`}></div>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 top-0">
        {scheduleItems.map((item) => (
          <EventCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
