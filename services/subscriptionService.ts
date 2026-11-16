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
  private static initPromise: Promise<void> | null = null;

  // Геттер для проверки готовности SDK
  static get configured(): boolean {
    return this.isConfigured;
  }

  static initialize(): Promise<void> {
    if (!this.initPromise) this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private static async doInitialize(): Promise<void> {
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

  // Ties the RevenueCat customer to the signed-in Firebase account, so SDM Web
  // can find this Premium by the same uid. A new uid aliases the anonymous
  // customer; a uid already known (signed in on another phone) is switched to,
  // and this store account's purchases are synced onto it without any UI.
  // The local flag is only ever raised here: sign-in must not take away a
  // purchase made on this device. Sign-out doesn't log out for the same reason.
  static async linkAccount(uid: string): Promise<void> {
    await this.initialize();
    if (!this.isConfigured || !uid) return;
    try {
      if ((await Purchases.getAppUserID()) === uid) return;
      let { customerInfo } = await Purchases.logIn(uid);
      if (!customerInfo.entitlements.active['premium']) {
        await Purchases.syncPurchases();
        customerInfo = await Purchases.getCustomerInfo();
      }
      if (customerInfo.entitlements.active['premium']) {
        await AsyncStorage.setItem('premium_status', 'active');
      }
    } catch (e) {
      console.error('❌ [SubscriptionService] Account link failed:', e);
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