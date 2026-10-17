import { GentizeText } from './GentizeText.jsx';
import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown, Check } from 'lucide-react';

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

export function parse24HourTime(timeStr) {
  if (!timeStr) return { hour12: 10, minute: '00', period: 'AM' };
  const clean = String(timeStr).trim();
  
  // If already contains am/pm
  if (/pm|am/i.test(clean)) {
    const isPM = /pm/i.test(clean);
    const nums = clean.replace(/am|pm/i, '').trim().split(':');
    let h = parseInt(nums[0], 10) || 12;
    const m = String(parseInt(nums[1] || '0', 10)).padStart(2, '0');
    if (h > 12) h = h % 12 || 12;
    return { hour12: h, minute: m, period: isPM ? 'PM' : 'AM' };
  }

  // 24 hour string like "14:30"
  const parts = clean.split(':');
  const h24 = parseInt(parts[0], 10) || 0;
  const m = String(parseInt(parts[1] || '0', 10)).padStart(2, '0');
  const period = h24 >= 12 ? 'PM' : 'AM';
  let hour12 = h24 % 12;
  if (hour12 === 0) hour12 = 12;

  return { hour12, minute: m, period };
}

export function formatTo24Hour(hour12, minute, period) {
  let h = parseInt(hour12, 10) % 12;
  if (period === 'PM') h += 12;
  const hStr = String(h).padStart(2, '0');
  const mStr = String(minute).padStart(2, '0');
  return `${hStr}:${mStr}`;
}

export function formatDisplay12Hour(timeStr) {
  const { hour12, minute, period } = parse24HourTime(timeStr);
  return `${String(hour12).padStart(2, '0')}:${minute} ${period}`;
}

export function CustomTimePicker({
  value = '10:00',
  onChange,
  disabled = false,
  label,
  className = '',
  compact = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const { hour12, minute, period } = parse24HourTime(value);

  // Close when clicked outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const updateTime = (newHour, newMinute, newPeriod) => {
    const h = newHour !== undefined ? newHour : hour12;
    const m = newMinute !== undefined ? newMinute : minute;
    const p = newPeriod !== undefined ? newPeriod : period;
    const val24 = formatTo24Hour(h, m, p);
    if (onChange) {
      onChange(val24);
    }
  };

  return (
    <div className={`relative inline-block w-full ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full ${compact ? 'px-2.5 py-1.5' : 'px-3.5 py-2.5'} bg-white border rounded-xl text-xs font-semibold text-slate-900 transition flex items-center justify-between gap-1.5 shadow-2xs cursor-pointer ${
          isOpen
            ? 'border-orange-500 ring-2 ring-orange-400/30'
            : 'border-slate-300 hover:border-orange-400'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <div className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} rounded-md bg-orange-50 flex items-center justify-center text-orange-600 shrink-0`}>
            <Clock className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
          </div>
          <span className="font-bold text-slate-800 tracking-wide text-xs">
            {String(hour12).padStart(2, '0')}:{minute}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-orange-100 text-orange-700 border border-orange-200/60">
            {period}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-orange-500' : ''
          }`}
        />
      </button>

      {/* Modern Popover Picker */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-72 bg-white rounded-2xl shadow-xl shadow-slate-900/15 border border-orange-200 p-3.5 animate-in fade-in zoom-in-95 duration-150">
          {/* Header Preview & AM/PM Pills */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold text-slate-900 font-mono">
                {String(hour12).padStart(2, '0')}:{minute}
              </span>
              <span className="text-xs font-extrabold text-orange-600">{period}</span>
            </div>

            {/* AM / PM Segmented Control */}
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
              <button
                type="button"
                onClick={() => updateTime(hour12, minute, 'AM')}
                className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                  period === 'AM'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => updateTime(hour12, minute, 'PM')}
                className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                  period === 'PM'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                PM
              </button>
            </div>
          </div>

          {/* Columns: Hour & Minute Selector */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Hour Column */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                Hour (1 - 12)
              </div>
              <div className="grid grid-cols-3 gap-1 max-h-44 overflow-y-auto pr-1">
                {HOURS.map((h) => {
                  const isSelected = hour12 === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => updateTime(h, minute, period)}
                      className={`h-8 rounded-lg font-bold text-xs transition flex items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'bg-orange-500 text-white font-extrabold shadow-2xs'
                          : 'bg-slate-50 hover:bg-orange-50 text-slate-700 hover:text-orange-700 border border-slate-200/60'
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minute Column */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                Minute (00 - 55)
              </div>
              <div className="grid grid-cols-2 gap-1 max-h-44 overflow-y-auto pr-1">
                {MINUTES.map((m) => {
                  const isSelected = minute === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => updateTime(hour12, m, period)}
                      className={`h-8 rounded-lg font-bold text-xs transition flex items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'bg-orange-500 text-white font-extrabold shadow-2xs'
                          : 'bg-slate-50 hover:bg-orange-50 text-slate-700 hover:text-orange-700 border border-slate-200/60'
                      }`}
                    >
                      :{m}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick preset chips */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {[
                { label: '9 AM', h: 9, m: '00', p: 'AM' },
                { label: '10 AM', h: 10, m: '00', p: 'AM' },
                { label: '1 PM', h: 1, m: '00', p: 'PM' },
                { label: '5 PM', h: 5, m: '00', p: 'PM' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => updateTime(preset.h, preset.m, preset.p)}
                  className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 hover:bg-orange-100 text-slate-600 hover:text-orange-700 transition"
                >
                  <GentizeText>{preset.label}</GentizeText>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold transition shadow-2xs"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
