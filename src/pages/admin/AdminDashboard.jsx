import { GentizeText } from '../../components/common/GentizeText.jsx';
import { CountryFlags } from '../../components/admin_common/CountryFlags.jsx';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiRequest } from '../../api/client.js';
import { Modal } from '../../components/common/Modal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  Sparkles,
  CalendarDays,
  CalendarCheck,
  Building2,
  Video,
  PhoneCall,
  Globe,
  Tag,
  Eye,
  Check,
  Ban,
  RefreshCw,
  Navigation,
  ExternalLink,
  Sunrise,
  Sun,
  Plus,
  ChevronDown
} from 'lucide-react';
import {
  TIMEZONE_OPTIONS,
  DEFAULT_TIMEZONE_ID,
  getTimezoneById,
  formatTimeForZone,
  formatDateForZone,
} from '../../utils/timezoneUtils.js';
import { CustomTimePicker } from '../../components/common/CustomTimePicker.jsx';

const MD_CABIN_MAPS_URL = 'https://maps.app.goo.gl/NYhvrAEYn4mps6kLA';

export function AdminDashboard({ setTab, onOpenCreateSchedule, target = 'MD' }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [stateFilter, setStateFilter] = useState('ALL'); // 'ALL', 'BOOKED', 'AVAILABLE', 'CANCELLED'
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Dynamic Greeting based on current time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };
  const greeting = getGreeting();

  // Dynamic Admin Display Name
  const adminDisplayName = (user?.name && user.name !== 'Admin Manager')
    ? user.name
    : 'Gentize';

  // Selected Timezone
  const [selectedTzId, setSelectedTzId] = useState(() => {
    return localStorage.getItem('admin_selected_timezone') || DEFAULT_TIMEZONE_ID;
  });
  const [tzDropdownOpen, setTzDropdownOpen] = useState(false);
  const tzDropdownRef = useRef(null);

  useEffect(() => {
    if (!tzDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (tzDropdownRef.current && !tzDropdownRef.current.contains(e.target)) {
        setTzDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [tzDropdownOpen]);

  const activeTimezone = useMemo(() => {
    return getTimezoneById(selectedTzId);
  }, [selectedTzId]);

  const handleTimezoneChange = (tzId) => {
    setSelectedTzId(tzId);
    try {
      localStorage.setItem('admin_selected_timezone', tzId);
    } catch {
      // ignore
    }
  };

  // Live time & date for selected timezone
  const [currentTime, setCurrentTime] = useState(() => {
    return formatTimeForZone(new Date(), activeTimezone.timeZone);
  });
  const [currentDateStr, setCurrentDateStr] = useState(() => {
    return formatDateForZone(new Date(), activeTimezone.timeZone);
  });

  const formatDateYMD = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = formatDateYMD(new Date());

  // Calendar Date State for Month Navigator & Selected Date
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(formatTimeForZone(now, activeTimezone.timeZone));
      setCurrentDateStr(formatDateForZone(now, activeTimezone.timeZone));
    };
    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, [activeTimezone]);

  const fetchCalendarData = async () => {
    try {
      setRefreshing(true);
      const res = await apiRequest(`/admin/calendar?target=${target}`);
      setItems(res.items || []);
    } catch (err) {
      console.error('Failed to load dashboard calendar data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
    const interval = setInterval(fetchCalendarData, 4000);
    const handleUpdate = () => fetchCalendarData();
    window.addEventListener('gentize_notifications_updated', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('gentize_notifications_updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, [target]);

  // Quick Nav Helpers for Month
  const handlePrevMonth = () => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() - 1);
    setCurrentDate(next);
  };

  const handleNextMonth = () => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(formatDateYMD(now));
  };

  // Monthly Calendar Generator
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun
  const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Mon is 0
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const monthCells = useMemo(() => {
    const daysArray = [];

    // Prev month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = adjustedFirstDay - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      daysArray.push({ date: d, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const d = new Date(year, month, i);
      daysArray.push({ date: d, isCurrentMonth: true });
    }

    // Next month padding to fill grid (35 or 42 cells)
    const targetLength = daysArray.length > 35 ? 42 : 35;
    const remaining = targetLength - daysArray.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      daysArray.push({ date: d, isCurrentMonth: false });
    }

    return daysArray;
  }, [year, month, adjustedFirstDay, totalDaysInMonth]);

  // Distinct Set of Dates with Booked Slots
  const datesWithBookings = useMemo(() => {
    const set = new Set();
    items.forEach((item) => {
      if (item.state === 'Booked' || item.state === 'Completed' || item.state === 'Pending' || item.bookingId) {
        set.add(item.date);
      }
    });
    return set;
  }, [items]);

  // Distinct Set of Dates with Available/Open Slots
  const datesWithAvailable = useMemo(() => {
    const set = new Set();
    items.forEach((item) => {
      if (item.state === 'Available') {
        set.add(item.date);
      }
    });
    return set;
  }, [items]);

  // Items for Currently Selected Date
  const selectedDateItems = useMemo(() => {
    return items.filter((item) => {
      const matchesDate = item.date === selectedDateStr;
      if (stateFilter === 'ALL') return matchesDate;
      if (stateFilter === 'BOOKED') return matchesDate && (item.state === 'Booked' || item.state === 'Completed' || item.state === 'Pending');
      if (stateFilter === 'AVAILABLE') return matchesDate && item.state === 'Available';
      if (stateFilter === 'CANCELLED') return matchesDate && item.state === 'Cancelled';
      return matchesDate;
    });
  }, [items, selectedDateStr, stateFilter]);

  // Quick stats for selected date
  const dateStats = useMemo(() => {
    const total = items.filter(i => i.date === selectedDateStr).length;
    const booked = items.filter(i => i.date === selectedDateStr && (i.state === 'Booked' || i.state === 'Completed' || i.state === 'Pending')).length;
    const available = items.filter(i => i.date === selectedDateStr && i.state === 'Available').length;
    const cancelled = items.filter(i => i.date === selectedDateStr && i.state === 'Cancelled').length;
    return { total, booked, available, cancelled };
  }, [items, selectedDateStr]);

  // Formatted date string for selected date
  const selectedDateFormatted = useMemo(() => {
    try {
      const parts = selectedDateStr.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (_) {
      return selectedDateStr;
    }
  }, [selectedDateStr]);

  // Booked appointments on selected date
  const selectedDateBookings = useMemo(() => {
    return items.filter(
      i => i.date === selectedDateStr && (i.state === 'Booked' || i.state === 'Completed' || i.state === 'Pending')
    );
  }, [items, selectedDateStr]);

  const bookedPercent = dateStats.total > 0 ? Math.round((dateStats.booked / dateStats.total) * 100) : 0;

  // Session breakdown by morning/afternoon
  const sessionWindows = useMemo(() => {
    const dayItems = items.filter(i => i.date === selectedDateStr);
    const morningSlots = dayItems.filter(i => (i.time || '').includes('AM'));
    const afternoonSlots = dayItems.filter(i => (i.time || '').includes('PM'));
    return {
      morningTotal: morningSlots.length,
      morningBooked: morningSlots.filter(i => i.state === 'Booked' || i.state === 'Completed' || i.state === 'Pending').length,
      morningAvailable: morningSlots.filter(i => i.state === 'Available').length,
      afternoonTotal: afternoonSlots.length,
      afternoonBooked: afternoonSlots.filter(i => i.state === 'Booked' || i.state === 'Completed' || i.state === 'Pending').length,
      afternoonAvailable: afternoonSlots.filter(i => i.state === 'Available').length,
    };
  }, [items, selectedDateStr]);

  // Quick Block Out of Office State
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockForm, setBlockForm] = useState({
    date: todayStr,
    isAllDay: true,
    startTime: '13:00',
    endTime: '17:00',
    reason: 'Out of Office / Busy',
  });
  const [blocking, setBlocking] = useState(false);

  const handleBlockSlots = async (e) => {
    e.preventDefault();
    setBlocking(true);
    try {
      const payload = {
        date: blockForm.date,
        reason: blockForm.reason || 'Out of Office / Busy',
      };
      if (!blockForm.isAllDay) {
        payload.startTime = blockForm.startTime;
        payload.endTime = blockForm.endTime;
      }

      const res = await apiRequest('/admin/block-slots', {
        method: 'POST',
        body: payload,
      });

      alert(res.message || 'Free slots blocked successfully.');
      setIsBlockModalOpen(false);
      await fetchCalendarData();
    } catch (err) {
      alert(err.message || 'Failed to block slots.');
    } finally {
      setBlocking(false);
    }
  };

  const handleQuickConfirm = async (bookingId) => {
    try {
      setActionLoadingId(bookingId);
      await apiRequest(`/admin/bookings/${bookingId}/confirm`, { method: 'POST' });
      await fetchCalendarData();
    } catch (err) {
      alert(err.message || 'Failed to confirm booking');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-72 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Header: Welcome Banner + Live Time Pills */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 font-semibold text-[11px] uppercase tracking-wider border border-orange-200/60">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              <GentizeText>{adminDisplayName.toUpperCase()}</GentizeText> EXECUTIVE WORKSPACE
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
            {greeting}, <GentizeText logo>{adminDisplayName}</GentizeText> <span className="inline-block">👋</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Monitor real-time appointments, master calendar availability, and attendee bookings.
          </p>
        </div>

        {/* Live Date, Time & Timezone Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Custom Styled Timezone / Country Selector Dropdown */}
          <div className="relative" ref={tzDropdownRef}>
            <button
              type="button"
              onClick={() => setTzDropdownOpen(!tzDropdownOpen)}
              className="h-9 inline-flex items-center gap-2 px-3 bg-white hover:bg-orange-50/50 border border-slate-200/90 hover:border-orange-300 rounded-xl shadow-2xs text-xs font-semibold text-slate-700 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              title="Select Country / Timezone"
              aria-label="Select Country"
            >
              <CountryFlags timezone={activeTimezone} />
              <span className="font-bold text-slate-800">{activeTimezone.country}</span>
              <span className="text-[10px] font-medium text-slate-400 font-mono">(<GentizeText>{activeTimezone.shortName}</GentizeText>)</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${tzDropdownOpen ? 'rotate-180 text-orange-500' : ''}`} />
            </button>

            {tzDropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-orange-950/10 border border-orange-100/80 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-80 overflow-y-auto">
                <div className="px-3 py-1.5 border-b border-slate-100 mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Select Country / Zone</span>
                  <span className="text-[10px] text-orange-600 font-medium font-semibold">{TIMEZONE_OPTIONS.length} Regions</span>
                </div>
                <div className="space-y-0.5 px-1">
                  {TIMEZONE_OPTIONS.map((tz) => {
                    const isSelected = tz.id === selectedTzId;
                    return (
                      <button
                        key={tz.id}
                        type="button"
                        onClick={() => {
                          handleTimezoneChange(tz.id);
                          setTzDropdownOpen(false);
                        }}
                        className={`w-full px-2.5 py-2 rounded-xl text-left text-xs flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-orange-500 text-white font-bold shadow-xs'
                            : 'text-slate-700 hover:bg-orange-50 hover:text-orange-700 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <CountryFlags timezone={tz} />
                          <span className="truncate">{tz.country}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            isSelected ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            <GentizeText>{tz.shortName}</GentizeText>
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Live Date Badge */}
          <div className="h-9 flex items-center gap-2 px-3 bg-white border border-slate-200/80 rounded-xl shadow-2xs text-xs font-semibold text-slate-700">
            <CalendarIcon className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <span>{currentDateStr}</span>
          </div>

          {/* Live Time Badge */}
          <div className="h-9 flex items-center gap-2 px-3 bg-white border border-slate-200/80 rounded-xl shadow-2xs text-xs font-semibold text-slate-700">
            <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <span className="text-slate-900 font-bold">{currentTime}</span>
            <span className="text-[10px] text-orange-600 font-bold px-1.5 py-0.5 bg-orange-50 rounded-md border border-orange-200/60 ml-0.5">
              <GentizeText>{activeTimezone.shortName}</GentizeText>
            </span>
          </div>

          {/* Refresh Dashboard Button */}
          <button
            onClick={fetchCalendarData}
            disabled={refreshing}
            className="h-9 w-9 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-xl transition-all shadow-2xs flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
            title="Refresh Dashboard"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Primary Action Toolbar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenCreateSchedule}
            className="h-9 px-3.5 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-sm shadow-orange-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Set Working Hours & Slots</span>
          </button>
        </div>

        <button
          onClick={() => {
            setBlockForm(prev => ({ ...prev, date: selectedDateStr }));
            setIsBlockModalOpen(true);
          }}
          className="h-9 px-3.5 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/80 rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
        >
          <Ban className="w-3.5 h-3.5" />
          <span>Quick Block Out of Office</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TOP SECTION: 3 Executive Cards Side-by-Side (From Image 2)                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
        {/* Card 1: Interactive Month Calendar */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 space-y-4 flex flex-col justify-between h-full">
          <div>
            {/* Month Header with < Today > navigation */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-none">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Select a Date
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleToday}
                  className="px-2 py-1 text-[11px] font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200/80 transition cursor-pointer"
                >
                  Today
                </button>
                <button
                  onClick={handlePrevMonth}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 7-Day Column Headers (Mon - Sun) */}
            <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider py-1 border-b border-slate-100 mt-2">
              <div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div><div>Su</div>
            </div>

            {/* Compact Monthly Days Grid */}
            <div className="grid grid-cols-7 gap-1 mt-1">
              {monthCells.map((cell, idx) => {
                const cellStr = formatDateYMD(cell.date);
                const isSelected = selectedDateStr === cellStr;
                const isToday = cellStr === todayStr;
                const hasBooked = datesWithBookings.has(cellStr);
                const hasAvailable = datesWithAvailable.has(cellStr);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedDateStr(cellStr);
                      setCurrentDate(cell.date);
                    }}
                    className="w-9 h-10 sm:w-10 sm:h-11 mx-auto flex flex-col items-center justify-center transition relative group cursor-pointer"
                  >
                    <span className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-xs transition-all ${
                      isSelected
                        ? 'bg-orange-500 text-white font-bold rounded-xl shadow-xs shadow-orange-500/30'
                        : isToday
                        ? 'bg-orange-50 text-slate-900 font-bold border border-orange-200 rounded-xl'
                        : cell.isCurrentMonth
                        ? 'text-slate-800 hover:bg-orange-50/60 font-semibold rounded-xl'
                        : 'text-slate-300 opacity-40 font-normal rounded-xl'
                    }`}>
                      {cell.date.getDate()}
                    </span>

                    {/* Dot Indicator: Orange for Booked, Green for Open Slot */}
                    <div className="flex items-center gap-0.5 mt-0.5 h-1.5">
                      {hasBooked ? (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-orange-500"
                          title="Booked Appointment"
                        />
                      ) : hasAvailable ? (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                          title="Available Slot"
                        />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dot Legend */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold px-1">
            <div className="flex items-center gap-1.5 text-orange-600 font-bold">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span>Booked Slot</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Available Slot</span>
            </div>
          </div>
        </div>

        {/* Card 2: Selected Day Executive Briefing & Capacity Bar */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 space-y-3.5 flex flex-col justify-between h-full">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Day Overview</span>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5">{selectedDateFormatted}</h4>
              </div>
              {selectedDateStr === todayStr ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                  Today
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                  Selected
                </span>
              )}
            </div>

            {/* Quick Filter Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div
                onClick={() => setStateFilter('ALL')}
                className={`p-2 rounded-2xl border transition cursor-pointer ${
                  stateFilter === 'ALL'
                    ? 'bg-orange-50/90 border-orange-300 shadow-2xs'
                    : 'bg-slate-50/70 border-slate-100 hover:bg-slate-100/70'
                }`}
                title="View All Slots for this Date"
              >
                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Total</span>
                <span className="text-base font-extrabold text-slate-900">{dateStats.total}</span>
              </div>
              <div
                onClick={() => setStateFilter('BOOKED')}
                className={`p-2 rounded-2xl border transition cursor-pointer ${
                  stateFilter === 'BOOKED'
                    ? 'bg-orange-100/80 border-orange-400 shadow-2xs'
                    : 'bg-orange-50/40 border-orange-100 hover:bg-orange-100/50'
                }`}
                title="View Booked Slots Only"
              >
                <span className="text-[9px] font-bold text-orange-600 block uppercase tracking-wider">Booked</span>
                <span className="text-base font-extrabold text-orange-600">{dateStats.booked}</span>
              </div>
              <div
                onClick={() => setStateFilter('AVAILABLE')}
                className={`p-2 rounded-2xl border transition cursor-pointer ${
                  stateFilter === 'AVAILABLE'
                    ? 'bg-emerald-100/80 border-emerald-400 shadow-2xs'
                    : 'bg-emerald-50/40 border-emerald-100 hover:bg-emerald-100/50'
                }`}
                title="View Open Available Slots Only"
              >
                <span className="text-[9px] font-bold text-emerald-700 block uppercase tracking-wider">Open</span>
                <span className="text-base font-extrabold text-emerald-600">{dateStats.available}</span>
              </div>
            </div>

            {/* Time-of-Day Windows Breakdown */}
            <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100/90 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Session Distribution
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-slate-100 flex flex-col gap-1 shadow-2xs">
                  <span className="text-slate-600 text-[11px] font-semibold flex items-center gap-1.5">
                    <Sunrise className="w-3.5 h-3.5 text-amber-500" />
                    <span>Morning (AM)</span>
                  </span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-bold text-slate-800">{sessionWindows.morningTotal} Slots</span>
                    <span className="text-[10px] text-orange-600 font-semibold">{sessionWindows.morningBooked} Booked</span>
                  </div>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-100 flex flex-col gap-1 shadow-2xs">
                  <span className="text-slate-600 text-[11px] font-semibold flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-orange-500" />
                    <span>Afternoon (PM)</span>
                  </span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-bold text-slate-800">{sessionWindows.afternoonTotal} Slots</span>
                    <span className="text-[10px] text-orange-600 font-semibold">{sessionWindows.afternoonBooked} Booked</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Day Working Status & Duration */}
            <div className="p-2.5 bg-orange-50/40 rounded-2xl border border-orange-200/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-orange-500" />
                <span className="font-semibold text-slate-700">Custom Working Windows</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-white text-[10px] font-bold text-orange-700 border border-orange-200/80">
                {dateStats.total} Windows
              </span>
            </div>
          </div>

          {/* Daily Booking Capacity Bar */}
          <div className="space-y-1.5 pt-2.5 border-t border-slate-100/80">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500">Day Occupancy</span>
              <span className="text-slate-800 font-bold">{bookedPercent}% Booked</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-300"
                style={{ width: `${bookedPercent}%` }}
              />
              <div
                className="h-full bg-emerald-400/80 transition-all duration-300"
                style={{ width: `${100 - bookedPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
              <span>{dateStats.booked} booked</span>
              <span>{dateStats.available} remaining open</span>
            </div>
          </div>
        </div>

        {/* Card 3: Booked Agenda Briefing & Venue Information */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between h-full">
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 shrink-0 mb-2.5">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-orange-500" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Booked Agenda Briefing</h4>
              </div>
              <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200/80">
                {selectedDateBookings.length} Booked
              </span>
            </div>

            {selectedDateBookings.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-6 text-center space-y-1">
                <p className="text-xs text-slate-600 font-semibold">No booked meetings on this day.</p>
                <p className="text-[11px] text-slate-400">All {dateStats.available} slots are available for booking.</p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 max-h-[190px]">
                {selectedDateBookings.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => setSelectedItem(b)}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-orange-50/60 border border-slate-100 hover:border-orange-200 transition cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center shrink-0">
                        <GentizeText>{b.userName?.charAt(0) || 'U'}</GentizeText>
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-800 group-hover:text-slate-900 truncate">
                          <GentizeText>{b.userName || 'Client'}</GentizeText>
                        </p>
                        <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                          <Clock className="w-3 h-3 text-orange-500" />
                          <span>{b.time}</span>
                          {b.purpose && <span className="truncate">• <GentizeText>{b.purpose}</GentizeText></span>}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-orange-600 bg-white px-2 py-0.5 rounded-md border border-orange-200 shrink-0">
                      Details →
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Venue & Location Quick Pin */}
          <div className="pt-2.5 mt-3 border-t border-slate-100 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-1.5 text-slate-600 font-medium">
              <Building2 className="w-3.5 h-3.5 text-orange-500" />
              <span className="truncate"><GentizeText>Gentize Cabin, Chennai</GentizeText></span>
            </div>
            <a
              href={MD_CABIN_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1"
            >
              <span>Maps</span>
              <Navigation className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM SECTION: Full-Width Slots & Events List (From Image 2)              */}
      {/* ========================================================================= */}
      <div className="w-full bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4 min-h-[500px]">
        {/* Header of Selected Date */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white font-bold flex items-center justify-center shadow-xs shrink-0">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {selectedDateFormatted}
              </h2>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-medium">
                <span>{dateStats.total} Total Slots</span>
                <span>•</span>
                <span className="text-orange-600 font-bold">{dateStats.booked} Booked</span>
                <span>•</span>
                <span className="text-emerald-600 font-bold">{dateStats.available} Available</span>
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            {[
              { id: 'ALL', label: 'All', count: dateStats.total },
              { id: 'BOOKED', label: 'Booked', count: dateStats.booked },
              { id: 'AVAILABLE', label: 'Open', count: dateStats.available },
              { id: 'CANCELLED', label: 'Cancelled', count: dateStats.cancelled },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStateFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  stateFilter === f.id
                    ? 'bg-orange-500 text-white font-bold shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                <GentizeText>{f.label}</GentizeText> ({f.count})
              </button>
            ))}
          </div>
        </div>

        {/* List of Events / Slots for Selected Date */}
        {selectedDateItems.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <CalendarCheck className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No Appointments on this Date</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No slots match the current filter on <strong>{selectedDateStr}</strong>. Click another date on the calendar marked with an amber or green dot.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedDateItems.map((item) => {
              const isBooked = item.state === 'Booked' || item.state === 'Completed';
              const isPending = item.state === 'Pending';
              const isAvailable = item.state === 'Available';
              const isCancelled = item.state === 'Cancelled';
              const isClient = item.bookingSource === 'CLIENT';

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isPending
                      ? 'border-orange-200 bg-white'
                      : isBooked
                      ? 'border-orange-200 bg-white hover:border-orange-200'
                      : isAvailable
                      ? 'border-slate-200 bg-white hover:border-orange-200'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  {/* Left: Time & Attendee Details */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                      isAvailable
                        ? 'bg-orange-500 text-white font-bold'
                        : isPending
                        ? 'bg-orange-500 text-white font-bold'
                        : isClient
                        ? 'bg-orange-500 text-white font-bold'
                        : 'bg-slate-800 text-white font-bold'
                    }`}>
                      <GentizeText>{isAvailable ? 'AS' : item.userName?.charAt(0) || 'U'}</GentizeText>
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                          <span>{item.displayTime || `${item.startTime} - ${item.endTime}`}</span>
                        </span>

                        {/* Status Pill */}
                        {isPending ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-orange-600 border border-orange-200 animate-pulse flex items-center gap-1 font-bold">
                            <Clock className="w-3 h-3 animate-spin text-orange-600" /><GentizeText>
                            Pending Gentize Approval
                          </GentizeText></span>
                        ) : isBooked ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-orange-700 border border-orange-200 font-bold">
                            Booked Slot
                          </span>
                        ) : isAvailable ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Available Slot
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            Cancelled
                          </span>
                        )}

                        {/* Source Pill */}
                        {!isAvailable && item.bookingSource && (
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase border ${
                            isClient
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}>
                            {isClient ? 'Client Booking' : 'User Booking'}
                          </span>
                        )}
                      </div>

                      {/* Title & Attendee Name */}
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 truncate">
                          <GentizeText>{item.userName || 'Available Slot'}</GentizeText>
                        </span>
                        {item.title && (
                          <span className="text-xs text-slate-500 font-medium truncate">
                            — <GentizeText>{item.title}</GentizeText>
                          </span>
                        )}
                      </div>

                      {/* Purpose & Venue Mode */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                        {item.purpose && (
                          <span className="flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                            <Tag className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[180px]"><GentizeText>{item.purpose}</GentizeText></span>
                          </span>
                        )}

                        <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                          {item.location?.includes('Meet') && <Video className="w-3.5 h-3.5 text-orange-600" />}
                          {item.location?.includes('Cabin') && <Building2 className="w-3.5 h-3.5 text-orange-600" />}
                          {item.location?.includes('Phone') && <PhoneCall className="w-3.5 h-3.5 text-orange-600" />}
                          {!item.location?.includes('Meet') && !item.location?.includes('Cabin') && !item.location?.includes('Phone') && (
                            <MapPin className="w-3.5 h-3.5 text-orange-600" />
                          )}
                          <span className="truncate max-w-[140px]"><GentizeText>{item.location || 'Gentize Cabin'}</GentizeText></span>
                          {(item.location?.includes('Cabin') || item.meeting_mode === 'MD_CABIN') && (
                            <a
                              href={MD_CABIN_MAPS_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white text-orange-600 border border-orange-200 font-bold text-[10px] hover:border-orange-300 shrink-0"
                              title="Open in Google Maps"
                            >
                              <Navigation className="w-2.5 h-2.5" />
                              Maps
                            </a>
                          )}
                          {(item.location?.includes('Meet') || item.meeting_mode === 'GOOGLE_MEET') && (item.meeting_link || item.meetingLink) && (
                            <a
                              href={item.meeting_link || item.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white text-orange-600 border border-orange-200 font-bold text-[10px] hover:border-orange-300 shrink-0"
                              title="Join Google Meet"
                            >
                              <Video className="w-2.5 h-2.5" />
                              Meet
                            </a>
                          )}
                        </span>

                        {item.clientPhone && (
                          <span className="flex items-center gap-1 text-slate-600 font-medium">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.clientPhone}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {isPending && item.bookingId && (
                      <button
                        onClick={() => handleQuickConfirm(item.bookingId)}
                        disabled={actionLoadingId === item.bookingId}
                        className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                        title="Confirm Appointment"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm</span>
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedItem(item)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition shadow-2xs flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SCHEDULE / BOOKING DETAIL MODAL */}
      <Modal
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title="Appointment Information"
        maxWidth="max-w-lg"
      >
        {selectedItem && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-extrabold text-base text-slate-900"><GentizeText>{selectedItem.title}</GentizeText></h4>
                <p className="text-xs text-slate-500 font-medium">{selectedItem.date}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {selectedItem.bookingSource && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    selectedItem.bookingSource === 'CLIENT'
                      ? 'bg-orange-50 text-orange-600 border border-orange-200'
                      : 'bg-orange-100 text-orange-600 border border-orange-200'
                  }`}>
                    {selectedItem.bookingSource}
                  </span>
                )}
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                  selectedItem.state === 'Available'
                    ? 'bg-orange-50 text-orange-600 border border-orange-200'
                    : selectedItem.state === 'Cancelled'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-orange-50 text-orange-600 border border-orange-200'
                }`}>
                  {selectedItem.state}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Scheduled Time</span>
                <p className="font-extrabold text-orange-600 text-sm">{selectedItem.displayTime}</p>
                <p className="text-slate-500"><GentizeText>{selectedItem.location}</GentizeText></p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Participant / Client</span>
                <p className="font-bold text-slate-900 text-sm"><GentizeText>{selectedItem.userName}</GentizeText></p>
                {selectedItem.userEmail && <p className="text-slate-500 truncate">{selectedItem.userEmail}</p>}
                {selectedItem.clientPhone && <p className="text-slate-500 font-semibold">{selectedItem.clientPhone}</p>}
              </div>
            </div>

            {selectedItem.purpose && (
              <div className="p-3 bg-orange-50/50 rounded-2xl border border-orange-200/70 text-xs">
                <span className="text-[10px] uppercase font-bold text-orange-600 block mb-0.5">
                  Meeting Purpose / Agenda
                </span>
                <p className="font-bold text-slate-800"><GentizeText>{selectedItem.purpose}</GentizeText></p>
              </div>
            )}

            {/* Location & Meeting Link Details */}
            {(selectedItem.location?.includes('Cabin') || selectedItem.meeting_mode === 'MD_CABIN') && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-orange-600" />
                  <span className="font-medium text-slate-700"><GentizeText>In-Person Meeting at Gentize Cabin</GentizeText></span>
                </div>
                <a
                  href={MD_CABIN_MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-white border border-orange-200 text-orange-600 font-bold rounded-lg text-xs hover:border-orange-300 flex items-center gap-1"
                >
                  <Navigation className="w-3 h-3" />
                  <span>Google Maps</span>
                </a>
              </div>
            )}

            {(selectedItem.location?.includes('Meet') || selectedItem.meeting_mode === 'GOOGLE_MEET') && (selectedItem.meeting_link || selectedItem.meetingLink) && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-orange-600" />
                  <span className="font-medium text-slate-700">Virtual Google Meet Session</span>
                </div>
                <a
                  href={selectedItem.meeting_link || selectedItem.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-orange-500 text-white font-bold rounded-lg text-xs hover:bg-orange-600 flex items-center gap-1 shadow-xs"
                >
                  <Video className="w-3 h-3" />
                  <span>Join Call</span>
                </a>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* QUICK BLOCK OUT OF OFFICE MODAL */}
      <Modal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        title="Block Out of Office / Busy"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleBlockSlots} className="space-y-4">
          <p className="text-xs text-slate-500">
            Instantly mark open slots as blocked or unavailable for a given day or time range.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Date</label>
            <input
              type="date"
              value={blockForm.date}
              onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAllDayBlock"
              checked={blockForm.isAllDay}
              onChange={(e) => setBlockForm({ ...blockForm, isAllDay: e.target.checked })}
              className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="isAllDayBlock" className="text-xs font-medium text-slate-700 cursor-pointer">
              Block entire working day (all slots)
            </label>
          </div>

          {!blockForm.isAllDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time (AM/PM)</label>
                <CustomTimePicker
                  value={blockForm.startTime}
                  onChange={(val) => setBlockForm({ ...blockForm, startTime: val })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">End Time (AM/PM)</label>
                <CustomTimePicker
                  value={blockForm.endTime}
                  onChange={(val) => setBlockForm({ ...blockForm, endTime: val })}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Travel, Executive Review, Personal Leave"
              value={blockForm.reason}
              onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsBlockModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={blocking}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-rose-500/20 cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>{blocking ? 'Blocking...' : 'Block Free Slots'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
