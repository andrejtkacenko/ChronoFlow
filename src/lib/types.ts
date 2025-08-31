import type { LucideIcon } from "lucide-react";
import {
    Briefcase,
    BrainCircuit,
    Coffee,
    Dumbbell,
    Plane,
    Users,
  } from 'lucide-react';
  
export const iconMap: { [key: string]: LucideIcon } = {
    Briefcase,
    BrainCircuit,
    Coffee,
    Dumbbell,
    Plane,
    Users,
    Default: Briefcase,
};

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
  icon: string; // Storing icon name as string
  color: string;
  date: string; // YYYY-MM-DD
};
