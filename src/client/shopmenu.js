import { MOVES } from '../moves.js';
import { branchOf, LOADOUT_SIZE } from './session.js';
import { unlockPlan, tmsFor, strength } from './progress.js';
import { typeOf } from './moveinfo.js';
import { sfx } from './sfx.js';
import { MoveMenu, LIST, SLOTS, tmTint } from './movemenu.js';
import { INK, icon, panel, text } from './ui.js';

// The Survivor shop. A run starts with one move and buys the rest with the coins its foes drop: after each wave the
// shop has three of the moves the mon could learn (by level or by TM, whatever its level and whatever TMs have been
// found), the stronger the dearer. A wave brings in about three coins, so one wave pays for an ordinary move or a
// status move, and a wave saved up pays for one of the strongest.
export const OFFERS = 3;
export const REROLL = 1; // coins for three new moves
const REROLL_ROW = 'reroll'; // the list row that rerolls (not a move id)
const ABOVE_HUD = 10; // the shop opens over a fight: it is lifted over the battle HUD (which shares the menus' depths)

// What a move costs: a support or status move 3; an attack 2 to 6 by how strong it is (progress.js's measure, the
// one that also orders a mon's unlocks).
export function priceOf(id) {
  const mv = MOVES[id];
  if (mv.kind === 'self' || (mv.dmg ?? 0) < 8) return 3;
  const s = strength(mv);
  return s < 20 ? 2 : s < 32 ? 3 : s < 38 ? 5 : 6;
}

// Three moves the mon could learn that the run does not have yet (fewer when it is running out).
export function rollShop(species, owned) {
  const branch = branchOf(species);
  const pool = [...new Set([...unlockPlan(species, branch).map((m) => m.id), ...tmsFor(species, branch)])].filter((id) => MOVES[id] && !owned.includes(id));
  const offers = [];
  while (offers.length < OFFERS && pool.length) offers.push(...pool.splice(Math.floor(Math.random() * pool.length), 1));
  return offers;
}

// The move menu, laid out for the shop: at the top of the list the moves on offer with their prices and a row that
// rerolls them; under a rule, the moves bought this run, from which the four battle moves are picked. The coins are
// where the menu shows how many slots are filled. Done goes on to the next wave.
//   run: { coins, owned, offers, picked } (changed in place); onBuy(id) after a move is bought; onClose(picked)
export class ShopMenu extends MoveMenu {
  constructor(scene, actions, opts) {
    super(scene, actions, opts);
    const add = (o) => this.group.add(o);
    this.head.setText(opts.title ?? 'Shop');
    this.coin = add(icon(scene, 0, LIST.y + 10, 'coin').setScale(0.75));
    // the way on, for the mouse (the keys and the pad's B do the same)
    const bx = SLOTS.x + SLOTS.w - 86, by = SLOTS.y + 3;
    add(panel(scene, bx, by, 82, 15, 'hot').setInteractive({ useHandCursor: true })).on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); this.close(); });
    add(text(scene, bx + 5, by + 2, 'Esc', INK.gold));
    add(text(scene, bx + 24, by + 2, 'Next wave'));
    for (const o of this.group.items.map((q) => q.img ?? q)) o.setDepth(o.depth + ABOVE_HUD); // (a Meter is drawn by its img)
    this.refresh();
  }

  get shopRows() { return this.run.offers.length + 1; } // the offers and the reroll row

  list() {
    const { run } = this;
    this.moves = [...run.offers, REROLL_ROW, ...run.owned];
    this.spare = [];
    this.firstTM = this.shopRows; // the rule: the shop above, the run's moves below
    this.firstSpare = this.moves.length;
    this.picked ??= [...run.picked];
  }

  locked() { return false; }

  refresh() {
    super.refresh();
    if (!this.coin) return; // (the first refresh, from the menu being built)
    this.count.setText(String(this.run.coins)).setTint(INK.gold);
    this.coin.setX(this.count.x - this.count.width - 8);
  }

  drawRow(row, i) {
    if (i >= this.shopRows) {
      super.drawRow(row, i);
      row.fresh.setVisible(false);
      return;
    }
    const id = this.moves[i], reroll = id === REROLL_ROW, price = reroll ? REROLL : priceOf(id), short = price > this.run.coins;
    const disc = !reroll && !!this.tm[id];
    row.slot.setText('');
    row.lock.setVisible(false);
    row.type.setVisible(!reroll);
    if (!reroll) row.type.setTexture('art-types', typeOf(id)).setAlpha(short ? 0.45 : 1);
    row.tm.setVisible(disc).setAlpha(short ? 0.45 : 1).setTint(tmTint(id));
    row.name.x = LIST.x + (reroll ? 12 : disc ? 50 : 37);
    row.name.setText(reroll ? 'Reroll the shop' : MOVES[id].name).setTint(short ? INK.off : reroll ? INK.sky : INK.white);
    row.needs.setText(String(price)).setTint(short ? INK.rose : INK.gold);
    row.fresh.setTexture('art-icons', 'coin').setScale(0.75).setX(LIST.x + LIST.w - 12).setVisible(true);
  }

  toggle() {
    const n = this.run.offers.length;
    if (this.index < n) return this.buy(this.moves[this.index]);
    if (this.index === n) return this.reroll();
    super.toggle(); // one of the run's moves: into the battle slots, or out of them
  }

  buy(id) {
    const { run } = this, price = priceOf(id);
    if (price > run.coins) { sfx.play('denied'); return this.say(`${MOVES[id].name} costs ${price}. You have ${run.coins}.`); }
    run.coins -= price;
    run.offers = run.offers.filter((m) => m !== id);
    run.owned.push(id);
    if (this.picked.length < LOADOUT_SIZE) this.picked.push(id);
    sfx.play('power_up');
    this.onBuy?.(id);
    this.relist();
    this.say(`Learned ${MOVES[id].name}!`);
  }

  reroll() {
    const { run } = this;
    if (REROLL > run.coins) { sfx.play('denied'); return this.say(`A reroll costs ${REROLL}.`); }
    run.coins -= REROLL;
    run.offers = rollShop(this.species, run.owned);
    sfx.play('ui_pick');
    this.relist();
  }

  relist() {
    this.list();
    this.index = Math.min(this.index, this.moves.length - 1);
    this.clock = 0;
    this.refresh();
  }

  close() {
    if (!this.picked.length) return this.say('Take at least one move into battle.');
    this.run.picked = [...this.picked];
    this.teardown();
  }
}
