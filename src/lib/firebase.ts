// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {"projectId":"chronoflow-ewvuy","appId":"1:438652018804:web:1ead458ac9e6190455f121","storageBucket":"chronoflow-ewvuy.firebasestorage.app","apiKey":"AIzaSyBG7mK5_oDdB6qYy6wPkw6g6Aj6WbzAVmU","authDomain":"chronoflow-ewvuy.firebaseapp.com","measurementId":"","messagingSenderId":"438652018804"};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
}

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
