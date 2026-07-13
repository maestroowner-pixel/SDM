// Shared premium/subscription state. Single source of truth so that activating
// a license in the Paywall instantly updates every screen (CV constructor,
// document/sea-service limits, Settings).
//
// Premium is true when EITHER a valid Lemon Squeezy license is active OR the
// 14-day free trial is still running.
//
// The subscription lives in the CLOUD (Firestore `subscriptions/{uid}`), not just
// in localStorage — otherwise clearing browser data or using another browser
// would hand out a brand-new 14-day trial every time. The cloud is authoritative
// for the trial start; the license is mirrored both ways, so a reinstall restores
// Premium without re-entering the key.
//
// Kept in its own document (not `users/{uid}`) because SyncContext overwrites that
// one wholesale on every record push.
import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from './AuthContext';
import {
  getStoredLicense, setStoredLicense, revalidateLicense, deactivateLicense,
  type StoredLicense,
} from '../utils/lemon';

const TRIAL_DAYS = 14;
const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;
const TRIAL_KEY = 'trial_start';

interface CloudSubscription {
  trialStart?: number;
  license?: StoredLicense | null;
}

interface SubscriptionContextType {
  isPremium: boolean;
  subscriptionType: string;   // 'free' | 'trial' | premium type
  loading: boolean;
  isTrial: boolean;
  trialDaysLeft: number;      // 0 when not on trial / expired
  refreshStatus: () => Promise<void>;
  /** Deactivate the license on this device AND detach it from the account. */
  clearLicense: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const uid = user && user.emailVerified ? user.uid : null;

  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionType, setSubscriptionType] = useState('free');
  const [isTrial, setIsTrial] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshStatus = useCallback(async () => {
    try {
      setLoading(true);

      const cloudRef = db && uid ? doc(db, 'subscriptions', uid) : null;

      // ── Read the cloud record (authoritative for the trial clock) ──────────
      let cloud: CloudSubscription | null = null;
      if (cloudRef) {
        try {
          const snap = await getDoc(cloudRef);
          if (snap.exists()) cloud = snap.data() as CloudSubscription;
        } catch (e) {
          console.warn('subscription: cloud read failed, using local', e);
        }
      }

      // ── License: mirror between device and cloud ──────────────────────────
      let lic = await getStoredLicense();

      // Restored on a fresh install: adopt the license the account already owns.
      if (!lic && cloud?.license?.key) {
        await setStoredLicense(cloud.license);
        lic = cloud.license;
      }

      let licenseActive = (await AsyncStorage.getItem('premium_status')) === 'active';
      if (lic) licenseActive = await revalidateLicense();

      // Activated on this device but not yet known to the account → push it up.
      if (cloudRef && lic && licenseActive && !cloud?.license?.key) {
        try { await setDoc(cloudRef, { license: lic }, { merge: true }); } catch {}
      }

      // ── Trial: the cloud value wins, so a reinstall can't restart it ───────
      const localStart = Number(await AsyncStorage.getItem(TRIAL_KEY)) || 0;
      let start = cloud?.trialStart || localStart || Date.now();

      // Guard against a device clock/localStorage giving a *later* start than the
      // account already recorded — always keep the earliest known start.
      if (cloud?.trialStart && localStart && localStart < cloud.trialStart) {
        start = localStart;
      }

      await AsyncStorage.setItem(TRIAL_KEY, String(start));
      if (cloudRef && cloud?.trialStart !== start) {
        try { await setDoc(cloudRef, { trialStart: start }, { merge: true }); } catch {}
      }

      const remaining = start + TRIAL_MS - Date.now();
      const trialActive = remaining > 0;
      const daysLeft = trialActive ? Math.ceil(remaining / (24 * 60 * 60 * 1000)) : 0;

      const premium = licenseActive || trialActive;
      const type = licenseActive
        ? ((await AsyncStorage.getItem('premium_type')) || 'premium')
        : (trialActive ? 'trial' : 'free');

      setIsTrial(trialActive && !licenseActive);
      setTrialDaysLeft(daysLeft);
      setIsPremium(premium);
      setSubscriptionType(type);
    } catch (e) {
      console.log('Subscription error:', e);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  // Detach the license from BOTH the device and the account — otherwise the next
  // refresh would just re-adopt it from the cloud.
  const clearLicense = useCallback(async () => {
    await deactivateLicense();
    if (db && uid) {
      try {
        await setDoc(doc(db, 'subscriptions', uid), { license: null }, { merge: true });
      } catch (e) {
        console.warn('subscription: failed to clear cloud license', e);
      }
    }
    await refreshStatus();
  }, [uid, refreshStatus]);

  // Re-evaluate when the signed-in account changes (sign-in restores the account's
  // trial/license instead of starting a fresh one).
  useEffect(() => { refreshStatus(); }, [refreshStatus]);

  return (
    <SubscriptionContext.Provider value={{ isPremium, subscriptionType, loading, isTrial, trialDaysLeft, refreshStatus, clearLicense }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextType => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
};
