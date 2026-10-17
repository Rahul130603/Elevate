import { GentizeText } from '../common/GentizeText.jsx';
import React, { useState, useEffect } from 'react';

export default function NotificationSettingsModal({ isOpen, onClose, settings, onSave, showToast }) {
  const [formData, setFormData] = useState({
    reminder1Day: true,
    reminder1Hour: true,
    reminder15Min: true,
    eventCreated: true,
    eventUpdated: true,
    eventCancelled: true,
    inAppEnabled: true,
    browserEnabled: true,
    deviceEnabled: true
  });
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        reminder1Day: settings.reminder1Day ?? settings.remind1Day ?? true,
        reminder1Hour: settings.reminder1Hour ?? settings.remind1Hour ?? true,
        reminder15Min: settings.reminder15Min ?? settings.remind15Min ?? true,
        eventCreated: settings.eventCreated ?? settings.notifyCreated ?? true,
        eventUpdated: settings.eventUpdated ?? settings.notifyUpdated ?? true,
        eventCancelled: settings.eventCancelled ?? settings.notifyCancelled ?? true,
        inAppEnabled: settings.inAppEnabled ?? settings.channelInApp ?? true,
        browserEnabled: settings.browserEnabled ?? settings.channelBrowser ?? true,
        deviceEnabled: settings.deviceEnabled ?? settings.channelDevice ?? true
      });
    }
  }, [settings]);

  // Reset error whenever modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = (key) => {
    setErrorMessage(null);
    setFormData((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    try {
      console.log('Saving notification settings:', formData);
      if (typeof onSave !== 'function') {
        throw new Error('Save handler is not configured.');
      }
      const response = await onSave(formData);
      console.log('Notification settings response:', response);

      if (typeof showToast === 'function') {
        showToast('Notification preferences saved successfully.', 'success');
      }

      onClose();
    } catch (err) {
      console.error('Error saving notification preferences:', err);
      let errorText = 'Unable to save notification preferences. Please try again.';
      if (err.message && (err.message.includes('connect') || err.message.includes('fetch') || err.message.includes('Network'))) {
        errorText = 'Unable to connect to the server.';
      } else if (err.message) {
        errorText = err.message;
      }
      setErrorMessage(errorText);
      if (typeof showToast === 'function') {
        showToast(errorText, 'error');
      }
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base">Notification Preferences</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-medium rounded-xl flex items-start gap-2.5 animate-fadeIn">
              <svg className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span><GentizeText>{errorMessage}</GentizeText></span>
            </div>
          )}

          {/* Section: Event Reminders */}
          <div>
            <h4 className="text-xs font-semibold tracking-wider text-slate-400 dark:text-slate-400 uppercase mb-3">
              Event Reminders
            </h4>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-slate-700 dark:text-slate-200">1 day before event</span>
                <input
                  type="checkbox"
                  checked={formData.reminder1Day}
                  onChange={() => handleToggle('reminder1Day')}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-slate-700 dark:text-slate-200">1 hour before event</span>
                <input
                  type="checkbox"
                  checked={formData.reminder1Hour}
                  onChange={() => handleToggle('reminder1Hour')}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-slate-700 dark:text-slate-200">15 minutes before event</span>
                <input
                  type="checkbox"
                  checked={formData.reminder15Min}
                  onChange={() => handleToggle('reminder15Min')}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500"
                />
              </label>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-700/60 pt-4">
            <h4 className="text-xs font-semibold tracking-wider text-slate-400 dark:text-slate-400 uppercase mb-3">
              Event Activity Updates
            </h4>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-slate-700 dark:text-slate-200">When new event is scheduled</span>
                <input
                  type="checkbox"
                  checked={formData.eventCreated}
                  onChange={() => handleToggle('eventCreated')}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-slate-700 dark:text-slate-200">When event details are changed</span>
                <input
                  type="checkbox"
                  checked={formData.eventUpdated}
                  onChange={() => handleToggle('eventUpdated')}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-slate-700 dark:text-slate-200">When an event is deleted</span>
                <input
                  type="checkbox"
                  checked={formData.eventCancelled}
                  onChange={() => handleToggle('eventCancelled')}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500"
                />
              </label>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-700/60 pt-4">
            <h4 className="text-xs font-semibold tracking-wider text-slate-400 dark:text-slate-400 uppercase mb-3">
              Delivery Channels
            </h4>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-slate-700 dark:text-slate-200">In-App Notifications</span>
                <input
                  type="checkbox"
                  checked={formData.inAppEnabled}
                  onChange={() => handleToggle('inAppEnabled')}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-slate-700 dark:text-slate-200">Browser Alerts / Push</span>
                <input
                  type="checkbox"
                  checked={formData.browserEnabled}
                  onChange={() => handleToggle('browserEnabled')}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-slate-700 dark:text-slate-200">Device Push (Android APK)</span>
                <input
                  type="checkbox"
                  checked={formData.deviceEnabled}
                  onChange={() => handleToggle('deviceEnabled')}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500"
                />
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
