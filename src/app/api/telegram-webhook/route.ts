
import {NextResponse} from 'next/server';
import {telegramWebhookFlow} from '@/ai/flows/telegram-webhook';
import TelegramBot from 'node-telegram-bot-api';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    // Don't await the flow, Telegram expects a quick response
    telegramWebhookFlow(payload);

    return NextResponse.json({status: 'ok'});
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({error: err.message}, {status: 500});
  }
}
