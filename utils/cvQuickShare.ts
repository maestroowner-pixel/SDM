// utils/cvQuickShare.ts
//
// Быстрая отправка CV (Premium): долгое нажатие на иконку → «Send CV» или
// ссылка seafarer-docs://cv/send (её же будет открывать виджет).
// Точка входа ставит флаг и переключает вкладку на CV,
// CVScreen при монтировании читает флаг, собирает PDF и открывает «Поделиться».

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as QuickActions from 'expo-quick-actions';
import { t } from './i18n';

export const CV_QUICKSHARE_KEY = 'cv_quickshare';
// Последний выбранный дизайн CV — чтобы быстрая отправка шла в нём, а не в Classic.
export const CV_DESIGN_KEY = 'cv_design';

export const CV_QUICK_ACTION_ID = 'cv-send';
export const CV_SEND_PATH = 'cv/send';

/** Пометить, что CVScreen должен сразу отправить CV. */
export async function flagCvQuickShare(): Promise<void> {
  try { await AsyncStorage.setItem(CV_QUICKSHARE_KEY, 'true'); } catch {}
}

/** Прочитать и сбросить флаг. */
export async function consumeCvQuickShare(): Promise<boolean> {
  try {
    const flag = await AsyncStorage.getItem(CV_QUICKSHARE_KEY);
    if (flag !== 'true') return false;
    await AsyncStorage.removeItem(CV_QUICKSHARE_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Ссылка вида seafarer-docs://cv/send (с любым префиксом схемы/хоста). */
export function isCvSendUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.replace(/^[a-z][\w.+-]*:\/\//i, '').replace(/^\/+/, '').startsWith(CV_SEND_PATH);
}

/** Пункт «Send CV» в меню иконки — только для Premium. */
export async function syncCvQuickAction(isPremium: boolean): Promise<void> {
  try {
    await QuickActions.setItems(isPremium ? [{
      id: CV_QUICK_ACTION_ID,
      title: t('cv.quickShare'),
      icon: 'symbol:paperplane',
    }] : []);
  } catch {}
}
