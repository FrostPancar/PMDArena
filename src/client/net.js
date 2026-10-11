// The client's line to the relay (server/relay.js): who is in your party, matchmaking, and the messages fighters
// send each other during an online battle. One connection for the whole session; scenes listen with net.on().
// With no relay to reach, everything offline (CPU fights, a CPU partner) still works and `net.online` is false.
const RELAY_URL = import.meta.env.VITE_NET_URL ?? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/net`;
const RETRY_MS = 3000;

const handlers = {};
let ws = null;
let profile = null;

export const net = {
  id: null,
  online: false,
  party: { code: null, open: false, leader: null, members: [] },

  connect() {
    if (ws) return;
    try { ws = new WebSocket(RELAY_URL); } catch { ws = null; return; }
    ws.onopen = () => {
      net.online = true;
      if (profile) net.send('profile', profile);
      emit('status', true);
    };
    ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (msg.t === 'welcome') net.id = msg.id;
      else if (msg.t === 'party') net.party = msg;
      emit(msg.t, msg);
    };
    ws.onclose = () => {
      const was = net.online;
      ws = null;
      net.online = false;
      net.id = null;
      net.party = { code: null, open: false, leader: null, members: [] };
      if (was) { emit('party', net.party); emit('status', false); }
      setTimeout(() => net.connect(), RETRY_MS);
    };
    ws.onerror = () => {};
  },

  send(t, data) {
    if (ws?.readyState === 1) ws.send(JSON.stringify({ t, ...data }));
  },

  // Who you are to other players (session.publicProfile()); sent again whenever the connection comes back.
  setProfile(next) {
    profile = next;
    net.send('profile', profile);
  },

  // Listen for a message type (or 'status' for the connection itself). Returns the function that stops listening.
  on(type, fn) {
    (handlers[type] ??= new Set()).add(fn);
    return () => handlers[type].delete(fn);
  },

  // The next message of any of these types, or null if none comes within `ms`.
  next(types, ms = 4000) {
    return new Promise((resolve) => {
      const done = (msg) => { clearTimeout(timer); offs.forEach((off) => off()); resolve(msg); };
      const offs = types.map((t) => net.on(t, done));
      const timer = setTimeout(() => done(null), ms);
    });
  },

  // The other human in your party, if a friend has joined (or you joined theirs).
  get friend() { return net.party.members.find((m) => m.id !== net.id) ?? null; },
  get leading() { return !net.friend || net.party.leader === net.id; },
};

function emit(type, msg) {
  for (const fn of [...(handlers[type] ?? [])]) fn(msg);
}
