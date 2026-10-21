/**
 * Tense Timeline — Build mode conjugator: subject + verb + tense + polarity
 * (+ passive, contractions, time expression) → a sentence split into
 * colour-coded parts. Pure TypeScript (tested by the parser round-trip).
 */
import type { Subject, TenseId } from './data';
import { type Role, type VerbEntry, ingForm, partForm, pastForm, thirdPerson } from './parser';

export type Polarity = 'pos' | 'neg' | 'q';

export interface BuildOptions {
  subject: Subject;
  verb: VerbEntry;
  tense: TenseId;
  polarity: Polarity;
  passive?: boolean;
  contractions?: boolean;
  time?: string;
}

export interface Part {
  text: string;
  role: Role;
  /** No space before this part ("I" + "’m"). */
  join?: boolean;
}

const beForm = (per: Subject['person'], past: boolean) => (past ? (per === '1s' || per === '3s' ? 'was' : 'were') : per === '1s' ? 'am' : per === '3s' ? 'is' : 'are');

/** Affirmative auxiliaries + main verb; `doAux` is the do-support word for simple tenses. */
function chain(tense: TenseId, per: Subject['person'], v: VerbEntry, passive: boolean): { aux: string[]; main: string; doAux?: string } {
  const PP = partForm(v);
  const ING = ingForm(v);
  const B = v.en;
  const has = per === '3s' ? 'has' : 'have';
  const isBe = v.en === 'be';
  switch (tense) {
    case 'presentSimple':
      if (passive) return { aux: [beForm(per, false)], main: PP };
      if (isBe) return { aux: [], main: beForm(per, false) };
      return { aux: [], main: per === '3s' ? thirdPerson(B) : B, doAux: per === '3s' ? 'does' : 'do' };
    case 'presentContinuous':
      return passive ? { aux: [beForm(per, false), 'being'], main: PP } : { aux: [beForm(per, false)], main: ING };
    case 'pastSimple':
      if (passive) return { aux: [beForm(per, true)], main: PP };
      if (isBe) return { aux: [], main: beForm(per, true) };
      return { aux: [], main: pastForm(v), doAux: 'did' };
    case 'pastContinuous':
      return passive ? { aux: [beForm(per, true), 'being'], main: PP } : { aux: [beForm(per, true)], main: ING };
    case 'presentPerfect':
      return passive ? { aux: [has, 'been'], main: PP } : { aux: [has], main: PP };
    case 'presentPerfectContinuous':
      return { aux: [has, 'been'], main: ING };
    case 'pastPerfect':
      return passive ? { aux: ['had', 'been'], main: PP } : { aux: ['had'], main: PP };
    case 'pastPerfectContinuous':
      return { aux: ['had', 'been'], main: ING };
    case 'futureSimple':
      return passive ? { aux: ['will', 'be'], main: PP } : { aux: ['will'], main: B };
    case 'futureContinuous':
      return { aux: ['will', 'be'], main: ING };
    case 'futurePerfect':
      return passive ? { aux: ['will', 'have', 'been'], main: PP } : { aux: ['will', 'have'], main: PP };
    case 'futurePerfectContinuous':
      return { aux: ['will', 'have', 'been'], main: ING };
    case 'goingTo':
      return passive ? { aux: [beForm(per, false), 'going', 'to', 'be'], main: PP } : { aux: [beForm(per, false), 'going', 'to'], main: B };
    case 'usedTo':
    case 'wouldHabit':
      if (tense === 'wouldHabit') return { aux: ['would'], main: B };
      return passive ? { aux: ['used', 'to', 'be'], main: PP } : { aux: ['used', 'to'], main: B, doAux: 'did' };
  }
}

const NEG: Record<string, string> = {
  is: "isn't",
  are: "aren't",
  was: "wasn't",
  were: "weren't",
  do: "don't",
  does: "doesn't",
  did: "didn't",
  have: "haven't",
  has: "hasn't",
  had: "hadn't",
  will: "won't",
  would: "wouldn't",
};
const SUBJ_CONTR: Record<string, string> = { am: "'m", is: "'s", are: "'re", have: "'ve", has: "'s", will: "'ll", had: "'d", would: "'d" };
const MID_ADVERBS = new Set(['already', 'just', 'never', 'ever', 'always', 'still']);

export function conjugate(o: BuildOptions): { parts: Part[]; text: string } {
  const per = o.subject.person;
  const passive = !!o.passive;
  const c = chain(o.tense, per, o.verb, passive);
  const subjLower = o.subject.en === 'I' ? 'I' : o.subject.en.charAt(0).toLowerCase() + o.subject.en.slice(1);
  const time = (o.time ?? '').trim();
  const midAdverb = time && MID_ADVERBS.has(time.toLowerCase()) && (c.aux.length > 0 || o.tense === 'presentSimple') ? time : '';
  const parts: Part[] = [];
  const S = (t: string) => parts.push({ text: t, role: 'subject' });
  const A = (t: string, join = false) => parts.push({ text: t, role: 'aux', join });
  const V = (t: string) => parts.push({ text: t, role: 'verb' });
  const N = (t: string, join = false) => parts.push({ text: t, role: 'neg', join });
  const T = (t: string) => parts.push({ text: t, role: 'time' });

  if (o.polarity === 'q') {
    if (c.aux.length) {
      if (o.tense === 'usedTo' && !passive) {
        A('did');
        S(subjLower);
        A('use');
        A('to');
        V(c.main);
      } else {
        A(c.aux[0]!);
        S(subjLower);
        if (midAdverb) T(midAdverb);
        c.aux.slice(1).forEach((a) => A(a));
        V(c.main);
      }
    } else if (c.doAux) {
      A(c.doAux);
      S(subjLower);
      if (midAdverb) T(midAdverb);
      V(o.verb.en);
    } else {
      // be as main verb: "Is she happy?"
      V(c.main);
      S(subjLower);
    }
  } else {
    S(o.subject.en);
    const neg = o.polarity === 'neg';
    let rest: string[] = c.aux;
    let main = c.main;
    if (neg && !c.aux.length && c.doAux) {
      rest = [c.doAux];
      main = o.verb.en;
    }
    if (neg && o.tense === 'usedTo' && !passive) {
      rest = ['did', 'use', 'to'];
    }
    const first = rest[0];
    if (first) {
      const contractSubj = o.contractions && o.subject.pronoun && SUBJ_CONTR[first] && !(neg && first !== 'am' && NEG[first]) && !(first === 'had' && !rest[1] && o.tense !== 'pastPerfect');
      if (contractSubj) A(SUBJ_CONTR[first]!, true);
      else if (neg && o.contractions && NEG[first]) {
        A(NEG[first]!.slice(0, -3));
        N("n't", true);
      } else A(first);
      if (neg && !(o.contractions && NEG[first] && !contractSubj)) N('not');
      if (midAdverb && !neg) T(midAdverb);
      rest.slice(1).forEach((a) => A(a));
      V(main);
    } else {
      // no auxiliary: simple tense affirmative or be as main verb
      if (o.verb.en === 'be' && !passive && (o.tense === 'presentSimple' || o.tense === 'pastSimple')) {
        const contractSubj = o.contractions && o.subject.pronoun && SUBJ_CONTR[main] && !neg;
        if (contractSubj) parts.push({ text: SUBJ_CONTR[main]!, role: 'verb', join: true });
        else if (neg && o.contractions && NEG[main]) {
          V(NEG[main]!.slice(0, -3));
          N("n't", true);
        } else V(main);
        if (neg && !(o.contractions && NEG[main])) N('not');
      } else {
        if (midAdverb) T(midAdverb);
        V(main);
      }
    }
  }
  // fix "wo" + "n't" → won't
  for (let i = 0; i < parts.length - 1; i++) {
    if (parts[i]!.text === 'wil' && parts[i + 1]!.text === "n't") parts[i]!.text = 'wo';
  }
  if (time && !midAdverb) T(time);
  parts.push({ text: o.polarity === 'q' ? '?' : '.', role: 'other', join: true });
  // capitalise the first word
  const f = parts[0]!;
  f.text = f.text.charAt(0).toUpperCase() + f.text.slice(1);
  const text = parts.map((p, i) => (i && !p.join ? ' ' : '') + p.text).join('');
  return { parts, text };
}
