import { SPECIES, SPECIES_ORDER } from '../sprites.js';
import { MOVES } from '../moves.js';
import { levelFor, unlockPlan, formAt, formsOf, battleExp } from './progress.js';

// What the player has chosen and earned, kept between visits.
const SAVE_KEY = 'pmd-client-v1';
export const LOADOUT_SIZE = 4;
export const NAME_LENGTH = 10;

export const session = {
  species: SPECIES_ORDER[0],
  loadouts: {}, // species id -> move ids, in slot order
  partner: null, // species id of the CPU partner waiting on the other bed, if one was asked along
  briefed: {}, // one-time prompts already shown: species id for the move menu, 'controls' for the battle card
  lastMap: null,
  mons: {}, // species id -> { exp, battles, wins }: how far each mon has come
  profile: { name: 'Player', face: null, flag: 0 }, // face: a species or form id; null shows whoever is being played
  records: { battles: 0, wins: 0, losses: 0, streak: 0, bestStreak: 0, kos: 0, seconds: 0, modes: {} }, // modes: '1v1 vs CPU' -> { battles, wins }
};

export function loadSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (saved && typeof saved === 'object') {
      const { profile, records, ...rest } = saved;
      Object.assign(session, rest);
      Object.assign(session.profile, profile);
      Object.assign(session.records, records);
    }
  } catch { /* no storage, or an old save: start fresh */ }
  if (!SPECIES[session.species] || SPECIES[session.species].form) session.species = SPECIES_ORDER[0];
  session.loadouts ??= {};
  session.briefed ??= {};
  session.mons ??= {};
  if (!SPECIES[session.partner]) session.partner = null;
  if (!SPECIES[session.profile.face]) session.profile.face = null;
}

export function saveSession() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(session)); } catch { /* play on without saving */ }
}

// ---- how far a mon has come ----
export const progressOf = (id = session.species) => levelFor(session.mons[id]?.exp ?? 0);
export const levelOf = (id = session.species) => progressOf(id).level;
// The look it has grown into.
export const formOf = (id = session.species) => formAt(id, levelOf(id));
// The moves it may use so far, in menu order.
export const unlockedMoves = (id = session.species) => unlockPlan(id).filter((m) => m.level <= levelOf(id)).map((m) => m.id);

// The moves a species takes to battle. Until the player picks, the first four it has.
export function loadoutOf(id = session.species) {
  const open = unlockedMoves(id);
  const saved = session.loadouts[id];
  if (!saved) return open.slice(0, LOADOUT_SIZE);
  return saved.filter((m, i) => MOVES[m] && open.includes(m) && saved.indexOf(m) === i).slice(0, LOADOUT_SIZE);
}

export function setLoadout(id, moves) {
  session.loadouts[id] = moves.slice(0, LOADOUT_SIZE);
  saveSession();
}

// ---- the profile others see ----
// The portrait on the profile: the chosen one if it is still allowed, else whoever is being played, as they look now.
export const faceOf = () => (facesOpen().includes(session.profile.face) ? session.profile.face : formOf());
// Portraits to choose from: every species, plus the evolved forms the player's mons have reached.
export const facesOpen = () => SPECIES_ORDER.flatMap((id) => formsOf(id).slice(0, formsOf(id).indexOf(formOf(id)) + 1));

// What this client tells the relay about its player.
export const publicProfile = () => ({
  species: session.species, moves: loadoutOf(), form: formOf(), level: levelOf(),
  name: session.profile.name, flag: session.profile.flag, face: faceOf(),
});

// ---- after a fight ----
// Books a finished battle: EXP for the mon that fought, and the records. `mode` is the label the records file it under
// ('1v1 vs CPU'...). Returns what changed, for the result screen:
//   { exp, from, to, unlocked: [move ids], evolved: form id or null }   (from / to are levelFor() results)
export function bookBattle({ mode, won, gaveUp, dealt, kept, seconds, kos }) {
  const id = session.species, mon = (session.mons[id] ??= { exp: 0, battles: 0, wins: 0 });
  const from = levelFor(mon.exp), look = formAt(id, from.level);
  const exp = battleExp({ won, gaveUp, dealt, kept, seconds });
  mon.exp += exp;
  mon.battles++;
  if (won) mon.wins++;
  const to = levelFor(mon.exp);

  const r = session.records, m = (r.modes[mode] ??= { battles: 0, wins: 0 });
  r.battles++;
  m.battles++;
  if (won) { r.wins++; m.wins++; r.streak++; r.bestStreak = Math.max(r.bestStreak, r.streak); } else { r.losses++; r.streak = 0; }
  r.kos += kos;
  r.seconds += Math.round(seconds);
  saveSession();
  return {
    exp, from, to,
    unlocked: unlockPlan(id).filter((u) => u.level > from.level && u.level <= to.level).map((u) => u.id),
    evolved: formAt(id, to.level) !== look ? formAt(id, to.level) : null,
  };
}
