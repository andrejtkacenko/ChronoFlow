
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
  model: 'googleai/gemini-1.5-flash',
  prompt: `You are an expert productivity coach. Your goal is to create an optimal, realistic, and balanced schedule for a user for the next {{{numberOfDays}}} days, starting from {{{startDate}}}.

**INSTRUCTIONS:**
Your response MUST conform to the JSON schema, containing two arrays: 'routineEvents' and 'tasks'.

**Step 1: Create Routine Events**
First, create all the daily recurring events based on the user's preferences.
For EACH of the {{{numberOfDays}}} days, you MUST create events for:
- Sleep: A single event based on the 'sleepTimeRange'.
- Meals: {{{preferences.mealsPerDay}}} meal events, spread out logically.
- Work: For each specified work day, create a "Work" event from 'workStartTime' to 'workEndTime'.
- Habits: Schedule sport, meditation, and reading according to their frequency and duration.
- Fixed Events: Parse 'fixedEventsText' for any recurring events and schedule them.

Place ALL events created in this step into the 'routineEvents' array in the JSON output.

**Step 2: Schedule Inbox Tasks**
After all routine events are defined, schedule the user's inbox tasks into the remaining free time.
- Find an open slot for each task.
- NEVER schedule a task that conflicts with any event already on the user's schedule or any of the routine events you just created in Step 1.

Place ALL tasks scheduled in this step into the 'tasks' array in the JSON output.

---
**CONTEXT FOR SCHEDULING**

**User's Existing Schedule (for conflict checking):**
{{#if schedule}}
{{{schedule}}}
{{else}}
The user's schedule is currently empty.
{{/if}}

**Tasks to Schedule:**
{{#each tasks}}
- {{{this}}}
{{/each}}

**User Preferences:**
- Work Days: {{{preferences.workDays}}} (0=Sun, 1=Mon,...)
- Work Hours: {{{preferences.workStartTime}}} - {{{preferences.workEndTime}}}
- Sleep Range: {{{preferences.sleepTimeRange.[0]}}}:00 - {{{preferences.sleepTimeRange.[1]}}}:00
- Meals Per Day: {{{preferences.mealsPerDay}}}
- Sport: {{{preferences.sportFrequency}}}x/week, {{{preferences.sportDuration}}} min
- Meditation: {{{preferences.meditationFrequency}}}x/week, {{{preferences.meditationDuration}}} min
- Reading: {{{preferences.readingFrequency}}}x/week, {{{preferences.readingDuration}}} min
- Other Fixed Events: {{{preferences.fixedEventsText}}}
---

Generate the full schedule now.
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
    if (!output) {
      throw new Error('The schedule generation returned an empty result.');
    }
    return output;
  }
);
    
