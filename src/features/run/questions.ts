/* English Run — the questions on the word gates (one answer per lane) and in the revive card.
   Built from small lists per level so there are hundreds of different questions, with the classic
   mistakes as distractors (goed, childs, gooder…). */

export type RunLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
export const RUN_LEVELS: { id: RunLevel; label: string }[] = [
  { id: 'A1', label: 'A1' }, { id: 'A2', label: 'A2' }, { id: 'B1', label: 'B1' }, { id: 'B2', label: 'B2' }, { id: 'C1', label: 'C1–C2' },
];

export interface RunQ { q: string; a: string; w: [string, string]; kind: string }

const pairs = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean).map((x) => x.split(':').map((y) => y.trim()) as [string, string]);
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
function others(list: [string, string][], not: string, n = 2, side: 0 | 1 = 1) {
  const pool = [...new Set(list.map((p) => p[side]).filter((v) => v.toLowerCase() !== not.toLowerCase()))];
  const out: string[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

/* ------------------------------------------------------------------ data */
const ES_EN_A1 = pairs(`perro:dog, gato:cat, casa:house, libro:book, manzana:apple, agua:water, sol:sun, luna:moon, árbol:tree, carro:car,
mesa:table, silla:chair, puerta:door, ventana:window, rojo:red, azul:blue, verde:green, amarillo:yellow, negro:black, blanco:white,
uno:one, dos:two, tres:three, diez:ten, madre:mother, padre:father, hermano:brother, hermana:sister, escuela:school, maestro:teacher,
leche:milk, pan:bread, queso:cheese, huevo:egg, pájaro:bird, pez:fish, caballo:horse, vaca:cow, ojo:eye, mano:hand, pie:foot,
cabeza:head, zapato:shoe, camisa:shirt, sombrero:hat, lunes:Monday, domingo:Sunday, feliz:happy, triste:sad, grande:big, pequeño:small`);
const ES_EN_A2 = pairs(`cocina:kitchen, baño:bathroom, dormitorio:bedroom, nevera:fridge, cuchara:spoon, tenedor:fork, cuchillo:knife,
aeropuerto:airport, estación:station, biblioteca:library, panadería:bakery, farmacia:pharmacy, médico:doctor, enfermera:nurse,
cocinero:cook, granjero:farmer, ayer:yesterday, mañana:tomorrow, siempre:always, nunca:never, a veces:sometimes, temprano:early,
tarde:late, barato:cheap, caro:expensive, lluvia:rain, nieve:snow, viento:wind, nube:cloud, tormenta:storm, verano:summer,
invierno:winter, otoño:autumn, primavera:spring, viajar:travel, comprar:buy, vender:sell, ganar:win, perder:lose, aprender:learn,
enseñar:teach, olvidar:forget, recordar:remember, cansado:tired, hambriento:hungry, sediento:thirsty, aburrido:bored, ocupado:busy`);
const OPP_A1 = pairs(`big:small, hot:cold, happy:sad, tall:short, fast:slow, old:new, good:bad, day:night, up:down, open:closed, yes:no,
black:white, in:out, rich:poor, clean:dirty, full:empty, young:old, early:late, easy:difficult, boy:girl, wet:dry, heavy:light,
long:short, hard:soft, left:right, first:last, push:pull, win:lose, start:finish, loud:quiet`);
const OPP_B = pairs(`generous:mean, ancient:modern, increase:decrease, accept:refuse, arrive:depart, borrow:lend, brave:cowardly,
cheap:expensive, deep:shallow, entrance:exit, failure:success, guilty:innocent, temporary:permanent, polite:rude, private:public,
punishment:reward, rare:common, rough:smooth, rural:urban, strict:lenient, tight:loose, wide:narrow, wild:tame, maximum:minimum,
optimistic:pessimistic, include:exclude, majority:minority, visible:invisible, voluntary:compulsory, ascend:descend`);
const PAST = pairs(`go:went, eat:ate, see:saw, have:had, make:made, take:took, come:came, give:gave, buy:bought, think:thought, run:ran,
swim:swam, drink:drank, write:wrote, read:read, sleep:slept, speak:spoke, drive:drove, fly:flew, sing:sang, sit:sat, stand:stood,
teach:taught, catch:caught, bring:brought, find:found, lose:lost, win:won, begin:began, break:broke, choose:chose, feel:felt,
keep:kept, leave:left, meet:met, pay:paid, say:said, sell:sold, send:sent, tell:told, understand:understood, wear:wore, fall:fell`);
const PARTICIPLE = pairs(`go:gone, eat:eaten, see:seen, take:taken, give:given, write:written, speak:spoken, drive:driven, fly:flown,
swim:swum, drink:drunk, sing:sung, begin:begun, break:broken, choose:chosen, fall:fallen, forget:forgotten, hide:hidden, ride:ridden,
rise:risen, shake:shaken, steal:stolen, throw:thrown, wake:woken, wear:worn, know:known, grow:grown, draw:drawn, bite:bitten, freeze:frozen`);
const PLURAL = pairs(`child:children, man:men, woman:women, foot:feet, tooth:teeth, mouse:mice, person:people, sheep:sheep,
box:boxes, bus:buses, baby:babies, city:cities, knife:knives, leaf:leaves, wife:wives, potato:potatoes, tomato:tomatoes, goose:geese, watch:watches`);
const COMP = pairs(`good:better, bad:worse, big:bigger, small:smaller, hot:hotter, happy:happier, easy:easier, far:farther, fat:fatter,
thin:thinner, funny:funnier, busy:busier, heavy:heavier, early:earlier, cheap:cheaper, young:younger, old:older, long:longer, short:shorter, tall:taller`);
const SUPER = pairs(`good:the best, bad:the worst, big:the biggest, happy:the happiest, hot:the hottest, easy:the easiest, far:the farthest, funny:the funniest`);
const MAKE_DO = pairs(`homework:do, a cake:make, a mistake:make, the dishes:do, exercise:do, a noise:make, friends:make, the shopping:do,
a decision:make, your best:do, a phone call:make, the laundry:do, money:make, a favour:do, an effort:make, business:do, progress:make, research:do`);
const PHRASAL = pairs(`look for:search, give up:stop trying, find out:discover, turn down:refuse, put off:postpone, get on with:have a good relationship,
run out of:have no more, look after:take care of, come across:find by chance, carry on:continue, set up:start (a business), take off:leave the ground,
break down:stop working, bring up:raise (a child), call off:cancel, figure out:understand, look forward to:be excited about, show up:arrive`);
const SYN_B = pairs(`huge:enormous, tiny:minute, smart:clever, angry:furious, scared:frightened, begin:commence, buy:purchase, help:assist,
end:conclude, show:demonstrate, try:attempt, need:require, enough:sufficient, often:frequently, fast:rapid, rich:wealthy, important:significant,
ask:inquire, get:obtain, choose:select`);
const SYN_C = pairs(`meticulous:very careful, ubiquitous:everywhere, ephemeral:short-lived, candid:honest, resilient:quick to recover, frugal:careful with money,
lethargic:lacking energy, obsolete:out of date, ambiguous:unclear, eloquent:fluent and persuasive, diligent:hard-working, tedious:boring,
mundane:ordinary, vivid:very bright, scrutinize:examine closely, alleviate:make less severe, deteriorate:get worse, exacerbate:make worse,
plausible:believable, reluctant:unwilling, scarce:in short supply, thrive:grow well, undermine:weaken, profound:very deep`);
const FORM = pairs(`happy:happiness, kind:kindness, dark:darkness, decide:decision, invent:invention, develop:development, improve:improvement,
able:ability, possible:possibility, free:freedom, child:childhood, friend:friendship, strong:strength, long:length, wide:width, deep:depth,
grow:growth, die:death, succeed:success, believe:belief, choose:choice, proud:pride, analyse:analysis, behave:behaviour, fail:failure`);
const IDIOMS = pairs(`piece of cake:very easy, break the ice:start a conversation, under the weather:a bit ill, cost an arm and a leg:very expensive,
spill the beans:reveal a secret, hit the books:study hard, once in a blue moon:very rarely, on cloud nine:extremely happy,
call it a day:stop working, beat around the bush:avoid the point, the last straw:the final problem, bite the bullet:do something difficult,
cold feet:sudden fear, in hot water:in trouble, see eye to eye:agree, out of the blue:unexpectedly, a blessing in disguise:a hidden benefit,
when pigs fly:never, the ball is in your court:your decision now, let off steam:release anger`);
const BE = [
  ['I ___ a student.', 'am', 'is', 'are'], ['She ___ my sister.', 'is', 'am', 'are'], ['They ___ at school.', 'are', 'is', 'am'],
  ['We ___ hungry.', 'are', 'is', 'am'], ['It ___ cold today.', 'is', 'are', 'am'], ['You ___ my friend.', 'are', 'is', 'am'],
  ['He ___ ten years old.', 'is', 'are', 'am'], ['My dogs ___ black.', 'are', 'is', 'am'],
];
const PREP = [
  ['___ Monday', 'on', 'in', 'at'], ['___ 7 o’clock', 'at', 'on', 'in'], ['___ July', 'in', 'on', 'at'], ['___ the weekend', 'at', 'in', 'of'],
  ['___ 2010', 'in', 'on', 'at'], ['___ night', 'at', 'in', 'on'], ['___ the morning', 'in', 'at', 'on'], ['___ my birthday', 'on', 'in', 'at'],
  ['good ___ English', 'at', 'in', 'on'], ['afraid ___ spiders', 'of', 'from', 'to'], ['interested ___ music', 'in', 'on', 'at'], ['depend ___', 'on', 'of', 'from'],
];
const TENSE_B = [
  ['I ___ here since 2020.', 'have lived', 'live', 'am living'], ['She ___ TV when I called.', 'was watching', 'watched', 'watches'],
  ['If it rains, we ___ at home.', 'will stay', 'stayed', 'would stay'], ['By 9 pm I ___ dinner.', 'had eaten', 'ate', 'have eat'],
  ['He ___ to Paris twice.', 'has been', 'was', 'is going'], ['Look! It ___.', 'is snowing', 'snows', 'snowed'],
  ['If I were you, I ___ it.', 'would buy', 'will buy', 'bought'], ['The cake ___ by my mum.', 'was made', 'made', 'was make'],
];
const TENSE_C = [
  ['Had I known, I ___ earlier.', 'would have left', 'would leave', 'had left'], ['Not only ___ late, he was rude.', 'was he', 'he was', 'he is'],
  ['I wish I ___ more time.', 'had', 'have', 'would have'], ['It’s high time we ___.', 'left', 'leave', 'will leave'],
  ['She is said ___ very rich.', 'to be', 'being', 'be'], ['Hardly ___ arrived when it rained.', 'had we', 'we had', 'did we'],
  ['I’d rather you ___ smoke here.', 'didn’t', 'don’t', 'won’t'], ['No sooner ___ than he left.', 'had he come', 'he had come', 'he came'],
];

/* ----------------------------------------------------------- generators */
type Gen = () => RunQ;
const fromPairs = (list: [string, string][], q: (a: string) => string, kind: string, wrong?: (p: [string, string]) => string[]): Gen => () => {
  const p = pick(list);
  const extra = wrong ? wrong(p).filter((x) => x.toLowerCase() !== p[1].toLowerCase()) : [];
  const w = [...new Set([...extra, ...others(list, p[1], 3)])].filter((x) => x.toLowerCase() !== p[1].toLowerCase()).slice(0, 2) as [string, string];
  return { q: q(p[0]), a: p[1], w, kind };
};
const fromRows = (rows: string[][], kind: string): Gen => () => { const r = pick(rows); return { q: r[0], a: r[1], w: [r[2], r[3]], kind }; };
const reg = (v: string) => (v.endsWith('e') ? v + 'd' : v + 'ed');

const G = {
  esA1: fromPairs(ES_EN_A1, (es) => `“${es}” in English`, 'vocab'),
  esA2: fromPairs(ES_EN_A2, (es) => `“${es}” in English`, 'vocab'),
  oppA: fromPairs(OPP_A1, (w) => `Opposite of ${w.toUpperCase()}`, 'opposite'),
  oppB: fromPairs(OPP_B, (w) => `Opposite of ${w.toUpperCase()}`, 'opposite'),
  past: fromPairs(PAST, (v) => `Past of ${v.toUpperCase()}`, 'past', (p) => [reg(p[0])]),
  part: fromPairs(PARTICIPLE, (v) => `Participle of ${v.toUpperCase()}`, 'participle', (p) => [PAST.find((x) => x[0] === p[0])?.[1] ?? reg(p[0]), reg(p[0])]),
  plural: fromPairs(PLURAL, (n) => `Plural of ${n.toUpperCase()}`, 'plural', (p) => [p[0] + 's', p[0] + 'es']),
  comp: fromPairs(COMP, (a) => `Comparative of ${a.toUpperCase()}`, 'comparative', (p) => ['more ' + p[0], p[0] + 'er']),
  sup: fromPairs(SUPER, (a) => `Superlative of ${a.toUpperCase()}`, 'superlative', (p) => ['the most ' + p[0], 'the ' + p[0] + 'est']),
  makeDo: () => { const p = pick(MAKE_DO); return { q: `___ ${p[0]}`, a: p[1], w: [p[1] === 'do' ? 'make' : 'do', 'take'] as [string, string], kind: 'collocation' }; },
  phrasal: fromPairs(PHRASAL, (v) => `${v.toUpperCase()} means…`, 'phrasal'),
  synB: fromPairs(SYN_B, (w) => `Synonym of ${w.toUpperCase()}`, 'synonym'),
  synC: fromPairs(SYN_C, (w) => `${w.toUpperCase()} means…`, 'meaning'),
  form: fromPairs(FORM, (w) => `Noun of ${w.toUpperCase()}`, 'word formation', (p) => [p[0] + 'ness', p[0] + 'ment', p[0] + 'tion']),
  idiom: fromPairs(IDIOMS, (w) => `“${w}” means…`, 'idiom'),
  be: fromRows(BE, 'grammar'),
  prep: fromRows(PREP, 'preposition'),
  tenseB: fromRows(TENSE_B, 'tenses'),
  tenseC: fromRows(TENSE_C, 'advanced grammar'),
};

const BY_LEVEL: Record<RunLevel, Gen[]> = {
  A1: [G.esA1, G.esA1, G.oppA, G.oppA, G.plural, G.be, G.be],
  A2: [G.esA2, G.past, G.past, G.comp, G.oppA, G.plural, G.prep],
  B1: [G.past, G.part, G.part, G.sup, G.makeDo, G.prep, G.tenseB, G.phrasal],
  B2: [G.part, G.synB, G.oppB, G.form, G.phrasal, G.tenseB, G.makeDo],
  C1: [G.synC, G.synC, G.idiom, G.idiom, G.form, G.oppB, G.tenseC, G.tenseC],
};

/** A question of the level, different from the last ones asked in this run. */
export function makeQuestion(level: RunLevel, recent: Set<string>): RunQ {
  for (let i = 0; i < 12; i++) {
    const q = pick(BY_LEVEL[level])();
    if (q.w.length === 2 && q.w[0] && q.w[1] && q.w[0] !== q.w[1] && !recent.has(q.q)) { recent.add(q.q); return q; }
  }
  return pick(BY_LEVEL[level])();
}
