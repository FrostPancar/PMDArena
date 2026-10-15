# alpha 0.5.28 (size L)

**Smarter CPUs**
- Every CPU reads its moveset and fights to suit it:
  - **Brawler** (mostly close-in hits): stays on top of you and keeps combos going, swinging again sooner while you reel.
  - **Hit and run** (close-in hits that cover ground: dashes, Brave Bird, Dig...): circles out of reach, darts in when
    ready, strikes, then runs back out.
  - **Ranged** (mostly moves that reach): keeps its distance and runs back out when you crowd it.
  - **Mixed**: picks its distance from the move it has in mind, as before.
- **Boosts first**: a CPU with a stat boost (Swords Dance, Agility, Dragon Dance, a charge-up...) uses it at the start of
  each life while it has room to, backing off to make that room if you rush it. It uses each boost **once per life**,
  never again until the next round or the next mon of a crew.
- **Getting clear**: CPUs keep track of how hard they are being pressed. Taking hits, being comboed, having a charge broken
  and being parried all add up. Past their limit they stop pressing buttons and jump clear (or run, if out of breath) to
  reset their position. Higher levels reset sooner.
- **Respecting fast attacks**: a CPU no longer starts a slow move right in front of you while you are free to answer it
  (Quick Attack used to beat everything it tried). It picks a quicker move, holds off, or steps out to make room. It
  still charges freely when you are reeling, stunned, out of breath or deep in a long charge of your own.
- **Counter-jabs**: a CPU with a jab move (Quick Attack, Mach Punch, Aqua Jet...) uses it to knock you out of a charge
  started up close.
- CPUs now also parry dashes coming straight at them.

| Level | Hits it takes before resetting | Holds off slow moves up close |
|---|---|---|
| 1 | 4.2 | 20% |
| 2 | 3.6 | 35% |
| 3 | 3.0 | 50% |
| 4 | 2.5 | 70% |
| 5 | 2.1 | 85% |

(A hit counts 1, a follow-up within 1.6 s counts 1.7, a hit that breaks a charge 1.2 more, being parried 1.4. It wears
off at 0.45 a second.)

**Auto movement controls**
- New setting: **Movement: Auto** (Settings in the base with Tab, or the pause menu in a fight). Your mon walks itself,
  keeping the distance your moveset likes, or closing in for the move you are aiming, and stepping back after you strike
  with a hit-and-run set.
- **Q W E R**: moves 1 to 4 (hold to aim with the mouse, let go to use)
- **Space**: jump
- **Left click**: parry, or call off a move
- **Right click**: run (hold to keep going)
- **C**: call off a charging move
- The move chips and the How to fight card show the new keys. The touch pad is unchanged.
