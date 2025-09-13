
import {NextRequest, NextResponse} from 'next/server';
import {telegramWebhookFlow} from '@/ai/flows/telegram-webhook';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    
    // Запускаем обработку в фоне, не дожидаясь завершения.
    // Это позволяет немедленно отправить ответ Telegram.
    telegramWebhookFlow(payload);

    // Сразу отвечаем Telegram, чтобы избежать тайм-аутов и повторных отправок.
    return NextResponse.json({status: 'ok'});
  } catch (err: any) {
    console.error('Error in webhook handler:', err);
    // Все равно отвечаем OK, чтобы Telegram не пытался отправить некорректные данные снова.
    return NextResponse.json({status: 'ok', error: 'Invalid payload'});
  }
}

export async function GET() {
  // Этот эндпоинт можно использовать для проверки, что вебхук установлен.
  // Можно добавить логику для установки/проверки вебхука с Telegram API.
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
