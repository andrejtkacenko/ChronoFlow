
import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/lib/firebase-admin';
import crypto from 'crypto';

async function validateHash(data: Record<string, any>): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN is not set on the server.");
    throw new Error('Server configuration error for Telegram');
  }

  const hash = data.hash;
  if (!hash) return false;

  const dataCheckArr = Object.keys(data)
    .filter((key) => key !== 'hash')
    .map((key) => `${key}=${data[key]}`);

  const dataCheckString = dataCheckArr.sort().join('\n');

  try {
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    return hmac === hash;
  } catch (error) {
    console.error('Error during hash verification:', error);
    return false;
  }
}

export async function POST(req: Request) {
  const adminApp = initializeAdminApp();
  const adminAuth = getAuth(adminApp);
  const adminDb = getFirestore(adminApp);

  const body = await req.json();
  
  let user: Record<string, any>;
  let isValid = false;

  // Differentiate between Mini App (initData) and Widget (telegramUser)
  if (body.initData) {
    const params = new URLSearchParams(body.initData);
    const data: Record<string, any> = {};
    params.forEach((value, key) => {
        data[key] = value;
    });

    const userParam = params.get('user');
    if (!userParam) {
      return NextResponse.json({ error: 'Invalid initData: user field missing' }, { status: 400 });
    }
    isValid = await validateHash(data);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid hash. Telegram data could not be verified (initData).' }, { status: 403 });
    }
    user = JSON.parse(userParam);
  } else if (body.telegramUser) {
    const authData = body.telegramUser;
    isValid = await validateHash(authData);
     if (!isValid) {
      return NextResponse.json({ error: 'Invalid hash. Telegram data could not be verified (widget).' }, { status: 403 });
    }
    user = authData;
  } else {
    return NextResponse.json({ error: 'Missing initData or telegramUser' }, { status: 400 });
  }

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
          // Создаем фейковый email, т.к. Telegram его не предоставляет
          email: `${user.username || telegramId}@telegram.user`, 
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
