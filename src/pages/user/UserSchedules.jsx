import { GentizeText } from '../../components/common/GentizeText.jsx';
import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client.js';
import { Calendar, Clock, MapPin, ArrowRight, RefreshCw, CalendarCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { BookScheduleModal } from './BookScheduleModal.jsx';

export function UserSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const fetchSchedules = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await apiRequest('/user/schedules');
      setSchedules(res.schedules || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
    const interval = setInterval(() => {
      fetchSchedules(true);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const isScheduleActive = (s) => {
    if (!s.date) return false;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    // 1. Past dates are excluded
    if (s.date < todayStr) return false;

    // 2. Today: check if end_time has passed or all slots have elapsed
    if (s.date === todayStr) {
      const curHour = String(now.getHours()).padStart(2, '0');
      const curMin = String(now.getMinutes()).padStart(2, '0');
      const curTime = `${curHour}:${curMin}`;
      if (s.end_time && s.end_time <= curTime) return false;
      if (s.available_slots === 0) return false;
    }

    return true;
  };

  const activeSchedules = schedules.filter(isScheduleActive);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Available Schedules</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200"><GentizeText>
              Gentize Working Hours
            </GentizeText></span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1"><GentizeText>
            Select an active working schedule created by the Admin/Gentize to browse and book open slots.
          </GentizeText></p>
        </div>

        <button
          onClick={fetchSchedules}
          className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition shadow-2xs cursor-pointer active:scale-95"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 text-orange-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {toastMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between text-xs font-bold shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="cursor-pointer">✕</button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-orange-950">Loading Available Schedules...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {activeSchedules.map((s) => (
            <div
              key={s.id}
              className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group hover:border-orange-200"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200">
                    {s.slot_duration} Minutes
                  </span>
                  <span className={`text-xs font-bold ${s.available_slots > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {s.available_slots} slots open
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-orange-600 transition-colors">
                  <GentizeText>{s.title}</GentizeText>
                </h3>
                {s.location && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1"><GentizeText>{s.location}</GentizeText></p>
                )}

                <div className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-orange-500" />
                    <span className="font-semibold text-slate-800">{s.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-orange-500" />
                    <span>{s.displayStart} – {s.displayEnd}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-orange-500" />
                    <span className="truncate"><GentizeText>{s.location || 'Gentize Cabin (In-Person)'}</GentizeText></span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedScheduleId(s.id)}
                className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition active:scale-95 cursor-pointer"
              >
                <span>View Available Slots</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {activeSchedules.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200/90 space-y-2">
              <CalendarCheck className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No schedules open for booking</p>
              <p className="text-xs text-slate-400"><GentizeText>All past schedules have concluded. Check back when new working hours are published by the Gentize.</GentizeText></p>
            </div>
          )}
        </div>
      )}

      {selectedScheduleId && (
        <BookScheduleModal
          scheduleId={selectedScheduleId}
          onClose={() => setSelectedScheduleId(null)}
          onBookingSuccess={(msg) => {
            setSelectedScheduleId(null);
            setToastMsg(msg);
            fetchSchedules();
            setTimeout(() => setToastMsg(null), 5000);
          }}
        />
      )}
    </div>
  );
}
