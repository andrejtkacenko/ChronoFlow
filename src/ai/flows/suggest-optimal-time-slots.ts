
'use server';
/**
 * @fileOverview AI agent to suggest optimal time slots for new tasks, considering existing schedule.
 *
 * - suggestOptimalTimeSlots - A function that suggests optimal time slots for new tasks.
 * - SuggestOptimalTimeSlotsInput - The input type for the suggestOptimalTimeSlots function.
 * - SuggestOptimalTimeSlotsOutput - The return type for the suggestOptimalTimeSlots function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { SuggestedSlotSchema, type SuggestedSlot } from './schema';

const SuggestOptimalTimeSlotsInputSchema = z.object({
  schedule: z
    .string()
    .describe('The user schedule, including events and tasks with their time slots.'),
  tasks: z.string().describe('The tasks needed to be scheduled. It can be a single task or a list.'),
  duration: z.number().optional().describe('The estimated duration of the task in minutes, if only one task is provided.'),
});
export type SuggestOptimalTimeSlotsInput = z.infer<
  typeof SuggestOptimalTimeSlotsInputSchema
>;


const SuggestOptimalTimeSlotsOutputSchema = z.object({
  suggestions: z.array(SuggestedSlotSchema).describe("A list of suggested time slots for the tasks. Suggest at least 3 varied options if possible (e.g., today, tomorrow, next week)."),
});
export type SuggestOptimalTimeSlotsOutput = z.infer<
  typeof SuggestOptimalTimeSlotsOutputSchema
>;


export async function suggestOptimalTimeSlots(
  input: SuggestOptimalTimeSlotsInput
): Promise<SuggestOptimalTimeSlotsOutput> {
  return suggestOptimalTimeSlotsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestOptimalTimeSlotsPrompt',
  input: {schema: SuggestOptimalTimeSlotsInputSchema},
  output: {schema: SuggestOptimalTimeSlotsOutputSchema},
  prompt: `You are a scheduling assistant who analyzes a user's schedule and suggests optimal time slots for new tasks.

  Analyze the following schedule and task(s) to find the best time slots without conflicts.
  The current date is ${new Date().toISOString().split('T')[0]}. Find slots on or after this date.

  Schedule: {{{schedule}}}
  Task(s): {{{tasks}}}
  {{#if duration}}
  Estimated Task Duration: {{{duration}}} minutes. The suggested slot duration must match this.
  {{/if}}

  Return the suggested time slots as a JSON object. Provide at least 3 suggestions if possible, including options for different days or times of day.
  `,
});

const suggestOptimalTimeSlotsFlow = ai.defineFlow(
  {
    name: 'suggestOptimalTimeSlotsFlow',
    inputSchema: SuggestOptimalTimeSlotsInputSchema,
    outputSchema: SuggestOptimalTimeSlotsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
