import React, { useEffect, useRef, useState } from 'react';
import { Bell, Clock, Pencil, Trash2, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { readReminders, saveReminder, deleteReminder, REMINDERS_CHANGED } from '../../services/personalReminderService.js';
import { localDate, REMINDER_OFFSETS } from '../../utils/reminderUtils.js';

export default function ReminderCalendar({ selection, onClose, onViewEvents, onCreateEvent, compact = false }) {
  const [reminders, setReminders] = useState(readReminders);
  const [editor, setEditor] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const dialog = useRef(null);
  const reasonInput = useRef(null);
  useEffect(() => {
    const sync = () => setReminders(readReminders());
    window.addEventListener(REMINDERS_CHANGED, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(REMINDERS_CHANGED, sync); window.removeEventListener('storage', sync); };
  }, []);
  useEffect(() => {
    if (!selection) { setEditor(null); return; }
    const soon = new Date(Date.now() + 60 * 60000);
    setEditor({ date: selection.date, time: `${String(soon.getHours()).padStart(2, '0')}:${String(soon.getMinutes()).padStart(2, '0')}`, reason: '', minutesBefore: 10 });
    setError('');
  }, [selection]);
  useEffect(() => {
    if (editor && !dialog.current.open) { dialog.current.showModal(); reasonInput.current?.focus(); }
    if (!editor && dialog.current.open) dialog.current.close();
  }, [editor]);

  const close = () => { if (!saving) { setEditor(null); setError(''); onClose(); } };
  const update = (field, value) => { setEditor(previous => ({ ...previous, [field]: value })); setError(''); };
  const submit = async event => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const result = await saveReminder(editor, editor.id ? editor : null);
      setNotice(result.deviceScheduled ? 'Reminder saved. Device notification scheduled.' : `Reminder saved for in-app alerts only. ${result.deviceError || 'Allow device notifications to receive alerts outside the app.'}`);
      setEditor(null); onClose();
    } catch (err) { setError(err.message || 'Could not save your reminder.'); }
    finally { setSaving(false); }
  };
  const remove = async id => {
    try { await deleteReminder(id); setNotice('Reminder deleted.'); }
    catch { setNotice('Could not delete the reminder. Please try again.'); }
  };
  const ordered = reminders.filter(reminder => !reminder.isTest).sort((a, b) => Number(a.delivered) - Number(b.delivered) || Date.parse(a.eventAt) - Date.parse(b.eventAt));
  return <>
    <section className={`${compact ? 'p-2.5 sm:p-[15px]' : 'mt-5 p-5'} rounded-2xl bg-white border border-slate-200`} aria-label="Personal reminders">
      <div className="flex items-center justify-between gap-2.5"><h3 className="text-lg font-bold flex gap-2.5 items-center"><Bell className="w-5 h-5 text-orange-600" />My reminders</h3><button className="text-sm font-semibold text-orange-600" onClick={() => { const soon = new Date(Date.now() + 60 * 60000); setError(''); setEditor({ date: localDate(soon), time: `${String(soon.getHours()).padStart(2, '0')}:${String(soon.getMinutes()).padStart(2, '0')}`, reason: '', minutesBefore: 10 }); }}>+ Add reminder</button></div>
      <p className="text-xs text-slate-500 mt-1">Saved on this device. {!compact && (Capacitor.isNativePlatform() ? 'Allow device notifications for background reminders.' : 'Keep the app open to receive browser and in-app alerts.')}</p>
      {notice && <p role="status" className="mt-2.5 text-sm text-orange-700">{notice}</p>}
      {!ordered.length && <p className="text-sm text-slate-500 py-5">Choose a date on the calendar to set your first reminder.</p>}
      <div className={`${compact ? 'max-h-[min(120px,16dvh)] md:max-h-[240px]' : 'max-h-[300px]'} overflow-y-auto mt-2.5`}>
        {ordered.map(reminder => <div key={reminder.id} className="flex items-start gap-2.5 py-2.5 border-t border-slate-100">
          <div className="flex-1 min-w-0"><p className="font-semibold text-sm break-words text-slate-800">{reminder.reason}</p><p className="text-xs text-slate-500 mt-1">{new Date(reminder.eventAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} · {reminder.delivered ? 'Notified' : reminder.minutesBefore ? `${reminder.minutesBefore} min before` : 'At set time'}</p>{!reminder.delivered && reminder.deviceError && <p className="text-xs text-red-600 mt-2.5">{reminder.deviceError}</p>}</div>
          <button aria-label={`Edit reminder: ${reminder.reason}`} className="p-2.5 text-slate-500 hover:text-orange-600" onClick={() => { setError(''); setEditor(reminder); }}><Pencil className="w-4 h-4" /></button>
          <button aria-label={`Delete reminder: ${reminder.reason}`} className="p-2.5 text-slate-500 hover:text-red-600" onClick={() => remove(reminder.id)}><Trash2 className="w-4 h-4" /></button>
        </div>)}
      </div>
    </section>
    <dialog ref={dialog} aria-labelledby="reminder-title" className="w-[calc(100%_-_30px)] max-w-[450px] max-h-[90vh] overflow-y-auto rounded-2xl p-0 border border-slate-200 shadow-lg backdrop:bg-slate-900/50" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === dialog.current) { const rect = dialog.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); } }}>
      {editor && <form onSubmit={submit} className="p-5 space-y-5">
        <div className="flex items-start justify-between"><div><h2 id="reminder-title" className="text-xl font-bold text-slate-900 flex items-center gap-2.5"><Bell className="w-5 h-5 text-orange-600" />{editor.id ? 'Edit reminder' : 'Set a reminder'}</h2><p className="text-sm text-slate-500 mt-2.5">A little nudge, right when you need it.</p></div><button type="button" disabled={saving} aria-label="Close reminder" onClick={close} className="p-2.5 text-slate-500"><X className="w-5 h-5" /></button></div>
        <label className="block text-sm font-semibold text-slate-700">Reminder reason<textarea ref={reasonInput} required maxLength={500} rows={2} placeholder="What should we remind you about?" value={editor.reason} onChange={event => update('reason', event.target.value)} className="mt-2.5 w-full p-2.5 rounded-xl border border-slate-200 focus:outline-orange-500 font-normal" /></label>
        <div className="grid grid-cols-2 gap-2.5"><label className="text-sm font-semibold text-slate-700">Date<input required type="date" value={editor.date} onChange={event => update('date', event.target.value)} className="mt-2.5 w-full min-w-0 p-2.5 border border-slate-200 rounded-xl font-normal" /></label><label className="text-sm font-semibold text-slate-700">Time<input required type="time" value={editor.time} onChange={event => update('time', event.target.value)} className="mt-2.5 w-full min-w-0 p-2.5 border border-slate-200 rounded-xl font-normal" /></label></div>
        <fieldset><legend className="text-sm font-semibold text-slate-700 flex items-center gap-2.5"><Clock className="w-4 h-4" />Notify me</legend><div className="grid grid-cols-3 gap-2.5 mt-2.5">{REMINDER_OFFSETS.map(minutes => <label key={minutes} className={`cursor-pointer rounded-xl border p-2.5 text-center text-sm ${Number(editor.minutesBefore) === minutes ? 'bg-orange-50 border-orange-500 text-orange-700' : 'border-slate-200 text-slate-600'}`}><input type="radio" name="minutesBefore" value={minutes} checked={Number(editor.minutesBefore) === minutes} onChange={() => update('minutesBefore', minutes)} className="sr-only peer" /><span className="peer-focus-visible:underline">{minutes === 0 ? 'At set time' : minutes === 60 ? '1 hr before' : `${minutes} min before`}</span></label>)}</div></fieldset>
        <p className="text-xs text-slate-500">Times use your device timezone. {Capacitor.isNativePlatform() ? 'Enable notification permission for device alerts.' : 'Browser reminders work while the app is open.'}</p>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2.5"><button type="button" disabled={saving} onClick={close} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm">Cancel</button><button disabled={saving} type="submit" className="px-5 py-2.5 rounded-xl bg-orange-600 text-white font-semibold text-sm disabled:opacity-50">{saving ? 'Saving…' : 'Save reminder'}</button></div>
        {!editor.id && (onViewEvents || onCreateEvent) && <div className="flex flex-wrap gap-5 border-t border-slate-100 pt-5 text-sm text-orange-600">{onViewEvents && <button disabled={saving} type="button" onClick={() => { const date = editor.date; close(); onViewEvents(date); }}>View events on this date</button>}{onCreateEvent && <button disabled={saving} type="button" onClick={() => { const date = editor.date; close(); onCreateEvent(date); }}>Create an event</button>}</div>}
      </form>}
    </dialog>
  </>;
}
