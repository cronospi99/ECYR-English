/* English Racers — question gates. Before some straights the road splits into three coloured lanes
   (painted on the asphalt, with curtains of light between them) that run under a gantry: the
   question on top, one answer hanging over each lane. Drive through the right lane for a big turbo
   and coins; the wrong one only costs the prize. Questions come from English Run's banks by level.
   The gate shows a new question once the player has gone through it. */
import * as THREE from 'three';
import { paintBoard } from '@/features/run/gfx';
import { makeQuestion, type RunLevel, type RunQ } from '@/features/run/questions';
import { KERB, type Track } from './track';
import { side } from './trackMesh';

export const LANE_COLORS = ['#ff4d6d', '#3d8bff', '#ffc531'] as const;
export const LANE_LETTERS = ['A', 'B', 'C'] as const;
const LEAD = 42; // painted lanes before the gate (m)

export interface GateSite {
  id: number;
  s: number;
  /** Lane centres (lateral offsets) and the lane width. */
  lanes: number[];
  q: RunQ;
  answers: string[];
  correct: number;
  /** Bumped every time the question changes (so the bots pick a lane again). */
  round: number;
  qCtx: CanvasRenderingContext2D; qTex: THREE.CanvasTexture;
  aCtx: CanvasRenderingContext2D[]; aTex: THREE.CanvasTexture[];
  curtains: THREE.ShaderMaterial;
  flash: number; flashOk: boolean;
}

function board(w: number, h: number, pw: number, ph: number) {
  const cv = document.createElement('canvas'); cv.width = pw; cv.height = ph;
  const ctx = cv.getContext('2d')!;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide });
  return { ctx, tex, mesh: new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat) };
}

export class Gates {
  readonly group = new THREE.Group();
  readonly sites: GateSite[] = [];
  private recent = new Set<string>();
  private laneMat: THREE.MeshBasicMaterial;
  private frameMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.35 });

  constructor(private track: Track, private level: RunLevel) {
    const tr = track;
    this.laneMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, toneMapped: false });
    tr.gates.forEach((s, id) => this.build(id, s));
  }

  private build(id: number, s: number) {
    const tr = this.track, f = tr.frame(Math.round(s / tr.ds));
    const w = f.w, lw = (2 * w) / 3;
    const lanes = [-lw, 0, lw];
    // painted lanes (coloured strips with arrows) leading into the gate
    {
      const pos: number[] = [], col: number[] = [], c = new THREE.Color();
      const a = new THREE.Vector3(), b = new THREE.Vector3(), cc = new THREE.Vector3(), d = new THREE.Vector3();
      const n = Math.round(LEAD / tr.ds), i1 = Math.round(s / tr.ds);
      for (let k = i1 - n; k < i1; k++) {
        const f0 = tr.frame(k), f1 = tr.frame(k + 1), fade = Math.min(1, (k - (i1 - n)) / 8);
        for (let L = 0; L < 3; L++) {
          const d0 = -w + (L * 2 * w) / 3 + 0.18, d1 = -w + ((L + 1) * 2 * w) / 3 - 0.18;
          c.set(LANE_COLORS[L]).multiplyScalar(0.25 + 0.75 * fade);
          side(f0, d0, 0.03, a); side(f0, d1, 0.03, b); side(f1, d1, 0.03, cc); side(f1, d0, 0.03, d);
          for (const p of [a, b, cc, a, cc, d]) { pos.push(p.x, p.y, p.z); col.push(c.r, c.g, c.b); }
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      const m = new THREE.Mesh(g, this.laneMat);
      m.renderOrder = 1;
      this.group.add(m);
    }
    // gantry: two pylons outside the road, a beam, the question board on top
    const yaw = f.yaw, span = w + KERB + 1.2;
    const C = side(f, 0), Lp = side(f, -span), Rp = side(f, span);
    const parts: THREE.BufferGeometry[] = [];
    const col = (g: THREE.BufferGeometry, hex: number) => { const c = new THREE.Color(hex), n = g.getAttribute('position').count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
    const boxAt = (p: THREE.Vector3, y: number, sx: number, sy: number, sz: number, hex: number) => { const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed(); g.deleteAttribute('uv'); g.rotateY(yaw); g.translate(p.x, y, p.z); parts.push(col(g, hex)); };
    const top = C.y + 5.6;
    for (const P of [Lp, Rp]) { boxAt(P, (P.y + top) / 2, 0.7, top - P.y + 0.6, 0.7, 0x23305e); boxAt(P, P.y + 0.25, 1.3, 0.5, 1.3, 0xffc61a); }
    boxAt(C, top, span * 2 + 0.8, 0.7, 0.8, 0x23305e);
    boxAt(C, top + 0.42, span * 2 + 0.8, 0.14, 0.9, 0xffc61a);
    for (let L = 0; L < 3; L++) for (const sg of [-1, 1]) boxAt(side(f, lanes[L] + sg * (lw / 2 - 0.5)), top - 0.25, 0.05, 0.6, 0.05, 0x9aa3b5);
    const merged = new THREE.BufferGeometry();
    const P2: number[] = [], C2: number[] = [];
    for (const p of parts) { P2.push(...(p.getAttribute('position').array as Float32Array)); C2.push(...(p.getAttribute('color').array as Float32Array)); p.dispose(); }
    merged.setAttribute('position', new THREE.Float32BufferAttribute(P2, 3));
    merged.setAttribute('color', new THREE.Float32BufferAttribute(C2, 3));
    merged.computeVertexNormals();
    const frame = new THREE.Mesh(merged, this.frameMat);
    frame.castShadow = true;
    this.group.add(frame);

    // the question (both faces) and three answers
    const qb = board(Math.min(15, span * 2 - 0.4), 2.2, 1400, 206);
    qb.mesh.position.set(C.x, top + 1.65, C.z);
    qb.mesh.rotation.y = yaw + Math.PI;
    this.group.add(qb.mesh);
    const aCtx: CanvasRenderingContext2D[] = [], aTex: THREE.CanvasTexture[] = [];
    for (let L = 0; L < 3; L++) {
      const ab = board(lw - 0.35, 1.45, 600, 250);
      const P = side(f, lanes[L]);
      ab.mesh.position.set(P.x - f.t.x * 0.05, top - 1.25, P.z - f.t.z * 0.05);
      ab.mesh.rotation.y = yaw + Math.PI;
      this.group.add(ab.mesh);
      aCtx.push(ab.ctx); aTex.push(ab.tex);
    }
    // light curtains between the lanes (you drive through them)
    const curtains = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uFlash: { value: 0 }, uFlashCol: { value: new THREE.Color(1, 1, 1) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float uTime, uFlash; uniform vec3 uFlashCol; varying vec2 vUv;
        void main(){
          float edge = smoothstep(0.0, 0.35, vUv.x) * smoothstep(1.0, 0.65, vUv.x);
          float bands = 0.55 + 0.45 * sin(vUv.y * 22.0 - uTime * 6.0);
          float fade = smoothstep(1.0, 0.55, vUv.y);
          vec3 c = mix(vec3(0.6, 0.95, 1.6), uFlashCol * 2.0, uFlash);
          gl_FragColor = vec4(c, edge * fade * (0.28 + 0.2 * bands + uFlash * 0.4));
        }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    const fc = tr.frame(Math.round((s - 4) / tr.ds));
    for (const dd of [-w / 3, w / 3]) {
      const P = side(fc, dd);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(8, top - 1.95 - C.y + 0.3), curtains);
      m.position.set(P.x, (P.y + top - 1.95) / 2, P.z);
      m.rotation.y = fc.yaw + Math.PI / 2;
      this.group.add(m);
    }
    const site: GateSite = { id, s, lanes, q: { q: '', a: '', w: ['', ''], kind: '' }, answers: [], correct: 0, round: 0, qCtx: qb.ctx, qTex: qb.tex, aCtx, aTex, curtains, flash: 0, flashOk: true };
    this.sites.push(site);
    this.ask(site);
  }

  setLevel(level: RunLevel) { this.level = level; this.recent.clear(); for (const g of this.sites) this.ask(g); }

  /** A new question on this gate. */
  ask(g: GateSite) {
    const q = makeQuestion(this.level, this.recent);
    this.recent.add(q.q);
    if (this.recent.size > 40) this.recent.delete(this.recent.values().next().value as string);
    const answers = [q.a, ...q.w].sort(() => Math.random() - 0.5);
    g.q = q; g.answers = answers; g.correct = answers.indexOf(q.a); g.round++;
    paintBoard(g.qCtx, q.q, '#10204a', '#ffffff', '#ffc61a');
    g.qTex.needsUpdate = true;
    for (let L = 0; L < 3; L++) {
      const c = g.aCtx[L];
      paintBoard(c, answers[L], '#ffffff', '#10204a', LANE_COLORS[L]);
      // lane letter badge
      c.beginPath(); c.arc(54, 54, 34, 0, Math.PI * 2); c.fillStyle = LANE_COLORS[L]; c.fill();
      c.lineWidth = 6; c.strokeStyle = '#10204a'; c.stroke();
      c.fillStyle = '#ffffff'; c.font = '900 40px Inter, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(LANE_LETTERS[L], 54, 57);
      g.aTex[L].needsUpdate = true;
    }
  }

  /** Lane index (0, 1, 2) at lateral offset d on this gate. */
  laneOf(g: GateSite, d: number) { const w = this.track.frame(Math.round(g.s / this.track.ds)).w; return d < -w / 3 ? 0 : d > w / 3 ? 2 : 1; }

  /** The next gate ahead of s within `range` metres. */
  ahead(s: number, range: number) {
    let best: GateSite | null = null, bd = range;
    for (const g of this.sites) { const a = this.track.ahead(s, g.s); if (a < bd) { bd = a; best = g; } }
    return best ? { g: best, dist: bd } : null;
  }

  flash(g: GateSite, ok: boolean) { g.flash = 1; g.flashOk = ok; g.curtains.uniforms.uFlashCol.value.set(ok ? 0x5cff8a : 0xff5a5a); }

  update(dt: number, t: number) {
    for (const g of this.sites) {
      g.flash = Math.max(0, g.flash - dt * 1.6);
      g.curtains.uniforms.uTime.value = t;
      g.curtains.uniforms.uFlash.value = g.flash;
    }
  }

  dispose() {
    this.group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); const mm = m.material as THREE.MeshBasicMaterial; if (mm !== this.laneMat && mm !== (this.frameMat as unknown)) { mm.map?.dispose(); mm.dispose(); } } });
    this.laneMat.dispose(); this.frameMat.dispose();
  }
}
