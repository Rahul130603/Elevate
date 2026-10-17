import { useState, useEffect, useCallback } from 'react';
import { eventService } from '../services/eventService.js';
import { getTodayKey, formatDateKey } from '../utils/calendarUtils.js';

export function useEvents() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-11
  const [selectedDate, setSelectedDate] = useState(null);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('upcoming');

  // Overlap prevention setting: allow overlapping events?
  const [allowOverlaps, setAllowOverlaps] = useState(true);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [activeEvent, setActiveEvent] = useState(null);
  const [createDateDefault, setCreateDateDefault] = useState(getTodayKey());

  // Toast notification state
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  }, []);

  // Fetch events from server
  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await eventService.fetchEvents();
      setEvents(data);
    } catch (err) {
      console.error('Failed to load events:', err);
      setError('Unable to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Month navigation
  const prevMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      if (prev === 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      if (prev === 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const goToToday = useCallback(() => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDate(getTodayKey());
  }, []);

  // Modal actions
  const openCreateModal = useCallback((prefillDate) => {
    const dateToUse = prefillDate || selectedDate || getTodayKey();
    setCreateDateDefault(dateToUse);
    setCreateModalOpen(true);
  }, [selectedDate]);

  const openEditModal = useCallback((event) => {
    setActiveEvent(event);
    setDetailsModalOpen(false);
    setEditModalOpen(true);
  }, []);

  const openDetailsModal = useCallback((event) => {
    setActiveEvent(event);
    setDetailsModalOpen(true);
  }, []);

  const openDeleteDialog = useCallback((event) => {
    setActiveEvent(event);
    setDeleteDialogOpen(true);
  }, []);

  const closeAllModals = useCallback(() => {
    setCreateModalOpen(false);
    setEditModalOpen(false);
    setDetailsModalOpen(false);
    setDeleteDialogOpen(false);
  }, []);

  // CRUD handlers with immediate local state synchronization
  const handleCreateEvent = async (eventData) => {
    const newEvent = await eventService.createEvent(eventData);
    setEvents((prev) => [...prev, newEvent]);
    showToast('Event created successfully', 'success');
    closeAllModals();
    return newEvent;
  };

  const handleUpdateEvent = async (id, eventData) => {
    const updated = await eventService.updateEvent(id, eventData);
    setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
    if (activeEvent?.id === id) {
      setActiveEvent(updated);
    }
    showToast('Event updated successfully', 'success');
    closeAllModals();
    return updated;
  };

  const handleDeleteEvent = async (id) => {
    await eventService.deleteEvent(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
    if (activeEvent?.id === id) {
      setActiveEvent(null);
    }
    showToast('Event deleted successfully', 'success');
    closeAllModals();
  };

  return {
    currentYear,
    currentMonth,
    selectedDate,
    setSelectedDate,
    events,
    loading,
    error,
    toast,
    showToast,
    searchQuery,
    setSearchQuery,
    dateFilter,
    setDateFilter,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    activeTab,
    setActiveTab,
    allowOverlaps,
    setAllowOverlaps,
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
  };
}
