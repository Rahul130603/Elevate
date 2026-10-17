import { GentizeText } from '../../components/common/GentizeText.jsx';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiRequest } from '../../api/client.js';
import { REMINDER_HISTORY_CHANGED, readReminderNotifications, markReminderNotificationsRead, clearReminderNotifications, mergeReminderNotifications } from '../../services/reminderNotificationHistory.js';
import { Modal } from '../../components/common/Modal.jsx';
import { CustomTimePicker } from '../../components/common/CustomTimePicker.jsx';
import {
  Bell,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  RefreshCw,
  AlertCircle,
  Calendar,
  User,
  MapPin,
  Sparkles,
  Send,
  Video,
  Building2,
  PhoneCall,
  Trash2,
  ExternalLink
} from 'lucide-react';

export function AdminNotifications({ setTab, onNavigateToBooking, target = 'MD' }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [filterType, setFilterType] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // 3-Second Undo State for Clear All
  const [undoActive, setUndoActive] = useState(false);
  const [undoSeconds, setUndoSeconds] = useState(3);
  const undoActiveRef = useRef(false);
  const clearedBackupRef = useRef([]);
  const undoTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  useEffect(() => {
    undoActiveRef.current = undoActive;
  }, [undoActive]);

  // Reschedule Modal State
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({
    newDate: '',
    newStartTime: '10:00',
    newEndTime: '10:30',
  });
  const [rescheduling, setRescheduling] = useState(false);

  // Cancel Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState(target === 'SALES_LEAD' ? 'Sales Lead Unavailable / Conflict' : 'Gentize Unavailable / Conflict');
  const [cancelling, setCancelling] = useState(false);

  // Helper: check if notification date is within last 7 days
  const isWithinLast7Days = (dateStr) => {
    if (!dateStr) return true;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return true;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      cutoff.setHours(0, 0, 0, 0);
      return d >= cutoff;
    } catch {
      return true;
    }
  };

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

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await apiRequest(`/notifications?target=${target}`);
      const list = mergeReminderNotifications(Array.isArray(res) ? res : (res?.notifications || []), target === 'MD' ? readReminderNotifications() : [])
        .filter(n => isWithinLast7Days(n.sent_at || n.createdAt || n.deliveredAt || n.booking_date));
      setNotifications(list);
    } catch (err) {
      console.error(err);
      if (target === 'MD') setNotifications(previous => mergeReminderNotifications(previous, readReminderNotifications()).filter(n => isWithinLast7Days(n.sent_at || n.created_at)));
    } finally {
      setLoading(false);
    }
  };

  const commitClearAll = async () => {
    const reminderIds = clearedBackupRef.current.filter(n => n.isPersonalReminder).map(n => n.id);
    cleanupUndoTimers();
    undoActiveRef.current = false;
    setUndoActive(false);
    clearedBackupRef.current = [];
    if (target === 'MD') clearReminderNotifications(reminderIds);
    try {
      await apiRequest('/notifications/clear-all', { method: 'DELETE' });
      setMessage({ type: 'success', text: 'All delivered notifications cleared.' });
    } catch (err) {
      console.error('Failed to commit clear-all on backend:', err);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (undoActiveRef.current) {
        clearReminderNotifications(clearedBackupRef.current.filter(n => n.isPersonalReminder).map(n => n.id));
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/notifications/clear-all');
        } else {
          fetch('/api/notifications/clear-all', { method: 'POST', keepalive: true }).catch(() => {});
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (undoActiveRef.current) {
        clearReminderNotifications(clearedBackupRef.current.filter(n => n.isPersonalReminder).map(n => n.id));
        fetch('/api/notifications/clear-all', { method: 'POST', keepalive: true }).catch(() => {});
      }
      cleanupUndoTimers();
    };
  }, []);

  const handleClearAll = () => {
    if (notifications.length === 0) return;

    // Backup current notifications and clear UI immediately
    clearedBackupRef.current = [...notifications];
    setNotifications([]);
    cleanupUndoTimers();

    setUndoSeconds(3);
    undoActiveRef.current = true;
    setUndoActive(true);

    // 1-second interval countdown for 3 seconds
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

    // After 3s, commit permanent deletion to backend
    undoTimerRef.current = setTimeout(async () => {
      await commitClearAll();
    }, 3000);
  };

  const handleUndoClear = () => {
    undoActiveRef.current = false;
    cleanupUndoTimers();
    if (clearedBackupRef.current.length > 0) {
      setNotifications(mergeReminderNotifications(clearedBackupRef.current, target === 'MD' ? readReminderNotifications() : []));
      clearedBackupRef.current = [];
    }
    setUndoActive(false);
    setMessage({ type: 'success', text: 'Notifications restored.' });
  };

  const handleRefresh = async () => {
    // If an undo was pending, refresh immediately cancels undo and commits deletion
    if (undoActive) {
      await commitClearAll();
    }
    await fetchNotifications();
  };

  useEffect(() => {
    fetchNotifications();
    return () => {
      cleanupUndoTimers();
    };
  }, []);

  useEffect(() => {
    if (target !== 'MD') return;
    const sync = () => {
      if (undoActiveRef.current) return;
      markReminderNotificationsRead();
      setNotifications(previous => mergeReminderNotifications(previous, readReminderNotifications()).filter(n => isWithinLast7Days(n.sent_at || n.created_at || n.createdAt)));
    };
    sync();
    window.addEventListener(REMINDER_HISTORY_CHANGED, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(REMINDER_HISTORY_CHANGED, sync); window.removeEventListener('storage', sync); };
  }, [target]);

  const handleRetry = async (id) => {
    try {
      setRetryingId(id);
      setMessage(null);
      const res = await apiRequest(`/notifications/${id}/retry`, { method: 'POST' });
      setMessage({ type: 'success', text: res.message || 'Notification resent successfully!' });
      await fetchNotifications();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to retry notification' });
    } finally {
      setRetryingId(null);
    }
  };

  // Direct MD Actions on Booking
  const handleConfirmBooking = async (bookingId) => {
    try {
      setActionLoadingId(bookingId);
      setMessage(null);
      const res = await apiRequest(`/admin/bookings/${bookingId}/confirm`, { method: 'POST' });
      setMessage({
        type: 'success',
        text: res.message || 'Booking Confirmed! Confirmation SMS & Email dispatched to Client and Staff.',
      });
      await fetchNotifications();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to confirm booking' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const openRescheduleModal = (item) => {
    setRescheduleTarget(item);
    setRescheduleForm({
      newDate: item.booking_date || new Date().toISOString().split('T')[0],
      newStartTime: item.start_time || '10:00',
      newEndTime: item.end_time || '10:30',
    });
    setRescheduleModalOpen(true);
  };

  const handleExecuteReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleTarget?.booking_id) return;

    try {
      setRescheduling(true);
      const res = await apiRequest(`/admin/bookings/${rescheduleTarget.booking_id}/reschedule`, {
        method: 'POST',
        body: {
          newDate: rescheduleForm.newDate,
          newStartTime: rescheduleForm.newStartTime,
          newEndTime: rescheduleForm.newEndTime,
        },
      });

      setRescheduleModalOpen(false);
      setMessage({
        type: 'success',
        text: res.message || 'Booking Re-Scheduled! Client & Staff notified of the new timing.',
      });
      await fetchNotifications();
    } catch (err) {
      alert(err.message || 'Failed to reschedule booking');
    } finally {
      setRescheduling(false);
    }
  };

  const openCancelModal = (item) => {
    setCancelTarget(item);
    setCancelReason('Gentize Schedule Conflict / Emergency');
    setCancelModalOpen(true);
  };

  const handleExecuteCancel = async (e) => {
    e.preventDefault();
    if (!cancelTarget?.booking_id) return;

    try {
      setCancelling(true);
      const res = await apiRequest(`/admin/bookings/${cancelTarget.booking_id}/cancel`, {
        method: 'POST',
        body: { reason: cancelReason },
      });

      setCancelModalOpen(false);
      setMessage({
        type: 'success',
        text: res.message || 'Booking Cancelled. Cancellation notification sent to client.',
      });
      await fetchNotifications();
    } catch (err) {
      alert(err.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  // Distinct pending bookings that need MD action
  const pendingBookings = useMemo(() => {
    const map = new Map();
    notifications.forEach((n) => {
      if (n.booking_id && n.booking_status === 'PENDING') {
        const existing = map.get(n.booking_id);
        if (!existing) {
          map.set(n.booking_id, n);
        } else if ((n.booking_source || '').toUpperCase() === 'USER') {
          map.set(n.booking_id, n);
        }
      }
    });
    return Array.from(map.values());
  }, [notifications]);

  // Filter and Pagination Computations
  const filteredNotifications = useMemo(() => {
    if (filterType === 'ALL') return notifications;
    return notifications.filter((n) => n.type === filterType);
  }, [notifications, filterType]);

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage) || 1;

  // Smart pagination: never render 20 buttons in a raw row
  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, 4, '...', totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const paginatedNotifications = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredNotifications.slice(start, start + itemsPerPage);
  }, [filteredNotifications, currentPage, itemsPerPage]);

  const filterCounts = useMemo(() => {
    return {
      ALL: notifications.length,
      EMAIL: notifications.filter((n) => n.type === 'EMAIL').length,
      SMS: notifications.filter((n) => n.type === 'SMS').length,
      PUSH: notifications.filter((n) => n.type === 'PUSH').length,
      REMINDER: notifications.filter((n) => n.type === 'REMINDER').length,
    };
  }, [notifications]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType]);

  return (
    <div className="space-y-4">
      {/* Header with Filter Tabs and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight"><GentizeText logo>Notification History & Gentize Approvals</GentizeText></h1>
          <p className="text-xs text-slate-500">
            Review alerts, audit outbound SMS/Email, and confirm, reschedule, or cancel client bookings directly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Filter Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            {[
              { id: 'ALL', label: 'All', count: filterCounts.ALL },
              { id: 'EMAIL', label: 'Email', count: filterCounts.EMAIL },
              { id: 'SMS', label: 'SMS', count: filterCounts.SMS },
              { id: 'PUSH', label: 'Push', count: filterCounts.PUSH },
              ...(target === 'MD' ? [{ id: 'REMINDER', label: 'Reminders', count: filterCounts.REMINDER }] : [])
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-2.5 py-1 rounded-lg transition text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                  filterType === tab.id
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span><GentizeText>{tab.label}</GentizeText></span>
                <span className="text-[10px] opacity-75">({tab.count})</span>
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleClearAll}
            title="Clear all delivered notifications"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition shadow-2xs cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-xs flex items-center justify-between border shrink-0 ${
          message.type === 'success' ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <span><GentizeText>{message.text}</GentizeText></span>
          <button onClick={() => setMessage(null)} className="font-bold underline ml-4">Dismiss</button>
        </div>
      )}

      {/* SECTION 1: Pending Client Bookings Requiring MD Approval (Compact) */}
      {pendingBookings.length > 0 && (
        <div className="p-3.5 bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-orange-500/10 border-2 border-orange-200 rounded-2xl space-y-2 shadow-xs shrink-0 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-orange-500 text-white flex items-center justify-center shadow-xs">
                <Clock className="w-3.5 h-3.5 animate-spin" />
              </span>
              <h3 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                <span><GentizeText>Appointments Awaiting Gentize Approval</GentizeText></span>
                <span className="px-1.5 py-0.2 rounded-full bg-orange-500 text-white text-[10px] font-semibold">
                  {pendingBookings.length} Action Needed
                </span>
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {pendingBookings.map((b) => {
              const isUserBooking = (b.booking_source || '').toUpperCase() === 'USER' || b.title?.includes('User') || b.message?.toLowerCase().includes('user') || b.message?.toLowerCase().includes('staff') || b.message?.toLowerCase().includes('assistant');
              return (
                <div
                  key={b.booking_id}
                  className="bg-white rounded-xl border border-orange-200 p-2.5 shadow-2xs space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
                          isUserBooking ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-600'
                        }`}>
                          <GentizeText>{b.client_name?.charAt(0) || (isUserBooking ? 'U' : 'C')}</GentizeText>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-bold text-slate-900 truncate"><GentizeText>{b.client_name || 'Attendee'}</GentizeText></h4>
                            <span className={`px-1.5 py-0.2 rounded text-[8px] font-extrabold uppercase tracking-wide border ${
                              isUserBooking
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-orange-50 text-orange-700 border-orange-200'
                            }`}>
                              {isUserBooking ? 'User Booking' : 'Client Booking'}
                            </span>
                          </div>
                          <span className="text-[9px] font-semibold text-slate-400">Ref: #{b.booking_id}</span>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.2 rounded bg-orange-100 text-orange-600 border border-orange-200 text-[9px] font-semibold uppercase shrink-0">
                        Pending
                      </span>
                    </div>

                  <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 text-[9px] block">Time</span>
                      <strong className="text-slate-900 font-bold truncate block">
                        {b.booking_date} • {b.displayTime || (b.start_time ? `${b.start_time}` : 'TBD')}
                      </strong>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 text-[9px] block">Venue</span>
                      <strong className="text-slate-900 font-bold truncate block"><GentizeText>{b.location || 'Gentize Cabin'}</GentizeText></strong>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onNavigateToBooking && onNavigateToBooking(b.booking_id, 'PENDING')}
                    className="py-1 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold transition flex items-center justify-center gap-1"
                    title="View full booking in Booking Management"
                  >
                    <Calendar className="w-3 h-3 text-orange-600" />
                    <span>Details</span>
                  </button>

                  <button
                    onClick={() => handleConfirmBooking(b.booking_id)}
                    disabled={actionLoadingId === b.booking_id}
                    className="py-1 px-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[10px] font-semibold transition flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Confirm</span>
                  </button>

                  <button
                    onClick={() => openCancelModal(b)}
                    disabled={actionLoadingId === b.booking_id}
                    className="py-1 px-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-semibold transition flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <XCircle className="w-3 h-3" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* SECTION 2: Complete Notification Audit Log (Fitted & Paginated) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
        <div className="p-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-orange-600" />
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">All Dispatched Alerts & History</h3>
          </div>
          <span className="text-xs text-slate-400 font-bold">
            Showing {filteredNotifications.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
            {Math.min(currentPage * itemsPerPage, filteredNotifications.length)} of {filteredNotifications.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Bell className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium">No notification events recorded</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-xs z-10 border-b border-slate-200">
                <tr className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Type & Recipient</th>
                  <th className="py-2.5 px-4">Event & Message</th>
                  <th className="py-2.5 px-4">Schedule / Booking Details</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Dispatched At</th>
                  <th className="py-2.5 px-4 text-right"><GentizeText>Gentize Actions</GentizeText></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedNotifications.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50/60 transition">
                    {/* Type & Recipient */}
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold ${
                          n.type === 'EMAIL'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-orange-50 text-orange-600 border border-orange-200'
                        }`}>
                          {n.type === 'EMAIL' ? <Mail className="w-3 h-3" /> : n.type === 'SMS' ? <Phone className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                          {n.type}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 truncate max-w-[150px] text-xs"><GentizeText>{n.recipient}</GentizeText></div>
                          {n.client_name && (
                            <div className="text-[10px] text-slate-400 font-medium">Client: <GentizeText>{n.client_name}</GentizeText></div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Event & Message */}
                    <td className="py-2.5 px-4 max-w-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-slate-900 text-xs truncate"><GentizeText>{n.title || n.event_title || 'Notification'}</GentizeText></p>
                        {(() => {
                          const isUser = (n.booking_source || '').toUpperCase() === 'USER' || n.title?.includes('User') || n.message?.toLowerCase().includes('user') || n.message?.toLowerCase().includes('assistant') || n.message?.toLowerCase().includes('staff');
                          const isClient = (n.booking_source || '').toUpperCase() === 'CLIENT' || (!isUser && n.booking_id);
                          if (isUser) {
                            return (
                              <span className="px-1.5 py-0.2 rounded text-[8px] font-extrabold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                                User Booking
                              </span>
                            );
                          }
                          if (isClient && n.booking_id) {
                            return (
                              <span className="px-1.5 py-0.2 rounded text-[8px] font-extrabold uppercase bg-orange-50 text-orange-700 border border-orange-200">
                                Client Booking
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <p className={`text-[11px] text-slate-500 mt-0.5 ${n.isPersonalReminder ? 'whitespace-normal break-words' : 'truncate'}`}><GentizeText>{n.message}</GentizeText></p>
                      {n.error_details && (
                        <p className="text-[10px] text-rose-600 font-medium mt-0.5">Error: {n.error_details}</p>
                      )}
                    </td>

                    {/* Booking Details */}
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {n.isPersonalReminder ? <div className="space-y-1"><p className="font-semibold text-slate-900">{new Date(n.reminder_event_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p><p className="text-slate-500">Notify: {new Date(n.reminder_notify_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p></div> : n.booking_id ? (
                        <div
                          onClick={() => onNavigateToBooking ? onNavigateToBooking(n.booking_id, n.booking_status === 'PENDING' ? 'PENDING' : 'ALL') : (setTab && setTab('bookings'))}
                          className="cursor-pointer group hover:bg-orange-50/70 p-1 -m-1 rounded-lg transition"
                          title="Click to view full details in Bookings (Pending Approval)"
                        >
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-slate-900 text-xs group-hover:text-orange-600 transition">{n.booking_date}</span>
                            <ExternalLink className="w-2.5 h-2.5 text-slate-400 group-hover:text-orange-600 transition opacity-60 group-hover:opacity-100" />
                          </div>
                          <div className="text-[10px] text-orange-600 font-bold">
                            {n.displayTime || (n.start_time ? `${n.start_time} - ${n.end_time}` : 'Ref: ' + n.booking_id)}
                          </div>
                          {n.booking_status && (
                            <span className={`inline-block mt-0.5 text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded border ${
                              n.booking_status === 'CONFIRMED'
                                ? 'bg-orange-50 text-orange-600 border-orange-200'
                                : n.booking_status === 'CANCELLED'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-orange-50 text-orange-600 border-orange-200'
                            }`}>
                              {n.booking_status}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Delivery Status */}
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {(() => {
                        const statusUpper = (n.status || '').toUpperCase();
                        const isFailed = statusUpper === 'FAILED';
                        const isPending = statusUpper === 'PENDING';
                        if (isFailed) {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3 h-3 text-rose-600" /> Failed ✕
                            </span>
                          );
                        }
                        if (isPending) {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" /> Pending...
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {n.isPersonalReminder ? n.reminder_kind === 'due' ? 'Received' : 'Saved' : 'Delivered'} ✓
                          </span>
                        );
                      })()}
                    </td>

                    {/* Dispatched At */}
                    <td className="py-2.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {n.sent_at || n.delivered_at || n.created_at ? (
                        <>
                          <div className="flex items-center gap-1">
                            <span>{new Date(n.sent_at || n.delivered_at || n.created_at).toLocaleDateString()}</span>
                            {n.booking_status === 'CONFIRMED' && (
                              <span className="text-[10px] bg-blue-50 text-blue-600 font-semibold px-1 rounded border border-blue-200" title="Confirmed by Gentize">Confirmed</span>
                            )}
                          </div>
                          <div className="font-semibold text-slate-700 text-[11px]">
                            {new Date(n.sent_at || n.delivered_at || n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </div>
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {n.booking_id && (
                          <button
                            type="button"
                            onClick={() => onNavigateToBooking ? onNavigateToBooking(n.booking_id, n.booking_status === 'PENDING' ? 'PENDING' : 'ALL') : (setTab && setTab('bookings'))}
                            className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 border border-slate-200 transition flex items-center gap-1 shadow-2xs"
                            title="View in Bookings (Pending Approval)"
                          >
                            <Calendar className="w-3 h-3 text-orange-600" />
                            <span>View</span>
                          </button>
                        )}

                        {n.booking_id && n.booking_status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleConfirmBooking(n.booking_id)}
                              disabled={actionLoadingId === n.booking_id}
                              className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-orange-500 text-white hover:bg-orange-600 transition flex items-center gap-1 shadow-2xs"
                              title="Confirm Appointment"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Confirm</span>
                            </button>

                            <button
                              onClick={() => openRescheduleModal(n)}
                              className="p-1 rounded-lg text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition"
                              title="Re-Schedule"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>

                            <button
                              onClick={() => openCancelModal(n)}
                              className="p-1 rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                              title="Cancel"
                            >
                              <XCircle className="w-3 h-3" />
                            </button>
                          </>
                        )}

                        {n.isPersonalReminder ? <button onClick={() => setTab?.(n.isDailyRoutine ? 'daily-routine' : 'reminders')} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-50 text-orange-700">View reminder</button> : <button
                          onClick={() => handleRetry(n.id)}
                          disabled={retryingId === n.id}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition ${
                            n.status === 'FAILED'
                              ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                          title="Retry Outbound Delivery"
                        >
                          <RotateCcw className={`w-3 h-3 ${retryingId === n.id ? 'animate-spin' : ''}`} />
                          <span>{retryingId === n.id ? 'Sending...' : 'Retry'}</span>
                        </button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0 text-xs">
            <span className="text-slate-500 font-medium">
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredNotifications.length} items)
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition text-xs cursor-pointer"
              >
                Previous
              </button>
              {getPageNumbers().map((page, idx) => {
                if (page === '...') {
                  return (
                    <span key={`dots-${idx}`} className="px-1 text-slate-400 font-bold">
                      ...
                    </span>
                  );
                }
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-6 h-6 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      currentPage === page
                        ? 'bg-orange-500 text-white font-bold shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition text-xs cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RE-SCHEDULE MODAL */}
      <Modal
        isOpen={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        title="Re-Schedule Client Appointment"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleExecuteReschedule} className="space-y-4">
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-600 font-medium">
            Choose a new date and time for <strong><GentizeText>{rescheduleTarget?.client_name || 'Client'}</GentizeText></strong>.
            Both Client and Staff will receive an instant notification update.
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              New Meeting Date *
            </label>
            <input
              type="date"
              value={rescheduleForm.newDate}
              onChange={(e) => setRescheduleForm({ ...rescheduleForm, newDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Start Time (AM/PM) *
              </label>
              <CustomTimePicker
                value={rescheduleForm.newStartTime}
                onChange={(val) => setRescheduleForm({ ...rescheduleForm, newStartTime: val })}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                End Time (AM/PM) *
              </label>
              <CustomTimePicker
                value={rescheduleForm.newEndTime}
                onChange={(val) => setRescheduleForm({ ...rescheduleForm, newEndTime: val })}
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setRescheduleModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={rescheduling}
              className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-1.5"
            >
              {rescheduling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              <span>Confirm & Dispatch Update</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* CANCEL MODAL */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Client Appointment"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleExecuteCancel} className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 font-medium">
            Are you sure you want to cancel the appointment with <strong><GentizeText>{cancelTarget?.client_name || 'Client'}</GentizeText></strong>?
            The slot will be released and cancellation alerts sent to Client and Staff.
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Cancellation Reason (Shared with Client)
            </label>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Gentize Schedule Conflict / Emergency"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setCancelModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Keep Booking
            </button>
            <button
              type="submit"
              disabled={cancelling}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-1.5"
            >
              {cancelling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
              <span>Cancel Booking & Send Notice</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 10-Second Undo Banner for Clear All */}
      {undoActive && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="text-xs font-medium">All delivered notifications cleared.</span>
          <button
            type="button"
            onClick={handleUndoClear}
            className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo ({undoSeconds}s)</span>
          </button>
        </div>
      )}
    </div>
  );
}

