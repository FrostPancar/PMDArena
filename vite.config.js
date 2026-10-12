import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { attachRelay } from './server/relay.js';

const VFX_DIR = path.resolve('move_VFX');
const NAMES_FILE = path.join(VFX_DIR, 'names.json');

const pngSize = (file) => {
  const b = Buffer.alloc(24);
  const fd = fs.openSync(file, 'r');
  fs.readSync(fd, b, 0, 24, 0);
  fs.closeSync(fd);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};
const MOVE_NOTES_FILE = path.resolve('move-notes.json');
const readMoveNotes = () => {
  try { return JSON.parse(fs.readFileSync(MOVE_NOTES_FILE, 'utf8')); } catch { return {}; }
};
const readNames = () => {
  try { return JSON.parse(fs.readFileSync(NAMES_FILE, 'utf8')); } catch { return {}; }
};

// Dev-only API behind vfx.html: lists the effect folders and stores the names you give them.
function vfxApi() {
  return {
    name: 'vfx-api',
    apply: 'serve',
    configureServer(server) {
      // moves.html: the notes left on each move, kept in move-notes.json as { moveId: text }
      server.middlewares.use('/api/move-notes', (req, res) => {
        const json = (code, body) => {
          res.statusCode = code;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(body));
        };
        if (req.method === 'GET') return json(200, readMoveNotes());
        if (req.method !== 'POST') return json(405, { error: 'method' });
        let body = '';
        req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(); });
        req.on('end', () => {
          try {
            const notes = {};
            for (const [id, v] of Object.entries(JSON.parse(body))) {
              if (/^[A-Za-z0-9]+$/.test(id) && typeof v === 'string' && v.trim()) notes[id] = v.slice(0, 2000);
            }
            fs.writeFileSync(MOVE_NOTES_FILE, JSON.stringify(notes, null, 1) + '\n');
            json(200, { saved: Object.keys(notes).length });
          } catch (e) {
            json(400, { error: String(e) });
          }
        });
      });
      server.middlewares.use('/api/vfx', (req, res) => {
        const json = (code, body) => {
          res.statusCode = code;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(body));
        };
        if (req.method === 'GET') {
          const dirs = fs.readdirSync(VFX_DIR).filter((d) => /^\d{4}/.test(d)).sort();
          const effects = dirs.map((folder) => {
            const dir = path.join(VFX_DIR, folder);
            const seqs = fs.readdirSync(dir).filter((s) => /^\d+$/.test(s)).sort().map((seq) => {
              const files = fs.readdirSync(path.join(dir, seq)).filter((f) => f.endsWith('.png')).sort();
              const [w, h] = files.length ? pngSize(path.join(dir, seq, files[0])) : [0, 0];
              return { seq, w, h, files };
            });
            return { id: folder.slice(0, 4), folder, seqs };
          });
          return json(200, { effects, names: readNames() });
        }
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(); });
          req.on('end', () => {
            try {
              const names = {};
              for (const [id, v] of Object.entries(JSON.parse(body))) {
                if (/^\d{4}$/.test(id) && v && typeof v.name === 'string') {
                  names[id] = { name: v.name.slice(0, 80), notes: String(v.notes ?? '').slice(0, 300) };
                }
              }
              fs.writeFileSync(NAMES_FILE, JSON.stringify(names, null, 1));
              json(200, { saved: Object.keys(names).length });
            } catch (e) {
              json(400, { error: String(e) });
            }
          });
          return;
        }
        json(405, { error: 'method' });
      });
    },
  };
}

// The online relay (server/relay.js) rides on the dev and preview servers, so `npm run dev` is enough to play online
// with anyone who can reach this machine. server/index.js runs it in production.
function relay() {
  return {
    name: 'relay',
    configureServer(server) { if (server.httpServer) attachRelay(server.httpServer); },
    configurePreviewServer(server) { if (server.httpServer) attachRelay(server.httpServer); },
  };
}

// index.html is the game. playground.html (the developers' test client), vfx.html (the effect viewer) and moves.html (the move viewer) are
// dev-only tools: `npm run dev` serves them, the build leaves them out.
// the tools' own save files are not sources: writing them must not reload the page that just wrote them
export default defineConfig({ plugins: [vfxApi(), relay()], server: { watch: { ignored: ['**/move-notes.json', '**/move_VFX/names.json', '**/dist/**', '**/dist-tools/**'] } } });
