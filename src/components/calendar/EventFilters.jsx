import React from 'react';
import { Search, X } from 'lucide-react';
import { EVENT_TYPES } from '../../utils/calendarUtils.js';

export default function EventFilters({
  searchQuery,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  onResetFilters,
}) {
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    dateFilter !== 'all' ||
    typeFilter !== 'all' ||
    statusFilter !== 'all';

  return (
    <div className="space-y-3 mb-4">
      {/* Search Input Bar with custom styling */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search events by title, address, email, phone..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm custom-input focus:outline-none placeholder:text-slate-400 transition-all shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Selects with custom styled select menus */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {/* Date Filter Dropdown */}
        <select
          value={dateFilter}
          onChange={(e) => onDateFilterChange(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium custom-select shadow-2xs cursor-pointer text-xs"
        >
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="tomorrow">Tomorrow</option>
          <option value="this_week">This Week</option>
          <option value="this_month">This Month</option>
        </select>

        {/* Event Type Filter Dropdown: Online / Offline */}
        <select
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium custom-select shadow-2xs cursor-pointer text-xs"
        >
          <option value="all">All Types</option>
          {EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        {/* Status Filter Dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium custom-select shadow-2xs cursor-pointer text-xs"
        >
          <option value="all">All Statuses</option>
          <option value="upcoming">Upcoming</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* Reset Filter Button */}
        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}
