import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scheduleDeviceReminder, REMINDER_CHANNEL } from '../../src/services/reminderDeviceAdapter.js';

const reminder = () => ({ id: 'test', nativeId: -12345, reason: 'Call office', notifyAt: new Date(Date.now() + 600000).toISOString() });
function device(overrides = {}) {
  const calls = [];
  return { calls,
    checkPermissions: async () => ({ display: 'granted' }),
    requestPermissions: async () => { calls.push('permission'); return { display: 'granted' }; },
    createChannel: async channel => calls.push(channel),
    checkExactNotificationSetting: async () => ({ exact_alarm: 'granted' }),
    schedule: async options => { calls.push(options); return {}; },
    getPending: async () => ({ notifications: [{ id: -12345 }] }),
    ...overrides,
  };
}

test('Android reminders require exact alarms and allow delivery while idle', async () => {
  const notifications = device();
  const data = reminder();
  await scheduleDeviceReminder(notifications, data);
  const notification = notifications.calls.find(call => call.notifications)?.notifications[0];
  assert.equal(notification.schedule.allowWhileIdle, true);
  assert.equal(notification.schedule.at.toISOString(), data.notifyAt);
  assert.equal(notification.isExactMandatory, true);
  assert.equal(notification.channelId, REMINDER_CHANNEL);
  assert.equal(notifications.calls[0].importance, 5);
});

test('notification permission denial is actionable and does not schedule', async () => {
  const notifications = device({ checkPermissions: async () => ({ display: 'denied' }), requestPermissions: async () => ({ display: 'denied' }) });
  await assert.rejects(scheduleDeviceReminder(notifications, reminder()), /Allow notifications/);
  assert.equal(notifications.calls.length, 0);
});

test('automatic restoration does not prompt when exact alarms are disabled', async () => {
  const notifications = device({ checkExactNotificationSetting: async () => ({ exact_alarm: 'denied' }) });
  await assert.rejects(scheduleDeviceReminder(notifications, reminder(), { prompt: false }), /Alarms & reminders/);
  assert.equal(notifications.calls.some(call => call.notifications || call === 'permission'), false);
});

test('an inexact fallback warning never reports successful exact scheduling', async () => {
  const notifications = device({ schedule: async () => ({ warning: { message: 'Inexact fallback' } }) });
  await assert.rejects(scheduleDeviceReminder(notifications, reminder()), /Alarms & reminders/);
});

test('success requires the reminder to appear in the phone pending queue', async () => {
  const notifications = device({ getPending: async () => ({ notifications: [] }) });
  await assert.rejects(scheduleDeviceReminder(notifications, reminder()), /did not schedule/);
});

test('iOS skips Android-only channel and alarm permission APIs', async () => {
  const notifications = device({ createChannel: async () => { throw new Error('Android only'); }, checkExactNotificationSetting: async () => { throw new Error('Android only'); } });
  await scheduleDeviceReminder(notifications, reminder(), { android: false });
  assert.equal(notifications.calls[0].notifications[0].isExactMandatory, false);
});
