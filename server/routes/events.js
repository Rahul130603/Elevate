import { Router } from 'express';
import db, { formatEvent } from '../db.js';
import { notificationService } from '../services/notificationService.js';

const router = Router();

// Validation helpers
function isValidDate(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
  const d = new Date(dateString);
  return !isNaN(d.getTime());
}

function isValidEmail(email) {
  if (!email || email.trim() === '') return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidUrl(url) {
  if (!url || typeof url !== 'string' || url.trim() === '') return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidGoogleMeetUrl(url) {
  if (!isValidUrl(url)) return false;
  return url.includes('meet.google.com') || url.includes('http');
}

function isValidGoogleMapsUrl(url) {
  if (!isValidUrl(url)) return false;
  return url.includes('google.com/maps') || url.includes('maps.google.com') || url.includes('goo.gl') || url.includes('http');
}

function validateEventPayload(body, isUpdate = false) {
  const errors = {};

  // Title
  if (!isUpdate || body.title !== undefined) {
    if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
      errors.title = 'Event name is required';
    }
  }

  // Event Organizer Name
  if (!isUpdate || body.organizerName !== undefined) {
    if (!body.organizerName || typeof body.organizerName !== 'string' || body.organizerName.trim() === '') {
      errors.organizerName = 'Event organizer name is required.';
    }
  }

  // Event Type
  const eventType = body.eventType || 'Online';
  if (!isUpdate || body.eventType !== undefined) {
    if (eventType !== 'Online' && eventType !== 'Offline') {
      errors.eventType = 'Event type must be either Online or Offline';
    }
  }

  // Start Date and End Date
  const startDate = body.startDate;
  const endDate = body.endDate;

  if (!isUpdate || startDate !== undefined) {
    if (!startDate || !isValidDate(startDate)) {
      errors.startDate = 'A valid start date is required (YYYY-MM-DD)';
    }
  }

  if (!isUpdate || endDate !== undefined) {
    if (!endDate || !isValidDate(endDate)) {
      errors.endDate = 'A valid end date is required (YYYY-MM-DD)';
    }
  }

  if (startDate && endDate) {
    if (endDate < startDate) {
      errors.endDate = 'End date cannot be before start date.';
    }
  }

  // Start Time and End Time
  const startTime = body.startTime;
  const endTime = body.endTime;

  if (!isUpdate || (startTime !== undefined && endTime !== undefined)) {
    if (!startTime) {
      errors.startTime = 'Start time is required';
    }
    if (!endTime) {
      errors.endTime = 'End time is required';
    }

    if (startDate && endDate && startTime && endTime) {
      if (startDate === endDate) {
        if (endTime <= startTime) {
          errors.endTime = 'End time must be later than start time.';
        }
      } else if (endDate > startDate) {
        const startFull = `${startDate}T${startTime}`;
        const endFull = `${endDate}T${endTime}`;
        if (endFull <= startFull) {
          errors.endTime = 'End date and time must be later than start date and time.';
        }
      }
    }
  }

  // Conditional validations for Online vs Offline
  if (eventType === 'Online') {
    if (!body.meetingLink || body.meetingLink.trim() === '') {
      errors.meetingLink = 'Google Meet link is required for online events.';
    } else if (!isValidGoogleMeetUrl(body.meetingLink.trim())) {
      errors.meetingLink = 'Please enter a valid Google Meet link.';
    }
  } else if (eventType === 'Offline') {
    if (!body.address || body.address.trim() === '') {
      errors.address = 'Address is required for offline events.';
    }
    if (body.googleMapsLink && body.googleMapsLink.trim() !== '') {
      if (!isValidGoogleMapsUrl(body.googleMapsLink.trim())) {
        errors.googleMapsLink = 'Please enter a valid Google Maps link.';
      }
    }
  }

  // Email format check
  if (body.email && !isValidEmail(body.email)) {
    errors.email = 'Please enter a valid email address.';
  }

  return errors;
}

// Find overlapping events across date and time
function findOverlaps(startDate, endDate, startTime, endTime, excludeId = null) {
  let query = `
    SELECT * FROM events 
    WHERE (start_date <= ? AND end_date >= ?)
      AND (start_time < ? AND end_time > ?)
  `;
  const params = [endDate, startDate, endTime, startTime];

  if (excludeId) {
    query += ' AND id != ?';
    params.push(excludeId);
  }

  const rows = db.prepare(query).all(...params);
  return rows.map(formatEvent);
}

// GET /api/events/check-overlap
router.get('/check-overlap', (req, res) => {
  const { startDate, endDate, startTime, endTime, excludeId } = req.query;
  const sDate = startDate || req.query.date;
  const eDate = endDate || sDate;

  if (!sDate || !startTime || !endTime) {
    return res.status(400).json({ error: 'startDate, startTime, and endTime are required' });
  }

  const overlaps = findOverlaps(sDate, eDate, startTime, endTime, excludeId ? Number(excludeId) : null);
  res.json({ hasOverlap: overlaps.length > 0, overlappingEvents: overlaps });
});

// GET /api/events
router.get('/', (req, res) => {
  try {
    const { date, month, search, eventType, status } = req.query;
    let sql = 'SELECT * FROM events WHERE 1=1';
    const params = [];

    // Filter by specific date
    if (date) {
      sql += ' AND (start_date <= ? AND end_date >= ?)';
      params.push(date, date);
    } else if (month) {
      const [yearStr, monthStr] = month.split('-');
      const y = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10);
      const lastDay = new Date(y, m, 0).getDate();
      const monthStart = `${month}-01`;
      const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`;
      sql += ' AND (start_date <= ? AND end_date >= ?)';
      params.push(monthEnd, monthStart);
    }

    if (eventType && eventType !== 'all' && eventType !== 'All') {
      sql += ' AND event_type = ?';
      params.push(eventType);
    }

    if (status && status !== 'all' && status !== 'All') {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      sql += ` AND (
        title LIKE ? OR 
        organizer_name LIKE ? OR
        description LIKE ? OR 
        email LIKE ? OR 
        phone LIKE ? OR 
        address LIKE ? OR
        meeting_link LIKE ?
      )`;
      params.push(term, term, term, term, term, term, term);
    }

    sql += ' ORDER BY start_date ASC, start_time ASC';

    const rows = db.prepare(sql).all(...params);
    res.json(rows.map(formatEvent));
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: 'Unable to load events. Please try again.' });
  }
});

// GET /api/events/:id
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(formatEvent(row));
  } catch (err) {
    console.error('Error fetching event by ID:', err);
    res.status(500).json({ error: 'Failed to retrieve event' });
  }
});

// POST /api/events
router.post('/', (req, res) => {
  try {
    const errors = validateEventPayload(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    const {
      title,
      organizerName,
      startDate,
      endDate,
      startTime,
      endTime,
      description = '',
      phone = '',
      email = '',
      eventType = 'Online',
      meetingLink = '',
      address = '',
      googleMapsLink = '',
      status = 'upcoming',
    } = req.body;

    const isOnline = eventType === 'Online';
    const nowIso = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO events (
        title, organizer_name, start_date, end_date, start_time, end_time, description,
        phone, email, event_type, address, google_maps_link, meeting_link,
        status, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?
      )
    `);

    const result = stmt.run(
      title.trim(),
      organizerName ? organizerName.trim() : '',
      startDate,
      endDate,
      startTime,
      endTime,
      description ? description.trim() : '',
      phone ? phone.trim() : '',
      email ? email.trim() : '',
      eventType,
      isOnline ? '' : (address ? address.trim() : ''),
      isOnline ? '' : (googleMapsLink ? googleMapsLink.trim() : ''),
      isOnline ? (meetingLink ? meetingLink.trim() : '') : '',
      status,
      nowIso,
      nowIso
    );

    const created = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);
    const createdEvent = formatEvent(created);
    notificationService.onEventCreated(createdEvent);
    res.status(201).json(createdEvent);
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: 'Unable to create event. Please try again.' });
  }
});

// PUT /api/events/:id
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const errors = validateEventPayload(req.body, false);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    const {
      title,
      organizerName,
      startDate,
      endDate,
      startTime,
      endTime,
      description = '',
      phone = '',
      email = '',
      eventType = 'Online',
      meetingLink = '',
      address = '',
      googleMapsLink = '',
      status = 'upcoming',
    } = req.body;

    const isOnline = eventType === 'Online';
    const nowIso = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE events SET
        title = ?,
        organizer_name = ?,
        start_date = ?,
        end_date = ?,
        start_time = ?,
        end_time = ?,
        description = ?,
        phone = ?,
        email = ?,
        event_type = ?,
        address = ?,
        google_maps_link = ?,
        meeting_link = ?,
        status = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      title.trim(),
      organizerName !== undefined ? organizerName.trim() : (existing.organizer_name || ''),
      startDate,
      endDate,
      startTime,
      endTime,
      description ? description.trim() : '',
      phone ? phone.trim() : '',
      email ? email.trim() : '',
      eventType,
      isOnline ? '' : (address ? address.trim() : ''),
      isOnline ? '' : (googleMapsLink ? googleMapsLink.trim() : ''),
      isOnline ? (meetingLink ? meetingLink.trim() : '') : '',
      status,
      nowIso,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    const updatedEvent = formatEvent(updated);
    notificationService.onEventUpdated(updatedEvent);
    res.json(updatedEvent);
  } catch (err) {
    console.error('Error updating event:', err);
    res.status(500).json({ error: 'Unable to update event. Please try again.' });
  }
});

// DELETE /api/events/:id
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const formattedExisting = formatEvent(existing);
    db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
    notificationService.onEventDeleted(formattedExisting);
    res.json({ success: true, message: 'Event deleted successfully', id: Number(req.params.id) });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({ error: 'Unable to delete event. Please try again.' });
  }
});

export default router;
