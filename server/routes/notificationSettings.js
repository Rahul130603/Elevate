import { Router } from 'express';
import { notificationService } from '../services/notificationService.js';

const router = Router();

// GET /api/notification-settings
router.get('/', (req, res) => {
  try {
    const settings = notificationService.getSettings();
    res.json(settings);
  } catch (err) {
    console.error('Error fetching notification settings:', err);
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
});

// PUT /api/notification-settings
router.put('/', (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Invalid notification settings' });
    }

    // Check if body has any settings keys
    const allowedKeys = [
      'reminder1Day', 'remind1Day',
      'reminder1Hour', 'remind1Hour',
      'reminder15Min', 'remind15Min',
      'eventCreated', 'notifyCreated',
      'eventUpdated', 'notifyUpdated',
      'eventCancelled', 'notifyCancelled',
      'inAppEnabled', 'channelInApp',
      'browserEnabled', 'channelBrowser',
      'deviceEnabled', 'channelDevice'
    ];

    // Validate that if a key is present, it must be boolean
    for (const key of Object.keys(body)) {
      if (allowedKeys.includes(key)) {
        if (typeof body[key] !== 'boolean') {
          return res.status(400).json({ error: 'Invalid notification settings' });
        }
      }
    }

    const updated = notificationService.updateSettings(body);
    res.json(updated);
  } catch (err) {
    console.error('Error updating notification settings:', err);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

export default router;
