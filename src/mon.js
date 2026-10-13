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
// Energy is a bar of five notches (kept as 0..100, a notch being 20, so a held move can still drain it smoothly).
// A move costs one notch or two (a light poke half), a jump two, a burst of running half; a parry that lands gives one back.
export const NOTCH = 20, NOTCHES = 5;
const RUN_TIME = 2, RUN_COST = NOTCH / 2; // a burst of running: how long it lasts and what it costs
export const BASE_HP = 150; // every mon's health
const HEAVY_STUN = 0.75; // seconds a heavy move's hit leaves its target unable to act
const STAMINA_REGEN = 48;
const REGEN_DELAY = 0.7;
export const JUMP_COST = 2 * NOTCH;
const JUMP_TIME = 0.55;
const AIR_ACCEL = 240; // how hard movement keys steer a jump
const AIR_MAX = 125;

export class Mon {
  constructor(scene, x, y, o = {}) {
    Object.assign(this, { scene, x, y, dir: 0, team: o.team ?? 'n', ai: o.ai ?? null, baseTint: o.tint ?? null });
    this.species = SPECIES[o.species] ?? Object.values(SPECIES)[0];
    this.move = o.move ?? null;
    this.home = { x, y };
    this.maxHp = o.hp ?? BASE_HP;
    this.hp = this.maxHp;
    this.maxStamina = NOTCH * NOTCHES;
    this.armored = false; // in a move that cannot be knocked out of: hits hurt but do not stagger or shove
    this.leap = 0; // seconds left of a jump made from inside a held move (Surf, a roll)
    this.levi = 0; // seconds left hanging helpless in the air (Hurricane, Kinesis); leviImmune: until it can be lifted again
    this.leviImmune = 0;
    this.buryImmune = 0; // seconds after digging itself out during which it cannot be buried again
    this.healsUsed = 0; // healing moves used this match (see HEAL_LIMIT)
    this.snare = 0; // seconds it is still held fast in a web: it cannot walk or jump, but can still fight
    this.runT = 0; // seconds of running left from the notch last spent on it
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
    this.sub = 0; // the health left in its substitute doll: while there is any it is drawn as the doll, which takes its hits
    this.safeguard = 0; // seconds for which nothing a foe sends can lower its stats, give it a status or otherwise hamper it
    this.critUp = null; // { t, add } while its hits are likelier to be critical (Focus Energy)
    this.noCrit = 0; // seconds for which no hit on it can be critical (Lucky Chant)
    this.dollFlash = 0; // the doll blinks white for a moment when it takes a blow and holds
    this.under = false; // underground (Dig): nothing can hit it
    this.grip = 0; // seconds left held in a bite, as the biter or the bitten
    this.braced = false; // holding a stance: rooted until it is let go or broken
    this.reel = 0; // seconds since it was last hurt during which a follow-up strike still lands
    this.stun = 0; // seconds left unable to act (a parried lock-on dash, a missed chain dash)
    this.shove = 0; // seconds for which a blow still carries it back although it is stunned (a heavy hit, two blows clashing)
    this.hop = 0; // px the sprite is drawn above its shadow (Fly, Bounce)
    this.flying = false; // up in the air with Fly: only moves that swat flyers can reach it
    this.beaming = null; // the held beam it is firing: slow to walk, cannot turn its body
    this.chill = null; // { n, t } stacks from ice moves; the third freezes
    this.locked = null; // { team, t } marked by Lock-On: that side's shots home in on it
    this.roost = 0; // seconds left grounded after Roost: no jumping or flying, ground moves hit harder
    this.acro = null; // { mv, n, t } a chain dash that connected: the next one is free
    this.vel = { x: 0, y: 0 }; // px a second, measured frame to frame
    this.detect = 0; // seconds left in which the next hit is dodged (Detect)
    this.bide = null; // { t, stored, mv } soaking up damage to pay back
    this.bond = 0; // seconds left of Destiny Bond
    this.bondTo = null; // { m, t } the foe Destiny Bond has tied it to
    this.flakes = []; // snowflakes overhead, one per stack of chill
    this.endure = 0; // seconds left in which health cannot drop below 1
    this.webbed = 0; // seconds left unable to run (Sticky Web)
    this.torment = null; // { t } cannot use the same move twice running
    this.tether = null; // { to, r, t } cannot go further than r from that mon (Mean Look)
    this.dance = null; // { mv, t, n, hit } a Dragon Dance in progress
    this.fuse = null; // { mv, t, track } lit: the move goes off when it runs out (Explosion)
    this.lastHit = null; // { by, n, t } the last blow taken
    this.lastMove = null; // the last move it fired
    this.rep = null; // { mv, n, t } uses in a row of a move that costs more each time
    this.ramp = null; // { mv, n, t } consecutive uses of a ramping move
    this.cycles = {}; // move name -> how many times a cycling move has been used
    this.locks = {}; // element -> seconds its moves stay unusable (Overheat)
    this.decoy = !!o.decoy; // a Double Team copy: the first hit pops it
    this.pending = null; // { mv, aim } melee move waiting for the lunge to connect
    this.status = null; // { kind, t } while burned, poisoned, paralysed or frozen
    this.freezeImmune = 0;
    this.shadow = scene.add.sprite(x, y, `s-${this.species.anims.Idle.key}`, 0).setAlpha(0.35).setDepth(1);
    this.sprite = scene.add.sprite(x, y, `a-${this.species.anims.Idle.key}`, 0);
    this.barBg = scene.add.rectangle(x, y, 18, 4, 0x10141d).setDepth(9000);
    this.bar = scene.add.rectangle(x, y, 16, 2, 0x8fd14f).setOrigin(0, 0.5).setDepth(9001);
    this.stBg = scene.add.rectangle(x, y, 18, 3, 0x10141d).setDepth(9000);
    this.stBar = scene.add.rectangle(x, y, 16, 1, 0xf2c94c).setOrigin(0, 0.5).setDepth(9001);
    this.stTicks = [1, 2, 3, 4].map(() => scene.add.rectangle(x, y, 1, 1, 0x10141d).setDepth(9002)); // between the five notches
    this.icons = []; // status and stat icons floating overhead
    this.ice = null;
    this.applyTint();
    this.toIdle();
  }

  // Dice: the fight's seeded generator where there is one (see scene.js), so that luck is the same on every client.
  roll() { return this.scene.rand ? this.scene.rand() : Math.random(); }

  // Would a hit get past what makes this mon untouchable (not the answers that are used up by it: parry, Detect, the substitute)?
  canBeHit(hit) {
    const tag = hit?.tag, through = tag === 'curse', grab = tag === 'grab';
    if (!this.alive || (this.invuln > 0 && !(hit?.thru && this.reel > 0))) return false;
    if (this.under && !(this.flying && hit?.swat) && !hit?.deep) return false;
    if (this.airborne && tag !== 'sweep' && !through && !hit?.deep) return false;
    return !(this.shield > 0 && !grab && !through && !hit?.pierce);
  }

  get alive() { return this.state !== 'faint'; }
  get free() { return this.state === 'idle' || this.state === 'walk' || this.state === 'loop'; }
  get grounded() { return this.state === 'idle' || this.state === 'walk'; }
  // in the air nothing can hit you
  get airborne() { return this.state === 'jump' || this.state === 'dash' || this.animName === 'Hop' || this.leap > 0; }

  get ailment() { return STATUS[this.status?.kind] ?? {}; }
  // held in place: buried, frozen or asleep
  get stuck() { return this.levi > 0 || this.buried > 0 || this.grip > 0 || this.stun > 0 || this.braced || !!this.bide || !!this.dance || !!this.ailment.hold; }

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
    if (stat === 'random') stat = ['atk', 'spd', 'def'][Math.floor(this.roll() * 3)];
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
    if (this.chill) out.push(`chilled x${this.chill.n}`);
    if (this.locked) out.push('locked on');
    if (this.roost > 0) out.push('grounded');
    for (const [k, t] of Object.entries(this.locks)) out.push(`no ${k} ${Math.ceil(t)}s`);
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
    this.hidden = this.under = this.braced = this.flying = false;
    this.beaming = this.dance = null;
    this.hop = 0;
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
    if ((!vx && !vy) || this.stuck || this.ailment.root || this.ingrain || this.snare > 0) {
      if (this.state === 'walk') this.toIdle();
      return;
    }
    if (this.state === 'loop') {
      if (SLEEPY.has(this.animName)) return this.wake();
      this.state = 'idle';
    }
    if (!this.grounded) return;
    speed *= this.mul('spd') * (this.beaming ? 0.3 : 1);
    // running: half a notch buys a burst that lasts whether or not the button stays down; held, the next notch goes as it runs out
    const able = !this.beaming && !(this.webbed > 0);
    if (run && able && this.runT <= 0 && !this.exhausted && this.stamina >= RUN_COST) { this.spend(RUN_COST); this.runT = RUN_TIME; }
    this.running = able && this.runT > 0;
    if (this.running) speed *= RUN_MULT;
    if (!this.beaming) this.dir = dirFromVec(vx, vy); // a beam decides which way its user faces
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
    if (this.ingrain) { this.ingrain = null; return false; } // rooted: the jump pulls the roots up, and that is all it does
    if (!this.grounded || this.stuck || this.ailment.root || this.ingrain || this.snare > 0 || this.roost > 0 || this.beaming || this.stamina < JUMP_COST || this.scene.heavy?.(this)) return false;
    this.spend(JUMP_COST);
    const l = Math.hypot(vx, vy);
    this.air = { t: 0, vx: l ? (vx / l) * speed : 0, vy: l ? (vy / l) * speed : 0, ix: 0, iy: 0 };
    if (l) this.dir = dirFromVec(vx, vy);
    this.state = 'jump';
    this.running = false;
    this.scene.game.events.emit('sfx', 'jump');
    const hop = this.species.anims.Hop;
    this.setAnim(hop ? 'Hop' : 'Idle', 'hold');
    if (hop) this.animRate = hop.durs.reduce((a, b) => a + b, 0) / 60 / JUMP_TIME;
    return true;
  }

  slide(dx, dy) {
    // a Reflect wall of the other side is as solid as the map
    const ok = (x, y) => {
      if (!this.scene.walkable(x, y) || this.scene.walled?.(this, x, y)) return false;
      // tethered: it may move about inside the circle, and back toward it, but not further out
      const q = this.tether;
      if (!q) return true;
      const d = Math.hypot(x - q.to.x, y - q.to.y);
      return d <= q.r || d <= Math.hypot(this.x - q.to.x, this.y - q.to.y);
    };
    if (ok(this.x + dx, this.y + dy)) { this.x += dx; this.y += dy; }
    else if (dx && ok(this.x + dx, this.y)) this.x += dx;
    else if (dy && ok(this.x, this.y + dy)) this.y += dy;
  }

  wake() {
    if (!this.species.anims.Wake) return this.toIdle();
    this.state = 'action';
    this.setAnim('Wake', 'once', null, () => this.toIdle());
  }

  // The animation this mon swings with for a close-range move (see MELEE_ANIM in sprites.js): its kick for a kicking
  // move, its heavy swing for a heavy one if it has one, and otherwise its usual.
  swingFor(mv) {
    const s = this.species, pick = mv && /kick/i.test(mv.id ?? '') ? s.kickAnim : mv?.tag === 'heavy' && s.heavyAnim ? s.heavyAnim : s.meleeAnim;
    return s.anims[pick] ? pick : 'Attack';
  }
  get swing() { return this.swingFor(null); }

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

  // hit: { tag, jab, swat, thru } of the move behind it (see TAGS in moves.js); a plain hit is a strike
  damage(n, fromX, fromY, hit) {
    const tag = hit?.tag, through = tag === 'curse', grab = tag === 'grab';
    // a follow-up strike of the same move lands on a mon still reeling from the one before
    if (!this.alive || (this.invuln > 0 && !(hit?.thru && this.reel > 0))) return false;
    if (this.under && !(this.flying && hit?.swat) && !hit?.deep) return false; // only a swatting move reaches a flyer
    if (this.airborne && tag !== 'sweep' && !through && !hit?.deep) return false;
    if (this.shield > 0 && !grab && !through && !hit?.pierce) { this.scene.blocked?.(this, fromX, fromY); return false; }
    if (this.detect > 0 && !grab && !through) {
      // seen coming: the blow misses and the user is suddenly behind whoever threw it
      this.detect = 0;
      this.invuln = 0.4;
      this.scene.detected?.(this, hit?.by);
      return false;
    }
    if (this.decoy) { this.popped = true; this.invuln = 9; return true; }
    if (this.parry > 0 && !grab && !through) {
      if (tag !== 'heavy') {
        // blocked: the window closes, the blocker is briefly untouchable
        this.parry = 0;
        this.invuln = 0.4;
        this.scene.parried(this);
        return false;
      }
      // a heavy blow comes through the block at half strength
      this.parry = 0;
      n *= 0.5;
    }
    if (this.buffs.eva.t > 0 && this.roll() < 0.5) { this.invuln = 0.25; return false; }
    if (this.sub) {
      // the doll stands in for it. A move that does no damage does nothing at all; a blow comes out of the doll's own
      // health (as much as was spent making it), and the mon behind it is not hurt, moved or stopped in what it is doing
      if (!(n > 0)) return false;
      this.sub -= hit?.raw ? n : n / this.mul('def');
      if (this.sub > 0) { this.invuln = hit?.soft ? 0.1 : 0.2; this.dollFlash = 0.09; this.scene.subHit?.(this); if (!hit?.soft) this.scene.blocked?.(this, fromX, fromY); return false; }
      this.sub = 0;
      this.invuln = 0.4;
      this.scene.subBroke(this);
      return false;
    }
    const dealt = hit?.raw ? n : n / this.mul('def'); // fixed damage ignores defence
    if (this.braced && !hit?.soft) this.scene.blocked?.(this, fromX, fromY); // taken on a guard held up
    this.hp = Math.max(this.endure > 0 ? Math.min(1, this.hp) : 0, this.hp - dealt);
    this.lastHit = { by: hit?.by, n: dealt, t: this.scene.simMs ?? this.scene.time.now };
    this.scene.struck?.(this, dealt, hit); // for the eye only: the flash, the shake
    if (this.hp <= 0 && this.bondTo?.m.alive) this.scene.bonded?.(this, this.bondTo.m, dealt); // it does not go alone
    if (this.ailment.wakes) this.clearStatus();
    this.invuln = 0.45;
    this.reel = 0.4;
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => this.sprite.active && this.applyTint());
    if (hit?.soft && this.hp > 0) {
      // a beam's tick, or one shot of a stream: it wears the target down without staggering it or breaking what it is
      // doing. A beam drags at it too.
      if (hit.soft === 'stream') { this.invuln = 0.1; return true; }
      this.invuln = 0.28;
      if (!(this.buffs.spd.t > 0.6 && this.buffs.spd.mul < 1)) this.addBuff('spd', 0.7, 0.6);
      return true;
    }
    if (this.armored && this.hp > 0) { this.invuln = 0.3; return true; } // ploughs on through it
    if (this.bide && this.hp > 0) {
      // braced for it: the blow is taken standing, and the next attack comes back twice as hard
      this.bide = null;
      this.setCharged(true);
      this.scene.popup?.(this, 'BIDE');
      return true;
    }
    // a jab stings but does not stop a heavy move that is already charging
    if (hit?.jab && this.hp > 0 && this.state === 'windup' && this.windup?.mv.tag === 'heavy') return true;
    this.cancel();
    if (fromX !== undefined) {
      const dx = this.x - fromX, dy = this.y - fromY, l = Math.hypot(dx, dy) || 1, k = this.ingrain ? 0 : 110; // a rooted mon is not shoved
      this.kx = (dx / l) * k; this.ky = (dy / l) * k;
      this.face(fromX, fromY);
    }
    const has = this.species.anims;
    if (this.hp <= 0) {
      this.state = 'faint';
      this.setCharged(false);
      this.setAnim(has.Faint ? 'Faint' : 'Idle', 'hold', null, () => this.scene.fainted(this));
    } else {
      this.state = 'hurt';
      if (hit?.tag === 'heavy') { this.stun = Math.max(this.stun, HEAVY_STUN); this.shove = 0.4; } // a heavy blow leaves it reeling for longer
      this.setAnim(has.Hurt ? 'Hurt' : 'Idle', 'once', null, () => this.toIdle());
    }
    return true;
  }

  revive(x, y) {
    Object.assign(this, { safeguard: 0, critUp: null, noCrit: 0, x, y, hp: this.maxHp, stamina: this.maxStamina, exhausted: false, runT: 0, snare: 0, armored: false, leap: 0, levi: 0, leviImmune: 0, buryImmune: 0, hop: 0, kx: 0, ky: 0, invuln: 1, buried: 0, shield: 0, leech: null, ingrain: null, regen: null, sub: false, lx: x, ly: y, detect: 0, bide: null, bond: 0, bondTo: null, endure: 0, webbed: 0, torment: null, tether: null, dance: null, fuse: null, rep: null, grip: 0, stun: 0, roost: 0, chill: null, locked: null, acro: null, locks: {}, ramp: null, status: null, freezeImmune: 0 });
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
      if (this.scene.wantsMove(this, d) && this.roll() < dt * 0.8) {
        this.walk(0, 0);
        this.scene.useMove(this, target);
      } else if (d < 20) {
        this.walk(0, 0);
        this.face(target.x, target.y);
        if (this.cooldown <= 0 && !this.ailment.noAttack) { this.act(this.swing); this.cooldown = 1.3 + this.roll(); }
      } else this.walk(target.x - this.x, target.y - this.y, 40, dt);
      return;
    }
    const w = this.wander;
    w.t -= dt;
    if (w.t <= 0) {
      w.t = 1.5 + this.roll() * 2.5;
      w.tx = this.home.x + (this.roll() - 0.5) * 70;
      w.ty = this.home.y + (this.roll() - 0.5) * 50;
    }
    const wx = w.tx - this.x, wy = w.ty - this.y;
    if (Math.hypot(wx, wy) > 3) {
      const bx = this.x, by = this.y;
      this.walk(wx, wy, 26, dt);
      if (bx === this.x && by === this.y) { w.tx = bx; w.ty = by; }
    } else this.walk(0, 0);
  }

  update(dt) {
    this.vel.x = (this.x - (this.lx ?? this.x)) / dt; this.vel.y = (this.y - (this.ly ?? this.y)) / dt;
    this.lx = this.x; this.ly = this.y;
    this.invuln = Math.max(0, this.invuln - dt);
    this.stun = Math.max(0, this.stun - dt);
    this.shove = Math.max(0, this.shove - dt);
    this.dollFlash = Math.max(0, this.dollFlash - dt);
    this.reel = Math.max(0, this.reel - dt);
    this.roost = Math.max(0, this.roost - dt);
    for (const k of ['detect', 'bond', 'endure', 'webbed']) this[k] = Math.max(0, this[k] - dt);
    if (this.tether && !this.tether.to.alive) this.tether = null;
    for (const k of ['chill', 'locked', 'acro', 'torment', 'tether', 'rep', 'bondTo']) if (this[k] && ((this[k].t -= dt) <= 0 || !this.alive)) this[k] = null;
    const wasBuried = this.buried > 0;
    this.buried = this.alive ? Math.max(0, this.buried - dt) : 0;
    if (wasBuried && this.buried <= 0) this.buryImmune = 2;
    this.buryImmune = Math.max(0, this.buryImmune - dt);
    if (this.leap > 0) { this.leap = Math.max(0, this.leap - dt); this.hop = this.leap > 0 ? 34 * Math.sin(Math.PI * (1 - this.leap / 0.5)) : 0; }
    if (this.levi > 0) {
      // hanging in the air, turning slowly; then dropped, and for a while it cannot be lifted again
      this.levi = Math.max(0, this.levi - dt);
      this.hop = this.levi > 0 ? Math.min(22, this.hop + 90 * dt) : 0;
      if (this.levi <= 0) this.leviImmune = 2;
    }
    this.leviImmune = Math.max(0, this.leviImmune - dt);
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
    this.runT = Math.max(0, this.runT - dt);
    this.snare = Math.max(0, this.snare - dt);
    this.safeguard = Math.max(0, this.safeguard - dt);
    this.noCrit = Math.max(0, this.noCrit - dt);
    if (this.critUp && (this.critUp.t -= dt) <= 0) this.critUp = null;
    for (const k in this.locks) if ((this.locks[k] -= dt) <= 0) delete this.locks[k];
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
    if (this.regenDelay <= 0 && this.state !== 'jump' && this.state !== 'windup' && !this.running) { // no catching your breath on the run
      this.stamina = Math.min(this.maxStamina, this.stamina + STAMINA_REGEN * dt);
      if (this.stamina >= NOTCH) this.exhausted = false;
    }
    if (this.stuck && !(this.shove > 0)) this.kx = this.ky = 0;
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
    const lift = (this.state === 'jump' && this.animName !== 'Hop' ? Math.round(88 * (this.air.t / JUMP_TIME) * (1 - this.air.t / JUMP_TIME)) : 0) + Math.round(this.hop);
    // buried: sunk 8px with everything below the ground line cut off
    const sunk = this.buried > 0 ? 8 : 0;
    this.sprite.setTexture(`a-${a.key}`, f).setPosition(x, y - foot - lift + sunk).setDepth(10 + this.y).setVisible(!this.hidden && !this.sub);
    // as a substitute the doll is drawn in the mon's place, bobbing between its two frames
    const doll = this.sub && this.alive && !this.hidden;
    if (doll) (this.doll ??= this.scene.add.image(x, y, 'decoy').setOrigin(0.5, 1)).setFrame(this.dir * 2 + (Math.floor(this.scene.time.now / (this.state === 'walk' ? 140 : 400)) & 1)).setPosition(x, y + 3 - lift).setDepth(10 + this.y);
    this.doll?.setVisible(doll);
    // held fast in a web: a white ring round its feet, tightening and loosening
    const snared = this.snare > 0 && this.alive && !this.hidden;
    if (snared) {
      const k = 1 + 0.12 * Math.sin(this.scene.time.now / 90);
      (this.snareRing ??= this.scene.add.ellipse(x, y, 26, 14).setStrokeStyle(1.5, 0xffffff, 0.95).setFillStyle(0xffffff, 0.12)).setPosition(x, y - 1).setScale(k).setDepth(9 + this.y);
    }
    this.snareRing?.setVisible(snared);
    if (doll) { if (this.dollFlash > 0) this.doll.setTintFill(0xffffff); else this.doll.clearTint(); }
    if (sunk) this.sprite.setCrop(0, 0, a.fw, a.fh / 2 + foot - sunk);
    else if (this.sprite.isCropped) this.sprite.setCrop();
    this.shadow.setTexture(`s-${a.key}`, f).setPosition(x, y - foot).setVisible(!sunk && (!this.hidden || this.flying)); // a flyer is only its shadow
    // chill: a snowflake overhead for each stack
    const nf = this.alive && !this.hidden && this.chill ? this.chill.n : 0;
    for (let i = 0; i < Math.max(nf, this.flakes.length); i++) {
      if (i < nf) (this.flakes[i] ??= this.scene.add.image(x, y, 'flake').setDepth(9002)).setPosition(x + Math.round((i - (nf - 1) / 2) * 9), y - 46).setVisible(true);
      else this.flakes[i].setVisible(false);
    }
    const show = this.alive && this.hp < this.maxHp && !this.cloaked; // (cloaked: its Double Team copies are out)
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
    const showSt = this.alive && this.team === 'p' && this.stamina < this.maxStamina && !this.cloaked;
    this.stTicks.forEach((o, i) => o.setVisible(showSt).setPosition(x - 8 + Math.round(((i + 1) * 16) / NOTCHES), y - 20));
    this.stBg.setVisible(showSt).setPosition(x, y - 20);
    this.stBar.setVisible(showSt).setPosition(x - 8, y - 20);
    this.stBar.width = Math.max(1, Math.round((16 * Math.floor(this.stamina / NOTCH + 0.001)) / NOTCHES)); // whole notches only
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
    if (this.torment) out.push('cross');
    return out;
  }

  destroy() {
    for (const o of [this.sprite, this.shadow, this.bar, this.barBg, this.stBar, this.stBg, ...this.stTicks, this.ice, this.doll, this.snareRing, ...this.icons, ...this.flakes]) o?.destroy();
  }
}
