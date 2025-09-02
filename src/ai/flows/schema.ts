/**
 * @fileOverview Shared Zod schemas and TypeScript types for AI flows.
 */

import { z } from 'zod';

// Schema for a single suggested time slot
export const SuggestedSlotSchema = z.object({
  task: z.string().describe('The name of the task to be scheduled.'),
  date: z
    .string()
    .describe("The suggested date for the task in 'YYYY-MM-DD' format."),
  startTime: z
    .string()
    .describe("The suggested start time for the task in 'HH:mm' format."),
  endTime: z
    .string()
    .describe("The suggested end time for the task in 'HH:mm' format."),
  duration: z.number().describe('The duration of the task in minutes.'),
});
export type SuggestedSlot = z.infer<typeof SuggestedSlotSchema>;


// Schema for user preferences for full schedule generation
const PreferencesSchema = z.object({
  mainGoals: z.string().describe("User's main goals for the week/quarter."),
  priorities: z
    .string()
    .describe("User's priorities (work, study, personal)."),
  sleepHours: z
    .string()
    .describe('How many hours of sleep, nutrition, and rest are needed daily.'),
  energyPeaks: z
    .string()
    .describe(
      'When the user has peak energy levels (morning, afternoon, evening).'
    ),
  fixedEvents: z
    .string()
    .describe('Fixed commitments or habits with specific times.'),
  delegationOpportunities: z
    .string()
    .describe('What tasks could be delegated, automated, or deleted.'),
  selfCareTime: z
    .string()
    .describe(
      'Time for self-care, learning, or entertainment, and how much.'
    ),
  pastLearnings: z
    .string()
    .describe('Past successes, lessons, or obstacles in planning.'),
});

// Input schema for the generateFullSchedule flow
export const GenerateFullScheduleInputSchema = z.object({
  schedule: z
    .string()
    .describe(
      'The user schedule, including events and tasks with their time slots.'
    ),
  tasks: z.array(z.string()).describe('The tasks from the inbox to be scheduled.'),
  preferences: PreferencesSchema,
  startDate: z
    .string()
    .describe("The date to start scheduling from, in 'YYYY-MM-DD' format."),
  numberOfDays: z
    .number()
    .describe('The number of days to generate the schedule for.'),
});
export type GenerateFullScheduleInput = z.infer<
  typeof GenerateFullScheduleInputSchema
>;

// Output schema for the generateFullSchedule flow
export const GenerateFullScheduleOutputSchema = z.object({
  suggestions: z
    .array(SuggestedSlotSchema)
    .describe('A list of suggested time slots for the tasks.'),
});
export type GenerateFullScheduleOutput = z.infer<
  typeof GenerateFullScheduleOutputSchema
>;
