import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { verifyGoogleCredential, issueGoogleNonce, consumeGoogleNonce } from '../services/googleAuth.js';
import { loginEmailMessage, deliverLoginEmails } from '../services/loginEmail.js';
import db from '../db.js';
const { privateKey, publicKey } = generateKeyPairSync('rsa', {modulusLength: 2048});
const verifier = new OAuth2Client();
verifier.getFederatedSignonCertsAsync = async () => ({certs: {test: publicKey.export({type: 'spki', format: 'pem'})}});
const audience = 'test.apps.googleusercontent.com';
const token = (changes = {}) => {
 const now = Math.floor(Date.now()/1000);
 const payload = {iss:'https://accounts.google.com', aud:audience, sub:'google-123', email:'client@example.com', email_verified:true, name:'Test Client', nonce:'nonce', iat:now, exp:now+3600, ...changes};
 const body = Buffer.from(JSON.stringify({alg:'RS256',kid:'test'})).toString('base64url')+'.'+Buffer.from(JSON.stringify(payload)).toString('base64url');
 return body+'.'+sign('RSA-SHA256',Buffer.from(body),privateKey).toString('base64url');
};
test('Google login validates signed tokens, audience, expiry, nonce and email',async()=>{
 const options = {audience, verifier};
 const user = await verifyGoogleCredential(token(), 'nonce', options);
 assert.equal(user.email,'client@example.com');
 for (const changes of [{aud:'attacker'}, {exp:1}, {email_verified:false}, {nonce:'wrong'}, {iss:'https://attacker.example'}]) {
  await assert.rejects(verifyGoogleCredential(token(changes),'nonce',options), error => error.status===401);
 }
 const forged = token().split('.');forged[1]=Buffer.from(JSON.stringify({email:'attacker@example.com'})).toString('base64url');
 await assert.rejects(verifyGoogleCredential(forged.join('.'),'nonce',options));
 await assert.rejects(verifyGoogleCredential('', 'nonce', options));
});
test('Google challenge cannot be reused',()=>{
 const nonce = issueGoogleNonce(); assert.equal(consumeGoogleNonce(nonce),nonce); assert.equal(consumeGoogleNonce(nonce),undefined);
});
test('Email only marks successful SMTP acceptance as sent; failure is retried',async()=>{
 db.exec('BEGIN');
 try {
  db.prepare("INSERT INTO login_emails (id,recipient,name,signed_in_at) VALUES ('test-login-mail','client@example.com','Test Client',?)").run(new Date().toISOString());
  const message=loginEmailMessage(db.prepare("SELECT * FROM login_emails WHERE id='test-login-mail'").get());
  assert.equal(message.to,'client@example.com');assert.match(message.subject,/signed in to Elevate/);assert.match(message.text,/India time/);
  await deliverLoginEmails({sendMail:async()=>{throw new Error('SMTP unavailable');}});
  let row=db.prepare("SELECT * FROM login_emails WHERE id='test-login-mail'").get();assert.equal(row.status,'pending');assert.equal(row.attempts,1);assert.ok(row.next_attempt_at>Date.now());
  db.prepare("UPDATE login_emails SET next_attempt_at=0 WHERE id='test-login-mail'").run();
  await deliverLoginEmails({sendMail:async mail=>({accepted:[mail.to]})});
  row=db.prepare("SELECT * FROM login_emails WHERE id='test-login-mail'").get();assert.equal(row.status,'sent');assert.ok(row.sent_at);
 } finally {db.exec('ROLLBACK');}
});
