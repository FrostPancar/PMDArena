# Changelog

Each push to `main` gets a version. The current one is in `src/version.js` (shown on the title screen) and
`package.json`; the commit for it is tagged with the same name.

## alpha 0.5.22

**Moves**
- Night Daze deals 25 damage (was 19) and slows everything it hits to 60% speed for 3 seconds.
- Stun Spore and Sleep Powder are point and click: the powder lands on the aimed spot up to 150 px away, instead of
  drifting out as a cloud. Gusts no longer blow them back.

## alpha 0.5.21

**Moves**
- Fury Swipes is a flurry like Close Combat's: held, rooted, each swipe harder than the last. About 65% of Close
  Combat's damage, and it does not lower its user's defence.
- Snarl lowers the target's attack by 40% for 2 seconds.
- Dig deals 20 damage (was 24).

**Looks and sound**
- The white sparks are gone from Aerial Ace, Giga Impact, Acrobatics and U-turn.
- U-turn plays the dash sound again as it springs back off a hit.
- The jump sound is louder.

## alpha 0.5.20

**Survivor**
- Each wave beaten gives back 30% of your health (was 20%).
- A wave of three hits for half damage, a wave of two for three quarters.
- Every tenth wave is a single legendary: 500 HP, level 4, its own four moves.
- The chest is left on the stage. Walk over it to open it: it vanishes and the TM slides up out of it. No wave comes
  until it is picked up.

**Menus**
- The pillar's first choice reads Singleplayer instead of Story.

## alpha 0.5.19

**Traps**
- Spikes, Stealth Rock and Toxic Spikes never land a critical hit. Spikes always bites with the crit spark and sound.
- Stealth Rock and Toxic Spikes cost three notches, Spikes two.
- Spikes thrown onto your own Spikes adds a layer instead: wider and harder, up to three, and good as new.

**Moves**
- Protect has no charge time.
- Incinerate is a short burst of flame out of the user, toward the aim.
- Jumping out of Ingrain pulls the roots up and jumps in the same press.
- Beam clash: the beams hold themselves once locked, so the buttons are free to mash. The lock lands with the
  heavy-hit screen beat, and a MASH button shows over your mon.

**Looks**
- Shadow Sneak's shadow runs from where the user sank to where it rises, at any angle.
- Electro Ball carries a Thunder Shock spark inside it. Petal Blizzard's petals sit at body height.
- Dazzling Gleam keeps its own colours and is smaller. Tri Attack and Aurora Veil charge with a burst of coloured rays.
- Bosses are smaller (1.15x, from 1.35x).

## alpha 0.5.18

**Modes**
- The pillar asks Story or Online first. Story: 1v1, Crew, Survivor, Boss Rush.
- Survivor: endless waves on a random stage (three mons at 25% HP, two at 50%, or one at 100%), the next a second
  after the last falls. The CPUs go up a level every two waves; every fifth wave a chest holds a TM; 20% of your
  health comes back per wave. EXP grows with waves beaten, to twice a usual fight at wave 15.
- Boss Rush: nine legendaries in a random order, each with 500 HP at level 4, bigger than life, on a stage of its
  own. One round a fight, 70% of the usual EXP, and a win sends you on to the next.

**Moves**
- Protect costs one notch and nothing more while held (up to 1.5 s); used again straight after itself it may fail,
  30% likelier each time.
- Your own shots through your Light Screen turn toward the nearest foe.
- Rain Dance halves Thunder's charge. Waterfall lands three falls in a triangle. Gravity shows grey circling orbs.

**Looks**
- Mons with a Strike animation of their own use it for close-range moves; Blaziken kicks, and slams for heavy moves.

## alpha 0.5.17

**New moves**
- Vice Grip (a grab), King's Shield (a guard that raises Attack when it is hit), Safeguard (8 s in which no status,
  stat drop or other ill effect from a foe takes hold) and Punishment (harder for every stat the foe has raised).

**Guards and blocks**
- Iron Defense: no charge time; the first hit taken while it is held sets off a blast all round, a little wider than
  Shock Wave. Bide is held the same way, and the hit that ends it doubles the next attack.
- A white flash shows over an attack that a shield, a doll or a held guard stops.

**Grabs**
- Bites, Draining Kiss, Drain Punch and Vice Grip land twice at half damage each, the foe held reeling between the
  two, then both mons are thrown apart.

**Crits and luck**
- Focus Energy: +25% critical chance for 8 s (and nothing else). Lucky Chant: Defense up and no critical hits on
  you for 8 s. Acupressure raises one stat at random. A spark shows over a critical hit.

**Moves**
- Teleport moves land where their guide is; on the pad, where the stick is pushed or the mon faces.
- Shadow Sneak: its own art for each direction, and it reaches less far.
- Flash Cannon is one flash down a line to the aimed spot. Rock Blast is a held stream; Will-O-Wisp a slow homing wisp.
- Ingrain lasts 10 s for 3 HP a second, and a jump ends it. Grass Knot buries. Wood Hammer hits harder.
- Sleep Talk uses one of the other moves brought to the fight, never Rest.
- Attract charges for longer; held streams start at once; Giga Impact shows one impact, at the end.
- New art: Cut, Fury Cutter, Bide, Taunt (with its own mark over a taunted mon), a flare on each Dragon Dance stack,
  smaller Earthquake rubble, a white ring round a snared mon.
- No aim guide while holding a move that is steered (Dig, Surf, Brave Bird...).

## alpha 0.5.16

- Close-range moves no longer miss a foe standing right against the user: their hit circles are up to 6 px bigger
  and sit that much closer, reaching exactly as far as before.

## alpha 0.5.15

- Substitute: the doll has the HP spent on it and takes hits until that is gone (it used to break on the first).
  Moves that do no damage, and a foe's statuses and other ill effects, fail against it; charges are not broken.
- Hawlucha kicks for its close-range moves.
- Touch pad: a move button held (not tapped) is aimed by hand from the start. Its guide begins just ahead of the
  player and no longer flashes at the spot a tap would have picked. A tap still goes at the nearest foe.

## alpha 0.5.14

- Sound on phones: presses on the touch pad now start the audio (they never reached it before), an iPhone with its
  ringer off still plays, and iPhones use their own audio rate.

## alpha 0.5.13

- Phantump (Ghost, evolves into Trevenant) takes Mimikyu's place.
- New mon: Hawlucha (Fighting).

## alpha 0.5.12

**New mons**
- Mimikyu (Ghost), Munchlax (Normal, evolves into Snorlax), Staryu (Water, into Starmie), Honedge (Steel, into
  Doublade and Aegislash) and Torkoal (Fire).
- Cubone chooses between Marowak and Alolan Marowak (Fire) when it is ready, as Eevee chooses.
- Honedge and Doublade slice for their close-range moves; Aegislash swings.

**Fighting**
- Critical hits: 6% of hits land for half again as much; slicing moves crit 25% of the time.
- Close-range moves do 10% more damage.

**Moves**
- Kinesis to Ralts, Explosion to Porygon, Wood Hammer to Chikorita and Cacnea.
- Only Acupressure, Glare and Cotton Guard are left without a learner.

## alpha 0.5.11

- Sound effects: every move has a sound now (62 sounds over the 252 moves), using the newly named files.
- Rebound: a faint is the fight-ending hit; Protect and the screens use the barrier sound; throws use the slam;
  Ember and Flame Burst the fireball; more hit sounds in the mix.
- Choosing a mon in the dream has its own sound.

## alpha 0.5.10

- The title theme is fetched and decoded while the game loads, so it starts on the first press instead of a moment after.
- Title screen: the logo is drawn at the screen's full resolution and sits a little lower; "Dojo Battles" is smaller.

## alpha 0.5.9

**Sound**
- Music: every stage and screen has a track (Red Rescue Team and Explorers), looping from its loop point; Versus
  Legendary plays against level 5 CPUs; jingles for a loss, a stage opening, a TM, a level and an evolution.
- Sound effects, a first pass: hits, jumps, parries, clashes, faints, heals, menu steps, and 180 of the moves.
- Music and Sounds switches in the pause menu and behind a Sound tab in every room; M mutes music.

**Fighting**
- Two close-range blows that meet clash: neither lands, both mons are thrown apart and reel for a moment.
- Icicle Crash leaves a spire of ice: cover that any attack can chip away and break.
- Heavy hits knock back again as well as stunning (0.5.8 had lost the knockback).
- Tadpole Pond: hops between the side pools at the top and the bank.

**Looks**
- New title card.
- Spikes are caltrops that stay in sight; Ember is a fireball that faces its flight; a landed parry and a broken
  shot have new bursts of light.

**Tools**
- Sound viewer (sounds.html) for naming and sorting the sound effects.
- The effect viewer has sections for sheets from other games, cut up by tools/slice-sheets.py.

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
