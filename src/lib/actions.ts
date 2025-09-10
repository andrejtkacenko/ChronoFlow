
'use server';

import { suggestOptimalTimeSlots } from "@/ai/flows/suggest-optimal-time-slots";
import { generateFullSchedule } from "@/ai/flows/generate-full-schedule";
import type { GenerateFullScheduleInput, GenerateFullScheduleOutput, SuggestedSlot } from "@/ai/flows/schema";
import { collection, getDocs, query, where, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import type { ScheduleItem } from "./types";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export async function getSuggestedTimeSlots(tasks: string, userId: string): Promise<SuggestedSlot[] | string> {
  if (!userId) {
    return "User not authenticated. Please log in.";
  }
  
  const scheduleQuery = query(collection(db, "scheduleItems"), where("userId", "==", userId));
  const scheduleSnapshot = await getDocs(scheduleQuery);
  const scheduleItems = scheduleSnapshot.docs
    .map(doc => doc.data() as ScheduleItem)
    .filter(item => item.date); // Filter for scheduled items client-side

  const scheduleString = scheduleItems
    .map(item => `${item.title} on ${item.date} from ${item.startTime} to ${item.endTime}`)
    .join("\n");

  try {
    const result = await suggestOptimalTimeSlots({
      schedule: scheduleString,
      tasks,
      currentDate: format(new Date(), 'yyyy-MM-dd'),
    });
    return result.suggestions;
  } catch (error) {
    console.error("Error getting suggestions:", error);
    return "Sorry, I couldn't find a time slot. There might be an issue with the scheduling service. Please try again later.";
  }
}

export async function generateSchedule(input: Omit<GenerateFullScheduleInput, 'schedule'>, userId: string): Promise<GenerateFullScheduleOutput | string> {
  if (!userId) {
    return "User not authenticated. Please log in.";
  }
  
  const scheduleQuery = query(collection(db, "scheduleItems"), where("userId", "==", userId));
  const scheduleSnapshot = await getDocs(scheduleQuery);
  const scheduleItems = scheduleSnapshot.docs
    .map(doc => doc.data() as ScheduleItem)
    .filter(item => item.date);

  const scheduleString = scheduleItems
    .map(item => `${item.title} on ${item.date} from ${item.startTime} to ${item.endTime}`)
    .join("\n");

  try {
    const result = await generateFullSchedule({
      ...input,
      schedule: scheduleString,
    });
    return result;
  } catch (error) {
    console.error("Error generating schedule:", error);
    return "Sorry, I couldn't generate a schedule. There might be an issue with the planning service. Please try again later.";
  }
}


export async function deleteScheduleItemsInRange(
  userId: string, 
  startDate: string | null, 
  endDate: string | null
): Promise<{ deletedCount: number }> {
    if (!userId) {
        throw new Error("User not authenticated.");
    }

    const itemsCollection = collection(db, "scheduleItems");
    let q = query(itemsCollection, where("userId", "==", userId));
    
    // This will only delete scheduled items, not inbox items (which have date === null)
    if (startDate && endDate) {
        q = query(q, where("date", ">=", startDate), where("date", "<=", endDate));
    } else if (!startDate && !endDate) {
      // This is the 'all' case, we need to ensure we only delete scheduled items
      q = query(q, where("date", "!=", null));
    }


    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return { deletedCount: 0 };
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();

    return { deletedCount: snapshot.size };
}

