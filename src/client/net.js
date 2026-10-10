// Online versus is not built yet. This is the shape the rest of the client is written against, so the mode can be
// switched on by filling these in (and setting MODES.online.open) without touching the screens.
//
// Intended flow: the pillar menu calls NetSession.match(); both clients get the same battle config from makeBattle()
// (modes.js) with their own fighter marked 'local' and the other 'remote'; during the fight each client sends its
// inputs every frame and feeds what arrives to the RemoteController of the other slot.
export class NetSession {
  static get available() { return false; }

  // Resolves with { session, battle } once two players are paired.
  static async match(_me) { throw new Error('Online versus is not available yet'); }

  constructor() { this.handlers = {}; }
  on(event, fn) { (this.handlers[event] ??= []).push(fn); return this; } // 'input' (slot, input), 'leave'
  emit(event, ...args) { for (const fn of this.handlers[event] ?? []) fn(...args); }

  send(_input) { /* TODO(online mode) */ }
  close() { this.handlers = {}; }
}
