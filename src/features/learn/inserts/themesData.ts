/** Countries & nationalities, spelling, weather and clothes verbs: data for the lesson inserts. */

export type Ending = '-an / -ian' | '-ese' | '-ish' | 'other';

export interface Country {
  name: string;
  /** Illustrated map + flag from the class deck: public/visuals/vocab/countries/<pic>-map|flag.webp. */
  pic?: string;
  flag: string;
  nat: string;
  ending: Ending;
  continent: string;
  famous: string;
}

export const COUNTRIES: Country[] = [
  { name: 'Colombia', pic: 'colombia', flag: '🇨🇴', nat: 'Colombian', ending: '-an / -ian', continent: 'South America', famous: 'its biodiversity, its two coasts on the Pacific and the Caribbean, the Andes, coffee, tropical fruit and its many traditional dances' },
  { name: 'Mexico', pic: 'mexico', flag: '🇲🇽', nat: 'Mexican', ending: '-an / -ian', continent: 'North America', famous: 'tacos, chilli peppers, mariachis and tequila' },
  { name: 'Brazil', pic: 'brazil', flag: '🇧🇷', nat: 'Brazilian', ending: '-an / -ian', continent: 'South America', famous: 'the Amazon rainforest, football and samba' },
  { name: 'Peru', pic: 'peru', flag: '🇵🇪', nat: 'Peruvian', ending: '-an / -ian', continent: 'South America', famous: 'Inca temples, llamas and the Andes' },
  { name: 'Argentina', pic: 'argentina', flag: '🇦🇷', nat: 'Argentinian', ending: '-an / -ian', continent: 'South America', famous: 'football, tango and beef' },
  { name: 'the United States', pic: 'usa', flag: '🇺🇸', nat: 'American', ending: '-an / -ian', continent: 'North America', famous: 'New York, baseball, deserts and canyons' },
  { name: 'Canada', pic: 'canada', flag: '🇨🇦', nat: 'Canadian', ending: '-an / -ian', continent: 'North America', famous: 'polar bears, glaciers, mountains and forests' },
  { name: 'Italy', pic: 'italy', flag: '🇮🇹', nat: 'Italian', ending: '-an / -ian', continent: 'Europe', famous: 'pizza, the Colosseum, old churches and wine' },
  { name: 'Germany', pic: 'germany', flag: '🇩🇪', nat: 'German', ending: '-an / -ian', continent: 'Europe', famous: 'sausages, castles, cars and being on time' },
  { name: 'Russia', pic: 'russia', flag: '🇷🇺', nat: 'Russian', ending: '-an / -ian', continent: 'Europe and Asia', famous: 'being the biggest country in the world, palaces and very cold winters' },
  { name: 'India', pic: 'india', flag: '🇮🇳', nat: 'Indian', ending: '-an / -ian', continent: 'Asia', famous: 'temples, elephants, spicy food and dance' },
  { name: 'Australia', pic: 'australia', flag: '🇦🇺', nat: 'Australian', ending: '-an / -ian', continent: 'Oceania', famous: 'koalas, kangaroos and the desert' },
  { name: 'Egypt', pic: 'egypt', flag: '🇪🇬', nat: 'Egyptian', ending: '-an / -ian', continent: 'Africa', famous: 'the pyramids, the desert and the River Nile' },
  { name: 'Nigeria', pic: 'nigeria', flag: '🇳🇬', nat: 'Nigerian', ending: '-an / -ian', continent: 'Africa', famous: 'Afrobeats music, Nollywood films and jollof rice' },
  { name: 'South Korea', pic: 'south-korea', flag: '🇰🇷', nat: 'South Korean', ending: '-an / -ian', continent: 'Asia', famous: 'technology, K-pop and kimchi' },
  { name: 'South Africa', pic: 'south-africa', flag: '🇿🇦', nat: 'South African', ending: '-an / -ian', continent: 'Africa', famous: 'wild animals, Table Mountain and the 2010 World Cup' },
  { name: 'Japan', pic: 'japan', flag: '🇯🇵', nat: 'Japanese', ending: '-ese', continent: 'Asia', famous: 'technology, temples, Mount Fuji and anime' },
  { name: 'China', pic: 'china', flag: '🇨🇳', nat: 'Chinese', ending: '-ese', continent: 'Asia', famous: 'pandas, kung fu, temples and the Great Wall' },
  { name: 'Portugal', flag: '🇵🇹', nat: 'Portuguese', ending: '-ese', continent: 'Europe', famous: 'beaches, sardines and fado music' },
  { name: 'Spain', pic: 'spain', flag: '🇪🇸', nat: 'Spanish', ending: '-ish', continent: 'Europe', famous: 'football, flamenco, windmills and old buildings' },
  { name: 'the United Kingdom', pic: 'uk', flag: '🇬🇧', nat: 'British', ending: '-ish', continent: 'Europe', famous: 'the royal family, Big Ben and double-decker buses' },
  { name: 'Poland', pic: 'poland', flag: '🇵🇱', nat: 'Polish', ending: '-ish', continent: 'Europe', famous: 'medieval castles and forests' },
  { name: 'Sweden', pic: 'sweden', flag: '🇸🇪', nat: 'Swedish', ending: '-ish', continent: 'Europe', famous: 'forests, Viking stories and the northern lights' },
  { name: 'Ireland', flag: '🇮🇪', nat: 'Irish', ending: '-ish', continent: 'Europe', famous: 'green fields, castles and music' },
  { name: 'France', pic: 'france', flag: '🇫🇷', nat: 'French', ending: 'other', continent: 'Europe', famous: 'perfume, croissants, wine and the Eiffel Tower' },
  { name: 'Greece', pic: 'greece', flag: '🇬🇷', nat: 'Greek', ending: 'other', continent: 'Europe', famous: 'ancient temples, islands and philosophy' },
  { name: 'the Czech Republic', pic: 'czech-republic', flag: '🇨🇿', nat: 'Czech', ending: 'other', continent: 'Europe', famous: 'castles, ice hockey and bread' },
  { name: 'New Zealand', pic: 'new-zealand', flag: '🇳🇿', nat: 'New Zealander', ending: 'other', continent: 'Oceania', famous: 'mountains, sheep and rugby' },
  { name: 'Thailand', flag: '🇹🇭', nat: 'Thai', ending: 'other', continent: 'Asia', famous: 'beaches, temples and street food' },
];

const V = '/visuals/vocab';
export const mapImg = (c: Country) => (c.pic ? `${V}/countries/${c.pic}-map.webp` : undefined);
export const flagImg = (c: Country) => (c.pic ? `${V}/countries/${c.pic}-flag.webp` : undefined);
/** Continents (illustrated maps from the class deck). */
export const CONTINENTS = [
  { name: 'North America', es: 'América del Norte', img: `${V}/geography/north-america.webp` },
  { name: 'South America', es: 'Suramérica', img: `${V}/geography/south-america.webp` },
  { name: 'Europe', es: 'Europa', img: `${V}/geography/europe.webp` },
  { name: 'Africa', es: 'África', img: `${V}/geography/africa.webp` },
  { name: 'Asia', es: 'Asia', img: `${V}/geography/asia.webp` },
  { name: 'Oceania', es: 'Oceanía', img: `${V}/geography/oceania.webp` },
  { name: 'Antarctica', es: 'la Antártida', img: `${V}/geography/antarctica.webp` },
];

export const describe = (c: Country) => `${cap(c.name)} is a country in ${c.continent}. It is famous for ${c.famous}. People from ${c.name} are ${c.nat}.`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Words spelled letter by letter: listen and write. */
export const SPELL_WORDS = ['watch', 'towel', 'lentils', 'landscape', 'device', 'challenge', 'push', 'success', 'tasks', 'lemonade', 'shirt', 'smartphone', 'computer', 'alphabet', 'quite', 'long', 'jacket', 'yellow', 'queue', 'zebra', 'giraffe', 'hungry', 'Bogota', 'Wednesday'];

// ------------------------------------------------------------------ weather --

/** Weather icons and season cards from the class deck (public/visuals/vocab/weather). */
const W = '/visuals/vocab/weather';

export const SEASONS = [
  { name: 'spring', img: `${W}/spring.webp`, emoji: '🌸', temp: 'cool', es: 'primavera', north: 'March – June', body: 'Flowers grow and nature wakes up again.' },
  { name: 'summer', img: `${W}/summer.webp`, emoji: '☀️', temp: 'hot', es: 'verano', north: 'June – September', body: 'Long days and a lot of heat.' },
  { name: 'autumn / fall', img: `${W}/autumn.webp`, emoji: '🍂', temp: 'warm or cool', es: 'otoño', north: 'September – December', body: 'Trees lose their leaves.' },
  { name: 'winter', img: `${W}/winter.webp`, emoji: '❄️', temp: 'cold', es: 'invierno', north: 'December – March', body: 'It is cold; in some countries it snows.' },
];

export const TEMPS = [
  { w: 'hot', img: `${W}/hot.webp`, range: '28 – 35 °C', ex: 'It’s hot in Cartagena.', color: '#e0442b' },
  { w: 'warm', img: `${W}/warm.webp`, range: '23 – 28 °C', ex: 'It’s warm in Cali.', color: '#f08a24' },
  { w: 'cool', img: `${W}/cool.webp`, range: '17 – 23 °C', ex: 'It’s cool in Medellín.', color: '#1a9fb0' },
  { w: 'cold', img: `${W}/cold.webp`, range: '5 – 17 °C', ex: 'It’s cold in Bogotá at night.', color: '#2b6fd6' },
  { w: 'freezing', img: `${W}/freezing.webp`, range: 'below 0 °C', ex: 'It’s freezing in Moscow in January.', color: '#5b45c8' },
];

export const WEATHER_WORDS = [
  { w: 'sunny', img: `${W}/sunny.webp`, emoji: '☀️', ex: 'It’s a sunny day. Let’s go to the beach!', noun: 'sun' },
  { w: 'cloudy', img: `${W}/cloudy.webp`, emoji: '☁️', ex: 'It’s cloudy today. I can’t see the sun.', noun: 'clouds' },
  { w: 'rainy', img: `${W}/rainy.webp`, emoji: '🌧️', ex: 'It’s a rainy day. Take an umbrella.', noun: 'rain' },
  { w: 'windy', img: `${W}/windy.webp`, emoji: '🌬️', ex: 'It’s windy. Let’s fly a kite!', noun: 'wind' },
  { w: 'stormy', img: `${W}/stormy.webp`, emoji: '⛈️', ex: 'It’s stormy. There’s thunder and lightning.', noun: 'storm' },
  { w: 'snowy', img: `${W}/snowy.webp`, emoji: '🌨️', ex: 'It’s snowy. We can make a snowman.', noun: 'snow' },
  { w: 'foggy', img: `${W}/foggy.webp`, emoji: '🌫️', ex: 'It’s foggy. Drive slowly!', noun: 'fog' },
  { w: 'misty', img: `${W}/misty.webp`, emoji: '🌁', ex: 'It’s a misty morning in the mountains.', noun: 'mist' },
  { w: 'drizzly', img: `${W}/drizzly.webp`, emoji: '🌦️', ex: 'It’s drizzly — just a little rain.', noun: 'drizzle' },
  { w: 'breezy', emoji: '🍃', ex: 'It’s breezy and very nice by the sea.', noun: 'breeze' },
  { w: 'clear', img: `${W}/clear.webp`, emoji: '🌌', ex: 'It’s a clear night. Look at the stars!', noun: 'clear sky' },
  { w: 'humid', emoji: '💦', ex: 'It’s very humid in Barranquilla.', noun: 'humidity' },
];

export const WEATHER_NOUNS = [
  ['⚡', 'lightning', 'relámpago'],
  ['🌩️', 'thunder', 'trueno'],
  ['💧', 'raindrops', 'gotas de lluvia'],
  ['❄️', 'snowflakes', 'copos de nieve'],
  ['🌪️', 'tornado', 'tornado'],
  ['🧊', 'hail', 'granizo'],
  ['🌈', 'rainbow', 'arcoíris'],
  ['🌡️', 'temperature', 'temperatura'],
] as const;

export const WEATHER_VERBS: [string, string, string, string, string][] = [
  ['rain', 'It’s raining.', 'It rained yesterday.', 'It’s going to rain tomorrow.', 'llover'],
  ['snow', 'It’s snowing.', 'It snowed last week.', 'It will snow in the mountains.', 'nevar'],
  ['hail', 'It’s hailing!', 'It hailed in Bogotá yesterday.', 'It might hail tonight.', 'granizar'],
  ['shine', 'The sun is shining.', 'The sun shone all day.', 'The sun will shine tomorrow.', 'brillar'],
  ['blow', 'The wind is blowing.', 'The wind blew hard last night.', 'The wind will blow from the north.', 'soplar'],
  ['pour', 'It’s pouring!', 'It poured all afternoon.', 'It’s going to pour later.', 'llover a cántaros'],
];

export const FORECAST: { city: string; temp: number; words: string[] }[] = [
  { city: 'Bogotá', temp: 12, words: ['windy', 'cloudy', 'cold'] },
  { city: 'Cartagena', temp: 31, words: ['sunny', 'humid', 'hot'] },
  { city: 'Medellín', temp: 22, words: ['drizzly', 'cool'] },
  { city: 'Riohacha', temp: 29, words: ['windy', 'sunny', 'hot'] },
  { city: 'Paipa', temp: 5, words: ['foggy', 'cold'] },
  { city: 'London', temp: 9, words: ['rainy', 'cloudy', 'cold'] },
  { city: 'Toronto', temp: -4, words: ['snowy', 'freezing'] },
];

export const forecastText = (f: (typeof FORECAST)[number]) =>
  `In ${f.city} it’s ${f.temp < 0 ? `minus ${-f.temp}` : f.temp} degrees. It’s ${f.words.slice(0, -1).join(', ')}${f.words.length > 1 ? ' and ' : ''}${f.words[f.words.length - 1]}.`;

// ------------------------------------------------------------------ clothes --

export const WEARING_VERBS = [
  { v: 'wear', es: 'llevar puesto / usar', ex: 'I usually wear jeans and a T-shirt.', note: 'Estado: lo que tienes puesto.' },
  { v: 'put on', es: 'ponerse', ex: 'It’s cold. Put on your jacket!', note: 'Acción: de no tenerlo a tenerlo.' },
  { v: 'take off', es: 'quitarse', ex: 'Take off your shoes, please.', note: 'Acción contraria a put on.' },
  { v: 'get dressed', es: 'vestirse', ex: 'I get dressed at 6:30.', note: 'Ponerse toda la ropa.' },
  { v: 'try on', es: 'probarse', ex: 'Can I try on these boots?', note: 'En la tienda, antes de comprar.' },
  { v: 'change', es: 'cambiarse', ex: 'I change my clothes after the gym.', note: 'Quitarse una ropa y ponerse otra.' },
];

export const WEARING_QUIZ: { q: string; options: string[]; answer: number; why: string }[] = [
  { q: 'Look! Ana is ____ a beautiful red dress.', options: ['wearing', 'putting on', 'taking off'], answer: 0, why: 'Es lo que tiene puesto: wear.' },
  { q: 'It’s raining. ____ your raincoat before you go out.', options: ['Wear', 'Put on', 'Take off'], answer: 1, why: 'Acción de ponérselo: put on.' },
  { q: 'At night I ____ my clothes and put on my pyjamas.', options: ['wear', 'try on', 'take off'], answer: 2, why: 'Quitarse la ropa: take off.' },
  { q: 'Can I ____ these jeans? Where is the fitting room?', options: ['try on', 'wear', 'get dressed'], answer: 0, why: 'En la tienda, probarse: try on.' },
  { q: 'He always ____ a cap when he plays football.', options: ['puts on', 'wears', 'takes off'], answer: 1, why: 'Costumbre de llevarla puesta: wears.' },
  { q: 'Hurry up and ____! The bus leaves in five minutes.', options: ['wear', 'get dressed', 'try on'], answer: 1, why: 'Vestirse: get dressed.' },
];

export const CLOTHES_GROUPS: { title: string; es: string; items: [string, string, string?][] }[] = [
  { title: 'Head & accessories', es: 'Cabeza y accesorios', items: [['🧢', 'cap'], ['👒', 'hat'], ['🧶', 'beanie', 'gorro de lana'], ['👓', 'glasses'], ['💎', 'earrings'], ['📿', 'necklace'], ['😷', 'face mask'], ['🧣', 'scarf']] },
  { title: 'Upper body', es: 'Torso', items: [['👕', 'T-shirt'], ['👚', 'blouse'], ['👔', 'shirt', 'camisa de botones'], ['🎽', 'tank top'], ['🧥', 'jacket'], ['🧶', 'sweater', 'UK: jumper'], ['🧑‍💻', 'hoodie'], ['⛳', 'polo shirt']] },
  { title: 'Legs', es: 'Piernas', items: [['👖', 'jeans'], ['👖', 'pants', 'UK: trousers'], ['🏃', 'joggers'], ['🩳', 'shorts'], ['👗', 'skirt']] },
  { title: 'Feet', es: 'Pies', items: [['👟', 'sneakers', 'UK: trainers'], ['👠', 'high heels'], ['🥾', 'boots'], ['🩴', 'sandals'], ['🥿', 'loafers'], ['🧦', 'socks'], ['🩰', 'slippers', 'pantuflas']] },
  { title: 'Full body', es: 'Cuerpo completo', items: [['👗', 'dress'], ['🤵', 'suit'], ['🧥', 'coat']] },
];

// ------------------------------------------------------------ deck pictures --

/** Icons for the weather verbs and natural phenomena (class deck). */
export const WEATHER_ICON: Record<string, string> = {
  rain: `${W}/verb-rain.webp`,
  snow: `${W}/verb-snow.webp`,
  hail: `${W}/verb-hail.webp`,
  shine: `${W}/verb-shine.webp`,
  blow: `${W}/verb-blow.webp`,
  pour: `${W}/rainy.webp`,
  lightning: `${W}/lightning.webp`,
  thunder: `${W}/stormy.webp`,
  raindrops: `${W}/raindrops.webp`,
  snowflakes: `${W}/snowflakes.webp`,
  tornado: `${W}/tornado.webp`,
  temperature: `${W}/verb-heat.webp`,
};

/** Photos of clothes from the class deck, by the word used in CLOTHES_GROUPS. */
const K = '/visuals/vocab/clothes';
export const CLOTHES_PIC: Record<string, string> = {
  cap: `${K}/cap.webp`,
  beanie: `${K}/beanie.webp`,
  glasses: `${K}/glasses.webp`,
  earrings: `${K}/earrings.webp`,
  necklace: `${K}/necklace.webp`,
  'face mask': `${K}/face-mask.webp`,
  'T-shirt': `${K}/t-shirt.webp`,
  blouse: `${K}/blouse.webp`,
  shirt: `${K}/shirt.webp`,
  'tank top': `${K}/tank-top.webp`,
  jacket: `${K}/jacket.webp`,
  'polo shirt': `${K}/polo-shirt.webp`,
  jeans: `${K}/jeans.webp`,
  pants: `${K}/pants.webp`,
  joggers: `${K}/joggers.webp`,
  shorts: `${K}/shorts.webp`,
  skirt: `${K}/skirt.webp`,
  sneakers: `${K}/sneakers.webp`,
  'high heels': `${K}/high-heels.webp`,
  boots: `${K}/boots.webp`,
  sandals: `${K}/flip-flops.webp`,
  loafers: `${K}/loafers.webp`,
  slippers: `${K}/slippers.webp`,
  dress: `${K}/dress.webp`,
  suit: `${K}/suit.webp`,
};
