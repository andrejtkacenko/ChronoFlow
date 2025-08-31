import { Briefcase, BrainCircuit, Coffee, Dumbbell, Plane, Users } from "lucide-react";
import type { ScheduleItem } from "./types";

export const scheduleItems: ScheduleItem[] = [
  {
    id: "1",
    type: "task",
    title: "Morning workout",
    startTime: "07:00",
    endTime: "08:00",
    duration: 60,
    icon: Dumbbell,
    color: "hsl(var(--accent))",
    description: "Full body workout at the gym."
  },
  {
    id: "2",
    type: "event",
    title: "Team Standup",
    startTime: "09:00",
    endTime: "09:30",
    duration: 30,
    icon: Users,
    color: "hsl(var(--primary))",
    location: "Virtual, Zoom",
    attendees: ["Alice", "Bob", "Charlie"]
  },
  {
    id: "3",
    type: "task",
    title: "Deep Work: Project Phoenix",
    startTime: "09:30",
    endTime: "11:30",
    duration: 120,
    icon: BrainCircuit,
    color: "hsl(var(--accent))",
    description: "Focus on UI implementation for the new dashboard."
  },
  {
    id: "4",
    type: "event",
    title: "Coffee with Sarah",
    startTime: "11:30",
    endTime: "12:00",
    duration: 30,
    icon: Coffee,
    color: "hsl(var(--primary))",
    location: "The Daily Grind Cafe"
  },
  {
    id: "5",
    type: "task",
    title: "Client Follow-ups",
    startTime: "13:00",
    endTime: "14:00",
    duration: 60,
    icon: Briefcase,
    color: "hsl(var(--accent))",
    description: "Respond to client emails and follow up on pending queries."
  },
  {
    id: "6",
    type: "event",
    title: "Flight to SFO",
    startTime: "16:00",
    endTime: "19:00",
    duration: 180,
    icon: Plane,
    color: "hsl(var(--primary))",
    location: "JFK Airport, Gate B24"
  },
];
