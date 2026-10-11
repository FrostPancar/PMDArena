import { VIEW_W } from '../scene.js';
import { MAPS, MAP_ORDER } from '../maps.js';
import { tapActs } from './touch.js';
import { DEPTH, INK, Group, text, icon, panel, shade } from './ui.js';

const ROWS = 11, ROW_H = 15, LIST = { x: 6, y: 5, w: 150 }, VIEW = { x: 160, y: 5, w: 218, h: 174 };
const PREVIEW = { w: 200, h: 130 };

// The console in the lab: every stage in the game by name, with the stage itself shown beside it. Picking one sends
// the player to that stage's practice arena. onPick(mapId) / onClose().
export class MapMenu {
  constructor(scene, actions, { onPick, onClose }) {
    Object.assign(this, { scene, actions, onPick, onClose, group: new Group(), index: 0, scroll: 0 });
    const add = (o) => this.group.add(o);
    add(shade(scene, 0, 0, VIEW_W, 216, 0x000000, 0.55));
    add(panel(scene, LIST.x, LIST.y, LIST.w, 22 + ROWS * ROW_H + 4));
    add(text(scene, LIST.x + 8, LIST.y + 6, 'Practice arena', INK.gold));
    this.bar = add(shade(scene, LIST.x + 4, 0, LIST.w - 8, ROW_H, 0x8fdcff, 0.28).setDepth(DEPTH + 1));
    this.rows = [];
    for (let r = 0; r < ROWS; r++) {
      const y = LIST.y + 22 + r * ROW_H;
      const name = add(text(scene, LIST.x + 12, y + 2, ''));
      const zone = add(scene.add.zone(LIST.x + 4, y, LIST.w - 8, ROW_H).setOrigin(0).setScrollFactor(0).setDepth(DEPTH + 3)).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => this.scroll + r < MAP_ORDER.length && this.set(this.scroll + r));
      zone.on('pointerdown', (p, _x, _y, e) => { e.stopPropagation(); const i = this.scroll + r, on = i === this.index; if (i < MAP_ORDER.length) { this.set(i); if (tapActs(p, on)) this.pick(); } });
      this.rows.push({ name });
    }
    this.up = add(icon(scene, LIST.x + LIST.w - 12, LIST.y + 26, 'caretUp').setDepth(DEPTH + 4));
    this.down = add(icon(scene, LIST.x + LIST.w - 12, LIST.y + 22 + ROWS * ROW_H - 6, 'caretDown').setDepth(DEPTH + 4));

    add(panel(scene, VIEW.x, VIEW.y, VIEW.w, VIEW.h));
    this.title = add(text(scene, VIEW.x + 9, VIEW.y + 7, '', INK.gold));
    this.size = add(text(scene, VIEW.x + VIEW.w - 9, VIEW.y + 7, '', INK.dim).setOrigin(1, 0));
    this.shot = add(scene.add.image(VIEW.x + VIEW.w / 2, VIEW.y + 24 + PREVIEW.h / 2, 'px').setScrollFactor(0).setDepth(DEPTH + 2));
    add(text(scene, VIEW.x + 9, VIEW.y + 24 + PREVIEW.h + 5, 'Hitboxes, CPUs and dummies are in the arena.', INK.off));

    this.onWheel = (_p, _o, _dx, dy) => this.set(Math.min(MAP_ORDER.length - 1, Math.max(0, this.index + Math.sign(dy))));
    scene.input.on('wheel', this.onWheel);
    this.handler = actions.push({
      up: () => this.set((this.index + MAP_ORDER.length - 1) % MAP_ORDER.length),
      down: () => this.set((this.index + 1) % MAP_ORDER.length),
      left: () => this.set(Math.max(0, this.index - ROWS)),
      right: () => this.set(Math.min(MAP_ORDER.length - 1, this.index + ROWS)),
      confirm: () => this.pick(),
      cancel: () => this.close(),
    });
    this.set(0, true);
  }

  get hints() {
    return [
      { icon: 'dpadUD', key: 'W S', label: 'Choose a stage' },
      { icon: 'btnA', key: 'Enter', label: 'Go', action: 'confirm' },
      { icon: 'btnB', key: 'Esc', label: 'Back', action: 'cancel' },
    ];
  }

  update() {}

  set(i) {
    this.index = i;
    if (i < this.scroll) this.scroll = i;
    else if (i >= this.scroll + ROWS) this.scroll = i - ROWS + 1;
    this.rows.forEach((r, n) => r.name.setText(MAP_ORDER[this.scroll + n] ? MAPS[MAP_ORDER[this.scroll + n]].name : '').setTint(this.scroll + n === i ? INK.white : INK.dim));
    this.bar.setY(LIST.y + 22 + (i - this.scroll) * ROW_H);
    this.up.setVisible(this.scroll > 0);
    this.down.setVisible(this.scroll + ROWS < MAP_ORDER.length);
    const id = MAP_ORDER[i], m = MAPS[id];
    this.title.setText(m.name);
    const tex = this.scene.textures.exists(m.image) ? this.scene.textures.get(m.image).getSourceImage() : null;
    if (tex) {
      this.shot.setTexture(m.image).setVisible(true);
      this.shot.setScale(Math.min(PREVIEW.w / tex.width, PREVIEW.h / tex.height));
      this.size.setText(`${tex.width} x ${tex.height}`);
    } else {
      this.shot.setVisible(false);
      this.size.setText('');
    }
  }

  pick() {
    const id = MAP_ORDER[this.index];
    this.teardown();
    this.onPick?.(id);
  }

  teardown() {
    this.scene.input.off('wheel', this.onWheel);
    this.actions.pop(this.handler);
    this.group.clear();
  }

  close() {
    this.teardown();
    this.onClose?.();
  }
}
