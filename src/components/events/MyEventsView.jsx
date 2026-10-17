import { GentizeText } from '../common/GentizeText.jsx';
import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Video,
  Search,
  Plus,
  MoreHorizontal,
  Menu,
  Trash2,
} from 'lucide-react';
import {
  formatDateDisplay,
  formatDateRangeDisplay,
  formatTimeDisplay,
  isEventPast,
} from '../../utils/calendarUtils.js';

export default function MyEventsView({
  events = [],
  onAddEvent,
  onViewEvent,
  onEditEvent,
  onDeleteEvent,
  onOpenMobileMenu,
  hideHeader = false,
  onClose,
}) {
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'upcoming' | 'past'
  const [searchTerm, setSearchTerm] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState(null);

  const filteredEvents = events.filter((ev) => {
    const isPast = isEventPast(ev);
    if (filterTab === 'upcoming' && isPast) return false;
    if (filterTab === 'past' && !isPast) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const match =
        (ev.title && ev.title.toLowerCase().includes(q)) ||
        (ev.organizerName && ev.organizerName.toLowerCase().includes(q)) ||
        (ev.description && ev.description.toLowerCase().includes(q)) ||
        (ev.address && ev.address.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      {!hideHeader ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                My Events
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                View and manage all your events
              </p>
            </div>
          </div>

          {/* + Add Event */}
          {onAddEvent && (
            <button
              onClick={onAddEvent}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-sm shadow-orange-500/20 active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Event</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              All Event Details
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Comprehensive list of all scheduled events, timings, locations, and agenda
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onAddEvent && (
              <button
                onClick={onAddEvent}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Event</span>
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
              >
                Hide Details
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'past', label: 'Past' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                filterTab === tab.id
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
              }`}
            >
              <GentizeText>{tab.label}</GentizeText>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search events..."
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-white border border-slate-200/80 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-200">
            <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No events found</h3>
            <p className="text-xs text-slate-400 mt-0.5 mb-4">
              {searchTerm
                ? 'Try adjusting your search query'
                : 'No events match the selected filter'}
            </p>
            <button
              onClick={onAddEvent}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Event</span>
            </button>
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const isPast = isEventPast(ev);
            const isOnline = ev.eventType === 'Online';
            const locationText = isOnline
              ? ev.meetingLink
                ? 'Google Meet'
                : 'Online'
              : ev.address || 'Office';

            const sDate = ev.startDate || ev.date;
            const eDate = ev.endDate || sDate;

            return (
              <div
                key={ev.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Left group */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  {/* Calendar Icon Box */}
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      isPast
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-orange-50 text-orange-500 border border-orange-100'
                    }`}
                  >
                    <CalendarIcon className="w-5 h-5" />
                  </div>

                  {/* Title and Details */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3
                        onClick={() => onViewEvent && onViewEvent(ev)}
                        className="text-sm sm:text-base font-bold text-slate-900 hover:text-orange-600 transition-colors cursor-pointer truncate"
                      >
                        <GentizeText>{ev.title}</GentizeText>
                      </h3>

                      {/* Status badge */}
                      <span
                        className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${
                          isPast
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {isPast ? 'Past' : 'Upcoming'}
                      </span>
                    </div>

                    {/* Metadata line */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-medium">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDateRangeDisplay(sDate, eDate)}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {formatTimeDisplay(ev.startTime)} –{' '}
                          {formatTimeDisplay(ev.endTime)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isOnline ? (
                          <Video className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span className="truncate max-w-[180px]">
                          {locationText}
                        </span>
                      </div>
                    </div>

                    {/* Optional description snippet */}
                    {ev.description && (
                      <p className="text-xs text-slate-500 font-normal mt-1.5 line-clamp-2 max-w-xl">
                        <GentizeText>{ev.description}</GentizeText>
                      </p>
                    )}

                    {/* Organizer info */}
                    {ev.organizerName && (
                      <p className="text-[11px] text-slate-400 font-medium mt-1">
                        Organizer: <span className="text-slate-600 font-semibold"><GentizeText>{ev.organizerName}</GentizeText></span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Actions: View | Edit | ··· */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => onViewEvent && onViewEvent(ev)}
                    className="px-3 py-1 text-xs font-semibold text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                  >
                    View
                  </button>

                  {onEditEvent && (
                    <button
                      onClick={() => onEditEvent(ev)}
                      className="px-3 py-1 text-xs font-semibold text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                  )}

                  {/* More dropdown */}
                  {onDeleteEvent && (
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenDropdownId(
                            openDropdownId === ev.id ? null : ev.id
                          )
                        }
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="More actions"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {openDropdownId === ev.id && (
                        <div className="absolute right-0 mt-1 w-32 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-20 animate-fadeIn">
                          <button
                            onClick={() => {
                              setOpenDropdownId(null);
                              if (onDeleteEvent) onDeleteEvent(ev);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
