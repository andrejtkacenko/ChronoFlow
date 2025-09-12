
'use server';
/**
 * @fileOverview A Telegram webhook handler to add tasks to the inbox or schedule events from natural language.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, addDoc, serverTimestamp, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { addMinutes, format, parse } from 'date-fns';
import { suggestOptimalTimeSlots } from './suggest-optimal-time-slots';
import type { SuggestedSlot } from './schema';

// --- Schemas ---

const TelegramMessageSchema = z.object({
  update_id: z.number(),
  message: z.object({
    message_id: z.number(),
    from: z.object({
      id: z.number(),
      is_bot: z.boolean(),
      first_name: z.string(),
      last_name: z.string().optional(),
      username: z.string().optional(),
      language_code: z.string().optional(),
    }),
    chat: z.object({
      id: z.number(),
      first_name: z.string(),
      last_name: z.string().optional(),
      username: z.string().optional(),
      type: z.string(),
    }),
    date: z.number(),
    text: z.string().optional(),
  }).optional(),
  callback_query: z.object({
    id: z.string(),
    from: z.object({
      id: z.number(),
      is_bot: z.boolean(),
      first_name: z.string(),
      last_name: z.string().optional(),
      username: z.string().optional(),
      language_code: z.string().optional(),
    }),
    message: z.object({
      message_id: z.number(),
      chat: z.object({
        id: z.number(),
      }),
      text: z.string(),
    }),
    data: z.string(),
  }).optional(),
  my_chat_member: z.any().optional(), // To handle bot status changes gracefully
});

const ParsedTaskSchema = z.object({
    isSchedulable: z.boolean().describe('Set to true if the text contains a specific date and time for an event, or implies a desire to schedule (e.g., "next week", "tomorrow"). Otherwise, set to false if it is just a task for the inbox.'),
    hasSpecificTime: z.boolean().describe('Set to true only if a specific date and time (e.g., "tomorrow at 5pm", "on Aug 23 at 10:00") are mentioned. Set to false for vague requests like "next week".'),
    title: z.string().describe("The concise title of the event or task."),
    date: z.string().optional().describe("The date of the event in 'YYYY-MM-DD' format, if specified."),
    startTime: z.string().optional().describe("The start time of the event in 'HH:mm' format, if specified."),
    duration: z.number().optional().describe("The duration of the event in minutes, Default to 60 if not mentioned."),
});

// --- Helper Functions ---

async function findUserByTelegramId(telegramId: number): Promise<{ id: string; email: string | null; } | null> {
    const usersQuery = query(collection(db, "users"), where("telegramId", "==", String(telegramId)), limit(1));
    const querySnapshot = await getDocs(usersQuery);

    if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        return {
            id: userDoc.id,
            email: userData.email || 'N/A',
        };
    }
    
    return null;
}


async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: any) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
        console.error("TELEGRAM_BOT_TOKEN environment variable is not set. Cannot send message.");
        return;
    }
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const body: any = {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
    };
    if (replyMarkup) {
        body.reply_markup = replyMarkup;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Error sending message to Telegram:", errorData);
        }
    } catch (error) {
        console.error("Failed to fetch Telegram API:", error);
    }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return;
    const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`;
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
    });
}

async function editMessageText(chatId: number, messageId: number, text: string) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return;
    const url = `https://api.telegram.org/bot${botToken}/editMessageText`;
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: 'Markdown' }),
    });
}


// --- AI Prompt for Parsing ---

const parseTaskPrompt = ai.definePrompt({
    name: 'parseTelegramTaskPrompt',
    input: { schema: z.object({ text: z.string(), currentDate: z.string() }) },
    output: { schema: ParsedTaskSchema },
    prompt: `You are an intelligent task parser. Your job is to analyze a text message and extract event details.
    
    The current date is: {{{currentDate}}}
    
    Analyze the following text: "{{{text}}}"

    - If the text is just a to-do item (e.g., "buy milk", "call mom"), extract the title and set 'isSchedulable' to false and 'hasSpecificTime' to false.
    - If the text contains a clear, specific date and time (e.g., "tomorrow at 5pm", "on friday at 10:00", "сегодня в 19:30"), extract the date, time, and duration. The duration defaults to 60 minutes if not specified. Set 'isSchedulable' to true and 'hasSpecificTime' to true.
    - If the text implies a desire to schedule but lacks a specific time (e.g., "schedule a haircut for next week", "find time for a workout tomorrow"), extract the title and an approximate duration. Set 'isSchedulable' to true but 'hasSpecificTime' to false.
    - The title should be the core action of the task/event.
    
    Respond with the extracted information in the specified JSON format.`,
});

// --- Main Webhook Flow ---

export const telegramWebhookFlow = ai.defineFlow(
  {
    name: 'telegramWebhookFlow',
    inputSchema: z.any(),
    outputSchema: z.void(),
  },
  async (payload) => {
    console.log("Received payload:", JSON.stringify(payload, null, 2));

    const parsedPayload = TelegramMessageSchema.safeParse(payload);

    if (!parsedPayload.success) {
      console.error("Failed to parse Telegram message:", parsedPayload.error);
      return;
    }

    // --- Handle Callback Queries (Button Clicks) ---
    if (parsedPayload.data.callback_query) {
        const { id: callbackQueryId, from, message, data } = parsedPayload.data.callback_query;
        const [action, ...args] = data.split('|');

        if (action === 'schedule') {
            const [title, date, startTime, duration] = args;
            const appUser = await findUserByTelegramId(from.id);
            if (!appUser) {
                await answerCallbackQuery(callbackQueryId, "User not found.");
                return;
            }
            
            const startDate = new Date(`${date}T${startTime}`);
            const endDate = addMinutes(startDate, Number(duration));

            await addDoc(collection(db, "scheduleItems"), {
                userId: appUser.id,
                title,
                type: 'event',
                date: date,
                startTime: startTime,
                endTime: format(endDate, 'HH:mm'),
                duration: Number(duration),
                completed: false,
                description: `Added from Telegram by ${from.first_name}`,
                icon: 'PenSquare',
                color: 'hsl(12, 76%, 61%)',
                createdAt: serverTimestamp(),
            });

            await answerCallbackQuery(callbackQueryId);
            await editMessageText(message.chat.id, message.message_id, `✅ Event scheduled: "${title}" on ${date} at ${startTime}.`);
        }
        return;
    }
    
    // --- Handle Regular Messages ---
    if (!parsedPayload.data.message) {
        console.log("Received a non-message update, skipping.");
        return;
    }

    const { message } = parsedPayload.data;
    const { text, from, chat } = message;

    // We must have text to continue
    if (!text) {
        console.log("Received a message with no text, skipping.");
        return;
    }
    
    const appUser = await findUserByTelegramId(from.id);
    
    if (!appUser) {
        const baseUrl = process.env.NEXT_PUBLIC_URL;
        if (!baseUrl) {
            await sendTelegramMessage(chat.id, 'The application URL is not configured. Please contact support.');
            return;
        }
        const webAppUrl = `${baseUrl}/`; // Point to the root to get the native Mini App login experience
        await sendTelegramMessage(
            chat.id, 
            `Sorry, your Telegram account is not linked to a ChronoFlow profile. Please open the app to link your account.`,
            {
                 inline_keyboard: [
                    [{ text: 'Open App & Login', web_app: { url: webAppUrl } }]
                ]
            }
        );
        return;
    }

    if (text && text.startsWith('/start')) {
        await sendTelegramMessage(chat.id, `Hi ${from.first_name}! Your account is linked. Just send me tasks like "buy milk" or "schedule a meeting for tomorrow at 2pm".`);
        return;
    }

    if (text && text.startsWith('/help')) {
        const helpMessage = `
*Here's what I can do:*

*Direct commands:*
• \`/start\` - Greet the bot and check your connection.
• \`/help\` - Show this help message.

*Natural Language:*
Just send me a message and I'll try to understand it!

*1. Add a task to your Inbox:*
_Examples:_
• \`Buy milk\`
• \`Call the doctor\`
• \`Finish the report by Friday\`

*2. Schedule a specific event:*
_Examples:_
• \`Team meeting tomorrow at 10:00\`
• \`Lunch with Alex on Friday at 1pm for 1 hour\`
• \`dentist appointment 25 dec 15:30\`

*3. Ask me to find a time:*
_Examples:_
• \`Find time for a run this week\`
• \`Schedule a 1-hour meeting with the team tomorrow\`
• \`I need to get a haircut next week\`

I'll parse your message and either add it directly to your calendar or suggest available time slots for you to choose from.
        `;
        await sendTelegramMessage(chat.id, helpMessage);
        return;
    }

    try {
        const { output } = await parseTaskPrompt({ text, currentDate: format(new Date(), 'yyyy-MM-dd') });
        if (!output) {
            throw new Error("Failed to parse task from AI.");
        }

        if (output.isSchedulable) {
            if (output.hasSpecificTime && output.date && output.startTime) {
                // It's an event with a specific time, schedule it directly
                const duration = output.duration ?? 60;
                const startDate = new Date(`${output.date}T${output.startTime}`);
                const endDate = addMinutes(startDate, duration);

                await addDoc(collection(db, "scheduleItems"), {
                    userId: appUser.id,
                    title: output.title,
                    type: 'event',
                    date: output.date,
                    startTime: output.startTime,
                    endTime: format(endDate, 'HH:mm'),
                    duration: duration,
                    completed: false,
                    description: `Added from Telegram by ${from.first_name}`,
                    icon: 'PenSquare',
                    color: 'hsl(12, 76%, 61%)',
                    createdAt: serverTimestamp(),
                });
                await sendTelegramMessage(chat.id, `✅ Event scheduled: "${output.title}" on ${output.date} at ${output.startTime}.`);
            } else {
                // It's a schedulable task without a specific time, so we suggest slots
                const scheduleQuery = query(collection(db, "scheduleItems"), where("userId", "==", appUser.id), where("date", "!=", null));
                const scheduleSnapshot = await getDocs(scheduleQuery);
                const scheduleItems = scheduleSnapshot.docs.map(doc => doc.data());
                const scheduleString = scheduleItems.map(item => `${item.title} on ${item.date} from ${item.startTime} to ${item.endTime}`).join("\n");

                const suggestionsResult = await suggestOptimalTimeSlots({
                    schedule: scheduleString,
                    tasks: output.title,
                    duration: output.duration ?? 60,
                    currentDate: format(new Date(), 'yyyy-MM-dd'),
                });

                if (suggestionsResult.suggestions.length > 0) {
                     const inline_keyboard = suggestionsResult.suggestions.map((slot: SuggestedSlot) => ([{
                        text: `${format(parse(slot.date, 'yyyy-MM-dd', new Date()), 'EEE, d MMM')} at ${slot.startTime}`,
                        callback_data: `schedule|${slot.task}|${slot.date}|${slot.startTime}|${slot.duration}`
                     }]));
                     
                     await sendTelegramMessage(chat.id, `I found a few open slots for "${output.title}". Which one works for you?`, { inline_keyboard });
                } else {
                    await sendTelegramMessage(chat.id, `I couldn't find any open slots for "${output.title}". You can add it to your inbox instead.`);
                    // Fallback to adding to inbox
                     await addDoc(collection(db, "scheduleItems"), {
                        userId: appUser.id,
                        title: output.title,
                        type: 'task',
                        completed: false,
                        date: null,
                        startTime: null,
                        endTime: null,
                        duration: output.duration ?? 60,
                        description: `Added from Telegram by ${from.first_name}`,
                        createdAt: serverTimestamp(),
                    });
                    await sendTelegramMessage(chat.id, `📥 Task added to your inbox: "${output.title}"`);
                }
            }
        } else {
            // It's a simple task, add to inbox
            await addDoc(collection(db, "scheduleItems"), {
                userId: appUser.id,
                title: output.title,
                type: 'task',
                completed: false,
                date: null,
                startTime: null,
                endTime: null,
                duration: output.duration ?? 60,
                description: `Added from Telegram by ${from.first_name}`,
                createdAt: serverTimestamp(),
            });
            await sendTelegramMessage(chat.id, `📥 Task added to your inbox: "${output.title}"`);
        }
        
    } catch (error) {
        console.error("Error processing message: ", error);
        await sendTelegramMessage(chat.id, 'Sorry, an error occurred while processing your request.');
    }
  }
);

    
