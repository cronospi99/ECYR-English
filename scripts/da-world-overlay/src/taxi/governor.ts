/**
 * Taxi Rush — the 60 fps governor.
 *
 * Copies the idea of Language Defenders' `_govern`: measure real frame times over
 * one-second windows and, while the median is under ~56 fps, give up one notch of
 * graphics at a time until 60 holds; when it has been comfortably over 59 for
 * several windows, take one notch back. The notches, cheapest-to-lose first:
 *
 *   1 pixel ratio x0.85      2 pixel ratio x0.7       3 bloom off
 *   4 sun shadows at half resolution                  5 sun shadows off
 *   6 shorter draw distance (LOD thresholds x0.8, fewer far cars)
 *   7 reflection probe refreshed rarely               8 traffic thinned, LOD x0.65
 *
 * It sits out hidden tabs and frames longer than 2 s, and it does not keep stepping
 * down on a device pinned at an even ~30 fps (a battery-saver cap nothing can beat).
 * Going back up uses hysteresis: it needs more good windows each time a step up is
 * undone shortly afterwards, so it settles instead of oscillating.
 */
import type { Engine } from '../core/engine';
import type { Environment } from '../world/environment';
import type { TaxiWorld } from './world';
import type { TaxiTraffic } from './traffic';

export const MAX_LEVEL = 8;

interface Deps {
  engine: Engine;
  environment: Environment;
  world: () => TaxiWorld | null;
  street: () => TaxiTraffic | null;
  /** Said to the player when the level changes. */
  note?: (text: string) => void;
}

/** Draw-distance scale the quality tier starts from. */
const TIER_LOD = { low: 0.7, medium: 0.9, high: 1, ultra: 1 } as const;
const TIER_TRAFFIC = { low: 0.45, medium: 0.7, high: 1, ultra: 1 } as const;
const TIER_RADIUS = { low: 60, medium: 85, high: 105, ultra: 120 } as const;

export class FrameGovernor {
  level = 0;
  /** Last measured frames per second. */
  fps = 60;
  private last = 0;
  private acc = 0;
  private times: number[] = [];
  private hold = 3;
  private bad = 0;
  private good = 0;
  private upNeed = 6;
  private lastUp = 0;
  private applied = { pr: -1, bloom: true, shadow: -1, lod: -1, probe: -1, share: -1 };

  constructor(private readonly d: Deps) {}

  /** Back to full quality (a new shift) — the next windows decide again. */
  reset(): void {
    this.level = 0; this.acc = 0; this.times.length = 0; this.hold = 3; this.bad = 0; this.good = 0; this.upNeed = 6;
    this.last = performance.now();
    this.applied = { pr: -1, bloom: true, shadow: -1, lod: -1, probe: -1, share: -1 };
    this.apply();
  }

  /** Call once per frame while driving. `paused` frames are not measured. */
  tick(paused: boolean): void {
    const now = performance.now();
    const dt = now - this.last;
    this.last = now;
    if (dt > 2000 || document.hidden || paused) { this.acc = 0; this.times.length = 0; return; }
    this.acc += dt;
    this.times.push(dt);
    if (this.acc < 1000) return;
    const sorted = this.times.slice().sort((a, b) => a - b);
    const med = sorted[sorted.length >> 1];
    const fps = (this.times.length * 1000) / this.acc;
    this.acc = 0; this.times.length = 0;
    this.fps = Math.round(fps);
    this.step(fps, med);
  }

  /** One measured window. Exposed for tests. */
  step(fps: number, medianMs: number): void {
    if (this.hold > 0) { this.hold--; return; }
    const capped = fps > 27 && fps < 33 && medianMs > 30 && medianMs < 36;
    if (fps >= 56 && 1000 / medianMs >= 56) {
      this.bad = 0;
      if (fps >= 59 && this.level > 0) {
        if (++this.good >= this.upNeed) {
          this.good = 0; this.level--; this.hold = 3; this.lastUp = performance.now();
          this.apply('up');
        }
      } else this.good = 0;
      return;
    }
    this.good = 0;
    if (capped && this.level >= 3) return; // a 30 fps battery cap: more savings would only cost picture
    if (++this.bad < 2) return;
    this.bad = 0;
    if (this.level >= MAX_LEVEL) return;
    // undoing a step up within 20 s: be pickier about the next one
    if (performance.now() - this.lastUp < 20000) this.upNeed = Math.min(40, this.upNeed * 2);
    this.level++; this.hold = 2;
    this.apply('down');
  }

  /** Put every knob where the current level says (and only touch what changed). */
  apply(dir?: 'up' | 'down'): void {
    const { engine, environment } = this.d;
    const tier = engine.quality;
    const L = this.level, a = this.applied;
    const pr = L >= 2 ? 0.7 : L >= 1 ? 0.85 : 1;
    if (pr !== a.pr) { a.pr = pr; engine.setPixelScale(pr); }
    const bloom = tier.bloom && L < 3;
    if (bloom !== a.bloom) { a.bloom = bloom; engine.post.setEffects(tier.ao, bloom); }
    const shadow = tier.shadowMap <= 0 || L >= 5 ? 0 : L >= 4 ? Math.max(512, tier.shadowMap >> 1) : tier.shadowMap;
    if (shadow !== a.shadow) { a.shadow = shadow; environment.setShadowQuality(shadow, tier.shadowRadius); }
    const lod = TIER_LOD[tier.name] * (L >= 8 ? 0.65 : L >= 6 ? 0.8 : 1);
    if (lod !== a.lod) {
      a.lod = lod;
      this.d.world()?.setLod(lod);
      const s = this.d.street();
      if (s) s.drawRadius = TIER_RADIUS[tier.name] * (L >= 6 ? 0.8 : 1);
    }
    const probe = L >= 7 ? 1 : 0;
    if (probe !== a.probe) { a.probe = probe; environment.setProbeCadence(probe ? 20 : 6, probe ? 400 : 140); }
    const share = L >= 8 ? 0.6 : 1;
    if (share !== a.share) { a.share = share; this.d.street()?.setShare(share); }
    if (dir) this.d.note?.(`GRAPHICS ${dir === 'down' ? '▼' : '▲'} ${L}/${MAX_LEVEL}`);
  }

  /** The traffic's size for this tier (the governor thins it further at level 8). */
  static trafficDensity(name: keyof typeof TIER_TRAFFIC): number { return TIER_TRAFFIC[name]; }
}
