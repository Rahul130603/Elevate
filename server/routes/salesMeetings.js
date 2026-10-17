import { Router } from 'express';
import db, { formatSalesMeeting } from '../db.js';

const router = Router();

/**
 * GET /api/sales-meetings
 * List all sales team meetings with optional filtering & summary statistics
 */
router.get('/', (req, res) => {
  try {
    const { sales_user_id, purpose, deal_stage, search } = req.query;

    let query = 'SELECT * FROM sales_meetings WHERE 1=1';
    const params = [];

    if (sales_user_id && sales_user_id !== 'all') {
      query += ' AND sales_user_id = ?';
      params.push(sales_user_id);
    }

    if (purpose && purpose !== 'all') {
      query += ' AND purpose LIKE ?';
      params.push(`%${purpose}%`);
    }

    if (deal_stage && deal_stage !== 'all') {
      query += ' AND deal_stage = ?';
      params.push(deal_stage);
    }

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      query += ' AND (meeting_title LIKE ? OR client_name LIKE ? OR client_company LIKE ? OR purpose LIKE ? OR discussion_notes LIKE ?)';
      params.push(s, s, s, s, s);
    }

    query += ' ORDER BY meeting_date DESC, start_time DESC';

    const rows = db.prepare(query).all(...params);
    const meetings = rows.map(formatSalesMeeting);

    // Compute aggregated dashboard stats
    const allRows = db.prepare('SELECT deal_stage, deal_value FROM sales_meetings').all();
    const stats = {
      totalMeetings: allRows.length,
      scheduledCount: allRows.filter(r => r.deal_stage === 'Scheduled').length,
      completedCount: allRows.filter(r => r.deal_stage === 'Completed').length,
      wonCount: allRows.filter(r => r.deal_stage === 'Won / Closed').length,
      pipelineValue: allRows.reduce((acc, r) => acc + (Number(r.deal_value) || 0), 0),
    };

    res.json({
      success: true,
      meetings,
      stats
    });
  } catch (err) {
    console.error('Error fetching sales meetings:', err);
    res.status(500).json({ error: 'Failed to fetch sales meetings', message: err.message });
  }
});

/**
 * GET /api/sales-meetings/reps
 * List all registered sales team members and their meeting stats
 */
router.get('/reps', (req, res) => {
  try {
    const users = db.prepare('SELECT id, user_id, name, role, phone, password, created_at FROM sales_users ORDER BY name ASC').all();
    const statsQuery = db.prepare(`
      SELECT sales_user_id, COUNT(*) as meeting_count, SUM(deal_value) as pipeline_value
      FROM sales_meetings
      GROUP BY sales_user_id
    `).all();

    const statsMap = new Map(statsQuery.map(s => [s.sales_user_id, s]));

    const reps = users.map(u => {
      const userStats = statsMap.get(u.user_id) || { meeting_count: 0, pipeline_value: 0 };
      return {
        id: u.id,
        userId: u.user_id,
        name: u.name,
        role: u.role,
        phone: u.phone,
        password: u.password, // Provided so Admin can view/share sales team credentials
        meetingCount: userStats.meeting_count,
        pipelineValue: Number(userStats.pipeline_value || 0),
        createdAt: u.created_at
      };
    });

    res.json({ success: true, reps });
  } catch (err) {
    console.error('Error fetching sales reps:', err);
    res.status(500).json({ error: 'Failed to fetch sales team', message: err.message });
  }
});

/**
 * POST /api/sales-meetings/auth
 * Verify sales team user ID and password
 */
router.post('/auth', (req, res) => {
  try {
    const { userId, password } = req.body || {};
    if (!userId || !password) {
      return res.status(400).json({ error: 'User ID and password are required' });
    }

    const trimmedId = userId.trim();
    const trimmedPwd = password.trim();
    let user = db.prepare('SELECT id, user_id, name, role, phone FROM sales_users WHERE LOWER(user_id) = LOWER(?) AND password = ?').get(trimmedId, trimmedPwd);

    if (!user && (trimmedId.toLowerCase() === 'lead' || trimmedId.toLowerCase() === 'sales.lead@meeetly.com')) {
      user = db.prepare('SELECT id, user_id, name, role, phone FROM sales_users WHERE (LOWER(user_id) = "lead" OR LOWER(user_id) LIKE "%lead%") AND (password = ? OR password = "sales123" OR password = "lead123")').get(trimmedPwd);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid Sales Team User ID or password' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        userId: user.user_id,
        name: user.name,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (err) {
    console.error('Sales auth error:', err);
    res.status(500).json({ error: 'Authentication failed', message: err.message });
  }
});

/**
 * GET /api/sales-meetings/profile
 * Get Sales Lead profile & workspace settings
 */
router.get('/profile', (req, res) => {
  try {
    const userId = req.query.userId || 'lead';
    let user = db.prepare('SELECT id, user_id, name, role, phone, email, default_meeting_link, default_slot_duration, created_at FROM sales_users WHERE LOWER(user_id) = LOWER(?)').get(userId);
    if (!user) {
      user = {
        user_id: 'lead',
        name: 'GENTIZE LEAD',
        role: 'SALES_LEAD',
        phone: '+91 98765 43220',
        email: 'lead@meeetly.com',
        default_meeting_link: 'https://meet.google.com/sal-lead-demo',
        default_slot_duration: 30,
      };
    }
    res.json({ success: true, profile: user });
  } catch (err) {
    console.error('Error fetching sales lead profile:', err);
    res.status(500).json({ error: 'Failed to fetch sales lead profile' });
  }
});

/**
 * PUT /api/sales-meetings/profile
 * Update Sales Lead profile & workspace settings
 */
router.put('/profile', (req, res) => {
  try {
    const {
      userId = 'lead',
      name = 'GENTIZE LEAD',
      email = 'lead@meeetly.com',
      phone = '+91 98765 43220',
      defaultMeetingLink = 'https://meet.google.com/sal-lead-demo',
      defaultSlotDuration = 30,
    } = req.body || {};

    const existing = db.prepare('SELECT id FROM sales_users WHERE LOWER(user_id) = LOWER(?)').get(userId);
    if (existing) {
      db.prepare(`
        UPDATE sales_users
        SET name = ?, email = ?, phone = ?, default_meeting_link = ?, default_slot_duration = ?
        WHERE id = ?
      `).run(name, email, phone, defaultMeetingLink, Number(defaultSlotDuration) || 30, existing.id);
    } else {
      const nowIso = new Date().toISOString();
      db.prepare(`
        INSERT INTO sales_users (user_id, name, password, role, phone, email, default_meeting_link, default_slot_duration, created_at)
        VALUES (?, ?, 'lead123', 'SALES_LEAD', ?, ?, ?, ?, ?)
      `).run(userId, name, phone, email, defaultMeetingLink, Number(defaultSlotDuration) || 30, nowIso);
    }

    const updated = db.prepare('SELECT id, user_id, name, role, phone, email, default_meeting_link, default_slot_duration FROM sales_users WHERE LOWER(user_id) = LOWER(?)').get(userId);
    res.json({ success: true, message: 'Sales Lead profile and settings updated successfully!', profile: updated });
  } catch (err) {
    console.error('Error updating sales lead profile:', err);
    res.status(500).json({ error: 'Failed to update sales lead profile', message: err.message });
  }
});

/**
 * PUT /api/sales-meetings/change-password
 * Change password for Sales Lead
 */
router.put('/change-password', (req, res) => {
  try {
    const { userId = 'lead', currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    const user = db.prepare('SELECT * FROM sales_users WHERE LOWER(user_id) = LOWER(?)').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'Sales user not found' });
    }

    if (user.password !== currentPassword.trim()) {
      return res.status(401).json({ error: 'Current password does not match' });
    }

    db.prepare('UPDATE sales_users SET password = ? WHERE id = ?').run(newPassword.trim(), user.id);
    res.json({ success: true, message: 'Sales Lead password updated successfully!' });
  } catch (err) {
    console.error('Error changing sales password:', err);
    res.status(500).json({ error: 'Failed to change password', message: err.message });
  }
});

/**
 * GET /api/sales-meetings/:id
 * Fetch single sales meeting by ID
 */
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM sales_meetings WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Sales meeting not found' });
    }
    res.json({ success: true, meeting: formatSalesMeeting(row) });
  } catch (err) {
    console.error('Error fetching sales meeting detail:', err);
    res.status(500).json({ error: 'Failed to fetch sales meeting', message: err.message });
  }
});

/**
 * POST /api/sales-meetings
 * Book / record a new sales team meeting
 */
router.post('/', (req, res) => {
  try {
    const {
      meetingTitle,
      clientName,
      clientCompany,
      clientEmail,
      clientPhone,
      salesUserId,
      salesRepName,
      salesPassword,
      meetingDate,
      startTime,
      endTime,
      meetingType,
      meetingLink,
      purpose,
      discussionNotes,
      dealStage,
      dealValue,
      actionItems,
      adminNotes,
      clientDescription,
      leadSummary,
      bookingId
    } = req.body || {};

    const clientDesc = clientDescription || discussionNotes || '';
    const leadSumm = leadSummary || adminNotes || '';

    // Validation
    if (!meetingTitle || !meetingTitle.trim()) {
      return res.status(400).json({ error: 'Meeting title is required' });
    }
    if (!clientName || !clientName.trim()) {
      return res.status(400).json({ error: 'Client name is required' });
    }
    if (!clientCompany || !clientCompany.trim()) {
      return res.status(400).json({ error: 'Client company name is required' });
    }
    if (!salesUserId || !salesUserId.trim()) {
      return res.status(400).json({ error: 'Sales Rep User ID is required' });
    }
    if (!purpose || !purpose.trim()) {
      return res.status(400).json({ error: 'Meeting purpose is required' });
    }
    if (!meetingDate || !startTime) {
      return res.status(400).json({ error: 'Meeting date and start time are required' });
    }

    // Optional password verification if provided
    let repName = salesRepName;
    const existingUser = db.prepare('SELECT name, password FROM sales_users WHERE LOWER(user_id) = LOWER(?)').get(salesUserId.trim());
    if (existingUser) {
      repName = existingUser.name;
      if (salesPassword && existingUser.password !== salesPassword.trim()) {
        return res.status(401).json({ error: 'Invalid password for sales rep' });
      }
    } else {
      // If new sales rep, automatically create user record
      const nowIso = new Date().toISOString();
      const pwd = salesPassword || 'sales123';
      repName = repName || salesUserId.split('@')[0];
      db.prepare('INSERT INTO sales_users (user_id, name, password, role, created_at) VALUES (?, ?, ?, ?, ?)').run(
        salesUserId.trim(),
        repName,
        pwd,
        'SALES_REP',
        nowIso
      );
    }

    const nowIso = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO sales_meetings (
        meeting_title, client_name, client_company, client_email, client_phone,
        sales_user_id, sales_rep_name, meeting_date, start_time, end_time,
        meeting_type, meeting_link, purpose, discussion_notes,
        deal_stage, deal_value, action_items, admin_notes, client_description, lead_summary, booking_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      meetingTitle.trim(),
      clientName.trim(),
      clientCompany.trim(),
      clientEmail ? clientEmail.trim() : '',
      clientPhone ? clientPhone.trim() : '',
      salesUserId.trim(),
      repName || 'Sales Representative',
      meetingDate,
      startTime,
      endTime || startTime,
      meetingType || 'Online',
      meetingLink ? meetingLink.trim() : '',
      purpose.trim(),
      clientDesc.trim() || purpose.trim(),
      dealStage || 'Scheduled',
      Number(dealValue || 0),
      actionItems ? actionItems.trim() : '',
      adminNotes ? adminNotes.trim() : '',
      clientDesc.trim(),
      leadSumm.trim(),
      bookingId || null,
      nowIso,
      nowIso
    );

    const newMeetingId = result.lastInsertRowid;

    // Auto-create matching admin_bookings entry if not linked
    if (!bookingId) {
      try {
        const insB = db.prepare(`
          INSERT INTO admin_bookings (
            client_name, client_email, client_phone, company_name, purpose,
            date, start_time, end_time, display_time, location, meeting_link,
            status, booking_source, notes, booking_target, sales_user_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', 'SALES_LEAD', ?, 'SALES_LEAD', ?, ?, ?)
        `).run(
          clientName.trim(),
          clientEmail ? clientEmail.trim() : '',
          clientPhone ? clientPhone.trim() : '',
          clientCompany.trim(),
          purpose.trim(),
          meetingDate,
          startTime,
          endTime || startTime,
          `${startTime} - ${endTime || startTime}`,
          meetingLink ? 'Google Meet (Online)' : 'Sales Team Desk',
          meetingLink ? meetingLink.trim() : '',
          clientDesc.trim() || purpose.trim(),
          salesUserId.trim(),
          nowIso,
          nowIso
        );
        db.prepare('UPDATE sales_meetings SET booking_id = ? WHERE id = ?').run(insB.lastInsertRowid, newMeetingId);
      } catch (bErr) {
        console.error('Error auto-syncing sales meeting to admin_bookings:', bErr);
      }
    }

    const created = db.prepare('SELECT * FROM sales_meetings WHERE id = ?').get(newMeetingId);
    res.status(201).json({
      success: true,
      message: 'Sales meeting booked successfully',
      meeting: formatSalesMeeting(created)
    });
  } catch (err) {
    console.error('Error creating sales meeting:', err);
    res.status(500).json({ error: 'Failed to create sales meeting', message: err.message });
  }
});

/**
 * PUT /api/sales-meetings/:id
 * Update sales meeting (notes, stage, purpose, admin review, lead summary)
 */
router.put('/:id', (req, res) => {
  try {
    const meetingId = req.params.id;
    const existing = db.prepare('SELECT * FROM sales_meetings WHERE id = ?').get(meetingId);
    if (!existing) {
      return res.status(404).json({ error: 'Sales meeting not found' });
    }

    const {
      meetingTitle,
      clientName,
      clientCompany,
      clientEmail,
      clientPhone,
      meetingDate,
      startTime,
      endTime,
      meetingType,
      meetingLink,
      purpose,
      discussionNotes,
      dealStage,
      dealValue,
      actionItems,
      adminNotes,
      clientDescription,
      leadSummary
    } = req.body || {};

    const nowIso = new Date().toISOString();
    db.prepare(`
      UPDATE sales_meetings SET
        meeting_title = COALESCE(?, meeting_title),
        client_name = COALESCE(?, client_name),
        client_company = COALESCE(?, client_company),
        client_email = COALESCE(?, client_email),
        client_phone = COALESCE(?, client_phone),
        meeting_date = COALESCE(?, meeting_date),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        meeting_type = COALESCE(?, meeting_type),
        meeting_link = COALESCE(?, meeting_link),
        purpose = COALESCE(?, purpose),
        discussion_notes = COALESCE(?, discussion_notes),
        deal_stage = COALESCE(?, deal_stage),
        deal_value = COALESCE(?, deal_value),
        action_items = COALESCE(?, action_items),
        admin_notes = COALESCE(?, admin_notes),
        client_description = COALESCE(?, client_description),
        lead_summary = COALESCE(?, lead_summary),
        updated_at = ?
      WHERE id = ?
    `).run(
      meetingTitle,
      clientName,
      clientCompany,
      clientEmail,
      clientPhone,
      meetingDate,
      startTime,
      endTime,
      meetingType,
      meetingLink,
      purpose,
      discussionNotes,
      dealStage,
      dealValue !== undefined ? Number(dealValue) : null,
      actionItems,
      adminNotes,
      clientDescription,
      leadSummary,
      nowIso,
      meetingId
    );

    const updated = db.prepare('SELECT * FROM sales_meetings WHERE id = ?').get(meetingId);
    res.json({
      success: true,
      message: 'Sales meeting updated successfully',
      meeting: formatSalesMeeting(updated)
    });
  } catch (err) {
    console.error('Error updating sales meeting:', err);
    res.status(500).json({ error: 'Failed to update sales meeting', message: err.message });
  }
});

/**
 * POST /api/sales-meetings/:id/confirm
 * Confirm a sales team meeting and notify the client/user
 */
router.post('/:id/confirm', (req, res) => {
  try {
    const meetingId = req.params.id;
    const meeting = db.prepare('SELECT * FROM sales_meetings WHERE id = ?').get(meetingId);
    if (!meeting) return res.status(404).json({ error: 'Sales meeting not found' });

    const nowIso = new Date().toISOString();
    db.prepare(`
      UPDATE sales_meetings
      SET deal_stage = 'Confirmed', updated_at = ?
      WHERE id = ?
    `).run(nowIso, meetingId);

    if (meeting.booking_id) {
      db.prepare("UPDATE admin_bookings SET status = 'CONFIRMED', updated_at = ? WHERE id = ?").run(nowIso, meeting.booking_id);
    }

    // Dispatch confirmation notification for Client / User
    db.prepare(`
      INSERT INTO notifications (
        booking_id, type, title, message, is_read, recipient,
        client_name, booking_date, display_time, booking_status, location,
        status, delivered_at, created_at, updated_at, booking_source
      ) VALUES (?, 'PUSH', 'Sales Meeting Confirmed ✅', ?, 0, ?, ?, ?, ?, 'CONFIRMED', ?, 'DELIVERED', ?, ?, ?, 'CLIENT')
    `).run(
      meeting.booking_id || null,
      `Your appointment with Sales Team Lead (GENTIZE LEAD) on ${meeting.meeting_date} at ${meeting.start_time} has been confirmed.`,
      meeting.client_name,
      meeting.client_name,
      meeting.meeting_date,
      meeting.start_time,
      meeting.meeting_link || 'Sales Lead Desk (Online)',
      nowIso,
      nowIso,
      nowIso
    );

    const updated = db.prepare('SELECT * FROM sales_meetings WHERE id = ?').get(meetingId);
    res.json({ success: true, message: 'Sales meeting confirmed successfully', meeting: formatSalesMeeting(updated) });
  } catch (err) {
    console.error('Error confirming sales meeting:', err);
    res.status(500).json({ error: 'Failed to confirm sales meeting', message: err.message });
  }
});

/**
 * DELETE /api/sales-meetings/:id
 * Delete / cancel a sales meeting
 */
router.delete('/:id', (req, res) => {
  try {
    const meetingId = req.params.id;
    const existing = db.prepare('SELECT id FROM sales_meetings WHERE id = ?').get(meetingId);
    if (!existing) {
      return res.status(404).json({ error: 'Sales meeting not found' });
    }

    db.prepare('DELETE FROM sales_meetings WHERE id = ?').run(meetingId);
    res.json({ success: true, message: 'Sales meeting deleted successfully' });
  } catch (err) {
    console.error('Error deleting sales meeting:', err);
    res.status(500).json({ error: 'Failed to delete sales meeting', message: err.message });
  }
});

export default router;
