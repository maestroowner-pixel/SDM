// src/hooks/useSubscription.ts
import { useState, useEffect } from 'react';
import { SubscriptionService } from '../services/subscriptionService';

export const useSubscription = () => {
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionType, setSubscriptionType] = useState<'monthly' | 'lifetime' | 'none'>('none');
  const [expirationDate, setExpirationDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkStatus = async () => {
    setLoading(true);
    try {
      await SubscriptionService.ensureInitialized();
      
      const [isActive, type, expires] = await Promise.all([
        SubscriptionService.checkSubscriptionStatus(),
        SubscriptionService.getSubscriptionType(),
        SubscriptionService.getExpirationDate(),
      ]);

      setIsPremium(isActive);
      setSubscriptionType(type);
      setExpirationDate(expires);
    } catch (error) {
      console.error('Error checking subscription status:', error);
      setIsPremium(false);
      setSubscriptionType('none');
      setExpirationDate(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  // +++ ДОБАВЛЕНА ФУНКЦИЯ REFRESH +++
  const refreshStatus = async () => {
    await checkStatus();
  };

  return {
    isPremium,
    subscriptionType,
    expirationDate,
    loading,
    refreshStatus, // +++ ЭКСПОРТИРУЕМ +++
  };
};
