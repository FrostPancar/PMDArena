import { VIEW_W, VIEW_H } from '../scene.js';
import { MOVES } from '../moves.js';
import { SPECIES } from '../sprites.js';
import { NOTCH, NOTCHES } from '../mon.js';
import { typeOf } from './moveinfo.js';
import { touch } from './touch.js';
import { DEPTH, INK, text, typeIcon, panel, shade } from './ui.js';

const PLATE_W = 104, BAR_W = PLATE_W - 10;
const CHIP_W = 30, CHIP_H = 17;
// what each of the four moves is on: two mouse buttons, two keys
const BUTTONS = [{ art: 'mouseL', say: 'Left click' }, { art: 'mouseR', say: 'Right click' }, { key: 'Q', say: 'Q' }, { key: 'E', say: 'E' }];

const pinned = (o, depth = 2) => o.setScrollFactor(0).setDepth(DEPTH + depth);

// What the player sees during a fight, kept small so the arena stays in view: a slim plate top left with the mon's
// health and stamina, and along the bottom edge one chip per battle move showing the button it is on. The move being
// charged (or last used, or under the mouse) is named beside the chips; all four are listed for the first seconds.
// On a touch screen the moves are the pad's own buttons (touch.js), each with its name on it, so only the plate is drawn.
export class BattleHud {
  constructor(scene, mon, moves) {
    Object.assign(this, { scene, mon, moves, hover: -1 });
    const sp = mon.species, before = new Set(scene.children.list);
    // everything made from here on is the HUD's, so it can be taken down again when a crew's next mon comes out
    this.build(sp);
    this.parts = scene.children.list.filter((o) => !before.has(o));
  }

  build(sp) {
    const { scene, moves } = this;

    panel(scene, 3, 3, PLATE_W, 27, 'dim');
    typeIcon(scene, 12, 11, sp.type);
    text(scene, 21, 5, sp.name, INK.gold);
    this.hpText = text(scene, PLATE_W - 2, 5, '', INK.white).setOrigin(1, 0);
    shade(scene, 7, 18, BAR_W + 2, 9, 0x06101c, 1).setDepth(DEPTH + 1);
    this.hp = shade(scene, 8, 19, BAR_W, 4, 0x58d858, 1).setDepth(DEPTH + 2);
    // energy: one cell per notch, the one refilling shown part-way and dim until it is whole
    const cw = (BAR_W + 1) / NOTCHES;
    this.st = Array.from({ length: NOTCHES }, (_, i) => shade(scene, 8 + Math.round(i * cw), 24, Math.round((i + 1) * cw) - Math.round(i * cw) - 1, 2, 0xf2c94c, 1).setDepth(DEPTH + 2));
    this.stW = this.st.map((c) => c.displayWidth);
    this.buffs = text(scene, 5, 32, '', INK.dim);
    this.last = {};
    this.chips = [];
    if (touch.on) return;

    const y = VIEW_H - CHIP_H - 3;
    this.chips = moves.map((id, i) => {
      const x = 3 + i * (CHIP_W + 1), b = BUTTONS[i];
      const chip = {
        idle: panel(scene, x, y, CHIP_W, CHIP_H, 'dim'),
        hot: panel(scene, x, y, CHIP_W, CHIP_H, 'hot'),
        type: typeIcon(scene, x + 21, y + 8, typeOf(id)),
      };
      if (b.art) pinned(scene.add.image(x + 8, y + 8, b.art));
      else text(scene, x + 5, y + 3, b.key, INK.gold);
      // over the HUD the mouse names the move instead of using it
      chip.idle.setInteractive().on('pointerover', () => { this.hover = i; }).on('pointerout', () => { if (this.hover === i) this.hover = -1; })
        .on('pointerdown', (_p, _x, _y, e) => e.stopPropagation());
      return chip;
    });
    const nx = 3 + moves.length * (CHIP_W + 1) + 4;
    this.name = text(scene, nx, y + 3, '');
    this.cost = text(scene, nx, y + 3, '', INK.sky);

    // the opening reminder of what is on which button
    const h = moves.length * 13 + 9, top = y - h - 2;
    this.intro = [panel(scene, 3, top, 126, h, 'dim')];
    moves.forEach((id, i) => {
      this.intro.push(text(scene, 9, top + 5 + i * 13, BUTTONS[i].say, INK.gold), text(scene, 66, top + 5 + i * 13, MOVES[id].name));
    });
    scene.time.delayedCall(6000, () => !this.gone && scene.tweens.add({ targets: this.intro, alpha: 0, duration: 500 }));
  }

  destroy() {
    this.gone = true;
    for (const o of this.parts) o.destroy();
  }

  // Only touches a text object when what it shows has changed.
  set(obj, key, value) {
    if (this.last[key] === value) return false;
    this.last[key] = value;
    obj.setText(value);
    return true;
  }

  // charging: the slot being wound up or held right now (-1 for none); recent: the slot last used.
  refresh(charging, recent) {
    const m = this.mon, frac = m.hp / m.maxHp;
    this.hp.setDisplaySize(Math.max(frac > 0 ? 1 : 0.001, Math.round(BAR_W * frac)), 4).setTint(frac > 0.5 ? 0x58d858 : frac > 0.2 ? 0xf2c94c : 0xef5a4a);
    this.st.forEach((c, i) => {
      const fill = Math.min(1, Math.max(0, m.stamina / NOTCH - i));
      c.setDisplaySize(Math.max(0.001, Math.round(this.stW[i] * fill)), 2).setTint(m.exhausted ? 0xef5a4a : fill >= 1 ? 0xf2c94c : 0x8a7430);
    });
    this.set(this.hpText, 'hp', String(Math.ceil(m.hp)));
    const buffs = m.buffText();
    this.set(this.buffs, 'buffs', buffs === '-' ? '' : buffs.replace(/↑/g, '+').replace(/↓/g, '-'));
    if (!this.chips.length) return;
    this.chips.forEach((c, i) => {
      c.hot.setVisible(i === charging);
      c.type.setAlpha(m.stamina >= MOVES[this.moves[i]].cost ? 1 : 0.35); // faded: not enough stamina
    });
    const shown = this.hover >= 0 ? this.hover : charging >= 0 ? charging : recent;
    const mv = MOVES[this.moves[shown]], can = m.stamina >= mv.cost;
    if (this.set(this.name, 'name', mv.name)) this.cost.setText(mv.cost < NOTCH ? '1/2' : String(mv.cost / NOTCH)).setX(this.name.x + this.name.width + 6);
    this.name.setTint(can ? INK.white : INK.off);
    this.cost.setTint(can ? INK.sky : INK.rose);
  }
}

// The score, top centre: a pip for each fight a side has to win, lit as they are won (yours on the left, in blue).
// In a crew battle the pips are the mons each side has left instead.
export class ScoreStrip {
  constructor(scene, each) {
    const gap = 9, mid = VIEW_W / 2, w = 46 + each * gap * 2;
    panel(scene, mid - w / 2, 3, w, 15, 'dim');
    this.label = text(scene, mid, 5, '', INK.dim).setOrigin(0.5, 0);
    const pip = (x) => {
      shade(scene, x - 1, 7, 7, 7, 0x06101c, 1).setDepth(DEPTH + 1);
      return shade(scene, x, 8, 5, 5, 0xffffff, 1).setDepth(DEPTH + 2);
    };
    this.ours = Array.from({ length: each }, (_, i) => pip(mid - w / 2 + 6 + i * gap));
    this.theirs = Array.from({ length: each }, (_, i) => pip(mid + w / 2 - 11 - i * gap));
  }

  // ours / theirs: how many pips of each side are lit.
  set(label, ours, theirs) {
    const key = `${label} ${ours} ${theirs}`;
    if (key === this.shown) return;
    this.shown = key;
    this.label.setText(label);
    this.ours.forEach((p, i) => p.setTint(i < ours ? 0x8fdcff : 0x2a3c52));
    this.theirs.forEach((p, i) => p.setTint(i < theirs ? 0xff7a6a : 0x2a3c52));
  }
}

// The announcer: a dark band across the middle of the screen with a call in large letters (ROUND 1, FIGHT!, KO!) and a
// line under it. It opens, holds for `hold` ms and closes by itself.
export function callout(scene, title, sub, hold = 900, tint = INK.gold) {
  const cy = (VIEW_H >> 1) - 22, d = DEPTH - 30;
  const band = shade(scene, 0, cy, VIEW_W, sub ? 44 : 32, 0x06101c, 0.72).setOrigin(0, 0.5).setDepth(d);
  band.y = cy + band.displayHeight / 2;
  const rules = [-1, 1].map((k) => shade(scene, 0, band.y + (k * band.displayHeight) / 2 - (k > 0 ? 1 : 0), VIEW_W, 1, tint, 0.9).setDepth(d + 1));
  const big = pinned(scene.add.bitmapText(VIEW_W / 2, cy + 7, 'pmd', title.toUpperCase()).setOrigin(0.5, 0).setScale(2).setTint(tint)).setDepth(d + 2);
  const parts = [band, ...rules, big];
  if (sub) parts.push(text(scene, VIEW_W / 2, cy + 29, sub).setOrigin(0.5, 0).setDepth(d + 2));
  const letters = parts.slice(3), h = band.scaleY;
  band.scaleY = 0;
  for (const o of [...rules, ...letters]) o.setAlpha(0);
  for (const o of letters) o.x -= 40;
  scene.tweens.add({ targets: band, scaleY: h, duration: 110 });
  scene.tweens.add({ targets: rules, alpha: 0.9, duration: 110 });
  scene.tweens.add({ targets: letters, alpha: 1, x: '+=40', duration: 150, ease: 'Cubic.easeOut' });
  scene.time.delayedCall(hold, () => {
    scene.tweens.add({ targets: letters, alpha: 0, x: '+=40', duration: 130, ease: 'Cubic.easeIn' });
    scene.tweens.add({ targets: [band, ...rules], alpha: 0, delay: 80, duration: 120, onComplete: () => parts.forEach((o) => o.destroy()) });
  });
}

export const CONTROLS = [
  ['W A S D', 'Move'],
  ['Shift', 'Run (a burst; hold to keep going)'],
  ['Space', 'Jump over attacks'],
  ['Mouse', 'Aim'],
  ['Left click', 'Move 1'],
  ['Right click', 'Move 2'],
  ['Q / E', 'Moves 3 and 4'],
  ['R', 'Parry'],
  ['C', 'Call off a charging move'],
  ['Esc', 'Menu'],
];
// the same card for the touch pad
const PAD_CONTROLS = [
  ['D-pad', 'Move'],
  ['Push it to the rim', 'Run'],
  ['Move buttons', 'Aimed at the nearest foe'],
  ['Drag a move', 'Aim it yourself'],
  ['Jump', 'Jump over attacks'],
  ['Parry', 'Parry, or call off a move'],
  ['Menu', 'Pause'],
];

// The controls card. Returns its objects so the caller can take it down again.
export function controlsCard(scene) {
  const rows = touch.on ? PAD_CONTROLS : CONTROLS, split = touch.on ? 104 : 88;
  const w = touch.on ? 262 : 230, h = 30 + rows.length * 13 + 22, x = (VIEW_W - w) >> 1, y = (VIEW_H - h) >> 1;
  const d = DEPTH + 10;
  const parts = [
    shade(scene, 0, 0, VIEW_W, VIEW_H, 0x000000, 0.5).setDepth(d),
    panel(scene, x, y, w, h).setDepth(d + 1),
    text(scene, VIEW_W / 2, y + 8, 'How to fight', INK.gold).setOrigin(0.5, 0).setDepth(d + 2),
    text(scene, VIEW_W / 2, y + h - 18, touch.on ? 'Tap to close' : 'Enter to close', INK.dim).setOrigin(0.5, 0).setDepth(d + 2),
  ];
  rows.forEach(([key, what], i) => {
    parts.push(text(scene, x + split, y + 26 + i * 13, key, INK.sky).setOrigin(1, 0).setDepth(d + 2));
    parts.push(text(scene, x + split + 10, y + 26 + i * 13, what).setDepth(d + 2));
  });
  return parts;
}

// What a finished fight earned: EXP, the level bar, and anything the new level brought (moves, a new form).
// `earned` is what session.bookBattle returned; `shown` is the face on it (the mon that earned it). Returns its objects.
export function resultCard(scene, species, earned, shown = scene.player.species.id) {
  const { exp, from, to, unlocked, evolved, ready } = earned;
  const lines = [];
  if (to.level > from.level) lines.push([`Level up!  Lv ${from.level} > Lv ${to.level}`, INK.gold]);
  for (const id of unlocked.slice(0, 3)) lines.push([`New move: ${MOVES[id].name}`, INK.mint]);
  if (unlocked.length > 3) lines.push([`...and ${unlocked.length - 3} more moves`, INK.mint]);
  if (evolved) lines.push([`${SPECIES[species].name} evolved into ${SPECIES[evolved].name}!`, INK.sky]);
  if (ready) lines.push([`${SPECIES[species].name} can evolve now!`, INK.sky], ['Pick its form back home.', INK.dim]);

  const w = 220, h = 62 + lines.length * 13 + 18, x = (VIEW_W - w) >> 1, y = (VIEW_H - h) >> 1, d = DEPTH + 10;
  const look = evolved ?? shown, barW = w - 70;
  const parts = [
    shade(scene, 0, 0, VIEW_W, VIEW_H, 0x000000, 0.45).setDepth(d),
    panel(scene, x, y, w, h).setDepth(d + 1),
    pinned(scene.add.image(x + 28, y + 28, `face-${look}`), 12),
    text(scene, x + 56, y + 8, SPECIES[look].name, INK.gold).setDepth(d + 2),
    text(scene, x + w - 10, y + 8, `+${exp} EXP`, INK.mint).setOrigin(1, 0).setDepth(d + 2),
    text(scene, x + 56, y + 23, `Lv ${to.level}`).setDepth(d + 2),
    text(scene, x + w - 10, y + 23, to.need ? `${to.into}/${to.need}` : 'MAX', INK.dim).setOrigin(1, 0).setDepth(d + 2),
    shade(scene, x + 55, y + 38, barW + 2, 6, 0x06101c, 1).setDepth(d + 2),
    shade(scene, x + 56, y + 39, Math.max(1, Math.round(barW * (to.need ? to.into / to.need : 1))), 4, 0x7ad8ff, 1).setDepth(d + 3),
    text(scene, VIEW_W / 2, y + h - 16, touch.on ? 'Tap to go on' : 'Enter to go on', INK.dim).setOrigin(0.5, 0).setDepth(d + 2),
  ];
  lines.forEach(([line, tint], i) => parts.push(text(scene, VIEW_W / 2, y + 54 + i * 13, line, tint).setOrigin(0.5, 0).setDepth(d + 2)));
  return parts;
}
