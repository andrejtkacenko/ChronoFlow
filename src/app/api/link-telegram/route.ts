import { NextResponse } from 'next/server';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import crypto from 'crypto';

export async function POST(req: Request) {
  const { userId, telegramData } = await req.json();

  if (!userId || !telegramData) {
    return NextResponse.json({ error: 'Missing userId or telegramData' }, { status: 400 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN is not set on the server.");
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // --- Telegram Hash Verification ---
  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  
  const checkString = Object.keys(telegramData)
    .filter(key => key !== 'hash')
    .map(key => `${key}=${telegramData[key]}`)
    .sort()
    .join('\n');

  const hmac = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

  if (hmac !== telegramData.hash) {
    return NextResponse.json({ error: 'Invalid hash. Telegram data could not be verified.' }, { status: 403 });
  }
  
  // --- Data is verified, update Firestore ---
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      telegramId: String(telegramData.id),
      telegramUsername: telegramData.username,
      // You can also update photo_url or display name if you want
      // photoURL: telegramData.photo_url
    });
    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error("Error updating user document:", error);
    return NextResponse.json({ error: 'Failed to update user profile in database' }, { status: 500 });
  }
}
