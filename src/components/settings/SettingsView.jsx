import { GentizeText } from '../common/GentizeText.jsx';
import React, { useState, useEffect } from 'react';
import { Check, Menu, AlertCircle } from 'lucide-react';

export default function SettingsView({
  settings,
  onSaveSettings,
  showToast,
  onOpenMobileMenu,
  onTestNotification,
}) {
  const [activeTab, setActiveTab] = useState('notifications'); // 'notifications' | 'account' | 'appearance'
  const [formData, setFormData] = useState({
    reminder1Day: true,
    reminder1Hour: true,
    reminder15Min: true,
    eventCreated: true,
    eventUpdated: true,
    eventCancelled: true,
    inAppEnabled: true,
    browserEnabled: true,
    deviceEnabled: true,
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
        deviceEnabled: settings.deviceEnabled ?? settings.channelDevice ?? true,
      });
    }
  }, [settings]);

  const handleToggle = (key) => {
    setErrorMessage(null);
    setFormData((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);

    try {
      if (typeof onSaveSettings !== 'function') {
        throw new Error('Save handler is not configured.');
      }
      await onSaveSettings(formData);
      if (typeof showToast === 'function') {
        showToast('Notification preferences saved successfully.', 'success');
      }
    } catch (err) {
      console.error('Error saving notification preferences:', err);
      const errorText = err.message || 'Unable to save settings. Please try again.';
      setErrorMessage(errorText);
      if (typeof showToast === 'function') {
        showToast(errorText, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const renderCheckboxItem = (key, label) => {
    const checked = Boolean(formData[key]);

    return (
      <div
        key={key}
        onClick={() => handleToggle(key)}
        className="flex items-center gap-3 cursor-pointer select-none group py-1"
      >
        <div
          className={`w-4 h-4 rounded flex items-center justify-center transition-all shrink-0 ${
            checked
              ? 'bg-orange-500 text-white shadow-2xs'
              : 'border border-slate-300 bg-white group-hover:border-slate-400'
          }`}
        >
          {checked && <Check className="w-3 h-3 stroke-[3]" />}
        </div>
        <span className="text-xs sm:text-sm font-medium text-slate-700 group-hover:text-slate-900">
          <GentizeText>{label}</GentizeText>
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Settings
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Manage your preferences and account
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {onTestNotification && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await onTestNotification();
                  if (typeof showToast === 'function') {
                    showToast('Test notification created successfully.', 'success');
                  }
                } catch {
                  if (typeof showToast === 'function') {
                    showToast('Failed to trigger test notification.', 'error');
                  }
                }
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200/80 rounded-xl hover:bg-slate-50 transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              <span>Test Notification</span>
            </button>
          )}

          {/* Save Changes Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-sm shadow-orange-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Tabs: Notification Preferences | Account */}
      <div className="flex items-center gap-2">
        {[
          { id: 'notifications', label: 'Notification Preferences' },
          { id: 'account', label: 'Account' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
            }`}
          >
            <GentizeText>{tab.label}</GentizeText>
          </button>
        ))}
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-medium rounded-xl flex items-center gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span><GentizeText>{errorMessage}</GentizeText></span>
        </div>
      )}

      {/* Main Settings Card */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-2xs space-y-8">
          {/* Section 1: Event Reminders */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-8 items-start">
            <div className="md:col-span-5">
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Event Reminders
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Get notified before your events start.
              </p>
            </div>

            <div className="md:col-span-7 flex flex-col gap-2.5">
              {renderCheckboxItem('reminder1Day', '1 day before event')}
              {renderCheckboxItem('reminder1Hour', '1 hour before event')}
              {renderCheckboxItem('reminder15Min', '15 minutes before event')}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 2: Event Activity Updates */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-8 items-start">
            <div className="md:col-span-5">
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Event Activity Updates
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Get notified when there are changes to your events.
              </p>
            </div>

            <div className="md:col-span-7 flex flex-col gap-2.5">
              {renderCheckboxItem('eventCreated', 'When a new event is scheduled')}
              {renderCheckboxItem('eventUpdated', 'When event details are changed')}
              {renderCheckboxItem('eventCancelled', 'When an event is deleted')}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 3: Delivery Channels */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-8 items-start">
            <div className="md:col-span-5">
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Delivery Channels
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Choose how you want to receive notifications.
              </p>
            </div>

            <div className="md:col-span-7 flex flex-col gap-2.5">
              {renderCheckboxItem('inAppEnabled', 'In-App Notifications')}
              {renderCheckboxItem('browserEnabled', 'Browser Alerts / Push')}
              {renderCheckboxItem('deviceEnabled', 'Device Push (Android APK)')}
            </div>
          </div>
        </div>
      )}

      {/* Account Tab */}
      {activeTab === 'account' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-2xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">
              User Profile
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Your personal details and app role.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value="Rahul R"
                readOnly
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Role
              </label>
              <input
                type="text"
                value="Developer"
                readOnly
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
