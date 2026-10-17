import React from 'react';
import { Calendar, Plus, RefreshCw, AlertCircle, Sparkles, X } from 'lucide-react';
import EventCard from './EventCard.jsx';
import EventFilters from './EventFilters.jsx';
import { filterEvents, formatDateDisplay } from '../../utils/calendarUtils.js';

export default function EventList({
  events,
  loading,
  error,
  onRetry,
  onAddEvent,
  onViewEvent,
  onEditEvent,
  onDeleteEvent,
  selectedDate,
  onClearSelectedDate,
  // Filter states
  searchQuery,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  onResetFilters,
  // Tabs
  activeTab,
  onTabChange,
}) {
  const filteredList = filterEvents(events, {
    activeTab,
    search: searchQuery,
    dateFilter,
    typeFilter,
    statusFilter,
    selectedDate,
  });

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 flex flex-col h-full">
      {/* Header and Add Button */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-900">Events</h2>
          <span className="px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full">
            {filteredList.length}
          </span>
        </div>

        <button
          onClick={() => onAddEvent(selectedDate)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Event</span>
        </button>
      </div>

      {/* Tabs: Upcoming | Today | Past */}
      <div className="flex items-center p-1 bg-slate-100/80 rounded-xl mb-4 text-xs font-semibold">
        <button
          onClick={() => onTabChange('upcoming')}
          className={`flex-1 py-1.5 text-center rounded-lg transition-all cursor-pointer ${
            activeTab === 'upcoming'
              ? 'bg-white text-blue-600 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => onTabChange('today')}
          className={`flex-1 py-1.5 text-center rounded-lg transition-all cursor-pointer ${
            activeTab === 'today'
              ? 'bg-white text-blue-600 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => onTabChange('past')}
          className={`flex-1 py-1.5 text-center rounded-lg transition-all cursor-pointer ${
            activeTab === 'past'
              ? 'bg-white text-blue-600 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Past
        </button>
      </div>

      {/* Selected Date Notice / Banner */}
      {selectedDate && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 text-blue-900 text-xs px-3.5 py-2 rounded-xl mb-4 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>
              Filtered to: <strong className="font-semibold">{formatDateDisplay(selectedDate, true)}</strong>
            </span>
          </div>
          <button
            onClick={onClearSelectedDate}
            className="text-blue-600 hover:text-blue-800 p-0.5 rounded-md hover:bg-blue-100 transition-colors"
            title="Show all dates"
            aria-label="Clear date filter"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search & Dropdown Filters */}
      <EventFilters
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        dateFilter={dateFilter}
        onDateFilterChange={onDateFilterChange}
        typeFilter={typeFilter}
        onTypeFilterChange={onTypeFilterChange}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        onResetFilters={onResetFilters}
      />

      {/* Main List Container */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {/* Loading State */}
        {loading && (
          <div className="space-y-3 py-2">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-slate-50 border border-slate-100 rounded-2xl p-4 animate-pulse space-y-3"
              >
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                  <div className="h-4 bg-slate-200 rounded-full w-16" />
                </div>
                <div className="h-3 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-6 text-center bg-rose-50 border border-rose-200 rounded-2xl my-4">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-rose-800 mb-1">
              Unable to load events. Please try again.
            </p>
            <p className="text-xs text-rose-600 mb-4">{error}</p>
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-rose-700 bg-white border border-rose-300 rounded-xl hover:bg-rose-100 transition-all shadow-2xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredList.length === 0 && (
          <div className="text-center py-12 px-4 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 my-auto">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto text-slate-400 mb-3 shadow-2xs">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No events scheduled</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 mb-5">
              Create your first event to start managing your schedule.
            </p>
            <button
              onClick={() => onAddEvent(selectedDate)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Event</span>
            </button>
          </div>
        )}

        {/* Cards List */}
        {!loading && !error && filteredList.length > 0 && (
          <div className="space-y-3">
            {filteredList.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onView={onViewEvent}
                onEdit={onEditEvent}
                onDelete={onDeleteEvent}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
