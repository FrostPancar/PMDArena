import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from '../../scene.js';
import { MAPS, labelTexture } from '../../maps.js';
import { SPECIES, loadSpecies, ensureSpecies } from '../../sprites.js';
import { Mon, dirFromVec } from '../../mon.js';
import { Actions } from '../input.js';
import { go, wipe } from '../transition.js';
import { session, saveSession } from '../session.js';
import { net } from '../net.js';
import { ARENAS, mine, lookOf, seeded } from '../modes.js';
import { BAR_H, INK, Hints, text, panel } from '../ui.js';

const PICK_SECONDS = 15;
const SHARE_MS = 120; // how often a player repeats where they stand, so a client that arrives late still learns it
const GLIDE = 170; // pixels per second between two stages
const MAP_W = 480, MAP_H = 320;
const TAG = { me: INK.gold, ally: INK.sky, foe: INK.rose };

// The world map before a battle. Everyone in the fight who is a player gets their mon on a stage of the map, and
// moves it to the stage they would like to fight on (arrows or a click on a stage; Enter or a second click locks it
// in, and so does the clock running out). Other players are seen moving about live. Once everyone has locked in, the
// stage is drawn at random from the ones that were picked (a spotlight hops between them and settles) and the
// battle starts there. A player who never moves has locked in a random stage, so doing nothing is a random stage.
//
// Over the relay it is one message, repeated while the screen is up: b { d: { k: 'wm', n: stage id, l: locked in } }.
// Every client ends up with the same set of locked picks, and the seed of the battle picks from them the same way.
export class StageDraw extends Phaser.Scene {
  constructor() { super('draw'); }

  init(data) {
    this.battle = data.battle;
    this.online = this.battle.fighters.some((f) => !mine(f));
    this.phase = 'pick'; // pick -> wait (locked in, the others not yet) -> draw (the spotlight) -> land -> the battle
    this.left = PICK_SECONDS;
    this.sinceShare = 0;
    this.spot = null; // the stage in the spotlight while drawing
    this.gone = []; // clients that left before the battle, for the Battle scene to drop
    this.leaving = false;
    this.shownLabel = null;
    this.note = '';

    // node: the stage this player is standing on (their pick); shown: where their mon is drawn
    this.players = this.battle.fighters
      .filter((f) => f.kind === 'human')
      .map((f) => ({ f, me: mine(f), node: null, shown: null, locked: false, gone: false, mon: null }));
    this.me = this.players.find((p) => p.me);
    // you start on a random stage, not the one you fought on last
    const fresh = ARENAS.filter((id) => id !== session.lastMap);
    this.me.node = this.me.shown = fresh[Math.floor(Math.random() * fresh.length)];
  }

  // Evolved looks are only loaded when someone here wears one.
  preload() { loadSpecies(this, this.players.map((p) => lookOf(p.f))); }

  create() {
    this.walkable = () => true; // Mon asks its scene where it may stand
    this.add.image(0, 0, 'worldmap').setOrigin(0);
    this.nodes = ARENAS.map((id) => {
      const [x, y] = MAPS[id].node;
      return { id, name: MAPS[id].name, x, y, img: this.add.image(x, y, 'node').setDepth(5) };
    });
    this.byId = Object.fromEntries(this.nodes.map((n) => [n.id, n]));
    this.tweens.add({ targets: this.nodes.map((n) => n.img), alpha: 0.55, yoyo: true, repeat: -1, duration: 600 });
    this.label = this.add.image(0, 0, 'node').setDepth(9100);

    const cam = this.cameras.main;
    this.focus = this.add.zone(0, 0, 1, 1);
    cam.setBounds(0, 0, MAP_W, MAP_H + BAR_H + 1).setRoundPixels(true); // the button bar covers the last 15px
    cam.startFollow(this.focus, true, 0.15, 0.15);

    for (const p of this.players) this.spawn(p);
    this.focus.setPosition(this.me.mon.x, this.me.mon.y);
    cam.centerOn(this.me.mon.x, this.me.mon.y);

    this.actions = new Actions(this);
    this.hints = new Hints(this, this.actions);
    this.actions.push({
      up: () => this.step(0, -1), down: () => this.step(0, 1), left: () => this.step(-1, 0), right: () => this.step(1, 0),
      confirm: () => this.lock(),
      cancel: () => this.back(),
    });
    this.input.on('pointerdown', (ptr) => this.click(ptr));
    this.showHints();

    this.plate = panel(this, (VIEW_W - 172) >> 1, 3, 172, 15, 'dim');
    this.plateText = text(this, VIEW_W / 2, 5, '', INK.gold).setOrigin(0.5, 0);

    if (this.online) {
      const offs = [
        net.on('b', (msg) => this.hear(msg)),
        net.on('left', (msg) => this.farewell(msg.id)),
        net.on('status', (up) => { if (!up) this.back(); }),
      ];
      this.events.once('shutdown', () => offs.forEach((off) => off()));
      this.shareNow();
    }
  }

  // Mon reports its action frames to the scene; nothing fights here.
  actionFrame() {}
  actionDone() {}

  // ---- the players on the map ----
  tint(p) { return p.me ? TAG.me : p.f.team === this.me.f.team ? TAG.ally : TAG.foe; }

  // Where on the map a player's mon stands: above their stage, beside whoever else is there.
  home(p) {
    const n = this.byId[p.shown];
    const here = this.players.filter((o) => !o.gone && o.mon && o.shown === p.shown).sort((a, b) => a.f.slot - b.f.slot);
    const off = (here.indexOf(p) - (here.length - 1) / 2) * 16;
    return [n.x + off, n.y - 8];
  }

  // Put a player's mon on the map once there is something to show (their first message) and their sprites are in.
  spawn(p) {
    const look = lookOf(p.f);
    if (p.mon || p.gone || !p.shown || !ensureSpecies(this, look)) return;
    p.mon = new Mon(this, 0, 0, { team: 'p', species: look });
    [p.mon.x, p.mon.y] = this.home(p);
    const tint = this.tint(p);
    p.tag = this.add.image(0, 0, 'tag').setTint(tint).setDepth(9003);
    p.name = this.add.bitmapText(0, 0, 'pmd', p.f.name || SPECIES[p.f.species].name).setOrigin(0.5, 1).setTint(tint).setDepth(9003);
    p.ready = this.add.image(0, 0, 'art-icons', 'btnA').setDepth(9003).setVisible(false);
    if (!p.me) {
      // where to look when they are off screen: the same arrow and name, pinned to the edge of the view
      p.edgeTag = text(this, 0, 0, '', tint).setVisible(false);
      p.edgeTag.setText(p.name.text).setOrigin(0.5, 1);
      p.edgeArrow = this.add.image(0, 0, 'tag').setTint(tint).setScrollFactor(0).setDepth(9400).setVisible(false);
    }
  }

  retire(p) {
    for (const o of [p.mon, p.tag, p.name, p.ready, p.edgeTag, p.edgeArrow]) o?.destroy();
    p.mon = p.tag = p.name = p.ready = p.edgeTag = p.edgeArrow = null;
  }

  // ---- what the other players say ----
  hear(msg) {
    const d = msg.d, p = this.players.find((o) => !o.me && o.f.owner === msg.from);
    if (d?.k !== 'wm' || !p || p.locked || p.gone || !ARENAS.includes(d.n)) return;
    p.node = p.shown = d.n;
    p.locked = !!d.l;
    this.spawn(p);
  }

  // A player who left before the battle: their avatar goes, and so does their say in the draw unless they had locked in.
  farewell(id) {
    const p = this.players.find((o) => !o.me && o.f.owner === id);
    if (p) { p.gone = true; this.retire(p); }
    if (this.battle.fighters.some((f) => f.owner === id)) this.gone.push(id);
  }

  shareNow() {
    this.sinceShare = 0;
    if (this.online) net.send('b', { d: { k: 'wm', n: this.me.node, l: this.me.locked ? 1 : 0 } });
  }

  // ---- choosing ----
  // Move the pick to the closest stage in a direction.
  step(dx, dy) {
    if (this.phase !== 'pick') return;
    const cur = this.byId[this.me.node];
    let best = null, score = Infinity;
    for (const n of this.nodes) {
      const vx = n.x - cur.x, vy = n.y - cur.y, along = vx * dx + vy * dy, d = Math.hypot(vx, vy);
      if (n === cur || along < d * 0.45) continue;
      const s = d / (along / d);
      if (s < score) { score = s; best = n; }
    }
    if (best) this.select(best.id);
  }

  select(id) {
    if (this.phase !== 'pick') return;
    this.me.node = this.me.shown = id;
    this.shareNow();
  }

  // Click a stage to pick it, click it again to lock in.
  click(ptr) {
    if (this.phase !== 'pick' || wipe.busy) return;
    ptr.updateWorldPoint(this.cameras.main);
    const [d, n] = this.nodes.map((o) => [Math.hypot(o.x - ptr.worldX, o.y - ptr.worldY), o]).sort((a, b) => a[0] - b[0])[0];
    if (d > 16) return;
    if (n.id === this.me.node) this.lock();
    else this.select(n.id);
  }

  lock() {
    if (this.phase !== 'pick') return;
    this.phase = 'wait';
    this.me.locked = true;
    this.shareNow();
    this.showHints();
  }

  showHints() {
    this.hints.set(this.phase === 'pick'
      ? [
        { icon: 'dpad', key: 'WASD', label: 'Pick a stage' },
        { icon: 'btnA', key: 'Enter', label: 'Lock in', action: 'confirm' },
        { icon: 'btnB', key: 'Esc', label: 'Back', action: 'cancel' },
      ]
      : [{ label: this.phase === 'wait' ? 'Locked in' : 'Drawing the stage' }, ...(this.phase === 'wait' ? [{ icon: 'btnB', key: 'Esc', label: 'Back', action: 'cancel' }] : [])]);
  }

  // Back out to the dojo basement. Online, the others are told you left (and their copies of your mon drop).
  back() {
    if (this.leaving || this.phase === 'land') return;
    this.leaving = true;
    if (this.online) net.send('battle.over');
    this.leave('hub', { area: 'basement', entry: 'pillar' });
  }

  leave(key, data) {
    if (wipe.busy) return void this.time.delayedCall(100, () => this.leave(key, data));
    go(this, key, data);
  }

  // ---- the draw ----
  // Everyone present has locked in: the stage is drawn from the distinct picks (a leaver's pick counts if it was
  // locked before they left, which every client saw in the same order).
  draw() {
    this.phase = 'draw';
    this.showHints();
    const options = [...new Set(this.players.filter((p) => p.locked).map((p) => p.node))].sort();
    const rand = seeded(this.battle.seed + 1);
    const win = options[Math.floor(rand() * options.length)];
    const n = options.length;
    if (n === 1) return this.time.delayedCall(450, () => this.land(win));

    // the spotlight hops from pick to pick, slowing down, and ends on the stage that was drawn
    const start = Math.floor(rand() * n), hops = 14 + ((((options.indexOf(win) - start - 14) % n) + n) % n);
    let k = 0;
    this.spot = options[start];
    const hop = () => {
      this.spot = options[(start + ++k) % n];
      if (k >= hops) this.time.delayedCall(500, () => this.land(win));
      else this.time.delayedCall(70 + 330 * (k / hops) ** 2, hop);
    };
    this.time.delayedCall(350, hop);
  }

  // Everyone gathers on the stage that was drawn, then the battle starts there.
  land(win) {
    this.phase = 'land';
    this.spot = win;
    for (const p of this.players) if (!p.gone) p.shown = win;
    session.lastMap = win;
    saveSession();
    this.time.delayedCall(1500, () => {
      this.leaving = true;
      this.leave('battle', { battle: { ...this.battle, map: win }, gone: this.gone });
    });
  }

  // ---- every frame ----
  update(_, ms) {
    const dt = Math.min(ms, 50) / 1000;
    if (this.phase === 'pick' && (this.left -= dt) <= 0) this.lock();

    this.sinceShare += ms;
    if (this.sinceShare >= SHARE_MS) this.shareNow();
    if (this.phase === 'wait' && this.players.every((p) => p.gone || p.locked)) this.draw();

    for (const p of this.players) {
      this.spawn(p);
      if (p.mon) this.animate(p, dt);
    }
    this.updateNodes();
    this.updatePlate();
    this.follow();
  }

  // A mon glides to where it belongs, walking while it does.
  animate(p, dt) {
    const m = p.mon, [tx, ty] = this.home(p), dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy);
    if (d > 0.5) {
      const s = Math.min(d, GLIDE * dt);
      m.x += (dx / d) * s;
      m.y += (dy / d) * s;
      m.dir = dirFromVec(dx, dy);
      if (m.state !== 'walk' && m.species.anims.Walk) { m.state = 'walk'; m.setAnim('Walk', 'loop'); }
    } else {
      m.x = tx; m.y = ty;
      if (m.state === 'walk') { m.toIdle(); m.dir = 0; }
    }
    m.update(dt);

    const x = Math.round(m.x), y = Math.round(m.y);
    p.tag.setPosition(x, y - 30);
    p.name.setPosition(x, y - 33);
    p.ready.setPosition(x + (p.name.width >> 1) + 8, y - 39);
    // someone off screen shows as their arrow and name at the nearest edge of the view instead
    const v = this.cameras.main.worldView;
    const inView = p.me || (x >= v.x + 8 && x <= v.right - 8 && y - 36 >= v.y && y <= v.bottom - BAR_H);
    for (const o of [p.tag, p.name]) o.setVisible(inView);
    p.ready.setVisible(inView && p.locked);
    if (!p.me) this.pinToEdge(p, inView, x, y - 20);
  }

  pinToEdge(p, inView, x, y) {
    p.edgeTag.setVisible(!inView);
    p.edgeArrow.setVisible(!inView);
    if (inView) return;
    const v = this.cameras.main.worldView;
    const sx = Phaser.Math.Clamp(x - v.x, 16, VIEW_W - 16), sy = Phaser.Math.Clamp(y - v.y, 30, VIEW_H - BAR_H - 6);
    p.edgeArrow.setPosition(sx, sy).setRotation(Math.atan2(y - v.y - sy, x - v.x - sx) - Math.PI / 2);
    p.edgeTag.setPosition(sx, sy - 5);
  }

  // The stages somebody stands on, or the one in the spotlight, are drawn selected.
  updateNodes() {
    const lit = this.spot ? [this.spot] : this.players.filter((p) => !p.gone && p.shown).map((p) => p.shown);
    for (const n of this.nodes) n.img.setTexture(lit.includes(n.id) ? 'nodeSel' : 'node');
    const id = this.spot ?? this.me.node;
    if (id === this.shownLabel) return;
    this.shownLabel = id;
    const n = this.byId[id];
    this.label.setTexture(labelTexture(this, n.name));
    const lw = this.label.width / 2;
    this.label.setPosition(Phaser.Math.Clamp(n.x, lw + 2, MAP_W - 2 - lw), n.y > 290 ? n.y - 30 : n.y + 13);
  }

  updatePlate() {
    const present = this.players.filter((p) => !p.gone), locked = present.filter((p) => p.locked).length;
    const note = this.phase === 'pick' ? `Pick a stage  ${Math.ceil(this.left)}`
      : this.phase === 'wait' ? (present.length > 1 ? `Waiting for the others ${locked}/${present.length}` : 'Locked in')
        : this.phase === 'draw' ? 'Drawing the stage...' : MAPS[this.spot].name;
    if (note !== this.note) this.plateText.setText(this.note = note);
  }

  // The camera follows your own mon, then the spotlight.
  follow() {
    if (this.spot) {
      const n = this.byId[this.spot];
      this.focus.setPosition(n.x, n.y - 8);
    } else if (this.me.mon) this.focus.setPosition(this.me.mon.x, this.me.mon.y);
  }
}
