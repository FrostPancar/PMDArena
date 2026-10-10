import { Play, KEYS, COMBAT, VIEW_W } from '../../scene.js';
import { Mon } from '../../mon.js';
import { Actions, keyGuard } from '../input.js';
import { go, wipe } from '../transition.js';
import { session, saveSession } from '../session.js';
import { MODES, arenaName } from '../modes.js';
import { controllerFor } from '../controllers.js';
import { BattleHud, controlsCard } from '../hud.js';
import { Menu, banner, panel, text, INK } from '../ui.js';

// The basic attacks kept on the keyboard next to the mouse: lunge, shot, double hit, charge up.
const BASIC_KEYS = Object.fromEntries(Object.entries(KEYS).filter(([, anim]) => COMBAT[anim] || anim === 'Charge'));

// A fight on one of the stages. All the combat is the playground's Play scene; this adds who is fighting
// (from the battle config made in modes.js), the player's four-move loadout, the HUD and the way back to the dojo.
export class Battle extends Play {
  constructor() { super('battle'); }

  init(data) {
    this.cfg = data.battle;
    this.me = this.cfg.fighters.find((f) => f.control === 'local');
    this.registry.set('species', this.me.species);
    this.slot = 0;
    this.paused = false;
    this.over = false;
    this.card = null;
    super.init({ map: this.cfg.map });
  }

  create() {
    // only the menus use these (fighting reads keys and mouse directly); made first so that the Esc press
    // that opens the pause menu is not also read as backing out of it
    this.actions = new Actions(this);
    super.create();
    this.hud = new BattleHud(this, this.player, this.me.moves, (i) => this.setSlot(i));
    const tab = panel(this, VIEW_W - 55, 3, 52, 15, 'dim').setInteractive({ useHandCursor: true });
    tab.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); this.pause(); });
    text(this, VIEW_W - 50, 5, 'Esc', INK.gold);
    text(this, VIEW_W - 30, 5, 'Menu');
    const mode = MODES[this.cfg.mode];
    const announce = () => banner(this, arenaName(this.cfg.map), this.rivals.length ? mode.name : `${mode.name} · no rival yet, free practice`);
    this.events.once('create', () => {
      if (session.briefed.controls) return announce();
      session.briefed.controls = true;
      saveSession();
      this.showControls(announce);
    });
  }

  // ---- who is fighting ----
  // Everyone but the local player comes from the battle config, each with a controller. No mode supplies anyone yet.
  spawnNpcs() {
    const spots = this.scatterNpcs(this.bg.width, this.bg.height);
    this.rivals = this.cfg.fighters.filter((f) => f !== this.me).map((f, i) => {
      const at = spots[i % spots.length] ?? { x: this.map.spawn[0] + 60, y: this.map.spawn[1] };
      const mon = new Mon(this, at.x, at.y, { team: f.team, species: f.species, move: f.moves[0] });
      this.npcs.push(mon);
      return { fighter: f, mon, controller: controllerFor(this, mon, f) };
    });
  }

  fainted(m) {
    if (!this.rivals.length) return super.fainted(m); // practice: get back up where you started
    const foesLeft = this.rivals.some((r) => r.mon.alive && r.mon.team !== this.player.team);
    if (m === this.player) this.finish(false);
    else if (!foesLeft) this.finish(true);
  }

  finish(won) {
    if (this.over) return;
    this.over = true;
    banner(this, won ? 'You won!' : 'You fainted...');
    this.time.delayedCall(2400, () => this.leave());
  }

  leave() { go(this, 'hub', { area: 'basement', entry: 'pillar' }); }

  // ---- the four battle moves ----
  equipped() { return this.me.moves[this.slot]; }

  setSlot(i) {
    if (!this.me.moves[i] || this.player.ailment.encore) return;
    this.slot = i;
    this.player.move = this.me.moves[i];
  }

  setMove(id) { this.setSlot(this.me.moves.indexOf(id)); }
  cycleMove(step) { this.setSlot((this.slot + step + this.me.moves.length) % this.me.moves.length); }
  emitCharacter() {}
  toWorld() { this.pause(); }

  // ---- input ----
  get live() { return !this.paused && !this.over && !wipe.busy; }

  bindInput() {
    const fresh = keyGuard();
    this.input.keyboard.on('keydown', (e) => {
      // the key that closes a menu (Space, E) must not also jump or parry
      if (e.repeat || !fresh(e) || !this.live || this.game.loop.frame === this.menuClosedOn) return;
      const p = this.player;
      if (e.code === 'Escape') this.pause();
      else if (/^Digit[1-4]$/.test(e.code)) this.setSlot(+e.code[5] - 1);
      else if (e.code === 'Space') this.jump();
      else if (e.code === 'KeyE') this.parry(p);
      else if (e.code === 'KeyQ') this.cycleMove(1);
      else if (e.code === 'KeyF') this.useMove(p, null);
      else if (e.code === 'KeyK') this.basicShot(null);
      else if (BASIC_KEYS[e.code] && !(p.ailment.noAttack && COMBAT[BASIC_KEYS[e.code]])) { p.aim = null; p.act(BASIC_KEYS[e.code]); }
    });
    this.input.mouse.disableContextMenu();
    this.input.on('pointerdown', (ptr) => {
      if (!this.live) return;
      if (ptr.button === 2) this.useMove(this.player, 'pointer');
      else if (ptr.button === 0 && !this.cancelMove(this.player)) this.basicShot('pointer');
    });
    this.input.on('wheel', (_p, _o, _dx, dy) => this.live && this.cycleMove(dy > 0 ? 1 : -1));
  }

  // ---- menus ----
  pause() {
    if (!this.live) return;
    this.paused = true;
    this.time.paused = true;
    this.menu = new Menu(this, this.actions, {
      x: (VIEW_W - 116) >> 1, y: 74, w: 116, title: 'Paused',
      items: [{ label: 'Keep fighting' }, { label: 'Controls' }, { label: 'Back to the dojo' }],
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
    this.paused = false;
    this.time.paused = false;
    this.menuClosedOn = this.game.loop.frame;
  }

  showControls(then) {
    if (this.card) return;
    const wasPaused = this.paused;
    this.paused = true;
    this.card = controlsCard(this);
    const close = () => {
      this.actions.pop(keys);
      this.input.off('pointerdown', close);
      for (const o of this.card) o.destroy();
      this.card = null;
      this.menuClosedOn = this.game.loop.frame;
      if (!wasPaused) this.paused = false;
      then?.();
    };
    const keys = this.actions.push({ confirm: close, cancel: close });
    this.input.on('pointerdown', close);
  }

  update(t, ms) {
    if (!this.paused) {
      const dt = Math.min(ms, 50) / 1000;
      for (const r of this.rivals) r.controller?.update(dt);
      super.update(t, ms);
    }
    this.hud.refresh(this.slot);
  }
}
