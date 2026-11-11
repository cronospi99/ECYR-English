/* Toons 3D — gallery of the teachers' 3D models (route /toons3d): orbit around one teacher or the
   whole team, try every animation, look from the front, the back or the side. */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ArrowLeft, RotateCw, Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import { TOON_CLIPS, TOONS, ToonActor, type Face, type ToonClip } from './runtime';

const FACE_ES: [Face | null, string][] = [[null, 'Automatic'], ['smile', 'Smile'], ['grin', 'Laugh'], ['happy', 'Happy'], ['surprised', 'Surprise'], ['wink', 'Wink'], ['sad', 'Sad'], ['love', 'In love']];
const CLIP_ES: Record<ToonClip, string> = { idle: 'Rest', walk: 'Walk', run: 'Run', jump: 'Jump', fall: 'Fall', slide: 'Slide', hit: 'Hit', cheer: 'Celebrate' };
type View = 'front' | 'back' | 'side';

class Viewer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
  private controls: OrbitControls;
  private actors: ToonActor[] = [];
  private shadows: THREE.Mesh[] = [];
  private clock = new THREE.Clock();
  private raf = 0;
  private ro: ResizeObserver;
  private token = 0;
  private clip: ToonClip = 'idle';
  private face: Face | null = null;
  private span = 1;

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    host.appendChild(this.renderer.domElement);
    // studio light: soft reflections from a room, a warm key light with soft shadows, a cool rim
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.75;
    pmrem.dispose();
    this.scene.add(new THREE.HemisphereLight(0xeaf2ff, 0x5a6390, 0.6));
    const sun = new THREE.DirectionalLight(0xfff3e2, 2.2);
    sun.position.set(2.2, 4, 3.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.radius = 6;
    sun.shadow.bias = -0.0005;
    Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 20 });
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0xbcd2ff, 1.2);
    rim.position.set(-3, 2.5, -3);
    this.scene.add(rim);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x252b66, roughness: 0.9, transparent: true, opacity: 0.55 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.autoRotateSpeed = 1.6;
    this.controls.target.set(0, 0.7, 0);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.resize();
    const tick = () => {
      this.raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, this.clock.getDelta());
      for (const a of this.actors) a.update(dt);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    tick();
  }

  private resize() {
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Show these toons (one, or the whole team in a grid). */
  async show(ids: string[]) {
    const token = ++this.token;
    const made = await Promise.all(ids.map((id) => ToonActor.create(id).catch(() => null)));
    if (token !== this.token) { made.forEach((a) => a?.dispose()); return; }
    for (const a of this.actors) a.dispose();
    for (const s of this.shadows) s.removeFromParent();
    this.actors = made.filter((a): a is ToonActor => !!a);
    this.shadows = [];
    const cols = Math.ceil(Math.sqrt(this.actors.length));
    this.actors.forEach((a, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      a.object.position.set((c - (cols - 1) / 2) * 0.95, 0, (r - (Math.ceil(this.actors.length / cols) - 1) / 2) * 1.1);
      this.scene.add(a.object);
      const sh = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 }));
      sh.rotation.x = -Math.PI / 2;
      sh.position.set(a.object.position.x, 0.002, a.object.position.z);
      this.scene.add(sh);
      this.shadows.push(sh);
      a.object.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
      a.setFace(this.face);
      a.play(this.clip, 0);
    });
    this.span = this.actors.length > 1 ? cols : 1;
    this.view('front');
  }

  setFace(f: Face | null) {
    this.face = f;
    for (const a of this.actors) a.setFace(f);
  }

  setClip(c: ToonClip) {
    this.clip = c;
    for (const a of this.actors) a.play(c, 0.15, 1, true);
  }

  view(v: View) {
    const d = this.span > 1 ? 2.2 + this.span * 1.4 : 4.4;
    const y = this.span > 1 ? 1.4 + this.span * 0.5 : 1.05;
    this.controls.target.set(0, this.span > 1 ? 0.5 : 0.8, 0);
    this.camera.position.set(v === 'side' ? d : 0, y, v === 'back' ? -d : v === 'front' ? d : 0.01);
  }

  spin(on: boolean) { this.controls.autoRotate = on; }

  dispose() {
    this.token++;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    for (const a of this.actors) a.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

export default function GalleryPage() {
  const host = useRef<HTMLDivElement>(null);
  const viewer = useRef<Viewer | null>(null);
  const [sel, setSel] = useState(0);
  const [all, setAll] = useState(false);
  const [clip, setClip] = useState<ToonClip>('idle');
  const [spin, setSpin] = useState(false);
  const [face, setFace] = useState<Face | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    try { viewer.current = new Viewer(host.current!); } catch { setErr(true); }
    return () => { viewer.current?.dispose(); viewer.current = null; };
  }, []);
  useEffect(() => { void viewer.current?.show(all ? TOONS.map((t) => t.id) : [TOONS[sel].id]); }, [sel, all]);
  useEffect(() => { viewer.current?.setClip(clip); }, [clip]);
  useEffect(() => { viewer.current?.spin(spin); }, [spin]);
  useEffect(() => { viewer.current?.setFace(face); }, [face]);

  const btn = 'rounded-xl px-3 py-1.5 text-[13.5px] font-extrabold transition-colors';
  return (
    <div className="flex h-dvh flex-col bg-[#141a3f] text-white md:flex-row">
      <aside className="flex shrink-0 flex-col gap-2 border-white/10 p-3 md:w-[230px] md:border-r">
        <div className="flex items-center gap-2">
          <Link to="/games" className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 hover:bg-white/20" aria-label="Back"><ArrowLeft size={18} /></Link>
          <div>
            <div className="text-[17px] leading-tight font-black">Personajes 3D</div>
            <div className="text-[12px] font-semibold text-white/60">{TOONS.length} teachers · .glb models</div>
          </div>
        </div>
        <button type="button" onClick={() => setAll(!all)} className={cn(btn, 'flex items-center justify-center gap-1.5', all ? 'bg-[#ffd23f] text-[#2a1d00]' : 'bg-white/10 hover:bg-white/20')}><Users size={16} /> {all ? 'See one' : 'See everyone'}</button>
        <div className="flex gap-1.5 overflow-x-auto pb-1 md:flex-col md:overflow-y-auto">
          {TOONS.map((t, i) => (
            <button key={t.id} type="button" onClick={() => { setSel(i); setAll(false); }}
              className={cn('flex shrink-0 items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-[14px] font-bold', !all && i === sel ? 'bg-white text-[#141a3f]' : 'bg-white/5 hover:bg-white/15')}>
              <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/30" style={{ background: t.color }} />{t.name}
            </button>
          ))}
        </div>
      </aside>
      <main className="relative min-h-0 flex-1">
        <div ref={host} className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,#3a43d8_0%,#1d2280_60%,#141a3f_100%)]" />
        {err && <div className="absolute inset-0 grid place-items-center p-6 text-center text-[15px] font-bold">This browser can’t display 3D (WebGL).</div>}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-3">
          <div className="pointer-events-auto flex flex-wrap justify-center gap-1.5 rounded-2xl bg-[#141a3f]/85 p-1.5 shadow-lg">
            {TOON_CLIPS.map((c) => (
              <button key={c} type="button" onClick={() => setClip(c)} className={cn(btn, clip === c ? 'bg-[#30d158] text-white' : 'bg-white/10 hover:bg-white/20')}>{CLIP_ES[c]}</button>
            ))}
          </div>
          <div className="pointer-events-auto flex flex-wrap justify-center gap-1.5 rounded-2xl bg-[#141a3f]/85 p-1.5 shadow-lg">
            {FACE_ES.map(([f, label]) => (
              <button key={label} type="button" onClick={() => setFace(f)} className={cn(btn, face === f ? 'bg-[#ff8fc0] text-[#3a0a22]' : 'bg-white/10 hover:bg-white/20')}>{label}</button>
            ))}
          </div>
          <div className="pointer-events-auto flex gap-1.5 rounded-2xl bg-[#141a3f]/85 p-1.5 shadow-lg">
            {(['front', 'side', 'back'] as View[]).map((v) => (
              <button key={v} type="button" onClick={() => viewer.current?.view(v)} className={cn(btn, 'bg-white/10 hover:bg-white/20')}>{v === 'front' ? 'Front' : v === 'side' ? 'Side' : 'Back'}</button>
            ))}
            <button type="button" onClick={() => setSpin(!spin)} className={cn(btn, 'flex items-center gap-1', spin ? 'bg-[#ffd23f] text-[#2a1d00]' : 'bg-white/10 hover:bg-white/20')}><RotateCw size={15} /> Spin</button>
          </div>
        </div>
      </main>
    </div>
  );
}
