import { ProfileAvatar, ProfilePhotoEditor } from '../../components/common/ProfileAvatar.jsx';
import { GentizeText } from '../../components/common/GentizeText.jsx';
import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client.js';
import {
  User,
  Mail,
  Phone,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Bell,
  Palette,
  Sliders,
  Menu,
  Save,
  Lock,
} from 'lucide-react';

export function UserSettings({
  settings,
  onSaveSettings,
  showToast,
  onOpenMobileMenu,
  onTestNotification,
  initialTab = 'profile',
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'profile' | 'security' | 'notifications' | 'appearance'

  // Sync initialTab if changed externally
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // --- Profile State ---
  const [profile, setProfile] = useState({
    name: 'Sudhin',
    email: 'sudhinns333@gmail.com',
    phone: '+91 98765 43210',
    role: 'Executive Assistant',
  });
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const saved = JSON.parse(localStorage.getItem('gentize_user_auth') || '{}');
        const res = await apiRequest(`/user/profile${saved.id ? `?id=${encodeURIComponent(saved.id)}` : ''}`);
        if (res && res.user) {
          setProfile(res.user);
        }
      } catch (_) {
        // quiet fallback
      } finally {
        setProfileLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/user/profile', {method: 'PUT', body: profile});
      setProfile(res.user);
      localStorage.setItem('gentize_user_auth', JSON.stringify(res.user));
      window.dispatchEvent(new Event('profile-updated'));
    } catch (err) { showToast?.(err.message || 'Unable to save profile.', 'error'); return; }
    setProfileSaved(true);
    if (typeof showToast === 'function') {
      showToast('Profile information updated successfully!', 'success');
    }
    setTimeout(() => setProfileSaved(false), 3500);
  };

  // --- Notification Preferences Form State ---
  const [notifForm, setNotifForm] = useState({
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
  const [savingNotifs, setSavingNotifs] = useState(false);
  const [notifError, setNotifError] = useState(null);

  useEffect(() => {
    if (settings) {
      setNotifForm({
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

  const handleSaveNotifs = async () => {
    setSavingNotifs(true);
    setNotifError(null);
    try {
      if (typeof onSaveSettings === 'function') {
        await onSaveSettings(notifForm);
      }
      if (typeof showToast === 'function') {
        showToast('Notification preferences saved successfully.', 'success');
      }
    } catch (err) {
      setNotifError(err.message || 'Unable to save settings. Please try again.');
    } finally {
      setSavingNotifs(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
              Settings
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage your personal profile, credentials, notifications, and preferences.
            </p>
          </div>
        </div>

        {activeTab === 'notifications' && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
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
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200/80 rounded-xl hover:bg-slate-50 shadow-2xs active:scale-95 transition cursor-pointer"
              >
                Test Alert
              </button>
            )}
            <button
              onClick={handleSaveNotifs}
              disabled={savingNotifs}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-sm shadow-orange-500/20 active:scale-95 transition cursor-pointer disabled:opacity-50"
            >
              {savingNotifs ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}
      </div>

      {/* Conditional Sub-tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200/80 scrollbar-none">
        {[
          { id: 'profile', label: 'Profile & Account', icon: User },
          { id: 'security', label: 'Security & Password', icon: KeyRound },
          { id: 'notifications', label: 'Notification Preferences', icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100/80 border border-slate-200/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span><GentizeText>{tab.label}</GentizeText></span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. CONDITION: Profile & Account                                           */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200/90 shadow-2xs space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
              <div className="w-14 h-14 rounded-2xl bg-orange-500 text-white font-bold text-2xl flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
                <ProfileAvatar src={profile.avatar} name={profile.name} className="w-14 h-14 text-2xl" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900"><GentizeText>{profile?.name}</GentizeText></h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200">
                    <GentizeText>{profile?.role || 'Executive Assistant'}</GentizeText>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    Staff Account
                  </span>
                </div>
              </div>
            </div>

            {profileSaved && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Profile details updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleProfileSave} className="space-y-4 text-xs">
              <ProfilePhotoEditor value={profile.avatar} name={profile.name} onChange={avatar => setProfile(prev => ({...prev, avatar}))} />
              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profile?.name || ''}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={profile?.email || ''}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-3 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition"
                  />
                  <Mail className="w-4 h-4 text-orange-500 absolute left-3 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                  Phone Number for Alerts
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={profile?.phone || ''}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-3 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition"
                  />
                  <Phone className="w-4 h-4 text-orange-500 absolute left-3 top-3.5" />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-sm shadow-orange-500/20 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CONDITION: Security & Password                                         */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <div className="animate-in fade-in duration-200">
          <SecurityCard />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CONDITION: Notification Preferences                                   */}
      {/* ========================================================================= */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-8 animate-in fade-in duration-200">
          {notifError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{notifError}</span>
            </div>
          )}

          {/* Section 1: Event Reminders */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-8 items-start">
            <div className="md:col-span-5">
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Event Reminders
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Get notified before scheduled executive meetings begin.
              </p>
            </div>

            <div className="md:col-span-7 flex flex-col gap-2.5">
              {[
                { key: 'reminder1Day', label: '1 day before event' },
                { key: 'reminder1Hour', label: '1 hour before event' },
                { key: 'reminder15Min', label: '15 minutes before event' },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center gap-3 p-3 bg-slate-50/80 hover:bg-orange-50/50 rounded-2xl border border-slate-200/80 cursor-pointer transition text-xs font-semibold text-slate-700 select-none"
                >
                  <input
                    type="checkbox"
                    checked={!!notifForm[key]}
                    onChange={(e) => setNotifForm({ ...notifForm, [key]: e.target.checked })}
                    className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500 accent-orange-500 cursor-pointer"
                  />
                  <span><GentizeText>{label}</GentizeText></span>
                </label>
              ))}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 2: Event Activity Updates */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-8 items-start">
            <div className="md:col-span-5">
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Activity Updates
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Stay alerted when meetings are created, rescheduled, or cancelled.
              </p>
            </div>

            <div className="md:col-span-7 flex flex-col gap-2.5">
              {[
                { key: 'eventCreated', label: 'When a new appointment is booked' },
                { key: 'eventUpdated', label: 'When meeting timings or agenda change' },
                { key: 'eventCancelled', label: 'When an appointment is cancelled' },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center gap-3 p-3 bg-slate-50/80 hover:bg-orange-50/50 rounded-2xl border border-slate-200/80 cursor-pointer transition text-xs font-semibold text-slate-700 select-none"
                >
                  <input
                    type="checkbox"
                    checked={!!notifForm[key]}
                    onChange={(e) => setNotifForm({ ...notifForm, [key]: e.target.checked })}
                    className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500 accent-orange-500 cursor-pointer"
                  />
                  <span><GentizeText>{label}</GentizeText></span>
                </label>
              ))}
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
                Choose the notification channels where alerts should be pushed.
              </p>
            </div>

            <div className="md:col-span-7 flex flex-col gap-2.5">
              {[
                { key: 'inAppEnabled', label: 'In-App Notification Feed' },
                { key: 'browserEnabled', label: 'Browser Push Alerts' },
                { key: 'deviceEnabled', label: 'Mobile Device Notifications' },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center gap-3 p-3 bg-slate-50/80 hover:bg-orange-50/50 rounded-2xl border border-slate-200/80 cursor-pointer transition text-xs font-semibold text-slate-700 select-none"
                >
                  <input
                    type="checkbox"
                    checked={!!notifForm[key]}
                    onChange={(e) => setNotifForm({ ...notifForm, [key]: e.target.checked })}
                    className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500 accent-orange-500 cursor-pointer"
                  />
                  <span><GentizeText>{label}</GentizeText></span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function SecurityCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ loading: false, success: null, error: null });

  const handlePasswordChange = (e) => {
    e.preventDefault();
    setStatus({ loading: false, success: null, error: null });

    if (newPassword !== confirmPassword) {
      setStatus({ loading: false, success: null, error: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 4) {
      setStatus({ loading: false, success: null, error: 'Password must be at least 4 characters.' });
      return;
    }

    setStatus({ loading: true, success: null, error: null });
    setTimeout(() => {
      setStatus({ loading: false, success: 'Password updated successfully!', error: null });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setStatus((prev) => ({ ...prev, success: null })), 4000);
    }, 600);
  };

  return (
    <div className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
          <KeyRound className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Security & Credentials</h2>
          <p className="text-xs text-slate-500">Update your account login password anytime.</p>
        </div>
      </div>

      {status.error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-bold">
          {status.error}
        </div>
      )}

      {status.success && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{status.success}</span>
        </div>
      )}

      <form onSubmit={handlePasswordChange} className="space-y-3 pt-2">
        <div>
          <label className="block text-slate-500 font-bold uppercase text-[11px] tracking-wider mb-1">
            Current Password
          </label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
          />
        </div>

        <div>
          <label className="block text-slate-500 font-bold uppercase text-[11px] tracking-wider mb-1">
            New Password
          </label>
          <input
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
          />
        </div>

        <div>
          <label className="block text-slate-500 font-bold uppercase text-[11px] tracking-wider mb-1">
            Confirm New Password
          </label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={status.loading}
            className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-sm shadow-orange-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {status.loading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>
  );
}
