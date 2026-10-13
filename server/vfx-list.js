import fs from 'node:fs';
import path from 'node:path';

// What vfx.html shows: every effect folder in move_VFX with its sequences and frames, and the names given to them.
// The dev server answers with it at /api/vfx; the published test client carries it as a file (vite.tools.config.js).
export const VFX_DIR = path.resolve('move_VFX');
export const NAMES_FILE = path.join(VFX_DIR, 'names.json');

const pngSize = (file) => {
  const b = Buffer.alloc(24);
  const fd = fs.openSync(file, 'r');
  fs.readSync(fd, b, 0, 24, 0);
  fs.closeSync(fd);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};

export const readNames = () => {
  try { return JSON.parse(fs.readFileSync(NAMES_FILE, 'utf8')); } catch { return {}; }
};

export function listEffects() {
  const dirs = fs.readdirSync(VFX_DIR).filter((d) => /^\d{4}/.test(d)).sort();
  return dirs.map((folder) => {
    const dir = path.join(VFX_DIR, folder);
    const seqs = fs.readdirSync(dir).filter((s) => /^\d+$/.test(s)).sort().map((seq) => {
      const files = fs.readdirSync(path.join(dir, seq)).filter((f) => f.endsWith('.png')).sort();
      const [w, h] = files.length ? pngSize(path.join(dir, seq, files[0])) : [0, 0];
      return { seq, w, h, files };
    });
    return { id: folder.slice(0, 4), folder, seqs };
  });
}
