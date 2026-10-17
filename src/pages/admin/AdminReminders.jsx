import React, { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronLeft, ChevronRight, Clock, CalendarCheck, CheckCircle2 } from 'lucide-react';
import CalendarGrid from '../../components/calendar/CalendarGrid.jsx';
import ReminderCalendar from '../../components/calendar/ReminderCalendar.jsx';
import { readReminders, REMINDERS_CHANGED } from '../../services/personalReminderService.js';
import { localDate } from '../../utils/reminderUtils.js';

export function AdminReminders() {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(localDate);
  const [selection, setSelection] = useState(null);
  const [reminders, setReminders] = useState(readReminders);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const sync = () => { setReminders(readReminders()); setNow(Date.now()); };
    const timer = setInterval(() => setNow(Date.now()), 60000);
    window.addEventListener(REMINDERS_CHANGED, sync);
    window.addEventListener('storage', sync);
    return () => { clearInterval(timer); window.removeEventListener(REMINDERS_CHANGED, sync); window.removeEventListener('storage', sync); };
  }, []);
  const calendarReminders = useMemo(() => reminders.filter(reminder => !reminder.delivered && !reminder.isTest).map(reminder => ({
    id: reminder.id, title: reminder.reason, startDate: reminder.date, endDate: reminder.date,
    startTime: reminder.time, endTime: reminder.time,
  })), [reminders]);
  const personalReminders = reminders.filter(reminder => !reminder.isTest);
  const upcoming = personalReminders.filter(reminder => !reminder.delivered && Date.parse(reminder.notifyAt) > now).sort((a, b) => Date.parse(a.notifyAt) - Date.parse(b.notifyAt));
  const nextReminder = upcoming[0];
  const summary = [
    { label: 'Today', count: personalReminders.filter(reminder => reminder.date === localDate(new Date(now))).length, icon: CalendarCheck },
    { label: 'Upcoming', count: upcoming.length, icon: Clock },
    { label: 'Notified', count: personalReminders.filter(reminder => reminder.delivered).length, icon: CheckCircle2 },
  ];
  const selectDate = date => { setSelectedDate(date); setSelection({ date }); };
  const moveMonth = offset => setMonth(previous => new Date(previous.getFullYear(), previous.getMonth() + offset, 1));
  const today = () => { const now = new Date(); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); setSelectedDate(localDate(now)); };
  return <div className="w-full max-w-[1150px] mx-auto space-y-2.5 sm:space-y-5">
    <header className="flex items-center justify-between gap-2.5">
      <div><h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5"><Bell className="w-5 h-5 text-orange-600" />Reminders</h1><p className="text-xs text-slate-500 mt-1">Choose a date to set a reminder.</p></div>
      <button onClick={() => selectDate(selectedDate || localDate())} className="px-2.5 sm:px-5 py-2.5 rounded-xl bg-orange-600 text-white text-xs sm:text-sm font-semibold shrink-0">+ New reminder</button>
    </header>
    <div className="grid grid-cols-3 gap-2.5 sm:gap-5" aria-label="Reminder summary">
      {summary.map(({ label, count, icon: Icon }) => <div key={label} className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl px-2.5 sm:px-5 py-2.5">
        <span className="hidden sm:flex items-center justify-center w-[35px] h-[35px] rounded-xl bg-orange-50 text-orange-600"><Icon className="w-5 h-5" /></span>
        <div className="flex-1 flex items-center justify-between gap-2.5"><p className="text-xs text-slate-500">{label}</p><p className="text-lg font-bold text-slate-900">{count}</p></div>
      </div>)}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-2.5 sm:gap-5 items-start">
      <section aria-label="Reminder calendar" className="min-w-0">
        <div className="flex items-center justify-between gap-2.5 mb-2.5">
          <div className="inline-flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl p-1">
            <button aria-label="Previous month" onClick={() => moveMonth(-1)} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-xs font-semibold min-w-[110px] text-center">{month.toLocaleDateString([], { month: 'long', year: 'numeric' })}</span>
            <button aria-label="Next month" onClick={() => moveMonth(1)} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <button onClick={today} className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold">Today</button>
        </div>
        <CalendarGrid compact year={month.getFullYear()} month={month.getMonth()} events={calendarReminders} selectedDate={selectedDate} onDayClick={selectDate} />
        <p className="text-xs text-slate-500 mt-1">Dots mark upcoming reminders.</p>
      </section>
      <div className="min-w-0 space-y-2.5 sm:space-y-5">
        <ReminderCalendar compact selection={selection} onClose={() => setSelection(null)} />
        <section className="hidden md:block rounded-2xl border border-orange-100 bg-orange-50 p-5" aria-label="Next reminder">
          <h2 className="flex items-center gap-2.5 text-sm font-semibold text-orange-700"><Clock className="w-4 h-4" />Next reminder</h2>
          {nextReminder ? <>
            <p className="text-lg font-bold text-slate-900 mt-2.5 break-words line-clamp-2" title={nextReminder.reason}>{nextReminder.reason}</p>
            <p className="text-sm text-slate-600 mt-2.5">{new Date(nextReminder.eventAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
            <p className="text-xs text-slate-500 mt-1">Notification {nextReminder.minutesBefore ? `${nextReminder.minutesBefore} minutes before` : 'at the set time'}</p>
            <button className="mt-2.5 text-sm font-semibold text-orange-700" onClick={() => { const date = new Date(`${nextReminder.date}T12:00:00`); setMonth(new Date(date.getFullYear(), date.getMonth(), 1)); setSelectedDate(nextReminder.date); }}>View date →</button>
          </> : <>
            <p className="text-lg font-bold text-slate-900 mt-2.5">You're all caught up</p>
            <p className="text-sm text-slate-600 mt-2.5">Choose a calendar date to plan your next reminder.</p>
          </>}
        </section>
      </div>
    </div>
  </div>;
}
