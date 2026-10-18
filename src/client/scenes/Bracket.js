import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from '../../scene.js';
import { SPECIES, loadIdle } from '../../sprites.js';
import { MOVES } from '../../moves.js';
import { Actions } from '../input.js';
import { go } from '../transition.js';
import { session } from '../session.js';
import { SIZE, ROUNDS, LEVELS, newTourney, round, meIndex, stillIn, rivalOf, tourneyBattle, settle, prizeTM } from '../tournament.js';
import { DEPTH, INK, Hints, text, panel, shade } from '../ui.js';
import { music } from '../music.js';
import { sfx } from '../sfx.js';

// Where the bracket is drawn: the round of 16 down the outer edges, each round a column further in, the champion at the
// top of the middle. Each half is eight rows.
const COL_X = [14, 46, 78, 110], ROW_Y = 34, ROW_GAP = 19, FACE = 16, CHAMP = [VIEW_W / 2, 58], CHAMP_FACE = 30;

// The tournament bracket (tournament.js), shown before the first match and between the others. Coming back from a
// match it first plays out the round just finished: the losers grey out and the winners slide on along their lines.
// Then it shows the player's next pairing, or the end of the run: knocked out (the rest of the bracket then plays out on its
// own), and a victory screen with confetti for whoever wins it; the prize TM comes only if that is the player's mon.
export class Bracket extends Phaser.Scene {
  constructor() { super('bracket'); }

  // data: { tourney } on the way in from the pillar (none: a new one), or { tourney, won } back from a match
  init(data) {
    const t = data?.tourney ?? newTourney();
    this.fresh = data?.won === undefined; // nothing has been played since this screen was last up
    this.t = this.fresh ? t : settle(t, data.won);
    this.ready = false; // the animation has finished and a press goes on
    this.leaving = false;
  }

  // the standing sheets of the entrants, which the bracket shows them by (their portraits are for the winners)
  preload() {
    loadIdle(this, this.t.entrants.map((e) => e.form));
  }

  create() {
    music.play('screen_crew');
    if (this.textures.exists('worldmap')) this.add.image(0, 0, 'worldmap').setOrigin(0).setScrollFactor(0);
    shade(this, 0, 0, VIEW_W, VIEW_H, 0x06101c, 0.84);
    panel(this, (VIEW_W - 120) >> 1, 3, 120, 26, 'dim');
    text(this, VIEW_W / 2, 6, 'Tournament', INK.gold).setOrigin(0.5, 0);
    const r = round(this.t);
    this.subtitle = text(this, VIEW_W / 2, 16, r < ROUNDS.length ? ROUNDS[r] : 'Over', INK.dim).setOrigin(0.5, 0);

    this.lines = this.add.graphics().setScrollFactor(0).setDepth(DEPTH);
    this.faces = this.t.entrants.map((e, i) => this.face(e, ...this.at(i, 0), FACE));
    this.footerParts = null;
    this.actions = new Actions(this);
    this.hints = new Hints(this, this.actions);
    this.hints.set([]);
    this.actions.push({ confirm: () => this.next(), cancel: () => this.quit() });

    // everything up to the round just played is as it was; that round is played out here
    const shown = this.fresh ? r : r - 1;
    for (let k = 0; k < shown; k++) this.place(k, false);
    this.drawLines(shown);
    if (this.fresh) this.dropIn(() => this.after());
    else this.playOut(shown, () => this.after());
  }

  // ---- the layout ----
  // Where the entrant in bracket place `i` stands in round `r` (4: champion).
  at(i, r) {
    if (r >= 4) return CHAMP;
    const side = i < SIZE / 2 ? 0 : 1, size = 1 << r, group = (i % (SIZE / 2)) >> r;
    const y = ROW_Y + (group * size + (size - 1) / 2) * ROW_GAP;
    return [side ? VIEW_W - COL_X[r] : COL_X[r], y];
  }

  // An entrant in a frame (gold for the player's own), `size` px across: its standing sprite, animated. Its portrait (the
  // pick sprite) is what it wears while it moves on (look()).
  face(e, x, y, size, still = false) {
    const back = this.add.image(x, y, 'px').setDisplaySize(size + 2, size + 2).setTint(e.me ? INK.gold : 0x9fb4c8).setScrollFactor(0).setDepth(DEPTH + 1);
    const inner = this.add.image(x, y, 'px').setDisplaySize(size, size).setTint(0x163454).setScrollFactor(0).setDepth(DEPTH + 1);
    const img = this.add.image(x, y, 'px').setScrollFactor(0).setDepth(DEPTH + 2);
    const idle = SPECIES[e.form].anims.Idle, portrait = [e.form, e.species].find((k) => this.textures.exists(`face-${k}`));
    const f = {
      parts: [back, inner, img], img, back, size, idle, portrait, k: 1, mode: 'idle', frame: 0, t: 0, still,
      base: { idle: Math.min(1, (size / Math.max(idle.fw, idle.fh)) * 1.4), portrait: size / 40 },
    };
    this.look(f, 'idle');
    return f;
  }

  // Which of its two looks a face wears: 'idle' (the standing sprite) or 'portrait' (none for a mon that has none).
  look(f, mode) {
    if (mode === 'portrait' && !f.portrait) mode = 'idle';
    f.mode = mode;
    if (mode === 'portrait') f.img.setTexture(`face-${f.portrait}`);
    else f.img.setTexture(`a-${f.idle.key}`, f.frame);
    f.img.setScale(f.base[mode] * f.k);
  }

  // The standing sprites play (facing down).
  update(_time, delta) {
    for (const f of this.faces ?? []) {
      if (f.still || f.mode !== 'idle' || !f.img.active) continue;
      f.t += delta * 0.06; // (frame durations are in 60ths of a second)
      while (f.t >= f.idle.durs[f.frame]) { f.t -= f.idle.durs[f.frame]; f.frame = (f.frame + 1) % f.idle.durs.length; }
      f.img.setFrame(f.frame);
    }
  }

  // Moves a face (all of its parts) to a spot, at once or with a tween.
  moveFace(f, [x, y], ms = 0, delay = 0) {
    if (!ms) return f.parts.forEach((p) => p.setPosition(x, y));
    this.tweens.add({ targets: f.parts, x, y, duration: ms, delay, ease: 'Back.easeOut' });
  }

  // The faces as they stand after round `r`: the winners (in their pick sprites) on to the next column, the losers hurt and gone.
  place(r, animate, done) {
    const won = this.t.alive[r + 1], out = this.t.alive[r].filter((i) => !won.includes(i));
    for (const i of out) this.knockOut(i, animate);
    if (animate && won.length) sfx.play('pick_mon');
    won.forEach((i, k) => {
      const f = this.faces[i], last = r + 1 === 4;
      this.ghost(i); // the winner leaves a ghost of itself behind, so the column it came from stays full
      if (animate) this.look(f, 'portrait');
      this.moveFace(f, this.at(i, r + 1), animate ? 420 : 0, animate ? 260 + k * 90 : 0);
      if (animate && !last) this.time.delayedCall(260 + k * 90 + 420, () => this.look(f, 'idle'));
    });
    if (r + 1 === 4) this.crown(this.faces[won[0]], animate);
    if (animate) this.time.delayedCall(260 + won.length * 90 + 420, done);
  }

  // A loser flashes red, shakes, and fades out of the bracket.
  knockOut(i, animate) {
    const f = this.faces[i];
    if (!animate) return f.parts.forEach((p) => p.setVisible(false));
    f.img.setTint(0xff5a4a);
    const x = f.img.x;
    this.tweens.add({ targets: f.parts, x: { from: x - 2, to: x + 2 }, duration: 55, yoyo: true, repeat: 4, onComplete: () => f.parts.forEach((p) => p.setX(x)) });
    this.tweens.add({ targets: f.parts, alpha: 0, duration: 260, delay: 480, onComplete: () => f.parts.forEach((p) => p.setVisible(false)) });
    this.time.delayedCall(60, () => sfx.play('faint'));
  }

  ghost(i) {
    const e = this.t.entrants[i], f = this.faces[i], g = this.face(e, f.img.x, f.img.y, f.size, true);
    g.parts.forEach((p) => p.setAlpha(0.35).setDepth(p.depth - 1));
  }

  // The champion's face grows to fill the middle.
  crown(f, animate) {
    const s = CHAMP_FACE / f.size;
    f.k = s;
    for (const p of f.parts) {
      const sx = p.scaleX * s, sy = p.scaleY * s;
      if (animate) this.tweens.add({ targets: p, scaleX: sx, scaleY: sy, duration: 500, delay: 700, ease: 'Back.easeOut' });
      else p.setScale(sx, sy);
    }
  }

  // The bracket's lines, and in gold the paths taken by everyone through round `upTo` - 1.
  drawLines(upTo) {
    const g = this.lines.clear();
    for (let r = 0; r < 4; r++) {
      for (let s = 0; s < SIZE; s += 1 << r) {
        const [x0, y0] = this.at(s, r), [x1, y1] = this.at(s, r + 1);
        const through = r < upTo && this.t.alive[r + 1].some((i) => i >> r === s >> r); // this group's winner went on
        g.lineStyle(1, through ? INK.gold : 0x3c5a78, 1);
        g.beginPath();
        g.moveTo(x0, y0);
        if (r < 3) { const mx = (x0 + x1) / 2; g.lineTo(mx, y0); g.lineTo(mx, y1); g.lineTo(x1, y1); }
        else { g.lineTo(x1, y0); g.lineTo(x1, y1 + CHAMP_FACE / 2); }
        g.strokePath();
      }
    }
  }

  // ---- the animations ----
  // The first time up: every face pops into its place, one after the other.
  dropIn(done) {
    this.faces.forEach((f, i) => {
      for (const p of f.parts) {
        const sx = p.scaleX, sy = p.scaleY;
        p.setScale(0);
        this.tweens.add({ targets: p, scaleX: sx, scaleY: sy, duration: 240, delay: 120 + i * 45, ease: 'Back.easeOut' });
      }
    });
    this.time.delayedCall(120 + SIZE * 45 + 300, done);
  }

  // The round `r` just finished, played out.
  playOut(r, done) {
    this.time.delayedCall(350, () => {
      sfx.play('ui_pick');
      this.place(r, true, () => { this.drawLines(r + 1); done(); });
    });
  }

  // ---- after the animation: what comes next ----
  after() {
    const r = round(this.t), me = this.faces[meIndex(this.t)];
    this.ready = true;
    if (r >= 4) return this.champion();
    if (!stillIn(this.t)) return this.knockedOut();
    const rival = rivalOf(this.t), foe = this.t.entrants[rival];
    this.subtitle.setText(ROUNDS[r]);
    for (const f of [me, this.faces[rival]]) this.tweens.add({ targets: f.parts, alpha: { from: 1, to: 0.55 }, duration: 380, yoyo: true, repeat: -1 });
    this.footer(`${session.profile.name}  vs  ${SPECIES[foe.form].name}`, `${ROUNDS[r]}   CPU Lv ${LEVELS[r]}`);
    this.hints.set([{ icon: 'btnA', key: 'Enter', label: 'Fight', action: 'confirm' }, { icon: 'btnB', key: 'Esc', label: 'Withdraw', action: 'cancel' }]);
  }

  // The player is out: the rest of the bracket is played out round by round, down to a champion.
  knockedOut() {
    const out = round(this.t) - 1;
    if (!this.lostJingle) { this.lostJingle = true; music.jingle('jingle_loss'); }
    this.footer('Knocked out', `in the ${ROUNDS[out]}`, INK.rose);
    this.hints.set([{ icon: 'btnA', key: 'Enter', label: 'Back to the basement', action: 'confirm' }]);
    this.time.delayedCall(1700, () => {
      if (this.leaving) return;
      const r = round(this.t);
      this.t = settle(this.t, false);
      this.subtitle.setText(ROUNDS[r]);
      this.playOut(r, () => { if (!this.leaving) this.after(); });
    });
  }

  // Somebody has won it all: a victory screen with confetti. Only the player's own mon wins the prize TM.
  champion() {
    const win = this.t.alive[4][0], e = this.t.entrants[win], mine = !!e.me;
    this.subtitle.setText('Champion!');
    let tm = null;
    if (mine) {
      this.t.prize ??= prizeTM() ?? 'none'; // (once: this screen may be built again)
      tm = this.t.prize !== 'none' ? this.t.prize : null;
    }
    this.cameras.main.flash(300, 255, 240, 160);
    music.jingle(tm ? 'jingle_tm' : 'jingle_win');
    shade(this, 0, 0, VIEW_W, VIEW_H, 0x06101c, 0.7).setDepth(DEPTH + 5);
    const big = this.face(e, VIEW_W / 2, 82, 52);
    big.parts.forEach((p) => p.setDepth(DEPTH + 6).setAlpha(0));
    this.look(big, 'portrait');
    this.faces.push(big); // (so it animates)
    this.tweens.add({ targets: big.parts, alpha: 1, duration: 300 });
    this.tweens.add({ targets: big.parts, y: '-=3', duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const name = mine ? session.profile.name : SPECIES[e.form].name;
    const title = text(this, VIEW_W / 2, 33, mine ? 'You won the tournament!' : `${name} wins the tournament!`, INK.gold).setOrigin(0.5, 0).setDepth(DEPTH + 7);
    this.tweens.add({ targets: title, alpha: { from: 0, to: 1 }, duration: 300 });
    this.confetti();
    this.footer(mine ? SPECIES[e.form].name : 'Champion', mine ? (tm ? `Found the ${MOVES[tm].name} TM!` : 'No TM left for your mon to learn.') : 'Better luck next time.', INK.gold, DEPTH + 8);
    this.hints.set([{ icon: 'btnA', key: 'Enter', label: 'Back to the basement', action: 'confirm' }]);
  }

  // Bits of paper raining down for as long as the screen is up.
  confetti() {
    const colors = [0xff5a4a, 0xffe45c, 0x8fdcff, 0x9af0a0, 0xff9ae0, 0xffffff];
    const drop = (fromTop) => {
      const c = this.add.image(Math.random() * VIEW_W, fromTop ? -4 : Math.random() * VIEW_H, 'px').setScrollFactor(0).setDepth(DEPTH + 6)
        .setTint(colors[Math.floor(Math.random() * colors.length)]).setDisplaySize(2 + Math.random() * 2, 3 + Math.random() * 3);
      const fall = VIEW_H + 8 - c.y, ms = fall * (22 + Math.random() * 24), sway = (Math.random() - 0.5) * 40;
      this.tweens.add({ targets: c, y: VIEW_H + 8, x: c.x + sway, angle: (Math.random() - 0.5) * 900, scaleX: { from: c.scaleX, to: c.scaleX * 0.15 }, yoyo: false, duration: ms, onComplete: () => { c.destroy(); if (!this.leaving) drop(true); } });
    };
    for (let i = 0; i < 70; i++) drop(false);
  }

  footer(title, sub, tint = INK.white, depth = DEPTH) {
    this.footerParts?.forEach((o) => o.destroy());
    const y = VIEW_H - 15 - 32;
    const box = panel(this, (VIEW_W - 176) >> 1, y, 176, 30, 'win').setDepth(depth);
    const a = text(this, VIEW_W / 2, y + 5, title, tint).setOrigin(0.5, 0).setDepth(depth + 1), b = text(this, VIEW_W / 2, y + 16, sub, INK.dim).setOrigin(0.5, 0).setDepth(depth + 1);
    this.footerParts = [box, a, b];
    for (const o of [a, b]) this.tweens.add({ targets: o, alpha: { from: 0, to: 1 }, duration: 300 });
  }

  next() {
    if (this.leaving || (!this.ready && !(round(this.t) < 4 && !stillIn(this.t)))) return; // (a knocked-out player may skip the rest)
    this.leaving = true;
    sfx.play('ui_pick');
    if (round(this.t) < 4 && stillIn(this.t)) return go(this, 'battle', { battle: tourneyBattle(this.t) });
    go(this, 'hub', { area: 'basement', entry: 'pillar' });
  }

  // Walking away before a match gives the tournament up (nothing is booked).
  quit() {
    if (!this.ready || this.leaving || round(this.t) >= 4 || !stillIn(this.t)) return this.next();
    this.leaving = true;
    sfx.play('ui_back');
    go(this, 'hub', { area: 'basement', entry: 'pillar' });
  }
}
