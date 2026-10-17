import { GentizeText } from '../../components/common/GentizeText.jsx';
import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../../api/client.js';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  RotateCcw,
  RefreshCw,
  User,
  AlertCircle,
  Lock,
  Eye,
  ExternalLink,
  Video,
  Navigation,
  ShieldCheck,
  X,
  Phone,
  Mail,
  History,
  Archive,
  Trash2,
} from 'lucide-react';

export function UserBookings({ onBookNew }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'mine' | 'client'

  // Reschedule State
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Cancel State
  const [cancelBooking, setCancelBooking] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Toast
  const [toastMsg, setToastMsg] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // 3-Second Undo State for Clear User History
  const [undoActive, setUndoActive] = useState(false);
  const [undoSeconds, setUndoSeconds] = useState(3);
  const undoActiveRef = useRef(false);
  const clearedHistoryBackupRef = useRef(null);
  const undoTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  useEffect(() => {
    undoActiveRef.current = undoActive;
  }, [undoActive]);

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

  const commitClearUserHistory = async () => {
    cleanupUndoTimers();
    setUndoActive(false);
    clearedHistoryBackupRef.current = null;
    try {
      await apiRequest('/user/history/clear-all', { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to commit clear user history:', err);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (undoActiveRef.current) {
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/user/history/clear-all');
        } else {
          fetch('/api/user/history/clear-all', { method: 'POST', keepalive: true }).catch(() => {});
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (undoActiveRef.current) {
        fetch('/api/user/history/clear-all', { method: 'POST', keepalive: true }).catch(() => {});
      }
      cleanupUndoTimers();
    };
  }, []);

  const fetchBookings = async (isSilent = false) => {
    if (undoActive && isSilent) return;
    try {
      if (!isSilent) setLoading(true);
      const res = await apiRequest('/user/master-bookings');
      if (undoActive && clearedHistoryBackupRef.current) {
        const backupIds = new Set(clearedHistoryBackupRef.current.map((b) => b.id));
        setBookings((res.bookings || []).filter((b) => !backupIds.has(b.id)));
      } else {
        setBookings(res.bookings || []);
      }
    } catch (err) {
      console.error('Error fetching user bookings:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(() => {
      fetchBookings(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [undoActive]);

  const handleClearHistory = () => {
    if (userHistoryBookings.length === 0) return;

    clearedHistoryBackupRef.current = [...userHistoryBookings];
    const pastIds = new Set(userHistoryBookings.map((b) => b.id));
    setBookings((prev) => prev.filter((b) => !pastIds.has(b.id)));
    cleanupUndoTimers();

    setUndoSeconds(3);
    setUndoActive(true);

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

    undoTimerRef.current = setTimeout(async () => {
      await commitClearUserHistory();
    }, 3000);
  };

  const handleUndoClearHistory = () => {
    cleanupUndoTimers();
    if (clearedHistoryBackupRef.current && clearedHistoryBackupRef.current.length > 0) {
      setBookings((prev) => [...prev, ...clearedHistoryBackupRef.current]);
      clearedHistoryBackupRef.current = null;
    }
    setUndoActive(false);
  };

  const openRescheduleModal = async (booking) => {
    if (booking.isClientBooking || !booking.canModify) {
      alert('Client appointments are read-only for staff. Only Gentize (Admin) can reschedule client bookings.');
      return;
    }
    try {
      setRescheduleBooking(booking);
      setLoadingSlots(true);
      const res = await apiRequest(`/user/md-schedule?date=${booking.date}`);
      const openSlots = res.slots || [];
      setAvailableSlots(openSlots);
      setSelectedSlotId(openSlots[0]?.slot_id || '');
    } catch (err) {
      alert(err.message || 'Failed to fetch slots for rescheduling');
      setRescheduleBooking(null);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!selectedSlotId || !rescheduleBooking) return;
    try {
      setRescheduling(true);
      const res = await apiRequest(`/user/bookings/${rescheduleBooking.id}/reschedule`, {
        method: 'PUT',
        body: { newSlotId: selectedSlotId },
      });
      setToastMsg(res.message || 'Booking rescheduled successfully!');
      setRescheduleBooking(null);
      await fetchBookings();
      setTimeout(() => setToastMsg(null), 5000);
    } catch (err) {
      alert(err.message || 'Failed to reschedule');
    } finally {
      setRescheduling(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelBooking) return;
    if (cancelBooking.isClientBooking || !cancelBooking.canModify) {
      alert('Client appointments are read-only for staff. Only Gentize (Admin) can cancel client bookings.');
      return;
    }
    try {
      setCancelling(true);
      const res = await apiRequest(`/user/bookings/${cancelBooking.id}`, { method: 'DELETE' });
      setToastMsg(res.message || 'Booking cancelled successfully');
      setCancelBooking(null);
      await fetchBookings();
      setTimeout(() => setToastMsg(null), 5000);
    } catch (err) {
      alert(err.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  const curHour = String(now.getHours()).padStart(2, '0');
  const curMin = String(now.getMinutes()).padStart(2, '0');
  const curTime = `${curHour}:${curMin}`;

  const isBookingPast = (b) => {
    if (!b.date) return false;
    if (b.status === 'COMPLETED') return true;
    if (b.date < todayStr) return true;
    if (b.date === todayStr) {
      const checkTime = b.end_time || b.start_time;
      if (checkTime && checkTime <= curTime) return true;
    }
    return false;
  };

  // Active (current / upcoming) appointments only
  const activeBookings = bookings.filter((b) => !isBookingPast(b));

  // Concluded user bookings archived in History
  const userHistoryBookings = bookings.filter((b) => b.booking_source === 'USER' && isBookingPast(b));

  const filteredBookings = activeBookings.filter((b) => {
    if (activeFilter === 'mine') return b.booking_source === 'USER';
    if (activeFilter === 'client') return b.booking_source === 'CLIENT';
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Master Calendar Bookings</h1>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200"><GentizeText>
              Gentize Sync
            </GentizeText></span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1"><GentizeText>
            View active synchronized appointments on the Gentize's calendar. Staff can modify assistant bookings.
          </GentizeText></p>
        </div>

        <div className="flex items-center gap-2">
          {/* History Button right next to Refresh */}
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer text-xs font-semibold active:scale-95"
            title="User Past Booking History"
          >
            <History className="w-4 h-4 text-orange-500" />
            <span>History</span>
            {userHistoryBookings.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                {userHistoryBookings.length}
              </span>
            )}
          </button>

          <button
            onClick={fetchBookings}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition shadow-2xs cursor-pointer active:scale-95"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-orange-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
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

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Appointments ({activeBookings.length})
        </button>
        <button
          onClick={() => setActiveFilter('mine')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeFilter === 'mine'
              ? 'bg-orange-500 text-white shadow-2xs'
              : 'bg-white text-orange-700 border border-orange-200 hover:bg-orange-50'
          }`}
        >
          My Bookings ({activeBookings.filter((b) => b.booking_source === 'USER').length})
        </button>
        <button
          onClick={() => setActiveFilter('client')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeFilter === 'client'
              ? 'bg-purple-700 text-white shadow-2xs'
              : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
          }`}
        >
          Client Bookings ({activeBookings.filter((b) => b.booking_source === 'CLIENT').length})
        </button>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-orange-950">Loading Appointments...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200/90 space-y-2">
          <Calendar className="w-10 h-10 mx-auto text-slate-300" />
          <p className="text-sm font-bold text-slate-700">No appointments found</p>
          <p className="text-xs text-slate-400">There are no bookings matching the selected filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBookings.map((b) => (
            <div
              key={b.id}
              className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Attendee
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">
                      <GentizeText>{b.client_name || 'Meeting with Gentize'}</GentizeText>
                    </h3>
                  </div>

                  {b.isClientBooking ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                      <Lock className="w-3 h-3" />
                      Client (View Only)
                    </span>
                  ) : b.canModify ? (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-orange-50 text-orange-800 border border-orange-200 shrink-0">
                      My Booking
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 shrink-0">
                      <GentizeText>{b.booking_target === 'SALES_LEAD' ? 'Lead Booked' : 'Gentize Booked'}</GentizeText>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span className="font-semibold text-slate-800">{b.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span>{b.display_time || `${b.start_time} - ${b.end_time}`}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span className="truncate"><GentizeText>{b.location || 'Gentize Office (In-Person)'}</GentizeText></span>
                  </div>
                </div>

                {b.purpose && (
                  <div className="text-xs text-slate-700">
                    <span className="font-bold text-slate-400 text-[11px] block">Purpose:</span>
                    <p className="mt-0.5 text-slate-800 font-medium"><GentizeText>{b.purpose}</GentizeText></p>
                  </div>
                )}

                {(b.client_phone || b.client_email) && (
                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    {b.client_phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {b.client_phone}
                      </span>
                    )}
                    {b.client_email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {b.client_email}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  {b.status || 'CONFIRMED'}
                </span>

                {b.canModify ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openRescheduleModal(b)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 transition cursor-pointer"
                    >
                      Reschedule
                    </button>
                    <button
                      type="button"
                      onClick={() => setCancelBooking(b)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Read-Only
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Reschedule Meeting</h3>
                <p className="text-xs text-slate-500"><GentizeText>{rescheduleBooking.client_name}</GentizeText> • {rescheduleBooking.date}</p>
              </div>
              <button onClick={() => setRescheduleBooking(null)} className="cursor-pointer text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Choose a new available slot on {rescheduleBooking.date}
              </label>

              {loadingSlots ? (
                <div className="py-8 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-orange-500" />
                </div>
              ) : availableSlots.length === 0 ? (
                <p className="text-xs text-slate-500 p-4 bg-slate-50 rounded-xl">
                  No other free slots on this date.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {availableSlots.map((s) => (
                    <label
                      key={s.slot_id}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold cursor-pointer transition ${
                        selectedSlotId === s.slot_id
                          ? 'border-orange-500 bg-orange-50 text-orange-950'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span>{s.displayTime}</span>
                      <input
                        type="radio"
                        name="rescheduleSlot"
                        checked={selectedSlotId === s.slot_id}
                        onChange={() => setSelectedSlotId(s.slot_id)}
                        className="text-orange-500"
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRescheduleBooking(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rescheduling || !selectedSlotId}
                onClick={handleConfirmReschedule}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 shadow-sm shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
              >
                {rescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Cancel Appointment?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to cancel the meeting with <span className="font-bold text-slate-800"><GentizeText>{cancelBooking.client_name}</GentizeText></span><GentizeText>? The slot will be released back to Gentize's free availability.
              </GentizeText></p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelBooking(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
              >
                Keep
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-600/20 disabled:opacity-50 cursor-pointer"
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* USER PAST BOOKING HISTORY MODAL                                            */}
      {/* ========================================================================= */}
      {historyOpen && (
        <div
          onClick={() => setHistoryOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200/90 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150 relative max-h-[88vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 shadow-2xs">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                      Your Past Booking History
                    </h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                      {userHistoryBookings.length} Archived
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Appointments booked by you that have completed, elapsed, or concluded.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearHistory}
                  disabled={userHistoryBookings.length === 0}
                  className="px-3 py-1.5 rounded-xl border border-rose-200/90 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Clear past booking history"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Clear</span>
                </button>

                <button
                  onClick={() => setHistoryOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {userHistoryBookings.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <Archive className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">No past bookings archived yet</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto"><GentizeText>
                    When appointments you schedule with the Gentize conclude or pass, they will be archived here automatically.
                  </GentizeText></p>
                </div>
              ) : (
                userHistoryBookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 hover:bg-orange-50/20 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Attendee
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                          <GentizeText>{b.client_name || 'Meeting with Gentize'}</GentizeText>
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700 border border-slate-300">
                        {b.status || 'CONCLUDED'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/70">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span className="font-semibold text-slate-800">{b.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span>{b.display_time || `${b.start_time} - ${b.end_time}`}</span>
                      </div>
                      <div className="flex items-center gap-2 sm:col-span-2">
                        <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span className="truncate"><GentizeText>{b.location || 'Gentize Office (In-Person)'}</GentizeText></span>
                      </div>
                    </div>

                    {b.purpose && (
                      <div className="text-xs text-slate-700 pt-0.5">
                        <span className="font-bold text-slate-400 text-[10px] block uppercase">Purpose:</span>
                        <p className="mt-0.5 text-slate-800 font-medium"><GentizeText>{b.purpose}</GentizeText></p>
                      </div>
                    )}

                    {(b.client_phone || b.client_email) && (
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500 border-t border-slate-200/60">
                        {b.client_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {b.client_phone}
                          </span>
                        )}
                        {b.client_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {b.client_email}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="px-4 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition shadow-xs cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10-Second Undo Banner for Clear User History */}
      {undoActive && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="text-xs font-medium">Booking history cleared.</span>
          <button
            type="button"
            onClick={handleUndoClearHistory}
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
