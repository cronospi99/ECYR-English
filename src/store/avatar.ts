import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  BG_IDS,
  BUILDER_KEYS,
  BUILDER_OPTIONS,
  PORTRAIT_IDS,
  RING_IDS,
  SHAPE_IDS,
  type BgId,
  type BuilderParams,
  type PortraitId,
  type RingId,
  type ShapeId,
} from '@/features/avatar/options';

/** Bump when the shape of AvatarConfig changes in a non-backwards-compatible way. */
export const avatarConfigSchemaVersion = 1;

export interface AvatarFrame {
  bg: BgId;
  ring: RingId;
  shape: ShapeId;
}

export type AvatarConfig =
  | ({ kind: 'initials' } & Partial<AvatarFrame>)
  | ({ kind: 'portrait'; id: PortraitId } & AvatarFrame)
  | ({ kind: 'builder' } & BuilderParams & AvatarFrame);

export type AvatarKind = AvatarConfig['kind'];

export const DEFAULT_AVATAR: AvatarConfig = { kind: 'initials' };

// --------------------------------------------------------------- sanitize --

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const pick = <T extends string>(allowed: readonly T[], v: unknown): T | undefined =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;

function frame(o: Record<string, unknown>, fallbackBg: BgId): AvatarFrame {
  return {
    bg: pick(BG_IDS, o.bg) ?? fallbackBg,
    ring: pick(RING_IDS, o.ring) ?? 'none',
    shape: pick(SHAPE_IDS, o.shape) ?? 'circle',
  };
}

/**
 * Strictly validates untrusted input (localStorage, Supabase JSON, imports).
 * Only known kinds/option ids survive; unknown keys are dropped; invalid or
 * missing fields fall back to defaults. A builder config with any invalid
 * required param is rejected as a whole (→ initials) rather than half-guessed.
 * Never throws.
 */
export function sanitizeAvatar(input: unknown): AvatarConfig {
  if (!isObj(input)) return DEFAULT_AVATAR;
  switch (input.kind) {
    case 'initials': {
      const out: AvatarConfig = { kind: 'initials' };
      const bg = pick(BG_IDS, input.bg);
      const ring = pick(RING_IDS, input.ring);
      const shape = pick(SHAPE_IDS, input.shape);
      if (bg) out.bg = bg;
      if (ring) out.ring = ring;
      if (shape) out.shape = shape;
      return out;
    }
    case 'portrait': {
      const id = pick(PORTRAIT_IDS, input.id);
      if (!id) return DEFAULT_AVATAR;
      return { kind: 'portrait', id, ...frame(input, 'sky') };
    }
    case 'builder': {
      const params = {} as Record<keyof BuilderParams, string>;
      for (const key of BUILDER_KEYS) {
        const allowed = BUILDER_OPTIONS[key].map((o) => o.id) as string[];
        const v = pick(allowed, input[key]);
        if (!v) return DEFAULT_AVATAR;
        params[key] = v;
      }
      return { kind: 'builder', ...(params as unknown as BuilderParams), ...frame(input, 'sky') };
    }
    default:
      return DEFAULT_AVATAR;
  }
}

// ------------------------------------------------------------------ store --

interface AvatarState {
  config: AvatarConfig;
  /** Last local edit, so the cloud copy only wins when it is newer. */
  updatedAt: string;
  set: (config: AvatarConfig) => void;
  reset: () => void;
  /** Applies a synced copy without touching `updatedAt` semantics. */
  replace: (config: unknown, updatedAt: string) => void;
}

export const useAvatar = create<AvatarState>()(
  persist(
    (set) => ({
      config: DEFAULT_AVATAR,
      updatedAt: new Date(0).toISOString(),
      set: (config) => set({ config: sanitizeAvatar(config), updatedAt: new Date().toISOString() }),
      reset: () => set({ config: DEFAULT_AVATAR, updatedAt: new Date().toISOString() }),
      replace: (config, updatedAt) => set({ config: sanitizeAvatar(config), updatedAt }),
    }),
    {
      name: 'ecyr:avatar',
      version: avatarConfigSchemaVersion,
      partialize: (s) => ({ config: s.config, updatedAt: s.updatedAt }),
      // Re-validate whatever was in storage (could be stale or tampered with).
      merge: (persisted, current) => ({
        ...current,
        config: sanitizeAvatar(isObj(persisted) ? persisted.config : undefined),
        updatedAt: isObj(persisted) && typeof persisted.updatedAt === 'string' ? persisted.updatedAt : current.updatedAt,
      }),
      migrate: (persisted) => ({ config: sanitizeAvatar(isObj(persisted) ? persisted.config : undefined) }),
    },
  ),
);
