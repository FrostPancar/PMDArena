import { wipe } from './transition.js';
import { touch, attach } from './touch.js';
import { sfx } from './sfx.js';

const STEPS = new Set(['up', 'down', 'left', 'right']);

// Menus and the dojo are driven by pad-style actions rather than raw keys, so the touch pad (touch.js) feeds the same handlers.
// The on-screen button icons stand for these: d-pad = up / down / left / right, A = confirm, B = cancel, START = menu.
export const BINDINGS = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  confirm: ['Enter', 'Space', 'KeyE'], cancel: ['Escape', 'Backspace'], menu: ['Tab', 'KeyM'],
};
const ACTION_OF = {};
for (const [action, codes] of Object.entries(BINDINGS)) for (const code of codes) ACTION_OF[code] = action;
const REPEATS = new Set(['up', 'down', 'left', 'right']);

// Phaser can hand a scene the same key events again when a key goes down and up within one frame.
// Each keydown listener filters through its own guard: guard(e) is false for an event it has already seen
// (a replayed event is never newer than the last one seen for its key).
export const keyGuard = () => {
  const seen = {};
  return (e) => {
    if (e.timeStamp <= (seen[e.code] ?? -1)) return false;
    seen[e.code] = e.timeStamp;
    return true;
  };
};

// One per scene. Whatever handler was pushed last gets the actions: { up(), down(), left(), right(), confirm(), cancel(), menu() }.
// A handler that takes typing also has type(letter) and erase(); while it is on top the letter keys spell instead of steer.
// One that is walked around with (it reads dir()) says so with steer: true, which is what puts the d-pad on a touch screen.
export class Actions {
  constructor(scene) {
    this.scene = scene;
    this.stack = [];
    const kb = scene.input.keyboard;
    kb.addCapture('SPACE,UP,DOWN,LEFT,RIGHT,TAB,BACKSPACE');
    const fresh = keyGuard();
    kb.on('keydown', (e) => {
      const top = this.top;
      if (top?.type && (/^Key[A-Z]$/.test(e.code) || e.code === 'Backspace')) {
        if (fresh(e)) this.spell(e.code === 'Backspace' ? null : e.code[3]);
        return;
      }
      const action = ACTION_OF[e.code];
      if (action && fresh(e) && (!e.repeat || REPEATS.has(action))) this.fire(action);
    });
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
    attach(this);
  }

  push(handler) { this.stack.push(handler); return handler; }
  pop(handler) {
    const i = this.stack.lastIndexOf(handler);
    if (i >= 0) this.stack.splice(i, 1);
  }
  get top() { return this.stack[this.stack.length - 1]; }

  // Also called by on-screen buttons.
  fire(action) {
    if (wipe.busy) return;
    const top = this.top;
    // stepping through any menu ticks (walking about is `steer`, and has no steps)
    if (STEPS.has(action) && top?.[action] && !top.steer) sfx.play('ui_move');
    top?.[action]?.();
  }

  // A letter for the handler that takes typing, or null to rub the last one out. Also called by the on-screen letters.
  spell(ch) {
    const top = this.top;
    if (wipe.busy || !top?.type) return;
    if (ch) top.type(ch); else top.erase?.();
  }

  // Held direction, for walking: the keys, or the touch pad.
  dir() {
    const k = this.keys;
    const x = (k.D.isDown || k.RIGHT.isDown) - (k.A.isDown || k.LEFT.isDown), y = (k.S.isDown || k.DOWN.isDown) - (k.W.isDown || k.UP.isDown);
    return x || y ? [x, y] : touch.stick;
  }
}
