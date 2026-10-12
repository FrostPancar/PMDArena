import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from '../../scene.js';
import { SPECIES, SPECIES_ORDER } from '../../sprites.js';
import { MOVES } from '../../moves.js';
import { Actions } from '../input.js';
import { go, wipe } from '../transition.js';
import { session, saveSession, loadoutOf, levelOf } from '../session.js';
import { net } from '../net.js';
import { mine, lookOf, crewOf, withCrew, CREW_SIZE } from '../modes.js';
import { DEPTH, INK, Hints, text, panel, shade, typeIcon } from '../ui.js';

const PICK_SECONDS = 30;
const SHARE_MS = 250; // how often a player repeats their crew once it is locked in, so a client that arrives late still learns it
const COLS = 10, CELL = 25, GRID_Y = 24;
const SLOT = 46, SLOT_GAP = 12, SLOT_Y = 138;


// The crew screen before a 3v3: every player picks the three mons they will send out, in order, from the whole roster
// (each fights with the moves and the look the player has earned for it). The first is the one that starts; the next
// comes out when it faints. Picking nothing in time takes the crew from last time, filled up at random. Once everyone
// has locked in, the battle (with the crews written into it) goes on to the stage draw.
//
// Over the relay it is one message, repeated while a locked-in player waits: b { d: { k: 'cr', c: [{ species, moves, form }] } }.
export class CrewPick extends Phaser.Scene {
  constructor() { super('crew'); }

  init(data) {
    this.battle = data.battle;
    this.online = this.battle.fighters.some((f) => !mine(f));
    this.phase = 'pick'; // pick -> wait (locked in, the others not yet) -> go
    this.left = PICK_SECONDS;
    this.sinceShare = 0;
    this.gone = [];
    this.leaving = false;
    this.cursor = 0;
    this.roster = SPECIES_ORDER.filter((id) => loadoutOf(id).length > 0);
    // last time's crew to start from, else whoever is being played
    const saved = session.crew.filter((id, i, all) => this.roster.includes(id) && all.indexOf(id) === i).slice(0, CREW_SIZE);
    this.team = saved.length ? saved : this.roster.includes(session.species) ? [session.species] : [];
    this.players = this.battle.fighters
      .filter((f) => f.kind === 'human')
      .map((f) => ({ f, me: mine(f), crew: null, locked: false, gone: false }));
    this.me = this.players.find((p) => p.me);
    // who is on the other side: a CPU's crew is known from the start, a player's once they lock in
    this.rival = this.battle.fighters.find((f) => f.team !== this.me.f.team);
    this.rivalPlayer = this.players.find((p) => p.f === this.rival) ?? null;
  }

  create() {
    if (this.textures.exists('worldmap')) this.add.image(0, 0, 'worldmap').setOrigin(0).setScrollFactor(0);
    shade(this, 0, 0, VIEW_W, VIEW_H, 0x06101c, 0.78);
    const face = (x, y, id, size) => this.paint(this.add.image(x, y, 'px').setScrollFactor(0).setDepth(DEPTH + 1), id, size);

    this.plate = panel(this, (VIEW_W - 172) >> 1, 3, 172, 15, 'dim');
    this.plateText = text(this, VIEW_W / 2, 5, '', INK.gold).setOrigin(0.5, 0);

    // the roster
    const gx = (VIEW_W - COLS * CELL) >> 1;
    this.hot = panel(this, 0, 0, CELL - 1, CELL - 1, 'hot').setDepth(DEPTH + 1);
    this.cells = this.roster.map((id, i) => {
      const x = gx + (i % COLS) * CELL, y = GRID_Y + Math.floor(i / COLS) * CELL;
      panel(this, x, y, CELL - 1, CELL - 1, 'dim').setInteractive({ useHandCursor: true })
        .on('pointerover', () => { if (this.phase === 'pick') this.cursor = i; })
        .on('pointerdown', () => { if (this.phase === 'pick' && !wipe.busy) { this.cursor = i; this.toggle(id); } });
      const img = face(x + 12, y + 12, id, 20).setDepth(DEPTH + 2);
      const order = text(this, x + 2, y + 1, '', INK.gold).setDepth(DEPTH + 3);
      return { id, x, y, img, order };
    });
    const below = GRID_Y + Math.ceil(this.roster.length / COLS) * CELL + 3;
    this.infoType = typeIcon(this, gx + 6, below + 6, 'normal');
    this.infoName = text(this, gx + 16, below, '', INK.gold);
    this.infoMoves = text(this, gx, below + 13, '', INK.dim);

    // the two crews
    const slots = (x0, label, tint) => {
      text(this, x0, SLOT_Y - 13, label, tint);
      return Array.from({ length: CREW_SIZE }, (_, i) => {
        const x = x0 + i * (SLOT + SLOT_GAP);
        panel(this, x, SLOT_Y, SLOT, SLOT, 'dim');
        return { img: face(x + SLOT / 2, SLOT_Y + SLOT / 2, this.roster[0], 40).setVisible(false), blank: text(this, x + SLOT / 2, SLOT_Y + 16, '?', INK.off).setOrigin(0.5, 0), name: text(this, x + SLOT / 2, SLOT_Y + SLOT + 2, '', INK.white).setOrigin(0.5, 0) };
      });
    };
    const side = CREW_SIZE * (SLOT + SLOT_GAP) - SLOT_GAP;
    this.mineSlots = slots(14, 'Your crew', INK.sky);
    this.theirSlots = slots(VIEW_W - 14 - side, this.rival?.kind === 'cpu' ? 'CPU crew' : this.rival?.name ? `${this.rival.name}'s crew` : 'Their crew', INK.rose);
    text(this, VIEW_W / 2, SLOT_Y + 16, 'VS', INK.gold).setOrigin(0.5, 0);
    this.note = text(this, VIEW_W / 2, SLOT_Y + 30, '', INK.dim).setOrigin(0.5, 0);

    this.actions = new Actions(this);
    this.hints = new Hints(this, this.actions);
    this.actions.push({
      left: () => this.move(-1), right: () => this.move(1),
      up: () => this.move(-COLS), down: () => this.move(COLS),
      confirm: () => (this.team.length === CREW_SIZE ? this.lock() : this.toggle(this.roster[this.cursor])),
      cancel: () => (this.phase === 'pick' && this.team.length ? this.toggle(this.team[this.team.length - 1]) : this.back()),
    });
    this.shownKey = this.hintKey = '';
    this.show();

    if (this.online) {
      const offs = [
        net.on('b', (msg) => this.hear(msg)),
        net.on('left', (msg) => this.farewell(msg.id)),
        net.on('status', (up) => { if (!up) this.back(); }),
      ];
      this.events.once('shutdown', () => offs.forEach((off) => off()));
    }
  }

  // A mon's portrait on an image, `size` px across; one with no portrait is shown by its sprite instead.
  paint(img, id, size) {
    if (this.textures.exists(`face-${id}`)) return img.setTexture(`face-${id}`).setScale(size / 40);
    const idle = SPECIES[id].anims.Idle;
    return img.setTexture(`a-${idle.key}`, 0).setScale(Math.min(1, size / Math.max(idle.fw, idle.fh) * 1.4));
  }

  // ---- choosing ----
  move(step) {
    const to = this.cursor + step;
    if (this.phase === 'pick' && to >= 0 && to < this.roster.length) this.cursor = to;
  }

  // In the crew: out of it. Not in it: in, at the end, if there is room.
  toggle(id) {
    if (this.phase !== 'pick') return;
    if (this.team.includes(id)) this.team = this.team.filter((o) => o !== id);
    else if (this.team.length < CREW_SIZE) this.team.push(id);
  }

  lock() {
    if (this.phase !== 'pick') return;
    // out of time with places still open: they go to whoever has not been picked, at random
    const spare = Phaser.Utils.Array.Shuffle(this.roster.filter((id) => !this.team.includes(id)));
    while (this.team.length < CREW_SIZE && spare.length) this.team.push(spare.pop());
    this.phase = 'wait';
    session.crew = [...this.team];
    saveSession();
    Object.assign(this.me, { crew: crewOf(this.team), locked: true });
    this.share();
  }

  share() {
    this.sinceShare = 0;
    if (this.online && this.me.locked) net.send('b', { d: { k: 'cr', c: this.me.crew } });
  }

  // ---- what the other players say ----
  hear(msg) {
    const d = msg.d, p = this.players.find((o) => !o.me && o.f.owner === msg.from);
    if (d?.k !== 'cr' || !p || p.locked || p.gone || !Array.isArray(d.c)) return;
    // only what this client knows how to field: real species, each once, with moves that exist
    const crew = [];
    for (const c of d.c.slice(0, CREW_SIZE)) {
      const sp = SPECIES[c?.species], moves = (Array.isArray(c?.moves) ? c.moves : []).filter((id) => MOVES[id]).slice(0, 4);
      if (!sp || sp.form || !moves.length || crew.some((o) => o.species === c.species)) continue;
      crew.push({ species: c.species, moves, form: SPECIES[c.form]?.base === c.species ? c.form : undefined });
    }
    if (!crew.length) return;
    Object.assign(p, { crew, locked: true });
  }

  farewell(id) {
    const p = this.players.find((o) => !o.me && o.f.owner === id);
    if (p) p.gone = true;
    if (this.battle.fighters.some((f) => f.owner === id)) this.gone.push(id);
  }

  // Back out to the dojo basement. Online, the others are told you left.
  back() {
    if (this.leaving) return;
    this.leaving = true;
    if (this.online) net.send('battle.over');
    this.leave('hub', { area: 'basement', entry: 'pillar' });
  }

  leave(key, data) {
    if (wipe.busy) return void this.time.delayedCall(100, () => this.leave(key, data));
    go(this, key, data);
  }

  // Everyone present has locked in: on to the stage draw, with the crews written into the battle.
  proceed() {
    this.phase = 'go';
    const fighters = this.battle.fighters.map((f) => {
      const crew = this.players.find((p) => p.f === f)?.crew;
      return crew ? withCrew(f, crew) : f;
    });
    this.time.delayedCall(900, () => {
      if (this.leaving) return;
      this.leaving = true;
      this.leave('draw', { battle: { ...this.battle, fighters }, gone: this.gone });
    });
  }

  // ---- every frame ----
  update(_, ms) {
    if (this.phase === 'pick' && (this.left -= ms / 1000) <= 0) this.lock();
    this.sinceShare += ms;
    if (this.sinceShare >= SHARE_MS) this.share();
    if (this.phase === 'wait' && this.players.every((p) => p.gone || p.locked)) this.proceed();
    this.show();
  }

  // Redraws only when something it shows has changed.
  show() {
    const theirs = this.rival?.crew ?? this.rivalPlayer?.crew ?? null, full = this.team.length === CREW_SIZE;
    const key = [this.phase, this.cursor, this.team.join(), Math.ceil(this.left), theirs?.length, this.rivalPlayer?.gone].join('|');
    if (key === this.shownKey) return;
    this.shownKey = key;

    const waiting = this.players.filter((p) => !p.gone && !p.locked).length;
    this.plateText.setText(this.phase === 'pick' ? `Pick your crew  ${Math.ceil(this.left)}` : this.phase === 'wait' && waiting ? 'Waiting for the other player' : 'Crews ready!');
    for (const c of this.cells) {
      const at = this.team.indexOf(c.id);
      c.order.setText(at < 0 ? '' : String(at + 1));
      c.img.setAlpha(at < 0 && (full || this.phase !== 'pick') ? 0.4 : 1);
    }
    const cur = this.cells[this.cursor];
    this.hot.setPosition(cur.x, cur.y).setVisible(this.phase === 'pick');
    const sp = SPECIES[cur.id];
    this.infoType.setFrame(sp.type);
    this.infoName.setText(`${sp.name}  Lv ${levelOf(cur.id)}`);
    this.infoMoves.setText(loadoutOf(cur.id).map((id) => MOVES[id].name).join(', '));

    const fill = (slots, crew) => slots.forEach((s, i) => {
      const c = crew?.[i];
      s.img.setVisible(!!c);
      s.blank.setVisible(!c);
      if (c) this.paint(s.img, lookOf(c), 40);
      s.name.setText(c ? SPECIES[lookOf(c)].name : '');
    });
    fill(this.mineSlots, crewOf(this.team));
    fill(this.theirSlots, theirs);
    this.note.setText(this.rivalPlayer?.gone ? 'They left' : this.rival?.kind === 'cpu' ? '' : this.rivalPlayer?.locked ? 'Ready' : 'Choosing...');

    const hintKey = `${this.phase} ${full} ${!!this.team.length}`;
    if (hintKey === this.hintKey) return;
    this.hintKey = hintKey;
    this.hints.set(this.phase !== 'pick' ? [{ label: 'Locked in' }, ...(this.phase === 'wait' ? [{ icon: 'btnB', key: 'Esc', label: 'Leave', action: 'cancel' }] : [])]
      : [
        { icon: 'dpad', key: 'WASD', label: 'Choose' },
        { icon: 'btnA', key: 'Enter', label: full ? 'Ready!' : 'Add', action: 'confirm' },
        { icon: 'btnB', key: 'Esc', label: this.team.length ? 'Take back' : 'Leave', action: 'cancel' },
      ]);
  }
}
