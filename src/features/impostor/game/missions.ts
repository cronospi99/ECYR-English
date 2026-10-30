/* Mission content. "easy" ≈ A1–A2, "hard" ≈ B1–C1. */
export type Tier = "easy" | "hard";
export interface MCQ { q: string; say?: string; options: string[]; a: number }

export interface MissionDef {
  id: string;
  kind: "mcq" | "sort" | "order" | "spot" | "ac" | "books" | "security";
  en: string;
  es: string;
  howEn: string;
  howEs: string;
  rounds: number;
}

export const missionDefs: Record<string, MissionDef> = {
  picture: { id: "picture", kind: "mcq", en: "Picture cards", es: "Tarjetas de dibujos", howEn: "Tap the word for the picture.", howEs: "Toca la palabra del dibujo.", rounds: 3 },
  sort: { id: "sort", kind: "sort", en: "Shelve the words", es: "Ordena la estantería", howEn: "Put each word on the right shelf.", howEs: "Pon cada palabra en su estante.", rounds: 1 },
  listen: { id: "listen", kind: "mcq", en: "Listening booth", es: "Cabina de escucha", howEn: "Press play and choose what you hear.", howEs: "Pulsa play y elige lo que oyes.", rounds: 3 },
  unscramble: { id: "unscramble", kind: "order", en: "Sentence builder", es: "Construye la frase", howEn: "Tap the words in the right order.", howEs: "Toca las palabras en orden.", rounds: 2 },
  order: { id: "order", kind: "mcq", en: "Take the order", es: "Toma el pedido", howEn: "Serve the right tray.", howEs: "Sirve la bandeja correcta.", rounds: 3 },
  phone: { id: "phone", kind: "mcq", en: "Answer the phone", es: "Contesta el teléfono", howEn: "Choose the best reply.", howEs: "Elige la mejor respuesta.", rounds: 3 },
  grammar: { id: "grammar", kind: "mcq", en: "Fix the email", es: "Corrige el email", howEn: "Choose the correct form.", howEs: "Elige la forma correcta.", rounds: 3 },
  spot: { id: "spot", kind: "spot", en: "Mark the test", es: "Corrige el examen", howEn: "Tap the word with a spelling mistake.", howEs: "Toca la palabra mal escrita.", rounds: 2 },
  gap: { id: "gap", kind: "mcq", en: "Exam paper", es: "Hoja de examen", howEn: "Complete the gap.", howEs: "Completa el hueco.", rounds: 3 },
  levels: { id: "levels", kind: "order", en: "File certificates", es: "Archiva certificados", howEn: "File the certificates from lowest to highest level.", howEs: "Archiva los certificados del nivel más bajo al más alto.", rounds: 1 },
  reply: { id: "reply", kind: "mcq", en: "Small talk", es: "Charla", howEn: "Keep the conversation going.", howEs: "Sigue la conversación.", rounds: 3 },
  ac: { id: "ac", kind: "ac", en: "Fix the AC", es: "Arregla el aire", howEn: "Read the temperature the teacher wants, set the thermostat and restart the AC.", howEs: "Lee la temperatura que pide el profe, ajusta el termostato y reinicia el aire.", rounds: 1 },
  books: { id: "books", kind: "books", en: "The missing books", es: "Los libros perdidos", howEn: "Put the students' books back on the shelf in alphabetical order.", howEs: "Devuelve los libros a la estantería en orden alfabético.", rounds: 1 },
  security: { id: "security", kind: "security", en: "Security check", es: "Control de seguridad", howEn: "Answer the watchman, then stand still for the scanner.", howEs: "Responde al vigilante y quédate quieto para el escáner.", rounds: 3 },
  sign: { id: "sign", kind: "mcq", en: "Fix the bathroom sign", es: "Arregla el letrero del baño", howEn: "Choose the right word for each sign.", howEs: "Elige la palabra correcta para cada letrero.", rounds: 3 }
};

const m = (q: string, options: string[], a = 0, say?: string): MCQ => ({ q, options, a, say });

export const mcqBank: Record<string, Record<Tier, MCQ[]>> = {
  picture: {
    easy: [m("🍎", ["apple", "orange", "banana", "grape"]), m("🐶", ["dog", "cat", "horse", "bird"]), m("🚌", ["bus", "train", "plane", "boat"]), m("☔", ["umbrella", "raincoat", "boots", "hat"]), m("📚", ["books", "pens", "chairs", "maps"]), m("⚽", ["ball", "bike", "kite", "doll"]), m("🌧️", ["rain", "snow", "sun", "wind"]), m("👟", ["trainers", "socks", "gloves", "scarf"]), m("🕐", ["clock", "phone", "lamp", "key"]), m("🧀", ["cheese", "bread", "milk", "egg"])],
    hard: [m("🧳", ["suitcase", "wallet", "drawer", "locker"]), m("🔦", ["torch", "candle", "lighter", "bulb"]), m("🪜", ["ladder", "staircase", "fence", "bridge"]), m("🧯", ["fire extinguisher", "hose", "alarm", "bucket"]), m("🪡", ["needle", "pin", "nail", "screw"]), m("🦔", ["hedgehog", "squirrel", "mole", "badger"]), m("🌪️", ["tornado", "drought", "flood", "hail"]), m("🧭", ["compass", "map", "clock", "scale"]), m("🪣", ["bucket", "jug", "bowl", "basket"]), m("🥄", ["spoon", "ladle", "fork", "whisk"])]
  },
  listen: {
    easy: [m("What do you hear?", ["ship", "sheep", "shop", "chip"], 0, "ship"), m("What do you hear?", ["sheep", "ship", "cheap", "shape"], 0, "sheep"), m("What do you hear?", ["thirteen", "thirty", "three", "third"], 0, "thirteen"), m("What do you hear?", ["fifty", "fifteen", "five", "fifth"], 0, "fifty"), m("What do you hear?", ["bag", "back", "bug", "big"], 0, "bag"), m("What do you hear?", ["live", "leave", "love", "life"], 0, "leave"), m("What do you hear?", ["hat", "hot", "hut", "heat"], 0, "hot"), m("What do you hear?", ["right", "light", "write", "night"], 0, "light")],
    hard: [m("What did she say?", ["I'd rather stay in.", "I'd rather stay on.", "I had to stay in.", "I'll rather stay in."], 0, "I'd rather stay in."), m("What did he say?", ["We should've left earlier.", "We should leave earlier.", "We shouldn't leave earlier.", "We shall leave early."], 0, "We should've left earlier."), m("What do you hear?", ["thought", "taught", "though", "through"], 0, "thought"), m("What do you hear?", ["walk", "work", "woke", "wok"], 0, "work"), m("What did she say?", ["It's not worth the hassle.", "It's not worth the castle.", "It's now worth the hassle.", "It's not with the hassle."], 0, "It's not worth the hassle."), m("What do you hear?", ["desert", "dessert", "deserved", "deceit"], 0, "dessert")]
  },
  order: {
    easy: [m("“A coffee and a croissant, please.”", ["☕🥐", "🍵🥐", "☕🍩", "🥤🥐"]), m("“Two orange juices, please.”", ["🍊🍊", "🍊", "🍎🍎", "🥛🥛"]), m("“A sandwich and water.”", ["🥪💧", "🍔💧", "🥪🥤", "🌭💧"]), m("“Tea and a cookie.”", ["🍵🍪", "☕🍪", "🍵🍰", "🧃🍪"]), m("“Three doughnuts!”", ["🍩🍩🍩", "🍩🍩", "🧁🧁🧁", "🍩"]), m("“An ice cream, please.”", ["🍦", "🍰", "🍫", "🧁"])],
    hard: [m("“Could I get a decaf latte and a slice of cake?”", ["☕🍰", "🍵🍰", "☕🥐", "🥤🍰"]), m("“I'll have the soup of the day, no bread.”", ["🍲", "🍲🥖", "🥗", "🍜🥖"]), m("“Just a sparkling water, thanks — I'm driving.”", ["💧", "🍺", "🍷", "🥤"]), m("“A pot of tea for two and some scones.”", ["🍵🍵🧁", "☕☕🧁", "🍵🍰", "🍵🧁"]), m("“Something vegetarian — a salad, maybe?”", ["🥗", "🍗", "🍔", "🥓"])]
  },
  phone: {
    easy: [m("“Hello, is this ECYR English?”", ["Yes, how can I help you?", "No, thank you.", "I'm fine.", "Goodbye!"]), m("“Can I speak to the director?”", ["One moment, please.", "Yes, I speak.", "She is speak.", "No problem, bye."]), m("“What time do classes start?”", ["At five o'clock.", "On Monday.", "In the library.", "Yes, they do."]), m("“How much is the course?”", ["It's 60 euros a month.", "It's very long.", "It's in English.", "It's three o'clock."]), m("“Thank you very much!”", ["You're welcome.", "Yes, please.", "Me too.", "I'm sorry."]), m("“Do you have classes for kids?”", ["Yes, we do — on Saturdays.", "Yes, I am.", "No, it isn't.", "They're blue."])],
    hard: [m("“I'm afraid I need to cancel tomorrow's class.”", ["No problem — shall I reschedule it for you?", "I'm afraid too.", "Good, see you tomorrow!", "Why are you afraid?"]), m("“Could you put me through to accounts?”", ["Certainly, please hold.", "I put you through the door.", "Accounts are closed forever.", "Yes, I could."]), m("“I was wondering whether you offer exam preparation.”", ["We do — we run IELTS and Cambridge courses.", "Yes, I wonder too.", "Wondering is free.", "No, we prepare exams."]), m("“Sorry, the line's really bad.”", ["Shall I call you back?", "Yes, it's a bad line of people.", "I'm sorry for you.", "Then speak worse."]), m("“Would it be possible to change my group?”", ["Let me check the timetable for you.", "It would be possible yesterday.", "Yes, change it yourself.", "Groups can't speak."])]
  },
  grammar: {
    easy: [m("“She ___ English every day.”", ["studies", "study", "studying", "studied yesterday"]), m("“I ___ a student.”", ["am", "is", "are", "be"]), m("“They ___ to the cafeteria now.”", ["are going", "goes", "go yesterday", "is go"]), m("“We ___ class on Mondays.”", ["have", "has", "having", "haves"]), m("“There ___ two teachers here.”", ["are", "is", "be", "am"]), m("“Yesterday I ___ my homework.”", ["did", "do", "does", "doing"])],
    hard: [m("“I look forward to ___ from you.”", ["hearing", "hear", "heard", "be hearing"]), m("“If I ___ more time, I would join the course.”", ["had", "have", "will have", "would have"]), m("“The report ___ by Friday.”", ["must be sent", "must send", "must sending", "must sent"]), m("“I've been working here ___ 2019.”", ["since", "for", "from", "during"]), m("“Hardly ___ the meeting started when the alarm rang.”", ["had", "has", "did", "was"]), m("“She suggested ___ the deadline.”", ["extending", "to extend", "extend", "us extend"])]
  },
  gap: {
    easy: [m("“I'm good ___ English.”", ["at", "in", "on", "for"]), m("“The exam is ___ Friday.”", ["on", "in", "at", "to"]), m("“Turn ___ your phones, please.”", ["off", "of", "out", "down"]), m("“My birthday is ___ May.”", ["in", "on", "at", "for"]), m("“Listen ___ the teacher.”", ["to", "at", "for", "on"]), m("“Write your name ___ the top.”", ["at", "on", "in", "by"])],
    hard: [m("“She's in charge ___ the new branch.”", ["of", "for", "with", "on"]), m("“The results depend ___ your effort.”", ["on", "of", "from", "at"]), m("“He's been accused ___ cheating.”", ["of", "for", "about", "with"]), m("“Let's take ___ account the cost.”", ["into", "in", "on", "onto"]), m("“The plan fell ___ at the last minute.”", ["through", "down", "out", "off"]), m("“I'm not used ___ getting up so early.”", ["to", "for", "with", "at"])]
  },
  security: {
    easy: [m("Watchman: “Good evening! Can I see your student card?”", ["Sure, here you are.", "Yes, I can see.", "No, it's mine.", "I'm a card."]), m("Watchman: “Where are you going?”", ["To my English class.", "At eight o'clock.", "Yes, I am.", "With a pencil."]), m("Watchman: “What's your name, please?”", ["My name's Sam.", "I'm fine, thanks.", "It's blue.", "Yes, please."]), m("Watchman: “Is this your bag?”", ["Yes, it is.", "Yes, I am.", "No, it isn't me.", "It's a bag, yes."]), m("Watchman: “Please walk through the scanner.”", ["OK, no problem.", "I walk yesterday.", "The scanner is me.", "Thanks, you too."]), m("Watchman: “Have a good class!”", ["Thanks! Have a good night.", "Yes, I have.", "Good class is good.", "No, thank you."])],
    hard: [m("Watchman: “Excuse me, have you signed in at reception?”", ["Not yet — I'll do it right away.", "Yes, I have sign.", "Reception is over there, yes.", "I'm signing yesterday."]), m("Watchman: “I'm afraid you can't bring food into the classrooms.”", ["Oh, sorry — I'll finish it outside.", "I'm afraid too.", "Food is not a classroom.", "Yes, I can't bring."]), m("Watchman: “Could you open your bag for me, please?”", ["Of course, go ahead.", "Yes, I could open.", "My bag is opened.", "Open it yourself."]), m("Watchman: “Has anyone suspicious come this way?”", ["I think I saw someone near the vents.", "Yes, suspicious came.", "I am this way.", "Nobody has came."]), m("Watchman: “Would you mind waiting a moment?”", ["Not at all.", "Yes, I mind waiting.", "I'm waiting a moment ago.", "Moment is fine."]), m("Watchman: “The scanner beeped. Are you carrying any keys?”", ["Oh yes, sorry — here they are.", "The keys are beeping me.", "I carry no keys yesterday.", "Beep is normal."])]
  },
  sign: {
    easy: [m("🚹", ["Men", "Women", "Kids", "Exit"]), m("🚺", ["Women", "Men", "Staff", "Kitchen"]), m("🧼", ["Soap", "Towel", "Toilet", "Mirror"]), m("🧻", ["Toilet paper", "Newspaper", "Notebook", "Napkin"]), m("Wash your ___!", ["hands", "feet", "books", "phone"]), m("⚠️ Wet ___", ["floor", "door", "window", "ceiling"])],
    hard: [m("Please ___ the toilet after use.", ["flush", "wash", "close", "drink"]), m("Out of ___ 🚫", ["order", "service", "place", "time"]), m("Do not ___ paper towels in the toilet.", ["throw", "throws", "threw", "throwing"]), m("Caution: ___ floor.", ["slippery", "slipped", "slips", "slip"]), m("These facilities are ___ for staff only.", ["reserved", "reserve", "reserving", "reservation"]), m("Please report any ___ to reception.", ["problems", "problem's", "problematic", "problemed"])]
  },
  reply: {
    easy: [m("“Hi! How are you?”", ["I'm fine, thanks. And you?", "I'm twenty.", "Yes, I am.", "It's Monday."]), m("“Where are you from?”", ["I'm from Colombia.", "I'm fine.", "From nine to five.", "Yes, please."]), m("“What's your favourite food?”", ["Pizza, definitely!", "I'm hungry yes.", "On the table.", "It's my food."]), m("“Nice to meet you.”", ["Nice to meet you too.", "I'm meet.", "Yes, nice.", "Goodbye, thanks."]), m("“Do you like music?”", ["Yes, I love rock.", "Yes, it is.", "No, I'm music.", "At eight."]), m("“See you tomorrow!”", ["See you!", "Tomorrow is Tuesday.", "Yes, I see.", "Me neither."])],
    hard: [m("“Lovely weather today, isn't it?”", ["Isn't it just? Perfect for a walk.", "Yes, it isn't.", "The weather is a noun.", "No, it's Tuesday."]), m("“So, what do you do for a living?”", ["I'm a nurse — I work night shifts.", "I live for living.", "I do my homework.", "Yes, I do."]), m("“Have you been here before?”", ["Only once, ages ago.", "Yes, I have been before here.", "Before what?", "No, I'm here now."]), m("“I can't believe it's Friday already!”", ["Tell me about it — this week flew by.", "Believe it, it's Thursday.", "Yes, I can't.", "Fridays are days."]), m("“Any plans for the weekend?”", ["Nothing much, just catching up on sleep.", "Yes, I plan weekends.", "The weekend has two days.", "I planned it yesterday tomorrow."])]
  }
};

export const ACMSG = {
  numbers: ["sixteen", "seventeen", "eighteen", "nineteen", "twenty", "twenty-one", "twenty-two", "twenty-three", "twenty-four"],
  hot: ["It's boiling in here!", "We're melting!", "It's like an oven!", "I'm sweating like crazy!"],
  fail: ["BZZZT! 💥 It broke again…", "Click… clunk… 💨 Nope. Broken again.", "It worked for 3 seconds! Then: 💥", "Error 404: cold air not found."]
};

export const BOOK_TITLES = ["Grammar in Use", "English File", "Oxford Picture Dictionary", "Cambridge Exam Practice", "Phrasal Verbs Workbook", "Reading Explorer", "Speakout", "Vocabulary Builder", "Headway", "Top Notch", "Business Result", "Kid's Box"];

export const sortBank: Record<Tier, { bins: string[]; items: [string, number][] }[]> = {
  easy: [
    { bins: ["Food", "Animals", "Colours"], items: [["bread", 0], ["rice", 0], ["horse", 1], ["rabbit", 1], ["purple", 2], ["yellow", 2]] },
    { bins: ["Noun", "Verb", "Adjective"], items: [["book", 0], ["teacher", 0], ["read", 1], ["write", 1], ["happy", 2], ["big", 2]] },
    { bins: ["School", "Home", "Weather"], items: [["pencil", 0], ["exam", 0], ["sofa", 1], ["kitchen", 1], ["cloudy", 2], ["windy", 2]] }
  ],
  hard: [
    { bins: ["Noun", "Verb", "Adjective"], items: [["knowledge", 0], ["achievement", 0], ["improve", 1], ["borrow", 1], ["reliable", 2], ["fluent", 2]] },
    { bins: ["Formal", "Informal"], items: [["regarding", 0], ["furthermore", 0], ["nevertheless", 0], ["gonna", 1], ["cheers", 1], ["no worries", 1]] },
    { bins: ["Positive", "Negative"], items: [["thrilled", 0], ["delighted", 0], ["grateful", 0], ["furious", 1], ["exhausted", 1], ["disappointed", 1]] }
  ]
};

export const orderBank: Record<"unscramble" | "levels", Record<Tier, string[][]>> = {
  unscramble: {
    easy: [["I", "go", "to", "school", "by", "bus"], ["She", "likes", "pizza", "very", "much"], ["We", "have", "English", "on", "Monday"], ["My", "teacher", "is", "very", "nice"], ["Where", "is", "the", "library", "?"], ["Can", "I", "open", "the", "window", "?"]],
    hard: [["I", "have", "been", "studying", "English", "for", "years"], ["Would", "you", "mind", "closing", "the", "door", "?"], ["If", "it", "rains", "we", "will", "stay", "inside"], ["She", "said", "she", "had", "already", "finished"], ["The", "exam", "was", "harder", "than", "I", "expected"], ["Not", "only", "is", "he", "late", "but", "also", "rude"]]
  },
  levels: {
    easy: [["A1", "A2", "B1", "B2", "C1"]],
    hard: [["A1", "A2", "B1", "B2", "C1", "C2"]]
  }
};

export const spotBank: Record<Tier, { words: string[]; wrong: number; fix: string }[]> = {
  easy: [
    { words: ["My", "freind", "is", "from", "Peru"], wrong: 1, fix: "friend" },
    { words: ["I", "like", "watter", "and", "juice"], wrong: 2, fix: "water" },
    { words: ["The", "techer", "is", "in", "class"], wrong: 1, fix: "teacher" },
    { words: ["We", "play", "footbal", "after", "school"], wrong: 2, fix: "football" },
    { words: ["Today", "is", "Wensday", "morning"], wrong: 2, fix: "Wednesday" },
    { words: ["I", "have", "two", "bruthers"], wrong: 3, fix: "brothers" }
  ],
  hard: [
    { words: ["It", "was", "definately", "worth", "it"], wrong: 2, fix: "definitely" },
    { words: ["We", "need", "to", "acommodate", "more", "students"], wrong: 3, fix: "accommodate" },
    { words: ["She", "recieved", "her", "certificate"], wrong: 1, fix: "received" },
    { words: ["The", "goverment", "announced", "new", "rules"], wrong: 1, fix: "government" },
    { words: ["His", "pronounciation", "is", "excellent"], wrong: 1, fix: "pronunciation" },
    { words: ["That", "is", "a", "neccessary", "step"], wrong: 3, fix: "necessary" }
  ]
};

export function tierFor(level: string): Tier[] {
  if (level === "A1" || level === "A2") return ["easy"];
  if (level === "Mixed") return ["easy", "hard"];
  return ["hard"];
}
