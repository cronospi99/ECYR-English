/**
 * Taxi Rush — the places a passenger can ask for.
 *
 * The city's own ninety-one places come first (same names, same doors), and the
 * eight new districts around it add these. Each place has a type, and each type
 * has the sentences a passenger says to ask for it — so a fare is a small
 * vocabulary exercise before it is a drive: "I need to post a letter" is the
 * post office, and the student has to know it.
 */

export type District = 'downtown' | 'harbour' | 'oldtown' | 'campus' | 'airport' | 'suburbs' | 'market' | 'parkside';

export interface NewPlace {
  name: string;
  /** Noun phrase with its article, like the city's own places. */
  type: string;
  emoji: string;
  district: District;
  /** Shell kind for the building. */
  kind: 'tower' | 'block' | 'hall' | 'house';
}

/** New places, by district. International names next to Colombian ones. */
export const NEW_PLACES: NewPlace[] = [
  // downtown (north)
  { name: 'Empire Tower', type: 'an office tower', emoji: '🏢', district: 'downtown', kind: 'tower' },
  { name: 'Grand Plaza Hotel', type: 'a hotel', emoji: '🏨', district: 'downtown', kind: 'tower' },
  { name: 'Wall Street Bank', type: 'a bank', emoji: '🏦', district: 'downtown', kind: 'tower' },
  { name: 'Tokyo Sushi House', type: 'a sushi bar', emoji: '🍣', district: 'downtown', kind: 'block' },
  { name: 'Broadway Theatre', type: 'a theatre', emoji: '🎭', district: 'downtown', kind: 'block' },
  { name: 'Times Square Cinema', type: 'a cinema', emoji: '🎬', district: 'downtown', kind: 'block' },
  { name: 'Torre Colpatria Offices', type: 'an office tower', emoji: '🏢', district: 'downtown', kind: 'tower' },
  { name: 'Hotel Tequendama', type: 'a hotel', emoji: '🏨', district: 'downtown', kind: 'tower' },
  { name: 'Manhattan Gym', type: 'a gym', emoji: '🏋️', district: 'downtown', kind: 'block' },
  { name: 'City News Radio', type: 'a radio station', emoji: '📻', district: 'downtown', kind: 'block' },
  // harbour (east)
  { name: 'Sydney Harbour Ferry', type: 'a ferry dock', emoji: '⛴️', district: 'harbour', kind: 'hall' },
  { name: 'Cartagena Fish Market', type: 'a fish market', emoji: '🐟', district: 'harbour', kind: 'hall' },
  { name: 'Lighthouse Seafood', type: 'a restaurant', emoji: '🦞', district: 'harbour', kind: 'house' },
  { name: 'Marina Boat Rental', type: 'a boat rental', emoji: '⛵', district: 'harbour', kind: 'hall' },
  { name: 'Port Customs Office', type: 'a customs office', emoji: '🛃', district: 'harbour', kind: 'block' },
  { name: 'Caribbean Surf Shop', type: 'a surf shop', emoji: '🏄', district: 'harbour', kind: 'house' },
  { name: 'Ocean World Aquarium', type: 'an aquarium', emoji: '🐠', district: 'harbour', kind: 'hall' },
  { name: 'Santa Marta Ice Cream', type: 'an ice cream shop', emoji: '🍦', district: 'harbour', kind: 'house' },
  // old town (west)
  { name: 'Museo del Oro', type: 'a museum', emoji: '🏺', district: 'oldtown', kind: 'block' },
  { name: 'Louvre Art Gallery', type: 'an art gallery', emoji: '🖼️', district: 'oldtown', kind: 'block' },
  { name: 'La Candelaria Church', type: 'a church', emoji: '⛪', district: 'oldtown', kind: 'house' },
  { name: 'Café de Paris', type: 'a coffee shop', emoji: '☕', district: 'oldtown', kind: 'house' },
  { name: 'Roma Pizzeria', type: 'a pizzeria', emoji: '🍕', district: 'oldtown', kind: 'house' },
  { name: 'Botero Square Gallery', type: 'an art gallery', emoji: '🎨', district: 'oldtown', kind: 'block' },
  { name: 'Old Town Post Office', type: 'a post office', emoji: '📮', district: 'oldtown', kind: 'block' },
  { name: 'Teatro Colón', type: 'a theatre', emoji: '🎭', district: 'oldtown', kind: 'block' },
  { name: 'Vienna Bakery', type: 'a bakery', emoji: '🥐', district: 'oldtown', kind: 'house' },
  { name: 'Shakespeare Bookshop', type: 'a bookstore', emoji: '📚', district: 'oldtown', kind: 'house' },
  // campus (north-west)
  { name: 'Oxford Language School', type: 'a language school', emoji: '🗣️', district: 'campus', kind: 'block' },
  { name: 'Universidad Nacional', type: 'a university', emoji: '🎓', district: 'campus', kind: 'tower' },
  { name: 'Cambridge Library', type: 'a library', emoji: '📖', district: 'campus', kind: 'block' },
  { name: 'Einstein Science Lab', type: 'a science lab', emoji: '🔬', district: 'campus', kind: 'block' },
  { name: 'Campus Bookshop', type: 'a bookstore', emoji: '📚', district: 'campus', kind: 'house' },
  { name: 'Student Canteen', type: 'a canteen', emoji: '🍱', district: 'campus', kind: 'house' },
  { name: 'Olympic Swimming Pool', type: 'a swimming pool', emoji: '🏊', district: 'campus', kind: 'hall' },
  // airport (south-east)
  { name: 'International Airport', type: 'an airport', emoji: '✈️', district: 'airport', kind: 'hall' },
  { name: 'Airport Car Rental', type: 'a car rental', emoji: '🚗', district: 'airport', kind: 'hall' },
  { name: 'Skyline Airport Hotel', type: 'a hotel', emoji: '🏨', district: 'airport', kind: 'tower' },
  { name: 'Global Express Courier', type: 'a courier office', emoji: '📦', district: 'airport', kind: 'hall' },
  { name: 'Jet Fuel Gas Station', type: 'a gas station', emoji: '⛽', district: 'airport', kind: 'hall' },
  { name: 'Duty Free Outlet', type: 'a shopping mall', emoji: '🛍️', district: 'airport', kind: 'hall' },
  // suburbs (south)
  { name: 'Sunny Days Kindergarten', type: 'a kindergarten', emoji: '🧸', district: 'suburbs', kind: 'house' },
  { name: 'Happy Paws Vet', type: 'a vet clinic', emoji: '🐶', district: 'suburbs', kind: 'house' },
  { name: 'Green Thumb Garden Centre', type: 'a garden center', emoji: '🌻', district: 'suburbs', kind: 'hall' },
  { name: 'Smile Dental Clinic', type: 'a dental clinic', emoji: '🦷', district: 'suburbs', kind: 'house' },
  { name: 'Corner Laundromat', type: 'a laundromat', emoji: '🧺', district: 'suburbs', kind: 'house' },
  { name: 'Medellín Flower Shop', type: 'a flower shop', emoji: '💐', district: 'suburbs', kind: 'house' },
  { name: 'Family Health Centre', type: 'a health centre', emoji: '🩺', district: 'suburbs', kind: 'block' },
  { name: 'Valley High School', type: 'a school', emoji: '🏫', district: 'suburbs', kind: 'block' },
  // market (south-west)
  { name: 'Paloquemao Market', type: 'a farmers market', emoji: '🥭', district: 'market', kind: 'hall' },
  { name: 'Mexico City Taquería', type: 'a restaurant', emoji: '🌮', district: 'market', kind: 'house' },
  { name: 'Istanbul Spice Bazaar', type: 'a spice shop', emoji: '🧂', district: 'market', kind: 'house' },
  { name: 'Arepas La 70', type: 'a fast food restaurant', emoji: '🫓', district: 'market', kind: 'house' },
  { name: 'Mega Hardware', type: 'a hardware store', emoji: '🔨', district: 'market', kind: 'hall' },
  { name: 'London Shoe Store', type: 'a shoe store', emoji: '👟', district: 'market', kind: 'house' },
  { name: 'Usaquén Flea Market', type: 'a flea market', emoji: '🧳', district: 'market', kind: 'hall' },
  { name: 'Brooklyn Barber Shop', type: 'a barber shop', emoji: '💈', district: 'market', kind: 'house' },
  // parkside (north-east)
  { name: 'Hyde Park Zoo', type: 'a zoo', emoji: '🦁', district: 'parkside', kind: 'hall' },
  { name: 'Simón Bolívar Stadium', type: 'a stadium', emoji: '🏟️', district: 'parkside', kind: 'hall' },
  { name: 'Ice Palace Skating Rink', type: 'an ice rink', emoji: '⛸️', district: 'parkside', kind: 'hall' },
  { name: 'Botanical Garden', type: 'a botanical garden', emoji: '🌺', district: 'parkside', kind: 'hall' },
  { name: 'Kids Adventure Park', type: 'a playground', emoji: '🛝', district: 'parkside', kind: 'house' },
  { name: 'Rio Samba Dance Club', type: 'a dance studio', emoji: '💃', district: 'parkside', kind: 'block' },
  { name: 'Planetarium of Bogotá', type: 'a planetarium', emoji: '🔭', district: 'parkside', kind: 'block' },
];

/**
 * What a passenger says to ask for a type of place. The student hears a need,
 * not a name — and picks the place that meets it.
 */
export const TYPE_CLUES: Record<string, string[]> = {
  'a bakery': ['I want to buy some fresh bread.', 'I need a birthday cake.'],
  'a bank': ['I need to take out some money.', 'I want to open a savings account.'],
  'a barber shop': ['I need a haircut and a shave.', 'My beard is too long!'],
  'a bike rental': ['I want to ride a bike around the city today.'],
  'a bike shop': ['My bicycle has a flat tyre.'],
  'a bookstore': ['I want to buy a new novel.', 'I need a dictionary for my English class.'],
  'a bowling alley': ['I want to play ten-pin bowling with my friends.'],
  'a burger place': ['I’m hungry. I want a burger and fries!'],
  'a bus terminal': ['I have to catch a long-distance bus.'],
  "a butcher's": ['I need to buy some meat for dinner.'],
  'a camping store': ['I need a tent and a sleeping bag.'],
  'a candy store': ['I want some sweets and chocolate!'],
  'a car wash': ['My car is really dirty.'],
  'a church': ['My cousin is getting married this morning.', 'I want to go to Mass.'],
  'a cinema': ['I want to watch the new film.', 'Let’s see a movie on the big screen!'],
  'a city hall': ['I need to talk to the mayor.'],
  'a clothing store': ['I need a new jacket and some jeans.'],
  'a coffee shop': ['I need a cup of coffee, now!', 'I’m meeting a friend for a cappuccino.'],
  'a comic shop': ['I collect superhero comics.'],
  'a concert hall': ['I have a ticket for the orchestra tonight.'],
  'a copy shop': ['I need to print twenty copies of my report.'],
  'a courthouse': ['I have to see the judge at ten o’clock.'],
  'a dance studio': ['I take salsa lessons every Friday.', 'I want to learn to dance.'],
  'a delicatessen': ['I want some cheese and ham for a picnic.'],
  'a dental clinic': ['I have a terrible toothache!', 'I need a check-up for my teeth.'],
  'a diner': ['I want pancakes and a milkshake.'],
  'a farmers market': ['I want to buy fresh fruit from the farmers.'],
  'a ferry dock': ['I have to catch the boat to the island.'],
  'a fire station': ['I want to visit the firefighters.'],
  'a fish market': ['I want to buy some fresh fish.'],
  'a flower shop': ['I want to buy roses for my mum.'],
  'a garden center': ['I need some plants and seeds for my garden.'],
  'a gas station': ['My car needs petrol.'],
  "a greengrocer's": ['I need some vegetables for a soup.'],
  'a grocery store': ['I need milk, eggs and rice.'],
  'a gym': ['I want to work out and lift weights.'],
  'a hair salon': ['I want to dye my hair blue!'],
  'a hardware store': ['I need a hammer and some nails.'],
  'a hospital': ['Quick! My friend broke his leg!', 'I’m visiting my grandma — she’s sick.'],
  'a hostel': ['I need a cheap bed for the night.'],
  'a hotel': ['I need a room for two nights.', 'I have a reservation for tonight.'],
  'a jewelry store': ['I want to buy a ring for my girlfriend.'],
  'a juice bar': ['I want a mango smoothie.'],
  'a laundromat': ['I need to wash my clothes.'],
  'a library': ['I want to borrow some books.', 'I need a quiet place to study.'],
  'a museum': ['I want to see ancient gold objects.', 'I love history and dinosaurs.'],
  'a music store': ['I want to buy a guitar.'],
  'a nail salon': ['I want to paint my nails.'],
  'a newsstand': ['I want today’s newspaper.'],
  'a pet shop': ['I want to buy food for my cat.'],
  'a pharmacy': ['I need some medicine for my headache.', 'I need cough syrup.'],
  'a photo studio': ['I need a passport photo.'],
  'a pizzeria': ['I’m starving — I want a pizza!'],
  'a planetarium': ['I want to look at the stars and the planets.'],
  'a police station': ['Someone stole my wallet!', 'I want to report a crime.'],
  'a post office': ['I need to post a letter.', 'I have to send a parcel to Spain.'],
  'a pottery studio': ['I want to make a bowl with clay.'],
  'a radio station': ['I’m the DJ on the morning show!'],
  'a record shop': ['I collect old vinyl records.'],
  'a recycling center': ['I have a lot of bottles and paper to recycle.'],
  'a repair shop': ['My phone screen is broken.'],
  'a restaurant': ['I have a dinner reservation for two.', 'Let’s have a nice meal.'],
  'a school': ['I’m late for my class!', 'I teach maths there.'],
  'a shoe store': ['I need new trainers for running.'],
  'a shopping mall': ['I want to go shopping all afternoon.'],
  'a stadium': ['There’s a big football match today!'],
  'a stationery shop': ['I need pens, notebooks and glue.'],
  'a steakhouse': ['I want a big steak for dinner.'],
  'a supermarket': ['I need to do the weekly shopping.'],
  'a surf shop': ['I need a new surfboard.'],
  'a sushi bar': ['I want to eat Japanese food.'],
  'a swimming pool': ['I want to go swimming.'],
  'a taxi station': ['I start my shift as a taxi driver now.'],
  'a tea house': ['I want a cup of green tea.'],
  'a tourist office': ['I need a map of the city.'],
  'a toy store': ['I want a present for my little brother.'],
  'a train station': ['I have to catch the train to the coast.'],
  'a travel agency': ['I want to book a holiday.'],
  'a vet clinic': ['My dog is sick.', 'My cat needs an injection.'],
  "a watchmaker's": ['My watch stopped working.'],
  'an airport': ['My flight leaves in two hours!', 'I’m flying to London today.'],
  'an aquarium': ['I want to see sharks and jellyfish.'],
  'an arcade': ['I want to play video games.'],
  'an art gallery': ['I love paintings and sculptures.'],
  'an electronics store': ['I need a new laptop charger.'],
  'an empanada shop': ['I want some hot empanadas!'],
  'an ice cream shop': ['It’s so hot! I want an ice cream.'],
  'an ice rink': ['I want to go ice skating.'],
  'an observatory': ['I want to look through a big telescope.'],
  'an optician': ['I need new glasses.'],
  'an outdoor store': ['I need hiking boots for the mountains.'],
  // the new districts
  'an office tower': ['I have a business meeting on the 30th floor.', 'I work in an office downtown.'],
  'a theatre': ['I have tickets for a play tonight.', 'I want to see the actors on stage.'],
  'a boat rental': ['I want to sail a boat today.'],
  'a customs office': ['I need to collect a package from abroad.'],
  'a language school': ['I have my English class in ten minutes!'],
  'a university': ['I study engineering there.', 'I have an exam at the university.'],
  'a science lab': ['I need to do an experiment with my microscope.'],
  'a canteen': ['I want a cheap lunch on campus.'],
  'a car rental': ['I want to rent a car for the weekend.'],
  'a courier office': ['I need to send a package by express.'],
  'a kindergarten': ['I’m picking up my little daughter.'],
  'a health centre': ['I have an appointment with the doctor.'],
  'a spice shop': ['I need cinnamon, pepper and curry.'],
  'a fast food restaurant': ['I want a quick, cheap lunch.'],
  'a flea market': ['I love old, second-hand things.'],
  'a zoo': ['I want to see lions and giraffes!'],
  'a botanical garden': ['I want to see exotic plants and flowers.'],
  'a playground': ['My kids want to play on the swings.'],
};

export function cluesFor(type: string, name: string): string[] {
  return TYPE_CLUES[type] ?? [`Take me to ${name}, please.`];
}
