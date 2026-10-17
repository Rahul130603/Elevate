import { GentizeText } from '../../components/common/GentizeText.jsx';
import { CountryFlags } from '../../components/admin_common/CountryFlags.jsx';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiRequest } from '../../api/client.js';
import { Modal } from '../../components/common/Modal.jsx';
import { isTimePassed } from '../../utils/calendarUtils.js';
import {
  CustomTimePicker,
  formatDisplay12Hour,
} from '../../components/common/CustomTimePicker.jsx';
import {
  TIMEZONE_OPTIONS,
  DEFAULT_TIMEZONE_ID,
  getTimezoneById,
} from '../../utils/timezoneUtils.js';
import {
  Plus,
  Clock,
  MapPin,
  User,
  Trash2,
  Calendar,
  AlertCircle,
  Video,
  Building2,
  PhoneCall,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  Globe,
  ChevronDown,
  Check,
} from 'lucide-react';

export function AdminSchedules({ isCreateOpen, setIsCreateOpen, target = 'MD' }) {
  const [schedules, setSchedules] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isOtherLocation, setIsOtherLocation] = useState(false);
  const [customLocation, setCustomLocation] = useState('');

  // Country / Timezone State (Default: India IST Asia/Kolkata)
  const [selectedTzId, setSelectedTzId] = useState(DEFAULT_TIMEZONE_ID);
  const [tzDropdownOpen, setTzDropdownOpen] = useState(false);
  const tzDropdownRef = useRef(null);

  // Timezone selector inside Modal
  const [modalTzOpen, setModalTzOpen] = useState(false);
  const modalTzRef = useRef(null);

  const activeTimezone = useMemo(() => {
    return getTimezoneById(selectedTzId) || TIMEZONE_OPTIONS.find((t) => t.id === 'utc+5:30') || TIMEZONE_OPTIONS[0];
  }, [selectedTzId]);

  // Close timezone dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (tzDropdownRef.current && !tzDropdownRef.current.contains(e.target)) {
        setTzDropdownOpen(false);
      }
      if (modalTzRef.current && !modalTzRef.current.contains(e.target)) {
        setModalTzOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isLead = target === 'SALES_LEAD';

  // Form State - availability setup
  const [form, setForm] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      title: isLead ? 'Sales Team Lead Working Hours & Client Demos' : 'Gentize Available Working Hours',
      description: '',
      assignedUserId: '',
      date: today,
      slotRanges: [
        { id: 1, startTime: '09:00', endTime: '10:00' }
      ],
      slotDuration: 0, // 0 = exact custom window / single slot, no split
      bufferTime: 0,
      location: isLead ? 'Sales Lead Desk / Online' : 'Gentize Office (In-Person)',
      notifyEmail: true,
      notifySms: true,
      reminder24h: true,
      reminder1h: true,
    };
  });

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const [schedRes, usersRes] = await Promise.all([
        apiRequest(`/admin/events?target=${target}`),
        apiRequest('/admin/users'),
      ]);
      setSchedules(schedRes.schedules || []);
      setUsers(usersRes.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  // Filter out expired schedules (past date or elapsed today)
  const activeSchedules = useMemo(() => {
    return schedules.filter((s) => !isTimePassed(s.date, s.end_time || s.endTime));
  }, [schedules]);

  // Compute live slot count across all custom slot ranges
  const slotCount = useMemo(() => {
    try {
      const duration = Number(form.slotDuration) || 0;
      let total = 0;
      for (const range of form.slotRanges) {
        if (!range.startTime || !range.endTime) continue;
        const [sH, sM] = range.startTime.split(':').map(Number);
        const [eH, eM] = range.endTime.split(':').map(Number);
        const startTotal = sH * 60 + sM;
        const endTotal = eH * 60 + eM;
        if (startTotal >= endTotal) continue;

        if (duration <= 0) {
          // Exact slot window / No split = 1 slot per window
          total += 1;
        } else {
          let cur = startTotal;
          while (cur + duration <= endTotal) {
            total++;
            cur += duration;
          }
        }
      }
      return total;
    } catch {
      return 0;
    }
  }, [form.slotRanges, form.slotDuration]);

  // Add another slot range
  const handleAddSlotRange = () => {
    setForm((prev) => {
      const last = prev.slotRanges[prev.slotRanges.length - 1];
      let newStart = '13:00';
      let newEnd = '14:00';
      if (last && last.endTime) {
        const [lastEndH, lastEndM] = last.endTime.split(':').map(Number);
        const nextStartH = Math.min(22, lastEndH + 1);
        const nextEndH = Math.min(23, nextStartH + 1);
        newStart = `${String(nextStartH).padStart(2, '0')}:${String(lastEndM || 0).padStart(2, '0')}`;
        newEnd = `${String(nextEndH).padStart(2, '0')}:${String(lastEndM || 0).padStart(2, '0')}`;
      }
      return {
        ...prev,
        slotRanges: [
          ...prev.slotRanges,
          { id: Date.now(), startTime: newStart, endTime: newEnd },
        ],
      };
    });
  };

  // Remove a slot range
  const handleRemoveSlotRange = (id) => {
    if (form.slotRanges.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      slotRanges: prev.slotRanges.filter((r) => r.id !== id),
    }));
  };

  // Update a slot range
  const handleUpdateSlotRange = (id, field, value) => {
    setForm((prev) => ({
      ...prev,
      slotRanges: prev.slotRanges.map((r) =>
        r.id === id ? { ...r, [field]: value } : r
      ),
    }));
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const finalLocation = isOtherLocation
        ? customLocation.trim() || 'Custom Location'
        : form.location;

      const validRanges = form.slotRanges.filter(
        (r) => r.startTime && r.endTime && r.startTime < r.endTime
      );

      if (validRanges.length === 0) {
        throw new Error('Please configure at least one valid slot range with End Time later than Start Time.');
      }

      const sortedStarts = [...validRanges].map((r) => r.startTime).sort();
      const sortedEnds = [...validRanges].map((r) => r.endTime).sort();

      await apiRequest('/admin/events', {
        method: 'POST',
        body: {
          ...form,
          bookingTarget: target,
          location: finalLocation,
          startTime: sortedStarts[0],
          endTime: sortedEnds[sortedEnds.length - 1],
          slotRanges: validRanges.map((r) => ({
            startTime: r.startTime,
            endTime: r.endTime,
          })),
          slotDuration: Number(form.slotDuration) || 0,
          bufferTime: 0,
          assignedUserId: form.assignedUserId || null,
          timezone: selectedTzId,
          notifyEmail: true,
          notifySms: true,
          reminder24h: true,
          reminder1h: true,
        },
      });
      setIsCreateOpen(false);
      setIsOtherLocation(false);
      setCustomLocation('');
      await fetchSchedules();
    } catch (err) {
      setError(err.message || 'Failed to create schedule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSchedule = async (id) => {
    if (
      !window.confirm(
        'Are you sure you want to cancel this schedule? All related bookings will be cancelled and slots freed.'
      )
    )
      return;
    try {
      await apiRequest(`/admin/events/${id}`, { method: 'DELETE' });
      await fetchSchedules();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCloseModal = () => {
    setIsCreateOpen(false);
    setIsOtherLocation(false);
    setCustomLocation('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Schedules & Availability</h1>
          <p className="text-sm text-slate-500 mt-1">Configure appointment windows and automated slot generation.</p>
        </div>

        {/* Action Controls: Set Working Hours Button */}
        <div className="flex items-center gap-2.5">
          {/* Set Working Hours / Add Schedule Button */}
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider transition shadow-md shadow-orange-400/25 flex items-center gap-2 active:scale-95 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Set Working Hours</span>
          </button>
        </div>
      </div>

      {/* Schedules List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400 font-bold text-sm">
            Loading schedules...
          </div>
        ) : activeSchedules.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 font-bold text-sm border-2 border-dashed border-slate-200 rounded-3xl">
            No active schedules created yet. Click "Set Working Hours" to open booking availability.
          </div>
        ) : (
          activeSchedules.map((s) => (
            <div
              key={s.id}
              className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-orange-200 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-extrabold text-slate-900 text-base leading-snug group-hover:text-orange-600 transition">
                    <GentizeText>{s.title}</GentizeText>
                  </h3>
                  <button
                    onClick={() => handleCancelSchedule(s.id)}
                    title="Cancel this schedule"
                    className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {s.description && (
                  <p className="text-xs text-slate-500 line-clamp-2"><GentizeText>{s.description}</GentizeText></p>
                )}

                <div className="space-y-1.5 pt-1 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-orange-500" />
                    <span className="font-bold">{s.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-orange-500" />
                    <span className="font-semibold text-slate-800">
                      {formatDisplay12Hour(s.start_time || s.startTime)} – {formatDisplay12Hour(s.end_time || s.endTime)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-orange-500" />
                    <span><GentizeText>{s.location}</GentizeText></span>
                  </div>
                  {s.assigned_user_name && (
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-orange-500" />
                      <span>
                        Assigned: <strong><GentizeText>{s.assigned_user_name}</GentizeText></strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Booked Slots Status */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 font-bold text-xs border border-orange-200/60">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    <span>{s.booked_slots ?? s.bookedSlots ?? 0} Slots Booked</span>
                  </span>
                </div>
                {(s.available_slots ?? s.availableSlots ?? 0) > 0 && (
                  <span className="text-[11px] text-slate-400 font-medium">
                    {s.available_slots ?? s.availableSlots ?? 0} Open
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* COMPACT & USER-FRIENDLY AVAILABILITY MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={handleCloseModal}
        title="Set Available Working Hours & Schedule"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateSchedule} className="space-y-3.5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Basic Information (Compact 2-col) */}
          <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-orange-500 text-white flex items-center justify-center text-[11px] font-bold">
                  1
                </span>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Basic Information
                </h4>
              </div>
              <span className="text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/60">
                <GentizeText>{isLead ? 'Sales Lead' : 'Admin Gentize'}</GentizeText>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Schedule Title *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Working Hours & Demos"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-400/30 focus:border-orange-500 transition shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Assigned Staff / Assistant
                </label>
                <select
                  value={form.assignedUserId}
                  onChange={(e) => setForm({ ...form, assignedUserId: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-400/30 focus:border-orange-500 transition shadow-2xs"
                >
                  <option value="">👥 All Users & Public Clients</option>
                  {users
                    .filter((u) => u.role === 'USER')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        👤 {u.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Date, Timezone & Custom Slot Windows */}
          <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-orange-500 text-white flex items-center justify-center text-[11px] font-bold">
                  2
                </span>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Date & Working Slots
                </h4>
              </div>

              {/* Right controls: [ Timezone Pill (Image 3) ] [ + Add ] */}
              <div className="flex items-center gap-2">
                {/* Timezone Dropdown Pill (Image 3 style) to the left of + Add */}
                <div className="relative" ref={modalTzRef}>
                  <button
                    type="button"
                    onClick={() => setModalTzOpen(!modalTzOpen)}
                    className="h-7 inline-flex items-center gap-1.5 px-2.5 bg-white hover:bg-orange-50/60 border border-slate-200/90 hover:border-orange-300 rounded-full text-xs font-semibold text-slate-700 transition shadow-2xs cursor-pointer"
                    title="Change Timezone"
                  >
                    <CountryFlags timezone={activeTimezone} />
                    <span className="font-bold text-slate-800 text-[11px]">{activeTimezone.country}</span>
                    <span className="text-[10px] text-slate-400 font-mono">(<GentizeText>{activeTimezone.shortName}</GentizeText>)</span>
                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${modalTzOpen ? 'rotate-180 text-orange-500' : ''}`} />
                  </button>

                  {modalTzOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-60 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-orange-950/15 border border-orange-200 py-1 z-50 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95">
                      <div className="px-3 py-1 border-b border-slate-100 mb-1 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Select Zone</span>
                        <span className="text-[10px] text-orange-600 font-bold">{TIMEZONE_OPTIONS.length} Regions</span>
                      </div>
                      <div className="space-y-0.5 px-1">
                        {TIMEZONE_OPTIONS.map((tz) => {
                          const isSelected = tz.id === selectedTzId;
                          return (
                            <button
                              key={tz.id}
                              type="button"
                              onClick={() => {
                                setSelectedTzId(tz.id);
                                setModalTzOpen(false);
                              }}
                              className={`w-full px-2 py-1.5 rounded-xl text-left text-xs flex items-center justify-between transition-all cursor-pointer ${
                                isSelected ? 'bg-orange-500 text-white font-bold shadow-xs' : 'text-slate-700 hover:bg-orange-50 hover:text-orange-700 font-medium'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <CountryFlags timezone={tz} />
                                <span className="truncate text-xs">{tz.country}</span>
                              </div>
                              <span className={`text-[10px] px-1 py-0.2 rounded font-mono shrink-0 ml-1 ${isSelected ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                <GentizeText>{tz.shortName}</GentizeText>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* + Add Button */}
                <button
                  type="button"
                  onClick={handleAddSlotRange}
                  className="h-7 inline-flex items-center gap-1 px-3 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 hover:border-orange-300 rounded-full text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-orange-600 stroke-[3]" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Target Date Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider shrink-0">
                  Target Date:
                </label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-48 px-3 py-1 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-400/30 focus:border-orange-500 transition shadow-2xs"
                />
              </div>

              <span className="text-[10px] text-slate-500 font-medium">
                Timezone: <strong className="text-slate-800">{activeTimezone.country} (<GentizeText>{activeTimezone.shortName}</GentizeText>)</strong>
              </span>
            </div>

            {/* Configured Slot Windows - Directly under the timezone & date */}
            <div className="space-y-2 pt-1">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Working Slot Ranges ({form.slotRanges.length} Window{form.slotRanges.length > 1 ? 's' : ''}) in <GentizeText>{activeTimezone.shortName}</GentizeText></span>
                <span className="text-[10px] text-orange-600 font-semibold">12-hour AM/PM</span>
              </div>

              <div className="space-y-1.5">
                {form.slotRanges.map((range, idx) => (
                  <div
                    key={range.id}
                    className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-orange-200 transition-all flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                  >
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="w-5 h-5 rounded-md bg-orange-100 text-orange-700 text-[10px] font-extrabold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <span className="text-[11px] font-bold text-slate-700">Slot:</span>
                    </div>

                    <div className="flex-1 grid grid-cols-2 gap-2 items-center">
                      <CustomTimePicker
                        compact={true}
                        value={range.startTime}
                        onChange={(val) => handleUpdateSlotRange(range.id, 'startTime', val)}
                      />
                      <CustomTimePicker
                        compact={true}
                        value={range.endTime}
                        onChange={(val) => handleUpdateSlotRange(range.id, 'endTime', val)}
                      />
                    </div>

                    <div className="flex items-center justify-between sm:justify-start gap-1.5 shrink-0">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-200 font-mono">
                        <GentizeText>{activeTimezone.shortName}</GentizeText>
                      </span>

                      {form.slotRanges.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSlotRange(range.id)}
                          className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Remove this slot window"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Compact Add Another Slot Window Button */}
              <button
                type="button"
                onClick={handleAddSlotRange}
                className="w-full py-1.5 border border-dashed border-orange-200 hover:border-orange-400 bg-orange-50/30 hover:bg-orange-50 text-orange-600 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Slot Window</span>
              </button>
            </div>
          </div>

          {/* Section 3: Meeting Mode & Location (Compact Pill Row) */}
          <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-orange-500 text-white flex items-center justify-center text-[11px] font-bold">
                  3
                </span>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Meeting Mode & Location
                </h4>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'Gentize Office (In-Person)', title: 'Gentize Office', icon: Building2 },
                { id: 'Google Meet (Video Call)', title: 'Google Meet', icon: Video },
                { id: 'Direct Phone Call', title: 'Direct Phone', icon: PhoneCall },
                { id: 'Main Boardroom', title: 'Boardroom', icon: Briefcase },
                { id: 'Other', title: 'Custom / Link', icon: MapPin },
              ].map((loc) => {
                const Icon = loc.icon;
                const isSelected =
                  loc.id === 'Other'
                    ? isOtherLocation
                    : !isOtherLocation && form.location === loc.id;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => {
                      if (loc.id === 'Other') {
                        setIsOtherLocation(true);
                        setForm((prev) => ({
                          ...prev,
                          location: customLocation.trim() || 'Other',
                        }));
                      } else {
                        setIsOtherLocation(false);
                        setForm((prev) => ({ ...prev, location: loc.id }));
                      }
                    }}
                    className={`py-1.5 px-2.5 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'border-orange-300 bg-orange-50/90 ring-1 ring-orange-400 font-bold text-orange-900 shadow-2xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 shadow-2xs'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-orange-600' : 'text-slate-500'}`} />
                    <span className="text-[11px] truncate"><GentizeText>{loc.title}</GentizeText></span>
                  </button>
                );
              })}
            </div>

            {/* Custom Location / Link Typing Area */}
            {isOtherLocation && (
              <div className="pt-1 space-y-1">
                <input
                  type="text"
                  required={isOtherLocation}
                  autoFocus
                  value={customLocation}
                  onChange={(e) => {
                    setCustomLocation(e.target.value);
                    setForm((prev) => ({ ...prev, location: e.target.value }));
                  }}
                  placeholder="e.g. Zoom Link, Gentize Residence, Chennai Branch..."
                  className="w-full px-3 py-1.5 bg-white border-2 border-orange-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-400/30 focus:border-orange-500 transition shadow-2xs"
                />
              </div>
            )}
          </div>

          {/* Action Footer: Slot Summary Badge + Publish CTA */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span>
                Total Slots:{' '}
                <strong className="text-orange-600 font-extrabold">{slotCount} {slotCount === 1 ? 'Slot' : 'Slots'} Ready</strong>
                {' '}in <GentizeText>{activeTimezone.shortName}</GentizeText>
              </span>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || slotCount === 0}
                className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 transition shadow-md shadow-orange-400/25 flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <CalendarCheck className="w-3.5 h-3.5" />
                    <span>Publish Schedule ({slotCount} {slotCount === 1 ? 'Slot' : 'Slots'})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
