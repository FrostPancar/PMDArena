import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from '../scene.js';

// Screen change in the style of the handheld games: black sweeps in from the left in staggered bands,
// the next screen is set up behind it, then the black sweeps off to the right the same way.
const BANDS = 9, BAND_H = VIEW_H / BANDS, LAG = 14, STEP = 8, SWEEP_MS = 380;

export const wipe = { busy: false };

export class Wipe extends Phaser.Scene {
  constructor() { super('wipe'); }

  create() {
    this.g = this.add.graphics();
    this.draw('reveal', 0); // black until the first screen is ready
  }

  // p runs 0..1. 'cover': black reaches from the left edge to the sweep line; 'reveal': from the sweep line to the right edge.
  draw(mode, p) {
    const g = this.g.clear().fillStyle(0x000000, 1);
    const span = VIEW_W + (BANDS - 1) * LAG + STEP;
    for (let i = 0; i < BANDS; i++) {
      const edge = Phaser.Math.Clamp(Math.floor((p * span - i * LAG) / STEP) * STEP, 0, VIEW_W);
      if (mode === 'cover') g.fillRect(0, i * BAND_H, edge, BAND_H);
      else g.fillRect(edge, i * BAND_H, VIEW_W - edge, BAND_H);
    }
  }

  sweep(mode, done) {
    this.tweens.addCounter({
      from: 0, to: 1, duration: SWEEP_MS,
      onUpdate: (tw) => this.draw(mode, tw.getValue()),
      onComplete: () => { this.draw(mode, 1); done?.(); },
    });
  }
}

// Leave `scene` for the scene `key` behind a wipe.
export function go(scene, key, data) {
  if (wipe.busy) return;
  wipe.busy = true;
  const w = scene.scene.get('wipe');
  w.sweep('cover', () => reveal(scene, key, data));
}

// Start `key` under an already black screen and sweep the black away once it has been built.
export function reveal(scene, key, data) {
  wipe.busy = true;
  const w = scene.scene.get('wipe');
  scene.scene.get(key).events.once('create', () => {
    w.scene.bringToTop();
    w.sweep('reveal', () => { wipe.busy = false; });
  });
  scene.scene.start(key, data);
}
