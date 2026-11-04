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
  /** Coins collected this race minus the ones lost (the live class score counts them). */
  bank: number;
  /** Live class mode: the student's id, and for the other students the recent states received. */
  peer: string | null;
  remote: RemoteSample[] | null;
}

/** One state of another student's kart, as received (`at` = arrival time, ms). */
export interface RemoteSample {
  at: number; x: number; y: number; z: number; yaw: number; spd: number;
  /** Bits: 1 boost, 2 spin, 4 air, 8 shield; drift −1/0/1. */
  drift: number; flags: number;
  dist: number; fin: boolean; ft: number; bank: number; right: number; wrong: number;
  li: number; lu: number;
}

/** Live class score: right answers, wrong answers and the coins kept. */
export const SCORE = { right: 100, wrong: -50, coin: 10 } as const;
export const scoreOf = (r: { right: number; wrong: number; bank: number }) => r.right * SCORE.right + r.wrong * SCORE.wrong + r.bank * SCORE.coin;

export function makeRacer(idx: number, track: Track, info: { id: string; name: string; color: string }, player: boolean, flames: Flames): Racer {
  return {
    idx, toonId: info.id, name: info.name, color: info.color, player,
    kart: new Kart(track), view: null, flames, bot: null,
    dist: 0, prevS: 0, lapTimes: [], lapStart: 0, finished: false, finishT: 0, place: idx + 1,
    coins: 0, item: null, itemN: 0, roll: 0, shield: false, hurtT: 0, respawnAt: 0, wrongT: 0, stuckT: 0,
    tips: [new THREE.Vector3(), new THREE.Vector3()], boostKind: 'pad', boostTier: 1, points: 0, right: 0, wrong: 0, bank: 0, peer: null, remote: null,
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
