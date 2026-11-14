/**
 * Taxi Rush — what the quiz traffic lights ask.
 *
 * Two kinds, as the brief asked for: "fix the sentence" (four versions of one
 * sentence, one of them correct) and plain ABCD questions. `c` is the index of
 * the right option; the screen shuffles them. Everything is about driving, the
 * city and travel, so the language belongs to the game it interrupts.
 */
export interface LightQuestion {
  kind: 'fix' | 'abcd';
  q: string;
  o: string[];
  c: number;
  /** Shown after answering. */
  e: string;
  topic: string;
}

const fix = (q: string, o: string[], e: string, topic: string): LightQuestion => ({ kind: 'fix', q, o, c: 0, e, topic });
const abcd = (q: string, o: string[], e: string, topic: string): LightQuestion => ({ kind: 'abcd', q, o, c: 0, e, topic });

export const LIGHT_QUESTIONS: LightQuestion[] = [
  /* ---- fix the sentence ---- */
  fix('Which sentence is correct?', ['She drives to work every day.', 'She drive to work every day.', 'She driving to work every day.', 'She is drive to work every day.'], 'Present simple, third person: she driveS.', 'present simple'),
  fix('Which sentence is correct?', ['There are two taxis outside.', 'There is two taxis outside.', 'There are two taxi outside.', 'It are two taxis outside.'], 'Plural → there ARE, and taxis with -s.', 'there is / there are'),
  fix('Which sentence is correct?', ['I went to the airport yesterday.', 'I go to the airport yesterday.', 'I goed to the airport yesterday.', 'I have went to the airport yesterday.'], 'Yesterday → past simple. Go → went.', 'past simple'),
  fix('Which sentence is correct?', ['How much does the ride cost?', 'How much the ride costs?', 'How many does the ride cost?', 'How much does the ride costs?'], 'Question: does + base verb (cost, not costs).', 'questions'),
  fix('Which sentence is correct?', ['We are waiting for the bus.', 'We waiting for the bus.', 'We are wait for the bus.', 'We is waiting for the bus.'], 'Present continuous: are + -ing.', 'present continuous'),
  fix('Which sentence is correct?', ['The museum is next to the bank.', 'The museum is next the bank.', 'The museum is next at the bank.', 'The museum next to the bank.'], 'Next TO, and the sentence needs IS.', 'prepositions of place'),
  fix('Which sentence is correct?', ['Can you take me to the station, please?', 'Can you to take me to the station, please?', 'Can you taking me to the station, please?', 'Can you takes me to the station, please?'], 'After can → base verb, no "to".', 'modal verbs'),
  fix('Which sentence is correct?', ['He doesn’t like traffic jams.', 'He don’t like traffic jams.', 'He doesn’t likes traffic jams.', 'He not like traffic jams.'], 'Negative, third person: doesn’t + base verb.', 'present simple'),
  fix('Which sentence is correct?', ['I have never been to Tokyo.', 'I have never be to Tokyo.', 'I never have been to Tokyo.', 'I has never been to Tokyo.'], 'Present perfect: have + been.', 'present perfect'),
  fix('Which sentence is correct?', ['The hotel is bigger than the hostel.', 'The hotel is more big than the hostel.', 'The hotel is biggest than the hostel.', 'The hotel is bigger that the hostel.'], 'Short adjective: big → bigger than.', 'comparatives'),
  fix('Which sentence is correct?', ['This is the most beautiful park in the city.', 'This is the beautifullest park in the city.', 'This is the more beautiful park in the city.', 'This is most beautiful park in the city.'], 'Long adjective: the most beautiful.', 'superlatives'),
  fix('Which sentence is correct?', ['If it rains, I will take a taxi.', 'If it will rain, I take a taxi.', 'If it rains, I take will a taxi.', 'If it rain, I will take a taxi.'], 'First conditional: if + present, will + verb.', 'conditionals'),
  fix('Which sentence is correct?', ['There isn’t any petrol in the car.', 'There isn’t some petrol in the car.', 'There aren’t any petrol in the car.', 'There isn’t no petrol in the car.'], 'Negative + uncountable → isn’t any.', 'some / any'),
  fix('Which sentence is correct?', ['How many passengers are there?', 'How much passengers are there?', 'How many passengers there are?', 'How many passenger are there?'], 'Countable plural → how many … are there?', 'much / many'),
  fix('Which sentence is correct?', ['She was driving when the light turned red.', 'She was drive when the light turned red.', 'She drove when the light was turning red.', 'She were driving when the light turned red.'], 'Past continuous (was driving) for the longer action.', 'past continuous'),
  fix('Which sentence is correct?', ['You must stop at a red light.', 'You must to stop at a red light.', 'You must stopping at a red light.', 'You musts stop at a red light.'], 'Must + base verb, no "to".', 'modal verbs'),
  fix('Which sentence is correct?', ['I’m going to visit the zoo tomorrow.', 'I’m going visit the zoo tomorrow.', 'I going to visit the zoo tomorrow.', 'I’m go to visit the zoo tomorrow.'], 'Future plan: be going to + verb.', 'future'),
  fix('Which sentence is correct?', ['Turn left at the second traffic light.', 'Turn left in the second traffic light.', 'Turn to left at the second traffic light.', 'Turn left on the two traffic light.'], 'Turn left AT a point (a light, a corner).', 'directions'),
  fix('Which sentence is correct?', ['Where is the nearest pharmacy?', 'Where the nearest pharmacy is?', 'Where is the most near pharmacy?', 'Where are the nearest pharmacy?'], 'Question word + is + subject. Near → nearest.', 'questions'),
  fix('Which sentence is correct?', ['My sister has got a red car.', 'My sister have got a red car.', 'My sister has got a car red.', 'My sister got has a red car.'], 'She has got; the adjective goes before the noun.', 'have got'),
  fix('Which sentence is correct?', ['The streets are very busy at rush hour.', 'The streets is very busy at rush hour.', 'The streets are very busy in rush hour at.', 'The street are very busy at rush hour.'], 'Plural subject → are.', 'to be'),
  fix('Which sentence is correct?', ['I’ve lived in this city for five years.', 'I live in this city for five years.', 'I’ve lived in this city since five years.', 'I’m living in this city for five years.'], 'Present perfect + for + a period of time.', 'present perfect'),
  fix('Which sentence is correct?', ['The passenger who is wearing a hat is my uncle.', 'The passenger which is wearing a hat is my uncle.', 'The passenger who wearing a hat is my uncle.', 'The passenger is wearing a hat who is my uncle.'], 'People → who.', 'relative clauses'),
  fix('Which sentence is correct?', ['The bridge was built in 1920.', 'The bridge was build in 1920.', 'The bridge built in 1920.', 'The bridge is built in 1920 ago.'], 'Passive: was + past participle (built).', 'passive voice'),
  fix('Which sentence is correct?', ['He asked me where the hotel was.', 'He asked me where was the hotel.', 'He asked me where is the hotel.', 'He asked to me where the hotel was.'], 'Reported question: no inversion.', 'reported speech'),

  /* ---- ABCD ---- */
  abcd('A ___ takes you to the airport for money. 🚕', ['taxi driver', 'pilot', 'waiter', 'cashier'], 'A taxi driver drives passengers.', 'jobs'),
  abcd('You wait for a train on the ___. 🚆', ['platform', 'pavement', 'runway', 'roundabout'], 'Trains stop at a platform.', 'transport'),
  abcd('Red light means… 🔴', ['stop', 'go faster', 'turn left', 'park here'], 'Red = stop.', 'road signs'),
  abcd('The opposite of "crowded" is… 👥', ['empty', 'busy', 'noisy', 'full'], 'Crowded ↔ empty.', 'adjectives'),
  abcd('Planes land on the ___. ✈️', ['runway', 'motorway', 'platform', 'pavement'], 'Planes take off and land on a runway.', 'transport'),
  abcd('"Fasten your seat belt" means… 🔒', ['put it on', 'take it off', 'wash it', 'sell it'], 'Fasten = close / put on.', 'travel'),
  abcd('Choose the past of "drive". 🚗', ['drove', 'drived', 'driven', 'drive'], 'Drive → drove → driven.', 'irregular verbs'),
  abcd('Choose the past of "take". 🚕', ['took', 'taked', 'taken', 'tooked'], 'Take → took → taken.', 'irregular verbs'),
  abcd('Choose the past of "buy". 🛍️', ['bought', 'buyed', 'brought', 'boughten'], 'Buy → bought. (Bring → brought.)', 'irregular verbs'),
  abcd('Where do you buy stamps? 📮', ['at the post office', 'at the bakery', 'at the gym', 'at the zoo'], 'Stamps are sold at the post office.', 'places'),
  abcd('A place with lions and giraffes is a… 🦁', ['zoo', 'farm', 'museum', 'library'], 'Wild animals live in a zoo.', 'places'),
  abcd('"How far is it?" asks about… 📏', ['distance', 'time', 'price', 'weather'], 'How far → distance.', 'questions'),
  abcd('"How long does it take?" asks about… ⏱️', ['time', 'distance', 'size', 'colour'], 'How long does it take → time.', 'questions'),
  abcd('The car ___ fast. 🏎️', ['is', 'are', 'am', 'be'], 'One car → is.', 'to be'),
  abcd('I ___ my keys in the taxi yesterday! 🔑', ['left', 'leaved', 'leave', 'leaving'], 'Leave → left.', 'irregular verbs'),
  abcd('We get ___ a bus, but ___ a taxi. 🚌🚕', ['on / in', 'in / on', 'at / in', 'on / at'], 'Bus/train: on; car/taxi: in.', 'prepositions'),
  abcd('A "traffic jam" is… 🚗🚙', ['too many cars that can’t move', 'a fruit jam', 'a broken light', 'a fast road'], 'A traffic jam: cars stuck.', 'transport'),
  abcd('The ___ is the person who travels in a taxi. 🧳', ['passenger', 'driver', 'pedestrian', 'mechanic'], 'The passenger rides; the driver drives.', 'transport'),
  abcd('Which word is a place to sleep? 🛏️', ['hotel', 'hospital', 'harbour', 'highway'], 'You sleep in a hotel.', 'places'),
  abcd('Go ___ the bridge and turn right. 🌉', ['across', 'between', 'under of', 'into of'], 'Go across a bridge.', 'directions'),
  abcd('The bank is ___ the café and the cinema. 🏦', ['between', 'next', 'opposite of', 'behind of'], 'Between A and B.', 'prepositions of place'),
  abcd('I’m ___ hungry. Let’s eat! 🍔', ['really', 'very much', 'too much', 'a lot'], 'Really/very + adjective.', 'adverbs'),
  abcd('She ___ a taxi every morning. 🚕', ['takes', 'take', 'taking', 'is take'], 'She + verb-s.', 'present simple'),
  abcd('"Rush hour" is when… 🕗', ['the roads are very busy', 'shops are closed', 'it’s midnight', 'it rains'], 'Rush hour: everybody going to or from work.', 'transport'),
  abcd('A "one-way street"… ➡️', ['has traffic in only one direction', 'is very short', 'has no cars', 'has one house'], 'Traffic only goes one way.', 'road signs'),
  abcd('Which is uncountable? 💧', ['traffic', 'car', 'street', 'bus'], 'Traffic is uncountable (not "a traffic").', 'countable / uncountable'),
  abcd('"Pedestrians" are people who… 🚶', ['walk', 'drive', 'fly', 'swim'], 'A pedestrian walks.', 'transport'),
  abcd('The fare is $10. The ___ is the money you pay. 💵', ['fare', 'fair', 'fire', 'far'], 'Fare = the price of a ride. (Fair = just.)', 'vocabulary'),
  abcd('You can ___ a car at the car rental. 🚗', ['rent', 'borrow', 'lend', 'rent out of'], 'Rent = pay to use something for a time.', 'vocabulary'),
  abcd('Turn ___ the radio, please — it’s too loud! 📻', ['down', 'up', 'on', 'over'], 'Turn down = lower the volume.', 'phrasal verbs'),
  abcd('The taxi ___ down on the motorway. 🛠️', ['broke', 'took', 'turned', 'ran'], 'Break down = stop working (a car).', 'phrasal verbs'),
  abcd('Can you pick me ___ at 8? 🕗', ['up', 'on', 'off', 'out'], 'Pick someone up = collect them.', 'phrasal verbs'),
  abcd('I need to drop my son ___ at school. 🏫', ['off', 'up', 'in', 'down'], 'Drop someone off = leave them somewhere.', 'phrasal verbs'),
];
