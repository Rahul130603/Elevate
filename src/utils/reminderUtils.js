export const REMINDER_OFFSETS = [0, 5, 10, 15, 30, 60];

export function getReminderSchedule({ date, time, reason, minutesBefore }, now = Date.now()) {
  if (!reason?.trim()) throw new Error('Enter a reason for your reminder.');
  if (reason.trim().length > 500) throw new Error('Keep the reason under 500 characters.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) {
    throw new Error('Choose a valid date and time.');
  }
  if (!REMINDER_OFFSETS.includes(Number(minutesBefore))) throw new Error('Choose a notification time.');
  const start = new Date(`${date}T${time}:00`);
  const [year, month, day] = date.split('-').map(Number);
  if (start.getFullYear() !== year || start.getMonth() !== month - 1 || start.getDate() !== day ||
      start.getHours() !== Number(time.slice(0, 2)) || start.getMinutes() !== Number(time.slice(3))) {
    throw new Error('Choose a valid local date and time.');
  }
  const notifyAt = start.getTime() - Number(minutesBefore) * 60000;
  if (notifyAt <= now) throw new Error('The notification time has already passed. Choose a later time or a shorter advance notice.');
  return { eventAt: start.toISOString(), notifyAt: new Date(notifyAt).toISOString() };
}

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
