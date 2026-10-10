import Phaser from 'phaser';

// Every folder under sprites/ holding a PMD Collab pack (AnimData.xml + sheets) becomes a playable character.
const xmls = import.meta.glob('../sprites/*/AnimData.xml', { eager: true, query: '?raw', import: 'default' });
const urls = import.meta.glob('../sprites/*/*.png', { eager: true, query: '?url', import: 'default' });

const TYPES = {
  chikorita: 'grass', bulbasaur: 'grass', treecko: 'grass', charmander: 'fire', torchic: 'fire',
  squirtle: 'water', mudkip: 'water', ralts: 'psychic', eevee: 'normal',
  axew: 'dragon', zorua: 'dark', starly: 'flying', corphish: 'water', cubone: 'ground', nidoran: 'poison', aron: 'steel', venipede: 'bug', rotom: 'electric', riolu: 'fighting',
  combee: 'bug', clefairy: 'fairy', rhyhorn: 'rock', scyther: 'bug', joltik: 'electric', skarmory: 'steel',
};
const ORDER = ['bulbasaur', 'charmander', 'squirtle', 'chikorita', 'treecko', 'torchic', 'mudkip', 'ralts', 'eevee', 'axew', 'zorua', 'starly', 'corphish', 'cubone', 'nidoran', 'aron', 'venipede', 'rotom', 'riolu', 'combee', 'clefairy', 'rhyhorn', 'scyther', 'joltik', 'skarmory'];

// id -> { id, name, type, shadowSize, foot, anims: { name -> { sheet, key, fw, fh, durs[], rush, hit, ret, cols, rows } } }
export const SPECIES = {};

function parse(id, xml) {
  const url = (file) => urls[`../sprites/${id}/${file}`];
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
    id, name: id[0].toUpperCase() + id.slice(1), type: TYPES[id] ?? 'normal',
    shadowSize: +(doc.querySelector('ShadowSize')?.textContent ?? 1), foot: 4, anims,
  };
}

const ids = Object.keys(xmls).map((p) => p.split('/')[2]);
ids.sort((a, b) => ((ORDER.indexOf(a) + 99) % 99) - ((ORDER.indexOf(b) + 99) % 99) || a.localeCompare(b));
for (const id of ids) {
  const s = parse(id, xmls[`../sprites/${id}/AnimData.xml`]);
  if (s) SPECIES[id] = s;
}
export const SPECIES_ORDER = Object.keys(SPECIES);

const sheets = (s) => [...new Set(Object.values(s.anims))];

export function preloadSprites(scene) {
  for (const s of Object.values(SPECIES))
    for (const a of sheets(s)) {
      scene.load.spritesheet(`a-${a.key}`, a.animUrl, { frameWidth: a.fw, frameHeight: a.fh });
      scene.load.image(`sraw-${a.key}`, a.shadowUrl);
    }
}

// Shadow sheets encode three nested shadow sizes: white+green (small), +red (medium), +blue (large).
// The single white pixel is the shadow centre, i.e. where the feet are.
export function finalizeSprites(scene) {
  for (const s of Object.values(SPECIES))
    for (const a of sheets(s)) {
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
