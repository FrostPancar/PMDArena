import { WebSocketServer } from 'ws';

// The online side of the player client: parties (you, plus a friend who joined with your room code), matchmaking and
// a relay for everything the clients tell each other. It knows nothing about the game itself — the clients simulate
// their own fighters and this passes their messages along — so it never needs changing when moves or stages do.
//
// Messages are JSON objects with a type in `t`.
//   client -> server                                  server -> client
//   profile { species, moves, form, level,             welcome { id }
//             name, flag, face }
//   party.open / party.close / party.leave             party { code, open, leader, members: [{ id, ...profile }] }
//   party.join { code }                                error { msg }
//   hub { d }            (to the rest of the party)    hub { from, d }
//   queue { mode: '1v1' | '2v2', cpu }                 queued { mode } / queue.cancelled
//   queue.cancel                                       match { battle }
//   start { mode: 'duel' | 'cpu', cpus }               go
//   battle.ready                                       b { from, d }
//   b { d }              (to the rest of the match)    left { id }
//   battle.over
// A battle is { id, mode, seed, fighters: [{ slot, team, kind: 'human' | 'cpu', owner, species, moves, form, name... }] }.
// `owner` is the client that simulates the fighter: a human's own client, or for a CPU the client that brought it.

const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const MAX_PARTY = 2;

export function createRelay() {
  const clients = new Map();
  const codes = new Map(); // room code -> party
  const queues = { '1v1': [], '2v2': [] }; // waiting { party, team }
  let nextId = 1;

  const send = (c, msg) => { if (c.ws.readyState === 1) c.ws.send(JSON.stringify(msg)); };
  const members = (party) => party.members.map((id) => clients.get(id)).filter(Boolean);

  const tellParty = (party) => {
    const msg = {
      t: 'party', code: party.code, open: party.open, leader: party.leader,
      members: members(party).map((m) => ({ id: m.id, ...m.profile })),
    };
    for (const m of members(party)) send(m, msg);
  };

  const soloParty = (c) => { c.party = { leader: c.id, members: [c.id], code: null, open: false }; };

  const closeRoom = (party) => {
    if (party.code) codes.delete(party.code);
    party.code = null;
    party.open = false;
  };

  const dequeue = (party, tell = false) => {
    for (const q of Object.values(queues)) {
      const i = q.findIndex((e) => e.party === party);
      if (i < 0) continue;
      q.splice(i, 1);
      if (tell) for (const m of members(party)) send(m, { t: 'queue.cancelled' });
    }
  };

  // Take a client out of its party; whoever stays keeps the party and leads it.
  const leaveParty = (c) => {
    const party = c.party;
    dequeue(party, true);
    party.members = party.members.filter((id) => id !== c.id);
    if (party.members.length) {
      party.leader = party.members[0];
      tellParty(party);
    } else closeRoom(party);
  };

  const leaveMatch = (c, tell) => {
    const match = c.match;
    if (!match) return;
    c.match = null;
    match.clients.delete(c);
    match.ready.delete(c);
    if (tell) for (const o of match.clients) send(o, { t: 'left', id: c.id });
    checkReady(match); // the others may have been waiting on the one who left
  };

  const checkReady = (match) => {
    if (match.started || !match.clients.size || ![...match.clients].every((o) => match.ready.has(o))) return;
    match.started = true;
    for (const o of match.clients) send(o, { t: 'go' });
  };

  const clean = (s, max) => (typeof s === 'string' ? s.slice(0, max) : '');
  const count = (n, max) => (Number.isInteger(n) && n >= 0 && n <= max ? n : 0);
  // what a client says about its player or a CPU it brings: passed on as given, trimmed to sane sizes
  const cleanSpec = (p) => ({
    species: clean(p?.species, 24),
    moves: Array.isArray(p?.moves) ? p.moves.slice(0, 4).map((m) => clean(m, 24)).filter(Boolean) : [],
    form: clean(p?.form, 24), level: count(p?.level, 99),
    name: clean(p?.name, 12), flag: count(p?.flag, 99), face: clean(p?.face, 24),
  });
  const usable = (spec) => spec.species && spec.moves.length > 0;
  const human = (c) => ({ kind: 'human', owner: c.id, ...c.profile });
  const cpu = (spec, owner) => ({ kind: 'cpu', owner, ...cleanSpec(spec) });

  // teams: two arrays of fighter specs. Everyone who owns a fighter is put in the match.
  const startMatch = (mode, teams) => {
    const fighters = teams.flatMap((team, t) => team.map((f) => ({ ...f, team: t }))).map((f, slot) => ({ slot, ...f }));
    const match = { clients: new Set(), ready: new Set(), started: false };
    for (const f of fighters) {
      const c = clients.get(f.owner);
      if (c) match.clients.add(c);
    }
    const battle = { id: nextId++, mode, seed: (Math.random() * 0x7fffffff) | 0, fighters };
    for (const c of match.clients) {
      leaveMatch(c, true);
      c.match = match;
      send(c, { t: 'match', battle });
    }
  };

  const handlers = {
    profile(c, msg) {
      c.profile = cleanSpec(msg);
      tellParty(c.party);
    },

    'party.open'(c) {
      const party = c.party;
      if (party.leader !== c.id || party.members.length >= MAX_PARTY) return send(c, { t: 'error', msg: 'Your room is full.' });
      if (!party.code) {
        do party.code = Array.from({ length: 4 }, () => CODE_LETTERS[(Math.random() * CODE_LETTERS.length) | 0]).join(''); while (codes.has(party.code));
        codes.set(party.code, party);
      }
      party.open = true;
      tellParty(party);
    },

    'party.close'(c) {
      if (c.party.leader !== c.id) return;
      closeRoom(c.party);
      tellParty(c.party);
    },

    'party.join'(c, msg) {
      const party = codes.get(clean(msg.code, 4).toUpperCase());
      if (!party || !party.open || party === c.party) return send(c, { t: 'error', msg: 'No open room has that code.' });
      if (party.members.length >= MAX_PARTY) return send(c, { t: 'error', msg: 'That room is full.' });
      leaveParty(c);
      party.members.push(c.id);
      c.party = party;
      closeRoom(party); // the code has done its job
      dequeue(party, true);
      tellParty(party);
    },

    'party.leave'(c) {
      if (c.party.members.length < 2) return;
      leaveParty(c);
      soloParty(c);
      tellParty(c.party);
    },

    hub(c, msg) {
      for (const m of members(c.party)) if (m !== c) send(m, { t: 'hub', from: c.id, d: msg.d });
    },

    // Wait for another party that wants the same kind of fight.
    queue(c, msg) {
      const party = c.party, mode = msg.mode, q = queues[mode];
      if (!q || party.leader !== c.id || c.match) return;
      const humans = members(party).map(human);
      let team = humans;
      if (mode === '1v1' && humans.length !== 1) return send(c, { t: 'error', msg: 'A 1v1 against a stranger is for one player.' });
      if (mode === '2v2' && humans.length === 1) team = [humans[0], cpu(msg.cpu, c.id)];
      if (!team.every(usable)) return send(c, { t: 'error', msg: 'Everyone needs a Pokémon and moves first.' });
      dequeue(party);
      const other = q.shift();
      if (other) return startMatch(mode, [other.team, team]);
      q.push({ party, team });
      for (const m of members(party)) send(m, { t: 'queued', mode });
    },

    'queue.cancel'(c) {
      if (c.party.leader === c.id) dequeue(c.party, true);
    },

    // Fights that need no stranger: the two friends against each other, or together against two CPUs.
    start(c, msg) {
      const party = c.party, humans = members(party).map(human);
      if (party.leader !== c.id || humans.length !== 2 || c.match) return;
      dequeue(party, true);
      const cpus = (Array.isArray(msg.cpus) ? msg.cpus : []).slice(0, 2).map((s) => cpu(s, c.id));
      if (msg.mode === 'duel' && humans.every(usable)) startMatch('1v1', [[humans[0]], [humans[1]]]);
      else if (msg.mode === 'cpu' && cpus.length === 2 && [...humans, ...cpus].every(usable)) startMatch('2v2', [humans, cpus]);
      else send(c, { t: 'error', msg: 'Everyone needs a Pokémon and moves first.' });
    },

    'battle.ready'(c) {
      const match = c.match;
      if (!match) return;
      match.ready.add(c);
      checkReady(match);
    },

    b(c, msg) {
      if (c.match) for (const o of c.match.clients) if (o !== c) send(o, { t: 'b', from: c.id, d: msg.d });
    },

    // sent when a fight ends and when a player gives up; the others' copies of the leaver's fighters drop
    'battle.over'(c) { leaveMatch(c, true); },
  };

  return {
    connect(ws) {
      const c = { id: `p${nextId++}`, ws, profile: cleanSpec({}), party: null, match: null, alive: true };
      clients.set(c.id, c);
      soloParty(c);
      send(c, { t: 'welcome', id: c.id });
      tellParty(c.party);
      ws.on('pong', () => { c.alive = true; });
      ws.on('message', (raw) => {
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }
        if (msg && Object.hasOwn(handlers, msg.t)) handlers[msg.t](c, msg);
      });
      ws.on('close', () => {
        clients.delete(c.id);
        leaveMatch(c, true);
        leaveParty(c);
      });
      ws.on('error', () => ws.terminate());
    },
    // Drop sockets that stopped answering.
    sweep() {
      for (const c of clients.values()) {
        if (!c.alive) { c.ws.terminate(); continue; }
        c.alive = false;
        c.ws.ping();
      }
    },
    get size() { return clients.size; },
  };
}

// Serve the relay on `path` of an existing http server (the Vite dev server, or server/index.js in production).
export function attachRelay(httpServer, path = '/net') {
  const relay = createRelay();
  const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });
  httpServer.on('upgrade', (req, socket, head) => {
    // other upgrades on this server (Vite's hot reload socket) are left alone
    if (new URL(req.url, 'http://localhost').pathname !== path) return;
    wss.handleUpgrade(req, socket, head, (ws) => relay.connect(ws));
  });
  const timer = setInterval(() => relay.sweep(), 30000);
  httpServer.on('close', () => clearInterval(timer));
  return relay;
}
