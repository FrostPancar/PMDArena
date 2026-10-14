import { MOVES, STATUS, TAGS, KIND_LABEL, HEAL_LIMIT, healsOnly } from '../moves.js';

// What the move menu and the battle HUD say about a move: its elemental type and a plain-words read of its data.
const TYPE_MOVES = {
  grass: 'solarBeam razorLeaf leafStorm leafBlade magicalLeaf powerWhip grassKnot gigaDrain bulletSeed petalDance stunSpore energyBall vineWhip woodHammer leechSeed petalBlizzard aromatherapy seedBomb needleArm ingrain sleepPowder cottonGuard',
  fire: 'blazeKick flareBlitz flameBurst fireSpin fireFang ember fireBlast flamethrower willOWisp eruption overheat incinerate lavaPlume blastBurn firePunch',
  water: 'bubble waterSpout waterPulse hydroBurst hydroPump whirlpool crabhammer bubbleBeam razorShell surf brine waterfall waterGun rainDance aquaRing lifeDew',
  psychic: 'teleport healPulse dreamEater confusion psybeam psychic hypnosis futureSight psychoCut kinesis rest agility barrier gravity reflect lightScreen',
  dark: 'knockOff bite nightSlash darkPulse nightDaze snarl taunt suckerPunch torment punishment',
  ghost: 'shadowBall shadowClaw shadowSneak hex confuseRay nightShade phantomForce destinyBond spite',
  fairy: 'dazzlingGleam drainingKiss moonblast moonlight',
  fighting: 'counter drainPunch hammerArm wakeUpSlap focusBlast focusPunch auraSphere forcePalm crossChop dynamicPunch machPunch seismicToss circleThrow closeCombat detect brickBreak reversal',
  electric: 'electroweb zapCannon electroBall thunderFang thunderbolt discharge thunder chargeBeam shockWave thunderShock charge',
  bug: 'xScissor bugBite spiderWeb pinMissile megahorn furyCutter attackOrder defendOrder healOrder bugBuzz uTurn signalBeam stringShot stickyWeb',
  dragon: 'dragonBreath dragonPulse outrage dualChop dragonClaw dragonRush dracoMeteor dragonDance dragonTail',
  flying: 'gust whirlwind airSlash aerialAce featherDance tailwind roost braveBird fly bounce acrobatics hurricane',
  ground: 'mudShot spikes boneRush bonemerang earthquake mudBomb sandTomb magnitude dig',
  rock: 'rockSlide stoneEdge rockBlast rockTomb rockWrecker stealthRock rockThrow powerGem rollout',
  poison: 'venoshock poisonPowder poisonSting sludgeBomb poisonJab acid crossPoison sludgeWave toxicSpikes',
  steel: 'steelWing ironTail metalClaw flashCannon gyroBall meteorMash ironDefense bulletPunch magnetPull kingsShield',
  ice: 'auroraVeil powderSnow iceArmor iceFang iceShard blizzard avalanche iceBall iceBeam auroraBeam haze icicleCrash',
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
  beam: 'Hold to keep firing along a line; it swings toward your aim.',
  aoe: 'Bursts all around you.',
  auto: 'Strikes the nearest foe by itself.',
  homing: 'Chases the nearest foe.',
  slight: 'Curves toward foes ahead of it.',
  dash: 'You rush through whatever is ahead.',
  hold: 'Hold the button to fly at the cursor.',
  self: 'Works on yourself.',
  blink: 'You vanish and reappear where you aim.',
};
const STAT = { atk: 'Attack', spd: 'Speed', def: 'Defense', eva: 'Evasion' };
const pct = (n) => `${Math.round(n * 100)}%`;
const secs = (n) => `${+n.toFixed(1)}s`;
// How the move menu draws the stats: a bar of `notches` cells that is full at `full` (the biggest any move has;
// stamina's is the mon's whole bar, so a cost reads as the share of it that goes). A value lights the nearest whole
// number of notches, and always at least one.
export const METERS = {
  power: { notches: 16, full: 36, color: '#ff7a6a' },
  stamina: { notches: 5, full: 100, color: '#f2c94c' }, // the energy bar itself: a move lights what it costs, half notches too
  speed: { notches: 16, full: 1, color: '#8fdcff' },
};
export const litNotches = (key, value) => {
  const m = METERS[key];
  return value > 0 ? Math.min(m.notches, Math.max(1, Math.round((value / m.full) * m.notches))) : 0;
};
const reachOf = (mv) => mv.range ?? mv.length ?? mv.dash ?? (mv.kind === 'aoe' ? mv.grow?.max ?? mv.radius : mv.kind === 'melee' ? mv.reach + mv.radius : null);

// How to answer a move that is not a plain strike, in a few words.
const ANSWER = {
  grab: 'Grab: beats parry and shield.',
  heavy: 'Heavy: a parry only halves it.',
  sweep: 'Sweep: cannot be jumped.',
  curse: 'Curse: beats parry, jump and shield.',
};
// The picture a move's kind is shown with in the move menu (art.js draws kind<Name>).
export const DELIVERY_LABEL = { melee: 'Melee', mid: 'Mid range', projectile: 'Ranged', beam: 'Beam', aoe: 'Area', self: 'Self', dash: 'Dash', hold: 'Hold', blink: 'Teleport' };
const DELIVERY = { melee: 'melee', mid: 'mid', auto: 'mid', projectile: 'projectile', homing: 'projectile', slight: 'projectile', beam: 'beam', aoe: 'aoe', self: 'self', dash: 'dash', hold: 'hold', blink: 'blink' };
// Type colours, for tinting things by a move's type.
export const TYPE_TINT = {
  normal: 0xa8a878, fire: 0xf08030, water: 0x6890f0, electric: 0xe8c028, grass: 0x78c850, ice: 0x78c8c8, fighting: 0xc03028, poison: 0xa040a0, ground: 0xd0a850,
  flying: 0xa890f0, psychic: 0xf85888, bug: 0xa8b820, rock: 0xb8a038, ghost: 0x705898, dragon: 0x7038f8, dark: 0x705848, steel: 0xa0a0c0, fairy: 0xee99ac,
};

// How quick a move is, 0..1: the less time between pressing it and it landing on a foe a little way off, the higher.
// That time is its wind-up plus what its delivery takes: a lunge, a shot's flight, the wait before a blast lands.
function quickness(mv) {
  const shot = mv.kind === 'projectile' || mv.kind === 'homing' || mv.kind === 'slight';
  const travel = mv.kind === 'self' ? 0
    : mv.kind === 'melee' ? (mv.jab || mv.step > 16 ? 0 : 0.1)
      : shot ? 100 / (mv.speed || 150)
        : mv.kind === 'mid' || mv.kind === 'auto' || mv.kind === 'aoe' ? ((mv.hitDelay ?? 120) + (mv.appear ?? 0)) / 1000 + (mv.fall?.time ?? 0)
          : 0.1;
  return Math.max(0.06, 1 - ((mv.charge ?? 0) + travel) / 1.2);
}

// { type, role, held, delivery, kind, how, power, cost, charge (seconds), speed (0..1), reach (px, or null), notes: [...] }
export function describe(id) {
  const mv = MOVES[id];
  const n = [];
  if (mv.tag && mv.tag !== 'strike') n.push(ANSWER[mv.tag]);
  if (mv.random) n.push('Uses some other move at random.');
  if (mv.kind === 'beam') n.push(`Costs ${+(mv.upkeep / 20).toFixed(1)} energy a second. Slows what it hits.`, 'Beams that meet clash: mash a move to push.');
  if (mv.cone) n.push('A short cone that turns fast.');
  if (mv.push) n.push('Shoves foes back, and you too.');
  if (mv.bend) n.push('Goes to the point you aim at, then bends toward the nearest foe.');
  if (mv.ghost) n.push('Passes through Light Screens.');
  if (mv.catch) n.push(mv.catch.around ? 'Catches enemy shots in a field around you.' : 'Catches enemy shots in a field that drifts after your aim.', 'Let go to throw them back.');
  if (mv.reverse) n.push('Turns the nearest enemy shot back on its owner.');
  if (mv.steer) n.push('Bends your latest shot toward your aim.');
  if (mv.wall === 'reflect') n.push('Leaves a wall for 6s that foes cannot walk or dash through.');
  if (mv.wall === 'screen') n.push('A wall for 6s that stops shots and beams; light shots bounce back.', 'Your own beam splits in three through it.');
  if (mv.hideFor) n.push(`The foe does not see where it will land for the first ${secs(mv.hideFor)}.`);
  if (mv.seek) n.push('Curves toward the nearest foe ahead. If it is parried you are left stunned.');
  if (mv.fly) n.push(`Fly out of reach for up to ${secs(mv.fly)}, then dive.`, 'Thunder, Hurricane and Gravity bring you down.');
  if (mv.leap) n.push('You leap to the spot, out of reach on the way.');
  if (mv.chain) n.push(`A hit makes the next one free, up to ${mv.chain} in a row. A miss stuns you.`);
  if (mv.back) n.push('Returns to where you started as soon as it connects.');
  if (mv.pull) n.push('Drags foes and their shots toward its centre.');
  if (mv.blow) n.push('Throws enemy shots back out.');
  if (mv.roost) n.push(`Grounds you for ${secs(mv.roost)}: no jumping or flying, and ground moves hit harder.`);
  if (mv.chill) n.push('Chills: the third stack freezes the foe.');
  if (mv.lock) n.push(`Marks the foe for ${secs(mv.lock)}: all your shots home in on it.`);
  if (mv.weight === 2) n.push('Heavy shot: ploughs through lighter ones.');
  if (mv.hpScale) n.push('Stronger the healthier you are.');
  if (mv.selfDebuff) n.push(`Lowers your own ${STAT[mv.selfDebuff.stat]} for ${secs(mv.selfDebuff.time)} afterwards.`);
  if (mv.lead) n.push('Lands where its target is heading.');
  if (mv.fixedDmg) n.push(`Always ${mv.fixedDmg} damage. Goes through shields.`);
  if (mv.toss) n.push('Lifts the foe and slams it down.');
  if (mv.throw) n.push(mv.throwBack ? 'Throws the foe far behind you.' : 'Throws the foe to where you aim.');
  if (mv.flurry) n.push(mv.flurry.weak ? 'Each blow hits harder. You are rooted and take more damage.' : 'Each blow hits harder. You are rooted while it lasts.'); 
  if (mv.detect) n.push('For an instant the next hit misses: you appear behind whoever threw it, and they are stunned.');
  if (mv.bide) n.push(`For ${secs(mv.bide.time)}, a hit you take makes your next attack hit twice as hard.`);
  if (mv.ray) n.push(mv.ray.len ? 'A burst out of you toward where you aim: everything in it is hit.' : 'One flash down a line to where you aim: everything on the line is hit.');
  if (mv.punish) n.push(`Hits ${pct(mv.punish)} harder for every stat the foe has raised.`);
  if (mv.safeguard) n.push(`For ${secs(mv.safeguard)}, nothing a foe sends can give you a status, lower your stats or hamper you.`);
  if (mv.critUp) n.push(`For ${secs(mv.critUp.time)}, your hits are ${pct(mv.critUp.add)} likelier to be critical.`);
  if (mv.noCrit) n.push(`No hit on you can be critical for ${secs(mv.noCrit)}.`);
  if (mv.keen) n.push('A slicing move: a critical hit one time in four.');
  if (mv.asleep === 'talk') n.push('Only while asleep: uses one of your other three moves (never Rest).');
  if (mv.vanish?.trail) n.push('Sinks into the ground and comes up behind the foe.');
  if (mv.breaker) n.push('Smashes shields, the substitute, walls and standing rocks, and stuns their owner.');
  if (mv.repeat) n.push('Costs more each time it is used in a row.');
  if (mv.grapple) n.push(mv.meet ? 'Pulls you and the first foe it reaches together.' : 'Drags the first foe it reaches to you.', 'Hitting a wall, it pulls you there.');
  if (mv.cloud) n.push('A slow drifting cloud. Wind blows it about, and it works for whoever blew it last.');
  if (mv.vanish) n.push(mv.vanish.behind ? 'You come up behind the foe you aimed at.' : `Vanish for ${secs(mv.vanish.time)}, then strike where you aim. Goes through shields.`);
  if (mv.bond) n.push(`For ${secs(mv.bond)}, whoever knocks you out takes the same blow.`);
  if (mv.sap) n.push(`Burns ${+(mv.sap / 20).toFixed(1)} of the foe's energy.`);
  if (mv.torment) n.push(`For ${secs(mv.torment)} the foe cannot use the same move twice in a row.`);
  if (mv.tether) n.push(`For ${secs(mv.tether.time)} the foe cannot leave a circle around you.`);
  if (mv.string) n.push(`Slows the foe for ${secs(mv.string.time)}. Use again to yank it to you.`);
  if (mv.web) n.push(`Holds the first foe to step in for 2s${mv.status ? ', paralysed' : ''}, then it is gone.`);
  if (mv.dream) n.push('Only on sleeping foes, wherever they are.');
  if (mv.blaze) n.push('Leaves a trail of fire.');
  if (mv.recoilHit) n.push(`A hit costs you ${pct(mv.recoilHit)} of the damage.`);
  if (mv.spdScale) n.push('Hits harder the faster you are.');
  if (mv.healAllies) n.push('Heals allies near you too.');
  if (mv.kind === 'blink' && !mv.dmg) n.push('Puts you where you aim. It does no damage.');
  if (mv.roll) n.push('You roll: faster with every bounce and hit.', 'A parry stops you dead.');
  if (mv.missPillar) n.push(`A miss leaves the boulder standing for ${secs(mv.missPillar)} as cover.`);
  if (mv.pillar) n.push(`Leaves a rock standing for ${secs(mv.pillar)} that blocks shots and movement.`);
  if (mv.ambush) n.push('Also catches foes that dash or blink across it, and harder.');
  if (mv.grow?.cycle) n.push('Its size swings up and down while you hold: let go at the size you want.');
  if (mv.deflect) n.push('Light shots bounce off. Let go as a hit lands to throw it back.');
  if (mv.magnet) n.push('Catches enemy metal shots nearby; they circle you and fly with your next move.');
  if (mv.dance) n.push(`Tap a move on each of ${mv.dance.n} beats: each raises Attack and Speed.`, 'A hit loses them.');
  if (mv.copy) n.push('Uses the last move anyone used.');
  if (mv.endure) n.push(`For ${secs(mv.endure)} your health cannot drop below 1.`);
  if (mv.lowHp) n.push('Hits harder the more hurt you are.');
  if (mv.drum) n.push('Halves your health for double Attack that does not wear off.');
  if (mv.asleep) n.push(mv.asleep === 'talk' ? 'Only while asleep: uses another of your moves.' : 'Only while asleep.');
  if (mv.fuse) n.push(`Goes off after ${secs(mv.fuse)}; you can walk meanwhile.`);
  if (mv.pass) n.push('Hands every boost you carry to the nearest ally and puts you beside it.');
  if (mv.metal) n.push('Metal: Magnet Pull can catch it.');
  if (mv.sucker) n.push('Only on a foe charging a move: breaks the charge.', 'Otherwise it fizzles and costs double.');
  if (mv.step > 16) n.push('A longer dart in than most.'); // every melee move darts a little: only the long ones say so
  if (mv.jab) n.push('Counter: hits much harder on a foe caught charging a move.');
  if (mv.cut) n.push('Cuts light shots out of the air.');
  if (mv.latch) n.push('A grab: it lands twice, the foe held helpless between the two, then you are both thrown apart.');
  if (mv.combo) n.push('Use it again right after it lands and it comes out at once.');
  if (mv.versus) n.push(mv.versus.any ? 'Hits twice as hard on a foe with a status condition.' : `Hits much harder on a foe that is ${mv.versus.status.map((k) => STATUS[k].label).join(' or ')}.`);
  if (mv.stream) n.push(`Keeps ${mv.kind === 'melee' ? 'striking' : 'firing'} while held, for ${+(mv.stream.upkeep / 20).toFixed(1)} energy a second.`);
  if (mv.volley) n.push(`${mv.volley.n} shots one after another, each where you aim. On the pad, hold for them.`);
  if (mv.fan) n.push(`Throws ${mv.fan} shots at once.`);
  if (mv.light) n.push('Light: any enemy shot or slash cancels it.');
  if (mv.pierce) n.push('Pierces: carries on through whatever it hits.');
  if (mv.boomerang) n.push('Flies out and comes back to you, hitting on both legs.');
  if (mv.ricochet) n.push(`Bounces off walls up to ${mv.ricochet} times, harder each time.`);
  if (mv.swell) n.push('Grows as it flies: weak up close, strong at range.');
  if (mv.appear && mv.kind === 'auto') n.push('A ring shows where it will land a moment before it does.');
  if (mv.stance) n.push(mv.burst ? 'A strong guard while held. The first hit ends it in a blast all round you.' : mv.onBlock?.buff ? `A strong guard while held. The first hit ends it and raises your ${STAT[mv.onBlock.buff.stat]} for ${secs(mv.onBlock.buff.time)}.` : mv.onBlock?.empower ? 'A strong guard while held. The first hit ends it, and your next attack hits twice as hard.' : 'A strong guard while held. The first hit ends it.');
  if (mv.ritual) n.push(`Builds up to ${mv.ritual.max} stacks of ${STAT[mv.buff.stat]}${mv.buff.also ? ` and ${STAT[mv.buff.also]}` : ''}. A hit loses them.`);
  if (mv.field?.lane) n.push(`A lane for ${secs(mv.field.time)}: speeds your side, slows enemy shots.`);
  else if (mv.field) n.push(`Leaves a circle for ${secs(mv.field.time)}: it only works while you stand in it.`);
  if (mv.lob) n.push('Lobbed: it comes down where you aim.');
  if (mv.cycle) n.push(`Each use fires a different shot, ${mv.cycle.length} in rotation.`);
  if (mv.grow) n.push('Widens while held.');
  if (mv.status) {
    const what = mv.status.kind === 'tri' ? 'burned, paralysed or frozen' : STATUS[mv.status.kind].label;
    n.push(mv.status.chance >= 1 ? `Leaves foes ${what}.` : `${pct(mv.status.chance)} chance to leave foes ${what}.`);
  }
  if (healsOnly(mv)) n.push(`Healing moves: ${HEAL_LIMIT} uses a match between them.`);
  if (mv.drain) n.push(`Heals you for ${pct(mv.drain)} of the damage.`);
  if (mv.heal) n.push(`Restores ${mv.heal} HP${(mv.healDelay ?? 0) >= 2000 ? ` after ${secs(mv.healDelay / 1000)}` : ''}.`);
  if (mv.regen && !mv.field) n.push(`Heals ${mv.regen.hps} HP a second for ${secs(mv.regen.time)}.`);
  if (mv.ingrain) n.push(`Roots you and heals ${mv.ingrain.hps} HP a second for ${secs(mv.ingrain.time)}. Jump to pull the roots up early.`);
  if (mv.buff && !mv.stance && !mv.ritual && !mv.field) n.push(mv.buff.stat === 'eva' ? `Dodge half of all hits for ${secs(mv.buff.time)}.` : mv.buff.stat === 'random' ? `Raises one of your stats, at random, for ${secs(mv.buff.time)}.` : `Raises your ${STAT[mv.buff.stat] ?? 'stats'} for ${secs(mv.buff.time)}.`);
  if (mv.bonus) n.push(`${pct(mv.bonus.chance)} chance to raise your ${STAT[mv.bonus.buff.stat]}.`);
  if (mv.debuff) n.push(`Lowers the foe's ${STAT[mv.debuff.stat]} for ${secs(mv.debuff.time)}.`);
  if (mv.guard) n.push(`Blocks every hit while held, for ${+(mv.guard.upkeep / 20).toFixed(1)} energy a second.`);
  else if (mv.shield) n.push(`Blocks every hit for ${secs(mv.shield)}.`);
  if (mv.armor) n.push('Armoured: hits hurt but cannot stop it.');
  if (mv.rain) n.push(`Your side's water moves hit harder for ${secs(mv.rain)}.`);
  if (mv.summon) n.push(`Calls a copy of you with 1 HP for ${secs(mv.summon.time)}. It uses Pin Missile and Stun Spore.`);
  if (mv.levitate) n.push(mv.kind === 'self' ? 'The shot it steers lifts what it hits.' : 'Lifts the foe helpless into the air for a moment.');
  if (mv.twice) n.push('Goes off twice where it ends.');
  if (mv.single) n.push('Cannot be used again until it has finished.');
  if (mv.lobScale) n.push('Hits harder the further it is thrown.');
  if (mv.sub) n.push('A doll takes your hits until it has lost the HP you spent on it. Status moves and ill effects fail against it, and your charges are not broken.');
  if (mv.empower) n.push('Your next attack hits twice as hard.');
  if (mv.cure) n.push('Cures your status condition.');
  if (mv.selfStatus) n.push(`Leaves you ${STATUS[mv.selfStatus].label}.`);
  if (mv.leech) n.push(`Seeds the foe: drains ${mv.leech.dps} HP a second for ${secs(mv.leech.time)}.`);
  if (mv.bury) n.push(`Buries foes for ${secs(mv.bury)}.`);
  if (mv.trap) n.push(`Leaves a ${mv.trapArt ? '' : 'hidden '}trap for ${secs(mv.trap)}. It never lands a critical hit.`);
  if (mv.layers) n.push(`Thrown onto one you have already laid, it makes that one wider and harder instead, up to ${mv.layers.max} layers.`);
  if (mv.gravity) n.push('Nobody can jump inside the zone.');
  if (mv.linger && !mv.once) n.push(`Stays out for ${secs(mv.linger)}, hitting again and again.`);
  if (mv.strip) n.push("Wipes the foe's boosts and shield.");
  if (mv.cleanse) n.push('Clears your lowered stats.');
  if (mv.ramp) n.push('Hits harder with every use in a row.');
  if (mv.after) n.push(`Leaves you ${STATUS[mv.after].label} when it ends.`);
  if (mv.hpCost) n.push(`Costs ${pct(mv.hpCost)} of your max HP.`);
  if (mv.dig) n.push('You travel underground where nothing can hit you, and strike where you come up.');
  else if (mv.kind === 'hold') n.push(`Burns energy while held; hits cost you HP.`);
  else if (mv.recoil) n.push(`A miss costs you ${mv.recoil} HP.`);
  if (mv.tire) n.push('Leaves you out of energy.');

  // for the player's eyes only (Taunt has its own, stricter idea of a status move in mv.cls)
  const role = mv.kind === 'self' ? 'Support' : (mv.dmg ?? 0) >= 8 ? 'Attack' : 'Status';
  // held: it lasts while its button is down (the same moves the touch pad starts on the press)
  const held = !!(mv.stream || mv.guard || mv.grow || mv.catch || mv.ritual || mv.steer || mv.flurry || mv.stance || mv.kind === 'beam' || mv.kind === 'hold');
  return {
    type: typeOf(id), role, held, delivery: DELIVERY[mv.kind] ?? 'projectile', tag: mv.tag ?? null, kind: cap(KIND_LABEL[mv.kind]), how: HOW[mv.kind],
    power: mv.dmg ?? 0, cost: mv.cost, charge: mv.charge, speed: quickness(mv), reach: reachOf(mv) ?? null,
    notes: n,
  };
}
