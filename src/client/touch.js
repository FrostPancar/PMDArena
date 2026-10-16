import './touch.css';
import { MOVES } from '../moves.js';
import { typeOf } from './moveinfo.js';
import { wipe } from './transition.js';
import { paintFrame } from './ui.js';

// On a phone the keyboard and mouse become a pad drawn over the game (touch.css): a thumb stick in the left corner
// and buttons in the right one. Which buttons depends on what the screen on top can do with them:
//   in a fight   the stick walks (it comes to wherever the thumb lands); on the right are the four moves, as wide
//                plates in the colour of their type, and three round buttons that look nothing like them: Jump, Parry
//                and Dash. Dashing is its own button so that it is never set off by a hard push of the stick.
//                A move is aimed before it is thrown: hold its button and a guide shows where it will go (at the
//                nearest foe, or wherever the button is dragged toward), let go and it goes; Parry calls the aim off.
//                Moves that are held (beams, flights, widening blasts) start on the press instead and are steered
//                by the same drag.
//   elsewhere    the stick walks or steps through a menu, with A (confirm), B (cancel) and START (menu) as needed
//   typing       a letter board (room codes, the profile name)
// Screens never talk to the pad: it reads the Actions (input.js) of whichever scene is up, so anything that works
// from the keyboard works from here. A Battle scene also answers padState() and takes padPress().
const asked = new URLSearchParams(location.search).has('touch'); // ?touch shows the pad on a desktop, for trying it
const phone = navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches;

export const touch = {
  on: asked || phone,
  stick: [0, 0], // which way the stick is pushed: a unit vector, or 0, 0
  run: false, // the Dash button is down
  held: [false, false, false, false], // the move buttons that are down
  aiming: -1, // the move whose button is being held to aim it (it goes off on release), or -1
  aim: null, // { dx, dy, reach 0..1 } once a move button has been dragged away from where it was pressed
  aimedAt: 0, // when the button being aimed with went down
  hold: false, // the last move button let go had been held, not tapped (see holdAim)
};

// A move button tapped throws its move at the nearest foe. Held for longer than this, it is being aimed by hand: the
// guide starts out ahead of the player, where a drag begins, and never at the spot a tap would have picked.
const HOLD_MS = 170;
// Is the move button now down (or the one just let go) a hold, to be aimed by hand, rather than a tap?
export const holdAim = () => (touch.aiming >= 0 ? performance.now() - touch.aimedAt >= HOLD_MS : touch.hold);

// Is this pointer press one that should act? A finger cannot hover first, so in a list that describes what is
// highlighted the first tap on a row only highlights it and the second acts. `already`: the row was highlighted.
export const tapActs = (ptr, already) => !ptr.wasTouch || already;

const M = 4; // gap to the screen edge
const MOVE_W = 64, MOVE_H = 27, GAP = 3; // the four move plates, two across
const ROUND = 32; // Jump, Parry and Dash
const LIFT = 10; // how far the buttons on the right sit above the bottom edge
const STICK = 64, RIM = 24, DEAD = 6; // the stick's art, how far it can be pushed, and how far before it counts
const AIM_DEAD = 8, AIM_SPAN = 44; // dragging a move button: where aiming starts, and the drag that is full reach
const NOTCH = 20; // of the energy bar (see Mon)
// the three round buttons: [rim, fill] and a little picture, so each reads at a glance and none is taken for a move
const ROUNDS = {
  jump: { colors: ['#d9ffd0', 'rgba(52,150,78,0.62)'], label: 'Jump', art: ['...#...', '..###..', '.#####.', '#######', '..###..', '..###..'] },
  parry: { colors: ['#e6eefa', 'rgba(64,104,190,0.62)'], label: 'Parry', art: ['#######', '#######', '#######', '.#####.', '..###..', '...#...'] },
  run: { colors: ['#fff3a0', 'rgba(196,146,36,0.62)'], label: 'Dash', art: ['#..#.....', '.#..#....', '..#..#...', '..#..#...', '.#..#....', '#..#.....'] },
  cancel: { colors: ['#ffd9d2', 'rgba(204,62,50,0.78)'], label: 'Cancel', art: ['#.....#', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '#.....#'] },
};
const REPEAT = [380, 130]; // a held direction steps a menu again after this long, then this often
const TYPE_RGB = {
  normal: '168,168,120', fire: '240,128,48', water: '104,144,240', electric: '232,192,40', grass: '120,200,80', ice: '120,200,200',
  fighting: '192,48,40', poison: '160,64,160', ground: '208,168,80', flying: '168,144,240', psychic: '248,88,136', bug: '168,184,32',
  rock: '184,160,56', ghost: '112,88,152', dragon: '112,56,248', dark: '112,88,72', steel: '160,160,192', fairy: '238,153,172',
};
const BOARD = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

let game = null, root = null, scale = 1;
const scenes = []; // every running scene's Actions, the newest last
const ui = {}; // the pad's parts, once built
let stepped = null, stepAt = 0; // the menu direction being held, and when it steps again

// Every Actions announces itself, so the pad can find the one that is up.
export function attach(actions) {
  scenes.push(actions);
  actions.scene.events.once('shutdown', () => scenes.splice(scenes.indexOf(actions), 1));
}

function current() {
  for (let i = scenes.length - 1; i >= 0; i--) if (scenes[i].scene.sys.isActive()) return scenes[i];
  return null;
}

// How many screen pixels a game pixel takes; the pad is drawn to match.
export function fit(zoom) {
  scale = zoom;
  document.documentElement.style.setProperty('--px', String(zoom));
}

export function initTouch(g) {
  game = g;
  if (!touch.on) return;
  document.body.classList.add('touch');
  const turn = document.createElement('div');
  turn.id = 'rotate';
  turn.textContent = 'Turn your phone sideways to play.';
  document.body.append(turn);
  // the page keeps still under a thumb: no pinch, no long-press menu
  for (const type of ['gesturestart', 'contextmenu', 'dblclick']) document.addEventListener(type, (e) => e.preventDefault());
  // a browser that can fills the screen and holds it sideways from the first tap on (iOS Safari can do neither;
  // there the game added to the home screen opens that way, see manifest.webmanifest)
  if (phone) {
    window.addEventListener('pointerup', () => {
      const page = document.documentElement;
      if (document.fullscreenElement || !page.requestFullscreen) return;
      page.requestFullscreen({ navigationUI: 'hide' }).then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
    }, { capture: true, once: true });
  }
  g.events.on('step', sync);
  window.addEventListener('blur', letGo);
}

// ---- drawing: every part is a small canvas in game pixels ----
const sheet = (w, h, cls) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  if (cls) c.className = cls;
  return c;
};
const u = (n) => `calc(${n}px * var(--px))`;
const edge = (n, side) => `calc(${n}px * var(--px) + env(safe-area-inset-${side}, 0px))`;

// Text in the game's font. align: 0 starts at x, 0.5 is centred on it, 1 ends at it.
function write(g, str, x, y, align = 0) {
  const font = game.cache.bitmapFont.get('pmd').data, src = game.textures.get('pmd-font').getSourceImage();
  const glyphs = [...str].map((ch) => font.chars[ch.codePointAt(0)]).filter(Boolean);
  x = Math.round(x - align * glyphs.reduce((w, c) => w + c.xAdvance, 0));
  for (const c of glyphs) {
    g.drawImage(src, c.x, c.y, c.width, c.height, x + c.xOffset, y + c.yOffset, c.width, c.height);
    x += c.xAdvance;
  }
}

// One of the button icons from the art sheet, `times` as large, centred on x, y.
function stamp(g, name, x, y, times) {
  const f = game.textures.getFrame('art-icons', name), w = f.cutWidth * times, h = f.cutHeight * times;
  g.imageSmoothingEnabled = false;
  g.drawImage(f.source.image, f.cutX, f.cutY, f.cutWidth, f.cutHeight, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
}

// A shape in the style of the window frames: a dark outline, then `colors` ring by ring inward (the last fills the rest).
function shape(c, inside, colors) {
  const { width: w, height: h } = c, g = c.getContext('2d');
  let cells = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (inside(x + 0.5, y + 0.5)) cells.push(y * w + x);
  let left = new Set(cells);
  ['#0a1826', ...colors].forEach((col, n, all) => {
    const rim = n === all.length - 1 ? cells : cells.filter((i) => [i - 1, i + 1, i - w, i + w].some((j) => !left.has(j)));
    g.fillStyle = col;
    for (const i of rim) g.fillRect(i % w, Math.floor(i / w), 1, 1);
    for (const i of rim) left.delete(i);
    cells = [...left];
  });
  return c;
}

// ---- buttons ----
// A button is a canvas that tells its handlers about one finger at a time: { down, move, up }(event, key).
function makeKey(parent, w, h, at, on = {}) {
  const el = sheet(w, h, 'key');
  Object.assign(el.style, { width: u(w), height: u(h) }, at);
  parent.append(el);
  const key = { el, g: el.getContext('2d'), w, h, pressed: false, finger: null, look: null };
  el.addEventListener('pointerdown', (e) => {
    if (key.pressed) return;
    key.pressed = true;
    key.finger = e.pointerId;
    try { navigator.vibrate?.(8); } catch { /* no buzz here */ }
    try { el.setPointerCapture(e.pointerId); } catch { /* the finger is already gone */ }
    el.classList.add('down');
    on.down?.(e, key);
  });
  el.addEventListener('pointermove', (e) => { if (key.pressed && e.pointerId === key.finger) on.move?.(e, key); });
  const release = (e) => {
    if (!key.pressed || e.pointerId !== key.finger) return;
    key.pressed = false;
    el.classList.remove('down');
    on.up?.(e, key);
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(type, release);
  return key;
}

// Redraws a button only when what it shows (`look`) has changed.
function face(key, look, paint) {
  if (key.look === look) return;
  key.look = look;
  key.g.clearRect(0, 0, key.w, key.h);
  paint(key.g);
}

const framed = (key, look, style, label, fill) => face(key, look, (g) => {
  paintFrame(g, style, key.w, key.h, fill);
  write(g, label, key.w / 2, (key.h - 11) >> 1, 0.5);
});

const shown = new Map();
function show(el, on) {
  if (shown.get(el) === on) return;
  shown.set(el, on);
  el.classList.toggle('off', !on);
}

// Whoever is up gets what the buttons do, exactly as from the keyboard.
const fire = (action) => current()?.fire(action);
const fight = (what, i) => current()?.scene.padPress?.(what, i);

function build() {
  if (!game.cache.bitmapFont.exists('pmd') || !game.textures.exists('art-icons')) return false;
  root = document.createElement('div');
  root.id = 'pad';
  // the game must not hear of fingers on the pad: Phaser also listens on the window for presses outside its canvas
  for (const type of ['touchstart', 'touchend', 'touchcancel', 'mousedown', 'mouseup']) {
    root.addEventListener(type, (e) => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); }, { passive: false });
  }
  buildStick();

  // fight: the four moves in the corner under the thumb, two by two; above them, left to right, Parry and Dash, with Jump to their lower left
  // where the thumb slides up to
  const cell = (col, row) => ({ right: edge(M + (1 - col) * (MOVE_W + GAP), 'right'), bottom: edge(LIFT + M + (1 - row) * (MOVE_H + GAP), 'bottom') });
  let from = null;
  ui.moves = [0, 1, 2, 3].map((i) => makeKey(root, MOVE_W, MOVE_H, cell(i % 2, i >> 1), {
    down: (e) => {
      touch.held[i] = true;
      touch.aim = null;
      touch.hold = false;
      touch.aimedAt = performance.now();
      from = [e.clientX, e.clientY];
      // a held move, or a press that is only a tap (a beam clash, a dance), goes at once; the rest are aimed first
      if (current()?.scene.padState?.()?.instant[i]) fight('move', i);
      else touch.aiming = i;
    },
    // dragged away from where it went down, the move is aimed along the drag instead of at the nearest foe
    move: (e) => {
      const dx = e.clientX - from[0], dy = e.clientY - from[1], d = Math.hypot(dx, dy) / scale;
      if (d > AIM_DEAD) touch.aim = { dx: dx / (d * scale), dy: dy / (d * scale), reach: Math.min(1, (d - AIM_DEAD) / AIM_SPAN) };
    },
    up: (e) => {
      touch.held[i] = false;
      if (touch.aiming !== i) return;
      touch.hold = holdAim(); // (read while the button still counts as down)
      touch.aiming = -1;
      if (e.type === 'pointerup') fight('move', i); // let go: it is thrown (a finger that was taken away throws nothing)
    },
  }));
  // above the moves, left to right: Parry, Dash; Jump sits to the lower left of the moves
  const above = LIFT + M + 2 * (MOVE_H + GAP);
  ui.run = makeKey(root, ROUND, ROUND, { right: edge(M, 'right'), bottom: edge(above, 'bottom') }, {
    down: () => { touch.run = true; },
    up: () => { touch.run = false; },
  });
  ui.jump = makeKey(root, ROUND, ROUND, { right: edge(M + 2 * (MOVE_W + GAP), 'right'), bottom: edge(LIFT + M, 'bottom') }, { down: () => fight('jump') });
  ui.parry = makeKey(root, ROUND, ROUND, { right: edge(M + ROUND + GAP, 'right'), bottom: edge(above, 'bottom') }, {
    // with a move being aimed, this calls it off instead (and with one charging, the scene does)
    down: () => { if (touch.aiming >= 0) touch.aiming = -1; else fight('parry'); },
  });

  // menus: A low in the corner, B beside it, START above
  ui.a = makeKey(root, 34, 34, { right: edge(M, 'right'), bottom: edge(LIFT + M + 18, 'bottom') }, { down: () => fire('confirm') });
  ui.b = makeKey(root, 34, 34, { right: edge(M + 36, 'right'), bottom: edge(LIFT + M, 'bottom') }, { down: () => fire('cancel') });
  ui.start = makeKey(root, 56, 30, { right: edge(M, 'right'), bottom: edge(LIFT + M + 54, 'bottom') }, { down: () => fire('menu') });
  for (const [key, name] of [[ui.a, 'btnA'], [ui.b, 'btnB'], [ui.start, 'start']]) {
    face(key, name, (g) => { paintFrame(g, 'pad', key.w, key.h); stamp(g, name, key.w / 2, key.h / 2, 2); });
  }

  // typing: the letters in keyboard order, and a key that rubs one out
  ui.board = document.createElement('div');
  ui.board.className = 'board';
  root.append(ui.board);
  const letter = (label, x, row, w, ch) => {
    const key = makeKey(ui.board, w, 22, { left: u(x), top: u(row * 23) }, { down: () => current()?.spell(ch) });
    framed(key, label, 'win', label);
  };
  BOARD.forEach((line, row) => [...line].forEach((ch, i) => letter(ch, row * 11 + i * 23, row, 22, ch)));
  letter('Del', 2 * 11 + BOARD[2].length * 23, 2, 45, null);
  // (spaces and the marks a note can use: the others are ignored by the handlers that take letters only)
  letter('Space', 11, 3, 91, ' ');
  [...'.,!?\'-'].forEach((ch, i) => letter(ch, 11 + 92 + i * 23, 3, 22, ch));

  for (const el of [ui.stick, ...ui.moves.map((k) => k.el), ui.parry.el, ui.jump.el, ui.run.el, ui.a.el, ui.b.el, ui.start.el, ui.board]) show(el, false);
  document.body.append(root);
  return true;
}

// A round button: its picture over its name, dimmed while it cannot be used.
function round(key, what, can = true) {
  const r = ROUNDS[what], c = ROUND / 2;
  face(key, `${what} ${can}`, (g) => {
    shape(key.el, (x, y) => Math.hypot(x - c, y - c) <= c - 0.5, r.colors);
    g.globalAlpha = can ? 1 : 0.4;
    g.fillStyle = r.colors[0];
    const w = r.art[0].length, x0 = Math.round(c - w / 2), y0 = 6;
    r.art.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') g.fillRect(x0 + x, y0 + y, 1, 1); }));
    write(g, r.label, c, 14, 0.5);
    g.globalAlpha = 1;
  });
}

// The stick: a ring with a nub that follows the thumb. Where it is walked with it has no fixed place: it comes to
// wherever the thumb lands in its corner. Over a menu it stays put, and a push steps the menu.
function buildStick() {
  const zone = ui.stick = document.createElement('div');
  zone.className = 'stick';
  root.append(zone);
  const c = STICK / 2;
  const base = shape(sheet(STICK, STICK, 'base'), (x, y) => Math.hypot(x - c, y - c) <= RIM + 6, ['#e6eefa', 'rgba(12,24,40,0.34)']);
  // an arrowhead toward each side
  const g = base.getContext('2d');
  g.fillStyle = 'rgba(230,238,250,0.8)';
  for (const [ax, ay] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
    for (let k = 0; k < 4; k++) for (let s = -k; s <= k; s++) g.fillRect(Math.floor(c + ax * (25 - k) + ay * s), Math.floor(c + ay * (25 - k) + ax * s), 1, 1);
  }
  const nub = shape(sheet(24, 24, 'nub'), (x, y) => Math.hypot(x - 12, y - 12) <= 11.5, ['#e6eefa', 'rgba(150,190,235,0.7)']);
  zone.append(base, nub);

  let finger = null, mid = null, home = null, off = [0, 0];
  const place = (dx, dy) => {
    base.style.transform = `translate(${off[0]}px, ${off[1]}px)`;
    nub.style.transform = `translate(${off[0] + dx}px, ${off[1] + dy}px)`;
  };
  const push = (e) => {
    const dx = (e.clientX - mid[0]) / scale, dy = (e.clientY - mid[1]) / scale, d = Math.hypot(dx, dy);
    touch.stick = d < DEAD ? [0, 0] : [dx / d, dy / d];
    const k = Math.min(1, RIM / (d || 1)) * scale;
    place(dx * k, dy * k);
  };
  zone.addEventListener('pointerdown', (e) => {
    if (finger !== null) return;
    finger = e.pointerId;
    try { zone.setPointerCapture(finger); } catch { /* the finger is already gone */ }
    if (!home) { const r = base.getBoundingClientRect(); home = [r.left + r.width / 2, r.top + r.height / 2]; }
    // walked with: the stick's middle is where the thumb came down (kept clear of the screen's edges)
    const z = zone.getBoundingClientRect(), pad = (RIM + 8) * scale, floats = root.classList.contains('roam');
    mid = floats ? [Math.min(z.right - pad, Math.max(z.left + pad, e.clientX)), Math.min(z.bottom - pad, Math.max(z.top + pad, e.clientY))] : home;
    off = [mid[0] - home[0], mid[1] - home[1]];
    push(e);
  });
  zone.addEventListener('pointermove', (e) => { if (e.pointerId === finger) push(e); });
  ui.rest = () => {
    finger = null;
    touch.stick = [0, 0];
    off = [0, 0];
    base.style.transform = nub.style.transform = '';
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) zone.addEventListener(type, (e) => { if (e.pointerId === finger) ui.rest(); });
  window.addEventListener('resize', () => { home = null; });
}

// Nothing is held any more: the window lost focus, or the buttons that were down have gone.
function letGo() {
  ui.rest?.();
  touch.held.fill(false);
  touch.run = false;
  touch.aiming = -1;
  stepped = null;
}

// ---- every frame: show the buttons that do something right now ----
function sync() {
  if (!root && !build()) return;
  const a = wipe.busy ? null : current(), top = a?.top;
  const state = a?.scene.padState?.() ?? null; // a fight in progress
  const steer = !!state || !!(top && (top.steer || top.up || top.down || top.left || top.right));
  const typing = !state && !!top?.type;
  // the d-pad stays as it is through a screen change, so a thumb held on it walks on through a doorway
  if (!wipe.busy) {
    root.classList.toggle('fight', !!state);
    root.classList.toggle('roam', !!state || !!top?.steer);
    show(ui.stick, steer && !typing);
    if (!steer && (touch.stick[0] || touch.stick[1])) ui.rest();
  }
  if (!state) { if (touch.held.some(Boolean)) touch.held.fill(false); touch.run = false; touch.aiming = -1; }

  ui.moves.forEach((key, i) => {
    const id = state?.moves[i], mv = MOVES[id];
    show(key.el, !!mv);
    if (!mv) return;
    const can = state.stamina >= mv.cost, hot = state.hot === i || touch.aiming === i, type = typeOf(id);
    // the colour of its type, faded while there is not the energy for it; lit while it is aimed, charged or held
    const fill = `rgba(${TYPE_RGB[type] ?? TYPE_RGB.normal},${hot ? 0.88 : can ? 0.62 : 0.14})`;
    face(key, `${id} ${can} ${hot}`, (g) => {
      paintFrame(g, hot ? 'padHot' : 'pad', key.w, key.h, fill);
      g.globalAlpha = can || hot ? 1 : 0.45;
      // its name, on two lines if it is two words too long for one
      const words = mv.name.split(' '), wide = (str) => [...str].reduce((w, ch) => w + (game.cache.bitmapFont.get('pmd').data.chars[ch.codePointAt(0)]?.xAdvance ?? 0), 0);
      const lines = words.length > 1 && wide(mv.name) > key.w - 8 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [mv.name];
      lines.forEach((line, n) => write(g, line, key.w / 2, (lines.length > 1 ? 2 : 6) + n * 10, 0.5));
      // what it costs, in notches of the energy bar: a small pip is half of one
      const pips = mv.cost / NOTCH;
      g.fillStyle = '#ffe45c';
      for (let k = 0; k < Math.ceil(pips); k++) g.fillRect(key.w - 7 - k * 5, key.h - 6, k + 1 > pips ? 2 : 4, 3);
      g.globalAlpha = 1;
    });
  });
  for (const key of [ui.parry, ui.jump, ui.run]) show(key.el, !!state);
  if (state) {
    // while a move is being aimed or is charging, the parry button calls it off instead
    round(ui.parry, state.hot >= 0 || touch.aiming >= 0 ? 'cancel' : 'parry');
    round(ui.jump, 'jump', state.stamina >= 2 * NOTCH);
    round(ui.run, 'run', state.stamina >= NOTCH / 2 || state.running);
  }

  show(ui.a.el, !state && !!top?.confirm);
  show(ui.b.el, !state && !!top?.cancel);
  show(ui.start.el, !state && !!top?.menu);
  show(ui.board, typing);

  // in a menu a push steps once, and again and again while it is held
  const [x, y] = touch.stick;
  const way = !a || state || (!x && !y) ? null : Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : y > 0 ? 'down' : 'up';
  const now = performance.now();
  if (way !== stepped) {
    stepped = way;
    stepAt = now + REPEAT[0];
    if (way) a.fire(way);
  } else if (way && now >= stepAt) {
    stepAt = now + REPEAT[1];
    a.fire(way);
  }
}
