
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

  **Step 1: Create Routine & Foundational Events.**
  - First, you will build the foundation of the schedule. Review the user's preferences for daily needs, work, and habits.
  - For EACH of the {{{numberOfDays}}} days, you MUST create recurring events for:
    - **Sleep:** Based on the user's preferred time range from {{{preferences.sleepTimeRange.[0]}}}:00 to {{{preferences.sleepTimeRange.[1]}}}:00.
    - **Meals:** Based on {{{preferences.mealsPerDay}}} meals per day. Allocate a reasonable time for each.
    - **Rest:** Based on {{{preferences.restTime}}} hours. This should be broken into smaller breaks throughout the day.
  - **Work Blocks:** Create a "Work Block" event from {{{preferences.workStartTime}}} to {{{preferences.workEndTime}}} on each of the specified work days ({{{preferences.workDays}}}). Treat Sunday as day 0. This block is a container for tasks, not a task itself.
  - **Habits & Hobbies:**
    - Sport: {{{preferences.sportFrequency}}} times a week for {{{preferences.sportDuration}}} minutes. Schedule it during {{{preferences.sportPreferredTime}}} if specified.
    - Meditation: {{{preferences.meditationFrequency}}} times a week for {{{preferences.meditationDuration}}} minutes. Schedule it during {{{preferences.meditationPreferredTime}}} if specified.
    - Reading: {{{preferences.readingFrequency}}} times a week for {{{preferences.readingDuration}}} minutes. Schedule it during {{{preferences.readingPreferredTime}}} if specified.
  - **Fixed Events from Text:** Carefully parse the 'fixedEventsText' field: '{{{preferences.fixedEventsText}}}'. Identify any recurring events with specific days and times (e.g., "Team meeting every Mon at 10:00", "English lesson on Tue and Thu at 18:00"). Create these events.
  - **Output for Step 1:** Place ALL of these newly created foundational events (sleep, meals, rest, work blocks, habits, fixed events) into the 'routineEvents' array in the output. The 'tasks' array should be empty at this stage.

  **Step 2: Schedule Inbox Tasks.**
  - Now, take the list of tasks from the user's inbox ({{tasks}}).
  - **CRITICAL:** Schedule these tasks *only* inside the "Work Block" events you created in Step 1.
  - **Avoid Conflicts:** NEVER schedule a new task during a time that is already occupied by another event from Step 1 (like meals, breaks, meetings, etc.).
  - **Respect Preferences:** Schedule demanding tasks during the user's peak energy times ({{{preferences.energyPeaks}}}).
  - **Be Realistic:** Distribute tasks evenly. Do not cram everything into one day. Leave buffer time between tasks.
  - **Output for Step 2:** Place all the scheduled inbox tasks into the 'tasks' array in the output. Do not add any more events to the 'routineEvents' array.

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
  - Other fixed events from text: {{{preferences.fixedEventsText}}}
  - Past Learnings: {{{preferences.pastLearnings}}}

  Generate the full schedule now, following both steps precisely. The output must contain both 'tasks' and 'routineEvents' arrays, filled according to the instructions for each step.
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
