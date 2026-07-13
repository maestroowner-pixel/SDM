// Shared premium/subscription state. Single source of truth so that activating
// a license in the Paywall instantly updates every screen (CV constructor,
// document/sea-service limits, Settings).
//
// Premium is true when EITHER a valid Lemon Squeezy license is active OR the
// 14-day free trial is still running. The trial clock starts on first launch
// (stored per device); when it lapses the app falls back to the free tier
// unless a license has been activated.
import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStoredLicense, revalidateLicense } from '../utils/lemon';

const TRIAL_DAYS = 14;
const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;
const TRIAL_KEY = 'trial_start';

interface SubscriptionContextType {
  isPremium: boolean;
  subscriptionType: string;   // 'free' | 'trial' | premium type
  loading: boolean;
  isTrial: boolean;
  trialDaysLeft: number;      // 0 when not on trial / expired
  refreshStatus: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionType, setSubscriptionType] = useState('free');
  const [isTrial, setIsTrial] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshStatus = useCallback(async () => {
    try {
      setLoading(true);

      // Paid license (cached flag, then online re-validation if stored).
      let licenseActive = (await AsyncStorage.getItem('premium_status')) === 'active';
      const lic = await getStoredLicense();
      if (lic) licenseActive = await revalidateLicense();

      // Free 14-day trial — clock starts on first launch.
      let start = Number(await AsyncStorage.getItem(TRIAL_KEY));
      if (!start) {
        start = Date.now();
        await AsyncStorage.setItem(TRIAL_KEY, String(start));
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
  }, []);

  useEffect(() => { refreshStatus(); }, [refreshStatus]);

  return (
    <SubscriptionContext.Provider value={{ isPremium, subscriptionType, loading, isTrial, trialDaysLeft, refreshStatus }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextType => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
};
