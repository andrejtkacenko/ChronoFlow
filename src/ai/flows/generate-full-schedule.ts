
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

**INSTRUCTIONS:**
Your response MUST conform to the JSON schema.

**Step 1: Create Foundational Routine Events**
First, create the daily recurring events based on the user's preferences.
For EACH of the {{{numberOfDays}}} days, you MUST create events for:
- Sleep: Schedule a single sleep event. It should span across midnight based on the user's 'sleepTimeRange'.
- Meals: Schedule {{{preferences.mealsPerDay}}} meal events. Spread them out logically (e.g., morning, noon, evening).
- Work Blocks: If work days are specified, create a single "Work Block" event from 'workStartTime' to 'workEndTime' for each specified work day.
- Habits: Schedule habits like sports, meditation, and reading according to their frequency, duration, and preferred time.
- Fixed Events: Parse the 'fixedEventsText' for any recurring events (e.g., "Team meeting every Mon at 10:00") and create them.

Place ALL events created in this step into the 'routineEvents' array in the JSON output.

**Step 2: Schedule Inbox Tasks**
Next, schedule the user's tasks from their inbox.
- Place these tasks *within* the "Work Block" events created in Step 1.
- NEVER schedule a task that conflicts with a routine event (like a meal or a meeting).
- Distribute tasks evenly across the available work blocks. Do not cram them all into one day.
- Consider the user's peak energy times ('energyPeaks') for demanding tasks.

Place ALL tasks scheduled in this step into the 'tasks' array in the JSON output.

---
**CONTEXT FOR SCHEDULING**

**User's Existing Schedule (for conflict checking only):**
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
- Energy Peaks: {{{preferences.energyPeaks}}}
- Meals Per Day: {{{preferences.mealsPerDay}}}
- Daily Rest Time: {{{preferences.restTime}}} hours
- Sport: {{{preferences.sportFrequency}}}x/week, {{{preferences.sportDuration}}} min, at {{{preferences.sportPreferredTime}}}
- Meditation: {{{preferences.meditationFrequency}}}x/week, {{{preferences.meditationDuration}}} min, at {{{preferences.meditationPreferredTime}}}
- Reading: {{{preferences.readingFrequency}}}x/week, {{{preferences.readingDuration}}} min, at {{{preferences.readingPreferredTime}}}
- Other Fixed Events: {{{preferences.fixedEventsText}}}
---

Generate the full schedule now. The output must be a valid JSON object containing both 'tasks' and 'routineEvents' arrays.
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
    
