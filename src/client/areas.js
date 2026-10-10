// The walk-around rooms of the dojo. All positions are in the room art's own pixels; the Hub scene centres the art on screen.
// walk / block work as in maps.js. entries are where the player appears (dir is a sheet row: 0 faces down, 4 faces up),
// doors are floor rects that lead somewhere, spots are things to interact with from within `r` pixels.
export const AREAS = {
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
    entries: { door: { at: [175, 292], dir: 4 }, cave: { at: [124, 116], dir: 0 } },
    doors: [
      { rect: [106, 92, 36, 11], to: { area: 'basement', entry: 'stairs' } },
      { rect: [146, 304, 58, 12], leave: true, back: [175, 296] },
    ],
    spots: [
      { id: 'ring', at: [174, 180], r: 30, label: 'Pick moves' },
      { id: 'arch', at: [223, 100], r: 16, label: 'Look' },
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
};
