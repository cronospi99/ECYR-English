/* Unidades 1-2 — datos del curso (contenido y ejercicios) */
if (!window.__COURSE_LOADED_1) {
window.__COURSE_LOADED_1 = 1;
window.COURSE = (window.COURSE || []).concat([
{
  n: "01", id: "u1", title: "Foundations", es: "Cimientos",
  blurb: "Alphabet, Numbers, Greetings, Verb To Be, Present Simple.",
  tags: ["Alphabet", "Numbers", "To Be"],
  color: "#D6202B",
  topics: [
    {
      id: "alphabet", label: "Alphabet", icon: "Aa",
      title: "The English Alphabet", kicker: "26 letras · 5 vocales · 21 consonantes",
      blocks: [
        { t: "rule", title: "Nombre vs. sonido", burst: "START HERE",
          en: "Every letter has a NAME (how you say it in the ABC song) and one or more SOUNDS (how it works inside a word).",
          es: "Cada letra tiene un NOMBRE (como se dice en la canción del abecedario) y uno o más SONIDOS (como suena dentro de una palabra).",
          formula: "letter name  ≠  letter sound",
          steps: [
            "La letra C se llama /siː/ («si»), pero en cat suena /k/ y en city suena /s/.",
            "La letra G se llama /dʒiː/ («yi»), pero en go suena /g/ y en giant suena /dʒ/.",
            "Cuando deletreas (spelling) usas el NOMBRE: B-O-O-K, «bi-ou-ou-key»."
          ],
          tip: "Al deletrear en voz alta, los angloparlantes dicen «double L» para LL y «capital B» para B mayúscula." },

        { t: "cards", variant: "letter", title: "Letter cards",
          hint: "Toca una tarjeta para voltearla y ver la palabra clave. Sin sonido automático: usa el botón del altavoz si lo quieres oír.",
          items: [
            { k: "A", w: "Apple", s: "/eɪ/", es: "manzana", v: 1 },
            { k: "B", w: "Ball", s: "/biː/", es: "pelota" },
            { k: "C", w: "Cat", s: "/siː/", es: "gato" },
            { k: "D", w: "Dog", s: "/diː/", es: "perro" },
            { k: "E", w: "Egg", s: "/iː/", es: "huevo", v: 1 },
            { k: "F", w: "Fish", s: "/ef/", es: "pez" },
            { k: "G", w: "Grape", s: "/dʒiː/", es: "uva" },
            { k: "H", w: "Hat", s: "/eɪtʃ/", es: "sombrero" },
            { k: "I", w: "Ice", s: "/aɪ/", es: "hielo", v: 1 },
            { k: "J", w: "Jam", s: "/dʒeɪ/", es: "mermelada" },
            { k: "K", w: "Kite", s: "/keɪ/", es: "cometa" },
            { k: "L", w: "Lion", s: "/el/", es: "león" },
            { k: "M", w: "Moon", s: "/em/", es: "luna" },
            { k: "N", w: "Nest", s: "/en/", es: "nido" },
            { k: "O", w: "Orange", s: "/oʊ/", es: "naranja", v: 1 },
            { k: "P", w: "Pencil", s: "/piː/", es: "lápiz" },
            { k: "Q", w: "Queen", s: "/kjuː/", es: "reina" },
            { k: "R", w: "Rain", s: "/ɑːr/", es: "lluvia" },
            { k: "S", w: "Sun", s: "/es/", es: "sol" },
            { k: "T", w: "Tiger", s: "/tiː/", es: "tigre" },
            { k: "U", w: "Umbrella", s: "/juː/", es: "paraguas", v: 1 },
            { k: "V", w: "Violin", s: "/viː/", es: "violín" },
            { k: "W", w: "Water", s: "/ˈdʌbəljuː/", es: "agua" },
            { k: "X", w: "X-ray", s: "/eks/", es: "radiografía" },
            { k: "Y", w: "Yellow", s: "/waɪ/", es: "amarillo" },
            { k: "Z", w: "Zebra", s: "/zed/", es: "cebra" }
          ] },

        { t: "phonics", title: "Phonics: nombre y sonido letra a letra",
          hint: "El nombre es como se llama la letra; el sonido es lo que hace dentro de la palabra clave.",
          items: [
            { k: "A", s: "/eɪ/", e: "🍎", w: "a – apple" }, { k: "B", s: "/biː/", e: "⚽", w: "b – ball" },
            { k: "C", s: "/siː/", e: "🐱", w: "c – cat" }, { k: "D", s: "/diː/", e: "🐶", w: "d – dog" },
            { k: "E", s: "/iː/", e: "🥚", w: "e – egg" }, { k: "F", s: "/ef/", e: "🐟", w: "f – fish" },
            { k: "G", s: "/dʒiː/", e: "🍇", w: "g – grape" }, { k: "H", s: "/eɪtʃ/", e: "🎩", w: "h – hat" },
            { k: "I", s: "/aɪ/", e: "🍦", w: "i – ice cream" }, { k: "J", s: "/dʒeɪ/", e: "🫙", w: "j – jam" },
            { k: "K", s: "/keɪ/", e: "🪁", w: "k – kite" }, { k: "L", s: "/el/", e: "🦁", w: "l – lion" },
            { k: "M", s: "/em/", e: "🌙", w: "m – moon" }, { k: "N", s: "/en/", e: "🪺", w: "n – nest" },
            { k: "O", s: "/oʊ/", e: "🍊", w: "o – orange" }, { k: "P", s: "/piː/", e: "✏️", w: "p – pencil" },
            { k: "Q", s: "/kjuː/", e: "👸", w: "qu – queen" }, { k: "R", s: "/ɑːr/", e: "🌈", w: "r – rainbow" },
            { k: "S", s: "/es/", e: "☀️", w: "s – sun" }, { k: "T", s: "/tiː/", e: "🐯", w: "t – tiger" },
            { k: "U", s: "/juː/", e: "☂️", w: "u – umbrella" }, { k: "V", s: "/viː/", e: "🎻", w: "v – violin" },
            { k: "W", s: "/ˈdʌbəljuː/", e: "💧", w: "w – water" }, { k: "X", s: "/eks/", e: "🦴", w: "x – x-ray" },
            { k: "Y", s: "/waɪ/", e: "💛", w: "y – yellow" }, { k: "Z", s: "/zed/", e: "🦓", w: "z – zebra" }
          ] },

        { t: "song", title: "The ABC Song",
          hint: "El abecedario se canta en grupos. Estos son los cortes de la melodía clásica: fíjate en el tramo rápido L-M-N-O-P.",
          lines: [
            { letters: ["A", "B", "C", "D", "E", "F", "G"] },
            { letters: ["H", "I", "J", "K"] },
            { letters: ["L", "M", "N", "O", "P"] },
            { letters: ["Q", "R", "S"] },
            { letters: ["T", "U", "V"] },
            { letters: ["W", "X"] },
            { letters: ["Y", "and", "Z"] }
          ],
          note: "Now I know my ABC — next time won't you sing with me." },

        { t: "table", title: "Las letras que más cuestan",
          head: ["Letra", "Nombre en inglés", "Error típico en español", "Truco"],
          rows: [
            ["G", "/dʒiː/ — «yi»", "decir «ge»", "G = «yi», J = «yei»"],
            ["H", "/eɪtʃ/ — «eich»", "decir «ache» con h muda", "La H sí suena: house = /haʊs/"],
            ["I", "/aɪ/ — «ai»", "confundirla con E", "I = «ai», E = «i»"],
            ["J", "/dʒeɪ/ — «yei»", "decir «jota»", "job = /dʒɒb/, nunca «jjob»"],
            ["V", "/viː/ — «vi»", "pronunciar como B", "Muerde el labio inferior: very"],
            ["W", "«double u»", "decir «uve doble»", "water = /ˈwɔːtər/"],
            ["Y", "/waɪ/ — «uai»", "decir «i griega»", "yes = /jes/"],
            ["Z", "«zed» (UK) / «zee» (US)", "decir «seta»", "Elige un acento y sé consistente"]
          ],
          note: "Vocales: A E I O U (y a veces Y, como en happy o my). Toda sílaba en inglés necesita un sonido vocálico." },

        { t: "trace", title: "Traza la letra", help: "Elige una letra, dibuja encima con el dedo o el ratón y compara con la guía. Sirve para fijar la forma de las mayúsculas y minúsculas.",
          letters: ["A", "B", "E", "G", "J", "Q", "R", "S", "W", "Z"] },

        { t: "match", title: "Empareja letra e imagen", help: "Haz clic en una letra y luego en la palabra que empieza con ella. Si falla, la pareja tiembla y puedes volver a intentarlo.",
          pairs: [["A", "🍎 Apple"], ["Z", "🦓 Zebra"], ["Q", "👸 Queen"], ["U", "☂️ Umbrella"], ["K", "🪁 Kite"], ["V", "🎻 Violin"]] },

        { t: "order", title: "Ordena el alfabeto", prompt: "Coloca estas letras en orden alfabético:",
          words: ["P", "L", "T", "N", "R", "M", "Q", "S", "O"],
          answer: "L M N O P Q R S T",
          why: "Después de K viene L-M-N-O-P (el trozo rápido de la canción) y luego Q-R-S-T." },

        { t: "blank", title: "Completa la palabra", help: "Escribe la letra que falta. Fíjate en el dibujo y en la traducción.",
          items: [
            { pre: "🍎  A P P", post: "E   (manzana)", a: "L", why: "apple — la doble P y luego L: A-P-P-L-E." },
            { pre: "🐟  F I", post: "H   (pez)", a: "S", why: "fish — la combinación SH suena /ʃ/, como «shh»." },
            { pre: "🌈  R A I N B O", post: "  (arcoíris)", a: "W", why: "rainbow — termina en W, que aquí no suena como vocal." },
            { pre: "👸  Q U E E", post: "  (reina)", a: "N", why: "queen — la Q casi siempre va con U." },
            { pre: "🐯  T I", post: "E R   (tigre)", a: "G", why: "tiger — la G suena /g/ delante de vocal fuerte." },
            { pre: "☂️  U M B R E L L", post: "  (paraguas)", a: "A", why: "umbrella — termina en A, muy común en préstamos del latín." },
            { pre: "🎩  H A", post: "  (sombrero)", a: "T", why: "hat — tres letras, una sílaba: /hæt/." },
            { pre: "🦁  L I O", post: "  (león)", a: "N", why: "lion — /ˈlaɪən/, dos sílabas." }
          ] },

        { t: "mc", title: "Vocal o consonante", help: "Recuerda: solo A, E, I, O, U son vocales. Todas las demás son consonantes.",
          qs: [
            { q: "Is E a vowel or a consonant?", opts: ["Vowel", "Consonant"], a: 0, why: "E es una de las cinco vocales: A E I O U." },
            { q: "Is T a vowel or a consonant?", opts: ["Vowel", "Consonant"], a: 1, why: "T no está en A E I O U, así que es consonante." },
            { q: "How do you say the letter G in English?", opts: ["/geɪ/", "/dʒiː/", "/xe/"], a: 1, why: "G se llama /dʒiː/ («yi»). El sonido /g/ es otra cosa: go." },
            { q: "Which letter comes after V?", opts: ["U", "W", "X"], a: 1, why: "El final es U-V-W-X-Y-Z, así que después de V va W." },
            { q: "How many letters does the English alphabet have?", opts: ["25", "26", "27"], a: 1, why: "26. El español tiene 27 porque incluye la Ñ; el inglés no la tiene." },
            { q: "Which word starts with the sound /k/?", opts: ["City", "Queen", "Giant"], a: 1, why: "Queen empieza con /kw/. City empieza con /s/ y giant con /dʒ/." }
          ] },

        { t: "quiz", title: "Alphabet quiz", pass: 7,
          qs: [
            { d: "A", q: "Which word starts with A?", opts: ["Apple 🍎", "Dog 🐶", "Fish 🐟", "Moon 🌙"], a: 0, why: "Apple: A-P-P-L-E." },
            { d: "🐶 Dog", q: "What letter does DOG start with?", opts: ["D", "B", "G", "P"], a: 0, why: "Dog empieza con D /diː/." },
            { d: "C D E ?", q: "What comes next?", opts: ["F", "G", "B"], a: 0, why: "C-D-E-F." },
            { d: "W X Y ?", q: "What comes next?", opts: ["A", "V", "Z"], a: 2, why: "Z cierra el alfabeto." },
            { d: "spelling", q: "How do you spell BOOK out loud?", opts: ["bi-ou-ou-key", "be-o-o-ka", "bu-uk"], a: 0, why: "Se usan los NOMBRES de las letras: B /biː/, O /oʊ/, O, K /keɪ/." },
            { d: "H", q: "Is the H silent in the word HOUSE?", opts: ["Yes", "No"], a: 1, why: "En inglés la H inicial casi siempre suena: /haʊs/. Excepciones: hour, honest." },
            { d: "🦓", q: "Zebra starts with…", opts: ["S", "Z", "C"], a: 1, why: "Z /zed/ o /ziː/." },
            { d: "I", q: "Is I a vowel?", opts: ["Yes", "No"], a: 0, why: "Sí: A E I O U." },
            { d: "Q", q: "Q is almost always followed by…", opts: ["U", "A", "E"], a: 0, why: "queen, quick, question: QU juntas." },
            { d: "ABC", q: "Which group is in the right order?", opts: ["L M N O P", "L N M O P", "M L N P O"], a: 0, why: "L-M-N-O-P, el tramo rápido de la canción." }
          ] }
      ]
    },

    {
      id: "numbers", label: "Numbers", icon: "12",
      title: "Numbers in English", kicker: "cardinales · ordinales · contar · operaciones",
      blocks: [
        { t: "rule", title: "El patrón de las decenas", burst: "PATTERN",
          en: "From 21 to 99 you say the ten, a hyphen, and the unit: twenty-one, forty-five, ninety-nine.",
          es: "De 21 a 99 dices la decena, un guion y la unidad. No existe «twentyone» ni «twenty and one».",
          formula: "twenty + - + one  →  twenty-one",
          steps: [
            "13-19 terminan en -TEEN: thirteen, fourteen, fifteen…",
            "20-90 terminan en -TY: twenty, thirty, forty (¡sin U!), fifty…",
            "100 = one hundred / a hundred. 101 = one hundred and one (UK)."
          ],
          tip: "thirTEEN lleva el acento al final; THIRty al principio. Ese acento es la única diferencia audible entre 13 y 30." },

        { t: "cards", variant: "number", title: "0 – 100",
          hint: "Toca una tarjeta para ver cómo se escribe con palabras.",
          items: [
            { k: "0", w: "zero", es: "cero" }, { k: "1", w: "one", es: "uno" }, { k: "2", w: "two", es: "dos" },
            { k: "3", w: "three", es: "tres" }, { k: "4", w: "four", es: "cuatro" }, { k: "5", w: "five", es: "cinco" },
            { k: "6", w: "six", es: "seis" }, { k: "7", w: "seven", es: "siete" }, { k: "8", w: "eight", es: "ocho" },
            { k: "9", w: "nine", es: "nueve" }, { k: "10", w: "ten", es: "diez" }, { k: "11", w: "eleven", es: "once" },
            { k: "12", w: "twelve", es: "doce" }, { k: "13", w: "thirteen", es: "trece" }, { k: "14", w: "fourteen", es: "catorce" },
            { k: "15", w: "fifteen", es: "quince" }, { k: "16", w: "sixteen", es: "dieciséis" }, { k: "17", w: "seventeen", es: "diecisiete" },
            { k: "18", w: "eighteen", es: "dieciocho" }, { k: "19", w: "nineteen", es: "diecinueve" }, { k: "20", w: "twenty", es: "veinte" },
            { k: "30", w: "thirty", es: "treinta" }, { k: "40", w: "forty", es: "cuarenta" }, { k: "50", w: "fifty", es: "cincuenta" },
            { k: "60", w: "sixty", es: "sesenta" }, { k: "70", w: "seventy", es: "setenta" }, { k: "80", w: "eighty", es: "ochenta" },
            { k: "90", w: "ninety", es: "noventa" }, { k: "100", w: "one hundred", es: "cien" }
          ] },

        { t: "table", title: "Trampas de escritura",
          head: ["Número", "Correcto", "Incorrecto", "Por qué"],
          rows: [
            ["4 / 40", "four / forty", "fourty", "forty pierde la U"],
            ["5 / 15 / 50", "five / fifteen / fifty", "fiveteen", "five cambia a fif-"],
            ["8 / 18 / 80", "eight / eighteen / eighty", "eightteen", "solo una T"],
            ["9 / 19 / 90", "nine / nineteen / ninety", "ninty", "ninety mantiene la E"],
            ["12", "twelve", "twelfe", "twelfth es el ordinal"],
            ["21", "twenty-one", "twentyone", "guion obligatorio"]
          ] },

        { t: "cards", variant: "plain", title: "Ordinales", hint: "Se usan para orden, fechas y pisos.",
          items: [
            { k: "1st", w: "first", es: "primero" }, { k: "2nd", w: "second", es: "segundo" },
            { k: "3rd", w: "third", es: "tercero" }, { k: "4th", w: "fourth", es: "cuarto" },
            { k: "5th", w: "fifth", es: "quinto" }, { k: "8th", w: "eighth", es: "octavo" },
            { k: "9th", w: "ninth", es: "noveno" }, { k: "12th", w: "twelfth", es: "duodécimo" },
            { k: "20th", w: "twentieth", es: "vigésimo" }, { k: "21st", w: "twenty-first", es: "vigésimo primero" }
          ] },

        { t: "examples", title: "Números en la vida real",
          items: [
            { en: "My phone number is two-oh-five, four-four-nine…", es: "El 0 en teléfonos se dice «oh»." },
            { en: "The score was two–nil. / two to one.", es: "En deportes, 0 puede ser nil (UK) o zero." },
            { en: "I live on the fourth floor, flat 12.", es: "Piso con ordinal, número de puerta con cardinal." },
            { en: "She was born on the third of May, 1999.", es: "Fechas: ordinal para el día." },
            { en: "It costs twenty-five pounds fifty.", es: "Precios: unidad + decimales sin decir «point»." }
          ] },

        { t: "mc", title: "¿Cuántos hay?", help: "Cuenta los objetos y elige el número escrito en inglés.",
          qs: [
            { q: "🍎🍎🍎 — How many apples are there?", opts: ["two", "three", "four"], a: 1, why: "Tres manzanas = three." },
            { q: "🚗🚗🚗🚗🚗🚗🚗 — How many cars?", opts: ["six", "seven", "eight"], a: 1, why: "Siete coches = seven." },
            { q: "⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐ — How many stars?", opts: ["twelve", "twenty", "two"], a: 0, why: "12 = twelve. 20 = twenty; ojo con la confusión." },
            { q: "How do you write 40?", opts: ["fourty", "forty", "fortty"], a: 1, why: "forty, sin U." },
            { q: "What is fifteen plus five?", opts: ["twenty", "twelve", "ten"], a: 0, why: "15 + 5 = 20 (twenty)." },
            { q: "Which one is 30?", opts: ["thirteen", "thirty", "threety"], a: 1, why: "-TY = decenas. -TEEN = 13-19." }
          ] },

        { t: "blank", title: "Escribe el número en palabras", help: "Todo en minúsculas y con guion cuando haga falta.",
          items: [
            { pre: "7 =", post: "", a: "seven", why: "seven." },
            { pre: "13 =", post: "", a: "thirteen", why: "-teen para 13-19." },
            { pre: "40 =", post: "", a: "forty", why: "forty pierde la U de four." },
            { pre: "22 =", post: "", a: "twenty-two", alt: ["twenty two"], why: "Con guion: twenty-two." },
            { pre: "100 =", post: "", a: "one hundred", alt: ["a hundred", "hundred"], why: "one hundred o a hundred." },
            { pre: "3rd =", post: "", a: "third", why: "Ordinal irregular: three → third." }
          ] },

        { t: "quiz", title: "Numbers quiz", pass: 8,
          qs: [
            { d: "7", q: "In words?", opts: ["seven", "eight", "nine"], a: 0, why: "seven." },
            { d: "twelve", q: "Which number?", opts: ["11", "12", "13"], a: 1, why: "twelve = 12." },
            { d: "30 vs 13", q: "THIRty: where is the stress?", opts: ["First syllable", "Second syllable"], a: 0, why: "THIRty (30) acentúa la primera; thirTEEN (13) la segunda." },
            { d: "fifteen", q: "Which number?", opts: ["5", "15", "50"], a: 1, why: "fifteen = 15." },
            { d: "100", q: "In words?", opts: ["one thousand", "one hundred", "one million"], a: 1, why: "one hundred." },
            { d: "3rd", q: "Which ordinal word?", opts: ["three", "third", "threeth"], a: 1, why: "third." },
            { d: "5 + 3", q: "Result in words?", opts: ["seven", "eight", "nine"], a: 1, why: "eight." },
            { d: "10 − 4", q: "Result in words?", opts: ["five", "six", "seven"], a: 1, why: "six." },
            { d: "2 × 6", q: "Result in words?", opts: ["ten", "twelve", "fourteen"], a: 1, why: "twelve." },
            { d: "0", q: "On the phone, 0 is usually…", opts: ["nil", "oh", "nought"], a: 1, why: "En números de teléfono se dice «oh»; nil es para deportes." }
          ] }
      ]
    },

    {
      id: "greetings", label: "Greetings", icon: "Hi", title: "Greetings & Farewells",
      kicker: "formal · informal · respuestas",
      blocks: [
        { t: "rule", title: "Formal o informal: elige el registro", burst: "SOCIAL",
          en: "The greeting you choose signals distance. Good morning is safe with anyone; What's up? only works with friends.",
          es: "El saludo marca la distancia social. Good morning sirve con cualquiera; What's up? solo con amigos.",
          formula: "Good + morning / afternoon / evening",
          steps: [
            "Good morning: hasta las 12:00. Good afternoon: de 12:00 a ~18:00. Good evening: al llegar de noche.",
            "Good night NO es un saludo: es despedida al ir a dormir.",
            "Con desconocidos y en el trabajo, empieza formal y baja de registro si la otra persona lo hace."
          ] },
        { t: "cards", variant: "plain", title: "Saludos",
          items: [
            { k: "Formal", w: "Good morning", es: "Buenos días" },
            { k: "Formal", w: "Good afternoon", es: "Buenas tardes" },
            { k: "Formal", w: "Good evening", es: "Buenas noches (al llegar)" },
            { k: "Formal", w: "How do you do?", es: "Muy formal, casi ceremonial" },
            { k: "Neutro", w: "Hello", es: "Hola" },
            { k: "Informal", w: "Hi / Hey", es: "Hola (coloquial)" },
            { k: "Informal", w: "What's up?", es: "¿Qué tal?" },
            { k: "Informal", w: "How's it going?", es: "¿Cómo va?" }
          ] },
        { t: "table", title: "Pregunta y respuesta",
          head: ["Pregunta", "Respuesta natural", "Traducción"],
          rows: [
            ["How are you?", "I'm fine, thanks. And you?", "Bien, gracias. ¿Y tú?"],
            ["How are you doing?", "Pretty good, thanks.", "Bastante bien."],
            ["How's it going?", "Not bad. You?", "No me va mal. ¿Y a ti?"],
            ["What's up?", "Not much.", "Nada especial."],
            ["Nice to meet you.", "Nice to meet you too.", "Encantado. Igualmente."]
          ],
          note: "How are you? es casi una fórmula: nadie espera un informe médico. Responde corto y devuelve la pregunta." },
        { t: "dialogue", title: "Primer día de trabajo",
          lines: [
            { who: "Anna", text: "Good morning. My name is Anna. I'm the new designer.", es: "Buenos días. Me llamo Anna, soy la nueva diseñadora." },
            { who: "Tom", text: "Good morning, Anna. I'm Tom. Nice to meet you.", es: "Buenos días, Anna. Soy Tom. Encantado." },
            { who: "Anna", text: "Nice to meet you too. How are you?", es: "Igualmente. ¿Cómo estás?" },
            { who: "Tom", text: "I'm fine, thanks. Let me show you your desk.", es: "Bien, gracias. Te enseño tu escritorio." },
            { who: "Anna", text: "Thank you. See you later!", es: "Gracias. ¡Hasta luego!" }
          ] },
        { t: "mc", title: "Elige el saludo correcto", help: "Piensa en la hora y en la relación entre las personas.",
          qs: [
            { q: "You meet your boss at 9:00 AM. You say:", opts: ["What's up?", "Good morning.", "Good night."], a: 1, why: "Antes de mediodía y con tu jefe: Good morning." },
            { q: "You arrive at a dinner party at 8:00 PM. You say:", opts: ["Good evening.", "Good night.", "Good afternoon."], a: 0, why: "Good evening al llegar de noche. Good night es para irse." },
            { q: "You meet a friend in the street. You say:", opts: ["How do you do?", "Hey, how's it going?", "Good afternoon, sir."], a: 1, why: "Con amigos, registro informal." },
            { q: "Someone says «Nice to meet you». You reply:", opts: ["Nice to meet you too.", "You're welcome.", "I'm fine."], a: 0, why: "Se devuelve la fórmula con too." },
            { q: "You are leaving the office at the end of the day. You say:", opts: ["Good evening.", "Have a good one. Bye!", "How do you do?"], a: 1, why: "Al despedirse: Bye, See you tomorrow, Have a good evening." },
            { q: "Which one is NOT a greeting?", opts: ["Hello", "Good night", "Hi there"], a: 1, why: "Good night solo se usa para despedirse." }
          ] },
        { t: "order", title: "Construye la frase", prompt: "Ordena: presentarse en una reunión.",
          words: ["Nice", "to", "meet", "you", "too"], answer: "Nice to meet you too",
          why: "Estructura fija: Nice to meet you (+ too si respondes)." },
        { t: "match", title: "Empareja pregunta y respuesta", help: "Clic en la izquierda y luego en su respuesta natural.",
          pairs: [["How are you?", "I'm fine, thanks."], ["What's your name?", "My name is Ana."], ["Where are you from?", "I'm from Peru."], ["See you tomorrow!", "Bye! Have a good evening."]] }
      ]
    },

    {
      id: "verb-be", label: "Verb To Be", icon: "be", title: "Verb To Be",
      kicker: "am · is · are — el verbo más usado del inglés",
      blocks: [
        { t: "rule", title: "Una forma para cada persona", burst: "CORE",
          en: "To be has three present forms: am (I), is (he/she/it), are (you/we/they). English needs the subject; Spanish does not.",
          es: "To be tiene tres formas en presente: am, is, are. En inglés el sujeto es obligatorio: no se dice «Is a teacher», sino «She is a teacher».",
          formula: "Subject + am / is / are + complement",
          steps: [
            "Elige la forma según el sujeto: I am, he is, they are.",
            "Para negar, añade not detrás del verbo: She is not a nurse.",
            "Para preguntar, invierte verbo y sujeto: Is she a nurse?"
          ],
          tip: "Contracciones: I'm, you're, he's, we're, they're. En negativo: isn't, aren't. «Amn't» no existe: se usa I'm not." },
        { t: "table", title: "Conjugación completa",
          head: ["Pronombre", "Afirmativo", "Contracción", "Negativo", "Contracción neg."],
          rows: [
            ["I", "I am", "I'm", "I am not", "I'm not"],
            ["You", "You are", "You're", "You are not", "You aren't"],
            ["He", "He is", "He's", "He is not", "He isn't"],
            ["She", "She is", "She's", "She is not", "She isn't"],
            ["It", "It is", "It's", "It is not", "It isn't"],
            ["We", "We are", "We're", "We are not", "We aren't"],
            ["They", "They are", "They're", "They are not", "They aren't"]
          ] },
        { t: "examples", title: "Los cinco usos de TO BE",
          items: [
            { en: "I am a student.", es: "Identidad y profesión." },
            { en: "She is twenty-two years old.", es: "Edad — en español se usa «tener», en inglés «to be»." },
            { en: "They are from Colombia.", es: "Origen y nacionalidad." },
            { en: "It is cold today.", es: "Estados y clima." },
            { en: "We are hungry.", es: "Sensaciones: hungry, thirsty, tired, afraid." }
          ] },
        { t: "table", title: "Preguntas y respuestas cortas",
          head: ["Pregunta", "Sí", "No"],
          rows: [
            ["Am I late?", "Yes, you are.", "No, you aren't."],
            ["Is he a doctor?", "Yes, he is.", "No, he isn't."],
            ["Are they ready?", "Yes, they are.", "No, they aren't."]
          ],
          note: "En la respuesta corta afirmativa no se contrae el verbo: «Yes, he is», nunca «Yes, he's»." },
        { t: "reading", title: "Reading: My friend Carlos",
          paras: [
            "My name is Laura. I am twenty years old and I am a student. My best friend is Carlos. He is from Mexico, but he is not Mexican — his parents are Argentinian.",
            "Carlos is very tall and he is always hungry. We are in the same class, and our teacher is Mrs. Reed. She is strict but she is fair. Today it is cold, so we are inside the library."
          ],
          vocab: [["best friend", "mejor amigo"], ["always", "siempre"], ["strict", "estricto"], ["fair", "justo"], ["inside", "dentro de"]] },
        { t: "blank", title: "am / is / are", help: "Mira el sujeto: I → am, he/she/it → is, you/we/they → are.",
          items: [
            { pre: "She", post: "a nurse.", a: "is", why: "Sujeto she → is." },
            { pre: "They", post: "from Brazil.", a: "are", why: "Sujeto they → are." },
            { pre: "I", post: "a student.", a: "am", why: "Sujeto I → am, siempre." },
            { pre: "It", post: "cold today.", a: "is", why: "It → is. El clima usa to be." },
            { pre: "You and I", post: "late.", a: "are", why: "«You and I» = we → are." },
            { pre: "My brother", post: "not at home.", a: "is", why: "Un sujeto singular en tercera persona → is." },
            { pre: "Anna and Tom", post: "teachers.", a: "are", why: "Dos personas → they → are." },
            { pre: "The keys", post: "on the table.", a: "are", why: "keys es plural → are." }
          ] },
        { t: "order", title: "Construye la frase", prompt: "Ordena: «Ella no es profesora».",
          words: ["She", "is", "not", "a", "teacher"], answer: "She is not a teacher",
          why: "Sujeto + be + not + complemento. El artículo a es obligatorio con profesiones en singular." },
        { t: "mc", title: "Elige la forma correcta", help: "Primero identifica el sujeto, luego decide am/is/are y el orden.",
          qs: [
            { q: "___ you a doctor?", opts: ["Is", "Are", "Am"], a: 1, why: "Con you siempre are: Are you a doctor?" },
            { q: "My sister ___ not at home.", opts: ["am", "is", "are"], a: 1, why: "my sister = she → is." },
            { q: "Which sentence is correct?", opts: ["I'm not hungry.", "I amn't hungry.", "I not am hungry."], a: 0, why: "«amn't» no existe en inglés estándar: I'm not." },
            { q: "Correct short answer to «Is she Spanish?»", opts: ["Yes, she's.", "Yes, she is.", "Yes, she are."], a: 1, why: "En respuestas cortas afirmativas no se contrae." },
            { q: "How old ___ your parents?", opts: ["is", "are", "am"], a: 1, why: "parents es plural → are." },
            { q: "Which is right in English?", opts: ["I have 20 years.", "I am 20 years old.", "I am 20 years."], a: 1, why: "La edad se expresa con to be + number + years old." }
          ] }
      ]
    },

    {
      id: "questions-be", label: "Questions", icon: "?", title: "Questions with Be",
      kicker: "yes/no · WH- questions",
      blocks: [
        { t: "rule", title: "Dos tipos de pregunta", burst: "ASK",
          en: "Yes/No questions start with the verb. WH- questions start with a question word, then the verb.",
          es: "Las preguntas de sí/no empiezan por el verbo. Las WH- empiezan por la palabra interrogativa y luego el verbo.",
          formula: "(WH-) + am/is/are + subject + …?",
          steps: [
            "Yes/No: Are you tired?  →  Yes, I am. / No, I'm not.",
            "WH-: Where are you from?  →  I'm from Chile.",
            "Nunca uses do/does con to be: «Do you are tired?» es incorrecto."
          ] },
        { t: "cards", variant: "plain", title: "WH- words",
          items: [
            { k: "What", w: "qué / cuál", es: "What is your name?" },
            { k: "Where", w: "dónde", es: "Where are you from?" },
            { k: "Who", w: "quién", es: "Who is that man?" },
            { k: "When", w: "cuándo", es: "When is the party?" },
            { k: "Why", w: "por qué", es: "Why are you late?" },
            { k: "How", w: "cómo", es: "How are you?" },
            { k: "How old", w: "qué edad", es: "How old is she?" },
            { k: "Whose", w: "de quién", es: "Whose bag is this?" }
          ] },
        { t: "table", title: "Estructura comparada",
          head: ["Tipo", "Orden", "Ejemplo"],
          rows: [
            ["Afirmativa", "Sujeto + be", "You are from Spain."],
            ["Yes/No", "Be + sujeto", "Are you from Spain?"],
            ["WH-", "WH + be + sujeto", "Where are you from?"],
            ["Sujeto = WH", "WH + be", "Who is at the door?"]
          ],
          note: "Cuando la palabra interrogativa ES el sujeto (Who / What), no hay inversión: «Who is your teacher?»." },
        { t: "dialogue", title: "An interview",
          lines: [
            { who: "Reporter", text: "Hello! What is your name?", es: "¡Hola! ¿Cómo te llamas?" },
            { who: "Mia", text: "My name is Mia.", es: "Me llamo Mia." },
            { who: "Reporter", text: "Where are you from, Mia?", es: "¿De dónde eres?" },
            { who: "Mia", text: "I'm from Dublin, but I live in Madrid now.", es: "Soy de Dublín, pero ahora vivo en Madrid." },
            { who: "Reporter", text: "How old are you?", es: "¿Cuántos años tienes?" },
            { who: "Mia", text: "I'm twenty-six.", es: "Tengo veintiséis." }
          ] },
        { t: "match", title: "Empareja pregunta y respuesta", help: "Fíjate en la palabra WH-: te dice qué tipo de información pide.",
          pairs: [["Where are you from?", "I'm from Peru."], ["How old is she?", "She's fifteen."], ["Who is that?", "That's my brother."], ["Why are you late?", "Because the bus was slow."], ["When is the exam?", "On Monday."]] },
        { t: "mc", title: "Forma la pregunta correcta", help: "Recuerda: WH + be + sujeto. Y con to be nunca se usa do/does.",
          qs: [
            { q: "You want to know someone's origin:", opts: ["Where you are from?", "Where are you from?", "Where do you from?"], a: 1, why: "Inversión: Where + are + you." },
            { q: "You want to know their age:", opts: ["How old are you?", "How many years you have?", "What age you are?"], a: 0, why: "How old + be + sujeto." },
            { q: "Which question is wrong?", opts: ["Are they ready?", "Do you are ready?", "Is he ready?"], a: 1, why: "Con to be no se usa do/does." },
            { q: "«___ is your favourite colour?»", opts: ["Who", "What", "Where"], a: 1, why: "Para cosas: What." },
            { q: "«___ bag is this?» — «It's mine.»", opts: ["Who", "Whose", "Which"], a: 1, why: "Whose pregunta por el poseedor." },
            { q: "Correct answer to «Are you Spanish?»", opts: ["No, I amn't.", "No, I'm not.", "No, I not am."], a: 1, why: "La única forma negativa contraída con I es I'm not." }
          ] },
        { t: "order", title: "Construye la pregunta", prompt: "Ordena: preguntar la edad de su hermana.",
          words: ["How", "old", "is", "your", "sister"], answer: "How old is your sister",
          why: "How old (WH) + is (be) + your sister (sujeto)." }
      ]
    },

    {
      id: "do-does", label: "Do / Does", icon: "do", title: "Do and Does",
      kicker: "el auxiliar del presente simple",
      blocks: [
        { t: "rule", title: "Auxiliar, no verbo principal", burst: "AUX",
          en: "Do and does build questions and negatives in the present simple. The main verb goes back to its base form.",
          es: "Do y does sirven para preguntar y negar en presente simple. El verbo principal vuelve a su forma base, sin -s.",
          formula: "Do / Does + subject + base verb …?",
          steps: [
            "DO con I, you, we, they. DOES con he, she, it.",
            "La -s de la tercera persona se «muda» al auxiliar: He works → Does he work?",
            "Error clásico: «Does she works?» — la -s solo puede estar en un sitio."
          ],
          tip: "Do también puede ser verbo principal: I do my homework. Y entonces convive con el auxiliar: Does he do his homework?" },
        { t: "table", title: "Afirmativo, negativo, pregunta",
          head: ["Sujeto", "Afirmativo", "Negativo", "Pregunta"],
          rows: [
            ["I / you / we / they", "I work", "I don't work", "Do you work?"],
            ["he / she / it", "He works", "He doesn't work", "Does he work?"]
          ] },
        { t: "examples", title: "Ejemplos",
          items: [
            { en: "Do you speak English?", es: "¿Hablas inglés?" },
            { en: "Does she live in Lima?", es: "¿Vive en Lima?" },
            { en: "They don't eat meat.", es: "No comen carne." },
            { en: "He doesn't have a car.", es: "No tiene coche." },
            { en: "What time does the shop open?", es: "¿A qué hora abre la tienda?" }
          ] },
        { t: "table", title: "Respuestas cortas",
          head: ["Pregunta", "Sí", "No"],
          rows: [
            ["Do you like coffee?", "Yes, I do.", "No, I don't."],
            ["Does he play tennis?", "Yes, he does.", "No, he doesn't."],
            ["Do they work here?", "Yes, they do.", "No, they don't."]
          ] },
        { t: "reading", title: "Reading: Daily Habits",
          paras: [
            "Maria and her brother Luis have very different daily habits. Maria wakes up early. She does yoga every morning. She doesn't drink coffee — she prefers tea. Does she eat breakfast? Yes, she does. She always eats fruit and eggs.",
            "Luis is different. He doesn't wake up early. He doesn't do exercise in the morning. But he does cook a big lunch every day. Do they eat together? Sometimes they do. Do you have healthy habits? What do you do every day?"
          ],
          vocab: [["habits", "hábitos"], ["wakes up", "se despierta"], ["prefers", "prefiere"], ["exercise", "ejercicio"], ["together", "juntos"]] },

        { t: "blank", title: "do / does / don't / doesn't", help: "Identifica el sujeto y si la frase es pregunta o negación.",
          items: [
            { pre: "", post: "you like pizza?", a: "Do", why: "you → Do." },
            { pre: "", post: "she work here?", a: "Does", why: "she → Does, y work sin -s." },
            { pre: "They", post: "speak French.", a: "don't", why: "Negativo con they → don't." },
            { pre: "My father", post: "smoke.", a: "doesn't", why: "my father = he → doesn't." },
            { pre: "Where", post: "your parents live?", a: "do", why: "parents → do." },
            { pre: "It", post: "matter.", a: "doesn't", why: "it → doesn't." }
          ] },
        { t: "mc", title: "Detecta el error", help: "Busca la -s doble, el auxiliar equivocado o el orden inverso.",
          qs: [
            { q: "Which sentence is correct?", opts: ["Does she works here?", "Does she work here?", "Do she work here?"], a: 1, why: "does + verbo base: work." },
            { q: "Which sentence is correct?", opts: ["He doesn't likes tea.", "He don't like tea.", "He doesn't like tea."], a: 2, why: "doesn't + base form." },
            { q: "«___ they live in Madrid?»", opts: ["Do", "Does", "Are"], a: 0, why: "they → Do. Are iría con adjetivo o sustantivo, no con live." },
            { q: "Correct short answer to «Does he drive?»", opts: ["Yes, he drives.", "Yes, he does.", "Yes, he do."], a: 1, why: "Respuesta corta con el auxiliar: does." },
            { q: "«What time ___ the film start?»", opts: ["do", "does", "is"], a: 1, why: "the film = it → does." },
            { q: "Which is correct?", opts: ["Does he do his homework?", "Does he does his homework?", "Do he do his homework?"], a: 0, why: "El primer do es auxiliar, el segundo verbo principal en forma base." }
          ] },
        { t: "order", title: "Construye la pregunta", prompt: "Ordena: preguntar si su hermano juega al fútbol.",
          words: ["Does", "your", "brother", "play", "football"], answer: "Does your brother play football",
          why: "Auxiliar + sujeto + verbo base + complemento." }
      ]
    },

    {
      id: "present-simple", label: "Present Simple", icon: "PS", title: "Present Simple",
      kicker: "rutinas · hechos · horarios",
      blocks: [
        { t: "rule", title: "Cuándo se usa", burst: "ROUTINE",
          en: "Use the present simple for habits, permanent facts and timetables — not for what is happening right now.",
          es: "Se usa para hábitos, hechos permanentes y horarios. Para lo que ocurre ahora mismo se usa el present continuous.",
          formula: "I / you / we / they + verb  ·  he / she / it + verb + s",
          steps: [
            "Hábito: I get up at seven every day.",
            "Hecho: Water boils at 100 °C.",
            "Horario: The train leaves at 8:15."
          ] },
        { t: "table", title: "La -s de la tercera persona",
          head: ["Terminación del verbo", "Regla", "Ejemplo"],
          rows: [
            ["normal", "+ s", "work → works"],
            ["-ss, -sh, -ch, -x, -o", "+ es", "watch → watches, go → goes"],
            ["consonante + y", "y → ies", "study → studies"],
            ["vocal + y", "+ s", "play → plays"],
            ["have", "irregular", "have → has"]
          ] },
        { t: "examples", title: "Adverbios de frecuencia",
          items: [
            { en: "I always drink coffee in the morning.", es: "always va antes del verbo principal." },
            { en: "She is never late.", es: "Con to be, el adverbio va DESPUÉS del verbo." },
            { en: "We usually work from home on Fridays.", es: "usually, often, sometimes, rarely, never." },
            { en: "He goes to the gym twice a week.", es: "Expresiones de frecuencia largas van al final." }
          ] },
        { t: "reading", title: "Reading: A Typical Day",
          paras: [
            "Carlos is a university student. He wakes up at 7 o'clock every morning. He does not wake up late because he has class at 8. He takes a shower and eats breakfast. He usually eats arepas and eggs.",
            "After breakfast, he walks to university. His first class starts at 8 AM. He studies engineering. His classes finish at 2 PM. He eats lunch at the university cafeteria.",
            "In the evening, Carlos does his homework and reads his textbooks. He sometimes plays video games. He goes to bed at 11 PM. On weekends, he doesn't study — he hangs out with his friends."
          ],
          vocab: [["wakes up", "se despierta"], ["takes a shower", "se ducha"], ["cafeteria", "comedor"], ["textbooks", "libros de texto"], ["hangs out", "queda / pasa el rato"]] },
        { t: "blank", title: "Conjuga el verbo", help: "Añade -s, -es o -ies solo con he, she, it.",
          items: [
            { pre: "She (work)", post: "in a bank.", a: "works", why: "she → works." },
            { pre: "They (live)", post: "in Bogotá.", a: "live", why: "they → sin -s." },
            { pre: "He (study)", post: "medicine.", a: "studies", why: "consonante + y → ies." },
            { pre: "My cat (sleep)", post: "all day.", a: "sleeps", why: "my cat = it → sleeps." },
            { pre: "I (go)", post: "to school by bus.", a: "go", why: "I → forma base." },
            { pre: "The bus (go)", post: "at 8:15.", a: "goes", why: "Verbo en -o → goes." },
            { pre: "She (have)", post: "two children.", a: "has", why: "have es irregular: has." },
            { pre: "We (watch)", post: "films on Sunday.", a: "watch", why: "we → forma base." }
          ] },
        { t: "mc", title: "Presente simple en contexto", help: "Pregúntate: ¿es rutina o está pasando ahora?",
          qs: [
            { q: "Which sentence describes a routine?", opts: ["I am eating now.", "I eat at eight every day.", "I ate at eight."], a: 1, why: "every day marca rutina → present simple." },
            { q: "«My sister ___ tennis on Saturdays.»", opts: ["play", "plays", "is playing"], a: 1, why: "Tercera persona + rutina → plays." },
            { q: "Where does ALWAYS go? «She ___ tired.»", opts: ["always is", "is always", "is tired always"], a: 1, why: "Con to be, el adverbio va después: She is always tired." },
            { q: "«Water ___ at 100 °C.»", opts: ["boil", "boils", "is boiling"], a: 1, why: "Hecho científico → present simple, water = it." },
            { q: "Correct negative:", opts: ["She not work here.", "She doesn't works here.", "She doesn't work here."], a: 2, why: "doesn't + forma base." },
            { q: "«How often ___ you go to the cinema?»", opts: ["do", "does", "are"], a: 0, why: "you → do." }
          ] },
        { t: "order", title: "Construye la frase", prompt: "Ordena: «Ella nunca bebe café por la mañana».",
          words: ["She", "never", "drinks", "coffee", "in", "the", "morning"], answer: "She never drinks coffee in the morning",
          why: "Sujeto + adverbio de frecuencia + verbo + complemento + tiempo." },
        { t: "quiz", title: "Unit 1 review quiz", pass: 8,
          qs: [
            { d: "Aa", q: "How many vowels are there in English?", opts: ["3", "5", "7"], a: 1, why: "A E I O U." },
            { d: "40", q: "In words?", opts: ["fourty", "forty", "fortty"], a: 1, why: "forty." },
            { d: "8 PM", q: "You arrive at a party. You say:", opts: ["Good night.", "Good evening.", "Good morning."], a: 1, why: "Good evening al llegar." },
            { d: "be", q: "«They ___ from Chile.»", opts: ["is", "are", "am"], a: 1, why: "they → are." },
            { d: "?", q: "«___ she a doctor?»", opts: ["Do", "Is", "Does"], a: 1, why: "Con to be: Is she a doctor?" },
            { d: "aux", q: "«___ he like football?»", opts: ["Do", "Does", "Is"], a: 1, why: "he + verbo like → Does." },
            { d: "-s", q: "«He ___ TV every night.»", opts: ["watch", "watchs", "watches"], a: 2, why: "-ch → +es." },
            { d: "adv", q: "«I ___ go to bed late.»", opts: ["never", "no", "not"], a: 0, why: "never es el adverbio de frecuencia negativo." },
            { d: "neg", q: "«We ___ live here.»", opts: ["doesn't", "don't", "aren't"], a: 1, why: "we → don't." },
            { d: "age", q: "«How old ___ you?»", opts: ["do", "are", "have"], a: 1, why: "La edad se pregunta con to be." }
          ] }
      ]
    }
  ]
},

{
  n: "02", id: "u2", title: "Everyday Life", es: "Vida diaria",
  blurb: "Possessive adjectives, Jobs, Prepositions of time and place.",
  tags: ["Possessives", "Jobs", "Prepositions"],
  color: "#1B4EA8",
  topics: [
    {
      id: "possessives", label: "Possessives", icon: "my", title: "Possessive Adjectives",
      kicker: "my · your · his · her · its · our · their",
      blocks: [
        { t: "rule", title: "El posesivo concuerda con el DUEÑO", burst: "KEY",
          en: "In English the possessive agrees with the owner, not with the object. It never takes a plural -s.",
          es: "En inglés el posesivo concuerda con el dueño, no con el objeto. Y nunca lleva -s de plural.",
          formula: "his car · his cars   ·   her car · her cars",
          steps: [
            "Su coche (de él) = his car. Su coche (de ella) = her car.",
            "Sus coches (de él) = his cars — el posesivo no cambia.",
            "«Their friends», no «Theirs friends»."
          ],
          tip: "its = posesivo (its tail). it's = it is. Es el error de ortografía más común del inglés." },
        { t: "table", title: "Tabla de posesivos",
          head: ["Pronombre", "Adjetivo posesivo", "Ejemplo", "Traducción"],
          rows: [
            ["I", "my", "my book", "mi libro"],
            ["You", "your", "your house", "tu / su casa"],
            ["He", "his", "his job", "su trabajo (de él)"],
            ["She", "her", "her phone", "su teléfono (de ella)"],
            ["It", "its", "its colour", "su color"],
            ["We", "our", "our class", "nuestra clase"],
            ["They", "their", "their parents", "sus padres"]
          ] },
        { t: "examples", title: "En contexto",
          items: [
            { en: "This is my brother. His name is Dan.", es: "Dueño masculino → his." },
            { en: "Sara loves her job.", es: "Dueño femenino → her." },
            { en: "The dog is wagging its tail.", es: "Objeto/animal → its, sin apóstrofo." },
            { en: "Our teacher knows their names.", es: "our (nosotros), their (ellos)." }
          ] },
        { t: "reading", title: "Reading: Family Photo",
          paras: [
            "Look at this family photo. Next to me is my mother. Her name is Rosa. On the left is my father. His name is Alberto. Those are my parents.",
            "The little girl in front is my sister, Sofia. Her dress is pink. The boy next to her is my brother, Marco. His shirt is blue. We love our family very much.",
            "The dog in the photo is named Lucky. Its fur is brown and white. Lucky is our pet. Its favourite toy is a red ball. In the background, you can see our house. It is a big yellow house with a garden."
          ],
          vocab: [["next to", "al lado de"], ["in front", "delante"], ["fur", "pelaje"], ["pet", "mascota"], ["background", "fondo"]] },

        { t: "blank", title: "Completa con el posesivo", help: "Pregúntate siempre: ¿de quién es? Ese dueño decide la palabra.",
          items: [
            { pre: "This is Tom.", post: "sister is a nurse.", a: "His", why: "Tom es el dueño → His." },
            { pre: "I love", post: "new bike.", a: "my", why: "El dueño soy yo → my." },
            { pre: "Anna and Luis are here with", post: "children.", a: "their", why: "Dos dueños → their." },
            { pre: "The cat licked", post: "paws.", a: "its", why: "Animal → its, sin apóstrofo." },
            { pre: "We are proud of", post: "team.", a: "our", why: "Nosotros → our." },
            { pre: "Maria forgot", post: "keys.", a: "her", why: "Maria → her, aunque keys sea plural." }
          ] },
        { t: "mc", title: "his, her, its o their", help: "El posesivo depende del dueño, no del objeto poseído.",
          qs: [
            { q: "«Sara is with ___ husband.»", opts: ["his", "her", "its"], a: 1, why: "La dueña es Sara → her." },
            { q: "«Peter washes ___ car on Sundays.»", opts: ["his", "her", "their"], a: 0, why: "Peter → his." },
            { q: "«The company changed ___ name.»", opts: ["it's", "its", "his"], a: 1, why: "its sin apóstrofo. it's = it is." },
            { q: "«My parents sold ___ house.»", opts: ["theirs", "their", "there"], a: 1, why: "Adjetivo posesivo: their + sustantivo." },
            { q: "Which is correct?", opts: ["Their are late.", "They're late.", "There late."], a: 1, why: "they're = they are." },
            { q: "«Ana and I finished ___ project.»", opts: ["our", "their", "his"], a: 0, why: "Ana and I = we → our." }
          ] },
        { t: "match", title: "Empareja dueño y posesivo", help: "Clic en el sujeto y luego en la forma correcta.",
          pairs: [["I", "my"], ["he", "his"], ["she", "her"], ["it", "its"], ["we", "our"], ["they", "their"]] }
      ]
    },

    {
      id: "jobs", label: "Jobs", icon: "job", title: "Jobs & Professions",
      kicker: "vocabulario · preguntar por el trabajo",
      blocks: [
        { t: "rule", title: "Cómo se habla del trabajo", burst: "WORK",
          en: "Professions in the singular always take a or an: I am a nurse, she is an engineer.",
          es: "Las profesiones en singular llevan siempre a / an: I am a nurse, she is an engineer. En español no se usa artículo, y de ahí el error.",
          formula: "What do you do?  →  I'm a / an + job",
          steps: [
            "an va antes de sonido vocálico: an artist, an engineer, an hour.",
            "«I am teacher» es incorrecto; «I am a teacher» es correcto.",
            "Para el lugar: I work in a hospital / for a bank / as a designer."
          ] },
        { t: "cards", variant: "plain", title: "Vocabulario",
          items: [
            { k: "👩‍⚕️", w: "a doctor", es: "médico/a" }, { k: "👩‍🏫", w: "a teacher", es: "profesor/a" },
            { k: "👷", w: "an engineer", es: "ingeniero/a" }, { k: "👨‍🍳", w: "a chef", es: "cocinero/a" },
            { k: "👮", w: "a police officer", es: "policía" }, { k: "🧑‍🌾", w: "a farmer", es: "agricultor/a" },
            { k: "💻", w: "a developer", es: "programador/a" }, { k: "🎨", w: "an artist", es: "artista" },
            { k: "🚚", w: "a driver", es: "conductor/a" }, { k: "💼", w: "an accountant", es: "contable" },
            { k: "✂️", w: "a hairdresser", es: "peluquero/a" }, { k: "🧑‍🔧", w: "a mechanic", es: "mecánico/a" },
            { k: "✈️", w: "a pilot", es: "piloto" }, { k: "⚖️", w: "a lawyer", es: "abogado/a" },
            { k: "🏗️", w: "an architect", es: "arquitecto/a" }, { k: "📰", w: "a journalist", es: "periodista" },
            { k: "🎭", w: "an actor / an actress", es: "actor / actriz" }, { k: "💊", w: "a pharmacist", es: "farmacéutico/a" },
            { k: "🏥", w: "a nurse", es: "enfermero/a" }, { k: "🎵", w: "a musician", es: "músico/a" }
          ] },
        { t: "table", title: "Preguntas útiles",
          head: ["Pregunta", "Sentido", "Respuesta"],
          rows: [
            ["What do you do?", "¿A qué te dedicas?", "I'm a nurse."],
            ["What's your job?", "¿Cuál es tu trabajo?", "I work in marketing."],
            ["Where do you work?", "¿Dónde trabajas?", "In a hospital."],
            ["Who do you work for?", "¿Para quién trabajas?", "For a small studio."],
            ["Do you like your job?", "¿Te gusta tu trabajo?", "Yes, I love it."]
          ],
          note: "«What are you doing?» pregunta qué haces AHORA, no tu profesión. No las confundas." },
        { t: "dialogue", title: "Small talk at a conference",
          lines: [
            { who: "Leo", text: "Hi, I'm Leo. What do you do?", es: "Hola, soy Leo. ¿A qué te dedicas?" },
            { who: "Ines", text: "I'm an architect. I work for a studio in Valencia.", es: "Soy arquitecta. Trabajo para un estudio en Valencia." },
            { who: "Leo", text: "Nice! Do you like it?", es: "¡Qué bien! ¿Te gusta?" },
            { who: "Ines", text: "I do, but the hours are long. And you?", es: "Sí, pero los horarios son largos. ¿Y tú?" },
            { who: "Leo", text: "I'm a teacher. I teach maths at a secondary school.", es: "Soy profesor. Enseño matemáticas en un instituto." }
          ] },
        { t: "dialogue", title: "Dialogue: What Do You Do?",
          lines: [
            { who: "Sofia", text: "Hi! I'm Sofia. What do you do?", es: "¡Hola! Soy Sofia. ¿A qué te dedicas?" },
            { who: "Carlos", text: "Nice to meet you, Sofia! I'm a software engineer. I work at a tech company. And you?", es: "¡Encantado, Sofia! Soy ingeniero de software. Trabajo en una empresa de tecnología. ¿Y tú?" },
            { who: "Sofia", text: "I'm a nurse. I work at the Central Hospital.", es: "Soy enfermera. Trabajo en el Hospital Central." },
            { who: "Carlos", text: "That's amazing! Your job is so important. Do you enjoy it?", es: "¡Qué bien! Tu trabajo es importantísimo. ¿Te gusta?" },
            { who: "Sofia", text: "Yes, I love it! It's challenging but very rewarding. What about you?", es: "¡Sí, me encanta! Es exigente pero muy gratificante. ¿Y a ti?" }
          ] },

        { t: "blank", title: "a o an", help: "an solo delante de sonido vocálico, no de letra vocal. Escucha la palabra.",
          items: [
            { pre: "She is", post: "engineer.", a: "an", why: "engineer empieza por sonido vocálico /e/." },
            { pre: "He is", post: "teacher.", a: "a", why: "teacher empieza por consonante." },
            { pre: "I want to be", post: "artist.", a: "an", why: "artist → sonido /ɑː/." },
            { pre: "My mother is", post: "nurse.", a: "a", why: "nurse → /n/." },
            { pre: "Tom is", post: "university lecturer.", a: "a", why: "university suena /juː/, consonántico: a university." },
            { pre: "She is", post: "honest lawyer.", a: "an", why: "En honest la H es muda: suena /ˈɒnɪst/." }
          ] },
        { t: "mc", title: "Trabajo y contexto", help: "Fíjate en el artículo, la preposición y en si preguntan profesión o acción presente.",
          qs: [
            { q: "Which sentence is correct?", opts: ["I am teacher.", "I am a teacher.", "I am the teacher of English."], a: 1, why: "Profesión en singular → a/an." },
            { q: "«I work ___ a hospital.»", opts: ["in", "on", "at the"], a: 0, why: "work in + lugar grande / institución." },
            { q: "«What are you doing?» asks about…", opts: ["your job", "this moment", "your hobbies"], a: 1, why: "Present continuous = ahora mismo." },
            { q: "«She works ___ a designer.»", opts: ["like", "as", "of"], a: 1, why: "as + rol o función." },
            { q: "Who works with money and accounts?", opts: ["an accountant", "a mechanic", "a chef"], a: 0, why: "accountant = contable." },
            { q: "«___ do you work for?»", opts: ["What", "Who", "Where"], a: 1, why: "Who + for pregunta por la empresa o persona." }
          ] },
        { t: "match", title: "Empareja trabajo y lugar", help: "Cada profesión con su lugar de trabajo habitual.",
          pairs: [["a nurse", "a hospital"], ["a chef", "a kitchen"], ["a teacher", "a school"], ["a farmer", "a field"], ["a mechanic", "a garage"]] }
      ]
    },

    {
      id: "prepositions", label: "Prepositions", icon: "in", title: "Prepositions of Time & Place",
      kicker: "in · on · at — y las de lugar",
      blocks: [
        { t: "rule", title: "in, on, at: de grande a pequeño", burst: "MAP",
          en: "For both time and place, IN is the biggest container, ON is a surface or a date, AT is a precise point.",
          es: "Tanto en tiempo como en lugar: IN es lo más grande, ON es una superficie o una fecha, AT es un punto exacto.",
          formula: "in 2026 → on Monday → at 8:00",
          steps: [
            "Tiempo: in (meses, años, estaciones), on (días y fechas), at (horas y momentos).",
            "Lugar: in (país, ciudad, habitación), on (superficie, calle, planta), at (dirección exacta, evento).",
            "Excepciones fijas: at night, at the weekend (UK), on the weekend (US)."
          ] },
        { t: "table", title: "Tiempo",
          head: ["Preposición", "Se usa con", "Ejemplos"],
          rows: [
            ["in", "meses, años, estaciones, partes del día", "in July · in 2026 · in winter · in the morning"],
            ["on", "días y fechas", "on Monday · on 5 May · on my birthday"],
            ["at", "horas y momentos puntuales", "at 7:30 · at noon · at night · at Christmas"]
          ] },
        { t: "table", title: "Lugar",
          head: ["Preposición", "Se usa con", "Ejemplos"],
          rows: [
            ["in", "espacios cerrados, ciudades, países", "in the kitchen · in Madrid · in Peru"],
            ["on", "superficies, calles, transporte público", "on the table · on Oxford Street · on the bus"],
            ["at", "puntos concretos, eventos", "at the door · at home · at the party"]
          ],
          note: "Otras muy usadas: under (debajo), behind (detrás), in front of (delante), between (entre), next to (al lado), above (encima sin tocar)." },
        { t: "examples", title: "Comparaciones que aclaran",
          items: [
            { en: "in the car  /  on the bus", es: "Coche pequeño: in. Transporte en el que caminas: on." },
            { en: "in bed  /  on the bed", es: "in bed = acostado. on the bed = sentado encima." },
            { en: "at school  /  in the school", es: "at school = estudiando. in the school = dentro del edificio." },
            { en: "in the morning  /  at night", es: "Excepción memorizable: at night." }
          ] },
        { t: "blank", title: "in / on / at (tiempo)", help: "in = grande, on = día o fecha, at = hora exacta.",
          items: [
            { pre: "The class starts", post: "9:00.", a: "at", why: "Hora exacta → at." },
            { pre: "My birthday is", post: "July.", a: "in", why: "Mes → in." },
            { pre: "We meet", post: "Friday.", a: "on", why: "Día de la semana → on." },
            { pre: "She was born", post: "1998.", a: "in", why: "Año → in." },
            { pre: "I don't work", post: "night.", a: "at", why: "Excepción fija: at night." },
            { pre: "The exam is", post: "12 March.", a: "on", why: "Fecha concreta → on." }
          ] },
        { t: "blank", title: "in / on / at (lugar)", help: "in = dentro, on = encima o calle, at = punto exacto.",
          items: [
            { pre: "The keys are", post: "the table.", a: "on", why: "Superficie → on." },
            { pre: "She lives", post: "Barcelona.", a: "in", why: "Ciudad → in." },
            { pre: "I'm waiting", post: "the bus stop.", a: "at", why: "Punto concreto → at." },
            { pre: "There is milk", post: "the fridge.", a: "in", why: "Espacio cerrado → in." },
            { pre: "He is", post: "home today.", a: "at", why: "Expresión fija: at home, sin artículo." },
            { pre: "My office is", post: "the third floor.", a: "on", why: "Plantas → on." }
          ] },
        { t: "mc", title: "Preposiciones de lugar", help: "Visualiza la escena: ¿dentro, encima, debajo, al lado?",
          qs: [
            { q: "The cat is ___ the box (dentro).", opts: ["in", "on", "under"], a: 0, why: "Dentro → in." },
            { q: "The lamp is ___ the table (encima, tocando).", opts: ["in", "on", "above"], a: 1, why: "Contacto con la superficie → on." },
            { q: "The ball is ___ the chair (debajo).", opts: ["under", "over", "on"], a: 0, why: "Debajo → under." },
            { q: "The bank is ___ the shop and the café.", opts: ["among", "between", "next"], a: 1, why: "Entre dos cosas → between." },
            { q: "She is sitting ___ me (a mi lado).", opts: ["next to", "in front", "behind"], a: 0, why: "next to = al lado de." },
            { q: "Correct: «I arrive ___ the airport ___ 6 PM.»", opts: ["in / on", "at / at", "on / in"], a: 1, why: "at + lugar puntual, at + hora." }
          ] },
        { t: "order", title: "Construye la frase", prompt: "Ordena: «Hay un libro debajo de la mesa».",
          words: ["There", "is", "a", "book", "under", "the", "table"], answer: "There is a book under the table",
          why: "There is + sustantivo singular + preposición de lugar." },
        { t: "examples", title: "Where is the book?",
          items: [
            { en: "The book is ON the table.", es: "Encima, tocando la superficie." },
            { en: "The book is UNDER the table.", es: "Debajo de la mesa." },
            { en: "The book is BESIDE the table.", es: "Al lado de la mesa (= next to)." },
            { en: "The book is IN the drawer.", es: "Dentro del cajón." },
            { en: "The book is BEHIND the door.", es: "Detrás de la puerta." }
          ] },

        { t: "table", title: "Otras preposiciones: around, until, from",
          head: ["Preposición", "Significado", "Ejemplo de tiempo", "Ejemplo de lugar"],
          rows: [
            ["around", "hacia / alrededor de", "She arrives around 1 AM.", "a walk around the park"],
            ["until", "hasta (un momento)", "The party lasts until midnight.", "—"],
            ["from … to", "de … a", "from 8 AM to 6 PM", "from Madrid to Rome"],
            ["near", "cerca de", "—", "a town near the city"],
            ["beside", "al lado de", "—", "beside the table"]
          ],
          note: "until marca el final de un periodo; by marca un plazo límite: «Finish it by Friday» (antes del viernes)." },

        { t: "reading", title: "Reading: A Busy Week",
          paras: [
            "Sandra has a very busy week. On Monday, she has an important meeting at 9 AM. She works from 8 AM until 6 PM. In the evening, she goes to the gym.",
            "On Wednesday, she visits her grandmother who lives in a small town near the city. They go for a walk around the park at noon. They talk and drink tea until the sun goes down.",
            "On Friday night, Sandra goes to a party at her friend's house. The party starts at 8 PM and lasts until midnight. She arrives home around 1 AM. In the morning, she sleeps late!"
          ],
          vocab: [["busy", "ocupado/a"], ["meeting", "reunión"], ["near", "cerca de"], ["around", "hacia / alrededor de"], ["until", "hasta"]] },

        { t: "quiz", title: "Unit 2 review quiz", pass: 7,
          qs: [
            { d: "my", q: "«Sara loves ___ job.»", opts: ["his", "her", "its"], a: 1, why: "Sara → her." },
            { d: "its", q: "Which means «it is»?", opts: ["its", "it's", "its'"], a: 1, why: "it's = it is." },
            { d: "job", q: "«I'm ___ engineer.»", opts: ["a", "an", "—"], a: 1, why: "Sonido vocálico → an." },
            { d: "work", q: "«She works ___ a hospital.»", opts: ["in", "on", "at the"], a: 0, why: "work in + institución." },
            { d: "time", q: "«The meeting is ___ Monday.»", opts: ["in", "on", "at"], a: 1, why: "Día → on." },
            { d: "time", q: "«I get up ___ 7:00.»", opts: ["in", "on", "at"], a: 2, why: "Hora → at." },
            { d: "place", q: "«The milk is ___ the fridge.»", opts: ["in", "on", "at"], a: 0, why: "Dentro → in." },
            { d: "place", q: "«My flat is ___ the fifth floor.»", opts: ["in", "on", "at"], a: 1, why: "Plantas → on." },
            { d: "job", q: "«What do you do?» asks about…", opts: ["now", "your profession", "your plans"], a: 1, why: "Es la pregunta estándar por la profesión." },
            { d: "poss", q: "«My parents sold ___ house.»", opts: ["theirs", "their", "there"], a: 1, why: "their + sustantivo." }
          ] }
      ]
    }
  ]
}
]);
}
