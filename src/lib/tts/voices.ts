/**
 * The cast of natural voices (Microsoft Edge neural voices, served by /api/tts).
 * Many voices per accent and gender, so dialogues and listening tracks don't
 * sound like the same two people every time: a character gets a voice from
 * their name, and two characters in one scene never share one.
 */

export type VoiceAccent = 'us' | 'uk' | 'au' | 'ie';
export type VoiceGender = 'female' | 'male';
export type PersonaId = string;

export interface Persona {
  id: PersonaId;
  name: string;
  gender: VoiceGender;
  accent: VoiceAccent;
  lang: 'en-US' | 'en-GB' | 'en-AU' | 'en-IE';
  flag: string;
  /** Edge voice short name, e.g. "en-US-AvaMultilingualNeural". */
  edge: string;
  /** Short description for the picker, in Spanish. */
  blurb: string;
}

const US = { accent: 'us', lang: 'en-US', flag: '🇺🇸' } as const;
const UK = { accent: 'uk', lang: 'en-GB', flag: '🇬🇧' } as const;
const AU = { accent: 'au', lang: 'en-AU', flag: '🇦🇺' } as const;
const IE = { accent: 'ie', lang: 'en-IE', flag: '🇮🇪' } as const;

/** The first of each accent and gender is the default for it. */
export const PERSONAS: readonly Persona[] = [
  { id: 'ava', name: 'Ava', gender: 'female', ...US, edge: 'en-US-AvaMultilingualNeural', blurb: 'Cálida y expresiva' },
  { id: 'emma', name: 'Emma', gender: 'female', ...US, edge: 'en-US-EmmaMultilingualNeural', blurb: 'Alegre y cercana' },
  { id: 'jenny', name: 'Jenny', gender: 'female', ...US, edge: 'en-US-JennyNeural', blurb: 'Amable, de conversación' },
  { id: 'aria', name: 'Aria', gender: 'female', ...US, edge: 'en-US-AriaNeural', blurb: 'Segura, de noticias' },
  { id: 'michelle', name: 'Michelle', gender: 'female', ...US, edge: 'en-US-MichelleNeural', blurb: 'Tranquila y clara' },
  { id: 'andrew', name: 'Andrew', gender: 'male', ...US, edge: 'en-US-AndrewMultilingualNeural', blurb: 'Natural y cálido' },
  { id: 'brian', name: 'Brian', gender: 'male', ...US, edge: 'en-US-BrianMultilingualNeural', blurb: 'Relajado y amistoso' },
  { id: 'christopher', name: 'Christopher', gender: 'male', ...US, edge: 'en-US-ChristopherNeural', blurb: 'Serio, de presentador' },
  { id: 'guy', name: 'Guy', gender: 'male', ...US, edge: 'en-US-GuyNeural', blurb: 'Enérgico' },
  { id: 'eric', name: 'Eric', gender: 'male', ...US, edge: 'en-US-EricNeural', blurb: 'Profesional' },
  { id: 'sonia', name: 'Sonia', gender: 'female', ...UK, edge: 'en-GB-SoniaNeural', blurb: 'Británica clásica' },
  { id: 'libby', name: 'Libby', gender: 'female', ...UK, edge: 'en-GB-LibbyNeural', blurb: 'Británica joven' },
  { id: 'ryan', name: 'Ryan', gender: 'male', ...UK, edge: 'en-GB-RyanNeural', blurb: 'Británico amable' },
  { id: 'thomas', name: 'Thomas', gender: 'male', ...UK, edge: 'en-GB-ThomasNeural', blurb: 'Británico formal' },
  { id: 'natasha', name: 'Natasha', gender: 'female', ...AU, edge: 'en-AU-NatashaNeural', blurb: 'Australiana' },
  { id: 'william', name: 'William', gender: 'male', ...AU, edge: 'en-AU-WilliamNeural', blurb: 'Australiano' },
  { id: 'emily', name: 'Emily', gender: 'female', ...IE, edge: 'en-IE-EmilyNeural', blurb: 'Irlandesa' },
  { id: 'connor', name: 'Connor', gender: 'male', ...IE, edge: 'en-IE-ConnorNeural', blurb: 'Irlandés' },
];

/** Spanish for tips and instructions: Colombian voices. */
export const SPANISH_VOICE: Record<VoiceGender, string> = { female: 'es-CO-SalomeNeural', male: 'es-CO-GonzaloNeural' };

/** Ids saved by the earlier Gemini voices → their closest voice here. */
const ALIASES: Record<string, PersonaId> = { liam: 'andrew', olivia: 'sonia', harry: 'ryan', ruby: 'natasha', jack: 'william' };

export const getPersona = (id: string | null | undefined): Persona => {
  const key = id && ALIASES[id] ? ALIASES[id] : id;
  return PERSONAS.find((p) => p.id === key) ?? PERSONAS[0]!;
};

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7) >>> 0;

/**
 * A voice for a gender and accent. With a `seed` (a character's name) the
 * choice varies between voices but is stable for that name; `avoid` keeps
 * two characters of one scene apart.
 */
export function personaFor(gender: VoiceGender, accent: VoiceAccent, seed?: string, avoid: PersonaId[] = []): Persona {
  const exact = PERSONAS.filter((p) => p.gender === gender && p.accent === accent);
  const pool = exact.length ? exact : PERSONAS.filter((p) => p.gender === gender && p.accent === 'us');
  const free = pool.filter((p) => !avoid.includes(p.id));
  const list = free.length ? free : pool;
  return seed ? list[hash(seed.toLowerCase()) % list.length]! : list[0]!;
}

/** Distinct voices for the characters of one dialogue or listening track. */
export function castVoices(cast: { name: string; voice: VoiceGender; accent: VoiceAccent | string }[]): Map<string, Persona> {
  const out = new Map<string, Persona>();
  for (const c of cast) {
    const accent = (['us', 'uk', 'au', 'ie'] as const).find((a) => a === c.accent) ?? 'us';
    out.set(c.name, personaFor(c.voice, accent, c.name, [...out.values()].map((p) => p.id)));
  }
  return out;
}

/** The learner's voice for plain reading: the one they picked, else the default for their accent setting. */
export function defaultPersonaFor(voicePersona: string | null, accent: 'en-US' | 'en-GB'): Persona {
  if (voicePersona) return getPersona(voicePersona);
  return personaFor('female', accent === 'en-GB' ? 'uk' : 'us');
}
