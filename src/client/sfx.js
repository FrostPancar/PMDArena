import { audioContext } from './music.js';
import { typeOf } from './moveinfo.js';

// Sound effects. The engine (scene.js, mon.js) knows nothing of sound: it emits 'sfx' on the game's events when
// something worth hearing happens (a move goes off, a hit lands, a jump...), and wireSfx turns that into a sound here.
// The files are in "Sound Effects/" (named and sorted with sounds.html); only the ones listed in SOUNDS are bundled.
// This is a first pass: a handful of events and moves, to hear how it sits.
// (every file a sound in SOUNDS names has to be in this list: the folder holds some 480, and only these are shipped)
const urls = import.meta.glob([
  '../../Sound Effects/beep.mp3', '../../Sound Effects/bubbles1.mp3', '../../Sound Effects/bubbles2.mp3', '../../Sound Effects/chime.mp3',
  '../../Sound Effects/exit.mp3', '../../Sound Effects/explosive_echo.mp3', '../../Sound Effects/song344.mp3', '../../Sound Effects/song404.mp3',
  '../../Sound Effects/song470.mp3', '../../Sound Effects/song479.mp3', '../../Sound Effects/song482.mp3', '../../Sound Effects/song498.mp3',
  '../../Sound Effects/song508.mp3', '../../Sound Effects/song509.mp3', '../../Sound Effects/song616.mp3', '../../Sound Effects/song620.mp3',
  '../../Sound Effects/song629.mp3', '../../Sound Effects/song641.mp3', '../../Sound Effects/song648.mp3', '../../Sound Effects/song651.mp3',
  '../../Sound Effects/song652.mp3', '../../Sound Effects/song653.mp3', '../../Sound Effects/song655.mp3', '../../Sound Effects/song662.mp3',
  '../../Sound Effects/song669.mp3', '../../Sound Effects/song671.mp3', '../../Sound Effects/song675.mp3', '../../Sound Effects/song678.mp3',
  '../../Sound Effects/song682.mp3', '../../Sound Effects/song688.mp3', '../../Sound Effects/song689.mp3', '../../Sound Effects/song711.mp3',
  '../../Sound Effects/song715.mp3', '../../Sound Effects/song716.mp3', '../../Sound Effects/song772.mp3', '../../Sound Effects/song787.mp3',
  '../../Sound Effects/song808.mp3', '../../Sound Effects/song828.mp3', '../../Sound Effects/song882.mp3', '../../Sound Effects/song899.mp3',
  '../../Sound Effects/song901.mp3', '../../Sound Effects/song910.mp3', '../../Sound Effects/song915.mp3', '../../Sound Effects/song935.mp3',
  '../../Sound Effects/splash.mp3', '../../Sound Effects/take_hit.mp3', '../../Sound Effects/take_hit_heavy.mp3', '../../Sound Effects/thunder.mp3',
  '../../Sound Effects/wind_short.mp3',
], { eager: false, query: '?url', import: 'default' });

// name -> file (without .mp3), and how loud against the rest. A list of files: one is picked at random each time.
const SOUNDS = {
  ui_move: ['beep', 0.5], ui_pick: ['chime', 0.5], ui_back: ['exit', 0.5],
  jump: ['song901', 0.5], hit: [['song652', 'song653', 'song655', 'song662'], 0.7], hit_light: ['take_hit', 0.35], hit_heavy: ['take_hit_heavy', 0.9],
  parry: ['song509', 0.8], clash: ['song715', 0.9], shatter: ['song675', 0.6], faint: ['song915', 0.8], heal: ['song899', 0.6],
  break_rock: ['song682', 0.8], break_ice: ['song828', 0.8],
  swing: ['wind_short', 0.45], swipe: ['song689', 0.6], grab: ['song344', 0.7], windup: ['song651', 0.6],
  beam: ['song404', 0.6], beam_heavy: ['song508', 0.8], explosion: ['song787', 0.9], explosion_big: ['explosive_echo', 1], double_burst: ['song498', 0.8],
  fire: ['song716', 0.6], flare: [['song669', 'song671'], 0.6], ice: ['song828', 0.6], rock: ['song641', 0.7], metal: ['song935', 0.6],
  wind: ['song678', 0.6], wind_blade: ['song688', 0.6], water: [['bubbles1', 'bubbles2'], 0.6], splash: ['splash', 0.7], thunder: ['thunder', 0.7],
  star: ['song470', 0.6], shooting_star: ['song910', 0.6], shimmer: ['song899', 0.5],
  power_up: ['song882', 0.6], swords: ['song479', 0.7], status_down: ['song711', 0.6], scary: ['song772', 0.7], confusion: ['song808', 0.6],
  detect: ['song620', 0.7], bell: ['song482', 0.7], sing: ['song648', 0.7], claps: ['song629', 0.7], warble: ['song616', 0.7],
};

// A move's sound: its own if it is listed here, else by what it does, else by its type.
const MOVE = {
  starShoot: 'star', swift: 'shooting_star', swordsDance: 'swords', healBell: 'bell', sing: 'sing', scaryFace: 'scary', confusion: 'confusion', confuseRay: 'confusion',
  detect: 'detect', protect: 'detect', explosion: 'explosion_big', fireBlast: 'double_burst', furySwipes: 'swipe', furyCutter: 'swipe', dualChop: 'swipe',
  slash: 'swipe', nightSlash: 'swipe', cut: 'swipe', hyperBeam: 'beam_heavy', solarBeam: 'beam_heavy', hyperVoice: 'warble', uproar: 'warble', helpingHand: 'claps',
  seismicToss: 'grab', circleThrow: 'grab', surf: 'splash', waterfall: 'splash', hydroPump: 'splash', airSlash: 'wind_blade', aerialAce: 'wind_blade',
};
const TYPE = { fire: 'fire', water: 'water', ice: 'ice', rock: 'rock', ground: 'rock', steel: 'metal', flying: 'wind', electric: 'thunder', fairy: 'shimmer', psychic: 'shimmer' };
function moveSound(mv) {
  if (MOVE[mv.id]) return MOVE[mv.id];
  if (mv.kind === 'beam') return 'beam';
  const type = TYPE[typeOf(mv.id)];
  if (mv.kind === 'self') return mv.buff ? 'power_up' : mv.heal ? 'heal' : type ?? null;
  if (type === 'fire' && (mv.kind === 'aoe' || mv.kind === 'mid')) return 'flare';
  if (mv.kind === 'melee' || mv.kind === 'dash') return mv.tag === 'heavy' ? 'windup' : type ?? 'swing';
  if (mv.debuff && !mv.dmg) return 'status_down';
  return type ?? null;
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
  parry: () => sfx.play('parry'),
  clash: () => sfx.play('clash'),
  shatter: () => sfx.play('shatter'),
  faint: () => sfx.play('faint'),
  heal: () => sfx.play('heal'),
  break: ({ ice }) => sfx.play(ice ? 'break_ice' : 'break_rock'),
};
export function wireSfx(game) {
  game.events.on('sfx', (what, info = {}) => HEARD[what]?.(info));
}
if (import.meta.env.DEV) window.sfx = Object.assign(sfx, { SOUNDS, moveSound });
