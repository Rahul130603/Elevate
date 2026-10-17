import { ProfileAvatar, usePortalProfile } from '../common/ProfileAvatar.jsx';
import { GentizeText } from '../common/GentizeText.jsx';
import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../../api/client.js';
import {
  Search,
  Bell,
  ChevronDown,
  User,
  LogOut,
  X,
  Clock,
  CalendarDays,
  ExternalLink,
  Loader2,
  Menu,
  Shield,
  Globe,
  Newspaper,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  Settings,
} from 'lucide-react';

const PORTAL_OPTIONS = [
  { id: 'admin', name: 'Admin Portal', emoji: '🛡️', role: 'Gentize' },
  { id: 'user', name: 'User / Assistant', emoji: '📅', role: 'Staff Workspace (Active)' },
  { id: 'sales', name: 'Sales Team Portal', emoji: '💼', role: 'Sales Team Lead' },
  { id: 'client', name: 'Client Booking', emoji: '🌐', role: 'Public Booking Page' },

];

export function UserNavbar({
  activeView,
  onViewChange,
  onOpenSidebar,
  onSwitchPortal,
  onLogout,
  unreadCount = 0,
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profile = usePortalProfile("user");
  const profileDropdownRef = useRef(null);

  // --- Live Search State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ bookings: [], schedules: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchDropdownOpen(false);
      }
    };
    const handleScroll = () => {
      setProfileOpen(false);
      setSearchDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Debounced live search
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults({ bookings: [], schedules: [] });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const [bookingsRes, schedulesRes] = await Promise.all([
          apiRequest('/user/master-bookings').catch(() => ({ bookings: [] })),
          apiRequest('/user/schedules').catch(() => ({ schedules: [] })),
        ]);

        const allBookings = bookingsRes?.bookings || [];
        const allSchedules = schedulesRes?.schedules || [];
        const lowerQ = q.toLowerCase();

        const filteredBookings = allBookings.filter((b) =>
          (b.client_name && b.client_name.toLowerCase().includes(lowerQ)) ||
          (b.client_email && b.client_email.toLowerCase().includes(lowerQ)) ||
          (b.client_phone && b.client_phone.includes(lowerQ)) ||
          (b.purpose && b.purpose.toLowerCase().includes(lowerQ)) ||
          (b.date && b.date.includes(lowerQ))
        ).slice(0, 5);

        const filteredSchedules = allSchedules.filter((s) =>
          (s.title && s.title.toLowerCase().includes(lowerQ)) ||
          (s.location && s.location.toLowerCase().includes(lowerQ)) ||
          (s.date && s.date.includes(lowerQ))
        ).slice(0, 5);

        setSearchResults({
          bookings: filteredBookings,
          schedules: filteredSchedules,
        });
      } catch (err) {
        console.error('User search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const hasResults = searchResults.bookings.length > 0 || searchResults.schedules.length > 0;

  return (
    <header className="bg-white/95 border-b border-slate-100 px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-2xs sticky top-0 z-30 backdrop-blur-md">
      {/* Left: Mobile Sidebar Trigger & Breadcrumb */}
      <div className="flex items-center gap-3">
        {onOpenSidebar && (
          <button
            type="button"
            onClick={onOpenSidebar}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5 text-orange-500" />
          </button>
        )}

        <div className="hidden sm:flex items-center gap-2">
          <span className="font-bold text-sm text-slate-900 tracking-tight">Elevate Workspace</span>
          <span className="text-slate-300">•</span>
          <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200 capitalize">
            {activeView === 'my-events' ? 'Calendar & Events' : activeView === 'available-schedules' ? 'Available Schedules' : activeView === 'my-bookings' ? 'My Bookings' : activeView}
          </span>
        </div>
      </div>

      <img src="/logo.png" alt="Elevate" className="h-7 w-auto max-w-[115px] object-contain sm:hidden" />
      {/* Right Controls: Search, Notification Bell, Portal Switcher, Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* 1. Global Live Search Popover */}
        <div ref={searchContainerRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setSearchDropdownOpen((prev) => {
                const nextState = !prev;
                if (nextState) {
                  setTimeout(() => searchInputRef.current?.focus(), 60);
                }
                return nextState;
              });
            }}
            className={`p-2 rounded-xl transition cursor-pointer ${
              searchDropdownOpen
                ? 'bg-orange-50 text-orange-600 font-bold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
            title="Search appointments, schedules..."
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Search Dropdown */}
          {searchDropdownOpen && (
            <div className="absolute right-0 mt-2 w-[340px] sm:w-[420px] max-w-[92vw] bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 animate-in fade-in slide-in-from-top-1 max-h-[75vh] overflow-y-auto space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Gentize bookings, client name, date..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {isSearching && (
                <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                  <span>Searching appointments...</span>
                </div>
              )}

              {!isSearching && searchQuery.trim().length > 0 && !hasResults && (
                <div className="py-6 text-center text-xs text-slate-400">
                  <p className="font-bold text-slate-600">No results found for &quot;{searchQuery}&quot;</p>
                </div>
              )}

              {!isSearching && searchQuery.trim().length > 0 && hasResults && (
                <div className="space-y-3">
                  {searchResults.bookings.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                        Bookings ({searchResults.bookings.length})
                      </p>
                      <div className="divide-y divide-slate-100 rounded-xl bg-slate-50/70 border border-slate-100 overflow-hidden">
                        {searchResults.bookings.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              onViewChange('my-bookings');
                              setSearchDropdownOpen(false);
                            }}
                            className="w-full p-2.5 text-left hover:bg-orange-50/60 transition flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-slate-900 truncate"><GentizeText>{b.client_name}</GentizeText></p>
                              <p className="text-[11px] text-slate-500 truncate">{b.date} • {b.display_time || b.start_time} - <GentizeText>{b.purpose}</GentizeText></p>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">#{b.id}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.schedules.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                        Schedules ({searchResults.schedules.length})
                      </p>
                      <div className="divide-y divide-slate-100 rounded-xl bg-slate-50/70 border border-slate-100 overflow-hidden">
                        {searchResults.schedules.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              onViewChange('schedules');
                              setSearchDropdownOpen(false);
                            }}
                            className="w-full p-2.5 text-left hover:bg-orange-50/60 transition flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-slate-900 truncate"><GentizeText>{s.title}</GentizeText></p>
                              <p className="text-[11px] text-slate-500 truncate">{s.date} • {s.displayStart} - {s.displayEnd}</p>
                            </div>
                            <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded shrink-0">
                              {s.available_slots} Open
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Notification Bell */}
        <button
          onClick={() => onViewChange('notifications')}
          className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[17px] text-[10px] font-bold bg-orange-500 text-white rounded-full flex items-center justify-center shadow-xs">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Profile Logo Button / Dropdown */}
        <div className="relative" ref={profileDropdownRef}>
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="p-1 rounded-xl hover:bg-slate-100/80 transition cursor-pointer flex items-center justify-center"
            title={`${profile.name || "User"} profile`}
            aria-label="User profile"
          >
            <div className="w-8 h-8 rounded-full bg-orange-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              <ProfileAvatar src={profile.avatar} name={profile.name || "Staff"} />
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 min-w-0">
                <ProfileAvatar src={profile.avatar} name={profile.name || "Staff"} className="w-11 h-11 text-base ring-2 ring-orange-100" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{profile.name || "User"}</p>
                  <p className="text-[11px] text-slate-400 truncate">{profile.email}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  onViewChange('settings');
                  setProfileOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-orange-500" />
                <span>Settings & Profile</span>
              </button>

              <div className="pt-1 mt-1 border-t border-slate-100">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    try {
                      localStorage.setItem('gentize_user_logged_out', 'true');
                      localStorage.removeItem('gentize_user_auth');
                      localStorage.removeItem('gentize_auth');
                      localStorage.removeItem('gentize_user');
                    } catch (_) {}
                    if (onLogout) {
                      onLogout();
                    } else if (onSwitchPortal) {
                      onSwitchPortal('user');
                    }
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer transition"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
