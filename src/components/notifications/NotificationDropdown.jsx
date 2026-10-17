import { GentizeText } from '../common/GentizeText.jsx';
import React, { useEffect, useRef } from 'react';
import {
  Bell,
  CheckCheck,
  Clock,
  Calendar,
  CheckCircle2,
  RefreshCw,
  XCircle,
  Settings,
  X,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { formatDateDisplay, formatTimeDisplay } from '../../utils/calendarUtils.js';

function getNotificationIcon(type) {
  switch (type) {
    case 'reminder':
      return <Clock className="w-4 h-4 text-amber-600" />;
    case 'upcoming':
      return <Calendar className="w-4 h-4 text-blue-600" />;
    case 'created':
      return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    case 'updated':
      return <RefreshCw className="w-4 h-4 text-sky-600" />;
    case 'cancelled':
      return <XCircle className="w-4 h-4 text-rose-600" />;
    default:
      return <Bell className="w-4 h-4 text-slate-600" />;
  }
}

function getNotificationBg(type) {
  switch (type) {
    case 'reminder':
      return 'bg-amber-50 border-amber-100';
    case 'upcoming':
      return 'bg-blue-50 border-blue-100';
    case 'created':
      return 'bg-emerald-50 border-emerald-100';
    case 'updated':
      return 'bg-sky-50 border-sky-100';
    case 'cancelled':
      return 'bg-rose-50 border-rose-100';
    default:
      return 'bg-slate-50 border-slate-100';
  }
}

export default function NotificationDropdown({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onOpenSettings,
  onViewEvent,
  onViewAllNotifications,
  activeCategory,
  onCategoryChange,
  loading,
}) {
  const panelRef = useRef(null);

  // Close on click outside or ESC
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('touchstart', handleClickOutside);
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('touchstart', handleClickOutside);
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Backdrop */}
      <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden animate-fadeIn" />

      {/* Dropdown Container: Dropdown on Desktop, Slide-up Bottom Sheet on Mobile */}
      <div
        ref={panelRef}
        className="fixed md:absolute bottom-0 md:bottom-auto left-0 md:left-auto right-0 md:right-0 md:top-full md:mt-2 z-50 w-full md:w-[420px] max-h-[85vh] md:max-h-[560px] bg-white rounded-t-3xl md:rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-slideUp md:animate-fadeIn"
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-slate-900">Notifications</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-800 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark all read</span>
              </button>
            )}

            <button
              onClick={onOpenSettings}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Notification Settings"
              aria-label="Notification Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Close"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Tabs: All, Unread */}
        <div className="flex items-center px-4 py-2 border-b border-slate-100 bg-white gap-1 text-xs font-semibold overflow-x-auto">
          {['all', 'unread'].map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-all shrink-0 cursor-pointer ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Notifications Scrollable List */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-100 p-1">
          {loading && (
            <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
              Loading notifications...
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-2">
                <Bell className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No notifications</p>
              <p className="text-xs text-slate-400 mt-0.5">
                You're all caught up with your schedule!
              </p>
            </div>
          )}

          {!loading &&
            notifications.map((item) => {
              const isUnread = !item.isRead;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (isUnread) onMarkAsRead(item.id);
                    if (item.eventId) {
                      onViewEvent(item.eventId);
                      onClose();
                    }
                  }}
                  className={`group p-3.5 sm:p-4 rounded-xl transition-all cursor-pointer flex items-start gap-3 ${
                    isUnread
                      ? 'bg-blue-50/50 hover:bg-blue-100/40'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Category Icon */}
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${getNotificationBg(
                      item.type
                    )}`}
                  >
                    {getNotificationIcon(item.type)}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4
                        className={`text-xs sm:text-sm font-semibold truncate ${
                          isUnread ? 'text-slate-900 font-bold' : 'text-slate-700'
                        }`}
                      >
                        <GentizeText>{item.title}</GentizeText>
                      </h4>

                      {/* Unread indicator dot */}
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>

                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      <GentizeText>{item.message}</GentizeText>
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1 text-[11px] text-slate-400">
                      <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                      {item.eventId && (
                        <span className="inline-flex items-center gap-0.5 text-blue-600 font-semibold group-hover:underline">
                          <span>View Event</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Panel Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-center">
          <button
            onClick={() => {
              onViewAllNotifications();
              onClose();
            }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline py-1 px-3 cursor-pointer"
          >
            View All in Notification Center
          </button>
        </div>
      </div>
    </>
  );
}
