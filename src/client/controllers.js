// Who drives a fighter. The local player is driven by the Battle scene's own key and mouse bindings;
// every other fighter gets one of these, and the Battle scene calls update(dt) on it before the mons move each frame.
// A controller acts through the same scene calls the player's bindings use, so all fighters obey the same rules:
//   mon.walk(vx, vy, speed, dt, run)   scene.useMove(mon, target | null)   scene.parry(mon)
//   mon.jump(vx, vy, speed)            mon.act('Attack')                    scene.cancelMove(mon)

// Computer rival. Not written yet: the fighter stands still.
// The playground's wild rivals (Mon.think with ai: 'wild') are a starting point for the chase / attack / use-move loop.
export class CpuController {
  constructor(scene, mon, fighter) { Object.assign(this, { scene, mon, fighter }); }
  update(_dt) { /* TODO(cpu mode) */ }
}

// The other player in an online match. Not written yet.
// It will replay the inputs NetSession delivers for its slot (see net.js) through the calls listed above.
export class RemoteController {
  constructor(scene, mon, fighter) { Object.assign(this, { scene, mon, fighter, inbox: [] }); }
  receive(input) { this.inbox.push(input); }
  update(_dt) { this.inbox.length = 0; /* TODO(online mode) */ }
}

const KINDS = { cpu: CpuController, remote: RemoteController };
export const controllerFor = (scene, mon, fighter) => (KINDS[fighter.control] ? new KINDS[fighter.control](scene, mon, fighter) : null);
