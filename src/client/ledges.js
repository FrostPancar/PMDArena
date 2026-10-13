// High places a fighter can jump down from, per stage. `edge` is the lip of the high ground (x1, y1, x2, y2) and
// `drop` how far the jump carries (dx, dy). Walking off the lip in that direction hops the fighter down; a drop is
// one way unless another ledge leads back, so every drop lands somewhere that can be left again.
export const LEDGES = {
  // the terrace above the courtyard
  relic: [{ edge: [190, 122, 290, 122], drop: [0, 56] }],
  // the bank around the upper pond, down onto the two lily pads below it
  pond: [
    { edge: [186, 139, 228, 145], drop: [0, 54] }, { edge: [276, 145, 318, 139], drop: [0, 70] },
    // the side pools at the top and the bank around the upper pond: a hop over the strip of grass between them, either way
    { edge: [111, 74, 108, 99], drop: [26, 0] }, { edge: [125, 64, 126, 94], drop: [-28, 0] },
    { edge: [393, 74, 396, 99], drop: [-26, 0] }, { edge: [379, 64, 378, 94], drop: [28, 0] },
  ],
};
