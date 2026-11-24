/**
 * Perfiles de las anclas (función comunicativa, dominio, tiempo) y detectores del lenguaje meta.
 * La tabla GRAMMAR_PROFILES se audita contra TODOS los puntos reales de level-*.json
 * con scripts/validate-thread.mjs (cobertura específica vs. genérica).
 */
import type { GrammarPoint, Unit, VocabItem } from '../../content/types';
import type { Anchor, AnchorProfile, Dom, Fn, Target, Time } from './types';

// ------------------------------------------------------------ detectores ----

const A = `['’]`;
const PAST_IRR = 'was|were|did|had|went|came|saw|made|took|got|gave|found|told|said|knew|thought|left|met|ate|drank|bought|brought|felt|lost|won|ran|sat|stood|wrote|read|heard|kept|began|paid|sent|spoke|understood|built|fell|flew|drove|woke|slept|swam|taught|caught|held|sold|became|forgot|wore|broke';
const PAST = new RegExp(`\\b(\\w+ed|${PAST_IRR})\\b`, 'gi');
const PERFECT = new RegExp(`\\b(have|has|haven${A}t|hasn${A}t)\\b|${A}ve\\b`, 'gi');
const RELATIVE = /\b(who|which|that|whose|whom|where|when)\b/gi;
const COND = new RegExp(`\\b(if|unless|provided|as long as|supposing|otherwise|would|wouldn${A}t|could|might|had|were|should)\\b|${A}d\\b`, 'gi');
const TIME = /\b(when|while|after|before|once|as soon as|until|by the time|the moment|as|since|during|then|first|next|finally|later)\b/gi;

export interface ProfileRule {
  id: string;
  re: RegExp;
  fn: Fn[];
  time: Time;
  doms?: Dom[];
  /** Detector del lenguaje meta en un texto (global). */
  match: RegExp;
  /** Detector poco fiable: no alcanzar los hits solo avisa. */
  weak?: boolean;
}

const r = (id: string, re: RegExp, fn: Fn[], time: Time, match: RegExp, extra: Partial<ProfileRule> = {}): ProfileRule => ({ id, re, fn, time, match, ...extra });
const g = (s: string) => new RegExp(s, 'gi');

/** Orden = prioridad (el primero que encaja gana): lo específico antes que lo general. */
export const GRAMMAR_PROFILES: ProfileRule[] = [
  r('superlative-compound', /superlative compound/, ['describe', 'evaluate', 'opinion'], 'any', g('\\b(the\\s+)?(most|best|worst|least|\\w+est)[- ]\\w+'), { weak: true }),
  r('modifier-order', /order of modifiers|adjective order/, ['describe'], 'any', g('\\b(a|an|the|this|that|my|his|her|our|their)\\s+(\\w+\\s+){1,4}\\w+\\b')),
  r('compound-adj', /compound (adjectives|modifiers)/, ['describe', 'evaluate'], 'any', g('\\b\\w+-\\w+\\b')),
  r('comparative-nuance', /double comparatives|comparative structures with nuance/, ['compare', 'argue', 'evaluate'], 'any', g('\\b(the more|the less|the \\w+er|\\w+er and \\w+er|more and more|every bit as|nowhere near|not nearly|far|much|slightly|as \\w+ as)\\b')),
  r('superlative', /superlative|comparatives and/, ['compare', 'evaluate', 'opinion'], 'any', g('\\b(\\w+er|more|less|the \\w+est|the most|the least|as \\w+ as|than)\\b')),
  r('comparison', /compar(ative|ison)s?\b/, ['compare', 'evaluate', 'opinion'], 'any', g('\\b(\\w+er|more|less|fewer|as \\w+ as|as much|as many|than|the same|different|similar|better|worse)\\b')),
  r('demonstrative', /demonstrative/, ['describe', 'compare', 'request'], 'present', g('\\b(this|that|these|those)\\b'), { doms: ['shopping'] }),
  r('to-be-possessive', /to be.* \+ possessive|possessive adjectives/, ['describe', 'request'], 'present', g('\\b(am|is|are|my|your|his|her|our|their|I’m|you’re|he’s|she’s)\\b'), { doms: ['family', 'school'] }),
  r('questions-to-be', /questions with .?to be/, ['request', 'describe'], 'present', g('\\b(am|is|are|what|who|where|how|which)\\b')),
  r('present-simple-wh', /present simple wh|wh-questions with do/, ['routine', 'request'], 'present', g('\\b(do|does|don’t|doesn’t)\\b')),
  r('time-expressions', /time expressions/, ['routine', 'plan'], 'any', g('\\b(at|on|in|every|before|after|until|from|during|always|morning|evening|weekend)\\b')),
  r('object-pronouns', /object pronouns/, ['request', 'describe'], 'present', g('\\b(me|you|him|her|us|them|it)\\b')),
  r('tell-say', /messages with .?tell|reported speech|reporting clauses|reporting passives|tell.? and .?say/, ['report', 'narrate', 'request'], 'past', g(`\\b(said|told|asked|says|tells|explained|replied|claimed|suggested|admitted|denied|promised|warned|mentioned|added|announced|reported|believed|is said|was said|thought|known)\\b`), { doms: ['media'] }),
  r('would-requests', /yes\/no questions with .?would|requests with .?would|would you mind|requests with modals|indirect requests|polite offers|^requests/, ['request', 'permit'], 'present', g(`\\b(would|could|can|may|would you mind)\\b`)),
  r('describing-problems', /describing problems|need \+|keep \+/, ['describe', 'request'], 'present', g('\\b(broken|damaged|stuck|blocked|cracked|missing|worn|torn|lost|needs?\\s+\\w+ing|needs? to be \\w+|keeps?\\s+\\w+ing|\\w+ed)\\b')),
  r('present-participle-mod', /modifiers with present participles|participles as adjectives/, ['describe'], 'any', g('\\b\\w+(ing|ed)\\b')),
  r('passive-modal', /passive modals/, ['advise', 'opinion', 'instruct'], 'present', g(`\\b(should|must|can|could|ought to|has to|have to|need to|might|may|will)\\s+(not\\s+)?be\\s+\\w+`)),
  r('passive', /passive|causative|get or have something done/, ['report', 'describe', 'instruct'], 'any', g(`\\b(am|is|are|was|were|be|been|being|get|gets|got|have|has|had)\\s+(not\\s+|also\\s+|always\\s+|often\\s+|already\\s+|just\\s+|still\\s+|never\\s+|been\\s+|being\\s+|my\\s+|your\\s+|the\\s+|a\\s+)?\\w+(ed|en|wn|ne|lt|nt|id|ut|ld|ght|ught|de|nd)\\b|\\bby\\b`)),
  r('inversion-conditionals', /inversion in conditionals|inverted conditionals/, ['hypothesize', 'argue', 'persuade'], 'any', COND),
  r('unreal-conditional', /unreal conditional|present unreal|second conditional|mixed and implied|mixed conditionals|alternatives to if|adverb clauses of condition/, ['hypothesize', 'evaluate', 'advise'], 'any', COND),
  r('first-conditional', /first conditional/, ['predict', 'advise', 'instruct'], 'future', g(`\\b(if|unless|will|won${A}t|${A}ll)\\b`)),
  r('wish', /wish|regret/, ['hypothesize', 'evaluate'], 'any', g(`\\b(wish|if only|should(n${A}t)? have|would rather|as if|as though|high time|if\\b.*\\bhad)\\b`)),
  r('goals-perfect', /future perfect|goals with|advanced future forms/, ['plan', 'predict'], 'future', g(`\\b(will have|would like to have|hope to have|by the time|by (next|the end)|${A}ll have)\\b`)),
  r('future-in-past', /future forms in the past/, ['narrate', 'plan'], 'past', g('\\b(was|were) (to|about to|going to)\\b|\\bwould\\b')),
  r('past-distancing', /distancing|politeness/, ['request', 'persuade', 'opinion'], 'past', g(`\\b(I was wondering|I wondered|I thought|I hoped|would|could|did you want|I wanted)\\b`), { weak: true }),
  r('perfect-continuous', /perfect continuous|perfect and continuous|aspect and nuance/, ['experience', 'report', 'evaluate'], 'past', g(`\\b(have|has|had|${A}ve|${A}d)\\s+(been\\s+)?\\w+(ing|ed|en)\\b|\\b(am|is|are|was|were)\\s+\\w+ing\\b`)),
  r('past-perfect', /past perfect/, ['narrate', 'report'], 'past', g(`\\b(had|hadn${A}t)\\b|${A}d\\s+\\w+(ed|en)\\b`)),
  r('time-past-refs', /referring to time in the past|time contrast|comparing tenses/, ['narrate', 'compare', 'report'], 'any', g('\\b(during|ago|since|for|from|until|last|yesterday|in \\d{4}|now|then|used to|was|were|have|has|will|going to)\\b')),
  r('present-perfect', /present perfect|accomplishments with the simple past|simple past vs present perfect|past simple vs present perfect/, ['experience', 'report', 'evaluate'], 'past', PERFECT, { doms: ['travel'] }),
  r('past-modal-cert', /past modals for degrees|modals for degrees of certainty about the past|past modals of speculation|speculation and deduction|modals of speculation/, ['evaluate', 'hypothesize', 'predict'], 'any', g(`\\b(must|might|may|could|can${A}t|couldn${A}t|will|would)\\s+(not\\s+)?(have|be)\\b|${A}ve\\b|\\b(must|might|may|could|can${A}t)\\b`)),
  r('past-obligation', /past modals of obligation/, ['oblige', 'evaluate'], 'past', g(`\\b(should|shouldn${A}t|ought to|had to|didn${A}t have to|needn${A}t|must|mustn${A}t|supposed to)\\b`)),
  r('past-modal-judge', /past modals|needn.t have|should have|would have|past modals for judgments/, ['evaluate', 'advise', 'hypothesize'], 'past', g(`\\b(should|shouldn${A}t|ought to|could|couldn${A}t|would|wouldn${A}t|might|must|may|needn${A}t|didn${A}t need to)\\s+(not\\s+)?have\\b|${A}d have\\b|\\b(should|would|could|might|must)${A}ve\\b`)),
  r('certainty', /degrees of certainty/, ['predict', 'evaluate', 'opinion'], 'present', g(`\\b(might|may|could|must|can${A}t|cannot|will|probably|definitely|certainly|perhaps|maybe|possibly|likely|bound to|surely)\\b`)),
  r('permission', /permission, obligation|prohibition/, ['permit', 'oblige'], 'present', g(`\\b(can|can${A}t|cannot|may|must|mustn${A}t|have to|has to|don${A}t have to|allowed|not allowed|permitted|forbidden|supposed to)\\b`), { doms: ['law', 'school'] }),
  r('expectations', /expectations|custom|supposed to/, ['oblige', 'permit', 'describe'], 'present', g(`\\b(supposed to|expected to|it${A}s the custom|acceptable|customary|considered|polite|rude|normal|traditional)\\b`), { doms: ['culture'] }),
  r('necessity', /modals for necessity|modals for obligation|obligation/, ['oblige', 'advise', 'instruct'], 'present', g(`\\b(must|have to|has to|need to|should|shouldn${A}t|ought to|had better|don${A}t have to|mustn${A}t|needn${A}t|can|could)\\b`)),
  r('imperatives', /imperative/, ['instruct', 'advise'], 'present', g(`\\b(please|don${A}t|always|never|make sure|be careful|try to|remember to|first|then|let${A}s|take|put|turn|go|open|close)\\b`)),
  r('advice', /recommendation|advice|suggestion|should|modals? .?can.? and .?should/, ['advise', 'opinion', 'request'], 'present', g(`\\b(should|shouldn${A}t|can|could|ought to|had better|must|need to|let${A}s|why don${A}t|how about|shall|recommend|suggest|try)\\b`), { doms: ['health'] }),
  r('agree', /agreeing and disagreeing/, ['opinion', 'argue'], 'present', g(`\\b(so|too|neither|either|I agree|I disagree|me too|me neither)\\b`)),
  r('two-part-verbs', /two-part verbs|phrasal verbs|prepositional and phrasal/, ['request', 'instruct', 'describe'], 'present', g('\\b\\w+\\s+(up|down|out|off|on|in|over|away|back|through|around|along|into|apart|ahead|about|after|with|for)\\b|\\b(will|’ll)\\b')),
  r('used-to', /used to|past habits|will & would for habits|will and would for assumption|will and would/, ['narrate', 'describe', 'routine'], 'past', g(`\\b(used to|would|will|${A}ll|${A}d)\\b`)),
  r('future', /future|will|going to|predict/, ['plan', 'predict'], 'future', g(`\\b(will|won${A}t|${A}ll|going to|shall|be to|about to|due to|on the verge of|will have)\\b`)),
  r('present-continuous', /present continuous/, ['describe', 'plan'], 'present', g(`\\b(am|is|are|${A}m|${A}s|${A}re)\\s+(not\\s+)?\\w+ing\\b`)),
  r('agreement', /subject-verb agreement/, ['describe', 'report'], 'present', g('\\b(is|are|was|were|has|have)\\b'), { weak: true }),
  r('articles', /articles/, ['describe'], 'any', g('\\b(a|an|the)\\b'), { weak: true }),
  r('quantifiers', /quantifiers|expressions of quantity|how much/, ['describe', 'report', 'request'], 'present', g('\\b(a lot of|lots of|many|much|few|little|all|some|any|no one|nearly all|not many|enough|plenty|how many|how much)\\b'), { doms: ['shopping', 'food'] }),
  r('frequency', /adverbs of frequency/, ['routine', 'describe'], 'present', g('\\b(always|usually|often|sometimes|never|rarely|seldom|normally|hardly ever|every)\\b')),
  r('how-questions', /questions with .?how|wh-questions about|questions about/, ['request', 'describe'], 'present', g('\\b(how|what|who|which|where)\\b')),
  r('there-is', /there is|there are/, ['describe'], 'present', g(`\\bthere (is|are|was|were|isn${A}t|aren${A}t)\\b`), { doms: ['home', 'city'] }),
  r('past-continuous', /past continuous/, ['narrate', 'describe'], 'past', g('\\b(was|were)\\s+(not\\s+)?\\w+ing\\b|\\bwhile\\b|\\bwhen\\b')),
  r('past-simple', /past simple|simple past|past tenses/, ['narrate', 'report'], 'past', PAST),
  r('sequence', /sequence adverbs|time clauses|time contrast|adverbial clauses of time|relative clauses of time|reduced time clauses/, ['narrate', 'instruct', 'plan'], 'any', TIME),
  r('participle-reduced', /participle and reduced|reduced relative|-ing clauses/, ['describe', 'report'], 'any', g('\\b\\w+(ing|ed|en)\\b')),
  r('noun-clauses', /noun clauses|indirect questions|whenever|wherever/, ['report', 'opinion', 'request'], 'present', g(`\\b(that|what|whether|if|how|why|where|who|when|whoever|whatever|whenever|wherever|could you tell me|do you know|I wonder)\\b`)),
  r('relative', /relative|it-clauses|noun phrases containing|sentence-modifying|optional & required/, ['describe', 'compare', 'report'], 'any', RELATIVE),
  r('because', /because|giving reasons|reason and condition|clauses of reason/, ['argue', 'report', 'opinion'], 'any', g('\\b(because|so|since|that’s why|therefore|as|due to|because of|the reason|for)\\b')),
  r('contrast', /contrast|concession|connecting contrasting|exception/, ['argue', 'compare', 'opinion'], 'any', g('\\b(although|though|even though|while|whereas|but|however|despite|in spite of|nevertheless|yet|on the other hand|unlike|except|apart from|albeit|notwithstanding|much as)\\b')),
  r('preference', /would rather|prefer|short responses/, ['opinion', 'request'], 'present', g(`\\b(would rather|would prefer|${A}d rather|${A}d prefer|prefer|like|love|hate|enjoy|so do I|neither do I|me too)\\b`)),
  r('it-adjective', /it.s \+ adjective|gerunds as subjects/, ['opinion', 'evaluate'], 'present', g(`\\bit(${A}s| is| was)\\b|\\b\\w+ing\\b`)),
  r('infinitive-gerund', /gerunds?\b|gerund phrases|infinitive|verb patterns|verbs \+ infinitives|verbs followed by|by \+ gerund|purpose|to describe how/, ['describe', 'opinion', 'instruct'], 'any', g('\\b\\w+ing\\b|\\bto \\w+\\b|\\bfor \\w+ing\\b')),
  r('adverbs-adjectives', /adverbs before adjectives|intensifiers|downtoners/, ['describe', 'opinion', 'evaluate'], 'present', g('\\b(very|really|quite|extremely|so|too|pretty|totally|absolutely|fairly|utterly|completely|highly|deeply|rather|somewhat|slightly|a bit|incredibly|entirely|barely)\\b')),
  r('tag-questions', /tag questions|negative questions/, ['opinion', 'request'], 'present', g(`,\\s*(isn${A}t|aren${A}t|wasn${A}t|weren${A}t|don${A}t|doesn${A}t|didn${A}t|can${A}t|won${A}t|wouldn${A}t|shouldn${A}t|haven${A}t|hasn${A}t|hadn${A}t|couldn${A}t|am|is|are|was|were|do|does|did|can|will|would|should|have|has)\\s+\\w+\\s*\\?|\\b\\w+n${A}t\\s+\\w+\\s*\\?`)),
  r('such-that', /such.*that|so.*that/, ['describe', 'evaluate', 'argue'], 'any', g('\\b(such|so)\\b.*\\bthat\\b|\\b(such|so)\\b')),
  r('as-if', /as if|as though/, ['describe', 'compare'], 'any', g('\\b(as if|as though|the way|like)\\b')),
  r('sentence-adverbs', /sentence adverbs/, ['opinion', 'evaluate'], 'any', g('\\b(fortunately|unfortunately|obviously|clearly|apparently|surprisingly|frankly|honestly|admittedly|sadly|luckily|interestingly|presumably|evidently|undoubtedly|personally|ideally|hopefully|naturally|\\w+ly)\\b')),
  r('object-placement', /direct & indirect objects|placement of/, ['instruct', 'describe'], 'any', g('\\b(give|gave|send|sent|show|showed|tell|told|offer|bring|brought|lend|pass|buy|bought|make|write|wrote|teach|hand|sell|sold)\\w*\\b')),
  r('subjunctive', /subjunctive|formulaic/, ['persuade', 'advise', 'argue'], 'present', g(`\\b(suggest|recommend|insist|demand|propose|require|request|important|essential|vital|necessary|if only|were|be)\\b`)),
  r('nominalisation', /nominalisation|complex noun phrases/, ['describe', 'argue', 'report'], 'any', g('\\b\\w+(tion|ment|ness|ity|ance|ence|sion|ism)s?\\b'), { weak: true }),
  r('hedging', /hedging|impersonal/, ['opinion', 'evaluate', 'report'], 'present', g(`\\b(it (would|could|might) (seem|appear)|it (seems|appears)|tends? to|to some extent|arguably|apparently|somewhat|relatively|perhaps|may|might|suggests?|appears? to|seems? to|is likely|is thought|it is (often|widely|generally))\\b`)),
  r('stative-dynamic', /stative verbs/, ['describe', 'opinion'], 'present', g('\\b(am|is|are|was|were)\\s+(being|having|seeing|thinking|feeling|looking)\\b|\\b\\w+ing\\b'), { weak: true }),
  r('ellipsis', /ellipsis|substitution/, ['describe', 'instruct'], 'any', g('\\b(so|not|do so|one|ones|did|does|do|too|neither)\\b'), { weak: true }),
  r('discourse', /discourse markers|cohesive/, ['argue', 'persuade', 'report'], 'any', g('\\b(however|moreover|furthermore|therefore|thus|consequently|nevertheless|in addition|in contrast|by contrast|on the other hand|as a result|in conclusion|firstly|secondly|finally|meanwhile|besides|hence|that said|even so)\\b')),
  r('proverbs', /proverbs|fixed expressions|register/, ['describe', 'opinion', 'persuade'], 'any', g('\\b(proverb|saying|as they say|better|rule of thumb|at the end of the day|when all is said|in the long run|goes without saying|needless to say|the last straw|every cloud|a blessing in disguise|break the ice)\\b'), { weak: true }),
  r('inversion', /inversion|fronting|cleft|emphasis/, ['persuade', 'argue', 'evaluate'], 'any', g(`\\b(never|rarely|seldom|hardly|scarcely|barely|no sooner|not only|under no circumstances|little|only (when|after|if|then|by)|at no time|nowhere|what|it was|it is|it${A}s|the (thing|reason|place|person)|so \\w+ (was|did|is)|such (was|is))\\b`)),
];

/** Perfil genérico (confianza baja): se avisa en la UI. */
export const GENERIC_RULE = { fn: ['describe'] as Fn[], time: 'any' as Time };

// ---------------------------------------------------------------- dominios --

/** Palabras (inglés y español) -> dominios; se aplica a términos, tema/título de la unidad y texto libre. */
export const KEYWORD_DOMAINS: [RegExp, Dom[]][] = [
  [/\b(trip|travel|journey|airport|flight|hotel|holiday|tour|passport|luggage|abroad|visit|tourist|ticket|train|bus|viaje|vacacion|aeropuerto|turis|excursi|paseo)/i, ['travel']],
  [/\b(school|class|study|teacher|student|homework|exam|university|college|lesson|learn|colegio|escuela|clase|examen|profesor|alumno|estudi)/i, ['school']],
  [/\b(job|work|office|career|business|boss|colleague|interview|employ|company|salary|meeting|entrepreneur|negotiat|ambition|achievement|trabajo|empleo|oficina|empresa|negocio)/i, ['work']],
  [/\b(food|eat|restaurant|cook|kitchen|meal|drink|breakfast|dinner|cafe|recipe|menu|comida|restaurante|cocina|cena|receta)/i, ['food']],
  [/\b(health|doctor|ill\b|sick|body|hospital|medicine|sleep|wellbeing|exercise|stress|mind|risk|salud|m[eé]dico|hospital|enferm|dormir)/i, ['health']],
  [/\b(home|house|room|furniture|flat|apartment|neighbo|garden|move|casa|hogar|vecin|habitaci|mudanza)/i, ['home']],
  [/\b(technolog|computer|phone|app\b|internet|online|digital|robot|science|ai\b|software|device|social media|tecnolog|m[oó]vil|ordenador|ciencia)/i, ['tech']],
  [/\b(shop|buy|sell|store|market|price|clothes|fashion|consumer|advertis|marketing|compras|tienda|mercado|ropa|vender|comprar)/i, ['shopping']],
  [/\b(sport|game|match|team|football|race|fitness|win|deporte|f[uú]tbol|partido|juego|equipo|carrera)/i, ['sport']],
  [/\b(news|media|film|movie|tv\b|television|music|book|story|journal|rumour|gossip|review|blog|video|post|noticia|pel[ií]cula|m[uú]sica|televis|libro|historia|chisme|cuento)/i, ['media']],
  [/\b(environment|climate|nature|animal|pollution|recycl|planet|weather|sustainab|conservation|river|energy|forest|ambiente|clima|naturaleza|animales|r[ií]o|bosque|contamina|planeta)/i, ['environment']],
  [/\b(city|town|neighbo|street|building|transport|place|urban|village|geography|ciudad|barrio|calle|pueblo|lugar)/i, ['city']],
  [/\b(family|friend|parent|brother|sister|child|relationship|people|birthday|wedding|personality|familia|amig|cumplea|boda|pareja|hijo|padre|madre)/i, ['family']],
  [/\b(culture|tradition|festival|custom|art\b|belief|superstition|language|history|heritage|identity|religion|cultura|tradici|fiesta|arte|idioma|creencia|identidad)/i, ['culture']],
  [/\b(money|cost|bank|pay|budget|save|economy|income|expensive|cheap|dinero|banco|precio|ahorr|econom|gastar)/i, ['money']],
  [/\b(law|rule|court|police|crime|justice|permission|forbid|politic|society|rights|ethic|protest|security|ley|juicio|polic[ií]a|derechos|justicia|norma|regla)/i, ['law']],
];

export function domainsOf(...texts: string[]): Dom[] {
  const t = texts.join(' ');
  const out: Dom[] = [];
  for (const [re, d] of KEYWORD_DOMAINS) if (re.test(t)) for (const x of d) if (!out.includes(x)) out.push(x);
  return out;
}

// ------------------------------------------------------------------ helpers --

/** Normaliza un nombre de punto para comparar con las reglas. */
export const normName = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"');

export function ruleFor(name: string): ProfileRule | null {
  const n = normName(name);
  return GRAMMAR_PROFILES.find((p) => p.re.test(n)) ?? null;
}

export const clean = (s: string) => s.replace(/^to\s+/i, '').replace(/\s*\/.*$/, '').trim();
/** Frase modelo limpia: sin marcas de formato ni traducción tras la raya. */
export const plain = (x: string) => x.replace(/[*_`]/g, '').replace(/\s+—\s+.*$/, '').trim();

export function weightOf(gp: GrammarPoint | undefined, level: number): number {
  return Math.round((1 + (gp?.deep ? 0.4 : 0) + (gp?.chart ? 0.2 : 0) + level * 0.05) * 100) / 100;
}

const LEVEL_IDX: Record<string, number> = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4, C2: 5 };

export function profileOfGrammar(gp: GrammarPoint, u: Unit, level: string): AnchorProfile {
  const rule = ruleFor(gp.name);
  const doms = [...(rule?.doms ?? []), ...domainsOf(u.theme, u.title, gp.name)];
  const uniq = [...new Set(doms)].slice(0, 4);
  return {
    fns: rule ? rule.fn : GENERIC_RULE.fn,
    doms: uniq,
    time: rule ? rule.time : GENERIC_RULE.time,
    weight: weightOf(gp, LEVEL_IDX[level] ?? 0),
    confidence: rule ? 'high' : 'low',
  };
}

const VOCAB_FNS: Fn[] = ['describe', 'opinion', 'narrate'];

export function profileOfVocab(terms: string[], u: Unit): AnchorProfile {
  const doms = domainsOf(terms.join(' '), u.theme, u.title);
  return { fns: VOCAB_FNS, doms: doms.slice(0, 3), time: 'any', weight: 0.8, confidence: doms.length ? 'high' : 'low' };
}

export function profileOfFree(text: string): AnchorProfile {
  const doms = domainsOf(text);
  const fns: Fn[] = ['describe', 'opinion'];
  if (/\b(yesterday|last|ago|history|past|ayer|pasado|historia|recuerd)/i.test(text)) fns.push('narrate');
  if (/\b(next|plan|going to|will|tomorrow|future|voy a|van a|pr[oó]xim|ma[nñ]ana|futuro|plan)/i.test(text)) fns.push('plan');
  if (/\b(compare|better|best|worst|than|compar|mejor|peor)/i.test(text)) fns.push('compare');
  if (/\b(problem|debate|argu|discuss|opinion|opini|problema)/i.test(text)) fns.push('argue');
  return { fns: [...new Set(fns)], doms, time: 'any', weight: 1, confidence: doms.length ? 'high' : 'low' };
}

/** Un matcher a partir de palabras (vocabulario): tallo simple + sufijos habituales. */
export function termMatcher(terms: string[]): RegExp | null {
  const parts = terms
    .map((t) => clean(t).toLowerCase().replace(/[^a-z' -]/g, ' ').trim())
    .filter((t) => t.length > 1)
    .map((t) =>
      t
        .split(/\s+/)
        .map((w, i, a) => (i === a.length - 1 && w.length > 4 ? w.replace(/(ing|ed|es|e|s|y)$/, '') + '\\w*' : w))
        .join('\\s+'),
    );
  if (!parts.length) return null;
  return new RegExp(`\\b(?:${parts.join('|')})`, 'gi');
}

export function buildTarget(a: Anchor, units: Unit[]): Target {
  const unit = a.type === 'free' ? undefined : units.find((u) => u.n === a.unit);
  const base = { anchorId: a.id, fix: [], drill: [], drillPrompt: '', dialogue: [], form: [], rule: '', watch: '', examples: [] as string[], profile: a.profile, unit };
  if (a.type === 'grammar') {
    const gp = unit?.grammar[a.point];
    const rule = ruleFor(a.name);
    const ex = [...(gp?.examples ?? []), ...(gp?.more ?? [])].map(plain).filter(Boolean);
    const vocabEx = (unit?.vocab ?? []).flatMap((v) => v.examples ?? []).map(plain);
    return {
      ...base,
      label: a.name,
      kind: 'grammar',
      matcher: rule ? rule.match : null,
      weak: rule ? !!rule.weak : true,
      terms: (unit?.vocab ?? []).slice(0, 8).map((v) => clean(v.term)),
      examples: ex.length ? ex : vocabEx.slice(0, 4),
      form: gp?.form ?? [],
      rule: gp?.rule ?? gp?.short ?? '',
      watch: gp?.watch ?? '',
      fix: gp?.fix ?? [],
      drill: gp?.drill?.items ?? [],
      drillPrompt: gp?.drill?.prompt ?? '',
      dialogue: gp?.dialogue ?? [],
      point: gp,
    };
  }
  if (a.type === 'vocab') {
    const items = (unit?.vocab ?? []).filter((v) => a.terms.some((t) => clean(v.term) === clean(t)));
    const list: VocabItem[] = items.length ? items : (unit?.vocab ?? []).slice(0, 4);
    return {
      ...base,
      label: a.terms.map(clean).join(', '),
      kind: 'vocab',
      matcher: termMatcher(list.map((v) => v.term)),
      weak: false,
      terms: list.map((v) => clean(v.term)),
      examples: list.flatMap((v) => v.examples ?? []).map(plain),
      rule: list.map((v) => `${clean(v.term)}: ${v.def}`).join(' · '),
      watch: list[0]?.use ?? '',
    };
  }
  // free: vocabulario de las unidades del nivel que mejor encajan con el texto
  const words = a.text.toLowerCase().split(/[^a-záéíóúñ]+/).filter((w) => w.length > 3);
  const scored = units
    .map((u) => {
      const hay = `${u.theme} ${u.title} ${u.vocab.map((v) => v.term + ' ' + v.def).join(' ')}`.toLowerCase();
      const dom = domainsOf(a.text).filter((d) => domainsOf(u.theme, u.title).includes(d)).length * 2;
      return { u, s: words.filter((w) => hay.includes(w)).length + dom };
    })
    .sort((x, y) => y.s - x.s || x.u.n - y.u.n);
  const best = scored[0]?.u ?? units[0];
  const vocab = (best?.vocab ?? []).slice(0, 6);
  return {
    ...base,
    label: a.text,
    kind: 'free',
    matcher: termMatcher(vocab.map((v) => v.term)),
    weak: false,
    terms: vocab.map((v) => clean(v.term)),
    examples: vocab.flatMap((v) => v.examples ?? []).map(plain),
    rule: a.text,
    unit: best,
  };
}

/** Cuántas veces aparece el lenguaje meta en un texto (marcas **, detector o frases modelo literales). */
export function countHits(text: string, t: Target, withBold = false): number {
  const plainText = text.replace(/\*\*/g, '');
  const re = t.matcher ? new RegExp(t.matcher.source, t.matcher.flags.includes('g') ? t.matcher.flags : t.matcher.flags + 'g') : null;
  const viaRe = re ? (plainText.match(re) ?? []).length : 0;
  const lower = plainText.toLowerCase();
  const viaEx = t.examples.filter((e) => e.length > 8 && lower.includes(e.toLowerCase().replace(/[.!?]+$/, ''))).length;
  const viaBold = withBold ? (text.match(/\*\*[^*]+\*\*/g) ?? []).length : 0;
  return Math.max(viaRe, viaEx, viaBold);
}
