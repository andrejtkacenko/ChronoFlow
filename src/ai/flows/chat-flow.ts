
'use server';
/**
 * @fileOverview An AI assistant flow for the website chat.
 * This assistant can use tools to interact with the application.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { addScheduleItem as serverAddScheduleItem } from '@/lib/actions';
import { format, addMinutes } from 'date-fns';
import { getSuggestedTimeSlots } from '@/lib/actions';
import type { MessageData } from 'genkit';

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
    }),
  },
  async ({ title, date, startTime, duration }, context) => {
    const userId = (context as any)?.userId;
    if (!userId) {
        return { success: false, message: "User is not authenticated." };
    }

    const eventData: any = {
      userId,
      title,
      duration,
      type: date ? 'event' : 'task',
    };

    if (date) {
        eventData.date = date;
        eventData.startTime = startTime || '09:00';
        const endTime = addMinutes(new Date(`${date}T${eventData.startTime}`), duration);
        eventData.endTime = format(endTime, 'HH:mm');
    }

    try {
      await serverAddScheduleItem(eventData);
      return {
        success: true,
        message: date ? `Event "${title}" was scheduled.` : `Task "${title}" was added to your inbox.`,
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: 'Failed to create the item.',
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
            })).describe('A list of up to 3 suggested time slots.'),
            message: z.string().describe("A human-readable summary of the suggestions or a message if no slots are found.")
        })
    },
    async ({ task }, context) => {
        const userId = (context as any)?.userId;
        if (!userId) {
            return { suggestions: [], message: "User is not authenticated." };
        }
        
        const result = await getSuggestedTimeSlots(task, userId);
        if (typeof result === 'string') {
            return { suggestions: [], message: result };
        }
        const topSuggestions = result.slice(0, 3).map(s => ({task: s.task, date: s.date, startTime: s.startTime, endTime: s.endTime}));
        
        if (topSuggestions.length > 0) {
            return { 
                suggestions: topSuggestions,
                message: `I found ${topSuggestions.length} potential slots for "${task}".`
            };
        }
        
        return { suggestions: [], message: `Sorry, I couldn't find any open slots for "${task}".` };
    }
);

const generateFullScheduleTool = ai.defineTool(
    {
        name: 'generateFullSchedule',
        description: 'Triggers the generation of a full, multi-day schedule based on the user\'s inbox tasks and preferences. Use this for broad requests like "plan my week", "generate a schedule", or "organize my tasks". This only indicates that the process can be started, it does not perform the generation itself.',
        inputSchema: z.object({}), // No input needed, it uses user's context
        outputSchema: z.object({
            success: z.boolean(),
            message: z.string(),
        })
    },
    async () => {
        // This tool just signals the intent. The client-side will open the component.
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
      userId: z.string(), 
      history: z.array(z.custom<MessageData>()), 
    }),
    outputSchema: z.any(),
  },
  async ({ userId, history }) => {
    
    const result = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        prompt: "You are ChronoFlow's AI assistant. Be helpful, friendly, and concise. Your goal is to help the user manage their schedule. Use the available tools to fulfill user requests. If a user asks a general question, provide a helpful answer. After a tool is successfully used, confirm it to the user in a natural, conversational way.",
        tools: [createTaskOrEventTool, findTimeForTaskTool, generateFullScheduleTool],
        history: history,
        context: {
            userId: userId, // Pass userId to tool context
        },
        config: {
            temperature: 0.2,
        },
    });

    // Return a plain object to avoid serialization errors in Next.js
    return { ...result.message };
  }
);
