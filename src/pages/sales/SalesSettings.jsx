import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client.js';
import {
  Save,
  Briefcase,
  User,
  Mail,
  Phone,
  Clock,
  Video,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export function SalesSettings() {
  const [profile, setProfile] = useState({
    name: 'Gentize LEAD',
    role: 'Sales Team Lead & Solutions Desk',
    email: 'lead@elevate.com',
    phone: '+91 98765 43220',
    defaultMeetingLink: 'https://meet.google.com/sal-lead-demo',
    defaultSlotDuration: '30',
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
    async function loadProfile() {
      try {
        const res = await apiRequest('/sales-meetings/profile?userId=lead');
        if (res && res.profile) {
          setProfile({
            name: res.profile.name || 'Gentize LEAD',
            role: res.profile.role === 'SALES_LEAD' ? 'Sales Team Lead & Solutions Desk' : (res.profile.role || 'Sales Team Lead'),
            email: res.profile.email || 'lead@elevate.com',
            phone: res.profile.phone || '+91 98765 43220',
            defaultMeetingLink: res.profile.default_meeting_link || 'https://meet.google.com/sal-lead-demo',
            defaultSlotDuration: String(res.profile.default_slot_duration || '30'),
          });
        }
      } catch (err) {
        console.error('Error fetching sales lead profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaveError(null);
    try {
      await apiRequest('/sales-meetings/profile', {
        method: 'PUT',
        body: {
          userId: 'lead',
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          defaultMeetingLink: profile.defaultMeetingLink,
          defaultSlotDuration: Number(profile.defaultSlotDuration) || 30,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err.message || 'Failed to save sales lead profile');
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
      const res = await apiRequest('/sales-meetings/change-password', {
        method: 'PUT',
        body: {
          userId: 'lead',
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
      });

      setPasswordMsg({
        type: 'success',
        text: res.message || 'Sales Lead password updated successfully!',
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
    <div className="max-w-3xl space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 font-semibold text-[11px] uppercase tracking-wider border border-orange-200/60">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            SALES TEAM LEAD PORTAL
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sales Team Lead Profile & Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your Sales Lead identity, client consultation preferences, contact details, and portal login credentials.</p>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Sales Lead profile and preferences saved successfully!</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Section 1: Sales Lead Identity & Profile */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Sales Lead Profile & Role
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Configure how your identity appears across client consultation invites and team notifications.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Gentize LEAD"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Role & Designation
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  disabled
                  value={profile.role}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Contact Phone Number *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="tel"
                  required
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+91 98765 43220"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Work Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="lead@elevate.com"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Meeting & Consultation Defaults */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Meeting & Consultation Defaults
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Set your default meeting link for online consultations and preferred slot duration.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Default Video Meeting Link (Google Meet / Zoom)
              </label>
              <div className="relative">
                <Video className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={profile.defaultMeetingLink}
                  onChange={(e) => setProfile({ ...profile, defaultMeetingLink: e.target.value })}
                  placeholder="https://meet.google.com/sal-lead-demo"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Default Consultation Duration
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <select
                  value={profile.defaultSlotDuration}
                  onChange={(e) => setProfile({ ...profile, defaultSlotDuration: e.target.value })}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition cursor-pointer"
                >
                  <option value="15">15 Minutes (Quick Intro / Touchpoint)</option>
                  <option value="30">30 Minutes (Standard Sales Consultation)</option>
                  <option value="45">45 Minutes (Detailed Demo & Architecture)</option>
                  <option value="60">60 Minutes (Full Enterprise Discovery)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-orange-500 hover:bg-orange-600 shadow-md shadow-orange-500/20 transition active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Lead Profile</span>
            </button>
          </div>
        </div>
      </form>

      {/* Section 3: Portal Security & Password Change */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Sales Team Portal Security & Password
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          Change your Sales Team Portal password for user ID <span className="font-mono font-bold text-slate-700">lead</span>. This updates your login password for the Sales Team Portal.
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
              Current Password *
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                required
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                placeholder="Enter current password (default: lead123)"
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                New Password *
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Min. 4 characters"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm New Password *
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
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
              {passwordUpdating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-orange-400" />
              )}
              <span>Update Password</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SalesSettings;
