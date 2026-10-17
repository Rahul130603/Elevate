import React from 'react';
import { isToday } from '../../utils/calendarUtils.js';

export default function CalendarDay({
  cell,
  dayEvents,
  isSelected,
  onSelectDate,
  onOpenCreateForDate,
  onDayClick,
  compact = false,
}) {
  const { day, dateString, isCurrentMonth } = cell;
  const isCurrentDay = isToday(dateString);
  const hasEvents = dayEvents.length > 0;
  const isActive = isSelected || (isCurrentDay && !isSelected);

  const handleClick = () => {
    if (onDayClick) {
      onDayClick(dateString, dayEvents);
    } else {
      onSelectDate(dateString);
      if (!hasEvents) {
        onOpenCreateForDate(dateString);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${day} ${dateString}${hasEvents ? `, ${dayEvents.length} events` : ''}`}
      className={`group relative ${compact ? 'h-[35px] sm:h-[45px] p-0.5 rounded-xl' : 'h-16 sm:h-20 p-2 rounded-2xl'} flex flex-col items-center justify-center transition-all cursor-pointer select-none ${
        !isCurrentMonth
          ? 'text-slate-300'
          : isSelected
          ? 'bg-orange-50/70 font-bold'
          : 'hover:bg-slate-50'
      }`}
    >
      {/* Day Number / Active Pill */}
      <div
        className={`${compact ? 'w-[25px] h-[25px] text-xs rounded-lg' : 'w-8 h-8 text-sm rounded-xl'} flex items-center justify-center font-semibold transition-all ${
          isSelected
            ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30 font-bold'
            : isCurrentDay
            ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30 font-bold'
            : !isCurrentMonth
            ? 'text-slate-300'
            : 'text-slate-700 group-hover:text-slate-900'
        }`}
      >
        {day}
      </div>

      {/* Orange Event Indicator Dot(s) */}
      <div className={`${compact ? 'h-[5px]' : 'h-2 mt-1'} flex items-center justify-center gap-1`}>
        {dayEvents.slice(0, 3).map((_, idx) => (
          <span
            key={idx}
            className={`w-1.5 h-1.5 rounded-full ${
              isSelected || isCurrentDay ? 'bg-orange-300' : 'bg-orange-500'
            }`}
          />
        ))}
        {dayEvents.length > 3 && (
          <span
            className={`text-[9px] font-bold leading-none ${
              isSelected || isCurrentDay ? 'text-orange-200' : 'text-orange-600'
            }`}
          >
            +{dayEvents.length - 3}
          </span>
        )}
      </div>
    </div>
  );
}

