import Phaser from 'phaser';
import { SPECIES_ORDER, preloadSprites, finalizeSprites } from './sprites.js';
import { MAPS, WORLD_URL, makeWalkable, buildTestRealm, buildFxTextures, labelTexture } from './maps.js';
import { SPECIES } from './sprites.js';
import { Mon, dirVec, dirFromVec, DIR_NAMES, RUN_MULT } from './mon.js';
import { STATUS_SHEET_URL, DECOY_SHEET_URL, buildStatusIcons, buildDecoy } from './statusfx.js';
import { MOVES, PARRY, CANCEL, EMPOWER, LEECH, SPRINT, STATUS, KIND_LABEL, movesOf, preloadMoves } from './moves.js';

export const VIEW_W = 384, VIEW_H = 216;
export const WALK_SPEED = 62;

// What a basic action does on its hit frame(s). Frames default to the sheet's HitFrame.
const LUNGE_REACH = 14; // how much further out a lunging melee move lands
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
export function loadStages(scene) {
  preloadMoves(scene);
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
  loadCore() {
    preloadSprites(this);
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
      else if (ptr.button === 0 && !this.cancelMove(this.player)) this.basicShot('pointer');
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
      team: 'n', ai, tint, species, hp: ai === 'dummy' ? 60 : 40, power: 0.8, move: set[Math.floor(Math.random() * set.length)],
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
      const x = Math.random() * w, y = Math.random() * h;
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
      const a = Math.random() * Math.PI * 2, r = 50 + Math.random() * 40;
      const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r * 0.7;
      if (this.walkable(x, y)) return this.addNpc(x, y, 'wild').wake();
    }
  }

  // ---- input actions ----
  inputDir() {
    const k = this.keys;
    return [(k.D.isDown || k.RIGHT.isDown) - (k.A.isDown || k.LEFT.isDown), (k.S.isDown || k.DOWN.isDown) - (k.W.isDown || k.UP.isDown)];
  }

  jump() {
    const [vx, vy] = this.inputDir();
    return this.player.jump(vx, vy, WALK_SPEED * (this.player.running ? RUN_MULT : 1.15));
  }

  // Aim from a mon toward the mouse, another mon, or (null) straight ahead.
  aimOf(m, track) {
    let tx, ty;
    if (track === 'pointer') {
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
    this.time.delayedCall(Math.max(0, mid - CANCEL.frames.length / fps / 2) * 1000, () => {
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
    const img = this.add.image(m.x, m.y - 8, PARRY.hitFrames[0]);
    this.fx.push({ img, frames: PARRY.hitFrames, t: 0, fps: 30, follow: m, lift: 8 });
  }

  // ---- equipped moves ----
  // Start charging the equipped move. Stamina drains during the wind-up, then the move goes off.
  useMove(m, track) {
    const mv = MOVES[m.move];
    if (!mv || !m.grounded || m.stuck || m.ailment.noMove || (m.ailment.noStatus && mv.cls === 'status') || m.stamina < mv.cost) return false;
    if (mv.sub && (m.sub || m.hp <= m.maxHp * mv.hpCost)) return false; // already a doll, or not enough health to make one
    m.walk(0, 0);
    m.state = 'windup';
    // a spot-landing move is committed to where it was aimed when the charge began
    m.windup = { mv, t: 0, track, aim: mv.kind === 'mid' || mv.lob ? this.aimOf(m, track) : null };
    if (mv.chargeFrames.length) {
      const img = this.add.image(m.x, m.y - 8, mv.chargeFrames[0]).setDepth(60 + m.y).setScale(mv.chargeScale ?? 1).setOrigin(...(mv.chargeOrigin ?? [0.5, 0.5]));
      this.chargeFx.push({ img, m, w: m.windup, frames: mv.chargeFrames });
    }
    m.setAnim(m.species.anims.Charge ? 'Charge' : 'Idle', 'loop');
    return true;
  }

  // Would a rival's equipped move reach a target d px away?
  wantsMove(m, d) {
    const mv = MOVES[m.move];
    if (!mv || m.stamina < mv.cost) return false;
    if (mv.kind === 'self') {
      // heal when hurt, shield when the foe is close, buff when not already buffed
      if (mv.random) return d < 110;
      if (mv.sub) return !m.sub && m.hp > m.maxHp * 0.5 && d < 90;
      if (mv.heal || mv.ingrain || mv.regen) return m.hp < m.maxHp * 0.6;
      if (mv.shield) return d < 45 && m.shield <= 0;
      if (!mv.buff) return mv.empower ? !m.charged && d < 80 : !!m.status;
      return mv.buff.stat === 'random' ? Math.random() < 0.3 : m.mul(mv.buff.stat) === 1;
    }
    if (mv.kind === 'dash') return d < mv.dash;
    if (mv.kind === 'hold') return d < 120;
    if (mv.kind === 'melee') return d < mv.reach + mv.radius;
    if (mv.kind === 'aoe') return d < (mv.grow ? mv.grow.max * 0.7 : mv.radius);
    return d > 22 && d < (mv.length ?? Math.min(mv.range ?? 100, 120));
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
      if (near) return { x: near.x, y: near.y, foe: near };
    }
    const d = mv.kind === 'melee' ? mv.reach + (mv.lunge === false ? 0 : LUNGE_REACH) : mv.fixed ?? Phaser.Math.Clamp(aim.dist, 24, mv.range);
    const h = mv.hitReach ?? d;
    return { x: m.x + aim.dx * d, y: m.y + aim.dy * d, hx: m.x + aim.dx * h, hy: m.y + aim.dy * h };
  }

  // Ground rings: where the player's equipped move would land, and where any charging move is about to.
  drawMarks() {
    const g = this.marks.clear();
    const ring = (x, y, r, color, alpha) => {
      g.fillStyle(color, alpha * 0.22).fillEllipse(x, y, r * 2, (r * 2) / 1.3);
      g.lineStyle(1, color, alpha).strokeEllipse(x, y, r * 2, (r * 2) / 1.3);
    };
    for (const m of [this.player, ...this.npcs]) {
      const w = m.state === 'windup' ? m.windup : null;
      const mine = m === this.player;
      const mv = w ? w.mv : mine && m.grounded ? MOVES[m.move] : null;
      if (!mv) continue;
      const color = mine ? 0xffffff : 0xff5a4a, alpha = w ? 0.9 : 0.4;
      if (mv.grow) {
        if (w) ring(m.x, m.y, w.radius ?? mv.grow.min, color, alpha);
      } else if (mv.kind === 'mid' || mv.kind === 'auto') {
        const s = this.landSpot(m, mv, w?.aim ?? this.aimOf(m, w ? w.track : 'pointer'));
        ring(s.hx ?? s.x, s.hy ?? s.y, mv.radius, color, alpha);
      } else if (mv.lob) {
        const a = w?.aim ?? this.aimOf(m, 'pointer'), d = Phaser.Math.Clamp(a.dist, 30, mv.range);
        ring(m.x + a.dx * d, m.y + a.dy * d, mv.burst, color, alpha);
      } else if (mv.kind === 'aoe' && w) ring(m.x, m.y, mv.radius, color, alpha);
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
      const held = w.track === 'pointer' ? this.input.activePointer.rightButtonDown() : w.track ? w.t < 0.9 : this.keys.F.isDown;
      w.t += dt;
      w.radius = Math.min(g.max, g.min + g.rate * w.t);
      if (w.radius < g.max) m.spend(g.upkeep * dt);
      m.sprite.setTint(Math.floor(w.t * 24) % 2 ? 0xfff0a0 : 0xffffff);
      if (held && m.stamina > 0) return;
      aim.radius = w.radius;
    } else {
      m.spend((w.mv.cost * Math.min(dt, w.mv.charge - w.t)) / w.mv.charge);
      w.t += dt;
      m.sprite.setTint(Math.floor(w.t * 24) % 2 ? 0xfff0a0 : 0xffffff);
      if (w.t < w.mv.charge) return;
    }
    m.windup = null;
    m.applyTint();
    m.toIdle();
    aim.track = w.track;
    // paralysis: now and then the move just does not come out
    if (Math.random() < (STATUS[m.status?.kind]?.fizzle ?? 0)) return this.spark(m.x, m.y - 12);
    let mv = w.mv;
    if (mv.random) {
      // Metronome: some other move comes out instead, named over the user's head
      const pool = Object.values(MOVES).filter((q) => !q.random && !q.grow && q.kind !== 'hold');
      this.fx.push({ img: this.add.image(m.x, m.y - 26, mv.frames[0]).setScale(mv.scale ?? 1), frames: mv.frames, t: 0, fps: mv.fps ?? 30, follow: m, lift: 26 });
      mv = pool[Math.floor(Math.random() * pool.length)];
      const tag = this.add.image(Math.round(m.x), Math.round(m.y) - 40, labelTexture(this, mv.name.toUpperCase())).setDepth(9500);
      this.tweens.add({ targets: tag, y: tag.y - 10, alpha: 0, delay: 700, duration: 300, onComplete: () => tag.destroy() });
    }
    // a melee move waits for the lunge to reach full stretch before it lands
    const lunge = mv.kind === 'melee' && mv.lunge !== false;
    if (!lunge) this.fireMove(m, mv, aim);
    if (mv.kind !== 'self' || mv.userAnim) m.mute = m.act(mv.userAnim ?? (mv.kind === 'melee' ? 'Attack' : 'Shoot'));
    if (lunge && m.mute) m.pending = { mv, aim };
    else if (lunge) this.fireMove(m, mv, aim);
  }

  // Ramping moves (Fury Cutter) hit harder with each use in a row, up to four steps.
  rampOf(m, mv) {
    if (!mv.ramp) return 1;
    const n = m.ramp && m.ramp.mv === mv && m.ramp.t > 0 ? m.ramp.n : 0;
    m.ramp = { mv, n: Math.min(n + 1, 4), t: 3 };
    return 1 + mv.ramp * n;
  }

  // Is this mon standing in a Gravity zone? Nobody can jump there.
  heavy(m) {
    return this.zones.some((z) => z.mv.gravity && Math.hypot(m.x - z.x, (m.y - z.y) * 1.3) <= z.mv.radius + 7);
  }

  fireMove(m, mv, aim) {
    const { dx, dy } = aim;
    if (mv.hpCost) m.hp = Math.max(1, m.hp - m.maxHp * mv.hpCost);
    if (mv.cleanse) for (const b of Object.values(m.buffs)) if (b.mul < 1) b.t = 0;
    const big = m.charged;
    const dmg = (mv.dmg ?? 0) * m.power * m.mul('atk') * (big ? 2 : 1) * this.rampOf(m, mv);
    if (big) m.setCharged(false);
    const angle = Math.atan2(dy, dx);

    if (mv.bonus && Math.random() < mv.bonus.chance) {
      // a lucky power-up for the user shortly after the move goes off
      this.time.delayedCall(380, () => {
        if (!m.alive) return;
        m.addBuff(mv.bonus.buff.stat, mv.bonus.buff.mul, mv.bonus.buff.time);
        if (mv.bonusFrames.length) {
          const img = this.add.image(m.x, m.y - 8, mv.bonusFrames[0]).setScale(mv.bonus.scale ?? 1);
          this.fx.push({ img, frames: mv.bonusFrames, t: 0, fps: 30, follow: m, lift: 8 });
        }
      });
    }

    if (mv.kind === 'hold') {
      // the user becomes the art and flies for as long as the button is held
      const img = this.add.image(m.x, m.y - 8, mv.frames[0]);
      m.state = 'bird';
      m.hidden = true;
      this.holds.push({ m, mv, img, t: 0, track: aim.track, dmg });
      return;
    }

    if (mv.kind === 'dash') {
      // the user vanishes and rushes along the aim; the art follows it
      const img = this.add.image(m.x, m.y - 8, mv.frames[0]);
      this.fx.push({ img, frames: mv.frames, t: 0, fps: mv.fps ?? 30, follow: m, lift: 8 });
      m.state = 'dash';
      m.hidden = true;
      const v = mv.dash / mv.dur;
      this.dashes.push({ m, vx: dx * v, vy: dy * v, t: 0, hit: false, mv, dmg });
      return;
    }

    if (mv.kind === 'self') {
      // heals, buffs and shields land on the user; a charged one is half again as strong
      const k = big ? 1.5 : 1, [ox, oy] = mv.origin ?? [0.5, 0.5], lift = mv.lift ?? (oy === 0.5 ? 8 : 0);
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
        this.fx.push(e);
      }
      if (mv.shield) m.shield = mv.shield * k;
      if (mv.buff) m.addBuff(mv.buff.stat, mv.buff.mul, mv.buff.time * k);
      if (mv.ingrain) m.ingrain = { t: mv.ingrain.time, hps: mv.ingrain.hps };
      if (mv.sub) m.sub = true;
      if (mv.regen) m.regen = { t: mv.regen.time, hps: mv.regen.hps };
      if (mv.endFrames.length) {
        // plays when the buff runs out
        this.time.delayedCall(mv.buff.time * k * 1000, () => {
          if (m.alive) this.fx.push({ img: this.add.image(m.x, m.y - lift, mv.endFrames[0]).setScale(mv.scale ?? 1), frames: mv.endFrames, t: 0, fps: mv.fps ?? 30, follow: m, lift });
        });
      }
      if (mv.cure) m.clearStatus();
      if (mv.empower) m.setCharged(true);
      if (mv.selfStatus) this.inflict(m, mv.selfStatus);
      if (mv.heal) {
        this.time.delayedCall(mv.healDelay ?? 300, () => {
          if (!m.alive) return;
          m.heal(mv.heal * k);
          this.spark(m.x, m.y - 12);
        });
      }
      return;
    }

    if (mv.kind === 'projectile' || mv.kind === 'homing' || mv.kind === 'slight') {
      // a lobbed shot comes down where it was aimed; the shot starts 10px out
      const travel = mv.lob ? Phaser.Math.Clamp(aim.dist, 30, mv.range) - 10 : mv.range;
      const launch = (frames, r) => {
        const img = this.add.image(m.x, m.y - 8, frames[0]).setScale((mv.scale ?? 1) * (big ? 1.5 : 1));
        if (mv.tint) img.setTint(mv.tint);
        this.shots.push({
          img, frames, fps: mv.fps ?? 30, t: 0, x: m.x + dx * 10, y: m.y + dy * 10,
          vx: dx * mv.speed, vy: dy * mv.speed, speed: mv.speed, turn: mv.turn ?? 0, cone: mv.kind === 'slight',
          life: travel / mv.speed, owner: m, dmg, r, rotate: mv.rotate, rotOffset: mv.rotOffset ?? 0, spin: mv.spin, arc: mv.arc, life0: travel / mv.speed, mv,
        });
      };
      if (!mv.volley) launch(mv.frames, mv.radius);
      // a volley sends its shots one after another, each with its own art and width
      else mv.volley.forEach((v, i) => this.time.delayedCall(i * 170, () => m.alive && launch(v.frames, v.r)));
      return;
    }

    if (mv.kind === 'beam' && mv.flat) {
      // ground art that stretches from the user along the aim, hit line as long as the art
      const sc = (mv.scale ?? 1) * (big ? 1.5 : 1);
      const img = this.add.image(Math.round(m.x), Math.round(m.y), mv.frames[0]).setRotation(angle).setScale(sc).setDepth(4);
      this.fx.push({ img, frames: mv.frames, t: 0, fps: mv.fps ?? 30 });
      const len = (img.width / 2) * sc;
      for (let s = 10, i = 0; s <= len; s += 10, i++) {
        this.time.delayedCall(120 + i * 25, () => this.hitCircle(m, m.x + dx * s, m.y + dy * s, 8, dmg, mv));
      }
      return;
    }

    if (mv.kind === 'beam') {
      const img = this.add.image(Math.round(m.x + dx * 8), Math.round(m.y - 8 + dy * 8), mv.frames[0])
        .setOrigin(0.5, mv.anchor === 'top' ? 0 : 1).setRotation(angle + (mv.anchor === 'top' ? -1 : 1) * Math.PI / 2)
        .setDepth(40 + m.y + Math.max(0, dy) * mv.length);
      img.setScale(big ? 1.5 : 1, mv.length / img.height);
      if (mv.tint) img.setTint(mv.tint);
      this.fx.push({ img, frames: mv.frames, t: 0, fps: mv.fps ?? 30 });
      this.time.delayedCall(260, () => {
        for (let s = 12; s <= mv.length; s += 12) this.hitCircle(m, m.x + dx * s, m.y + dy * s, 9, dmg, mv);
      });
      return;
    }

    if (mv.scatter) {
      // the art bursts at random spots all over the area (a held charge sets its size), then the whole area is hit
      const cx = m.x, cy = m.y, R = aim.radius ?? mv.radius;
      for (let k = Math.max(3, Math.round((R * R) / 260)); k > 0; k--) {
        this.time.delayedCall(Math.random() * 450, () => {
          const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * R, y = cy + Math.sin(a) * r * 0.75;
          const frames = Math.random() < 0.5 ? mv.frames : mv.altFrames;
          const img = this.add.image(Math.round(cx + Math.cos(a) * r), Math.round(y) - 8, frames[0]).setDepth(12 + y).setScale((mv.scale ?? 1) * (big ? 1.5 : 1));
          this.fx.push({ img, frames, t: 0, fps: mv.fps ?? 30 });
        });
      }
      this.time.delayedCall(150, () => this.hitCircle(m, cx, cy, R, dmg, mv));
      return;
    }

    // effects that land on a spot
    const spot = mv.kind === 'aoe' ? { x: m.x, y: m.y } : this.landSpot(m, mv, aim);
    const { x, y } = spot, hx = spot.hx ?? x, hy = spot.hy ?? y;
    if (spot.foe) m.face(x, y);
    const [ox, oy] = mv.origin ?? [0.5, 0.5];
    // centred effects float at body height, ground-anchored ones stand on the spot
    const img = this.add.image(Math.round(x), Math.round(y) - (oy === 0.5 ? 8 : 0), mv.frames[0])
      .setOrigin(ox, oy).setDepth(40 + Math.max(y, m.y)).setScale((mv.scale ?? 1) * (big ? 1.5 : 1));
    if (mv.rotate) img.setRotation(angle);
    if (mv.tint) img.setTint(mv.tint);
    if (mv.alpha) img.setAlpha(mv.alpha);
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
      this.zones.push({ img, mv, owner: m, x: hx, y: hy, lift: oy === 0.5 ? 8 : 0, t: 0, next: 0.12, hits: 0, dmg, follow: mv.follow ? m : null });
      return;
    }
    this.fx.push({ img, frames: mv.frames, t: 0, fps: mv.fps ?? 30 });
    this.time.delayedCall(mv.kind === 'melee' && mv.lunge !== false ? 0 : mv.hitDelay ?? 120, () => {
      if (this.hitCircle(m, hx, hy, mv.radius, dmg, mv) && mv.drain && m.alive) m.heal(dmg * mv.drain);
    });
  }

  nearestFoe(owner, x, y, range, facing) {
    let best = null, bd = range;
    for (const t of [this.player, ...this.npcs]) {
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
    const dmg = c.dmg * m.power * m.mul('atk') * (m.charged ? 2 : 1);
    if (c.kind === 'melee') this.hitCircle(m, m.x + dx * 14, m.y + dy * 11, 13, dmg);
    else if (c.kind === 'radial') this.hitCircle(m, m.x, m.y, 26, dmg);
    else {
      const img = this.add.image(m.x, m.y - 8, SHOT[m.species.type] ?? 'leaf');
      if (m.charged) img.setScale(2);
      this.shots.push({ img, x: m.x + dx * 10, y: m.y + dy * 10, vx: dx * 170, vy: dy * 170, life: 0.75, owner: m, dmg, r: 5 });
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
  hitCircle(owner, x, y, r, dmg, mv) {
    const impact = mv?.impactFrames;
    this.hits.push({ x, y, r, ttl: 0.18 });
    let any = false;
    for (const t of [this.player, ...this.npcs]) {
      if (t.team === owner.team || Math.hypot(t.x - x, (t.y - y) * 1.3) > r + 7) continue;
      if (mv?.strip) { t.shield = 0; for (const b of Object.values(t.buffs)) if (b.mul > 1) b.t = 0; }
      if (mv?.volley) t.invuln = 0; // every wave of a volley can connect
      if (!t.damage(dmg, owner.x, owner.y)) continue;
      any = true;
      if (mv?.bury && t.alive) t.buried = mv.bury;
      if (mv?.debuff && t.alive) t.addBuff(mv.debuff.stat, mv.debuff.mul, mv.debuff.time);
      if (mv?.leech && t.alive) t.leech = { t: mv.leech.time, dps: mv.leech.dps, owner };
      if (mv?.status && t.alive && Math.random() < mv.status.chance) {
        // 'tri' is one of burn, paralysis or freeze
        this.inflict(t, mv.status.kind === 'tri' ? ['burn', 'para', 'freeze'][Math.floor(Math.random() * 3)] : mv.status.kind);
      }
      if (impact?.length) {
        const img = this.add.image(Math.round(t.x), Math.round(t.y) - 8, impact[0]).setDepth(60 + t.y).setScale(mv.impactScale ?? 1);
        this.fx.push({ img, frames: impact, t: 0, fps: 24 });
      } else this.spark(t.x, t.y - 10);
    }
    return any;
  }

  spark(x, y) {
    const s = this.add.image(x, y, 'spark').setDepth(7000);
    this.tweens.add({ targets: s, scale: 2, alpha: 0, angle: 45, duration: 180, onComplete: () => s.destroy() });
  }

  fainted(m) {
    if (m === this.player) {
      this.time.delayedCall(1400, () => m.revive(...this.map.spawn));
      return;
    }
    this.tweens.add({ targets: [m.sprite, m.shadow], alpha: 0, delay: 700, duration: 400 });
    this.time.delayedCall(4000, () => m.revive(m.home.x, m.home.y));
  }

  // ---- frame loop ----
  update(_, ms) {
    const dt = Math.min(ms, 50) / 1000;
    const p = this.player;
    const [vx, vy] = this.inputDir();
    p.walk(vx, vy, WALK_SPEED, dt, this.keys.SHIFT.isDown);
    this.updateWindup(p, dt);
    p.update(dt);
    for (const n of this.npcs) { n.think(dt, p); this.updateWindup(n, dt); n.update(dt); }

    this.updateDashes(dt);
    this.updateHolds(dt);
    this.updateZones(dt);
    this.updateTraps(dt);
    this.updateSprint(p);
    this.updatePads();
    this.updateShots(dt);
    this.fx = this.fx.filter((e) => {
      let i = Math.floor((e.t += dt) * e.fps);
      if (e.follow) e.img.setPosition(Math.round(e.follow.x + (e.dx?.() ?? 0)), Math.round(e.follow.y) - e.lift).setDepth(60 + e.follow.y);
      if (e.loopWhile) i = e.loopWhile() ? i % e.frames.length : e.frames.length;
      if (i < e.frames.length) return e.img.setTexture(e.frames[i]);
      e.onEnd?.();
      e.img.destroy();
      return false;
    });
    // charge effects play once across the wind-up and vanish if it is interrupted
    this.chargeFx = this.chargeFx.filter((c) => {
      if (c.m.windup === c.w) {
        const i = Math.min(c.frames.length - 1, Math.floor((c.w.t / c.w.mv.charge) * c.frames.length));
        return c.img.setTexture(c.frames[i]).setPosition(Math.round(c.m.x), Math.round(c.m.y) - 8);
      }
      c.img.destroy();
      return false;
    });
    this.drawMarks();
    this.drawDebug(dt);
    const mv = MOVES[p.move];
    this.game.events.emit('hud', {
      map: this.map.name, character: p.species.name, state: p.state + (p.running ? ' (run)' : '') + (p.buried > 0 ? ' (buried)' : ''), anim: p.animName,
      frame: `${p.frame + 1}/${p.anim.durs.length}`, dir: DIR_NAMES[p.dir], pos: `${Math.round(p.x)}, ${Math.round(p.y)}`,
      hp: p.hp, maxHp: p.maxHp, stamina: p.stamina, maxStamina: p.maxStamina, exhausted: p.exhausted,
      move: mv ? `${mv.name} · ${KIND_LABEL[mv.kind]}${mv.cls === 'status' ? ' · status' : ''}` : '-', buffs: p.buffText(), charged: p.charged, pad: this.padOn?.label ?? '-',
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
      img.destroy();
      return false;
    });
  }

  // Hidden hurtboxes left by moves like Stealth Rock: a foe on the ground that steps on one is hit and the art pops up.
  updateTraps(dt) {
    this.traps = this.traps.filter((q) => {
      q.wait -= dt;
      if (q.wait <= 0 && [this.player, ...this.npcs].some((t) => t.team !== q.owner.team && t.alive && !t.airborne && Math.hypot(t.x - q.x, (t.y - q.y) * 1.3) <= q.mv.radius + 7)) {
        q.wait = 0.9;
        const img = this.add.image(Math.round(q.x), Math.round(q.y) - 8, q.mv.frames[0]).setDepth(40 + q.y);
        this.fx.push({ img, frames: q.mv.frames, t: 0, fps: q.mv.fps ?? 30 });
        this.hitCircle(q.owner, q.x, q.y, q.mv.radius, q.dmg, q.mv);
      }
      return (q.t -= dt) > 0;
    });
  }

  // A running mon trails the Tailwind art.
  updateSprint(m) {
    if (!m.running || m.runFx) return;
    const mv = MOVES[SPRINT.move];
    const img = this.add.image(m.x, m.y - 8, mv.frames[0]).setScale(SPRINT.scale);
    m.runFx = { img, frames: mv.frames, t: 0, fps: mv.fps ?? 30, follow: m, lift: 8, loopWhile: () => m.running, onEnd: () => { m.runFx = null; } };
    this.fx.push(m.runFx);
  }

  updateHolds(dt) {
    this.holds = this.holds.filter((h) => {
      const { m, mv } = h;
      // player: while right click (or F) stays down; rivals: a short burst at their target
      const held = h.track === 'pointer' ? this.input.activePointer.rightButtonDown() : h.track ? h.t < 0.9 : this.keys.F.isDown;
      if (m.state !== 'bird' || !held || m.stamina <= 0) {
        if (m.state === 'bird') m.toIdle();
        m.hidden = false;
        h.img.destroy();
        return false;
      }
      h.t += dt;
      m.spend(mv.upkeep * dt);
      let aim = this.aimOf(m, h.track);
      if (!h.track) {
        const [ix, iy] = this.inputDir();
        if (ix || iy) { const l = Math.hypot(ix, iy); aim = { dx: ix / l, dy: iy / l, dist: 99 }; }
      }
      if (aim.dist > 6) {
        m.dir = dirFromVec(aim.dx, aim.dy);
        m.slide(aim.dx * mv.speed * dt, aim.dy * mv.speed * dt);
        h.img.setFlipX(aim.dx < 0);
      }
      h.img.setTexture(mv.frames[Math.floor(h.t * (mv.fps ?? 12)) % mv.frames.length]).setPosition(Math.round(m.x), Math.round(m.y) - 10).setDepth(60 + m.y);
      if (this.hitCircle(m, m.x, m.y, mv.radius, h.dmg, mv)) {
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
      m.slide(d.vx * dt, d.vy * dt);
      if (this.hitCircle(m, m.x, m.y, d.mv.radius, d.dmg, d.mv)) d.hit = true;
      if ((d.t += dt) < d.mv.dur) return true;
      m.hidden = false;
      m.toIdle();
      if (d.mv.burst) {
        // the dash ends in a blast
        const img = this.add.image(Math.round(m.x), Math.round(m.y) - 8, d.mv.impactFrames[0]).setDepth(60 + m.y);
        this.fx.push({ img, frames: d.mv.impactFrames, t: 0, fps: 24 });
        this.hitCircle(m, m.x, m.y, d.mv.burst, d.dmg, d.mv);
      }
      if (d.mv.tire) { m.stamina = 0; m.exhausted = true; m.regenDelay = 1.5; }
      // a dash that connects with nothing costs the user some health
      if (!d.hit && d.mv.recoil && m.hp > d.mv.recoil) m.damage(d.mv.recoil);
      return false;
    });
  }

  updateShots(dt) {
    this.shots = this.shots.filter((s) => {
      if (s.turn) {
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
      const u = s.arc ? 1 - Math.max(0, s.life) / s.life0 : 0; // lobbed shots rise and fall along the way
      s.img.setPosition(Math.round(s.x), Math.round(s.y - 8 - (s.arc ?? 0) * 4 * u * (1 - u))).setDepth(10 + s.y);
      if (s.frames) s.img.setTexture(s.frames[Math.floor((s.t += dt) * s.fps) % s.frames.length]);
      if (s.rotate) s.img.setRotation(Math.atan2(s.vy, s.vx) + s.rotOffset);
      else if (s.spin !== false) s.img.angle += 720 * dt;
      // high in its arc a lobbed shot passes over whatever is below
      const high = s.arc && s.arc * 4 * u * (1 - u) > 14 && s.life > 0;
      const hit = !high && this.hitCircle(s.owner, s.x, s.y, s.r, s.dmg, s.mv);
      if (s.life > 0 && !hit) return true;
      if (!hit && s.mv?.burst) {
        // came down without hitting anyone: it bursts where it lands
        const img = this.add.image(Math.round(s.x), Math.round(s.y) - 8, s.mv.impactFrames[0]).setDepth(60 + s.y).setScale(s.mv.impactScale ?? 1);
        this.fx.push({ img, frames: s.mv.impactFrames, t: 0, fps: 24 });
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
