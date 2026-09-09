import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const STRETCH_REMINDER_ID = 'daily-stretch-reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function scheduleDailyStretchReminder(hour: number, minute: number) {
  await cancelDailyStretchReminder();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('stretch-reminders', {
      name: 'Stretch reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.scheduleNotificationAsync({
    identifier: STRETCH_REMINDER_ID,
    content: {
      title: 'Stretch time',
      body: "15 minutes of stretching — your body will thank you.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelDailyStretchReminder() {
  await Notifications.cancelScheduledNotificationAsync(STRETCH_REMINDER_ID).catch(() => {});
}

export async function getStretchReminderTime(): Promise<{ hour: number; minute: number } | null> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const found = scheduled.find((n) => n.identifier === STRETCH_REMINDER_ID);
  if (!found) return null;
  const trigger = found.trigger as any;
  if (trigger && typeof trigger.hour === 'number' && typeof trigger.minute === 'number') {
    return { hour: trigger.hour, minute: trigger.minute };
  }
  return null;
}
