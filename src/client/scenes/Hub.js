import Phaser from 'phaser';
import { VIEW_W, VIEW_H, WALK_SPEED } from '../../scene.js';
import { makeWalkable } from '../../maps.js';
import { Mon } from '../../mon.js';
import { PLACE, DOJO_BACKDROP } from '../art.js';
import { AREAS } from '../areas.js';
import { Actions } from '../input.js';
import { go, wipe } from '../transition.js';
import { session, saveSession, loadoutOf, LOADOUT_SIZE } from '../session.js';
import { MODES, MODE_ORDER, makeBattle } from '../modes.js';
import { MoveMenu } from '../movemenu.js';
import { Hints, Dialog, choose, banner } from '../ui.js';

// Walking around the dojo: the main room (pick moves on the training ring) and the basement (the pillar starts battles).
export class Hub extends Phaser.Scene {
  constructor() { super('hub'); }

  init(data) {
    this.areaId = AREAS[data?.area] ? data.area : 'dojo';
    this.entry = data?.entry;
  }

  create() {
    const a = this.area = AREAS[this.areaId], ox = this.ox = (VIEW_W - a.size[0]) >> 1;
    const cam = this.cameras.main;
    cam.setBackgroundColor(DOJO_BACKDROP);
    this.walkable = makeWalkable({
      walk: a.walk.map((poly) => poly.map(([x, y]) => [x + ox, y])),
      block: a.block.map((b) => ({ ...b, x: b.x + ox })),
    });

    this.add.image(ox, 0, a.image).setOrigin(0);
    // looping pieces of the backdrop, each started on a different frame so the torches do not flicker in step
    a.anims.forEach((key, i) => this.add.sprite(ox + PLACE[key].x, PLACE[key].y, key).setOrigin(0).play({ key, startFrame: i % this.anims.get(key).frames.length }));
    for (const p of a.props) this.add.sprite(ox + PLACE[p.key].x, PLACE[p.key].y, p.key).setOrigin(0).setDepth(10 + p.base).play(p.key);

    const e = a.entries[this.entry] ?? Object.values(a.entries)[0];
    this.player = new Mon(this, ox + e.at[0], e.at[1], { team: 'p', species: session.species });
    this.player.dir = e.dir;

    cam.setBounds(0, 0, VIEW_W, Math.max(VIEW_H, a.size[1] + 16)).setRoundPixels(true); // the button bar covers the last 15px
    cam.startFollow(this.player.sprite, true, 0.2, 0.2);
    cam.centerOn(this.player.x, this.player.y);

    this.actions = new Actions(this);
    this.hints = new Hints(this, this.actions);
    this.walkKeys = this.actions.push({ confirm: () => this.interact(), menu: () => this.openMoves() });
    this.mark = this.add.image(0, 0, 'art-icons', 'btnA').setDepth(9000).setVisible(false); // floats over the player near a spot
    this.bob = 0;
    this.near = undefined;
    this.menu = null;
    this.setNear(null);

    this.events.once('create', () => banner(this, a.name));
    // the first time a species walks in, its moves are put in front of the player
    this.brief = this.areaId === 'dojo' && !session.briefed[session.species];
  }

  // Mon reports its action frames to the scene; nothing fights here.
  actionFrame() {}
  actionDone() {}

  get free() { return this.actions.top === this.walkKeys && !wipe.busy; }

  setNear(spot) {
    if (spot === this.near) return;
    this.near = spot;
    this.showHints();
  }

  showHints() {
    if (this.menu) return this.hints.set(this.menu.hints);
    this.hints.set([
      { icon: 'dpad', key: 'WASD', label: 'Walk' },
      ...(this.near ? [{ icon: 'btnA', key: 'Enter', label: this.near.label, action: 'confirm' }] : []),
      { icon: 'start', key: 'Tab', label: 'Moves', action: 'menu' },
    ]);
  }

  interact() {
    const id = this.near?.id;
    if (id === 'ring') this.openMoves();
    else if (id === 'pillar') this.touchPillar();
    else if (id === 'arch') this.tell('The training mazes beyond the arch are shut for now.');
  }

  async tell(...lines) {
    const d = new Dialog(this, this.actions, this.hints);
    for (const line of lines) await d.say(line);
    d.close();
  }

  openMoves() {
    if (this.menu) return;
    session.briefed[session.species] = true;
    saveSession();
    this.menu = new MoveMenu(this, this.actions, {
      species: session.species,
      onClose: () => { this.menu = null; this.showHints(); },
    });
    this.menu.onChange = () => this.showHints();
    this.showHints();
  }

  async touchPillar() {
    const d = new Dialog(this, this.actions, this.hints);
    if (loadoutOf().length < LOADOUT_SIZE) {
      await d.say(`The pillar stays dim. You need ${LOADOUT_SIZE} moves ready before it will take you anywhere.`);
      d.close();
      return this.openMoves();
    }
    await d.say('The pillar hums with a strange light. It can carry you off to a battle in some far-away place.');
    for (;;) {
      const pick = await choose(this, this.actions, {
        x: VIEW_W - 136, y: 68, w: 128, title: 'Battle', hints: this.hints,
        items: [...MODE_ORDER.map((id) => ({ label: MODES[id].name, off: !MODES[id].open })), { label: 'Not now' }],
      });
      const mode = MODES[MODE_ORDER[pick]];
      if (!mode) return d.close();
      if (mode.open) {
        d.close();
        return go(this, 'battle', { battle: makeBattle(mode.id) });
      }
      await d.say(mode.closed);
    }
  }

  async leave(door) {
    const d = new Dialog(this, this.actions, this.hints);
    await d.say('Head back to Sharpedo Bluff? You can choose another Pokémon there.');
    const pick = await choose(this, this.actions, { x: VIEW_W - 88, y: 112, w: 80, hints: this.hints, items: [{ label: 'Leave' }, { label: 'Stay' }] });
    d.close();
    if (pick === 0) return go(this, 'title', { select: true });
    this.player.x = this.ox + door.back[0];
    this.player.y = door.back[1];
    this.player.dir = 4;
  }

  update(_, ms) {
    const dt = Math.min(ms, 50) / 1000, p = this.player;
    const [vx, vy] = this.free ? this.actions.dir() : [0, 0];
    p.walk(vx, vy, WALK_SPEED, dt);
    p.update(dt);
    this.menu?.update(dt);
    this.bob += dt;
    this.mark.setVisible(this.free && !!this.near).setPosition(Math.round(p.x), Math.round(p.y - 30 + Math.sin(this.bob * 6)));
    if (!this.free) return;

    if (this.brief) { this.brief = false; return this.openMoves(); }
    const lx = p.x - this.ox;
    const door = this.area.doors.find(({ rect: [x, y, w, h] }) => lx >= x && lx <= x + w && p.y >= y && p.y <= y + h);
    if (door?.to) return go(this, 'hub', door.to);
    if (door?.leave) return this.leave(door);

    let best = null, bd = Infinity;
    for (const s of this.area.spots) {
      const d = Math.hypot(lx - s.at[0], p.y - s.at[1]);
      if (d <= s.r && d < bd) { best = s; bd = d; }
    }
    this.setNear(best);
  }
}
