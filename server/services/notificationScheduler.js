import db from '../db.js';
import { notificationService } from './notificationService.js';

class NotificationScheduler {
  constructor() {
    this.intervalId = null;
    this.checkIntervalMs = 10000; // Check every 10 seconds for timely 15-min delivery
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[Notification Scheduler] Starting background reminder worker...');

    // 1. Recover and ensure upcoming event reminders exist
    try {
      this.syncFutureEventReminders();
    } catch (err) {
      console.error('[Notification Scheduler] Error in startup recovery sync:', err);
    }

    // 2. Initial check for due reminders & auto-purge of old notifications (> 7 days)
    notificationService.purgeOldNotifications();
    this.checkDueReminders();

    // 3. Continuous recurring worker (checks reminders every 10s and purges old notifications)
    this.intervalId = setInterval(() => {
      this.checkDueReminders();
    }, this.checkIntervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[Notification Scheduler] Stopped background reminder worker.');
  }

  /**
   * Check and deliver all due reminders
   */
  checkDueReminders() {
    try {
      const nowIso = new Date().toISOString();

      // Find all scheduled reminders that are due and haven't been delivered yet
      const dueReminders = db.prepare(`
        SELECT * FROM notifications 
        WHERE scheduled_for IS NOT NULL 
          AND scheduled_for <= ? 
          AND delivered_at IS NULL
      `).all(nowIso);

      if (dueReminders.length > 0) {
        console.log(`[Notification Scheduler] Found ${dueReminders.length} due reminder(s) to deliver.`);

        const markDeliveredStmt = db.prepare(`
          UPDATE notifications 
          SET delivered_at = ?, updated_at = ? 
          WHERE id = ? AND delivered_at IS NULL
        `);

        for (const reminder of dueReminders) {
          const deliverTimeIso = new Date().toISOString();
          markDeliveredStmt.run(deliverTimeIso, deliverTimeIso, reminder.id);

          console.log(`[Reminder] Delivered:
  ID: ${reminder.id}
  Event ID: ${reminder.event_id}
  Type: ${reminder.type}
  Title: "${reminder.title}"
  Scheduled For: ${reminder.scheduled_for}
  Delivered At: ${deliverTimeIso}`);
        }
      }

      // Periodically purge notifications older than 7 days (8th day and older)
      notificationService.purgeOldNotifications();
    } catch (err) {
      console.error('[Notification Scheduler] Error in checkDueReminders:', err);
    }
  }

  /**
   * Startup Recovery: Query all upcoming events and ensure required future reminders exist
   */
  syncFutureEventReminders() {
    const todayStr = new Date().toISOString().split('T')[0];
    const events = db.prepare(`
      SELECT * FROM events 
      WHERE start_date >= ? AND status != 'cancelled'
    `).all(todayStr);

    console.log(`[Notification Scheduler] Startup sync: checking ${events.length} upcoming events.`);
    const settings = notificationService.getSettings();

    for (const rawEvent of events) {
      const event = {
        id: rawEvent.id,
        title: rawEvent.title,
        startDate: rawEvent.start_date,
        startTime: rawEvent.start_time,
      };
      notificationService.scheduleRemindersForEvent(event, settings);
    }
  }
}

export const notificationScheduler = new NotificationScheduler();
