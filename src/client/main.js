import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from '../scene.js';
import { ClientBoot } from './scenes/Boot.js';
import { Title } from './scenes/Title.js';
import { Dream } from './scenes/Dream.js';
import { Hub } from './scenes/Hub.js';
import { CrewPick } from './scenes/CrewPick.js';
import { StageDraw } from './scenes/StageDraw.js';
import { Battle } from './scenes/Battle.js';
import { Practice } from './scenes/Practice.js';
import { Wipe, go, wipe } from './transition.js';
import { net } from './net.js';
import { before } from './modes.js';
import { touch, fit, initTouch } from './touch.js';

// The player client: title on Sharpedo Bluff -> the dream (choose a Pokémon) -> the room inside the bluff (find a
// partner) -> Marowak Dojo (choose moves) -> the pillar in its basement -> the world map (players pick stages and
// one is drawn from the picks) -> the battle. A 3v3 crew battle has the crew screen before the world map.
// This is the game (index.html). The developers' test client is playground.html / src/playground.js.
const stage = document.getElementById('stage');
// Whole-number zoom keeps the pixels square on a monitor. A phone has pixels to spare and no room: there the game
// fills the screen (held sideways), and the touch pad is drawn over it at the same scale.
const zoomFor = () => {
  const most = Math.min(stage.clientWidth / VIEW_W, stage.clientHeight / VIEW_H);
  return touch.on ? Math.max(0.5, most) : Math.max(1, Math.floor(most));
};

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: stage,
  width: VIEW_W,
  height: VIEW_H,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#000000',
  scale: { mode: Phaser.Scale.NONE, zoom: zoomFor() },
  scene: [ClientBoot, Title, Dream, Hub, CrewPick, StageDraw, Battle, Practice, Wipe], // Wipe last: it draws over the others
});
const resize = () => {
  const zoom = zoomFor();
  if (zoom !== game.scale.zoom) game.scale.setZoom(zoom);
  fit(zoom);
};
// a phone turned on its side reports its new size a moment after the event
for (const type of ['resize', 'orientationchange']) window.addEventListener(type, () => { resize(); setTimeout(resize, 300); });
window.visualViewport?.addEventListener('resize', resize);
fit(game.scale.zoom);
initTouch(game);
if (import.meta.env.DEV) Object.assign(window, { game, net });

// A match from the relay can arrive whatever the player is doing (their partner may have started it), so it is
// handled here rather than by a screen: whichever screen is up is left for the stage draw (and then the battle) as
// soon as no wipe is running.
net.connect();
let match = null;
net.on('match', (msg) => { match = msg.battle; });
game.events.on('step', () => {
  if (!match || wipe.busy) return;
  const scene = ['hub', 'dream', 'title', 'crew', 'draw', 'battle'].map((key) => game.scene.getScene(key)).find((s) => s.scene.isActive());
  if (!scene) return;
  go(scene, before(match), { battle: match });
  match = null;
});
