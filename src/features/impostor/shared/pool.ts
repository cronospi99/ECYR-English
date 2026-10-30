import { packs, packsEs, type Entry, type Level } from "./words";
import type { Lang } from "./proximity";

export type LevelOpt = Level | "Mixed";

export function wordPool(lang: Lang, level: LevelOpt, topic: string): Entry[] {
  const P = lang === "es" ? packsEs : packs;
  const base = level === "Mixed" ? (Object.values(P) as Entry[][]).flat() : P[level] || P.B1;
  if (topic === "All") return base;
  const filtered = base.filter((e) => e[3] === topic);
  return filtered.length ? filtered : base;
}
