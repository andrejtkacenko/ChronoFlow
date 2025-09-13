
'use server';

import { suggestOptimalTimeSlots } from "@/ai/flows/suggest-optimal-time-slots";
import { generateFullSchedule } from "@/ai/flows/generate-full-schedule";
import type { GenerateFullScheduleInput, GenerateFullScheduleOutput, SuggestedSlot } from "@/ai/flows/schema";
import { collection, getDocs, query, where, writeBatch, addDoc, serverTimestamp, setDoc, doc } from "firebase/firestore";
import { db } from "./firebase";
import type { ScheduleItem } from "./types";
import { format } from "date-fns";

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
  } catch (error: any) {
    console.error("Error in getSuggestedTimeSlots action:", error.message || error);
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
  } catch (error: any) {
    console.error("Error in generateSchedule action:", error.message || error);
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


export async function addScheduleItem(item: Omit<ScheduleItem, 'id' | 'createdAt' | 'completed'> & { userId: string, completed?: boolean }) {
    if (!item.userId) {
        throw new Error("User not authenticated.");
    }

    const itemWithDefaults = {
        ...item,
        description: item.description ?? null,
        date: item.date ?? null,
        startTime: item.startTime ?? null,
        endTime: item.endTime ?? null,
        duration: item.duration ?? null,
        icon: item.icon ?? null,
        color: item.color ?? null,
        completed: item.completed ?? false,
        notificationTime: item.notificationTime ?? null,
        notificationSent: item.notificationSent ?? false,
    }

    try {
        const docRef = await addDoc(collection(db, "scheduleItems"), {
            ...itemWithDefaults,
            createdAt: serverTimestamp(),
        });
        return docRef.id;
    } catch (e: any) {
        console.error("Error adding schedule item: ", e.message || e);
        throw new Error("Could not add schedule item to the database.");
    }
}

export async function saveScheduleTemplate(
    templateName: string, 
    templateData: GenerateFullScheduleOutput, 
    preferences: any,
    userId: string
): Promise<{ success: boolean; message: string; }> {
    if (!userId) {
        return { success: false, message: 'User not authenticated.' };
    }

    try {
        const templateRef = doc(collection(db, 'scheduleTemplates'));
        await setDoc(templateRef, {
            userId,
            templateName,
            schedule: templateData,
            preferences,
            createdAt: serverTimestamp(),
        });
        return { success: true, message: 'Schedule template saved successfully.' };
    } catch (error: any) {
        console.error("Error saving schedule template:", error.message || error);
        return { success: false, message: 'Could not save the schedule template.' };
    }
}
