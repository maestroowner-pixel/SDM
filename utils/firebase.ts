// Firebase for the mobile app: email auth + Firestore record sync, sharing the
// same project/account as SDM Web so one email links both devices.
//
// Sign-in is OPTIONAL here — the app works fully offline/local as before; signing
// in just turns on sync. These are public Firebase web-config values (they ship in
// the client by design), so they live in code rather than the .env files that the
// build scripts swap per variant.
import { initializeApp, getApps, getApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import { initializeAuth, getAuth, type Auth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Only the React Native build of firebase/auth exports this (Metro resolves the
// "react-native" condition); the shipped types describe the browser build, so we
// read it off the module.
const getReactNativePersistence = (firebaseAuth as any).getReactNativePersistence as
  (storage: unknown) => unknown;

const firebaseConfig = {
  apiKey: 'AIzaSyALguOA9lj2cS8a5ivVUfYvkNgLjdTagEY',
  authDomain: 'seafarer-document-manager.firebaseapp.com',
  projectId: 'seafarer-document-manager',
  storageBucket: 'seafarer-document-manager.firebasestorage.app',
  messagingSenderId: '734733617837',
  appId: '1:734733617837:web:22463df20b8b451d811424',
};

let auth: Auth | null = null;
let db: Firestore | null = null;

try {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  // Persist the session in AsyncStorage so the user stays signed in.
  try {
    auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) as any });
  } catch {
    // Already initialized (e.g. Fast Refresh) → reuse.
    auth = getAuth(app);
  }

  // RN's networking doesn't do streaming well; long-polling is the reliable path.
  try {
    db = initializeFirestore(app, { experimentalForceLongPolling: true });
  } catch {
    db = getFirestore(app);
  }
} catch (e) {
  console.error('Firebase init failed:', e);
  auth = null;
  db = null;
}

export const isFirebaseConfigured = !!auth && !!db;
export { auth, db };
