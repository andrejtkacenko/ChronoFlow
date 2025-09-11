import * as admin from 'firebase-admin';

export function initializeAdminApp() {
    if (admin.apps.length > 0) {
        return admin.app();
    }

    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccountKey) {
        // This check is important for debugging but will cause build to fail if env var is missing.
        // The API route handlers will now control the call flow.
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
    }

    const serviceAccount = JSON.parse(serviceAccountKey);

    return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}
