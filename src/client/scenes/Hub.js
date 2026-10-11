import Phaser from 'phaser';
import { VIEW_W, VIEW_H, WALK_SPEED } from '../../scene.js';
import { makeWalkable } from '../../maps.js';
import { SPECIES, loadSpecies, ensureSpecies } from '../../sprites.js';
import { Mon } from '../../mon.js';
import { PLACE, DOJO_BACKDROP } from '../art.js';
import { AREAS } from '../areas.js';
import { Actions } from '../input.js';
import { go, wipe } from '../transition.js';
import { session, saveSession, loadoutOf, formOf, awaitsChoice, publicProfile, LOADOUT_SIZE } from '../session.js';
import { net } from '../net.js';
import { cpuBattle, randomCpu, partnerSpec } from '../modes.js';
import { MoveMenu } from '../movemenu.js';
import { ProfileMenu } from '../profilemenu.js';
import { MapMenu } from '../practicemenu.js';
import { EvolveMenu } from '../evolvemenu.js';
import { INK, Hints, Dialog, choose, enterCode, banner, text, panel } from '../ui.js';

const PRESENCE_MS = 100;
const OFFLINE = 'The link to other players is down right now.';
const nameOf = (species) => SPECIES[species]?.name ?? 'Your partner';

// Walking around between battles: the room in Sharpedo Bluff (your bed, and a second bed for a partner), the dojo
// (pick moves on the training ring) and its basement (the pillar starts battles). A friend who joined your room, or
// whose room you joined, walks around the same places live; a CPU partner follows you instead.
export class Hub extends Phaser.Scene {
  constructor() { super('hub'); }

  init(data) {
    this.areaId = AREAS[data?.area] ? data.area : 'base';
    this.entry = data?.entry;
  }

  // Evolved looks are only loaded when someone here wears one.
  preload() { loadSpecies(this, [formOf(), ...(session.partner ? [formOf(session.partner)] : [])]); }

  create() {
    ensureSpecies(this, formOf());
    const a = this.area = AREAS[this.areaId], [w, h] = a.size, ox = this.ox = Math.max(0, (VIEW_W - w) >> 1);
    const cam = this.cameras.main;
    cam.setBackgroundColor(a.backdrop ?? DOJO_BACKDROP);
    this.walkable = makeWalkable({
      walk: a.walk.map((poly) => poly.map(([x, y]) => [x + ox, y])),
      block: a.block.map((b) => ({ ...b, x: b.x + ox })),
    });

    this.add.image(ox, 0, a.image).setOrigin(0);
    // looping pieces of the backdrop, each started on a different frame so the torches do not flicker in step
    a.anims.forEach((key, i) => this.add.sprite(ox + PLACE[key].x, PLACE[key].y, key).setOrigin(0).play({ key, startFrame: i % this.anims.get(key).frames.length }));
    for (const p of a.props) this.add.sprite(ox + PLACE[p.key].x, PLACE[p.key].y, p.key).setOrigin(0).setDepth(10 + p.base).play(p.key);

    const e = a.entries[this.entry] ?? Object.values(a.entries)[0];
    this.player = new Mon(this, ox + e.at[0], e.at[1], { team: 'p', species: formOf() });
    this.player.dir = e.dir;
    this.start = [this.player.x, this.player.y];

    cam.setBounds(0, 0, Math.max(VIEW_W, w), Math.max(VIEW_H, h + 16)).setRoundPixels(true); // the button bar covers the last 15px
    cam.startFollow(this.player.sprite, true, 0.2, 0.2);
    cam.centerOn(this.player.x, this.player.y);

    this.actions = new Actions(this);
    this.hints = new Hints(this, this.actions);
    this.walkKeys = this.actions.push({ steer: true, confirm: () => this.interact(), menu: () => this.openMoves() });
    this.mark = this.add.image(0, 0, 'art-icons', 'btnA').setDepth(9000).setVisible(false); // floats over the player near a spot
    this.bob = 0;
    this.near = undefined;
    this.menu = null;
    this.setNear(null);

    // the party: a CPU partner who follows, or a friend who walks on their own
    this.buddy = null;
    this.friend = null;
    this.friendTag = this.add.image(0, 0, 'tag').setTint(INK.sky).setDepth(9003).setVisible(false);
    this.friendName = this.add.bitmapText(0, 0, 'pmd', '').setOrigin(0.5, 1).setTint(INK.sky).setDepth(9003).setVisible(false);
    this.friendSeen = null; // the friend's last word on where they are
    this.sincePresence = 0;
    this.roomPlate = panel(this, VIEW_W - 77, 3, 74, 15, 'dim');
    this.roomText = text(this, VIEW_W - 40, 5, '', INK.gold).setOrigin(0.5, 0);
    net.setProfile(publicProfile());
    const offs = [
      net.on('party', () => this.syncParty()),
      net.on('status', () => this.syncParty()),
      net.on('hub', (msg) => { if (msg.from === net.friend?.id) this.friendSeen = msg.d; }),
      net.on('queued', () => { if (!net.leading) banner(this, 'Looking for a battle...'); }),
      net.on('error', (msg) => { if (this.free) this.tell(msg.msg); }),
    ];
    this.events.once('shutdown', () => offs.forEach((off) => off()));
    this.hadFriend = !!net.friend;
    this.syncParty();

    // a Pokémon the dream's question mark picked is named the first moment it can be seen
    const rolled = this.registry.get('reveal'), ally = this.registry.get('revealPartner');
    this.registry.remove('reveal');
    this.registry.remove('revealPartner');
    const who = SPECIES[rolled] ? `You are ${SPECIES[rolled].name}!` : SPECIES[ally] ? `Your partner is ${SPECIES[ally].name}!` : null;
    this.events.once('create', () => banner(this, who ?? a.name, who ? a.name : undefined));
    // the first time a species walks into the dojo, its moves are put in front of the player
    this.brief = this.areaId === 'dojo' && !session.briefed[session.species];
    // a branching mon (Eevee) that has grown ready asks which way to go
    this.evolve = awaitsChoice();
  }

  // Mon reports its action frames to the scene; nothing fights here.
  actionFrame() {}
  actionDone() {}

  get free() { return this.actions.top === this.walkKeys && !wipe.busy; }

  // ---- the party ----
  syncParty() {
    const friend = net.friend;
    if (!friend) this.friendSeen = null;
    if (friend && !this.hadFriend) banner(this, 'A friend joined your room!');
    if (!friend && this.hadFriend) banner(this, 'Your friend left.');
    this.hadFriend = !!friend;
    const label = net.party.open ? `Room ${net.party.code}` : friend ? 'With a friend' : '';
    this.roomText.setText(label);
    this.roomPlate.setVisible(!!label);
  }

  // The friend's mon, shown while they are in the same place as you.
  updateFriend(dt) {
    const friend = net.friend, seen = this.friendSeen;
    if (!friend || !seen || seen.a !== this.areaId || !SPECIES[friend.species]) {
      this.friend?.destroy();
      this.friend = null;
      this.friendName.setVisible(false);
      return this.friendTag.setVisible(false);
    }
    // the friend as they look now (their evolved form once its sprites are in)
    const look = SPECIES[friend.form]?.base === friend.species && ensureSpecies(this, friend.form) ? friend.form : friend.species;
    const m = this.friend ??= new Mon(this, this.ox + seen.x, seen.y, { team: 'p', species: look });
    if (m.species.id !== look) m.setSpecies(look);
    const k = Math.min(1, dt * 14);
    m.x += (this.ox + seen.x - m.x) * k;
    m.y += (seen.y - m.y) * k;
    m.dir = seen.d;
    if (seen.w && m.state !== 'walk') { m.state = 'walk'; m.setAnim('Walk', 'loop'); } else if (!seen.w && m.state === 'walk') m.toIdle();
    m.update(dt);
    this.friendTag.setVisible(true).setPosition(Math.round(m.x), Math.round(m.y) - 30);
    this.friendName.setVisible(true).setText(friend.name || '').setPosition(Math.round(m.x), Math.round(m.y) - 33);
  }

  // The CPU partner: waits on its bed until you get up, then tags along a few steps behind.
  updateBuddy(dt) {
    const p = this.player;
    if (net.friend || !session.partner) {
      this.buddy?.destroy();
      this.buddy = null;
      return;
    }
    const look = formOf(session.partner);
    if (!ensureSpecies(this, look)) return;
    if (!this.buddy) {
      // on its bed when you wake up or have just asked it along; otherwise a step behind you
      const bed = (this.entry === 'bedR' || this.entry === 'beside') && this.area.buddy;
      const behind = [[-16, 0], [16, 0], [0, 12], [0, 0]].map(([dx, dy]) => [p.x + dx, p.y + dy]).find((at) => this.walkable(...at));
      this.buddy = new Mon(this, ...(bed ? [this.ox + bed[0], bed[1]] : behind), { team: 'p', species: look });
      this.buddy.dir = bed ? 0 : p.dir;
      this.buddyWaits = !!bed;
    }
    const m = this.buddy;
    if (m.species.id !== look) m.setSpecies(look);
    if (this.buddyWaits && Math.hypot(p.x - this.start[0], p.y - this.start[1]) > 24) this.buddyWaits = false;
    const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy);
    if (this.buddyWaits || d < 24) m.walk(0, 0);
    else m.walk(dx, dy, WALK_SPEED * (d > 60 ? 1.25 : 0.95), dt);
    m.update(dt);
  }

  // ---- things to walk up to ----
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
    else if (id === 'partner') this.talkPartner();
    else if (id === 'dream') this.sleep();
    else if (id === 'machine') this.openProfile();
    else if (id === 'console') this.openPractice();
  }

  async tell(...lines) {
    const d = new Dialog(this, this.actions, this.hints);
    for (const line of lines) await d.say(line);
    d.close();
  }

  // A line of dialogue, then a list to choose from. options: [label, value, off]. Resolves with the value, or null.
  async ask(d, line, options) {
    await d.say(line);
    const h = 11 + options.length * 13, y = Math.max(4, VIEW_H - 15 - 44 - 6 - h);
    const i = await choose(this, this.actions, { x: VIEW_W - 152, y, w: 144, hints: this.hints, items: options.map(([label, , off]) => ({ label, off })) });
    return options[i]?.[1] ?? null;
  }

  openMoves() {
    if (this.menu) return;
    session.briefed[session.species] = true;
    saveSession();
    this.menu = new MoveMenu(this, this.actions, {
      species: session.species,
      onClose: () => { this.menu = null; net.setProfile(publicProfile()); this.showHints(); },
    });
    this.menu.onChange = () => this.showHints();
    this.showHints();
  }

  openEvolve() {
    if (this.menu) return;
    this.menu = new EvolveMenu(this, this.actions, {
      species: session.species,
      onClose: () => { this.menu = null; net.setProfile(publicProfile()); this.showHints(); },
    });
    this.showHints();
  }

  // The lab's console: pick a stage, then drop into its practice arena.
  openPractice() {
    if (this.menu) return;
    this.menu = new MapMenu(this, this.actions, {
      onPick: (id) => { this.menu = null; this.showHints(); go(this, 'practice', { map: id }); },
      onClose: () => { this.menu = null; this.showHints(); },
    });
    this.showHints();
  }

  // The lab's machine: the records room (name, portrait, flag, how each mon is coming along, battles won).
  openProfile() {
    if (this.menu) return;
    this.menu = new ProfileMenu(this, this.actions, {
      onClose: () => { this.menu = null; net.setProfile(publicProfile()); this.showHints(); },
    });
    this.menu.onChange = () => this.showHints();
    this.showHints();
  }

  // Your own bed: dream again to be someone else.
  async sleep() {
    const d = new Dialog(this, this.actions, this.hints);
    const pick = await this.ask(d, 'Your bed. Lie down and dream of being another Pokémon?', [['Dream', 'dream'], ['Stay up', null]]);
    d.close();
    if (pick) go(this, 'dream', { pick: 'self', from: 'base' });
  }

  // The other bed: who fights beside you. A CPU, a friend you invite with a room code, or a friend whose room you join.
  async talkPartner() {
    const d = new Dialog(this, this.actions, this.hints);
    const friend = net.friend, cpu = !friend && session.partner, off = !net.online;
    let pick;
    if (friend) {
      pick = await this.ask(d, `${nameOf(friend.species)} is here with you. You can head for the dojo together.`, [['Part ways', 'leave'], ['Never mind', null]]);
    } else if (net.party.open) {
      pick = await this.ask(d, `Your room is open. A friend can join from their own bluff with the code ${net.party.code}.`, [['Close the room', 'close'], ['Keep waiting', null]]);
    } else {
      pick = await this.ask(d, cpu ? `${nameOf(cpu)} is ready to fight beside you.` : 'An empty bed. Who should fight beside you?', [
        [cpu ? 'Choose another CPU' : 'Team up with a CPU', 'cpu'],
        ...(cpu ? [[`Send ${nameOf(cpu)} home`, 'dismiss']] : []),
        ['Invite a friend', 'open', off], ['Join a friend', 'join', off], ['Never mind', null],
      ]);
    }

    if (pick === 'cpu') { d.close(); return go(this, 'dream', { pick: 'partner', from: 'base' }); }
    if (pick === 'dismiss') { session.partner = null; saveSession(); }
    if (pick === 'leave') net.send('party.leave');
    if (pick === 'close') net.send('party.close');
    if ((pick === 'open' || pick === 'join') && off) await d.say(OFFLINE);
    else if (pick === 'open') {
      net.send('party.open');
      const reply = await net.next(['party', 'error']);
      await d.say(reply?.code ? `Your room is open! Tell your friend the code ${reply.code}. They join from the other bed in their own bluff.` : reply?.msg ?? OFFLINE);
    } else if (pick === 'join') {
      const code = await enterCode(this, this.actions, this.hints);
      if (code) {
        net.send('party.join', { code });
        const reply = await net.next(['party', 'error']);
        if (reply?.t === 'party' && net.friend) { d.close(); return go(this, 'hub', { area: 'base', entry: 'bedL' }); } // you wake on their spare bed
        await d.say(reply?.msg ?? OFFLINE);
      }
    }
    d.close();
  }

  // The pillar: what it offers depends on who is with you.
  async touchPillar() {
    const d = new Dialog(this, this.actions, this.hints);
    if (loadoutOf().length < LOADOUT_SIZE) {
      await d.say(`The pillar stays dim. You need ${LOADOUT_SIZE} moves ready before it will take you anywhere.`);
      d.close();
      return this.openMoves();
    }
    const friend = net.friend, cpu = friend ? null : partnerSpec(), off = !net.online;
    if (friend && !net.leading) {
      await d.say('The pillar answers to whoever opened the room. Your partner chooses the battle.');
      return d.close();
    }
    const options = friend
      ? [[`1v1 vs ${nameOf(friend.species)}`, 'duel'], ['2v2 vs CPU team', 'friends vs cpu'], ['2v2 vs random team', 'queue 2v2']]
      : [['1v1 vs CPU', 'cpu 1v1'], ['1v1 vs random player', 'queue 1v1', off], ...(cpu ? [['2v2 vs CPU team', 'cpu 2v2'], ['2v2 vs random team', 'queue 2v2', off]] : [])];
    const line = friend || cpu
      ? 'The pillar hums with a strange light. Where should it send you both?'
      : 'The pillar hums with a strange light. Where should it send you? (With a partner from the bluff it offers 2v2 as well.)';
    for (;;) {
      const pick = await this.ask(d, line, [...options, ['Not now', null]]);
      if (!pick) return d.close();
      if (pick.startsWith('cpu')) { d.close(); return go(this, 'draw', { battle: cpuBattle(pick.slice(4)) }); }
      if (!net.online) { await d.say(OFFLINE); continue; }
      // from here the relay answers with a match, which main.js turns into the stage draw
      if (pick === 'duel') net.send('start', { mode: 'duel' });
      else if (pick === 'friends vs cpu') net.send('start', { mode: 'cpu', cpus: [randomCpu(), randomCpu()] });
      else {
        net.send('queue', { mode: pick.slice(6), cpu });
        d.say(pick === 'queue 1v1' ? 'Looking for another player...' : 'Looking for another team...');
        await choose(this, this.actions, { x: VIEW_W - 152, y: VIEW_H - 15 - 44 - 6 - 24, w: 144, hints: this.hints, items: [{ label: 'Stop looking' }] });
        net.send('queue.cancel');
      }
      return d.close();
    }
  }

  update(_, ms) {
    const dt = Math.min(ms, 50) / 1000, p = this.player;
    const [vx, vy] = this.free ? this.actions.dir() : [0, 0];
    p.walk(vx, vy, WALK_SPEED, dt);
    p.update(dt);
    // an evolution just chosen (or reached) changes how the player looks
    const look = formOf();
    if (p.species.id !== look && p.free && ensureSpecies(this, look)) p.setSpecies(look);
    this.updateBuddy(dt);
    this.updateFriend(dt);
    this.menu?.update(dt);
    this.bob += dt;
    this.mark.setVisible(this.free && !!this.near).setPosition(Math.round(p.x), Math.round(p.y - 30 + Math.sin(this.bob * 6)));

    // tell a friend where you are
    this.sincePresence += ms;
    if (net.friend && this.sincePresence >= PRESENCE_MS) {
      this.sincePresence = 0;
      net.send('hub', { d: { a: this.areaId, x: Math.round(p.x - this.ox), y: Math.round(p.y), d: p.dir, w: p.state === 'walk' ? 1 : 0 } });
    }
    if (!this.free) return;

    if (this.evolve) { this.evolve = false; return this.openEvolve(); }
    if (this.brief) { this.brief = false; return this.openMoves(); }
    const lx = p.x - this.ox;
    const door = this.area.doors.find(({ rect: [x, y, w, h] }) => lx >= x && lx <= x + w && p.y >= y && p.y <= y + h);
    if (door) return go(this, 'hub', door.to);

    let best = null, bd = Infinity;
    for (const s of this.area.spots) {
      const d = Math.hypot(lx - s.at[0], p.y - s.at[1]);
      if (d <= s.r && d < bd) { best = s; bd = d; }
    }
    this.setNear(best);
  }
}
