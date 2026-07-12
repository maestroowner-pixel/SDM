// Firebase (web) initialization for SDM Web auth + Firestore sync. Config comes
// from EXPO_PUBLIC_* env vars (see .env). If not configured, `auth`/`db` are null
// and the app skips auth + sync so development can continue.
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig as any);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.error('Firebase init failed:', e);
    auth = null;
    db = null;
  }
}

export { auth, db };
