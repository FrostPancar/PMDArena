// High places a fighter can jump down from, per stage. `edge` is the lip of the high ground (x1, y1, x2, y2) and
// `drop` how far the jump carries (dx, dy). Walking off the lip in that direction hops the fighter down; there is no
// jumping back up, so every drop lands somewhere that can be walked out of.
export const LEDGES = {
  // the terrace above the courtyard
  relic: [{ edge: [190, 122, 290, 122], drop: [0, 56] }],
  // the bank around the upper pond, down onto the two lily pads below it
  pond: [{ edge: [186, 139, 228, 145], drop: [0, 54] }, { edge: [276, 145, 318, 139], drop: [0, 70] }],
};
