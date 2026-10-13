import fs from 'node:fs';
import path from 'node:path';

// What vfx.html shows: every effect folder with its sequences and frames, and the names given to them.
// The dev server answers with it at /api/vfx; the published test client carries it as a file (vite.tools.config.js).
// Effects come in sections: the game's own (move_VFX) and sheets cut up from elsewhere (extra_VFX/<section>, made by
// tools/slice-sheet.py and tools/slice-sheets.py). Ids are four digits and unique across sections, so one names file covers them all.
export const VFX_DIR = path.resolve('move_VFX');
export const NAMES_FILE = path.join(VFX_DIR, 'names.json');
export const SECTIONS = [
  { id: 'pmd', label: 'Mystery Dungeon', dir: VFX_DIR, base: '/move_VFX' },
  ...[['mmbn', 'Battle Network'], ['emerald', 'Emerald'], ['mana', 'Trials of Mana'], ['dbz', 'DBZ Supersonic'], ['negima', 'Negima'], ['sonic', 'Sonic Rush'], ['som', 'Secret of Mana'], ['weather', 'Weather']]
    .map(([id, label]) => ({ id, label, dir: path.resolve('extra_VFX', id), base: `/extra_VFX/${id}` })),
];
export const sectionLabels = () => SECTIONS.filter((s) => fs.existsSync(s.dir)).map(({ id, label }) => ({ id, label }));

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
  return SECTIONS.flatMap(({ id: section, dir: root, base }) => {
    if (!fs.existsSync(root)) return [];
    const dirs = fs.readdirSync(root).filter((d) => /^\d{4}/.test(d)).sort();
    return dirs.map((folder) => {
      const dir = path.join(root, folder);
      const seqs = fs.readdirSync(dir).filter((s) => /^\d+$/.test(s)).sort().map((seq) => {
        const files = fs.readdirSync(path.join(dir, seq)).filter((f) => f.endsWith('.png')).sort();
        const [w, h] = files.length ? pngSize(path.join(dir, seq, files[0])) : [0, 0];
        return { seq, w, h, files };
      });
      return { id: folder.slice(0, 4), folder, section, base, seqs };
    });
  });
}

// Where an effect's frames are on disk (for copying them into a build).
export const effectDir = (e) => path.join(SECTIONS.find((s) => s.id === e.section).dir, e.folder);
