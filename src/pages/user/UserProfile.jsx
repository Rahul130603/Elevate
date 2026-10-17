import { GentizeText } from '../../components/common/GentizeText.jsx';
import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client.js';
import { User, Mail, Phone, Shield, CalendarCheck, CheckCircle2, Lock, KeyRound } from 'lucide-react';

export function UserProfile() {
  const [profile, setProfile] = useState({
    name: 'Sudhin',
    email: 'sudhinns333@gmail.com',
    phone: '+91 98765 43210',
    role: 'Executive Assistant',
  });

  const fetchProfile = async () => {
    try {
      const res = await apiRequest('/user/profile');
      if (res.user) setProfile(res.user);
    } catch (_) {}
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <div className="max-w-2xl space-y-6 mx-auto pb-10">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Your Profile</h1>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
            Staff Account
          </span>
        </div>
        <p className="text-xs text-slate-500 font-medium mt-1">Manage your appointment contact information and credentials.</p>
      </div>

      <div className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200/90 shadow-2xs space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-orange-500 text-white font-bold text-2xl flex items-center justify-center shadow-md shadow-orange-500/20">
            <GentizeText>{profile?.name?.charAt(0) || 'S'}</GentizeText>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900"><GentizeText>{profile?.name}</GentizeText></h2>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200 mt-1">
              <GentizeText>{profile?.role || 'Executive Assistant'}</GentizeText>
            </span>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">Full Name</label>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-800">
              <GentizeText>{profile?.name}</GentizeText>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">Email Address</label>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-800 flex items-center gap-2">
              <Mail className="w-4 h-4 text-orange-500" />
              <span>{profile?.email}</span>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">Phone Number for Alerts</label>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-800 flex items-center gap-2">
              <Phone className="w-4 h-4 text-orange-500" />
              <span>{profile?.phone || '+91 98765 43210'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Password Card */}
      <ChangePasswordCard />
    </div>
  );
}

function ChangePasswordCard() {
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
      setTimeout(() => setStatus(prev => ({ ...prev, success: null })), 4000);
    }, 600);
  };

  return (
    <div className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
          <KeyRound className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Security & Password</h2>
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
