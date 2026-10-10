import Phaser from 'phaser';
import { Boot, World, Play, KEYS, VIEW_W, VIEW_H } from './scene.js';
import { SPECIES, SPECIES_ORDER } from './sprites.js';
import { MAPS, MAP_ORDER } from './maps.js';
import { MOVES, KIND_LABEL, movesOf } from './moves.js';

const stage = document.getElementById('stage');
const zoomFor = () => Math.max(1, Math.floor(Math.min(stage.clientWidth / VIEW_W, stage.clientHeight / VIEW_H)));

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: stage,
  width: VIEW_W,
  height: VIEW_H,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#0b0e15',
  scale: { mode: Phaser.Scale.NONE, zoom: zoomFor() },
  scene: [Boot, World, Play],
});
window.addEventListener('resize', () => game.scale.setZoom(zoomFor()));
if (import.meta.env.DEV) Object.assign(window, { game, MOVES, movesOf });

// the scene currently on screen (world map or a stage); panel buttons only call what it supports
const play = () => {
  const s = game.scene.getScenes(true)[0];
  return new Proxy({}, { get: (_, k) => (k === 'player' ? s?.player ?? { act() {} } : (...a) => s?.[k]?.(...a)) });
};
const $ = (id) => document.getElementById(id);
// keep keyboard focus on the game when panel buttons are clicked
const button = (parent, html, fn) => {
  const b = document.createElement('button');
  b.innerHTML = html;
  b.addEventListener('mousedown', (e) => e.preventDefault());
  b.addEventListener('click', fn);
  parent.appendChild(b);
  return b;
};

const mapBtns = {};
for (const id of MAP_ORDER) mapBtns[id] = button($('maps'), MAPS[id].name, () => play().goto(id));
$('btn-world').addEventListener('mousedown', (e) => e.preventDefault());
$('btn-world').addEventListener('click', () => play().toWorld());
game.events.on('map', (id, selected) => {
  $('btn-world').classList.toggle('on', id === 'world');
  for (const k in mapBtns) mapBtns[k].classList.toggle('on', k === (selected ?? id));
  $('btn-zones').classList.toggle('on', !!game.registry.get('showZones'));
});
game.events.on('zones', (on) => $('btn-zones').classList.toggle('on', on));

for (const [id, fn] of [['btn-zones', 'toggleZones'], ['btn-rival', 'spawnRival'], ['btn-reset', 'reset']]) {
  $(id).addEventListener('mousedown', (e) => e.preventDefault());
  $(id).addEventListener('click', () => play()[fn]());
}

const keyOf = {};
for (const [code, anim] of Object.entries(KEYS)) keyOf[anim] ??= code.replace('Key', '');

// character picker; the state buttons follow whatever animations the chosen pack has
const charBtns = {};
for (const id of SPECIES_ORDER) {
  const s = SPECIES[id];
  charBtns[id] = button($('chars'), `${s.name} <kbd>${s.type}</kbd>`, () => play().setCharacter(id));
}
game.events.on('character', (id) => {
  for (const k in charBtns) charBtns[k].classList.toggle('on', k === id);
  $('anims').replaceChildren();
  for (const name of Object.keys(SPECIES[id].anims)) {
    button($('anims'), `<span>${name}</span>${keyOf[name] ? `<kbd>${keyOf[name]}</kbd>` : ''}`, () => play().player.act(name));
  }
});

// equippable moves of the current character
game.events.on('moves', (speciesId, equipped) => {
  $('moves').replaceChildren();
  if (!speciesId) return;
  movesOf(speciesId).forEach((id, i) => {
    const mv = MOVES[id];
    const b = button($('moves'), `<span><kbd>${(i + 1) % 10}</kbd> ${mv.name}</span><kbd>${KIND_LABEL[mv.kind]} · ${mv.cost}</kbd>`, () => play().setMove(id));
    b.classList.toggle('on', id === equipped);
  });
});

const stat = $('stat');
const fields = ['map', 'character', 'move', 'buffs', 'state', 'anim', 'frame', 'facing', 'pos', 'pad'];
const cells = {};
for (const f of fields) {
  stat.insertAdjacentHTML('beforeend', `<dt>${f}</dt><dd></dd>`);
  cells[f] = stat.lastElementChild;
}
const hpBar = document.querySelector('#hp i');
const stBar = document.querySelector('#st i');
let last = 0;
game.events.on('hud', (h) => {
  const now = performance.now();
  if (now - last < 80) return;
  last = now;
  cells.map.textContent = h.map;
  cells.character.textContent = h.character;
  cells.move.textContent = h.move;
  cells.buffs.textContent = h.buffs ?? '-';
  cells.state.textContent = h.state + (h.charged ? '  ⚡charged' : '');
  cells.anim.textContent = h.anim;
  cells.frame.textContent = h.frame;
  cells.facing.textContent = h.dir;
  cells.pos.textContent = h.pos;
  cells.pad.textContent = h.pad;
  hpBar.style.width = `${(100 * h.hp) / h.maxHp}%`;
  hpBar.style.background = h.hp / h.maxHp > 0.35 ? 'var(--acc)' : 'var(--warn)';
  stBar.style.width = `${(100 * h.stamina) / h.maxStamina}%`;
  stBar.style.background = h.exhausted ? 'var(--warn)' : 'var(--stam)';
});
