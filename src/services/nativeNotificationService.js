import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export const nativeNotificationService = {
  /**
   * Deterministic notification ID generator
   * Prevents duplicates and enables precise cancellation
   */
  getNotificationId(eventId, reminderType) {
    const base = Number(eventId) || 1;
    let offset = 15;
    if (reminderType === '1hour') offset = 60;
    if (reminderType === '1day') offset = 1440;
    return (base * 1000 + offset) % 2147483647; // 32-bit int safe for Android
  },

  /**
   * Schedule Android local notifications for an event
   */
  async scheduleEventReminders(event, settings) {
    if (!Capacitor.isNativePlatform()) return;

    try {
      // Check permissions
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display !== 'granted') return;

      const sDate = event.startDate || event.date;
      const sTime = event.startTime || '09:00';
      if (!sDate) return;

      const [year, month, day] = sDate.split('-').map(Number);
      const [hours, minutes] = sTime.split(':').map(Number);
      const eventStart = new Date(year, month - 1, day, hours || 0, minutes || 0, 0);

      if (isNaN(eventStart.getTime())) return;

      const now = new Date();
      const notificationsToSchedule = [];

      // 1. 15-Minute Reminder
      if (settings?.remind15Min || settings?.reminder15Min) {
        const at = new Date(eventStart.getTime() - 15 * 60 * 1000);
        if (at > now) {
          notificationsToSchedule.push({
            id: this.getNotificationId(event.id, '15min'),
            title: 'Event Starting Soon',
            body: `"${event.title}" starts in 15 minutes.`,
            schedule: { at },
            smallIcon: 'ic_stat_icon_config_sample',
            iconColor: '#f97316',
          });
        }
      }

      // 2. 1-Hour Reminder
      if (settings?.remind1Hour || settings?.reminder1Hour) {
        const at = new Date(eventStart.getTime() - 60 * 60 * 1000);
        if (at > now) {
          notificationsToSchedule.push({
            id: this.getNotificationId(event.id, '1hour'),
            title: 'Event Starting Soon',
            body: `"${event.title}" starts in 1 hour.`,
            schedule: { at },
            smallIcon: 'ic_stat_icon_config_sample',
            iconColor: '#f97316',
          });
        }
      }

      // 3. 1-Day Reminder
      if (settings?.remind1Day || settings?.reminder1Day) {
        const at = new Date(eventStart.getTime() - 24 * 60 * 60 * 1000);
        if (at > now) {
          notificationsToSchedule.push({
            id: this.getNotificationId(event.id, '1day'),
            title: 'Upcoming Event Tomorrow',
            body: `"${event.title}" is scheduled for tomorrow at ${sTime}.`,
            schedule: { at },
            smallIcon: 'ic_stat_icon_config_sample',
            iconColor: '#f97316',
          });
        }
      }

      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({
          notifications: notificationsToSchedule,
        });
        console.log(`[Android Local Notifications] Scheduled ${notificationsToSchedule.length} reminder(s) for event ${event.id}`);
      }
    } catch (err) {
      console.warn('[Android Local Notifications] Scheduling error:', err);
    }
  },

  /**
   * Cancel scheduled reminders for an event
   */
  async cancelEventReminders(eventId) {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const ids = [
        { id: this.getNotificationId(eventId, '15min') },
        { id: this.getNotificationId(eventId, '1hour') },
        { id: this.getNotificationId(eventId, '1day') },
      ];
      await LocalNotifications.cancel({ notifications: ids });
      console.log(`[Android Local Notifications] Cancelled reminders for event ${eventId}`);
    } catch (err) {
      console.warn('[Android Local Notifications] Cancellation error:', err);
    }
  },
};
