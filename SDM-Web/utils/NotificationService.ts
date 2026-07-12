// Web build: no push notifications. No-op stub so DataContext's lazy import
// resolves cleanly under Metro-web (native expo-notifications is not bundled).
export const NotificationService = {
  scheduleNotificationsForAllDocuments: async (_docs?: unknown) => {},
  scheduleNotificationsForDocument: async (_doc?: unknown) => {},
  cancelAllNotifications: async () => {},
  getScheduledNotifications: async () => [] as unknown[],
};

export default NotificationService;
