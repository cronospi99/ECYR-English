/* English Racers — meshes that follow the track: asphalt (textured), kerbs, grass aprons,
   embankments down to the ground, barriers, ramps, the sides of the gaps, the start line and the
   animated boost pads. Everything is built from the same frames the physics uses. */
import * as THREE from 'three';
import { KERB, type Frame, type Track } from './track';

export const BASE_Y = -0.06;

/** Non-indexed triangles with a colour per vertex (hard colour edges: kerbs, stripes). */
class Tris {
  pos: number[] = [];
  col: number[] = [];
  private c = new THREE.Color();
  quad(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, color: number) {
    this.c.setHex(color);
    for (const v of [a, b, c, a, c, d]) { this.pos.push(v.x, v.y, v.z); this.col.push(this.c.r, this.c.g, this.c.b); }
  }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeVertexNormals();
    return g;
  }
}

const v = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
/** A point beside frame f at lateral d, on the (banked) road plane, flat beyond the kerb. */
export function side(f: Frame, d: number, dy = 0, out = v()) {
  const dc = Math.max(-f.w - KERB, Math.min(f.w + KERB, d));
  return out.set(f.p.x + f.r.x * d, f.p.y + dc * f.bank + dy, f.p.z + f.r.z * d);
}

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Asphalt: fine grain, a few patches, white edge lines and a dashed centre line (u across, v along). */
export function asphaltTexture() {
  return canvasTex(512, 1024, (c) => {
    c.fillStyle = '#4a4f58'; c.fillRect(0, 0, 512, 1024);
    let r = 7;
    const rand = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
    for (let i = 0; i < 9000; i++) { const g = 60 + rand() * 50; c.fillStyle = `rgba(${g},${g + 3},${g + 10},${0.25 + rand() * 0.4})`; c.fillRect(rand() * 512, rand() * 1024, 1 + rand() * 2.5, 1 + rand() * 2.5); }
    for (let i = 0; i < 7; i++) { c.fillStyle = `rgba(30,32,38,${0.08 + rand() * 0.1})`; c.beginPath(); c.ellipse(rand() * 512, rand() * 1024, 30 + rand() * 80, 40 + rand() * 120, rand() * 3, 0, 7); c.fill(); }
    // tyre lines (racing line darker)
    const g = c.createLinearGradient(0, 0, 512, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.3, 'rgba(20,22,28,.18)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(0.7, 'rgba(20,22,28,.18)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, 512, 1024);
    c.fillStyle = '#f2f2ee';
    c.fillRect(12, 0, 7, 1024); c.fillRect(493, 0, 7, 1024);
    c.fillRect(252, 0, 7, 380); c.fillRect(252, 512, 7, 380);
  });
}

/** Ramp deck: steel planks, yellow chevrons pointing forward, black/yellow hazard edges (u across, v along). */
function rampTexture() {
  return canvasTex(256, 256, (c) => {
    for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#46536b' : '#3f4b62'; c.fillRect(0, i * 32, 256, 32); c.fillStyle = 'rgba(10,14,24,.45)'; c.fillRect(0, i * 32, 256, 2); }
    c.fillStyle = '#ffd23f'; c.strokeStyle = '#10204a'; c.lineWidth = 4; c.lineJoin = 'round';
    // a chevron pointing up the texture (= forward along the track)
    c.beginPath(); c.moveTo(36, 168); c.lineTo(128, 66); c.lineTo(220, 168); c.lineTo(220, 238); c.lineTo(128, 136); c.lineTo(36, 238); c.closePath();
    c.fill(); c.stroke();
    c.save(); c.beginPath(); c.rect(0, 0, 18, 256); c.rect(238, 0, 18, 256); c.clip();
    c.fillStyle = '#ffc61a'; c.fillRect(0, 0, 256, 256); c.fillStyle = '#1b1d24';
    for (let y = -40; y < 300; y += 36) { c.beginPath(); c.moveTo(0, y); c.lineTo(256, y + 64); c.lineTo(256, y + 82); c.lineTo(0, y + 18); c.closePath(); c.fill(); }
    c.restore();
  });
}

function checkerTexture() {
  return canvasTex(256, 32, (c) => {
    for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) { c.fillStyle = (x + y) % 2 ? '#15161a' : '#e9e9e6'; c.fillRect(x * 16, y * 16, 16, 16); }
  });
}

export interface TrackMeshes { group: THREE.Group; pads: THREE.ShaderMaterial }

export function buildTrackMeshes(track: Track, world: THREE.Material): TrackMeshes {
  const group = new THREE.Group();
  const F = track.frames, N = F.length;
  const inGap = (i: number) => track.gapAt(F[i].s + track.ds * 0.5);

  // asphalt (indexed, smooth)
  {
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    const a = v(), b = v();
    for (let i = 0; i <= N; i++) {
      const f = F[i % N];
      side(f, -f.w, 0, a); side(f, f.w, 0, b);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      const vv = (i * track.ds) / 9;
      uv.push(0, vv, 1, vv);
    }
    for (let i = 0; i < N; i++) if (!inGap(i)) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const tex = asphaltTexture();
    tex.anisotropy = 8;
    const road = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0 }));
    road.receiveShadow = true;
    group.add(road);
  }

  // kerbs, grass, embankments, barriers
  const t = new Tris();
  const p0 = v(), p1 = v(), p2 = v(), p3 = v();
  for (let i = 0; i < N; i++) {
    if (inGap(i)) continue;
    const a = F[i], b = F[(i + 1) % N];
    const stripe = Math.floor(a.s / 2) % 2 === 0;
    for (const sg of [-1, 1]) {
      // kerb (raised a little, red/white)
      t.quad(side(a, sg * a.w, 0.02, p0), side(b, sg * b.w, 0.02, p1), side(b, sg * (b.w + KERB), 0.06, p2), side(a, sg * (a.w + KERB), 0.06, p3), stripe ? 0xe53935 : 0xf4f4f2);
      // grass apron, mowed in stripes
      const ga = a.w + KERB + a.apron, gb = b.w + KERB + b.apron;
      const mow = Math.floor(a.s / 6) % 2 === 0 ? 0x62b04a : 0x54a03f;
      t.quad(side(a, sg * (a.w + KERB), 0.06, p0), side(b, sg * (b.w + KERB), 0.06, p1), side(b, sg * gb, 0.04, p2), side(a, sg * ga, 0.04, p3), mow);
      // barrier on the outer edge
      if (a.wall) {
        const wa = ga + 0.25, wb = gb + 0.25, H = 0.9, T = 0.4;
        const panel = Math.floor(a.s / 4) % 2 === 0 ? 0xe23b3b : 0xf5f6f8;
        t.quad(side(a, sg * wa, 0, p0), side(b, sg * wb, 0, p1), side(b, sg * wb, H, p2), side(a, sg * wa, H, p3), panel);
        t.quad(side(a, sg * wa, H, p0), side(b, sg * wb, H, p1), side(b, sg * (wb + T), H, p2), side(a, sg * (wa + T), H, p3), 0xd7dbe2);
        side(a, sg * (wa + T), H, p0); side(b, sg * (wb + T), H, p1);
        p2.set(p1.x, BASE_Y, p1.z); p3.set(p0.x, BASE_Y, p0.z);
        t.quad(p0, p1, p2, p3, 0xa9b0bb);
        // inner face below the grass on raised parts
        side(a, sg * wa, 0, p0); side(b, sg * wb, 0, p1);
        if (p0.y > 0.2) { p2.set(p1.x, BASE_Y, p1.z); p3.set(p0.x, BASE_Y, p0.z); t.quad(p0, p1, p2, p3, 0x8f8a7c); }
      } else {
        // open edge: an embankment down to the ground
        side(a, sg * ga, 0.04, p0); side(b, sg * gb, 0.04, p1);
        const ha = p0.y - BASE_Y, hb = p1.y - BASE_Y;
        if (ha > 0.1 || hb > 0.1) {
          side(b, sg * (gb + Math.max(0.6, hb * 1.4)), 0, p2); p2.y = BASE_Y;
          side(a, sg * (ga + Math.max(0.6, ha * 1.4)), 0, p3); p3.y = BASE_Y;
          t.quad(p0, p1, p2, p3, 0x4b8a35);
        }
      }
    }
  }
  // the faces of each gap (concrete) and under ramps
  for (const gp of track.gaps) {
    for (const [s, dir] of [[gp.s0, 1], [gp.s1, -1]] as const) {
      const f = F[Math.round(s / track.ds) % N];
      const lim = f.w + KERB + f.apron + 0.6;
      side(f, -lim * dir, 0.04, p0); side(f, lim * dir, 0.04, p1);
      p2.set(p1.x, track.waterY - 3, p1.z); p3.set(p0.x, track.waterY - 3, p0.z);
      t.quad(p0, p1, p2, p3, 0xb9b2a3);
    }
  }
  const edges = new THREE.Mesh(t.geo(), world);
  edges.receiveShadow = true; edges.castShadow = true;
  group.add(edges);

  // ramps: wooden deck with hazard stripes
  const r = new Tris();
  for (const rp of track.ramps) {
    const i0 = Math.round(rp.s0 / track.ds), i1 = Math.round(rp.s1 / track.ds);
    const hAt = (k: number) => rp.h * Math.pow(Math.min(1, Math.max(0, (k - i0) / (i1 - i0))), 1.35);
    // deck: one textured strip (smooth chevrons and hazard edges, mipmapped)
    {
      const pos: number[] = [], uv: number[] = [], idx: number[] = [];
      for (let k = i0; k <= i1; k++) {
        const f = track.frame(k), hh = hAt(k) + 0.012, W = f.w + KERB;
        side(f, -W, hh, p0); side(f, W, hh, p1);
        pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
        const vv = ((k - i0) * track.ds) / 4.2;
        uv.push(0, vv, 1, vv);
        if (k < i1) { const j = (k - i0) * 2; idx.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      const tex = rampTexture();
      tex.anisotropy = 8;
      const deck = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.25 }));
      deck.receiveShadow = true;
      group.add(deck);
    }
    for (let k = i0; k < i1; k++) {
      const a = track.frame(k), b = track.frame(k + 1), ha = hAt(k), hb = hAt(k + 1);
      const W = (f: Frame) => f.w + KERB;
      for (const sg of [-1, 1]) {
        r.quad(side(a, sg * W(a), 0, p0), side(b, sg * W(b), 0, p1), side(b, sg * W(b), hb + 0.01, p2), side(a, sg * W(a), ha + 0.01, p3), 0x3a3f4b);
        // guard rail on the ramp edges
        r.quad(side(a, sg * W(a), ha + 0.01, p0), side(b, sg * W(b), hb + 0.01, p1), side(b, sg * W(b), hb + 0.55, p2), side(a, sg * W(a), ha + 0.55, p3), k % 2 ? 0xe23b3b : 0xf5f6f8);
      }
    }
    const e = track.frame(i1), W = e.w + KERB;
    const overGap = track.gapAt(e.s + 0.5);
    for (let j = 0; j < 8; j++) {
      const d0 = -W + (2 * W * j) / 8, d1 = -W + (2 * W * (j + 1)) / 8;
      side(e, d0, rp.h + 0.01, p0); side(e, d1, rp.h + 0.01, p1); side(e, d1, 0, p2); side(e, d0, 0, p3);
      if (overGap) p2.y = p3.y = track.waterY - 3;
      r.quad(p1, p0, p3, p2, j % 2 ? 0x22252d : 0xffc61a);
    }
  }
  if (r.pos.length) {
    const ramps = new THREE.Mesh(r.geo(), world);
    ramps.castShadow = true; ramps.receiveShadow = true;
    group.add(ramps);
  }

  // start line (checkered)
  {
    const f = F[0];
    const g = new THREE.BufferGeometry();
    const q = [side(track.frame(-1), -f.w, 0.015), side(track.frame(-1), f.w, 0.015), side(track.frame(1), f.w, 0.015), side(track.frame(1), -f.w, 0.015)];
    g.setAttribute('position', new THREE.Float32BufferAttribute(q.flatMap((p) => [p.x, p.y, p.z]), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: checkerTexture(), roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.receiveShadow = true;
    group.add(m);
  }

  // boost pads: chevrons that run forward
  const pads = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime; varying vec2 vUv;
      void main(){
        float a = fract(vUv.y * 0.55 - uTime * 2.4 - abs(vUv.x - 0.5) * 0.9);
        float chev = smoothstep(0.0, 0.08, a) * (1.0 - smoothstep(0.42, 0.5, a));
        float edge = step(0.08, vUv.x) * step(vUv.x, 0.92);
        vec3 base = mix(vec3(0.9, 0.25, 0.02), vec3(1.0, 0.55, 0.05), vUv.x);
        vec3 col = mix(base * 0.55, vec3(1.6, 1.25, 0.35), chev * edge);
        gl_FragColor = vec4(col, 1.0);
      }`,
    polygonOffset: true, polygonOffsetFactor: -2, toneMapped: false,
  });
  for (const pd of track.pads) {
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    const n = Math.max(2, Math.round((pd.s1 - pd.s0) / track.ds));
    for (let k = 0; k <= n; k++) {
      const s = pd.s0 + (k / n) * (pd.s1 - pd.s0), f = track.frame(Math.floor(s / track.ds));
      const a = side(f, pd.d - pd.hw, 0.025), b = side(f, pd.d + pd.hw, 0.025);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      uv.push(0, s - pd.s0, 1, s - pd.s0);
      if (k < n) { const j = k * 2; idx.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    group.add(new THREE.Mesh(g, pads));
  }
  return { group, pads };
}
