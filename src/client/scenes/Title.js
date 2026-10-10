import Phaser from 'phaser';
import { VIEW_W, loadStages } from '../../scene.js';
import { SPECIES, SPECIES_ORDER } from '../../sprites.js';
import { movesOf } from '../../moves.js';
import { Mon } from '../../mon.js';
import { PLACE } from '../art.js';
import { Actions } from '../input.js';
import { go, wipe } from '../transition.js';
import { session, saveSession } from '../session.js';
import { cap } from '../moveinfo.js';
import { DEPTH, INK, Group, Hints, text, icon, typeIcon, panel } from '../ui.js';

export const GAME_TITLE = 'PMD', GAME_TAGLINE = 'Dojo Battles';

const COLS = 5, CELL_W = 24, CELL_H = 24;
const GRID_X = 250, GRID_Y = 6, GRID_W = COLS * CELL_W + 8;
const STAND = [212, 178]; // where the chosen mon waits on the bluff
const SELECT_SCROLL = 58; // how far the camera drops from the title view to the select view

// Start screen on Sharpedo Bluff. Two states on one backdrop: the title, then the roster.
export class Title extends Phaser.Scene {
  constructor() { super('title'); }

  init(data) { this.openOnSelect = !!data?.select; }

  create() {
    this.walkable = () => true; // Mon asks its scene where it may stand
    const cam = this.cameras.main;
    cam.setBounds(0, 0, 457, 304).setRoundPixels(true).setScroll(0, 0);
    this.add.image(0, 0, 'bluff').setOrigin(0);
    for (const key of ['bluff-sea', 'bluff-flag']) this.add.sprite(PLACE[key].x, PLACE[key].y, key).setOrigin(0).play(key);

    this.index = Math.max(0, SPECIES_ORDER.indexOf(session.species));
    this.mon = new Mon(this, ...STAND, { team: 'p', species: SPECIES_ORDER[this.index] });

    this.actions = new Actions(this);
    this.hints = new Hints(this, this.actions);
    this.buildTitle();
    this.buildSelect();
    this.picked = false;
    if (this.openOnSelect) this.toSelect(true);
    else this.toTitle(true);
    this.fetchStages();
  }

  // The move effects and stages load here, behind the title. The dojo needs them, so leaving waits for the last of them.
  fetchStages() {
    if (this.registry.get('stagesLoaded')) return;
    const note = text(this, VIEW_W - 5, 4, '', INK.dim).setOrigin(1, 0);
    this.load.maxParallelDownloads = 96; // downloads are only started once a frame
    loadStages(this);
    this.load.on('progress', (v) => note.setText(`Loading ${Math.floor(v * 100)}%`));
    this.load.once('complete', () => {
      this.registry.set('stagesLoaded', true);
      note.destroy();
      this.events.emit('stages');
    });
    this.load.start();
  }

  // Mon reports its action frames to the scene; nothing fights here.
  actionFrame() {}
  actionDone() {}

  buildTitle() {
    const g = this.titleUi = new Group();
    g.add(text(this, 98, 8, GAME_TITLE, INK.gold).setOrigin(0.5, 0).setScale(4));
    g.add(text(this, 98, 54, GAME_TAGLINE).setOrigin(0.5, 0).setScale(2));
    // the prompt sits over the sea, clear of the mon on the cliff
    const y = 150;
    this.prompt = [g.add(panel(this, 98 - 54, y - 5, 108, 22, 'dim')), g.add(icon(this, 98 - 32, y + 6, 'start')), g.add(text(this, 98 - 16, y, 'Press Enter'))];
    this.tweens.add({ targets: this.prompt.slice(1), alpha: 0.25, duration: 520, yoyo: true, repeat: -1 });
    this.titleKeys = {
      confirm: () => this.toSelect(), menu: () => this.toSelect(),
    };
    this.input.on('pointerdown', () => { if (this.state === 'title' && !wipe.busy) this.toSelect(); });
  }

  buildSelect() {
    const g = this.selectUi = new Group();
    const rows = Math.ceil(SPECIES_ORDER.length / COLS), gridH = 22 + rows * CELL_H;
    g.add(panel(this, GRID_X, GRID_Y, GRID_W, gridH));
    g.add(text(this, GRID_X + GRID_W / 2, GRID_Y + 5, 'Choose your Pokémon', INK.gold).setOrigin(0.5, 0));
    this.cursor = g.add(panel(this, 0, 0, CELL_W, CELL_H, 'hot').setDepth(DEPTH + 1));
    this.cells = SPECIES_ORDER.map((id, i) => {
      const sp = SPECIES[id], x = GRID_X + 4 + (i % COLS) * CELL_W, y = GRID_Y + 18 + Math.floor(i / COLS) * CELL_H;
      const img = g.add(this.add.sprite(x + CELL_W / 2, y + CELL_H - 5 - sp.foot, `a-${sp.anims.Idle.key}`, 0).setScrollFactor(0).setDepth(DEPTH + 2));
      const zone = g.add(this.add.zone(x, y, CELL_W, CELL_H).setOrigin(0).setScrollFactor(0).setDepth(DEPTH + 3)).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => this.state === 'select' && this.select(i));
      zone.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); if (this.state === 'select') { this.select(i); this.pick(); } });
      return { id, x, y, img, restY: img.y };
    });

    // name plate under the grid
    const py = GRID_Y + gridH + 2;
    g.add(panel(this, GRID_X, py, GRID_W, 34));
    this.plateType = g.add(typeIcon(this, GRID_X + 14, py + 11, 'normal'));
    this.plateName = g.add(text(this, GRID_X + 25, py + 5, '', INK.gold));
    this.plateInfo = g.add(text(this, GRID_X + 8, py + 19, '', INK.dim));

    // previous / next arrows either side of the mon on the bluff
    const ax = STAND[0], ay = STAND[1] - SELECT_SCROLL - 10;
    this.arrows = [['pageL', -30, -1], ['pageR', 30, 1]].map(([name, dx, step]) => {
      const a = g.add(icon(this, ax + dx, ay, name)).setInteractive({ useHandCursor: true });
      a.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); if (this.state === 'select') this.step(step, 0); });
      this.tweens.add({ targets: a, x: ax + dx + Math.sign(dx) * 2, duration: 420, yoyo: true, repeat: -1 });
      return a;
    });

    this.selectKeys = {
      up: () => this.step(0, -1), down: () => this.step(0, 1), left: () => this.step(-1, 0), right: () => this.step(1, 0),
      confirm: () => this.pick(), cancel: () => this.toTitle(),
    };
  }

  toTitle(instant = false) {
    this.state = 'title';
    this.actions.pop(this.selectKeys);
    this.actions.push(this.titleKeys);
    this.selectUi.setVisible(false);
    this.titleUi.setVisible(true);
    this.hints.setVisible(false);
    this.pan(0, instant);
  }

  toSelect(instant = false) {
    if (this.state === 'select') return;
    this.state = 'select';
    this.actions.pop(this.titleKeys);
    this.actions.push(this.selectKeys);
    this.titleUi.setVisible(false);
    this.pan(SELECT_SCROLL, instant, () => {
      if (this.state !== 'select') return;
      this.selectUi.setVisible(true);
      this.hints.setVisible(true);
      this.hints.set([
        { icon: 'dpad', key: 'WASD', label: 'Browse' },
        { icon: 'btnA', key: 'Enter', label: 'Choose', action: 'confirm' },
        { icon: 'btnB', key: 'Esc', label: 'Back', action: 'cancel' },
      ]);
      this.select(this.index, true);
    });
  }

  pan(scrollY, instant, done) {
    this.tweens.killTweensOf(this.cameras.main);
    if (instant) { this.cameras.main.setScroll(0, scrollY); return done?.(); }
    this.tweens.add({ targets: this.cameras.main, scrollY, duration: 420, ease: 'Sine.easeInOut', onComplete: done });
  }

  step(dx, dy) {
    if (this.picked) return;
    const n = SPECIES_ORDER.length, rows = Math.ceil(n / COLS), col = this.index % COLS;
    // sideways runs on through the rows, so left / right alone reaches everyone
    if (dx) return this.select((this.index + dx + n) % n);
    let row = Math.floor(this.index / COLS);
    do row = (row + dy + rows) % rows; while (row * COLS + col >= n);
    this.select(row * COLS + col);
  }

  select(i, quiet = false) {
    if (this.picked || (i === this.index && !quiet)) return;
    const old = this.cells[this.index], cell = this.cells[i];
    this.tweens.killTweensOf(old.img);
    old.img.y = old.restY;
    this.index = i;
    this.cursor.setPosition(cell.x, cell.y);
    this.tweens.add({ targets: cell.img, y: cell.restY - 2, duration: 260, yoyo: true, repeat: -1 });
    const sp = SPECIES[cell.id];
    this.plateType.setTexture('art-types', sp.type);
    this.plateName.setText(sp.name);
    this.plateInfo.setText(`${cap(sp.type)} type · ${movesOf(cell.id).length} moves`);
    this.mon.setSpecies(cell.id);
    this.mon.dir = 0;
  }

  pick() {
    if (this.picked || this.state !== 'select') return;
    this.picked = true;
    session.species = SPECIES_ORDER[this.index];
    saveSession();
    const cheer = ['Pose', 'Hop'].find((a) => this.mon.species.anims[a]);
    if (cheer) this.mon.act(cheer);
    const enter = () => go(this, 'hub', { area: 'dojo', entry: 'door' });
    this.time.delayedCall(520, () => {
      if (this.registry.get('stagesLoaded')) return enter();
      this.plateInfo.setText('Getting the dojo ready...');
      this.events.once('stages', enter);
    });
  }

  update(_, ms) {
    this.mon.update(Math.min(ms, 50) / 1000);
  }
}
