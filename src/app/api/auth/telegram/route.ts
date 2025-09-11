import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/lib/firebase-admin';
import crypto from 'crypto';

export async function POST(req: Request) {
  const adminApp = initializeAdminApp();
  const adminAuth = getAuth(adminApp);
  const adminDb = getFirestore(adminApp);

  const { initData: initDataString } = await req.json();

  if (!initDataString) {
    return NextResponse.json({ error: 'Missing initData' }, { status: 400 });
  }
  
  const params = new URLSearchParams(initDataString);
  const hash = params.get('hash');
  params.delete('hash'); // Удаляем hash из параметров для проверки

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN is not set on the server.");
    return NextResponse.json({ error: 'Server configuration error for Telegram' }, { status: 500 });
  }

  // Собираем строку для проверки из оставшихся параметров
  const dataCheckArr: string[] = [];
  for (const [key, value] of params.entries()) {
      dataCheckArr.push(`${key}=${value}`);
  }
  
  const dataCheckString = dataCheckArr.sort().join('\n');
    
  try {
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (hmac !== hash) {
      console.error('Hash verification failed', { hmac, hash });
      return NextResponse.json({ error: 'Invalid hash. Telegram data could not be verified.' }, { status: 403 });
    }
  } catch (error) {
      console.error('Error during hash verification:', error);
      return NextResponse.json({ error: 'Hash verification failed.' }, { status: 500 });
  }
  
  // Данные валидны, извлекаем информацию о пользователе
  const userString = params.get('user');
  if (!userString) {
      return NextResponse.json({ error: 'User data not found in initData' }, { status: 400 });
  }
  const user = JSON.parse(userString);
  const telegramId = String(user.id);
  const uid = `tg-${telegramId}`;

  try {
    let userRecord;
    try {
      userRecord = await adminAuth.getUser(uid);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        const newUser: any = {
          uid: uid,
          displayName: `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`,
          photoURL: user.photo_url,
          email: `${user.username || telegramId}@telegram.user`, // Создаем фейковый email
        };
        userRecord = await adminAuth.createUser(newUser);

        const userDocRef = adminDb.collection('users').doc(uid);
        await userDocRef.set({
            uid: uid,
            displayName: newUser.displayName,
            photoURL: newUser.photoURL,
            email: newUser.email,
            telegramId: telegramId,
            telegramUsername: user.username,
            createdAt: FieldValue.serverTimestamp(),
        });

      } else {
        throw error;
      }
    }

    const customToken = await adminAuth.createCustomToken(uid);

    return NextResponse.json({ token: customToken });

  } catch (error: any) {
    console.error('Error during Telegram auth process:', error);
    return NextResponse.json({ error: 'Failed to authenticate with Firebase' }, { status: 500 });
  }
}