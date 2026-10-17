import { GentizeText } from '../../components/common/GentizeText.jsx';
import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../../api/client.js';
import { Modal } from '../../components/common/Modal.jsx';
import { Users, Plus, Shield, UserCheck, Mail, Phone, Calendar, AlertCircle, ChevronDown, Check } from 'lucide-react';

const COUNTRY_CONFIG = {
  '+91': { name: 'India', digits: 10, flag: '🇮🇳' },
  '+1': { name: 'US / Canada', digits: 10, flag: '🇺🇸' },
  '+44': { name: 'UK', digits: 10, flag: '🇬🇧' },
  '+971': { name: 'UAE', digits: 9, flag: '🇦🇪' },
  '+65': { name: 'Singapore', digits: 8, flag: '🇸🇬' },
  '+61': { name: 'Australia', digits: 9, flag: '🇦🇺' },
  '+49': { name: 'Germany', digits: 10, flag: '🇩🇪' },
  '+33': { name: 'France', digits: 9, flag: '🇫🇷' },
  '+81': { name: 'Japan', digits: 10, flag: '🇯🇵' },
  '+86': { name: 'China', digits: 11, flag: '🇨🇳' },
  '+966': { name: 'Saudi Arabia', digits: 9, flag: '🇸🇦' },
  '+977': { name: 'Nepal', digits: 10, flag: '🇳🇵' },
  '+880': { name: 'Bangladesh', digits: 10, flag: '🇧🇩' },
  '+66': { name: 'Thailand', digits: 9, flag: '🇹🇭' },
  '+82': { name: 'South Korea', digits: 10, flag: '🇰🇷' },
  '+64': { name: 'New Zealand', digits: 9, flag: '🇳🇿' },
  '+55': { name: 'Brazil', digits: 11, flag: '🇧🇷' },
  '+27': { name: 'South Africa', digits: 9, flag: '🇿🇦' },
};

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: 'user123',
    role: 'USER',
  });

  const [selectedCountryCode, setSelectedCountryCode] = useState('+91');
  const [rawPhoneNumber, setRawPhoneNumber] = useState('');
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const countryDropdownRef = useRef(null);

  // Close country dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target)) {
        setCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isEmailValid = (em) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(em.trim());

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '');
    const maxDigits = COUNTRY_CONFIG[selectedCountryCode]?.digits || 10;
    const truncated = digitsOnly.slice(0, maxDigits);
    setRawPhoneNumber(truncated);
    setPhoneTouched(true);
    setForm((prev) => ({ ...prev, phone: `${selectedCountryCode} ${truncated}` }));
  };

  const handleCountryCodeChange = (code) => {
    setSelectedCountryCode(code);
    setCountryDropdownOpen(false);
    const maxDigits = COUNTRY_CONFIG[code]?.digits || 10;
    const truncated = rawPhoneNumber.slice(0, maxDigits);
    setRawPhoneNumber(truncated);
    setForm((prev) => ({ ...prev, phone: `${code} ${truncated}` }));
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/admin/users');
      setUsers(res.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError(null);

    if (!isEmailValid(form.email)) {
      setError('Please enter a valid email address format (e.g. name@domain.com)');
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest('/admin/users', {
        method: 'POST',
        body: form,
      });
      setIsModalOpen(false);
      setForm({ name: '', email: '', phone: '', password: 'user123', role: 'USER' });
      setRawPhoneNumber('');
      setPhoneTouched(false);
      setEmailTouched(false);
      await fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Team Members & Users</h1>
          <p className="text-sm text-slate-500 mt-1">Manage platform participants and roles with strict access boundaries.</p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setRawPhoneNumber('');
            setPhoneTouched(false);
            setEmailTouched(false);
            setForm({ name: '', email: '', phone: '', password: 'user123', role: 'USER' });
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white bg-orange-500 hover:bg-orange-600 shadow-md shadow-orange-500/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Team Member</span>
        </button>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u) => (
          <div key={u.id} className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs bg-orange-500">
                <GentizeText>{u.name?.charAt(0) || 'U'}</GentizeText>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-orange-50 text-orange-600 border border-orange-200">
                {u.role === 'ADMIN' ? <Shield className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                <GentizeText>{u.role}</GentizeText>
              </span>
            </div>

            <h3 className="font-extrabold text-slate-900 text-base"><GentizeText>{u.name}</GentizeText></h3>
            
            <div className="mt-3 space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{u.email}</span>
              </div>
              {u.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{u.phone}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Status: <strong className="text-orange-500 font-bold">Active</strong></span>
              <span>Joined: {new Date(u.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ADD USER MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Internal Team Member"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter your full name"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition placeholder:text-slate-400 placeholder:font-normal"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              e.g. Alex Morgan / Dr. Ramesh
            </p>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => {
                setEmailTouched(true);
                setForm({ ...form, email: e.target.value });
              }}
              onBlur={() => setEmailTouched(true)}
              placeholder="Enter your email address"
              className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm focus:ring-2 focus:bg-white transition placeholder:text-slate-400 placeholder:font-normal ${
                emailTouched && form.email && !isEmailValid(form.email)
                  ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500'
                  : 'border-slate-300 focus:ring-orange-500/20 focus:border-orange-500'
              }`}
            />
            {emailTouched && form.email && !isEmailValid(form.email) ? (
              <p className="mt-1 text-[11px] text-rose-500 font-medium">
                Please enter a valid email format (e.g. name@domain.com)
              </p>
            ) : form.email && isEmailValid(form.email) ? (
              <p className="mt-1 text-[11px] text-emerald-600 font-semibold">
                ✓ Valid email address
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-slate-400">
                e.g. name@domain.com
              </p>
            )}
          </div>

          {/* Phone Number with Country Code Dropdown */}
          <div className="relative" ref={countryDropdownRef}>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Phone Number (India)
            </label>
            <div className="flex items-center rounded-xl bg-slate-50 border border-slate-300 focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500 focus-within:bg-white transition">
              {/* Compact Country Code Trigger */}
              <button
                type="button"
                onClick={() => setCountryDropdownOpen(prev => !prev)}
                className="h-10 px-2.5 bg-slate-100 hover:bg-slate-200/80 text-xs font-bold text-slate-800 border-r border-slate-300 rounded-l-xl flex items-center gap-1 shrink-0 transition select-none cursor-pointer"
                title="Select country code"
              >
                <span>{COUNTRY_CONFIG[selectedCountryCode]?.flag || '🇮🇳'}</span>
                <span className="font-bold">{selectedCountryCode}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${countryDropdownOpen ? 'rotate-180 text-orange-600' : ''}`} />
              </button>

              {/* Dedicated Phone Input */}
              <input
                type="tel"
                inputMode="numeric"
                value={rawPhoneNumber}
                onChange={handlePhoneChange}
                onBlur={() => setPhoneTouched(true)}
                maxLength={COUNTRY_CONFIG[selectedCountryCode]?.digits || 10}
                placeholder="Enter your mobile number"
                className="flex-1 min-w-0 px-3.5 py-2.5 bg-transparent text-sm font-semibold text-slate-900 focus:outline-hidden placeholder:text-slate-400 placeholder:font-normal"
              />
            </div>

            {/* Country Selector Popover */}
            {countryDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 max-h-56 overflow-y-auto animate-in fade-in duration-100">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Select Country Code
                </div>
                {Object.entries(COUNTRY_CONFIG).map(([code, config]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleCountryCodeChange(code)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-orange-50 transition cursor-pointer ${
                      selectedCountryCode === code ? 'bg-orange-50 font-bold text-orange-600' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{config.flag}</span>
                      <span><GentizeText>{config.name}</GentizeText></span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500">{code}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Helper Caption */}
            {phoneTouched && rawPhoneNumber && rawPhoneNumber.length < (COUNTRY_CONFIG[selectedCountryCode]?.digits || 10) ? (
              <p className="mt-1 text-[11px] text-amber-600 font-semibold">
                <GentizeText>{COUNTRY_CONFIG[selectedCountryCode]?.name}</GentizeText> mobile number requires {COUNTRY_CONFIG[selectedCountryCode]?.digits} digits ({rawPhoneNumber.length}/{COUNTRY_CONFIG[selectedCountryCode]?.digits})
              </p>
            ) : rawPhoneNumber && rawPhoneNumber.length === (COUNTRY_CONFIG[selectedCountryCode]?.digits || 10) ? (
              <p className="mt-1 text-[11px] text-emerald-600 font-semibold">
                ✓ Valid {COUNTRY_CONFIG[selectedCountryCode]?.digits}-digit mobile number
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-slate-400">
                {COUNTRY_CONFIG[selectedCountryCode]?.digits || 10} digits (<GentizeText>{COUNTRY_CONFIG[selectedCountryCode]?.name}</GentizeText>)
              </p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Role
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition cursor-pointer"
            >
              <option value="USER">USER (Standard Employee / Staff)</option>
              <option value="ADMIN">ADMIN (Full Administrative Privileges)</option>
            </select>
          </div>

          {/* Temporary Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Temporary Password
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Enter temporary password"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Default: user123 (Team member can update after login)
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition shadow-md shadow-orange-500/20 cursor-pointer"
            >
              {submitting ? 'Adding...' : 'Save User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
