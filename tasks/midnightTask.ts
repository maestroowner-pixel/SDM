// tasks/midnightTask.ts
//
// ВАЖНО: этот файл должен быть импортирован в корневой index.js
// ДО registerRootComponent, чтобы iOS мог найти defineTask
// при background execution в отдельном JS контексте.
//
// В index.js:
//   import './tasks/midnightTask';
//   import { registerRootComponent } from 'expo';
//   ...

import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isInsideTerritorialWaters } from '../utils/geoUtils';

const UK_ZONE = require('../data/uk_12nm_zone.json');

// Location-based задача (основная, работает на Android)
export const MPC_LOCATION_TASK = 'MPC_LOCATION_TASK';

// BackgroundFetch задача (резерв для iOS — будит по таймеру независимо от движения)
export const MPC_FETCH_TASK = 'MPC_MIDNIGHT_CHECK';

// Старое имя — нужно только для миграции (снятия старой регистрации)
export const MPC_BACKGROUND_TASK = 'MPC_MIDNIGHT_FETCH';

const MPC_RECORDS_KEY = 'mpc_records';

// ─── Время ───────────────────────────────────────────────────────────────────

function getLondonParts(date: Date): { hour: number; minute: number; dateStr: string } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value || '0');
  const y  = parts.find(p => p.type === 'year')?.value;
  const mo = parts.find(p => p.type === 'month')?.value;
  const d  = parts.find(p => p.type === 'day')?.value;
  return { hour: get('hour'), minute: get('minute'), dateStr: `${y}-${mo}-${d}` };
}

function getMidnightDateStr(now: Date): string {
  const { hour, dateStr } = getLondonParts(now);
  if (hour === 23) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getLondonParts(tomorrow).dateStr;
  }
  return dateStr;
}

// ─── Storage ─────────────────────────────────────────────────────────────────

async function alreadyHasRecord(dateStr: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(MPC_RECORDS_KEY);
    const records: any[] = raw ? JSON.parse(raw) : [];
    return records.some(r => r.date === dateStr);
  } catch { return false; }
}

async function saveRecord(record: {
  id: string; date: string; lat: string; lon: string;
  status: 'OUTSIDE' | 'INSIDE'; note?: string;
}): Promise<void> {
  const raw = await AsyncStorage.getItem(MPC_RECORDS_KEY);
  const records: any[] = raw ? JSON.parse(raw) : [];
  records.push(record);
  records.sort((a, b) => a.date.localeCompare(b.date));
  await AsyncStorage.setItem(MPC_RECORDS_KEY, JSON.stringify(records));
}

// ─── Уведомление ─────────────────────────────────────────────────────────────

async function sendPush(
  dateStr: string, lat: string, lon: string,
  status: 'OUTSIDE' | 'INSIDE' | 'GPS_UNAVAILABLE'
): Promise<void> {
  const emoji = status === 'OUTSIDE' ? '🟢' : status === 'INSIDE' ? '🔴' : '⚠️';
  const body = status === 'GPS_UNAVAILABLE'
    ? 'Position not available — saved without coordinates'
    : `${lat} / ${lon}  ${emoji} ${status}`;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `⚓ MPC saved — ${dateStr}`,
      body,
      interruptionLevel: 'passive' as any,
      sound: undefined,
      badge: 0,
      data: { mpc: true, dateStr, lat, lon, status },
    },
    trigger: null,
  });
}

// ─── Запись по координатам ────────────────────────────────────────────────────

async function recordFromCoords(dateStr: string, lat: number, lon: number): Promise<void> {
  const inside = isInsideTerritorialWaters(lat, lon, UK_ZONE);
  const status: 'OUTSIDE' | 'INSIDE' = inside ? 'INSIDE' : 'OUTSIDE';
  const latStr = `${Math.abs(lat).toFixed(4)} ${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${String(Math.abs(lon).toFixed(4)).padStart(8, '0')} ${lon >= 0 ? 'E' : 'W'}`;
  await saveRecord({ id: dateStr, date: dateStr, lat: latStr, lon: lonStr, status, note: 'Auto (midnight)' });
  await sendPush(dateStr, latStr, lonStr, status);
}

// ─── Location task (Android + iOS при движении) ───────────────────────────────

TaskManager.defineTask(MPC_LOCATION_TASK, async ({ data, error }: any) => {
  if (error) {
    console.warn('MPC location task error:', error.message);
    return;
  }

  try {
    const now = new Date();
    const { hour, minute } = getLondonParts(now);

    // Полуночное окно 23:50–00:10 по Лондону (20 мин — запас под батч до 4 мин)
    if (!((hour === 23 && minute >= 50) || (hour === 0 && minute <= 10))) return;

    const dateStr = getMidnightDateStr(now);
    if (await alreadyHasRecord(dateStr)) return;

    const locations: any[] = data?.locations ?? [];
    if (locations.length > 0) {
      const { latitude, longitude } = locations[locations.length - 1].coords;
      await recordFromCoords(dateStr, latitude, longitude);
    } else {
      await saveRecord({ id: dateStr, date: dateStr, lat: '', lon: '', status: 'OUTSIDE', note: 'Auto (GPS unavailable)' });
      await sendPush(dateStr, '', '', 'GPS_UNAVAILABLE');
    }
  } catch (e) {
    console.warn('MPC location task error:', e);
  }
});

// ─── BackgroundFetch task (iOS резерв — срабатывает ~каждые 15 мин) ───────────
//
// iOS будит приложение по таймеру BackgroundFetch независимо от движения.
// Читаем getLastKnownPositionAsync — кэш ОС, без нового GPS-захвата.

TaskManager.defineTask(MPC_FETCH_TASK, async () => {
  try {
    const now = new Date();
    const { hour, minute } = getLondonParts(now);

    // Широкое окно 23:45–00:15: BackgroundFetch может опоздать на ~15 мин
    if (!((hour === 23 && minute >= 45) || (hour === 0 && minute <= 15))) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const dateStr = getMidnightDateStr(now);
    if (await alreadyHasRecord(dateStr)) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const pos = await Location.getLastKnownPositionAsync({ maxAge: 60 * 60 * 1000 }); // кэш до 1 часа
    if (pos) {
      await recordFromCoords(dateStr, pos.coords.latitude, pos.coords.longitude);
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }

    // Координат нет — всё равно сохраняем запись чтобы не пропустить дату
    await saveRecord({ id: dateStr, date: dateStr, lat: '', lon: '', status: 'OUTSIDE', note: 'Auto (GPS unavailable)' });
    await sendPush(dateStr, '', '', 'GPS_UNAVAILABLE');
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (e) {
    console.warn('MPC fetch task error:', e);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});
