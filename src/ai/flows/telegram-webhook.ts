
'use server';
/**
 * @fileOverview A Telegram webhook handler to add tasks to the inbox.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, addDoc, serverTimestamp, getDocs, query, where, doc, getDoc } from "firebase/firestore";
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

// Helper function to find a user by their Telegram ID or get the first user as a fallback.
async function findAppUser(telegramUserId: number): Promise<{ id: string; email: string; token: string | null } | null> {
    
    // In a real app, you would query for a user linked to the telegramUserId
    // For this prototype, we'll find the user who has a telegramBotToken set.
    const q = query(collection(db, "userPreferences"), where("telegramBotToken", "!=", null));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0]; // Get the first user with a token
        const userData = userDoc.data();
        
        const userQuery = await getDoc(doc(db, "users", userDoc.id));
        if (userQuery.exists()) {
             return {
                id: userDoc.id,
                email: userQuery.data()?.email || 'N/A',
                token: userData.telegramBotToken || null
            };
        }
    }
    
    return null; // No user found with a token
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

    const appUser = await findAppUser(from.id);
    
    if (!appUser || !appUser.token) {
        console.error("Could not find a configured user for this bot. Please set the Telegram token in the integrations page.");
        // We cannot send a reply without a token.
        return;
    }

    const bot = new TelegramBot(appUser.token);

    if (text) {
        if (text === '/start') {
            await bot.sendMessage(chat.id, 'Welcome to ChronoFlow! Send me any text and I will add it as a task to your inbox.');
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
            
            // Send a confirmation message back to the user
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
