// utils/mpcFallback.ts
//
// Подстраховка для Midnight Position Check.
//
// Основная авто-запись (tasks/midnightTask.ts) ночью может не сработать:
// при неподвижном телефоне на батарее Android уходит в Doze и перестаёт
// отдавать обновления локации, а iOS усыпляет приложение. Чтобы пользователь
// в любом случае не пропустил полночную отметку, планируем ежедневное
// локальное уведомление около 00:00 по Лондону — его система показывает даже
// в Doze. Плюс на Android помогаем снять оптимизацию батареи.

import * as Notifications from 'expo-notifications';
import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { t } from './i18n';

const MPC_FALLBACK_ID_KEY = 'mpc_fallback_notif_id';
export const MPC_CHANNEL = 'mpc-midnight';

// Флаг «открыть MPC и сразу снять GPS»: ставится при тапе по полночному пушу,
// читается и сбрасывается экраном MPCScreen при монтировании.
export const MPC_AUTOSTART_KEY = 'mpc_autostart_gps';

/** Пометить, что по тапу на уведомление нужно открыть форму и подтянуть GPS. */
export async function flagMpcAutoRecord(): Promise<void> {
  try { await AsyncStorage.setItem(MPC_AUTOSTART_KEY, 'true'); } catch {}
}

// Локальное время устройства (часы/минуты), соответствующее 00:00 по Лондону.
// DAILY-триггер expo-notifications срабатывает по локальному времени девайса,
// поэтому переводим лондонскую полночь в локальные HH:MM. Пересчитывается при
// каждом перепланировании, что автоматически учитывает BST/GMT и смену TZ.
function londonMidnightLocalHM(): { hour: number; minute: number } {
  const now = new Date();
  const londonStr = now.toLocaleTimeString('en-GB', {
    timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false,
  }); // "HH:MM"
  const [lh, lm] = londonStr.split(':').map(Number);
  const londonMin = lh * 60 + lm;
  const deviceMin = now.getHours() * 60 + now.getMinutes();
  // Локальная минута суток устройства в момент, когда в Лондоне 00:00
  const target = (((deviceMin - londonMin) % 1440) + 1440) % 1440;
  return { hour: Math.floor(target / 60), minute: target % 60 };
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(MPC_CHANNEL, {
    name: 'Midnight Position Reminder',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250],
    lightColor: '#007AFF',
  });
}

/** Отменить ранее запланированный fallback-пуш (если был). */
export async function cancelMidnightFallback(): Promise<void> {
  try {
    const id = await AsyncStorage.getItem(MPC_FALLBACK_ID_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
      await AsyncStorage.removeItem(MPC_FALLBACK_ID_KEY);
    }
  } catch (e) {
    console.warn('MPC fallback cancel failed:', e);
  }
}

/**
 * Запланировать (или перепланировать) ежедневный fallback-пуш на полночь
 * по Лондону. Безопасно вызывать повторно — старое расписание снимается.
 */
export async function scheduleMidnightFallback(): Promise<void> {
  try {
    await ensureChannel();
    await cancelMidnightFallback();
    const { hour, minute } = londonMidnightLocalHM();
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: t('mpc.fallbackTitle'),
        body: t('mpc.fallbackBody'),
        data: { mpc: true, fallback: true },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: Platform.OS === 'android' ? MPC_CHANNEL : undefined,
      },
    });
    await AsyncStorage.setItem(MPC_FALLBACK_ID_KEY, id);
  } catch (e) {
    console.warn('MPC fallback schedule failed:', e);
  }
}

/**
 * Открыть системный экран оптимизации батареи (только Android), чтобы
 * пользователь снял ограничения для приложения — иначе Doze глушит ночную
 * авто-запись. На iOS — нет аналога, вызов игнорируется.
 */
export async function openBatteryOptimizationSettings(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS');
  } catch {
    try { await Linking.openSettings(); } catch {}
  }
}
