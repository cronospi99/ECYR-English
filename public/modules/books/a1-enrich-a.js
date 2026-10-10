// Enrichment layer for A1 units 1-8: extra vocabulary, deep-dive explanations and reference charts.
(function(){
  var E = {
  1:{ vocab:[
      {term:"to be from", pos:"expression", def:"to come from a place — your city or country.",
       use:"Always “be” + “from”: “I am from Cali.” Never “I have from Cali” and never without “from”.",
       examples:["Where are you from?","She is from Ecuador, and her husband is from Peru."],
       colloc:"be from Colombia · originally from · where are you from"},
      {term:"married / single", pos:"adjectives", def:"having a husband or wife / having no husband or wife.",
       use:"With “to be”, not “have”: “I am married.” The person is “married to” someone: “She is married to Luis.”",
       examples:["My brother is married.","Are you single or married?"],
       colloc:"happily married · married to · still single"},
      {term:"neighbour", pos:"noun", def:"a person who lives near you.",
       use:"“My neighbour” is one person; “my neighbours” is the family or the people around you. US spelling: neighbor.",
       examples:["My neighbour is a doctor.","Our neighbours are very friendly."],
       colloc:"a good neighbour · next-door neighbour"},
      {term:"job", pos:"noun", def:"the work you do to earn money.",
       use:"Countable, so it needs “a”: “I have a job”, “She is a nurse”. “Work” is uncountable: “I have a lot of work.”",
       examples:["What is your job?","He has a new job in a hotel."],
       colloc:"a good job · a part-time job · look for a job"} ],
    g:[
      {deep:"“To be” is the smallest verb in English and the busiest. It does three different jobs: it links a subject to a name (I am Ana), to a description (she is tired), and to a place (we are at home). Because it is so frequent, English never allows you to leave it out — a sentence like “She my sister” has no verb at all, even though many languages accept it. The three forms exist for historical reasons and there is no logic to learn, only a pattern to automate: am belongs to I alone, is belongs to the three singular people and things, and are covers everything else. Possessive adjectives sit in front of the noun and never change shape, no matter how many things you own, because English marks the plural on the noun and nowhere else: my book, my books, my brother’s books.",
       chart:{title:"To be + possessive adjectives", cols:["Subject","To be","Possessive","Example"], rows:[["I","am","my","I am Ana. This is my brother."],["you","are","your","You are early. Is that your bag?"],["he","is","his","He is Luis. His sister is here."],["she","is","her","She is my teacher. Her class is at nine."],["it","is","its","It is a big dog. Its name is Max."],["we","are","our","We are students. Our class is small."],["they","are","their","They are late. Their car is outside."]]}},
      {deep:"English marks a question in one of two ways, and “to be” uses the older one: it simply swaps places with the subject. “You are ready” becomes “Are you ready?” with no extra word at all, which is why adding “do” to a “to be” question is such a visible error — the sentence already contains its own question marker. Two habits will keep your answers natural. First, always give the short answer with the same verb form that appeared in the question, changing the person: “Are you tired?” — “Yes, I am.” Second, never contract a positive short answer: “Yes, I am” is correct, “Yes, I’m” is not, because English will not end a sentence on a contraction. In the negative you have the opposite freedom: “No, I’m not” and “No, I am not” are both fine.",
       chart:{title:"Questions and short answers with to be", cols:["Question","Positive answer","Negative answer"], rows:[["Am I late?","Yes, you are.","No, you aren’t."],["Are you a student?","Yes, I am.","No, I’m not."],["Is he your brother?","Yes, he is.","No, he isn’t."],["Is it far?","Yes, it is.","No, it isn’t."],["Are we ready?","Yes, we are.","No, we aren’t."],["Are they Colombian?","Yes, they are.","No, they aren’t."]]}} ] },

  2:{ vocab:[
      {term:"to get up", pos:"phrasal verb", def:"to get out of bed.",
       use:"Different from “wake up”: you wake up first (eyes open), then you get up (leave the bed).",
       examples:["I get up at six thirty every day.","On Sundays I get up late."],
       colloc:"get up early · get up late · what time do you get up"},
      {term:"usually", pos:"adverb", def:"most of the time, but not always.",
       use:"It goes before the main verb and after “to be”: “I usually work at home”, “She is usually late”.",
       examples:["I usually take the bus to work.","We usually have lunch at one."],
       colloc:"usually work · not usually · as usual"},
      {term:"to take (a bus / an hour)", pos:"verb", def:"to use transport; to need an amount of time.",
       use:"“Take the bus / the metro / a taxi” for transport, and “it takes + time” for duration: “It takes me an hour.”",
       examples:["I take the metro every morning.","It takes twenty minutes to get to work."],
       colloc:"take the bus · take a taxi · it takes time"},
      {term:"lunch / dinner", pos:"nouns", def:"the midday meal / the evening meal.",
       use:"With “have”, and with no article: “have lunch at one”, “after dinner”. Never “take lunch”.",
       examples:["I have lunch at work.","We have dinner together every night."],
       colloc:"have lunch · before dinner · a quick lunch"} ],
    g:[
      {deep:"The present simple is the tense of things that are generally true: routines, habits, timetables and facts. Its only real difficulty is a single letter. In the third person singular — he, she, it, and any name or singular noun — the verb takes -s, and everywhere else it stays bare. English also insists that this marking appears exactly once per sentence, which is the key to questions: as soon as the helper “does” carries the -s, the main verb must go back to its base form. That is why “Does she works?” feels wrong to a native ear — the sentence is marked twice. Build your questions in the fixed order wh-word, helper, subject, verb, and the structure will hold together: “Where does your brother work?”",
       chart:{title:"Present simple: statements and questions", cols:["Person","Statement","Question","Negative"], rows:[["I / you / we / they","I work here.","Do you work here?","I don’t work here."],["he / she / it","She works here.","Does she work here?","She doesn’t work here."],["spelling: -ch, -sh, -o, -x","He watches TV. She goes out.","Does he watch TV?","He doesn’t watch TV."],["spelling: consonant + y","She studies law.","Does she study law?","She doesn’t study law."],["have","She has a car.","Does she have a car?","She doesn’t have a car."]]}},
      {deep:"Time prepositions look tiny but they carry a whole system, and English fixes them so firmly that a wrong one is heard immediately. The cleanest way to hold them in your head is by size of the container. “At” goes with the smallest, sharpest points of time — a clock hour, midnight, noon. “On” goes with a whole day or date, which is a bigger box. “In” goes with the biggest boxes: months, seasons, years, and the broad parts of the day. The famous exception, “at night”, is worth learning as a single word rather than a rule. Around this core sit the sequencing words: before and after put your action next to another event, and until marks the point where something stops, so “I work until six” tells your listener where the activity ends, not how long it lasted.",
       chart:{title:"Time expressions by size of time", cols:["Preposition","Use with","Examples"], rows:[["at","clock times, meal times, night","at seven, at lunchtime, at night"],["on","days and dates","on Monday, on 5 May, on the weekend"],["in","months, years, seasons, parts of day","in July, in 2026, in the morning"],["around","approximate time","around eight, around midday"],["before / after","another event or time","before class, after dinner"],["until","the end point","until six, until Friday"],["early / late","not a preposition — after the verb","I get up early. She arrives late."]]}} ] },

  3:{ vocab:[
      {term:"this one / that one", pos:"pronoun phrases", def:"a way of pointing without repeating the noun.",
       use:"Use “one” for a countable thing you have already named: “I like this one better than that one.”",
       examples:["Which one do you prefer, this one or that one?","These are nice, but I want those ones."],
       colloc:"this one · that one over there · which one"},
      {term:"to cost", pos:"verb", def:"to have a price.",
       use:"“How much does it cost?” The thing costs; the person pays: “The shirt costs 40,000 pesos.”",
       examples:["How much do these shoes cost?","It costs more than I expected."],
       colloc:"cost a lot · how much does it cost · cost less"},
      {term:"better / worse", pos:"comparatives", def:"the irregular comparatives of good and bad.",
       use:"Never “more good” or “gooder”. Keep “than” after them: “better than”, “worse than”.",
       examples:["This café is better than the one near my house.","The traffic is worse in the morning."],
       colloc:"much better · a bit worse · better than nothing"},
      {term:"light / heavy", pos:"adjectives", def:"not weighing much / weighing a lot.",
       use:"Short adjectives, so the comparatives are “lighter” and “heavier”. Also used for meals and rain.",
       examples:["This bag is lighter than mine.","The box is too heavy for one person."],
       colloc:"very light · a bit heavier · heavy rain"} ],
    g:[
      {deep:"Demonstratives are English’s pointing fingers, and they carry exactly two pieces of information: how many things, and how far away. Near and singular gives this, near and plural gives these; far and singular gives that, far and plural gives those. Notice that distance is not only physical — English also uses “that” for something the other person mentioned, or something in the past, which is why “that idea” often sounds slightly distant even in writing. One thing to watch: demonstratives work both as determiners in front of a noun (this shirt) and as pronouns standing alone (this is expensive). When you need to stand alone but keep the noun idea alive, add “one”: “I’ll take this one.” That little word is what stops you repeating the noun in every sentence of a shopping conversation.",
       chart:{title:"This, that, these, those", cols:["","Near (here)","Far (there)"], rows:[["Singular","this shirt","that shirt"],["Plural","these shoes","those shoes"],["Alone (pronoun)","This is nice.","That is expensive."],["With “one(s)”","this one / these ones","that one / those ones"],["On the phone","This is Ana.","Is that Luis?"]]}},
      {deep:"Comparatives split adjectives into two families by length, and the rule is about syllables rather than meaning. One-syllable adjectives, and two-syllable ones ending in -y, add -er: cheaper, bigger, easier. Everything longer takes “more” in front: more expensive, more comfortable, more interesting. There is no overlap — “more cheap” and “expensiver” are both broken — and the small irregular group (good/better, bad/worse, far/further) simply has to be memorised. The second half of the structure is “than”, which introduces the thing you are comparing with and cannot be replaced by “that”. If you want to strengthen the comparison, put an intensifier before it: “much cheaper”, “a lot more comfortable”, “a bit better”. Those intensifiers are what make a comparison sound like an opinion rather than a measurement.",
       chart:{title:"Building comparatives", cols:["Adjective type","Rule","Examples"], rows:[["one syllable","+ -er","cheap → cheaper, small → smaller"],["one syllable, C-V-C","double + -er","big → bigger, hot → hotter"],["two syllables ending -y","-y → -ier","easy → easier, busy → busier"],["two or more syllables","more + adjective","expensive → more expensive"],["irregular","memorise","good → better, bad → worse, far → further"],["always","+ than","This is cheaper than that."]]}} ] },

  4:{ vocab:[
      {term:"to give", pos:"verb", def:"to hand something to someone.",
       use:"Two objects: “give me the book” or “give the book to me”. Never “give to me the book”.",
       examples:["Can you give me your number?","She gave the keys to her brother."],
       colloc:"give me a hand · give it to her · give an example"},
      {term:"to help", pos:"verb", def:"to do something useful for someone.",
       use:"“Help me”, “help her” — the object pronoun comes straight after the verb, with no preposition.",
       examples:["Can you help me with this?","I always help my parents on Saturdays."],
       colloc:"help me · help with the homework · a big help"},
      {term:"would like", pos:"expression", def:"a polite way of saying “want”.",
       use:"Always “would like + to + verb” or “would like + noun”: “I’d like to order”, “I’d like a coffee”. Never “would like + -ing”.",
       examples:["Would you like a drink?","I’d like to see the menu, please."],
       colloc:"I’d like · would you like · would you like to"},
      {term:"maybe", pos:"adverb", def:"perhaps; possibly.",
       use:"One word at the start of the sentence: “Maybe later.” Two words (“may be”) is a verb: “It may be true.”",
       examples:["Maybe we can meet on Friday.","Maybe not today — I’m busy."],
       colloc:"maybe later · maybe not · maybe tomorrow"} ],
    g:[
      {deep:"Object pronouns are the second half of a system you already know. Every person has a subject form, which does the action, and an object form, which receives it: I/me, you/you, he/him, she/her, we/us, they/them. English decides which one you need purely by position — before the verb you use the subject form, after the verb or after a preposition you use the object form. That is why “between you and I” is wrong even though it sounds careful: “between” is a preposition, so it must take “me”. Question words follow the same logic, and this is where “who” and “whom” come from, although modern speech uses “who” almost everywhere. Once you can feel the difference between “She called him” and “He called her”, the whole family falls into place.",
       chart:{title:"Subject and object pronouns", cols:["Subject","Object","Example"], rows:[["I","me","I called her. / She called me."],["you","you","You know him. / He knows you."],["he","him","He helped us. / We helped him."],["she","her","She invited them. / They invited her."],["it","it","It works. / I fixed it."],["we","us","We saw them. / They saw us."],["they","them","They like it. / I like them."]]}},
      {deep:"“Would” is English’s politeness engine. Grammatically it is a modal, so it takes no -s, needs no “do”, and is always followed by a base verb — which is why “Would you like to come?” has “like” and “come” in their plainest forms. What makes it special is what it does socially: by putting the request one step away from reality, it gives your listener room to say no, and English hears that space as courtesy. Two things are worth automating. First, the answer pattern: a positive reply is normally “Yes, please” or “I’d love to”, not “Yes, I would like”, which sounds mechanical. Second, the difference between “Do you like coffee?” (a question about your tastes in general) and “Would you like a coffee?” (an offer, right now). Mixing those two is the fastest way to confuse a waiter.",
       chart:{title:"Would: offers, requests and answers", cols:["Function","Structure","Example"], rows:[["Offer","Would you like + noun?","Would you like a coffee?"],["Invitation","Would you like to + verb?","Would you like to join us?"],["Your own wish","I’d like + noun / to + verb","I’d like the fish, please."],["Polite request","Would you + verb?","Would you open the window?"],["Accepting","Yes, please. / I’d love to.","Would you like dessert? — Yes, please."],["Declining","No, thank you. / I’d love to, but…","No, thank you — I’m fine."]]}} ] },

  5:{ vocab:[
      {term:"to get married", pos:"expression", def:"to become husband and wife.",
       use:"“Get married” is the event, “be married” is the state: “They got married in May and they are married now.”",
       examples:["My sister is getting married next year.","When did they get married?"],
       colloc:"get married in church · newly married"},
      {term:"aunt / uncle", pos:"nouns", def:"the sister or brother of your parent, or their partner.",
       use:"Their children are your cousins. Careful with the pronunciation of “aunt” — it has no “o” sound.",
       examples:["My aunt lives in Bogotá.","I’m staying with my uncle this week."],
       colloc:"my favourite aunt · a rich uncle"},
      {term:"nearly all", pos:"quantifier", def:"almost the whole group, but not one hundred per cent.",
       use:"Followed by a plural noun with “the” or a possessive: “nearly all my friends”, “nearly all of them”.",
       examples:["Nearly all my cousins live abroad.","Nearly all of the students passed."],
       colloc:"nearly all of them · nearly all the time"},
      {term:"no one / nobody", pos:"pronouns", def:"not a single person.",
       use:"They are already negative, so the verb stays positive: “No one knows”, never “No one doesn’t know”. Both take a singular verb.",
       examples:["No one is at home right now.","Nobody in my family speaks French."],
       colloc:"no one else · nobody knows · almost nobody"} ],
    g:[
      {deep:"The present continuous describes what is happening around the moment of speaking, and its shape never changes: a form of “be” plus a verb in -ing. Because “be” is already there, questions need no helper — you simply invert it, exactly as you did in unit 1: “Is she working?” The contrast with the present simple is the point of the tense. “She works in a bank” is a permanent fact; “She is working from home this week” is a temporary situation with an end in sight. That is also why a small group of verbs — know, want, like, need, have (possess), believe — resist the continuous: they describe states, not activities in progress, so “I am knowing her” has nothing to be in progress.",
       chart:{title:"Present continuous: form and use", cols:["Form","Structure","Example"], rows:[["Affirmative","am / is / are + -ing","I am cooking. She is studying."],["Negative","am not / isn’t / aren’t + -ing","They aren’t working today."],["Yes/no question","Am / Is / Are + subject + -ing?","Are you listening?"],["Wh- question","Wh + am/is/are + subject + -ing?","What are you doing?"],["Temporary situation","this week / at the moment","I’m staying with my aunt this week."],["Not for states","use present simple","I know her. (not I am knowing)"]]}},
      {deep:"Quantifiers answer the question “how many of them?” without giving a number, and English arranges them on a scale that runs from everybody down to nobody. The two things that decide which one you can use are the type of noun and the shape of the sentence. Plural countable nouns take many, a few, few and “a lot of”; singular uncountable nouns take much and a little, which you will meet properly in unit 8. And “many” behaves differently in questions and negatives than in positive statements: “Do you have many friends?” is completely natural, while “I have many friends” sounds bookish next to “I have a lot of friends”. Remember too that the negative quantifiers — no one, nobody, none — carry the negative by themselves, so the verb after them stays positive.",
       chart:{title:"Quantifier scale (countable nouns)", cols:["Quantity","Quantifier","Example"], rows:[["100%","all","All my cousins live here."],["~90%","nearly all / almost all","Nearly all my friends work."],["a large part","a lot of / lots of / many","A lot of people came."],["a small part","a few / some","A few students were late."],["very small","few / not many","Not many people know."],["0%","no / no one / nobody","No one answered."]]}} ] },

  6:{ vocab:[
      {term:"how often", pos:"question phrase", def:"asking about frequency.",
       use:"Answered with a frequency adverb or a phrase: “once a week”, “every day”, “hardly ever”.",
       examples:["How often do you go to the gym?","How often does the bus come?"],
       colloc:"how often do you · not very often · quite often"},
      {term:"to be good at / well", pos:"adjective / adverb", def:"“good” describes a person; “well” describes how they do something.",
       use:"“She is a good singer” but “She sings well”. Never “She sings good”.",
       examples:["He plays the guitar very well.","I’m not very good at swimming."],
       colloc:"do well · very well · not well at all"},
      {term:"almost always", pos:"adverb phrase", def:"nearly every time.",
       use:"Sits in the same place as “always”: before the main verb, after “to be”.",
       examples:["I almost always walk to work.","She is almost always the first to arrive."],
       colloc:"almost always late · almost never"},
      {term:"to spend (time)", pos:"verb", def:"to use time or money on something.",
       use:"“Spend + time + -ing”: “I spend two hours studying.” Never followed by an infinitive.",
       examples:["I spend an hour a day reading.","How much time do you spend online?"],
       colloc:"spend time with · spend money on · spend the weekend"} ],
    g:[
      {deep:"Adverbs of frequency tell your listener how regular a habit is, and English is unusually strict about where they stand. The rule has two halves: they go before the main verb, but after the verb “to be”. So “I always arrive early” and “I am always early” are both correct, and swapping the positions breaks both. With an auxiliary the adverb slips into the middle: “I have never been there”, “I don’t usually work Saturdays”. Two of these words are already negative — never and hardly ever — so the verb after them stays positive: “I hardly ever eat meat”, not “I don’t hardly ever eat meat”. Longer frequency phrases such as “once a week” or “every morning” behave differently: they prefer the end of the sentence, or occasionally the beginning for emphasis.",
       chart:{title:"Frequency and position", cols:["Adverb","Approx. frequency","Position"], rows:[["always","100%","before main verb / after be"],["almost always","90%","before main verb / after be"],["usually","70%","before main verb / after be"],["sometimes","40%","before main verb, or start of sentence"],["hardly ever","5%","before main verb (already negative)"],["never","0%","before main verb (already negative)"],["once a week / every day","phrase","end of sentence"]]}},
      {deep:"“How” is the most productive question word in English because it combines with other words to measure almost anything. On its own it asks about manner or health (“How are you?”, “How do you get to work?”). Followed by an adjective or adverb it asks for a measurement: how long for duration, how often for frequency, how far for distance, how well for skill. The structure never changes — how + the measuring word, then the ordinary question order — so once you have the pattern, you can build dozens of questions from it. The one thing to watch is “how long”, which measures both time and physical length, so context does the work: “How long is the film?” asks about minutes, “How long is the table?” asks about metres.",
       chart:{title:"Questions with how", cols:["Question","Asks about","Typical answer"], rows:[["How are you?","health / mood","Fine, thanks."],["How do you get to work?","manner","By bus."],["How long does it take?","duration","About twenty minutes."],["How often do you travel?","frequency","Twice a year."],["How far is it?","distance","Three kilometres."],["How well do you speak English?","skill","Quite well."],["How good is your Spanish?","level","Pretty good."]]}} ] },

  7:{ vocab:[
      {term:"to arrive", pos:"verb", def:"to reach a place.",
       use:"“Arrive in” a city or country, “arrive at” a building or a point. Never “arrive to”.",
       examples:["We arrived in Bogotá at midnight.","She arrived at the office late."],
       colloc:"arrive early · arrive on time · arrive at the airport"},
      {term:"to buy", pos:"verb", def:"to get something by paying for it.",
       use:"Irregular: buy – bought – bought. “Buy something for someone”: “I bought a gift for my mother.”",
       examples:["I bought these shoes last week.","Where did you buy that jacket?"],
       colloc:"buy a ticket · buy online · buy something for someone"},
      {term:"to travel", pos:"verb", def:"to go from one place to another, usually far.",
       use:"“Travel to + place”, and “travel by + transport”: “travel by bus”. The noun for one journey is “a trip”.",
       examples:["Last year we travelled to Peru.","I travel by train every Monday."],
       colloc:"travel abroad · travel by plane · travel light"},
      {term:"boring / interesting", pos:"adjectives", def:"not interesting / holding your attention.",
       use:"They describe the thing, not the person: “The film was boring” and “I was bored”.",
       examples:["The class was interesting yesterday.","It was a boring weekend."],
       colloc:"really boring · very interesting · sounds interesting"} ],
    g:[
      {deep:"The past simple takes a finished action and presents it as one closed block of time, which is why it lives so naturally with markers such as yesterday, last week and two years ago. Regular verbs add -ed, and irregular ones change shape completely, so the only shortcut is to learn them in threes and in sound families: buy–bought–bought sits beside bring–brought–brought, and think–thought–thought sounds the same. The grammar itself is simpler than the vocabulary. Once “did” appears in a negative or a question, the past is already marked, so the main verb returns to its base form: “Did you go?”, “I didn’t go.” Learners who write “Did you went?” have marked the past twice, and that doubled marking is the single most common A1 past-tense error.",
       chart:{title:"Past simple with ordinary verbs", cols:["","Regular (work)","Irregular (go)"], rows:[["Affirmative","I worked late.","I went home."],["Negative","I didn’t work late.","I didn’t go home."],["Yes/no question","Did you work late?","Did you go home?"],["Wh- question","Where did you work?","Where did you go?"],["Short answer","Yes, I did. / No, I didn’t.","Yes, I did. / No, I didn’t."],["Spelling","study → studied, stop → stopped","see → saw, buy → bought"]]}},
      {deep:"“To be” keeps its own past, and it keeps its own grammar with it. Where ordinary verbs need the helper “did”, was and were form negatives and questions on their own: “I wasn’t ready”, “Were you there?”. That independence is why mixing the two systems produces the classic error “Did you were at home?” — two helpers competing for one job. Choose the system before you start the sentence: if the sentence has an action, you need did plus a base verb; if it only links a subject to a description, a place or an age, you need was or were. Notice also that English uses “to be” where several other languages use “to have”: age (“I was twenty”), hunger and cold (“I was cold”) and correctness (“You were right”) all take was or were.",
       chart:{title:"Was and were", cols:["Subject","Affirmative","Negative","Question"], rows:[["I / he / she / it","was","wasn’t","Was I late?"],["you / we / they","were","weren’t","Were you late?"],["Age","I was twenty then.","—","How old were you?"],["Place","We were at home.","We weren’t at home.","Were you at home?"],["Description","It was cold.","It wasn’t cold.","Was it cold?"],["With there","There was a party. / There were ten people.","There wasn’t any food.","Were there many people?"]]}} ] },

  8:{ vocab:[
      {term:"block", pos:"noun", def:"a group of buildings between two streets; also a tall building of flats.",
       use:"Very useful in directions: “It’s two blocks from here.”",
       examples:["The pharmacy is three blocks away.","I live in a block of flats near the park."],
       colloc:"two blocks away · a block of flats · around the block"},
      {term:"quiet / noisy", pos:"adjectives", def:"with little sound / with a lot of unwanted sound.",
       use:"“Quiet” describes places and people; “silent” means no sound at all. The noun is “noise”.",
       examples:["My street is quiet at night.","The bar next door is very noisy."],
       colloc:"a quiet street · too noisy · keep quiet"},
      {term:"furniture", pos:"noun", def:"the tables, chairs, beds and sofas in a room.",
       use:"Uncountable: “some furniture”, “a piece of furniture” — never “furnitures” and never “a furniture”.",
       examples:["There isn’t much furniture in my room.","We bought two pieces of furniture."],
       colloc:"a piece of furniture · old furniture · office furniture"},
      {term:"a little / a few", pos:"quantifiers", def:"a small amount — “a little” for uncountable, “a few” for countable.",
       use:"“A little milk” but “a few eggs”. Without “a”, they turn negative: “little time” means not enough.",
       examples:["There’s a little milk in the fridge and a few eggs.","I only need a little help."],
       colloc:"a little water · a few minutes · very little time"} ],
    g:[
      {deep:"“There is” and “there are” exist to announce that something is present in a place. The word “there” here is not a place — it is a grammatical placeholder, which is why the sentence still needs a real location at the end: “There is a bank on the corner.” The verb agrees with what comes immediately after it, so a list takes its number from the first item: “There is a table and four chairs.” Around this frame sit the prepositions of place, and they repay careful learning because English keeps them fixed: in for enclosed spaces, on for surfaces, at for points. The longer ones — in front of, next to, behind, across from, between — are learned as whole phrases, and note that “in front of” is the opposite of “behind”, not of “next to”.",
       chart:{title:"There is / there are + prepositions of place", cols:["Structure","Example","Note"], rows:[["There is + singular","There is a park near my house.","also uncountable: there is some milk"],["There are + plural","There are two schools on this street.","agrees with the first noun"],["Negative","There isn’t a cinema. / There aren’t any shops.","use any in negatives"],["Question","Is there a bank? / Are there any restaurants?","short answer: Yes, there is."],["in / on / at","in the box, on the table, at the corner","space / surface / point"],["next to, in front of, behind","The bank is next to the pharmacy.","learn as whole phrases"],["across from, between","It’s across from the park, between two shops.","“between A and B”"]]}},
      {deep:"“How much” and “how many” are the same question asked of two different kinds of noun, and choosing between them forces you to decide what kind of noun you have. If you can put a number in front of it, it is countable and takes “how many”: how many eggs, how many people. If you can only measure it, it is uncountable and takes “how much”: how much milk, how much time, how much money. Uncountable nouns also take a singular verb and no plural -s, which is why “informations” and “advices” are never possible. When you do need to count an uncountable noun, English lends you a container or a unit: a bottle of water, two pieces of advice, three slices of bread. That trick is what lets you be precise about anything, countable or not.",
       chart:{title:"How much / how many and their quantifiers", cols:["","Countable (eggs)","Uncountable (milk)"], rows:[["Question","How many eggs?","How much milk?"],["A large amount","a lot of / many","a lot of / much"],["A small amount","a few","a little"],["Almost none","few / not many","little / not much"],["Zero","no eggs / none","no milk / none"],["Counting it","three eggs","two litres of milk"]]}} ] }
  };
  function apply(){
    var U = window.A1_UNITS;
    if (!U || !U.length){ setTimeout(apply, 50); return; }
    U.forEach(function(u){
      var e = E[u.n];
      if (!e || u._enriched) return;
      if (e.vocab) e.vocab.forEach(function(v){ if (!u.vocab.some(function(x){ return x.term === v.term; })) u.vocab.push(v); });
      if (e.g) e.g.forEach(function(g, i){ if (u.grammar[i]){ if (g.deep) u.grammar[i].deep = g.deep; if (g.chart) u.grammar[i].chart = g.chart; } });
      u._enriched = true;
    });
  }
  apply();
})();
