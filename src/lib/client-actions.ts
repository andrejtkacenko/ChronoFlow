
'use client';

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import type { ScheduleItem } from "./types";

export async function addTask(label: string, userId: string) {
    if (!label.trim()) {
        throw new Error("Task label cannot be empty.");
    }
    if (!userId) {
        throw new Error("User not authenticated.");
    }
    
    try {
        const docRef = await addDoc(collection(db, "tasks"), {
            label: label,
            completed: false,
            createdAt: serverTimestamp(),
            userId: userId,
        });
        return docRef.id;
    } catch (e) {
        console.error("Error adding document: ", e);
        throw new Error("Could not add task to the database.");
    }
}

export async function addScheduleItem(item: Omit<ScheduleItem, 'id'>) {
    if (!item.userId) {
        throw new Error("User not authenticated.");
    }

    try {
        const docRef = await addDoc(collection(db, "scheduleItems"), {
            ...item,
            createdAt: serverTimestamp(),
        });
        return docRef.id;
    } catch (e) {
        console.error("Error adding schedule item: ", e);
        throw new Error("Could not add schedule item to the database.");
    }
}
