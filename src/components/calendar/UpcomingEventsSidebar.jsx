import { GentizeText } from '../common/GentizeText.jsx';
import React from 'react';
import { ChevronRight, MapPin, Video, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { formatTimeDisplay, MONTH_NAMES, isEventPast } from '../../utils/calendarUtils.js';

export default function UpcomingEventsSidebar({
  events = [],
  onViewEvent,
  onViewAll,
  onAddEvent,
  isExpanded = false,
}) {
  // Filter for upcoming events, sorted chronologically
  const upcomingList = events
    .filter((e) => !isEventPast(e))
    .sort((a, b) => {
      const aStart = a.startDate || a.date || '';
      const bStart = b.startDate || b.date || '';
      if (aStart !== bStart) return aStart.localeCompare(bStart);
      return (a.startTime || '').localeCompare(b.startTime || '');
    })
    .slice(0, 5);

  const formatBadgeDate = (dateStr) => {
    if (!dateStr) return { day: '--', month: '---' };
    const parts = dateStr.split('-');
    if (parts.length !== 3) return { day: '--', month: '---' };
    const day = parseInt(parts[2], 10);
    const m = parseInt(parts[1], 10);
    const month = MONTH_NAMES[m - 1] ? MONTH_NAMES[m - 1].slice(0, 3).toUpperCase() : '---';
    return { day: day < 10 ? `0${day}` : day, month };
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-2xs flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Upcoming Events
        </h2>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors cursor-pointer"
          >
            {isExpanded ? 'Hide Details' : 'View All'}
          </button>
        )}
      </div>

      {/* Events List */}
      <div className="flex flex-col gap-3">
        {upcomingList.length === 0 ? (
          <div className="text-center py-8 px-2 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
            <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">No upcoming events</p>
            <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
              Schedule your next meeting or event
            </p>
            {onAddEvent && (
              <button
                onClick={() => onAddEvent()}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Event</span>
              </button>
            )}
          </div>
        ) : (
          upcomingList.map((ev) => {
            const { day, month } = formatBadgeDate(ev.startDate || ev.date);
            const isOnline = ev.eventType === 'Online';
            const locationText = isOnline
              ? ev.meetingLink
                ? 'Google Meet'
                : 'Online Meeting'
              : ev.address || 'Office Location';

            return (
              <div
                key={ev.id}
                onClick={() => onViewEvent && onViewEvent(ev)}
                className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-all cursor-pointer border border-transparent hover:border-slate-100"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Orange Date Badge */}
                  <div className="w-12 h-12 rounded-xl border border-orange-200/90 bg-orange-50/50 flex flex-col items-center justify-center shrink-0">
                    <span className="text-sm font-extrabold text-orange-600 leading-none">
                      {day}
                    </span>
                    <span className="text-[10px] font-bold text-orange-500 tracking-wider uppercase leading-none mt-1">
                      {month}
                    </span>
                  </div>

                  {/* Title & Metadata */}
                  <div className="min-w-0 text-left">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-orange-600 transition-colors truncate">
                      <GentizeText>{ev.title}</GentizeText>
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {formatTimeDisplay(ev.startTime)} – {formatTimeDisplay(ev.endTime)}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                      {isOnline ? (
                        <Video className="w-3 h-3 text-slate-400 shrink-0" />
                      ) : (
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      )}
                      <span className="truncate max-w-[160px]">{locationText}</span>
                    </div>
                  </div>
                </div>

                {/* Right Arrow Chevron */}
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0 ml-2" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
