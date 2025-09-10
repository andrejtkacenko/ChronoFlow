
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

// This GET method is used once by you to set the webhook.
// After setting it, you can remove this method.
export async function GET(req: Request) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
        return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN is not set in .env" }, { status: 500 });
    }

    // This needs to be your public URL, e.g., from ngrok or your deployed app.
    const publicUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!publicUrl) {
        return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL is not set in .env" }, { status: 500 });
    }
    
    const webhookUrl = `${publicUrl}/api/telegram-webhook`;
    
    try {
        const bot = new TelegramBot(botToken);
        await bot.setWebHook(webhookUrl);
        return NextResponse.json({ success: true, message: `Webhook set to ${webhookUrl}` });
    } catch (error: any) {
        console.error("Failed to set webhook:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
