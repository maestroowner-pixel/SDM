// src/config/purchases.ts
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

// 🔑 ВСТАВЬТЕ ВАШИ API КЛЮЧИ ЗДЕСЬ
const REVENUECAT_API_KEYS = {
  ios: 'appl_XXXXXXXXXXXXXXXXXXXXXXXX',      // ← Ваш iOS Public SDK Key
  android: 'goog_iSPWvwbLtHmLMoNZLONpAnOiFDu',  // ← Ваш Android Public SDK Key
};

export const ENTITLEMENT_ID = 'premium'; // ← Должен совпадать с Revenue Cat Dashboard

export const initializePurchases = async () => {
  try {
    console.log('🚀 Initializing Revenue Cat...');
    
    // Выбираем API ключ в зависимости от платформы
    const apiKey = Platform.OS === 'ios' 
      ? REVENUECAT_API_KEYS.ios 
      : REVENUECAT_API_KEYS.android;

    if (!apiKey || apiKey.includes('XXXX')) {
      console.error('❌ Revenue Cat API key not configured!');
      return;
    }

    // Настройка Revenue Cat
    await Purchases.configure({ apiKey });

    // Включить debug режим (отключите в production)
    if (__DEV__) {
      Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    }

    console.log('✅ Revenue Cat initialized successfully');
    console.log(`   Platform: ${Platform.OS}`);
    console.log(`   API Key: ${apiKey.substring(0, 10)}...`);

    // Проверка статуса подписки
    const customerInfo = await Purchases.getCustomerInfo();
    console.log('👤 Customer ID:', customerInfo.originalAppUserId);
    console.log('📦 Active Entitlements:', Object.keys(customerInfo.entitlements.active));

  } catch (error) {
    console.error('❌ Revenue Cat initialization failed:', error);
  }
};