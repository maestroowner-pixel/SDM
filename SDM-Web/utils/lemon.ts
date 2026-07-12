// Lemon Squeezy client-only licensing for SDM Web premium.
// Flow: user buys via the hosted checkout (opens in a new tab), receives a
// license key by email, pastes it here → we activate/validate it against Lemon
// Squeezy's public License API (no server, no secret key needed) and cache
// premium locally, scoped to the signed-in account.
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = 'https://api.lemonsqueezy.com/v1';

// Base checkout URL for the premium product (from Lemon Squeezy → Product →
// Share). Set in .env as EXPO_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL.
export const CHECKOUT_URL = process.env.EXPO_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL || '';
export const isLemonConfigured = !!CHECKOUT_URL;

const LICENSE_KEY = 'sdm_license'; // { key, instanceId, email }
const PREMIUM_KEY = 'premium_status';

export interface StoredLicense { key: string; instanceId: string; email?: string; }

const post = async (path: string, body: Record<string, string>) => {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(body).toString(),
  });
  return res.json();
};

export const getStoredLicense = async (): Promise<StoredLicense | null> => {
  try {
    const raw = await AsyncStorage.getItem(LICENSE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const setPremium = (active: boolean) => AsyncStorage.setItem(PREMIUM_KEY, active ? 'active' : 'inactive');

// Build a checkout URL, optionally prefilling the buyer's email + tagging the
// account so a purchase can be traced back.
export const buildCheckoutUrl = (email?: string): string => {
  if (!CHECKOUT_URL) return '';
  const sep = CHECKOUT_URL.includes('?') ? '&' : '?';
  const params = new URLSearchParams();
  if (email) {
    params.set('checkout[email]', email);
    params.set('checkout[custom][account]', email);
  }
  const q = params.toString();
  return q ? `${CHECKOUT_URL}${sep}${q}` : CHECKOUT_URL;
};

// Activate a freshly purchased license key on this device.
export const activateLicense = async (key: string, email?: string): Promise<{ ok: boolean; message?: string }> => {
  const licenseKey = key.trim();
  if (!licenseKey) return { ok: false, message: 'Please enter your license key.' };
  try {
    const data = await post('/licenses/activate', {
      license_key: licenseKey,
      instance_name: `SDM Web${email ? ` (${email})` : ''}`,
    });
    if (data?.activated && data?.instance?.id) {
      const stored: StoredLicense = { key: licenseKey, instanceId: data.instance.id, email };
      await AsyncStorage.setItem(LICENSE_KEY, JSON.stringify(stored));
      await setPremium(true);
      return { ok: true };
    }
    // Already activated on max instances but the key itself may be valid → validate.
    if (data?.license_key?.status === 'active' || data?.error?.includes('activation limit')) {
      const v = await validateStoredOrKey(licenseKey);
      if (v) { await setPremium(true); return { ok: true }; }
    }
    return { ok: false, message: data?.error || 'This license key could not be activated.' };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'Network error during activation.' };
  }
};

const validateStoredOrKey = async (key: string, instanceId?: string): Promise<boolean> => {
  try {
    const data = await post('/licenses/validate', instanceId ? { license_key: key, instance_id: instanceId } : { license_key: key });
    return !!data?.valid && (data?.license_key?.status === 'active' || data?.license_key?.status === undefined);
  } catch { return false; }
};

// Re-check the stored license (called on launch). Updates premium_status.
export const revalidateLicense = async (): Promise<boolean> => {
  const lic = await getStoredLicense();
  if (!lic) return false;
  const ok = await validateStoredOrKey(lic.key, lic.instanceId);
  await setPremium(ok);
  return ok;
};

// Remove premium on this device (deactivates the instance so the seat frees up).
export const deactivateLicense = async (): Promise<void> => {
  const lic = await getStoredLicense();
  try {
    if (lic) await post('/licenses/deactivate', { license_key: lic.key, instance_id: lic.instanceId });
  } catch {}
  await AsyncStorage.removeItem(LICENSE_KEY);
  await setPremium(false);
};
