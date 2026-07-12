// Firebase (web) initialization for SDM Web auth. Config comes from EXPO_PUBLIC_*
// env vars (see .env). If not configured, `auth` is null and the app skips the
// auth gate so development can continue before the Firebase project exists.
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

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

if (isFirebaseConfigured) {
  try {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig as any);
    auth = getAuth(app);
  } catch (e) {
    console.error('Firebase init failed:', e);
    auth = null;
  }
}

export { auth };
