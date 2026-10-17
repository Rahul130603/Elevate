import test from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = 'http://127.0.0.1:5000/api/sales-meetings';

test('Sales Meetings API Test Suite', async (t) => {
  await t.test('1. GET /api/sales-meetings returns demo meetings and stats', async () => {
    const res = await fetch(BASE_URL);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.meetings));
    assert.ok(data.meetings.length >= 6);
    assert.ok(data.stats.totalMeetings >= 6);
    assert.ok(data.stats.pipelineValue > 0);

    // Verify purpose and discussionNotes exist on meetings
    const first = data.meetings[0];
    assert.ok(first.purpose);
    assert.ok(first.discussionNotes);
    assert.ok(first.clientCompany);
  });

  await t.test('2. GET /api/sales-meetings/reps returns sales team accounts', async () => {
    const res = await fetch(`${BASE_URL}/reps`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.reps));
    assert.ok(data.reps.length >= 3);
    const priya = data.reps.find(r => r.userId === 'sales.priya@meeetly.com');
    assert.ok(priya);
    assert.equal(priya.name, 'Priya Sharma');
    assert.equal(priya.password, 'sales123');
  });

  await t.test('3. POST /api/sales-meetings/auth verifies sales credentials', async () => {
    // Valid login
    const validRes = await fetch(`${BASE_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'sales.alex@meeetly.com', password: 'sales123' })
    });
    assert.equal(validRes.status, 200);
    const validData = await validRes.json();
    assert.equal(validData.success, true);
    assert.equal(validData.user.name, 'Alex Mercer');

    // Invalid login
    const invalidRes = await fetch(`${BASE_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'sales.alex@meeetly.com', password: 'wrongpassword' })
    });
    assert.equal(invalidRes.status, 401);
  });

  let createdMeetingId;

  await t.test('4. POST /api/sales-meetings creates a new meeting with purpose & discussion', async () => {
    const payload = {
      meetingTitle: 'Test FinTech API Integration Demo',
      clientName: 'Sanjay Gupta',
      clientCompany: 'NeoBank Global',
      clientEmail: 'sanjay@neobank.co',
      clientPhone: '+1 (555) 777-8888',
      salesUserId: 'sales.alex@meeetly.com',
      salesRepName: 'Alex Mercer',
      salesPassword: 'sales123',
      meetingDate: '2026-09-25',
      startTime: '03:00 PM',
      endTime: '03:45 PM',
      meetingType: 'Online',
      meetingLink: 'https://meet.meeetly.com/neobank-demo',
      purpose: 'Technical Architecture & Compliance Deep-Dive',
      discussionNotes: 'Discussed API webhooks for instant calendar synchronization. Client requires sub-50ms latency for booking webhooks and ISO27001 certification. Team walked through sandbox API docs.',
      dealStage: 'Proposal Sent',
      dealValue: 35000,
      actionItems: 'Provide NeoBank dev team with API sandbox keys by Friday.'
    };

    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.meeting.clientCompany, 'NeoBank Global');
    assert.equal(data.meeting.purpose, 'Technical Architecture & Compliance Deep-Dive');
    assert.ok(data.meeting.discussionNotes.includes('API webhooks'));
    createdMeetingId = data.meeting.id;
  });

  await t.test('5. PUT /api/sales-meetings/:id updates discussion notes and deal stage', async () => {
    assert.ok(createdMeetingId);
    const res = await fetch(`${BASE_URL}/${createdMeetingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dealStage: 'Won / Closed',
        adminNotes: 'Approved enterprise discount. High-priority FinTech client.'
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.meeting.dealStage, 'Won / Closed');
    assert.equal(data.meeting.adminNotes, 'Approved enterprise discount. High-priority FinTech client.');
  });

  await t.test('6. DELETE /api/sales-meetings/:id removes test meeting', async () => {
    assert.ok(createdMeetingId);
    const res = await fetch(`${BASE_URL}/${createdMeetingId}`, {
      method: 'DELETE'
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);

    // Verify 404 on get
    const getRes = await fetch(`${BASE_URL}/${createdMeetingId}`);
    assert.equal(getRes.status, 404);
  });
});
