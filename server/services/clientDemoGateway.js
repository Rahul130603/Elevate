import express from 'express';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import db from '../db.js';
const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
const openRoutes = new Map([
 ['GET /api/public/admin-availability', true], ['GET /api/public/google-auth-config', true],
 ['POST /api/public/client-google-auth', true], ['POST /api/public/client-login', true], ['POST /api/public/client-register', true],
 ['GET /api/public/map-search', true], ['GET /api/public/map-reverse', true], ['GET /api/public/place-suggestions', true],
]);
const privateRoutes = new Set([
 'GET /api/public/client-bookings', 'GET /api/public/client-notifications',
 'POST /api/public/client-notifications/clear-all', 'DELETE /api/public/client-notifications/clear-all',
 'POST /api/public/book', 'POST /api/public/reschedule', 'POST /api/public/cancel', 'POST /api/public/recreate-meet',
]);
export function createClientDemoGateway({upstream = 'http://127.0.0.1:3000', fetcher = fetch} = {}) {
 const app = express(), sessions = new Map();
 app.disable('x-powered-by');
 app.set('trust proxy', 1);
 app.use(express.json({limit:'1mb'}));
 const sessionFor = req => {
  const token = req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith('elevate_demo_session='))?.split('=')[1];
  const session = sessions.get(token);
  if (session && session.expires > Date.now()) return session;
  sessions.delete(token); return null;
 };
 const ownsBooking = (id, client) => !!db.prepare("SELECT id FROM admin_bookings WHERE id = ? AND (client_id = ? OR (LOWER(client_email) = ? AND client_email != ''))").get(id,client.id,client.email.toLowerCase());
 app.use((req,res,next)=>{
  res.set('Cache-Control','no-store');
  if (!['GET','HEAD'].includes(req.method) && req.get('origin')) {
   try {if (new URL(req.get('origin')).host !== req.get('host')) return res.status(403).json({error:'Invalid request origin.'});} catch (_) {return res.sendStatus(403);}
  }
  next();
 });
 app.get('/api/public/demo-session',(req,res)=>res.json({client:sessionFor(req)?.client || null}));
 app.post('/api/public/client-logout',(req,res)=>{
  const token=req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith('elevate_demo_session='))?.split('=')[1];
  sessions.delete(token);res.clearCookie('elevate_demo_session');res.json({success:true});
 });
 app.use('/api', async(req,res)=>{
  const url = new URL(req.originalUrl,'http://localhost');
  const route = `${req.method} ${url.pathname}`;
  if (!openRoutes.has(route) && !privateRoutes.has(route)) return res.status(403).json({error:'Only the client portal is available in this demo.'});
  const session = sessionFor(req);
  let body=req.body;
  if (privateRoutes.has(route)) {
   if (!session) return res.status(401).json({error:'Please sign in to your client account.'});
   const client=session.client;
   if (['GET /api/public/client-bookings','GET /api/public/client-notifications'].includes(route) || url.pathname.endsWith('/clear-all')) {
    url.search = '';url.searchParams.set('clientId',client.id);url.searchParams.set('email',client.email);
   }
   if (url.pathname.endsWith('/clear-all')) {
    const result = db.prepare(`DELETE FROM notifications WHERE LOWER(recipient) = ? OR
      (LOWER(recipient) = ? AND booking_id IN (SELECT id FROM admin_bookings WHERE client_id = ? OR LOWER(client_email) = ?))`).run(client.email.toLowerCase(),client.name.toLowerCase(),client.id,client.email.toLowerCase());
    return res.json({success:true,deletedCount:result.changes});
   }
   if (route==='POST /api/public/book') body={...body,name:client.name,email:client.email,clientId:client.id};
   if (['/api/public/reschedule','/api/public/cancel','/api/public/recreate-meet'].includes(url.pathname) && (!body?.bookingId || !ownsBooking(body.bookingId,client))) return res.status(403).json({error:'This booking does not belong to your account.'});
  }
  try {
   const nonce=req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith('elevate_google_nonce='));
   const response=await fetcher(upstream+url.pathname+url.search,{method:req.method,headers:{'content-type':'application/json',...(nonce?{cookie:nonce}:{})},body:['GET','HEAD'].includes(req.method)?undefined:JSON.stringify(body || {}),signal:AbortSignal.timeout(20000),redirect:'manual'});
   for (const cookie of response.headers.getSetCookie()) res.append('Set-Cookie',cookie);
   const data=await response.json();
   if (response.ok && data.success && data.client && ['/api/public/client-google-auth','/api/public/client-login','/api/public/client-register'].includes(url.pathname)) {
    for (const [token,value] of sessions) if (value.expires<=Date.now()) sessions.delete(token);
    const token=randomBytes(32).toString('hex');
    sessions.set(token,{client:data.client,expires:Date.now()+12*60*60*1000});
    res.cookie('elevate_demo_session',token,{httpOnly:true,sameSite:'lax',secure:req.secure,maxAge:12*60*60*1000});
   }
   // The legacy local API also matches client names. Enforce ownership again
   // before any public response leaves this dedicated gateway.
   if (session && Array.isArray(data.bookings)) data.bookings=data.bookings.filter(b=>ownsBooking(b.id,session.client));
   if (session && Array.isArray(data.notifications)) data.notifications=data.notifications.filter(n=>{const recipient=String(n.recipient || '').toLowerCase();return recipient===session.client.email.toLowerCase() || (recipient===session.client.name.toLowerCase() && n.booking_id && ownsBooking(n.booking_id,session.client));});
   res.status(response.status).json(data);
  } catch (_) {res.status(502).json({error:'The local project server is unavailable. Please try again.'});}
 });
 app.get(['/', '/book'],(req,res)=>{
  if (req.query.portal && req.query.portal!=='client') return res.sendStatus(403);
  try {const html=readFileSync(dist+'index.html','utf8').replace('<head>','<head><script>window.__CLIENT_DEMO__=true;</script>');res.type('html').send(html);} catch (_) {res.status(503).send('Build the project before starting the client demo.');}
 });
 app.use((req,res,next)=>{if (!['GET','HEAD'].includes(req.method) || decodeURIComponent(req.path).toLowerCase().endsWith('.html')) return res.sendStatus(404);next();});
 app.use(express.static(dist,{index:false,dotfiles:'deny'}));
 app.use((req,res)=>res.sendStatus(404));
 return app;
}
