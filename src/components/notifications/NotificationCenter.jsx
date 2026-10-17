import { GentizeText } from '../common/GentizeText.jsx';
import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../../api/client.js';
import {
  Bell,
  Calendar,
  CalendarPlus,
  Trash2,
  Settings,
  Clock,
  Menu,
  X,
  User,
  Building2,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';

function getNotificationIcon(type) {
  const t = (type || '').toLowerCase();
  switch (t) {
    case 'reminder':
    case 'event_reminder':
      return (
        <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 text-orange-500 flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5" />
        </div>
      );
    case 'updated':
    case 'reschedule':
    case 'event_updated':
      return (
        <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 text-orange-500 flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5" />
        </div>
      );
    case 'created':
    case 'booking':
    case 'push':
    case 'event_created':
      return (
        <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 text-orange-500 flex items-center justify-center shrink-0">
          <CalendarPlus className="w-5 h-5" />
        </div>
      );
    case 'cancelled':
    case 'deleted':
    case 'cancellation':
      return (
        <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center shrink-0">
          <Trash2 className="w-5 h-5" />
        </div>
      );
    default:
      return (
        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5" />
        </div>
      );
  }
}

function formatNotificationTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffHours = (now - date) / (1000 * 60 * 60);

  if (diffHours < 24 && now.getDate() === date.getDate()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (yesterday.toDateString() === date.toDateString()) {
    return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function NotificationCenter({
  notifications = [],
  unreadCount = 0,
  activeCategory = 'all',
  onCategoryChange,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
  onOpenSettings,
  onEventClick,
  onOpenMobileMenu,
  onNavigateToBookings,
  loading = false,
}) {
  const [selectedNotif, setSelectedNotif] = useState(null);
  const unreadItemsCount = notifications.filter((n) => !n.isRead).length;

  // 3-Second Undo State for Clear All
  const [undoActive, setUndoActive] = useState(false);
  const [undoSeconds, setUndoSeconds] = useState(3);
  const undoActiveRef = useRef(false);
  const [clearedHidden, setClearedHidden] = useState(false);
  const clearedBackupRef = useRef([]);
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

  const commitClearAll = async () => {
    cleanupUndoTimers();
    setUndoActive(false);
    clearedBackupRef.current = [];
    try {
      await apiRequest('/notifications/clear-all', { method: 'DELETE' });
      if (typeof onClearAll === 'function') onClearAll();
    } catch (err) {
      console.error('Failed to commit clear-all on backend:', err);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (undoActiveRef.current) {
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
        fetch('/api/notifications/clear-all', { method: 'POST', keepalive: true }).catch(() => {});
      }
      cleanupUndoTimers();
    };
  }, []);

  const handleClearAll = () => {
    if (filteredNotifications.length === 0) return;

    clearedBackupRef.current = [...notifications];
    setClearedHidden(true);
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
      await commitClearAll();
    }, 3000);
  };

  const handleUndoClear = () => {
    cleanupUndoTimers();
    setClearedHidden(false);
    clearedBackupRef.current = [];
    setUndoActive(false);
  };

  const isWithinLast7Days = (dateString) => {
    if (!dateString) return true;
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return true;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      cutoff.setHours(0, 0, 0, 0);
      return d >= cutoff;
    } catch {
      return true;
    }
  };

  const filteredNotifications = clearedHidden ? [] : notifications.filter((item) => {
    if (!isWithinLast7Days(item.deliveredAt || item.createdAt || item.sent_at)) return false;
    if (activeCategory === 'unread') return !item.isRead;
    return true;
  });

  const handleOpenDetails = (item) => {
    if (!item.isRead && onMarkAsRead) {
      onMarkAsRead(item.id);
    }
    setSelectedNotif(item);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Notifications
              </h1>
              <span className="text-[11px] font-semibold text-orange-700 bg-orange-50 border border-orange-200/80 px-2 py-0.5 rounded-full">
                Last 7 Days Only
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Stay updated with your appointments and activity. Click any notification for full details.
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={onMarkAllAsRead}
            className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200/80 rounded-xl hover:bg-slate-50 transition-all shadow-2xs active:scale-95 cursor-pointer"
          >
            Mark all as read
          </button>

          <button
            onClick={handleClearAll}
            title="Clear all notifications"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200/80 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              title="Notification Settings"
              aria-label="Notification Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: `All ${notifications.length}` },
          { id: 'unread', label: 'Unread', badge: unreadItemsCount },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => onCategoryChange && onCategoryChange(tab.id)}
            className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeCategory === tab.id
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
            }`}
          >
            <span><GentizeText>{tab.label}</GentizeText></span>
            {tab.badge > 0 && activeCategory !== tab.id && (
              <span className="w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {loading && (
          <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-100">
            Loading notifications...
          </div>
        )}

        {!loading && filteredNotifications.length === 0 && (
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-200">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No notifications</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              You are all caught up with your schedule!
            </p>
          </div>
        )}

        {!loading &&
          filteredNotifications.map((item) => {
            const isUnread = !item.isRead;

            return (
              <div
                key={item.id}
                onClick={() => handleOpenDetails(item)}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:bg-orange-50/20 hover:border-orange-200 transition-all flex items-center justify-between gap-4 cursor-pointer group"
              >
                {/* Left: Icon & Text */}
                <div className="flex items-center gap-3.5 min-w-0">
                  {getNotificationIcon(item.type)}

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors leading-tight">
                      <GentizeText>{item.title}</GentizeText>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5 truncate max-w-lg">
                      <GentizeText>{item.message}</GentizeText>
                    </p>
                  </div>
                </div>

                {/* Right: Timestamp & Details button & Dot */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                    {formatNotificationTime(item.createdAt || item.deliveredAt || item.sent_at)}
                  </span>

                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isUnread ? 'bg-orange-500' : 'bg-slate-300'
                    }`}
                  />

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDetails(item);
                    }}
                    className="text-[11px] font-bold text-orange-600 bg-white group-hover:bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200 transition cursor-pointer"
                  >
                    Details →
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {/* ========================================================================= */}
      {/* NOTIFICATION DETAILS MODAL                                                */}
      {/* ========================================================================= */}
      {selectedNotif && (
        <div
          onClick={() => setSelectedNotif(null)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full border border-slate-200/90 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150 relative max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                {getNotificationIcon(selectedNotif.type)}
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                    <GentizeText>{selectedNotif.title}</GentizeText>
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 uppercase">
                      {selectedNotif.type || 'NOTIFICATION'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3 text-orange-500" />
                      {formatNotificationTime(selectedNotif.createdAt || selectedNotif.deliveredAt || selectedNotif.sent_at)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedNotif(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Full Message Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Notification Content
              </span>
              <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed whitespace-pre-wrap">
                <GentizeText>{selectedNotif.message}</GentizeText>
              </p>
            </div>

            {/* Appointment Details Grid (if available) */}
            {(selectedNotif.booking_date || selectedNotif.client_name || selectedNotif.booking_id || selectedNotif.location || selectedNotif.displayTime) && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Appointment Details
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {selectedNotif.booking_date && (
                    <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-orange-500 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block">Date</span>
                        <strong className="text-slate-800 font-bold">{selectedNotif.booking_date}</strong>
                      </div>
                    </div>
                  )}

                  {(selectedNotif.displayTime || selectedNotif.time) && (
                    <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block">Scheduled Time</span>
                        <strong className="text-slate-800 font-bold">{selectedNotif.displayTime || selectedNotif.time}</strong>
                      </div>
                    </div>
                  )}

                  {(selectedNotif.client_name || selectedNotif.recipient) && (
                    <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center gap-2.5">
                      <User className="w-4 h-4 text-orange-500 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block">Attendee / Client</span>
                        <strong className="text-slate-800 font-bold truncate block"><GentizeText>{selectedNotif.client_name || selectedNotif.recipient}</GentizeText></strong>
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center gap-2.5">
                    <Building2 className="w-4 h-4 text-orange-500 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">Venue</span>
                      <strong className="text-slate-800 font-bold truncate block"><GentizeText>{selectedNotif.location || 'Gentize Cabin, Chennai'}</GentizeText></strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              {onDelete ? (
                <button
                  type="button"
                  onClick={() => {
                    onDelete(selectedNotif.id);
                    setSelectedNotif(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                {onNavigateToBookings && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedNotif(null);
                      onNavigateToBookings();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl border border-orange-200 transition cursor-pointer"
                  >
                    <span>View in Bookings</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedNotif(null)}
                  className="px-4 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition shadow-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
