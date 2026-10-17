import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationService } from '../services/notificationService.js';

export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(null);

  // Keep a ref to activeCategory so the recurring interval always fetches the current tab
  const categoryRef = useRef(activeCategory);
  useEffect(() => {
    categoryRef.current = activeCategory;
  }, [activeCategory]);

  // Load unread count from server
  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.fetchUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.warn('Failed to refresh unread count:', err);
    }
  }, []);

  // Load notification list from server
  const loadNotifications = useCallback(async (category = categoryRef.current) => {
    try {
      const list = await notificationService.fetchNotifications({ category });
      setNotifications(list);
    } catch (err) {
      console.warn('Failed to load notifications from database:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load notification settings from server
  const loadSettings = useCallback(async () => {
    try {
      const data = await notificationService.fetchSettings();
      setSettings(data);
    } catch (err) {
      console.warn('Failed to load notification settings:', err);
    }
  }, []);

  // 1. Initial load on application mount
  // 2. Continuous 10s live polling
  // 3. Visibility change listener (re-fetch when switching back to tab)
  useEffect(() => {
    setLoading(true);
    // Load immediately on app/page load so data persists across refresh
    Promise.all([
      loadNotifications(categoryRef.current),
      refreshUnreadCount(),
      loadSettings(),
    ]).finally(() => {
      setLoading(false);
    });

    // 10-second polling interval
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshUnreadCount();
        loadNotifications(categoryRef.current);
      }
    }, 10000);

    // Auto-refresh when user returns to browser tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshUnreadCount();
        loadNotifications(categoryRef.current);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadNotifications, refreshUnreadCount, loadSettings]);

  // Load notifications whenever activeCategory changes
  useEffect(() => {
    loadNotifications(activeCategory);
  }, [activeCategory, loadNotifications]);

  // Mark single notification as read (optimistic update with server persistence)
  const handleMarkAsRead = async (id) => {
    const prevNotifications = [...notifications];
    const prevCount = unreadCount;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await notificationService.markAsRead(id);
    } catch (err) {
      console.error('Error marking notification as read on server:', err);
      // Rollback on error
      setNotifications(prevNotifications);
      setUnreadCount(prevCount);
    }
  };

  // Mark all notifications as read (optimistic update with server persistence)
  const handleMarkAllAsRead = async () => {
    const prevNotifications = [...notifications];
    const prevCount = unreadCount;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await notificationService.markAllAsRead();
    } catch (err) {
      console.error('Error marking all notifications as read on server:', err);
      // Rollback on error
      setNotifications(prevNotifications);
      setUnreadCount(prevCount);
    }
  };

  // Delete notification (optimistic update with server persistence)
  const handleDeleteNotification = async (id) => {
    const prevNotifications = [...notifications];

    // Optimistic update
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    try {
      await notificationService.deleteNotification(id);
      refreshUnreadCount();
    } catch (err) {
      console.error('Error deleting notification on server:', err);
      // Rollback on error
      setNotifications(prevNotifications);
    }
  };

  // Save settings to database
  const handleSaveSettings = async (newSettings) => {
    try {
      const updated = await notificationService.updateSettings(newSettings);
      setSettings(updated);
      setIsSettingsOpen(false);
      return updated;
    } catch (err) {
      console.error('Error saving notification settings:', err);
      throw err;
    }
  };

  // Trigger test notification
  const triggerTestNotification = async () => {
    try {
      const res = await notificationService.sendTestNotification();
      await Promise.all([loadNotifications(), refreshUnreadCount()]);
      return res;
    } catch (err) {
      console.error('Error triggering test notification:', err);
      throw err;
    }
  };

  // Trigger test reminder for an event
  const triggerTestReminder = async (eventId) => {
    try {
      const res = await notificationService.sendTestReminder(eventId);
      await Promise.all([loadNotifications(), refreshUnreadCount()]);
      return res;
    } catch (err) {
      console.error('Error triggering test reminder:', err);
      throw err;
    }
  };

  return {
    unreadCount,
    notifications,
    loading,
    activeCategory,
    setActiveCategory,
    isDropdownOpen,
    setIsDropdownOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    settings,
    refreshUnreadCount,
    loadNotifications,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleDeleteNotification,
    handleSaveSettings,
    handleUpdateSettings: handleSaveSettings,
    triggerTestNotification,
    triggerTestReminder,
  };
}
