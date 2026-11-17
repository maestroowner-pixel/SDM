// "New version available" reminder: on launch, compares the installed version with
// the one in the App Store / Google Play and offers to open the store page.
// Asks at most once a day; production builds only (dev/preview ids are skipped).
import { useEffect } from 'react';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { chooseAsync } from '../utils/dialog';
import { t } from '../utils/i18n';
import { STORE_URL, STORE_WEB_URL, compareVersions, fetchStoreVersion, installedVersion } from '../utils/storeUpdate';

const LAST_ASKED_KEY = 'update_prompt_last';
const DAY_MS = 24 * 60 * 60 * 1000;

export const UpdatePrompt: React.FC = () => {
  useEffect(() => {
    if (__DEV__ || Application.applicationId !== 'seafarer.documents.manager') return;
    // Give the first screen time to settle before any network or dialog.
    const timer = setTimeout(async () => {
      const last = Number(await AsyncStorage.getItem(LAST_ASKED_KEY)) || 0;
      if (Date.now() - last < DAY_MS) return;
      const latest = await fetchStoreVersion();
      if (!latest || compareVersions(latest, installedVersion()) <= 0) return;

      await AsyncStorage.setItem(LAST_ASKED_KEY, String(Date.now()));
      const choice = await chooseAsync(
        t('update.title'),
        t('update.message', { version: latest }),
        [
          { text: t('update.later'), value: 'later', style: 'ghost' },
          { text: t('update.update'), value: 'update', style: 'primary' },
        ]
      );
      if (choice === 'update') {
        Linking.openURL(STORE_URL).catch(() => Linking.openURL(STORE_WEB_URL).catch(() => {}));
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return null;
};
