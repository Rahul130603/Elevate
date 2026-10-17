import { startLoginEmailWorker } from './services/loginEmail.js';
import { loadEnvFile } from 'node:process';
try { loadEnvFile(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
import { startIndustryNews, proxyIndustryNews } from './services/industryNewsService.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import eventsRouter from './routes/events.js';
import notificationsRouter from './routes/notifications.js';
import notificationSettingsRouter from './routes/notificationSettings.js';
import salesMeetingsRouter from './routes/salesMeetings.js';
import { notificationScheduler } from './services/notificationScheduler.js';
import { startAutoDiscoveryService } from './services/autoDiscoveryService.js';
import { proxyAccessibility } from './services/accessibilityProxy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

import adminRouter from './routes/admin.js';
import bookingsRouter from './routes/bookings.js';
import publicRouter from './routes/public.js';
import userRouter from './routes/user.js';

// API routes
app.use('/admin-news', proxyIndustryNews);
app.use('/accessibility', proxyAccessibility);
app.use('/api/events', eventsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/notification-settings', notificationSettingsRouter);
app.use('/api/sales-meetings', salesMeetingsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/public', publicRouter);
app.use('/api/user', userRouter);


// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Serve frontend build if dist folder exists (for production)
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback for SPA routing in production
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.url.startsWith('/api')) {
    const indexPath = path.join(distPath, 'index.html');
    return res.sendFile(indexPath, (err) => {
      if (err) {
        res.status(200).send('Calendar API Server Running. Please start Vite frontend dev server or run `npm run build`.');
      }
    });
  }
  next();
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Calendar API Server running at http://localhost:${PORT}`);
  notificationScheduler.start();
  startIndustryNews();
  if (process.env.DISABLE_AUTO_DISCOVERY !== '1') startAutoDiscoveryService();
});

// Also bind to port 3000 so http://localhost:3000 works seamlessly without connection refused errors
if (Number(PORT) !== 3000) {
  try {
    const altServer = app.listen(3000, '0.0.0.0', () => {
      console.log(`Also listening at http://localhost:3000`);
    });
    altServer.on('error', (err) => {
      if (err.code !== 'EADDRINUSE') {
        console.error('Port 3000 error:', err.message);
      }
    });
  } catch (_) {}
}

export default app;



startLoginEmailWorker();
