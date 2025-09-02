
"use server";

import { suggestOptimalTimeSlots, SuggestedSlot } from "@/ai/flows/suggest-optimal-time-slots";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import type { ScheduleItem } from "./types";

export async function getSuggestedTimeSlots(tasks: string, userId: string): Promise<SuggestedSlot[] | string> {
  if (!userId) {
    return "User not authenticated. Please log in.";
  }
  
  const scheduleQuery = query(collection(db, "scheduleItems"), where("userId", "==", userId));
  const scheduleSnapshot = await getDocs(scheduleQuery);
  const scheduleItems = scheduleSnapshot.docs.map(doc => doc.data() as ScheduleItem);

  const scheduleString = scheduleItems
    .map(item => `${item.title} on ${item.date} from ${item.startTime} to ${item.endTime}`)
    .join("\n");

  try {
    const result = await suggestOptimalTimeSlots({
      schedule: scheduleString,
      tasks,
    });
    return result.suggestions;
  } catch (error) {
    console.error("Error getting suggestions:", error);
    return "Sorry, I couldn't find a time slot. There might be an issue with the AI service. Please try again later.";
  }
}
