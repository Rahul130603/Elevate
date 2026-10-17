import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { deliverDueReminders, restoreDeviceReminders } from '../../services/personalReminderService.js';
import { deliverRoutineReminders, restoreRoutines } from '../../services/dailyRoutineService.js';

export default function ReminderAlert() {
  const [alerts, setAlerts] = useState([]);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    let listener;
    const restore = () => {
      restoreDeviceReminders().catch(error => console.warn('Restore reminders:', error.message));
      restoreRoutines().catch(error => console.warn('Restore routines:', error.message));
    };
    restore();
    App.addListener('appStateChange', ({ isActive }) => { if (isActive) restore(); }).then(handle => {
      if (disposed) handle.remove(); else listener = handle;
    });
    return () => { disposed = true; listener?.remove(); };
  }, []);
  useEffect(() => {
    const check = () => {
      const due = [...deliverDueReminders(), ...deliverRoutineReminders()];
      if (due.length) setAlerts(previous => [...previous, ...due].slice(-5));
    };
    check();
    const timer = setInterval(check, 1000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  return <div className="fixed top-5 right-5 z-[200] w-[min(350px,calc(100vw-40px))] space-y-2.5" aria-live="assertive">
    {alerts.map(reminder => <div key={reminder.id} className="bg-white border border-orange-200 rounded-2xl shadow-lg p-5 flex items-start gap-2.5">
      <Bell className="w-5 h-5 text-orange-600 shrink-0" />
      <div className="flex-1 min-w-0"><p className="font-bold text-slate-900">Reminder</p><p className="text-sm text-slate-700 break-words">{reminder.reason}</p><p className="text-xs text-slate-500 mt-2.5">{new Date(reminder.eventAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p></div>
      <button aria-label="Dismiss reminder" onClick={() => setAlerts(previous => previous.filter(r => r.id !== reminder.id))}><X className="w-5 h-5 text-slate-500" /></button>
    </div>)}
  </div>;
}
