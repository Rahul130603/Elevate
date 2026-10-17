import { GentizeText } from '../../components/common/GentizeText.jsx';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import CalendarHeader from '../../components/calendar/CalendarHeader.jsx';
import CalendarGrid from '../../components/calendar/CalendarGrid.jsx';
import UpcomingEventsSidebar from '../../components/calendar/UpcomingEventsSidebar.jsx';
import MyEventsView from '../../components/events/MyEventsView.jsx';
import EventDetailsModal from '../../components/calendar/EventDetailsModal.jsx';
import DayEventsModal from '../../components/calendar/DayEventsModal.jsx';
import { useEvents } from '../../hooks/useEvents.js';
import { getEventsForDate } from '../../utils/calendarUtils.js';
import { CheckCircle2, AlertCircle, RefreshCw, CalendarDays } from 'lucide-react';

export function AdminCalendar() {
  const {
    currentYear,
    currentMonth,
    selectedDate,
    setSelectedDate,
    events,
    loading,
    toast,
    // Modals
    detailsModalOpen,
    activeEvent,
    openDetailsModal,
    closeAllModals,
    // Navigation
    prevMonth,
    nextMonth,
    goToToday,
    loadEvents,
  } = useEvents();

  const [dayEventsModalOpen, setDayEventsModalOpen] = useState(false);
  const [dayEventsDate, setDayEventsDate] = useState(null);
  const [showEventsDetailsBelow, setShowEventsDetailsBelow] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const eventsDetailsRef = useRef(null);

  // Auto-sync polling every 5s so updates in User Portal reflect immediately
  useEffect(() => {
    const interval = setInterval(() => {
      loadEvents();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadEvents]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleToggleViewAllEvents = () => {
    const nextState = !showEventsDetailsBelow;
    setShowEventsDetailsBelow(nextState);

    if (nextState) {
      setTimeout(() => {
        if (eventsDetailsRef.current) {
          eventsDetailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    }
  };

  const handleSelectDate = (dateStr) => {
    setSelectedDate(dateStr);
  };

  const handleDayClick = (dateStr, dayEvents) => {
    setSelectedDate(dateStr);
    const dayEvs = dayEvents && dayEvents.length > 0 ? dayEvents : getEventsForDate(events, dateStr);
    if (!dayEvs || dayEvs.length === 0) {
      return;
    } else if (dayEvs.length === 1) {
      openDetailsModal(dayEvs[0]);
    } else {
      setDayEventsDate(dateStr);
      setDayEventsModalOpen(true);
    }
  };

  const currentDayEvents = useMemo(() => {
    return getEventsForDate(events, dayEventsDate);
  }, [events, dayEventsDate]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
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

      {/* Calendar Header with Navigation & Sync */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-none">
                Executive Events Calendar
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 leading-tight">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Synced with User Events
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Real-time view of all events and schedules created across user portals.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing || loading}
            className="h-9 px-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200/80 rounded-xl hover:bg-slate-50 transition-all shadow-2xs cursor-pointer active:scale-95"
            title="Sync events now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing || loading ? 'animate-spin text-orange-500' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Standard Month Navigator + Controls (Without Add Event Button) */}
      <CalendarHeader
        year={currentYear}
        month={currentMonth}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
        onToday={goToToday}
        serverOnline={true}
      />

      {/* Calendar Grid + Upcoming Events Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Calendar Matrix Card (Left) */}
        <div className="lg:col-span-8">
          <CalendarGrid
            year={currentYear}
            month={currentMonth}
            events={events}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
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
          />
        </div>
      </div>

      {/* Expandable Events Details Section (All Events view) Directly Below Calendar Grid */}
      {showEventsDetailsBelow && (
        <div
          ref={eventsDetailsRef}
          className="mt-8 pt-6 border-t border-slate-200/80 animate-fadeIn"
        >
          <MyEventsView
            events={events}
            onViewEvent={openDetailsModal}
            hideHeader={true}
            onClose={() => setShowEventsDetailsBelow(false)}
          />
        </div>
      )}

      {/* EVENT DETAILS MODAL */}
      <EventDetailsModal
        isOpen={detailsModalOpen}
        event={activeEvent}
        onClose={closeAllModals}
      />

      {/* DAY EVENTS MODAL */}
      <DayEventsModal
        isOpen={dayEventsModalOpen}
        date={dayEventsDate}
        events={currentDayEvents}
        onClose={() => setDayEventsModalOpen(false)}
        onViewEvent={(ev) => {
          setDayEventsModalOpen(false);
          openDetailsModal(ev);
        }}
      />
    </div>
  );
}
