import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import db from '../db.js';

export const industries = JSON.parse(readFileSync(new URL('../../src/config/industries.json', import.meta.url), 'utf8'));
export const newsBridgeSecret = randomBytes(32).toString('hex');
const COOKIE = 'elevate_admin_news';
const SESSION_MS = 12 * 60 * 60 * 1000;

db.exec(`CREATE TABLE IF NOT EXISTS admin_news_sessions (
  token TEXT PRIMARY KEY, admin_id INTEGER NOT NULL,
  industry TEXT NOT NULL, expires_at INTEGER NOT NULL
)`);

export function createNewsSession(req, res, adminId, industry) {
  const token = randomBytes(32).toString('hex');
  db.prepare('DELETE FROM admin_news_sessions WHERE expires_at <= ?').run(Date.now());
  db.prepare('INSERT INTO admin_news_sessions VALUES (?, ?, ?, ?)').run(token, adminId, industry, Date.now() + SESSION_MS);
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: req.secure, maxAge: SESSION_MS, path: '/' });
}

function sessionToken(req) {
  const cookie = (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${COOKIE}=`));
  return cookie ? cookie.slice(COOKIE.length + 1) : '';
}

export function getNewsSession(req) {
  return db.prepare('SELECT admin_id, industry FROM admin_news_sessions WHERE token = ? AND expires_at > ?').get(sessionToken(req), Date.now());
}

export function clearNewsSession(req, res) {
  db.prepare('DELETE FROM admin_news_sessions WHERE token = ?').run(sessionToken(req));
  res.clearCookie(COOKIE, { path: '/' });
}
