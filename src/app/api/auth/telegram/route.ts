import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/lib/firebase-admin';
import crypto from 'crypto';

export async function POST(req: Request) {
  // Initialize Firebase Admin SDK inside the handler
  const adminApp = initializeAdminApp();
  const adminAuth = getAuth(adminApp);
  const adminDb = getFirestore(adminApp);

  const { telegramUser } = await req.json();

  if (!telegramUser) {
    return NextResponse.json({ error: 'Missing telegramUser data' }, { status: 400 });
  }

  // --- Telegram Hash Verification ---
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN is not set on the server.");
    return NextResponse.json({ error: 'Server configuration error for Telegram' }, { status: 500 });
  }

  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  
  const checkString = Object.keys(telegramUser)
    .filter(key => key !== 'hash')
    .map(key => `${key}=${telegramUser[key]}`)
    .sort()
    .join('\n');

  const hmac = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

  if (hmac !== telegramUser.hash) {
    return NextResponse.json({ error: 'Invalid hash. Telegram data could not be verified.' }, { status: 403 });
  }

  // --- Data is verified, proceed with Firebase Auth ---
  const telegramId = String(telegramUser.id);
  const uid = `tg-${telegramId}`; // Create a unique UID based on Telegram ID

  try {
    let userRecord;
    try {
      // 1. Check if user already exists
      userRecord = await adminAuth.getUser(uid);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // 2. If not, create a new user
        const newUser: any = {
          uid: uid,
          displayName: `${telegramUser.first_name}${telegramUser.last_name ? ' ' + telegramUser.last_name : ''}`,
          photoURL: telegramUser.photo_url,
          // We don't have an email from Telegram login
        };
        userRecord = await adminAuth.createUser(newUser);

        // Also create a corresponding document in Firestore
        const userDocRef = adminDb.collection('users').doc(uid);
        await userDocRef.set({
            uid: uid,
            displayName: newUser.displayName,
            photoURL: newUser.photoURL,
            telegramId: telegramId,
            telegramUsername: telegramUser.username,
            createdAt: FieldValue.serverTimestamp(),
        });

      } else {
        // Some other error occurred
        throw error;
      }
    }

    // 3. Create a custom token for the user to sign in on the client
    const customToken = await adminAuth.createCustomToken(uid);

    return NextResponse.json({ token: customToken });

  } catch (error: any) {
    console.error('Error during Telegram auth process:', error);
    return NextResponse.json({ error: 'Failed to authenticate with Firebase' }, { status: 500 });
  }
}
