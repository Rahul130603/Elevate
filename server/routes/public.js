import { randomBytes } from 'node:crypto';
import { googleClientId, verifyGoogleCredential, issueGoogleNonce, consumeGoogleNonce } from '../services/googleAuth.js';
import { mailConfigured, queueLoginEmail } from '../services/loginEmail.js';
import { Router } from 'express';
import db, { to12Hour } from '../db.js';

const router = Router();

function generateMeetCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const part = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part(3)}-${part(4)}-${part(3)}`;
}

// -------------------------------------------------------------
// GET /api/public/admin-availability
// -------------------------------------------------------------
router.get('/admin-availability', (req, res) => {
  try {
    const isSalesLead = req.query.target === 'SALES_LEAD';
    const admin = isSalesLead ? {
      name: 'GENTIZE LEAD',
      title: 'Sales Team Lead & Solutions Desk',
      photo: null,
      bio: 'Enterprise product demos, pricing discussions, requirement scoping, and commercial partnerships.',
    } : {
      name: 'Dr. Ramesh',
      title: 'Managing Director & Principal Executive',
      photo: null,
      bio: 'Executive office consultations, strategic enterprise advisory, and commercial partnerships.',
    };

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    const curHour = String(now.getHours()).padStart(2, '0');
    const curMin = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${curHour}:${curMin}`;

    let sql = "SELECT * FROM admin_schedules WHERE status = 'ACTIVE' AND date >= ?";
    const params = [today];
    if (isSalesLead) {
      sql += " AND booking_target = 'SALES_LEAD'";
    } else {
      sql += " AND (booking_target = 'MD' OR booking_target IS NULL)";
    }
    sql += " ORDER BY date ASC, start_time ASC";

    const schedules = db.prepare(sql).all(...params).filter(s => {
      if (s.date === today && s.end_time && s.end_time <= currentTime) return false;
      return true;
    });

    const result = schedules.map((s) => {
      const rawSlots = db.prepare(`
        SELECT * FROM admin_slots WHERE schedule_id = ? ORDER BY start_time ASC
      `).all(s.id);

      const slots = rawSlots.map(slot => ({
        id: slot.id,
        eventId: s.id,
        startTime: slot.start_time,
        endTime: slot.end_time,
        displayStart: to12Hour(slot.start_time),
        displayEnd: to12Hour(slot.end_time),
        displayTime: slot.display_time,
        status: slot.status,
      }));

      return {
        id: s.id,
        title: s.title,
        date: s.date,
        startTime: s.start_time,
        endTime: s.end_time,
        slotDuration: s.slot_duration,
        location: s.location,
        slots,
      };
    });

    res.json({
      success: true,
      admin,
      schedules: result,
    });
  } catch (err) {
    console.error('Error fetching admin availability:', err);
    res.status(500).json({ error: 'Failed to fetch admin availability', message: err.message });
  }
});

// -------------------------------------------------------------
// GET /api/public/place-suggestions
// -------------------------------------------------------------
router.get('/place-suggestions', async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q || q.trim().length < 2) {
      return res.json({ success: true, suggestions: [] });
    }

    const query = q.trim();
    const googleRes = await fetch(`https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`);
    const googleData = await googleRes.json();
    const rawList = Array.isArray(googleData[1]) ? googleData[1] : [];

    const cleaned = rawList
      .map(s => s.replace(/\s+(photos|reviews|price|fees structure|near me|timings)$/i, '').trim())
      .filter(s => s.length > 2);

    const unique = Array.from(new Set(cleaned)).slice(0, 8);
    res.json({ success: true, suggestions: unique });
  } catch (err) {
    res.json({ success: true, suggestions: [] });
  }
});

// -------------------------------------------------------------
// GET /api/public/map-search
// Multi-provider live map search: Google Maps Embed + Photon + Nominatim
// -------------------------------------------------------------
router.get('/map-search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.json({ success: true, places: [] });
    }

    const places = [];
    const seen = new Set();

    const addPlace = (item) => {
      if (!item || !item.label || typeof item.lat !== 'number' || typeof item.lon !== 'number') return;
      const key = `${item.label.toLowerCase()}_${item.lat.toFixed(4)}_${item.lon.toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        places.push(item);
      }
    };

    // 1. Query Google Maps Embed
    try {
      const gUrl = `https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
      const gRes = await fetch(gUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(3500)
      });
      const html = await gRes.text();
      const m = html.match(/initEmbed\((.+?)\);/s);
      if (m) {
        const data = JSON.parse(m[1]);
        const gPlaces = [];
        function searchArrays(obj) {
          if (!obj) return;
          if (Array.isArray(obj)) {
            if (obj.length >= 4 && Array.isArray(obj[3]) && typeof obj[3][0] === 'number' && typeof obj[3][1] === 'number') {
              const lat = obj[3][0] / 1e7;
              const lon = obj[3][1] / 1e7;
              let category = '';
              for (let i = 4; i < obj.length; i++) {
                if (typeof obj[i] === 'string' && obj[i].startsWith('gcid:')) {
                  category = obj[i].replace('gcid:', '').replace(/_/g, ' ');
                  break;
                }
              }
              gPlaces.push({ lat, lon, category });
            }
            obj.forEach(searchArrays);
          }
        }
        searchArrays(data);

        let centerCoord = null;
        function searchCenter(obj) {
          if (!obj || centerCoord) return;
          if (Array.isArray(obj)) {
            if (obj.length === 3 && typeof obj[0] === 'number' && typeof obj[1] === 'number' && typeof obj[2] === 'number') {
              const [zoomVal, lon, lat] = obj;
              if (lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90 && (zoomVal > 100 || zoomVal < 50)) {
                centerCoord = { lat, lon };
                return;
              }
            }
            obj.forEach(searchCenter);
          }
        }
        searchCenter(data);

        // Add matching places
        for (const p of gPlaces) {
          let label = q;
          let sub = 'Google Maps Location';
          if (p.category) {
            const formattedCat = p.category.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            label = `${q} (${formattedCat})`;
            sub = formattedCat;
          }
          addPlace({
            label,
            shortName: q,
            subtitle: sub,
            lat: p.lat,
            lon: p.lon,
            source: 'Google Maps'
          });
        }

        if (centerCoord && gPlaces.length === 0) {
          addPlace({
            label: `${q} (Google Maps)`,
            shortName: q,
            subtitle: 'Google Maps Landmark',
            lat: centerCoord.lat,
            lon: centerCoord.lon,
            source: 'Google Maps'
          });
        }
      }
    } catch (_) {}

    // 2. Query Photon
    try {
      const pRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6`, {
        signal: AbortSignal.timeout(3000)
      });
      if (pRes.ok) {
        const pData = await pRes.json();
        (pData.features || []).forEach(f => {
          const p = f.properties;
          const name = p.name || '';
          const parts = [p.street, p.locality || p.district, p.city || p.county, p.state, p.postcode].filter(Boolean);
          const sub = parts.join(', ');
          const label = name ? (sub ? `${name}, ${sub}` : name) : sub;
          if (label) {
            addPlace({
              label,
              shortName: name || q,
              subtitle: sub || 'OpenStreetMap',
              lat: f.geometry.coordinates[1],
              lon: f.geometry.coordinates[0],
              source: 'OpenStreetMap'
            });
          }
        });
      }
    } catch (_) {}

    // 3. Query Nominatim
    try {
      const nRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=6`, {
        headers: { 'User-Agent': 'MeeetlyApp/1.0', 'Accept-Language': 'en' },
        signal: AbortSignal.timeout(3000)
      });
      if (nRes.ok) {
        const nData = await nRes.json();
        nData.forEach(item => {
          const a = item.address || {};
          const name = item.name || a.amenity || a.shop || a.building || a.village || a.town || a.city || q;
          const subParts = [a.road, a.village || a.hamlet || a.suburb, a.city || a.town || a.county, a.state_district, a.state, a.postcode].filter(Boolean);
          addPlace({
            label: item.display_name || name,
            shortName: name,
            subtitle: Array.from(new Set(subParts)).join(', '),
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            source: 'OpenStreetMap'
          });
        });
      }
    } catch (_) {}

    res.json({ success: true, places: places.slice(0, 10) });
  } catch (err) {
    res.json({ success: true, places: [] });
  }
});

// -------------------------------------------------------------
// GET /api/public/map-reverse
// Pinpoint multi-source reverse geocoding
// -------------------------------------------------------------
router.get('/map-reverse', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'Valid lat and lon required' });
    }

    let gmapPlace = '';
    let nomDetails = null;
    let photonDetails = null;

    const [gRes, nRes, pRes] = await Promise.allSettled([
      fetch(`https://maps.google.com/maps?q=${lat},${lon}&output=embed`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(3000)
      }).then(r => r.text()),
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`, {
        headers: { 'User-Agent': 'MeeetlyApp/1.0', 'Accept-Language': 'en' },
        signal: AbortSignal.timeout(3000)
      }).then(r => r.json()),
      fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`, {
        signal: AbortSignal.timeout(3000)
      }).then(r => r.json())
    ]);

    // Google Maps Embed result
    if (gRes.status === 'fulfilled') {
      const html = gRes.value;
      const m = html.match(/initEmbed\((.+?)\);/s);
      if (m) {
        try {
          const data = JSON.parse(m[1]);
          function search(obj) {
            if (!obj || gmapPlace) return;
            if (typeof obj === 'string') {
              if (obj.includes('+') && (obj.includes('Tamil Nadu') || obj.includes('India') || obj.length > 8)) {
                gmapPlace = obj.replace(/^[A-Z0-9+]+\s*/, '').trim();
                return;
              }
            }
            if (Array.isArray(obj)) obj.forEach(search);
            else if (obj && typeof obj === 'object') Object.values(obj).forEach(search);
          }
          search(data);
        } catch (_) {}
      }
    }

    // Nominatim result
    if (nRes.status === 'fulfilled') {
      nomDetails = nRes.value;
    }

    // Photon result
    if (pRes.status === 'fulfilled') {
      photonDetails = pRes.value?.features?.[0]?.properties;
    }

    const a = nomDetails?.address || {};
    const specific = nomDetails?.name || a.amenity || a.shop || a.building || a.office || a.restaurant || a.road || photonDetails?.street || photonDetails?.name || '';
    const villageOrLocal = a.village || a.hamlet || a.suburb || a.neighbourhood || a.residential || photonDetails?.locality || '';
    const talukOrCounty = a.subdistrict || a.taluk || a.county || photonDetails?.county || '';
    const cityOrTown = a.city || a.town || photonDetails?.city || '';
    const district = a.state_district || photonDetails?.district || '';
    const state = a.state || photonDetails?.state || 'Tamil Nadu';
    const postcode = a.postcode || photonDetails?.postcode || '';

    // Title: Most specific local name
    let shortTitle = specific || villageOrLocal || (gmapPlace ? gmapPlace.split(',')[0] : '') || cityOrTown || talukOrCounty || 'Custom Location';

    // Combine full address
    const addressParts = [
      specific !== villageOrLocal ? specific : '',
      gmapPlace ? gmapPlace.split(',')[0] : '',
      villageOrLocal,
      cityOrTown,
      talukOrCounty !== cityOrTown ? talukOrCounty : '',
      district !== cityOrTown && district !== talukOrCounty ? district : '',
      state,
      postcode
    ].filter(Boolean);

    const seenParts = new Set();
    const uniqueParts = [];
    for (const p of addressParts) {
      const trimmed = p.trim();
      const lower = trimmed.toLowerCase();
      if (!seenParts.has(lower) && trimmed.length > 0) {
        seenParts.add(lower);
        uniqueParts.push(trimmed);
      }
    }

    const fullAddress = uniqueParts.join(', ') || nomDetails?.display_name || `Location (${lat.toFixed(5)}, ${lon.toFixed(5)})`;

    res.json({
      success: true,
      placeName: fullAddress,
      shortTitle,
      fullAddress,
      lat,
      lon
    });
  } catch (err) {
    res.status(500).json({ error: 'Reverse geocode failed', message: err.message });
  }
});

// -------------------------------------------------------------
// POST /api/public/client-login
// -------------------------------------------------------------
router.post('/client-login', (req, res) => {
  try {
    const { username, email, phone, password } = req.body;
    const identifier = (username || email || phone || '').trim();
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email or phone and password are required' });
    }

    const cleanDigits = identifier.replace(/\D/g, '');
    let client = null;

    if (!identifier.includes('@') && cleanDigits.length >= 7) {
      client = db.prepare(`
        SELECT * FROM client_accounts 
        WHERE (id = ? OR username = ? OR LOWER(TRIM(email)) = ? OR phone = ? OR phone LIKE ?) AND password = ?
      `).get(identifier, identifier, identifier.toLowerCase(), identifier, `%${cleanDigits.slice(-10)}%`, password.trim());
    } else {
      client = db.prepare(`
        SELECT * FROM client_accounts 
        WHERE (id = ? OR username = ? OR LOWER(TRIM(email)) = ? OR phone = ?) AND password = ?
      `).get(identifier, identifier, identifier.toLowerCase(), identifier, password.trim());
    }

    if (!client) {
      return res.status(401).json({ error: 'Invalid login credentials. Please check your email/phone and password.' });
    }

    res.json({
      success: true,
      client: {
        id: client.id || client.username,
        name: client.name,
        username: client.username,
        email: client.email,
        phone: client.phone,
        company: client.company,
        avatar: client.avatar || "",
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', message: err.message });
  }
});

// -------------------------------------------------------------
// POST /api/public/client-google-auth
// -------------------------------------------------------------
router.get('/google-auth-config', (req, res) => {
  const clientId = googleClientId();
  res.set('Cache-Control', 'no-store');
  if (!clientId) return res.json({clientId: '', available: false});
  const nonce = issueGoogleNonce();
  res.cookie('elevate_google_nonce', nonce, {httpOnly: true, sameSite: 'lax', secure: req.secure, maxAge: 5 * 60 * 1000, path: '/api/public'});
  res.json({clientId, nonce, available: true});
});

router.post('/client-google-auth', async (req, res) => {
  try {
    const nonceCookie = req.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith('elevate_google_nonce='))?.slice('elevate_google_nonce='.length);
    // The token itself is nonce-bound and the server tracks issued nonces once; carry the
    // matching nonce with this request so proxy/browser cookie policies cannot break sign-in.
    const nonce = req.body.nonce || nonceCookie;
    const { email, name, picture, googleId } = await verifyGoogleCredential(req.body.credential, consumeGoogleNonce(nonce));
    res.clearCookie('elevate_google_nonce', {path: '/api/public', sameSite: 'lax'});
    const cleanEmail = (email || '').trim().toLowerCase();
    const clientName = (name || '').trim() || cleanEmail.split('@')[0] || 'Client';

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required for Google Sign-In.' });
    }

    const nowIso = new Date().toISOString();

    const authIntent = req.body.intent === 'register' ? 'register' : 'login';

    // Registration is explicit: never silently turn a duplicate registration into a login.
    let client = db.prepare("SELECT * FROM client_accounts WHERE LOWER(TRIM(email)) = ?").get(cleanEmail);

    if (authIntent === 'register' && client) {
      return res.status(409).json({error: 'You already have an account. Please sign in.', code: 'ACCOUNT_EXISTS', email: cleanEmail});
    }
    if (authIntent === 'login' && !client) {
      return res.status(404).json({error: 'No account found. Please register first.', code: 'ACCOUNT_NOT_FOUND', email: cleanEmail});
    }

    if (client) {
      // If client exists, update name or avatar if available
      if (clientName && (!client.name || client.name === 'Client')) {
        try {
          db.prepare("UPDATE client_accounts SET name = ? WHERE id = ?").run(clientName, client.id);
          client.name = clientName;
        } catch (_) {}
      }
      if (picture) {
        try {
          db.prepare("UPDATE client_accounts SET avatar = ? WHERE id = ?").run(picture, client.id);
          client.avatar = picture;
        } catch (_) {}
      }
    } else {
      // Google sign-in from the registration option creates a new account.
      const newClientId = `client_${Date.now()}`;
      let usernameCandidate = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '') || `user_${Date.now()}`;
      const existingUser = db.prepare("SELECT id FROM client_accounts WHERE username = ?").get(usernameCandidate);
      if (existingUser) {
        usernameCandidate = `${usernameCandidate}_${Math.floor(Math.random() * 899 + 100)}`;
      }

      const generatedPassword = randomBytes(48).toString('hex');

      try {
        db.prepare(`
          INSERT INTO client_accounts (id, name, username, email, phone, password, company, avatar, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(newClientId, clientName, usernameCandidate, cleanEmail, '', generatedPassword, '', picture || '', nowIso);
      } catch (insertErr) {
        db.prepare(`
          INSERT INTO client_accounts (id, name, username, email, phone, password, company, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(newClientId, clientName, usernameCandidate, cleanEmail, '', generatedPassword, '', nowIso);
      }

      client = db.prepare("SELECT * FROM client_accounts WHERE id = ?").get(newClientId);
    }

    queueLoginEmail({email: cleanEmail, name: client.name});
    return res.json({
      success: true,
      loginEmail: mailConfigured() ? "queued" : "not_configured",
      message: `Signed in as ${client.name}`,
      client: {
        id: client.id || client.username,
        name: client.name,
        username: client.username,
        email: client.email,
        phone: client.phone || '',
        company: client.company || '',
        avatar: picture || client.avatar || '',
      },
    });
  } catch (err) {
    if (req.body.intent === 'register' && String(err.code || '').startsWith('SQLITE_CONSTRAINT_UNIQUE')) {
      return res.status(409).json({error: 'You already have an account. Please sign in.', code: 'ACCOUNT_EXISTS'});
    }
    console.error('Google client auth error:', err);
    return res.status(err.status || 500).json({ error: err.status ? err.message : 'Google Sign-In could not be completed. Please try again.' });
  }
});

// -------------------------------------------------------------
// POST /api/public/client-register
// -------------------------------------------------------------
router.post('/client-register', (req, res) => {
  try {
    const { name, email = '', phone = '', password, company = '' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Full Name is required' });
    }
    if (!password || !password.trim()) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();
    const trimmedPass = password.trim();
    const nowIso = new Date().toISOString();

    // Check if client already exists with this email or phone
    let existing = null;
    if (trimmedEmail) {
      existing = db.prepare("SELECT * FROM client_accounts WHERE LOWER(TRIM(email)) = ? AND email != ''").get(trimmedEmail);
    }
    if (!existing && trimmedPhone) {
      const digits = trimmedPhone.replace(/\D/g, '');
      if (digits.length >= 7) {
        existing = db.prepare("SELECT * FROM client_accounts WHERE phone LIKE ? AND phone != ''").get(`%${digits.slice(-10)}%`);
      }
    }

    if (existing) {
      return res.status(409).json({error: 'You already have an account. Please sign in.', code: 'ACCOUNT_EXISTS'});
    }

    const newId = `client_${Date.now()}`;
    const username = trimmedEmail || (trimmedPhone ? trimmedPhone.replace(/\s+/g, '') : newId);

    db.prepare(`
      INSERT INTO client_accounts (id, name, username, email, phone, password, company, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(newId, trimmedName, username, trimmedEmail, trimmedPhone, trimmedPass, company.trim(), nowIso);

    const created = db.prepare('SELECT * FROM client_accounts WHERE id = ?').get(newId);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      client: {
        id: created.id,
        name: created.name,
        username: created.username,
        email: created.email,
        phone: created.phone,
        company: created.company,
      }
    });
  } catch (err) {
    if (err.code?.startsWith('SQLITE_CONSTRAINT_UNIQUE')) {
      return res.status(409).json({error: 'You already have an account. Please sign in.', code: 'ACCOUNT_EXISTS'});
    }
    res.status(500).json({ error: 'Registration failed', message: err.message });
  }
});

// -------------------------------------------------------------
// -------------------------------------------------------------
// GET /api/public/client-bookings
// -------------------------------------------------------------
router.get('/client-bookings', (req, res) => {
  try {
    const { clientId, userId, username, email, phone, name, bookingIds } = req.query;

    // Look up client account if a specific ID or username was passed
    let clientAccount = null;
    const lookupId = clientId || userId;
    if (lookupId) {
      try {
        clientAccount = db.prepare('SELECT * FROM client_accounts WHERE id = ? OR username = ?').get(lookupId, lookupId);
      } catch (_) {}
    }

    const searchEmail = (email && email.trim()) || clientAccount?.email || '';
    const searchName = (name && name.trim()) || (username && username.trim()) || clientAccount?.name || '';
    const cleanPhoneDigits = (phone || '').replace(/\D/g, '');
    const searchPhone = cleanPhoneDigits.length >= 7
      ? phone.trim().replace(/\s+/g, '')
      : (clientAccount?.phone ? clientAccount.phone.replace(/\s+/g, '') : '');
    const searchClientId = (clientId && clientId.trim()) || clientAccount?.id || clientAccount?.username || '';

    // Parse booking IDs if provided from localStorage
    const parsedIds = (bookingIds || '')
      .split(',')
      .map(id => parseInt(id.trim(), 10))
      .filter(id => !isNaN(id) && id > 0);

    let rows = [];

    if (searchEmail || searchClientId) {
      // Logged in client: strictly isolate to their own account
      const clientConditions = [];
      const clientParams = [];
      if (searchClientId) {
        clientConditions.push(`client_id = ?`);
        clientParams.push(searchClientId);
      }
      if (searchEmail) {
        clientConditions.push(`LOWER(client_email) = ?`);
        clientParams.push(searchEmail);
      }
      rows = db.prepare(`
        SELECT * FROM admin_bookings 
        WHERE ${clientConditions.join(' OR ')}
        ORDER BY date DESC, start_time DESC
      `).all(...clientParams);
    } else if (parsedIds.length > 0) {
      // Guest mode without account: only show bookings made in this session
      const placeholders = parsedIds.map(() => '?').join(',');
      rows = db.prepare(`
        SELECT * FROM admin_bookings 
        WHERE id IN (${placeholders})
        ORDER BY date DESC, start_time DESC
      `).all(...parsedIds);
    } else if (searchPhone && searchPhone.length >= 7) {
      rows = db.prepare(`
        SELECT * FROM admin_bookings 
        WHERE REPLACE(client_phone, ' ', '') LIKE ?
        ORDER BY date DESC, start_time DESC
      `).all(`%${searchPhone}%`);
    } else {
      rows = [];
    }

    const bookings = rows.map(b => ({
      id: b.id,
      slot_id: b.slot_id,
      event_id: b.event_id,
      client_id: b.client_id,
      date: b.date,
      start_time: b.start_time,
      end_time: b.end_time,
      display_time: b.display_time,
      displayTime: b.display_time,
      client_name: b.client_name,
      client_email: b.client_email,
      client_phone: b.client_phone,
      company_name: b.company_name,
      purpose: b.purpose,
      meeting_purpose: b.purpose,
      location: b.location,
      status: b.status,
      meeting_link: b.meeting_link,
      notes: b.notes,
      cancellation_reason: b.cancellation_reason,
      created_at: b.created_at,
      updated_at: b.updated_at,
      confirmed_at: b.status === 'CONFIRMED' ? (b.updated_at || b.created_at) : null,
    }));

    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch client bookings', message: err.message });
  }
});

// -------------------------------------------------------------
// GET /api/public/client-notifications
// -------------------------------------------------------------
router.get('/client-notifications', (req, res) => {
  try {
    const { email, name, phone, clientId, bookingIds } = req.query;
    const searchEmail = (email || '').trim().toLowerCase();
    const searchClientId = (clientId || '').trim();
    const searchName = (name || '').trim().toLowerCase();

    const parsedIds = (bookingIds || '')
      .split(',')
      .map(id => parseInt(id.trim(), 10))
      .filter(id => !isNaN(id) && id > 0);

    let rows = [];

    if (searchEmail || searchClientId || searchName) {
      // Identified client: Strictly isolate to this client, never returning admin's 'MD Executive Office' alerts
      const conds = [];
      const params = [];

      conds.push(`
        booking_id IN (
          SELECT id FROM admin_bookings 
          WHERE (client_id = ? AND client_id != '') 
             OR (LOWER(client_email) = ? AND client_email != '')
        )
      `);
      params.push(searchClientId || searchEmail, searchEmail);

      if (searchEmail) {
        conds.push(`LOWER(recipient) = ?`);
        params.push(searchEmail);
        conds.push(`message LIKE ?`);
        params.push(`%${searchEmail}%`);
      }

      if (searchName) {
        conds.push(`(LOWER(client_name) = ? AND recipient != 'MD Executive Office')`);
        params.push(searchName);
        conds.push(`(LOWER(recipient) = ? AND recipient != 'MD Executive Office')`);
        params.push(searchName);
      }

      rows = db.prepare(`
        SELECT * FROM notifications 
        WHERE (${conds.join(' OR ')})
          AND recipient != 'MD Executive Office'
        ORDER BY COALESCE(delivered_at, created_at) DESC LIMIT 50
      `).all(...params);
    } else if (parsedIds.length > 0) {
      // Guest mode: only match specific bookingIds stored in session, excluding MD office alerts
      const placeholders = parsedIds.map(() => '?').join(',');
      rows = db.prepare(`
        SELECT * FROM notifications 
        WHERE booking_id IN (${placeholders})
          AND recipient != 'MD Executive Office'
        ORDER BY COALESCE(delivered_at, created_at) DESC LIMIT 50
      `).all(...parsedIds);
    } else {
      rows = [];
    }

    const notifications = rows.map(n => ({
      id: n.id,
      booking_id: n.booking_id,
      type: n.type || 'PUSH',
      title: n.title,
      message: n.message,
      status: n.status || 'DELIVERED',
      recipient: n.recipient,
      client_name: n.client_name,
      booking_date: n.booking_date,
      displayTime: n.display_time,
      booking_status: n.booking_status,
      location: n.location,
      sent_at: n.delivered_at || n.created_at,
      delivered_at: n.delivered_at,
      created_at: n.created_at,
      updated_at: n.updated_at,
      is_read: n.is_read
    }));

    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch client notifications', message: err.message });
  }
});

// -------------------------------------------------------------
// DELETE & POST /api/public/client-notifications/clear-all
// -------------------------------------------------------------
const clearClientNotificationsHandler = (req, res) => {
  try {
    const { email, name } = { ...req.query, ...req.body };
    let result;
    if (email || name) {
      result = db.prepare(`
        DELETE FROM notifications 
        WHERE recipient LIKE ? OR client_name LIKE ? OR message LIKE ?
      `).run(`%${email || ''}%`, `%${name || ''}%`, `%${email || name || ''}%`);
    } else {
      result = db.prepare('DELETE FROM notifications WHERE (scheduled_for IS NULL OR delivered_at IS NOT NULL)').run();
    }
    res.json({ success: true, deletedCount: result.changes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear notifications', message: err.message });
  }
};
router.delete('/client-notifications/clear-all', clearClientNotificationsHandler);
router.post('/client-notifications/clear-all', clearClientNotificationsHandler);

// -------------------------------------------------------------
// POST /api/public/book
// -------------------------------------------------------------
router.post('/book', (req, res) => {
  try {
    const {
      eventId,
      slotId,
      isPreBooking,
      date,
      startTime,
      endTime,
      name,
      email,
      phone = '',
      companyName = '',
      purpose = 'Executive Meeting',
      meetingMode = 'In-Person',
      meetingLink,
      notes = '',
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Name is required' });

    const nowIso = new Date().toISOString();
    let bookingDate = date;
    let bStartTime = startTime;
    let bEndTime = endTime;
    let displayTime = '';
    let targetSlot = null;

    if (slotId) {
      targetSlot = db.prepare('SELECT * FROM admin_slots WHERE id = ?').get(slotId);
      if (targetSlot) {
        bookingDate = targetSlot.date;
        bStartTime = targetSlot.start_time;
        bEndTime = targetSlot.end_time;
        displayTime = targetSlot.display_time;
      }
    }

    if (!displayTime && bStartTime && bEndTime) {
      displayTime = `${to12Hour(bStartTime)} - ${to12Hour(bEndTime)}`;
    }

    const effectiveLocation = req.body.location || req.body.meetingMode || meetingMode || (meetingMode?.includes('Online') ? 'Google Meet (Online)' : 'Gentize Office (In-Person)');
    const effectiveMeetLink = meetingLink || (effectiveLocation?.includes('Online') || effectiveLocation?.includes('Meet') ? `https://meet.google.com/${generateMeetCode()}` : '');

    let clientIdParam = req.body.clientId || req.body.userId || '';
    const clientPass = req.body.password ? String(req.body.password).trim() : '';
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanPhone = phone ? phone.trim() : '';
    let clientAccount = null;

    // Check existing account by email or phone or clientIdParam
    if (clientIdParam) {
      try {
        clientAccount = db.prepare('SELECT * FROM client_accounts WHERE id = ? OR username = ?').get(clientIdParam, clientIdParam);
      } catch (_) {}
    }
    if (!clientAccount && cleanEmail) {
      try {
        clientAccount = db.prepare("SELECT * FROM client_accounts WHERE LOWER(TRIM(email)) = ? AND email != ''").get(cleanEmail);
      } catch (_) {}
    }
    if (!clientAccount && cleanPhone) {
      const pDigits = cleanPhone.replace(/\D/g, '');
      if (pDigits.length >= 7) {
        try {
          clientAccount = db.prepare("SELECT * FROM client_accounts WHERE phone LIKE ? AND phone != ''").get(`%${pDigits.slice(-10)}%`);
        } catch (_) {}
      }
    }

    // Auto-create or link client account even without explicit password
    if (!clientAccount && (name || cleanEmail || cleanPhone)) {
      const newClientId = `client_${Date.now()}`;
      const username = cleanEmail || (cleanPhone ? cleanPhone.replace(/\s+/g, '') : newClientId);
      const effectivePass = clientPass || 'client123';
      try {
        db.prepare(`
          INSERT INTO client_accounts (id, name, username, email, phone, password, company, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(newClientId, name.trim(), username, cleanEmail, cleanPhone, effectivePass, companyName || '', nowIso);
        clientAccount = db.prepare('SELECT * FROM client_accounts WHERE id = ?').get(newClientId);
      } catch (regErr) {
        console.warn('Auto client registration warning:', regErr.message);
      }
    } else if (clientAccount) {
      try {
        // Booking cannot reset an existing client's login password.
        {
          db.prepare(`
            UPDATE client_accounts SET name = ?, phone = COALESCE(NULLIF(?, ''), phone), email = COALESCE(NULLIF(?, ''), email)
            WHERE id = ?
          `).run(name.trim(), cleanPhone, cleanEmail, clientAccount.id);
        }
        clientAccount = db.prepare('SELECT * FROM client_accounts WHERE id = ?').get(clientAccount.id);
      } catch (_) {}
    }

    const finalClientId = clientIdParam || clientAccount?.id || clientAccount?.username || '';

    const isSalesLead = req.body.bookingTarget === 'SALES_LEAD' || req.body.target === 'SALES_LEAD' || req.body.host === 'SALES_LEAD';
    const targetHost = isSalesLead ? 'SALES_LEAD' : 'MD';
    const salesUserId = isSalesLead ? (req.body.salesUserId || 'lead') : '';
    const finalLocation = isSalesLead && (!req.body.location || req.body.location === 'MD Cabin (In-Person)' || req.body.location === 'Gentize Office (In-Person)')
      ? (effectiveMeetLink ? 'Google Meet (Online)' : 'Sales Team Desk')
      : effectiveLocation;

    const insertBooking = db.prepare(`
      INSERT INTO admin_bookings (
        slot_id, event_id, client_id, date, start_time, end_time, display_time,
        client_name, client_email, client_phone, company_name, purpose,
        location, meeting_link, status, booking_source, notes, cancellation_reason,
        booking_target, sales_user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'CLIENT', ?, '', ?, ?, ?, ?)
    `);

    const info = insertBooking.run(
      slotId || null,
      eventId || null,
      finalClientId,
      bookingDate,
      bStartTime,
      bEndTime,
      displayTime,
      name,
      email || '',
      phone || '',
      companyName || '',
      purpose,
      finalLocation,
      effectiveMeetLink,
      notes || '',
      targetHost,
      salesUserId,
      nowIso,
      nowIso
    );

    const bookingId = info.lastInsertRowid;

    // Update slot to BOOKED if regular slot
    if (slotId) {
      db.prepare("UPDATE admin_slots SET status = 'BOOKED', booking_id = ? WHERE id = ?").run(bookingId, slotId);
    }

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
          `Sales Consultation - ${name}`,
          name,
          companyName || 'Client Booking',
          email || '',
          phone || '',
          salesUserId || 'lead',
          'GENTIZE LEAD',
          bookingDate,
          bStartTime,
          bEndTime,
          finalLocation?.includes('Online') || effectiveMeetLink ? 'Online' : 'In-Person',
          effectiveMeetLink || `https://meet.google.com/${generateMeetCode()}`,
          purpose,
          notes || purpose,
          'Scheduled',
          0,
          '',
          '',
          notes || purpose,
          '',
          bookingId,
          nowIso,
          nowIso
        );
      } catch (smErr) {
        console.error('Error auto-syncing to sales_meetings:', smErr);
      }
    }

    // In-app notifications with full booking metadata
    try {
      const recipientTarget = isSalesLead ? 'Sales Team Lead' : 'MD Executive Office';
      const notifTitle = isSalesLead ? 'New Booking Request with Sales Team Lead' : 'New Client Appointment Booking Request';

      db.prepare(`
        INSERT INTO notifications (
          booking_id, type, title, message, is_read, recipient,
          client_name, booking_date, display_time, booking_status, location,
          status, delivered_at, created_at, updated_at, booking_source
        ) VALUES (?, 'PUSH', ?, ?, 0, ?, ?, ?, ?, 'PENDING', ?, 'DELIVERED', ?, ?, ?, 'CLIENT')
      `).run(
        bookingId,
        notifTitle,
        `New appointment request received from Client ${name} (${companyName || 'Client'}) with ${isSalesLead ? 'Sales Team Lead (GENTIZE LEAD)' : 'MD'} for ${bookingDate} at ${displayTime}.`,
        recipientTarget,
        name,
        bookingDate,
        displayTime,
        finalLocation,
        nowIso,
        nowIso,
        nowIso
      );

      // In-app notification for Client
      db.prepare(`
        INSERT INTO notifications (
          booking_id, type, title, message, is_read, recipient,
          client_name, booking_date, display_time, booking_status, location,
          status, delivered_at, created_at, updated_at, booking_source
        ) VALUES (?, 'PUSH', 'Appointment Dispatched to MD', ?, 0, ?, ?, ?, ?, 'PENDING', ?, 'DELIVERED', ?, ?, ?, 'CLIENT')
      `).run(
        bookingId,
        `Your meeting request for ${bookingDate} at ${displayTime} has been submitted to MD. Review and confirmation in progress.`,
        name,
        name,
        bookingDate,
        displayTime,
        effectiveLocation,
        nowIso,
        nowIso,
        nowIso
      );

      db.prepare(`
        INSERT INTO notifications (
          booking_id, type, title, message, is_read, recipient,
          client_name, booking_date, display_time, booking_status, location,
          status, delivered_at, created_at, updated_at
        ) VALUES (?, 'EMAIL', 'Appointment Confirmation Pending', ?, 0, ?, ?, ?, ?, 'PENDING', ?, 'DELIVERED', ?, ?, ?)
      `).run(
        bookingId,
        `Confirmation email pending for ${name} (${email || phone || 'Client'}) for ${bookingDate} at ${displayTime}.`,
        email || phone || 'md@meeetly.com',
        name,
        bookingDate,
        displayTime,
        effectiveLocation,
        nowIso,
        nowIso,
        nowIso
      );
    } catch (notifErr) {
      console.error('Error inserting booking notification:', notifErr);
    }


    res.status(201).json({
      success: true,
      message: 'Appointment request submitted successfully. Awaiting MD confirmation.',
      client: clientAccount ? {
        id: clientAccount.id || clientAccount.username,
        name: clientAccount.name,
        username: clientAccount.username,
        email: clientAccount.email,
        phone: clientAccount.phone,
        company: clientAccount.company,
      } : null,
      booking: {
        id: bookingId,
        date: bookingDate,
        displayTime,
        client_name: name,
        meeting_link: effectiveMeetLink,
        status: 'PENDING',
      },
    });
  } catch (err) {
    console.error('Error in public booking:', err);
    res.status(500).json({ error: 'Failed to create booking', message: err.message });
  }
});

// -------------------------------------------------------------
// POST /api/public/reschedule
// -------------------------------------------------------------
router.post('/reschedule', (req, res) => {
  try {
    const { bookingId, newSlotId, reason = 'Client Requested Reschedule' } = req.body;
    const booking = db.prepare('SELECT * FROM admin_bookings WHERE id = ?').get(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const nowIso = new Date().toISOString();

    if (newSlotId) {
      const slot = db.prepare('SELECT * FROM admin_slots WHERE id = ?').get(newSlotId);
      if (!slot) return res.status(404).json({ error: 'Target slot not found' });

      if (booking.slot_id) {
        db.prepare("UPDATE admin_slots SET status = 'AVAILABLE', booking_id = null WHERE id = ?").run(booking.slot_id);
      }
      db.prepare("UPDATE admin_slots SET status = 'BOOKED', booking_id = ? WHERE id = ?").run(bookingId, newSlotId);

      db.prepare(`
        UPDATE admin_bookings
        SET slot_id = ?, date = ?, start_time = ?, end_time = ?, display_time = ?, status = 'PENDING', notes = notes || ' | Reschedule reason: ' || ?, updated_at = ?
        WHERE id = ?
      `).run(slot.id, slot.date, slot.start_time, slot.end_time, slot.display_time, reason, nowIso, bookingId);
    }

    res.json({ success: true, message: 'Reschedule request submitted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reschedule booking', message: err.message });
  }
});

// -------------------------------------------------------------
// POST /api/public/cancel
// -------------------------------------------------------------
router.post('/cancel', (req, res) => {
  try {
    const { bookingId, reason = 'Cancelled by Client' } = req.body;
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

    res.json({ success: true, message: 'Booking cancelled.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel booking', message: err.message });
  }
});

// -------------------------------------------------------------
// POST /api/public/recreate-meet
// -------------------------------------------------------------
router.post('/recreate-meet', (req, res) => {
  try {
    const { bookingId } = req.body;
    const meetCode = generateMeetCode();
    const newLink = `https://meet.google.com/${meetCode}`;
    const nowIso = new Date().toISOString();

    if (bookingId) {
      db.prepare('UPDATE admin_bookings SET meeting_link = ?, updated_at = ? WHERE id = ?').run(newLink, nowIso, bookingId);
    }

    res.json({ success: true, meetingLink: newLink });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create meet link', message: err.message });
  }
});

export default router;
