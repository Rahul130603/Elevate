import { GoogleSignInButton } from '../../components/common/GoogleSignInButton.jsx';
import { ProfileAvatar } from '../../components/common/ProfileAvatar.jsx';
import { MobileDock } from '../../components/common/MobileDock.jsx';
import { GentizeText } from '../../components/common/GentizeText.jsx';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiRequest } from '../../api/client.js';
import { notificationService } from '../../services/notificationService.js';
import { CustomTimePicker } from '../../components/common/CustomTimePicker.jsx';

if (typeof window !== 'undefined') {
  window.L = L;
}

import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  User,
  Mail,
  Phone,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Globe,
  RefreshCw,
  ShieldCheck,
  CalendarCheck,
  Zap,
  BellRing,
  Video,
  Building2,
  PhoneCall,
  Share2,
  XCircle,
  ExternalLink,
  Sun,
  Sunrise,
  Moon,
  Send,
  Lock,
  LogOut,
  KeyRound,
  Key,
  Eye,
  EyeOff,
  Bell,
  Check,
  X,
  History,
  Copy,
  Navigation,
  Laptop,
  Edit3,
  Menu,
  ChevronDown,
  Trash2,
  RotateCcw,
  UserPlus
} from 'lucide-react';

export const GENTIZE_OFFICE_MAPS_URL = 'https://maps.app.goo.gl/NYhvrAEYn4mps6kLA';
export const MD_CABIN_MAPS_URL = GENTIZE_OFFICE_MAPS_URL;
export const GENTIZE_OFFICE_EMBED_URL = 'https://maps.google.com/maps?q=13.0193005,80.1343397&z=15&output=embed';
export const MD_CABIN_EMBED_URL = GENTIZE_OFFICE_EMBED_URL;

export const COUNTRY_CONFIG = {
  '+91': { name: 'India', flag: '🇮🇳', digits: 10, placeholder: '98765 43210' },
  '+1': { name: 'USA/Canada', flag: '🇺🇸', digits: 10, placeholder: '202 555 0123' },
  '+44': { name: 'UK', flag: '🇬🇧', digits: 10, placeholder: '7911 123456' },
  '+971': { name: 'UAE', flag: '🇦🇪', digits: 9, placeholder: '50 123 4567' },
  '+65': { name: 'Singapore', flag: '🇸🇬', digits: 8, placeholder: '8123 4567' },
  '+61': { name: 'Australia', flag: '🇦🇺', digits: 9, placeholder: '412 345 678' },
  '+966': { name: 'Saudi Arabia', flag: '🇸🇦', digits: 9, placeholder: '50 123 4567' },
  '+49': { name: 'Germany', flag: '🇩🇪', digits: 11, placeholder: '151 12345678' },
  '+60': { name: 'Malaysia', flag: '🇲🇾', digits: 10, placeholder: '12 345 6789' },
  '+33': { name: 'France', flag: '🇫🇷', digits: 9, placeholder: '6 12 34 56 78' },
};

export const PRESET_GOOGLE_ACCOUNTS = [
  {
    name: 'Nissi Raj',
    email: 'gen.nissiraj@gmail.com',
    initial: 'N',
    color: 'bg-[#9c183e] text-white',
  },
  {
    name: 'Sudhinraj A',
    email: 'gen.sudhinraj@gmail.com',
    initial: 'S',
    color: 'bg-[#6d4c41] text-white',
  },
  {
    name: 'Sudhin Raj',
    email: 'sudhinns333@gmail.com',
    initial: 'S',
    color: 'bg-[#37474f] text-white',
  },
  {
    name: 'Ganesh Kothandan',
    email: 'gentizea11y@gmail.com',
    initial: 'G',
    color: 'bg-[#00796b] text-white',
  },
  {
    name: 'Lakshmi M',
    email: 'nakshu222026@gmail.com',
    initial: 'L',
    color: 'bg-[#e65100] text-white',
  },
];

export function generateRandomGoogleMeetCode() {
  return 'https://meet.google.com/new';
}

export function createRedPinIcon() {
  return L.divIcon({
    className: 'user-picked-map-pin',
    html: `
      <div style="position:relative; width:36px; height:36px; display:flex; align-items:center; justify-content:center; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35)); cursor:pointer;">
        <svg viewBox="0 0 24 24" width="36" height="36" fill="#EF4444" stroke="#991B1B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3.2" fill="#FFFFFF"></circle>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
}

// Reverse geocoding helper using Backend Multi-Source API (/api/public/map-reverse) + Client fallback
export async function reverseGeocodeLocation(lat, lon) {
  try {
    const res = await apiRequest(`/public/map-reverse?lat=${lat}&lon=${lon}`);
    if (res && res.success && res.fullAddress) {
      return {
        shortTitle: res.shortTitle || 'Selected Venue',
        fullAddress: res.fullAddress,
        placeName: res.placeName || res.fullAddress,
      };
    }
  } catch (_) {}

  // Client-side fallback with full address details (village, town, road, district, state)
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`, {
      headers: { 'Accept-Language': 'en' }
    });
    if (res.ok) {
      const data = await res.json();
      const a = data.address || {};
      const specific = data.name || a.amenity || a.shop || a.building || a.office || a.restaurant || a.road || a.street || '';
      const local = a.village || a.hamlet || a.suburb || a.neighbourhood || a.residential || '';
      const townOrCity = a.city || a.town || '';
      const talukOrCounty = a.subdistrict || a.taluk || a.county || '';
      const district = a.state_district || '';
      const state = a.state || 'Tamil Nadu';
      const postcode = a.postcode || '';

      const parts = [specific, local, townOrCity || talukOrCounty, district !== townOrCity ? district : '', state, postcode].filter(Boolean);
      const unique = Array.from(new Set(parts)).join(', ');
      const title = specific || local || townOrCity || talukOrCounty || 'Selected Location';
      return {
        shortTitle: title,
        fullAddress: unique || data.display_name,
        placeName: unique || data.display_name,
      };
    }
  } catch (_) {}

  return {
    shortTitle: 'Custom Location',
    fullAddress: `Location (${lat.toFixed(5)}, ${lon.toFixed(5)})`,
    placeName: `Location (${lat.toFixed(5)}, ${lon.toFixed(5)})`,
  };
}

export async function searchPlacesLive(query) {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim();

  // 1. Backend Unified Map Search (Google Maps Embed + Photon + Nominatim)
  try {
    const res = await apiRequest(`/public/map-search?q=${encodeURIComponent(q)}`);
    if (res && Array.isArray(res.places) && res.places.length > 0) {
      return res.places;
    }
  } catch (_) {}

  // 2. Direct Photon fallback
  try {
    const pRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6`);
    if (pRes.ok) {
      const pData = await pRes.json();
      if (pData.features && pData.features.length > 0) {
        return pData.features.map(f => {
          const p = f.properties;
          const name = p.name || '';
          const sub = [p.street, p.locality || p.district, p.city || p.county, p.state].filter(Boolean).join(', ');
          return {
            label: name ? (sub ? `${name}, ${sub}` : name) : sub,
            shortName: name || q,
            subtitle: sub,
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
            source: 'OpenStreetMap'
          };
        });
      }
    }
  } catch (_) {}

  return [];
}

const PORTAL_OPTIONS = [
  { id: 'admin', name: 'Admin Portal', emoji: '🛡️', role: 'Gentize' },
  { id: 'user', name: 'User / Assistant', emoji: '📅', role: 'Staff Workspace' },
  { id: 'sales', name: 'Sales Team Portal', emoji: '💼', role: 'Sales Team Lead' },
  { id: 'client', name: 'Client Booking', emoji: '🌐', role: 'Public Booking Page (Active)' },

];

export function PublicBookingPage({ clientOnly = false, onBackToPortal, onSwitchPortal }) {
  const [portalDropdownOpen, setPortalDropdownOpen] = useState(false);
  const portalDropdownRef = useRef(null);

  useEffect(() => {
    if (!portalDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (portalDropdownRef.current && !portalDropdownRef.current.contains(e.target)) {
        setPortalDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [portalDropdownOpen]);

  // Client Authentication State - Persistent in localStorage for real-time app experience
  const [clientAuth, setClientAuth] = useState(() => {
    try {
      const saved = localStorage.getItem('gentize_client_auth');
      return saved ? JSON.parse(saved) : null;
    } catch (_) {
      return null;
    }
  });

  // Client Auth Modal State (Sign In / Self Registration)
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login'); // 'login' | 'register'
  const [authIdentifier, setAuthIdentifier] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authRegName, setAuthRegName] = useState('');
  const [authRegEmail, setAuthRegEmail] = useState('');
  const [authRegCountryCode, setAuthRegCountryCode] = useState('+91');
  const [authRegRawPhone, setAuthRegRawPhone] = useState('');
  const [authRegPhone, setAuthRegPhone] = useState('');
  const [authRegPassword, setAuthRegPassword] = useState('');
  const [authRegCountryDropdownOpen, setAuthRegCountryDropdownOpen] = useState(false);
  const authRegCountryDropdownRef = useRef(null);
  const [authRegEmailTouched, setAuthRegEmailTouched] = useState(false);
  const [authRegPhoneTouched, setAuthRegPhoneTouched] = useState(false);
  const [showAuthRegPassword, setShowAuthRegPassword] = useState(false);
  const [showAuthLoginPassword, setShowAuthLoginPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Booking Password for new clients during Step 3
  const [bookingPassword, setBookingPassword] = useState('');
  const [showBookingPassword, setShowBookingPassword] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adminInfo, setAdminInfo] = useState(null);
  const [schedules, setSchedules] = useState([]);

  // Client Bookings, Notifications & Tab State
  const [clientBookings, setClientBookings] = useState([]);
  const [clientNotifications, setClientNotifications] = useState([]);
  const [activeClientTab, setActiveClientTab] = useState('book'); // 'book' | 'my-appointments' | 'notifications'
  const [bookingTarget, setBookingTarget] = useState('MD'); // 'MD' | 'SALES_LEAD'
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [notifFilter, setNotifFilter] = useState('ALL');
  const [highlightedBookingId, setHighlightedBookingId] = useState(null);
  const [mdConfirmedModal, setMdConfirmedModal] = useState(null);
  const isInitialFetchRef = useRef(true);
  const lastNotifiedBookingIdsRef = useRef(new Set());

  const playConfirmationChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const playTone = (freq, start, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };
      playTone(523.25, 0, 0.2);
      playTone(659.25, 0.12, 0.2);
      playTone(783.99, 0.24, 0.3);
      playTone(1046.50, 0.38, 0.5);
    } catch (_) {}
  };

  const handleNavigateToBooking = (targetBookingId) => {
    if (!targetBookingId) {
      setActiveClientTab('my-appointments');
      return;
    }

    // 1. Switch directly to My Appointments & Status tab
    setActiveClientTab('my-appointments');
    // 2. Clear status filter so the target booking is guaranteed to show
    setSelectedStatusFilter('ALL');
    // 3. Mark targeted booking
    setHighlightedBookingId(targetBookingId);

    // 4. Smooth scroll directly to that specific booking's detail card
    setTimeout(() => {
      const el = document.getElementById(`booking-card-${targetBookingId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);

    // Keep highlight active for 6 seconds
    setTimeout(() => {
      setHighlightedBookingId(prev => (prev === targetBookingId ? null : prev));
    }, 6000);
  };

  const [clientProfileOpen, setClientProfileOpen] = useState(false);
  const clientProfileRef = useRef(null);

  const [clientNotifLastReadTime, setClientNotifLastReadTime] = useState(() => {
    const key = `gentize_client_notif_last_read_${clientAuth?.id || clientAuth?.email || 'guest'}`;
    const saved = localStorage.getItem(key);
    if (saved) return saved;
    const now = new Date().toISOString();
    try {
      localStorage.setItem(key, now);
    } catch (_) {}
    return now;
  });

  const clientUnreadCount = useMemo(() => {
    if (!clientNotifications || clientNotifications.length === 0) return 0;
    if (!clientNotifLastReadTime) return 0;
    const lastReadTs = new Date(clientNotifLastReadTime).getTime();
    return clientNotifications.filter(n => {
      const sentTs = new Date(n.sent_at || n.created_at || 0).getTime();
      return sentTs > lastReadTs;
    }).length;
  }, [clientNotifications, clientNotifLastReadTime]);

  const filteredClientNotifications = useMemo(() => {
    if (notifFilter === 'ALL') return clientNotifications;
    return clientNotifications.filter(n => n.booking_status === notifFilter);
  }, [clientNotifications, notifFilter]);

  const clientPendingBookings = useMemo(() => {
    return (clientBookings || []).filter(b => b.status === 'PENDING');
  }, [clientBookings]);

  const handleOpenNotificationsTab = () => {
    setActiveClientTab('notifications');
    setMobileSidebarOpen(false);
    const now = new Date().toISOString();
    const key = `gentize_client_notif_last_read_${clientAuth?.id || clientAuth?.email || 'guest'}`;
    try {
      localStorage.setItem(key, now);
    } catch (_) {}
    setClientNotifLastReadTime(now);
  };

  useEffect(() => {
    if (activeClientTab === 'notifications' && clientNotifications.length > 0) {
      const now = new Date().toISOString();
      const key = `gentize_client_notif_last_read_${clientAuth?.id || clientAuth?.email || 'guest'}`;
      try {
        localStorage.setItem(key, now);
      } catch (_) {}
      setClientNotifLastReadTime(now);
    }
  }, [activeClientTab, clientNotifications.length]);

  useEffect(() => {
    if (!clientProfileOpen) return;
    const handleScroll = () => {
      setClientProfileOpen(false);
    };
    const handleClickOutside = (e) => {
      if (clientProfileRef.current && !clientProfileRef.current.contains(e.target)) {
        setClientProfileOpen(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [clientProfileOpen]);

  // Calendar View Month navigation
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Today's date string YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Selection State
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingStep, setBookingStep] = useState(1); // 1 = Date, 2 = Time Slot, 3 = Contact & Mode
  useEffect(() => {
    if (bookingStep > 1 && window.matchMedia('(max-width: 1023px)').matches) {
      document.getElementById('client-booking-wizard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [bookingStep]);

  // Pre-booking state (for dates without pre-generated slots)
  const [preBookingTime, setPreBookingTime] = useState('10:00');
  const [preBookingDuration, setPreBookingDuration] = useState(30);

  // Meeting Mode & Detailed Settings State
  const [meetingMode, setMeetingMode] = useState('Gentize Office (In-Person)');
  const [googleMeetLink, setGoogleMeetLink] = useState('');
  const [meetCopied, setMeetCopied] = useState(false);
  const [editingMeetBookingId, setEditingMeetBookingId] = useState(null);
  const [editingMeetLinkText, setEditingMeetLinkText] = useState('');
  const [updatingMeetLink, setUpdatingMeetLink] = useState(false);
  const [otherType, setOtherType] = useState('APP'); // 'APP' (Virtual Platform) or 'VENUE' (Physical Location)
  const [otherAppName, setOtherAppName] = useState('Zoom');
  const [otherMeetingLink, setOtherMeetingLink] = useState('');
  const [otherVenue, setOtherVenue] = useState('');
  const [otherModeText, setOtherModeText] = useState('');
  const [showVenueMapModal, setShowVenueMapModal] = useState(false);
  const [mapSearchInput, setMapSearchInput] = useState('');
  const [mapLocationPreview, setMapLocationPreview] = useState('Chennai, Tamil Nadu');
  const [isLocating, setIsLocating] = useState(false);
  const [mapSearchResults, setMapSearchResults] = useState([]);
  const [selectedMapVenueName, setSelectedMapVenueName] = useState('');
  const mapContainerRef = useRef(null);
  const leafletMapInstanceRef = useRef(null);
  const leafletMarkerRef = useRef(null);
  const searchDebounceRef = useRef(null);

  // Helper to parse phone into country code and raw digits
  const parseInitialPhone = (phoneStr) => {
    if (!phoneStr) return { code: '+91', digits: '' };
    for (const code of Object.keys(COUNTRY_CONFIG)) {
      if (phoneStr.startsWith(code)) {
        const rawDigits = phoneStr.slice(code.length).replace(/\D/g, '');
        const maxD = COUNTRY_CONFIG[code].digits;
        return { code, digits: rawDigits.slice(0, maxD) };
      }
    }
    const cleanDigits = phoneStr.replace(/\D/g, '');
    return { code: '+91', digits: cleanDigits.slice(0, 10) };
  };

  const [selectedCountryCode, setSelectedCountryCode] = useState(() => {
    return parseInitialPhone(clientAuth?.phone || '').code;
  });
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef(null);
  const [rawPhoneNumber, setRawPhoneNumber] = useState(() => {
    return parseInitialPhone(clientAuth?.phone || '').digits;
  });
  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  // Client Form State - auto-populated if clientAuth exists, else blank for manual entry
  const [formData, setFormData] = useState(() => ({
    name: clientAuth?.name || '',
    email: clientAuth?.email?.endsWith('@meeetly.client') ? '' : (clientAuth?.email || ''),
    phone: clientAuth?.phone || '',
    purpose: '',
    notes: '',
  }));

  // Auto-sync form when client logs in or changes
  useEffect(() => {
    if (clientAuth) {
      setFormData(prev => ({
        ...prev,
        name: clientAuth?.name || prev.name,
        email: clientAuth?.email?.endsWith('@meeetly.client') ? prev.email : (clientAuth?.email || prev.email),
        phone: clientAuth?.phone || prev.phone,
      }));
      if (clientAuth?.phone) {
        const parsed = parseInitialPhone(clientAuth.phone);
        setSelectedCountryCode(parsed.code);
        setRawPhoneNumber(parsed.digits);
      }
    }
  }, [clientAuth]);

  const isEmailValid = (email) => {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(String(email || '').trim());
  };

  const isPhoneValid = () => {
    const expectedDigits = COUNTRY_CONFIG[selectedCountryCode]?.digits || 10;
    return rawPhoneNumber.length === expectedDigits;
  };

  const handlePhoneChange = (e) => {
    setPhoneTouched(true);
    const digitsOnly = e.target.value.replace(/\D/g, '');
    const maxDigits = COUNTRY_CONFIG[selectedCountryCode]?.digits || 10;
    const limited = digitsOnly.slice(0, maxDigits);
    setRawPhoneNumber(limited);
    setFormData(prev => ({
      ...prev,
      phone: limited ? `${selectedCountryCode} ${limited}` : ''
    }));
  };

  const handleCountryCodeChange = (codeOrEvent) => {
    const newCode = typeof codeOrEvent === 'string' ? codeOrEvent : codeOrEvent?.target?.value;
    if (!newCode) return;
    setSelectedCountryCode(newCode);
    const maxDigits = COUNTRY_CONFIG[newCode]?.digits || 10;
    const trimmed = rawPhoneNumber.slice(0, maxDigits);
    setRawPhoneNumber(trimmed);
    setFormData(prev => ({
      ...prev,
      phone: trimmed ? `${newCode} ${trimmed}` : ''
    }));
  };

  // 3-Second Undo State for Client Clear Data
  const [clientUndoActive, setClientUndoActive] = useState(false);
  const [clientUndoSeconds, setClientUndoSeconds] = useState(3);
  const clientUndoActiveRef = useRef(false);
  const clientAuthRef = useRef(clientAuth);
  const clientClearedBackupRef = useRef([]);
  const clientUndoTimerRef = useRef(null);
  const clientCountdownIntervalRef = useRef(null);

  useEffect(() => {
    clientUndoActiveRef.current = clientUndoActive;
  }, [clientUndoActive]);

  useEffect(() => {
    clientAuthRef.current = clientAuth;
  }, [clientAuth]);

  const cleanupClientUndoTimers = () => {
    if (clientUndoTimerRef.current) {
      clearTimeout(clientUndoTimerRef.current);
      clientUndoTimerRef.current = null;
    }
    if (clientCountdownIntervalRef.current) {
      clearInterval(clientCountdownIntervalRef.current);
      clientCountdownIntervalRef.current = null;
    }
  };

  const getClientClearKey = (auth) => {
    const a = auth || clientAuth;
    return `client_notifications_cleared_at_${a?.id || a?.email || 'guest'}`;
  };

  const commitClientClearNotifications = async () => {
    cleanupClientUndoTimers();
    setClientUndoActive(false);
    clientClearedBackupRef.current = [];
    localStorage.setItem(getClientClearKey(), Date.now().toString());
    try {
      const email = clientAuthRef.current?.email || '';
      const name = clientAuthRef.current?.name || '';
      await apiRequest(`/public/client-notifications/clear-all?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to commit client notifications clear:', err);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (clientUndoActiveRef.current) {
        const email = clientAuthRef.current?.email || '';
        const name = clientAuthRef.current?.name || '';
        const url = `/api/public/client-notifications/clear-all?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`;
        if (navigator.sendBeacon) {
          navigator.sendBeacon(url);
        } else {
          fetch(url, { method: 'POST', keepalive: true }).catch(() => {});
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (clientUndoActiveRef.current) {
        const email = clientAuthRef.current?.email || '';
        const name = clientAuthRef.current?.name || '';
        fetch(`/api/public/client-notifications/clear-all?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`, { method: 'POST', keepalive: true }).catch(() => {});
      }
      cleanupClientUndoTimers();
    };
  }, []);

  const handleClientClearNotifications = () => {
    if (clientNotifications.length === 0) return;
    clientClearedBackupRef.current = [...clientNotifications];
    setClientNotifications([]);
    cleanupClientUndoTimers();
    localStorage.setItem(getClientClearKey(), Date.now().toString());

    setClientUndoSeconds(3);
    setClientUndoActive(true);

    clientCountdownIntervalRef.current = setInterval(() => {
      setClientUndoSeconds((prev) => {
        if (prev <= 1) {
          if (clientCountdownIntervalRef.current) {
            clearInterval(clientCountdownIntervalRef.current);
            clientCountdownIntervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    clientUndoTimerRef.current = setTimeout(() => {
      commitClientClearNotifications();
    }, 3000);
  };

  const handleClientUndoClear = () => {
    cleanupClientUndoTimers();
    localStorage.removeItem(getClientClearKey());
    if (clientClearedBackupRef.current.length > 0) {
      setClientNotifications(clientClearedBackupRef.current);
      clientClearedBackupRef.current = [];
    }
    setClientUndoActive(false);
  };

  const handleClientRefreshNotifications = async () => {
    if (clientUndoActive) {
      await commitClientClearNotifications();
    }
    await fetchClientPortalData();
  };

  // Fetch client bookings and real-time notifications
  const fetchClientPortalData = async (overrideAuth) => {
    try {
      let currentAuth = overrideAuth !== undefined ? overrideAuth : clientAuth;
      if (!currentAuth && overrideAuth === undefined) {
        try {
          const saved = localStorage.getItem('gentize_client_auth');
          if (saved) currentAuth = JSON.parse(saved);
        } catch (_) {}
      }

      // If user is not logged in as a client, strictly clear data and return
      if (!currentAuth) {
        setClientBookings([]);
        setClientNotifications([]);
        return;
      }

      const params = new URLSearchParams();
      if (currentAuth?.id) params.append('clientId', currentAuth.id);
      if (currentAuth?.email) params.append('email', currentAuth.email);
      if (currentAuth?.phone) params.append('phone', currentAuth.phone);
      if (currentAuth?.name) params.append('name', currentAuth.name);

      const query = params.toString();

      const [bRes, nRes] = await Promise.all([
        apiRequest(`/public/client-bookings?${query}`).catch(() => ({ bookings: [] })),
        apiRequest(`/public/client-notifications?${query}`).catch(() => ({ notifications: [] })),
      ]);

      const fetchedBookings = bRes.bookings || [];
      const fetchedNotifs = nRes.notifications || [];

      setClientBookings(fetchedBookings);

      // Live update confirmedBooking if currently open on screen
      if (confirmedBooking?.id) {
        const matchingCurrent = fetchedBookings.find(b => b.id === confirmedBooking.id);
        if (matchingCurrent && matchingCurrent.status !== confirmedBooking.status) {
          setConfirmedBooking(prev => ({
            ...prev,
            status: matchingCurrent.status,
            meetingLink: matchingCurrent.meeting_link || prev?.meetingLink,
            confirmed_at: matchingCurrent.confirmed_at || matchingCurrent.updated_at,
          }));
          if (matchingCurrent.status === 'CONFIRMED') {
            playConfirmationChime();
            setMdConfirmedModal(matchingCurrent);
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              try { navigator.vibrate([200, 100, 200, 100, 300]); } catch (_) {}
            }
          }
        }
      }

      // Check for MD confirmation
      const confirmedBookings = fetchedBookings.filter(b => b.status === 'CONFIRMED');
      const confirmedNotifs = fetchedNotifs.filter(n =>
        n.booking_status === 'CONFIRMED' || (n.title && n.title.toLowerCase().includes('confirmed'))
      );

      let storedNotified = new Set();
      try {
        const parsed = JSON.parse(localStorage.getItem('gentize_client_notified_confirmed_ids') || '[]');
        storedNotified = new Set(parsed);
      } catch (_) {}

      if (isInitialFetchRef.current) {
        // Initial load: populate existing confirmed bookings to prevent notification spam
        confirmedBookings.forEach(b => {
          storedNotified.add(b.id);
          lastNotifiedBookingIdsRef.current.add(b.id);
        });
        confirmedNotifs.forEach(n => {
          if (n.booking_id) {
            storedNotified.add(n.booking_id);
            lastNotifiedBookingIdsRef.current.add(n.booking_id);
          }
        });
        try {
          localStorage.setItem('gentize_client_notified_confirmed_ids', JSON.stringify([...storedNotified]));
        } catch (_) {}
        isInitialFetchRef.current = false;
      } else {
        // Subsequent poll: find any booking that was just confirmed by MD
        let newlyApproved = null;
        for (const b of confirmedBookings) {
          if (!storedNotified.has(b.id) && !lastNotifiedBookingIdsRef.current.has(b.id)) {
            newlyApproved = b;
            break;
          }
        }

        if (!newlyApproved) {
          for (const n of confirmedNotifs) {
            if (n.booking_id && !storedNotified.has(n.booking_id) && !lastNotifiedBookingIdsRef.current.has(n.booking_id)) {
              newlyApproved = confirmedBookings.find(b => b.id === n.booking_id) || {
                id: n.booking_id,
                date: n.booking_date,
                display_time: n.displayTime,
                location: n.location,
                client_name: n.client_name,
              };
              break;
            }
          }
        }

        if (newlyApproved) {
          storedNotified.add(newlyApproved.id);
          lastNotifiedBookingIdsRef.current.add(newlyApproved.id);
          try {
            localStorage.setItem('gentize_client_notified_confirmed_ids', JSON.stringify([...storedNotified]));
          } catch (_) {}

          // 1. Dispatch native Android/iOS system local notification
          const isLeadTarget = newlyApproved.booking_target === 'SALES_LEAD' || bookingTarget === 'SALES_LEAD';
          notificationService.scheduleLocalDeviceNotification({
            id: newlyApproved.id,
            title: isLeadTarget ? '🎉 Appointment Confirmed by Sales Lead!' : '🎉 Appointment Confirmed by Gentize!',
            body: `${isLeadTarget ? 'Sales Team Lead' : 'Gentize'} has approved your appointment for ${newlyApproved.date || 'upcoming date'} at ${newlyApproved.display_time || newlyApproved.displayTime || ''}. Location: ${newlyApproved.location || (isLeadTarget ? 'Sales Desk' : 'Gentize Cabin')}.`,
          });

          // 2. Play celebratory audio chime
          playConfirmationChime();

          // 3. Vibrate device
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
              navigator.vibrate([200, 100, 200, 100, 300]);
            } catch (_) {}
          }

          // 4. Show celebratory in-app modal
          setMdConfirmedModal(newlyApproved);
        }
      }

      const clearKey = getClientClearKey(currentAuth);
      const clearedAt = localStorage.getItem(clearKey);
      if (clearedAt && !clientUndoActive) {
        const clearedTime = parseInt(clearedAt, 10);
        const filtered = fetchedNotifs.filter(n => {
          const t = new Date(n.sent_at || n.delivered_at || n.created_at || 0).getTime();
          return t > clearedTime;
        });
        setClientNotifications(filtered);
      } else if (!clientUndoActive) {
        setClientNotifications(fetchedNotifs);
      }
    } catch (err) {
      console.error('Failed to load client portal data:', err);
    }
  };

  useEffect(() => {
    fetchClientPortalData();
    const interval = setInterval(() => {
      fetchClientPortalData();
    }, 5000); // 5s auto-refresh for instant MD confirmations
    return () => clearInterval(interval);
  }, [clientAuth?.id, clientAuth?.email, activeClientTab]);

  useEffect(() => {
    return () => {
      cleanupClientUndoTimers();
    };
  }, []);

  // Close Country Code Dropdown on Outside Click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target)) {
        setCountryDropdownOpen(false);
      }
      if (authRegCountryDropdownRef.current && !authRegCountryDropdownRef.current.contains(e.target)) {
        setAuthRegCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Leaflet Interactive Map Lifecycle for Custom Venue Selection
  useEffect(() => {
    if (!showVenueMapModal) {
      if (leafletMapInstanceRef.current) {
        try {
          leafletMapInstanceRef.current.remove();
        } catch (_) {}
        leafletMapInstanceRef.current = null;
        leafletMarkerRef.current = null;
      }
      return;
    }

    let isMounted = true;
    const timers = [];

    const initLeafletMap = () => {
      if (!mapContainerRef.current || leafletMapInstanceRef.current) return;

      // Default Vadapalani / Chennai coordinates
      const defaultLat = 13.0500;
      const defaultLon = 80.2120;

      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true
      }).setView([defaultLat, defaultLon], 15);

      // Google Maps Roadmap tiles
      const googleTiles = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['0', '1', '2', '3'],
        attribution: '&copy; Google Maps'
      });

      // OSM tiles fallback
      const osmTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      });

      googleTiles.addTo(map);

      googleTiles.on('tileerror', () => {
        if (!map.hasLayer(osmTiles)) {
          osmTiles.addTo(map);
        }
      });

      const redIcon = createRedPinIcon();

      // Handle selecting any point (from map click, GPS, drag, or search)
      const selectPoint = async (lat, lon, presetName = null) => {
        setIsLocating(true);
        let geoData = null;
        if (presetName && typeof presetName === 'object') {
          geoData = presetName;
        } else {
          geoData = await reverseGeocodeLocation(lat, lon);
        }
        if (!isMounted) return;
        setIsLocating(false);

        const shortTitle = (typeof presetName === 'string' && presetName) ? presetName : (geoData?.shortTitle || 'Selected Venue');
        const fullAddress = geoData?.fullAddress || geoData?.placeName || (typeof presetName === 'string' ? presetName : `Location (${lat.toFixed(5)}, ${lon.toFixed(5)})`);

        if (leafletMarkerRef.current) {
          leafletMarkerRef.current.setLatLng([lat, lon]);
        } else {
          leafletMarkerRef.current = L.marker([lat, lon], { icon: redIcon, draggable: true }).addTo(map);
          leafletMarkerRef.current.on('dragend', (ev) => {
            const pos = ev.target.getLatLng();
            selectPoint(pos.lat, pos.lng);
          });
        }

        leafletMarkerRef.current
          .bindPopup(`
            <div style="font-family:sans-serif; min-width:210px; max-width:280px; padding:3px;">
              <div style="font-size:12px; font-weight:800; color:#0f172a; line-height:1.3;">📍 ${shortTitle}</div>
              <div style="font-size:11px; color:#475569; margin-top:3px; line-height:1.35; font-weight:500;">${fullAddress}</div>
              <div style="font-size:10px; color:#ea580c; font-weight:600; margin-top:5px; border-top:1px dashed #fdba74; padding-top:3px;">
                💡 Drag pin or click map to reposition
              </div>
            </div>
          `)
          .openPopup();

        // Immediately auto-fill the type area and update state
        setSelectedMapVenueName(fullAddress);
        setMapSearchInput(fullAddress);
        setOtherVenue(fullAddress);
        setOtherModeText(fullAddress);
      };

      // Direct Click on ANY location on the map
      map.on('click', (e) => {
        selectPoint(e.latlng.lat, e.latlng.lng);
      });

      leafletMapInstanceRef.current = map;

      // If already has venue name, search and fly to it
      if (otherVenue.trim()) {
        setSelectedMapVenueName(otherVenue.trim());
        searchPlacesLive(otherVenue.trim()).then((res) => {
          if (res && res.length > 0 && isMounted) {
            const top = res[0];
            map.setView([top.lat, top.lon], 16);
            selectPoint(top.lat, top.lon, otherVenue.trim());
          }
        });
      }

      // Ensure proper tile rendering after modal transition
      [50, 150, 300, 600, 1000].forEach((delay) => {
        const t = setTimeout(() => {
          if (isMounted && map) {
            map.invalidateSize();
          }
        }, delay);
        timers.push(t);
      });
    };

    const mountTimer = setTimeout(initLeafletMap, 50);
    timers.push(mountTimer);

    return () => {
      isMounted = false;
      timers.forEach(clearTimeout);
      if (leafletMapInstanceRef.current) {
        try {
          leafletMapInstanceRef.current.remove();
        } catch (_) {}
        leafletMapInstanceRef.current = null;
        leafletMarkerRef.current = null;
      }
    };
  }, [showVenueMapModal]);

  // Handle Search in Map Modal
  const handleMapSearchSubmit = async () => {
    if (!mapSearchInput.trim()) return;
    setIsLocating(true);
    const results = await searchPlacesLive(mapSearchInput.trim());
    setIsLocating(false);
    if (results && results.length > 0) {
      setMapSearchResults(results);
      await handleSelectSearchResult(results[0]);
    } else {
      alert(`Could not find an exact match for "${mapSearchInput}". You can click or drag anywhere on the map to pinpoint your location.`);
    }
  };

  const handleSelectSearchResult = async (item) => {
    setMapSearchResults([]);
    const lat = item.lat;
    const lon = item.lon;

    if (leafletMapInstanceRef.current && typeof lat === 'number' && typeof lon === 'number') {
      leafletMapInstanceRef.current.flyTo([lat, lon], 17, { duration: 1.2 });
      if (leafletMarkerRef.current) {
        leafletMarkerRef.current.setLatLng([lat, lon]);
      } else {
        leafletMarkerRef.current = L.marker([lat, lon], { icon: createRedPinIcon(), draggable: true }).addTo(leafletMapInstanceRef.current);
        leafletMarkerRef.current.on('dragend', (ev) => {
          const pos = ev.target.getLatLng();
          selectPoint(pos.lat, pos.lng);
        });
      }

      const shortTitle = item.shortName || item.label.split(',')[0] || item.label;
      const fullAddress = item.label;

      leafletMarkerRef.current
        .bindPopup(`
          <div style="font-family:sans-serif; min-width:210px; max-width:280px; padding:3px;">
            <div style="font-size:12px; font-weight:800; color:#0f172a; line-height:1.3;">📍 ${shortTitle}</div>
            <div style="font-size:11px; color:#475569; margin-top:3px; line-height:1.35; font-weight:500;">${fullAddress}</div>
            ${item.subtitle ? `<div style="font-size:10px; color:#ea580c; font-weight:600; margin-top:3px;">🏷️ ${item.subtitle}</div>` : ''}
            <div style="font-size:10px; color:#ea580c; font-weight:600; margin-top:5px; border-top:1px dashed #fdba74; padding-top:3px;">
              💡 Drag pin or click map to reposition
            </div>
          </div>
        `)
        .openPopup();

      setSelectedMapVenueName(fullAddress);
      setMapSearchInput(fullAddress);
      setOtherVenue(fullAddress);
      setOtherModeText(fullAddress);
    }
  };

  const handleAuthLogin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!authIdentifier.trim() || !authPassword) {
      setAuthError('Please enter your email or phone and password.');
      return;
    }

    setAuthSubmitting(true);
    setAuthError('');
    setAuthSuccessMsg('');
    try {
      const res = await apiRequest('/public/client-login', {
        method: 'POST',
        body: {
          username: authIdentifier.trim(),
          email: authIdentifier.trim(),
          phone: authIdentifier.trim(),
          password: authPassword,
        },
      });

      if (res.success && res.client) {
        try {
          localStorage.setItem('gentize_client_auth', JSON.stringify(res.client));
        } catch (_) {}
        setClientAuth(res.client);
        setAuthSuccessMsg('Welcome back, ' + (res.client.name || 'Client') + '!');
        setTimeout(() => {
          setShowAuthModal(false);
          setAuthSuccessMsg('');
          setAuthIdentifier('');
          setAuthPassword('');
        }, 800);
        fetchClientPortalData(res.client);
      }
    } catch (err) {
      setAuthError(err.message || 'Invalid email/phone or password. Please try again.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleAuthRegister = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setAuthRegEmailTouched(true);
    setAuthRegPhoneTouched(true);

    if (!authRegName.trim()) {
      setAuthError('Please enter your full name.');
      return;
    }

    if (!authRegEmail.trim() || !isEmailValid(authRegEmail.trim())) {
      setAuthError('Please enter a valid email format (e.g. name@domain.com).');
      return;
    }

    const expectedDigits = COUNTRY_CONFIG[authRegCountryCode]?.digits || 10;
    if (!authRegRawPhone.trim() || authRegRawPhone.trim().length !== expectedDigits) {
      setAuthError(`${COUNTRY_CONFIG[authRegCountryCode]?.name || 'Selected country'} mobile number must be exactly ${expectedDigits} digits.`);
      return;
    }

    if (!authRegPassword.trim() || authRegPassword.trim().length < 4) {
      setAuthError('Password must be at least 4 characters long.');
      return;
    }

    const fullPhoneNumber = `${authRegCountryCode} ${authRegRawPhone.trim()}`;

    setAuthSubmitting(true);
    setAuthError('');
    setAuthSuccessMsg('');
    try {
      const res = await apiRequest('/public/client-register', {
        method: 'POST',
        body: {
          name: authRegName.trim(),
          email: authRegEmail.trim(),
          phone: fullPhoneNumber,
          password: authRegPassword.trim(),
        },
      });

      if (res.success && res.client) {
        try {
          localStorage.setItem('gentize_client_auth', JSON.stringify(res.client));
        } catch (_) {}
        setClientAuth(res.client);
        setAuthSuccessMsg('Account created successfully!');
        setTimeout(() => {
          setShowAuthModal(false);
          setAuthSuccessMsg('');
          setAuthRegName('');
          setAuthRegEmail('');
          setAuthRegRawPhone('');
          setAuthRegPhone('');
          setAuthRegPassword('');
          setAuthRegEmailTouched(false);
          setAuthRegPhoneTouched(false);
        }, 800);
        fetchClientPortalData(res.client);
      }
    } catch (err) {
      if (err.data?.code === 'ACCOUNT_EXISTS') {
        setAuthIdentifier(authRegEmail.trim().toLowerCase());
        setAuthPassword('');
        setAuthRegPassword('');
        setAuthModalTab('login');
        setAuthError('');
        window.alert('You already have an account. Please sign in.');
        return;
      }
      setAuthError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleGoogleAuthSuccess = async (credential, nonce) => {
    setAuthSubmitting(true);
    setAuthError('');
    setAuthSuccessMsg('');
    try {
      const res = await apiRequest('/public/client-google-auth', {
        method: 'POST',
        body: { credential, nonce, intent: authModalTab === 'register' ? 'register' : 'login' },
      });

      if (res.success && res.client) {
        try {
          localStorage.setItem('gentize_client_auth', JSON.stringify(res.client));
        } catch (_) {}
        setClientAuth(res.client);
        setFormData(prev => ({
          ...prev,
          name: res.client.name || prev.name,
          email: res.client.email || prev.email,
        }));
        setShowAuthModal(false);
        setAuthSuccessMsg(`Signed in with Google as ${res.client.name}! ${res.loginEmail === "queued" ? "Your sign-in confirmation email is queued for delivery." : "Email confirmation is currently unavailable."}`);
        setTimeout(() => setAuthSuccessMsg(''), 4000);
        fetchClientPortalData(res.client);
        return true;
      } else {
        throw new Error(res.error || 'Failed to authenticate with Google');
      }
    } catch (err) {
      if (err.data?.code === 'ACCOUNT_EXISTS') {
        setAuthIdentifier(err.data.email || '');
        setAuthPassword('');
        setAuthModalTab('login');
        setAuthError('');
        window.alert('You already have an account. Please sign in.');
        return false;
      }
      if (err.data?.code === 'ACCOUNT_NOT_FOUND') {
        setAuthRegEmail(err.data.email || '');
        setAuthModalTab('register');
        setAuthError('');
        window.alert('No account found. Please register first.');
        return false;
      }
      setAuthError(err.message || 'Google Sign-In failed. Please try again.');
      return false;
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleClientLogout = () => {
    if (clientOnly) apiRequest('/public/client-logout', {method:'POST'}).catch(()=>{});
    try {
      localStorage.removeItem('gentize_client_auth');
      localStorage.removeItem('client_booking_ids');
      localStorage.removeItem('gentize_client_notified_confirmed_ids');
      const clearKey = getClientClearKey(clientAuth);
      localStorage.removeItem(clearKey);
    } catch (_) {}
    setClientAuth(null);
    setFormData({ name: '', email: '', phone: '', purpose: '', notes: '' });
    setRawPhoneNumber('');
    setBookingPassword('');
    setClientBookings([]);
    setClientNotifications([]);
    setConfirmedBooking(null);
    setMdConfirmedModal(null);
  };

  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Self-Service Reschedule State
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleSlot, setRescheduleSlot] = useState(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleMsg, setRescheduleMsg] = useState(null);

  // Self-Service Cancel State
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchAvailability = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const res = await apiRequest(`/public/admin-availability?target=${bookingTarget}`);
      setAdminInfo(res.admin);
      const list = res.schedules || [];
      setSchedules(list);

      // Default selected date: first upcoming date with available slots, or today
      if (list.length > 0) {
        setSelectedDate(prev => {
          if (prev) return prev;
          const firstAvailable = list.find(s => s.date >= todayStr && s.slots && s.slots.some(slot => slot.status === 'AVAILABLE'));
          if (firstAvailable) {
            const d = new Date(firstAvailable.date + 'T00:00:00');
            setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
            return firstAvailable.date;
          }
          return todayStr;
        });
      }
    } catch (err) {
      if (!isSilent) setError(err.message || 'Failed to load scheduling calendar');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
    const interval = setInterval(() => {
      fetchAvailability(true);
    }, 4000); // 4-second rapid poll for admin availability updates
    return () => clearInterval(interval);
  }, [todayStr, bookingTarget]);

  // Distinct set of dates that actually have at least 1 free slot
  const datesWithFreeSlots = useMemo(() => {
    const set = new Set();
    schedules.forEach(s => {
      if (s.slots && s.slots.some(slot => slot.status === 'AVAILABLE')) {
        set.add(s.date);
      }
    });
    return set;
  }, [schedules]);

  // Slots for currently selected date
  const slotsForDate = useMemo(() => {
    const dateSchedules = schedules.filter(s => s.date === selectedDate);
    return dateSchedules.flatMap(s =>
      (s.slots || [])
        .filter(slot => slot.status === 'AVAILABLE')
        .map(slot => ({
          ...slot,
          eventTitle: s.title,
          location: s.location,
          slotDuration: s.slotDuration,
        }))
    );
  }, [schedules, selectedDate]);

  // Occupied / Booked slots for selected date (strictly masked as 'Admin Booked')
  const occupiedSlotsForDate = useMemo(() => {
    const dateSchedules = schedules.filter(s => s.date === selectedDate);
    return dateSchedules.flatMap(s =>
      (s.occupiedSlots || []).map(slot => ({
        ...slot,
        displayLabel: 'Admin Booked',
        eventTitle: s.title,
      }))
    );
  }, [schedules, selectedDate]);

  const isPreBookingMode = slotsForDate.length === 0 && selectedDate >= todayStr;

  // Segregate slots into Morning, Afternoon, Evening
  const slotGroups = useMemo(() => {
    const morning = [];
    const afternoon = [];
    const evening = [];

    slotsForDate.forEach(slot => {
      const hour = parseInt(slot.startTime.split(':')[0], 10);
      if (hour < 12) {
        morning.push(slot);
      } else if (hour < 17) {
        afternoon.push(slot);
      } else {
        evening.push(slot);
      }
    });

    return { morning, afternoon, evening };
  }, [slotsForDate]);

  // Pre-booking suggested time slots
  const preBookingOptions = [
    { label: '09:30 AM', time: '09:30', period: 'morning' },
    { label: '10:30 AM', time: '10:30', period: 'morning' },
    { label: '11:30 AM', time: '11:30', period: 'morning' },
    { label: '02:00 PM', time: '14:00', period: 'afternoon' },
    { label: '03:00 PM', time: '15:00', period: 'afternoon' },
    { label: '04:00 PM', time: '16:00', period: 'afternoon' },
    { label: '05:00 PM', time: '17:00', period: 'evening' },
    { label: '06:00 PM', time: '18:00', period: 'evening' },
    { label: '07:00 PM', time: '19:00', period: 'evening' },
  ];

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
  };

  const getSlotDurationLabel = (slot) => {
    if (!slot) return '';
    if (slot.startTime && slot.endTime) {
      const [sH, sM] = slot.startTime.split(':').map(Number);
      const [eH, eM] = slot.endTime.split(':').map(Number);
      const diff = (eH * 60 + eM) - (sH * 60 + sM);
      if (diff > 0) {
        if (diff >= 60 && diff % 60 === 0) {
          const hrs = diff / 60;
          return `${hrs} ${hrs === 1 ? 'Hour' : 'Hours'}`;
        }
        return `${diff} mins`;
      }
    }
    return slot.slotDuration ? `${slot.slotDuration} mins` : '';
  };

  const calculatePreBookingEndTime = (startTime, durationMins) => {
    const [hh, mm] = startTime.split(':').map(Number);
    const startTotalMin = hh * 60 + mm;
    const endTotalMin = startTotalMin + Number(durationMins);
    const endH = Math.floor(endTotalMin / 60);
    const endM = endTotalMin % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  };

  const formatTo12H = (time24) => {
    const [hh, mm] = time24.split(':').map(Number);
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const h12 = hh % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${ampm}`;
  };

  const handleRecreateMeetLink = async (targetBookingId = null) => {
    if (targetBookingId) {
      try {
        const res = await apiRequest('/public/recreate-meet', {
          method: 'POST',
          body: { bookingId: targetBookingId },
        });
        if (confirmedBooking && confirmedBooking.id === targetBookingId) {
          setConfirmedBooking(prev => ({ ...prev, meetingLink: res.meetingLink }));
        }
        await fetchClientPortalData();
        alert('Google Meet link recreated successfully:\n' + res.meetingLink);
      } catch (err) {
        alert(err.message || 'Failed to recreate Google Meet link');
      }
    } else {
      setGoogleMeetLink('https://meet.google.com/new');
    }
  };

  const handleSaveClientMeetLink = async (bookingId) => {
    try {
      setUpdatingMeetLink(true);
      const res = await apiRequest('/public/recreate-meet', {
        method: 'POST',
        body: {
          bookingId,
          meetLink: editingMeetLinkText.trim() || 'https://meet.google.com/new',
        },
      });
      if (confirmedBooking && confirmedBooking.id === bookingId) {
        setConfirmedBooking(prev => ({ ...prev, meetingLink: res.meetingLink }));
      }
      setEditingMeetBookingId(null);
      setEditingMeetLinkText('');
      await fetchClientPortalData();
      alert('Google Meet link updated successfully:\n' + res.meetingLink);
    } catch (err) {
      alert(err.message || 'Failed to update Google Meet link');
    } finally {
      setUpdatingMeetLink(false);
    }
  };

  const handlePasteMeetLink = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setGoogleMeetLink(text.trim());
      }
    } catch (_) {
      alert('Clipboard access restricted. Please paste your link directly into the input box.');
    }
  };

  const handleCopyMeetLink = (linkToCopy) => {
    const link = linkToCopy || googleMeetLink;
    navigator.clipboard.writeText(link);
    setMeetCopied(true);
    setTimeout(() => setMeetCopied(false), 2500);
  };

  const handleSubmitBooking = async (e) => {
    e.preventDefault();

    if (!selectedDate) {
      alert('Please select a date on the calendar.');
      return;
    }

    if (!isPreBookingMode && !selectedSlot) {
      alert('Please select an available time slot.');
      return;
    }

    if (!formData.name.trim()) {
      alert('Please fill in your name.');
      return;
    }

    if (!formData.email.trim()) {
      setEmailTouched(true);
      alert('Please enter your email address.');
      return;
    }

    if (!isEmailValid(formData.email)) {
      setEmailTouched(true);
      alert('Please enter a valid email format (e.g. name@domain.com).');
      return;
    }

    const expectedDigits = COUNTRY_CONFIG[selectedCountryCode]?.digits || 10;
    if (!rawPhoneNumber || rawPhoneNumber.length !== expectedDigits) {
      setPhoneTouched(true);
      alert(`Please enter a valid ${COUNTRY_CONFIG[selectedCountryCode]?.name || ''} phone number (${expectedDigits} digits).`);
      return;
    }

    const formattedPhone = `${selectedCountryCode} ${rawPhoneNumber}`;

    let effectiveMeetingMode = meetingMode;
    let effectiveMeetingLink = '';

    if (meetingMode === 'Gentize Office (In-Person)' || meetingMode === 'MD Cabin (In-Person)') {
      effectiveMeetingMode = 'Gentize Office (In-Person)';
      effectiveMeetingLink = GENTIZE_OFFICE_MAPS_URL;
    } else if (meetingMode === 'Google Meet (Video Call)') {
      effectiveMeetingMode = 'Google Meet (Video Call)';
      effectiveMeetingLink = googleMeetLink.trim() || 'https://meet.google.com/new';
    } else if (meetingMode === 'Direct Phone Call') {
      effectiveMeetingMode = 'Direct Phone Call';
      effectiveMeetingLink = formattedPhone;
    } else if (meetingMode === 'Other') {
      if (otherType === 'APP') {
        const app = otherAppName.trim() || 'Other App';
        effectiveMeetingMode = `Other (${app})`;
        effectiveMeetingLink = otherMeetingLink.trim();
      } else {
        const venue = otherVenue.trim() || otherModeText.trim() || 'Custom Venue';
        effectiveMeetingMode = `Other (${venue})`;
        effectiveMeetingLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`;
      }
    }

    setSubmitting(true);
    try {
      let res;
      let displayTimeStr = '';

      if (!isPreBookingMode && selectedSlot) {
        // Regular Slot Booking
        res = await apiRequest('/public/book', {
          method: 'POST',
          body: {
            eventId: selectedSlot.eventId,
            slotId: selectedSlot.id,
            clientId: clientAuth?.id,
            userId: clientAuth?.id,
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formattedPhone,
            password: bookingPassword ? bookingPassword.trim() : undefined,
            purpose: formData.purpose.trim() || (bookingTarget === 'SALES_LEAD' ? 'Client Meeting with Sales Team Lead' : 'Client Meeting with Gentize'),
            notes: formData.notes.trim(),
            meetingMode: effectiveMeetingMode,
            meetingLink: effectiveMeetingLink,
            bookingTarget: bookingTarget,
          },
        });
        displayTimeStr = `${selectedSlot.displayStart} – ${selectedSlot.displayEnd}`;
      } else {
        // Pre-Booking Flow for upcoming dates/next month
        const endTime = calculatePreBookingEndTime(preBookingTime, preBookingDuration);
        const displayStart = formatTo12H(preBookingTime);
        const displayEnd = formatTo12H(endTime);
        displayTimeStr = `${displayStart} – ${displayEnd}`;

        res = await apiRequest('/public/book', {
          method: 'POST',
          body: {
            isPreBooking: true,
            date: selectedDate,
            startTime: preBookingTime,
            endTime: endTime,
            slotDuration: Number(preBookingDuration),
            clientId: clientAuth?.id,
            userId: clientAuth?.id,
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formattedPhone,
            password: bookingPassword ? bookingPassword.trim() : undefined,
            purpose: formData.purpose.trim() || (bookingTarget === 'SALES_LEAD' ? 'Client Pre-Booking with Sales Team Lead' : 'Client Pre-Booking Request'),
            notes: formData.notes.trim(),
            meetingMode: effectiveMeetingMode,
            meetingLink: effectiveMeetingLink,
            bookingTarget: bookingTarget,
          },
        });
      }

      // If account was created or returned, auto-persist to localStorage like a real-time app
      if (res.client) {
        try {
          localStorage.setItem('gentize_client_auth', JSON.stringify(res.client));
        } catch (_) {}
        setClientAuth(res.client);
      }

      setConfirmedBooking({
        ...res.booking,
        eventTitle: 'Meeting with Gentize',
        date: selectedDate,
        time: displayTimeStr,
        location: effectiveMeetingMode,
        meetingMode: effectiveMeetingMode,
        meetingLink: effectiveMeetingLink || res.booking?.meetingLink,
        status: res.booking?.status || 'PENDING',
        isPreBooking: isPreBookingMode,
      });

      if (res.booking?.id) {
        try {
          const existing = JSON.parse(localStorage.getItem('client_booking_ids') || '[]');
          if (!existing.includes(res.booking.id)) {
            existing.push(res.booking.id);
            localStorage.setItem('client_booking_ids', JSON.stringify(existing));
          }
        } catch (_) {}
      }

      // Trigger native Android notification
      notificationService.scheduleLocalDeviceNotification({
        id: res.booking?.id || Date.now(),
        title: 'Booking Confirmed & Dispatched 📅',
        body: `Meeting on ${selectedDate} (${displayTimeStr}) is booked. Waiting for Gentize approval.`,
      });

      window.dispatchEvent(new CustomEvent('gentize_notifications_updated'));

      setSelectedSlot(null);
      await Promise.all([fetchAvailability(), fetchClientPortalData()]);
    } catch (err) {
      alert(err.message || 'Booking conflict! This slot may have just been booked. Please choose another.');
      fetchAvailability();
    } finally {
      setSubmitting(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleSlot) {
      alert('Please select a new available free slot.');
      return;
    }

    setRescheduleLoading(true);
    try {
      const res = await apiRequest('/public/reschedule', {
        method: 'POST',
        body: {
          bookingId: confirmedBooking.id,
          newSlotId: rescheduleSlot.id,
        },
      });

      setConfirmedBooking(prev => ({
        ...prev,
        date: res.date,
        time: res.time,
      }));
      setRescheduleMsg(`Meeting successfully rescheduled to ${res.date} • ${res.time}`);
      notificationService.scheduleLocalDeviceNotification({
        id: Date.now(),
        title: 'Meeting Rescheduled 🔄',
        body: `Meeting successfully rescheduled to ${res.date} • ${res.time}`,
      });
      setIsRescheduling(false);
      setRescheduleSlot(null);
      await fetchAvailability();
    } catch (err) {
      alert(err.message || 'Failed to reschedule. The slot may have just been booked.');
      fetchAvailability();
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!confirm('Are you sure you want to cancel this meeting? The slot will be released.')) {
      return;
    }

    setCancelLoading(true);
    try {
      await apiRequest('/public/cancel', {
        method: 'POST',
        body: {
          bookingId: confirmedBooking.id,
          reason: 'Cancelled by Client',
        },
      });
      alert('Meeting has been cancelled successfully.');
      setConfirmedBooking(null);
      setFormData({ name: '', email: '', phone: `${selectedCountryCode} `, purpose: '', notes: '' });
      setRawPhoneNumber('');
      setEmailTouched(false);
      setPhoneTouched(false);
      fetchAvailability();
    } catch (err) {
      alert(err.message || 'Failed to cancel booking.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleCancelMyBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      setCancelLoading(true);
      await apiRequest(`/public/bookings/${bookingId}/cancel`, {
        method: 'POST',
        body: {
          clientId: clientAuth?.id,
          reason: 'Cancelled by Client',
        },
      });
      alert('Meeting has been cancelled successfully.');
      setConfirmedBooking(null);
      setFormData({ name: '', email: '', phone: `${selectedCountryCode} `, purpose: '', notes: '' });
      setRawPhoneNumber('');
      setEmailTouched(false);
      setPhoneTouched(false);
      fetchAvailability();
    } catch (err) {
      alert(err.message || 'Failed to cancel booking.');
    } finally {
      setCancelLoading(false);
    }
  };

  // Monthly Calendar Helpers
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
  const firstDayIndex = firstDayOfMonth;
  const startOffset = (firstDayOfMonth + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const prevMonth = handlePrevMonth;
  const nextMonth = handleNextMonth;

  // Google Calendar Link Generator
  const getGoogleCalendarUrl = () => {
    if (!confirmedBooking) return '#';
    try {
      const isLead = confirmedBooking.booking_target === 'SALES_LEAD' || bookingTarget === 'SALES_LEAD';
      const title = encodeURIComponent(isLead ? 'Meeting with Sales Lead' : 'Meeting with Gentize');
      const details = encodeURIComponent(
        `Meeting with ${isLead ? 'Sales Lead' : 'Gentize'}\nStatus: Awaiting ${isLead ? 'Sales Lead' : 'Gentize'} Approval\nMode: ${confirmedBooking.location || 'In-Person'}\nLink/Venue: ${confirmedBooking.meetingLink || (isLead ? GENTIZE_OFFICE_MAPS_URL : MD_CABIN_MAPS_URL)}`
      );
      const loc = encodeURIComponent(confirmedBooking.location || (isLead ? 'Sales Desk' : 'Gentize Office'));
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${loc}`;
    } catch (_) {
      return '#';
    }
  };

  // WhatsApp Share URL Generator (Clean WhatsApp markdown with zero broken emojis)
  const getWhatsAppShareUrl = () => {
    if (!confirmedBooking) return '#';
    const loc = confirmedBooking.location || confirmedBooking.meetingMode || 'Gentize Office (In-Person)';
    let modeDetails = `• *Mode:* ${loc}\n`;
    if (loc.includes('Gentize') || loc.includes('Cabin')) {
      modeDetails += `• *Google Maps Location:* ${GENTIZE_OFFICE_MAPS_URL}\n`;
    } else if (loc.includes('Meet')) {
      modeDetails += `• *Google Meet Link:* ${confirmedBooking.meetingLink || googleMeetLink}\n`;
    } else if (confirmedBooking.meetingLink && confirmedBooking.meetingLink.includes('maps')) {
      modeDetails += `• *Google Maps Location:* ${confirmedBooking.meetingLink}\n`;
    } else if (loc.includes('Other') || (!loc.includes('Meet') && !loc.includes('Phone'))) {
      const cleanVenue = loc.replace(/^Other\s*\(/i, '').replace(/\)$/, '').trim();
      modeDetails += `• *Google Maps Location:* https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanVenue)}\n`;
    } else if (confirmedBooking.meetingLink && confirmedBooking.meetingLink.trim()) {
      modeDetails += `• *Meeting Link / Details:* ${confirmedBooking.meetingLink}\n`;
    }

    const isLeadBooking = confirmedBooking.booking_target === 'SALES_LEAD' || bookingTarget === 'SALES_LEAD';
    const text = encodeURIComponent(
      `*CALGEN EXECUTIVE SCHEDULING*\n` +
      `*Meeting Request Dispatched*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `*Status:* Awaiting ${isLeadBooking ? 'Sales Lead' : 'Gentize'} Confirmation\n` +
      `*Reference ID:* #${confirmedBooking.id}\n\n` +
      `*MEETING DETAILS:*\n` +
      `• *Host:* ${isLeadBooking ? 'Sales Team Lead' : (adminInfo?.name || 'Gentize')}\n` +
      `• *Date:* ${confirmedBooking.date}\n` +
      `• *Time:* ${confirmedBooking.time}\n` +
      modeDetails + `\n` +
      `*CLIENT INFORMATION:*\n` +
      `• *Attendee:* ${formData.name || clientAuth?.name || 'Client'}\n` +
      `• *Email:* ${formData.email || clientAuth?.email || confirmedBooking.client_email || confirmedBooking.email || 'N/A'}\n` +
      `• *Phone:* ${formData.phone || clientAuth?.phone || ''}\n` +
      `• *Purpose:* ${formData.purpose || (isLeadBooking ? 'Client Discussion with Sales Lead' : 'Client Discussion with Gentize')}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `_This meeting has been submitted directly to ${isLeadBooking ? 'Sales Team Lead' : 'Gentize & Executive Desk'}._\n` +
      `_Elevate Technologies • All Rights Reserved_`
    );
    return `https://wa.me/?text=${text}`;
  };

  // Client Access is open - anyone can view and book appointments directly!

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-orange-600">Loading <GentizeText>{bookingTarget === 'SALES_LEAD' ? "Sales Team Lead's" : "Gentize's"}</GentizeText> Live Availability...</p>
      </div>
    );
  }

  // Confirmation View with "Awaiting MD Confirmation" Status & Details
  if (confirmedBooking) {
    const isPending = confirmedBooking.status === 'PENDING';

    return (
      <div className="min-h-screen bg-[#FDFCFB] py-4 sm:py-6 px-3 sm:px-4 flex items-center justify-center">
        <div className="max-w-[490px] w-full bg-white rounded-3xl shadow-xl border border-orange-200/80 p-5 sm:p-6 text-center space-y-3 sm:space-y-3.5 animate-in fade-in zoom-in-95 duration-200 my-auto">
          {/* Status Icon - Emerald for Confirmed, Orange for Pending */}
          <div className={`w-10 h-10 ${isPending ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'} rounded-2xl flex items-center justify-center mx-auto shadow-inner`}>
            {isPending ? <Clock className="w-5 h-5 animate-pulse" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          </div>

          {/* Heading & Status Badge */}
          <div className="space-y-1">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
              isPending
                ? 'bg-orange-50 text-orange-600 border-orange-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isPending ? 'bg-orange-500 animate-ping' : 'bg-emerald-500'}`} />
              <GentizeText>{isPending
                ? (bookingTarget === 'SALES_LEAD' ? 'Status: Awaiting Lead Confirmation' : 'Status: Awaiting Gentize Confirmation')
                : (bookingTarget === 'SALES_LEAD' ? 'Status: Confirmed by Lead' : 'Status: Confirmed by Gentize')}</GentizeText>
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {isPending ? 'Slot Booked & Dispatched!' : "You're Scheduled & Confirmed!"}
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              <GentizeText>{isPending
                ? (bookingTarget === 'SALES_LEAD'
                    ? 'Your meeting slot has been sent to Sales Team Lead. Lead will review and confirm shortly. Notifications have been dispatched.'
                    : 'Your meeting slot has been sent to Gentize. Gentize will review and confirm shortly. Notifications have been dispatched.')
                : (bookingTarget === 'SALES_LEAD'
                    ? 'Sales Team Lead has approved your appointment. Official invitation and alerts have been sent.'
                    : 'Gentize has approved your appointment. Official invitation and alerts have been sent.')}</GentizeText>
            </p>
          </div>

          {rescheduleMsg && (
            <div className="p-2 bg-orange-50 border border-orange-200 rounded-xl text-xs font-semibold text-slate-900 animate-in fade-in">
              ✓ {rescheduleMsg}
            </div>
          )}

          {/* Compact Details Card */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-orange-50/50 border border-orange-200/80 text-left space-y-2 text-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-orange-200/60">
              <span className="text-slate-500 font-medium">Booking Reference:</span>
              <span className="font-mono font-bold text-orange-600 bg-white px-2 py-0.5 rounded border border-orange-200 text-xs">
                {confirmedBooking.id}
              </span>
            </div>
            <div className="flex items-center justify-between pb-1.5 border-b border-orange-200/60">
              <span className="text-slate-500 font-medium">Host:</span>
              <span className="font-bold text-slate-900 truncate max-w-[240px]"><GentizeText>{bookingTarget === 'SALES_LEAD' ? 'Sales Team Lead' : (adminInfo?.name || 'Gentize')}</GentizeText></span>
            </div>
            <div className="flex items-center justify-between pb-1.5 border-b border-orange-200/60">
              <span className="text-slate-500 font-medium">Date & Time:</span>
              <span className="font-bold text-orange-600">{confirmedBooking.date} • {confirmedBooking.time}</span>
            </div>
            <div className="flex items-center justify-between pb-1.5 border-b border-orange-200/60">
              <span className="text-slate-500 font-medium">Attendee:</span>
              <span className="font-bold text-slate-900 truncate max-w-[240px]"><GentizeText>{formData.name}</GentizeText> ({formData.phone})</span>
            </div>
            <div className="flex items-center justify-between pb-1.5 border-b border-orange-200/60">
              <span className="text-slate-500 font-medium">Purpose:</span>
              <span className="font-bold text-slate-900 truncate max-w-[240px]"><GentizeText>{formData.purpose || (bookingTarget === 'SALES_LEAD' ? 'Client Discussion with Sales Lead' : 'Client Discussion with Gentize')}</GentizeText></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Meeting Mode:</span>
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-orange-600" />
                <span><GentizeText>{confirmedBooking.location || 'Gentize Office (In-Person)'}</GentizeText></span>
              </span>
            </div>

            {/* Google Meet Recreate & Join Control (Strictly 3 Colors: Amber, Slate, Emerald) */}
            {(confirmedBooking.location?.includes('Meet') || confirmedBooking.meetingMode?.includes('Meet')) && (
              <div className="pt-1.5 border-t border-orange-200/60 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-900 flex items-center gap-1.5">
                    <Video className="w-3 h-3 text-orange-600" />
                    <span>Google Meet Conference Link</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRecreateMeetLink(confirmedBooking.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-semibold shadow-2xs"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Recreate</span>
                  </button>
                </div>
                <div className="p-1.5 rounded-xl bg-white border border-orange-200 flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-slate-900 font-bold truncate">
                    {confirmedBooking.meetingLink || googleMeetLink}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyMeetLink(confirmedBooking.meetingLink || googleMeetLink)}
                      className="px-2 py-0.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                    <a
                      href={confirmedBooking.meetingLink || googleMeetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-0.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-semibold flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Join ↗</span>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Gentize Office Maps View & Navigation */}
            {(confirmedBooking.location?.includes('Gentize') || confirmedBooking.location?.includes('Cabin') || confirmedBooking.meetingMode?.includes('Gentize') || confirmedBooking.meetingMode?.includes('Cabin')) && (
              <div className="pt-1.5 border-t border-orange-200/60 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-900 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-orange-600" />
                  <span><GentizeText>Gentize Office (Elevate Innovations)</GentizeText></span>
                </span>
                <a
                  href={GENTIZE_OFFICE_MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-semibold shadow-2xs"
                >
                  <Navigation className="w-3 h-3" />
                  <span>Open in Maps ↗</span>
                </a>
              </div>
            )}
          </div>

          {/* Action Buttons: WhatsApp Share & Google Calendar (Emerald & Amber) */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href={getWhatsAppShareUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share on WhatsApp</span>
            </a>

            <a
              href={getGoogleCalendarUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 bg-white hover:bg-orange-50 text-slate-800 border border-orange-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-orange-600" />
              <span>Google Calendar</span>
            </a>
          </div>

          {/* Self-Service Reschedule / Cancel Section (3 Colors: Slate neutral buttons) */}
          {!isRescheduling ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsRescheduling(true)}
                className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reschedule</span>
              </button>

              <button
                type="button"
                disabled={cancelLoading}
                onClick={handleCancelBooking}
                className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5 text-slate-500" />
                <span>Cancel</span>
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-orange-50 border border-orange-200 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Select New Free Slot
                </span>
                <button
                  type="button"
                  onClick={() => setIsRescheduling(false)}
                  className="text-xs text-orange-600 hover:underline font-bold"
                >
                  Close
                </button>
              </div>

              {/* Date selection for reschedule */}
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {Array.from(datesWithFreeSlots).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setSelectedDate(d);
                      setRescheduleSlot(null);
                    }}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                      selectedDate === d
                        ? 'bg-orange-600 text-white'
                        : 'bg-white border border-orange-200 text-slate-700 hover:bg-orange-100'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {/* Slots for that date */}
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {slotsForDate.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setRescheduleSlot(s)}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-xl border text-center transition ${
                      rescheduleSlot?.id === s.id
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'bg-white border-orange-200 text-slate-800 hover:border-orange-600'
                    }`}
                  >
                    {s.displayStart}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={!rescheduleSlot || rescheduleLoading}
                onClick={handleReschedule}
                className="w-full py-2 bg-orange-600 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
              >
                {rescheduleLoading ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <span>Confirm Slot ({rescheduleSlot?.displayStart || 'Select Slot'})</span>
                )}
              </button>
            </div>
          )}

          {/* Action Buttons: View in My Appointments & Book Another Meeting */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirmedBooking(null);
                setActiveClientTab('my-appointments');
              }}
              className="flex-1 py-2.5 px-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl text-xs sm:text-sm transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            >
              <Clock className="w-4 h-4" />
              <span>View in My Appointments</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmedBooking(null);
                setFormData({ name: '', email: '', phone: '+91 ', purpose: '', notes: '' });
                setBookingStep(1);
                setActiveClientTab('book');
                fetchAvailability();
              }}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CalendarIcon className="w-4 h-4 text-orange-600" />
              <span>Book Another</span>
            </button>
          </div>
        </div>

        {/* Real-time MD Appointment Confirmation Celebration Modal Overlay if in confirmedBooking screen */}
        {mdConfirmedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-emerald-200 overflow-hidden animate-in zoom-in-95 duration-200 text-center">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white text-center relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setMdConfirmedModal(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-3 shadow-inner ring-4 ring-white/30 animate-bounce">
                  <ShieldCheck className="w-9 h-9 text-white" />
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-bold tracking-wider uppercase mb-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  Live <GentizeText>{mdConfirmedModal.booking_target === 'SALES_LEAD' || bookingTarget === 'SALES_LEAD' ? 'Lead' : 'Gentize'}</GentizeText> Approval
                </span>
                <h3 className="text-xl font-black tracking-tight">Appointment Confirmed!</h3>
                <p className="text-emerald-100 text-xs mt-1">
                  <GentizeText>{mdConfirmedModal.booking_target === 'SALES_LEAD' || bookingTarget === 'SALES_LEAD' ? 'The Sales Team Lead' : 'The Gentize'}</GentizeText> has officially approved your appointment.
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-100 space-y-2.5 text-left">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                    <CalendarIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{mdConfirmedModal.date || 'Scheduled Date'}</span>
                    <span className="text-emerald-300">•</span>
                    <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{mdConfirmedModal.display_time || mdConfirmedModal.displayTime || 'Scheduled Time'}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-emerald-800 font-medium">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Location: <GentizeText>{mdConfirmedModal.location || 'Gentize Cabin (In-Person)'}</GentizeText></span>
                  </div>
                  {mdConfirmedModal.client_name && (
                    <div className="flex items-center gap-2 text-xs text-emerald-700">
                      <User className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Client: <strong className="font-semibold text-emerald-900"><GentizeText>{mdConfirmedModal.client_name}</GentizeText></strong></span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const id = mdConfirmedModal.id;
                      setMdConfirmedModal(null);
                      setConfirmedBooking(null);
                      handleNavigateToBooking(id);
                    }}
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-sm shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CalendarCheck className="w-4 h-4" />
                    <span>View in My Appointments</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMdConfirmedModal(null)}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mobile-portal min-h-screen bg-[#FDFCFB] flex flex-col md:flex-row">
      <MobileDock active={activeClientTab} onSelect={setActiveClientTab} onMenu={() => setMobileSidebarOpen(true)} items={[
        { id: 'book', label: 'Book', icon: 'calendar' }, { id: 'my-appointments', label: 'Meetings', icon: 'bookings' },
        { id: 'notifications', label: 'Alerts', icon: 'notifications' },
      ]} />
      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 animate-in fade-in duration-150"
        />
      )}

      {/* Left Sidebar (Desktop Fixed, Mobile Slide-Over) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-100/90 flex flex-col justify-between transition-transform duration-200 ease-in-out select-none shadow-2xs lg:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top: Brand Logo & Navigation matching Admin */}
        <div className="p-5 pb-24 flex flex-col gap-6 overflow-y-auto">
          {/* Brand Header matching Admin */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img src="/logo.png" alt="Elevate" className="h-[50px] w-auto object-contain" />
            </div>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 lg:hidden cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sidebar Nav Items matching Admin */}
          <nav className="flex flex-col gap-1.5">
            {/* Schedule Meeting */}
            <button
              type="button"
              onClick={() => {
                setActiveClientTab('book');
                setMobileSidebarOpen(false);
              }}
              className={`group relative flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
                activeClientTab === 'book'
                  ? 'bg-orange-50 text-orange-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {activeClientTab === 'book' && (
                <span className="absolute left-0 top-2 bottom-2 w-1.5 bg-orange-500 rounded-r-md" />
              )}
              <div className="flex items-center gap-3 pl-1">
                <CalendarIcon
                  className={`w-5 h-5 transition-colors ${
                    activeClientTab === 'book'
                      ? 'text-orange-500'
                      : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span className="truncate">Schedule Meeting</span>
              </div>
            </button>

            {/* My Appointments */}
            <button
              type="button"
              onClick={() => {
                setActiveClientTab('my-appointments');
                setMobileSidebarOpen(false);
              }}
              className={`group relative flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
                activeClientTab === 'my-appointments'
                  ? 'bg-orange-50 text-orange-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {activeClientTab === 'my-appointments' && (
                <span className="absolute left-0 top-2 bottom-2 w-1.5 bg-orange-500 rounded-r-md" />
              )}
              <div className="flex items-center gap-3 pl-1">
                <Clock
                  className={`w-5 h-5 transition-colors ${
                    activeClientTab === 'my-appointments'
                      ? 'text-orange-500'
                      : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span className="truncate">My Appointments</span>
              </div>
              {clientPendingBookings.length > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-orange-100 text-orange-700 rounded-full">
                  {clientPendingBookings.length}
                </span>
              )}
            </button>

            {/* Notifications */}
            <button
              type="button"
              onClick={handleOpenNotificationsTab}
              className={`group relative flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
                activeClientTab === 'notifications'
                  ? 'bg-orange-50 text-orange-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {activeClientTab === 'notifications' && (
                <span className="absolute left-0 top-2 bottom-2 w-1.5 bg-orange-500 rounded-r-md" />
              )}
              <div className="flex items-center gap-3 pl-1">
                <Bell
                  className={`w-5 h-5 transition-colors ${
                    activeClientTab === 'notifications'
                      ? 'text-orange-500'
                      : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span className="truncate">Notifications</span>
              </div>
              {clientUnreadCount > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-orange-500 text-white rounded-full">
                  {clientUnreadCount}
                </span>
              )}
            </button>
          </nav>
        </div>


        {/* Portal Switcher at Bottom */}
        <div className="p-3.5 border-t border-slate-100/90 mt-auto relative" ref={portalDropdownRef}>
          {portalDropdownOpen && (
            <div className="absolute bottom-full mb-2 left-3.5 right-3.5 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1 flex items-center justify-between">
                <span>Switch Portal</span>
                <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-bold">Elevate</span>
              </div>
              {PORTAL_OPTIONS.filter(p => !clientOnly || p.id === 'client').map((p) => {
                const isSelected = p.id === 'client';
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (onSwitchPortal) onSwitchPortal(p.id);
                      else if (onBackToPortal) onBackToPortal();
                      setPortalDropdownOpen(false);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-orange-50 text-orange-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm leading-none">{p.emoji}</span>
                      <div className="min-w-0">
                        <p className="font-bold text-xs truncate"><GentizeText>{p.name}</GentizeText></p>
                        <p className="text-[10px] text-slate-400 truncate"><GentizeText>{p.role}</GentizeText></p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-orange-500 stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => setPortalDropdownOpen(!portalDropdownOpen)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#FFF8F1] hover:bg-[#FFF2E2] border border-orange-200/90 rounded-2xl text-xs font-bold text-[#9A3412] shadow-2xs hover:shadow-xs transition-all active:scale-98 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm leading-none">🌐</span>
              <span className="tracking-tight text-xs font-bold text-[#9A3412]">Client Booking</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-orange-500 transition-transform duration-200 ${portalDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </aside>

      {/* Right Main Workspace Column */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 min-h-screen">
        {/* Top Navbar with Bell & Client Profile Dropdown (Top Right) */}
        <header className="bg-white/95 border-b border-slate-100/90 px-4 sm:px-8 py-2.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition"
              aria-label="Toggle Navigation Menu"
            >
              {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900 tracking-tight">Client Portal</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                {activeClientTab === 'book' ? 'Schedule Meeting' : activeClientTab === 'notifications' ? 'Notifications' : 'My Appointments'}
              </span>
            </div>
          </div>

          {/* Top Right Controls: Notification Bell + Client Profile Pill */}
          <img src="/logo.png" alt="Elevate" className="h-7 w-auto max-w-[115px] object-contain sm:hidden" />
          <div className="flex items-center gap-3">
            {/* Notification Bell with Reactive Count Badge */}
            <button
              type="button"
              onClick={handleOpenNotificationsTab}
              className={`relative p-2 rounded-xl transition flex items-center justify-center cursor-pointer ${
                activeClientTab === 'notifications'
                  ? 'bg-orange-100 text-slate-900 font-bold border border-orange-200'
                  : 'bg-[#FFF9EE] hover:bg-orange-100/70 border border-orange-200/80 text-orange-600'
              }`}
              title={clientUnreadCount > 0 ? `${clientUnreadCount} new notifications` : 'Notifications'}
            >
              <Bell className="w-4 h-4 text-orange-600" />
              {clientUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[18px] text-[10px] font-bold bg-orange-500 text-white rounded-full flex items-center justify-center shadow-xs">
                  {clientUnreadCount}
                </span>
              )}
            </button>

            {/* Profile Logo Button / Dropdown */}
            <div ref={clientProfileRef} className="relative">
              {clientAuth ? (
                <button
                  type="button"
                  onClick={() => setClientProfileOpen(!clientProfileOpen)}
                  className="p-1 rounded-full hover:bg-orange-50/80 transition cursor-pointer flex items-center justify-center"
                  title={clientAuth.name || 'Client Account'}
                >
                  <div className="w-8 h-8 rounded-full bg-[#ff7f00] flex items-center justify-center font-bold text-xs text-white shadow-xs">
                    <ProfileAvatar src={clientAuth.avatar} name={clientAuth.name || "Client"} />
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowAuthModal(true);
                    setAuthModalTab('login');
                  }}
                  className="px-3.5 py-1.5 bg-[#ff7f00] hover:bg-[#e67300] text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )}

              {/* Profile Dropdown */}
              {clientProfileOpen && clientAuth && (
                <div className="absolute right-0 mt-2.5 w-64 bg-white rounded-2xl shadow-xl border border-orange-200/80 p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2 py-2 border-b border-slate-100">
                    <p className="font-bold text-xs text-slate-900"><GentizeText>{clientAuth.name}</GentizeText></p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5"><GentizeText>{clientAuth.email || clientAuth.username}</GentizeText></p>
                    {clientAuth.phone && <p className="text-[11px] text-slate-400 mt-0.5">{clientAuth.phone}</p>}
                    <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                      <ShieldCheck className="w-3 h-3 text-orange-500" />
                      Client Account Active
                    </div>
                  </div>

                  <div className="pt-2.5 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setClientProfileOpen(false);
                        setActiveClientTab('my-appointments');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-orange-50 rounded-xl transition cursor-pointer"
                    >
                      <Clock className="w-4 h-4 text-orange-500" />
                      <span>My Appointments</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setClientProfileOpen(false);
                        handleClientLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 w-full space-y-6">
          {/* Top Welcome / Access Banner (From Image 1) - Only shown on My Appointments (In Book tab it is placed on the left side) */}
          {activeClientTab === 'my-appointments' && (
            <div className="bg-white rounded-3xl border border-orange-200/80 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2.5 max-w-2xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-600 font-bold text-[11px] uppercase tracking-wider border border-orange-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
                  Verified Client Appointment Access
                </span>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
                  <GentizeText logo>{activeClientTab === 'book'
                    ? (bookingTarget === 'SALES_LEAD' ? 'Schedule a Meeting with Sales Lead' : 'Schedule a Meeting with Gentize')
                    : 'My Appointments & Status'}</GentizeText>
                </h1>
                <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                  <GentizeText>{activeClientTab === 'book'
                    ? 'Book direct time or request pre-booking for next month. Pick an open slot or check your existing appointment status.'
                    : (bookingTarget === 'SALES_LEAD'
                        ? 'Live approval status from Sales Team Lead (Confirmed, Pending, Rescheduled, or Cancelled).'
                        : 'Live approval status from Gentize (Confirmed, Pending, Rescheduled, or Cancelled).')}</GentizeText>
                </p>
              </div>

              {/* Host Profile Info Card */}
              <div className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-orange-50/60 border border-orange-200/70 shrink-0">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-orange-500 to-orange-600 text-white font-bold text-lg flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
                  <GentizeText>{bookingTarget === 'SALES_LEAD' ? 'SL' : (adminInfo?.name?.charAt(0) || 'M')}</GentizeText>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    <GentizeText>{bookingTarget === 'SALES_LEAD' ? 'Sales Team Lead' : (adminInfo?.name || 'Gentize')}</GentizeText>
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {bookingTarget === 'SALES_LEAD' ? 'Sales Team Lead & Solutions Desk' : 'Head Office & Executive Board'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-orange-600 font-bold">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    <span>{bookingTarget === 'SALES_LEAD' ? 'Sales Booking Active' : 'Real-time Calendar Sync'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main View: Notifications Hub OR My Appointments Hub OR 3-Step Interactive Booking Engine */}
          {activeClientTab === 'notifications' ? (
            <div className="space-y-6 animate-in fade-in">
              {/* Header (Exact match to Image 2) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notification History</h1>
                  <p className="text-sm text-slate-500 mt-1">
                    Review alerts, audit outbound SMS/Email, and confirm, reschedule, or cancel client bookings directly.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClientClearNotifications}
                    disabled={clientNotifications.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Clear notification history"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Data</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClientRefreshNotifications}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-2xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh Feeds</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveClientTab('book')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-600 text-white text-xs font-semibold transition shadow-xs"
                  >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span>+ Schedule Meeting</span>
                  </button>
                </div>
              </div>

              {/* SECTION 1: Pending Client Bookings Requiring MD Approval (Image 2 prominent container) */}
              {clientPendingBookings.length > 0 && clientAuth && (
                <div className="p-5 bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-orange-500/10 border-2 border-orange-200 rounded-3xl space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs">
                        <Clock className="w-4 h-4 animate-spin" />
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <span>Client Appointments Awaiting <GentizeText>{bookingTarget === 'SALES_LEAD' ? 'Lead' : 'Gentize'}</GentizeText> Approval</span>
                          <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-xs font-semibold">
                            {clientPendingBookings.length} Action Needed
                          </span>
                        </h3>
                        <p className="text-xs text-orange-600 font-medium">
                          Review requests below. Choose to Confirm, Re-Schedule, or Cancel each booking.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clientPendingBookings.map((b) => (
                      <div
                        key={b.id}
                        className="bg-white rounded-2xl border border-orange-200 p-4 shadow-xs space-y-3 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 font-bold text-xs flex items-center justify-center">
                                <GentizeText>{(b.name || b.client_name || clientAuth?.name)?.charAt(0) || 'C'}</GentizeText>
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-900"><GentizeText>{b.name || b.client_name || clientAuth?.name || 'Client'}</GentizeText></h4>
                                <span className="text-[10px] font-semibold text-slate-400">Ref: {b.id}</span>
                              </div>
                            </div>

                            <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 border border-orange-200 text-[10px] font-semibold uppercase tracking-wider">
                              Pending <GentizeText>{b.booking_target === 'SALES_LEAD' || bookingTarget === 'SALES_LEAD' ? 'Lead' : 'Gentize'}</GentizeText> Action
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                              <span className="text-slate-400 text-[10px] block font-medium">Requested Time</span>
                              <strong className="text-slate-900 font-bold">
                                {b.booking_date} • {b.start_time ? `${b.start_time} - ${b.end_time}` : 'TBD'}
                              </strong>
                            </div>

                            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                              <span className="text-slate-400 text-[10px] block font-medium">Mode / Venue</span>
                              <strong className="text-slate-900 font-bold truncate block"><GentizeText>{b.meeting_mode || b.location || (b.booking_target === 'SALES_LEAD' || bookingTarget === 'SALES_LEAD' ? 'Sales Desk' : 'Gentize Cabin')}</GentizeText></strong>
                            </div>
                          </div>

                          <div className="mt-2 text-xs text-slate-600 space-y-0.5">
                            {(b.phone || b.client_phone || clientAuth?.phone) && <p>📱 Phone: <strong>{b.phone || b.client_phone || clientAuth?.phone}</strong></p>}
                            {(b.email || b.client_email || clientAuth?.email) && <p>✉️ Email: <strong>{b.email || b.client_email || clientAuth?.email}</strong></p>}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-orange-600">Under Review by <GentizeText>{b.booking_target === 'SALES_LEAD' || bookingTarget === 'SALES_LEAD' ? 'Lead' : 'Gentize'}</GentizeText></span>
                          <button
                            type="button"
                            onClick={() => handleNavigateToBooking(b.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>View Booking</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 2: Complete Notification Audit Log (Exact Image 2 Table) */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-orange-600" />
                    <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">All Dispatched Alerts & History</h3>
                  </div>
                  <span className="text-xs text-slate-400 font-bold">{clientNotifications.length} Total Events</span>
                </div>

                <div className="overflow-x-auto">
                  {clientNotifications.length === 0 ? (
                    <div className="py-14 text-center text-slate-400 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center mx-auto shadow-xs">
                        <Bell className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-700">
                        {!clientAuth ? 'Please sign in to view notification history' : 'No notification events recorded'}
                      </h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        <GentizeText>{!clientAuth
                          ? 'Sign in with your client account to view live SMS, email alerts, and Gentize confirmation notices.'
                          : 'All SMS alerts, confirmation dispatches, and Gentize approval updates will be displayed here in real time.'}</GentizeText>
                      </p>
                      {!clientAuth && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setShowAuthModal(true)}
                            className="px-4 py-2 bg-[#ff7f00] hover:bg-[#e67300] text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer"
                          >
                            Sign In
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50/40 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          <th className="py-3.5 px-6">Type & Recipient</th>
                          <th className="py-3.5 px-6">Event & Message</th>
                          <th className="py-3.5 px-6">Booking Details</th>
                          <th className="py-3.5 px-6">Status</th>
                          <th className="py-3.5 px-6">Dispatched At</th>
                          <th className="py-3.5 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                        {clientNotifications.map((n) => (
                          <tr key={n.id} className="hover:bg-slate-50/50 transition">
                            {/* Type & Recipient */}
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                  n.type === 'EMAIL'
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : 'bg-orange-50 text-orange-600 border border-orange-200'
                                }`}>
                                  {n.type === 'EMAIL' ? <Mail className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                                  {n.type}
                                </span>
                                <div>
                                  <div className="font-bold text-slate-900 truncate max-w-[140px]"><GentizeText>{n.recipient}</GentizeText></div>
                                  {(n.client_name || clientAuth?.name) && (
                                    <div className="text-[10px] text-slate-400 font-medium">Client: <GentizeText>{n.client_name || clientAuth?.name}</GentizeText></div>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Event & Message */}
                            <td className="py-4 px-6 max-w-xs">
                              <p className="font-bold text-slate-900 text-xs truncate"><GentizeText>{n.title || n.event_title || 'Notification'}</GentizeText></p>
                              <p className="text-xs text-slate-500 truncate mt-0.5"><GentizeText>{n.message}</GentizeText></p>
                              {n.error_details && (
                                <p className="text-[11px] text-rose-600 font-medium mt-1">Error: {n.error_details}</p>
                              )}
                            </td>

                            {/* Booking Details */}
                            <td className="py-4 px-6 whitespace-nowrap">
                              {n.booking_id || n.booking_date ? (
                                <div>
                                  <div className="font-bold text-slate-900">{n.booking_date}</div>
                                  <div className="text-[11px] text-orange-600 font-bold">
                                    {n.displayTime || (n.start_time ? `${n.start_time} - ${n.end_time}` : (n.booking_id ? `Ref: ${n.booking_id}` : '—'))}
                                  </div>
                                  {n.booking_status && (
                                    <span className={`inline-block mt-0.5 text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded border ${
                                      n.booking_status === 'CONFIRMED'
                                        ? 'bg-orange-50 text-orange-600 border-orange-200'
                                        : n.booking_status === 'CANCELLED'
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : 'bg-orange-50 text-orange-600 border-orange-200'
                                    }`}>
                                      {n.booking_status}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            {/* Delivery Status */}
                            <td className="py-4 px-6 whitespace-nowrap">
                              {(() => {
                                const statusUpper = (n.status || '').toUpperCase();
                                const isFailed = statusUpper === 'FAILED';
                                const isPending = statusUpper === 'PENDING';
                                if (isFailed) {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                      <XCircle className="w-3 h-3 text-rose-600" /> Failed ✕
                                    </span>
                                  );
                                }
                                if (isPending) {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                      <Clock className="w-3 h-3 text-amber-600" /> Pending...
                                    </span>
                                  );
                                }
                                return (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Delivered ✓
                                  </span>
                                );
                              })()}
                            </td>

                            {/* Dispatched At */}
                            <td className="py-4 px-6 text-xs text-slate-500 whitespace-nowrap">
                              {n.sent_at || n.delivered_at || n.created_at ? (
                                <>
                                  <div className="flex items-center gap-1">
                                    <span>{new Date(n.sent_at || n.delivered_at || n.created_at).toLocaleDateString()}</span>
                                    {n.booking_status === 'CONFIRMED' && (
                                      <span className="text-[10px] bg-blue-50 text-blue-600 font-semibold px-1.5 py-0.2 rounded border border-blue-200">Confirmed</span>
                                    )}
                                  </div>
                                  <div className="font-semibold text-slate-700 text-xs">
                                    {new Date(n.sent_at || n.delivered_at || n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                  </div>
                                </>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-4 px-6 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleNavigateToBooking(n.booking_id)}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white transition flex items-center gap-1.5 shadow-2xs ml-auto"
                              >
                                <History className="w-3.5 h-3.5" />
                                <span>View Booking</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          ) : activeClientTab === 'my-appointments' ? (
            <div className="w-full bg-white rounded-3xl border border-orange-200/80 shadow-sm p-6 sm:p-8 space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-semibold flex items-center justify-center shadow-xs">
                      <History className="w-3.5 h-3.5" />
                    </span>
                    <h3 className="text-xl font-bold text-slate-900">My Appointments & Status</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    <GentizeText>{bookingTarget === 'SALES_LEAD'
                      ? 'Live approval status from Sales Team Lead (Confirmed, Pending, Rescheduled, or Cancelled).'
                      : 'Live approval status from Gentize (Confirmed, Pending, Rescheduled, or Cancelled).'}</GentizeText>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveClientTab('book')}
                  className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-sm shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-2 self-start sm:self-auto"
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>+ Schedule New Meeting</span>
                </button>
              </div>

              {/* Status Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'ALL', label: 'All Requests' },
                  { id: 'CONFIRMED', label: bookingTarget === 'SALES_LEAD' ? 'Confirmed by Lead' : 'Confirmed by Gentize' },
                  { id: 'PENDING', label: bookingTarget === 'SALES_LEAD' ? 'Awaiting Lead Review' : 'Awaiting Gentize Review' },
                  { id: 'RESCHEDULED', label: 'Rescheduled' },
                  { id: 'CANCELLED', label: 'Declined / Cancelled' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedStatusFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                      selectedStatusFilter === f.id
                        ? 'bg-orange-500 text-white font-bold shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <GentizeText>{f.label}</GentizeText>
                  </button>
                ))}
              </div>

              {/* Bookings List */}
              {clientBookings.filter(b => selectedStatusFilter === 'ALL' || b.status === selectedStatusFilter).length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center mx-auto shadow-xs">
                    <History className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700">
                    {!clientAuth ? 'Please sign in to view your appointments' : 'No appointments found'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {!clientAuth
                      ? 'Sign in to access your appointment status, reschedule requests, and live meeting links.'
                      : selectedStatusFilter === 'ALL'
                      ? "You haven't scheduled any appointments yet."
                      : `No appointments found matching status "${selectedStatusFilter}".`}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    {!clientAuth && (
                      <button
                        type="button"
                        onClick={() => setShowAuthModal(true)}
                        className="px-4 py-2 bg-[#ff7f00] hover:bg-[#e67300] text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer"
                      >
                        Sign In
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveClientTab('book')}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition shadow-xs cursor-pointer"
                    >
                      <GentizeText>{bookingTarget === 'SALES_LEAD' ? 'Schedule a Meeting with Sales Lead' : 'Schedule a Meeting with Gentize'}</GentizeText>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {clientBookings
                    .filter(b => selectedStatusFilter === 'ALL' || b.status === selectedStatusFilter)
                    .map((booking) => {
                      const isConfirmed = booking.status === 'CONFIRMED';
                      const isPending = booking.status === 'PENDING';
                      const isRescheduled = booking.status === 'RESCHEDULED';
                      const isCancelled = booking.status === 'CANCELLED';

                      const isHighlighted = highlightedBookingId === booking.id;
                      const isLeadBooking = booking.booking_target === 'SALES_LEAD' || bookingTarget === 'SALES_LEAD';
                      const hostBadgeLabel = isLeadBooking ? 'Lead' : 'Gentize';
                      const hostFullTitle = isLeadBooking ? 'Sales Team Lead' : (booking.admin_name || 'Gentize');

                      return (
                        <div
                          key={booking.id}
                          id={`booking-card-${booking.id}`}
                          className={`rounded-2xl border p-5 space-y-4 transition-all duration-500 scroll-mt-24 shadow-xs ${
                            isHighlighted
                              ? 'ring-4 ring-orange-500 border-orange-500 bg-white shadow-2xl scale-[1.015]'
                              : isConfirmed
                              ? 'bg-white border-slate-200 hover:border-slate-300'
                              : isRescheduled
                              ? 'bg-white border-slate-200 hover:border-slate-300'
                              : isCancelled
                              ? 'bg-white border-rose-200'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {/* Targeted Highlight Banner */}
                          {isHighlighted && (
                            <div className="p-2.5 rounded-xl bg-orange-500 text-white flex items-center justify-between text-xs font-semibold shadow-xs animate-in fade-in zoom-in-95">
                              <div className="flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-white" />
                                <span>Showing Exact Requested Appointment Details (Ref: #{booking.id})</span>
                              </div>
                              <span className="text-[10px] bg-slate-950 text-orange-400 px-2 py-0.5 rounded-md font-mono font-bold">
                                TARGET DETAIL
                              </span>
                            </div>
                          )}
                          {/* Status Header Banner */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/60">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                                isConfirmed
                                  ? 'bg-white text-orange-600 border border-orange-300 shadow-2xs'
                                  : isRescheduled
                                  ? 'bg-white text-orange-600 border border-orange-300 shadow-2xs'
                                  : isCancelled
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-white text-orange-600 border border-orange-200 shadow-2xs'
                              }`}>
                                <span className={`w-2 h-2 rounded-full ${
                                  isConfirmed ? 'bg-orange-500' : isRescheduled ? 'bg-orange-500' : isCancelled ? 'bg-rose-500' : 'bg-orange-500 animate-pulse'
                                }`} />
                                <GentizeText>{isConfirmed
                                  ? `Confirmed & Approved by ${hostBadgeLabel} ✓`
                                  : isRescheduled
                                  ? `Rescheduled by ${hostBadgeLabel} 🔄`
                                  : isCancelled
                                  ? `Declined / Cancelled by ${hostBadgeLabel} ✕`
                                  : `Awaiting ${hostBadgeLabel} Review ⏳`}</GentizeText>
                              </span>
                            </div>

                            <span className="font-mono text-xs font-semibold text-slate-500">
                              Ref: #{booking.id}
                            </span>
                          </div>

                          {/* Meeting Details Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                            {/* Client / Attendee Name */}
                            <div className="space-y-1">
                              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Client / Attendee</span>
                              <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                <User className="w-4 h-4 text-orange-600 shrink-0" />
                                <span><GentizeText>{booking.client_name || clientAuth?.name || 'Client'}</GentizeText></span>
                                {(booking.client_phone || clientAuth?.phone) && (
                                  <span className="text-xs font-normal text-slate-500">
                                    ({booking.client_phone || clientAuth?.phone})
                                  </span>
                                )}
                              </p>
                            </div>

                            {/* Host & Venue */}
                            <div className="space-y-1">
                              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Host & Venue</span>
                              <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                                <span><GentizeText>{hostFullTitle}</GentizeText> (<GentizeText>{booking.location || (isLeadBooking ? 'Sales Desk' : 'Gentize Cabin')}</GentizeText>)</span>
                              </p>
                            </div>

                            {/* Date & Time */}
                            <div className="space-y-1">
                              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Date & Time</span>
                              <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                <CalendarIcon className="w-4 h-4 text-orange-500 shrink-0" />
                                <span>{booking.date} • {booking.displayTime || booking.display_time || (booking.start_time ? `${booking.start_time} - ${booking.end_time}` : 'TBD')}</span>
                              </p>
                              {isConfirmed && (booking.confirmed_at || booking.updated_at || booking.created_at) && (
                                <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>Confirmed by <GentizeText>{hostBadgeLabel}</GentizeText>: {new Date(booking.confirmed_at || booking.updated_at || booking.created_at).toLocaleDateString()} at {new Date(booking.confirmed_at || booking.updated_at || booking.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                </p>
                              )}
                            </div>

                            {/* Discussion Topic / Purpose */}
                            <div className="space-y-1">
                              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Discussion Topic / Purpose</span>
                              <p className="font-medium text-slate-800 text-sm">
                                <GentizeText>{booking.meeting_purpose || 'General Executive Discussion'}</GentizeText>
                              </p>
                            </div>

                            {booking.notes && isCancelled && (
                              <div className="sm:col-span-2 p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-xs font-medium">
                                <strong>Decline Reason / Notes:</strong> {booking.notes}
                              </div>
                            )}

                            {booking.latest_notification_message && (
                              <div className="sm:col-span-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                                <BellRing className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                                <span><strong>Latest <GentizeText>{hostBadgeLabel}</GentizeText> Update:</strong> <GentizeText>{booking.latest_notification_message}</GentizeText></span>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                            {/* Gentize Office Google Maps Link */}
                            {(booking.location?.includes('Gentize') || booking.location?.includes('Cabin') || booking.meeting_mode?.includes('Gentize') || booking.meeting_mode?.includes('Cabin')) && (
                              <a
                                href={GENTIZE_OFFICE_MAPS_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-800 hover:text-orange-600 border border-slate-200 hover:border-orange-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
                              >
                                <Navigation className="w-3.5 h-3.5 text-orange-500" />
                                <span>Open in Google Maps ↗</span>
                              </a>
                            )}

                            {/* Google Meet Controls */}
                            {(booking.location?.includes('Meet') || booking.meeting_mode?.includes('Meet')) && (
                              <div className="w-full flex flex-col gap-2 pt-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <a
                                    href={booking.meeting_link || 'https://meet.google.com/new'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="py-2 px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
                                  >
                                    <Video className="w-3.5 h-3.5" />
                                    <span>Join Google Meet ↗</span>
                                  </a>

                                  <a
                                    href="https://meet.google.com/new"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-800 hover:text-orange-600 border border-slate-200 hover:border-orange-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
                                    title="Open Google Meet to create a new room"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-orange-600" />
                                    <span>Create Room in Google ↗</span>
                                  </a>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (editingMeetBookingId === booking.id) {
                                        setEditingMeetBookingId(null);
                                      } else {
                                        setEditingMeetBookingId(booking.id);
                                        setEditingMeetLinkText(booking.meeting_link || '');
                                      }
                                    }}
                                    className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-800 hover:text-orange-600 border border-slate-200 hover:border-orange-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
                                    title="Update Google Meet link"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 text-orange-600" />
                                    <span>Update Link</span>
                                  </button>
                                </div>

                                {editingMeetBookingId === booking.id && (
                                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 animate-in fade-in shadow-xs">
                                    <input
                                      type="text"
                                      value={editingMeetLinkText}
                                      onChange={(e) => setEditingMeetLinkText(e.target.value)}
                                      placeholder="Paste created link: https://meet.google.com/xxx-yyyy-zzz"
                                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:border-orange-500 focus:outline-none"
                                    />
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        disabled={updatingMeetLink}
                                        onClick={() => handleSaveClientMeetLink(booking.id)}
                                        className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
                                      >
                                        {updatingMeetLink ? 'Saving...' : 'Save Link'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingMeetBookingId(null)}
                                        className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(
                                `*CALGEN EXECUTIVE SCHEDULING*\n` +
                                `*Meeting Details*\n` +
                                `━━━━━━━━━━━━━━━━━━━━━━\n` +
                                `*Status:* ${booking.status}\n` +
                                `*Reference ID:* #${booking.id}\n\n` +
                                `*MEETING DETAILS:*\n` +
                                `• *Host:* ${booking.admin_name || 'Gentize'}\n` +
                                `• *Date:* ${booking.date}\n` +
                                `• *Time:* ${booking.displayTime}\n` +
                                `• *Mode:* ${booking.location || 'Gentize Office (In-Person)'}\n` +
                                ((booking.location?.includes('Gentize') || booking.location?.includes('Cabin'))
                                  ? `• *Google Maps Location:* ${GENTIZE_OFFICE_MAPS_URL}\n`
                                  : booking.location?.includes('Meet')
                                  ? `• *Google Meet Link:* ${booking.meeting_link || 'https://meet.google.com'}\n`
                                  : (booking.meeting_link && booking.meeting_link.includes('maps'))
                                  ? `• *Google Maps Location:* ${booking.meeting_link}\n`
                                  : (booking.location?.includes('Other') || (!booking.location?.includes('Meet') && !booking.location?.includes('Phone')))
                                  ? `• *Google Maps Location:* https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((booking.location || '').replace(/^Other\s*\(/i, '').replace(/\)$/, '').trim())}\n`
                                  : booking.meeting_link ? `• *Link / Details:* ${booking.meeting_link}\n` : '') +
                                `\n*CLIENT:*\n` +
                                `• *Attendee:* ${booking.client_name || clientAuth?.name || 'Client'}\n` +
                                `• *Purpose:* ${booking.meeting_purpose || 'Client Meeting'}\n\n` +
                                `━━━━━━━━━━━━━━━━━━━━━━\n` +
                                `_Elevate Technologies • Professional Scheduling_`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="py-2 px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Share on WhatsApp</span>
                            </a>

                            {isConfirmed && (
                              <a
                                href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Meeting with ' + (booking.admin_name || 'MD'))}&details=${encodeURIComponent(`Meeting\nStatus: Confirmed\nMode: ${booking.location}`)}&location=${encodeURIComponent((booking.location?.includes('Gentize') || booking.location?.includes('Cabin')) ? GENTIZE_OFFICE_MAPS_URL : (booking.location || 'Gentize Office'))}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-800 hover:text-orange-600 border border-slate-200 hover:border-orange-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-orange-600" />
                                <span>Google Calendar</span>
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in">
              {/* LEFT SIDEBAR: Meeting Info & Host Details (Image 1 side-panel) */}
              <div className="lg:col-span-4 xl:col-span-4 flex flex-col">
                <div className="bg-white rounded-3xl border border-orange-200/80 p-4 sm:p-7 shadow-xs flex flex-col space-y-5">
                  <div className="space-y-5">
                    {/* Verified Badge */}
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-600 font-bold text-[9px] sm:text-[11px] uppercase tracking-wider border border-orange-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
                        Verified Client Appointment Access
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div className="space-y-2">
                      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                        Schedule a Meeting with <GentizeText logo>{bookingTarget === 'SALES_LEAD' ? 'Sales Team Lead' : 'Gentize'}</GentizeText>
                      </h1>
                      <p className="text-slate-500 text-xs leading-relaxed">
                        Book direct time or request pre-booking with <GentizeText>{bookingTarget === 'SALES_LEAD' ? 'our Sales Team Lead' : 'Gentize'}</GentizeText>. Pick an open slot or check your existing appointment status.
                      </p>
                    </div>

                    {/* Booking Target Option (MD vs Sales Team Lead) */}
                    <div className="space-y-2 p-3 bg-slate-50/80 border border-slate-200/90 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                          Choose Meeting Host:
                        </span>
                        <span className="text-[10px] font-bold text-orange-600 bg-orange-100/70 px-2 py-0.5 rounded-full">
                          <GentizeText>{bookingTarget === 'SALES_LEAD' ? 'Sales Desk' : 'Gentize Office'}</GentizeText>
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setBookingTarget('MD')}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            bookingTarget === 'MD'
                              ? 'bg-orange-50 text-orange-700 border-orange-500 shadow-md shadow-orange-500/15'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          
                          <span><GentizeText>Gentize</GentizeText></span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBookingTarget('SALES_LEAD')}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            bookingTarget === 'SALES_LEAD'
                              ? 'bg-orange-50 text-orange-700 border-orange-500 shadow-md shadow-orange-500/15'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className="text-sm">💼</span>
                          <span>Sales Team Lead</span>
                        </button>
                      </div>
                    </div>

                    {/* Host Profile Info Card */}
                    <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-orange-50/70 border border-orange-200/80">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-orange-500 to-orange-600 text-white font-bold text-base flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
                        <GentizeText>{bookingTarget === 'SALES_LEAD' ? 'SL' : (adminInfo?.name?.charAt(0) || 'A')}</GentizeText>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          <GentizeText>{bookingTarget === 'SALES_LEAD' ? 'Gentize LEAD' : (adminInfo?.name || 'Admin Manager')}</GentizeText>
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {bookingTarget === 'SALES_LEAD' ? 'Sales Team Lead & Solutions Desk' : 'Head Office & Executive Board'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-orange-600 font-bold">
                          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                          <span>{bookingTarget === 'SALES_LEAD' ? 'Sales Booking Active' : 'Real-time Calendar Sync'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Booking Summary Box */}
                    <div className="pt-3 border-t border-slate-100 space-y-3 text-xs">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Appointment Summary
                      </div>

                      <div className="flex items-start gap-2.5 text-slate-700">
                        <CalendarIcon className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">DATE</span>
                          <span className="font-bold text-slate-900 text-xs">
                            {selectedDate || 'Select a date from calendar'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 text-slate-700">
                        <Clock className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">TIME</span>
                          <span className="font-bold text-slate-900 text-xs">
                            {isPreBookingMode
                              ? `${formatTo12H(preBookingTime)} (${preBookingDuration}m Pre-Booking)`
                              : selectedSlot
                              ? `${selectedSlot.displayStart} – ${selectedSlot.displayEnd} (${selectedSlot.slotDuration || 30} mins)`
                              : 'Choose an available time slot'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 text-slate-700">
                        <MapPin className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">MEETING MODE</span>
                          <span className="font-bold text-slate-900 text-xs truncate block max-w-[200px]">
                            <GentizeText>{meetingMode === 'Other' && otherModeText ? otherModeText : meetingMode}</GentizeText>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Appointments Navigation */}
                  <div className="pt-4 border-t border-slate-100 mt-5">
                    <button
                      type="button"
                      onClick={() => setActiveClientTab('my-appointments')}
                      className="w-full py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                    >
                      <History className="w-3.5 h-3.5 text-orange-500" />
                      <span>View My Existing Bookings ({clientBookings.length})</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT WIZARD: Step-by-step Wizard (1. Date -> 2. Time -> 3. Details) */}
              <div id="client-booking-wizard" className="lg:col-span-8 xl:col-span-8 flex flex-col scroll-mt-20">
                <div className="bg-white rounded-3xl border border-orange-200/80 shadow-sm p-4 sm:p-7 flex flex-col">
                  {/* STEP 1: Select Date */}
                  {bookingStep === 1 && (
                    <div className="flex-1 flex flex-col justify-between space-y-6 animate-in fade-in">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-semibold flex items-center justify-center shadow-xs">
                              1
                            </span>
                            <h3 className="text-base font-bold text-slate-900">Select Date</h3>
                            <span className="text-[11px] text-slate-400 font-bold hidden sm:inline">
                              (Click any date, including next month)
                            </span>
                          </div>

                          <div className="flex items-center gap-1 bg-orange-50/70 p-1 rounded-xl border border-orange-200/70">
                            <button
                              type="button"
                              onClick={prevMonth}
                              className="p-1 hover:bg-white rounded-lg text-slate-700 transition"
                              title="Previous Month"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-semibold text-slate-900 px-2 min-w-[120px] text-center">
                              <GentizeText>{monthName}</GentizeText>
                            </span>
                            <button
                              type="button"
                              onClick={nextMonth}
                              className="p-1 hover:bg-white rounded-lg text-slate-700 transition"
                              title="Next Month"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Month Grid Calendar */}
                        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                          <div className="grid grid-cols-7 gap-1 text-center mb-2">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                              <span key={d} className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider py-1">
                                {d}
                              </span>
                            ))}
                          </div>

                          <div className="grid grid-cols-7 gap-1.5">
                            {Array.from({ length: firstDayIndex }).map((_, i) => (
                              <div key={`empty-${i}`} className="h-11" />
                            ))}

                            {Array.from({ length: daysInMonth }).map((_, i) => {
                              const dayNum = i + 1;
                              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                              const hasSlots = datesWithFreeSlots.has(dateStr);
                              const isSelected = selectedDate === dateStr;
                              const isPast = dateStr < todayStr;

                              return (
                                <button
                                  key={dateStr}
                                  type="button"
                                  disabled={isPast}
                                  onClick={() => {
                                    setSelectedDate(dateStr);
                                    setSelectedSlot(null);
                                  }}
                                  className={`h-12 rounded-xl text-xs font-semibold transition flex flex-col items-center justify-center relative cursor-pointer ${
                                    isPast
                                      ? 'text-slate-300 bg-slate-100/30 cursor-not-allowed'
                                      : hasSlots
                                      ? 'bg-white hover:bg-orange-50 text-slate-900 border border-orange-200 shadow-2xs hover:border-orange-500'
                                      : 'bg-white hover:bg-orange-50 text-slate-700 border border-slate-200 shadow-2xs hover:border-orange-200'
                                  }`}
                                >
                                  <span className={`w-7 h-7 flex items-center justify-center text-xs transition-all ${
                                    isSelected
                                      ? 'bg-orange-500 text-white font-bold rounded-xl shadow-xs scale-105'
                                      : hasSlots
                                      ? 'text-orange-600 font-bold'
                                      : 'text-slate-700'
                                  }`}>
                                    {dayNum}
                                  </span>

                                  {/* Slots indicator badge */}
                                  {!isPast && (
                                    <div className="flex items-center gap-0.5 mt-0.5">
                                      {hasSlots ? (
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Slots Available" />
                                      ) : (
                                        <span className="w-1 h-1 rounded-full bg-orange-300/80" title="Pre-Booking Mode" />
                                      )}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Calendar Legend */}
                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <span>Available Slot</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                            <span>Selected</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-orange-300" />
                            <span>Pre-Booking / Booked</span>
                          </div>
                        </div>
                      </div>

                      {/* Step 1 Bottom Nav */}
                      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-auto">
                        <span className="text-xs text-slate-500">
                          {selectedDate ? (
                            <span>Selected: <strong className="text-slate-900 font-bold">{selectedDate}</strong></span>
                          ) : (
                            'Select a date to continue'
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => setBookingStep(2)}
                          disabled={!selectedDate}
                          className={`px-6 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-xs ${
                            selectedDate
                              ? 'bg-orange-500 hover:bg-orange-600 text-white active:scale-95 transition-all'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <span>Next: Choose Time</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Select Time Slot */}
                  {bookingStep === 2 && (
                    <div className="space-y-6 animate-in fade-in">
                      <div className="space-y-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-semibold flex items-center justify-center shadow-xs">
                              2
                            </span>
                            <h3 className="text-base font-bold text-slate-900">
                              {isPreBookingMode ? 'Request Preferred Meeting Time' : 'Choose Available Time Slot'}
                            </h3>
                          </div>

                          <div className="text-xs font-semibold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-xl border border-orange-200">
                            📅 {selectedDate}
                          </div>
                        </div>

                        {/* CASE A: Pre-Booking Mode */}
                        {isPreBookingMode ? (
                          <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-2xs animate-in fade-in">
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-xl bg-orange-500 text-white font-bold flex items-center justify-center shrink-0 shadow-xs">
                                <Sparkles className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                                  Next Month / Future Pre-Booking
                                </h4>
                                <p className="text-xs text-slate-900 font-medium mt-0.5"><GentizeText>
                                  Gentize hasn't published fixed slots for </GentizeText><strong>{selectedDate}</strong><GentizeText> yet. Select your preferred time window and duration below — Gentize will review and confirm your slot!
                                </GentizeText></p>
                              </div>
                            </div>

                            {/* Pre-Booking Quick Time Windows */}
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-2">
                                Select Preferred Time Window
                              </label>
                              <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
                                {preBookingOptions.map((opt) => {
                                  const isSelected = preBookingTime === opt.time;
                                  return (
                                    <button
                                      key={opt.time}
                                      type="button"
                                      onClick={() => setPreBookingTime(opt.time)}
                                      className={`py-2.5 px-2 rounded-xl text-xs font-semibold transition border text-center ${
                                        isSelected
                                          ? 'bg-orange-500 text-white border-orange-600 shadow-md shadow-orange-500/20'
                                          : 'bg-white hover:border-orange-300 text-slate-800 border-slate-200'
                                      }`}
                                    >
                                      <div><GentizeText>{opt.label}</GentizeText></div>
                                      <div className="text-[10px] font-normal text-slate-400 capitalize">{opt.period}</div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Custom Time & Duration Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                                  Or Set Custom Time (AM/PM)
                                </label>
                                <CustomTimePicker
                                  value={preBookingTime}
                                  onChange={setPreBookingTime}
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                                  Duration
                                </label>
                                <div className="grid grid-cols-3 gap-1.5">
                                  {[15, 30, 45].map((d) => (
                                    <button
                                      key={d}
                                      type="button"
                                      onClick={() => setPreBookingDuration(d)}
                                      className={`py-2 rounded-xl text-xs font-semibold border transition ${
                                        preBookingDuration === d
                                          ? 'bg-orange-500 text-white border-orange-600 font-bold'
                                          : 'bg-white border-slate-200 text-slate-700 hover:border-orange-300'
                                      }`}
                                    >
                                      {d} min
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-900 flex items-center justify-between">
                              <span>
                                Requested Time: <strong>{formatTo12H(preBookingTime)} – {formatTo12H(calculatePreBookingEndTime(preBookingTime, preBookingDuration))}</strong> ({preBookingDuration} mins)
                              </span>
                              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200"><GentizeText>
                                Direct Gentize Review
                              </GentizeText></span>
                            </div>
                          </div>
                        ) : slotsForDate.length === 0 ? (
                          <div className="py-14 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            <p className="text-xs font-semibold text-slate-600">No time slots published for this date</p>
                            <p className="text-[11px] text-slate-400 mt-1">Please select another date on the calendar.</p>
                          </div>
                        ) : (
                          <div className="space-y-5">
                            {/* Morning Slots */}
                            {slotGroups.morning.length > 0 && (
                              <div>
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-2.5">
                                  <Sunrise className="w-4 h-4 text-orange-500" />
                                  <span>Morning Slots</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  {slotGroups.morning.map((slot) => {
                                    const isSelected = selectedSlot?.id === slot.id;
                                    return (
                                      <button
                                        key={slot.id}
                                        type="button"
                                        onClick={() => handleSlotSelect(slot)}
                                        className={`py-3.5 px-3 rounded-2xl text-xs font-semibold transition border text-center flex flex-col items-center justify-center min-h-[64px] ${
                                          isSelected ? 'bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-500/20 font-bold'
                                            : 'bg-white hover:border-orange-200 text-slate-800 border-slate-200 hover:bg-orange-50/40'
                                        }`}
                                      >
                                        <div className="font-bold text-xs">{slot.displayTime || (slot.displayEnd ? `${slot.displayStart} – ${slot.displayEnd}` : slot.displayStart)}</div>
                                        {getSlotDurationLabel(slot) && (
                                          <div className={`text-[10px] font-medium mt-0.5 ${isSelected ? 'text-white/90 font-medium' : 'text-slate-400'}`}>
                                            <GentizeText>{getSlotDurationLabel(slot)}</GentizeText>
                                          </div>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Afternoon Slots */}
                            {slotGroups.afternoon.length > 0 && (
                              <div>
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-2.5">
                                  <Sun className="w-4 h-4 text-orange-500" />
                                  <span>Afternoon Slots</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  {slotGroups.afternoon.map((slot) => {
                                    const isSelected = selectedSlot?.id === slot.id;
                                    return (
                                      <button
                                        key={slot.id}
                                        type="button"
                                        onClick={() => handleSlotSelect(slot)}
                                        className={`py-3.5 px-3 rounded-2xl text-xs font-semibold transition border text-center flex flex-col items-center justify-center min-h-[64px] ${
                                          isSelected ? 'bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-500/20 font-bold'
                                            : 'bg-white hover:border-orange-200 text-slate-800 border-slate-200 hover:bg-orange-50/40'
                                        }`}
                                      >
                                        <div className="font-bold text-xs">{slot.displayTime || (slot.displayEnd ? `${slot.displayStart} – ${slot.displayEnd}` : slot.displayStart)}</div>
                                        {getSlotDurationLabel(slot) && (
                                          <div className={`text-[10px] font-medium mt-0.5 ${isSelected ? 'text-white/90 font-medium' : 'text-slate-400'}`}>
                                            <GentizeText>{getSlotDurationLabel(slot)}</GentizeText>
                                          </div>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Evening Slots */}
                            {slotGroups.evening.length > 0 && (
                              <div>
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-2.5">
                                  <Moon className="w-4 h-4 text-orange-500" />
                                  <span>Evening Slots</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  {slotGroups.evening.map((slot) => {
                                    const isSelected = selectedSlot?.id === slot.id;
                                    return (
                                      <button
                                        key={slot.id}
                                        type="button"
                                        onClick={() => handleSlotSelect(slot)}
                                        className={`py-3.5 px-3 rounded-2xl text-xs font-semibold transition border text-center flex flex-col items-center justify-center min-h-[64px] ${
                                          isSelected ? 'bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-500/20 font-bold'
                                            : 'bg-white hover:border-orange-200 text-slate-800 border-slate-200 hover:bg-orange-50/40'
                                        }`}
                                      >
                                        <div className="font-bold text-xs">{slot.displayTime || (slot.displayEnd ? `${slot.displayStart} – ${slot.displayEnd}` : slot.displayStart)}</div>
                                        {getSlotDurationLabel(slot) && (
                                          <div className={`text-[10px] font-medium mt-0.5 ${isSelected ? 'text-white/90 font-medium' : 'text-slate-400'}`}>
                                            <GentizeText>{getSlotDurationLabel(slot)}</GentizeText>
                                          </div>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Selected Slot Callout */}
                            {selectedSlot && (
                              <div className="p-3.5 bg-orange-50/90 border border-orange-200 rounded-2xl flex items-center justify-between text-xs text-slate-800 animate-in fade-in">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                                  <span>Selected Slot: <strong className="text-orange-700">{selectedSlot.displayTime || (selectedSlot.displayEnd ? `${selectedSlot.displayStart} – ${selectedSlot.displayEnd}` : selectedSlot.displayStart)}</strong><GentizeText>{getSlotDurationLabel(selectedSlot) ? ` (${getSlotDurationLabel(selectedSlot)})` : ''}</GentizeText></span>
                                </div>
                                <span className="text-[11px] font-bold text-orange-600">Ready to proceed →</span>
                              </div>
                            )}

                            {/* Occupied / Booked Slots Masked Strictly as "Admin Booked" */}
                            {occupiedSlotsForDate.length > 0 && (
                              <div className="pt-3 border-t border-slate-100">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
                                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Reserved Slots ({occupiedSlotsForDate.length})</span>
                                  <span className="text-[10px] text-slate-400 font-normal ml-1">— Already booked by <GentizeText>{bookingTarget === 'SALES_LEAD' ? 'Sales Team Lead' : 'Gentize'}</GentizeText></span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  {occupiedSlotsForDate.map((slot) => (
                                    <div
                                      key={slot.id}
                                      className="py-2.5 px-3 rounded-2xl bg-slate-100/80 border border-slate-200 text-center opacity-70 select-none cursor-not-allowed min-h-[60px] flex flex-col items-center justify-center"
                                      title="This time is already booked by Admin"
                                    >
                                      <div className="text-xs font-semibold text-slate-500 line-through">
                                        {slot.displayStart}
                                      </div>
                                      <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mt-0.5">
                                        Admin Booked
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Step 2 Bottom Nav */}
                      <div className="pt-5 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setBookingStep(1)}
                          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Back to Date</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setBookingStep(3)}
                          disabled={!isPreBookingMode && !selectedSlot}
                          className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-xs ${
                            isPreBookingMode || selectedSlot
                              ? 'bg-orange-500 hover:bg-orange-600 text-white active:scale-95 transition-all'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <span>Next: Details & Mode</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Contact Details & Meeting Mode */}
                  {bookingStep === 3 && (
                    <form onSubmit={handleSubmitBooking} className="space-y-5 animate-in fade-in flex-1 flex flex-col justify-between">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-semibold flex items-center justify-center shadow-xs">
                          3
                        </span>
                        <h3 className="text-base font-bold text-slate-900">Your Contact Details & Meeting Mode</h3>
                      </div>

                      {/* Meeting Mode Options: In-Person, Google Meet, Phone, Other */}
                      <div className="space-y-3">
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Select Meeting Mode
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {[
                            { id: 'Gentize Office (In-Person)', label: 'Gentize Office', sub: 'In-Person Head Office', icon: Building2 },
                            { id: 'Google Meet (Online)', label: 'Google Meet', sub: 'Video Conference Link', icon: Video },
                            { id: 'Direct Phone Call', label: 'Direct Phone', sub: 'Gentize calls your mobile', icon: PhoneCall },
                            { id: 'Other', label: 'Other Mode', sub: 'Custom venue or app', icon: MapPin },
                          ].map((mode) => {
                            const isSelected = meetingMode === mode.id;
                            const Icon = mode.icon;
                            return (
                              <button
                                key={mode.id}
                                type="button"
                                onClick={() => setMeetingMode(mode.id)}
                                className={`p-3 rounded-2xl border text-left transition ${
                                  isSelected
                                    ? 'bg-orange-50/80 border-orange-500 ring-2 ring-orange-500/20 shadow-xs'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                    <Icon className="w-3.5 h-3.5" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-xs text-slate-900 leading-tight"><GentizeText>{mode.label}</GentizeText></p>
                                    <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{mode.sub}</p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* 1. Gentize Office In-Person Map Panel */}
                        {(meetingMode === 'Gentize Office (In-Person)' || meetingMode === 'MD Cabin (In-Person)') && (
                          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 animate-in fade-in">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                                  <Building2 className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider"><GentizeText>
                                      Gentize Office • Elevate Innovations
                                    </GentizeText></h4>
                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                                      Fixed Venue
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 font-medium"><GentizeText>
                                    In-Person Executive Visit at Gentize Office
                                  </GentizeText></p>
                                </div>
                              </div>

                              <a
                                href={GENTIZE_OFFICE_MAPS_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition shadow-xs self-start sm:self-auto"
                              >
                                <Navigation className="w-3.5 h-3.5" />
                                <span>Open in Google Maps ↗</span>
                              </a>
                            </div>

                            <div className="w-full h-44 rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
                              <iframe
                                title="Elevate Gentize Office Google Maps"
                                src={GENTIZE_OFFICE_EMBED_URL}
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen=""
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                              />
                            </div>
                          </div>
                        )}

                        {/* 2. Google Meet Video Link Panel */}
                        {meetingMode === 'Google Meet (Online)' && (
                          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 animate-in fade-in">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                                  <Video className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                                    Google Meet Video Conference
                                  </h4>
                                  <p className="text-[11px] text-slate-500 font-medium">
                                    Click below to create a room on Google Meet, or paste an existing link.
                                  </p>
                                </div>
                              </div>

                              <a
                                href="https://meet.google.com/new"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition shadow-xs self-start sm:self-auto"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Open Google Meet to Create Room ↗</span>
                              </a>
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                Meeting Room Link
                              </label>
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <input
                                  type="text"
                                  value={googleMeetLink}
                                  onChange={(e) => setGoogleMeetLink(e.target.value)}
                                  placeholder="https://meet.google.com/xxx-yyyy-zzz (or leave empty for auto-room)"
                                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                                />

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={handlePasteMeetLink}
                                    className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-orange-500" />
                                    <span>Paste</span>
                                  </button>

                                  {googleMeetLink && (
                                    <a
                                      href={googleMeetLink.startsWith('http') ? googleMeetLink : `https://meet.google.com/${googleMeetLink}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
                                    >
                                      <Video className="w-3.5 h-3.5 text-orange-400" />
                                      <span>Test ↗</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 3. Other Mode Panel */}
                        {meetingMode === 'Other' && (
                          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3.5 animate-in fade-in">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                                  <MapPin className="w-4 h-4 text-orange-600" />
                                  <span>Custom Meeting Setup</span>
                                </span>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  Specify an alternative virtual app or custom physical venue.
                                </p>
                              </div>

                              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOtherType('APP');
                                    setOtherModeText(`${otherAppName}: ${otherMeetingLink || 'Client will provide link'}`);
                                  }}
                                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                                    otherType === 'APP'
                                      ? 'bg-orange-500 text-white font-bold shadow-xs'
                                      : 'text-slate-600 hover:bg-white'
                                  }`}
                                >
                                  Virtual App
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOtherType('VENUE');
                                    setOtherModeText(otherVenue || 'Custom Client Venue');
                                  }}
                                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                                    otherType === 'VENUE'
                                      ? 'bg-orange-500 text-white font-bold shadow-xs'
                                      : 'text-slate-600 hover:bg-white'
                                  }`}
                                >
                                  Physical Location
                                </button>
                              </div>
                            </div>

                            {otherType === 'APP' ? (
                              <div className="space-y-3 pt-1">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                                      Select App
                                    </label>
                                    <select
                                      value={otherAppName}
                                      onChange={(e) => {
                                        setOtherAppName(e.target.value);
                                        setOtherModeText(`${e.target.value}: ${otherMeetingLink || 'Client will provide link'}`);
                                      }}
                                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden"
                                    >
                                      <option value="Zoom">Zoom</option>
                                      <option value="Microsoft Teams">Microsoft Teams</option>
                                      <option value="Webex">Cisco Webex</option>
                                      <option value="Skype">Skype</option>
                                      <option value="WhatsApp Video">WhatsApp Video Call</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                                      Meeting Room Link
                                    </label>
                                    <input
                                      type="text"
                                      value={otherMeetingLink}
                                      onChange={(e) => {
                                        setOtherMeetingLink(e.target.value);
                                        setOtherModeText(`${otherAppName}: ${e.target.value}`);
                                      }}
                                      placeholder="https://zoom.us/j/... or Teams link"
                                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden"
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1.5 pt-1">
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                                    Custom Venue Name & Address *
                                  </label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-1">
                                    <MapPin className="w-3.5 h-3.5 text-orange-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                      type="text"
                                      value={otherVenue}
                                      onChange={(e) => {
                                        setOtherVenue(e.target.value);
                                        setOtherModeText(e.target.value);
                                        setSelectedMapVenueName(e.target.value);
                                      }}
                                      placeholder=""
                                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                                      required={meetingMode === 'Other' && otherType === 'VENUE'}
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowVenueMapModal(true);
                                      if (otherVenue.trim()) {
                                        setMapSearchInput(otherVenue.trim());
                                        setSelectedMapVenueName(otherVenue.trim());
                                      }
                                    }}
                                    className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition shadow-2xs flex items-center gap-1.5 shrink-0 active:scale-95"
                                  >
                                    <Navigation className="w-3.5 h-3.5" />
                                    <span>Map</span>
                                  </button>
                                </div>
                                {otherVenue && (
                                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 mt-1">
                                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    <span className="truncate">Selected Venue: {otherVenue}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 4. Direct Phone Call Info */}
                        {meetingMode === 'Direct Phone Call' && (
                          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs text-xs text-slate-900 space-y-1 animate-in fade-in">
                            <div className="flex items-center gap-1.5 font-bold">
                              <PhoneCall className="w-4 h-4 text-orange-500" />
                              <span>Direct Telephone Conversation with <GentizeText>{bookingTarget === 'SALES_LEAD' ? 'Sales Team Lead' : 'Gentize'}</GentizeText></span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              <GentizeText>{bookingTarget === 'SALES_LEAD'
                                ? 'Sales Team Lead will call your mobile number directly at the scheduled appointment time.'
                                : 'Gentize will call your mobile number directly at the scheduled appointment time.'}</GentizeText>
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Client Info: Name & Email */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Your Full Name *
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Enter your full name"
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 placeholder:text-slate-400 placeholder:font-normal"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => {
                              setEmailTouched(true);
                              setFormData({ ...formData, email: e.target.value });
                            }}
                            onBlur={() => setEmailTouched(true)}
                            placeholder="Enter your email address"
                            className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 transition placeholder:text-slate-400 placeholder:font-normal ${
                              emailTouched && formData.email && !isEmailValid(formData.email)
                                ? 'border-rose-400 focus:ring-rose-500/30 focus:border-rose-500'
                                : 'border-slate-200 focus:ring-orange-500/30 focus:border-orange-500'
                            }`}
                            required
                          />
                          {emailTouched && formData.email && !isEmailValid(formData.email) && (
                            <p className="text-[10px] text-rose-500 font-semibold mt-1">
                              Please enter a valid email format (e.g. name@domain.com)
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Client Info: Phone & Purpose */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className="relative" ref={countryDropdownRef}>
                          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Phone Number (SMS & WhatsApp Updates) *
                          </label>
                          <div className="flex items-center rounded-xl bg-slate-50 border border-slate-200 focus-within:ring-2 focus-within:ring-orange-500/30 focus-within:border-orange-500 transition">
                            {/* Compact Country Code Trigger: shows only flag + code + chevron without country name */}
                            <button
                              type="button"
                              onClick={() => setCountryDropdownOpen(prev => !prev)}
                              className="h-10 px-2.5 bg-slate-100/90 hover:bg-slate-200/80 text-xs font-bold text-slate-800 border-r border-slate-200 rounded-l-xl flex items-center gap-1 shrink-0 transition select-none cursor-pointer"
                              title="Click to select country code"
                            >
                              <span>{COUNTRY_CONFIG[selectedCountryCode]?.flag || '🇮🇳'}</span>
                              <span className="font-bold">{selectedCountryCode}</span>
                              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${countryDropdownOpen ? 'rotate-180 text-orange-600' : ''}`} />
                            </button>

                            {/* Full Remaining Area Dedicated for Phone Typing */}
                            <input
                              type="tel"
                              inputMode="numeric"
                              value={rawPhoneNumber}
                              onChange={handlePhoneChange}
                              onBlur={() => setPhoneTouched(true)}
                              maxLength={COUNTRY_CONFIG[selectedCountryCode]?.digits || 10}
                              placeholder="Enter your mobile number"
                              className="flex-1 min-w-0 px-3 py-2.5 bg-transparent text-xs font-semibold text-slate-900 focus:outline-hidden placeholder:text-slate-400 placeholder:font-normal"
                              required
                            />
                          </div>

                          {/* Country Selection Dropdown Popover */}
                          {countryDropdownOpen && (
                            <div className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Select Country Code
                              </div>
                              {Object.entries(COUNTRY_CONFIG).map(([code, config]) => {
                                const isSelected = selectedCountryCode === code;
                                return (
                                  <button
                                    key={code}
                                    type="button"
                                    onClick={() => {
                                      handleCountryCodeChange(code);
                                      setCountryDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-orange-50 transition ${
                                      isSelected ? 'bg-orange-50/80 font-bold text-orange-600' : 'text-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">{config.flag}</span>
                                      <span><GentizeText>{config.name}</GentizeText></span>
                                    </div>
                                    <span className="font-mono text-[11px] font-semibold text-slate-500">{code}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {phoneTouched && rawPhoneNumber && rawPhoneNumber.length < (COUNTRY_CONFIG[selectedCountryCode]?.digits || 10) && (
                            <p className="text-[10px] text-amber-600 font-semibold mt-1">
                              <GentizeText>{COUNTRY_CONFIG[selectedCountryCode]?.name}</GentizeText> phone number requires {COUNTRY_CONFIG[selectedCountryCode]?.digits} digits ({rawPhoneNumber.length}/{COUNTRY_CONFIG[selectedCountryCode]?.digits})
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Discussion Topic / Purpose
                          </label>
                          <input
                            type="text"
                            value={formData.purpose}
                            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                            placeholder="Enter discussion topic or purpose"
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 placeholder:text-slate-400 placeholder:font-normal"
                          />
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Additional Notes
                        </label>
                        <textarea
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Enter any additional notes or points for Gentize..."
                          rows={2}
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 placeholder:text-slate-400 placeholder:font-normal resize-none"
                        />
                      </div>

                      {/* Selected Slot Summary Banner */}
                      <div className="p-3.5 rounded-2xl bg-orange-50/80 border border-orange-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                          <span className="font-bold text-slate-900">
                            {isPreBookingMode
                              ? `Pre-Booking: ${selectedDate} at ${formatTo12H(preBookingTime)} (${preBookingDuration}m)`
                              : selectedSlot
                              ? `Selected: ${selectedSlot.date || selectedDate} at ${selectedSlot.displayStart} – ${selectedSlot.displayEnd}`
                              : `Date: ${selectedDate}`}
                          </span>
                        </div>
                        <span
                          className="font-mono text-[11px] text-orange-600 font-bold bg-white px-2.5 py-1 rounded-md border border-orange-200 max-w-[260px] truncate shrink-0"
                          title={meetingMode === 'Other' && (otherVenue || otherModeText) ? (otherVenue || otherModeText) : meetingMode}
                        >
                          <GentizeText>{meetingMode === 'Other' && (otherVenue || otherModeText)
                            ? (otherVenue || otherModeText)
                            : meetingMode}</GentizeText>
                        </span>
                      </div>

                      {/* Step 3 Bottom Nav */}
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 mt-auto">
                        <button
                          type="button"
                          onClick={() => setBookingStep(2)}
                          className="px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Back to Time</span>
                        </button>

                        <button
                          type="submit"
                          disabled={submitting || (!isPreBookingMode && !selectedSlot)}
                          className={`flex-1 py-3.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2 ${
                            !isPreBookingMode && !selectedSlot
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                              : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-600 text-white shadow-orange-500/25 active:scale-95 transition-all'
                          }`}
                        >
                          {submitting ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              <span>
                                {isPreBookingMode
                                  ? `Submit Pre-Booking for ${selectedDate} (${formatTo12H(preBookingTime)})`
                                  : selectedSlot
                                  ? `Confirm & Book for ${selectedSlot.displayStart}`
                                  : 'Please Select a Slot'}
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}
      </main>

      {/* Google Maps Picker Modal for Custom Physical Venue */}
      {showVenueMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-orange-600 flex items-center justify-center shadow-inner">
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Select Venue on Google Maps</h3>
                  <p className="text-[11px] text-slate-500">Search landmark, corporate park, or hotel to preview and pick location</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVenueMapModal(false)}
                className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input Bar & Real-time Venue Search */}
            <div className="p-4 border-b border-slate-100 space-y-2 bg-white shrink-0">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="w-4 h-4 text-orange-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={mapSearchInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMapSearchInput(val);
                      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                      if (val.trim().length >= 2) {
                        searchDebounceRef.current = setTimeout(async () => {
                          const res = await searchPlacesLive(val.trim());
                          setMapSearchResults(res);
                        }, 250);
                      } else {
                        setMapSearchResults([]);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleMapSearchSubmit();
                      }
                    }}
                    placeholder="Search any place, gym, restaurant, hospital, street..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleMapSearchSubmit}
                  disabled={isLocating}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition shadow-2xs shrink-0 flex items-center gap-1 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isLocating ? 'Searching...' : 'Search'}</span>
                </button>
              </div>

              {/* Live Search Results Dropdown (if search returned results) */}
              {mapSearchResults.length > 0 && (
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 max-h-48 overflow-y-auto shadow-sm">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5">
                    Found {mapSearchResults.length} matching places:
                  </div>
                  {mapSearchResults.map((res, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSearchResult(res)}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 hover:bg-orange-100/70 hover:text-slate-900 border border-transparent hover:border-orange-200 transition flex items-center justify-between gap-2"
                    >
                      <div className="flex items-start gap-2 truncate">
                        <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                        <div className="truncate">
                          <p className="font-bold text-slate-900 truncate leading-tight"><GentizeText>{res.shortName || res.label}</GentizeText></p>
                          <p className="text-[11px] text-slate-500 font-normal truncate leading-tight mt-0.5">
                            <GentizeText>{res.subtitle || res.label}</GentizeText>
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] bg-white text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full font-bold shrink-0">
                        {res.source || 'Google Maps'}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Confirmed Venue & Landmark Address (Directly Editable) */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <MapPin className="w-3.5 h-3.5 text-orange-600" />
                    <span>Venue Name & Exact Landmark:</span>
                  </div>
                  {(selectedMapVenueName || otherVenue) && (
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                      {isLocating ? 'Pinpointing...' : 'Ready & Editable'}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={selectedMapVenueName || otherVenue || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedMapVenueName(val);
                      setOtherVenue(val);
                      setOtherModeText(val);
                      if (leafletMarkerRef.current) {
                        leafletMarkerRef.current.bindPopup(`<div style="font-family:sans-serif; font-size:12px; font-weight:800; color:#0f172a; padding:3px;">📍 ${val}</div>`).openPopup();
                      }
                    }}
                    placeholder="e.g. SLAM Lifestyle and Fitness Studio, Kodambakkam, Chennai"
                    className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-orange-500 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 shadow-2xs"
                  />

                  {/* Quick Prefix Field for Shop / Building */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <input
                      type="text"
                      id="customBuildingInput"
                      placeholder="Type shop or building name (e.g. SLAM Lifestyle & Fitness)"
                      className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-orange-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = e.target.value.trim();
                          if (val) {
                            const cur = (selectedMapVenueName || otherVenue || '').trim();
                            const finalName = cur ? `${val}, ${cur}` : val;
                            setSelectedMapVenueName(finalName);
                            setOtherVenue(finalName);
                            setOtherModeText(finalName);
                            e.target.value = '';
                            if (leafletMarkerRef.current) {
                              leafletMarkerRef.current.bindPopup(`<div style="font-family:sans-serif; font-size:12px; font-weight:800; color:#0f172a; padding:3px;">📍 ${finalName}</div>`).openPopup();
                            }
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('customBuildingInput');
                        const val = el?.value.trim();
                        if (val) {
                          const cur = (selectedMapVenueName || otherVenue || '').trim();
                          const finalName = cur ? `${val}, ${cur}` : val;
                          setSelectedMapVenueName(finalName);
                          setOtherVenue(finalName);
                          setOtherModeText(finalName);
                          el.value = '';
                          if (leafletMarkerRef.current) {
                            leafletMarkerRef.current.bindPopup(`<div style="font-family:sans-serif; font-size:12px; font-weight:800; color:#0f172a; padding:3px;">📍 ${finalName}</div>`).openPopup();
                          }
                        }
                      }}
                      className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg text-xs shrink-0 shadow-2xs"
                    >
                      + Add Landmark
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Real Interactive Leaflet Map Container */}
            <div className="p-4 flex-1 overflow-hidden bg-slate-50 flex flex-col">
              <div
                ref={mapContainerRef}
                style={{ height: '360px', minHeight: '340px' }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-100 shadow-inner z-0 overflow-hidden relative"
              />
              <p className="text-[11px] text-slate-500 text-center font-medium mt-2">
                💡 Click on any location, building or restaurant on the map to immediately drop a pin and select it.
              </p>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-white shrink-0">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedMapVenueName || otherVenue || 'Chennai')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-slate-600 hover:text-orange-600 flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5 text-orange-600" />
                <span>Open in Google Maps ↗</span>
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowVenueMapModal(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const loc = selectedMapVenueName.trim() || otherVenue.trim() || mapSearchInput.trim() || 'Custom Venue';
                    setOtherVenue(loc);
                    setOtherModeText(loc);
                    setShowVenueMapModal(false);
                  }}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition shadow-2xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Venue & Close</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client Account Sign In / Self-Registration Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-orange-200 flex flex-col animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-orange-100 flex items-center justify-between bg-orange-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-sm shadow-orange-500/20">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Client Portal Account</h3>
                  <p className="text-[11px] text-slate-500">Sign in to view and track your meetings</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAuthModal(false);
                  setAuthError('');
                  setAuthSuccessMsg('');
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mx-5 mt-4 grid grid-cols-2 gap-2" role="tablist" aria-label="Client account">
              {[['register', 'New Register'], ['login', 'Sign In']].map(([tab, label]) => (
                <button key={tab} type="button" role="tab" aria-selected={authModalTab === tab} disabled={authSubmitting}
                  onClick={() => { setAuthModalTab(tab); setAuthError(''); setAuthSuccessMsg(''); }}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition ${authModalTab === tab ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-slate-200 text-slate-600'}`}>{label}</button>
              ))}
            </div>

            {/* Messages */}
            {authError && (
              <div role="alert" className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}
            {authSuccessMsg && (
              <div className="mx-5 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{authSuccessMsg}</span>
              </div>
            )}

            {/* Form */}
            {authModalTab === 'register' ? (
              <form onSubmit={handleAuthRegister} className="p-5 space-y-4">
                <p className="text-xs text-slate-500">Create a new account with your details or Google.</p>
                <label className="block text-xs font-semibold text-slate-700">Full name
                  <input autoComplete="name" required value={authRegName} onChange={e => setAuthRegName(e.target.value)} className="mt-1.5 w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50" />
                </label>
                <label className="block text-xs font-semibold text-slate-700">Email address
                  <input type="email" autoComplete="email" required value={authRegEmail} onChange={e => setAuthRegEmail(e.target.value)} className="mt-1.5 w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50" />
                </label>
                <div className="flex gap-2 items-end">
                  <label className="block text-xs font-semibold text-slate-700 w-28 shrink-0">Country
                    <select aria-label="Country code" value={authRegCountryCode} onChange={e => { setAuthRegCountryCode(e.target.value); setAuthRegRawPhone(''); }} className="mt-1.5 w-full px-2 py-2.5 border border-slate-200 rounded-xl bg-slate-50">
                      {Object.entries(COUNTRY_CONFIG).map(([code,country]) => <option key={code} value={code}>{country.flag} {code}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-slate-700 min-w-0 flex-1">Mobile number
                    <input type="tel" autoComplete="tel-national" inputMode="numeric" required value={authRegRawPhone} onChange={e => setAuthRegRawPhone(e.target.value.replace(/\D/g, '').slice(0, COUNTRY_CONFIG[authRegCountryCode].digits))} className="mt-1.5 w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50" />
                  </label>
                </div>
                <label className="block text-xs font-semibold text-slate-700">Create password
                  <input type="password" autoComplete="new-password" minLength={4} required value={authRegPassword} onChange={e => setAuthRegPassword(e.target.value)} className="mt-1.5 w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50" />
                </label>
                <button type="submit" disabled={authSubmitting} className="w-full py-3 rounded-xl bg-orange-500 text-white text-xs font-bold disabled:opacity-50">{authSubmitting ? 'Creating account…' : 'Create account'}</button>
                <div className="relative my-3 flex items-center justify-center">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider absolute">or</span>
                </div>
                <GoogleSignInButton key="google-register" onCredential={handleGoogleAuthSuccess} disabled={authSubmitting} />
              </form>
            ) : (
            <form key="sign-in" onSubmit={handleAuthLogin} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email / Mobile Number / User ID *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={authIdentifier}
                    onChange={(e) => setAuthIdentifier(e.target.value)}
                    placeholder="Enter your email, phone, or client ID"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showAuthLoginPassword ? 'text' : 'password'}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAuthLoginPassword(!showAuthLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                    tabIndex={-1}
                  >
                    {showAuthLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3 bg-[#ff7f00] hover:bg-[#e67300] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-sm shadow-orange-500/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {authSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Sign In</span>
                )}
              </button>

              <div className="relative my-3 flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider absolute">
                  or
                </span>
              </div>

              <GoogleSignInButton onCredential={handleGoogleAuthSuccess} disabled={authSubmitting} />
            </form>
            )}

            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 font-medium">
                🔒 Your session is saved securely in this browser for seamless real-time access.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Real-time MD Appointment Confirmation Celebration Modal */}
      {mdConfirmedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-emerald-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white text-center relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
              <button
                type="button"
                onClick={() => setMdConfirmedModal(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-3 shadow-inner ring-4 ring-white/30 animate-bounce">
                <ShieldCheck className="w-9 h-9 text-white" />
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-bold tracking-wider uppercase mb-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Live <GentizeText>{mdConfirmedModal.booking_target === 'SALES_LEAD' || bookingTarget === 'SALES_LEAD' ? 'Lead' : 'Gentize'}</GentizeText> Approval
              </span>
              <h3 className="text-xl font-black tracking-tight">Appointment Confirmed!</h3>
              <p className="text-emerald-100 text-xs mt-1">
                <GentizeText>{mdConfirmedModal.booking_target === 'SALES_LEAD' || bookingTarget === 'SALES_LEAD' ? 'The Sales Team Lead' : 'The Gentize'}</GentizeText> has officially approved your appointment.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-100 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <CalendarIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{mdConfirmedModal.date || 'Scheduled Date'}</span>
                  <span className="text-emerald-300">•</span>
                  <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{mdConfirmedModal.display_time || mdConfirmedModal.displayTime || 'Scheduled Time'}</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-emerald-800 font-medium">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Location: <GentizeText>{mdConfirmedModal.location || 'Gentize Cabin (In-Person)'}</GentizeText></span>
                </div>
                {mdConfirmedModal.client_name && (
                  <div className="flex items-center gap-2 text-xs text-emerald-700">
                    <User className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Client: <strong className="font-semibold text-emerald-900"><GentizeText>{mdConfirmedModal.client_name}</GentizeText></strong></span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const id = mdConfirmedModal.id;
                    setMdConfirmedModal(null);
                    handleNavigateToBooking(id);
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-sm shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>View in My Appointments</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMdConfirmedModal(null)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10-Second Undo Banner for Client Clear Data */}
      {clientUndoActive && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="text-xs font-medium">All notifications cleared.</span>
          <button
            type="button"
            onClick={handleClientUndoClear}
            className="px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo ({clientUndoSeconds}s)</span>
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 border-t border-orange-100 bg-white text-center text-xs text-slate-400"><GentizeText>
        Elevate Executive Scheduling • All client requests dispatch directly to Gentize & Admin Desk with instant notification.
      </GentizeText></footer>
      </div>
    </div>
  );
}
