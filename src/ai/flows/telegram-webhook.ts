
'use server';
/**
 * @fileOverview A Telegram webhook handler to add tasks to the inbox.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, addDoc, serverTimestamp, getDocs, query, where, doc, getDoc, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import TelegramBot from 'node-telegram-bot-api';


const TelegramMessageSchema = z.object({
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
  }),
});

type TelegramMessage = z.infer<typeof TelegramMessageSchema>;

// Helper function to get the first user in the db as a fallback.
async function findAppUser(): Promise<{ id: string; email: string; } | null> {
    
    // For this prototype, we'll just get the first user we can find.
    const usersQuery = query(collection(db, "users"), limit(1));
    const querySnapshot = await getDocs(usersQuery);

    if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        return {
            id: userDoc.id,
            email: userData.email || 'N/A',
        };
    }
    
    return null; // No user found
}


export const telegramWebhookFlow = ai.defineFlow(
  {
    name: 'telegramWebhookFlow',
    inputSchema: z.any(),
    outputSchema: z.void(),
  },
  async (payload) => {
    console.log("Received payload:", JSON.stringify(payload, null, 2));

    const parsed = TelegramMessageSchema.safeParse(payload);

    if (!parsed.success) {
      console.error("Failed to parse Telegram message:", parsed.error);
      return;
    }
    
    const { message } = parsed.data;
    const { text, from, chat } = message;
    
    // IMPORTANT: In a real app, you'd need to securely manage your bot token.
    // For this prototype, we are expecting it to be in an environment variable.
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
        console.error("TELEGRAM_BOT_TOKEN environment variable is not set.");
        // We cannot send a reply without a token, but we can still process the task.
    }
    
    const bot = botToken ? new TelegramBot(botToken) : null;

    const appUser = await findAppUser();
    
    if (!appUser) {
        console.error("Could not find any user in the database.");
        if (bot) {
            await bot.sendMessage(chat.id, 'Sorry, I could not find a user to assign the task to.');
        }
        return;
    }


    if (text) {
        if (text === '/start') {
            if (bot) {
                 await bot.sendMessage(chat.id, 'Welcome to ChronoFlow! Send me any text and I will add it as a task to your inbox.');
            }
            return;
        }

        try {
            await addDoc(collection(db, "scheduleItems"), {
                userId: appUser.id,
                title: text,
                type: 'task',
                completed: false,
                date: null,
                startTime: null,
                endTime: null,
                duration: 60, // Default duration
                description: `Added from Telegram by ${from.first_name}`,
                createdAt: serverTimestamp(),
            });
            console.log(`Task "${text}" added for user ${appUser.email} (ID: ${appUser.id})`);
            
            // Send a confirmation message back to the user if the bot is configured
            if (bot) {
                await bot.sendMessage(chat.id, 'Задача добавлена в ваш инбокс.');
            }

        } catch (error) {
            console.error("Error adding document: ", error);
             if (bot) {
                await bot.sendMessage(chat.id, 'Произошла ошибка при добавлении задачи.');
            }
        }
    } else if (bot) {
        await bot.sendMessage(chat.id, 'Please send a text message to add a task.');
    }
  }
);
