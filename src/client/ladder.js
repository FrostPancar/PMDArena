import { MOVES } from '../moves.js';
import { CHOICES } from '../evolutions.js';
import { session, saveSession, LOADOUT_SIZE } from './session.js';
import { ARENAS } from './modes.js';
import { unlockPlan, formAt, evolveLevels } from './progress.js';

// The CPU ladder: every stage has a difficulty from 1 to 5, which sets both what the computer sends out there and how
// well it plays. Fights against the computer alone can only be taken to stages that are open: the first two are from
// the start, and winning on a stage opens the next one still shut that is at most two rungs above it (so the road up
// is through the hardest stages you have). Fights with other players in them can go anywhere.
export const LADDER = [
  'beach', 'pond', 'safari', 'mushroom', // 1
  'mistrise', 'secretive', 'jungle', 'bountiful', // 2
  'sacred', 'swamp', 'serene', 'desert', // 3
  'cavern', 'plant', 'scorched', 'deepsea', // 4
  'stratos', 'steel', 'blaze', 'relic', // 5
].filter((id) => ARENAS.includes(id));
// a stage added later and not placed above joins the top
for (const id of ARENAS) if (!LADDER.includes(id)) LADDER.push(id);
const PER_LEVEL = 4, STARTERS = 2;
export const MAX_LEVEL = 5;
export const levelOfStage = (id) => Math.min(MAX_LEVEL, 1 + Math.floor(Math.max(0, LADDER.indexOf(id)) / PER_LEVEL));

// What the save remembers: the stages that are open, and those whose opening has been shown on the map.
const book = () => {
  const l = (session.ladder ??= {});
  l.open = [...new Set([...LADDER.slice(0, STARTERS), ...(Array.isArray(l.open) ? l.open : [])])].filter((id) => LADDER.includes(id));
  l.shown = [...new Set([...LADDER.slice(0, STARTERS), ...(Array.isArray(l.shown) ? l.shown : [])])].filter((id) => l.open.includes(id));
  return l;
};
export const isOpen = (id) => book().open.includes(id);
export const openStages = () => LADDER.filter(isOpen);
// Open, but the map has not shown it opening yet.
export const freshStages = () => openStages().filter((id) => !book().shown.includes(id));
export function markShown(ids) {
  book().shown.push(...ids);
  saveSession();
}

// A win on `id` against the computer. Returns the stage it opened, or null.
export function wonOn(id) {
  const at = LADDER.indexOf(id);
  const next = at < 0 ? null : LADDER.slice(0, at + STARTERS + 1).find((s) => !isOpen(s)) ?? null;
  if (next) { book().open.push(next); saveSession(); }
  return next;
}

// ---- what the computer brings to a level ----
// How far along a CPU's mon is at each level: that decides the form it wears and which of its moves it has.
const MON_LEVEL = [1, 1, 6, 12, 18, 26];
// How it plays. cool: its wait between attacks, times this. dodge: chance it jumps clear of a move it sees charging.
// parry: chance it parries a shot or a swing coming at it. speed: how briskly it moves. aim: how far off (in px, at
// most) its aim may be. run: it runs to close a long gap.
export const SKILL = {
  1: { cool: 1.6, dodge: 0.14, parry: 0.05, speed: 0.74, aim: 20, run: false },
  2: { cool: 1.28, dodge: 0.28, parry: 0.14, speed: 0.8, aim: 12, run: false },
  3: { cool: 1, dodge: 0.4, parry: 0.22, speed: 0.85, aim: 8, run: false },
  4: { cool: 0.75, dodge: 0.55, parry: 0.4, speed: 0.94, aim: 3, run: true },
  5: { cool: 0.55, dodge: 0.7, parry: 0.6, speed: 1, aim: 0, run: true },
};
export const skillOf = (level) => SKILL[Math.min(MAX_LEVEL, Math.max(1, Math.round(level ?? 3)))];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// A species as the computer fields it at a level: { species, moves, form }. Low levels have only the early moves and
// take them as they come; high levels have everything and lean on the hardest hitters.
export function cpuAt(species, level) {
  const lv = MON_LEVEL[level] ?? 12;
  const branch = CHOICES[species] && lv >= evolveLevels(species)[0] ? pick(CHOICES[species]) : undefined;
  const known = unlockPlan(species, branch).filter((m) => m.level <= lv && MOVES[m.id]).map((m) => m.id);
  const attacks = known.filter((id) => MOVES[id].cls === 'attack'), rest = known.filter((id) => MOVES[id].cls !== 'attack');
  const order = (list) => list.map((id) => [id, (MOVES[id].dmg ?? 0) * (level - 3) * 0.5 + Math.random() * 14]).sort((a, b) => b[1] - a[1]).map(([id]) => id);
  const moves = [...order(attacks).slice(0, LOADOUT_SIZE - 1), ...order(rest)];
  for (const id of order(attacks)) if (!moves.includes(id)) moves.push(id);
  return { species, moves: moves.slice(0, LOADOUT_SIZE), form: formAt(species, lv, branch) };
}

// A fight against the computer, set to a level: the other side's mons are re-armed for it and play at its skill.
// (A CPU on your own side stays as it is.)
export function atLevel(battle, level) {
  const us = battle.fighters.find((f) => f.kind === 'human')?.team;
  return {
    ...battle, level,
    fighters: battle.fighters.map((f) => {
      if (f.kind !== 'cpu' || f.team === us) return f;
      const crew = f.crew?.map((c) => cpuAt(c.species, level));
      return { ...f, ...(crew ? crew[0] : cpuAt(f.species, level)), ...(crew ? { crew } : {}), skill: level };
    }),
  };
}

// Is this a fight the ladder applies to: nobody in it but this player and the computer?
export const onLadder = (battle) => !battle.practice && battle.fighters.every((f) => f.owner === 'me');
