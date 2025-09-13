
import {NextRequest, NextResponse} from 'next/server';
import {telegramWebhookFlow} from '@/ai/flows/telegram-webhook';

/**
 * This handler's primary job is to acknowledge Telegram's request IMMEDIATELY.
 * It must not `await` any long-running processes.
 * 
 * 1. It receives the webhook payload from Telegram.
 * 2. It synchronously calls `telegramWebhookFlow` which runs in the background.
 *    There is no `await` here, so we don't wait for it to finish.
 * 3. It immediately returns a 200 OK response to Telegram.
 * 
 * This prevents Telegram from re-sending the same update due to timeouts.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    
    // Fire-and-forget: Start the flow but do not wait for it to complete.
    // The serverless environment will handle its execution.
    telegramWebhookFlow(payload);

    // Immediately respond to Telegram to acknowledge receipt of the webhook.
    return NextResponse.json({status: 'ok'});
  } catch (err: any) {
    console.error('Error in webhook handler:', err);
    // Still respond OK, so Telegram doesn't retry on a malformed payload.
    return NextResponse.json({status: 'ok', error: 'Invalid payload'});
  }
}

export async function GET() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
      return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN is not set" }, { status: 500 });
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    const webhookInfo = await response.json();
    return NextResponse.json({ 
      message: 'Telegram webhook endpoint is active.',
      webhookInfo: webhookInfo.result 
    });
  } catch (error) {
    return NextResponse.json({ 
      message: 'Telegram webhook endpoint is active, but could not fetch webhook info.',
      error: (error as Error).message
    }, { status: 500 });
  }
}
