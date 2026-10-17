import { GentizeText } from '../../components/common/GentizeText.jsx';
import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../../api/client.js';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Plus,
  User,
  Sparkles,
  ArrowRight,
  FileText,
  Info,
  CalendarDays,
  XCircle,
  Briefcase,
  AlertCircle,
  Lock,
  Eye,
  Building2,
  Phone,
  Mail,
  Zap,
  ChevronDown,
} from 'lucide-react';

const COUNTRY_CONFIG = {
  '+91': { name: 'India', flag: '🇮🇳', digits: 10 },
  '+1': { name: 'USA/Canada', flag: '🇺🇸', digits: 10 },
  '+44': { name: 'UK', flag: '🇬🇧', digits: 10 },
  '+971': { name: 'UAE', flag: '🇦🇪', digits: 9 },
  '+65': { name: 'Singapore', flag: '🇸🇬', digits: 8 },
  '+61': { name: 'Australia', flag: '🇦🇺', digits: 9 },
  '+966': { name: 'Saudi Arabia', flag: '🇸🇦', digits: 9 },
  '+49': { name: 'Germany', flag: '🇩🇪', digits: 11 },
  '+60': { name: 'Malaysia', flag: '🇲🇾', digits: 10 },
  '+33': { name: 'France', flag: '🇫🇷', digits: 9 },
};

const isEmailValid = (email) => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export function UserDashboard({ onSelectSchedule, setTab }) {
  const [user, setUser] = useState({
    name: 'Sudhin',
    email: 'sudhinns333@gmail.com',
    role: 'Executive Assistant',
  });
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // MD Free Slots & Booked Slots for Col 1
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [mdFreeSlots, setMdFreeSlots] = useState([]);
  const [mdBookedSlots, setMdBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [scheduleViewTab, setScheduleViewTab] = useState('free'); // 'free' | 'booked'

  // Form State for Col 2 (Book MD's Free Slot)
  const [selectedCountryCode, setSelectedCountryCode] = useState('+91');
  const [rawPhoneNumber, setRawPhoneNumber] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef(null);

  const [formData, setFormData] = useState({
    title: 'Executive Meeting with Gentize',
    meetingWith: '',
    clientEmail: '',
    purpose: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [bookingTarget, setBookingTarget] = useState('MD'); // 'MD' | 'SALES_LEAD'
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSelectBookingTarget = (target) => {
    setBookingTarget(target);
    setFormData((prev) => {
      const isDefaultMd = !prev.title || (prev.title === 'Executive Meeting with Gentize' || prev.title === 'Executive Meeting with MD');
      const isDefaultLead = !prev.title || prev.title === 'Executive Meeting with Sales Team Lead' || prev.title === 'Sales Consultation with Lead' || prev.title === 'Meeting with Sales Team Lead';
      let newTitle = prev.title;
      if (target === 'SALES_LEAD' && (isDefaultMd || !prev.title)) {
        newTitle = 'Sales Consultation with Lead';
      } else if (target === 'MD' && (isDefaultLead || !prev.title)) {
        newTitle = 'Executive Meeting with Gentize';
      }
      return {
        ...prev,
        title: newTitle,
      };
    });
  };

  // Close country dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target)) {
        setCountryDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '');
    const max = COUNTRY_CONFIG[selectedCountryCode]?.digits || 10;
    setRawPhoneNumber(digits.slice(0, max));
  };

  // Col 3 Filter
  const [meetingsFilter, setMeetingsFilter] = useState('all'); // 'all' | 'client' | 'mine'

  const fetchDashboard = async (isSilent = false) => {
    try {
      if (!isSilent) setRefreshing(true);
      const res = await apiRequest('/user/dashboard');
      setDashboardData(res);
      if (res.user) setUser(res.user);
    } catch (err) {
      console.error('Failed to load user dashboard:', err);
    } finally {
      if (!isSilent) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const fetchMdSlots = async (date, isSilent = false) => {
    try {
      if (!isSilent) {
        setLoadingSlots(true);
        setSelectedSlot(null);
      }
      const res = await apiRequest(`/user/md-schedule?date=${date}&target=${bookingTarget}`);
      setMdFreeSlots(res.slots || []);
      setMdBookedSlots(res.bookedSlots || []);
    } catch (err) {
      console.error('Failed to load host slots:', err);
    } finally {
      if (!isSilent) setLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(() => {
      fetchDashboard(true);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchMdSlots(selectedDate);
    const interval = setInterval(() => {
      fetchMdSlots(selectedDate, true);
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedDate, bookingTarget]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleSetToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const handleBookSlot = async (e) => {
    e.preventDefault();
    if (!selectedSlot) {
      alert("Please select one of Gentize's available free slots first.");
      return;
    }
    if (!formData.meetingWith.trim()) {
      alert('Please enter your full name.');
      return;
    }

    const minDigits = COUNTRY_CONFIG[selectedCountryCode]?.digits || 10;
    if (rawPhoneNumber.trim() && rawPhoneNumber.length < minDigits) {
      setPhoneTouched(true);
      alert(`${COUNTRY_CONFIG[selectedCountryCode]?.name} phone number requires ${minDigits} digits.`);
      return;
    }

    if (formData.clientEmail.trim() && !isEmailValid(formData.clientEmail)) {
      setEmailTouched(true);
      alert('Please enter a valid email format (e.g. name@domain.com).');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const fullPhone = rawPhoneNumber.trim() ? `${selectedCountryCode} ${rawPhoneNumber.trim()}` : '';
      const res = await apiRequest('/user/schedule-for-admin', {
        method: 'POST',
        body: {
          slotId: selectedSlot.slot_id,
          meetingWith: formData.meetingWith.trim(),
          clientEmail: formData.clientEmail.trim(),
          clientPhone: fullPhone,
          purpose: formData.purpose.trim() || (bookingTarget === 'SALES_LEAD' ? 'Sales Consultation with Lead' : 'Executive Meeting with Gentize'),
          notes: formData.notes.trim(),
          bookingTarget: bookingTarget,
        },
      });

      setSuccessMsg(res.message || `Meeting successfully booked with ${bookingTarget === 'SALES_LEAD' ? 'Sales Team Lead' : 'Gentize'}!`);
      setSelectedSlot(null);
      setRawPhoneNumber('');
      setPhoneTouched(false);
      setEmailTouched(false);
      setFormData({
        title: bookingTarget === 'SALES_LEAD' ? 'Sales Consultation with Lead' : 'Executive Meeting with Gentize',
        meetingWith: '',
        clientEmail: '',
        purpose: '',
        notes: '',
      });

      // Broadcast notifications update so Admin receives alert immediately
      window.dispatchEvent(new CustomEvent('gentize_notifications_updated'));

      await fetchDashboard();
      await fetchMdSlots(selectedDate);
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to book slot.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-72 text-slate-400 gap-3">
        <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-orange-950">Loading Assistant Workspace...</p>
      </div>
    );
  }

  const {
    admin,
    stats = { totalScheduled: 0, upcomingCount: 0, completedCount: 0, masterTotalCount: 0, masterUpcomingCount: 0 },
    recentBookings = [],
    allMasterBookings = []
  } = dashboardData || {};

  const kpiCards = [
    {
      title: 'My Bookings',
      value: stats.totalScheduled || 0,
      icon: CalendarIcon,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200/80',
    },
    {
      title: 'Upcoming (Mine)',
      value: stats.upcomingCount || 0,
      icon: Clock,
      color: 'text-slate-800',
      bg: 'bg-slate-100',
      border: 'border-slate-200',
    },
    {
      title: 'Gentize Master Upcoming',
      value: stats.masterUpcomingCount || stats.upcomingCount || 0,
      icon: CalendarDays,
      color: 'text-orange-700',
      bg: 'bg-orange-100/60',
      border: 'border-orange-300/70',
    },
    {
      title: 'Completed',
      value: stats.completedCount || 0,
      icon: CheckCircle2,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200/70',
    },
  ];

  const formattedSelectedDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  // Filter Col 3 Master Bookings
  const filteredBookings = recentBookings.filter(b => {
    if (meetingsFilter === 'client') return b.booking_source === 'CLIENT';
    if (meetingsFilter === 'mine') return b.booking_source === 'USER';
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Header: Welcome + Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Hello, <GentizeText logo>{user?.name || 'sudhin'}</GentizeText>
            </h1>
            <span className="text-2xl">👋</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
              Assistant Portal
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1"><GentizeText>Gentize</GentizeText>'s scheduling workspace & calendar synchronization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchDashboard();
              fetchMdSlots(selectedDate);
            }}
            disabled={refreshing}
            className="h-9 w-9 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-xl transition-all shadow-2xs flex items-center justify-center cursor-pointer active:scale-95"
            title="Refresh Dashboard"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-orange-500 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 text-xs font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span><GentizeText>{successMsg}</GentizeText></span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Notification Banner */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 text-xs font-bold">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-xs font-bold text-rose-700 hover:text-rose-900 ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 4 KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`p-5 rounded-2xl bg-white border ${card.border} shadow-2xs hover:shadow-md transition flex items-center justify-between`}
            >
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider"><GentizeText>{card.title}</GentizeText></p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{card.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-2xl ${card.bg} ${card.color} flex items-center justify-center shrink-0`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Column 1: MD's Schedule for Selected Date (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 flex flex-col justify-between min-h-[540px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  <GentizeText>{bookingTarget === 'SALES_LEAD' ? "Sales Team Lead's Daily Schedule" : "Gentize's Daily Schedule"}</GentizeText>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Live availability & scheduled slots</p>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                {mdFreeSlots.length} Free Slot{mdFreeSlots.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Date Navigator */}
            <div className="flex items-center justify-between py-2 px-2.5 bg-slate-50 rounded-2xl my-3 border border-slate-200/80">
              <button
                onClick={handlePrevDay}
                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-center flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800 tracking-tight">
                  {formattedSelectedDate}
                </span>
                {!isToday && (
                  <button
                    onClick={handleSetToday}
                    className="text-[10px] font-bold text-orange-600 hover:text-orange-700 underline ml-1 cursor-pointer"
                  >
                    Today
                  </button>
                )}
              </div>

              <button
                onClick={handleNextDay}
                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* View Switcher: Free Slots vs Booked Slots */}
            <div className="flex rounded-xl bg-slate-100 p-1 mb-3 text-xs font-bold">
              <button
                type="button"
                onClick={() => setScheduleViewTab('free')}
                className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  scheduleViewTab === 'free'
                    ? 'bg-white text-slate-950 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Free Slots</span>
                <span className="px-1.5 py-0.2 rounded-full bg-orange-100 text-orange-800 text-[10px] font-bold">
                  {mdFreeSlots.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setScheduleViewTab('booked')}
                className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  scheduleViewTab === 'booked'
                    ? 'bg-white text-slate-950 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span><GentizeText>{bookingTarget === 'SALES_LEAD' ? "Lead Booked" : "Gentize Booked"}</GentizeText></span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                  {mdBookedSlots.length}
                </span>
              </button>
            </div>

            {/* Content Tab: Free Slots */}
            {scheduleViewTab === 'free' && (
              <div className="space-y-2 max-h-[310px] overflow-y-auto pr-1">
                {loadingSlots ? (
                  <div className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-orange-500 mb-1" />
                    <p className="text-xs font-medium">
                      <GentizeText>{bookingTarget === 'SALES_LEAD' ? "Checking Sales Lead availability..." : "Checking Gentize availability..."}</GentizeText>
                    </p>
                  </div>
                ) : mdFreeSlots.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 space-y-2">
                    <CalendarCheck className="w-10 h-10 mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-700">No free slots for this date</p>
                    <p className="text-[11px] text-slate-400 max-w-[210px] mx-auto leading-relaxed">
                      <GentizeText>{bookingTarget === 'SALES_LEAD'
                        ? "Sales Team Lead has not configured free hours, or all slots on this date are already booked."
                        : "Gentize has not configured free hours, or all slots on this date are already booked."}</GentizeText>
                    </p>
                  </div>
                ) : (
                  mdFreeSlots.map((slot) => {
                    const isSelected = selectedSlot?.slot_id === slot.slot_id;

                    return (
                      <div
                        key={slot.slot_id}
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-3 rounded-2xl border transition flex items-center justify-between cursor-pointer shadow-2xs ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50/90 ring-2 ring-orange-500/20'
                            : 'border-slate-100 hover:border-orange-300 bg-white hover:bg-orange-50/40'
                        }`}
                      >
                        <div>
                          <p className={`text-xs font-bold ${isSelected ? 'text-orange-950' : 'text-slate-900'}`}>
                            {slot.displayTime}
                          </p>
                          <span className="inline-block mt-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Available Free Slot
                          </span>
                        </div>

                        <button
                          type="button"
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                            isSelected
                              ? 'bg-orange-500 text-white font-bold shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isSelected ? 'Selected ✓' : 'Select'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Content Tab: Booked Slots on this Date */}
            {scheduleViewTab === 'booked' && (
              <div className="space-y-2 max-h-[310px] overflow-y-auto pr-1">
                {loadingSlots ? (
                  <div className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-orange-500 mb-1" />
                    <p className="text-xs">Checking bookings...</p>
                  </div>
                ) : mdBookedSlots.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 space-y-2">
                    <Clock className="w-10 h-10 mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-700">No meetings booked on this day</p>
                    <p className="text-[11px] text-slate-400 max-w-[210px] mx-auto leading-relaxed">
                      <GentizeText>{bookingTarget === 'SALES_LEAD'
                        ? "Sales Team Lead calendar is completely clear of appointments for this date."
                        : "Gentize calendar is completely clear of appointments for this date."}</GentizeText>
                    </p>
                  </div>
                ) : (
                  mdBookedSlots.map((b) => (
                    <div
                      key={b.slot_id || b.booking_id}
                      className="p-3 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          {b.displayTime}
                        </span>
                        {b.isClientBooking ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                            <Lock className="w-3 h-3" />
                            Client (View Only)
                          </span>
                        ) : b.canModify ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200">
                            My Booking
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                            <GentizeText>{bookingTarget === 'SALES_LEAD' ? "Lead Scheduled" : "Gentize Scheduled"}</GentizeText>
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-slate-800 truncate">
                        <GentizeText>{b.client_name || (bookingTarget === 'SALES_LEAD' ? 'Meeting with Sales Lead' : 'Meeting with Gentize')}</GentizeText>
                      </p>

                      {b.meeting_purpose && (
                        <p className="text-[11px] text-slate-500 truncate">
                          Purpose: <GentizeText>{b.meeting_purpose}</GentizeText>
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 mt-3 text-[11px] text-slate-400 text-center">
            {scheduleViewTab === 'free'
              ? 'Once booked, slot automatically disappears from client & public access'
              : 'Client bookings are strictly view-only for staff'}
          </div>
        </div>

        {/* Column 2: Book Selected Free Slot (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 flex flex-col justify-between h-fit">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  <GentizeText>{bookingTarget === 'SALES_LEAD' ? "Book Sales Lead's Free Slot" : "Book Gentize's Free Slot"}</GentizeText>
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  <GentizeText>{bookingTarget === 'SALES_LEAD' ? "Locks slot onto Sales Team Lead Calendar" : "Locks slot onto Gentize Master Calendar"}</GentizeText>
                </p>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-orange-50 text-orange-900 font-bold border border-orange-200 flex items-center gap-1">
                <Zap className="w-3 h-3 text-orange-500" />
                Direct Sync
              </span>
            </div>

            {/* Selected Slot Callout */}
            {selectedSlot && (
              <div className="my-3.5 p-3.5 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-between shadow-2xs animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    ✓
                  </div>
                  <div>
                    <p className="text-xs font-bold text-orange-950">
                      {selectedSlot.displayTime}
                    </p>
                    <p className="text-[11px] font-bold text-orange-700">
                      {formattedSelectedDate}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSlot(null)}
                  className="text-xs font-bold text-orange-900 hover:text-rose-600 transition underline cursor-pointer"
                >
                  Change
                </button>
              </div>
            )}

            {/* Host Target Selector */}
            <div className="my-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Book Appointment With:
                </label>
                <span className="text-[10px] font-bold text-orange-600 bg-orange-100/70 px-2 py-0.5 rounded-full">
                  <GentizeText>{bookingTarget === 'SALES_LEAD' ? 'Sales Desk' : 'Gentize Office'}</GentizeText>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectBookingTarget('MD')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    bookingTarget === 'MD'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  
                  <span><GentizeText>Gentize</GentizeText></span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectBookingTarget('SALES_LEAD')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    bookingTarget === 'SALES_LEAD'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>💼</span>
                  <span>Sales Team Lead</span>
                </button>
              </div>
            </div>

            {/* Booking Form */}
            <form onSubmit={handleBookSlot} className="space-y-3">
              {/* Meeting Title */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter meeting title or agenda"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 placeholder:text-slate-400 placeholder:font-normal"
                  required
                />
              </div>

              {/* Person / Meeting With */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.meetingWith}
                  onChange={(e) => setFormData({ ...formData, meetingWith: e.target.value })}
                  placeholder="Enter your full name"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 placeholder:text-slate-400 placeholder:font-normal"
                  required
                />
              </div>

              {/* Client Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative" ref={countryDropdownRef}>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <div className="flex items-center rounded-xl bg-slate-50 border border-slate-200 focus-within:ring-2 focus-within:ring-orange-500/30 focus-within:border-orange-500 transition">
                    <button
                      type="button"
                      onClick={() => setCountryDropdownOpen(prev => !prev)}
                      className="h-9 px-2.5 bg-slate-100 hover:bg-slate-200/80 text-xs font-bold text-slate-800 border-r border-slate-200 rounded-l-xl flex items-center gap-1 shrink-0 transition select-none cursor-pointer"
                      title="Select country code"
                    >
                      <span>{COUNTRY_CONFIG[selectedCountryCode]?.flag || '🇮🇳'}</span>
                      <span className="font-bold">{selectedCountryCode}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${countryDropdownOpen ? 'rotate-180 text-orange-600' : ''}`} />
                    </button>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={rawPhoneNumber}
                      onChange={handlePhoneChange}
                      onBlur={() => setPhoneTouched(true)}
                      maxLength={COUNTRY_CONFIG[selectedCountryCode]?.digits || 10}
                      placeholder="Enter your mobile number"
                      className="flex-1 min-w-0 px-3 py-2 bg-transparent text-xs font-semibold text-slate-800 focus:outline-hidden placeholder:text-slate-400 placeholder:font-normal"
                    />
                  </div>

                  {countryDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 max-h-56 overflow-y-auto animate-in fade-in duration-100">
                      <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Select Country Code
                      </div>
                      {Object.entries(COUNTRY_CONFIG).map(([code, config]) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => {
                            setSelectedCountryCode(code);
                            setCountryDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-orange-50 transition cursor-pointer ${
                            selectedCountryCode === code ? 'bg-orange-50 font-bold text-orange-600' : 'text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{config.flag}</span>
                            <span><GentizeText>{config.name}</GentizeText></span>
                          </div>
                          <span className="font-mono text-[11px] text-slate-500">{code}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {phoneTouched && rawPhoneNumber && rawPhoneNumber.length < (COUNTRY_CONFIG[selectedCountryCode]?.digits || 10) && (
                    <p className="text-[10px] text-amber-600 font-semibold mt-1">
                      <GentizeText>{COUNTRY_CONFIG[selectedCountryCode]?.name}</GentizeText> phone number requires {COUNTRY_CONFIG[selectedCountryCode]?.digits} digits ({rawPhoneNumber.length}/{COUNTRY_CONFIG[selectedCountryCode]?.digits})
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => {
                      setEmailTouched(true);
                      setFormData({ ...formData, clientEmail: e.target.value });
                    }}
                    onBlur={() => setEmailTouched(true)}
                    placeholder="Enter your email address"
                    className={`w-full px-3.5 py-2 bg-slate-50 border rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 transition placeholder:text-slate-400 placeholder:font-normal h-9 ${
                      emailTouched && formData.clientEmail && !isEmailValid(formData.clientEmail)
                        ? 'border-rose-400 focus:ring-rose-500/30 focus:border-rose-500'
                        : 'border-slate-200 focus:ring-orange-500/30 focus:border-orange-500'
                    }`}
                  />
                  {emailTouched && formData.clientEmail && !isEmailValid(formData.clientEmail) && (
                    <p className="text-[10px] text-rose-500 font-semibold mt-1">
                      Please enter a valid email format (e.g. name@domain.com)
                    </p>
                  )}
                </div>
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Discussion Topic / Purpose
                </label>
                <input
                  type="text"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="Enter discussion topic or purpose"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Additional Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={bookingTarget === 'SALES_LEAD' ? "Enter any additional notes or points for Sales Team Lead..." : "Enter any additional notes or points for Gentize..."}
                  rows={2}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 placeholder:text-slate-400 placeholder:font-normal resize-none"
                />
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={submitting || !selectedSlot}
                className={`w-full mt-2 py-3 rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${
                  !selectedSlot
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20 active:scale-95'
                }`}
              >
                {submitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CalendarCheck className="w-4 h-4" />
                    <span>Confirm Slot Booking</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Column 3: MD Master Bookings & Activity (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                <GentizeText>{bookingTarget === 'SALES_LEAD' ? 'Sales Lead Meetings' : 'Gentize Master Meetings'}</GentizeText>
              </h3>
              <span className="text-[10px] font-bold text-orange-900 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                {recentBookings.length} Total
              </span>
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex gap-1 text-[11px] font-bold">
              <button
                onClick={() => setMeetingsFilter('all')}
                className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                  meetingsFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setMeetingsFilter('client')}
                className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                  meetingsFilter === 'client'
                    ? 'bg-purple-700 text-white'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                Client
              </button>
              <button
                onClick={() => setMeetingsFilter('mine')}
                className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                  meetingsFilter === 'mine'
                    ? 'bg-orange-600 text-white'
                    : 'bg-orange-50 text-orange-800 hover:bg-orange-100'
                }`}
              >
                Mine
              </button>
            </div>

            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {filteredBookings.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Clock className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                  <p className="text-xs font-medium">No bookings recorded yet</p>
                </div>
              ) : (
                filteredBookings.slice(0, 8).map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1 hover:border-slate-300 transition"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 truncate max-w-[130px]">
                        <GentizeText>{b.client_name || b.title || 'Meeting'}</GentizeText>
                      </span>
                      {b.isClientBooking ? (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 shrink-0">
                          <Lock className="w-2.5 h-2.5" />
                          Client (View Only)
                        </span>
                      ) : b.canModify ? (
                        <span className="text-[9px] font-bold text-orange-800 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200 shrink-0">
                          My Booking
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded shrink-0"><GentizeText>
                          Gentize Booked
                        </GentizeText></span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500">
                      {b.date} • {b.display_time || b.start_time || ''}
                    </p>

                    {b.purpose && (
                      <p className="text-[10px] text-slate-400 truncate">
                        <GentizeText>{b.purpose}</GentizeText>
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTab && setTab('my-bookings')}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <span><GentizeText>View All Gentize Bookings</GentizeText></span>
                <ArrowRight className="w-3.5 h-3.5 text-orange-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
