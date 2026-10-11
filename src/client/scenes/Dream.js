import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from '../../scene.js';
import { SPECIES, SPECIES_ORDER, ensureSpecies } from '../../sprites.js';
import { Mon } from '../../mon.js';
import { DREAM_GLOW } from '../art.js';
import { Actions } from '../input.js';
import { go } from '../transition.js';
import { session, saveSession, formOf, levelOf } from '../session.js';
import { fetchStages, stagesNote, whenStages } from '../stages.js';
import { cap } from '../moveinfo.js';
import { DEPTH, INK, Hints, text, icon, typeIcon, panel } from '../ui.js';

const COLS = 6, CELL_W = 24, CELL_H = 24;
const GRID_X = 228, GRID_Y = 6, GRID_W = COLS * CELL_W + 8;
const STAND = [125, 118]; // where the dreamed-of mon floats
const RANDOM = SPECIES_ORDER.length; // the last cell of the grid is not a Pokémon: a question mark that picks one for you
const BAND_W = 142;

// The dream: wave bands drift down both sides of a soft glow while the player chooses who to be. The same screen
// picks a CPU partner (data.pick === 'partner'). data.from is where backing out leads: 'title' or 'base'.
export class Dream extends Phaser.Scene {
  constructor() { super('dream'); }

  init(data) {
    this.pickFor = data?.pick === 'partner' ? 'partner' : 'self';
    this.from = data?.from === 'base' ? 'base' : 'title';
  }

  create() {
    this.walkable = () => true; // Mon asks its scene where it may stand
    this.add.image(0, 0, 'px').setOrigin(0).setDisplaySize(VIEW_W, VIEW_H).setTint(DREAM_GLOW);
    // the lighter band lies under the darker, narrower one; the right side mirrors the left
    this.bands = ['dream-light', 'dream-dark'].map((key) => [0, 1].map((side) =>
      this.add.tileSprite(side ? VIEW_W - BAND_W : 0, 0, BAND_W, VIEW_H, key).setOrigin(0).setFlipX(!!side)));

    const current = this.pickFor === 'partner' ? session.partner : session.species;
    this.index = Math.max(0, SPECIES_ORDER.indexOf(current));
    this.mon = new Mon(this, ...STAND, { team: 'p', species: SPECIES_ORDER[this.index] });
    this.float = 0;

    const rows = Math.ceil((RANDOM + 1) / COLS), gridH = 22 + rows * CELL_H;
    panel(this, GRID_X, GRID_Y, GRID_W, gridH);
    text(this, GRID_X + GRID_W / 2, GRID_Y + 5, this.pickFor === 'partner' ? 'Choose a partner' : 'Choose your Pokémon', INK.gold).setOrigin(0.5, 0);
    this.cursor = panel(this, 0, 0, CELL_W, CELL_H, 'hot').setDepth(DEPTH + 1);
    this.cells = SPECIES_ORDER.map((id, i) => {
      const sp = SPECIES[id], x = GRID_X + 4 + (i % COLS) * CELL_W, y = GRID_Y + 18 + Math.floor(i / COLS) * CELL_H;
      const img = this.add.sprite(x + CELL_W / 2, y + CELL_H - 5 - sp.foot, `a-${sp.anims.Idle.key}`, 0).setScrollFactor(0).setDepth(DEPTH + 2);
      const zone = this.add.zone(x, y, CELL_W, CELL_H).setOrigin(0).setScrollFactor(0).setDepth(DEPTH + 3).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => this.select(i));
      zone.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); this.select(i); this.pick(); });
      return { id, x, y, img, restY: img.y };
    });
    {
      const i = RANDOM, x = GRID_X + 4 + (i % COLS) * CELL_W, y = GRID_Y + 18 + Math.floor(i / COLS) * CELL_H;
      const img = text(this, x + CELL_W / 2, y + CELL_H / 2 - 1, '?', INK.gold).setOrigin(0.5).setScale(2).setDepth(DEPTH + 2);
      const zone = this.add.zone(x, y, CELL_W, CELL_H).setOrigin(0).setScrollFactor(0).setDepth(DEPTH + 3).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => this.select(i));
      zone.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); this.select(i); this.pick(); });
      this.cells.push({ id: null, x, y, img, restY: img.y });
    }
    // what stands on the dream's glow while the random cell is picked: nothing you can make out
    this.mystery = text(this, STAND[0], STAND[1] - 10, '?', INK.gold).setOrigin(0.5).setScale(5).setVisible(false);

    // name plate under the grid
    const py = GRID_Y + gridH + 2;
    panel(this, GRID_X, py, GRID_W, 34);
    this.plateType = typeIcon(this, GRID_X + 14, py + 11, 'normal');
    this.plateName = text(this, GRID_X + 25, py + 5, '', INK.gold);
    this.plateInfo = text(this, GRID_X + 8, py + 19, '', INK.dim);

    // previous / next arrows either side of the mon
    for (const [name, dx, step] of [['pageL', -30, -1], ['pageR', 30, 1]]) {
      const a = icon(this, STAND[0] + dx, STAND[1] - 10, name).setInteractive({ useHandCursor: true });
      a.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); this.step(step, 0); });
      this.tweens.add({ targets: a, x: STAND[0] + dx + Math.sign(dx) * 2, duration: 420, yoyo: true, repeat: -1 });
    }
    this.note = text(this, 5, 4, '', INK.off);

    this.actions = new Actions(this);
    this.actions.push({
      up: () => this.step(0, -1), down: () => this.step(0, 1), left: () => this.step(-1, 0), right: () => this.step(1, 0),
      confirm: () => this.pick(), cancel: () => this.back(),
    });
    new Hints(this, this.actions).set([
      { icon: 'dpad', key: 'WASD', label: 'Browse' },
      { icon: 'btnA', key: 'Enter', label: 'Choose', action: 'confirm' },
      { icon: 'btnB', key: 'Esc', label: 'Back', action: 'cancel' },
    ]);
    this.picked = false;
    this.select(this.index, true);
    fetchStages(this.game);
  }

  // Mon reports its action frames to the scene; nothing fights here.
  actionFrame() {}
  actionDone() {}

  step(dx, dy) {
    const n = RANDOM + 1, rows = Math.ceil(n / COLS), col = this.index % COLS;
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
    const mystery = cell.id === null;
    this.mystery.setVisible(mystery);
    this.mon.hidden = mystery;
    this.plateType.setVisible(!mystery);
    if (mystery) {
      this.plateName.setText('Random Pokémon');
      this.plateInfo.setText('Shown once you wake.');
      this.look = null;
      return;
    }
    const sp = SPECIES[cell.id];
    this.plateType.setTexture('art-types', sp.type);
    this.plateName.setText(sp.name);
    this.plateInfo.setText(`${cap(sp.type)} type · Lv ${levelOf(cell.id)}`);
    this.look = formOf(cell.id); // an evolved look appears as soon as its sprites are in (see update)
    this.mon.setSpecies(cell.id);
    this.mon.dir = 0;
  }

  pick() {
    if (this.picked) return;
    this.picked = true;
    // the question mark chooses now, and says nothing: who it was shows when the player wakes (the Hub announces it)
    const mystery = this.index === RANDOM;
    const id = mystery ? SPECIES_ORDER[Math.floor(Math.random() * SPECIES_ORDER.length)] : SPECIES_ORDER[this.index];
    if (this.pickFor === 'partner') session.partner = id;
    else session.species = id;
    if (mystery) this.registry.set(this.pickFor === 'partner' ? 'revealPartner' : 'reveal', id);
    saveSession();
    const cheer = mystery ? null : ['Pose', 'Hop'].find((a) => this.mon.species.anims[a]);
    if (cheer) this.mon.act(cheer);
    else if (mystery) this.tweens.add({ targets: this.mystery, scale: 6.5, duration: 200, yoyo: true });
    // you wake on your own bed; after choosing a partner you are back beside theirs
    const wake = () => go(this, 'hub', { area: 'base', entry: this.pickFor === 'partner' ? 'beside' : 'bedR' });
    this.time.delayedCall(520, () => {
      if (stagesNote(this.game)) this.plateInfo.setText('Waking up...');
      whenStages(this, wake);
    });
  }

  back() {
    if (this.picked) return;
    this.picked = true;
    if (this.from === 'base') go(this, 'hub', { area: 'base', entry: this.pickFor === 'partner' ? 'beside' : 'bedR' });
    else go(this, 'title');
  }

  update(_, ms) {
    const dt = Math.min(ms, 50) / 1000;
    const [light, dark] = this.bands;
    for (const b of light) b.tilePositionY -= 14 * dt;
    for (const b of dark) b.tilePositionY += 22 * dt;
    // the mon bobs as if afloat
    this.float += dt;
    this.mon.y = STAND[1] + Math.sin(this.float * 2.2) * 2;
    this.mystery.y = STAND[1] - 10 + Math.sin(this.float * 2.2) * 2;
    if (this.look && this.mon.species.id !== this.look && this.mon.free && ensureSpecies(this, this.look)) { this.mon.setSpecies(this.look); this.mon.dir = 0; }
    this.mon.update(dt);
    const note = stagesNote(this.game);
    if (note !== this.note.text) this.note.setText(note);
  }
}
