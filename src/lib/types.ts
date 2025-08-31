import type { LucideIcon } from "lucide-react";

export type ScheduleItem = {
  id: string;
  type: "event" | "task";
  title: string;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  description?: string;
  location?: string;
  attendees?: string[];
  icon: LucideIcon;
  color: string;
};
