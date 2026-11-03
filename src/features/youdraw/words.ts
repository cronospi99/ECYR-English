/* You Draw — word banks by CEFR level. Only things that can be drawn: concrete nouns and actions at
   the lower levels, more specific objects, scenes and feelings in the middle, and idioms and
   abstract-but-drawable ideas at the top. Every word appears once per level. */

export type YdLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
export const YD_LEVELS: { id: YdLevel; label: string }[] = [
  { id: 'A1', label: 'A1' }, { id: 'A2', label: 'A2' }, { id: 'B1', label: 'B1' }, { id: 'B2', label: 'B2' }, { id: 'C1', label: 'C1–C2' },
];

const RAW: Record<YdLevel, string> = {
  A1: `cat, dog, fish, bird, cow, pig, horse, duck, chicken, sheep, rabbit, mouse, lion, tiger, elephant, monkey, giraffe, zebra, bear,
snake, frog, turtle, spider, bee, butterfly, ant, shark, whale, dolphin, owl, penguin, crocodile, snail, goat, donkey, apple, banana,
orange, grapes, strawberry, pineapple, watermelon, lemon, cherry, pear, carrot, tomato, potato, corn, egg, bread, cheese, milk, pizza,
cake, ice cream, cookie, candy, sandwich, hamburger, hot dog, chocolate, soup, rice, juice, coffee, salad, popcorn, french fries, donut,
sausage, honey, book, pen, pencil, ruler, eraser, bag, chair, table, door, window, bed, lamp, clock, phone, computer, television, ball,
kite, doll, balloon, cup, plate, spoon, fork, knife, bottle, key, box, umbrella, glasses, camera, guitar, piano, drum, car, bus, bike,
train, plane, boat, ship, truck, taxi, helicopter, rocket, motorcycle, eye, ear, nose, mouth, hand, foot, leg, arm, head, hair, tooth,
finger, face, heart, hat, shirt, T-shirt, dress, skirt, shoes, socks, jacket, coat, pants, shorts, scarf, gloves, cap, boots, sweater,
sun, moon, star, cloud, rain, snow, tree, flower, grass, mountain, river, sea, beach, island, rainbow, fire, leaf, house, school, park,
hospital, zoo, farm, garden, bridge, castle, baby, boy, girl, teacher, doctor, king, queen, clown, pirate, robot, ghost, monster, run,
jump, swim, sleep, eat, drink, read, write, sing, dance, cry, laugh, walk, fly, cook, play, draw, climb, sit, kick, happy, sad, angry,
tired, big, small, tall, hot, cold, circle, square, triangle, door bell, toy, teddy bear, bathtub, sofa, towel, soap, brush, comb,
bread roll, chips, cereal, watch, ring, crown, flag, map, ticket, gift, pizza slice, lollipop, cupcake, jelly, orange juice,
water bottle, school bus, desk, board, backpack, crayon, scissors, glue, paper, notebook, rubber duck, bucket, spade, sandcastle, shell,
crab, octopus, jellyfish, seal, parrot, fox, wolf, deer, kangaroo, panda, koala, camel, hippo, worm, ladybug, bat, chick, puppy, kitten`,

  A2: `fridge, oven, microwave, kettle, mirror, shower, toilet, toothbrush, toothpaste, pillow, blanket, stairs, roof, chimney, fence,
mailbox, carpet, curtains, bookshelf, wardrobe, washing machine, vacuum cleaner, candle, vase, frying pan, teapot, bowl, glass, sink,
police officer, firefighter, farmer, chef, nurse, dentist, pilot, astronaut, singer, painter, builder, waiter, mechanic, scientist,
photographer, hairdresser, mail carrier, lifeguard, cowboy, ambulance, fire truck, police car, tractor, scooter, skateboard, submarine,
sailboat, hot air balloon, traffic light, road, airport, train station, bus stop, gas station, storm, lightning, wind, tornado, snowman,
football, basketball, tennis, baseball, volleyball, golf, boxing, skiing, surfing, cycling, swimming pool, goal, trophy, medal, whistle,
racket, helmet, rhino, gorilla, peacock, flamingo, mosquito, lobster, starfish, squirrel, eagle, seahorse, noodles, spaghetti, pancake,
yogurt, butter, steak, taco, avocado, coconut, mango, peach, broccoli, onion, mushroom, pepper, cucumber, lettuce, garlic, peanut, bacon,
toast, muffin, pie, milkshake, wallet, necklace, earrings, sunglasses, headphones, keyboard, laptop, tablet, remote control, calculator,
calendar, suitcase, tent, ladder, hammer, screwdriver, saw, broom, rope, magnet, battery, light bulb, envelope, stamp, birthday cake,
library, museum, restaurant, supermarket, cinema, stadium, bakery, pharmacy, bank, hotel, desert, jungle, forest, volcano, waterfall,
cave, lake, fishing, paint, shout, wave, clap, think, push, pull, throw, catch, carry, wash, sweep, fall, smile, hug, listen, watch TV,
ride a bike, drive, sneeze, yawn, knock, shoulder, knee, elbow, neck, stomach, thumb, toe, eyebrow, beard, moustache, lips, tongue,
skeleton, brain, sleepy, hungry, thirsty, scared, surprised, sick, strong, weak, fast, slow, wet, dry, dirty, clean, old, young, rich,
poor, full, empty, heavy, light, street, city, village, church, office, factory, prison, playground, swing, slide, kitchen, bedroom,
bathroom, living room, garage, balcony, pyjamas, raincoat, belt, tie, uniform, apron, bracelet, wig, mask, costume,
dinosaur, dragon, unicorn, mermaid, alien, spaceship, planet, earth, sunflower, rose, cactus, palm tree, apple tree, picnic, party,
wedding, concert, parade, circus, magician, juggler, guitar player, drummer, violin, trumpet, flute, microphone, radio, newspaper,
magazine, postcard, passport, money, coin, credit card, shopping cart, shopping bag, receipt, price tag, map of the world, globe,
compass, binoculars, torch, matches, campfire, sleeping bag, backpacking, fishing rod, boat trip, island holiday, beach umbrella, sunscreen`,

  B1: `lighthouse, windmill, skyscraper, traffic jam, roller coaster, ferris wheel, carousel, seesaw, fireworks, birthday party, barbecue,
haunted house, treasure chest, treasure map, pirate ship, satellite, comet, earthquake, flood, hurricane, eclipse, sunrise, sunset,
iceberg, glacier, cliff, valley, swamp, oasis, coral reef, alarm clock, hairdryer, iron, light switch, plug, charger, selfie, video call,
emoji, wifi, architect, judge, journalist, plumber, electrician, surgeon, vet, detective, referee, zookeeper, gardener, baker, butcher,
cashier, tour guide, flight attendant, microscope, thermometer, wheelchair, crutches, bandage, pill, injection, parachute, anchor,
steering wheel, seatbelt, vending machine, escalator, elevator, fountain, statue, monument, tower, pyramid, igloo, hammock, flashlight,
lantern, fire extinguisher, zipper, button, shoelace, bow tie, sunbathe, snorkel, dive, juggle, skate, knit, sew, take a photo,
brush your teeth, tie your shoes, walk the dog, wash the dishes, make the bed, water the plants, go shopping, do homework, play chess,
ride a horse, fly a kite, climb a tree, catch a bus, miss the bus, fall asleep, wake up, get dressed, take a shower, cross the street,
pay the bill, order food, blow out the candles, open a present, plant a tree, build a snowman, feed the ducks, walk on the moon,
chameleon, hedgehog, beaver, raccoon, skunk, porcupine, sloth, ostrich, swan, pelican, woodpecker, seagull, scorpion, caterpillar,
dragonfly, grasshopper, walrus, polar bear, killer whale, stingray, piranha, spider web, bird's nest, beehive, anthill, farmhouse, barn,
cottage, apartment building, motorway, tunnel, crossroads, petrol pump, car wash, parking meter, speed camera, bus driver,
taxi driver, train driver, ticket machine, boarding pass, luggage, customs, souvenir, campsite, mountain bike, canoe,
kayak, rowing boat, jet ski, cable car, chairlift, snowboard, sledge, ice skating, ice hockey, hockey stick, bowling, darts, table tennis,
badminton, karate, judo, wrestling, marathon, finish line, podium, stopwatch, scoreboard, cheerleader, goalkeeper, penalty kick,
headache, toothache, stomachache, sore throat, broken arm, runny nose, fever, cough, plaster cast, x-ray, waiting room, ambulance siren,
hospital bed, fast food, food truck, ice cube, sushi, burger and fries, fried egg, boiled egg, scrambled eggs, cheese sandwich, ketchup,
mustard, salt and pepper, chopsticks, lunch box, picnic basket, tablecloth, napkin, cutlery, kettle boiling, dishwasher, freezer,
blender, toaster, coffee machine, rubbish bin, recycling, compost, greenhouse effect, solar system, astronaut helmet, space station,
moon landing, shooting star, telescope, constellation, magic wand, witch, wizard, fairy, giant, troll, vampire, zombie, mummy, superhero,
cape, villain, princess, prince, knight, castle tower, dungeon, throne, sword, shield, bow and arrow, cannon, maze, puzzle, board game,
dice, playing cards, chess piece, video game, joystick, virtual pet, smartphone, keyboard and mouse, printer, password, laptop bag,
group chat, voice message, online class, homework folder, school uniform, lunch break, school trip, graduation, diploma, report card`,

  B2: `stethoscope, scarecrow, wheelbarrow, avalanche, fingerprint, footprint, handcuffs, magnifying glass, crime scene, jigsaw puzzle,
crossword, sewing machine, typewriter, record player, cassette, windscreen wiper, traffic cone, speed bump, roundabout, zebra crossing,
drawbridge, moat, armour, tsunami, drought, wildfire, landslide, blizzard, heatwave, solar panel, wind turbine, power plant,
recycling bin, pollution, deforestation, greenhouse, cobweb, embarrassed, exhausted, confused, terrified, jealous, bored, disgusted,
furious, nervous, proud, lonely, shy, archaeologist, beekeeper, lumberjack, chimney sweep, conductor, sculptor, tailor, locksmith,
paramedic, pharmacist, acrobat, tightrope walker, stunt double, hitchhike, sleepwalk, marriage proposal, argue, faint, shiver, sweat,
stretch, kneel, bow, salute, wink, frown, blush, stumble, slip on a banana peel, sink, float, melt, freeze, explode, collapse, overflow,
rescue, chase, hide and seek, tug of war, arm wrestling, pillow fight, food fight, snowball fight, high five, piggyback ride, cartwheel,
somersault, handstand, backflip, push-up, sit-up, yoga, meditation, karaoke, graffiti, tattoo, braces, freckles, dimples, wrinkles, bald,
ponytail, braids, curly hair, boomerang, harmonica, accordion, saxophone, harp, xylophone, tambourine, loudspeaker, megaphone,
walkie-talkie, satellite dish, antenna, radar, drone, 3D glasses, virtual reality headset, smartwatch, padlock, safe, piggy bank, barcode,
QR code, conveyor belt, crane, bulldozer, forklift, cement mixer, drill, chainsaw, pliers, wrench, toolbox, nail, screw, hose, sprinkler,
lawn mower, rake, shovel, pitchfork, hay bale, wishing well, quicksand, tornado shelter, hot spring, rainforest, sand dune, mountain peak,
river bank, waterfall pool, rock climbing, bungee jumping, skydiving, paragliding, scuba diving, white-water rafting, horse riding,
mountain climbing, ice fishing, camel ride, safari, zip line, trampoline, water slide, hot tub, sauna, massage, manicure, haircut,
shaving, makeup, perfume, lipstick, nail polish, hair straightener, high heels, flip-flops, sneakers, backpacker, sleeping mask,
earplugs, jet lag, sunburn, mosquito bite, first aid kit, life jacket, lifeboat, shipwreck, desert island, message in a bottle,
treasure hunt, metal detector, gold medal, world record, red card, offside, slam dunk, home run, hole in one, checkmate, photo finish,
time-out, penalty shootout, cheering crowd, mascot, ticket queue, box office, popcorn bucket, movie theater, film director, camera crew,
clapperboard, red carpet, celebrity, autograph, fan club, talent show, judges panel, standing ovation, puppet show, ventriloquist dummy,
magic trick, rabbit in a hat, card trick, fortune teller, crystal ball, horoscope, palm reading, haunted castle, secret passage,
trapdoor, escape room, spy, disguise, secret agent, laser beam, invisible man, time travel, robot arm, artificial leg, wheelchair ramp,
sign language, guide dog, hearing aid, blood donation, vaccine, laboratory, test tube, chemistry set, lab coat, safety goggles, volcano
experiment, DNA, fossil, dinosaur bones, museum guide, ancient ruins, totem pole, hieroglyphics, mummy tomb, Viking ship, knight armour,
medieval castle, battlefield, peace sign, protest march, ballot box, election, prime minister, courtroom, lawyer, jury, prison cell,
pickpocket, burglar, getaway car, police chase, siren, detective hat, clue`,

  C1: `piece of cake, break the ice, under the weather, raining cats and dogs, elephant in the room, once in a blue moon, cold feet,
couch potato, butterflies in your stomach, the ball is in your court, hit the books, spill the beans, let the cat out of the bag,
cost an arm and a leg, a fish out of water, on cloud nine, bite the bullet, burn the midnight oil, cry over spilt milk, when pigs fly,
the tip of the iceberg, in hot water, barking up the wrong tree, head in the clouds, green with envy, a bull in a china shop,
the early bird catches the worm, all ears, hit the nail on the head, time flies, money doesn't grow on trees, walking on eggshells,
the last straw, put all your eggs in one basket, sit on the fence, break a leg, cat got your tongue, apple of my eye, over the moon,
tie the knot, hit the road, a drop in the ocean, brainstorm, bookworm, night owl, early bird, black sheep, top dog, social butterfly,
wet blanket, hot potato, big cheese, smart cookie, cash cow, copycat, bucket list, rat race, red tape, silver lining, small talk,
sweet tooth, chandelier, kaleidoscope, periscope, hourglass, sundial, catapult, gargoyle, scaffolding, assembly line, gramophone,
metronome, abacus, quill, wax seal, monocle, top hat, labyrinth, archipelago, peninsula, stalactite, geyser, whirlpool, mirage,
black hole, meteor shower, aurora, chrysalis, metamorphosis, photosynthesis, evaporation, pendulum, prism, lever, pulley,
domino effect, chain reaction, snowball effect, vicious circle, bottleneck, dead end, U-turn, detour, bystander, eavesdrop,
procrastinate, hibernate, contortionist, daydream, nightmare, déjà vu, hiccups, insomnia, goosebumps, brain freeze, writer's block,
stage fright, peer pressure, multitasking, carbon footprint, global warming, endangered species, urban jungle, skyline, rush hour,
commute, working from home, video conference, fake news, influencer, paparazzi, encore, curtain call, time capsule, time machine,
parallel universe, artificial intelligence, self-driving car, 3D printer, hologram, exoskeleton, wormhole, double-edged
sword, Achilles heel, Trojan horse, Pandora's box, wild goose chase, needle in a haystack, a blessing in disguise, beat around the bush,
call it a day, cut corners, get out of hand, go the extra mile, hang in there, keep your chin up, let off steam, miss the boat,
no pain no gain, on thin ice, out of the blue, pull someone's leg, see the light, steal the show, take it with a pinch of salt,
the best of both worlds, throw in the towel, up in the air, wrap your head around it, your guess is as good as mine, cherry on top,
bring home the bacon, butter someone up, cool as a cucumber, in a nutshell, a hard nut to crack, spill the tea, the big apple,
lion's share, dog days, raining on your parade, fly on the wall, ugly duckling, wolf in sheep's clothing, monkey business,
crocodile tears, guinea pig, sitting duck, busy as a bee, open a can of worms, birds of a feather, cash in your chips, ace up your sleeve,
house of cards, poker face, wild card, blank cheque, ivory tower, glass ceiling, rose-tinted glasses, skeleton in the closet, bite your
tongue, cold shoulder, heart of gold, keep an eye out, lend a hand, see red, face the music, foot the bill, go down in flames,
jump on the bandwagon, light at the end of the tunnel, rock the boat, steal someone's thunder, swim against the tide, the calm before
the storm, tip of my tongue, two left feet, under the spotlight, water under the bridge, window shopping, a storm in a teacup,
bigger fish to fry, every cloud has a silver lining, in the same boat, make waves, safe and sound, slippery slope, castle in the air,
the elephant never forgets, food for thought, full plate, melting pot, recipe for disaster, crash course, learning curve, think outside the box,
moving the goalposts, level playing field, game changer, uphill battle, tip the scales, walk a tightrope, juggling act, balancing act,
smoke and mirrors, behind the scenes, under construction, sign of the times, end of an era, digital detox, information overload,
echo chamber, comfort zone, burnout, sustainability, renewable energy, rising sea levels, melting ice caps, ocean plastic,
supply chain, stock market crash, inflation, bankruptcy, startup, crowdfunding, freelancer, open-plan office, glass skyscraper,
space tourism, Mars colony, gene editing, cloning, organ transplant, wearable technology, facial recognition, surveillance camera,
privacy settings, data breach, firewall, password manager, phishing, viral video, binge-watching, cancel culture, meme, podcast,
livestream, unboxing video, life hack, self-care, mindfulness, gratitude journal, vision board, midlife crisis, empty nest,
generation gap, family tree, coming of age, rite of passage, culture shock, homesick, wanderlust, bucket list trip, road trip,
backpacking across Europe, sleeper train, overbooked flight, lost luggage, layover`,
};

const clean = (s: string) => s.trim().replace(/\s+/g, ' ');
/** Every level's words, deduplicated (case-insensitive). */
export const YD_WORDS: Record<YdLevel, string[]> = Object.fromEntries(
  (Object.keys(RAW) as YdLevel[]).map((lv) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const w of RAW[lv].split(',').map(clean)) {
      const k = w.toLowerCase();
      if (w && !seen.has(k)) { seen.add(k); out.push(w); }
    }
    return [lv, out];
  }),
) as Record<YdLevel, string[]>;
