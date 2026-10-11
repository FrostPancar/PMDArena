import Phaser from 'phaser';
import { Play, KEYS, COMBAT, VIEW_W, VIEW_H } from '../../scene.js';
import { MOVES } from '../../moves.js';
import { loadSpecies, ensureSpecies } from '../../sprites.js';
import { Mon, dirVec } from '../../mon.js';
import { Actions, keyGuard } from '../input.js';
import { go, wipe } from '../transition.js';
import { session, saveSession, bookBattle } from '../session.js';
import { net } from '../net.js';
import { mine, lookOf, arenaOf, arenaName, startingSpots } from '../modes.js';
import { LEDGES } from '../ledges.js';
import { CpuController, RemoteController, snapshot } from '../controllers.js';
import { BattleHud, controlsCard, resultCard } from '../hud.js';
import { touch } from '../touch.js';
import { Menu, banner, panel, text, INK } from '../ui.js';

// The basic attacks kept on the keyboard next to the mouse: lunge, shot, double hit, charge up.
const BASIC_KEYS = Object.fromEntries(Object.entries(KEYS).filter(([, anim]) => COMBAT[anim] || anim === 'Charge'));
const SNAPSHOT_MS = 50;
const TAG = { ally: 0x8fdcff, foe: 0xff7a6a };
const MOVE_ID = new Map(Object.entries(MOVES).map(([id, mv]) => [mv, id]));
const r1 = (n) => Math.round(n * 10) / 10;
const JUMP_TIME = 0.55; // how long Mon keeps a jump in the air

// A fight on one of the stages, 1v1 or 2v2. All the combat is the playground's Play scene; this adds who is fighting
// (the battle from modes.js or the relay), the player's four moves, the HUD, the result and the way back to the dojo.
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
    this.started = false;
    this.over = false;
    this.sinceSnapshot = 0;
    super.init({ map: arenaOf(this.cfg) });
    this.ledges = LEDGES[this.mapId] ?? [];
  }

  // Evolved forms are only loaded when someone in the fight wears one.
  preload() { loadSpecies(this, this.cfg.fighters.map(lookOf)); }

  create() {
    for (const f of this.cfg.fighters) ensureSpecies(this, lookOf(f));
    // only the menus use these (fighting reads keys and mouse directly); made first so that the Esc press
    // that opens the pause menu is not also read as backing out of it
    this.actions = new Actions(this);
    super.create();
    for (const x of this.fighters) if (this.gone.includes(x.f.owner) && x.controller instanceof RemoteController) x.controller.drop();
    this.hud = new BattleHud(this, this.player, this.me.moves);
    this.menuTab();

    const rivals = this.cfg.fighters.filter((f) => f.team !== this.me.team);
    this.label = `${this.cfg.mode} ${rivals.every((f) => f.kind === 'cpu') ? 'vs CPU' : 'vs players'}`; // also how the records file this fight
    const announce = () => banner(this, arenaName(this.cfg), this.label);

    if (this.online) {
      const offs = [
        net.on('b', (msg) => {
          const x = this.fighters[msg.d?.s];
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
    this.fighters = this.cfg.fighters.map((f, i) => {
      const [x, y] = spots[i], team = f.team === this.me.team ? 'p' : 'n';
      let mon = this.player;
      if (f === this.me) Object.assign(mon, { x, y, home: { x, y } });
      else {
        mon = new Mon(this, x, y, { team, species: lookOf(f), move: f.moves[0] });
        this.npcs.push(mon);
      }
      mon.slot = f.slot;
      const controller = f === this.me ? null : mine(f) ? new CpuController(this, mon, f) : new RemoteController(this, mon, f);
      // an arrowhead over everyone else, blue for your side and red for the other; other players also show their name
      const tint = team === 'p' ? TAG.ally : TAG.foe;
      const tag = f === this.me ? null : this.add.image(x, y, 'tag').setTint(tint).setDepth(9003);
      const name = tag && f.kind === 'human' && f.name ? this.add.bitmapText(x, y, 'pmd', f.name).setOrigin(0.5, 1).setTint(tint).setDepth(9003) : null;
      return { f, mon, controller, tag, name };
    });
    // the two sides start facing each other
    for (const x of this.fighters) {
      const other = this.fighters.find((o) => o.mon.team !== x.mon.team);
      if (other) x.mon.face(other.mon.x, other.mon.y);
    }
    this.cameras.main.centerOn(this.player.x, this.player.y);
  }

  get fighting() { return this.started && !this.over; }

  // Nobody gets back up; the fight ends when one side has nobody standing.
  fainted() {}

  checkOutcome() {
    if (!this.fighting) return;
    const standing = (team) => this.fighters.some((x) => x.mon.team === team && x.mon.alive);
    const us = standing('p'), them = standing('n');
    if (us && them) {
      // out of the fight but your partner is not: watch them
      if (!this.player.alive && !this.watching) {
        this.watching = this.fighters.find((x) => x.mon.team === 'p' && x.mon.alive).mon;
        this.cameras.main.startFollow(this.watching.sprite, true, 0.2, 0.2);
      }
      return;
    }
    this.end(us ? 'You won!' : them ? (this.cfg.mode === '2v2' ? 'Your team fainted...' : 'You fainted...') : 'A draw!', us);
  }

  // won: true or false books the fight (EXP, records) and shows what it earned; null is a fight that did not count.
  end(message, won) {
    if (this.over) return;
    const earned = won === null || !this.started ? null : this.book(won, false);
    this.over = true;
    this.resume();
    this.waiting?.destroy();
    banner(this, message);
    this.time.delayedCall(2200, () => (earned ? this.showResult(earned) : this.leave()));
  }

  // What the fight was worth to the mon that fought it (see progress.js for the sums).
  book(won, gaveUp) {
    const p = this.player, foes = this.fighters.filter((x) => x.mon.team === 'n');
    return bookBattle({
      mode: this.label, won, gaveUp, seconds: this.clock,
      dealt: foes.reduce((sum, x) => sum + 1 - Math.max(0, x.mon.hp) / x.mon.maxHp, 0) / foes.length,
      kept: Math.max(0, p.hp) / p.maxHp,
      kos: foes.filter((x) => !x.mon.alive).length,
    });
  }

  showResult(earned) {
    this.card = resultCard(this, this.me.species, earned);
    const done = () => { if (this.card) { this.card = null; this.leave(); } };
    this.actions.push({ confirm: done, cancel: done });
    this.input.on('pointerdown', done);
    this.time.delayedCall(9000, done);
  }

  // Walking out mid-fight is giving up: it books a loss for a part of the EXP, and the relay tells the others,
  // whose copies of your fighters drop.
  leave() {
    if (this.fighting) this.book(false, true);
    this.over = true;
    if (this.online) net.send('battle.over');
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
  tell(d) { if (this.online) net.send('b', { d }); }

  useMove(m, track) {
    const ok = super.useMove(m, track);
    if (ok && !m.remote) {
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
    if (!m.remote) this.tell({ k: 'f', s: m.slot, mv: MOVE_ID.get(mv), x: r1(m.x), y: r1(m.y), big: m.charged ? 1 : 0, aim: { dx: aim.dx, dy: aim.dy, dist: aim.dist, radius: aim.radius } });
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
  }

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
      if (m.state !== 'bird') { m.hidden = false; h.img.destroy(); continue; }
      h.t += dt;
      h.img.setTexture(mv.frames[Math.floor(h.t * (mv.fps ?? 12)) % mv.frames.length]).setFlipX(m.dir >= 5)
        .setPosition(Math.round(m.x), Math.round(m.y) - 10).setDepth(60 + m.y);
      this.hitCircle(m, m.x, m.y, mv.radius, h.dmg, mv);
      this.holds.push(h);
    }
  }

  // ---- the four battle moves ----
  // Each has its own button, so the player's mon has no "equipped" move between uses: it is set for the moment a
  // move starts and cleared again (which also keeps the engine from drawing a landing ring for a move not chosen).
  equipped() { return null; }

  // track: what the move is aimed with, 'pointer' (the mouse) or 'touch' (the touch pad's move buttons).
  fire(i, track = 'pointer') {
    const p = this.player, id = this.me.moves[i];
    if (!id || (p.ailment.encore && i !== this.slot)) return; // encored: only the move just used will come out
    p.move = id;
    if (this.useMove(p, track)) this.slot = i;
    p.move = null;
  }

  // A held move (a widening blast, a flight) lasts while the button that started it stays down.
  holding(m, track, t) {
    if (m !== this.player) return super.holding(m, track, t);
    if (track === 'touch') return this.live && touch.held[this.slot];
    const ptr = this.input.activePointer;
    return this.live && [ptr.leftButtonDown(), ptr.rightButtonDown(), this.moveKeys.Q.isDown, this.moveKeys.E.isDown][this.slot];
  }

  // ---- the touch pad (touch.js) ----
  // With no pointer to aim with, a move from the pad goes at the nearest foe, or the way its button is dragged.
  // A flight is steered with the d-pad.
  aimOf(m, track) {
    if (track !== 'touch') return super.aimOf(m, track);
    const a = touch.aim, [sx, sy] = touch.stick;
    if (a) return { dx: a.dx, dy: a.dy, dist: 40 + a.reach * 100 };
    if (m.state === 'bird' && (sx || sy)) return { dx: sx, dy: sy, dist: 99 };
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
    return { moves: this.me.moves, stamina: p.stamina, hot: p.state === 'windup' || p.state === 'bird' ? this.slot : -1 };
  }

  // A fight button went down: 'move' (with its slot), 'jump', or 'parry', which calls off a charging move instead.
  padPress(button, i) {
    if (!this.live) return;
    if (button === 'move') this.fire(i, 'touch');
    else if (button === 'jump') this.jump();
    else if (!this.cancelMove(this.player)) this.parry(this.player);
  }

  setMove() {}
  cycleMove() {}
  emitCharacter() {}
  toWorld() { this.pause(); }

  // ---- input ----
  get live() { return this.fighting && !this.menu && !this.card && !wipe.busy; }

  inputDir() {
    if (!this.live) return [0, 0];
    const [x, y] = super.inputDir();
    return x || y ? [x, y] : touch.stick;
  }

  // Shift, or the d-pad pushed out to its rim.
  sprinting() { return super.sprinting() || touch.full; }

  // Moves 1 and 2 are the left and right mouse buttons, 3 and 4 are Q and E; all four go where the pointer is.
  bindInput() {
    const fresh = keyGuard();
    this.moveKeys = this.input.keyboard.addKeys('Q,E');
    this.input.keyboard.on('keydown', (e) => {
      // the key that closes a menu (Space, E) must not also jump or parry
      if (e.repeat || !fresh(e) || this.game.loop.frame === this.menuClosedOn) return;
      if (e.code === 'Escape') return this.pause();
      if (!this.live) return;
      const p = this.player;
      if (e.code === 'KeyQ') this.fire(2);
      else if (e.code === 'KeyE') this.fire(3);
      else if (e.code === 'KeyR') this.parry(p);
      else if (e.code === 'KeyC') this.cancelMove(p);
      else if (e.code === 'Space') this.jump();
      else if (e.code === 'KeyK') this.basicShot(null);
      else if (BASIC_KEYS[e.code] && !(p.ailment.noAttack && COMBAT[BASIC_KEYS[e.code]])) { p.aim = null; p.act(BASIC_KEYS[e.code]); }
    });
    this.input.mouse.disableContextMenu();
    this.input.on('pointerdown', (ptr) => {
      if (!this.live || ptr.wasTouch) return; // a finger on the arena does nothing: the moves are on the pad
      if (ptr.button === 0) this.fire(0);
      else if (ptr.button === 2) this.fire(1);
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
      items: [{ label: 'Keep fighting' }, { label: 'Controls' }, { label: this.online ? 'Give up' : this.leaveLabel ?? 'Back to the dojo' }],
      onPick: (i) => {
        if (i === 1) return this.showControls();
        this.resume();
        if (i === 2) this.leave();
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

  update(t, ms) {
    if (!this.frozen) {
      const dt = Math.min(ms, 50) / 1000;
      for (const x of this.fighters) x.controller?.update(dt);
      super.update(t, ms);
      if (this.fighting) this.clock += dt;
      if (this.ledges.length) for (const x of this.fighters) if (!x.mon.remote) this.checkLedge(x.mon);
      this.checkOutcome();
      this.sinceSnapshot += ms;
      if (this.online && this.sinceSnapshot >= SNAPSHOT_MS) {
        this.sinceSnapshot = 0;
        for (const x of this.fighters) if (mine(x.f)) this.tell(snapshot(x.mon));
      }
    }
    for (const { mon, tag, name } of this.fighters) {
      const x = Math.round(mon.x), y = Math.round(mon.y), shown = mon.alive && !mon.hidden;
      tag?.setVisible(shown).setPosition(x, y - 30);
      name?.setVisible(shown).setPosition(x, y - 33);
      mon.sprite.setAlpha(mon.alive ? 1 : 0.45); // down and out
    }
    this.hud.refresh(this.player.state === 'windup' || this.player.state === 'bird' ? this.slot : -1, this.slot);
  }
}
