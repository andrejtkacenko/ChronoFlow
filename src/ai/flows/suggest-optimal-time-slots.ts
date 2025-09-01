
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

const SuggestedSlotSchema = z.object({
    task: z.string().describe("The name of the task to be scheduled."),
    date: z.string().describe("The suggested date for the task in 'YYYY-MM-DD' format."),
    startTime: z.string().describe("The suggested start time for the task in 'HH:mm' format."),
    endTime: z.string().describe("The suggested end time for the task in 'HH:mm' format."),
    duration: z.number().describe("The duration of the task in minutes."),
});

const SuggestOptimalTimeSlotsOutputSchema = z.object({
  suggestions: z.array(SuggestedSlotSchema).describe("A list of suggested time slots for the tasks."),
});
export type SuggestOptimalTimeSlotsOutput = z.infer<
  typeof SuggestOptimalTimeSlotsOutputSchema
>;
export type SuggestedSlot = z.infer<typeof SuggestedSlotSchema>;


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
  The current date is ${new Date().toISOString().split('T')[0]}. Find slots on or after this date.

  Schedule: {{{schedule}}}
  Tasks: {{{tasks}}}

  Return the suggested time slots as a JSON object.
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
