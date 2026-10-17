import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getReminderSchedule, localDate, REMINDER_OFFSETS } from '../../src/utils/reminderUtils.js';

const reminder = { date: '2027-01-01', time: '00:10', reason: 'Call the office', minutesBefore: 10 };

test('all advance notices subtract the chosen minutes from local event time', () => {
  for (const minutesBefore of REMINDER_OFFSETS) {
    const schedule = getReminderSchedule({ ...reminder, minutesBefore }, 0);
    assert.equal(Date.parse(schedule.eventAt) - Date.parse(schedule.notifyAt), minutesBefore * 60000);
    assert.equal(new Date(schedule.eventAt).getHours(), 0);
    assert.equal(new Date(schedule.eventAt).getMinutes(), 10);
  }
});

test('advance notice can fall on the previous calendar day', () => {
  const schedule = getReminderSchedule({ ...reminder, minutesBefore: 30 }, 0);
  assert.equal(localDate(new Date(schedule.notifyAt)), '2026-12-31');
  assert.equal(new Date(schedule.notifyAt).getHours(), 23);
  assert.equal(new Date(schedule.notifyAt).getMinutes(), 40);
});

test('past notification time is rejected even when the event is in the future', () => {
  const schedule = getReminderSchedule(reminder, 0);
  assert.throws(() => getReminderSchedule(reminder, Date.parse(schedule.notifyAt)), /already passed/);
  assert.throws(() => getReminderSchedule(reminder, Date.parse(schedule.eventAt) - 1000), /already passed/);
});

test('rejects empty reasons, invalid dates, times and unsupported offsets', () => {
  for (const change of [{ reason: ' ' }, { reason: 'a'.repeat(501) }, { date: '2027-02-30' }, { date: '' }, { time: '25:00' }, { time: '' }, { minutesBefore: 7 }]) {
    assert.throws(() => getReminderSchedule({ ...reminder, ...change }, 0));
  }
});

test('at-time notice uses the event timestamp and accepts a valid leap day', () => {
  const schedule = getReminderSchedule({ ...reminder, date: '2028-02-29', minutesBefore: 0 }, 0);
  assert.equal(schedule.eventAt, schedule.notifyAt);
});
