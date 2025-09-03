
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
  1.  **Analyze ALL Inputs:** Carefully consider the user's existing schedule, the list of tasks to be scheduled, and their detailed preferences.
  2.  **Avoid Conflicts:** NEVER schedule a new task during a time that is already occupied by an existing event in the user's schedule. Check for overlaps.
  3.  **Respect Preferences:**
      - Schedule demanding tasks during the user's peak energy times ({{{preferences.energyPeaks}}}).
      - Block out time for sleep ({{{preferences.sleepDuration}}} hours), meals ({{{preferences.mealsPerDay}}} times per day), and rest ({{{preferences.restTime}}} hours).
      - Incorporate fixed events and habits from {{{preferences.fixedEvents}}}.
      - Allocate time for self-care and learning as per {{{preferences.selfCareTime}}}.
  4.  **Be Realistic:** Distribute tasks evenly across the specified number of days. Do not try to cram everything into one day. Leave buffer time between tasks.
  5.  **Output Format:** Return a JSON object containing a 'suggestions' array. Each item in the array must be an object with 'task', 'date' (YYYY-MM-DD), 'startTime' (HH:mm), 'endTime' (HH:mm), and 'duration' (in minutes).

  **User's Current Schedule (for conflict checking):**
  {{#if schedule}}
  {{{schedule}}}
  {{else}}
  The user's schedule is currently empty.
  {{/if}}

  **Tasks to Schedule:**
  {{#each tasks}}
  - {{{this}}}
  {{/each}}

  **User's Preferences & Goals for a Perfect Schedule:**
  - Main Goals: {{{preferences.mainGoals}}}
  - Priorities: {{{preferences.priorities}}}
  - Daily Needs: Sleep: {{{preferences.sleepDuration}}} hours, Meals: {{{preferences.mealsPerDay}}} times, Rest: {{{preferences.restTime}}} hours.
  - Peak Energy: {{{preferences.energyPeaks}}}
  - Fixed Commitments: {{{preferences.fixedEvents}}}
  - Delegation/Automation Ideas: {{{preferences.delegationOpportunities}}}
  - Personal Growth/Fun: {{{preferences.selfCareTime}}}
  - Past Learnings: {{{preferences.pastLearnings}}}

  Generate the schedule now.
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
