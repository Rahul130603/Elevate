import { API_BASE, getApiBaseUrl } from '../config/api.js';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

const getNotifEndpoint = () => `${getApiBaseUrl() || API_BASE}/api/notifications`;
const getSettingsEndpoint = () => `${getApiBaseUrl() || API_BASE}/api/notification-settings`;

export const notificationService = {
  /**
   * Fetch delivered notifications
   */
  async fetchNotifications(params = {}) {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'all') {
      query.append('category', params.category);
    }
    if (params.unreadOnly) {
      query.append('unreadOnly', 'true');
    }

    const endpoint = getNotifEndpoint();
    const url = query.toString() ? `${endpoint}?${query.toString()}` : endpoint;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  /**
   * Fetch unread notification count
   */
  async fetchUnreadCount() {
    const res = await fetch(`${getNotifEndpoint()}/unread-count`);
    if (!res.ok) throw new Error('Failed to fetch unread count');
    const data = await res.json();
    return data.count !== undefined ? data.count : (data.unreadCount || 0);
  },

  /**
   * Trigger instant test notification (Development mode)
   */
  async sendTestNotification() {
    const res = await fetch(`${getNotifEndpoint()}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to send test notification');
    return res.json();
  },

  /**
   * Trigger instant event reminder without waiting 15 min (Development mode)
   */
  async sendTestReminder(eventId) {
    const res = await fetch(`${getNotifEndpoint()}/test-reminder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId }),
    });
    if (!res.ok) throw new Error('Failed to send test reminder');
    return res.json();
  },

  /**
   * Mark single notification as read
   */
  async markAsRead(id) {
    const res = await fetch(`${getNotifEndpoint()}/${id}/read`, {
      method: 'PATCH',
    });
    if (!res.ok) throw new Error('Failed to mark notification as read');
    return res.json();
  },

  /**
   * Mark all as read
   */
  async markAllAsRead() {
    const res = await fetch(`${getNotifEndpoint()}/read-all`, {
      method: 'PATCH',
    });
    if (!res.ok) throw new Error('Failed to mark all as read');
    return res.json();
  },

  /**
   * Delete notification
   */
  async deleteNotification(id) {
    const res = await fetch(`${getNotifEndpoint()}/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete notification');
    return res.json();
  },

  /**
   * Fetch notification settings
   */
  async fetchSettings() {
    const res = await fetch(getSettingsEndpoint());
    if (!res.ok) throw new Error('Failed to fetch notification settings');
    return res.json();
  },

  /**
   * Update notification settings
   */
  async updateSettings(settings) {
    try {
      const res = await fetch(getSettingsEndpoint(), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        let errMessage = 'Failed to save notification settings';
        try {
          const errData = await res.json();
          if (errData?.error) errMessage = errData.error;
        } catch {
          const text = await res.text();
          if (text) errMessage = text;
        }
        throw new Error(errMessage);
      }
      return res.json();
    } catch (err) {
      if (err.name === 'TypeError' || err.message?.includes('fetch')) {
        throw new Error('Unable to connect to the server.');
      }
      throw err;
    }
  },

  /**
   * Request native notification permission on Android/iOS via Capacitor or Browser
   */
  async requestDevicePermission() {
    if (!Capacitor.isNativePlatform()) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          const perm = await Notification.requestPermission();
          return perm === 'granted';
        }
        return Notification.permission === 'granted';
      }
      return true;
    }
    try {
      const check = await LocalNotifications.checkPermissions();
      if (check.display === 'granted') return true;
      const status = await LocalNotifications.requestPermissions();
      return status.display === 'granted';
    } catch {
      return false;
    }
  },

  /**
   * Ensure high-importance notification channel exists on Android
   */
  async ensureNotificationChannel() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await LocalNotifications.createChannel({
        id: 'elevate_channel',
        name: 'Elevate Appointments',
        description: 'Notifications for slot bookings, confirmations, and reminders',
        importance: 5,
        visibility: 1,
        vibration: true,
      });
    } catch (e) {
      // Channel might already exist or platform is iOS
    }
  },

  /**
   * Schedule native device local notification if running on Android/iOS or web
   */
  async scheduleLocalDeviceNotification({ id, title, body, scheduledAt }) {
    if (!Capacitor.isNativePlatform()) {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, { body, icon: '/elevate-pwa-icon-512.png' });
        } catch (_) {}
      }
      return;
    }
    try {
      const granted = await this.requestDevicePermission();
      if (!granted) return;

      await this.ensureNotificationChannel();

      const notifId = Number(id) ? Math.abs(Number(id)) % 2147483647 : Math.floor(Math.random() * 1000000);

      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title,
            body,
            schedule: scheduledAt ? { at: new Date(scheduledAt) } : undefined,
            channelId: 'elevate_channel',
            smallIcon: 'ic_stat_icon_config_sample',
            iconColor: '#f97316',
          },
        ],
      });
      console.log('[Native Notification] Dispatched:', title, body);
    } catch (err) {
      console.warn('LocalNotifications schedule error:', err);
    }
  },
};
