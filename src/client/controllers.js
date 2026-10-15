import { WALK_SPEED } from '../scene.js';
import { MOVES } from '../moves.js';
import { NOTCH, JUMP_COST } from '../mon.js';
import { skillOf } from './ladder.js';

// Who drives a fighter that is not the local player. The Battle scene calls update(dt) on each before the mons move.
// CpuController plays a fighter this client owns; RemoteController shows one that another client owns.

// Seconds a jump lasts and how much faster a run animates (Mon keeps these to itself).
const JUMP_TIME = 0.55, RUN_RATE = 1.6;
const HOLD_ANIMS = new Set(['Sit', 'LookUp', 'Faint']);

// ---- the computer ----
// How a set of moves wants to be fought with. 'brawler': mostly close-in hits, stays on top of the foe and keeps a
// combo going. 'hitrun': close-in hits that cover ground (dashes, rides), darts in, strikes and gets out again.
// 'ranged': mostly moves that reach, keeps its distance and backs off when crowded. 'mixed': a bit of both.
const CLOSE = new Set(['melee', 'dash', 'aoe', 'hold']), RUSH = new Set(['dash', 'hold']);
export function styleOf(ids) {
  let close = 0, far = 0, rush = 0, combo = 0;
  for (const id of ids) {
    const mv = MOVES[id];
    if (!mv || mv.cls !== 'attack' || mv.kind === 'self' || mv.kind === 'blink') continue;
    if (CLOSE.has(mv.kind)) { close++; if (RUSH.has(mv.kind)) rush++; if (mv.combo) combo++; } else far++;
  }
  if (far >= 2 && far > close) return 'ranged';
  if (close >= 2 && close > far) return rush * 2 >= close && !combo ? 'hitrun' : 'brawler';
  return 'mixed';
}

// A move that only powers its user up (Swords Dance, Agility, a charge-up): worth doing before the fighting starts,
// and once is enough.
export const isBoost = (mv) => !!mv && mv.kind === 'self' && !mv.heal && !mv.shield && !mv.sub && !mv.ingrain && !mv.regen && !mv.decoys
  && (mv.empower || mv.drum || mv.critUp || (mv.buff && (mv.buff.stat === 'random' || mv.buff.mul > 1)));

// A move that comes out before a fresh foe up close can knock it out of the charge.
const FAST = 0.12;
const slow = (mv) => (mv?.charge ?? 0) > FAST;

// Picks the nearest foe and fights it the way its moves want (see styleOf): it powers itself up first while it is
// safe to, keeps the distance its style likes while circling, uses moves when they would reach, swings when toe to
// toe, backs off when out of breath and sometimes jumps clear of a move it sees coming or parries what is about to hit
// it. It does not start a slow move under the nose of a foe that could break it, answers a foe's charge with a quick
// jab, and when it is being hit, comboed, parried or keeps having its charges broken it stops pressing buttons and
// jumps or runs clear to start again. How well it does all that is its skill, 1 to 5 (ladder.js); a fighter that names
// none plays at 3.
//
// pilot: it only walks, for the player's own mon under the auto-move controls (the player does the rest).
export class CpuController {
  constructor(scene, mon, fighter, pilot = false) {
    Object.assign(this, { scene, mon, pilot, slot: fighter.slot ?? mon.slot, skill: skillOf(fighter.skill) });
    this.moves = fighter.moves;
    this.cool = (1.2 + Math.random()) * this.skill.cool; // until it may attack again
    this.seen = new WeakSet(); // the shots, swings and dashes it has already decided whether to parry
    this.swap = 0; // until it reconsiders its move
    this.side = Math.random() < 0.5 ? 1 : -1; // which way it circles
    this.sideFor = 1;
    this.watched = null; // the foe wind-up it has already decided about
    this.fresh();
  }

  // A crew's next mon brings other moves: the style and the boosts go with them.
  get moves() { return this._moves; }
  set moves(ids) {
    if (ids === this._moves) return;
    this._moves = ids ?? [];
    this.style = styleOf(this._moves);
    this.fresh();
  }

  // A new life (a fight starts, the next of a crew steps in): nothing used yet, nothing to be wary of.
  fresh() {
    this.used = new Set(); // the boosts it has already used this life
    this.stress = 0; // how hard it has been pressed lately (see nerve)
    this.sinceHit = 9; // seconds since it was last hit
    this.resetT = 0; // seconds left of getting clear
    this.backT = 0; // seconds left of stepping out (after a hit and run, or to make room)
    this.held = 0; // until it reconsiders whether a slow move is too risky up close
    this.opening = 4; // the first seconds of a life, when a boost comes before anything else
    this.hp = this.mon.hp;
    this.round = this.scene.round;
  }

  // The nearest foe, leaning toward a different one than its team-mate would pick so a pair does not gang up at once.
  target() {
    const m = this.mon;
    let best = null, bd = Infinity;
    // (Double Team copies count: whichever of them or the real one is nearest is the target)
    for (const t of this.scene.targets) {
      if (t.team === m.team || !t.alive) continue;
      const d = Math.hypot(t.x - m.x, t.y - m.y) * ((t.slot + this.slot) % 2 ? 1 : 0.55);
      if (d < bd) { best = t; bd = d; }
    }
    return best;
  }

  // How hard it is being pressed: a hit counts, one soon after another (a combo) more, and a hit that broke its
  // charge more again. Being parried counts too (see countered). It eases off with time.
  feel(dt) {
    const m = this.mon;
    this.stress = Math.max(0, this.stress - dt * 0.45);
    this.sinceHit += dt;
    if (m.hp < this.hp - 0.5 && m.alive) {
      this.stress += 1 + (this.sinceHit < 1.6 ? 0.7 : 0) + (this.winding ? 1.2 : 0);
      this.sinceHit = 0;
    }
    this.hp = m.hp;
    this.winding = m.state === 'windup';
  }

  // Its attack was parried (Battle.parried).
  countered() { this.stress += 1.4; }

  update(dt) {
    const { scene: s, mon: m } = this;
    if (this.round !== s.round || (m.alive && !this.alive)) this.fresh();
    this.alive = m.alive;
    this.feel(dt);
    const foe = s.fighting && m.alive ? this.target() : null;
    if (!foe) { if (m.state === 'walk' || this.pilot) this.walk(0, 0); return; }
    const k = this.skill;
    const dx = foe.x - m.x, dy = foe.y - m.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    this.cool -= dt;
    this.swap -= dt;
    this.held -= dt;
    this.opening -= dt;
    this.backT -= dt;
    this.sideFor -= dt;
    if (this.sideFor <= 0) { this.sideFor = 0.8 + Math.random() * 1.6; if (Math.random() < 0.5) this.side = -this.side; }
    if (this.pilot) return this.steer(foe, d, ux, uy, dt);

    // in the air from a jump to get clear: keep drifting away
    if (m.state === 'jump' && this.resetT > 0) { this.resetT -= dt; this.walk(-ux - uy * this.side * 0.5, -uy + ux * this.side * 0.5); return; }

    // a foe starts charging something: decide once whether to jump out of it
    const w = foe.state === 'windup' ? foe.windup : null;
    if (w && w !== this.watched) { this.watched = w; this.dodging = Math.random() < k.dodge; }
    if (w && this.dodging && w.t >= w.mv.charge * 0.5 && d < 130 && m.grounded) {
      this.dodging = false;
      m.jump(-uy * this.side, ux * this.side, WALK_SPEED * 1.15);
    }
    if (!m.grounded) return;
    if (this.threatened(foe, d) && s.parry(m)) return;

    // pressed too hard: stop trading blows and get clear, by a jump if it has the breath for one, else at a run
    if (this.resetT <= 0 && this.stress >= k.nerve && !m.stuck) this.getClear(ux, uy);
    if (this.resetT > 0) {
      this.resetT -= dt;
      if (this.resetT <= 0 || d > 150) { this.resetT = 0; this.cool = Math.min(this.cool, 0.3); }
      else return void this.walk(-ux - uy * this.side * 0.6, -uy + ux * this.side * 0.6, WALK_SPEED * k.speed, dt, m.stamina >= NOTCH);
    }

    const open = this.exposed(foe); // the foe cannot hit back just now: a charge is safe
    const fresh = d < 60 && !open; // up close to a foe that could break a charge

    // power up first, while there is room to: once each, never again this life
    const boost = this.moves.find((id) => isBoost(MOVES[id]) && !this.used.has(id));
    if (boost && !m.ailment.encore && (d > 60 || open)) {
      const was = m.move;
      m.move = boost;
      if (m.stamina >= MOVES[boost].cost && s.useMove(m, foe)) { this.used.add(boost); this.cool = Math.max(this.cool, 0.35); return; }
      m.move = was;
    }

    // a foe winding up right in front of it: a quick jab knocks it out of the charge
    if (w && d < 46 && this.cool <= 0.4 && Math.random() < k.wary * dt * 8) {
      const was = m.move, jab = this.moves.find((id) => { if (!MOVES[id]?.jab) return false; m.move = id; return s.wantsMove(m, d); });
      if (jab && s.useMove(m, foe)) { this.cool = (0.8 + Math.random() * 0.6) * k.cool; return this.struck(); }
      m.move = was;
      if (d < 24 && !m.ailment.noAttack && this.swing(foe)) return;
    }

    if (this.swap <= 0 && !m.ailment.encore) {
      this.swap = 0.5 + Math.random();
      m.move = this.choose(d, fresh);
    }
    // the boost is still to come and the foe is in the way: make room for it first (only at the start; later it fights)
    const room = boost && this.opening > 0 && !open;
    // a slow move under the nose of a foe that could break it: hold it, and as often as not step out to make room
    const mv = MOVES[m.move];
    if (fresh && slow(mv) && this.held <= 0) {
      this.held = 0.45;
      this.risky = Math.random() < k.wary;
      if (this.risky && Math.random() < 0.5 && this.style !== 'brawler') this.backT = 0.5 + Math.random() * 0.4;
    }
    const hold = room || (fresh && slow(mv) && this.risky);

    // a wall goes up between the two, a little way out from itself: never on top of the foe, which only shut it in
    const wall = mv?.wall, ahead = wall && { x: m.x + ux * Math.min(34, d * 0.5), y: m.y + uy * Math.min(34, d * 0.5) };
    if (!hold && this.cool <= 0 && s.wantsMove(m, d) && s.useMove(m, ahead || this.aimAt(foe))) {
      this.cool = (1.1 + Math.random() * 1.3) * k.cool * (this.style === 'brawler' && foe.state === 'hurt' ? 0.45 : 1);
      return this.struck();
    }
    if (d < 22 && this.cool <= 0 && !room && !m.ailment.noAttack && this.swing(foe)) return;

    this.approach(foe, d, ux, uy, dt, room);
  }

  // A swing from where it stands. A brawler with the foe reeling keeps the combo going sooner.
  swing(foe) {
    const m = this.mon;
    this.walk(0, 0);
    m.face(foe.x, foe.y);
    m.aim = null;
    if (!m.act(m.swing)) return false;
    this.cool = (1.1 + Math.random() * 0.9) * this.skill.cool * (this.style === 'brawler' ? 0.6 : 1);
    this.struck();
    return true;
  }

  // It has just struck: a hit-and-runner gets out again.
  struck() { if (this.style === 'hitrun') this.backT = 0.8 + Math.random() * 0.6; }

  // Is the foe in no state to hit back for a moment (reeling, stunned, out of breath, deep in a long charge)?
  // (a charge counts only while plenty of it is left: a quick one would still come out first)
  exposed(foe) {
    const w = foe.state === 'windup' && foe.windup;
    return foe.state === 'hurt' || foe.stun > 0 || foe.exhausted || foe.state === 'faint' || (!!w && (w.charge ?? w.mv.charge) - w.t > 0.3);
  }

  // The move to go for: one that would connect from here, leaning on what suits its style, and quick ones when a fresh
  // foe is close. Boosts are not chosen here (see update).
  choose(d, fresh) {
    const { scene: s, mon: m } = this;
    const pool = this.moves.filter((id) => MOVES[id] && !isBoost(MOVES[id]));
    if (!pool.length) return m.move;
    const fits = (mv) => (this.style === 'ranged' ? !CLOSE.has(mv.kind) : this.style === 'mixed' ? true : CLOSE.has(mv.kind));
    const ready = pool.filter((id) => { m.move = id; return s.wantsMove(m, d); });
    const list = ready.length ? ready : pool.filter((id) => fits(MOVES[id])).length ? pool.filter((id) => fits(MOVES[id])) : pool;
    const weight = (id) => { const mv = MOVES[id]; return 1 + (fits(mv) ? 1 : 0) + (fresh && !slow(mv) ? 2 : 0) + (mv.dmg ?? 0) / 30; };
    let r = Math.random() * list.reduce((n, id) => n + weight(id), 0);
    for (const id of list) if ((r -= weight(id)) <= 0) return id;
    return list[0];
  }

  // Get clear: a jump away (and a little to the side) if it has the stamina, otherwise a run.
  getClear(ux, uy) {
    const m = this.mon;
    this.stress = 0;
    this.resetT = 1.1 + Math.random() * 0.7;
    this.backT = 0;
    this.cool = Math.max(this.cool, 0.5);
    if (m.stamina >= JUMP_COST + NOTCH * 0.5) m.jump(-ux - uy * this.side * 0.5, -uy + ux * this.side * 0.5, WALK_SPEED * 1.3);
  }

  // How far from the foe it likes to be, for its style and the move it has in mind.
  keepFor(mv, foe) {
    const m = this.mon;
    if (m.exhausted || m.stamina < NOTCH || this.backT > 0) return 105;
    const reach = mv ? (mv.length ?? mv.range ?? 90) : 90;
    const far = Math.max(60, Math.min(115, reach * 0.75));
    switch (this.style) {
      case 'ranged': return far;
      case 'brawler': return 16;
      case 'hitrun': return this.cool <= 0.3 || this.exposed(foe) ? 16 : 85; // circling out of reach until it is ready to dart in
      default: return mv && CLOSE.has(mv.kind) ? 16 : 72;
    }
  }

  approach(foe, d, ux, uy, dt, room) {
    const { mon: m, skill: k } = this;
    const keep = room ? 90 : this.keepFor(MOVES[m.move], foe);
    let vx = -uy * this.side * 0.7, vy = ux * this.side * 0.7;
    if (d > keep + 12) { vx += ux; vy += uy; } else if (d < keep - 12) { vx -= ux; vy -= uy; }
    // the best of them run in when the gap is long and they have the energy to spare for it; a hit-and-runner and a
    // ranged mon that is crowded run out again
    const run = (k.run && d > keep + 70 && m.stamina >= NOTCH * 2)
      || (k.cool <= 1 && d < keep - 30 && m.stamina >= NOTCH * 2 && (this.backT > 0 || this.style === 'ranged'))
      || (this.style === 'hitrun' && keep <= 16 && d > 50 && m.stamina >= NOTCH * 2);
    const moved = this.walk(vx, vy, WALK_SPEED * k.speed, dt, run);
    if (!moved) this.side = -this.side; // walked into something: go round the other way
  }

  // How close a move wants its user to be to land: within a melee move's reach, a dash's run, an area's edge; a move that
  // reaches far is used from most of its range.
  reachFor(mv) {
    if (!mv) return null;
    if (mv.kind === 'melee') return Math.max(14, (mv.reach ?? 20) + (mv.radius ?? 12) * 0.5 - 4);
    if (mv.kind === 'dash') return Math.max(30, (mv.dash ?? 80) * 0.6);
    if (mv.kind === 'aoe') return Math.max(14, (mv.grow ? mv.grow.max : mv.radius ?? 30) * 0.6);
    if (mv.kind === 'hold') return 40;
    if (mv.kind === 'self') return null;
    return Math.max(50, Math.min(110, (mv.length ?? mv.range ?? 90) * 0.7));
  }

  // Is the player's mon in trouble just now: hit a moment ago, pressed hard, or about to be hit by a foe close by
  // (a swing, a dash coming at it, a charge about to go off)?
  danger(foe, d) {
    const w = foe.state === 'windup' && foe.windup;
    return this.sinceHit < 1.5 || this.stress >= this.skill.nerve * 0.6 || (!!foe.pending && d < 50) || (foe.state === 'dash' && d < 90)
      || (!!w && d < 100 && (w.charge ?? w.mv.charge) - w.t < 0.35);
  }

  // The auto-move controls: walk the player's mon the way its moves want, circling. The move being aimed decides the
  // distance; with none, a close-in move the mon can afford pulls it in to that move's reach while it is safe, and
  // otherwise it keeps the distance its style likes. Holding run (right click) is a choice made on the spot: in trouble,
  // it runs clear; safe, it runs in. Pressed hard, it gets out of the way on its own.
  steer(foe, d, ux, uy, dt) {
    const { scene: s, mon: m } = this;
    if (!m.grounded && m.state !== 'jump') return this.walk(0, 0);
    const danger = this.danger(foe, d), run = !!s.runHeld?.();
    if (this.resetT <= 0 && this.stress >= this.skill.nerve) { this.stress = 0; this.resetT = 0.9; }
    const flee = () => this.walk(-ux - uy * this.side * 0.6, -uy + ux * this.side * 0.6);
    if (this.resetT > 0) { this.resetT -= dt; return void flee(); }
    if (run && danger) return void flee();

    const aimed = MOVES[s.moves?.[s.aiming]];
    const close = (s.moves ?? []).map((id) => MOVES[id]).filter((mv) => mv && mv.cls === 'attack' && CLOSE.has(mv.kind) && m.stamina >= mv.cost);
    const near = !danger || run ? close.sort((a, b) => this.reachFor(b) - this.reachFor(a))[0] : null; // (the longest reach of them)
    let keep = aimed ? this.reachFor(aimed) ?? this.keepFor(null, foe) : near ? this.reachFor(near) : this.keepFor(null, foe);
    if (run && !aimed) keep = Math.min(keep, near ? this.reachFor(near) : 40); // safe and running: in close
    const inReach = (aimed ? CLOSE.has(aimed.kind) : !!near) && d <= keep + 4;
    let vx = -uy * this.side * 0.6, vy = ux * this.side * 0.6;
    if (d > keep + 6) { vx = ux; vy = uy; } // (closing in goes straight, not round)
    else if (d < keep - 10) { vx -= ux; vy -= uy; }
    // in reach of a close-in move: stand and face the foe, ready to strike
    if (inReach) { vx = 0; vy = 0; m.face(foe.x, foe.y); }
    if (!this.walk(vx, vy) && (vx || vy)) this.side = -this.side;
  }

  // The player struck under the auto-move controls: a hit-and-runner steps back out.
  acted() { this.struck(); this.cool = 0.9 * this.skill.cool; }

  // Walk the mon. The player's own mon (the auto-move controls, or a fight played by the computer for testing) is
  // moved by its scene from what is asked for here; anyone else is moved at once. Says whether it got anywhere.
  walk(vx, vy, speed, dt, run = false) {
    const m = this.mon, was = this.at ?? [NaN, NaN];
    if (m === this.scene.player) {
      this.scene.autoWalk = vx || vy ? { vx, vy, run } : null;
      this.at = [m.x, m.y];
      return was[0] !== m.x || was[1] !== m.y;
    }
    const bx = m.x, by = m.y;
    m.walk(vx, vy, speed, dt, run);
    return bx !== m.x || by !== m.y || m.state === 'jump';
  }

  // What a move is aimed at: the foe, or a spot off to one side of it for a CPU whose aim is not true.
  aimAt(foe) {
    const off = this.skill.aim;
    if (!off) return foe;
    const a = Math.random() * Math.PI * 2, r = Math.random() * off;
    return { get x() { return foe.x + Math.cos(a) * r; }, get y() { return foe.y + Math.sin(a) * r; } };
  }

  // Is something about to hit it that it has decided to parry? Each shot, swing and dash is decided on once.
  threatened(foe, d) {
    const { scene: s, mon: m, skill: k } = this;
    if (!k.parry || m.parryCd > 0) return false;
    const decide = (thing) => { if (this.seen.has(thing)) return false; this.seen.add(thing); return Math.random() < k.parry; };
    // a swing in mid-lunge close by
    if (foe.pending && d < 44 && decide(foe.pending)) return true;
    // a dash coming straight at it
    const dash = foe.state === 'dash' && s.dashes?.find((q) => q.m === foe);
    if (dash && d < 60 && dash.vx * (m.x - foe.x) + dash.vy * (m.y - foe.y) > 0 && decide(dash)) return true;
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
