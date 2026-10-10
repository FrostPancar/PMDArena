import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const VFX_DIR = path.resolve('move_VFX');
const NAMES_FILE = path.join(VFX_DIR, 'names.json');

const pngSize = (file) => {
  const b = Buffer.alloc(24);
  const fd = fs.openSync(file, 'r');
  fs.readSync(fd, b, 0, 24, 0);
  fs.closeSync(fd);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
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

// index.html is the test client, game.html the player client; vfx.html is a dev-only tool.
export default defineConfig({
  plugins: [vfxApi()],
  build: { rolldownOptions: { input: { index: 'index.html', game: 'game.html' } } },
});
