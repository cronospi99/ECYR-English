/* English Racers — the long versions of the nine hand-drawn tracks: each keeps its first drawing and
   grows a new stretch out of one side (see withDetour): esses, sweepers, hairpins, hills and
   descending spirals over a bridge. Corners are given along the chord between the two control
   points the stretch hangs from (x) and away from the track (z), in metres. */
import { withDetour, type Corner, type SpiralOpts, type TrackDef } from '../track';

const c = (x: number, z: number, r?: number, y?: number, spiral?: SpiralOpts): Corner => ({ x, z, r, y, spiral });
/** A wide descending spiral (to the left or right of the way you are going). */
const sp = (side: 1 | -1, drop = 12, skip = 0): SpiralOpts => ({ side, drop, skip, a: 35, r1: 36, s1: 34, R: 31 });

export const LONG: Record<string, (d: TrackDef) => TrackDef> = {
  campus: (d) => withDetour({ ...d, laps: 2 }, 1, 3, [
    c(45, 140, 45, 2, sp(1)), c(45, 330, 45, 3), c(120, 420, 45, 2), c(215, 360, 40), c(165, 270, 38), c(225, 185, 38), c(160, 100, 40),
  ], { local: 'out' }),
  beach: (d) => withDetour({ ...d, laps: 2 }, 14, 3, [
    c(20, 100, 40, 2), c(-60, 170, 40, 4), c(30, 250, 40, 6), c(-50, 330, 40, 8), c(45, 410, 45, 8), c(150, 370, 40, 6, sp(-1)), c(130, 110, 60, 2),
  ], { local: 'out' }),
  roofs: (d) => withDetour({ ...d, laps: 2 }, 2, 2, [
    c(0, 110, 40, 24), c(-70, 170, 36, 26), c(-5, 255, 36, 28), c(-70, 340, 36, 30), c(10, 430, 40, 30), c(120, 460, 40, 29), c(170, 370, 40, 28, sp(-1)), c(125, 130, 50, 27),
  ], { local: 'out' }),
  neon: (d) => withDetour({ ...d, laps: 2 }, 2, 2, [
    c(-40, 190, 55, 15), c(70, 340, 55, 18), c(-30, 490, 55, 20), c(90, 590, 50, 20), c(215, 520, 45, 18, sp(-1)), c(185, 290, 50, 14, sp(1)), c(140, 130, 50, 15),
  ], { local: 'out' }),
  london: (d) => withDetour({ ...d, laps: 2 }, 11, 2, [
    c(-10, 140, 40, 2, sp(1)), c(-10, 330, 40, 2), c(60, 410, 40, 3), c(200, 410, 36, 4), c(200, 280, 34, 3), c(125, 280, 34, 2), c(125, 165, 34, 1), c(195, 165, 30, 1), c(195, 95, 30), c(95, 95, 30),
  ], { local: 'out' }),
  newyork: (d) => withDetour({ ...d, laps: 2 }, 8, 4, [
    c(8, 130, 30), c(-60, 130, 30), c(-60, 270, 30, 2), c(40, 270, 30, 3), c(40, 400, 32, 4), c(300, 400, 34, 4), c(300, 280, 34, 3, sp(-1)), c(300, 150, 40, 0), c(215, 75, 45),
  ], { local: 'out' }),
  tokyo: (d) => withDetour({ ...d, laps: 2 }, 2, 3, [
    c(-50, 160, 55, 0, sp(1)), c(-50, 340, 48), c(30, 420, 48, 2), c(160, 410, 48, 3), c(230, 310, 50, 2), c(130, 220, 50, 1), c(190, 120, 45),
  ], { local: 'out' }),
  rio: (d) => withDetour({ ...d, laps: 2 }, 9, 2, [
    c(40, 100, 36, 3), c(-35, 170, 40, 16), c(50, 250, 40, 26), c(-35, 330, 40, 27), c(50, 420, 42, 27), c(150, 450, 42, 27), c(235, 380, 42, 26, sp(1)), c(185, 130, 50, 4),
  ], { local: 'out' }),
  splash: (d) => withDetour(d, 11, 4, [
    c(-5, 130, 40), c(-60, 210, 40, 2), c(-5, 300, 40, 4), c(-60, 390, 40, 6), c(30, 480, 45, 6), c(130, 450, 45, 5), c(150, 340, 45, 4, sp(-1)), c(90, 110, 60),
  ], { local: 'out' }),
};
