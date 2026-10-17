import { GentizeText } from '../common/GentizeText.jsx';
import React, { useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Phone,
  Mail,
  MapPin,
  Video,
  Navigation,
  ExternalLink,
  Edit2,
  Trash2,
  User,
  Plus,
} from 'lucide-react';
import {
  formatDateRangeDisplay,
  formatTimeDisplay,
  EVENT_COLORS,
} from '../../utils/calendarUtils.js';

export default function EventDetailsModal({
  isOpen,
  event,
  onClose,
  onEdit,
  onDelete,
  onAddEvent,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !event) return null;

  const isOnline = event.eventType === 'Online';
  const colorConfig = EVENT_COLORS[event.eventType] || EVENT_COLORS.Other;
  const sDate = event.startDate || event.date;
  const eDate = event.endDate || sDate;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${colorConfig.badge} border`}
              >
                {isOnline ? 'Online Event' : 'Offline Event'}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium capitalize ${
                  event.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : event.status === 'cancelled'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}
              >
                {event.status || 'upcoming'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight"><GentizeText>{event.title}</GentizeText></h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-6 space-y-5 flex-1">
          {/* Schedule Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100/60 text-blue-700 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Date</span>
                <span className="text-sm font-semibold text-slate-800">
                  {formatDateRangeDisplay(sDate, eDate, true)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100/60 text-blue-700 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Time</span>
                <span className="text-sm font-semibold text-slate-800">
                  {formatTimeDisplay(event.startTime)} - {formatTimeDisplay(event.endTime)}
                </span>
              </div>
            </div>
          </div>

          {/* Event Organizer */}
          {event.organizerName && (
            <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200/60">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Event Organizer</span>
                <span className="text-sm font-semibold text-slate-800"><GentizeText>{event.organizerName}</GentizeText></span>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Description</h3>
              <p className="text-sm text-slate-700 leading-relaxed bg-white p-3 rounded-xl border border-slate-100">
                <GentizeText>{event.description}</GentizeText>
              </p>
            </div>
          )}

          {/* Contact Details */}
          {(event.phone || event.email) && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Contact Details</h3>
              <div className="space-y-2 text-sm">
                {event.phone && (
                  <div className="flex items-center gap-2.5 text-slate-700">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <a href={`tel:${event.phone}`} className="hover:text-blue-600 transition-colors font-medium">
                      {event.phone}
                    </a>
                  </div>
                )}
                {event.email && (
                  <div className="flex items-center gap-2.5 text-slate-700">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <a href={`mailto:${event.email}`} className="hover:text-blue-600 transition-colors font-medium underline">
                      {event.email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ONLINE EVENT SPECIFIC UI */}
          {isOnline && event.meetingLink && (
            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                Online Meeting
              </h3>
              <div className="p-3.5 bg-sky-50/60 border border-sky-100 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                    <Video className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-medium text-slate-400 block">Google Meet Link</span>
                    <span className="text-xs font-medium text-slate-700 truncate block">
                      {event.meetingLink}
                    </span>
                  </div>
                </div>

                <a
                  href={event.meetingLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-all shrink-0 cursor-pointer"
                >
                  <span>Join Google Meet</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* OFFLINE EVENT SPECIFIC UI */}
          {!isOnline && (
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Location Details
              </h3>

              {event.address && (
                <div className="flex items-start gap-2.5 text-sm">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-medium text-slate-400 block">Address</span>
                    <span className="text-slate-800 font-medium">{event.address}</span>
                  </div>
                </div>
              )}

              {event.googleMapsLink && (
                <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Navigation className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] font-medium text-slate-400 block">Google Maps Location</span>
                      <span className="text-xs font-medium text-slate-700 truncate block">
                        {event.googleMapsLink}
                      </span>
                    </div>
                  </div>

                  <a
                    href={event.googleMapsLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-all shrink-0 cursor-pointer"
                  >
                    <span>Open in Google Maps</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2.5">
          {onDelete ? (
            <button
              onClick={() => onDelete(event)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {onAddEvent && (
              <button
                onClick={() => onAddEvent(sDate)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Another Event</span>
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(event)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-sm shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition-all shadow-2xs hover:bg-slate-50 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
