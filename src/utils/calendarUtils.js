/**
 * Utility functions for calendar grid calculation, date formatting,
 * multi-day event range handling, and timezone-safe date operations.
 */

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const EVENT_TYPES = ['Online', 'Offline'];

export const EVENT_COLORS = {
  Online: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-300',
    dot: 'bg-orange-500',
    badge: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  Offline: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-300',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  Other: {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-300',
    dot: 'bg-orange-500',
    badge: 'bg-slate-100 text-slate-800 border-slate-300',
  },
};

/**
 * Returns a timezone-safe YYYY-MM-DD string from a Date object or components
 */
export function formatDateKey(year, month, day) {
  const y = String(year);
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns today's date in YYYY-MM-DD format using local time
 */
export function getTodayKey() {
  const now = new Date();
  return formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Generate 42 calendar grid cells (6 rows x 7 days) starting Sunday
 */
export function generateCalendarMatrix(year, month) {
  const firstDay = new Date(year, month, 1);
  const startingDayIndex = firstDay.getDay();

  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];

  // Trailing days from previous month
  const prevMonthIndex = month === 0 ? 11 : month - 1;
  const prevMonthYear = month === 0 ? year - 1 : year;
  for (let i = startingDayIndex - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    cells.push({
      day: dayNum,
      dateString: formatDateKey(prevMonthYear, prevMonthIndex, dayNum),
      isCurrentMonth: false,
      isPrevMonth: true,
      year: prevMonthYear,
      month: prevMonthIndex,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    cells.push({
      day: d,
      dateString: formatDateKey(year, month, d),
      isCurrentMonth: true,
      isPrevMonth: false,
      year,
      month,
    });
  }

  // Next month leading days to complete 42 cells (6 full rows)
  const remaining = 42 - cells.length;
  const nextMonthIndex = month === 11 ? 0 : month + 1;
  const nextMonthYear = month === 11 ? year + 1 : year;
  for (let d = 1; d <= remaining; d++) {
    cells.push({
      day: d,
      dateString: formatDateKey(nextMonthYear, nextMonthIndex, d),
      isCurrentMonth: false,
      isNextMonth: true,
      year: nextMonthYear,
      month: nextMonthIndex,
    });
  }

  return cells;
}

/**
 * Checks if an event is active on a given date (inclusive range for multi-day events)
 */
export function isEventOnDate(event, dateString) {
  if (!event || !dateString) return false;
  const start = event.startDate || event.date;
  const end = event.endDate || event.startDate || event.date;
  if (!start) return false;
  return dateString >= start && dateString <= end;
}

/**
 * Returns all events matching a specific date YYYY-MM-DD
 * Supports single-day and multi-day spans
 */
export function getEventsForDate(events, dateString) {
  if (!events || !dateString) return [];
  return events.filter((e) => isEventOnDate(e, dateString));
}

/**
 * Format 24-hour time "14:30" to 12-hour "2:30 PM"
 */
export function formatTimeDisplay(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Format date string "2026-09-17" to "17 Sep 2026" or "17 September 2026"
 */
export function formatDateDisplay(dateStr, full = false) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!y || !m || !d) return dateStr;
  const monthName = full ? MONTH_NAMES[m - 1] : MONTH_NAMES[m - 1].slice(0, 3);
  return `${d < 10 ? '0' + d : d} ${monthName} ${y}`;
}

/**
 * Format date range:
 * - Same-day: "09 Oct 2026"
 * - Multi-day: "09 Oct 2026 - 11 Oct 2026"
 */
export function formatDateRangeDisplay(startDate, endDate, full = false) {
  if (!startDate) return '';
  if (!endDate || startDate === endDate) {
    return formatDateDisplay(startDate, full);
  }
  return `${formatDateDisplay(startDate, full)} - ${formatDateDisplay(endDate, full)}`;
}

/**
 * Check if a date string is today
 */
export function isToday(dateStr) {
  return dateStr === getTodayKey();
}

/**
 * Check whether an event has passed
 */
export function isEventPast(event) {
  if (!event) return false;
  const today = getTodayKey();
  const endDate = event.endDate || event.startDate || event.date;
  if (!endDate) return false;

  if (endDate < today) return true;
  if (endDate > today) return false;

  // If ends today, compare end time
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const eventTime = event.endTime || event.startTime || '23:59';
  const [h, m] = eventTime.split(':').map(Number);
  const eventMinutes = (h || 0) * 60 + (m || 0);
  return eventMinutes < currentMinutes;
}

/**
 * Sort events chronologically: startDate ascending, startTime ascending
 */
export function sortEvents(events) {
  return [...events].sort((a, b) => {
    const aStart = a.startDate || a.date || '';
    const bStart = b.startDate || b.date || '';
    if (aStart !== bStart) {
      return aStart.localeCompare(bStart);
    }
    return (a.startTime || '').localeCompare(b.startTime || '');
  });
}

/**
 * Filter events based on active tab, search query, date filter, type filter, and status filter
 */
export function filterEvents(
  events,
  {
    activeTab = 'upcoming',
    search = '',
    dateFilter = 'all',
    typeFilter = 'all',
    statusFilter = 'all',
    selectedDate = null,
  }
) {
  const todayKey = getTodayKey();
  const sorted = sortEvents(events);

  return sorted.filter((event) => {
    const start = event.startDate || event.date;
    const end = event.endDate || start;

    // Tab filter
    if (activeTab === 'upcoming') {
      if (isEventPast(event)) return false;
    } else if (activeTab === 'today') {
      if (!isEventOnDate(event, todayKey)) return false;
    } else if (activeTab === 'past') {
      if (!isEventPast(event)) return false;
    }

    // Selected Date filter (from calendar cell click)
    if (selectedDate && !isEventOnDate(event, selectedDate)) {
      return false;
    }

    // Date Filter dropdown
    if (dateFilter === 'today' && !isEventOnDate(event, todayKey)) return false;

    if (dateFilter === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowKey = formatDateKey(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
      if (!isEventOnDate(event, tomorrowKey)) return false;
    }

    if (dateFilter === 'this_week') {
      const now = new Date();
      const currentDay = (now.getDay() + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - currentDay);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const monKey = formatDateKey(monday.getFullYear(), monday.getMonth(), monday.getDate());
      const sunKey = formatDateKey(sunday.getFullYear(), sunday.getMonth(), sunday.getDate());
      // Check overlap between [start, end] and [monKey, sunKey]
      if (start > sunKey || end < monKey) return false;
    }

    if (dateFilter === 'this_month') {
      const now = new Date();
      const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const monthStart = `${currentMonthPrefix}-01`;
      const monthEnd = `${currentMonthPrefix}-${String(lastDay).padStart(2, '0')}`;
      if (start > monthEnd || end < monthStart) return false;
    }

    // Type filter: Online or Offline
    if (typeFilter !== 'all' && event.eventType !== typeFilter) {
      return false;
    }

    // Status filter
    if (statusFilter !== 'all' && event.status !== statusFilter) {
      return false;
    }

    // Text search filter (notes removed)
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      const match =
        (event.title && event.title.toLowerCase().includes(q)) ||
        (event.organizerName && event.organizerName.toLowerCase().includes(q)) ||
        (event.description && event.description.toLowerCase().includes(q)) ||
        (event.email && event.email.toLowerCase().includes(q)) ||
        (event.phone && event.phone.toLowerCase().includes(q)) ||
        (event.address && event.address.toLowerCase().includes(q)) ||
        (event.meetingLink && event.meetingLink.toLowerCase().includes(q)) ||
        (event.googleMapsLink && event.googleMapsLink.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });
}

/**
 * Checks if a given date and end time have passed the current system time.
 * If the date is before today, returns true.
 * If the date is after today, returns false.
 * If the date is today, returns true if end time has already elapsed.
 */
export function isTimePassed(dateStr, endTimeStr) {
  if (!dateStr) return false;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const currentYMD = `${year}-${month}-${day}`;

  if (dateStr < currentYMD) return true;
  if (dateStr > currentYMD) return false;

  if (!endTimeStr) return false;

  let hours = 0;
  let minutes = 0;
  const clean = String(endTimeStr).trim();

  if (/pm|am/i.test(clean)) {
    const isPM = /pm/i.test(clean);
    const parts = clean.replace(/am|pm/i, '').trim().split(':');
    hours = parseInt(parts[0], 10) || 0;
    minutes = parseInt(parts[1] || '0', 10) || 0;
    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
  } else {
    const parts = clean.split(':');
    hours = parseInt(parts[0], 10) || 0;
    minutes = parseInt(parts[1] || '0', 10) || 0;
  }

  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();

  if (hours < currentHours) return true;
  if (hours === currentHours && minutes <= currentMinutes) return true;
  return false;
}

