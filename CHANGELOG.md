# Changelog

Each push to `main` gets a version. The current one is in `src/version.js` (shown on the title screen) and
`package.json`; the commit for it is tagged with the same name.

## alpha 0.5.8

- Tadpole Pond: the water can be walked on, and the side pools at the top are reached by a hop over the grass.
- Fury Swipes: the next swipe waits for the one before to finish its animation.
- Heavy moves leave their target unable to act for longer.
- Crew battles are listed as "Crew vs CPU", "Crew vs random player" (no "3v3").
- Test client: the effect viewer is published too, read only.

## alpha 0.5.7

**Streams, lobs and beams**
- Held streams (Water Gun, Bubble, Bubble Beam, Ember, Star Shoot, Powder Snow, Thunder Shock) no longer stagger, so
  they can't stun lock.
- Lobbed moves burst 50% wider and deal 75% damage up close, rising to 150% at full range.
- Aurora Beam is a short held stream of rings. Hypnosis is two of those rings back to back, at shorter range.
- Ice Beam's particles are diamonds.

**Costs and charges**
- Earthquake costs 2. Hurricane, Outrage and Uproar cost 4; Outrage and Uproar can't be reused while one is going.
- Area moves with no charged build-up come out at once; charged ones grow faster and wider. Earthquake is unchanged.
- Eruption and Hammer Arm charge faster.

**Hold moves**
- Jumping works during Surf, Ice Ball, Rollout and Gyro Ball.
- Brave Bird, Rollout, Ice Ball and Gyro Ball are armoured: damage still lands, knockback and interruption don't.
- Gyro Ball is a hold move like Ice Ball. Protect is held for energy and no longer slides.
- Earthquake and Magnitude reach a mon that is underground with Dig; nothing else does.

**Moves**
- Zap Cannon and Sleep Powder home in. Venoshock is purple.
- Fire Blast bursts twice where it ends.
- Circle Throw always throws behind the user, much further.
- Acrobatics springs off on a hit the way the stick or keys are held.
- Rain Dance powers up the side's water moves for 10 s.
- Bide and Counter: a hit taken during them gives the empowered next attack.
- Attack Order summons a 1 HP copy that uses Pin Missile and Stun Spore.
- Petal Blizzard sits higher and lingers. Roost charges with the Sleep animation.
- Hurricane and Kinesis levitate the target; no second lift for 2 s after landing.
- Gravity is a much larger grey zone that stops jumps.
- Future Sight and Waterfall hit a much bigger area.
- A mon that digs out of a burial can't be buried again for 2 s.

**Looks**
- Lock-On's reticle follows its target. Heals use Leech Seed's heal animation. Torment shows the red cross overhead.

## alpha 0.5.6

**Volleys and streams**
- Bullet Seed, Swift, Pin Missile, Razor Leaf and Magical Leaf fire a burst of shots one after another.
- Water Gun, Bubble, Bubble Beam, Ember, Thunder Shock, Star Shoot and Fury Swipes are held: they keep going while
  the button is down, for energy.
- New move: Powder Snow (a held stream; Alolan Vulpix).
- Icy Wind is replaced by Dazzling Gleam (Fairy, no slow).

## alpha 0.5.5

**Balance**
- Psychic is held for as long as there is energy; its field drifts after the aim.
- Rest heals 40 (was 60). Healing moves are limited to 5 uses a match.
- Energy refills twice as fast.
- Beams no longer stagger or break charges; they slow the target and hit twice as often for half the damage.

**Controls**
- Moves are used on release: holding the button or key aims with a guide. Held moves still start on the press.
- Mobile: teleport moves go the way the stick is pushed.
- B in the dojo opens a floor for trying the moveset out.

**Feel**
- A landed parry shakes the screen.

## alpha 0.5.4

- Fixed the Pokémon choosing screen showing empty boxes: every mon's standing sprite is loaded for its grid.

## alpha 0.5.3

**Loading** (for phones: the game ran out of memory while loading on iOS Safari)
- Move effects are loaded for the moves in the fight you enter, not all at the title screen.
- Mon sprites are loaded when a screen first shows that mon, not all at start-up.
- At the title the game now holds about 400 pictures instead of several thousand.

## alpha 0.5.2

**Game feel** (all visual only; switches in `FEEL`, `src/scene.js`)
- A shot that is cut or beaten freezes in a ring, splits in two and fades.
- Every hit flashes its target and throws a burst of lines; the screen shakes by how hard it was.
- Very heavy hits get a flash, a negative frame and a vignette.
- Beam clashes rumble while they last.
- The camera trails dashes and glides after teleports.

**Art**
- Icy Wind uses Blizzard's hit effect; Iron Tail uses Dragon Rush's in grey; Knock Off uses Dragon Claw's.
- Poison Powder is a cleaner purple; Spikes has no purple left.
- Beams have a soft glow (not Mud Shot).

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
