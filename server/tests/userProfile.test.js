import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import db from '../db.js';
import userRouter from '../routes/user.js';

test('new staff and admin accounts can log in and load/save their own profile', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/user', userRouter);
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const base = `http://127.0.0.1:${server.address().port}/api/user`;
  const created = [];
  try {
    for (const role of ['USER', 'ADMIN']) {
      const email = `profile-regression-${role}-${Date.now()}@example.test`;
      const info = db.prepare('INSERT INTO admin_users (name, email, phone, role, password, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(`Profile ${role}`, email, '', role, 'regression-password', new Date().toISOString());
      created.push(info.lastInsertRowid);
      const login = await fetch(`${base}/login`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({userId: email, password: 'regression-password'})});
      assert.equal(login.status, 200);
      const account = (await login.json()).user;
      const response = await fetch(`${base}/profile?id=${account.id}`);
      assert.equal(response.status, 200);
      const profile = (await response.json()).user;
      assert.equal(profile.id, account.id);
      assert.equal(profile.name, account.name);
      assert.equal(profile.role, role);
      assert.equal('password' in profile, false);
      const saved = await fetch(`${base}/profile`, {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({...profile, name: 'Updated profile'})});
      assert.equal(saved.status, 200);
      assert.equal((await saved.json()).user.name, 'Updated profile');
      assert.equal((await (await fetch(`${base}/profile?id=${account.id}`)).json()).user.name, 'Updated profile');
    }
    const missing = await fetch(`${base}/profile?id=-999999`);
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).success, false);
  } finally {
    for (const id of created) db.prepare('DELETE FROM admin_users WHERE id = ?').run(id);
    await new Promise(resolve => server.close(resolve));
  }
});
