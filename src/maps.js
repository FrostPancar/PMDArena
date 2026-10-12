import data from './mapdata.json';
import { drawText, textWidth } from './pixelfont.js';

const mapUrls = import.meta.glob(['../maps/*.png', '!../maps/Game*'], { eager: true, query: '?url', import: 'default' });
export const WORLD_URL = mapUrls['../maps/WorldMap.png'];

const PADS = [
  ['SLEEP', 'Sleep', '#6f7fe0'], ['SPIKE', 'Hurt', '#e0564a'], ['TRIP', 'Trip', '#d9a441'],
  ['APPLE', 'Eat', '#e36a8d'], ['HOP', 'Hop', '#58c7d6'], ['SPIN', 'Rotate', '#b46fe0'],
  ['SINK', 'Sink', '#4f6f9c'], ['POSE', 'Pose', '#f0d24a'], ['ROLL', 'Tumble', '#7bcf6a'],
].map(([label, anim, color], i) => ({ label, anim, color, x: 30 + i * 48, y: 48, w: 28, h: 28 }));

const PILLARS = [[112, 162], [336, 162], [224, 150]];

// Walk zones are polygons in map pixels (a point is walkable inside any of them);
// blocks are ellipses {x,y,rx,ry} or rects {x,y,w,h} carved back out.
export const MAPS = {
  test: {
    name: 'Test Realm',
    image: 'testrealm',
    node: [35, 190],
    spawn: [240, 190],
    walk: [[[20, 40], [460, 40], [460, 300], [20, 300]]],
    block: [
      ...PILLARS.map(([x, y]) => ({ x, y: y - 20, w: 32, h: 20 })),
      { x: 240, y: 258, rx: 46, ry: 20 },
    ],
    props: PILLARS.map(([x, y]) => ({ key: 'pillar', x, y })),
    pads: PADS,
    npcs: [
      { x: 392, y: 130, ai: 'dummy' }, { x: 432, y: 195, ai: 'dummy' }, { x: 392, y: 260, ai: 'dummy' },
      { x: 80, y: 250, ai: 'wild' },
    ],
  },
};
// Stages drawn over the art in maps/; zones live in mapdata.json. `node` is the stage's spot on the world map.
for (const [id, m] of Object.entries(data)) MAPS[id] = { ...m, url: mapUrls[`../maps/${m.image}.png`] };
export const MAP_ORDER = Object.keys(MAPS).sort((a, b) => (a === 'test' ? -1 : b === 'test' ? 1 : MAPS[a].name.localeCompare(MAPS[b].name)));

function inPoly(p, x, y) {
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export const inBlock = (b, x, y) =>
  b.w !== undefined
    ? x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h
    : ((x - b.x) / b.rx) ** 2 + ((y - b.y) / b.ry) ** 2 <= 1;

export function makeWalkable(map) {
  const at = (x, y) => map.walk.some((p) => inPoly(p, x, y)) && !map.block.some((b) => inBlock(b, x, y));
  // feet are about 8px wide
  return (x, y) => at(x, y) && at(x - 4, y) && at(x + 4, y);
}

export function buildTestRealm(scene) {
  const W = 480, H = 320;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const rect = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const ellipse = (cx, cy, rx, ry, col) => {
    for (let y = -ry; y <= ry; y++) {
      const hw = Math.round(rx * Math.sqrt(1 - (y * y) / (ry * ry)));
      rect(cx - hw, cy + y, hw * 2, 1, col);
    }
  };

  rect(0, 0, W, H, '#151924');
  rect(12, 10, 456, 298, '#0b0e15');
  rect(16, 12, 448, 20, '#39415f');
  for (let x = 16; x < 464; x += 16) rect(x, 12, 1, 20, '#2b3250');
  rect(16, 21, 448, 1, '#2b3250');
  rect(16, 30, 448, 2, '#232941');
  drawText(g, 'TEST REALM', (W - textWidth('TEST REALM')) >> 1, 15, '#aab6d6');

  for (let ty = 0; ty < 17; ty++)
    for (let tx = 0; tx < 28; tx++) {
      const x = 16 + tx * 16, y = 32 + ty * 16;
      rect(x, y, 16, 16, (tx + ty) % 2 ? '#566787' : '#5d6f90');
      rect(x, y, 16, 1, '#63769a');
      rect(x, y, 1, 16, '#63769a');
    }

  for (const p of PADS) {
    rect(p.x - 1, p.y - 1, p.w + 2, p.h + 2, '#1a1f2e');
    rect(p.x, p.y, p.w, p.h, p.color);
    rect(p.x + 2, p.y + 2, p.w - 4, p.h - 4, '#00000030');
    rect(p.x + 4, p.y + 4, p.w - 8, p.h - 8, p.color);
    rect(p.x, p.y, p.w, 1, '#ffffff60');
    drawText(g, p.label, p.x + ((p.w - textWidth(p.label)) >> 1), p.y + p.h + 3, '#e8eefc');
  }

  // pond
  ellipse(240, 258, 48, 22, '#3d4a66');
  ellipse(240, 258, 45, 19, '#2f7fc4');
  ellipse(236, 255, 34, 12, '#49a1e0');
  rect(214, 250, 14, 1, '#bfe4ff'); rect(246, 262, 10, 1, '#bfe4ff');

  // sparring rings
  for (const n of MAPS.test.npcs.filter((n) => n.ai === 'dummy')) {
    ellipse(n.x, n.y, 15, 8, '#e8eefc50');
    ellipse(n.x, n.y, 13, 6, (((n.x >> 4) + (n.y >> 4)) % 2) ? '#5d6f90' : '#566787');
  }
  scene.textures.addCanvas('testrealm', c);

  const p = document.createElement('canvas');
  p.width = 32; p.height = 44;
  const pg = p.getContext('2d');
  const pr = (x, y, w, h, col) => { pg.fillStyle = col; pg.fillRect(x, y, w, h); };
  pr(0, 0, 32, 44, '#1a1f2e');
  pr(1, 1, 30, 22, '#8f9fc4'); pr(1, 1, 30, 2, '#b4c1e0'); pr(4, 5, 24, 14, '#7f90b6');
  pr(1, 24, 30, 19, '#414b6c'); pr(1, 24, 30, 2, '#2f3754');
  for (let x = 8; x < 30; x += 8) pr(x, 26, 1, 17, '#353e5c');
  scene.textures.addCanvas('pillar', p);
}

// Name tag texture for a world map node.
export function labelTexture(scene, text) {
  const key = `lbl-${text}`;
  if (scene.textures.exists(key)) return key;
  const c = document.createElement('canvas');
  c.width = textWidth(text) + 6; c.height = 11;
  const g = c.getContext('2d');
  g.fillStyle = '#10141d'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#ffe14a'; g.fillRect(0, 0, c.width, 1); g.fillRect(0, c.height - 1, c.width, 1);
  drawText(g, text, 3, 3, '#ffffff');
  scene.textures.addCanvas(key, c);
  return key;
}

export function buildFxTextures(scene) {
  const mk = (key, rows, pal) => {
    const c = document.createElement('canvas');
    c.width = rows[0].length; c.height = rows.length;
    const g = c.getContext('2d');
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }));
    scene.textures.addCanvas(key, c);
  };
  mk('leaf', ['..dd...', '.dllg..', 'dlllgd.', 'dllggd.', '.dggd..', '..dd...'], { d: '#2f6b2a', l: '#b6e86a', g: '#6fc24a' });
  mk('ember', ['..rr...', '.roor..', 'royyor.', 'royyor.', '.roor..', '..rr...'], { r: '#c8321e', o: '#f58a2a', y: '#ffe36a' });
  mk('bubble', ['..bb...', '.bllb..', 'blwllb.', 'bllllb.', '.bllb..', '..bb...'], { b: '#2a6fc4', l: '#8fd0ff', w: '#ffffff' });
  mk('flake', ['..w.w..', '.w.w.w.', '..www..', 'wwwbwww', '..www..', '.w.w.w.', '..w.w..'], { w: '#e8f8ff', b: '#8fd0ff' });
  mk('orb', ['..pp...', '.pllp..', 'plwllp.', 'pllllp.', '.pllp..', '..pp...'], { p: '#c0389a', l: '#ff9be0', w: '#ffffff' });
  mk('star', ['...y...', '..yly..', 'yylllyy', '.ylwly.', '.yylyy.', 'yy...yy'], { y: '#d9a21a', l: '#ffe66a', w: '#ffffff' });
  mk('fang', ['..bb...', '.bllb..', 'blwllb.', 'bllllb.', '.bllb..', '..bb...'], { b: '#3b3fa8', l: '#8f8cff', w: '#ffffff' });
  mk('shade', ['..kk...', '.kppk..', 'kpvppk.', 'kppppk.', '.kppk..', '..kk...'], { k: '#1b1030', p: '#5a3a8c', v: '#b48cff' });
  mk('feather', ['.....ww', '...wwgw', '..wggw.', '.wggw..', 'wgww...', 'ww.....'], { w: '#ffffff', g: '#b9c4d8' });
  mk('pebble', ['..kkk..', '.kbbbk.', 'kbbtbbk', 'kbbbbdk', '.kbddk.', '..kkk..'], { k: '#3a2c1c', b: '#a8824e', t: '#d9b98a', d: '#7a5a34' });
  mk('toxic', ['..pp...', '.pllp..', 'plwllp.', 'pllllp.', '.pllp..', '..pp...'], { p: '#5e2a8c', l: '#b66ae0', w: '#f0d0ff' });
  mk('bolt', ['...k...', '..kgk..', '.kgwgk.', 'kgwwwgk', '.kgwgk.', '..kgk..', '...k...'], { k: '#4a5262', g: '#aab4c8', w: '#ffffff' });
  mk('zap', ['...yy..', '..yly..', '.ylyyy.', 'yyyly..', '..yly..', '.yly...', '.yy....'], { y: '#c99a0e', l: '#fff27a' });
  mk('node', ['..kkk..', '.kwwwk.', 'kwwkwwk', 'kwkkkwk', 'kwwkwwk', '.kwwwk.', '..kkk..'], { k: '#1a1f2e', w: '#ffffff' });
  mk('nodeSel', ['.kkkkkkk.', 'kkyyyyykk', 'kyyyyyyyk', 'kyykkkyyk', 'kyykrkyyk', 'kyykkkyyk', 'kyyyyyyyk', 'kkyyyyykk', '.kkkkkkk.'], { k: '#1a1f2e', y: '#ffe14a', r: '#ef4444' });
  mk('spark', ['...w...', '...w...', '..www..', 'wwwwwww', '..www..', '...w...', '...w...'], { w: '#ffffff' });
}
