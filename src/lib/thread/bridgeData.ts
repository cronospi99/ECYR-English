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
  where: string;
  the: string;
  motion: string;
  resolution: string;
  setting_es: string;
  roles_es: string[];
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
  ['school-trip', 'A1 A2 B1', 'School trip planning', 'a school trip to the coast', 'travel school', 'ndcaompqrtixue', 'the organiser|the teacher|a classmate', 'The class has to choose where to go and what to take before Friday.'],
  ['birthday-party', 'A1 A2', 'A surprise birthday party', 'a surprise birthday party for a friend', 'family food home', 'ndcapqmsiuxet', 'the organiser|the best friend|the birthday boy’s sister', 'Everything must be ready before the birthday boy arrives.'],
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
  ['think-tank', 'C2', 'A think-tank briefing', 'a think-tank briefing for policymakers', 'work law money', 'dcaprhtiegzsexn', 'the analyst|a minister’s adviser|a journalist', 'The briefing must be clear about uncertain predictions.'],
  ['climate-summit', 'C2', 'A fictional climate summit', 'a fictional climate summit', 'environment law money', 'dcaoprhtiegzsexnm', 'the delegate|the negotiator|an activist', 'Nobody wants to be the first to accept the cost.'],
];

/** where | the | motion | resolution | setting_es | roles_es (separados por «|» tras el 5.º campo). */
type Extra = [where: string, the: string, motion: string, resolution: string, setting_es: string, roles_es: string];
const EXTRA: Record<string, Extra> = {
  'school-trip': ['on the school trip', 'the school trip', 'The class should go to the coast, not to the mountains.', 'In the end, the class chooses a plan and everyone is happy.', 'el viaje escolar', 'la organizadora|el profesor|un compañero'],
  'birthday-party': ['at the party', 'the party', 'The party should stay a surprise, even if it is difficult.', 'In the end, the surprise works and everyone sings.', 'la fiesta sorpresa', 'la organizadora|el mejor amigo|la hermana del cumpleañero'],
  'school-market': ['at the market stall', 'the stall', 'The stall should lower its prices.', 'In the end, the stall sells everything and the team celebrates.', 'el puesto del mercadillo', 'el vendedor|un cliente|el tesorero'],
  'after-school-club': ['at the club', 'the club', 'The club should meet twice a week.', 'In the end, new members join and the club grows.', 'el club extraescolar', 'la líder del club|un miembro nuevo|el profesor'],
  'family-restaurant': ['at the restaurant', 'the restaurant', 'The restaurant should stop taking new customers tonight.', 'In the end, every customer gets a table and a smile.', 'el restaurante familiar', 'el camarero|la cocinera|un cliente'],
  'new-neighbours': ['in the building', 'the building', 'The neighbours should have a welcome party for the new family.', 'In the end, the neighbours meet and become friends.', 'el edificio', 'el vecino nuevo|el portero|un vecino antiguo'],
  'lake-hotel': ['at the hotel', 'the hotel', 'The guests should stay inside until the rain stops.', 'In the end, the guests find a fun plan for the rainy day.', 'el hotel del lago', 'el huésped|la recepcionista|el guía'],
  'pet-show': ['at the pet show', 'the pet show', 'The judge should give two prizes this year.', 'In the end, every pet gets a prize.', 'el concurso de mascotas', 'la presentadora|el juez|un dueño de mascota'],
  'dream-classroom': ['in the classroom', 'the classroom', 'The new room should have a library, not a games corner.', 'In the end, the class draws the plan and loves it.', 'el aula de ensueño', 'el diseñador|la profesora|un compañero'],
  'class-photo-book': ['in the photo book', 'the photo book', 'The photo book should have only happy photos.', 'In the end, the book is ready and everybody is in it.', 'el álbum de fotos de la clase', 'el editor|la fotógrafa|un compañero'],
  'lost-and-found': ['at the desk', 'the desk', 'The school should keep lost things for one month only.', 'In the end, the bag goes back to its owner.', 'la oficina de objetos perdidos', 'el estudiante|la secretaria|un amigo'],
  'sports-day': ['on sports day', 'sports day', 'Sports day should be on Friday, not on Saturday.', 'In the end, both teams shake hands and share the cup.', 'el día del deporte', 'el capitán|el árbitro|un jugador'],
  'cooking-show': ['on the show', 'the show', 'The chef should cook a different dish.', 'In the end, the chef finds a new idea and the show goes on.', 'el programa de cocina', 'el presentador|el chef|un invitado'],
  'holiday-blog': ['on the blog', 'the blog', 'The blog should show only the best photos.', 'In the end, the blog tells the whole story of the trip.', 'el blog de fotos de vacaciones', 'la bloguera|un lector|un amigo de viaje'],
  'busy-airport': ['at the airport', 'the airport', 'The passengers should wait for the next plane.', 'In the end, the passengers get new tickets and fly home.', 'el aeropuerto', 'el viajero|la agente de la aerolínea|un oficial de seguridad'],
  'cafe-first-job': ['at the cafe', 'the cafe', 'The cafe should hire a second waiter.', 'In the end, the queue gets shorter and the day ends well.', 'la cafetería', 'el nuevo empleado|la encargada|un cliente habitual'],
  'neighbourhood-fair': ['at the fair', 'the fair', 'The fair should open even if the park is not ready.', 'In the end, the fair opens and the park is full.', 'la feria del barrio', 'la organizadora|un voluntario|el dueño de un puesto'],
  'school-podcast': ['in the studio', 'the studio', 'The first episode should be recorded without the guest.', 'In the end, the episode is recorded and sounds great.', 'el estudio del pódcast escolar', 'el presentador|la invitada|el técnico de sonido'],
  'exchange-student': ['in the host family', 'the exchange', 'The exchange student should follow every house rule.', 'In the end, the student feels at home.', 'el intercambio escolar', 'el estudiante de intercambio|la madre anfitriona|un compañero nuevo'],
  'volunteer-camp': ['at the camp', 'the camp', 'The camp should open on Monday, even if it is not ready.', 'In the end, the camp is ready and the volunteers are proud.', 'el campamento de voluntariado', 'la nueva voluntaria|el jefe del campamento|el cocinero'],
  'music-festival': ['at the festival', 'the festival', 'The festival should go ahead in the rain.', 'In the end, the music starts and the crowd cheers.', 'el pequeño festival de música', 'la organizadora|el técnico de sonido|el representante de un grupo'],
  'school-app': ['on the project', 'the project', 'The app should launch on Friday, bug or no bug.', 'In the end, the team fixes the bug and the app launches.', 'la app del colegio', 'la desarrolladora|el diseñador|una profesora'],
  'cleanup-campaign': ['in the campaign', 'the campaign', 'The campaign should start with the river park.', 'In the end, the residents agree and the park is clean.', 'la campaña de limpieza del barrio', 'la líder de la campaña|un vecino|un trabajador municipal'],
  'family-business': ['in the bakery', 'the bakery', 'The bakery should open a second shop.', 'In the end, the bakery finds new customers and keeps its spirit.', 'la panadería familiar', 'la dueña|la hija|un proveedor'],
  'summer-job-abroad': ['at the resort', 'the resort', 'The new employee should ask for easier tasks.', 'In the end, the employee learns the job and enjoys the season.', 'el hotel de playa', 'la nueva empleada|el gerente|un huésped'],
  'student-film': ['on the film set', 'the film set', 'The crew should film the last scene indoors.', 'In the end, the crew finishes the film on time.', 'el rodaje de la película estudiantil', 'la directora|el actor|el camarógrafo'],
  'city-hostel': ['at the hostel', 'the hostel', 'The backpacker should stay one more day in the city.', 'In the end, the passport is found and the trip goes on.', 'el albergue de la ciudad', 'el mochilero|la recepcionista|un compañero de habitación'],
  'sports-league': ['in the league', 'the league', 'The club should play the final match with the young team.', 'In the end, the club wins and stays in the league.', 'la liga deportiva del barrio', 'el entrenador|el árbitro|la presidenta del club'],
  'museum-reopening': ['at the museum', 'the museum', 'The museum should reopen as planned.', 'In the end, the museum reopens with better security.', 'el museo', 'la directora|el jefe de seguridad|una periodista'],
  'startup-pitch': ['at the pitch night', 'the pitch night', 'The investor should give the start-up a second chance.', 'In the end, the investor says yes to a small first step.', 'la noche de presentaciones de start-ups', 'la fundadora|un inversor|una mentora'],
  documentary: ['in the crew', 'the documentary', 'The documentary should show both sides of the story.', 'In the end, the crew finds the story and finishes the film.', 'el documental', 'el director|el entrevistado|la editora'],
  'difficult-flatshare': ['in the flat', 'the flat', 'The tenants should split the rent equally.', 'In the end, the tenants agree on new rules.', 'el piso compartido', 'la inquilina|el casero|un compañero de piso'],
  'student-conference': ['at the conference', 'the conference', 'The conference should go on without the keynote speaker.', 'In the end, the delegates find a new keynote and the programme works.', 'el congreso estudiantil', 'el ponente|la presidenta de mesa|una delegada'],
  newsroom: ['in the newsroom', 'the newsroom', 'The paper should wait to publish the story.', 'In the end, the fact is checked and the story is right.', 'la redacción del periódico', 'la editora|el reportero|una fuente'],
  'product-launch': ['at the launch', 'the launch', 'The company should stop the launch and fix the product.', 'In the end, the company apologises and fixes the product.', 'el lanzamiento del producto', 'el jefe de producto|una clienta|el responsable de prensa'],
  'council-hearing': ['at the hearing', 'the hearing', 'The city should pay for the river clean-up.', 'In the end, the council votes and the clean-up starts.', 'la audiencia del consejo municipal', 'el concejal|una ingeniera|un vecino'],
  'expert-panel': ['on the panel', 'the panel', 'The evidence should be reviewed before any decision.', 'In the end, the panel agrees on what is known and what is not.', 'el panel de expertos', 'la moderadora|el economista|un oyente escéptico'],
  'company-audit': ['during the audit', 'the audit', 'The company should publish the full results.', 'In the end, the audit finds the error and the company acts.', 'la auditoría de la empresa', 'el auditor|la directora financiera|un denunciante'],
  'academic-symposium': ['at the symposium', 'the symposium', 'The theory should be revised in light of the new data.', 'In the end, the symposium agrees to test the theory again.', 'el simposio académico', 'la ponente|el comentarista|la moderadora'],
  'moot-court': ['in court', 'the case', 'The defendant should be found not guilty.', 'In the end, the judge gives a clear verdict.', 'el juicio simulado', 'el fiscal|la abogada defensora|el juez'],
  'exhibition-curation': ['in the gallery', 'the exhibition', 'The gallery should show fewer works, not more.', 'In the end, the curator chooses a clear story for the exhibition.', 'la exposición', 'la comisaria|el artista|un crítico'],
  'ngo-report': ['at the NGO', 'the report', 'The report should admit the mixed results.', 'In the end, the report is honest and the donors trust it.', 'el informe anual de la ONG', 'la directora del proyecto|un donante|un trabajador de campo'],
  'contract-negotiation': ['at the table', 'the negotiation', 'Each side should give up something.', 'In the end, both sides sign a fair contract.', 'la negociación del contrato', 'el negociador principal|la clienta|el asesor jurídico'],
  'ethics-panel': ['on the panel', 'the panel', 'Students should be allowed to use AI in exams.', 'In the end, the panel writes a clear and balanced policy.', 'el panel de ética sobre IA en las escuelas', 'la presidenta|un profesor|una experta en protección de datos'],
  'literary-jury': ['on the jury', 'the jury', 'The prize should go to the more daring book.', 'In the end, the jury agrees on a winner.', 'el jurado del premio literario', 'la presidenta del jurado|un novelista|una crítica'],
  'heritage-dispute': ['at the site', 'the building', 'The old building should be kept as it is.', 'In the end, the parties agree on a plan that protects the building.', 'el edificio histórico', 'la arquitecta|un historiador|un promotor'],
  'think-tank': ['at the briefing', 'the briefing', 'The briefing should state the uncertainty clearly.', 'In the end, the briefing is clear and the ministers listen.', 'la sesión informativa del centro de estudios', 'la analista|un asesor del ministro|una periodista'],
  'climate-summit': ['at the summit', 'the summit', 'Every country should pay its share.', 'In the end, the delegates agree on a first step.', 'la cumbre climática', 'la delegada|el negociador|una activista'],
};

export const BRIDGES: BridgeDef[] = ROWS.map(([id, levels, title, setting, d, f, roles, conflict]) => {
  const x = EXTRA[id];
  if (!x) throw new Error(`BRIDGES: falta EXTRA para ${id}`);
  return {
    id, levels: lv(levels), title, setting, doms: doms(d), fns: fns(f), roles: roles.split('|'), conflict,
    where: x[0], the: x[1], motion: x[2], resolution: x[3], setting_es: x[4], roles_es: x[5].split('|'),
  };
});

export const bridgesFor = (level: CefrLevel) => BRIDGES.filter((b) => b.levels.includes(level));

// ------------------------------------------------------- campos del puente --

interface BridgeLike {
  setting: string;
  roles: string[];
  where?: string;
  the?: string;
  motion?: string;
  resolution?: string;
  setting_es?: string;
  roles_es?: string[];
}
/** "the school trip" (si el puente viene de la IA sin `the`, se deduce del escenario). */
export const theOf = (b: BridgeLike) => b.the ?? b.setting.replace(/^(a|an)\s+/i, 'the ');
export const whereOf = (b: BridgeLike) => b.where ?? `in ${theOf(b)}`;
export const motionOf = (b: BridgeLike) => b.motion ?? 'The group should solve the problem together.';
export const resolutionOf = (b: BridgeLike) => b.resolution ?? 'In the end, the group finds a way to solve the problem.';
export const settingEs = (b: BridgeLike) => b.setting_es ?? 'esta situación';
export const roleEs = (b: BridgeLike, i: number) => b.roles_es?.[i % (b.roles_es?.length || 1)] ?? 'el protagonista';

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

/** Lo que ya se hizo (inglés, pasado). */
export const FN_DONE: Record<Fn, string> = {
  narrate: 'told what happened', describe: 'described how things are', compare: 'compared the options', advise: 'gave some advice', oblige: 'listed the rules',
  permit: 'asked for permission', plan: 'made a plan', predict: 'predicted what would happen', hypothesize: 'imagined something different', report: 'passed on what others said',
  request: 'asked for help', opinion: 'gave our opinions', argue: 'defended our ideas', instruct: 'explained how to do it', experience: 'talked about what we have done',
  routine: 'talked about our daily routine', evaluate: 'judged how it went', persuade: 'tried to convince people',
};

export interface TransitionTemplate {
  teacher_es: string;
  student_en: string;
}

/**
 * Plantillas por par de funciones "prev>next". Huecos: {where} {the} {role} {setting_es} {role_es} {nextNeed} {need_es}.
 * Cada student_en contiene {role}; el texto del docente va en español puro.
 */
export const TRANSITIONS: Record<string, TransitionTemplate> = {
  'narrate>compare': { teacher_es: 'Ya contaron qué pasó en {setting_es}. Ahora {role_es} debe elegir entre dos opciones: ¿en qué se diferencian?', student_en: 'We told the story. Now, {where}, {role} has to choose between two options: how are they different?' },
  'experience>oblige': { teacher_es: 'Ya dijeron lo que se ha hecho en {setting_es}. Antes de que lleguen los demás, ¿qué deben hacer y qué no?', student_en: 'So you have done some things {where} already. But what must the new people do, and what don’t they have to do? {role} needs to know.' },
  'oblige>hypothesize': { teacher_es: 'Con las reglas de {setting_es} claras, {role_es} se pregunta: ¿y si todo fuera distinto?', student_en: 'Those are the rules {where}. But {role} wonders: what would happen if things were different?' },
  'describe>narrate': { teacher_es: 'Ya describieron cómo es {setting_es}. Ahora {role_es} cuenta qué pasó allí.', student_en: 'You know what {the} is like. Now {role} tells us what happened.' },
  'routine>narrate': { teacher_es: 'Después de hablar de lo habitual en {setting_es}, {role_es} cuenta algo que pasó un día distinto.', student_en: 'That is a normal day {where}. But one day was different, and {role} tells the story.' },
  'narrate>plan': { teacher_es: 'Ya contaron lo que pasó en {setting_es}. Ahora {role_es} necesita un plan para lo que viene.', student_en: 'That is what happened. Now, {where}, {role} needs a plan for what comes next.' },
  'compare>advise': { teacher_es: 'Comparadas las opciones de {setting_es}, {role_es} pide un consejo.', student_en: 'We compared the options. Now {role} needs some advice {where}: what should we do?' },
  'describe>advise': { teacher_es: 'Con {setting_es} ya descrito, {role_es} necesita consejos.', student_en: 'Now you know what {the} is like. Next, {role} asks for advice: what should we do?' },
  'plan>hypothesize': { teacher_es: 'El plan de {setting_es} está hecho, pero {role_es} duda: ¿y si algo sale mal?', student_en: 'The plan is ready. But {role} is worried: what if something goes wrong {where}?' },
  'report>argue': { teacher_es: 'Ya contaron lo que dijo cada uno en {setting_es}. Ahora {role_es} defiende su postura.', student_en: 'You heard what everyone said {where}. Now {role} wants to defend a point of view.' },
  'experience>predict': { teacher_es: 'Ya contaron lo que se ha hecho en {setting_es}. ¿Qué creen que pasará después?', student_en: 'That is what has been done {where}. What will happen next? {role} has an idea.' },
  'describe>compare': { teacher_es: 'Ya describieron {setting_es}. Ahora {role_es} quiere comparar.', student_en: 'We described {the}. Now {role} wants to compare two things: which is better?' },
};

/** Cuando no hay plantilla para el par. */
export const GENERIC_TRANSITION: TransitionTemplate = {
  teacher_es: 'Seguimos en {setting_es}: ahora {role_es} necesita {need_es}.',
  student_en: 'Now, {where}, {role} needs to {nextNeed}.',
};

/** Del libro a la producción. */
export const BOOK_TO_PRODUCTION: TransitionTemplate = {
  teacher_es: 'Cierren el libro: de vuelta en {setting_es}, {role_es} tiene una tarea real para usar lo practicado.',
  student_en: 'Books closed. Back {where}, {role} needs to {nextNeed}.',
};

/** De la presentación al libro. */
export const PRESENT_TO_BOOK: TransitionTemplate = {
  teacher_es: 'Ya vimos cómo se usa en {setting_es}. Abran el libro y practiquen pensando en {role_es}.',
  student_en: 'Let’s practise it before {role} needs it {where}.',
};

export const NEED_ES: Record<Fn, string> = {
  narrate: 'contar lo que pasó', describe: 'describir cómo es todo', compare: 'elegir entre dos opciones', advise: 'dar un consejo', oblige: 'explicar lo obligatorio',
  permit: 'pedir permiso', plan: 'hacer un plan', predict: 'decir qué va a pasar', hypothesize: 'imaginar algo distinto', report: 'contar lo que dijeron otros',
  request: 'pedir ayuda con cortesía', opinion: 'dar su opinión', argue: 'defender una postura', instruct: 'explicar cómo se hace', experience: 'decir lo que ya se hizo',
  routine: 'explicar lo que pasa cada día', evaluate: 'valorar cómo fue', persuade: 'convencer a alguien',
};
