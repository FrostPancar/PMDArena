import Phaser from 'phaser';
import { Play, KEYS, COMBAT, VIEW_W, VIEW_H } from '../../scene.js';
import { MOVES, loadMoves, movesOf } from '../../moves.js';
import { SPECIES, loadSpecies, ensureSpecies } from '../../sprites.js';
import { Mon, dirVec } from '../../mon.js';
import { Actions, keyGuard } from '../input.js';
import { go, wipe } from '../transition.js';
import { session, saveSession, bookBattle, autoControls, setAutoControls } from '../session.js';
import { net } from '../net.js';
import { mine, lookOf, arenaOf, arenaName, startingSpots, fightsToWin } from '../modes.js';
import { LEDGES } from '../ledges.js';
import { CpuController, RemoteController, snapshot } from '../controllers.js';
import { BattleHud, ScoreStrip, callout, controlsCard, resultCard } from '../hud.js';
import { holdAim, touch } from '../touch.js';
import { MAPS } from '../../maps.js';
import { onLadder, wonOn } from '../ladder.js';
import { Menu, banner, panel, text, INK, DEPTH, soundRows, soundPick } from '../ui.js';
import { music } from '../music.js';
import { nextBoss } from '../bosses.js';

// The basic attacks kept on the keyboard next to the mouse: lunge, shot, double hit, charge up.
const BASIC_KEYS = Object.fromEntries(Object.entries(KEYS).filter(([, anim]) => COMBAT[anim] || anim === 'Charge'));
const SNAPSHOT_MS = 50;
const TAG = { ally: 0x8fdcff, foe: 0xff7a6a };
const MOVE_ID = new Map(Object.entries(MOVES).map(([id, mv]) => [mv, id]));
const r1 = (n) => Math.round(n * 10) / 10;
const JUMP_TIME = 0.55; // how long Mon keeps a jump in the air
const moveRow = () => `Movement: ${autoControls() ? 'Auto' : 'WASD'}`;

// A match on one of the stages: 1v1, 2v2 or a 3v3 crew battle. All the combat is the playground's Play scene; this adds
// who is fighting (the battle from modes.js or the relay), the player's four moves, the HUD, the result and the way back
// to the dojo.
//
// A 1v1 or 2v2 match is fights ("rounds") until one side has won two: everyone is put back where they started, healed,
// between them. A crew battle is one fight in which each side's next mon steps in where the last one fell.
//
// Online, every client runs the whole fight but only decides things for the fighters it owns (see mine()): where
// they are, what they do, what hits them. It tells the others twenty times a second how those fighters stand and at
// once whenever one of them acts; the others show them as puppets and replay those acts, which is how a far-away
// fighter's move lands on yours. Fights against the computer alone work the same way with nobody to tell.
export class Battle extends Play {
  constructor(key = 'battle') { super(key); }

  init(data) {
    this.cfg = data.battle;
    this.gone = data.gone ?? []; // players who left during the stage draw: their fighters drop at the start
    this.online = this.cfg.fighters.some((f) => !mine(f));
    this.me = this.cfg.fighters.find((f) => f.kind === 'human' && mine(f));
    this.registry.set('species', lookOf(this.me));
    this.slot = 0; // the move last used: 0 and 1 are the mouse buttons, 2 and 3 are Q and E
    this.clock = 0; // seconds of actual fighting
    this.menu = null;
    this.card = null;
    this.frozen = false; // a menu has stopped the clock (only possible when nobody else is in the fight)
    this.started = false; // the match is under way
    this.over = false;
    this.hold = false; // between fights, or a fight is being called: nobody can act
    this.between = false; // a fight has been decided and the next has not been set up yet
    this.round = 1;
    this.wins = [0, 0]; // fights won, by team
    this.need = fightsToWin(this.cfg);
    this.crewed = this.cfg.fighters.some((f) => f.crew);
    this.level = onLadder(this.cfg) ? this.cfg.level ?? null : null; // the CPU's difficulty, 1 to 5, in a fight on the ladder
    this.aiming = -1; // the move whose button is being held to aim it (keyboard and mouse; the pad keeps its own)
    this.aimG = this.reticle = null; // the pad's aim guide and its colour on this stage (made when first needed)
    this.autoWalk = null; // where a computer playing the player's own mon wants it to go (cfg.auto, for testing)
    this.moves = this.me.moves; // the four on the player's buttons: those of whichever of a crew is out
    this.sinceSnapshot = 0;
    super.init({ map: arenaOf(this.cfg), seed: this.cfg.seed }); // the relay's seed: every client rolls the same dice
    this.ledges = LEDGES[this.mapId] ?? [];
  }

  // Evolved forms are only loaded when someone in the fight wears one.
  // and the art of the moves anyone in the fight can use: their four, and for a mon that may talk in its sleep, the
  // rest of its own
  preload() {
    const all = this.cfg.fighters.flatMap((f) => f.crew ?? [f]);
    loadSpecies(this, all.map(lookOf));
    loadMoves(this, all.flatMap((f) => [...f.moves, ...(f.moves.includes('sleepTalk') ? movesOf(f.species) : [])]));
  }

  create() {
    for (const f of this.cfg.fighters.flatMap((q) => q.crew ?? [q])) ensureSpecies(this, lookOf(f));
    // only the menus use these (fighting reads keys and mouse directly); made first so that the Esc press
    // that opens the pause menu is not also read as backing out of it
    this.actions = new Actions(this);
    music.stage(this.mapId, this.cfg.boss ? 5 : this.level); // (a boss has the boss's tune)
    super.create();
    for (const x of this.fighters) if (this.gone.includes(x.f.owner) && x.controller instanceof RemoteController) x.controller.drop();
    this.hud = new BattleHud(this, this.player, this.moves);
    this.player.kit = this.moves; // (the moves it has with it: Sleep Talk picks from these)
    this.menuTab();
    this.score = new ScoreStrip(this, this.crewed ? Math.max(...this.fighters.map((x) => x.crew?.length ?? 1)) : this.need);
    this.showScore();

    const rivals = this.cfg.fighters.filter((f) => f.team !== this.me.team);
    this.label = this.cfg.label ?? `${this.cfg.mode === '3v3' ? 'Crew' : this.cfg.mode} ${rivals.every((f) => f.kind === 'cpu') ? 'vs CPU' : 'vs players'}`; // also how the records file this fight
    const boss = this.cfg.boss;
    const announce = () => banner(this, boss ? SPECIES[boss.id].name : arenaName(this.cfg), boss ? `Boss ${boss.at + 1} of ${boss.order.length}  ${arenaName(this.cfg)}` : this.level ? `${this.label}  Lv ${this.level}` : this.label, true);

    if (this.online) {
      const offs = [
        net.on('b', (msg) => {
          const x = this.fighters[msg.d?.s];
          // left over from a fight that is finished here (or not begun yet): only who won a fight is heard across them
          if (msg.d?.rn !== undefined && msg.d.rn !== this.round && msg.d.k !== 'ro') return;
          if (x?.controller instanceof RemoteController && x.f.owner === msg.from) x.controller.receive(msg.d);
        }),
        net.on('left', (msg) => { for (const x of this.fighters) if (x.f.owner === msg.id && x.controller instanceof RemoteController) x.controller.drop(); }),
        net.on('go', () => this.begin()),
        net.on('status', (up) => { if (!up) this.end('Connection lost', null); }),
      ];
      this.events.once('shutdown', () => offs.forEach((off) => off()));
      this.waiting = text(this, VIEW_W / 2, VIEW_H / 2 + 30, 'Waiting for the other players...').setOrigin(0.5, 0);
      this.events.once('create', () => { announce(); net.send('battle.ready'); });
      return;
    }
    this.events.once('create', () => {
      if (session.briefed.controls) { announce(); return this.begin(); }
      session.briefed.controls = true;
      saveSession();
      this.showControls(() => { announce(); this.begin(); });
    });
  }

  begin() {
    this.started = true;
    this.waiting?.destroy();
    this.callRound();
  }

  // ---- the fights of a match ----
  // The call before a fight: which one it is, then FIGHT!, and only then can anyone act.
  callRound() {
    this.hold = true;
    const decider = this.need > 1 && this.wins.every((n) => n === this.need - 1);
    if (decider) music.swap('fight_decider'); // the deciding fight has its own tune (when the soundtrack has it)
    callout(this, this.crewed ? 'Crew battle' : decider ? 'Final round' : `Round ${this.round}`, `${this.level ? `Lv ${this.level}   ` : ''}${this.crewed ? 'Last crew standing wins' : `First to ${this.need} wins`}`, 1000);
    this.after(1250, () => {
      if (this.over) return;
      this.hold = false;
      callout(this, 'Fight!', null, 450, INK.white);
    });
  }

  // The match so far, as the announcer's pips.
  tally() { return { ours: this.wins[this.me.team], theirs: this.wins[1 - this.me.team], need: this.need }; }

  showScore() {
    const [a, b] = [this.me.team, 1 - this.me.team];
    if (!this.crewed) return this.score.set(`Round ${this.round}`, this.wins[a], this.wins[b]);
    const left = (team) => this.fighters.filter((x) => x.f.team === team).reduce((n, x) => n + (x.crew ? x.crew.length - x.at - (x.mon.alive ? 0 : 1) : x.mon.alive ? 1 : 0), 0);
    this.score.set('Crew', left(a), left(b));
  }

  // One client says who won each fight, so that no two can count it differently (a double knock-out looks different
  // from each side): the one running the fighter in the lowest slot still in the match.
  get decides() {
    const first = this.fighters.find((x) => !x.controller?.gone);
    return !first || mine(first.f);
  }

  // A fight is over. winner: the team that took it, or -1 if both sides went down together.
  roundOver(winner) {
    if (this.between || this.over || !this.started) return;
    this.between = this.hold = true;
    if (winner >= 0) this.wins[winner]++;
    this.showScore();
    const won = winner === this.me.team, drawn = winner < 0;
    // a side with nobody left in the match cannot fight on
    const walkover = !drawn && this.fighters.filter((x) => x.f.team !== winner).every((x) => x.controller?.gone);
    if (drawn ? this.need === 1 : this.wins[winner] >= this.need || walkover) {
      return this.end(won ? 'You won!' : drawn ? 'A draw!' : this.cfg.mode === '2v2' ? 'Your team fainted...' : this.crewed ? 'Your crew fainted...' : 'You fainted...', won);
    }
    for (const x of this.fighters) if (!x.mon.remote) x.mon.invuln = 9; // nothing still in the air changes anything now
    callout(this, drawn ? 'Double KO' : 'KO!', drawn ? 'Nobody takes the round' : won ? 'You take the round' : 'The round goes to the other side', 1600, drawn ? INK.white : won ? INK.gold : INK.rose, this.tally());
    this.after(1900, () => this.cameras.main.fadeOut(200, 0, 0, 0));
    this.after(2150, () => {
      if (this.over) return;
      this.resetRound();
      this.cameras.main.fadeIn(220, 0, 0, 0);
      this.round++;
      this.between = false;
      this.showScore();
      this.callRound();
    });
  }

  // Everyone still in the match back where they started, as good as new, on a clean floor.
  resetRound() {
    this.clearField();
    this.fighters.forEach((x, i) => {
      if (x.controller?.gone) return;
      x.mon.revive(...this.spots[i]);
      x.mon.toIdle();
      x.mon.setCharged(false);
      x.mon.home = { x: x.mon.x, y: x.mon.y };
    });
    this.faceOff();
    this.watching = null;
    this.cameras.main.startFollow(this.player.sprite, true, 0.2, 0.2);
    this.cameras.main.centerOn(this.player.x, this.player.y);
  }

  // The two sides look at each other.
  faceOff() {
    for (const x of this.fighters) {
      const other = this.fighters.find((o) => o.mon.team !== x.mon.team);
      if (other) x.mon.face(other.mon.x, other.mon.y);
    }
  }

  // ---- a crew: the next mon steps in ----
  // Has this fighter someone left to send out?
  benched(x) { return !!x.crew && x.at < x.crew.length - 1 && !x.controller?.gone; }

  // The i-th of a fighter's crew comes out where the last one fell, fresh. Its owner's client decides when (see fainted).
  sendOut(x, i) {
    const spec = x.crew[i], m = x.mon, look = lookOf(spec);
    if (!spec || !ensureSpecies(this, look)) return;
    x.at = i;
    m.setSpecies(look);
    m.revive(m.x, m.y);
    m.toIdle();
    Object.assign(m, { move: spec.moves[0], kit: spec.moves, invuln: 1.6, flash: 0.5 });
    if (x.controller instanceof CpuController) Object.assign(x.controller, { moves: spec.moves, cool: 1.2 });
    if (m === this.player) {
      this.moves = spec.moves;
      this.slot = 0;
      m.move = null;
      this.hud.destroy();
      this.hud = new BattleHud(this, m, this.moves);
      this.watching = null;
      this.cameras.main.startFollow(m.sprite, true, 0.2, 0.2);
    }
    this.spark(m.x, m.y - 12);
    this.popup(m, `GO ${SPECIES[look].name}`.toUpperCase());
    this.showScore();
  }

  // The way into the pause menu, top right.
  menuTab() {
    const tab = panel(this, VIEW_W - 55, 3, 52, 15, 'dim').setInteractive({ useHandCursor: true });
    tab.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); this.pause(); });
    if (touch.on) return void text(this, VIEW_W - 29, 5, 'Menu').setOrigin(0.5, 0);
    text(this, VIEW_W - 50, 5, 'Esc', INK.gold);
    text(this, VIEW_W - 30, 5, 'Menu');
  }

  // ---- who is fighting ----
  spawnNpcs() {
    const spots = startingSpots(this.cfg, this.map, this.walkable);
    this.spots = spots;
    this.fighters = this.cfg.fighters.map((f, i) => {
      const [x, y] = spots[i], team = f.team === this.me.team ? 'p' : 'n';
      let mon = this.player;
      if (f === this.me) Object.assign(mon, { x, y, home: { x, y } });
      else {
        mon = new Mon(this, x, y, { team, species: lookOf(f), move: f.moves[0], hp: f.hp });
        mon.kit = f.moves;
        if (f.scale) { mon.sprite.setScale(f.scale); mon.shadow.setScale(f.scale); } // a boss stands bigger than the rest
        this.npcs.push(mon);
      }
      mon.slot = f.slot;
      // cfg.auto: the computer plays the player's mon too, at that skill (fights run unattended to test the game)
      const controller = f === this.me ? (this.cfg.auto ? new CpuController(this, mon, { ...f, skill: this.cfg.auto }) : null) : mine(f) ? new CpuController(this, mon, f) : new RemoteController(this, mon, f);
      // an arrowhead over everyone else, blue for your side and red for the other; other players also show their name
      const tint = team === 'p' ? TAG.ally : TAG.foe;
      const tag = f === this.me ? null : this.add.image(x, y, 'tag').setTint(tint).setDepth(9003);
      const name = tag && f.kind === 'human' && f.name ? this.add.bitmapText(x, y, 'pmd', f.name).setOrigin(0.5, 1).setTint(tint).setDepth(9003) : null;
      return { f, mon, controller, tag, name, crew: f.crew ?? null, at: 0 };
    });
    this.faceOff();
    this.cameras.main.centerOn(this.player.x, this.player.y);
  }

  get fighting() { return this.started && !this.over && !this.hold; }

  // Nobody gets back up; a fight ends when one side has nobody standing. In a crew battle the next of the crew comes
  // out in its place a moment later, on the say of the client that runs it.
  fainted(m) {
    const x = this.fighters.find((o) => o.mon === m);
    if (!x || m.remote || !this.benched(x)) return;
    this.after(800, () => {
      if (this.over || m.alive) return;
      this.tell({ k: 'sw', s: m.slot, i: x.at + 1 });
      this.sendOut(x, x.at + 1);
    });
  }

  checkOutcome() {
    if (!this.fighting) return;
    const standing = (team) => this.fighters.some((x) => x.mon.team === team && (x.mon.alive || this.benched(x)));
    const us = standing('p'), them = standing('n');
    if (us && them) {
      // out of the fight but your partner is not: watch them
      const mate = !this.player.alive && !this.watching && this.fighters.find((x) => x.mon.team === 'p' && x.mon.alive);
      if (mate) {
        this.watching = mate.mon;
        this.cameras.main.startFollow(this.watching.sprite, true, 0.2, 0.2);
      }
      return;
    }
    if (!this.decides) return; // the client that does will say
    const winner = us ? this.me.team : them ? 1 - this.me.team : -1;
    this.tell({ k: 'ro', s: this.player.slot, r: this.round, w: winner });
    this.roundOver(winner);
  }

  // won: true or false books the fight (EXP, records) and shows what it earned; null is a fight that did not count.
  end(message, won) {
    if (this.over) return;
    const earned = won === null || !this.started ? null : this.book(won, false);
    this.over = true;
    this.wonMatch = won === true;
    this.resume();
    this.waiting?.destroy();
    // a win on the ladder may open the next stage: said here, shown on the map next time
    const opened = won === true && this.level ? wonOn(this.mapId) : null;
    if (opened) this.time.delayedCall(1400, () => banner(this, 'New stage opened!', MAPS[opened].name, true));
    if (won !== null) { music.stop(); music.jingle(won ? 'jingle_win' : 'jingle_loss'); }
    if (won === null) banner(this, message, undefined, true);
    else callout(this, won ? 'You win!' : message === 'A draw!' ? 'Draw' : 'You lose', this.need > 1 || won ? null : message, 1900, won ? INK.gold : INK.rose, this.need > 1 ? this.tally() : null);
    this.time.delayedCall(2200, () => (earned ? this.showResult(earned) : this.leave()));
  }

  // What the fight was worth to the mon that fought it (see progress.js for the sums).
  book(won, gaveUp) {
    const foes = this.fighters.filter((x) => x.mon.team === 'n'), self = this.fighters.find((x) => x.mon === this.player);
    // a crew counts as one long health bar: the mons already down, and how hurt the one that is out
    const size = (x) => x.crew?.length ?? 1, down = (x) => x.at + (x.mon.alive ? 0 : 1);
    const lost = (x) => (x.at + 1 - Math.max(0, x.mon.hp) / x.mon.maxHp) / size(x);
    return bookBattle({
      mode: this.label, won, gaveUp, seconds: this.clock, species: this.me.species, scale: this.cfg.expScale,
      dealt: foes.reduce((sum, x) => sum + lost(x), 0) / foes.length,
      kept: 1 - lost(self),
      kos: foes.reduce((sum, x) => sum + down(x), 0),
    });
  }

  showResult(earned) {
    this.card = resultCard(this, this.me.species, earned, lookOf(this.me));
    if (earned.tm) music.jingle('jingle_tm'); else if (earned.to.level > earned.from.level) music.jingle('jingle_levelup');
    // on from the card: to the evolution, if the fight brought one, and then out
    const done = () => {
      if (!this.card) return;
      this.actions.pop(keys);
      this.input.off('pointerdown', done);
      for (const o of this.card) o.destroy();
      this.card = null;
      if (earned.evolved) this.showEvolution(lookOf(this.me), earned.evolved);
      else this.leave();
    };
    const keys = this.actions.push({ confirm: done, cancel: done });
    this.input.on('pointerdown', done);
    this.time.delayedCall(9000, done);
  }

  // The mon that fought has grown into its next form: on a dark screen it flickers between the two, faster and faster,
  // until a flash leaves the new one standing, with congratulations. Any button goes on.
  showEvolution(from, to) {
    const d = DEPTH + 30, cx = VIEW_W / 2, cy = VIEW_H / 2 + 6;
    const frame = (id) => [`a-${SPECIES[id].anims.Idle.key}`, 0];
    const parts = [
      this.add.image(0, 0, 'px').setOrigin(0).setDisplaySize(VIEW_W, VIEW_H).setTint(0x06101c).setScrollFactor(0).setDepth(d),
      text(this, cx, 34, 'What?', INK.gold).setOrigin(0.5, 0).setDepth(d + 2),
      text(this, cx, 48, `${SPECIES[from].name} is evolving!`).setOrigin(0.5, 0).setDepth(d + 2),
    ];
    const glow = this.add.image(cx, cy, 'px').setDisplaySize(4, 4).setTint(0xffffff).setAlpha(0).setScrollFactor(0).setDepth(d + 1);
    const mon = this.add.image(cx, cy, ...frame(from)).setScale(3).setScrollFactor(0).setDepth(d + 2);
    parts.push(glow, mon);
    this.card = parts;
    let t = 0, next = 0.5, isNew = false, over = false;
    const finish = () => {
      over = true;
      music.jingle('screen_evolution');
      this.cameras.main.flash(260, 255, 255, 255);
      mon.setTexture(...frame(to)).clearTint();
      this.tweens.add({ targets: mon, scale: { from: 3.6, to: 3 }, duration: 320, ease: 'Back.easeOut' });
      this.tweens.add({ targets: glow, alpha: { from: 0.5, to: 0 }, scaleX: 260, scaleY: 260, duration: 600 });
      parts[1].setText('Congratulations!');
      parts[2].setText(`${SPECIES[from].name} evolved into ${SPECIES[to].name}!`);
      parts.push(text(this, cx, VIEW_H - 22, touch.on ? 'Tap to go on' : 'Enter to go on', INK.dim).setOrigin(0.5, 0).setDepth(d + 2));
      const out = () => { if (this.card !== parts) return; this.card = null; this.leave(); };
      this.time.delayedCall(500, () => { this.actions.push({ confirm: out, cancel: out }); this.input.on('pointerdown', out); });
      this.time.delayedCall(12000, out);
    };
    const tick = this.time.addEvent({
      delay: 30, loop: true,
      callback: () => {
        if (over) return tick.remove();
        t += 0.03;
        if (!ensureSpecies(this, to)) { t = Math.min(t, 0.4); return; } // its sprites are still on their way: hold the opening
        mon.setTintFill(0xffffff);
        if (t >= next) {
          // each swap comes sooner than the last
          isNew = !isNew;
          mon.setTexture(...frame(isNew ? to : from));
          next = t + Math.max(0.05, 0.42 * (1 - t / 3.2));
        }
        mon.setScale(3 + 0.25 * Math.sin(t * 14));
        if (t >= 3.3) finish();
      },
    });
  }

  // Walking out mid-fight is giving up: it books a loss for a part of the EXP, and the relay tells the others,
  // whose copies of your fighters drop.
  leave() {
    if (this.started && !this.over) this.book(false, true);
    this.over = true;
    if (this.online) net.send('battle.over');
    // Boss Rush: a boss beaten sends you straight on to the next, until one beats you or none are left
    const next = this.cfg.boss && this.wonMatch ? nextBoss(this.cfg) : null;
    if (next) return go(this, 'battle', { battle: next });
    go(this, 'hub', { area: 'basement', entry: 'pillar' });
  }

  // ---- jumping down from high places (ledges.js) ----
  // A fighter this client runs, walking off the lip of a ledge, hops down to the ground below it.
  checkLedge(m) {
    if (m.state !== 'walk') return;
    const [fx, fy] = dirVec(m.dir);
    for (const { edge: [x1, y1, x2, y2], drop: [dx, dy] } of this.ledges) {
      if ((fx * dx + fy * dy) / Math.hypot(dx, dy) < 0.6) continue; // not heading over it
      const ex = x2 - x1, ey = y2 - y1, t = Phaser.Math.Clamp(((m.x - x1) * ex + (m.y - y1) * ey) / (ex * ex + ey * ey), 0, 1);
      if (Math.hypot(m.x - x1 - ex * t, m.y - y1 - ey * t) > 5 || !this.walkable(m.x + dx, m.y + dy)) continue;
      // in the air like any jump (nothing can hit it), carried to the landing spot rather than steered
      m.cancel();
      Object.assign(m, { state: 'jump', running: false, air: { t: 0, vx: 0, vy: 0, ix: 0, iy: 0 } });
      const hop = m.species.anims.Hop;
      m.setAnim(hop ? 'Hop' : 'Idle', 'hold');
      if (hop) m.animRate = hop.durs.reduce((a, b) => a + b, 0) / 60 / JUMP_TIME;
      this.tweens.add({ targets: m, x: m.x + dx, y: m.y + dy, duration: JUMP_TIME * 900, ease: 'Sine.easeIn' });
      return;
    }
  }

  // ---- telling the other clients, and replaying what they tell ----
  // Every message carries the tick it was sent on, so a receiver can tell how old it is and in what order things happened.
  tell(d) { if (this.online) net.send('b', { d: { ...d, tk: this.tickN, rn: this.round } }); }

  // What a fighter this client runs is doing with its controls, for the clients that show it as a puppet: is a held move
  // (a beam, a flight, a stance, a roll) still going, and the point it is aimed at.
  inputOf(m) {
    const h = m.state === 'bird' || m.state === 'windup' || !!m.beaming || m.braced || this.steers.some((k) => k.m === m && k.on);
    let ax, ay;
    if (m === this.player) { const a = this.aimOf(m, touch.on ? 'touch' : 'pointer'); ax = m.x + a.dx * a.dist; ay = m.y + a.dy * a.dist; }
    else { const foe = this.nearestFoe(m, m.x, m.y, 999), [fx, fy] = dirVec(m.dir); ax = foe ? foe.x : m.x + fx * 60; ay = foe ? foe.y : m.y + fy * 60; }
    return { h: h ? 1 : 0, ax: r1(ax), ay: r1(ay) };
  }

  useMove(m, track) {
    const ok = super.useMove(m, track);
    if (ok && !m.remote && m.windup) { // (a lit fuse, a yank on a thread and a move blurted out asleep start no charge)
      const a = m.windup.aim;
      this.tell({ k: 'w', s: m.slot, mv: m.move, aim: a && { dx: a.dx, dy: a.dy, dist: a.dist } });
    }
    return ok;
  }

  cancelMove(m) {
    const ok = super.cancelMove(m);
    if (ok && !m.remote) this.tell({ k: 'c', s: m.slot });
    return ok;
  }

  fireMove(m, mv, aim) {
    // (the start of a volley is not said: each of its shots is, as it goes)
    if (!m.remote && !(mv.volley && !aim.one)) this.tell({ k: 'f', s: m.slot, mv: mv.id ?? MOVE_ID.get(mv), x: r1(m.x), y: r1(m.y), big: m.charged ? 1 : 0, aim: { dx: aim.dx, dy: aim.dy, dist: aim.dist, radius: aim.radius, stacks: aim.stacks, one: aim.one ? 1 : undefined } });
    super.fireMove(m, mv, aim);
  }

  basicHit(m, c, dx, dy) {
    if (!m.remote) this.tell({ k: 'h', s: m.slot, c: Object.keys(COMBAT).find((k) => COMBAT[k] === c), dx, dy, big: m.charged ? 1 : 0 });
    super.basicHit(m, c, dx, dy);
  }

  parry(m) {
    const ok = super.parry(m);
    if (ok && !m.remote) this.tell({ k: 'p', s: m.slot });
    return ok;
  }

  parried(m) {
    if (!m.remote) this.tell({ k: 'pd', s: m.slot });
    // whoever of the other side was in reach is the one whose blow was turned: a CPU takes that as a warning
    for (const x of this.fighters ?? []) if (x.mon.team !== m.team && Math.hypot(x.mon.x - m.x, x.mon.y - m.y) < 80) x.controller?.countered?.();
    super.parried(m);
  }

  subBroke(m) {
    if (!m.remote) this.tell({ k: 'sb', s: m.slot });
    super.subBroke(m);
  }

  // Something a remote fighter did, to be played out on its puppet here.
  replay(m, d) {
    if (d.k === 'w') {
      // it began charging a move: show the charge and where it will land
      const mv = MOVES[d.mv];
      if (!mv) return;
      Object.assign(m, { move: d.mv, hidden: false, pending: null, state: 'windup', windup: { mv, t: 0, track: null, aim: d.aim ?? null } });
      if (mv.chargeFrames.length) {
        const img = this.add.image(m.x, m.y - 8, mv.chargeFrames[0]).setDepth(60 + m.y).setScale(mv.chargeScale ?? 1).setOrigin(...(mv.chargeOrigin ?? [0.5, 0.5]));
        this.chargeFx.push({ img, m, w: m.windup, frames: mv.chargeFrames });
      }
      m.setAnim(m.species.anims.Charge ? 'Charge' : 'Idle', 'loop');
    } else if (d.k === 'c') this.cancelMove(m);
    else if (d.k === 'f') {
      // the move went off, from exactly where its owner stood
      const mv = MOVES[d.mv];
      if (!mv) return;
      if (m.windup) { m.windup = null; m.applyTint(); }
      if (m.state === 'windup') m.toIdle();
      Object.assign(m, { x: d.x, y: d.y, charged: !!d.big });
      this.fireMove(m, mv, d.aim);
    } else if (d.k === 'h') {
      if (!COMBAT[d.c]) return;
      m.charged = !!d.big;
      this.basicHit(m, COMBAT[d.c], d.dx, d.dy);
    } else if (d.k === 'p') {
      if (!m.grounded) m.toIdle();
      Object.assign(m, { stamina: m.maxStamina, parryCd: 0 });
      this.parry(m);
    } else if (d.k === 'pd') this.parried(m);
    else if (d.k === 'sb') this.subBroke(m);
    else if (d.k === 'hv') {
      // the verdict: a hit by one of this client's fighters landed on the sender's. Only now does it do what a hit does here.
      const owner = this.fighters[d.a]?.mon, mv = MOVES[d.mv], q = d.sh && this.shots.find((x) => x.id === d.sh);
      if (!owner || owner.remote) return;
      if (q && !q.done) { q.limbo = 0; q.dead = q.cut = true; } // the shot that did it stops here too
      this.onHit(owner, m, mv, d.n, !!d.c);
    } else if (d.k === 'sf') this.shotFate(d);
    else if (d.k === 'ro') { if (d.r === this.round) this.roundOver(d.w === 0 || d.w === 1 ? d.w : -1); } // the deciding client says who took the fight
    else if (d.k === 'sw') {
      // its owner sent out the next of its crew
      const x = this.fighters.find((o) => o.mon === m);
      if (x?.crew && d.i === x.at + 1) this.sendOut(x, d.i);
    }
    else if (d.k === 'cl') {
      // where the client running a beam clash says the knot is (as a share of the way from its fighter to the other), or who lost
      const c = this.clashes.find((x) => (x.a.m === m && x.b.m.slot === d.o) || (x.b.m === m && x.a.m.slot === d.o));
      if (c) c.net = { u: d.u, end: d.e };
    } else if (d.k === 'ct') {
      // the other player pressed during a clash this client runs
      const c = m.beaming?.clash;
      if (c) { const k = c.a.m === m ? 'pa' : 'pb'; c[k] = Math.min(2, c[k] + 0.5); }
    }
  }

  // What became of a shot, from the one client entitled to decide it: gone, cut in two, caught, or flying a new way for a new owner.
  shotFate(d) {
    let q = this.shots.find((x) => x.id === d.id);
    if (!q && (d.f === 'turn' || d.f === 'orbit') && MOVES[d.mv] && this.fighters[d.o]) {
      // this client had already let the shot go (it seemed to hit, long enough ago): bring it back as its decider describes it
      const mv = MOVES[d.mv], img = this.add.image(d.x, d.y - 8, mv.frames[0]).setScale(mv.scale ?? 1);
      if (mv.tint) img.setTint(mv.tint);
      q = { img, frames: mv.frames, fps: mv.fps ?? 30, t: 0, turn: 0, r: d.r ?? mv.radius ?? 8, r0: d.r ?? mv.radius ?? 8, mv, id: d.id, rotate: mv.rotate, rotOffset: mv.rotOffset ?? 0, spin: mv.spin, s0: img.scaleX, life0: 0.9, ricochet: 0, done: null };
      this.shots.push(q);
    }
    if (!q) return;
    if (d.f === 'dead' || d.f === 'cut') {
      q.limbo = 0;
      q.dead = true;
      if (d.f === 'cut') q.cut = true; // (it falls in two as the scene clears it away)
      return;
    }
    const by = this.fighters[d.o]?.mon;
    if (!by) return;
    if (d.f === 'caught') { if (by.windup) q.caught = { m: by, w: by.windup }; return; }
    // 'turn' and 'orbit': it is where its decider says, going where it says, for whom it says
    Object.assign(q, { owner: by, x: d.x, y: d.y, vx: d.vx, vy: d.vy, speed: Math.hypot(d.vx, d.vy), dmg: d.dm, reflected: !!d.hv || undefined, limbo: 0, dead: false, caught: null, back: false, life: q.life0 ?? 0.75 });
    q.orbit = d.f === 'orbit' ? { m: by, a: 0, t: 99 } : null;
    q.done?.clear();
    q.img.setVisible(true);
  }

  // ---- what this client decides and has to say (see the same names in scene.js) ----
  // Messages are filed under a fighter of the sender's; the player's own is always one.
  sayHit(owner, t, mv, dealt, counter, shot) {
    if (!t.remote && mv?.id) this.tell({ k: 'hv', s: t.slot, a: owner.slot, mv: mv.id, n: r1(dealt), c: counter ? 1 : 0, sh: shot?.id });
  }

  // by: the fighter that caught it, for 'caught' and 'orbit'; otherwise the shot's owner (after a turn, its new one) is what matters
  sayShot(q, f, by) {
    if (!q.id) return;
    const who = by ?? q.owner, from = who.remote ? this.player : who;
    this.tell({ k: 'sf', s: from.slot, o: who.slot, id: q.id, f, x: r1(q.x), y: r1(q.y), vx: r1(q.vx), vy: r1(q.vy), dm: r1(q.dmg), mv: q.mv?.id, r: q.r, hv: q.reflected ? 1 : 0 });
  }

  sayClash(c, auth, lost) {
    const other = c.a.m === auth ? c.b.m : c.a.m;
    this.tell({ k: 'cl', s: auth.slot, o: other.slot, u: Math.round((c.a.m === auth ? c.u : 1 - c.u) * 1000) / 1000, e: lost ? lost.m.slot : undefined });
  }

  sayTap(m) { this.tell({ k: 'ct', s: m.slot }); }

  // A puppet's wind-up only plays; its owner says when the move goes off.
  updateWindup(m, dt) {
    if (!m.remote) return super.updateWindup(m, dt);
    const w = m.windup;
    if (!w || m.state !== 'windup') return;
    w.t += dt;
    if (w.mv.grow) w.radius = Math.min(w.mv.grow.max, w.mv.grow.min + w.mv.grow.rate * w.t);
    m.sprite.setTint(Math.floor(w.t * 24) % 2 ? 0xfff0a0 : 0xffffff);
  }

  // A puppet flying as a held move goes where its owner flies it, hitting what it passes, until the owner lets go.
  updateHolds(dt) {
    const theirs = this.holds.filter((h) => h.m.remote);
    this.holds = this.holds.filter((h) => !h.m.remote);
    super.updateHolds(dt);
    for (const h of theirs) {
      const { m, mv } = h;
      if (m.state !== 'bird') { m.hidden = false; h.img.destroy(); if (mv.dig || mv.fly) this.digOut(h); continue; }
      h.t += dt;
      if (mv.fly) m.hop = Math.min(38, h.t * 220);
      h.img.setTexture(mv.frames[Math.floor(h.t * (mv.fps ?? 12)) % mv.frames.length]).setFlipX(m.dir >= 5)
        .setPosition(Math.round(m.x), Math.round(m.y) - (mv.dig ? 2 : 10)).setDepth(mv.dig ? 12 + m.y : 60 + m.y);
      if (mv.dig) this.digTrail(h, dt);
      else if (!mv.fly) this.hitCircle(m, m.x, m.y, mv.radius, h.dmg, mv);
      this.holds.push(h);
    }
  }

  // ---- the four battle moves ----
  // Each has its own button, so the player's mon has no "equipped" move between uses: it is set for the moment a
  // move starts and cleared again (which also keeps the engine from drawing a landing ring for a move not chosen).
  equipped() { return null; }

  // track: what the move is aimed with, 'pointer' (the mouse) or 'touch' (the touch pad's move buttons).
  fire(i, track = 'pointer') {
    const p = this.player, id = this.moves[i];
    if (!id || (p.ailment.encore && i !== this.slot)) return; // encored: only the move just used will come out
    p.move = id;
    if (this.useMove(p, track)) { this.slot = i; this.pilot?.acted(); }
    p.move = null;
  }

  // A held move (a widening blast, a flight) lasts while the button that started it stays down.
  holding(m, track, t) {
    if (m !== this.player || typeof track === 'object') return super.holding(m, track, t);
    if (track === 'touch') return this.live && touch.held[this.slot];
    const ptr = this.input.activePointer, k = this.moveKeys;
    if (this.auto) return this.live && [k.Q, k.W, k.E, k.R][this.slot].isDown;
    return this.live && [ptr.leftButtonDown(), ptr.rightButtonDown(), k.Q.isDown, k.E.isDown][this.slot];
  }

  // ---- the touch pad (touch.js) ----
  // With no pointer to aim with, a move from the pad goes at the nearest foe, or the way its button is dragged.
  // A flight is steered with the d-pad.
  aimOf(m, track) {
    if (track !== 'touch') return super.aimOf(m, track);
    const a = touch.aim, [sx, sy] = touch.stick;
    // A teleport lands where its guide is. Dragged, that is where the drag points. Otherwise it is as far as the move
    // goes the way the stick is pushed (or the mon faces): always for one that only moves (Teleport), and for one that
    // strikes when the stick is pushed or the button is held. A plain tap of a striking one goes at the nearest foe.
    const mv = MOVES[m.move] ?? MOVES[this.moves[touch.aiming]];
    if (!a && mv?.kind === 'blink' && m === this.player && (!mv.dmg || sx || sy || holdAim())) {
      const l = Math.hypot(sx, sy), [fx, fy] = l ? [sx / l, sy / l] : dirVec(m.dir), n = Math.hypot(fx, fy) || 1;
      return { dx: fx / n, dy: fy / n, dist: mv.range ?? 100 };
    }
    if (a) return { dx: a.dx, dy: a.dy, dist: 40 + a.reach * 100 };
    if (m.state === 'bird' && (sx || sy)) return { dx: sx, dy: sy, dist: 99 };
    // a button held (not tapped) and not dragged yet: aimed by hand, starting just ahead of the player, the way it
    // faces or the stick is pushed. That is where a drag starts from, so the guide does not jump when one begins.
    if (m === this.player && holdAim()) {
      const l = Math.hypot(sx, sy), [fx, fy] = l ? [sx / l, sy / l] : dirVec(m.dir), n = Math.hypot(fx, fy) || 1;
      return { dx: fx / n, dy: fy / n, dist: 40 };
    }
    let foe = null, near = Infinity;
    for (const n of this.npcs) {
      const d = Math.hypot(n.x - m.x, n.y - m.y);
      if (n.team !== m.team && n.alive && !n.hidden && d < near) { foe = n; near = d; }
    }
    return super.aimOf(m, foe);
  }

  // What the pad's fight buttons show: the moves, whether there is the stamina for each, and the one being charged
  // or held. Null while there is no fighting to do, which gives the pad back to the menus.
  padState() {
    if (!this.live) return null;
    const p = this.player;
    // instant: the moves that go off on the press rather than being aimed first (held ones, or any press while a
    // beam clash or a dance is taking taps)
    return { moves: this.moves, instant: this.instantMoves(), running: p.running, stamina: p.stamina, hot: p.state === 'windup' || p.state === 'bird' ? this.slot : -1 };
  }

  // Which of the four go off on the press rather than being aimed first and thrown on the release.
  instantMoves() {
    const p = this.player, tapping = !!p.dance || !!p.beaming?.clash;
    return this.moves.map((id) => { const mv = MOVES[id]; return tapping || !mv || (touch.on && !!mv.volley) || !!(mv.stream || mv.guard || mv.grow || mv.catch || mv.ritual || mv.steer || mv.flurry || mv.stance || mv.kind === 'beam' || mv.kind === 'hold'); }); // (on the pad a volley is held for)
  }

  // A move's key or mouse button went down, and came up: a held move starts on the press; any other is aimed while the
  // button is down (a guide shows where it will go) and used when it is let go.
  press(i) {
    if (!this.live || !this.moves[i]) return;
    if (this.instantMoves()[i]) return this.fire(i);
    this.aiming = i;
  }

  release(i) {
    if (this.aiming !== i) return;
    this.aiming = -1;
    if (this.live) this.fire(i);
  }

  // A fight button went down: 'move' (with its slot), 'jump', or 'parry', which calls off a charging move instead.
  padPress(button, i) {
    if (!this.live) return;
    if (button === 'move') this.fire(i, 'touch');
    else if (button === 'jump') this.jump();
    else if (!this.cancelMove(this.player)) this.parry(this.player);
    // (Run is not a press: the pad holds touch.run while its button is down, see sprinting)
  }

  // While a move's button is held on the pad, a guide on the ground shows where it will go: a dotted line from the
  // player and a ring where it lands (or how far it reaches).
  drawAim() {
    // the move being aimed, or a held one whose button is down
    const track = touch.on ? 'touch' : 'pointer';
    const i = !this.live ? -1 : touch.on ? (touch.aiming >= 0 ? touch.aiming : touch.held.findIndex(Boolean)) : this.aiming, mv = MOVES[this.moves[i]];
    if (!mv && !this.aimG) return;
    const g = (this.aimG ??= this.add.graphics().setDepth(7)).clear();
    if (!mv) return;
    // a press on the pad that may still turn out to be a tap shows no guide yet: a tap goes at the nearest foe, and the
    // guide of a hold starts ahead of the player, so it is never first seen at the spot the tap would have picked
    if (touch.on && touch.aiming >= 0 && !touch.aim && !holdAim()) return;
    // a move that carries the user about while its button is down (Dig, Surf, Brave Bird...) is steered, not aimed
    if (mv.kind === 'hold') return;
    const p = this.player, a = this.aimOf(p, track), col = (this.reticle ??= this.reticleColor()), dark = 0x06101c;
    const on = p.stamina >= mv.cost || p.state === 'windup' || p.state === 'bird' || !!p.beaming ? 1 : 0.4; // faint: no energy for it
    // every mark is drawn dark first and then in colour over it, so it reads on any ground
    const ring = (x, y, r) => g.lineStyle(3, dark, 0.55 * on).strokeEllipse(x, y, r * 2, r * 1.54).fillStyle(col, 0.16 * on).fillEllipse(x, y, r * 2, r * 1.54).lineStyle(1, col, on).strokeEllipse(x, y, r * 2, r * 1.54);
    if (mv.kind === 'self') return ring(p.x, p.y, 13);
    if (mv.kind === 'aoe') return ring(p.x, p.y, mv.grow?.max ?? mv.radius);
    const spot = mv.kind === 'mid' || mv.kind === 'blink' || mv.lob;
    const reach = spot ? Phaser.Math.Clamp(a.dist, 24, mv.range ?? 100) : mv.kind === 'melee' ? mv.reach + 14 + (mv.step ?? 0) : mv.range ?? mv.length ?? mv.dash ?? 100;
    for (let d = 12; d < reach - 6; d += 8) {
      const x = Math.round(p.x + a.dx * d), y = Math.round(p.y + a.dy * d);
      g.fillStyle(dark, 0.55 * on).fillRect(x - 2, y - 2, 4, 4).fillStyle(col, on).fillRect(x - 1, y - 1, 2, 2);
    }
    // (a teleport's ring is where it will really come out: short of a wall, if there is one in the way)
    const end = mv.kind === 'blink' ? this.blinkSpot(p, mv, a) : { x: p.x + a.dx * reach, y: p.y + a.dy * reach };
    ring(end.x, end.y, spot ? (mv.burst ?? mv.radius) || 12 : Math.max(5, mv.radius ?? 6));
  }

  // The aim guide's colour on this stage: whichever of a few strong colours stands furthest from the ground's own.
  reticleColor() {
    const c = document.createElement('canvas'), g = c.getContext('2d', { willReadFrequently: true });
    c.width = c.height = 16;
    let avg = [128, 128, 128];
    try {
      g.drawImage(this.bg.texture.getSourceImage(), 0, 0, 16, 16);
      const px = g.getImageData(0, 0, 16, 16).data;
      avg = [0, 1, 2].map((k) => { let sum = 0; for (let n = k; n < px.length; n += 4) sum += px[n]; return sum / 256; });
    } catch { /* an image that cannot be read: the middle grey will do */ }
    const far = (hex) => Math.hypot(((hex >> 16) & 255) - avg[0], ((hex >> 8) & 255) - avg[1], (hex & 255) - avg[2]);
    return [0xfff35c, 0xff4fa0, 0x4ff3ff, 0xffffff, 0xff7a1a, 0xb4ff4f].reduce((best, hex) => (far(hex) > far(best) ? hex : best));
  }

  setMove() {}
  cycleMove() {}
  emitCharacter() {}
  toWorld() { this.pause(); }

  // ---- input ----
  get live() { return this.fighting && !this.menu && !this.card && !wipe.busy; }

  // The auto-move controls are on (see session.autoControls): a CpuController walks the player's mon (the pilot).
  get auto() { return autoControls() && !touch.on && !this.cfg.auto; }

  inputDir() {
    if (!this.live) return [0, 0];
    if (this.cfg.auto || this.pilot) return this.autoWalk ? [this.autoWalk.vx, this.autoWalk.vy] : [0, 0];
    const [x, y] = super.inputDir();
    return x || y ? [x, y] : touch.stick;
  }

  // Shift, or the pad's Dash button; under the auto-move controls, the right mouse button.
  sprinting() {
    if (this.cfg.auto) return !!this.autoWalk?.run;
    if (this.pilot) return this.runHeld();
    return super.sprinting() || touch.run;
  }

  // The dash button under the auto-move controls: right click (or Shift). Which way it runs is the pilot's call.
  runHeld() { return this.input.activePointer.rightButtonDown() || super.sprinting(); }

  // Moves 1 and 2 are the left and right mouse buttons, 3 and 4 are Q and E; all four go where the pointer is.
  // Under the auto-move controls the four are Q W E R, left click parries (or calls off a move) and right click runs.
  bindInput() {
    const fresh = keyGuard();
    this.moveKeys = this.input.keyboard.addKeys('Q,W,E,R');
    const AUTO_KEYS = { KeyQ: 0, KeyW: 1, KeyE: 2, KeyR: 3 };
    this.input.keyboard.on('keydown', (e) => {
      // the key that closes a menu (Space, E) must not also jump or parry
      if (e.repeat || !fresh(e) || this.game.loop.frame === this.menuClosedOn) return;
      if (e.code === 'Escape') return this.pause();
      if (!this.live) return;
      const p = this.player;
      if (this.auto) {
        if (e.code in AUTO_KEYS) this.press(AUTO_KEYS[e.code]);
        else if (e.code === 'KeyC') { this.aiming = -1; this.cancelMove(p); }
        else if (e.code === 'Space') this.jump();
        return;
      }
      if (e.code === 'KeyQ') this.press(2);
      else if (e.code === 'KeyE') this.press(3);
      else if (e.code === 'KeyR') { if (this.aiming >= 0) this.aiming = -1; else this.parry(p); } // (R calls off a move being aimed)
      else if (e.code === 'KeyC') { this.aiming = -1; this.cancelMove(p); }
      else if (e.code === 'Space') this.jump();
      else if (e.code === 'KeyK') this.basicShot(null);
      else if (BASIC_KEYS[e.code] && !(p.ailment.noAttack && COMBAT[BASIC_KEYS[e.code]])) { p.aim = null; p.act(BASIC_KEYS[e.code]); }
    });
    this.input.mouse.disableContextMenu();
    this.input.on('pointerdown', (ptr) => {
      if (!this.live || ptr.wasTouch) return; // a finger on the arena does nothing: the moves are on the pad
      if (this.auto) {
        // (right click is run, read as it is held: see sprinting)
        if (ptr.button === 0) { if (this.aiming >= 0) this.aiming = -1; else if (!this.cancelMove(this.player)) this.parry(this.player); }
        return;
      }
      if (ptr.button === 0) this.press(0);
      else if (ptr.button === 2) this.press(1);
    });
    const up = (ptr) => { if (!ptr.wasTouch && !this.auto) this.release(ptr.button === 2 ? 1 : 0); };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);
    this.input.keyboard.on('keyup', (e) => {
      if (this.auto) { if (e.code in AUTO_KEYS) this.release(AUTO_KEYS[e.code]); return; }
      if (e.code === 'KeyQ') this.release(2); else if (e.code === 'KeyE') this.release(3);
    });
  }

  // ---- menus ----
  // Against the computer the fight stops while a menu is up. With other players in it, it cannot: only your hands leave the keys.
  freeze(on) {
    this.frozen = on && !this.online;
    this.time.paused = this.frozen;
  }

  pause() {
    if (this.menu || this.card || this.over || wipe.busy) return;
    this.freeze(true);
    this.menu = new Menu(this, this.actions, {
      x: (VIEW_W - 116) >> 1, y: 74, w: 116, title: this.online ? 'Menu' : 'Paused',
      items: [{ label: 'Keep fighting' }, { label: 'Controls' }, ...soundRows(), ...(touch.on ? [] : [{ label: moveRow() }]), { label: this.online ? 'Give up' : this.leaveLabel ?? 'Back to the dojo' }],
      onPick: (i) => {
        if (i === 1) return this.showControls();
        if (soundPick(this.menu, i, 2)) return;
        if (i === 4 && !touch.on) {
          setAutoControls(!autoControls());
          this.aiming = -1;
          this.hud.destroy();
          this.hud = new BattleHud(this, this.player, this.moves); // (the chips name the buttons)
          return this.menu.rows[4].setText(moveRow());
        }
        this.resume();
        if (i === (touch.on ? 4 : 5)) this.leave();
      },
      onCancel: () => this.resume(),
    });
  }

  resume() {
    this.menu?.close();
    this.menu = null;
    this.freeze(false);
    this.menuClosedOn = this.game.loop.frame;
  }

  showControls(then) {
    if (this.card) return;
    this.freeze(true);
    this.card = controlsCard(this);
    const close = () => {
      this.actions.pop(keys);
      this.input.off('pointerdown', close);
      for (const o of this.card) o.destroy();
      this.card = null;
      this.menuClosedOn = this.game.loop.frame;
      if (!this.menu) this.freeze(false);
      then?.();
    };
    const keys = this.actions.push({ confirm: close, cancel: close });
    this.input.on('pointerdown', close);
  }

  // The pilot of the auto-move controls, made when they are turned on and dropped when they are turned off.
  steerPilot(dt) {
    if (!this.auto) { if (this.pilot) this.pilot = this.autoWalk = null; return; }
    this.pilot ??= new CpuController(this, this.player, { moves: this.moves, slot: this.player.slot, skill: 4 }, true);
    this.pilot.moves = this.moves;
    this.pilot.update(dt);
  }

  update(t, ms) {
    if (!this.frozen) {
      const dt = Math.min(ms, 50) / 1000;
      this.steerPilot(dt);
      for (const x of this.fighters) x.controller?.update(dt);
      super.update(t, ms);
      if (this.fighting) this.clock += dt;
      if (this.ledges.length) for (const x of this.fighters) if (!x.mon.remote) this.checkLedge(x.mon);
      this.checkOutcome();
      this.sinceSnapshot += ms;
      if (this.online && this.sinceSnapshot >= SNAPSHOT_MS) {
        this.sinceSnapshot = 0;
        for (const x of this.fighters) if (mine(x.f)) this.tell({ ...snapshot(x.mon), in: this.inputOf(x.mon), cz: x.mon.chill?.n ?? 0, stn: r1(x.mon.stun), lk: x.mon.locked ? 1 : 0, tm: x.mon.torment ? 1 : 0 });
      }
    }
    for (const { mon, tag, name } of this.fighters) {
      const x = Math.round(mon.x), y = Math.round(mon.y), shown = mon.alive && !mon.hidden && !mon.cloaked; // (cloaked: among its Double Team copies)
      tag?.setVisible(shown).setPosition(x, y - 30);
      name?.setVisible(shown).setPosition(x, y - 33);
      mon.sprite.setAlpha(mon.alive ? 1 : 0.45); // down and out
    }
    if (this.score) this.showScore();
    this.drawAim();
    this.hud.refresh(this.aiming >= 0 ? this.aiming : this.player.state === 'windup' || this.player.state === 'bird' ? this.slot : -1);
  }
}
