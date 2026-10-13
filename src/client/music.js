import TRACKS from '../../Music/tracks.json';

// The music: one looping track for whichever screen or stage is up, and short jingles played over it.
// The files are Music/<name>.mp3 (made by tools/convert-music.py, which also writes tracks.json: what each track is
// and where it loops). A track is fetched and decoded when it is first wanted, and only the one playing is kept.
// A browser plays nothing until the page has been clicked or a key pressed, so whatever is asked for before that
// starts with the first press. M mutes and unmutes; the choice is remembered.
const urls = import.meta.glob('../../Music/*.mp3', { eager: true, query: '?url', import: 'default' });
const urlOf = (id) => urls[`../../Music/${id}.mp3`];

// Tracks the soundtrack folder does not have yet borrow another's.
const FALLBACK = {
  stage_cavern: 'stage_northern', stage_dragon: 'stage_blaze', stage_relic: 'stage_sacred', stage_stratos: 'stage_steel',
  stage_deepsea: 'stage_bountiful', stage_island: 'stage_enclosed', jingle_win: 'jingle_levelup',
};
const resolve = (id) => (TRACKS[id] && urlOf(id) ? id : TRACKS[FALLBACK[id]] && urlOf(FALLBACK[id]) ? FALLBACK[id] : null);

const SAVE_KEY = 'pmd-audio-v1';
const prefs = { volume: 0.55, muted: false };
try { Object.assign(prefs, JSON.parse(localStorage.getItem(SAVE_KEY)) ?? {}); } catch { /* no storage: the defaults */ }
const keep = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(prefs)); } catch { /* play on */ } };

const FADE = 0.45, DUCK = 0.3;
let ctx = null, master = null, bus = null; // bus: the music alone, turned down while a jingle plays
let wanted = null; // the track that should be playing
let playing = null; // { id, src, gain }
const jingles = new Map(); // id -> decoded (they are a few seconds each)

function context() {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? window.webkitAudioContext;
  if (!AC) return null;
  // the tracks are 32 kHz: a context at that rate holds them decoded in two thirds of the memory. Not on an iPhone
  // or iPad, where a context asked for its own rate can come up silent: there it takes the device's.
  const apple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  try { ctx = apple ? new AC() : new AC({ sampleRate: 32000 }); } catch { ctx = new AC(); }
  // an iPhone with its ringer switched off plays nothing from a web page unless the page says it is playing media
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* older Safari: the ringer switch decides */ }
  master = ctx.createGain();
  master.gain.value = prefs.muted ? 0 : prefs.volume;
  master.connect(ctx.destination);
  bus = ctx.createGain();
  bus.connect(master);
  return ctx;
}

// Tracks fetched and decoded ahead of being asked for (see preload): id -> a promise of the decoded track.
const ahead = new Map();
const decodeWith = (ac, data) => new Promise((ok, fail) => { const p = ac.decodeAudioData(data, ok, fail); p?.catch?.(fail); }); // (old Safari takes callbacks only)

const decode = async (id) => {
  if (ahead.has(id)) {
    const early = await ahead.get(id);
    ahead.delete(id); // (kept only until it is first played: one track in memory at a time)
    if (early) return early;
  }
  return decodeWith(ctx, await (await fetch(urlOf(id))).arrayBuffer());
};

// Fetch and decode a track before anyone has pressed anything, so it starts the instant it may. A browser will not
// run a real audio context until then, but an offline one decodes all the same.
function preload(id) {
  id = resolve(id);
  const OAC = window.OfflineAudioContext ?? window.webkitOfflineAudioContext;
  if (!id || !OAC || ahead.has(id)) return;
  ahead.set(id, (async () => {
    try { return await decodeWith(new OAC(2, 1, 32000), await (await fetch(urlOf(id))).arrayBuffer()); } catch { return null; }
  })());
}
preload('screen_title'); // the first thing anyone hears

function fadeOut(p) {
  if (!p) return;
  const now = ctx.currentTime;
  p.gain.gain.cancelScheduledValues(now);
  p.gain.gain.setValueAtTime(p.gain.gain.value, now);
  p.gain.gain.linearRampToValueAtTime(0, now + FADE);
  try { p.src.stop(now + FADE + 0.05); } catch { /* already stopped */ }
}

async function start(id) {
  if (!context() || ctx.state !== 'running') return; // waits for the first press (see unlock)
  if (playing?.id === id) return;
  fadeOut(playing);
  playing = null;
  if (!id) return;
  let buffer;
  try { buffer = await decode(id); } catch { return; } // a track that will not load is just silence
  if (wanted !== id || playing) return; // something else was asked for meanwhile
  const t = TRACKS[id], src = ctx.createBufferSource(), gain = ctx.createGain();
  src.buffer = buffer;
  src.loop = true;
  if (t.loopEnd > t.loopStart) { src.loopStart = t.loopStart; src.loopEnd = Math.min(t.loopEnd, buffer.duration); }
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.25);
  src.connect(gain).connect(bus);
  src.start();
  playing = { id, src, gain };
}

function unlock() {
  if (!context()) return;
  if (ctx.state !== 'running') ctx.resume().then(() => start(wanted)).catch(() => {});
}
// Heard on the way down to whatever was pressed (capture), not on the way back up: the touch pad keeps its touches
// to itself, so nothing pressed on it would ever arrive here otherwise. Safari on a phone only lets sound start from
// the end of a touch or a click, so those are listened for as well as the press.
for (const type of ['touchend', 'pointerup', 'click', 'pointerdown', 'keydown']) window.addEventListener(type, unlock, { capture: true, passive: true });
// nothing plays on behind a hidden tab
document.addEventListener('visibilitychange', () => { if (ctx) (document.hidden ? ctx.suspend() : ctx.resume()).catch(() => {}); });
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM' && !e.repeat && !/INPUT|TEXTAREA/.test(e.target?.tagName ?? '')) music.mute(!prefs.muted);
});

// The page's one audio context, for the sound effects too (sfx.js); null where the browser has none.
export const audioContext = () => context();

export const music = {
  // The track for this screen from now on (null: silence). Asking for the one already playing changes nothing.
  play(id) {
    wanted = id ? resolve(id) : null;
    start(wanted);
  },
  // As play, but only if there is such a track (the stage's own goes on otherwise).
  swap(id) { if (resolve(id)) this.play(id); },
  stop() { this.play(null); },
  // A short tune played once over the music, which drops back while it lasts.
  async jingle(id) {
    id = resolve(id);
    if (!id || !context() || ctx.state !== 'running') return;
    try { if (!jingles.has(id)) jingles.set(id, await decode(id)); } catch { return; }
    const buffer = jingles.get(id), src = ctx.createBufferSource(), now = ctx.currentTime;
    src.buffer = buffer;
    src.connect(master);
    bus.gain.cancelScheduledValues(now);
    bus.gain.setTargetAtTime(DUCK, now, 0.05);
    bus.gain.setTargetAtTime(1, now + buffer.duration, 0.3);
    src.start();
  },
  mute(on) {
    prefs.muted = on;
    keep();
    if (master) master.gain.setTargetAtTime(on ? 0 : prefs.volume, ctx.currentTime, 0.05);
  },
  get muted() { return prefs.muted; },
  // The track of a stage (or the boss theme against the hardest CPUs).
  stage(mapId, level = 0) { this.play(level >= 5 ? 'fight_boss' : `stage_${mapId}`); },
};
if (import.meta.env.DEV) window.music = Object.assign(music, { debug: () => ({ state: ctx?.state, rate: ctx?.sampleRate, wanted, playing: playing?.id, loop: playing && [playing.src.loopStart, playing.src.loopEnd, +playing.src.buffer.duration.toFixed(2)], volume: master?.gain.value }) });
