const KEY = 'gentize_reminder_notifications_v1';
export const REMINDER_HISTORY_CHANGED = 'gentize-reminder-history-changed';

export function createReminderHistory(storage, changed = () => {}) {
  const list = () => { try { const value = JSON.parse(storage.getItem(KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };
  const write = entries => { storage.setItem(KEY, JSON.stringify(entries)); changed(); };
  return {
    list,
    add(entry) { const entries = list(); if (entries.some(item => item.id === entry.id)) return; write([entry, ...entries]); },
    markRead() { const entries = list(); if (entries.some(entry => !entry.isRead)) write(entries.map(entry => ({ ...entry, isRead: true }))); },
    clear(ids) { const selected = new Set(ids); write(list().filter(entry => !selected.has(entry.id))); },
  };
}
const store = () => createReminderHistory(localStorage, () => window.dispatchEvent(new Event(REMINDER_HISTORY_CHANGED)));
export const readReminderNotifications = () => store().list();
export const markReminderNotificationsRead = () => store().markRead();
export const clearReminderNotifications = ids => store().clear(ids);
export const reminderUnreadCount = () => readReminderNotifications().filter(entry => !entry.isRead).length;
export function mergeReminderNotifications(serverEntries, reminderEntries) {
  return [...serverEntries.filter(entry => !entry.isPersonalReminder), ...reminderEntries]
    .sort((a, b) => (Date.parse(b.sent_at || b.delivered_at || b.created_at || b.createdAt) || 0) - (Date.parse(a.sent_at || a.delivered_at || a.created_at || a.createdAt) || 0));
}

export function recordReminderNotification(reminder, kind, { deviceError = '', createdAt = new Date().toISOString() } = {}) {
  const eventTime = new Date(reminder.eventAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  const notice = reminder.minutesBefore ? `${reminder.minutesBefore} minutes before` : 'At the set time';
  const title = kind === 'due' ? (reminder.isTest ? 'Reminder test received' : 'Reminder due') : kind === 'updated' ? 'Reminder updated' : reminder.isTest ? 'Reminder test scheduled' : 'Reminder set';
  store().add({
    id: `reminder:${reminder.id}:${reminder.revision || reminder.notifyAt}:${kind}`,
    type: 'REMINDER', isPersonalReminder: true, isDailyRoutine: Boolean(reminder.routineId || reminder.id?.startsWith('routine-')), reminderId: reminder.id, isRead: false,
    recipient: 'Admin', title, message: `${reminder.reason} · ${eventTime} · ${notice}`,
    reminder_event_at: reminder.eventAt, reminder_notify_at: reminder.notifyAt,
    reminder_reason: reminder.reason, reminder_kind: kind,
    status: 'DELIVERED', error_details: deviceError,
    sent_at: createdAt, created_at: createdAt,
  });
}
