
'use server';
/**
 * @fileOverview A Telegram webhook handler to add tasks to the inbox or schedule events from natural language.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, addDoc, serverTimestamp, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { addMinutes, format } from 'date-fns';

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
  my_chat_member: z.any().optional(), // To handle bot status changes gracefully
});

const ParsedTaskSchema = z.object({
    isSchedulable: z.boolean().describe('Set to true if the text contains a specific date and time for an event. Otherwise, set to false if it is just a task for the inbox.'),
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


// --- AI Prompt for Parsing ---

const parseTaskPrompt = ai.definePrompt({
    name: 'parseTelegramTaskPrompt',
    input: { schema: z.object({ text: z.string(), currentDate: z.string() }) },
    output: { schema: ParsedTaskSchema },
    prompt: `You are an intelligent task parser. Your job is to analyze a text message and extract event details.
    
    The current date is: {{{currentDate}}}
    
    Analyze the following text: "{{{text}}}"

    - If the text contains a clear date and time (e.g., "tomorrow at 5pm", "on friday at 10:00", "сегодня в 19:30"), extract the date, time, and duration. The duration defaults to 60 minutes if not specified. Set 'isSchedulable' to true.
    - If the text is just a to-do item (e.g., "buy milk", "call mom"), extract the title and set 'isSchedulable' to false.
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
    
    // Gracefully handle updates that are not messages we want to process
    if (!parsedPayload.data.message) {
        console.log("Received a non-message or no-text update, skipping.");
        return;
    }

    const { message } = parsedPayload.data;
    const { text, from, chat } = message;

    // Exit if there is no text in the message
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
        const webAppUrl = `${baseUrl}/login`;
        await sendTelegramMessage(
            chat.id, 
            `Sorry, your Telegram account is not linked to a ChronoFlow profile. Please link it from your profile page in the app, or log in by clicking the button below.`,
            {
                 inline_keyboard: [
                    [{ text: 'Open App & Login', web_app: { url: webAppUrl } }]
                ]
            }
        );
        return;
    }

    // Handle /start command, but only if there's no associated user. If there is a user, we can assume they know what they are doing.
    if (text.startsWith('/start')) {
        console.log("User is already linked. Ignoring /start command.");
        return;
    }

    try {
        const { output } = await parseTaskPrompt({ text, currentDate: format(new Date(), 'yyyy-MM-dd') });
        if (!output) {
            throw new Error("Failed to parse task from AI.");
        }

        if (output.isSchedulable && output.date && output.startTime) {
            // It's an event, schedule it
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
