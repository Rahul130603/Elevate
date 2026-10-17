import os from 'os';
import dgram from 'dgram';

const PORT = process.env.PORT || 5000;
const DISCOVERY_UDP_PORT = 5001;
const HOSTNAME = os.hostname();
const NTFY_CHANNEL = `gentize_calendar_auto_ip_sync_${HOSTNAME.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
const NTFY_GLOBAL_CHANNEL = 'gentize_calendar_auto_ip_sync';

let lastBroadcastIps = [];
let udpServer = null;

/**
 * Gather all non-internal IPv4 LAN addresses
 */
export function getLocalIpv4Addresses() {
  const nets = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Must be IPv4, not internal 127.0.0.1, and not link-local 169.254.x.x
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254')) {
        addresses.push({
          interface: name,
          ip: net.address,
        });
      }
    }
  }

  // Prioritize Wi-Fi or Ethernet interfaces
  addresses.sort((a, b) => {
    const isWifiA = /wi-fi|wlan|wireless|ethernet|local/i.test(a.interface) ? 1 : 0;
    const isWifiB = /wi-fi|wlan|wireless|ethernet|local/i.test(b.interface) ? 1 : 0;
    return isWifiB - isWifiA;
  });

  return addresses.map(a => a.ip);
}

/**
 * Broadcast current server IP(s) to cloud sync topic and log
 */
export async function broadcastServerIp() {
  const ips = getLocalIpv4Addresses();
  if (ips.length === 0) return;

  const primaryIp = ips[0];
  const primaryUrl = `http://${primaryIp}:${PORT}`;
  const localDomain = `http://${HOSTNAME}.local:${PORT}`;

  const payload = JSON.stringify({
    primaryUrl,
    ips,
    port: PORT,
    hostname: HOSTNAME,
    localDomain,
    timestamp: Date.now(),
  });

  // Check if IP set changed
  const ipsJoined = ips.join(',');
  const hasChanged = ipsJoined !== lastBroadcastIps.join(',');
  lastBroadcastIps = ips;

  if (hasChanged) {
    console.log(`[Auto-Discovery] Active LAN IP detected: ${primaryUrl} (${HOSTNAME})`);
  }

  // Publish to lightweight cloud sync topics
  try {
    await fetch(`https://ntfy.sh/${NTFY_CHANNEL}/publish`, {
      method: 'POST',
      body: payload,
      headers: { 'Title': 'Gentize Calendar IP Sync', 'Tags': 'computer,signal_strength' },
      signal: AbortSignal.timeout(4000),
    });
  } catch (_) {}

  try {
    await fetch(`https://ntfy.sh/${NTFY_GLOBAL_CHANNEL}/publish`, {
      method: 'POST',
      body: payload,
      signal: AbortSignal.timeout(4000),
    });
  } catch (_) {}
}

/**
 * Start UDP discovery listener on LAN
 */
function startUdpDiscovery() {
  try {
    udpServer = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    udpServer.on('error', (err) => {
      console.warn('[Auto-Discovery] UDP socket error:', err.message);
      try { udpServer.close(); } catch (_) {}
    });

    udpServer.on('message', (msg, rinfo) => {
      const text = msg.toString().trim();
      if (text.includes('GENTIZE_CALENDAR_DISCOVER')) {
        const ips = getLocalIpv4Addresses();
        const primaryIp = ips[0] || 'localhost';
        const reply = JSON.stringify({
          type: 'GENTIZE_CALENDAR_OFFER',
          url: `http://${primaryIp}:${PORT}`,
          hostname: HOSTNAME,
          timestamp: Date.now(),
        });

        const replyBuf = Buffer.from(reply);
        udpServer.send(replyBuf, 0, replyBuf.length, rinfo.port, rinfo.address, () => {});
      }
    });

    udpServer.bind(DISCOVERY_UDP_PORT, () => {
      try { udpServer.setBroadcast(true); } catch (_) {}
      console.log(`[Auto-Discovery] Local LAN Discovery listener active on UDP port ${DISCOVERY_UDP_PORT}`);
    });
  } catch (err) {
    console.warn('[Auto-Discovery] UDP listener setup error:', err.message);
  }
}

/**
 * Main service initializer
 */
export function startAutoDiscoveryService() {
  // Initial broadcast
  broadcastServerIp().catch(() => {});

  // Start UDP responder for local discovery
  startUdpDiscovery();

  // Periodic network change watcher (checks every 12 seconds)
  const interval = setInterval(() => {
    broadcastServerIp().catch(() => {});
  }, 12000);

  return () => {
    clearInterval(interval);
    if (udpServer) {
      try { udpServer.close(); } catch (_) {}
    }
  };
}
