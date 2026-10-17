import { spawn } from 'node:child_process';
import { request } from 'node:http';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getNewsSession, newsBridgeSecret } from './adminNewsSession.js';

const siteDir = fileURLToPath(new URL('../../news-site/', import.meta.url));
const sitePort = Number(process.env.INDUSTRY_NEWS_PORT || 3101);
let child;

export function startIndustryNews() {
  const cli = `${siteDir}/node_modules/next/dist/bin/next`;
  if (!existsSync(cli)) {
    console.error('[Industry News] Install dependencies: npm --prefix news-site ci --ignore-scripts');
    return;
  }
  const production = existsSync(`${siteDir}/.next/BUILD_ID`);
  child = spawn(process.execPath, [cli, production ? 'start' : 'dev', '--hostname', '127.0.0.1', '--port', String(sitePort)], {
    cwd: siteDir,
    env: { ...process.env, ELEVATE_NEWS_SECRET: newsBridgeSecret, NEXT_TELEMETRY_DISABLED: '1' },
    stdio: 'inherit', windowsHide: true,
  });
  child.on('error', error => console.error('[Industry News]', error.message));
  child.on('exit', code => console.log(`[Industry News] Stopped (${code})`));
  process.once('exit', () => child?.kill());
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => { child?.kill(); process.exit(0); });
  }
}

// Serve the copied news site under the same origin; every request requires the
// admin's server-side session. Client parameters cannot change its industry.
export function proxyIndustryNews(req, res) {
  const session = getNewsSession(req);
  if (!session) return res.status(401).send('Admin login required. Please sign in and select an industry.');
  const headers = { ...req.headers, host: `127.0.0.1:${sitePort}`, 'x-elevate-secret': newsBridgeSecret, 'x-elevate-industry': session.industry };
  headers['x-elevate-search'] = /^\/admin-news\/[a-z]{2}\/search(?:\?|$)/.test(req.originalUrl) ? '1' : '0';
  headers['x-elevate-news-mode'] = /(?:^|;\s*)elevate_news_mode=native(?:;|$)/.test(req.headers.cookie || '') ? 'native' : 'translated';
  delete headers['content-length'];
  delete headers['accept-encoding'];
  const upstream = request({ hostname: '127.0.0.1', port: sitePort, path: req.originalUrl, method: req.method, headers }, response => {
    res.status(response.statusCode || 502);
    for (const [name, value] of Object.entries(response.headers)) {
      if (value !== undefined && !['connection', 'transfer-encoding', 'cache-control'].includes(name)) res.setHeader(name, value);
    }
    res.setHeader('Cache-Control', 'private, no-store');
    if (response.headers.location) {
      res.setHeader('Location', response.headers.location.replace(`http://127.0.0.1:${sitePort}`, ''));
    }
    response.pipe(res);
  });
  upstream.on('error', () => {
    if (!res.headersSent) res.status(503).send('Industry news is starting. Please refresh in a moment.');
    else res.end();
  });
  res.on('close', () => upstream.destroy());
  if (req.body !== undefined && !['GET', 'HEAD'].includes(req.method)) upstream.end(JSON.stringify(req.body));
  else req.pipe(upstream);
}
