// src/hooks/useSubscription.ts
import { useEffect, useState } from 'react';
import Purchases, { CustomerInfo, PurchasesEntitlementInfo } from 'react-native-purchases';

export type SubscriptionType = 'free' | 'monthly' | 'lifetime';

interface UseSubscriptionReturn {
  isPremium: boolean;
  subscriptionType: SubscriptionType;
  loading: boolean;
  refresh: () => Promise<void>;
  productId: string; // Добавлено для отладки
}

export const useSubscription = (): UseSubscriptionReturn => {
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionType, setSubscriptionType] = useState<SubscriptionType>('free');
  const [loading, setLoading] = useState(true);
  const [productId, setProductId] = useState('');

  const determineSubscriptionType = (entitlement: PurchasesEntitlementInfo): SubscriptionType => {
    const productIdentifier = entitlement.productIdentifier.toLowerCase();
    const periodType = entitlement.periodType;
    const willRenew = entitlement.willRenew;

    console.log('🔍 Determining subscription type:');
    console.log('  Product ID:', productIdentifier);
    console.log('  Period Type:', periodType);
    console.log('  Will Renew:', willRenew);

    // 🎯 Метод 1: Проверка по названию продукта (самый надежный)
    if (
      productIdentifier.includes('lifetime') ||
      productIdentifier.includes('permanent') ||
      productIdentifier.includes('forever')
    ) {
      console.log('  ✅ Type: LIFETIME (by product ID)');
      return 'lifetime';
    }

    // 🎯 Метод 2: Проверка по типу периода
    if (periodType === 'NON_RENEWING') {
      console.log('  ✅ Type: LIFETIME (by period type)');
      return 'lifetime';
    }

    // 🎯 Метод 3: Проверка по willRenew (для non-subscription продуктов)
    if (willRenew === false && periodType !== 'NORMAL') {
      console.log('  ✅ Type: LIFETIME (by willRenew)');
      return 'lifetime';
    }

    // 🎯 Метод 4: Проверка названия продукта на monthly
    if (
      productIdentifier.includes('monthly') ||
      productIdentifier.includes('month')
    ) {
      console.log('  ✅ Type: MONTHLY (by product ID)');
      return 'monthly';
    }

    // 🎯 Метод 5: Если продукт обновляется - это monthly
    if (willRenew === true) {
      console.log('  ✅ Type: MONTHLY (by willRenew)');
      return 'monthly';
    }

    // 🎯 Fallback: Если не можем определить, но есть premium - считаем lifetime
    console.log('  ⚠️ Type: LIFETIME (fallback - could not determine)');
    return 'lifetime';
  };

  const checkSubscription = async () => {
    try {
      setLoading(true);
      const customerInfo: CustomerInfo = await Purchases.getCustomerInfo();

      console.log('=== SUBSCRIPTION CHECK ===');
      console.log('Active Entitlements:', Object.keys(customerInfo.entitlements.active));
      console.log('Active Subscriptions:', customerInfo.activeSubscriptions);

      // Получаем premium entitlement (замените 'premium' на ваш entitlement ID)
      const premiumEntitlement = customerInfo.entitlements.active['premium'];

      if (premiumEntitlement && premiumEntitlement.isActive) {
        console.log('✅ Premium is ACTIVE');
        setIsPremium(true);
        setProductId(premiumEntitlement.productIdentifier);

        const type = determineSubscriptionType(premiumEntitlement);
        setSubscriptionType(type);

        console.log('📊 Final Status:');
        console.log('  - isPremium:', true);
        console.log('  - subscriptionType:', type);
        console.log('  - productId:', premiumEntitlement.productIdentifier);
      } else {
        console.log('❌ Premium is NOT ACTIVE');
        setIsPremium(false);
        setSubscriptionType('free');
        setProductId('');
      }

      console.log('==========================');
    } catch (error) {
      console.error('❌ Error checking subscription:', error);
      setIsPremium(false);
      setSubscriptionType('free');
      setProductId('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Первоначальная проверка
    checkSubscription();

    // Слушаем обновления подписок
    const customerInfoUpdateListener = (info: CustomerInfo) => {
      console.log('🔄 Customer info updated, rechecking subscription...');
      checkSubscription();
    };

    Purchases.addCustomerInfoUpdateListener(customerInfoUpdateListener);

    // Cleanup
    return () => {
      // В некоторых версиях react-native-purchases нет removeListener
      // Проверьте документацию для вашей версии
    };
  }, []);

  const refresh = async () => {
    console.log('🔄 Manual subscription refresh triggered');
    await checkSubscription();
  };

  return { 
    isPremium, 
    subscriptionType, 
    loading, 
    refresh,
    productId, // Полезно для отладки
  };
};