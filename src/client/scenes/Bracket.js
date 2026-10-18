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
// Then it shows the player's next pairing, or the end of the run: knocked out, or champion with the prize TM.
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

  // the standing sheets of the entrants with no portrait, to show them by instead
  preload() {
    const ids = this.t.entrants.filter((e) => ![e.form, e.species].some((id) => this.textures.exists(`face-${id}`))).map((e) => e.form);
    loadIdle(this, ids);
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

  // A portrait in a frame (gold for the player's own), `size` px across; one with no portrait is its standing sprite.
  face(e, x, y, size) {
    const back = this.add.image(x, y, 'px').setDisplaySize(size + 2, size + 2).setTint(e.me ? INK.gold : 0x9fb4c8).setScrollFactor(0).setDepth(DEPTH + 1);
    const inner = this.add.image(x, y, 'px').setDisplaySize(size, size).setTint(0x163454).setScrollFactor(0).setDepth(DEPTH + 1);
    const img = this.add.image(x, y, 'px').setScrollFactor(0).setDepth(DEPTH + 2);
    const id = [e.form, e.species].find((k) => this.textures.exists(`face-${k}`));
    if (id) img.setTexture(`face-${id}`).setScale(size / 40);
    else {
      const idle = SPECIES[e.form].anims.Idle;
      img.setTexture(`a-${idle.key}`, 0).setScale(Math.min(1, (size / Math.max(idle.fw, idle.fh)) * 1.4));
    }
    return { parts: [back, inner, img], img, back, size };
  }

  // Moves a face (all of its parts) to a spot, at once or with a tween.
  moveFace(f, [x, y], ms = 0, delay = 0) {
    if (!ms) return f.parts.forEach((p) => p.setPosition(x, y));
    this.tweens.add({ targets: f.parts, x, y, duration: ms, delay, ease: 'Back.easeOut' });
  }

  // The faces as they stand after round `r`: winners on to the next column, losers greyed in their last.
  place(r, animate, done) {
    const won = this.t.alive[r + 1], out = this.t.alive[r].filter((i) => !won.includes(i));
    for (const i of out) this.grey(i, animate);
    won.forEach((i, k) => {
      this.ghost(i); // the winner leaves a ghost of itself behind, so the column it came from stays full
      this.moveFace(this.faces[i], this.at(i, r + 1), animate ? 420 : 0, animate ? 260 + k * 90 : 0);
    });
    if (r + 1 === 4) this.crown(this.faces[won[0]], animate);
    if (animate) this.time.delayedCall(260 + won.length * 90 + 420, done);
  }

  grey(i, animate) {
    const f = this.faces[i];
    if (animate) this.tweens.add({ targets: f.parts, alpha: 0.35, duration: 260 });
    else f.parts.forEach((p) => p.setAlpha(0.35));
    f.img.setTint(0x777777);
  }

  ghost(i) {
    const e = this.t.entrants[i], f = this.faces[i], g = this.face(e, f.img.x, f.img.y, f.size);
    g.parts.forEach((p) => p.setAlpha(0.35).setDepth(p.depth - 1));
  }

  // The champion's face grows to fill the middle.
  crown(f, animate) {
    const s = CHAMP_FACE / f.size;
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

  knockedOut() {
    const r = round(this.t) - 1;
    music.jingle('jingle_loss');
    this.footer('Knocked out', `in the ${ROUNDS[r]}`, INK.rose);
    this.hints.set([{ icon: 'btnA', key: 'Enter', label: 'Back to the basement', action: 'confirm' }]);
  }

  champion() {
    this.subtitle.setText('Champion!');
    this.t.prize ??= prizeTM() ?? 'none'; // (once: this screen may be built again)
    const tm = this.t.prize !== 'none' ? this.t.prize : null;
    this.cameras.main.flash(300, 255, 240, 160);
    music.jingle(tm ? 'jingle_tm' : 'jingle_win');
    this.footer('You won the tournament!', tm ? `Found the ${MOVES[tm].name} TM!` : 'No TM left for your mon to learn.', INK.gold);
    this.hints.set([{ icon: 'btnA', key: 'Enter', label: 'Back to the basement', action: 'confirm' }]);
  }

  footer(title, sub, tint = INK.white) {
    const y = VIEW_H - 15 - 32;
    panel(this, (VIEW_W - 176) >> 1, y, 176, 30, 'win');
    const a = text(this, VIEW_W / 2, y + 5, title, tint).setOrigin(0.5, 0), b = text(this, VIEW_W / 2, y + 16, sub, INK.dim).setOrigin(0.5, 0);
    for (const o of [a, b]) this.tweens.add({ targets: o, alpha: { from: 0, to: 1 }, duration: 300 });
  }

  next() {
    if (!this.ready || this.leaving) return;
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
