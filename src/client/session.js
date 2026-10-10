import { SPECIES, SPECIES_ORDER } from '../sprites.js';
import { MOVES, movesOf } from '../moves.js';

// What the player has chosen, kept between visits. Loadouts are remembered per species.
const SAVE_KEY = 'pmd-client-v1';
export const LOADOUT_SIZE = 4;

export const session = {
  species: SPECIES_ORDER[0],
  loadouts: {}, // species id -> move ids, in slot order
  briefed: {}, // one-time prompts already shown: species id for the move menu, 'controls' for the battle card
  lastMap: null,
};

export function loadSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (saved && typeof saved === 'object') Object.assign(session, saved);
  } catch { /* no storage, or an old save: start fresh */ }
  if (!SPECIES[session.species]) session.species = SPECIES_ORDER[0];
  session.loadouts ??= {};
  session.briefed ??= {};
}

export function saveSession() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(session)); } catch { /* play on without saving */ }
}

// The moves a species takes to battle. Until the player picks, the first four it can learn.
export function loadoutOf(id = session.species) {
  const learnable = movesOf(id);
  const saved = session.loadouts[id];
  if (!saved) return learnable.slice(0, LOADOUT_SIZE);
  return saved.filter((m, i) => MOVES[m] && learnable.includes(m) && saved.indexOf(m) === i).slice(0, LOADOUT_SIZE);
}

export function setLoadout(id, moves) {
  session.loadouts[id] = moves.slice(0, LOADOUT_SIZE);
  saveSession();
}
