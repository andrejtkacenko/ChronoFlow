import * as admin from 'firebase-admin';

export function initializeAdminApp() {
    if (admin.apps.length > 0) {
        return admin.app();
    }

    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);

    return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}
