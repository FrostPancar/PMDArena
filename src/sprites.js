import Phaser from 'phaser';
import { EVOLUTIONS } from './evolutions.js';

// Every folder under sprites/ holding a PMD Collab pack (AnimData.xml + sheets) becomes a playable character.
// Packs under evolutions/ are the evolved forms those characters can come to wear (see evolutions.js): they are in
// SPECIES too, marked `form`, but are not on the roster and their sheets are only loaded when one is needed.
const xmls = import.meta.glob('../sprites/*/AnimData.xml', { eager: true, query: '?raw', import: 'default' });
const urls = import.meta.glob(['../sprites/*/*.png', '../evolutions/*/*.png'], { eager: true, query: '?url', import: 'default' });
const formXmls = import.meta.glob('../evolutions/*/AnimData.xml', { eager: true, query: '?raw', import: 'default' });

const TYPES = {
  chikorita: 'grass', bulbasaur: 'grass', treecko: 'grass', charmander: 'fire', torchic: 'fire',
  squirtle: 'water', mudkip: 'water', ralts: 'psychic', eevee: 'normal',
  axew: 'dragon', zorua: 'dark', starly: 'flying', corphish: 'water', cubone: 'ground', nidoran: 'poison', aron: 'steel', venipede: 'bug', rotom: 'electric', riolu: 'fighting',
  combee: 'bug', clefairy: 'fairy', rhyhorn: 'rock', scyther: 'bug', joltik: 'electric', skarmory: 'steel',
  cacnea: 'grass', alolanvulpix: 'ice', heracross: 'bug', porygon: 'normal',
  phantump: 'ghost', munchlax: 'normal', staryu: 'water', honedge: 'steel', torkoal: 'fire', hawlucha: 'fighting',
};
// Evolutions that are not their species' type: Eevee's, one of which each Eevee takes.
// ...and Cubone's Alolan Marowak, the other of the two forms a Cubone chooses between.
const FORM_TYPES = { alolanmarowak: 'fire', vaporeon: 'water', jolteon: 'electric', flareon: 'fire', espeon: 'psychic', umbreon: 'dark', leafeon: 'grass', glaceon: 'ice', sylveon: 'fairy' };
// Names that are not just the folder name capitalised
const NAMES = { alolanvulpix: 'Alolan Vulpix', alolanninetales: 'Alolan Ninetales', alolanmarowak: 'Alolan Marowak', porygon2: 'Porygon2', porygonz: 'Porygon-Z' };
const ORDER = ['bulbasaur', 'charmander', 'squirtle', 'chikorita', 'treecko', 'torchic', 'mudkip', 'ralts', 'eevee', 'axew', 'zorua', 'starly', 'corphish', 'cubone', 'nidoran', 'aron', 'venipede', 'rotom', 'riolu', 'combee', 'clefairy', 'rhyhorn', 'scyther', 'joltik', 'skarmory', 'cacnea', 'alolanvulpix', 'heracross', 'porygon', 'phantump', 'munchlax', 'staryu', 'honedge', 'torkoal', 'hawlucha'];
// The animation a mon swings with for a close-range move, where it is not the usual Attack: the first of these its
// sprite pack has (a blade slices; Aegislash's pack has no Slice, so it swings; Hawlucha kicks).
const MELEE_ANIM = { hawlucha: ['Kick'], honedge: ['Slice', 'Swing'], doublade: ['Slice', 'Swing'], aegislash: ['Slice', 'Swing'] };

// id -> { id, name, type, shadowSize, foot, anims: { name -> { sheet, key, fw, fh, durs[], rush, hit, ret, cols, rows } } }
export const SPECIES = {};

function parse(id, xml, dir = 'sprites') {
  const url = (file) => urls[`../${dir}/${id}/${file}`];
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const num = (el, tag) => {
    const n = el.querySelector(`:scope > ${tag}`);
    return n ? +n.textContent : undefined;
  };
  const anims = {};
  const copies = [];
  for (const el of doc.querySelectorAll('Anims > Anim')) {
    const name = el.querySelector(':scope > Name').textContent;
    const copyOf = el.querySelector(':scope > CopyOf')?.textContent;
    if (copyOf) { copies.push([name, copyOf]); continue; }
    if (!url(`${name}-Anim.png`)) continue;
    const durs = [...el.querySelectorAll('Durations > Duration')].map((d) => +d.textContent);
    anims[name] = {
      sheet: name, key: `${id}-${name}`, fw: num(el, 'FrameWidth'), fh: num(el, 'FrameHeight'), durs,
      rush: num(el, 'RushFrame'), hit: num(el, 'HitFrame'), ret: num(el, 'ReturnFrame'),
      cols: durs.length, rows: 8,
      animUrl: url(`${name}-Anim.png`), shadowUrl: url(`${name}-Shadow.png`),
    };
  }
  for (const [name, src] of copies) if (anims[src]) anims[name] = anims[src];
  if (!anims.Idle || !anims.Walk) return null;
  return {
    id, name: NAMES[id] ?? id[0].toUpperCase() + id.slice(1), type: TYPES[id] ?? 'normal',
    shadowSize: +(doc.querySelector('ShadowSize')?.textContent ?? 1), foot: 4, anims,
    meleeAnim: (MELEE_ANIM[id] ?? []).find((name) => anims[name]) ?? 'Attack',
  };
}

const ids = Object.keys(xmls).map((p) => p.split('/')[2]);
ids.sort((a, b) => ((ORDER.indexOf(a) + 99) % 99) - ((ORDER.indexOf(b) + 99) % 99) || a.localeCompare(b));
for (const id of ids) {
  const s = parse(id, xmls[`../sprites/${id}/AnimData.xml`]);
  if (s) SPECIES[id] = s;
}
export const SPECIES_ORDER = Object.keys(SPECIES);

// evolved forms take the type of the species they belong to (bar Eevee's)
for (const [base, forms] of Object.entries(EVOLUTIONS))
  for (const id of forms) {
    const xml = formXmls[`../evolutions/${id}/AnimData.xml`];
    const s = SPECIES[base] && xml ? parse(id, xml, 'evolutions') : null;
    if (s) SPECIES[id] = { ...s, type: FORM_TYPES[id] ?? SPECIES[base].type, form: true, base };
  }

const sheets = (s) => [...new Set(Object.values(s.anims))];

// Queue the sheets of these species for loading (those not loaded yet). Call from a scene's preload,
// or follow with scene.load.start() anywhere else.
export function loadSpecies(scene, ids) {
  for (const id of ids)
    for (const a of sheets(SPECIES[id])) {
      if (scene.textures.exists(`a-${a.key}`) || scene.textures.exists(`s-${a.key}`)) continue;
      scene.load.spritesheet(`a-${a.key}`, a.animUrl, { frameWidth: a.fw, frameHeight: a.fh });
      scene.load.image(`sraw-${a.key}`, a.shadowUrl);
    }
}

// Queue just the standing sheet of these species: enough to show each one still (the grid of the choosing screen).
// Follow with finalizeSpecies once loaded; the rest of a species' sheets come later through ensureSpecies.
export function loadIdle(scene, ids) {
  for (const id of ids) {
    const a = SPECIES[id].anims.Idle;
    if (scene.textures.exists(`a-${a.key}`) || scene.textures.exists(`s-${a.key}`)) continue;
    scene.load.spritesheet(`a-${a.key}`, a.animUrl, { frameWidth: a.fw, frameHeight: a.fh });
    scene.load.image(`sraw-${a.key}`, a.shadowUrl);
  }
}

export function preloadSprites(scene) {
  loadSpecies(scene, SPECIES_ORDER);
}

// Is this species drawable yet? Once its sheets are in, this finishes them (see finalizeSpecies) and says yes.
// Until then it says no, having started the load the first time it was asked: callers simply ask again next frame.
const requested = new Map(); // species id -> the scene that sent for it
export function ensureSpecies(scene, id) {
  const all = sheets(SPECIES[id]);
  if (all.every((a) => scene.textures.exists(`s-${a.key}`))) return true;
  // (a sheet may be finished already: the standing one, loaded early for the choosing screen)
  if (all.every((a) => scene.textures.exists(`s-${a.key}`) || (scene.textures.exists(`sraw-${a.key}`) && scene.textures.exists(`a-${a.key}`)))) {
    finalizeSpecies(scene, SPECIES[id]);
    return true;
  }
  // (sent for again if the scene that asked first has gone, or its loader has stopped, before the sheets came in)
  const by = requested.get(id);
  if (!by || by !== scene || !scene.load.isLoading()) {
    requested.set(id, scene);
    loadSpecies(scene, [id]);
    scene.load.start();
  }
  return false;
}

// Shadow sheets encode three nested shadow sizes: white+green (small), +red (medium), +blue (large).
// The single white pixel is the shadow centre, i.e. where the feet are.
// (only those whose sheets are in: the player client loads a species when it is first needed)
export function finalizeSprites(scene) {
  for (const id of SPECIES_ORDER) if (sheets(SPECIES[id]).every((a) => scene.textures.exists(`sraw-${a.key}`))) finalizeSpecies(scene, SPECIES[id]);
}

export function finalizeSpecies(scene, s) {
  for (const a of sheets(s)) {
    if (scene.textures.exists(`s-${a.key}`) || !scene.textures.exists(`sraw-${a.key}`)) continue; // done, or not loaded yet
    const src = scene.textures.get(`sraw-${a.key}`).getSourceImage();
    a.rows = Math.max(1, Math.round(src.height / a.fh));
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(src, 0, 0);
    const id = ctx.getImageData(0, 0, c.width, c.height);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i] > 127, g = d[i + 1] > 127, b = d[i + 2] > 127;
      const white = r && g && b && d[i + 3] > 0;
      if (white && a.sheet === 'Idle') {
        const px = (i / 4) % c.width, py = Math.floor(i / 4 / c.width);
        if (px < a.fw && py < a.fh) s.foot = py - a.fh / 2;
      }
      const keep = d[i + 3] > 0 && (white || (g && !r) || (r && !g && s.shadowSize >= 1) || (b && !r && !g && s.shadowSize >= 2));
      d[i] = d[i + 1] = d[i + 2] = 0;
      d[i + 3] = keep ? 255 : 0;
    }
    ctx.putImageData(id, 0, 0);
    const tex = scene.textures.addCanvas(`s-${a.key}`, c);
    for (let r = 0; r < a.rows; r++)
      for (let col = 0; col < a.cols; col++) tex.add(r * a.cols + col, 0, col * a.fw, r * a.fh, a.fw, a.fh);
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    scene.textures.remove(`sraw-${a.key}`);
  }
}
