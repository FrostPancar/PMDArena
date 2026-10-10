import { VIEW_W, VIEW_H } from '../scene.js';
import { MOVES } from '../moves.js';
import { typeOf } from './moveinfo.js';
import { DEPTH, INK, text, typeIcon, panel, shade } from './ui.js';

const PLATE_W = 104, BAR_W = PLATE_W - 10;
const CHIP_W = 24, CHIP_H = 17;

// What the player sees during a fight, kept small so the arena stays in view: a slim plate top left with the mon's
// health and stamina, and along the bottom edge one chip per battle move with the chosen move named beside them.
export class BattleHud {
  constructor(scene, mon, moves, onSlot) {
    Object.assign(this, { scene, mon, moves });
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
      const x = 3 + i * (CHIP_W + 1);
      const chip = {
        idle: panel(scene, x, y, CHIP_W, CHIP_H, 'dim'),
        hot: panel(scene, x, y, CHIP_W, CHIP_H, 'hot'),
        type: typeIcon(scene, x + 16, y + 8, typeOf(id)),
      };
      text(scene, x + 4, y + 3, String(i + 1), INK.gold);
      chip.idle.setInteractive({ useHandCursor: true }).on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); onSlot(i); });
      return chip;
    });
    const nx = 3 + moves.length * (CHIP_W + 1) + 4;
    this.name = text(scene, nx, y + 3, '');
    this.cost = text(scene, nx, y + 3, '', INK.sky);
    this.last = {};
  }

  // Only touches a text object when what it shows has changed.
  set(obj, key, value) {
    if (this.last[key] === value) return false;
    this.last[key] = value;
    obj.setText(value);
    return true;
  }

  refresh(slot) {
    const m = this.mon, frac = m.hp / m.maxHp;
    this.hp.setDisplaySize(Math.max(frac > 0 ? 1 : 0.001, Math.round(BAR_W * frac)), 4).setTint(frac > 0.5 ? 0x58d858 : frac > 0.2 ? 0xf2c94c : 0xef5a4a);
    this.st.setDisplaySize(Math.max(0.001, Math.round((BAR_W * m.stamina) / m.maxStamina)), 2).setTint(m.exhausted ? 0xef5a4a : 0xf2c94c);
    this.set(this.hpText, 'hp', String(Math.ceil(m.hp)));
    const buffs = m.buffText();
    this.set(this.buffs, 'buffs', buffs === '-' ? '' : buffs.replace(/↑/g, '+').replace(/↓/g, '-'));
    this.chips.forEach((c, i) => {
      c.hot.setVisible(i === slot);
      c.type.setAlpha(m.stamina >= MOVES[this.moves[i]].cost ? 1 : 0.35); // faded: not enough stamina
    });
    const mv = MOVES[this.moves[slot]], can = m.stamina >= mv.cost;
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
  ['Left click', 'Quick shot'],
  ['Right click', 'Use the chosen move'],
  ['1 - 4', 'Choose a move'],
  ['Q', 'Next move'],
  ['E', 'Parry'],
  ['Esc', 'Menu'],
];

// The controls card. Returns its objects so the caller can take it down again.
export function controlsCard(scene) {
  const w = 220, h = 30 + CONTROLS.length * 13 + 22, x = (VIEW_W - w) >> 1, y = (VIEW_H - h) >> 1;
  const d = DEPTH + 10;
  const parts = [
    shade(scene, 0, 0, VIEW_W, VIEW_H, 0x000000, 0.5).setDepth(d),
    panel(scene, x, y, w, h).setDepth(d + 1),
    text(scene, VIEW_W / 2, y + 8, 'How to fight', INK.gold).setOrigin(0.5, 0).setDepth(d + 2),
    text(scene, VIEW_W / 2, y + h - 18, 'Enter to close', INK.dim).setOrigin(0.5, 0).setDepth(d + 2),
  ];
  CONTROLS.forEach(([key, what], i) => {
    parts.push(text(scene, x + 92, y + 26 + i * 13, key, INK.sky).setOrigin(1, 0).setDepth(d + 2));
    parts.push(text(scene, x + 102, y + 26 + i * 13, what).setDepth(d + 2));
  });
  return parts;
}
