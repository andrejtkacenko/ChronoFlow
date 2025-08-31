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

const SuggestOptimalTimeSlotsInputSchema = z.object({
  schedule: z
    .string()
    .describe('The user schedule, including events and tasks with their time slots.'),
  tasks: z.string().describe('The tasks needed to be scheduled.'),
});
export type SuggestOptimalTimeSlotsInput = z.infer<
  typeof SuggestOptimalTimeSlotsInputSchema
>;

const SuggestOptimalTimeSlotsOutputSchema = z.object({
  suggestedTimeSlots: z
    .string()
    .describe(
      'Suggested time slots for the tasks, considering the existing schedule, in JSON format.'
    ),
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

  Analyze the following schedule and tasks to find the best time slots without conflicts.

  Schedule: {{{schedule}}}
  Tasks: {{{tasks}}}

  Return the suggested time slots as a JSON object with the following structure:
  {
    "suggestedTimeSlots": "string" // Suggested time slots for the tasks, considering the existing schedule.
  }
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
