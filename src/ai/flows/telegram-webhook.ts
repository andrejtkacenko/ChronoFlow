
'use server';
/**
 * @fileOverview A Telegram webhook handler powered by Telegraf to process user messages.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, addDoc, serverTimestamp, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { addMinutes, format, parse } from 'date-fns';
import { suggestOptimalTimeSlots } from '@/ai/flows/suggest-optimal-time-slots';
import type { SuggestedSlot } from '@/ai/flows/schema';
import { Telegraf, Markup } from 'telegraf';
import type { Update } from 'telegraf/types';

// --- Helper: Find User ---
async function findUserByTelegramId(telegramId: number): Promise<{ id: string; email: string | null; } | null> {
    const usersQuery = query(collection(db, "users"), where("telegramId", "==", String(telegramId)), limit(1));
    const querySnapshot = await getDocs(usersQuery);

    if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        return {
            id: userDoc.id,
            email: userData.email || null,
        };
    }
    return null;
}

// --- AI Prompt for Parsing ---
const ParsedTaskSchema = z.object({
    isUnderstandable: z.boolean().describe('Set to true if the text is a task, event, or a request to schedule. Set to false for greetings, questions, or random text.'),
    isSchedulable: z.boolean().describe('Set to true if the text contains a specific date and time for an event, or implies a desire to schedule (e.g., "next week", "tomorrow"). Otherwise, set to false if it is just a task for the inbox.'),
    hasSpecificTime: z.boolean().describe('Set to true only if a specific date and time (e.g., "tomorrow at 5pm", "on Aug 23 at 10:00") are mentioned. Set to false for vague requests like "next week".'),
    title: z.string().describe("The concise title of the event or task. If not understandable, this can be an empty string."),
    date: z.string().optional().describe("The date of the event in 'YYYY-MM-DD' format, if specified."),
    startTime: z.string().optional().describe("The start time of the event in 'HH:mm' format, if specified."),
    duration: z.number().optional().describe("The duration of the event in minutes, Default to 60 if not mentioned."),
});

const parseTaskPrompt = ai.definePrompt({
    name: 'parseTelegramTaskPrompt',
    input: { schema: z.object({ text: z.string(), currentDate: z.string() }) },
    output: { schema: ParsedTaskSchema },
    prompt: `You are an intelligent task parser. Your job is to analyze a text message and extract event details.
    
    The current date is: {{{currentDate}}}
    
    Analyze the following text: "{{{text}}}"

    - First, determine if the text is a task-related request. If it's a greeting ("hi", "hello"), a question ("how are you?"), or random gibberish, set 'isUnderstandable' to false and all other fields to their defaults.
    - If the text is a to-do item (e.g., "buy milk", "call mom"), extract the title. Set 'isUnderstandable' to true, 'isSchedulable' to false, and 'hasSpecificTime' to false.
    - If the text contains a clear, specific date and time (e.g., "tomorrow at 5pm", "on friday at 10:00", "сегодня в 19:30"), extract the date, time, and duration. The duration defaults to 60 minutes if not specified. Set 'isUnderstandable' to true, 'isSchedulable' to true, and 'hasSpecificTime' to true.
    - If the text implies a desire to schedule but lacks a specific time (e.g., "schedule a haircut for next week", "find time for a workout tomorrow"), extract the title and an approximate duration. Set 'isUnderstandable' to true, 'isSchedulable' to true, but 'hasSpecificTime' to false.
    - The title should be the core action of the task/event.
    
    Respond with the extracted information in the specified JSON format.`,
});

// --- Telegraf Bot Setup ---

const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN is not set. Bot will not work.");
    // We don't throw here to allow the app to build, but the bot will be disabled.
}
const bot = botToken ? new Telegraf(botToken) : null;

// --- Bot Middleware for User Authentication ---
bot?.use(async (ctx, next) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
        return; // Ignore updates without a user ID
    }
    
    const appUser = await findUserByTelegramId(telegramId);

    if (!appUser) {
        const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://chrono-flow-rho.vercel.app';
        const webAppUrl = `${baseUrl}/`; 
        await ctx.reply(
            `Sorry, your Telegram account is not linked to a ChronoFlow profile. Please open the app to link your account.`,
            Markup.inlineKeyboard([
                Markup.button.webApp('Open App & Login', webAppUrl)
            ])
        );
        return; // Stop processing if user is not linked
    }

    // Attach user to context for other handlers to use
    (ctx as any).appUser = appUser;
    return next();
});

// --- Bot Command Handlers ---
bot?.start(async (ctx) => {
    await ctx.reply(`Hi ${ctx.from.first_name}! Your account is linked. Just send me tasks like "buy milk" or "schedule a meeting for tomorrow at 2pm". For more examples, type /help.`);
});

bot?.help(async (ctx) => {
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
    await ctx.replyWithMarkdown(helpMessage);
});

// --- Bot Action (Callback Query) Handler ---
bot?.on('callback_query', async (ctx) => {
    const appUser = (ctx as any).appUser;
    if (!appUser || !ctx.from) return;

    if ('data' in ctx.callbackQuery) {
        const data = ctx.callbackQuery.data;
        const [action, userId, title, date, startTime, duration] = data.split('|');

        if (action === 'schedule' && appUser.id === userId && title && date && startTime && duration) {
            try {
                const startDate = parse(`${date}T${startTime}`, "yyyy-MM-dd'T'HH:mm", new Date());
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
                    description: `Added from Telegram by ${ctx.from.first_name}`,
                    icon: 'PenSquare',
                    color: 'hsl(12, 76%, 61%)',
                    createdAt: serverTimestamp(),
                });

                await ctx.answerCbQuery('Event scheduled!');
                await ctx.editMessageText(`✅ Event scheduled: "${title}" on ${date} at ${startTime}.`);
            } catch (error) {
                console.error("Error scheduling event from callback:", error);
                await ctx.answerCbQuery("Error: Could not schedule event.");
                await ctx.editMessageText(`❌ Failed to schedule "${title}". Please try again.`);
            }
        } else {
            await ctx.answerCbQuery("Error: Invalid action.");
            console.error("Invalid callback data:", data);
        }
    }
});


// --- Bot Text Message Handler ---
bot?.on('text', async (ctx) => {
    const appUser = (ctx as any).appUser;
    if (!appUser || !ctx.from) return;
    
    const { text } = ctx.message;

    try {
        const { output } = await parseTaskPrompt({ text, currentDate: format(new Date(), 'yyyy-MM-dd') });
        if (!output) {
            throw new Error("Failed to parse task from AI.");
        }

        if (!output.isUnderstandable) {
            await ctx.reply("Sorry, I didn't understand that. I can help with tasks and events. For examples, type /help.");
            return;
        }

        if (output.isSchedulable) {
            if (output.hasSpecificTime && output.date && output.startTime) {
                // It's an event with a specific time, schedule it directly
                const duration = output.duration ?? 60;
                const startDate = parse(`${output.date}T${output.startTime}`, "yyyy-MM-dd'T'HH:mm", new Date());
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
                    description: `Added from Telegram by ${ctx.from.first_name}`,
                    icon: 'PenSquare',
                    color: 'hsl(12, 76%, 61%)',
                    createdAt: serverTimestamp(),
                });
                await ctx.reply(`✅ Event scheduled: "${output.title}" on ${output.date} at ${output.startTime}.`);
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
                     const buttons = suggestionsResult.suggestions.map((slot: SuggestedSlot) => (
                        Markup.button.callback(
                            `${format(parse(slot.date, 'yyyy-MM-dd', new Date()), 'EEE, d MMM')} at ${slot.startTime}`,
                            `schedule|${appUser.id}|${slot.task}|${slot.date}|${slot.startTime}|${slot.duration}`
                        )
                     ));
                     
                     await ctx.reply(`I found a few open slots for "${output.title}". Which one works for you?`, Markup.inlineKeyboard(buttons, { columns: 1 }));
                } else {
                    await ctx.reply(`I couldn't find any open slots for "${output.title}". I'll add it to your inbox instead.`);
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
                        description: `Added from Telegram by ${ctx.from.first_name}`,
                        createdAt: serverTimestamp(),
                    });
                    await ctx.reply(`📥 Task added to your inbox: "${output.title}"`);
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
                description: `Added from Telegram by ${ctx.from.first_name}`,
                createdAt: serverTimestamp(),
            });
            await ctx.reply(`📥 Task added to your inbox: "${output.title}"`);
        }
        
    } catch (error) {
        console.error("Error processing message: ", error);
        await ctx.reply('Sorry, an error occurred while processing your request.');
    }
});


// --- Main Webhook Flow for Genkit ---
// This function acts as the entry point for the webhook request.
export const telegramWebhookFlow = ai.defineFlow(
  {
    name: 'telegramWebhookFlow',
    inputSchema: z.any(),
    outputSchema: z.void(),
  },
  async (payload: Update) => {
    if (!bot) {
      console.error('Telegraf bot is not initialized. TELEGRAM_BOT_TOKEN might be missing.');
      return;
    }
    try {
      await bot.handleUpdate(payload);
    } catch (error) {
      console.error('Error handling Telegraf update:', error);
    }
  }
);
