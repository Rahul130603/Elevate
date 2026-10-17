import { Router } from 'express';
import db, { to12Hour } from '../db.js';

const router = Router();

// GET /api/bookings/:id
router.get('/:id', (req, res) => {
  try {
    const booking = db.prepare('SELECT * FROM admin_bookings WHERE id = ?').get(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    res.json({
      booking: {
        id: booking.id,
        slot_id: booking.slot_id,
        event_id: booking.event_id,
        date: booking.date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        display_time: booking.display_time,
        client_name: booking.client_name,
        user_name: booking.client_name,
        client_email: booking.client_email,
        user_email: booking.client_email,
        client_phone: booking.client_phone,
        user_phone: booking.client_phone,
        company_name: booking.company_name,
        purpose: booking.purpose,
        meeting_purpose: booking.purpose,
        location: booking.location,
        status: booking.status,
        booking_source: booking.booking_source,
        meeting_link: booking.meeting_link,
        notes: booking.notes,
        cancellation_reason: booking.cancellation_reason,
        created_at: booking.created_at,
        updated_at: booking.updated_at,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch booking', message: err.message });
  }
});

// PUT & POST /api/bookings/:id/reschedule
const handleReschedule = (req, res) => {
  try {
    const bookingId = req.params.id;
    const { newSlotId, newDate, newStartTime, newEndTime } = req.body;
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
};

router.put('/:id/reschedule', handleReschedule);
router.post('/:id/reschedule', handleReschedule);

export default router;
