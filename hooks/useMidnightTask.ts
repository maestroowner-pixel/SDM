// hooks/useMidnightTask.ts
//
// Хук для регистрации/остановки фоновой location-задачи.
// defineTask вынесен в tasks/midnightTask.ts и импортируется из index.js.

import { useEffect, useState } from 'react';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

export { MPC_LOCATION_TASK } from '../tasks/midnightTask';
import { MPC_LOCATION_TASK, MPC_FETCH_TASK, MPC_BACKGROUND_TASK } from '../tasks/midnightTask';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isMPC = notification.request.content.data?.mpc === true;
    return {
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      priority: isMPC
        ? Notifications.AndroidNotificationPriority.LOW
        : Notifications.AndroidNotificationPriority.DEFAULT,
    };
  },
});

export function useMidnightTask() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      const registered = await TaskManager.isTaskRegisteredAsync(MPC_LOCATION_TASK);
      setEnabled(registered);
    })();
  }, []);

  const isRunning = async (): Promise<boolean> =>
    TaskManager.isTaskRegisteredAsync(MPC_LOCATION_TASK);

  const requestAndStart = async (): Promise<boolean> => {
    try {
      await Notifications.requestPermissionsAsync();

      const { status: fg } = await Location.requestForegroundPermissionsAsync();
      if (fg !== 'granted') return false;

      // Background location — обязательно для работы задачи ночью
      const { status: bg } = await Location.requestBackgroundPermissionsAsync();
      if (bg !== 'granted') return false;

      // Миграция: снимаем старую BackgroundFetch регистрацию если осталась
      const oldRegistered = await TaskManager.isTaskRegisteredAsync(MPC_BACKGROUND_TASK);
      if (oldRegistered) {
        try { await BackgroundFetch.unregisterTaskAsync(MPC_BACKGROUND_TASK); } catch {}
      }

      // Всегда вызываем startLocationUpdatesAsync — обновляет конфиг даже для уже запущенной задачи
      await Location.startLocationUpdatesAsync(MPC_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,  // cell+wifi+GPS — надёжнее при стоящем судне
        distanceInterval: 0,
        timeInterval: 4 * 60 * 1000,           // Android: минимум раз в 4 мин
        deferredUpdatesInterval: 4 * 60 * 1000, // iOS: батч раз в 4 мин
        deferredUpdatesDistance: 0,
        showsBackgroundLocationIndicator: false,
        pausesUpdatesAutomatically: false,
        // Android foreground service (обязателен для Android 8+)
        foregroundService: {
          notificationTitle: 'MPC Auto-record active',
          notificationBody: 'Midnight position will be recorded automatically',
          notificationColor: '#007AFF',
        },
      });

      // iOS резерв: BackgroundFetch будит приложение ~каждые 15 мин независимо от движения
      await BackgroundFetch.registerTaskAsync(MPC_FETCH_TASK, {
        minimumInterval: 15 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      });

      setEnabled(true);
      return true;
    } catch (e) {
      console.warn('MPC: failed to start:', e);
      return false;
    }
  };

  const stop = async (): Promise<void> => {
    try {
      const registered = await TaskManager.isTaskRegisteredAsync(MPC_LOCATION_TASK);
      if (registered) await Location.stopLocationUpdatesAsync(MPC_LOCATION_TASK);
      const fetchRegistered = await TaskManager.isTaskRegisteredAsync(MPC_FETCH_TASK);
      if (fetchRegistered) await BackgroundFetch.unregisterTaskAsync(MPC_FETCH_TASK);
      setEnabled(false);
    } catch (e) {
      console.warn('MPC: failed to stop:', e);
    }
  };

  return { requestAndStart, stop, isRunning, enabled };
}
