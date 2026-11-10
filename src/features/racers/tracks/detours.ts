/* English Racers — the long versions of the nine hand-drawn tracks: each keeps its first drawing and
   grows a new stretch out of one side (see withDetour): esses, sweepers, hairpins, hills and
   descending spirals over a bridge. Corners are given along the chord between the two control
   points the stretch hangs from (x) and away from the track (z), in metres. */
import { withDetour, type Corner, type SpiralOpts, type TrackDef } from '../track';

const c = (x: number, z: number, r?: number, y?: number, spiral?: SpiralOpts): Corner => ({ x, z, r, y, spiral });
/** A wide descending spiral (to the left or right of the way you are going). */
const sp = (side: 1 | -1, drop = 12, skip = 0): SpiralOpts => ({ side, drop, skip, a: 35, r1: 36, s1: 34, R: 31 });


/* The second stretch of every track hangs from two points of the first drawing (`a` and `b`, by
   their first numbers) and grows to the left or right of the way between them. Three shapes: */
type Shape = (D: number) => Corner[];
/** Sweepers out, a spiral down, a wide head and esses back. */
const spiralOut = (y: number, h = 5, side: 1 | -1 = -1): Shape => (D) => [
  c(10, 105, 42, y), c(-75, 175, 42, y + h, sp(side)), c(-75, 365, 45, y + h), c(D / 2, 440, 48, y + h + 2), c(D + 75, 365, 45, y + h), c(D + 15, 290, 36, y + h), c(D + 85, 215, 36, y + 2), c(D - 10, 110, 42, y),
];
/** Esses out over a hill, a wide head and a long fast straight back. */
const essesOut = (y: number, h = 6): Shape => (D) => [
  c(5, 100, 40, y), c(-70, 165, 36, y + h / 2), c(-5, 235, 34, y + h), c(-70, 305, 38, y + h), c(D / 2, 385, 48, y + h / 2), c(D + 70, 305, 38, y), c(D + 70, 165, 40, y), c(D - 5, 100, 40, y),
];
/** City blocks: right angles, a short block and a long avenue back (with a spiral if asked). */
const blocks = (y: number, spiral?: SpiralOpts): Shape => (D) => [
  c(0, 110, 28, y), c(-85, 110, 28, y), c(-85, 235, 28, y + 2), c(D / 2, 235, 28, y + 3), c(D / 2, 340, 30, y + 3), c(D + 85, 340, 30, y + (spiral ? 3 : 2), spiral), c(D + 85, 110, 30, y), c(D, 110, 28, y),
];
const more = (d: TrackDef, a: number, b: number, side: 'left' | 'right', shape: Shape, add: Parameters<typeof withDetour>[4] = {}): TrackDef => {
  const og = d.orig ?? d.cps.map((_, i) => i), at = og[a], end = og[b], A = d.cps[at], B = d.cps[end];
  return withDetour(d, at, end - at - 1, shape(Math.hypot(B.x - A.x, B.z - A.z)), { local: side, ...add });
};
/** Both stretches, one after the other. */
export const LONGER: Record<string, (d: TrackDef) => TrackDef> = {
  campus: (d) => more(d, 10, 13, 'right', spiralOut(0, 4)),
  beach: (d) => more(d, 14, 17, 'right', essesOut(1.5, 5)),
  roofs: (d) => more(d, 6, 9, 'right', spiralOut(28, 3)),
  neon: (d) => more(d, 8, 10, 'left', essesOut(12, 6)),
  london: (d) => more(d, 1, 3, 'right', blocks(0)),
  newyork: (d) => more(d, 1, 3, 'right', blocks(0, sp(1, 10))),
  tokyo: (d) => more(d, 7, 9, 'right', spiralOut(0, 3)),
  rio: (d) => more(d, 10, 11, 'left', essesOut(0, 7)),
  splash: (d) => more(d, 25, 28, 'left', spiralOut(0, 4)),
  canyon: (d) => more(d, 17, 23, 'left', essesOut(-3, 5)),
  snow: (d) => more(d, 2, 8, 'left', essesOut(0, 6)),
};

export const LONG: Record<string, (d: TrackDef) => TrackDef> = {
  campus: (d) => withDetour(d, 1, 3, [
    c(45, 140, 45, 2, sp(1)), c(45, 330, 45, 3), c(120, 420, 45, 2), c(215, 360, 40), c(165, 270, 38), c(225, 185, 38), c(160, 100, 40),
  ], { local: 'out' }),
  beach: (d) => withDetour(d, 10, 2, [
    c(30, 110, 40, 3), c(-30, 200, 40, 6), c(40, 290, 40, 8), c(-20, 380, 42, 8), c(80, 440, 45, 8), c(180, 400, 42, 6, sp(-1)), c(150, 130, 60, 2),
  ], { local: 'out' }),
  roofs: (d) => withDetour(d, 2, 2, [
    c(0, 110, 40, 24), c(-70, 170, 36, 26), c(-5, 255, 36, 28), c(-70, 340, 36, 30), c(10, 430, 40, 30), c(120, 460, 40, 29), c(170, 370, 40, 28, sp(-1)), c(125, 130, 50, 27),
  ], { local: 'out' }),
  neon: (d) => withDetour(d, 2, 2, [
    c(-40, 190, 55, 15), c(70, 340, 55, 18), c(-30, 490, 55, 20), c(90, 590, 50, 20), c(215, 520, 45, 18, sp(-1)), c(185, 290, 50, 14, sp(1)), c(140, 130, 50, 15),
  ], { local: 'out' }),
  london: (d) => withDetour(d, 11, 2, [
    c(-10, 140, 40, 2, sp(1)), c(-10, 330, 40, 2), c(60, 410, 40, 3), c(200, 410, 36, 4), c(200, 280, 34, 3), c(125, 280, 34, 2), c(125, 165, 34, 1), c(195, 165, 30, 1), c(195, 95, 30), c(95, 95, 30),
  ], { local: 'out' }),
  newyork: (d) => withDetour(d, 8, 4, [
    c(8, 130, 30), c(-60, 130, 30), c(-60, 270, 30, 2), c(40, 270, 30, 3), c(40, 400, 32, 4), c(300, 400, 34, 4), c(300, 280, 34, 3, sp(-1)), c(300, 150, 40, 0), c(215, 75, 45),
  ], { local: 'out' }),
  tokyo: (d) => withDetour(d, 2, 3, [
    c(-50, 160, 55, 0, sp(1)), c(-50, 340, 48), c(30, 420, 48, 2), c(160, 410, 48, 3), c(230, 310, 50, 2), c(130, 220, 50, 1), c(190, 120, 45),
  ], { local: 'out' }),
  rio: (d) => withDetour(d, 12, 2, [
    c(50, 100, 38, 2), c(-30, 170, 40, 5, sp(-1)), c(-30, 310, 40, 9), c(70, 350, 42, 10), c(175, 290, 42, 8), c(110, 120, 45, 3),
  ], { local: 'out' }),
  splash: (d) => withDetour(d, 11, 4, [
    c(-5, 130, 40), c(-60, 210, 40, 2), c(-5, 300, 40, 4), c(-60, 390, 40, 6), c(30, 480, 45, 6), c(130, 450, 45, 5), c(150, 340, 45, 4, sp(-1)), c(90, 110, 60),
  ], { local: 'out' }),
};
