import { WALK_SPEED } from '../scene.js';
import { MOVES } from '../moves.js';

// Who drives a fighter that is not the local player. The Battle scene calls update(dt) on each before the mons move.
// CpuController plays a fighter this client owns; RemoteController shows one that another client owns.

// Seconds a jump lasts and how much faster a run animates (Mon keeps these to itself).
const JUMP_TIME = 0.55, RUN_RATE = 1.6;
const HOLD_ANIMS = new Set(['Sit', 'LookUp', 'Faint']);

// ---- the computer ----
// Picks the nearest foe, keeps at the distance its chosen move likes while circling, uses moves when they would
// reach, swings when toe to toe, backs off when out of breath and sometimes jumps clear of a move it sees coming.
export class CpuController {
  constructor(scene, mon, fighter) {
    Object.assign(this, { scene, mon, moves: fighter.moves, slot: fighter.slot });
    this.cool = 1.2 + Math.random(); // until it may attack again
    this.swap = 0; // until it reconsiders its move
    this.side = Math.random() < 0.5 ? 1 : -1; // which way it circles
    this.sideFor = 1;
    this.watched = null; // the foe wind-up it has already decided about
  }

  // The nearest foe, leaning toward a different one than its team-mate would pick so a pair does not gang up at once.
  target() {
    const m = this.mon;
    let best = null, bd = Infinity;
    for (const t of [this.scene.player, ...this.scene.npcs]) {
      if (t.team === m.team || !t.alive) continue;
      const d = Math.hypot(t.x - m.x, t.y - m.y) * ((t.slot + this.slot) % 2 ? 1 : 0.55);
      if (d < bd) { best = t; bd = d; }
    }
    return best;
  }

  update(dt) {
    const { scene: s, mon: m } = this;
    const foe = s.fighting && m.alive ? this.target() : null;
    if (!foe) { if (m.state === 'walk') m.walk(0, 0); return; }
    const dx = foe.x - m.x, dy = foe.y - m.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;

    // a foe starts charging something: decide once whether to jump out of it
    const w = foe.state === 'windup' ? foe.windup : null;
    if (w && w !== this.watched) { this.watched = w; this.dodging = Math.random() < 0.4; }
    if (w && this.dodging && w.t >= w.mv.charge * 0.5 && d < 130 && m.grounded) {
      this.dodging = false;
      m.jump(-uy * this.side, ux * this.side, WALK_SPEED * 1.15);
    }
    if (!m.grounded) return;

    this.cool -= dt;
    this.swap -= dt;
    this.sideFor -= dt;
    if (this.sideFor <= 0) { this.sideFor = 0.8 + Math.random() * 1.6; if (Math.random() < 0.5) this.side = -this.side; }
    if (this.swap <= 0 && !m.ailment.encore) {
      // prefer a move that would connect from here
      this.swap = 0.5 + Math.random();
      const ready = this.moves.filter((id) => { m.move = id; return s.wantsMove(m, d); });
      const pool = ready.length ? ready : this.moves;
      m.move = pool[Math.floor(Math.random() * pool.length)];
    }
    if (this.cool <= 0 && s.wantsMove(m, d) && s.useMove(m, foe)) { this.cool = 1.1 + Math.random() * 1.3; return; }
    if (d < 22 && this.cool <= 0 && !m.ailment.noAttack) {
      m.walk(0, 0);
      m.face(foe.x, foe.y);
      m.aim = null;
      if (m.act('Attack')) this.cool = 1.1 + Math.random() * 0.9;
      return;
    }

    const mv = MOVES[m.move], close = mv.kind === 'melee' || mv.kind === 'dash' || mv.kind === 'aoe';
    const keep = m.exhausted || m.stamina < 20 ? 110 : close ? 16 : 72;
    let vx = -uy * this.side * 0.7, vy = ux * this.side * 0.7;
    if (d > keep + 12) { vx += ux; vy += uy; } else if (d < keep - 12) { vx -= ux; vy -= uy; }
    const bx = m.x, by = m.y;
    m.walk(vx, vy, WALK_SPEED * 0.85, dt);
    if (bx === m.x && by === m.y) this.side = -this.side; // walked into something: go round the other way
  }
}

// ---- another client's fighter ----
// What a client tells the others about a fighter it owns, twenty times a second.
const r1 = (n) => Math.round(n * 10) / 10;
export const snapshot = (m) => ({
  k: 's', s: m.slot, x: r1(m.x), y: r1(m.y), d: m.dir, st: m.state, an: m.animName, f: m.frame, run: m.running ? 1 : 0,
  hp: r1(m.hp), sta: Math.round(m.stamina), ex: m.exhausted ? 1 : 0, ch: m.charged ? 1 : 0,
  sh: r1(m.shield), bur: r1(m.buried), sub: m.sub ? 1 : 0, ing: m.ingrain ? 1 : 0, air: m.air ? r1(m.air.t) : -1,
  ss: m.status ? [m.status.kind, r1(m.status.t)] : 0,
  bf: Object.entries(m.buffs).filter(([, b]) => b.t > 0).map(([k, b]) => [k, b.mul, r1(b.t)]),
});

// The mon is a puppet: it goes where the snapshots say and plays the animation they name, while the things its owner
// does (moves, basic attacks, parries) arrive as events that the Battle scene replays on it. Those replays hit this
// client's own fighters for real; what they do to other puppets is for show, since each owner decides its own damage.
export class RemoteController {
  constructor(scene, mon, fighter) {
    Object.assign(this, { scene, mon, fighter, latest: null, gone: false });
    mon.remote = true;
    // hits on a puppet only report whether they would connect, so the attacker's own effects (a drain's heal) can play
    mon.damage = () => {
      if (!mon.alive || mon.invuln > 0 || mon.airborne || mon.shield > 0) return false;
      mon.invuln = 0.45;
      return true;
    };
    mon.heal = () => {};
    mon.setStatus = () => null;
    mon.addBuff = (stat) => stat;
  }

  receive(d) {
    if (d.k === 's') this.latest = d;
    else this.scene.replay(this.mon, d);
  }

  // The owner left the battle: its fighter drops.
  drop() {
    this.gone = true;
    this.latest = null;
    this.pose('faint', this.mon.species.anims.Faint ? 'Faint' : 'Idle');
  }

  pose(state, anim) {
    const m = this.mon;
    if (m.windup) { m.windup = null; m.applyTint(); }
    m.hidden = false;
    m.pending = null;
    m.state = state;
    if (state === 'jump') {
      const hop = m.species.anims.Hop;
      m.setAnim(hop ? 'Hop' : 'Idle', 'hold');
      if (hop) m.animRate = hop.durs.reduce((a, b) => a + b, 0) / 60 / JUMP_TIME;
    } else if (m.species.anims[anim]) {
      m.setAnim(anim, state === 'action' || state === 'hurt' ? 'once' : state === 'faint' || HOLD_ANIMS.has(anim) ? 'hold' : 'loop');
    }
  }

  update(dt) {
    const m = this.mon, d = this.latest;
    if (!d) return;
    // ease toward where the owner says it is; snap when far off (a revive, a dash that ended elsewhere)
    const gap = Math.hypot(d.x - m.x, d.y - m.y);
    const k = gap > 60 ? 1 : Math.min(1, dt * 16);
    m.x += (d.x - m.x) * k;
    m.y += (d.y - m.y) * k;
    if (d === this.applied) return;
    this.applied = d;

    m.dir = d.d;
    if (d.hp < m.hp - 0.5 && d.st !== 'faint') {
      m.sprite.setTintFill(0xffffff);
      this.scene.time.delayedCall(90, () => m.sprite.active && m.applyTint());
    }
    m.hp = d.hp;
    m.stamina = d.sta;
    m.exhausted = !!d.ex;
    m.shield = d.sh;
    m.buried = d.bur;
    m.sub = !!d.sub;
    m.ingrain = d.ing ? { t: 1, hps: 0 } : null;
    if (!!d.ch !== m.charged) m.setCharged(!!d.ch);
    const kind = d.ss ? d.ss[0] : null;
    if (kind !== (m.status?.kind ?? null)) { m.status = kind ? { kind, t: d.ss[1] } : null; m.applyTint(); } else if (kind) m.status.t = d.ss[1];
    for (const b of Object.values(m.buffs)) b.t = 0;
    for (const [stat, mul, t] of d.bf) m.buffs[stat] = { mul, t };

    // moves put the puppet into these states themselves (see Battle.replay); the snapshot only takes it out again
    const busy = d.st === 'dash' || d.st === 'bird';
    // the same one-shot animation started over (a second swing, a second hit taken) shows as its frame going back
    const again = (d.st === 'action' || d.st === 'hurt') && d.f < this.frame;
    this.frame = d.f;
    if (d.st === 'windup') {
      if (m.state !== 'windup') this.pose('windup', m.species.anims.Charge ? 'Charge' : 'Idle');
    } else if (!busy && (again || d.st !== m.state || (d.an !== m.animName && d.st !== 'jump'))) this.pose(d.st, d.an);
    if (d.st === 'walk') m.animRate = d.run ? RUN_RATE : 1;
    if (d.st === 'jump' && d.air >= 0) m.air = { t: d.air, vx: 0, vy: 0, ix: 0, iy: 0 };
  }
}
