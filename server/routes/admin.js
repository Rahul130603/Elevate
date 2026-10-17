import { validateAvatar } from '../services/profilePhoto.js';
import { Router } from 'express';
import { industries, createNewsSession, clearNewsSession, getNewsSession } from '../services/adminNewsSession.js';
import db, { to12Hour, generateSlotsForSchedule } from '../db.js';
import { notificationService } from '../services/notificationService.js';

const router = Router();

// Helper to generate Google Meet style code
function generateMeetCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const part = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part(3)}-${part(4)}-${part(3)}`;
}

/**
 * Checks if a date and end time have passed the current system time.
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


// -------------------------------------------------------------
// GET /api/admin/dashboard?date=YYYY-MM-DD
// -------------------------------------------------------------
router.get('/dashboard', (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const selectedDate = req.query.date || todayStr;
    const target = req.query.target ? req.query.target.toUpperCase() : 'MD';
    const isSalesLead = target === 'SALES_LEAD';

    const schedTargetCond = isSalesLead
      ? "sch.booking_target = 'SALES_LEAD'"
      : "(sch.booking_target = 'MD' OR sch.booking_target IS NULL)";

    const bookTargetCond = isSalesLead
      ? "b.booking_target = 'SALES_LEAD'"
      : "(b.booking_target = 'MD' OR b.booking_target IS NULL)";

    // Day stats for selectedDate
    const daySlots = db.prepare(`
      SELECT s.* FROM admin_slots s
      LEFT JOIN admin_schedules sch ON s.schedule_id = sch.id
      WHERE s.date = ? AND ${schedTargetCond}
    `).all(selectedDate);
    const totalSlots = daySlots.length;
    const booked = daySlots.filter(s => s.status === 'BOOKED').length;
    const available = daySlots.filter(s => s.status === 'AVAILABLE').length;

    const completedBookings = db.prepare(`
      SELECT COUNT(*) as count FROM admin_bookings b
      WHERE b.date = ? AND b.status = 'COMPLETED' AND ${bookTargetCond}
    `).get(selectedDate).count;

    const dayStats = {
      totalSlots,
      booked,
      available,
      completed: completedBookings,
    };

    // Overall KPI stats
    const todayConfirmed = db.prepare(`
      SELECT COUNT(*) as count FROM admin_bookings b
      WHERE b.date = ? AND b.status IN ('CONFIRMED', 'PENDING') AND ${bookTargetCond}
    `).get(todayStr).count;

    const upcomingCount = db.prepare(`
      SELECT COUNT(*) as count FROM admin_bookings b
      WHERE b.date >= ? AND b.status IN ('CONFIRMED', 'PENDING') AND ${bookTargetCond}
    `).get(todayStr).count;

    const totalBookingsCount = db.prepare(`
      SELECT COUNT(*) as count FROM admin_bookings b WHERE ${bookTargetCond}
    `).get().count;

    const availableSlotsToday = db.prepare(`
      SELECT COUNT(*) as count FROM admin_slots s
      LEFT JOIN admin_schedules sch ON s.schedule_id = sch.id
      WHERE s.date = ? AND s.status = 'AVAILABLE' AND ${schedTargetCond}
    `).get(todayStr).count;

    const cancelledCount = db.prepare(`
      SELECT COUNT(*) as count FROM admin_bookings b
      WHERE b.status = 'CANCELLED' AND ${bookTargetCond}
    `).get().count;

    const stats = {
      todayMeetings: todayConfirmed,
      upcomingMeetings: upcomingCount,
      totalBookings: totalBookingsCount,
      availableSlots: availableSlotsToday,
      cancelledMeetings: cancelledCount,
    };

    // Today Schedule (slots on selectedDate with joined booking info)
    const scheduleRows = db.prepare(`
      SELECT 
        s.id as slot_id,
        s.display_time as displayTime,
        s.status as slot_status,
        b.id as booking_id,
        b.status as booking_status,
        b.client_name as user_name,
        b.client_email as user_email,
        b.client_phone as user_phone,
        b.purpose as event_name,
        b.purpose as meeting_purpose,
        b.location as location,
        b.booking_source as booking_source,
        b.meeting_link as meeting_link
      FROM admin_slots s
      LEFT JOIN admin_schedules sch ON s.schedule_id = sch.id
      LEFT JOIN admin_bookings b ON s.booking_id = b.id
      WHERE s.date = ? AND ${schedTargetCond}
      ORDER BY s.start_time ASC
    `).all(selectedDate);

    // Upcoming Meetings (next 5)
    const upcomingMeetings = db.prepare(`
      SELECT 
        b.id,
        b.client_name as user_name,
        b.client_email as user_email,
        b.date,
        b.start_time,
        b.end_time,
        b.display_time as displayTime,
        b.purpose as event_name,
        b.location,
        b.status as booking_status,
        b.booking_source
      FROM admin_bookings b
      WHERE b.date >= ? AND b.status IN ('CONFIRMED', 'PENDING') AND ${bookTargetCond}
      ORDER BY b.date ASC, b.start_time ASC
      LIMIT 10
    `).all(todayStr);

    // Recent Notifications (last 7 days only)
    let recentNotifications = [];
    try {
      notificationService.purgeOldNotifications();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      cutoff.setHours(0, 0, 0, 0);
      const cutoffIso = cutoff.toISOString();

      let notifSql = `
        SELECT * FROM notifications 
        WHERE COALESCE(delivered_at, created_at) >= ?
      `;
      const notifParams = [cutoffIso];
      if (isSalesLead) {
        notifSql += " AND (recipient LIKE '%Sales%' OR recipient LIKE '%Lead%')";
      } else if (target === 'MD') {
        notifSql += " AND (recipient NOT LIKE '%Sales%' AND recipient NOT LIKE '%Lead%')";
      }
      notifSql += " ORDER BY created_at DESC LIMIT 10";
      recentNotifications = db.prepare(notifSql).all(...notifParams);
    } catch (_) {}

    // Calendar bookings for the month dot indicators
    const calendarBookings = db.prepare(`
      SELECT b.date, b.status, COUNT(*) as count
      FROM admin_bookings b
      WHERE b.status IN ('CONFIRMED', 'PENDING', 'COMPLETED') AND ${bookTargetCond}
      GROUP BY b.date, b.status
    `).all();

    const activeUpcomingMeetings = upcomingMeetings.filter(m => !isTimePassed(m.date, m.end_time)).slice(0, 5);

    res.json({
      dayStats,
      stats,
      todaySchedule: scheduleRows,
      upcomingMeetings: activeUpcomingMeetings,
      recentNotifications,
      calendarBookings,
    });
  } catch (err) {
    console.error('Error fetching admin dashboard:', err);
    res.status(500).json({ error: 'Failed to fetch admin dashboard', message: err.message });
  }
});

// -------------------------------------------------------------
// GET /api/admin/calendar
// Formats all slots and bookings into items for calendar agenda
// -------------------------------------------------------------
router.get('/calendar', (req, res) => {
  try {
    const target = req.query.target ? req.query.target.toUpperCase() : 'MD';
    const isSalesLead = target === 'SALES_LEAD';
    const schedTargetCond = isSalesLead
      ? "sc.booking_target = 'SALES_LEAD'"
      : "(sc.booking_target = 'MD' OR sc.booking_target IS NULL)";

    const slots = db.prepare(`
      SELECT 
        s.id as slot_id,
        s.schedule_id,
        s.date,
        s.start_time,
        s.end_time,
        s.display_time,
        s.status as slot_status,
        b.id as booking_id,
        b.client_name,
        b.client_email,
        b.client_phone,
        b.company_name,
        b.purpose,
        b.location,
        b.meeting_link,
        b.status as booking_status,
        b.booking_source,
        b.notes
      FROM admin_slots s
      JOIN admin_schedules sc ON s.schedule_id = sc.id
      LEFT JOIN admin_bookings b ON s.booking_id = b.id
      WHERE ${schedTargetCond} AND (sc.status = 'ACTIVE' OR sc.status IS NULL)
      ORDER BY s.date ASC, s.start_time ASC
    `).all();

    const items = slots.map((s) => {
      let state = 'Available';
      if (s.slot_status === 'BLOCKED') {
        state = 'Cancelled';
      } else if (s.booking_id) {
        if (s.booking_status === 'CONFIRMED') state = 'Booked';
        else if (s.booking_status === 'PENDING') state = 'Pending';
        else if (s.booking_status === 'COMPLETED') state = 'Completed';
        else if (s.booking_status === 'CANCELLED') state = 'Cancelled';
      }

      return {
        id: s.slot_id,
        date: s.date,
        time: to12Hour(s.start_time),
        displayTime: s.display_time,
        state,
        bookingId: s.booking_id,
        bookingSource: s.booking_source || 'CLIENT',
        clientName: s.client_name || '',
        userName: s.client_name || '',
        clientEmail: s.client_email || '',
        userEmail: s.client_email || '',
        clientPhone: s.client_phone || '',
        userPhone: s.client_phone || '',
        companyName: s.company_name || '',
        eventName: s.purpose || (state === 'Available' ? 'Available Appointment Slot' : 'Meeting Slot'),
        purpose: s.purpose || 'Executive Appointment',
        location: s.location || 'Gentize Office',
        meetingLink: s.meeting_link || '',
        notes: s.notes || '',
        status: s.booking_status || s.slot_status,
      };
    });

    res.json({ items });
  } catch (err) {
    console.error('Error fetching admin calendar:', err);
    res.status(500).json({ error: 'Failed to load calendar data', message: err.message });
  }
});

// -------------------------------------------------------------
// GET /api/admin/events
// Lists active working hours schedules (finished ones move to /history)
// -------------------------------------------------------------
router.get('/events', (req, res) => {
  try {
    const target = req.query.target ? req.query.target.toUpperCase() : null;
    let sql = 'SELECT * FROM admin_schedules';
    const params = [];
    if (target === 'SALES_LEAD') {
      sql += ' WHERE booking_target = ?';
      params.push('SALES_LEAD');
    } else if (target === 'MD') {
      sql += ' WHERE (booking_target = ? OR booking_target IS NULL)';
      params.push('MD');
    }
    sql += ' ORDER BY date ASC, start_time ASC';

    const schedules = db.prepare(sql).all(...params);
    const result = schedules.map((s) => {
      const slots = db.prepare('SELECT * FROM admin_slots WHERE schedule_id = ? ORDER BY start_time ASC').all(s.id);
      const bookedCount = slots.filter(slot => slot.status === 'BOOKED').length;
      const finished = isTimePassed(s.date, s.end_time);

      return {
        id: s.id,
        title: s.title,
        date: s.date,
        startTime: s.start_time,
        endTime: s.end_time,
        start_time: s.start_time,
        end_time: s.end_time,
        slotDuration: s.slot_duration,
        slot_duration: s.slot_duration,
        bufferTime: s.buffer_time,
        buffer_time: s.buffer_time,
        location: s.location,
        meetingLink: s.meeting_link,
        assignedUserId: s.assigned_user_id,
        bookingTarget: s.booking_target || 'MD',
        status: finished ? 'EXPIRED' : s.status,
        totalSlots: slots.length,
        total_slots: slots.length,
        bookedSlots: bookedCount,
        booked_slots: bookedCount,
        availableSlots: Math.max(0, slots.length - bookedCount),
        available_slots: Math.max(0, slots.length - bookedCount),
        isFinished: finished,
        is_finished: finished,
        slots,
      };
    });

    const activeSchedules = req.query.all === 'true' ? result : result.filter(s => !s.isFinished);
    res.json({ schedules: activeSchedules });
  } catch (err) {
    console.error('Error fetching admin events/schedules:', err);
    res.status(500).json({ error: 'Failed to fetch schedules', message: err.message });
  }
});


// -------------------------------------------------------------
// POST /api/admin/events
// Creates a new working schedule and generates time slots
// -------------------------------------------------------------
router.post('/events', (req, res) => {
  try {
    const {
      title,
      date,
      startTime: inputStartTime,
      endTime: inputEndTime,
      slotDuration = 0,
      bufferTime = 0,
      location = 'Gentize Office',
      meetingLink = '',
      assignedUserId = null,
      bookingTarget = 'MD',
      slotRanges = [],
    } = req.body;

    // Filter valid slot ranges if provided
    const validRanges = Array.isArray(slotRanges) && slotRanges.length > 0
      ? slotRanges.filter(r => r && r.startTime && r.endTime && r.startTime < r.endTime)
      : [];

    let startTime = inputStartTime;
    let endTime = inputEndTime;

    if (validRanges.length > 0) {
      const sortedStarts = [...validRanges].map(r => r.startTime).sort();
      const sortedEnds = [...validRanges].map(r => r.endTime).sort();
      startTime = sortedStarts[0];
      endTime = sortedEnds[sortedEnds.length - 1];
    }

    if (!title || !date || !startTime || !endTime) {
      return res.status(400).json({ error: 'Title, date, startTime, and endTime are required.' });
    }

    const durationNum = Number(slotDuration) || 0;
    const nowIso = new Date().toISOString();
    const insertSchedule = db.prepare(`
      INSERT INTO admin_schedules (
        title, date, start_time, end_time, slot_duration, buffer_time,
        location, meeting_link, assigned_user_id, status, booking_target, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
    `);

    const info = insertSchedule.run(
      title,
      date,
      startTime,
      endTime,
      durationNum,
      Number(bufferTime),
      location,
      meetingLink,
      assignedUserId ? Number(assignedUserId) : null,
      bookingTarget,
      nowIso
    );

    const scheduleId = info.lastInsertRowid;
    let generatedSlots = [];

    if (validRanges.length > 0) {
      for (const range of validRanges) {
        if (durationNum > 0) {
          const slots = generateSlotsForSchedule(
            scheduleId,
            date,
            range.startTime,
            range.endTime,
            durationNum,
            Number(bufferTime)
          );
          generatedSlots.push(...slots);
        } else {
          // Exact slot window / No split
          generatedSlots.push({
            schedule_id: scheduleId,
            date,
            start_time: range.startTime,
            end_time: range.endTime,
            display_time: `${to12Hour(range.startTime)} - ${to12Hour(range.endTime)}`,
            status: 'AVAILABLE'
          });
        }
      }
    } else {
      // Fallback to single startTime / endTime
      if (durationNum > 0) {
        generatedSlots = generateSlotsForSchedule(
          scheduleId,
          date,
          startTime,
          endTime,
          durationNum,
          Number(bufferTime)
        );
      } else {
        generatedSlots = [{
          schedule_id: scheduleId,
          date,
          start_time: startTime,
          end_time: endTime,
          display_time: `${to12Hour(startTime)} - ${to12Hour(endTime)}`,
          status: 'AVAILABLE'
        }];
      }
    }

    const insertSlot = db.prepare(`
      INSERT INTO admin_slots (schedule_id, date, start_time, end_time, display_time, status, booking_id, created_at)
      VALUES (?, ?, ?, ?, ?, 'AVAILABLE', null, ?)
    `);

    for (const slot of generatedSlots) {
      insertSlot.run(slot.schedule_id, slot.date, slot.start_time, slot.end_time, slot.display_time, nowIso);
    }

    res.status(201).json({
      success: true,
      message: `Schedule created with ${generatedSlots.length} available slots across ${validRanges.length || 1} window(s).`,
      scheduleId,
      slotCount: generatedSlots.length,
    });
  } catch (err) {
    console.error('Error creating admin schedule:', err);
    res.status(500).json({ error: 'Failed to create schedule', message: err.message });
  }
});

// -------------------------------------------------------------
// GET /api/admin/events/:id
// -------------------------------------------------------------
router.get('/events/:id', (req, res) => {
  try {
    const schedule = db.prepare('SELECT * FROM admin_schedules WHERE id = ?').get(req.params.id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    const slots = db.prepare('SELECT * FROM admin_slots WHERE schedule_id = ? ORDER BY start_time ASC').all(schedule.id);
    res.json({
      schedule: {
        id: schedule.id,
        title: schedule.title,
        date: schedule.date,
        startTime: schedule.start_time,
        endTime: schedule.end_time,
        slotDuration: schedule.slot_duration,
        bufferTime: schedule.buffer_time,
        location: schedule.location,
        meetingLink: schedule.meeting_link,
        status: schedule.status,
        slots,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch schedule details', message: err.message });
  }
});

// -------------------------------------------------------------
// DELETE /api/admin/events/:id
// -------------------------------------------------------------
router.delete('/events/:id', (req, res) => {
  try {
    const scheduleId = req.params.id;
    // Mark linked bookings as CANCELLED
    db.prepare(`
      UPDATE admin_bookings 
      SET status = 'CANCELLED', cancellation_reason = 'Schedule cancelled by MD' 
      WHERE event_id = ?
    `).run(scheduleId);

    // Delete slots
    db.prepare('DELETE FROM admin_slots WHERE schedule_id = ?').run(scheduleId);

    // Delete schedule
    db.prepare('DELETE FROM admin_schedules WHERE id = ?').run(scheduleId);

    res.json({ success: true, message: 'Schedule and related slots deleted successfully.' });
  } catch (err) {
    console.error('Error deleting schedule:', err);
    res.status(500).json({ error: 'Failed to delete schedule', message: err.message });
  }
});

// -------------------------------------------------------------
// GET /api/admin/bookings
// Lists active bookings (finished appointments move to /history)
// -------------------------------------------------------------
router.get('/bookings', (req, res) => {
  try {
    const target = req.query.target ? req.query.target.toUpperCase() : null;
    let sql = 'SELECT * FROM admin_bookings';
    const params = [];
    if (target === 'SALES_LEAD') {
      sql += ' WHERE booking_target = ?';
      params.push('SALES_LEAD');
    } else if (target === 'MD') {
      sql += ' WHERE (booking_target = ? OR booking_target IS NULL)';
      params.push('MD');
    }
    sql += ' ORDER BY date ASC, start_time ASC';

    const rows = db.prepare(sql).all(...params);
    const bookings = rows.map((b) => {
      const finished = isTimePassed(b.date, b.end_time);
      return {
        id: b.id,
        slot_id: b.slot_id,
        event_id: b.event_id,
        date: b.date,
        start_time: b.start_time,
        end_time: b.end_time,
        display_time: b.display_time,
        client_name: b.client_name,
        user_name: b.client_name,
        client_email: b.client_email,
        user_email: b.client_email,
        client_phone: b.client_phone,
        user_phone: b.client_phone,
        company_name: b.company_name,
        purpose: b.purpose,
        meeting_purpose: b.purpose,
        location: b.location,
        status: b.status,
        booking_source: b.booking_source,
        meeting_link: b.meeting_link,
        notes: b.notes,
        cancellation_reason: b.cancellation_reason,
        created_at: b.created_at,
        updated_at: b.updated_at,
        isFinished: finished,
        is_finished: finished,
      };
    });

    const activeBookings = req.query.all === 'true' ? bookings : bookings.filter(b => b.status === 'PENDING' || !b.isFinished);
    res.json({ bookings: activeBookings });
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ error: 'Failed to fetch bookings', message: err.message });
  }
});

// -------------------------------------------------------------
// GET /api/admin/history
// Lists finished schedules & past appointments, newest first
// -------------------------------------------------------------
router.get('/history', (req, res) => {
  try {
    const target = req.query.target ? req.query.target.toUpperCase() : null;
    let bSql = 'SELECT * FROM admin_bookings';
    let sSql = 'SELECT * FROM admin_schedules';
    const bParams = [];
    const sParams = [];
    if (target === 'SALES_LEAD') {
      bSql += ' WHERE booking_target = ?';
      bParams.push('SALES_LEAD');
      sSql += ' WHERE booking_target = ?';
      sParams.push('SALES_LEAD');
    } else if (target === 'MD') {
      bSql += ' WHERE (booking_target = ? OR booking_target IS NULL)';
      bParams.push('MD');
      sSql += ' WHERE (booking_target = ? OR booking_target IS NULL)';
      sParams.push('MD');
    }
    bSql += ' ORDER BY date DESC, start_time DESC';
    sSql += ' ORDER BY date DESC, start_time DESC';

    // 1. Finished Bookings: sorted by date DESC, start_time DESC (newest finished first)
    const allBookings = db.prepare(bSql).all(...bParams);
    const finishedBookings = allBookings
      .filter((b) => isTimePassed(b.date, b.end_time))
      .map((b) => ({
        id: b.id,
        slot_id: b.slot_id,
        event_id: b.event_id,
        date: b.date,
        start_time: b.start_time,
        end_time: b.end_time,
        display_time: b.display_time,
        client_name: b.client_name,
        user_name: b.client_name,
        client_email: b.client_email,
        user_email: b.client_email,
        client_phone: b.client_phone,
        user_phone: b.client_phone,
        company_name: b.company_name,
        purpose: b.purpose,
        meeting_purpose: b.purpose,
        location: b.location,
        status: b.status === 'CONFIRMED' ? 'CONCLUDED' : b.status,
        booking_source: b.booking_source,
        meeting_link: b.meeting_link,
        notes: b.notes,
        cancellation_reason: b.cancellation_reason,
        created_at: b.created_at,
        updated_at: b.updated_at,
        isFinished: true,
      }));

    // 2. Finished Schedules: sorted by date DESC, start_time DESC (newest finished first)
    const allSchedules = db.prepare(sSql).all(...sParams);
    const finishedSchedules = allSchedules
      .filter((s) => isTimePassed(s.date, s.end_time))
      .map((s) => {
        const slots = db.prepare('SELECT * FROM admin_slots WHERE schedule_id = ? ORDER BY start_time ASC').all(s.id);
        const bookedCount = slots.filter(slot => slot.status === 'BOOKED').length;
        return {
          id: s.id,
          title: s.title,
          date: s.date,
          startTime: s.start_time,
          endTime: s.end_time,
          start_time: s.start_time,
          end_time: s.end_time,
          slotDuration: s.slot_duration,
          slot_duration: s.slot_duration,
          bufferTime: s.buffer_time,
          buffer_time: s.buffer_time,
          location: s.location,
          meetingLink: s.meeting_link,
          assignedUserId: s.assigned_user_id,
          status: 'EXPIRED',
          totalSlots: slots.length,
          total_slots: slots.length,
          bookedSlots: bookedCount,
          booked_slots: bookedCount,
          availableSlots: Math.max(0, slots.length - bookedCount),
          available_slots: Math.max(0, slots.length - bookedCount),
          isFinished: true,
          slots,
        };
      });

    res.json({
      success: true,
      bookings: finishedBookings,
      schedules: finishedSchedules,
      totalCount: finishedBookings.length + finishedSchedules.length,
    });
  } catch (err) {
    console.error('Error fetching admin history:', err);
    res.status(500).json({ error: 'Failed to fetch history', message: err.message });
  }
});

// -------------------------------------------------------------
// DELETE /api/admin/history/clear-all
// Permanently clears finished schedules & past appointments for MD or Sales Lead
// -------------------------------------------------------------
const clearAdminHistoryHandler = (req, res) => {
  try {
    const target = req.query.target ? req.query.target.toUpperCase() : null;
    let bSql = 'SELECT id, date, end_time FROM admin_bookings';
    let sSql = 'SELECT id, date, end_time FROM admin_schedules';
    const bParams = [];
    const sParams = [];

    if (target === 'SALES_LEAD') {
      bSql += ' WHERE booking_target = ?';
      bParams.push('SALES_LEAD');
      sSql += ' WHERE booking_target = ?';
      sParams.push('SALES_LEAD');
    } else if (target === 'MD') {
      bSql += ' WHERE (booking_target = ? OR booking_target IS NULL)';
      bParams.push('MD');
      sSql += ' WHERE (booking_target = ? OR booking_target IS NULL)';
      sParams.push('MD');
    }

    const allBookings = db.prepare(bSql).all(...bParams);
    const pastBookingIds = allBookings.filter(b => isTimePassed(b.date, b.end_time)).map(b => b.id);

    const allSchedules = db.prepare(sSql).all(...sParams);
    const pastScheduleIds = allSchedules.filter(s => isTimePassed(s.date, s.end_time)).map(s => s.id);

    if (pastBookingIds.length > 0) {
      const placeholders = pastBookingIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM admin_bookings WHERE id IN (${placeholders})`).run(...pastBookingIds);
    }

    if (pastScheduleIds.length > 0) {
      const sPlaceholders = pastScheduleIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM admin_slots WHERE schedule_id IN (${sPlaceholders})`).run(...pastScheduleIds);
      db.prepare(`DELETE FROM admin_schedules WHERE id IN (${sPlaceholders})`).run(...pastScheduleIds);
    }

    res.json({
      success: true,
      message: `Cleared ${pastBookingIds.length} bookings and ${pastScheduleIds.length} schedules from history.`,
      clearedBookings: pastBookingIds.length,
      clearedSchedules: pastScheduleIds.length,
    });
  } catch (err) {
    console.error('Error clearing admin history:', err);
    res.status(500).json({ error: 'Failed to clear history', message: err.message });
  }
};

router.delete('/history/clear-all', clearAdminHistoryHandler);
router.post('/history/clear-all', clearAdminHistoryHandler);



// -------------------------------------------------------------
// POST /api/admin/bookings/:id/confirm
// -------------------------------------------------------------
router.post('/bookings/:id/confirm', (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = db.prepare('SELECT * FROM admin_bookings WHERE id = ?').get(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const nowIso = new Date().toISOString();
    db.prepare("UPDATE admin_bookings SET status = 'CONFIRMED', updated_at = ? WHERE id = ?").run(nowIso, bookingId);
    if (booking.slot_id) {
      db.prepare("UPDATE admin_slots SET status = 'BOOKED', booking_id = ? WHERE id = ?").run(bookingId, booking.slot_id);
    }

    try {
      db.prepare("UPDATE notifications SET booking_status = 'CONFIRMED', is_read = 1 WHERE booking_id = ?").run(bookingId);
    } catch (_) {}

    // In-app notification for MD
    try {
      db.prepare(`
        INSERT INTO notifications (booking_id, type, title, message, is_read, recipient, client_name, booking_date, display_time, booking_status, location, status, delivered_at, created_at, updated_at)
        VALUES (?, 'PUSH', 'Booking Confirmed', ?, 0, 'MD Executive Office', ?, ?, ?, 'CONFIRMED', ?, 'DELIVERED', ?, ?, ?)
      `).run(bookingId, `Booking with ${booking.client_name} on ${booking.date} at ${booking.display_time} was confirmed.`, booking.client_name, booking.date, booking.display_time, booking.location, nowIso, nowIso, nowIso);
    } catch (_) {}

    // In-app notification for Client
    try {
      const clientRecipient = booking.client_name || booking.client_email || 'Client';
      db.prepare(`
        INSERT INTO notifications (booking_id, type, title, message, is_read, recipient, client_name, booking_date, display_time, booking_status, location, status, delivered_at, created_at, updated_at)
        VALUES (?, 'PUSH', 'Appointment Confirmed by MD!', ?, 0, ?, ?, ?, ?, 'CONFIRMED', ?, 'DELIVERED', ?, ?, ?)
      `).run(
        bookingId,
        `Managing Director has reviewed and confirmed your appointment for ${booking.date} at ${booking.display_time}. Location: ${booking.location}.`,
        clientRecipient,
        booking.client_name,
        booking.date,
        booking.display_time,
        booking.location,
        nowIso,
        nowIso,
        nowIso
      );

      if (booking.client_email) {
        db.prepare(`
          INSERT INTO notifications (booking_id, type, title, message, is_read, recipient, client_name, booking_date, display_time, booking_status, location, status, delivered_at, created_at, updated_at)
          VALUES (?, 'EMAIL', 'Appointment Confirmation Dispatched', ?, 0, ?, ?, ?, ?, 'CONFIRMED', ?, 'DELIVERED', ?, ?, ?)
        `).run(
          bookingId,
          `Official appointment confirmation sent to ${booking.client_email} for ${booking.date} at ${booking.display_time}.`,
          booking.client_email,
          booking.client_name,
          booking.date,
          booking.display_time,
          booking.location,
          nowIso,
          nowIso,
          nowIso
        );
      }
    } catch (e) {
      console.error('Failed to dispatch client confirmation notification:', e);
    }

    res.json({ success: true, message: 'Booking confirmed successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to confirm booking', message: err.message });
  }
});

// -------------------------------------------------------------
// POST /api/admin/bookings/:id/cancel
// -------------------------------------------------------------
router.post('/bookings/:id/cancel', (req, res) => {
  try {
    const bookingId = req.params.id;
    const reason = req.body.reason || 'Declined / Cancelled by MD';
    const booking = db.prepare('SELECT * FROM admin_bookings WHERE id = ?').get(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const nowIso = new Date().toISOString();
    db.prepare(`
      UPDATE admin_bookings 
      SET status = 'CANCELLED', cancellation_reason = ?, updated_at = ? 
      WHERE id = ?
    `).run(reason, nowIso, bookingId);

    if (booking.slot_id) {
      db.prepare("UPDATE admin_slots SET status = 'AVAILABLE', booking_id = null WHERE id = ?").run(booking.slot_id);
    }

    // In-app notification for Client
    try {
      const clientRecipient = booking.client_name || booking.client_email || 'Client';
      db.prepare(`
        INSERT INTO notifications (booking_id, type, title, message, is_read, recipient, client_name, booking_date, display_time, booking_status, location, status, delivered_at, created_at, updated_at)
        VALUES (?, 'PUSH', 'Appointment Cancelled', ?, 0, ?, ?, ?, ?, 'CANCELLED', ?, 'DELIVERED', ?, ?, ?)
      `).run(
        bookingId,
        `Your appointment on ${booking.date} at ${booking.display_time} was cancelled. Reason: ${reason}.`,
        clientRecipient,
        booking.client_name,
        booking.date,
        booking.display_time,
        booking.location,
        nowIso,
        nowIso,
        nowIso
      );
    } catch (_) {}

    res.json({ success: true, message: 'Booking cancelled successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel booking', message: err.message });
  }
});

// -------------------------------------------------------------
// POST /api/admin/bookings/:id/recreate-meet
// -------------------------------------------------------------
router.post('/bookings/:id/recreate-meet', (req, res) => {
  try {
    const bookingId = req.params.id;
    const meetCode = generateMeetCode();
    const newLink = `https://meet.google.com/${meetCode}`;
    const nowIso = new Date().toISOString();

    db.prepare('UPDATE admin_bookings SET meeting_link = ?, updated_at = ? WHERE id = ?').run(newLink, nowIso, bookingId);

    res.json({ success: true, meetingLink: newLink, message: 'Google Meet link recreated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to recreate meet link', message: err.message });
  }
});

// -------------------------------------------------------------
// POST /api/admin/bookings/:id/reschedule
// -------------------------------------------------------------
router.post('/bookings/:id/reschedule', (req, res) => {
  try {
    const bookingId = req.params.id;
    const { newDate, newStartTime, newEndTime, newSlotId } = req.body;
    const booking = db.prepare('SELECT * FROM admin_bookings WHERE id = ?').get(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const nowIso = new Date().toISOString();

    if (newSlotId) {
      const slot = db.prepare('SELECT * FROM admin_slots WHERE id = ?').get(newSlotId);
      if (!slot) return res.status(404).json({ error: 'Target slot not found' });

      // Free previous slot
      if (booking.slot_id) {
        db.prepare("UPDATE admin_slots SET status = 'AVAILABLE', booking_id = null WHERE id = ?").run(booking.slot_id);
      }

      // Claim new slot
      db.prepare("UPDATE admin_slots SET status = 'BOOKED', booking_id = ? WHERE id = ?").run(bookingId, newSlotId);

      // Update booking
      db.prepare(`
        UPDATE admin_bookings
        SET slot_id = ?, date = ?, start_time = ?, end_time = ?, display_time = ?, updated_at = ?
        WHERE id = ?
      `).run(slot.id, slot.date, slot.start_time, slot.end_time, slot.display_time, nowIso, bookingId);
    } else if (newDate && newStartTime && newEndTime) {
      const displayTime = `${to12Hour(newStartTime)} - ${to12Hour(newEndTime)}`;
      db.prepare(`
        UPDATE admin_bookings
        SET date = ?, start_time = ?, end_time = ?, display_time = ?, updated_at = ?
        WHERE id = ?
      `).run(newDate, newStartTime, newEndTime, displayTime, nowIso, bookingId);
    }

    res.json({ success: true, message: 'Booking rescheduled successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reschedule booking', message: err.message });
  }
});

// -------------------------------------------------------------
// POST /api/admin/block-slots
// Quick block slots for Out of Office
// -------------------------------------------------------------
router.post('/block-slots', (req, res) => {
  try {
    const { date, reason = 'Out of Office / Busy', startTime, endTime } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    if (startTime && endTime) {
      db.prepare(`
        UPDATE admin_slots 
        SET status = 'BLOCKED' 
        WHERE date = ? AND start_time >= ? AND end_time <= ? AND status = 'AVAILABLE'
      `).run(date, startTime, endTime);
    } else {
      // Block all available slots on that date
      db.prepare(`
        UPDATE admin_slots 
        SET status = 'BLOCKED' 
        WHERE date = ? AND status = 'AVAILABLE'
      `).run(date);
    }

    res.json({ success: true, message: `Time slots on ${date} blocked successfully.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to block slots', message: err.message });
  }
});

// -------------------------------------------------------------
// Users Management: GET & POST /api/admin/users
// -------------------------------------------------------------
router.get('/users', (req, res) => {
  try {
    const users = db.prepare('SELECT id, name, email, phone, role, created_at FROM admin_users ORDER BY id ASC').all();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users', message: err.message });
  }
});

router.post('/users', (req, res) => {
  try {
    const { name, email, phone = '', password = 'user123', role = 'USER' } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required.' });

    const nowIso = new Date().toISOString();
    const info = db.prepare(`
      INSERT INTO admin_users (name, email, phone, password, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, email, phone, password, role, nowIso);

    res.status(201).json({
      success: true,
      user: { id: info.lastInsertRowid, name, email, phone, role, created_at: nowIso },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user', message: err.message });
  }
});

// -------------------------------------------------------------
// Clients Management: GET /api/admin/clients
// -------------------------------------------------------------
router.get('/clients', (req, res) => {
  try {
    const clientBookings = db.prepare(`
      SELECT 
        client_name as name,
        client_email as email,
        client_phone as phone,
        company_name as company,
        COUNT(*) as totalBookings,
        MAX(date) as lastBookingDate
      FROM admin_bookings
      WHERE client_name IS NOT NULL AND client_name != ''
      GROUP BY client_email, client_name
      ORDER BY lastBookingDate DESC
    `).all();

    const clients = clientBookings.map((c, idx) => ({
      id: idx + 1,
      name: c.name,
      email: c.email || '',
      phone: c.phone || '',
      company: c.company || 'Direct Client',
      totalBookings: c.totalBookings,
      lastBookingDate: c.lastBookingDate,
    }));

    res.json({ clients });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch client history', message: err.message });
  }
});

// -------------------------------------------------------------
// Client Accounts (Credentials): GET, POST, DELETE /api/admin/client-accounts
// -------------------------------------------------------------
router.get('/client-accounts', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM client_accounts ORDER BY created_at DESC').all();
    const clients = rows.map((r) => ({
      id: r.id || r.username,
      name: r.name,
      username: r.username,
      phone: r.phone || '',
      email: r.email || (r.username && r.username.includes('@') ? r.username : ''),
      password: r.password,
      raw_password: r.password,
      company: r.company || '',
      created_at: r.created_at,
    }));

    res.json({ clients });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch client accounts', message: err.message });
  }
});

router.post('/client-accounts', (req, res) => {
  try {
    const { name, username, phone = '', password, company = '' } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Name, username and password are required.' });
    }

    const nowIso = new Date().toISOString();
    db.prepare(`
      INSERT OR REPLACE INTO client_accounts (id, name, username, email, phone, password, company, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(username, name, username, `${username}@meeetly.client`, phone, password, company, nowIso);

    res.status(201).json({ success: true, message: 'Client account credentials created successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save client account', message: err.message });
  }
});

router.delete('/client-accounts/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM client_accounts WHERE id = ? OR username = ?').run(req.params.id, req.params.id);
    res.json({ success: true, message: 'Client account deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete client account', message: err.message });
  }
});

// -------------------------------------------------------------
// Admin Authentication: POST /api/admin/login
// -------------------------------------------------------------
router.post('/login', (req, res) => {
  try {
    const { userId, username, email, password, industry } = req.body;
    const identifier = (userId || username || email || '').trim().toLowerCase();

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Admin User ID and Password are required.' });
    }

    let admin = db.prepare(`
      SELECT id, name, email, phone, role, password 
      FROM admin_users 
      WHERE role = 'ADMIN' 
        AND (LOWER(email) = ? OR LOWER(name) = ? OR ? = 'admin' OR ? = 'admin@elevate.com' OR ? = 'md@elevate.com')
    `).get(identifier, identifier, identifier, identifier, identifier);

    if (!admin && (identifier === 'admin' || identifier === 'admin@elevate.com' || identifier === 'md@elevate.com')) {
      admin = db.prepare("SELECT id, name, email, phone, role, password, avatar FROM admin_users WHERE role = 'ADMIN' LIMIT 1").get();
    }

    if (!admin || admin.password !== password) {
      return res.status(401).json({ error: 'Invalid Admin User ID or Password. Please try again.' });
    }

    if (!industries.some(item => item.id === industry)) {
      return res.status(400).json({ error: 'Please select a valid industry before signing in.' });
    }
    createNewsSession(req, res, admin.id, industry);
    const token = `admin_token_${Date.now()}_${admin.id}`;
    res.json({
      success: true,
      token,
      industry,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        avatar: admin.avatar || "",
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Admin login failed', message: err.message });
  }
});

// -------------------------------------------------------------
router.post('/logout', (req, res) => { clearNewsSession(req, res); res.json({ success: true }); });
router.get('/news-session', (req, res) => {
  const session = getNewsSession(req);
  if (!session) return res.status(401).json({ error: 'Please sign in again and select your industry.' });
  res.json({ success: true, industry: session.industry });
});

// Admin Password Update: PUT /api/admin/change-password
// -------------------------------------------------------------
router.put('/change-password', (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }
    if (String(newPassword).trim().length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters long.' });
    }

    const admin = db.prepare("SELECT id, password FROM admin_users WHERE role = 'ADMIN' LIMIT 1").get();
    if (!admin) {
      return res.status(404).json({ error: 'Admin account not found.' });
    }

    if (admin.password !== currentPassword) {
      return res.status(400).json({ error: 'Current password does not match. Please verify and try again.' });
    }

    db.prepare('UPDATE admin_users SET password = ? WHERE id = ?').run(String(newPassword).trim(), admin.id);
    res.json({ success: true, message: 'Admin password updated successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update password', message: err.message });
  }
});

// -------------------------------------------------------------
// Platform Settings: GET & PUT /api/admin/settings
// -------------------------------------------------------------
router.get('/settings', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM admin_settings WHERE id = 1').get();
    const admin = db.prepare("SELECT name, email, phone, avatar FROM admin_users WHERE role = 'ADMIN' LIMIT 1").get();
    res.json({
      settings: {
        company_name: settings?.company_name || 'Meeetly Internal',
        admin_name: admin?.name || 'Dr. Ramesh (MD)',
        admin_phone: admin?.phone || '+91 98400 12345',
        admin_email: admin?.email || 'md@meeetly.com',
        admin_avatar: admin?.avatar || '',
        default_slot_duration: settings?.default_slot_duration || '30',
        email_notifications_enabled: settings?.email_notifications_enabled || '1',
        sms_notifications_enabled: settings?.sms_notifications_enabled || '1',
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings', message: err.message });
  }
});

router.put('/settings', (req, res) => {
  try {
    const { company_name, admin_name, admin_phone, admin_email, default_slot_duration, admin_avatar } = req.body;
    try { validateAvatar(admin_avatar); } catch (err) { return res.status(400).json({error: err.message}); }
    db.prepare(`
      INSERT OR REPLACE INTO admin_settings (id, company_name, email_notifications_enabled, sms_notifications_enabled, default_slot_duration)
      VALUES (1, ?, '1', '1', ?)
    `).run(
      company_name || 'Meeetly Internal',
      String(default_slot_duration ?? '30')
    );

    const admin = db.prepare("SELECT id FROM admin_users WHERE role = 'ADMIN' LIMIT 1").get();
    if (admin) {
      db.prepare(`
        UPDATE admin_users 
        SET name = COALESCE(?, name), 
            email = COALESCE(?, email), 
            phone = COALESCE(?, phone), avatar = COALESCE(?, avatar) 
        WHERE id = ?
      `).run(admin_name || null, admin_email || null, admin_phone || null, admin_avatar ?? null, admin.id);
    }

    res.json({ success: true, message: 'Settings saved successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings', message: err.message });
  }
});

export default router;

