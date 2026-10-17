import { GentizeText } from '../common/GentizeText.jsx';
import React from 'react';
import {
  Calendar,
  Clock,
  Phone,
  Mail,
  MapPin,
  Video,
  Navigation,
  ExternalLink,
} from 'lucide-react';
import {
  formatDateRangeDisplay,
  formatTimeDisplay,
  EVENT_COLORS,
} from '../../utils/calendarUtils.js';

export default function EventCard({
  event,
  onView,
  onEdit,
  onDelete,
}) {
  const isOnline = event.eventType === 'Online';
  const color = EVENT_COLORS[event.eventType] || EVENT_COLORS.Other;
  const sDate = event.startDate || event.date;
  const eDate = event.endDate || sDate;
  const isMultiDay = sDate && eDate && sDate !== eDate;

  return (
    <div className="group bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between gap-3.5">
      {/* Top row: Title and Online/Offline Badge */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <h3
            onClick={() => onView(event)}
            className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors cursor-pointer line-clamp-1"
            title={event.title}
          >
            <GentizeText>{event.title}</GentizeText>
          </h3>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${color.badge} border`}
            >
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Organizer Name */}
        {event.organizerName && (
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Organized by <span className="text-slate-700 font-semibold"><GentizeText>{event.organizerName}</GentizeText></span>
          </p>
        )}

        {/* Date and Time Line with Multi-Day Handling */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className={isMultiDay ? 'font-semibold text-slate-800' : ''}>
              {formatDateRangeDisplay(sDate, eDate)}
            </span>
          </div>

          <span className="text-slate-300">·</span>

          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              {formatTimeDisplay(event.startTime)} - {formatTimeDisplay(event.endTime)}
            </span>
          </div>
        </div>

        {/* Description Snippet if present */}
        {event.description && (
          <p className="mt-2 text-xs text-slate-500 line-clamp-2 leading-relaxed">
            <GentizeText>{event.description}</GentizeText>
          </p>
        )}
      </div>

      {/* Middle: Contact or Address Details */}
      {(event.phone || event.email || (!isOnline && event.address)) && (
        <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
          {!isOnline && event.address && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="truncate max-w-[200px]" title={event.address}>
                {event.address}
              </span>
            </div>
          )}

          {event.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate max-w-[140px]">{event.phone}</span>
            </div>
          )}

          {event.email && (
            <div className="flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate max-w-[160px]">{event.email}</span>
            </div>
          )}
        </div>
      )}

      {/* Bottom Actions Row */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        {/* Quick Launch Link for Google Meet or Google Maps */}
        <div className="flex items-center gap-1 text-[11px] font-medium">
          {isOnline && event.meetingLink && (
            <a
              href={event.meetingLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-800 font-semibold underline"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Meet</span>
            </a>
          )}

          {!isOnline && event.googleMapsLink && (
            <a
              href={event.googleMapsLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-semibold underline"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Map</span>
            </a>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onView(event)}
            className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
          >
            View
          </button>
          <button
            onClick={() => onEdit(event)}
            className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(event)}
            className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
