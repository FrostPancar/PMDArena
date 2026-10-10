import { MOVES, STATUS, KIND_LABEL } from '../moves.js';

// What the move menu and the battle HUD say about a move: its elemental type and a plain-words read of its data.
const TYPE_MOVES = {
  grass: 'razorLeaf leafStorm leafBlade magicalLeaf powerWhip grassKnot gigaDrain bulletSeed petalDance stunSpore energyBall vineWhip woodHammer leechSeed petalBlizzard aromatherapy seedBomb needleArm ingrain sleepPowder cottonGuard',
  fire: 'flameBurst fireSpin fireFang ember fireBlast flameWheel flamethrower willOWisp eruption overheat inferno incinerate lavaPlume blastBurn firePunch',
  water: 'bubble waterSpout waterPulse hydroBurst waterGun hydroPump whirlpool crabhammer bubbleBeam razorShell surf brine geyser waterfall rainDance aquaRing lifeDew',
  psychic: 'confusion psybeam psychic hypnosis futureSight extrasensory psychoCut psyshock kinesis rest agility barrier gravity',
  dark: 'bite nightSlash darkPulse nightDaze snarl taunt',
  ghost: 'shadowBall shadowClaw shadowSneak hex confuseRay nightShade',
  fairy: 'drainingKiss moonblast moonlight',
  fighting: 'drainPunch hammerArm wakeUpSlap focusBlast focusPunch auraSphere forcePalm rockSmash crossChop',
  electric: 'thunderFang thunderbolt discharge thunder chargeBeam shockWave thunderShock charge',
  bug: 'xScissor bugBite spiderWeb pinMissile megahorn furyCutter attackOrder defendOrder healOrder',
  dragon: 'dragonBreath dragonPulse outrage dualChop dragonClaw dragonRush dracoMeteor',
  flying: 'gust whirlwind wingAttack airSlash aerialAce featherDance tailwind roost braveBird',
  ground: 'bonemerang earthquake mudBomb earthPower sandTomb',
  rock: 'rockSlide stoneEdge rockBlast rockTomb rockWrecker stealthRock rockThrow powerGem',
  poison: 'poisonSting sludgeBomb poisonJab acid crossPoison sludgeWave',
  steel: 'metalClaw flashCannon gyroBall meteorMash ironDefense',
  ice: 'icyWind iceFang iceShard blizzard avalanche iceBall iceBeam auroraBeam haze',
};
const TYPE_OF = {};
for (const [type, ids] of Object.entries(TYPE_MOVES)) for (const id of ids.split(' ')) TYPE_OF[id] = type;
// anything not listed (most support moves) is Normal
export const typeOf = (id) => TYPE_OF[id] ?? 'normal';
export const cap = (s) => s[0].toUpperCase() + s.slice(1);

const HOW = {
  melee: 'Strikes right in front of you.',
  mid: 'Lands on the spot you aim at.',
  projectile: 'Flies straight where you aim.',
  beam: 'Hits everything along a line.',
  aoe: 'Bursts all around you.',
  auto: 'Strikes the nearest foe by itself.',
  homing: 'Chases the nearest foe.',
  slight: 'Curves toward foes ahead of it.',
  dash: 'You rush through whatever is ahead.',
  hold: 'Hold the button to fly at the cursor.',
  self: 'Works on yourself.',
};
const STAT = { atk: 'Attack', spd: 'Speed', def: 'Defense', eva: 'Evasion' };
const pct = (n) => `${Math.round(n * 100)}%`;
const secs = (n) => `${+n.toFixed(1)}s`;
const reachOf = (mv) => mv.range ?? mv.length ?? mv.dash ?? (mv.kind === 'aoe' ? mv.grow?.max ?? mv.radius : mv.kind === 'melee' ? mv.reach + mv.radius : null);

// { type, role, how, stats: [[label, value]...], notes: [...] }
export function describe(id) {
  const mv = MOVES[id];
  const stats = [['Power', mv.dmg ? String(mv.dmg) : '-'], ['Stamina', String(mv.cost)], ['Charge', secs(mv.charge)]];
  const reach = reachOf(mv);
  if (reach) stats.push([mv.kind === 'aoe' ? 'Radius' : 'Range', String(Math.round(reach))]);

  const n = [];
  if (mv.random) n.push('Uses some other move at random.');
  if (mv.lob) n.push('Lobbed: it comes down where you aim.');
  if (mv.volley) n.push(`Fires ${mv.volley.length} shots in a row.`);
  if (mv.grow) n.push('Hold to widen the blast, release to fire.');
  if (mv.status) {
    const what = mv.status.kind === 'tri' ? 'burned, paralysed or frozen' : STATUS[mv.status.kind].label;
    n.push(mv.status.chance >= 1 ? `Leaves foes ${what}.` : `${pct(mv.status.chance)} chance to leave foes ${what}.`);
  }
  if (mv.drain) n.push(`Heals you for ${pct(mv.drain)} of the damage.`);
  if (mv.heal) n.push(`Restores ${mv.heal} HP${(mv.healDelay ?? 0) >= 2000 ? ` after ${secs(mv.healDelay / 1000)}` : ''}.`);
  if (mv.regen) n.push(`Heals ${mv.regen.hps} HP a second for ${secs(mv.regen.time)}.`);
  if (mv.ingrain) n.push(`Roots you and heals ${mv.ingrain.hps} HP a second for ${secs(mv.ingrain.time)}.`);
  if (mv.buff) n.push(mv.buff.stat === 'eva' ? `Dodge half of all hits for ${secs(mv.buff.time)}.` : `Raises your ${STAT[mv.buff.stat] ?? 'stats'} for ${secs(mv.buff.time)}.`);
  if (mv.bonus) n.push(`${pct(mv.bonus.chance)} chance to raise your ${STAT[mv.bonus.buff.stat]}.`);
  if (mv.debuff) n.push(`Lowers the foe's ${STAT[mv.debuff.stat]} for ${secs(mv.debuff.time)}.`);
  if (mv.shield) n.push(`Blocks every hit for ${secs(mv.shield)}.`);
  if (mv.sub) n.push('A doll takes the next hit for you.');
  if (mv.empower) n.push('Your next attack hits twice as hard.');
  if (mv.cure) n.push('Cures your status condition.');
  if (mv.selfStatus) n.push(`Leaves you ${STATUS[mv.selfStatus].label}.`);
  if (mv.leech) n.push(`Seeds the foe: drains ${mv.leech.dps} HP a second for ${secs(mv.leech.time)}.`);
  if (mv.bury) n.push(`Buries foes for ${secs(mv.bury)}.`);
  if (mv.trap) n.push(`Leaves a hidden trap for ${secs(mv.trap)}.`);
  if (mv.gravity) n.push('Nobody can jump inside the zone.');
  if (mv.linger && !mv.once) n.push(`Stays out for ${secs(mv.linger)}, hitting again and again.`);
  if (mv.strip) n.push("Wipes the foe's boosts and shield.");
  if (mv.cleanse) n.push('Clears your lowered stats.');
  if (mv.ramp) n.push('Hits harder with every use in a row.');
  if (mv.after) n.push(`Leaves you ${STATUS[mv.after].label} when it ends.`);
  if (mv.hpCost) n.push(`Costs ${pct(mv.hpCost)} of your max HP.`);
  if (mv.kind === 'hold') n.push(`Burns stamina while held; hits cost you HP.`);
  else if (mv.recoil) n.push(`A miss costs you ${mv.recoil} HP.`);
  if (mv.tire) n.push('Leaves you out of stamina.');

  // for the player's eyes only (Taunt has its own, stricter idea of a status move in mv.cls)
  const role = mv.kind === 'self' ? 'Support' : (mv.dmg ?? 0) >= 8 ? 'Attack' : 'Status';
  return { type: typeOf(id), role, kind: cap(KIND_LABEL[mv.kind]), how: HOW[mv.kind], stats, notes: n };
}
