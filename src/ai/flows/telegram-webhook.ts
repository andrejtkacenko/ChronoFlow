
'use server';
/**
 * @fileOverview A Telegram webhook handler to add tasks to the inbox.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, addDoc, serverTimestamp, getDocs, query, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";

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

    const parsed = TelegramMessageSchema.safeParse(payload);

    if (!parsed.success) {
      console.error("Failed to parse Telegram message:", parsed.error);
      return;
    }
    
    const { message } = parsed.data;
    const { text, from } = message;
    const telegramUserId = from.id;

    // In a real app, you'd map telegramUserId to your app's user ID.
    // For this prototype, we'll find the user by a hardcoded email.
    const userQuery = query(collection(db, "users"), where("email", "==", "user@example.com"));
    const usersSnapshot = await getDocs(userQuery);

    if (usersSnapshot.empty) {
        console.error("User with email user@example.com not found in the database.");
        // As a fallback, let's try to get the first user to not break the flow entirely
         const anyUserSnapshot = await getDocs(query(collection(db, "users")));
         if (anyUserSnapshot.empty) {
            console.error("No users found in the database.");
            return;
         }
         const appUserId = anyUserSnapshot.docs[0].id;

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
                  console.log(`Task "${text}" added for fallback user ${appUserId}`);
              } catch (error) {
                  console.error("Error adding document for fallback user: ", error);
              }
          }
        return;
    }
    const appUserId = usersSnapshot.docs[0].id;


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
            console.log(`Task "${text}" added for user ${appUserId}`);
        } catch (error) {
            console.error("Error adding document: ", error);
        }
    }
  }
);
