import { GentizeText } from '../common/GentizeText.jsx';
import React, { useMemo } from 'react';
import CalendarDay from './CalendarDay.jsx';
import {
  WEEKDAYS,
  generateCalendarMatrix,
  getEventsForDate,
} from '../../utils/calendarUtils.js';

export default function CalendarGrid({
  year,
  month,
  events,
  selectedDate,
  onSelectDate,
  onOpenCreateForDate,
  onDayClick,
  compact = false,
}) {
  const matrix = useMemo(() => {
    return generateCalendarMatrix(year, month);
  }, [year, month]);

  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-2xs ${compact ? 'p-2.5 sm:p-[15px]' : 'p-3 sm:p-6'}`}>
      {/* Weekday Header: Sun to Sat */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-2 border-b border-slate-100/60 pb-2">
        {WEEKDAYS.map((dayName) => (
          <div
            key={dayName}
            className="py-1 text-center text-xs font-semibold text-slate-400 select-none"
          >
            <GentizeText>{dayName}</GentizeText>
          </div>
        ))}
      </div>

      {/* 6-row by 7-column Calendar Matrix */}
      <div className={`grid grid-cols-7 ${compact ? 'gap-0.5 sm:gap-1' : 'gap-1.5 sm:gap-2'}`}>
        {matrix.map((cell) => {
          const dayEvents = getEventsForDate(events, cell.dateString);
          const isSelected = selectedDate === cell.dateString;

          return (
            <CalendarDay
              key={cell.dateString}
              cell={cell}
              dayEvents={dayEvents}
              isSelected={isSelected}
              onSelectDate={onSelectDate}
              onOpenCreateForDate={onOpenCreateForDate}
              onDayClick={onDayClick}
              compact={compact}
            />
          );
        })}
      </div>
    </div>
  );
}
