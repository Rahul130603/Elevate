import db, { formatNotification, formatNotificationSettings } from '../db.js';

export const notificationService = {
  getSettings() {
    const row = db.prepare('SELECT * FROM notification_settings WHERE id = 1').get();
    return formatNotificationSettings(row);
  },

  updateSettings(newSettings) {
    const stmt = db.prepare(`
      UPDATE notification_settings SET
        remind_1_day = ?,
        remind_1_hour = ?,
        remind_15_min = ?,
        notify_created = ?,
        notify_updated = ?,
        notify_cancelled = ?,
        channel_in_app = ?,
        channel_browser = ?,
        channel_device = ?
      WHERE id = 1
    `);

    const remind1Day = newSettings.reminder1Day ?? newSettings.remind1Day;
    const remind1Hour = newSettings.reminder1Hour ?? newSettings.remind1Hour;
    const remind15Min = newSettings.reminder15Min ?? newSettings.remind15Min;
    const notifyCreated = newSettings.eventCreated ?? newSettings.notifyCreated;
    const notifyUpdated = newSettings.eventUpdated ?? newSettings.notifyUpdated;
    const notifyCancelled = newSettings.eventCancelled ?? newSettings.notifyCancelled;
    const channelInApp = newSettings.inAppEnabled ?? newSettings.channelInApp;
    const channelBrowser = newSettings.browserEnabled ?? newSettings.channelBrowser;
    const channelDevice = newSettings.deviceEnabled ?? newSettings.channelDevice;

    stmt.run(
      remind1Day ? 1 : 0,
      remind1Hour ? 1 : 0,
      remind15Min ? 1 : 0,
      notifyCreated ? 1 : 0,
      notifyUpdated ? 1 : 0,
      notifyCancelled ? 1 : 0,
      channelInApp !== false ? 1 : 0,
      channelBrowser ? 1 : 0,
      channelDevice !== false ? 1 : 0
    );

    return this.getSettings();
  },

  /**
   * Helper to parse event start into a Date object using local components
   */
  getEventStartDate(event) {
    const sDate = event.startDate || event.date;
    const sTime = event.startTime || '09:00';
    if (!sDate) return new Date(NaN);

    const [year, month, day] = sDate.split('-').map(Number);
    const [hours, minutes] = sTime.split(':').map(Number);
    return new Date(year, month - 1, day, hours || 0, minutes || 0, 0);
  },

  /**
   * Called when an event is created
   */
  onEventCreated(event) {
    const settings = this.getSettings();
    const nowIso = new Date().toISOString();

    // 1. In-app Event Created notification
    if (settings.notifyCreated) {
      const stmt = db.prepare(`
        INSERT INTO notifications (event_id, type, title, message, is_read, scheduled_for, delivered_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        event.id,
        'created',
        'New Event',
        `"${event.title}" has been scheduled.`,
        0,
        null,
        nowIso,
        nowIso,
        nowIso
      );
      console.log(`[Notification] Created event notification for "${event.title}" (ID: ${event.id})`);
    }

    // 2. Generate reminder schedules based on saved preferences
    this.scheduleRemindersForEvent(event, settings);
  },

  /**
   * Schedule reminders: 1 day before, 1 hour before, 15 minutes before
   */
  scheduleRemindersForEvent(event, settings = this.getSettings()) {
    const eventStart = this.getEventStartDate(event);
    if (isNaN(eventStart.getTime())) return;

    const now = new Date();
    const nowIso = now.toISOString();
    const insertReminder = db.prepare(`
      INSERT INTO notifications (event_id, type, title, message, is_read, scheduled_for, delivered_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)
    `);

    // Helper to safely schedule a single reminder threshold
    const scheduleThreshold = (offsetMs, type, title, messageText) => {
      const reminderTime = new Date(eventStart.getTime() - offsetMs);
      const scheduledIso = reminderTime.toISOString();

      // Only schedule if reminder is in the future or event starts soon
      if (reminderTime.getTime() > now.getTime()) {
        const existing = db.prepare(`
          SELECT id FROM notifications 
          WHERE event_id = ? AND type = ? AND scheduled_for = ?
        `).get(event.id, type, scheduledIso);

        if (!existing) {
          insertReminder.run(
            event.id,
            type,
            title,
            messageText,
            0,
            scheduledIso,
            nowIso,
            nowIso
          );
          console.log(`[Notification Scheduler] Scheduled ${type} for event "${event.title}" at ${scheduledIso}`);
        }
      }
    };

    // 1 Day Before (24 hours = 86,400,000 ms)
    if (settings.remind1Day) {
      scheduleThreshold(
        24 * 60 * 60 * 1000,
        'upcoming',
        'Upcoming Event',
        `"${event.title}" starts tomorrow at ${event.startTime || '10:00'}.`
      );
    }

    // 1 Hour Before (60 minutes = 3,600,000 ms)
    if (settings.remind1Hour) {
      scheduleThreshold(
        60 * 60 * 1000,
        'reminder',
        'Event Starting Soon',
        `"${event.title}" starts in 1 hour.`
      );
    }

    // 15 Minutes Before (15 minutes = 900,000 ms)
    if (settings.remind15Min) {
      scheduleThreshold(
        15 * 60 * 1000,
        'reminder',
        'Event Starting Soon',
        `"${event.title}" starts in 15 minutes.`
      );
    }

    // Test mode: 1-minute reminder if enabled via NOTIFICATION_TEST_MODE
    if (process.env.NOTIFICATION_TEST_MODE === 'true') {
      scheduleThreshold(
        60 * 1000,
        'reminder',
        'Event Starting Soon (Test)',
        `"${event.title}" starts in 1 minute (Test Mode).`
      );
    }
  },

  /**
   * Called when an event is updated
   */
  onEventUpdated(event) {
    const settings = this.getSettings();
    const nowIso = new Date().toISOString();

    // 1. In-app Event Updated notification
    if (settings.notifyUpdated) {
      const stmt = db.prepare(`
        INSERT INTO notifications (event_id, type, title, message, is_read, scheduled_for, delivered_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        event.id,
        'updated',
        'Event Updated',
        `"${event.title}" has been updated.`,
        0,
        null,
        nowIso,
        nowIso,
        nowIso
      );
    }

    // 2. Remove obsolete future undelivered reminders for this event
    db.prepare(`
      DELETE FROM notifications 
      WHERE event_id = ? 
        AND scheduled_for IS NOT NULL 
        AND delivered_at IS NULL
    `).run(event.id);

    // 3. Recalculate reminders from new event start date/time
    this.scheduleRemindersForEvent(event, settings);
  },

  /**
   * Called when an event is deleted
   */
  onEventDeleted(event) {
    const settings = this.getSettings();
    const nowIso = new Date().toISOString();

    // 1. Remove all scheduled pending reminders for this event
    db.prepare(`
      DELETE FROM notifications 
      WHERE event_id = ? AND delivered_at IS NULL
    `).run(event.id);

    // 2. In-app Event Deleted notification
    if (settings.notifyCancelled) {
      const stmt = db.prepare(`
        INSERT INTO notifications (event_id, type, title, message, is_read, scheduled_for, delivered_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        null, // detach from deleted event ID
        'cancelled',
        'Event Deleted',
        `"${event.title}" has been deleted.`,
        0,
        null,
        nowIso,
        nowIso,
        nowIso
      );
    }
  },

  /**
   * Automatically and permanently purge all notifications older than 7 days (8th day and older).
   * These will NEVER show in History and are permanently deleted from database.
   */
  purgeOldNotifications() {
    try {
      const now = new Date();
      // Calculate 7 full days ago (start of day at 00:00:00 local time)
      const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
      const cutoffIso = cutoff.toISOString();
      const cutoffDateStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;

      const stmt = db.prepare(`
        DELETE FROM notifications 
        WHERE COALESCE(delivered_at, created_at) < ?
           OR (booking_date IS NOT NULL AND booking_date != '' AND booking_date < ?)
      `);
      const result = stmt.run(cutoffIso, cutoffDateStr);
      if (result.changes > 0) {
        console.log(`[Notification Purge] Permanently deleted ${result.changes} notifications older than 7 days.`);
      }
      return result.changes;
    } catch (err) {
      console.error('[Notification Purge] Error purging old notifications:', err);
      return 0;
    }
  },

  /**
   * Get all DELIVERED notifications within the last 7 days only
   */
  getDeliveredNotifications({ category = 'all', unreadOnly = false, recipient = null, target = null } = {}) {
    // 1. Purge notifications older than 7 days first
    this.purgeOldNotifications();

    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
    const cutoffIso = cutoff.toISOString();

    let sql = `
      SELECT n.*, COALESCE(NULLIF(n.booking_source, ''), b.booking_source, 'CLIENT') AS booking_source 
      FROM notifications n
      LEFT JOIN admin_bookings b ON n.booking_id = b.id
      WHERE (n.scheduled_for IS NULL OR n.delivered_at IS NOT NULL)
        AND COALESCE(n.delivered_at, n.created_at) >= ?
    `;
    const params = [cutoffIso];

    if (target === 'SALES_LEAD' || recipient === 'Sales Team Lead') {
      sql += " AND (n.recipient LIKE '%Sales%' OR n.recipient LIKE '%Lead%' OR (b.booking_target = 'SALES_LEAD' AND n.recipient NOT LIKE '%@%'))";
    } else if (target === 'MD' || recipient === 'MD Office') {
      sql += " AND (n.recipient LIKE '%MD%' OR n.recipient LIKE '%Office%' OR n.recipient IS NULL OR n.recipient = '' OR (b.booking_target = 'MD' AND n.recipient NOT LIKE '%@%'))";
    }

    if (unreadOnly) {
      sql += ' AND n.is_read = 0';
    }

    if (category === 'unread') {
      sql += ' AND n.is_read = 0';
    } else if (category === 'events') {
      sql += " AND n.type IN ('created', 'updated', 'cancelled', 'event_created', 'event_updated', 'event_deleted')";
    } else if (category === 'system') {
      sql += " AND n.type IN ('system', 'reminder', 'upcoming', 'event_reminder')";
    }

    sql += ' ORDER BY COALESCE(n.delivered_at, n.created_at) DESC, n.id DESC';

    const rows = db.prepare(sql).all(...params);
    return rows.map(formatNotification);
  },

  /**
   * Get unread count of delivered notifications within the last 7 days only
   */
  getUnreadCount({ target = null, recipient = null } = {}) {
    this.purgeOldNotifications();

    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
    const cutoffIso = cutoff.toISOString();

    let sql = `
      SELECT COUNT(*) AS count FROM notifications n
      LEFT JOIN admin_bookings b ON n.booking_id = b.id
      WHERE (n.scheduled_for IS NULL OR n.delivered_at IS NOT NULL)
        AND COALESCE(n.delivered_at, n.created_at) >= ?
        AND n.is_read = 0
    `;
    if (target === 'SALES_LEAD' || recipient === 'Sales Team Lead') {
      sql += " AND (n.recipient LIKE '%Sales%' OR n.recipient LIKE '%Lead%' OR (b.booking_target = 'SALES_LEAD' AND n.recipient NOT LIKE '%@%'))";
    } else if (target === 'MD' || recipient === 'MD Office') {
      sql += " AND (n.recipient LIKE '%MD%' OR n.recipient LIKE '%Office%' OR n.recipient IS NULL OR n.recipient = '' OR (b.booking_target = 'MD' AND n.recipient NOT LIKE '%@%'))";
    }

    const result = db.prepare(sql).get(cutoffIso);
    return result ? result.count : 0;
  },

  markAsRead(id) {
    const nowIso = new Date().toISOString();
    db.prepare('UPDATE notifications SET is_read = 1, updated_at = ? WHERE id = ?').run(nowIso, id);
    const row = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
    return formatNotification(row);
  },

  markAllAsRead() {
    const nowIso = new Date().toISOString();
    db.prepare(`
      UPDATE notifications 
      SET is_read = 1, updated_at = ? 
      WHERE (scheduled_for IS NULL OR delivered_at IS NOT NULL)
        AND is_read = 0
    `).run(nowIso);
    return { success: true };
  },

  deleteNotification(id) {
    db.prepare('DELETE FROM notifications WHERE id = ?').run(id);
    return { success: true, id: Number(id) };
  },

  deleteAllDelivered() {
    const result = db.prepare('DELETE FROM notifications WHERE (scheduled_for IS NULL OR delivered_at IS NOT NULL)').run();
    return { success: true, deletedCount: result.changes };
  },

  /**
   * Development Test: Create an immediate test notification
   */
  createTestNotification() {
    const nowIso = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO notifications (event_id, type, title, message, is_read, scheduled_for, delivered_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      null,
      'system',
      'Test Notification',
      'Notification system is working.',
      0,
      null,
      nowIso,
      nowIso,
      nowIso
    );
    const row = db.prepare('SELECT * FROM notifications WHERE id = ?').get(result.lastInsertRowid);
    return formatNotification(row);
  },

  /**
   * Development Test: Create an immediate delivered reminder for an event
   */
  triggerTestReminder(eventId) {
    const eventRow = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!eventRow) {
      throw new Error(`Event with id ${eventId} not found`);
    }

    const nowIso = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO notifications (event_id, type, title, message, is_read, scheduled_for, delivered_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      eventRow.id,
      'reminder',
      'Event Starting Soon',
      `"${eventRow.title}" starts in 15 minutes.`,
      0,
      nowIso,
      nowIso,
      nowIso,
      nowIso
    );
    const row = db.prepare('SELECT * FROM notifications WHERE id = ?').get(result.lastInsertRowid);
    return formatNotification(row);
  }
};
