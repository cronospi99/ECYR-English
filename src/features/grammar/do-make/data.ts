import type { LibQuestion } from '@/content/library';

/**
 * DO vs MAKE: both are "hacer" in Spanish. DO = the activity, the task, the
 * job (often repeated, often without a visible result); MAKE = creating,
 * producing or causing something that did not exist before.
 */
export type Verb = 'do' | 'make';

export interface Group {
  verb: Verb;
  title: string;
  es: string;
  emoji: string;
  items: { en: string; es: string; ex: string }[];
}

export const GROUPS: Group[] = [
  {
    verb: 'do',
    title: 'Housework and chores',
    es: 'Tareas de la casa',
    emoji: '🧺',
    items: [
      { en: 'do the dishes', es: 'lavar los platos', ex: 'I do the dishes after dinner.' },
      { en: 'do the laundry', es: 'lavar la ropa', ex: 'She does the laundry on Sundays.' },
      { en: 'do the housework', es: 'hacer el oficio', ex: 'We do the housework together.' },
      { en: 'do the shopping', es: 'hacer el mercado / las compras', ex: 'My dad does the shopping on Saturday.' },
      { en: 'do the ironing', es: 'planchar', ex: 'I hate doing the ironing.' },
      { en: 'do the cleaning', es: 'hacer el aseo', ex: 'Who does the cleaning in your house?' },
    ],
  },
  {
    verb: 'do',
    title: 'Work, study and tasks',
    es: 'Trabajo, estudio y tareas',
    emoji: '📚',
    items: [
      { en: 'do homework', es: 'hacer la tarea', ex: 'Did you do your homework?' },
      { en: 'do an exercise', es: 'hacer un ejercicio', ex: 'Do exercise 3 on page 20.' },
      { en: 'do a test / an exam', es: 'presentar un examen', ex: 'We did a test this morning.' },
      { en: 'do a course', es: 'hacer un curso', ex: 'She is doing an English course.' },
      { en: 'do research', es: 'investigar', ex: 'Scientists are doing research on coffee plants.' },
      { en: 'do a job', es: 'hacer un trabajo', ex: 'He did a great job on the project.' },
      { en: 'do business', es: 'hacer negocios', ex: 'They do business with companies in Mexico.' },
    ],
  },
  {
    verb: 'do',
    title: 'Sports and exercise',
    es: 'Deporte y ejercicio',
    emoji: '🧘',
    items: [
      { en: 'do exercise', es: 'hacer ejercicio', ex: 'It is good to do exercise every day.' },
      { en: 'do yoga', es: 'hacer yoga', ex: 'My mom does yoga in the park.' },
      { en: 'do karate', es: 'practicar karate', ex: 'My brother does karate twice a week.' },
    ],
  },
  {
    verb: 'do',
    title: 'Fixed expressions',
    es: 'Expresiones fijas',
    emoji: '⭐',
    items: [
      { en: 'do someone a favour', es: 'hacerle un favor a alguien', ex: 'Can you do me a favour?' },
      { en: 'do your best', es: 'hacer lo mejor posible', ex: 'Don’t worry, just do your best.' },
      { en: 'do well / badly', es: 'irle bien / mal', ex: 'She did well in the interview.' },
      { en: 'do good / harm', es: 'hacer bien / daño', ex: 'Too much sugar does harm to your teeth.' },
      { en: 'do damage', es: 'causar daños', ex: 'The storm did a lot of damage.' },
      { en: 'do your hair', es: 'arreglarse el pelo', ex: 'She is doing her hair for the party.' },
      { en: 'do something / nothing', es: 'hacer algo / nada', ex: 'I did nothing at the weekend.' },
    ],
  },
  {
    verb: 'make',
    title: 'Food and drinks',
    es: 'Comida y bebida',
    emoji: '🍳',
    items: [
      { en: 'make breakfast / lunch / dinner', es: 'preparar el desayuno / almuerzo / la cena', ex: 'I make dinner for my friends on Fridays.' },
      { en: 'make a cake', es: 'hacer una torta', ex: 'Grandma made a chocolate cake.' },
      { en: 'make coffee', es: 'preparar café', ex: 'Can you make some coffee?' },
      { en: 'make a sandwich', es: 'hacer un sándwich', ex: 'He made himself a sandwich.' },
    ],
  },
  {
    verb: 'make',
    title: 'Creating and producing',
    es: 'Crear y fabricar',
    emoji: '🛠️',
    items: [
      { en: 'make clothes', es: 'fabricar ropa', ex: 'That company makes clothes and shoes.' },
      { en: 'make furniture', es: 'fabricar muebles', ex: 'My uncle makes sofas to sell.' },
      { en: 'make a dress', es: 'hacer un vestido', ex: 'She made her own wedding dress.' },
      { en: 'make a video', es: 'hacer un video', ex: 'We made a video for the class.' },
      { en: 'make a list', es: 'hacer una lista', ex: 'Make a list before you go shopping.' },
    ],
  },
  {
    verb: 'make',
    title: 'Talking and communicating',
    es: 'Hablar y comunicar',
    emoji: '💬',
    items: [
      { en: 'make a phone call', es: 'hacer una llamada', ex: 'I need to make a phone call.' },
      { en: 'make a comment', es: 'hacer un comentario', ex: 'He made a funny comment.' },
      { en: 'make a complaint', es: 'poner una queja', ex: 'She made a complaint about the noise.' },
      { en: 'make a suggestion', es: 'hacer una sugerencia', ex: 'Can I make a suggestion?' },
      { en: 'make a promise', es: 'hacer una promesa', ex: 'You made a promise, so keep it.' },
      { en: 'make an excuse', es: 'poner una excusa', ex: 'He always makes an excuse to be late.' },
      { en: 'make a joke', es: 'hacer un chiste', ex: 'My dad makes terrible jokes.' },
      { en: 'make a speech', es: 'dar un discurso', ex: 'The mayor made a short speech.' },
    ],
  },
  {
    verb: 'make',
    title: 'Plans and decisions',
    es: 'Planes y decisiones',
    emoji: '🗓️',
    items: [
      { en: 'make a decision', es: 'tomar una decisión', ex: 'It was difficult to make a decision.' },
      { en: 'make a choice', es: 'elegir', ex: 'You have to make a choice.' },
      { en: 'make plans', es: 'hacer planes', ex: 'Let’s make plans for the holidays.' },
      { en: 'make an appointment', es: 'pedir una cita', ex: 'I made an appointment with the dentist.' },
      { en: 'make arrangements', es: 'hacer los preparativos', ex: 'They are making arrangements for the wedding.' },
    ],
  },
  {
    verb: 'make',
    title: 'Results and changes',
    es: 'Resultados y cambios',
    emoji: '✨',
    items: [
      { en: 'make a mistake', es: 'cometer un error', ex: 'Everybody makes mistakes.' },
      { en: 'make a mess', es: 'hacer un desorden', ex: 'The kids made a mess in the kitchen.' },
      { en: 'make a noise', es: 'hacer ruido', ex: 'Please don’t make a noise.' },
      { en: 'make money', es: 'ganar dinero', ex: 'He makes money selling empanadas.' },
      { en: 'make progress', es: 'progresar', ex: 'You are making great progress!' },
      { en: 'make an effort', es: 'esforzarse', ex: 'She made an effort to speak English.' },
      { en: 'make a difference', es: 'marcar la diferencia', ex: 'Small actions can make a difference.' },
      { en: 'make friends', es: 'hacer amigos', ex: 'It is easy to make friends at university.' },
      { en: 'make the bed', es: 'tender la cama', ex: 'I make my bed every morning.' },
      { en: 'make sure', es: 'asegurarse', ex: 'Make sure you close the door.' },
    ],
  },
];

/** The classic mistakes of Spanish speakers ("hacer" for everything). */
export const MISTAKES: { wrong: string; right: string; why: string }[] = [
  { wrong: 'I do the bed every morning.', right: 'I make the bed every morning.', why: 'Tender la cama es una expresión fija con MAKE.' },
  { wrong: 'I have to make my homework.', right: 'I have to do my homework.', why: 'La tarea es una actividad: DO homework.' },
  { wrong: 'She did a mistake.', right: 'She made a mistake.', why: 'Un error es un resultado: MAKE a mistake.' },
  { wrong: 'We make exercise every day.', right: 'We do exercise every day.', why: 'Deporte y ejercicio van con DO.' },
  { wrong: 'He did a decision.', right: 'He made a decision.', why: 'Las decisiones se “hacen”: MAKE a decision.' },
  { wrong: 'Can you make me a favour?', right: 'Can you do me a favour?', why: 'Expresión fija: DO someone a favour.' },
  { wrong: 'Let’s do a party!', right: 'Let’s have a party! / Let’s throw a party!', why: 'Una fiesta se “tiene”: HAVE (o throw) a party.' },
  { wrong: 'I did a photo of the beach.', right: 'I took a photo of the beach.', why: 'Las fotos se “toman”: TAKE a photo.' },
];

/** Nouns for the sorter: each goes with one verb. */
export const SORT_POOL: { noun: string; verb: Verb }[] = GROUPS.flatMap((g) =>
  g.items.map((i) => ({ noun: i.en.replace(/^(do|make)\s+/, '').replace(/\s*\/.*$/, ''), verb: g.verb })),
);

export const QUIZ: LibQuestion[] = [
  { type: 'mc', q: 'Can you ____ me a favour, please?', options: ['do', 'make'], answer: 0, explain_es: 'Expresión fija: do someone a favour.' },
  { type: 'mc', q: 'I always ____ the bed before breakfast.', options: ['do', 'make'], answer: 1, explain_es: 'Tender la cama = make the bed.' },
  { type: 'mc', q: 'Did you ____ your homework last night?', options: ['do', 'make'], answer: 0, explain_es: 'La tarea es una actividad: do homework.' },
  { type: 'mc', q: 'Sorry, I ____ a mistake in your name.', options: ['did', 'made'], answer: 1, explain_es: 'Make a mistake. El pasado de make es made.' },
  { type: 'mc', q: 'My grandmother ____ the best arepas in town.', options: ['does', 'makes'], answer: 1, explain_es: 'Preparar comida = make.' },
  { type: 'mc', q: 'We ____ yoga every Tuesday.', options: ['do', 'make'], answer: 0, explain_es: 'Deportes y ejercicio con do.' },
  { type: 'mc', q: 'The kids ____ a terrible mess in the living room.', options: ['did', 'made'], answer: 1, explain_es: 'Un desorden es un resultado: make a mess.' },
  { type: 'mc', q: 'I need to ____ an appointment with the doctor.', options: ['do', 'make'], answer: 1, explain_es: 'Make an appointment = pedir una cita.' },
  { type: 'mc', q: 'Who ____ the dishes in your house?', options: ['does', 'makes'], answer: 0, explain_es: 'Tareas de la casa con do: do the dishes.' },
  { type: 'mc', q: 'She is ____ a lot of progress with her English.', options: ['doing', 'making'], answer: 1, explain_es: 'Make progress = progresar.' },
  { type: 'mc', q: 'Don’t worry about the exam. Just ____ your best.', options: ['do', 'make'], answer: 0, explain_es: 'Expresión fija: do your best.' },
  { type: 'mc', q: 'It’s a hard choice, but you have to ____ a decision.', options: ['do', 'make'], answer: 1, explain_es: 'Make a decision = tomar una decisión.' },
  { type: 'gap', q: 'Shh! Don’t ____ a noise. The baby is sleeping.', answer: 'make', explain_es: 'Make a noise = hacer ruido.' },
  { type: 'gap', q: 'What did you ____ at the weekend? — Nothing special.', answer: 'do', explain_es: 'Con something / anything / nothing y “¿qué hiciste?” va do.' },
  { type: 'gap', q: 'He ____ a phone call to his boss yesterday.', answer: 'made', explain_es: 'Make a phone call, en pasado: made.' },
  { type: 'gap', q: 'The storm ____ a lot of damage to the houses last year.', answer: 'did', explain_es: 'Do damage = causar daños; pasado did.' },
  { type: 'error', q: 'Find the mistake: My brother makes karate on Saturdays.', answer: 'My brother does karate on Saturdays.', accept: ['does karate'], explain_es: 'Los deportes van con do: does karate.' },
  { type: 'error', q: 'Find the mistake: I did a lot of friends at university.', answer: 'I made a lot of friends at university.', accept: ['made'], explain_es: 'Make friends = hacer amigos.' },
];

// ------------------------------------------------------ pronouns (same class) --

export const REFLEXIVE: [string, string, string][] = [
  ['I', 'myself', 'I made myself a salad.'],
  ['you (singular)', 'yourself', 'Take care of yourself.'],
  ['he', 'himself', 'He hurt himself playing football.'],
  ['she', 'herself', 'She did it herself.'],
  ['it', 'itself', 'The dog scratched itself.'],
  ['we', 'ourselves', 'We organised the party ourselves.'],
  ['you (plural)', 'yourselves', 'Did you paint the house yourselves?'],
  ['they', 'themselves', 'They didn’t recognise themselves in the old photos.'],
];

export const POSSESSIVE: [string, string, string][] = [
  ['my', 'mine', 'That wallet is mine.'],
  ['your', 'yours', 'Is this pen yours?'],
  ['his', 'his', 'Alex can’t find his watch. I think this one is his.'],
  ['her', 'hers', 'Sara bought a car. It’s hers.'],
  ['our', 'ours', 'The new house is ours.'],
  ['their', 'theirs', 'That dog is theirs.'],
];

export const PRONOUN_QUIZ: LibQuestion[] = [
  { type: 'mc', q: 'Be careful with the knife! Don’t cut ____.', options: ['you', 'yourself', 'yours'], answer: 1, explain_es: 'Sujeto y objeto son la misma persona: yourself.' },
  { type: 'mc', q: 'This isn’t my phone. Mine is black, so this one must be ____.', options: ['your', 'yours', 'yourself'], answer: 1, explain_es: 'Pronombre posesivo sin sustantivo después: yours.' },
  { type: 'mc', q: 'Laura made ____ a birthday cake.', options: ['her', 'hers', 'herself'], answer: 2, explain_es: 'Laura se lo hizo a sí misma: herself.' },
  { type: 'mc', q: 'Those keys aren’t ours. I think they’re ____.', options: ['their', 'theirs', 'themselves'], answer: 1, explain_es: 'Sin sustantivo después: theirs.' },
  { type: 'mc', q: 'We painted the whole house by ____.', options: ['us', 'ours', 'ourselves'], answer: 2, explain_es: 'By ourselves = solos, sin ayuda.' },
  { type: 'gap', q: 'Is this bag yours or ____ (de ella)?', answer: 'hers', explain_es: 'Pronombre posesivo de she: hers (sin apóstrofo).' },
];
