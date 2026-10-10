// Enrichment layer for A1 units 9-16: extra vocabulary, deep-dive explanations and reference charts.
(function(){
  var E = {
  9:{ vocab:[
      {term:"hair", pos:"noun", def:"what grows on your head.",
       use:"Uncountable when it is all of it: “She has long hair”, never “hairs”. Colour and length go before it: “short dark hair”.",
       examples:["He has short black hair.","My sister has beautiful curly hair."],
       colloc:"long hair · dark hair · cut your hair"},
      {term:"eyes", pos:"noun (plural)", def:"the part of the face you see with.",
       use:"With “have”: “She has green eyes.” Never “She is green eyes”.",
       examples:["He has big brown eyes.","Both my parents have blue eyes."],
       colloc:"brown eyes · dark eyes · beautiful eyes"},
      {term:"good-looking", pos:"adjective", def:"attractive.",
       use:"Used for men and women. “Handsome” is mostly for men, “pretty” mostly for women.",
       examples:["Her brother is very good-looking.","He’s a good-looking guy."],
       colloc:"really good-looking · a good-looking couple"},
      {term:"to be like / to look like", pos:"expressions", def:"“be like” asks about personality; “look like” asks about appearance.",
       use:"“What is she like?” — She’s kind and funny. “What does she look like?” — She’s tall with dark hair.",
       examples:["What is your new boss like?","What does your brother look like?"],
       colloc:"what’s he like · look like your mother"} ],
    g:[
      {deep:"Descriptions in English divide into two questions that look almost identical and mean completely different things. “What does she look like?” asks about appearance and is answered with height, hair, eyes and clothes. “What is she like?” asks about personality and is answered with adjectives of character. Learners mix them constantly, and the mistake matters, because the answers do not overlap at all. Once you have chosen the question, the answer follows a fixed order: “She is” plus a general description, then “she has” plus body features, then “she is wearing” plus clothes. English also prefers a particular adjective order in front of a noun — size, then age, then colour — so “short dark hair” sounds right and “dark short hair” sounds foreign, even though both are grammatically legal.",
       chart:{title:"Two ways of describing a person", cols:["Question","Asks about","Answer pattern","Example"], rows:[["What does he look like?","appearance","be / have / be wearing","He’s tall and he has short hair."],["What is he like?","personality","be + character adjective","He’s quiet but very friendly."],["How old is he?","age","be + number","He’s about thirty."],["How tall is he?","height","be + measurement","He’s one metre eighty."],["What is he wearing?","clothes now","be + -ing","He’s wearing a blue jacket."]]}},
      {deep:"A present participle — the -ing form — can act like an adjective and pick one person out of a group: “the woman wearing the red coat”, “the man standing by the door”. What you are really doing is shortening a relative clause: “the woman who is wearing the red coat” loses “who is”, and the meaning stays identical. This is how English answers the question “Which one?” without a long sentence, and it is why photo descriptions and identifications lean on it so heavily. Two rules keep it safe. The participle must come immediately after the noun it describes, or it attaches to the wrong person. And the participle carries no tense of its own — the main verb does that job, so “the man sitting there was my teacher” is perfectly correct.",
       chart:{title:"Identifying with participles", cols:["Full clause","Shortened with participle","Use"], rows:[["the woman who is wearing a hat","the woman wearing a hat","clothes"],["the man who is standing at the door","the man standing at the door","position"],["the boy who is holding the ball","the boy holding the ball","action"],["the girl who is talking to Ana","the girl talking to Ana","interaction"],["Which one is she?","The one sitting on the left.","short answer"]]}} ] },

  10:{ vocab:[
      {term:"just", pos:"adverb", def:"a very short time ago.",
       use:"Goes between “have” and the participle: “I have just finished.” Different from “only”, which means nothing more.",
       examples:["She has just left the office.","I’ve just had lunch."],
       colloc:"just arrived · just now · I’ve just finished"},
      {term:"so far", pos:"adverbial phrase", def:"up to now, in a period that is not over.",
       use:"A present perfect signal, usually at the end: “I’ve read two chapters so far.”",
       examples:["So far, everything is fine.","How many have you sold so far?"],
       colloc:"so far so good · so far this year"},
      {term:"since / for", pos:"prepositions", def:"“since” gives a starting point; “for” gives a length of time.",
       use:"Since 2020, since Monday · for three years, for a long time. Both go with the present perfect.",
       examples:["I’ve lived here since 2019.","I’ve lived here for seven years."],
       colloc:"ever since · for ages · since last week"},
      {term:"to finish / to complete", pos:"verbs", def:"to bring something to its end.",
       use:"“Finish” takes a noun or -ing (“finish eating”); “complete” is more formal and takes a noun (“complete the form”).",
       examples:["Have you finished the exercise yet?","I completed the course last month."],
       colloc:"finish early · finish the report · complete a form"} ],
    g:[
      {deep:"The present perfect connects the past to now, and “already” and “yet” are the two words that tell your listener whether the connection is good news or bad. “Already” means sooner than expected and belongs in positive sentences, usually between “have” and the participle: “I’ve already sent it.” “Yet” means the thing is still missing, and it belongs at the very end of negatives and questions: “I haven’t sent it yet”, “Have you sent it yet?”. The two are almost mirror images, and swapping them produces sentences English speakers cannot parse. Note that “already” can appear in a question, but then it changes the meaning to surprise: “Have you already finished?” means you did it faster than I thought possible.",
       chart:{title:"Already, yet, just, still", cols:["Word","Sentence type","Position","Example"], rows:[["already","positive","between have and participle","I’ve already eaten."],["yet","negative / question","end of sentence","I haven’t eaten yet."],["just","positive","between have and participle","I’ve just eaten."],["ever","question","between have and participle","Have you ever been to Peru?"],["never","negative meaning","between have and participle","I’ve never been to Peru."],["still","negative, ongoing","before the verb","I still haven’t eaten."]]}},
      {deep:"Both tenses talk about the past, but they frame time differently, and the time expression in the sentence almost always decides for you. The past simple needs a finished period — yesterday, last week, in 2019, two days ago — a box that nothing more can be added to. The present perfect needs an open period — today, this week, in my life so far — or no time at all, when only the present result matters. That is why “I have seen him yesterday” is impossible: a closed box cannot host an open tense. In practice the two work as a team. English opens with the perfect to ask about experience and then switches to the past for the details: “Have you been to Cartagena?” — “Yes, I went two years ago.” Learning that two-step is worth more than any list of rules.",
       chart:{title:"Which past tense?", cols:["Time expression","Tense","Example"], rows:[["yesterday, last week, in 2020, ago","past simple","I saw her last Friday."],["when I was a child","past simple","I lived in Cali when I was a child."],["today, this week, this year","present perfect","I’ve had two meetings today."],["ever, never, already, yet, just","present perfect","Have you ever flown at night?"],["since 2019, for six years","present perfect","She’s worked here for six years."],["no time given, result matters now","present perfect","I’ve lost my keys."]]}} ] },

  11:{ vocab:[
      {term:"pretty", pos:"adverb", def:"fairly, quite — a softener before an adjective.",
       use:"As an adverb it means “quite”: “pretty good”. As an adjective it means attractive. Informal but very common.",
       examples:["The film was pretty good.","It’s pretty cold today."],
       colloc:"pretty good · pretty bad · pretty much"},
      {term:"extremely", pos:"adverb", def:"very, very much.",
       use:"Goes before the adjective and is much stronger than “very”: “extremely expensive”. Not used with extreme adjectives like “terrible”.",
       examples:["The service was extremely slow.","She’s extremely good at her job."],
       colloc:"extremely useful · extremely rare"},
      {term:"however", pos:"connector", def:"a formal way of saying “but”, joining two sentences.",
       use:"It starts a new sentence and takes a comma: “The hotel was cheap. However, it was very noisy.”",
       examples:["The food was great. However, the place was crowded.","However, nobody complained."],
       colloc:"however, · however difficult"},
      {term:"though", pos:"connector", def:"an informal “but”, often at the end of a sentence.",
       use:"“It was expensive, though.” Also joins clauses at the start: “Though it rained, we went out.”",
       examples:["I liked it. It was long, though.","Though he was tired, he finished the work."],
       colloc:"even though · nice, though"} ],
    g:[
      {deep:"Adverbs of degree turn a flat adjective into an opinion with a temperature. Placed in front of the adjective, they run from weak to strong: somewhat, pretty, quite, very, really, extremely. Learning three or four of these will do more for how natural you sound than a page of new adjectives, because they let you agree politely (“it was pretty good”) or disagree strongly (“it was extremely expensive”) without changing the adjective itself. “Too” looks like the strongest of the family but does not belong to it at all: it means more than you want, so “too big” is always a complaint while “very big” can be praise. Conjunctions then join your evaluations together — and to add, but to contrast, however for a formal contrast, and though for a casual one, often thrown in at the end of the sentence.",
       chart:{title:"Degree adverbs and connectors", cols:["Word","Strength / job","Example"], rows:[["somewhat","weak","The hotel was somewhat noisy."],["pretty / quite","medium","The room was pretty small."],["very","strong","It was very comfortable."],["really","strong, informal","It was really good."],["extremely","very strong","It was extremely expensive."],["too","more than you want","It was too expensive for us."],["and / but","join, contrast","It was cheap but noisy."],["however / though","formal / informal contrast","It was cheap. However, it was noisy."]]}},
      {deep:"“Can” and “should” do different jobs in advice and it is worth keeping them apart. “Can” presents an option — it tells the other person what is possible, and leaves the decision entirely with them: “You can take the metro; it’s faster.” “Should” presents a recommendation — your opinion about the best choice: “You should take the metro.” Both are modals, which means the same three mechanical rules apply: no -s in the third person, no “to” before the next verb, and no “do” in questions or negatives. So it is “She should call him”, “Should I call him?” and “You shouldn’t worry”. In practice English speakers soften advice by mixing the two: an option first, then a recommendation, which is why “You can wait, but I think you should call now” feels so natural.",
       chart:{title:"Can and should for recommendations", cols:["Form","Can (option)","Should (advice)"], rows:[["Affirmative","You can walk there.","You should walk there."],["Negative","You can’t park here.","You shouldn’t drive today."],["Question","Can I pay by card?","Should I book in advance?"],["Meaning","possibility / permission","the best idea in my opinion"],["Followed by","base verb","base verb"],["Third person","She can help.","She should help."]]}} ] },

  12:{ vocab:[
      {term:"why don’t we…?", pos:"expression", def:"a friendly way of making a suggestion.",
       use:"Followed by a base verb: “Why don’t we meet at six?” The answer is usually “Good idea” or “I’d rather not”.",
       examples:["Why don’t we take a taxi?","Why don’t you ask your teacher?"],
       colloc:"why don’t we · why not · why don’t you try"},
      {term:"how about…?", pos:"expression", def:"another way of suggesting, followed by -ing or a noun.",
       use:"“How about meeting at six?” or “How about Friday?” Never followed by an infinitive.",
       examples:["How about going to the cinema?","How about a coffee after class?"],
       colloc:"how about tomorrow · what about you"},
      {term:"instead", pos:"adverb", def:"in place of the other option.",
       use:"At the end of the sentence alone (“Let’s stay in instead”) or as “instead of + noun/-ing”.",
       examples:["The museum is closed, so let’s go to the park instead.","Instead of driving, we walked."],
       colloc:"instead of that · go there instead"},
      {term:"to prefer", pos:"verb", def:"to like one option more than another.",
       use:"“Prefer + to + verb” (“I prefer to walk”) or “prefer A to B” (“I prefer tea to coffee”).",
       examples:["I prefer to meet in the morning.","Do you prefer this one or that one?"],
       colloc:"I’d prefer · prefer not to · prefer A to B"} ],
    g:[
      {deep:"Infinitive structures let you give advice without pointing at the person, which makes them the gentlest recommendations in English. Instead of “you should book early”, you can say “it’s a good idea to book early” or “the best thing to do is to book early”, and the advice becomes a general truth rather than an instruction. Grammatically these are all “to + base verb”, and the frames are fixed and worth memorising whole: it’s a good idea to…, it’s better to…, the best way to…, try to…. Two traps sit nearby. First, “recommend” and “suggest” do not take an object plus infinitive: say “I recommend booking early” or “I suggest that you book early”, never “I recommend you to book”. Second, “worth” takes -ing, not an infinitive: “it’s worth booking early”.",
       chart:{title:"Infinitive advice frames", cols:["Frame","Structure","Example"], rows:[["It’s a good idea to…","to + verb","It’s a good idea to arrive early."],["It’s better to…","to + verb","It’s better to call first."],["The best way to… is to…","to + verb","The best way to learn is to practise."],["Try to…","to + verb","Try to speak every day."],["I recommend / suggest…","-ing or that-clause","I recommend booking early."],["It’s worth…","-ing","It’s worth checking the price."]]}},
      {deep:"“Can”, “could” and “should” cover almost every suggestion and request you will need, and the difference between them is social rather than logical. “Can you…?” is a direct, friendly request between people who know each other. “Could you…?” is one step more distant and therefore politer, which makes it the safest default with strangers, officials and anyone senior to you. “Should we…?” is not a request at all — it asks for a shared decision, so it belongs in group planning. Because these are modals, the mechanics never change: base verb after them, no “to”, no “do”. The one thing to add is a reason. English expects requests and refusals to come with an explanation, so “Could you send it today? I need it for the meeting” lands far better than the bare question.",
       chart:{title:"Can, could, should: requests and suggestions", cols:["Form","Function","Example","Level"], rows:[["Can you…?","request","Can you help me?","informal"],["Could you…?","request","Could you help me?","polite"],["Can I…?","permission","Can I use your phone?","informal"],["Could I…?","permission","Could I use your phone?","polite"],["Should we…?","shared decision","Should we start now?","neutral"],["Let’s…","suggestion","Let’s start now.","friendly"]]}} ] },

  13:{ vocab:[
      {term:"me too / me neither", pos:"expressions", def:"short ways of agreeing with a positive / a negative statement.",
       use:"“I love coffee.” — “Me too.” / “I don’t like coffee.” — “Me neither.” They never change form.",
       examples:["I’m tired. — Me too.","I can’t swim. — Me neither."],
       colloc:"me too · me neither · same here"},
      {term:"to disagree", pos:"verb", def:"to have a different opinion.",
       use:"“Disagree with someone about something”. In English it is polite to soften it: “I’m not sure I agree.”",
       examples:["I disagree with that idea.","We disagreed about the price."],
       colloc:"strongly disagree · agree to disagree"},
      {term:"I think / I don’t think", pos:"expressions", def:"the standard way of introducing an opinion.",
       use:"English puts the negative on “think”, not on the second verb: “I don’t think it’s a good idea.”",
       examples:["I think this one is better.","I don’t think she knows."],
       colloc:"I think so · I don’t think so · what do you think"},
      {term:"right / wrong", pos:"adjectives", def:"correct / not correct.",
       use:"With “to be”, not “have”: “You are right.” Never “You have reason”.",
       examples:["You’re right — it starts at eight.","I was wrong about the date."],
       colloc:"absolutely right · completely wrong · that’s right"} ],
    g:[
      {deep:"English hates repetition, so instead of saying “I also like coffee” it echoes only the skeleton of the other person’s sentence. That skeleton is the auxiliary: if your partner said “I have never been there”, your agreement is “Neither have I”, because their sentence was built on “have”. When a sentence has no auxiliary at all, “do” stands in: “I like it” gets “So do I”. Two more details finish the system. “So” and “neither” both require inversion — the verb comes before the subject, so “So do I” is right and “So I do” is not. And “neither” already carries the negative, which is why the verb after it stays positive. The informal versions, “me too” and “me neither”, never change shape and are perfectly acceptable in speech.",
       chart:{title:"Agreeing and disagreeing", cols:["Statement","Agree","Disagree"], rows:[["I like it.","So do I. / Me too.","I don’t."],["I don’t like it.","Neither do I. / Me neither.","I do."],["I’m tired.","So am I.","I’m not."],["I’m not hungry.","Neither am I.","I am."],["I’ve finished.","So have I.","I haven’t."],["I can’t drive.","Neither can I.","I can."]]}},
      {deep:"“Would” turns an instruction into a request by moving it one step away from reality, and English reads that distance as respect. “Would you open the window?” asks about a hypothetical willingness rather than demanding an action, which is why it works with strangers, in shops and in emails. The related form “I would like” is your own polite wish, and it is the phrase to use when ordering or asking for something: “I’d like a coffee, please.” Keep three mechanics in mind. “Would” is a modal, so it is followed by a base verb with no “to”. Its contraction “’d” is everywhere in speech, so train your ear for it. And answers stay short and warm: “Of course”, “Certainly”, “Yes, please” — never a full repetition of the request.",
       chart:{title:"Requests with would", cols:["Structure","Function","Example","Typical answer"], rows:[["Would you + verb?","request","Would you help me?","Of course."],["Would you like + noun?","offer","Would you like some water?","Yes, please."],["Would you like to + verb?","invitation","Would you like to join us?","I’d love to."],["I’d like + noun","your order / wish","I’d like the soup, please.","Certainly."],["I’d like to + verb","your intention","I’d like to book a table.","For how many?"],["Would you mind + -ing?","very polite request","Would you mind waiting?","Not at all."]]}} ] },

  14:{ vocab:[
      {term:"river / lake", pos:"nouns", def:"a long stream of water / a large area of water surrounded by land.",
       use:"With “the” for named rivers (the Magdalena) but not for lakes (Lake Titicaca).",
       examples:["The Amazon is the longest river in South America.","We swam in the lake."],
       colloc:"a wide river · cross the river · a deep lake"},
      {term:"desert / rainforest", pos:"nouns", def:"a very dry region / a very wet, dense forest.",
       use:"Careful with the pronunciation of “desert” (dry place) and “dessert” (sweet food).",
       examples:["The desert is extremely dry.","Colombia has a huge area of rainforest."],
       colloc:"a hot desert · tropical rainforest"},
      {term:"the highest / the largest", pos:"superlatives", def:"the top of the group.",
       use:"Superlatives always take “the”: “the highest mountain”. Long adjectives take “the most”: “the most beautiful”.",
       examples:["It’s the highest building in the city.","That’s the most expensive option."],
       colloc:"the biggest · the most popular · one of the best"},
      {term:"metre / kilometre", pos:"nouns", def:"units of length and distance.",
       use:"Used in measurement answers: “two metres tall”, “ten kilometres away”. US spelling: meter, kilometer.",
       examples:["The wall is three metres high.","The airport is twenty kilometres from here."],
       colloc:"square metres · a few kilometres away"} ],
    g:[
      {deep:"Comparatives and superlatives are built from the same two families you met in unit 3, and the split is still about length. Short adjectives add -er and -est: cheap, cheaper, the cheapest. Long adjectives take “more” and “the most”: expensive, more expensive, the most expensive. The superlative always keeps “the”, because it identifies one unique item, and it is normally followed by a phrase that names the group: “the biggest city in Colombia”, “the best day of my life”. Two useful extras: “one of the + superlative + plural noun” lets you praise without claiming first place (“one of the most beautiful cities”), and intensifiers such as “by far” and “much” let you show how big the gap is (“by far the largest”, “much cheaper”).",
       chart:{title:"Comparative and superlative forms", cols:["Adjective","Comparative","Superlative"], rows:[["big","bigger","the biggest"],["dry","drier","the driest"],["humid","more humid","the most humid"],["beautiful","more beautiful","the most beautiful"],["good","better","the best"],["bad","worse","the worst"],["far","farther / further","the farthest / furthest"]]}},
      {deep:"To ask about a measurement, English builds a question from “how” plus the relevant adjective, and the adjective tells you which dimension you mean: how long for length or duration, how tall for people and buildings, how high for mountains and walls, how deep for water, how wide for roads and rivers. The answer follows a fixed shape that reverses the order of the question: number, unit, adjective — “two metres deep”, “eighty kilometres long”. This is worth practising because it is the opposite of what most learners produce at first. Note also that some of these adjectives have their own nouns for the measurement — length, height, depth, width — which are useful when you need to be formal: “What is the height of the building?”",
       chart:{title:"How + adjective for measurements", cols:["Question","Dimension","Answer pattern"], rows:[["How long is it?","length / duration","It’s ten metres long. / two hours long."],["How tall is he?","height (people, buildings)","He’s 1.80 metres tall."],["How high is it?","height (mountains, walls)","It’s 5,000 metres high."],["How deep is it?","depth","It’s thirty metres deep."],["How wide is it?","width","It’s four metres wide."],["How far is it?","distance","It’s twenty kilometres from here."],["How hot / cold is it?","temperature","It’s about thirty degrees."]]}} ] },

  15:{ vocab:[
      {term:"to be going to", pos:"expression", def:"the form for plans you have already decided.",
       use:"“Be going to + base verb”: “I’m going to study tonight.” Not “I’m going to study” for a spontaneous decision — that takes “will”.",
       examples:["We’re going to move next month.","What are you going to do at the weekend?"],
       colloc:"going to start · going to be late"},
      {term:"to leave a message", pos:"expression", def:"to give information for someone who is not there.",
       use:"Fixed phrase: “Can I leave a message?” The person who receives it “takes a message”.",
       examples:["She isn’t here — can I take a message?","I left a message on his phone."],
       colloc:"leave a message · take a message"},
      {term:"to be available", pos:"expression", def:"free and able to talk or meet.",
       use:"For people and times: “She isn’t available right now”, “Is Friday available?”",
       examples:["He’s not available until three.","Are you available tomorrow morning?"],
       colloc:"available now · not available · availability"},
      {term:"to remind", pos:"verb", def:"to make someone remember something.",
       use:"“Remind someone to + verb”: “Remind me to call her.” Different from “remember”, which is your own memory.",
       examples:["Please remind me to send the file.","She reminded me about the meeting."],
       colloc:"remind me to · a reminder · gently remind"} ],
    g:[
      {deep:"“Be going to” and the present continuous both talk about the future, and both contain a present tense, which is exactly why they feel so certain: the plan already exists as you speak. The difference is how fixed it is. “Be going to” expresses an intention — you have decided, but the details may still move: “I’m going to look for a new job.” The present continuous expresses an arrangement — the time, the place or the other people are already settled: “I’m meeting the client at four.” This is why diaries are written in the present continuous and ambitions in “going to”. A time expression is almost always necessary with the continuous, otherwise your listener will hear it as “right now” instead of “later”, so keep “tomorrow”, “on Friday” or “at six” in the sentence.",
       chart:{title:"Two ways of talking about the future", cols:["Form","Meaning","Example"], rows:[["be going to","intention, decided plan","I’m going to start a course."],["be going to","prediction from evidence","Look at the sky — it’s going to rain."],["present continuous","fixed arrangement","I’m meeting Ana at six."],["present continuous + time","diary entry","We’re flying on Tuesday."],["will","decision made now, offer","I’ll help you with that."],["present simple","timetables","The bus leaves at seven."]]}},
      {deep:"“Say” and “tell” carry the same information and different grammar, and one small rule separates them: “tell” must be followed by the person, “say” must not. So it is “She told me she was late” and “She said she was late”, never “She said me”. If you really want a person after “say”, you have to insert “to”: “she said to me”. When you pass a message on, the tense usually shifts one step back, because the words were spoken before you repeat them: “I’ll call later” becomes “He said he would call later”. Around this sit the request modals — can, could and would — which decide how polite the original message sounded, and it is worth keeping that level when you report it, because reporting a polite request as an order changes the whole picture.",
       chart:{title:"Say, tell and passing on messages", cols:["Verb","Structure","Example"], rows:[["say","say (that) + clause","She said (that) she was busy."],["say","say to + person","She said to me that she was busy."],["tell","tell + person + (that) + clause","She told me she was busy."],["tell","tell + person + to + verb","She told me to wait."],["ask","ask + person + to + verb","She asked me to wait."],["Message shift","will → would, is → was","“I’ll call.” → He said he would call."]]}} ] },

  16:{ vocab:[
      {term:"to improve", pos:"verb", def:"to get better, or to make something better.",
       use:"Works with and without an object: “My English has improved” and “I want to improve my English”.",
       examples:["My pronunciation has improved a lot.","We need to improve the service."],
       colloc:"improve quickly · a big improvement"},
      {term:"these days", pos:"adverbial phrase", def:"now, in contrast with the past.",
       use:"Always with a present tense: “These days I work from home.” Sits at the start or the end.",
       examples:["These days everyone pays with a phone.","I don’t go out much these days."],
       colloc:"these days · not these days"},
      {term:"to decide", pos:"verb", def:"to choose after thinking about it.",
       use:"“Decide to + verb” (“I decided to move”) or “decide on + noun” (“We decided on Friday”). Never “decide + -ing”.",
       examples:["I’ve decided to change jobs.","We haven’t decided yet."],
       colloc:"decide to go · a big decision · make a decision"},
      {term:"to look forward to", pos:"phrasal verb", def:"to feel happy about something in the future.",
       use:"Followed by a noun or -ing, never an infinitive: “I look forward to seeing you.”",
       examples:["I’m looking forward to the weekend.","She’s looking forward to starting her new job."],
       colloc:"look forward to hearing from you · really looking forward to it"} ],
    g:[
      {deep:"Talking about change means running three time frames in the same paragraph, and each clause needs its own tense and its own time marker. Use “used to” or the past simple for what is no longer true, the present simple for the current situation, and the present perfect as the bridge that links them: “I used to smoke. I’ve stopped now. These days I run twice a week.” The present perfect is the key piece, because its whole job is to connect a past event to the present result, which is precisely what a story of change needs. Two habits help. Keep the subject and the topic constant so the tense shift is the only thing moving, and put a visible connector at every shift — “but now”, “these days”, “since then” — or your listener will hear the present sentence as part of the past.",
       chart:{title:"Describing change across tenses", cols:["Time frame","Form","Example"], rows:[["Then (finished)","used to / past simple","I used to live with my parents."],["Bridge (past → now)","present perfect","I’ve moved twice since then."],["Now","present simple","These days I live alone."],["Now, temporary","present continuous","I’m staying with a friend this month."],["Comparison","comparative + than before","Life is easier than before."],["Next","be going to","I’m going to buy a flat."]]}},
      {deep:"A large group of everyday verbs is followed by “to + base verb”, and most of them share one idea: they point forwards at something not yet real. You want to travel, you hope to pass, you plan to move, you decide to change, you would like to start. Because the meaning is future-facing, the infinitive is the natural partner, and the pattern is completely regular — nothing changes except the first verb. Watch two things. “Would like” always takes an infinitive, never -ing: “I’d like to go”, not “I’d like going”. And a small set of verbs takes -ing instead, usually because they describe experiencing an activity rather than aiming at one: enjoy, finish, avoid, keep. Keeping those two lists apart is what stops sentences like “I hope going” or “I enjoy to travel”.",
       chart:{title:"Verb + infinitive for plans and wishes", cols:["Verb","Structure","Example"], rows:[["be going to","+ base verb","I’m going to apply."],["want","+ to + verb","I want to travel next year."],["hope","+ to + verb","I hope to finish by June."],["plan","+ to + verb","We plan to move in July."],["decide","+ to + verb","She decided to study abroad."],["would like","+ to + verb","I’d like to learn German."],["but: enjoy, finish, keep","+ -ing","I enjoy travelling alone."]]}} ] }
  };
  function apply(){
    var U = window.A1_UNITS;
    if (!U || !U.length){ setTimeout(apply, 50); return; }
    U.forEach(function(u){
      var e = E[u.n];
      if (!e || u._enrichedB) return;
      if (e.vocab) e.vocab.forEach(function(v){ if (!u.vocab.some(function(x){ return x.term === v.term; })) u.vocab.push(v); });
      if (e.g) e.g.forEach(function(g, i){ if (u.grammar[i]){ if (g.deep) u.grammar[i].deep = g.deep; if (g.chart) u.grammar[i].chart = g.chart; } });
      u._enrichedB = true;
    });
  }
  apply();
})();
