import { ProfilePhotoEditor } from '../../components/common/ProfileAvatar.jsx';
import { gentizeText } from '../../utils/gentizeBrand.js';
import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client.js';
import {
  Save,
  Building,
  User,
  Mail,
  Phone,
  Clock,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-react';

export function AdminSettings() {
  const [settings, setSettings] = useState({
    company_name: 'Elevate Internal',
    admin_name: '',
    admin_phone: '',
    admin_email: '',
    admin_avatar: '',
    default_slot_duration: '30',
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Password Update State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await apiRequest('/admin/settings');
        if (res.settings) {
          setSettings(prev => ({
            ...prev,
            company_name: res.settings.company_name || prev.company_name,
            admin_name: gentizeText(res.settings.admin_name || ''),
            admin_phone: res.settings.admin_phone || '',
            admin_email: res.settings.admin_email || '',
            admin_avatar: res.settings.admin_avatar || '',
            default_slot_duration: String(res.settings.default_slot_duration || '30'),
          }));
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaveError(null);
    try {
      await apiRequest('/admin/settings', {
        method: 'PUT',
        body: settings,
      });
      window.dispatchEvent(new Event('profile-updated'));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err.message || 'Failed to save settings');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });

    if (!passwordForm.currentPassword) {
      setPasswordMsg({ type: 'error', text: 'Please enter your current password.' });
      return;
    }
    if (!passwordForm.newPassword) {
      setPasswordMsg({ type: 'error', text: 'Please enter your new password.' });
      return;
    }
    if (passwordForm.newPassword.length < 4) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 4 characters long.' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    try {
      setPasswordUpdating(true);
      const res = await apiRequest('/admin/change-password', {
        method: 'PUT',
        body: {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
      });

      setPasswordMsg({
        type: 'success',
        text: res.message || 'Admin password updated successfully!',
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordMsg({ type: '', text: '' }), 5000);
    } catch (err) {
      setPasswordMsg({
        type: 'error',
        text: err.message || 'Failed to update password. Please check your current password.',
      });
    } finally {
      setPasswordUpdating(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Organization & Admin Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Configure your organization identity, administrator profile, and login credentials.</p>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Organization settings and contact details saved successfully!</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: Organization & Identity */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Building className="w-4 h-4 text-orange-500" />
            Organization & Company Identity
          </h3>
          
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Organization Name
            </label>
            <input
              type="text"
              required
              value={settings.company_name}
              onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
              placeholder="e.g. Acme Health Corp"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Default Slot Duration (Minutes)
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <select
                value={settings.default_slot_duration}
                onChange={(e) => setSettings({ ...settings, default_slot_duration: e.target.value })}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition cursor-pointer"
              >
                <option value="15">15 Minutes</option>
                <option value="30">30 Minutes</option>
                <option value="45">45 Minutes</option>
                <option value="60">60 Minutes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Admin Profile & Contact Info */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Admin Profile & Contact Details
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Set the official Administrator name, contact phone number, and notification email.
          </p>

          <ProfilePhotoEditor value={settings.admin_avatar} name={settings.admin_name} onChange={avatar => setSettings(prev => ({...prev, admin_avatar: avatar}))} />
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Admin Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={settings.admin_name}
                  onChange={(e) => setSettings({ ...settings, admin_name: e.target.value })}
                  placeholder="Gentize"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Admin Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="tel"
                    required
                    value={settings.admin_phone}
                    onChange={(e) => setSettings({ ...settings, admin_phone: e.target.value })}
                    placeholder="+91 98400 12345"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Admin Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={settings.admin_email}
                    onChange={(e) => setSettings({ ...settings, admin_email: e.target.value })}
                    placeholder="admin@elevate.com"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-orange-500 hover:bg-orange-600 shadow-md shadow-orange-500/20 transition active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Organization Settings</span>
            </button>
          </div>
        </div>
      </form>

      {/* Section 3: Admin Security & Password Update */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Admin Security & Password
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          Change your administrator login password. This password is required to access the Admin Portal.
        </p>

        {passwordMsg.text && (
          <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            passwordMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border border-rose-200 text-rose-700'
          }`}>
            {passwordMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{passwordMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Current Admin Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                required
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                placeholder="Enter current admin password"
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Min 4 characters"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Re-type new password"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={passwordUpdating}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-slate-900 hover:bg-slate-800 shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>{passwordUpdating ? 'Updating Password...' : 'Update Password'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
export default AdminSettings;
