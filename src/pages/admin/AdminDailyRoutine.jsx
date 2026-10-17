import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Pencil, Trash2, Bell } from 'lucide-react';
import { readRoutines, saveRoutine, removeRoutine, seedSampleRoutine, restoreRoutines, ROUTINES_CHANGED } from '../../services/dailyRoutineService.js';
import { routineDay } from '../../utils/routineUtils.js';
import { localDate } from '../../utils/reminderUtils.js';
const blank = { reason: '', kind: 'once', time: '07:00', endTime: '22:00', interval: 15, enabled: true };
const examples = [
  { label: 'Gym · 7 AM', reason: 'Time to go to the gym', time: '07:00' },
  { label: 'Breakfast · 9 AM', reason: 'Time for breakfast', time: '09:00' },
  { label: 'Tea · 10:30 AM', reason: 'Take a tea break', time: '10:30' },
  { label: 'Water · every 15 min', reason: 'Drink a glass of water', kind: 'interval', time: '08:00', endTime: '22:00', interval: 15 },
];
export function AdminDailyRoutine() {
  const [routines, setRoutines] = useState(readRoutines);
  const [date, setDate] = useState(localDate);
  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(Date.now);
  const editorDialog = useRef(null);
  useEffect(() => {
    const dialog = editorDialog.current;
    if (editor && !dialog.open) dialog.showModal();
    else if (!editor && dialog.open) dialog.close();
  }, [editor]);
  useEffect(() => {
    const sync = () => setRoutines(readRoutines());
    window.addEventListener(ROUTINES_CHANGED, sync); window.addEventListener('storage', sync);
    if (seedSampleRoutine()) {
      sync();
      setMessage('Sample day added: 6 AM–10 PM, with water reminders every 15 minutes. Edit or pause any habit.');
      restoreRoutines().catch(error => setMessage(`Sample day saved. ${error.message}`));
    }
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => { clearInterval(timer); window.removeEventListener(ROUTINES_CHANGED, sync); window.removeEventListener('storage', sync); };
  }, []);
  const items = routineDay(routines, date);
  const displayItems = [...items, ...routines.filter(routine => !routine.enabled).map(routine => ({
    id: `${routine.id}:paused`, routineId: routine.id, reason: routine.reason, time: routine.time,
    eventAt: new Date(`${date}T${routine.time}:00`).toISOString(), paused: true,
  }))].sort((a, b) => a.time.localeCompare(b.time));
  const update = (key, value) => setEditor(previous => ({ ...previous, [key]: value }));
  const move = amount => { const day = new Date(`${date}T12:00:00`); day.setDate(day.getDate() + amount); setDate(localDate(day)); };
  const save = async event => {
    event.preventDefault(); setBusy(true); setMessage('');
    try { const result = await saveRoutine(editor); setEditor(null); setMessage(result.deviceError ? `Saved. Device alerts need attention: ${result.deviceError}` : 'Daily routine saved. It repeats every day.'); }
    catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  const change = async routine => { setBusy(true); try { await saveRoutine({ ...routine, enabled: !routine.enabled }); } catch (error) { setMessage(error.message); } finally { setBusy(false); } };
  const remove = async id => { setBusy(true); try { await removeRoutine(id); } catch (error) { setMessage(error.message); } finally { setBusy(false); } };
  const field = 'mt-2.5 w-full rounded-xl border border-slate-200 p-2.5 focus:outline-orange-500 bg-white';
  const card = 'rounded-2xl border border-slate-200 bg-white p-5';
  return <div className="w-full max-w-[900px] mx-auto space-y-5">
    <header className="flex items-center justify-between gap-2.5"><div><h1 className="text-xl font-bold flex items-center gap-2.5"><CalendarDays className="text-orange-600" />Daily Routine</h1><p className="text-sm text-slate-500 mt-2.5">Plan your day. Build habits with reminders that repeat every day.</p></div><button className="bg-orange-600 text-white rounded-xl px-5 py-2.5 font-semibold shrink-0" onClick={() => { setMessage(''); setEditor({ ...blank }); }}>+ Add habit</button></header>
    {message && !editor && <p role="status" className="rounded-xl border border-orange-200 bg-orange-50 p-2.5 text-sm text-orange-800">{message}</p>}
    <div className="space-y-5">
      <section className={card} aria-label="Daily calendar">
        <div className="flex flex-wrap items-center justify-between gap-2.5"><div><h2 className="font-bold">Your day & daily habits</h2><p className="text-xs text-slate-500 mt-1">{routines.length} habits · {items.length} active reminders</p></div><button onClick={() => setDate(localDate())} className="text-sm text-orange-700 font-semibold">Today</button></div>
        <div className="flex items-center justify-between gap-2.5 py-5"><button aria-label="Previous day" onClick={() => move(-1)}><ChevronLeft /></button><input aria-label="Calendar date" type="date" value={date} onChange={event => { if (event.target.value) setDate(event.target.value); }} className="rounded-xl border p-2.5 text-sm" /><button aria-label="Next day" onClick={() => move(1)}><ChevronRight /></button></div>
        <p className="text-sm font-semibold text-slate-600 mb-2.5">{new Date(`${date}T12:00:00`).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <div className="flex flex-wrap items-center gap-2.5 mb-5"><span className="text-xs font-semibold text-slate-500">Quick add</span>{examples.map(example => <button key={example.label} className="rounded-xl border border-orange-200 bg-orange-50 text-orange-700 px-2.5 py-2.5 text-xs font-semibold" onClick={() => { setMessage(''); setEditor({ ...blank, ...example }); }}>{example.label}</button>)}</div>
        <div className="max-h-[60dvh] overflow-y-auto space-y-2.5 pr-1">
          {!displayItems.length && <div className="text-center py-10 text-slate-500"><Bell className="mx-auto mb-2.5 text-orange-500" /><p>No habits scheduled yet.</p><p className="text-sm mt-2.5">Add your first habit or choose an example.</p></div>}
          {displayItems.map(item => {
            const routine = routines.find(r => r.id === item.routineId);
            return <div key={item.id} className={`flex flex-wrap sm:flex-nowrap gap-2.5 sm:gap-5 rounded-xl border p-2.5 sm:p-5 ${item.paused || Date.parse(item.eventAt) <= now ? 'border-slate-100 bg-slate-50' : 'border-orange-100 bg-orange-50'}`}>
              <time className="w-[75px] shrink-0 text-sm font-bold text-orange-700">{new Date(item.eventAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>
              <div className="flex-1 min-w-0"><p className="font-semibold text-sm break-words">{item.reason}</p><p className="text-xs text-slate-500 mt-1">{item.paused ? 'Paused' : Date.parse(item.eventAt) <= now ? 'Scheduled time passed' : 'Scheduled'} · Every day{routine.kind === 'interval' ? ` · Every ${routine.interval} min, ${routine.time}–${routine.endTime}` : ''}</p>{routine.deviceError && <p className="text-xs text-red-600 mt-2.5">{routine.deviceError}</p>}</div>
              <div className="w-full sm:w-auto flex items-center justify-end gap-2.5 shrink-0">
                <button disabled={busy} onClick={() => change(routine)} className="text-xs text-orange-700 font-semibold disabled:opacity-50">{routine.enabled ? 'Pause' : 'Resume'}</button>
                <button disabled={busy} aria-label={`Edit ${routine.reason}`} onClick={() => { setMessage(''); setEditor({ ...routine }); }} className="p-2.5 rounded-xl text-slate-500 hover:bg-orange-100 hover:text-orange-700 disabled:opacity-50"><Pencil size={18} /></button>
                <button disabled={busy} aria-label={`Delete ${routine.reason}`} onClick={() => remove(routine.id)} className="p-2.5 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"><Trash2 size={18} /></button>
              </div>
            </div>;
          })}
        </div>
      </section>
      <dialog ref={editorDialog} onCancel={event => { event.preventDefault(); if (!busy) setEditor(null); }} aria-labelledby="daily-habit-editor-title" className="m-auto w-[min(500px,calc(100vw-30px))] max-h-[90dvh] overflow-y-auto rounded-2xl p-0 backdrop:bg-black/40">
        {editor && <form onSubmit={save} className={`${card} space-y-5`}><h2 id="daily-habit-editor-title" className="font-bold">{editor.id ? 'Edit habit' : 'New habit'}</h2>
          {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
          <label className="block text-sm font-semibold">Reminder message<input autoFocus required maxLength={200} value={editor.reason} onChange={event => update('reason', event.target.value)} placeholder="e.g. Go to the gym" className={field} /></label>
          <label className="block text-sm font-semibold">Reminder type<select value={editor.kind} onChange={event => update('kind', event.target.value)} className={field}><option value="once">Once a day</option><option value="interval">Repeat during the day</option></select></label>
          <div className="grid grid-cols-2 gap-2.5"><label className="text-sm font-semibold">{editor.kind === 'interval' ? 'Start time' : 'Time'}<input type="time" required value={editor.time} onChange={event => update('time', event.target.value)} className={field} /></label>{editor.kind === 'interval' && <label className="text-sm font-semibold">End time<input type="time" required value={editor.endTime} onChange={event => update('endTime', event.target.value)} className={field} /></label>}</div>
          {editor.kind === 'interval' && <label className="block text-sm font-semibold">Remind me every<select value={editor.interval} onChange={event => update('interval', Number(event.target.value))} className={field}><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>1 hour</option></select></label>}
          <p className="text-xs text-slate-500">Repeats every day in your device's local time. Times already passed start tomorrow.</p>
          <div className="flex justify-end gap-2.5"><button type="button" disabled={busy} onClick={() => setEditor(null)} className="px-5 py-2.5 rounded-xl border">Cancel</button><button disabled={busy} className="px-5 py-2.5 rounded-xl bg-orange-600 text-white font-semibold disabled:opacity-50">{busy ? 'Saving…' : 'Save habit'}</button></div>
        </form>}
      </dialog>
        <p className="text-xs text-slate-500">Saved on this device. Browser alerts require this admin portal to stay open. Phone alerts require Notifications and Alarms & reminders permissions; battery restrictions may delay alerts.</p>
    </div>
  </div>;
}
