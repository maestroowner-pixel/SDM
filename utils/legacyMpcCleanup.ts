// utils/legacyMpcCleanup.ts
//
// Модуль MPC (UK 12nm Midnight Position Check) удалён в 3.1.9 (301093+).
// У тех, кто включал авто-запись, в системе остался ежедневный пуш около
// полуночи и Android-канал для него — снимаем их при первом запуске новой версии.
// Записи MPC в AsyncStorage не трогаем.

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const DONE_KEY = 'mpc_removed_cleanup_done';

export async function cleanupRemovedMpc(): Promise<void> {
  try {
    if (await AsyncStorage.getItem(DONE_KEY)) return;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if ((n.content.data as any)?.mpc) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
    if (Platform.OS === 'android') {
      await Notifications.deleteNotificationChannelAsync('mpc-midnight').catch(() => {});
    }
    await AsyncStorage.multiRemove(['mpc_fallback_notif_id', 'mpc_autostart_gps']);
    await AsyncStorage.setItem(DONE_KEY, 'true');
  } catch (e) {
    console.warn('MPC cleanup failed:', e);
  }
}
