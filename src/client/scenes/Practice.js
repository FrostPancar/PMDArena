import Phaser from 'phaser';
import { Play, VIEW_W } from '../../scene.js';
import { MAPS } from '../../maps.js';
import { movesOf, MOVES } from '../../moves.js';
import { SPECIES_ORDER, ensureSpecies } from '../../sprites.js';
import { Mon } from '../../mon.js';
import { go } from '../transition.js';
import { session, saveSession, loadoutOf, formOf } from '../session.js';
import { ME, lookOf } from '../modes.js';
import { Actions } from '../input.js';
import { CpuController } from '../controllers.js';
import { BattleHud } from '../hud.js';
import { Battle } from './Battle.js';
import { DEPTH, INK, banner, panel, text } from '../ui.js';

const MAX_SPAWNS = 6; // of each kind at once
const DUMMY_HP = 150, DUMMY_TINT = 0xb9c0cf;
const BTN = { x: VIEW_W - 84, y: 21, w: 81, h: 15, gap: 2 };
const FOE_TAG = 0xff7a6a;

// A stage with nobody to beat: the practice arena behind the lab's console. It is the Battle scene without an
// outcome: the player respawns when they go down, and the toolbar down the right edge turns hit boxes on, spawns
// CPUs (they fight back) and dummies (they stand and take it), and clears them again. Numbers rise off everyone who
// takes damage. Nothing here counts toward EXP or the records.
export class Practice extends Battle {
  constructor() { super('practice'); }

  init(data) {
    const me = { slot: 0, team: 0, kind: 'human', owner: ME, species: session.species, moves: loadoutOf(), form: formOf(), name: session.profile.name };
    super.init({ battle: { mode: 'practice', practice: true, seed: (Math.random() * 0x7fffffff) | 0, map: MAPS[data?.map] ? data.map : 'test', fighters: [me] } });
    this.leaveLabel = 'Back to the lab';
    this.hitboxes = false;
    this.lastHp = new Map();
    this.stats = { last: 0, total: 0 };
  }

  create() {
    for (const f of this.cfg.fighters) ensureSpecies(this, lookOf(f));
    this.actions = new Actions(this);
    Play.prototype.create.call(this); // the stage, the player, input: without Battle's online and result handling
    this.label = 'Practice';
    this.hud = new BattleHud(this, this.player, this.me.moves);
    const tab = panel(this, VIEW_W - 55, 3, 52, 15, 'dim').setInteractive({ useHandCursor: true });
    tab.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); this.pause(); });
    text(this, VIEW_W - 50, 5, 'Esc', INK.gold);
    text(this, VIEW_W - 30, 5, 'Menu');
    this.buildToolbar();
    this.input.keyboard.on('keydown', (e) => {
      if (e.repeat || !this.live) return;
      const tool = { Digit1: 'hitboxes', Digit2: 'cpu', Digit3: 'dummy', Digit4: 'clear', Digit5: 'refill' }[e.code];
      if (tool) this.tool(tool);
    });
    this.events.once('create', () => {
      const start = () => { banner(this, MAPS[this.mapId].name, 'Practice'); this.begin(); };
      if (session.briefed.controls) return start();
      session.briefed.controls = true;
      saveSession();
      this.showControls(start);
    });
  }

  // ---- the toolbar ----
  buildToolbar() {
    const tools = [
      ['hitboxes', '1', () => (this.hitboxes ? 'Hitboxes on' : 'Hitboxes off')],
      ['cpu', '2', () => 'Spawn CPU'],
      ['dummy', '3', () => 'Spawn dummy'],
      ['clear', '4', () => 'Clear all'],
      ['refill', '5', () => 'Refill'],
    ];
    this.buttons = tools.map(([id, key, label], i) => {
      const y = BTN.y + i * (BTN.h + BTN.gap);
      const idle = panel(this, BTN.x, y, BTN.w, BTN.h, 'dim'), hot = panel(this, BTN.x, y, BTN.w, BTN.h, 'hot').setVisible(false);
      text(this, BTN.x + 5, y + 2, key, INK.gold);
      const t = text(this, BTN.x + 15, y + 2, label());
      idle.setInteractive({ useHandCursor: true }).on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); if (this.live) this.tool(id); });
      return { id, label, t, hot };
    });
    this.readout = text(this, BTN.x, BTN.y + tools.length * (BTN.h + BTN.gap) + 2, '', INK.mint);
    this.refreshToolbar();
  }

  refreshToolbar() {
    for (const b of this.buttons) {
      b.t.setText(b.label());
      b.hot.setVisible(b.id === 'hitboxes' && this.hitboxes);
    }
    this.readout.setText(`Last hit ${this.stats.last}\nTotal ${this.stats.total}`);
  }

  tool(id) {
    if (id === 'hitboxes') this.hitboxes = !this.hitboxes;
    else if (id === 'cpu') this.spawn('cpu');
    else if (id === 'dummy') this.spawn('dummy');
    else if (id === 'clear') this.clearAll();
    else if (id === 'refill') this.player.revive(this.player.x, this.player.y);
    this.refreshToolbar();
  }

  // A spot 55-110 px from the player that can be stood on, preferring the way they face.
  spotNear() {
    const p = this.player;
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2, r = 55 + Math.random() * 55;
      const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r * 0.7;
      if (this.walkable(x, y) && this.walkable(x - 10, y) && this.walkable(x + 10, y) && this.walkable(x, y + 6)) return [x, y];
    }
    return null;
  }

  spawn(kind) {
    const foes = this.npcs.filter((n) => (kind === 'dummy') === (n.ai === 'dummy'));
    const at = this.spotNear();
    if (!at || foes.length >= MAX_SPAWNS) return banner(this, foes.length >= MAX_SPAWNS ? `${MAX_SPAWNS} is plenty` : 'No room here');
    const pool = SPECIES_ORDER.filter((id) => id !== session.species);
    const species = pool[Math.floor(Math.random() * pool.length)];
    const [x, y] = at;
    if (kind === 'dummy') {
      const mon = new Mon(this, x, y, { team: 'n', ai: 'dummy', tint: DUMMY_TINT, species, hp: DUMMY_HP });
      this.npcs.push(mon);
      this.lastHp.set(mon, mon.hp);
      mon.face(this.player.x, this.player.y);
      return;
    }
    const set = movesOf(species).filter((id) => MOVES[id]);
    const attacks = set.filter((id) => MOVES[id].cls === 'attack').sort(() => Math.random() - 0.5);
    const moves = [...attacks.slice(0, 3), ...set.filter((id) => !attacks.includes(id)).sort(() => Math.random() - 0.5)].slice(0, 4);
    const f = { slot: this.fighters.length + 10, team: 1, kind: 'cpu', owner: ME, species, moves };
    const mon = new Mon(this, x, y, { team: 'n', species, move: moves[0] });
    mon.slot = f.slot;
    this.npcs.push(mon);
    this.lastHp.set(mon, mon.hp);
    mon.face(this.player.x, this.player.y);
    const tag = this.add.image(x, y, 'tag').setTint(FOE_TAG).setDepth(9003);
    this.fighters.push({ f, mon, controller: new CpuController(this, mon, f), tag, name: null });
  }

  clearAll() {
    for (const x of this.fighters) {
      if (x.mon === this.player) continue;
      x.tag?.destroy();
      x.name?.destroy();
    }
    this.fighters = this.fighters.filter((x) => x.mon === this.player);
    for (const n of this.npcs) { n.destroy?.(); this.lastHp.delete(n); }
    this.npcs = [];
    this.stats = { last: 0, total: 0 };
  }

  // ---- no outcome ----
  checkOutcome() {}

  // Everyone gets back up: the player at the spawn point, the rest where they stood.
  fainted(m) {
    this.time.delayedCall(m === this.player ? 1000 : 1500, () => {
      if (!m.sprite.active) return;
      if (m === this.player) m.revive(...this.map.spawn);
      else m.revive(m.home.x, m.home.y);
    });
  }

  leave() {
    if (this.over) return;
    this.over = true;
    go(this, 'hub', { area: 'lab', entry: 'console' });
  }

  // ---- seeing what a hit does ----
  // Hit circles stay up long enough to read (the engine's 0.18 s is a blink).
  hitCircle(owner, x, y, r, dmg, mv) {
    const n = this.hits.length;
    const any = super.hitCircle(owner, x, y, r, dmg, mv);
    for (let i = n; i < this.hits.length; i++) this.hits[i].ttl = 0.5;
    return any;
  }

  // The area a hit covers is where a mon's feet may stand to be caught: the circle grown by the mon's own radius (7),
  // squashed the way the ground is (the engine tests y * 1.3). Mons show that small body in blue (yours) or red.
  drawDebug(dt) {
    this.hits = this.hits.filter((h) => (h.ttl -= dt) > 0);
    const g = this.debug.clear();
    if (!this.hitboxes) return;
    g.lineStyle(1, 0xffe566, 1).fillStyle(0xffe566, 0.12);
    for (const h of this.hits) {
      const w = (h.r + 7) * 2, ht = w / 1.3;
      g.fillEllipse(h.x, h.y, w, ht).strokeEllipse(h.x, h.y, w, ht);
    }
    g.lineStyle(1, 0xff8a3d, 0.9);
    for (const q of this.traps) g.strokeEllipse(q.x, q.y, (q.mv.radius + 7) * 2, ((q.mv.radius + 7) * 2) / 1.3);
    g.lineStyle(1, 0x7fe8ff, 0.9);
    for (const z of this.zones) g.strokeEllipse(z.x, z.y, (z.mv.radius + 7) * 2, ((z.mv.radius + 7) * 2) / 1.3);
    for (const m of [this.player, ...this.npcs]) {
      const safe = !m.alive || m.airborne || m.invuln > 0; // nothing lands on these
      g.lineStyle(1, m.team === 'p' ? 0x6fe3ff : 0xff6a6a, safe ? 0.35 : 1).strokeEllipse(m.x, m.y, 14, 14 / 1.3);
      g.fillStyle(0xffffff, 1).fillRect(Math.round(m.x) - 1, Math.round(m.y) - 1, 3, 3);
    }
  }

  // A number floats up from whoever lost (or regained) health, however it happened.
  damageNumbers() {
    for (const m of [this.player, ...this.npcs]) {
      const before = this.lastHp.get(m) ?? m.hp;
      this.lastHp.set(m, m.hp);
      const d = before - m.hp;
      if (Math.abs(d) < 0.5) continue;
      const hurt = d > 0, n = Math.round(Math.abs(d));
      if (hurt && m !== this.player) { this.stats.last = n; this.stats.total += n; this.refreshToolbar(); }
      const t = this.add.bitmapText(Math.round(m.x) + Phaser.Math.Between(-6, 6), Math.round(m.y) - 34, 'pmd', hurt ? String(n) : `+${n}`)
        .setOrigin(0.5, 1).setTint(hurt ? (m === this.player ? 0xff9a8a : 0xffffff) : INK.mint).setDepth(DEPTH - 100);
      this.tweens.add({ targets: t, y: t.y - 18, alpha: 0, duration: 800, ease: 'Sine.easeOut', onComplete: () => t.destroy() });
    }
  }

  update(t, ms) {
    if (!this.frozen) {
      this.damageNumbers();
      for (const n of this.npcs) n.sprite.setAlpha(n.alive ? 1 : 0.45);
    }
    super.update(t, ms);
  }
}
