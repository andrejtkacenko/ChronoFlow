
/**
 * @fileOverview Shared Zod schemas and TypeScript types for AI flows.
 */

import { z } from 'zod';

// Schema for a single suggested time slot
export const SuggestedSlotSchema = z.object({
  task: z.string().describe('The name of the task or event to be scheduled.'),
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
  sleepTimeRange: z.array(z.number()).optional().describe('User preferred sleep time range [startHour, endHour].'),
  mealsPerDay: z.number().describe('How many meals are eaten per day.'),
  workDays: z.array(z.number()).optional().describe('Which days of the week are work days (0=Sun, 1=Mon...).'),
  workStartTime: z.string().optional().describe('Work start time in HH:mm format.'),
  workEndTime: z.string().optional().describe('Work end time in HH:mm format.'),
  sportFrequency: z.number().optional().describe('How many times a week the user does sport.'),
  sportDuration: z.number().optional().describe('Duration of a sport session in minutes.'),
  sportPreferredTime: z.string().optional().describe('Preferred time for sport (Утро, День, Вечер, Любое).'),
  meditationFrequency: z.number().optional().describe('How many times a week the user meditates.'),
  meditationDuration: z.number().optional().describe('Duration of a meditation session in minutes.'),
  meditationPreferredTime: z.string().optional().describe('Preferred time for meditation (Утро, День, Вечер, Любое).'),
  readingFrequency: z.number().optional().describe('How many times a week the user reads.'),
  readingDuration: z.number().optional().describe('Duration of a reading session in minutes.'),
  readingPreferredTime: z.string().optional().describe('Preferred time for reading (Утро, День, Вечер, Любое).'),
  fixedEventsText: z
    .string()
    .optional()
    .describe('Other fixed commitments, habits, or routines with specific times or frequencies (e.g., "Team meeting every Mon at 10:00").'),
});

// Input schema for the generateFullSchedule flow
export const GenerateFullScheduleInputSchema = z.object({
  schedule: z
    .string()
    .describe(
      "The user's current schedule provided as a single string, with each event on a new line. This is for context and conflict checking. If it's empty, it means there are no existing events."
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
   tasks: z
    .array(SuggestedSlotSchema)
    .describe('A list of suggested time slots for the tasks from the inbox.'),
   routineEvents: z
    .array(SuggestedSlotSchema)
    .describe('A list of newly created routine events like sleep, meals, and habits.'),
});
export type GenerateFullScheduleOutput = z.infer<
  typeof GenerateFullScheduleOutputSchema
>;
