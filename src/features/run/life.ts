/* English Run — life around the track: things that move in every world so the scenery never feels
   frozen. They live in "track space" (z = metres along the run) beside the track and are recycled
   ahead of the runner once they fall behind.
   - City: people walking on the pavements (swinging arms and legs), pigeons, party balloons.
   - Beach: dolphins jumping, sailboats and a surfer riding the swell, kites over the sand, people
     waving on the beach, seagulls.
   - Rooftops: flocks of birds, hot-air balloons drifting at sunset, a helicopter crossing.
   - Neon: flying cars with light trails crossing above the track, drones with blinking lights,
     searchlights sweeping the sky and the odd shooting star.
   Everything uses the curved-world materials so it bends with the horizon like the rest. */
import * as THREE from 'three';
import { Geo, MAT, U, curved, pick, rnd } from './gfx';
import type { ThemeId } from './themes';

type Kind = 'walker' | 'bird' | 'balloon' | 'dolphin' | 'boat' | 'surfer' | 'kite' | 'waver' | 'hot' | 'heli' | 'flyer' | 'drone';
interface Thing {
  kind: Kind;
  obj: THREE.Object3D;
  x: number; y: number; z: number;
  vx: number; vz: number;
  ph: number;
  parts?: THREE.Object3D[];
}

const SKIN = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];
const SHIRT = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xda77f2, 0xffa94d, 0xf8f9fa, 0x20c997, 0x343a40];
const PANTS = [0x2b3a55, 0x495057, 0x8d6e63, 0x1d3557, 0x6c757d];

/** A simple person: torso + head + hair as one mesh, legs and arms that swing. */
function person(swim = false) {
  const g = new THREE.Group();
  const shirt = pick(SHIRT), skin = pick(SKIN), pants = pick(PANTS);
  const body = new Geo();
  body.add(U.box, shirt, 0, 1.12, 0, 0.42, 0.55, 0.24);
  body.add(U.ball, skin, 0, 1.58, 0, 0.17, 0.19, 0.17);
  body.add(U.ball, pick([0x2b1d14, 0x4a3221, 0x8d5524, 0xd8b26e, 0x111111]), 0, 1.66, -0.03, 0.18, 0.15, 0.18);
  if (!swim) body.add(U.box, pants, 0, 0.82, 0, 0.4, 0.12, 0.23);
  g.add(new THREE.Mesh(body.build(), MAT.world));
  const limb = (color: number, len: number, w: number) => { const l = new Geo().add(U.box, color, 0, -len / 2, 0, w, len, w).build(); return new THREE.Mesh(l, MAT.world); };
  const parts: THREE.Object3D[] = [];
  for (const sx of [-0.1, 0.1]) { const p = new THREE.Group(); p.position.set(sx, 0.82, 0); p.add(limb(swim ? skin : pants, 0.78, 0.15)); g.add(p); parts.push(p); }
  for (const sx of [-0.27, 0.27]) { const p = new THREE.Group(); p.position.set(sx, 1.36, 0); p.add(limb(rnd() < 0.5 ? shirt : skin, 0.55, 0.11)); g.add(p); parts.push(p); }
  return { g, parts };
}

function bird(color: number, tip: number, size: number) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new Geo().add(U.ball, color, 0, 0, 0, 0.16, 0.14, 0.45).add(U.ball, 0xffb300, 0, 0.02, 0.44, 0.04, 0.04, 0.1).build(), MAT.world));
  const wing = new Geo().add(U.box, color, 0.5, 0, 0, 1.0, 0.03, 0.3).add(U.box, tip, 1.05, 0, -0.03, 0.18, 0.031, 0.26).build();
  const wl = new THREE.Mesh(wing, MAT.world), wr = new THREE.Mesh(wing, MAT.world);
  wr.scale.x = -1;
  g.add(wl, wr);
  g.scale.setScalar(size);
  return { g, parts: [wl, wr] };
}

export class Life {
  readonly group = new THREE.Group();
  private things: Thing[] = [];
  private own: THREE.Material[] = [];
  private beams: THREE.Mesh[] = [];
  private star: THREE.Mesh | null = null;
  private starT = 3;
  private starAge = 9;

  constructor(theme: ThemeId) {
    const add = (kind: Kind, obj: THREE.Object3D, x: number, y: number, z: number, vx = 0, vz = 0, parts?: THREE.Object3D[]) => {
      this.things.push({ kind, obj, x, y, z, vx, vz, ph: rnd() * 10, parts });
      this.group.add(obj);
    };
    const ahead = () => -20 + rnd() * 240;
    if (theme === 'city') {
      for (let i = 0; i < 22; i++) {
        const { g, parts } = person();
        const side = rnd() < 0.5 ? -1 : 1, dir = rnd() < 0.5 ? 1 : -1;
        add('walker', g, side * (5.4 + rnd() * 1.6), 0.15, ahead(), 0, dir * (0.9 + rnd() * 0.7), parts);
      }
      for (let i = 0; i < 8; i++) { const { g, parts } = bird(0x8a8f99, 0x4a4f5b, 0.7); add('bird', g, (rnd() - 0.5) * 40, 9 + rnd() * 6, ahead(), (rnd() < 0.5 ? -1 : 1) * (3 + rnd() * 2), 0, parts); }
      for (let i = 0; i < 6; i++) {
        const c = pick([0xff4d6d, 0xffd43b, 0x4dabf7, 0x69db7c, 0xda77f2]);
        const g = new THREE.Mesh(new Geo().add(U.ball, c, 0, 0, 0, 0.42, 0.52, 0.42).add(new THREE.ConeGeometry(0.1, 0.16, 6), c, 0, -0.55, 0, 1, 1, 1).add(U.box, 0xeeeeee, 0, -1.3, 0, 0.015, 1.4, 0.015).build(), MAT.world);
        add('balloon', g, (rnd() < 0.5 ? -1 : 1) * (4 + rnd() * 8), 2 + rnd() * 20, ahead(), 0, 0);
      }
    } else if (theme === 'beach') {
      const dolGeo = new Geo().add(U.ball, 0x6f8fa8, 0, 0, 0, 0.42, 0.4, 1.25).add(U.ball, 0xdfe7ee, 0, -0.14, 0.1, 0.34, 0.26, 1.05).add(U.ball, 0x6f8fa8, 0, -0.05, 1.25, 0.13, 0.11, 0.32)
        .add(new THREE.ConeGeometry(0.3, 0.6, 4), 0x5d7d96, 0, 0.48, -0.1, 0.4, 1, 1, -0.5, 0, 0).add(U.box, 0x5d7d96, 0, 0, -1.3, 1.05, 0.06, 0.3).build();
      for (let i = 0; i < 4; i++) add('dolphin', new THREE.Mesh(dolGeo, MAT.world), 16 + rnd() * 26, -2.4, ahead() + 40, 0, 0);
      for (let i = 0; i < 6; i++) {
        const g = new Geo();
        const hull = pick([0xffffff, 0x2e5fa7, 0xe23b3b, 0xffd43b]);
        g.add(U.box, hull, 0, 0.35, 0, 1.6, 0.7, 5).add(new THREE.ConeGeometry(0.8, 1.4, 4), hull, 0, 0.35, 3.1, 1, 1, 0.5, Math.PI / 2, Math.PI / 4, 0);
        g.add(U.cyl, 0xdddddd, 0, 4, 0.3, 0.06, 6.4, 0.06);
        const sail = new THREE.BufferGeometry();
        sail.setAttribute('position', new THREE.Float32BufferAttribute([0, 1.1, 0.4, 0, 7, 0.35, 0, 1.1, -2.2, 0, 1.1, 0.8, 0, 5.8, 0.5, 0, 1.1, 3], 3));
        sail.computeVertexNormals();
        g.add(sail, pick([0xffffff, 0xffe066, 0xff8fb0, 0x9be7ff]), 0, 0, 0, 1, 1, 1);
        add('boat', new THREE.Mesh(g.build(), MAT.world), 45 + rnd() * 70, -2.5, ahead() + 60, 0, (rnd() - 0.5) * 2);
      }
      for (let i = 0; i < 2; i++) {
        const { g, parts } = person(true);
        const board = new THREE.Mesh(new Geo().add(U.ball, pick([0xff6b6b, 0x4dabf7, 0xffd43b]), 0, 0, 0, 0.32, 0.05, 1.1).build(), MAT.world);
        board.position.y = -0.02;
        g.add(board);
        g.rotation.y = Math.PI / 2;
        add('surfer', g, 12 + rnd() * 10, -2.4, ahead() + 30, 0, 0, parts);
      }
      for (let i = 0; i < 4; i++) {
        const c = pick([0xff4d6d, 0xffd43b, 0x4dabf7, 0xb46bff]);
        const g = new THREE.Group();
        const kite = new THREE.BufferGeometry();
        kite.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.9, 0, -0.6, 0, 0, 0, -1.1, 0, 0, 0.9, 0, 0, -1.1, 0, 0.6, 0, 0], 3));
        kite.computeVertexNormals();
        const kg = new Geo().raw(kite, c);
        kg.add(U.box, 0xffffff, 0, -1.6, 0, 0.04, 1.0, 0.02);
        for (let k = 0; k < 4; k++) kg.add(U.box, pick([0xffffff, 0xffd43b, 0xff4d6d]), 0, -1.4 - k * 0.3, 0, 0.18, 0.06, 0.02, 0, 0, 0.6);
        const km = new THREE.Mesh(kg.build(), curved(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide })));
        this.own.push(km.material as THREE.Material);
        g.add(km);
        const line = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 4).translate(0, -0.5, 0), MAT.world);
        g.add(line);
        add('kite', g, -(22 + rnd() * 16), 14 + rnd() * 6, ahead(), 0, 0, [km, line]);
      }
      for (let i = 0; i < 10; i++) { const { g, parts } = person(rnd() < 0.5); g.rotation.y = Math.PI / 2 + (rnd() - 0.5); add('waver', g, -(16 + rnd() * 24), -1.1, ahead(), 0, 0, parts); }
      for (let i = 0; i < 9; i++) { const { g, parts } = bird(0xf6f4ee, 0x3a3f4b, 1.1); add('bird', g, -10 + rnd() * 50, 8 + rnd() * 12, ahead(), (rnd() < 0.5 ? -1 : 1) * (2 + rnd() * 2), 0, parts); }
    } else if (theme === 'roofs') {
      for (let i = 0; i < 14; i++) { const { g, parts } = bird(0x3a3f4b, 0x23262e, 0.8); add('bird', g, (rnd() - 0.5) * 50, 12 + rnd() * 10, ahead(), (rnd() < 0.5 ? -1 : 1) * (4 + rnd() * 2), 0, parts); }
      for (let i = 0; i < 4; i++) {
        const g = new Geo();
        const a = pick([0xff4d6d, 0xffd43b, 0x4dabf7, 0x69db7c]), b = pick([0xffffff, 0xff8a3d, 0x7a5cff]);
        for (let k = 0; k < 8; k++) g.add(new THREE.SphereGeometry(1, 12, 10, (k / 8) * Math.PI * 2, Math.PI / 4), k % 2 ? a : b, 0, 0, 0, 4.2, 5, 4.2);
        g.add(new THREE.CylinderGeometry(1, 0.6, 1, 10), 0x8d6e63, 0, -5.6, 0, 1.6, 1.6, 1.6);
        g.add(U.box, 0x6d4c41, 0, -7, 0, 1.6, 1.2, 1.6);
        add('hot', new THREE.Mesh(g.build(), MAT.world), (rnd() < 0.5 ? -1 : 1) * (40 + rnd() * 70), 30 + rnd() * 25, 60 + rnd() * 200, 0.6 + rnd() * 0.6, 0);
      }
      const hb = new Geo();
      hb.add(U.ball, 0xe23b3b, 0, 0, 0, 1.2, 1, 2).add(U.ball, 0x8fd0ff, 0, 0.25, 1.1, 0.85, 0.7, 0.9).add(U.box, 0xe23b3b, 0, 0.3, -2.8, 0.3, 0.3, 3.2).add(U.box, 0xf4f4f2, 0, 0.8, -4.3, 0.1, 1.1, 0.5);
      const heli = new THREE.Group();
      heli.add(new THREE.Mesh(hb.build(), MAT.world));
      const rotor = new THREE.Mesh(new Geo().add(U.box, 0x2b2f3a, 0, 0, 0, 7.5, 0.05, 0.3).add(U.box, 0x2b2f3a, 0, 0, 0, 0.3, 0.05, 7.5).build(), MAT.world);
      rotor.position.y = 1.25;
      heli.add(rotor);
      add('heli', heli, -120, 34, 140, 9, 0, [rotor]);
    } else {
      for (let i = 0; i < 10; i++) {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new Geo().add(U.box, 0x221a48, 0, 0, 0, 1.8, 0.55, 3.4).add(U.box, 0x3a2f80, 0, 0.42, -0.2, 1.4, 0.38, 1.7).build(), MAT.world));
        const col = new THREE.Color(pick([0xff2bd6, 0x00e5ff, 0x7c4dff, 0xffd400, 0x00ff9c])).multiplyScalar(2.2);
        const trailMat = curved(new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
        const glowMat = curved(new THREE.MeshBasicMaterial({ color: col, toneMapped: false }));
        this.own.push(trailMat, glowMat);
        const trail = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 12).translate(0, -6.5, 0).rotateX(-Math.PI / 2), trailMat);
        trail.position.z = -1.7;
        const strip = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.1), glowMat);
        strip.position.set(0, -0.28, -1.7);
        g.add(trail, strip);
        const dir = rnd() < 0.5 ? -1 : 1;
        g.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        add('flyer', g, -dir * (60 + rnd() * 40), 14 + rnd() * 18, ahead() + 30, dir * (16 + rnd() * 10), 0);
      }
      for (let i = 0; i < 8; i++) {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new Geo().add(U.box, 0x2a2440, 0, 0, 0, 0.7, 0.18, 0.7).add(U.box, 0x2a2440, 0, 0, 0, 1.4, 0.06, 0.12).add(U.box, 0x2a2440, 0, 0, 0, 0.12, 0.06, 1.4).build(), MAT.world));
        const lm = curved(new THREE.MeshBasicMaterial({ color: new THREE.Color(pick([0xff2a5a, 0x00e5ff, 0x39ff9a])).multiplyScalar(2.5), toneMapped: false }));
        this.own.push(lm);
        const light = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), lm);
        light.position.y = -0.15;
        g.add(light);
        add('drone', g, (rnd() < 0.5 ? -1 : 1) * (6 + rnd() * 14), 6 + rnd() * 8, ahead(), 0, 0, [light]);
      }
      // searchlights sweeping the sky from far away (fixed to the view, like the horizon)
      const beamMat = curved(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 0.6, 1.6), transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false }));
      this.own.push(beamMat);
      for (const [x, z] of [[-90, -200], [70, -230], [-30, -260], [120, -180]]) {
        const b = new THREE.Mesh(new THREE.ConeGeometry(5, 160, 16, 1, true).translate(0, 80, 0), beamMat);
        b.position.set(x, -14, z);
        this.beams.push(b);
        this.group.add(b);
      }
      const starMat = curved(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 2.4, 2.2), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
      this.own.push(starMat);
      this.star = new THREE.Mesh(new THREE.BoxGeometry(24, 0.25, 0.25), starMat);
      this.group.add(this.star);
    }
  }

  /** pz: the runner's distance (track space z); positions are drawn relative to it. */
  update(dt: number, t: number, pz: number) {
    for (const th of this.things) {
      th.x += th.vx * dt;
      th.z += th.vz * dt;
      const rel = th.z - pz;
      // recycle what fell behind (or wandered far off to the side) ahead of the runner
      if (rel < -25 || Math.abs(th.x) > 160) {
        th.z = pz + 160 + rnd() * 90;
        if (th.kind === 'bird' || th.kind === 'flyer') th.x = -Math.sign(th.vx || 1) * (th.kind === 'flyer' ? 70 + rnd() * 30 : 25 + rnd() * 15);
        if (th.kind === 'heli') { th.x = -120; th.z = pz + 120 + rnd() * 60; }
        if (th.kind === 'hot') th.x = -Math.sign(th.vx) * (60 + rnd() * 50);
      }
      const o = th.obj, p = th.parts;
      let y = th.y;
      switch (th.kind) {
        case 'walker': {
          const sw = Math.sin(t * 7 * Math.abs(th.vz) + th.ph) * 0.55;
          if (p) { p[0].rotation.x = sw; p[1].rotation.x = -sw; p[2].rotation.x = -sw * 0.8; p[3].rotation.x = sw * 0.8; }
          y += Math.abs(Math.sin(t * 7 * Math.abs(th.vz) + th.ph)) * 0.05;
          o.rotation.y = th.vz > 0 ? Math.PI : 0;
          break;
        }
        case 'bird': {
          const f = Math.sin(t * 9 + th.ph) * 0.6;
          if (p) { p[0].rotation.z = f; p[1].rotation.z = -f; }
          y += Math.sin(t * 0.8 + th.ph) * 1.2;
          o.rotation.set(0, th.vx > 0 ? Math.PI / 2 : -Math.PI / 2, 0);
          break;
        }
        case 'balloon': th.y += dt * 1.1; if (th.y > 40) th.y = 1; y = th.y; o.rotation.z = Math.sin(t * 1.3 + th.ph) * 0.12; break;
        case 'dolphin': {
          const cyc = (t * 0.55 + th.ph) % 4, jump = cyc < 1;
          o.visible = jump;
          if (jump) { y = -2.9 + Math.sin(cyc * Math.PI) * 3.1; o.rotation.set(Math.cos(cyc * Math.PI) * 1.05, Math.PI, 0); th.z += dt * 5; }
          break;
        }
        case 'boat': y += Math.sin(t * 1.1 + th.ph) * 0.2; o.rotation.set(Math.sin(t * 0.7 + th.ph) * 0.04, th.ph, Math.sin(t * 0.9 + th.ph) * 0.07); break;
        case 'surfer': {
          y += Math.sin(t * 1.4 + th.ph) * 0.3 + 0.2;
          th.x = 12 + Math.sin(t * 0.35 + th.ph) * 8;
          o.rotation.set(Math.sin(t * 1.4 + th.ph + 1) * 0.12, Math.PI / 2 + Math.cos(t * 0.35 + th.ph) * 0.5, Math.sin(t * 1.1 + th.ph) * 0.15);
          if (p) { p[2].rotation.z = -1.2; p[3].rotation.z = 1.2; p[0].rotation.x = 0.3; p[1].rotation.x = -0.2; }
          break;
        }
        case 'kite': {
          const sx = Math.sin(t * 0.9 + th.ph) * 2.2, sy = Math.sin(t * 1.3 + th.ph * 2) * 1.2;
          if (p) {
            p[0].position.set(sx, sy, 0); p[0].rotation.set(0.3, Math.PI / 2, Math.sin(t * 1.7 + th.ph) * 0.35);
            // the string from the kite down to the sand
            const len = Math.hypot(sx - 6, y + sy + 1);
            p[1].position.set(sx, sy, 0);
            p[1].scale.y = len;
            p[1].rotation.z = Math.atan2(6 - sx, y + sy + 1);
          }
          break;
        }
        case 'waver': {
          const w = Math.sin(t * 6 + th.ph);
          if (p) { p[3].rotation.z = 2.4 + w * 0.4; p[2].rotation.z = Math.sin(t * 2 + th.ph) > 0.6 ? -2.4 + w * 0.4 : -0.15; }
          y += Math.max(0, Math.sin(t * 3 + th.ph)) * 0.06;
          break;
        }
        case 'hot': y += Math.sin(t * 0.3 + th.ph) * 2; break;
        case 'heli': if (p) p[0].rotation.y = t * 24; o.rotation.set(0.08, Math.PI / 2, 0.06); break;
        case 'flyer': y += Math.sin(t * 0.8 + th.ph) * 1.2; break;
        case 'drone': {
          y += Math.sin(t * 1.6 + th.ph) * 0.5;
          th.x += Math.sin(t * 0.5 + th.ph) * dt * 1.5;
          if (p) p[0].visible = Math.sin(t * 6 + th.ph) > -0.2;
          o.rotation.y = t * 0.6 + th.ph;
          break;
        }
      }
      o.position.set(th.x, y, -rel);
    }
    this.beams.forEach((b, i) => { b.rotation.set(Math.sin(t * 0.35 + i * 1.7) * 0.55, 0, Math.cos(t * 0.27 + i) * 0.5); });
    if (this.star) {
      this.starT -= dt; this.starAge += dt;
      const m = this.star.material as THREE.MeshBasicMaterial;
      if (this.starT < 0) { this.starT = 5 + rnd() * 6; this.starAge = 0; this.star.position.set(-150 + rnd() * 200, 75 + rnd() * 40, -240); this.star.rotation.z = -0.3 - rnd() * 0.25; }
      m.opacity = this.starAge < 0.8 ? Math.sin((this.starAge / 0.8) * Math.PI) : 0;
      this.star.position.x += dt * 150;
      this.star.position.y -= dt * 55;
    }
  }

  dispose() {
    this.group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); });
    this.own.forEach((m) => m.dispose());
    this.group.removeFromParent();
  }
}
