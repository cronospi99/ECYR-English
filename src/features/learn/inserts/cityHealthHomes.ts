/** Data for the city places, health advice and housing comparison activities. */
import type { LibQuestion } from '@/content/library';

// -------------------------------------------------------------------- city --

export const PLACES: { place: string; emoji: string; level: 'basic' | 'intermediate' | 'advanced' | 'shop'; what: string }[] = [
  { place: 'bakery', emoji: '🥖', level: 'shop', what: 'buy bread, cakes and pastries' },
  { place: 'coffee shop', emoji: '☕', level: 'shop', what: 'have a coffee and a snack' },
  { place: 'bookstore', emoji: '📚', level: 'shop', what: 'buy books, magazines and notebooks' },
  { place: 'pharmacy', emoji: '💊', level: 'shop', what: 'buy medicine' },
  { place: 'supermarket', emoji: '🛒', level: 'shop', what: 'buy groceries, fruit and vegetables' },
  { place: 'clothing store', emoji: '👗', level: 'shop', what: 'buy clothes, shoes and accessories' },
  { place: 'park', emoji: '🌳', level: 'basic', what: 'walk, play and relax outdoors' },
  { place: 'bus stop', emoji: '🚏', level: 'basic', what: 'wait for the bus' },
  { place: 'crosswalk', emoji: '🚸', level: 'basic', what: 'cross the street safely' },
  { place: 'school', emoji: '🏫', level: 'intermediate', what: 'study and learn' },
  { place: 'hospital', emoji: '🏥', level: 'intermediate', what: 'see a doctor when you are very sick' },
  { place: 'police station', emoji: '🚓', level: 'intermediate', what: 'report a crime' },
  { place: 'fire station', emoji: '🚒', level: 'intermediate', what: 'find the firefighters and their trucks' },
  { place: 'library', emoji: '📖', level: 'intermediate', what: 'borrow books for free' },
  { place: 'bank', emoji: '🏦', level: 'intermediate', what: 'open an account or take out money' },
  { place: 'post office', emoji: '📮', level: 'intermediate', what: 'send a letter or a package' },
  { place: 'restaurant', emoji: '🍽️', level: 'intermediate', what: 'have lunch or dinner' },
  { place: 'hotel', emoji: '🏨', level: 'intermediate', what: 'stay for the night when you travel' },
  { place: 'airport', emoji: '✈️', level: 'advanced', what: 'take a plane' },
  { place: 'train station', emoji: '🚆', level: 'advanced', what: 'catch a train' },
  { place: 'stadium', emoji: '🏟️', level: 'advanced', what: 'watch a football match or a concert' },
  { place: 'shopping mall', emoji: '🛍️', level: 'advanced', what: 'visit many shops in one big building' },
  { place: 'industrial area', emoji: '🏭', level: 'advanced', what: 'find factories and warehouses' },
];

export const LEVEL_ES = { shop: 'Tiendas', basic: 'Básico', intermediate: 'Intermedio', advanced: 'Avanzado' } as const;

// ------------------------------------------------------------------ health --

export const SYMPTOMS: { en: string; say: string; emoji: string; es: string; advice: string; bad: string[] }[] = [
  { en: 'headache', say: 'I have a headache.', emoji: '🤕', es: 'dolor de cabeza', advice: 'You should drink some water and rest.', bad: ['You should play loud music.', 'You must run a marathon.'] },
  { en: 'fever', say: 'I have a fever.', emoji: '🤒', es: 'fiebre', advice: 'You should take your temperature and see a doctor.', bad: ['You should go to the beach.', 'You must eat ice cream.'] },
  { en: 'sore throat', say: 'I have a sore throat.', emoji: '😣', es: 'dolor de garganta', advice: 'You could drink hot tea with honey.', bad: ['You should shout a lot.', 'You could drink very cold soda.'] },
  { en: 'cough', say: 'I have a cough.', emoji: '😷', es: 'tos', advice: 'You shouldn’t smoke, and you could try some cough syrup.', bad: ['You should smoke more.', 'You must sing all day.'] },
  { en: 'runny nose', say: 'I have a runny nose.', emoji: '🤧', es: 'moqueo', advice: 'You might have a cold. You should use tissues and rest.', bad: ['You must go swimming.', 'You shouldn’t wash your hands.'] },
  { en: 'stomachache', say: 'I have a stomachache.', emoji: '😖', es: 'dolor de estómago', advice: 'You shouldn’t eat fast food today.', bad: ['You should eat three hamburgers.', 'You must drink a lot of coffee.'] },
  { en: 'nausea', say: 'I feel nauseous.', emoji: '🤢', es: 'náuseas', advice: 'You should sit down and drink a little water.', bad: ['You should go on a roller coaster.', 'You must eat a big lunch.'] },
  { en: 'dizziness', say: 'I feel dizzy.', emoji: '😵‍💫', es: 'mareo', advice: 'You must sit down now and stay calm.', bad: ['You should drive your car.', 'You could climb a ladder.'] },
  { en: 'tiredness', say: 'I feel tired.', emoji: '🥱', es: 'cansancio', advice: 'You shouldn’t stay up late. You should sleep eight hours.', bad: ['You should drink coffee at midnight.', 'You must work all night.'] },
  { en: 'backache', say: 'I have a backache.', emoji: '🧍', es: 'dolor de espalda', advice: 'You shouldn’t carry heavy things.', bad: ['You should lift heavy boxes.', 'You must sleep on the floor.'] },
  { en: 'muscle ache', say: 'I have muscle aches.', emoji: '💪', es: 'dolor muscular', advice: 'You have to rest your muscles for a few days.', bad: ['You must go to the gym twice today.', 'You should run 20 kilometres.'] },
  { en: 'earache', say: 'I have an earache.', emoji: '👂', es: 'dolor de oído', advice: 'You should see a doctor. It might be an infection.', bad: ['You should listen to very loud music.', 'You could swim in a dirty river.'] },
];

export const HEALTH_WORDS: [string, string, string][] = [
  ['🧑‍⚕️', 'doctor', 'a person who treats you when you are sick'],
  ['👩‍⚕️', 'nurse', 'a person who helps the doctor'],
  ['🛌', 'patient', 'a person who is ill or injured'],
  ['🧑‍🔬', 'pharmacist', 'a person who gives medicine in a pharmacy'],
  ['🏥', 'hospital', 'a place for serious health problems'],
  ['🩺', 'clinic', 'a place where you go to see a doctor'],
  ['💊', 'pill', 'a small, round medicine'],
  ['🌡️', 'thermometer', 'a tool to check your temperature'],
  ['🩹', 'bandage', 'something you put on a wound'],
  ['💧', 'stay hydrated', 'drink enough water'],
  ['😌', 'get better', 'become healthy again'],
  ['🛋️', 'rest', 'relax and not do activities'],
];

export const MODALS: { m: string; use: string; ex: string; color: string }[] = [
  { m: 'should', use: 'un buen consejo', ex: 'You should see a doctor.', color: 'var(--green)' },
  { m: 'shouldn’t', use: 'un consejo negativo', ex: 'You shouldn’t eat too much sugar.', color: 'var(--red)' },
  { m: 'must', use: 'necesidad fuerte, obligación', ex: 'You must take your medicine.', color: 'var(--purple)' },
  { m: 'have to', use: 'necesidad (menos fuerte que must)', ex: 'I have to go to the pharmacy.', color: 'var(--indigo)' },
  { m: 'could', use: 'sugerencia o posibilidad', ex: 'You could try this tea. It could be the flu.', color: 'var(--blue)' },
  { m: 'might', use: 'posibilidad pequeña', ex: 'It might be nothing serious.', color: 'var(--orange)' },
];

export const MODAL_QUIZ: LibQuestion[] = [
  { type: 'mc', q: 'You have a fever. You ____ see a doctor.', options: ['should', 'shouldn’t', 'might not'], answer: 0, explain_es: 'Un buen consejo: should.' },
  { type: 'mc', q: 'You ____ eat fast food every day. It’s bad for you.', options: ['must', 'shouldn’t', 'could'], answer: 1, explain_es: 'Consejo negativo: shouldn’t.' },
  { type: 'mc', q: 'The doctor says you ____ take this medicine twice a day. It’s very important.', options: ['might', 'could', 'must'], answer: 2, explain_es: 'Obligación fuerte: must.' },
  { type: 'mc', q: 'I don’t feel well. I ____ go to the clinic this afternoon.', options: ['have to', 'shouldn’t', 'might not'], answer: 0, explain_es: 'Necesidad: have to.' },
  { type: 'mc', q: 'I’m not sure what it is. It ____ be just a cold.', options: ['must', 'might', 'shouldn’t'], answer: 1, explain_es: 'Posibilidad pequeña, no estás seguro: might.' },
  { type: 'mc', q: 'You ____ try this ginger tea. It may help.', options: ['could', 'mustn’t', 'have to'], answer: 0, explain_es: 'Sugerencia suave: could.' },
  { type: 'gap', q: 'You look tired. You ____ stay up late tonight. (consejo negativo)', answer: 'shouldn’t', accept: ["shouldn't", 'should not'], explain_es: 'Consejo negativo: shouldn’t + verbo base.' },
  { type: 'error', q: 'Find the mistake: You should to drink more water.', answer: 'You should drink more water.', accept: ['should drink'], explain_es: 'Después de un modal va el verbo sin “to”: should drink. (Have to sí lleva “to”.)' },
];

// ------------------------------------------------------------------ housing --

export interface Home {
  id: 'house' | 'apartment' | 'loft' | 'tuscan';
  name: string;
  emoji: string;
  rent: number;
  utilities: number;
  stratum: number;
  bedrooms: number;
  bathrooms: number;
  appliances: string[];
  insights: string[];
}

export const HOMES: Home[] = [
  { id: 'house', name: 'the house', emoji: '🏡', rent: 2_800_000, utilities: 350_000, stratum: 3, bedrooms: 3, bathrooms: 2, appliances: ['refrigerator', 'stove', 'washing machine', 'water heater'], insights: ['a garden', 'a garage', 'a play area for children', 'a covered terrace'] },
  { id: 'apartment', name: 'the apartment', emoji: '🏢', rent: 1_600_000, utilities: 280_000, stratum: 4, bedrooms: 2, bathrooms: 2, appliances: ['refrigerator', 'stove', 'washing machine', 'water heater'], insights: ['a gym', 'a swimming pool', 'a lounge', 'a lift (elevator)'] },
  { id: 'loft', name: 'the loft', emoji: '🏙️', rent: 2_200_000, utilities: 320_000, stratum: 4, bedrooms: 1, bathrooms: 1, appliances: ['refrigerator', 'stove', 'washing machine', 'dryer', 'microwave', 'dishwasher', 'A/C'], insights: ['a great location in the city', 'a modern industrial style', 'open spaces and high ceilings', 'transport and restaurants nearby', 'low maintenance'] },
  { id: 'tuscan', name: 'the Tuscan house', emoji: '🏰', rent: 3_800_000, utilities: 450_000, stratum: 5, bedrooms: 3, bathrooms: 2.5, appliances: ['refrigerator', 'stove', 'washing machine', 'dryer', 'dishwasher', 'microwave', 'A/C', 'water heater'], insights: ['a peaceful natural environment', 'bright, warm spaces', 'a traditional rustic design', 'more privacy and outdoor space', 'room for a family'] },
];

export const PAIRS = [
  { a: 'house', b: 'apartment', image: 'house-vs-apartment', inside: 'house-vs-apartment-photos', title: 'House vs Apartment' },
  { a: 'loft', b: 'tuscan', image: 'loft-vs-toscana', inside: null, title: 'Loft vs Tuscan house' },
] as const;

export const cop = (n: number) => `COP ${n.toLocaleString('en-US')}`;

/** Comparative and superlative questions from the real numbers on the cards. */
export const HOUSING_QUIZ: Record<'house-apartment' | 'loft-tuscan' | 'all', LibQuestion[]> = {
  'house-apartment': [
    { type: 'gap', q: 'The apartment is ____ than the house. (cheap)', answer: 'cheaper', explain_es: 'COP 1.600.000 vs COP 2.800.000. cheap → cheaper.' },
    { type: 'gap', q: 'The house is ____ than the apartment. (expensive)', answer: 'more expensive', explain_es: 'Adjetivo largo: more + expensive.' },
    { type: 'mc', q: 'Which home has more bedrooms?', options: ['The house', 'The apartment', 'They have the same'], answer: 0, explain_es: 'La casa tiene 3 habitaciones; el apartamento, 2.' },
    { type: 'mc', q: 'The apartment has ____ bathrooms as the house.', options: ['more', 'the same number of', 'fewer'], answer: 1, explain_es: 'Los dos tienen 2 baños: the same number of… as.' },
    { type: 'gap', q: 'The apartment’s stratum is ____ than the house’s. (high)', answer: 'higher', explain_es: 'Estrato 4 vs 3. high → higher.' },
    { type: 'transform', q: 'Rewrite with “not as … as”: The apartment is smaller than the house.', answer: 'The apartment is not as big as the house.', accept: ["The apartment isn't as big as the house.", 'The apartment is not as big as the house', "The apartment isn't as big as the house", 'The apartment is not as large as the house.'], explain_es: 'not as + adjetivo + as = menos … que.' },
  ],
  'loft-tuscan': [
    { type: 'gap', q: 'The loft is ____ than the Tuscan house. (cheap)', answer: 'cheaper', explain_es: 'COP 2.200.000 vs COP 3.800.000.' },
    { type: 'mc', q: 'Which one has more appliances?', options: ['The loft', 'The Tuscan house', 'They have the same'], answer: 1, explain_es: 'La casa toscana incluye además water heater (8 vs 7).' },
    { type: 'gap', q: 'The Tuscan house is ____ than the loft. It has 3 bedrooms. (big)', answer: 'bigger', explain_es: 'big → bigger (se dobla la g).' },
    { type: 'gap', q: 'The loft is ____ to transport and restaurants. (close)', answer: 'closer', explain_es: 'close → closer.' },
    { type: 'mc', q: 'For a family with three children, the Tuscan house is ____ the loft.', options: ['better than', 'more good than', 'gooder than'], answer: 0, explain_es: 'good → better (irregular).' },
    { type: 'transform', q: 'Write a preference with “would rather”: I prefer to live in the loft.', answer: "I'd rather live in the loft.", accept: ['I would rather live in the loft.', "I'd rather live in the loft", 'I would rather live in the loft'], explain_es: 'would rather + verbo base (sin to).' },
  ],
  all: [
    { type: 'mc', q: 'Which home is the cheapest of the four?', options: ['The apartment', 'The loft', 'The house', 'The Tuscan house'], answer: 0, explain_es: 'El apartamento: COP 1.600.000 de arriendo.' },
    { type: 'mc', q: 'Which home is the most expensive?', options: ['The house', 'The Tuscan house', 'The loft', 'The apartment'], answer: 1, explain_es: 'La casa toscana: COP 3.800.000.' },
    { type: 'gap', q: 'The loft has the ____ bedrooms of the four. (few)', answer: 'fewest', explain_es: 'Solo 1 habitación: the fewest.' },
    { type: 'gap', q: 'The Tuscan house is in the ____ stratum. (high)', answer: 'highest', explain_es: 'Estrato 5: the highest.' },
  ],
};
