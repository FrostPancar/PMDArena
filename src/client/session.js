import { SPECIES, SPECIES_ORDER } from '../sprites.js';
import { MOVES } from '../moves.js';
import { CHOICES } from '../evolutions.js';
import { levelFor, unlockPlan, tmsFor, formAt, formsOf, needsChoice, battleExp } from './progress.js';

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
  noteKey: null, // who you are to the pool: marks the note you left, without telling anyone which it is
  news: [], // move ids that have just opened (by level, or as a TM found) and have not been taken to battle yet
  tms: [], // move ids of the TMs found so far: any mon that can be taught one may use it
  ladder: { open: [], shown: [] }, // the CPU ladder (ladder.js): stages opened, and those whose opening the map has shown
  crew: [], // species ids last taken to a crew battle, in the order they were sent out
  mons: {}, // species id -> { exp, battles, wins }: how far each mon has come
  profile: { name: 'Player', face: null, flag: 0 }, // face: a species or form id; null shows whoever is being played
  records: { battles: 0, wins: 0, losses: 0, streak: 0, bestStreak: 0, kos: 0, seconds: 0, modes: {} }, // modes: '1v1 vs CPU' -> { battles, wins }
};

// Is there a game saved on this device? (set by loadSession)
export let hasSave = false;
const FRESH = JSON.stringify(session);

export function loadSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (saved && typeof saved === 'object') {
      hasSave = true;
      // a save from before TMs were found: it keeps the taught moves its mons were already taking to battle
      if (!Array.isArray(saved.tms)) session.tms = [...new Set(Object.entries(saved.loadouts ?? {}).flatMap(([id, moves]) => (SPECIES[id] && Array.isArray(moves) ? moves.filter((m) => tmsFor(id, saved.mons?.[id]?.branch).includes(m)) : [])))];
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
  session.tms = (Array.isArray(session.tms) ? session.tms : []).filter((id) => MOVES[id]);
  session.news = (Array.isArray(session.news) ? session.news : []).filter((id) => MOVES[id]);
  session.crew = (Array.isArray(session.crew) ? session.crew : []).filter((id) => SPECIES[id] && !SPECIES[id].form);
  // crew battles were filed as '3v3 vs CPU' before they were called 'Crew vs CPU'
  for (const [k, v] of Object.entries(session.records.modes ?? {})) {
    if (!k.startsWith('3v3 ')) continue;
    const to = (session.records.modes[`Crew ${k.slice(4)}`] ??= { battles: 0, wins: 0 });
    to.battles += v.battles; to.wins += v.wins;
    delete session.records.modes[k];
  }
  if (!SPECIES[session.partner]) session.partner = null;
  if (!SPECIES[session.profile.face]) session.profile.face = null;
}

export function saveSession() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(session)); hasSave = true; } catch { /* play on without saving */ }
}

// Ask the browser to keep this site's storage for good, so it does not clear the save when the device runs short of
// room (it may say no; the save still works, it is only less safe).
export function keepSave() {
  try { navigator.storage?.persist?.().catch(() => {}); } catch { /* not offered here */ }
}

// Start over: the save so far is set aside under its own key (not thrown away) and the game is as on a first visit.
export function newGame() {
  try {
    const old = localStorage.getItem(SAVE_KEY);
    if (old) localStorage.setItem(`${SAVE_KEY}-backup`, old);
    localStorage.removeItem(SAVE_KEY);
  } catch { /* nothing was being kept */ }
  const fresh = JSON.parse(FRESH);
  for (const k of Object.keys(session)) delete session[k];
  Object.assign(session, fresh);
  hasSave = false;
}

// ---- how far a mon has come ----
// The auto-move controls (set in Settings): the mon walks itself, the moves are on Q W E R, left click parries and
// right click runs. Not for the touch pad, which has its own.
export const autoControls = () => !!session.briefed.autoMove;
export function setAutoControls(on) { session.briefed.autoMove = on; saveSession(); }

export const progressOf = (id = session.species) => levelFor(session.mons[id]?.exp ?? 0);
export const levelOf = (id = session.species) => progressOf(id).level;
// The evolution a branching mon (Eevee) has chosen, or undefined while it has not, or if it does not branch.
export const branchOf = (id = session.species) => (CHOICES[id]?.includes(session.mons[id]?.branch) ? session.mons[id].branch : undefined);
// Is this mon ready to evolve but still waiting on its player to choose which way?
export const awaitsChoice = (id = session.species) => needsChoice(id, levelOf(id), branchOf(id));
// Settle a branching mon's evolution for good. Does nothing if it has already chosen, or `form` is not one of its.
export function chooseBranch(id, form) {
  if (!CHOICES[id]?.includes(form) || branchOf(id)) return false;
  (session.mons[id] ??= { exp: 0, battles: 0, wins: 0 }).branch = form;
  saveSession();
  return true;
}
// The look it has grown into.
export const formOf = (id = session.species) => formAt(id, levelOf(id), branchOf(id));
// The moves it may use so far, in menu order: those of its own that its level has opened, then the TMs it can be
// taught that have been found.
export const unlockedMoves = (id = session.species) => [
  // (a move of its own that is also a TM is open early to whoever has found that TM)
  ...unlockPlan(id, branchOf(id)).filter((m) => m.level <= levelOf(id) || ownsTM(m.id)).map((m) => m.id),
  ...tmsFor(id, branchOf(id)).filter(ownsTM),
];
export const ownsTM = (id) => session.tms.includes(id);
// Every TM there is: each move some mon (or one of Eevee's evolutions) has to be taught.
export const allTMs = () => [...new Set(SPECIES_ORDER.flatMap((id) => [undefined, ...(CHOICES[id] ?? [])].flatMap((branch) => tmsFor(id, branch))))];
// A fight is over: a TM not yet owned turns up, more often than not one that the mon that fought can use.
function findTM(species) {
  const left = allTMs().filter((id) => !ownsTM(id));
  if (!left.length) return null;
  const mine = left.filter((id) => tmsFor(species, branchOf(species)).includes(id));
  const pool = mine.length && Math.random() < 0.6 ? mine : left;
  const tm = pool[Math.floor(Math.random() * pool.length)];
  session.tms.push(tm);
  return tm;
}

// A TM out of a chest (Survivor): one the player does not have yet, or null when they have them all.
export function chestTM(species = session.species) {
  const tm = findTM(species);
  if (tm) { session.news = [...new Set([...session.news, tm])]; saveSession(); }
  return tm;
}

// The moves a species takes to battle. Until the player picks, the first four it has.
export function loadoutOf(id = session.species) {
  const open = unlockedMoves(id);
  const saved = session.loadouts[id];
  if (!saved) return open.slice(0, LOADOUT_SIZE);
  return saved.filter((m, i) => MOVES[m] && open.includes(m) && saved.indexOf(m) === i).slice(0, LOADOUT_SIZE);
}

export function setLoadout(id, moves) {
  session.loadouts[id] = moves.slice(0, LOADOUT_SIZE);
  session.news = session.news.filter((m) => !moves.includes(m)); // taken: no longer news
  saveSession();
}

// ---- the profile others see ----
// The portrait on the profile: the chosen one if it is still allowed, else whoever is being played, as they look now.
export const faceOf = () => (facesOpen().includes(session.profile.face) ? session.profile.face : formOf());
// Portraits to choose from: every species, plus the evolved forms the player's mons have reached.
export const facesOpen = () => SPECIES_ORDER.flatMap((id) => formsOf(id, branchOf(id)).slice(0, formsOf(id, branchOf(id)).indexOf(formOf(id)) + 1));

// What this client tells the relay about its player.
export const publicProfile = () => ({
  species: session.species, moves: loadoutOf(), form: formOf(), level: levelOf(),
  name: session.profile.name, flag: session.profile.flag, face: faceOf(),
});

// ---- after a fight ----
// Books a finished battle: EXP for the mon that fought (`species`: the one that led a crew), and the records. `mode` is the label the records file it under
// ('1v1 vs CPU'...). Returns what changed, for the result screen:
//   { exp, from, to, tm: the move id of the TM found (none for a fight walked out of, or when all are owned),
//     unlocked: [move ids], evolved: form id or null, ready: true if a branching mon now awaits its choice }
//   (from / to are levelFor() results)
// scale: the share of the usual EXP this kind of fight is worth. exp: the EXP itself, where the mode works it out
// (Survivor). noTm: no TM is found at the end (Survivor gives its TMs in chests along the way).
export function bookBattle({ mode, won, gaveUp, dealt, kept, seconds, kos, species, scale = 1, exp: fixed, noTm = false }) {
  const id = species ?? session.species, mon = (session.mons[id] ??= { exp: 0, battles: 0, wins: 0 });
  const from = levelFor(mon.exp), branch = branchOf(id), look = formAt(id, from.level, branch);
  const exp = fixed ?? Math.round(battleExp({ won, gaveUp, dealt, kept, seconds }) * scale);
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
  const tm = gaveUp || noTm ? null : findTM(id);
  const unlocked = unlockPlan(id, branch).filter((u) => u.level > from.level && u.level <= to.level).map((u) => u.id);
  session.news = [...new Set([...session.news, ...unlocked, ...(tm ? [tm] : [])])];
  saveSession();
  return {
    exp, from, to, tm, unlocked,
    evolved: formAt(id, to.level, branch) !== look ? formAt(id, to.level, branch) : null,
    ready: !needsChoice(id, from.level, branch) && needsChoice(id, to.level, branch),
  };
}
