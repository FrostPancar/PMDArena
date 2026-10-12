# Changelog

Each push to `main` gets a version. The current one is in `src/version.js` (shown on the title screen) and
`package.json`; the commit for it is tagged with the same name.

## alpha 0.5.1

**New moves (21):** Teleport, Heal Pulse, Dream Eater, Electroweb, Counter, Mud Shot, Blaze Kick, Flare Blitz,
Zap Cannon, Aurora Veil, Icy Wind, Spikes, Electro Ball, Venoshock, Knock Off, Bone Rush, Double-Edge,
Poison Powder, Solar Beam, Steel Wing, Iron Tail.

**Moves and progression**
- Moves are split into the ones a mon learns by itself (unlocked by level) and TMs. A random TM is found after
  every fight and can be used by any mon that can be taught it.
- 36 existing moves added to mons that learn them naturally.
- Sticky Web holds the first foe to step in for 2 s, then disappears.

**Balance and fixes**
- Chill can no longer be applied to a frozen foe.
- Detect now stuns the attacker it dodges.
- Fury Swipes no longer attacks twice on one use.
- Vine Whip pulls user and foe to each other (or the user to a wall).
- Double Team: no cast animation; the user's HP bar and arrow are hidden while copies are out; copies show the
  user's stat changes and status.
- Dragon Dance is held, like Swords Dance, and raises Attack and Speed.
- Consecutive-use bonus (Fury Cutter and the like) scales less; the combo label sits above the move name.
- Stone Edge no longer leaves a pillar. Rock Wrecker leaves one where it stops if it misses.
- CPUs no longer put Reflect on top of you.

**Interface**
- Notches on the small energy bar over the player.
- Mobile: Run and Jump sit above the moves at the top right.
- Mobile: every move shows an aim guide while its button is held; its colour is picked to stand out on each stage.
- Move menu: icons with labels for move kind, Speed instead of Range, a five-notch energy bar, TM discs tinted by
  type, NEW marks, padlocks from the item sheet.
- An evolution screen with congratulations after a fight that brings an evolution.

## Earlier

Unversioned pushes: rounds and the announcer, 3v3 crew battles, the CPU ladder and difficulty levels, the
five-notch energy bar, the mobile pad redesign, Continue / New game on the title.
