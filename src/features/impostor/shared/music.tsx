/* Background music for Impostor, synthesized live with Web Audio (original tunes, no audio files).
   "sneak": the classic mode — a tiptoeing spy walk. "arcade": the videogame mode — a driving chiptune.
   It plays only on the screens that ask for it (the projector), with a ♪ switch in the header. */
import { useEffect, useState } from "react";

export type Tune = "sneak" | "arcade";
const KEY = "impostor.music";
const seq = (s: string) => s.trim().split(/\s+/);
const rep = (s: string, n: number) => Array.from({ length: n }, () => s).join(" ");

/* 16th-note grids, 64 steps (4 bars). "-" rest, "." hold. Drums: k kick, s snare/snap, h hat. */
const TUNES: Record<Tune, { bpm: number; lead: string[]; arp?: string[]; bass: string[]; drums: string[]; leadWave: OscillatorType; bassWave: OscillatorType; short?: boolean }> = {
  sneak: {
    bpm: 104,
    lead: seq(
      "- - - - E4 - - - - - G4 - E4 - - - " +
      "- - - - B4 - A#4 - A4 - - - G4 - - - " +
      "- - - - E4 - - - - - G4 - A4 - - - " +
      "B4 - - - D5 - B4 - - - A4 - G4 . . -"),
    bass: seq(
      "E2 - - - G2 - - - A2 - - - A#2 - - - " +
      "B2 - - - A#2 - - - A2 - - - G2 - - - " +
      "E2 - - - G2 - - - A2 - - - A#2 - - - " +
      "B2 - - - D3 - - - B2 - A2 - G2 - F#2 -"),
    drums: seq(rep("- - h - s - h - - - h - s - h -", 3) + " k - h - s - h - k - h - s - s h"),
    leadWave: "triangle", bassWave: "sine", short: true,
  },
  arcade: {
    bpm: 128,
    lead: seq(
      "D5 . . . - - F5 . E5 . D5 . - - A4 . " +
      "A#4 . . . - - D5 . C5 . A#4 . - - F4 . " +
      "C5 . . . - - E5 . D5 . C5 . - - G4 . " +
      "A4 . . . C#5 . . . E5 . . . A5 . . -"),
    arp: seq(
      "D4 F4 A4 D5 A4 F4 D4 F4 A4 D5 A4 F4 D4 F4 A4 F4 " +
      "A#3 D4 F4 A#4 F4 D4 A#3 D4 F4 A#4 F4 D4 A#3 D4 F4 D4 " +
      "C4 E4 G4 C5 G4 E4 C4 E4 G4 C5 G4 E4 C4 E4 G4 E4 " +
      "A3 C#4 E4 A4 E4 C#4 A3 C#4 E4 A4 E4 C#4 A4 G4 F4 E4"),
    bass: seq(
      "D2 - D2 - D2 - D2 - D2 - D2 - D2 - D3 - " +
      "A#1 - A#1 - A#1 - A#1 - A#1 - A#1 - A#1 - A#2 - " +
      "C2 - C2 - C2 - C2 - C2 - C2 - C2 - C3 - " +
      "A1 - A1 - A1 - A1 - A1 - A1 - A2 - E2 -"),
    drums: seq(rep("k - h - s - h - k - h - s - h h", 3) + " k - h - s - h - k k h - s s s s"),
    leadWave: "square", bassWave: "sawtooth",
  },
};

const BASE: Record<string, number> = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
const hz = (n: string) => {
  const m = /^([A-G]#?)(\d)$/.exec(n);
  return m ? 440 * 2 ** ((12 * (Number(m[2]) + 1) + BASE[m[1]!]! - 69) / 12) : 0;
};

let on = (() => { try { return localStorage.getItem(KEY) !== "0"; } catch { return true; } })();
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let timer: number | null = null;
let step = 0;
let nextAt = 0;
let current: Tune | null = null;
const users: Tune[] = [];
const subs = new Set<() => void>();

function note(f: number, t: number, dur: number, wave: OscillatorType, vol: number) {
  if (!ctx || !master || !f) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = wave; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(t: number, dur: number, vol: number, hp: number) {
  if (!ctx || !master || !noiseBuf) return;
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; f.type = "highpass"; f.frequency.value = hp;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur);
}
function kick(t: number) {
  if (!ctx || !master) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(0.8, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.2);
}
const held = (a: string[], i: number) => { let n = 1; while (a[(i + n) % a.length] === ".") n++; return n; };

function schedule() {
  if (!ctx || !current) return;
  const tn = TUNES[current], six = 60 / tn.bpm / 4;
  while (nextAt < ctx.currentTime + 0.12) {
    const i = step % 64, t = nextAt;
    const l = tn.lead[i]!, b = tn.bass[i]!, a = tn.arp?.[i], d = tn.drums[i];
    if (hz(l)) note(hz(l), t, tn.short ? 0.16 : six * held(tn.lead, i) * 0.95, tn.leadWave, tn.short ? 0.16 : 0.08);
    if (a && hz(a)) note(hz(a), t, six * 0.9, "triangle", 0.05);
    if (hz(b)) note(hz(b), t, tn.short ? 0.3 : six * 1.6, tn.bassWave, tn.short ? 0.34 : 0.12);
    if (d === "k") kick(t);
    else if (d === "s") noise(t, tn.short ? 0.05 : 0.13, tn.short ? 0.22 : 0.3, tn.short ? 2400 : 1200);
    else if (d === "h") noise(t, 0.035, 0.09, 7000);
    nextAt += six; step++;
  }
}

function apply() {
  const want = on ? users[users.length - 1] ?? null : null;
  if (!want) {
    if (timer != null) { clearInterval(timer); timer = null; }
    current = null;
    return;
  }
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.15; master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  } catch { return; }
  if (current !== want) { current = want; step = 0; nextAt = ctx.currentTime + 0.06; }
  if (timer == null) { nextAt = Math.max(nextAt, ctx.currentTime + 0.06); timer = window.setInterval(schedule, 40); }
}

export function setImpostorMusic(v: boolean) {
  on = v;
  try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* ignore */ }
  apply(); subs.forEach((f) => f());
}

/** Plays the tune while the calling screen is mounted. The first tap starts it if the browser blocked autoplay. */
export function useImpostorMusic(tune: Tune) {
  useEffect(() => {
    users.push(tune); apply(); subs.forEach((f) => f());
    const retry = () => apply();
    window.addEventListener("pointerdown", retry);
    const vis = () => { if (!ctx) return; if (document.hidden) void ctx.suspend(); else if (current) void ctx.resume(); };
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("pointerdown", retry);
      document.removeEventListener("visibilitychange", vis);
      users.splice(users.lastIndexOf(tune), 1); apply(); subs.forEach((f) => f());
    };
  }, [tune]);
}

/** ♪ on/off, shown in the header only on screens that have music. */
export function MusicToggle() {
  const [, bump] = useState(0);
  useEffect(() => { const f = () => bump((n) => n + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  if (!users.length) return null;
  return (
    <button type="button" className="btn btn-s btn-hdr" onClick={() => setImpostorMusic(!on)} aria-pressed={on} title={on ? "Music: on" : "Music: off"} style={{ opacity: on ? 1 : 0.6 }}>
      {on ? "♪ ON" : "♪ OFF"}
    </button>
  );
}
