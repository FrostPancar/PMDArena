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
import { INK, banner, text } from '../ui.js';
import { music } from '../music.js';

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

// Survivor: you alone on a stage, and wave after wave of CPUs until you go down. No rounds: the next wave comes in a
// second after the last of the one before is beaten. Every two waves beaten the CPUs go up a level; every five, a
// chest with a TM is left on the stage, and nothing more comes until it is picked up; every tenth wave is a legendary.
// What counts is the number of waves beaten.
export class Survivor extends Battle {
  constructor() { super('survivor'); }

  init(data) {
    super.init({ battle: data?.battle ?? survivorBattle() });
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
        const mon = new Mon(this, x, y, { team: 'n', species: lookOf(spec), move: spec.moves[0], hp: boss ? BOSS.hp : Math.max(1, Math.round(BASE_HP * share)), power });
        Object.assign(mon, { kit: spec.moves, slot: f.slot, invuln: 0.6 });
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

  waveBeaten() {
    this.beaten++;
    this.showTally();
    const p = this.player;
    if (p.alive) { p.heal(p.maxHp * HEAL); this.healFx(p); }
    if (this.beaten % CHEST_EVERY === 0) return this.dropChest(); // the next wave waits for the chest to be picked up
    banner(this, `Wave ${this.beaten} beaten`, this.beaten % PER_LEVEL === 0 && this.waveLevel <= MAX_LEVEL ? `The next are Lv ${this.waveLevel}` : undefined, true);
    this.time.delayedCall(NEXT_WAVE, () => this.spawnWave());
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
    const c = this.loot, p = this.player;
    if (c && !this.over && p.alive && Math.hypot(p.x - c.x, (p.y - c.y) * 1.3) <= CHEST_REACH) this.openChest();
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
