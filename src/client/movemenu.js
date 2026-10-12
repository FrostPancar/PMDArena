import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from '../scene.js';
import { SPECIES } from '../sprites.js';
import { MOVES, grayFrames, ensureMove } from '../moves.js';
import { session, loadoutOf, setLoadout, levelOf, branchOf, formOf, ownsTM, allTMs, LOADOUT_SIZE } from './session.js';
import { unlockPlan, tmsFor } from './progress.js';
import { describe, typeOf, METERS, litNotches, TYPE_TINT, DELIVERY_LABEL } from './moveinfo.js';
import { tapActs } from './touch.js';
import { DEPTH, INK, Group, Meter, text, icon, typeIcon, panel, shade } from './ui.js';

const ROWS = 10, ROW_H = 15, WHEEL_ROW = 50;
const LIST = { x: 6, y: 5, w: 150, h: 24 + ROWS * ROW_H + 5 };
const INFO = { x: 160, y: 5, w: 218, h: 128 };
const SLOTS = { x: 160, y: 136, w: 218, h: 52 };
// the stat rows of the info panel: glyph, name, notched bar
const STAT_ROWS = [['power', 'statPower', 'Power'], ['stamina', 'statStamina', 'Energy'], ['speed', 'statSpeed', 'Speed']];
const PREVIEW = 46;
// A TM's disc takes a little of the colour of its move's type.
const tmTint = (id) => { const c = TYPE_TINT[typeOf(id)] ?? 0xffffff, mix = (sh) => Math.round(((c >> sh) & 255) * 0.6 + 255 * 0.4); return (mix(16) << 16) | (mix(8) << 8) | mix(0); };

// Full-screen move picker. On the left, everything the mon can use: first the moves it learns by itself (the ones
// its level has not opened yet padlocked, with the level that will); then, under a rule, the ones it has to be taught,
// each marked with a TM disc and padlocked until that TM has been found; and last, greyed out, the TMs that teach it
// nothing because it learns that move by itself (finding one of those does open the move early). On the right is what the highlighted move does on the right, and the four slots it takes to battle
// underneath. Slot order is button order in battle: left click, right click, Q, E.
export class MoveMenu {
  constructor(scene, actions, { species, onClose }) {
    Object.assign(this, { scene, actions, species, onClose, group: new Group() });
    this.level = levelOf(species);
    this.needs = Object.fromEntries(unlockPlan(species, branchOf(species)).map((m) => [m.id, m.level])); // move id -> level that opens it
    const own = Object.keys(this.needs), taught = tmsFor(species, branchOf(species)), every = allTMs();
    this.tm = Object.fromEntries(taught.map((id) => [id, true]));
    // found TMs first, the rest by name
    taught.sort((x, y) => ownsTM(y) - ownsTM(x) || MOVES[x].name.localeCompare(MOVES[y].name));
    this.spare = own.filter((id) => every.includes(id)); // TMs for moves it learns anyway
    this.moves = [...own, ...taught, ...this.spare];
    this.firstTM = taught.length ? own.length : -1;
    this.firstSpare = own.length + taught.length; // rows from here on are only for show
    this.picked = loadoutOf(species);
    this.index = 0;
    this.scroll = 0;
    this.clock = 0;
    const g = this.group, add = (o) => g.add(o);

    add(shade(scene, 0, 0, VIEW_W, VIEW_H, 0x000000, 0.55));

    // the list
    add(panel(scene, LIST.x, LIST.y, LIST.w, LIST.h));
    add(text(scene, LIST.x + 8, LIST.y + 6, `${SPECIES[formOf(species)].name}  Lv ${this.level}`, INK.gold));
    this.count = add(text(scene, LIST.x + LIST.w - 8, LIST.y + 6, '', INK.mint).setOrigin(1, 0));
    this.bar = add(shade(scene, LIST.x + 4, 0, LIST.w - 8, ROW_H, 0x8fdcff, 0.28).setDepth(DEPTH + 1));
    this.rule = add(shade(scene, LIST.x + 6, 0, LIST.w - 12, 1, 0xffe45c, 0.7).setDepth(DEPTH + 2)); // between its own moves and the TMs
    this.rule2 = add(shade(scene, LIST.x + 6, 0, LIST.w - 12, 1, 0x6f8296, 0.8).setDepth(DEPTH + 2)); // above the TMs it has no use for
    this.rows = [];
    for (let r = 0; r < ROWS; r++) {
      const y = LIST.y + 22 + r * ROW_H;
      const row = {
        slot: add(text(scene, LIST.x + 9, y + 2, '', INK.mint)),
        lock: add(icon(scene, LIST.x + 12, y + 7, 'lock').setScale(0.75)),
        type: add(typeIcon(scene, LIST.x + 26, y + 7, 'normal')),
        tm: add(icon(scene, LIST.x + 42, y + 7, 'tm').setScale(0.75)),
        name: add(text(scene, LIST.x + 37, y + 2, '')),
        needs: add(text(scene, LIST.x + LIST.w - 20, y + 2, '', INK.off).setOrigin(1, 0)),
        fresh: add(icon(scene, LIST.x + LIST.w - 28, y + 7, 'new')), // (at its full size: shrunk, the letters do not read) // just opened, not taken yet
        zone: add(scene.add.zone(LIST.x + 4, y, LIST.w - 8, ROW_H).setOrigin(0).setScrollFactor(0).setDepth(DEPTH + 3)).setInteractive({ useHandCursor: true }),
      };
      row.zone.on('pointerover', () => this.scroll + r < this.moves.length && this.setIndex(this.scroll + r));
      row.zone.on('pointerdown', (p, _x, _y, e) => {
        e.stopPropagation();
        const i = this.scroll + r, on = i === this.index;
        if (i < this.moves.length) { this.setIndex(i); if (tapActs(p, on)) this.toggle(); }
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
    // what kind of move it is, in pictures: what it is for, how it is delivered, whether it is held, whether it is a TM;
    // then how it has to be answered, if it is not a plain strike
    const pic = (key) => add(scene.add.image(0, INFO.y + 26, key).setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH + 2));
    const word = () => add(text(scene, 0, INFO.y + 21, '', INK.dim));
    this.pics = { role: pic('roleAttack'), kind: pic('kindMelee'), hold: pic('kindHold'), tm: add(icon(scene, 0, INFO.y + 12, 'tm').setOrigin(0, 0.5).setScale(0.75)) };
    this.words = { role: word(), kind: word(), hold: word(), tm: add(text(scene, 0, INFO.y + 6, 'TM', INK.dim)) };
    this.stats = STAT_ROWS.map(([key, art, label], i) => {
      const y = INFO.y + 37 + i * 11;
      return {
        key,
        art: add(scene.add.image(INFO.x + 8, y + 4, art).setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH + 2)),
        label: add(text(scene, INFO.x + 20, y, label, INK.dim)),
        bar: add(new Meter(scene, INFO.x + 66, y + 2, METERS[key].notches, 80 / METERS[key].notches)), // every bar the same length; energy's is the bar itself, in five
      };
    });
    this.infoBody = add(text(scene, INFO.x + 8, INFO.y + 72, '', INK.sky).setMaxWidth(INFO.w - 16));
    const px = INFO.x + INFO.w - PREVIEW - 10, py = INFO.y + 7;
    add(panel(scene, px - 3, py - 3, PREVIEW + 6, PREVIEW + 6, 'dim'));
    // how long the move takes to wind up, under the preview
    add(scene.add.image(px - 3, py + PREVIEW + 9, 'statClock').setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH + 2));
    this.infoCharge = add(text(scene, px + 10, py + PREVIEW + 4, '', INK.white));
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
      { icon: 'btnA', key: 'Enter', label: this.spareAt(this.index) ? 'Own move' : this.locked(this.moves[this.index]) ? 'Locked' : this.picked.includes(this.moves[this.index]) ? 'Drop' : 'Take', action: 'confirm' },
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

  // Not usable yet: a TM that has not been found, or a move of its own above its level (unless its TM has been found).
  locked(id) { return this.tm[id] ? !ownsTM(id) : this.needs[id] > this.level && !ownsTM(id); }
  // A row at the bottom of the list that only shows a TM the mon has no use for.
  spareAt(i) { return i >= this.firstSpare; }

  toggle() {
    const id = this.moves[this.index], at = this.picked.indexOf(id);
    if (this.spareAt(this.index)) return this.say(`It learns ${MOVES[id].name} by itself.`);
    if (this.locked(id)) return this.say(this.tm[id] ? `Find the ${MOVES[id].name} TM to teach it.` : `${MOVES[id].name} unlocks at Lv ${this.needs[id]}.`);
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
      for (const o of [row.slot, row.type, row.name, row.lock, row.needs, row.tm, row.fresh]) o.setVisible(on);
      if (!on) return;
      const spare = this.spareAt(this.scroll + r), disc = this.tm[id] || spare;
      const at = spare ? -1 : picked.indexOf(id), locked = spare || this.locked(id);
      row.tm.setVisible(disc).setAlpha(locked ? 0.45 : 1).setTint(spare ? 0x8a94a3 : tmTint(id));
      row.name.x = LIST.x + (disc ? 50 : 37);
      row.slot.setText(at >= 0 ? String(at + 1) : '');
      row.fresh.setVisible(!locked && at < 0 && session.news.includes(id));
      row.lock.setVisible(locked && !spare);
      row.needs.setText(spare ? 'own' : locked && !this.tm[id] ? `Lv ${this.needs[id]}` : '');
      row.type.setTexture('art-types', typeOf(id)).setAlpha(locked ? 0.45 : 1);
      row.name.setText(MOVES[id].name).setTint(locked ? INK.off : at >= 0 ? INK.mint : INK.white);
    });
    this.bar.y = LIST.y + 22 + (this.index - this.scroll) * ROW_H;
    const cut = this.firstTM - this.scroll;
    this.rule.setVisible(this.firstTM > 0 && cut > 0 && cut < ROWS).setY(LIST.y + 22 + cut * ROW_H - 1);
    const cut2 = this.firstSpare - this.scroll;
    this.rule2.setVisible(this.spare.length > 0 && cut2 > 0 && cut2 < ROWS).setY(LIST.y + 22 + cut2 * ROW_H - 1);
    this.moreUp.setVisible(this.scroll > 0);
    this.moreDown.setVisible(this.scroll + ROWS < moves.length);
    this.count.setText(`${picked.length}/${LOADOUT_SIZE}`).setTint(picked.length === LOADOUT_SIZE ? INK.mint : INK.rose);

    const id = moves[this.index], info = describe(id);
    this.infoType.setTexture('art-types', info.type);
    this.infoName.setText(MOVES[id].name);
    // each picture with the word for it beside it; the TM disc sits after the name
    let px = INFO.x + 8;
    const show = (part, on, key, label) => {
      const o = this.pics[part], w = this.words[part];
      o.setVisible(on);
      w.setVisible(on);
      if (!on) return;
      if (key) o.setTexture(key);
      o.x = px;
      w.setText(label).setX(px + o.displayWidth + 3);
      px = w.x + w.width + 8;
    };
    show('role', true, `role${info.role}`, info.role);
    show('kind', true, `kind${info.delivery[0].toUpperCase()}${info.delivery.slice(1)}`, DELIVERY_LABEL[info.delivery]);
    show('hold', info.held && info.delivery !== 'hold', null, 'Hold');
    const disc = this.tm[id] || this.spareAt(this.index);
    this.pics.tm.setVisible(disc).setTint(tmTint(id)).setX(this.infoName.x + this.infoName.width + 6);
    this.words.tm.setVisible(disc).setX(this.pics.tm.x + 14);
    const have = { power: info.power, stamina: info.cost, speed: info.speed };
    for (const s of this.stats) {
      const v = have[s.key];
      s.bar.set(s.key === 'stamina' ? v / 20 : litNotches(s.key, v), METERS[s.key].color);
      s.art.setAlpha(v ? 1 : 0.35);
      s.label.setTint(v ? INK.dim : INK.off);
    }
    this.infoCharge.setText(`${+info.charge.toFixed(2)}s`);
    // a move with nothing special about it says how it is used; the rest say only what is special
    const lines = info.notes.length ? [...info.notes] : [info.how];
    const fits = () => this.infoBody.setText(lines.join('\n')).getTextBounds().wrappedText.split('\n').length <= 4;
    while (!fits() && lines.length > 1) lines.pop(); // the panel holds four lines: the last notes give way

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
    const mv = MOVES[this.moves[this.index]];
    if (!ensureMove(this.scene, mv)) return this.preview.setVisible(false); // its art is on the way: shown as soon as it is in
    grayFrames(this.scene, mv);
    const frames = mv.frames ?? [];
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
