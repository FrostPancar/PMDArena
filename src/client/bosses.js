import { SPECIES } from '../sprites.js';
import { MOVES } from '../moves.js';
import { MAPS } from '../maps.js';
import { session, loadoutOf, formOf } from './session.js';
import { ME, ARENAS } from './modes.js';

// Boss Rush: one legendary after another. Each is a big mon with a lot of health that plays at a high skill, always
// with the same four moves, on the stage that suits it. A fight is a single round; beating one sends you on to the next.
export const BOSS = { hp: 500, skill: 4, scale: 1.15, exp: 0.7 };
export const BOSSES = [
  { id: 'moltres', map: 'blaze', moves: ['flamethrower', 'fireSpin', 'airSlash', 'overheat'] },
  { id: 'zapdos', map: 'plant', moves: ['thunderbolt', 'thunder', 'discharge', 'airSlash'] },
  { id: 'articuno', map: 'cavern', moves: ['iceBeam', 'blizzard', 'powderSnow', 'hurricane'] },
  { id: 'lugia', map: 'deepsea', moves: ['psychic', 'hydroPump', 'airSlash', 'hurricane'] },
  { id: 'hooh', map: 'sacred', moves: ['fireBlast', 'flameBurst', 'airSlash', 'solarBeam'] },
  { id: 'mewtwo', map: 'relic', moves: ['psychoCut', 'shadowBall', 'auraSphere', 'psybeam'] },
  { id: 'groudon', map: 'scorched', moves: ['earthquake', 'eruption', 'rockSlide', 'solarBeam'] },
  { id: 'kyogre', map: 'bountiful', moves: ['hydroPump', 'waterSpout', 'iceBeam', 'thunder'] },
  { id: 'rayquaza', map: 'stratos', moves: ['dragonPulse', 'outrage', 'dracoMeteor', 'airSlash'] },
].filter((b) => SPECIES[b.id] && b.moves.every((id) => MOVES[id]));

const me = () => ({ slot: 0, owner: ME, team: 0, kind: 'human', species: session.species, moves: loadoutOf(), form: formOf(), name: session.profile.name });
const seed = () => (Math.random() * 0x7fffffff) | 0;
const shuffled = (list) => list.map((v) => [v, Math.random()]).sort((a, b) => a[1] - b[1]).map(([v]) => v);

// The fight with the `at`-th boss of a run (order: the ids still to come, in the order they will be met).
export function bossBattle(order = shuffled(BOSSES.map((b) => b.id)), at = 0) {
  const boss = BOSSES.find((b) => b.id === order[at]);
  return {
    mode: '1v1', seed: seed(), map: MAPS[boss.map] ? boss.map : ARENAS[0], rounds: 1, label: 'Boss Rush', expScale: BOSS.exp,
    boss: { id: boss.id, order, at },
    fighters: [me(), { slot: 1, owner: ME, team: 1, kind: 'cpu', species: boss.id, moves: boss.moves, skill: BOSS.skill, hp: BOSS.hp, scale: BOSS.scale }],
  };
}
// The next fight of a run, or null when the last boss has fallen.
export const nextBoss = (battle) => (battle.boss.at + 1 < battle.boss.order.length ? bossBattle(battle.boss.order, battle.boss.at + 1) : null);

// Survivor: you alone on a stage picked at random; the waves are made by the scene as it goes (scenes/Survivor.js).
export const survivorBattle = () => ({ mode: 'survivor', seed: seed(), map: ARENAS[Math.floor(Math.random() * ARENAS.length)], rounds: 1, label: 'Survivor', survivor: true, fighters: [me()] });
