# Online sync: where it stands and how to make it precise

## Short answer

Online play works for walking around, the original moves and basic attacks. The newer mechanics (beams and clashes, shot
ownership, grabs, held moves, timed mechanics) used to play out differently for the two players. Plan A below has been
built to close that and passed a first two-tab test, but has not been tried over a real connection. This file says why the drift happened, what is in
place, and what exact sync would still take.

## How it works today

Each client runs the whole fight but only decides things for the fighters it owns ("owner-authoritative"):

- **Snapshots, 20 a second:** each owner sends where its fighters are and their health, stamina, status and buffs.
  Everyone else shows those fighters as puppets (`RemoteController` in `src/client/controllers.js`).
- **Events, at once:** when a fighter starts charging, fires a move, parries or lands a basic hit, its owner says so and
  the other clients replay it on the puppet (`Battle.replay` in `src/client/scenes/Battle.js`).
- **Who decides a hit:** the defender. A replayed move hits your own fighter for real on your client; on everyone else's
  screen a hit on a puppet is only a guess ("would it connect?") so the attacker's side effects can play.
- **The relay** (`server/relay.js`) passes messages along and knows nothing about the game.

This is simple and forgiving of lag, and it favours the defender: you are only hit by what you saw.

## Why the new mechanics drift apart

| Problem | Example | Cause |
|---|---|---|
| The attacker guesses, the defender decides | Acrobatics chains on your screen but missed on theirs; a bite latches for one player only | The attacker's follow-up logic runs off its own guess, not the defender's verdict |
| Shots are simulated separately | A shot is reflected, caught, cut or cancelled in a clash on one screen and flies on on the other | Each client moves every shot itself from slightly different positions |
| Beam clashes | The knot sits in different places; one side wins on each screen | Both the push and the button presses were local |
| Randomness | Status chances, Magnitude's size, Metronome | Each client rolled its own dice |
| Timing | Things land a frame or two apart | The simulation ran at the display's frame rate and used wall-clock timers |
| State only the owner knows | Chill stacks, tethers, stuns shown wrongly on other screens | Not in the snapshot |

## What is scaffolded now

These are in the code and are the groundwork both ways forward need.

- **Fixed-step simulation** (`Play.update` → `Play.tick`, `STEP` in `src/scene.js`): the fight advances in steps of
  1/60 s whatever the frame rate. `tickN` counts them.
- **Seeded dice** (`scene.rand()`, `mon.roll()`): every random roll in a fight comes from one generator seeded with the
  battle's seed from the relay. No `Math.random()` is left in the simulation.
- **Simulation timers** (`scene.after(ms, fn)`): delayed hits, landings and heals run on the fight's own clock
  (`simMs`), not Phaser's. Use `after`, not `this.time.delayedCall`, for anything that affects the fight.
- **Held input and aim are shared:** each snapshot now carries whether a held move is still going and the point the
  fighter is aimed at (`Battle.inputOf`, read through `Play.holding` and `Play.aimOf`). Remote beams, flights, rolls,
  stances and flurries now last as long as their owner holds them and point where the owner aims, instead of running
  for a fixed guess.
- **The puppet's "would it connect?"** now uses the same gate as a real hit (`Mon.canBeHit`), so answer types (grab,
  heavy, sweep, curse) and Fly are respected in the attacker's guess.
- **More owner-only state in the snapshot:** chill stacks and stun.
- **Tick stamps:** every battle message carries the sender's tick (`tk`).
- **A shared timeline:** the relay stamps each relayed message with its clock (`ts`) and answers `ping` with `pong`;
  the client keeps a smoothed round trip (`net.rtt`) and its clock offset from the relay (`net.offset`).
- **A state checksum** (`scene.stateHash()`): one number for the positions, health, stamina, statuses and shots at a
  tick. Nothing compares it yet; it is the tool for detecting drift once clients are meant to match.

The relay changes only take effect once the relay itself is redeployed.

## Plan A, as built

Chosen and implemented. Played once by two clients in two tabs of one browser, so with almost no lag: a latching bite, a
perfect-parry reflect, a held beam and a beam clash all came out the same on both screens (the knot within 2 px).
Not yet tried over a real connection, in 2v2, or for the rest of the list below.

- **Hit verdicts** (`hv`): a hit on a fighter another client runs is only a guess here: the shot stops and that is all. When
  that fighter's client accepts the hit it says so, and only then does the attacker's client do what a landed hit does
  (`Play.onHit`): the latch, the drain's heal, the toss, the thread, the counter. Both sides now act on the same verdict.
- **Shot ids and one decider** (`sf`): every shot has the same id on every client (owner's slot and a count). Exactly one
  client decides each thing that can happen to a shot and tells the rest: the parrier's for a reflect, the slasher's for a
  cut, the catcher's for Psychic and Magnet Pull, the user's for Confusion, the wall owner's for a Light Screen, the
  beam's for shots it clears, the lower slot's for two shots clashing. A shot that seems to hit a remote fighter goes
  into limbo for a third of a second rather than vanishing, so a reflect that arrives late can still bring it back.
- **Beam clash from one side** (`cl`, `ct`): the client with the fighter in the lower slot runs the tug of war and sends
  the knot's position three times a tick-triple (20 a second) and the result; the other side's presses reach it as messages.
- **Snapshot:** chill stacks, stun, lock-on and torment are now included.
- **Stale snapshots:** a snapshot sent before a fighter's latest act (charge, fire, cancel) no longer poses the puppet back
  into what it was doing before; this used to kill remote beams as they started.
- **Lost shots come back:** if a reflect or catch arrives after this client has let the shot go, the shot is recreated
  from the message.

- **Fights of a match** (`ro`): a 1v1 or 2v2 is fights until one side has won two. One client says who took each fight
  (the one running the fighter in the lowest slot still present), so a double knock-out cannot be counted two ways; every
  client then runs the same few seconds (call, fade, everyone back at their starting spot, healed) on its own clock.
  Every battle message carries the fight it belongs to (`rn`) and one from another fight is dropped. Tried in two tabs:
  three fights, same score on both screens throughout.
- **Crew battles** (`cr`, `sw`): the crews are agreed on the crew screen before the stage draw (each client repeats its
  locked-in crew until everyone has everyone's). In the fight, the client that runs a fighter says when its next mon
  comes out. Tried against the CPU only; not yet between two clients.

Known soft spots that remain under plan A: Kinesis steering and Hurricane's pull bend shots on each client separately;
a chain dash (Acrobatics, U-turn) still acts on the attacker's guess for its own movement; in 2v2 a third client sees
verdict effects only through snapshots.

## Still in the way of exact sync

- **Two things still use wall-clock time for gameplay:** the ledge hop in `Battle.checkLedge` is a tween, and CPU
  fighters think once per frame rather than once per tick (`Battle.update` calls the controllers with the frame's time).
- **The simulation and the drawing are one thing:** moves create their images as they resolve, so the fight cannot be
  run twice, rewound or run on a server without a browser.
- **Inputs are read straight from the keyboard and mouse** inside the simulation rather than from a per-tick record.

## Two ways forward

### A. Harden the current model (days)

Keep owner-authoritative, and close the gaps one by one:

1. **Hit verdicts:** the defender's client broadcasts each hit it accepts (attacker, move, damage, effects). The
   attacker's follow-ups (chain dashes, U-turn, latch, drain, combo) wait for the verdict instead of guessing.
2. **Shots get ids and one owner at a time:** only the owner's client decides what happens to a shot; reflect, catch,
   cut and clash become events ("shot 12 now belongs to slot 1, heading x,y").
3. **Beam clash by one side:** the client of the lower slot runs the tug of war and sends the knot's position;
   presses are sent as events.
4. **Finish the snapshot:** tethers, torment, bond links, lock-on marks, flying/underground flags.

Result: both players agree on outcomes, with the usual online softness (the defender sees a hit a moment after the
attacker threw it). Good enough for friendly play; not frame-exact.

### B. Deterministic rollback (weeks)

What fighting games use. Clients send only inputs; every client runs the identical simulation; when a late input
arrives, the client rewinds a few ticks and replays. Outcomes are exact, and your own actions never wait on the network.

Needs, on top of the scaffold:

1. **Inputs as data:** one small record per fighter per tick (direction, buttons, aim point); the simulation reads
   only that. Remote and CPU fighters use the same path.
2. **Separate the fight from its pictures:** the simulation keeps plain data; a drawing layer follows it.
3. **Save and restore:** copy the whole fight state each tick and restore any of the last ~10.
4. **Input delay, prediction and rollback loop**, with `stateHash` compared every second to catch drift.
5. **Remove the last wall-clock gameplay** (ledge tween, per-frame CPU thinking).

Step 2 is the large one: `src/scene.js` builds its effects inline in about 60 places.

## Recommendation

Do **A** first. It makes the game playable online with the current moves in days, and steps A1 to A3 are not thrown
away by B (events and shot ids stay useful). Decide on **B** once you know whether competitive, frame-exact play is
a goal; the scaffold above is already the first third of it.

## How to test two players locally

The relay rides on the dev server. Open two tabs on the same dev port, give each a different profile name, and queue
both for a 1v1. `window.net` and `window.game` are exposed in dev; `net.rtt` shows the round trip and
`game.scene.getScene('battle').stateHash()` the checksum.
