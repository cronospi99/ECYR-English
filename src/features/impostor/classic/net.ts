/* Classic mode over the live-game relay: the projector is the host, each student's phone gets
   their own card (the word, or "you are the impostor") instead of the projector dealing them.
   Classic rooms use 5-letter codes, so /impostor/join/CODE can tell them from videogame rooms
   (4 letters). */
import { makeCode } from "@/lib/relay";
import type { Lang } from "../shared/proximity";

export const isClassicCode = (code: string) => code.length === 5;
export const classicCode = () => makeCode() + makeCode()[0];

export type ToClassicHost = { k: "hello"; name: string } | { k: "seen"; round: number } | { k: "bye" };

/** Everything a phone shows, sent whole whenever it changes (and on every hello). */
export type PhoneView = {
  k: "st";
  lang: Lang;
  round: number;
  /** wait = in the room, no card yet; card = a round is on; reveal = the round is over */
  stage: "wait" | "card" | "reveal";
  name?: string;
  imp?: boolean;
  word?: string;
  hint?: string;
  pos?: number; // where I am in the speaking order (0 = first)
  total?: number;
  speaking?: string; // who is speaking now (clue round only)
  myTurn?: boolean;
  phase?: string;
  reveal?: { word: string; decoy: string; imps: string[]; caught: boolean; wasImp: boolean };
};

export type FromClassicHost = PhoneView | { k: "kick" };
