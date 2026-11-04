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

export type TrackId = 'campus' | 'beach' | 'roofs' | 'neon';
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
    id: 'campus', def: CAMPUS, style: CAMPUS_STYLE, color: '#2fd27a',
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
    id: 'beach', def: BEACH, style: BEACH_STYLE, color: '#36c2ff',
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
    id: 'roofs', def: ROOFS, style: ROOFS_STYLE, color: '#ff9f1c',
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
    id: 'neon', def: NEON, style: NEON_STYLE, color: '#ff2bd6',
    name: { en: 'Neon Drive', es: 'Neón' },
    desc: { en: 'Night highway: steep banked curves, a tunnel of light, laser gates and a big jump', es: 'Autopista nocturna: curvas muy peraltadas, túnel de luz, barreras láser y un gran salto' },
    look: {
      sky: { top: 0x0a0624, mid: 0x3a1460, horizon: 0xff5a8c, fog: 0x2a0f44, sun: [0, 0.06, 1], sunGlow: 2.2, stars: true }, fogNear: 160, fogFar: 900,
      sun: 0xb07cff, sunI: 1.4, sunOffset: [20, 60, 60], hemiSky: 0x6a4cff, hemiGround: 0xff2bd6, hemiI: 0.7,
      envGround: 0x2a0f50, envI: 0.9, exposure: 1.06, bloom: [0.7, 0.45, 0.82], dust: [0.5, 0.35, 0.9], water: false,
    },
    build: buildNeon,
  },
];

export function trackInfo(id: TrackId): TrackInfo { return TRACKS.find((x) => x.id === id) ?? TRACKS[0]; }
