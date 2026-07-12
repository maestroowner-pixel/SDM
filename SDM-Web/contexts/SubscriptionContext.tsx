// Shared premium/subscription state. Single source of truth so that activating
// a license in the Paywall instantly updates every screen (CV trial banner,
// Documents limit, Settings) — previously each screen used its own hook copy and
// a refresh in one didn't propagate.
import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStoredLicense, revalidateLicense } from '../utils/lemon';

interface SubscriptionContextType {
  isPremium: boolean;
  subscriptionType: string;
  loading: boolean;
  refreshStatus: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionType, setSubscriptionType] = useState('free');
  const [loading, setLoading] = useState(true);

  const refreshStatus = useCallback(async () => {
    try {
      setLoading(true);
      // Fast path: cached flag.
      const status = await AsyncStorage.getItem('premium_status');
      let active = status === 'active';
      setIsPremium(active);

      // Slow path: re-validate a stored license online and reconcile.
      const lic = await getStoredLicense();
      if (lic) {
        active = await revalidateLicense();
        setIsPremium(active);
      }

      const type = (await AsyncStorage.getItem('premium_type')) || 'free';
      setSubscriptionType(active ? type : 'free');
    } catch (e) {
      console.log('Subscription error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshStatus(); }, [refreshStatus]);

  return (
    <SubscriptionContext.Provider value={{ isPremium, subscriptionType, loading, refreshStatus }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextType => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
};
