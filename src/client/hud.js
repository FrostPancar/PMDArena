import { VIEW_W, VIEW_H } from '../scene.js';
import { MOVES } from '../moves.js';
import { SPECIES } from '../sprites.js';
import { typeOf } from './moveinfo.js';
import { DEPTH, INK, text, typeIcon, panel, shade } from './ui.js';

const PLATE_W = 104, BAR_W = PLATE_W - 10;
const CHIP_W = 30, CHIP_H = 17;
// what each of the four moves is on: two mouse buttons, two keys
const BUTTONS = [{ art: 'mouseL', say: 'Left click' }, { art: 'mouseR', say: 'Right click' }, { key: 'Q', say: 'Q' }, { key: 'E', say: 'E' }];

const pinned = (o, depth = 2) => o.setScrollFactor(0).setDepth(DEPTH + depth);

// What the player sees during a fight, kept small so the arena stays in view: a slim plate top left with the mon's
// health and stamina, and along the bottom edge one chip per battle move showing the button it is on. The move being
// charged (or last used, or under the mouse) is named beside the chips; all four are listed for the first seconds.
export class BattleHud {
  constructor(scene, mon, moves) {
    Object.assign(this, { scene, mon, moves, hover: -1 });
    const sp = mon.species;

    panel(scene, 3, 3, PLATE_W, 27, 'dim');
    typeIcon(scene, 12, 11, sp.type);
    text(scene, 21, 5, sp.name, INK.gold);
    this.hpText = text(scene, PLATE_W - 2, 5, '', INK.white).setOrigin(1, 0);
    shade(scene, 7, 18, BAR_W + 2, 9, 0x06101c, 1).setDepth(DEPTH + 1);
    this.hp = shade(scene, 8, 19, BAR_W, 4, 0x58d858, 1).setDepth(DEPTH + 2);
    this.st = shade(scene, 8, 24, BAR_W, 2, 0xf2c94c, 1).setDepth(DEPTH + 2);
    this.buffs = text(scene, 5, 32, '', INK.dim);

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
    scene.time.delayedCall(6000, () => scene.tweens.add({ targets: this.intro, alpha: 0, duration: 500 }));
    this.last = {};
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
    this.st.setDisplaySize(Math.max(0.001, Math.round((BAR_W * m.stamina) / m.maxStamina)), 2).setTint(m.exhausted ? 0xef5a4a : 0xf2c94c);
    this.set(this.hpText, 'hp', String(Math.ceil(m.hp)));
    const buffs = m.buffText();
    this.set(this.buffs, 'buffs', buffs === '-' ? '' : buffs.replace(/↑/g, '+').replace(/↓/g, '-'));
    this.chips.forEach((c, i) => {
      c.hot.setVisible(i === charging);
      c.type.setAlpha(m.stamina >= MOVES[this.moves[i]].cost ? 1 : 0.35); // faded: not enough stamina
    });
    const shown = this.hover >= 0 ? this.hover : charging >= 0 ? charging : recent;
    const mv = MOVES[this.moves[shown]], can = m.stamina >= mv.cost;
    if (this.set(this.name, 'name', mv.name)) this.cost.setText(String(mv.cost)).setX(this.name.x + this.name.width + 6);
    this.name.setTint(can ? INK.white : INK.off);
    this.cost.setTint(can ? INK.sky : INK.rose);
  }
}

export const CONTROLS = [
  ['W A S D', 'Move'],
  ['Shift', 'Run'],
  ['Space', 'Jump over attacks'],
  ['Mouse', 'Aim'],
  ['Left click', 'Move 1'],
  ['Right click', 'Move 2'],
  ['Q / E', 'Moves 3 and 4'],
  ['R', 'Parry'],
  ['C', 'Call off a charging move'],
  ['Esc', 'Menu'],
];

// The controls card. Returns its objects so the caller can take it down again.
export function controlsCard(scene) {
  const w = 230, h = 30 + CONTROLS.length * 13 + 22, x = (VIEW_W - w) >> 1, y = (VIEW_H - h) >> 1;
  const d = DEPTH + 10;
  const parts = [
    shade(scene, 0, 0, VIEW_W, VIEW_H, 0x000000, 0.5).setDepth(d),
    panel(scene, x, y, w, h).setDepth(d + 1),
    text(scene, VIEW_W / 2, y + 8, 'How to fight', INK.gold).setOrigin(0.5, 0).setDepth(d + 2),
    text(scene, VIEW_W / 2, y + h - 18, 'Enter to close', INK.dim).setOrigin(0.5, 0).setDepth(d + 2),
  ];
  CONTROLS.forEach(([key, what], i) => {
    parts.push(text(scene, x + 88, y + 26 + i * 13, key, INK.sky).setOrigin(1, 0).setDepth(d + 2));
    parts.push(text(scene, x + 98, y + 26 + i * 13, what).setDepth(d + 2));
  });
  return parts;
}

// What a finished fight earned: EXP, the level bar, and anything the new level brought (moves, a new form).
// `earned` is what session.bookBattle returned. Returns its objects.
export function resultCard(scene, species, earned) {
  const { exp, from, to, unlocked, evolved } = earned;
  const lines = [];
  if (to.level > from.level) lines.push([`Level up!  Lv ${from.level} > Lv ${to.level}`, INK.gold]);
  for (const id of unlocked.slice(0, 3)) lines.push([`New move: ${MOVES[id].name}`, INK.mint]);
  if (unlocked.length > 3) lines.push([`...and ${unlocked.length - 3} more moves`, INK.mint]);
  if (evolved) lines.push([`${SPECIES[species].name} evolved into ${SPECIES[evolved].name}!`, INK.sky]);

  const w = 220, h = 62 + lines.length * 13 + 18, x = (VIEW_W - w) >> 1, y = (VIEW_H - h) >> 1, d = DEPTH + 10;
  const look = evolved ?? scene.player.species.id, barW = w - 70;
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
    text(scene, VIEW_W / 2, y + h - 16, 'Enter to go on', INK.dim).setOrigin(0.5, 0).setDepth(d + 2),
  ];
  lines.forEach(([line, tint], i) => parts.push(text(scene, VIEW_W / 2, y + 54 + i * 13, line, tint).setOrigin(0.5, 0).setDepth(d + 2)));
  return parts;
}
