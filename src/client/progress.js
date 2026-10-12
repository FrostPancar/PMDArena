import { MOVES, movesOf } from '../moves.js';
import { SPECIES } from '../sprites.js';
import { EVOLUTIONS, CHOICES } from '../evolutions.js';
import { typeOf } from './moveinfo.js';

// How a mon grows. Fighting earns EXP, EXP makes levels, and levels do two things: they unlock the stronger half of
// the mon's moves one by one, and at set levels the mon evolves (a new look only; see evolutions.js).
// Nothing here remembers anything: the player's EXP lives in session.js, which asks these questions about it.

export const LEVEL_CAP = 30;
// EXP needed to go from `level` to the next: 50, 60, 70...
export const expToNext = (level) => 40 + 10 * level;

// { level, into, need }: the level that much EXP makes, how far into it, and what the next one takes.
export function levelFor(exp) {
  let level = 1, left = Math.max(0, exp);
  while (level < LEVEL_CAP && left >= expToNext(level)) left -= expToNext(level++);
  return { level, into: level < LEVEL_CAP ? left : 0, need: level < LEVEL_CAP ? expToNext(level) : 0 };
}

// ---- which moves start locked ----
// A move's place in the queue is how strong it is, pushed back for every weaker move of the same family the mon
// already has (a family is one type at one reach: a fire shot, a fire strike, a self boost...). So the basic version
// of an idea comes first and the stronger takes on it later, and a heavy hitter waits even if nothing else is like it.
// The front half of the attacks and the front half of everything else are open from the start; the rest unlock one
// by one, attacks and other moves taking turns, the strongest last.
const reachOf = (mv) => (mv.kind === 'self' ? 'self' : (mv.dmg ?? 0) < 8 ? 'status' : mv.kind === 'melee' || mv.kind === 'dash' || mv.kind === 'hold' ? 'close' : 'far');
const strength = (mv) => (mv.dmg ?? 0) + (mv.weight ?? mv.cost) * 0.25 + (mv.linger ? 4 : 0) + (mv.status ? 6 * mv.status.chance : 0)
  + (mv.drain ? 4 : 0) + (mv.heal ?? 0) * 0.2 + (mv.shield ? 6 : 0) + (mv.empower ? 6 : 0);
const STEP_UP = 12; // how far each weaker relative pushes a move back
const FIRST_UNLOCK = 2, LAST_UNLOCK = 20;

// the levels a list of moves unlocks at (see above)
function schedule(ids) {
  const families = {}, place = {};
  for (const id of ids) (families[`${typeOf(id)}:${reachOf(MOVES[id])}`] ??= []).push(id);
  for (const family of Object.values(families)) {
    family.sort((a, b) => strength(MOVES[a]) - strength(MOVES[b])).forEach((id, i) => { place[id] = strength(MOVES[id]) + STEP_UP * i; });
  }
  place[ids[0]] = -1; // the species' own first move is always open
  const open = new Set(), locked = [];
  const isAttack = (id) => { const r = reachOf(MOVES[id]); return r === 'close' || r === 'far'; };
  for (const group of [ids.filter(isAttack), ids.filter((id) => !isAttack(id))]) {
    group.sort((a, b) => place[a] - place[b]);
    const keep = Math.ceil(group.length / 2);
    group.slice(0, keep).forEach((id) => open.add(id));
    // how far through its own group's locked moves each one is, so the two groups can be shuffled together fairly
    group.slice(keep).forEach((id, i, rest) => locked.push({ id, turn: (i + 1) / (rest.length + 1) }));
  }
  locked.sort((a, b) => a.turn - b.turn || place[a.id] - place[b.id]);
  const step = Math.min(3, Math.max(1, (LAST_UNLOCK - FIRST_UNLOCK) / Math.max(1, locked.length)));
  return [
    ...ids.filter((id) => open.has(id)).map((id) => ({ id, level: 1 })),
    ...locked.map(({ id }, i) => ({ id, level: FIRST_UNLOCK + Math.floor(i * step) })),
  ];
}

const plans = {};
// [{ id, level }] for every move the species can learn: level 1 moves first in their usual order, then the locked
// ones in the order they unlock. `branch` is the evolution a branching species has taken (Eevee): that evolution's own
// moves come on top, opening one by one from the level it evolved at, the weakest first.
export function unlockPlan(species, branch) {
  const key = branch ? `${species}:${branch}` : species;
  if (plans[key]) return plans[key];
  const own = movesOf(species).filter((id) => MOVES[id]);
  const plan = schedule(own);
  if (branch) {
    const extra = movesOf(species, branch).filter((id) => MOVES[id] && !own.includes(id)).sort((a, b) => strength(MOVES[a]) - strength(MOVES[b]));
    const from = evolveLevels(species)[0] ?? 1, step = Math.min(2, 16 / Math.max(1, extra.length));
    extra.forEach((id, i) => plan.push({ id, level: from + Math.floor(i * step) }));
  }
  return (plans[key] = plan);
}

export const unlockLevel = (species, id, branch) => unlockPlan(species, branch).find((m) => m.id === id)?.level ?? Infinity;

// ---- evolution ----
// The forms a species passes through, in order. A branching species (Eevee) goes through just the one it chose,
// once it has chosen.
const pathOf = (species, branch) => (CHOICES[species] ? (CHOICES[species].includes(branch) ? [branch] : []) : EVOLUTIONS[species] ?? []);

// Levels at which a species takes its next form: one for a single evolution, two for a line of three. A branching
// species has one, whether or not it has chosen yet.
export const evolveLevels = (species) => ({ 1: [12], 2: [8, 18] }[CHOICES[species] ? 1 : EVOLUTIONS[species]?.length] ?? []);

// The look a species wears at a level: itself, or the evolved form it has reached (if that form's sprites exist).
export function formAt(species, level, branch) {
  const stage = evolveLevels(species).filter((at) => level >= at).length;
  const form = stage ? pathOf(species, branch)[stage - 1] : species;
  return SPECIES[form] ? form : species;
}

// Is this a branching species that has reached its evolution level without choosing a form yet?
export const needsChoice = (species, level, branch) => !!CHOICES[species] && !CHOICES[species].includes(branch) && level >= evolveLevels(species)[0];

// Every look a species can have, base first.
export const formsOf = (species, branch) => [species, ...pathOf(species, branch).filter((id) => SPECIES[id])];

// ---- what a fight is worth ----
// won: your side won.  dealt: the share of the other side's health your side took off (0..1).
// kept: the share of your own health you still had (0..1).  seconds: how long the fight ran.
// A win is worth roughly twice a loss; hitting hard, staying healthy and a long fight each add a little.
// Walking out earns only a part of the effort.
export function battleExp({ won, gaveUp, dealt, kept, seconds }) {
  const effort = 40 * dealt + 15 * kept + Math.min(seconds, 90) / 6;
  return Math.round(gaveUp ? effort * 0.4 : (won ? 60 : 25) + effort);
}
