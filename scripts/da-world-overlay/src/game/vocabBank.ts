/**
 * ECYR rebuild — more vocabulary for the city's citizens to ask about.
 *
 * Six new language points, same format as the grammar bank (`c` is the index of
 * the right option, the dialog shuffles them): the names of places, who works
 * where, what you buy where, getting around, what a sign means, and the
 * adjectives a city is described with. Each one is a mission of its own in the
 * Vocabulary mode.
 */
import type { GrammarItem } from './grammar';

export const VOCAB_TAG_LABEL = {
  'city-places': 'places in the city',
  'city-jobs': 'jobs and where people work',
  shopping: 'shops and what they sell',
  transport: 'getting around the city',
  signs: 'signs and notices',
  'describing-places': 'adjectives for places',
} as const;

export type VocabTag = keyof typeof VOCAB_TAG_LABEL;

export const VOCAB_ICON: Record<VocabTag, string> = {
  'city-places': '🏛️',
  'city-jobs': '👩‍⚕️',
  shopping: '🛒',
  transport: '🚌',
  signs: '🪧',
  'describing-places': '🎨',
};

const P = 'city-places', J = 'city-jobs', S = 'shopping', T = 'transport', G = 'signs', D = 'describing-places';

export const VOCAB_BANK: GrammarItem[] = [
  /* ── places ── */
  { q: 'You can borrow books for free at the ___. 📚', o: ['library', 'bookshop', 'museum'], c: 0, e: 'At a <b>library</b> you borrow books; at a <b>bookshop</b> you buy them.', h: 'Do you pay for the books, or do you give them back? 🔁', tag: P },
  { q: 'Doctors and nurses work at the ___. 🏥', o: ['hospital', 'pharmacy', 'police station'], c: 0, e: 'A <b>hospital</b> is where doctors and nurses look after sick people.', h: 'Where do you go in an ambulance? 🚑', tag: P },
  { q: 'Where do you watch a film on a big screen? 🎬', o: ['the cinema', 'the theatre', 'the gallery'], c: 0, e: 'Films are shown at the <b>cinema</b> (US: movie theater).', h: 'A theatre has actors on a stage — and a film? 🍿', tag: P },
  { q: 'You can see paintings and old objects at the ___. 🖼️', o: ['museum', 'stadium', 'market'], c: 0, e: 'A <b>museum</b> keeps old and important objects for people to see.', h: 'Where do dinosaurs and ancient pots go? 🦖', tag: P },
  { q: 'Planes take off and land at the ___. ✈️', o: ['airport', 'harbour', 'station'], c: 0, e: 'Planes use an <b>airport</b>; ships use a <b>harbour</b>; trains use a <b>station</b>.', h: 'Which word has "air" in it? 🌤️', tag: P },
  { q: 'We send letters and parcels at the ___. ✉️', o: ['post office', 'bank', 'town hall'], c: 0, e: 'Letters and parcels go through the <b>post office</b>.', h: 'Letters are "post" in British English. 📮', tag: P },
  { q: 'Fans watch football matches at the ___. ⚽', o: ['stadium', 'gym', 'swimming pool'], c: 0, e: 'Big matches are played at a <b>stadium</b>.', h: 'A huge building with thousands of seats around a pitch. 🏟️', tag: P },
  { q: 'You can change money or open an account at the ___. 💳', o: ['bank', 'bakery', 'bar'], c: 0, e: 'A <b>bank</b> looks after your money.', h: 'Where does your money sleep at night? 💰', tag: P },
  { q: 'Tourists sleep at a ___ when they visit the city. 🛏️', o: ['hotel', 'garage', 'hospital'], c: 0, e: 'A <b>hotel</b> gives visitors a room to sleep in. (A <i>hostel</i> is a cheaper one.)', h: 'It has rooms, keys and a reception desk. 🔑', tag: P },
  { q: 'The mayor works at the ___. 🏛️', o: ['town hall', 'fire station', 'zoo'], c: 0, e: 'The <b>town hall</b> (city hall) is where the city is governed.', h: 'Who runs a city, and from which building? 🎩', tag: P },

  /* ── jobs ── */
  { q: 'A ___ bakes bread and cakes. 🥐', o: ['baker', 'butcher', 'barber'], c: 0, e: 'A <b>baker</b> works in a bakery; a <b>butcher</b> sells meat; a <b>barber</b> cuts hair.', h: 'Bakery → ba… 🍞', tag: J },
  { q: 'A ___ looks after your teeth. 🦷', o: ['dentist', 'vet', 'pilot'], c: 0, e: 'A <b>dentist</b> checks teeth; a <b>vet</b> looks after animals.', h: 'Open wide! Who says that? 😁', tag: J },
  { q: 'At the pharmacy, the ___ gives you your medicine. 💊', o: ['pharmacist', 'farmer', 'firefighter'], c: 0, e: 'A <b>pharmacist</b> works in a pharmacy (chemist’s).', h: 'Pharmacy → pharmac… 💊', tag: J },
  { q: 'A ___ serves food and drinks in a restaurant. 🍽️', o: ['waiter', 'writer', 'driver'], c: 0, e: 'A <b>waiter</b> (or server) brings your food to the table.', h: 'They wait at your table. ⏳', tag: J },
  { q: 'A ___ puts out fires and rescues people. 🚒', o: ['firefighter', 'police officer', 'lifeguard'], c: 0, e: 'A <b>firefighter</b> works at the fire station.', h: 'Fire + fight… 🔥', tag: J },
  { q: 'A ___ looks after sick animals. 🐶', o: ['vet', 'nurse', 'zookeeper'], c: 0, e: 'A <b>vet</b> (veterinarian) is a doctor for animals.', h: 'Your cat is ill. Who do you call? 🐱', tag: J },
  { q: 'Who drives you around the city for money? 🚕', o: ['a taxi driver', 'a mechanic', 'a pilot'], c: 0, e: 'A <b>taxi driver</b> takes passengers where they want to go.', h: 'Yellow car, a meter on the dashboard… 🚖', tag: J },
  { q: 'A ___ repairs cars in a garage. 🔧', o: ['mechanic', 'chef', 'cashier'], c: 0, e: 'A <b>mechanic</b> fixes engines and cars.', h: 'Who opens the bonnet and fixes the engine? 🚗', tag: J },

  /* ── shopping ── */
  { q: 'You buy medicine at the ___. 💊', o: ['pharmacy', 'butcher’s', 'bookshop'], c: 0, e: 'Medicine is sold at a <b>pharmacy</b> (chemist’s / drugstore).', h: 'Where does the pharmacist work? 🧑‍⚕️', tag: S },
  { q: 'You buy meat at the ___. 🥩', o: ['butcher’s', 'baker’s', 'florist’s'], c: 0, e: 'A <b>butcher’s</b> sells meat; a <b>florist’s</b> sells flowers.', h: 'Chicken, beef, sausages… who sells them? 🐄', tag: S },
  { q: 'Where can you buy flowers for your mum? 💐', o: ['at the florist’s', 'at the newsagent’s', 'at the hardware store'], c: 0, e: 'A <b>florist</b> sells flowers.', h: 'Flor… flowers. 🌷', tag: S },
  { q: 'I need a hammer and some nails. I go to the ___. 🔨', o: ['hardware store', 'clothes shop', 'jeweller’s'], c: 0, e: 'Tools are sold at a <b>hardware store</b>.', h: 'Hard things for fixing the house… 🛠️', tag: S },
  { q: 'How much ___ this jacket? — It’s 40 dollars. 🧥', o: ['is', 'are', 'does'], c: 0, e: '<b>How much is…?</b> asks the price of one thing.', h: 'One jacket — singular or plural? 🏷️', tag: S },
  { q: 'Can I ___ it on? — Yes, the changing rooms are over there. 👗', o: ['try', 'wear', 'test'], c: 0, e: '<b>Try on</b> = put clothes on to see if they fit.', h: 'Before you buy clothes you ___ them on. 🪞', tag: S },
  { q: 'You pay for your shopping at the ___. 🧾', o: ['checkout', 'check-in', 'lift'], c: 0, e: 'In a supermarket you pay at the <b>checkout</b>. <i>Check-in</i> is at an airport or hotel.', h: 'Supermarket, a cashier, a till… 💵', tag: S },
  { q: 'Newspapers and magazines are sold at the ___. 📰', o: ['newsagent’s', 'stationer’s', 'greengrocer’s'], c: 0, e: 'A <b>newsagent’s</b> sells newspapers; a <b>greengrocer’s</b> sells fruit and vegetables.', h: 'News… 🗞️', tag: S },

  /* ── transport ── */
  { q: 'Wait for the bus at the ___. 🚏', o: ['bus stop', 'car park', 'traffic jam'], c: 0, e: 'You wait for a bus at a <b>bus stop</b>.', h: 'Where does the bus stop? 🛑', tag: T },
  { q: 'Cross the road at the ___. 🚸', o: ['zebra crossing', 'roundabout', 'motorway'], c: 0, e: 'Pedestrians cross at a <b>zebra crossing</b> (crosswalk).', h: 'Black and white stripes, like an animal… 🦓', tag: T },
  { q: 'Too many cars, nobody moves — it’s a ___. 🚗🚙🚕', o: ['traffic jam', 'traffic light', 'one-way street'], c: 0, e: 'A <b>traffic jam</b> is when cars cannot move.', h: 'Cars stuck together like strawberry… 🍓', tag: T },
  { q: 'You can leave your car in the ___. 🅿️', o: ['car park', 'pavement', 'platform'], c: 0, e: 'A <b>car park</b> (parking lot) is for parked cars. A <b>platform</b> is for trains.', h: 'The big P on the sign. 🅿️', tag: T },
  { q: 'The train leaves from ___ 4. 🚆', o: ['platform', 'gate', 'lane'], c: 0, e: 'Trains leave from a <b>platform</b>; planes from a <b>gate</b>.', h: 'At a station, you stand on it to wait for the train. 🧍', tag: T },
  { q: 'I ___ the bus at Market Street and walked home. 🚌', o: ['got off', 'got out', 'got down'], c: 0, e: 'You <b>get on / get off</b> a bus or train; you <b>get in / get out of</b> a car or taxi.', h: 'Bus and train: on / off. Car and taxi: in / out. 🔁', tag: T },
  { q: 'Go round the ___ and take the second exit. 🔄', o: ['roundabout', 'crossroads', 'bridge'], c: 0, e: 'A <b>roundabout</b> is a circular junction.', h: 'You go ROUND it. ⭕', tag: T },
  { q: 'A single ticket goes one way; a ___ ticket goes there and back. 🎫', o: ['return', 'double', 'twice'], c: 0, e: 'A <b>return</b> ticket (round trip) takes you there and back.', h: 'You go… and then you re___. ↩️', tag: T },

  /* ── signs ── */
  { q: 'The sign says “NO ENTRY”. It means… ⛔', o: ['You can’t go in.', 'The door is free.', 'Enter quickly.'], c: 0, e: '<b>No entry</b> = it is forbidden to go in.', h: 'Entry = going in. And “no”…? 🚫', tag: G },
  { q: 'The sign says “OUT OF ORDER” on the lift. It means… 🛗', o: ['It doesn’t work.', 'It is very messy.', 'It is the wrong lift.'], c: 0, e: '<b>Out of order</b> = broken, not working.', h: 'Would you get in? 🔧', tag: G },
  { q: '“KEEP OFF THE GRASS” in the park means… 🌱', o: ['Don’t walk on the grass.', 'Cut the grass.', 'Sit on the grass.'], c: 0, e: '<b>Keep off</b> = do not walk or stand on it.', h: '“Off” is the opposite of “on”. 🚶', tag: G },
  { q: 'The shop sign says “CLOSED”. You… 🔒', o: ['can’t go shopping now.', 'can buy everything.', 'must pay at the door.'], c: 0, e: '<b>Closed</b> = the shop is not open now.', h: 'Opposite of OPEN. 🚪', tag: G },
  { q: '“PUSH” is on the door. You… 🚪', o: ['move it away from you.', 'pull it towards you.', 'knock first.'], c: 0, e: '<b>Push</b> = away from you; <b>pull</b> = towards you.', h: 'Push → away. Pull → towards. 👐', tag: G },
  { q: '“EXIT” over a door shows… 🚪➡️', o: ['the way out', 'the way in', 'the toilets'], c: 0, e: '<b>Exit</b> = the way out.', h: 'In an emergency, look for this green sign. 🟩', tag: G },
  { q: '“SALE — 50% OFF” means the clothes are… 🏷️', o: ['half price', 'twice the price', 'not for sale'], c: 0, e: '<b>50% off</b> = you pay half.', h: '50% = one half. 🍰', tag: G },

  /* ── describing places ── */
  { q: 'The stadium is full of people. It’s very ___. 👥', o: ['crowded', 'empty', 'quiet'], c: 0, e: '<b>Crowded</b> = full of people. The opposite is <b>empty</b>.', h: 'Lots of people, no space… 🧍🧍🧍', tag: D },
  { q: 'The library is very ___ — nobody talks. 🤫', o: ['quiet', 'noisy', 'busy'], c: 0, e: '<b>Quiet</b> = with little noise. The opposite is <b>noisy</b>.', h: 'Shhh! 🤫', tag: D },
  { q: 'Main Street at rush hour is ___ and full of cars. 🚦', o: ['busy', 'calm', 'deserted'], c: 0, e: '<b>Busy</b> = full of people or traffic.', h: 'Lots happening, everyone in a hurry. 🏃', tag: D },
  { q: 'This old building is really ___ — it was built in 1750. 🏰', o: ['ancient', 'modern', 'brand-new'], c: 0, e: '<b>Ancient</b> = very old. The opposite is <b>modern</b>.', h: '1750 is a long time ago… ⏳', tag: D },
  { q: 'The park is clean, green and ___. 🌳', o: ['peaceful', 'polluted', 'dangerous'], c: 0, e: '<b>Peaceful</b> = calm and quiet, nice to relax.', h: 'Which word goes with clean and green? 🕊️', tag: D },
  { q: 'The air near the factory is dirty. It’s ___. 🏭', o: ['polluted', 'fresh', 'tidy'], c: 0, e: '<b>Polluted</b> = dirty with smoke or chemicals.', h: 'Smoke, dirty air, bad for your lungs… 😷', tag: D },
  { q: 'The new shopping centre is very ___ — all glass and steel. 🏙️', o: ['modern', 'old-fashioned', 'historic'], c: 0, e: '<b>Modern</b> = new, in today’s style.', h: 'Glass and steel — today’s style or the past? ✨', tag: D },
];
