import { VIEW_W } from '../scene.js';
import { SPECIES } from '../sprites.js';
import { CHOICES } from '../evolutions.js';
import { MOVES, BRANCH_MOVES } from '../moves.js';
import { chooseBranch } from './session.js';
import { cap } from './moveinfo.js';
import { tapActs } from './touch.js';
import { DEPTH, INK, Group, text, typeIcon, panel, shade, choose, banner } from './ui.js';

const COLS = 4, CELL_W = 88, CELL_H = 56, GRID_X = 16, GRID_Y = 34;
const INFO_Y = GRID_Y + 2 * CELL_H + 4;
const pinned = (o, depth = 2) => o.setScrollFactor(0).setDepth(DEPTH + depth);

// Where a branching mon (Eevee) picks its evolution. Every way it can go is laid out with the moves that way adds;
// the pick is permanent (session.chooseBranch), and from then on the mon has only that evolution's moves.
// onClose(chosen) gets the form id, or null when the player left it for later.
export class EvolveMenu {
  constructor(scene, actions, { species, onClose }) {
    Object.assign(this, { scene, actions, species, onClose, forms: CHOICES[species], index: 0, group: new Group(), grid: new Group(), busy: false });
    const add = (o) => this.group.add(o), gadd = (o) => this.grid.add(o); // grid: what gives way to the confirm prompt

    add(shade(scene, 0, 0, VIEW_W, 216, 0x000000, 0.62));
    add(panel(scene, 6, 4, VIEW_W - 12, 194));
    add(text(scene, 16, 11, `${SPECIES[species].name} is ready to evolve!`, INK.gold));
    add(text(scene, 16, 23, 'Pick one form. It cannot be changed later, and it only has its own moves.', INK.dim));

    this.cells = this.forms.map((id, i) => {
      const x = GRID_X + (i % COLS) * CELL_W + 2, y = GRID_Y + Math.floor(i / COLS) * CELL_H, w = CELL_W - 4, h = CELL_H - 4;
      const cell = {
        idle: gadd(panel(scene, x, y, w, h, 'dim')), hot: gadd(panel(scene, x, y, w, h, 'hot')),
      };
      gadd(pinned(scene.add.image(x + w / 2, y + 21, `face-${id}`)));
      gadd(typeIcon(scene, x + 9, y + 9, SPECIES[id].type));
      gadd(text(scene, x + w / 2, y + 43, SPECIES[id].name, INK.white).setOrigin(0.5, 0));
      const zone = gadd(pinned(scene.add.zone(x, y, w, h).setOrigin(0), 3)).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => this.select(i));
      zone.on('pointerdown', (p, _x, _y, e) => { e.stopPropagation(); const on = this.index === i; this.select(i); if (tapActs(p, on)) this.pick(); });
      return cell;
    });

    gadd(panel(scene, 12, INFO_Y, VIEW_W - 24, 44, 'dim'));
    this.infoType = gadd(typeIcon(scene, 24, INFO_Y + 11, 'normal'));
    this.infoName = gadd(text(scene, 36, INFO_Y + 6, '', INK.gold));
    this.infoMoves = gadd(text(scene, 20, INFO_Y + 19, '', INK.mint).setMaxWidth(VIEW_W - 44));
    this.big = add(pinned(scene.add.image(VIEW_W / 2, 66, `face-${this.forms[0]}`).setScale(1.5).setVisible(false)));

    this.buttons = scene.hints?.push([
      { icon: 'dpad', key: 'WASD', label: 'Browse' },
      { icon: 'btnA', key: 'Enter', label: 'Choose', action: 'confirm' },
      { icon: 'btnB', key: 'Esc', label: 'Later', action: 'cancel' },
    ]);
    this.handler = actions.push({
      left: () => this.select((this.index + this.forms.length - 1) % this.forms.length),
      right: () => this.select((this.index + 1) % this.forms.length),
      up: () => this.select((this.index + this.forms.length - COLS) % this.forms.length),
      down: () => this.select((this.index + COLS) % this.forms.length),
      confirm: () => this.pick(),
      cancel: () => this.close(null),
    });
    this.select(0, true);
  }

  // the bar's buttons while this is up (it puts its own on top, so this base is empty)
  get hints() { return []; }

  update() {}

  select(i, quiet = false) {
    if (this.busy || (i === this.index && !quiet)) return;
    this.index = i;
    this.cells.forEach((c, n) => c.hot.setVisible(n === i));
    const id = this.forms[i], sp = SPECIES[id], adds = (BRANCH_MOVES[id] ?? []).filter((m) => MOVES[m]);
    this.infoType.setTexture('art-types', sp.type);
    this.infoName.setText(`${sp.name}  ${cap(sp.type)} type  +${adds.length} moves`);
    this.infoMoves.setText(adds.slice(0, 5).map((m) => MOVES[m].name).join(', ') + (adds.length > 5 ? ', ...' : ''));
  }

  async pick() {
    if (this.busy) return;
    this.busy = true;
    const id = this.forms[this.index], name = SPECIES[id].name;
    // the pick menu sits on top of this one and takes the keys while it is up; the grid steps aside for it
    this.grid.setVisible(false);
    this.big.setTexture(`face-${id}`).setVisible(true);
    const at = choose(this.scene, this.actions, {
      x: (VIEW_W - 168) >> 1, y: 92, w: 168, title: `Become ${name} for good?`, hints: this.scene.hints,
      items: [{ label: `Yes, ${name}` }, { label: 'Not yet' }],
    });
    const i = await at;
    this.busy = false;
    if (i !== 0) {
      this.grid.setVisible(true);
      this.big.setVisible(false);
      this.select(this.index, true); // the highlight is only for the card the cursor is on
      return;
    }
    chooseBranch(this.species, id);
    this.close(id);
    banner(this.scene, `${SPECIES[this.species].name} evolved into ${name}!`);
  }

  close(chosen) {
    this.actions.pop(this.handler);
    if (this.buttons) this.scene.hints.pop(this.buttons);
    this.group.clear();
    this.grid.clear();
    this.onClose?.(chosen);
  }
}
