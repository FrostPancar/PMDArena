import { audioContext } from './music.js';
import { typeOf } from './moveinfo.js';

// Sound effects. The engine (scene.js, mon.js) knows nothing of sound: it emits 'sfx' on the game's events when
// something worth hearing happens (a move goes off, a hit lands, a jump...), and wireSfx turns that into a sound here.
// The files are in "Sound Effects/" (named and sorted with sounds.html); only the ones listed in SOUNDS are bundled.
// Every move has a sound (see moveSound), and so do the things that happen in a fight and the steps through a menu.
// (every file a sound in SOUNDS names has to be in this list: the folder holds some 480, and only these are shipped)
const urls = import.meta.glob([
  '../../Sound Effects/beep.mp3', '../../Sound Effects/bubbles1.mp3', '../../Sound Effects/bubbles2.mp3', '../../Sound Effects/chime.mp3',
  '../../Sound Effects/effect.mp3', '../../Sound Effects/exit.mp3', '../../Sound Effects/explosive_echo.mp3', '../../Sound Effects/song344.mp3',
  '../../Sound Effects/song347.mp3', '../../Sound Effects/song404.mp3', '../../Sound Effects/song470.mp3', '../../Sound Effects/song479.mp3',
  '../../Sound Effects/song482.mp3', '../../Sound Effects/song485.mp3', '../../Sound Effects/song492.mp3', '../../Sound Effects/song494.mp3',
  '../../Sound Effects/song495.mp3', '../../Sound Effects/song498.mp3', '../../Sound Effects/song505.mp3', '../../Sound Effects/song508.mp3',
  '../../Sound Effects/song509.mp3', '../../Sound Effects/song511.mp3', '../../Sound Effects/song518.mp3', '../../Sound Effects/song606.mp3',
  '../../Sound Effects/song610.mp3', '../../Sound Effects/song611.mp3', '../../Sound Effects/song612.mp3', '../../Sound Effects/song616.mp3',
  '../../Sound Effects/song620.mp3', '../../Sound Effects/song621.mp3', '../../Sound Effects/song622.mp3', '../../Sound Effects/song626.mp3',
  '../../Sound Effects/song628.mp3', '../../Sound Effects/song629.mp3', '../../Sound Effects/song639.mp3', '../../Sound Effects/song641.mp3',
  '../../Sound Effects/song646.mp3', '../../Sound Effects/song648.mp3', '../../Sound Effects/song652.mp3', '../../Sound Effects/song653.mp3',
  '../../Sound Effects/song654.mp3', '../../Sound Effects/song655.mp3', '../../Sound Effects/song662.mp3', '../../Sound Effects/song669.mp3',
  '../../Sound Effects/song671.mp3', '../../Sound Effects/song674.mp3', '../../Sound Effects/song675.mp3', '../../Sound Effects/song678.mp3',
  '../../Sound Effects/song682.mp3', '../../Sound Effects/song683.mp3', '../../Sound Effects/song687.mp3', '../../Sound Effects/song689.mp3',
  '../../Sound Effects/song698.mp3', '../../Sound Effects/song700.mp3', '../../Sound Effects/song707.mp3', '../../Sound Effects/song710.mp3',
  '../../Sound Effects/song711.mp3', '../../Sound Effects/song715.mp3', '../../Sound Effects/song716.mp3', '../../Sound Effects/song722.mp3',
  '../../Sound Effects/song729.mp3', '../../Sound Effects/song736.mp3', '../../Sound Effects/song766.mp3', '../../Sound Effects/song770.mp3',
  '../../Sound Effects/song772.mp3', '../../Sound Effects/song775.mp3', '../../Sound Effects/song790.mp3', '../../Sound Effects/song802.mp3',
  '../../Sound Effects/song808.mp3', '../../Sound Effects/song819.mp3', '../../Sound Effects/song827.mp3', '../../Sound Effects/song828.mp3',
  '../../Sound Effects/song848.mp3', '../../Sound Effects/song867.mp3', '../../Sound Effects/song877.mp3', '../../Sound Effects/song882.mp3',
  '../../Sound Effects/song898.mp3', '../../Sound Effects/song899.mp3', '../../Sound Effects/song901.mp3', '../../Sound Effects/song910.mp3',
  '../../Sound Effects/song920.mp3', '../../Sound Effects/song935.mp3', '../../Sound Effects/splash.mp3', '../../Sound Effects/take_hit.mp3',
  '../../Sound Effects/take_hit_heavy.mp3', '../../Sound Effects/thunder.mp3',
], { eager: false, query: '?url', import: 'default' });

// name -> file (without .mp3), and how loud against the rest. A list of files: one is picked at random each time.
const SOUNDS = {
  // menus
  ui_move: ['beep', 0.5], ui_pick: ['chime', 0.5], ui_back: ['exit', 0.5], pick_mon: ['song654', 0.7],
  // what happens in a fight
  jump: ['song901', 0.65], hit: [['song652', 'song653', 'song655', 'song662', 'song610', 'song819'], 0.7], hit_light: ['take_hit', 0.35], hit_heavy: ['take_hit_heavy', 0.9],
  parry: ['song509', 0.8], clash: ['song715', 0.9], shatter: ['song675', 0.6], faint: ['song347', 0.9], heal: ['song899', 0.6],
  break_rock: ['song682', 0.8], break_ice: ['song828', 0.8],
  // moves, by what they are
  blunt: ['song729', 0.7], blunt_light: ['song775', 0.6], cut: ['song683', 0.6], swipe: ['song689', 0.6], sharp: ['song494', 0.6], triple: ['song628', 0.6],
  grab: ['song344', 0.7], smack: ['song687', 0.8], dash: ['song920', 0.55], whoosh: ['effect', 0.45], crabhammer: ['song898', 0.8],
  beam: [['song404', 'song877'], 0.6], beam_heavy: ['song508', 0.8], signal_beam: ['song485', 0.6], tri_attack: ['song612', 0.7],
  explosion_big: ['explosive_echo', 1], double_burst: ['song498', 0.8], blast_burn: ['song492', 0.9],
  fire: [['song716', 'song802'], 0.6], fireball: ['song671', 0.6], flare: ['song669', 0.6], charge_fire: ['song848', 0.7], blaze_kick: ['song505', 0.7], burned: ['song674', 0.6],
  ice: ['song828', 0.6], ice_shot: ['song626', 0.6], rock: ['song641', 0.7], metal: ['song935', 0.6], iron_defense: ['song495', 0.7],
  wind: ['song678', 0.6], wind_long: ['song770', 0.6], wing: ['song790', 0.6],
  water: [['bubbles1', 'bubbles2'], 0.6], splash: ['splash', 0.7], rain: ['song518', 0.7], thunder: ['thunder', 0.7],
  leaf: ['song827', 0.6], seed: ['song639', 0.6], vine: ['song698', 0.6], vine_wall: ['song710', 0.6], bug_buzz: ['song867', 0.6],
  star: ['song470', 0.6], shooting_star: ['song910', 0.6], shimmer: ['song899', 0.5], shineshine: ['song766', 0.6],
  power_up: ['song882', 0.6], charge_up: ['song700', 0.7], swords: ['song479', 0.7], counter: ['song707', 0.7], reflect: ['song511', 0.7],
  power_down: [['song621', 'song711'], 0.6], status_bad: ['song646', 0.6], low_negative: ['song736', 0.6], denied: ['song622', 0.6],
  scary: ['song772', 0.7], confusion: ['song808', 0.6], detect: ['song620', 0.7],
  bell: ['song482', 0.7], sing: ['song648', 0.7], heal_move: ['song606', 0.7], notes: ['song722', 0.6], claps: ['song629', 0.7], warble: ['song616', 0.7], belly_drum: ['song611', 0.8],
};

// A move's sound: its own if it is listed here; else by what it does and its type (moveSound). Every move has one.
const own = (name, ids) => Object.fromEntries(ids.split(' ').map((id) => [id, name]));
const MOVE = {
  ...own('star', 'starShoot'), ...own('shooting_star', 'swift payDay'), ...own('swords', 'swordsDance'),
  ...own('charge_up', 'dragonDance charge acupressure cosmicPower'), ...own('counter', 'counter focusEnergy bide endure'),
  ...own('bell', 'healBell'), ...own('sing', 'sing'), ...own('scary', 'scaryFace'), ...own('confusion', 'confusion confuseRay'), ...own('detect', 'detect lockOn'),
  ...own('reflect', 'protect reflect lightScreen barrier auroraVeil substitute safeguard'), ...own('iron_defense', 'ironDefense kingsShield cottonGuard defendOrder iceArmor'),
  ...own('explosion_big', 'explosion'), ...own('double_burst', 'fireBlast'), ...own('blast_burn', 'blastBurn'), ...own('charge_fire', 'overheat eruption'),
  ...own('fireball', 'ember flameBurst'), ...own('fire', 'flamethrower fireSpin incinerate lavaPlume'), ...own('burned', 'willOWisp'), ...own('blaze_kick', 'firePunch blazeKick flareBlitz'),
  ...own('swipe', 'furySwipes furyCutter'), ...own('triple', 'dualChop closeCombat pinMissile'),
  ...own('cut', 'slash nightSlash cut xScissor crossPoison leafBlade razorShell psychoCut punishment'), ...own('sharp', 'shadowClaw dragonClaw metalClaw'),
  ...own('beam_heavy', 'hyperBeam solarBeam'), ...own('signal_beam', 'signalBeam psybeam chargeBeam flashCannon'), ...own('tri_attack', 'triAttack'),
  ...own('warble', 'hyperVoice uproar'), ...own('bug_buzz', 'bugBuzz snarl snore roar'), ...own('claps', 'helpingHand luckyChant'),
  ...own('smack', 'seismicToss circleThrow hammerArm'), ...own('crabhammer', 'crabhammer'),
  ...own('splash', 'surf waterfall hydroPump'), ...own('rain', 'rainDance'),
  ...own('wing', 'airSlash aerialAce steelWing braveBird fly acrobatics roost'), ...own('power_down', 'featherDance haze'), ...own('wind', 'gust'), ...own('wind_long', 'whirlwind hurricane tailwind razorWind'),
  ...own('seed', 'bulletSeed leechSeed seedBomb poisonSting'), ...own('vine', 'vineWhip powerWhip grassKnot ingrain stringShot'), ...own('vine_wall', 'spiderWeb stickyWeb electroweb'),
  ...own('shineshine', 'flash dazzlingGleam moonlight wish moonblast'), ...own('notes', 'metronome copycat attract sleepTalk'), ...own('belly_drum', 'bellyDrum'),
  ...own('denied', 'disable taunt torment'), ...own('ice_shot', 'iceShard powderSnow auroraBeam'), ...own('ice', 'icicleCrash avalanche'),
  ...own('heal_move', 'healPulse softBoiled lifeDew aromatherapy healOrder rest aquaRing'), ...own('status_bad', 'stunSpore sleepPowder poisonPowder yawn'),
  ...own('dash', 'doubleTeam batonPass'), ...own('whoosh', 'smokescreen'),
};
// by type: anything that is thrown, lands on a spot or bursts around the user
const TYPE = {
  fire: 'fire', water: 'water', ice: 'ice_shot', rock: 'rock', ground: 'rock', steel: 'metal', flying: 'wind', electric: 'thunder', fairy: 'shineshine', psychic: 'shimmer',
  grass: 'leaf', poison: 'status_bad', dark: 'low_negative', ghost: 'low_negative', dragon: 'charge_fire', bug: 'bug_buzz', fighting: 'blunt',
};
// by type: a blow struck up close
const MELEE = {
  fire: 'blaze_kick', steel: 'sharp', flying: 'wing', fighting: 'blunt_light', normal: 'blunt_light', dark: 'cut', bug: 'cut', ghost: 'sharp', dragon: 'sharp',
  grass: 'cut', water: 'splash', poison: 'cut',
};
function moveSound(mv) {
  if (MOVE[mv.id]) return MOVE[mv.id];
  const type = typeOf(mv.id);
  if (mv.kind === 'beam') return 'beam';
  if (mv.kind === 'self') return mv.buff ? 'power_up' : TYPE[type] ?? 'power_up';
  if (mv.tag === 'curse') return 'low_negative';
  if (mv.kind === 'melee') return mv.tag === 'heavy' ? 'blunt' : mv.tag === 'grab' ? 'grab' : MELEE[type] ?? TYPE[type] ?? 'blunt_light';
  if (mv.kind === 'dash' || mv.kind === 'blink') return 'dash';
  if (type === 'fire' && (mv.kind === 'aoe' || mv.kind === 'mid')) return 'flare';
  if (mv.debuff && !mv.dmg) return 'power_down';
  return TYPE[type] ?? 'whoosh';
}

const SAVE_KEY = 'pmd-sfx-v1';
const prefs = { volume: 0.6, muted: false };
try { Object.assign(prefs, JSON.parse(localStorage.getItem(SAVE_KEY)) ?? {}); } catch { /* no storage: the defaults */ }

let out = null; // every effect goes through this
const buffers = new Map(); // file -> decoded, or a promise of it
const last = new Map(); // name -> when it last played (the same sound does not pile up on itself)
const GAP = 0.07;

function bus(ctx) {
  if (!out) { out = ctx.createGain(); out.gain.value = prefs.muted ? 0 : prefs.volume; out.connect(ctx.destination); }
  return out;
}

async function load(ctx, file) {
  if (!buffers.has(file)) {
    buffers.set(file, (async () => {
      const get = urls[`../../Sound Effects/${file}.mp3`];
      if (!get) return null;
      const data = await (await fetch(await get())).arrayBuffer();
      return new Promise((ok) => { const p = ctx.decodeAudioData(data, ok, () => ok(null)); p?.catch?.(() => ok(null)); });
    })().then((b) => { buffers.set(file, b); return b; }));
  }
  return buffers.get(file);
}

export const sfx = {
  // Play a sound by its name in SOUNDS. volume and rate (pitch and speed) are multipliers.
  async play(name, { volume = 1, rate = 1 } = {}) {
    const def = SOUNDS[name], ctx = audioContext();
    if (!def || !ctx || ctx.state !== 'running' || prefs.muted) return;
    if (ctx.currentTime - (last.get(name) ?? -1) < GAP) return;
    last.set(name, ctx.currentTime);
    const [files, level] = def, file = Array.isArray(files) ? files[Math.floor(Math.random() * files.length)] : files;
    const buffer = await load(ctx, file);
    if (!buffer) return;
    const src = ctx.createBufferSource(), gain = ctx.createGain();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    gain.gain.value = level * volume;
    src.connect(gain).connect(bus(ctx));
    src.start();
  },
  mute(on) {
    prefs.muted = on;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(prefs)); } catch { /* play on */ }
    if (out) out.gain.value = on ? 0 : prefs.volume;
  },
  get muted() { return prefs.muted; },
};

// What the engine says happened -> what is heard.
const HEARD = {
  move: ({ mv }) => { const name = moveSound(mv); if (name) sfx.play(name); },
  hit: ({ heavy, soft }) => sfx.play(soft ? 'hit_light' : heavy ? 'hit_heavy' : 'hit', soft ? {} : { rate: 0.94 + Math.random() * 0.12 }),
  jump: () => sfx.play('jump'),
  rebound: () => sfx.play('dash'), // U-turn springing back off what it hit: the sound Bounce makes
  parry: () => sfx.play('parry'),
  clash: () => sfx.play('clash'),
  crit: () => sfx.play('sharp', { volume: 1.3 }),
  shatter: () => sfx.play('shatter'),
  faint: () => sfx.play('faint'),
  heal: () => sfx.play('heal'),
  break: ({ ice }) => sfx.play(ice ? 'break_ice' : 'break_rock'),
};
export function wireSfx(game) {
  game.events.on('sfx', (what, info = {}) => HEARD[what]?.(info));
}
if (import.meta.env.DEV) window.sfx = Object.assign(sfx, { SOUNDS, moveSound });
