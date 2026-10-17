import { GentizeText } from '../../components/common/GentizeText.jsx';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiRequest } from '../../api/client.js';
import { Modal } from '../../components/common/Modal.jsx';
import {
  History,
  Clock,
  Calendar,
  User,
  MapPin,
  Mail,
  Phone,
  Building2,
  Video,
  ExternalLink,
  Search,
  Eye,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FileText,
  CalendarCheck,
  Tag,
  Trash2,
  RotateCcw
} from 'lucide-react';

export function AdminHistory({ target = 'MD' }) {
  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings' | 'schedules'
  const [historyData, setHistoryData] = useState({ bookings: [], schedules: [], totalCount: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalType, setModalType] = useState(null); // 'booking' | 'schedule'

  // 3-Second Undo State for Clear All
  const [undoActive, setUndoActive] = useState(false);
  const [undoSeconds, setUndoSeconds] = useState(3);
  const undoActiveRef = useRef(false);
  const targetRef = useRef(target);
  const clearedBackupRef = useRef(null);
  const undoTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  useEffect(() => {
    undoActiveRef.current = undoActive;
  }, [undoActive]);

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  const cleanupUndoTimers = () => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const commitClearHistory = async () => {
    cleanupUndoTimers();
    setUndoActive(false);
    clearedBackupRef.current = null;
    try {
      await apiRequest(`/admin/history/clear-all?target=${targetRef.current}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to commit clear history on backend:', err);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (undoActiveRef.current) {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(`/api/admin/history/clear-all?target=${targetRef.current}`);
        } else {
          fetch(`/api/admin/history/clear-all?target=${targetRef.current}`, { method: 'POST', keepalive: true }).catch(() => {});
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (undoActiveRef.current) {
        fetch(`/api/admin/history/clear-all?target=${targetRef.current}`, { method: 'POST', keepalive: true }).catch(() => {});
      }
      cleanupUndoTimers();
    };
  }, []);

  const fetchHistory = async () => {
    if (undoActive) {
      await commitClearHistory();
    }
    try {
      setLoading(true);
      const res = await apiRequest(`/admin/history?target=${target}`);
      setHistoryData({
        bookings: res.bookings || [],
        schedules: res.schedules || [],
        totalCount: res.totalCount || 0,
      });
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [target]);

  const handleClearHistory = () => {
    const hasItems = (historyData.bookings && historyData.bookings.length > 0) || (historyData.schedules && historyData.schedules.length > 0);
    if (!hasItems) return;

    // Backup current data and clear UI immediately
    clearedBackupRef.current = { ...historyData };
    setHistoryData({ bookings: [], schedules: [], totalCount: 0 });
    cleanupUndoTimers();

    setUndoSeconds(3);
    setUndoActive(true);

    // Countdown interval
    countdownIntervalRef.current = setInterval(() => {
      setUndoSeconds((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Commit permanent deletion after 3 seconds
    undoTimerRef.current = setTimeout(async () => {
      await commitClearHistory();
    }, 3000);
  };

  const handleUndoClear = () => {
    cleanupUndoTimers();
    if (clearedBackupRef.current) {
      setHistoryData(clearedBackupRef.current);
      clearedBackupRef.current = null;
    }
    setUndoActive(false);
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('en-US', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }
      return dateStr;
    } catch (_) {
      return dateStr;
    }
  };

  const filteredBookings = useMemo(() => {
    return (historyData.bookings || []).filter((b) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = (b.client_name || b.user_name || '').toLowerCase();
      const email = (b.client_email || b.user_email || '').toLowerCase();
      const phone = (b.client_phone || b.user_phone || '').toLowerCase();
      const purpose = (b.purpose || b.meeting_purpose || '').toLowerCase();
      const date = (b.date || '').toLowerCase();
      const location = (b.location || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || purpose.includes(q) || date.includes(q) || location.includes(q);
    });
  }, [historyData.bookings, searchQuery]);

  const filteredSchedules = useMemo(() => {
    return (historyData.schedules || []).filter((s) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const title = (s.title || '').toLowerCase();
      const date = (s.date || '').toLowerCase();
      const location = (s.location || '').toLowerCase();
      return title.includes(q) || date.includes(q) || location.includes(q);
    });
  }, [historyData.schedules, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 font-semibold text-[11px] uppercase tracking-wider border border-orange-200/60">
              <History className="w-3.5 h-3.5 text-orange-500" />
              Archived Logs & Records
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2 mt-1">
            History & Concluded Events
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Past schedules and finished meetings automatically archived in chronological order (most recent first).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="h-9 px-3.5 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-xl transition-all shadow-2xs flex items-center gap-2 text-xs font-semibold cursor-pointer active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-orange-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh History</span>
          </button>

          <button
            type="button"
            onClick={handleClearHistory}
            disabled={loading || (historyData.bookings.length === 0 && historyData.schedules.length === 0)}
            className="h-9 px-3.5 bg-rose-50 hover:bg-rose-100 border border-rose-200/90 text-rose-700 hover:text-rose-800 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Clear all past history records"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Tabs + Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center bg-slate-100/80 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'bookings'
                ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-orange-500" />
            <span>Past Bookings</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-orange-100 text-orange-700 font-bold">
              {historyData.bookings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('schedules')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'schedules'
                ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5 text-orange-500" />
            <span>Past Schedules</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
              {historyData.schedules.length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'bookings' ? 'Search client, purpose, date...' : 'Search schedule title, date...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-orange-400/30 focus:border-orange-500 transition shadow-2xs"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
          <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-xs font-semibold">Loading history archive...</p>
        </div>
      ) : activeTab === 'bookings' ? (
        /* Past Bookings View */
        filteredBookings.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-medium text-xs bg-white rounded-3xl border border-dashed border-slate-200 p-8">
            <History className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-600 text-sm">No past bookings found</p>
            <p className="text-slate-400 mt-1">Concluded appointments and finished meetings will automatically show here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBookings.map((b) => {
              const isCancelled = b.status === 'CANCELLED';
              return (
                <div
                  key={b.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-orange-200 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 mb-1 border border-slate-200">
                          {b.booking_source || 'CLIENT'}
                        </span>
                        <h3 className="font-bold text-slate-900 text-base truncate group-hover:text-orange-600 transition">
                          <GentizeText>{b.client_name || b.user_name || 'Client'}</GentizeText>
                        </h3>
                        {b.company_name && (
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span><GentizeText>{b.company_name}</GentizeText></span>
                          </p>
                        )}
                      </div>

                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          isCancelled
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isCancelled ? 'CANCELLED' : 'FINISHED'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <p className="text-xs font-semibold text-slate-800 line-clamp-1">
                        <GentizeText>{b.purpose || b.meeting_purpose || 'Executive Appointment'}</GentizeText>
                      </p>
                      {b.notes && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                          "{b.notes}"
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span className="font-semibold text-slate-800">{formatDisplayDate(b.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span>{b.display_time || `${b.start_time} - ${b.end_time}`}</span>
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span className="truncate"><GentizeText>{b.location || 'Gentize Cabin'}</GentizeText></span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">
                      Finished meeting
                    </span>
                    <button
                      onClick={() => {
                        setSelectedItem(b);
                        setModalType('booking');
                      }}
                      className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100/80 text-orange-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Details</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Past Schedules View */
        filteredSchedules.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-medium text-xs bg-white rounded-3xl border border-dashed border-slate-200 p-8">
            <CalendarCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-600 text-sm">No past schedules found</p>
            <p className="text-slate-400 mt-1">Past availability windows whose end time has elapsed will automatically appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSchedules.map((s) => (
              <div
                key={s.id}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-orange-200 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900 text-base group-hover:text-orange-600 transition">
                      <GentizeText>{s.title}</GentizeText>
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                      EXPIRED
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span className="font-semibold text-slate-800">{formatDisplayDate(s.date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span>
                        {s.start_time || s.startTime} – {s.end_time || s.endTime} ({s.slot_duration || s.slotDuration || 30} min slots)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span className="truncate"><GentizeText>{s.location}</GentizeText></span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    <strong className="text-slate-800">{s.booked_slots ?? s.bookedSlots ?? 0}</strong> booked /{' '}
                    <span>{s.total_slots ?? s.totalSlots ?? 0} total</span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedItem(s);
                      setModalType('schedule');
                    }}
                    className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100/80 text-orange-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* View Details Modal for History Items */}
      <Modal
        isOpen={Boolean(selectedItem)}
        onClose={() => {
          setSelectedItem(null);
          setModalType(null);
        }}
        title={modalType === 'booking' ? 'Archived Booking Details' : 'Archived Schedule Details'}
        maxWidth="max-w-xl"
      >
        {selectedItem && modalType === 'booking' && (
          <div className="space-y-4">
            {/* Header info */}
            <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200/60 flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-white px-2 py-0.5 rounded-full border border-orange-200">
                  {selectedItem.booking_source || 'CLIENT'} BOOKING
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1.5">
                  <GentizeText>{selectedItem.client_name || selectedItem.user_name}</GentizeText>
                </h3>
                {selectedItem.company_name && (
                  <p className="text-xs text-slate-600 mt-0.5 font-medium"><GentizeText>{selectedItem.company_name}</GentizeText></p>
                )}
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                  selectedItem.status === 'CANCELLED'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {selectedItem.status || 'CONCLUDED'}
              </span>
            </div>

            {/* Date & Time details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">{formatDisplayDate(selectedItem.date)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time Slot</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">
                  {selectedItem.display_time || `${selectedItem.start_time} - ${selectedItem.end_time}`}
                </p>
              </div>
            </div>

            {/* Contact details */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 text-xs">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Attendee Information</p>
              <div className="flex items-center gap-2 text-slate-700">
                <Mail className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span className="font-semibold">{selectedItem.client_email || selectedItem.user_email || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span className="font-semibold">{selectedItem.client_phone || selectedItem.user_phone || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span className="font-semibold"><GentizeText>{selectedItem.location || 'Gentize Cabin'}</GentizeText></span>
              </div>
            </div>

            {/* Agenda & Notes */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 text-xs">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Purpose & Discussion Notes</p>
              <p className="font-semibold text-slate-900"><GentizeText>{selectedItem.purpose || selectedItem.meeting_purpose || 'Executive Discussion'}</GentizeText></p>
              {selectedItem.notes && (
                <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-1 whitespace-pre-wrap">
                  {selectedItem.notes}
                </p>
              )}
              {selectedItem.cancellation_reason && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                  <strong>Cancellation Reason:</strong> {selectedItem.cancellation_reason}
                </div>
              )}
            </div>

            {/* Meeting link if any */}
            {selectedItem.meeting_link && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 text-xs text-slate-600">
                  <Video className="w-4 h-4 text-orange-500 shrink-0" />
                  <span className="truncate font-medium">{selectedItem.meeting_link}</span>
                </div>
                <a
                  href={selectedItem.meeting_link}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-200 rounded-lg text-slate-700 hover:text-orange-600 shrink-0 flex items-center gap-1 shadow-2xs"
                >
                  <span>Open</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {selectedItem && modalType === 'schedule' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200/60">
              <h3 className="text-base font-extrabold text-slate-900"><GentizeText>{selectedItem.title}</GentizeText></h3>
              <p className="text-xs text-slate-600 mt-1"><GentizeText>{selectedItem.location}</GentizeText></p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Date</p>
                <p className="font-bold text-slate-800 mt-0.5">{formatDisplayDate(selectedItem.date)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Working Hours</p>
                <p className="font-bold text-slate-800 mt-0.5">
                  {selectedItem.start_time || selectedItem.startTime} – {selectedItem.end_time || selectedItem.endTime}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Slot Duration</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedItem.slot_duration || selectedItem.slotDuration || 30} mins</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Slots Booked</p>
                <p className="font-bold text-slate-800 mt-0.5">
                  {selectedItem.booked_slots ?? selectedItem.bookedSlots ?? 0} / {selectedItem.total_slots ?? selectedItem.totalSlots ?? 0}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 10-Second Undo Banner for Clear History */}
      {undoActive && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="text-xs font-medium">History archive cleared.</span>
          <button
            type="button"
            onClick={handleUndoClear}
            className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo ({undoSeconds}s)</span>
          </button>
        </div>
      )}
    </div>
  );
}
