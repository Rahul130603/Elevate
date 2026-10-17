import { GentizeText } from '../../components/common/GentizeText.jsx';
import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../../api/client.js';
import {
  Calendar,
  Clock,
  MapPin,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  CalendarCheck,
  Zap,
  ChevronDown,
} from 'lucide-react';

const COUNTRY_CONFIG = {
  '+91': { name: 'India', flag: '🇮🇳', digits: 10 },
  '+1': { name: 'USA/Canada', flag: '🇺🇸', digits: 10 },
  '+44': { name: 'UK', flag: '🇬🇧', digits: 10 },
  '+971': { name: 'UAE', flag: '🇦🇪', digits: 9 },
  '+65': { name: 'Singapore', flag: '🇸🇬', digits: 8 },
  '+61': { name: 'Australia', flag: '🇦🇺', digits: 9 },
  '+966': { name: 'Saudi Arabia', flag: '🇸🇦', digits: 9 },
  '+49': { name: 'Germany', flag: '🇩🇪', digits: 11 },
  '+60': { name: 'Malaysia', flag: '🇲🇾', digits: 10 },
  '+33': { name: 'France', flag: '🇫🇷', digits: 9 },
};

const isEmailValid = (email) => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export function BookScheduleModal({ scheduleId, onClose, onBookingSuccess }) {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState('+91');
  const [rawPhoneNumber, setRawPhoneNumber] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef(null);

  const [formData, setFormData] = useState({
    meetingWith: '',
    clientEmail: '',
    purpose: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Close country dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target)) {
        setCountryDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchScheduleDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiRequest(`/user/schedules/${scheduleId}`);
      setSchedule(res.schedule);
    } catch (err) {
      setError(err.message || 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (scheduleId) {
      fetchScheduleDetails();
    }
  }, [scheduleId]);

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '');
    const max = COUNTRY_CONFIG[selectedCountryCode]?.digits || 10;
    setRawPhoneNumber(digits.slice(0, max));
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!selectedSlot) {
      alert('Please choose one of the available time slots.');
      return;
    }
    if (!formData.meetingWith.trim()) {
      alert('Please enter your full name / attendee name.');
      return;
    }

    const minDigits = COUNTRY_CONFIG[selectedCountryCode]?.digits || 10;
    if (rawPhoneNumber.trim() && rawPhoneNumber.length < minDigits) {
      setPhoneTouched(true);
      alert(`${COUNTRY_CONFIG[selectedCountryCode]?.name} phone number requires ${minDigits} digits.`);
      return;
    }

    if (formData.clientEmail.trim() && !isEmailValid(formData.clientEmail)) {
      setEmailTouched(true);
      alert('Please enter a valid email format (e.g. name@domain.com).');
      return;
    }

    setSubmitting(true);
    try {
      const fullPhone = rawPhoneNumber.trim() ? `${selectedCountryCode} ${rawPhoneNumber.trim()}` : '';

      const res = await apiRequest('/user/schedule-for-admin', {
        method: 'POST',
        body: {
          slotId: selectedSlot.id || selectedSlot.slot_id,
          meetingWith: formData.meetingWith.trim(),
          clientEmail: formData.clientEmail.trim(),
          clientPhone: fullPhone,
          purpose: formData.purpose.trim() || 'Executive Meeting with Gentize',
          notes: formData.notes.trim(),
        },
      });

      // Broadcast notifications update so Admin receives alert immediately
      window.dispatchEvent(new CustomEvent('gentize_notifications_updated'));

      if (onBookingSuccess) {
        onBookingSuccess(res.message || 'Meeting successfully scheduled on Gentize Master Calendar!');
      }
    } catch (err) {
      alert(err.message || 'Booking conflict! This slot may have just been taken.');
      fetchScheduleDetails();
    } finally {
      setSubmitting(false);
    }
  };

  const availableSlots = (schedule?.slots || []).filter((s) => s.status === 'AVAILABLE');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight"><GentizeText>{schedule?.title || 'Schedule Slots'}</GentizeText></h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold border border-orange-200">
                Direct Sync
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {schedule?.date} • <GentizeText>{schedule?.location || 'Gentize Office (In-Person)'}</GentizeText>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {loading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-orange-500" />
              <p className="text-xs font-bold">Loading open slots...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
              {error}
            </div>
          ) : (
            <>
              {/* Slot Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  1. Select an Available Slot ({availableSlots.length} open)
                </label>
                {availableSlots.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                    No available free slots remain for this schedule.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {availableSlots.map((slot) => {
                      const isSelected = selectedSlot?.id === slot.id;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-500/20 shadow-xs'
                              : 'border-slate-200 hover:border-orange-300 bg-white hover:bg-orange-50/30'
                          }`}
                        >
                          <p className={`text-xs font-bold ${isSelected ? 'text-orange-950' : 'text-slate-900'}`}>
                            {slot.displayTime}
                          </p>
                          <span className="text-[10px] font-bold text-emerald-600 block mt-0.5">
                            Free Slot
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Booking Details Form */}
              <form onSubmit={handleConfirmBooking} className="space-y-3.5 pt-4 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  2. Attendee & Meeting Details
                </label>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.meetingWith}
                    onChange={(e) => setFormData({ ...formData, meetingWith: e.target.value })}
                    placeholder="Enter your full name"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 placeholder:text-slate-400 placeholder:font-normal"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative" ref={countryDropdownRef}>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Phone Number
                    </label>
                    <div className="flex items-center rounded-xl bg-slate-50 border border-slate-200 focus-within:ring-2 focus-within:ring-orange-500/30 focus-within:border-orange-500 transition">
                      <button
                        type="button"
                        onClick={() => setCountryDropdownOpen(prev => !prev)}
                        className="h-10 px-2.5 bg-slate-100 hover:bg-slate-200/80 text-xs font-bold text-slate-800 border-r border-slate-200 rounded-l-xl flex items-center gap-1 shrink-0 transition select-none cursor-pointer"
                        title="Select country code"
                      >
                        <span>{COUNTRY_CONFIG[selectedCountryCode]?.flag || '🇮🇳'}</span>
                        <span className="font-bold">{selectedCountryCode}</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${countryDropdownOpen ? 'rotate-180 text-orange-600' : ''}`} />
                      </button>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={rawPhoneNumber}
                        onChange={handlePhoneChange}
                        onBlur={() => setPhoneTouched(true)}
                        maxLength={COUNTRY_CONFIG[selectedCountryCode]?.digits || 10}
                        placeholder="Enter your mobile number"
                        className="flex-1 min-w-0 px-3 py-2.5 bg-transparent text-xs font-semibold text-slate-800 focus:outline-hidden placeholder:text-slate-400 placeholder:font-normal"
                      />
                    </div>

                    {countryDropdownOpen && (
                      <div className="absolute left-0 top-full mt-1.5 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 max-h-56 overflow-y-auto animate-in fade-in duration-100">
                        <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Select Country Code
                        </div>
                        {Object.entries(COUNTRY_CONFIG).map(([code, config]) => (
                          <button
                            key={code}
                            type="button"
                            onClick={() => {
                              setSelectedCountryCode(code);
                              setCountryDropdownOpen(false);
                            }}
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

                    {phoneTouched && rawPhoneNumber && rawPhoneNumber.length < (COUNTRY_CONFIG[selectedCountryCode]?.digits || 10) && (
                      <p className="text-[10px] text-amber-600 font-semibold mt-1">
                        <GentizeText>{COUNTRY_CONFIG[selectedCountryCode]?.name}</GentizeText> phone number requires {COUNTRY_CONFIG[selectedCountryCode]?.digits} digits ({rawPhoneNumber.length}/{COUNTRY_CONFIG[selectedCountryCode]?.digits})
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.clientEmail}
                      onChange={(e) => {
                        setEmailTouched(true);
                        setFormData({ ...formData, clientEmail: e.target.value });
                      }}
                      onBlur={() => setEmailTouched(true)}
                      placeholder="Enter your email address"
                      className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 transition placeholder:text-slate-400 placeholder:font-normal h-10 ${
                        emailTouched && formData.clientEmail && !isEmailValid(formData.clientEmail)
                          ? 'border-rose-400 focus:ring-rose-500/30 focus:border-rose-500'
                          : 'border-slate-200 focus:ring-orange-500/30 focus:border-orange-500'
                      }`}
                    />
                    {emailTouched && formData.clientEmail && !isEmailValid(formData.clientEmail) && (
                      <p className="text-[10px] text-rose-500 font-semibold mt-1">
                        Please enter a valid email format (e.g. name@domain.com)
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Discussion Topic / Purpose
                  </label>
                  <input
                    type="text"
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    placeholder="Enter discussion topic or purpose"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 placeholder:text-slate-400 placeholder:font-normal"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Enter any additional notes or points for Gentize..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 placeholder:text-slate-400 placeholder:font-normal resize-none"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !selectedSlot}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    {submitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CalendarCheck className="w-4 h-4" />
                        <span>Confirm & Lock Slot</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
