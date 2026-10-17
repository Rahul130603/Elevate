import { Capacitor } from '@capacitor/core';

const DESKTOP_HOSTNAME = 'DESKTOP-CH7HIM1';
const SYNC_TOPIC = `gentize_calendar_auto_ip_sync_${DESKTOP_HOSTNAME.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
const GLOBAL_SYNC_TOPIC = 'gentize_calendar_auto_ip_sync';

let isDiscovering = false;
let discoveryListeners = new Set();

export function onServerDiscovered(callback) {
  discoveryListeners.add(callback);
  return () => discoveryListeners.delete(callback);
}

function notifyListeners(newUrl) {
  discoveryListeners.forEach((cb) => {
    try { cb(newUrl); } catch (_) {}
  });
}

/**
 * Check if a candidate URL is an active, healthy Gentize Calendar backend
 */
export async function checkServerHealth(url, timeoutMs = 1200) {
  const clean = (url || '').replace(/\/$/, '');
  try {
    const res = await fetch(`${clean}/api/health`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data && data.status === 'healthy';
  } catch (_) {
    return false;
  }
}

/**
 * Extract candidate URL from ntfy.sh message text or json
 */
function parseUrlFromMessage(text) {
  if (!text) return null;
  const lines = text.trim().split('\n');
  for (const line of lines.reverse()) {
    try {
      const data = JSON.parse(line);
      const msg = data.message || '';
      if (typeof msg === 'string') {
        if (msg.startsWith('{') && msg.includes('primaryUrl')) {
          const parsed = JSON.parse(msg);
          if (parsed.primaryUrl) return parsed.primaryUrl;
        }
        if (msg.startsWith('http://') || msg.startsWith('https://')) {
          return msg.trim();
        }
      }
    } catch (_) {
      if (line.startsWith('http://') || line.startsWith('https://')) {
        return line.trim();
      }
    }
  }
  return null;
}

/**
 * Multi-Tier Automatic Discovery Engine
 * Works across any Wi-Fi network, mobile hotspot, or office LAN
 */
export async function autoDiscoverServer() {
  if (/^https?:$/.test(window.location.protocol) && !['localhost', '127.0.0.1'].includes(window.location.hostname)) return window.location.origin;
  if (isDiscovering) return null;
  isDiscovering = true;

  try {
    // -------------------------------------------------------------
    // Tier 1: Check Current / Saved URL (0ms if already working)
    // -------------------------------------------------------------
    const current = localStorage.getItem('custom_server_url') || 'http://10.64.14.43:5000';
    if (await checkServerHealth(current, 1000)) {
      isDiscovering = false;
      return current;
    }

    console.log('[Auto-Discovery] Current server offline. Searching for laptop across Wi-Fi...');

    // -------------------------------------------------------------
    // Tier 2: mDNS / Local Hostname Resolution (Direct local Wi-Fi)
    // -------------------------------------------------------------
    const mdnsCandidates = [
      `http://${DESKTOP_HOSTNAME}.local:5000`,
      `http://${DESKTOP_HOSTNAME}:5000`,
      `http://${DESKTOP_HOSTNAME.toLowerCase()}.local:5000`,
    ];

    for (const cand of mdnsCandidates) {
      if (await checkServerHealth(cand, 1200)) {
        console.log('[Auto-Discovery] Found via mDNS:', cand);
        localStorage.setItem('custom_server_url', cand);
        notifyListeners(cand);
        isDiscovering = false;
        return cand;
      }
    }

    // -------------------------------------------------------------
    // Tier 3: Cloud Auto-Sync Registry (Instant across ANY Wi-Fi)
    // -------------------------------------------------------------
    try {
      const cloudPromises = [
        fetch(`https://ntfy.sh/${SYNC_TOPIC}/json?poll=1`, { signal: AbortSignal.timeout(2500) })
          .then(r => r.text())
          .then(parseUrlFromMessage)
          .catch(() => null),
        fetch(`https://ntfy.sh/${GLOBAL_SYNC_TOPIC}/json?poll=1`, { signal: AbortSignal.timeout(2500) })
          .then(r => r.text())
          .then(parseUrlFromMessage)
          .catch(() => null),
      ];

      const results = await Promise.all(cloudPromises);
      for (const candUrl of results) {
        if (candUrl && candUrl.includes(':5000')) {
          if (await checkServerHealth(candUrl, 1500)) {
            console.log('[Auto-Discovery] Found via Cloud IP Sync:', candUrl);
            localStorage.setItem('custom_server_url', candUrl);
            notifyListeners(candUrl);
            isDiscovering = false;
            return candUrl;
          }
        }
      }
    } catch (_) {}

    // -------------------------------------------------------------
    // Tier 4: Fast Local Subnet Ping (For mobile hotspot / offline router)
    // -------------------------------------------------------------
    const subnetCandidates = [
      // Windows Hotspot Default Gateway
      'http://192.168.137.1:5000',
      // Common Home / Office Subnets
      'http://10.64.14.43:5000',
      'http://192.168.1.100:5000',
      'http://192.168.1.2:5000',
      'http://192.168.0.100:5000',
      'http://192.168.0.2:5000',
    ];

    // Add Android Hotspot range (192.168.43.1 - 30)
    for (let i = 1; i <= 25; i++) {
      subnetCandidates.push(`http://192.168.43.${i}:5000`);
    }

    // Add common low IP ranges (192.168.1.2 - 15 and 192.168.0.2 - 15)
    for (let i = 2; i <= 15; i++) {
      subnetCandidates.push(`http://192.168.1.${i}:5000`);
      subnetCandidates.push(`http://192.168.0.${i}:5000`);
    }

    // Test candidates in parallel batches of 10 for blazing fast response
    const BATCH_SIZE = 10;
    for (let i = 0; i < subnetCandidates.length; i += BATCH_SIZE) {
      const chunk = subnetCandidates.slice(i, i + BATCH_SIZE);
      const promises = chunk.map(async (url) => {
        const ok = await checkServerHealth(url, 1000);
        return ok ? url : null;
      });

      const chunkResults = await Promise.all(promises);
      const match = chunkResults.find(Boolean);
      if (match) {
        console.log('[Auto-Discovery] Found via Subnet Scanner:', match);
        localStorage.setItem('custom_server_url', match);
        notifyListeners(match);
        isDiscovering = false;
        return match;
      }
    }

    isDiscovering = false;
    return null;
  } catch (err) {
    console.warn('[Auto-Discovery] Error during search:', err);
    isDiscovering = false;
    return null;
  }
}
