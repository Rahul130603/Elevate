import { GentizeText } from '../common/GentizeText.jsx';
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  LayoutDashboard,
  Newspaper,
  CalendarDays,
  CalendarPlus,
  Clock,
  Users,
  UserCheck,
  Bell,
  Settings,
  Calendar,
  LogOut,
  ChevronRight,
  ExternalLink,
  Copy,
  X,
  Briefcase,
  History,
  ChevronDown,
  Check,
} from 'lucide-react';

const PORTAL_OPTIONS = [
  { id: 'admin', name: 'Admin Portal', emoji: '🛡️', role: 'Gentize (Active)' },
  { id: 'user', name: 'User / Assistant', emoji: '📅', role: 'Staff Workspace' },
  { id: 'sales', name: 'Sales Team Portal', emoji: '💼', role: 'Sales Team Lead' },
  { id: 'client', name: 'Client Booking', emoji: '🌐', role: 'Public Booking Page' },

];

export function Sidebar({ currentTab, setTab, onOpenClientBooking, mobileOpen = false, onCloseMobile, unreadCount = 0, onSwitchPortal, onLogout }) {
  const { user, logout } = useAuth();
  const [portalDropdownOpen, setPortalDropdownOpen] = useState(false);
  const portalDropdownRef = useRef(null);

  useEffect(() => {
    if (!portalDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (portalDropdownRef.current && !portalDropdownRef.current.contains(e.target)) {
        setPortalDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [portalDropdownOpen]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'industry-news', label: 'Industry News', icon: Newspaper },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'reminders', label: 'Reminders', icon: Bell },
    { id: 'daily-routine', label: 'Daily Routine', icon: CalendarDays },
    { id: 'schedules', label: 'Availability', icon: CalendarPlus },
    { id: 'bookings', label: 'Bookings', icon: Clock },
    { id: 'history', label: 'History', icon: History },
    { id: 'sales-meetings', label: 'Sales Team Meeting', icon: Briefcase },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'clients', label: 'Clients', icon: UserCheck },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden animate-fadeIn"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-100/90 flex flex-col justify-between transition-transform duration-200 ease-in-out select-none shadow-2xs lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Top: Brand Logo & Navigation */}
        <div className="p-5 pb-24 flex flex-col gap-6 overflow-y-auto">
          {/* Logo Header matching Image 1 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img src="/logo.png" alt="Elevate" className="h-[50px] w-auto object-contain" />
            </div>

            {/* Mobile Close Button */}
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 lg:hidden cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation Items matching Image 1 */}
          <nav className="flex flex-col gap-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setTab(item.id);
                    if (item.id === 'notifications') {
                      try {
                        localStorage.setItem('gentize_admin_notif_last_read', new Date().toISOString());
                      } catch (_) {}
                      window.dispatchEvent(new CustomEvent('gentize_notifications_read'));
                    }
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`group relative flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-orange-50 text-orange-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {/* Active Left Indicator Bar */}
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-1.5 bg-orange-500 rounded-r-md" />
                  )}

                  <div className="flex items-center gap-3 pl-1">
                    <Icon
                      className={`w-5 h-5 transition-colors ${
                        isActive
                          ? 'text-orange-500'
                          : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    <span><GentizeText>{item.label}</GentizeText></span>
                  </div>

                  {item.id === 'notifications' && unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-[11px] font-semibold bg-orange-500 text-white rounded-full shadow-xs">
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
        </nav>
      </div>

      {/* Portal Switcher at Bottom */}
      <div className="p-3.5 border-t border-slate-100/90 mt-auto relative" ref={portalDropdownRef}>
        {portalDropdownOpen && (
          <div className="absolute bottom-full mb-2 left-3.5 right-3.5 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-2 z-50 animate-in fade-in zoom-in-95">
            <div className="px-3.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1 flex items-center justify-between">
              <span>Switch Portal</span>
              <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-bold">Elevate</span>
            </div>
            {PORTAL_OPTIONS.map((p) => {
              const isSelected = p.id === 'admin';
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    if (onSwitchPortal) onSwitchPortal(p.id);
                    setPortalDropdownOpen(false);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-orange-50 text-orange-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm leading-none">{p.emoji}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-xs truncate"><GentizeText>{p.name}</GentizeText></p>
                      <p className="text-[10px] text-slate-400 truncate"><GentizeText>{p.role}</GentizeText></p>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-orange-500 stroke-[2.5]" />}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPortalDropdownOpen(!portalDropdownOpen)}
            className="flex-1 flex items-center justify-between px-3.5 py-2.5 bg-[#FFF8F1] hover:bg-[#FFF2E2] border border-orange-200/90 rounded-2xl text-xs font-bold text-[#9A3412] shadow-2xs hover:shadow-xs transition-all active:scale-98 cursor-pointer min-w-0"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="text-sm leading-none shrink-0">🛡️</span>
              <span className="tracking-tight text-xs font-bold text-[#9A3412] truncate">Admin Portal</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-orange-500 shrink-0 transition-transform duration-200 ${portalDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title="Sign Out / Lock Admin Portal"
              className="p-2.5 rounded-2xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 transition shadow-2xs cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
    </>
  );
}

export default Sidebar;
