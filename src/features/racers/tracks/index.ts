/* English Racers — the four tracks: their data, look (sky, light, fog, bloom), road style and the
   scenery builder. Adding a track = a data file with its TrackDef and builder, plus an entry here. */
import type { SkyColors } from '@/features/run/gfx';
import type { TrackDef, Track } from '../track';
import { CAMPUS_STYLE, type TrackStyle } from '../trackMesh';
import type { Scenery } from '../scenery';
import { CAMPUS, buildCampus } from '../campus';
import { BEACH, BEACH_STYLE, buildBeach } from './beach';
import { ROOFS, ROOFS_STYLE, buildRoofs } from './roofs';
import { NEON, NEON_STYLE, buildNeon } from './neon';
import { LONDON, LONDON_STYLE, buildLondon } from './london';
import { NEWYORK, NEWYORK_STYLE, buildNewYork } from './newyork';
import { TOKYO, TOKYO_STYLE, buildTokyo } from './tokyo';
import { RIO, RIO_STYLE, buildRio } from './rio';
import { SPLASH, SPLASH_STYLE, buildSplash } from './splash';
import { CANYON, CANYON_STYLE, buildCanyon } from './canyon';
import { SNOW, SNOW_STYLE, buildSnow } from './snow';
import { LONG, LONGER } from './detours';

export type TrackId = 'campus' | 'beach' | 'roofs' | 'neon' | 'london' | 'newyork' | 'tokyo' | 'rio' | 'splash' | 'canyon' | 'snow';
export interface Look {
  sky: SkyColors; fogNear: number; fogFar: number;
  sun: number; sunI: number; sunOffset: [number, number, number];
  hemiSky: number; hemiGround: number; hemiI: number;
  envGround: number; envI: number; exposure: number;
  /** Bloom strength, radius, threshold. */
  bloom: [number, number, number];
  /** Colour of the dust kicked up off the road. */
  dust: [number, number, number];
  /** Falling off lands in water. */
  water: boolean;
}
export interface TrackInfo {
  id: TrackId;
  def: TrackDef;
  style: TrackStyle;
  name: { en: string; es: string };
  desc: { en: string; es: string };
  color: string;
  look: Look;
  build: (t: Track) => Scenery;
}

export const TRACKS: TrackInfo[] = [
  {
    id: 'campus', def: LONGER.campus(LONG.campus(CAMPUS)), style: CAMPUS_STYLE, color: '#2fd27a',
    name: { en: 'ECYR Campus', es: 'Campus ECYR' },
    desc: { en: 'Banked curve, hairpin, chicane, hill and a jump over the pond', es: 'Curva peraltada, horquilla, chicana, colina y salto sobre el estanque' },
    look: {
      sky: { top: 0x2f7fe0, mid: 0x8cc6ff, horizon: 0xe6f3ff, fog: 0xcfe6fb, sun: [0.55, 0.62, 0.35], sunGlow: 1 }, fogNear: 260, fogFar: 1300,
      sun: 0xfff1dc, sunI: 2.7, sunOffset: [45, 70, 30], hemiSky: 0xcfe8ff, hemiGround: 0x5d8a46, hemiI: 0.85,
      envGround: 0x5c8f45, envI: 0.6, exposure: 1.02, bloom: [0.5, 0.35, 1.1], dust: [0.55, 0.62, 0.34], water: true,
    },
    build: buildCampus,
  },
  {
    id: 'beach', def: LONGER.beach(LONG.beach(BEACH)), style: BEACH_STYLE, color: '#36c2ff',
    name: { en: 'Sunny Bay', es: 'Bahía Soleada' },
    desc: { en: 'Boardwalk, two piers over the sea with a jump, a lighthouse hairpin and crabs on the sand', es: 'Malecón, dos muelles sobre el mar con salto, horquilla del faro y cangrejos en la arena' },
    look: {
      sky: { top: 0x1f8be8, mid: 0x7cc8ff, horizon: 0xfff3dc, fog: 0xd6ecfa, sun: [0.3, 0.5, 0.8], sunGlow: 1.3 }, fogNear: 280, fogFar: 1500,
      sun: 0xfff0d4, sunI: 2.9, sunOffset: [30, 70, 55], hemiSky: 0xd8efff, hemiGround: 0xd9c08a, hemiI: 0.9,
      envGround: 0x2a8fb8, envI: 0.7, exposure: 1.04, bloom: [0.5, 0.35, 1.1], dust: [0.86, 0.78, 0.58], water: true,
    },
    build: buildBeach,
  },
  {
    id: 'roofs', def: LONGER.roofs(LONG.roofs(ROOFS)), style: ROOFS_STYLE, color: '#ff9f1c',
    name: { en: 'Skyline Rush', es: 'Tejados' },
    desc: { en: 'Rooftops at sunset: three jumps between buildings and cranes swinging over the road', es: 'Azoteas al atardecer: tres saltos entre edificios y grúas que cruzan la pista' },
    look: {
      sky: { top: 0x3b4fa8, mid: 0xf0a070, horizon: 0xffd2a0, fog: 0xf2c9a4, sun: [-0.7, 0.16, 0.55], sunGlow: 1.6 }, fogNear: 200, fogFar: 1100,
      sun: 0xffc48a, sunI: 2.6, sunOffset: [-55, 40, 40], hemiSky: 0xffd9b8, hemiGround: 0x6b5a66, hemiI: 0.85,
      envGround: 0x7b6a72, envI: 0.65, exposure: 1.0, bloom: [0.55, 0.4, 1.0], dust: [0.62, 0.62, 0.64], water: false,
    },
    build: buildRoofs,
  },
  {
    id: 'neon', def: LONGER.neon(LONG.neon(NEON)), style: NEON_STYLE, color: '#ff2bd6',
    name: { en: 'Neon Drive', es: 'Neón' },
    desc: { en: 'Night highway: steep banked curves, a tunnel of light, laser gates and a big jump', es: 'Autopista nocturna: curvas muy peraltadas, túnel de luz, barreras láser y un gran salto' },
    look: {
      sky: { top: 0x0a0624, mid: 0x3a1460, horizon: 0xff5a8c, fog: 0x2a0f44, sun: [0, 0.06, 1], sunGlow: 2.2, stars: true }, fogNear: 160, fogFar: 900,
      sun: 0xb07cff, sunI: 1.4, sunOffset: [20, 60, 60], hemiSky: 0x6a4cff, hemiGround: 0xff2bd6, hemiI: 0.7,
      envGround: 0x2a0f50, envI: 0.9, exposure: 1.06, bloom: [0.7, 0.45, 0.82], dust: [0.5, 0.35, 0.9], water: false,
    },
    build: buildNeon,
  },
  {
    id: 'london', def: LONGER.london(LONG.london(LONDON)), style: LONDON_STYLE, color: '#c8102e',
    name: { en: 'London Loop', es: 'Londres' },
    desc: { en: 'Along the river: jump the open bascule bridge, pass the giant wheel and the clock tower', es: 'Junto al río: salta el puente levadizo abierto, pasa la noria gigante y la torre del reloj' },
    look: {
      sky: { top: 0x4f7fb8, mid: 0x9dbedc, horizon: 0xe8eef3, fog: 0xd3dde6, sun: [0.5, 0.45, 0.6], sunGlow: 0.9 }, fogNear: 240, fogFar: 1200,
      sun: 0xfff3e2, sunI: 2.4, sunOffset: [40, 70, 35], hemiSky: 0xd8e4f0, hemiGround: 0x8a8578, hemiI: 0.95,
      envGround: 0x6f6a60, envI: 0.65, exposure: 1.02, bloom: [0.45, 0.35, 1.1], dust: [0.62, 0.6, 0.56], water: true,
    },
    build: buildLondon,
  },
  {
    id: 'newyork', def: LONGER.newyork(LONG.newyork(NEWYORK)), style: NEWYORK_STYLE, color: '#ffc61a',
    name: { en: 'Big Apple Dash', es: 'Nueva York' },
    desc: { en: 'A square of giant screens, a drive through the park, an avenue of skyscrapers and a suspension bridge', es: 'Plaza de pantallas gigantes, el parque, una avenida de rascacielos y un puente colgante' },
    look: {
      sky: { top: 0x3f6fc0, mid: 0xf0b884, horizon: 0xffe0b8, fog: 0xf0d2b4, sun: [-0.6, 0.22, 0.6], sunGlow: 1.5 }, fogNear: 260, fogFar: 1350,
      sun: 0xffd4a0, sunI: 2.6, sunOffset: [-50, 50, 40], hemiSky: 0xffe2c8, hemiGround: 0x7a7066, hemiI: 0.9,
      envGround: 0x7a7066, envI: 0.7, exposure: 1.02, bloom: [0.5, 0.38, 1.05], dust: [0.62, 0.6, 0.58], water: true,
    },
    build: buildNewYork,
  },
  {
    id: 'tokyo', def: LONGER.tokyo(LONG.tokyo(TOKYO)), style: TOKYO_STYLE, color: '#ff2bd6',
    name: { en: 'Tokyo Drift Lights', es: 'Tokio' },
    desc: { en: 'Dusk: a scramble crossing, lantern street, bullet trains, a red tower hairpin, a canal jump and cherry trees', es: 'Atardecer: cruce peatonal gigante, calle de faroles, tren bala, horquilla de la torre roja, salto del canal y cerezos' },
    look: {
      sky: { top: 0x2a2a78, mid: 0xb8609a, horizon: 0xffb48a, fog: 0xc8a0b8, sun: [-0.5, 0.1, 0.8], sunGlow: 1.8 }, fogNear: 220, fogFar: 1150,
      sun: 0xffc0a0, sunI: 1.9, sunOffset: [-45, 35, 55], hemiSky: 0xd8b8e8, hemiGround: 0x5a4a60, hemiI: 0.95,
      envGround: 0x4a3a58, envI: 0.75, exposure: 1.04, bloom: [0.65, 0.42, 0.9], dust: [0.6, 0.55, 0.6], water: true,
    },
    build: buildTokyo,
  },
  {
    id: 'rio', def: LONGER.rio(LONG.rio(RIO)), style: RIO_STYLE, color: '#009c3b',
    name: { en: 'Rio Carnival', es: 'Río' },
    desc: { en: 'The beach avenue, a climb through colourful houses with a jump, and the carnival avenue with floats and confetti', es: 'La avenida de la playa, la subida entre casas de colores con salto y la avenida del carnaval con carrozas y confeti' },
    look: {
      sky: { top: 0x1a86e0, mid: 0x6cc4ff, horizon: 0xe8f6ff, fog: 0xcfe9f8, sun: [0.4, 0.6, 0.5], sunGlow: 1.3 }, fogNear: 280, fogFar: 1500,
      sun: 0xfff2d8, sunI: 3.0, sunOffset: [35, 75, 30], hemiSky: 0xd8f0ff, hemiGround: 0xc9b88a, hemiI: 0.95,
      envGround: 0x2a8fb8, envI: 0.7, exposure: 1.03, bloom: [0.48, 0.35, 1.1], dust: [0.86, 0.78, 0.58], water: true,
    },
    build: buildRio,
  },
  {
    id: 'splash', def: LONGER.splash(LONG.splash(SPLASH)), style: SPLASH_STYLE, color: '#00d2ff',
    name: { en: 'Splash Loops', es: 'Rizos de Agua' },
    desc: { en: 'Six 360° loops (two big, four in a row) and every landing splashes into water', es: 'Seis vueltas de 360° (dos grandes y cuatro seguidas) y cada aterrizaje cae al agua' },
    look: {
      sky: { top: 0x1786e6, mid: 0x6fd0ff, horizon: 0xeafcff, fog: 0xd2f0fb, sun: [0.35, 0.6, 0.55], sunGlow: 1.3 }, fogNear: 280, fogFar: 1400,
      sun: 0xfff4dc, sunI: 3.0, sunOffset: [35, 75, 35], hemiSky: 0xdaf4ff, hemiGround: 0x9ccf7a, hemiI: 0.95,
      envGround: 0x2aa0c8, envI: 0.75, exposure: 1.03, bloom: [0.5, 0.36, 1.05], dust: [0.86, 0.8, 0.6], water: true,
    },
    build: buildSplash,
  },
  {
    id: 'canyon', def: LONGER.canyon(CANYON), style: CANYON_STYLE, color: '#ff7a1a',
    name: { en: 'Canyon Run', es: 'Cañón' },
    desc: { en: 'From a student\'s drawing: a long straight, two fingers down into the canyon and three humps', es: 'De un dibujo: una gran recta, dos dedos que bajan al cañón y tres jorobas' },
    look: {
      sky: { top: 0x3a7fd0, mid: 0x9cc8f0, horizon: 0xffe0b0, fog: 0xf0d2a8, sun: [0.5, 0.5, 0.5], sunGlow: 1.4 }, fogNear: 260, fogFar: 1300,
      sun: 0xffe6c0, sunI: 3.0, sunOffset: [45, 70, 30], hemiSky: 0xffe8cc, hemiGround: 0xb5502e, hemiI: 0.9,
      envGround: 0xb5602e, envI: 0.65, exposure: 1.02, bloom: [0.45, 0.35, 1.1], dust: [0.82, 0.6, 0.42], water: false,
    },
    build: buildCanyon,
  },
  {
    id: 'snow', def: LONGER.snow(SNOW), style: SNOW_STYLE, color: '#7fd3ff',
    name: { en: 'Snow Peak', es: 'Pico Nevado' },
    desc: { en: 'From a student\'s drawing: the long left straight, a twisty cup, a fast spine, a hairpin finger and waves', es: 'De un dibujo: la gran recta de la izquierda, una copa de curvas, la espina rápida, un dedo en horquilla y ondas' },
    look: {
      sky: { top: 0x3f7fd8, mid: 0xa8d0f4, horizon: 0xf2f8ff, fog: 0xe4eef8, sun: [0.4, 0.45, 0.6], sunGlow: 1.1 }, fogNear: 320, fogFar: 1500,
      sun: 0xffffff, sunI: 2.6, sunOffset: [40, 70, 40], hemiSky: 0xe8f2ff, hemiGround: 0xc8d4e2, hemiI: 1.05,
      envGround: 0xdde6f0, envI: 0.8, exposure: 0.98, bloom: [0.4, 0.35, 1.15], dust: [0.95, 0.97, 1.0], water: false,
    },
    build: buildSnow,
  },
];

export function trackInfo(id: TrackId): TrackInfo { return TRACKS.find((x) => x.id === id) ?? TRACKS[0]; }
const LEN = new Map<string, number>();
/** About how long a lap is (m), for the menu. */
export function trackLength(id: TrackId) {
  let l = LEN.get(id);
  if (l === undefined) {
    const c = trackInfo(id).def.cps;
    l = c.reduce((a, p, i) => { const q = c[(i + 1) % c.length]; return a + Math.hypot(q.x - p.x, q.z - p.z, (q.y ?? 0) - (p.y ?? 0)); }, 0) * 1.015;
    LEN.set(id, l);
  }
  return l;
}
