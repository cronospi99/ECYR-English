/* Parametric chibi person: one function builds every human in the cast (teachers, students,
   parents…). Outfit, hair, face and pose come from options; props are added by the caller on the
   returned limbs. */
import { Builder, type Mode, type Rig, type Seg, type TickFn, type V3 } from './builder';

export type Hair = 'short' | 'long' | 'bun' | 'afro' | 'bald' | 'cap' | 'capSide' | 'capBack' | 'hood'
  | 'beanie' | 'net' | 'rollers' | 'messy' | 'ponytail';
export type Face = 'happy' | 'angry' | 'bored' | 'smirk' | 'focus' | 'shout';

export interface Human {
  skin?: number; shirt: number; pants: number; shoes?: number;
  hair?: number; style?: Hair; hat?: number;
  face?: Face; glasses?: number; shades?: number; beard?: number; mustache?: number;
  bulk?: number; sleeve?: number; shorts?: boolean; skirt?: number; coat?: number;
  /** Rest rotation of each arm (x: forward/back, z: out from the body). */
  armL?: V3; armR?: V3;
  /** Arms that keep their pose instead of swinging while walking. */
  hold?: 'L' | 'R' | 'both';
  lean?: number;
  /** Which arm throws when the defender fires. */
  thrower?: 'L' | 'R' | 'both' | 'none';
}

export interface Limbs { torso: Seg; head: Seg; armL: Seg; armR: Seg; legL: Seg; legR: Seg }

const DARK = 0x1c1a22, WHITE = 0xffffff;
const shade = (c: number, k: number) => {
  const r = Math.min(255, ((c >> 16) & 255) * k) | 0, g = Math.min(255, ((c >> 8) & 255) * k) | 0, b = Math.min(255, (c & 255) * k) | 0;
  return (r << 16) | (g << 8) | b;
};

export function human(b: Builder, o: Human): Limbs {
  const skin = o.skin ?? 0xe9b98c, bulk = o.bulk ?? 1, hair = o.hair ?? 0x3a2a1e;
  const sleeve = o.sleeve ?? o.shirt, shoes = o.shoes ?? 0x2b2b33;
  const sx = 0.15 * bulk + 0.035;

  /* legs */
  const leg = (name: string, x: number) => {
    const s = b.part(name, 'turn', [x, 0.3, 0], false);
    if (o.shorts) {
      s.cap(o.pants, [0, 0, 0], [0, -0.09, 0], 0.062 * Math.min(bulk, 1.2));
      s.cap(skin, [0, -0.1, 0], [0, -0.22, 0], 0.045);
    } else s.cap(o.pants, [0, 0, 0], [0, -0.22, 0], 0.056 * Math.min(bulk, 1.25));
    s.add('sph', shoes, [0, -0.262, 0.03], [0.062, 0.042, 0.1]);
    s.add('sph', shade(shoes, 1.9), [0, -0.285, 0.03], [0.06, 0.016, 0.098]);
    return s;
  };
  const legL = leg('legL', -0.07 * bulk), legR = leg('legR', 0.07 * bulk);

  /* torso */
  const torso = b.part('torso', 'turn', [0, 0.3, 0]);
  torso.cap(o.shirt, [0, 0.05, 0], [0, 0.2, 0], 0.125 * bulk);
  torso.add('sph', o.pants, [0, 0.03, 0], [0.128 * bulk, 0.07, 0.118 * bulk]);
  if (o.skirt != null) torso.add('cone', o.skirt, [0, -0.02, 0], [0.19 * bulk, 0.2, 0.17 * bulk]);
  if (o.coat != null) {
    // open coat: two front panels and a longer back
    torso.add('sph', o.coat, [0, 0.1, -0.03], [0.15 * bulk, 0.22, 0.125 * bulk]);
    torso.add('box', o.coat, [-0.085 * bulk, 0.06, 0.085], [0.07, 0.3, 0.05], [0, 0, 0.08]);
    torso.add('box', o.coat, [0.085 * bulk, 0.06, 0.085], [0.07, 0.3, 0.05], [0, 0, -0.08]);
  }
  torso.cap(skin, [0, 0.3, 0], [0, 0.36, 0], 0.045); // neck

  /* arms */
  const arm = (name: string, side: number, rot: V3 | undefined) => {
    const s = b.part(name, 'torso', [side * sx, 0.27, 0], false);
    s.cap(sleeve, [0, 0, 0], [0, -0.13, 0], 0.046);
    s.cap(o.sleeve === undefined && o.coat != null ? o.coat : sleeve === skin ? skin : shade(sleeve, 0.93), [0, -0.13, 0], [0, -0.21, 0], 0.042);
    s.add('sph', skin, [0, -0.265, 0], 0.05);
    const r = rot ?? [0, 0, side * 0.12];
    s.group.rotation.set(r[0], r[1], r[2]);
    s.group.userData.base = r;
    return s;
  };
  const armL = arm('armL', -1, o.armL), armR = arm('armR', 1, o.armR);

  /* head */
  const head = b.part('head', 'torso', [0, 0.47, 0]);
  const R = 0.19;
  head.add('sph', skin, [0, 0, 0], [R, R * 0.96, R * 0.97]);
  head.add('sph', skin, [-R, -0.01, 0], [0.03, 0.045, 0.035]);
  head.add('sph', skin, [R, -0.01, 0], [0.03, 0.045, 0.035]);
  head.add('sph', shade(skin, 0.9), [0, -0.03, 0.19], 0.022);
  const f = o.face ?? 'happy';
  for (const side of [-1, 1]) {
    const x = side * 0.068;
    if (o.shades == null) {
      head.add('sph', WHITE, [x, 0.015, 0.16], [0.039, 0.047, 0.028]);
      head.add('sph', DARK, [x + (f === 'smirk' ? 0.008 : 0), f === 'bored' ? 0.002 : 0.014, 0.18], 0.02);
      head.add('sph', WHITE, [x + 0.008, 0.024, 0.196], 0.006);
    }
    if (f === 'bored') head.add('sph', shade(skin, 0.86), [x, 0.045, 0.172], [0.05, 0.034, 0.03]);
    const brow = o.hair != null && o.style !== 'bald' ? shade(hair, 0.7) : 0x3a2a1e;
    if (f === 'angry' || f === 'shout') head.add('box', brow, [x, 0.078, 0.186], [0.085, 0.024, 0.02], [0, 0, side * 0.5]);
    else if (f === 'focus') head.add('box', brow, [x, 0.082, 0.184], [0.075, 0.018, 0.02], [0, 0, side * 0.2]);
    else if (f !== 'bored') head.add('box', brow, [x, 0.094, 0.178], [0.07, 0.015, 0.02], [0, 0, side * -0.14]);
  }
  if (f === 'happy') { head.add('sph', 0x7a2a2a, [0, -0.088, 0.168], [0.05, 0.026, 0.02]); head.add('sph', 0xf08a8a, [0, -0.098, 0.172], [0.03, 0.012, 0.016]); }
  else if (f === 'angry') { head.add('box', 0x5a1a1a, [0, -0.092, 0.172], [0.085, 0.03, 0.02]); head.add('box', WHITE, [0, -0.086, 0.178], [0.07, 0.012, 0.016]); }
  else if (f === 'shout') { head.add('sph', 0x5a1a1a, [0, -0.092, 0.166], [0.05, 0.05, 0.022]); head.add('box', WHITE, [0, -0.064, 0.176], [0.05, 0.012, 0.016]); }
  else if (f === 'bored') head.add('box', 0x6a3a34, [0, -0.09, 0.176], [0.045, 0.012, 0.016]);
  else if (f === 'smirk') head.add('box', 0x6a2a2a, [0.012, -0.088, 0.174], [0.06, 0.014, 0.016], [0, 0, 0.22]);
  else head.add('box', 0x6a3a34, [0, -0.09, 0.176], [0.035, 0.014, 0.016]);
  if (f === 'happy' || f === 'smirk') for (const s of [-1, 1]) head.add('sph', 0xf29a9a, [s * 0.115, -0.045, 0.138], [0.03, 0.02, 0.016]);

  if (o.glasses != null) {
    for (const s of [-1, 1]) head.ring(o.glasses, 0.05, 0.009, [s * 0.068, 0.015, 0.19]);
    head.add('box', o.glasses, [0, 0.02, 0.192], [0.04, 0.01, 0.01]);
  }
  if (o.shades != null) {
    for (const s of [-1, 1]) head.add('sph', o.shades, [s * 0.07, 0.02, 0.172], [0.055, 0.04, 0.03]);
    head.add('box', o.shades, [0, 0.03, 0.18], [0.3, 0.014, 0.014]);
  }
  if (o.mustache != null) head.add('sph', o.mustache, [0, -0.058, 0.186], [0.062, 0.02, 0.022]);
  if (o.beard != null) {
    head.add('sph', o.beard, [0, -0.105, 0.09], [0.15, 0.1, 0.13]);
    head.add('sph', o.beard, [0, -0.058, 0.184], [0.07, 0.022, 0.024]);
  }

  /* hair & hats */
  const st = o.style ?? 'short', hat = o.hat ?? 0xd03a3a;
  const capOn = (c: number, tilt = -0.32, k = 1.045) => head.add('dome', c, [0, 0.012, -0.006], [R * k, R * k, R * k], [tilt, 0, 0]);
  if (st === 'short' || st === 'long' || st === 'bun' || st === 'ponytail' || st === 'messy') capOn(hair);
  if (st === 'short') head.add('sph', hair, [0.05, 0.13, 0.1], [0.1, 0.05, 0.07], [0, 0, -0.3]);
  if (st === 'messy') for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2;
    head.add('cone', hair, [Math.cos(a) * 0.12, 0.15 + (i % 2) * 0.03, Math.sin(a) * 0.12 - 0.02], [0.05, 0.12, 0.05], [Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7]);
  }
  if (st === 'long') { head.add('sph', hair, [0, -0.07, -0.07], [0.2, 0.22, 0.14]); head.add('sph', hair, [-0.15, -0.08, 0.02], [0.06, 0.17, 0.09]); head.add('sph', hair, [0.15, -0.08, 0.02], [0.06, 0.17, 0.09]); }
  if (st === 'bun') head.add('sph', hair, [0, 0.2, -0.06], 0.085);
  if (st === 'ponytail') { head.add('sph', hair, [0, 0.08, -0.2], 0.06); head.add('sph', hair, [0, -0.04, -0.25], [0.055, 0.14, 0.06], [0.4, 0, 0]); }
  if (st === 'afro') { capOn(hair); head.add('sph', hair, [0, 0.1, -0.08], [0.26, 0.23, 0.2]); }
  if (st === 'net') { capOn(hat, -0.15, 1.07); head.add('sph', hair, [0, 0.05, -0.1], [0.17, 0.15, 0.13]); }
  if (st === 'rollers') {
    capOn(hair);
    for (let i = 0; i < 5; i++) head.add('cyl', 0xff8fb8, [-0.13 + i * 0.065, 0.165 - Math.abs(i - 2) * 0.022, 0.03], [0.034, 0.11, 0.034], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 4; i++) head.add('cyl', 0xffb3d0, [-0.1 + i * 0.065, 0.15 - Math.abs(i - 1.5) * 0.02, -0.09], [0.034, 0.1, 0.034], [Math.PI / 2, 0, 0]);
  }
  if (st === 'beanie') { capOn(hat, -0.22, 1.07); head.add('cyl', shade(hat, 0.8), [0, 0.045, 0], [R * 1.09, 0.045, R * 1.08]); head.add('sph', shade(hat, 1.3), [0, 0.22, -0.02], 0.045); head.add('sph', hair, [0, -0.05, -0.1], [0.18, 0.1, 0.1]); }
  if (st === 'hood') { head.add('sph', hat, [0, 0.02, -0.035], [R * 1.14, R * 1.12, R * 1.1]); head.add('sph', hair, [0, 0.12, 0.12], [0.13, 0.05, 0.06]); torso.add('sph', hat, [0, 0.3, -0.07], [0.15, 0.08, 0.1]); }
  if (st === 'cap' || st === 'capSide' || st === 'capBack') {
    capOn(hat, -0.12, 1.07);
    const ry = st === 'capSide' ? 1.15 : st === 'capBack' ? Math.PI : 0;
    head.add('cyl', shade(hat, 0.82), [Math.sin(ry) * 0.2, 0.075, Math.cos(ry) * 0.2], [0.12, 0.016, 0.13]);
    head.add('sph', shade(hat, 1.25), [0, 0.215, -0.006], 0.022);
    head.add('sph', hair, [0, -0.04, -0.11], [0.17, 0.1, 0.09]);
  }
  if (o.lean) b.parts.torso.rotation.x = o.lean;
  b.parts.torso.userData.lean = o.lean ?? 0;
  b.parts.torso.userData.hold = o.hold ?? '';
  b.parts.torso.userData.thrower = o.thrower ?? 'R';
  return { torso, head, armL, armR, legL, legR };
}

/** Shared animation for every human: walk cycle, pushing/nagging attack, breathing, throwing. */
export const humanTick: TickFn = (rig: Rig, t: number, mode: Mode, recoil: number, act: number) => {
  const p = rig.parts, T = p.torso, u = T.userData;
  const bL = p.armL.userData.base as V3, bR = p.armR.userData.base as V3;
  const w = t * 9;
  let aL = bL[0], aR = bR[0], lL = 0, lR = 0, bob = 0, lean = u.lean as number, headX = 0, headZ = 0;
  if (mode === 'walk') {
    lL = Math.sin(w) * 0.75; lR = -lL;
    if (u.hold !== 'L' && u.hold !== 'both') aL += Math.sin(w + Math.PI) * 0.55;
    if (u.hold !== 'R' && u.hold !== 'both') aR += Math.sin(w) * 0.55;
    bob = Math.abs(Math.sin(w)) * 0.022;
    lean += 0.07;
    headZ = Math.sin(w * 0.5) * 0.05;
  } else if (mode === 'attack') {
    const k = t * 13;
    if (u.hold !== 'both') { aR = -1.5 + Math.sin(k) * 0.55; aL = -1.5 + Math.sin(k + Math.PI) * 0.55; }
    lean += 0.2 + Math.sin(k) * 0.04;
    headX = Math.sin(k) * 0.12;
    bob = Math.abs(Math.sin(k * 0.5)) * 0.012;
  } else {
    bob = Math.sin(t * 2.2) * 0.006;
    headZ = Math.sin(t * 1.1) * 0.04;
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
  p.armL.rotation.x = aL; p.armR.rotation.x = aR;
  T.position.y = 0.3 + bob;
  T.rotation.x = lean;
  p.head.rotation.x = headX - lean * 0.6;
  p.head.rotation.z = headZ;
};
