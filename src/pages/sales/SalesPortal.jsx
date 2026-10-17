import { GentizeText } from '../../components/common/GentizeText.jsx';
import { MobileDock } from '../../components/common/MobileDock.jsx';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  CalendarPlus,
  Clock,
  History,
  Briefcase,
  Bell,
  Settings,
  X,
  Menu,
  Search,
  Plus,
  RefreshCw,
  Sparkles,
  Video,
  ExternalLink,
  ChevronDown,
  Check,
  LogOut,
  User,
  Building2,
  Mail,
  Phone,
  CheckCircle2,
  FileText,
  Save,
  AlertCircle
} from 'lucide-react';
import { apiRequest } from '../../api/client.js';
import SalesLogin from './SalesLogin.jsx';

// Reusable Admin Sub-Views for full feature parity
import { AdminSchedules } from '../admin/AdminSchedules.jsx';
import { AdminBookings } from '../admin/AdminBookings.jsx';
import { AdminHistory } from '../admin/AdminHistory.jsx';
import { AdminNotifications } from '../admin/AdminNotifications.jsx';
import { SalesSettings } from './SalesSettings.jsx';

import {
  TIMEZONE_OPTIONS,
  DEFAULT_TIMEZONE_ID,
  getTimezoneById,
  formatTimeForZone,
  formatDateForZone,
} from '../../utils/timezoneUtils.js';
import { CountryFlags } from '../../components/admin_common/CountryFlags.jsx';

const PORTAL_OPTIONS = [
  { id: 'admin', name: 'Admin Portal', emoji: '🛡️', role: 'Gentize' },
  { id: 'user', name: 'User / Assistant', emoji: '📅', role: 'Staff Workspace' },
  { id: 'sales', name: 'Sales Team Portal', emoji: '💼', role: 'Sales Team Lead (Active)' },
  { id: 'client', name: 'Client Booking', emoji: '🌐', role: 'Public Booking Page' },

];

export default function SalesPortal({ onSwitchPortal }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('gentize_sales_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [tab, setTab] = useState('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isCreateScheduleOpen, setIsCreateScheduleOpen] = useState(false);
  const [bookingsFilter, setBookingsFilter] = useState('ALL');
  const [targetBookingId, setTargetBookingId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Timezone state
  const [selectedTzId, setSelectedTzId] = useState(() => {
    return localStorage.getItem('admin_selected_timezone') || DEFAULT_TIMEZONE_ID;
  });
  const [tzDropdownOpen, setTzDropdownOpen] = useState(false);
  const tzDropdownRef = useRef(null);

  // Portal Switcher state
  const [portalDropdownOpen, setPortalDropdownOpen] = useState(false);
  const portalDropdownRef = useRef(null);

  // Search popover state in navbar
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState({ bookings: [], clients: [], schedules: [] });
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Profile dropdown in navbar
  const [profileOpen, setProfileOpen] = useState(false);
  const profileDropdownRef = useRef(null);

  // Dashboard Data for Sales
  const [meetings, setMeetings] = useState([]);
  const [stats, setStats] = useState({
    totalMeetings: 0,
    scheduledCount: 0,
    completedCount: 0,
    wonCount: 0,
    pipelineValue: 0
  });
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listSearch, setListSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Detail Modal for Sales Meeting
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [leadSummaryText, setLeadSummaryText] = useState('');
  const [actionItemsText, setActionItemsText] = useState('');
  const [meetingLinkText, setMeetingLinkText] = useState('');
  const [savingSummary, setSavingSummary] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Quick New Meeting Modal
  const [isNewMeetingOpen, setIsNewMeetingOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    meetingTitle: '',
    clientName: '',
    clientCompany: '',
    clientEmail: '',
    clientPhone: '',
    meetingDate: new Date().toISOString().split('T')[0],
    startTime: '10:00 AM',
    endTime: '11:00 AM',
    meetingLink: '',
    purpose: 'Product Demo & Architecture Alignment',
    clientDescription: ''
  });

  const activeTimezone = useMemo(() => {
    return getTimezoneById(selectedTzId);
  }, [selectedTzId]);

  // Live clock
  const [nowDate, setNowDate] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNowDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentTime = useMemo(() => {
    return formatTimeForZone(nowDate, activeTimezone?.timeZone || 'Asia/Kolkata');
  }, [nowDate, activeTimezone]);

  const currentDateStr = useMemo(() => {
    return formatDateForZone(nowDate, activeTimezone?.timeZone || 'Asia/Kolkata');
  }, [nowDate, activeTimezone]);

  // Dynamic Greeting
  const greeting = useMemo(() => {
    const hour = nowDate.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, [nowDate]);

  // Notifications polling
  const checkNotifications = async () => {
    try {
      const unread = await apiRequest('/notifications?unreadOnly=true&target=SALES_LEAD');
      if (Array.isArray(unread)) {
        setUnreadCount(unread.length);
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (currentUser) {
      checkNotifications();
      const interval = setInterval(checkNotifications, 4000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Fetch Sales Meetings & Stats for Dashboard
  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const res = await apiRequest('/sales-meetings');
      if (res && res.success) {
        setMeetings(res.meetings || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error('Error fetching sales meetings for dashboard:', err);
    } finally {
      setDashboardLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (portalDropdownRef.current && !portalDropdownRef.current.contains(e.target)) {
        setPortalDropdownOpen(false);
      }
      if (tzDropdownRef.current && !tzDropdownRef.current.contains(e.target)) {
        setTzDropdownOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search in navbar
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
        const queryLower = q.toLowerCase();
        const bRes = await apiRequest('/admin/bookings?filter=ALL&target=SALES_LEAD').catch(() => ({ bookings: [] }));
        const allBookings = bRes.bookings || [];
        const filteredBookings = allBookings.filter(b =>
          b.client_name?.toLowerCase().includes(queryLower) ||
          b.company_name?.toLowerCase().includes(queryLower) ||
          b.purpose?.toLowerCase().includes(queryLower)
        ).slice(0, 5);

        setSearchResults({
          bookings: filteredBookings,
          clients: [],
          schedules: []
        });
      } catch (err) {
        console.error('Search query failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleNavigateToBooking = (bookingId, initialFilter = 'PENDING') => {
    setBookingsFilter(initialFilter);
    setTargetBookingId(bookingId);
    setTab('bookings');
  };

  const handleOpenDetail = (meeting) => {
    setSelectedMeeting(meeting);
    setLeadSummaryText(meeting.leadSummary || meeting.adminNotes || '');
    setActionItemsText(meeting.actionItems || '');
    setMeetingLinkText(meeting.meetingLink || '');
    setSaveSuccess(false);
  };

  const handleSaveSummary = async () => {
    if (!selectedMeeting) return;
    try {
      setSavingSummary(true);
      const res = await apiRequest(`/sales-meetings/${selectedMeeting.id}`, {
        method: 'PUT',
        body: {
          leadSummary: leadSummaryText,
          adminNotes: leadSummaryText,
          actionItems: actionItemsText,
          meetingLink: meetingLinkText.trim()
        }
      });
      if (res && res.success) {
        setSaveSuccess(true);
        fetchDashboardData();
        setSelectedMeeting(null);
      }
    } catch (err) {
      alert('Failed to update summary: ' + err.message);
    } finally {
      setSavingSummary(false);
    }
  };

  const handleConfirmMeeting = async (meetingId) => {
    try {
      const res = await apiRequest(`/sales-meetings/${meetingId}/confirm`, {
        method: 'POST'
      });
      if (res && res.success) {
        fetchDashboardData();
        checkNotifications();
        if (selectedMeeting && selectedMeeting.id === meetingId) {
          setSelectedMeeting(res.meeting);
        }
      }
    } catch (err) {
      alert('Failed to confirm meeting: ' + err.message);
    }
  };

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/sales-meetings', {
        method: 'POST',
        body: {
          meetingTitle: newForm.meetingTitle || `Sales Consultation - ${newForm.clientCompany || newForm.clientName}`,
          clientName: newForm.clientName,
          clientCompany: newForm.clientCompany,
          clientEmail: newForm.clientEmail,
          clientPhone: newForm.clientPhone,
          salesUserId: currentUser?.userId || 'lead',
          salesRepName: currentUser?.name || 'Gentize LEAD',
          meetingDate: newForm.meetingDate,
          startTime: newForm.startTime,
          endTime: newForm.endTime,
          meetingLink: newForm.meetingLink || 'https://meet.google.com/new',
          purpose: newForm.purpose,
          clientDescription: newForm.clientDescription || newForm.purpose,
          dealStage: 'Scheduled'
        }
      });
      if (res && res.success) {
        setIsNewMeetingOpen(false);
        fetchDashboardData();
      }
    } catch (err) {
      alert('Failed to schedule meeting: ' + err.message);
    }
  };

  const handleLogout = () => {
    try { localStorage.removeItem('gentize_sales_user'); } catch (_) {}
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <SalesLogin onLoginSuccess={setCurrentUser} onSwitchPortal={onSwitchPortal} />;
  }

  // Filter dashboard meetings
  const filteredMeetings = meetings.filter((m) => {
    const matchesSearch =
      !listSearch.trim() ||
      m.clientName?.toLowerCase().includes(listSearch.toLowerCase()) ||
      m.clientCompany?.toLowerCase().includes(listSearch.toLowerCase()) ||
      m.meetingTitle?.toLowerCase().includes(listSearch.toLowerCase()) ||
      m.purpose?.toLowerCase().includes(listSearch.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'confirmed' && (m.dealStage === 'Confirmed' || m.dealStage === 'Scheduled')) ||
      (statusFilter === 'completed' && m.dealStage === 'Completed');

    return matchesSearch && matchesStatus;
  });

  // Authentic Sales Team Lead Menu Items (Dedicated Portal)
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'schedules', label: 'Availability', icon: CalendarPlus },
    { id: 'bookings', label: 'Bookings', icon: Clock },
    { id: 'history', label: 'History', icon: History },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="mobile-portal min-h-screen bg-[#F8FAFC] flex text-slate-900 font-sans">
      <MobileDock active={tab} onSelect={setTab} onMenu={() => setMobileSidebarOpen(true)} items={[
        { id: 'dashboard', label: 'Home', icon: 'home' }, { id: 'schedules', label: 'Slots', icon: 'calendar' },
        { id: 'bookings', label: 'Bookings', icon: 'bookings' }, { id: 'notifications', label: 'Alerts', icon: 'notifications' },
      ]} />
      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* FULL-HEIGHT LEFT SIDEBAR - Identical to admin_common/Sidebar.jsx */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-100/90 flex flex-col justify-between transition-transform duration-200 ease-in-out select-none shadow-2xs lg:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="p-5 pb-24 flex flex-col gap-6 overflow-y-auto">
          {/* Logo Header without subtitle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img src="/logo.png" alt="Elevate" className="h-[50px] w-auto object-contain" />
            </div>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 lg:hidden cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items with exact Admin Indicator and Typography */}
          <nav className="flex flex-col gap-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setTab(item.id);
                    setMobileSidebarOpen(false);
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

        {/* Portal Switcher at Bottom - Exact from Image 2 */}
        <div className="p-3.5 border-t border-slate-100/90 mt-auto relative" ref={portalDropdownRef}>
          {portalDropdownOpen && (
            <div className="absolute bottom-full mb-2 left-3.5 right-3.5 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1 flex items-center justify-between">
                <span>Switch Portal</span>
                <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-bold">Elevate</span>
              </div>
              {PORTAL_OPTIONS.map((p) => {
                const isSelected = p.id === 'sales';
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (onSwitchPortal) onSwitchPortal(p.id);
                      setPortalDropdownOpen(false);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full px-3.5 py-2 text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-orange-50 text-orange-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{p.emoji}</span>
                      <div>
                        <p className="leading-tight"><GentizeText>{p.name}</GentizeText></p>
                        <p className="text-[10px] text-slate-400 font-normal"><GentizeText>{p.role}</GentizeText></p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-orange-500 stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => setPortalDropdownOpen(!portalDropdownOpen)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-orange-50/70 hover:bg-orange-50 border border-orange-200/90 rounded-2xl text-xs font-bold text-orange-700 shadow-2xs hover:shadow-xs transition-all active:scale-98 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">💼</span>
              <span className="tracking-tight text-xs font-bold text-orange-700">Sales Team Portal</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-orange-500 transition-transform duration-200 ${portalDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA WITH TOP NAVBAR */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Authentic Top Navbar - Identical to admin_common/Navbar.jsx */}
        <header className="bg-white/95 border-b border-slate-100/90 px-4 sm:px-8 py-2.5 flex items-center justify-between shadow-2xs">
          {/* Left: Mobile trigger */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Right Controls: Search Icon Button, Notifications & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Popover */}
            <div ref={searchContainerRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setSearchDropdownOpen((prev) => {
                    const next = !prev;
                    if (next) setTimeout(() => searchInputRef.current?.focus(), 60);
                    return next;
                  });
                }}
                className={`relative p-2 rounded-xl transition cursor-pointer ${
                  searchDropdownOpen ? 'bg-orange-100 text-orange-600 font-bold' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
                title="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              {searchDropdownOpen && (
                <div className="absolute right-0 mt-2 w-[340px] sm:w-[460px] max-w-[92vw] bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 animate-in fade-in slide-in-from-top-1 max-h-[75vh] overflow-y-auto space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search appointments, clients, schedules..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>
                  {searchResults.bookings.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bookings</p>
                      {searchResults.bookings.map((b) => (
                        <div
                          key={b.id}
                          onClick={() => {
                            handleNavigateToBooking(b.id);
                            setSearchDropdownOpen(false);
                          }}
                          className="p-2 hover:bg-orange-50 rounded-xl cursor-pointer text-xs flex justify-between items-center"
                        >
                          <div>
                            <p className="font-bold text-slate-900"><GentizeText>{b.client_name}</GentizeText></p>
                            <p className="text-[11px] text-slate-500">{b.date} • {b.display_time}</p>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">{b.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <button
              type="button"
              onClick={() => setTab('notifications')}
              className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full ring-2 ring-white" />
              )}
            </button>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="p-1 rounded-full hover:bg-slate-100 transition cursor-pointer flex items-center justify-center"
                title="Gentize LEAD (Sales Team Lead)"
              >
                <div className="w-8 h-8 rounded-full bg-[#ff7f00] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  GL
                </div>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900"><GentizeText>Gentize LEAD</GentizeText></p>
                    <p className="text-[10px] text-slate-400">lead@elevate.com</p>
                  </div>
                  <button
                    onClick={() => {
                      setTab('settings');
                      setProfileOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>Account Settings</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full px-3.5 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* MAIN TAB CONTENT CONTAINER */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {/* TAB 1: DASHBOARD (Identical layout and font to AdminDashboard.jsx) */}
          {tab === 'dashboard' && (
            <div className="space-y-6 max-w-7xl mx-auto pb-10">
              {/* Top Header: Welcome Banner + Live Time Pills */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 font-semibold text-[11px] uppercase tracking-wider border border-orange-200/60">
                      <Sparkles className="w-3.5 h-3.5 text-orange-500" /><GentizeText>
                      Gentize LEAD SALES WORKSPACE
                    </GentizeText></span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2 mt-1">
                    {greeting}<GentizeText logo>, Gentize LEAD </GentizeText><span className="inline-block">👋</span>
                  </h1>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    Sales lead consultation management, client requirement reviews, and live call scheduling.
                  </p>
                </div>

                {/* Live Date, Time & Timezone Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative" ref={tzDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setTzDropdownOpen(!tzDropdownOpen)}
                      className="h-9 inline-flex items-center gap-2 px-3 bg-white hover:bg-orange-50/50 border border-slate-200/90 hover:border-orange-300 rounded-xl shadow-2xs text-xs font-semibold text-slate-700 transition-all cursor-pointer"
                    >
                      <CountryFlags timezone={activeTimezone} />
                      <span className="font-bold text-slate-800">{activeTimezone.country}</span>
                      <span className="text-[10px] font-medium text-slate-400 font-mono">(<GentizeText>{activeTimezone.shortName}</GentizeText>)</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${tzDropdownOpen ? 'rotate-180 text-orange-500' : ''}`} />
                    </button>

                    {tzDropdownOpen && (
                      <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-orange-100/80 py-1.5 z-50 max-h-80 overflow-y-auto">
                        <div className="px-3 py-1.5 border-b border-slate-100 mb-1 flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Select Zone</span>
                          <span className="text-[10px] text-orange-600 font-semibold">{TIMEZONE_OPTIONS.length} Regions</span>
                        </div>
                        <div className="space-y-0.5 px-1">
                          {TIMEZONE_OPTIONS.map((tz) => (
                            <button
                              key={tz.id}
                              type="button"
                              onClick={() => {
                                setSelectedTzId(tz.id);
                                setTzDropdownOpen(false);
                              }}
                              className={`w-full px-2.5 py-2 rounded-xl text-left text-xs flex items-center justify-between transition-all cursor-pointer ${
                                tz.id === selectedTzId
                                  ? 'bg-orange-500 text-white font-bold shadow-xs'
                                  : 'text-slate-700 hover:bg-orange-50 hover:text-orange-700 font-medium'
                              }`}
                            >
                              <span className="min-w-0 inline-flex items-center gap-2">
                                <CountryFlags timezone={tz} />
                                <span className="truncate">{tz.country}</span>
                              </span>
                              <span className="text-[10px] font-mono"><GentizeText>{tz.shortName}</GentizeText></span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="h-9 flex items-center gap-2 px-3 bg-white border border-slate-200/80 rounded-xl shadow-2xs text-xs font-semibold text-slate-700">
                    <CalendarDays className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span>{currentDateStr}</span>
                  </div>

                  <div className="h-9 flex items-center gap-2 px-3 bg-white border border-slate-200/80 rounded-xl shadow-2xs text-xs font-semibold text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span className="text-slate-900 font-bold">{currentTime}</span>
                  </div>

                  <button
                    onClick={fetchDashboardData}
                    disabled={refreshing}
                    className="h-9 w-9 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-xl transition-all shadow-2xs flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
                    title="Refresh Dashboard"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Primary Action Toolbar */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => {
                      setTab('schedules');
                      setIsCreateScheduleOpen(true);
                    }}
                    className="h-9 px-3.5 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-sm shadow-orange-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Set Working Hours & Slots</span>
                  </button>
                </div>

                <button
                  onClick={() => setIsNewMeetingOpen(true)}
                  className="h-9 px-3.5 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100/80 border border-orange-200/80 rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                >
                  <Briefcase className="w-3.5 h-3.5 text-orange-500" />
                  <span>Schedule Sales Meeting</span>
                </button>
              </div>

              {/* KPI Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Sales Meetings</p>
                  <p className="text-3xl font-extrabold text-slate-900 mt-2">{stats.totalMeetings || meetings.length}</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Scheduled & Confirmed</p>
                  <p className="text-3xl font-extrabold text-blue-600 mt-2">{stats.scheduledCount || meetings.filter(m => m.dealStage === 'Scheduled' || m.dealStage === 'Confirmed').length}</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completed Sessions</p>
                  <p className="text-3xl font-extrabold text-emerald-600 mt-2">{stats.completedCount || meetings.filter(m => m.dealStage === 'Completed').length}</p>
                </div>
              </div>

              {/* Sales Meetings Table Card */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-orange-500" />
                      <span>Sales Team Meetings ({filteredMeetings.length})</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Client consultation requests, live join links, and meeting summaries.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative w-48 sm:w-64">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={listSearch}
                        onChange={(e) => setListSearch(e.target.value)}
                        placeholder="Search meetings..."
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>

                    <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                      <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setStatusFilter('confirmed')}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${statusFilter === 'confirmed' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
                      >
                        Scheduled
                      </button>
                      <button
                        onClick={() => setStatusFilter('completed')}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${statusFilter === 'completed' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
                      >
                        Completed
                      </button>
                    </div>
                  </div>
                </div>

                {dashboardLoading ? (
                  <div className="p-12 text-center text-slate-400">Loading sales appointments...</div>
                ) : filteredMeetings.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    <p className="font-bold text-slate-700 text-sm">No sales meetings found</p>
                    <p className="text-xs mt-1 text-slate-500">Bookings made for "Sales Team Lead" from Client Booking or Staff will appear here.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredMeetings.map((m) => {
                      const hasLink = Boolean(m.meetingLink);
                      return (
                        <div
                          key={m.id}
                          className="p-5 hover:bg-slate-50/70 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                {m.dealStage || 'Scheduled'}
                              </span>
                              <span className="text-xs font-bold text-slate-400">•</span>
                              <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-orange-500" />
                                {m.meetingDate} at {m.startTime}
                              </span>
                            </div>

                            <h3 className="text-base font-extrabold text-slate-900 truncate">
                              <GentizeText>{m.clientName}</GentizeText>
                              {m.clientCompany ? <span className="text-slate-500 font-semibold text-sm"> ({m.clientCompany})</span> : null}
                            </h3>

                            <p className="text-xs text-slate-600">
                              <span className="font-bold text-slate-700">Purpose: </span><GentizeText>{m.purpose}</GentizeText>
                            </p>

                            {(m.clientDescription || m.discussionNotes) && (
                              <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-xs text-slate-600">
                                <span className="font-bold text-slate-800">Client Description: </span>
                                <GentizeText>{m.clientDescription || m.discussionNotes}</GentizeText>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-center">
                            {hasLink && (
                              <a
                                href={m.meetingLink.startsWith('http') ? m.meetingLink : `https://${m.meetingLink}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/20 flex items-center gap-1.5 transition cursor-pointer"
                              >
                                <Video className="w-3.5 h-3.5" />
                                <span>Join Meeting</span>
                                <ExternalLink className="w-3 h-3 opacity-70" />
                              </a>
                            )}

                            {m.dealStage !== 'Confirmed' && (
                              <button
                                onClick={() => handleConfirmMeeting(m.id)}
                                className="px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />
                                <span>Confirm</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenDetail(m)}
                              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Summary & Notes</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: AVAILABILITY / SCHEDULES (Dedicated Sales Team Lead Availability) */}
          {tab === 'schedules' && (
            <AdminSchedules
              isCreateOpen={isCreateScheduleOpen}
              setIsCreateOpen={setIsCreateScheduleOpen}
              target="SALES_LEAD"
            />
          )}

          {/* TAB 3: BOOKINGS (Dedicated Sales Team Lead Bookings Only) */}
          {tab === 'bookings' && (
            <AdminBookings
              initialFilter={bookingsFilter}
              targetBookingId={targetBookingId}
              target="SALES_LEAD"
            />
          )}

          {/* TAB 4: HISTORY (Dedicated Sales Team Lead Past Records) */}
          {tab === 'history' && <AdminHistory target="SALES_LEAD" />}

          {/* TAB 5: NOTIFICATIONS (Dedicated Sales Team Lead Notifications) */}
          {tab === 'notifications' && (
            <AdminNotifications
              setTab={setTab}
              onNavigateToBooking={handleNavigateToBooking}
              target="SALES_LEAD"
            />
          )}

          {/* TAB 6: SETTINGS (Sales Team Lead Settings) */}
          {tab === 'settings' && <SalesSettings />}
        </main>
      </div>

      {/* DETAIL MODAL: Client Description FIRST, then Sales Lead Summary */}
      {selectedMeeting && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Meeting Details & Summary</h3>
                  <p className="text-xs text-slate-400">{selectedMeeting.meetingDate} at {selectedMeeting.startTime}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMeeting(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Meeting Link Bar */}
              {selectedMeeting.meetingLink && (
                <div className="p-4 bg-emerald-50 border border-emerald-200/90 rounded-2xl flex items-center justify-between gap-3">
                  <div className="truncate">
                    <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Live Video Meeting</p>
                    <p className="text-xs text-slate-600 truncate mt-0.5">{selectedMeeting.meetingLink}</p>
                  </div>
                  <a
                    href={selectedMeeting.meetingLink.startsWith('http') ? selectedMeeting.meetingLink : `https://${selectedMeeting.meetingLink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0"
                  >
                    <Video className="w-4 h-4" />
                    <span>Join Live</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                </div>
              )}

              {/* 1. FIRST: CLIENT DESCRIPTION */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-orange-500" />
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    1. Client Description & Requirements
                  </h4>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5 text-xs text-slate-700">
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div><span className="font-bold text-slate-900">Client:</span> <GentizeText>{selectedMeeting.clientName}</GentizeText></div>
                    <div><span className="font-bold text-slate-900">Company:</span> {selectedMeeting.clientCompany || 'N/A'}</div>
                    <div><span className="font-bold text-slate-900">Email:</span> {selectedMeeting.clientEmail || 'N/A'}</div>
                    <div><span className="font-bold text-slate-900">Phone:</span> {selectedMeeting.clientPhone || 'N/A'}</div>
                  </div>
                  <div className="pt-2 border-t border-slate-200/70">
                    <p className="font-bold text-slate-900 mb-1">Client Inbound Notes / Purpose:</p>
                    <p className="text-slate-700 whitespace-pre-line leading-relaxed bg-white p-3 rounded-xl border border-slate-200/70">
                      <GentizeText>{selectedMeeting.clientDescription || selectedMeeting.discussionNotes || 'No initial description provided.'}</GentizeText>
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. SECOND: SALES TEAM LEAD SUMMARY */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-500" />
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      2. Sales Team Lead Summary & Action Items
                    </h4>
                  </div>
                  {saveSuccess && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Meeting Summary / Discussion Points:
                    </label>
                    <textarea
                      rows={4}
                      value={leadSummaryText}
                      onChange={(e) => setLeadSummaryText(e.target.value)}
                      placeholder="Enter Sales Team Lead meeting summary, client requirements, and decisions reached..."
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Action Items & Next Steps:
                    </label>
                    <input
                      type="text"
                      value={actionItemsText}
                      onChange={(e) => setActionItemsText(e.target.value)}
                      placeholder="e.g. Follow up on Tuesday with customized proposal"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Meeting Link (Google Meet / Zoom):
                    </label>
                    <input
                      type="text"
                      value={meetingLinkText}
                      onChange={(e) => setMeetingLinkText(e.target.value)}
                      placeholder="https://meet.google.com/xyz-abc"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setSelectedMeeting(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveSummary}
                disabled={savingSummary}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {savingSummary ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Summary</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK NEW MEETING MODAL */}
      {isNewMeetingOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">Schedule Sales Meeting</h3>
              <button onClick={() => setIsNewMeetingOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMeeting} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Client Name *</label>
                <input
                  type="text"
                  required
                  value={newForm.clientName}
                  onChange={(e) => setNewForm({ ...newForm, clientName: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company *</label>
                <input
                  type="text"
                  required
                  value={newForm.clientCompany}
                  onChange={(e) => setNewForm({ ...newForm, clientCompany: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={newForm.meetingDate}
                    onChange={(e) => setNewForm({ ...newForm, meetingDate: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Time *</label>
                  <input
                    type="text"
                    required
                    value={newForm.startTime}
                    onChange={(e) => setNewForm({ ...newForm, startTime: e.target.value })}
                    placeholder="10:00 AM"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Meeting Link (Zoom / Meet)</label>
                <input
                  type="text"
                  value={newForm.meetingLink}
                  onChange={(e) => setNewForm({ ...newForm, meetingLink: e.target.value })}
                  placeholder="https://meet.google.com/abc-xyz"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Client Description / Purpose</label>
                <textarea
                  rows={3}
                  value={newForm.clientDescription}
                  onChange={(e) => setNewForm({ ...newForm, clientDescription: e.target.value, purpose: e.target.value })}
                  placeholder="Client requirements, discussion points..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewMeetingOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold"
                >
                  Schedule Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
