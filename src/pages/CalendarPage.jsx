import { GentizeText } from '../components/common/GentizeText.jsx';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Sidebar from '../components/layout/Sidebar.jsx';
import { MobileDock } from '../components/common/MobileDock.jsx';
import CalendarHeader from '../components/calendar/CalendarHeader.jsx';
import CalendarGrid from '../components/calendar/CalendarGrid.jsx';
import UpcomingEventsSidebar from '../components/calendar/UpcomingEventsSidebar.jsx';
import MyEventsView from '../components/events/MyEventsView.jsx';
import NotificationCenter from '../components/notifications/NotificationCenter.jsx';
import SettingsView from '../components/settings/SettingsView.jsx';
import CreateEventModal from '../components/calendar/CreateEventModal.jsx';
import EditEventModal from '../components/calendar/EditEventModal.jsx';
import EventDetailsModal from '../components/calendar/EventDetailsModal.jsx';
import DayEventsModal from '../components/calendar/DayEventsModal.jsx';
import DeleteEventDialog from '../components/calendar/DeleteEventDialog.jsx';
import NotificationSettingsModal from '../components/notifications/NotificationSettingsModal.jsx';
import OfflineBanner from '../components/common/OfflineBanner.jsx';
import { useEvents } from '../hooks/useEvents.js';
import { useNotifications } from '../hooks/useNotifications.js';
import { nativeNotificationService } from '../services/nativeNotificationService.js';
import { CheckCircle2, AlertCircle, Menu, ShieldCheck, Sparkles, Calendar as CalendarIcon, Clock, MapPin, User, X, CalendarCheck } from 'lucide-react';
import { App } from '@capacitor/app';
import { UserDashboard } from './user/UserDashboard.jsx';
import { UserSchedules } from './user/UserSchedules.jsx';
import { UserBookings } from './user/UserBookings.jsx';
import { UserProfile } from './user/UserProfile.jsx';
import { UserSettings } from './user/UserSettings.jsx';
import { UserNavbar } from '../components/layout/UserNavbar.jsx';
import { UserLogin } from './user/UserLogin.jsx';
import { API_BASE } from '../config/api.js';
import { getEventsForDate } from '../utils/calendarUtils.js';

export default function CalendarPage({ onSwitchPortal }) {
  const [serverOnline, setServerOnline] = useState(true);

  // Periodic server health check
  useEffect(() => {
    let mounted = true;
    const checkServer = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(`${API_BASE}/api/health`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (mounted) setServerOnline(res.ok);
      } catch {
        if (mounted) setServerOnline(false);
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 8000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);
  const {
    currentYear,
    currentMonth,
    selectedDate,
    setSelectedDate,
    events,
    loading,
    error,
    toast,
    showToast,
    allowOverlaps,
    // Modals
    createModalOpen,
    editModalOpen,
    detailsModalOpen,
    deleteDialogOpen,
    activeEvent,
    createDateDefault,
    openCreateModal,
    openEditModal,
    openDetailsModal,
    openDeleteDialog,
    closeAllModals,
    // Navigation
    prevMonth,
    nextMonth,
    goToToday,
    // CRUD
    handleCreateEvent,
    handleUpdateEvent,
    handleDeleteEvent,
    loadEvents,
  } = useEvents();

  const {
    notifications,
    unreadCount,
    activeCategory,
    setActiveCategory,
    settings,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleDeleteNotification,
    handleUpdateSettings,
    loadNotifications,
    loading: notificationsLoading,
    triggerTestNotification,
    triggerTestReminder,
  } = useNotifications();

  const [isDeleting, setIsDeleting] = useState(false);
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(() => {
    try {
      return localStorage.getItem('gentize_user_logged_out') !== 'true';
    } catch {
      return true;
    }
  });
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'my-events' | 'schedules' | 'my-bookings' | 'notifications' | 'settings'
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [dayEventsModalOpen, setDayEventsModalOpen] = useState(false);
  const [dayEventsDate, setDayEventsDate] = useState(null);
  const [showEventsDetailsBelow, setShowEventsDetailsBelow] = useState(false);
  const eventsDetailsRef = useRef(null);
  const [userMdConfirmedModal, setUserMdConfirmedModal] = useState(null);
  const notifiedUserBookingIdsRef = useRef(new Set());
  const isInitialUserFetchRef = useRef(true);

  // Real-time listener for MD Confirmations in User Portal (Only genuine MD approval)
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;
    const confirmedNotifs = notifications.filter(
      (n) => (n.title === 'Appointment Confirmed by MD!' || n.title === 'Booking Confirmed') && n.booking_status === 'CONFIRMED'
    );

    if (isInitialUserFetchRef.current) {
      confirmedNotifs.forEach((n) => {
        if (n.booking_id) notifiedUserBookingIdsRef.current.add(n.booking_id);
      });
      isInitialUserFetchRef.current = false;
      return;
    }

    const newlyConfirmed = confirmedNotifs.find(
      (n) => n.booking_id && !notifiedUserBookingIdsRef.current.has(n.booking_id)
    );

    if (newlyConfirmed) {
      notifiedUserBookingIdsRef.current.add(newlyConfirmed.booking_id);
      setUserMdConfirmedModal({
        id: newlyConfirmed.booking_id,
        date: newlyConfirmed.booking_date || newlyConfirmed.date,
        display_time: newlyConfirmed.display_time || newlyConfirmed.displayTime,
        location: newlyConfirmed.location || 'Gentize Office (In-Person)',
        client_name: newlyConfirmed.client_name,
      });
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([200, 100, 200, 100, 300]); } catch (_) {}
      }
    }
  }, [notifications]);

  const handleToggleViewAllEvents = () => {
    setShowEventsDetailsBelow((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => {
          eventsDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
      }
      return next;
    });
  };

  // Live events for the selected day in DayEventsModal
  const currentDayEvents = useMemo(() => {
    if (!dayEventsDate) return [];
    return getEventsForDate(events, dayEventsDate);
  }, [events, dayEventsDate]);

  // Android hardware back button handler
  useEffect(() => {
    let backListener = null;

    const setupBackListener = async () => {
      try {
        backListener = await App.addListener('backButton', ({ canGoBack }) => {
          if (settingsModalOpen) {
            setSettingsModalOpen(false);
          } else if (dayEventsModalOpen) {
            setDayEventsModalOpen(false);
          } else if (createModalOpen || editModalOpen || detailsModalOpen || deleteDialogOpen) {
            closeAllModals();
          } else if (mobileSidebarOpen) {
            setMobileSidebarOpen(false);
          } else if (currentView !== 'calendar') {
            setCurrentView('calendar');
          } else if (selectedDate) {
            setSelectedDate(null);
          } else if (canGoBack) {
            window.history.back();
          } else {
            App.exitApp();
          }
        });
      } catch {
        // Not running on Capacitor native environment
      }
    };

    setupBackListener();

    return () => {
      if (backListener && typeof backListener.remove === 'function') {
        backListener.remove();
      }
    };
  }, [
    settingsModalOpen,
    dayEventsModalOpen,
    createModalOpen,
    editModalOpen,
    detailsModalOpen,
    deleteDialogOpen,
    mobileSidebarOpen,
    currentView,
    selectedDate,
    closeAllModals,
    setSelectedDate,
  ]);

  const handleSelectDate = (dateStr) => {
    setSelectedDate(dateStr);
  };

  const handleOpenCreateForDate = (dateStr) => {
    setSelectedDate(dateStr);
    openCreateModal(dateStr);
  };

  const handleDayClick = (dateStr, dayEvents) => {
    setSelectedDate(dateStr);
    const dayEvs = dayEvents && dayEvents.length > 0 ? dayEvents : getEventsForDate(events, dateStr);
    if (!dayEvs || dayEvs.length === 0) {
      openCreateModal(dateStr);
    } else if (dayEvs.length === 1) {
      openDetailsModal(dayEvs[0]);
    } else {
      setDayEventsDate(dateStr);
      setDayEventsModalOpen(true);
    }
  };

  const confirmDelete = async (id) => {
    try {
      setIsDeleting(true);
      await handleDeleteEvent(id);
      await nativeNotificationService.cancelEventReminders(id);
      loadNotifications();
    } catch {
      // Handled in useEvents
    } finally {
      setIsDeleting(false);
    }
  };

  const handleNotificationEventClick = (eventId) => {
    const target = events.find((e) => e.id === eventId);
    if (target) {
      openDetailsModal(target);
    }
  };

  if (!isUserAuthenticated) {
    return (
      <UserLogin
        onLoginSuccess={(user) => {
          try {
            localStorage.removeItem('gentize_user_logged_out');
            localStorage.setItem('gentize_user_auth', JSON.stringify(user));
          } catch (_) {}
          setIsUserAuthenticated(true);
        }}
        onSwitchPortal={onSwitchPortal}
      />
    );
  }

  return (
    <div className="mobile-portal min-h-screen bg-[#f8fafc] text-slate-900 flex antialiased">
      <MobileDock active={currentView} onSelect={setCurrentView} onMenu={() => setMobileSidebarOpen(true)} items={[
        { id: 'dashboard', label: 'Home', icon: 'home' }, { id: 'my-events', label: 'Calendar', icon: 'calendar' },
        { id: 'my-bookings', label: 'Bookings', icon: 'bookings' }, { id: 'notifications', label: 'Alerts', icon: 'notifications' },
      ]} />
      {/* Left Navigation Sidebar */}
      <Sidebar
        currentView={currentView}
        onViewChange={(view) => {
          setCurrentView(view);
          setMobileSidebarOpen(false);
        }}
        unreadCount={unreadCount}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onSwitchPortal={onSwitchPortal}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 min-h-screen">
        {/* Top Navbar with Search, Notifications, Admin Portal Switcher & Profile */}
        <UserNavbar
          activeView={currentView}
          onViewChange={setCurrentView}
          onOpenSidebar={() => setMobileSidebarOpen(true)}
          onSwitchPortal={onSwitchPortal}
          onLogout={() => {
            try {
              localStorage.setItem('gentize_user_logged_out', 'true');
              localStorage.removeItem('gentize_user_auth');
            } catch (_) {}
            setIsUserAuthenticated(false);
          }}
          unreadCount={unreadCount}
        />

        {/* Toast Notification */}
        {toast && (
          <div className="fixed top-5 right-5 z-60 animate-slideDown">
            <div
              className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg border text-sm font-semibold transition-all ${
                toast.type === 'success'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20'
                  : toast.type === 'error'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-rose-500/20'
                  : 'bg-slate-800 text-white border-slate-700 shadow-slate-900/20'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-100 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-100 shrink-0" />
              )}
              <span><GentizeText>{toast.message}</GentizeText></span>
            </div>
          </div>
        )}

        {/* Main View Container */}
        <main className="px-4 pt-3.5 pb-6 sm:px-6 sm:pt-4 sm:pb-6 lg:px-8 lg:pt-4 lg:pb-8 flex-1 max-w-7xl w-full mx-auto">
          {/* 1. Assistant Dashboard View */}
          {currentView === 'dashboard' && (
            <UserDashboard
              setTab={setCurrentView}
            />
          )}

          {/* 2. My Events / Calendar View */}
          {(currentView === 'my-events' || currentView === 'calendar') && (
            <div>
              <CalendarHeader
                year={currentYear}
                month={currentMonth}
                onPrevMonth={prevMonth}
                onNextMonth={nextMonth}
                onToday={goToToday}
                onAddEvent={() => openCreateModal(selectedDate)}
                serverOnline={serverOnline}
              />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Calendar Matrix Card (Left) */}
                <div className="lg:col-span-8">
                  <CalendarGrid
                    year={currentYear}
                    month={currentMonth}
                    events={events}
                    selectedDate={selectedDate}
                    onSelectDate={handleSelectDate}
                    onOpenCreateForDate={handleOpenCreateForDate}
                    onDayClick={handleDayClick}
                  />
                </div>

                {/* Upcoming Events Card (Right) */}
                <div className="lg:col-span-4">
                  <UpcomingEventsSidebar
                    events={events}
                    onViewEvent={openDetailsModal}
                    onViewAll={handleToggleViewAllEvents}
                    isExpanded={showEventsDetailsBelow}
                    onAddEvent={() => openCreateModal(selectedDate)}
                  />
                </div>
              </div>

              {/* Expandable Events Details Section Directly Below Calendar Grid */}
              {showEventsDetailsBelow && (
                <div
                  ref={eventsDetailsRef}
                  className="mt-8 pt-6 border-t border-slate-200/80 animate-fadeIn"
                >
                  <MyEventsView
                    events={events}
                    onAddEvent={() => openCreateModal(selectedDate)}
                    onViewEvent={openDetailsModal}
                    onEditEvent={openEditModal}
                    onDeleteEvent={openDeleteDialog}
                    hideHeader={true}
                    onClose={() => setShowEventsDetailsBelow(false)}
                  />
                </div>
              )}
            </div>
          )}

          {/* 3. Available Schedules View */}
          {currentView === 'schedules' && (
            <UserSchedules />
          )}

          {/* 4. My Bookings View */}
          {currentView === 'my-bookings' && (
            <UserBookings onBookNew={() => setCurrentView('schedules')} />
          )}

          {/* 5. Separate Notifications View */}
          {currentView === 'notifications' && (
            <NotificationCenter
              notifications={notifications}
              unreadCount={unreadCount}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              onMarkAsRead={handleMarkAsRead}
              onMarkAllAsRead={handleMarkAllAsRead}
              onDelete={handleDeleteNotification}
              onClearAll={() => loadNotifications()}
              onOpenSettings={() => setCurrentView('settings')}
              onNavigateToBookings={() => setCurrentView('my-bookings')}
              loading={notificationsLoading}
            />
          )}

          {/* 6. Unified Settings View (Profile, Security, Notification Preferences, Appearance) */}
          {(currentView === 'settings' || currentView === 'profile') && (
            <UserSettings
              settings={settings}
              onSaveSettings={handleUpdateSettings}
              showToast={showToast}
              onTestNotification={triggerTestNotification}
              initialTab={currentView === 'profile' ? 'profile' : undefined}
            />
          )}
        </main>
      </div>

      {/* Modals and Dialogs */}
      <CreateEventModal
        isOpen={createModalOpen}
        onClose={closeAllModals}
        onSubmit={async (data) => {
          const created = await handleCreateEvent(data);
          if (created) {
            await nativeNotificationService.scheduleEventReminders(created, settings);
          }
          loadNotifications();
        }}
        defaultDate={createDateDefault}
        allowOverlaps={allowOverlaps}
      />

      <EditEventModal
        isOpen={editModalOpen}
        event={activeEvent}
        onClose={closeAllModals}
        onSubmit={async (id, data) => {
          const updated = await handleUpdateEvent(id, data);
          await nativeNotificationService.cancelEventReminders(id);
          if (updated) {
            await nativeNotificationService.scheduleEventReminders(updated, settings);
          }
          loadNotifications();
        }}
        allowOverlaps={allowOverlaps}
      />

      <EventDetailsModal
        isOpen={detailsModalOpen}
        event={activeEvent}
        onClose={closeAllModals}
        onEdit={openEditModal}
        onDelete={openDeleteDialog}
        onAddEvent={(dateStr) => {
          closeAllModals();
          openCreateModal(dateStr);
        }}
      />

      <DayEventsModal
        isOpen={dayEventsModalOpen}
        date={dayEventsDate}
        events={currentDayEvents}
        onClose={() => setDayEventsModalOpen(false)}
        onViewEvent={(ev) => {
          setDayEventsModalOpen(false);
          openDetailsModal(ev);
        }}
        onAddEvent={(dateStr) => {
          setDayEventsModalOpen(false);
          openCreateModal(dateStr);
        }}
        onEditEvent={(ev) => {
          setDayEventsModalOpen(false);
          openEditModal(ev);
        }}
        onDeleteEvent={(ev) => {
          setDayEventsModalOpen(false);
          openDeleteDialog(ev);
        }}
      />

      <DeleteEventDialog
        isOpen={deleteDialogOpen}
        event={activeEvent}
        onClose={closeAllModals}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
      />

      <NotificationSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={settings}
        onSave={handleUpdateSettings}
        showToast={showToast}
      />

      {/* Real-time MD Appointment Confirmation Modal in User Portal */}
      {userMdConfirmedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-emerald-200 overflow-hidden animate-in zoom-in-95 duration-200 text-center">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white text-center relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
              <button
                type="button"
                onClick={() => setUserMdConfirmedModal(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-3 shadow-inner ring-4 ring-white/30 animate-bounce">
                <ShieldCheck className="w-9 h-9 text-white" />
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-bold tracking-wider uppercase mb-1">
                <Sparkles className="w-3 h-3 text-amber-300" /><GentizeText>
                Live Gentize Approval
              </GentizeText></span>
              <h3 className="text-xl font-black tracking-tight">Appointment Confirmed!</h3>
              <p className="text-emerald-100 text-xs mt-1"><GentizeText>
                The Gentize has confirmed this appointment.
              </GentizeText></p>
            </div>

            <div className="p-6 space-y-4 text-left">
              <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-100 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <CalendarIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{userMdConfirmedModal.date || 'Scheduled Date'}</span>
                  <span className="text-emerald-300">•</span>
                  <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{userMdConfirmedModal.display_time || 'Scheduled Time'}</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-emerald-800 font-medium">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Location: <GentizeText>{userMdConfirmedModal.location || 'Gentize Office (In-Person)'}</GentizeText></span>
                </div>
                {userMdConfirmedModal.client_name && (
                  <div className="flex items-center gap-2 text-xs text-emerald-700">
                    <User className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Client: <strong className="font-semibold text-emerald-900"><GentizeText>{userMdConfirmedModal.client_name}</GentizeText></strong></span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUserMdConfirmedModal(null);
                    setCurrentView('my-bookings');
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-sm shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>View in Bookings</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUserMdConfirmedModal(null)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

