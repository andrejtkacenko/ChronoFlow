import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/lib/firebase-admin';
import { subtle } from 'crypto';

// Helper function to convert the secret key for SubtleCrypto
async function getSecretKey(botToken: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyData = await subtle.digest('SHA-256', encoder.encode(botToken));
    return subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

export async function POST(req: Request) {
  // Initialize Firebase Admin SDK inside the handler
  const adminApp = initializeAdminApp();
  const adminAuth = getAuth(adminApp);
  const adminDb = getFirestore(adminApp);

  const { initData: initDataString } = await req.json();

  if (!initDataString) {
    return NextResponse.json({ error: 'Missing initData' }, { status: 400 });
  }
  
  const params = new URLSearchParams(initDataString);
  const hash = params.get('hash');
  const initData: Record<string, string> = {};
  params.forEach((value, key) => {
    if (key !== 'hash') {
      initData[key] = value;
    }
  });

  // --- Telegram Hash Verification using Web Crypto API ---
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN is not set on the server.");
    return NextResponse.json({ error: 'Server configuration error for Telegram' }, { status: 500 });
  }
  
  const dataCheckString = Object.keys(initData)
    .map((key) => `${key}=${initData[key]}`)
    .sort()
    .join('\n');

  try {
      const secretKeyFromToken = await subtle.importKey('raw', new TextEncoder().encode('WebAppData'), { name: 'HMAC', hash: { name: 'SHA-256' }}, false, ['sign']);
      const secretKey = await subtle.sign('HMAC', secretKeyFromToken, new TextEncoder().encode(botToken));
      
      const signature = await subtle.sign('HMAC', { name: 'HMAC', hash: 'SHA-256', length: 256, public: secretKey }, new TextEncoder().encode(dataCheckString));
      
      const signatureHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

      if (signatureHex !== hash) {
        return NextResponse.json({ error: 'Invalid hash. Telegram data could not be verified.' }, { status: 403 });
      }
  } catch (error) {
      console.error('Error during hash verification:', error);
      return NextResponse.json({ error: 'Hash verification failed.' }, { status: 500 });
  }
  
  const user = JSON.parse(initData.user);

  // --- Data is verified, proceed with Firebase Auth ---
  const telegramId = String(user.id);
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
          displayName: `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`,
          photoURL: user.photo_url,
        };
        userRecord = await adminAuth.createUser(newUser);

        // Also create a corresponding document in Firestore
        const userDocRef = adminDb.collection('users').doc(uid);
        await userDocRef.set({
            uid: uid,
            displayName: newUser.displayName,
            photoURL: newUser.photoURL,
            telegramId: telegramId,
            telegramUsername: user.username,
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
