import { SPECIES } from './sprites.js';
import { STATUS } from './moves.js';
import { iconFrame } from './statusfx.js';

// Sheet row order used by PMD sprites
export const DIR_NAMES = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'];
const DIRS = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
export const dirVec = (d) => {
  const [x, y] = DIRS[d];
  const l = Math.hypot(x, y);
  return [x / l, y / l];
};
export const dirFromVec = (x, y) => (((2 - Math.round(Math.atan2(y, x) / (Math.PI / 4))) % 8) + 8) % 8;

// Anims that keep playing / hold their last frame until the mon moves or acts again
const LOOP = new Set(['Sleep', 'EventSleep', 'Laying', 'Float', 'Head', 'LostBalance', 'Walk', 'Idle']);
const HOLD = new Set(['Sit', 'LookUp', 'Faint']);
const SLEEPY = new Set(['Sleep', 'EventSleep', 'Laying']);

export const RUN_MULT = 1.7;
const RUN_DRAIN = 26; // stamina per second
const STAMINA_REGEN = 24;
const REGEN_DELAY = 0.7;
export const JUMP_COST = 50; // a jump takes half the bar
const JUMP_TIME = 0.55;
const AIR_ACCEL = 240; // how hard movement keys steer a jump
const AIR_MAX = 125;

export class Mon {
  constructor(scene, x, y, o = {}) {
    Object.assign(this, { scene, x, y, dir: 0, team: o.team ?? 'n', ai: o.ai ?? null, baseTint: o.tint ?? null });
    this.species = SPECIES[o.species] ?? Object.values(SPECIES)[0];
    this.move = o.move ?? null;
    this.home = { x, y };
    this.maxHp = o.hp ?? 100;
    this.hp = this.maxHp;
    this.maxStamina = 100;
    this.stamina = this.maxStamina;
    this.regenDelay = 0;
    this.exhausted = false;
    this.power = o.power ?? 1;
    this.kx = this.ky = 0;
    this.invuln = 0;
    this.cooldown = 1;
    this.wander = { t: 1, tx: x, ty: y };
    this.charged = false;
    this.windup = null; // { mv, t, track } while charging an equipped move
    this.mute = false; // current action animation is follow-through only, no hit of its own
    this.aim = null; // exact aim for the next basic shot, else facing is used
    this.air = null;
    this.buried = 0; // seconds left stuck in the ground
    this.buffs = { atk: { mul: 1, t: 0 }, spd: { mul: 1, t: 0 }, def: { mul: 1, t: 0 }, eva: { mul: 1, t: 0 } }; // timed stat multipliers; eva dodges half of all hits
    this.shield = 0; // seconds left blocking every hit
    this.parry = 0; // seconds left in a parry window
    this.parryCd = 0;
    this.leech = null; // { t, dps, owner } while being drained
    this.flash = 0; // seconds left blinking white
    this.ingrain = null; // { t, hps } while rooted and healing
    this.regen = null; // { t, hps } healing over time
    this.sub = false; // drawn and hit as the substitute doll until the next hit
    this.ramp = null; // { mv, n, t } consecutive uses of a ramping move
    this.pending = null; // { mv, aim } melee move waiting for the lunge to connect
    this.status = null; // { kind, t } while burned, poisoned, paralysed or frozen
    this.freezeImmune = 0;
    this.shadow = scene.add.sprite(x, y, `s-${this.species.anims.Idle.key}`, 0).setAlpha(0.35).setDepth(1);
    this.sprite = scene.add.sprite(x, y, `a-${this.species.anims.Idle.key}`, 0);
    this.barBg = scene.add.rectangle(x, y, 18, 4, 0x10141d).setDepth(9000);
    this.bar = scene.add.rectangle(x, y, 16, 2, 0x8fd14f).setOrigin(0, 0.5).setDepth(9001);
    this.stBg = scene.add.rectangle(x, y, 18, 3, 0x10141d).setDepth(9000);
    this.stBar = scene.add.rectangle(x, y, 16, 1, 0xf2c94c).setOrigin(0, 0.5).setDepth(9001);
    this.icons = []; // status and stat icons floating overhead
    this.ice = null;
    this.applyTint();
    this.toIdle();
  }

  get alive() { return this.state !== 'faint'; }
  get free() { return this.state === 'idle' || this.state === 'walk' || this.state === 'loop'; }
  get grounded() { return this.state === 'idle' || this.state === 'walk'; }
  // in the air nothing can hit you
  get airborne() { return this.state === 'jump' || this.state === 'dash' || this.animName === 'Hop'; }

  get ailment() { return STATUS[this.status?.kind] ?? {}; }
  // held in place: buried, frozen or asleep
  get stuck() { return this.buried > 0 || !!this.ailment.hold; }

  mul(stat) { return (this.buffs[stat].t > 0 ? this.buffs[stat].mul : 1) * (STATUS[this.status?.kind]?.[stat] ?? 1); }

  // One condition at a time: the same one is refreshed, a different one does not take. A thawed mon cannot be refrozen at once.
  setStatus(kind) {
    const s = STATUS[kind];
    if (!s || !this.alive || (this.status && this.status.kind !== kind)) return null;
    if (kind === 'freeze' && !this.status && this.freezeImmune > 0) return null;
    if (this.status) { this.status.t = s.time; return null; }
    this.status = { kind, t: s.time };
    if (kind === 'sleep' && this.species.anims.Sleep) { this.cancel(); this.state = 'loop'; this.setAnim('Sleep', 'loop'); }
    if (s.immune) this.freezeImmune = s.time + s.immune;
    this.applyTint();
    return this.status;
  }

  clearStatus() {
    const slept = this.status?.kind === 'sleep' && this.animName === 'Sleep';
    this.status = null;
    if (slept && this.alive && this.state === 'loop') this.wake();
    this.applyTint();
  }

  // Raise (mul > 1) or lower (mul < 1) a stat for a while; 'random' picks one.
  addBuff(stat, mul, time) {
    if (stat === 'random') stat = ['atk', 'spd', 'def'][Math.floor(Math.random() * 3)];
    this.buffs[stat] = { mul, t: time };
    return stat;
  }

  buffText() {
    const out = [];
    for (const [k, b] of Object.entries(this.buffs)) if (b.t > 0) out.push(`${k.toUpperCase()}${b.mul > 1 ? '↑' : '↓'} ${Math.ceil(b.t)}s`);
    if (this.shield > 0) out.push('shield');
    if (this.leech) out.push('seeded');
    if (this.ingrain) out.push('rooted');
    if (this.regen) out.push('regen');
    if (this.sub) out.push('substitute');
    if (this.status) out.push(`${STATUS[this.status.kind].label} ${Math.ceil(this.status.t)}s`);
    return out.join('  ') || '-';
  }

  setAnim(name, mode, onFrame, onDone) {
    Object.assign(this, { animName: name, anim: this.species.anims[name], mode, onFrame, onDone, frame: 0, t: 0, held: false, animRate: 1 });
  }

  // Swap character in place, keeping position, facing and HP.
  setSpecies(id) {
    if (!SPECIES[id] || SPECIES[id] === this.species) return;
    this.species = SPECIES[id];
    this.sub = false;
    this.cancel();
    this.setCharged(false);
    this.toIdle();
  }

  cancel() {
    this.windup = this.aim = this.air = this.pending = null;
    this.hidden = false;
    this.forceShot = false;
    this.mute = false;
  }

  toIdle() {
    this.state = 'idle';
    this.running = false;
    this.setAnim('Idle', 'loop');
  }

  applyTint() {
    if (this.charged) this.sprite.setTint(0xffe566);
    else if (this.status) this.sprite.setTint(STATUS[this.status.kind].tint);
    else if (this.baseTint) this.sprite.setTint(this.baseTint);
    else this.sprite.clearTint();
  }

  setCharged(v) {
    if (v && !this.charged) this.scene.empowered?.(this);
    this.charged = v;
    this.applyTint();
  }

  face(x, y) {
    if (x !== this.x || y !== this.y) this.dir = dirFromVec(x - this.x, y - this.y);
  }

  spend(n) {
    this.stamina = Math.max(0, this.stamina - n);
    this.regenDelay = REGEN_DELAY;
    if (this.stamina <= 0) this.exhausted = true;
  }

  // Walk intent for this frame; (0,0) means stand still. Running costs stamina.
  walk(vx, vy, speed, dt, run = false) {
    if (this.state === 'jump') {
      const l = Math.hypot(vx, vy) || 1;
      this.air.ix = vx / l; this.air.iy = vy / l;
      return;
    }
    if (this.ailment.reverse) { vx = -vx; vy = -vy; }
    if ((!vx && !vy) || this.stuck || this.ailment.root || this.ingrain) {
      if (this.state === 'walk') this.toIdle();
      return;
    }
    if (this.state === 'loop') {
      if (SLEEPY.has(this.animName)) return this.wake();
      this.state = 'idle';
    }
    if (!this.grounded) return;
    speed *= this.mul('spd');
    this.running = run && !this.exhausted && this.stamina > 0;
    if (this.running) { speed *= RUN_MULT; this.spend(RUN_DRAIN * dt); }
    this.dir = dirFromVec(vx, vy);
    const l = Math.hypot(vx, vy);
    this.slide((vx / l) * speed * dt, (vy / l) * speed * dt);
    if (this.state !== 'walk') {
      this.state = 'walk';
      this.setAnim('Walk', 'loop');
    }
    this.animRate = this.running ? 1.6 : 1;
  }

  // Leap in the given direction (or straight up).
  jump(vx, vy, speed) {
    if (!this.grounded || this.stuck || this.ailment.root || this.ingrain || this.stamina < JUMP_COST || this.scene.heavy?.(this)) return false;
    this.spend(JUMP_COST);
    const l = Math.hypot(vx, vy);
    this.air = { t: 0, vx: l ? (vx / l) * speed : 0, vy: l ? (vy / l) * speed : 0, ix: 0, iy: 0 };
    if (l) this.dir = dirFromVec(vx, vy);
    this.state = 'jump';
    this.running = false;
    const hop = this.species.anims.Hop;
    this.setAnim(hop ? 'Hop' : 'Idle', 'hold');
    if (hop) this.animRate = hop.durs.reduce((a, b) => a + b, 0) / 60 / JUMP_TIME;
    return true;
  }

  slide(dx, dy) {
    const ok = this.scene.walkable;
    if (ok(this.x + dx, this.y + dy)) { this.x += dx; this.y += dy; }
    else if (dx && ok(this.x + dx, this.y)) this.x += dx;
    else if (dy && ok(this.x, this.y + dy)) this.y += dy;
  }

  wake() {
    if (!this.species.anims.Wake) return this.toIdle();
    this.state = 'action';
    this.setAnim('Wake', 'once', null, () => this.toIdle());
  }

  // Trigger any animation by name as a state.
  act(name) {
    if (!this.species.anims[name] || !this.free || this.stuck) return false;
    this.running = false;
    if (LOOP.has(name) || HOLD.has(name)) {
      this.state = 'loop';
      this.setAnim(name, HOLD.has(name) ? 'hold' : 'loop');
    } else {
      this.state = 'action';
      this.setAnim(name, 'once', (f) => this.scene.actionFrame(this, name, f), () => {
        this.toIdle();
        this.scene.actionDone(this, name);
      });
    }
    return true;
  }

  heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); }

  damage(n, fromX, fromY) {
    if (!this.alive || this.invuln > 0 || this.airborne || this.shield > 0) return false;
    if (this.parry > 0) {
      // blocked: the window closes, the blocker is briefly untouchable
      this.parry = 0;
      this.invuln = 0.4;
      this.scene.parried(this);
      return false;
    }
    if (this.buffs.eva.t > 0 && Math.random() < 0.5) { this.invuln = 0.25; return false; }
    if (this.sub) {
      // the doll takes the hit and breaks
      this.sub = false;
      this.invuln = 0.4;
      this.scene.subBroke(this);
      return false;
    }
    this.hp = Math.max(0, this.hp - n / this.mul('def'));
    if (this.ailment.wakes) this.clearStatus();
    this.invuln = 0.45;
    this.cancel();
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => this.sprite.active && this.applyTint());
    if (fromX !== undefined) {
      const dx = this.x - fromX, dy = this.y - fromY, l = Math.hypot(dx, dy) || 1;
      this.kx = (dx / l) * 110; this.ky = (dy / l) * 110;
      this.face(fromX, fromY);
    }
    const has = this.species.anims;
    if (this.hp <= 0) {
      this.state = 'faint';
      this.setCharged(false);
      this.setAnim(has.Faint ? 'Faint' : 'Idle', 'hold', null, () => this.scene.fainted(this));
    } else {
      this.state = 'hurt';
      this.setAnim(has.Hurt ? 'Hurt' : 'Idle', 'once', null, () => this.toIdle());
    }
    return true;
  }

  revive(x, y) {
    Object.assign(this, { x, y, hp: this.maxHp, stamina: this.maxStamina, exhausted: false, kx: 0, ky: 0, invuln: 1, buried: 0, shield: 0, leech: null, ingrain: null, regen: null, sub: false, ramp: null, status: null, freezeImmune: 0 });
    for (const b of Object.values(this.buffs)) b.t = 0;
    this.cancel();
    this.sprite.setAlpha(1);
    this.shadow.setAlpha(0.35);
    this.wake();
  }

  think(dt, target) {
    if (this.ai !== 'wild' || !this.grounded) return;
    this.cooldown -= dt;
    const d = Math.hypot(target.x - this.x, target.y - this.y);
    // encored: keeps throwing out its move
    if (this.ailment.encore && target.alive && d < 150 && this.scene.useMove(this, target)) return;
    if (target.alive && d < 130) {
      if (this.scene.wantsMove(this, d) && Math.random() < dt * 0.8) {
        this.walk(0, 0);
        this.scene.useMove(this, target);
      } else if (d < 20) {
        this.walk(0, 0);
        this.face(target.x, target.y);
        if (this.cooldown <= 0 && !this.ailment.noAttack) { this.act('Attack'); this.cooldown = 1.3 + Math.random(); }
      } else this.walk(target.x - this.x, target.y - this.y, 40, dt);
      return;
    }
    const w = this.wander;
    w.t -= dt;
    if (w.t <= 0) {
      w.t = 1.5 + Math.random() * 2.5;
      w.tx = this.home.x + (Math.random() - 0.5) * 70;
      w.ty = this.home.y + (Math.random() - 0.5) * 50;
    }
    const wx = w.tx - this.x, wy = w.ty - this.y;
    if (Math.hypot(wx, wy) > 3) {
      const bx = this.x, by = this.y;
      this.walk(wx, wy, 26, dt);
      if (bx === this.x && by === this.y) { w.tx = bx; w.ty = by; }
    } else this.walk(0, 0);
  }

  update(dt) {
    this.invuln = Math.max(0, this.invuln - dt);
    this.buried = this.alive ? Math.max(0, this.buried - dt) : 0;
    this.shield = this.alive ? Math.max(0, this.shield - dt) : 0;
    this.parry = Math.max(0, this.parry - dt);
    this.parryCd = Math.max(0, this.parryCd - dt);
    for (const b of Object.values(this.buffs)) b.t = Math.max(0, b.t - dt);
    if (this.leech) {
      // drains once a second
      const l = this.leech;
      l.tick = (l.tick ?? 1) - dt;
      if (l.tick <= 0 && this.alive) { l.tick += 1; this.scene.leechTick(this, l); }
      if ((l.t -= dt) <= 0 || !this.alive) this.leech = null;
    }
    if (this.ramp) this.ramp.t -= dt;
    if (this.regen) {
      if (this.alive) this.heal(this.regen.hps * dt);
      if ((this.regen.t -= dt) <= 0 || !this.alive) this.regen = null;
    }
    if (this.ingrain) {
      if (this.alive) this.heal(this.ingrain.hps * dt);
      if ((this.ingrain.t -= dt) <= 0 || !this.alive) this.ingrain = null;
    }
    if (this.flash > 0) {
      this.flash -= dt;
      if (this.flash > 0 && Math.floor(this.flash * 20) % 2 === 0) this.sprite.setTintFill(0xffffff);
      else this.applyTint();
    }
    this.freezeImmune = Math.max(0, this.freezeImmune - dt);
    if (this.status) {
      const s = STATUS[this.status.kind];
      if (s.dps && this.alive && this.hp > 1) this.hp = Math.max(1, this.hp - s.dps * dt);
      if ((this.status.t -= dt) <= 0 || !this.alive) this.clearStatus();
    }
    this.regenDelay -= dt;
    if (this.regenDelay <= 0 && this.state !== 'jump' && this.state !== 'windup') {
      this.stamina = Math.min(this.maxStamina, this.stamina + STAMINA_REGEN * dt);
      if (this.stamina >= 20) this.exhausted = false;
    }
    if (this.stuck) this.kx = this.ky = 0;
    if (this.kx || this.ky) {
      this.slide(this.kx * dt, this.ky * dt);
      const k = Math.max(0, 1 - 9 * dt);
      this.kx *= k; this.ky *= k;
      if (Math.abs(this.kx) + Math.abs(this.ky) < 4) this.kx = this.ky = 0;
    }
    if (this.state === 'jump') {
      const a = this.air;
      a.vx += a.ix * AIR_ACCEL * dt; a.vy += a.iy * AIR_ACCEL * dt;
      const v = Math.hypot(a.vx, a.vy);
      if (v > AIR_MAX) { a.vx *= AIR_MAX / v; a.vy *= AIR_MAX / v; }
      this.slide(a.vx * dt, a.vy * dt);
      if (v > 8) this.dir = dirFromVec(a.vx, a.vy);
      if ((a.t += dt) >= JUMP_TIME) { this.air = null; this.toIdle(); }
    }
    if ((this.animName === 'Sleep' || this.animName === 'EventSleep') && !this.status) this.heal(6 * dt);

    const a = this.anim;
    if (!this.ailment.pose || !this.alive) this.t += dt * 60 * this.animRate; // frozen solid: the pose holds
    for (let guard = 0; guard < 8 && this.t >= a.durs[this.frame]; guard++) {
      this.t -= a.durs[this.frame];
      if (this.frame + 1 >= a.durs.length) {
        if (this.mode === 'loop') this.frame = 0;
        else if (this.mode === 'hold') {
          this.t = 0;
          if (!this.held) { this.held = true; this.onDone?.(); }
          break;
        } else {
          this.onDone?.();
          break;
        }
      } else this.frame++;
      if (this.anim !== a) break;
      this.onFrame?.(this.frame);
    }
    this.draw();
  }

  draw() {
    const a = this.anim;
    const f = (a.rows === 8 ? this.dir : 0) * a.cols + Math.min(this.frame, a.cols - 1);
    const x = Math.round(this.x), y = Math.round(this.y), foot = this.species.foot;
    // without a Hop sheet the jump arc is drawn by lifting the sprite
    const lift = this.state === 'jump' && this.animName !== 'Hop' ? Math.round(88 * (this.air.t / JUMP_TIME) * (1 - this.air.t / JUMP_TIME)) : 0;
    // buried: sunk 8px with everything below the ground line cut off
    const sunk = this.buried > 0 ? 8 : 0;
    this.sprite.setTexture(`a-${a.key}`, f).setPosition(x, y - foot - lift + sunk).setDepth(10 + this.y).setVisible(!this.hidden && !this.sub);
    // as a substitute the doll is drawn in the mon's place, bobbing between its two frames
    const doll = this.sub && this.alive && !this.hidden;
    if (doll) (this.doll ??= this.scene.add.image(x, y, 'decoy').setOrigin(0.5, 1)).setFrame(this.dir * 2 + (Math.floor(this.scene.time.now / (this.state === 'walk' ? 140 : 400)) & 1)).setPosition(x, y + 3 - lift).setDepth(10 + this.y);
    this.doll?.setVisible(doll);
    if (sunk) this.sprite.setCrop(0, 0, a.fw, a.fh / 2 + foot - sunk);
    else if (this.sprite.isCropped) this.sprite.setCrop();
    this.shadow.setTexture(`s-${a.key}`, f).setPosition(x, y - foot).setVisible(!sunk && !this.hidden);
    const show = this.alive && this.hp < this.maxHp;
    this.barBg.setVisible(show).setPosition(x, y - 24);
    this.bar.setVisible(show).setPosition(x - 8, y - 24);
    this.bar.width = Math.max(1, Math.round((16 * this.hp) / this.maxHp));
    this.bar.setFillStyle(this.hp / this.maxHp > 0.35 ? 0x8fd14f : 0xef6b5b);
    // overhead icons: the status condition, then raised stats, a lowered stat, and a boosted next attack
    const now = this.scene.time.now, list = this.alive && !this.hidden ? this.iconList() : [];
    list.forEach((name, i) => {
      const img = (this.icons[i] ??= this.scene.add.image(x, y, 'status').setDepth(9002));
      img.setTexture('status', iconFrame(name, now)).setPosition(x + Math.round((i - (list.length - 1) / 2) * 13), y - 35).setVisible(true);
    });
    for (let i = list.length; i < this.icons.length; i++) this.icons[i].setVisible(false);
    const iced = this.alive && this.ailment.icon === 'ice';
    if (iced) (this.ice ??= this.scene.add.image(x, y, 'status').setAlpha(0.85)).setTexture('status', iconFrame('ice', now)).setPosition(x, y - 10).setDepth(11 + this.y);
    this.ice?.setVisible(iced);
    const showSt = this.alive && this.team === 'p' && this.stamina < this.maxStamina;
    this.stBg.setVisible(showSt).setPosition(x, y - 20);
    this.stBar.setVisible(showSt).setPosition(x - 8, y - 20);
    this.stBar.width = Math.max(1, Math.round((16 * this.stamina) / this.maxStamina));
    this.stBar.setFillStyle(this.exhausted ? 0xef6b5b : 0xf2c94c);
  }

  iconList() {
    const out = [], b = this.buffs, up = (s) => b[s].t > 0 && b[s].mul > 1;
    if (this.ailment.icon && this.ailment.icon !== 'ice') out.push(this.ailment.icon);
    if (up('atk')) out.push('sword');
    if (up('def') || this.shield > 0) out.push('shield');
    if (up('spd')) out.push('swirl');
    if (b.eva.t > 0) out.push('eye');
    if (Object.values(b).some((q) => q.t > 0 && q.mul < 1)) out.push('down');
    if (this.charged) out.push('fist');
    return out;
  }

  destroy() {
    for (const o of [this.sprite, this.shadow, this.bar, this.barBg, this.stBar, this.stBg, this.ice, this.doll, ...this.icons]) o?.destroy();
  }
}
