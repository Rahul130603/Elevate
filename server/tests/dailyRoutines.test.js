import test from 'node:test';
import assert from 'node:assert/strict';
import { routineTimes, routineDay } from '../../src/utils/routineUtils.js';
test('daily single habits retain the chosen times', () => {
  for (const time of ['07:00', '09:00', '10:30']) assert.deepEqual(routineTimes({reason: 'Habit', kind: 'once', time}), [time]);
});
test('water runs every 15 minutes from start through end, never overnight', () => {
  const times = routineTimes({reason: 'Water', kind: 'interval', time: '08:00', endTime: '22:00', interval: 15});
  assert.equal(times.length, 57); assert.equal(times[0], '08:00'); assert.equal(times[1], '08:15'); assert.equal(times.at(-1), '22:00');
  assert.deepEqual(routineTimes({reason: 'Water', kind: 'interval', time: '21:45', endTime: '22:00', interval: 30}), ['21:45']);
});
test('invalid times, reversed ranges and unsupported intervals are rejected', () => {
  const base = {reason: 'Water', kind: 'interval', time: '08:00', endTime: '22:00', interval: 15};
  for (const patch of [{reason: ''}, {time: '24:00'}, {time: '9:00'}, {endTime: '07:00'}, {interval: 0}, {interval: 10}]) assert.throws(() => routineTimes({...base, ...patch}));
});
test('day calendar repeats on each date, orders habits, and excludes paused routines', () => {
  const routines = [{id: 'tea', enabled: true, reason: 'Tea', time: '10:30'}, {id: 'gym', enabled: true, reason: 'Gym', time: '07:00'}, {id: 'paused', enabled: false, reason: 'Paused', time: '06:00'}];
  const today = routineDay(routines, '2026-10-10'); const tomorrow = routineDay(routines, '2026-10-11');
  assert.deepEqual(today.map(r => r.reason), ['Gym', 'Tea']);
  assert.equal(tomorrow.length, 2); assert.notEqual(today[0].id, tomorrow[0].id);
  assert.equal(new Date(today[0].eventAt).getHours(), 7);
});
