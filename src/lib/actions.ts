"use server";

import { suggestOptimalTimeSlots } from "@/ai/flows/suggest-optimal-time-slots";
import { scheduleItems } from "@/lib/data";

export async function getSuggestedTimeSlots(tasks: string): Promise<string> {
  // In a real application, you would fetch the user's schedule from a database.
  // For this demo, we'll use the mock data.
  const scheduleString = scheduleItems
    .map(item => `${item.title} from ${item.startTime} to ${item.endTime}`)
    .join("\n");

  try {
    const result = await suggestOptimalTimeSlots({
      schedule: scheduleString,
      tasks,
    });
    // The AI returns a JSON string within a field, so we parse and re-stringify for pretty printing
    const parsedSuggestions = JSON.parse(result.suggestedTimeSlots);
    return JSON.stringify(parsedSuggestions, null, 2);
  } catch (error) {
    console.error("Error getting suggestions:", error);
    return "Sorry, I couldn't find a time slot. There might be an issue with the AI service. Please try again later.";
  }
}
