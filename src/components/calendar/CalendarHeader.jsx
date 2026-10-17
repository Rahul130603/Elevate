import { GentizeText } from '../common/GentizeText.jsx';
import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Menu,
} from 'lucide-react';
import { MONTH_NAMES } from '../../utils/calendarUtils.js';

export default function CalendarHeader({
  year,
  month,
  onPrevMonth,
  onNextMonth,
  onToday,
  onAddEvent,
  onOpenMobileMenu,
  serverOnline = true,
}) {
  const currentMonthName = MONTH_NAMES[month];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5 sm:mb-4">
      {/* Page Title & Subtitle */}
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-none">
              Calendar
            </h1>
            {!serverOnline && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 leading-tight">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Server Offline
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Manage your events and schedules
          </p>
        </div>
      </div>

      {/* Right Controls: Month Switcher, Today, + Add Event */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Month Navigator */}
        <div className="h-9 inline-flex items-center bg-white border border-slate-200/80 rounded-xl px-1 shadow-2xs">
          <button
            onClick={onPrevMonth}
            aria-label="Previous month"
            title="Previous month"
            className="w-7 h-7 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center justify-center cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 px-2.5 select-none">
            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-800 whitespace-nowrap">
              <GentizeText>{currentMonthName}</GentizeText> {year}
            </span>
          </div>

          <button
            onClick={onNextMonth}
            aria-label="Next month"
            title="Next month"
            className="w-7 h-7 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center justify-center cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Today Button */}
        <button
          onClick={onToday}
          className="h-9 px-3.5 inline-flex items-center justify-center text-xs font-semibold text-slate-700 bg-white border border-slate-200/80 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all shadow-2xs active:scale-95 cursor-pointer"
        >
          Today
        </button>

        {/* + Add Event Button */}
        {onAddEvent && (
          <button
            onClick={onAddEvent}
            className="h-9 px-3.5 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-sm shadow-orange-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Event</span>
          </button>
        )}
      </div>
    </div>
  );
}

