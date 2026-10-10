import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from '../scene.js';
import { SPECIES } from '../sprites.js';
import { MOVES, movesOf } from '../moves.js';
import { loadoutOf, setLoadout, LOADOUT_SIZE } from './session.js';
import { describe, typeOf, cap } from './moveinfo.js';
import { DEPTH, INK, Group, text, icon, typeIcon, panel, shade } from './ui.js';

const ROWS = 10, ROW_H = 15, WHEEL_ROW = 50;
const LIST = { x: 6, y: 5, w: 150, h: 24 + ROWS * ROW_H + 5 };
const INFO = { x: 160, y: 5, w: 218, h: 124 };
const SLOTS = { x: 160, y: 132, w: 218, h: 52 };
const PREVIEW = 46;

// Full-screen move picker: everything the mon can learn on the left, what the highlighted move does on the right,
// and the four slots it takes to battle underneath. Slot order is the order of the 1-4 keys in battle.
export class MoveMenu {
  constructor(scene, actions, { species, onClose }) {
    Object.assign(this, { scene, actions, species, onClose, group: new Group() });
    this.moves = movesOf(species).filter((id) => MOVES[id]);
    this.picked = loadoutOf(species);
    this.index = 0;
    this.scroll = 0;
    this.clock = 0;
    const g = this.group, add = (o) => g.add(o);

    add(shade(scene, 0, 0, VIEW_W, VIEW_H, 0x000000, 0.55));

    // the list
    add(panel(scene, LIST.x, LIST.y, LIST.w, LIST.h));
    add(text(scene, LIST.x + 8, LIST.y + 6, `${SPECIES[species].name}'s moves`, INK.gold));
    this.count = add(text(scene, LIST.x + LIST.w - 8, LIST.y + 6, '', INK.mint).setOrigin(1, 0));
    this.bar = add(shade(scene, LIST.x + 4, 0, LIST.w - 8, ROW_H, 0x8fdcff, 0.28).setDepth(DEPTH + 1));
    this.rows = [];
    for (let r = 0; r < ROWS; r++) {
      const y = LIST.y + 22 + r * ROW_H;
      const row = {
        slot: add(text(scene, LIST.x + 9, y + 2, '', INK.mint)),
        type: add(typeIcon(scene, LIST.x + 26, y + 7, 'normal')),
        name: add(text(scene, LIST.x + 37, y + 2, '')),
        zone: add(scene.add.zone(LIST.x + 4, y, LIST.w - 8, ROW_H).setOrigin(0).setScrollFactor(0).setDepth(DEPTH + 3)).setInteractive({ useHandCursor: true }),
      };
      row.zone.on('pointerover', () => this.scroll + r < this.moves.length && this.setIndex(this.scroll + r));
      row.zone.on('pointerdown', (_p, _x, _y, e) => {
        e.stopPropagation();
        if (this.scroll + r < this.moves.length) { this.setIndex(this.scroll + r); this.toggle(); }
      });
      this.rows.push(row);
    }
    // the arrows show there is more above or below; clicking one turns a page, the mouse wheel scrolls row by row
    this.moreUp = add(icon(scene, LIST.x + LIST.w - 12, LIST.y + 26, 'caretUp').setDepth(DEPTH + 4)).setInteractive({ useHandCursor: true });
    this.moreDown = add(icon(scene, LIST.x + LIST.w - 12, LIST.y + LIST.h - 10, 'caretDown').setDepth(DEPTH + 4)).setInteractive({ useHandCursor: true });
    this.moreUp.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); this.scrollBy(-ROWS); });
    this.moreDown.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); this.scrollBy(ROWS); });
    this.wheel = 0;
    this.onWheel = (_p, _over, _dx, dy) => {
      // a mouse notch is about 100, a trackpad sends many small steps
      this.wheel += dy;
      const rows = Math.trunc(this.wheel / WHEEL_ROW);
      if (!rows) return;
      this.wheel -= rows * WHEEL_ROW;
      this.scrollBy(rows);
    };
    scene.input.on('wheel', this.onWheel);

    // what the highlighted move does
    add(panel(scene, INFO.x, INFO.y, INFO.w, INFO.h));
    this.infoType = add(typeIcon(scene, INFO.x + 14, INFO.y + 12, 'normal'));
    this.infoName = add(text(scene, INFO.x + 25, INFO.y + 6, '', INK.gold));
    this.infoKind = add(text(scene, INFO.x + 8, INFO.y + 21, '', INK.dim));
    this.infoStats = add(text(scene, INFO.x + 8, INFO.y + 37, ''));
    this.infoBody = add(text(scene, INFO.x + 8, INFO.y + 66, '', INK.sky).setMaxWidth(INFO.w - 16));
    const px = INFO.x + INFO.w - PREVIEW - 10, py = INFO.y + 7;
    add(panel(scene, px - 3, py - 3, PREVIEW + 6, PREVIEW + 6, 'dim'));
    this.previewAt = [px + PREVIEW / 2, py + PREVIEW / 2];
    this.preview = add(scene.add.image(...this.previewAt, 'px').setScrollFactor(0).setDepth(DEPTH + 2));

    // the four slots
    add(panel(scene, SLOTS.x, SLOTS.y, SLOTS.w, SLOTS.h));
    add(text(scene, SLOTS.x + 8, SLOTS.y + 6, 'Battle moves', INK.gold));
    this.slots = [];
    for (let i = 0; i < LOADOUT_SIZE; i++) {
      const x = SLOTS.x + 8 + (i % 2) * 104, y = SLOTS.y + 20 + Math.floor(i / 2) * 15;
      add(text(scene, x, y + 1, String(i + 1), INK.mint));
      this.slots.push({ type: add(typeIcon(scene, x + 16, y + 6, 'normal')), name: add(text(scene, x + 26, y + 1, '')) });
    }

    this.toast = { box: add(panel(scene, 60, VIEW_H - 40, VIEW_W - 120, 20, 'hot').setDepth(DEPTH + 4)), label: add(text(scene, VIEW_W / 2, VIEW_H - 35, '').setOrigin(0.5, 0).setDepth(DEPTH + 5)) };
    this.toast.box.setVisible(false);

    this.handler = actions.push({
      up: () => this.setIndex((this.index + this.moves.length - 1) % this.moves.length),
      down: () => this.setIndex((this.index + 1) % this.moves.length),
      left: () => this.setIndex(Math.max(0, this.index - ROWS)),
      right: () => this.setIndex(Math.min(this.moves.length - 1, this.index + ROWS)),
      confirm: () => this.toggle(),
      cancel: () => this.close(),
      menu: () => this.close(),
    });
    this.refresh();
  }

  // the bar's buttons while this menu is up
  get hints() {
    return [
      { icon: 'dpadUD', key: 'W S', label: 'Move' },
      { icon: 'dpadLR', key: 'A D', label: 'Page' },
      { icon: 'btnA', key: 'Enter', label: this.picked.includes(this.moves[this.index]) ? 'Drop' : 'Take', action: 'confirm' },
      { icon: 'btnB', key: 'Esc', label: 'Done', action: 'cancel' },
    ];
  }

  setIndex(i) {
    if (i === this.index) return;
    this.index = i;
    this.clock = 0;
    this.refresh();
  }

  // Slide the list without the keys; the highlight is dragged along if it would leave the window.
  scrollBy(rows) {
    const top = Phaser.Math.Clamp(this.scroll + rows, 0, Math.max(0, this.moves.length - ROWS));
    if (top === this.scroll) return;
    this.scroll = top;
    const index = Phaser.Math.Clamp(this.index, top, top + ROWS - 1);
    if (index !== this.index) { this.index = index; this.clock = 0; }
    this.refresh();
  }

  toggle() {
    const id = this.moves[this.index], at = this.picked.indexOf(id);
    if (at >= 0) this.picked.splice(at, 1);
    else if (this.picked.length < LOADOUT_SIZE) this.picked.push(id);
    else return this.say(`All ${LOADOUT_SIZE} slots are full. Drop a move first.`);
    this.refresh();
  }

  say(msg) {
    const { box, label } = this.toast;
    box.setVisible(true);
    label.setText(msg);
    this.toastTimer?.remove();
    this.toastTimer = this.scene.time.delayedCall(1500, () => { box.setVisible(false); label.setText(''); });
  }

  refresh() {
    const { moves, picked } = this;
    this.scroll = Math.max(Math.min(this.scroll, this.index), this.index - ROWS + 1);
    this.rows.forEach((row, r) => {
      const id = moves[this.scroll + r], on = id !== undefined;
      for (const o of [row.slot, row.type, row.name]) o.setVisible(on);
      if (!on) return;
      const at = picked.indexOf(id);
      row.slot.setText(at >= 0 ? String(at + 1) : '');
      row.type.setTexture('art-types', typeOf(id));
      row.name.setText(MOVES[id].name).setTint(at >= 0 ? INK.mint : INK.white);
    });
    this.bar.y = LIST.y + 22 + (this.index - this.scroll) * ROW_H;
    this.moreUp.setVisible(this.scroll > 0);
    this.moreDown.setVisible(this.scroll + ROWS < moves.length);
    this.count.setText(`${picked.length}/${LOADOUT_SIZE}`).setTint(picked.length === LOADOUT_SIZE ? INK.mint : INK.rose);

    const id = moves[this.index], info = describe(id);
    this.infoType.setTexture('art-types', info.type);
    this.infoName.setText(MOVES[id].name);
    this.infoKind.setText(`${cap(info.type)} · ${info.role} · ${info.kind}`);
    const cell = ([k, v]) => `${k} ${v}`;
    this.infoStats.setText(`${info.stats.slice(0, 2).map(cell).join('   ')}\n${info.stats.slice(2).map(cell).join('   ')}`);
    this.infoBody.setText([info.how, ...info.notes].slice(0, 4).join('\n'));

    this.slots.forEach((s, i) => {
      const m = picked[i];
      s.type.setVisible(!!m);
      if (m) s.type.setTexture('art-types', typeOf(m));
      s.name.setText(m ? MOVES[m].name : '- empty -').setTint(m ? INK.white : INK.off);
    });
    this.onChange?.();
  }

  // Loops the highlighted move's effect in the preview box.
  update(dt) {
    const mv = MOVES[this.moves[this.index]], frames = mv.frames ?? [];
    if (!frames.length) return this.preview.setVisible(false);
    const fps = mv.fps ?? 30, span = frames.length / fps + 0.5;
    this.clock = (this.clock + dt) % span;
    const key = frames[Math.min(frames.length - 1, Math.floor(this.clock * fps))];
    const img = this.preview.setVisible(true).setTexture(key);
    img.setScale(Math.min(1, PREVIEW / img.frame.width, PREVIEW / img.frame.height));
    if (mv.tint) img.setTint(mv.tint); else img.clearTint();
  }

  close() {
    setLoadout(this.species, this.picked);
    this.toastTimer?.remove();
    this.scene.input.off('wheel', this.onWheel);
    this.actions.pop(this.handler);
    this.group.clear();
    this.onClose?.(this.picked);
  }
}
