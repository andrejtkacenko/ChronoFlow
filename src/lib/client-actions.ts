
'use client';

import { collection, addDoc, serverTimestamp, updateDoc, doc, deleteDoc } from "firebase/firestore";
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

export async function addScheduleItem(item: Omit<ScheduleItem, 'id' | 'userId'> & { userId: string }) {
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

export async function updateScheduleItem(id: string, item: Partial<Omit<ScheduleItem, 'id' | 'userId'>>) {
    try {
        const itemRef = doc(db, "scheduleItems", id);
        await updateDoc(itemRef, item);
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
