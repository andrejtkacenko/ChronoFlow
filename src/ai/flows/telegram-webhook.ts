
'use server';
/**
 * @fileOverview A Telegram webhook handler powered by Telegraf to process user messages.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, addDoc, serverTimestamp, getDocs, query, where, limit, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { addMinutes, format, parse } from 'date-fns';
import { chatAssistantFlow } from '@/ai/flows/chat-flow';
import type { MessageData, ToolRequestPart, Part } from 'genkit';
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

// --- Telegraf Bot Setup ---

const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN is not set. Bot will not work.");
    throw new Error("TELEGRAM_BOT_TOKEN is not set.");
}
const bot = new Telegraf(botToken);

// --- Bot Middleware for User Authentication ---
bot.use(async (ctx, next) => {
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
bot.start(async (ctx) => {
    await ctx.reply(`Hi ${ctx.from.first_name}! Your account is linked. Just send me tasks like "buy milk" or "schedule a meeting for tomorrow at 2pm". For more examples, type /help.`);
});

bot.help(async (ctx) => {
    const helpMessage = `
*Here's what I can do:*

*Direct commands:*
• \`/start\` - Greet the bot and check your connection.
• \`/help\` - Show this help message.
• \`/today\` - See all your scheduled events for today.

*Natural Language:*
Just send me a message and I'll try to understand it!

*1. Add a task to your Inbox:*
_Examples:_
• \`Buy milk\`
• \`Call the doctor\`

*2. Schedule a specific event:*
_Examples:_
• \`Team meeting tomorrow at 10:00\`
• \`Lunch with Alex on Friday at 1pm for 1 hour\`

*3. Ask me to find a time:*
_Examples:_
• \`Find time for a run this week\`
• \`Schedule a 1-hour meeting with the team tomorrow\`
    `;
    await ctx.replyWithMarkdown(helpMessage);
});

bot.command('today', async (ctx) => {
    const appUser = (ctx as any).appUser;
    if (!appUser) return;

    try {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const q = query(
            collection(db, "scheduleItems"), 
            where("userId", "==", appUser.id),
            where("date", "==", todayStr),
            orderBy("startTime")
        );
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            await ctx.reply("✨ Your schedule for today is clear!");
            return;
        }

        const todayFormatted = format(new Date(), 'eeee, MMMM d');
        let replyMessage = `*Your agenda for ${todayFormatted}:*\n\n`;
        
        querySnapshot.forEach(doc => {
            const item = doc.data();
            const time = (item.startTime && item.endTime) ? `${item.startTime} - ${item.endTime}` : 'All day';
            replyMessage += `• ${time}: ${item.title}\n`;
        });

        await ctx.replyWithMarkdown(replyMessage);

    } catch (error) {
        console.error("Error fetching today's schedule:", error);
        await ctx.reply("Sorry, I couldn't retrieve your schedule for today. Please try again.");
    }
});

// --- Bot Action (Callback Query) Handler ---
bot.on('callback_query', async (ctx) => {
    const appUser = (ctx as any).appUser;
    if (!appUser || !ctx.from) return;

    if ('data' in ctx.callbackQuery) {
        const data = ctx.callbackQuery.data;
        const [action, title, date, startTime, duration] = data.split('|');

        if (action === 'schedule' && title && date && startTime && duration) {
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
            console.error("Invalid callback data received:", data);
        }
    }
});


// --- Bot Text Message Handler ---
bot.on('text', async (ctx) => {
    const appUser = (ctx as any).appUser;
    if (!appUser || !ctx.from) return;
    
    const { text } = ctx.message;
    await ctx.sendChatAction('typing');

    try {
        const history: MessageData[] = [{ role: 'user', content: [{ text }] }];
        
        // Initial call to the assistant
        let response = await chatAssistantFlow({ userId: appUser.id, history });

        let toolRequest: ToolRequestPart | undefined = response.content.find(
            (part: Part): part is ToolRequestPart => part.toolRequest !== undefined
        );

        // If the model asks to use a tool, run the second step
        if (toolRequest) {
            // Append the tool request to history
            history.push(response);

            // This is a simplified tool execution loop for Telegram.
            // We create a "tool response" message manually to feed back to the AI.
            // The actual tool logic is executed server-side within the tool definition.
            const toolResponse: MessageData = {
              role: 'tool',
              content: [{
                  toolResponse: {
                    name: toolRequest.toolRequest.name,
                    output: { success: true, message: 'Tool execution handled.' },
                  }
                }]
            };
            history.push(toolResponse);

            // Call the flow again with the tool response in history
            response = await chatAssistantFlow({ userId: appUser.id, history });
        }
        
        // Handle the final response from the AI
        const finalMessage = response.text;
        const suggestions = (response.content.find((part: Part) => part.data)?.data as any)?.suggestions;
       
        if (suggestions && suggestions.length > 0) {
            const buttons = suggestions.map((slot: any) => (
                Markup.button.callback(
                    `${format(parse(slot.date, 'yyyy-MM-dd', new Date()), 'EEE, d MMM')} at ${slot.startTime}`,
                    `schedule|${slot.task}|${slot.date}|${slot.startTime}|${slot.duration}`
                )
            ));
            
            await ctx.reply(finalMessage, Markup.inlineKeyboard(buttons, { columns: 1 }));
        } else if (finalMessage) {
            await ctx.reply(finalMessage);
        } else {
            await ctx.reply("Sorry, I didn't understand that. Could you rephrase?");
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
