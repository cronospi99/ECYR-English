/* Unidades 3-5 — datos del curso */
if (!window.__COURSE_LOADED_2) {
window.__COURSE_LOADED_2 = 1;
window.COURSE = (window.COURSE || []).concat([
{
  n: "03", id: "u3", title: "Nouns & Articles", es: "Sustantivos y artículos",
  blurb: "A/An, plurals, this/that/these/those, articles, some/any.",
  tags: ["A/An", "Plurals", "Some/Any"],
  color: "#0F7A6B",
  topics: [
    {
      id: "a-an-plurals", label: "A/An & Plurals", icon: "a", title: "A / An & Plurals",
      kicker: "artículo indefinido · formación del plural",
      blocks: [
        { t: "rule", title: "a o an: manda el SONIDO", burst: "SOUND",
          en: "Use an before a vowel SOUND, not before a vowel letter. That is why we say a university and an hour.",
          es: "Se usa an delante de SONIDO vocálico, no de letra vocal. Por eso a university (suena «yu») y an hour (la h es muda).",
          formula: "a + consonant sound  ·  an + vowel sound",
          steps: [
            "a book, a car, a house — sonido consonántico.",
            "an apple, an egg, an umbrella — sonido vocálico.",
            "Casos trampa: a European, a one-way street, an MP3, an X-ray."
          ],
          tip: "Con siglas cuenta cómo se lee la letra: an MBA («em»), a UFO («yu»)." },
        { t: "table", title: "Formación del plural",
          head: ["Terminación", "Regla", "Ejemplo"],
          rows: [
            ["normal", "+ s", "book → books"],
            ["-s, -ss, -sh, -ch, -x, -z", "+ es", "box → boxes, watch → watches"],
            ["consonante + y", "y → ies", "city → cities"],
            ["vocal + y", "+ s", "boy → boys"],
            ["-f / -fe", "→ ves", "leaf → leaves, knife → knives"],
            ["-o", "+ es (a veces)", "potato → potatoes, photo → photos"]
          ] },
        { t: "table", title: "Plurales irregulares que hay que saber",
          head: ["Singular", "Plural", "Singular", "Plural"],
          rows: [
            ["man", "men", "woman", "women"],
            ["child", "children", "person", "people"],
            ["foot", "feet", "tooth", "teeth"],
            ["mouse", "mice", "goose", "geese"],
            ["fish", "fish", "sheep", "sheep"]
          ],
          note: "Estos plurales no llevan -s. «Childrens» y «peoples» son errores (peoples solo existe con el sentido de «pueblos»)." },
        { t: "blank", title: "Escribe el plural", help: "Aplica la regla de la terminación o recuerda el irregular.",
          items: [
            { pre: "one box → two", post: "", a: "boxes", why: "-x → +es." },
            { pre: "one city → three", post: "", a: "cities", why: "consonante + y → ies." },
            { pre: "one knife → two", post: "", a: "knives", why: "-fe → ves." },
            { pre: "one child → four", post: "", a: "children", why: "Irregular." },
            { pre: "one person → many", post: "", a: "people", why: "Irregular: people." },
            { pre: "one tooth → all my", post: "", a: "teeth", why: "Irregular: teeth." },
            { pre: "one sheep → ten", post: "", a: "sheep", why: "Invariable." },
            { pre: "one photo → some", post: "", a: "photos", why: "photo es excepción: solo +s." }
          ] },
        { t: "mc", title: "a, an o nada", help: "Di la palabra en voz alta: el primer SONIDO decide.",
          qs: [
            { q: "___ hour", opts: ["a", "an"], a: 1, why: "La h de hour es muda: suena /aʊə/." },
            { q: "___ university", opts: ["a", "an"], a: 0, why: "Suena /juːnɪ/, consonántico." },
            { q: "___ honest man", opts: ["a", "an"], a: 1, why: "honest: h muda." },
            { q: "___ European city", opts: ["a", "an"], a: 0, why: "Suena /jʊər/, como «yu»." },
            { q: "«I need ___ information.»", opts: ["an", "some", "a"], a: 1, why: "information es incontable: no admite a/an." },
            { q: "«She has ___ nice eyes.»", opts: ["a", "an", "—"], a: 2, why: "Plural: sin artículo indefinido." }
          ] },
        { t: "match", title: "Empareja singular y plural", help: "Todos son irregulares.",
          pairs: [["man", "men"], ["woman", "women"], ["child", "children"], ["foot", "feet"], ["mouse", "mice"], ["person", "people"]] }
      ]
    },
    {
      id: "this-that", label: "This / That", icon: "this", title: "This · That · These · Those",
      kicker: "demostrativos: cerca y lejos",
      blocks: [
        { t: "rule", title: "Distancia y número", burst: "POINT",
          en: "This and these are near the speaker; that and those are further away. This/that are singular, these/those plural.",
          es: "This y these están cerca; that y those están lejos. This/that son singulares, these/those plurales.",
          formula: "near: this / these   ·   far: that / those",
          steps: [
            "This book (uno, aquí) · These books (varios, aquí).",
            "That car (uno, allí) · Those cars (varios, allí).",
            "Al teléfono: «Hello, this is Ana» — nunca «I am Ana»."
          ] },
        { t: "table", title: "Los cuatro demostrativos",
          head: ["", "Singular", "Plural"],
          rows: [
            ["Cerca (here)", "this", "these"],
            ["Lejos (there)", "that", "those"]
          ],
          note: "Pronunciación: this /ðɪs/ corto, these /ðiːz/ largo. Es la diferencia audible entre singular y plural." },
        { t: "examples", title: "En uso",
          items: [
            { en: "This is my sister.", es: "Presentar a alguien que está contigo." },
            { en: "Are these your keys?", es: "Varios objetos cerca." },
            { en: "That building is very old.", es: "Algo señalado a distancia." },
            { en: "Those were good days.", es: "También sirve para tiempo pasado lejano." }
          ] },
        { t: "mc", title: "Elige el demostrativo", help: "Decide primero cerca/lejos y luego singular/plural.",
          qs: [
            { q: "___ book in my hand is great.", opts: ["This", "These", "Those"], a: 0, why: "Cerca y singular → this." },
            { q: "___ shoes over there are expensive.", opts: ["This", "That", "Those"], a: 2, why: "Lejos y plural → those." },
            { q: "Are ___ your glasses? (en tu mano)", opts: ["this", "these", "that"], a: 1, why: "glasses es plural y está cerca → these." },
            { q: "On the phone: «Hello, ___ is Ana.»", opts: ["this", "that", "it"], a: 0, why: "Fórmula fija al presentarse por teléfono." },
            { q: "___ was a difficult year.", opts: ["This", "That", "These"], a: 1, why: "Un año ya pasado, distancia temporal → that." },
            { q: "«I like ___ trousers.» (los que llevas puestos)", opts: ["this", "these", "that"], a: 1, why: "trousers es plural." }
          ] },
        { t: "blank", title: "Completa", help: "Cerca/lejos y singular/plural.",
          items: [
            { pre: "", post: "is my new phone. (en la mano)", a: "This", why: "Cerca, singular." },
            { pre: "", post: "are my parents. (aquí conmigo)", a: "These", why: "Cerca, plural." },
            { pre: "", post: "mountain is very high. (a lo lejos)", a: "That", why: "Lejos, singular." },
            { pre: "", post: "flowers over there are beautiful.", a: "Those", why: "Lejos, plural." }
          ] }
      ]
    },
    {
      id: "articles", label: "Articles", icon: "the", title: "Articles: A, An, The, Ø",
      kicker: "cuándo poner THE y cuándo no",
      blocks: [
        { t: "rule", title: "Primera mención vs. segunda mención", burst: "RULE",
          en: "Use a/an the first time you mention something, and the when the listener already knows which one you mean.",
          es: "Se usa a/an la primera vez que mencionas algo, y the cuando ya se sabe de cuál hablas.",
          formula: "I saw a dog. The dog was black.",
          steps: [
            "a/an: uno cualquiera, primera vez.",
            "the: ese en concreto, único o ya conocido — the sun, the President, the book I bought.",
            "Ø (sin artículo): plurales e incontables en sentido general — I like coffee. Dogs are loyal."
          ],
          tip: "No se usa the con nombres de países (excepto the UK, the USA, the Netherlands), idiomas, comidas ni deportes: I speak Spanish, I play tennis." },
        { t: "table", title: "Guía rápida",
          head: ["Situación", "Artículo", "Ejemplo"],
          rows: [
            ["Primera mención, singular contable", "a / an", "I need a pen."],
            ["Ya mencionado o único", "the", "Close the door. The moon is bright."],
            ["Plural en sentido general", "Ø", "Cats sleep a lot."],
            ["Incontable en general", "Ø", "Water is free."],
            ["Instrumentos musicales", "the", "She plays the piano."],
            ["Deportes y comidas", "Ø", "We play football. Lunch is at two."]
          ] },
        { t: "blank", title: "a / an / the / —", help: "Escribe — (guion) si no hace falta artículo.",
          items: [
            { pre: "I bought", post: "car yesterday.", a: "a", why: "Primera mención." },
            { pre: "", post: "car is red.", a: "The", why: "Ya sabemos qué coche." },
            { pre: "I love", post: "music.", a: "—", alt: ["-", ""], why: "Incontable en sentido general: sin artículo." },
            { pre: "She plays", post: "guitar.", a: "the", why: "Instrumentos musicales llevan the." },
            { pre: "We went to", post: "London.", a: "—", alt: ["-", ""], why: "Ciudades sin artículo." },
            { pre: "He is", post: "best student in the class.", a: "the", why: "Superlativos llevan the." },
            { pre: "", post: "dogs are loyal animals.", a: "—", alt: ["-", ""], why: "Plural general: sin artículo." },
            { pre: "Look at", post: "sun!", a: "the", why: "Objeto único." }
          ] },
        { t: "mc", title: "¿The o nada?", help: "Pregúntate: ¿hablo de algo concreto y conocido, o en general?",
          qs: [
            { q: "«I like ___ Italian food.»", opts: ["the", "a", "—"], a: 2, why: "Sentido general → sin artículo." },
            { q: "«___ Everest is the highest mountain.»", opts: ["The", "A", "—"], a: 2, why: "Montañas concretas no llevan the (sí las cordilleras: the Andes)." },
            { q: "«She works at ___ hospital near my house.»", opts: ["a", "the", "—"], a: 1, why: "Está identificado por «near my house»." },
            { q: "«He speaks ___ English very well.»", opts: ["the", "an", "—"], a: 2, why: "Idiomas sin artículo." },
            { q: "«I go to ___ gym twice a week.»", opts: ["the", "a", "—"], a: 0, why: "Lugares habituales conocidos: the gym, the cinema." },
            { q: "«___ USA is a big country.»", opts: ["The", "A", "—"], a: 0, why: "Excepción: the USA, the UK, the Netherlands." }
          ] }
      ]
    },
    {
      id: "a-some-any", label: "A / Some / Any", icon: "some", title: "A, Some & Any",
      kicker: "contables, incontables y cantidad indefinida",
      blocks: [
        { t: "rule", title: "Afirmativo vs. negativo/pregunta", burst: "QTY",
          en: "Some goes in affirmative sentences, any in negatives and questions. Both work with plurals and uncountables.",
          es: "Some va en frases afirmativas; any en negativas y preguntas. Los dos se usan con plurales e incontables.",
          formula: "some (+) · any (− / ?)",
          steps: [
            "I have some money. → afirmativo.",
            "I don't have any money. → negativo.",
            "Do you have any questions? → pregunta.",
            "Excepción: some en preguntas cuando ofreces algo: «Would you like some tea?»"
          ] },
        { t: "table", title: "Contables e incontables",
          head: ["Tipo", "Ejemplos", "Se usa con"],
          rows: [
            ["Contable singular", "a book, an apple", "a / an, one"],
            ["Contable plural", "books, apples", "some, any, many, a few"],
            ["Incontable", "water, money, bread, information, advice", "some, any, much, a little"]
          ],
          note: "Incontables no llevan a/an ni plural: «an information» y «advices» son errores. Se dice a piece of information, some advice." },
        { t: "blank", title: "some / any / a / an", help: "¿La frase es afirmativa, negativa o pregunta? ¿El sustantivo es contable?",
          items: [
            { pre: "There is", post: "milk in the fridge.", a: "some", why: "Afirmativo + incontable." },
            { pre: "I don't have", post: "money.", a: "any", why: "Negativo → any." },
            { pre: "Do you have", post: "questions?", a: "any", why: "Pregunta → any." },
            { pre: "I need", post: "pen.", a: "a", why: "Contable singular." },
            { pre: "Would you like", post: "coffee?", a: "some", why: "Ofrecimiento: some en pregunta." },
            { pre: "There aren't", post: "chairs here.", a: "any", why: "Negativo + plural." }
          ] },
        { t: "mc", title: "Cantidad", help: "much con incontables, many con contables plurales.",
          qs: [
            { q: "«How ___ sugar do you want?»", opts: ["much", "many"], a: 0, why: "sugar es incontable → much." },
            { q: "«How ___ people are there?»", opts: ["much", "many"], a: 1, why: "people es contable plural → many." },
            { q: "«I have ___ friends in Berlin.»", opts: ["a few", "a little"], a: 0, why: "a few + contable plural." },
            { q: "«Add ___ salt.»", opts: ["a few", "a little"], a: 1, why: "a little + incontable." },
            { q: "Which is correct?", opts: ["I need an advice.", "I need some advice.", "I need advices."], a: 1, why: "advice es incontable." },
            { q: "«There isn't ___ bread left.»", opts: ["some", "any", "a"], a: 1, why: "Negativo → any." }
          ] },
        { t: "quiz", title: "Unit 3 review quiz", pass: 7,
          qs: [
            { d: "a/an", q: "«___ hour»", opts: ["a", "an"], a: 1, why: "h muda → an hour." },
            { d: "plural", q: "Plural of «knife»", opts: ["knifes", "knives", "knive"], a: 1, why: "-fe → ves." },
            { d: "plural", q: "Plural of «person»", opts: ["persons", "people", "peoples"], a: 1, why: "people." },
            { d: "dem", q: "«___ shoes over there»", opts: ["These", "Those", "That"], a: 1, why: "Lejos + plural." },
            { d: "dem", q: "Phone: «Hello, ___ is Ana.»", opts: ["this", "that", "it"], a: 0, why: "Fórmula fija." },
            { d: "the", q: "«I speak ___ French.»", opts: ["the", "a", "—"], a: 2, why: "Idiomas sin artículo." },
            { d: "the", q: "«She plays ___ piano.»", opts: ["the", "a", "—"], a: 0, why: "Instrumentos con the." },
            { d: "some", q: "«I don't have ___ time.»", opts: ["some", "any"], a: 1, why: "Negativo → any." },
            { d: "much", q: "«How ___ books?»", opts: ["much", "many"], a: 1, why: "Contable plural → many." },
            { d: "unc", q: "Which is uncountable?", opts: ["chair", "information", "apple"], a: 1, why: "information no tiene plural." }
          ] }
      ]
    }
  ]
},

{
  n: "04", id: "u4", title: "Describing Things", es: "Describir",
  blurb: "Adjectives, adverbs of frequency, comparatives and superlatives.",
  tags: ["Adjectives", "Comparatives", "Adverbs"],
  color: "#C25E00",
  topics: [
    {
      id: "adjectives", label: "Adjectives", icon: "adj", title: "Adjectives",
      kicker: "posición · orden · nunca plural",
      blocks: [
        { t: "rule", title: "Delante del sustantivo y sin plural", burst: "DESCRIBE",
          en: "Adjectives go before the noun and never change form: two red cars, not two reds cars.",
          es: "El adjetivo va delante del sustantivo y nunca cambia: two red cars, no «two reds cars».",
          formula: "adjective + noun   ·   be + adjective",
          steps: [
            "a big house — delante del sustantivo.",
            "The house is big. — después del verbo to be.",
            "Sin concordancia: happy children, happy child."
          ],
          tip: "Orden aproximado cuando hay varios: opinión → tamaño → edad → forma → color → origen → material. «A beautiful small old round black Italian wooden table.»" },
        { t: "table", title: "Adjetivos frecuentes por parejas",
          head: ["Adjetivo", "Traducción", "Opuesto", "Traducción"],
          rows: [
            ["big", "grande", "small", "pequeño"],
            ["cheap", "barato", "expensive", "caro"],
            ["easy", "fácil", "difficult", "difícil"],
            ["young", "joven", "old", "viejo"],
            ["fast", "rápido", "slow", "lento"],
            ["clean", "limpio", "dirty", "sucio"],
            ["boring", "aburrido", "interesting", "interesante"],
            ["safe", "seguro", "dangerous", "peligroso"]
          ] },
        { t: "table", title: "-ed o -ing: sentir o causar",
          head: ["Forma", "Significado", "Ejemplo"],
          rows: [
            ["-ed", "cómo te sientes", "I am bored. (estoy aburrido)"],
            ["-ing", "cómo es la cosa", "The film is boring. (la peli es aburrida)"]
          ],
          note: "«I am boring» significa «soy una persona aburrida». Error muy común y muy visible." },
        { t: "mc", title: "Adjetivos en contexto", help: "Piensa si describes una persona que siente o una cosa que causa el sentimiento.",
          qs: [
            { q: "«The lesson was ___.» (nos aburrió)", opts: ["bored", "boring"], a: 1, why: "La clase causa el aburrimiento → -ing." },
            { q: "«I was ___ by the news.»", opts: ["surprised", "surprising"], a: 0, why: "Yo siento la sorpresa → -ed." },
            { q: "Which is correct?", opts: ["two reds cars", "two red cars", "two car reds"], a: 1, why: "El adjetivo no lleva plural y va delante." },
            { q: "«She has ___ hair.»", opts: ["long black", "black long"], a: 0, why: "Tamaño/longitud antes que color." },
            { q: "«This exercise is very ___.»", opts: ["easy", "easily"], a: 0, why: "Después de to be va adjetivo, no adverbio." },
            { q: "«I'm ___ in history.»", opts: ["interested", "interesting"], a: 0, why: "Yo siento el interés → interested in." }
          ] },
        { t: "order", title: "Ordena los adjetivos", prompt: "Ordena: una mesa de madera, vieja y pequeña.",
          words: ["a", "small", "old", "wooden", "table"], answer: "a small old wooden table",
          why: "Tamaño → edad → material → sustantivo." }
      ]
    },
    {
      id: "adv-frequency", label: "Frequency", icon: "%", title: "Adverbs of Frequency",
      kicker: "always → never y su posición",
      blocks: [
        { t: "rule", title: "La posición cambia con TO BE", burst: "ORDER",
          en: "Frequency adverbs go before the main verb, but after the verb to be.",
          es: "Los adverbios de frecuencia van antes del verbo principal, pero después del verbo to be.",
          formula: "S + adverb + verb   ·   S + be + adverb",
          steps: [
            "I always drink tea. → antes del verbo principal.",
            "She is always late. → después de to be.",
            "Con auxiliar, van en medio: I have never been to Rome."
          ] },
        { t: "table", title: "Escala de frecuencia",
          head: ["Adverbio", "%", "Traducción"],
          rows: [
            ["always", "100%", "siempre"],
            ["usually", "80%", "normalmente"],
            ["often", "60%", "a menudo"],
            ["sometimes", "40%", "a veces"],
            ["rarely / seldom", "15%", "raramente"],
            ["hardly ever", "5%", "casi nunca"],
            ["never", "0%", "nunca"]
          ],
          note: "never ya es negativo: «I don't never go» es doble negación incorrecta." },
        { t: "blank", title: "Coloca el adverbio", help: "Escribe la frase completa con el adverbio en su sitio.",
          items: [
            { pre: "(always) She", post: "late.  →  She is", a: "always late", alt: ["always late."], why: "Con to be, después: She is always late." },
            { pre: "(never) I", post: "coffee.  →  I", a: "never drink coffee", alt: ["never drink coffee."], why: "Antes del verbo principal." },
            { pre: "(usually) They", post: "at 8.  →  They", a: "usually arrive at 8", alt: ["usually arrive at 8."], why: "Antes del verbo." },
            { pre: "(sometimes) He", post: "tired.  →  He is", a: "sometimes tired", alt: ["sometimes tired."], why: "Después de is." }
          ] },
        { t: "mc", title: "Frecuencia", help: "Localiza el verbo: ¿es to be o un verbo normal?",
          qs: [
            { q: "«She ___ goes to the gym.»", opts: ["always", "is always"], a: 0, why: "goes es verbo principal → solo el adverbio delante." },
            { q: "«He ___ angry.»", opts: ["never is", "is never"], a: 1, why: "Con to be el adverbio va detrás." },
            { q: "Which is correct?", opts: ["I don't never smoke.", "I never smoke.", "I never don't smoke."], a: 1, why: "never ya es negativo." },
            { q: "«How ___ do you travel?»", opts: ["much", "often", "many"], a: 1, why: "How often pregunta frecuencia." },
            { q: "Order: «I / been / have / never / to Japan»", opts: ["I never have been to Japan", "I have never been to Japan"], a: 1, why: "Entre auxiliar y participio." },
            { q: "Which means about 40%?", opts: ["usually", "sometimes", "hardly ever"], a: 1, why: "sometimes ≈ a veces." }
          ] }
      ]
    },
    {
      id: "comparatives", label: "Comparatives", icon: "＞", title: "Comparatives",
      kicker: "-er than · more … than",
      blocks: [
        { t: "rule", title: "Corto con -er, largo con more", burst: "COMPARE",
          en: "One-syllable adjectives take -er; adjectives of three syllables or more take more. Two-syllable adjectives split.",
          es: "Los adjetivos de una sílaba llevan -er; los de tres o más llevan more. Los de dos sílabas se reparten.",
          formula: "adj + er + than   ·   more + adj + than",
          steps: [
            "tall → taller than",
            "expensive → more expensive than",
            "happy → happier than (acaba en -y → ier)",
            "big → bigger than (dobla la consonante final)"
          ],
          tip: "Irregulares imprescindibles: good → better, bad → worse, far → further/farther." },
        { t: "table", title: "Reglas de forma",
          head: ["Adjetivo", "Regla", "Comparativo"],
          rows: [
            ["cheap (1 sílaba)", "+ er", "cheaper"],
            ["big (vocal+consonante)", "doblar + er", "bigger"],
            ["easy (acaba en y)", "y → ier", "easier"],
            ["modern (2 sílabas)", "more", "more modern"],
            ["beautiful (3+)", "more", "more beautiful"],
            ["good / bad / far", "irregular", "better / worse / further"]
          ] },
        { t: "examples", title: "Otras comparaciones",
          items: [
            { en: "Madrid is as big as Rome.", es: "as + adjetivo + as = tan… como." },
            { en: "This one isn't as good as that one.", es: "Negativo: no tan… como." },
            { en: "My car is less expensive than yours.", es: "less = menos (más formal que not as…as)." },
            { en: "The more you practise, the better you get.", es: "Estructura the more… the better." }
          ] },
        { t: "blank", title: "Forma el comparativo", help: "Cuenta las sílabas y mira la terminación.",
          items: [
            { pre: "Tokyo is (big)", post: "than Lisbon.", a: "bigger", why: "Una sílaba, vocal+consonante → doblar: bigger." },
            { pre: "This test is (easy)", post: "than the last one.", a: "easier", why: "-y → ier." },
            { pre: "Trains are (expensive)", post: "than buses.", a: "more expensive", why: "3 sílabas → more." },
            { pre: "Today is (good)", post: "than yesterday.", a: "better", why: "Irregular." },
            { pre: "My mark was (bad)", post: "than his.", a: "worse", why: "Irregular." },
            { pre: "She runs (fast)", post: "than me.", a: "faster", why: "Una sílaba → faster." }
          ] },
        { t: "mc", title: "Comparar bien", help: "Vigila el than y no dupliques la marca de comparativo.",
          qs: [
            { q: "Which is correct?", opts: ["more cheaper", "cheaper", "cheaperer"], a: 1, why: "No se combinan more y -er." },
            { q: "«She is ___ than me.»", opts: ["taller", "more tall", "tallest"], a: 0, why: "Una sílaba → -er." },
            { q: "«This film is ___ that one.»", opts: ["better than", "better that", "more better than"], a: 0, why: "better + than." },
            { q: "«Madrid is ___ Rome.» (igual de grande)", opts: ["as big as", "so big as", "as bigger as"], a: 0, why: "as + adjetivo base + as." },
            { q: "«My phone is ___ than yours.»", opts: ["more modern", "moderner", "most modern"], a: 0, why: "Dos sílabas terminadas en -ern → more." },
            { q: "«He lives ___ from here than I do.»", opts: ["farer", "further", "more far"], a: 1, why: "far → further/farther." }
          ] }
      ]
    },
    {
      id: "superlatives", label: "Superlatives", icon: "★", title: "Superlatives",
      kicker: "the -est · the most",
      blocks: [
        { t: "rule", title: "Siempre con THE", burst: "TOP",
          en: "Superlatives compare one thing with a whole group and almost always take the.",
          es: "El superlativo compara con todo un grupo y casi siempre lleva the.",
          formula: "the + adj + est   ·   the most + adj",
          steps: [
            "the tallest building in the world",
            "the most expensive restaurant in town",
            "Detrás del superlativo se usa in con lugares y of con grupos: the best in the class, the best of all."
          ] },
        { t: "table", title: "Comparativo y superlativo juntos",
          head: ["Adjetivo", "Comparativo", "Superlativo"],
          rows: [
            ["cheap", "cheaper", "the cheapest"],
            ["big", "bigger", "the biggest"],
            ["happy", "happier", "the happiest"],
            ["expensive", "more expensive", "the most expensive"],
            ["good", "better", "the best"],
            ["bad", "worse", "the worst"],
            ["far", "further", "the furthest"]
          ] },
        { t: "blank", title: "Escribe el superlativo", help: "Añade the y la terminación correcta.",
          items: [
            { pre: "Everest is (high)", post: "mountain in the world.", a: "the highest", why: "Una sílaba → the highest." },
            { pre: "This is (good)", post: "day of my life.", a: "the best", why: "Irregular: the best." },
            { pre: "It was (bad)", post: "film of the year.", a: "the worst", why: "Irregular: the worst." },
            { pre: "She is (intelligent)", post: "student in the class.", a: "the most intelligent", why: "4 sílabas → the most." },
            { pre: "That was (funny)", post: "joke of the night.", a: "the funniest", why: "-y → iest." }
          ] },
        { t: "mc", title: "Superlativos", help: "Comprueba the, la preposición y la forma irregular.",
          qs: [
            { q: "«It's ___ city in Europe.»", opts: ["the biggest", "biggest", "the most big"], a: 0, why: "Superlativo con the y -est." },
            { q: "«He is the best player ___ the team.»", opts: ["in", "of", "at"], a: 0, why: "in + grupo o lugar concreto." },
            { q: "«This is ___ book I've ever read.»", opts: ["the worse", "the worst", "worse"], a: 1, why: "Superlativo de bad: the worst." },
            { q: "Which is correct?", opts: ["the most cheapest", "the cheapest", "cheapest of all"], a: 1, why: "No se combinan most y -est." },
            { q: "«She's ___ person I know.»", opts: ["the kindest", "the most kind", "kinder"], a: 0, why: "kind es de una sílaba → the kindest." },
            { q: "«Which is ___ of the three?»", opts: ["better", "the best", "the better"], a: 1, why: "Tres elementos → superlativo." }
          ] }
      ]
    },
    {
      id: "adv-manner", label: "Adverbs", icon: "-ly", title: "Adverbs of Manner",
      kicker: "cómo se hace la acción",
      blocks: [
        { t: "rule", title: "Adjetivo describe cosas, adverbio describe acciones", burst: "HOW",
          en: "Most adverbs of manner are the adjective plus -ly. They describe the verb, not the noun.",
          es: "La mayoría de adverbios de modo son el adjetivo + -ly. Describen al verbo, no al sustantivo.",
          formula: "adjective + ly  →  slow → slowly",
          steps: [
            "She is a careful driver. (adjetivo + sustantivo)",
            "She drives carefully. (verbo + adverbio)",
            "Irregulares: good → well, fast → fast, hard → hard.",
            "Ojo: hardly no significa «duramente» sino «casi nada»."
          ] },
        { t: "table", title: "Formación",
          head: ["Adjetivo", "Regla", "Adverbio"],
          rows: [
            ["quick", "+ ly", "quickly"],
            ["easy", "y → ily", "easily"],
            ["terrible", "-le → ly", "terribly"],
            ["automatic", "+ ally", "automatically"],
            ["good", "irregular", "well"],
            ["fast / hard", "sin cambio", "fast / hard"]
          ] },
        { t: "mc", title: "Adjetivo o adverbio", help: "Si modifica un verbo → adverbio. Si va con to be o un sustantivo → adjetivo.",
          qs: [
            { q: "«He speaks English ___.»", opts: ["good", "well"], a: 1, why: "Modifica a speaks → adverbio well." },
            { q: "«She is a ___ singer.»", opts: ["beautiful", "beautifully"], a: 0, why: "Delante de sustantivo → adjetivo." },
            { q: "«Drive ___, please.»", opts: ["careful", "carefully"], a: 1, why: "Modifica al verbo drive." },
            { q: "«The exam was ___ easy.»", opts: ["surprising", "surprisingly"], a: 1, why: "Modifica al adjetivo easy → adverbio." },
            { q: "«I can ___ hear you.» (casi nada)", opts: ["hard", "hardly"], a: 1, why: "hardly = apenas." },
            { q: "«They work very ___.»", opts: ["hard", "hardly"], a: 0, why: "work hard = trabajar mucho." }
          ] },
        { t: "quiz", title: "Unit 4 review quiz", pass: 7,
          qs: [
            { d: "adj", q: "«two ___ cars»", opts: ["reds", "red"], a: 1, why: "Los adjetivos no llevan plural." },
            { d: "-ed/-ing", q: "«The film was ___.»", opts: ["bored", "boring"], a: 1, why: "La película causa aburrimiento." },
            { d: "freq", q: "«She ___ late.»", opts: ["always is", "is always"], a: 1, why: "Después de to be." },
            { d: "freq", q: "Which is 0%?", opts: ["rarely", "never", "hardly ever"], a: 1, why: "never = nunca." },
            { d: "comp", q: "«big» → comparativo", opts: ["biger", "bigger", "more big"], a: 1, why: "Doblar consonante + er." },
            { d: "comp", q: "«good» → comparativo", opts: ["gooder", "better", "more good"], a: 1, why: "Irregular." },
            { d: "sup", q: "«bad» → superlativo", opts: ["the baddest", "the worst", "the worse"], a: 1, why: "the worst." },
            { d: "sup", q: "«He's the best ___ the class.»", opts: ["in", "of", "at"], a: 0, why: "in + grupo." },
            { d: "adv", q: "«He speaks English ___.»", opts: ["good", "well"], a: 1, why: "Adverbio irregular." },
            { d: "adv", q: "«easy» → adverbio", opts: ["easyly", "easily", "easely"], a: 1, why: "y → ily." }
          ] }
      ]
    }
  ]
},

{
  n: "05", id: "u5", title: "Actions & Abilities", es: "Acciones y capacidades",
  blurb: "Can/can't, present continuous, imperatives, would like.",
  tags: ["Can", "Continuous", "Would like"],
  color: "#7A1FA2",
  topics: [
    {
      id: "can-cant", label: "Can / Can't", icon: "can", title: "Can & Can't",
      kicker: "habilidad · permiso · petición",
      blocks: [
        { t: "rule", title: "Un modal invariable", burst: "ABILITY",
          en: "Can never changes form and is always followed by the base verb: no -s, no to.",
          es: "Can no cambia nunca y va siempre con el verbo en forma base: sin -s y sin to.",
          formula: "Subject + can / can't + base verb",
          steps: [
            "I can swim. He can swim. — sin -s en la tercera persona.",
            "Negativo: cannot → can't.",
            "Pregunta: Can you help me? — sin do."
          ],
          tip: "Pronunciación: en afirmativo can es débil /kən/; en negativo can't se alarga /kɑːnt/. Ese alargamiento es la pista para distinguirlos." },
        { t: "table", title: "Los tres usos",
          head: ["Uso", "Ejemplo", "Traducción"],
          rows: [
            ["Habilidad", "She can play the piano.", "Sabe tocar el piano."],
            ["Permiso", "Can I open the window?", "¿Puedo abrir la ventana?"],
            ["Petición", "Can you help me, please?", "¿Me puedes ayudar?"],
            ["Posibilidad", "It can rain in April.", "Puede llover en abril."]
          ],
          note: "Para pedir con más formalidad: Could you…? o Would you mind…?" },
        { t: "blank", title: "can / can't", help: "Piensa si la frase afirma o niega la capacidad.",
          items: [
            { pre: "I", post: "swim, but I'm not fast.", a: "can", why: "Afirmativo." },
            { pre: "He", post: "drive; he has no licence.", a: "can't", why: "Negativo." },
            { pre: "", post: "you speak Italian?", a: "Can", why: "Pregunta con can al principio." },
            { pre: "Birds", post: "fly, but penguins", a: "can", why: "Afirmativo con plural: can no cambia." },
            { pre: "Sorry, I", post: "come to the party.", a: "can't", why: "Negativo." }
          ] },
        { t: "mc", title: "Can en contexto", help: "Recuerda: sin to, sin -s, sin do.",
          qs: [
            { q: "Which is correct?", opts: ["She can to sing.", "She can sing.", "She cans sing."], a: 1, why: "can + verbo base, sin to y sin -s." },
            { q: "«___ I use your phone?»", opts: ["Can", "Do", "Am"], a: 0, why: "Permiso con can." },
            { q: "Negative of «I can drive»", opts: ["I don't can drive", "I can't drive", "I not can drive"], a: 1, why: "can't." },
            { q: "Short answer to «Can you cook?»", opts: ["Yes, I can.", "Yes, I do.", "Yes, I cook."], a: 0, why: "Se repite el modal." },
            { q: "More polite request:", opts: ["Can you help?", "Could you help?", "You help me."], a: 1, why: "could suaviza la petición." },
            { q: "«He ___ read when he was three.»", opts: ["can", "could", "cans"], a: 1, why: "Pasado de can → could." }
          ] }
      ]
    },
    {
      id: "present-continuous", label: "Continuous", icon: "-ing", title: "Present Continuous",
      kicker: "am/is/are + verbo -ing",
      blocks: [
        { t: "rule", title: "Ahora mismo o temporalmente", burst: "NOW",
          en: "Use the present continuous for actions happening now or temporary situations around now.",
          es: "Se usa para acciones que pasan ahora o situaciones temporales de este momento de la vida.",
          formula: "am / is / are + verb-ing",
          steps: [
            "Ahora: I'm working. Look! It's raining.",
            "Temporal: She is living in Lisbon this year.",
            "Planes fijos futuros: We are flying to Rome on Friday."
          ] },
        { t: "table", title: "Cómo se forma el -ing",
          head: ["Verbo", "Regla", "-ing"],
          rows: [
            ["work", "+ ing", "working"],
            ["make", "quitar -e", "making"],
            ["run", "doblar consonante", "running"],
            ["lie", "-ie → ying", "lying"],
            ["travel (UK)", "doblar la l", "travelling"]
          ] },
        { t: "table", title: "Verbos que no van en continuous",
          head: ["Grupo", "Verbos", "Se dice"],
          rows: [
            ["Estados mentales", "know, understand, remember, believe", "I know — no «I am knowing»"],
            ["Sentimientos", "like, love, hate, want, need", "I want — no «I am wanting»"],
            ["Pertenencia", "have (poseer), belong, own", "I have a car"],
            ["Sentidos", "see, hear, smell, taste", "I see it"]
          ],
          note: "have sí admite continuous cuando no significa poseer: I'm having lunch, I'm having a shower." },
        { t: "blank", title: "Present continuous", help: "Conjuga to be según el sujeto y añade -ing al verbo.",
          items: [
            { pre: "She (read)", post: "a book right now.", a: "is reading", why: "she → is + reading." },
            { pre: "They (play)", post: "football.", a: "are playing", why: "they → are + playing." },
            { pre: "I (not / work)", post: "today.", a: "am not working", alt: ["'m not working"], why: "am + not + working." },
            { pre: "Look! It (rain)", post: ".", a: "is raining", why: "it → is raining." },
            { pre: "We (run)", post: "to the station.", a: "are running", why: "run dobla la n." },
            { pre: "He (make)", post: "dinner.", a: "is making", why: "make pierde la e." }
          ] },
        { t: "mc", title: "Uso correcto", help: "¿Pasa ahora o es un estado permanente?",
          qs: [
            { q: "Which is correct?", opts: ["I am knowing the answer.", "I know the answer."], a: 1, why: "know es verbo de estado." },
            { q: "«Listen! Someone ___ the piano.»", opts: ["plays", "is playing"], a: 1, why: "Listen! marca acción en curso." },
            { q: "«Water ___ at 100 °C.»", opts: ["boils", "is boiling"], a: 0, why: "Hecho general → present simple." },
            { q: "«I ___ lunch right now.»", opts: ["have", "am having"], a: 1, why: "have lunch admite continuous." },
            { q: "«She ___ in Paris this month.»", opts: ["lives", "is living"], a: 1, why: "Situación temporal." },
            { q: "«What ___ you ___?» (ahora)", opts: ["do / do", "are / doing"], a: 1, why: "Present continuous para el momento." }
          ] }
      ]
    },
    {
      id: "simple-vs-continuous", label: "Simple vs Cont.", icon: "vs", title: "Simple vs Continuous",
      kicker: "elegir el tiempo correcto",
      blocks: [
        { t: "rule", title: "Rutina contra momento", burst: "CHOOSE",
          en: "Present simple = routines and permanent facts. Present continuous = right now and temporary.",
          es: "Present simple = rutina y hechos permanentes. Present continuous = ahora y temporal.",
          formula: "every day → simple   ·   now → continuous",
          steps: [
            "I work in a bank. (siempre) — I'm working from home today. (hoy)",
            "Palabras clave del simple: always, usually, every day, on Mondays.",
            "Palabras clave del continuous: now, right now, at the moment, today, Look!, Listen!"
          ] },
        { t: "table", title: "Comparación directa",
          head: ["Present simple", "Present continuous"],
          rows: [
            ["She teaches English.", "She is teaching right now."],
            ["I never drink coffee.", "I'm drinking tea at the moment."],
            ["They live in Rome.", "They are living with friends this week."],
            ["Does he work here?", "Is he working today?"]
          ] },
        { t: "mc", title: "Elige el tiempo", help: "Busca las palabras clave de tiempo en la frase.",
          qs: [
            { q: "«I ___ to the gym every Monday.»", opts: ["go", "am going"], a: 0, why: "every Monday → rutina." },
            { q: "«Be quiet! The baby ___.»", opts: ["sleeps", "is sleeping"], a: 1, why: "Ahora mismo." },
            { q: "«She usually ___ the bus.»", opts: ["takes", "is taking"], a: 0, why: "usually → simple." },
            { q: "«Where ___ you ___ right now?»", opts: ["do / go", "are / going"], a: 1, why: "right now → continuous." },
            { q: "«He ___ three languages.»", opts: ["speaks", "is speaking"], a: 0, why: "Capacidad permanente." },
            { q: "«Today I ___ from home.»", opts: ["work", "am working"], a: 1, why: "today marca lo temporal." }
          ] },
        { t: "order", title: "Construye la frase", prompt: "Ordena: «Ahora mismo no estoy trabajando».",
          words: ["I", "am", "not", "working", "right", "now"], answer: "I am not working right now",
          why: "Sujeto + be + not + verbo-ing + tiempo." }
      ]
    },
    {
      id: "imperatives", label: "Imperatives", icon: "!", title: "Imperatives",
      kicker: "instrucciones, órdenes y avisos",
      blocks: [
        { t: "rule", title: "Verbo desnudo, sin sujeto", burst: "DO IT",
          en: "The imperative is just the base verb. The negative adds don't.",
          es: "El imperativo es el verbo base, sin sujeto. El negativo añade don't.",
          formula: "Verb!   ·   Don't + verb!",
          steps: [
            "Open the door. / Sit down, please.",
            "Don't touch that. / Don't be late.",
            "Sugerencia inclusiva: Let's go. Let's not argue."
          ],
          tip: "Añadir please y bajar la entonación es lo que separa una orden de una petición amable." },
        { t: "examples", title: "Dónde se ven",
          items: [
            { en: "Turn left at the traffic lights.", es: "Indicaciones de camino." },
            { en: "Mix the flour and the eggs.", es: "Recetas e instrucciones." },
            { en: "Don't feed the animals.", es: "Avisos y prohibiciones." },
            { en: "Let's take a break.", es: "Propuesta para el grupo." }
          ] },
        { t: "mc", title: "Imperativos", help: "Sin sujeto, sin to, negativo con don't.",
          qs: [
            { q: "Which is a correct imperative?", opts: ["You open the door.", "Open the door.", "To open the door."], a: 1, why: "Verbo base sin sujeto." },
            { q: "Negative of «Touch it»", opts: ["Not touch it.", "Don't touch it.", "Doesn't touch it."], a: 1, why: "don't + verbo." },
            { q: "«___ be nervous.»", opts: ["Don't", "Not", "No"], a: 0, why: "Don't be, incluso con to be." },
            { q: "Suggestion for you and me:", opts: ["Let's go.", "Let us to go.", "We go."], a: 0, why: "Let's + verbo base." },
            { q: "Politest form:", opts: ["Sit down!", "Sit down, please.", "You sit."], a: 1, why: "please suaviza." },
            { q: "Recipe style:", opts: ["You add salt.", "Add salt.", "Adding salt."], a: 1, why: "Las recetas usan imperativo." }
          ] }
      ]
    },
    {
      id: "would-like", label: "Would like", icon: "'d", title: "Would Like",
      kicker: "pedir con educación",
      blocks: [
        { t: "rule", title: "Más educado que want", burst: "POLITE",
          en: "Would like means want, but polite. It takes to + verb or a noun.",
          es: "Would like significa «querer», pero educado. Va con to + verbo o con un sustantivo.",
          formula: "would like + noun  /  would like + to + verb",
          steps: [
            "I'd like a coffee, please.",
            "I'd like to book a table.",
            "Pregunta: Would you like some water? — con some, no any."
          ],
          tip: "«Do you like coffee?» pregunta por el gusto general. «Would you like a coffee?» es un ofrecimiento ahora." },
        { t: "table", title: "Formas",
          head: ["Tipo", "Estructura", "Ejemplo"],
          rows: [
            ["Afirmativo", "I'd like…", "I'd like the menu, please."],
            ["Pregunta", "Would you like…?", "Would you like a dessert?"],
            ["Negativo", "I wouldn't like…", "I wouldn't like to live there."],
            ["Respuesta corta", "Yes, please. / No, thanks.", "— Would you like tea? — Yes, please."]
          ] },
        { t: "dialogue", title: "In a café",
          lines: [
            { who: "Waiter", text: "Good afternoon. What would you like?", es: "Buenas tardes. ¿Qué desea?" },
            { who: "Customer", text: "I'd like a black coffee and a croissant, please.", es: "Un café solo y un cruasán, por favor." },
            { who: "Waiter", text: "Would you like anything else?", es: "¿Algo más?" },
            { who: "Customer", text: "No, thanks. Could I have the bill later?", es: "No, gracias. ¿Me trae la cuenta luego?" },
            { who: "Waiter", text: "Of course.", es: "Por supuesto." }
          ] },
        { t: "mc", title: "Would like", help: "Con sustantivo va directo; con verbo necesita to.",
          qs: [
            { q: "Which is correct?", opts: ["I'd like go home.", "I'd like to go home.", "I'd like going home."], a: 1, why: "would like + to + verbo." },
            { q: "«___ you like some tea?»", opts: ["Do", "Would", "Are"], a: 1, why: "Ofrecimiento con would." },
            { q: "«Do you like fish?» asks about…", opts: ["now", "in general"], a: 1, why: "like en presente simple = gusto general." },
            { q: "Polite answer to an offer:", opts: ["Yes, I want.", "Yes, please.", "Yes, I like."], a: 1, why: "Yes, please es la fórmula." },
            { q: "«I'd like ___ information, please.»", opts: ["an", "some", "any"], a: 1, why: "Incontable en afirmativa → some." },
            { q: "Contraction of «I would like»:", opts: ["I'll like", "I'd like", "I'm like"], a: 1, why: "would → 'd." }
          ] }
      ]
    },
    {
      id: "verbs-inf-ing", label: "Verb + inf/-ing", icon: "to", title: "Verbs + Infinitive or -ing",
      kicker: "qué verbo pide qué forma",
      blocks: [
        { t: "rule", title: "Dos patrones que hay que memorizar", burst: "PATTERN",
          en: "Some verbs are followed by to + verb, others by verb-ing. A few accept both.",
          es: "Unos verbos piden to + verbo y otros verbo-ing. Unos pocos aceptan las dos formas.",
          formula: "want to go   ·   enjoy going",
          steps: [
            "to + verbo: want, need, decide, hope, plan, would like, learn, try.",
            "verbo-ing: enjoy, like, love, hate, finish, stop, mind, suggest, avoid.",
            "Después de preposición, siempre -ing: good at cooking, interested in learning."
          ],
          tip: "stop cambia de sentido: «stop smoking» = dejar de fumar; «stop to smoke» = pararse para fumar." },
        { t: "table", title: "Listas rápidas",
          head: ["+ to + verbo", "+ verbo-ing", "Ambos"],
          rows: [
            ["want, need, decide", "enjoy, finish, avoid", "like"],
            ["hope, plan, promise", "mind, suggest, keep", "love"],
            ["learn, try, offer", "practise, spend time", "hate"],
            ["would like, agree", "look forward to", "start / begin"]
          ] },
        { t: "blank", title: "to + verbo o verbo-ing", help: "Mira el primer verbo y recuerda a qué grupo pertenece.",
          items: [
            { pre: "I want (go)", post: "home.", a: "to go", why: "want + to + verbo." },
            { pre: "She enjoys (swim)", post: "in the sea.", a: "swimming", why: "enjoy + -ing." },
            { pre: "They decided (move)", post: "to Lisbon.", a: "to move", why: "decide + to." },
            { pre: "Do you mind (wait)", post: "?", a: "waiting", why: "mind + -ing." },
            { pre: "He is good at (cook)", post: ".", a: "cooking", why: "Tras preposición, -ing." },
            { pre: "We hope (see)", post: "you soon.", a: "to see", why: "hope + to." }
          ] },
        { t: "mc", title: "Elige la forma", help: "Grupo del verbo o preposición previa.",
          qs: [
            { q: "«I finished ___ the report.»", opts: ["to write", "writing"], a: 1, why: "finish + -ing." },
            { q: "«She promised ___ early.»", opts: ["to come", "coming"], a: 0, why: "promise + to." },
            { q: "«I'm interested in ___ Japanese.»", opts: ["to learn", "learning"], a: 1, why: "Preposición in + -ing." },
            { q: "«He stopped ___» (dejó el tabaco)", opts: ["to smoke", "smoking"], a: 1, why: "stop + -ing = abandonar el hábito." },
            { q: "«Let's avoid ___ in traffic.»", opts: ["to sit", "sitting"], a: 1, why: "avoid + -ing." },
            { q: "«I'd like ___ a table for two.»", opts: ["to book", "booking"], a: 0, why: "would like + to." }
          ] },
        { t: "quiz", title: "Unit 5 review quiz", pass: 7,
          qs: [
            { d: "can", q: "«She can ___.»", opts: ["to swim", "swim", "swims"], a: 1, why: "can + base." },
            { d: "can", q: "Negative of can", opts: ["don't can", "can't", "not can"], a: 1, why: "can't." },
            { d: "-ing", q: "«run» → -ing", opts: ["runing", "running"], a: 1, why: "Doblar la n." },
            { d: "-ing", q: "«Listen! She ___.»", opts: ["sings", "is singing"], a: 1, why: "Ahora mismo." },
            { d: "state", q: "Which is wrong?", opts: ["I know it.", "I am knowing it."], a: 1, why: "know no va en continuous." },
            { d: "imp", q: "Negative imperative of «be late»", opts: ["Not be late.", "Don't be late."], a: 1, why: "Don't be." },
            { d: "let's", q: "«___ go to the beach.»", opts: ["Let's", "Let us to", "We"], a: 0, why: "Let's + base." },
            { d: "'d", q: "«I'd like ___ a table.»", opts: ["book", "to book"], a: 1, why: "would like + to." },
            { d: "inf", q: "«enjoy» goes with…", opts: ["to + verb", "verb-ing"], a: 1, why: "enjoy + -ing." },
            { d: "prep", q: "«good at ___»", opts: ["to cook", "cooking"], a: 1, why: "Preposición + -ing." }
          ] }
      ]
    }
  ]
}
]);
}
