// Equippable moves, drawn with effects from move_VFX/<number_name>/<sequence>/<tick>.png.
// Only the sequences listed here are bundled; the folder holds ~19k frames.
const urls = import.meta.glob(
  [
    '../move_VFX/0002_rock_rubble_burst/000/*.png',
    '../move_VFX/0003_rainbow_rings/002/*.png',
    '../move_VFX/0005_fire_ring_explosion/000/*.png',
    '../move_VFX/0006_pink_light_beam/000/*.png',
    '../move_VFX/0006_pink_light_beam/001/*.png',
    '../move_VFX/0007_music_notes/000/*.png',
    '../move_VFX/0009_fire_ring/000/*.png',
    '../move_VFX/0010_explosion/001/*.png',
    '../move_VFX/0010_explosion/002/*.png',
    '../move_VFX/0011_bone_spin/000/*.png',
    '../move_VFX/0011_bone_spin/001/*.png',
    '../move_VFX/0012_pin_missiles/000/*.png',
    '../move_VFX/0013_orb_streams_directional/048/*.png',
    '../move_VFX/0013_orb_streams_directional/049/*.png',
    '../move_VFX/0013_orb_streams_directional/050/*.png',
    '../move_VFX/0013_orb_streams_directional/051/*.png',
    '../move_VFX/0013_orb_streams_directional/052/*.png',
    '../move_VFX/0013_orb_streams_directional/053/*.png',
    '../move_VFX/0013_orb_streams_directional/054/*.png',
    '../move_VFX/0013_orb_streams_directional/055/*.png',
    '../move_VFX/0017_pink_sphere/000/*.png',
    '../move_VFX/0018_white_orb_electric/000/*.png',
    '../move_VFX/0018_white_orb_electric/001/*.png',
    '../move_VFX/0018_white_orb_electric/002/*.png',
    '../move_VFX/0020_target_lock_reticle/001/*.png',
    '../move_VFX/0020_target_lock_reticle/005/*.png',
    '../move_VFX/0021_water_splash/000/*.png',
    '../move_VFX/0023_blue_dots_to_ring/000/*.png',
    '../move_VFX/0024_fireball_glow/000/*.png',
    '../move_VFX/0026_yellow_starburst_flash/000/*.png',
    '../move_VFX/0027_white_wings_flap/000/*.png',
    '../move_VFX/0028_fireballs_burst/000/*.png',
    '../move_VFX/0028_fireballs_burst/001/*.png',
    '../move_VFX/0029_flame_swirl_puff/001/*.png',
    '../move_VFX/0030_fire_blast/000/*.png',
    '../move_VFX/0030_fire_blast/001/*.png',
    '../move_VFX/0033_petals_scatter/003/*.png',
    '../move_VFX/0034_magma_rocks_eruption/000/*.png',
    '../move_VFX/0036_fire_streak_vertical/000/*.png',
    '../move_VFX/0037_heal_effects/006/*.png',
    '../move_VFX/0038_white_sparkle_twinkle/000/*.png',
    '../move_VFX/0039_yellow_orb_pulse/000/*.png',
    '../move_VFX/0041_grey_shards_fall/000/*.png',
    '../move_VFX/0042_thunder_arcs/000/*.png',
    '../move_VFX/0042_thunder_arcs/001/*.png',
    '../move_VFX/0045_ice_wings/000/*.png',
    '../move_VFX/0045_ice_wings/001/*.png',
    '../move_VFX/0045_ice_wings/002/*.png',
    '../move_VFX/0045_ice_wings/003/*.png',
    '../move_VFX/0045_ice_wings/004/*.png',
    '../move_VFX/0045_ice_wings/005/*.png',
    '../move_VFX/0045_ice_wings/006/*.png',
    '../move_VFX/0045_ice_wings/007/*.png',
    '../move_VFX/0046_curse/000/*.png',
    '../move_VFX/0048_pillar_of_light/000/*.png',
    '../move_VFX/0050_fire_claw_slash/000/*.png',
    '../move_VFX/0051_crosshair_marks/000/*.png',
    '../move_VFX/0054_yellow_crescent_slash/000/*.png',
    '../move_VFX/0055_ice_shards_ring/000/*.png',
    '../move_VFX/0056_poison_spikes/002/*.png',
    '../move_VFX/0058_hypnosis_spiral/000/*.png',
    '../move_VFX/0060_hyper_voice/002/*.png',
    '../move_VFX/0061_ice_spikes_ground/001/*.png',
    '../move_VFX/0062_star_drop/000/*.png',
    '../move_VFX/0063_white_puff_spark/000/*.png',
    '../move_VFX/0064_scary_face_eyes/000/*.png',
    '../move_VFX/0064_scary_face_eyes/001/*.png',
    '../move_VFX/0065_glare_eye/000/*.png',
    '../move_VFX/0067_protect/000/*.png',
    '../move_VFX/0068_barrier/000/*.png',
    '../move_VFX/0070_swipes/000/*.png',
    '../move_VFX/0073_water_droplets_spray/000/*.png',
    '../move_VFX/0075_red_blue_swirl_orb/000/*.png',
    '../move_VFX/0076_needle_arm/001/*.png',
    '../move_VFX/0077_star_shoot/000/*.png',
    '../move_VFX/0078_orange_zigzag/002/*.png',
    '../move_VFX/0080_roots_and_leaves/000/*.png',
    '../move_VFX/0080_roots_and_leaves/001/*.png',
    '../move_VFX/0081_water_pulse/002/*.png',
    '../move_VFX/0081_water_pulse/008/*.png',
    '../move_VFX/0083_white_needle/000/*.png',
    '../move_VFX/0085_wrap_vines/000/*.png',
    '../move_VFX/0086_money_bag/000/*.png',
    '../move_VFX/0088_poison_jab/000/*.png',
    '../move_VFX/0089_bubble_rings/000/*.png',
    '../move_VFX/0090_eruption/000/*.png',
    '../move_VFX/0090_eruption/001/*.png',
    '../move_VFX/0091_uproar/000/*.png',
    '../move_VFX/0092_shadow_ball/000/*.png',
    '../move_VFX/0093_powders/000/*.png',
    '../move_VFX/0095_rings_up/000/*.png',
    '../move_VFX/0096_water_spout/000/*.png',
    '../move_VFX/0096_water_spout/001/*.png',
    '../move_VFX/0097_white_smoke_puff/000/*.png',
    '../move_VFX/0099_mega_moves/001/*.png',
    '../move_VFX/0099_mega_moves/005/*.png',
    '../move_VFX/0099_mega_moves/006/*.png',
    '../move_VFX/0099_mega_moves/008/*.png',
    '../move_VFX/0100_sword_slash/000/*.png',
    '../move_VFX/0100_sword_slash/008/*.png',
    '../move_VFX/0101_slash/000/*.png',
    '../move_VFX/0102_evil/000/*.png',
    '../move_VFX/0102_evil/001/*.png',
    '../move_VFX/0102_evil/002/*.png',
    '../move_VFX/0104_metal_z/000/*.png',
    '../move_VFX/0107_small_star/000/*.png',
    '../move_VFX/0108_razor_leaf_wind/006/*.png',
    '../move_VFX/0108_razor_leaf_wind/009/*.png',
    '../move_VFX/0108_razor_leaf_wind/011/*.png',
    '../move_VFX/0108_razor_leaf_wind/012/*.png',
    '../move_VFX/0108_razor_leaf_wind/015/*.png',
    '../move_VFX/0110_rock_ball/001/*.png',
    '../move_VFX/0110_rock_ball/002/*.png',
    '../move_VFX/0113_white_laser_vertical/000/*.png',
    '../move_VFX/0113_white_laser_vertical/001/*.png',
    '../move_VFX/0114_sand_tomb/000/*.png',
    '../move_VFX/0114_sand_tomb/001/*.png',
    '../move_VFX/0115_spoon/000/*.png',
    '../move_VFX/0116_egg_hatch/000/*.png',
    '../move_VFX/0117_seed_ball/000/*.png',
    '../move_VFX/0119_thunder/002/*.png',
    '../move_VFX/0121_sound_crack/000/*.png',
    '../move_VFX/0121_sound_crack/001/*.png',
    '../move_VFX/0121_sound_crack/002/*.png',
    '../move_VFX/0121_sound_crack/003/*.png',
    '../move_VFX/0121_sound_crack/004/*.png',
    '../move_VFX/0121_sound_crack/005/*.png',
    '../move_VFX/0121_sound_crack/006/*.png',
    '../move_VFX/0121_sound_crack/007/*.png',
    '../move_VFX/0122_fangs_bite/000/*.png',
    '../move_VFX/0122_fangs_bite/001/*.png',
    '../move_VFX/0122_fangs_bite/002/*.png',
    '../move_VFX/0122_fangs_bite/003/*.png',
    '../move_VFX/0122_fangs_bite/004/*.png',
    '../move_VFX/0122_fangs_bite/005/*.png',
    '../move_VFX/0122_fangs_bite/006/*.png',
    '../move_VFX/0122_fangs_bite/007/*.png',
    '../move_VFX/0122_fangs_bite/016/*.png',
    '../move_VFX/0123_red_x/000/*.png',
    '../move_VFX/0124_tri_beam/000/*.png',
    '../move_VFX/0124_tri_beam/001/*.png',
    '../move_VFX/0125_moonlight/001/*.png',
    '../move_VFX/0125_moonlight/002/*.png',
    '../move_VFX/0126_horn/002/*.png',
    '../move_VFX/0127_ice_shard/002/*.png',
    '../move_VFX/0130_swords_dance/000/*.png',
    '../move_VFX/0131_whip_smack/000/*.png',
    '../move_VFX/0131_whip_smack/001/*.png',
    '../move_VFX/0133_cotton_guard/000/*.png',
    '../move_VFX/0134_web_shield/002/*.png',
    '../move_VFX/0135_whirlwind_spiral/000/*.png',
    '../move_VFX/0136_pin_missile/002/*.png',
    '../move_VFX/0136_pin_missile/010/*.png',
    '../move_VFX/0136_pin_missile/018/*.png',
    '../move_VFX/0137_leech_seed/000/*.png',
    '../move_VFX/0137_leech_seed/001/*.png',
    '../move_VFX/0138_hex_shield/000/*.png',
    '../move_VFX/0138_hex_shield/001/*.png',
    '../move_VFX/0139_hammer_arm/000/*.png',
    '../move_VFX/0140_grey_rock_shatter/000/*.png',
    '../move_VFX/0141_waterfall/001/*.png',
    '../move_VFX/0141_waterfall/002/*.png',
    '../move_VFX/0142_blue_atom_orbit/000/*.png',
    '../move_VFX/0144_sludge_wave/000/*.png',
    '../move_VFX/0145_green_poison/000/*.png',
    '../move_VFX/0145_green_poison/001/*.png',
    '../move_VFX/0147_red_fist_impact/000/*.png',
    '../move_VFX/0148_wood_hammer/000/*.png',
    '../move_VFX/0149_white_slash_lines/000/*.png',
    '../move_VFX/0150_green_spiky_orb/000/*.png',
    '../move_VFX/0150_green_spiky_orb/002/*.png',
    '../move_VFX/0151_light_stop/000/*.png',
    '../move_VFX/0152_thunder_fang/000/*.png',
    '../move_VFX/0153_rainbow_confetti_burst/000/*.png',
    '../move_VFX/0155_ice_fang/000/*.png',
    '../move_VFX/0157_fire_fang/000/*.png',
    '../move_VFX/0158_water_arc_slash/000/*.png',
    '../move_VFX/0159_drizzle/000/*.png',
    '../move_VFX/0160_outrage/000/*.png',
    '../move_VFX/0160_outrage/001/*.png',
    '../move_VFX/0161_aromatherapy/000/*.png',
    '../move_VFX/0162_music_ring_notes/000/*.png',
    '../move_VFX/0163_purple_claw_vortex/000/*.png',
    '../move_VFX/0164_normal_ring/000/*.png',
    '../move_VFX/0165_cross_poison/000/*.png',
    '../move_VFX/0166_x_scissor_slash/000/*.png',
    '../move_VFX/0167_bees_orange/000/*.png',
    '../move_VFX/0168_bees_green/000/*.png',
    '../move_VFX/0169_bees_yellow/000/*.png',
    '../move_VFX/0170_psycho_cut/002/*.png',
    '../move_VFX/0170_psycho_cut/010/*.png',
    '../move_VFX/0171_pink_psychic_burst/000/*.png',
    '../move_VFX/0172_earthquake/000/*.png',
    '../move_VFX/0172_earthquake/001/*.png',
    '../move_VFX/0173_light_blue_drops/000/*.png',
    '../move_VFX/0173_light_blue_drops/002/*.png',
    '../move_VFX/0175_flash_cannon/000/*.png',
    '../move_VFX/0175_flash_cannon/001/*.png',
    '../move_VFX/0176_dark_vortex/000/*.png',
    '../move_VFX/0177_white_slash_flurry/000/*.png',
    '../move_VFX/0178_purple_ring_orb/000/*.png',
    '../move_VFX/0178_purple_ring_orb/001/*.png',
    '../move_VFX/0179_shadow_claw/000/*.png',
    '../move_VFX/0180_punch_shockwave/000/*.png',
    '../move_VFX/0181_stealth_rock/001/*.png',
    '../move_VFX/0182_rock_wrecker/000/*.png',
    '../move_VFX/0182_rock_wrecker/001/*.png',
    '../move_VFX/0182_rock_wrecker/002/*.png',
    '../move_VFX/0183_blue_dot_pulse_small/000/*.png',
    '../move_VFX/0184_shadow_sneak/002/*.png',
    '../move_VFX/0184_shadow_sneak/008/*.png',
    '../move_VFX/0185_focus_blast/000/*.png',
    '../move_VFX/0185_focus_blast/010/*.png',
    '../move_VFX/0185_focus_blast/016/*.png',
    '../move_VFX/0186_leaf_storm/000/*.png',
    '../move_VFX/0186_leaf_storm/001/*.png',
    '../move_VFX/0186_leaf_storm/002/*.png',
    '../move_VFX/0187_draco_meteor/000/*.png',
    '../move_VFX/0188_stone_edge/000/*.png',
    '../move_VFX/0189_fire_burst/000/*.png',
    '../move_VFX/0190_ice_projectile/000/*.png',
    '../move_VFX/0190_ice_projectile/010/*.png',
    '../move_VFX/0190_ice_projectile/016/*.png',
    '../move_VFX/0191_wake_up_slap/000/*.png',
    '../move_VFX/0193_lucky_ring/000/*.png',
    '../move_VFX/0195_dark_pulse/000/*.png',
    '../move_VFX/0196_gunk_shot/000/*.png',
    '../move_VFX/0198_avalanche/000/*.png',
    '../move_VFX/0198_avalanche/001/*.png',
    '../move_VFX/0199_charm/000/*.png',
    '../move_VFX/0201_dark_void/000/*.png',
    '../move_VFX/0203_sludge_bomb/000/*.png',
    '../move_VFX/0204_crimson_flower_burst/000/*.png',
    '../move_VFX/0205_rock_throw/000/*.png',
    '../move_VFX/0206_moonblast/000/*.png',
    '../move_VFX/0206_moonblast/001/*.png',
    '../move_VFX/0206_moonblast/002/*.png',
    '../move_VFX/0207_steel_slash/001/*.png',
    '../move_VFX/0209_snowball_burst/000/*.png',
    '../move_VFX/0209_snowball_burst/001/*.png',
    '../move_VFX/0211_sonic_rings/000/*.png',
    '../move_VFX/0212_seed_bomb/000/*.png',
    '../move_VFX/0212_seed_bomb/001/*.png',
    '../move_VFX/0213_bug_bite/000/*.png',
    '../move_VFX/0215_electric_charge_projectile/000/*.png',
    '../move_VFX/0215_electric_charge_projectile/010/*.png',
    '../move_VFX/0215_electric_charge_projectile/016/*.png',
    '../move_VFX/0216_yellow_powerup/000/*.png',
    '../move_VFX/0218_mud_burst/000/*.png',
    '../move_VFX/0218_mud_burst/001/*.png',
    '../move_VFX/0219_dragon_ground_rush/000/*.png',
    '../move_VFX/0220_drain_punch/000/*.png',
    '../move_VFX/0221_small_white_fist/000/*.png',
    '../move_VFX/0221_small_white_fist/001/*.png',
    '../move_VFX/0222_electric_ball_burst/000/*.png',
    '../move_VFX/0222_electric_ball_burst/001/*.png',
    '../move_VFX/0224_focus_punch/000/*.png',
    '../move_VFX/0224_focus_punch/001/*.png',
    '../move_VFX/0225_fire_whirl_column/000/*.png',
    '../move_VFX/0226_ringed_orb_pulse/000/*.png',
    '../move_VFX/0227_hydro_radial_burst/000/*.png',
    '../move_VFX/0229_acupuncture/000/*.png',
    '../move_VFX/0230_night_slash/000/*.png',
    '../move_VFX/0232_white_feathers_scatter/000/*.png',
    '../move_VFX/0234_pink_spores_ring/000/*.png',
    '../move_VFX/0236_power_gem/000/*.png',
    '../move_VFX/0236_power_gem/001/*.png',
    '../move_VFX/0236_power_gem/002/*.png',
    '../move_VFX/0238_prism_flower_ring/000/*.png',
    '../move_VFX/0239_shine_orb/003/*.png',
    '../move_VFX/0240_aqua_swirl_projectile/000/*.png',
    '../move_VFX/0241_palm_strike_red/000/*.png',
    '../move_VFX/0244_tailwind/000/*.png',
    '../move_VFX/0245_grass_whip/000/*.png',
    '../move_VFX/0245_grass_whip/001/*.png',
    '../move_VFX/0249_wish/002/*.png',
    '../move_VFX/0251_brave_bird_silhouette/000/*.png',
    '../move_VFX/0252_electric_orb_spark/000/*.png',
    '../move_VFX/0253_fire_star_explosion/000/*.png',
    '../move_VFX/0256_dark_impact/000/*.png',
    '../move_VFX/0258_gust_spiral/000/*.png',
    '../move_VFX/0258_gust_spiral/001/*.png',
    '../move_VFX/0259_dark_scribble/000/*.png',
    '../move_VFX/0259_dark_scribble/002/*.png',
    // art cut from other games' sheets (extra_VFX/<sheet>/, see tools/slice-sheets.py): named by folder like the rest
    '../extra_VFX/emerald/5016_emerald_016/000/*.png',
    '../extra_VFX/mana/6043_mana_043/000/*.png',
    '../extra_VFX/mana/6060_mana_060/000/*.png',
    '../extra_VFX/dbz/7023_dbz_023/000/*.png',
    '../extra_VFX/negima/8006_negima_006/000/*.png',
  ],
  { eager: true, query: '?url', import: 'default' },
);

export const KIND_LABEL = {
  melee: 'melee', mid: 'mid range', projectile: 'long range', beam: 'beam', aoe: 'area',
  auto: 'auto target', homing: 'homing', slight: 'slight homing', self: 'self', dash: 'dash', hold: 'hold', blink: 'teleport',
};

// kind decides delivery:
//   melee       lands `reach` px ahead in the aim direction
//   mid         lands on the aimed spot, up to `range` px away
//   projectile  flies straight along the aim; slight / homing steer toward foes at `turn` rad/s
//   beam        hits everything on a line `length` px long
//   aoe         bursts around the user
//   auto        lands on the nearest foe within `range`
//   dash        the user vanishes and rushes `dash` px along the aim, hitting what it passes; `recoil` hurts it on a miss
//   hold        lasts while the button is held: the user turns into the art and flies at `speed` toward the cursor,
//               burning `upkeep` stamina a second; each hit costs the user `recoil` of the damage dealt
//   self        lands on the user: heal, a timed buff (atk / spd / def), or a shield that blocks every hit
// cost is stamina, drained over `charge` seconds of wind-up before the move goes off.
// origin is the point of the frame placed on the spot; slice trims the frame list (used to loop projectiles).
// drain heals the user by that share of the damage; tint recolours the effect; beams drawn top-down set anchor: 'top';
// scale enlarges small art; rotate turns the effect (or projectile) to its direction.
// chargeSeqs play on the user during the wind-up; impactSeqs play on each foe the move hits.
// impactFx / chargeFx borrow that art from another effect folder; bonus is a chance of a self-buff (with bonusFx art) after use;
// status: { kind, chance } may leave foes hit burned, poisoned, paralysed or frozen (see STATUS); cure clears the user's own; selfStatus puts one on the user.
// strip removes the raised stats and shield of foes in the hit; empower makes the user's next attack hit double; spin: false stops a shot spinning.
// linger keeps a spot effect out for that many seconds, hitting again every half second for part of its damage (follow: it stays on the user).
// Melee moves strike on the hit frame of the user's Attack lunge, a little ahead of it; lunge: false strikes at once where the user stands.
// lob throws a shot to the aimed spot (nearer lands sooner) instead of to full range. arc lobs a shot that high; burst is the splash radius where it comes down. chargeScale sizes the charge art.
// userAnim plays one of the mon's own sprite animations; lift / drift place and slide a self effect; debuff weakens a stat on foes hit; leech drains them over time.
// grow makes it a held charge: the zone widens from min to max at `rate` px a second, costing `upkeep` stamina a second,
// and goes off on release (left click cancels any charge).
// scatter drops an area move's art (seqs or altSeqs, at random) all over its radius; trap leaves an unseen hurtbox on the spot for that many seconds;
// cycle steps through its entries on successive uses, each with its own art, radius, damage and speed; a blink move teleports the user to the cursor;
// dark dims the screen for that many seconds; after puts a status on the user when a lingering move ends;
// endSeqs plays when a self buff runs out, loopBuff loops the art while it lasts; ingrain roots and heals the user; hpCost spends that share of max HP.
// ramp makes each use in a row hit harder; regen heals the user over time; cleanse clears the user's lowered stats; gravity makes a lingering zone nobody can jump in;
// random (Metronome) fires some other move instead; a dash with burst ends in a blast of that radius, and tire leaves the user out of stamina.
// dig makes a hold move travel underground: the user cannot be hit, the art is the mound it pushes along, the impact art bursts where it goes
// under and where it surfaces, and it only hits on surfacing.
// addFx / addSeqs is a second piece of art played once with the move; sustain keeps the hit live for as long as the art is out and
// active for a set time, each mon caught once; wobble squashes and stretches the art; fall drops it in from above (landFx plays where
// it lands); multi repeats the strike n times around the spot; appear makes it land that many ms after the cast; spout lobs that many
// blobs out of the user; knock multiplies knockback; coins throws the move's art out of each hit; bounce makes a shot squash and hop;
// ride (hold) keeps the user in view; decoys makes copies of the user; lockOut bars the user from an element for a while;
// a cycle entry may carry its own charge; grow.power scales damage with the held size; chargeAnim picks the wind-up animation.
// sub turns the user into a substitute doll with the health spent on it (hpCost): the doll takes the hits until that
// is gone, a foe's status moves and other ill effects do nothing to the mon behind it, and its charges are not broken.
// bury roots the foes it hits in the ground for that many seconds.
// flat beams are ground art drawn left-to-right from the centre (sequence 002 of a directional set faces east).
export const MOVES = {
  razorLeaf: { name: 'Razor Leaf', kind: 'projectile', fx: '0245_grass_whip', seqs: ['000'], speed: 230, range: 240, radius: 11, dmg: 16, cost: 22, charge: 0.25, fps: 14, spin: false, chargeFx: '0108_razor_leaf_wind', chargeSeqs: ['009'], chargeScale: 0.7 },
  leafStorm: { name: 'Leaf Storm', kind: 'projectile', fx: '0186_leaf_storm', seqs: ['000'], slice: [4, 20], speed: 170, range: 230, radius: 12, dmg: 18, cost: 30, charge: 0.4, impactSeqs: ['001', '001', '002'] },
  leafBlade: { name: 'Leaf Blade', kind: 'melee', fx: '0100_sword_slash', seqs: ['000'], reach: 14, radius: 36, dmg: 20, cost: 18, charge: 0.075, fps: 12, tint: 0x9cff7a, lunge: false },
  flameBurst: { name: 'Flame Burst', kind: 'mid', status: { kind: 'burn', chance: 0.25 }, fx: '0189_fire_burst', seqs: ['000'], range: 75, radius: 20, dmg: 9, cost: 28, charge: 0.15, origin: [0.5, 0.9] },
  fireSpin: { name: 'Fire Spin', kind: 'mid', status: { kind: 'burn', chance: 0.3 }, fx: '0225_fire_whirl_column', seqs: ['000'], range: 85, radius: 24, dmg: 16, cost: 32, charge: 0.35, origin: [0.5, 0.9], fps: 45, linger: 5 },
  bubble: { name: 'Bubble', kind: 'projectile', fx: '0183_blue_dot_pulse_small', seqs: ['000'], speed: 220, range: 240, radius: 8, dmg: 10, cost: 12, charge: 0.12 },
  waterSpout: { name: 'Water Spout', kind: 'mid', fx: '0096_water_spout', seqs: ['001'], slice: [12, 33], scale: 0.75, hitDelay: 330, chargeSeqs: ['000'], chargeOrigin: [0.5, 0.95], chargeScale: 0.75, range: 85, radius: 22, dmg: 18, cost: 28, charge: 0.35, origin: [0.5, 0.97], fps: 40 },
  confusion: { name: 'Confusion', kind: 'auto', fx: '0171_pink_psychic_burst', seqs: ['000'], range: 130, radius: 22, dmg: 16, cost: 30, charge: 0.4, sustain: true },
  swift: { name: 'Swift', kind: 'projectile', fx: '0062_star_drop', seqs: ['000'], speed: 230, range: 240, radius: 9, dmg: 14, cost: 20, charge: 0.2, rotate: true, rotOffset: -Math.PI / 2 },

  bite: { name: 'Bite', kind: 'melee', fx: '0122_fangs_bite', seqs: ['000'], reach: 16, radius: 16, dmg: 18, cost: 15, charge: 0.06, impactSeqs: ['016'] },
  fireFang: { name: 'Fire Fang', kind: 'melee', status: { kind: 'burn', chance: 0.25 }, fx: '0157_fire_fang', seqs: ['000'], reach: 18, radius: 18, dmg: 22, cost: 20, charge: 0.09, fps: 20 },
  ember: { name: 'Ember', kind: 'projectile', status: { kind: 'burn', chance: 0.25 }, fx: '0024_fireball_glow', seqs: ['000'], speed: 210, range: 260, radius: 10, dmg: 14, cost: 20, charge: 0.25, impactFx: '0090_eruption', impactSeqs: ['001'], impactScale: 0.75 },
  magicalLeaf: { name: 'Magical Leaf', kind: 'slight', fx: '0245_grass_whip', seqs: ['000'], fps: 14, spin: false, speed: 125, range: 250, turn: 0.6, radius: 10, dmg: 14, cost: 24, charge: 0.3, chargeFx: '0108_razor_leaf_wind', chargeSeqs: ['011'] },
  waterPulse: { name: 'Water Pulse', kind: 'projectile', fx: '0081_water_pulse', seqs: ['002'], speed: 150, range: 240, radius: 11, dmg: 16, cost: 28, charge: 0.35, rotate: true, fps: 20, impactSeqs: ['008'] },
  shadowBall: { name: 'Shadow Ball', kind: 'homing', fx: '0092_shadow_ball', seqs: ['000'], speed: 85, range: 320, turn: 1.6, radius: 11, dmg: 15, cost: 32, charge: 0.4, scale: 1.5, fps: 8 },
  psybeam: { name: 'Psybeam', kind: 'beam', fx: '0006_pink_light_beam', seqs: ['000'], slice: [1, 32], length: 140, dmg: 18, cost: 38, charge: 0.5, fps: 45, impactSeqs: ['001'] },
  hydroBurst: { name: 'Hydro Burst', kind: 'aoe', fx: '0227_hydro_radial_burst', seqs: ['000'], slice: [12, 33], radius: 50, dmg: 16, cost: 40, charge: 0.45, scale: 1.2 },
  powerWhip: { name: 'Power Whip', kind: 'melee', fx: '0245_grass_whip', seqs: ['000', '001'], reach: 22, radius: 22, dmg: 22, cost: 24, charge: 0.125, fps: 18 },
  grassKnot: { name: 'Grass Knot', kind: 'auto', fx: '0080_roots_and_leaves', seqs: ['001'], range: 130, radius: 24, dmg: 18, cost: 32, charge: 0.45, fps: 45, origin: [0.5, 0.8] },

  gigaDrain: { name: 'Giga Drain', kind: 'mid', fx: '0085_wrap_vines', seqs: ['000'], range: 100, radius: 20, dmg: 14, cost: 30, charge: 0.4, drain: 0.6, origin: [0.5, 0.8], fps: 20 },
  bulletSeed: { name: 'Bullet Seed', kind: 'projectile', fx: '0117_seed_ball', seqs: ['000'], speed: 260, range: 240, radius: 5, dmg: 6, cost: 16, charge: 0.1, fps: 10, scale: 0.6, volley: { n: 5, gap: 0.09 } },
  petalDance: { name: 'Petal Dance', kind: 'aoe', fx: '0033_petals_scatter', seqs: ['003'], fps: 45, radius: 53, dmg: 18, cost: 42, charge: 0.45, scale: 1.2 },
  stunSpore: { name: 'Stun Spore', kind: 'mid', status: { kind: 'para', chance: 1 }, fx: '0093_powders', seqs: ['000'], range: 80, radius: 24, dmg: 15, cost: 24, charge: 0.3, origin: [0.5, 0.8], fps: 20 },
  energyBall: { name: 'Energy Ball', kind: 'projectile', fx: '0150_green_spiky_orb', seqs: ['000'], speed: 150, range: 220, radius: 13, dmg: 20, cost: 30, charge: 0.4, impactSeqs: ['002'] },
  fireBlast: { name: 'Fire Blast', kind: 'projectile', status: { kind: 'burn', chance: 0.35 }, fx: '0030_fire_blast', seqs: ['000'], speed: 150, range: 220, radius: 13, dmg: 24, cost: 40, charge: 0.55, scale: 1.05, fps: 14, impactSeqs: ['001'] },
  dynamicPunch: { name: 'Dynamic Punch', kind: 'melee', status: { kind: 'confuse', chance: 1 }, fx: '0005_fire_ring_explosion', seqs: ['000'], reach: 18, radius: 20, dmg: 26, cost: 36, charge: 0.3, fps: 30 },
  flamethrower: { name: 'Flamethrower', kind: 'beam', status: { kind: 'burn', chance: 0.3 }, fx: '0036_fire_streak_vertical', seqs: ['000'], length: 130, dmg: 18, cost: 36, charge: 0.45, fps: 55 },
  willOWisp: { name: 'Will-O-Wisp', kind: 'homing', status: { kind: 'burn', chance: 1 }, fx: '0099_mega_moves', seqs: ['001'], speed: 75, range: 330, turn: 1.4, radius: 11, dmg: 13, cost: 28, charge: 0.35, spin: false },
  eruption: { name: 'Eruption', kind: 'auto', status: { kind: 'burn', chance: 0.25 }, fx: '0090_eruption', seqs: ['000', '001'], hitDelay: 600, range: 130, radius: 22, dmg: 19, cost: 34, charge: 0.45, origin: [0.5, 0.8], fps: 20 },
  dragonClaw: { name: 'Dragon Claw', kind: 'melee', fx: '0050_fire_claw_slash', seqs: ['000'], reach: 18, radius: 18, dmg: 21, cost: 20, charge: 0.075, fps: 15 },
  hydroPump: { name: 'Hydro Pump', kind: 'beam', fx: '0113_white_laser_vertical', seqs: ['000'], length: 150, dmg: 22, cost: 45, charge: 0.6, fps: 45, anchor: 'top', tint: 0x7cc4ff, chargeSeqs: ['001'] },
  whirlpool: { name: 'Whirlpool', kind: 'aoe', fx: '0095_rings_up', seqs: ['000'], radius: 46, dmg: 15, cost: 34, charge: 0.4, origin: [0.5, 0.8], fps: 20, linger: 5, scale: 1.2, addFx: '0021_water_splash', addSeqs: ['000'] },
  mudBomb: { name: 'Mud Bomb', kind: 'projectile', fx: '0218_mud_burst', seqs: ['000'], speed: 170, range: 230, radius: 12, dmg: 18, cost: 28, charge: 0.35, scale: 1.5, fps: 12, impactSeqs: ['001'], lob: true, arc: 44, burst: 20 },
  iceArmor: { name: 'Ice Armor', kind: 'self', fx: '0055_ice_shards_ring', seqs: ['000'], buff: { stat: 'def', mul: 1.6, time: 10 }, cost: 28, charge: 0.4, scale: 0.5 },
  iceFang: { name: 'Ice Fang', kind: 'melee', status: { kind: 'freeze', chance: 0.2 }, fx: '0155_ice_fang', seqs: ['000'], reach: 18, radius: 18, dmg: 21, cost: 20, charge: 0.09, fps: 20 },
  psychic: { name: 'Psychic', kind: 'auto', fx: '0017_pink_sphere', seqs: ['000'], range: 140, radius: 26, dmg: 21, cost: 40, charge: 0.55, fps: 45, sustain: true, wobble: true },
  hypnosis: { name: 'Hypnosis', kind: 'slight', status: { kind: 'sleep', chance: 1 }, fx: '0058_hypnosis_spiral', seqs: ['000'], slice: [0, 10], speed: 105, range: 230, turn: 0.7, radius: 11, dmg: 12, cost: 22, charge: 0.3 },
  futureSight: { name: 'Future Sight', kind: 'mid', fx: '0048_pillar_of_light', seqs: ['000'], range: 110, radius: 26, dmg: 26, cost: 45, charge: 0.15, origin: [0.5, 0.9], fps: 40, appear: 1300 },
  drainingKiss: { name: 'Draining Kiss', kind: 'melee', fx: '0199_charm', seqs: ['000'], reach: 18, radius: 18, dmg: 12, cost: 28, charge: 0.15, drain: 0.75, fps: 20 },
  darkPulse: { name: 'Dark Pulse', kind: 'aoe', fx: '0195_dark_pulse', seqs: ['000'], radius: 55, dmg: 17, cost: 38, charge: 0.45, fps: 55, scale: 1.2 },
  moonblast: { name: 'Moonblast', kind: 'projectile', fx: '0206_moonblast', seqs: ['001'], speed: 130, range: 240, radius: 16, dmg: 24, cost: 40, charge: 0.55, scale: 1.5, fps: 8, chargeSeqs: ['000'], impactSeqs: ['002'] },
  quickAttack: { name: 'Quick Attack', kind: 'melee', fx: '0149_white_slash_lines', seqs: ['000'], reach: 20, radius: 18, dmg: 14, cost: 10, charge: 0.03, chargeAnim: 'Double' },
  hyperBeam: { name: 'Hyper Beam', kind: 'beam', fx: '0113_white_laser_vertical', seqs: ['000'], length: 160, dmg: 26, cost: 55, charge: 0.75, fps: 45, anchor: 'top', chargeSeqs: ['001'] },
  hyperVoice: { name: 'Hyper Voice', kind: 'projectile', fx: '0060_hyper_voice', seqs: ['002'], speed: 130, range: 80, radius: 15, dmg: 18, cost: 30, charge: 0.35, rotate: true, scale: 1.5, fps: 20 },
  drainPunch: { name: 'Drain Punch', kind: 'melee', fx: '0220_drain_punch', seqs: ['000'], reach: 18, radius: 20, dmg: 22, cost: 30, charge: 0.2, drain: 0.5, fps: 45 },
  thunderFang: { name: 'Thunder Fang', kind: 'melee', status: { kind: 'para', chance: 0.25 }, fx: '0152_thunder_fang', seqs: ['000'], reach: 18, radius: 18, dmg: 21, cost: 20, charge: 0.09, fps: 20 },
  nightSlash: { name: 'Night Slash', kind: 'melee', fx: '0230_night_slash', seqs: ['000'], reach: 20, radius: 20, dmg: 19, cost: 18, charge: 0.07, rotate: true, fps: 70, scale: 1.12 },
  xScissor: { name: 'X-Scissor', kind: 'melee', fx: '0166_x_scissor_slash', seqs: ['000'], reach: 20, radius: 22, dmg: 22, cost: 24, charge: 0.11 },

  dragonBreath: { name: 'Dragon Breath', kind: 'beam', status: { kind: 'para', chance: 0.3 }, fx: '0036_fire_streak_vertical', seqs: ['000'], length: 130, dmg: 19, cost: 36, charge: 0.25, fps: 55, tint: 0xb48cff },
  dragonPulse: { name: 'Dragon Pulse', kind: 'projectile', fx: '0178_purple_ring_orb', seqs: ['000'], speed: 160, range: 240, radius: 13, dmg: 20, cost: 30, charge: 0.4, impactSeqs: ['001'] },
  outrage: { name: 'Outrage', kind: 'aoe', fx: '0160_outrage', seqs: ['001'], radius: 46, dmg: 16, cost: 44, charge: 0.6, scale: 2.4, fps: 24, chargeSeqs: ['000'], chargeScale: 1.5, linger: 3, follow: true, after: 'confuse' },
  dualChop: { name: 'Dual Chop', kind: 'melee', fx: '0100_sword_slash', seqs: ['008'], reach: 12, radius: 32, dmg: 20, cost: 18, charge: 0.075, fps: 16, lunge: false, hitDelay: 30, active: 0.2 },
  shadowClaw: { name: 'Shadow Claw', kind: 'melee', fx: '0179_shadow_claw', seqs: ['000'], reach: 18, radius: 20, dmg: 20, cost: 18, charge: 0.075 },
  nightDaze: { name: 'Night Daze', kind: 'aoe', fx: '0201_dark_void', seqs: ['000'], radius: 48, dmg: 19, cost: 42, charge: 0.5, fps: 40, scale: 1.4 },
  snarl: { name: 'Snarl', kind: 'mid', fx: '0176_dark_vortex', seqs: ['000'], range: 80, radius: 22, dmg: 16, cost: 24, charge: 0.3 },
  scaryFace: { name: 'Scary Face', kind: 'auto', fx: '0064_scary_face_eyes', seqs: ['000'], range: 130, radius: 20, dmg: 13, cost: 22, charge: 0.3, fps: 20, impactSeqs: ['001'], debuff: { stat: 'spd', mul: 0.6, time: 6 } },
  shadowSneak: { name: 'Shadow Sneak', kind: 'beam', fx: '0184_shadow_sneak', seqs: ['002'], flat: true, scale: 1.4, dmg: 17, cost: 28, charge: 0.25, fps: 22, impactSeqs: ['008'] },
  gust: { name: 'Gust', kind: 'mid', fx: '0258_gust_spiral', seqs: ['000'], range: 85, radius: 24, dmg: 16, cost: 24, charge: 0.3, origin: [0.5, 0.85], fps: 55, impactSeqs: ['001'], linger: 5 },
  whirlwind: { name: 'Whirlwind', kind: 'aoe', fx: '0258_gust_spiral', seqs: ['000'], radius: 48, dmg: 16, cost: 36, charge: 0.4, origin: [0.5, 0.85], fps: 55, scale: 1.2, knock: 3 },
  airSlash: { name: 'Air Slash', kind: 'mid', fx: '0149_white_slash_lines', seqs: ['000'], range: 95, radius: 22, dmg: 16, cost: 22, charge: 0.25 },
  aerialAce: { name: 'Aerial Ace', kind: 'dash', fx: '0177_white_slash_flurry', seqs: ['000'], dash: 90, dur: 0.4, radius: 15, dmg: 19, cost: 28, charge: 0.2, recoil: 8, fps: 60 },
  crabhammer: { name: 'Crabhammer', kind: 'melee', fx: '0147_red_fist_impact', seqs: ['000'], reach: 18, radius: 20, dmg: 24, cost: 26, charge: 0.15 },
  bubbleBeam: { name: 'Bubble Beam', kind: 'slight', fx: '0089_bubble_rings', seqs: ['000'], slice: [0, 9], speed: 125, range: 250, turn: 0.65, radius: 13, dmg: 15, cost: 24, charge: 0.3, fps: 15 },
  razorShell: { name: 'Razor Shell', kind: 'melee', fx: '0158_water_arc_slash', seqs: ['000'], reach: 20, radius: 22, dmg: 20, cost: 20, charge: 0.09, fps: 45 },
  surf: { name: 'Surf', kind: 'hold', ride: true, fx: '0073_water_droplets_spray', seqs: ['000'], speed: 200, radius: 18, dmg: 14, cost: 15, upkeep: 50, charge: 0.15, scale: 0.5, fps: 14 },
  bonemerang: { name: 'Bonemerang', kind: 'projectile', fx: '0011_bone_spin', seqs: ['000'], speed: 200, range: 230, radius: 11, dmg: 16, cost: 20, charge: 0.25, scale: 1.3, fps: 20, impactSeqs: ['001'] },
  meteorMash: { name: 'Meteor Mash', kind: 'melee', fx: '0180_punch_shockwave', seqs: ['000'], reach: 18, radius: 20, dmg: 20, cost: 20, charge: 0.1, bonus: { chance: 0.3, buff: { stat: 'atk', mul: 1.3, time: 6 }, scale: 0.6 }, bonusFx: '0216_yellow_powerup', bonusSeqs: ['000'] },
  earthquake: { name: 'Earthquake', kind: 'aoe', fx: '0172_earthquake', seqs: ['000'], altSeqs: ['001'], scatter: true, radius: 67, dmg: 20, cost: 15, charge: 0.3, grow: { min: 26, max: 101, rate: 32, upkeep: 30 }, fps: 24, bury: 1.4 },
  rockSlide: { name: 'Rock Slide', kind: 'auto', fx: '0205_rock_throw', seqs: ['000'], range: 130, radius: 24, dmg: 19, cost: 32, charge: 0.4, tint: 0xc9a070 },
  stoneEdge: { name: 'Stone Edge', kind: 'mid', fx: '0188_stone_edge', seqs: ['000'], range: 85, radius: 24, dmg: 21, cost: 32, charge: 0.4, origin: [0.5, 0.95], fps: 45, scale: 1.15 },
  poisonSting: { name: 'Poison Sting', kind: 'projectile', status: { kind: 'poison', chance: 0.5 }, fx: '0083_white_needle', seqs: ['000'], speed: 260, range: 250, radius: 8, dmg: 10, cost: 12, charge: 0.12, rotate: true, tint: 0xd48cff },
  sludgeBomb: { name: 'Sludge Bomb', kind: 'projectile', status: { kind: 'poison', chance: 0.4 }, fx: '0203_sludge_bomb', seqs: ['000'], slice: [8, 35], speed: 185, range: 230, radius: 13, dmg: 20, cost: 30, charge: 0.4, impactFx: '0196_gunk_shot', impactSeqs: ['000'], arc: 44, burst: 20, lob: true },
  poisonJab: { name: 'Poison Jab', kind: 'melee', status: { kind: 'poison', chance: 0.4 }, fx: '0088_poison_jab', seqs: ['000'], reach: 18, radius: 18, dmg: 20, cost: 18, charge: 0.075, scale: 1.5, fps: 14 },
  metalClaw: { name: 'Metal Claw', kind: 'melee', fx: '0012_pin_missiles', seqs: ['000'], reach: 18, radius: 20, dmg: 20, cost: 18, charge: 0.075, fps: 20, impactFx: '0207_steel_slash', impactSeqs: ['001'] },
  flashCannon: { name: 'Flash Cannon', kind: 'projectile', fx: '0175_flash_cannon', seqs: ['000'], slice: [20, 38], speed: 190, range: 260, radius: 14, dmg: 22, cost: 38, charge: 0.5, impactSeqs: ['001'] },
  gyroBall: { name: 'Gyro Ball', kind: 'homing', fx: '0142_blue_atom_orbit', seqs: ['000'], slice: [3, 12], speed: 95, range: 320, turn: 1.6, radius: 13, dmg: 16, cost: 32, charge: 0.4, fps: 20, scale: 0.7 },

  rockBlast: { name: 'Rock Blast', kind: 'mid', fx: '0002_rock_rubble_burst', seqs: ['000'], range: 85, radius: 22, dmg: 18, cost: 26, charge: 0.3, fps: 14 },
  thunderbolt: { name: 'Thunderbolt', kind: 'mid', status: { kind: 'para', chance: 0.25 }, fx: '0119_thunder', seqs: ['002'], range: 140, radius: 20, dmg: 21, cost: 34, charge: 0.28, origin: [0.5, 0.9], fps: 22 },
  brine: { name: 'Brine', kind: 'mid', fx: '0021_water_splash', seqs: ['000'], range: 80, radius: 22, dmg: 16, cost: 22, charge: 0.25, fps: 14 },
  overheat: { name: 'Overheat', kind: 'aoe', status: { kind: 'burn', chance: 1 }, fx: '0028_fireballs_burst', seqs: ['000'], radius: 55, dmg: 30, cost: 50, charge: 0.45, fps: 20, chargeSeqs: ['001'], scale: 1.2, lockOut: { element: 'fire', time: 5 } },
  incinerate: { name: 'Incinerate', kind: 'mid', status: { kind: 'burn', chance: 0.3 }, fx: '0029_flame_swirl_puff', seqs: ['001'], range: 80, radius: 24, dmg: 17, cost: 24, charge: 0.3, origin: [0.5, 0.75], fps: 14 },
  lavaPlume: { name: 'Lava Plume', kind: 'aoe', status: { kind: 'burn', chance: 0.35 }, fx: '0024_fireball_glow', seqs: ['000'], radius: 58, dmg: 16, cost: 40, charge: 0.5, spout: 7, arc: 34, burst: 16, scale: 0.6, impactFx: '0034_magma_rocks_eruption', impactSeqs: ['000'], impactScale: 0.5 },
  discharge: { name: 'Discharge', kind: 'aoe', status: { kind: 'para', chance: 0.4 }, fx: '0042_thunder_arcs', seqs: ['000', '001'], radius: 50, dmg: 18, cost: 40, charge: 0.45, scale: 1.2 },
  toxicSpikes: { name: 'Toxic Spikes', kind: 'mid', status: { kind: 'poison', chance: 1, worse: 'toxic' }, fx: '0056_poison_spikes', seqs: ['002'], range: 100, radius: 16, dmg: 6, cost: 26, charge: 0.3, origin: [0.5, 0.92], fps: 18, trap: 25 },
  furySwipes: { name: 'Fury Swipes', kind: 'melee', fx: '0070_swipes', seqs: ['000'], reach: 18, radius: 22, dmg: 8, cost: 14, charge: 0.05, fps: 14, multi: { n: 2, spread: 0, gap: 170 }, ramp: 0.3 },
  starShoot: { name: 'Star Shoot', kind: 'projectile', fx: '0107_small_star', seqs: ['000'], speed: 260, range: 280, radius: 9, dmg: 15, cost: 22, charge: 0.25, scale: 1.5, addFx: '0077_star_shoot', addSeqs: ['000'] },
  uproar: { name: 'Uproar', kind: 'aoe', fx: '0091_uproar', seqs: ['000'], radius: 62, dmg: 17, cost: 42, charge: 0.5, fps: 24, linger: 5, follow: true, scale: 1.2 },
  slash: { name: 'Slash', kind: 'melee', fx: '0101_slash', seqs: ['000'], reach: 18, radius: 20, dmg: 18, cost: 14, charge: 0.05, fps: 16 },
  sandTomb: { name: 'Sand Tomb', kind: 'mid', fx: '0114_sand_tomb', seqs: ['001'], range: 90, radius: 26, dmg: 14, cost: 34, charge: 0.4, origin: [0.5, 0.75], fps: 50, bury: 1.0, impactSeqs: ['000'], linger: 5 },
  thunder: { name: 'Thunder', kind: 'mid', status: { kind: 'para', chance: 0.35 }, fx: '0018_white_orb_electric', seqs: ['000'], range: 150, radius: 24, dmg: 26, cost: 46, charge: 0.4, origin: [0.5, 0.96], fps: 20, chargeSeqs: ['002'], impactSeqs: ['001'] },
  triAttack: { name: 'Tri Attack', kind: 'projectile', status: { kind: 'tri', chance: 0.4 }, fx: '0124_tri_beam', seqs: ['001'], speed: 170, range: 240, radius: 12, dmg: 20, cost: 30, charge: 0.4, fps: 14, impactSeqs: ['000'] },
  iceShard: { name: 'Ice Shard', kind: 'projectile', status: { kind: 'freeze', chance: 0.15 }, fx: '0127_ice_shard', seqs: ['002'], speed: 300, range: 240, radius: 8, dmg: 11, cost: 12, charge: 0.08, rotate: true },
  vineWhip: { name: 'Vine Whip', kind: 'melee', fx: '0131_whip_smack', seqs: ['000'], reach: 18, radius: 20, dmg: 17, cost: 14, charge: 0.06, fps: 20, impactSeqs: ['001'] },
  hammerArm: { name: 'Hammer Arm', kind: 'mid', fx: '0139_hammer_arm', seqs: ['000'], range: 70, radius: 22, dmg: 25, cost: 30, charge: 0.2, fps: 28, fall: { h: 44, time: 0.22 } },
  rockTomb: { name: 'Rock Tomb', kind: 'mid', fx: '0182_rock_wrecker', seqs: ['001'], range: 85, radius: 26, dmg: 19, cost: 28, charge: 0.35, fps: 20, fall: { h: 70, time: 0.35 }, landFx: '0140_grey_rock_shatter', landSeqs: ['000'], impactFx: '0123_red_x', impactSeqs: ['000'], impactScale: 0.35, debuff: { stat: 'spd', mul: 0.5, time: 4 } },
  acid: { name: 'Acid', kind: 'projectile', status: { kind: 'poison', chance: 0.3 }, fx: '0145_green_poison', seqs: ['000'], speed: 190, range: 230, radius: 10, dmg: 15, cost: 20, charge: 0.25, rotate: true, fps: 14, impactSeqs: ['001'] },
  woodHammer: { name: 'Wood Hammer', kind: 'melee', fx: '0148_wood_hammer', seqs: ['000'], reach: 18, radius: 22, dmg: 25, cost: 30, charge: 0.2 },
  hex: { name: 'Hex', kind: 'auto', fx: '0163_purple_claw_vortex', seqs: ['000'], range: 130, radius: 22, dmg: 19, cost: 30, charge: 0.4, fps: 45 },
  crossPoison: { name: 'Cross Poison', kind: 'melee', status: { kind: 'poison', chance: 0.4 }, fx: '0165_cross_poison', seqs: ['000'], reach: 18, radius: 20, dmg: 20, cost: 18, charge: 0.075 },
  rockWrecker: { name: 'Rock Wrecker', kind: 'projectile', fx: '0182_rock_wrecker', seqs: ['001'], speed: 150, range: 240, radius: 14, dmg: 28, cost: 50, charge: 0.8, fps: 20, chargeSeqs: ['000'], impactSeqs: ['002'] },
  focusBlast: { name: 'Focus Blast', kind: 'projectile', fx: '0185_focus_blast', seqs: ['010'], speed: 170, range: 250, radius: 13, dmg: 26, cost: 46, charge: 0.75, rotate: true, fps: 14, chargeSeqs: ['000'], impactSeqs: ['016'] },
  blizzard: { name: 'Blizzard', kind: 'projectile', status: { kind: 'freeze', chance: 0.3 }, fx: '0190_ice_projectile', seqs: ['010'], speed: 230, range: 250, radius: 11, dmg: 18, cost: 28, charge: 0.4, rotate: true, fps: 14, chargeSeqs: ['000'], impactSeqs: ['016'] },
  wakeUpSlap: { name: 'Wake-Up Slap', kind: 'melee', fx: '0191_wake_up_slap', seqs: ['000'], reach: 18, radius: 20, dmg: 19, cost: 18, charge: 0.075 },
  avalanche: { name: 'Avalanche', kind: 'auto', status: { kind: 'freeze', chance: 0.2 }, fx: '0198_avalanche', seqs: ['000'], range: 140, radius: 24, dmg: 22, cost: 38, charge: 0.5, origin: [0.5, 0.95], fps: 26, impactSeqs: ['001'] },
  iceBall: { name: 'Ice Ball', kind: 'projectile', status: { kind: 'freeze', chance: 0.2 }, fx: '0209_snowball_burst', seqs: ['001'], speed: 180, range: 240, radius: 11, dmg: 17, cost: 24, charge: 0.3, scale: 1.5, fps: 8, impactSeqs: ['000'] },
  chargeBeam: { name: 'Charge Beam', kind: 'projectile', status: { kind: 'para', chance: 0.15 }, fx: '0215_electric_charge_projectile', seqs: ['010'], speed: 280, range: 260, radius: 10, dmg: 19, cost: 34, charge: 0.6, rotate: true, fps: 12, chargeSeqs: ['000'], impactSeqs: ['016'], bonus: { chance: 0.5, buff: { stat: 'atk', mul: 1.3, time: 8 }, scale: 0.6 }, bonusFx: '0216_yellow_powerup', bonusSeqs: ['000'] },
  dragonRush: { name: 'Dragon Rush', kind: 'melee', fx: '0219_dragon_ground_rush', seqs: ['000'], reach: 20, radius: 24, dmg: 23, cost: 26, charge: 0.125 },
  shockWave: { name: 'Shock Wave', kind: 'aoe', status: { kind: 'para', chance: 0.2 }, fx: '0222_electric_ball_burst', seqs: ['000'], radius: 60, dmg: 20, cost: 44, charge: 0.55, fps: 22, chargeSeqs: ['001'], scale: 1.2 },
  focusPunch: { name: 'Focus Punch', kind: 'melee', fx: '0224_focus_punch', seqs: ['001'], reach: 18, radius: 22, dmg: 32, cost: 44, charge: 0.425, fps: 20, chargeSeqs: ['000'] },
  blastBurn: { name: 'Blast Burn', kind: 'aoe', status: { kind: 'burn', chance: 0.35 }, fx: '0009_fire_ring', seqs: ['000'], radius: 48, dmg: 26, cost: 46, charge: 0.6, scale: 1.2 },
  bugBite: { name: 'Bug Bite', kind: 'melee', fx: '0213_bug_bite', seqs: ['000'], reach: 18, radius: 20, dmg: 18, cost: 14, charge: 0.05, fps: 26 },
  auraSphere: { name: 'Aura Sphere', kind: 'slight', fx: '0240_aqua_swirl_projectile', seqs: ['000'], slice: [8, 35], speed: 125, range: 250, turn: 0.6, radius: 11, dmg: 17, cost: 24, charge: 0.3 },
  forcePalm: { name: 'Force Palm', kind: 'melee', status: { kind: 'para', chance: 0.3 }, fx: '0241_palm_strike_red', seqs: ['000'], reach: 18, radius: 20, dmg: 20, cost: 18, charge: 0.075, fps: 14 },
  thunderShock: { name: 'Thunder Shock', kind: 'mid', status: { kind: 'para', chance: 0.25 }, fx: '0252_electric_orb_spark', seqs: ['000'], range: 80, radius: 22, dmg: 15, cost: 20, charge: 0.2, fps: 20, linger: 3 },
  psychoCut: { name: 'Psycho Cut', kind: 'projectile', fx: '0170_psycho_cut', seqs: ['002'], speed: 220, range: 200, radius: 11, dmg: 20, cost: 22, charge: 0.2, rotate: true, scale: 1.5, fps: 12, impactSeqs: ['010'] },

  iceBeam: { name: 'Ice Beam', kind: 'beam', status: { kind: 'freeze', chance: 0.3 }, fx: '0113_white_laser_vertical', seqs: ['000'], length: 150, dmg: 21, cost: 42, charge: 0.55, fps: 45, anchor: 'top', tint: 0xbfeaff, impactFx: '0061_ice_spikes_ground', impactScale: 1.2, chargeSeqs: ['001'], impactSeqs: ['001'] },
  razorWind: { name: 'Razor Wind', kind: 'aoe', fx: '0108_razor_leaf_wind', seqs: ['012'], radius: 62, dmg: 20, cost: 15, charge: 0.3, scale: 0.5, chargeSeqs: ['006'], grow: { min: 26, max: 92, rate: 34, upkeep: 30, power: [0.6, 1.5] } },
  dracoMeteor: { name: 'Draco Meteor', kind: 'auto', fx: '0187_draco_meteor', seqs: ['000'], range: 170, radius: 26, dmg: 16, cost: 70, charge: 0.9, origin: [0.5, 0.805], hitDelay: 780, fps: 32, multi: { n: 3, spread: 26, gap: 230 } },
  leechSeed: { name: 'Leech Seed', kind: 'projectile', fx: '0137_leech_seed', seqs: ['000'], speed: 200, range: 230, radius: 9, dmg: 6, cost: 26, charge: 0.3, fps: 12, leech: { time: 5, dps: 4 }, impactSeqs: ['001'] },
  petalBlizzard: { name: 'Petal Blizzard', kind: 'mid', fx: '0033_petals_scatter', seqs: ['003'], range: 90, radius: 34, dmg: 19, cost: 42, charge: 0.5, fps: 45 },
  featherDance: { name: 'Feather Dance', kind: 'mid', fx: '0232_white_feathers_scatter', seqs: ['000'], range: 90, radius: 28, dmg: 6, cost: 24, charge: 0.3, debuff: { stat: 'atk', mul: 0.65, time: 7 } },
  moonlight: { name: 'Moonlight', kind: 'self', fx: '0125_moonlight', seqs: ['001'], heal: 35, cost: 40, charge: 0.6, origin: [0.3, 0.95], fps: 30, still: 36, addFx: '0125_moonlight', addSeqs: ['002'] },
  aromatherapy: { name: 'Aromatherapy', kind: 'self', fx: '0161_aromatherapy', seqs: ['000'], heal: 25, cure: true, cost: 30, charge: 0.5, fps: 40 },
  wish: { name: 'Wish', kind: 'self', fx: '0249_wish', seqs: ['002'], heal: 55, healDelay: 3270, cost: 40, charge: 0.5, fps: 22 },
  swordsDance: { name: 'Swords Dance', kind: 'self', fx: '0130_swords_dance', seqs: ['000'], empower: true, cost: 30, charge: 0.5, fps: 50, scale: 0.6, lift: 34 },
  agility: { name: 'Agility', kind: 'self', buff: { stat: 'spd', mul: 1.45, time: 10 }, cost: 26, charge: 0.4, userAnim: 'Double' },
  tailwind: { name: 'Tailwind', kind: 'self', fx: '0244_tailwind', seqs: ['000'], buff: { stat: 'spd', mul: 1.6, time: 8 }, cost: 30, charge: 0.4, scale: 0.8 },
  ironDefense: { name: 'Iron Defense', kind: 'self', fx: '0138_hex_shield', seqs: ['000'], buff: { stat: 'def', mul: 1.6, time: 10 }, cost: 28, charge: 0.4, scale: 1.5, fps: 14, endSeqs: ['001'] },
  acupressure: { name: 'Acupressure', kind: 'self', fx: '0229_acupuncture', seqs: ['000'], empower: true, cost: 24, charge: 0.4, lift: 34 },
  protect: { name: 'Protect', kind: 'self', fx: '0067_protect', seqs: ['000'], shield: 1.6, cost: 34, charge: 0.1, fps: 30, scale: 0.6, drift: 9 },
  doubleTeam: { name: 'Double Team', kind: 'self', decoys: { n: 3, time: 3 }, cost: 30, charge: 0, userAnim: 'Double' },
  // status, support and utility moves
  sing: { name: 'Sing', kind: 'aoe', status: { kind: 'sleep', chance: 1 }, fx: '0162_music_ring_notes', seqs: ['000'], radius: 50, dmg: 4, cost: 34, charge: 0.5, fps: 22, scale: 1.2 },
  healBell: { name: 'Heal Bell', kind: 'self', fx: '0007_music_notes', seqs: ['000'], heal: 20, cure: true, cost: 30, charge: 0.45, fps: 22, lift: 20 },
  lockOn: { name: 'Lock-On', kind: 'auto', fx: '0020_target_lock_reticle', seqs: ['001'], range: 170, radius: 18, dmg: 3, cost: 22, charge: 0.3, fps: 24, debuff: { stat: 'def', mul: 0.6, time: 8 } },
  meanLook: { name: 'Mean Look', kind: 'auto', status: { kind: 'trap', chance: 1 }, fx: '0046_curse', seqs: ['000'], range: 140, radius: 18, dmg: 5, cost: 26, charge: 0.35, fps: 26 },
  confuseRay: { name: 'Confuse Ray', kind: 'auto', status: { kind: 'confuse', chance: 1 }, fx: '0211_sonic_rings', seqs: ['000'], scale: 0.6, range: 130, radius: 20, dmg: 6, cost: 26, charge: 0.35, fps: 45 },
  glare: { name: 'Glare', kind: 'auto', status: { kind: 'para', chance: 1 }, fx: '0065_glare_eye', seqs: ['000'], range: 130, radius: 18, dmg: 4, cost: 26, charge: 0.35, fps: 20, lift: 14 },
  payDay: { name: 'Pay Day', kind: 'projectile', fx: '0086_money_bag', seqs: ['000'], speed: 210, range: 230, radius: 9, dmg: 16, cost: 16, charge: 0.2, fps: 10, spin: false, coins: 6 },
  rest: { name: 'Rest', kind: 'self', heal: 40, healDelay: 200, cure: true, selfStatus: 'sleep', cost: 20, charge: 0.4 },
  kinesis: { name: 'Kinesis', kind: 'auto', fx: '0115_spoon', seqs: ['000'], range: 130, radius: 18, dmg: 8, cost: 22, charge: 0.3, fps: 14, debuff: { stat: 'atk', mul: 0.6, time: 8 } },
  softBoiled: { name: 'Soft-Boiled', kind: 'self', fx: '0116_egg_hatch', seqs: ['000'], heal: 45, healDelay: 800, cost: 44, charge: 0.6, fps: 30 },
  disable: { name: 'Disable', kind: 'auto', status: { kind: 'disable', chance: 1 }, fx: '0123_red_x', seqs: ['000'], range: 130, radius: 18, dmg: 4, cost: 26, charge: 0.35, fps: 30, scale: 0.5 },
  spiderWeb: { name: 'Spider Web', kind: 'mid', fx: '0134_web_shield', seqs: ['002'], range: 90, radius: 18, dmg: 6, cost: 20, charge: 0.25, fps: 14, debuff: { stat: 'spd', mul: 0.4, time: 5 } },
  flash: { name: 'Flash', kind: 'aoe', status: { kind: 'confuse', chance: 0.6 }, fx: '0151_light_stop', seqs: ['000'], radius: 53, dmg: 8, cost: 30, charge: 0.4, fps: 40, scale: 1.2 },
  rainDance: { name: 'Rain Dance', kind: 'self', fx: '0159_drizzle', seqs: ['000'], buff: { stat: 'spd', mul: 1.35, time: 10 }, cure: true, cost: 28, charge: 0.5, fps: 40, origin: [0.5, 0.98] },
  focusEnergy: { name: 'Focus Energy', kind: 'self', fx: '0164_normal_ring', seqs: ['000'], buff: { stat: 'atk', mul: 1.35, time: 14 }, cost: 26, charge: 0.45, fps: 30 },
  luckyChant: { name: 'Lucky Chant', kind: 'self', fx: '0193_lucky_ring', seqs: ['000'], buff: { stat: 'def', mul: 1.5, time: 12 }, cost: 28, charge: 0.45, fps: 40 },
  helpingHand: { name: 'Helping Hand', kind: 'self', fx: '0020_target_lock_reticle', seqs: ['005'], empower: true, cost: 30, charge: 0.4, fps: 20, lift: 14 },
  // lobbed, placed and multi-part moves
  seedBomb: { name: 'Seed Bomb', kind: 'projectile', fx: '0212_seed_bomb', seqs: ['000'], speed: 185, range: 220, radius: 11, dmg: 20, cost: 28, charge: 0.35, scale: 2, fps: 12, impactSeqs: ['001'], impactScale: 1.25, impactFps: 36, lob: true, arc: 44, burst: 20 },
  stealthRock: { name: 'Stealth Rock', kind: 'mid', fx: '0181_stealth_rock', seqs: ['001'], range: 100, radius: 16, dmg: 16, cost: 26, charge: 0.3, fps: 18, trap: 25 },
  sludgeWave: { name: 'Sludge Wave', kind: 'aoe', status: { kind: 'poison', chance: 0.4 }, fx: '0144_sludge_wave', seqs: ['000'], radius: 40, dmg: 22, cost: 15, charge: 0.3, fps: 16, grow: { min: 22, max: 78, rate: 30, upkeep: 30 } },
  waterfall: { name: 'Waterfall', kind: 'mid', fx: '0141_waterfall', seqs: ['002', '002', '002', '001'], range: 100, radius: 20, dmg: 24, cost: 32, charge: 0.3, origin: [0.5, 0.8], fps: 20, hitDelay: 1050 },
  pinMissile: { name: 'Pin Missile', kind: 'projectile', fx: '0136_pin_missile', seqs: ['018'], cycle: [{ seq: '018', r: 5, dmg: 14, speed: 300, charge: 0.06 }, { seq: '002', r: 8, dmg: 18, speed: 240, charge: 0.12 }, { seq: '010', r: 11, dmg: 22, speed: 190 }], speed: 300, range: 230, radius: 5, dmg: 14, cost: 16, charge: 0.2, rotate: true },
  megahorn: { name: 'Megahorn', kind: 'melee', fx: '0126_horn', seqs: ['002'], reach: 20, radius: 20, dmg: 28, cost: 34, charge: 0.175, rotate: true, scale: 1.7, fps: 12 },
  megaPunch: { name: 'Mega Punch', kind: 'melee', fx: '0099_mega_moves', seqs: ['005'], reach: 20, radius: 24, dmg: 30, cost: 38, charge: 0.25, scale: 0.6, fps: 16 },
  megaKick: { name: 'Mega Kick', kind: 'melee', fx: '0099_mega_moves', seqs: ['008'], reach: 20, radius: 24, dmg: 34, cost: 44, charge: 0.3, scale: 0.6, fps: 16 },
  crossChop: { name: 'Cross Chop', kind: 'melee', fx: '0099_mega_moves', seqs: ['006'], reach: 18, radius: 20, dmg: 26, cost: 30, charge: 0.15, scale: 1.3, fps: 16 },
  needleArm: { name: 'Needle Arm', kind: 'melee', fx: '0221_small_white_fist', seqs: ['001'], reach: 18, radius: 20, dmg: 22, cost: 22, charge: 0.125, fps: 16, impactFx: '0076_needle_arm', impactSeqs: ['001'] },
  nightShade: { name: 'Night Shade', kind: 'auto', fx: '0102_evil', seqs: ['001'], range: 130, radius: 26, dmg: 20, cost: 32, charge: 0.5, fps: 24, chargeSeqs: ['000'], impactSeqs: ['002'] },
  explosion: { name: 'Explosion', kind: 'aoe', fx: '0010_explosion', seqs: ['001'], radius: 74, dmg: 36, cost: 40, charge: 1.0, fps: 24, chargeSeqs: ['002'], hpCost: 0.25, linger: 1.54, once: true, scale: 1.2 },
  cottonGuard: { name: 'Cotton Guard', kind: 'self', fx: '0133_cotton_guard', seqs: ['000'], buff: { stat: 'def', mul: 1.7, time: 8 }, cost: 30, charge: 0.45, fps: 24 },
  barrier: { name: 'Barrier', kind: 'self', fx: '0068_barrier', seqs: ['000'], buff: { stat: 'def', mul: 1.5, time: 5 }, loopBuff: true, cost: 26, charge: 0.3, fps: 20 },
  ingrain: { name: 'Ingrain', kind: 'self', fx: '0080_roots_and_leaves', seqs: ['000'], ingrain: { time: 4, hps: 10 }, cost: 26, charge: 0.4, origin: [0.5, 0.7], fps: 8 },
  // heals, clouds, swarms and rule-bending moves
  roost: { name: 'Roost', kind: 'self', fx: '0232_white_feathers_scatter', seqs: ['000'], heal: 40, healDelay: 400, cost: 36, charge: 0.5 },
  auroraBeam: { name: 'Aurora Beam', kind: 'projectile', status: { kind: 'freeze', chance: 0.2 }, fx: '0003_rainbow_rings', seqs: ['002'], speed: 200, range: 230, radius: 11, dmg: 18, cost: 28, charge: 0.35, rotate: true },
  charge: { name: 'Charge', kind: 'self', fx: '0039_yellow_orb_pulse', seqs: ['000'], empower: true, cost: 28, charge: 0.4, fps: 24, addFx: '0252_electric_orb_spark', addSeqs: ['000'] },
  smokescreen: { name: 'Smokescreen', kind: 'mid', fx: '0041_grey_shards_fall', seqs: ['000'], range: 90, radius: 26, dmg: 4, cost: 28, charge: 0.3, scale: 1.15, fps: 8, linger: 4, debuff: { stat: 'atk', mul: 0.6, time: 3 } },
  cut: { name: 'Cut', kind: 'melee', fx: '0054_yellow_crescent_slash', seqs: ['000'], reach: 18, radius: 18, dmg: 14, cost: 10, charge: 0.04, rotate: true, fps: 24 },
  furyCutter: { name: 'Fury Cutter', kind: 'melee', fx: '0054_yellow_crescent_slash', seqs: ['000'], reach: 18, radius: 18, dmg: 9, cost: 12, charge: 0.04, rotate: true, fps: 24, tint: 0xb8ff7a, ramp: 0.5 },
  yawn: { name: 'Yawn', kind: 'projectile', status: { kind: 'sleep', chance: 1 }, fx: '0078_orange_zigzag', seqs: ['002'], speed: 90, range: 200, radius: 11, dmg: 2, cost: 30, charge: 0.4, rotate: true, bounce: true },
  aquaRing: { name: 'Aqua Ring', kind: 'self', fx: '0158_water_arc_slash', seqs: ['000'], regen: { time: 8, hps: 5 }, cost: 30, charge: 0.4, fps: 30 },
  haze: { name: 'Haze', kind: 'aoe', fx: '0097_white_smoke_puff', seqs: ['000'], radius: 55, dmg: 3, cost: 26, charge: 0.35, scale: 1.1, fps: 36, strip: true, cleanse: true },
  rockThrow: { name: 'Rock Throw', kind: 'projectile', fx: '0110_rock_ball', seqs: ['001'], speed: 185, range: 220, radius: 11, dmg: 20, cost: 26, charge: 0.3, scale: 1.5, fps: 16, impactSeqs: ['002'], lob: true, arc: 44, burst: 18 },
  attackOrder: { name: 'Attack Order', kind: 'auto', fx: '0167_bees_orange', seqs: ['000'], range: 140, radius: 22, dmg: 22, cost: 30, charge: 0.4, fps: 40, hitDelay: 400 },
  defendOrder: { name: 'Defend Order', kind: 'self', fx: '0169_bees_yellow', seqs: ['000'], buff: { stat: 'def', mul: 1.5, time: 10 }, cost: 28, charge: 0.4, fps: 40 },
  healOrder: { name: 'Heal Order', kind: 'self', fx: '0168_bees_green', seqs: ['000'], heal: 40, healDelay: 600, cost: 40, charge: 0.5, fps: 40 },
  lifeDew: { name: 'Life Dew', kind: 'self', fx: '0173_light_blue_drops', seqs: ['000', '002'], heal: 22, healDelay: 500, cost: 20, charge: 0.3, fps: 40 },
  gigaImpact: { name: 'Giga Impact', kind: 'dash', fx: '0177_white_slash_flurry', seqs: ['000'], dash: 110, dur: 0.4, radius: 16, dmg: 34, cost: 50, charge: 0.7, fps: 60, impactFx: '0204_crimson_flower_burst', impactSeqs: ['000'], burst: 34, tire: true },
  sleepPowder: { name: 'Sleep Powder', kind: 'mid', status: { kind: 'sleep', chance: 1 }, fx: '0234_pink_spores_ring', seqs: ['000'], range: 80, radius: 22, dmg: 3, cost: 32, charge: 0.4, fps: 10 },
  powerGem: { name: 'Power Gem', kind: 'projectile', fx: '0236_power_gem', seqs: ['001'], speed: 210, range: 240, radius: 10, dmg: 20, cost: 28, charge: 0.45, scale: 1.5, fps: 10, chargeSeqs: ['000'], impactSeqs: ['002'] },
  firePunch: { name: 'Fire Punch', kind: 'melee', status: { kind: 'burn', chance: 0.3 }, fx: '0253_fire_star_explosion', seqs: ['000'], reach: 18, radius: 20, dmg: 22, cost: 22, charge: 0.125, fps: 16 },
  attract: { name: 'Attract', kind: 'auto', status: { kind: 'attract', chance: 1 }, fx: '0051_crosshair_marks', seqs: ['000'], range: 130, radius: 18, dmg: 2, cost: 30, charge: 0.4, fps: 30 },
  taunt: { name: 'Taunt', kind: 'auto', status: { kind: 'taunt', chance: 1 }, fx: '0259_dark_scribble', seqs: ['000', '002'], range: 140, radius: 18, dmg: 2, cost: 24, charge: 0.3, scale: 1.5, fps: 12 },
  gravity: { name: 'Gravity', kind: 'mid', fx: '0075_red_blue_swirl_orb', seqs: ['000'], range: 110, radius: 40, cost: 30, charge: 0.1, fps: 8, alpha: 0.55, linger: 6, gravity: true },
  metronome: { name: 'Metronome', kind: 'self', fx: '0063_white_puff_spark', seqs: ['000'], random: true, cls: 'attack', cost: 30, charge: 0.4, scale: 2, fps: 40 },
  substitute: { name: 'Substitute', kind: 'self', fx: '0097_white_smoke_puff', seqs: ['000'], sub: true, hpCost: 0.25, cost: 30, charge: 0.4, fps: 30 },
  aquaJet: { name: 'Aqua Jet', kind: 'blink', fx: '0021_water_splash', seqs: ['000'], range: 90, radius: 18, dmg: 15, cost: 16, charge: 0.06, fps: 20 },
  cosmicPower: { name: 'Cosmic Power', kind: 'self', fx: '0023_blue_dots_to_ring', seqs: ['000'], buff: { stat: 'def', mul: 1.5, time: 12 }, dark: 1, cost: 30, charge: 0.4, scale: 1.5, fps: 14 },
  dig: { name: 'Dig', kind: 'hold', dig: true, fx: '0181_stealth_rock', seqs: ['001'], speed: 120, radius: 22, dmg: 24, cost: 15, upkeep: 35, charge: 0.2, scale: 0.7, fps: 14, impactFx: '0002_rock_rubble_burst', impactSeqs: ['000'] },
  machPunch: { name: 'Mach Punch', kind: 'melee', fx: '0221_small_white_fist', seqs: ['000'], reach: 20, radius: 18, dmg: 15, cost: 12, charge: 0.03, step: 18 },
  suckerPunch: { name: 'Sucker Punch', kind: 'auto', sucker: true, fx: '0256_dark_impact', seqs: ['000'], range: 130, radius: 18, dmg: 24, cost: 20, charge: 0.03, hitDelay: 0, fps: 26 },
  reflect: { name: 'Reflect', kind: 'mid', wall: 'reflect', fx: '0138_hex_shield', seqs: ['000'], range: 80, radius: 24, cost: 30, charge: 0.25, fps: 24 },
  lightScreen: { name: 'Light Screen', kind: 'mid', wall: 'screen', fx: '0238_prism_flower_ring', seqs: ['000'], range: 80, radius: 24, cost: 30, charge: 0.25, scale: 0.7 },
  fly: { name: 'Fly', kind: 'hold', fly: 2, tag: 'heavy', fx: '0027_white_wings_flap', seqs: ['000'], speed: 150, radius: 26, dmg: 30, cost: 20, upkeep: 25, charge: 0.3, knock: 2, impactFx: '0002_rock_rubble_burst', impactSeqs: ['000'] },
  bounce: { name: 'Bounce', kind: 'blink', leap: 0.55, status: { kind: 'para', chance: 0.5 }, fx: '0002_rock_rubble_burst', seqs: ['000'], range: 100, radius: 22, dmg: 20, cost: 24, charge: 0.15 },
  acrobatics: { name: 'Acrobatics', kind: 'dash', chain: 3, fx: '0177_white_slash_flurry', seqs: ['000'], dash: 70, dur: 0.32, radius: 15, dmg: 14, cost: 22, charge: 0.12, fps: 60 },
  uTurn: { name: 'U-turn', kind: 'dash', back: true, fx: '0177_white_slash_flurry', seqs: ['000'], dash: 95, dur: 0.36, radius: 15, dmg: 13, cost: 20, charge: 0.12, fps: 60 },
  hurricane: { name: 'Hurricane', kind: 'mid', pull: 70, swat: true, fx: '0135_whirlwind_spiral', seqs: ['000'], range: 100, radius: 30, dmg: 14, cost: 38, charge: 0.4, origin: [0.5, 0.9], linger: 3 },
  signalBeam: { name: 'Signal Beam', kind: 'beam', status: { kind: 'confuse', chance: 0.5 }, fx: '0006_pink_light_beam', seqs: ['000'], slice: [1, 32], length: 130, dmg: 12, cost: 24, charge: 0.3, fps: 45, tint: 0x9cffb0, ghost: true, turnRate: 2.2 },
  seismicToss: { name: 'Seismic Toss', kind: 'melee', fx: '0099_mega_moves', seqs: ['006'], scale: 1.3, fps: 16, tag: 'grab', toss: 0.45, fixedDmg: 28, reach: 16, radius: 18, dmg: 28, cost: 28, charge: 0.12 },
  circleThrow: { name: 'Circle Throw', kind: 'melee', fx: '0241_palm_strike_red', seqs: ['000'], fps: 14, tag: 'grab', throw: 95, reach: 16, radius: 18, dmg: 14, cost: 26, charge: 0.12 },
  closeCombat: { name: 'Close Combat', kind: 'melee', fx: '0221_small_white_fist', seqs: ['000'], flurry: { gap: 0.17, step: 0.15, upkeep: 32, weak: 0.77 }, lunge: false, reach: 16, radius: 18, dmg: 9, cost: 12, charge: 0.1 },
  detect: { name: 'Detect', kind: 'self', fx: '0164_normal_ring', seqs: ['000'], fps: 30, detect: 0.3, cost: 22, charge: 0 },
  bulletPunch: { name: 'Bullet Punch', kind: 'melee', fx: '0221_small_white_fist', seqs: ['000'], tint: 0xb8c4d6, reach: 20, radius: 18, dmg: 15, cost: 12, charge: 0.03, step: 18 },
  bide: { name: 'Bide', kind: 'self', fx: '0164_normal_ring', seqs: ['000'], fps: 30, tint: 0xff7a6a, bide: { time: 2, mul: 2, radius: 36 }, cls: 'attack', cost: 30, charge: 0.1 },
  brickBreak: { name: 'Brick Break', kind: 'melee', fx: '0099_mega_moves', seqs: ['006'], scale: 1.3, fps: 16, breaker: 0.8, reach: 18, radius: 20, dmg: 20, cost: 22, charge: 0.1 },
  icicleCrash: { name: 'Icicle Crash', kind: 'mid', fx: '0198_avalanche', seqs: ['000'], fps: 26, origin: [0.5, 0.95], impactSeqs: ['001'], chill: 1, lead: 0.5, fall: { h: 70, time: 0.5 }, range: 130, radius: 22, dmg: 24, cost: 36, charge: 0.3 },
  phantomForce: { name: 'Phantom Force', kind: 'blink', fx: '0102_evil', seqs: ['001'], fps: 24, impactSeqs: ['002'], vanish: { time: 1 }, pierceShield: true, range: 100, radius: 22, dmg: 26, cost: 34, charge: 0.2 },
  destinyBond: { name: 'Destiny Bond', kind: 'self', fx: '0163_purple_claw_vortex', seqs: ['000'], fps: 45, bond: 3, cost: 30, charge: 0.2 },
  spite: { name: 'Spite', kind: 'mid', fx: '0102_evil', seqs: ['001'], fps: 24, impactSeqs: ['002'], tag: 'curse', sap: 40, range: 130, radius: 20, dmg: 2, cost: 22, charge: 0.3 },
  torment: { name: 'Torment', kind: 'mid', fx: '0259_dark_scribble', seqs: ['000', '002'], scale: 1.5, fps: 12, tag: 'curse', torment: 8, range: 130, radius: 20, dmg: 2, cost: 24, charge: 0.3 },
  stringShot: { name: 'String Shot', kind: 'projectile', fx: '0083_white_needle', seqs: ['000'], rotate: true, tint: 0xffffff, string: { time: 4, slow: 0.55, yank: 45 }, speed: 240, range: 200, radius: 8, dmg: 4, cost: 20, charge: 0.15 },
  stickyWeb: { name: 'Sticky Web', kind: 'mid', fx: '0134_web_shield', seqs: ['002'], fps: 14, web: true, linger: 6, once: true, range: 100, radius: 28, cost: 26, charge: 0.3 },
  rollout: { name: 'Rollout', kind: 'hold', fx: '0181_stealth_rock', seqs: ['001'], scale: 0.7, fps: 14, impactFx: '0002_rock_rubble_burst', impactSeqs: ['000'], roll: { turn: 2.6, max: 5, gain: 0.2 }, parryStun: 1, speed: 130, radius: 14, dmg: 12, cost: 15, upkeep: 30, charge: 0.2 },
  magnitude: { name: 'Magnitude', kind: 'aoe', fx: '0172_earthquake', seqs: ['000'], fps: 24, scatter: true, altSeqs: ['001'], ground: true, radius: 60, dmg: 22, cost: 15, charge: 0.3, grow: { min: 22, max: 96, rate: 2.6, upkeep: 26, power: [0.5, 1.6], cycle: true } },
  magnetPull: { name: 'Magnet Pull', kind: 'self', fx: '0039_yellow_orb_pulse', seqs: ['000'], fps: 24, magnet: { range: 130, time: 4 }, cost: 20, charge: 0.15 },
  dragonDance: { name: 'Dragon Dance', kind: 'self', fx: '0130_swords_dance', seqs: ['000'], scale: 0.6, fps: 50, lift: 34, tint: 0xb48cff, dance: { beat: 0.5, n: 3, slack: 0.13, per: 0.15, time: 10 }, cost: 30, charge: 0.1 },
  dragonTail: { name: 'Dragon Tail', kind: 'melee', fx: '0050_fire_claw_slash', seqs: ['000'], fps: 15, knock: 6, strip: true, reach: 20, radius: 22, dmg: 16, cost: 26, charge: 0.2 },
  roar: { name: 'Roar', kind: 'aoe', fx: '0176_dark_vortex', seqs: ['000'], knock: 6, strip: true, radius: 52, dmg: 3, cost: 30, charge: 0.3 },
  copycat: { name: 'Copycat', kind: 'self', fx: '0063_white_puff_spark', seqs: ['000'], scale: 2, fps: 40, copy: true, cls: 'attack', cost: 26, charge: 0.3 },
  endure: { name: 'Endure', kind: 'self', fx: '0068_barrier', seqs: ['000'], fps: 20, endure: 1.5, cost: 24, charge: 0 },
  reversal: { name: 'Reversal', kind: 'melee', fx: '0220_drain_punch', seqs: ['000'], fps: 45, lowHp: 1.5, reach: 18, radius: 20, dmg: 16, cost: 22, charge: 0.12 },
  flail: { name: 'Flail', kind: 'melee', fx: '0070_swipes', seqs: ['000'], fps: 14, lowHp: 1.5, reach: 18, radius: 22, dmg: 14, cost: 18, charge: 0.1 },
  bellyDrum: { name: 'Belly Drum', kind: 'self', fx: '0164_normal_ring', seqs: ['000'], fps: 30, tint: 0xffb347, drum: true, cost: 20, charge: 0.6 },
  sleepTalk: { name: 'Sleep Talk', kind: 'self', fx: '0078_orange_zigzag', seqs: ['002'], rotate: true, asleep: 'talk', cls: 'attack', cost: 18, charge: 0 },
  snore: { name: 'Snore', kind: 'aoe', fx: '0060_hyper_voice', seqs: ['002'], scale: 1.5, fps: 20, rotate: true, asleep: 'snore', radius: 48, dmg: 18, cost: 18, charge: 0 },
  batonPass: { name: 'Baton Pass', kind: 'self', fx: '0020_target_lock_reticle', seqs: ['005'], fps: 20, lift: 14, pass: 130, cost: 24, charge: 0.1 },
  waterGun: { name: 'Water Gun', kind: 'projectile', fx: '0013_orb_streams_directional', seqs: ['048'], dir8: 48, speed: 300, range: 240, radius: 8, dmg: 12, cost: 12, charge: 0.08, fps: 12, spin: false, light: true },
  bugBuzz: { name: 'Bug Buzz', kind: 'aoe', tag: 'sweep', fx: '0211_sonic_rings', seqs: ['000'], tint: 0x7dff6a, scale: 1.3, addSeqs: ['000'], radius: 52, dmg: 19, cost: 38, charge: 0.4, debuff: { stat: 'def', mul: 0.8, time: 4 } },
  teleport: { name: 'Teleport', kind: 'blink', fx: '0038_white_sparkle_twinkle', seqs: ['000'], slice: [0, 14], fps: 30, range: 130, radius: 0, cost: 20, charge: 0.05 },
  healPulse: { name: 'Heal Pulse', kind: 'self', fx: '0173_light_blue_drops', seqs: ['000', '002'], tint: 0xffb8e6, heal: 34, healDelay: 400, healAllies: 70, cost: 36, charge: 0.4, fps: 40 },
  dreamEater: { name: 'Dream Eater', kind: 'aoe', fx: '0163_purple_claw_vortex', seqs: ['000'], fps: 45, dream: true, drain: 0.6, radius: 999, dmg: 26, cost: 36, charge: 0.4 },
  electroweb: { name: 'Electroweb', kind: 'mid', status: { kind: 'para', chance: 1 }, fx: '0134_web_shield', seqs: ['002'], fps: 14, web: true, webTint: 0xffe566, linger: 10, once: true, range: 100, radius: 28, cost: 30, charge: 0.3 },
  counter: { name: 'Counter', kind: 'self', fx: '0164_normal_ring', seqs: ['000'], fps: 30, tint: 0xffb057, bide: { time: 0.9, mul: 2, radius: 36 }, cls: 'attack', cost: 20, charge: 0 },
  mudShot: { name: 'Mud Shot', kind: 'beam', fx: '0113_white_laser_vertical', seqs: ['000'], length: 120, dmg: 14, cost: 30, charge: 0.3, fps: 45, anchor: 'top', tint: 0x9a6b3a, chargeSeqs: ['001'], debuff: { stat: 'spd', mul: 0.7, time: 4 } },
  blazeKick: { name: 'Blaze Kick', kind: 'melee', status: { kind: 'burn', chance: 0.3 }, fx: '0253_fire_star_explosion', seqs: ['000'], reach: 20, radius: 20, dmg: 24, cost: 26, charge: 0.1, fps: 16, step: 22 },
  flareBlitz: { name: 'Flare Blitz', kind: 'dash', status: { kind: 'burn', chance: 0.3 }, fx: '0024_fireball_glow', seqs: ['000'], dash: 110, dur: 0.4, radius: 16, dmg: 30, cost: 44, charge: 0.3, blaze: true, recoilHit: 0.33 },
  zapCannon: { name: 'Zap Cannon', kind: 'projectile', status: { kind: 'para', chance: 1 }, fx: '0215_electric_charge_projectile', seqs: ['010'], speed: 80, range: 260, radius: 14, dmg: 26, cost: 44, charge: 0.6, rotate: true, fps: 12, scale: 1.5, chargeSeqs: ['000'], impactSeqs: ['016'] },
  auroraVeil: { name: 'Aurora Veil', kind: 'self', fx: '0055_ice_shards_ring', seqs: ['000'], scale: 0.5, buff: { stat: 'def', mul: 1.2, time: 10 }, cost: 20, charge: 0.4 },
  dazzlingGleam: { name: 'Dazzling Gleam', kind: 'mid', fx: '0190_ice_projectile', seqs: ['016'], gray: true, tint: 0xffd6f2, range: 95, radius: 26, dmg: 18, cost: 24, charge: 0.25, fps: 14, scale: 1.3 },
  powderSnow: { name: 'Powder Snow', kind: 'projectile', status: { kind: 'freeze', chance: 0.03 }, fx: '0127_ice_shard', seqs: ['002'], speed: 240, range: 150, radius: 7, dmg: 4, cost: 12, charge: 0.08, rotate: true, scale: 0.7 },
  spikes: { name: 'Spikes', kind: 'mid', fx: '0056_poison_spikes', seqs: ['002'], gray: true, range: 100, radius: 16, dmg: 15, cost: 22, charge: 0.3, origin: [0.5, 0.92], fps: 18, trap: 25 },
  electroBall: { name: 'Electro Ball', kind: 'projectile', status: { kind: 'para', chance: 0.15 }, fx: '0142_blue_atom_orbit', seqs: ['000'], slice: [3, 12], tint: 0xffe566, speed: 240, range: 240, radius: 11, dmg: 19, cost: 26, charge: 0.25, fps: 20, scale: 0.7, spdScale: true },
  venoshock: { name: 'Venoshock', kind: 'projectile', fx: '0145_green_poison', seqs: ['000'], tint: 0xc77dff, speed: 200, range: 230, radius: 10, dmg: 16, cost: 26, charge: 0.25, rotate: true, fps: 14, impactSeqs: ['001'], versus: { status: ['poison', 'toxic'], mul: 2 } },
  knockOff: { name: 'Knock Off', kind: 'melee', fx: '0050_fire_claw_slash', seqs: ['000'], fps: 15, strip: true, reach: 18, radius: 20, dmg: 18, cost: 22, charge: 0.1 },
  boneRush: { name: 'Bone Rush', kind: 'melee', fx: '0011_bone_spin', seqs: ['000'], scale: 1.1, fps: 20, reach: 20, radius: 20, dmg: 9, cost: 24, charge: 0.1, multi: { n: 3, spread: 0, gap: 150, thru: true } },
  doubleEdge: { name: 'Double-Edge', kind: 'dash', fx: '0149_white_slash_lines', seqs: ['000'], dash: 95, dur: 0.38, radius: 16, dmg: 28, cost: 36, charge: 0.25, recoilHit: 0.33 },
  poisonPowder: { name: 'Poison Powder', kind: 'mid', status: { kind: 'poison', chance: 1 }, fx: '0093_powders', seqs: ['000'], gray: true, tint: 0xa63dff, range: 80, radius: 24, dmg: 6, cost: 22, charge: 0.3, origin: [0.5, 0.8], fps: 20 },
  solarBeam: { name: 'Solar Beam', kind: 'beam', fx: '0113_white_laser_vertical', seqs: ['000'], length: 170, dmg: 30, cost: 55, charge: 1.1, fps: 45, anchor: 'top', tint: 0xd8ff7a, chargeSeqs: ['001'] },
  steelWing: { name: 'Steel Wing', kind: 'melee', fx: '0012_pin_missiles', seqs: ['000'], reach: 18, radius: 22, dmg: 19, cost: 20, charge: 0.08, fps: 20, impactFx: '0207_steel_slash', impactSeqs: ['001'], bonus: { chance: 0.3, buff: { stat: 'def', mul: 1.3, time: 6 }, scale: 0.6 }, bonusFx: '0216_yellow_powerup', bonusSeqs: ['000'] },
  ironTail: { name: 'Iron Tail', kind: 'melee', fx: '0219_dragon_ground_rush', seqs: ['000'], gray: true, reach: 20, radius: 22, dmg: 27, cost: 36, charge: 0.14, debuff: { stat: 'def', mul: 0.75, time: 6 } },
  braveBird: { name: 'Brave Bird', kind: 'hold', fx: '0251_brave_bird_silhouette', seqs: ['000'], speed: 250, radius: 14, dmg: 18, cost: 15, upkeep: 60, recoil: 0.35, charge: 0.1, fps: 10 },
};

// Parry (L): the stance art plays on the user during the block window, the hit art when a move is blocked.
// The attempt shows the cancel twinkle; the blossom is kept for a block that lands.
// How many times in one match a mon may use moves that only heal it (Rest, Recover-likes, Ingrain, Aqua Ring...).
export const HEAL_LIMIT = 5;
export const healsOnly = (mv) => mv.kind === 'self' && !!(mv.heal || mv.regen || mv.ingrain);
export const PARRY = { cost: 0, gain: 20, window: 0.55, perfect: 0.15, cooldown: 0.9, hit: ['7023_dbz_023', '000'], scale: 0.7 };
// A shot cut or beaten out of the air breaks up in this burst of light.
export const SHATTER = { fx: ['8006_negima_006', '000'], scale: 0.55 };

// The sparks that loop on a mon whose next attack is boosted, and the trail behind one that is running.
export const EMPOWER = { fx: ['0224_focus_punch', '000'] };
// Rising particles that play on the user once any stat-raising move has finished its own art.
export const POWERUP = { fx: ['0216_yellow_powerup', '000'], scale: 0.6 };
// Leech Seed ticks: sprouts on the seeded foe, sparkles on the mon being healed.
export const LEECH = { seeded: ['0137_leech_seed', '001'], heal: ['0037_heal_effects', '006'] };
export const SPRINT = { move: 'tailwind', scale: 0.5 };

// Left click while charging or holding a move: a short twinkle on the user.
export const CANCEL = { fx: ['0038_white_sparkle_twinkle', '000'], slice: [0, 14] };

// Status conditions, one at a time. The icon (a row of the status sheet, see statusfx.js) floats over the afflicted mon, which is also tinted;
// the ice block is drawn over the mon itself.
//   burn    hurts over time and weakens attacks      poison  hurts over time, for longer
//   para    half speed, and moves sometimes fizzle   freeze  cannot move or act until it thaws
//   sleep   cannot move or act; a hit wakes it       confuse walks the opposite way
//   trap    cannot walk or jump                      disable cannot use equipped moves
//   attract cannot attack at all                     taunt   cannot use status-class moves
//   encore  locked to the equipped move, no basic attacks (a rival keeps using its move)
export const STATUS = {
  burn: { label: 'burned', tint: 0xffb09a, icon: 'flame', time: 5, dps: 2.5, atk: 0.75 },
  poison: { label: 'poisoned', tint: 0xd9aaff, icon: 'skull', time: 8, dps: 2 },
  para: { label: 'paralysed', tint: 0xfff29a, icon: 'spark', time: 5, spd: 0.5, fizzle: 0.25 },
  freeze: { label: 'frozen', tint: 0x9fd6ff, icon: 'ice', time: 1.8, immune: 5, hold: true, pose: true },
  sleep: { label: 'asleep', tint: 0xc4c8e8, icon: 'zzz', time: 3.5, hold: true, wakes: true },
  confuse: { label: 'confused', tint: 0xffc4e4, icon: 'question', time: 5, reverse: true },
  trap: { label: 'trapped', tint: 0xcdb4e6, icon: 'blind', time: 4, root: true },
  attract: { label: 'infatuated', tint: 0xffc0d8, icon: 'heart', time: 4, noMove: true, noAttack: true },
  taunt: { label: 'taunted', tint: 0xffc9b0, icon: 'exclaim', time: 6, noStatus: true },
  encore: { label: 'encored', tint: 0xfff0c0, icon: 'eye', time: 5, encore: true, noAttack: true },
  toxic: { label: 'badly poisoned', tint: 0xb07aff, icon: 'skull', time: 10, dps: 5 },
  disable: { label: 'disabled', tint: 0xe6c4c4, icon: 'cross', time: 5, noMove: true },
};

// Move class, for Taunt: 'attack' does real damage, 'status' is everything else (heals, buffs, shields, conditions).
for (const mv of Object.values(MOVES)) mv.cls ??= mv.kind !== 'self' && ((mv.dmg ?? 0) >= 10 || mv.cycle) ? 'attack' : 'status';

// Every move here can be learned by the species or one of its evolutions in the main games (checked against PokéAPI).
// Elements, for moves that lock one out (Overheat): only fire needs marking so far.
for (const id of 'flameBurst fireSpin fireFang ember fireBlast flamethrower willOWisp eruption overheat incinerate lavaPlume blastBurn firePunch blazeKick flareBlitz'.split(' ')) if (MOVES[id]) MOVES[id].element = 'fire';

// ---- answer types ----
// Every attack carries one tag saying which defence works against it; the aim ring takes the tag's colour.
//   strike  parried, jumped or shielded (the default)
//   grab    goes through a parry and a shield: jump it or stay out of reach
//   heavy   a parry only halves it
//   sweep   too wide to jump: it catches mons in the air
//   curse   goes through parry, jump and shield, but has to be aimed onto its target
export const TAGS = {
  strike: { label: 'strike', color: 0xffffff, how: 'Parry it, jump it or shield it.' },
  grab: { label: 'grab', color: 0xc77dff, how: 'Grab: goes through a parry and a shield. Jump it or stay out of reach.' },
  heavy: { label: 'heavy', color: 0xff9f1c, how: 'Heavy: a parry only halves it. Jump it or shield it.' },
  sweep: { label: 'sweep', color: 0x4cc9f0, how: 'Sweep: too wide to jump. Parry it or shield it.' },
  curse: { label: 'curse', color: 0xff5fa2, how: 'Curse: goes through parry, jump and shield. It has to be aimed onto you: keep moving.' },
};
const give = (ids, opts) => { for (const id of ids.split(' ')) Object.assign(MOVES[id], typeof opts === 'function' ? opts(MOVES[id]) : opts); };
give('gigaImpact hyperBeam earthquake rockWrecker explosion', { tag: 'heavy' });
give('surf hyperVoice blizzard whirlwind uproar', { tag: 'sweep' });
give('meanLook disable taunt attract scaryFace glare confuseRay lockOn', { tag: 'curse' });

// ---- move families ----
// Moves that used to differ only in their numbers share a rule with their family instead.
// Melee
//   jab     (jab: mul) a counter: hits that much harder on a foe caught charging a move; never stops a heavy charge
//   slash   (cut) wider, and cuts light shots out of the air
//   bite    (latch: s) a grab that holds user and foe in place for that long, biting twice more
//   heavy   slow to charge, a parry only halves it, sends the foe flying
//   combo   (combo: s) used again within that long of the last one it comes out at once, and hits harder (ramp)
//   read    (versus) hits harder on a foe in a given state; (sucker) only works on a foe that is charging a move: the user
//           is on it at once and the charge is broken; with nobody charging it fizzles and the stamina is paid twice
//   step: px the user darts forward as a melee move starts
give('quickAttack machPunch poisonJab forcePalm iceShard aquaJet', { jab: 1.75 });
give('firePunch', (mv) => ({ tag: 'heavy', knock: 2.2, charge: mv.charge * 2 }));
give('drainPunch', { tag: 'grab', latch: 1 });
give('vineWhip', (mv) => ({ cut: true, radius: mv.radius + 3 }));
give('cut slash nightSlash xScissor leafBlade shadowClaw dragonClaw metalClaw razorShell crossPoison steelWing', (mv) => ({ cut: true, radius: mv.radius + 3 }));
give('bite fireFang iceFang thunderFang bugBite drainingKiss', { tag: 'grab', latch: 1 });
give('hammerArm woodHammer crabhammer megaPunch megaKick megahorn dynamicPunch crossChop meteorMash dragonRush powerWhip needleArm ironTail', (mv) => ({ tag: 'heavy', knock: 2.2, charge: mv.charge * 2 }));
give('furySwipes furyCutter dualChop', (mv) => ({ combo: 1.1, ramp: mv === MOVES.furyCutter ? 0.25 : 0.15 })); // (how much harder each use in a row hits)
MOVES.furySwipes.multi = undefined; // one swipe a use: the flurry is the combo
give('focusPunch', { tag: 'heavy', knock: 2.2, charge: 0.9, dmg: 40 });
give('wakeUpSlap', { versus: { status: ['sleep', 'freeze'], mul: 2.2 } });
give('hex', { versus: { any: true, mul: 2 } });
// Shots
//   light     (light) cancelled by any enemy shot it touches and by slashes; fan: n throws that many at once
//   piercing  (pierce) goes on through whatever it hits, catching each foe once
//   bursting  (lob + burst) goes off where it was aimed
//   returning (boomerang) flies out, comes back to its user, and can hit on both legs
//   bouncing  (ricochet: n) glances off walls that many times, harder each time
//   growing   (swell: [from, to]) size and damage grow over the flight: weak up close, strong at range
give('poisonSting leafStorm', { light: true, fan: 3 });
give('swift bubble', { light: true });
// volley: { n, gap } shots one after another, each sent where the user is aiming at that moment. With the touch pad the
// button is held for it and letting go stops it short; from the keyboard or mouse one use sends them all.
give('bulletSeed', { light: true, thru: true });
give('swift', { volley: { n: 5, gap: 0.09 }, dmg: 5, thru: true });
give('pinMissile', { cycle: undefined, volley: { n: 4, gap: 0.1 }, dmg: 6, charge: 0.1, thru: true });
give('razorLeaf', { volley: { n: 4, gap: 0.11 }, dmg: 4, thru: true }); // (each leaf still comes back)
// stream: { gap, upkeep }: shots (or blows) keep coming for as long as the button is held, each where the user is aiming
// then, at `upkeep` energy a second on top of the cost to start. Each is a fraction of what the move's one shot was.
const STREAM = { gap: 0.14, upkeep: 36 };
give('waterGun', { stream: STREAM, dmg: 3, thru: true });
give('bubble', { stream: STREAM, dmg: 3, thru: true });
give('ember', { stream: STREAM, dmg: 4, thru: true, status: { kind: 'burn', chance: 0.06 }, impactFx: undefined, impactSeqs: undefined });
give('starShoot', { stream: STREAM, dmg: 4, thru: true, addFx: undefined, addSeqs: undefined });
give('powderSnow', { stream: STREAM, light: true, thru: true });
give('thunderShock', { stream: { gap: 0.18, upkeep: 36 }, dmg: 4, thru: true, linger: undefined, radius: 15, status: { kind: 'para', chance: 0.06 } });
// Fury Swipes is held too: swipe after swipe, each a little harder than the last
give('furySwipes', { stream: { gap: 0.57, upkeep: 30 }, thru: true }); // gap: the swipe's own animation, 8 frames at 14 a second; // (thru: each seed lands on a foe still reeling from the one before)
give('ember pinMissile iceShard starShoot payDay', { light: true });
give('flashCannon psychoCut powerGem auroraBeam chargeBeam', { pierce: true });
give('fireBlast', { lob: true, burst: 28 });
give('bonemerang razorLeaf', { boomerang: true });
give('waterPulse iceBall', { ricochet: 3, range: 330 });
give('focusBlast dragonPulse moonblast hyperVoice energyBall', { swell: [0.6, 1.6] });
// Self
//   stance  (stance) lasts while the button is held, rooted, at `upkeep` stamina a second; the first hit taken ends it
//   ritual  (ritual) held: one stack every `step` seconds up to `max`, each adding `per` to the buff; a hit loses it all
//   field   (field) a circle left on the ground: the buff (or healing) only works while standing in it
//   bank    paid now, cashed in later (Wish, and the boosted next attack of Charge and Focus Energy)
give('ironDefense defendOrder cottonGuard', (mv) => ({ stance: { upkeep: 14 }, buff: { ...mv.buff, mul: 2.5 } }));
give('auroraVeil', { ritual: { step: 0.5, max: 3, per: 0.2, upkeep: 22 }, chargeFx: '0226_ringed_orb_pulse', chargeSeqs: ['000'] }); // the longer it is held, the thicker the veil
give('doubleTeam', { userAnim: undefined }); // no tell: the copies are simply there
// Dragon Dance is held like Swords Dance, and raises Speed along with Attack
give('dragonDance', { dance: undefined, ritual: { step: 0.5, max: 3, per: 0.15, upkeep: 22 }, buff: { stat: 'atk', also: 'spd', mul: 1.15, time: 10 } });
give('swordsDance', { ritual: { step: 0.5, max: 3, per: 0.2, upkeep: 22 }, buff: { stat: 'atk', mul: 1.2, time: 10 }, empower: false });
give('cosmicPower', (mv) => ({ ritual: { step: 0.5, max: 3, per: 0.2, upkeep: 22 }, buff: { ...mv.buff, mul: 1.2 } }));
give('tailwind luckyChant aquaRing', { field: { radius: 40, time: 8 } });
give('focusEnergy', { empower: true, buff: undefined });
// ---- systems ----
// weight: when shots of opposite sides touch, the lighter one is destroyed and the heavier flies on with that much less damage;
//   equal weights cancel. light shots weigh 0, most shots 1, the ones below 2. A beam destroys every shot it crosses.
// A shot can change sides in flight (a perfect parry, Confusion, Psychic, a Light Screen): it then belongs to its new owner.
give('rockWrecker focusBlast moonblast flashCannon fireBlast', { weight: 2 });
// chill: ice moves leave a stack for 6 s instead of a chance to freeze; the third stack freezes solid.
give('iceFang iceShard blizzard avalanche iceBall iceBeam auroraBeam', { chill: 1, status: undefined });
// lock: Lock-On marks its target for that long, and every shot of the user's side homes in on it.
give('lockOn', { lock: 8 });
// Psychic
//   catch    held: pink orbs circle the area, and enemy shots inside it hang in the air; on release they are thrown where
//            the user aims. It does nothing else: with no shot caught, letting go just ends it.
//   reverse  turns the nearest enemy shot in range around and makes it the user's; with none in range, the plain burst
//   steer    held: the user's latest shot curves toward the aim
//   wall     leaves a wall across the aim for 6 s: 'reflect' stops the other side's bodies and dashes, 'screen' their shots and
//            beams (a light shot bounces back as the owner's); the owner's own beam splits in three passing through its screen
give('psychic', { kind: 'mid', appear: undefined, radius: 30, catch: { upkeep: 14, max: 30, drift: 55 }, // held for as long as there is the energy; the field drifts after the aim at `drift` px a second
 dmg: undefined, cost: 16, charge: 0.15, cls: 'status' });
give('confusion', { reverse: true });
give('kinesis', { kind: 'self', steer: { upkeep: 16, turn: 5 }, tag: undefined, debuff: undefined, dmg: undefined, cost: 8, charge: 0.1 });
give('futureSight', { hideFor: 1 }); // the foe does not see the ring for the first second
// Flying
//   seek       a dash that curves toward the nearest foe ahead; parryStun leaves the user helpless that long if it is parried
//   fly        (hold) up in the air for at most that long, untouchable except by swat moves, landing with the hit
//   leap       (blink) jumps to the spot over that many seconds instead of vanishing, landing with the hit
//   chain      a dash that, if it connects, makes the next one free and faster, that many times; a miss stuns the user
//   back       a dash that returns to where it started as soon as it connects
//   field.lane a strip along the aim instead of a circle; enemy shots flying up it are slowed
//   pull       a lingering zone that drags foes and their shots toward its centre; blow throws enemy shots outward
//   roost      grounds the user that long: no jump, no Fly, and ground moves hit it harder
give('aerialAce', { seek: 7, parryStun: 1 });
give('tailwind', { field: { lane: true, len: 150, half: 20, time: 8 } });
give('whirlwind', { blow: true });
give('thunder', { swat: true });
give('roost', { roost: 2 });
give('earthquake mudBomb sandTomb dig', { ground: true });
// Beams are held: `cost` to start, then `upkeep` stamina a second while the button is down. The beam swings toward the aim at
// `turnRate` rad/s, hits every 0.2 s, and the user walks slowly. cone widens the hit along the beam, wide the art;
// push shoves the user backwards; bend sends the beam to the aimed point and on from there to the nearest foe;
// ghost passes through Light Screens.
for (const mv of Object.values(MOVES)) if (mv.kind === 'beam') Object.assign(mv, { upkeep: Math.round(mv.cost * 0.8), cost: Math.round(mv.cost * 0.5), turnRate: mv.turnRate ?? 1.6 });
give('hyperBeam solarBeam', { turnRate: 0.8 });
give('flamethrower', { length: 85, turnRate: 4.5, cone: 0.16, wide: 1.8 });
give('hydroPump', { push: 40, knock: 2 });
give('psybeam', { bend: true });
give('shadowSneak', { length: 100 });
// How each beam is drawn (scene.drawBeam): a style, its width in px, and three colours (outline, body, core).
//   ray     a solid bar with bright pulses running down it        wave    the same, snaking from side to side
//   stripe  bands of two colours chasing each other               jag     a crackling, zig-zag bar with glints
//   stream  a jet with foam at its edges                          flame   puffs that swell and cool along a cone
//   shadow  a dark tendril crawling along the ground             mud     a rope of wet clods, dripping
give('mudShot', { look: { style: 'mud', w: 6, colors: [0x3d2610, 0x8a5a2b, 0xc79a5a] } });
give('solarBeam', { look: { style: 'ray', w: 10, colors: [0x4d7c0f, 0xd9f99d, 0xffffff] } });
give('hyperBeam', { look: { style: 'ray', w: 9, colors: [0xd97706, 0xffe566, 0xffffff] } });
give('psybeam', { look: { style: 'wave', w: 6, colors: [0x7e22ce, 0xff7ad9, 0xffffff] } });
give('signalBeam', { look: { style: 'stripe', w: 5, colors: [0x15803d, 0x7dffb0, 0xff8ae0] }, clashWin: true });
give('iceBeam', { look: { style: 'jag', w: 5, colors: [0x2f6fb3, 0xa8e6ff, 0xffffff] } });
give('hydroPump', { look: { style: 'stream', w: 8, colors: [0x1e40af, 0x4aa8ff, 0xe0f4ff] } });
give('flamethrower', { look: { style: 'flame', w: 4, colors: [0xb91c1c, 0xff8c1a, 0xffe566] } });
give('dragonBreath', { look: { style: 'flame', w: 4, colors: [0x4c1d95, 0xa855f7, 0xf5d0fe] }, cone: 0.05 });
give('shadowSneak', { look: { style: 'shadow', w: 7, colors: [0x12081f, 0x3b1d5e, 0x9d6bff] } });
// Beam clash: two beams of opposite sides that meet lock together. The meeting point is pushed toward the weaker side: a beam's
// push is its power, and pressing any move button during the lock adds a burst. When the point reaches a user, that user takes
// both beams at once. Letting go breaks the lock at the price of a small hit. clashWin (Signal Beam) pushes three times as hard
// and confuses the loser.
// The last auto-target moves: Eruption is as strong as its user is healthy, Draco Meteor is aimed by hand and saps the user's
// attack afterwards, Attack Order lands where its target is heading.
give('eruption', { hpScale: true });
give('dracoMeteor', { kind: 'mid', selfDebuff: { stat: 'atk', mul: 0.7, time: 5 } });


// ---- third batch ----
// fixedDmg: damage that ignores every buff, debuff and shield. toss / throw (grabs): the foe is lifted and dropped, or flung
// to where the user aims. flurry: held and rooted, a punch every `gap` s, each `step` stronger, the user taking more damage.
// detect: a split-second dodge that puts the user behind its attacker. bide: soaks up hits for a while, then pays them back.
// breaker: smashes shields, the substitute and walls, stunning their owner. repeat: each use in a row costs that much more.
// grapple: a whip that drags the foe it reaches to the user, or the user to a wall. cloud: a slow drifting shot that wind
// blows about, working for whoever blew it last. ingrain also makes the user impossible to shove.
// vanish (blink): gone for a while, then up at the aim with the hit; with behind, up at the back of the foe aimed at.
// bond: whoever knocks the user out in that time takes the same blow. sap: burns stamina. torment: no move twice running.
// tether: the foe cannot go further than that from the user. string: a thread that slows, and yanks on a second use.
// web: a zone that slows and stops running. roll (hold): the user is the shot, turning slowly, faster with every bounce and
// hit. pillar: the strike leaves cover standing. ambush: a trap that also catches dashes, blinks and Dig, harder.
// grow.cycle: the size swings up and down while held. deflect / burst: a stance that bounces light shots and, let go just
// after it breaks, returns the blow. magnet: catches metal shots to throw later. dance: presses on the beat build stacks.
// copy: the last move anyone used. endure: health cannot drop below 1. lowHp: stronger the worse hurt the user is.
// drum: half the user's health for double attack that does not wear off. asleep: only usable in its sleep.
// fuse: goes off that long after it is lit, the user free to walk meanwhile. pass: hands every boost to an ally.
give('nightShade', { fixedDmg: 20 });
give('protect', { repeat: 0.5 });
give('vineWhip', { grapple: 100, meet: true, tag: 'grab', cut: false, lunge: false }); // meet: user and foe are pulled to each other
give('powerWhip', (mv) => ({ grapple: 110, tag: 'grab', knock: undefined, charge: mv.charge / 2, lunge: false }));
give('stunSpore sleepPowder', { kind: 'projectile', cloud: true, speed: 45, range: 150, radius: 16, spin: false, light: undefined });
give('gust', { wind: true });
give('leafBlade', { cost: 12, grow: { min: 22, max: 62, rate: 44, upkeep: 22, power: [0.8, 1.7] } });
give('shadowSneak', { kind: 'blink', vanish: { time: 0.4, behind: true }, range: 150, radius: 18, look: undefined, upkeep: undefined, turnRate: undefined, cost: 28 });
give('meanLook', { tether: { r: 60, time: 5 }, status: undefined });
give('rockTomb', { pillar: 5 });
give('rockWrecker', { missPillar: 6 }); // a boulder that hits nobody stays standing where it stops
give('stealthRock', { ambush: 1.6 });
give('iceBall', (mv) => ({ kind: 'hold', roll: { turn: 2.6, max: 5, gain: 0.2 }, parryStun: 1, ricochet: undefined, speed: 130, radius: 14, dmg: 12, cost: 15, upkeep: 30, charge: 0.2 }));
give('ironDefense', { deflect: true, burst: { within: 0.3, mul: 1.5 } });
give('explosion', { fuse: 1.2, charge: 0 });
give('flashCannon pinMissile gyroBall', { metal: true });

// Auto-target moves that hurt show where they will land first, so a foe that keeps moving walks out of them.
// Nothing aims itself any more: what used to strike the nearest foe now lands where it is aimed (Sucker Punch, which only
// answers a charge, still finds its own target), and shots fly straight (Aura Sphere still curves; Aerial Ace still seeks).
for (const mv of Object.values(MOVES)) if (mv.kind === 'auto' && !mv.sucker) mv.kind = 'mid';
give('shadowBall willOWisp gyroBall', (mv) => ({ kind: 'projectile', turn: 0, speed: mv.speed * 2 }));
give('magicalLeaf hypnosis bubbleBeam', (mv) => ({ kind: 'projectile', turn: 0, speed: mv.speed * 1.55 }));
give('magicalLeaf', { volley: { n: 3, gap: 0.12 }, dmg: 6, thru: true });
give('bubbleBeam', { stream: STREAM, dmg: 4, thru: true, light: true });
give('avalanche attackOrder', { lead: 0.5 }); // aimed near a foe, these land where it is heading
for (const mv of Object.values(MOVES)) if (mv.kind !== 'self') mv.tag ??= 'strike';
// Shots thrown a long way get there sooner: a slow one was too easy to walk around at that distance.
const LONG_SHOT = 200, LONG_SHOT_SPEED = 1.35;
for (const mv of Object.values(MOVES)) if (mv.kind === 'projectile' && mv.range >= LONG_SHOT && !mv.lob) mv.speed = Math.round(mv.speed * LONG_SHOT_SPEED);
// Melee moves come out at once and carry the user a short dart toward the aim (step), so they are easier to land.
// The heaviest keep their wind-up: that wait is the price of the power.
// (25 power and up: Focus Punch, Mega Punch, Mega Kick, Megahorn, Seismic Toss, Dynamic Punch, Cross Chop, Wood Hammer)
const SLOW_MELEE = 25, MELEE_STEP = 16;
for (const mv of Object.values(MOVES)) {
  if (mv.kind !== 'melee') continue;
  if (mv.dmg < SLOW_MELEE) mv.charge = 0;
  mv.step ??= MELEE_STEP;
}
// What a move costs is counted in notches of the energy bar (20 each, see Mon): one, two for the strong ones (those
// that used to cost 34 or more), and half a notch for the light pokes (those that used to cost 14 or less). What it used to cost is kept as `weight`, which still orders the moves a mon learns.
// Held moves go on draining smoothly by their upkeep.
const STRONG_COST = 34, LIGHT_COST = 14;
for (const mv of Object.values(MOVES)) {
  mv.weight = mv.cost;
  if (mv.cost > 0) mv.cost = mv.cost >= STRONG_COST ? 40 : mv.cost <= LIGHT_COST ? 10 : 20;
}

// ---- the alpha 0.5.7 list (costs here are final: 20 is a notch of energy) ----
// softStream: a stream's shots wear the target down without staggering it, so a held stream is not a stun lock.
give('waterGun bubble bubbleBeam ember starShoot powderSnow thunderShock', { softStream: true, thru: undefined });
// lobbed shots burst wider and hit harder the further they are thrown (lobScale: from point blank to full range)
for (const mv of Object.values(MOVES)) if (mv.lob) Object.assign(mv, { burst: Math.round(mv.burst * 1.5), impactScale: (mv.impactScale ?? 1) * 1.3, lobScale: [0.75, 1.5] });
give('earthquake', { cost: 40 });
give('earthquake magnitude', { deep: true }); // the only things that reach a mon underground
// armor: while the move lasts its user takes damage but is not knocked back or out of it
give('braveBird rollout iceBall', { armor: true });
give('zapCannon', { kind: 'homing', turn: 1.3 });
give('venoshock', { gray: true, tint: 0xb04dff });
give('sleepPowder', { kind: 'homing', speed: 75, turn: 1.5, range: 210, radius: 12 });
give('gyroBall', { kind: 'hold', roll: { turn: 2.6, max: 5, gain: 0.2 }, parryStun: 1, armor: true, turn: undefined, speed: 130, radius: 14, dmg: 12, cost: 20, upkeep: 30, charge: 0.2 });
give('fireBlast', { twice: 24 }); // where it ends it goes off, and again as the first blast dies down
give('auroraBeam', { stream: { gap: 0.07, upkeep: 40 }, softStream: true, range: 120, speed: 300, dmg: 3, charge: 0.1, chill: undefined, pierce: undefined, status: { kind: 'freeze', chance: 0.04 } });
give('hypnosis', { fx: '0003_rainbow_rings', seqs: ['002'], slice: undefined, rotate: true, tint: 0xd9a8ff, volley: { n: 2, gap: 0.14 }, range: 150, thru: true });
give('iceBeam', (mv) => ({ look: { ...mv.look, diamond: true } }));
// moves that go on around their user for a while: dear, and not to be used again until the last one has finished
give('outrage uproar', { cost: 80, once: undefined, single: true });
// area moves come out at once; the ones that are charged up grow faster and wider (Earthquake is as it was)
for (const [id, mv] of Object.entries(MOVES)) {
  if (mv.kind !== 'aoe') continue;
  if (!mv.grow) { if (!mv.fuse && !mv.chargeSeqs && mv.tag !== 'heavy') mv.charge = 0; continue; }
  if (id === 'earthquake') continue;
  mv.grow = mv.grow.cycle || mv.grow.random ? { ...mv.grow, rate: mv.grow.rate * 1.6 } : { ...mv.grow, rate: mv.grow.rate * 2.5, max: Math.min(90, Math.round(mv.grow.max * 1.3)) };
}
give('circleThrow', { throw: 170, throwBack: true });
give('acrobatics', { bounce: 55 }); // a hit sends its user springing off the way it is steering
// held: the shield stays up while the button is down, for energy
give('protect', { shield: 0.3, guard: { upkeep: 24 }, drift: undefined, repeat: undefined });
give('rainDance', { rain: 10 });
for (const id of 'bubble waterSpout waterPulse hydroBurst hydroPump whirlpool crabhammer bubbleBeam razorShell surf brine waterfall waterGun aquaJet'.split(' ')) if (MOVES[id]) MOVES[id].element ??= 'water';
give('roost', { chargeAnim: 'Sleep' });
give('attackOrder', { kind: 'self', summon: { time: 12, moves: ['pinMissile', 'stunSpore'] }, dmg: undefined, range: undefined, radius: undefined, hitDelay: undefined, cls: 'attack', cost: 40, charge: 0.3, tag: undefined });
give('petalBlizzard', { linger: 4, dmg: 9, origin: [0.5, 0.72] });
give('hurricane', { cost: 80, levitate: 1.1 });
give('kinesis', { levitate: 1.1 }); // on whatever the shot it is steering hits
give('gravity', { fx: '0017_pink_sphere', seqs: ['000'], gray: true, radius: 72, range: 120, scale: 2.3, fps: 30, alpha: 0.5 });
give('futureSight', (mv) => ({ radius: 42, scale: (mv.scale ?? 1) * 1.5 }));
give('waterfall', (mv) => ({ radius: 34, scale: (mv.scale ?? 1) * 1.5 }));
give('eruption', { charge: 0.2 });
give('hammerArm', { charge: 0.15 });
// Art from other games' sheets.
// Spikes: caltrops that stay in sight where they were thrown (trapArt: how many are strewn over the spot).
give('spikes', { fx: '5016_emerald_016', seqs: ['000'], gray: undefined, origin: undefined, fps: 9, trapArt: 5 });
// Ember: a fireball with its tail behind it, turned the way it flies.
give('ember', { fx: '6060_mana_060', seqs: ['000'], slice: [0, 3], rotate: true, spin: false });
// Icicle Crash leaves a spire of ice standing where it lands: cover like a standing rock, for `time` seconds, but any
// attack that reaches it wears it down (`hp`) and it breaks.
give('icicleCrash', { icePillar: { fx: '6043_mana_043', time: 7, hp: 30 } });
// Critical hits (see CRIT in scene.js): any hit may land one; a keen move, one that slices, does far more often.
give('cut slash nightSlash xScissor leafBlade shadowClaw dragonClaw metalClaw razorShell crossPoison steelWing psychoCut airSlash furyCutter razorLeaf razorWind aerialAce', { keen: true });
// Close-range moves hit a tenth harder: they are the ones that have to get in.
for (const mv of Object.values(MOVES)) if (mv.kind === 'melee' && mv.dmg) mv.dmg = Math.round(mv.dmg * 1.1);
for (const [id, mv] of Object.entries(MOVES)) mv.id = id; // carried by the one-use copies the engine makes, for messages between clients
// ---- from the move notes ----
// selfFx / selfScale: a piece of art played on the user as the move goes off. pillarStill: the standing rock is the move's own
// first frame. grow.random: the held size jumps about at random. toss: both mons go up, out of reach, and come down together.
// bondLink: Destiny Bond has to land; the two are then tied for that long. puff: particles thrown out all round.
// tintFill paints the art one flat colour.
give('rollout', { fx: '0182_rock_wrecker', seqs: ['001'], scale: 0.6, fps: 14, swell: undefined, rollGrow: 0.14 });
give('rockTomb', { pillarStill: true });
give('rockBlast', { kind: 'projectile', fx: '0182_rock_wrecker', seqs: ['001'], scale: 0.45, fps: 30, speed: 300, range: 250, radius: 8, dmg: 11, cost: 12, charge: 0.08, light: true, impactFx: '0002_rock_rubble_burst', impactSeqs: ['000'], impactScale: 0.5 });
give('closeCombat', { fx: '0147_red_fist_impact', seqs: ['000'], scale: 0.7 });
give('copycat', { chargeFx: '0038_white_sparkle_twinkle', chargeSeqs: ['000'], chargeScale: 0.7 });
give('detect', { fx: '0038_white_sparkle_twinkle', seqs: ['000'], slice: [0, 14], scale: 1, fps: 30 });
give('destinyBond', { kind: 'mid', tag: 'curse', bond: undefined, bondLink: 6, range: 120, radius: 20, dmg: 2 });
give('dragonTail', { selfFx: ['0225_fire_whirl_column', '000'], selfScale: 0.35 });
MOVES.earthquake.grow = { ...MOVES.earthquake.grow, cycle: true, rate: 2.2 };
MOVES.magnitude.grow = { ...MOVES.magnitude.grow, cycle: false, random: true };
give('roar', { kind: 'melee', lunge: false, fx: '0060_hyper_voice', seqs: ['002'], rotate: true, scale: 2, fps: 20, reach: 22, radius: 36 });
give('seismicToss', { fixedDmg: undefined, toss: { time: 0.6, dmg: 28 }, impactFx: '0002_rock_rubble_burst', impactSeqs: ['000'] });
give('snore', { fx: '0104_metal_z', seqs: ['000'], scale: 1.4, rotate: false, fps: 14, puff: 12 });
give('fly', { fx: '0251_brave_bird_silhouette', seqs: ['000'], fps: 10, tintFill: 0xffffff, fly: 3.5 });
give('megahorn', { impactFx: '0026_yellow_starburst_flash', impactSeqs: ['000'] });
// dir8: the art comes in eight facings, sequences `dir8` to `dir8 + 7` in the order the mon sheets use (S, SE, E, NE, N, NW, W, SW);
// the one matching the aim is played, unrotated.
give('bite', { dir8: 0 });
give('roar', { fx: '0121_sound_crack', seqs: ['000'], dir8: 0, rotate: false, scale: 1.3, fps: 24 });
// Fly is the white bird: the sprite facing up as it climbs out of sight, the one facing down as it dives back.
give('fly', { fx: '0045_ice_wings', seqs: ['004'], dir8: 0, tintFill: undefined });
// trail: a rolling move kicks up the same rubble Dig does; bounceFx plays where it glances off a wall.
give('rollout', { trail: true, bounceFx: ['0108_razor_leaf_wind', '015'] });
give('triAttack', { chargeFx: '0226_ringed_orb_pulse', chargeSeqs: ['000'] });
give('taunt torment', { impactFx: '0153_rainbow_confetti_burst', impactSeqs: ['000'], impactFps: 40 });
// The sparkle that plays on a mon as it is healed.
export const HEAL = { fx: ['0125_moonlight', '002'] };
// Dragon Dance: the ring that swells toward each beat, and the flame that answers a step in time.
export const DANCE = { cue: ['0141_waterfall', '002'], hit: ['0225_fire_whirl_column', '000'] };

// Moves added in the latest pass: the move viewer badges them NEW. Clear this list when the next batch goes in.
give('dazzlingGleam powderSnow', { fresh: true });

// First entry is equipped by default.
export const MOVESETS = {
  chikorita: ['razorLeaf', 'magicalLeaf', 'gigaDrain', 'bulletSeed', 'petalDance', 'vineWhip', 'petalBlizzard', 'leechSeed', 'aromatherapy', 'protect', 'helpingHand', 'seedBomb', 'ingrain', 'substitute', 'stunSpore', 'reflect', 'lightScreen', 'flail', 'poisonPowder', 'solarBeam', 'woodHammer'],
  bulbasaur: ['leafStorm', 'grassKnot', 'magicalLeaf', 'powerWhip', 'energyBall', 'gigaDrain', 'petalDance', 'bulletSeed', 'sludgeBomb', 'vineWhip', 'petalBlizzard', 'leechSeed', 'protect', 'rest', 'seedBomb', 'sludgeWave', 'ingrain', 'sleepPowder', 'substitute', 'stunSpore', 'bide', 'stringShot', 'sleepTalk', 'snore', 'razorLeaf', 'doubleEdge', 'poisonPowder', 'solarBeam'],
  treecko: ['leafBlade', 'magicalLeaf', 'grassKnot', 'xScissor', 'nightSlash', 'quickAttack', 'bulletSeed', 'gigaDrain', 'energyBall', 'dualChop', 'aerialAce', 'slash', 'leechSeed', 'swordsDance', 'agility', 'protect', 'doubleTeam', 'seedBomb', 'megaPunch', 'cut', 'furyCutter', 'substitute', 'stunSpore', 'acrobatics', 'detect', 'dragonDance', 'leafStorm'],
  charmander: ['flameBurst', 'ember', 'fireFang', 'fireSpin', 'flamethrower', 'dragonClaw', 'fireBlast', 'dragonBreath', 'outrage', 'overheat', 'incinerate', 'blastBurn', 'slash', 'furySwipes', 'focusBlast', 'focusPunch', 'dragonRush', 'swordsDance', 'protect', 'megaPunch', 'megaKick', 'smokescreen', 'cut', 'firePunch', 'substitute', 'fly', 'acrobatics', 'seismicToss', 'dragonDance', 'dragonTail', 'bellyDrum', 'scaryFace', 'airSlash', 'shadowClaw', 'flareBlitz'],
  torchic: ['fireSpin', 'ember', 'flameBurst', 'flamethrower', 'willOWisp', 'quickAttack', 'aerialAce', 'overheat', 'incinerate', 'blastBurn', 'featherDance', 'swordsDance', 'agility', 'protect', 'doubleTeam', 'firePunch', 'substitute', 'bounce', 'closeCombat', 'brickBreak', 'endure', 'reversal', 'batonPass', 'braveBird', 'slash', 'focusEnergy', 'blazeKick', 'flareBlitz'],
  squirtle: ['bubble', 'waterPulse', 'bite', 'hydroPump', 'whirlpool', 'iceArmor', 'surf', 'bubbleBeam', 'brine', 'blizzard', 'avalanche', 'focusPunch', 'iceBeam', 'ironDefense', 'protect', 'rest', 'rainDance', 'waterfall', 'yawn', 'aquaRing', 'haze', 'lifeDew', 'substitute', 'waterSpout', 'aquaJet', 'seismicToss', 'bide', 'rollout', 'flail', 'waterGun', 'flashCannon'],
  mudkip: ['waterPulse', 'bite', 'mudBomb', 'whirlpool', 'hydroPump', 'surf', 'earthquake', 'rockSlide', 'blizzard', 'iceBall', 'avalanche', 'sandTomb', 'rockTomb', 'focusPunch', 'iceBeam', 'protect', 'rest', 'rainDance', 'waterfall', 'yawn', 'aquaRing', 'substitute', 'barrier', 'aquaJet', 'dig', 'rollout', 'sleepTalk', 'snore', 'waterGun', 'hammerArm', 'rockThrow', 'bide', 'mudShot'],
  ralts: ['confusion', 'psybeam', 'shadowBall', 'psychic', 'hypnosis', 'futureSight', 'drainingKiss', 'moonblast', 'willOWisp', 'shadowSneak', 'thunderbolt', 'chargeBeam', 'shockWave', 'focusBlast', 'wish', 'protect', 'doubleTeam', 'sing', 'healBell', 'meanLook', 'confuseRay', 'disable', 'flash', 'luckyChant', 'auraSphere', 'nightShade', 'lifeDew', 'attract', 'gravity', 'substitute', 'cosmicPower', 'reflect', 'lightScreen', 'signalBeam', 'destinyBond', 'torment', 'magicalLeaf', 'psychoCut', 'nightSlash', 'closeCombat', 'leafBlade', 'teleport', 'healPulse', 'dreamEater', 'dazzlingGleam', 'kinesis'],
  eevee: ['swift', 'bite', 'quickAttack', 'shadowBall', 'hyperVoice', 'wish', 'protect', 'doubleTeam', 'healBell', 'payDay', 'rest', 'rainDance', 'focusEnergy', 'helpingHand', 'yawn', 'attract', 'substitute', 'dig', 'reflect', 'detect', 'roar', 'copycat', 'endure', 'flail', 'sleepTalk', 'snore', 'batonPass', 'doubleEdge'],
  axew: ['dualChop', 'dragonPulse', 'outrage', 'dragonClaw', 'bite', 'nightSlash', 'xScissor', 'slash', 'focusBlast', 'dracoMeteor', 'swordsDance', 'protect', 'focusEnergy', 'cut', 'gigaImpact', 'substitute', 'psychoCut', 'closeCombat', 'brickBreak', 'dragonDance', 'dragonTail', 'roar', 'scaryFace', 'taunt'],
  zorua: ['shadowClaw', 'snarl', 'nightDaze', 'scaryFace', 'darkPulse', 'shadowBall', 'nightSlash', 'hex', 'furySwipes', 'uproar', 'swordsDance', 'agility', 'protect', 'doubleTeam', 'confuseRay', 'nightShade', 'cut', 'taunt', 'substitute', 'dig', 'suckerPunch', 'bounce', 'uTurn', 'detect', 'phantomForce', 'spite', 'torment', 'roar', 'copycat', 'knockOff'],
  starly: ['gust', 'airSlash', 'aerialAce', 'whirlwind', 'quickAttack', 'uproar', 'featherDance', 'tailwind', 'agility', 'protect', 'doubleTeam', 'braveBird', 'helpingHand', 'roost', 'substitute', 'fly', 'acrobatics', 'uTurn', 'hurricane', 'closeCombat'],
  corphish: ['crabhammer', 'bubbleBeam', 'razorShell', 'surf', 'bubble', 'waterPulse', 'nightSlash', 'xScissor', 'blizzard', 'slash', 'iceBeam', 'swordsDance', 'ironDefense', 'protect', 'rainDance', 'waterfall', 'substitute', 'aquaJet', 'brickBreak', 'dragonDance', 'waterGun', 'taunt', 'swift', 'knockOff'],
  cubone: ['bonemerang', 'earthquake', 'rockSlide', 'stoneEdge', 'fireBlast', 'rockTomb', 'focusPunch', 'incinerate', 'swordsDance', 'ironDefense', 'protect', 'rest', 'focusEnergy', 'stealthRock', 'megaPunch', 'substitute', 'dig', 'dynamicPunch', 'seismicToss', 'bide', 'brickBreak', 'endure', 'bellyDrum', 'boneRush', 'doubleEdge'],
  nidoran: ['poisonSting', 'poisonJab', 'sludgeBomb', 'bite', 'thunderbolt', 'thunder', 'shockWave', 'protect', 'doubleTeam', 'helpingHand', 'sludgeWave', 'substitute', 'toxicSpikes', 'furySwipes', 'megahorn'],
  venipede: ['poisonSting', 'xScissor', 'poisonJab', 'sludgeBomb', 'bite', 'gyroBall', 'crossPoison', 'bugBite', 'swordsDance', 'agility', 'ironDefense', 'protect', 'doubleTeam', 'pinMissile', 'megahorn', 'furyCutter', 'substitute', 'toxicSpikes', 'signalBeam', 'rollout', 'batonPass', 'venoshock', 'doubleEdge'],
  rotom: ['thunderShock', 'thunderbolt', 'thunder', 'chargeBeam', 'shockWave', 'discharge', 'shadowBall', 'hex', 'willOWisp', 'darkPulse', 'doubleTeam', 'protect', 'confuseRay', 'flash', 'nightShade', 'charge', 'substitute', 'suckerPunch', 'lightScreen', 'signalBeam', 'phantomForce', 'spite', 'magnetPull', 'uproar', 'electroBall'],
  riolu: ['forcePalm', 'quickAttack', 'drainPunch', 'focusPunch', 'focusBlast', 'bite', 'metalClaw', 'swordsDance', 'agility', 'doubleTeam', 'protect', 'focusEnergy', 'helpingHand', 'auraSphere', 'megaPunch', 'megaKick', 'crossChop', 'substitute', 'meteorMash', 'dynamicPunch', 'machPunch', 'circleThrow', 'closeCombat', 'detect', 'bulletPunch', 'brickBreak', 'copycat', 'endure', 'reversal', 'dragonPulse', 'lifeDew', 'healPulse', 'counter', 'boneRush'],
  combee: ['attackOrder', 'gust', 'bugBite', 'defendOrder', 'healOrder', 'airSlash', 'furyCutter', 'tailwind', 'agility', 'protect', 'substitute', 'powerGem', 'uTurn', 'hurricane', 'signalBeam', 'destinyBond', 'stringShot', 'bugBuzz', 'poisonSting', 'confuseRay', 'furySwipes', 'slash'],
  clefairy: ['metronome', 'moonblast', 'drainingKiss', 'sing', 'wakeUpSlap', 'megaPunch', 'megaKick', 'attract', 'swift', 'gravity', 'softBoiled', 'moonlight', 'wish', 'lifeDew', 'healBell', 'helpingHand', 'luckyChant', 'flash', 'thunderbolt', 'protect', 'doubleTeam', 'substitute', 'meteorMash', 'triAttack', 'cosmicPower', 'reflect', 'lightScreen', 'bounce', 'signalBeam', 'seismicToss', 'rollout', 'copycat', 'sleepTalk', 'snore', 'waterGun', 'dazzlingGleam'],
  rhyhorn: ['rockThrow', 'stoneEdge', 'earthquake', 'megahorn', 'rockSlide', 'rockBlast', 'stealthRock', 'hammerArm', 'rockTomb', 'rockWrecker', 'gigaImpact', 'ironDefense', 'rest', 'protect', 'substitute', 'iceFang', 'thunderFang', 'dig', 'seismicToss', 'bide', 'rollout', 'magnitude', 'dragonTail', 'roar', 'scaryFace', 'poisonJab'],
  scyther: ['furyCutter', 'cut', 'xScissor', 'slash', 'nightSlash', 'aerialAce', 'airSlash', 'quickAttack', 'bugBite', 'razorWind', 'gigaImpact', 'swordsDance', 'agility', 'focusEnergy', 'roost', 'doubleTeam', 'protect', 'substitute', 'psychoCut', 'lightScreen', 'acrobatics', 'uTurn', 'closeCombat', 'detect', 'bulletPunch', 'reversal', 'batonPass', 'bugBuzz', 'metalClaw', 'ironDefense'],
  joltik: ['bugBite', 'spiderWeb', 'thunderbolt', 'discharge', 'chargeBeam', 'shockWave', 'furyCutter', 'xScissor', 'pinMissile', 'crossPoison', 'slash', 'charge', 'agility', 'doubleTeam', 'protect', 'substitute', 'suckerPunch', 'lightScreen', 'bounce', 'signalBeam', 'stringShot', 'stickyWeb', 'magnetPull', 'bugBuzz', 'electroweb', 'electroBall'],
  skarmory: ['metalClaw', 'airSlash', 'aerialAce', 'flashCannon', 'whirlwind', 'braveBird', 'stealthRock', 'nightSlash', 'slash', 'cut', 'gigaImpact', 'roost', 'ironDefense', 'agility', 'swordsDance', 'tailwind', 'taunt', 'protect', 'substitute', 'fly', 'hurricane', 'torment', 'swift', 'spikes', 'steelWing'],
  aron: ['metalClaw', 'flashCannon', 'stoneEdge', 'rockSlide', 'earthquake', 'rockBlast', 'sandTomb', 'rockTomb', 'avalanche', 'ironDefense', 'protect', 'rest', 'stealthRock', 'gigaImpact', 'substitute', 'dig', 'rollout', 'magnetPull', 'dragonTail', 'roar', 'endure', 'doubleEdge', 'ironTail'],
  cacnea: ['needleArm', 'poisonSting', 'magicalLeaf', 'acid', 'bulletSeed', 'gigaDrain', 'leafStorm', 'energyBall', 'poisonJab', 'swift', 'shadowBall', 'grassKnot', 'darkPulse', 'hyperBeam', 'drainPunch', 'scaryFace', 'focusBlast', 'focusPunch', 'leechSeed', 'swordsDance', 'protect', 'doubleTeam', 'rest', 'disable', 'flash', 'rainDance', 'helpingHand', 'seedBomb', 'pinMissile', 'megaPunch', 'megaKick', 'ingrain', 'cut', 'furyCutter', 'gigaImpact', 'attract', 'taunt', 'substitute', 'stunSpore', 'suckerPunch', 'destinyBond', 'spikes', 'woodHammer'],
  alolanvulpix: ['iceShard', 'iceArmor', 'auroraBeam', 'iceFang', 'drainingKiss', 'moonblast', 'iceBeam', 'blizzard', 'swift', 'energyBall', 'hypnosis', 'darkPulse', 'hyperBeam', 'hex', 'avalanche', 'agility', 'protect', 'doubleTeam', 'healBell', 'confuseRay', 'rest', 'disable', 'rainDance', 'helpingHand', 'gigaImpact', 'attract', 'substitute', 'icicleCrash', 'spite', 'roar', 'auroraVeil', 'dazzlingGleam', 'powderSnow'],
  heracross: ['megahorn', 'closeCombat', 'brickBreak', 'bugBite', 'pinMissile', 'nightSlash', 'aerialAce', 'furyCutter', 'seismicToss', 'circleThrow', 'reversal', 'focusPunch', 'bulletSeed', 'stoneEdge', 'rockTomb', 'earthquake', 'bugBuzz', 'swordsDance', 'detect', 'endure', 'bide', 'substitute', 'protect', 'counter'],
  porygon: ['triAttack', 'psybeam', 'lockOn', 'thunderShock', 'thunderbolt', 'psychic', 'discharge', 'swift', 'shadowBall', 'iceArmor', 'darkPulse', 'hyperBeam', 'aerialAce', 'uproar', 'thunder', 'blizzard', 'chargeBeam', 'shockWave', 'iceBeam', 'agility', 'protect', 'doubleTeam', 'rest', 'flash', 'rainDance', 'barrier', 'charge', 'gigaImpact', 'gravity', 'substitute', 'reflect', 'signalBeam', 'zapCannon', 'explosion'],
  phantump: ['woodHammer', 'confuseRay', 'ingrain', 'leechSeed', 'willOWisp', 'destinyBond', 'phantomForce', 'shadowClaw', 'shadowBall', 'energyBall', 'gigaDrain', 'solarBeam', 'seedBomb', 'grassKnot', 'magicalLeaf', 'darkPulse', 'psychic', 'dreamEater', 'hex', 'poisonJab', 'xScissor', 'rockSlide', 'earthquake', 'drainPunch', 'focusBlast', 'hyperBeam', 'gigaImpact', 'protect', 'rest', 'substitute', 'reflect', 'spite', 'disable', 'attract', 'sleepTalk', 'snore', 'endure', 'leafStorm'],
  munchlax: ['explosion', 'metronome', 'payDay', 'bellyDrum', 'rollout', 'flail', 'bite', 'doubleEdge', 'counter', 'whirlwind', 'yawn', 'rest', 'snore', 'sleepTalk', 'gigaImpact', 'hammerArm', 'earthquake', 'rockSlide', 'rockTomb', 'firePunch', 'megaPunch', 'megaKick', 'focusPunch', 'brickBreak', 'fireBlast', 'flamethrower', 'iceBeam', 'blizzard', 'thunder', 'thunderbolt', 'shadowBall', 'solarBeam', 'hyperBeam', 'surf', 'psychic', 'protect', 'rainDance', 'seedBomb', 'outrage', 'uproar', 'seismicToss', 'dynamicPunch', 'bide', 'endure', 'substitute'],
  staryu: ['starShoot', 'hydroBurst', 'swift', 'waterGun', 'bubbleBeam', 'hydroPump', 'powerGem', 'cosmicPower', 'gyroBall', 'confuseRay', 'lightScreen', 'reflect', 'psychic', 'psybeam', 'brine', 'waterfall', 'surf', 'waterPulse', 'teleport', 'flash', 'dazzlingGleam', 'signalBeam', 'gravity', 'thunderbolt', 'thunder', 'iceBeam', 'blizzard', 'hyperBeam', 'gigaImpact', 'protect', 'rest', 'rainDance', 'substitute'],
  honedge: ['slash', 'nightSlash', 'shadowSneak', 'shadowClaw', 'furyCutter', 'aerialAce', 'swordsDance', 'ironDefense', 'flashCannon', 'gyroBall', 'rockSlide', 'brickBreak', 'shadowBall', 'protect', 'rest', 'substitute', 'gigaImpact', 'hyperBeam', 'psychoCut', 'closeCombat', 'destinyBond', 'cut', 'reflect', 'attract', 'sleepTalk', 'snore', 'endure', 'airSlash'],
  torkoal: ['eruption', 'lavaPlume', 'explosion', 'ember', 'flamethrower', 'fireSpin', 'fireBlast', 'overheat', 'incinerate', 'willOWisp', 'smokescreen', 'ironDefense', 'stealthRock', 'yawn', 'protect', 'gyroBall', 'flail', 'rest', 'earthquake', 'rockSlide', 'rockTomb', 'stoneEdge', 'solarBeam', 'sludgeBomb', 'hyperBeam', 'gigaImpact', 'substitute', 'endure', 'sleepTalk', 'snore'],
  hawlucha: ['detect', 'roost', 'aerialAce', 'bounce', 'featherDance', 'braveBird', 'swordsDance', 'taunt', 'acrobatics', 'fly', 'brickBreak', 'drainPunch', 'focusBlast', 'poisonJab', 'xScissor', 'uTurn', 'rockSlide', 'rockTomb', 'stoneEdge', 'steelWing', 'closeCombat', 'crossChop', 'agility', 'megaKick', 'megaPunch', 'firePunch', 'gigaImpact', 'protect', 'rest', 'substitute', 'grassKnot', 'dig', 'reversal', 'tailwind', 'endure', 'attract', 'sleepTalk', 'snore'],
};
// Eevee (and Cubone, between its two Marowaks) picks one evolution and keeps it for good: from then on it has its own moves plus only that evolution's, never
// another's. The choice lives with the player's save (session.mons.eevee.branch); see CHOICES in evolutions.js.
export const BRANCH_MOVES = {
  // Cubone's two: the Marowak of Kanto, or of Alola (fire and ghost)
  marowak: ['gigaImpact', 'hyperBeam', 'outrage', 'firePunch', 'megaKick', 'knockOff'],
  alolanmarowak: ['flareBlitz', 'willOWisp', 'hex', 'fireSpin', 'shadowBall', 'flamethrower', 'firePunch', 'darkPulse', 'dreamEater', 'thunderbolt', 'thunder', 'gigaImpact', 'hyperBeam', 'outrage', 'spite', 'ember', 'overheat'],
  vaporeon: ['bubbleBeam', 'surf', 'hydroPump', 'auroraBeam', 'waterPulse', 'bubble', 'whirlpool', 'iceArmor', 'hyperBeam', 'brine', 'blizzard', 'iceBeam', 'waterfall', 'aquaRing', 'haze', 'gigaImpact', 'signalBeam', 'waterGun'],
  jolteon: ['thunderShock', 'thunderbolt', 'thunderFang', 'thunder', 'discharge', 'hyperBeam', 'chargeBeam', 'shockWave', 'agility', 'flash', 'pinMissile', 'charge', 'gigaImpact', 'signalBeam'],
  flareon: ['ember', 'flamethrower', 'fireFang', 'fireSpin', 'lavaPlume', 'fireBlast', 'willOWisp', 'hyperBeam', 'scaryFace', 'overheat', 'incinerate', 'gigaImpact'],
  espeon: ['confusion', 'psybeam', 'psychic', 'futureSight', 'powerGem', 'magicalLeaf', 'grassKnot', 'drainingKiss', 'hyperBeam', 'confuseRay', 'flash', 'cut', 'gigaImpact', 'gravity', 'signalBeam'],
  umbreon: ['darkPulse', 'snarl', 'moonlight', 'meanLook', 'psychic', 'hyperBeam', 'scaryFace', 'confuseRay', 'flash', 'cut', 'gigaImpact', 'taunt', 'suckerPunch', 'spite', 'torment'],
  leafeon: ['razorLeaf', 'leafBlade', 'leafStorm', 'gigaDrain', 'magicalLeaf', 'grassKnot', 'bulletSeed', 'energyBall', 'hyperBeam', 'xScissor', 'aerialAce', 'leechSeed', 'swordsDance', 'flash', 'seedBomb', 'furyCutter', 'gigaImpact'],
  glaceon: ['iceShard', 'iceArmor', 'iceFang', 'iceBeam', 'blizzard', 'waterPulse', 'hyperBeam', 'avalanche', 'barrier', 'haze', 'gigaImpact', 'gravity', 'signalBeam', 'icicleCrash'],
  sylveon: ['drainingKiss', 'moonblast', 'magicalLeaf', 'psychic', 'hyperBeam', 'flash', 'cut', 'gigaImpact'],
};
// The moves of each set that the mon (or a form it evolves into) learns by itself as it levels up in the main games.
// Everything else in its set is taught: a TM, in this game's terms (machines, tutors and egg moves alike).
const NATURAL = {
  chikorita: 'razorLeaf magicalLeaf petalDance petalBlizzard aromatherapy reflect lightScreen poisonPowder solarBeam',
  bulbasaur: 'vineWhip leechSeed sleepPowder petalDance petalBlizzard seedBomb razorLeaf doubleEdge poisonPowder solarBeam',
  treecko: 'leafBlade quickAttack gigaDrain energyBall dualChop xScissor nightSlash slash agility detect furyCutter leafStorm',
  charmander: 'flameBurst ember fireFang fireSpin flamethrower dragonClaw dragonBreath slash smokescreen scaryFace airSlash shadowClaw flareBlitz',
  torchic: 'ember fireSpin flameBurst flamethrower quickAttack aerialAce featherDance bounce reversal braveBird slash focusEnergy blazeKick flareBlitz',
  squirtle: 'bubble waterGun bite waterPulse hydroPump ironDefense protect rainDance flashCannon',
  mudkip: 'waterGun waterPulse mudBomb whirlpool hydroPump surf earthquake rockSlide protect hammerArm rockThrow bide mudShot',
  ralts: 'confusion psybeam psychic hypnosis futureSight drainingKiss moonblast wish doubleTeam luckyChant lifeDew magicalLeaf psychoCut nightSlash closeCombat leafBlade teleport healPulse dreamEater',
  eevee: 'swift bite quickAttack helpingHand batonPass copycat focusEnergy doubleEdge',
  axew: 'dualChop dragonPulse outrage dragonClaw bite slash swordsDance dragonDance gigaImpact scaryFace taunt',
  zorua: 'scaryFace furySwipes nightDaze nightSlash agility taunt torment uTurn knockOff',
  starly: 'gust quickAttack whirlwind aerialAce agility braveBird closeCombat doubleTeam',
  corphish: 'crabhammer bubbleBeam razorShell bubble nightSlash swordsDance protect waterGun taunt swift knockOff',
  cubone: 'bonemerang focusEnergy boneRush doubleEdge',
  nidoran: 'poisonSting poisonJab bite helpingHand toxicSpikes furySwipes megahorn',
  venipede: 'poisonSting bugBite protect agility ironDefense megahorn rollout batonPass venoshock doubleEdge',
  rotom: 'thunderShock discharge charge confuseRay doubleTeam shockWave hex substitute uproar electroBall',
  riolu: 'forcePalm quickAttack metalClaw swordsDance auraSphere meteorMash closeCombat detect copycat endure reversal helpingHand dragonPulse lifeDew healPulse counter boneRush',
  combee: 'attackOrder gust bugBite defendOrder healOrder airSlash furyCutter powerGem destinyBond bugBuzz poisonSting confuseRay furySwipes slash',
  clefairy: 'metronome moonblast sing wakeUpSlap gravity moonlight luckyChant cosmicPower meteorMash lifeDew copycat',
  rhyhorn: 'rockThrow stoneEdge earthquake megahorn rockBlast hammerArm rockWrecker scaryFace poisonJab',
  scyther: 'furyCutter xScissor slash nightSlash airSlash quickAttack razorWind swordsDance agility focusEnergy doubleTeam bulletPunch metalClaw ironDefense',
  joltik: 'bugBite spiderWeb discharge furyCutter slash agility suckerPunch signalBeam stringShot stickyWeb bugBuzz electroweb electroBall',
  skarmory: 'metalClaw airSlash slash nightSlash agility ironDefense swift spikes steelWing',
  aron: 'metalClaw rockTomb rockSlide ironDefense protect roar doubleEdge ironTail',
  cacnea: 'needleArm poisonSting leechSeed ingrain suckerPunch pinMissile destinyBond energyBall spikes',
  alolanvulpix: 'iceShard auroraBeam iceBeam blizzard confuseRay hex spite disable roar auroraVeil dazzlingGleam powderSnow',
  heracross: 'megahorn closeCombat brickBreak pinMissile nightSlash aerialAce reversal bulletSeed swordsDance endure counter',
  porygon: 'triAttack psybeam lockOn thunderShock discharge signalBeam agility hyperBeam zapCannon',
  phantump: 'confuseRay ingrain leechSeed willOWisp destinyBond phantomForce woodHammer shadowClaw',
  munchlax: 'metronome bellyDrum rollout flail bite yawn rest snore sleepTalk gigaImpact hammerArm',
  staryu: 'starShoot hydroBurst swift waterGun bubbleBeam hydroPump powerGem cosmicPower gyroBall confuseRay lightScreen reflect psybeam brine',
  honedge: 'slash nightSlash shadowSneak furyCutter aerialAce swordsDance ironDefense protect',
  torkoal: 'ember smokescreen fireSpin lavaPlume flamethrower ironDefense protect flail eruption',
  hawlucha: 'detect roost aerialAce bounce featherDance braveBird swordsDance taunt',
  // Cubone's two Marowaks
  marowak: 'knockOff',
  alolanmarowak: 'flareBlitz willOWisp hex fireSpin ember',
  // Eevee's evolutions
  vaporeon: 'hydroPump auroraBeam waterPulse aquaRing haze',
  jolteon: 'thunderShock thunderFang thunder discharge agility pinMissile',
  flareon: 'ember flamethrower fireFang fireSpin lavaPlume scaryFace',
  espeon: 'confusion psybeam psychic futureSight powerGem',
  umbreon: 'darkPulse snarl moonlight meanLook confuseRay',
  leafeon: 'razorLeaf leafBlade gigaDrain magicalLeaf leechSeed swordsDance',
  glaceon: 'iceShard iceFang blizzard barrier',
  sylveon: 'drainingKiss moonblast',
};
for (const k of Object.keys(NATURAL)) NATURAL[k] = new Set(NATURAL[k].split(' '));
// Is this move one the species has to be taught (a TM) rather than one it learns by itself? A species' first move is
// always its own. `branch`: the evolution a branching species has taken; that form's own moves are judged by its list.
export const isTM = (speciesId, id, branch) => {
  const own = MOVESETS[speciesId] ?? [];
  if (own[0] === id) return false;
  if (own.includes(id)) return !NATURAL[speciesId]?.has(id);
  return !NATURAL[branch]?.has(id);
};
// branch: the evolution a mon of this species has taken, if it branches
export const movesOf = (speciesId, branch) => [...(MOVESETS[speciesId] ?? ['bite']), ...(BRANCH_MOVES[branch] ?? [])];

const files = (fx, seq) =>
  Object.keys(urls)
    .filter((p) => p.includes(`/${fx}/${seq}/`))
    .map((p) => ({ tick: +p.slice(-7, -4), key: `vfx-${fx}-${seq}-${p.slice(-7, -4)}`, url: urls[p] }))
    .sort((a, b) => a.tick - b.tick);

// A move marked `gray` shows its art with the colour taken out (and then takes its tint, if it has one, cleanly): Iron
// Tail is Dragon Rush's art in steel, Spikes is Toxic Spikes' without the poison. The grey copies are made the first
// time the move is shown, from frames that have loaded by then.
export function grayFrames(scene, mv) {
  if (!mv.gray || mv.grayed || !mv.frames?.length || !mv.frames.every((key) => scene.textures.exists(key))) return;
  mv.frames = mv.frames.map((key) => {
    const to = `${key}-gray`;
    if (scene.textures.exists(to)) return to;
    const src = scene.textures.get(key).getSourceImage(), c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    const img = g.getImageData(0, 0, c.width, c.height), px = img.data;
    for (let i = 0; i < px.length; i += 4) px[i] = px[i + 1] = px[i + 2] = Math.min(255, Math.round((px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11) * 1.1 + 12));
    g.putImageData(img, 0, 0);
    scene.textures.addCanvas(to, c);
    return to;
  });
  mv.grayed = true;
}

// ---- loading the art ----
// Every move's frame lists are worked out up front (preloadMoves), but the pictures themselves need not all be loaded:
// there are thousands, and a phone's browser gives up long before it holds them all. With `lazy`, only the few effects
// every fight uses are loaded then; a move's own are loaded when it is needed (loadMoves before a fight, for everyone's
// moves; ensureMove the moment something else is about to be used). The developers' tools load the lot as before.
const FRAME_URL = new Map(); // texture key -> where its picture is

// Every texture key a move draws with.
const keysOf = (mv) => [
  mv.frames, mv.chargeFrames, mv.bonusFrames, mv.impactFrames, mv.altFrames, mv.addFrames, mv.landFrames, mv.endFrames, mv.selfFrames, mv.bounceFrames, mv.pillarFrames,
  ...(mv.dirFrames ?? []), ...(mv.cycle ?? []).map((v) => v.frames),
].flatMap((list) => list ?? []);
// The other moves whose art a move borrows as it plays out.
const needs = (mv) => [...(mv.blaze ? [MOVES.fireSpin] : []), ...(mv.summon?.moves ?? []).map((id) => MOVES[id])];
const missing = (scene, mv) => [...new Set([mv, ...needs(mv)].flatMap(keysOf))].filter((key) => FRAME_URL.has(key) && !scene.textures.exists(key));

// Is all of a move's art in?
export const moveReady = (scene, mv) => !missing(scene, mv).length;

// Queue the art of these moves on a scene's loader (what is not in yet). From a scene's preload that is all it takes;
// anywhere else, follow with scene.load.start(). Returns how many pictures were queued.
export function loadMoves(scene, ids) {
  const queued = scene.load.list?.entries ?? [];
  let n = 0;
  for (const key of new Set(ids.map((id) => MOVES[id]).filter(Boolean).flatMap((mv) => missing(scene, mv)))) {
    if ([...queued].some((f) => f.key === key)) continue; // already on its way
    scene.load.image(key, FRAME_URL.get(key));
    n++;
  }
  return n;
}

// Is this move ready to be used? If not, its art is sent for and the answer is no: ask again in a moment.
export function ensureMove(scene, mv) {
  if (moveReady(scene, mv)) return true;
  if (loadMoves(scene, [mv.id, ...needs(mv).map((q) => q.id)])) scene.load.start();
  return false;
}

export function preloadMoves(scene, lazy = false) {
  let always = false; // the shared effects below are loaded whatever `lazy` says
  // file numbers are ticks; a skipped number holds the previous frame
  const build = (fx, seqs) => {
    const frames = [];
    for (const seq of seqs ?? []) {
      const fs = files(fx, seq);
      fs.forEach((f, i) => {
        FRAME_URL.set(f.key, f.url);
        if ((!lazy || always) && !scene.textures.exists(f.key)) scene.load.image(f.key, f.url);
        const hold = (fs[i + 1]?.tick ?? f.tick + 1) - f.tick;
        for (let n = 0; n < hold; n++) frames.push(f.key);
      });
    }
    return frames;
  };
  for (const mv of Object.values(MOVES)) {
    mv.frames = build(mv.fx, mv.seqs);
    if (mv.slice) mv.frames = mv.frames.slice(...mv.slice);
    mv.chargeFrames = build(mv.chargeFx ?? mv.fx, mv.chargeSeqs);
    mv.bonusFrames = build(mv.bonusFx, mv.bonusSeqs);
    mv.impactFrames = build(mv.impactFx ?? mv.fx, mv.impactSeqs);
    mv.altFrames = build(mv.fx, mv.altSeqs);
    mv.addFrames = build(mv.addFx ?? mv.fx, mv.addSeqs);
    mv.landFrames = build(mv.landFx ?? mv.fx, mv.landSeqs);
    if (mv.still) mv.frames = Array(mv.still).fill(mv.frames[0]); // one frame held: art whose own frames jitter
    mv.endFrames = build(mv.fx, mv.endSeqs);
    for (const v of mv.cycle ?? []) v.frames = build(mv.fx, [v.seq]);
  }
  always = true;
  LEECH.seededFrames = build(LEECH.seeded[0], [LEECH.seeded[1]]);
  LEECH.healFrames = build(LEECH.heal[0], [LEECH.heal[1]]);
  EMPOWER.frames = build(EMPOWER.fx[0], [EMPOWER.fx[1]]);
  POWERUP.frames = build(POWERUP.fx[0], [POWERUP.fx[1]]);
  CANCEL.frames = build(CANCEL.fx[0], [CANCEL.fx[1]]).slice(...CANCEL.slice);
  PARRY.hitFrames = build(PARRY.hit[0], [PARRY.hit[1]]);
  SHATTER.frames = build(SHATTER.fx[0], [SHATTER.fx[1]]);
  HEAL.frames = build(HEAL.fx[0], [HEAL.fx[1]]);
  DANCE.cueFrames = build(DANCE.cue[0], [DANCE.cue[1]]);
  DANCE.hitFrames = build(DANCE.hit[0], [DANCE.hit[1]]);
  always = false;
  for (const mv of Object.values(MOVES)) if (mv.dir8 !== undefined) mv.dirFrames = Array.from({ length: 8 }, (_, k) => build(mv.fx, [String(mv.dir8 + k).padStart(3, '0')]));
  for (const mv of Object.values(MOVES)) {
    mv.selfFrames = mv.selfFx ? build(mv.selfFx[0], [mv.selfFx[1]]) : [];
    mv.bounceFrames = mv.bounceFx ? build(mv.bounceFx[0], [mv.bounceFx[1]]) : [];
    mv.pillarFrames = mv.icePillar ? build(mv.icePillar.fx, ['000']).slice(3) : []; // (its first picture is a stray spark)
  }
}
