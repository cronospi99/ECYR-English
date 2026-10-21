/**
 * Players with a timeline, for listenings the learner can scrub through.
 *
 *  - sequencePlayer: a dialogue or listening track read by the natural voices
 *    (segments from /api/tts), or by the device's voice when those are not
 *    available. A segment's length is only known once its audio is fetched, so
 *    the timeline starts from estimates (words and the speed, spelled letters
 *    said slower) and is corrected with each clip's real length as it loads.
 *    Seeking finds the segment for that second and starts it part-way through;
 *    the device voice cannot start mid-sentence, so there it snaps to the start
 *    of the nearest sentence.
 *  - mediaPlayer: a real audio file (an <audio> element or a URL).
 *
 * Both share one interface (SeekablePlayer) for <AudioScrubber>, and only one
 * plays at a time across the app.
 */
import { edgeAvailable, fetchTts, peekTts, presignTts, rateFor } from './edge';
import { getSpeechState, SPELL_RATE, stopSpeaking, subscribeSpeech, ttsEngine, type SequenceLine, type Tier, type TtsSegment } from './index';

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended';

export interface PlayerSnapshot {
  status: PlayerStatus;
  /** Position in seconds. */
  time: number;
  /** Length in seconds (an estimate until `exact`). */
  duration: number;
  /** Every part's real length is known. */
  exact: boolean;
  /** Transcript line at the position (-1 when none). */
  line: number;
  /** Read by the device's voice: a seek lands on the start of a sentence. */
  device: boolean;
  /** Speed multiplier shown to the learner (1 = normal). */
  speed: number;
}

export interface SeekablePlayer {
  getSnapshot(): PlayerSnapshot;
  subscribe(fn: () => void): () => void;
  play(): void;
  pause(): void;
  toggle(): void;
  seek(sec: number): void;
  skip(delta: number): void;
  setSpeed(speed: number): void;
  /** Start of a transcript line (sequence players only). */
  lineStart?(line: number): number;
  destroy(): void;
}

const active = { player: null as SeekablePlayer | null };
function claim(p: SeekablePlayer) {
  if (active.player && active.player !== p) active.player.pause();
  active.player = p;
}

abstract class Base implements SeekablePlayer {
  protected snap: PlayerSnapshot = { status: 'idle', time: 0, duration: 0, exact: false, line: -1, device: false, speed: 1 };
  private fns = new Set<() => void>();
  private ticker: ReturnType<typeof setInterval> | null = null;

  getSnapshot = () => this.snap;
  subscribe = (fn: () => void) => {
    this.fns.add(fn);
    return () => void this.fns.delete(fn);
  };
  protected set(p: Partial<PlayerSnapshot>) {
    const next = { ...this.snap, ...p };
    if ((Object.keys(p) as (keyof PlayerSnapshot)[]).every((k) => next[k] === this.snap[k])) return;
    this.snap = next;
    const live = next.status === 'playing' || next.status === 'loading';
    if (live && !this.ticker) this.ticker = setInterval(() => this.tick(), 120);
    if (!live && this.ticker) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
    this.fns.forEach((f) => f());
  }
  /** While playing: refresh the position. */
  protected abstract tick(): void;
  abstract play(): void;
  abstract pause(): void;
  abstract seek(sec: number): void;
  abstract setSpeed(speed: number): void;
  toggle() {
    if (this.snap.status === 'playing' || this.snap.status === 'loading') this.pause();
    else this.play();
  }
  skip(delta: number) {
    this.seek(Math.max(0, Math.min(this.snap.duration, this.snap.time + delta)));
  }
  /** Stops it. Safe to call more than once; the player still works if played again (React's StrictMode does that). */
  destroy() {
    this.pause();
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
    if (active.player === this) active.player = null;
  }
}

// ------------------------------------------------------------ estimating --

/** Real clip lengths, by voice, prosody rate and text: they are the same clips the CDN serves to everyone. */
const known = new Map<string, number>();
const keyOf = (s: TtsSegment, rate: number) => `${s.edge ?? 'device'}|${rate}|${s.text.replace(/\s+/g, ' ').trim()}`;
const probing = new Set<string>();

/** Reads a fetched clip's length without playing it. */
function probe(key: string, url: string, then: () => void) {
  if (known.has(key) || probing.has(key) || typeof Audio === 'undefined') return;
  probing.add(key);
  const a = new Audio();
  a.preload = 'metadata';
  a.onloadedmetadata = () => {
    probing.delete(key);
    if (Number.isFinite(a.duration) && a.duration > 0) {
      known.set(key, a.duration);
      then();
    }
    a.removeAttribute('src');
  };
  a.onerror = () => probing.delete(key);
  a.src = url;
}

/** Seconds a piece of text takes, from its words and pauses, at `factor` × the normal speed. */
function estimateText(text: string, slow: boolean, factor: number): number {
  if (slow) return (0.2 + text.split(',').length * 0.42) / factor;
  const words = text.split(/\s+/).filter(Boolean).length;
  const stops = (text.match(/[.!?…]+/g) ?? []).length;
  const commas = (text.match(/[,;:—–]/g) ?? []).length;
  return Math.max(0.5, (0.25 + words / 2.55 + stops * 0.3 + commas * 0.12) / factor);
}

/** Sentences of a segment, for the device voice (it cannot start mid-sentence). */
const sentences = (t: string) => t.match(/[^.!?…]+(?:[.!?…]+["'”’)\]]*|$)\s*/g)?.map((s) => s.trim()).filter(Boolean) ?? [t];

interface Slot {
  seg: TtsSegment;
  /** Prosody rate (%) of its natural clip. */
  rate: number;
  /** Silence before it (s): the pause between two lines. */
  gap: number;
  dur: number;
  /** Where its sound starts on the timeline. */
  start: number;
  exact: boolean;
}

// ------------------------------------------------------- sequence player --

export interface SequenceOptions {
  /** The app's speech rate (0.95 = normal). */
  rate?: number;
  /** Pause between lines, in ms. */
  gapMs?: number;
  tier?: Tier;
  /** Speeds the learner can pick (multipliers of `rate`). */
  speed?: number;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

class SequencePlayer extends Base {
  private slots: Slot[] = [];
  private total = 0;
  /** Speech id of the run now playing (-1 when none). */
  private id = -1;
  private starting = false;
  /** What the position is measured from while playing. */
  private cursor: { k: number; kind: 'clip' | 'clock' | 'hold'; from: number; t0: number } | null = null;
  /** The natural voice failed during this play: the rest goes on the device. */
  private natural = true;
  private unsub: (() => void) | null = null;

  constructor(
    private lines: SequenceLine[],
    private o: SequenceOptions,
  ) {
    super();
    this.snap = { ...this.snap, speed: o.speed ?? 1 };
    this.build();
  }

  /** Something else started speaking: we were interrupted, keep the place. */
  private watch() {
    this.unsub ??= subscribeSpeech(() => {
      if (this.starting || this.id < 0 || getSpeechState().id === this.id) return;
      const t = this.position();
      this.id = -1;
      this.cursor = null;
      if (this.snap.status === 'playing' || this.snap.status === 'loading') this.set({ status: 'paused', time: t });
    });
  }

  private get speechRate() {
    return (this.o.rate ?? 0.95) * this.snap.speed;
  }
  private rateOf(seg: TtsSegment) {
    return rateFor(seg.slow ? this.speechRate * SPELL_RATE : this.speechRate);
  }

  /** (Re)builds the segments: who is available (natural voices or not) can change between plays. */
  private build() {
    const segs = ttsEngine.sequenceSegments(this.lines, this.o.tier);
    const gap = (this.o.gapMs ?? 220) / 1000;
    this.slots = segs.map((seg, i) => ({ seg, rate: this.rateOf(seg), gap: i > 0 && segs[i - 1]!.line !== seg.line ? gap : 0, dur: 0, start: 0, exact: false }));
    for (const s of this.slots) {
      if (!s.seg.edge) continue;
      const url = peekTts(s.seg.text, s.seg.edge, s.rate);
      if (url) probe(keyOf(s.seg, s.rate), url, () => this.relayout());
    }
    this.layout();
  }

  /** Durations → start times, from what is known and estimated now. */
  private layout() {
    const device = !this.natural || !this.slots.some((s) => s.seg.edge);
    let t = 0;
    for (const s of this.slots) {
      const real = known.get(keyOf(device ? { ...s.seg, edge: null } : s.seg, s.rate));
      const factor = s.seg.edge && !device ? 1 + s.rate / 100 : (s.seg.slow ? this.speechRate * SPELL_RATE : this.speechRate) / 0.95;
      s.exact = real !== undefined;
      s.dur = real ?? estimateText(s.seg.text, !!s.seg.slow, factor);
      t += s.gap;
      s.start = t;
      t += s.dur;
    }
    this.total = t;
    const exact = !device && this.slots.every((s) => s.exact);
    this.set({ duration: t, exact, device });
  }
  /** A real length arrived: keep the position where it is on screen as far as possible. */
  private relayout() {
    this.layout();
    if (this.snap.status === 'paused' || this.snap.status === 'idle') this.set({ time: Math.min(this.snap.time, this.total) });
    else if (this.snap.status === 'ended') this.set({ time: this.total });
    else this.tick();
  }

  /** The slot for second `t`, and how far into it. A time in a gap belongs to the next slot. */
  private at(t: number): { k: number; offset: number } {
    for (let k = 0; k < this.slots.length; k++) {
      const s = this.slots[k]!;
      if (t < s.start + s.dur - 0.05) return { k, offset: Math.max(0, t - s.start) };
    }
    return { k: this.slots.length, offset: 0 };
  }

  private position(): number {
    const c = this.cursor;
    if (!c) return this.snap.time;
    const s = this.slots[c.k];
    if (!s) return this.total;
    if (c.kind === 'clip') return Math.min(s.start + s.dur, s.start + ttsEngine.clipTime());
    if (c.kind === 'hold') return s.start + c.from;
    const elapsed = (performance.now() - c.t0) / 1000;
    // Clock-driven: a gap before the slot (from < 0), or the device voice reading it.
    return Math.min(s.start + s.dur, s.start + c.from + elapsed);
  }

  protected tick() {
    const t = this.position();
    this.set({ time: t, line: this.lineAtTime(t) });
  }

  private lineAtTime(t: number) {
    const { k } = this.at(t);
    return this.slots[Math.min(k, this.slots.length - 1)]?.seg.line ?? -1;
  }

  lineStart(line: number) {
    return this.slots.find((s) => s.seg.line === line)?.start ?? 0;
  }

  play() {
    const from = this.snap.status === 'ended' || this.snap.time >= this.total - 0.05 ? 0 : this.snap.time;
    if (this.snap.status !== 'paused' && this.snap.status !== 'playing' && this.snap.status !== 'loading') {
      this.natural = true;
      this.build();
    }
    this.run(from);
  }

  pause() {
    if (this.snap.status !== 'playing' && this.snap.status !== 'loading') return;
    const t = this.position();
    this.id = -1;
    this.cursor = null;
    this.set({ status: 'paused', time: t });
    stopSpeaking();
  }

  seek(sec: number) {
    const t = Math.max(0, Math.min(this.total, sec));
    if (this.snap.status === 'playing' || this.snap.status === 'loading') return this.run(t);
    this.set({ status: t >= this.total && this.total > 0 ? 'ended' : this.snap.status === 'idle' && t === 0 ? 'idle' : 'paused', time: t, line: this.lineAtTime(t) });
  }

  setSpeed(speed: number) {
    if (speed === this.snap.speed) return;
    // Keep the same place in the same segment: the timeline is re-estimated at the new speed.
    const { k, offset } = this.at(this.position());
    const frac = this.slots[k] ? offset / (this.slots[k]!.dur || 1) : 0;
    const live = this.snap.status === 'playing' || this.snap.status === 'loading';
    if (live) {
      this.id = -1;
      this.cursor = null;
      stopSpeaking();
    }
    this.snap = { ...this.snap, speed };
    for (const s of this.slots) s.rate = this.rateOf(s.seg);
    this.layout();
    const s = this.slots[k];
    const t = s ? s.start + frac * s.dur : this.total;
    if (live) this.run(t);
    else this.set({ time: Math.min(t, this.total) });
  }

  /** Plays from second `at`. Must be called inside the tap (iOS unlocks audio there). */
  private run(at: number) {
    claim(this);
    this.watch();
    this.starting = true;
    const id = ttsEngine.begin();
    this.starting = false;
    this.id = id;
    let { k, offset } = this.at(at);
    if (k >= this.slots.length) return this.end(id);
    const first = this.slots[k]!;
    const natural = () => this.natural && this.slots.some((s) => s.seg.edge);
    if (natural() && first.seg.edge && !peekTts(first.seg.text, first.seg.edge, first.rate)) ttsEngine.unlock();
    if (natural()) presignTts(this.slots.slice(k).flatMap((s) => (s.seg.edge ? [{ text: s.seg.text, voice: s.seg.edge, rate: s.rate }] : [])));
    // A seek into the pause between two lines plays what is left of the pause.
    const lead = at < first.start ? first.start - at : 0;
    this.cursor = { k, kind: 'clock', from: -lead, t0: performance.now() };
    this.set({ status: 'loading', time: at, line: first.seg.line });
    void this.loop(id, k, offset, lead);
  }

  private async loop(id: number, k: number, offset: number, lead: number) {
    const live = () => ttsEngine.isCurrent(id) && this.id === id;
    for (let first = true; k < this.slots.length; k++, offset = 0, first = false) {
      if (!live()) return;
      const s = this.slots[k]!;
      // The pause before a line; after a seek, only what is left of it.
      const pause = first ? lead : s.gap;
      if (pause > 0) {
        this.cursor = { k, kind: 'clock', from: -pause, t0: performance.now() };
        this.set({ status: this.snap.status === 'loading' ? 'loading' : 'playing' });
        await wait(pause * 1000);
        if (!live()) return;
      }
      this.set({ line: s.seg.line });
      let outcome: 'ended' | 'stopped' | 'failed' = 'failed';
      if (this.natural && s.seg.edge) {
        let url = peekTts(s.seg.text, s.seg.edge, s.rate);
        if (!url) {
          this.cursor = { k, kind: 'hold', from: offset, t0: 0 };
          this.set({ status: 'loading' });
          ttsEngine.setPhase(id, 'loading');
          url = await fetchTts(s.seg.text, s.seg.edge, s.rate).catch(() => null);
          if (!live()) return;
        }
        this.ahead(k + 1);
        if (url) {
          const key = keyOf(s.seg, s.rate);
          this.cursor = { k, kind: 'clip', from: offset, t0: 0 };
          this.set({ status: 'playing' });
          outcome = await ttsEngine.playUrl(id, url, {
            from: offset,
            onMeta: (d) => {
              if (known.get(key) === d) return;
              known.set(key, d);
              this.layout();
            },
          });
        }
        if (outcome === 'stopped' || !live()) return;
        if (outcome === 'failed') {
          // The rest is read by the device; its timeline is estimated from the words.
          this.natural = false;
          this.layout();
        }
      }
      if (outcome !== 'ended') {
        if ((await this.device(id, k, offset)) === 'stopped' || !live()) return;
      }
    }
    if (live()) this.end(id);
  }

  /** Fetches the next clip while this one plays, and reads its length as soon as it lands. */
  private ahead(k: number) {
    const n = this.slots[k];
    if (!n?.seg.edge || !this.natural) return;
    if (!edgeAvailable() && !peekTts(n.seg.text, n.seg.edge, n.rate)) return;
    fetchTts(n.seg.text, n.seg.edge, n.rate)
      .then((url) => probe(keyOf(n.seg, n.rate), url, () => this.relayout()))
      .catch(() => undefined);
  }

  /** One slot on the device voice, from the sentence at `offset`. */
  private async device(id: number, k: number, offset: number): Promise<'ended' | 'stopped'> {
    const s = this.slots[k]!;
    let text = s.seg.text;
    let from = 0;
    if (offset > 0.3) {
      const parts = sentences(text);
      const weights = parts.map((p) => estimateText(p, !!s.seg.slow, 1));
      const sum = weights.reduce((a, b) => a + b, 0) || 1;
      let acc = 0;
      let j = 0;
      for (; j < parts.length - 1; j++) {
        const next = acc + (weights[j]! / sum) * s.dur;
        if (next > offset + 0.15) break;
        acc = next;
      }
      text = parts.slice(j).join(' ');
      from = acc;
    }
    const t0 = performance.now();
    this.cursor = { k, kind: 'clock', from, t0 };
    this.set({ status: 'playing', time: s.start + from });
    const r = s.seg.slow ? this.speechRate * SPELL_RATE : this.speechRate;
    const outcome = await ttsEngine.playDevice(id, text, s.seg, r);
    if (outcome === 'ended' && from === 0) {
      // A whole segment read on the device: its real length, for the next time.
      const d = (performance.now() - t0) / 1000;
      if (d > 0.2) {
        known.set(keyOf({ ...s.seg, edge: null }, s.rate), d);
        this.layout();
      }
    }
    return outcome === 'stopped' ? 'stopped' : 'ended';
  }

  private end(id: number) {
    this.id = -1;
    this.cursor = null;
    ttsEngine.finish(id);
    this.set({ status: 'ended', time: this.total, line: -1 });
  }

  override destroy() {
    super.destroy();
    this.unsub?.();
    this.unsub = null;
  }
}

/** A dialogue or track the learner can scrub through (see the top of this file). */
export function sequencePlayer(lines: SequenceLine[], o: SequenceOptions = {}): SeekablePlayer {
  return new SequencePlayer(lines, o);
}

// ----------------------------------------------------------- media player --

class MediaPlayer extends Base {
  private a: HTMLAudioElement;

  constructor(src: string, speed = 1) {
    super();
    this.a = new Audio(src);
    this.a.preload = 'metadata';
    this.snap = { ...this.snap, speed };
    const a = this.a;
    const dur = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) this.set({ duration: a.duration, exact: true });
    };
    const on: [string, () => void][] = [
      ['loadedmetadata', dur],
      ['durationchange', dur],
      ['timeupdate', () => this.set({ time: a.currentTime })],
      ['playing', () => this.set({ status: 'playing' })],
      ['waiting', () => !a.paused && this.set({ status: 'loading' })],
      ['pause', () => !a.ended && this.set({ status: 'paused', time: a.currentTime })],
      ['ended', () => this.set({ status: 'ended', time: this.snap.duration || a.currentTime })],
      ['error', () => this.set({ status: 'paused' })],
    ];
    on.forEach(([e, f]) => a.addEventListener(e, f));
    dur();
  }
  protected tick() {
    if (!this.a.paused) this.set({ time: this.a.currentTime });
  }
  play() {
    claim(this);
    stopSpeaking();
    if (this.a.ended) this.a.currentTime = 0;
    this.a.playbackRate = this.snap.speed;
    this.set({ status: 'loading' });
    void this.a.play().catch((e: unknown) => {
      if ((e as { name?: string })?.name !== 'AbortError') this.set({ status: 'paused' });
    });
  }
  pause() {
    if (!this.a.paused) this.a.pause();
    else if (this.snap.status === 'loading') this.set({ status: 'paused' });
  }
  seek(sec: number) {
    const d = this.snap.duration || this.a.duration || 0;
    const t = Math.max(0, Math.min(Number.isFinite(d) && d > 0 ? d : sec, sec));
    this.a.currentTime = t;
    this.set({ time: t, status: this.snap.status === 'ended' && t < d ? 'paused' : this.snap.status });
  }
  setSpeed(speed: number) {
    this.a.playbackRate = speed;
    this.set({ speed });
  }
}

/** A real audio file (a URL, data: URLs included) behind the same interface. */
export function mediaPlayer(src: string, speed = 1): SeekablePlayer {
  return new MediaPlayer(src, speed);
}
