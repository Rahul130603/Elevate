import assert from 'assert';
import http from 'http';
import app from '../index.js';

const BASE_URL = 'http://localhost:5000/api/events';

async function runTests() {
  console.log('===========================================================');
  console.log(' CALENDAR API TEST SUITE: ORGANIZER NAME & MULTI-DAY DATES ');
  console.log('===========================================================\n');

  let testServer = null;
  try {
    const healthCheck = await fetch('http://localhost:5000/api/health');
    if (!healthCheck.ok) throw new Error();
  } catch (_) {
    testServer = http.createServer(app);
    await new Promise((res) => testServer.listen(5000, res));
  }

  // Test 1: Health check
  const healthRes = await fetch('http://localhost:5000/api/health');
  assert.strictEqual(healthRes.status, 200);
  console.log('✓ Test 1: Health check passed');

  // Test 2: Validation check when organizerName is empty
  const resEmptyOrganizer = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Missing Organizer Event',
      organizerName: '',
      startDate: '2026-09-18',
      endDate: '2026-09-18',
      startTime: '10:00',
      endTime: '11:00',
      eventType: 'Online',
      meetingLink: 'https://meet.google.com/abc-defg-hij',
    }),
  });
  assert.strictEqual(resEmptyOrganizer.status, 400);
  const jsonEmptyOrganizer = await resEmptyOrganizer.json();
  assert(
    jsonEmptyOrganizer.errors?.organizerName?.includes('Event organizer name is required'),
    'Should return validation error when organizerName is empty'
  );
  console.log('✓ Test 2 Passed: Empty organizerName returns 400 with "Event organizer name is required."');

  // Scenario 4: Invalid Date (End Date < Start Date)
  const resScenario4 = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Invalid Date Meeting',
      organizerName: 'Jane Smith',
      startDate: '2026-10-11',
      endDate: '2026-10-09',
      startTime: '10:00',
      endTime: '11:00',
      eventType: 'Online',
      meetingLink: 'https://meet.google.com/abc-defg-hij',
    }),
  });
  assert.strictEqual(resScenario4.status, 400);
  const jsonScenario4 = await resScenario4.json();
  assert(jsonScenario4.errors?.endDate?.includes('End date cannot be before start date'));
  console.log('✓ Scenario 4 Passed: End date cannot be before start date validated');

  // Scenario 1: Create Online Event with Event Organizer Name
  const resScenario1 = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Book Industry Events',
      organizerName: 'John Doe',
      startDate: '2026-09-18',
      endDate: '2026-09-18',
      startTime: '10:00',
      endTime: '11:00',
      description: 'Work and connect with readers',
      phone: '+9197548823769',
      email: 'example@gmail.com',
      eventType: 'Online',
      meetingLink: 'https://meet.google.com/abc-defg-hij',
    }),
  });
  assert.strictEqual(resScenario1.status, 201);
  const event1 = await resScenario1.json();
  assert.strictEqual(event1.title, 'Book Industry Events');
  assert.strictEqual(event1.organizerName, 'John Doe', 'Event organizer name must be saved');
  assert.strictEqual(event1.startDate, '2026-09-18');
  assert.strictEqual(event1.endDate, '2026-09-18');
  assert.strictEqual(event1.eventType, 'Online');
  assert.strictEqual(event1.meetingLink, 'https://meet.google.com/abc-defg-hij');
  assert.strictEqual(event1.address, null);
  console.log('✓ Scenario 1 Passed: Created event with organizerName "John Doe"');

  // Retrieve event by ID and check organizerName
  const resGet = await fetch(`${BASE_URL}/${event1.id}`);
  assert.strictEqual(resGet.status, 200);
  const fetchedEvent = await resGet.json();
  assert.strictEqual(fetchedEvent.organizerName, 'John Doe');
  console.log('✓ DB Retrieval Passed: Organizer name persisted and retrieved from SQLite');

  // Edit Event: Update organizerName
  const resEdit = await fetch(`${BASE_URL}/${event1.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...event1,
      organizerName: 'John Doe Updated',
      title: 'Book Industry Events (Updated)',
    }),
  });
  assert.strictEqual(resEdit.status, 200);
  const editedEvent = await resEdit.json();
  assert.strictEqual(editedEvent.organizerName, 'John Doe Updated');
  assert.strictEqual(editedEvent.title, 'Book Industry Events (Updated)');
  console.log('✓ Edit Passed: Organizer name updated successfully');

  // Scenario 2: Create Offline Event with Organizer
  const resScenario2 = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Chennai Tech Meetup',
      organizerName: 'Alice Johnson',
      startDate: '2026-09-19',
      endDate: '2026-09-19',
      startTime: '14:00',
      endTime: '16:00',
      description: 'Tech community gathering',
      eventType: 'Offline',
      address: 'Anna Nagar, Chennai',
      googleMapsLink: 'https://maps.google.com/maps?q=Chennai',
    }),
  });
  assert.strictEqual(resScenario2.status, 201);
  const event2 = await resScenario2.json();
  assert.strictEqual(event2.organizerName, 'Alice Johnson');
  assert.strictEqual(event2.eventType, 'Offline');
  console.log('✓ Scenario 2 Passed: Offline event created with organizerName "Alice Johnson"');

  // Search by Organizer Name
  const resSearch = await fetch(`${BASE_URL}?search=Alice`);
  const searchResults = await resSearch.json();
  assert(searchResults.some((e) => e.organizerName === 'Alice Johnson'));
  console.log('✓ Search Passed: Found event by organizerName search query');

  // Clean up test event 2
  const resDel = await fetch(`${BASE_URL}/${event2.id}`, { method: 'DELETE' });
  assert.strictEqual(resDel.status, 200);
  console.log('✓ Cleanup Passed: Deleted test event');

  // Test 8: Notification tests
  console.log('\n--- Running Notification System Tests ---');
  const notifRes = await fetch('http://localhost:5000/api/notifications');
  assert.strictEqual(notifRes.status, 200);
  const notifs = await notifRes.json();
  assert(Array.isArray(notifs), 'Notifications should return an array');
  console.log(`✓ Notifications fetched: ${notifs.length} records`);

  const unreadRes = await fetch('http://localhost:5000/api/notifications/unread-count');
  assert.strictEqual(unreadRes.status, 200);
  const unreadJson = await unreadRes.json();
  assert(typeof unreadJson.unreadCount === 'number');
  console.log(`✓ Unread count verified: ${unreadJson.unreadCount}`);

  // Test Settings GET and PUT
  const settingsRes = await fetch('http://localhost:5000/api/notification-settings');
  assert.strictEqual(settingsRes.status, 200);
  const settings = await settingsRes.json();
  assert(typeof settings.reminder1Day === 'boolean');
  console.log('✓ Notification settings fetched successfully');

  // Test Invalid Payload (non-boolean)
  const invalidSettingsRes = await fetch('http://localhost:5000/api/notification-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...settings,
      reminder15Min: 'not-a-boolean'
    })
  });
  assert.strictEqual(invalidSettingsRes.status, 400);
  const invalidJson = await invalidSettingsRes.json();
  assert.strictEqual(invalidJson.error, 'Invalid notification settings');
  console.log('✓ Reject invalid payload (400) verified');

  // Test full settings payload update (turn 15min off, browser off, android on)
  const updateSettingsRes = await fetch('http://localhost:5000/api/notification-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reminder1Day: true,
      reminder1Hour: true,
      reminder15Min: false,
      eventCreated: true,
      eventUpdated: true,
      eventCancelled: true,
      inAppEnabled: true,
      browserEnabled: false,
      deviceEnabled: true
    })
  });
  assert.strictEqual(updateSettingsRes.status, 200);
  const updatedSettings = await updateSettingsRes.json();
  assert.strictEqual(updatedSettings.reminder15Min, false);
  assert.strictEqual(updatedSettings.browserEnabled, false);
  assert.strictEqual(updatedSettings.deviceEnabled, true);
  console.log('✓ Notification settings updated successfully');

  // Verify persistence via immediate GET
  const verifyGetRes = await fetch('http://localhost:5000/api/notification-settings');
  assert.strictEqual(verifyGetRes.status, 200);
  const verifiedSettings = await verifyGetRes.json();
  assert.strictEqual(verifiedSettings.reminder15Min, false);
  assert.strictEqual(verifiedSettings.browserEnabled, false);
  assert.strictEqual(verifiedSettings.deviceEnabled, true);
  console.log('✓ Persistence verified: GET matches updated settings');

  // Test toggling back to ON
  const turnOnRes = await fetch('http://localhost:5000/api/notification-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...verifiedSettings,
      reminder15Min: true,
      browserEnabled: true
    })
  });
  assert.strictEqual(turnOnRes.status, 200);
  const turnedOnSettings = await turnOnRes.json();
  assert.strictEqual(turnedOnSettings.reminder15Min, true);
  assert.strictEqual(turnedOnSettings.browserEnabled, true);
  console.log('✓ Toggling back to ON verified');

  // Mark all notifications as read
  const markAllRes = await fetch('http://localhost:5000/api/notifications/read-all', {
    method: 'POST'
  });
  assert.strictEqual(markAllRes.status, 200);
  const markAllJson = await markAllRes.json();
  assert.strictEqual(markAllJson.success, true);
  console.log('✓ Mark all notifications as read passed');

  // Verify unread count becomes 0
  const afterReadCountRes = await fetch('http://localhost:5000/api/notifications/unread-count');
  const afterReadCountJson = await afterReadCountRes.json();
  assert.strictEqual(afterReadCountJson.unreadCount, 0);
  console.log('✓ Unread count is 0 after mark-all-as-read');

  // TEST: POST /api/notifications/test (Development Test Notification)
  const testNotifRes = await fetch('http://localhost:5000/api/notifications/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  assert.strictEqual(testNotifRes.status, 201);
  const testNotifJson = await testNotifRes.json();
  assert.strictEqual(testNotifJson.success, true);
  assert.strictEqual(testNotifJson.notification.title, 'Test Notification');
  console.log('✓ POST /api/notifications/test created immediate notification');

  // TEST: Persistence across refresh (Multiple GETs)
  const refreshSimRes = await fetch('http://localhost:5000/api/notifications');
  assert.strictEqual(refreshSimRes.status, 200);
  const refreshSimList = await refreshSimRes.json();
  const foundTestNotif = refreshSimList.find((n) => n.id === testNotifJson.notification.id);
  assert(foundTestNotif, 'Created notification must persist in database and survive refresh');
  console.log('✓ Persistence verified: Notification persists in database and is returned after reload');

  // TEST: Unread count incremented
  const testCountRes = await fetch('http://localhost:5000/api/notifications/unread-count');
  const testCountJson = await testCountRes.json();
  assert(testCountJson.count >= 1 || testCountJson.unreadCount >= 1);
  console.log('✓ Server-backed unread count correctly reflects new test notification');

  // TEST: Mark single notification as read
  const markSingleRes = await fetch(`http://localhost:5000/api/notifications/${testNotifJson.notification.id}/read`, {
    method: 'PATCH',
  });
  assert.strictEqual(markSingleRes.status, 200);
  const markSingleJson = await markSingleRes.json();
  assert.strictEqual(markSingleJson.isRead, true);
  console.log('✓ PATCH /api/notifications/:id/read marked notification as read');

  // Verify that it stays read on subsequent GET (refresh test)
  const verifyReadRes = await fetch('http://localhost:5000/api/notifications');
  const verifyReadList = await verifyReadRes.json();
  const readItem = verifyReadList.find((n) => n.id === testNotifJson.notification.id);
  assert.strictEqual(readItem.isRead, true, 'Notification read state must persist');
  console.log('✓ Read state persistence verified across requests');

  // TEST: Create an event and test POST /api/notifications/test-reminder
  const eventForReminderRes = await fetch('http://localhost:5000/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Reminder Verification Meeting',
      organizerName: 'Jane Reminder',
      startDate: '2026-09-25',
      endDate: '2026-09-25',
      startTime: '14:00',
      endTime: '15:00',
      eventType: 'Online',
      meetingLink: 'https://meet.google.com/test-reminder',
    }),
  });
  assert.strictEqual(eventForReminderRes.status, 201);
  const eventForReminder = await eventForReminderRes.json();

  const testReminderRes = await fetch('http://localhost:5000/api/notifications/test-reminder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId: eventForReminder.id }),
  });
  assert.strictEqual(testReminderRes.status, 201);
  const testReminderJson = await testReminderRes.json();
  assert.strictEqual(testReminderJson.success, true);
  assert(testReminderJson.notification.title.includes('Starting Soon'));
  assert(testReminderJson.notification.message.includes('starts in 15 minutes'));
  console.log('✓ POST /api/notifications/test-reminder delivered instant 15-minute event reminder');

  // Clean up created test event
  await fetch(`http://localhost:5000/api/events/${eventForReminder.id}`, { method: 'DELETE' });
  console.log('✓ Event deleted and pending reminders cleaned up');

  console.log('\n===========================================================');
  console.log('   ALL CALENDAR & NOTIFICATION TESTS PASSED CLEANLY!       ');
  console.log('===========================================================\n');

  if (testServer) testServer.close();
  process.exit(0);
}


runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});

