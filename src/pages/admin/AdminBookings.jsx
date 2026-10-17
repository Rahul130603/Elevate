import { GentizeText } from '../../components/common/GentizeText.jsx';
import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '../../api/client.js';
import { Modal } from '../../components/common/Modal.jsx';
import { isTimePassed } from '../../utils/calendarUtils.js';
import { CustomTimePicker } from '../../components/common/CustomTimePicker.jsx';
import {
  Clock,
  User,
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  RotateCcw,
  Mail,
  Phone,
  Bell,
  AlertTriangle,
  Send,
  Search,
  LayoutGrid,
  List,
  Video,
  Building2,
  PhoneCall,
  Sparkles,
  Check,
  Ban,
  Tag,
  ExternalLink,
  Navigation,
  Copy
} from 'lucide-react';

const GENTIZE_OFFICE_MAPS_URL = 'https://maps.app.goo.gl/NYhvrAEYn4mps6kLA';
const MD_CABIN_MAPS_URL = GENTIZE_OFFICE_MAPS_URL;
const GENTIZE_OFFICE_EMBED_URL = 'https://maps.google.com/maps?q=13.0193005,80.1343397&z=15&output=embed';
const MD_CABIN_EMBED_URL = GENTIZE_OFFICE_EMBED_URL;

export function AdminBookings({ initialFilter = 'ALL', targetBookingId = null, target = 'MD' }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(initialFilter); // 'ALL', 'PENDING', 'CONFIRMED', 'CANCELLED'
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' (user-friendly grid) or 'table'
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [adminMeetInput, setAdminMeetInput] = useState('');

  // Reschedule state (supporting both slot-based and custom date/time)
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [scheduleSlots, setScheduleSlots] = useState([]);
  const [targetSlotId, setTargetSlotId] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleCustomForm, setRescheduleCustomForm] = useState({
    date: '',
    startTime: '10:00',
    endTime: '10:30',
  });

  // Cancel state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Fetch all bookings for host (MD or SALES_LEAD)
  const fetchBookings = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await apiRequest(`/admin/bookings?all=true&target=${target}`);
      setBookings(res.bookings || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings(true);
    const interval = setInterval(() => fetchBookings(false), 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (initialFilter) {
      setFilter(initialFilter);
    }
  }, [initialFilter]);

  useEffect(() => {
    if (targetBookingId && bookings.length > 0) {
      openBookingDetails(targetBookingId);
      setTimeout(() => {
        const el = document.getElementById(`booking-card-${targetBookingId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [targetBookingId, bookings.length]);

  const openBookingDetails = async (bookingId) => {
    try {
      setDetailsLoading(true);
      const res = await apiRequest(`/bookings/${bookingId}`);
      setSelectedBooking(res.booking);
      setAdminMeetInput(res.booking?.meeting_link || '');
    } catch (err) {
      alert(err.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Direct MD Confirm
  const handleAdminConfirm = async (bookingId) => {
    try {
      setActionLoadingId(bookingId);
      await apiRequest(`/admin/bookings/${bookingId}/confirm`, { method: 'POST' });
      await fetchBookings();
      if (selectedBooking && selectedBooking.id === bookingId) {
        openBookingDetails(bookingId);
      }
    } catch (err) {
      alert(err.message || 'Failed to confirm booking');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAdminRecreateMeet = async (bookingId) => {
    try {
      setActionLoadingId(bookingId);
      const res = await apiRequest(`/admin/bookings/${bookingId}/recreate-meet`, { method: 'POST' });
      alert('Google Meet link recreated successfully:\n' + res.meetingLink);
      await fetchBookings();
      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking(prev => ({
          ...prev,
          meeting_link: res.meetingLink,
          location: 'Google Meet (Video Call)',
        }));
        setAdminMeetInput(res.meetingLink);
      }
    } catch (err) {
      alert(err.message || 'Failed to recreate meet link');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAdminSaveMeetLink = async (bookingId) => {
    try {
      setActionLoadingId(bookingId);
      const res = await apiRequest(`/admin/bookings/${bookingId}/recreate-meet`, {
        method: 'POST',
        body: { meetLink: adminMeetInput.trim() },
      });
      alert('Google Meet room link saved and updated successfully:\n' + res.meetingLink);
      await fetchBookings();
      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking(prev => ({
          ...prev,
          meeting_link: res.meetingLink,
          location: 'Google Meet (Video Call)',
        }));
      }
    } catch (err) {
      alert(err.message || 'Failed to save Google Meet link');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAdminPasteMeetLink = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setAdminMeetInput(text.trim());
      }
    } catch (_) {
      alert('Clipboard access restricted. Please paste directly into the box.');
    }
  };

  const openCancelFlow = (bookingId) => {
    setCancelBookingId(bookingId);
    setCancelReason('Gentize Schedule Conflict');
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelBookingId) return;
    try {
      setCancelling(true);
      await apiRequest(`/admin/bookings/${cancelBookingId}/cancel`, {
        method: 'POST',
        body: { reason: cancelReason },
      });
      setCancelModalOpen(false);
      await fetchBookings();
      if (selectedBooking && selectedBooking.id === cancelBookingId) {
        openBookingDetails(cancelBookingId);
      }
    } catch (err) {
      alert(err.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const openRescheduleFlow = async (booking) => {
    setSelectedBooking(booking);
    setRescheduleCustomForm({
      date: booking.date || new Date().toISOString().split('T')[0],
      startTime: booking.start_time || '10:00',
      endTime: booking.end_time || '10:30',
    });

    try {
      if (booking.event_id) {
        const res = await apiRequest(`/admin/events/${booking.event_id}`);
        const available = (res.schedule?.slots || []).filter(s => s.status === 'AVAILABLE');
        setScheduleSlots(available);
        setTargetSlotId(available[0]?.id || '');
      } else {
        setScheduleSlots([]);
      }
    } catch (_) {
      setScheduleSlots([]);
    }
    setRescheduleModalOpen(true);
  };

  const handleConfirmReschedule = async (e) => {
    e.preventDefault();
    if (!selectedBooking) return;

    try {
      setRescheduling(true);
      if (targetSlotId && scheduleSlots.length > 0) {
        await apiRequest(`/bookings/${selectedBooking.id}/reschedule`, {
          method: 'PUT',
          body: { newSlotId: targetSlotId },
        });
      } else {
        await apiRequest(`/admin/bookings/${selectedBooking.id}/reschedule`, {
          method: 'POST',
          body: {
            newDate: rescheduleCustomForm.date,
            newStartTime: rescheduleCustomForm.startTime,
            newEndTime: rescheduleCustomForm.endTime,
          },
        });
      }

      setRescheduleModalOpen(false);
      await fetchBookings();
      openBookingDetails(selectedBooking.id);
    } catch (err) {
      alert(err.message || 'Failed to reschedule');
    } finally {
      setRescheduling(false);
    }
  };

  // Clean formatted date e.g. "Mon, 30 Nov 2026"
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('en-US', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }
      return dateStr;
    } catch (_) {
      return dateStr;
    }
  };

  // Clean Purpose (removes bracketed mode tags like "[Google Meet (Video Call)]")
  const cleanPurpose = (purpose) => {
    if (!purpose) return 'Executive Discussion';
    return purpose.replace(/^\[.*?\]\s*/, '').trim() || 'Executive Discussion';
  };

  // Filter active (non-elapsed) bookings only, always keeping PENDING bookings visible
  const activeBookings = useMemo(() => {
    return bookings.filter(b => b.status === 'PENDING' || !isTimePassed(b.date, b.end_time || b.endTime));
  }, [bookings]);

  // KPI counts based on active bookings
  const pendingCount = useMemo(() => activeBookings.filter(b => b.status === 'PENDING').length, [activeBookings]);
  const confirmedCount = useMemo(() => activeBookings.filter(b => b.status === 'CONFIRMED').length, [activeBookings]);
  const cancelledCount = useMemo(() => activeBookings.filter(b => b.status === 'CANCELLED').length, [activeBookings]);

  // Filtered & Searched active bookings
  const filteredBookings = useMemo(() => {
    return activeBookings.filter((b) => {
      // Status filter
      if (filter === 'PENDING' && b.status !== 'PENDING') return false;
      if (filter === 'CONFIRMED' && b.status !== 'CONFIRMED') return false;
      if (filter === 'CANCELLED' && b.status !== 'CANCELLED') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (b.client_name || b.user_name || '').toLowerCase();
        const email = (b.client_email || b.user_email || '').toLowerCase();
        const phone = (b.client_phone || b.user_phone || '').toLowerCase();
        const purpose = (b.meeting_purpose || b.meetingPurpose || '').toLowerCase();
        const location = (b.location || '').toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q) || purpose.includes(q) || location.includes(q);
      }

      return true;
    });
  }, [activeBookings, filter, searchQuery]);

  return (
    <div className="space-y-5">
      {/* Header & Controls Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Booking Management & Approvals</h1>
              {pendingCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-orange-500 text-white text-xs font-semibold animate-pulse">
                  {pendingCount} Pending Action
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Review, approve client pre-bookings, and manage all appointment schedules in real-time.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {/* View Mode Toggle: Cards vs Table */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  viewMode === 'cards' ? 'bg-orange-500 text-white font-bold shadow-xs' : 'hover:text-slate-900'
                }`}
                title="Card Grid View (User Friendly)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  viewMode === 'table' ? 'bg-orange-500 text-white font-bold shadow-xs' : 'hover:text-slate-900'
                }`}
                title="Spacious Table View"
              >
                <List className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
            </div>

            <button
              onClick={fetchBookings}
              className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
              title="Refresh Bookings"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search Bar & Filter Pills Row */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client, email, phone, or topic..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: 'ALL', label: 'All', count: bookings.length },
              { key: 'PENDING', label: 'Pending Approval', count: pendingCount, highlight: true },
              { key: 'CONFIRMED', label: 'Confirmed', count: confirmedCount },
              { key: 'CANCELLED', label: 'Cancelled', count: cancelledCount },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                  filter === f.key
                    ? 'bg-slate-900 text-white shadow-xs'
                    : f.highlight && f.count > 0
                    ? 'bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                }`}
              >
                <span><GentizeText>{f.label}</GentizeText></span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  filter === f.key
                    ? 'bg-slate-800 text-slate-200'
                    : f.highlight && f.count > 0
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: EXECUTIVE CARDS GRID (Highly User-Friendly & Visually Spacious)   */}
      {/* ========================================================================= */}
      {viewMode === 'cards' && (
        <div>
          {filteredBookings.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 py-16 text-center text-slate-400 space-y-2">
              <Clock className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No Bookings Found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No appointments match the current search or filter criteria.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredBookings.map((b) => {
                const isPending = b.status === 'PENDING';
                const isConfirmed = b.status === 'CONFIRMED';
                const isCancelled = b.status === 'CANCELLED';
                const isClient = (b.booking_source || b.bookingSource) === 'CLIENT';
                const attendeeName = b.client_name || b.user_name || 'Guest';
                const attendeeEmail = b.client_email || b.user_email;
                const attendeePhone = b.client_phone || b.user_phone;
                const location = b.location || 'Gentize Office';

                return (
                  <div
                    key={b.id}
                    id={`booking-card-${b.id}`}
                    className={`rounded-3xl border transition-all p-5 flex flex-col justify-between space-y-4 hover:shadow-md ${
                      targetBookingId === b.id
                        ? 'ring-2 ring-orange-500 bg-orange-50/40 shadow-lg'
                        : isPending
                        ? 'bg-gradient-to-b from-orange-50/70 to-white border-orange-200 shadow-2xs'
                        : isConfirmed
                        ? 'bg-white border-slate-200/90 hover:border-orange-200'
                        : 'bg-slate-50/70 border-slate-200/70 opacity-80'
                    }`}
                  >
                    {/* Top Row: Date & Time Chip + Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      {/* Time Window Chip */}
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                          <Clock className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                          <span>{b.timeRange}</span>
                        </div>
                        <p className="text-[11px] font-semibold text-orange-600 pl-5">
                          {formatDisplayDate(b.date)}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <div className="shrink-0">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full bg-orange-100 text-orange-600 border border-orange-200 animate-pulse">
                            <Clock className="w-3 h-3 text-orange-600 animate-spin" />
                            Pending Approval
                          </span>
                        ) : isConfirmed ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                            <CheckCircle2 className="w-3 h-3 text-orange-500" />
                            Confirmed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Cancelled
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Section: Attendee Profile */}
                    <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                          isClient ? 'bg-orange-500 text-white' : 'bg-slate-800 text-white'
                        }`}>
                          <GentizeText>{attendeeName.charAt(0) || 'U'}</GentizeText>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-extrabold text-sm text-slate-900 truncate">
                              <GentizeText>{attendeeName}</GentizeText>
                            </h3>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase border ${
                              isClient
                                ? 'bg-orange-50 text-orange-700 border-orange-200'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}>
                              {isClient ? 'Client Booking' : 'User Booking'}
                            </span>
                          </div>
                          {attendeeEmail && (
                            <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{attendeeEmail}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {attendeePhone && (
                        <div className="pt-1.5 border-t border-slate-200/60 flex items-center gap-1 text-[11px] text-slate-600 font-semibold">
                          <Phone className="w-3 h-3 text-orange-600 shrink-0" />
                          <span>{attendeePhone}</span>
                        </div>
                      )}
                    </div>

                    {/* Meeting Topic & Location */}
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                        <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate"><GentizeText>{cleanPurpose(b.meeting_purpose || b.meetingPurpose)}</GentizeText></span>
                      </div>

                      <div className="flex items-center justify-between gap-1.5 text-slate-500 font-medium">
                        <div className="flex items-center gap-1.5 truncate">
                          {(location.includes('Meet') || b.meeting_mode === 'GOOGLE_MEET') && <Video className="w-3.5 h-3.5 text-orange-600 shrink-0" />}
                          {(location.includes('Gentize') || location.includes('Cabin') || b.meeting_mode === 'MD_CABIN' || b.meeting_mode === 'GENTIZE_OFFICE') && <Building2 className="w-3.5 h-3.5 text-orange-600 shrink-0" />}
                          {(location.includes('Phone') || b.meeting_mode === 'DIRECT_PHONE') && <PhoneCall className="w-3.5 h-3.5 text-orange-600 shrink-0" />}
                          {!location.includes('Meet') && !location.includes('Gentize') && !location.includes('Cabin') && !location.includes('Phone') && (
                            <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                          )}
                          <span className="truncate"><GentizeText>{location}</GentizeText></span>
                        </div>
                        {(() => {
                          const isCabin = location.includes('Gentize') || location.includes('Cabin') || b.meeting_mode === 'MD_CABIN' || b.meeting_mode === 'GENTIZE_OFFICE';
                          const isMeet = location.includes('Meet') || b.meeting_mode === 'GOOGLE_MEET';
                          const isPhone = location.includes('Phone') || b.meeting_mode === 'DIRECT_PHONE';
                          if (isCabin) {
                            return (
                              <a
                                href={GENTIZE_OFFICE_MAPS_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-50 text-orange-600 font-bold text-[10px] border border-orange-200 hover:bg-orange-100 shrink-0"
                                title="Open in Google Maps"
                              >
                                <Navigation className="w-2.5 h-2.5" />
                                Maps
                              </a>
                            );
                          }
                          if (!isMeet && !isPhone) {
                            const cleanVenue = location.replace(/^Other\s*\(/i, '').replace(/\)$/, '').trim();
                            const mapsUrl = (b.meeting_link && b.meeting_link.startsWith('http')) ? b.meeting_link : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanVenue || 'Venue')}`;
                            return (
                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-50 text-orange-600 font-bold text-[10px] border border-orange-200 hover:bg-orange-100 shrink-0"
                                title={`Open ${cleanVenue} in Google Maps`}
                              >
                                <Navigation className="w-2.5 h-2.5" />
                                Maps
                              </a>
                            );
                          }
                          return null;
                        })()}
                        {(location.includes('Meet') || b.meeting_mode === 'GOOGLE_MEET') && (b.meeting_link || b.meetingLink) && (
                          <a
                            href={b.meeting_link || b.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-50 text-orange-600 font-bold text-[10px] border border-orange-200 hover:bg-orange-100 shrink-0"
                            title="Join Meet"
                          >
                            <Video className="w-2.5 h-2.5 text-orange-600" />
                            Meet
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                      {isPending && (
                        <button
                          onClick={() => handleAdminConfirm(b.id)}
                          disabled={actionLoadingId === b.id}
                          className="flex-1 py-2 px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Confirm</span>
                        </button>
                      )}

                      <button
                        onClick={() => openBookingDetails(b.id)}
                        className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                        <span>Details</span>
                      </button>

                      {(isConfirmed || isPending) && (
                        <>
                          <button
                            onClick={() => openRescheduleFlow(b)}
                            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
                            title="Re-Schedule"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openCancelFlow(b.id)}
                            className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition"
                            title="Cancel Booking"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: CLEAN, SPACIOUS TABLE (No Awkward Text Wrapping)                   */}
      {/* ========================================================================= */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            {filteredBookings.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <Clock className="w-12 h-12 mx-auto text-slate-300" />
                <p className="text-sm font-bold text-slate-700">No Bookings Found</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No appointments match the current search or filter criteria.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-5 whitespace-nowrap">Date & Time</th>
                    <th className="py-3.5 px-5 whitespace-nowrap">Participant / Guest</th>
                    <th className="py-3.5 px-5 whitespace-nowrap">Purpose</th>
                    <th className="py-3.5 px-5 whitespace-nowrap">Mode / Venue</th>
                    <th className="py-3.5 px-5 whitespace-nowrap">Status</th>
                    <th className="py-3.5 px-5 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                  {filteredBookings.map((b) => {
                    const isPending = b.status === 'PENDING';
                    const isConfirmed = b.status === 'CONFIRMED';
                    const isClient = (b.booking_source || b.bookingSource) === 'CLIENT';
                    const attendeeName = b.client_name || b.user_name || 'Guest';
                    const attendeeEmail = b.client_email || b.user_email;
                    const attendeePhone = b.client_phone || b.user_phone;
                    const location = b.location || 'Gentize Office';

                    return (
                      <tr key={b.id} className="hover:bg-orange-50/20 transition">
                        {/* Date & Time (Clean whitespace-nowrap) */}
                        <td className="py-4 px-5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                            <Clock className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                            <span>{b.timeRange}</span>
                          </div>
                          <div className="text-[11px] font-semibold text-orange-600 mt-0.5 pl-5">
                            {formatDisplayDate(b.date)}
                          </div>
                        </td>

                        {/* Participant */}
                        <td className="py-4 px-5 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              isClient ? 'bg-orange-500 text-white font-bold' : 'bg-slate-800 text-white'
                            }`}>
                              <GentizeText>{attendeeName.charAt(0) || 'P'}</GentizeText>
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-slate-900"><GentizeText>{attendeeName}</GentizeText></span>
                                <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded uppercase ${
                                  isClient
                                    ? 'bg-orange-100 text-orange-600 border border-orange-200'
                                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                                }`}>
                                  {isClient ? 'Client' : 'Staff'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                                {attendeeEmail && <span>{attendeeEmail}</span>}
                                {attendeePhone && <span>• {attendeePhone}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Purpose */}
                        <td className="py-4 px-5 max-w-xs truncate">
                          <span className="font-bold text-slate-800">
                            <GentizeText>{cleanPurpose(b.meeting_purpose || b.meetingPurpose)}</GentizeText>
                          </span>
                        </td>

                        {/* Mode / Venue */}
                        <td className="py-4 px-5 whitespace-nowrap">
                          <div className="flex items-center gap-2 font-medium text-slate-700">
                            {location.includes('Meet') && <Video className="w-3.5 h-3.5 text-orange-600 shrink-0" />}
                            {(location.includes('Gentize') || location.includes('Cabin')) && <Building2 className="w-3.5 h-3.5 text-orange-600 shrink-0" />}
                            {location.includes('Phone') && <PhoneCall className="w-3.5 h-3.5 text-orange-600 shrink-0" />}
                            {!location.includes('Meet') && !location.includes('Gentize') && !location.includes('Cabin') && !location.includes('Phone') && (
                              <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                            )}
                            <span className="truncate max-w-[140px]"><GentizeText>{location}</GentizeText></span>
                            {(() => {
                              const isCabin = location.includes('Gentize') || location.includes('Cabin') || b.meeting_mode === 'MD_CABIN' || b.meeting_mode === 'GENTIZE_OFFICE';
                              const isMeet = location.includes('Meet') || b.meeting_mode === 'GOOGLE_MEET';
                              const isPhone = location.includes('Phone') || b.meeting_mode === 'DIRECT_PHONE';
                              if (isCabin) {
                                return (
                                  <a
                                    href={GENTIZE_OFFICE_MAPS_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-orange-50 text-orange-600 font-bold text-[10px] border border-orange-200 hover:bg-orange-100"
                                    title="Open in Google Maps"
                                  >
                                    <Navigation className="w-2.5 h-2.5" />
                                    Maps
                                  </a>
                                );
                              }
                              if (!isMeet && !isPhone) {
                                const cleanVenue = location.replace(/^Other\s*\(/i, '').replace(/\)$/, '').trim();
                                const mapsUrl = (b.meeting_link && b.meeting_link.startsWith('http')) ? b.meeting_link : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanVenue || 'Venue')}`;
                                return (
                                  <a
                                    href={mapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-orange-50 text-orange-600 font-bold text-[10px] border border-orange-200 hover:bg-orange-100"
                                    title={`Open ${cleanVenue} in Google Maps`}
                                  >
                                    <Navigation className="w-2.5 h-2.5" />
                                    Maps
                                  </a>
                                );
                              }
                              return null;
                            })()}
                            {(location.includes('Meet') || b.meeting_mode === 'GOOGLE_MEET') && (b.meeting_link || b.meetingLink) && (
                              <a
                                href={b.meeting_link || b.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-orange-50 text-orange-600 font-bold text-[10px] border border-orange-200 hover:bg-orange-100"
                                title="Join Google Meet"
                              >
                                <Video className="w-2.5 h-2.5 text-orange-600" />
                                Meet
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isConfirmed
                              ? 'bg-orange-50 text-orange-600 border border-orange-200'
                              : isPending
                              ? 'bg-orange-50 text-orange-600 border border-orange-200 animate-pulse'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {isConfirmed && <CheckCircle2 className="w-3 h-3 text-orange-500" />}
                            {isPending && <Clock className="w-3 h-3 text-orange-600 animate-spin" />}
                            {b.status === 'CANCELLED' && <XCircle className="w-3 h-3 text-rose-600" />}
                            {isPending ? 'Pending Approval' : b.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending && (
                              <button
                                onClick={() => handleAdminConfirm(b.id)}
                                disabled={actionLoadingId === b.id}
                                className="px-2.5 py-1.5 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition flex items-center gap-1 shadow-2xs"
                                title="Confirm Booking"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Confirm</span>
                              </button>
                            )}

                            <button
                              onClick={() => openBookingDetails(b.id)}
                              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>

                            {(isConfirmed || isPending) && (
                              <>
                                <button
                                  onClick={() => openRescheduleFlow(b)}
                                  className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition"
                                  title="Reschedule Booking"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => openCancelFlow(b.id)}
                                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Cancel Booking"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* BOOKING DETAILS MODAL */}
      <Modal
        isOpen={Boolean(selectedBooking && !rescheduleModalOpen && !cancelModalOpen)}
        onClose={() => setSelectedBooking(null)}
        title="Appointment Information"
        maxWidth="max-w-lg"
      >
        {selectedBooking && (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-xl font-bold text-slate-900"><GentizeText>{selectedBooking.event_title || 'Meeting with Gentize'}</GentizeText></h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{formatDisplayDate(selectedBooking.date)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                  (selectedBooking.booking_source || selectedBooking.bookingSource) === 'CLIENT'
                    ? 'bg-orange-100 text-orange-600 border border-orange-200'
                    : 'bg-orange-50 text-orange-600 border border-orange-200'
                }`}>
                  {selectedBooking.booking_source || selectedBooking.bookingSource || 'USER'}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  selectedBooking.status === 'CONFIRMED'
                    ? 'bg-orange-50 text-orange-600 border border-orange-200'
                    : selectedBooking.status === 'PENDING'
                    ? 'bg-orange-50 text-orange-600 border border-orange-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  <GentizeText>{selectedBooking.status === 'PENDING' ? 'Pending Gentize Approval' : selectedBooking.status}</GentizeText>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Participant Details */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Participant Details
                </span>
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                    (selectedBooking.booking_source || selectedBooking.bookingSource) === 'CLIENT'
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-800 text-white'
                  }`}>
                    <GentizeText>{(selectedBooking.client_name || selectedBooking.user_name)?.charAt(0) || 'P'}</GentizeText>
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900 text-sm">
                      <GentizeText>{selectedBooking.client_name || selectedBooking.user_name}</GentizeText>
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {(selectedBooking.booking_source || selectedBooking.bookingSource) === 'CLIENT'
                        ? 'External Client'
                        : 'Staff Member'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 space-y-1.5 text-slate-600">
                  {(selectedBooking.client_email || selectedBooking.user_email) && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold">{selectedBooking.client_email || selectedBooking.user_email}</span>
                    </div>
                  )}
                  {(selectedBooking.client_phone || selectedBooking.user_phone) && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      <span className="font-bold text-slate-800">{selectedBooking.client_phone || selectedBooking.user_phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Schedule & Venue */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Schedule & Venue
                </span>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium">Meeting Time</span>
                  <p className="font-bold text-orange-600 text-base mt-0.5">{selectedBooking.timeRange}</p>
                </div>
                <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span><GentizeText>{selectedBooking.location || 'Gentize Cabin'}</GentizeText></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{formatDisplayDate(selectedBooking.date)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Location & Meeting Details Card */}
            {((selectedBooking.location?.includes('Cabin') || selectedBooking.meeting_mode?.includes('Cabin')) ||
              (selectedBooking.location?.includes('Meet') || selectedBooking.meeting_mode?.includes('Meet')) ||
              selectedBooking.meeting_mode === 'OTHER' || selectedBooking.location?.includes('Other') ||
              selectedBooking.meeting_link) && (
              <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Meeting Mode & Venue Details
                  </span>
                  {(selectedBooking.location?.includes('Cabin') || selectedBooking.meeting_mode?.includes('Cabin')) && (
                    <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 text-[10px] font-semibold flex items-center gap-1">
                      <Building2 className="w-3 h-3" /><GentizeText> Gentize Cabin (In-Person)
                    </GentizeText></span>
                  )}
                  {(selectedBooking.location?.includes('Meet') || selectedBooking.meeting_mode?.includes('Meet')) && (
                    <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-600 border border-orange-200 text-[10px] font-semibold flex items-center gap-1">
                      <Video className="w-3 h-3 text-orange-600" /> Google Meet (Virtual)
                    </span>
                  )}
                  {(selectedBooking.meeting_mode === 'OTHER' || (!selectedBooking.location?.includes('Cabin') && !selectedBooking.location?.includes('Meet') && !selectedBooking.location?.includes('Phone'))) && (
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold flex items-center gap-1">
                      Other Platform / Venue
                    </span>
                  )}
                </div>

                {/* Gentize Office details & Interactive Map */}
                {(selectedBooking.location?.includes('Gentize') || selectedBooking.location?.includes('Cabin') || selectedBooking.meeting_mode?.includes('Gentize') || selectedBooking.meeting_mode?.includes('Cabin')) && (
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-extrabold text-slate-900 text-sm"><GentizeText>Gentize Innovations — Gentize Office</GentizeText></p>
                        <p className="text-xs text-slate-500 mt-0.5">Physical office location at coordinates 13.0193, 80.1343</p>
                      </div>
                      <a
                        href={GENTIZE_OFFICE_MAPS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 shadow-xs"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Open in Google Maps ↗</span>
                      </a>
                    </div>
                    <div className="w-full h-44 rounded-xl overflow-hidden border border-slate-200 shadow-inner">
                      <iframe
                        title="Gentize Office Google Maps Location"
                        src={GENTIZE_OFFICE_EMBED_URL}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  </div>
                )}

                {/* Google Meet details & Recreate */}
                {(selectedBooking.location?.includes('Meet') || selectedBooking.meeting_mode?.includes('Meet')) && (
                  <div className="space-y-2.5">
                    <div className="p-3 bg-orange-50/70 border border-orange-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="truncate">
                        <span className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider block">Current Room Link</span>
                        <a
                          href={selectedBooking.meeting_link || 'https://meet.google.com/new'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs font-semibold text-slate-900 hover:underline truncate block mt-0.5"
                        >
                          {selectedBooking.meeting_link || 'https://meet.google.com/new'}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={selectedBooking.meeting_link || 'https://meet.google.com/new'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1 shadow-xs"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Join Meet ↗</span>
                        </a>
                      </div>
                    </div>

                    {/* Admin Room Creator & Link Saver */}
                    <div className="p-3.5 bg-white border border-orange-200/90 rounded-xl space-y-2.5 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-semibold text-slate-900 block"><GentizeText>Gentize / Admin: Create Room in Google Meet</GentizeText></span>
                          <span className="text-[11px] text-slate-500">Opens official Google Meet in a new tab to create a live room.</span>
                        </div>
                        <a
                          href="https://meet.google.com/new"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition shadow-xs self-start sm:self-auto"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Create Room on Google Meet ↗</span>
                        </a>
                      </div>

                      <div className="space-y-1 pt-1">
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Paste & Save Room Link (Updates database & notifies client)
                        </label>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <input
                            type="text"
                            value={adminMeetInput}
                            onChange={(e) => setAdminMeetInput(e.target.value)}
                            placeholder="https://meet.google.com/xxx-yyyy-zzz"
                            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20"
                          />
                          <button
                            type="button"
                            onClick={handleAdminPasteMeetLink}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1"
                            title="Paste from clipboard"
                          >
                            <Copy className="w-3 h-3 text-slate-600" />
                            <span>Paste</span>
                          </button>
                          <button
                            type="button"
                            disabled={actionLoadingId === selectedBooking.id}
                            onClick={() => handleAdminSaveMeetLink(selectedBooking.id)}
                            className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-1 shrink-0"
                          >
                            {actionLoadingId === selectedBooking.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Save & Notify Client</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Other platform / venue - interactive map & directions */}
                {(selectedBooking.meeting_mode === 'OTHER' || (!selectedBooking.location?.includes('Cabin') && !selectedBooking.location?.includes('Meet') && !selectedBooking.location?.includes('Phone'))) && (() => {
                  const cleanVenue = (selectedBooking.location || '').replace(/^Other\s*\(/i, '').replace(/\)$/, '').trim();
                  const mapsUrl = (selectedBooking.meeting_link && selectedBooking.meeting_link.startsWith('http'))
                    ? selectedBooking.meeting_link
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanVenue || 'Chennai')}`;
                  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(cleanVenue || 'Chennai')}&z=15&output=embed`;

                  return (
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider block">Custom Venue Details</span>
                          <p className="font-extrabold text-slate-900 text-sm mt-0.5"><GentizeText>{cleanVenue || selectedBooking.location || 'Custom Venue'}</GentizeText></p>
                        </div>
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 shadow-xs"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Open in Google Maps ↗</span>
                        </a>
                      </div>
                      <div className="w-full h-44 rounded-xl overflow-hidden border border-slate-200 shadow-inner">
                        <iframe
                          title="Custom Venue Google Maps Location"
                          src={embedUrl}
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          loading="lazy"
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Purpose & Notes */}
            {(selectedBooking.meeting_purpose || selectedBooking.meetingPurpose) && (
              <div className="p-4 bg-orange-50/40 rounded-2xl border border-orange-200/80 text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-orange-600 block tracking-wider">
                  Meeting Purpose / Topic
                </span>
                <p className="font-extrabold text-slate-900 text-sm">
                  <GentizeText>{cleanPurpose(selectedBooking.meeting_purpose || selectedBooking.meetingPurpose)}</GentizeText>
                </p>
              </div>
            )}

            {selectedBooking.notes && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider"><GentizeText>
                  Notes for Gentize
                </GentizeText></span>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {selectedBooking.notes}
                </p>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              {selectedBooking.status === 'PENDING' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAdminConfirm(selectedBooking.id)}
                    disabled={actionLoadingId === selectedBooking.id}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirm Booking</span>
                  </button>
                  <button
                    onClick={() => openRescheduleFlow(selectedBooking)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-orange-50 text-orange-600 hover:bg-orange-100 transition border border-orange-200"
                  >
                    Re-Schedule
                  </button>
                  <button
                    onClick={() => openCancelFlow(selectedBooking.id)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 transition border border-rose-200"
                  >
                    Cancel
                  </button>
                </div>
              ) : selectedBooking.status === 'CONFIRMED' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openRescheduleFlow(selectedBooking)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-orange-50 text-orange-600 hover:bg-orange-100 transition border border-orange-200"
                  >
                    Re-Schedule
                  </button>
                  <button
                    onClick={() => openCancelFlow(selectedBooking.id)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 transition border border-rose-200"
                  >
                    Cancel Booking
                  </button>
                </div>
              ) : <div />}

              <button
                onClick={() => setSelectedBooking(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* RESCHEDULE MODAL */}
      <Modal
        isOpen={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        title="Re-Schedule Booking"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleConfirmReschedule} className="space-y-4">
          <p className="text-xs text-slate-500">
            Set a new date and time for <strong><GentizeText>{selectedBooking?.client_name || selectedBooking?.user_name}</GentizeText></strong>.
            The client and staff will be immediately updated.
          </p>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              New Date *
            </label>
            <input
              type="date"
              value={rescheduleCustomForm.date}
              onChange={(e) => setRescheduleCustomForm({ ...rescheduleCustomForm, date: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Start Time (AM/PM) *
              </label>
              <CustomTimePicker
                value={rescheduleCustomForm.startTime}
                onChange={(val) => setRescheduleCustomForm({ ...rescheduleCustomForm, startTime: val })}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                End Time (AM/PM) *
              </label>
              <CustomTimePicker
                value={rescheduleCustomForm.endTime}
                onChange={(val) => setRescheduleCustomForm({ ...rescheduleCustomForm, endTime: val })}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setRescheduleModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={rescheduling}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition shadow-xs flex items-center gap-1.5"
            >
              {rescheduling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              <span>{rescheduling ? 'Saving...' : 'Confirm New Schedule'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* CANCEL MODAL */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Booking"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 font-medium">
            Are you sure you want to cancel this booking? The slot will be freed and cancellation notifications sent.
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Cancellation Reason (Shared with Client)
            </label>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Gentize Schedule Conflict / Emergency"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setCancelModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Back
            </button>
            <button
              type="button"
              disabled={cancelling}
              onClick={handleConfirmCancel}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-1.5"
            >
              {cancelling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
              <span>Cancel Booking</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
