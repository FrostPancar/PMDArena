// Move viewer (moves.html): every move in the game, used on a loop by one mon against a dummy
// standing at a distance that suits the move. Self moves play with the user alone.
import Phaser from 'phaser';
import { Boot, Play, VIEW_W, VIEW_H } from './scene.js';
import { SPECIES } from './sprites.js';
import { MOVES, MOVESETS, KIND_LABEL } from './moves.js';

const $ = (id) => document.getElementById(id);
const show = { stamina: false, damage: true, hitbox: false, clash: false, pause: false };
const IDS = Object.keys(MOVES).sort((a, b) => MOVES[a].name.localeCompare(MOVES[b].name));
const usersOf = (id) => Object.keys(MOVESETS).filter((s) => SPECIES[s] && MOVESETS[s].includes(id));

// How far apart the two stand, by what the move reaches.
function gapOf(mv) {
  if (mv.kind === 'melee') return (mv.reach ?? 18) + 14;
  if (mv.kind === 'aoe') return Math.round((mv.grow ? mv.grow.max * 0.5 : mv.radius) * 0.7);
  if (mv.kind === 'dash') return Math.round(mv.dash * 0.7);
  if (mv.kind === 'hold') return 90;
  if (mv.kind === 'blink') return Math.round(mv.range * 0.8);
  if (mv.fixed !== undefined) return mv.hitReach ?? mv.fixed;
  return Math.round(Math.min(mv.range ?? mv.length ?? 90, 120) * 0.8);
}

class ViewerBoot extends Boot {
  create() {
    this.build();
    this.scene.start('viewer');
  }
}

class Viewer extends Play {
  constructor() { super('viewer'); }

  init() {
    super.init({ map: 'test' });
    this.walkable = () => true; // the pair stand on open floor; nothing here needs the map's walls
  }

  create() {
    this.buildStage();
    const [cx, cy] = this.map.spawn;
    this.centre = { x: cx, y: cy };
    this.cameras.main.stopFollow();
    this.dummy = this.addNpc(cx, cy, 'dummy', 0);
    this.dummy.maxHp = this.dummy.hp = 100;
    this.seen = new Map([[this.player, this.player.hp], [this.dummy, this.dummy.hp]]);
    this.timer = 0;
    this.phase = 'wait';
    this.setShown(this.registry.get('shown') ?? IDS[0], this.registry.get('who'));
  }

  // no keyboard or mouse play here: the loop drives the user, and holds a held move for a moment
  holding(m, track, t) {
    // with the clash toggle on, both beams are held long enough for one to win, and the user mashes
    if (show.clash && MOVES[this.shown].kind === 'beam') { if (m === this.player && Math.floor(t * 5) !== Math.floor((t - 1 / 60) * 5)) this.clashTap(m); return t < 3.5; }
    return track ? super.holding(m, track, t) : t < 1.7;
  }
  inputDir() { return [0, 0]; }
  sprinting() { return false; }

  setShown(id, who) {
    const mv = MOVES[id], users = usersOf(id);
    this.shown = id;
    this.who = users.includes(who) ? who : users[0] ?? 'eevee';
    this.registry.set('shown', id).set('who', this.who);
    this.player.setSpecies(this.who);
    this.dummy.setSpecies(this.who === 'bulbasaur' ? 'squirtle' : 'bulbasaur'); // never the user's double
    this.player.cycles = {};
    this.alone = mv.kind === 'self';
    this.gap = this.alone ? 0 : gapOf(mv);
    this.restart();
    this.game.events.emit('shown', id, this.who, users);
  }

  // Clear the floor and put both back in place, full of health and stamina.
  restart() {
    const { x, y } = this.centre, mv = MOVES[this.shown], p = this.player, d = this.dummy;
    this.clearField();
    this.autoDance = true; // the loop keeps the beat for Dragon Dance
    p.revive(x - this.gap / 2, y);
    d.revive(x + this.gap / 2, y);
    for (const m of [p, d]) { m.invuln = 0; m.toIdle(); m.setCharged(false); }
    p.move = this.shown;
    p.dir = 2; d.dir = 6;
    // heals have something to heal
    if (mv.heal || mv.regen || mv.ingrain) p.hp = p.maxHp * 0.4;
    d.x = this.alone ? -999 : d.x; // a self move plays alone
    this.cameras.main.centerOn(x, y - 14);
    this.seen.set(p, p.hp).set(d, d.hp);
    this.used = 0;
    this.spentAcc = 0;
    this.dealt = 0;
    this.phase = 'wait';
    this.timer = 0.6;
  }

  // Use the move, give it time to play out, then start over.
  loop(dt) {
    const mv = MOVES[this.shown], p = this.player;
    this.used = Math.max(this.used, p.maxStamina - p.stamina);
    if ((this.timer -= dt) > 0) return;
    if (this.phase === 'wait') {
      p.stamina = p.maxStamina;
      // a move that punishes a charge needs the target to be charging one
      if (mv.sucker) { this.dummy.move = 'bubble'; this.dummy.stamina = this.dummy.maxStamina; if (this.useMove(this.dummy, p)) this.dummy.windup.charge = 9; }
      // the clash toggle: the target answers a beam with the same beam
      if (show.clash && mv.kind === 'beam') { this.dummy.move = this.shown; this.dummy.stamina = this.dummy.maxStamina; this.useMove(this.dummy, p); }
      if (mv.asleep) p.setStatus('sleep'); // only usable asleep
      // a move that catches shots needs some thrown at it
      if (mv.catch) for (const ms of [350, 650]) this.time.delayedCall(ms, () => this.dummy.alive && this.fireMove(this.dummy, MOVES.ember, this.aimOf(this.dummy, p)));
      this.useMove(p, this.alone ? null : this.dummy);
      this.phase = 'play';
      const art = Math.max(mv.frames.length / (mv.fps ?? 30), mv.linger ?? 0, (mv.healDelay ?? 0) / 1000, (mv.hitDelay ?? 0) / 1000, mv.decoys?.time ?? 0) + (mv.appear ?? 0) / 1000 + (mv.multi ? (mv.multi.n * mv.multi.gap) / 1000 : 0);
      this.timer = (mv.grow ? 0.9 : mv.ritual ? 1.6 : mv.stance ? 1.8 + mv.charge : mv.field ? mv.field.time * 0.5 + mv.charge : mv.kind === 'beam' ? (show.clash ? 3.8 : 1.2) + mv.charge : mv.catch ? 1.2 : mv.wall ? 3 : mv.charge) + (mv.kind === 'hold' ? 0.9 : 0) + Math.min(6.5, art) + 1.6;
    } else this.restart();
  }

  // Numbers rise off whoever's health changed since the last frame.
  numbers() {
    for (const m of [this.player, this.dummy]) {
      const was = this.seen.get(m), diff = m.hp - was;
      this.seen.set(m, m.hp);
      if (Math.abs(diff) < 0.5 || this.phase === 'wait') continue;
      if (m === this.dummy && diff < 0) this.dealt -= diff;
      if (!show.damage) continue;
      const n = Math.round(Math.abs(diff) * 10) / 10;
      this.rise(m, diff > 0 ? `+${n}` : `${n}`, diff > 0 ? '#8fd14f' : m === this.dummy ? '#ffe566' : '#ef6b5b');
    }
  }

  rise(m, text, color) {
    const t = this.add.text(Math.round(m.x + (Math.random() - 0.5) * 10), Math.round(m.y) - 30, text, {
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '9px', fontStyle: 'bold', color, stroke: '#10141d', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(9600).setResolution(4);
    this.tweens.add({ targets: t, y: t.y - 16, alpha: 0, duration: 900, ease: 'Cubic.easeIn', onComplete: () => t.destroy() });
  }

  update(time, ms) {
    if (show.pause) return;
    const before = this.player.stamina;
    this.loop(Math.min(ms, 50) / 1000);
    super.update(time, ms);
    // the stamina a move takes: one number for the whole use, shown once the spending has stopped
    const spent = Math.max(0, before - this.player.stamina);
    this.spentAcc = (this.spentAcc ?? 0) + spent;
    this.spentIdle = spent > 0 ? 0 : (this.spentIdle ?? 0) + ms / 1000;
    if (this.spentAcc >= 1 && this.spentIdle > 0.25) {
      if (show.stamina) this.rise(this.player, `-${Math.round(this.spentAcc)} st`, '#f2c94c');
      this.spentAcc = 0;
    }
    this.numbers();
    const p = this.player, mv = MOVES[this.shown];
    this.game.events.emit('stat', {
      stamina: Math.round(p.stamina), used: Math.round(this.used), cost: mv.cost, dealt: Math.round(this.dealt * 10) / 10,
      hp: Math.round(p.hp), foe: this.alone ? null : Math.round(this.dummy.hp),
    });
  }

  // only the landing ring of a move that is charging, never the cursor's
  drawMarks() {
    this.marks.clear();
    if (this.player.state === 'windup') super.drawMarks();
  }

  // Hitboxes: every hit circle as it lands, plus the standing ones (shots, zones, traps) and each mon's feet.
  drawDebug(dt) {
    const g = this.debug.clear(), oval = (x, y, r) => g.strokeEllipse(x, y, r * 2, (r * 2) / 1.3);
    this.hits = this.hits.filter((h) => (h.ttl -= dt) > 0);
    if (!show.hitbox) return;
    g.lineStyle(1, 0xffe566, 1);
    for (const h of this.hits) oval(h.x, h.y, h.r);
    g.lineStyle(1, 0x7ad8ff, 0.9);
    for (const s of this.shots) oval(s.x, s.y, s.r);
    g.lineStyle(1, 0xff8a3d, 0.9);
    for (const z of this.zones) oval(z.x, z.y, z.mv.radius);
    for (const q of this.traps) oval(q.x, q.y, q.mv.radius);
    // a mon is hit when a circle comes within 7px of its feet
    g.lineStyle(1, 0xffffff, 0.7);
    for (const m of [this.player, this.dummy]) oval(m.x, m.y, 7);
  }
}

const stage = $('stage');
const zoomFor = () => Math.max(1, Math.floor(Math.min(stage.clientWidth / VIEW_W, stage.clientHeight / VIEW_H)));
const game = new Phaser.Game({
  type: Phaser.AUTO, parent: stage, width: VIEW_W, height: VIEW_H, pixelArt: true, roundPixels: true, backgroundColor: '#0b0e15',
  scale: { mode: Phaser.Scale.NONE, zoom: zoomFor() }, scene: [ViewerBoot, Viewer],
});
window.addEventListener('resize', () => game.scale.setZoom(zoomFor()));
if (import.meta.env.DEV) Object.assign(window, { game, MOVES, show });
const viewer = () => (game.scene.isActive('viewer') ? game.scene.getScene('viewer') : null);

// ---- notes: one free-text note per move ----
// With the dev server they are kept in move-notes.json in the project; on a hosted copy there is no server to
// write to, so they stay in this browser and "Copy all notes" is how they get out.
let notes = {}, hosted = false, saveTimer = 0;
try { notes = JSON.parse(localStorage.getItem('move-notes') ?? '{}'); } catch { /* storage blocked */ }
fetch('/api/move-notes').then((r) => (r.ok && r.headers.get('content-type')?.includes('json') ? r.json() : Promise.reject())).then((saved) => {
  notes = saved; // the project file is the truth; this browser's copy only matters where there is no server
  try { localStorage.setItem('move-notes', JSON.stringify(notes)); } catch { /* storage blocked */ }
  fill();
  $('note').value = notes[shown] ?? '';
}).catch(() => { hosted = true; });
function saveNotes() {
  try { localStorage.setItem('move-notes', JSON.stringify(notes)); } catch { /* storage blocked */ }
  if (hosted) { $('saved').textContent = 'saved in this browser'; return; }
  fetch('/api/move-notes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(notes) })
    .then((r) => { $('saved').textContent = r.ok ? 'saved to move-notes.json' : 'not saved'; })
    .catch(() => { $('saved').textContent = 'not saved'; });
}
$('note').oninput = () => {
  const text = $('note').value;
  if (text.trim()) notes[shown] = text; else delete notes[shown];
  $('list').querySelector('.sel .nm')?.classList.toggle('noted', !!notes[shown]);
  $('saved').textContent = '…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNotes, 500);
};
$('note').onkeydown = (e) => e.stopPropagation(); // arrow keys move the caret here, not the list
$('copy-notes').onclick = () => {
  const text = IDS.filter((id) => notes[id]).map((id) => `${MOVES[id].name} (${id}): ${notes[id].trim()}`).join('\n');
  navigator.clipboard.writeText(text || 'No notes yet.').then(() => { $('saved').textContent = 'copied'; });
};

// ---- side list ----
let kind = 'all', shown = IDS[0];
const KINDS = ['all', 'new', 'noted', ...Object.keys(KIND_LABEL).filter((k) => IDS.some((id) => MOVES[id].kind === k))];
for (const k of KINDS) {
  const b = document.createElement('button');
  b.textContent = k === 'all' ? 'All' : k === 'new' ? 'New' : k === 'noted' ? 'With notes' : KIND_LABEL[k];
  b.className = k === kind ? 'on' : '';
  b.onclick = () => { kind = k; for (const o of $('kinds').children) o.className = o === b ? 'on' : ''; fill(); };
  $('kinds').append(b);
}
const matches = () => {
  const q = $('q').value.trim().toLowerCase();
  return IDS.filter((id) => (kind === 'all' || (kind === 'new' ? !!MOVES[id].fresh : kind === 'noted' ? !!notes[id] : MOVES[id].kind === kind)) && (!q || MOVES[id].name.toLowerCase().includes(q) || id.toLowerCase().includes(q)));
};
function fill() {
  const ids = matches();
  $('count').textContent = `${ids.length} of ${IDS.length} moves`;
  $('list').replaceChildren(...ids.map((id) => {
    const el = document.createElement('div');
    el.className = `item${id === shown ? ' sel' : ''}`;
    el.dataset.id = id;
    el.innerHTML = `<span class="nm${notes[id] ? ' noted' : ''}">${MOVES[id].name}${MOVES[id].fresh ? '<b class="new">NEW</b>' : ''}</span><span class="k">${KIND_LABEL[MOVES[id].kind]}${MOVES[id].cls === 'status' ? ' · status' : ''}</span>`;
    el.onclick = () => pick(id);
    return el;
  }));
}
function pick(id, who) {
  shown = id;
  $('note').value = notes[id] ?? '';
  $('saved').textContent = '';
  for (const el of $('list').children) el.classList.toggle('sel', el.dataset.id === id);
  $('list').querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
  const v = viewer();
  if (v) v.setShown(id, who);
  else game.registry.set('shown', id);
}
$('q').oninput = fill;
window.addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  e.preventDefault();
  const ids = matches(), i = ids.indexOf(shown);
  if (ids.length) pick(ids[Math.max(0, Math.min(ids.length - 1, (i < 0 ? 0 : i) + (e.key === 'ArrowDown' ? 1 : -1)))]);
});
$('who').onchange = () => pick(shown, $('who').value);

// ---- top bar ----
for (const [key, id] of [['stamina', 't-stamina'], ['damage', 't-damage'], ['hitbox', 't-hitbox'], ['clash', 't-clash'], ['pause', 't-pause']]) {
  const b = $(id);
  b.className = show[key] ? 'on' : '';
  b.onclick = () => { show[key] = !show[key]; b.className = show[key] ? 'on' : ''; };
}
const num = (label, v) => (v === undefined || v === null ? '' : `${label} ${v}`);
game.events.on('shown', (id, who, users) => {
  const mv = MOVES[id];
  $('title').textContent = mv.name + (mv.fresh ? ' · NEW' : '');
  $('sub').textContent = [KIND_LABEL[mv.kind], mv.tag, mv.cls, num('power', mv.dmg), num('cost', mv.cost), `charge ${mv.grow ? 'held' : mv.charge + 's'}`,
    num('range', mv.range ?? mv.length ?? mv.dash), num('radius', mv.radius)].filter(Boolean).join(' · ');
  $('who').replaceChildren(...(users.length ? users : [who]).map((s) => new Option(SPECIES[s].name, s, false, s === who)));
});
game.events.on('stat', (s) => {
  $('stat').innerHTML = [
    show.stamina ? `stamina <b>${s.stamina}</b> · used this loop <b>${s.used}</b> (listed cost ${s.cost})` : '',
    show.damage ? `dealt this loop <b>${s.dealt}</b>${s.foe === null ? '' : ` · target HP <b>${s.foe}</b>`} · user HP <b>${s.hp}</b>` : '',
  ].filter(Boolean).join(' &nbsp;|&nbsp; ');
});
fill();
