// Premium bought in the mobile app (Google Play / App Store via RevenueCat).
// The app identifies its RevenueCat customer by the Firebase uid after sign-in
// (Purchases.logIn), so the web can look up the same customer. Entitlements in
// RevenueCat are shared across the project's platforms, so the Android public
// SDK key sees App Store purchases too. GET /subscribers is the call the SDKs
// make themselves; it needs no secret key and the API allows browser origins.
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = 'https://api.revenuecat.com/v1';
const PUBLIC_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || '';
const ENTITLEMENT = 'premium';

// Last answer per account, for when RevenueCat can't be reached.
const cacheKey = (uid: string) => `rc_premium_${uid}`;

export const isRevenueCatConfigured = !!PUBLIC_KEY;

const isActive = (ent: any): boolean => {
  if (!ent) return false;
  // Lifetime purchases have no expiry date.
  if (!ent.expires_date) return true;
  return new Date(ent.expires_date).getTime() > Date.now();
};

/** True when the account owns the mobile Premium entitlement. */
export const hasMobilePremium = async (uid: string): Promise<boolean> => {
  if (!PUBLIC_KEY || !uid) return false;
  try {
    const res = await fetch(`${API}/subscribers/${encodeURIComponent(uid)}`, {
      headers: { Authorization: `Bearer ${PUBLIC_KEY}`, 'X-Platform': 'android', Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`RevenueCat ${res.status}`);
    const data = await res.json();
    const active = isActive(data?.subscriber?.entitlements?.[ENTITLEMENT]);
    await AsyncStorage.setItem(cacheKey(uid), active ? 'active' : 'inactive');
    return active;
  } catch (e) {
    console.warn('revenuecat: lookup failed, using cached status', e);
    return (await AsyncStorage.getItem(cacheKey(uid))) === 'active';
  }
};
