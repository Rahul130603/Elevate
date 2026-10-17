// Local sample preview only. No mail is sent and no application routes are changed.
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const html = readFileSync(fileURLToPath(new URL('../previews/login-email.html', import.meta.url)));
const logo = readFileSync(fileURLToPath(new URL('../public/logo.png', import.meta.url)));
http.createServer((req, res) => {
  if (req.url !== '/' && req.url !== '/logo.png') { res.writeHead(404); res.end(); return; }
  res.writeHead(200, {'Content-Type':req.url === '/' ? 'text/html; charset=utf-8' : 'image/png', 'Cache-Control':'no-store'});
  res.end(req.url === '/' ? html : logo);
}).listen(3002, '127.0.0.1', () => console.log('Email design sample: http://127.0.0.1:3002'));
