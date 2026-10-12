import { MOVES, STATUS, TAGS, KIND_LABEL } from '../moves.js';

// What the move menu and the battle HUD say about a move: its elemental type and a plain-words read of its data.
const TYPE_MOVES = {
  grass: 'razorLeaf leafStorm leafBlade magicalLeaf powerWhip grassKnot gigaDrain bulletSeed petalDance stunSpore energyBall vineWhip woodHammer leechSeed petalBlizzard aromatherapy seedBomb needleArm ingrain sleepPowder cottonGuard',
  fire: 'flameBurst fireSpin fireFang ember fireBlast flamethrower willOWisp eruption overheat incinerate lavaPlume blastBurn firePunch',
  water: 'bubble waterSpout waterPulse hydroBurst hydroPump whirlpool crabhammer bubbleBeam razorShell surf brine waterfall waterGun rainDance aquaRing lifeDew',
  psychic: 'confusion psybeam psychic hypnosis futureSight psychoCut kinesis rest agility barrier gravity reflect lightScreen',
  dark: 'bite nightSlash darkPulse nightDaze snarl taunt suckerPunch torment',
  ghost: 'shadowBall shadowClaw shadowSneak hex confuseRay nightShade phantomForce destinyBond spite',
  fairy: 'drainingKiss moonblast moonlight',
  fighting: 'drainPunch hammerArm wakeUpSlap focusBlast focusPunch auraSphere forcePalm crossChop dynamicPunch machPunch seismicToss circleThrow closeCombat detect brickBreak reversal',
  electric: 'thunderFang thunderbolt discharge thunder chargeBeam shockWave thunderShock charge',
  bug: 'xScissor bugBite spiderWeb pinMissile megahorn furyCutter attackOrder defendOrder healOrder bugBuzz uTurn signalBeam stringShot stickyWeb',
  dragon: 'dragonBreath dragonPulse outrage dualChop dragonClaw dragonRush dracoMeteor dragonDance dragonTail',
  flying: 'gust whirlwind airSlash aerialAce featherDance tailwind roost braveBird fly bounce acrobatics hurricane',
  ground: 'bonemerang earthquake mudBomb sandTomb magnitude',
  rock: 'rockSlide stoneEdge rockBlast rockTomb rockWrecker stealthRock rockThrow powerGem rollout',
  poison: 'poisonSting sludgeBomb poisonJab acid crossPoison sludgeWave toxicSpikes',
  steel: 'metalClaw flashCannon gyroBall meteorMash ironDefense bulletPunch magnetPull',
  ice: 'iceArmor iceFang iceShard blizzard avalanche iceBall iceBeam auroraBeam haze icicleCrash',
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
  stamina: { notches: 10, full: 100, color: '#f2c94c' }, // in half notches of the energy bar
  range: { notches: 16, full: 330, color: '#8fdcff' },
};
export const litNotches = (key, value) => {
  const m = METERS[key];
  return value > 0 ? Math.min(m.notches, Math.max(1, Math.round((value / m.full) * m.notches))) : 0;
};
const reachOf = (mv) => mv.range ?? mv.length ?? mv.dash ?? (mv.kind === 'aoe' ? mv.grow?.max ?? mv.radius : mv.kind === 'melee' ? mv.reach + mv.radius : null);

// { type, role, kind, how, power, cost, charge (seconds), reach (px, or null), reachLabel, notes: [...] }
export function describe(id) {
  const mv = MOVES[id];
  const n = [];
  if (mv.tag && mv.tag !== 'strike') n.push(TAGS[mv.tag].how);
  if (mv.random) n.push('Uses some other move at random.');
  if (mv.kind === 'beam') n.push(`Burns ${+(mv.upkeep / 20).toFixed(1)} energy a second while held. You walk slowly, and it destroys enemy shots it crosses. Two beams that meet lock in a clash: press any move button to push.`);
  if (mv.cone) n.push('A short cone that turns fast.');
  if (mv.push) n.push('Shoves foes back, and you too.');
  if (mv.bend) n.push('Goes to the point you aim at, then bends toward the nearest foe.');
  if (mv.ghost) n.push('Passes through Light Screens.');
  if (mv.catch) n.push('Hold to stop enemy shots inside the circle in mid-air; let go to throw them where you aim. It does no damage of its own.');
  if (mv.reverse) n.push('Turns the nearest enemy shot in range back on its owner. With none about it strikes the nearest foe.');
  if (mv.steer) n.push('Hold to bend your latest shot toward your aim.');
  if (mv.wall === 'reflect') n.push('Leaves a wall for 6s that foes cannot walk or dash through.');
  if (mv.wall === 'screen') n.push('Leaves a wall for 6s that stops enemy shots and beams; light shots bounce back as yours. Your own beam splits in three through it.');
  if (mv.hideFor) n.push(`The foe does not see where it will land for the first ${secs(mv.hideFor)}.`);
  if (mv.seek) n.push('Curves toward the nearest foe ahead. If it is parried you are left stunned.');
  if (mv.fly) n.push(`Hold to fly for up to ${secs(mv.fly)}, out of reach, and come down with the hit. Thunder, Hurricane and Gravity bring a flyer down.`);
  if (mv.leap) n.push('You leap to the spot, out of reach on the way.');
  if (mv.chain) n.push(`If it connects, the next is free and faster, up to ${mv.chain} in a row. A miss leaves you stunned.`);
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
  if (mv.fixedDmg) n.push(`Always does ${mv.fixedDmg} damage, whatever either side has boosted, and goes through shields.`);
  if (mv.toss) n.push('Lifts the foe and slams it down.');
  if (mv.throw) n.push('Throws the foe to where you aim.');
  if (mv.flurry) n.push('Hold to keep punching, each blow harder. You are rooted and take more damage, during and just after.');
  if (mv.detect) n.push('For an instant the next hit misses and you appear behind whoever threw it.');
  if (mv.bide) n.push(`For ${secs(mv.bide.time)} you soak up hits without flinching, then pay them back doubled.`);
  if (mv.breaker) n.push('Smashes shields, the substitute, walls and standing rocks, and stuns their owner.');
  if (mv.repeat) n.push('Costs more each time it is used in a row.');
  if (mv.grapple) n.push('Drags the first foe it reaches to you; hitting a wall, it pulls you there.');
  if (mv.cloud) n.push('A slow drifting cloud. Wind blows it about, and it works for whoever blew it last.');
  if (mv.vanish) n.push(mv.vanish.behind ? 'You sink into the ground and come up behind the foe you aimed at.' : `You vanish for ${secs(mv.vanish.time)} and strike where you are aiming when you return. Goes through shields.`);
  if (mv.bond) n.push(`For ${secs(mv.bond)}, whoever knocks you out takes the same blow.`);
  if (mv.sap) n.push(`Burns ${+(mv.sap / 20).toFixed(1)} of the foe's energy.`);
  if (mv.torment) n.push(`For ${secs(mv.torment)} the foe cannot use the same move twice in a row.`);
  if (mv.tether) n.push(`For ${secs(mv.tether.time)} the foe cannot leave a circle around you.`);
  if (mv.string) n.push(`A thread slows the foe for ${secs(mv.string.time)}; use it again to yank the foe toward you. Slashes cut it.`);
  if (mv.web) n.push('Foes inside are slowed and cannot run.');
  if (mv.roll) n.push('You become the shot: hold to keep rolling. It turns slowly, bounces off walls, and speeds up with every bounce and hit. A parry stops you dead.');
  if (mv.pillar) n.push(`Leaves a rock standing for ${secs(mv.pillar)} that blocks shots and movement.`);
  if (mv.ambush) n.push('Also catches foes that dash, blink or dig across it, and harder.');
  if (mv.grow?.cycle) n.push('Its size swings up and down while you hold: let go at the size you want.');
  if (mv.deflect) n.push('Light shots bounce off. If a hit breaks the stance, letting go at once throws the blow back.');
  if (mv.magnet) n.push('Catches enemy metal shots nearby; they circle you and fly with your next move.');
  if (mv.dance) n.push(`Press any move button on each of ${mv.dance.n} beats: every one in time raises your Attack and Speed further. A hit loses them.`);
  if (mv.copy) n.push('Uses the last move anyone used.');
  if (mv.endure) n.push(`For ${secs(mv.endure)} your health cannot drop below 1.`);
  if (mv.lowHp) n.push('Hits harder the more hurt you are.');
  if (mv.drum) n.push('Halves your health for double Attack that does not wear off.');
  if (mv.asleep) n.push(mv.asleep === 'talk' ? 'Only works while you are asleep: fires one of your other moves at random.' : 'Only works while you are asleep.');
  if (mv.fuse) n.push(`Goes off ${secs(mv.fuse)} after you light it; you can walk meanwhile. Being knocked out defuses it.`);
  if (mv.pass) n.push('Hands every boost you carry to the nearest ally and puts you beside it.');
  if (mv.metal) n.push('Metal: Magnet Pull can catch it.');
  if (mv.sucker) n.push('Only works on a foe that is charging a move: you are on it at once and its charge is broken. Otherwise it fizzles and costs double.');
  if (mv.step) n.push('You dart forward as you strike.');
  if (mv.jab) n.push('Counter: hits much harder on a foe caught charging a move.');
  if (mv.cut) n.push('Cuts light shots out of the air.');
  if (mv.latch) n.push(`Latches on: you and the foe are both held for ${secs(mv.latch)} while it keeps biting.`);
  if (mv.combo) n.push('Use it again right after it lands and it comes out at once.');
  if (mv.versus) n.push(mv.versus.any ? 'Hits twice as hard on a foe with a status condition.' : `Hits much harder on a foe that is ${mv.versus.status.map((k) => STATUS[k].label).join(' or ')}.`);
  if (mv.fan) n.push(`Throws ${mv.fan} shots at once.`);
  if (mv.light) n.push('Light: any enemy shot or slash cancels it.');
  if (mv.pierce) n.push('Pierces: carries on through whatever it hits.');
  if (mv.boomerang) n.push('Flies out and comes back to you, hitting on both legs.');
  if (mv.ricochet) n.push(`Bounces off walls up to ${mv.ricochet} times, harder each time.`);
  if (mv.swell) n.push('Grows as it flies: weak up close, strong at range.');
  if (mv.appear && mv.kind === 'auto') n.push('A ring shows where it will land a moment before it does.');
  if (mv.stance) n.push('Stance: hold the button to keep a strong guard up. You cannot move, and the first hit ends it.');
  if (mv.ritual) n.push(`Hold to build up to ${mv.ritual.max} stacks, each raising your ${STAT[mv.buff.stat]} further. A hit loses them all.`);
  if (mv.field?.lane) n.push(`Leaves a lane along your aim for ${secs(mv.field.time)}: it speeds up whoever of your side runs along it and slows enemy shots flying up it.`);
  else if (mv.field) n.push(`Leaves a circle for ${secs(mv.field.time)}: it only works while you stand in it.`);
  if (mv.lob) n.push('Lobbed: it comes down where you aim.');
  if (mv.cycle) n.push(`Each use fires a different shot, ${mv.cycle.length} in rotation.`);
  if (mv.grow) n.push('Hold to widen the blast, release to fire.');
  if (mv.status) {
    const what = mv.status.kind === 'tri' ? 'burned, paralysed or frozen' : STATUS[mv.status.kind].label;
    n.push(mv.status.chance >= 1 ? `Leaves foes ${what}.` : `${pct(mv.status.chance)} chance to leave foes ${what}.`);
  }
  if (mv.drain) n.push(`Heals you for ${pct(mv.drain)} of the damage.`);
  if (mv.heal) n.push(`Restores ${mv.heal} HP${(mv.healDelay ?? 0) >= 2000 ? ` after ${secs(mv.healDelay / 1000)}` : ''}.`);
  if (mv.regen && !mv.field) n.push(`Heals ${mv.regen.hps} HP a second for ${secs(mv.regen.time)}.`);
  if (mv.ingrain) n.push(`Roots you and heals ${mv.ingrain.hps} HP a second for ${secs(mv.ingrain.time)}.`);
  if (mv.buff && !mv.stance && !mv.ritual && !mv.field) n.push(mv.buff.stat === 'eva' ? `Dodge half of all hits for ${secs(mv.buff.time)}.` : `Raises your ${STAT[mv.buff.stat] ?? 'stats'} for ${secs(mv.buff.time)}.`);
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
  if (mv.dig) n.push('You travel underground where nothing can hit you, and strike where you come up.');
  else if (mv.kind === 'hold') n.push(`Burns energy while held; hits cost you HP.`);
  else if (mv.recoil) n.push(`A miss costs you ${mv.recoil} HP.`);
  if (mv.tire) n.push('Leaves you out of energy.');

  // for the player's eyes only (Taunt has its own, stricter idea of a status move in mv.cls)
  const role = mv.kind === 'self' ? 'Support' : (mv.dmg ?? 0) >= 8 ? 'Attack' : 'Status';
  return {
    type: typeOf(id), role, tag: mv.tag ?? null, kind: cap(KIND_LABEL[mv.kind]), how: HOW[mv.kind],
    power: mv.dmg ?? 0, cost: mv.cost, charge: mv.charge, reach: reachOf(mv) ?? null, reachLabel: mv.kind === 'aoe' ? 'Radius' : 'Range',
    notes: n,
  };
}
