import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from '../scene.js';
import { ClientBoot } from './scenes/Boot.js';
import { Title } from './scenes/Title.js';
import { Dream } from './scenes/Dream.js';
import { Hub } from './scenes/Hub.js';
import { Battle } from './scenes/Battle.js';
import { Wipe, go, wipe } from './transition.js';
import { net } from './net.js';

// The player client: title on Sharpedo Bluff -> the dream (choose a Pokémon) -> the room inside the bluff (find a
// partner) -> Marowak Dojo (choose moves) -> the pillar in its basement -> a battle on a random stage.
// This is the game (index.html). The developers' test client is playground.html / src/playground.js.
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
  scene: [ClientBoot, Title, Dream, Hub, Battle, Wipe], // Wipe last: it draws over the others
});
window.addEventListener('resize', () => game.scale.setZoom(zoomFor()));
if (import.meta.env.DEV) Object.assign(window, { game, net });

// A match from the relay can arrive whatever the player is doing (their partner may have started it), so it is
// handled here rather than by a screen: whichever screen is up is left for the battle as soon as no wipe is running.
net.connect();
let match = null;
net.on('match', (msg) => { match = msg.battle; });
game.events.on('step', () => {
  if (!match || wipe.busy) return;
  const scene = ['hub', 'dream', 'title', 'battle'].map((key) => game.scene.getScene(key)).find((s) => s.scene.isActive());
  if (!scene) return;
  go(scene, 'battle', { battle: match });
  match = null;
});
