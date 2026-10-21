// Tense Timeline parser checks. Run from the repo root:
//   npx jiti src/features/grammar/tenses/parser.check.mjs
// (jiti runs the TypeScript sources directly; no build step.)
import { readFileSync } from 'node:fs';
import { buildLexicon, parseSentence } from './parser.ts';
import { conjugate } from './conjugate.ts';
import { buildTimeline } from './timeline.ts';
import { BUILD_ORDER, EXAMPLES, MISTAKE_EXAMPLES, SUBJECTS, TENSES } from './data.ts';

const root = new URL('../../../content/generated/', import.meta.url);
const bank = JSON.parse(readFileSync(new URL('verb-lab.json', root), 'utf8'));
const extra = JSON.parse(readFileSync(new URL('verb-lab-extra.json', root), 'utf8'));
const lex = buildLexicon([...bank.verbs, ...extra.verbs]);

let pass = 0;
let fail = 0;
const failures = [];
const kinds = (r) => r.clauses.filter((c) => c.note !== 'noverb').map((c) => c.kind);
function check(sentence, expect, opts = {}) {
  const r = parseSentence(sentence, lex);
  const got = kinds(r);
  const want = Array.isArray(expect) ? expect : [expect];
  let ok = want.length === got.length && want.every((k, i) => k === got[i]);
  if (opts.warn !== undefined) {
    const hit = r.warnings.some((w) => (opts.warn instanceof RegExp ? opts.warn.test(w.msg) || opts.warn.test(w.fixed ?? '') : true));
    if (!hit) ok = false;
    if (opts.fixed && !r.warnings.some((w) => w.fixed === opts.fixed)) ok = false;
  } else if (!opts.allowWarn && r.warnings.length) ok = false;
  if (opts.polarity && r.clauses[0]?.polarity !== opts.polarity) ok = false;
  if (opts.passive !== undefined && r.clauses[0]?.passive !== opts.passive) ok = false;
  if (opts.future !== undefined && !r.clauses.some((c) => c.futureRef === opts.future)) ok = false;
  if (opts.times && !opts.times.every((t) => r.times.some((x) => x.text.toLowerCase() === t))) ok = false;
  try {
    buildTimeline(r);
  } catch (e) {
    ok = false;
    failures.push(`timeline crash: ${sentence}: ${e.message}`);
  }
  if (ok) pass++;
  else {
    fail++;
    failures.push(`✗ ${sentence}\n    want ${want.join(' + ')}${opts.warn ? ' (with warning)' : ''} · got ${got.join(' + ') || '—'} · pol ${r.clauses.map((c) => c.polarity)} · passive ${r.clauses.map((c) => c.passive)}\n    warnings: ${r.warnings.map((w) => w.msg + (w.fixed ? ` → ${w.fixed}` : '')).join(' | ') || '—'}\n    times: ${r.times.map((t) => `${t.text}:${t.kind}`).join(', ')}`);
  }
}

// ---- example bank (data.ts) ------------------------------------------------
for (const e of EXAMPLES) check(e.text, e.tense, { allowWarn: false });

// ---- every tense, negatives, questions, contractions -------------------------
check('He plays tennis on Sundays.', 'presentSimple', { times: ['on sundays'] });
check('My parents live in Cali.', 'presentSimple');
check('The sun rises in the east.', 'presentSimple');
check('Water boils at 100 degrees.', 'presentSimple');
check('She doesn’t eat meat.', 'presentSimple', { polarity: 'neg' });
check('Where do you live?', 'presentSimple', { polarity: 'q' });
check('I’m a teacher.', 'presentSimple');
check('They aren’t at home.', 'presentSimple', { polarity: 'neg' });
check('She is very happy today.', 'presentSimple');
check('The train leaves at 6 tomorrow.', 'presentSimple', { future: true });
check('She’s working from home this week.', 'presentContinuous');
check('What are you doing?', 'presentContinuous', { polarity: 'q' });
check('I am not sleeping.', 'presentContinuous', { polarity: 'neg' });
check('We’re meeting Ana tomorrow.', 'presentContinuous', { future: true });
check('I’m going to school now.', 'presentContinuous');
check('He went to the beach yesterday.', 'pastSimple', { times: ['yesterday'] });
check('I was tired last night.', 'pastSimple');
check('Were they at the party?', 'pastSimple', { polarity: 'q' });
check('Who called you?', 'pastSimple');
check('I read that book last year.', 'pastSimple');
check('She put the keys on the table.', 'pastSimple');
check('He had a big breakfast.', 'pastSimple');
check('We had to leave early.', 'pastSimple');
check('While I was walking home, it started to rain.', ['pastContinuous', 'pastSimple']);
check('I was having a shower when the phone rang.', ['pastContinuous', 'pastSimple']);
check('She’s just finished her homework.', 'presentPerfect', { times: ['just'] });
check('Has he ever eaten sushi?', 'presentPerfect', { polarity: 'q' });
check('I haven’t seen her since Monday.', 'presentPerfect', { polarity: 'neg', times: ['since monday'] });
check('They’ve known each other for ten years.', 'presentPerfect', { times: ['for ten years'] });
check('I have never been to Europe.', 'presentPerfect');
check('I’ve got two brothers.', 'presentSimple');
check('She has been studying since 8 am.', 'presentPerfectContinuous');
check('We’ve been living here since 2019.', 'presentPerfectContinuous', { times: ['since 2019'] });
check('When I arrived, she had left.', ['pastSimple', 'pastPerfect']);
check('By the time we got there, the concert had finished.', ['pastSimple', 'pastPerfect']);
check('After I had finished my homework, I watched TV.', ['pastPerfect', 'pastSimple']);
check('They had been arguing before I came in.', ['pastPerfectContinuous', 'pastSimple']);
check('I will call you later.', 'futureSimple');
check('I’ll call you when I arrive.', ['futureSimple', 'presentSimple'], { future: true });
check('It won’t be easy.', 'futureSimple', { polarity: 'neg' });
check('Shall we dance?', 'futureSimple', { polarity: 'q' });
check('This time next week I’ll be lying on the beach.', 'futureContinuous');
check('By the time you arrive, I will have cooked dinner.', ['presentSimple', 'futurePerfect']);
check('She won’t have finished by 6 pm.', 'futurePerfect', { polarity: 'neg' });
check('In May, we will have been married for twenty years.', 'futurePerfectContinuous', { allowWarn: true });
check('They will have been travelling for a month by then.', 'futurePerfectContinuous');
check('She is going to have a baby.', 'goingTo');
check('I was going to call you, but I forgot.', ['goingTo', 'pastSimple']);
check('We are gonna win!', 'goingTo');
check('There used to be a cinema here.', 'usedTo');
check('My grandfather used to smoke.', 'usedTo');
check('When I was young, I would walk to school every day.', 'wouldHabit');
check('You should study more.', 'modal');
check('Could you help me?', 'modal', { polarity: 'q' });
check('I would like a coffee.', 'modal');
check('Close the door, please.', 'imperative');

// ---- passives -----------------------------------------------------------------
check('The house was built in 1990.', 'pastSimple', { passive: true });
check('English is spoken all over the world.', 'presentSimple', { passive: true });
check('The road is being repaired.', 'presentContinuous', { passive: true });
check('The letters have been sent.', 'presentPerfect', { passive: true });
check('The results will be announced tomorrow.', 'futureSimple', { passive: true });
check('The bridge had been closed before the storm.', 'pastPerfect', { passive: true });
check('I am interested in art.', 'presentSimple', { passive: false });
check('The window is broken.', 'presentSimple', { passive: false });

// ---- common mistakes ----------------------------------------------------------
check('I have saw that movie.', 'presentPerfect', { warn: /seen/, fixed: 'I have seen that movie.' });
check('She did went to the party.', 'pastSimple', { warn: /go/, fixed: 'She did go to the party.' });
check('Did you saw him?', 'pastSimple', { warn: /see/, fixed: 'Did you see him?' });
check('I didn’t went to school.', 'pastSimple', { warn: /go/ });
check('I live here since three years.', 'presentSimple', { warn: /for/ });
check('I have lived here since three years.', 'presentPerfect', { warn: /for/, fixed: 'I have lived here for three years.' });
check('I am agree with you.', 'presentSimple', { warn: /agree/, fixed: 'I agree with you.' });
check('I’m agree.', 'presentSimple', { warn: /agree/, fixed: 'I agree.' });
check('He don’t like coffee.', 'presentSimple', { warn: /does/, fixed: 'He doesn’t like coffee.'.replace('’', "'") });
check('She work in a bank.', 'presentSimple', { warn: /works/, fixed: 'She works in a bank.' });
check('They was happy.', 'pastSimple', { warn: /were/, fixed: 'They were happy.' });
check('I have seen him yesterday.', 'presentPerfect', { warn: /pasado simple/, fixed: 'I saw him yesterday.' });
check('I use to wake up early.', 'usedTo', { warn: /usually/, fixed: 'I usually wake up early.' });
check('I didn’t used to like it.', 'usedTo', { warn: /use to/ });
check('He has went home.', 'presentPerfect', { warn: /gone/, fixed: 'He has gone home.' });
check('She had ate before we arrived.', ['pastPerfect', 'pastSimple'], { warn: /eaten/ });
check('I will goes to the party.', 'futureSimple', { warn: /go/, fixed: 'I will go to the party.' });
check('You must to study.', 'modal', { warn: /to/, fixed: 'You must study.' });
check('Does she works here?', 'presentSimple', { warn: /work/, fixed: 'Does she work here?' });
check('I seen it.', 'pastSimple', { warn: /saw/, fixed: 'I saw it.' });
check('I am living here since 2019.', 'presentContinuous', { warn: /since/, fixed: "I have been living here since 2019." });
check('I know her since 2015.', 'presentSimple', { warn: /since/, fixed: 'I have known her since 2015.' });
check('I have 20 years.', 'presentSimple', { warn: /BE/, fixed: 'I am 20 years old.' });
check('If it will rain, we will stay home.', ['futureSimple', 'futureSimple'], { warn: /presente/ });
check('Where you live?', 'presentSimple', { warn: /auxiliar/, fixed: 'Where do you live?' });
check('I have finished yet.', 'presentPerfect', { warn: /already/ });
check('She going to travel.', 'goingTo', { warn: /be/ });
check('I am go to the park.', 'presentSimple', { warn: /going/, fixed: 'I am going to the park.' });
check('I went there tomorrow.', 'pastSimple', { warn: /futuro/ });
check('I studied English for 2019.', 'pastSimple', { warn: /since/ });

for (const m of MISTAKE_EXAMPLES) {
  const r = parseSentence(m, lex);
  if (r.warnings.length) pass++;
  else {
    fail++;
    failures.push(`✗ mistake example without warning: ${m}`);
  }
}

// ---- round trip: Build mode → parser ------------------------------------------
const VERBS = ['go', 'eat', 'see', 'write', 'study', 'stop', 'play', 'be', 'have', 'do', 'make', 'take', 'run', 'watch', 'try', 'read', 'put', 'cut', 'begin', 'lie', 'visit', 'travel', 'finish', 'swim', 'buy'];
let rtPass = 0;
let rtFail = 0;
for (const en of VERBS) {
  const verb = lex.base.get(en);
  if (!verb) {
    failures.push(`missing verb ${en}`);
    continue;
  }
  for (const tense of BUILD_ORDER) {
    for (const subject of SUBJECTS) {
      for (const polarity of ['pos', 'neg', 'q']) {
        for (const contractions of [false, true]) {
          for (const passive of [false, true]) {
            if (passive && (!TENSES[tense].passive || en === 'be' || en === 'have' && tense === 'presentSimple')) continue;
            const { text } = conjugate({ subject, verb, tense, polarity, passive, contractions });
            const r = parseSentence(text, lex);
            const c = r.clauses[0];
            const ok = r.clauses.length === 1 && c.kind === tense && c.polarity === polarity && (en === 'be' || c.passive === passive) && r.warnings.length === 0;
            if (ok) rtPass++;
            else {
              rtFail++;
              if (rtFail <= 40) failures.push(`✗ round trip [${tense} ${polarity}${passive ? ' passive' : ''}${contractions ? ' contr' : ''}] "${text}" → ${kinds(r).join('+')} pol ${c?.polarity} passive ${c?.passive} warn ${r.warnings.map((w) => w.msg).join(' | ')}`);
            }
          }
        }
      }
    }
  }
}

console.log(failures.join('\n'));
console.log(`\nSentences: ${pass} passed, ${fail} failed (of ${pass + fail}).`);
console.log(`Round trip (Build → parser): ${rtPass} passed, ${rtFail} failed.`);
process.exit(fail || rtFail ? 1 : 0);
