
import type { LucideIcon } from "lucide-react";
import {
    Briefcase,
    BrainCircuit,
    Coffee,
    Dumbbell,
    Plane,
    Users,
    PenSquare,
    MapPin,
    AlignLeft,
    Clock,
    Video,
    Settings,
    Palette,
    Aperture,
    Bell,
  } from 'lucide-react';
  
export const iconMap: { [key: string]: LucideIcon } = {
    Briefcase,
    BrainCircuit,
    Coffee,
    Dumbbell,
    Plane,
    Users,
    PenSquare,
    MapPin,
    AlignLeft,
    Clock,
    Video,
    Settings,
    Palette,
    Aperture,
    Bell,
    Default: Briefcase,
};

export const eventColors = [
    "hsl(12, 76%, 61%)",   // "Tomato"
    "hsl(204, 70%, 53%)",  // "Dodger Blue"
    "hsl(45, 100%, 51%)",  // "Gold"
    "hsl(145, 63%, 49%)",  // "Medium Sea Green"
    "hsl(300, 76%, 72%)",  // "Orchid"
    "hsl(30, 100%, 50%)",  // "Orange"
];

export type ScheduleItem = {
  id: string;
  userId: string;
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
