
import {NextRequest, NextResponse} from 'next/server';
import {telegramWebhookFlow} from '@/ai/flows/telegram-webhook';

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
  return NextResponse.json({ message: 'Telegram webhook is active.' });
}
