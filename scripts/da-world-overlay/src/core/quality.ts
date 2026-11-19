/**
 * How hard the renderer is allowed to work.
 *
 * Da World runs on a classroom laptop, a phone and a desktop with a real GPU,
 * and the same settings cannot serve all three: the phone wants to finish a
 * frame, the desktop wants the city to look like the screenshots. So the
 * expensive knobs are gathered here as four tiers, chosen once at boot from
 * what the device says about itself and changeable from the menu at any time.
 *
 * What each tier actually buys:
 *
 * - **samples** is multi-sample anti-aliasing. This is the one that matters
 *   most in a city of hard silhouettes against a pale sky, and it is the one
 *   that was silently missing: the renderer was asked for `antialias: true`,
 *   but every frame goes through an `EffectComposer` for the colour grade, and
 *   a composer renders into its own target where the renderer's MSAA does not
 *   apply. Every edge in the game was aliased. It is asked for on the render
 *   target now, where it can be granted.
 * - **pixelRatio** is how much of a retina screen is really drawn. It costs
 *   quadratically and is the first thing to give up on a weak device.
 * - **shadowMap** is the sun's resolution over the block you are standing in.
 * - **anisotropy** is how sharp the road stays as it recedes; a long straight
 *   street is the worst case for it, and this city is nine of them.
 */

export type QualityName = "low" | "medium" | "high" | "ultra";

export interface QualityTier {
  name: QualityName;
  label: string;
  /** MSAA samples on the composer's render target. 0 disables it. */
  samples: number;
  /** Cap on `devicePixelRatio`. */
  pixelRatio: number;
  /** Width of the sun's shadow map, in texels. 0 turns shadows off. */
  shadowMap: number;
  /** Anisotropic filtering on the ground textures. */
  anisotropy: number;
  /** Softness of the shadow edge, in texels. */
  shadowRadius: number;
  /** ECYR rebuild: ambient occlusion (GTAO) and bloom passes. */
  ao: boolean;
  bloom: boolean;
  /** ECYR rebuild: cube size of the live reflection probe; 0 keeps the painted sky. */
  reflections: number;
}

export const QUALITY: Record<QualityName, QualityTier> = {
  low: {
    name: "low",
    label: "Low — for older phones",
    samples: 0,
    pixelRatio: 1,
    shadowMap: 0,
    anisotropy: 1,
    shadowRadius: 1,
    ao: false,
    bloom: false,
    reflections: 0,
  },
  medium: {
    name: "medium",
    label: "Medium",
    samples: 2,
    pixelRatio: 1.25,
    shadowMap: 1024,
    anisotropy: 4,
    shadowRadius: 2,
    ao: false,
    bloom: true,
    reflections: 64,
  },
  high: {
    name: "high",
    label: "High",
    samples: 4,
    pixelRatio: 1.75,
    shadowMap: 2048,
    anisotropy: 8,
    shadowRadius: 3,
    ao: false,
    bloom: true,
    reflections: 128,
  },
  ultra: {
    name: "ultra",
    label: "Ultra — maximum quality",
    samples: 8,
    pixelRatio: 2,
    shadowMap: 4096,
    anisotropy: 16,
    shadowRadius: 4,
    ao: false,
    bloom: true,
    reflections: 256,
  },
};

const STORAGE_KEY = "da-world:quality";

/**
 * A first guess at what this device can take.
 *
 * Deliberately crude — there is no reliable way to ask a browser how fast its
 * GPU is, and every heuristic is wrong for somebody. It only has to be a
 * sensible *starting* point, because the setting is in the menu: a phone that
 * can handle more, and a laptop that cannot, are both one tap from the right
 * answer.
 */
export function detectQuality(): QualityName {
  const stored = read();
  if (stored) return stored;

  const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const cores = navigator.hardwareConcurrency ?? 4;

  // ECYR perf: start one step lower than before (ultra's 8× MSAA and 4096 shadows are rarely worth
  // it); Taxi Rush also steps down by itself when the frame rate drops.
  if (touch) return "medium";
  return cores >= 8 ? "high" : "medium";
}

function read(): QualityName | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw && raw in QUALITY ? (raw as QualityName) : null;
  } catch {
    return null;
  }
}

export function rememberQuality(name: QualityName): void {
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch {
    /* private browsing: the choice lasts for this session only. */
  }
}

/**
 * Taxi Rush's first guess: more cautious than the walking city, because a taxi draws a whole map
 * at speed. Phones start on "medium" (only a very weak one on "low"); the frame-rate governor
 * (taxi/governor.ts) then trims or restores individual settings from there.
 */
export function detectTaxiQuality(): QualityName {
  const stored = read();
  if (stored) return stored;
  const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;
  // ECYR quality: a mid-range phone runs "medium" (real surfaces, sun shadows, people);
  // the frame governor trims resolution and draw distance first if it cannot keep 60.
  // iOS reports few cores whatever the chip, so it is never sent to "low" for that.
  if (touch) return isIOS() ? "medium" : cores <= 2 || mem <= 2 ? "low" : "medium";
  if (cores <= 2 || mem <= 2) return "low";
  return cores >= 8 ? "high" : "medium";
}

/** iPhone / iPad (iPadOS reports itself as a Mac with a touch screen). */
export function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}
