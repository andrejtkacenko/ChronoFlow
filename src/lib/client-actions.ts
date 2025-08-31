
'use client';

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export async function addTask(label: string) {
    if (!label.trim()) {
        throw new Error("Task label cannot be empty.");
    }
    
    try {
        const docRef = await addDoc(collection(db, "tasks"), {
            label: label,
            completed: false,
            createdAt: serverTimestamp(),
        });
        return docRef.id;
    } catch (e) {
        console.error("Error adding document: ", e);
        throw new Error("Could not add task to the database.");
    }
}
