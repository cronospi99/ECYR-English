/* Language Defenders — the cast. Twenty defenders (the school's staff, students and study tools
   that come alive) and nine distractions that try to get into class. Each entry builds its own
   3D model in code; see builder.ts for how the pieces are merged and animated. */
import * as THREE from 'three';
import { Builder, type TickFn, type V3 } from './builder';
import { human, humanTick } from './human';

const YAW_D = 0.85, YAW_E = -0.85;
type Make = (h: number) => THREE.Group;

const SKIN = { fair: 0xf3cfa8, tan: 0xe0a878, brown: 0xb9794c, deep: 0x8a5836, pale: 0xf7dcc4 };
const INK = 0x1c1a22, WHITE = 0xffffff, CREAM = 0xf6ecd2, GOLD = 0xf2b632;

/* ---------- small shared props ---------- */
function phone(b: Builder, parent: string, p: V3, r: V3 = [0, 0, 0], k = 1) {
  b.glow(parent, 'box', 0x6fe6ff, p, [0.082 * k, 0.142 * k, 0.012], r);
  const s = b.parts[parent];
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.09 * k, 0.15 * k, 0.014), new THREE.MeshStandardMaterial({ color: 0x15161c, roughness: 0.4 }));
  body.position.set(p[0], p[1], p[2] + 0.006); body.rotation.set(...r);
  s.add(body);
}
const faceOn = (seg: ReturnType<Builder['part']>, y: number, z: number, k = 1, mood: 'happy' | 'calm' | 'wow' = 'happy') => {
  for (const s of [-1, 1]) {
    seg.add('sph', WHITE, [s * 0.07 * k, y, z], [0.045 * k, 0.055 * k, 0.02]);
    seg.add('sph', INK, [s * 0.07 * k, y - 0.004, z + 0.014], 0.022 * k);
    seg.add('sph', WHITE, [s * 0.07 * k + 0.008, y + 0.012, z + 0.03], 0.007 * k);
  }
  if (mood === 'wow') seg.add('sph', 0x5a1a1a, [0, y - 0.1 * k, z], [0.035 * k, 0.045 * k, 0.02]);
  else seg.add('sph', 0x5a1a1a, [0, y - 0.09 * k, z], [0.05 * k, mood === 'calm' ? 0.012 * k : 0.026 * k, 0.02]);
  for (const s of [-1, 1]) seg.add('sph', 0xf59a9a, [s * 0.125 * k, y - 0.06 * k, z - 0.006], [0.03 * k, 0.02 * k, 0.012]);
};
const stubLimbs = (b: Builder, color: number, y: number, x: number, shoes = 0x2b2b33) => {
  for (const s of [-1, 1]) {
    const leg = b.part(s < 0 ? 'legL' : 'legR', 'turn', [s * x * 0.5, y, 0], false);
    leg.cap(color, [0, 0, 0], [0, -y + 0.05, 0], 0.035);
    leg.add('sph', shoes, [0, -y + 0.035, 0.03], [0.055, 0.035, 0.085]);
  }
};

/* =====================================================================================
   DEFENDERS
   ===================================================================================== */

/** Lumi — a desk lamp that turns electricity into bright ideas (the economy unit). */
const lamp = (twin: boolean): Make => (h) => {
  const b = new Builder();
  const base = b.part('base');
  base.add('cyl', 0x2f6f8f, [0, 0.03, 0], [0.2, 0.06, 0.2]);
  base.add('cyl', 0x3f8fb0, [0, 0.07, 0], [0.16, 0.03, 0.16]);
  base.add('sph', GOLD, [0.1, 0.09, 0.09], 0.025);
  const heads = twin ? [-1, 1] : [0];
  heads.forEach((s, i) => {
    const neck = b.part('neck' + i, 'base', [s * 0.06, 0.08, 0]);
    neck.cap(0xd8dde6, [0, 0, 0], [s * 0.1, 0.33, -0.05], 0.022);
    neck.add('sph', 0x3f8fb0, [s * 0.1, 0.33, -0.05], 0.04);
    neck.cap(0xd8dde6, [s * 0.1, 0.33, -0.05], [s * 0.13, 0.6, 0.04], 0.022);
    const head = b.part('head' + i, 'neck' + i, [s * 0.13, 0.62, 0.06]);
    head.add('cone', 0xffc93c, [0, 0.03, 0], [0.19, 0.2, 0.19], [0.5, 0, 0]);
    head.add('cyl', 0xf2a51e, [0, 0.12, -0.06], [0.05, 0.06, 0.05], [0.5, 0, 0]);
    faceOn(head, -0.07, 0.19, 0.72);
    b.glow('head' + i, 'sph', 0xfff3b0, [0, -0.06, 0.07], [0.12, 0.12, 0.12]);
  });
  const tick: TickFn = (rig, t, _m, _r, act) => {
    heads.forEach((_s, i) => {
      const n = rig.parts['neck' + i], hd = rig.parts['head' + i];
      n.rotation.z = Math.sin(t * 1.6 + i * 2) * 0.05;
      hd.rotation.x = Math.sin(t * 2.1 + i) * 0.08 - Math.sin(act * Math.PI) * 0.5;
      hd.scale.setScalar(1 + Math.sin(act * Math.PI) * 0.18);
    });
    const pulse = 0.9 + Math.sin(t * 3) * 0.1 + Math.sin(act * Math.PI) * 0.5;
    for (const g of rig.glows) g.scale.setScalar(0.12 * pulse);
  };
  return b.finish(h, YAW_D * 0.6, tick);
};

/** Profe Tiza — the classic teacher, never misses with a piece of chalk. */
const chalkTeacher: Make = (h) => {
  const b = new Builder();
  const L = human(b, { skin: SKIN.tan, shirt: 0x2f8f6a, pants: 0x3a4660, hair: 0x4a2c1a, style: 'bun', glasses: 0x24303a, skirt: 0x3a4660, face: 'happy', armL: [-0.5, 0, -0.5] });
  L.torso.add('box', WHITE, [0, 0.21, 0.11], [0.09, 0.06, 0.03]);
  L.armR.add('cyl', WHITE, [0, -0.3, 0.03], [0.014, 0.09, 0.014], [1.2, 0, 0]);
  L.armL.add('box', 0x1f5a45, [0, -0.3, 0.02], [0.16, 0.02, 0.12], [0.3, 0, 0]);   // little slate
  L.armL.add('box', 0xc99a5a, [0, -0.3, 0.02], [0.18, 0.012, 0.14], [0.3, 0, 0]);
  return b.finish(h, YAW_D, humanTick);
};

/** Marker Max — two markers, two shots. */
const markerMax: Make = (h) => {
  const b = new Builder();
  const L = human(b, { skin: SKIN.brown, shirt: 0x3d7bd8, pants: 0x2a2f45, hair: 0x15131a, style: 'short', face: 'smirk', thrower: 'both', armL: [-0.6, 0, -0.2], armR: [-0.6, 0, 0.2] });
  L.torso.add('box', 0xd03a3a, [0, 0.16, 0.122], [0.035, 0.17, 0.02]);
  L.torso.add('box', WHITE, [0, 0.27, 0.1], [0.11, 0.04, 0.05]);
  for (const [arm, c] of [[L.armL, 0xe5484d], [L.armR, 0x2bb673]] as const) {
    arm.add('cyl', c, [0, -0.3, 0.04], [0.02, 0.13, 0.02], [1.3, 0, 0]);
    arm.add('cyl', INK, [0, -0.285, 0.11], [0.014, 0.03, 0.014], [1.3, 0, 0]);
  }
  return b.finish(h, YAW_D, humanTick);
};

/** Ms. Highlight — a fan of three highlighters for three shots at once. */
const msHighlight: Make = (h) => {
  const b = new Builder();
  const L = human(b, { skin: SKIN.fair, shirt: 0xffd23f, pants: 0x4b3f72, hair: 0x2a1c3a, style: 'long', face: 'focus', armR: [-1.1, 0, 0.1], armL: [0, 0, -0.5] });
  L.torso.add('box', 0x4b3f72, [0, 0.2, 0.115], [0.16, 0.03, 0.03]);
  [0xfff04a, 0xff6fb1, 0x7cf07a].forEach((c, i) => {
    L.armR.add('cyl', c, [(i - 1) * 0.05, -0.34, 0.02], [0.02, 0.14, 0.02], [0.2, 0, (i - 1) * -0.35]);
    L.armR.add('cyl', INK, [(i - 1) * 0.085, -0.41, 0.03], [0.012, 0.03, 0.012], [0.2, 0, (i - 1) * -0.35]);
  });
  return b.finish(h, YAW_D, humanTick);
};

/** Dicto — a pocket dictionary that plants itself in the corridor. */
const bookWall = (tall: boolean): Make => (h) => {
  const b = new Builder();
  const body = b.part('body', 'turn', [0, 0.1, 0]);
  if (!tall) {
    body.add('box', 0xc23b3b, [0, 0.38, 0], [0.56, 0.74, 0.26]);
    body.add('box', CREAM, [0.02, 0.38, 0.015], [0.54, 0.68, 0.22]);
    body.add('box', 0xc23b3b, [0, 0.38, 0.125], [0.56, 0.74, 0.03]);
    body.add('box', 0x8f2424, [-0.27, 0.38, 0], [0.035, 0.76, 0.28]);
    body.add('box', GOLD, [0, 0.66, 0.143], [0.34, 0.05, 0.01]);
    body.add('box', GOLD, [0, 0.12, 0.143], [0.22, 0.03, 0.01]);
    faceOn(body, 0.44, 0.145, 1.25, 'calm');
  } else {
    const tomes: [number, number, number][] = [[0x2f5fa8, 0.62, 0.3], [0x2f8f5a, 0.56, 0.27], [0x8a2f4a, 0.5, 0.25]];
    let y = 0;
    tomes.forEach(([c, w, d], i) => {
      const th = 0.3;
      body.add('box', c, [0, y + th / 2, 0], [w, th, d], [0, (i - 1) * 0.12, 0]);
      body.add('box', CREAM, [0.02, y + th / 2, 0.012], [w - 0.03, th - 0.06, d - 0.02], [0, (i - 1) * 0.12, 0]);
      body.add('box', GOLD, [-w / 2 + 0.05, y + th / 2, d / 2 + 0.004], [0.03, th - 0.08, 0.01], [0, (i - 1) * 0.12, 0]);
      y += th + 0.005;
    });
    faceOn(body, 0.73, 0.14, 1.1, 'calm');
    for (const s of [-1, 1]) body.add('box', INK, [s * 0.075, 0.82, 0.135], [0.09, 0.022, 0.02], [0, 0, s * 0.35]);
  }
  for (const s of [-1, 1]) {
    const a = b.part(s < 0 ? 'armL' : 'armR', 'body', [s * (tall ? 0.3 : 0.29), 0.4, 0.02], false);
    a.cap(INK, [0, 0, 0], [s * 0.1, -0.1, 0.05], 0.028);
    a.add('sph', WHITE, [s * 0.11, -0.12, 0.06], 0.045);
  }
  stubLimbs(b, INK, 0.12, 0.3);
  const tick: TickFn = (rig, t) => {
    rig.parts.body.position.y = 0.1 + Math.sin(t * 2) * 0.006;
    rig.parts.armL.rotation.z = Math.sin(t * 2) * 0.15; rig.parts.armR.rotation.z = -Math.sin(t * 2) * 0.15;
  };
  return b.finish(h, YAW_D * 0.75, tick);
};

/** Miss Shh — the librarian. One "shhh" and everything slows down. */
const librarian: Make = (h) => {
  const b = new Builder();
  const L = human(b, { skin: SKIN.pale, shirt: 0xb9a3e3, pants: 0x4a4458, hair: 0xb8b8c4, style: 'bun', glasses: 0xc23b6a, skirt: 0x5a5470, face: 'focus', armL: [-2.5, 0, 0.75], hold: 'L', thrower: 'R' });
  L.torso.add('sph', 0xf2efe6, [0, 0.27, 0.07], [0.09, 0.05, 0.06]);
  L.armR.add('box', 0x3d7bd8, [0, -0.3, 0.05], [0.1, 0.14, 0.035]);
  L.armR.add('box', CREAM, [0.005, -0.3, 0.05], [0.09, 0.125, 0.03]);
  return b.finish(h, YAW_D, humanTick);
};

/** Hall Monitor — "Wrong corridor!" Sends whoever arrives into the next lane. */
const hallMonitor: Make = (h) => {
  const b = new Builder();
  const L = human(b, { skin: SKIN.deep, shirt: 0xf7f4ec, pants: 0x2f3f6a, hair: 0x15131a, style: 'afro', face: 'shout', shorts: true, armR: [-2.3, 0, 0.5], hold: 'R', thrower: 'none' });
  L.torso.add('box', 0xff7a1a, [0, 0.16, 0.0], [0.06, 0.34, 0.27], [0, 0, 0.75]);
  L.torso.add('sph', 0xc0c6d0, [0.02, 0.2, 0.13], 0.025);
  L.armR.add('cyl', 0x8a6a4a, [0, -0.38, 0], [0.014, 0.2, 0.014]);
  L.armR.add(new THREE.CylinderGeometry(1, 1, 1, 8), 0xe5333a, [0, -0.52, 0], [0.12, 0.025, 0.12], [Math.PI / 2, 0, 0.39]);
  L.armR.add('box', WHITE, [0, -0.52, 0.014], [0.14, 0.035, 0.008]);
  return b.finish(h, YAW_D, humanTick);
};

/** Paper Pitcher — lobs paper balls over anything. */
const paperPitcher: Make = (h) => {
  const b = new Builder();
  const L = human(b, { skin: SKIN.tan, shirt: 0xe5484d, pants: 0x3a5a8a, hair: 0x4a2c1a, style: 'capBack', hat: 0x2f5fa8, face: 'smirk', shorts: true, shoes: 0xf4f4f8, armR: [-2.6, 0, 0.2] });
  L.torso.add('box', WHITE, [0, 0.17, 0.123], [0.1, 0.05, 0.01]);
  L.armR.add('sph', WHITE, [0, -0.33, 0], [0.055, 0.05, 0.055]);
  L.armR.add('box', 0xd8dde6, [0.02, -0.33, 0.03], [0.05, 0.04, 0.04], [0.5, 0.6, 0.3]);
  return b.finish(h, YAW_D, humanTick);
};

/** Doña Arepa — the cafeteria's finest. Her hot arepas splash a whole group. */
const lunchLady: Make = (h) => {
  const b = new Builder();
  const L = human(b, { skin: SKIN.brown, shirt: 0xff8fa8, pants: 0x4a4458, hair: 0x2a1a14, style: 'net', hat: 0xbfe6f5, bulk: 1.28, face: 'happy', armR: [-1.3, 0, 0.1], hold: 'L', armL: [-0.9, 0, -0.3] });
  L.torso.add('sph', WHITE, [0, 0.1, 0.07], [0.13, 0.17, 0.1]);
  L.torso.add('box', WHITE, [0, 0.27, 0.12], [0.14, 0.04, 0.02]);
  L.armR.add('cyl', 0x55565e, [0, -0.33, 0.14], [0.012, 0.22, 0.012], [1.5, 0, 0]);
  L.armR.add('cyl', 0x35363e, [0, -0.33, 0.3], [0.11, 0.022, 0.11]);
  L.armR.add('cyl', 0xf4d27a, [0, -0.31, 0.3], [0.085, 0.022, 0.085]);
  L.armR.add('sph', 0xc98a3a, [0.02, -0.298, 0.31], [0.04, 0.006, 0.03]);
  L.armL.add('cyl', 0xf4d27a, [0, -0.3, 0.02], [0.07, 0.02, 0.07], [0.4, 0, 0]);
  return b.finish(h, YAW_D, humanTick);
};

/** Coach Volley — the only one who can reach whatever flies over the yard. */
const coach: Make = (h) => {
  const b = new Builder();
  const L = human(b, { skin: SKIN.tan, shirt: 0x14b8a6, pants: 0x0f6f66, hair: 0x2a1a14, style: 'cap', hat: 0xf4f4f8, face: 'focus', shoes: 0xf4f4f8, armR: [-0.4, 0, 0.3], armL: [0, 0, -0.35] });
  L.torso.add('box', WHITE, [-0.105, 0.14, 0.02], [0.02, 0.24, 0.2]);
  L.torso.add('box', WHITE, [0.105, 0.14, 0.02], [0.02, 0.24, 0.2]);
  L.torso.ring(0xe5333a, 0.09, 0.008, [0, 0.27, 0.03], [1.2, 0, 0]);
  L.torso.add('cyl', 0xc0c6d0, [0, 0.19, 0.125], [0.02, 0.03, 0.02], [0, 0, 1.57]);
  L.armR.add('sph', 0xfdfdfd, [0, -0.36, 0.02], 0.085);
  L.armR.ring(0x3d7bd8, 0.084, 0.008, [0, -0.36, 0.02], [0.6, 0, 0]);
  L.armR.ring(0xf2b632, 0.084, 0.008, [0, -0.36, 0.02], [0, 0.8, 1.2]);
  // tall form (set by the engine): he jumps and spikes over his head
  const tick: TickFn = (rig, t, mode, recoil, act, dt) => {
    humanTick(rig, t, mode, recoil, act, dt);
    const tall = rig.root.userData.tall ? 1 : 0;
    rig.data.j = (rig.data.j ?? 0) + (tall - (rig.data.j ?? 0)) * Math.min(dt * 8, 1);
    const j = rig.data.j;
    rig.parts.turn.position.y = j * (0.42 + Math.sin(t * 7) * 0.04);
    rig.parts.armR.rotation.x += (-2.9 - rig.parts.armR.rotation.x) * j * (1 - recoil * 0.6);
    rig.parts.legL.rotation.x = rig.parts.legL.rotation.x * (1 - j) + 0.5 * j;
    rig.parts.legR.rotation.x = rig.parts.legR.rotation.x * (1 - j) - 0.3 * j;
  };
  return b.finish(h, YAW_D, tick);
};

/** Recess Bell — ring it and everyone around runs back to class (one use). */
const bell: Make = (h) => {
  const b = new Builder();
  const body = b.part('body', 'turn', [0, 0.5, 0]);
  body.add('dome', GOLD, [0, 0.02, 0], [0.33, 0.4, 0.33]);
  body.add('cyl', 0xf7c948, [0, 0.0, 0], [0.38, 0.07, 0.38]);
  body.add('cyl', 0xd9981e, [0, -0.04, 0], [0.4, 0.03, 0.4]);
  body.add('sph', 0xf7c948, [0, 0.43, 0], 0.07);
  body.ring(0xe5333a, 0.07, 0.022, [0, 0.52, 0], [0, 0, 0]);
  body.add('box', 0xe5333a, [-0.07, 0.42, 0.06], [0.1, 0.05, 0.02], [0, 0, 0.5]);
  body.add('box', 0xe5333a, [0.07, 0.42, 0.06], [0.1, 0.05, 0.02], [0, 0, -0.5]);
  faceOn(body, 0.2, 0.3, 1.25, 'wow');
  const cl = b.part('clap', 'body', [0, 0, 0], false);
  cl.cap(0x8a6a2a, [0, 0, 0], [0, -0.16, 0], 0.02);
  cl.add('sph', 0xc0862a, [0, -0.2, 0], 0.07);
  stubLimbs(b, INK, 0.36, 0.3, 0xe5333a);
  const tick: TickFn = (rig, t) => {
    rig.parts.body.rotation.z = Math.sin(t * 9) * 0.16;
    rig.parts.clap.rotation.z = -Math.sin(t * 9 + 0.6) * 0.5;
  };
  return b.finish(h, YAW_D * 0.6, tick);
};

/** Pop Quiz — lies face down in the corridor. Step on it and… surprise! */
const popQuiz: Make = (h) => {
  const b = new Builder();
  const body = b.part('body', 'turn', [0, 0.05, 0]);
  body.add('box', 0x8a6238, [0, 0.33, -0.1], [0.72, 0.9, 0.05], [-0.6, 0, 0]);
  body.add('box', WHITE, [0, 0.33, -0.07], [0.62, 0.78, 0.03], [-0.6, 0, 0]);
  body.add('box', 0xc0c6d0, [0, 0.69, -0.33], [0.3, 0.09, 0.06], [-0.6, 0, 0]);
  for (let i = 0; i < 3; i++) body.add('box', 0xb8c0cc, [-0.08, 0.2 - i * 0.09, 0.04 + i * 0.062], [0.36, 0.022, 0.012], [-0.6, 0, 0]);
  body.add('box', 0xe5333a, [0.2, 0.5, -0.14], [0.14, 0.14, 0.012], [-0.6, 0, 0.2]);
  for (const s of [-1, 1]) {
    body.add('sph', WHITE, [s * 0.1, 0.42, -0.09], [0.07, 0.085, 0.03], [-0.6, 0, 0]);
    body.add('sph', INK, [s * 0.1, 0.415, -0.07], 0.034);
  }
  b.glow('body', 'sph', 0xff4d5e, [0.33, 0.72, -0.2], 0.05);
  const tick: TickFn = (rig, t) => {
    rig.parts.body.position.y = 0.05 + Math.abs(Math.sin(t * 3)) * 0.02;
    rig.glows[0].scale.setScalar(0.05 * (0.7 + Math.abs(Math.sin(t * 5)) * 0.6));
  };
  return b.finish(h * 1.5, YAW_D * 0.5, tick);
};

/** Profe Química — her flasks keep burning after they land. */
const chemist: Make = (h) => {
  const b = new Builder();
  const L = human(b, { skin: SKIN.fair, shirt: 0xf4f6fb, pants: 0x3a4660, hair: 0xff7a2a, style: 'messy', glasses: 0x2bd4c4, face: 'happy', coat: 0xf4f6fb, armR: [-1.2, 0, 0.15] });
  L.torso.add('box', 0x8f5ad8, [0, 0.2, 0.122], [0.1, 0.12, 0.01]);
  L.armR.add('cyl', 0xcfeef5, [0, -0.36, 0.02], [0.02, 0.09, 0.02]);
  L.armR.add('cyl', 0x8a6a4a, [0, -0.41, 0.02], [0.024, 0.02, 0.024]);
  b.glow('armR', 'sph', 0x7dff6a, [0, -0.3, 0.02], 0.06);
  const tick: TickFn = (rig, t, m, r, a, dt) => { humanTick(rig, t, m, r, a, dt); rig.glows[0].scale.setScalar(0.06 * (0.9 + Math.sin(t * 6) * 0.12)); };
  return b.finish(h, YAW_D, tick);
};

/** Tack Mat — flat on the floor; whoever walks over it regrets it. */
const tackMat: Make = (h) => {
  const b = new Builder();
  const body = b.part('body');
  body.add('box', 0x3a4660, [0, 0.05, 0], [1.7, 0.08, 1.2]);
  body.add('box', 0x55627f, [0, 0.085, 0], [1.56, 0.03, 1.06]);
  const cols = [0xe5333a, 0xffd23f, 0x2bb673, 0x3d7bd8, 0xff6fb1];
  let k = 0;
  for (let x = -2; x <= 2; x++) for (let z = -1; z <= 1; z++) {
    const px = x * 0.32 + (z % 2) * 0.1, pz = z * 0.34;
    body.add('cyl', cols[k++ % cols.length], [px, 0.12, pz], [0.085, 0.035, 0.085]);
    body.add('cone', 0xd8dde6, [px, 0.26, pz], [0.022, 0.26, 0.022]);
  }
  const tick: TickFn = (rig, t) => { rig.parts.body.scale.y = 1 + Math.sin(t * 4) * 0.06; };
  return b.finish(h, 0.2, tick);
};

/** The Megaphone — one call from the principal clears the whole corridor (one use). */
const megaphone: Make = (h) => {
  const b = new Builder();
  const body = b.part('body', 'turn', [0, 0.45, 0]);
  body.add('cone', 0xe5333a, [0, 0.05, 0.12], [0.34, 0.56, 0.34], [-Math.PI / 2 + 0.25, 0, 0]);
  body.add('cyl', WHITE, [0, 0.12, 0.37], [0.35, 0.05, 0.35], [-Math.PI / 2 + 0.25, 0, 0]);
  body.add('cyl', 0x2b2b33, [0, -0.04, -0.2], [0.11, 0.2, 0.11], [-Math.PI / 2 + 0.25, 0, 0]);
  body.cap(0x2b2b33, [0, -0.06, -0.1], [0, -0.28, -0.14], 0.04);
  for (const s of [-1, 1]) { body.add('sph', WHITE, [s * 0.13, 0.26, 0.0], [0.07, 0.08, 0.05]); body.add('sph', INK, [s * 0.13, 0.265, 0.035], 0.03); body.add('box', INK, [s * 0.13, 0.35, 0.02], [0.13, 0.03, 0.03], [0, 0, s * 0.45]); }
  for (let i = 0; i < 3; i++) b.glow('body', new THREE.TorusGeometry(0.2 + i * 0.12, 0.018, 6, 20, Math.PI * 0.9), 0xfff3b0, [0, 0.16 + i * 0.03, 0.5 + i * 0.13], 1, [0.25, 0, Math.PI * 0.05]);
  stubLimbs(b, INK, 0.2, 0.26, 0xe5333a);
  const tick: TickFn = (rig, t) => {
    rig.parts.body.rotation.x = Math.sin(t * 8) * 0.05;
    rig.glows.forEach((g, i) => g.scale.setScalar(1 + ((t * 1.6 + i * 0.33) % 1) * 0.35));
  };
  return b.finish(h, YAW_D * 0.9, tick);
};

/** Robo-Tutor — its pointer beam goes through several targets in a row. */
const robot: Make = (h) => {
  const b = new Builder();
  const body = b.part('torso', 'turn', [0, 0.26, 0]);
  body.add('box', 0xeef2f7, [0, 0.14, 0], [0.34, 0.3, 0.26]);
  body.add('box', 0x3d7bd8, [0, 0.14, 0.132], [0.2, 0.12, 0.012]);
  body.add('cyl', 0x8892a6, [0, 0.31, 0], [0.06, 0.05, 0.06]);
  body.add('cyl', 0x55627f, [0, -0.04, 0], [0.13, 0.06, 0.13]);
  body.add('sph', 0x2b2b33, [0, -0.14, 0], [0.15, 0.11, 0.15]);
  const head = b.part('head', 'torso', [0, 0.47, 0]);
  head.add('box', 0xeef2f7, [0, 0, 0], [0.42, 0.3, 0.3]);
  head.add('box', 0x10141f, [0, 0, 0.145], [0.34, 0.2, 0.02]);
  head.add('cyl', 0x8892a6, [0, 0.2, 0], [0.012, 0.12, 0.012]);
  for (const s of [-1, 1]) head.add('cyl', 0x3d7bd8, [s * 0.22, 0, 0], [0.06, 0.04, 0.06], [0, 0, 1.57]);
  for (const s of [-1, 1]) b.glow('head', 'sph', 0x5cf2ff, [s * 0.08, 0.01, 0.158], [0.04, 0.05, 0.01]);
  b.glow('head', 'box', 0x5cf2ff, [0, -0.06, 0.158], [0.09, 0.014, 0.008]);
  b.glow('head', 'sph', 0xff4d5e, [0, 0.27, 0], 0.03);
  for (const s of [-1, 1]) {
    const a = b.part(s < 0 ? 'armL' : 'armR', 'torso', [s * 0.21, 0.24, 0], false);
    a.cap(0x8892a6, [0, 0, 0], [0, -0.17, 0], 0.035);
    a.add('sph', 0x3d7bd8, [0, -0.21, 0], 0.05);
    a.group.rotation.x = s > 0 ? -1.45 : 0;
    if (s > 0) { a.add('cyl', 0x2b2b33, [0, -0.3, 0], [0.018, 0.16, 0.018]); b.glow('armR', 'sph', 0xff4d5e, [0, -0.39, 0], 0.025); }
  }
  const tick: TickFn = (rig, t, _m, recoil) => {
    rig.parts.torso.position.y = 0.26 + Math.sin(t * 2.4) * 0.02;
    rig.parts.head.rotation.y = Math.sin(t * 1.3) * 0.18;
    rig.parts.armR.rotation.x = -1.45 - recoil * 0.4;
    rig.glows[3].visible = Math.sin(t * 6) > 0;
    rig.glows[4].scale.setScalar(0.025 * (1 + recoil * 3));
  };
  return b.finish(h, YAW_D, tick);
};

/** Projecto — a classroom projector whose beam crosses the whole lane. */
const projector: Make = (h) => {
  const b = new Builder();
  const legs = b.part('legs');
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + 0.5; legs.cap(0x2b2b33, [0, 0.5, 0], [Math.cos(a) * 0.28, 0.02, Math.sin(a) * 0.28], 0.022); }
  legs.add('cyl', 0x55627f, [0, 0.5, 0], [0.06, 0.06, 0.06]);
  const head = b.part('head', 'turn', [0, 0.58, 0]);
  head.add('box', 0xf4f6fb, [0, 0.12, 0], [0.5, 0.24, 0.4]);
  head.add('box', 0xc8cedb, [0, 0.245, 0], [0.4, 0.02, 0.3]);
  head.add('cyl', 0x2b2b33, [-0.1, 0.12, 0.22], [0.11, 0.08, 0.11], [Math.PI / 2, 0, 0]);
  head.add('box', 0x3d7bd8, [0.15, 0.2, 0.202], [0.1, 0.03, 0.01]);
  head.add('sph', WHITE, [0.14, 0.11, 0.2], [0.05, 0.06, 0.02]); head.add('sph', INK, [0.14, 0.107, 0.214], 0.024);
  head.add('sph', 0x5a1a1a, [0.14, 0.03, 0.2], [0.04, 0.014, 0.02]);
  b.glow('head', 'sph', 0x9af7ff, [-0.1, 0.12, 0.262], [0.085, 0.085, 0.02]);
  b.glow('head', 'sph', 0x7dff6a, [0.2, 0.2, 0.205], 0.014);
  const tick: TickFn = (rig, t, _m, recoil) => {
    rig.parts.head.rotation.x = Math.sin(t * 1.7) * 0.04 - recoil * 0.12;
    rig.parts.head.rotation.y = Math.sin(t * 0.9) * 0.08;
    rig.glows[0].scale.set(0.085 * (1 + recoil * 0.8), 0.085 * (1 + recoil * 0.8), 0.02);
  };
  return b.finish(h, YAW_D, tick);
};

/** Prof. Thesis — drops a 400-page binder on a whole group. They need a while to recover. */
const profThesis: Make = (h) => {
  const b = new Builder();
  const L = human(b, { skin: SKIN.fair, shirt: 0x8a6238, pants: 0x4a3f38, hair: 0xe9e9ee, style: 'short', beard: 0xe9e9ee, glasses: 0x2b2b33, face: 'focus', coat: 0x8a6238, thrower: 'both', armL: [-2.9, 0, 0.25], armR: [-2.9, 0, -0.25], hold: 'both' });
  L.torso.add('box', 0xc23b3b, [0, 0.25, 0.115], [0.07, 0.035, 0.03]);
  L.armL.add('box', 0x2f5fa8, [0.2, -0.33, 0], [0.34, 0.11, 0.26]);
  L.armL.add('box', CREAM, [0.2, -0.33, 0.012], [0.32, 0.085, 0.25]);
  L.armL.add('box', GOLD, [0.2, -0.33, 0.132], [0.2, 0.03, 0.006]);
  return b.finish(h, YAW_D, humanTick);
};

/* =====================================================================================
   DISTRACTIONS (the opposing side)
   ===================================================================================== */

/** The Scroller — eyes on the screen, feet on autopilot. */
const scroller: Make = (h) => {
  const b = new Builder();
  const L = human(b, { skin: 0x5fe0d2, zombie: 0xfff2a0, shirt: 0x5b6b8c, pants: 0x2f3545, hair: 0x2a1a14, style: 'hood', hat: 0x5b6b8c, face: 'bored', shoes: 0xf4f4f8, armL: [-1.45, 0, 0.45], armR: [-1.45, 0, -0.45], hold: 'both', lean: 0.16 });
  L.torso.add('sph', 0xe5484d, [0, 0.14, -0.13], [0.12, 0.15, 0.08]);
  L.torso.add('box', 0xb8333a, [0, 0.1, -0.2], [0.14, 0.09, 0.03]);
  L.torso.add('box', 0x4a5873, [0, 0.07, 0.12], [0.17, 0.07, 0.03]);
  phone(b, 'torso', [0, 0.3, 0.26], [-0.5, 0, 0]);
  return b.finish(h, YAW_E, humanTick);
};

/** The Streamer — leads the wave, filming everything with a ring light. */
const streamer: Make = (h) => {
  const b = new Builder();
  const L = human(b, { skin: 0x8fe89a, zombie: 0xff6ab8, shirt: 0xff5fa2, pants: 0xf4f4f8, hair: 0xf2d16b, style: 'long', shades: 0x1c1a22, face: 'happy', shoes: 0xff5fa2, armR: [-2.2, 0, 0.5], hold: 'R', armL: [0, 0, -0.6] });
  L.torso.add('box', 0xffd23f, [0, 0.19, 0.122], [0.1, 0.06, 0.01]);
  L.armR.cap(0x8892a6, [0, -0.28, 0], [0, -0.56, 0.05], 0.012);
  L.armR.ring(0xd8dde6, 0.12, 0.014, [0, -0.66, 0.07], [0.3, 0, 0]);
  b.glow('armR', new THREE.TorusGeometry(0.12, 0.016, 8, 24), 0xfff6c8, [0, -0.66, 0.076], 1, [0.3, 0, 0]);
  phone(b, 'armR', [0, -0.66, 0.07], [0.3, 0, 0], 0.85);
  L.armL.add('sph', 0xfff3b0, [0, -0.33, 0.02], [0.05, 0.05, 0.05]);
  return b.finish(h, YAW_E, humanTick);
};

/** The Gamer — headset on, hears nothing. Takes more convincing. */
const gamer: Make = (h) => {
  const b = new Builder();
  const L = human(b, { skin: 0x52c8dc, zombie: 0x7dff6a, shirt: 0x1f2230, pants: 0x3a3f55, hair: 0x15131a, style: 'short', face: 'focus', shoes: 0x7dff6a, armL: [-1.25, 0, 0.5], armR: [-1.25, 0, -0.5], hold: 'both', lean: 0.08 });
  L.head.ring(0x2b2b33, 0.205, 0.022, [0, 0.02, 0], [0, Math.PI / 2, 0], Math.PI);
  for (const s of [-1, 1]) { L.head.add('cyl', 0x2b2b33, [s * 0.2, 0, 0], [0.075, 0.05, 0.075], [0, 0, 1.57]); b.glow('head', 'cyl', 0x7dff6a, [s * 0.228, 0, 0], [0.04, 0.008, 0.04], [0, 0, 1.57]); }
  L.head.cap(0x2b2b33, [-0.2, -0.03, 0.02], [-0.12, -0.09, 0.17], 0.012);
  L.head.add('sph', 0x2b2b33, [-0.11, -0.09, 0.18], 0.022);
  L.torso.add('box', 0x7dff6a, [0, 0.18, 0.123], [0.11, 0.07, 0.01]);
  L.torso.add('box', 0x3a3f55, [0, 0.19, 0.25], [0.2, 0.06, 0.09]);
  for (const s of [-1, 1]) L.torso.add('sph', 0x3a3f55, [s * 0.1, 0.17, 0.25], [0.05, 0.07, 0.055]);
  b.glow('torso', 'sph', 0xff4d5e, [0.06, 0.225, 0.26], 0.014);
  b.glow('torso', 'sph', 0x5cf2ff, [-0.06, 0.225, 0.26], 0.014);
  return b.finish(h, YAW_E, humanTick);
};

/** The Angry Dad — calm while he reads the report card… furious when it sinks in. */
const angryDad: Make = (h) => {
  const b = new Builder();
  const L = human(b, { skin: 0xa8c8dc, zombie: 0xfff2a0, shirt: 0xdfe8f5, pants: 0x4a4038, hair: 0x4a3a2a, style: 'bald', mustache: 0x3a2a1e, face: 'angry', bulk: 1.18, armR: [-1.7, 0, 0.1], hold: 'R', armL: [0, 0, -0.5] });
  L.head.add('sph', 0x4a3a2a, [0, 0.02, -0.06], [0.2, 0.12, 0.17]);
  L.torso.add('box', 0xb8333a, [0.01, 0.15, 0.15], [0.04, 0.2, 0.02], [0, 0, -0.12]);
  L.torso.add('box', 0x2b2b33, [0, 0.03, 0.14], [0.26, 0.03, 0.03]);
  L.armR.add('box', WHITE, [0, -0.36, 0.03], [0.18, 0.23, 0.012], [0.2, 0, 0.1]);
  L.armR.add('box', 0xe5333a, [0.03, -0.33, 0.04], [0.07, 0.09, 0.008], [0.2, 0, 0.1]);
  for (let i = 0; i < 3; i++) L.armR.add('box', 0x8892a6, [-0.03, -0.4 - i * 0.03, 0.035], [0.09, 0.01, 0.008], [0.2, 0, 0.1]);
  for (const s of [-1, 1]) L.head.add('cone', 0xfff0f0, [s * 0.16, 0.24, 0], [0.025, 0.07, 0.025], [0, 0, s * -0.5]);
  return b.finish(h, YAW_E, humanTick);
};

/** The Angry Mom — her handbag is a shield and she is not leaving without answers. */
const angryMom: Make = (h) => {
  const b = new Builder();
  const L = human(b, { skin: 0x7de0a8, zombie: 0xfff2a0, shirt: 0x8f5ad8, pants: 0x6a3fa8, hair: 0x5a2a1e, style: 'rollers', face: 'angry', skirt: 0x8f5ad8, bulk: 1.12, shoes: 0xff8fb8, armL: [-1.35, 0, 0.3], armR: [-2.5, 0, -0.3], hold: 'both' });
  L.torso.ring(0xf7f4ec, 0.095, 0.014, [0, 0.29, 0.02], [1.35, 0, 0]);
  L.armL.add('box', 0xc9862a, [0.06, -0.42, 0.06], [0.34, 0.27, 0.12]);
  L.armL.add('box', 0xa86a1a, [0.06, -0.31, 0.06], [0.36, 0.06, 0.13]);
  L.armL.add('sph', GOLD, [0.06, -0.34, 0.13], 0.03);
  L.armL.ring(0xa86a1a, 0.09, 0.014, [0.06, -0.25, 0.06], [0, 0, 0], Math.PI);
  L.armR.add('box', 0x7de0a8, [0, -0.33, 0], [0.025, 0.09, 0.025]);
  return b.finish(h, YAW_E, humanTick);
};

/** The Ñero — fast, loud and always in a hurry to cut class. */
const nero: Make = (h) => {
  const b = new Builder();
  const L = human(b, { skin: 0x4fd6c4, zombie: 0xffb02e, shirt: 0xf4f4f8, pants: 0x2a3550, hair: 0x15131a, style: 'capSide', hat: 0xe5333a, face: 'smirk', shorts: true, shoes: 0xf4f4f8, bulk: 1.08, armL: [0.2, 0, -0.5], armR: [0.2, 0, 0.5], lean: 0.2 });
  L.torso.add('cyl', 0x1f8f4a, [0, 0.17, 0], [0.139, 0.05, 0.139]);
  L.torso.add('cyl', 0x1f8f4a, [0, 0.09, 0], [0.139, 0.03, 0.139]);
  L.torso.ring(GOLD, 0.085, 0.013, [0, 0.25, 0.05], [1.05, 0, 0]);
  L.torso.add('sph', GOLD, [0, 0.185, 0.13], 0.028);
  L.head.add('sph', 0x15131a, [0, -0.125, 0.15], [0.035, 0.03, 0.02]);
  for (const leg of [L.legL, L.legR]) leg.add('cyl', 0xf4f4f8, [0, -0.2, 0], [0.05, 0.07, 0.05]);
  L.legL.add('box', 0xe5333a, [0, -0.262, 0.07], [0.07, 0.02, 0.05]);
  L.legR.add('box', 0xe5333a, [0, -0.262, 0.07], [0.07, 0.02, 0.05]);
  return b.finish(h, YAW_E, humanTick);
};

/** The Drone Rider — skips the corridor altogether by flying over it. */
const droneRider: Make = (h) => {
  const b = new Builder();
  const L = human(b, { skin: 0x9aee6a, zombie: 0xfff2a0, shirt: 0xffb02e, pants: 0x3a4660, hair: 0x6a3a1a, style: 'beanie', hat: 0x2bb673, face: 'happy', shoes: 0xe5333a, armL: [-3.0, 0, 0.25], armR: [-3.0, 0, -0.25], hold: 'both' });
  L.torso.add('box', 0x2b2b33, [0, 0.16, 0.12], [0.1, 0.1, 0.02]);
  const d = b.part('drone', 'turn', [0, 1.1, 0]);
  d.add('box', 0x2b2b33, [0, 0, 0], [0.2, 0.07, 0.16]);
  d.add('box', 0xff4d5e, [0, 0.04, 0], [0.12, 0.02, 0.1]);
  d.cap(0x55627f, [0, -0.02, 0], [0, -0.2, 0], 0.014);
  d.cap(0x55627f, [-0.16, -0.21, 0], [0.16, -0.21, 0], 0.016);
  const arms: V3[] = [[-0.27, 0.01, -0.2], [0.27, 0.01, -0.2], [-0.27, 0.01, 0.2], [0.27, 0.01, 0.2]];
  arms.forEach((p, i) => {
    d.cap(0x3a3f55, [0, 0, 0], p, 0.016);
    d.add('cyl', 0x3a3f55, [p[0], 0.03, p[2]], [0.03, 0.05, 0.03]);
    const r = b.part('rotor' + i, 'drone', [p[0], 0.07, p[2]], false);
    r.add('box', 0xd8dde6, [0, 0, 0], [0.3, 0.008, 0.035]);
    r.add('box', 0xd8dde6, [0, 0, 0], [0.035, 0.008, 0.3]);
  });
  b.glow('drone', 'sph', 0x7dff6a, [0, -0.01, 0.085], 0.016);
  const tick: TickFn = (rig, t, m, r, a, dt) => {
    humanTick(rig, t, 'idle', r, a, dt);
    for (let i = 0; i < 4; i++) rig.parts['rotor' + i].rotation.y = t * 40 * (i % 2 ? 1 : -1);
    rig.parts.drone.rotation.z = Math.sin(t * 2.3) * 0.06;
    rig.parts.legL.rotation.x = 0.25 + Math.sin(t * 3) * 0.2;
    rig.parts.legR.rotation.x = -0.1 - Math.sin(t * 3) * 0.2;
    rig.parts.torso.rotation.z = Math.sin(t * 2.3) * 0.08;
    void m;
  };
  return b.finish(h * 0.8, YAW_E, tick);
};

/** The Drifter — wandered in off the street with all his things. Slow, and very hard to move. */
const drifter: Make = (h) => {
  const b = new Builder();
  const L = human(b, { skin: 0x9ab8d0, zombie: 0x9af0ff, shirt: 0x7a6a4a, pants: 0x4a4a3a, hair: 0x6a5a4a, style: 'beanie', hat: 0x8a3a2a, beard: 0x6a5a4a, face: 'bored', coat: 0x6b7a4a, bulk: 1.15, shoes: 0x5a4030, armR: [-1.1, 0, 0.1], hold: 'R', armL: [0, 0, -0.4], lean: 0.12 });
  L.torso.add('box', 0xc9a05a, [-0.09, 0.08, 0.125], [0.07, 0.07, 0.01], [0, 0, 0.2]);
  L.torso.add('box', 0x8a3a2a, [0.1, 0.19, 0.125], [0.06, 0.05, 0.01], [0, 0, -0.3]);
  L.torso.ring(0xb8333a, 0.1, 0.028, [0, 0.3, 0.02], [1.45, 0, 0]);
  L.torso.cap(0x8a6238, [0.21, 0.2, 0.2], [0.2, 0.5, -0.42], 0.016);
  L.torso.add('sph', 0xd9c7a0, [0.2, 0.46, -0.46], [0.17, 0.16, 0.17]);
  L.torso.add('sph', 0xc9b48a, [0.2, 0.6, -0.44], [0.06, 0.05, 0.06]);
  L.torso.add('box', 0xe5484d, [0.3, 0.44, -0.36], [0.09, 0.09, 0.012], [0, 0.9, 0.3]);
  L.armL.add('cyl', 0xc0c6d0, [0, -0.33, 0.03], [0.045, 0.09, 0.045]);
  return b.finish(h, YAW_E, humanTick);
};

/** El Duro — the boss of the block, with a speaker that fills two corridors. */
const boss: Make = (h) => {
  const b = new Builder();
  const L = human(b, { skin: 0x45c4b4, zombie: 0xff4d5e, shirt: 0x1c1a22, sleeve: 0x45c4b4, pants: 0x3a4a7a, hair: 0x15131a, style: 'bald', hat: 0xe5333a, shades: 0x101014, beard: 0x15131a, face: 'smirk', bulk: 1.45, shoes: 0xf4f4f8, armR: [-2.6, 0, 0.35], hold: 'R', armL: [0.1, 0, -0.5], lean: 0.05 });
  L.head.add('cyl', 0xe5333a, [0, 0.085, 0], [0.198, 0.06, 0.196]);
  L.head.add('box', 0xe5333a, [0.05, 0.08, -0.2], [0.04, 0.05, 0.12], [0.5, 0, 0.3]);
  L.head.add('box', 0xe5333a, [-0.05, 0.08, -0.2], [0.04, 0.05, 0.12], [0.5, 0, -0.3]);
  L.torso.ring(GOLD, 0.11, 0.02, [0, 0.24, 0.07], [1.0, 0, 0]);
  L.torso.add('box', GOLD, [0, 0.13, 0.19], [0.075, 0.075, 0.015], [0, 0, 0.78]);
  L.armL.ring(GOLD, 0.05, 0.014, [0, -0.2, 0], [Math.PI / 2, 0, 0]);
  L.torso.add('box', 0x2b2b33, [0.3, 0.5, -0.06], [0.24, 0.24, 0.42]);
  L.torso.add('box', 0xc0c6d0, [0.3, 0.5, -0.06], [0.25, 0.25, 0.1]);
  for (const s of [-1, 1]) { L.torso.add('cyl', 0x55627f, [0.3, 0.5, -0.06 + s * 0.212], [0.085, 0.012, 0.085], [Math.PI / 2, 0, 0]); }
  b.glow('torso', 'cyl', 0xff4d5e, [0.3, 0.5, 0.162], [0.05, 0.006, 0.05], [Math.PI / 2, 0, 0]);
  b.glow('torso', 'cyl', 0xff4d5e, [0.3, 0.5, -0.282], [0.05, 0.006, 0.05], [Math.PI / 2, 0, 0]);
  L.torso.cap(0x8892a6, [0.3, 0.64, -0.18], [0.3, 0.64, 0.06], 0.014);
  const tick: TickFn = (rig, t, m, r, a, dt) => {
    humanTick(rig, t * 0.6, m, r, a, dt);
    const beat = 1 + Math.pow(Math.abs(Math.sin(t * 5)), 6) * 0.7;
    rig.glows.forEach((g) => g.scale.set(0.05 * beat, 0.006, 0.05 * beat));
  };
  return b.finish(h, YAW_E, tick);
};

export const CAST: Record<string, Make> = {
  d_lamp: lamp(false), d_twinlamp: lamp(true), d_chalk: chalkTeacher, d_marker: markerMax, d_highlight: msHighlight,
  d_dicto: bookWall(false), d_tomo: bookWall(true), d_shh: librarian, d_monitor: hallMonitor, d_paper: paperPitcher,
  d_arepa: lunchLady, d_coach: coach, d_bell: bell, d_quiz: popQuiz, d_chem: chemist, d_tacks: tackMat,
  d_megaphone: megaphone, d_robot: robot, d_projector: projector, d_thesis: profThesis,
  e_scroller: scroller, e_streamer: streamer, e_gamer: gamer, e_dad: angryDad, e_mom: angryMom, e_nero: nero,
  e_drone: droneRider, e_drifter: drifter, e_boss: boss,
};
