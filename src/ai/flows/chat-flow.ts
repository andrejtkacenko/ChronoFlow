
'use server';
/**
 * @fileOverview An AI assistant flow for the website chat.
 * This assistant can use tools to interact with the application.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { addScheduleItem, getSuggestedTimeSlots, generateSchedule } from '@/lib/actions';
import { format, addMinutes } from 'date-fns';
import type { ScheduleItem } from '@/lib/types';
import type { GenerateFullScheduleInput, SuggestedSlot } from './schema';

// --- Tool Definitions ---

const createTaskOrEventTool = ai.defineTool(
  {
    name: 'createTaskOrEvent',
    description: 'Creates a new task in the inbox or schedules an event at a specific time. Use this for requests like "add a task", "remind me to", "schedule a meeting".',
    inputSchema: z.object({
      title: z.string(),
      date: z.string().optional().describe("Date in 'YYYY-MM-DD' format. If not provided, the item is added to the inbox."),
      startTime: z.string().optional().describe("Start time in 'HH:mm' format. Requires 'date' to be set."),
      duration: z.number().optional().default(60).describe("Duration in minutes."),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
        scheduled: z.boolean(),
    }),
  },
  async ({ title, date, startTime, duration }) => {
    // This is a simplified version. For a real app, you'd get the userId from auth context.
    const DUMMY_USER_ID = 'chat_user'; // This needs to be replaced with real user ID in a real scenario.

    const eventData: any = {
      userId: DUMMY_USER_ID,
      title,
      duration,
      type: date ? 'event' : 'task',
      completed: false,
    };

    if (date) {
        eventData.date = date;
        eventData.startTime = startTime || '09:00';
        const endTime = addMinutes(new Date(`${date}T${eventData.startTime}`), duration);
        eventData.endTime = format(endTime, 'HH:mm');
    }

    try {
      await addScheduleItem(eventData);
      const scheduled = !!date;
      return {
        success: true,
        message: scheduled ? `Event "${title}" was scheduled.` : `Task "${title}" was added to your inbox.`,
        scheduled: scheduled,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create the item.',
        scheduled: false
      }
    }
  }
);


const findTimeForTaskTool = ai.defineTool(
    {
        name: 'findTimeForTask',
        description: 'Finds and suggests optimal time slots for a given task. Use this when the user asks to "find time for", "schedule", or "squeeze in" a task without a specific time.',
        inputSchema: z.object({
            task: z.string().describe("The description of the task, e.g., 'a 1-hour workout' or 'call the bank'"),
        }),
        outputSchema: z.object({
            suggestions: z.array(z.object({
                task: z.string(),
                date: z.string(),
                startTime: z.string(),
                endTime: z.string(),
            })).describe('A list of up to 3 suggested time slots.')
        })
    },
    async ({ task }) => {
        // This is a simplified version. For a real app, you'd get the userId from auth context.
        const DUMMY_USER_ID = 'chat_user';
        const result = await getSuggestedTimeSlots(task, DUMMY_USER_ID);
        if (typeof result === 'string') {
            return { suggestions: [] };
        }
        return { suggestions: result.slice(0, 3).map(s => ({task: s.task, date: s.date, startTime: s.startTime, endTime: s.endTime})) };
    }
);

const generateFullScheduleTool = ai.defineTool(
    {
        name: 'generateFullSchedule',
        description: 'Triggers the generation of a full, multi-day schedule based on the user\'s inbox tasks and preferences. Use this for broad requests like "plan my week", "generate a schedule", or "organize my tasks".',
        inputSchema: z.object({}), // No input needed, it uses user's context
        outputSchema: z.object({
            success: z.boolean(),
            message: z.string(),
        })
    },
    async () => {
        // This is a simplified version. The real implementation would trigger the FullScheduleGenerator component
        // or a similar backend process.
        return {
            success: true,
            message: "I've started the schedule generator. You can review and adjust your preferences there.",
        };
    }
);


// --- Main Chat Flow ---

export const chatAssistantFlow = ai.defineFlow(
  {
    name: 'chatAssistantFlow',
    inputSchema: z.object({
      userId: z.string(), // We'll need the user ID for context
      history: z.array(z.object({
        role: z.enum(['user', 'model']),
        content: z.array(z.object({
            text: z.string().optional(),
            toolRequest: z.any().optional(),
            toolResponse: z.any().optional(),
        }))
      })),
    }),
    outputSchema: z.any(),
  },
  async ({ userId, history }) => {
    
    // In a real app, you'd pass the real userId to the tools.
    // For now, we are just passing a dummy one inside the tools.

    const result = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        prompt: "You are ChronoFlow's AI assistant. Be helpful, friendly, and concise. Your goal is to help the user manage their schedule. Use the available tools to fulfill user requests. If a user asks a general question, provide a helpful answer.",
        tools: [createTaskOrEventTool, findTimeForTaskTool, generateFullScheduleTool],
        history: history,
        config: {
            // Lower temperature for more predictable tool usage
            temperature: 0.2,
        },
    });

    return result.output;
  }
);
