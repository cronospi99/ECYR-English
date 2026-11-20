/**
 * Taxi Rush — procedural textures for the city.
 *
 * One 1024x512 atlas of 128px cells holds every wall, window, shopfront, roof
 * and a few solid cells for props. A second canvas with the same layout is the
 * emissive map: the lit windows. The whole city (buildings, lamp posts, trees,
 * traffic-light steel) is drawn with ONE material that uses this pair, so the
 * city costs a draw call per map cell, and `registerGlow('window', ...)` turns
 * every lit window on at dusk in one assignment.
 *
 * The walls are painted light and neutral; each building multiplies them by a
 * vertex colour, so one mosaic cell becomes brick, plaster, glass or concrete.
 * Walls are laid out as one quad per floor and bay, each quad showing one cell
 * (UV in mosaic), which is what lets ground floors be shopfronts and upper
 * floors windows without a texture per building.
 */
import { CanvasTexture, Color, MeshStandardMaterial, SRGBColorSpace, LinearMipmapLinearFilter, LinearFilter } from 'three';
import { mulberry32 } from '../core/rng';
import { registerGlow } from '../city/palette';
import { SURFACE, injectSurface } from '../city/surfaces';

const CELL_PX = 128;
const COLS = 8, ROWS = 4;
const W = CELL_PX * COLS, H = CELL_PX * ROWS;

/** [column, row] of every cell; `a`/`b` variants differ only in which windows are lit. */
export const CELL = {
  officeStripA: [0, 0], officeStripB: [1, 0],
  officeGridA: [2, 0], officeGridB: [3, 0],
  resiA: [4, 0], resiB: [5, 0],
  tallA: [6, 0], tallB: [7, 0],
  shopA: [0, 1], shopB: [1, 1],
  indA: [2, 1], indB: [3, 1],
  shutter: [4, 1],
  wall: [5, 1],
  roof: [6, 1],
  door: [7, 1],
  tiles: [0, 2],
  solid: [1, 2],
  lamp: [2, 2],
  plate: [3, 2],
  stripes: [4, 2],
  pitch: [5, 2],
  planks: [6, 2],
} as const;
export type CellName = keyof typeof CELL;

/** UV rectangle [u0, v0, u1, v1] of a cell, inset a hair so mip levels do not bleed. */
export function cellUV(name: CellName): [number, number, number, number] {
  const [c, r] = CELL[name];
  const pad = 2.5;
  return [(c * CELL_PX + pad) / W, 1 - ((r + 1) * CELL_PX - pad) / H, ((c + 1) * CELL_PX - pad) / W, 1 - (r * CELL_PX + pad) / H];
}

const WALL = '#e9e5db';
const GLASS = '#3d566d';
const GLASS_HI = '#6f8fa8';
const LIT = ['#ffd58a', '#ffe7b0', '#ffc46b', '#fff0c8', '#b7dcff'];


function makeAtlas(): { map: CanvasTexture; emissive: CanvasTexture } {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ev = document.createElement('canvas');
  ev.width = W; ev.height = H;
  const c = cv.getContext('2d')!;
  const e = ev.getContext('2d')!;
  e.fillStyle = '#000'; e.fillRect(0, 0, W, H);
  const rand = mulberry32(777);

  const cellAt = (name: CellName): [number, number] => [CELL[name][0] * CELL_PX, CELL[name][1] * CELL_PX];
  const fill = (name: CellName, color: string): void => {
    const [x, y] = cellAt(name);
    c.fillStyle = color; c.fillRect(x, y, CELL_PX, CELL_PX);
  };
  /** One window pane: glass with a lighter top edge; lit panes glow in the emissive map. */
  const pane = (x: number, y: number, w: number, h: number, lit: boolean): void => {
    c.fillStyle = GLASS; c.fillRect(x, y, w, h);
    c.fillStyle = GLASS_HI; c.fillRect(x, y, w, Math.max(2, h * 0.18));
    if (lit) { e.fillStyle = LIT[Math.floor(rand() * LIT.length)]; e.fillRect(x, y, w, h); }
  };
  const frame = (x: number, y: number, w: number, h: number): void => {
    c.strokeStyle = '#b8b2a4'; c.lineWidth = 3; c.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
  };
  const speckle = (x: number, y: number, w: number, h: number, n: number, dark = true): void => {
    for (let i = 0; i < n; i++) {
      c.fillStyle = dark ? `rgba(0,0,0,${0.04 + rand() * 0.06})` : `rgba(255,255,255,${0.05 + rand() * 0.08})`;
      c.fillRect(x + rand() * w, y + rand() * h, 1 + rand() * 3, 1 + rand() * 3);
    }
  };

  const strip = (name: CellName, lit: number): void => {
    const [x, y] = cellAt(name);
    fill(name, WALL);
    c.fillStyle = '#d3cdbf'; c.fillRect(x, y + 12, CELL_PX, 8); c.fillRect(x, y + 100, CELL_PX, 8);
    for (let i = 0; i < 4; i++) pane(x + 2 + i * 31, y + 28, 29, 64, rand() < lit);
    c.fillStyle = '#c8c2b4'; for (let i = 1; i < 4; i++) c.fillRect(x + i * 31, y + 28, 2, 64);
  };
  const grid = (name: CellName, lit: number): void => {
    const [x, y] = cellAt(name);
    fill(name, '#d6d1c5');
    for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) pane(x + 6 + q * 39, y + 8 + r * 39, 36, 36, rand() < lit);
  };
  const resi = (name: CellName, lit: number): void => {
    const [x, y] = cellAt(name);
    fill(name, WALL); speckle(x, y, CELL_PX, CELL_PX, 30);
    for (const wx of [16, 72]) {
      pane(x + wx, y + 26, 40, 60, rand() < lit); frame(x + wx, y + 26, 40, 60);
      c.fillStyle = '#c9c3b5'; c.fillRect(x + wx - 5, y + 88, 50, 6);
      c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(x + wx + 19, y + 26, 2, 60);
    }
  };
  const tall = (name: CellName, lit: number): void => {
    const [x, y] = cellAt(name);
    fill(name, WALL); speckle(x, y, CELL_PX, CELL_PX, 30);
    for (const wx of [18, 76]) {
      pane(x + wx, y + 20, 34, 86, rand() < lit); frame(x + wx, y + 20, 34, 86);
      c.fillStyle = '#c4bdae'; c.fillRect(x + wx - 4, y + 12, 42, 6); c.fillRect(x + wx - 4, y + 108, 42, 5);
      c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(x + wx + 16, y + 20, 2, 86);
    }
  };
  const shop = (name: CellName, lit: number): void => {
    const [x, y] = cellAt(name);
    fill(name, WALL);
    // awning: alternating stripes over a deep glass window
    for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#ffffff' : '#c96a4f'; c.fillRect(x + i * 16, y + 8, 16, 26); }
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x, y + 34, CELL_PX, 5);
    pane(x + 8, y + 46, 76, 72, rand() < lit); frame(x + 8, y + 46, 76, 72);
    c.fillStyle = '#6c4b34'; c.fillRect(x + 94, y + 46, 26, 82);
    pane(x + 98, y + 52, 18, 40, rand() < lit);
  };
  const ind = (name: CellName, lit: number): void => {
    const [x, y] = cellAt(name);
    for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#dad7cd' : '#cfcbc0'; c.fillRect(x + i * 8, y, 8, CELL_PX); }
    c.fillStyle = '#a9a69c'; c.fillRect(x, y + 14, CELL_PX, 6);
    for (let i = 0; i < 3; i++) pane(x + 6 + i * 40, y + 24, 34, 18, rand() < lit);
    c.fillStyle = '#b8b5aa'; c.fillRect(x, y + 120, CELL_PX, 8);
  };

  strip('officeStripA', 0.5); strip('officeStripB', 0.35);
  grid('officeGridA', 0.5); grid('officeGridB', 0.3);
  resi('resiA', 0.45); resi('resiB', 0.3);
  tall('tallA', 0.45); tall('tallB', 0.3);
  shop('shopA', 0.8); shop('shopB', 0.55);
  ind('indA', 0.4); ind('indB', 0.25);

  { // roller shutter + wall
    const [x, y] = cellAt('shutter');
    fill('shutter', '#dad7cd');
    c.fillStyle = '#a7aeb4'; c.fillRect(x + 14, y + 22, 100, 106);
    for (let i = 0; i < 14; i++) { c.fillStyle = i % 2 ? '#9aa1a7' : '#b4bbc0'; c.fillRect(x + 14, y + 22 + i * 7.6, 100, 4); }
    c.fillStyle = '#7c8388'; c.fillRect(x + 8, y + 16, 112, 7);
  }
  { fill('wall', WALL); const [x, y] = cellAt('wall'); speckle(x, y, CELL_PX, CELL_PX, 80); speckle(x, y, CELL_PX, CELL_PX, 30, false); }
  { fill('roof', '#a4a39d'); const [x, y] = cellAt('roof'); speckle(x, y, CELL_PX, CELL_PX, 160); speckle(x, y, CELL_PX, CELL_PX, 60, false); }
  { // house front: door and a window
    const [x, y] = cellAt('door');
    fill('door', WALL); speckle(x, y, CELL_PX, CELL_PX, 30);
    c.fillStyle = '#6c4b34'; c.fillRect(x + 12, y + 40, 38, 88);
    c.fillStyle = '#d8b84a'; c.fillRect(x + 42, y + 86, 4, 4);
    c.fillStyle = '#c9c3b5'; c.fillRect(x + 8, y + 34, 46, 6);
    pane(x + 74, y + 40, 40, 48, true); frame(x + 74, y + 40, 40, 48);
  }
  { // roof tiles
    const [x, y] = cellAt('tiles');
    fill('tiles', '#cfcfcf');
    for (let r = 0; r < 8; r++) { c.fillStyle = r % 2 ? '#bdbdbd' : '#dadada'; c.fillRect(x, y + r * 16, CELL_PX, 11); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x, y + r * 16 + 12, CELL_PX, 3); }
  }
  fill('solid', '#ffffff');
  { // lamp head: pale in daylight, warm light at night
    fill('lamp', '#fff6dc');
    const [x, y] = cellAt('lamp'); e.fillStyle = '#ffe2a0'; e.fillRect(x, y, CELL_PX, CELL_PX);
  }
  { // signal-head back plate: black with a yellow border
    const [x, y] = cellAt('plate');
    fill('plate', '#111214'); c.strokeStyle = '#ffd21a'; c.lineWidth = 14; c.strokeRect(x + 8, y + 8, CELL_PX - 16, CELL_PX - 16);
  }
  { // striped canopy
    const [x, y] = cellAt('stripes');
    for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#ffffff' : '#d8d2c4'; c.fillRect(x + i * 16, y, 16, CELL_PX); }
  }
  { // ECYR v2: boardwalk boards, eight across the cell (0.6 each on a 4.8 run)
    const [x, y] = cellAt('planks');
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? '#e6dccb' : '#efe6d6'; c.fillRect(x + i * 16, y, 16, CELL_PX);
      c.fillStyle = 'rgba(60,40,20,0.35)'; c.fillRect(x + i * 16 + 15, y, 1, CELL_PX);
      for (let k = 0; k < 3; k++) { c.fillStyle = 'rgba(90,60,30,0.10)'; c.fillRect(x + i * 16 + 2 + rand() * 11, y + rand() * CELL_PX, 1, 10 + rand() * 30); }
    }
  }
  { // the stadium's pitch
    const [x, y] = cellAt('pitch');
    for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#5aa04f' : '#63ab57'; c.fillRect(x + i * 16, y, 16, CELL_PX); }
    c.strokeStyle = '#e8f0e0'; c.lineWidth = 3; c.strokeRect(x + 10, y + 10, CELL_PX - 20, CELL_PX - 20);
  }

  const map = new CanvasTexture(cv);
  map.colorSpace = SRGBColorSpace;
  map.anisotropy = 4;
  map.minFilter = LinearMipmapLinearFilter;
  map.magFilter = LinearFilter;
  const emissive = new CanvasTexture(ev);
  emissive.colorSpace = SRGBColorSpace;
  emissive.anisotropy = 4;
  return { map, emissive };
}

let material: MeshStandardMaterial | null = null;

/**
 * The one material every building, lamp, tree and piece of street furniture shares.
 * Vertex colours tint the neutral atlas; the emissive map carries the lit windows
 * and lamp heads, driven by the day/night glow bank.
 */
export function cityMaterial(): MeshStandardMaterial {
  if (material) return material;
  const { map, emissive } = makeAtlas();
  material = new MeshStandardMaterial({
    map,
    emissiveMap: emissive,
    emissive: new Color('#ffffff'),
    emissiveIntensity: 0,
    vertexColors: true,
    roughness: 0.82,
    metalness: 0,
  });
  // ECYR quality: the facades get the real PBR surfaces (surfaces.ts) and the windows
  // become glass. The atlas is painted neutral, so its own texel says what it is: light
  // and grey is wall (brick where the building's tint is a strong red-brown, render on
  // the other walls, roofing on what faces up, leaves on green props), dark blue is a
  // window pane (smooth and half-metallic, so it reflects the sky and the street).
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'float dwCityLayer = -1.0;\nfloat dwGlass = 0.0;\nvoid main() {')
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        {
          vec3 tx = sampledDiffuseColor.rgb;
          float mx = max(tx.r, max(tx.g, tx.b)), mn = min(tx.r, min(tx.g, tx.b));
          float lum = dot(tx, vec3(0.2126, 0.7152, 0.0722));
          dwGlass = step(tx.r * 1.6, tx.b) * step(0.035, tx.b) * (1.0 - step(0.5, tx.b));
          float wall = step(0.3, lum) * step((mx - mn) / max(mx, 1e-3), 0.28) * (1.0 - dwGlass);
          vec3 tint = vColor.rgb;
          float warm = (tint.r - tint.b) / max(tint.r, 1e-3);
          float layer = warm > 0.62 ? 4.0 : 3.0;
          if (tint.g > tint.r * 1.08 && tint.g > tint.b * 1.15) layer = 8.0;
          if (normalize(vDwSN).y > 0.7) layer = warm > 0.62 ? 6.0 : 5.0;
          dwCityLayer = wall > 0.5 ? layer : -1.0;
        }`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
        metalnessFactor = mix(metalnessFactor, 0.55, dwGlass);
        roughnessFactor = mix(roughnessFactor, 0.07, dwGlass);`,
      );
    injectSurface(shader, 'dwCityLayer', '0.85');
  };
  material.customProgramCacheKey = () => 'taxi-city-pbr';
  registerGlow('window', material);
  return material;
}

/** Surface layers of the ground material (-1: flat paint, no surface detail). */
export const GROUND_LAYER = { asphalt: SURFACE.asphalt, paving: SURFACE.paving, grass: SURFACE.grass, paint: -1 } as const;

let ground: MeshStandardMaterial | null = null;

/**
 * Asphalt, pavement, lawn and road paint in ONE material. The colour of each
 * piece is its vertex colour; the real world-space surface (surfaces.ts: asphalt,
 * paving, grass) is picked per vertex by the `aLayer` attribute, and paint is
 * layer -1. One draw call per map cell for the whole ground instead of four.
 */
export function groundMaterial(): MeshStandardMaterial {
  if (ground) return ground;
  const m = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aLayer;\nvarying float vTxLayer;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTxLayer = aLayer;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vTxLayer;');
    injectSurface(shader, 'vTxLayer', '1.0');
  };
  m.customProgramCacheKey = () => 'taxi-ground';
  ground = m;
  return m;
}

let lens: MeshStandardMaterial | null = null;

/**
 * Every traffic-light lens in the city in one material. A lens carries its bright
 * colour as vertex colour and its glow as the `aLayer` float; a light changing
 * from red to green rewrites a few floats instead of owning a material.
 */
export function lensMaterial(): MeshStandardMaterial {
  if (lens) return lens;
  const m = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.15, vertexColors: true });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aLayer;\nvarying float vTxGlow;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTxGlow = aLayer;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vTxGlow;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= 0.12;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance = vColor.rgb * vTxGlow;');
  };
  m.customProgramCacheKey = () => 'taxi-lens';
  lens = m;
  return m;
}
