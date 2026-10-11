import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { attachRelay } from './relay.js';

// Production server: the built game from dist/ plus the online relay, in one process.
//   npm run build && npm start        (PORT sets the port, default 8080)
const ROOT = path.resolve('dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };

const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, body) => {
    if (err) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  });
});

attachRelay(server);
const port = +(process.env.PORT ?? 8080);
server.listen(port, () => console.log(`PMD running on http://localhost:${port}`));
