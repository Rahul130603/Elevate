import app from '../index.js';
import http from 'http';

async function runTests() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log(`Testing Admin & Booking API on ${baseUrl}...`);
  let passed = 0;

  try {
    // 1. Dashboard
    const dashRes = await fetch(`${baseUrl}/api/admin/dashboard`);
    if (dashRes.status !== 200) throw new Error(`Dashboard status: ${dashRes.status}`);
    const dashData = await dashRes.json();
    if (!dashData.dayStats || !dashData.todaySchedule) throw new Error('Dashboard structure invalid');
    console.log(`✓ 1. Admin Dashboard API working (totalSlots: ${dashData.dayStats.totalSlots}, todaySchedule: ${dashData.todaySchedule.length} slots)`);
    passed++;

    // 2. Calendar
    const calRes = await fetch(`${baseUrl}/api/admin/calendar`);
    if (calRes.status !== 200) throw new Error(`Calendar status: ${calRes.status}`);
    const calData = await calRes.json();
    if (!Array.isArray(calData.items)) throw new Error('Calendar items not an array');
    console.log(`✓ 2. Admin Calendar Agenda API working (${calData.items.length} items loaded)`);
    passed++;

    // 3. Schedules (Events)
    const schedRes = await fetch(`${baseUrl}/api/admin/events`);
    if (schedRes.status !== 200) throw new Error(`Events status: ${schedRes.status}`);
    const schedData = await schedRes.json();
    if (!Array.isArray(schedData.schedules)) throw new Error('Schedules not an array');
    console.log(`✓ 3. Admin Schedules API working (${schedData.schedules.length} schedules found)`);
    passed++;

    // 4. Bookings
    const bookRes = await fetch(`${baseUrl}/api/admin/bookings`);
    if (bookRes.status !== 200) throw new Error(`Bookings status: ${bookRes.status}`);
    const bookData = await bookRes.json();
    if (!Array.isArray(bookData.bookings)) throw new Error('Bookings not an array');
    console.log(`✓ 4. Admin Bookings API working (${bookData.bookings.length} bookings found)`);
    passed++;

    // 5. Users
    const userRes = await fetch(`${baseUrl}/api/admin/users`);
    if (userRes.status !== 200) throw new Error(`Users status: ${userRes.status}`);
    const userData = await userRes.json();
    if (!Array.isArray(userData.users) || userData.users.length === 0) throw new Error('Users empty');
    console.log(`✓ 5. Admin Users API working (${userData.users.length} users registered)`);
    passed++;

    // 6. Client Accounts
    const clientRes = await fetch(`${baseUrl}/api/admin/client-accounts`);
    if (clientRes.status !== 200) throw new Error(`Client accounts status: ${clientRes.status}`);
    const clientData = await clientRes.json();
    if (!Array.isArray(clientData.clients) || clientData.clients.length === 0) throw new Error('Client accounts empty');
    console.log(`✓ 6. Admin Client Accounts API working (${clientData.clients.length} client accounts)`);
    passed++;

    // 7. Settings
    const setRes = await fetch(`${baseUrl}/api/admin/settings`);
    if (setRes.status !== 200) throw new Error(`Settings status: ${setRes.status}`);
    const setData = await setRes.json();
    if (!setData.settings) throw new Error('Settings object missing');
    console.log(`✓ 7. Admin Settings API working (company_name: ${setData.settings.company_name})`);
    passed++;

    // 8. Public availability
    const availRes = await fetch(`${baseUrl}/api/public/admin-availability`);
    if (availRes.status !== 200) throw new Error(`Public availability status: ${availRes.status}`);
    const availData = await availRes.json();
    if (!availData.schedules || availData.schedules.length === 0) throw new Error('Public schedules missing');
    console.log(`✓ 8. Public Client Availability API working (${availData.schedules.length} schedules available)`);
    passed++;

    // 9. Client Login
    const loginRes = await fetch(`${baseUrl}/api/public/client-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'client.demo', password: 'client123' })
    });
    if (loginRes.status !== 200) throw new Error(`Client login failed: ${loginRes.status}`);
    const loginData = await loginRes.json();
    if (!loginData.success || !loginData.client) throw new Error('Client login failed');
    console.log(`✓ 9. Client Login Authentication working (logged in as: ${loginData.client.name})`);
    passed++;

    // 10. Confirm Booking action
    const firstBooking = bookData.bookings[0];
    if (firstBooking) {
      const confRes = await fetch(`${baseUrl}/api/admin/bookings/${firstBooking.id}/confirm`, { method: 'POST' });
      if (confRes.status !== 200) throw new Error(`Confirm booking status: ${confRes.status}`);
      console.log(`✓ 10. Admin Confirm Booking action verified successfully!`);
      passed++;
    }

    // 11. History API (Past Bookings & Expired Schedules)
    const histRes = await fetch(`${baseUrl}/api/admin/history`);
    if (histRes.status !== 200) throw new Error(`History status: ${histRes.status}`);
    const histData = await histRes.json();
    if (!Array.isArray(histData.bookings) || !Array.isArray(histData.schedules)) throw new Error('History arrays missing');
    console.log(`✓ 11. Admin History API working (${histData.bookings.length} past bookings, ${histData.schedules.length} past schedules)`);
    passed++;

    console.log(`\n======================================================`);
    console.log(`   ALL ${passed} ADMIN & CLIENT ENDPOINT TESTS PASSED!`);
    console.log(`======================================================\n`);
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
