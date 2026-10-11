// The walk-around places between battles. All positions are in the place's own art pixels; the Hub scene centres art
// narrower than the screen and scrolls art that is wider.
// walk / block work as in maps.js. entries are where the player appears (dir is a sheet row: 0 faces down, 4 faces up),
// doors are floor rects that lead somewhere, spots are things to interact with from within `r` pixels.
export const AREAS = {
  // the room inside Sharpedo Bluff: your bed on the right, your partner's on the left, the way to the dojo up the steps
  base: {
    name: 'Sharpedo Bluff', image: 'base', size: [441, 239], backdrop: '#2c1c10',
    walk: [[[218, 66], [242, 66], [250, 76], [300, 76], [318, 92], [322, 126], [330, 144], [395, 144], [395, 152], [330, 160], [130, 160], [112, 146], [110, 116], [120, 94], [150, 88], [192, 88], [196, 76], [212, 76]]],
    block: [{ x: 368, y: 116, rx: 46, ry: 27 }, { x: 172, y: 80, rx: 22, ry: 12 }], // fountain rock, barrels
    anims: ['base-sea', 'base-fountain'],
    props: [],
    entries: { bedR: { at: [261, 148], dir: 0 }, bedL: { at: [213, 148], dir: 0 }, beside: { at: [237, 150], dir: 6 }, door: { at: [230, 80], dir: 0 } },
    buddy: [213, 148], // where a CPU partner waits when you wake up
    doors: [{ rect: [214, 60, 32, 10], to: { area: 'dojo', entry: 'door' } }],
    spots: [
      { id: 'partner', at: [213, 148], r: 15, label: 'Partner' },
      { id: 'dream', at: [261, 148], r: 13, label: 'Sleep' },
    ],
  },
  dojo: {
    name: 'Marowak Dojo', image: 'dojo', size: [340, 323],
    walk: [[[110, 98], [138, 98], [142, 108], [200, 108], [204, 98], [242, 98], [246, 108], [270, 120], [288, 160], [290, 225], [270, 245], [232, 256], [204, 262], [204, 312], [146, 312], [146, 262], [112, 254], [78, 240], [58, 220], [52, 165], [62, 125], [90, 108]]],
    block: [
      { x: 268, y: 148, rx: 17, ry: 22 }, { x: 266, y: 198, rx: 16, ry: 24 }, // rocks and log pile on the right
      { x: 80, y: 165, rx: 25, ry: 30 }, { x: 76, y: 207, rx: 14, ry: 10 }, { x: 102, y: 220, rx: 9, ry: 16 }, // boulders, pots and log on the left
      { x: 173, y: 108, rx: 9, ry: 5 }, // middle torch
    ],
    anims: ['torch0', 'torch1', 'torch2', 'torch3', 'torch4', 'dojo-pond'],
    props: [],
    entries: { door: { at: [175, 292], dir: 4 }, cave: { at: [124, 116], dir: 0 }, arch: { at: [223, 118], dir: 0 } },
    doors: [
      { rect: [106, 92, 36, 11], to: { area: 'basement', entry: 'stairs' } }, // down to the pillar
      { rect: [208, 99, 30, 8], to: { area: 'lab', entry: 'door' } }, // through the skull arch, down to the lab
      { rect: [146, 304, 58, 12], to: { area: 'base', entry: 'door' } },
    ],
    spots: [
      { id: 'ring', at: [174, 180], r: 30, label: 'Pick moves' },
    ],
  },
  basement: {
    name: 'Dojo Basement', image: 'basement', size: [292, 287],
    walk: [[[113, 262], [180, 262], [182, 215], [205, 195], [222, 170], [218, 140], [200, 118], [170, 104], [120, 104], [100, 125], [92, 150], [100, 180], [112, 205]]],
    block: [{ x: 146, y: 150, rx: 18, ry: 7 }],
    anims: ['dojo-spring'],
    props: [{ key: 'dojo-pillar', base: 153 }], // drawn in front of or behind the player by where its foot is
    entries: { stairs: { at: [146, 244], dir: 4 }, pillar: { at: [146, 176], dir: 4 } },
    doors: [{ rect: [113, 254, 67, 10], to: { area: 'dojo', entry: 'cave' } }],
    spots: [{ id: 'pillar', at: [146, 156], r: 32, label: 'Touch' }],
  },
  // the lab below the arch: the big machine sets your profile, the console behind it sends you to a practice arena
  lab: {
    name: 'Decrepit Lab', image: 'lab', size: [480, 312], backdrop: '#0c0a14',
    walk: [[[100, 124], [160, 116], [176, 108], [304, 108], [318, 116], [372, 118], [400, 124], [430, 136], [446, 152], [447, 250], [440, 262], [424, 296], [56, 296], [40, 262], [34, 250], [33, 152], [50, 134], [78, 126]]],
    block: [
      { x: 240, y: 207, rx: 62, ry: 46 }, // the machine
      { x: 6, y: 254, w: 40, h: 50 }, { x: 436, y: 254, w: 40, h: 50 }, // the white boxes in the corners
    ],
    anims: ['lab-dome'],
    props: [],
    entries: { door: { at: [240, 284], dir: 4 }, console: { at: [240, 124], dir: 0 } },
    doors: [{ rect: [196, 286, 88, 9], to: { area: 'dojo', entry: 'arch' } }],
    spots: [
      { id: 'machine', at: [240, 266], r: 22, label: 'Profile' },
      { id: 'console', at: [240, 122], r: 24, label: 'Practice' },
    ],
  },
};
