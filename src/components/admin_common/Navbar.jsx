import { ProfileAvatar, usePortalProfile } from '../common/ProfileAvatar.jsx';
import { GentizeText } from '../common/GentizeText.jsx';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { apiRequest } from '../../api/client.js';
import {
  Search,
  Bell,
  ChevronDown,
  User,
  LogOut,
  X,
  Clock,
  UserCheck,
  CalendarDays,
  Calendar,
  Check,
  ExternalLink,
  Loader2,
  Menu
} from 'lucide-react';

const PORTAL_OPTIONS = [
  { id: 'admin', name: 'Admin Portal', emoji: '🛡️', role: 'Gentize (Active)' },
  { id: 'user', name: 'User / Assistant', emoji: '📅', role: 'Staff Workspace' },
  { id: 'sales', name: 'Sales Team Portal', emoji: '💼', role: 'Sales Team Lead' },
  { id: 'client', name: 'Client Booking', emoji: '🌐', role: 'Public Booking Page' },

];

export function Navbar({ activeTab, setActiveTab, onOpenSidebar, unreadCount: propUnreadCount, setUnreadCount: propSetUnreadCount, onSwitchPortal, onLogout }) {
  const { user, logout } = useAuth();
  const profile = usePortalProfile("admin");
  const [profileOpen, setProfileOpen] = useState(false);
  const profileDropdownRef = useRef(null);
  const isAdmin = user?.role === 'ADMIN';

  // --- 1. Global Live Search State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ bookings: [], clients: [], schedules: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  // --- 2. Notification Red Badge State ---
  const [lastReadTime, setLastReadTime] = useState(() => {
    try {
      const saved = localStorage.getItem('gentize_admin_notif_last_read');
      if (saved) return saved;
      const now = new Date().toISOString();
      localStorage.setItem('gentize_admin_notif_last_read', now);
      return now;
    } catch (_) {
      return new Date().toISOString();
    }
  });
  const [localUnreadCount, setLocalUnreadCount] = useState(0);
  const unreadCount = propUnreadCount !== undefined ? propUnreadCount : localUnreadCount;
  const setUnreadCount = propSetUnreadCount || setLocalUnreadCount;

  // Check unread notifications from backend
  const checkNotifications = async () => {
    if (propUnreadCount !== undefined) return;
    try {
      if (isAdmin) {
        const res = await apiRequest('/notifications?target=MD');
        const notifs = Array.isArray(res) ? res : (res?.notifications || []);
        const unread = notifs.filter(n => !n.isRead && !n.is_read);
        setUnreadCount(unread.length);
      }
    } catch (_) {
      // Quiet fallback
    }
  };

  // Poll for new notifications every 4 seconds for real-time reactivity
  useEffect(() => {
    if (propUnreadCount !== undefined) return;
    checkNotifications();
    const interval = setInterval(checkNotifications, 4000);

    const handleNotifsRead = () => {
      setUnreadCount(0);
      setLastReadTime(new Date().toISOString());
    };
    window.addEventListener('gentize_notifications_read', handleNotifsRead);
    window.addEventListener('gentize_notifications_updated', checkNotifications);

    return () => {
      clearInterval(interval);
      window.removeEventListener('gentize_notifications_read', handleNotifsRead);
      window.removeEventListener('gentize_notifications_updated', checkNotifications);
    };
  }, [isAdmin, propUnreadCount !== undefined]);

  // Click on Notification Bell
  const handleBellClick = () => {
    const now = new Date().toISOString();
    try {
      localStorage.setItem('gentize_admin_notif_last_read', now);
    } catch (_) {}
    setLastReadTime(now);
    setUnreadCount(0);
    apiRequest('/notifications/read-all', { method: 'POST' }).catch(() => {});
    window.dispatchEvent(new CustomEvent('gentize_notifications_read'));
    setActiveTab(isAdmin ? 'notifications' : 'my-bookings');
  };

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchDropdownOpen(false);
      }
    };
    const handleScroll = () => {
      setSearchDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Auto-close profile dropdown on outside click or on window scroll
  useEffect(() => {
    if (!profileOpen) return;
    const handleScroll = () => {
      setProfileOpen(false);
    };
    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileOpen]);

  // Debounced live search querying bookings, schedules, and clients
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults({ bookings: [], clients: [], schedules: [] });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const [bookingsRes, schedulesRes, clientsRes] = await Promise.all([
          apiRequest('/admin/bookings?all=true').catch(() => ({ bookings: [] })),
          apiRequest('/admin/events?all=true').catch(() => ({ schedules: [] })),
          apiRequest('/admin/clients').catch(() => ({ clients: [] }))
        ]);

        const allBookings = bookingsRes?.bookings || [];
        const allSchedules = schedulesRes?.schedules || [];
        const allClients = clientsRes?.clients || [];

        const lowerQ = q.toLowerCase();

        // 1. Filter Bookings / Appointments
        const filteredBookings = allBookings.filter(b => 
          (b.client_name && b.client_name.toLowerCase().includes(lowerQ)) ||
          (b.client_email && b.client_email.toLowerCase().includes(lowerQ)) ||
          (b.client_phone && b.client_phone.includes(lowerQ)) ||
          (b.meeting_purpose && b.meeting_purpose.toLowerCase().includes(lowerQ)) ||
          (b.purpose && b.purpose.toLowerCase().includes(lowerQ)) ||
          (b.location && b.location.toLowerCase().includes(lowerQ)) ||
          (b.date && b.date.includes(lowerQ))
        ).slice(0, 5);

        // 2. Filter Clients
        const filteredClients = allClients.filter(c =>
          (c.name && c.name.toLowerCase().includes(lowerQ)) ||
          (c.email && c.email.toLowerCase().includes(lowerQ)) ||
          (c.phone && c.phone.includes(lowerQ)) ||
          (c.company && c.company.toLowerCase().includes(lowerQ))
        ).slice(0, 5);

        // 3. Filter Schedules
        const filteredSchedules = allSchedules.filter(s =>
          (s.title && s.title.toLowerCase().includes(lowerQ)) ||
          (s.location && s.location.toLowerCase().includes(lowerQ)) ||
          (s.date && s.date.includes(lowerQ))
        ).slice(0, 5);

        setSearchResults({
          bookings: filteredBookings,
          clients: filteredClients,
          schedules: filteredSchedules
        });
      } catch (err) {
        console.error('Search query failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const hasResults =
    searchResults.bookings.length > 0 ||
    searchResults.clients.length > 0 ||
    searchResults.schedules.length > 0;

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults({ bookings: [], clients: [], schedules: [] });
  };

  return (
    <header className="bg-white/95 border-b border-slate-100/90 px-4 sm:px-8 py-2.5 flex items-center justify-between shadow-2xs">
      {/* Left Area: Mobile Sidebar Trigger */}
      <div className="flex items-center gap-2">
        {onOpenSidebar && (
          <button
            type="button"
            onClick={onOpenSidebar}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Right Controls: Search Icon Button, Notifications & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search Popover Button & Panel (placed right next to notifications) */}
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
            className={`relative p-2 rounded-xl transition cursor-pointer ${
              searchDropdownOpen
                ? 'bg-orange-100 text-orange-600 font-bold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
            title="Search appointments, clients, schedules..."
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Live Search Results Dropdown Panel */}
          {searchDropdownOpen && (
            <div className="absolute right-0 mt-2 w-[340px] sm:w-[460px] max-w-[92vw] bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 animate-in fade-in slide-in-from-top-1 max-h-[75vh] overflow-y-auto space-y-3">
              {/* Search input inside popover */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setSearchDropdownOpen(false);
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      setActiveTab('bookings');
                      setSearchDropdownOpen(false);
                    }
                  }}
                  placeholder="Search appointments, clients, schedules..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition shadow-2xs"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {isSearching && (
                <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                  <span>Searching Elevate database...</span>
                </div>
              )}

              {!isSearching && searchQuery.trim().length === 0 && (
                <div className="py-5 text-center text-xs text-slate-400 space-y-1">
                  <Search className="w-5 h-5 mx-auto text-slate-300 mb-1" />
                  <p className="font-semibold text-slate-600">Quick Global Search</p>
                  <p className="text-[11px]">Type client name, email, appointment date, or schedule title.</p>
                </div>
              )}

              {!isSearching && searchQuery.trim().length > 0 && !hasResults && (
                <div className="py-6 text-center text-xs text-slate-400 space-y-1">
                  <Search className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                  <p className="font-bold text-slate-600">No results found for &quot;{searchQuery}&quot;</p>
                  <p className="text-[11px]">Try searching with a client name, email, date, or appointment reference.</p>
                </div>
              )}

              {!isSearching && searchQuery.trim().length > 0 && hasResults && (
                <>
                  {/* 1. Bookings / Appointments Category */}
                  {searchResults.bookings.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-orange-600" />
                          <span>Bookings & Appointments ({searchResults.bookings.length})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('bookings');
                            setSearchDropdownOpen(false);
                          }}
                          className="text-orange-600 hover:underline font-bold"
                        >
                          View in Bookings ↗
                        </button>
                      </div>
                      <div className="divide-y divide-slate-100 rounded-xl bg-slate-50/70 border border-slate-100 overflow-hidden">
                        {searchResults.bookings.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              setActiveTab('bookings');
                              setSearchDropdownOpen(false);
                            }}
                            className="w-full p-2.5 text-left hover:bg-orange-50/60 transition flex items-center justify-between gap-3 group cursor-pointer"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-xs text-slate-900 group-hover:text-orange-600 truncate">
                                  <GentizeText>{b.client_name}</GentizeText>
                                </span>
                                <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded uppercase ${
                                  b.status === 'CONFIRMED'
                                    ? 'bg-orange-50 text-orange-600'
                                    : b.status === 'CANCELLED'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-orange-100 text-orange-600'
                                }`}>
                                  {b.status}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {b.date} • {b.display_time || b.displayTime || b.start_time} — <GentizeText>{b.purpose || b.meeting_purpose || b.location || 'Executive Meeting'}</GentizeText>
                              </p>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">#{String(b.id).slice(0, 8)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. Clients Category */}
                  {searchResults.clients.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2">
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-orange-500" />
                          <span>Clients ({searchResults.clients.length})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('clients');
                            setSearchDropdownOpen(false);
                          }}
                          className="text-orange-600 hover:underline font-bold"
                        >
                          View in Clients ↗
                        </button>
                      </div>
                      <div className="divide-y divide-slate-100 rounded-xl bg-slate-50/70 border border-slate-100 overflow-hidden">
                        {searchResults.clients.map((c, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setActiveTab('clients');
                              setSearchDropdownOpen(false);
                            }}
                            className="w-full p-2.5 text-left hover:bg-orange-50/60 transition flex items-center justify-between gap-3 group cursor-pointer"
                          >
                            <div className="min-w-0">
                              <span className="font-extrabold text-xs text-slate-900 group-hover:text-orange-600 block truncate">
                                <GentizeText>{c.name}</GentizeText>
                              </span>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {c.email || 'No email'} {c.phone ? `• ${c.phone}` : ''} {c.company ? `• ${c.company}` : ''}
                              </p>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                              {c.totalBookings || c.total_bookings || 1} Bookings
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Schedules Category */}
                  {searchResults.schedules.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3 text-orange-500" />
                          <span>Availability Schedules ({searchResults.schedules.length})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('schedules');
                            setSearchDropdownOpen(false);
                          }}
                          className="text-orange-600 hover:underline font-bold"
                        >
                          View Schedules ↗
                        </button>
                      </div>
                      <div className="divide-y divide-slate-100 rounded-xl bg-slate-50/70 border border-slate-100 overflow-hidden">
                        {searchResults.schedules.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setActiveTab('schedules');
                              setSearchDropdownOpen(false);
                            }}
                            className="w-full p-2.5 text-left hover:bg-orange-50/60 transition flex items-center justify-between gap-3 group cursor-pointer"
                          >
                            <div className="min-w-0">
                              <span className="font-extrabold text-xs text-slate-900 group-hover:text-slate-900 block truncate">
                                <GentizeText>{s.title}</GentizeText>
                              </span>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {s.date || s.min_date} • {s.start_time || s.startTime} - {s.end_time || s.endTime} • <GentizeText>{s.location || 'Gentize Office'}</GentizeText>
                              </p>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                              {s.total_slots || s.totalSlots || 0} Slots
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Notification Bell with Reactive Red Dot */}
        <button
          type="button"
          onClick={handleBellClick}
          className={`relative p-2 rounded-xl transition cursor-pointer flex items-center justify-center ${
            activeTab === 'notifications'
              ? 'bg-orange-100 text-slate-900 font-bold'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
          title={unreadCount > 0 ? `${unreadCount} new notifications` : 'Notifications'}
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4 text-slate-600" />
          {/* Count badge appears ONLY when there are new unread notifications */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[18px] text-[10px] font-bold bg-orange-500 text-white rounded-full flex items-center justify-center shadow-xs">
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
            title="Account Profile"
            aria-label="User profile"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-xs ${
              isAdmin ? 'bg-orange-600' : 'bg-orange-500'
            }`}>
              <ProfileAvatar src={profile.avatar} name={profile.name || user?.name || "Gentize"} />
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900"><GentizeText>{user?.name}</GentizeText></p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  setActiveTab(isAdmin ? 'settings' : 'profile');
                  setProfileOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Account Profile</span>
              </button>
              <button
                onClick={() => {
                  if (onSwitchPortal) onSwitchPortal('user');
                  setProfileOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-xs font-bold text-orange-700 hover:bg-orange-50 flex items-center gap-2 cursor-pointer border-t border-slate-100"
              >
                <Calendar className="w-3.5 h-3.5 text-orange-600" />
                <span>Switch to User Calendar</span>
              </button>
              <button
                onClick={() => {
                  if (onLogout) onLogout();
                  logout();
                  setProfileOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

