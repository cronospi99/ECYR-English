/**
 * The IELTS engine's voices (window.__ecyrTts): an AI-written Listening section
 * recorded with natural neural voices, line by line, a distinct voice per
 * speaker, joined into one MP3 the engine plays and can save to the class library.
 */
import { castVoices, type VoiceAccent } from '@/lib/tts/voices';
import { edgeAvailable, edgeIssue, fetchTtsBlob, splitForTts } from '@/lib/tts/edge';
import { speak, speakSequence, speakSpanish, stopSpeaking } from '@/lib/tts';

interface Part {
  speakers?: { name: string; gender?: string }[];
  script?: string;
  accent?: string;
}

const accentOf = (a = ''): VoiceAccent => (/austral/i.test(a) ? 'au' : /american|north/i.test(a) ? 'us' : 'uk');
const speakersOf = (p: Part) => (p.speakers?.length ? p.speakers : [{ name: 'Speaker', gender: 'female' }]);

function cast(p: Part) {
  const accent = accentOf(p.accent);
  return castVoices(speakersOf(p).map((s) => ({ name: s.name, voice: s.gender === 'male' ? ('male' as const) : ('female' as const), accent })));
}

/** "Anna: …" lines for conversations; paragraphs for monologues. */
function lines(p: Part): { speaker: string; text: string }[] {
  const names = speakersOf(p).map((s) => s.name);
  const raw = String(p.script ?? '')
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  let current = names[0]!;
  return raw.map((l) => {
    const m = /^([\p{L}'-]+)\s*:\s*(.*)$/u.exec(l);
    if (m && names.length > 1 && names.includes(m[1]!)) {
      current = m[1]!;
      return { speaker: current, text: m[2]! };
    }
    return { speaker: current, text: l };
  });
}

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export const ieltsTts = {
  /** The translator's "listen" button. */
  say(text: string, lang = 'en') {
    if (/^es/i.test(lang)) speakSpanish(text);
    else speak(text);
  },

  /**
   * A section with no recording, read live: natural voices when available,
   * the device's otherwise. Returns a stand-in for the <audio> element the
   * engine pauses.
   */
  playPart(p: Part, rate: number, onEnd: () => void) {
    const c = cast(p);
    const accent = accentOf(p.accent);
    const shim = {
      stopped: false,
      playbackRate: rate,
      pause() {
        this.stopped = true;
        stopSpeaking();
      },
    };
    const genderOf = (name: string) => (speakersOf(p).find((s) => s.name === name)?.gender === 'male' ? ('male' as const) : ('female' as const));
    speakSequence(
      lines(p).map((l) => ({ text: l.text, speaker: { name: l.speaker, voice: genderOf(l.speaker), accent, persona: c.get(l.speaker)?.id } })),
      { rate: 0.95 * (rate || 1), gapMs: 300, onEnd: () => !shim.stopped && onEnd() },
    );
    return shim;
  },

  voicesFor(p: Part) {
    const c = cast(p);
    return speakersOf(p).map((s) => ({ speaker: s.name, voice: c.get(s.name)?.name ?? 'Natural voice' }));
  },

  async recordSection(p: Part): Promise<{ b64: string; mime: string }> {
    if (!edgeAvailable()) throw new Error(edgeIssue() ?? 'Natural voices are not available right now.');
    const c = cast(p);
    const jobs = lines(p).flatMap((l) => splitForTts(l.text).map((text) => ({ text, voice: c.get(l.speaker)!.edge })));
    if (!jobs.length) throw new Error('The section has no script to read.');
    // A few chunks at a time: fast, without flooding the voice service.
    const out: Blob[] = new Array(jobs.length);
    let next = 0;
    const worker = async () => {
      while (next < jobs.length) {
        const i = next++;
        out[i] = await fetchTtsBlob(jobs[i]!.text, jobs[i]!.voice, 0);
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    // MP3 frames from the same voice service join into one playable file.
    const bytes = new Uint8Array(await new Blob(out, { type: 'audio/mpeg' }).arrayBuffer());
    return { b64: toBase64(bytes), mime: 'audio/mpeg' };
  },
};
