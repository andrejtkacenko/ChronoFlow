
'use server';
/**
 * @fileOverview AI agent to generate a full, multi-day schedule based on user preferences and tasks.
 *
 * - generateFullSchedule - A function that generates a schedule.
 * - GenerateFullScheduleInput - The input type for the function.
 * - GenerateFullScheduleOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {
    GenerateFullScheduleInputSchema,
    GenerateFullScheduleOutputSchema,
    type GenerateFullScheduleInput,
    type GenerateFullScheduleOutput
} from './schema';


export async function generateFullSchedule(
  input: GenerateFullScheduleInput
): Promise<GenerateFullScheduleOutput> {
  return generateFullScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFullSchedulePrompt',
  input: {schema: GenerateFullScheduleInputSchema},
  output: {schema: GenerateFullScheduleOutputSchema},
  prompt: `You are an expert productivity coach. Your goal is to create an optimal, realistic, and balanced schedule for a user for the next {{{numberOfDays}}} days, starting from {{{startDate}}}.

  **CRITICAL INSTRUCTIONS:**

  **Step 1: Create Routine & Work Events.**
  - First, review the user's preferences for daily needs and work schedule.
  - For EACH of the {{{numberOfDays}}} days, you MUST create recurring events for:
    - **Sleep:** Based on {{{preferences.sleepDuration}}} hours.
    - **Meals:** Based on {{{preferences.mealsPerDay}}} meals per day. Allocate a reasonable time for each.
    - **Rest:** Based on {{{preferences.restTime}}} hours. This should be broken into smaller breaks.
  - **Work Blocks:** If work days are specified, create a "Work Block" event from {{{preferences.workStartTime}}} to {{{preferences.workEndTime}}} on each of the specified work days ({{{preferences.workDays}}}). Treat Sunday as day 0.
  - Also incorporate fixed events, habits and self-care.
    - Sport: {{{preferences.sportFrequency}}} times a week for {{{preferences.sportDuration}}} minutes. Schedule it during {{{preferences.sportPreferredTime}}} if specified.
    - Meditation: {{{preferences.meditationFrequency}}} times a week for {{{preferences.meditationDuration}}} minutes. Schedule it during {{{preferences.meditationPreferredTime}}} if specified.
    - Reading: {{{preferences.readingFrequency}}} times a week for {{{preferences.readingDuration}}} minutes. Schedule it during {{{preferences.readingPreferredTime}}} if specified.
  - Use the free-form text for other fixed events: {{{preferences.fixedEventsText}}}
  - Place all these newly created routine and work events into the 'routineEvents' array in the output.

  **Step 2: Schedule Inbox Tasks.**
  - After you have filled the schedule with the routine and work events, take the list of tasks from the user's inbox ({{tasks}}).
  - **CRITICAL:** Schedule these tasks *only* within the "Work Block" events you created in Step 1. If no work blocks are defined, schedule tasks during typical working hours (e.g., 9am-5pm on weekdays).
  - **Avoid Conflicts:** NEVER schedule a new task during a time that is already occupied by another event (including meals, breaks, etc.).
  - **Respect Preferences:** Schedule demanding tasks during the user's peak energy times ({{{preferences.energyPeaks}}}).
  - **Be Realistic:** Distribute tasks evenly. Do not cram everything into one day. Leave buffer time.
  - Place all the scheduled inbox tasks into the 'tasks' array in the output.

  **User's Current Schedule (for conflict checking only, do not modify):**
  {{#if schedule}}
  {{{schedule}}}
  {{else}}
  The user's schedule is currently empty.
  {{/if}}

  **Tasks from Inbox to Schedule:**
  {{#each tasks}}
  - {{{this}}}
  {{/each}}

  **User's Preferences & Goals for a Perfect Schedule:**
  - Main Goals: {{{preferences.mainGoals}}}
  - Peak Energy: {{{preferences.energyPeaks}}}
  - Other fixed events: {{{preferences.fixedEventsText}}}
  - Past Learnings: {{{preferences.pastLearnings}}}
  - Work Schedule: From {{{preferences.workStartTime}}} to {{{preferences.workEndTime}}} on days: {{{preferences.workDays}}}.

  Generate the full schedule now, following both steps and providing both 'tasks' and 'routineEvents' arrays in the output.
  `,
});

const generateFullScheduleFlow = ai.defineFlow(
  {
    name: 'generateFullScheduleFlow',
    inputSchema: GenerateFullScheduleInputSchema,
    outputSchema: GenerateFullScheduleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
