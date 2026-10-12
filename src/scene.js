import Phaser from 'phaser';
import { SPECIES_ORDER, preloadSprites, finalizeSprites } from './sprites.js';
import { MAPS, WORLD_URL, makeWalkable, inBlock, buildTestRealm, buildFxTextures, labelTexture } from './maps.js';
import { SPECIES } from './sprites.js';
import { Mon, dirVec, dirFromVec, DIR_NAMES, RUN_MULT } from './mon.js';
import { STATUS_SHEET_URL, DECOY_SHEET_URL, buildStatusIcons, buildDecoy } from './statusfx.js';
import { MOVES, PARRY, CANCEL, EMPOWER, POWERUP, LEECH, SPRINT, STATUS, TAGS, DANCE, HEAL, KIND_LABEL, HEAL_LIMIT, healsOnly, movesOf, preloadMoves, grayFrames, ensureMove, moveReady } from './moves.js';

export const VIEW_W = 384, VIEW_H = 216;
export const WALK_SPEED = 62;

// What a basic action does on its hit frame(s). Frames default to the sheet's HitFrame.
// Distance from a point to the segment a-b.
const segDist = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay, u = Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(px - ax - dx * u, py - ay - dy * u);
};
// The simulation advances in fixed steps, whatever the display's frame rate: the same inputs then give the same fight on every
// machine, which is what any tighter kind of online sync is built on. See NETCODE.md.
export const STEP = 1 / 60;
// A small seeded generator (mulberry32): every random roll in a fight comes from this, so a shared seed gives shared luck.
const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const BEAM_SPEED = 420, BEAM_STEP = 5; // how fast a beam travels outward (px/s), and the spacing of the points along it
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V']; // the pixel font has no digits
// Game feel: everything here is for the eye only (flashes, shakes, the camera's manner) and changes nothing in the fight
// itself, so it can be switched off whole (`on`) or piece by piece without touching how anything plays.
export const FEEL = { on: true, impact: true, shake: true, heavy: true, clashShake: true, camera: true, shatter: true };
const HEAVY_HIT = 28; // damage from which a hit gets the full-screen treatment (so does any move tagged heavy)
const DETECT_STUN = 0.7; // seconds a foe that hit a Detect is stunned
const WEB_SNARE = 2; // seconds a web holds what steps into it
const LUNGE_REACH = 14; // how much further out a lunging melee move lands
const DART = 9; // a shove of v px/s carries a mon v / 9 px before it dies away (see Mon.update), so this times the distance is the shove
export const COMBAT = {
  Attack: { kind: 'melee', dmg: 10 },
  Strike: { kind: 'melee', dmg: 10 },
  Double: { kind: 'melee', dmg: 6, frames: [4, 10] },
  Swing: { kind: 'radial', dmg: 8 },
  Shoot: { kind: 'shot', dmg: 6 },
};

export const KEYS = {
  KeyJ: 'Attack', KeyK: 'Shoot', KeyU: 'Double', KeyI: 'Charge',
  KeyP: 'Rotate', KeyZ: 'Sleep', KeyX: 'Sit', KeyC: 'Pose', KeyV: 'Eat', KeyN: 'Nod', KeyM: 'Dance',
};

const SHOT = {
  grass: 'leaf', fire: 'ember', water: 'bubble', psychic: 'orb', normal: 'star',
  dragon: 'fang', dark: 'shade', flying: 'feather', ground: 'pebble', poison: 'toxic', steel: 'bolt', bug: 'toxic',
  electric: 'zap', fighting: 'star', rock: 'pebble', fairy: 'star',
};

// Move effects and stage art: by far the most files. The player client loads these behind its title screen.
// lazy: the moves' art is left to be loaded as fights need it (the player client; see moves.js)
export function loadStages(scene, lazy = false) {
  preloadMoves(scene, lazy);
  for (const m of Object.values(MAPS)) if (m.url) scene.load.image(m.image, m.url);
  scene.load.image('worldmap', WORLD_URL);
}

export class Boot extends Phaser.Scene {
  constructor() { super('boot'); }
  preload() {
    this.loadingBar();
    this.loadCore();
    loadStages(this);
  }
  loadingBar() {
    const g = this.add.graphics();
    this.load.on('progress', (v) => {
      g.clear().fillStyle(0x262e3f).fillRect(VIEW_W / 2 - 61, VIEW_H / 2 - 4, 122, 8);
      g.fillStyle(0x8fd14f).fillRect(VIEW_W / 2 - 60, VIEW_H / 2 - 3, Math.round(120 * v), 6);
    });
  }
  // What the mons themselves need, and all that build() draws on.
  // sprites: every mon's sheets now (the tools), or none, each being loaded when a screen first needs it (the game)
  loadCore(sprites = true) {
    if (sprites) preloadSprites(this);
    this.load.image('status-sheet', STATUS_SHEET_URL);
    this.load.image('decoy-sheet', DECOY_SHEET_URL);
  }
  create() {
    this.build();
    this.scene.start('world');
  }
  // Textures made from what was loaded; the player client's boot scene reuses this.
  build() {
    finalizeSprites(this);
    buildTestRealm(this);
    buildFxTextures(this);
    buildStatusIcons(this);
    buildDecoy(this);
  }
}

// Stage select: every map is a node on the world map.
export class World extends Phaser.Scene {
  constructor() { super('world'); }

  init(data) { this.sel = data.from ?? 'test'; }

  create() {
    this.add.image(0, 0, 'worldmap').setOrigin(0);
    this.nodes = Object.entries(MAPS).map(([id, m]) => ({ id, name: m.name, x: m.node[0], y: m.node[1], img: this.add.image(m.node[0], m.node[1], 'node').setDepth(5) }));
    this.label = this.add.image(0, 0, 'node').setDepth(20);
    this.avatar = this.add.sprite(0, 0, 'node').setDepth(10);
    this.tweens.add({ targets: this.nodes.map((n) => n.img), alpha: 0.55, yoyo: true, repeat: -1, duration: 600 });
    const cam = this.cameras.main;
    cam.setBounds(0, 0, 480, 320).setRoundPixels(true);
    this.select(this.sel, true);
    cam.startFollow(this.avatar, true, 0.15, 0.15);
    cam.centerOn(this.avatar.x, this.avatar.y);

    const kb = this.input.keyboard;
    kb.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');
    const DIR = { ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0], ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1] };
    kb.on('keydown', (e) => {
      if (DIR[e.code]) this.step(...DIR[e.code]);
      else if (e.repeat) return;
      else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyF') this.enter();
      else if (e.code === 'KeyQ' || e.code === 'KeyE') this.cycleCharacter(e.code === 'KeyE' ? 1 : -1);
    });
    // click a node to select it, click it again to enter
    this.input.on('pointerdown', (ptr) => {
      ptr.updateWorldPoint(cam);
      const near = this.nodes.map((n) => [Math.hypot(n.x - ptr.worldX, n.y - ptr.worldY), n]).sort((a, b) => a[0] - b[0])[0];
      if (near[0] > 16) return;
      if (near[1].id === this.sel) this.enter();
      else this.select(near[1].id);
    });
    this.game.events.emit('character', this.speciesId());
    this.game.events.emit('moves', null);
  }

  speciesId() { return SPECIES[this.registry.get('species')] ? this.registry.get('species') : SPECIES_ORDER[0]; }

  setCharacter(id) {
    if (!SPECIES[id]) return;
    this.registry.set('species', id);
    this.game.events.emit('character', id);
    this.select(this.sel, true);
  }

  cycleCharacter(step) {
    const n = SPECIES_ORDER.length;
    this.setCharacter(SPECIES_ORDER[(SPECIES_ORDER.indexOf(this.speciesId()) + step + n) % n]);
  }

  // Move the selection to the closest node in a direction.
  step(dx, dy) {
    const cur = this.nodes.find((n) => n.id === this.sel);
    let best = null, score = Infinity;
    for (const n of this.nodes) {
      const vx = n.x - cur.x, vy = n.y - cur.y, along = vx * dx + vy * dy, d = Math.hypot(vx, vy);
      if (n === cur || along < d * 0.45) continue;
      const s = d / (along / d);
      if (s < score) { score = s; best = n; }
    }
    if (best) this.select(best.id);
  }

  select(id, snap = false) {
    this.sel = id;
    const node = this.nodes.find((n) => n.id === id);
    for (const n of this.nodes) n.img.setTexture(n === node ? 'nodeSel' : 'node');
    const sp = SPECIES[this.speciesId()], idle = sp.anims.Idle;
    this.avatar.setTexture(`a-${idle.key}`, 0);
    const ax = node.x, ay = node.y - 8 - sp.foot;
    this.tweens.killTweensOf(this.avatar);
    if (snap) this.avatar.setPosition(ax, ay);
    else this.tweens.add({ targets: this.avatar, x: ax, y: ay, duration: 180, ease: 'Sine.easeOut' });
    this.label.setTexture(labelTexture(this, node.name));
    const lw = this.label.width / 2;
    this.label.setPosition(Phaser.Math.Clamp(node.x, lw + 2, 478 - lw), node.y > 290 ? node.y - 30 : node.y + 13);
    this.game.events.emit('map', 'world', id);
    this.game.events.emit('hud', {
      map: 'World Map', character: sp.name, move: '-', state: 'choosing a stage', anim: '-', frame: '-', dir: '-',
      pos: node.name, hp: 1, maxHp: 1, stamina: 1, maxStamina: 1, pad: '-',
    });
  }

  goto(id) { if (MAPS[id]) this.scene.start('play', { map: id }); }
  enter() { this.goto(this.sel); }
}

export class Play extends Phaser.Scene {
  // the player client's Battle scene extends this under its own key
  constructor(key = 'play') { super(key); }

  init(data) {
    this.mapId = data.map ?? 'test';
    this.map = MAPS[this.mapId];
    this.walkable = makeWalkable(this.map);
    // the fight's own clock, dice and timers (see tick): nothing in the simulation reads the wall clock
    this.seed = data.seed ?? ((Date.now() ^ (Math.random() * 0x7fffffff)) | 0);
    this.rand = seeded(this.seed);
    this.tickN = 0;
    this.simMs = 0;
    this.timers = [];
    this.acc = 0;
  }

  // Run something `ms` of simulated time from now. Use this, not this.time.delayedCall, for anything that affects the fight.
  after(ms, fn) {
    this.timers.push({ at: this.simMs + ms, fn });
  }

  // Sweep the floor: every shot, zone, wall, beam and effect in play goes, and every timer waiting to go off with them.
  // The mons are left as they stand (revive them afterwards).
  clearField() {
    const gone = (list, kill) => { for (const q of list) kill(q); };
    gone(this.zones, (z) => { z.img.destroy(); z.webG?.destroy(); });
    gone(this.shots, (q) => q.img.destroy());
    gone(this.holds, (h) => h.img.destroy());
    gone(this.decoys, (c) => c.m.destroy());
    gone(this.fields, (f) => { f.t = 0; }); // their looping art watches this
    gone(this.steers, (k) => { k.on = false; });
    gone(this.beams, (b) => b.g.destroy());
    gone(this.auras, (q) => q.imgs.forEach((i) => i.destroy()));
    gone(this.pillars, (q) => q.img.destroy());
    gone(this.bits, (q) => q.img.destroy());
    gone(this.dives, (q) => q.h.img.destroy());
    gone(this.walls, (w) => w.g.destroy());
    for (const k of ['zones', 'traps', 'shots', 'holds', 'dashes', 'decoys', 'actives', 'pendings', 'grips', 'stances', 'fields', 'clashes', 'auras',
      'bits', 'cuts', 'dives', 'arcs', 'flurries', 'volleys', 'vanishes', 'threads', 'pillars', 'whips', 'beams', 'walls', 'leaps', 'steers', 'timers']) this[k] = [];
    this.lineG.clear();
    this.shadeT = 0;
    this.shade.setAlpha(0);
    for (const m of [this.player, ...this.npcs]) {
      Object.assign(m, { hidden: false, under: false, braced: false, bide: null, dance: null, fuse: null, torment: null, tether: null, lastMove: null, rep: null, bond: 0,
        endure: 0, detect: 0, webbed: 0, stun: 0, hop: 0, chill: null, locked: null, acro: null, roost: 0, grip: 0 });
    }
  }

  // A number that sums up where the fight stands: two clients running the same fight in step get the same one, tick for tick.
  // Compared across clients it tells exactly when they drift apart (nothing compares it yet; see NETCODE.md).
  stateHash() {
    let h = 2166136261 ^ this.tickN;
    const mix = (n) => { h = Math.imul(h ^ (Math.round(n * 10) | 0), 16777619); };
    for (const m of [this.player, ...this.npcs]) { mix(m.x); mix(m.y); mix(m.hp); mix(m.stamina); mix(m.dir); mix(m.status ? m.status.kind.length + m.status.t : 0); }
    for (const q of this.shots) { mix(q.x); mix(q.y); mix(q.dmg); }
    mix(this.zones.length); mix(this.traps.length); mix(this.walls.length); mix(this.beams.length);
    return h >>> 0;
  }

  create() {
    this.buildStage();
    this.spawnNpcs();
    this.bindInput();
    this.game.events.emit('map', this.mapId);
    this.emitCharacter();
  }

  // The map, the player and everything the frame loop keeps track of.
  buildStage() {
    const bg = this.bg = this.add.image(0, 0, this.map.image).setOrigin(0);
    for (const p of this.map.props ?? []) this.add.image(p.x, p.y, p.key).setOrigin(0, 1).setDepth(10 + p.y);
    this.debug = this.add.graphics().setDepth(8000);
    this.marks = this.add.graphics().setDepth(6); // ground indicators for where moves will land
    this.showZones = this.registry.get('showZones') ?? false;
    this.hits = [];
    this.shots = [];
    this.fx = [];
    this.chargeFx = [];
    this.dashes = [];
    this.holds = [];
    this.zones = [];
    this.traps = [];
    this.actives = []; // hit circles that stay live for a while, hitting each mon once
    this.decoys = []; // Double Team copies
    this.pendings = []; // spots where a delayed move is about to land
    this.grips = []; // bites in progress: biter and bitten held together
    this.stances = []; // defensive stances being held
    this.fields = []; // circles (or lanes) on the ground that buff or heal whoever of the caster's side stands in them
    this.beams = []; // held beams being fired
    this.clashes = []; // pairs of beams locked together
    this.arcs = []; // mons being flung, pulled or dropped from one spot to another
    this.flurries = []; // Close Combat in progress
    this.volleys = []; // bursts of shots still being fired one by one (Bullet Seed)
    this.vanishes = []; // mons gone from sight on their way to reappear (Shadow Sneak, Phantom Force)
    this.threads = []; // String Shot threads between two mons
    this.pillars = []; // rocks left standing as cover
    this.lastUsed = null; // the last move anyone fired, for Copycat
    this.lineG = this.add.graphics().setDepth(9); // threads and whips
    this.whips = [];
    this.cuts = []; // slashes in mid-swing, cutting whatever light shot enters their arc
    this.bits = []; // loose pieces flying off: the halves of a cut shot, Snore's spray
    this.dives = []; // flyers on their way back down
    this.auras = []; // the orbs circling a Psychic being held
    this.walls = []; // Reflect and Light Screen walls
    this.leaps = []; // mons in the air on their way to a spot (Bounce)
    this.steers = []; // Kinesis in use: the user's latest shot is being bent toward the aim
    this.shade = this.add.rectangle(0, 0, bg.width, bg.height, 0x05060f).setOrigin(0).setDepth(5).setAlpha(0); // dims the map under the mons
    this.shadeT = this.shadeDur = 0;
    this.padOn = null;

    const [sx, sy] = this.map.spawn;
    this.player = new Mon(this, sx, sy, { team: 'p', species: this.registry.get('species') });
    this.player.move = this.equipped();
    this.npcs = [];

    const cam = this.cameras.main;
    cam.setBounds(0, 0, bg.width, bg.height).setRoundPixels(true);
    cam.startFollow(this.player.sprite, true, 0.2, 0.2);
    cam.centerOn(sx, sy);

    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,F');
    this.input.keyboard.addCapture('SPACE');
  }

  spawnNpcs() {
    (this.map.npcs ?? this.scatterNpcs(this.bg.width, this.bg.height)).forEach((n, i) => this.addNpc(n.x, n.y, n.ai, i));
  }

  bindInput() {
    this.input.keyboard.on('keydown', (e) => {
      if (e.repeat) return;
      if (e.code === 'KeyK') this.basicShot(null);
      else if (e.code === 'KeyL') this.parry(this.player);
      else if (KEYS[e.code]) { if (!(this.player.ailment.noAttack && COMBAT[KEYS[e.code]])) { this.player.aim = null; this.player.act(KEYS[e.code]); } }
      else if (e.code === 'Space') this.jump();
      else if (e.code === 'KeyF') this.useMove(this.player, null);
      else if (e.code === 'KeyG') this.cycleMove(1);
      else if (e.code === 'KeyB') this.toggleZones();
      else if (e.code === 'KeyT') this.spawnRival();
      else if (e.code === 'KeyR') this.reset();
      else if (e.code === 'KeyQ' || e.code === 'KeyE') this.cycleCharacter(e.code === 'KeyE' ? 1 : -1);
      else if (e.code === 'Escape') this.toWorld();
      else if (/^Digit\d$/.test(e.code)) this.setMove(movesOf(this.player.species.id)[(+e.code[5] + 9) % 10]);
    });

    // left click: basic shot at the cursor; right click: equipped move at the cursor
    this.input.mouse.disableContextMenu();
    this.input.on('pointerdown', (ptr) => {
      // ptr.button is the button of this press; the held-down state would still report a held right button
      if (ptr.button === 2) this.useMove(this.player, 'pointer');
      else if (ptr.button === 0 && !this.clashTap(this.player) && !this.cancelMove(this.player)) this.basicShot('pointer');
    });
    this.input.on('wheel', (_p, _o, _dx, dy) => this.cycleMove(dy > 0 ? 1 : -1));
  }

  // ---- characters and equipped moves ----
  equipped(id = this.player.species.id) {
    const set = movesOf(id), saved = this.registry.get('equip')?.[id];
    return set.includes(saved) ? saved : set[0];
  }

  emitCharacter() {
    const p = this.player;
    this.game.events.emit('character', p.species.id);
    this.game.events.emit('moves', p.species.id, p.move);
  }

  setCharacter(id) {
    this.player.setSpecies(id);
    this.registry.set('species', this.player.species.id);
    this.player.move = this.equipped();
    this.emitCharacter();
  }

  cycleCharacter(step) {
    const n = SPECIES_ORDER.length, i = SPECIES_ORDER.indexOf(this.player.species.id);
    this.setCharacter(SPECIES_ORDER[(i + step + n) % n]);
  }

  setMove(id) {
    const p = this.player;
    if (!movesOf(p.species.id).includes(id) || p.ailment.encore) return;
    p.move = id;
    this.registry.set('equip', { ...this.registry.get('equip'), [p.species.id]: id });
    this.game.events.emit('moves', p.species.id, id);
  }

  cycleMove(step) {
    const set = movesOf(this.player.species.id);
    this.setMove(set[(set.indexOf(this.player.move) + step + set.length) % set.length]);
  }

  addNpc(x, y, ai, i = this.npcs.length) {
    // rivals and dummies are the characters you are not playing; dummies are greyed out
    const others = SPECIES_ORDER.filter((s) => s !== this.player.species.id);
    const species = (others.length ? others : SPECIES_ORDER)[i % (others.length || 1)];
    const tint = ai === 'dummy' ? 0xb9c0cf : null;
    const set = movesOf(species);
    const m = new Mon(this, x, y, {
      team: 'n', ai, tint, species, hp: ai === 'dummy' ? 60 : 40, power: 0.8, move: set[Math.floor(this.rand() * set.length)],
    });
    this.npcs.push(m);
    return m;
  }

  goto(id) { if (MAPS[id] && id !== this.mapId) this.scene.restart({ map: id }); }
  toWorld() { this.scene.start('world', { from: this.mapId }); }

  // Maps without hand-placed npcs get two rivals and a dummy on random walkable spots away from the spawn.
  scatterNpcs(w, h) {
    const out = [], [sx, sy] = this.map.spawn;
    for (let i = 0; i < 600 && out.length < 3; i++) {
      const x = this.rand() * w, y = this.rand() * h;
      if (!this.walkable(x, y) || !this.walkable(x - 10, y) || !this.walkable(x + 10, y) || !this.walkable(x, y + 6)) continue;
      if (Math.hypot(x - sx, y - sy) < 70 || out.some((o) => Math.hypot(o.x - x, o.y - y) < 45)) continue;
      out.push({ x, y, ai: out.length < 2 ? 'wild' : 'dummy' });
    }
    return out;
  }
  reset() { this.scene.restart({ map: this.mapId }); }

  toggleZones() {
    this.showZones = !this.showZones;
    this.registry.set('showZones', this.showZones);
    this.game.events.emit('zones', this.showZones);
  }

  spawnRival() {
    const p = this.player;
    for (let i = 0; i < 40; i++) {
      const a = this.rand() * Math.PI * 2, r = 50 + this.rand() * 40;
      const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r * 0.7;
      if (this.walkable(x, y)) return this.addNpc(x, y, 'wild').wake();
    }
  }

  // ---- input actions ----
  inputDir() {
    const k = this.keys;
    return [(k.D.isDown || k.RIGHT.isDown) - (k.A.isDown || k.LEFT.isDown), (k.S.isDown || k.DOWN.isDown) - (k.W.isDown || k.UP.isDown)];
  }

  // Is the player holding the run button?
  sprinting() { return this.keys.SHIFT.isDown; }

  jump() {
    const [vx, vy] = this.inputDir();
    return this.player.jump(vx, vy, WALK_SPEED * (this.player.running ? RUN_MULT : 1.15));
  }

  // Aim from a mon toward the mouse, another mon, or (null) straight ahead.
  aimOf(m, track) {
    let tx, ty;
    if (m.remote && m.net && typeof track !== 'object') { tx = m.net.ax; ty = m.net.ay; } // where its owner is aiming
    else if (track === 'pointer') {
      const ptr = this.input.activePointer;
      ptr.updateWorldPoint(this.cameras.main);
      tx = ptr.worldX; ty = ptr.worldY + 4;
    } else if (track) { tx = track.x; ty = track.y; }
    let dx = (tx ?? m.x) - m.x, dy = (ty ?? m.y) - m.y, dist = Math.hypot(dx, dy);
    if (dist < 1) { [dx, dy] = dirVec(m.dir); dist = track ? 1 : 60; }
    else { dx /= dist; dy /= dist; }
    return { dx, dy, dist };
  }

  // Basic shot toward the cursor or (track null) straight ahead. Mons without a Shoot sheet throw with their Attack.
  basicShot(track) {
    const p = this.player;
    if (!p.grounded || p.stuck || p.ailment.noAttack) return;
    const aim = track ? this.aimOf(p, track) : null;
    if (aim) p.dir = dirFromVec(aim.dx, aim.dy);
    const anim = p.species.anims.Shoot ? 'Shoot' : 'Attack';
    if (!p.act(anim)) return;
    p.aim = aim;
    p.forceShot = anim !== 'Shoot';
  }

  // Parry: a quick swing opens a short window in which the next hit is blocked and pays stamina back.
  parry(m) {
    if (!m.grounded || m.stuck || m.parryCd > 0 || m.stamina < PARRY.cost) return false;
    m.spend(PARRY.cost);
    m.parryCd = PARRY.cooldown;
    m.parry = PARRY.window;
    const swing = m.species.anims.Swing ? 'Swing' : 'Attack';
    if (!m.act(swing)) return true;
    m.mute = true;
    m.flash = 0.15;
    // the twinkle is centred on the middle of the swing, out in front of the user like a melee strike
    const fps = 45, mid = m.anim.durs.reduce((s, d) => s + d, 0) / 120, [dx, dy] = dirVec(m.dir);
    const x = Math.round(m.x + dx * 24), y = Math.round(m.y + dy * 18);
    this.after(Math.max(0, mid - CANCEL.frames.length / fps / 2) * 1000, () => {
      if (!m.alive) return;
      const img = this.add.image(x, y - 8, CANCEL.frames[0]).setDepth(60 + Math.max(y, m.y));
      this.fx.push({ img, frames: CANCEL.frames, t: 0, fps });
    });
    return true;
  }

  parried(m) {
    m.stamina = Math.min(m.maxStamina, m.stamina + PARRY.gain);
    m.exhausted = false;
    m.flash = 0.4; // as long as the blocker stays untouchable
    if (FEEL.on && FEEL.shake) this.cameras.main.shake(130, 0.006, true);
    const img = this.add.image(m.x, m.y - 8, PARRY.hitFrames[0]);
    this.fx.push({ img, frames: PARRY.hitFrames, t: 0, fps: 30, follow: m, lift: 8 });
  }

  // ---- equipped moves ----
  // Start charging the equipped move. Stamina drains during the wind-up, then the move goes off.
  useMove(m, track) {
    const mv = MOVES[m.move];
    if (mv && !ensureMove(this, mv)) return false; // its art is still on the way (a move nobody brought to this fight)
    if (this.clashTap(m)) return false; // locked in a beam clash: any move button is a push
    if (m.dance) { this.danceTap(m); return false; } // dancing: any move button is a step
    if (mv?.asleep) {
      // only in its sleep: Sleep Talk blurts out one of the user's other moves, Snore is the move itself
      const cost = mv.cost;
      if (m.status?.kind !== 'sleep' || !m.alive || m.stamina < cost) return false;
      const pool = movesOf(m.species.id).map((id) => MOVES[id]).filter((q) => q && !q.asleep && !q.selfStatus && !q.grow && !q.fuse && q.kind !== 'hold' && q.kind !== 'beam' && moveReady(this, q));
      const pick = mv.asleep === 'talk' ? pool[Math.floor(this.rand() * pool.length)] : mv;
      if (!pick) return false;
      m.spend(cost);
      this.fireMove(m, pick, { ...this.aimOf(m, track), track });
      return true;
    }
    if (mv?.string) {
      // a thread already out: this use gives it a yank
      const th = this.threads.find((q) => q.a === m);
      if (th && m.stamina >= 8 && !m.stuck) {
        m.spend(8);
        const d = Math.hypot(m.x - th.t.x, m.y - th.t.y) || 1, k = Math.min(mv.string.yank, Math.max(0, d - 16));
        if (!th.t.ingrain) this.arcs.push({ m: th.t, x0: th.t.x, y0: th.t.y, to: { x: th.t.x + ((m.x - th.t.x) / d) * k, y: th.t.y + ((m.y - th.t.y) / d) * k }, t: 0, dur: 0.15, h: 0 });
        return true;
      }
    }
    // a chain dash that connected has earned the next one for nothing
    const free = !!mv?.chain && m.acro?.mv === mv;
    if (!mv || !m.grounded || m.stuck || m.ailment.noMove || (m.ailment.noStatus && mv.cls === 'status')) return false;
    if (m.torment && m.lastMove === mv) return false; // tormented: not the same move twice running
    // a move that costs more each time it is repeated
    const reps = mv.repeat && m.rep?.mv === mv ? m.rep.n : 0, cost = mv.cost * (1 + (mv.repeat ?? 0) * reps);
    if (!free && m.stamina < cost) return false;
    if (mv.sub && (m.sub || m.hp <= m.maxHp * mv.hpCost)) return false;
    if (healsOnly(mv) && (m.healsUsed ?? 0) >= HEAL_LIMIT) { if (m === this.player) this.popup(m, 'NO HEALS LEFT'); return false; } // spent for this match
    if (mv.dream && !this.targets.some((t) => t.team !== m.team && t.alive && t.status?.kind === 'sleep')) return false; // nobody is asleep to feed on // already a doll, or not enough health to make one
    if (mv.element && m.locks[mv.element] > 0) return false; // locked out of that element for now
    if (m.beaming || ((mv.fly || mv.leap) && (m.roost > 0 || this.heavy(m)))) return false; // busy with a beam, or grounded
    if (mv.repeat) m.rep = { mv, n: reps + 1, t: 4 };
    if (mv.fuse) {
      // lit: it goes off on its own in a moment, and the user is free to walk until then
      m.spend(cost);
      m.fuse = { mv, t: mv.fuse, track };
      return true;
    }
    m.walk(0, 0);
    m.state = 'windup';
    // a spot-landing move is committed to where it was aimed when the charge began
    // a cycling move may charge for a different time on each step
    const step = mv.cycle?.[(m.cycles[mv.name] ?? 0) % mv.cycle.length];
    // a combo move used again right after the last one comes out at once
    const chain = mv.combo && m.ramp?.mv === mv && m.ramp.t > 0;
    m.windup = { mv, t: 0, track, free, cost, charge: chain || free ? 0.02 : step?.charge ?? mv.charge, aim: mv.kind === 'mid' || mv.kind === 'blink' || mv.lob ? this.aimOf(m, track) : null };
    if (mv.chargeFrames.length) {
      const img = this.add.image(m.x, m.y - 8, mv.chargeFrames[0]).setDepth(60 + m.y).setScale(mv.chargeScale ?? 1).setOrigin(...(mv.chargeOrigin ?? [0.5, 0.5]));
      this.chargeFx.push({ img, m, w: m.windup, frames: mv.chargeFrames });
    }
    // moves that land on a spot are wound up with a spin, the rest with the charge pose
    const spin = (mv.kind === 'mid' || mv.lob) && m.species.anims.Rotate;
    m.setAnim(m.species.anims[mv.chargeAnim] ? mv.chargeAnim : spin ? 'Rotate' : m.species.anims.Charge ? 'Charge' : 'Idle', 'loop');
    return true;
  }

  // Would a rival's equipped move reach a target d px away?
  wantsMove(m, d) {
    const mv = MOVES[m.move];
    if (!mv || m.stamina < mv.cost) return false;
    if (mv.kind === 'self') {
      // heal when hurt, shield when the foe is close, buff when not already buffed
      if (mv.random) return d < 110;
      if (mv.decoys) return d < 100 && !this.decoys.some((q) => q.owner === m);
      if (mv.sub) return !m.sub && m.hp > m.maxHp * 0.5 && d < 90;
      if (mv.heal || mv.ingrain || mv.regen) return m.hp < m.maxHp * 0.6 && (m.healsUsed ?? 0) < HEAL_LIMIT;
      if (mv.shield) return d < 45 && m.shield <= 0;
      if (!mv.buff) return mv.empower ? !m.charged && d < 80 : !!m.status;
      return mv.buff.stat === 'random' ? this.rand() < 0.3 : m.mul(mv.buff.stat) === 1;
    }
    if (mv.sucker) return d < mv.range && this.player.state === 'windup';
    if (mv.dream) return this.targets.some((t) => t.team !== m.team && t.alive && t.status?.kind === 'sleep');
    if (mv.catch) return this.shots.some((q) => q.owner.team !== m.team && Math.hypot(q.x - m.x, q.y - m.y) < 110); // only with something to catch
    if (mv.kind === 'dash') return d < mv.dash;
    if (mv.kind === 'hold') return d < 120;
    if (mv.kind === 'melee') return d < mv.reach + mv.radius;
    if (mv.kind === 'aoe') return d < (mv.grow ? mv.grow.max * 0.7 : mv.radius);
    return d > 22 && d < (mv.length ?? Math.min(mv.range ?? 100, 120));
  }

  // Is the button behind a held move still down? Right mouse for one aimed with the pointer, F for one aimed
  // straight ahead; a rival (track is its target) lets go after a moment.
  holding(m, track, t) {
    if (m.remote) return !!m.net?.h; // a fighter run by another client: its owner says whether the button is still down
    return track === 'pointer' ? this.input.activePointer.rightButtonDown() : track ? t < 0.9 : this.keys.F.isDown;
  }

  cancelWindup(m) {
    m.windup = null;
    m.applyTint();
    m.toIdle();
  }

  // Call off a charging or held move with a twinkle; stamina already spent stays spent.
  cancelMove(m) {
    if (m.state === 'windup') this.cancelWindup(m);
    else if (m.state === 'bird') m.toIdle(); // updateHolds tidies the art up
    else return false;
    m.flash = 0.15;
    const img = this.add.image(m.x, m.y - 12, CANCEL.frames[0]);
    this.fx.push({ img, frames: CANCEL.frames, t: 0, fps: 30, follow: m, lift: 12 });
    return true;
  }

  // Sparks on a mon whose next attack is boosted, until the boost is spent.
  empowered(m) {
    const img = this.add.image(m.x, m.y - 14, EMPOWER.frames[0]);
    this.fx.push({ img, frames: EMPOWER.frames, t: 0, fps: 16, follow: m, lift: 14, loopWhile: () => m.charged && m.alive });
  }

  // One tick of Leech Seed: sprouts and damage on the seeded mon, sparkles and health for the one that planted it.
  leechTick(t, l) {
    const art = (m, frames, lift) => this.fx.push({ img: this.add.image(m.x, m.y - lift, frames[0]), frames, t: 0, fps: lift ? 40 : 10, follow: m, lift });
    art(t, LEECH.seededFrames, 0);
    if (t.hp <= 1) return;
    t.hp = Math.max(1, t.hp - l.dps);
    if (!l.owner.alive) return;
    l.owner.heal(l.dps);
    art(l.owner, LEECH.healFrames, 10);
  }

  // A substitute doll just absorbed a hit: it goes up in smoke.
  subBroke(m) {
    const frames = MOVES.substitute.frames;
    this.fx.push({ img: this.add.image(m.x, m.y - 8, frames[0]).setDepth(60 + m.y), frames, t: 0, fps: 24 });
  }

  // Give a mon a status condition; its icon is drawn by the mon.
  inflict(t, kind) {
    t.setStatus(kind);
  }

  // Where a spot-landing move comes down for a given aim (the same answer the indicator shows).
  landSpot(m, mv, aim) {
    if (mv.kind === 'auto') {
      const near = this.nearestFoe(m, m.x, m.y, mv.range);
      // a leading move lands where the target is heading, not where it stands
      const k = mv.lead ?? 0;
      if (near) return { x: near.x + near.vel.x * k, y: near.y + near.vel.y * k, foe: near };
    }
    const d = mv.kind === 'melee' ? mv.reach + (mv.lunge === false ? 0 : LUNGE_REACH) : mv.fixed ?? Phaser.Math.Clamp(aim.dist, 24, mv.range);
    const h = mv.hitReach ?? d;
    if (mv.lead && mv.kind === 'mid') {
      // aimed close to a foe, a leading move comes down where that foe is heading
      const x = m.x + aim.dx * d, y = m.y + aim.dy * d, foe = this.nearestFoe(m, x, y, 36);
      if (foe) return { x: foe.x + foe.vel.x * mv.lead, y: foe.y + foe.vel.y * mv.lead };
    }
    return { x: m.x + aim.dx * d, y: m.y + aim.dy * d, hx: m.x + aim.dx * h, hy: m.y + aim.dy * h };
  }

  // Ground rings: where the player's equipped move would land, and where any charging move is about to.
  drawMarks() {
    const g = this.marks.clear();
    const ring = (x, y, r, color, alpha) => {
      g.fillStyle(color, alpha * 0.22).fillEllipse(x, y, r * 2, (r * 2) / 1.3);
      g.lineStyle(1, color, alpha).strokeEllipse(x, y, r * 2, (r * 2) / 1.3);
    };
    // a move that is on its way down: the ring pulses until it lands
    for (const q of this.pendings) {
      if (!q.mine && q.age < (q.hide ?? 0)) continue; // not shown to the foe yet
      ring(q.x, q.y, q.r, q.mine ? 0xffffff : 0xff5a4a, 0.5 + 0.4 * Math.sin(q.t * 18));
    }
    // Mean Look: the circle its target is held inside; Destiny Bond: threads to the foes it would take along
    for (const t of this.targets) {
      if (t.tether && t.alive) g.lineStyle(1, 0xff5fa2, 0.8).strokeEllipse(t.tether.to.x, t.tether.to.y, t.tether.r * 2, (t.tether.r * 2) / 1.3);
      // Destiny Bond: the two shadows are joined along the ground
      if (t.bondTo?.m.alive && t.alive) { const q = t.bondTo.m; g.lineStyle(3, 0x1a0b2e, 0.75).lineBetween(t.x, t.y, q.x, q.y); g.lineStyle(1, 0x9d6bff, 0.5 + 0.4 * Math.sin(t.bondTo.t * 12)).lineBetween(t.x, t.y, q.x, q.y); }
      // Dragon Dance: a ring closing on the dancer, tight on the beat

    }
    // a reticle under whoever is locked on to
    for (const t of this.targets) if (t.locked && t.alive) { g.lineStyle(1, 0xff5fa2, 0.9).strokeEllipse(t.x, t.y, 22, 17).strokeEllipse(t.x, t.y, 12, 9); }
    for (const m of [this.player, ...this.npcs]) {
      const w = m.state === 'windup' ? m.windup : null;
      const mine = m === this.player;
      const mv = w ? w.mv : mine && m.grounded ? MOVES[m.move] : null;
      if (!mv) continue;
      // the ring takes the colour of the move's answer type; a plain strike is white (yours) or red
      const color = mv.tag && mv.tag !== 'strike' ? TAGS[mv.tag].color : mine ? 0xffffff : 0xff5a4a, alpha = w ? 0.9 : 0.4;
      if (w && mv.tag && mv.tag !== 'strike') ring(m.x, m.y, 9, color, 0.9); // and one under the user, for moves with no landing spot
      if (mv.grow) {
        if (w) ring(m.x, m.y, w.radius ?? mv.grow.min, color, alpha);
      } else if (mv.kind === 'mid' || mv.kind === 'auto') {
        const s = this.landSpot(m, mv, w?.aim ?? this.aimOf(m, w ? w.track : 'pointer'));
        ring(s.hx ?? s.x, s.hy ?? s.y, mv.radius, color, alpha);
      } else if (mv.kind === 'blink') {
        const s = this.blinkSpot(m, mv, w?.aim ?? this.aimOf(m, 'pointer'));
        ring(s.x, s.y, mv.radius, color, alpha);
      } else if (mv.lob) {
        const a = w?.aim ?? this.aimOf(m, 'pointer'), d = Phaser.Math.Clamp(a.dist, 30, mv.range);
        ring(m.x + a.dx * d, m.y + a.dy * d, mv.burst, color, alpha);
      } else if (mv.kind === 'aoe' && w && !mv.dream) ring(m.x, m.y, mv.radius, color, alpha);
      else if (mv.kind === 'melee' && w) {
        const s = this.landSpot(m, mv, this.aimOf(m, w.track));
        ring(s.hx, s.hy, mv.radius, color, 0.5);
      }
    }
    for (const f of this.fields) {
      const a = 0.35 + 0.15 * Math.sin(f.t * 6);
      if (!f.lane) { ring(f.x, f.y, f.r, 0x7ee787, a); continue; }
      const px = -f.dy * f.half, py = f.dx * f.half * 0.77, ex = f.x + f.dx * f.len, ey = f.y + f.dy * f.len;
      const pts = [{ x: f.x + px, y: f.y + py }, { x: ex + px, y: ey + py }, { x: ex - px, y: ey - py }, { x: f.x - px, y: f.y - py }];
      g.fillStyle(0x7ee787, a * 0.22).fillPoints(pts, true).lineStyle(1, 0x7ee787, a).strokePoints(pts, true);
    }
  }

  updateWindup(m, dt) {
    const w = m.windup;
    if (!w || m.state !== 'windup') return;
    const aim = w.aim ?? this.aimOf(m, w.track);
    m.dir = dirFromVec(aim.dx, aim.dy);
    const g = w.mv.grow;
    if (g) {
      // held charge: the zone keeps growing (and costing stamina) until the button is let go
      const held = this.holding(m, w.track, w.t);
      w.t += dt;
      // a cycling charge swings between its smallest and largest; the rest only grow
      if (g.random) {
        // starts anywhere and lurches to a new size several times a second
        if ((w.jump = (w.jump ?? 0) - dt) <= 0) { w.jump = 0.12 + this.rand() * 0.22; w.goal = g.min + this.rand() * (g.max - g.min); w.radius ??= w.goal; }
        w.radius += (w.goal - w.radius) * Math.min(1, dt * 14);
      } else w.radius = g.cycle ? g.min + (g.max - g.min) * Math.abs(Math.sin(w.t * g.rate)) : Math.min(g.max, g.min + g.rate * w.t);
      if (g.cycle || g.random || w.radius < g.max) m.spend(g.upkeep * dt);
      m.sprite.setTint(Math.floor(w.t * 24) % 2 ? 0xfff0a0 : 0xffffff);
      if (held && m.stamina > 0) return;
      aim.radius = w.radius;
    } else if (w.mv.catch) {
      // held: enemy shots that enter the circle hang there; let go and they are thrown where the user is aiming now
      const c = w.mv.catch, charge = w.mv.charge, held = this.holding(m, w.track, w.t);
      if (c.drift && w.aim) {
        // the field is not fixed where it was first aimed: it drifts after the aim, slowly
        const range = w.mv.range ?? 100, at = (a) => { const d = Phaser.Math.Clamp(a.dist, 24, range); return [m.x + a.dx * d, m.y + a.dy * d]; };
        const [px, py] = at(w.aim), [tx, ty] = at(this.aimOf(m, w.track)), gap = Math.hypot(tx - px, ty - py);
        if (gap > 0.5) {
          const k = Math.min(1, (c.drift * dt) / gap), vx = px + (tx - px) * k - m.x, vy = py + (ty - py) * k - m.y, l = Math.hypot(vx, vy) || 1;
          w.aim = { dx: vx / l, dy: vy / l, dist: l };
        }
      }
      const spot = this.landSpot(m, w.mv, w.aim ?? aim);
      if (w.t < charge) m.spend((w.mv.cost * Math.min(dt, charge - w.t)) / charge);
      w.t += dt;
      for (const q of this.shots) {
        if (!q.caught && !q.arc && q.owner.team !== m.team && Math.hypot(q.x - spot.x, (q.y - spot.y) * 1.3) <= w.mv.radius + q.r) { q.caught = { m, w }; this.sayShot(q, 'caught', m); }
      }
      const mine = this.shots.filter((q) => q.caught?.w === w);
      if (w.t > charge) m.spend(c.upkeep * (1 + mine.length) * dt);
      m.sprite.setTint(Math.floor(w.t * 24) % 2 ? 0xffb0f0 : 0xffffff);
      if (w.t < charge || (held && m.stamina > 0 && w.t < c.max)) return;
      if (mine.length) {
        const a = this.aimOf(m, w.track), tx = m.x + a.dx * a.dist, ty = m.y + a.dy * a.dist;
        for (const q of mine) {
          const d = Math.hypot(tx - q.x, ty - q.y) || 1, v = (q.speed ?? 170) * 1.3;
          this.turnShot(q, m, ((tx - q.x) / d) * v, ((ty - q.y) / d) * v);
        }
        m.windup = null;
        m.applyTint();
        m.toIdle();
        m.dir = dirFromVec(a.dx, a.dy);
        m.mute = m.act('Shoot');
        return;
      }
      return this.cancelWindup(m); // nothing was caught: it just ends
    } else if (w.mv.ritual) {
      // held ritual: a stack every step, until the button is let go or the last stack is in
      const rt = w.mv.ritual, held = this.holding(m, w.track, w.t);
      w.t += dt;
      const n = Math.min(rt.max, Math.floor(w.t / rt.step));
      if (n < rt.max) m.spend(rt.upkeep * dt);
      if (n > (w.stacks ?? 0)) { w.stacks = n; this.popup(m, ROMAN[n]); }
      m.sprite.setTint(Math.floor(w.t * 24) % 2 ? 0xfff0a0 : 0xffffff);
      if (held && m.stamina > 0 && n < rt.max) return;
      if (!n) return this.cancelMove(m); // let go before the first stack
      aim.stacks = n;
    } else {
      const charge = w.charge ?? w.mv.charge;
      // a move with no charge time is paid for at once
      const cost = w.cost ?? w.mv.cost;
      if (!w.free) m.spend(charge > 0 ? (cost * Math.min(dt, charge - w.t)) / charge : w.t ? 0 : cost);
      w.t += dt;
      m.sprite.setTint(Math.floor(w.t * 24) % 2 ? 0xfff0a0 : 0xffffff);
      if (w.t < charge) return;
    }
    m.windup = null;
    m.applyTint();
    m.toIdle();
    aim.track = w.track;
    // paralysis: now and then the move just does not come out
    if (this.rand() < (STATUS[m.status?.kind]?.fizzle ?? 0)) return this.spark(m.x, m.y - 12);
    let mv = w.mv;
    if (mv.copy) {
      // Copycat: whatever was used last, by anyone
      mv = this.lastUsed;
      if (!mv) return this.spark(m.x, m.y - 12);
    }
    if (mv.random) {
      // Metronome: some other move comes out instead, named over the user's head
      const pool = Object.values(MOVES).filter((q) => !q.random && !q.grow && q.kind !== 'hold' && moveReady(this, q)); // (of the moves whose art is in)
      this.fx.push({ img: this.add.image(m.x, m.y - 26, mv.frames[0]).setScale(mv.scale ?? 1), frames: mv.frames, t: 0, fps: mv.fps ?? 30, follow: m, lift: 26 });
      mv = pool[Math.floor(this.rand() * pool.length)];
      if (this.registry.get('callouts') === false) this.popup(m, mv.name.toUpperCase());
    }
    // a melee move waits for the lunge to reach full stretch before it lands
    const lunge = mv.kind === 'melee' && mv.lunge !== false;
    // it darts in first: carried there over the swing when the hit waits for the lunge, at once when it does not
    if (mv.step && !m.stuck) {
      if (lunge) { m.kx = aim.dx * mv.step * DART; m.ky = aim.dy * mv.step * DART; m.dartT = 0.16; } else m.slide(aim.dx * mv.step, aim.dy * mv.step);
    }
    if (!lunge) this.fireMove(m, mv, aim);
    if (mv.kind !== 'self' || mv.userAnim) m.mute = m.act(mv.userAnim ?? (mv.kind === 'melee' ? 'Attack' : 'Shoot'));
    // a slash cuts for the whole of its swing, not just the instant it lands
    if (mv.cut) this.cuts.push({ m, mv, aim, t: m.state === 'action' ? m.anim.durs.reduce((a, b) => a + b, 0) / 60 : 0.25 });
    if (lunge && m.mute) m.pending = { mv, aim };
    else if (lunge) this.fireMove(m, mv, aim);
  }

  // Ramping moves (Fury Cutter) hit harder with each use in a row, up to four steps.
  rampOf(m, mv) {
    if (!mv.ramp) return 1;
    const n = m.ramp && m.ramp.mv === mv && m.ramp.t > 0 ? m.ramp.n : 0;
    m.ramp = { mv, n: Math.min(n + 1, 4), t: mv.combo ?? 3 };
    if (n && mv.combo) this.popup(m, `COMBO ${ROMAN[n + 1]}`, this.registry.get('callouts') !== false ? 12 : 0); // clear of the move's own name
    return 1 + mv.ramp * n;
  }

  // A word that pops up over a mon and fades.
  // (lift: how much higher than usual, for a second label over the same mon)
  popup(m, text, lift = 0) {
    const tag = this.add.image(Math.round(m.x), Math.round(m.y) - 40 - lift, labelTexture(this, text)).setDepth(9500);
    this.tweens.add({ targets: tag, y: tag.y - 10, alpha: 0, delay: 400, duration: 300, onComplete: () => tag.destroy() });
  }

  // Is there a clear line between two mons? Only the map's solid blocks get in the way.
  sight(a, b) {
    const blocks = this.map?.block ?? [], n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6);
    for (let i = 1; i < n; i++) {
      const x = a.x + ((b.x - a.x) * i) / n, y = a.y + ((b.y - a.y) * i) / n;
      if (blocks.some((q) => inBlock(q, x, y))) return false;
    }
    return true;
  }

  // Where a teleport move puts its user: toward the aim, pulled back to the last walkable spot.
  blinkSpot(m, mv, aim) {
    let d = Math.min(aim.dist, mv.range);
    while (d > 0 && !this.walkable(m.x + aim.dx * d, m.y + aim.dy * d)) d -= 4;
    d = Math.max(0, d);
    return { x: m.x + aim.dx * d, y: m.y + aim.dy * d };
  }

  // Is this mon standing in a Gravity zone? Nobody can jump there.
  heavy(m) {
    return this.zones.some((z) => z.mv.gravity && Math.hypot(m.x - z.x, (m.y - z.y) * 1.3) <= z.mv.radius + 7);
  }

  fireMove(m, mv, aim) {
    grayFrames(this, mv);
    if ((mv.volley || mv.stream) && !aim.one) {
      // a volley or a stream: this only starts it; the shots follow one by one (updateVolleys), each fired through here as `one`
      m.lastMove = mv;
      if (this.registry.get('callouts') !== false) this.popup(m, mv.name.toUpperCase());
      if (!m.remote) this.volleys.push({ m, mv, track: aim.track, left: mv.volley?.n ?? Infinity, wait: 0, t: 0 }); // (a puppet's shots come from its owner one by one)
      return;
    }
    const { dx, dy } = aim;
    m.lastAim = aim;
    m.lastMove = mv;
    if (this.registry.get('callouts') !== false && !aim.one) this.popup(m, mv.name.toUpperCase()); // every move is called out, unless turned off
    if (mv.dirFrames) mv = { ...mv, frames: mv.dirFrames[dirFromVec(dx, dy)], rotate: false }; // art drawn for each facing: the one along the aim
    if (mv.selfFrames?.length) this.fx.push({ img: this.add.image(m.x, m.y - 12, mv.selfFrames[0]).setScale(mv.selfScale ?? 1), frames: mv.selfFrames, t: 0, fps: 60, follow: m, lift: 12 });
    if (!mv.copy && !mv.random) this.lastUsed = mv;
    // metal shots caught with Magnet Pull are thrown with the next move
    if (!mv.magnet && !m.remote) for (const q of this.shots) if (q.orbit?.m === m) { q.orbit = null; this.turnShot(q, m, dx * (q.speed || 200), dy * (q.speed || 200)); }
    if (mv.tag === 'curse' && mv.kind === 'auto') {
      // a curse needs its target in range and in plain view, or it fizzles
      const foe = this.nearestFoe(m, m.x, m.y, mv.range);
      if (!foe || !this.sight(m, foe)) return this.spark(m.x, m.y - 12);
    }
    if (mv.dream) {
      // wherever they are, every sleeping foe is fed on: the screen darkens, each takes the hit, and the user is healed by it
      const prey = this.targets.filter((t) => t.team !== m.team && t.alive && t.status?.kind === 'sleep');
      if (!prey.length) return this.spark(m.x, m.y - 12);
      this.shadeT = this.shadeDur = 0.9;
      const power = mv.dmg * m.power * m.mul('atk') * (m.charged ? 2 : 1);
      if (m.charged) m.setCharged(false);
      for (const t of prey) {
        this.fx.push({ img: this.add.image(Math.round(t.x), Math.round(t.y) - 8, mv.frames[0]).setDepth(60 + t.y), frames: mv.frames, t: 0, fps: mv.fps ?? 30 });
        this.after(250, () => t.alive && this.hitCircle(m, t.x, t.y, 6, power, { ...mv, radius: 6 }));
      }
      return;
    }
    if (mv.sucker) {
      // only lands on a foe caught charging a move: the user is on it in an instant. Otherwise it fizzles and costs double.
      const foe = this.targets.filter((t) => t.team !== m.team && t.alive && t.state === 'windup' && Math.hypot(t.x - m.x, t.y - m.y) <= mv.range)
        .sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y))[0];
      if (!foe) { m.spend(mv.cost); return this.spark(m.x, m.y - 12); }
      const d = Math.hypot(foe.x - m.x, foe.y - m.y) || 1, ux = (foe.x - m.x) / d, uy = (foe.y - m.y) / d;
      Object.assign(m, this.blinkSpot(m, { range: Math.max(0, d - 16) }, { dx: ux, dy: uy, dist: d }));
      m.face(foe.x, foe.y);
    }
    if (mv.reverse) {
      // the nearest enemy shot in range is turned on its owner; with none about, the move goes off as usual
      const q = this.shots.filter((x) => x.owner.team !== m.team && !x.arc && Math.hypot(x.x - m.x, x.y - m.y) <= mv.range)
        .sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y))[0];
      if (q) {
        this.fx.push({ img: this.add.image(Math.round(q.x), Math.round(q.y) - 8, mv.frames[0]).setDepth(60 + q.y).setScale(0.6), frames: mv.frames, t: 0, fps: mv.fps ?? 30 });
        if (!m.remote) this.turnShot(q, m, -q.vx * 1.3, -q.vy * 1.3); // its owner's client picks the shot and says which
        return;
      }
    }
    if (mv.hpCost) m.hp = Math.max(1, m.hp - m.maxHp * mv.hpCost);
    if (mv.cleanse) for (const b of Object.values(m.buffs)) if (b.mul < 1) b.t = 0;
    const big = m.charged;
    // a held charge that also builds power: weakest at its smallest, strongest fully grown
    const g = mv.grow, grown = g?.power && aim.radius ? Phaser.Math.Linear(g.power[0], g.power[1], (aim.radius - g.min) / (g.max - g.min)) : 1;
    // Eruption: from 40% of its power on its last legs to 120% at full health
    const hpK = mv.hpScale ? 0.4 + (0.8 * m.hp) / m.maxHp : 1;
    // Reversal, Flail: the worse hurt, the harder they hit
    const low = mv.lowHp ? 1 + mv.lowHp * (1 - m.hp / m.maxHp) : 1;
    const dmg = (mv.dmg ?? 0) * m.power * m.mul('atk') * (big ? 2 : 1) * this.rampOf(m, mv) * grown * hpK * low * (mv.spdScale ? m.mul('spd') : 1); // (Electro Ball hits harder the faster its user)
    if (mv.selfDebuff) m.addBuff(mv.selfDebuff.stat, mv.selfDebuff.mul, mv.selfDebuff.time);
    if (big) m.setCharged(false);
    const angle = Math.atan2(dy, dx);
    if (mv.lockOut) m.locks[mv.lockOut.element] = mv.lockOut.time;
    // a second piece of art that plays once with the move: on the user, or on the spot for moves that land on one
    const extra = (x, y) => mv.addFrames.length && this.fx.push({ img: this.add.image(Math.round(x), Math.round(y) - 8, mv.addFrames[0]).setDepth(61 + y).setScale(mv.addScale ?? 1), frames: mv.addFrames, t: 0, fps: mv.addFps ?? 24 });
    const onSpot = mv.kind === 'mid' || mv.kind === 'auto' || mv.kind === 'aoe' || mv.kind === 'melee';
    if (!onSpot) extra(m.x, m.y);
    const drained = () => {}; // draining is part of what a landed hit does (onHit)

    if (mv.bonus && this.rand() < mv.bonus.chance) {
      // a lucky power-up for the user shortly after the move goes off
      this.after(380, () => {
        if (!m.alive) return;
        m.addBuff(mv.bonus.buff.stat, mv.bonus.buff.mul, mv.bonus.buff.time);
        if (mv.bonusFrames.length) {
          const img = this.add.image(m.x, m.y - 8, mv.bonusFrames[0]).setScale(mv.bonus.scale ?? 1);
          this.fx.push({ img, frames: mv.bonusFrames, t: 0, fps: 30, follow: m, lift: 8 });
        }
      });
    }

    if (mv.puff) {
      // a spray of little stars thrown out all round the user
      for (let k = 0; k < mv.puff; k++) {
        const a = (k / mv.puff) * Math.PI * 2 + this.rand() * 0.4, v = 60 + this.rand() * 60;
        this.bits.push({ img: this.add.image(m.x, m.y - 10, 'star').setDepth(7000), vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.75, spin: 5, t: 0, life: 0.45 + this.rand() * 0.2 });
      }
    }
    if (mv.grapple) {
      // the whip runs out along the aim: the first foe it reaches is dragged in, or, meeting a wall, it hauls the user there
      let foe = null, end = mv.grapple, wall = false;
      for (let d = 10; d <= mv.grapple && !foe && !wall; d += 5) {
        const x = m.x + dx * d, y = m.y + dy * d;
        foe = this.targets.find((t) => t.team !== m.team && t.alive && !t.under && !t.airborne && Math.hypot(t.x - x, (t.y - y) * 1.3) < 11) ?? null;
        if (foe || !this.walkable(x, y)) { end = d; wall = !foe; }
      }
      this.whips.push({ m, x: m.x + dx * end, y: m.y + dy * end, t: mv.meet ? 0.32 : 0.22, color: mv.tint ?? 0x6ee06e });
      if (foe) {
        if (this.hitCircle(m, foe.x, foe.y, 8, dmg, mv) && foe.alive && !foe.ingrain) {
          foe.kx = foe.ky = 0;
          if (mv.meet) {
            // the vine hauls both ends in: user and foe meet in the middle
            const half = Math.hypot(foe.x - m.x, foe.y - m.y) / 2;
            this.arcs.push({ m: foe, x0: foe.x, y0: foe.y, to: this.blinkSpot(m, { range: half + 9 }, { dx, dy, dist: half + 9 }), t: 0, dur: 0.22, h: 0 });
            this.arcs.push({ m, x0: m.x, y0: m.y, to: this.blinkSpot(m, { range: Math.max(0, half - 9) }, { dx, dy, dist: half }), t: 0, dur: 0.22, h: 0 });
          } else this.arcs.push({ m: foe, x0: foe.x, y0: foe.y, to: this.blinkSpot(m, { range: 20 }, { dx, dy, dist: 20 }), t: 0, dur: 0.2, h: 0 });
        }
      } else if (wall && end > 26) this.arcs.push({ m, x0: m.x, y0: m.y, to: this.blinkSpot(m, { range: end - 8 }, { dx, dy, dist: end }), t: 0, dur: 0.2, h: 0 });
      return;
    }

    if (mv.flurry) {
      // rooted, punching for as long as the button is held
      m.braced = true;
      m.state = 'loop';
      m.setAnim(m.species.anims.Attack ? 'Attack' : 'Idle', 'loop');
      this.flurries.push({ m, mv, t: 0, n: 0, next: 0, dx, dy, track: aim.track, dmg });
      return;
    }

    if (mv.kind === 'blink') {
      // a burst where the user was, another where it reappears, and a small hit there
      const burst = () => this.fx.push({ img: this.add.image(Math.round(m.x), Math.round(m.y) - 8, mv.frames[0]).setDepth(60 + m.y), frames: mv.frames, t: 0, fps: mv.fps ?? 30 });
      if (mv.vanish) {
        // gone: nothing can find it until it comes back up
        burst();
        const spot = this.blinkSpot(m, mv, aim), foe = mv.vanish.behind ? this.nearestFoe(m, spot.x, spot.y, 40) : null;
        Object.assign(m, { state: 'bird', hidden: true, under: true });
        if (foe) this.pendings.push({ x: foe.x, y: foe.y, r: 12, t: mv.vanish.time, mine: m === this.player, age: 0, follow: foe });
        this.vanishes.push({ m, mv, t: 0, x0: m.x, y0: m.y, spot, foe, dmg, track: aim.track, burst });
        return;
      }
      if (mv.leap) {
        // jumps there in plain sight, out of reach on the way, and comes down with the hit
        m.state = 'dash';
        this.leaps.push({ m, mv, x0: m.x, y0: m.y, to: this.blinkSpot(m, mv, aim), t: 0, dmg, burst });
        return;
      }
      burst();
      Object.assign(m, this.blinkSpot(m, mv, aim));
      burst();
      if (mv.dmg) this.hitCircle(m, m.x, m.y, mv.radius, dmg, mv); // (Teleport only moves)
      return;
    }

    if (mv.kind === 'hold') {
      // the user becomes the art and flies for as long as the button is held
      const img = this.add.image(m.x, m.y - 8, mv.frames[0]).setScale(mv.scale ?? 1);
      m.state = 'bird';
      m.hidden = !mv.ride; // a ridden move (Surf) keeps the user in view on top of the art
      if (mv.dig) {
        // goes under in a burst of rock
        m.under = true;
        img.setVisible(false); // nothing marks where it is but the rubble it leaves
        this.digBurst(m, mv);
      }
      if (mv.fly) {
        // takes off: the mon is drawn high above its shadow and nothing but a swatting move can touch it
        m.under = m.flying = true; // the bird shoots up out of sight; from then on the mon is only its shadow
        if (mv.tintFill !== undefined) img.setTintFill(mv.tintFill);
      }
      this.holds.push({ m, mv, img, t: 0, track: aim.track, dmg, a: angle, n: 0 });
      return;
    }

    if (mv.kind === 'dash') {
      // the user vanishes and rushes along the aim; the art follows it
      const img = this.add.image(m.x, m.y - 8, mv.frames[0]);
      this.fx.push({ img, frames: mv.frames, t: 0, fps: mv.fps ?? 30, follow: m, lift: 8 });
      m.state = 'dash';
      m.setAnim('Walk', 'loop'); // seen rushing, legs going, trailing afterimages
      m.animRate = 2.4;
      // each link of a chain is quicker than the last
      const n = mv.chain && m.acro?.mv === mv ? m.acro.n : 0, dur = mv.dur * 0.8 ** n, v = mv.dash / dur;
      m.acro = null;
      if (n) this.popup(m, ROMAN[n + 1], this.registry.get('callouts') !== false ? 12 : 0);
      this.dashes.push({ m, vx: dx * v, vy: dy * v, t: 0, hit: false, mv, dmg, dur, n, x0: m.x, y0: m.y });
      return;
    }

    if (mv.kind === 'self') {
      // heals, buffs and shields land on the user; a charged one is half again as strong
      const k = big ? 1.5 : 1, [ox, oy] = mv.origin ?? [0.5, 0.5], lift = mv.lift ?? (oy === 0.5 ? 8 : 0);
      const field = mv.field && { x: m.x, y: m.y, r: mv.field.radius, t: mv.field.time, mv, team: m.team, lane: mv.field.lane, dx, dy, len: mv.field.len, half: mv.field.half };
      const steer = mv.steer && { m, mv, t: 0, track: aim.track, on: true };
      if (steer) this.steers.push(steer);
      if (mv.roost) m.roost = mv.roost;
      if (mv.detect) m.detect = mv.detect;
      if (mv.bide) m.bide = { t: mv.bide.time, stored: 0, mv };
      if (mv.bond) m.bond = mv.bond;
      if (mv.endure) m.endure = mv.endure;
      if (mv.drum) { m.hp = Math.max(1, m.hp / 2); m.addBuff('atk', 2, 99999); }
      if (mv.dance) m.dance = { mv, t: 0, n: 0, hit: {}, cue: {} };
      if (mv.magnet) {
        for (const q of this.shots) {
          if (q.owner.team === m.team || !q.mv?.metal || q.arc || Math.hypot(q.x - m.x, q.y - m.y) > mv.magnet.range) continue;
          if (m.remote) continue; // its owner's client says which shots it caught
          q.orbit = { m, a: this.rand() * 6.28, t: mv.magnet.time };
          this.turnShot(q, m, q.vx, q.vy);
          this.sayShot(q, 'orbit', m);
        }
      }
      if (mv.pass) {
        // every boost goes to the nearest ally, and the user ends up beside it
        const ally = [this.player, ...this.npcs].filter((q) => q !== m && q.team === m.team && q.alive && Math.hypot(q.x - m.x, q.y - m.y) <= mv.pass)
          .sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y))[0];
        if (!ally) return this.spark(m.x, m.y - 12);
        for (const [k, b] of Object.entries(m.buffs)) if (b.t > 0 && b.mul > 1) { ally.buffs[k] = { ...b }; b.t = 0; }
        if (m.charged) { m.setCharged(false); ally.setCharged(true); }
        if (m.shield > 0) { ally.shield = m.shield; m.shield = 0; }
        const d = Math.hypot(ally.x - m.x, ally.y - m.y) || 1;
        Object.assign(m, this.blinkSpot(m, { range: Math.max(0, d - 16) }, { dx: (ally.x - m.x) / d, dy: (ally.y - m.y) / d, dist: d }));
        this.fx.push({ img: this.add.image(ally.x, ally.y - 10, POWERUP.frames[0]).setScale(POWERUP.scale), frames: POWERUP.frames, t: 0, fps: 30, follow: ally, lift: 10 });
      }
      if (field) this.fields.push(field);
      if (mv.stance) { m.braced = true; this.stances.push({ m, mv, t: 0, track: aim.track, lift }); }
      if (mv.frames.length) {
        const img = this.add.image(Math.round(m.x), Math.round(m.y) - lift, mv.frames[0]).setOrigin(ox, oy).setScale(mv.scale ?? 1);
        const e = { img, frames: mv.frames, t: 0, fps: mv.fps ?? 30, follow: m, lift };
        if (mv.shield) {
          // loops while the shield holds, sliding left to right across the user
          const total = mv.shield * k;
          e.loopWhile = () => m.shield > 0 && m.alive;
          if (mv.drift) e.dx = () => mv.drift * (1 - (2 * m.shield) / total);
        }
        if (mv.loopBuff) e.loopWhile = () => m.mul(mv.buff.stat) > 1 && m.alive;
        if (mv.ingrain) e.loopWhile = () => !!m.ingrain;
        if (mv.stance) e.loopWhile = () => m.braced && m.alive;
        if (steer) e.loopWhile = () => steer.on;
        if (field) { e.follow = null; e.loopWhile = () => field.t > 0; img.setDepth(12 + m.y); } // stays on the spot
        this.fx.push(e);
      }
      if (mv.shield) m.shield = mv.shield * k;
      // a ritual's buff grows with its stacks; stances and fields hand theirs out for as long as they last
      const boost = mv.buff && (mv.ritual ? 1 + mv.ritual.per * (aim.stacks ?? 1) : mv.buff.mul);
      if (mv.buff && !mv.stance && !field) { m.addBuff(mv.buff.stat, boost, mv.buff.time * k); if (mv.buff.also) m.addBuff(mv.buff.also, boost, mv.buff.time * k); } // (also: a second stat raised the same)
      if (mv.ingrain) m.ingrain = { t: mv.ingrain.time, hps: mv.ingrain.hps };
      if (mv.dark) { this.shadeT = this.shadeDur = mv.dark; }
      if (mv.decoys) this.spawnDecoys(m, mv.decoys);
      if (mv.buff?.mul > 1) {
        // every stat-raising move ends with the rising particles, once its own art is done
        this.after((mv.frames.length / (mv.fps ?? 30)) * 1000, () => {
          if (m.alive) this.fx.push({ img: this.add.image(m.x, m.y - 10, POWERUP.frames[0]).setScale(POWERUP.scale), frames: POWERUP.frames, t: 0, fps: 30, follow: m, lift: 10 });
        });
      }
      if (mv.sub) m.sub = true;
      if (mv.regen && !field) m.regen = { t: mv.regen.time, hps: mv.regen.hps };
      if (mv.endFrames.length && !mv.stance) {
        // plays when the buff runs out
        this.after(mv.buff.time * k * 1000, () => {
          if (m.alive) this.fx.push({ img: this.add.image(m.x, m.y - lift, mv.endFrames[0]).setScale(mv.scale ?? 1), frames: mv.endFrames, t: 0, fps: mv.fps ?? 30, follow: m, lift });
        });
      }
      if (healsOnly(mv)) m.healsUsed = (m.healsUsed ?? 0) + 1;
      if (mv.cure) m.clearStatus();
      if (mv.empower) m.setCharged(true);
      if (mv.selfStatus) this.inflict(m, mv.selfStatus);
      if (mv.heal) {
        this.after(mv.healDelay ?? 300, () => {
          if (!m.alive) return;
          m.heal(mv.heal * k);
          this.healFx(m);
          // a pulse mends the user's side all around it as well
          if (mv.healAllies) for (const t of [this.player, ...this.npcs]) if (t !== m && t.team === m.team && t.alive && Math.hypot(t.x - m.x, t.y - m.y) <= mv.healAllies) { t.heal(mv.heal * k); this.healFx(t); }
        });
      }
      return;
    }

    if (mv.kind === 'projectile' || mv.kind === 'homing' || mv.kind === 'slight') {
      // a lobbed shot comes down where it was aimed; the shot starts 10px out
      const travel = mv.lob ? Phaser.Math.Clamp(aim.dist, 30, mv.range) - 10 : mv.range;
      const launch = (frames, r, speed, power, turn = 0) => {
        const img = this.add.image(m.x, m.y - 8, frames[0]).setScale((mv.scale ?? 1) * (big ? 1.5 : 1));
        if (mv.tint) img.setTint(mv.tint);
        const a = angle + turn, dx = Math.cos(a), dy = Math.sin(a);
        this.shots.push({
          img, frames, fps: mv.fps ?? 30, t: 0, x: m.x + dx * 10, y: m.y + dy * 10,
          vx: dx * speed, vy: dy * speed, speed, turn: mv.turn ?? 0, cone: mv.kind === 'slight',
          life: travel / speed, owner: m, dmg: dmg * power, r, rotate: mv.rotate, rotOffset: mv.rotOffset ?? 0, spin: mv.spin, arc: mv.arc, life0: travel / speed, mv,
          bounce: mv.bounce, s0: img.scaleX, r0: r, dmg0: dmg * power, id: this.shotId(m),
          swell: mv.swell, ricochet: mv.ricochet ?? 0, boomerang: mv.boomerang, done: mv.pierce || mv.boomerang ? new Set() : null,
        });
      };
      // a fan goes out as several shots side by side
      if (mv.fan) for (let i = 0; i < mv.fan; i++) launch(mv.frames, mv.radius, mv.speed, 1, (i - (mv.fan - 1) / 2) * 0.17);
      else if (!mv.cycle) launch(mv.frames, mv.radius, mv.speed, 1);
      else {
        // each use steps to the next entry: its own art, width, speed and damage
        const n = m.cycles[mv.name] ?? 0, v = mv.cycle[n % mv.cycle.length];
        m.cycles[mv.name] = n + 1;
        launch(v.frames, v.r, v.speed, v.dmg / mv.dmg);
      }
      return;
    }

    if (mv.kind === 'beam') {
      // held: it keeps firing, swinging toward the aim, until the button is let go (see updateBeams)
      const b = { m, mv, t: 0, track: aim.track, dmg: dmg * 0.5, angle, g: this.add.graphics(), runs: [], clash: null, tick: 0.12, big, first: true, w: 0, hist: [{ t: 0, a: angle }] };
      b.runs = this.beamPath(b, aim);
      m.beaming = b;
      this.beams.push(b);
      return;
    }

    if (mv.wall) {
      // a wall across the line of aim, drawn standing on the spot
      const q = this.landSpot(m, mv, aim), color = mv.wall === 'reflect' ? 0x7aa2ff : 0xffe066, half = mv.radius;
      const tx = -dy, ty = dx, ax = q.x - tx * half, ay = q.y - ty * half * 0.77, bx = q.x + tx * half, by = q.y + ty * half * 0.77;
      const g = this.add.graphics().setDepth(10 + Math.max(ay, by));
      const pts = [{ x: ax, y: ay }, { x: bx, y: by }, { x: bx, y: by - 22 }, { x: ax, y: ay - 22 }];
      g.fillStyle(color, 0.28).fillPoints(pts, true).lineStyle(1, color, 0.95).strokePoints(pts, true);
      const mine = this.walls.filter((w) => w.owner === m && w.kind === mv.wall);
      if (mine.length >= 2) mine[0].t = 0; // two of a kind at most
      this.walls.push({ kind: mv.wall, owner: m, team: m.team, ax, ay, bx, by, t: 6, g });
      this.fx.push({ img: this.add.image(Math.round(q.x), Math.round(q.y) - 12, mv.frames[0]).setDepth(60 + q.y).setScale(mv.scale ?? 1), frames: mv.frames, t: 0, fps: mv.fps ?? 30 });
      return;
    }

    if (mv.spout) {
      // blobs lobbed out of the user in every direction, each bursting where it comes down
      for (let i = 0; i < mv.spout; i++) {
        this.after(i * 60, () => {
          if (!m.alive) return;
          const a = this.rand() * Math.PI * 2, d = 16 + this.rand() * (mv.radius - 16), speed = 85 + this.rand() * 35;
          const img = this.add.image(m.x, m.y - 8, mv.frames[0]).setScale((mv.scale ?? 1) * (big ? 1.5 : 1));
          this.shots.push({
            img, frames: mv.frames, fps: mv.fps ?? 30, t: 0, x: m.x, y: m.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed * 0.8, speed, turn: 0,
            life: d / speed, life0: d / speed, owner: m, dmg, r: 7, arc: mv.arc, mv, id: this.shotId(m),
          });
        });
      }
      return;
    }

    if (mv.scatter) {
      // the art bursts at random spots all over the area (a held charge sets its size), then the whole area is hit
      const cx = m.x, cy = m.y, R = aim.radius ?? mv.radius;
      for (let k = Math.max(3, Math.round((R * R) / 260)); k > 0; k--) {
        this.after(this.rand() * 450, () => {
          const a = this.rand() * Math.PI * 2, r = Math.sqrt(this.rand()) * R, y = cy + Math.sin(a) * r * 0.75;
          const frames = this.rand() < 0.5 ? mv.frames : mv.altFrames;
          const img = this.add.image(Math.round(cx + Math.cos(a) * r), Math.round(y) - 8, frames[0]).setDepth(12 + y).setScale((mv.scale ?? 1) * (big ? 1.5 : 1));
          this.fx.push({ img, frames, t: 0, fps: mv.fps ?? 30 });
        });
      }
      this.after(150, () => this.hitCircle(m, cx, cy, R, dmg, mv));
      return;
    }

    // effects that land on a spot
    const spot = mv.kind === 'aoe' ? { x: m.x, y: m.y } : this.landSpot(m, mv, aim);
    if (spot.foe) m.face(spot.x, spot.y);
    const [ox, oy] = mv.origin ?? [0.5, 0.5];
    // a held charge sets the size of an area move, art and hit alike
    const R = aim.radius ?? mv.radius, size = (mv.scale ?? 1) * (big ? 1.5 : 1) * (aim.radius ? aim.radius / mv.radius : 1) * (mv.hpScale ? 0.5 + 0.5 * hpK : 1);
    const land = (x, y, hx, hy, hmv = mv) => {
      // centred effects float at body height, ground-anchored ones stand on the spot
      const lift = oy === 0.5 ? 8 : 0;
      const img = this.add.image(Math.round(x), Math.round(y) - lift, mv.frames[0]).setOrigin(ox, oy).setDepth(40 + Math.max(y, m.y)).setScale(size);
      if (mv.rotate) img.setRotation(angle);
      if (mv.tint) img.setTint(mv.tint);
      if (mv.alpha) img.setAlpha(mv.alpha);
      extra(x, y);
      if (mv.trap) {
        // the art shows once, then an unseen hurtbox waits on the spot; a mon keeps at most three
        this.fx.push({ img, frames: mv.frames, t: 0, fps: mv.fps ?? 30 });
        const mine = this.traps.filter((q) => q.owner === m);
        if (mine.length >= 3) this.traps.splice(this.traps.indexOf(mine[0]), 1);
        this.traps.push({ x: hx, y: hy, mv, owner: m, dmg, t: mv.trap, wait: 0.4 });
        return;
      }
      if (mv.linger) {
        // stays out, looping, and keeps hitting whatever stands in it
        this.zones.push({ img, mv, owner: m, x: hx, y: hy, lift, t: 0, next: 0.12, hits: 0, dmg, follow: mv.follow ? m : null });
        if (mv.web) { img.setVisible(false); Object.assign(this.zones[this.zones.length - 1], { webG: this.add.graphics().setDepth(5), inside: new Set(), wob: 0 }); }
        return;
      }
      const e = { img, frames: mv.frames, t: 0, fps: mv.fps ?? 30, wobble: mv.wobble ? size : 0 };
      if (mv.fall) {
        // drops in from above and lands when the hit does; art with a landing piece is swapped for it there
        Object.assign(e, { fall: mv.fall, y0: img.y });
        if (mv.landFrames.length) {
          e.loopWhile = () => e.t < mv.fall.time;
          this.after(mv.fall.time * 1000, () => this.fx.push({ img: this.add.image(Math.round(x), Math.round(y) - 8, mv.landFrames[0]).setDepth(40 + y), frames: mv.landFrames, t: 0, fps: mv.fps ?? 30 }));
        }
      }
      this.fx.push(e);
      const delay = mv.fall ? mv.fall.time * 1000 : mv.kind === 'melee' && mv.lunge !== false ? 0 : mv.hitDelay ?? 120;
      // a hit that stays live (for a set time, or for as long as the art is out) catches each mon once
      const live = mv.active ?? (mv.sustain ? Math.max(0.1, mv.frames.length / (mv.fps ?? 30) - delay / 1000) : 0);
      if (live) this.actives.push({ owner: m, x: hx, y: hy, r: R, dmg, mv, t: -delay / 1000, life: live, done: new Set(), onHit: drained });
      else this.after(delay, () => { if (this.hitCircle(m, hx, hy, R, dmg, hmv)) drained(); });
      if (mv.pillar) {
        // the rock stays standing as cover
        this.after(delay + 60, () => {
          // one whole rock where the move says so, else a frame of its own art
          const fr = mv.landFrames.length && !mv.pillarStill ? mv.landFrames : mv.frames;
          const pim = mv.pillarStill ? this.add.image(Math.round(hx), Math.round(hy) + 4, fr[0]).setOrigin(0.5, 0.85).setDepth(10 + hy).setScale(1.25)
            : this.add.image(Math.round(hx), Math.round(hy) - lift, fr[fr.length >> 1]).setOrigin(ox, oy).setDepth(10 + hy).setScale(size);
          if (mv.tint) pim.setTint(mv.tint);
          this.pillars.push({ x: hx, y: hy, r: 11, t: mv.pillar, img: pim });
        });
      }
    };
    const { x, y } = spot, hx = spot.hx ?? x, hy = spot.hy ?? y;
    if (mv.multi) {
      // several strikes in a row, scattered around the spot
      for (let i = 0; i < mv.multi.n; i++) {
        const sx = i ? (this.rand() - 0.5) * 2 * mv.multi.spread : 0, sy = i ? (this.rand() - 0.5) * 1.5 * mv.multi.spread : 0;
        this.after(i * mv.multi.gap, () => land(x + sx, y + sy, hx + sx, hy + sy, i && mv.multi.thru ? { ...mv, thru: true } : mv));
      }
    } else if (mv.appear) {
      // cast now, lands later: a pulsing ring marks the spot in the meantime
      this.pendings.push({ x: hx, y: hy, r: R, t: mv.appear / 1000, mine: m === this.player, hide: mv.hideFor, age: 0 });
      this.after(mv.appear, () => land(x, y, hx, hy));
    } else land(x, y, hx, hy);
  }

  get targets() { return [this.player, ...this.npcs, ...this.decoys.map((d) => d.m)]; }

  healFx(m) {
    this.fx.push({ img: this.add.image(m.x, m.y - 12, HEAL.frames[0]), frames: HEAL.frames, t: 0, fps: 30, follow: m, lift: 12 });
  }


  // ---- Double Team ----
  // Copies of the user that mill about, run when it runs, and go up in smoke when touched.
  spawnDecoys(m, o) {
    for (let i = 0; i < o.n; i++) {
      const a = (i / o.n) * Math.PI * 2 + this.rand(), x = m.x + Math.cos(a) * 14, y = m.y + Math.sin(a) * 10;
      const ok = this.walkable(x, y);
      const c = new Mon(this, ok ? x : m.x, ok ? y : m.y, { team: m.team, species: m.species.id, tint: m.baseTint, decoy: true });
      c.dir = m.dir;
      this.decoys.push({ m: c, owner: m, t: o.time, hp0: m.hp, turn: 0, vx: Math.cos(a), vy: Math.sin(a) });
    }
  }

  updateDecoys(dt) {
    for (const m of [this.player, ...this.npcs]) m.cloaked = false;
    for (const d of this.decoys) d.owner.cloaked = true; // nothing over its head gives the real one away while its copies are out
    this.decoys = this.decoys.filter((d) => {
      const { m, owner } = d;
      // gone when hit, when time is up, or the moment the real one takes a hit
      if (m.popped || (d.t -= dt) <= 0 || !owner.alive || owner.hp < d.hp0 - 0.01) {
        this.subBroke(m);
        m.destroy();
        return false;
      }
      d.hp0 = Math.max(d.hp0, owner.hp);
      // a copy looks like the real one in every way: the same boosts, the same condition
      m.buffs = Object.fromEntries(Object.entries(owner.buffs).map(([k, b]) => [k, { ...b }]));
      const kind = owner.status?.kind ?? null;
      if (kind !== (m.status?.kind ?? null)) { m.status = kind ? { kind, t: 9 } : null; m.applyTint(); }
      if (m.charged !== owner.charged) { m.charged = owner.charged; m.applyTint(); }
      if ((d.turn -= dt) <= 0) {
        // a new heading every so often, back toward the owner if it has strayed
        d.turn = 0.25 + this.rand() * 0.5;
        const far = Math.hypot(owner.x - m.x, owner.y - m.y) > 60, a = far ? Math.atan2(owner.y - m.y, owner.x - m.x) + (this.rand() - 0.5) : this.rand() * Math.PI * 2;
        d.vx = Math.cos(a); d.vy = Math.sin(a);
      }
      m.stamina = m.maxStamina;
      m.walk(d.vx, d.vy, WALK_SPEED, dt, owner.running);
      m.update(dt);
      return true;
    });
  }

  // Hit circles that stay live: checked every frame, each mon caught once.
  updateActives(dt) {
    this.actives = this.actives.filter((a) => {
      if ((a.t += dt) >= 0 && this.hitCircle(a.owner, a.x, a.y, a.r, a.dmg, a.mv, a.done)) a.onHit?.();
      return a.t < a.life;
    });
    this.pendings = this.pendings.filter((q) => { q.age += dt; if (q.follow) { q.x = q.follow.x; q.y = q.follow.y; } return (q.t -= dt) > 0; });
  }

  // A burst of the move's own art thrown out from a hit (Pay Day's coins).
  coinBurst(x, y, mv) {
    for (let i = 0; i < mv.coins; i++) {
      const a = this.rand() * Math.PI * 2, d = 12 + this.rand() * 14;
      const c = this.add.image(x, y - 10, mv.frames[i % mv.frames.length]).setDepth(7000);
      this.tweens.add({ targets: c, x: x + Math.cos(a) * d, y: y - 10 + Math.sin(a) * d * 0.6 - 8, duration: 220, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: c, y: `+=10`, alpha: 0, delay: 220, duration: 260, ease: 'Quad.easeIn', onComplete: () => c.destroy() });
    }
  }

  nearestFoe(owner, x, y, range, facing) {
    let best = null, bd = range;
    for (const t of this.targets) {
      if (t.team === owner.team || !t.alive) continue;
      const d = Math.hypot(t.x - x, t.y - y);
      if (d >= bd || (facing && (t.x - x) * facing[0] + (t.y - y) * facing[1] < 0)) continue;
      best = t; bd = d;
    }
    return best;
  }

  // ---- combat hooks called by Mon ----
  actionFrame(m, name, f) {
    if (m.pending && f === (m.anim.hit ?? m.anim.durs.length >> 1)) this.landPending(m);
    const c = m.forceShot ? COMBAT.Shoot : COMBAT[name];
    if (m.mute || !c || !(c.frames ?? [m.anim.hit ?? m.anim.durs.length >> 1]).includes(f)) return;
    const [dx, dy] = m.aim ? [m.aim.dx, m.aim.dy] : dirVec(m.dir);
    this.basicHit(m, c, dx, dy);
  }

  // A basic action connecting along (dx, dy). On its own so an online battle can repeat it for a remote fighter.
  basicHit(m, c, dx, dy) {
    const dmg = c.dmg * m.power * m.mul('atk') * (m.charged ? 2 : 1);
    if (c.kind === 'melee') this.hitCircle(m, m.x + dx * 14, m.y + dy * 11, 13, dmg);
    else if (c.kind === 'radial') this.hitCircle(m, m.x, m.y, 26, dmg);
    else {
      const img = this.add.image(m.x, m.y - 8, SHOT[m.species.type] ?? 'leaf');
      if (m.charged) img.setScale(2);
      this.shots.push({ img, x: m.x + dx * 10, y: m.y + dy * 10, vx: dx * 170, vy: dy * 170, life: 0.75, owner: m, dmg, r: 5, id: this.shotId(m) });
    }
    if (m.charged) m.setCharged(false);
  }

  landPending(m) {
    const q = m.pending;
    m.pending = null;
    if (q) this.fireMove(m, q.mv, q.aim);
  }

  actionDone(m, name) {
    this.landPending(m); // in case the animation had no usable hit frame
    const muted = m.mute;
    m.mute = false;
    m.aim = null;
    m.forceShot = false;
    if (muted) return;
    if (name === 'Charge') m.setCharged(true);
    else if (name === 'Eat') m.heal(25);
  }

  // Every hit in the game goes through here; airborne mons are skipped by Mon.damage.
  // skip: a set of mons this hit has already caught (they are passed over, new ones are added)
  // shot: the projectile behind the hit, if it is one (named in the verdict so its owner's client can stop it)
  hitCircle(owner, x, y, r, dmg, mv, skip, shot) {
    this.hits.push({ x, y, r, ttl: 0.18 });
    let any = false;
    this.guessed = false;
    const hit = mv && { tag: mv.tag, jab: !!mv.jab, swat: mv.swat, thru: mv.thru, by: owner, raw: !!mv.fixedDmg, pierce: mv.pierceShield || !!mv.fixedDmg, deep: mv.deep, soft: mv.kind === 'beam' };
    if (mv?.fixedDmg) dmg = mv.fixedDmg; // the same against anyone, whatever either side has boosted
    if (mv?.toss) { dmg = 0.5; hit.raw = true; } // the grab itself barely hurts: the slam does
    if (mv?.breaker) {
      // walls and standing rocks in reach come down, and whoever raised a wall is stunned
      for (const w of this.walls) if (w.team !== owner.team && segDist(x, y, w.ax, w.ay, w.bx, w.by) < r + 4) { w.t = 0; w.owner.stun = mv.breaker; }
      for (const q of this.pillars) if (Math.hypot(q.x - x, q.y - y) < r + q.r) q.t = 0;
    }
    if (mv?.cut) this.cutShots(owner, x, y, r);
    if (mv?.blow) {
      // the wind throws enemy shots back out from its centre
      for (const q of this.shots) {
        const d = Math.hypot(q.x - x, q.y - y);
        if (q.owner.team === owner.team || d > r + q.r || owner.remote) continue; // the blower's client moves the shots and says so
        const v = q.speed ?? Math.hypot(q.vx, q.vy);
        q.vx = ((q.x - x) / (d || 1)) * v; q.vy = ((q.y - y) / (d || 1)) * v;
        if (q.mv?.cloud) this.turnShot(q, owner, q.vx * 2, q.vy * 2); // a cloud works for whoever blew it last
        else this.sayShot(q, 'turn');
      }
    }
    for (const t of this.targets) {
      if (t.team === owner.team || skip?.has(t) || Math.hypot(t.x - x, (t.y - y) * 1.3) > r + 7) continue;
      if (mv?.strip) { t.shield = 0; for (const b of Object.values(t.buffs)) if (b.mul > 1) b.t = 0; }
      if (mv?.breaker && (t.shield > 0 || t.sub)) {
        // the guard is smashed and its owner left reeling
        t.shield = 0;
        if (t.sub) { t.sub = false; this.subBroke(t); }
        t.stun = mv.breaker;
        this.popup(t, 'BREAK');
      }
      // a jab catching a foe mid-charge is a counter; some moves hit harder on a foe in a given state
      const counter = mv?.jab && t.state === 'windup' && t.windup?.mv.tag !== 'heavy';
      const versus = mv?.versus && (mv.versus.any ? !!t.status : mv.versus.status.includes(t.status?.kind));
      // a flyer that is swatted, or a roosting mon caught by a ground move, takes half again
      const extra = (mv?.swat && t.flying) || (mv?.ground && t.roost > 0) ? 1.5 : 1;
      const blocking = t.parry > 0, hp0 = t.hp;
      if (!t.damage(dmg * (counter ? mv.jab : 1) * (versus ? mv.versus.mul : 1) * extra, owner.x, owner.y, hit)) {
        // a lock-on dash that is parried leaves its user wide open
        if (blocking && t.parry === 0 && mv?.parryStun) { owner.stun = mv.parryStun; if (owner.state === 'dash' || owner.state === 'bird') owner.toIdle(); }
        continue;
      }
      any = true;
      skip?.add(t);
      if (t.remote) {
        // a fighter another client runs: this was only a guess that the blow lands. Its owner decides, and says so (see onHit).
        this.guessed = true;
        continue;
      }
      const dealt = hp0 - t.hp;
      this.onHit(owner, t, mv, dealt, counter, dmg);
      if (owner.remote) this.sayHit(owner, t, mv, dealt, counter, shot); // tell the attacker's client it landed
    }
    return any;
  }

  // Everything a hit does once it has landed. On the client that runs the fighter that was hit this follows the hit at once;
  // on the attacker's client it runs when that client says the hit landed (the verdict), so both agree on what happened.
  onHit(owner, t, mv, dealt, counter, dmg = dealt) {
    const impact = mv?.impactFrames;
    if (mv?.chill && t.alive) this.chillOn(t);
    if (mv?.bondLink && t.alive) owner.bondTo = { m: t, t: mv.bondLink };
    if (mv?.sap) { t.spend(mv.sap); this.popup(t, 'SPITE'); }
    if (mv?.torment && t.alive) t.torment = { t: mv.torment };
    if (mv?.tether && t.alive) t.tether = { to: owner, r: mv.tether.r, t: mv.tether.time };
    if (mv?.string && t.alive && !t.decoy) { this.threads = this.threads.filter((q) => q.a !== owner); this.threads.push({ a: owner, t, time: mv.string.time }); t.addBuff('spd', mv.string.slow, mv.string.time); }
    if (mv?.toss && t.alive) {
      // both go up together, where nothing can reach them, and come down with the slam
      const c = mv.toss, slam = () => {
        owner.under = t.under = false;
        if (!t.alive) return;
        const f = mv.impactFrames;
        if (f.length) this.fx.push({ img: this.add.image(Math.round(t.x), Math.round(t.y) - 12, f[0]).setDepth(60 + t.y), frames: f, t: 0, fps: 30 });
        t.invuln = 0;
        t.damage(c.dmg, owner.x, owner.y, { tag: 'grab', raw: true, by: owner });
      };
      t.kx = t.ky = 0;
      if (t.ingrain) slam(); // rooted: it cannot be lifted, only struck
      else {
        for (const q of [owner, t]) { q.stun = c.time + 0.15; q.under = true; }
        this.arcs.push({ m: owner, x0: owner.x, y0: owner.y, to: { x: owner.x, y: owner.y }, t: 0, dur: c.time, h: 50 });
        this.arcs.push({ m: t, x0: t.x, y0: t.y, to: { x: t.x, y: t.y }, t: 0, dur: c.time, h: 50, onEnd: slam });
      }
    }
    if (mv?.throw && t.alive && !t.ingrain && owner.lastAim) {
      // flung to where the thrower is aiming
      const a = owner.lastAim;
      t.kx = t.ky = 0; t.stun = 0.75;
      this.arcs.push({ m: t, x0: t.x, y0: t.y, to: this.blinkSpot(owner, { range: mv.throw }, { dx: a.dx, dy: a.dy, dist: Math.max(40, a.dist) }), t: 0, dur: 0.4, h: 26 });
    }
    if (mv?.lock && t.alive) t.locked = { team: owner.team, t: mv.lock };
    if (counter) this.popup(t, 'COUNTER');
    if (mv?.drain && owner.alive && dealt > 0) { owner.heal(dealt * mv.drain); this.healFx(owner); }
    if (mv?.latch && t.alive && !t.decoy && !t.grip && !owner.grip) this.grips.push({ a: owner, t, mv, dmg, time: mv.latch, next: 0.33 });
    if (mv?.knock) { t.kx *= mv.knock; t.ky *= mv.knock; }
    if (mv?.bury && t.alive) t.buried = mv.bury;
    if (mv?.debuff && t.alive) t.addBuff(mv.debuff.stat, mv.debuff.mul, mv.debuff.time);
    if (mv?.leech && t.alive) t.leech = { t: mv.leech.time, dps: mv.leech.dps, owner };
    if (mv?.status && t.alive && this.rand() < mv.status.chance) {
      const st = mv.status;
      // 'tri' is one of burn, paralysis or freeze; a move with a worse form applies it to a mon that already has the first
      if (st.worse && t.status?.kind === st.kind) { t.clearStatus(); this.inflict(t, st.worse); }
      else this.inflict(t, st.kind === 'tri' ? ['burn', 'para', 'freeze'][Math.floor(this.rand() * 3)] : st.kind);
    }
    if (mv?.coins) this.coinBurst(t.x, t.y, mv);
    if (impact?.length) {
      const img = this.add.image(Math.round(t.x), Math.round(t.y) - 8, impact[0]).setDepth(60 + t.y).setScale(mv.impactScale ?? 1);
      this.fx.push({ img, frames: impact, t: 0, fps: mv.impactFps ?? 24 });
    } else this.spark(t.x, t.y - 10);
  }

  // ---- what the online battle scene tells other clients (nothing to tell in a fight run on one machine) ----
  sayHit() {}
  sayShot() {}
  sayClash() {}
  sayTap() {}
  // Each shot has an id that is the same on every client: its owner's slot and a count of that fighter's shots.
  shotId(m) { return `${m.slot ?? (m === this.player ? 'p' : 'n')}:${(m.shotN = (m.shotN ?? 0) + 1)}`; }

  // A shot changes sides: it now flies for its new owner, fresh, on the given heading.
  turnShot(q, owner, vx, vy) {
    Object.assign(q, { owner, vx, vy, speed: Math.hypot(vx, vy), back: false, boomerang: false, caught: null, life: q.life0 ?? 0.75 });
    q.done?.clear();
    q.orbit = q.orbit?.m === owner ? q.orbit : null;
    this.sayShot(q, 'turn');
  }

  // An ice move leaves a stack of chill; the third one freezes.
  chillOn(t) {
    if (t.status?.kind === 'freeze') return; // already frozen solid: nothing to add
    const n = (t.chill?.n ?? 0) + 1;
    if (n < 3) { t.chill = { n, t: 6 }; return; } // shown as snowflakes over its head
    t.chill = null;
    this.inflict(t, 'freeze');
  }

  // Is this spot inside a Reflect wall that stops this mon?
  walled(m, x, y) {
    // a standing rock stops everyone, though a mon caught inside one may walk out
    if (this.pillars.some((q) => { const d = Math.hypot(x - q.x, (y - q.y) * 1.3); return d < q.r && d < Math.hypot(m.x - q.x, (m.y - q.y) * 1.3); })) return true;
    return this.walls.some((w) => w.kind === 'reflect' && w.team !== m.team && segDist(x, y, w.ax, w.ay, w.bx, w.by) < 5);
  }

  updateWalls(dt) {
    this.walls = this.walls.filter((w) => {
      if ((w.t -= dt) > 0) { w.g.setAlpha(Math.min(1, w.t * 2)); return true; }
      w.g.destroy();
      return false;
    });
  }

  // A mon jumping to a spot (Bounce): untouchable on the way, hitting where it comes down.
  updateLeaps(dt) {
    this.leaps = this.leaps.filter((l) => {
      const { m, mv } = l;
      if (m.state !== 'dash') { m.hop = 0; return false; } // knocked out of the air
      const u = Math.min(1, (l.t += dt) / mv.leap);
      m.x = Phaser.Math.Linear(l.x0, l.to.x, u); m.y = Phaser.Math.Linear(l.y0, l.to.y, u);
      m.hop = 52 * 4 * u * (1 - u);
      if (u < 1) return true;
      m.hop = 0;
      m.toIdle();
      l.burst();
      this.hitCircle(m, m.x, m.y, mv.radius, l.dmg, mv);
      return false;
    });
  }

  // Kinesis: while it is held, the user's latest shot bends toward the aim.
  updateSteers(dt) {
    this.steers = this.steers.filter((k) => {
      const { m, mv } = k;
      k.t += dt;
      const held = k.t < 0.3 || this.holding(m, k.track, k.t);
      if (!held || !m.alive || m.stamina <= 0) { k.on = false; return false; }
      m.spend(mv.steer.upkeep * dt);
      const q = this.shots.filter((x) => x.owner === m && !x.arc).pop();
      if (!q) return true;
      const a = this.aimOf(m, k.track), foe = k.track === 'pointer' ? null : this.nearestFoe(m, q.x, q.y, 200);
      const tx = foe ? foe.x : m.x + a.dx * a.dist, ty = foe ? foe.y : m.y + a.dy * a.dist;
      this.bendShot(q, tx, ty, mv.steer.turn * dt);
      q.life += dt * 0.5; // it stays out longer while it is being steered
      return true;
    });
  }

  // Turn a shot toward a point by at most `by` radians.
  bendShot(q, tx, ty, by) {
    const v = q.speed ?? Math.hypot(q.vx, q.vy), cur = Math.atan2(q.vy, q.vx);
    const a = cur + Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(Math.atan2(ty - q.y, tx - q.x) - cur), -by, by);
    q.vx = Math.cos(a) * v; q.vy = Math.sin(a) * v;
  }

  // Is a point in a field (a circle, or a lane running from its start along its heading)?
  inField(f, x, y) {
    if (!f.lane) return Math.hypot(x - f.x, (y - f.y) * 1.3) <= f.r;
    const rx = x - f.x, ry = y - f.y, along = rx * f.dx + ry * f.dy;
    return along >= -8 && along <= f.len && Math.abs(-rx * f.dy + ry * f.dx) <= f.half;
  }

  // ---- held beams ----
  // A beam is light on its way out: each stretch of it keeps the heading the user had when that stretch left, and travels on at
  // BEAM_SPEED. So when the user swings round, the near end turns at once and the rest whips after it in an arc. A run is a chain
  // of points BEAM_STEP apart: { pts, len }.

  // The heading the beam's user had at a given moment of the beam's life.
  beamAngleAt(b, t) {
    for (let i = b.hist.length - 1; i >= 0; i--) if (b.hist[i].t <= t) return b.hist[i].a;
    return b.hist[0]?.a ?? b.angle;
  }

  // A straight run from (x, y).
  beamLine(x, y, a, len) {
    const pts = [], cx = Math.cos(a), cy = Math.sin(a);
    for (let d = 0; d <= len; d += BEAM_STEP) pts.push({ x: x + cx * d, y: y + cy * d });
    return { pts, len: Math.max(0, pts.length - 1) * BEAM_STEP };
  }

  // The beam's own run, bent by how its user has been turning: stopped by a Light Screen of the other side, and noting where
  // it crosses one of its own.
  beamCurve(b, x, y, len) {
    const pts = [{ x, y }], team = b.m.team;
    let split = null, px = x, py = y;
    for (let d = BEAM_STEP; d <= len; d += BEAM_STEP) {
      const a = this.beamAngleAt(b, b.t - d / BEAM_SPEED);
      px += Math.cos(a) * BEAM_STEP; py += Math.sin(a) * BEAM_STEP;
      const w = this.walls.find((q) => q.kind === 'screen' && segDist(px, py, q.ax, q.ay, q.bx, q.by) < 4);
      if (w && w.team !== team && !b.mv.ghost) break;
      if (w && w.team === team) split ??= { x: px, y: py, a, d };
      pts.push({ x: px, y: py });
    }
    return { pts, len: (pts.length - 1) * BEAM_STEP, split };
  }

  // The runs a beam is made of this frame: its curve, plus a second leg if it bends at the aimed point toward the nearest foe,
  // or two more fanning out of the user's own screen. A fresh beam is still on its way out.
  beamPath(b, aim) {
    const { m, mv } = b, x = m.x + Math.cos(b.angle) * 8, y = m.y + Math.sin(b.angle) * 8, len = Math.min(mv.length, 10 + b.t * BEAM_SPEED * 1.3);
    if (mv.bend) {
      const d1 = Phaser.Math.Clamp(aim.dist, 30, mv.length * 0.7), first = this.beamCurve(b, x, y, Math.min(d1, len));
      if (first.len < d1 - BEAM_STEP) return [first];
      const end = first.pts[first.pts.length - 1], foe = this.nearestFoe(m, end.x, end.y, mv.length);
      return [first, this.beamLine(end.x, end.y, foe ? Math.atan2(foe.y - end.y, foe.x - end.x) : this.beamAngleAt(b, b.t - d1 / BEAM_SPEED), len - d1)];
    }
    const main = this.beamCurve(b, x, y, len), sp = main.split;
    if (!sp || main.len - sp.d < 12) return [main];
    return [main, this.beamLine(sp.x, sp.y, sp.a - 0.4, main.len - sp.d), this.beamLine(sp.x, sp.y, sp.a + 0.4, main.len - sp.d)];
  }

  // The end of a beam. quit: its user let go (or ran dry) rather than being knocked out of it; breaking a clash that way costs a small hit.
  endBeam(b, quit) {
    const c = b.clash;
    if (c) {
      const other = c.a === b ? c.b : c.a;
      c.a.clash = c.b.clash = null;
      this.clashes = this.clashes.filter((q) => q !== c);
      if (quit) b.m.damage(other.dmg, other.m.x, other.m.y);
    }
    if (b.m.beaming === b) b.m.beaming = null;
    b.g.destroy();
  }

  // A press of a move button during a clash: a burst of push for that side.
  clashTap(m) {
    const c = m.beaming?.clash;
    if (!c) return false;
    if (!m.remote) this.sayTap(m); // for the client that runs this clash, if it is not this one
    const k = c.a.m === m ? 'pa' : 'pb';
    c[k] = Math.min(2, c[k] + 0.5);
    return true;
  }

  // Where two beam runs meet, if they do: the middle of the stretch of one that lies within reach of the other
  // (a crossing gives the crossing point, two beams fired down the same line the middle of their overlap).
  runsMeet(a, b) {
    let lo = null, hi = null;
    a.pts.forEach((p, i) => {
      if (i * BEAM_STEP >= 8 && b.pts.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < 7)) { lo ??= i; hi = i; }
    });
    return lo === null ? null : a.pts[(lo + hi) >> 1];
  }

  updateBeams(dt) {
    // 1. each beam: is it still held? Its user turns toward the aim, and the beam's path follows from where it has been pointing.
    this.beams = this.beams.filter((b) => {
      const { m, mv } = b;
      b.t += dt;
      // a tap still gives a short burst; a remote fighter's button cannot be seen, so its beam is a burst too
      const held = b.t < 0.35 || this.holding(m, b.track, b.t);
      if (m.beaming !== b || !m.alive || !held || m.stamina <= 0 || m.state === 'windup' || m.stuck) {
        this.endBeam(b, m.alive && m.beaming === b);
        return false;
      }
      m.spend(mv.upkeep * dt);
      let aim = this.aimOf(m, b.track);
      if (!b.track) {
        const [ix, iy] = this.inputDir();
        if (ix || iy) { const l = Math.hypot(ix, iy); aim = { dx: ix / l, dy: iy / l, dist: 99 }; }
      }
      if (!b.clash) {
        // the user swings round on a spring: quickly, a little past the aim, and back. Heavier beams swing slower.
        const diff = Phaser.Math.Angle.Wrap(Math.atan2(aim.dy, aim.dx) - b.angle), cap = mv.turnRate * 3;
        b.w = Phaser.Math.Clamp(b.w + (diff * 90 - b.w * 11) * dt, -cap, cap);
        b.angle += b.w * dt;
        b.hist.push({ t: b.t, a: b.angle });
        if (b.hist.length > 120) b.hist.shift();
        if (mv.push) m.slide(-Math.cos(b.angle) * mv.push * dt, -Math.sin(b.angle) * mv.push * dt);
        b.runs = this.beamPath(b, aim);
      }
      return true;
    });

    // 2. beams of opposite sides that have just met lock into a clash
    for (let i = 0; i < this.beams.length; i++) {
      for (let j = i + 1; j < this.beams.length; j++) {
        const a = this.beams[i], b = this.beams[j];
        if (a.clash || b.clash || a.m.team === b.m.team) continue;
        const at = this.runsMeet(a.runs[0], b.runs[0]);
        if (!at) continue;
        const gap = Math.hypot(b.m.x - a.m.x, b.m.y - a.m.y) || 1;
        const c = { a, b, u: Phaser.Math.Clamp(Math.hypot(at.x - a.m.x, at.y - a.m.y) / gap, 0.15, 0.85), pa: 0, pb: 0, t: 0 };
        a.clash = b.clash = c;
        this.clashes.push(c);
      }
    }

    // 3. clashes: both beams run straight to the meeting point, which slides toward whoever is pushing less
    if (this.clashes.length && FEEL.on && FEEL.clashShake) this.cameras.main.shake(90, 0.0045); // it rumbles for as long as two beams are locked
    this.clashes = this.clashes.filter((c) => {
      const { a, b } = c, A = a.m, B = b.m;
      c.t += dt;
      // one client runs the tug of war, the one with the fighter in the lower slot; the other follows what it is told
      const auth = (A.slot ?? 0) <= (B.slot ?? 0) ? A : B, mine = !auth.remote;
      if (mine) {
        // a rival mashes too; another player's presses arrive as messages (see clashTap)
        for (const [q, k] of [[A, 'pa'], [B, 'pb']]) if (q !== this.player && q.ai === 'wild' && this.rand() < 3 * dt) c[k] = Math.min(2, c[k] + 0.5);
        const power = (q, burst) => (q.mv.dmg / 22) * (q.mv.clashWin ? 3 : 1) * (1 + burst);
        c.u = Phaser.Math.Clamp(c.u + (power(a, c.pa) - power(b, c.pb)) * 0.8 * dt, 0, 1);
        c.pa *= Math.exp(-3 * dt); c.pb *= Math.exp(-3 * dt);
      } else if (c.net) c.u += ((c.a.m === auth ? c.net.u : 1 - c.net.u) - c.u) * Math.min(1, dt * 20);
      const gap = Math.hypot(B.x - A.x, B.y - A.y) || 1, ang = Math.atan2(B.y - A.y, B.x - A.x);
      c.x = Phaser.Math.Linear(A.x, B.x, c.u); c.y = Phaser.Math.Linear(A.y, B.y, c.u);
      // the lock pulls both beams taut
      a.angle += Phaser.Math.Angle.Wrap(ang - a.angle); b.angle += Phaser.Math.Angle.Wrap(ang + Math.PI - b.angle);
      for (const q of [a, b]) { q.w = 0; q.hist = [{ t: q.t - 9, a: q.angle }]; }
      a.runs = [this.beamLine(A.x + Math.cos(ang) * 8, A.y + Math.sin(ang) * 8, ang, Math.max(0, gap * c.u - 8))];
      b.runs = [this.beamLine(B.x - Math.cos(ang) * 8, B.y - Math.sin(ang) * 8, ang + Math.PI, Math.max(0, gap * (1 - c.u) - 8))];
      const lost = mine ? (gap * (1 - c.u) < 14 ? b : gap * c.u < 14 ? a : null) : c.net?.end === undefined ? null : c.net.end === (A.slot ?? 0) ? a : b;
      if (mine && (lost || this.tickN % 3 === 0)) this.sayClash(c, auth, lost);
      if (!lost) return true;
      // pushed all the way: the loser takes both beams at once
      const won = lost === a ? b : a;
      a.clash = b.clash = null;
      lost.m.invuln = 0;
      lost.m.damage((a.dmg + b.dmg) * 2, won.m.x, won.m.y, { tag: 'heavy' });
      if (won.mv.clashWin && lost.m.alive) this.inflict(lost.m, 'confuse');
      this.popup(won.m, 'CLASH');
      this.spark(c.x, c.y - 8);
      return false;
    });

    // 4. draw each beam, clear the shots it crosses, and land its ticks
    for (const b of this.beams) {
      const { m, mv, runs } = b;
      m.dir = dirFromVec(Math.cos(b.angle), Math.sin(b.angle));
      b.g.clear().setDepth(40 + Math.max(m.y, ...runs.map((r) => Math.max(...r.pts.map((p) => p.y)))));
      runs.forEach((r, i) => this.drawBeam(b.g, r, mv, b.t, b.big, i === 0, !b.clash));
      if (b.clash?.a === b) this.drawClash(b.g, b.clash, b.clash.a.mv, b.clash.b.mv);
      // a beam outweighs every shot: whatever of the other side it crosses is gone
      for (const q of this.shots) {
        if (m.remote || q.dead || q.owner.team === m.team || q.arc) continue; // the beam's own client clears the shots and says so
        if (runs.some((r) => r.pts.some((p) => Math.hypot(q.x - p.x, q.y - p.y) < 8 + q.r / 2))) { q.dead = true; this.sayShot(q, 'dead'); }
      }
      if ((b.tick -= dt) > 0) continue;
      b.tick += 0.1; // (a tick only lands once the last has worn off: see the soft hit in Mon.damage)
      const dmg = b.dmg * (b.first ? 2 : 0.5); // light and often after the opening tick, which lands as hard as it always did
      b.first = false;
      for (const r of runs) {
        for (let i = 2; i < r.pts.length; i += 2) this.hitCircle(m, r.pts[i].x, r.pts[i].y, mv.cone ? 6 + i * BEAM_STEP * mv.cone : 9, dmg, mv);
      }
    }
  }

  // One run of a beam, drawn in chunky pixels from the move's look (see moves.js): three stacked layers of squares
  // (outline, body, core) stepped along the run's curve, shaped and animated by the style. muzzle: flare at the user's end;
  // cap: burst at the far end (left off when the beam ends in a clash).
  drawBeam(g, r, mv, t, big, muzzle, cap) {
    const L = mv.look ?? { style: 'ray', w: 6, colors: [0x6b7280, 0xd1d5db, 0xffffff] }, [c0, c1, c2] = L.colors;
    const P = r.pts, n = P.length - 1, len = r.len, lift = 8, w = L.w * (big ? 1.5 : 1);
    if (n < 1) return;
    // the point d px along the run, and the unit vector across it there
    const at = (d) => {
      const f = Phaser.Math.Clamp(d / BEAM_STEP, 0, n - 0.001), i = Math.floor(f), A = P[i], B = P[i + 1], dx = B.x - A.x, dy = B.y - A.y, l = Math.hypot(dx, dy) || 1;
      return { x: A.x + dx * (f - i), y: A.y + dy * (f - i) - lift, px: -dy / l, py: dx / l };
    };
    const sq = (d, off, size, color, alpha = 1) => {
      const s = Math.max(1, Math.round(size)), q = at(d);
      g.fillStyle(color, alpha).fillRect(Math.round(q.x + q.px * off - s / 2), Math.round(q.y + q.py * off - s / 2), s, s);
    };
    const noise = (k) => { const v = Math.sin(k * 127.1 + Math.floor(t * 18) * 311.7) * 43758.5453; return v - Math.floor(v); };

    // a soft glow around the whole length (a rope of mud does not shine)
    if (L.style !== 'mud') {
      const flicker = 0.85 + 0.15 * Math.sin(t * 22);
      // (the circles overlap several deep along the line, so each is very faint)
      for (const [rad, alpha] of [[w * 1.9 + 3, 0.018], [w * 1.25 + 2, 0.035]]) {
        g.fillStyle(c1, alpha * flicker);
        for (let d = 0; d <= len; d += 4) { const q = at(d), k = L.style === 'flame' ? 1 + (d / len) * (mv.cone ?? 0.05) * 14 : 1; g.fillCircle(Math.round(q.x), Math.round(q.y), rad * k); }
      }
    }
    if (L.style === 'flame') {
      // puffs that grow along the cone and cool from the core colour to the outline colour
      const cone = mv.cone ?? 0.05;
      for (let pass = 0; pass < 2; pass++) {
        for (let d = 4; d <= len; d += 4) {
          const u = d / len, rad = (w * 0.6 + d * cone * 1.25) * (0.85 + 0.3 * Math.sin(t * 24 + d * 0.9)), off = Math.sin(d * 0.7 + t * 16) * (1 + u * 2), q = at(d);
          const x = Math.round(q.x + q.px * off), y = Math.round(q.y + q.py * off);
          if (pass === 0) g.fillStyle(c0, 0.9).fillCircle(x, y, rad + 1.5);
          else g.fillStyle(u < 0.35 ? c2 : u < 0.75 ? c1 : c0, 1).fillCircle(x, y, rad * (u < 0.75 ? 0.75 : 0.5));
        }
      }
      for (let k = 0; k < 6; k++) { const d = noise(k) * len; sq(d, (noise(k + 9) - 0.5) * (w + d * cone * 3), 1, c2); } // embers
    } else if (L.style === 'mud') {
      // clods of different sizes tumbling down the line, each with a wet highlight, and drips falling off underneath
      const flow = t * 150;
      for (let pass = 0; pass < 3; pass++) {
        for (let d = 2; d <= len; d += 5) {
          const k = Math.floor((d - flow) / 5), lump = Math.sin(k * 12.9898) * 43758.5453, u = lump - Math.floor(lump);
          const rad = w * (0.38 + 0.34 * u), q = at(d), off = (u - 0.5) * 3;
          const x = Math.round(q.x + q.px * off), y = Math.round(q.y + q.py * off);
          if (pass === 0) g.fillStyle(c0, 1).fillCircle(x, y, rad + 1.5);
          else if (pass === 1) g.fillStyle(c1, 1).fillCircle(x, y, rad);
          else if (u > 0.45) g.fillStyle(c2, 1).fillRect(x - 1, y - Math.round(rad * 0.5), 2, 1);
        }
      }
      for (let k = 0; k < 6; k++) { const d = noise(k + 11) * len, q = at(d), fall = ((t * 3 + k * 0.37) % 1) * 9; g.fillStyle(c1, 1 - fall / 9).fillRect(Math.round(q.x), Math.round(q.y + w * 0.5 + fall), 1, 2); }
    } else {
      const pulse = 1 + 0.12 * Math.sin(t * 30);
      const offAt = (d) => (L.style === 'wave' ? Math.sin(d * 0.22 - t * 18) * 2.2 : L.style === 'jag' ? ((Math.floor(d / 5) + Math.floor(t * 20)) % 2 ? 1.5 : -1.5) : 0);
      for (const [color, size] of [[c0, w + 3], [c1, w], [c2, Math.max(1, w - 4)]]) {
        for (let d = 0; d <= len; d += 2) {
          let col = color;
          if (L.style === 'stripe' && color !== c0) col = Math.floor((d - t * 160) / 9) % 2 ? c1 : c2; // chasing bands
          sq(d, offAt(d), size * pulse, col);
        }
      }
      // pulses racing down the beam
      if (len > 8 && (L.style === 'ray' || L.style === 'wave' || L.style === 'jag')) {
        for (let k = 0; k < 4; k++) { const d = (t * 260 + k * (len / 4)) % len; sq(d, offAt(d), w + 2, c2); }
      }
      if (L.style === 'stream') {
        // foam along both edges, and droplets flung off
        for (let d = 3; d <= len; d += 5) { const e = noise(d) > 0.5 ? 1 : -1; sq(d + noise(d + 3) * 4, e * (w / 2 + 0.5), 2, c2); }
        for (let k = 0; k < 5; k++) { const d = noise(k + 40) * len; sq(d, (noise(k + 50) - 0.5) * (w + 10), 1, c1); }
      }
      if (L.style === 'jag') for (let k = 0; k < 5; k++) { const d = noise(k + 20) * len; sq(d, (noise(k + 30) - 0.5) * (w + 8), 1, c2); } // glints
    }

    // flare at the user's end
    if (muzzle) {
      const rad = w * 0.75 + 1.5 * Math.sin(t * 34), x = Math.round(P[0].x), y = Math.round(P[0].y - lift);
      g.fillStyle(c0, 1).fillCircle(x, y, rad + 1.5);
      g.fillStyle(c1, 1).fillCircle(x, y, rad);
      g.fillStyle(c2, 1).fillCircle(x, y, Math.max(1, rad - 2.5));
    }
    // burst where it ends
    if (cap && L.style !== 'flame') {
      const ex = Math.round(P[n].x), ey = Math.round(P[n].y - lift), rad = w * 0.6 + 1.5 * Math.abs(Math.sin(t * 26));
      g.fillStyle(c1, 0.9).fillCircle(ex, ey, rad + 1);
      g.fillStyle(c2, 1).fillCircle(ex, ey, Math.max(1, rad - 2));
      for (let k = 0; k < 4; k++) { const a = noise(k + 70) * Math.PI * 2, d = rad + 2 + noise(k + 80) * 4; g.fillStyle(c2, 1).fillRect(Math.round(ex + Math.cos(a) * d), Math.round(ey + Math.sin(a) * d), 1, 1); }
    }
  }

  // The knot where two beams lock: a pulsing ball in both beams' colours, throwing sparks, leaning the way it is being pushed.
  drawClash(g, c, ma, mb) {
    const x = Math.round(c.x), y = Math.round(c.y) - 8, t = c.t, ca = ma.look?.colors ?? [0, 0xffffff, 0xffffff], cb = mb.look?.colors ?? [0, 0xffffff, 0xffffff];
    const rad = 8 + 2 * Math.sin(t * 38) + Math.min(3, (c.pa + c.pb) * 1.5);
    const noise = (n) => { const v = Math.sin(n * 91.7 + Math.floor(t * 24) * 57.3) * 43758.5453; return v - Math.floor(v); };
    // each side's colour bulges from its own direction
    const ang = Math.atan2(c.b.m.y - c.a.m.y, c.b.m.x - c.a.m.x);
    g.fillStyle(ca[0], 1).fillCircle(x, y, rad + 2);
    g.fillStyle(ca[1], 1).slice(x, y, rad, ang + Math.PI / 2, ang - Math.PI / 2).fillPath();
    g.fillStyle(cb[1], 1).slice(x, y, rad, ang - Math.PI / 2, ang + Math.PI / 2).fillPath();
    g.fillStyle(0xffffff, 1).fillCircle(x, y, rad * 0.5);
    // jagged sparks
    for (let k = 0; k < 7; k++) {
      const a = noise(k) * Math.PI * 2, d0 = rad + 1, d1 = rad + 5 + noise(k + 11) * 9;
      g.lineStyle(1, k % 2 ? ca[2] : cb[2], 1).lineBetween(x + Math.cos(a) * d0, y + Math.sin(a) * d0, x + Math.cos(a + 0.25) * d1, y + Math.sin(a + 0.25) * d1);
    }
    // a ring thrown out every so often
    const ring = (t * 2.2) % 1;
    g.lineStyle(1, 0xffffff, 1 - ring).strokeCircle(x, y, rad + 2 + ring * 14);
  }

  // Mons on their way from one spot to another: flung, dragged or dropped. h is how high the arc lifts them.
  updateArcs(dt) {
    this.arcs = this.arcs.filter((q) => {
      const u = Math.min(1, (q.t += dt) / q.dur), m = q.m;
      if (!m.alive) { m.hop = 0; q.onEnd?.(); return false; }
      m.x = Phaser.Math.Linear(q.x0, q.to.x, u); m.y = Phaser.Math.Linear(q.y0, q.to.y, u);
      m.hop = q.h * 4 * u * (1 - u);
      if (u < 1) return true;
      q.onEnd?.();
      return false;
    });
  }

  // Close Combat: a punch every gap, each harder, while the button is held and nothing has knocked the user out of it.
  // Bursts in progress: the next shot goes when its turn comes, wherever the user is aiming by then. Being hurt, stunned
  // or knocked out ends the burst, and so does letting go of the pad's button (keys and mouse send the whole burst).
  updateVolleys(dt) {
    this.volleys = this.volleys.filter((v) => {
      const { m, mv } = v;
      v.t += dt;
      if (!m.alive || m.state === 'hurt' || m.stun > 0 || m.ailment.hold) return false;
      if (mv.stream) {
        // a stream runs while the button is down and there is energy to feed it
        if ((v.t > 0.12 && !this.holding(m, v.track, v.t)) || m.stamina <= 0) return false;
        m.spend(mv.stream.upkeep * dt);
      } else if (v.track === 'touch' && v.left < mv.volley.n && !this.holding(m, v.track, v.t)) return false;
      if ((v.wait -= dt) > 0) return true;
      v.wait += (mv.stream ?? mv.volley).gap;
      v.left--;
      const aim = this.aimOf(m, v.track);
      m.dir = dirFromVec(aim.dx, aim.dy);
      if (mv.kind === 'melee' && m.free) m.mute = m.act('Attack'); // a swing for each blow
      this.fireMove(m, mv, { ...aim, track: v.track, one: true });
      return v.left > 0;
    });
  }

  updateFlurries(dt) {
    this.flurries = this.flurries.filter((f) => {
      const { m, mv } = f, c = mv.flurry;
      f.t += dt;
      const held = f.t < 0.3 || this.holding(m, f.track, f.t);
      if (!m.braced || !m.alive || !held || m.stamina <= 0) {
        m.braced = false;
        if (m.alive) { m.addBuff('def', c.weak, 2); if (m.state === 'loop') m.toIdle(); } // left open for a moment afterwards
        return false;
      }
      m.spend(c.upkeep * dt);
      m.addBuff('def', c.weak, 0.2);
      m.dir = dirFromVec(f.dx, f.dy);
      if ((f.next -= dt) > 0) return true;
      f.next += c.gap;
      const x = m.x + f.dx * (mv.reach + 8), y = m.y + f.dy * (mv.reach + 8);
      this.fx.push({ img: this.add.image(Math.round(x + (this.rand() - 0.5) * 10), Math.round(y - 8 + (this.rand() - 0.5) * 8), mv.frames[0]).setDepth(60 + y), frames: mv.frames, t: 0, fps: 60 });
      this.hitCircle(m, x, y, mv.radius, f.dmg * (1 + c.step * f.n), { ...mv, thru: true });
      f.n++;
      return true;
    });
  }

  // Shadow Sneak and Phantom Force: out of sight, then up again with the hit.
  updateVanishes(dt) {
    this.vanishes = this.vanishes.filter((v) => {
      const { m, mv } = v;
      if (m.state !== 'bird') { m.hidden = m.under = false; return false; } // called off
      if ((v.t += dt) < mv.vanish.time) return true;
      m.hidden = m.under = false;
      m.toIdle();
      let hx, hy;
      if (v.foe?.alive) {
        // up at the foe's back, on the far side from where it went under
        const d = Math.hypot(v.foe.x - v.x0, v.foe.y - v.y0) || 1, ux = (v.foe.x - v.x0) / d, uy = (v.foe.y - v.y0) / d;
        const back = { x: v.foe.x + ux * 16, y: v.foe.y + uy * 16 };
        Object.assign(m, this.walkable(back.x, back.y) ? back : { x: v.foe.x - ux * 16, y: v.foe.y - uy * 16 });
        m.face(v.foe.x, v.foe.y);
        hx = v.foe.x; hy = v.foe.y;
      } else {
        // Phantom Force comes up wherever its user is aiming by then; a Shadow Sneak with nobody to follow, where it was sent
        m.x = v.x0; m.y = v.y0;
        Object.assign(m, mv.vanish.behind ? v.spot : this.blinkSpot(m, mv, this.aimOf(m, v.track)));
        hx = m.x; hy = m.y;
      }
      if (!mv.vanish.behind) v.burst(); // Shadow Sneak comes up with only the hit to show for it
      this.hitCircle(m, hx, hy, mv.radius, v.dmg, mv);
      return false;
    });
  }

  // Threads, whips and standing rocks.
  updateLines(dt) {
    const g = this.lineG.clear();
    this.threads = this.threads.filter((q) => {
      if ((q.time -= dt) <= 0 || !q.a.alive || !q.t.alive || !this.sight(q.a, q.t)) { q.t.buffs.spd.t = Math.min(q.t.buffs.spd.t, 0.2); return false; } // spent, or snapped on a rock
      g.lineStyle(1, 0xffffff, 0.85).lineBetween(q.a.x, q.a.y - 8, q.t.x, q.t.y - 8);
      return true;
    });
    this.whips = (this.whips ?? []).filter((q) => {
      g.lineStyle(2, q.color, 1).lineBetween(q.m.x, q.m.y - 8, q.x, q.y - 8);
      return (q.t -= dt) > 0;
    });
    this.pillars = this.pillars.filter((q) => {
      if ((q.t -= dt) > 0) { q.img.setAlpha(Math.min(1, q.t * 2)); return true; }
      q.img.destroy();
      return false;
    });
  }

  // Timers that live on a mon and need the scene when they run out: a lit fuse, a Bide, a Dragon Dance.
  updateMonTimers(m, dt) {
    if (m.fuse) {
      const f = m.fuse, was = Math.ceil(f.t / 0.4);
      f.t -= dt;
      if (!m.alive) m.fuse = null; // knocked out: it never goes off
      else if (f.t <= 0) { m.fuse = null; m.applyTint(); m.cancel(); if (m.state !== 'idle' && m.state !== 'walk') m.toIdle(); this.fireMove(m, f.mv, { ...this.aimOf(m, f.track), track: f.track }); }
      else { m.sprite.setTint(Math.floor(f.t * 16) % 2 ? 0xff5a4a : 0xffffff); if (Math.ceil(f.t / 0.4) < was) this.popup(m, ROMAN[Math.ceil(f.t / 0.4)]); }
    }
    if (m.bide) {
      const b = m.bide;
      m.sprite.setTint(Math.floor(b.t * 12) % 2 ? 0xff9a8a : 0xffffff);
      if ((b.t -= dt) <= 0 || !m.alive) {
        m.bide = null;
        m.applyTint();
        if (m.alive && b.stored > 0) {
          // everything it took comes back out, doubled
          this.spark(m.x, m.y - 10);
          this.hitCircle(m, m.x, m.y, b.mv.bide.radius, b.stored * b.mv.bide.mul, { ...b.mv, fixedDmg: b.stored * b.mv.bide.mul });
        }
      }
    }
    if (m.dance) {
      const d = m.dance, c = d.mv.dance, k = Math.round(d.t / c.beat);
      d.t += dt;
      // the rhythm: a blue ring swells under the dancer and is at its widest on each beat
      const cueT = 0.4;
      for (let q = 1; q <= c.n; q++) {
        if (d.cue[q] || d.t < q * c.beat - cueT) continue;
        d.cue[q] = true;
        const f = DANCE.cueFrames;
        this.fx.push({ img: this.add.image(Math.round(m.x), Math.round(m.y), f[0]).setDepth(5).setScale(1.1), frames: f, t: 0, fps: f.length / (cueT + 0.08), follow: m, lift: 0 });
      }
      // rivals (and the move viewer) keep time by themselves
      if ((m !== this.player || this.autoDance) && !m.remote && k >= 1 && k <= c.n && !d.hit[k] && d.t >= k * c.beat && (this.autoDance || this.rand() < 0.6 || (d.hit[k] = true, false))) this.danceTap(m);
      if (d.t > c.beat * (c.n + 0.5)) this.danceEnd(m);
    }
  }

  // A step of Dragon Dance: on the beat it adds a stack, off it the dance stops there.
  danceTap(m) {
    const d = m.dance, c = d.mv.dance, k = Math.round(d.t / c.beat);
    if (k < 1 || k > c.n || d.hit[k] || Math.abs(d.t - k * c.beat) > c.slack) return this.danceEnd(m);
    d.hit[k] = true;
    d.n++;
    this.popup(m, ROMAN[d.n]);
    this.fx.push({ img: this.add.image(m.x, m.y - 14, DANCE.hitFrames[0]).setScale(0.35), frames: DANCE.hitFrames, t: 0, fps: 90, follow: m, lift: 14 });
  }

  danceEnd(m) {
    const d = m.dance, c = d.mv.dance;
    m.dance = null;
    if (!d.n || !m.alive) return;
    m.addBuff('atk', 1 + c.per * d.n, c.time);
    m.addBuff('spd', 1 + c.per * d.n, c.time);
    this.fx.push({ img: this.add.image(m.x, m.y - 10, POWERUP.frames[0]).setScale(POWERUP.scale), frames: POWERUP.frames, t: 0, fps: 30, follow: m, lift: 10 });
  }

  // Detect worked: the user is behind whoever swung at it.
  detected(m, by) {
    this.popup(m, 'DETECT');
    if (!by || by === m) return;
    const d = Math.hypot(by.x - m.x, by.y - m.y) || 1, x = by.x + ((by.x - m.x) / d) * 16, y = by.y + ((by.y - m.y) / d) * 16;
    if (this.walkable(x, y)) { m.x = x; m.y = y; }
    m.face(by.x, by.y);
    // and whoever swung at thin air is left open for a moment
    if (by.alive) { by.stun = Math.max(by.stun, DETECT_STUN); by.kx = by.ky = 0; this.popup(by, 'STUNNED'); }
  }

  // Destiny Bond: the blow that felled its user lands on whoever struck it.
  bonded(m, by, n) {
    by.invuln = 0;
    this.popup(by, 'BOND');
    by.damage(n, m.x, m.y, { tag: 'curse', raw: true });
  }

  // Psychic's hold: pink orbs circle the area, each dragging a fading trail.
  updateAuras(dt) {
    for (const m of [this.player, ...this.npcs]) {
      const w = m.state === 'windup' && m.windup?.mv.catch ? m.windup : null;
      if (w && !this.auras.some((q) => q.w === w)) this.auras.push({ m, w, t: 0, imgs: [] });
    }
    this.auras = this.auras.filter((q) => {
      if (q.m.windup !== q.w || q.m.state !== 'windup') { for (const i of q.imgs) i.destroy(); return false; }
      q.t += dt;
      const s = this.landSpot(q.m, q.w.mv, q.w.aim ?? this.aimOf(q.m, q.w.track)), R = q.w.mv.radius, n = 4, tail = 5;
      for (let o = 0; o < n; o++) {
        for (let k = 0; k < tail; k++) {
          const img = (q.imgs[o * tail + k] ??= this.add.image(0, 0, 'orb'));
          const a = q.t * 5 + (o / n) * Math.PI * 2 - k * 0.16, y = s.y + (Math.sin(a) * R) / 1.3;
          img.setPosition(Math.round(s.x + Math.cos(a) * R), Math.round(y) - 8).setDepth(60 + y).setAlpha(1 - k / tail).setScale(1 - k * 0.14);
        }
      }
      return true;
    });
  }

  // A slash clears the light shots of the other side out of its arc.
  cutShots(owner, x, y, r) {
    if (owner.remote) return; // the slasher's client decides what it cut and says so
    for (const s of this.shots) {
      if (s.owner.team === owner.team || (s.mv && !s.mv.light) || Math.hypot(s.x - x, (s.y - y) * 1.3) > r + s.r) continue;
      s.dead = s.cut = true; // (it falls in two when it is cleared away: see updateShots)
      this.sayShot(s, 'cut');
    }
    // and cuts any thread that crosses it
    this.threads = this.threads.filter((q) => q.a.team === owner.team || segDist(x, y, q.a.x, q.a.y, q.t.x, q.t.y) > r);
  }

  // A cut shot falls apart: its sprite is split down the middle and the two halves fly off either side of the blade.
  halve(s, x, y) {
    const im = s.img, w = im.width, h = im.height, v = Math.hypot(s.vx, s.vy) || 1, ux = s.vx / v, uy = s.vy / v;
    for (const side of [-1, 1]) {
      const half = this.add.image(im.x, im.y, im.texture.key, im.frame.name).setRotation(im.rotation).setScale(im.scaleX, im.scaleY).setDepth(im.depth + 1);
      if (im.isTinted) half.setTint(im.tintTopLeft);
      half.setCrop(side < 0 ? 0 : w / 2, 0, w / 2, h);
      // the halves part across the shot's line of flight and carry on a little
      this.bits.push({ img: half, vx: ux * 40 - uy * side * 70, vy: uy * 40 + ux * side * 70, spin: side * 6, t: 0, life: 0.4 });
    }
  }

  updateBits(dt) {
    this.bits = this.bits.filter((q) => {
      q.t += dt;
      q.img.x += q.vx * dt; q.img.y += q.vy * dt;
      q.img.rotation += (q.spin ?? 0) * dt;
      q.img.setAlpha((q.a0 ?? 1) * (1 - q.t / q.life));
      if (q.t < q.life) return true;
      q.img.destroy();
      return false;
    });
    // slashes still in their swing
    this.cuts = this.cuts.filter((c) => {
      if (!c.m.alive || c.m.state === 'hurt') return false;
      const sp = this.landSpot(c.m, c.mv, c.aim);
      this.cutShots(c.m, sp.hx ?? sp.x, sp.hy ?? sp.y, c.mv.radius);
      return (c.t -= dt) > 0;
    });
    // flyers coming down: the bird drops out of the sky onto the spot
    this.dives = this.dives.filter((q) => {
      const { h } = q, m = h.m, u = Math.min(1, (q.t += dt) / 0.22);
      if (m.state !== 'bird') { m.hidden = m.under = m.flying = false; h.img.destroy(); return false; }
      h.img.setTexture(h.mv.dirFrames[0][0]).setVisible(true).setPosition(Math.round(m.x), Math.round(m.y - 10 - (1 - u) * (1 - u) * 240)).setDepth(7000);
      if (u < 1) return true;
      m.toIdle();
      m.hidden = false;
      h.img.destroy();
      this.digOut(h);
      return false;
    });
  }

  // Bites in progress: both mons stay put while the biter chews, until time is up or the biter is knocked off.
  updateGrips(dt) {
    this.grips = this.grips.filter((g) => {
      const { a, t, mv } = g;
      if ((g.time -= dt) <= 0 || !a.alive || !t.alive || a.state === 'hurt') { a.grip = t.grip = 0; return false; }
      a.grip = t.grip = g.time;
      if ((g.next -= dt) <= 0 && t.hp > 1) {
        g.next += 0.33;
        const n = g.dmg * 0.2;
        t.hp = Math.max(1, t.hp - n);
        this.spark(t.x, t.y - 10);
        if (mv.drain) { a.heal(n * mv.drain); this.healFx(a); }
      }
      return true;
    });
  }

  // Stances last while their button is held and the user has not been hit; the buff is topped up every frame.
  updateStances(dt) {
    this.stances = this.stances.filter((s) => {
      const { m, mv } = s;
      s.t += dt;
      // a remote fighter's button cannot be seen from here: its stance simply runs for a while
      const held = this.holding(m, s.track, s.t);
      if (s.broke !== undefined) {
        // broken by a hit: letting go straight away throws the blow back at whoever landed it
        const hit = m.lastHit;
        if (!held && m.alive && hit?.by?.alive) { this.popup(m, 'BURST'); hit.by.invuln = 0; hit.by.damage(hit.n * mv.burst.mul, m.x, m.y, { tag: 'heavy', raw: true }); return false; }
        return m.alive && (s.broke += dt) < mv.burst.within;
      }
      if (m.braced && m.alive && held && m.stamina > 0) {
        m.spend(mv.stance.upkeep * dt);
        m.addBuff(mv.buff.stat, mv.buff.mul, 0.2);
        // light shots glance off and fly on as the user's own
        if (mv.deflect) for (const q of this.shots) {
          if (m.remote || q.owner.team === m.team || q.arc || (q.mv && !q.mv.light) || Math.hypot(q.x - m.x, (q.y - m.y) * 1.3) > q.r + 9) continue;
          const a = this.rand() * Math.PI * 2, v = q.speed || 170;
          this.turnShot(q, m, Math.cos(a) * v, Math.sin(a) * v);
          this.spark(q.x, q.y - 8);
        }
        return true;
      }
      const hurt = !m.braced && m.alive && m.lastHit && this.simMs - m.lastHit.t < 100;
      m.braced = false;
      m.buffs[mv.buff.stat].t = 0;
      if (mv.endFrames.length && m.alive) this.fx.push({ img: this.add.image(m.x, m.y - s.lift, mv.endFrames[0]).setScale(mv.scale ?? 1), frames: mv.endFrames, t: 0, fps: mv.fps ?? 30, follow: m, lift: s.lift });
      if (mv.burst && hurt && held) { s.broke = 0; return true; }
      return false;
    });
  }

  // Fields work on everyone of the caster's side standing inside them.
  updateFields(dt) {
    this.fields = this.fields.filter((f) => {
      for (const m of [this.player, ...this.npcs]) {
        if (m.team !== f.team || !m.alive || !this.inField(f, m.x, m.y)) continue;
        if (f.mv.buff) m.addBuff(f.mv.buff.stat, f.mv.buff.mul, 0.2);
        if (f.mv.regen) m.heal(f.mv.regen.hps * 1.8 * dt);
      }
      return (f.t -= dt) > 0;
    });
  }

  // A thin ring that snaps outward and is gone: where a shot was cut or beaten.
  ringPop(x, y, r = 8) {
    const ring = this.add.circle(Math.round(x), Math.round(y), Math.max(5, r)).setStrokeStyle(1.5, 0xffffff, 1).setDepth(7001);
    this.tweens.add({ targets: ring, scale: 2.6, alpha: 0, duration: 140, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
  }

  // ---- game feel (see FEEL) ----
  // A mon has just been hurt for `dealt`. The moment is marked: the mon flashes white, lines burst from the spot, the
  // screen shakes by how hard the hit was, and a really heavy one gets the whole screen. hit: what Mon.damage was told.
  struck(t, dealt, hit) {
    if (!FEEL.on || !(dealt >= 0.5)) return;
    const heavy = hit?.tag === 'heavy' || dealt >= HEAVY_HIT, near = t === this.player || hit?.by === this.player;
    if (FEEL.impact) {
      t.flash = Math.max(t.flash ?? 0, 0.12);
      const g = this.add.graphics({ x: Math.round(t.x), y: Math.round(t.y) - 10 }).setDepth(7002), n = heavy ? 10 : 7, r = 7 + dealt * 0.3, a0 = Math.random() * Math.PI;
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.3, r0 = r * 0.45, r1 = r * (0.85 + Math.random() * 0.4);
        g.lineStyle(i % 2 ? 1 : 2, i % 3 ? 0xffffff : 0xfff3a0, 1).lineBetween(Math.cos(a) * r0, Math.sin(a) * r0 * 0.8, Math.cos(a) * r1, Math.sin(a) * r1 * 0.8);
      }
      this.tweens.add({ targets: g, scale: { from: 0.7, to: 1.35 }, alpha: { from: 1, to: 0 }, duration: heavy ? 190 : 130, ease: 'Cubic.easeOut', onComplete: () => g.destroy() });
    }
    // (a camera's shake is a share of its size: 0.003 is about a pixel here)
    if (FEEL.shake) this.cameras.main.shake(70 + dealt * 4, Math.min(0.012, 0.003 + dealt * 0.00025) * (near ? 1 : 0.5), heavy);
    if (heavy && FEEL.heavy) this.heavyImpact();
  }

  // The full-screen beat of a very heavy hit: a white flash, the picture turned negative for an instant, and a dark
  // vignette that opens back out. (The last two are camera effects of the WebGL renderer; without it there is the flash.)
  heavyImpact() {
    const cam = this.cameras.main;
    if (this.heavyBusy) return;
    this.heavyBusy = true;
    this.time.delayedCall(420, () => { this.heavyBusy = false; });
    cam.flash(90, 255, 255, 255);
    try {
      const neg = cam.postFX.addColorMatrix();
      neg.negative();
      this.time.delayedCall(60, () => cam.postFX.remove(neg));
      const vig = cam.postFX.addVignette(0.5, 0.5, 0.55, 0.45);
      this.tweens.add({ targets: vig, radius: 1.1, strength: 0, duration: 380, ease: 'Quad.easeOut', onComplete: () => cam.postFX.remove(vig) });
    } catch { /* no camera effects on this renderer */ }
  }

  // The camera follows the player closely while it walks, but a dash outruns it a little and a teleport leaves it
  // behind: it then glides after and catches up, so quick movement reads as quick.
  updateCamera(dt) {
    const cam = this.cameras.main, p = this.player;
    if (!FEEL.on || !FEEL.camera || cam._follow !== p.sprite) return;
    const last = this.camLast ?? { x: p.x, y: p.y }, jump = Math.hypot(p.x - last.x, p.y - last.y);
    this.camLast = { x: p.x, y: p.y };
    if (jump > 14) this.camCatch = 0.5; // further in one step than anything walks: it was moved there
    this.camCatch = Math.max(0, (this.camCatch ?? 0) - dt);
    const l = this.camCatch > 0 ? 0.075 : p.state === 'dash' || p.state === 'bird' ? 0.11 : 0.2;
    cam.setLerp(l, l);
  }

  spark(x, y) {
    const s = this.add.image(x, y, 'spark').setDepth(7000);
    this.tweens.add({ targets: s, scale: 2, alpha: 0, angle: 45, duration: 180, onComplete: () => s.destroy() });
  }

  fainted(m) {
    if (m === this.player) {
      this.after(1400, () => m.revive(...this.map.spawn));
      return;
    }
    this.tweens.add({ targets: [m.sprite, m.shadow], alpha: 0, delay: 700, duration: 400 });
    this.after(4000, () => m.revive(m.home.x, m.home.y));
  }

  // ---- frame loop ----
  // Frames come when the display gives them; the fight moves in whole steps of STEP. A frame that is a hair off a step is
  // taken as one step, so a 60 Hz screen never doubles up or skips; a slow machine catches up a few steps at a time.
  update(_, ms) {
    const stepMs = STEP * 1000;
    this.acc += Math.abs(ms - stepMs) < 3 ? stepMs : Math.min(ms, 250);
    for (let n = 0; this.acc >= stepMs - 0.001 && n < 15; n++) { this.acc -= stepMs; this.tick(STEP); }
    if (this.acc > stepMs * 15) this.acc = 0; // too far behind to catch up: drop the backlog
  }

  // One step of the fight.
  tick(dt) {
    this.tickN++;
    this.simMs += dt * 1000;
    if (this.timers.length) {
      const due = this.timers.filter((q) => q.at <= this.simMs);
      if (due.length) { this.timers = this.timers.filter((q) => q.at > this.simMs); for (const q of due) q.fn(); }
    }
    const p = this.player;
    const [vx, vy] = this.inputDir();
    p.walk(vx, vy, WALK_SPEED, dt, this.sprinting());
    this.updateWindup(p, dt);
    p.update(dt);
    for (const n of this.npcs) { n.think(dt, p); this.updateWindup(n, dt); n.update(dt); }

    this.updateDashes(dt);
    this.updateHolds(dt);
    this.updateZones(dt);
    this.updateTraps(dt);
    this.updateActives(dt);
    this.updateGrips(dt);
    this.updateStances(dt);
    this.updateFields(dt);
    this.updateWalls(dt);
    this.updateLeaps(dt);
    this.updateSteers(dt);
    this.updateBeams(dt);
    this.updateAuras(dt);
    this.updateArcs(dt);
    this.updateFlurries(dt);
    this.updateVolleys(dt);
    this.updateVanishes(dt);
    this.updateLines(dt);
    this.updateBits(dt);
    for (const m of [this.player, ...this.npcs]) this.updateMonTimers(m, dt);
    this.updateDecoys(dt);
    if (this.shadeT > 0) {
      // fade in, hold, fade out
      const u = (this.shadeT -= dt) / this.shadeDur;
      this.shade.setAlpha(0.7 * Phaser.Math.Clamp(Math.min(u * 5, (1 - u) * 5), 0, 1));
    }
    this.updateSprint(p);
    this.updatePads();
    this.updateShots(dt);
    this.fx = this.fx.filter((e) => {
      let i = Math.floor((e.t += dt) * e.fps);
      if (e.follow) e.img.setPosition(Math.round(e.follow.x + (e.dx?.() ?? 0)), Math.round(e.follow.y) - e.lift).setDepth(60 + e.follow.y);
      if (e.fall) { const u = Math.min(1, e.t / e.fall.time); e.img.y = e.y0 - e.fall.h * (1 - u * u); }
      if (e.wobble) { const k = Math.sin(e.t * 15) * 0.2; e.img.setScale(e.wobble * (1 + k), e.wobble * (1 - k)); }
      if (e.loopWhile) i = e.loopWhile() ? i % e.frames.length : e.frames.length;
      if (i < e.frames.length) return e.img.setTexture(e.frames[i]);
      e.onEnd?.();
      e.img.destroy();
      return false;
    });
    // charge effects play once across the wind-up and vanish if it is interrupted
    this.chargeFx = this.chargeFx.filter((c) => {
      if (c.m.windup === c.w) {
        const i = Math.min(c.frames.length - 1, Math.floor((c.w.t / ((c.w.charge ?? c.w.mv.charge) || 1)) * c.frames.length));
        return c.img.setTexture(c.frames[i]).setPosition(Math.round(c.m.x), Math.round(c.m.y) - 8);
      }
      c.img.destroy();
      return false;
    });
    this.updateCamera(dt);
    this.drawMarks();
    this.drawDebug(dt);
    const mv = MOVES[p.move];
    this.game.events.emit('hud', {
      map: this.map.name, character: p.species.name, state: p.state + (p.running ? ' (run)' : '') + (p.buried > 0 ? ' (buried)' : ''), anim: p.animName,
      frame: `${p.frame + 1}/${p.anim.durs.length}`, dir: DIR_NAMES[p.dir], pos: `${Math.round(p.x)}, ${Math.round(p.y)}`,
      hp: p.hp, maxHp: p.maxHp, stamina: p.stamina, maxStamina: p.maxStamina, exhausted: p.exhausted,
      move: mv ? `${mv.name} · ${KIND_LABEL[mv.kind]}${mv.tag ? ` · ${mv.tag}` : ''}${mv.cls === 'status' ? ' · status' : ''}` : '-', buffs: p.buffText(), charged: p.charged, pad: this.padOn?.label ?? '-',
    });
  }

  updatePads() {
    const p = this.player;
    const pad = (this.map.pads ?? []).find((q) => p.x >= q.x && p.x <= q.x + q.w && p.y >= q.y && p.y <= q.y + q.h) ?? null;
    if (pad && pad !== this.padOn && p.grounded) {
      if (pad.anim === 'Hurt') p.damage(12);
      else p.act(pad.anim);
    }
    this.padOn = pad;
  }

  updateZones(dt) {
    this.zones = this.zones.filter((z) => {
      const { mv, img } = z;
      if (z.follow) { z.x = z.follow.x; z.y = z.follow.y; img.setPosition(Math.round(z.x), Math.round(z.y) - z.lift).setDepth(40 + z.y); }
      z.t += dt;
      if (mv.web) {
        // the first foe to step in is held fast for a moment (an electric web paralyses it too), and then the web is spent
        const now = new Set();
        for (const t of this.targets) {
          if (!t.alive || t.airborne || t.under || Math.hypot(t.x - z.x, (t.y - z.y) * 1.3) > mv.radius) continue;
          now.add(t);
          if (t.team === z.owner.team || z.sprung) continue;
          z.sprung = true;
          z.t = Math.max(z.t, mv.linger - WEB_SNARE); // it lasts as long as its catch does
          if (!t.remote) { t.snare = WEB_SNARE; t.kx = t.ky = 0; }
          t.webbed = WEB_SNARE;
          if (mv.status) this.inflict(t, mv.status.kind);
          this.popup(t, 'SNARED');
        }
        // the web shivers when anything steps onto it or pulls free
        if (now.size !== z.inside.size || [...now].some((t) => !z.inside.has(t))) z.wob = 1;
        z.inside = now;
        z.wob = Math.max(0, z.wob - dt * 2.2);
        this.drawWeb(z);
      }
      if (mv.wind) {
        // blows drifting clouds away from the mon that made the wind, and makes them its own
        for (const q of this.shots) {
          if (!q.mv?.cloud || z.owner.remote || q.owner.team === z.owner.team || Math.hypot(q.x - z.x, q.y - z.y) > mv.radius + q.r) continue;
          const d = Math.hypot(q.x - z.owner.x, q.y - z.owner.y) || 1, v = (q.speed || 45) * 2;
          this.turnShot(q, z.owner, ((q.x - z.owner.x) / d) * v, ((q.y - z.owner.y) / d) * v);
        }
      }
      if (mv.pull) {
        // drags foes on the ground, and their shots, in toward its centre
        for (const t of this.targets) {
          const d = Math.hypot(t.x - z.x, t.y - z.y);
          if (t.team === z.owner.team || !t.alive || t.airborne || t.under || t.ingrain || d > mv.radius * 2.4 || d < 3) continue;
          t.slide(((z.x - t.x) / d) * mv.pull * dt, ((z.y - t.y) / d) * mv.pull * dt);
        }
        for (const q of this.shots) if (q.owner.team !== z.owner.team && Math.hypot(q.x - z.x, q.y - z.y) <= mv.radius * 2.6) this.bendShot(q, z.x, z.y, 3.5 * dt);
      }
      const f = Math.floor(z.t * (mv.fps ?? 30));
      img.setTexture(mv.frames[mv.once ? Math.min(f, mv.frames.length - 1) : f % mv.frames.length]);
      if (z.t >= z.next && mv.dmg) {
        // the first hit lands in full (and is the only one that buries); later ones are lighter
        z.next += 0.5;
        this.hitCircle(z.owner, z.x, z.y, mv.radius, z.hits ? z.dmg * 0.4 : z.dmg, z.hits ? { ...mv, bury: 0 } : mv);
        z.hits++;
      }
      if (z.t < mv.linger && (!z.follow || z.follow.alive)) return true;
      if (mv.after && z.owner.alive) this.inflict(z.owner, mv.after);
      z.webG?.destroy();
      img.destroy();
      return false;
    });
  }

  // Sticky Web, drawn strand by strand: spokes and three rings sagging between them. Every knot trembles while the web is
  // shaking, and the knots near a mon standing in it are dragged toward its feet.
  drawWeb(z) {
    const g = z.webG.clear(), R = z.mv.radius, n = 8, fade = Math.min(1, z.t * 4, (z.mv.linger - z.t) * 2);
    const knot = (i, k) => {
      const a = (i / n) * Math.PI * 2 + 0.2, r = R * k * (1 + 0.09 * z.wob * Math.sin(z.t * 34 + i * 2.1 + k * 5));
      let x = z.x + Math.cos(a) * r, y = z.y + (Math.sin(a) * r) / 1.3;
      for (const t of z.inside) { const d = Math.hypot(t.x - x, t.y - y); if (d < 16) { x += (t.x - x) * 0.45 * (1 - d / 16); y += (t.y - y) * 0.45 * (1 - d / 16); } }
      return [x, y];
    };
    // (an electric web is its own colour, and flickers)
    g.lineStyle(1, z.mv.webTint ?? 0xffffff, (z.mv.webTint && Math.floor(z.t * 14) % 3 === 0 ? 1 : 0.75) * fade);
    for (let i = 0; i < n; i++) g.lineBetween(z.x, z.y, ...knot(i, 1));
    for (const k of [0.36, 0.68, 1]) {
      for (let i = 0; i < n; i++) {
        const [ax, ay] = knot(i, k), [bx, by] = knot(i + 1, k), mx = (ax + bx) / 2 + (z.x - (ax + bx) / 2) * 0.14, my = (ay + by) / 2 + (z.y - (ay + by) / 2) * 0.14;
        g.lineBetween(ax, ay, mx, my).lineBetween(mx, my, bx, by); // each span sags toward the centre
      }
    }
  }

  // Hidden hurtboxes left by moves like Stealth Rock: a foe on the ground that steps on one is hit and the art pops up.
  updateTraps(dt) {
    this.traps = this.traps.filter((q) => {
      q.wait -= dt;
      const near = (t) => t.team !== q.owner.team && t.alive && Math.hypot(t.x - q.x, (t.y - q.y) * 1.3) <= q.mv.radius + 7;
      // an ambushing trap also catches whatever comes in by dash, blink or underground (not a plain jump), and harder
      const rush = q.mv.ambush ? this.targets.find((t) => near(t) && (t.state === 'dash' || (t.under && !t.flying))) : null;
      if (q.wait <= 0 && (rush || this.targets.some((t) => near(t) && !t.airborne && !t.under))) {
        q.wait = 0.9;
        const img = this.add.image(Math.round(q.x), Math.round(q.y) - 8, q.mv.frames[0]).setDepth(40 + q.y);
        this.fx.push({ img, frames: q.mv.frames, t: 0, fps: q.mv.fps ?? 30 });
        this.hitCircle(q.owner, q.x, q.y, q.mv.radius, q.dmg * (rush ? q.mv.ambush : 1), rush ? { ...q.mv, deep: true } : q.mv);
      }
      return (q.t -= dt) > 0;
    });
  }

  // A running mon trails the Tailwind art.
  updateSprint() {
    for (const m of [this.player, ...this.npcs]) {
      m.dartT = Math.max(0, (m.dartT ?? 0) - STEP);
      if (!(m.running || m.state === 'dash' || m.dartT > 0) || m.hidden || !m.alive || (m.ghostT = (m.ghostT ?? 0) - STEP) > 0) continue;
      m.ghostT = 0.04;
      const sp = m.sprite, g = this.add.image(sp.x, sp.y, sp.texture.key, sp.frame.name).setDepth(sp.depth - 1).setAlpha(0.5);
      if (m.baseTint) g.setTint(m.baseTint);
      this.bits.push({ img: g, vx: 0, vy: 0, t: 0, life: 0.26, a0: 0.5 });
    }
  }

  // (the Tailwind trail a running mon used to drag)
  oldSprint(m) {
    if (!m.running || m.runFx) return;
    const mv = MOVES[SPRINT.move];
    const img = this.add.image(m.x, m.y - 8, mv.frames[0]).setScale(SPRINT.scale);
    m.runFx = { img, frames: mv.frames, t: 0, fps: mv.fps ?? 30, follow: m, lift: 8, loopWhile: () => m.running, onEnd: () => { m.runFx = null; } };
    this.fx.push(m.runFx);
  }

  // ---- Dig ----
  digBurst(m, mv) {
    const f = mv.impactFrames;
    this.fx.push({ img: this.add.image(Math.round(m.x), Math.round(m.y) - 16, f[0]).setDepth(60 + m.y), frames: f, t: 0, fps: mv.fps ?? 30 });
  }

  // The rubble thrown up along the way: pebbles that hop and sink away, thickest where the user is right now.
  digTrail(h, dt) {
    if ((h.trail = (h.trail ?? 0) - dt) > 0) return;
    h.trail = 0.03;
    const { m } = h;
    for (let i = 0; i < 2; i++) {
      const peb = this.add.image(Math.round(m.x + (this.rand() - 0.5) * 18), Math.round(m.y + (this.rand() - 0.5) * 10), 'pebble')
        .setDepth(4).setScale(0.4 + this.rand() * 0.5).setAngle(this.rand() * 360);
      this.tweens.add({ targets: peb, y: peb.y - 4 - this.rand() * 5, duration: 110, yoyo: true, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: peb, alpha: 0, delay: 350, duration: 400, onComplete: () => peb.destroy() });
    }
  }

  // Surfacing: the rock bursts again and everything around takes the hit.
  digOut(h) {
    h.m.under = h.m.flying = false;
    h.m.hop = 0;
    this.digBurst(h.m, h.mv);
    this.hitCircle(h.m, h.m.x, h.m.y, h.mv.radius, h.dmg, h.mv);
  }

  updateHolds(dt) {
    this.holds = this.holds.filter((h) => {
      const { m, mv } = h;
      // player: while right click (or F) stays down; rivals: a short burst at their target
      const held = this.holding(m, h.track, h.t);
      // a flyer comes down when its time is up, and is dragged down by Gravity
      const grounded = mv.fly && this.heavy(m);
      if (mv.fly && m.state === 'bird' && !grounded && !m.stuck && (!held || m.stamina <= 0 || h.t > mv.fly)) {
        this.dives.push({ h, t: 0 }); // coming down: the bird dives back onto the spot (see updateBits)
        return false;
      }
      if (m.state !== 'bird' || !held || m.stamina <= 0 || (mv.fly && h.t > mv.fly) || grounded || m.stuck) {
        const clean = m.state === 'bird' && !grounded; // not knocked out of it
        if (m.state === 'bird') m.toIdle();
        m.hidden = false;
        h.img.destroy();
        if (mv.dig || (mv.fly && clean)) this.digOut(h);
        if (mv.fly) { m.under = m.flying = false; m.hop = 0; if (grounded) m.stun = 0.5; }
        return false;
      }

      h.t += dt;
      m.spend(mv.upkeep * dt);
      let aim = this.aimOf(m, h.track);
      if (!h.track) {
        const [ix, iy] = this.inputDir();
        if (ix || iy) { const l = Math.hypot(ix, iy); aim = { dx: ix / l, dy: iy / l, dist: 99 }; }
      }
      if (mv.roll) {
        // the user is the shot: it turns only slowly, glances off walls, and every bounce and hit winds it up further
        const c = mv.roll, v = mv.speed * (1 + c.gain * h.n);
        h.a += Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(Math.atan2(aim.dy, aim.dx) - h.a), -c.turn * dt, c.turn * dt);
        let vx = Math.cos(h.a) * v * dt, vy = Math.sin(h.a) * v * dt;
        const ok = (x, y) => this.walkable(x, y) && !this.walled(m, x, y);
        if (!ok(m.x + vx, m.y + vy)) {
          const okx = ok(m.x + vx, m.y), oky = ok(m.x, m.y + vy);
          if (!okx || oky) vx = -vx;
          if (!oky || okx) vy = -vy;
          h.a = Math.atan2(vy, vx);
          h.n = Math.min(c.max, h.n + 1);
          if (mv.bounceFrames?.length) this.fx.push({ img: this.add.image(Math.round(m.x), Math.round(m.y) - 8, mv.bounceFrames[0]).setDepth(60 + m.y), frames: mv.bounceFrames, t: 0, fps: 30 });
          else this.spark(m.x, m.y - 8);
        } else { m.x += vx; m.y += vy; }
        m.dir = dirFromVec(Math.cos(h.a), Math.sin(h.a));
        h.img.angle += 900 * dt;
        if (mv.trail) this.digTrail(h, dt);
        if ((h.cool = (h.cool ?? 0) - dt) <= 0 && this.hitCircle(m, m.x, m.y, mv.radius, h.dmg * (1 + 0.25 * h.n), mv)) { h.cool = 0.5; h.n = Math.min(c.max, h.n + 1); }
      } else if (aim.dist > 6) {
        m.dir = dirFromVec(aim.dx, aim.dy);
        m.slide(aim.dx * mv.speed * dt, aim.dy * mv.speed * dt);
        h.img.setFlipX(aim.dx < 0);
      }
      h.img.setTexture(mv.frames[Math.floor(h.t * (mv.fps ?? 12)) % mv.frames.length]).setPosition(Math.round(m.x), Math.round(m.y) - (mv.dig || mv.ride ? 2 : 10)).setDepth(mv.dig ? 12 + m.y : mv.ride ? 9 + m.y : 60 + m.y);
      if (mv.fly) { const u = Math.min(1, h.t / 0.3); h.img.setTexture(mv.dirFrames[4][0]).setPosition(Math.round(m.x), Math.round(m.y - 10 - u * u * 240)).setDepth(7000).setVisible(u < 1); }
      if (mv.rollGrow) h.img.setScale((mv.scale ?? 1) * Math.min(2.4, 1 + mv.rollGrow * h.t + 0.12 * h.n)); // the rock gathers size as it goes
      if (mv.dig) this.digTrail(h, dt);
      else if (!mv.fly && !mv.roll && this.hitCircle(m, m.x, m.y, mv.radius, h.dmg, mv) && mv.recoil) {
        m.hp = Math.max(1, m.hp - h.dmg * mv.recoil);
        this.spark(m.x, m.y - 10);
      }
      return true;
    });
  }

  updateDashes(dt) {
    this.dashes = this.dashes.filter((d) => {
      const m = d.m;
      if (m.state !== 'dash') { m.hidden = false; return false; }
      const v = Math.hypot(d.vx, d.vy);
      if (d.mv.seek && !d.returning) {
        // curves toward the nearest foe ahead of it
        const t = this.nearestFoe(m, m.x, m.y, 150, [d.vx / v, d.vy / v]);
        if (t) {
          const cur = Math.atan2(d.vy, d.vx), a = cur + Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(Math.atan2(t.y - m.y, t.x - m.x) - cur), -d.mv.seek * dt, d.mv.seek * dt);
          d.vx = Math.cos(a) * v; d.vy = Math.sin(a) * v;
        }
      }
      m.slide(d.vx * dt, d.vy * dt);
      if (d.mv.blaze && Math.hypot(m.x - (d.lx ?? d.x0), m.y - (d.ly ?? d.y0)) >= 14) {
        // a patch of fire every few steps, burning whoever of the other side stands in it for a while
        d.lx = m.x; d.ly = m.y;
        const tm = { ...MOVES.fireSpin, id: d.mv.id, tag: 'strike', radius: 10, linger: 1.8, status: { kind: 'burn', chance: 0.25 }, bury: 0 };
        const img = this.add.image(Math.round(m.x), Math.round(m.y), tm.frames[0]).setOrigin(0.5, 0.9).setScale(0.42).setDepth(40 + m.y);
        this.zones.push({ img, mv: tm, owner: m, x: m.x, y: m.y, lift: 0, t: 0, next: 0.3, hits: 0, dmg: 5 * m.power });
      }
      if (!d.returning && this.hitCircle(m, m.x, m.y, d.mv.radius, d.dmg, d.mv)) {
        // a reckless charge hurts its user too, by a share of the blow, the first time it lands
        if (d.mv.recoilHit && !d.hit && !m.remote) m.hp = Math.max(1, m.hp - d.dmg * d.mv.recoilHit);
        d.hit = true;
        if (d.mv.back) {
          // connected: straight back to where it set off from
          const bx = d.x0 - m.x, by = d.y0 - m.y, l = Math.hypot(bx, by) || 1;
          Object.assign(d, { returning: true, vx: (bx / l) * v, vy: (by / l) * v, t: 0, dur: l / v });
        }
      }
      if ((d.t += dt) < d.dur) return true;
      m.hidden = false;
      m.toIdle();
      if (d.mv.burst) {
        // the dash ends in a blast
        const img = this.add.image(Math.round(m.x), Math.round(m.y) - 8, d.mv.impactFrames[0]).setDepth(60 + m.y);
        this.fx.push({ img, frames: d.mv.impactFrames, t: 0, fps: 24 });
        this.hitCircle(m, m.x, m.y, d.mv.burst, d.dmg, d.mv);
      }
      if (d.mv.tire) { m.stamina = 0; m.exhausted = true; m.regenDelay = 1.5; }
      if (d.mv.chain) {
        // a link that connected earns the next one; a miss leaves the user stumbling
        if (d.hit && d.n < d.mv.chain - 1) m.acro = { mv: d.mv, n: d.n + 1, t: 0.9 };
        else if (!d.hit) m.stun = 0.6;
      }
      // a dash that connects with nothing costs the user some health
      if (!d.hit && d.mv.recoil && m.hp > d.mv.recoil) m.damage(d.mv.recoil);
      return false;
    });
  }

  updateShots(dt) {
    // shots of opposite sides that touch clash: the lighter is destroyed and the heavier flies on weaker; equals cancel
    const weigh = (q) => (q.mv ? (q.mv.light ? 0 : q.mv.weight ?? 1) : 0), sh = this.shots;
    for (let i = 0; i < sh.length; i++) {
      for (let j = i + 1; j < sh.length; j++) {
        const a = sh[i], b = sh[j];
        if (a.dead || b.dead || a.arc || b.arc || a.owner.team === b.owner.team || Math.hypot(a.x - b.x, a.y - b.y) > a.r + b.r) continue;
        // one client settles each clash: the one running the fighter in the lower slot
        if (((a.owner.slot ?? 0) <= (b.owner.slot ?? 0) ? a.owner : b.owner).remote) continue;
        const wa = weigh(a), wb = weigh(b);
        if (wa <= wb) { a.dead = true; this.sayShot(a, 'dead'); }
        if (wb <= wa) { b.dead = true; this.sayShot(b, 'dead'); }
        const win = wa > wb ? a : wb > wa ? b : null, lose = win === a ? b : a;
        if (win) { win.dmg = Math.max(win.dmg * 0.3, win.dmg - lose.dmg * 0.5); this.sayShot(win, 'turn'); }
      }
    }
    const lanes = this.fields.filter((f) => f.lane), screens = this.walls.filter((w) => w.kind === 'screen');
    this.shots = this.shots.filter((s) => {
      if (s.limbo) {
        // it met a remote fighter on this screen: out of play until that fighter's client says what became of it
        if ((s.limbo -= dt) > 0) return true;
        s.img.destroy();
        return false;
      }
      if (s.dead || (s.back && !s.owner.alive)) {
        if (s.dead && FEEL.on && FEEL.shatter) {
          // cut or beaten out of the air: it hangs there white for an instant inside a ring that snaps outward, then its
          // two halves fly apart and fade
          if (s.shatter === undefined) { s.shatter = 0.07; s.img.setTintFill(0xffffff); this.ringPop(s.x, s.y - 8, s.r); }
          if ((s.shatter -= dt) > 0) return true;
          if (s.mv?.tint) s.img.setTint(s.mv.tint); else s.img.clearTint();
          this.halve(s, s.x, s.y);
        } else if (s.dead) { if (s.cut) this.halve(s, s.x, s.y); else this.spark(s.x, s.y - 8); }
        s.img.destroy();
        return false;
      }
      if (s.orbit) {
        // caught by Magnet Pull: it circles its catcher until thrown, or let fly when the pull gives out
        const o = s.orbit, om = o.m;
        if (om.alive && ((o.t -= dt) > 0 || om.remote)) { // a remote catcher's client says when it lets go
          o.a += 6 * dt;
          s.x = om.x + Math.cos(o.a) * 16; s.y = om.y + Math.sin(o.a) * 12;
          s.img.setPosition(Math.round(s.x), Math.round(s.y) - 8).setDepth(10 + s.y);
          return true;
        }
        s.orbit = null;
        const [fx, fy] = dirVec(om.dir);
        this.turnShot(s, om, fx * (s.speed || 200), fy * (s.speed || 200));
      }
      if (s.caught) {
        // held in the air by Psychic, trembling, for as long as its catcher keeps charging
        if (s.caught.m.windup === s.caught.w) { s.img.setPosition(Math.round(s.x + this.rand() * 2 - 1), Math.round(s.y - 8 + this.rand() * 2 - 1)); return true; }
        s.caught = null;
      }
      if (s.back) {
        // on its way home: it heads for its user and is caught there
        const ox = s.owner.x - s.x, oy = s.owner.y - s.y, d = Math.hypot(ox, oy);
        if (d < 10) { s.img.destroy(); return false; }
        s.vx = (ox / d) * s.speed; s.vy = (oy / d) * s.speed;
      }
      if (s.ricochet > 0 && !this.walkable(s.x + s.vx * dt, s.y + s.vy * dt)) {
        // glances off: whichever axis is blocked flips, and it comes off the wall hitting harder
        const okx = this.walkable(s.x + s.vx * dt, s.y), oky = this.walkable(s.x, s.y + s.vy * dt);
        if (!okx || oky) s.vx = -s.vx;
        if (!oky || okx) s.vy = -s.vy;
        s.ricochet--;
        s.dmg *= 1.2;
        this.spark(s.x, s.y - 8);
      }
      if (s.swell) {
        const k = Phaser.Math.Linear(s.swell[0], s.swell[1], 1 - Math.max(0, s.life) / s.life0);
        s.img.setScale(s.s0 * k);
        s.r = s.r0 * k; s.dmg = s.dmg0 * k;
      }
      // a foe marked by Lock-On draws every shot of the side that marked it
      const lock = s.arc || s.back ? null : this.targets.find((t) => t.locked && t.locked.team === s.owner.team && t.team !== s.owner.team && t.alive);
      if (lock) this.bendShot(s, lock.x, lock.y, 4.5 * dt);
      else if (s.turn) {
        // steer toward the nearest foe on the ground; slight homing only bends toward foes ahead of it
        const head = [s.vx / s.speed, s.vy / s.speed];
        const t = this.nearestFoe(s.owner, s.x, s.y, 170, s.cone ? head : null);
        if (t && !t.airborne) {
          const cur = Math.atan2(s.vy, s.vx);
          const diff = Phaser.Math.Angle.Wrap(Math.atan2(t.y - s.y, t.x - s.x) - cur);
          const a = cur + Phaser.Math.Clamp(diff, -s.turn * dt, s.turn * dt);
          s.vx = Math.cos(a) * s.speed; s.vy = Math.sin(a) * s.speed;
        }
      }
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      // flying up an enemy Tailwind lane, it makes half the headway
      if (lanes.some((f) => f.team !== s.owner.team && s.vx * f.dx + s.vy * f.dy < 0 && this.inField(f, s.x, s.y))) { s.x -= s.vx * dt * 0.5; s.y -= s.vy * dt * 0.5; }
      // an enemy Light Screen stops it; a light shot bounces off and belongs to the screen's owner from then on
      if (!s.arc && this.pillars.some((q) => Math.hypot(s.x - q.x, (s.y - q.y) * 1.3) < q.r)) { s.dead = true; return true; } // a standing rock stops it
      const scr = s.arc ? null : screens.find((w) => !w.owner.remote && w.team !== s.owner.team && segDist(s.x, s.y, w.ax, w.ay, w.bx, w.by) < 5); // the screen's own client decides
      if (scr) {
        if (s.mv && !s.mv.light) { s.dead = true; this.sayShot(s, 'dead'); return true; }
        const wx = scr.bx - scr.ax, wy = scr.by - scr.ay, l = Math.hypot(wx, wy), nx = -wy / l, ny = wx / l, dot = s.vx * nx + s.vy * ny;
        this.turnShot(s, scr.owner, s.vx - 2 * dot * nx, s.vy - 2 * dot * ny);
        this.spark(s.x, s.y - 8);
      }
      const u = s.arc ? 1 - Math.max(0, s.life) / s.life0 : 0; // lobbed shots rise and fall along the way
      s.img.setPosition(Math.round(s.x), Math.round(s.y - 8 - (s.arc ?? 0) * 4 * u * (1 - u))).setDepth(10 + s.y);
      if (s.frames) s.img.setTexture(s.frames[Math.floor((s.t += dt) * s.fps) % s.frames.length]);
      if (s.bounce) {
        // squash and stretch, with a little hop
        const k = Math.sin(s.t * 13) * 0.28;
        s.img.setScale(s.s0 * (1 + k), s.s0 * (1 - k)).setY(s.img.y - Math.abs(Math.sin(s.t * 7)) * 5);
      }
      if (s.rotate) s.img.setRotation(Math.atan2(s.vy, s.vx) + s.rotOffset);
      else if (s.spin !== false) s.img.angle += 720 * dt;
      // high in its arc a lobbed shot passes over whatever is below
      const high = s.arc && s.arc * 4 * u * (1 - u) > 14 && s.life > 0;
      // parried in the first instant of the window, a strike shot is sent straight back, twice as fast, as the blocker's own
      const ace = high || (s.mv && s.mv.tag !== 'strike') ? null
        : this.targets.find((t) => !t.remote && t.team !== s.owner.team && t.alive && t.parry > PARRY.window - PARRY.perfect && Math.hypot(t.x - s.x, (t.y - s.y) * 1.3) <= s.r + 7);
      if (ace) {
        ace.parry = 0;
        ace.invuln = 0.4;
        this.parried(ace);
        this.popup(ace, 'REFLECT');
        this.turnShot(s, ace, -s.vx * 2, -s.vy * 2);
        return true;
      }
      // a shot that pierces (or returns) carries on through what it hits, catching each mon once
      const hit = !high && this.hitCircle(s.owner, s.x, s.y, s.r, s.dmg, s.mv, s.done, s) && !s.done;
      if (s.life > 0 && !hit) return true;
      if (hit && this.guessed) { s.limbo = 0.6; s.img.setVisible(false); return true; } // a guess: see limbo above
      if (s.boomerang && !s.back) {
        // out of range: it turns for home and may hit again on the way
        s.back = true;
        s.done.clear();
        s.life = s.life0 * 2;
        return true;
      }
      if (!hit && s.mv?.missPillar && this.walkable(s.x, s.y)) {
        // flew its whole way and met nobody: the boulder stays where it stops, as cover
        const img = this.add.image(Math.round(s.x), Math.round(s.y) + 4, s.mv.frames[0]).setOrigin(0.5, 0.85).setDepth(10 + s.y).setScale(s.mv.scale ?? 1);
        this.pillars.push({ x: s.x, y: s.y, r: 11, t: s.mv.missPillar, img });
      }
      if (!hit && s.mv?.burst) {
        // came down without hitting anyone: it bursts where it lands
        const img = this.add.image(Math.round(s.x), Math.round(s.y) - 8, s.mv.impactFrames[0]).setDepth(60 + s.y).setScale(s.mv.impactScale ?? 1);
        this.fx.push({ img, frames: s.mv.impactFrames, t: 0, fps: s.mv.impactFps ?? 24 });
        this.hitCircle(s.owner, s.x, s.y, s.mv.burst, s.dmg, s.mv);
      }
      s.img.destroy();
      return false;
    });
  }

  drawDebug(dt) {
    const g = this.debug.clear();
    this.hits = this.hits.filter((h) => (h.ttl -= dt) > 0);
    if (!this.showZones) return;
    g.fillStyle(0x38e07b, 0.28).lineStyle(1, 0x0c7a3a, 0.9);
    for (const poly of this.map.walk) {
      const pts = poly.map(([x, y]) => ({ x, y }));
      g.fillPoints(pts, true).strokePoints(pts, true);
    }
    g.fillStyle(0xef4444, 0.5);
    for (const b of this.map.block) b.w !== undefined ? g.fillRect(b.x, b.y, b.w, b.h) : g.fillEllipse(b.x, b.y, b.rx * 2, b.ry * 2);
    g.lineStyle(1, 0xffffff, 0.9);
    for (const q of this.map.pads ?? []) g.strokeRect(q.x, q.y, q.w, q.h);
    g.lineStyle(1, 0xffe566, 1);
    for (const h of this.hits) g.strokeEllipse(h.x, h.y, h.r * 2, (h.r * 2) / 1.3);
    g.lineStyle(1, 0xff8a3d, 0.9);
    for (const q of this.traps) g.strokeEllipse(q.x, q.y, q.mv.radius * 2, (q.mv.radius * 2) / 1.3);
    g.fillStyle(0xffffff, 1);
    for (const m of [this.player, ...this.npcs]) g.fillRect(Math.round(m.x) - 4, Math.round(m.y), 9, 1);
  }
}
