/* English Racers — meshes that follow the track: asphalt (textured), kerbs, grass aprons,
   embankments down to the ground, barriers, ramps, the sides of the gaps, the start line and the
   animated boost pads. Everything is built from the same frames the physics uses. */
import * as THREE from 'three';
import { KERB, LOOP_HW, type Frame, type Track } from './track';
import { makeOcean } from '@/features/run/ocean';

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

/** Tileable value noise (several octaves) on an N×N grid, values 0..1. */
function noiseField(N: number, octaves: [number, number][], seed: number) {
  const out = new Float32Array(N * N);
  let r = seed;
  const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  for (const [cells, amp] of octaves) {
    const L = new Float32Array(cells * cells).map(() => rnd());
    const at = (x: number, y: number) => L[((y % cells) + cells) % cells * cells + (((x % cells) + cells) % cells)];
    for (let y = 0; y < N; y++) {
      const fy = (y / N) * cells, iy = Math.floor(fy), ty = fy - iy, sy = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < N; x++) {
        const fx = (x / N) * cells, ix = Math.floor(fx), tx = fx - ix, sx = tx * tx * (3 - 2 * tx);
        const a = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * sx, b = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * sx;
        out[y * N + x] += (a + (b - a) * sy) * amp;
      }
    }
  }
  return out;
}

/** Asphalt (u across the road, v along 12 m): soft aggregate in several octaves (no single-pixel
    speckle, so it does not shimmer far away), rubbered racing lines, repair patches, a few fine
    cracks, worn white edge lines and a dashed centre line; plus a matching normal map. */
let asphaltCache: (THREE.CanvasTexture & { normal: THREE.CanvasTexture }) | null = null;
export function asphaltTexture() {
  // built once (a disposed texture uploads again when a new track uses it)
  if (asphaltCache) return asphaltCache;
  const N = 1024;
  const n = noiseField(N, [[8, 0.35], [32, 0.3], [128, 0.22], [256, 0.13]], 7);
  const fine = noiseField(N, [[192, 0.6], [384, 0.4]], 19);
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const c = cv.getContext('2d')!;
  const img = c.createImageData(N, N), d = img.data;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, u = x / N;
    const rubber = Math.exp(-(((u - 0.3) / 0.07) ** 2)) + Math.exp(-(((u - 0.7) / 0.07) ** 2));
    const g = 74 + (n[i] - 0.5) * 22 + (fine[i] - 0.5) * 8 - rubber * 7;
    d[i * 4] = g - 2; d[i * 4 + 1] = g + 1; d[i * 4 + 2] = g + 7; d[i * 4 + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  let r = 3;
  const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  // repair patches and fine cracks (soft, low contrast)
  for (let k = 0; k < 5; k++) { c.fillStyle = `rgba(40,42,48,${0.07 + rnd() * 0.06})`; const w = 80 + rnd() * 160, h = 90 + rnd() * 220; c.fillRect(rnd() * (N - w), rnd() * (N - h), w, h); }
  c.strokeStyle = 'rgba(30,32,36,.35)'; c.lineWidth = 1.6; c.lineCap = 'round';
  for (let k = 0; k < 6; k++) { let x = rnd() * N, y = rnd() * N; c.beginPath(); c.moveTo(x, y); for (let j = 0; j < 7; j++) { x += (rnd() - 0.5) * 50; y += 12 + rnd() * 26; c.lineTo(x, y); } c.stroke(); }
  // painted lines: soft edges and a little wear
  const paint = (x0: number, w: number, y0: number, y1: number) => {
    const gr = c.createLinearGradient(x0, 0, x0 + w, 0);
    gr.addColorStop(0, 'rgba(240,240,236,0)'); gr.addColorStop(0.18, 'rgba(240,240,236,.92)'); gr.addColorStop(0.82, 'rgba(240,240,236,.92)'); gr.addColorStop(1, 'rgba(240,240,236,0)');
    c.fillStyle = gr; c.fillRect(x0, y0, w, y1 - y0);
  };
  paint(22, 14, 0, N); paint(N - 36, 14, 0, N);
  paint(N / 2 - 7, 14, 0, 256); paint(N / 2 - 7, 14, 512, 768);
  const wear = c.getImageData(0, 0, N, N), wd = wear.data;
  for (let i = 0; i < N * N; i++) if (wd[i * 4] > 150) { const k = 0.82 + fine[i] * 0.18; wd[i * 4] *= k; wd[i * 4 + 1] *= k; wd[i * 4 + 2] *= k; }
  c.putImageData(wear, 0, 0);
  const map = new THREE.CanvasTexture(cv);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  // normal map from the fine grain
  const nc = document.createElement('canvas');
  nc.width = nc.height = 512;
  const nx = nc.getContext('2d')!, ni = nx.createImageData(512, 512), nd = ni.data;
  const H = (x: number, y: number) => fine[(((y * 2) % N + N) % N) * N + (((x * 2) % N + N) % N)] * 0.7 + n[(((y * 2) % N + N) % N) * N + (((x * 2) % N + N) % N)] * 0.3;
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * 3, dy = (H(x, y + 1) - H(x, y - 1)) * 3, l = Math.hypot(dx, dy, 1), o = (y * 512 + x) * 4;
    nd[o] = (-dx / l * 0.5 + 0.5) * 255; nd[o + 1] = (-dy / l * 0.5 + 0.5) * 255; nd[o + 2] = (1 / l * 0.5 + 0.5) * 255; nd[o + 3] = 255;
  }
  nx.putImageData(ni, 0, 0);
  const normal = new THREE.CanvasTexture(nc);
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  asphaltCache = Object.assign(map, { normal });
  return asphaltCache;
}

/** Kerb stripes (u across, v along: one stripe of each colour per tile), bevelled. */
function kerbTexture(c0: number, c1: number) {
  return canvasTex(64, 256, (c) => {
    const col = (h: number) => '#' + h.toString(16).padStart(6, '0');
    c.fillStyle = col(c0); c.fillRect(0, 0, 64, 128);
    c.fillStyle = col(c1); c.fillRect(0, 128, 64, 128);
    const g = c.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, 'rgba(0,0,0,.25)'); g.addColorStop(0.35, 'rgba(255,255,255,.12)'); g.addColorStop(0.7, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.18)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 256);
    c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(0, 126, 64, 4); c.fillRect(0, 0, 64, 2);
  });
}
/** Barrier panels (u along: two panels per tile; v up the panel) with seams and bolts. */
function barrierTexture() {
  return canvasTex(256, 64, (c) => {
    c.fillStyle = '#e23b3b'; c.fillRect(0, 0, 128, 64);
    c.fillStyle = '#f2f3f5'; c.fillRect(128, 0, 128, 64);
    const g = c.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.2)');
    c.fillStyle = g; c.fillRect(0, 0, 256, 64);
    c.fillStyle = 'rgba(20,22,28,.45)'; c.fillRect(0, 0, 3, 64); c.fillRect(126, 0, 3, 64);
    c.fillStyle = 'rgba(40,44,52,.5)'; for (const x of [12, 116, 140, 244]) for (const y of [14, 50]) { c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill(); }
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

/** Boardwalk: warm planks across the road, nail rows, a few darker boards, white edge paint. */
function planksTexture() {
  return canvasTex(512, 1024, (c) => {
    let r = 3;
    const rand = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
    for (let y = 0; y < 1024; y += 32) {
      const k = rand();
      c.fillStyle = `hsl(${30 + k * 8}, ${42 + k * 12}%, ${54 - k * 12}%)`;
      c.fillRect(0, y, 512, 32);
      for (let i = 0; i < 26; i++) { c.fillStyle = `rgba(90,52,20,${0.06 + rand() * 0.1})`; c.fillRect(rand() * 512, y + rand() * 30, 30 + rand() * 120, 1 + rand() * 1.5); }
      c.fillStyle = 'rgba(40,22,8,.55)'; c.fillRect(0, y, 512, 3);
      c.fillStyle = 'rgba(255,240,210,.18)'; c.fillRect(0, y + 3, 512, 2);
      for (const x of [40, 256, 472]) { c.fillStyle = 'rgba(40,30,25,.55)'; c.beginPath(); c.arc(x, y + 16, 3, 0, 7); c.fill(); }
    }
    c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(10, 0, 9, 1024); c.fillRect(493, 0, 9, 1024);
  });
}

/** Rooftop road: dark tarmac with yellow edge lines and painted arrows. */
function roofTexture() {
  return canvasTex(512, 1024, (c) => {
    c.fillStyle = '#383c45'; c.fillRect(0, 0, 512, 1024);
    let r = 9;
    const rand = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
    for (let i = 0; i < 9000; i++) { const g = 45 + rand() * 40; c.fillStyle = `rgba(${g},${g + 2},${g + 8},${0.3 + rand() * 0.4})`; c.fillRect(rand() * 512, rand() * 1024, 1 + rand() * 2, 1 + rand() * 2); }
    for (let i = 0; i < 5; i++) { c.strokeStyle = 'rgba(20,20,24,.35)'; c.lineWidth = 2; c.beginPath(); let x = rand() * 512, y = rand() * 1024; c.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rand() - 0.5) * 60; y += 30 + rand() * 40; c.lineTo(x, y); } c.stroke(); }
    c.fillStyle = '#ffc61a'; c.fillRect(14, 0, 9, 1024); c.fillRect(489, 0, 9, 1024);
    c.fillStyle = 'rgba(255,255,255,.75)';
    for (let y = 120; y < 1024; y += 512) { c.beginPath(); c.moveTo(256, y); c.lineTo(296, y + 60); c.lineTo(272, y + 60); c.lineTo(272, y + 130); c.lineTo(240, y + 130); c.lineTo(240, y + 60); c.lineTo(216, y + 60); c.closePath(); c.fill(); }
  });
}

/** Neon road: near-black glassy deck with a fine grid; its emissive twin lights the edge lines. */
function neonTextures() {
  const draw = (glowOnly: boolean) => (c: CanvasRenderingContext2D) => {
    c.fillStyle = glowOnly ? '#000000' : '#120c26'; c.fillRect(0, 0, 512, 1024);
    if (!glowOnly) {
      c.strokeStyle = 'rgba(120,90,255,.16)'; c.lineWidth = 2;
      for (let x = 0; x <= 512; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 1024); c.stroke(); }
      for (let y = 0; y <= 1024; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(512, y); c.stroke(); }
    }
    const g1 = c.createLinearGradient(0, 0, 40, 0); g1.addColorStop(0, '#00e5ff'); g1.addColorStop(1, 'rgba(0,229,255,0)');
    c.fillStyle = g1; c.fillRect(8, 0, 34, 1024);
    const g2 = c.createLinearGradient(512, 0, 472, 0); g2.addColorStop(0, '#ff2bd6'); g2.addColorStop(1, 'rgba(255,43,214,0)');
    c.fillStyle = g2; c.fillRect(470, 0, 34, 1024);
    c.fillStyle = glowOnly ? '#7a5cff' : '#5a46c8';
    for (let y = 0; y < 1024; y += 256) c.fillRect(250, y, 12, 130);
  };
  return { map: canvasTex(512, 1024, draw(false)), glow: canvasTex(512, 1024, draw(true)) };
}

/** Sheer sides (u along the road, v down): building windows, pier timbers or neon panels. */
function sideTexture(kind: 'windows' | 'pier' | 'neon') {
  return canvasTex(256, 256, (c) => {
    if (kind === 'windows') {
      c.fillStyle = '#d9d2c4'; c.fillRect(0, 0, 256, 256);
      for (let x = 0; x < 4; x++) for (let y = 0; y < 2; y++) {
        const lit = (x * 7 + y * 3) % 5 === 0;
        c.fillStyle = lit ? '#ffe9a8' : '#6f8fb5'; c.fillRect(12 + x * 62, 20 + y * 128, 44, 82);
        c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(12 + x * 62, 20 + y * 128, 44, 10);
        c.fillStyle = '#b8b0a2'; c.fillRect(8 + x * 62, 104 + y * 128, 52, 8);
      }
    } else if (kind === 'pier') {
      c.fillStyle = '#6b4a2e'; c.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 256; y += 32) { c.fillStyle = y % 64 ? '#7b5636' : '#71502f'; c.fillRect(0, y, 256, 30); }
      c.fillStyle = '#4a321e'; for (const x of [0, 128]) c.fillRect(x, 0, 26, 256);
      c.strokeStyle = '#3a2716'; c.lineWidth = 8; c.beginPath(); c.moveTo(26, 0); c.lineTo(128, 256); c.moveTo(154, 0); c.lineTo(256, 256); c.stroke();
    } else {
      c.fillStyle = '#100a22'; c.fillRect(0, 0, 256, 256);
      c.strokeStyle = '#2a1d5c'; c.lineWidth = 4; for (let x = 0; x <= 256; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 256); c.stroke(); }
      c.fillStyle = '#ff2bd6'; c.fillRect(0, 18, 256, 6);
      c.fillStyle = '#00e5ff'; c.fillRect(0, 140, 256, 3);
    }
  });
}

/** How a track looks: road surface, kerbs, aprons, barriers and what is under open edges. */
export interface TrackStyle {
  road: 'asphalt' | 'planks' | 'roof' | 'neon';
  kerb: [number, number];
  apron: [number, number];
  wall: 'barrier' | 'rail' | 'parapet' | 'neon';
  /** Open edges: an embankment down to the ground, or a sheer textured side down to baseY. */
  edge: 'bank' | 'sheer';
  side?: 'windows' | 'pier' | 'neon';
  bank?: number;
  gapFace: number;
  baseY: number;
}
export const CAMPUS_STYLE: TrackStyle = { road: 'asphalt', kerb: [0xe53935, 0xf4f4f2], apron: [0x62b04a, 0x54a03f], wall: 'barrier', edge: 'bank', bank: 0x4b8a35, gapFace: 0xb9b2a3, baseY: BASE_Y };

function checkerTexture() {
  return canvasTex(256, 32, (c) => {
    for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) { c.fillStyle = (x + y) % 2 ? '#15161a' : '#e9e9e6'; c.fillRect(x * 16, y * 16, 16, 16); }
  });
}

export interface TrackMeshes { group: THREE.Group; pads: THREE.ShaderMaterial; oceans: { uTime: { value: number } }[] }

export function buildTrackMeshes(track: Track, world: THREE.Material, st: TrackStyle = CAMPUS_STYLE): TrackMeshes {
  const group = new THREE.Group();
  const F = track.frames, N = F.length;
  const inGap = (i: number) => track.gapAt(F[i].s + track.ds * 0.5);
  const glowT = new Tris();

  // asphalt (indexed, smooth)
  {
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    const a = v(), b = v();
    for (let i = 0; i <= N; i++) {
      const f = F[i % N];
      side(f, -f.w, 0, a); side(f, f.w, 0, b);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      const vv = (i * track.ds) / (st.road === 'asphalt' ? 12 : 9);
      uv.push(0, vv, 1, vv);
    }
    for (let i = 0; i < N; i++) if (!inGap(i)) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    let mat: THREE.MeshStandardMaterial;
    if (st.road === 'neon') {
      const nt = neonTextures();
      nt.map.anisotropy = 8; nt.glow.anisotropy = 8;
      mat = new THREE.MeshStandardMaterial({ map: nt.map, emissiveMap: nt.glow, emissive: 0xffffff, emissiveIntensity: 1.0, roughness: 0.18, metalness: 0.4 });
    } else {
      if (st.road === 'asphalt') {
        const tex = asphaltTexture();
        tex.anisotropy = tex.normal.anisotropy = 16;
        mat = new THREE.MeshStandardMaterial({ map: tex, normalMap: tex.normal, normalScale: new THREE.Vector2(0.28, 0.28), roughness: 0.86, metalness: 0 });
      } else {
        const tex = st.road === 'planks' ? planksTexture() : roofTexture();
        tex.anisotropy = 16;
        mat = new THREE.MeshStandardMaterial({ map: tex, roughness: st.road === 'planks' ? 0.78 : 0.9, metalness: 0 });
      }
    }
    const road = new THREE.Mesh(g, mat);
    road.receiveShadow = true;
    group.add(road);
  }

  // kerbs, aprons, barriers, embankments or sheer sides
  const t = new Tris();
  const p0 = v(), p1 = v(), p2 = v(), p3 = v();
  const sideStrip: { pos: number[]; uv: number[] } = { pos: [], uv: [] };
  const box = (cx: THREE.Vector3, yaw: number, sx: number, sy: number, sz: number, color: number, tris = t) => {
    const c = Math.cos(yaw), sn = Math.sin(yaw);
    const P = (x: number, y: number, z: number) => v(cx.x + x * c + z * sn, cx.y + y, cx.z - x * sn + z * c);
    const hx = sx / 2, hz = sz / 2;
    const a = [P(-hx, 0, -hz), P(hx, 0, -hz), P(hx, 0, hz), P(-hx, 0, hz)], b = [P(-hx, sy, -hz), P(hx, sy, -hz), P(hx, sy, hz), P(-hx, sy, hz)];
    for (let k = 0; k < 4; k++) tris.quad(a[k], a[(k + 1) % 4], b[(k + 1) % 4], b[k], color);
    tris.quad(b[0], b[1], b[2], b[3], color);
  };
  const kerbS: { pos: number[]; uv: number[] } = { pos: [], uv: [] }, barS: { pos: number[]; uv: number[] } = { pos: [], uv: [] };
  /** A textured quad (a b c d, uv per corner) facing the same way as Tris.quad. */
  const tq = (S: { pos: number[]; uv: number[] }, q: THREE.Vector3[], u: number[][]) => { for (const k of [0, 1, 2, 0, 2, 3]) { S.pos.push(q[k].x, q[k].y, q[k].z); S.uv.push(u[k][0], u[k][1]); } };
  for (let i = 0; i < N; i++) {
    if (inGap(i)) continue;
    const a = F[i], b = F[(i + 1) % N];
    for (const sg of [-1, 1]) {
      {
        const q = [side(a, sg * a.w, 0.02), side(b, sg * b.w, 0.02), side(b, sg * (b.w + KERB), 0.06), side(a, sg * (a.w + KERB), 0.06)];
        const v0 = a.s / 4, v1 = (a.s + track.ds) / 4;
        tq(kerbS, sg > 0 ? q : [q[1], q[0], q[3], q[2]], sg > 0 ? [[0, v0], [0, v1], [1, v1], [1, v0]] : [[0, v1], [0, v0], [1, v0], [1, v1]]);
      }
      const ga = a.w + KERB + a.apron, gb = b.w + KERB + b.apron;
      const mow = Math.floor(a.s / 6) % 2 === 0 ? st.apron[0] : st.apron[1];
      t.quad(side(a, sg * (a.w + KERB), 0.06, p0), side(b, sg * (b.w + KERB), 0.06, p1), side(b, sg * gb, 0.04, p2), side(a, sg * ga, 0.04, p3), mow);
      if (st.road === 'neon') glowT.quad(side(a, sg * (a.w + KERB), 0.075, p0), side(b, sg * (b.w + KERB), 0.075, p1), side(b, sg * (b.w + KERB + 0.22), 0.075, p2), side(a, sg * (a.w + KERB + 0.22), 0.075, p3), sg < 0 ? 0x00e5ff : 0xff2bd6);
      const wa = ga + 0.25, wb = gb + 0.25;
      if (a.wall) {
        if (st.wall === 'barrier') {
          const H = 0.9, T = 0.4;
          {
            const q = [side(a, sg * wa, 0), side(b, sg * wb, 0), side(b, sg * wb, H), side(a, sg * wa, H)];
            const u0 = a.s / 8, u1 = (a.s + track.ds) / 8;
            tq(barS, sg > 0 ? q : [q[1], q[0], q[3], q[2]], sg > 0 ? [[u0, 1], [u1, 1], [u1, 0], [u0, 0]] : [[u1, 1], [u0, 1], [u0, 0], [u1, 0]]);
          }
          t.quad(side(a, sg * wa, H, p0), side(b, sg * wb, H, p1), side(b, sg * (wb + T), H, p2), side(a, sg * (wa + T), H, p3), 0xd7dbe2);
        } else if (st.wall === 'parapet') {
          const H = 1.05, T = 0.45;
          t.quad(side(a, sg * wa, 0, p0), side(b, sg * wb, 0, p1), side(b, sg * wb, H, p2), side(a, sg * wa, H, p3), Math.floor(a.s / 8) % 2 ? 0xbfc4cc : 0xb4bac3);
          t.quad(side(a, sg * wa, H, p0), side(b, sg * wb, H, p1), side(b, sg * (wb + T), H, p2), side(a, sg * (wa + T), H, p3), 0xe0e3e8);
          t.quad(side(a, sg * (wa + 0.1), H + 0.55, p0), side(b, sg * (wb + 0.1), H + 0.55, p1), side(b, sg * (wb + 0.1), H + 0.62, p2), side(a, sg * (wa + 0.1), H + 0.62, p3), 0x8a919c);
          if (i % 4 === 0) box(side(a, sg * (wa + 0.12), H), a.yaw, 0.06, 0.6, 0.06, 0x8a919c);
        } else if (st.wall === 'rail') {
          for (const [h, th] of [[0.9, 0.12], [0.5, 0.09]] as const) {
            t.quad(side(a, sg * wa, h, p0), side(b, sg * wb, h, p1), side(b, sg * wb, h + th, p2), side(a, sg * wa, h + th, p3), h > 0.6 ? 0xe9dcc0 : 0xd8c8a4);
          }
          if (i % 3 === 0) box(side(a, sg * wa, -0.4), a.yaw, 0.2, 1.45, 0.2, 0x9a6b3f);
        } else {
          const H = 0.55;
          t.quad(side(a, sg * wa, 0, p0), side(b, sg * wb, 0, p1), side(b, sg * wb, H, p2), side(a, sg * wa, H, p3), 0x1b1638);
          t.quad(side(a, sg * wa, H, p0), side(b, sg * wb, H, p1), side(b, sg * (wb + 0.3), H, p2), side(a, sg * (wa + 0.3), H, p3), 0x241c4a);
          glowT.quad(side(a, sg * (wa + 0.02), H + 0.3, p0), side(b, sg * (wb + 0.02), H + 0.3, p1), side(b, sg * (wb + 0.02), H + 0.42, p2), side(a, sg * (wa + 0.02), H + 0.42, p3), sg < 0 ? 0x00e5ff : 0xff2bd6);
          if (i % 5 === 0) box(side(a, sg * (wa + 0.15), H), a.yaw, 0.1, 0.45, 0.1, 0x3a2f6e);
        }
      }
      // under the outer edge: down to the ground
      const outA = a.wall ? wa + (st.wall === 'barrier' ? 0.4 : st.wall === 'parapet' ? 0.45 : st.wall === 'neon' ? 0.3 : 0.1) : ga;
      const outB = b.wall ? wb + (st.wall === 'barrier' ? 0.4 : st.wall === 'parapet' ? 0.45 : st.wall === 'neon' ? 0.3 : 0.1) : gb;
      if (st.edge === 'bank') {
        if (a.wall) {
          side(a, sg * outA, 0.9, p0); side(b, sg * outB, 0.9, p1);
          p2.set(p1.x, st.baseY, p1.z); p3.set(p0.x, st.baseY, p0.z);
          t.quad(p0, p1, p2, p3, 0xa9b0bb);
          side(a, sg * wa, 0, p0); side(b, sg * wb, 0, p1);
          if (p0.y > 0.2) { p2.set(p1.x, st.baseY, p1.z); p3.set(p0.x, st.baseY, p0.z); t.quad(p0, p1, p2, p3, 0x8f8a7c); }
        } else {
          side(a, sg * ga, 0.04, p0); side(b, sg * gb, 0.04, p1);
          const ha = p0.y - st.baseY, hb = p1.y - st.baseY;
          if (ha > 0.1 || hb > 0.1) {
            side(b, sg * (gb + Math.max(0.6, hb * 1.4)), 0, p2); p2.y = st.baseY;
            side(a, sg * (ga + Math.max(0.6, ha * 1.4)), 0, p3); p3.y = st.baseY;
            t.quad(p0, p1, p2, p3, st.bank ?? 0x4b8a35);
          }
        }
      } else {
        // a sheer side, textured (windows, pier timbers, neon panels)
        side(a, sg * outA, 0.04, p0); side(b, sg * outB, 0.04, p1);
        const q = [p0.clone(), p1.clone(), v(p1.x, st.baseY, p1.z), v(p0.x, st.baseY, p0.z)];
        const u0 = a.s / 8, u1 = (a.s + track.ds) / 8;
        const vv = (y: number) => (q[0].y - y) / 6.4;
        const order = sg > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
        const uvs = [[u0, 0], [u1, (q[0].y - q[1].y) / 6.4], [u1, vv(st.baseY)], [u0, vv(st.baseY)]];
        for (const k of order) { sideStrip.pos.push(q[k].x, q[k].y, q[k].z); sideStrip.uv.push(uvs[k][0], uvs[k][1]); }
      }
    }
  }
  if (sideStrip.pos.length && st.side) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(sideStrip.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(sideStrip.uv, 2));
    g.computeVertexNormals();
    const tex = sideTexture(st.side);
    const sm = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, side: THREE.DoubleSide, ...(st.side === 'neon' ? { emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.5 } : {}) });
    const m = new THREE.Mesh(g, sm);
    m.receiveShadow = true;
    group.add(m);
  }
  // the faces of each gap (concrete) and under ramps
  for (const gp of track.gaps) {
    for (const [s, dir] of [[gp.s0, 1], [gp.s1, -1]] as const) {
      const f = F[Math.round(s / track.ds) % N];
      const lim = f.w + KERB + f.apron + 0.6;
      side(f, -lim * dir, 0.04, p0); side(f, lim * dir, 0.04, p1);
      p2.set(p1.x, Math.min(track.waterY - 3, st.baseY), p1.z); p3.set(p0.x, Math.min(track.waterY - 3, st.baseY), p0.z);
      t.quad(p0, p1, p2, p3, st.gapFace);
    }
  }
  for (const [S, tex, rough] of [[kerbS, kerbTexture(st.kerb[0], st.kerb[1]), 0.6], [barS, barrierTexture(), 0.45]] as const) {
    if (!S.pos.length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(S.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(S.uv, 2));
    g.computeVertexNormals();
    tex.anisotropy = 16;
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: rough, metalness: 0.05, side: THREE.DoubleSide }));
    m.receiveShadow = true; m.castShadow = S === barS;
    group.add(m);
  }
  const edges = new THREE.Mesh(t.geo(), world);
  edges.receiveShadow = true; edges.castShadow = true;
  group.add(edges);
  if (glowT.pos.length) {
    const g = glowT.geo();
    const c = g.getAttribute('color') as THREE.BufferAttribute;
    for (let i = 0; i < c.count; i++) c.setXYZ(i, c.getX(i) * 1.6, c.getY(i) * 1.6, c.getZ(i) * 1.6);
    group.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })));
  }

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
  const oceans = buildLoopsAndWater(track, group, world);
  return { group, pads, oceans };
}

/** Vertical loops (an asphalt ribbon with railings, neon edges, an outer shell and a gantry that
    holds it) and the shallow water laid over the road in the splash zones. */
function buildLoopsAndWater(track: Track, group: THREE.Group, world: THREE.Material) {
  const oceans: { uTime: { value: number } }[] = [];
  const t = new Tris(), glow = new Tris();
  const F = new THREE.Vector3(), Up = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), d = new THREE.Vector3();
  for (const lp of track.loops) {
    const n = Math.ceil((Math.PI * 2 * lp.r) / 0.5), pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
    const P = (u: number, dd: number, h: number, out: THREE.Vector3) => { track.loopPoint(lp, u, dd, out); track.loopBasis(lp, u, F, Up); return out.addScaledVector(Up, h); };
    for (let k = 0; k <= n; k++) {
      const u = k / n;
      track.loopBasis(lp, u, F, Up);
      for (const dd of [-LOOP_HW, LOOP_HW]) { P(u, dd, 0.035, a); pos.push(a.x, a.y, a.z); nor.push(Up.x, Up.y, Up.z); uv.push(dd < 0 ? 0.08 : 0.92, (u * Math.PI * 2 * lp.r) / 12); }
      if (k < n) { const q = k * 2; idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
      if (k === n) break;
      const u1 = (k + 1) / n, stripe = k % 8 < 4;
      for (const sg of [-1, 1]) {
        const e = sg * LOOP_HW;
        // railing (inside), its neon top, the outer side and the shell underneath
        t.quad(P(u, e, 0.03, a), P(u1, e, 0.03, b), P(u1, e, 0.85, c), P(u, e, 0.85, d), stripe ? 0xf5f6f8 : 0xe23b3b);
        glow.quad(P(u, e, 0.85, a), P(u1, e, 0.85, b), P(u1, e, 0.97, c), P(u, e, 0.97, d), sg < 0 ? 0x00e5ff : 0xff2bd6);
        t.quad(P(u, e + sg * 0.25, -0.5, a), P(u1, e + sg * 0.25, -0.5, b), P(u1, e + sg * 0.25, 0.97, c), P(u, e + sg * 0.25, 0.97, d), 0x3a4152);
      }
      t.quad(P(u, -LOOP_HW - 0.25, -0.5, a), P(u1, -LOOP_HW - 0.25, -0.5, b), P(u1, LOOP_HW + 0.25, -0.5, c), P(u, LOOP_HW + 0.25, -0.5, d), k % 6 === 0 ? 0xffc61a : 0x4a5263);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    const tex = asphaltTexture();
    // a little self-light: the inside of the loop faces away from the sun most of the way round
    const road = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, normalMap: tex.normal, normalScale: new THREE.Vector2(0.28, 0.28), roughness: 0.8, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.35 }));
    road.receiveShadow = true; road.castShadow = true;
    group.add(road);
    // the gantry: two towers beside the loop and a beam over it, with struts to the ribbon's sides
    // the towers stand outside the walls (karts never drive through them)
    const f = track.frame(Math.round(lp.s / track.ds)), mid = lp.d0 + lp.shift / 2, out = f.w + KERB + f.apron + 1.4 - Math.abs(mid);
    const box = (cx: THREE.Vector3, sx: number, sy: number, sz: number, col: number) => {
      const cs = Math.cos(f.yaw), sn = Math.sin(f.yaw), hx = sx / 2, hz = sz / 2;
      const Q = (x: number, y: number, z: number) => new THREE.Vector3(cx.x + x * cs + z * sn, cx.y + y, cx.z - x * sn + z * cs);
      const lo = [Q(-hx, 0, -hz), Q(hx, 0, -hz), Q(hx, 0, hz), Q(-hx, 0, hz)], hi = [Q(-hx, sy, -hz), Q(hx, sy, -hz), Q(hx, sy, hz), Q(-hx, sy, hz)];
      for (let k = 0; k < 4; k++) t.quad(lo[k], lo[(k + 1) % 4], hi[(k + 1) % 4], hi[k], col);
      t.quad(hi[0], hi[1], hi[2], hi[3], col);
    };
    const base = side(f, mid);
    for (const sg of [-1, 1]) {
      const C = side(f, mid + sg * out);
      box(C, 1.4, lp.r * 2 + 2.4, 1.4, 0x3a4152);
      // struts to the ribbon's upright side nearest this tower (entry side left, exit side right)
      const edge = LOOP_HW + 2.7;
      for (const h of [lp.r * 0.6, lp.r, lp.r * 1.4]) {
        const B = side(f, mid + sg * (out + edge) / 2);
        B.x += f.t.x * (sg < 0 ? 1 : -1) * Math.sqrt(Math.max(0, lp.r * lp.r - (h - lp.r) ** 2));
        B.z += f.t.z * (sg < 0 ? 1 : -1) * Math.sqrt(Math.max(0, lp.r * lp.r - (h - lp.r) ** 2));
        B.y += h;
        box(B, out - edge + 0.4, 0.35, 0.35, 0xffc61a);
      }
    }
    base.y += lp.r * 2 + 2.4;
    box(base, out * 2 + 1.4, 1.1, 1.6, 0x3a4152);
  }
  if (t.pos.length) {
    const m = new THREE.Mesh(t.geo(), world);
    m.castShadow = true; m.receiveShadow = true;
    group.add(m);
  }
  if (glow.pos.length) {
    const g = glow.geo();
    const cc = g.getAttribute('color') as THREE.BufferAttribute;
    for (let i = 0; i < cc.count; i++) cc.setXYZ(i, cc.getX(i) * 1.7, cc.getY(i) * 1.7, cc.getZ(i) * 1.7);
    group.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: THREE.DoubleSide })));
  }
  // splash zones: a sheet of moving water over the road (foam at both ends)
  for (const w of track.splashes) {
    const pos: number[] = [], dep: number[] = [], idx: number[] = [];
    const i0 = Math.round(w.s0 / track.ds), i1 = Math.round(w.s1 / track.ds);
    for (let i = i0; i <= i1; i++) {
      const f = track.frame(i), e = Math.min(i - i0, i1 - i) * track.ds;
      for (const sg of [-1, 1]) { side(f, sg * (f.w + KERB + 0.4), 0.08, a); pos.push(a.x, a.y, a.z); dep.push(Math.min(0.9, 0.12 + e * 0.12)); }
      if (i < i1) { const q = (i - i0) * 2; idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aDepth', new THREE.Float32BufferAttribute(dep, 1));
    g.setIndex(idx);
    g.computeVertexNormals();
    const o = makeOcean({ deep: 0x1688b8, shallow: 0x4fd8e8, amp: 0.06, scale: 0.22, dir: [1, 0.3], opacity: 0.82 });
    o.material.side = THREE.DoubleSide;
    const m = new THREE.Mesh(g, o.material);
    m.renderOrder = 2;
    group.add(m);
    oceans.push(o.uniforms);
  }
  return oceans;
}
