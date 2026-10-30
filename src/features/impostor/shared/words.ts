/* Extracted verbatim from project/Impostor.dc.html (Claude Design handoff). */
export type Entry = [word: string, decoy: string, hint: string, topic: string];
export type Level = "A1" | "A2" | "B1" | "B2" | "C1";
export const packs: Record<Level, Entry[]> = {
 "A1": [
  [
   "PIZZA",
   "SOUP",
   "Something you eat",
   "Food"
  ],
  [
   "APPLE",
   "ORANGE",
   "It grows on a tree",
   "Food"
  ],
  [
   "BREAD",
   "RICE",
   "You eat it every day",
   "Food"
  ],
  [
   "MILK",
   "WATER",
   "Something you drink",
   "Food"
  ],
  [
   "DOG",
   "CAT",
   "An animal people keep",
   "Animals"
  ],
  [
   "HORSE",
   "COW",
   "A big farm animal",
   "Animals"
  ],
  [
   "BIRD",
   "FISH",
   "A small animal",
   "Animals"
  ],
  [
   "LION",
   "BEAR",
   "A dangerous animal",
   "Animals"
  ],
  [
   "SCHOOL",
   "HOSPITAL",
   "A big building",
   "Places"
  ],
  [
   "BEACH",
   "PARK",
   "A place to relax",
   "Places"
  ],
  [
   "KITCHEN",
   "BEDROOM",
   "A room in a house",
   "Places"
  ],
  [
   "SHOP",
   "CAFE",
   "You go there in town",
   "Places"
  ],
  [
   "RAIN",
   "SNOW",
   "Weather",
   "Weather"
  ],
  [
   "SUN",
   "WIND",
   "You feel it outside",
   "Weather"
  ],
  [
   "HOT",
   "COLD",
   "How the day feels",
   "Weather"
  ],
  [
   "CLOUD",
   "SKY",
   "You see it above you",
   "Weather"
  ],
  [
   "BUS",
   "TRAIN",
   "It carries people",
   "Travel"
  ],
  [
   "PLANE",
   "BOAT",
   "It takes you far away",
   "Travel"
  ],
  [
   "BIKE",
   "CAR",
   "You use it every day",
   "Travel"
  ],
  [
   "MAP",
   "TICKET",
   "You need it for a trip",
   "Travel"
  ],
  [
   "TEACHER",
   "DOCTOR",
   "A job",
   "Work"
  ],
  [
   "FARMER",
   "DRIVER",
   "A job outdoors",
   "Work"
  ],
  [
   "POLICE OFFICER",
   "FIREFIGHTER",
   "A job that helps people",
   "Work"
  ],
  [
   "COOK",
   "SINGER",
   "A job on TV",
   "Work"
  ],
  [
   "HAPPY",
   "TIRED",
   "How you can feel",
   "Feelings"
  ],
  [
   "ANGRY",
   "SAD",
   "A bad feeling",
   "Feelings"
  ],
  [
   "HUNGRY",
   "THIRSTY",
   "Your body tells you",
   "Feelings"
  ],
  [
   "AFRAID",
   "SURPRISED",
   "A sudden feeling",
   "Feelings"
  ],
  [
   "FOOTBALL",
   "BASKETBALL",
   "A sport with a ball",
   "Sports"
  ],
  [
   "SWIMMING",
   "RUNNING",
   "You do it to keep fit",
   "Sports"
  ],
  [
   "TEAM",
   "COACH",
   "Part of a sport",
   "Sports"
  ],
  [
   "BALL",
   "SHOES",
   "You need it to play",
   "Sports"
  ],
  [
   "PHONE",
   "COMPUTER",
   "You look at the screen",
   "Technology"
  ],
  [
   "TELEVISION",
   "RADIO",
   "It's in the living room",
   "Technology"
  ],
  [
   "CAMERA",
   "HEADPHONES",
   "A thing you carry",
   "Technology"
  ],
  [
   "BATTERY",
   "CHARGER",
   "Your phone needs it",
   "Technology"
  ],
  [
   "KITCHEN",
   "GARDEN",
   "Part of a house",
   "Home"
  ],
  [
   "BED",
   "SOFA",
   "You sit or lie on it",
   "Home"
  ],
  [
   "TABLE",
   "CHAIR",
   "Furniture in a room",
   "Home"
  ],
  [
   "MOTHER",
   "FATHER",
   "Someone in your family",
   "Home"
  ],
  [
   "TEACHER",
   "STUDENT",
   "A person in a school",
   "School"
  ],
  [
   "PENCIL",
   "BOOK",
   "You use it in class",
   "School"
  ],
  [
   "HOMEWORK",
   "TEST",
   "You do it for school",
   "School"
  ],
  [
   "CLASSROOM",
   "PLAYGROUND",
   "A place in a school",
   "School"
  ]
 ],
 "A2": [
  [
   "BREAKFAST",
   "DINNER",
   "A meal",
   "Food"
  ],
  [
   "SUPERMARKET",
   "MARKET",
   "You spend money here",
   "Food"
  ],
  [
   "SANDWICH",
   "SALAD",
   "A light lunch",
   "Food"
  ],
  [
   "CHOCOLATE",
   "ICE CREAM",
   "A sweet treat",
   "Food"
  ],
  [
   "ELEPHANT",
   "GIRAFFE",
   "A big wild animal",
   "Animals"
  ],
  [
   "SPIDER",
   "BEE",
   "A small animal people fear",
   "Animals"
  ],
  [
   "PENGUIN",
   "SEAL",
   "It lives somewhere cold",
   "Animals"
  ],
  [
   "SNAKE",
   "CROCODILE",
   "A reptile",
   "Animals"
  ],
  [
   "LIBRARY",
   "MUSEUM",
   "A quiet building",
   "Places"
  ],
  [
   "MOUNTAIN",
   "HILL",
   "Part of a landscape",
   "Places"
  ],
  [
   "RESTAURANT",
   "HOTEL",
   "You pay to be there",
   "Places"
  ],
  [
   "VILLAGE",
   "ISLAND",
   "A small place to live",
   "Places"
  ],
  [
   "WINTER",
   "AUTUMN",
   "A time of year",
   "Weather"
  ],
  [
   "STORM",
   "FOG",
   "Difficult weather",
   "Weather"
  ],
  [
   "UMBRELLA",
   "RAINCOAT",
   "You use it when it rains",
   "Weather"
  ],
  [
   "SUNGLASSES",
   "SUNCREAM",
   "For a bright day",
   "Weather"
  ],
  [
   "AIRPORT",
   "TRAIN STATION",
   "People travel from here",
   "Travel"
  ],
  [
   "SUITCASE",
   "BACKPACK",
   "You pack it for a trip",
   "Travel"
  ],
  [
   "PASSPORT",
   "BOARDING PASS",
   "You show it to travel",
   "Travel"
  ],
  [
   "TAXI",
   "FERRY",
   "You pay for the journey",
   "Travel"
  ],
  [
   "NURSE",
   "WAITER",
   "A job with people",
   "Work"
  ],
  [
   "OFFICE",
   "FACTORY",
   "A place people work",
   "Work"
  ],
  [
   "MECHANIC",
   "ELECTRICIAN",
   "A job with your hands",
   "Work"
  ],
  [
   "SALARY",
   "UNIFORM",
   "Part of having a job",
   "Work"
  ],
  [
   "EXCITED",
   "BORED",
   "A feeling in class",
   "Feelings"
  ],
  [
   "BIRTHDAY",
   "WEDDING",
   "A day people celebrate",
   "Feelings"
  ],
  [
   "WORRIED",
   "CONFUSED",
   "A feeling before a test",
   "Feelings"
  ],
  [
   "PROUD",
   "SHY",
   "A feeling about yourself",
   "Feelings"
  ],
  [
   "TENNIS",
   "VOLLEYBALL",
   "A sport with a net",
   "Sports"
  ],
  [
   "CYCLING",
   "SKIING",
   "A sport with equipment",
   "Sports"
  ],
  [
   "STADIUM",
   "GYM",
   "Where people train",
   "Sports"
  ],
  [
   "MEDAL",
   "TROPHY",
   "You win it",
   "Sports"
  ],
  [
   "LAPTOP",
   "TABLET",
   "You type on it",
   "Technology"
  ],
  [
   "INTERNET",
   "WIFI",
   "You connect to it",
   "Technology"
  ],
  [
   "PASSWORD",
   "USERNAME",
   "You need it to log in",
   "Technology"
  ],
  [
   "VIDEO GAME",
   "APP",
   "You use it for fun",
   "Technology"
  ],
  [
   "BALCONY",
   "BASEMENT",
   "Part of a building",
   "Home"
  ],
  [
   "WASHING MACHINE",
   "FRIDGE",
   "A machine at home",
   "Home"
  ],
  [
   "HOUSEWORK",
   "COOKING",
   "A job at home",
   "Home"
  ],
  [
   "NEIGHBOUR",
   "FLATMATE",
   "Someone near your home",
   "Home"
  ],
  [
   "EXAM",
   "PRESENTATION",
   "You prepare for it",
   "School"
  ],
  [
   "TIMETABLE",
   "REPORT CARD",
   "Paper from school",
   "School"
  ],
  [
   "MATHS",
   "HISTORY",
   "A school subject",
   "School"
  ],
  [
   "BREAK TIME",
   "SCHOOL TRIP",
   "The best part of school",
   "School"
  ]
 ],
 "B1": [
  [
   "RECIPE",
   "MENU",
   "Something you read before eating",
   "Food"
  ],
  [
   "STREET FOOD",
   "TAKEAWAY",
   "A quick meal",
   "Food"
  ],
  [
   "VEGETARIAN",
   "ALLERGY",
   "It changes what you order",
   "Food"
  ],
  [
   "BARBECUE",
   "PICNIC",
   "Eating outdoors",
   "Food"
  ],
  [
   "STRAY DOG",
   "PET SHOP",
   "Animals in a city",
   "Animals"
  ],
  [
   "ZOO",
   "AQUARIUM",
   "You go to see animals",
   "Animals"
  ],
  [
   "VET",
   "ANIMAL SHELTER",
   "Where animals get help",
   "Animals"
  ],
  [
   "JELLYFISH",
   "SHARK",
   "You fear it in the sea",
   "Animals"
  ],
  [
   "TRAFFIC JAM",
   "QUEUE",
   "Something that wastes time",
   "Places"
  ],
  [
   "SHOPPING MALL",
   "TOWN SQUARE",
   "A crowded place",
   "Places"
  ],
  [
   "NEIGHBOURHOOD",
   "CAMPUS",
   "Somewhere you spend your week",
   "Places"
  ],
  [
   "GYM",
   "SWIMMING POOL",
   "You go there to move",
   "Places"
  ],
  [
   "HEATWAVE",
   "FLOOD",
   "Extreme weather",
   "Weather"
  ],
  [
   "SUNBURN",
   "HEADACHE",
   "Something that hurts",
   "Weather"
  ],
  [
   "FORECAST",
   "TEMPERATURE",
   "You check it in the morning",
   "Weather"
  ],
  [
   "THUNDERSTORM",
   "HAIL",
   "Loud weather",
   "Weather"
  ],
  [
   "CAMPING",
   "HIKING",
   "An outdoor activity",
   "Travel"
  ],
  [
   "ROAD TRIP",
   "CRUISE",
   "A long holiday",
   "Travel"
  ],
  [
   "HOSTEL",
   "GUESTHOUSE",
   "Cheap somewhere to sleep",
   "Travel"
  ],
  [
   "SOUVENIR",
   "POSTCARD",
   "You bring it home",
   "Travel"
  ],
  [
   "JOB INTERVIEW",
   "EXAM",
   "A stressful situation",
   "Work"
  ],
  [
   "DEADLINE",
   "APPOINTMENT",
   "Something in your calendar",
   "Work"
  ],
  [
   "PART-TIME JOB",
   "INTERNSHIP",
   "Work while you study",
   "Work"
  ],
  [
   "TEAMWORK",
   "OVERTIME",
   "Part of working life",
   "Work"
  ],
  [
   "HOMESICK",
   "NERVOUS",
   "A feeling",
   "Feelings"
  ],
  [
   "JEALOUS",
   "GUILTY",
   "A feeling you hide",
   "Feelings"
  ],
  [
   "RELIEVED",
   "DISAPPOINTED",
   "A feeling after results",
   "Feelings"
  ],
  [
   "EMBARRASSED",
   "OFFENDED",
   "A feeling in front of others",
   "Feelings"
  ],
  [
   "WORLD CUP",
   "OLYMPICS",
   "A huge competition",
   "Sports"
  ],
  [
   "REFEREE",
   "PENALTY",
   "It decides a match",
   "Sports"
  ],
  [
   "PERSONAL TRAINER",
   "MARATHON",
   "Serious about fitness",
   "Sports"
  ],
  [
   "INJURY",
   "WARM-UP",
   "Part of playing sport",
   "Sports"
  ],
  [
   "SOCIAL MEDIA",
   "STREAMING",
   "How people spend hours",
   "Technology"
  ],
  [
   "SMARTPHONE",
   "SMARTWATCH",
   "A device people wear or hold",
   "Technology"
  ],
  [
   "SOFTWARE UPDATE",
   "STORAGE FULL",
   "An annoying message",
   "Technology"
  ],
  [
   "ONLINE SHOPPING",
   "VIDEO CALL",
   "Something you do online",
   "Technology"
  ],
  [
   "RENT",
   "DEPOSIT",
   "You pay it for a flat",
   "Home"
  ],
  [
   "FURNITURE",
   "DECORATION",
   "It makes a room yours",
   "Home"
  ],
  [
   "CHORES",
   "TIDYING UP",
   "Nobody wants to do it",
   "Home"
  ],
  [
   "MOVING HOUSE",
   "HOUSE PARTY",
   "A big day at home",
   "Home"
  ],
  [
   "REVISION",
   "DEADLINE",
   "Before an exam",
   "School"
  ],
  [
   "SCHOLARSHIP",
   "TUITION",
   "School and money",
   "School"
  ],
  [
   "GROUP PROJECT",
   "ORAL EXAM",
   "Work you do in class",
   "School"
  ],
  [
   "GRADUATION",
   "DETENTION",
   "A day you remember",
   "School"
  ]
 ],
 "B2": [
  [
   "FAST FOOD",
   "COMFORT FOOD",
   "Food people eat too much of",
   "Food"
  ],
  [
   "FOOD WASTE",
   "LEFTOVERS",
   "What ends up in the bin",
   "Food"
  ],
  [
   "ORGANIC PRODUCE",
   "PROCESSED FOOD",
   "A label on the shelf",
   "Food"
  ],
  [
   "MEAL PREP",
   "CRAVING",
   "How people manage eating",
   "Food"
  ],
  [
   "ENDANGERED SPECIES",
   "WILDLIFE PARK",
   "Conservation topic",
   "Animals"
  ],
  [
   "GUIDE DOG",
   "THERAPY CAT",
   "An animal that helps people",
   "Animals"
  ],
  [
   "MIGRATION",
   "HIBERNATION",
   "What animals do seasonally",
   "Animals"
  ],
  [
   "INVASIVE SPECIES",
   "BREEDING PROGRAMME",
   "Managing wildlife",
   "Animals"
  ],
  [
   "SUBURB",
   "CITY CENTRE",
   "Where people live",
   "Places"
  ],
  [
   "LANDLORD",
   "NEIGHBOUR",
   "A person where you live",
   "Places"
  ],
  [
   "RENT",
   "MORTGAGE",
   "You pay it to have a home",
   "Places"
  ],
  [
   "COMMUTE",
   "RUSH HOUR",
   "Moving through a city",
   "Places"
  ],
  [
   "CLIMATE CHANGE",
   "AIR POLLUTION",
   "A global problem",
   "Weather"
  ],
  [
   "JET LAG",
   "INSOMNIA",
   "It affects your sleep",
   "Weather"
  ],
  [
   "DROUGHT",
   "WILDFIRE",
   "A dry-season disaster",
   "Weather"
  ],
  [
   "MICROCLIMATE",
   "SEA BREEZE",
   "Local weather",
   "Weather"
  ],
  [
   "ECO-TOURISM",
   "BACKPACKING",
   "A way of travelling",
   "Travel"
  ],
  [
   "DELAYED FLIGHT",
   "LOST LUGGAGE",
   "Travel going wrong",
   "Travel"
  ],
  [
   "TRAVEL INSURANCE",
   "VISA",
   "Paperwork before you go",
   "Travel"
  ],
  [
   "LAYOVER",
   "CONNECTION",
   "Between two flights",
   "Travel"
  ],
  [
   "START-UP",
   "FAMILY BUSINESS",
   "A kind of company",
   "Work"
  ],
  [
   "PAPERWORK",
   "SMALL PRINT",
   "Something slow and official",
   "Work"
  ],
  [
   "REMOTE WORK",
   "FREELANCING",
   "Working without an office",
   "Work"
  ],
  [
   "PROMOTION",
   "REDUNDANCY",
   "News from your manager",
   "Work"
  ],
  [
   "NOSTALGIA",
   "REGRET",
   "An emotion about the past",
   "Feelings"
  ],
  [
   "PEER PRESSURE",
   "GOSSIP",
   "Something social and unpleasant",
   "Feelings"
  ],
  [
   "PROCRASTINATE",
   "DAYDREAM",
   "What you do instead of working",
   "Feelings"
  ],
  [
   "EMPATHY",
   "RESENTMENT",
   "How you feel about others",
   "Feelings"
  ],
  [
   "DOPING",
   "SPONSORSHIP",
   "Money and rules in sport",
   "Sports"
  ],
  [
   "TRANSFER WINDOW",
   "HOME ADVANTAGE",
   "Football talk",
   "Sports"
  ],
  [
   "ENDURANCE",
   "REHABILITATION",
   "An athlete's body",
   "Sports"
  ],
  [
   "FAN CULTURE",
   "AMATEUR LEAGUE",
   "Sport beyond the pros",
   "Sports"
  ],
  [
   "ALGORITHM",
   "SCREEN TIME",
   "How tech shapes your day",
   "Technology"
  ],
  [
   "DATA PRIVACY",
   "CLOUD STORAGE",
   "Where your files live",
   "Technology"
  ],
  [
   "ARTIFICIAL INTELLIGENCE",
   "AUTOMATION",
   "Machines doing our work",
   "Technology"
  ],
  [
   "PLANNED OBSOLESCENCE",
   "TECH SUPPORT",
   "When devices fail",
   "Technology"
  ],
  [
   "OPEN-PLAN LIVING",
   "HOME OFFICE",
   "How homes changed",
   "Home"
  ],
  [
   "MINIMALISM",
   "CLUTTER",
   "How much you keep",
   "Home"
  ],
  [
   "FLATSHARE",
   "EMPTY NEST",
   "Who lives with you",
   "Home"
  ],
  [
   "RENOVATION",
   "UTILITY BILL",
   "The cost of a home",
   "Home"
  ],
  [
   "CURRICULUM",
   "ASSESSMENT",
   "How a course is built",
   "School"
  ],
  [
   "PLAGIARISM",
   "PEER REVIEW",
   "Academic honesty",
   "School"
  ],
  [
   "DROP-OUT RATE",
   "CLASS SIZE",
   "A statistic about schools",
   "School"
  ],
  [
   "LIFELONG LEARNING",
   "GAP YEAR",
   "Education off the main path",
   "School"
  ]
 ],
 "C1": [
  [
   "FOOD SECURITY",
   "SUPPLY CHAIN",
   "Behind what we eat",
   "Food"
  ],
  [
   "FINE DINING",
   "FOOD FAD",
   "Eating as a statement",
   "Food"
  ],
  [
   "FOOD DESERT",
   "SUBSIDY",
   "Politics of eating",
   "Food"
  ],
  [
   "FERMENTATION",
   "PRESERVATIVE",
   "How food is kept",
   "Food"
  ],
  [
   "REWILDING",
   "HABITAT LOSS",
   "Nature under pressure",
   "Animals"
  ],
  [
   "ANIMAL TESTING",
   "FACTORY FARMING",
   "An ethical debate",
   "Animals"
  ],
  [
   "BIODIVERSITY",
   "POACHING",
   "Wildlife under threat",
   "Animals"
  ],
  [
   "ANTHROPOMORPHISM",
   "DOMESTICATION",
   "How we relate to animals",
   "Animals"
  ],
  [
   "GENTRIFICATION",
   "URBAN SPRAWL",
   "A change in a city",
   "Places"
  ],
  [
   "ECHO CHAMBER",
   "RUMOUR MILL",
   "Somewhere ideas spread",
   "Places"
  ],
  [
   "ZONING",
   "HOUSING CRISIS",
   "Argued about at city hall",
   "Places"
  ],
  [
   "PUBLIC SPACE",
   "PRIVATISATION",
   "Who owns the street",
   "Places"
  ],
  [
   "EXTREME WEATHER",
   "CARBON FOOTPRINT",
   "Climate vocabulary",
   "Weather"
  ],
  [
   "SEASONAL AFFECTIVE DISORDER",
   "CABIN FEVER",
   "Weather and the mind",
   "Weather"
  ],
  [
   "TIPPING POINT",
   "MITIGATION",
   "Climate policy language",
   "Weather"
  ],
  [
   "HEAT ISLAND",
   "PERMAFROST",
   "A warming symptom",
   "Weather"
  ],
  [
   "CULTURE SHOCK",
   "HOMESICKNESS",
   "What travellers experience",
   "Travel"
  ],
  [
   "OVERTOURISM",
   "DIGITAL NOMAD",
   "Modern travel",
   "Travel"
  ],
  [
   "EXPATRIATE",
   "REPATRIATION",
   "Living abroad",
   "Travel"
  ],
  [
   "OFF THE BEATEN TRACK",
   "TOURIST TRAP",
   "How a place is judged",
   "Travel"
  ],
  [
   "IMPOSTOR SYNDROME",
   "BURNOUT",
   "Something people feel at work",
   "Work"
  ],
  [
   "RED TAPE",
   "LOOPHOLE",
   "Something inside a system",
   "Work"
  ],
  [
   "GIG ECONOMY",
   "JOB SECURITY",
   "Modern employment",
   "Work"
  ],
  [
   "GLASS CEILING",
   "NEPOTISM",
   "An unfair advantage",
   "Work"
  ],
  [
   "SMALL TALK",
   "BANTER",
   "A type of conversation",
   "Feelings"
  ],
  [
   "WHISTLEBLOWER",
   "SCAPEGOAT",
   "A role a person is given",
   "Feelings"
  ],
  [
   "SCHADENFREUDE",
   "VINDICATION",
   "A complicated satisfaction",
   "Feelings"
  ],
  [
   "MORAL DILEMMA",
   "GUT FEELING",
   "How you decide",
   "Feelings"
  ],
  [
   "SPORTSWASHING",
   "MATCH-FIXING",
   "Sport and corruption",
   "Sports"
  ],
  [
   "MENTAL RESILIENCE",
   "PEAK PERFORMANCE",
   "The elite mindset",
   "Sports"
  ],
  [
   "GRASSROOTS FUNDING",
   "TALENT PIPELINE",
   "Where athletes come from",
   "Sports"
  ],
  [
   "CONCUSSION PROTOCOL",
   "GENDER PARITY",
   "Debated in modern sport",
   "Sports"
  ],
  [
   "SURVEILLANCE CAPITALISM",
   "DIGITAL FOOTPRINT",
   "The price of being online",
   "Technology"
  ],
  [
   "ALGORITHMIC BIAS",
   "DEEPFAKE",
   "When technology deceives",
   "Technology"
  ],
  [
   "DIGITAL DIVIDE",
   "TECH LITERACY",
   "Who gets left behind",
   "Technology"
  ],
  [
   "SURVEILLANCE STATE",
   "ENCRYPTION",
   "Privacy and power",
   "Technology"
  ],
  [
   "INTERGENERATIONAL LIVING",
   "DOWNSIZING",
   "Rethinking the household",
   "Home"
  ],
  [
   "ENERGY EFFICIENCY",
   "RETROFITTING",
   "Improving old homes",
   "Home"
  ],
  [
   "DOMESTIC LABOUR",
   "WORK-LIFE BOUNDARY",
   "Home as a workplace",
   "Home"
  ],
  [
   "SOCIAL HOUSING",
   "PROPERTY LADDER",
   "Housing and class",
   "Home"
  ],
  [
   "ROTE LEARNING",
   "CRITICAL THINKING",
   "Two ways to teach",
   "School"
  ],
  [
   "STANDARDISED TESTING",
   "GRADE INFLATION",
   "Measuring students",
   "School"
  ],
  [
   "ACADEMIC PRESSURE",
   "SAFEGUARDING",
   "Concerns in schools",
   "School"
  ],
  [
   "INCLUSIVE EDUCATION",
   "STREAMING BY ABILITY",
   "How classes are formed",
   "School"
  ]
 ]
};
export const packsEs: Record<Level, Entry[]> = {
 "A1": [
  [
   "PIZZA",
   "SOPA",
   "Algo que comes",
   "Food"
  ],
  [
   "MANZANA",
   "NARANJA",
   "Crece en un árbol",
   "Food"
  ],
  [
   "PAN",
   "ARROZ",
   "Lo comes todos los días",
   "Food"
  ],
  [
   "LECHE",
   "AGUA",
   "Algo que bebes",
   "Food"
  ],
  [
   "PERRO",
   "GATO",
   "Un animal de casa",
   "Animals"
  ],
  [
   "CABALLO",
   "VACA",
   "Un animal grande de granja",
   "Animals"
  ],
  [
   "PÁJARO",
   "PEZ",
   "Un animal pequeño",
   "Animals"
  ],
  [
   "LEÓN",
   "OSO",
   "Un animal peligroso",
   "Animals"
  ],
  [
   "COLEGIO",
   "HOSPITAL",
   "Un edificio grande",
   "Places"
  ],
  [
   "PLAYA",
   "PARQUE",
   "Un lugar para descansar",
   "Places"
  ],
  [
   "COCINA",
   "DORMITORIO",
   "Una parte de la casa",
   "Places"
  ],
  [
   "TIENDA",
   "CAFETERÍA",
   "Vas allí en la ciudad",
   "Places"
  ],
  [
   "LLUVIA",
   "NIEVE",
   "El tiempo",
   "Weather"
  ],
  [
   "SOL",
   "VIENTO",
   "Lo sientes fuera",
   "Weather"
  ],
  [
   "CALOR",
   "FRÍO",
   "Cómo es el día",
   "Weather"
  ],
  [
   "NUBE",
   "CIELO",
   "Lo ves arriba",
   "Weather"
  ],
  [
   "AUTOBÚS",
   "TREN",
   "Lleva personas",
   "Travel"
  ],
  [
   "AVIÓN",
   "BARCO",
   "Te lleva lejos",
   "Travel"
  ],
  [
   "BICICLETA",
   "COCHE",
   "Lo usas cada día",
   "Travel"
  ],
  [
   "MAPA",
   "BILLETE",
   "Lo necesitas para un viaje",
   "Travel"
  ],
  [
   "PROFESOR",
   "MÉDICO",
   "Un trabajo",
   "Work"
  ],
  [
   "AGRICULTOR",
   "CONDUCTOR",
   "Un trabajo al aire libre",
   "Work"
  ],
  [
   "POLICÍA",
   "BOMBERO",
   "Un trabajo que ayuda a la gente",
   "Work"
  ],
  [
   "COCINERO",
   "CANTANTE",
   "Un trabajo en la tele",
   "Work"
  ],
  [
   "FELIZ",
   "CANSADO",
   "Cómo te puedes sentir",
   "Feelings"
  ],
  [
   "ENFADADO",
   "TRISTE",
   "Un sentimiento malo",
   "Feelings"
  ],
  [
   "HAMBRE",
   "SED",
   "Tu cuerpo te lo dice",
   "Feelings"
  ],
  [
   "MIEDO",
   "SORPRESA",
   "Un sentimiento repentino",
   "Feelings"
  ],
  [
   "FÚTBOL",
   "BALONCESTO",
   "Un deporte con pelota",
   "Sports"
  ],
  [
   "NATACIÓN",
   "CORRER",
   "Lo haces para estar en forma",
   "Sports"
  ],
  [
   "EQUIPO",
   "ENTRENADOR",
   "Parte de un deporte",
   "Sports"
  ],
  [
   "PELOTA",
   "ZAPATILLAS",
   "Lo necesitas para jugar",
   "Sports"
  ],
  [
   "TELÉFONO",
   "ORDENADOR",
   "Miras la pantalla",
   "Technology"
  ],
  [
   "TELEVISIÓN",
   "RADIO",
   "Está en el salón",
   "Technology"
  ],
  [
   "CÁMARA",
   "AURICULARES",
   "Algo que llevas contigo",
   "Technology"
  ],
  [
   "BATERÍA",
   "CARGADOR",
   "Tu móvil lo necesita",
   "Technology"
  ],
  [
   "BAÑO",
   "JARDÍN",
   "Parte de una casa",
   "Home"
  ],
  [
   "CAMA",
   "SOFÁ",
   "Te sientas o te tumbas en él",
   "Home"
  ],
  [
   "MESA",
   "SILLA",
   "Muebles de una habitación",
   "Home"
  ],
  [
   "MADRE",
   "PADRE",
   "Alguien de tu familia",
   "Home"
  ],
  [
   "MAESTRO",
   "ALUMNO",
   "Una persona del colegio",
   "School"
  ],
  [
   "LÁPIZ",
   "LIBRO",
   "Lo usas en clase",
   "School"
  ],
  [
   "DEBERES",
   "EXAMEN",
   "Lo haces para el colegio",
   "School"
  ],
  [
   "AULA",
   "PATIO",
   "Un lugar del colegio",
   "School"
  ]
 ],
 "A2": [
  [
   "DESAYUNO",
   "CENA",
   "Una comida del día",
   "Food"
  ],
  [
   "SUPERMERCADO",
   "MERCADO",
   "Gastas dinero aquí",
   "Food"
  ],
  [
   "BOCADILLO",
   "ENSALADA",
   "Un almuerzo ligero",
   "Food"
  ],
  [
   "CHOCOLATE",
   "HELADO",
   "Algo dulce",
   "Food"
  ],
  [
   "ELEFANTE",
   "JIRAFA",
   "Un animal salvaje grande",
   "Animals"
  ],
  [
   "ARAÑA",
   "ABEJA",
   "Un animal pequeño que da miedo",
   "Animals"
  ],
  [
   "PINGÜINO",
   "FOCA",
   "Vive en un lugar frío",
   "Animals"
  ],
  [
   "SERPIENTE",
   "COCODRILO",
   "Un reptil",
   "Animals"
  ],
  [
   "BIBLIOTECA",
   "MUSEO",
   "Un edificio tranquilo",
   "Places"
  ],
  [
   "MONTAÑA",
   "COLINA",
   "Parte del paisaje",
   "Places"
  ],
  [
   "RESTAURANTE",
   "HOTEL",
   "Pagas por estar allí",
   "Places"
  ],
  [
   "PUEBLO",
   "ISLA",
   "Un lugar pequeño para vivir",
   "Places"
  ],
  [
   "INVIERNO",
   "OTOÑO",
   "Una época del año",
   "Weather"
  ],
  [
   "TORMENTA",
   "NIEBLA",
   "Tiempo difícil",
   "Weather"
  ],
  [
   "PARAGUAS",
   "IMPERMEABLE",
   "Lo usas cuando llueve",
   "Weather"
  ],
  [
   "GAFAS DE SOL",
   "CREMA SOLAR",
   "Para un día de sol",
   "Weather"
  ],
  [
   "AEROPUERTO",
   "ESTACIÓN DE TREN",
   "La gente viaja desde aquí",
   "Travel"
  ],
  [
   "MALETA",
   "MOCHILA",
   "La preparas para un viaje",
   "Travel"
  ],
  [
   "PASAPORTE",
   "TARJETA DE EMBARQUE",
   "Lo enseñas para viajar",
   "Travel"
  ],
  [
   "TAXI",
   "FERRI",
   "Pagas por el trayecto",
   "Travel"
  ],
  [
   "ENFERMERO",
   "CAMARERO",
   "Un trabajo con gente",
   "Work"
  ],
  [
   "OFICINA",
   "FÁBRICA",
   "Un lugar de trabajo",
   "Work"
  ],
  [
   "MECÁNICO",
   "ELECTRICISTA",
   "Un trabajo con las manos",
   "Work"
  ],
  [
   "SUELDO",
   "UNIFORME",
   "Parte de tener un trabajo",
   "Work"
  ],
  [
   "EMOCIONADO",
   "ABURRIDO",
   "Un sentimiento en clase",
   "Feelings"
  ],
  [
   "CUMPLEAÑOS",
   "BODA",
   "Un día para celebrar",
   "Feelings"
  ],
  [
   "PREOCUPADO",
   "CONFUNDIDO",
   "Un sentimiento antes de un examen",
   "Feelings"
  ],
  [
   "ORGULLOSO",
   "TÍMIDO",
   "Un sentimiento sobre ti",
   "Feelings"
  ],
  [
   "TENIS",
   "VOLEIBOL",
   "Un deporte con red",
   "Sports"
  ],
  [
   "CICLISMO",
   "ESQUÍ",
   "Un deporte con equipo especial",
   "Sports"
  ],
  [
   "ESTADIO",
   "GIMNASIO",
   "Donde se entrena",
   "Sports"
  ],
  [
   "MEDALLA",
   "TROFEO",
   "Lo ganas",
   "Sports"
  ],
  [
   "PORTÁTIL",
   "TABLETA",
   "Escribes en él",
   "Technology"
  ],
  [
   "INTERNET",
   "WIFI",
   "Te conectas a él",
   "Technology"
  ],
  [
   "CONTRASEÑA",
   "USUARIO",
   "Lo necesitas para entrar",
   "Technology"
  ],
  [
   "VIDEOJUEGO",
   "APLICACIÓN",
   "Lo usas para divertirte",
   "Technology"
  ],
  [
   "BALCÓN",
   "SÓTANO",
   "Parte de un edificio",
   "Home"
  ],
  [
   "LAVADORA",
   "NEVERA",
   "Una máquina de casa",
   "Home"
  ],
  [
   "TAREAS DE CASA",
   "COCINAR",
   "Un trabajo en casa",
   "Home"
  ],
  [
   "VECINO",
   "COMPAÑERO DE PISO",
   "Alguien cerca de tu casa",
   "Home"
  ],
  [
   "EXAMEN",
   "PRESENTACIÓN",
   "Te preparas para ello",
   "School"
  ],
  [
   "HORARIO",
   "BOLETÍN DE NOTAS",
   "Un papel del colegio",
   "School"
  ],
  [
   "MATEMÁTICAS",
   "HISTORIA",
   "Una asignatura",
   "School"
  ],
  [
   "RECREO",
   "EXCURSIÓN",
   "Lo mejor del colegio",
   "School"
  ]
 ],
 "B1": [
  [
   "RECETA",
   "MENÚ",
   "Lo lees antes de comer",
   "Food"
  ],
  [
   "COMIDA CALLEJERA",
   "COMIDA PARA LLEVAR",
   "Una comida rápida",
   "Food"
  ],
  [
   "VEGETARIANO",
   "ALERGIA",
   "Cambia lo que pides",
   "Food"
  ],
  [
   "BARBACOA",
   "PICNIC",
   "Comer al aire libre",
   "Food"
  ],
  [
   "PERRO CALLEJERO",
   "TIENDA DE MASCOTAS",
   "Animales en la ciudad",
   "Animals"
  ],
  [
   "ZOO",
   "ACUARIO",
   "Vas a ver animales",
   "Animals"
  ],
  [
   "VETERINARIO",
   "PROTECTORA",
   "Donde ayudan a los animales",
   "Animals"
  ],
  [
   "MEDUSA",
   "TIBURÓN",
   "Le temes en el mar",
   "Animals"
  ],
  [
   "ATASCO",
   "COLA",
   "Algo que te hace perder el tiempo",
   "Places"
  ],
  [
   "CENTRO COMERCIAL",
   "PLAZA MAYOR",
   "Un lugar con mucha gente",
   "Places"
  ],
  [
   "BARRIO",
   "CAMPUS",
   "Donde pasas la semana",
   "Places"
  ],
  [
   "GIMNASIO",
   "PISCINA",
   "Vas allí a moverte",
   "Places"
  ],
  [
   "OLA DE CALOR",
   "INUNDACIÓN",
   "Tiempo extremo",
   "Weather"
  ],
  [
   "QUEMADURA SOLAR",
   "DOLOR DE CABEZA",
   "Algo que duele",
   "Weather"
  ],
  [
   "PREVISIÓN",
   "TEMPERATURA",
   "Lo miras por la mañana",
   "Weather"
  ],
  [
   "TRUENO",
   "GRANIZO",
   "Tiempo ruidoso",
   "Weather"
  ],
  [
   "ACAMPADA",
   "SENDERISMO",
   "Una actividad al aire libre",
   "Travel"
  ],
  [
   "VIAJE POR CARRETERA",
   "CRUCERO",
   "Unas vacaciones largas",
   "Travel"
  ],
  [
   "ALBERGUE",
   "PENSIÓN",
   "Un sitio barato para dormir",
   "Travel"
  ],
  [
   "RECUERDO",
   "POSTAL",
   "Lo traes a casa",
   "Travel"
  ],
  [
   "ENTREVISTA DE TRABAJO",
   "EXAMEN",
   "Una situación estresante",
   "Work"
  ],
  [
   "FECHA LÍMITE",
   "CITA",
   "Algo en tu agenda",
   "Work"
  ],
  [
   "MEDIA JORNADA",
   "PRÁCTICAS",
   "Trabajar mientras estudias",
   "Work"
  ],
  [
   "TRABAJO EN EQUIPO",
   "HORAS EXTRA",
   "Parte de la vida laboral",
   "Work"
  ],
  [
   "MORRIÑA",
   "NERVIOS",
   "Un sentimiento",
   "Feelings"
  ],
  [
   "CELOS",
   "CULPA",
   "Un sentimiento que escondes",
   "Feelings"
  ],
  [
   "ALIVIO",
   "DECEPCIÓN",
   "Un sentimiento después de los resultados",
   "Feelings"
  ],
  [
   "VERGÜENZA",
   "OFENSA",
   "Un sentimiento delante de otros",
   "Feelings"
  ],
  [
   "MUNDIAL",
   "JUEGOS OLÍMPICOS",
   "Una gran competición",
   "Sports"
  ],
  [
   "ÁRBITRO",
   "PENALTI",
   "Decide un partido",
   "Sports"
  ],
  [
   "ENTRENADOR PERSONAL",
   "MARATÓN",
   "Tomarse el deporte en serio",
   "Sports"
  ],
  [
   "LESIÓN",
   "CALENTAMIENTO",
   "Parte de hacer deporte",
   "Sports"
  ],
  [
   "REDES SOCIALES",
   "STREAMING",
   "Donde la gente pasa horas",
   "Technology"
  ],
  [
   "SMARTPHONE",
   "RELOJ INTELIGENTE",
   "Un aparato que llevas encima",
   "Technology"
  ],
  [
   "ACTUALIZACIÓN",
   "MEMORIA LLENA",
   "Un mensaje molesto",
   "Technology"
  ],
  [
   "COMPRAS ONLINE",
   "VIDEOLLAMADA",
   "Algo que haces por internet",
   "Technology"
  ],
  [
   "ALQUILER",
   "FIANZA",
   "Lo pagas por un piso",
   "Home"
  ],
  [
   "MUEBLES",
   "DECORACIÓN",
   "Hace tuya una habitación",
   "Home"
  ],
  [
   "TAREAS",
   "ORDENAR",
   "Nadie quiere hacerlo",
   "Home"
  ],
  [
   "MUDANZA",
   "FIESTA EN CASA",
   "Un gran día en casa",
   "Home"
  ],
  [
   "REPASO",
   "ENTREGA",
   "Antes de un examen",
   "School"
  ],
  [
   "BECA",
   "MATRÍCULA",
   "El colegio y el dinero",
   "School"
  ],
  [
   "TRABAJO EN GRUPO",
   "EXAMEN ORAL",
   "Trabajo que haces en clase",
   "School"
  ],
  [
   "GRADUACIÓN",
   "CASTIGO",
   "Un día que recuerdas",
   "School"
  ]
 ],
 "B2": [
  [
   "COMIDA RÁPIDA",
   "COMIDA RECONFORTANTE",
   "Se come demasiado",
   "Food"
  ],
  [
   "DESPERDICIO DE COMIDA",
   "SOBRAS",
   "Lo que acaba en la basura",
   "Food"
  ],
  [
   "PRODUCTO ECOLÓGICO",
   "ALIMENTO PROCESADO",
   "Una etiqueta en la estantería",
   "Food"
  ],
  [
   "COMIDA PREPARADA",
   "ANTOJO",
   "Cómo se gestiona lo que comes",
   "Food"
  ],
  [
   "ESPECIE EN PELIGRO",
   "RESERVA NATURAL",
   "Un tema de conservación",
   "Animals"
  ],
  [
   "PERRO GUÍA",
   "GATO DE TERAPIA",
   "Un animal que ayuda a la gente",
   "Animals"
  ],
  [
   "MIGRACIÓN",
   "HIBERNACIÓN",
   "Lo que hacen según la estación",
   "Animals"
  ],
  [
   "ESPECIE INVASORA",
   "CRÍA EN CAUTIVIDAD",
   "Gestionar la fauna",
   "Animals"
  ],
  [
   "AFUERAS",
   "CENTRO",
   "Donde vive la gente",
   "Places"
  ],
  [
   "CASERO",
   "VECINO",
   "Una persona donde vives",
   "Places"
  ],
  [
   "ALQUILER",
   "HIPOTECA",
   "Lo pagas por tener casa",
   "Places"
  ],
  [
   "TRAYECTO",
   "HORA PUNTA",
   "Moverse por la ciudad",
   "Places"
  ],
  [
   "CAMBIO CLIMÁTICO",
   "CONTAMINACIÓN",
   "Un problema global",
   "Weather"
  ],
  [
   "JET LAG",
   "INSOMNIO",
   "Afecta a tu sueño",
   "Weather"
  ],
  [
   "SEQUÍA",
   "INCENDIO FORESTAL",
   "Un desastre de la época seca",
   "Weather"
  ],
  [
   "MICROCLIMA",
   "BRISA MARINA",
   "Tiempo local",
   "Weather"
  ],
  [
   "ECOTURISMO",
   "MOCHILERO",
   "Una forma de viajar",
   "Travel"
  ],
  [
   "VUELO RETRASADO",
   "EQUIPAJE PERDIDO",
   "Un viaje que sale mal",
   "Travel"
  ],
  [
   "SEGURO DE VIAJE",
   "VISADO",
   "Papeles antes de ir",
   "Travel"
  ],
  [
   "ESCALA",
   "CONEXIÓN",
   "Entre dos vuelos",
   "Travel"
  ],
  [
   "EMPRESA EMERGENTE",
   "NEGOCIO FAMILIAR",
   "Un tipo de empresa",
   "Work"
  ],
  [
   "PAPELEO",
   "LETRA PEQUEÑA",
   "Algo lento y oficial",
   "Work"
  ],
  [
   "TELETRABAJO",
   "AUTÓNOMO",
   "Trabajar sin oficina",
   "Work"
  ],
  [
   "ASCENSO",
   "DESPIDO",
   "Noticias de tu jefe",
   "Work"
  ],
  [
   "NOSTALGIA",
   "ARREPENTIMIENTO",
   "Una emoción sobre el pasado",
   "Feelings"
  ],
  [
   "PRESIÓN DE GRUPO",
   "COTILLEO",
   "Algo social y desagradable",
   "Feelings"
  ],
  [
   "PROCRASTINAR",
   "SOÑAR DESPIERTO",
   "Lo que haces en vez de trabajar",
   "Feelings"
  ],
  [
   "EMPATÍA",
   "RENCOR",
   "Lo que sientes por otros",
   "Feelings"
  ],
  [
   "DOPAJE",
   "PATROCINIO",
   "Dinero y reglas en el deporte",
   "Sports"
  ],
  [
   "FICHAJE",
   "VENTAJA DE CAMPO",
   "Hablar de fútbol",
   "Sports"
  ],
  [
   "RESISTENCIA",
   "REHABILITACIÓN",
   "El cuerpo de un atleta",
   "Sports"
  ],
  [
   "AFICIÓN",
   "LIGA AMATEUR",
   "El deporte más allá de los profesionales",
   "Sports"
  ],
  [
   "ALGORITMO",
   "TIEMPO DE PANTALLA",
   "Cómo la tecnología marca tu día",
   "Technology"
  ],
  [
   "PRIVACIDAD DE DATOS",
   "NUBE",
   "Donde viven tus archivos",
   "Technology"
  ],
  [
   "INTELIGENCIA ARTIFICIAL",
   "AUTOMATIZACIÓN",
   "Máquinas que hacen nuestro trabajo",
   "Technology"
  ],
  [
   "OBSOLESCENCIA PROGRAMADA",
   "SERVICIO TÉCNICO",
   "Cuando fallan los aparatos",
   "Technology"
  ],
  [
   "COCINA ABIERTA",
   "DESPACHO EN CASA",
   "Cómo han cambiado las casas",
   "Home"
  ],
  [
   "MINIMALISMO",
   "DESORDEN",
   "Cuánto guardas",
   "Home"
  ],
  [
   "PISO COMPARTIDO",
   "NIDO VACÍO",
   "Quién vive contigo",
   "Home"
  ],
  [
   "REFORMA",
   "FACTURA DE LA LUZ",
   "El coste de una casa",
   "Home"
  ],
  [
   "PLAN DE ESTUDIOS",
   "EVALUACIÓN",
   "Cómo se construye un curso",
   "School"
  ],
  [
   "PLAGIO",
   "REVISIÓN POR PARES",
   "Honestidad académica",
   "School"
  ],
  [
   "ABANDONO ESCOLAR",
   "RATIO DE ALUMNOS",
   "Un dato sobre colegios",
   "School"
  ],
  [
   "FORMACIÓN CONTINUA",
   "AÑO SABÁTICO",
   "Educación fuera del camino principal",
   "School"
  ]
 ],
 "C1": [
  [
   "SEGURIDAD ALIMENTARIA",
   "CADENA DE SUMINISTRO",
   "Detrás de lo que comemos",
   "Food"
  ],
  [
   "ALTA COCINA",
   "MODA GASTRONÓMICA",
   "Comer como declaración",
   "Food"
  ],
  [
   "DESIERTO ALIMENTARIO",
   "SUBVENCIÓN",
   "La política de comer",
   "Food"
  ],
  [
   "FERMENTACIÓN",
   "CONSERVANTE",
   "Cómo se conserva la comida",
   "Food"
  ],
  [
   "RENATURALIZACIÓN",
   "PÉRDIDA DE HÁBITAT",
   "La naturaleza bajo presión",
   "Animals"
  ],
  [
   "EXPERIMENTACIÓN ANIMAL",
   "GANADERÍA INTENSIVA",
   "Un debate ético",
   "Animals"
  ],
  [
   "BIODIVERSIDAD",
   "CAZA FURTIVA",
   "Fauna amenazada",
   "Animals"
  ],
  [
   "ANTROPOMORFISMO",
   "DOMESTICACIÓN",
   "Cómo nos relacionamos con los animales",
   "Animals"
  ],
  [
   "GENTRIFICACIÓN",
   "EXPANSIÓN URBANA",
   "Un cambio en la ciudad",
   "Places"
  ],
  [
   "CÁMARA DE ECO",
   "RADIO MACUTO",
   "Donde se propagan las ideas",
   "Places"
  ],
  [
   "RECALIFICACIÓN",
   "CRISIS DE VIVIENDA",
   "Se discute en el ayuntamiento",
   "Places"
  ],
  [
   "ESPACIO PÚBLICO",
   "PRIVATIZACIÓN",
   "De quién es la calle",
   "Places"
  ],
  [
   "FENÓMENO EXTREMO",
   "HUELLA DE CARBONO",
   "Vocabulario del clima",
   "Weather"
  ],
  [
   "DEPRESIÓN ESTACIONAL",
   "ENCIERRO",
   "El tiempo y la mente",
   "Weather"
  ],
  [
   "PUNTO DE NO RETORNO",
   "MITIGACIÓN",
   "Lenguaje de política climática",
   "Weather"
  ],
  [
   "ISLA DE CALOR",
   "PERMAFROST",
   "Un síntoma del calentamiento",
   "Weather"
  ],
  [
   "CHOQUE CULTURAL",
   "AÑORANZA",
   "Lo que viven los viajeros",
   "Travel"
  ],
  [
   "MASIFICACIÓN TURÍSTICA",
   "NÓMADA DIGITAL",
   "El viaje moderno",
   "Travel"
  ],
  [
   "EXPATRIADO",
   "REPATRIACIÓN",
   "Vivir en el extranjero",
   "Travel"
  ],
  [
   "FUERA DE RUTA",
   "TRAMPA PARA TURISTAS",
   "Cómo se juzga un lugar",
   "Travel"
  ],
  [
   "SÍNDROME DEL IMPOSTOR",
   "AGOTAMIENTO",
   "Algo que se siente en el trabajo",
   "Work"
  ],
  [
   "BUROCRACIA",
   "RESQUICIO LEGAL",
   "Algo dentro de un sistema",
   "Work"
  ],
  [
   "ECONOMÍA DE PLATAFORMAS",
   "ESTABILIDAD LABORAL",
   "El empleo moderno",
   "Work"
  ],
  [
   "TECHO DE CRISTAL",
   "ENCHUFISMO",
   "Una ventaja injusta",
   "Work"
  ],
  [
   "CHARLA INTRASCENDENTE",
   "TOMADURA DE PELO",
   "Un tipo de conversación",
   "Feelings"
  ],
  [
   "DENUNCIANTE",
   "CHIVO EXPIATORIO",
   "Un papel que le dan a alguien",
   "Feelings"
  ],
  [
   "REGODEO",
   "REIVINDICACIÓN",
   "Una satisfacción complicada",
   "Feelings"
  ],
  [
   "DILEMA MORAL",
   "CORAZONADA",
   "Cómo decides",
   "Feelings"
  ],
  [
   "LAVADO DE IMAGEN",
   "AMAÑO DE PARTIDOS",
   "Deporte y corrupción",
   "Sports"
  ],
  [
   "FORTALEZA MENTAL",
   "MÁXIMO RENDIMIENTO",
   "La mentalidad de élite",
   "Sports"
  ],
  [
   "DEPORTE BASE",
   "CANTERA",
   "De dónde salen los atletas",
   "Sports"
  ],
  [
   "PROTOCOLO DE CONMOCIÓN",
   "PARIDAD DE GÉNERO",
   "Debates del deporte moderno",
   "Sports"
  ],
  [
   "CAPITALISMO DE VIGILANCIA",
   "HUELLA DIGITAL",
   "El precio de estar conectado",
   "Technology"
  ],
  [
   "SESGO ALGORÍTMICO",
   "DEEPFAKE",
   "Cuando la tecnología engaña",
   "Technology"
  ],
  [
   "BRECHA DIGITAL",
   "ALFABETIZACIÓN DIGITAL",
   "Quién se queda atrás",
   "Technology"
  ],
  [
   "ESTADO DE VIGILANCIA",
   "CIFRADO",
   "Privacidad y poder",
   "Technology"
  ],
  [
   "CONVIVENCIA INTERGENERACIONAL",
   "VIVIENDA COLABORATIVA",
   "Repensar el hogar",
   "Home"
  ],
  [
   "EFICIENCIA ENERGÉTICA",
   "REHABILITACIÓN",
   "Mejorar casas antiguas",
   "Home"
  ],
  [
   "TRABAJO DOMÉSTICO",
   "DESCONEXIÓN DIGITAL",
   "La casa como lugar de trabajo",
   "Home"
  ],
  [
   "VIVIENDA SOCIAL",
   "ACCESO A LA VIVIENDA",
   "Vivienda y clase social",
   "Home"
  ],
  [
   "APRENDIZAJE MEMORÍSTICO",
   "PENSAMIENTO CRÍTICO",
   "Dos formas de enseñar",
   "School"
  ],
  [
   "PRUEBAS ESTANDARIZADAS",
   "INFLACIÓN DE NOTAS",
   "Medir a los alumnos",
   "School"
  ],
  [
   "PRESIÓN ACADÉMICA",
   "ACOSO ESCOLAR",
   "Preocupaciones en los colegios",
   "School"
  ],
  [
   "EDUCACIÓN INCLUSIVA",
   "AGRUPAMIENTO POR NIVEL",
   "Cómo se forman las clases",
   "School"
  ]
 ]
};
export const related: Record<string, string> = {
 "Food": "eat eating ate drink drinking hungry hunger taste tasty delicious sweet salty spicy hot cold cook cooking kitchen meal lunch dinner breakfast plate fork knife spoon restaurant menu order fresh healthy fat sugar bread cheese fruit vegetable meat rice soup snack diet market shop buy",
 "Animals": "animal animals pet pets wild farm zoo fur tail legs paws claws teeth bite feed feeding cage nature forest jungle sea ocean water fly flying swim swimming run running dangerous friendly loud small big cute noise sound species vet",
 "Places": "place places building city town street house home room inside outside visit go going people crowd busy quiet noisy big small far near open close street corner floor door roof rent live living neighbour area",
 "Weather": "weather hot cold warm cool wet dry rain raining wind windy cloud cloudy sun sunny snow ice storm season summer winter temperature degrees forecast umbrella coat sky air climate outside",
 "Travel": "travel trip journey holiday vacation go going far away abroad airport station plane train bus car ticket passport luggage suitcase bag hotel map tourist guide book booking arrive leave departure late delay foreign country",
 "Work": "work working job career office boss manager colleague team money salary pay hours shift busy stress stressful tired meeting email desk computer contract interview boring hard useful career skills company business client deadline",
 "Feelings": "feel feeling emotion happy sad angry afraid scared nervous worried excited bored tired calm relaxed proud shy lonely stress heart cry laugh smile face mood think thinking mind bad good strange difficult",
 "Sports": "sport sports game play playing player team ball run running jump kick throw win winning lose losing score goal point match training coach gym fit fitness strong tired muscle field court pitch race fast competition",
 "Technology": "technology tech phone mobile computer laptop screen internet online app apps click button battery charge charger wifi data password message text email photo camera video game download update fast slow broken fix modern digital machine",
 "Home": "home house family flat apartment room kitchen bedroom bathroom living furniture table chair bed sofa door window clean cleaning tidy mess cook wash sleep rest parents mother father brother sister child children together comfortable safe",
 "School": "school class classroom lesson teacher student pupil study studying learn learning homework test exam grade mark book notebook pen pencil board desk subject maths english history question answer read write bell break uniform rules"
};
export const relatedEs: Record<string, string> = {
 "Food": "comer comida beber bebida hambre sabor rico delicioso dulce salado picante caliente frio cocinar cocina plato tenedor cuchillo cuchara restaurante menu pedir fresco sano azucar pan queso fruta verdura carne arroz sopa merienda dieta mercado tienda comprar desayuno almuerzo cena",
 "Animals": "animal animales mascota mascotas salvaje granja zoo pelo cola patas garras dientes morder alimentar jaula naturaleza bosque selva mar oceano agua volar nadar correr peligroso amigable ruido pequeno grande bonito especie veterinario",
 "Places": "lugar sitio edificio ciudad pueblo calle casa habitacion dentro fuera visitar ir gente multitud lleno tranquilo ruidoso grande pequeno lejos cerca abierto cerrado esquina piso puerta techo vivir barrio vecino zona",
 "Weather": "tiempo clima calor frio templado fresco mojado seco lluvia llover viento nube nublado sol soleado nieve hielo tormenta estacion verano invierno temperatura grados prevision paraguas abrigo cielo aire fuera",
 "Travel": "viaje viajar vacaciones ir lejos extranjero aeropuerto estacion avion tren autobus coche billete pasaporte equipaje maleta bolsa hotel mapa turista guia reserva llegar salir salida retraso pais",
 "Work": "trabajo trabajar empleo oficina jefe companero equipo dinero sueldo pagar horas turno ocupado estres cansado reunion correo mesa ordenador contrato entrevista aburrido dificil util empresa negocio cliente plazo",
 "Feelings": "sentir sentimiento emocion feliz triste enfadado miedo nervioso preocupado emocionado aburrido cansado tranquilo relajado orgulloso timido solo estres corazon llorar reir sonrisa cara humor pensar mente malo bueno raro dificil",
 "Sports": "deporte deportes juego jugar jugador equipo pelota balon correr saltar patear lanzar ganar perder marcar gol punto partido entrenar entrenador gimnasio forma fuerte cansado musculo campo pista carrera rapido competicion",
 "Technology": "tecnologia telefono movil ordenador portatil pantalla internet online aplicacion boton bateria cargar cargador wifi datos contrasena mensaje correo foto camara video juego descargar actualizar rapido lento roto arreglar moderno digital maquina",
 "Home": "casa hogar familia piso apartamento habitacion cocina dormitorio bano salon muebles mesa silla cama sofa puerta ventana limpiar ordenado desorden cocinar lavar dormir descansar padres madre padre hermano hermana hijo hijos juntos comodo seguro",
 "School": "colegio escuela clase aula leccion profesor maestro alumno estudiante estudiar aprender deberes examen nota libro cuaderno boligrafo lapiz pizarra asignatura matematicas ingles historia pregunta respuesta leer escribir timbre recreo uniforme normas"
};
export const topics = ["Food","Animals","Places","Weather","Travel","Work","Feelings","Sports","Technology","Home","School"] as const;
export const ui = {
 "en": {
  "ph": {
   "setup": "Setup",
   "deal": "Issuing cards",
   "clue": "Clue round",
   "discuss": "Discussion",
   "voteOpen": "Voting open",
   "voteLocked": "Vote locked",
   "reveal": "Reveal",
   "scores": "Scores"
  },
  "topics": {
   "Food": "Food",
   "Animals": "Animals",
   "Places": "Places",
   "Weather": "Weather",
   "Travel": "Travel",
   "Work": "Work",
   "Feelings": "Feelings",
   "Sports": "Sports",
   "Technology": "Technology",
   "Home": "Home",
   "School": "School"
  },
  "bands": {
   "no words": "no words",
   "close": "close",
   "warm": "warm",
   "distant": "distant"
  },
  "jobNo": "Job No.",
  "back": "← Back",
  "backTitle": "Back (←)",
  "setup": "Setup",
  "language": "Language",
  "kicker": "Safety briefing",
  "h1a": "One of you",
  "h1b": "is faulty.",
  "intro1": "Everyone gets the same word — except one worker, who gets a decoy. Each student says one word about theirs. The teacher logs the words. Then the floor votes.",
  "intro2": "Cards are issued one worker at a time. Call the number, everyone else looks away.",
  "boardTitle": "Board language",
  "board1a": "I think it's",
  "board1b": "[name]",
  "board1c": ", because…",
  "board2": "Why did you say that word?",
  "board3": "I'm not sure — it could be anyone.",
  "level": "Level",
  "mainTopic": "Main topic",
  "inHopper": "in the hopper",
  "mix": "Mix the topic",
  "allTopics": "All topics",
  "all": "All",
  "workers": "Workers",
  "impostors": "Impostors",
  "sees": "The impostor sees",
  "seeDecoy": "A decoy word",
  "seeHint": "A vague hint",
  "seeBoth": "Both",
  "clueRound": "Clue round",
  "discussion": "Discussion",
  "crew": "Crew list",
  "namePh": "Name",
  "issue": "Issue the cards",
  "keys": "← back · → advances",
  "hopperAll": "all played — the next job recycles this topic",
  "unplayedLeft": " unplayed left",
  "unplayed": " unplayed",
  "card": "Card",
  "of": "of",
  "lookAway": "everyone else, look away",
  "sealed": "Sealed",
  "breakSeal": "Break the seal",
  "sealNext": "Seal it — call the next number",
  "sealStart": "Seal it — start the round",
  "roleImp": "You are the impostor",
  "roleAll": "Everyone's word",
  "clueH": "One word each.",
  "clueP": "Describe your word with a single adjective or noun. Don't say the word itself. Don't repeat anyone.",
  "pause": "Pause",
  "startTimer": "Start timer",
  "openDiscussion": "Open discussion",
  "logTitle": "Log sheet — speaking order",
  "logged": "logged",
  "drawOrder": "Draw order",
  "firstUp": "First up:",
  "typeEach": ". Type each word as it is spoken.",
  "wordsPh": "words, separated, by commas",
  "discussP": "Ask each other about the words on the log sheet. Who sounded unsure?",
  "openVote": "Open the vote",
  "proxTitle": "Proximity to the real word — unsorted",
  "proxNote": "A high reading only means the clue was close. The impostor can land close by guessing the field — that's the trap. Order is scrambled every round.",
  "voteH": "Who is the impostor?",
  "voteHelpOpen": "The teacher adds a vote for each raised hand.",
  "voteHelpLocked": "Voting is locked. Open the hatch when the class is ready.",
  "votesCast": "votes cast",
  "locked": "Locked",
  "open": "Open",
  "record": "Words on the record",
  "distTitle": "Vote distribution — final",
  "accuses": "The floor accuses",
  "split": "Split vote — no accusation",
  "noVotes": "No votes cast",
  "hatch": "Open the hatch",
  "panel": "Teacher panel",
  "panelLocked": "Vote submission is locked.",
  "panelOpen": "Close voting to lock the count.",
  "shuffleNames": "Shuffle names",
  "clearVotes": "Clear votes",
  "closeVoting": "Close voting",
  "reopen": "Re-open voting",
  "caught": "Correct — impostor caught",
  "walked": "The impostor walked",
  "wereImps": " were the impostors",
  "wasImp": " was the impostor",
  "theWord": "The word",
  "theDecoy": "The decoy",
  "guessed": "Impostor guessed the word ✓",
  "guess": "Impostor guessed the word?",
  "nextJob": "Next job",
  "scoreboard": "Scoreboard",
  "thisJob": "This job",
  "impTag": " · impostor",
  "clearScores": "Clear scores"
 },
 "es": {
  "ph": {
   "setup": "Ajustes",
   "deal": "Repartiendo",
   "clue": "Ronda de pistas",
   "discuss": "Debate",
   "voteOpen": "Votación abierta",
   "voteLocked": "Votación cerrada",
   "reveal": "Revelación",
   "scores": "Puntos"
  },
  "topics": {
   "Food": "Comida",
   "Animals": "Animales",
   "Places": "Lugares",
   "Weather": "Clima",
   "Travel": "Viajes",
   "Work": "Trabajo",
   "Feelings": "Sentimientos",
   "Sports": "Deportes",
   "Technology": "Tecnología",
   "Home": "Casa",
   "School": "Escuela"
  },
  "bands": {
   "no words": "sin palabras",
   "close": "cerca",
   "warm": "templado",
   "distant": "lejos"
  },
  "jobNo": "Trabajo n.º",
  "back": "← Atrás",
  "backTitle": "Atrás (←)",
  "setup": "Ajustes",
  "language": "Idioma",
  "kicker": "Informe de seguridad",
  "h1a": "Alguien del equipo",
  "h1b": "está averiado.",
  "intro1": "Todos reciben la misma palabra, excepto un trabajador, que recibe una palabra señuelo. Cada estudiante dice una palabra sobre la suya. El profesor anota las palabras. Después, la planta vota.",
  "intro2": "Las tarjetas se entregan de una en una. Di el número; los demás miran hacia otro lado.",
  "boardTitle": "Frases útiles",
  "board1a": "Creo que es",
  "board1b": "[nombre]",
  "board1c": ", porque…",
  "board2": "¿Por qué dijiste esa palabra?",
  "board3": "No estoy seguro — podría ser cualquiera.",
  "level": "Nivel",
  "mainTopic": "Tema",
  "inHopper": "en la tolva",
  "mix": "Mezclar tema",
  "allTopics": "Todos los temas",
  "all": "Todos",
  "workers": "Trabajadores",
  "impostors": "Impostores",
  "sees": "El impostor ve",
  "seeDecoy": "Una palabra señuelo",
  "seeHint": "Una pista vaga",
  "seeBoth": "Ambas",
  "clueRound": "Ronda de pistas",
  "discussion": "Debate",
  "crew": "Lista del equipo",
  "namePh": "Nombre",
  "issue": "Repartir tarjetas",
  "keys": "← atrás · → avanzar",
  "hopperAll": "todas jugadas — el próximo trabajo recicla este tema",
  "unplayedLeft": " sin jugar, quedan pocas",
  "unplayed": " sin jugar",
  "card": "Tarjeta",
  "of": "de",
  "lookAway": "los demás, miren hacia otro lado",
  "sealed": "Sellada",
  "breakSeal": "Romper el sello",
  "sealNext": "Sellar — llamar al siguiente",
  "sealStart": "Sellar — empezar la ronda",
  "roleImp": "Eres el impostor",
  "roleAll": "La palabra de todos",
  "clueH": "Una palabra cada uno.",
  "clueP": "Describe tu palabra con un solo adjetivo o sustantivo. No digas la palabra. No repitas la de otro.",
  "pause": "Pausa",
  "startTimer": "Iniciar",
  "openDiscussion": "Abrir debate",
  "logTitle": "Registro — orden de turno",
  "logged": "anotadas",
  "drawOrder": "Sortear orden",
  "firstUp": "Empieza:",
  "typeEach": ". Escribe cada palabra cuando se diga.",
  "wordsPh": "palabras, separadas, por comas",
  "discussP": "Pregúntense por las palabras del registro. ¿Quién sonó inseguro?",
  "openVote": "Abrir votación",
  "proxTitle": "Cercanía a la palabra real — sin ordenar",
  "proxNote": "Una lectura alta solo significa que la pista fue cercana. El impostor puede acercarse adivinando el tema: esa es la trampa. El orden cambia cada ronda.",
  "voteH": "¿Quién es el impostor?",
  "voteHelpOpen": "El profesor suma un voto por cada mano levantada.",
  "voteHelpLocked": "La votación está cerrada. Abran la escotilla cuando la clase esté lista.",
  "votesCast": "votos",
  "locked": "Cerrada",
  "open": "Abierta",
  "record": "Palabras registradas",
  "distTitle": "Reparto de votos — final",
  "accuses": "La planta acusa a",
  "split": "Empate — sin acusación",
  "noVotes": "Sin votos",
  "hatch": "Abrir la escotilla",
  "panel": "Panel del profesor",
  "panelLocked": "Los votos están bloqueados.",
  "panelOpen": "Cierra la votación para bloquear el recuento.",
  "shuffleNames": "Mezclar nombres",
  "clearVotes": "Borrar votos",
  "closeVoting": "Cerrar votación",
  "reopen": "Reabrir votación",
  "caught": "Correcto — impostor atrapado",
  "walked": "El impostor escapó",
  "wereImps": " eran los impostores",
  "wasImp": " era el impostor",
  "theWord": "La palabra",
  "theDecoy": "El señuelo",
  "guessed": "El impostor adivinó la palabra ✓",
  "guess": "¿El impostor adivinó la palabra?",
  "nextJob": "Siguiente trabajo",
  "scoreboard": "Marcador",
  "thisJob": "Este trabajo",
  "impTag": " · impostor",
  "clearScores": "Borrar puntos"
 }
};
export type UiStrings = typeof ui.en;
