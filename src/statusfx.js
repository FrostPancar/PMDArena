// Status icons cut from the Red Rescue Team status sheet in Art/. Each row of the sheet is one looping icon.
const urls = import.meta.glob('../Art/*Status Effects.png', { eager: true, query: '?url', import: 'default' });
export const STATUS_SHEET_URL = Object.values(urls)[0];

// name: [x, y, cell width, cell height, frames, fps]
export const ICONS = {
  eye: [104, 16, 8, 8, 12, 10], blind: [104, 24, 8, 8, 14, 10], exclaim: [104, 32, 16, 16, 9, 10], question: [104, 48, 16, 16, 10, 8],
  cross: [104, 64, 16, 16, 9, 10], swirl: [104, 80, 16, 16, 9, 12], shield: [104, 96, 16, 16, 13, 10], flame: [104, 112, 16, 16, 7, 10],
  spark: [104, 128, 16, 16, 8, 12], ice: [104, 145, 32, 32, 6, 6], fist: [104, 177, 16, 16, 8, 10], down: [104, 193, 16, 16, 11, 10],
  heart: [104, 209, 8, 8, 14, 10], sword: [104, 217, 16, 15, 13, 10], zzz: [104, 232, 16, 16, 10, 8], skull: [104, 248, 16, 16, 15, 8],
};

// Frame name of an icon at a given time in ms.
export const iconFrame = (name, now) => `${name}${Math.floor((now / 1000) * ICONS[name][5]) % ICONS[name][4]}`;

export function buildStatusIcons(scene) {
  const src = scene.textures.get('status-sheet').getSourceImage();
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  // the sheet's teal backdrop becomes transparent
  for (let i = 0; i < p.length; i += 4) if (p[i] === 0 && p[i + 1] === 120 && p[i + 2] === 144) p[i + 3] = 0;
  g.putImageData(d, 0, 0);
  const tex = scene.textures.addCanvas('status', c);
  for (const [name, [x, y, w, h, n]] of Object.entries(ICONS)) for (let i = 0; i < n; i++) tex.add(`${name}${i}`, 0, x + i * w, y, w, h);
}

// The substitute doll, cut from the Red Rescue Team decoy sheet: two idle frames for each of the 8 facings (same order as the mon sheets).
const decoys = import.meta.glob('../Art/*Decoy.png', { eager: true, query: '?url', import: 'default' });
export const DECOY_SHEET_URL = Object.values(decoys)[0];
const DECOY_ROWS = [
  [1, 21, [1, 19], [24, 44]], [26, 48, [1, 23], [28, 52]], [53, 76, [1, 22], [27, 50]], [81, 102, [1, 20], [25, 46]],
  [107, 130, [1, 21], [26, 48]], [135, 156, [1, 20], [25, 46]], [161, 184, [1, 22], [27, 50]], [189, 211, [1, 23], [28, 52]],
];
const DW = 28, DH = 26;

// Builds 'decoy' with frames numbered facing * 2 + frame, each centred and standing on the bottom of its cell.
export function buildDecoy(scene) {
  const src = scene.textures.get('decoy-sheet').getSourceImage();
  const c = document.createElement('canvas');
  c.width = DW * 2; c.height = DH * 8;
  const g = c.getContext('2d');
  DECOY_ROWS.forEach(([y0, y1, ...cols], r) => cols.forEach(([x0, x1], f) => {
    const w = x1 - x0, h = y1 - y0;
    g.drawImage(src, x0, y0, w, h, f * DW + ((DW - w) >> 1), r * DH + DH - h, w, h);
  }));
  // the sheet's white backdrop goes transparent, flooded in from each cell's edge so white inside the doll stays
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  const white = (i) => p[i + 3] === 255 && p[i] === 255 && p[i + 1] === 255 && p[i + 2] === 255;
  for (let cell = 0; cell < 16; cell++) {
    const cx = (cell % 2) * DW, cy = (cell >> 1) * DH, stack = [];
    for (let x = 0; x < DW; x++) stack.push([x, 0], [x, DH - 1]);
    for (let y = 0; y < DH; y++) stack.push([0, y], [DW - 1, y]);
    while (stack.length) {
      const [x, y] = stack.pop();
      if (x < 0 || y < 0 || x >= DW || y >= DH) continue;
      const i = ((cy + y) * c.width + cx + x) * 4;
      if (p[i + 3] !== 0 && !white(i)) continue;
      if (p[i + 3] === 0 && p[i] === 1) continue; // already visited
      p[i] = 1; p[i + 1] = p[i + 2] = p[i + 3] = 0;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }
  g.putImageData(d, 0, 0);
  const tex = scene.textures.addCanvas('decoy', c);
  for (let i = 0; i < 16; i++) tex.add(i, 0, (i % 2) * DW, (i >> 1) * DH, DW, DH);
}
