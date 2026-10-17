import { validateAvatar } from '../services/profilePhoto.js';
import { Router } from 'express';
import db, { to12Hour } from '../db.js';
import { notificationService } from '../services/notificationService.js';

const router = Router();

// Ensure user_id column in admin_bookings
try {
  db.prepare('ALTER TABLE admin_bookings ADD COLUMN user_id INTEGER').run();
} catch (_) {}

// Ensure Sudhin user exists in admin_users
try {
  const existing = db.prepare("SELECT id FROM admin_users WHERE email = 'sudhinns333@gmail.com'").get();
  if (!existing) {
    db.prepare(`
      INSERT INTO admin_users (name, email, phone, role, password, created_at)
      VALUES ('Sudhin', 'sudhinns333@gmail.com', '+91 98765 43210', 'USER', 'user123', ?)
    `).run(new Date().toISOString());
  }
} catch (_) {}

// -------------------------------------------------------------
// POST /api/user/login
// User / Staff Authentication
// -------------------------------------------------------------
router.post('/login', (req, res) => {
  try {
    const { email, username, userId, password } = req.body;
    const identifier = (email || username || userId || '').trim().toLowerCase();
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email / User ID and Password are required.' });
    }

    let user = db.prepare(`
      SELECT id, name, email, phone, role, password, avatar FROM admin_users
      WHERE (LOWER(email) = ? OR LOWER(name) = ? OR id = ? OR (role = 'ADMIN' AND ? = 'admin')) AND password = ?
    `).get(identifier, identifier, identifier, identifier, password.trim());

    if (!user && (identifier === 'admin' || identifier === 'md@meeetly.com' || identifier === 'md@elevate.com')) {
      const adminUser = db.prepare("SELECT id, name, email, phone, role, password, avatar FROM admin_users WHERE role = 'ADMIN' LIMIT 1").get();
      if (adminUser && adminUser.password === password.trim()) {
        user = adminUser;
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid user credentials. Please check your Email / User ID and Password.' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar || "",
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'User login failed', message: err.message });
  }
});

/**
 * GET /api/user/dashboard
 * Complete summary for assistant/user dashboard:
 * - Admin profile
 * - Master calendar bookings (client bookings + user bookings + admin bookings)
 * - User stats
 */
router.get('/dashboard', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Find the MD / Admin
    let admin = db.prepare("SELECT id, name, email, phone FROM admin_users WHERE role = 'ADMIN' LIMIT 1").get();
    if (!admin) {
      admin = { name: 'GENTIZE MD', email: 'md@gentize.com', phone: '+91 98400 12345' };
    }

    // All bookings created by User
    const allUserBookings = db.prepare(
      "SELECT * FROM admin_bookings WHERE booking_source = 'USER' ORDER BY date DESC, start_time DESC"
    ).all();

    // Master calendar bookings (all bookings on MD's calendar)
    const masterBookings = db.prepare(
      "SELECT * FROM admin_bookings WHERE status != 'CANCELLED' ORDER BY date ASC, start_time ASC"
    ).all().map(b => {
      const isClient = b.booking_source === 'CLIENT';
      const isMine = b.booking_source === 'USER';
      return {
        ...b,
        isClientBooking: isClient,
        canModify: isMine,
        bookedByType: b.booking_source || 'CLIENT',
        sourceLabel: isClient ? 'Client Appointment (View Only)' : (isMine ? 'My Booking' : 'MD / Admin Booked'),
      };
    });

    const upcomingUserBookings = allUserBookings.filter(
      b => b.date >= today && b.status !== 'CANCELLED'
    );
    const upcomingBooking = upcomingUserBookings[0] || null;

    const completedCount = allUserBookings.filter(
      b => b.date < today || b.status === 'COMPLETED'
    ).length;

    // Active future & ongoing schedules only (filter out passed dates and expired hours)
    const curHour = String(new Date().getHours()).padStart(2, '0');
    const curMin = String(new Date().getMinutes()).padStart(2, '0');
    const currentTime = `${curHour}:${curMin}`;

    const schedules = db.prepare("SELECT * FROM admin_schedules WHERE status = 'ACTIVE' AND date >= ? ORDER BY date ASC, start_time ASC").all(today)
      .filter(s => {
        if (s.date === today && s.end_time && s.end_time <= currentTime) return false;
        return true;
      })
      .map(s => {
        const availCount = db.prepare("SELECT COUNT(*) as count FROM admin_slots WHERE schedule_id = ? AND status = 'AVAILABLE'").get(s.id).count;
        return {
          ...s,
          available_slots: availCount,
          displayStart: to12Hour(s.start_time),
          displayEnd: to12Hour(s.end_time),
        };
      })
      .filter(s => {
        if (s.date === today && s.available_slots === 0) return false;
        return true;
      });

    res.json({
      success: true,
      admin: admin ? { name: admin.name, email: admin.email, phone: admin.phone } : null,
      stats: {
        totalScheduled: allUserBookings.length,
        upcomingCount: upcomingUserBookings.length,
        completedCount,
        masterTotalCount: masterBookings.length,
        masterUpcomingCount: masterBookings.filter(b => b.date >= today).length,
      },
      upcomingBooking,
      allMasterBookings: masterBookings,
      recentBookings: masterBookings.slice(0, 10),
      schedules,
    });
  } catch (err) {
    console.error('Error fetching user dashboard:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/user/md-schedule
 * Get MD's FREE AVAILABLE slots AND booked slots for a specific date
 */
router.get('/md-schedule', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const targetDate = req.query.date || today;
    const isSalesLead = req.query.target === 'SALES_LEAD';

    // Available free slots
    const slotSql = `
      SELECT s.id as slot_id, s.schedule_id as event_id, s.date, s.start_time, s.end_time, s.status as slot_status,
             s.display_time as displayTime, sc.title as event_title, sc.location, sc.meeting_link
      FROM admin_slots s
      LEFT JOIN admin_schedules sc ON sc.id = s.schedule_id
      WHERE s.date = ? AND s.status = 'AVAILABLE'
        AND ${isSalesLead ? "sc.booking_target = 'SALES_LEAD'" : "(sc.booking_target = 'MD' OR sc.booking_target IS NULL)"}
      ORDER BY s.start_time ASC
    `;
    const slots = db.prepare(slotSql).all(targetDate).map(slot => ({
      ...slot,
      displayTime: slot.displayTime || `${to12Hour(slot.start_time)} - ${to12Hour(slot.end_time)}`,
    }));

    // Booked meetings on host's calendar for this date
    const bookedSql = `
      SELECT b.id as booking_id, b.slot_id, b.date, b.start_time, b.end_time, b.display_time as displayTime,
             b.client_name, b.client_phone, b.client_email, b.purpose as meeting_purpose,
             b.location as meeting_mode, b.booking_source, b.status as booking_status, b.meeting_link
      FROM admin_bookings b
      WHERE b.date = ? AND b.status != 'CANCELLED'
        AND ${isSalesLead ? "b.booking_target = 'SALES_LEAD'" : "(b.booking_target = 'MD' OR b.booking_target IS NULL)"}
      ORDER BY b.start_time ASC
    `;
    const bookedRows = db.prepare(bookedSql).all(targetDate).map(b => {
      const isClient = b.booking_source === 'CLIENT';
      const isMine = b.booking_source === 'USER';
      return {
        ...b,
        displayTime: b.displayTime || `${to12Hour(b.start_time)} - ${to12Hour(b.end_time)}`,
        isClientBooking: isClient,
        canModify: isMine,
        sourceLabel: isClient ? 'Client Appointment (View Only)' : (isMine ? 'My Booking' : `${isSalesLead ? 'Lead' : 'MD'} / Admin Booked`),
      };
    });

    res.json({ success: true, date: targetDate, slots, bookedSlots: bookedRows });
  } catch (err) {
    console.error('Error fetching MD/Lead schedule:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/user/schedule-for-admin
 * User books one of MD's available free slots
 */
router.post('/schedule-for-admin', (req, res) => {
  try {
    const {
      slotId,
      meetingWith,
      clientEmail,
      clientPhone,
      purpose,
      notes = ''
    } = req.body;

    if (!slotId) {
      return res.status(400).json({ success: false, message: 'Please select one of MD’s available free slots to book.' });
    }

    if (!meetingWith || !meetingWith.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide the Person / Client name meeting with MD.' });
    }

    const slot = db.prepare(`
      SELECT s.*, sc.title as schedule_title, sc.location, sc.meeting_link
      FROM admin_slots s
      LEFT JOIN admin_schedules sc ON sc.id = s.schedule_id
      WHERE s.id = ?
    `).get(slotId);

    if (!slot) {
      return res.status(404).json({ success: false, message: 'The selected slot was not found.' });
    }

    if (slot.status !== 'AVAILABLE') {
      return res.status(409).json({ success: false, message: 'This slot has already been booked.' });
    }

    const now = new Date().toISOString();
    const displayTime = slot.display_time || `${to12Hour(slot.start_time)} – ${to12Hour(slot.end_time)}`;

    const isSalesLead = req.body.bookingTarget === 'SALES_LEAD' || req.body.target === 'SALES_LEAD';
    const targetHost = isSalesLead ? 'SALES_LEAD' : 'MD';
    const salesUserId = isSalesLead ? (req.body.salesUserId || 'lead') : '';
    const effectiveLocation = isSalesLead
      ? (slot.meeting_link ? 'Google Meet (Online)' : 'Sales Team Desk')
      : (slot.location || 'Gentize Office (In-Person)');

    const insertStmt = db.prepare(`
      INSERT INTO admin_bookings (
        slot_id, event_id, date, start_time, end_time, display_time,
        client_name, client_email, client_phone, purpose, location,
        meeting_link, status, booking_source, notes,
        booking_target, sales_user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'USER', ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      slot.id,
      slot.schedule_id || null,
      slot.date,
      slot.start_time,
      slot.end_time,
      displayTime,
      meetingWith.trim(),
      clientEmail?.trim() || '',
      clientPhone?.trim() || '',
      purpose?.trim() || (isSalesLead ? 'Sales Discussion with Lead' : 'Strategic Discussion with MD'),
      effectiveLocation,
      slot.meeting_link || '',
      notes.trim(),
      targetHost,
      salesUserId,
      now,
      now
    );

    const bookingId = result.lastInsertRowid;

    // Update slot status
    db.prepare("UPDATE admin_slots SET status = 'BOOKED', booking_id = ? WHERE id = ?").run(bookingId, slot.id);

    // Auto-sync into sales_meetings if booked with Sales Team Lead
    if (isSalesLead) {
      try {
        db.prepare(`
          INSERT INTO sales_meetings (
            meeting_title, client_name, client_company, client_email, client_phone,
            sales_user_id, sales_rep_name, meeting_date, start_time, end_time,
            meeting_type, meeting_link, purpose, discussion_notes,
            deal_stage, deal_value, action_items, admin_notes, client_description, lead_summary, booking_id,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `Staff Booking: ${meetingWith.trim()}`,
          meetingWith.trim(),
          clientEmail ? clientEmail.split('@')[1] || 'Staff Client' : 'Staff Client',
          clientEmail?.trim() || '',
          clientPhone?.trim() || '',
          salesUserId || 'lead',
          'GENTIZE LEAD',
          slot.date,
          slot.start_time,
          slot.end_time,
          effectiveLocation?.includes('Online') || slot.meeting_link ? 'Online' : 'In-Person',
          slot.meeting_link || 'https://meet.google.com/new',
          purpose?.trim() || 'Sales Discussion',
          notes.trim() || purpose?.trim() || 'Sales Discussion',
          'Scheduled',
          0,
          '',
          '',
          notes.trim() || purpose?.trim() || 'Sales Discussion',
          '',
          bookingId,
          now,
          now
        );
      } catch (smErr) {
        console.error('Error auto-syncing to sales_meetings from user route:', smErr);
      }
    }

    // Trigger in-app notifications
    try {
      const recipientTarget = isSalesLead ? 'Sales Team Lead' : 'MD Executive Office';
      const notifTitle = isSalesLead ? 'New Staff Booking for Sales Team Lead' : 'New User Appointment Booking Request';

      db.prepare(`
        INSERT INTO notifications (
          booking_id, type, title, message, is_read, recipient,
          client_name, booking_date, display_time, booking_status, location,
          status, delivered_at, created_at, updated_at, booking_source
        ) VALUES (?, 'PUSH', ?, ?, 0, ?, ?, ?, ?, 'PENDING', ?, 'DELIVERED', ?, ?, ?, 'USER')
      `).run(
        bookingId,
        notifTitle,
        `User / Staff booked appointment for ${meetingWith.trim()} with ${isSalesLead ? 'Sales Team Lead (GENTIZE LEAD)' : 'MD'} on ${slot.date} at ${displayTime}.`,
        recipientTarget,
        meetingWith.trim(),
        slot.date,
        displayTime,
        effectiveLocation,
        now,
        now,
        now
      );

      // Notification for User / Staff
      db.prepare(`
        INSERT INTO notifications (
          booking_id, type, title, message, is_read, recipient,
          client_name, booking_date, display_time, booking_status, location,
          status, delivered_at, created_at, updated_at, booking_source
        ) VALUES (?, 'PUSH', 'Appointment Dispatched to Host', ?, 0, 'User / Staff', ?, ?, ?, 'PENDING', ?, 'DELIVERED', ?, ?, ?, 'USER')
      `).run(
        bookingId,
        `Your meeting request for ${meetingWith.trim()} on ${slot.date} at ${displayTime} has been submitted to MD for confirmation.`,
        meetingWith.trim(),
        slot.date,
        displayTime,
        slot.location || 'Gentize Office (In-Person)',
        now,
        now,
        now
      );

      // 2. Email confirmation record (pending MD approval)
      db.prepare(`
        INSERT INTO notifications (
          booking_id, type, title, message, is_read, recipient,
          client_name, booking_date, display_time, booking_status, location,
          status, delivered_at, created_at, updated_at, booking_source
        ) VALUES (?, 'EMAIL', 'Executive Meeting Request Submitted', ?, 0, ?, ?, ?, ?, 'PENDING', ?, 'DELIVERED', ?, ?, ?, 'USER')
      `).run(
        bookingId,
        `Meeting request submitted on ${slot.date} at ${displayTime} with ${meetingWith.trim()} (${clientEmail?.trim() || clientPhone?.trim() || 'Attendee'}). Awaiting MD confirmation.`,
        clientEmail?.trim() || clientPhone?.trim() || 'MD Office',
        meetingWith.trim(),
        slot.date,
        displayTime,
        slot.location || 'Gentize Office (In-Person)',
        now,
        now,
        now
      );

      // 3. SMS record if phone provided
      if (clientPhone && clientPhone.trim()) {
        db.prepare(`
          INSERT INTO notifications (
            booking_id, type, title, message, is_read, recipient,
            client_name, booking_date, display_time, booking_status, location,
            status, delivered_at, created_at, updated_at, booking_source
          ) VALUES (?, 'SMS', 'SMS Appointment Alert', ?, 0, ?, ?, ?, ?, 'PENDING', ?, 'DELIVERED', ?, ?, ?, 'USER')
        `).run(
          bookingId,
          `SMS booking alert dispatched to ${clientPhone.trim()} for ${slot.date} at ${displayTime}.`,
          clientPhone.trim(),
          meetingWith.trim(),
          slot.date,
          displayTime,
          slot.location || 'Gentize Office (In-Person)',
          now,
          now,
          now
        );
      }
    } catch (notifErr) {
      console.error('Error inserting admin notification in user booking:', notifErr);
    }

    res.status(201).json({
      success: true,
      message: `Meeting on ${slot.date} at ${displayTime} successfully booked on MD Calendar!`,
      booking: {
        id: bookingId,
        date: slot.date,
        display_time: displayTime,
        client_name: meetingWith.trim(),
      },
    });
  } catch (err) {
    console.error('Error in schedule-for-admin:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/user/schedules
 */
router.get('/schedules', (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;

    const curHour = String(now.getHours()).padStart(2, '0');
    const curMin = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${curHour}:${curMin}`;

    const schedules = db.prepare("SELECT * FROM admin_schedules WHERE status = 'ACTIVE' AND date >= ? ORDER BY date ASC, start_time ASC")
      .all(today)
      .filter(s => {
        // If it's today, check if the schedule end_time has already elapsed
        if (s.date === today && s.end_time && s.end_time <= currentTime) {
          return false;
        }
        return true;
      })
      .map(s => {
        const availCount = db.prepare("SELECT COUNT(*) as count FROM admin_slots WHERE schedule_id = ? AND status = 'AVAILABLE'").get(s.id).count;
        return {
          ...s,
          available_slots: availCount,
          displayStart: to12Hour(s.start_time),
          displayEnd: to12Hour(s.end_time),
        };
      })
      .filter(s => {
        // If schedule is today and has 0 available slots remaining because time passed, do not show
        if (s.date === today && s.available_slots === 0) {
          return false;
        }
        return true;
      });

    res.json({ success: true, schedules });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/user/schedules/:id
 */
router.get('/schedules/:id', (req, res) => {
  try {
    const schedule = db.prepare("SELECT * FROM admin_schedules WHERE id = ?").get(req.params.id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }
    const slots = db.prepare("SELECT * FROM admin_slots WHERE schedule_id = ? ORDER BY start_time ASC").all(schedule.id).map(s => ({
      ...s,
      displayTime: s.display_time || `${to12Hour(s.start_time)} - ${to12Hour(s.end_time)}`,
    }));
    res.json({ success: true, schedule: { ...schedule, slots } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/user/master-bookings
 */
router.get('/master-bookings', (req, res) => {
  try {
    const masterBookings = db.prepare(
      "SELECT * FROM admin_bookings WHERE status != 'CANCELLED' ORDER BY date ASC, start_time ASC"
    ).all().map(b => {
      const isClient = b.booking_source === 'CLIENT';
      const isMine = b.booking_source === 'USER';
      return {
        ...b,
        isClientBooking: isClient,
        canModify: isMine,
        bookedByType: b.booking_source || 'CLIENT',
        sourceLabel: isClient ? 'Client Appointment (View Only)' : (isMine ? 'My Booking' : 'MD / Admin Booked'),
      };
    });

    res.json({ success: true, bookings: masterBookings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/user/bookings/:id/reschedule
 */
router.put('/bookings/:id/reschedule', (req, res) => {
  try {
    const { newSlotId } = req.body;
    const booking = db.prepare("SELECT * FROM admin_bookings WHERE id = ?").get(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if (booking.booking_source === 'CLIENT') {
      return res.status(403).json({ success: false, message: 'Client appointments can only be rescheduled by Admin.' });
    }

    const newSlot = db.prepare("SELECT * FROM admin_slots WHERE id = ?").get(newSlotId);
    if (!newSlot || newSlot.status !== 'AVAILABLE') {
      return res.status(409).json({ success: false, message: 'Target slot is no longer available.' });
    }

    // Release old slot
    if (booking.slot_id) {
      db.prepare("UPDATE admin_slots SET status = 'AVAILABLE', booking_id = NULL WHERE id = ?").run(booking.slot_id);
    }

    // Book new slot
    db.prepare("UPDATE admin_slots SET status = 'BOOKED', booking_id = ? WHERE id = ?").run(booking.id, newSlot.id);

    // Update booking
    const displayTime = newSlot.display_time || `${to12Hour(newSlot.start_time)} – ${to12Hour(newSlot.end_time)}`;
    db.prepare(`
      UPDATE admin_bookings
      SET slot_id = ?, date = ?, start_time = ?, end_time = ?, display_time = ?, updated_at = ?
      WHERE id = ?
    `).run(newSlot.id, newSlot.date, newSlot.start_time, newSlot.end_time, displayTime, new Date().toISOString(), booking.id);

    try {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO notifications (
          booking_id, type, title, message, is_read, recipient,
          client_name, booking_date, display_time, booking_status, location,
          status, delivered_at, created_at, updated_at
        ) VALUES (?, 'PUSH', 'Appointment Rescheduled by Assistant', ?, 0, 'MD Executive Office', ?, ?, ?, 'RESCHEDULED', ?, 'DELIVERED', ?, ?, ?)
      `).run(
        booking.id,
        `Meeting with ${booking.client_name || 'Client'} rescheduled to ${newSlot.date} at ${displayTime}.`,
        booking.client_name || '',
        newSlot.date,
        displayTime,
        booking.location || 'Gentize Office',
        now,
        now,
        now
      );
    } catch (_) {}

    res.json({ success: true, message: `Rescheduled to ${newSlot.date} • ${displayTime}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/user/bookings/:id
 */
router.delete('/bookings/:id', (req, res) => {
  try {
    const booking = db.prepare("SELECT * FROM admin_bookings WHERE id = ?").get(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if (booking.booking_source === 'CLIENT') {
      return res.status(403).json({ success: false, message: 'Client appointments can only be cancelled by Admin.' });
    }

    // Release slot
    if (booking.slot_id) {
      db.prepare("UPDATE admin_slots SET status = 'AVAILABLE', booking_id = NULL WHERE id = ?").run(booking.slot_id);
    }

    // Mark cancelled
    const now = new Date().toISOString();
    db.prepare("UPDATE admin_bookings SET status = 'CANCELLED', updated_at = ? WHERE id = ?").run(
      now,
      booking.id
    );

    try {
      db.prepare(`
        INSERT INTO notifications (
          booking_id, type, title, message, is_read, recipient,
          client_name, booking_date, display_time, booking_status, location,
          status, delivered_at, created_at, updated_at
        ) VALUES (?, 'PUSH', 'Appointment Cancelled by Assistant', ?, 0, 'MD Executive Office', ?, ?, ?, 'CANCELLED', ?, 'DELIVERED', ?, ?, ?)
      `).run(
        booking.id,
        `Meeting with ${booking.client_name || 'Client'} on ${booking.date} at ${booking.display_time || ''} was cancelled. Slot released.`,
        booking.client_name || '',
        booking.date || '',
        booking.display_time || '',
        booking.location || 'Gentize Office',
        now,
        now,
        now
      );
    } catch (_) {}

    res.json({ success: true, message: 'Booking cancelled successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/user/history/clear-all
 * Clears past completed/elapsed bookings for user
 */
const clearUserHistoryHandler = (req, res) => {
  try {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const curTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const bookings = db.prepare("SELECT id, date, start_time, end_time, status, booking_source FROM admin_bookings WHERE booking_source = 'USER'").all();
    const pastIds = bookings.filter(b => {
      if (b.status === 'COMPLETED') return true;
      if (b.date < todayStr) return true;
      if (b.date === todayStr) {
        const checkTime = b.end_time || b.start_time;
        if (checkTime && checkTime <= curTime) return true;
      }
      return false;
    }).map(b => b.id);

    if (pastIds.length > 0) {
      const placeholders = pastIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM admin_bookings WHERE id IN (${placeholders})`).run(...pastIds);
    }

    res.json({
      success: true,
      message: `Cleared ${pastIds.length} past user bookings from history.`,
      clearedCount: pastIds.length,
    });
  } catch (err) {
    console.error('Error clearing user history:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

router.delete('/history/clear-all', clearUserHistoryHandler);
router.post('/history/clear-all', clearUserHistoryHandler);

/**
 * GET /api/user/profile
 */
router.get('/profile', (req, res) => {
  // Staff login accepts every admin_users role, so an explicit profile ID must too.
  const user = req.query.id ? db.prepare("SELECT id, name, email, phone, role, avatar FROM admin_users WHERE id = ?").get(req.query.id) : db.prepare("SELECT id, name, email, phone, role, avatar FROM admin_users WHERE role != 'ADMIN' ORDER BY id LIMIT 1").get() || {
    id: 4,
    name: 'Sudhin',
    email: 'sudhinns333@gmail.com',
    phone: '+91 98765 43210',
    role: 'Executive Assistant',
  };
  if (!user) return res.status(404).json({ success: false, error: 'User not found. Please sign in again.' });
  res.json({ success: true, user });
});

router.put('/profile', (req, res) => {
  try {
    const { id, name, email, phone, avatar } = req.body;
    try { validateAvatar(avatar); } catch (err) { return res.status(400).json({error: err.message}); }
    const user = db.prepare("SELECT id FROM admin_users WHERE id = ?").get(id);
    if (!user) return res.status(404).json({error: 'User not found.'});
    if (!name?.trim() || !email?.includes('@')) return res.status(400).json({error: 'Name and valid email are required.'});
    db.prepare('UPDATE admin_users SET name = ?, email = ?, phone = ?, avatar = COALESCE(?, avatar) WHERE id = ?').run(name.trim(), email.trim(), phone || '', avatar ?? null, user.id);
    res.json({success: true, user: db.prepare('SELECT id, name, email, phone, role, avatar FROM admin_users WHERE id = ?').get(user.id)});
  } catch (err) { res.status(500).json({error: 'Unable to save profile.'}); }
});

export default router;
