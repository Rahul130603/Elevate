import { GentizeText } from '../../components/common/GentizeText.jsx';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  Calendar,
  Clock,
  Search,
  Filter,
  Plus,
  RefreshCw,
  User,
  Building2,
  Mail,
  Phone,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  X,
  FileText,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Edit3,
  Trash2,
  Video
} from 'lucide-react';
import { apiRequest } from '../../api/client.js';

const PURPOSE_OPTIONS = [
  'Product Demo & Architecture Alignment',
  'Pricing & Contract Negotiation',
  'Requirement Discovery & Pain Points',
  'Account Renewal & Upsell',
  'Security Compliance Review',
  'Pilot Rollout & User Training',
  'Executive Partnership Discussion',
  'Follow-up & Objection Handling'
];

const STAGE_OPTIONS = [
  'Scheduled',
  'Completed',
  'Proposal Sent',
  'Contract Pending',
  'Won / Closed',
  'Lost'
];

export function AdminSalesMeetings() {
  const [meetings, setMeetings] = useState([]);
  const [reps, setReps] = useState([]);
  const [stats, setStats] = useState({
    totalMeetings: 0,
    scheduledCount: 0,
    completedCount: 0,
    wonCount: 0,
    pipelineValue: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRep, setSelectedRep] = useState('all');
  const [selectedPurpose, setSelectedPurpose] = useState('all');
  const [selectedStage, setSelectedStage] = useState('all');

  // Modals
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  // Admin notes editor state in Detail Modal
  const [editingAdminNotes, setEditingAdminNotes] = useState(false);
  const [adminNotesText, setAdminNotesText] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Booking Form State
  const [bookForm, setBookForm] = useState({
    meetingTitle: '',
    clientName: '',
    clientCompany: '',
    clientEmail: '',
    clientPhone: '',
    salesUserId: '',
    salesPassword: '',
    meetingDate: new Date().toISOString().split('T')[0],
    startTime: '10:00 AM',
    endTime: '11:00 AM',
    meetingType: 'Online',
    meetingLink: '',
    purpose: PURPOSE_OPTIONS[0],
    customPurpose: '',
    discussionNotes: '',
    dealStage: 'Scheduled',
    dealValue: '',
    actionItems: ''
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // Password visibility in Accounts modal
  const [showPasswords, setShowPasswords] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);

  const fetchMeetings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest('/sales-meetings');
      if (res.success) {
        setMeetings(res.meetings || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      setError(err.message || 'Failed to load sales meetings.');
    } finally {
      setLoading(false);
    }
  };

  const fetchReps = async () => {
    try {
      const res = await apiRequest('/sales-meetings/reps');
      if (res.success && Array.isArray(res.reps)) {
        setReps(res.reps);
        if (res.reps.length > 0 && !bookForm.salesUserId) {
          setBookForm(prev => ({
            ...prev,
            salesUserId: res.reps[0].userId,
            salesPassword: res.reps[0].password
          }));
        }
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchMeetings();
    fetchReps();
  }, []);

  const handleOpenDetail = (meeting) => {
    setSelectedMeeting(meeting);
    setAdminNotesText(meeting.adminNotes || '');
    setEditingAdminNotes(false);
    setIsDetailModalOpen(true);
  };

  const handleSaveAdminNotes = async () => {
    if (!selectedMeeting) return;
    setSavingNotes(true);
    try {
      const res = await apiRequest(`/sales-meetings/${selectedMeeting.id}`, {
        method: 'PUT',
        body: { adminNotes: adminNotesText }
      });
      if (res.success) {
        setSelectedMeeting(res.meeting);
        setMeetings(prev => prev.map(m => m.id === res.meeting.id ? res.meeting : m));
        setEditingAdminNotes(false);
        setSuccessMsg('Admin feedback saved successfully.');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      setError(err.message || 'Failed to update admin notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleUpdateStage = async (meetingId, newStage) => {
    try {
      const res = await apiRequest(`/sales-meetings/${meetingId}`, {
        method: 'PUT',
        body: { dealStage: newStage }
      });
      if (res.success) {
        setMeetings(prev => prev.map(m => m.id === meetingId ? res.meeting : m));
        if (selectedMeeting?.id === meetingId) {
          setSelectedMeeting(res.meeting);
        }
        setSuccessMsg(`Stage updated to "${newStage}"`);
        setTimeout(() => setSuccessMsg(''), 2500);
        fetchMeetings();
      }
    } catch (err) {
      setError(err.message || 'Failed to update stage.');
    }
  };

  const handleDeleteMeeting = async (meetingId) => {
    if (!window.confirm('Are you sure you want to delete this sales meeting record?')) return;
    try {
      const res = await apiRequest(`/sales-meetings/${meetingId}`, { method: 'DELETE' });
      if (res.success) {
        setMeetings(prev => prev.filter(m => m.id !== meetingId));
        if (selectedMeeting?.id === meetingId) setIsDetailModalOpen(false);
        setSuccessMsg('Meeting deleted.');
        setTimeout(() => setSuccessMsg(''), 2500);
        fetchMeetings();
      }
    } catch (err) {
      setError(err.message || 'Failed to delete meeting.');
    }
  };

  const handleBookMeeting = async (e) => {
    e.preventDefault();
    setBookingLoading(true);
    setBookingError('');

    try {
      const finalPurpose = bookForm.purpose === 'Custom' ? bookForm.customPurpose : bookForm.purpose;
      if (!finalPurpose || !finalPurpose.trim()) {
        throw new Error('Please specify the meeting purpose.');
      }
      if (!bookForm.discussionNotes || !bookForm.discussionNotes.trim()) {
        throw new Error('Please enter what will be or was discussed in the meeting.');
      }

      const payload = {
        meetingTitle: bookForm.meetingTitle,
        clientName: bookForm.clientName,
        clientCompany: bookForm.clientCompany,
        clientEmail: bookForm.clientEmail,
        clientPhone: bookForm.clientPhone,
        salesUserId: bookForm.salesUserId,
        salesPassword: bookForm.salesPassword,
        meetingDate: bookForm.meetingDate,
        startTime: bookForm.startTime,
        endTime: bookForm.endTime,
        meetingType: bookForm.meetingType,
        meetingLink: bookForm.meetingLink,
        purpose: finalPurpose,
        discussionNotes: bookForm.discussionNotes,
        dealStage: bookForm.dealStage,
        dealValue: Number(bookForm.dealValue || 0),
        actionItems: bookForm.actionItems
      };

      const res = await apiRequest('/sales-meetings', {
        method: 'POST',
        body: payload
      });

      if (res.success) {
        setIsBookModalOpen(false);
        setSuccessMsg('Sales meeting booked & logged successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
        // Reset form
        setBookForm(prev => ({
          ...prev,
          meetingTitle: '',
          clientName: '',
          clientCompany: '',
          clientEmail: '',
          clientPhone: '',
          discussionNotes: '',
          dealValue: '',
          actionItems: '',
          customPurpose: ''
        }));
        await fetchMeetings();
        await fetchReps();
      }
    } catch (err) {
      setBookingError(err.message || 'Failed to book sales meeting.');
    } finally {
      setBookingLoading(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Filtered Meetings
  const filteredMeetings = useMemo(() => {
    return meetings.filter(m => {
      if (selectedRep !== 'all' && m.salesUserId !== selectedRep) return false;
      if (selectedPurpose !== 'all' && !m.purpose.toLowerCase().includes(selectedPurpose.toLowerCase())) return false;
      if (selectedStage !== 'all' && m.dealStage !== selectedStage) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          (m.meetingTitle || '').toLowerCase().includes(q) ||
          (m.clientName || '').toLowerCase().includes(q) ||
          (m.clientCompany || '').toLowerCase().includes(q) ||
          (m.purpose || '').toLowerCase().includes(q) ||
          (m.discussionNotes || '').toLowerCase().includes(q) ||
          (m.salesRepName || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [meetings, selectedRep, selectedPurpose, selectedStage, searchQuery]);

  const getStageColor = (stage) => {
    switch (stage) {
      case 'Won / Closed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Proposal Sent':
      case 'Contract Pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Scheduled':
        return 'bg-orange-50 text-orange-600 border-orange-200';
      case 'Completed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Lost':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-50 text-orange-600 border border-orange-200">
              <Briefcase className="w-3.5 h-3.5" />
              SALES PORTAL
            </span>
            <span className="text-xs font-semibold text-slate-400">• Dedicated Admin Tracking</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Sales Team Meetings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitor client meetings, track discussion points, inspect booked purposes, and review sales rep deal progress.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setIsAccountsModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200/90 shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap"
            title="View Sales Team User IDs and Passwords"
          >
            <Key className="w-4 h-4 text-orange-500" />
            <span>Sales Team Accounts</span>
          </button>

          <button
            onClick={() => setIsBookModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Book Sales Meeting</span>
          </button>

          <button
            onClick={() => {
              fetchMeetings();
              fetchReps();
            }}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200/90 shadow-2xs transition cursor-pointer shrink-0"
            title="Refresh Meetings"
          >
            <RefreshCw className={`w-4 h-4 text-orange-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span><GentizeText>{successMsg}</GentizeText></span>
        </div>
      )}

      {/* Error Notification Alert */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Key Metric Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Meetings</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{stats.totalMeetings}</span>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">All Time</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Scheduled</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-orange-600">{stats.scheduledCount}</span>
            <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">Upcoming</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-blue-600">{stats.completedCount}</span>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Discussed</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by client name, company, meeting purpose, or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-orange-500 focus:outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sales Rep Filter */}
          <select
            value={selectedRep}
            onChange={(e) => setSelectedRep(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:border-orange-500 focus:outline-none cursor-pointer"
          >
            <option value="all">All Sales Reps</option>
            {reps.map(r => (
              <option key={r.userId} value={r.userId}>
                {r.name} ({r.meetingCount} meetings)
              </option>
            ))}
          </select>

          {/* Purpose Filter */}
          <select
            value={selectedPurpose}
            onChange={(e) => setSelectedPurpose(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:border-orange-500 focus:outline-none cursor-pointer"
          >
            <option value="all">All Purposes</option>
            <option value="Demo">Product Demo</option>
            <option value="Pricing">Pricing & Negotiation</option>
            <option value="Discovery">Discovery & Pain Points</option>
            <option value="Renewal">Renewal & Upsell</option>
            <option value="Security">Security & Compliance</option>
            <option value="Pilot">Pilot & Training</option>
          </select>

          {/* Deal Stage Filter */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:border-orange-500 focus:outline-none cursor-pointer"
          >
            <option value="all">All Stages</option>
            {STAGE_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-800">{filteredMeetings.length}</strong> of {meetings.length} sales meetings
          </span>
          {(selectedRep !== 'all' || selectedPurpose !== 'all' || selectedStage !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedRep('all');
                setSelectedPurpose('all');
                setSelectedStage('all');
                setSearchQuery('');
              }}
              className="text-orange-600 hover:text-orange-700 font-bold cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Meetings Grid / List */}
      {loading && meetings.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
          <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Loading sales meetings...</p>
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-3 p-6">
          <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto shadow-2xs">
            <Briefcase className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Sales Meetings Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No meetings matched your current filters. Try changing your search query or book a new sales meeting.
          </p>
          <button
            onClick={() => setIsBookModalOpen(true)}
            className="mt-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Book Sales Meeting
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredMeetings.map((meeting) => (
            <div
              key={meeting.id}
              className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all p-5 sm:p-6 flex flex-col justify-between space-y-4"
            >
              {/* Card Top: Purpose & Stage */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  {/* PURPOSE BADGE: Prominently answers "ethukkuga meeting book pannaga" */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200/90 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span>Purpose: <GentizeText>{meeting.purpose}</GentizeText></span>
                  </div>

                  {/* Deal Stage Badge */}
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${getStageColor(meeting.dealStage)}`}>
                    {meeting.dealStage}
                  </span>
                </div>

                {/* Title & Company */}
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-snug">
                    <GentizeText>{meeting.meetingTitle}</GentizeText>
                  </h2>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mt-1">
                    <Building2 className="w-3.5 h-3.5 text-orange-500" />
                    <span>{meeting.clientCompany}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500"><GentizeText>{meeting.clientName}</GentizeText></span>
                  </div>
                </div>

                {/* Sales Rep Attribution & Time */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                      <GentizeText>{meeting.salesRepName ? meeting.salesRepName.charAt(0) : 'S'}</GentizeText>
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-slate-800 truncate"><GentizeText>{meeting.salesRepName}</GentizeText></p>
                      <p className="text-[11px] text-slate-400 truncate">{meeting.salesUserId}</p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center text-right">
                    <span className="font-bold text-slate-800 flex items-center justify-end gap-1">
                      <Calendar className="w-3 h-3 text-orange-500" />
                      {meeting.meetingDate}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {meeting.startTime} - {meeting.endTime}
                    </span>
                  </div>
                </div>

                {/* DISCUSSION SUMMARY: Answers "sales team ethula discuss panni irukom" */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <MessageSquare className="w-3.5 h-3.5 text-orange-500" />
                    <span>Discussion Summary:</span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed bg-orange-50/30 p-3 rounded-xl border border-orange-100/60">
                    {meeting.discussionNotes}
                  </p>
                </div>

                {/* Next Action items / Meeting Link if available */}
                {meeting.meetingLink ? (
                  <div className="flex items-center justify-end text-xs pt-1">
                    <a
                      href={meeting.meetingLink.startsWith('http') ? meeting.meetingLink : `https://${meeting.meetingLink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1.5 text-[11px] shadow-sm shadow-emerald-600/20 transition cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Join Meeting</span>
                      <ExternalLink className="w-3 h-3 opacity-75" />
                    </a>
                  </div>
                ) : null}
              </div>

              {/* Card Footer: Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleOpenDetail(meeting)}
                  className="flex-1 py-2 px-3 bg-orange-50 hover:bg-orange-500 text-orange-600 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Purpose & Notes</span>
                </button>

                <select
                  value={meeting.dealStage}
                  onChange={(e) => handleUpdateStage(meeting.id, e.target.value)}
                  className="py-2 px-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs focus:outline-none cursor-pointer"
                  title="Update Deal Stage"
                >
                  {STAGE_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <button
                  onClick={() => handleDeleteMeeting(meeting.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                  title="Delete Meeting"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. INSPECT PURPOSE & DISCUSSION DETAIL MODAL */}
      {/* ========================================================================= */}
      {isDetailModalOpen && selectedMeeting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                  Admin Purpose & Discussion Inspector
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
                  <GentizeText>{selectedMeeting.meetingTitle}</GentizeText>
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Client: <strong className="text-slate-700"><GentizeText>{selectedMeeting.clientName}</GentizeText></strong> at{' '}
                  <strong className="text-slate-700">{selectedMeeting.clientCompany}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* LIVE JOIN MEETING BANNER */}
            {selectedMeeting.meetingLink && (
              <div className="p-4 bg-emerald-50 border border-emerald-200/90 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                    <Video className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-bold text-emerald-950 block">Live Meeting Session (Google Meet / Zoom)</span>
                    <span className="text-[11px] text-emerald-700 truncate block max-w-md">{selectedMeeting.meetingLink}</span>
                  </div>
                </div>
                <a
                  href={selectedMeeting.meetingLink.startsWith('http') ? selectedMeeting.meetingLink : `https://${selectedMeeting.meetingLink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 shrink-0 transition cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  <span>Join Meeting</span>
                  <ExternalLink className="w-3 h-3 opacity-75" />
                </a>
              </div>
            )}

            {/* 1. FIRST: CLIENT DESCRIPTION & CONTACT */}
            <div className="p-4 rounded-2xl bg-orange-50/80 border border-orange-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-700">
                  <User className="w-4 h-4 text-orange-500" />
                  <span>1. Client Description & Booking Request</span>
                </div>
                <span className="text-[10px] font-bold text-orange-600 bg-white px-2 py-0.5 rounded-full border border-orange-200">
                  Client Inbound
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs p-3 bg-white/90 rounded-xl border border-orange-200/60">
                <div><span className="font-bold text-slate-800">Client:</span> <p className="text-slate-600"><GentizeText>{selectedMeeting.clientName}</GentizeText></p></div>
                <div><span className="font-bold text-slate-800">Company:</span> <p className="text-slate-600">{selectedMeeting.clientCompany}</p></div>
                <div><span className="font-bold text-slate-800">Email:</span> <p className="text-slate-600 truncate">{selectedMeeting.clientEmail || 'N/A'}</p></div>
                <div><span className="font-bold text-slate-800">Phone:</span> <p className="text-slate-600">{selectedMeeting.clientPhone || 'N/A'}</p></div>
              </div>
              <div className="pt-1">
                <p className="text-xs font-bold text-slate-900 mb-1">Client Agenda & Purpose:</p>
                <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-orange-200/60 leading-relaxed whitespace-pre-wrap">
                  <GentizeText>{selectedMeeting.clientDescription || selectedMeeting.discussionNotes || selectedMeeting.purpose}</GentizeText>
                </p>
              </div>
            </div>

            {/* KEY METRICS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block text-[11px]">Host / Sales Lead</span>
                <span className="font-bold text-slate-800"><GentizeText>{selectedMeeting.salesRepName}</GentizeText></span>
                <span className="text-[10px] text-slate-500 block truncate">{selectedMeeting.salesUserId}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block text-[11px]">Date & Time</span>
                <span className="font-bold text-slate-800">{selectedMeeting.meetingDate}</span>
                <span className="text-[10px] text-slate-500 block">{selectedMeeting.startTime}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block text-[11px]">Current Stage</span>
                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-md font-bold text-[10px] border ${getStageColor(selectedMeeting.dealStage)}`}>
                  {selectedMeeting.dealStage}
                </span>
              </div>
            </div>

            {/* 2. SECOND: SALES TEAM LEAD SUMMARY & DISCUSSION NOTES */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <MessageSquare className="w-4 h-4 text-orange-500" />
                <span>2. Sales Team Lead Summary & Discussion Notes</span>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap shadow-2xs">
                {selectedMeeting.leadSummary || selectedMeeting.discussionNotes || 'No sales summary recorded yet.'}
              </div>
            </div>

            {/* ACTION ITEMS / NEXT STEPS */}
            {selectedMeeting.actionItems && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Agreed Action Items & Next Follow-up</span>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-900 font-medium">
                  {selectedMeeting.actionItems}
                </div>
              </div>
            )}

            {/* CLIENT CONTACT INFORMATION */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Client Contact Details</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-700">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span><GentizeText>{selectedMeeting.clientName}</GentizeText></span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedMeeting.clientEmail || 'No email provided'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedMeeting.clientPhone || 'No phone provided'}</span>
                </div>
              </div>
            </div>

            {/* ADMIN NOTES & GUIDANCE SECTION */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-orange-500" />
                  <span>Admin Feedback & Management Notes</span>
                </span>
                {!editingAdminNotes && (
                  <button
                    onClick={() => setEditingAdminNotes(true)}
                    className="text-xs text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit Feedback</span>
                  </button>
                )}
              </div>

              {editingAdminNotes ? (
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={adminNotesText}
                    onChange={(e) => setAdminNotesText(e.target.value)}
                    placeholder="Enter admin feedback, strategic advice for sales rep, or approval notes..."
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-orange-500 bg-white"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setAdminNotesText(selectedMeeting.adminNotes || '');
                        setEditingAdminNotes(false);
                      }}
                      className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAdminNotes}
                      disabled={savingNotes}
                      className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition disabled:opacity-60 cursor-pointer"
                    >
                      {savingNotes ? 'Saving...' : 'Save Feedback'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                  {selectedMeeting.adminNotes || 'No specific admin feedback entered yet. Click "Edit Feedback" to leave guidance for the sales team.'}
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BOOK SALES MEETING MODAL (With Sales Credentials Verification) */}
      {/* ========================================================================= */}
      {isBookModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                  New Meeting Entry
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-2">
                  Book & Record Sales Team Meeting
                </h2>
                <p className="text-xs text-slate-500">
                  Fill in the client meeting purpose, agenda, discussion notes, and sales rep credentials.
                </p>
              </div>
              <button
                onClick={() => setIsBookModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bookingError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}

            <form onSubmit={handleBookMeeting} className="space-y-4">
              {/* Sales Rep Authentication Credentials Box */}
              <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-700 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-orange-600" />
                    <span>Sales Team User Authentication</span>
                  </span>
                  <span className="text-[11px] text-orange-600 font-semibold">User ID & Password</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Sales Rep Account *
                    </label>
                    <select
                      value={bookForm.salesUserId}
                      onChange={(e) => {
                        const uid = e.target.value;
                        const matchingRep = reps.find(r => r.userId === uid);
                        setBookForm(prev => ({
                          ...prev,
                          salesUserId: uid,
                          salesPassword: matchingRep?.password || prev.salesPassword
                        }));
                      }}
                      required
                      className="w-full p-2.5 rounded-xl border border-orange-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
                    >
                      {reps.map(r => (
                        <option key={r.userId} value={r.userId}>
                          {r.name} ({r.userId})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={bookForm.salesPassword}
                      onChange={(e) => setBookForm(prev => ({ ...prev, salesPassword: e.target.value }))}
                      placeholder="Enter sales rep password"
                      required
                      className="w-full p-2.5 rounded-xl border border-orange-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Meeting Basic Details */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Meeting Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Enterprise Product Pitch & Cloud Architecture"
                    value={bookForm.meetingTitle}
                    onChange={(e) => setBookForm(prev => ({ ...prev, meetingTitle: e.target.value }))}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Client Company Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TechCorp Global"
                      value={bookForm.clientCompany}
                      onChange={(e) => setBookForm(prev => ({ ...prev, clientCompany: e.target.value }))}
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Client Contact Person *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rajesh Kumar (VP Technology)"
                      value={bookForm.clientName}
                      onChange={(e) => setBookForm(prev => ({ ...prev, clientName: e.target.value }))}
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Client Email
                    </label>
                    <input
                      type="email"
                      placeholder="rajesh@techcorp.io"
                      value={bookForm.clientEmail}
                      onChange={(e) => setBookForm(prev => ({ ...prev, clientEmail: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Client Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 234-8901"
                      value={bookForm.clientPhone}
                      onChange={(e) => setBookForm(prev => ({ ...prev, clientPhone: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Meeting Date *
                  </label>
                  <input
                    type="date"
                    value={bookForm.meetingDate}
                    onChange={(e) => setBookForm(prev => ({ ...prev, meetingDate: e.target.value }))}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="text"
                    placeholder="10:00 AM"
                    value={bookForm.startTime}
                    onChange={(e) => setBookForm(prev => ({ ...prev, startTime: e.target.value }))}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="text"
                    placeholder="11:00 AM"
                    value={bookForm.endTime}
                    onChange={(e) => setBookForm(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* PURPOSE SELECTION ("ethukkuga meeting book pannaga") */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Meeting Purpose (Why this meeting is booked) *
                </label>
                <select
                  value={bookForm.purpose}
                  onChange={(e) => setBookForm(prev => ({ ...prev, purpose: e.target.value }))}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500 cursor-pointer"
                >
                  {PURPOSE_OPTIONS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                  <option value="Custom">Other Custom Purpose...</option>
                </select>

                {bookForm.purpose === 'Custom' && (
                  <input
                    type="text"
                    placeholder="Describe custom purpose..."
                    value={bookForm.customPurpose}
                    onChange={(e) => setBookForm(prev => ({ ...prev, customPurpose: e.target.value }))}
                    className="w-full mt-2 p-2.5 rounded-xl border border-orange-200 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                )}
              </div>

              {/* DISCUSSION NOTES ("sales team ethula discuss panni irukom") */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  What will be / was discussed in this meeting? *
                </label>
                <textarea
                  rows={4}
                  placeholder="Detail the discussion topics, client requirements, demo flow, pricing questions, objections handled, or customer feedback..."
                  value={bookForm.discussionNotes}
                  onChange={(e) => setBookForm(prev => ({ ...prev, discussionNotes: e.target.value }))}
                  required
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs leading-relaxed text-slate-800 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Deal Stage */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deal Stage
                </label>
                <select
                  value={bookForm.dealStage}
                  onChange={(e) => setBookForm(prev => ({ ...prev, dealStage: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500 cursor-pointer"
                >
                  {STAGE_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Agreed Action Items / Next Follow-up
                </label>
                <input
                  type="text"
                  placeholder="e.g. Send revised enterprise contract draft by Monday noon"
                  value={bookForm.actionItems}
                  onChange={(e) => setBookForm(prev => ({ ...prev, actionItems: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2.5 text-xs text-slate-600 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-60 cursor-pointer"
                >
                  {bookingLoading ? 'Saving Meeting...' : 'Book & Save Meeting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SALES TEAM ACCOUNTS & PASSWORDS DRAWER / MODAL */}
      {/* ========================================================================= */}
      {isAccountsModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                  Credentials Directory
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-2">
                  Sales Team Accounts & Passwords
                </h2>
                <p className="text-xs text-slate-500">
                  Admin reference for sales team logins to book and log client meetings.
                </p>
              </div>
              <button
                onClick={() => setIsAccountsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {reps.map((r) => {
                const isPasswordShown = Boolean(showPasswords[r.id]);
                const isCopied = copiedKey === r.id;

                return (
                  <div
                    key={r.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm"><GentizeText>{r.name}</GentizeText></span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-100/70 px-2 py-0.5 rounded-md">
                          <GentizeText>{r.role}</GentizeText>
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-mono flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{r.userId}</span>
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                        <span>Meetings: <strong className="text-slate-700">{r.meetingCount}</strong></span>
                        <span>•</span>
                        <span>Pipeline: <strong className="text-slate-700">${Number(r.pipelineValue || 0).toLocaleString()}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 self-start sm:self-auto">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Password</span>
                        <span className="font-mono text-xs font-bold text-slate-800">
                          {isPasswordShown ? r.password : '••••••••'}
                        </span>
                      </div>

                      <button
                        onClick={() => setShowPasswords(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                        className="p-1 hover:text-slate-700 text-slate-400 cursor-pointer"
                        title={isPasswordShown ? 'Hide Password' : 'Show Password'}
                      >
                        {isPasswordShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => copyToClipboard(`User ID: ${r.userId}\nPassword: ${r.password}`, r.id)}
                        className="p-1 hover:text-orange-600 text-slate-400 cursor-pointer"
                        title="Copy credentials"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3.5 rounded-2xl bg-orange-50 border border-orange-100 text-xs text-slate-600 leading-relaxed">
              <strong>Tip for Admin:</strong> Share these credentials with respective sales reps so they can log into the booking modal, select their account, and submit real-time meeting notes.
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsAccountsModalOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminSalesMeetings;
