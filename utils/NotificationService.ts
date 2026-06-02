import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Document } from '../contexts/DataContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  static async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Document Expiry Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1976d2',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  static async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  private static getDaysUntilExpiry(expiryDate: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  static async scheduleExpiryNotifications(documents: Document[]): Promise<number> {
    await this.cancelAllNotifications();

    let scheduledCount = 0;
    const now = new Date();

    for (const doc of documents) {
      if (!doc.expiryDate || doc.noExpiryDate) continue;

      const daysUntilExpiry = this.getDaysUntilExpiry(doc.expiryDate);
      let daysBeforeTrigger = 0;

      if (daysUntilExpiry > 90)      daysBeforeTrigger = 90;
      else if (daysUntilExpiry > 30) daysBeforeTrigger = 30;
      else if (daysUntilExpiry > 7)  daysBeforeTrigger = 7;

      if (daysBeforeTrigger > 0) {
        const triggerDate = new Date(doc.expiryDate);
        triggerDate.setHours(10, 0, 0, 0);
        triggerDate.setDate(triggerDate.getDate() - daysBeforeTrigger);

        if (triggerDate > now) {
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: '⚠️ Document Expiry Alert',
                body: `${doc.name} expires in ${daysBeforeTrigger} days!`,
                data: { docId: doc.id },
                sound: true,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: triggerDate,
              },
            });
            scheduledCount++;
          } catch (error) {
            console.error(`Failed to schedule for ${doc.name}:`, error);
          }
        }
      }
    }

    return scheduledCount;
  }

  static async scheduleNotificationsForAllDocuments(documents: Document[]): Promise<number> {
    return this.scheduleExpiryNotifications(documents);
  }

  static async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return Notifications.getAllScheduledNotificationsAsync();
  }

  static async sendTestNotification(): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification ✅',
        body: 'Notifications are working correctly!',
        data: { test: true },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
      },
    });
  }
}
