/* English Racers — the garage: coins earned in races (coins kept, right answers, a bonus for the
   place) go into a wallet saved on this device, and buy parts for your kart: paint, rims, the rear
   wing and the colour of the turbo flames. The equipped parts show on the kart right away. */
import * as THREE from 'three';

export type PartKind = 'paint' | 'rim' | 'wing' | 'flame';
export type Rim = 'chrome' | 'black' | 'gold' | 'neon';
export type Wing = 'std' | 'none' | 'big' | 'twin';
export type Flame = 'classic' | 'blue' | 'green' | 'purple' | 'rainbow';
export interface KartStyle { paint: string | null; rim: Rim; wing: Wing; flame: Flame }
export interface Part { id: string; kind: PartKind; value: string; price: number; name: { en: string; es: string }; swatch: string }

const P = (kind: PartKind, value: string, price: number, en: string, es: string, swatch: string): Part => ({ id: `${kind}:${value}`, kind, value, price, name: { en, es }, swatch });
export const PARTS: Part[] = [
  P('paint', 'auto', 0, 'Driver colour', 'Color del piloto', 'linear-gradient(135deg,#ff6b6b,#4cc3ff)'),
  P('paint', '#e53935', 0, 'Racing red', 'Rojo carreras', '#e53935'),
  P('paint', '#1e88e5', 0, 'Ocean blue', 'Azul océano', '#1e88e5'),
  P('paint', '#fdd835', 30, 'Sunny yellow', 'Amarillo sol', '#fdd835'),
  P('paint', '#43a047', 30, 'Forest green', 'Verde bosque', '#43a047'),
  P('paint', '#fb8c00', 40, 'Orange blaze', 'Naranja fuego', '#fb8c00'),
  P('paint', '#8e24aa', 50, 'Royal purple', 'Morado real', '#8e24aa'),
  P('paint', '#f06292', 50, 'Bubblegum', 'Chicle', '#f06292'),
  P('paint', '#00bcd4', 60, 'Turquoise', 'Turquesa', '#00bcd4'),
  P('paint', '#212121', 80, 'Midnight', 'Medianoche', '#212121'),
  P('paint', '#f5f5f5', 80, 'Pearl white', 'Blanco perla', '#f5f5f5'),
  P('paint', '#c9a227', 150, 'Gold', 'Oro', 'linear-gradient(135deg,#f6e27a,#b8860b)'),
  P('rim', 'chrome', 0, 'Chrome', 'Cromo', 'linear-gradient(135deg,#f4f6f8,#9aa1ab)'),
  P('rim', 'black', 40, 'Black', 'Negras', '#22252b'),
  P('rim', 'gold', 120, 'Gold', 'Doradas', 'linear-gradient(135deg,#f6e27a,#b8860b)'),
  P('rim', 'neon', 150, 'Neon', 'Neón', 'linear-gradient(135deg,#00e5ff,#ff2bd6)'),
  P('wing', 'std', 0, 'Standard', 'Estándar', '#9aa1ab'),
  P('wing', 'none', 20, 'No wing', 'Sin alerón', '#e9ecef'),
  P('wing', 'big', 80, 'Big wing', 'Alerón grande', '#5c6370'),
  P('wing', 'twin', 150, 'Twin wing', 'Alerón doble', '#3a404c'),
  P('flame', 'classic', 0, 'Classic', 'Clásica', 'linear-gradient(135deg,#ffd23f,#ff5a1f)'),
  P('flame', 'blue', 50, 'Blue', 'Azul', 'linear-gradient(135deg,#9be7ff,#1e88e5)'),
  P('flame', 'green', 50, 'Green', 'Verde', 'linear-gradient(135deg,#b9ff9b,#2fd27a)'),
  P('flame', 'purple', 80, 'Purple', 'Morada', 'linear-gradient(135deg,#f0a8ff,#8e24aa)'),
  P('flame', 'rainbow', 200, 'Rainbow', 'Arcoíris', 'linear-gradient(90deg,#ff3b30,#ffcc00,#34c759,#0a84ff,#bf5af2)'),
];

export const RIM_COLORS: Record<Rim, [string, string]> = { chrome: ['#dfe3ea', '#cfd5dd'], black: ['#2a2d33', '#3a3e46'], gold: ['#e8c04a', '#d4a72c'], neon: ['#00e5ff', '#ff2bd6'] };

interface Save { coins: number; owned: string[]; style: KartStyle }
const DEFAULT: Save = { coins: 0, owned: PARTS.filter((p) => p.price === 0).map((p) => p.id), style: { paint: null, rim: 'chrome', wing: 'std', flame: 'classic' } };
function load(): Save {
  try {
    const v = JSON.parse(localStorage.getItem('racers:garage') || 'null');
    if (v && typeof v.coins === 'number') return { coins: Math.max(0, v.coins | 0), owned: Array.from(new Set([...DEFAULT.owned, ...(v.owned ?? [])])), style: { ...DEFAULT.style, ...v.style } };
  } catch { /* ignore */ }
  return structuredClone(DEFAULT);
}
let save = load();
const persist = () => { try { localStorage.setItem('racers:garage', JSON.stringify(save)); } catch { /* ignore */ } };

export const garage = {
  get coins() { return save.coins; },
  get style(): KartStyle { return save.style; },
  owns: (id: string) => save.owned.includes(id),
  equipped(p: Part) { const s = save.style; return p.kind === 'paint' ? (s.paint ?? 'auto') === p.value : s[p.kind] === p.value; },
  earn(n: number) { save.coins += Math.max(0, Math.round(n)); persist(); },
  /** Buy (if needed and affordable) and equip a part. False when there are not enough coins. */
  take(p: Part) {
    if (!save.owned.includes(p.id)) {
      if (save.coins < p.price) return false;
      save.coins -= p.price; save.owned.push(p.id);
    }
    if (p.kind === 'paint') save.style.paint = p.value === 'auto' ? null : p.value;
    else (save.style as unknown as Record<string, string>)[p.kind] = p.value;
    persist();
    return true;
  },
};

/** Coins a race is worth for the garage. */
export function raceEarnings(bank: number, right: number, place: number, racers: number) {
  const bonus = racers > 1 ? [15, 10, 6][place - 1] ?? 2 : 4;
  return bank + right * 2 + bonus;
}

const FLAME: Record<Exclude<Flame, 'classic' | 'rainbow'>, THREE.Color> = { blue: new THREE.Color(0.35, 0.9, 2.2), green: new THREE.Color(0.4, 2.0, 0.6), purple: new THREE.Color(1.6, 0.45, 2.1) };
/** The turbo flame colour for this style (null = the classic colours by kind of boost). */
export function flameColor(f: Flame, t: number, out: THREE.Color): THREE.Color | null {
  if (f === 'classic') return null;
  if (f === 'rainbow') return out.setHSL((t * 0.6) % 1, 1, 0.6).multiplyScalar(1.8);
  return out.copy(FLAME[f]);
}
