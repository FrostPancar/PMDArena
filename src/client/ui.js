import { VIEW_W, VIEW_H } from '../scene.js';
import { touch } from './touch.js';

// Screen-space widgets shared by every screen: text in the game font, framed windows, list menus, the dialogue box and the button bar.
// Everything here ignores the camera (scroll factor 0) and sits above the world.
export const DEPTH = 9500;
export const INK = { white: 0xffffff, gold: 0xffe45c, sky: 0x8fdcff, mint: 0x9af0a0, dim: 0xa9bfd6, rose: 0xff9a8a, off: 0x6f8296 };
export const LINE = 13;

const pin = (o, depth = 2) => o.setScrollFactor(0).setDepth(DEPTH + depth);

export const text = (scene, x, y, str, tint = INK.white) => pin(scene.add.bitmapText(x, y, 'pmd', str).setTint(tint));
export const icon = (scene, x, y, name) => pin(scene.add.image(x, y, 'art-icons', name));
export const typeIcon = (scene, x, y, type) => pin(scene.add.image(x, y, 'art-types', type));
export const shade = (scene, x, y, w, h, color = 0x000000, alpha = 0.5) =>
  pin(scene.add.image(x, y, 'px').setOrigin(0).setDisplaySize(w, h).setTint(color).setAlpha(alpha), 0);

// Window styles: [fill, border]. Rings from the outside in are a dark outline, the border, its shade, then the fill, with the corners cut.
const STYLES = {
  win: ['rgba(22,52,84,0.93)', '#f4f8ff'],
  hot: ['rgba(58,104,160,0.96)', '#fff3a0'],
  dim: ['rgba(12,24,40,0.78)', '#9fb4c8'],
  // the touch pad's buttons (touch.js): see-through, as they lie over the game
  pad: ['rgba(12,24,40,0.4)', '#e6eefa'],
  padHot: ['rgba(64,124,196,0.72)', '#fff3a0'],
};

// Paints a window frame of a style onto a 2D canvas context, its top left corner at 0, 0. `fill` overrides the style's own.
export function paintFrame(g, style, w, h, fill = STYLES[style][0]) {
  const edge = STYLES[style][1];
  const rings = ['#0a1826', edge, '#8fb0cc', fill], cut = [3, 2, 2, 1];
  rings.forEach((col, r) => {
    g.fillStyle = col;
    for (let y = r; y < h - r; y++) {
      // how far this row is pulled in by the cut corner
      const inset = Math.max(0, cut[r] - Math.min(y - r, h - 1 - r - y));
      g.clearRect(r + inset, y, w - 2 * (r + inset), 1);
      g.fillRect(r + inset, y, w - 2 * (r + inset), 1);
    }
  });
}

function frameTexture(scene, style, w, h) {
  const key = `frame-${style}-${w}x${h}`;
  if (scene.textures.exists(key)) return key;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  paintFrame(c.getContext('2d'), style, w, h);
  scene.textures.addCanvas(key, c);
  return key;
}

export const panel = (scene, x, y, w, h, style = 'win') => pin(scene.add.image(x, y, frameTexture(scene, style, w, h)).setOrigin(0), 0);

// A bar for a stat, split into equal notches, `lit` of them filled (whole notches only). Drawn on a small canvas of
// its own, so it can be added to a Group like any game object and set() again whenever the value changes.
const NOTCH_W = 5, BAR_H_PX = 5;
let meterCount = 0;
export class Meter {
  constructor(scene, x, y, notches, notchW = NOTCH_W) {
    this.scene = scene;
    this.notches = notches;
    this.notchW = notchW;
    this.w = notches * notchW + 2;
    this.key = `meter-${meterCount++}`;
    this.tex = scene.textures.createCanvas(this.key, this.w, BAR_H_PX);
    this.img = pin(scene.add.image(x, y, this.key).setOrigin(0), 2);
  }

  set(notches, color) {
    const g = this.tex.getContext(), inner = this.w - 2, NW = this.notchW, lit = Math.round(Math.min(this.notches, Math.max(0, notches)) * NW); // (part of a notch may be lit)
    g.clearRect(0, 0, this.w, BAR_H_PX);
    g.fillStyle = '#0a1826';
    g.fillRect(0, 0, this.w, BAR_H_PX);
    g.fillStyle = '#23486c';
    g.fillRect(1, 1, inner, BAR_H_PX - 2);
    g.fillStyle = color;
    g.fillRect(1, 1, lit, BAR_H_PX - 2);
    g.fillStyle = 'rgba(255,255,255,0.45)';
    g.fillRect(1, 1, lit, 1);
    g.fillStyle = '#0a1826';
    for (let i = 1; i < this.notches; i++) g.fillRect(1 + i * NW - 1, 0, 1, BAR_H_PX);
    this.tex.refresh();
    return this;
  }

  setVisible(v) { this.img.setVisible(v); return this; }

  destroy() {
    this.img.destroy();
    this.scene.textures.remove(this.key);
  }
}

// A set of objects made, shown, hidden and destroyed together.
export class Group {
  constructor() { this.items = []; }
  add(o) { this.items.push(o); return o; }
  setVisible(v) { for (const o of this.items) o.setVisible(v); return this; }
  clear() { for (const o of this.items) o.destroy(); this.items.length = 0; }
}

// Button bar along the bottom edge. Each item is { icon, key, label, action }; clicking one fires its action.
// set() gives the screen's own buttons; a dialogue or menu pushes its own on top while it is up.
// On a touch screen the icons are the pad's own buttons (touch.js), so the keyboard key is left out, and the bar is
// centred to stay clear of the pad in the corners.
export const BAR_H = 15;
export class Hints {
  constructor(scene, actions) {
    Object.assign(this, { scene, actions, group: new Group(), layers: [[]] });
    this.bar = shade(scene, 0, VIEW_H - BAR_H, VIEW_W, BAR_H, 0x06101c, 0.78);
  }

  set(items) { this.layers[0] = items; this.draw(); }
  push(items) { this.layers.push(items); this.draw(); return items; }
  pop(items) {
    const i = this.layers.lastIndexOf(items);
    if (i > 0) this.layers.splice(i, 1);
    this.draw();
  }

  draw() {
    const items = this.layers[this.layers.length - 1];
    this.group.clear();
    const { scene, group } = this, cy = VIEW_H - 8;
    let x = 5;
    for (const it of items) {
      const x0 = x;
      if (it.icon) {
        const img = group.add(icon(scene, x, cy, it.icon).setOrigin(0, 0.5));
        x += img.width + 2;
      }
      if (it.key && !(touch.on && it.icon)) {
        const k = group.add(text(scene, x, cy - 6, it.key, INK.gold));
        x += k.width + 3;
      }
      const l = group.add(text(scene, x, cy - 6, it.label, it.action ? INK.white : INK.dim));
      x += l.width;
      if (it.action) {
        const zone = group.add(pin(scene.add.zone(x0 - 2, VIEW_H - BAR_H, x - x0 + 4, BAR_H).setOrigin(0), 3)).setInteractive({ useHandCursor: true });
        zone.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); this.actions.fire(it.action); });
      }
      x += 10;
    }
    if (touch.on) for (const o of group.items) o.x += (VIEW_W - x + 5) >> 1;
  }

  setVisible(v) { this.bar.setVisible(v); this.group.setVisible(v); }
}

// A framed list with a pointer. items: [{ label, tint, off }]. An `off` item can be highlighted but picking it calls onPick with it all the same,
// so the caller can explain why it is unavailable.
export class Menu {
  constructor(scene, actions, { x, y, w, items, index = 0, title, hints, onPick, onCancel, onMove }) {
    Object.assign(this, { scene, actions, items, index, hints, onPick, onCancel, onMove, group: new Group() });
    this.buttons = hints?.push([
      { icon: 'dpadUD', key: 'W S', label: 'Choose' },
      { icon: 'btnA', key: 'Enter', label: 'OK', action: 'confirm' },
      ...(onCancel ? [{ icon: 'btnB', key: 'Esc', label: 'Back', action: 'cancel' }] : []),
    ]);
    const top = y + 6 + (title ? LINE + 2 : 0);
    this.group.add(panel(scene, x, y, w, top - y + items.length * LINE + 5));
    if (title) this.group.add(text(scene, x + 8, y + 5, title, INK.gold));
    this.rows = items.map((it, i) => {
      const t = this.group.add(text(scene, x + 22, top + i * LINE, it.label, it.off ? INK.off : it.tint ?? INK.white));
      const zone = this.group.add(pin(scene.add.zone(x + 4, top + i * LINE - 1, w - 8, LINE).setOrigin(0), 3)).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => this.move(i));
      zone.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); this.move(i); this.onPick?.(i); });
      return t;
    });
    this.cursor = this.group.add(icon(scene, x + 10, top, 'caretR'));
    this.top = top;
    this.nudge = scene.tweens.add({ targets: this.cursor, x: x + 12, duration: 280, yoyo: true, repeat: -1 });
    this.handler = actions.push({
      up: () => this.move((this.index + items.length - 1) % items.length),
      down: () => this.move((this.index + 1) % items.length),
      confirm: () => this.onPick?.(this.index),
      cancel: () => this.onCancel?.(),
    });
    this.move(index, true);
  }

  move(i, quiet = false) {
    if (i === this.index && !quiet) return;
    this.index = i;
    this.cursor.y = this.top + i * LINE + 6;
    if (!quiet) this.onMove?.(i);
  }

  close() {
    this.nudge.remove();
    this.actions.pop(this.handler);
    if (this.buttons) this.hints.pop(this.buttons);
    this.group.clear();
  }
}

// Resolves with the index picked, or -1 when backed out of.
export const choose = (scene, actions, opts) => new Promise((resolve) => {
  const m = new Menu(scene, actions, {
    ...opts,
    onPick: (i) => { m.close(); resolve(i); },
    onCancel: () => { m.close(); resolve(-1); },
  });
});

// The text box along the bottom of the screen, just above the button bar. say() types a message out and resolves when
// the player has read it; the box stays up until close(), so a choice can follow a line.
export class Dialog {
  constructor(scene, actions, hints) {
    Object.assign(this, { scene, actions, hints, group: new Group() });
    const x = 8, w = VIEW_W - 16, h = 44, y = VIEW_H - BAR_H - h - 3;
    this.group.add(panel(scene, x, y, w, h));
    this.body = this.group.add(text(scene, x + 10, y + 7, ''));
    this.width = w - 22;
    this.more = this.group.add(icon(scene, x + w - 12, y + h - 10, 'caretDown').setVisible(false));
    this.bob = scene.tweens.add({ targets: this.more, y: y + h - 8, duration: 300, yoyo: true, repeat: -1 });
    this.click = () => { if (this.actions.top === this.handler) this.advance?.(); };
    scene.input.on('pointerdown', this.click);
  }

  say(str) {
    // wrap once up front so words do not jump lines as they are typed
    const full = this.body.setMaxWidth(this.width).setText(str).getTextBounds().wrappedText;
    this.body.setMaxWidth(0).setText('');
    this.more.setVisible(false);
    return new Promise((resolve) => {
      let shown = 0;
      const done = () => { shown = full.length; this.body.setText(full); this.more.setVisible(true); this.typing?.remove(); };
      this.typing = this.scene.time.addEvent({
        delay: 18, loop: true,
        callback: () => { if (++shown >= full.length) done(); else this.body.setText(full.slice(0, shown)); },
      });
      const buttons = this.hints?.push([{ icon: 'btnA', key: 'Enter', label: 'Next', action: 'confirm' }]);
      this.advance = () => {
        if (shown < full.length) return done();
        this.actions.pop(this.handler);
        if (buttons) this.hints.pop(buttons);
        this.handler = this.advance = null;
        this.more.setVisible(false);
        resolve();
      };
      this.handler = this.actions.push({ confirm: () => this.advance(), cancel: () => this.advance() });
    });
  }

  close() {
    this.typing?.remove();
    this.bob.remove();
    this.scene.input.off('pointerdown', this.click);
    if (this.handler) this.actions.pop(this.handler);
    this.group.clear();
  }
}

// Asks for a room code: four letters typed on the keyboard. Resolves with the code, or null when backed out of.
export const enterCode = (scene, actions, hints, length = 4) => new Promise((resolve) => {
  const g = new Group(), w = 150, h = 50, x = (VIEW_W - w) >> 1, y = 60;
  g.add(panel(scene, x, y, w, h));
  g.add(text(scene, VIEW_W / 2, y + 7, 'Room code', INK.gold).setOrigin(0.5, 0));
  const cells = Array.from({ length }, (_, i) => {
    const cx = VIEW_W / 2 + (i - (length - 1) / 2) * 22;
    g.add(panel(scene, cx - 9, y + 22, 18, 20, 'dim').setDepth(DEPTH + 1));
    return g.add(text(scene, cx, y + 26, '').setOrigin(0.5, 0));
  });
  let code = '';
  const show = () => cells.forEach((c, i) => c.setText(code[i] ?? ''));
  const buttons = hints?.push([
    { key: 'A-Z', label: 'Type the code' },
    { icon: 'btnA', key: 'Enter', label: 'Join', action: 'confirm' },
    { icon: 'btnB', key: 'Esc', label: 'Back', action: 'cancel' },
  ]);
  const done = (value) => {
    actions.pop(handler);
    if (buttons) hints.pop(buttons);
    g.clear();
    resolve(value);
  };
  const handler = actions.push({
    type: (ch) => { if (code.length < length) { code += ch; show(); } },
    erase: () => { code = code.slice(0, -1); show(); },
    confirm: () => { if (code.length === length) done(code); },
    cancel: () => done(null),
  });
});

// A banner that slides in from the top, holds and leaves: area names, battle starts.
export function banner(scene, title, sub) {
  const w = Math.max(120, 30 + Math.max(title.length, (sub ?? '').length) * 6), x = (VIEW_W - w) >> 1, h = sub ? 34 : 22;
  const parts = [panel(scene, x, 0, w, h, 'dim'), text(scene, VIEW_W / 2, 6, title, INK.gold).setOrigin(0.5, 0)];
  if (sub) parts.push(text(scene, VIEW_W / 2, 19, sub, INK.white).setOrigin(0.5, 0));
  parts.forEach((p, i) => p.setDepth(DEPTH - 20 + Math.min(i, 1))); // under any window that opens meanwhile
  parts.forEach((p) => { p.y -= 44; });
  scene.tweens.add({
    targets: parts, y: '+=48', duration: 260, ease: 'Sine.easeOut', hold: 1700, yoyo: true,
    onComplete: () => parts.forEach((p) => p.destroy()),
  });
}
