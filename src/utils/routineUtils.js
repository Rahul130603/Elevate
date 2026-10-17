export function routineTimes(routine) {
  const minutes = value => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value || '')) throw new Error('Choose a valid time.');
    const [h, m] = value.split(':').map(Number); return h * 60 + m;
  };
  if (!routine.reason?.trim()) throw new Error('Enter a habit or reminder message.');
  const start = minutes(routine.time);
  if (routine.kind !== 'interval') return [routine.time];
  const end = minutes(routine.endTime);
  const interval = Number(routine.interval);
  if (![15, 30, 60].includes(interval)) throw new Error('Choose a 15, 30 or 60 minute interval.');
  if (end < start) throw new Error('End time must be after start time, within the same day.');
  const times = [];
  for (let at = start; at <= end; at += interval) times.push(`${String(Math.floor(at / 60)).padStart(2, '0')}:${String(at % 60).padStart(2, '0')}`);
  return times;
}
export function routineDay(routines, date) {
  return routines.filter(r => r.enabled).flatMap(routine => routineTimes(routine).map(time => ({
    id: `${routine.id}:${date}:${time}`, routineId: routine.id, reason: routine.reason, time,
    eventAt: new Date(`${date}T${time}:00`).toISOString(),
  }))).sort((a, b) => a.time.localeCompare(b.time));
}
