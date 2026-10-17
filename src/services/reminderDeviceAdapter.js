export const REMINDER_CHANNEL = 'elevate_reminders_v1';

// Kept independent of Capacitor so Android scheduling behavior can be tested.
export async function scheduleDeviceReminder(notifications, reminder, { android = true, prompt = true } = {}) {
  let permission = await notifications.checkPermissions();
  if (permission.display !== 'granted' && prompt) permission = await notifications.requestPermissions();
  if (permission.display !== 'granted') throw new Error('Allow notifications in your phone settings, then enable reminders again.');
  if (android) {
    await notifications.createChannel({ id: REMINDER_CHANNEL, name: 'Reminders', description: 'Your scheduled admin reminders', importance: 5, visibility: 1, vibration: true });
    const exact = await notifications.checkExactNotificationSetting();
    if (!prompt && exact.exact_alarm !== 'granted') throw new Error('Allow Alarms & reminders in phone settings for reminders at the chosen time.');
  }
  if (Date.parse(reminder.notifyAt) <= Date.now()) throw new Error('The notification time passed. Edit the reminder and choose a later time.');
  const result = await notifications.schedule({ notifications: [{
    id: reminder.nativeId, title: reminder.isTest ? 'Reminder test' : 'Reminder',
    body: reminder.eventAt && !reminder.isTest ? `${reminder.reason}\n${new Date(reminder.eventAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}` : reminder.reason,
    schedule: { at: new Date(reminder.notifyAt), allowWhileIdle: true },
    channelId: REMINDER_CHANNEL, smallIcon: 'ic_stat_icon_config_sample',
    iconColor: '#f97316', isExactNotification: true, isExactMandatory: android,
    extra: { personalReminderId: reminder.id },
  }] });
  if (result.warning) throw new Error('Allow Alarms & reminders in phone settings, then enable reminders again.');
  const pending = await notifications.getPending();
  if (!pending.notifications.some(notification => notification.id === reminder.nativeId)) {
    throw new Error('Your phone did not schedule this notification. Enable notifications and try again.');
  }
}
