import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from '../scene.js';
import { ClientBoot } from './scenes/Boot.js';
import { Title } from './scenes/Title.js';
import { Hub } from './scenes/Hub.js';
import { Battle } from './scenes/Battle.js';
import { Wipe } from './transition.js';

// The player client: title on Sharpedo Bluff -> Marowak Dojo -> the pillar in its basement -> a battle on a random stage.
// Served from game.html; the test client is index.html / src/main.js.
const stage = document.getElementById('stage');
const zoomFor = () => Math.max(1, Math.floor(Math.min(stage.clientWidth / VIEW_W, stage.clientHeight / VIEW_H)));

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: stage,
  width: VIEW_W,
  height: VIEW_H,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#000000',
  scale: { mode: Phaser.Scale.NONE, zoom: zoomFor() },
  scene: [ClientBoot, Title, Hub, Battle, Wipe], // Wipe last: it draws over the others
});
window.addEventListener('resize', () => game.scale.setZoom(zoomFor()));
if (import.meta.env.DEV) window.game = game;
