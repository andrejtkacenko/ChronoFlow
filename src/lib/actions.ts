
"use server";

import { suggestOptimalTimeSlots } from "@/ai/flows/suggest-optimal-time-slots";
import { generateFullSchedule } from "@/ai/flows/generate-full-schedule";
import type { GenerateFullScheduleInput, GenerateFullScheduleOutput, SuggestedSlot } from "@/ai/flows/schema";
import { collection, getDocs, query, where, writeBatch, documentId } from "firebase/firestore";
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
    return "Sorry, I couldn't find a time slot. There might be an issue with the AI service. Please try again later.";
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
    return "Sorry, I couldn't generate a schedule. There might be an issue with the AI service. Please try again later.";
  }
}

export async function deleteScheduleItemsInRange(
  userId: string, 
  range: 'day' | 'week' | 'month' | 'all',
  referenceDate: string
): Promise<{ success: boolean; message: string }> {
  if (!userId) {
    return { success: false, message: "User not authenticated." };
  }

  const itemsCollection = collection(db, "scheduleItems");
  let itemsQuery;

  if (range === 'all') {
    itemsQuery = query(itemsCollection, where("userId", "==", userId), where("date", "!=", null));
  } else {
    const refDate = new Date(referenceDate);
    let startDate: Date;
    let endDate: Date;

    switch (range) {
      case 'day':
        startDate = startOfDay(refDate);
        endDate = endOfDay(refDate);
        break;
      case 'week':
        startDate = startOfWeek(refDate);
        endDate = endOfWeek(refDate);
        break;
      case 'month':
        startDate = startOfMonth(refDate);
        endDate = endOfMonth(refDate);
        break;
    }
    
    itemsQuery = query(
      itemsCollection, 
      where("userId", "==", userId),
      where("date", ">=", format(startDate, 'yyyy-MM-dd')),
      where("date", "<=", format(endDate, 'yyyy-MM-dd'))
    );
  }

  try {
    const snapshot = await getDocs(itemsQuery);
    if (snapshot.empty) {
      return { success: true, message: "No items to delete in the selected range." };
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return { success: true, message: `${snapshot.size} item(s) deleted successfully.` };
  } catch (error) {
    console.error("Error deleting schedule items:", error);
    return { success: false, message: "An error occurred while deleting items." };
  }
}
