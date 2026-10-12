# Move mechanic ideas

Goal: every move should feel like *that* move, not a stat line. Priority is the power fantasy of the user; each idea also says how the other player gets out of it.

## Where the sameness is

190 moves, 12 behaviours. Four behaviours hold 131 of them:

| Behaviour | Moves | What differs between them today |
|---|---|---|
| melee | 38 | damage, cost, charge, art, sometimes a status |
| projectile | 35 | speed, radius, damage, art |
| self | 30 | which stat goes up |
| mid (spot at cursor) | 28 | radius, delay, art |
| aoe | 20 | radius |
| auto | 19 | none of them needs aiming |
| beam | 7 | length, damage |
| the rest | 13 | these are already distinct (Dig, Surf, Aqua Jet, Brave Bird…) |

The defence side is just as flat: every attack is answered the same way, by walking out of it or by pressing parry (0.55 s window, 15 stamina, refunds 45). Nothing is "unparryable but slow", nothing "beats a dodge but loses to a parry".

So the plan has two halves: a few **shared systems** that give moves something to interact with, and then **signature mechanics** per type that use them.

Each idea is tagged with build size: **S** = an option on an existing behaviour, **M** = a new behaviour, **L** = a new system.

---

## Part 1: Shared systems

These are worth building first because each one unlocks many moves.

### 1. Answer types (S, but touches every move)

Give each attack one tag that says which defence works. The tag is shown by the colour of the aim/telegraph ring so it can be read mid-fight.

| Tag | Parry | Dodge / walk out | Shield (Protect, Barrier) | Used by |
|---|---|---|---|---|
| **Strike** | yes | yes | yes | most melee, most shots |
| **Grab** | no | yes | no | throws, binds, tethers |
| **Heavy** | no (parry only halves it) | yes | yes | Giga Impact, Hyper Beam, Earthquake |
| **Sweep** | yes | no, it is too wide; must parry or shield | yes | Surf, Hyper Voice, Blizzard |
| **Curse** | no | only by breaking line of sight or range | no | Mean Look, Disable, Destiny Bond |

This alone makes 38 melee moves split into three or four families, and gives parry a real decision.

### 2. Shot ownership (M)

A projectile can change owner mid-flight. Once that exists, a whole family of moves becomes possible: reflect, catch, steal, redirect, detonate.

- **Perfect parry** (first 0.15 s of the window) sends a Strike projectile back at double speed. A normal parry still only negates.
- Returned shots keep their status effect, so a reflected Will-O-Wisp burns its owner.

### 3. Clash (M)

When two attacks meet, the one with more **weight** wins and continues with the difference; equal weights cancel with a spark. Weight is one number per move.

- Light (Bubble, Ember, Pin Missile) < medium (Shadow Ball, Energy Ball) < heavy (Focus Blast, Rock Wrecker) < beam.
- A melee hit can cut a light shot. A heavy shot ploughs through light ones.
- This is what makes beam clashes possible (see Beams).

### 4. Marks (S)

Short states on a target that other moves cash in. They replace "10% more damage" with a setup and a payoff.

- **Soaked** (water moves, rain): electric moves chain to it and stun briefly; fire does less; ice freezes instantly.
- **Seeded** (Leech Seed, Bullet Seed): grass moves bloom on it for bonus damage and heal the user.
- **Charged** (the user's own, from Charge): next electric move arcs to a second target.
- **Lit** (Lock-On, Flash, Mind Reader): next shot at it cannot be dodged by walking, only parried.
- **Chilled** (ice moves): stacks; three stacks freeze.

### 5. Ground that reacts (M)

The lingering zones already exist. Let them interact:

- Fire on a grass zone (Spikes of vines, Leech Seed patch, Grassy Terrain) burns it into a damage field.
- Ice on a water zone (Surf puddle, Whirlpool, Rain) turns it into an ice sheet: anyone on it keeps sliding in the direction they were moving.
- Electric on a water zone shocks everyone standing in it once.
- Whirlwind, Gust, Defog and Rapid Spin blow zones and traps away.

---

## Part 2: Signature mechanics by type

### Psychic: control what is already in the air

**Psychic: catch and throw (M, needs shot ownership).** Hold the button: every enemy projectile inside a circle around the cursor freezes in place, glowing. Stamina drains per held shot. Release: they all fly at the cursor. Catching a full Pin Missile volley and sending it back is the fantasy.
*Answer:* beams and melee ignore it; the user is rooted while holding; a held shot can be re-parried on the way back.

**Confusion: bend one shot (S).** A quick tap version: the nearest enemy projectile reverses. Cheap, short range, long cooldown.
*Answer:* fire two shots, or fire from close range.

**Kinesis: steer your own shot (S).** While the button is held, your last projectile curves toward the cursor. Lets a skilled player hook a shot around a rock.
*Answer:* the shot is slow, and the user is not doing anything else while steering.

**Reflect / Light Screen: placed walls (M).** Drag to place a short wall segment for 6 s. Reflect stops melee dashes and bodies; Light Screen stops shots and beams, and bounces light shots. Your own beam fired *through* your Light Screen splits into three (Prism).
*Answer:* walk around; lob moves and spot moves go over; Brick Break shatters walls and stuns the owner.

**Trick Room (M).** A room around the user for 8 s in which projectile speeds invert (slow shots are fast, fast shots crawl) and the slower Pokémon moves faster. Bulky species finally get a turn to chase.
*Answer:* leave the room; it does not follow the user.

**Mirror Coat / Counter (S).** A 0.6 s stance. Mirror Coat returns the next projectile or beam at 1.5×; Counter returns the next melee hit at 1.5×. Wrong guess = you take the hit at full.
*Answer:* bait with the other damage class, or use a Grab.

**Future Sight** already delays. Add: the mark is invisible to the target for the first second, and using Teleport onto it with the user detonates it early.

**Skill Swap / Ally Switch (S).** Swap positions with the target instantly. Use it standing in your own Stealth Rock, or just before your own Draco Meteor lands.
*Answer:* Curse tag, so line of sight; long cooldown.

### Flying: own the gap

**Aerial Ace: lock-on dash that does not miss (S).** Auto-targets the nearest enemy in a forward cone and curves to them. It follows through blinks and Double Team.
*Answer:* it is a Strike, so it parries cleanly, and the parry stuns the user for longer than usual. The move is "guaranteed to arrive", not "guaranteed to hurt".

**Fly: leave the screen (M).** Charge, then lift off. A shadow shows where you are; you steer it for up to 2 s, untouchable, then drop on the spot for Heavy damage in a small circle.
*Answer:* the shadow is visible the whole time; landing has a long recovery; Thunder, Gravity and Smack Down hit a flying target and knock it down for bonus damage.

**Bounce (S).** Short Fly with no steering: lands where the cursor was. Paralyses on hit. Cheaper, much shorter.

**Acrobatics: chain dashes (S).** A dash that refunds itself on hit, up to three times, each faster. Whiffing one ends the chain with a stumble.
*Answer:* parry the first; each later one has a smaller hitbox.

**U-turn / Volt Switch (S).** Dash in, hit, and bounce back to where you started. The safest poke in the game, low damage.
*Answer:* a trap or zone placed on the start point catches the return.

**Sky Drop (M, Grab).** A grab dash: on contact, both go airborne for 1.5 s, the user steers, then drops the target (into a zone, a trap, a wall).
*Answer:* dodge only. Heavy targets (Rhyhorn, Skarmory) cannot be lifted.

**Tailwind: a lane, not a buff (S).** Paints a long strip on the ground for 6 s. Allies move and fire faster along it; enemy shots flying against it slow down.

**Hurricane / Whirlwind (S).** Hurricane pulls targets and loose projectiles toward its centre; Whirlwind pushes everything in a cone away and clears zones. Both move shots without changing owner.

**Roost (already in).** Add: while roosting the user is not Flying, so Fly counters stop applying and ground moves hit.

### Beams: channelled, steerable, clashing

Seven beams exist and all are one-frame lines. Proposal: rebuild beam as a **held channel**.

**Held beams (M).** Hold to fire; stamina drains per second; the beam turns toward the cursor at a limited rate (heavy beams turn slowly). The user walks at 30% speed. Damage ticks, with the tick rate rising the longer the same target is held in it.
*Answer:* strafe faster than the turn rate; get behind; a parry blocks ticks for its window only, so parrying a beam is a stall, not a win.

**Beam clash (L, needs Clash).** Two beams that cross lock at the meeting point. Each player's push is their stamina drain rate, and tapping the button adds bursts. The point slides toward the loser; when it reaches them they take the sum of both beams. Either player can break off by releasing and walking away, eating a small hit.
*Answer:* a third player or a lobbed move hits the locked users freely, so clashing is a commitment.

Each beam gets one quirk on top:

| Beam | Quirk |
|---|---|
| **Hyper Beam** | Heavy. Long wind-up, widest, cannot turn at all once fired, then 1.5 s of recharge where the user cannot act. |
| **Flamethrower** | Short cone instead of a line; ignites grass zones; turns fast. |
| **Hydro Pump** | Pushes the target back and the user backwards too; soaks. Can be used to rocket yourself by aiming at a wall. |
| **Ice Beam** | Leaves an ice trail on the ground where it passed (see reacting ground). |
| **Psybeam** | Bends once: passes through the cursor point and then turns toward the nearest target. |
| **Dragon Breath** | Lingers: the beam's path stays as a paralysing haze for 2 s. |
| **Solar Beam** (new) | Needs a full 1.5 s charge, instant in Sunny Day, and pierces walls and Light Screen. |
| **Charge Beam** | Each full second channelled gives the user a Charged mark. |
| **Signal Beam** (new) | Weak, but wins every clash and confuses on a win. |

### Fighting: reads, grabs and stances

**Seismic Toss / Circle Throw / Vital Throw (M, Grab).** Short-range grabs. Seismic Toss carries the target up and slams for damage equal to a fixed amount regardless of buffs. Circle Throw throws them to the cursor. Vital Throw is a counter-grab: it only works on a target that is mid-attack, and never misses then.
*Answer:* dodge; grabs have the shortest range in the game and lose to any attack that is already out.

**Close Combat (S).** Hold to keep punching: a rooted flurry, each hit stronger, user takes 30% more damage while it runs and for 2 s after.
*Answer:* walk out of reach, or hit the user from the side.

**Focus Punch (already in).** Make it true to the name: any hit during the charge cancels it and wastes the stamina; a full charge is a Heavy with the biggest single hit in the game.

**Sucker Punch (S).** Only works if the target is charging or winding up an attack; then it is instant, teleports to them and interrupts. Otherwise it fizzles and costs double.
*Answer:* do not charge in front of a Dark type; bait it with a cancel (left click), which already exists.

**Pursuit (S).** The same idea aimed at escapes: hits anyone who is dashing, blinking, digging or flying, wherever they are, for double.

**Detect / Protect (already in as shield).** Split them: Protect is a long shield with a growing cost when repeated; Detect is a 0.2 s dodge that, on success, puts the user behind the attacker.

**Low Kick / Grass Knot (S).** Damage scales with the target's size and trips sprinting targets (a knockdown). Makes sprinting a risk near a Fighting type.

**Mach Punch / Bullet Punch / Ice Shard / Quick Attack / Aqua Jet (S).** One family: **priority**. If it lands during the opponent's wind-up, it interrupts. Low damage, never interrupts a Heavy.

**Revenge / Payback / Avalanche (S).** Double damage for 1.5 s after the user was hit. Bide stores all damage taken during a 2 s stance and releases double.

**Brick Break (S).** Shatters shields, walls, Substitute and decoys in one hit and stuns their owner.

**Feint (S).** Goes through Protect, Detect and parry, tiny damage. The answer to defensive play.

### Fire, Water, Electric, Ice, Grass: setup and payoff

**Weather as an arena state (M).** Rain Dance, Sunny Day, Sandstorm, Hail: one at a time, 12 s, visible over the whole stage.
- Rain: everyone is Soaked, Thunder has no delay, fire is weak, Solar Beam needs double charge.
- Sun: fire zones spread, Solar Beam is instant, Moonlight/Synthesis heal double, water is weak.
- Sandstorm: chip damage to non Rock/Ground/Steel, shots lose range.
- Hail: Blizzard cannot be dodged by walking; ice stacks apply twice.
*Answer:* overwrite it with your own weather; each type wants a different one.

**Chain Lightning for Thunderbolt / Discharge (S).** Arcs to the next target within a short range, including decoys, Substitutes and Soaked ground. Double Team becomes a liability against Electric.

**Electro Ball (S).** Damage scales with how much faster the user is moving than the target. Sprint and Agility become damage.

**Thunder Wave (S).** A ring that expands slowly outward from the user; touching it paralyses. Jumping it is impossible, so the answer is to parry the ring as it reaches you or be out of range.

**Magnet Rise (S).** The user floats: immune to ground zones, traps, Earthquake and Dig for 5 s.

**Eruption / Water Spout (already in).** Scale with current HP, as in the games: full HP is huge, low HP is a puff. Shown by the size of the art.

**Flame Wheel / Flare Blitz / Volt Tackle / Wild Charge (S).** Dashes that leave a burning or sparking trail zone behind them, with recoil scaling with distance travelled.

**Fire Spin / Whirlpool / Sand Tomb (already zones).** Make the ring a cage: the edge blocks walking out for 2 s. Blinks, dashes and Dig still escape.

**Scald / Steam (S).** Water on a fire zone makes a steam cloud that blocks vision of what is inside it (sprites inside drawn as silhouettes only to the owner).

**Ice ground (see Part 1).** Ice Beam, Blizzard and Icy Wind lay ice. The user of an Ice type move is immune to sliding. Fire melts it into a puddle (Soaked source).

**Icicle Crash / Avalanche (S).** Falls on where the target *will be* in 0.6 s based on current velocity. Standing still or reversing dodges it, running in a line does not.

**Vine Whip / Power Whip: grapple (M).** Two uses from one button: hit a target to pull it to you (Grab), or hit a wall/rock to pull yourself to it.

**Leech Seed (already in).** Seeded becomes a mark: Giga Drain, Absorb and Horn Leech on a Seeded target heal double and the seed spreads to anyone within a short range.

**Spore / Sleep Powder / Stun Spore (S).** Slow drifting clouds that are pushed by Gust, Whirlwind, Tailwind and Hurricane, by either side. A cloud blown back onto its owner works on them.

**Solar Blade / Leaf Blade (S).** A wide melee arc whose range grows with charge time, like a sword swing drawn from the hip.

**Ingrain (already in).** Add the trade: rooted, but cannot be pulled, pushed, lifted or thrown, and roots damage anyone who digs under.

### Ghost and Dark: break the rules

**Shadow Sneak: travel through shadows (M).** Currently a beam. Instead: the user sinks into their shadow and reappears from the *target's* shadow behind them with a hit. Works at any range with line of sight.
*Answer:* a 0.4 s shadow ripple appears under the target first; parry toward your back, or just move.

**Phantom Force / Shadow Force (S).** Vanish completely for 1 s (no shadow, unlike Fly and Dig), reappear at the cursor with a hit that ignores shields.
*Answer:* short range from the vanish point, so backing away works; a sound or shimmer telegraphs the exit by 0.3 s.

**Curse (S).** Pay 30% of current HP. The target gets a 6 s doom clock over its head; when it ends it loses 30% of *its* max HP. Hitting the user three times removes it.
*Answer:* aggression. It converts a passive opponent into one that must attack.

**Destiny Bond (S).** A 3 s state: if the user faints during it, whoever landed the blow takes the same hit. Shown by a visible thread to nearby enemies.
*Answer:* stop attacking for 3 s.

**Spite / Torment (S).** Spite burns the target's stamina instead of HP. Torment stops the target using the same move twice in a row for 8 s.

**Snatch (S).** A 1 s stance: the next self-buff used by anyone nearby goes to the user instead. Steals Swords Dance, Wish, Substitute.

**Foul Play (S).** Uses the target's attack buffs, not the user's. Punishes Swords Dance stacking.

**Knock Off (S).** Removes the target's next-attack buff arrow, shields and marks, with bonus damage if it removed anything.

**Mean Look (already in).** Make it a tether: a visible circle around the user that the target cannot leave for 5 s. Breaking line of sight at cast avoids it.

**Hex (already in).** Double damage on any target with a status icon. Pure payoff move.

**Night Shade.** Fixed damage that ignores every buff, debuff and shield, which is its whole identity.

### Bug, Rock, Ground, Steel, Dragon, Normal

**String Shot / Spider Web: tether (M).** A thread from the user to the target for 4 s: the target is slowed and the user can tap again to yank them a short way. Sticky Web as a ground zone slows and removes sprint.
*Answer:* a slash-type move (Cut, Slash, X-Scissor, Leaf Blade) cuts the thread; walking behind a rock snaps it.

**Rollout / Ice Ball (M).** The user becomes the projectile: steer with limited turning, bounce off walls, each bounce and each hit adds speed and damage up to five. Hitting a parry stops it dead.

**Rock Tomb / Stone Edge: make cover (S).** Leave pillars for 5 s that block shots and movement. The Rock type builds its own arena, and Rock Smash / Brick Break send pillar shards flying as projectiles.

**Stealth Rock (already in).** Rocks float and hit anything that *enters* by dash, blink, Fly or Dig, harder than a walker.

**Earth Power / Fissure (S).** A crack travels along the ground from the user to the cursor in a visible line over 0.8 s, then erupts along its whole length. Reads like a telegraphed sniper line. Flying and Magnet Rise users ignore it.

**Earthquake (already charge-hold).** Add: hits targets using Dig for double, and shakes traps and Stealth Rocks loose (triggers them).

**Magnitude (S).** Earthquake with a random size 4–10 shown as a number as it charges; the user can release early at whatever number is showing. A gambling move.

**Gyro Ball (already homing).** Damage scales inversely with the user's speed: slower species hit harder, and it is strongest in Trick Room or while paralysed.

**Metal Burst / Iron Defense stance (S).** While Iron Defense is held, light shots bounce off in a random direction; releasing within 0.3 s of a hit returns it as Metal Burst.

**Magnet Bomb / Magnet Pull (S).** Magnet Pull drags Steel types and all metal projectiles (Flash Cannon, Pin Missile, Gyro Ball) toward the user; with shot ownership, they are caught and orbit the user as ammunition.

**Dragon Dance: a rhythm (S).** Three button presses on a beat shown by a pulsing ring. Each on-beat press gives a stack of speed and attack; a missed beat ends it. The reward for standing in the open for 1.5 s is the best buff in the game.
*Answer:* hit them during it; every stack is lost on a hit taken mid-dance.

**Outrage (already aoe).** Make it a rampage: 3 s of automatic lunges at the nearest target, huge damage, no control over targeting, then confusion. Decoys and Substitute soak it.

**Dragon Tail / Roar (S).** Hit sends the target flying to the far side of the screen and cancels their buffs in progress. The spacing reset button.

**Transform / Mimic / Copycat / Mirror Move (S to M).** Mirror Move: use the last move that hit you. Copycat: use the last move anyone used. Mimic: replace this slot with the target's last move for the rest of the fight. Transform: copy their species sprite and full moveset for 10 s.

**Baton Pass (S, team modes).** Dash to an ally and hand them every buff and mark you carry.

**Endure / Sturdy (S).** For 1.5 s, HP cannot drop below 1. Pairs with Reversal and Flail, which do more damage the lower the user's HP.

**Belly Drum (S).** Halve current HP, max out attack. No timer. The loud all-in.

**Rest / Sleep Talk / Snore (S).** Rest already heals. While asleep, Sleep Talk fires a random equipped move at the nearest target and Snore is a parryable shout; the sleeping user is no longer a free hit.

**Explosion / Self-Destruct (already in).** Add a visible 1.2 s fuse that the user can still walk during. Being chased by a lit Electrode is the fantasy; killing it during the fuse defuses it.

---

## Part 3: Making existing families diverge

Cheap splits for the four crowded behaviours, no new systems needed.

**38 melee moves → 6 families**

| Family | Rule | Members (examples) |
|---|---|---|
| Priority jab | interrupts wind-ups, low damage | Quick Attack, Bullet/Mach Punch, Ice Shard as melee |
| Slash | cuts light shots, threads and vines; wide arc | Cut, Slash, Night Slash, X-Scissor, Leaf Blade, Psycho Cut |
| Bite | latches for 1 s: both are stuck, user drains or statuses | Bite, the three Fangs, Bug Bite, Draining Kiss |
| Heavy blow | unparryable, slow, big knockback | Hammer Arm, Wood Hammer, Crabhammer, Mega Punch/Kick, Megahorn |
| Combo | repeats on re-press with timing, ramps | Fury Swipes, Fury Cutter, Dual Chop, Close Combat |
| Read | only works on a condition | Sucker Punch, Focus Punch, Wake-Up Slap (sleeping target), Pursuit |

**35 projectiles → 6 families**

| Family | Rule | Members (examples) |
|---|---|---|
| Light volley | many, cancelled by anything | Bullet Seed, Pin Missile, Swift, Poison Sting, Bubble |
| Piercing | passes through targets and light shots | Flash Cannon, Psycho Cut, Power Gem, Aurora Beam |
| Bursting | explodes at the cursor distance or on re-press | Sludge Bomb, Seed Bomb, Mud Bomb, Fire Blast (splits into five arms) |
| Returning | comes back to the user, hits twice | Bonemerang, Razor Leaf (boomerang arc) |
| Bouncing | ricochets off walls up to three times | Water Pulse, Ice Ball, Rock Throw |
| Growing | stronger and bigger the farther it flies, weak up close | Focus Blast, Dragon Pulse, Moonblast, Hyper Voice (widening cone) |

**30 self moves → give each a cost in tempo**

- **Stance** (hold to keep, drops on hit): Iron Defense, Defend Order, Cotton Guard.
- **Ritual** (bigger if uninterrupted): Swords Dance spins up over 1.5 s, one stack per half second; Cosmic Power likewise.
- **Field** (a place, not a buff): Tailwind lane, Aqua Ring puddle that heals whoever stands in it, Lucky Chant circle.
- **Bank** (pay now, receive later): Wish (already), Charge, Focus Energy stores a guaranteed crit for the next move.

**19 auto-target moves → give each a way to miss**

Auto-aim is fine when the move is a Curse (line of sight breaks it) or has a visible travel time. Confusion, Psychic, Hex, Draco Meteor and Rock Slide should each be moved to one of the mechanics above so that nothing is both instant and unavoidable.

---

## Suggested build order

1. **Answer types + ring colours.** Small, and it changes how every existing move reads.
2. **Family splits in Part 3.** Mostly options on existing behaviours; the biggest drop in sameness for the least work.
3. **Shot ownership + perfect-parry reflect**, then Psychic catch-and-throw, Confusion, Mirror Coat, Magnet Pull.
4. **Held beams**, then **Clash**, then beam clash and the per-beam quirks.
5. **Grabs and reads** (Seismic Toss, Sucker Punch, Pursuit, Feint, Brick Break).
6. **Marks and reacting ground**, then weather.
7. **One-off showpieces**: Fly, Shadow Sneak, Rollout, Dragon Dance, Curse, Transform.

## Open questions

- **Online cost.** Shot ownership, beam clash and tethers need both clients to agree on who owns what; the relay currently sends each player's own moves. These three need the most netcode work.
- **Teams or duels?** Baton Pass, Tailwind lanes, Helping Hand and Ally Switch only pay off with allies.
- **Touch controls.** Held beams, rhythm inputs and drag-to-place walls need a second look on the touch pad.
- **Stage cover.** Wall bounces, grapples and line-of-sight Curses assume maps have solid obstacles; some friend areas are open fields.
