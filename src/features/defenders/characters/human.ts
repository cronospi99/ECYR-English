/* Parametric person: one function sculpts every human in the cast (teachers, students, parents…)
   and their undead versions. Outfit, hair, face and pose come from options; props are added by
   the caller on the returned limbs. Bodies are distance-field sculpts (see builder.ts): skull, jaw,
   brow, cheeks, sockets and mouth are modelled, not drawn on. */
import { Builder, type Mode, type Rig, type Seg, type TickFn, type V3 } from './builder';

export type Hair = 'short' | 'long' | 'bun' | 'afro' | 'bald' | 'cap' | 'capSide' | 'capBack' | 'hood'
  | 'beanie' | 'net' | 'rollers' | 'messy' | 'ponytail' | 'quiff';
export type Face = 'happy' | 'angry' | 'bored' | 'smirk' | 'focus' | 'shout';

export interface Human {
  skin?: number; shirt: number; pants: number; shoes?: number;
  hair?: number; style?: Hair; hat?: number;
  face?: Face; glasses?: number; shades?: number; beard?: number; mustache?: number; iris?: number;
  bulk?: number; sleeve?: number; shorts?: boolean; skirt?: number; coat?: number;
  /** Rest rotation of each arm (x: forward/back, z: out from the body). */
  armL?: V3; armR?: V3;
  /** Arms that keep their pose instead of swinging while walking. */
  hold?: 'L' | 'R' | 'both';
  lean?: number;
  /** Undead: carved sockets with eyes that glow in this colour, bared teeth, stitches. */
  zombie?: number;
  /** Which arm throws when the defender fires. */
  thrower?: 'L' | 'R' | 'both' | 'none';
  /** How it moves along the lane. */
  gait?: 'walk' | 'run' | 'shamble';
}

export interface Limbs { torso: Seg; head: Seg; armL: Seg; armR: Seg; legL: Seg; legR: Seg; shinL: Seg; shinR: Seg }

const DARK = 0x1c1a22, WHITE = 0xffffff, VOID = 0x0a0514, BONE = 0xe9e2bd;
export const shade = (c: number, k: number, tint = 0) => {
  let r = Math.min(255, ((c >> 16) & 255) * k), g = Math.min(255, ((c >> 8) & 255) * k), b = Math.min(255, (c & 255) * k);
  if (tint) { r = r * (1 - tint) + 70 * tint; g = g * (1 - tint) + 30 * tint; b = b * (1 - tint) + 110 * tint; }
  return ((r | 0) << 16) | ((g | 0) << 8) | (b | 0);
};

export function human(b: Builder, o: Human): Limbs {
  const skin = o.skin ?? 0xe9b98c, bulk = o.bulk ?? 1, hair = o.hair ?? 0x3a2a1e;
  const sleeve = o.sleeve ?? o.shirt, shoes = o.shoes ?? 0x2b2b33;
  const Z = o.zombie != null, SK = Z ? 'zskin' : 'skin';
  const sx = 0.15 * bulk + 0.035, lb = Math.min(bulk, 1.25);

  /* legs: thigh + shin (the knee bends when running) */
  const leg = (name: string, shin: string, x: number): [Seg, Seg] => {
    const s = b.part(name, 'turn', [x, 0.3, 0], false).soft(0.02);
    s.m(o.shorts ? 'cloth' : 'cloth').cap(o.pants, [0, 0.01, 0], [0, -0.105, 0], 0.06 * lb);
    if (o.shorts) s.add('cyl', o.pants, [0, -0.085, 0], [0.068 * lb, 0.05, 0.068 * lb]);
    const k = b.part(shin, name, [0, -0.115, 0], false).soft(0.02);
    if (o.shorts) k.m(SK).cap(skin, [0, 0.01, 0], [0, -0.1, 0], 0.045);
    else k.m('cloth').cap(o.pants, [0, 0.01, 0], [0, -0.1, 0], 0.052 * lb);
    k.m('rubber').add('sph', shoes, [0, -0.142, 0.03], [0.062, 0.043, 0.098]);
    k.add('sph', shoes, [0, -0.128, 0.0], [0.056, 0.05, 0.062]);
    k.paint('box', shade(shoes, shoes > 0x808080 ? 0.7 : 1.9), [0, -0.181, 0.03], [0.2, 0.02, 0.3], [0, 0, 0], 0.003);
    k.hard().m('auto');
    s.hard().m('auto');
    return [s, k];
  };
  const [legL, shinL] = leg('legL', 'shinL', -0.07 * bulk), [legR, shinR] = leg('legR', 'shinR', 0.07 * bulk);

  /* torso */
  const torso = b.part('torso', 'turn', [0, 0.3, 0]).soft(0.03).m('cloth');
  torso.cell = 0.017;
  torso.add('sph', o.shirt, [0, 0.195, 0.004], [0.128 * bulk, 0.1, 0.108 * Math.sqrt(bulk)]);       // chest
  torso.add('sph', o.shirt, [0, 0.105, 0.008], [0.122 * bulk, 0.1, 0.106 * bulk]);                  // belly
  torso.add('sph', o.pants, [0, 0.02, 0], [0.128 * bulk, 0.066, 0.112 * bulk]);                     // hips
  for (const s of [-1, 1]) torso.add('sph', sleeve === skin ? o.shirt : sleeve, [s * sx * 0.86, 0.262, 0], [0.058, 0.052, 0.058]);
  if (o.skirt != null) torso.add('cone', o.skirt, [0, -0.03, 0], [0.19 * bulk, 0.21, 0.17 * bulk]);
  if (o.coat != null) {
    // open coat: a longer back and two front panels
    torso.add('sph', o.coat, [0, 0.1, -0.028], [0.152 * bulk, 0.225, 0.122 * bulk]);
    torso.add('box', o.coat, [-0.09 * bulk, 0.06, 0.08], [0.075, 0.31, 0.06], [0, 0, 0.08]);
    torso.add('box', o.coat, [0.09 * bulk, 0.06, 0.08], [0.075, 0.31, 0.06], [0, 0, -0.08]);
    torso.hard();
    for (const s of [-1, 1]) torso.add('box', shade(o.coat, 0.86), [s * 0.062 * bulk, 0.25, 0.108], [0.05, 0.1, 0.014], [0.1, 0, s * -0.4]);  // lapels
    torso.soft(0.03);
  }
  torso.m(SK).add('cyl', skin, [0, 0.325, 0], [0.044, 0.09, 0.044]);                                 // neck
  torso.hard().m('cloth');

  /* arms */
  const arm = (name: string, side: number, rot: V3 | undefined) => {
    const s = b.part(name, 'torso', [side * sx, 0.27, 0], false).soft(0.018);
    const lower = o.sleeve === undefined && o.coat != null ? o.coat : sleeve === skin ? skin : shade(sleeve, 0.93);
    s.m(sleeve === skin ? SK : 'cloth').cap(sleeve, [0, 0, 0], [0, -0.125, 0], 0.047);
    s.m(lower === skin ? SK : 'cloth').cap(lower, [0, -0.125, 0], [0, -0.215, 0.004], 0.041);
    s.m(SK).add('sph', skin, [0, -0.262, 0.004], [0.046, 0.052, 0.042]);
    s.add('sph', skin, [side * -0.03, -0.25, 0.03], [0.02, 0.026, 0.02]);                              // thumb
    if (Z) { s.paint('sph', shade(skin, 0.55, 0.3), [0, -0.3, 0.01], 0.04, [0, 0, 0], 0.02); }
    s.hard().m('auto');
    const r = rot ?? [0, 0, side * 0.12];
    s.group.rotation.set(r[0], r[1], r[2]);
    s.group.userData.base = r;
    return s;
  };
  const armL = arm('armL', -1, o.armL), armR = arm('armR', 1, o.armR);

  /* head */
  const head = b.part('head', 'torso', [0, 0.47, 0]).soft(0.03).m(SK);
  head.cell = 0.0115;
  const R = 0.19, f = o.face ?? 'happy';
  head.add('sph', skin, [0, 0.012, -0.008], [R * 0.98, R * 0.97, R]);                                  // cranium
  if (Z) {
    head.add('sph', skin, [0, -0.066, 0.03], [0.132, 0.118, 0.138]);                                   // gaunt jaw
    head.add('sph', skin, [0, -0.15, 0.085], [0.062, 0.04, 0.052]);                                    // chin
    for (const s of [-1, 1]) {
      head.add('sph', skin, [s * 0.105, -0.022, 0.118], [0.045, 0.034, 0.045]);                        // cheekbones
      const tilt = f === 'angry' || f === 'focus' || f === 'smirk' ? s * 0.42 : f === 'bored' ? s * -0.12 : s * 0.12;
      head.add('sph', skin, [s * 0.066, 0.088 - (f === 'angry' ? 0.008 : 0), 0.152], [0.074, 0.027, 0.045], [0, 0, tilt]);   // brow ridge
    }
  } else {
    head.add('sph', skin, [0, -0.062, 0.028], [0.146, 0.12, 0.142]);                                   // cheeks and jaw
    head.add('sph', skin, [0, -0.142, 0.08], [0.06, 0.04, 0.05]);
    for (const s of [-1, 1]) head.add('sph', skin, [s * 0.068, 0.078, 0.148], [0.06, 0.022, 0.036]);
  }
  head.soft(0.012);
  for (const s of [-1, 1]) head.add('sph', skin, [s * 0.183, -0.014, -0.004], [0.03, Z ? 0.056 : 0.046, 0.036], [0, 0, Z ? s * -0.18 : 0]);   // ears
  for (const s of [-1, 1]) head.paint('sph', shade(skin, 0.72, Z ? 0.25 : 0), [s * 0.2, -0.014, 0.012], [0.02, 0.03, 0.022], [0, 0, 0], 0.008);
  if (!Z) head.add('sph', skin, [0, -0.036, 0.186], [0.023, 0.021, 0.026]);                            // nose

  const brow = o.hair != null && o.style !== 'bald' ? shade(hair, 0.7) : 0x3a2a1e;
  if (Z) {
    /* undead face: deep round sockets with a glowing orb, nasal cavity, hollow cheeks, bared teeth */
    for (const s of [-1, 1]) {
      const x = s * 0.07;
      head.paint('sph', shade(skin, 0.5, 0.45), [x, 0.016, 0.165], [0.082, 0.086, 0.07], [0, 0, 0], 0.024);
      head.m('dark').cut('sph', VOID, [x, 0.016, 0.172], [0.057, 0.061, 0.052], [0, 0, 0], 0.014);
      head.m(SK).cut('sph', shade(skin, 0.62, 0.3), [s * 0.122, -0.066, 0.1], [0.036, 0.05, 0.04], [0, 0, s * 0.3], 0.03);    // hollow cheek
      if (o.shades == null) {
        b.glow('head', 'sph', o.zombie!, [x, 0.016, 0.143], [0.035, 0.037, 0.022], [0, 0, 0], 1.25);
        b.glow('head', 'sph', 0xffffff, [x + 0.004, 0.02, 0.156], [0.019, 0.02, 0.012], [0, 0, 0], 2.3);
        b.halo('head', o.zombie!, [x, 0.016, 0.2], 0.15, 0.3);
      }
      if (f === 'bored') head.hard().add('sph', shade(skin, 0.8, 0.2), [x, 0.05, 0.158], [0.06, 0.036, 0.04]).soft(0.012);   // heavy lid
      head.m('dark').cut('sph', VOID, [s * 0.014, -0.042, 0.19], [0.016, 0.028, 0.03], [0, 0, s * -0.36], 0.012);            // nasal cavity
    }
    head.m('dark').cut('box', 0x1a0612, [0, -0.098, 0.172], [0.136, 0.054, 0.056], [0, 0, 0], 0.012);                           // lipless mouth
    head.m(SK).paint('box', shade(skin, 0.5, 0.4), [0, -0.098, 0.16], [0.16, 0.075, 0.07], [0, 0, 0], 0.012);
    head.hard().m('bone');
    for (let i = 0; i < 6; i++) {                                                                                             // upper teeth
      const x = -0.05 + i * 0.02, hgt = 0.026 - (i % 3 === 1 ? 0.006 : 0) - Math.abs(i - 2.5) * 0.002;
      head.add('box', i === 4 ? 0xcfc18a : BONE, [x, -0.074 - hgt / 2 + 0.002, 0.163 - 3.4 * x * x], [0.0175, hgt, 0.014], [0, x * 3.2, (i % 2 ? 0.05 : -0.04)]);
    }
    for (let i = 0; i < 5; i++) {                                                                                             // lower teeth
      const x = -0.04 + i * 0.02, hgt = 0.019 - (i === 1 ? 0.007 : 0);
      head.add('box', BONE, [x, -0.122 + hgt / 2, 0.158 - 3.4 * x * x], [0.0165, hgt, 0.013], [0, x * 3.2, (i % 2 ? -0.06 : 0.04)]);
    }
    // stitched scar across the forehead and ear plugs
    head.m('dark').add('box', 0x7a1a3a, [0.082, 0.124, 0.142], [0.01, 0.07, 0.012], [-0.5, 0.5, 0.55]);
    for (let i = 0; i < 4; i++) head.add('box', VOID, [0.066 + i * 0.012, 0.106 + i * 0.013, 0.146 - i * 0.004], [0.03, 0.006, 0.01], [-0.5, 0.5, -1.0]);
    head.m('metal');
    for (const s of [-1, 1]) head.ring(0x2a2433, 0.014, 0.008, [s * 0.203, -0.052, 0.0], [0, Math.PI / 2, 0]);
    head.m(SK).soft(0.012);
    // wrinkles and grime
    for (let i = 0; i < 2; i++) head.paint('box', shade(skin, 0.6, 0.3), [-0.02, 0.128 + i * 0.022, 0.15], [0.13 - i * 0.03, 0.005, 0.06], [-0.6, 0, 0.04], 0.004);
    head.paint('sph', shade(skin, 0.6, 0.35), [-0.1, -0.11, 0.1], [0.05, 0.04, 0.05], [0, 0, 0], 0.02);
  } else {
    for (const s of [-1, 1]) {
      const x = s * 0.07;
      head.cut('sph', shade(skin, 0.86), [x, 0.014, 0.196], [0.047, 0.052, 0.03], [0, 0, 0], 0.016);
      if (o.shades == null) {
        head.hard().m('gloss');
        head.add('sph', WHITE, [x, 0.014, 0.15], [0.041, 0.046, 0.03]);
        head.add('sph', o.iris ?? 0x4a2c1a, [x + (f === 'smirk' ? 0.007 : 0), f === 'bored' ? 0.004 : 0.013, 0.166], [0.023, 0.025, 0.016]);
        head.add('sph', DARK, [x + (f === 'smirk' ? 0.007 : 0), f === 'bored' ? 0.004 : 0.013, 0.1745], [0.0125, 0.014, 0.01]);
        head.add('sph', WHITE, [x + 0.009, 0.026, 0.1795], 0.0055);
        head.m(SK).soft(0.012);
      }
      if (f === 'bored') head.hard().add('sph', shade(skin, 0.9), [x, 0.042, 0.158], [0.049, 0.032, 0.034]).soft(0.012);
      head.hard().m('hair');
      if (f === 'angry' || f === 'shout') head.add('box', brow, [x, 0.08, 0.188], [0.085, 0.024, 0.022], [0, 0, s * 0.5]);
      else if (f === 'focus') head.add('box', brow, [x, 0.086, 0.186], [0.075, 0.019, 0.022], [0, 0, s * 0.2]);
      else if (f !== 'bored') head.add('box', brow, [x, 0.097, 0.18], [0.07, 0.016, 0.022], [0, 0, s * -0.14]);
      head.m(SK).soft(0.012);
    }
    if (f === 'happy') {
      head.m('dark').cut('dome', 0x5a1622, [0, -0.076, 0.168], [0.052, 0.042, 0.04], [Math.PI, 0, 0], 0.006);
      head.hard().m('bone').add('box', WHITE, [0, -0.083, 0.166], [0.074, 0.013, 0.016]);
      head.m('plastic').add('sph', 0xf08a8a, [0, -0.108, 0.158], [0.028, 0.012, 0.02]);
    } else if (f === 'angry') {
      head.m('dark').cut('box', 0x5a1622, [0, -0.094, 0.174], [0.09, 0.034, 0.04], [0, 0, 0], 0.006);
      head.hard().m('bone').add('box', WHITE, [0, -0.094, 0.166], [0.078, 0.022, 0.014]);
    } else if (f === 'shout') {
      head.m('dark').cut('sph', 0x5a1622, [0, -0.098, 0.172], [0.05, 0.05, 0.04], [0, 0, 0], 0.006);
      head.hard().m('bone').add('box', WHITE, [0, -0.064, 0.172], [0.056, 0.012, 0.014]);
      head.m('plastic').add('sph', 0xf08a8a, [0, -0.128, 0.156], [0.03, 0.014, 0.022]);
    } else if (f === 'smirk') head.paint('box', 0x6a2a2a, [0.012, -0.09, 0.17], [0.062, 0.011, 0.06], [0, 0, 0.22], 0.004);
    else head.paint('box', 0x6a3a34, [0, -0.092, 0.17], [f === 'bored' ? 0.048 : 0.036, 0.011, 0.06], [0, 0, 0], 0.004);
    head.m(SK).soft(0.012);
    if (f === 'happy' || f === 'smirk') for (const s of [-1, 1]) head.paint('sph', 0xf29a9a, [s * 0.116, -0.046, 0.14], [0.034, 0.024, 0.04], [0, 0, 0], 0.012);
  }

  head.hard();
  if (o.glasses != null) {
    head.m('plastic');
    for (const s of [-1, 1]) head.ring(o.glasses, 0.052, 0.008, [s * 0.07, 0.014, 0.192]);
    head.add('box', o.glasses, [0, 0.02, 0.194], [0.04, 0.01, 0.01]);
    for (const s of [-1, 1]) head.add('box', o.glasses, [s * 0.155, 0.02, 0.1], [0.008, 0.008, 0.19], [0, s * 0.28, 0]);
  }
  if (o.shades != null) {
    head.m('gloss');
    for (const s of [-1, 1]) head.add('sph', o.shades, [s * 0.07, 0.02, 0.166], [0.058, 0.044, 0.034]);
    head.add('box', o.shades, [0, 0.032, 0.176], [0.31, 0.014, 0.016]);
    if (Z) for (const s of [-1, 1]) b.glow('head', 'sph', o.zombie!, [s * 0.07, 0.02, 0.194], [0.03, 0.008, 0.008], [0, 0, 0], 2.2);
  }
  head.m('hair').soft(0.014);
  if (o.mustache != null) { head.add('sph', o.mustache, [-0.03, -0.062, 0.176], [0.04, 0.02, 0.024], [0, 0, 0.25]); head.add('sph', o.mustache, [0.03, -0.062, 0.176], [0.04, 0.02, 0.024], [0, 0, -0.25]); }
  if (o.beard != null) {
    head.add('sph', o.beard, [0, -0.112, 0.07], [0.142, 0.092, 0.118]);
    head.add('sph', o.beard, [-0.03, -0.06, 0.174], [0.04, 0.02, 0.024], [0, 0, 0.3]);
    head.add('sph', o.beard, [0.03, -0.06, 0.174], [0.04, 0.02, 0.024], [0, 0, -0.3]);
  }

  /* hair & hats */
  const st = o.style ?? 'short', hat = o.hat ?? 0xd03a3a;
  const capOn = (c: number, tilt = -0.32, k = 1.075) => head.add('dome', c, [0, 0.012, -0.008], [R * k, R * k, R * k * 1.01], [tilt, 0, 0]);
  if (st === 'short' || st === 'long' || st === 'bun' || st === 'ponytail' || st === 'messy' || st === 'quiff') capOn(hair);
  if (st === 'short') { head.add('sph', hair, [0.05, 0.14, 0.1], [0.11, 0.055, 0.075], [0, 0, -0.3]); head.add('sph', hair, [-0.08, 0.13, 0.06], [0.07, 0.05, 0.08], [0, 0, 0.3]); }
  if (st === 'quiff') {
    // swept-up front, short sides
    head.add('sph', hair, [0.02, 0.17, 0.09], [0.13, 0.07, 0.1], [-0.35, 0, -0.2]);
    head.add('sph', hair, [0.06, 0.2, 0.15], [0.085, 0.05, 0.06], [-0.6, 0, -0.3]);
    head.add('sph', hair, [-0.07, 0.15, 0.03], [0.09, 0.06, 0.11], [0, 0, 0.3]);
  }
  if (st === 'messy') for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2;
    head.add('cone', hair, [Math.cos(a) * 0.12, 0.16 + (i % 2) * 0.03, Math.sin(a) * 0.12 - 0.02], [0.055, 0.13, 0.055], [Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7]);
  }
  if (st === 'long') { head.add('sph', hair, [0, -0.07, -0.07], [0.2, 0.22, 0.14]); head.add('sph', hair, [-0.158, -0.08, 0.02], [0.06, 0.17, 0.09]); head.add('sph', hair, [0.158, -0.08, 0.02], [0.06, 0.17, 0.09]); head.add('sph', hair, [0.04, 0.15, 0.1], [0.12, 0.05, 0.07], [0, 0, -0.25]); }
  if (st === 'bun') { head.add('sph', hair, [0, 0.21, -0.06], 0.085); head.add('sph', hair, [0, 0.15, 0.08], [0.13, 0.045, 0.07]); }
  if (st === 'ponytail') { head.add('sph', hair, [0, 0.08, -0.2], 0.06); head.add('sph', hair, [0, -0.04, -0.25], [0.055, 0.14, 0.06], [0.4, 0, 0]); }
  if (st === 'afro') { capOn(hair); head.add('sph', hair, [0, 0.1, -0.06], [0.262, 0.232, 0.21]); for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; head.add('sph', hair, [Math.cos(a) * 0.2, 0.13 + Math.sin(a * 2) * 0.06, -0.06 + Math.sin(a) * 0.16], 0.085); } }
  if (st === 'net') { head.m('cloth'); capOn(hat, -0.15, 1.08); head.m('hair').add('sph', hair, [0, 0.05, -0.1], [0.17, 0.15, 0.13]); }
  if (st === 'rollers') {
    capOn(hair);
    head.hard().m('plastic');
    for (let i = 0; i < 5; i++) head.add('cyl', 0xff8fb8, [-0.13 + i * 0.065, 0.178 - Math.abs(i - 2) * 0.022, 0.03], [0.034, 0.11, 0.034], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 4; i++) head.add('cyl', 0xffb3d0, [-0.1 + i * 0.065, 0.163 - Math.abs(i - 1.5) * 0.02, -0.09], [0.034, 0.1, 0.034], [Math.PI / 2, 0, 0]);
  }
  if (st === 'beanie') {
    head.m('cloth'); capOn(hat, -0.22, 1.09);
    head.add('cyl', shade(hat, 0.8), [0, 0.05, -0.004], [R * 1.12, 0.05, R * 1.12]); head.add('sph', shade(hat, 1.3), [0, 0.235, -0.02], 0.048);
    head.m('hair').add('sph', hair, [0, -0.05, -0.1], [0.18, 0.1, 0.1]);
  }
  if (st === 'hood') {
    head.m('cloth').add('sph', hat, [0, 0.022, -0.04], [R * 1.16, R * 1.14, R * 1.1]);
    head.hard().ring(shade(hat, 0.82), 0.168, 0.022, [0, 0.01, 0.1], [0.12, 0, 0]);
    head.m('hair').soft(0.014).add('sph', hair, [0.02, 0.125, 0.115], [0.12, 0.05, 0.06], [0, 0, -0.2]);
    torso.soft(0.03).add('sph', hat, [0, 0.3, -0.07], [0.15, 0.08, 0.1]).hard();
  }
  if (st === 'cap' || st === 'capSide' || st === 'capBack') {
    head.m('cloth'); capOn(hat, -0.12, 1.085);
    const ry = st === 'capSide' ? 1.15 : st === 'capBack' ? Math.PI : 0;
    head.hard().add('cyl', shade(hat, 0.82), [Math.sin(ry) * 0.205, 0.078, Math.cos(ry) * 0.205], [0.125, 0.018, 0.135], [Math.cos(ry) * 0.12, 0, Math.sin(ry) * -0.12]);
    head.add('sph', shade(hat, 1.25), [0, 0.222, -0.008], 0.022);
    head.m('hair').soft(0.014).add('sph', hair, [0, -0.04, -0.11], [0.17, 0.1, 0.09]);
  }
  head.hard().m('auto');
  torso.hard().m('cloth');
  if (o.lean) b.parts.torso.rotation.x = o.lean;
  const u = b.parts.torso.userData;
  u.lean = o.lean ?? 0;
  u.hold = o.hold ?? '';
  u.thrower = o.thrower ?? 'R';
  u.gait = o.gait ?? (Z ? 'shamble' : 'walk');
  u.undead = Z ? 1 : 0;
  return { torso, head, armL, armR, legL, legR, shinL, shinR };
}

/** Shared animation for every human: walk, run and shamble cycles, pushing attack, breathing, throwing. */
export const humanTick: TickFn = (rig: Rig, t: number, mode: Mode, recoil: number, act: number) => {
  const p = rig.parts, T = p.torso, u = T.userData;
  const bL = p.armL.userData.base as V3, bR = p.armR.userData.base as V3;
  const gait = u.gait as string, Z = u.undead as number;
  let aL = bL[0], aR = bR[0], lL = 0, lR = 0, kL = 0, kR = 0, bob = 0, lean = u.lean as number, headX = 0, headZ = Z ? 0.1 : 0, roll = 0, twist = 0;
  const holdL = u.hold === 'L' || u.hold === 'both', holdR = u.hold === 'R' || u.hold === 'both';
  if (mode === 'walk') {
    if (gait === 'run') {
      // sprint: long strides, knees up, pumping arms, body pitched forward
      const w = t * 13, s = Math.sin(w);
      lL = s * 1.05 - 0.15; lR = -s * 1.05 - 0.15;
      kL = Math.max(0, Math.cos(w)) * 1.5 + 0.25; kR = Math.max(0, -Math.cos(w)) * 1.5 + 0.25;
      if (!holdL) aL += -s * 1.1 - 0.3;
      if (!holdR) aR += s * 1.1 - 0.3;
      bob = Math.abs(Math.cos(w)) * 0.045;
      lean += 0.32; twist = s * 0.16; headX = -0.1;
    } else if (gait === 'shamble') {
      // undead lurch: dragging step, arms reaching forward, head lolling
      const w = t * 8.5, s = Math.sin(w);
      lL = s * 0.7 - 0.05; lR = -s * 0.5 - 0.05;
      kL = Math.max(0, Math.cos(w)) * 0.9 + 0.12; kR = Math.max(0, -Math.cos(w)) * 0.5 + 0.2;
      if (!holdL) aL = -1.25 + Math.sin(w + 1.2) * 0.22;
      if (!holdR) aR = -1.05 + Math.sin(w + 2.6) * 0.26;
      bob = Math.abs(Math.cos(w)) * 0.03;
      lean += 0.2 + Math.sin(w * 0.5) * 0.04; roll = Math.sin(w) * 0.09; twist = s * 0.1;
      headZ = 0.16 + Math.sin(w * 0.5) * 0.1; headX = Math.sin(w * 0.5 + 1) * 0.08;
    } else {
      const w = t * 9, s = Math.sin(w);
      lL = s * 0.75; lR = -lL;
      kL = Math.max(0, Math.cos(w)) * 0.8; kR = Math.max(0, -Math.cos(w)) * 0.8;
      if (!holdL) aL += Math.sin(w + Math.PI) * 0.55;
      if (!holdR) aR += s * 0.55;
      bob = Math.abs(s) * 0.022;
      lean += 0.07;
      headZ += Math.sin(w * 0.5) * 0.05;
    }
  } else if (mode === 'attack') {
    const k = t * 13;
    if (u.hold !== 'both') { aR = -1.5 + Math.sin(k) * 0.55; aL = -1.5 + Math.sin(k + Math.PI) * 0.55; }
    lean += 0.2 + Math.sin(k) * 0.04;
    headX = Math.sin(k) * 0.12;
    bob = Math.abs(Math.sin(k * 0.5)) * 0.012;
    kL = 0.25; kR = 0.1; lL = -0.2; lR = 0.15;
  } else {
    bob = Math.sin(t * 2.2) * 0.006;
    headZ += Math.sin(t * 1.1) * 0.04;
    headX = Math.sin(t * 0.8) * 0.03;
  }
  if (recoil > 0) {
    // wind-up then snap forward: reads as a throw
    const k = Math.sin(recoil * Math.PI);
    const to = recoil > 0.5 ? 1.0 : -2.5;
    if (u.thrower === 'R' || u.thrower === 'both') aR += (to - aR) * Math.max(k, recoil > 0.5 ? 0.9 : 0);
    if (u.thrower === 'L' || u.thrower === 'both') aL += (to - aL) * Math.max(k, recoil > 0.5 ? 0.9 : 0);
    lean += recoil > 0.5 ? -0.12 : 0.2 * k;
  }
  if (act > 0) bob += Math.sin(act * Math.PI) * 0.09;
  p.legL.rotation.x = lL; p.legR.rotation.x = lR;
  if (p.shinL) { p.shinL.rotation.x = kL; p.shinR.rotation.x = kR; }
  p.armL.rotation.x = aL; p.armR.rotation.x = aR;
  T.position.y = 0.3 + bob;
  T.rotation.x = lean; T.rotation.z = roll; T.rotation.y = twist;
  p.head.rotation.x = headX - lean * 0.6;
  p.head.rotation.z = headZ - roll;
  p.head.rotation.y = -twist * 0.7;
};
