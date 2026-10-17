import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { enableReminderNotifications } from './personalReminderService.js';
import { REMINDER_CHANNEL } from './reminderDeviceAdapter.js';
import { recordReminderNotification } from './reminderNotificationHistory.js';
import { routineTimes, routineDay } from '../utils/routineUtils.js';
import { localDate } from '../utils/reminderUtils.js';
const KEY = 'gentize_daily_routines_v1';
export const ROUTINES_CHANGED = 'gentize-routines-changed';
export function readRoutines() { try { const value = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } }
function write(value) { localStorage.setItem(KEY, JSON.stringify(value)); window.dispatchEvent(new Event(ROUTINES_CHANGED)); }
// Seed the requested sample day once per device; preserve edits and deletions thereafter.
export function seedSampleRoutine() {
  const marker = 'gentize_sample_day_6am_10pm_v1';
  if (localStorage.getItem(marker)) return false;
  const samples = [
    ['wake', '06:00', 'Wake up and freshen up'],
    ['stretch', '06:30', 'Morning stretching and breathing'],
    ['gym', '07:00', 'Time to go to the gym'],
    ['shower', '08:15', 'Shower and get ready'],
    ['breakfast', '09:00', 'Time for breakfast'],
    ['work', '09:30', 'Start work and plan your priorities'],
    ['tea', '10:30', 'Take a tea break'],
    ['lunch', '13:00', 'Time for lunch'],
    ['focus', '14:00', 'Afternoon focus work'],
    ['snack', '16:00', 'Evening tea and a snack'],
    ['walk', '18:00', 'Take an evening walk'],
    ['dinner', '20:00', 'Time for dinner'],
    ['plan', '21:00', 'Review today and plan tomorrow'],
    ['sleep', '22:00', 'Wind down and get ready for sleep'],
  ].map(([key, time, reason]) => ({id: `routine-sample-${key}`, time, reason, kind: 'once'}));
  samples.push({id: 'routine-sample-water', reason: 'Drink a glass of water', kind: 'interval', time: '06:00', endTime: '22:00', interval: 15});
  const existing = readRoutines();
  const used = new Set(existing.flatMap(r => r.nativeIds || []));
  const added = samples.filter(sample => !existing.some(r => r.id === sample.id)).map(sample => ({
    ...sample, enabled: true, activeFrom: Date.now(), deviceError: '',
    nativeIds: routineTimes(sample).map(() => {
      let id; do { id = -(crypto.getRandomValues(new Uint32Array(1))[0] % 2147483646 + 1); } while (used.has(id)); used.add(id); return id;
    }),
  }));
  write([...existing, ...added]);
  localStorage.setItem(marker, 'loaded');
  return added.length > 0;
}
async function cancel(routine) {
  if (Capacitor.isNativePlatform() && routine?.nativeIds?.length) await LocalNotifications.cancel({ notifications: routine.nativeIds.map(id => ({ id })) });
}
async function schedule(routine, prompt) {
  if (!Capacitor.isNativePlatform()) { if (prompt) await enableReminderNotifications(); return; }
  if (prompt) await enableReminderNotifications();
  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== 'granted') throw new Error('Allow notifications in phone settings.');
  if (Capacitor.getPlatform() === 'android') {
    if ((await LocalNotifications.checkExactNotificationSetting()).exact_alarm !== 'granted') throw new Error('Allow Alarms & reminders in phone settings.');
    await LocalNotifications.createChannel({ id: REMINDER_CHANNEL, name: 'Reminders', importance: 5, visibility: 1, vibration: true });
  }
  const result = await LocalNotifications.schedule({ notifications: routineTimes(routine).map((time, index) => {
    const [hour, minute] = time.split(':').map(Number);
    return { id: routine.nativeIds[index], title: 'Daily routine', body: `${routine.reason} · ${time}`, schedule: { on: { hour, minute, second: 0 }, allowWhileIdle: true }, channelId: REMINDER_CHANNEL, smallIcon: 'ic_stat_icon_config_sample', iconColor: '#f97316', isExactNotification: true, isExactMandatory: Capacitor.getPlatform() === 'android', extra: { routineId: routine.id } };
  }) });
  if (result.warning) throw new Error('Allow Alarms & reminders in phone settings.');
  const pending = new Set((await LocalNotifications.getPending()).notifications.map(n => n.id));
  if (routine.nativeIds.some(id => !pending.has(id))) throw new Error('Some routine notifications were not scheduled. Try saving again.');
}
export async function saveRoutine(data) {
  const times = routineTimes(data);
  const existing = readRoutines().find(r => r.id === data.id);
  await cancel(existing);
  const used = new Set(readRoutines().flatMap(r => r.nativeIds || []));
  const nativeIds = times.map(() => { let id; do { id = -(crypto.getRandomValues(new Uint32Array(1))[0] % 2147483646 + 1); } while (used.has(id)); used.add(id); return id; });
  const routine = { ...data, reason: data.reason.trim(), id: existing?.id || `routine-${Date.now()}-${nativeIds[0]}`, nativeIds, enabled: data.enabled !== false, activeFrom: Date.now(), deviceError: '' };
  write([...readRoutines().filter(r => r.id !== routine.id), routine]);
  try { if (routine.enabled) await schedule(routine, true); } catch (error) { routine.deviceError = error.message; }
  write(readRoutines().map(r => r.id === routine.id ? routine : r));
  const at = new Date(`${localDate()}T${routine.time}:00`).toISOString();
  recordReminderNotification({ id: routine.id, revision: String(routine.activeFrom), reason: `${routine.reason} · Every day${routine.kind === 'interval' ? `, every ${routine.interval} min until ${routine.endTime}` : ''}`, eventAt: at, notifyAt: at, minutesBefore: 0 }, existing ? 'updated' : 'set', { deviceError: routine.deviceError });
  return routine;
}
export async function removeRoutine(id) { await cancel(readRoutines().find(r => r.id === id)); write(readRoutines().filter(r => r.id !== id)); }
export async function restoreRoutines() {
  if (!Capacitor.isNativePlatform()) return;
  const pending = new Set((await LocalNotifications.getPending()).notifications.map(n => n.id));
  for (const routine of readRoutines().filter(r => r.enabled)) {
    if (routine.nativeIds.every(id => pending.has(id))) continue;
    try { await schedule(routine, false); routine.deviceError = ''; } catch (error) { routine.deviceError = error.message; }
    write(readRoutines().map(r => r.id === routine.id ? routine : r));
  }
}
export function deliverRoutineReminders(now = Date.now()) {
  const date = localDate(new Date(now));
  let seen; try { seen = JSON.parse(localStorage.getItem('gentize_routine_seen') || '{}'); } catch { seen = {}; }
  const routines = readRoutines();
  const due = routineDay(routines, date).filter(item => Date.parse(item.eventAt) <= now && Date.parse(item.eventAt) >= (routines.find(r => r.id === item.routineId)?.activeFrom || now) && !seen[item.id]);
  for (const item of due) { seen[item.id] = now; recordReminderNotification({ ...item, notifyAt: item.eventAt, minutesBefore: 0 }, 'due'); }
  if (due.length) localStorage.setItem('gentize_routine_seen', JSON.stringify(Object.fromEntries(Object.entries(seen).filter(([, time]) => now - time < 172800000))));
  const current = due.filter(item => now - Date.parse(item.eventAt) < 60000);
  if (!Capacitor.isNativePlatform() && 'Notification' in window && Notification.permission === 'granted') for (const item of current) { try { new Notification('Daily routine', { body: item.reason, tag: item.id }); } catch {} }
  return current;
}
