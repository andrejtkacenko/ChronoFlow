
import {NextRequest, NextResponse} from 'next/server';
import {telegramWebhookFlow} from '@/ai/flows/telegram-webhook';
import { Telegraf } from 'telegraf';

// This is a minimal setup to extract the bot token safely
// and use it for webhook validation if needed in the future.
const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set.");
}
const bot = new Telegraf(botToken);

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    
    // Use waitUntil to process the flow in the background
    // This allows us to send an immediate response to Telegram
    req.waitUntil(telegramWebhookFlow(payload));

    // Immediately respond to Telegram to prevent timeouts and retries
    return NextResponse.json({status: 'ok'});
  } catch (err: any) {
    console.error('Error in webhook handler:', err);
    // Still respond with OK to prevent Telegram from retrying on a bad payload
    return NextResponse.json({status: 'ok', error: 'Invalid payload'});
  }
}

export async function GET() {
  try {
    const webhookInfo = await bot.telegram.getWebhookInfo();
    return NextResponse.json({ 
      message: 'Telegram webhook is active.',
      webhookInfo: {
        url: webhookInfo.url,
        has_custom_certificate: webhookInfo.has_custom_certificate,
        pending_update_count: webhookInfo.pending_update_count,
        last_error_date: webhookInfo.last_error_date ? new Date(webhookInfo.last_error_date * 1000).toISOString() : null,
        last_error_message: webhookInfo.last_error_message,
      }
    });
  } catch (error: any) {
    console.error('Error fetching webhook info:', error);
    return NextResponse.json({ message: 'Telegram webhook endpoint is active, but could not fetch webhook info.', error: error.message }, { status: 500 });
  }
}
