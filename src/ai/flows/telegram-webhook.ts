
'use server';
/**
 * @fileOverview A Telegram webhook handler to add tasks to the inbox.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
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
    text: z.string(),
  }),
});

type TelegramMessage = z.infer<typeof TelegramMessageSchema>;

export const telegramWebhookFlow = ai.defineFlow(
  {
    name: 'telegramWebhookFlow',
    inputSchema: z.any(),
    outputSchema: z.void(),
  },
  async (payload) => {
    console.log("Received payload:", JSON.stringify(payload, null, 2));

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        console.error("TELEGRAM_BOT_TOKEN is not set in environment variables.");
        return;
    }
    const bot = new TelegramBot(token);

    const parsed = TelegramMessageSchema.safeParse(payload);

    if (!parsed.success) {
      console.error("Failed to parse Telegram message:", parsed.error);
      return;
    }
    
    const { message } = parsed.data;
    const { text, from, chat } = message;

    // For this prototype, we'll find the first user in the database.
    // This avoids needing to create a Firestore index for a query.
    const usersCollection = collection(db, "users");
    const usersSnapshot = await getDocs(query(usersCollection));

    if (usersSnapshot.empty) {
        console.error("No users found in the database. Cannot add task.");
        await bot.sendMessage(chat.id, 'Не удалось добавить задачу: не найдено пользователей в системе.');
        return;
    }
    
    // Get the first user found.
    const appUserId = usersSnapshot.docs[0].id;
    const userEmail = usersSnapshot.docs[0].data().email;

    if (text) {
        try {
            await addDoc(collection(db, "scheduleItems"), {
                userId: appUserId,
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
            console.log(`Task "${text}" added for user ${userEmail} (ID: ${appUserId})`);
            
            // Send a confirmation message back to the user
            await bot.sendMessage(chat.id, 'Задача добавлена в ваш инбокс.');

        } catch (error) {
            console.error("Error adding document: ", error);
            await bot.sendMessage(chat.id, 'Произошла ошибка при добавлении задачи.');
        }
    }
  }
);
