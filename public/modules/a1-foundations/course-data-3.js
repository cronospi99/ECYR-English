/* Unidades 6-8 — datos del curso */
if (!window.__COURSE_LOADED_3) {
window.__COURSE_LOADED_3 = 1;
window.COURSE = (window.COURSE || []).concat([
{
  n: "06", id: "u6", title: "Pronouns & Connectors", es: "Pronombres y conectores",
  blurb: "Object pronouns, possessive 's, have got, there is/are, conjunctions.",
  tags: ["Pronouns", "Have got", "There is"],
  color: "#B0850A",
  topics: [
    {
      id: "object-pronouns", label: "Object Pronouns", icon: "me", title: "Object Pronouns",
      kicker: "me · you · him · her · it · us · them",
      blocks: [
        { t: "rule", title: "Sujeto delante, objeto detrás", burst: "SWAP",
          en: "Subject pronouns do the action; object pronouns receive it and go after the verb or a preposition.",
          es: "El pronombre sujeto hace la acción; el de objeto la recibe y va después del verbo o de una preposición.",
          formula: "I see her.   ·   She sees me.",
          steps: [
            "Después del verbo: I know him.",
            "Después de preposición: with us, for them, to me.",
            "En inglés el objeto no se puede omitir: «I like» está incompleto; «I like it» es correcto."
          ] },
        { t: "table", title: "Tabla completa",
          head: ["Sujeto", "Objeto", "Ejemplo"],
          rows: [
            ["I", "me", "Call me tonight."],
            ["you", "you", "I saw you."],
            ["he", "him", "Give it to him."],
            ["she", "her", "I met her yesterday."],
            ["it", "it", "I bought it."],
            ["we", "us", "Come with us."],
            ["they", "them", "I told them."]
          ] },
        { t: "blank", title: "Completa con el pronombre objeto", help: "Sustituye el nombre que ya se ha mencionado.",
          items: [
            { pre: "I saw Peter. I saw", post: ".", a: "him", why: "Peter → him." },
            { pre: "This is for Ana. It's for", post: ".", a: "her", why: "Ana → her." },
            { pre: "Call my parents. Call", post: ".", a: "them", why: "Plural → them." },
            { pre: "Come with Ana and me. Come with", post: ".", a: "us", why: "Ana and me → us." },
            { pre: "I like this song. I like", post: ".", a: "it", why: "Cosa singular → it." },
            { pre: "Can you help me and my brother? Can you help", post: "?", a: "us", why: "→ us." }
          ] },
        { t: "mc", title: "Sujeto u objeto", help: "¿Quién hace la acción y quién la recibe?",
          qs: [
            { q: "«___ loves me.»", opts: ["She", "Her"], a: 0, why: "Es el sujeto → she." },
            { q: "«I love ___.»", opts: ["she", "her"], a: 1, why: "Recibe la acción → her." },
            { q: "«Between you and ___.»", opts: ["I", "me"], a: 1, why: "Tras preposición → me." },
            { q: "«They invited ___ to the party.»", opts: ["we", "us"], a: 1, why: "Objeto → us." },
            { q: "Which is correct?", opts: ["I like.", "I like it."], a: 1, why: "El objeto es obligatorio." },
            { q: "«Give the book to ___.»", opts: ["he", "him"], a: 1, why: "Tras to → him." }
          ] }
      ]
    },
    {
      id: "possessive-s", label: "Possessive 's", icon: "'s", title: "Possessive 's",
      kicker: "el genitivo sajón",
      blocks: [
        { t: "rule", title: "El dueño va primero", burst: "OWN",
          en: "English marks the owner with 's and puts it before the thing owned. The order is the opposite of Spanish.",
          es: "El inglés marca al dueño con 's y lo pone delante de lo poseído. El orden es el contrario del español.",
          formula: "owner + 's + thing",
          steps: [
            "El coche de María → Maria's car.",
            "Plural que ya acaba en -s → solo apóstrofo: my parents' house.",
            "Plural irregular → 's normal: the children's toys.",
            "Para cosas se prefiere of: the door of the car / the car door."
          ],
          tip: "«The house of Maria» es gramatical pero suena raro. Con personas usa siempre 's." },
        { t: "table", title: "Casos",
          head: ["Caso", "Forma", "Ejemplo"],
          rows: [
            ["Singular", "+ 's", "Tom's bike"],
            ["Nombre que acaba en s", "+ 's (o solo ')", "James's car / James' car"],
            ["Plural regular", "+ '", "the students' books"],
            ["Plural irregular", "+ 's", "the men's room"],
            ["Dos dueños juntos", "solo en el último", "Ana and Luis's flat"],
            ["Cosas", "of / compuesto", "the leg of the table / the table leg"]
          ] },
        { t: "blank", title: "Escribe la forma posesiva", help: "Coloca el apóstrofo donde toque.",
          items: [
            { pre: "the car of Maria →", post: "car", a: "Maria's", why: "Dueño + 's." },
            { pre: "the toys of the children →", post: "toys", a: "the children's", alt: ["children's"], why: "Plural irregular → 's." },
            { pre: "the house of my parents →", post: "house", a: "my parents'", alt: ["parents'"], why: "Plural en -s → solo apóstrofo." },
            { pre: "the office of the boss →", post: "office", a: "the boss's", alt: ["boss's"], why: "Singular en -s → 's." }
          ] },
        { t: "mc", title: "Posesivo o plural", help: "El apóstrofo marca posesión, nunca plural.",
          qs: [
            { q: "Which is correct?", opts: ["My parent's house (dos padres)", "My parents' house", "My parents house"], a: 1, why: "Dos padres → parents'." },
            { q: "«___ birthday is in May.» (de Tom)", opts: ["Tom's", "Toms", "Toms'"], a: 0, why: "Singular → 's." },
            { q: "«the ___ toys» (de los niños)", opts: ["childrens'", "children's", "childs"], a: 1, why: "children es plural irregular." },
            { q: "Which sounds natural?", opts: ["the leg of the table", "the table's leg", "the table leg"], a: 2, why: "Con objetos, el compuesto es lo más natural." },
            { q: "«It's» means…", opts: ["of it", "it is"], a: 1, why: "it's = it is. El posesivo es its." },
            { q: "«I'm at ___.» (la peluquería)", opts: ["the hairdresser's", "the hairdressers", "the hairdresser"], a: 0, why: "Negocios con 's: the baker's, the dentist's." }
          ] }
      ]
    },
    {
      id: "have-got", label: "Have Got", icon: "got", title: "Have Got",
      kicker: "posesión, familia, descripción",
      blocks: [
        { t: "rule", title: "Have got y have significan lo mismo", burst: "HAVE",
          en: "Have got is common in British English for possession. American English prefers have with do/does.",
          es: "Have got es típico del inglés británico para posesión. El americano prefiere have con do/does.",
          formula: "have / has got + noun",
          steps: [
            "I've got a car. = I have a car.",
            "Negativo: I haven't got a car. / I don't have a car.",
            "Pregunta: Have you got a car? / Do you have a car?"
          ],
          tip: "No mezcles los dos sistemas: «Do you have got…?» es incorrecto." },
        { t: "table", title: "Conjugación",
          head: ["Sujeto", "Afirmativo", "Negativo", "Pregunta"],
          rows: [
            ["I / you / we / they", "have got ('ve got)", "haven't got", "Have you got…?"],
            ["he / she / it", "has got ('s got)", "hasn't got", "Has he got…?"]
          ] },
        { t: "examples", title: "Usos típicos",
          items: [
            { en: "I've got two brothers.", es: "Familia." },
            { en: "She's got blue eyes and long hair.", es: "Descripción física." },
            { en: "Have you got a minute?", es: "Disponibilidad." },
            { en: "I've got a headache.", es: "Dolencias: a cold, a headache, a temperature." }
          ] },
        { t: "blank", title: "have got / has got", help: "he/she/it → has got; el resto → have got.",
          items: [
            { pre: "She", post: "a new phone.", a: "has got", alt: ["'s got"], why: "she → has got." },
            { pre: "We", post: "two cats.", a: "have got", alt: ["'ve got"], why: "we → have got." },
            { pre: "", post: "you got a pen?", a: "Have", why: "Pregunta con you → Have." },
            { pre: "He", post: "got any money.", a: "hasn't", why: "Negativo tercera persona." },
            { pre: "They", post: "got a big garden.", a: "have", why: "they → have got." }
          ] },
        { t: "mc", title: "Have got", help: "No mezcles do/does con got.",
          qs: [
            { q: "Which is correct?", opts: ["Do you have got a car?", "Have you got a car?", "Have you a car?"], a: 1, why: "Have + sujeto + got." },
            { q: "«She ___ got two sisters.»", opts: ["have", "has"], a: 1, why: "she → has." },
            { q: "Negative of «I've got time»", opts: ["I don't have got time.", "I haven't got time.", "I not have got time."], a: 1, why: "haven't got." },
            { q: "Short answer to «Has he got a bike?»", opts: ["Yes, he has.", "Yes, he does.", "Yes, he got."], a: 0, why: "Se repite el auxiliar has." },
            { q: "American English version of «Have you got a pen?»", opts: ["Do you have a pen?", "Have you a pen?"], a: 0, why: "US: do + have." },
            { q: "«I ___ a headache.»", opts: ["have got", "am having"], a: 0, why: "Dolencias con have got." }
          ] }
      ]
    },
    {
      id: "there-is-are", label: "There is/are", icon: "there", title: "There Is / There Are",
      kicker: "existencia: hay",
      blocks: [
        { t: "rule", title: "Concuerda con lo que viene después", burst: "EXIST",
          en: "There is goes with singular and uncountable nouns; there are with plurals. The verb agrees with the noun that follows.",
          es: "There is va con singular e incontables; there are con plurales. El verbo concuerda con el sustantivo que le sigue.",
          formula: "There is + singular   ·   There are + plural",
          steps: [
            "There is a book on the table.",
            "There are three books on the table.",
            "There is some milk. — incontable → is.",
            "En listas mixtas manda el primer elemento: There is a sofa and two chairs."
          ],
          tip: "No confundas there (existencia) con they're (they are) ni con their (posesivo). Se pronuncian casi igual." },
        { t: "table", title: "Formas",
          head: ["", "Singular", "Plural"],
          rows: [
            ["Afirmativo", "There is / There's", "There are"],
            ["Negativo", "There isn't", "There aren't"],
            ["Pregunta", "Is there…?", "Are there…?"],
            ["Con cantidad", "There's some / any", "There are some / any / many"]
          ] },
        { t: "blank", title: "there is / there are", help: "Mira si el sustantivo siguiente es singular, plural o incontable.",
          items: [
            { pre: "", post: "a cat in the garden.", a: "There is", alt: ["There's"], why: "Singular → there is." },
            { pre: "", post: "two windows in this room.", a: "There are", why: "Plural → there are." },
            { pre: "", post: "any milk in the fridge?", a: "Is there", why: "Incontable en pregunta → Is there." },
            { pre: "", post: "aren't any chairs here.", a: "There", why: "There aren't any + plural." },
            { pre: "", post: "a lot of traffic today.", a: "There is", alt: ["There's"], why: "traffic es incontable." }
          ] },
        { t: "mc", title: "There is / there are", help: "El verbo concuerda con lo que sigue, no con «there».",
          qs: [
            { q: "«___ many people here.»", opts: ["There is", "There are"], a: 1, why: "people es plural." },
            { q: "«___ some sugar in the bowl.»", opts: ["There is", "There are"], a: 0, why: "sugar es incontable." },
            { q: "«___ any messages for me?»", opts: ["Is there", "Are there"], a: 1, why: "messages es plural." },
            { q: "Which is correct?", opts: ["There have three books.", "There are three books.", "It has three books."], a: 1, why: "La existencia se expresa con there are." },
            { q: "«___ a sofa and two chairs.»", opts: ["There is", "There are"], a: 0, why: "Manda el primer elemento, singular." },
            { q: "Which means «they are»?", opts: ["there", "their", "they're"], a: 2, why: "they're = they are." }
          ] }
      ]
    },
    {
      id: "conjunctions", label: "Conjunctions", icon: "&", title: "Conjunctions",
      kicker: "and · but · or · because · so",
      blocks: [
        { t: "rule", title: "Cada conector marca una relación", burst: "LINK",
          en: "Conjunctions join ideas and tell the reader how they relate: addition, contrast, choice, cause or result.",
          es: "Los conectores unen ideas y explican la relación: suma, contraste, elección, causa o consecuencia.",
          formula: "cause → because   ·   result → so",
          steps: [
            "and: suma. I like tea and coffee.",
            "but: contraste. It's cheap but good.",
            "or: alternativa. Tea or coffee?",
            "because: causa. I'm tired because I worked late.",
            "so: consecuencia. I was tired, so I went to bed."
          ],
          tip: "because responde a «¿por qué?»; so introduce el resultado. La misma idea, en orden inverso." },
        { t: "table", title: "Comparación",
          head: ["Conector", "Relación", "Ejemplo"],
          rows: [
            ["and", "adición", "She sings and plays guitar."],
            ["but", "contraste", "I'm tired but happy."],
            ["or", "opción", "Do you want tea or coffee?"],
            ["because", "causa", "We stayed home because it rained."],
            ["so", "resultado", "It rained, so we stayed home."],
            ["although", "contraste fuerte", "Although it rained, we went out."]
          ] },
        { t: "blank", title: "Elige el conector", help: "Pregúntate qué relación hay entre las dos ideas.",
          items: [
            { pre: "I was hungry,", post: "I made a sandwich.", a: "so", why: "Resultado → so." },
            { pre: "I stayed home", post: "it was raining.", a: "because", why: "Causa → because." },
            { pre: "She is small", post: "very strong.", a: "but", why: "Contraste → but." },
            { pre: "Do you want tea", post: "coffee?", a: "or", why: "Alternativa → or." },
            { pre: "He speaks French", post: "German.", a: "and", why: "Adición → and." }
          ] },
        { t: "mc", title: "Conectores", help: "because = causa, so = consecuencia.",
          qs: [
            { q: "«I didn't go out ___ the weather was bad.»", opts: ["so", "because"], a: 1, why: "Introduce la causa." },
            { q: "«The weather was bad, ___ I didn't go out.»", opts: ["so", "because"], a: 0, why: "Introduce el resultado." },
            { q: "«It's expensive ___ very good.»", opts: ["and", "but"], a: 1, why: "Contraste." },
            { q: "«___ it was late, we kept working.»", opts: ["Although", "Because"], a: 0, why: "Contraste al inicio de frase." },
            { q: "Which joins two options?", opts: ["or", "so", "and"], a: 0, why: "or." },
            { q: "«I like it ___ it's simple.»", opts: ["so", "because"], a: 1, why: "Explica el motivo." }
          ] }
      ]
    },
    {
      id: "word-order", label: "Word Order", icon: "→", title: "Word Order",
      kicker: "sujeto · verbo · objeto · lugar · tiempo",
      blocks: [
        { t: "rule", title: "El inglés es rígido con el orden", burst: "SVO",
          en: "The basic order is Subject – Verb – Object, then place, then time. Adverbs of frequency sit before the main verb.",
          es: "El orden básico es Sujeto – Verbo – Objeto, después lugar y después tiempo. Los adverbios de frecuencia van antes del verbo principal.",
          formula: "S + V + O + place + time",
          steps: [
            "I read a book in the park every evening.",
            "Nunca separes el verbo de su objeto: «I read every day a book» es incorrecto.",
            "El tiempo puede ir al principio para dar énfasis: Every evening, I read a book."
          ] },
        { t: "table", title: "Plantilla",
          head: ["Sujeto", "Adv. frec.", "Verbo", "Objeto", "Lugar", "Tiempo"],
          rows: [
            ["She", "usually", "drinks", "coffee", "at home", "in the morning."],
            ["We", "never", "watch", "TV", "—", "before dinner."],
            ["They", "—", "play", "football", "in the park", "on Sundays."]
          ] },
        { t: "order", title: "Ordena la frase 1", prompt: "S + V + O + lugar + tiempo",
          words: ["I", "read", "a", "book", "in", "the", "park", "every", "evening"],
          answer: "I read a book in the park every evening",
          why: "Objeto pegado al verbo, luego lugar, luego tiempo." },
        { t: "order", title: "Ordena la frase 2", prompt: "Con adverbio de frecuencia",
          words: ["She", "usually", "drinks", "coffee", "in", "the", "morning"],
          answer: "She usually drinks coffee in the morning",
          why: "El adverbio va entre sujeto y verbo." },
        { t: "mc", title: "Orden correcto", help: "Objeto justo detrás del verbo; el tiempo al final.",
          qs: [
            { q: "Which is correct?", opts: ["I read every day a book.", "I read a book every day."], a: 1, why: "El objeto no se separa del verbo." },
            { q: "Which is correct?", opts: ["She speaks well English.", "She speaks English well."], a: 1, why: "El adverbio va tras el objeto." },
            { q: "Which is correct?", opts: ["Always I am late.", "I am always late."], a: 1, why: "Con to be, el adverbio va detrás." },
            { q: "Which is correct?", opts: ["We went yesterday to the cinema.", "We went to the cinema yesterday."], a: 1, why: "Lugar antes que tiempo." },
            { q: "Question order:", opts: ["Where you are going?", "Where are you going?"], a: 1, why: "Inversión en preguntas." },
            { q: "Which is correct?", opts: ["He gave to me the book.", "He gave me the book."], a: 1, why: "give + persona + cosa, sin to." }
          ] },
        { t: "quiz", title: "Unit 6 review quiz", pass: 7,
          qs: [
            { d: "obj", q: "«I saw ___ yesterday.» (Peter)", opts: ["he", "him"], a: 1, why: "Objeto → him." },
            { d: "obj", q: "«Between you and ___.»", opts: ["I", "me"], a: 1, why: "Tras preposición." },
            { d: "'s", q: "«the house of my parents»", opts: ["my parent's house", "my parents' house"], a: 1, why: "Plural en -s → solo apóstrofo." },
            { d: "'s", q: "«the toys of the children»", opts: ["the childrens' toys", "the children's toys"], a: 1, why: "Plural irregular → 's." },
            { d: "got", q: "«She ___ got two cats.»", opts: ["have", "has"], a: 1, why: "she → has." },
            { d: "got", q: "Correct question:", opts: ["Do you have got a car?", "Have you got a car?"], a: 1, why: "No se mezclan los sistemas." },
            { d: "there", q: "«___ many people here.»", opts: ["There is", "There are"], a: 1, why: "people = plural." },
            { d: "conj", q: "«It rained, ___ we stayed in.»", opts: ["because", "so"], a: 1, why: "Resultado." },
            { d: "conj", q: "«I stayed in ___ it rained.»", opts: ["because", "so"], a: 0, why: "Causa." },
            { d: "order", q: "Correct order:", opts: ["I read every day a book.", "I read a book every day."], a: 1, why: "Objeto junto al verbo." }
          ] }
      ]
    }
  ]
},

{
  n: "07", id: "u7", title: "Past Tense", es: "Pasado",
  blurb: "Was/were, past simple regular and irregular, negatives and questions.",
  tags: ["Was/Were", "Past Simple", "Did"],
  color: "#A5121C",
  topics: [
    {
      id: "was-were", label: "Was / Were", icon: "was", title: "Was & Were",
      kicker: "el pasado de TO BE",
      blocks: [
        { t: "rule", title: "Solo dos formas", burst: "PAST",
          en: "The past of to be has just two forms: was for I/he/she/it, were for you/we/they.",
          es: "El pasado de to be tiene solo dos formas: was para I/he/she/it y were para you/we/they.",
          formula: "I/he/she/it + was   ·   you/we/they + were",
          steps: [
            "Afirmativo: I was tired. They were happy.",
            "Negativo: wasn't / weren't.",
            "Pregunta: Was he there? Were you at home?"
          ],
          tip: "En condicionales irreales se usa were con todos: «If I were you…». Es la forma culta y la que se enseña." },
        { t: "table", title: "Conjugación",
          head: ["Sujeto", "Afirmativo", "Negativo", "Pregunta"],
          rows: [
            ["I", "I was", "I wasn't", "Was I…?"],
            ["you", "you were", "you weren't", "Were you…?"],
            ["he / she / it", "was", "wasn't", "Was he…?"],
            ["we / they", "were", "weren't", "Were they…?"]
          ] },
        { t: "examples", title: "Marcadores de pasado",
          items: [
            { en: "yesterday · last week · last year", es: "last sin preposición: last Monday." },
            { en: "two days ago · a long time ago", es: "ago va detrás del periodo." },
            { en: "in 1999 · in the 90s", es: "Con años y décadas se usa in." },
            { en: "when I was a child", es: "Introduce una etapa pasada." }
          ] },
        { t: "reading", title: "Reading: A Long Time Ago",
          paras: [
            "My grandfather was a farmer. He was born in a small village near Ibagué in 1940. Life was simple but happy. His parents were very hardworking. There were no computers or mobile phones — people were much more connected to nature.",
            "My grandmother was a teacher. She was very patient and kind. Her students were always happy to see her. The school wasn't big — there were only twenty children in each class. \"Those were the best days of my life,\" she always says."
          ],
          vocab: [["farmer", "agricultor"], ["village", "aldea"], ["hardworking", "trabajador/a"], ["patient", "paciente"], ["kind", "amable"]] },

        { t: "blank", title: "was / were", help: "I, he, she, it → was. You, we, they → were.",
          items: [
            { pre: "I", post: "at home yesterday.", a: "was", why: "I → was." },
            { pre: "They", post: "very tired.", a: "were", why: "they → were." },
            { pre: "", post: "you at the party?", a: "Were", why: "you → Were." },
            { pre: "She", post: "not at school.", a: "was", why: "she → was." },
            { pre: "We", post: "in Rome last summer.", a: "were", why: "we → were." },
            { pre: "It", post: "very cold in January.", a: "was", why: "it → was." }
          ] },
        { t: "mc", title: "Pasado de to be", help: "Cuenta el sujeto y busca los marcadores temporales.",
          qs: [
            { q: "«___ they at work yesterday?»", opts: ["Was", "Were"], a: 1, why: "they → were." },
            { q: "«I ___ born in 2001.»", opts: ["was", "were"], a: 0, why: "I → was." },
            { q: "Negative of «We were late»", opts: ["We wasn't late", "We weren't late"], a: 1, why: "were → weren't." },
            { q: "«There ___ many people at the concert.»", opts: ["was", "were"], a: 1, why: "people plural → there were." },
            { q: "«If I ___ you, I'd accept.»", opts: ["was", "were"], a: 1, why: "Condicional irreal: were." },
            { q: "Short answer to «Was he there?»", opts: ["Yes, he was.", "Yes, he did."], a: 0, why: "Se repite was." }
          ] }
      ]
    },
    {
      id: "past-simple-reg", label: "Past Simple", icon: "-ed", title: "Past Simple",
      kicker: "regulares e irregulares",
      blocks: [
        { t: "rule", title: "-ed para todos los sujetos", burst: "DONE",
          en: "Regular verbs add -ed and the form is the same for every subject. Irregular verbs must be memorised.",
          es: "Los verbos regulares añaden -ed y la forma es igual para todos los sujetos. Los irregulares hay que memorizarlos.",
          formula: "verb + ed   (I worked, she worked)",
          steps: [
            "work → worked, play → played.",
            "-e final: like → liked. Consonante + y: study → studied.",
            "Vocal + consonante tónica: stop → stopped, plan → planned."
          ],
          tip: "La -ed se pronuncia de tres maneras: /t/ en worked, /d/ en played, /ɪd/ en wanted (solo tras t o d)." },
        { t: "table", title: "Ortografía de -ed",
          head: ["Terminación", "Regla", "Ejemplo"],
          rows: [
            ["normal", "+ ed", "work → worked"],
            ["-e", "+ d", "like → liked"],
            ["consonante + y", "y → ied", "study → studied"],
            ["vocal + y", "+ ed", "play → played"],
            ["1 sílaba, vocal+cons.", "doblar + ed", "stop → stopped"]
          ] },
        { t: "table", title: "Irregulares esenciales",
          head: ["Base", "Pasado", "Base", "Pasado"],
          rows: [
            ["go", "went", "have", "had"],
            ["see", "saw", "do", "did"],
            ["make", "made", "take", "took"],
            ["come", "came", "get", "got"],
            ["say", "said", "give", "gave"],
            ["eat", "ate", "drink", "drank"],
            ["buy", "bought", "think", "thought"],
            ["write", "wrote", "read", "read (se pronuncia /red/)"]
          ] },
        { t: "blank", title: "Pasado simple", help: "Decide si el verbo es regular o irregular.",
          items: [
            { pre: "Yesterday I (work)", post: "late.", a: "worked", why: "Regular → worked." },
            { pre: "She (go)", post: "to Paris last year.", a: "went", why: "Irregular: go → went." },
            { pre: "We (study)", post: "all night.", a: "studied", why: "consonante + y → ied." },
            { pre: "He (stop)", post: "the car.", a: "stopped", why: "Doblar la p." },
            { pre: "They (buy)", post: "a house in 2020.", a: "bought", why: "Irregular." },
            { pre: "I (see)", post: "her yesterday.", a: "saw", why: "Irregular: see → saw." },
            { pre: "The film (start)", post: "at eight.", a: "started", why: "Regular, -ed suena /ɪd/." },
            { pre: "She (have)", post: "a great time.", a: "had", why: "Irregular: have → had." }
          ] },
        { t: "mc", title: "Regular o irregular", help: "Si dudas, comprueba si el pasado se parece al infinitivo.",
          qs: [
            { q: "Past of «go»", opts: ["goed", "went", "gone"], a: 1, why: "went es el pasado simple; gone es el participio." },
            { q: "Past of «study»", opts: ["studyed", "studied", "studed"], a: 1, why: "y → ied." },
            { q: "Past of «stop»", opts: ["stoped", "stopped"], a: 1, why: "Doblar la consonante final." },
            { q: "Past of «read» is spelled…", opts: ["readed", "read", "red"], a: 1, why: "Se escribe igual, se pronuncia /red/." },
            { q: "«wanted» ends with the sound…", opts: ["/t/", "/d/", "/ɪd/"], a: 2, why: "Tras t o d, la -ed suena /ɪd/." },
            { q: "«I ___ to the cinema last night.»", opts: ["go", "went", "gone"], a: 1, why: "Marcador last night → pasado simple." }
          ] }
      ]
    },
    {
      id: "past-simple-negq", label: "Past Neg & ?", icon: "did", title: "Past: Negatives & Questions",
      kicker: "did · didn't + verbo base",
      blocks: [
        { t: "rule", title: "DID se lleva el pasado", burst: "DID",
          en: "In negatives and questions the auxiliary did carries the past, so the main verb goes back to its base form.",
          es: "En negativas y preguntas el auxiliar did lleva el pasado, así que el verbo principal vuelve a la forma base.",
          formula: "Did + subject + base verb?   ·   didn't + base verb",
          steps: [
            "I went → I didn't go. Did you go?",
            "Error clásico: «I didn't went» — el pasado ya está en did.",
            "Con to be no se usa did: Was he there?, no «Did he be there?»."
          ] },
        { t: "table", title: "Las tres formas",
          head: ["Forma", "Estructura", "Ejemplo"],
          rows: [
            ["Afirmativo", "S + pasado", "She watched a film."],
            ["Negativo", "S + didn't + base", "She didn't watch a film."],
            ["Pregunta", "Did + S + base?", "Did she watch a film?"],
            ["WH-", "WH + did + S + base?", "What did she watch?"],
            ["Respuesta corta", "Yes, she did. / No, she didn't.", "—"]
          ] },
        { t: "reading", title: "Reading: Last Weekend",
          paras: [
            "Last weekend, Valentina and her friends went to the Parque de la Música in Ibagué. They arrived early in the morning. The weather was perfect — not too hot, not too cold.",
            "They didn't take a bus. They walked because the park wasn't far. Valentina bought some arepas and juice from a street vendor. Her friends played music and everyone danced. They didn't want to leave, but they had to go home before dark."
          ],
          vocab: [["arrived", "llegaron"], ["weather", "tiempo / clima"], ["far", "lejos"], ["street vendor", "vendedor ambulante"], ["before dark", "antes del anochecer"]] },
        { t: "blank", title: "didn't / did", help: "Después de did y didn't, el verbo va en forma base.",
          items: [
            { pre: "I", post: "go out last night. (negativo)", a: "didn't", why: "didn't + go." },
            { pre: "", post: "you see the match?", a: "Did", why: "Pregunta con did." },
            { pre: "She", post: "like the film. (negativo)", a: "didn't", why: "didn't + like." },
            { pre: "What time", post: "the train leave?", a: "did", why: "WH + did + sujeto + base." },
            { pre: "They", post: "call me yesterday. (negativo)", a: "didn't", why: "didn't + call." }
          ] },
        { t: "mc", title: "Negativas y preguntas", help: "El pasado solo puede estar en un sitio: en did.",
          qs: [
            { q: "Which is correct?", opts: ["I didn't went.", "I didn't go.", "I not went."], a: 1, why: "didn't + forma base." },
            { q: "«___ you finish the report?»", opts: ["Did", "Do", "Were"], a: 0, why: "Pasado con did." },
            { q: "Which is correct?", opts: ["Did she was there?", "Was she there?"], a: 1, why: "Con to be no se usa did." },
            { q: "Short answer to «Did they call?»", opts: ["Yes, they called.", "Yes, they did."], a: 1, why: "Se repite el auxiliar." },
            { q: "«Where ___ you go?»", opts: ["did", "do", "were"], a: 0, why: "WH + did." },
            { q: "«He ___ have any money.»", opts: ["didn't", "wasn't", "hadn't"], a: 0, why: "didn't have." }
          ] },
        { t: "quiz", title: "Unit 7 review quiz", pass: 7,
          qs: [
            { d: "was", q: "«They ___ at home.»", opts: ["was", "were"], a: 1, why: "they → were." },
            { d: "was", q: "«I ___ tired.»", opts: ["was", "were"], a: 0, why: "I → was." },
            { d: "-ed", q: "Past of «study»", opts: ["studyed", "studied"], a: 1, why: "y → ied." },
            { d: "-ed", q: "Past of «stop»", opts: ["stoped", "stopped"], a: 1, why: "Doblar consonante." },
            { d: "irr", q: "Past of «buy»", opts: ["buyed", "bought"], a: 1, why: "Irregular." },
            { d: "irr", q: "Past of «see»", opts: ["saw", "seen"], a: 0, why: "saw es el pasado simple." },
            { d: "did", q: "«I ___ go out.»", opts: ["didn't", "don't"], a: 0, why: "Pasado negativo." },
            { d: "did", q: "«___ she call you?»", opts: ["Did", "Does"], a: 0, why: "Pasado." },
            { d: "did", q: "Which is correct?", opts: ["Did he went?", "Did he go?"], a: 1, why: "did + base." },
            { d: "be", q: "Which is correct?", opts: ["Did you be there?", "Were you there?"], a: 1, why: "to be no usa did." }
          ] }
      ]
    }
  ]
},

{
  n: "08", id: "u8", title: "Future & Plans", es: "Futuro y planes",
  blurb: "Will/shall, be going to, much/many/a lot, quantifiers.",
  tags: ["Will", "Going to", "Quantifiers"],
  color: "#0E7A3C",
  topics: [
    {
      id: "will-shall", label: "Will / Shall", icon: "will", title: "Will & Shall",
      kicker: "decisiones, predicciones y ofrecimientos",
      blocks: [
        { t: "rule", title: "El futuro que se decide al hablar", burst: "FUTURE",
          en: "Will is for decisions made at the moment of speaking, predictions, promises and offers. It never changes form.",
          es: "Will se usa para decisiones tomadas en el momento, predicciones, promesas y ofrecimientos. No cambia nunca de forma.",
          formula: "will + base verb   ·   won't + base verb",
          steps: [
            "Decisión inmediata: The phone is ringing — I'll get it.",
            "Predicción: It will rain tomorrow.",
            "Promesa: I'll help you.",
            "Ofrecimiento con Shall I…?: Shall I open the window?"
          ],
          tip: "Shall solo se usa hoy en preguntas con I/we: Shall I…? Shall we…? En el resto suena antiguo." },
        { t: "table", title: "Formas",
          head: ["Tipo", "Estructura", "Ejemplo"],
          rows: [
            ["Afirmativo", "will / 'll + base", "I'll call you."],
            ["Negativo", "won't + base", "She won't come."],
            ["Pregunta", "Will + S + base?", "Will you help me?"],
            ["Ofrecimiento", "Shall I / we…?", "Shall we start?"]
          ] },
        { t: "mc", title: "Will en contexto", help: "¿Es una decisión de ahora, una predicción o un plan ya hecho?",
          qs: [
            { q: "The phone rings. You say:", opts: ["I'm going to get it.", "I'll get it."], a: 1, why: "Decisión inmediata → will." },
            { q: "«I think it ___ rain.»", opts: ["will", "is going to be"], a: 0, why: "Predicción con opinión → will." },
            { q: "Negative of «I will go»", opts: ["I willn't go", "I won't go"], a: 1, why: "won't." },
            { q: "«___ I help you?»", opts: ["Shall", "Will", "Do"], a: 0, why: "Ofrecimiento con Shall I." },
            { q: "Which is correct?", opts: ["She will to come.", "She will come.", "She wills come."], a: 1, why: "will + base, invariable." },
            { q: "«I promise I ___ tell anyone.»", opts: ["won't", "don't"], a: 0, why: "Futuro negativo." }
          ] }
      ]
    },
    {
      id: "be-going-to", label: "Be Going To", icon: "→", title: "Be Going To",
      kicker: "planes e intenciones",
      blocks: [
        { t: "rule", title: "El futuro ya decidido", burst: "PLAN",
          en: "Be going to expresses plans decided before speaking and predictions based on evidence you can see.",
          es: "Be going to expresa planes decididos antes de hablar y predicciones basadas en pruebas visibles.",
          formula: "am / is / are + going to + base verb",
          steps: [
            "Plan: I'm going to study medicine.",
            "Evidencia: Look at those clouds — it's going to rain.",
            "Con verbos de movimiento se prefiere el continuous: I'm going to the cinema (no «going to go»)."
          ] },
        { t: "table", title: "will o going to",
          head: ["Situación", "Forma", "Ejemplo"],
          rows: [
            ["Decisión en el momento", "will", "I'll have the soup."],
            ["Plan ya hecho", "going to", "We're going to move house."],
            ["Predicción con opinión", "will", "I think she'll win."],
            ["Predicción con pruebas", "going to", "He's going to fall!"],
            ["Promesa u ofrecimiento", "will", "I'll help you."],
            ["Horario fijo", "present simple", "The train leaves at six."]
          ] },
        { t: "blank", title: "will o going to", help: "¿Estaba decidido antes o lo decides ahora?",
          items: [
            { pre: "Look at those clouds! It", post: "rain.", a: "is going to", alt: ["'s going to"], why: "Hay pruebas visibles." },
            { pre: "The phone is ringing. I", post: "answer it.", a: "will", alt: ["'ll"], why: "Decisión inmediata." },
            { pre: "We", post: "get married next June. (ya decidido)", a: "are going to", alt: ["'re going to"], why: "Plan previo." },
            { pre: "I think she", post: "like the present.", a: "will", alt: ["'ll"], why: "Opinión → will." },
            { pre: "I promise I", post: "be late.", a: "won't", why: "Promesa en negativo." }
          ] },
        { t: "mc", title: "Elige el futuro", help: "Busca la pista: pruebas, plan previo, o decisión espontánea.",
          qs: [
            { q: "«Careful! You ___ drop it!»", opts: ["will", "are going to"], a: 1, why: "Está a punto de pasar: hay evidencia." },
            { q: "«I've decided: I ___ learn Japanese.»", opts: ["will", "am going to"], a: 1, why: "Decisión ya tomada." },
            { q: "«— Tea or coffee? — I ___ have tea.»", opts: ["will", "am going to"], a: 0, why: "Decisión en el momento." },
            { q: "«The train ___ at 7:15.»", opts: ["will leave", "leaves"], a: 1, why: "Horario fijo → present simple." },
            { q: "Which is more natural?", opts: ["I'm going to go to the cinema.", "I'm going to the cinema."], a: 1, why: "Con go se evita la repetición." },
            { q: "«They ___ buy a new car next month.»", opts: ["are going to", "will be"], a: 0, why: "Plan concreto." }
          ] }
      ]
    },
    {
      id: "much-many", label: "Much / Many", icon: "qty", title: "Much, Many & Quantifiers",
      kicker: "cantidad con contables e incontables",
      blocks: [
        { t: "rule", title: "El sustantivo decide el cuantificador", burst: "COUNT",
          en: "Many goes with countable plurals, much with uncountables. A lot of works with both.",
          es: "Many va con contables plurales y much con incontables. A lot of sirve para los dos.",
          formula: "many books · much water · a lot of both",
          steps: [
            "How many students are there?",
            "How much time do we have?",
            "much y many aparecen sobre todo en negativas y preguntas; en afirmativas se prefiere a lot of."
          ],
          tip: "«There are much people» es un error frecuente: people es contable plural, así que many people o a lot of people." },
        { t: "table", title: "Guía de cuantificadores",
          head: ["Cuantificador", "Contables", "Incontables", "Ejemplo"],
          rows: [
            ["many", "sí", "no", "many friends"],
            ["much", "no", "sí", "much money"],
            ["a lot of / lots of", "sí", "sí", "a lot of work"],
            ["a few", "sí", "no", "a few days"],
            ["a little", "no", "sí", "a little sugar"],
            ["some / any", "sí", "sí", "some ideas"],
            ["too much / too many", "según el tipo", "—", "too much noise"],
            ["enough", "sí", "sí", "enough chairs"]
          ] },
        { t: "examples", title: "Matices que cambian el sentido",
          items: [
            { en: "a few friends  /  few friends", es: "a few = unos cuantos (positivo). few = pocos (negativo)." },
            { en: "a little time  /  little time", es: "a little = un poco. little = muy poco, casi nada." },
            { en: "too much sugar", es: "too = más de lo deseable." },
            { en: "enough chairs", es: "enough = suficiente; va antes del sustantivo." }
          ] },
        { t: "blank", title: "much / many / a lot of", help: "Mira si el sustantivo es contable plural o incontable.",
          items: [
            { pre: "How", post: "money do you need?", a: "much", why: "money es incontable." },
            { pre: "How", post: "people came?", a: "many", why: "people es contable plural." },
            { pre: "There isn't", post: "time left.", a: "much", why: "time incontable en negativa." },
            { pre: "She has", post: "friends in Berlin.", a: "a lot of", alt: ["many", "lots of"], why: "En afirmativa se prefiere a lot of." },
            { pre: "I only need", post: "sugar.", a: "a little", why: "Incontable, poca cantidad." },
            { pre: "We stayed", post: "days in Rome.", a: "a few", why: "Contable plural." }
          ] },
        { t: "mc", title: "Cuantificadores", help: "Contable plural → many/a few. Incontable → much/a little.",
          qs: [
            { q: "«How ___ sugar?»", opts: ["much", "many"], a: 0, why: "Incontable." },
            { q: "«How ___ chairs?»", opts: ["much", "many"], a: 1, why: "Contable plural." },
            { q: "Which is correct?", opts: ["There are much people.", "There are many people."], a: 1, why: "people es contable plural." },
            { q: "«I have ___ information about it.»", opts: ["a few", "a little"], a: 1, why: "information es incontable." },
            { q: "«This coffee has ___ sugar.» (demasiado)", opts: ["too much", "too many"], a: 0, why: "Incontable → too much." },
            { q: "«We don't have ___ chairs.» (suficientes)", opts: ["enough", "much"], a: 0, why: "enough + sustantivo." }
          ] },
        { t: "quiz", title: "Unit 8 review quiz", pass: 7,
          qs: [
            { d: "will", q: "The phone rings: «I ___ get it.»", opts: ["will", "am going to"], a: 0, why: "Decisión inmediata." },
            { d: "will", q: "Negative of will", opts: ["willn't", "won't"], a: 1, why: "won't." },
            { d: "shall", q: "«___ I help you?»", opts: ["Shall", "Will"], a: 0, why: "Ofrecimiento." },
            { d: "gt", q: "«Look at those clouds! It ___ rain.»", opts: ["will", "is going to"], a: 1, why: "Evidencia visible." },
            { d: "gt", q: "«I've decided. I ___ study law.»", opts: ["will", "am going to"], a: 1, why: "Plan ya decidido." },
            { d: "sched", q: "«The train ___ at six.»", opts: ["will leave", "leaves"], a: 1, why: "Horario → present simple." },
            { d: "qty", q: "«How ___ money?»", opts: ["much", "many"], a: 0, why: "Incontable." },
            { d: "qty", q: "«How ___ people?»", opts: ["much", "many"], a: 1, why: "Contable plural." },
            { d: "qty", q: "«a ___ sugar»", opts: ["few", "little"], a: 1, why: "Incontable → a little." },
            { d: "qty", q: "«too ___ noise»", opts: ["much", "many"], a: 0, why: "noise es incontable." }
          ] }
      ]
    }
  ]
}
]);
}
