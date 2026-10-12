import Phaser from 'phaser';
import { VIEW_W } from '../../scene.js';
import { loadSpecies, ensureSpecies } from '../../sprites.js';
import { Mon } from '../../mon.js';
import { PLACE } from '../art.js';
import { Actions } from '../input.js';
import { go, wipe } from '../transition.js';
import { session, formOf, levelOf, hasSave, keepSave, newGame } from '../session.js';
import { SPECIES } from '../../sprites.js';
import { fetchStages, stagesNote } from '../stages.js';
import { touch } from '../touch.js';
import { INK, text, icon, panel, choose } from '../ui.js';
import { VERSION } from '../../version.js';
import { VIEW_H } from '../../scene.js';

export const GAME_TITLE = 'PMD', GAME_TAGLINE = 'Dojo Battles';

// Start screen: the outside of Sharpedo Bluff, with the sea and the flag moving. On a first visit any confirm leads
// into the dream (choose a Pokémon). With a game saved on this device it offers to carry on from the room in the
// bluff, or to start over (the old save is set aside, not erased).
export class Title extends Phaser.Scene {
  constructor() { super('title'); }

  preload() { loadSpecies(this, [formOf()]); }

  create() {
    ensureSpecies(this, formOf());
    this.walkable = () => true; // Mon asks its scene where it may stand
    this.cameras.main.setBounds(0, 0, 457, 304).setRoundPixels(true).setScroll(0, 0);
    this.add.image(0, 0, 'bluff').setOrigin(0);
    for (const key of ['bluff-sea', 'bluff-flag']) this.add.sprite(PLACE[key].x, PLACE[key].y, key).setOrigin(0).play(key);
    // whoever was played last waits on the cliff
    this.mon = new Mon(this, 212, 178, { team: 'p', species: formOf() });

    text(this, 98, 8, GAME_TITLE, INK.gold).setOrigin(0.5, 0).setScale(4);
    text(this, 98, 54, GAME_TAGLINE).setOrigin(0.5, 0).setScale(2);
    // the prompt sits over the sea, clear of the mon on the cliff
    const y = 150;
    panel(this, 98 - 54, y - 5, 108, 22, 'dim');
    this.tweens.add({ targets: [icon(this, 98 - 32, y + 6, 'start'), text(this, 98 - 16, y, touch.on ? 'Tap to start' : 'Press Enter')], alpha: 0.25, duration: 520, yoyo: true, repeat: -1 });
    this.note = text(this, VIEW_W - 5, 4, '', INK.dim).setOrigin(1, 0);
    text(this, VIEW_W - 5, VIEW_H - 14, VERSION, INK.dim).setOrigin(1, 0);

    if (hasSave) text(this, 98, y + 21, `${session.profile.name}  ${SPECIES[formOf()].name} Lv ${levelOf()}`, INK.sky).setOrigin(0.5, 0);
    const actions = new Actions(this);
    let asking = false;
    const start = async () => {
      if (wipe.busy || asking) return;
      keepSave();
      if (!hasSave) return go(this, 'dream', { pick: 'self', from: 'title' });
      asking = true;
      const menu = { x: 98 - 54, y: y - 46, w: 108 }; // above the prompt: under it there is no room
      const pick = await choose(this, actions, { ...menu, items: [{ label: 'Continue' }, { label: 'New game' }] });
      if (pick === 0) return go(this, 'hub', { area: 'base', entry: 'bedR' });
      if (pick === 1 && (await choose(this, actions, { ...menu, x: 98 - 66, y: y - 61, w: 132, title: 'Start over?', items: [{ label: 'No, keep playing' }, { label: 'Yes, new game' }] })) === 1) {
        newGame();
        return go(this, 'dream', { pick: 'self', from: 'title' });
      }
      this.time.delayedCall(60, () => { asking = false; }); // not on the press that closed the menu
    };
    actions.push({ confirm: start, menu: start });
    this.input.on('pointerdown', start);
    fetchStages(this.game);
  }

  // Mon reports its action frames to the scene; nothing fights here.
  actionFrame() {}
  actionDone() {}

  update(_, ms) {
    this.mon.update(Math.min(ms, 50) / 1000);
    const note = stagesNote(this.game);
    if (note !== this.note.text) this.note.setText(note);
  }
}
