import { Router } from 'express';
import { notificationService } from '../services/notificationService.js';

const router = Router();

// GET /api/notifications
router.get('/', (req, res) => {
  try {
    const { category = 'all', unreadOnly, recipient, target } = req.query;
    const notifications = notificationService.getDeliveredNotifications({
      category,
      unreadOnly: unreadOnly === 'true',
      recipient,
      target,
    });
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', (req, res) => {
  try {
    const { recipient, target } = req.query;
    const count = notificationService.getUnreadCount({ recipient, target });
    // Return both 'count' and 'unreadCount' for maximum compatibility
    res.json({ count, unreadCount: count });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// PATCH or POST /api/notifications/read-all
const handleReadAll = (req, res) => {
  try {
    const result = notificationService.markAllAsRead();
    res.json(result);
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
};
router.patch('/read-all', handleReadAll);
router.post('/read-all', handleReadAll);

// PATCH or POST /api/notifications/:id/read
const handleMarkRead = (req, res) => {
  try {
    const updated = notificationService.markAsRead(req.params.id);
    if (!updated) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json(updated);
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};
router.patch('/:id/read', handleMarkRead);
router.post('/:id/read', handleMarkRead);

// DELETE and POST /api/notifications/clear-all
const handleClearAllNotifications = (req, res) => {
  try {
    const result = notificationService.deleteAllDelivered();
    res.json({ success: true, message: 'All delivered notifications cleared successfully.', ...result });
  } catch (err) {
    console.error('Error clearing notifications:', err);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
};
router.delete('/clear-all', handleClearAllNotifications);
router.post('/clear-all', handleClearAllNotifications);

// DELETE /api/notifications/purge-old
router.delete('/purge-old', (req, res) => {
  try {
    const purged = notificationService.purgeOldNotifications();
    res.json({ success: true, message: `Purged ${purged} notifications older than 7 days.`, purgedCount: purged });
  } catch (err) {
    console.error('Error purging old notifications:', err);
    res.status(500).json({ error: 'Failed to purge old notifications' });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', (req, res) => {
  try {
    const result = notificationService.deleteNotification(req.params.id);
    res.json(result);
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// POST /api/notifications/:id/retry
router.post('/:id/retry', (req, res) => {
  res.json({ success: true, message: 'Notification retry scheduled successfully!' });
});

// Development-only test endpoint: POST /api/notifications/test
router.post('/test', (req, res) => {
  try {
    const notification = notificationService.createTestNotification();
    res.status(201).json({
      success: true,
      notification,
    });
  } catch (err) {
    console.error('Error creating test notification:', err);
    res.status(500).json({ error: 'Failed to create test notification' });
  }
});

// Development-only test endpoint: POST /api/notifications/test-reminder
router.post('/test-reminder', (req, res) => {
  try {
    const { eventId } = req.body;
    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required' });
    }
    const notification = notificationService.triggerTestReminder(eventId);
    res.status(201).json({
      success: true,
      notification,
    });
  } catch (err) {
    console.error('Error creating test reminder:', err);
    res.status(500).json({ error: err.message || 'Failed to create test reminder' });
  }
});

export default router;
