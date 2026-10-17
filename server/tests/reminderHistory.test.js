import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createReminderHistory, mergeReminderNotifications, recordReminderNotification } from '../../src/services/reminderNotificationHistory.js';

function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}
test('reminder history persists and repeated delivery does not duplicate entries', () => {
  const saved = storage();
  const history = createReminderHistory(saved);
  history.add({ id: 'reminder:one:due', isRead: false });
  history.add({ id: 'reminder:one:due', isRead: false });
  assert.equal(createReminderHistory(saved).list().length, 1);
  history.markRead();
  assert.equal(history.list()[0].isRead, true);
});
test('clearing a snapshot keeps notifications arriving during the undo window', () => {
  const history = createReminderHistory(storage());
  history.add({ id: 'old' });
  history.add({ id: 'new' });
  history.clear(['old']);
  assert.deepEqual(history.list().map(entry => entry.id), ['new']);
});
test('merge preserves booking alerts, replaces stale local rows and sorts newest first', () => {
  const server = [{ id: 1, created_at: '2026-10-08T09:00:00Z' }, { id: 'reminder:old', isPersonalReminder: true }];
  const reminder = { id: 'reminder:new', isPersonalReminder: true, sent_at: '2026-10-08T10:00:00Z' };
  assert.deepEqual(mergeReminderNotifications(server, [reminder]).map(entry => entry.id), ['reminder:new', 1]);
});
test('confirmation, due alert, and test notifications contain reason and schedule details', () => {
  const previousStorage = globalThis.localStorage;
  const previousWindow = globalThis.window;
  globalThis.localStorage = storage();
  globalThis.window = { dispatchEvent: () => {} };
  try {
    const reminder = { id: 'one', revision: 'first', reason: 'Call office', eventAt: '2027-01-01T12:00:00Z', notifyAt: '2027-01-01T11:50:00Z', minutesBefore: 10 };
    recordReminderNotification(reminder, 'set');
    recordReminderNotification(reminder, 'due');
    recordReminderNotification(reminder, 'due');
    recordReminderNotification({ ...reminder, id: 'test', isTest: true }, 'due');
    const entries = createReminderHistory(globalThis.localStorage).list();
    assert.equal(entries.length, 3);
    assert.deepEqual(new Set(entries.map(entry => entry.title)), new Set(['Reminder set', 'Reminder due', 'Reminder test received']));
    for (const entry of entries) {
      assert.match(entry.message, /Call office/);
      assert.match(entry.message, /10 minutes before/);
      assert.equal(entry.reminder_event_at, reminder.eventAt);
      assert.equal(entry.type, 'REMINDER');
    }
  } finally { globalThis.localStorage = previousStorage; globalThis.window = previousWindow; }
});
