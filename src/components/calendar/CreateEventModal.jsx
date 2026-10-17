import { GentizeText } from '../common/GentizeText.jsx';
import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Calendar,
  Clock,
  Phone,
  Mail,
  MapPin,
  Video,
  Navigation,
  FileText,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { EVENT_TYPES } from '../../utils/calendarUtils.js';
import { eventService } from '../../services/eventService.js';

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

export default function CreateEventModal({
  isOpen,
  onClose,
  onSubmit,
  defaultDate,
  allowOverlaps = true,
}) {
  const [formData, setFormData] = useState({
    title: '',
    organizerName: '',
    startDate: defaultDate || '',
    endDate: defaultDate || '',
    startTime: '10:00',
    endTime: '11:00',
    description: '',
    phone: '',
    email: '',
    eventType: 'Online',
    meetingLink: '',
    address: '',
    googleMapsLink: '',
    status: 'upcoming',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [overlappingNotice, setOverlappingNotice] = useState(null);

  // Phone & Country State
  const [selectedCountryCode, setSelectedCountryCode] = useState('+91');
  const [rawPhoneNumber, setRawPhoneNumber] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef(null);

  const modalRef = useRef(null);
  const titleInputRef = useRef(null);

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

  // Initialize prefilled dates when opening
  useEffect(() => {
    if (isOpen) {
      const initialDate = defaultDate || new Date().toISOString().split('T')[0];
      setFormData({
        title: '',
        organizerName: '',
        startDate: initialDate,
        endDate: initialDate,
        startTime: '10:00',
        endTime: '11:00',
        description: '',
        phone: '',
        email: '',
        eventType: 'Online',
        meetingLink: '',
        address: '',
        googleMapsLink: '',
        status: 'upcoming',
      });
      setSelectedCountryCode('+91');
      setRawPhoneNumber('');
      setPhoneTouched(false);
      setEmailTouched(false);
      setCountryDropdownOpen(false);
      setErrors({});
      setOverlappingNotice(null);

      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, defaultDate]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Live overlap check
  useEffect(() => {
    let active = true;
    const checkOverlapDebounced = async () => {
      const { startDate, endDate, startTime, endTime } = formData;
      if (startDate && endDate && startTime && endTime && endDate >= startDate) {
        try {
          const result = await eventService.checkOverlap({
            startDate,
            endDate,
            startTime,
            endTime,
          });
          if (active) {
            if (result.hasOverlap && result.overlappingEvents?.length > 0) {
              const names = result.overlappingEvents
                .map((e) => `"${e.title}" (${e.startDate || ''} ${e.startTime}-${e.endTime})`)
                .join(', ');
              setOverlappingNotice(`This time overlaps with: ${names}`);
            } else {
              setOverlappingNotice(null);
            }
          }
        } catch {
          // Ignore background overlap check errors
        }
      } else {
        setOverlappingNotice(null);
      }
    };

    const timer = setTimeout(checkOverlapDebounced, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [formData.startDate, formData.endDate, formData.startTime, formData.endTime]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};

    // Title
    if (!formData.title.trim()) {
      newErrors.title = 'Event name is required';
    }

    // Event Organizer Name
    if (!formData.organizerName.trim()) {
      newErrors.organizerName = 'Event organizer name is required.';
    }

    // Dates
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    } else if (formData.startDate && formData.endDate < formData.startDate) {
      newErrors.endDate = 'End date cannot be before start date.';
    }

    // Times
    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }
    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    } else if (formData.startDate && formData.endDate && formData.startTime && formData.endTime) {
      if (formData.startDate === formData.endDate) {
        if (formData.endTime <= formData.startTime) {
          newErrors.endTime = 'End time must be later than start time.';
        }
      } else {
        const startFull = `${formData.startDate}T${formData.startTime}`;
        const endFull = `${formData.endDate}T${formData.endTime}`;
        if (endFull <= startFull) {
          newErrors.endTime = 'End date and time must be later than start date and time.';
        }
      }
    }

    // Phone validation
    const expectedDigits = COUNTRY_CONFIG[selectedCountryCode]?.digits || 10;
    if (rawPhoneNumber && rawPhoneNumber.length !== expectedDigits) {
      newErrors.phone = `${COUNTRY_CONFIG[selectedCountryCode]?.name} mobile number must be exactly ${expectedDigits} digits.`;
    }

    // Email
    if (formData.email.trim()) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Please enter a valid email address (e.g. name@domain.com).';
      }
    }

    // Online vs Offline conditional validations
    if (formData.eventType === 'Online') {
      if (!formData.meetingLink.trim()) {
        newErrors.meetingLink = 'Google Meet link is required for online events.';
      } else {
        try {
          const u = new URL(formData.meetingLink.trim());
          if (u.protocol !== 'http:' && u.protocol !== 'https:') {
            newErrors.meetingLink = 'Please enter a valid Google Meet link.';
          }
        } catch {
          newErrors.meetingLink = 'Please enter a valid Google Meet link.';
        }
      }
    } else if (formData.eventType === 'Offline') {
      if (!formData.address.trim()) {
        newErrors.address = 'Address is required for offline events.';
      }
      if (formData.googleMapsLink.trim()) {
        try {
          const u = new URL(formData.googleMapsLink.trim());
          if (u.protocol !== 'http:' && u.protocol !== 'https:') {
            newErrors.googleMapsLink = 'Please enter a valid Google Maps link.';
          }
        } catch {
          newErrors.googleMapsLink = 'Please enter a valid Google Maps link.';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '');
    const maxLen = COUNTRY_CONFIG[selectedCountryCode]?.digits || 10;
    const truncated = digits.slice(0, maxLen);
    setRawPhoneNumber(truncated);
    setFormData((prev) => ({
      ...prev,
      phone: truncated ? `${selectedCountryCode} ${truncated}` : '',
    }));
    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: undefined }));
    }
  };

  const handleCountryChange = (code) => {
    setSelectedCountryCode(code);
    setCountryDropdownOpen(false);
    const maxLen = COUNTRY_CONFIG[code]?.digits || 10;
    const truncated = rawPhoneNumber.slice(0, maxLen);
    setRawPhoneNumber(truncated);
    setFormData((prev) => ({
      ...prev,
      phone: truncated ? `${code} ${truncated}` : '',
    }));
    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: undefined }));
    }
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({ ...prev, email: val }));
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  const handleEventTypeChange = (newType) => {
    setFormData((prev) => ({
      ...prev,
      eventType: newType,
      // Clear inactive data so stale data is never submitted
      meetingLink: newType === 'Online' ? prev.meetingLink : '',
      address: newType === 'Offline' ? prev.address : '',
      googleMapsLink: newType === 'Offline' ? prev.googleMapsLink : '',
    }));

    // Clear conditional errors
    setErrors((prev) => {
      const next = { ...prev };
      delete next.meetingLink;
      delete next.address;
      delete next.googleMapsLink;
      return next;
    });
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (overlappingNotice && !allowOverlaps) {
      setErrors((prev) => ({
        ...prev,
        overlap: 'Overlapping events are disallowed by current policy. Please adjust event times.',
      }));
      return;
    }

    // Clean payload: send null for irrelevant fields based on event type
    const payload = {
      title: formData.title.trim(),
      organizerName: formData.organizerName.trim(),
      startDate: formData.startDate,
      endDate: formData.endDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
      description: formData.description.trim(),
      phone: rawPhoneNumber ? `${selectedCountryCode} ${rawPhoneNumber}` : '',
      email: formData.email.trim(),
      eventType: formData.eventType,
      meetingLink: formData.eventType === 'Online' ? formData.meetingLink.trim() : null,
      address: formData.eventType === 'Offline' ? formData.address.trim() : null,
      googleMapsLink: formData.eventType === 'Offline' ? formData.googleMapsLink.trim() : null,
      status: formData.status,
    };

    try {
      setIsSubmitting(true);
      await onSubmit(payload);
    } catch (err) {
      if (err.validationErrors) {
        setErrors(err.validationErrors);
      } else {
        setErrors((prev) => ({
          ...prev,
          form: err.message || 'Unable to create event. Please try again.',
        }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Create New Event</h2>
            <p className="text-xs text-slate-500 mt-0.5">Fill in event details to add to your calendar</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          {errors.form && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-sm text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.form}</span>
            </div>
          )}

          {/* Overlap Warning */}
          {overlappingNotice && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">{overlappingNotice}</span>
                <span className="text-amber-700">
                  {allowOverlaps
                    ? 'Multiple events can be scheduled at the same time.'
                    : 'Overlapping events are flagged. Please check before saving.'}
                </span>
              </div>
            </div>
          )}

          {/* SECTION 1: EVENT INFORMATION */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Event Information
            </h3>

            <div className="space-y-4">
              {/* Event Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Event Name <span className="text-rose-500">*</span>
                </label>
                <input
                  ref={titleInputRef}
                  type="text"
                  placeholder="Enter event name (e.g. Book Industry Events)"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm custom-input focus:outline-none transition-all ${
                    errors.title
                      ? 'border-rose-400 bg-rose-50/30'
                      : 'border-slate-200 bg-white'
                  }`}
                />
                {errors.title && <p className="mt-1 text-xs text-rose-600 font-medium"><GentizeText>{errors.title}</GentizeText></p>}
              </div>

              {/* Event Organizer Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Event Organizer Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter organizer name"
                  value={formData.organizerName}
                  onChange={(e) => handleChange('organizerName', e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm custom-input focus:outline-none transition-all ${
                    errors.organizerName
                      ? 'border-rose-400 bg-rose-50/30'
                      : 'border-slate-200 bg-white'
                  }`}
                />
                {errors.organizerName && <p className="mt-1 text-xs text-rose-600 font-medium"><GentizeText>{errors.organizerName}</GentizeText></p>}
              </div>

              {/* Start Date & End Date in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => {
                      handleChange('startDate', e.target.value);
                      // If endDate is empty or before the new startDate, default endDate to the same
                      if (!formData.endDate || formData.endDate < e.target.value) {
                        handleChange('endDate', e.target.value);
                      }
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm custom-input focus:outline-none transition-all ${
                      errors.startDate
                        ? 'border-rose-400 bg-rose-50/30'
                        : 'border-slate-200 bg-white'
                    }`}
                  />
                  {errors.startDate && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.startDate}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleChange('endDate', e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm custom-input focus:outline-none transition-all ${
                      errors.endDate
                        ? 'border-rose-400 bg-rose-50/30'
                        : 'border-slate-200 bg-white'
                    }`}
                  />
                  {errors.endDate && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.endDate}</p>}
                </div>
              </div>

              {/* Start Time & End Time in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleChange('startTime', e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm custom-input focus:outline-none transition-all ${
                      errors.startTime
                        ? 'border-rose-400 bg-rose-50/30'
                        : 'border-slate-200 bg-white'
                    }`}
                  />
                  {errors.startTime && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.startTime}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleChange('endTime', e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm custom-input focus:outline-none transition-all ${
                      errors.endTime
                        ? 'border-rose-400 bg-rose-50/30'
                        : 'border-slate-200 bg-white'
                    }`}
                  />
                  {errors.endTime && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.endTime}</p>}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Work and connect with readers, review requirements..."
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm custom-input focus:outline-none resize-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: CONTACT DETAILS */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Contact Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Phone with Country Code */}
              <div className="relative" ref={countryDropdownRef}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>

                <div className={`flex items-center rounded-xl bg-white border transition focus-within:ring-2 ${
                  errors.phone
                    ? 'border-rose-400 focus-within:ring-rose-500/20 focus-within:border-rose-500 bg-rose-50/20'
                    : 'border-slate-200 focus-within:ring-orange-500/20 focus-within:border-orange-500'
                }`}>
                  <button
                    type="button"
                    onClick={() => setCountryDropdownOpen(prev => !prev)}
                    className="h-10 px-2.5 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800 border-r border-slate-200 rounded-l-xl flex items-center gap-1 shrink-0 transition select-none cursor-pointer"
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
                    className="flex-1 min-w-0 px-3 py-2 bg-transparent text-sm font-semibold text-slate-800 focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
                  />
                </div>

                {countryDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 max-h-56 overflow-y-auto animate-in fade-in duration-100">
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Select Country Code
                    </div>
                    {Object.entries(COUNTRY_CONFIG).map(([code, config]) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => handleCountryChange(code)}
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

                {/* Helper / Validation caption */}
                {errors.phone ? (
                  <p className="mt-1 text-[11px] text-rose-600 font-medium">{errors.phone}</p>
                ) : phoneTouched && rawPhoneNumber && rawPhoneNumber.length < (COUNTRY_CONFIG[selectedCountryCode]?.digits || 10) ? (
                  <p className="mt-1 text-[11px] text-amber-600 font-semibold">
                    <GentizeText>{COUNTRY_CONFIG[selectedCountryCode]?.name}</GentizeText> mobile number requires {COUNTRY_CONFIG[selectedCountryCode]?.digits} digits ({rawPhoneNumber.length}/{COUNTRY_CONFIG[selectedCountryCode]?.digits})
                  </p>
                ) : rawPhoneNumber && rawPhoneNumber.length === (COUNTRY_CONFIG[selectedCountryCode]?.digits || 10) ? (
                  <p className="mt-1 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span>✓ Valid {COUNTRY_CONFIG[selectedCountryCode]?.digits}-digit mobile number</span>
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-400">
                    {COUNTRY_CONFIG[selectedCountryCode]?.digits || 10} digits (<GentizeText>{COUNTRY_CONFIG[selectedCountryCode]?.name}</GentizeText>)
                  </p>
                )}
              </div>

              {/* Email with validation */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gmail / Email ID
                </label>

                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={handleEmailChange}
                  onBlur={() => setEmailTouched(true)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm custom-input focus:outline-none transition-all ${
                    errors.email || (emailTouched && formData.email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email.trim()))
                      ? 'border-rose-400 bg-rose-50/20 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-slate-200 bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500'
                  }`}
                />

                {/* Email caption */}
                {errors.email ? (
                  <p className="mt-1 text-[11px] text-rose-600 font-medium">{errors.email}</p>
                ) : emailTouched && formData.email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email.trim()) ? (
                  <p className="mt-1 text-[11px] text-rose-500 font-medium">
                    Please enter a valid email address format (e.g. name@domain.com)
                  </p>
                ) : formData.email && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email.trim()) ? (
                  <p className="mt-1 text-[11px] text-emerald-600 font-semibold">
                    ✓ Valid email address
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-400">
                    e.g. name@domain.com
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: LOCATION / EVENT DETAILS */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Location / Event Details
            </h3>

            <div className="space-y-4">
              {/* Event Type Dropdown with custom CSS */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Event Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.eventType}
                  onChange={(e) => handleEventTypeChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm custom-select cursor-pointer"
                >
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                </select>
              </div>

              {/* DYNAMIC ONLINE UI */}
              {formData.eventType === 'Online' && (
                <div className="space-y-2 animate-fadeIn">
                  <label className="block text-xs font-semibold text-slate-700">
                    Google Meet Link <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Video className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      placeholder="https://meet.google.com/abc-defg-hij"
                      value={formData.meetingLink}
                      onChange={(e) => handleChange('meetingLink', e.target.value)}
                      className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm custom-input focus:outline-none transition-all ${
                        errors.meetingLink
                          ? 'border-rose-400 bg-rose-50/30'
                          : 'border-slate-200 bg-white'
                      }`}
                    />
                  </div>
                  {errors.meetingLink && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">{errors.meetingLink}</p>
                  )}
                </div>
              )}

              {/* DYNAMIC OFFLINE UI */}
              {formData.eventType === 'Offline' && (
                <div className="space-y-3 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Address <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Enter event address (e.g. 123 Anna Nagar, Chennai, Tamil Nadu)"
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm custom-input focus:outline-none resize-none transition-all ${
                        errors.address
                          ? 'border-rose-400 bg-rose-50/30'
                          : 'border-slate-200 bg-white'
                      }`}
                    />
                    {errors.address && (
                      <p className="mt-1 text-xs text-rose-600 font-medium">{errors.address}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Google Maps Link
                    </label>
                    <div className="relative">
                      <Navigation className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        placeholder="https://maps.google.com/..."
                        value={formData.googleMapsLink}
                        onChange={(e) => handleChange('googleMapsLink', e.target.value)}
                        className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm custom-input focus:outline-none transition-all ${
                          errors.googleMapsLink
                            ? 'border-rose-400 bg-rose-50/30'
                          : 'border-slate-200 bg-white'
                        }`}
                      />
                    </div>
                    {errors.googleMapsLink && (
                      <p className="mt-1 text-xs text-rose-600 font-medium">{errors.googleMapsLink}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-xl shadow-sm shadow-orange-500/20 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                'Save Event'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
