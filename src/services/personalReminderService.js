import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { notificationService } from './notificationService.js';
import { getReminderSchedule } from '../utils/reminderUtils.js';
import { scheduleDeviceReminder } from './reminderDeviceAdapter.js';
import { recordReminderNotification } from './reminderNotificationHistory.js';

const KEY = 'gentize_personal_reminders_v1';
export const REMINDERS_CHANGED = 'gentize-reminders-changed';

export function readReminders() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(value) ? value.filter(r => r.id && Number.isFinite(Date.parse(r.notifyAt))) : [];
  } catch { return []; }
}

function writeReminders(reminders) {
  localStorage.setItem(KEY, JSON.stringify(reminders));
  window.dispatchEvent(new Event(REMINDERS_CHANGED));
}

export async function saveReminder(data, existing) {
  const schedule = getReminderSchedule(data);
  const reminders = readReminders();
  const reminder = {
    id: existing?.id || Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join(''),
    // Reserve negative IDs to avoid collisions with existing event notifications.
    nativeId: existing?.nativeId || -(crypto.getRandomValues(new Uint32Array(1))[0] % 2147483646 + 1),
    date: data.date, time: data.time, reason: data.reason.trim(),
    minutesBefore: Number(data.minutesBefore), ...schedule, delivered: false,
    revision: Array.from(crypto.getRandomValues(new Uint8Array(8)), byte => byte.toString(16).padStart(2, '0')).join(''),
  };
  // Persist before requesting permissions so denied notifications still have an in-app reminder.
  writeReminders([...reminders.filter(r => r.id !== reminder.id), reminder]);
  let deviceScheduled = false;
  let deviceError = '';
  try {
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.cancel({ notifications: [{ id: reminder.nativeId }] });
      await scheduleDeviceReminder(LocalNotifications, reminder, { android: Capacitor.getPlatform() === 'android' });
      deviceScheduled = true;
    } else {
      deviceScheduled = 'Notification' in window && await notificationService.requestDevicePermission();
    }
  } catch (error) {
    console.warn('Device reminder scheduling failed:', error);
    deviceError = error.message?.includes('OS-PLUG-LNOT-0017') ? 'Allow Alarms & reminders in your phone settings, then enable reminders again.' : error.message || 'Device notification could not be scheduled.';
  }
  writeReminders(readReminders().map(saved => saved.id === reminder.id ? { ...saved, deviceScheduled, deviceError } : saved));
  recordReminderNotification(reminder, existing ? 'updated' : 'set', { deviceError });
  return { reminder, deviceScheduled, deviceError };
}

export async function restoreDeviceReminders({ prompt = false } = {}) {
  if (!Capacitor.isNativePlatform()) return;
  const pending = await LocalNotifications.getPending();
  const pendingIds = new Set(pending.notifications.map(notification => notification.id));
  const future = readReminders().filter(reminder => !reminder.delivered && Date.parse(reminder.notifyAt) > Date.now());
  let lastError;
  for (const reminder of future) {
    if (pendingIds.has(reminder.nativeId) && !prompt) continue;
    try {
      await scheduleDeviceReminder(LocalNotifications, reminder, { android: Capacitor.getPlatform() === 'android', prompt });
      writeReminders(readReminders().map(saved => saved.id === reminder.id ? { ...saved, deviceScheduled: true, deviceError: '' } : saved));
    } catch (error) {
      lastError = error;
      writeReminders(readReminders().map(saved => saved.id === reminder.id ? { ...saved, deviceScheduled: false, deviceError: error.message || 'Enable device notifications.' } : saved));
    }
  }
  if (lastError) throw lastError;
}

export async function enableReminderNotifications() {
  if (!Capacitor.isNativePlatform()) {
    if (!('Notification' in window) || !await notificationService.requestDevicePermission()) throw new Error('Allow browser notifications. Keep the admin portal open to receive reminders.');
    return;
  }
  if (!await notificationService.requestDevicePermission()) throw new Error('Allow notifications in your phone settings.');
  if (Capacitor.getPlatform() === 'android') {
    const exact = await LocalNotifications.checkExactNotificationSetting();
    if (exact.exact_alarm !== 'granted') {
      const updated = await LocalNotifications.changeExactNotificationSetting();
      if (updated.exact_alarm !== 'granted') throw new Error('Allow Alarms & reminders in your phone settings.');
    }
  }
  await restoreDeviceReminders({ prompt: false });
}

export async function testReminderNotification() {
  await enableReminderNotifications();
  const at = new Date(Date.now() + 10000).toISOString();
  const test = { id: `reminder-test-${Date.now()}`, nativeId: -(crypto.getRandomValues(new Uint32Array(1))[0] % 2147483646 + 1), reason: 'Reminder notifications are working.', notifyAt: at, eventAt: at, minutesBefore: 0, delivered: false, isTest: true };
  if (Capacitor.isNativePlatform()) {
    await scheduleDeviceReminder(LocalNotifications, test, { android: Capacitor.getPlatform() === 'android', prompt: false });
    writeReminders([...readReminders(), test]);
    recordReminderNotification(test, 'set');
    return 'Test scheduled for 10 seconds from now. You can put the app in the background to check it.';
  }
  new Notification('Reminder test', { body: test.reason });
  recordReminderNotification(test, 'due');
  return 'Test notification sent. Browser reminders need the admin portal to stay open.';
}

export async function deleteReminder(id) {
  const reminders = readReminders();
  const reminder = reminders.find(r => r.id === id);
  if (reminder && Capacitor.isNativePlatform()) {
    await LocalNotifications.cancel({ notifications: [{ id: reminder.nativeId }] });
  }
  writeReminders(reminders.filter(r => r.id !== id));
}

export function deliverDueReminders(now = Date.now()) {
  const reminders = readReminders();
  const due = reminders.filter(r => !r.delivered && Date.parse(r.notifyAt) <= now);
  if (!due.length) return [];
  due.forEach(reminder => recordReminderNotification(reminder, 'due'));
  writeReminders(reminders.map(r => due.some(d => d.id === r.id) ? { ...r, delivered: true } : r));
  if (!Capacitor.isNativePlatform() && 'Notification' in window && Notification.permission === 'granted') {
    due.forEach(r => {
      try { new Notification('Reminder', { body: r.reason, tag: r.id }); } catch { /* In-app alert remains available. */ }
    });
  }
  return due;
}
