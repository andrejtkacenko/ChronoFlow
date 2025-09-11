
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
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
        console.error("TELEGRAM_BOT_TOKEN environment variable is not set.");
        return; // Can't proceed without a token
    }
    
    const bot = new TelegramBot(botToken);

    if (text && text.trim() === '/start') {
        await bot.sendMessage(chat.id, 'Welcome to ChronoFlow! Send me any text and I will add it as a task to your inbox.');
        return;
    }

    const appUser = await findUserByTelegramId(from.id);
    
    if (!appUser) {
        console.error(`Could not find a ChronoFlow user for Telegram ID: ${from.id}`);
        await bot.sendMessage(chat.id, 'Sorry, your Telegram account is not linked to a ChronoFlow profile. Please link it from your profile page in the app.');
        return;
    }

    if (text) {
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
            
            await bot.sendMessage(chat.id, 'Задача добавлена в ваш инбокс.');

        } catch (error) {
            console.error("Error adding document: ", error);
            await bot.sendMessage(chat.id, 'Произошла ошибка при добавлении задачи.');
        }
    } else {
        await bot.sendMessage(chat.id, 'Please send a text message to add a task.');
    }
  }
);
