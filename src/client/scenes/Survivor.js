import { Play, VIEW_W } from '../../scene.js';
import { MOVES, loadMoves, moveReady } from '../../moves.js';
import { SPECIES, SPECIES_ORDER, ensureSpecies } from '../../sprites.js';
import { Mon, BASE_HP } from '../../mon.js';
import { go } from '../transition.js';
import { session, saveSession, bookBattle, chestTM } from '../session.js';
import { ME, lookOf, arenaName } from '../modes.js';
import { survivorBattle, BOSS, BOSSES } from '../bosses.js';
import { cpuAt, MAX_LEVEL } from '../ladder.js';
import { battleExp } from '../progress.js';
import { Actions } from '../input.js';
import { CpuController } from '../controllers.js';
import { BattleHud, callout } from '../hud.js';
import { Battle } from './Battle.js';
import { Practice } from './Practice.js';
import { INK, banner, text, icon } from '../ui.js';
import { music } from '../music.js';
import { sfx } from '../sfx.js';
import { ShopMenu, rollShop } from '../shopmenu.js';

// What a wave is made of: how many mons, the share of a mon's usual health each has, and how hard each hits (a crowd
// hits softer). One is picked at random.
const WAVES = [[3, 0.25, 0.5], [2, 0.5, 0.75], [1, 1, 1]];
const BOSS_EVERY = 10; // every tenth wave is a single legendary
const PER_LEVEL = 2; // waves beaten before the CPUs go up a level
const CHEST_EVERY = 5; // waves beaten for a chest with a TM in it
const NEXT_WAVE = 1000; // ms from the last of a wave going down to the next coming in
const HEAL = 0.3; // the share of your health that comes back with each wave beaten
// EXP: nothing for no waves, twice a usual fight against the computer for fifteen or more, and in step between
const EXP_CAP = 15, USUAL_EXP = battleExp({ won: true, dealt: 1, kept: 0.5, seconds: 60 });
const FOE_TAG = 0xff7a6a;
const CHEST_REACH = 14; // how near the player must come to a chest to open it
// A run starts with one plain attack any mon could know, and buys the rest in the shop (shopmenu.js).
const STARTERS = ['quickAttack', 'swift'];
const COINS_EACH = { 1: 3, 2: 2, 3: 1 }; // what each foe drops, by how many came in its wave
const SHOP_AFTER = 1300; // ms from a wave beaten to the shop opening (the coins are in by then)
const LEGEND_HP = 250, LEGEND_COINS = 5; // a legendary's health, and the coins it drops
const COIN_WAIT = 0.45, COIN_REACH = 8; // seconds a dropped coin lies before it flies to the player; how near it is taken

// Survivor: you alone on a stage, and wave after wave of CPUs until you go down. No rounds: the next wave comes in a
// second after the last of the one before is beaten. Every two waves beaten the CPUs go up a level; every five, a
// chest with a TM is left on the stage, and nothing more comes until it is picked up; every tenth wave is a legendary.
// What counts is the number of waves beaten.
// The mon comes in with a single move. Every foe that goes down drops coins (3 from a wave of one, 2 each from a wave
// of two, 1 each from a wave of three), and after each wave the shop opens: moves to buy, and the four to fight with
// picked from those bought so far. What is bought lasts the run.
export class Survivor extends Battle {
  constructor() { super('survivor'); }

  init(data) {
    const battle = data?.battle ?? survivorBattle(), starter = STARTERS[Math.floor(Math.random() * STARTERS.length)];
    battle.fighters.find((f) => f.kind === 'human').moves = [starter];
    super.init({ battle });
    this.run = { coins: 0, owned: [starter], offers: [], picked: [starter] }; // the shop's (see ShopMenu)
    this.coinsOut = []; // { img, t } coins dropped and not yet taken
    this.beaten = 0; // waves defeated
    this.kos = 0;
    this.waveOut = false; // a wave is on the stage and has not been counted as beaten yet
    this.loot = null; // { x, y, img } a chest lying on the stage, waiting to be picked up
    this.leaveLabel = 'End the run';
  }

  create() {
    for (const f of this.cfg.fighters) ensureSpecies(this, lookOf(f));
    this.actions = new Actions(this);
    music.stage(this.mapId);
    Play.prototype.create.call(this); // the stage, the player, input: without Battle's rounds and online handling
    this.label = 'Survivor';
    this.hud = new BattleHud(this, this.player, this.me.moves);
    this.player.kit = this.moves;
    this.menuTab();
    this.tally = text(this, VIEW_W / 2, 5, '', INK.gold).setOrigin(0.5, 0);
    this.showTally();
    this.purse = { coin: icon(this, 0, 23, 'coin').setScale(0.75), count: text(this, 0, 18, '', INK.gold) };
    this.showPurse();
    this.events.once('create', () => {
      const start = () => { banner(this, arenaName(this.cfg), 'Survivor', true); this.begin(); };
      if (session.briefed.controls) return start();
      session.briefed.controls = true;
      saveSession();
      this.showControls(start);
    });
  }

  get waveLevel() { return Math.min(MAX_LEVEL, 1 + Math.floor(this.beaten / PER_LEVEL)); }
  showTally() { this.tally.setText(`Waves ${this.beaten}   Lv ${this.waveLevel}`); }
  showPurse() {
    const { coin, count } = this.purse;
    count.setText(String(this.run.coins));
    coin.setX(Math.round(VIEW_W / 2 - count.width / 2 - 1));
    count.setX(coin.x + 7);
  }

  // no rounds here, and nothing to call: the first wave is on its way
  begin() {
    this.started = true;
    this.time.delayedCall(NEXT_WAVE, () => this.spawnWave());
  }
  checkOutcome() {}

  // The next wave: its mons are chosen now and come in as soon as their sprites and their moves' art are in.
  spawnWave() {
    if (this.over) return;
    const boss = (this.beaten + 1) % BOSS_EVERY === 0 && BOSSES.length ? BOSSES[Math.floor(Math.random() * BOSSES.length)] : null;
    const [n, share, power] = boss ? [1, 1, 1] : WAVES[Math.floor(Math.random() * WAVES.length)], level = boss ? BOSS.skill : this.waveLevel;
    const pool = SPECIES_ORDER.filter((id) => id !== this.me.species), picks = [];
    while (!boss && picks.length < n) { const id = pool[Math.floor(Math.random() * pool.length)]; if (!picks.includes(id)) picks.push(id); }
    const specs = boss ? [{ species: boss.id, moves: boss.moves }] : picks.map((id) => cpuAt(id, level));
    const moves = specs.flatMap((s) => s.moves);
    const arrive = () => {
      if (this.over) return;
      const ready = specs.map((s) => ensureSpecies(this, lookOf(s))).every(Boolean) && moves.every((id) => moveReady(this, MOVES[id])); // (every species is asked for, not just the first missing)
      if (!ready) {
        if (loadMoves(this, moves)) this.load.start();
        return void this.time.delayedCall(150, arrive);
      }
      this.waveOut = true;
      for (const spec of specs) {
        const [x, y] = Practice.prototype.spotNear.call(this) ?? [this.player.x + 60, this.player.y];
        const f = { slot: this.fighters.length + 10 + this.kos, team: 1, kind: 'cpu', owner: ME, skill: level, ...spec };
        const mon = new Mon(this, x, y, { team: 'n', species: lookOf(spec), move: spec.moves[0], hp: boss ? LEGEND_HP : Math.max(1, Math.round(BASE_HP * share)), power });
        Object.assign(mon, { kit: spec.moves, slot: f.slot, invuln: 0.6, purse: boss ? LEGEND_COINS : COINS_EACH[specs.length] });
        if (boss) { mon.sprite.setScale(BOSS.scale); mon.shadow.setScale(BOSS.scale); }
        this.npcs.push(mon);
        mon.face(this.player.x, this.player.y);
        this.ringPop(x, y - 8, 10);
        const tag = this.add.image(x, y, 'tag').setTint(FOE_TAG).setDepth(9003);
        this.fighters.push({ f, mon, controller: new CpuController(this, mon, f), tag, name: null, crew: null, at: 0 });
      }
      if (boss) banner(this, `Wave ${this.beaten + 1}`, 'A legendary appears!', true);
    };
    arrive();
  }

  // A foe that goes down is gone; the last of a wave brings the next. The player going down ends the run.
  fainted(m) {
    if (m.summon || this.over) return;
    if (m === this.player) return this.finish();
    this.kos++;
    this.dropCoins(m);
    this.time.delayedCall(700, () => this.remove(m));
    // (the mons of a wave may go down together: it is beaten once, when the first of them finds nobody left standing)
    if (this.waveOut && !this.npcs.some((n) => n !== m && n.alive && !n.summon && n.team === 'n')) { this.waveOut = false; this.waveBeaten(); }
  }

  remove(m) {
    const x = this.fighters.find((q) => q.mon === m);
    x?.tag?.destroy();
    this.fighters = this.fighters.filter((q) => q.mon !== m);
    this.npcs = this.npcs.filter((n) => n !== m);
    m.destroy?.();
  }

  // The coins a foe had burst out where it fell; a moment later they fly to the player (see update).
  dropCoins(m) {
    for (let i = 0; i < (m.purse ?? 0); i++) {
      const a = (i / m.purse) * Math.PI * 2 + Math.random(), d = 10 + Math.random() * 8;
      const img = this.add.image(Math.round(m.x), Math.round(m.y) - 10, 'art-icons', 'coin').setDepth(9400).setScale(0);
      this.tweens.add({ targets: img, x: img.x + Math.cos(a) * d, y: img.y + Math.sin(a) * d * 0.6, scale: 0.75, duration: 260, ease: 'Quad.easeOut' });
      this.coinsOut.push({ img, t: 0 });
    }
  }

  takeCoin(c, quiet = false) {
    this.coinsOut = this.coinsOut.filter((q) => q !== c);
    this.tweens.killTweensOf(c.img);
    c.img.destroy();
    this.run.coins++;
    this.showPurse();
    if (!quiet) sfx.play('star');
  }

  waveBeaten() {
    this.beaten++;
    this.showTally();
    const p = this.player;
    if (p.alive) { p.heal(p.maxHp * HEAL); this.healFx(p); }
    const chest = this.beaten % CHEST_EVERY === 0; // then the next wave waits for the chest to be picked up
    if (!chest) banner(this, `Wave ${this.beaten} beaten`, this.beaten % PER_LEVEL === 0 && this.waveLevel <= MAX_LEVEL ? `The next are Lv ${this.waveLevel}` : undefined, true);
    this.time.delayedCall(SHOP_AFTER, () => this.openShop(() => (chest ? this.dropChest() : this.time.delayedCall(NEXT_WAVE, () => this.spawnWave()))));
  }

  // Between waves: the fight stops while the player shops, and goes on with the moves they leave it with.
  openShop(then) {
    if (this.over) return;
    if (this.menu || this.card) return void this.time.delayedCall(200, () => this.openShop(then)); // (the pause menu is up)
    for (const c of [...this.coinsOut]) this.takeCoin(c, true);
    this.run.offers = rollShop(this.me.species, this.run.owned);
    this.aiming = -1;
    this.freeze(true);
    this.menu = new ShopMenu(this, this.actions, {
      species: this.me.species, run: this.run, title: `Shop  Wave ${this.beaten}`,
      onBuy: (id) => { if (loadMoves(this, [id])) this.load.start(); this.showPurse(); },
      onClose: (picked) => {
        this.menu = null;
        this.menuClosedOn = this.game.loop.frame;
        this.showPurse();
        this.equip(picked);
        this.freeze(false);
        then();
      },
    });
  }

  // The player's battle moves are now these: the buttons and the HUD follow.
  equip(moves) {
    this.moves = this.me.moves = [...moves];
    this.player.kit = this.moves;
    this.player.move = null;
    this.slot = 0;
    this.hud.destroy();
    this.hud = new BattleHud(this, this.player, this.moves);
    if (loadMoves(this, this.moves)) this.load.start();
  }

  // A chest is left on the stage, a little way from the player.
  dropChest() {
    const [x, y] = Practice.prototype.spotNear.call(this) ?? [this.player.x, this.player.y];
    const img = this.add.image(Math.round(x), Math.round(y), 'art-icons', 'chest').setOrigin(0.5, 0.85).setDepth(9 + y).setScale(0);
    this.tweens.add({ targets: img, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.ringPop(x, y - 6, 10);
    this.loot = { x, y, img };
    banner(this, `Wave ${this.beaten}: a chest!`, 'Walk over it to open it', true);
  }

  // Walked over, the chest is gone and the TM out of it slides up from where it stood; then the waves go on.
  openChest() {
    const { x, y, img } = this.loot, tm = chestTM(this.me.species);
    this.loot = null;
    this.tweens.add({ targets: img, alpha: 0, scale: 1.4, duration: 180, onComplete: () => img.destroy() });
    const disc = this.add.image(Math.round(x), Math.round(y) - 8, 'art-icons', 'tm').setDepth(9400).setAlpha(0);
    this.tweens.add({ targets: disc, y: disc.y - 26, alpha: { from: 0, to: 1 }, duration: 420, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: disc, alpha: 0, delay: 1300, duration: 300, onComplete: () => disc.destroy() });
    banner(this, tm ? `TM found: ${MOVES[tm].name}` : 'Empty: you have every TM', undefined, true);
    music.jingle('jingle_tm');
    this.time.delayedCall(NEXT_WAVE, () => this.spawnWave());
  }

  update(t, ms) {
    super.update(t, ms);
    if (this.menu instanceof ShopMenu) this.menu.update(Math.min(ms, 50) / 1000);
    const c = this.loot, p = this.player;
    if (c && !this.over && p.alive && Math.hypot(p.x - c.x, (p.y - c.y) * 1.3) <= CHEST_REACH) this.openChest();
    if (this.frozen || this.over) return;
    // dropped coins lie a moment, then fly to the player, faster and faster
    const dt = Math.min(ms, 50) / 1000;
    for (const q of [...this.coinsOut]) {
      q.t += dt;
      if (q.t < COIN_WAIT) continue;
      const dx = p.x - q.img.x, dy = p.y - 10 - q.img.y, d = Math.hypot(dx, dy), step = (80 + (q.t - COIN_WAIT) * 700) * dt;
      if (d <= Math.max(COIN_REACH, step)) { this.takeCoin(q); continue; }
      q.img.x += (dx / d) * step;
      q.img.y += (dy / d) * step;
    }
  }

  // What the run was worth: more for every wave beaten, up to twice a usual fight at fifteen.
  bookRun() {
    const waves = this.beaten;
    session.records.survivorBest = Math.max(session.records.survivorBest ?? 0, waves);
    return bookBattle({
      mode: 'Survivor', won: waves >= CHEST_EVERY, gaveUp: false, dealt: 1, kept: 0, seconds: this.clock, kos: this.kos, species: this.me.species,
      exp: Math.round((2 * USUAL_EXP * Math.min(waves, EXP_CAP)) / EXP_CAP), noTm: true,
    });
  }

  finish() {
    if (this.over) return;
    const earned = this.bookRun();
    this.over = true;
    this.resume();
    music.stop();
    music.jingle('jingle_loss');
    const best = session.records.survivorBest;
    callout(this, 'Run over', `Waves defeated: ${this.beaten}${best === this.beaten && best > 0 ? '   A new best!' : `   Best: ${best}`}`, 2200, INK.gold);
    this.time.delayedCall(2600, () => this.showResult(earned));
  }

  // Walking out ends the run where it stands: the waves beaten so far still count.
  leave() {
    if (this.started && !this.over) { this.over = true; this.bookRun(); }
    this.over = true;
    go(this, 'hub', { area: 'basement', entry: 'pillar' });
  }
}
