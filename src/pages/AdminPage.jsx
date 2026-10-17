import React, { useState, useEffect, useRef } from 'react';
import { MobileDock } from '../components/common/MobileDock.jsx';
import { Sidebar } from '../components/admin_common/Sidebar.jsx';
import { Navbar } from '../components/admin_common/Navbar.jsx';
import { apiRequest } from '../api/client.js';
import { notificationService } from '../services/notificationService.js';

// Admin Sub-Views
import { AdminDashboard } from './admin/AdminDashboard.jsx';
import { AdminCalendar } from './admin/AdminCalendar.jsx';
import { AdminReminders } from './admin/AdminReminders.jsx';
import { AdminDailyRoutine } from './admin/AdminDailyRoutine.jsx';
import ReminderAlert from '../components/calendar/ReminderAlert.jsx';
import { REMINDER_HISTORY_CHANGED, reminderUnreadCount, markReminderNotificationsRead } from '../services/reminderNotificationHistory.js';
import { AdminSchedules } from './admin/AdminSchedules.jsx';
import { AdminBookings } from './admin/AdminBookings.jsx';
import { AdminHistory } from './admin/AdminHistory.jsx';
import { AdminSalesMeetings } from './admin/AdminSalesMeetings.jsx';
import { AdminUsers } from './admin/AdminUsers.jsx';
import { AdminClients } from './admin/AdminClients.jsx';
import { AdminNotifications } from './admin/AdminNotifications.jsx';
import { AdminSettings } from './admin/AdminSettings.jsx';
import { AdminLogin } from './admin/AdminLogin.jsx';
import { AdminIndustryNews } from './admin/AdminIndustryNews.jsx';

export default function AdminPage({ onSwitchPortal, onOpenClient }) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    try {
      return !!localStorage.getItem('gentize_admin_auth');
    } catch {
      return false;
    }
  });

  const [industry, setIndustry] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gentize_admin_auth') || 'null')?.industry || ''; } catch { return ''; }
  });
  const [tab, setTab] = useState('dashboard');
  const [isCreateScheduleOpen, setIsCreateScheduleOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [bookingsFilter, setBookingsFilter] = useState('ALL');
  const [targetBookingId, setTargetBookingId] = useState(null);
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);
  const notifiedIdsRef = useRef(new Set());
  const serverUnreadRef = useRef(0);

  const handleLoginSuccess = (adminData) => {
    try {
      localStorage.setItem('gentize_admin_auth', JSON.stringify(adminData));
      localStorage.setItem('gentize_user', JSON.stringify(adminData));
    } catch (_) {}
    setIndustry(adminData.industry);
    setTab('dashboard');
    setIsAdminAuthenticated(true);
  };

  const handleAdminLogout = () => {
    apiRequest('/admin/logout', { method: 'POST' }).catch(() => {});
    try {
      localStorage.removeItem('gentize_admin_auth');
    } catch (_) {}
    setIsAdminAuthenticated(false);
  };

  useEffect(() => {
    if (!isAdminAuthenticated || !industry) return;
    let cancelled = false;
    apiRequest('/admin/news-session').then(session => {
      if (!cancelled) setIndustry(session.industry);
    }).catch(() => {
      if (cancelled) return;
      localStorage.removeItem('gentize_admin_auth');
      setIsAdminAuthenticated(false);
    });
    return () => { cancelled = true; };
  }, [isAdminAuthenticated]);

  const checkAdminNotifications = async () => {
    try {
      const res = await apiRequest('/notifications?target=MD');
      const notifs = Array.isArray(res) ? res : (res?.notifications || []);
      const unread = notifs.filter(n => !n.isRead && !n.is_read);
      serverUnreadRef.current = unread.length;
      setAdminUnreadCount(unread.length + reminderUnreadCount());

      // Trigger native notification for new incoming alerts
      unread.forEach(n => {
        if (!notifiedIdsRef.current.has(n.id)) {
          notifiedIdsRef.current.add(n.id);
          notificationService.scheduleLocalDeviceNotification({
            id: n.id,
            title: n.title || 'New Booking Alert 🔔',
            body: n.message || n.body || 'You have received a new booking update.',
          });
        }
      });
    } catch (_) {}
  };

  useEffect(() => {
    if (!isAdminAuthenticated) return;
    const interval = setInterval(checkAdminNotifications, 4000);
    const handleRead = () => {
      serverUnreadRef.current = 0;
      markReminderNotificationsRead();
      setAdminUnreadCount(0);
      try { localStorage.setItem('gentize_admin_notif_last_read', new Date().toISOString()); } catch (_) {}
    };
    window.addEventListener('gentize_notifications_read', handleRead);
    const handleReminderHistory = () => {
      if (tab === 'notifications') markReminderNotificationsRead();
      setAdminUnreadCount(serverUnreadRef.current + reminderUnreadCount());
    };
    handleReminderHistory();
    window.addEventListener(REMINDER_HISTORY_CHANGED, handleReminderHistory);
    window.addEventListener('storage', handleReminderHistory);
    window.addEventListener('gentize_notifications_updated', checkAdminNotifications);
    return () => {
      clearInterval(interval);
      window.removeEventListener('gentize_notifications_read', handleRead);
      window.removeEventListener(REMINDER_HISTORY_CHANGED, handleReminderHistory);
      window.removeEventListener('storage', handleReminderHistory);
      window.removeEventListener('gentize_notifications_updated', checkAdminNotifications);
    };
  }, [isAdminAuthenticated, tab]);

  useEffect(() => {
    if (tab === 'notifications') {
      serverUnreadRef.current = 0;
      markReminderNotificationsRead();
      apiRequest('/notifications/read-all', { method: 'POST' }).catch(() => {});
      try { localStorage.setItem('gentize_admin_notif_last_read', new Date().toISOString()); } catch (_) {}
      setAdminUnreadCount(0);
    }
  }, [tab]);

  const handleNavigateToBooking = (bookingId, initialFilter = 'PENDING') => {
    setBookingsFilter(initialFilter);
    setTargetBookingId(bookingId);
    setTab('bookings');
  };

  if (!isAdminAuthenticated || !industry) {
    return (
      <AdminLogin
        onLoginSuccess={handleLoginSuccess}
        onSwitchPortal={onSwitchPortal}
      />
    );
  }

  return (
    <div className="mobile-portal min-h-screen bg-[#F8FAFC] flex text-slate-900">
      <ReminderAlert />
      <MobileDock active={tab} onSelect={setTab} onMenu={() => setMobileSidebarOpen(true)} items={[
        { id: 'dashboard', label: 'Home', icon: 'home' }, { id: 'industry-news', label: 'News', icon: 'news' },
        { id: 'calendar', label: 'Calendar', icon: 'calendar' }, { id: 'bookings', label: 'Bookings', icon: 'bookings' },
      ]} />
      {/* Full-Height Left Sidebar */}
      <Sidebar
        currentTab={tab}
        setTab={setTab}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onOpenClientBooking={onOpenClient || (() => onSwitchPortal && onSwitchPortal('client'))}
        unreadCount={adminUnreadCount}
        onSwitchPortal={onSwitchPortal}
        onLogout={handleAdminLogout}
      />

      {/* Main Content Area with Top Navbar */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {tab !== 'industry-news' && <Navbar
          activeTab={tab}
          setActiveTab={setTab}
          onOpenSidebar={() => setMobileSidebarOpen(true)}
          unreadCount={adminUnreadCount}
          setUnreadCount={setAdminUnreadCount}
          onSwitchPortal={onSwitchPortal}
          onLogout={handleAdminLogout}
        />}

        <main className={`flex-1 min-w-0 ${tab === "industry-news" ? "overflow-hidden" : "p-4 sm:p-6 lg:p-8"}`}>
          {tab === 'dashboard' && (
            <AdminDashboard
              target="MD"
              setTab={setTab}
              onOpenCreateSchedule={() => {
                setTab('schedules');
                setIsCreateScheduleOpen(true);
              }}
            />
          )}
          {tab === 'calendar' && (
            <AdminCalendar
              setTab={setTab}
              onOpenCreateSchedule={() => {
                setTab('schedules');
                setIsCreateScheduleOpen(true);
              }}
            />
          )}
          {tab === 'schedules' && (
            <AdminSchedules
              isCreateOpen={isCreateScheduleOpen}
              setIsCreateOpen={setIsCreateScheduleOpen}
            />
          )}
          {tab === 'reminders' && <AdminReminders />}
          {tab === 'daily-routine' && <AdminDailyRoutine />}
          {tab === 'bookings' && (
            <AdminBookings
              initialFilter={bookingsFilter}
              targetBookingId={targetBookingId}
            />
          )}
          {tab === 'history' && <AdminHistory />}
          {tab === 'sales-meetings' && <AdminSalesMeetings />}
          {tab === 'users' && <AdminUsers />}
          {tab === 'clients' && <AdminClients />}
          {tab === 'notifications' && (
            <AdminNotifications
              setTab={setTab}
              onNavigateToBooking={handleNavigateToBooking}
            />
          )}
          {tab === 'industry-news' && <AdminIndustryNews industry={industry} onOpenSidebar={() => setMobileSidebarOpen(true)} />}
          {tab === 'settings' && <AdminSettings />}
        </main>
      </div>
    </div>
  );
}
