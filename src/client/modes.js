import { MAPS, MAP_ORDER } from '../maps.js';
import { session, saveSession, loadoutOf } from './session.js';

// The ways to fight offered at the pillar. `open: false` modes are listed but cannot be started yet.
// A mode's `foes` says who the player meets: each entry becomes a fighter with a controller (see controllers.js).
export const MODES = {
  cpu: {
    id: 'cpu', name: 'CPU Battle', open: true,
    blurb: 'Fight a computer rival.',
    // TODO(cpu mode): return [{ species, moves, control: 'cpu' }] once CpuController can fight
    foes: () => [],
  },
  online: {
    id: 'online', name: 'Online Versus', open: false,
    blurb: 'Fight another player.',
    closed: 'The link to other players is not open yet.',
    // TODO(online mode): the other player's { species, moves, control: 'remote' } comes from NetSession.match
    foes: () => [],
  },
};
export const MODE_ORDER = ['cpu', 'online'];

// Arenas are every stage except the developers' test realm; the same one never comes up twice in a row.
export function randomArena() {
  const pool = MAP_ORDER.filter((id) => id !== 'test' && id !== session.lastMap);
  const id = pool[Math.floor(Math.random() * pool.length)];
  session.lastMap = id;
  saveSession();
  return id;
}

// Everything a Battle scene needs to start. Online play will send this same object to both sides (with `seed` shared),
// so nothing in it may depend on which client built it.
export function makeBattle(modeId) {
  const mode = MODES[modeId];
  return {
    mode: mode.id,
    map: randomArena(),
    seed: (Math.random() * 0x7fffffff) | 0,
    fighters: [
      { slot: 0, team: 'p', control: 'local', species: session.species, moves: loadoutOf() },
      ...mode.foes().map((f, i) => ({ slot: i + 1, team: 'n', ...f })),
    ],
  };
}

export const arenaName = (id) => MAPS[id].name;
