import React, { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { API_BASE, getApiBaseUrl } from '../../config/api.js';
import { autoDiscoverServer, checkServerHealth } from '../../services/discoveryService.js';

export default function OfflineBanner() {
  // Only display Wi-Fi connect / laptop server banner on the mobile app (Capacitor)
  // On website / laptop browser, never show this banner
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isServerHealthy, setIsServerHealthy] = useState(true);
  const [isAutoSearching, setIsAutoSearching] = useState(false);
  const [autoFoundUrl, setAutoFoundUrl] = useState(null);
  const searchInProgressRef = useRef(false);

  // Trigger automatic search across Wi-Fi
  const triggerAutoDiscovery = async () => {
    if (searchInProgressRef.current) return;
    searchInProgressRef.current = true;
    setIsAutoSearching(true);

    try {
      const foundUrl = await autoDiscoverServer();
      if (foundUrl) {
        setIsServerHealthy(true);
        setAutoFoundUrl(foundUrl);
        setTimeout(() => setAutoFoundUrl(null), 5000);
      } else {
        setIsServerHealthy(false);
      }
    } catch (_) {
      setIsServerHealthy(false);
    } finally {
      setIsAutoSearching(false);
      searchInProgressRef.current = false;
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerAutoDiscovery();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic server health check
    const checkServer = async () => {
      const currentUrl = getApiBaseUrl() || API_BASE;
      const ok = await checkServerHealth(currentUrl, 2500);
      if (!ok) {
        setIsServerHealthy(false);
        // Automatically search and reconnect to laptop on any new Wi-Fi!
        triggerAutoDiscovery();
      } else {
        setIsServerHealthy(true);
      }
    };

    // Initial check and auto-discovery
    checkServer();
    const interval = setInterval(checkServer, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="bg-amber-500 text-white text-xs sm:text-sm font-medium px-4 py-2 flex items-center justify-center gap-2 shadow-inner transition-all animate-fadeIn sticky top-0 z-50">
        <svg className="w-4 h-4 animate-pulse shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 4.243a9 9 0 01-12.728 0m0 0l2.829-2.829m-2.829 2.829L3 21m2.828-12.536a5 5 0 017.072 0m-7.072 0l2.829 2.829" />
        </svg>
        <span>You are currently offline. Please check your internet / Wi-Fi connection.</span>
      </div>
    );
  }

  // Success auto-connected banner
  if (autoFoundUrl) {
    return (
      <div className="bg-emerald-600 text-white text-xs sm:text-sm font-bold px-4 py-2 flex items-center justify-center gap-2 shadow-inner transition-all animate-fadeIn sticky top-0 z-50">
        <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
        <span>⚡ Auto-Connected to Laptop Server: {autoFoundUrl}</span>
      </div>
    );
  }

  // Searching for laptop across Wi-Fi
  if (isAutoSearching) {
    return (
      <div className="bg-indigo-600 text-white text-xs sm:text-sm font-medium px-4 py-2 flex flex-wrap items-center justify-center gap-2 shadow-inner transition-all animate-fadeIn sticky top-0 z-50">
        <svg className="w-4 h-4 animate-spin shrink-0 text-white" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span>🔍 Searching for laptop on Wi-Fi... (Auto-Connecting)</span>
      </div>
    );
  }

  const handleChangeIp = () => {
    const current = localStorage.getItem('custom_server_url') || getApiBaseUrl() || API_BASE || 'http://10.64.14.43:5000';
    const entered = window.prompt('Enter your computer Wi-Fi Server IP (e.g. http://192.168.1.5:5000):', current);
    if (entered && entered.trim()) {
      let finalUrl = entered.trim();
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = `http://${finalUrl}`;
      }
      localStorage.setItem('custom_server_url', finalUrl);
      window.location.reload();
    }
  };

  if (!isServerHealthy) {
    return (
      <div className="bg-rose-500 text-white text-xs sm:text-sm font-medium px-4 py-2 flex flex-wrap items-center justify-center gap-2 shadow-inner transition-all animate-fadeIn sticky top-0 z-50">
        <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
        <span>Unable to connect to laptop server. Ensure phone and laptop are on the same Wi-Fi.</span>
        <button
          type="button"
          onClick={triggerAutoDiscovery}
          className="px-2.5 py-0.5 bg-white text-rose-700 font-bold rounded-lg text-xs shadow-xs hover:bg-rose-50 active:scale-95 transition-all cursor-pointer"
        >
          Auto-Connect
        </button>
        <button
          type="button"
          onClick={handleChangeIp}
          className="px-2.5 py-0.5 bg-rose-700 text-white font-bold rounded-lg text-xs shadow-xs hover:bg-rose-800 active:scale-95 transition-all cursor-pointer"
        >
          Change IP
        </button>
      </div>
    );
  }

  return null;
}
