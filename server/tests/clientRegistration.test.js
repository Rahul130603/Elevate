import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { randomUUID } from 'node:crypto';
import publicRouter from '../routes/public.js';
import db from '../db.js';

test('Registration is unique across devices, preserves credentials, and existing accounts can log in', async () => {
  const app = express(); app.use(express.json()); app.use('/api/public',publicRouter);
  const server = app.listen(0,'127.0.0.1');
  await new Promise(resolve => server.once('listening',resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/public`;
  // Independent requests do not share browser storage or cookies.
  const post = (path,body) => fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const email = `registration-${randomUUID()}@example.com`;
  db.exec('BEGIN');
  try {
    const created = await post('/client-register',{name:'Original Client',email,password:'original-password'});
    assert.equal(created.status,201);
    const id = (await created.json()).client.id;
    const original = db.prepare('SELECT * FROM client_accounts WHERE id=?').get(id);
    for (const variant of [email,`  ${email.toUpperCase()}  `]) {
      const duplicate = await post('/client-register',{name:'Replacement',email:variant,password:'replacement-password',company:'Changed'});
      assert.equal(duplicate.status,409);
      assert.deepEqual(await duplicate.json(),{code:'ACCOUNT_EXISTS',error:'You already have an account. Please sign in.'});
      assert.deepEqual(db.prepare('SELECT * FROM client_accounts WHERE id=?').get(id),original);
    }
    const login = await post('/client-login',{email:email.toUpperCase(),password:'original-password'});
    assert.equal(login.status,200);
    assert.equal((await login.json()).client.id,id);
    assert.equal((await post('/client-login',{email,password:'replacement-password'})).status,401);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM client_accounts WHERE LOWER(TRIM(email))=?').get(email).n,1);
    assert.throws(() => db.prepare('INSERT INTO client_accounts(id,name,username,email,password,created_at) VALUES(?,?,?,?,?,?)').run(randomUUID(),'Duplicate',randomUUID(),email.toUpperCase(),'bad',new Date().toISOString()),/UNIQUE/);

    const concurrentEmail = `concurrent-${randomUUID()}@example.com`;
    const results = await Promise.all([post('/client-register',{name:'First',email:concurrentEmail,password:'first'}),post('/client-register',{name:'Second',email:concurrentEmail.toUpperCase(),password:'second'})]);
    assert.deepEqual(results.map(result=>result.status).sort(),[201,409]);

    const googleEmail = `google-${randomUUID()}@example.com`;
    const googleId = randomUUID();
    db.prepare('INSERT INTO client_accounts(id,name,username,email,password,created_at) VALUES(?,?,?,?,?,?)').run(googleId,'Google Client',googleId,googleEmail,'unpredictable-google-password',new Date().toISOString());
    assert.equal((await post('/client-register',{name:'Replacement',email:googleEmail.toUpperCase(),password:'replacement'})).status,409);
    assert.equal(db.prepare('SELECT password FROM client_accounts WHERE id=?').get(googleId).password,'unpredictable-google-password');
  } finally {
    db.exec('ROLLBACK');
    await new Promise(resolve=>server.close(resolve));
  }
});
