
'use client';

import { collection, addDoc, serverTimestamp, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { ScheduleItem } from "./types";

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

    