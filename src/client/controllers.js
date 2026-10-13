import { WALK_SPEED } from '../scene.js';
import { MOVES } from '../moves.js';
import { NOTCH } from '../mon.js';
import { skillOf } from './ladder.js';

// Who drives a fighter that is not the local player. The Battle scene calls update(dt) on each before the mons move.
// CpuController plays a fighter this client owns; RemoteController shows one that another client owns.

// Seconds a jump lasts and how much faster a run animates (Mon keeps these to itself).
const JUMP_TIME = 0.55, RUN_RATE = 1.6;
const HOLD_ANIMS = new Set(['Sit', 'LookUp', 'Faint']);

// ---- the computer ----
// Picks the nearest foe, keeps at the distance its chosen move likes while circling, uses moves when they would
// reach, swings when toe to toe, backs off when out of breath and sometimes jumps clear of a move it sees coming
// or parries what is about to hit it. How well it does all that is its skill, 1 to 5 (ladder.js); a fighter that
// names none plays at 3.
export class CpuController {
  constructor(scene, mon, fighter) {
    Object.assign(this, { scene, mon, moves: fighter.moves, slot: fighter.slot, skill: skillOf(fighter.skill) });
    this.cool = (1.2 + Math.random()) * this.skill.cool; // until it may attack again
    this.seen = new WeakSet(); // the shots and swings it has already decided whether to parry
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
    if (!foe) { if (m.state === 'walk') this.walk(0, 0); return; }
    const k = this.skill;
    const dx = foe.x - m.x, dy = foe.y - m.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;

    // a foe starts charging something: decide once whether to jump out of it
    const w = foe.state === 'windup' ? foe.windup : null;
    if (w && w !== this.watched) { this.watched = w; this.dodging = Math.random() < k.dodge; }
    if (w && this.dodging && w.t >= w.mv.charge * 0.5 && d < 130 && m.grounded) {
      this.dodging = false;
      m.jump(-uy * this.side, ux * this.side, WALK_SPEED * 1.15);
    }
    if (!m.grounded) return;
    if (this.threatened(foe, d) && s.parry(m)) return;

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
    // a wall goes up between the two, a little way out from itself: never on top of the foe, which only shut it in
    const wall = MOVES[m.move]?.wall, ahead = wall && { x: m.x + ux * Math.min(34, d * 0.5), y: m.y + uy * Math.min(34, d * 0.5) };
    if (this.cool <= 0 && s.wantsMove(m, d) && s.useMove(m, ahead || this.aimAt(foe))) { this.cool = (1.1 + Math.random() * 1.3) * k.cool; return; }
    if (d < 22 && this.cool <= 0 && !m.ailment.noAttack) {
      this.walk(0, 0);
      m.face(foe.x, foe.y);
      m.aim = null;
      if (m.act(m.swing)) this.cool = (1.1 + Math.random() * 0.9) * k.cool;
      return;
    }

    const mv = MOVES[m.move], close = mv.kind === 'melee' || mv.kind === 'dash' || mv.kind === 'aoe';
    const keep = m.exhausted || m.stamina < NOTCH ? 110 : close ? 16 : 72;
    let vx = -uy * this.side * 0.7, vy = ux * this.side * 0.7;
    if (d > keep + 12) { vx += ux; vy += uy; } else if (d < keep - 12) { vx -= ux; vy -= uy; }
    // the best of them run in when the gap is long and they have the energy to spare for it
    const run = k.run && d > keep + 70 && m.stamina >= NOTCH * 2;
    const moved = this.walk(vx, vy, WALK_SPEED * k.speed, dt, run);
    if (!moved) this.side = -this.side; // walked into something: go round the other way
  }

  // Walk the mon. The player's own mon (a fight played by the computer, for testing) is moved by its scene from what
  // is asked for here; anyone else is moved at once. Says whether it got anywhere.
  walk(vx, vy, speed, dt, run = false) {
    const m = this.mon, was = this.at ?? [NaN, NaN];
    if (m === this.scene.player) {
      this.scene.autoWalk = vx || vy ? { vx, vy, run } : null;
      this.at = [m.x, m.y];
      return was[0] !== m.x || was[1] !== m.y;
    }
    const bx = m.x, by = m.y;
    m.walk(vx, vy, speed, dt, run);
    return bx !== m.x || by !== m.y;
  }

  // What a move is aimed at: the foe, or a spot off to one side of it for a CPU whose aim is not true.
  aimAt(foe) {
    const off = this.skill.aim;
    if (!off) return foe;
    const a = Math.random() * Math.PI * 2, r = Math.random() * off;
    return { get x() { return foe.x + Math.cos(a) * r; }, get y() { return foe.y + Math.sin(a) * r; } };
  }

  // Is something about to hit it that it has decided to parry? Each shot and each swing is decided on once.
  threatened(foe, d) {
    const { scene: s, mon: m, skill: k } = this;
    if (!k.parry || m.parryCd > 0) return false;
    const decide = (thing) => { if (this.seen.has(thing)) return false; this.seen.add(thing); return Math.random() < k.parry; };
    // a swing in mid-lunge close by
    if (foe.pending && d < 44 && decide(foe.pending)) return true;
    for (const q of s.shots) {
      if (q.owner.team === m.team || q.arc || q.caught) continue;
      const dx = m.x - q.x, dy = m.y - q.y, gap = Math.hypot(dx, dy);
      if (gap < 34 && dx * q.vx + dy * q.vy > 0 && decide(q)) return true; // near, and coming this way
    }
    return false;
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
    mon.damage = (_n, _x, _y, hit) => {
      if (!mon.canBeHit(hit)) return false; // the same gate the owner applies, answer types and all
      mon.invuln = 0.45;
      return true;
    };
    mon.heal = () => {};
    mon.setStatus = () => null;
    mon.addBuff = (stat) => stat;
  }

  receive(d) {
    if (d.k === 's') this.latest = d;
    else {
      // an act: anything in a snapshot sent before it is out of date about what the fighter is doing
      if (d.k === 'w' || d.k === 'f' || d.k === 'c') this.actedAt = d.tk ?? 0;
      this.scene.replay(this.mon, d);
    }
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
      this.scene.struck?.(m, m.hp - d.hp, null); // the same mark a hit leaves on a fighter run here
    }
    m.hp = d.hp;
    m.stamina = d.sta;
    // what its owner is doing with the controls (a held move, where it aims), and state only the owner knows for sure
    if (d.in) m.net = d.in;
    if (d.cz !== undefined) m.chill = d.cz ? { n: d.cz, t: 1 } : null;
    if (d.stn !== undefined) m.stun = d.stn;
    if (d.lk !== undefined) m.locked = d.lk ? { team: m.team === 'p' ? 'n' : 'p', t: 1 } : null;
    if (d.tm !== undefined) m.torment = d.tm ? { t: 1 } : null;
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

    // a snapshot that left before the fighter's latest act arrived must not pose it back into what it was doing before
    if (d.tk !== undefined && d.tk < (this.actedAt ?? 0)) return;
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
