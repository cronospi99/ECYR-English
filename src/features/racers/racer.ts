/* English Racers — one racer in the race: the kart and its physics, its 3D model, the bot brain
   (null for the player) and the race bookkeeping (distance, laps, place, coins, item). */
import * as THREE from 'three';
import { Kart, type BoostKind } from './kart';
import type { KartView } from './kartModel';
import type { Flames } from './fx';
import type { Bot } from './ai';
import type { Track } from './track';

export type ItemKind = 'plane' | 'ink' | 'book' | 'coffee' | 'bell';

export interface Racer {
  idx: number;
  toonId: string;
  name: string;
  color: string;
  player: boolean;
  kart: Kart;
  view: KartView | null;
  flames: Flames;
  bot: Bot | null;
  /** Distance driven along the road since the start line (laps × length + s). */
  dist: number;
  prevS: number;
  lapTimes: number[];
  lapStart: number;
  finished: boolean;
  finishT: number;
  place: number;
  coins: number;
  item: ItemKind | null;
  itemN: number;
  /** Item roulette time left (s). */
  roll: number;
  /** A book shield is up. */
  shield: boolean;
  /** Recently hit: can't be hit again for a moment. */
  hurtT: number;
  respawnAt: number;
  wrongT: number;
  stuckT: number;
  tips: THREE.Vector3[];
  boostKind: BoostKind;
  boostTier: number;
  /** Grand Prix points. */
  points: number;
  /** Answers given at the question gates (this race). */
  right: number;
  wrong: number;
}

export function makeRacer(idx: number, track: Track, info: { id: string; name: string; color: string }, player: boolean, flames: Flames): Racer {
  return {
    idx, toonId: info.id, name: info.name, color: info.color, player,
    kart: new Kart(track), view: null, flames, bot: null,
    dist: 0, prevS: 0, lapTimes: [], lapStart: 0, finished: false, finishT: 0, place: idx + 1,
    coins: 0, item: null, itemN: 0, roll: 0, shield: false, hurtT: 0, respawnAt: 0, wrongT: 0, stuckT: 0,
    tips: [new THREE.Vector3(), new THREE.Vector3()], boostKind: 'pad', boostTier: 1, points: 0, right: 0, wrong: 0,
  };
}

/** The racer's progress for the standings (finished racers by their time, first). */
export function rank(rs: Racer[]) {
  const sorted = [...rs].sort((a, b) => {
    if (a.finished && b.finished) return a.finishT - b.finishT;
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    return b.dist - a.dist;
  });
  sorted.forEach((r, i) => { r.place = i + 1; });
  return sorted;
}
