
'use server';
/**
 * @fileOverview A Telegram webhook handler to add tasks to the inbox.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
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

    // For this prototype, we'll find the first user in the database.
    // This avoids needing to create a Firestore index for a query.
    const usersCollection = collection(db, "users");
    const usersSnapshot = await getDocs(query(usersCollection));

    if (usersSnapshot.empty) {
        console.error("No users found in the database. Cannot add task.");
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
        } catch (error) {
            console.error("Error adding document: ", error);
        }
    }
  }
);
