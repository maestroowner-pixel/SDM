// src/services/subscriptionService.ts
import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const KEYS = {
  android: {
    production: 'goog_iSPWvwbLtHmLMoNZLONpAnOiFDu',
    testing: 'goog_iSPWvwbLtHmLMoNZLONpAnOiFDu',
  },
  ios: {
    // ⚠️ ЗАМЕНИТЕ на ваши реальные ключи из RevenueCat Dashboard
    production: 'appl_woARHbOUzGjwIOINzKphLzybgOn',
    testing: 'appl_woARHbOUzGjwIOINzKphLzybgOn',
  }
};

export class SubscriptionService {
  private static initialized = false;
  private static isConfigured = false;

  // Геттер для проверки готовности SDK
  static get configured(): boolean {
    return this.isConfigured;
  }

  static async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Dev mode - пропускаем
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log('⚠️ [SubscriptionService] Dev mode. Native bypassed.');
        this.initialized = true;
        return;
      }

      // Определяем режим и платформу
      const appMode = Constants.expoConfig?.extra?.appMode || 'testing';
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      
      // Получаем нужный API ключ
      const apiKey = appMode === 'production' 
        ? KEYS[platform].production 
        : KEYS[platform].testing;

      if (!apiKey || apiKey.includes('YOUR_')) {
        console.warn('⚠️ [SubscriptionService] API key not configured for', platform);
        this.initialized = true;
        return;
      }

      // Конфигурируем RevenueCat
      await Purchases.configure({ apiKey });
      this.isConfigured = true;
      
      console.log(`✅ [SubscriptionService] Configured for ${platform} (${appMode})`);
    } catch (e) {
      console.error('❌ [SubscriptionService] Configuration failed:', e);
    } finally {
      this.initialized = true;
    }
  }

  // Получение доступных пакетов подписок
  static async getOfferings() {
    if (!this.isConfigured) {
      console.warn('⚠️ [SubscriptionService] Not configured. Call initialize() first.');
      return null;
    }

    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current ? offerings.current.availablePackages : [];
    } catch (e) {
      console.error('❌ [SubscriptionService] Error fetching offerings:', e);
      return [];
    }
  }

  // Покупка подписки
  static async purchasePackage(packageToPurchase: any) {
    if (!this.isConfigured) {
      throw new Error('SubscriptionService not configured');
    }

    try {
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      
      // Сохраняем статус локально
      if (customerInfo.entitlements.active['premium']) {
        await AsyncStorage.setItem('premium_status', 'active');
      }
      
      return customerInfo;
    } catch (e: any) {
      if (!e.userCancelled) {
        console.error('❌ [SubscriptionService] Purchase error:', e);
      }
      throw e;
    }
  }

  // Восстановление покупок
  static async restorePurchases() {
    if (!this.isConfigured) {
      throw new Error('SubscriptionService not configured');
    }

    try {
      const customerInfo = await Purchases.restorePurchases();
      
      // Обновляем локальный статус
      if (customerInfo.entitlements.active['premium']) {
        await AsyncStorage.setItem('premium_status', 'active');
      } else {
        await AsyncStorage.setItem('premium_status', 'inactive');
      }
      
      return customerInfo;
    } catch (e) {
      console.error('❌ [SubscriptionService] Restore error:', e);
      throw e;
    }
  }

  // Проверка premium статуса
  static async getIsPremiumSafe(): Promise<boolean> {
    // Быстрая проверка из кеша
    const localStatus = await AsyncStorage.getItem('premium_status');
    if (localStatus === 'active') return true;
    
    // Если не сконфигурировано - возвращаем false
    if (!this.isConfigured) return false;

    // Проверяем на сервере
    try {
      const info = await Purchases.getCustomerInfo();
      const isPremium = typeof info.entitlements.active['premium'] !== 'undefined';
      
      // Обновляем кеш
      await AsyncStorage.setItem('premium_status', isPremium ? 'active' : 'inactive');
      
      return isPremium;
    } catch (e) {
      console.error('❌ [SubscriptionService] Error checking premium status:', e);
      return false;
    }
  }

  // Получение информации о подписке
  static async getSubscriptionInfo() {
    if (!this.isConfigured) return null;

    try {
      const info = await Purchases.getCustomerInfo();
      const premium = info.entitlements.active['premium'];
      
      if (premium) {
        return {
          isActive: true,
          expiresDate: premium.expirationDate,
          productIdentifier: premium.productIdentifier,
          willRenew: premium.willRenew,
        };
      }
      
      return { isActive: false };
    } catch (e) {
      console.error('❌ [SubscriptionService] Error getting subscription info:', e);
      return null;
    }
  }
}