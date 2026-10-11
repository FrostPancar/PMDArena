import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from '../scene.js';
import { SPECIES, SPECIES_ORDER } from '../sprites.js';
import { MOVES } from '../moves.js';
import { FLAG_COUNT } from './art.js';
import { session, saveSession, progressOf, formOf, faceOf, facesOpen, NAME_LENGTH } from './session.js';
import { unlockPlan, evolveLevels, formAt } from './progress.js';
import { DEPTH, INK, Group, text, icon, typeIcon, panel, shade } from './ui.js';

const TABS = ['Profile', 'Pokémon', 'Records'];
const TOP = 26, ROWS = 10, ROW_H = 15;
const pinned = (o, depth = 2) => o.setScrollFactor(0).setDepth(DEPTH + depth);

// The records room off the dojo: three pages over the whole screen.
//   Profile  the name, portrait and flag other players see
//   Pokémon  how far each mon has come: level, EXP, the next move it unlocks, when it evolves
//   Records  battles fought and won
export class ProfileMenu {
  constructor(scene, actions, { onClose }) {
    Object.assign(this, { scene, actions, onClose, frame: new Group(), page: new Group() });
    this.tab = 0;
    this.row = 0; // on the profile page: 0 name, 1 portrait, 2 flag
    this.index = Math.max(0, SPECIES_ORDER.indexOf(session.species)); // on the Pokémon page
    this.scroll = 0;
    this.typing = null; // the name while it is being typed

    this.frame.add(shade(scene, 0, 0, VIEW_W, VIEW_H, 0x000000, 0.6));
    this.tabs = TABS.map((label, i) => {
      const x = 6 + i * 84;
      const t = {
        idle: this.frame.add(panel(scene, x, 5, 80, 18, 'dim')), hot: this.frame.add(panel(scene, x, 5, 80, 18, 'hot')),
        label: this.frame.add(text(scene, x + 40, 8, label).setOrigin(0.5, 0)),
      };
      t.idle.setInteractive({ useHandCursor: true }).on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); this.show(i); });
      return t;
    });
    this.onWheel = (_p, _over, _dx, dy) => { if (this.tab === 1) this.pick(this.index + Math.sign(dy)); };
    scene.input.on('wheel', this.onWheel);

    this.handler = actions.push({
      up: () => this.step(-1), down: () => this.step(1), left: () => this.turn(-1), right: () => this.turn(1),
      confirm: () => { if (this.tab === 0 && this.row === 0) this.rename(); },
      menu: () => this.show((this.tab + 1) % TABS.length),
      cancel: () => this.close(),
    });
    this.show(0);
  }

  // the bar's buttons while this is up
  get hints() {
    if (this.typing !== null) return [{ key: 'A-Z', label: 'Type a name' }, { icon: 'btnA', key: 'Enter', label: 'Keep', action: 'confirm' }, { icon: 'btnB', key: 'Esc', label: 'Undo', action: 'cancel' }];
    const page = [
      [{ icon: 'dpadUD', key: 'W S', label: 'Choose' }, this.row ? { icon: 'dpadLR', key: 'A D', label: 'Change' } : { icon: 'btnA', key: 'Enter', label: 'Rename', action: 'confirm' }],
      [{ icon: 'dpadUD', key: 'W S', label: 'Browse' }],
      [],
    ][this.tab];
    return [...page, { icon: 'start', key: 'Tab', label: 'Next page', action: 'menu' }, { icon: 'btnB', key: 'Esc', label: 'Leave', action: 'cancel' }];
  }

  show(tab) {
    this.tab = tab;
    this.tabs.forEach((t, i) => { t.hot.setVisible(i === tab); t.label.setTint(i === tab ? INK.white : INK.dim); });
    this.draw();
  }

  step(by) {
    if (this.tab === 0) { this.row = (this.row + by + 3) % 3; this.draw(); } else if (this.tab === 1) this.pick(this.index + by);
  }

  // Left / right on the profile page: the next portrait or flag.
  turn(by) {
    if (this.tab !== 0 || this.row === 0) return;
    const p = session.profile;
    if (this.row === 1) {
      const faces = facesOpen();
      p.face = faces[(faces.indexOf(faceOf()) + by + faces.length) % faces.length];
    } else p.flag = (p.flag + by + FLAG_COUNT) % FLAG_COUNT;
    this.draw();
  }

  pick(i) {
    this.index = Phaser.Math.Clamp(i, 0, SPECIES_ORDER.length - 1);
    this.scroll = Math.max(Math.min(this.scroll, this.index), this.index - ROWS + 1);
    this.draw();
  }

  // Type a new name: letters only, kept on Enter, dropped on Esc.
  rename() {
    this.typing = '';
    const done = (keep) => {
      if (keep && this.typing) session.profile.name = this.typing;
      this.typing = null;
      this.actions.pop(keys);
      this.draw();
    };
    const keys = this.actions.push({
      type: (ch) => { if (this.typing.length < NAME_LENGTH) { this.typing += this.typing ? ch.toLowerCase() : ch; this.draw(); } },
      erase: () => { this.typing = this.typing.slice(0, -1); this.draw(); },
      confirm: () => done(true), cancel: () => done(false),
    });
    this.draw();
  }

  draw() {
    this.page.clear();
    [this.drawProfile, this.drawMons, this.drawRecords][this.tab].call(this, (o) => this.page.add(o));
    this.onChange?.();
  }

  drawProfile(add) {
    const { scene } = this, p = session.profile, face = faceOf();
    // the card other players are shown
    add(panel(scene, 6, TOP, 132, 156));
    add(panel(scene, 16, TOP + 12, 48, 48, 'dim').setDepth(DEPTH + 1));
    add(pinned(scene.add.image(40, TOP + 36, `face-${face}`)));
    add(pinned(scene.add.sprite(96, TOP + 36, 'flags', p.flag * 6).play(`flag${p.flag}`)));
    add(text(scene, 16, TOP + 70, this.typing ?? p.name, INK.gold).setScale(2));
    const mon = SPECIES[formOf()];
    add(typeIcon(scene, 23, TOP + 108, mon.type));
    add(text(scene, 34, TOP + 102, `${mon.name}  Lv ${progressOf().level}`));
    add(text(scene, 16, TOP + 122, `${session.records.wins} wins in ${session.records.battles} battles`, INK.dim));

    // what can be changed
    add(panel(scene, 142, TOP, 236, 156));
    const rows = [
      ['Name', this.typing !== null ? `${this.typing}_` : p.name],
      ['Portrait', SPECIES[face].name],
      ['Flag', `${p.flag + 1} of ${FLAG_COUNT}`],
    ];
    rows.forEach(([label, value], i) => {
      const y = TOP + 14 + i * 24, on = i === this.row;
      if (on) add(shade(scene, 146, y - 4, 228, 20, 0x8fdcff, 0.25).setDepth(DEPTH + 1));
      add(text(scene, 154, y, label, on ? INK.gold : INK.dim));
      add(text(scene, 290, y, value, on ? INK.white : INK.dim).setOrigin(0.5, 0));
      if (i > 0) {
        for (const [name, dx, by] of [['pageL', -62, -1], ['pageR', 62, 1]]) {
          const a = add(icon(scene, 290 + dx, y + 5, name).setAlpha(on ? 1 : 0.4)).setInteractive({ useHandCursor: true });
          a.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); this.row = i; this.turn(by); });
        }
      }
      const zone = add(pinned(scene.add.zone(146, y - 4, 228, 20).setOrigin(0), 1)).setInteractive();
      zone.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); this.row = i; if (i === 0 && this.typing === null) this.rename(); else this.draw(); });
    });
    add(text(scene, 154, TOP + 96, 'Evolved portraits open up as your Pokémon evolve.', INK.off).setMaxWidth(214));
  }

  drawMons(add) {
    const { scene } = this;
    add(panel(scene, 6, TOP, 150, ROWS * ROW_H + 10));
    for (let r = 0; r < ROWS && this.scroll + r < SPECIES_ORDER.length; r++) {
      const i = this.scroll + r, id = SPECIES_ORDER[i], y = TOP + 5 + r * ROW_H, on = i === this.index, lv = progressOf(id).level;
      if (on) add(shade(scene, 10, y, 142, ROW_H, 0x8fdcff, 0.28).setDepth(DEPTH + 1));
      add(typeIcon(scene, 20, y + 7, SPECIES[id].type));
      add(text(scene, 31, y + 2, SPECIES[formAt(id, lv)].name, session.mons[id] ? INK.white : INK.dim));
      add(text(scene, 138, y + 2, `Lv ${lv}`, lv > 1 ? INK.mint : INK.off).setOrigin(1, 0));
      const zone = add(pinned(scene.add.zone(10, y, 142, ROW_H).setOrigin(0), 3)).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', (_p, _x, _y, e) => { e.stopPropagation(); this.pick(i); });
    }
    add(icon(scene, 146, TOP + 8, 'caretUp').setVisible(this.scroll > 0));
    add(icon(scene, 146, TOP + ROWS * ROW_H + 2, 'caretDown').setVisible(this.scroll + ROWS < SPECIES_ORDER.length));

    // the highlighted mon
    const id = SPECIES_ORDER[this.index], prog = progressOf(id), form = formAt(id, prog.level), mon = session.mons[id];
    const plan = unlockPlan(id), next = plan.find((m) => m.level > prog.level), grows = evolveLevels(id), at = grows.find((l) => l > prog.level);
    const x = 160, w = 218;
    add(panel(scene, x, TOP, w, ROWS * ROW_H + 10));
    add(panel(scene, x + 8, TOP + 8, 48, 48, 'dim').setDepth(DEPTH + 1));
    add(pinned(scene.add.image(x + 32, TOP + 32, `face-${form}`)));
    add(text(scene, x + 64, TOP + 9, SPECIES[form].name, INK.gold));
    add(text(scene, x + 64, TOP + 24, `Lv ${prog.level}`));
    add(text(scene, x + w - 10, TOP + 24, prog.need ? `${prog.into}/${prog.need} EXP` : 'MAX', INK.dim).setOrigin(1, 0));
    add(shade(scene, x + 63, TOP + 40, w - 72, 6, 0x06101c, 1).setDepth(DEPTH + 1));
    add(shade(scene, x + 64, TOP + 41, Math.max(1, Math.round((w - 74) * (prog.need ? prog.into / prog.need : 1))), 4, 0x7ad8ff, 1).setDepth(DEPTH + 2));
    const facts = [
      [`Moves open: ${plan.filter((m) => m.level <= prog.level).length} of ${plan.length}`, INK.white],
      [next ? `Next move at Lv ${next.level}: ${MOVES[next.id].name}` : 'Every move is open', next ? INK.mint : INK.dim],
      [at ? `Evolves at Lv ${at}` : grows.length ? 'Fully evolved' : 'Does not evolve', at ? INK.sky : INK.dim],
      [mon ? `${mon.wins} wins in ${mon.battles} battles` : 'Has not fought yet', INK.dim],
    ];
    facts.forEach(([line, tint], i) => add(text(scene, x + 10, TOP + 66 + i * 15, line, tint)));
    add(text(scene, x + 10, TOP + 132, 'Fight with a Pokémon to raise it. Winning earns the most.', INK.off).setMaxWidth(w - 20));
  }

  drawRecords(add) {
    const { scene } = this, r = session.records;
    add(panel(scene, 6, TOP, VIEW_W - 12, 156));
    const mins = Math.floor(r.seconds / 60);
    const facts = [
      ['Battles', r.battles], ['Wins', r.wins], ['Losses', r.losses],
      ['Win rate', r.battles ? `${Math.round((100 * r.wins) / r.battles)}%` : '-'],
      ['Best streak', r.bestStreak], ['Knockouts', r.kos],
      ['Time fighting', mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m ${r.seconds % 60}s`],
    ];
    facts.forEach(([label, value], i) => {
      add(text(scene, 18, TOP + 12 + i * 15, label, INK.dim));
      add(text(scene, 150, TOP + 12 + i * 15, String(value), INK.white).setOrigin(1, 0));
    });
    add(text(scene, 190, TOP + 12, 'By kind of battle', INK.gold));
    const modes = Object.entries(r.modes);
    if (!modes.length) add(text(scene, 190, TOP + 30, 'No battles fought yet.', INK.off));
    modes.slice(0, 7).forEach(([mode, m], i) => {
      add(text(scene, 190, TOP + 30 + i * 15, mode));
      add(text(scene, VIEW_W - 18, TOP + 30 + i * 15, `${m.wins} / ${m.battles}`, INK.mint).setOrigin(1, 0));
    });
  }

  update() {}

  close() {
    if (this.typing !== null) return;
    saveSession();
    this.scene.input.off('wheel', this.onWheel);
    this.actions.pop(this.handler);
    this.page.clear();
    this.frame.clear();
    this.onClose?.();
  }
}
