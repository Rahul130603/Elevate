import { GentizeText } from '../../components/common/GentizeText.jsx';
import React, { useState } from 'react';
import { apiRequest } from '../../api/client.js';
import { IndustryPicker } from '../../components/admin_common/IndustryPicker.jsx';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2
} from 'lucide-react';

export function AdminLogin({ onLoginSuccess, onSwitchPortal }) {
  const [userId, setUserId] = useState('admin');
  const [password, setPassword] = useState('');
  const [industry, setIndustry] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!industry) { setError('Please select your industry before signing in.'); return; }
    setLoading(true);

    try {
      const res = await apiRequest('/admin/login', {
        method: 'POST',
        body: {
          userId: userId.trim(),
          password: password.trim(),
          industry,
        },
      });

      if (res && res.success) {
        onLoginSuccess({ ...res.admin, industry: res.industry });
      } else {
        throw new Error(res?.error || 'Invalid credentials');
      }
    } catch (err) {
      setError(err.message || 'Invalid Admin User ID or Password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] w-full bg-[#FAF9F6] bg-cover bg-[position:22%_center] lg:bg-center bg-no-repeat flex flex-col justify-center items-center p-4 sm:p-6 lg:p-12 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] relative selection:bg-orange-500 selection:text-white overflow-y-auto overflow-x-hidden"
      style={{ backgroundImage: "url('/elevate-login-bg.png')" }}
    >
      {/* Soft warm overlay to ensure readability while preserving photo details */}
      <div className="absolute inset-0 bg-gradient-to-b sm:bg-gradient-to-r from-white/40 via-white/20 to-black/10 pointer-events-none" />

      {/* Main Responsive Grid Container */}
      <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center lg:items-start relative z-10 my-auto">
        
        {/* Left Side: Headline - Left-aligned above card on mobile, placed strictly inside window space on desktop */}
        <div className="lg:col-span-5 space-y-2.5 text-left animate-in fade-in slide-in-from-left-4 duration-300 lg:pt-4 xl:pt-8 w-full max-w-[420px] lg:max-w-[300px] mx-auto lg:mx-0">
          <h1 className="text-3xl sm:text-4xl lg:text-[42px] xl:text-[46px] font-black text-slate-900 tracking-tight leading-[1.08] drop-shadow-xs">
            Smart
            <br />
            Scheduling.
            <br />
            <span className="text-[#ff7f00]">Better Business.</span>
          </h1>
        </div>

        {/* Right Side: Floating Login Card */}
        <div className="lg:col-span-7 flex justify-center lg:justify-end animate-in fade-in zoom-in-95 duration-300 w-full lg:translate-x-8 xl:translate-x-12">
          <div className="w-full max-w-[420px] sm:max-w-[465px] bg-white/95 backdrop-blur-md rounded-3xl border border-white/90 shadow-2xl shadow-slate-950/15 p-6 sm:p-9 space-y-5 sm:space-y-6">
            
            {/* Card Header: Logo & Portal Subtitle */}
            <div className="text-center space-y-2 pb-1">
              <div className="flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="Elevate"
                  className="h-10 sm:h-12 w-auto object-contain"
                />
              </div>
              <p className="text-xs sm:text-[13px] font-semibold text-slate-500 tracking-tight"><GentizeText>
                Gentize Executive Calendar & Appointment Management
              </GentizeText></p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm font-semibold text-rose-700 flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 tracking-wide mb-1.5">
                  Admin User ID / Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 sm:pl-4 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="admin"
                    className="w-full pl-10 sm:pl-11 pr-4 py-3 sm:py-3.5 bg-[#F8FAFC] border border-slate-200/90 rounded-xl sm:rounded-2xl text-sm sm:text-base font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ff7f00]/25 focus:border-[#ff7f00] transition shadow-2xs placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 tracking-wide mb-1.5">
                  Admin Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 sm:pl-4 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 sm:pl-11 pr-11 py-3 sm:py-3.5 bg-[#F8FAFC] border border-slate-200/90 rounded-xl sm:rounded-2xl text-sm sm:text-base font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ff7f00]/25 focus:border-[#ff7f00] transition shadow-2xs placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 sm:pr-4 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
              </div>

              <IndustryPicker value={industry} onChange={setIndustry} />

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 sm:py-4 px-5 bg-[#ff7f00] hover:bg-[#e67300] active:scale-[0.99] text-white text-sm sm:text-base font-bold rounded-xl sm:rounded-2xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>
              </div>
            </form>

            {/* Bottom Footer Navigation */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-500">
              <button
                type="button"
                onClick={() => onSwitchPortal && onSwitchPortal('user')}
                className="hover:text-orange-600 transition flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Assistant Calendar</span>
              </button>

              <button
                type="button"
                onClick={() => onSwitchPortal && onSwitchPortal('client')}
                className="hover:text-orange-600 transition flex items-center gap-1 cursor-pointer"
              >
                <span>Client Booking</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default AdminLogin;
