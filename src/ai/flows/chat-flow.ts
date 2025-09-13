'use server';
/**
 * @fileOverview An AI assistant flow for the website chat and Telegram bot.
 * This assistant can use tools to interact with the application.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { addScheduleItem as serverAddScheduleItem, getSuggestedTimeSlots } from '@/lib/actions';
import { format, addMinutes, parse } from 'date-fns';
import type { MessageData } from 'genkit';
import type { SuggestedSlot } from './schema';

// --- Tool Definitions ---

const createTaskOrEventTool = ai.defineTool(
  {
    name: 'createTaskOrEvent',
    description: 'Creates a new task in the inbox or schedules an event at a specific time. Use this for requests like "add a task", "remind me to", "schedule a meeting". If a specific date/time is given, it schedules an event; otherwise, it creates a task for the inbox.',
    inputSchema: z.object({
      title: z.string().describe("The concise title of the event or task."),
      date: z.string().optional().describe("Date in 'YYYY-MM-DD' format. If not provided, the item is added to the inbox as a task."),
      startTime: z.string().optional().describe("Start time in 'HH:mm' format. Requires 'date' to be set."),
      duration: z.number().optional().default(60).describe("Duration in minutes."),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string().describe("A confirmation message to show the user, e.g., 'Event scheduled' or 'Task added'."),
    }),
  },
  async ({ title, date, startTime, duration }, context) => {
    const userId = (context as any)?.userId;
    if (!userId) {
        return { success: false, message: "Action failed: User is not authenticated." };
    }

    const itemData: any = {
      userId,
      title,
      duration,
      type: date ? 'event' : 'task',
    };

    if (date) {
        // Ensure startTime has a default if date is provided
        itemData.startTime = startTime || '09:00'; 
        const parsedDate = parse(`${date}T${itemData.startTime}`, "yyyy-MM-dd'T'HH:mm", new Date());
        const endTime = addMinutes(parsedDate, duration ?? 60);
        itemData.date = date;
        itemData.endTime = format(endTime, 'HH:mm');
    }

    try {
      await serverAddScheduleItem(itemData);
      const successMessage = date 
        ? `Event "${title}" has been successfully scheduled on ${date} at ${itemData.startTime}.`
        : `Task "${title}" has been added to your inbox.`;
      return { success: true, message: successMessage };
    } catch (error) {
      console.error("Tool error (createTaskOrEventTool):", error);
      return { success: false, message: `Failed to create the item "${title}".` };
    }
  }
);


const findTimeForTaskTool = ai.defineTool(
    {
        name: 'findTimeForTask',
        description: 'Finds and suggests optimal time slots for a given task. Use this when the user asks to "find time for", "schedule", or "squeeze in" a task without providing a specific time.',
        inputSchema: z.object({
            title: z.string().describe("The description of the task, e.g., 'a 1-hour workout' or 'call the bank'"),
            duration: z.number().optional().default(60).describe('The duration of the task in minutes.'),
        }),
        outputSchema: z.object({
             suggestions: z.array(SuggestedSlotSchema).describe('A list of up to 3 suggested time slots.'),
             message: z.string().describe("A human-readable summary of the suggestions or a message if no slots are found.")
        })
    },
    async ({ title, duration }, context) => {
        const userId = (context as any)?.userId;
        if (!userId) {
            return { suggestions: [], message: "Action failed: User is not authenticated." };
        }
        
        const result = await getSuggestedTimeSlots(`${title} (${duration} min)`, userId);
        
        if (typeof result === 'string' || result.length === 0) {
            return { suggestions: [], message: `Sorry, I couldn't find any open slots for "${title}".` };
        }

        const topSuggestions = result.slice(0, 3);
        
        return { 
            suggestions: topSuggestions,
            message: `I found a few potential slots for "${title}". You can choose one of them.`
        };
    }
);

// --- Main Chat Flow ---

const systemPrompt = `You are ChronoFlow's AI assistant. Your name is Chrono. 
Be helpful, friendly, and concise. Your goal is to help the user manage their schedule. 
The current date is ${format(new Date(), 'yyyy-MM-dd')}.
Use the available tools to fulfill user requests.
- When a user wants to add something without a specific time, use 'createTaskOrEventTool' to add it to the inbox.
- When a user wants to schedule something at a specific time, use 'createTaskOrEventTool' to schedule it.
- When a user wants you to find time for something, use 'findTimeForTaskTool'.
After a tool is successfully used, confirm it to the user in a natural, conversational way. Your response should be just the confirmation, without repeating the tool output.
If a user asks a general question, provide a helpful answer.
If you find suggestions for a task, present them to the user. Do not schedule it automatically.
`;


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
        prompt: systemPrompt,
        tools: [createTaskOrEventTool, findTimeForTaskTool],
        history: history,
        context: {
            userId: userId, // Pass userId to tool context
        },
        config: {
            temperature: 0.1,
        },
    });

    // Return a plain object to avoid serialization errors in Next.js
    return { ...result.message };
  }
);
