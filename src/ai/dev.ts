import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-optimal-time-slots.ts';
import '@/ai/flows/generate-full-schedule.ts';
import '@/ai/flows/telegram-webhook.ts';
import '@/ai/flows/chat-flow.ts';
