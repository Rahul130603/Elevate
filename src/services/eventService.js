import { API_BASE, getApiBaseUrl } from '../config/api.js';

const getEventsEndpoint = () => `${getApiBaseUrl() || API_BASE}/api/events`;

export const eventService = {
  /**
   * Fetch events with optional query filters (month, date, search, eventType, status)
   */
  async fetchEvents(params = {}) {
    const query = new URLSearchParams();
    if (params.month) query.append('month', params.month);
    if (params.date) query.append('date', params.date);
    if (params.search) query.append('search', params.search);
    if (params.eventType && params.eventType !== 'all' && params.eventType !== 'All') {
      query.append('eventType', params.eventType);
    }
    if (params.status && params.status !== 'all' && params.status !== 'All') {
      query.append('status', params.status);
    }

    const url = query.toString() ? `${getEventsEndpoint()}?${query.toString()}` : getEventsEndpoint();
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch events');
    }
    return res.json();
  },

  /**
   * Fetch single event details by ID
   */
  async getEventById(id) {
    const res = await fetch(`${getEventsEndpoint()}/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Event not found');
    }
    return res.json();
  },

  /**
   * Check for overlapping events (across date ranges and times)
   */
  async checkOverlap({ startDate, endDate, startTime, endTime, excludeId = null }) {
    const query = new URLSearchParams({
      startDate: startDate,
      endDate: endDate || startDate,
      startTime,
      endTime,
    });
    if (excludeId) query.append('excludeId', excludeId);

    const res = await fetch(`${getEventsEndpoint()}/check-overlap?${query.toString()}`);
    if (!res.ok) return { hasOverlap: false, overlappingEvents: [] };
    return res.json();
  },

  /**
   * Create a new event
   */
  async createEvent(eventData) {
    const res = await fetch(getEventsEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });

    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data.error || 'Unable to create event. Please try again.');
      error.validationErrors = data.errors;
      throw error;
    }
    return data;
  },

  /**
   * Update an existing event
   */
  async updateEvent(id, eventData) {
    const res = await fetch(`${getEventsEndpoint()}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });

    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data.error || 'Unable to update event. Please try again.');
      error.validationErrors = data.errors;
      throw error;
    }
    return data;
  },

  /**
   * Delete an event
   */
  async deleteEvent(id) {
    const res = await fetch(`${getEventsEndpoint()}/${id}`, {
      method: 'DELETE',
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Unable to delete event. Please try again.');
    }
    return data;
  },
};
