import { Capacitor } from '@capacitor/core';

/**
 * Multi-environment API Configuration
 * Supports web browsers, Android emulators, physical devices, and production URLs
 */
export function getApiBaseUrl() {
  // When running on Android / iOS via Capacitor native app, connect to PC LAN IP
  if (Capacitor.isNativePlatform()) {
    if (typeof window !== 'undefined') {
      // The Android server picker loads the chosen website inside the WebView.
      // Its API and news iframe must stay on that same selected server.
      const { protocol, hostname } = window.location;
      if ((protocol === 'http:' || protocol === 'https:') && hostname !== 'localhost' && hostname !== '127.0.0.1') return '';
      const custom = localStorage.getItem('custom_server_url');
      if (custom) return custom.replace(/\/$/, '');
    }

    const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl.replace(/\/$/, '');
    }
    return 'http://10.64.14.43:5000';
  }

  // Web browser default (relative path proxies through Vite dev server or Express in production)
  return '';
}

export const API_BASE = getApiBaseUrl();

