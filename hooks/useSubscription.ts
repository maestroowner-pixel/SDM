// src/hooks/useSubscription.ts
import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SubscriptionService } from '../services/subscriptionService';

export const useSubscription = () => {
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionType, setSubscriptionType] = useState('free');
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    try {
      setLoading(true);
      
      // Используем наш безопасный метод из сервиса
      const active = await SubscriptionService.getIsPremiumSafe();
      
      // Читаем тип для TestingScreen
      const type = await AsyncStorage.getItem('premium_type') || 'free';
      
      setIsPremium(active);
      setSubscriptionType(active ? type : 'free');
    } catch (e) {
      console.log('❌ Subscription hook error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return { 
    isPremium, 
    subscriptionType, 
    loading, 
    refreshStatus: checkStatus // Переименовали refresh в refreshStatus для TestingScreen
  };
};