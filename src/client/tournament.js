import { SPECIES_ORDER } from '../sprites.js';
import { CHOICES } from '../evolutions.js';
import { session, saveSession, loadoutOf, branchOf, ownsTM } from './session.js';
import { ME, ARENAS } from './modes.js';
import { cpuAt } from './ladder.js';
import { formsOf, tmsFor } from './progress.js';

// Tournament: a bracket of sixteen, the player and fifteen CPUs, one knockout round after another until one is left.
// The player's own matches are ordinary 1v1 matches against CPUs that get harder each round; the rest of the bracket
// is settled by a coin toss. A loss ends the run. Every entrant (the player too) wears a look picked at random from its
// species' forms, whatever its level. Each match is worth a share of a usual fight's EXP, and only the champion finds a
// TM: one its mon can be taught and the player does not have yet.
// Between matches the bracket screen (scenes/Bracket.js) shows how it stands.
//
// A tournament is plain data, carried from the bracket into each battle (cfg.tourney) and back:
//   { entrants: [{ species, form, me? }] (16, in bracket order), alive: [[entrant indexes]...] }
// alive[r] is who is still in at the start of round r, in bracket order: pairs (0, 1), (2, 3)... meet, and alive[r + 1]
// holds their winners. alive[4] is the champion.
export const SIZE = 16;
export const ROUNDS = ['Round of 16', 'Quarterfinal', 'Semifinal', 'Final'];
export const LEVELS = [2, 3, 4, 5]; // the CPU's level in the player's match of each round
export const TOURNEY_EXP = 0.7; // a match's share of a usual 1v1's EXP

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const shuffled = (list) => list.map((v) => [v, Math.random()]).sort((a, b) => a[1] - b[1]).map(([v]) => v);

// Any one of a species' looks, base form included (a branching species may wear any of its branches).
export function skinOf(species) {
  const branch = CHOICES[species] ? pick(CHOICES[species]) : undefined;
  return pick(formsOf(species, branch));
}

export function newTourney() {
  const rivals = shuffled(SPECIES_ORDER.filter((id) => id !== session.species)).slice(0, SIZE - 1);
  const entrants = [{ species: session.species, me: true }, ...rivals.map((species) => ({ species }))].map((e) => ({ ...e, form: skinOf(e.species) }));
  return { entrants: shuffled(entrants), alive: [[...Array(SIZE).keys()]] };
}

export const round = (t) => t.alive.length - 1; // the round being played (4: it is over)
export const meIndex = (t) => t.entrants.findIndex((e) => e.me);
export const stillIn = (t) => t.alive[round(t)].includes(meIndex(t));
// The player's opponent in the round being played.
export function rivalOf(t) {
  const now = t.alive[round(t)], at = now.indexOf(meIndex(t));
  return at < 0 ? -1 : now[at ^ 1];
}

// The player's match of the round being played.
export function tourneyBattle(t) {
  const r = round(t), me = t.entrants[meIndex(t)], foe = t.entrants[rivalOf(t)], level = LEVELS[r];
  return {
    mode: '1v1', seed: (Math.random() * 0x7fffffff) | 0, map: pick(ARENAS), label: 'Tournament', sub: `${ROUNDS[r]}  Lv ${level}`,
    level, expScale: TOURNEY_EXP, tourney: t,
    fighters: [
      { slot: 0, owner: ME, team: 0, kind: 'human', species: me.species, moves: loadoutOf(), form: me.form, name: session.profile.name },
      { slot: 1, owner: ME, team: 1, kind: 'cpu', ...cpuAt(foe.species, level), form: foe.form, skill: level },
    ],
  };
}

// The round is over: the player's match went as `won` says, every other one by a coin toss. A new tournament object.
export function settle(t, won) {
  const now = t.alive[round(t)], me = meIndex(t), next = [];
  for (let i = 0; i < now.length; i += 2) {
    const [a, b] = [now[i], now[i + 1]];
    next.push(a === me ? (won ? a : b) : b === me ? (won ? b : a) : Math.random() < 0.5 ? a : b);
  }
  return { ...t, alive: [...t.alive, next] };
}

// The champion's prize: a TM the player's mon can be taught and the player does not have yet (null if none is left).
export function prizeTM(species = session.species) {
  const left = tmsFor(species, branchOf(species)).filter((id) => !ownsTM(id));
  if (!left.length) return null;
  const tm = pick(left);
  session.tms.push(tm);
  session.news = [...new Set([...session.news, tm])];
  saveSession();
  return tm;
}
