import type { Level } from "../shared/words";
import type { Lang } from "../shared/proximity";

/* internal ids — shown to players as "Good student" and "Addicted to Phone student" */
export type Role = "crew" | "impostor";

export interface Look {
  color: number;
  hat: string;
  face: string;
  extra: string;
}

export interface Pos {
  x: number;
  y: number;
  /* facing: -1 left, 1 right */
  dir: number;
  moving: boolean;
  /* id of the vent an impostor is hiding in */
  vent?: string;
}

export interface Settings {
  lang: Lang;
  level: Level | "Mixed";
  impostors: number;
  tasksPerPlayer: number;
  killCooldown: number; // seconds
  /* Among Us-style discussion before the vote */
  talkSecs: number;
  voteSecs: number;
  emergencies: number;
  sabotage: boolean;
  vents: boolean;
  chat: "quick" | "free";
}

export const defaultSettings: Settings = {
  lang: "es",
  level: "A2",
  impostors: 1,
  tasksPerPlayer: 4,
  killCooldown: 30,
  talkSecs: 45,
  voteSecs: 40,
  emergencies: 1,
  sabotage: true,
  vents: true,
  chat: "quick"
};

export interface PlayerState {
  id: string;
  name: string;
  look: Look;
  connected: boolean;
  alive: boolean;
  role: Role;
  tasks: string[]; // station ids
  done: string[];
  emergencyLeft: number;
  killReadyAt: number; // host clock ms
  score: number;
  teacher: boolean;
  /* points earned in the current game, by reason */
  earned: Record<string, number>;
  /* ECYR account (signed-in players) and the character card they train */
  uid?: string;
  card?: string;
}

export interface Body {
  id: string; // victim id
  x: number;
  y: number;
}

export type Phase = "lobby" | "reveal" | "play" | "meeting" | "eject" | "end";

export interface Meeting {
  caller: string;
  reason: "report" | "emergency" | "teacher";
  victim?: string;
  stage: "talk" | "vote" | "result";
  endsAt: number;
  votes: Record<string, string>; // voter -> target id | "skip"
  chat: ChatLine[];
}

export interface ChatLine { id: string; text: string; at: number }

export type SabotageKind = "lights" | "alarm";
export interface Sabotage {
  kind: SabotageKind;
  startedAt: number;
  endsAt: number; // alarm only; 0 for lights
  holds: Record<string, string[]>; // alarm panel id -> holders
}

export interface Eject {
  id: string | null;
  wasImpostor: boolean;
  tie: boolean;
  tally: Record<string, number>;
}

export interface HostState {
  code: string;
  phase: Phase;
  settings: Settings;
  players: PlayerState[];
  bodies: Body[];
  meeting: Meeting | null;
  eject: Eject | null;
  winner: Role | null;
  winReason: string;
  phaseEndsAt: number;
  round: number;
  prevImpostors: string[];
  log: string[];
  sabotage: Sabotage | null;
  sabotageReadyAt: number;
  /* ~20% of games: "it's been bad-pooped" */
  bathLocked: boolean;
  /* last kill, for the impact effect on phones */
  lastKill: { x: number; y: number; at: number; victim: string } | null;
  /* unique id of the current match (card points are paid once per match) */
  matchId?: string;
}

/* ---------- wire messages ---------- */

/* public snapshot every phone receives (no roles) */
export interface PublicPlayer {
  id: string;
  name: string;
  look: Look;
  alive: boolean;
  connected: boolean;
  score: number;
  teacher: boolean;
  /* points earned this game — only sent once the game is over */
  earned?: number;
  /* revealed only when the game has ended or the player was ejected */
  role?: Role;
}

export interface PublicState {
  code: string;
  phase: Phase;
  settings: Settings;
  players: PublicPlayer[];
  bodies: Body[];
  tasksDone: number;
  tasksTotal: number;
  meeting: (Omit<Meeting, "endsAt" | "votes"> & { msLeft: number; voted: string[]; votes?: Record<string, string> }) | null;
  eject: Eject | null;
  winner: Role | null;
  winReason: string;
  msLeft: number;
  round: number;
  sabotage: { kind: SabotageKind; msLeft: number; held: string[] } | null;
  bathLocked: boolean;
  lastKill: { x: number; y: number; ago: number; victim: string } | null;
}

/* private message sent to one player */
export interface Secret {
  role: Role;
  partners: string[];
  tasks: string[];
  done: string[];
  killMsLeft: number;
  emergencyLeft: number;
  sabotageMsLeft: number;
}

export type ToHost =
  | { k: "hello"; name: string; look: Look; teacher?: boolean; uid?: string; card?: string }
  | { k: "look"; name: string; look: Look; card?: string }
  | { k: "kill"; target: string }
  | { k: "report"; body: string }
  | { k: "emergency" }
  | { k: "task"; station: string }
  | { k: "vote"; target: string }
  | { k: "chat"; text: string }
  | { k: "sabotage"; kind: SabotageKind }
  | { k: "fixLights" }
  | { k: "hold"; panel: string; on: boolean };

export type FromHost =
  | { k: "state"; s: PublicState }
  | { k: "secret"; s: Secret }
  | { k: "teleport"; x: number; y: number }
  | { k: "killed"; by?: string }
  | { k: "toast"; text: string }
  | { k: "reward"; id: string; points: number; items: Record<string, number> }
  /* after the host saved the card points: was mine saved in my ECYR account? */
  | { k: "cards"; id: string; saved: boolean; note?: string };

/* players broadcast their position straight to everyone (host included) */
export type PosMsg = { k: "pos"; x: number; y: number; dir: number; m: boolean; v?: string };

/* cosmetic broadcasts between phones */
export type EmoteMsg = { k: "emote"; e: string };
export type VentFx = { k: "ventfx"; x: number; y: number };
