import { MAPS, MAP_ORDER } from '../maps.js';
import { SPECIES, SPECIES_ORDER } from '../sprites.js';
import { MOVES, movesOf } from '../moves.js';
import { session, loadoutOf, levelOf, formOf, LOADOUT_SIZE } from './session.js';
import { formAt, evolveLevels } from './progress.js';
import { CHOICES } from '../evolutions.js';
import { net } from './net.js';

// What a fight is, for every way of starting one. A battle is plain data:
//   { mode: '1v1' | '2v2', seed, map?, fighters: [{ slot, team: 0 | 1, kind: 'human' | 'cpu', owner, species, moves, form, name }] }
// (form is the evolved look the fighter wears, if any; name is a player's profile name)
// Fights against other players are put together by the relay (server/relay.js) and sent to everyone in them;
// fights against the computer alone are put together here and never leave this client. Either way the stage draw
// (scenes/StageDraw.js) comes next: the players move about the world map and the stage is drawn from the ones they
// picked, which it writes to `map`. The Battle scene reads the same thing everywhere, and everything else about the
// fight (where everyone starts) follows from the seed.

// Owner of every fighter in a battle made here.
export const ME = 'me';
// Does this client run the fighter (as opposed to hearing about it over the relay)?
export const mine = (f) => f.owner === ME || (net.id !== null && f.owner === net.id);

// The stages a battle can be fought on, in a fixed order, so the same seed means the same stage on every client.
// Left out: the developers' test realm, and the stages too small or too narrow to fight on (a lone island, a
// walkway, two small plateaus).
const NOT_ARENAS = ['test', 'enclosed', 'island', 'northern', 'dragon'];
export const ARENAS = MAP_ORDER.filter((id) => !NOT_ARENAS.includes(id)).sort();
// The stage the draw settled on; a battle that skipped the draw falls back on its seed.
// (a practice arena may be any stage at all)
export const arenaOf = (battle) => (battle.practice && MAPS[battle.map] ? battle.map : ARENAS.includes(battle.map) ? battle.map : ARENAS[battle.seed % ARENAS.length]);
export const arenaName = (battle) => MAPS[arenaOf(battle)].name;

// The sprites a fighter wears: its evolved form if the battle names one that really is a form of its species.
export const lookOf = (f) => (SPECIES[f.form]?.base === f.species ? f.form : f.species);

const shuffled = (list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// A CPU fighter: a random species (none of `avoid`) with four of its moves, three of them attacks where it has them.
// It wears the form a mon of the player's own level would (a branching mon at that level has taken a random one).
export function randomCpu(avoid = []) {
  const species = shuffled(SPECIES_ORDER.filter((id) => !avoid.includes(id)))[0];
  const branch = CHOICES[species] && levelOf() >= evolveLevels(species)[0] ? shuffled(CHOICES[species])[0] : undefined;
  const all = shuffled(movesOf(species, branch).filter((id) => MOVES[id]));
  const attacks = all.filter((id) => MOVES[id].cls === 'attack').slice(0, LOADOUT_SIZE - 1);
  const moves = [...attacks, ...all.filter((id) => !attacks.includes(id))].slice(0, LOADOUT_SIZE);
  return { species, moves, form: formAt(species, levelOf(), branch) };
}

// The CPU partner from the other bed, with the moves and the look the player has earned for that species.
export const partnerSpec = () => (session.partner ? { species: session.partner, moves: loadoutOf(session.partner), form: formOf(session.partner) } : null);

// A fight against the computer only: you (and your CPU partner in a 2v2) against one or two random CPUs.
export function cpuBattle(mode) {
  const us = [{ kind: 'human', species: session.species, moves: loadoutOf(), form: formOf(), name: session.profile.name }];
  if (mode === '2v2') us.push({ kind: 'cpu', ...partnerSpec() });
  const them = [];
  while (them.length < us.length) them.push({ kind: 'cpu', ...randomCpu([...us, ...them].map((f) => f.species)) });
  const battle = {
    mode, seed: 0,
    fighters: [...us.map((f) => ({ ...f, team: 0 })), ...them.map((f) => ({ ...f, team: 1 }))].map((f, slot) => ({ slot, owner: ME, ...f })),
  };
  battle.seed = (Math.random() * 0x7fffffff) | 0;
  return battle;
}

// Small seeded generator (mulberry32): the same numbers on every client for the same seed.
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Where each fighter starts: [x, y] per slot, the same on every client. Team 0 gathers around the stage's own spawn
// point, team 1 around a spot a fair run away, team-mates a few steps apart.
export function startingSpots(battle, map, walkable) {
  const rand = seeded(battle.seed);
  const xs = map.walk.flat().map((p) => p[0]), ys = map.walk.flat().map((p) => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0, h = Math.max(...ys) - y0;
  const roomy = (x, y) => walkable(x, y) && walkable(x - 10, y) && walkable(x + 10, y) && walkable(x, y + 6) && walkable(x, y - 6);
  const home = map.spawn;
  // some stages are islands: only ground that can be walked to from the spawn point counts
  const G = 4, cols = Math.ceil(w / G) + 1, cell = (x, y) => Math.round((y - y0) / G) * cols + Math.round((x - x0) / G);
  const reach = new Set([cell(...home)]), todo = [home];
  while (todo.length) {
    const [cx, cy] = todo.pop();
    for (const [dx, dy] of [[G, 0], [-G, 0], [0, G], [0, -G]]) {
      const x = cx + dx, y = cy + dy, k = cell(x, y);
      if (reach.has(k) || !walkable(x, y)) continue;
      reach.add(k);
      todo.push([x, y]);
    }
  }
  const spots = [];
  for (let i = 0; i < 900; i++) {
    const x = Math.round(home[0] + (Math.floor((x0 + rand() * w - home[0]) / G)) * G), y = Math.round(home[1] + (Math.floor((y0 + rand() * h - home[1]) / G)) * G);
    if (reach.has(cell(x, y)) && roomy(x, y)) spots.push([x, y]);
  }
  const far = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const away = spots.find((s) => far(s, home) >= 110 && far(s, home) <= 170)
    ?? spots.reduce((best, s) => (far(s, home) > far(best, home) ? s : best), home);
  const taken = [];
  return battle.fighters.map((f) => {
    const base = f.team === 0 ? home : away;
    const spot = taken.some((t) => far(t, base) < 14)
      ? spots.find((s) => far(s, base) >= 18 && far(s, base) <= 40 && taken.every((t) => far(t, s) >= 16)) ?? base
      : base;
    taken.push(spot);
    return spot;
  });
}
