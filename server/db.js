import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'events.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');

// Check if migration is needed from legacy single 'date' table
const tableInfo = db.prepare("PRAGMA table_info(events)").all();
const hasEventsTable = tableInfo.length > 0;
const hasStartDate = tableInfo.some((col) => col.name === 'start_date');
const hasOrganizerName = tableInfo.some((col) => col.name === 'organizer_name');

if (hasEventsTable && !hasStartDate) {
  // Perform safe migration from single date schema
  db.transaction(() => {
    db.exec(`
      CREATE TABLE events_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        organizer_name TEXT DEFAULT '',
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        description TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        email TEXT DEFAULT '',
        address TEXT DEFAULT '',
        event_type TEXT DEFAULT 'Online',
        google_maps_link TEXT DEFAULT '',
        meeting_link TEXT DEFAULT '',
        status TEXT DEFAULT 'upcoming',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      INSERT INTO events_new (
        id, title, organizer_name, start_date, end_date, start_time, end_time,
        description, phone, email, address, event_type,
        meeting_link, status, created_at, updated_at
      )
      SELECT 
        id, title, '', date, date, start_time, end_time,
        description, phone, email, address,
        CASE WHEN event_type = 'Offline' THEN 'Offline' ELSE 'Online' END,
        meeting_link, status, created_at, updated_at
      FROM events;

      DROP TABLE events;
      ALTER TABLE events_new RENAME TO events;
    `);
  })();
} else if (hasEventsTable && hasStartDate && !hasOrganizerName) {
  db.exec(`ALTER TABLE events ADD COLUMN organizer_name TEXT DEFAULT ''`);
} else if (!hasEventsTable) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      organizer_name TEXT DEFAULT '',
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      description TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      address TEXT DEFAULT '',
      event_type TEXT DEFAULT 'Online',
      google_maps_link TEXT DEFAULT '',
      meeting_link TEXT DEFAULT '',
      status TEXT DEFAULT 'upcoming',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

// Ensure indexes on events table
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
  CREATE INDEX IF NOT EXISTS idx_events_end_date ON events(end_date);
  CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
  CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
  CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
`);

// Notifications and Notification Settings Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    scheduled_for TEXT,
    delivered_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS notification_settings (
    id INTEGER PRIMARY KEY,
    remind_1_day INTEGER DEFAULT 1,
    remind_1_hour INTEGER DEFAULT 1,
    remind_15_min INTEGER DEFAULT 1,
    notify_created INTEGER DEFAULT 1,
    notify_updated INTEGER DEFAULT 1,
    notify_cancelled INTEGER DEFAULT 1,
    channel_in_app INTEGER DEFAULT 1,
    channel_browser INTEGER DEFAULT 0,
    channel_device INTEGER DEFAULT 1
  );

  INSERT OR IGNORE INTO notification_settings (
    id, remind_1_day, remind_1_hour, remind_15_min,
    notify_created, notify_updated, notify_cancelled,
    channel_in_app, channel_browser, channel_device
  ) VALUES (1, 1, 1, 1, 1, 1, 1, 1, 0, 1);
`);

// Safe migration for notifications table to add delivered_at and updated_at if they don't exist
const notifCols = db.prepare("PRAGMA table_info(notifications)").all();
const hasDeliveredAt = notifCols.some((col) => col.name === 'delivered_at');
const hasUpdatedAt = notifCols.some((col) => col.name === 'updated_at');

if (!hasDeliveredAt) {
  db.exec("ALTER TABLE notifications ADD COLUMN delivered_at TEXT");
}
if (!hasUpdatedAt) {
  db.exec("ALTER TABLE notifications ADD COLUMN updated_at TEXT");
}

const notifColNames = notifCols.map(c => c.name);
if (!notifColNames.includes('booking_id')) db.exec("ALTER TABLE notifications ADD COLUMN booking_id INTEGER");
if (!notifColNames.includes('recipient')) db.exec("ALTER TABLE notifications ADD COLUMN recipient TEXT DEFAULT 'MD Office'");
if (!notifColNames.includes('client_name')) db.exec("ALTER TABLE notifications ADD COLUMN client_name TEXT DEFAULT ''");
if (!notifColNames.includes('booking_date')) db.exec("ALTER TABLE notifications ADD COLUMN booking_date TEXT DEFAULT ''");
if (!notifColNames.includes('display_time')) db.exec("ALTER TABLE notifications ADD COLUMN display_time TEXT DEFAULT ''");
if (!notifColNames.includes('booking_status')) db.exec("ALTER TABLE notifications ADD COLUMN booking_status TEXT DEFAULT ''");
if (!notifColNames.includes('location')) db.exec("ALTER TABLE notifications ADD COLUMN location TEXT DEFAULT ''");
if (!notifColNames.includes('status')) db.exec("ALTER TABLE notifications ADD COLUMN status TEXT DEFAULT 'DELIVERED'");
if (!notifColNames.includes('booking_source')) db.exec("ALTER TABLE notifications ADD COLUMN booking_source TEXT DEFAULT ''");

// Ensure immediate notifications have delivered_at set
db.exec(`
  UPDATE notifications 
  SET delivered_at = created_at, updated_at = created_at 
  WHERE scheduled_for IS NULL AND delivered_at IS NULL
`);

// Notifications indexes
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON notifications(event_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
  CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON notifications(scheduled_for);
  CREATE INDEX IF NOT EXISTS idx_notifications_delivered_at ON notifications(delivered_at);
  CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
`);

/**
 * Format DB row to camelCase API response including organizerName
 */
export function formatEvent(row) {
  if (!row) return null;
  const isOnline = row.event_type === 'Online';
  return {
    id: row.id,
    title: row.title,
    organizerName: row.organizer_name || '',
    startDate: row.start_date,
    endDate: row.end_date,
    startTime: row.start_time,
    endTime: row.end_time,
    description: row.description || '',
    phone: row.phone || '',
    email: row.email || '',
    eventType: isOnline ? 'Online' : 'Offline',
    meetingLink: isOnline ? (row.meeting_link || '') : null,
    address: isOnline ? null : (row.address || ''),
    googleMapsLink: isOnline ? null : (row.google_maps_link || ''),
    status: row.status || 'upcoming',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Format DB row for Notification
 */
export function formatNotification(row) {
  if (!row) return null;
  const isRead = Boolean(row.is_read);
  const time = row.delivered_at || row.created_at;
  return {
    id: row.id,
    eventId: row.event_id || null,
    booking_id: row.booking_id || null,
    bookingId: row.booking_id || null,
    type: row.type || 'PUSH',
    title: row.title,
    message: row.message,
    isRead,
    is_read: isRead ? 1 : 0,
    scheduledFor: row.scheduled_for || null,
    deliveredAt: row.delivered_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at || null,
    sent_at: time,
    recipient: row.recipient || (row.client_name ? `${row.client_name} (Client)` : 'MD Office'),
    client_name: row.client_name || '',
    booking_date: row.booking_date || '',
    booking_status: row.booking_status || (row.booking_id ? 'PENDING' : ''),
    displayTime: row.display_time || '',
    location: row.location || 'Gentize Office',
    status: row.status || 'DELIVERED',
    booking_source: (row.booking_source || '').toUpperCase() === 'USER' || row.title?.includes('User') || row.message?.toLowerCase().includes('user') || row.message?.toLowerCase().includes('assistant') || row.message?.toLowerCase().includes('staff') ? 'USER' : 'CLIENT',
  };
}


/**
 * Format DB row for Notification Settings
 */
export function formatNotificationSettings(row) {
  if (!row) return null;
  const remind1Day = Boolean(row.remind_1_day);
  const remind1Hour = Boolean(row.remind_1_hour);
  const remind15Min = Boolean(row.remind_15_min);
  const notifyCreated = Boolean(row.notify_created);
  const notifyUpdated = Boolean(row.notify_updated);
  const notifyCancelled = Boolean(row.notify_cancelled);
  const inAppEnabled = Boolean(row.channel_in_app);
  const browserEnabled = Boolean(row.channel_browser);
  const deviceEnabled = Boolean(row.channel_device);

  return {
    remind1Day,
    reminder1Day: remind1Day,
    remind1Hour,
    reminder1Hour: remind1Hour,
    remind15Min,
    reminder15Min: remind15Min,
    notifyCreated,
    eventCreated: notifyCreated,
    notifyUpdated,
    eventUpdated: notifyUpdated,
    notifyCancelled,
    eventCancelled: notifyCancelled,
    channelInApp: inAppEnabled,
    inAppEnabled,
    channelBrowser: browserEnabled,
    browserEnabled,
    channelDevice: deviceEnabled,
    deviceEnabled,
  };
}


// ==========================================
// Sales Team & Sales Meetings Schema
// ==========================================
db.exec(`
  CREATE TABLE IF NOT EXISTS sales_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'SALES_REP',
    phone TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sales_meetings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meeting_title TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_company TEXT NOT NULL,
    client_email TEXT DEFAULT '',
    client_phone TEXT DEFAULT '',
    sales_user_id TEXT NOT NULL,
    sales_rep_name TEXT NOT NULL,
    meeting_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    meeting_type TEXT DEFAULT 'Online',
    meeting_link TEXT DEFAULT '',
    purpose TEXT NOT NULL,
    discussion_notes TEXT NOT NULL,
    deal_stage TEXT DEFAULT 'Scheduled',
    deal_value REAL DEFAULT 0,
    action_items TEXT DEFAULT '',
    admin_notes TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sales_meetings_rep ON sales_meetings(sales_user_id);
  CREATE INDEX IF NOT EXISTS idx_sales_meetings_date ON sales_meetings(meeting_date);
  CREATE INDEX IF NOT EXISTS idx_sales_meetings_stage ON sales_meetings(deal_stage);
`);

// Safe migrations for sales_meetings
const smCols = db.prepare("PRAGMA table_info(sales_meetings)").all().map(c => c.name);
if (!smCols.includes('client_description')) {
  db.exec("ALTER TABLE sales_meetings ADD COLUMN client_description TEXT DEFAULT ''");
}
if (!smCols.includes('lead_summary')) {
  db.exec("ALTER TABLE sales_meetings ADD COLUMN lead_summary TEXT DEFAULT ''");
}
if (!smCols.includes('booking_id')) {
  db.exec("ALTER TABLE sales_meetings ADD COLUMN booking_id INTEGER");
}

// Safe migrations for sales_users
const suCols = db.prepare("PRAGMA table_info(sales_users)").all().map(c => c.name);
if (!suCols.includes('email')) {
  db.exec("ALTER TABLE sales_users ADD COLUMN email TEXT DEFAULT 'lead@meeetly.com'");
}
if (!suCols.includes('default_meeting_link')) {
  db.exec("ALTER TABLE sales_users ADD COLUMN default_meeting_link TEXT DEFAULT 'https://meet.google.com/sal-lead-demo'");
}
if (!suCols.includes('default_slot_duration')) {
  db.exec("ALTER TABLE sales_users ADD COLUMN default_slot_duration INTEGER DEFAULT 30");
}

// Pre-seed Demo Sales Reps if empty
const salesUsersCount = db.prepare('SELECT COUNT(*) as count FROM sales_users').get().count;
const nowIsoUser = new Date().toISOString();
if (salesUsersCount === 0) {
  const seedUser = db.prepare(`
    INSERT INTO sales_users (user_id, name, password, role, phone, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  seedUser.run('lead', 'GENTIZE LEAD', 'lead123', 'SALES_LEAD', '+91 98765 43220', nowIsoUser);
  seedUser.run('sales.alex@meeetly.com', 'Alex Mercer', 'sales123', 'SALES_REP', '+1 (555) 301-4411', nowIsoUser);
  seedUser.run('sales.priya@meeetly.com', 'Priya Sharma', 'sales123', 'SALES_REP', '+1 (555) 301-7722', nowIsoUser);
  seedUser.run('sales.rahul@meeetly.com', 'Rahul Verma', 'sales123', 'SALES_REP', '+1 (555) 301-9933', nowIsoUser);
} else {
  // Ensure 'lead' user exists for SALES TEAM PORTAL
  const leadUser = db.prepare("SELECT id FROM sales_users WHERE LOWER(user_id) = 'lead'").get();
  if (!leadUser) {
    db.prepare(`
      INSERT INTO sales_users (user_id, name, password, role, phone, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('lead', 'GENTIZE LEAD', 'lead123', 'SALES_LEAD', '+91 98765 43220', nowIsoUser);
  }
}

// Demo sales meetings seeding removed - meetings are only created via actual user/client bookings.


/**
 * Format DB row for Sales Meeting
 */
export function formatSalesMeeting(row) {
  if (!row) return null;
  return {
    id: row.id,
    meetingTitle: row.meeting_title,
    clientName: row.client_name,
    clientCompany: row.client_company,
    clientEmail: row.client_email || '',
    clientPhone: row.client_phone || '',
    salesUserId: row.sales_user_id,
    salesRepName: row.sales_rep_name,
    meetingDate: row.meeting_date,
    startTime: row.start_time,
    endTime: row.end_time,
    meetingType: row.meeting_type || 'Online',
    meetingLink: row.meeting_link || '',
    purpose: row.purpose,
    discussionNotes: row.discussion_notes,
    dealStage: row.deal_stage || 'Scheduled',
    dealValue: Number(row.deal_value || 0),
    actionItems: row.action_items || '',
    adminNotes: row.admin_notes || '',
    clientDescription: row.client_description || row.discussion_notes || '',
    leadSummary: row.lead_summary || row.admin_notes || '',
    bookingId: row.booking_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// ==========================================
// Admin Workspace & Client Booking Schema
// ==========================================
db.exec(`
  CREATE TABLE IF NOT EXISTS admin_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    slot_duration INTEGER DEFAULT 30,
    buffer_time INTEGER DEFAULT 0,
    location TEXT DEFAULT 'MD Cabin',
    meeting_link TEXT DEFAULT '',
    assigned_user_id INTEGER,
    status TEXT DEFAULT 'ACTIVE',
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_admin_schedules_date ON admin_schedules(date);

  CREATE TABLE IF NOT EXISTS admin_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    display_time TEXT NOT NULL,
    status TEXT DEFAULT 'AVAILABLE',
    booking_id INTEGER,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_admin_slots_date ON admin_slots(date);
  CREATE INDEX IF NOT EXISTS idx_admin_slots_schedule ON admin_slots(schedule_id);

  CREATE TABLE IF NOT EXISTS admin_bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slot_id INTEGER,
    event_id INTEGER,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    display_time TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT DEFAULT '',
    client_phone TEXT DEFAULT '',
    company_name TEXT DEFAULT '',
    purpose TEXT NOT NULL,
    location TEXT DEFAULT 'MD Cabin',
    meeting_link TEXT DEFAULT '',
    status TEXT DEFAULT 'CONFIRMED',
    booking_source TEXT DEFAULT 'CLIENT',
    notes TEXT DEFAULT '',
    cancellation_reason TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_admin_bookings_date ON admin_bookings(date);
  CREATE INDEX IF NOT EXISTS idx_admin_bookings_status ON admin_bookings(status);

  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT DEFAULT '',
    password TEXT DEFAULT 'user123',
    role TEXT DEFAULT 'USER',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS client_accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    password TEXT NOT NULL,
    company TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_settings (
    id INTEGER PRIMARY KEY,
    company_name TEXT DEFAULT 'Meeetly Internal',
    email_notifications_enabled TEXT DEFAULT '1',
    sms_notifications_enabled TEXT DEFAULT '1',
    default_slot_duration TEXT DEFAULT '30'
  );

  INSERT OR IGNORE INTO admin_settings (
    id, company_name, email_notifications_enabled, sms_notifications_enabled, default_slot_duration
  ) VALUES (1, 'Meeetly Internal', '1', '1', '30');
`);

try {
  db.prepare("ALTER TABLE client_accounts ADD COLUMN avatar TEXT DEFAULT ''").run();
} catch (_) {}

// Safe migration for admin_bookings to add client_id, booking_target, sales_user_id
const bookingCols = db.prepare("PRAGMA table_info(admin_bookings)").all().map(c => c.name);
if (!bookingCols.includes('client_id')) {
  db.exec("ALTER TABLE admin_bookings ADD COLUMN client_id TEXT DEFAULT ''");
}
if (!bookingCols.includes('booking_target')) {
  db.exec("ALTER TABLE admin_bookings ADD COLUMN booking_target TEXT DEFAULT 'MD'");
}
if (!bookingCols.includes('sales_user_id')) {
  db.exec("ALTER TABLE admin_bookings ADD COLUMN sales_user_id TEXT DEFAULT ''");
}

// Safe migration for admin_schedules to add booking_target
const schedCols = db.prepare("PRAGMA table_info(admin_schedules)").all().map(c => c.name);
if (!schedCols.includes('booking_target')) {
  db.exec("ALTER TABLE admin_schedules ADD COLUMN booking_target TEXT DEFAULT 'MD'");
}

// Migration: Rename 'MD Cabin' to 'Gentize Office' across all tables
try {
  db.exec(`
    UPDATE admin_schedules SET location = REPLACE(location, 'MD Cabin', 'Gentize Office') WHERE location LIKE '%MD Cabin%';
    UPDATE admin_bookings SET location = REPLACE(location, 'MD Cabin', 'Gentize Office') WHERE location LIKE '%MD Cabin%';
    UPDATE notifications SET location = REPLACE(location, 'MD Cabin', 'Gentize Office') WHERE location LIKE '%MD Cabin%';
  `);
} catch (e) {
  console.error('Error updating MD Cabin to Gentize Office:', e);
}

// Helpers for time formatting
export function to12Hour(time24) {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

export function generateSlotsForSchedule(scheduleId, date, startTime, endTime, duration = 30, buffer = 0) {
  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);
  const startMin = sH * 60 + sM;
  const endMin = eH * 60 + eM;
  
  const slots = [];
  let cur = startMin;
  while (cur + duration <= endMin) {
    const curH = Math.floor(cur / 60);
    const curM = cur % 60;
    const nxtH = Math.floor((cur + duration) / 60);
    const nxtM = (cur + duration) % 60;
    const sStr = `${String(curH).padStart(2, '0')}:${String(curM).padStart(2, '0')}`;
    const eStr = `${String(nxtH).padStart(2, '0')}:${String(nxtM).padStart(2, '0')}`;
    slots.push({
      schedule_id: scheduleId,
      date,
      start_time: sStr,
      end_time: eStr,
      display_time: `${to12Hour(sStr)} - ${to12Hour(eStr)}`,
      status: 'AVAILABLE'
    });
    cur += duration + buffer;
  }
  return slots;
}

// Pre-seed Admin Data if empty
export function seedAdminDataIfEmpty() {
  const usersCount = db.prepare('SELECT COUNT(*) as count FROM admin_users').get().count;
  const nowIso = new Date().toISOString();

  if (usersCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO admin_users (name, email, phone, password, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertUser.run('Dr. Ramesh (MD)', 'md@meeetly.com', '+91 98400 12345', 'admin123', 'ADMIN', nowIso);
  }


  const schedulesCount = db.prepare('SELECT COUNT(*) as count FROM admin_schedules').get().count;
  if (schedulesCount === 0) {
    // Generate clean schedules for today and tomorrow with 100% available slots and ZERO fake bookings
    const d = new Date();
    const todayStr = d.toISOString().split('T')[0];
    
    const dTomorrow = new Date(d);
    dTomorrow.setDate(dTomorrow.getDate() + 1);
    const tomorrowStr = dTomorrow.toISOString().split('T')[0];

    const insertSchedule = db.prepare(`
      INSERT INTO admin_schedules (title, date, start_time, end_time, slot_duration, buffer_time, location, meeting_link, assigned_user_id, status, booking_target, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'MD', ?)
    `);

    const insertSlot = db.prepare(`
      INSERT INTO admin_slots (schedule_id, date, start_time, end_time, display_time, status, booking_id, created_at)
      VALUES (?, ?, ?, ?, ?, 'AVAILABLE', null, ?)
    `);

    // 1. TODAY'S MD SCHEDULE (Clean open slots, 0 bookings)
    const s1Info = insertSchedule.run(
      'MD Working Hours & Consultations',
      todayStr, '10:00', '17:00', 30, 0, 'Gentize Office (In-Person)',
      'https://meet.google.com/qwe-rtyu-iop', 1, nowIso
    );
    const s1Id = s1Info.lastInsertRowid;
    const slotsToday = generateSlotsForSchedule(s1Id, todayStr, '10:00', '17:00', 30, 0);
    for (const slot of slotsToday) {
      insertSlot.run(slot.schedule_id, slot.date, slot.start_time, slot.end_time, slot.display_time, nowIso);
    }

    // 2. TOMORROW'S MD SCHEDULE (Clean open slots, 0 bookings)
    const s2Info = insertSchedule.run(
      'MD Executive Working Hours',
      tomorrowStr, '10:00', '17:00', 30, 0, 'Gentize Office (In-Person)',
      'https://meet.google.com/xyz-uvwx-rst', 1, nowIso
    );
    const s2Id = s2Info.lastInsertRowid;
    const slotsTomorrow = generateSlotsForSchedule(s2Id, tomorrowStr, '10:00', '17:00', 30, 0);
    for (const slot of slotsTomorrow) {
      insertSlot.run(slot.schedule_id, slot.date, slot.start_time, slot.end_time, slot.display_time, nowIso);
    }
  }
}

// Execute seed automatically
seedAdminDataIfEmpty();

export function seedSalesLeadDataIfEmpty() {
  const leadSchedCount = db.prepare("SELECT COUNT(*) as count FROM admin_schedules WHERE booking_target = 'SALES_LEAD'").get().count;
  const nowIso = new Date().toISOString();
  if (leadSchedCount === 0) {
    const d = new Date();
    const todayStr = d.toISOString().split('T')[0];
    const dTomorrow = new Date(d);
    dTomorrow.setDate(dTomorrow.getDate() + 1);
    const tomorrowStr = dTomorrow.toISOString().split('T')[0];

    const insertSchedule = db.prepare(`
      INSERT INTO admin_schedules (
        title, date, start_time, end_time, slot_duration, buffer_time,
        location, meeting_link, assigned_user_id, status, booking_target, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'SALES_LEAD', ?)
    `);

    const insertSlot = db.prepare(`
      INSERT INTO admin_slots (schedule_id, date, start_time, end_time, display_time, status, booking_id, created_at)
      VALUES (?, ?, ?, ?, ?, 'AVAILABLE', null, ?)
    `);

    // Today's Sales Schedule (Clean open slots, 0 bookings)
    const s1 = insertSchedule.run(
      'Sales Team Lead Client Consultations',
      todayStr, '10:00', '17:00', 30, 0, 'Sales Lead Desk / Online',
      'https://meet.google.com/sal-lead-demo', null, nowIso
    );
    const s1Id = s1.lastInsertRowid;
    const slots1 = generateSlotsForSchedule(s1Id, todayStr, '10:00', '17:00', 30, 0);
    for (const slot of slots1) {
      insertSlot.run(slot.schedule_id, slot.date, slot.start_time, slot.end_time, slot.display_time, nowIso);
    }

    // Tomorrow's Sales Schedule (Clean open slots, 0 bookings)
    const s2 = insertSchedule.run(
      'Sales Team Lead Working Hours & Client Demos',
      tomorrowStr, '10:00', '17:00', 30, 0, 'Sales Lead Desk / Online',
      'https://meet.google.com/sal-lead-demo', null, nowIso
    );
    const s2Id = s2.lastInsertRowid;
    const slots2 = generateSlotsForSchedule(s2Id, tomorrowStr, '10:00', '17:00', 30, 0);
    for (const slot of slots2) {
      insertSlot.run(slot.schedule_id, slot.date, slot.start_time, slot.end_time, slot.display_time, nowIso);
    }
  }
}
seedSalesLeadDataIfEmpty();

export default db;

// Shared across devices and processes; blank emails are allowed for phone-only accounts.
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_client_email_normalized ON client_accounts(LOWER(TRIM(email))) WHERE LENGTH(TRIM(email)) > 0");


try { db.exec("ALTER TABLE admin_users ADD COLUMN avatar TEXT DEFAULT ''"); } catch (_) {}
