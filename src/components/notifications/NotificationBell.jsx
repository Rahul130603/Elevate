import React from 'react';
import { Bell } from 'lucide-react';

export default function NotificationBell({
  unreadCount = 0,
  onClick,
  isOpen = false,
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      aria-label={`Notifications, ${unreadCount} unread`}
      title="Notifications"
      className={`relative p-2.5 rounded-xl border transition-all cursor-pointer select-none active:scale-95 ${
        isOpen
          ? 'bg-blue-50 border-blue-300 text-blue-600 shadow-2xs'
          : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 shadow-2xs'
      }`}
    >
      <Bell className="w-5 h-5" />

      {/* Unread Count Badge - Disappears when 0 */}
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[10px] font-bold text-white bg-blue-600 rounded-full ring-2 ring-white shadow-xs animate-scaleIn">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
