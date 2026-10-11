import Phaser from 'phaser';
import FLAG_FRAMES from './flags.json';

// Everything the player client draws that is not a mon, a map or a move effect is cut from the sheets in Art/ here.
// Rects are [x, y, w, h] in sheet pixels unless a comment says otherwise.
const urls = import.meta.glob('../../Art/*.png', { eager: true, query: '?url', import: 'default' });
const sheet = (part) => Object.entries(urls).find(([p]) => p.includes(part))[1];
const SHEETS = {
  'art-bluff': sheet('Sharpedo Bluff'), 'art-dojo': sheet('Dojo'), 'art-font': sheet('- Font'),
  'art-types': sheet('Type Icons'), 'art-icons': sheet('Item Icons'), 'art-dream': sheet('Dreams'), 'art-flags': sheet('Flag Designs'),
};
// portraits/<species or form>.png, one 40px face each, shown as `face-<id>`
const faces = import.meta.glob('../../portraits/*.png', { eager: true, query: '?url', import: 'default' });

// Team flags for the profile: flags.json lists the six waving frames of each on the sheet. Shown as the animation
// `flag<n>` on the texture 'flags' (frame n * 6 + i), every frame in a cell of the same size.
export const FLAG_COUNT = FLAG_FRAMES.length;
const FLAG_CELL = [32, 24], FLAG_BG = [192, 192, 192];

export const TYPES = ['bug', 'dark', 'dragon', 'electric', 'fairy', 'fighting', 'fire', 'flying', 'ghost', 'grass', 'ground', 'ice', 'normal', 'poison', 'psychic', 'rock', 'steel', 'water'];

// Named cells of the icon sheet (16px grid; the pad buttons are 12px art inside their cell).
const ICONS = {
  btnA: [130, 146, 12, 12], btnB: [146, 146, 12, 12], btnX: [162, 146, 12, 12], btnY: [178, 146, 12, 12], btnL: [194, 146, 12, 12], btnR: [210, 146, 12, 12],
  select: [128, 130, 23, 12], start: [152, 130, 23, 12],
  dpad: [128, 176, 16, 16], dpadUD: [144, 176, 16, 16], dpadLR: [160, 176, 16, 16],
  pageL: [128, 192, 16, 16], pageR: [144, 192, 16, 16],
  caretR: [112, 208, 16, 16], caretDown: [64, 208, 16, 16], caretUp: [80, 208, 16, 16],
};

// ---- Sharpedo Bluff (title screen); positions are in bluff pixels ----
const BLUFF = [3, 2, 457, 304];
const SEA = { at: [0, 104], size: [203, 200], frames: [[24, 522], [246, 522], [470, 521], [695, 523], [26, 759], [250, 759], [482, 758], [712, 756], [967, 759]] };
const FLAG = { at: [177, 54], size: [40, 59], frames: [[16, 335], [70, 340], [127, 342]], baked: 2 };

// ---- the room inside the bluff (the player's base); positions are in room pixels ----
// the crop leaves out the ragged top and right edges of the art, which are blank on the sheet
const BASE = [470, 29, 441, 239];
// (the ripper's red frame numbers poke into some of these rects; they are keyed out with the white)
const BASE_SEA = { at: [0, 72], size: [195, 176], frames: [[964, 22], [1170, 22], [1379, 22], [1590, 22], [963, 208], [1173, 208], [1386, 207], [1594, 207], [965, 397]] };
const BASE_FOUNTAIN = { at: [355, 93], frames: [[753, 295, 36, 37], [797, 295, 36, 37], [839, 295, 36, 37], [883, 295, 36, 37]] };

// ---- the dream (choosing a Pokémon): two wave bands that tile every 48 rows, drawn down both sides of the screen ----
const DREAM = { light: [28, 15, 142, 192], dark: [28, 208, 142, 192] };
export const DREAM_GLOW = 0xf7f7b5; // the flat colour behind the bands

// ---- Marowak Dojo; positions are in room pixels ----
const ROOM = [399, 15, 340, 323];
// each torch: the four flame frames on the sheet, where each sits in the room, and which one the room art already shows
const TORCHES = [
  { frames: [[199, 345, 21, 44], [235, 348, 21, 29], [269, 349, 21, 28], [301, 352, 19, 25]], at: [[159, 32], [159, 34], [159, 33], [160, 36]], baked: 3 },
  { frames: [[198, 401, 22, 42], [231, 403, 21, 26], [264, 403, 21, 27], [299, 412, 20, 20]], at: [[260, 49], [260, 49], [261, 48], [261, 55]], baked: 3 },
  { frames: [[43, 404, 27, 40], [83, 408, 22, 27], [114, 405, 25, 29], [147, 410, 25, 22]], at: [[20, 118], [21, 118], [17, 117], [17, 123]], baked: 3 },
  { frames: [[26, 456, 21, 41], [57, 467, 19, 25], [86, 464, 21, 27], [117, 470, 20, 20]], at: [[59, 50], [60, 51], [58, 48], [59, 55]], baked: 3 },
  { frames: [[195, 460, 30, 35], [234, 464, 25, 22], [269, 462, 24, 28], [305, 464, 25, 29]], at: [[293, 123], [298, 123], [299, 118], [298, 117]], baked: 1 },
];
// the pond in the boulder ring: the room art leaves a white hole exactly its shape
const POND = { at: [65, 153], frames: [[343, 256, 22, 16], [370, 256, 22, 16], [397, 255, 22, 16]] };
const BASEMENT = [751, 3, 292, 287];
const PILLAR = { frames: [[657, 318, 57, 86], [742, 316, 56, 91], [819, 318, 55, 90], [902, 319, 57, 86], [977, 319, 58, 87]], at: [[117, 70], [118, 68], [118, 68], [119, 70], [117, 69]] };
const SPRING = { frames: [[686, 443, 47, 92], [740, 442, 47, 92], [802, 442, 47, 92], [867, 439, 47, 92], [941, 436, 46, 91]], at: [[50, 71], [50, 71], [50, 71], [50, 71], [51, 72]] };
const DOJO_BG = [16, 16, 16];
export const DOJO_BACKDROP = '#101010';

// Where the animated pieces go, filled in by buildArt: key -> { x, y } of the sprite's top-left in its backdrop.
export const PLACE = {};

export function preloadArt(scene) {
  for (const [key, url] of Object.entries(SHEETS)) scene.load.image(key, url);
  for (const [path, url] of Object.entries(faces)) scene.load.image(`face-${path.split('/').pop().slice(0, -4)}`, url);
}

const blank = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d', { willReadFrequently: true })];
};

const copyOf = (scene, key) => {
  const src = scene.textures.get(key).getSourceImage();
  const [c, g] = blank(src.width, src.height);
  g.drawImage(src, 0, 0);
  return [c, g];
};

// Make one flat colour of a canvas transparent, and with `labels` the bright red of a sheet's frame numbers too.
function keyOut(g, [r, gr, b], labels = false) {
  const d = g.getImageData(0, 0, g.canvas.width, g.canvas.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    if ((p[i] === r && p[i + 1] === gr && p[i + 2] === b) || (labels && p[i] > 200 && p[i + 1] < 80 && p[i + 2] < 80)) p[i + 3] = 0;
  }
  g.putImageData(d, 0, 0);
}

// Paint over the masked pixels of a region with the nearest pixel outside the mask. `hit(data, i)` says whether a pixel is masked.
// Used to rub out a sprite that is drawn into a backdrop so its animated frames can go on top.
function rubOut(g, x0, y0, w, h, hit, pad = 6) {
  const rx = Math.max(0, x0 - pad), ry = Math.max(0, y0 - pad);
  const rw = Math.min(g.canvas.width, x0 + w + pad) - rx, rh = Math.min(g.canvas.height, y0 + h + pad) - ry;
  const d = g.getImageData(rx, ry, rw, rh), p = d.data, src = new Uint8ClampedArray(p);
  const masked = new Uint8Array(rw * rh);
  for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) masked[y * rw + x] = hit(x + rx, y + ry, src, (y * rw + x) * 4) ? 1 : 0;
  for (let y = 0; y < rh; y++)
    for (let x = 0; x < rw; x++) {
      if (!masked[y * rw + x]) continue;
      let best = Infinity, bi = -1;
      for (let v = 0; v < rh; v++)
        for (let u = 0; u < rw; u++) {
          if (masked[v * rw + u]) continue;
          const q = (u - x) ** 2 + (v - y) ** 2;
          if (q < best) { best = q; bi = (v * rw + u) * 4; }
        }
      if (bi >= 0) p.set(src.subarray(bi, bi + 4), (y * rw + x) * 4);
    }
  g.putImageData(d, rx, ry);
}

// Blank everything in a canvas that is not joined to the art at (x, y): bits of neighbouring sprites caught in a crop.
function isolate(g, x, y, [r, gr, b]) {
  const w = g.canvas.width, h = g.canvas.height, d = g.getImageData(0, 0, w, h), p = d.data;
  const art = (i) => !(p[i * 4] === r && p[i * 4 + 1] === gr && p[i * 4 + 2] === b);
  const keep = new Uint8Array(w * h), todo = [y * w + x];
  keep[todo[0]] = 1;
  while (todo.length) {
    const i = todo.pop(), cx = i % w;
    for (const j of [i - w, i + w, cx > 0 ? i - 1 : -1, cx < w - 1 ? i + 1 : -1]) {
      if (j < 0 || j >= w * h || keep[j] || !art(j)) continue;
      keep[j] = 1;
      todo.push(j);
    }
  }
  for (let i = 0; i < w * h; i++) if (!keep[i]) { p[i * 4] = r; p[i * 4 + 1] = gr; p[i * 4 + 2] = b; }
  g.putImageData(d, 0, 0);
}

// A strip texture of equally sized frames. Each frame is a sheet rect placed at `at[i]` (backdrop pixels);
// the strip's cell is the box around all of them, so the sprite never has to move between frames.
function strip(scene, key, sheetCanvas, frames, at, bg, fps, labels = false) {
  const x0 = Math.min(...at.map((p) => p[0])), y0 = Math.min(...at.map((p) => p[1]));
  const fw = Math.max(...frames.map((f, i) => at[i][0] + f[2])) - x0, fh = Math.max(...frames.map((f, i) => at[i][1] + f[3])) - y0;
  const [c, g] = blank(fw * frames.length, fh);
  frames.forEach(([x, y, w, h], i) => g.drawImage(sheetCanvas, x, y, w, h, i * fw + at[i][0] - x0, at[i][1] - y0, w, h));
  keyOut(g, bg, labels);
  const tex = scene.textures.addCanvas(key, c);
  frames.forEach((_, i) => tex.add(i, 0, i * fw, 0, fw, fh));
  if (!scene.anims.exists(key)) scene.anims.create({ key, frames: frames.map((_, i) => ({ key, frame: i })), frameRate: fps, repeat: -1 });
  PLACE[key] = { x: x0, y: y0 };
}

const WHITE = [255, 255, 255];

function buildBluff(scene) {
  const [src, sg] = copyOf(scene, 'art-bluff');
  const [c, g] = blank(BLUFF[2], BLUFF[3]);
  g.drawImage(src, -BLUFF[0], -BLUFF[1]);
  // the flag drawn into the backdrop goes; its three frames fly in its place
  const [fx, fy] = FLAG.at, [fw, fh] = FLAG.size, [bx, by] = FLAG.frames[FLAG.baked];
  const flag = sg.getImageData(bx, by, fw, fh).data;
  rubOut(g, fx, fy, fw, fh, (x, y) => {
    const u = x - fx, v = y - fy, i = (v * fw + u) * 4;
    return u >= 0 && v >= 0 && u < fw && v < fh && !(flag[i] === 255 && flag[i + 1] === 255 && flag[i + 2] === 255);
  });
  scene.textures.addCanvas('bluff', c);
  strip(scene, 'bluff-flag', src, FLAG.frames.map(([x, y]) => [x, y, fw, fh]), FLAG.frames.map(() => FLAG.at), WHITE, 5);
  // the sea frames are cut to the cliff's outline and fill the white left under it
  strip(scene, 'bluff-sea', src, SEA.frames.map(([x, y]) => [x, y, ...SEA.size]), SEA.frames.map(() => SEA.at), WHITE, 7);

  // the inner room: its sea and its fountain are white holes filled the same way
  const [r, rg] = blank(BASE[2], BASE[3]);
  rg.drawImage(src, -BASE[0], -BASE[1]);
  scene.textures.addCanvas('base', r);
  strip(scene, 'base-sea', src, BASE_SEA.frames.map(([x, y]) => [x, y, ...BASE_SEA.size]), BASE_SEA.frames.map(() => BASE_SEA.at), WHITE, 7, true);
  strip(scene, 'base-fountain', src, BASE_FOUNTAIN.frames, BASE_FOUNTAIN.frames.map(() => BASE_FOUNTAIN.at), WHITE, 6);
}

function buildDream(scene) {
  const src = scene.textures.get('art-dream').getSourceImage();
  for (const [name, [x, y, w, h]] of Object.entries(DREAM)) {
    const [c, g] = blank(w, h);
    g.drawImage(src, -x, -y);
    scene.textures.addCanvas(`dream-${name}`, c);
  }
}

function buildDojo(scene) {
  const [src, sg] = copyOf(scene, 'art-dojo');
  const [c, g] = blank(ROOM[2], ROOM[3]);
  g.drawImage(src, -ROOM[0], -ROOM[1]);
  isolate(g, 170, 180, DOJO_BG);
  TORCHES.forEach((t, n) => {
    const [bx, by, bw, bh] = t.frames[t.baked], [ax, ay] = t.at[t.baked];
    const lit = sg.getImageData(bx, by, bw, bh).data;
    rubOut(g, ax, ay, bw, bh, (x, y) => {
      const u = x - ax, v = y - ay, i = (v * bw + u) * 4;
      return u >= 0 && v >= 0 && u < bw && v < bh && !(lit[i] === DOJO_BG[0] && lit[i + 1] === DOJO_BG[1] && lit[i + 2] === DOJO_BG[2]);
    });
    strip(scene, `torch${n}`, src, t.frames, t.at, DOJO_BG, 8);
  });
  scene.textures.addCanvas('dojo', c);
  strip(scene, 'dojo-pond', src, POND.frames, POND.frames.map(() => POND.at), DOJO_BG, 4);

  // the basement has two white holes where the pillar and the spring go
  const [b, bg] = blank(BASEMENT[2], BASEMENT[3]);
  bg.drawImage(src, -BASEMENT[0], -BASEMENT[1]);
  isolate(bg, 146, 200, DOJO_BG);
  rubOut(bg, 50, 69, 112, 94, (_x, _y, p, i) => p[i] > 250 && p[i + 1] > 250 && p[i + 2] > 250, 4);
  scene.textures.addCanvas('basement', b);
  strip(scene, 'dojo-pillar', src, PILLAR.frames, PILLAR.at, DOJO_BG, 7);
  strip(scene, 'dojo-spring', src, SPRING.frames, SPRING.at, DOJO_BG, 7);
}

function buildIcons(scene) {
  const tex = scene.textures.get('art-icons');
  for (const [name, [x, y, w, h]] of Object.entries(ICONS)) tex.add(name, 0, x, y, w, h);
  const types = scene.textures.get('art-types');
  TYPES.forEach((t, i) => types.add(t, 0, (i % 6) * 14, Math.floor(i / 6) * 14, 14, 14));
}

// ---- the font: variable-width glyphs on a 15 x 13 grid, white with a black drop shadow ----
const FONT_ROWS = ['abcdefghijklm', 'nopqrstuvwxyz', 'ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ', '1234567890:+-', ',.¡!¿?‘’“”♂♀_'];
const CELL_W = 15, CELL_H = 13, GLYPH_H = 11, GLYPH_Y = 2;
// glyphs the sheet lacks, drawn in the same style (8 rows tall, cap height)
const EXTRA = {
  '/': ['...#', '...#', '..#.', '..#.', '.#..', '.#..', '#...', '#...'],
  '(': ['.#', '#.', '#.', '#.', '#.', '#.', '#.', '.#'],
  ')': ['#.', '.#', '.#', '.#', '.#', '.#', '.#', '#.'],
  '%': ['##..#', '##..#', '...#.', '..#..', '..#..', '.#...', '#..##', '#..##'],
  '>': ['....', '#...', '.#..', '..#.', '...#', '..#.', '.#..', '#...'],
  '<': ['....', '...#', '..#.', '.#..', '#...', '.#..', '..#.', '...#'],
  '=': ['....', '....', '####', '....', '....', '####', '....', '....'],
  '·': ['..', '..', '..', '##', '##', '..', '..', '..'],
};
// characters typed one way and drawn with another glyph
const ALIAS = { "'": '’', '"': '”' };

function buildFont(scene) {
  const [src, sg] = copyOf(scene, 'art-font');
  const rows = FONT_ROWS.length;
  const [c, g] = blank(CELL_W * 13, CELL_H * (rows + 2));
  g.drawImage(src, 0, 0, CELL_W * 13, CELL_H * rows, 0, 0, CELL_W * 13, CELL_H * rows);
  const cells = {}; // char -> [cellX, cellY]
  FONT_ROWS.forEach((line, r) => [...line].forEach((ch, i) => { cells[ch] = [i * CELL_W, r * CELL_H]; }));
  // é sits in the accented block, six pixels lower than the grid
  g.drawImage(src, 9 * CELL_W, 84, CELL_W, CELL_H, 0, rows * CELL_H, CELL_W, CELL_H);
  cells['é'] = [0, rows * CELL_H];
  // extra glyphs: white pixels, with the sheet's shadow rule (black to the right of and below each white pixel)
  Object.entries(EXTRA).forEach(([ch, bitmap], n) => {
    const cx = (n + 1) * CELL_W, cy = rows * CELL_H;
    const on = (x, y) => bitmap[y]?.[x] === '#';
    for (let y = 0; y <= bitmap.length; y++)
      for (let x = 0; x <= bitmap[0].length; x++) {
        if (!on(x, y) && !on(x - 1, y) && !on(x, y - 1)) continue;
        g.fillStyle = on(x, y) ? '#f8f8f8' : '#000';
        g.fillRect(cx + 4 + x, cy + 3 + y, 1, 1);
      }
    cells[ch] = [cx, cy];
  });

  const tex = scene.textures.addCanvas('pmd-font', c);
  const data = g.getImageData(0, 0, c.width, c.height).data;
  let xml = `<font><info face="pmd" size="${GLYPH_H}"/><common lineHeight="${CELL_H}" base="${GLYPH_H - 2}"/><chars>`;
  const glyph = (code, x, y, w, adv) => { xml += `<char id="${code}" x="${x}" y="${y}" width="${w}" height="${GLYPH_H}" xoffset="0" yoffset="0" xadvance="${adv}"/>`; };
  const measured = {};
  for (const [ch, [cx, cy]] of Object.entries(cells)) {
    let x0 = CELL_W, x1 = -1;
    for (let y = 0; y < GLYPH_H; y++) for (let x = 0; x < CELL_W; x++) {
      if (data[((cy + GLYPH_Y + y) * c.width + cx + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
    }
    if (x1 < 0) continue;
    measured[ch] = [cx + x0, cy + GLYPH_Y, x1 - x0 + 1];
    glyph(ch.codePointAt(0), cx + x0, cy + GLYPH_Y, x1 - x0 + 1, x1 - x0 + 1);
  }
  for (const [ch, to] of Object.entries(ALIAS)) if (measured[to]) glyph(ch.codePointAt(0), ...measured[to], measured[to][2]);
  glyph(32, 0, 0, 0, 4);
  xml += '</chars></font>';
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const font = Phaser.GameObjects.BitmapText.ParseXMLBitmapFont(doc, tex.get(), 0, 0, tex);
  scene.cache.bitmapFont.add('pmd', { data: font, texture: 'pmd-font', frame: null });
}

// Small things drawn by hand, a character per pixel ('.' is clear): one white pixel, stretched and tinted for bars,
// shades and backdrops; a white arrowhead, tinted to mark whose side a fighter is on; a padlock for moves not yet
// earned; and a mouse with its left or right button lit, for the battle HUD.
const INKS = { '#': '#0a1826', f: '#ffffff', y: '#ffd84a', g: '#8fa3b8' };
const DRAWN = {
  tag: ['#######', '#fffff#', '.#fff#.', '..#f#..', '...#...'],
  lock: ['..###..', '.#...#.', '.#...#.', '#######', '#yyyyy#', '#yy#yy#', '#yyyyy#', '#######'],
  mouseL: ['.#######.', '#yyy#ggg#', '#yyy#ggg#', '#yyy#ggg#', '#########', '#fffffff#', '#fffffff#', '#fffffff#', '.#fffff#.', '..#####..'],
  mouseR: ['.#######.', '#ggg#yyy#', '#ggg#yyy#', '#ggg#yyy#', '#########', '#fffffff#', '#fffffff#', '#fffffff#', '.#fffff#.', '..#####..'],
};

function buildPixel(scene) {
  const [p, pg] = blank(2, 2);
  pg.fillStyle = '#fff';
  pg.fillRect(0, 0, 2, 2);
  scene.textures.addCanvas('px', p);
  for (const [key, rows] of Object.entries(DRAWN)) {
    const [c, g] = blank(rows[0].length, rows.length);
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.') return;
      g.fillStyle = INKS[ch];
      g.fillRect(x, y, 1, 1);
    }));
    scene.textures.addCanvas(key, c);
  }
}

function buildFlags(scene) {
  const src = scene.textures.get('art-flags').getSourceImage();
  const [cw, ch] = FLAG_CELL, [c, g] = blank(cw * 6, ch * FLAG_COUNT);
  FLAG_FRAMES.forEach((frames, n) => frames.forEach(([x, y, w, h], i) => g.drawImage(src, x, y, w, h, i * cw, n * ch + ch - h, w, h)));
  keyOut(g, FLAG_BG);
  const tex = scene.textures.addCanvas('flags', c);
  FLAG_FRAMES.forEach((frames, n) => {
    frames.forEach((_, i) => tex.add(n * 6 + i, 0, i * cw, n * ch, cw, ch));
    scene.anims.create({ key: `flag${n}`, frames: frames.map((_, i) => ({ key: 'flags', frame: n * 6 + i })), frameRate: 7, repeat: -1 });
  });
}

export function buildArt(scene) {
  buildFont(scene);
  buildIcons(scene);
  buildPixel(scene);
  buildFlags(scene);
  buildBluff(scene);
  buildDream(scene);
  buildDojo(scene);
  for (const key of Object.keys(SHEETS)) if (key !== 'art-icons' && key !== 'art-types') scene.textures.remove(key);
}
