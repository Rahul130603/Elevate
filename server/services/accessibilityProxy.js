const resources = new Set(['/embed.js', '/widget.js', '/accessibility-badge.png', '/api/widget/validate']);

// Keep the widget reachable through Elevate on phones; retain the real website
// origin so AccessEase still enforces its registration and key restrictions.
export async function proxyAccessibility(req, res) {
  if (req.method !== 'GET' || !resources.has(req.path)) return res.status(404).json({error: 'Widget resource not found.'});
  const base = process.env.ACCESSEASE_URL || (process.platform === 'linux' ? 'http://host.docker.internal:1434' : 'http://127.0.0.1:1434');
  try {
    const headers = {};
    if (req.path === '/api/widget/validate') {
      headers.Origin = req.get('Origin') || `${req.protocol}://${req.get('host')}`;
      headers['X-AccessEase-Key'] = req.get('X-AccessEase-Key') || '';
    }
    const upstream = await fetch(new URL(req.path.slice(1), `${base.replace(/\/$/, '')}/`), {headers, signal: AbortSignal.timeout(10000), redirect: 'error'});
    res.status(upstream.status);
    res.set('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
    res.set('Cache-Control', 'no-store');
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    res.status(502).json({error: 'AccessEase server is unavailable.'});
  }
}
