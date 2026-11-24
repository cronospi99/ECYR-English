/**
 * Catálogo de contextos puente (BRIDGES) y plantillas de transición.
 * Un contexto puente es una situación social reconocible donde cada ancla tiene una razón comunicativa real.
 */
import type { CefrLevel } from '../../content/types';
import type { Dom, Fn } from './types';

export interface BridgeDef {
  id: string;
  levels: CefrLevel[];
  title: string;
  setting: string;
  doms: Dom[];
  /** Funciones que la situación "pide" de forma natural. */
  fns: Fn[];
  roles: string[];
  conflict: string;
}

/** Código de una letra por función (para escribir el catálogo en poco espacio). */
const FN_CODE: Record<string, Fn> = {
  n: 'narrate', d: 'describe', c: 'compare', a: 'advise', o: 'oblige', m: 'permit', p: 'plan', r: 'predict', h: 'hypothesize',
  t: 'report', q: 'request', i: 'opinion', g: 'argue', s: 'instruct', x: 'experience', u: 'routine', e: 'evaluate', z: 'persuade',
};
const fns = (s: string): Fn[] => [...new Set(s.split('').map((c) => FN_CODE[c]!))];
const lv = (s: string) => s.split(' ') as CefrLevel[];
const doms = (s: string) => s.split(' ') as Dom[];

type Row = [id: string, levels: string, title: string, setting: string, doms: string, fns: string, roles: string, conflict: string];

const ROWS: Row[] = [
  // ---- A1–A2
  ['school-trip', 'A1 A2 B1', 'School trip planning', 'a school trip to the coast', 'travel school', 'ndcaompqrtixue', 'Maya the organiser|Mr Ortega the teacher|a classmate', 'The class has to choose where to go and what to take before Friday.'],
  ['birthday-party', 'A1 A2', 'A surprise birthday party', 'a surprise birthday party for a friend', 'family food home', 'ndcapqmsiuxet', 'the organiser|the best friend|the birthday girl’s brother', 'Everything must be ready before the birthday boy arrives.'],
  ['school-market', 'A1 A2', 'The school market', 'a stall at the school market', 'shopping money school', 'dcapqmosiuetn', 'the seller|a customer|the treasurer', 'The stall has to sell everything by the end of the morning.'],
  ['after-school-club', 'A1 A2', 'A new after-school club', 'a new after-school club', 'school sport', 'ndmopqrisuxe', 'the club leader|a new member|the teacher', 'Only six students have joined and the club needs more members.'],
  ['family-restaurant', 'A1 A2', 'A family restaurant', 'a small family restaurant', 'food work', 'dcqamsiuxeotn', 'the waiter|the cook|a customer', 'It is Saturday night and the restaurant is full.'],
  ['new-neighbours', 'A1 A2', 'New neighbours', 'a new apartment building', 'home city family', 'ndqapomisuxet', 'the new neighbour|the caretaker|an old neighbour', 'A family moves in today and nobody knows where anything is.'],
  ['lake-hotel', 'A1 A2', 'A weekend at a hotel', 'a small hotel by the lake', 'travel', 'ndcqapmrisxeot', 'the guest|the receptionist|a tour guide', 'The weather is bad and the guests need new plans.'],
  ['pet-show', 'A1 A2', 'The class pet show', 'a pet show at school', 'school family', 'ndcpqirseuxtm', 'the presenter|the judge|a pet owner', 'Every pet wants the prize and the judge must decide.'],
  // ---- A1
  ['dream-classroom', 'A1', 'Our dream classroom', 'our dream classroom', 'school home', 'dqpicmeosua', 'the designer|the teacher|a classmate', 'The class has an empty room and must decide what to put in it.'],
  ['class-photo-book', 'A1', 'Our class photo book', 'the class photo book', 'school family media', 'ndiuxtqpcse', 'the editor|the photographer|a classmate', 'The book must be finished for the last day of school.'],
  ['lost-and-found', 'A1', 'The lost bag', 'the school lost-and-found desk', 'school city', 'ndqitmaoxs', 'the student|the secretary|a friend', 'A blue bag is missing and its owner is worried.'],
  ['sports-day', 'A1', 'Sports day', 'sports day at school', 'sport school', 'ndcpqrmoasiueg', 'the captain|the referee|a player', 'Two teams, one cup and a lot of rules to remember.'],
  // ---- A2
  ['cooking-show', 'A2', 'A cooking show', 'a TV cooking show', 'food media', 'nsdcaqixeprtu', 'the host|the chef|a guest', 'The chef forgot the main ingredient minutes before the live show.'],
  ['holiday-blog', 'A2', 'A photo blog of the holiday', 'a holiday photo blog', 'travel media', 'ndxtcpiuerqa', 'the blogger|a reader|a travel friend', 'The blogger must choose the best photos and tell the story of the trip.'],
  ['busy-airport', 'A2', 'A day at the airport', 'a busy airport', 'travel', 'ndqmosprtaxi', 'the traveller|the airline agent|a security officer', 'A flight is delayed and the passengers need information.'],
  ['cafe-first-job', 'A2', 'A first job at a cafe', 'a cafe near the school', 'work food money', 'ndqmosauxeipct', 'the new worker|the manager|a regular customer', 'It is the first day at work and the cafe has a long queue.'],
  // ---- A2–B1
  ['neighbourhood-fair', 'A2 B1', 'A neighbourhood fair', 'a neighbourhood fair in the park', 'city culture shopping', 'ndcapqmosrtixueg', 'the organiser|a volunteer|a stall owner', 'The fair opens tomorrow and the park is not ready.'],
  ['school-podcast', 'A2 B1', 'A school podcast', 'a school podcast studio', 'media school tech', 'ntdcaqxipzesrg', 'the host|the guest|the sound technician', 'The first episode has to be recorded today and the guest is late.'],
  ['exchange-student', 'A2 B1', 'A student exchange', 'a student exchange in a new city', 'school travel culture', 'ndcaomqpirstxue', 'the exchange student|the host mother|a new classmate', 'The new student must learn the rules of a different house and school.'],
  // ---- B1–B2
  ['volunteer-camp', 'B1 B2', 'First week at a volunteer camp', 'a volunteer camp in the mountains', 'work environment', 'ndcaomqpxrtisueg', 'the new volunteer|the camp leader|the cook', 'The volunteers arrive on Monday and the camp is not ready.'],
  ['music-festival', 'B1 B2', 'A small music festival', 'a small music festival', 'culture media money', 'ndcapomqrtisxegzh', 'the organiser|the sound engineer|a band manager', 'Rain is forecast and the headline band may not come.'],
  ['school-app', 'B1 B2', 'Launching a school app', 'a team launching a school app', 'tech school work', 'ndcaosqprhtixegze', 'the developer|the designer|a teacher', 'The app launches on Friday and testers found a serious bug.'],
  ['cleanup-campaign', 'B1 B2', 'A neighbourhood clean-up campaign', 'a neighbourhood clean-up campaign', 'environment city', 'ndcaomqprhtixegzs', 'the campaign leader|a resident|a city worker', 'The residents disagree about how to clean the river park.'],
  ['family-business', 'B1 B2 C1', 'A small family business', 'a small family bakery', 'work money food', 'ndcaoqprhtixegzseu', 'the owner|the daughter|a supplier', 'A big supermarket opened next door and sales are falling.'],
  // ---- B1
  ['summer-job-abroad', 'B1', 'A summer job abroad', 'a summer job at a seaside resort', 'work travel money', 'ndcaomqpxrtiuesz', 'the new employee|the manager|a guest', 'The first season abroad is harder than the new employee expected.'],
  ['student-film', 'B1', 'A student film set', 'the set of a student film', 'media school', 'ndcapmoqrtixesg', 'the director|the actor|the camera operator', 'The film must be shot in two days and the weather keeps changing.'],
  ['city-hostel', 'B1', 'A hostel in a new city', 'a hostel in a big city', 'travel city', 'ndcaomqprtixuse', 'the backpacker|the receptionist|a roommate', 'The backpacker lost a passport and has one day to solve it.'],
  ['sports-league', 'B1', 'A community sports league', 'a community football league', 'sport city', 'ndcaompqrtixesg', 'the coach|the referee|the club president', 'A small club must win its last match to stay in the league.'],
  // ---- B2
  ['museum-reopening', 'B2', 'A museum’s reopening after a robbery (fictional)', 'a fictional museum reopening after a robbery', 'culture law media', 'ndcaohqrtixegzs', 'the director|the security chief|a journalist', 'The museum reopens next week and the public wants answers.'],
  ['startup-pitch', 'B2', 'A start-up pitch night', 'a start-up pitch night', 'work tech money', 'dcaprhtixegzsen', 'the founder|an investor|a mentor', 'The founder has five minutes to convince a sceptical investor.'],
  ['documentary', 'B2', 'Making a documentary', 'a small documentary crew', 'media culture', 'ndcatrhxiegzse', 'the director|the interviewee|the editor', 'The crew has hours of footage and a story that keeps changing.'],
  ['difficult-flatshare', 'B2', 'A difficult flatshare', 'a shared flat with four tenants', 'home money family', 'ndcaomqphtixegu', 'the tenant|the landlord|a flatmate', 'The rent is going up and the tenants disagree about the rules.'],
  // ---- B2–C1
  ['student-conference', 'B2 C1', 'A student conference', 'an international student conference', 'school culture tech', 'dcarhtixegzseonp', 'the speaker|the chair|a delegate', 'The programme changed and the keynote speaker cancelled.'],
  ['newsroom', 'B2 C1', 'A newsroom under pressure', 'a regional newsroom', 'media law', 'ntdcrhxiegzseoa', 'the editor|the reporter|a source', 'A story must be published in one hour and one fact is still unchecked.'],
  ['product-launch', 'B2 C1', 'A product launch gone wrong', 'the launch of a new product', 'tech work shopping', 'dcaoprhtixegzsen', 'the product manager|a customer|the press officer', 'The product fails live and the company must react.'],
  // ---- C1–C2
  ['council-hearing', 'C1 C2', 'A city council hearing on a river clean-up', 'a city council hearing on a river clean-up', 'environment law city', 'dcaoprhtxiegzseun', 'the councillor|an engineer|a local resident', 'The council must vote on who pays to clean the river.'],
  ['expert-panel', 'C1 C2', 'An expert panel', 'a panel of experts at a public event', 'culture media tech', 'dcarhtiegzsexn', 'the moderator|the economist|a sceptical member of the audience', 'The panel disagrees about what the evidence really shows.'],
  ['company-audit', 'C1 C2', 'A company audit', 'a company audit', 'work money law', 'dcaoprhtiegzsenx', 'the auditor|the finance director|a whistleblower', 'The audit finds figures that do not add up.'],
  ['academic-symposium', 'C1 C2', 'An academic symposium', 'an academic symposium', 'school culture', 'dcarhtiegzsexnpa', 'the presenter|the respondent|the chair', 'A well-known theory is challenged by new data.'],
  ['moot-court', 'C1 C2', 'A fictional court case', 'a fictional moot court', 'law', 'dcaohrtiegzsexnm', 'the prosecutor|the defence lawyer|the judge', 'Both sides have strong arguments and the verdict is open.'],
  // ---- C1
  ['exhibition-curation', 'C1', 'Curating an exhibition', 'the preparation of a gallery exhibition', 'culture media', 'dcarhtiegzsexpn', 'the curator|the artist|a critic', 'The gallery must cut half of the works and choose the story.'],
  ['ngo-report', 'C1', 'An NGO annual report', 'an NGO writing its annual report', 'work environment law', 'dcaoprhtiegzsexn', 'the project director|a donor|a field worker', 'The results are mixed and the donors expect good news.'],
  ['contract-negotiation', 'C1', 'A contract negotiation', 'a contract negotiation between two companies', 'work money law', 'dcaomprhtiegzsne', 'the lead negotiator|the client|the legal adviser', 'Each side wants more than the other is ready to give.'],
  // ---- C2
  ['ethics-panel', 'C2', 'An ethics panel on AI in schools (fictional)', 'a fictional ethics panel on AI in schools', 'tech school law', 'dcaohrtiegzsexpnm', 'the chair|a teacher|a data-protection expert', 'The panel must decide whether students may use AI in exams.'],
  ['literary-jury', 'C2', 'A literary prize jury', 'the jury of a literary prize', 'culture media', 'dcrhtiegzsexna', 'the jury chair|a novelist|a critic', 'The jury is split between two very different books.'],
  ['heritage-dispute', 'C2', 'A heritage-site dispute', 'a dispute over a historic building', 'culture city law', 'dcaohrtiegzsexnp', 'the architect|a historian|a developer', 'A developer wants to turn a historic building into flats.'],
  ['think-tank', 'C2', 'A think-tank briefing', 'a think-tank briefing for policy makers', 'work law money', 'dcaprhtiegzsexn', 'the analyst|a minister’s adviser|a journalist', 'The briefing must be clear about uncertain predictions.'],
  ['climate-summit', 'C2', 'A fictional climate summit', 'a fictional climate summit', 'environment law money', 'dcaoprhtiegzsexnm', 'the delegate|the negotiator|an activist', 'Nobody wants to be the first to accept the cost.'],
];

export const BRIDGES: BridgeDef[] = ROWS.map(([id, levels, title, setting, d, f, roles, conflict]) => ({
  id,
  levels: lv(levels),
  title,
  setting,
  doms: doms(d),
  fns: fns(f),
  roles: roles.split('|'),
  conflict,
}));

export const bridgesFor = (level: CefrLevel) => BRIDGES.filter((b) => b.levels.includes(level));

// ------------------------------------------------------------ explicaciones --

/** Qué hace cada función comunicativa dentro de la situación (español, para el docente). */
export const FN_ES: Record<Fn, string> = {
  narrate: 'cuentan qué pasó', describe: 'describen cómo es todo', compare: 'comparan opciones', advise: 'se dan consejos', oblige: 'dicen qué es obligatorio',
  permit: 'piden y dan permiso', plan: 'hacen planes', predict: 'dicen qué va a pasar', hypothesize: 'imaginan otra situación', report: 'cuentan lo que dijeron otros',
  request: 'piden cosas con cortesía', opinion: 'dan su opinión', argue: 'defienden una postura', instruct: 'explican cómo se hace', experience: 'cuentan lo que ya han hecho',
  routine: 'hablan de lo que pasa cada día', evaluate: 'valoran lo que pasó', persuade: 'convencen a alguien',
};

/** Lo que alguien necesita hacer en la situación (inglés, completa "needs to ..."). */
export const FN_NEED: Record<Fn, string> = {
  narrate: 'tell what happened', describe: 'describe what everything is like', compare: 'choose between two options', advise: 'give some advice', oblige: 'explain what people must do',
  permit: 'ask for permission', plan: 'make a plan', predict: 'say what will happen', hypothesize: 'imagine what could be different', report: 'pass on what other people said',
  request: 'ask politely for help', opinion: 'give an opinion', argue: 'defend a point of view', instruct: 'explain how to do it', experience: 'say what has already been done',
  routine: 'explain what happens every day', evaluate: 'judge how it went', persuade: 'convince somebody',
};

/** Lo que ya se hizo (inglés, pasado, para "We {prevTask}."). */
export const FN_DONE: Record<Fn, string> = {
  narrate: 'told what happened', describe: 'described how things are', compare: 'compared the options', advise: 'gave some advice', oblige: 'listed the rules',
  permit: 'asked for permission', plan: 'made a plan', predict: 'said what will happen', hypothesize: 'imagined something different', report: 'passed on what others said',
  request: 'asked for help', opinion: 'gave our opinions', argue: 'defended our ideas', instruct: 'explained how to do it', experience: 'said what we have done',
  routine: 'talked about every day', evaluate: 'judged how it went', persuade: 'tried to convince people',
};

export interface TransitionTemplate {
  teacher_es: string;
  student_en: string;
}

/** Plantillas por par de funciones "prev>next". Cada una contiene {setting} o {role}. */
export const TRANSITIONS: Record<string, TransitionTemplate> = {
  'narrate>compare': { teacher_es: 'Ya contaron qué pasó en {setting}. Ahora {role} debe elegir entre dos opciones: ¿en qué se diferencian?', student_en: 'We told the story. Now, back in {setting}, {role} has to choose between two options: how are they different?' },
  'experience>oblige': { teacher_es: 'Ya dijeron lo que han hecho en {setting}. Antes de que lleguen los demás, ¿qué deben hacer y qué no?', student_en: 'So you have done some things in {setting} already. But what must the new people do, and what do they not have to do?' },
  'oblige>hypothesize': { teacher_es: 'Con las reglas de {setting} claras, {role} se pregunta: ¿y si todo fuera distinto?', student_en: 'Those are the rules in {setting}. But {role} wonders: what would happen if things were different?' },
  'describe>narrate': { teacher_es: 'Ya describieron {setting}. Ahora {role} cuenta qué pasó allí.', student_en: 'You know what {setting} is like. Now {role} tells us what happened there.' },
  'routine>narrate': { teacher_es: 'Después de hablar de lo habitual en {setting}, {role} cuenta algo que pasó un día distinto.', student_en: 'That is a normal day in {setting}. But one day was different, and {role} tells the story.' },
  'narrate>plan': { teacher_es: 'Ya contaron lo que pasó en {setting}. Ahora {role} necesita un plan para lo que viene.', student_en: 'That is what happened. Now, in {setting}, {role} needs a plan for what comes next.' },
  'compare>advise': { teacher_es: 'Comparadas las opciones de {setting}, {role} pide un consejo.', student_en: 'We compared the options in {setting}. Now {role} needs some advice: what should we do?' },
  'describe>advise': { teacher_es: 'Con {setting} ya descrito, {role} necesita consejos.', student_en: 'Now you know {setting}. {role} asks for advice: what should be done?' },
  'plan>hypothesize': { teacher_es: 'El plan de {setting} está hecho, pero {role} duda: ¿y si algo sale mal?', student_en: 'The plan for {setting} is ready. But {role} is worried: what if something goes wrong?' },
  'report>argue': { teacher_es: 'Ya contaron lo que dijo cada uno en {setting}. Ahora {role} defiende su postura.', student_en: 'You heard what everyone said in {setting}. Now {role} wants to defend a point of view.' },
  'experience>predict': { teacher_es: 'Ya contaron lo que han hecho en {setting}. ¿Qué creen que pasará después?', student_en: 'That is what has been done in {setting}. What do you think will happen next, {role}?' },
  'describe>compare': { teacher_es: 'Ya describieron lo que hay en {setting}. Ahora {role} quiere comparar.', student_en: 'We described {setting}. Now {role} wants to compare two things: which is better?' },
};

/** Cuando no hay plantilla para el par. */
export const GENERIC_TRANSITION: TransitionTemplate = {
  teacher_es: 'Seguimos en {setting}: ahora {role} necesita {need_es}.',
  student_en: 'Now, in {setting}, {role} needs to {nextNeed}.',
};

/** Frase del docente para volver del libro a la producción. */
export const BOOK_TO_PRODUCTION: TransitionTemplate = {
  teacher_es: 'Cierren el libro: de vuelta en {setting}, {role} tiene una tarea real para usar lo practicado.',
  student_en: 'Books closed. Back in {setting}, {role} needs to {nextNeed}.',
};

/** De la presentación al libro. */
export const PRESENT_TO_BOOK: TransitionTemplate = {
  teacher_es: 'Ya vimos cómo se usa en {setting}. Abran el libro: practiquen con {role} en mente.',
  student_en: 'Let us practise it before {role} needs it in {setting}.',
};

export const NEED_ES: Record<Fn, string> = {
  narrate: 'contar lo que pasó', describe: 'describir cómo es todo', compare: 'elegir entre dos opciones', advise: 'dar un consejo', oblige: 'explicar lo obligatorio',
  permit: 'pedir permiso', plan: 'hacer un plan', predict: 'decir qué va a pasar', hypothesize: 'imaginar algo distinto', report: 'contar lo que dijeron otros',
  request: 'pedir ayuda con cortesía', opinion: 'dar su opinión', argue: 'defender una postura', instruct: 'explicar cómo se hace', experience: 'decir lo que ya se hizo',
  routine: 'explicar lo que pasa cada día', evaluate: 'valorar cómo fue', persuade: 'convencer a alguien',
};
