import { GentizeText } from '../common/GentizeText.jsx';
import React, { useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Plus,
  Video,
  MapPin,
  ChevronRight,
  Eye,
  Edit2,
  Trash2,
} from 'lucide-react';
import {
  formatDateDisplay,
  formatTimeDisplay,
  EVENT_COLORS,
} from '../../utils/calendarUtils.js';

export default function DayEventsModal({
  isOpen,
  date,
  events = [],
  onClose,
  onViewEvent,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Calendar className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-semibold text-orange-600 uppercase tracking-wider">
                Events on this Day
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-700">
                {events.length} {events.length === 1 ? 'Event' : 'Events'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              {formatDateDisplay(date)}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Event List */}
        <div className="overflow-y-auto p-5 space-y-3 flex-1">
          {events.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No events scheduled for this date.
            </div>
          ) : (
            events.map((ev) => {
              const isOnline = ev.eventType === 'Online';
              const colorConfig = EVENT_COLORS[ev.eventType] || EVENT_COLORS.Other;

              return (
                <div
                  key={ev.id}
                  className="p-4 rounded-xl border border-slate-200/80 hover:border-orange-200 bg-white hover:bg-orange-50/20 transition-all group shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => onViewEvent(ev)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${colorConfig.badge} border`}
                        >
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium capitalize ${
                            ev.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : ev.status === 'cancelled'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {ev.status || 'upcoming'}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                        <GentizeText>{ev.title}</GentizeText>
                      </h3>

                      <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-medium text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {formatTimeDisplay(ev.startTime)} - {formatTimeDisplay(ev.endTime)}
                        </span>
                        {ev.organizerName && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[140px] text-slate-500">
                              <GentizeText>{ev.organizerName}</GentizeText>
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <button
                        onClick={() => onViewEvent(ev)}
                        title="View Details"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {onEditEvent && (
                        <button
                          onClick={() => onEditEvent(ev)}
                          title="Edit Event"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {onDeleteEvent && (
                        <button
                          onClick={() => onDeleteEvent(ev)}
                          title="Delete Event"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition-all shadow-2xs hover:bg-slate-50 cursor-pointer"
          >
            Close
          </button>

          {onAddEvent && (
            <button
              onClick={() => onAddEvent(date)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-sm shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Event</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
