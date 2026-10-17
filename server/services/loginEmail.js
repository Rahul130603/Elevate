import nodemailer from 'nodemailer';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loginEmailHtml, clientPortalUrl } from './loginEmailTemplate.js';
import db from '../db.js';

db.exec(`CREATE TABLE IF NOT EXISTS login_emails (
  id TEXT PRIMARY KEY, recipient TEXT NOT NULL, name TEXT NOT NULL,
  signed_in_at TEXT NOT NULL, status TEXT DEFAULT 'pending', attempts INTEGER DEFAULT 0,
  next_attempt_at INTEGER DEFAULT 0, sent_at TEXT
)`);
export function mailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MAIL_FROM);
}
export function loginEmailMessage(email) {
  const time = new Date(email.signed_in_at).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short'});
  return {
    from: {name: 'Elevate', address: process.env.MAIL_FROM},
    to: email.recipient,
    subject: 'You’re signed in to Elevate',
    text: `Hello ${email.name},\n\nYou successfully signed in to the Elevate Client Portal with your Google account.\n\nAccount: ${email.recipient}\nMethod: Google Sign-In\nTime: ${time} (India time)\n\nOpen Client Portal: ${clientPortalUrl()}\n\nIf this was not you, review your Google account security at https://myaccount.google.com/security and contact the Elevate administrator.\n\nThe Elevate Team\nCalendar & Appointment Management`,
    html: loginEmailHtml(email),
    attachments: [{filename: 'elevate.png', path: fileURLToPath(new URL('../../public/logo.png', import.meta.url)), cid: 'elevate-login-logo', contentDisposition: 'inline', contentType: 'image/png'}],
  };
}
let sending = false;
export async function deliverLoginEmails(transportOverride) {
  if (sending || (!transportOverride && !mailConfigured())) return;
  sending = true;
  try {
    const transport = transportOverride || nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      requireTLS: process.env.SMTP_PORT !== '465',
      auth: {user: process.env.SMTP_USER, pass: process.env.SMTP_PASS},
      connectionTimeout: 10000, socketTimeout: 15000,
    });
    const emails = db.prepare("SELECT * FROM login_emails WHERE status = 'pending' AND next_attempt_at <= ? ORDER BY signed_in_at LIMIT 10").all(Date.now());
    for (const email of emails) {
      try {
        const result = await transport.sendMail(loginEmailMessage(email));
        if (!result.accepted?.some(address => String(address).toLowerCase() === email.recipient.toLowerCase())) throw new Error('Recipient not accepted');
        db.prepare("UPDATE login_emails SET status = 'sent', sent_at = ?, attempts = attempts + 1 WHERE id = ?").run(new Date().toISOString(), email.id);
      } catch (_) {
        const attempts = email.attempts + 1;
        db.prepare('UPDATE login_emails SET attempts = ?, status = ?, next_attempt_at = ? WHERE id = ?').run(attempts, attempts >= 5 ? 'failed' : 'pending', Date.now() + 60000 * 2 ** attempts, email.id);
        console.warn('[Login email] Delivery failed; retry scheduled.');
      }
    }
  } finally { sending = false; }
}
export function queueLoginEmail(account) {
  const id = randomUUID();
  db.prepare('INSERT INTO login_emails (id, recipient, name, signed_in_at) VALUES (?, ?, ?, ?)').run(id, account.email, account.name, new Date().toISOString());
  void deliverLoginEmails();
  return id;
}
export function startLoginEmailWorker() {
  void deliverLoginEmails();
  const timer = setInterval(() => void deliverLoginEmails(), 60000);
  timer.unref();
}
