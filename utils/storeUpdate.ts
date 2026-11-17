// Store version check for the "new version available" reminder (components/UpdatePrompt).
// iOS: the public iTunes lookup API. Android: Google Play has no public API, so the
// version is read from the store page; if Google changes the markup the check
// just finds nothing and the reminder stays silent.
import { Platform } from 'react-native';
import * as Application from 'expo-application';

const BUNDLE_ID = 'seafarer.documents.manager';
const IOS_APP_ID = '6758860675';

export const STORE_URL = Platform.OS === 'ios'
  ? `itms-apps://apps.apple.com/app/id${IOS_APP_ID}`
  : `market://details?id=${BUNDLE_ID}`;
export const STORE_WEB_URL = Platform.OS === 'ios'
  ? `https://apps.apple.com/app/id${IOS_APP_ID}`
  : `https://play.google.com/store/apps/details?id=${BUNDLE_ID}`;

export const installedVersion = (): string => Application.nativeApplicationVersion || '0';

// Positive when a > b ("3.10.0" > "3.9.1").
export const compareVersions = (a: string, b: string): number => {
  const pa = a.split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
};

export const fetchStoreVersion = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'ios') {
      const res = await fetch(`https://itunes.apple.com/lookup?bundleId=${BUNDLE_ID}&t=${Date.now()}`);
      const json = await res.json();
      return json?.results?.[0]?.version ?? null;
    }
    if (Platform.OS === 'android') {
      const res = await fetch(`https://play.google.com/store/apps/details?id=${BUNDLE_ID}&hl=en`);
      const html = await res.text();
      return html.match(/\[\[\["(\d+(?:\.\d+)+)"\]\]/)?.[1] ?? null;
    }
  } catch (e) {
    console.log('store version check failed:', e);
  }
  return null;
};
