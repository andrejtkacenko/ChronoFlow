// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {"apiKey":"FIREBASE_API_KEY","authDomain":"FIREBASE_AUTH_DOMAIN","projectId":"FIREBASE_PROJECT_ID","storageBucket":"FIREBASE_STORAGE_BUCKET","messagingSenderId":"FIREBASE_MESSAGING_SENDER_ID","appId":"FIREBASE_APP_ID"};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
}

const auth = getAuth(app);

export { app, auth };
