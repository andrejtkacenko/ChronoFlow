
'use client';

import { collection, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import type { ScheduleItem } from "./types";
import { suggestOptimalTimeSlots } from "@/ai/flows/suggest-optimal-time-slots";
import type { SuggestedSlot } from "@/ai/flows/schema";


type ScheduleItemInput = Omit<ScheduleItem, 'id'>

export async function addScheduleItem(item: Omit<ScheduleItem, 'id' | 'userId'> & { userId: string }) {
    if (!item.userId) {
        throw new Error("User not authenticated.");
    }

    const itemWithNulls = {
        ...item,
        description: item.description ?? null,
        date: item.date ?? null,
        startTime: item.startTime ?? null,
        endTime: item.endTime ?? null,
        duration: item.duration ?? null,
        icon: item.icon ?? null,
        color: item.color ?? null,
        completed: item.completed ?? false,
    }

    try {
        const docRef = await addDoc(collection(db, "scheduleItems"), {
            ...itemWithNulls,
            createdAt: serverTimestamp(),
        });
        return docRef.id;
    } catch (e) {
        console.error("Error adding schedule item: ", e);
        throw new Error("Could not add schedule item to the database.");
    }
}

export async function updateScheduleItem(id: string, item: Partial<Omit<ScheduleItem, 'id' | 'userId'>>) {
    const itemWithNulls: {[key: string]: any} = {};

    for (const [key, value] of Object.entries(item)) {
        itemWithNulls[key] = value === undefined ? null : value;
    }

    try {
        const itemRef = doc(db, "scheduleItems", id);
        await updateDoc(itemRef, itemWithNulls);
    } catch (e) {
        console.error("Error updating schedule item: ", e);
        throw new Error("Could not update schedule item in the database.");
    }
}

export async function deleteScheduleItem(id: string) {
    try {
        const itemRef = doc(db, "scheduleItems", id);
        await deleteDoc(itemRef);
    } catch (e) {
        console.error("Error deleting schedule item: ", e);
        throw new Error("Could not delete schedule item from the database.");
    }
}

export async function getSuggestedTimeSlotsForTask(task: ScheduleItem, userId: string): Promise<SuggestedSlot[] | string> {
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
      tasks: task.title,
      duration: task.duration ?? 60
    });
    return result.suggestions;
  } catch (error) {
    console.error("Error getting suggestions:", error);
    return "Sorry, I couldn't find a time slot. There might be an issue with the AI service. Please try again later.";
  }
}
