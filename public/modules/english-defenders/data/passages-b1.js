// Text completions — Nivel B1 — English Defenders
// Autor: Teacher Esteban Yepes.
// Pasajes de 2 a 4 frases con un hueco. Desde B1 el contexto es el formato dominante
// (quiz.js alterna ~1 pasaje por cada frase suelta): la pista está en el texto, no en la regla.
// Clave: "unidad-clase" según INT-ANX-005.

export const PASSAGES_B1 = {
 "1-1": [
  {t:'p', q:'The café on my street is run by a couple from Medellín. The woman ____ serves the coffee remembers every regular customer by name. That is why the place is always full.', o:['who','which','whose','what'], a:0, why:'La relativa es sujeto y se refiere a una persona: "who" (también valdría "that").'},
  {t:'p', q:'I finally watched the documentary ____ you recommended last month. It was much darker than I expected, but the photography was extraordinary. I stayed awake thinking about it.', o:['that','who','whose','what'], a:0, why:'Relativa de objeto referida a una cosa: "that" o "which" (y aquí se podría omitir).'},
 ],
 "1-2": [
  {t:'p', q:'Moving abroad sounds glamorous until you actually do it. ____ is hard is not the language but the silence of the first months. After a year, everything feels normal again.', o:['What','It','That','Which'], a:0, why:'La frase se organiza en torno a "What is hard is...", que destaca la idea.'},
  {t:'p', q:'My brother never complains about his job, but I can always tell. ____ he is stressed, he cleans the whole kitchen at midnight. Last night the floor was shining.', o:['When','Which','That','What'], a:0, why:'Cláusula adverbial de tiempo: "When + sujeto + verbo".'},
 ],
 "2-5": [
  {t:'p', q:'Everyone talks about willpower, but habits matter more. ____ every morning at the same time changed my whole routine. Now I hardly notice the effort.', o:['Running','To run','Run','I run'], a:0, why:'Un gerundio funciona como sujeto de la frase: "Running ... changed".'},
  {t:'p', q:'My grandmother is eighty-four and still teaches piano. She says she has never considered ____, because the students keep her young. Her diary is full until December.', o:['retiring','to retire','retire','that retire'], a:0, why:'Tras "consider" el verbo va en gerundio.'},
 ],
 "2-6": [
  {t:'p', q:'We compared the two flats for a week. The second one costs the same, but it has ____ natural light than the first. In the end we chose it for that reason alone.', o:['much more','many more','much','more many'], a:0, why:'"Light" es incontable, así que el comparativo se refuerza con "much more".'},
  {t:'p', q:'People assume the two brothers are very different. In fact, Daniel works just ____ his older brother does, and both leave the office last. Only their hobbies are different.', o:['as hard as','as hard than','so hard as','harder as'], a:0, why:'Comparación de igualdad con un adverbio: "as + adverbio + as".'},
 ],
 "3-10": [
  {t:'p', q:'The printer in the office has been broken for a week. I sent a message to the manager: "____ you mind sending someone to look at it?" She replied in two minutes.', o:['Would','Could','Do','Will'], a:0, why:'"Would you mind + gerundio" es la petición más cortés de la serie.'},
  {t:'p', q:'My presentation is on Thursday and I still have not practised it. I asked my colleague ____ she could listen to me for twenty minutes. She said she was free after lunch.', o:['if','that','would','what'], a:0, why:'Petición indirecta con cláusula de "if": "I asked if she could...".'},
 ],
 "3-11": [
  {t:'p', q:'The tourist stopped me at the corner with a map in his hands. He wanted to know how ____ to the cathedral from there. I walked with him for two blocks.', o:['he could get','could he get','can he get','he can got'], a:0, why:'En la pregunta indirecta se recupera el orden sujeto + verbo.'},
  {t:'p', q:'The email from the university was very short. They asked me ____ I had finished my thesis or not. I answered honestly: not yet.', o:['whether','that','if that','what'], a:0, why:'"Whether ... or not" es la forma habitual cuando se ofrecen dos alternativas.'},
 ],
 "4-14": [
  {t:'p', q:'The accident happened at the corner of my street. I ____ home from work when I heard the noise. By the time I got there, an ambulance had already arrived.', o:['was walking','walked','have walked','walk'], a:0, why:'Acción larga de fondo interrumpida por otra breve: pasado continuo.'},
  {t:'p', q:'It was the strangest interview of my life. While the manager ____ my CV, his dog came in and sat on my feet. I got the job anyway.', o:['was reading','read','reads','has read'], a:0, why:'Tras "while" se usa el pasado continuo para la acción que sirve de fondo.'},
 ],
 "4-15": [
  {t:'p', q:'When we arrived at the theatre, the doors were closed and the lights were off. The play ____ an hour earlier than the website said. We ended up having dinner instead.', o:['had started','started','has started','was starting'], a:0, why:'Una acción anterior a otro momento pasado: pasado perfecto.'},
  {t:'p', q:'She opened the box and found nothing but old newspapers. Someone ____ the letters before she got there. Nobody in the family ever admitted it.', o:['had taken','took','has taken','was taking'], a:0, why:'La acción ocurre antes del momento pasado del relato: "had + participio".'},
 ],
 "5-19": [
  {t:'p', q:'The company is small but very selective. They are looking for someone ____ who can also manage a team. So far, nobody has passed the second interview.', o:['with a degree in design','designs','who design','of design'], a:0, why:'La frase nominal se amplía con un complemento antes de la relativa: "someone with a degree in design who...".'},
  {t:'p', q:'I want to move to a place ____ is close to the sea. Nothing expensive, just quiet. My budget is small, so I may have to wait.', o:['that','who','what','where that'], a:0, why:'La relativa describe "a place" (cosa) y funciona como sujeto: "that" o "which".'},
 ],
 "5-20": [
  {t:'p', q:'In my country, guests never arrive at the exact time written on the invitation. It is the ____ arrive fifteen minutes late. Being early is almost rude.', o:['custom to','custom for','customs to','custom of'], a:0, why:'Expectativa cultural: "It is the custom to + verbo".'},
  {t:'p', q:'I brought my laptop to the exam and the teacher stopped me at the door. We were not ____ use any device during the test. I left it in the office.', o:['supposed to','suppose to','supposed','supposing to'], a:0, why:'"Be (not) supposed to + verbo" expresa lo que estaba previsto o permitido.'},
 ],
 "6-23": [
  {t:'p', q:'I bought the jacket online and it arrived yesterday. When I opened the package, I found a ____ sleeve and a stain on the back. I asked for a refund immediately.', o:['torn','tearing','tear','tore'], a:0, why:'El participio pasado funciona como adjetivo delante del nombre: "a torn sleeve".'},
  {t:'p', q:'The flat looked perfect in the photos. In reality, there were ____ tiles in the bathroom and the heating did not work. The landlord promised to fix everything.', o:['broken','breaking','break','broke'], a:0, why:'"Broken tiles": participio pasado con valor de adjetivo.'},
 ],
 "6-24": [
  {t:'p', q:'The car makes a strange noise every time I brake. My mechanic said the brakes ____ before the trip. I am taking it to the garage on Friday.', o:['need replacing','need replace','need to replacing','needs replaced'], a:0, why:'"Need + gerundio" tiene sentido pasivo: hay que cambiarlos.'},
  {t:'p', q:'This laptop has been slow since the last update. It ____ properly, not just restarted every morning. I will take it to a technician.', o:['needs to be checked','needs check','need checked','needs to check'], a:0, why:'"Need + infinitivo pasivo" (to be + participio) es la alternativa formal a "need checking".'},
 ],
 "7-28": [
  {t:'p', q:'The bridge has been closed since the storm in March. It ____ for months and the neighbours are losing patience. The council keeps promising a date.', o:['has been worked on','has worked on','is worked','has been working'], a:0, why:'Pasiva en presente perfecto con preposición: "has been worked on".'},
  {t:'p', q:'The old cinema is finally getting a second life. It is ____ into a public library at the moment. The reopening is planned for next spring.', o:['being turned','been turned','turning','being turn'], a:0, why:'Pasiva en presente continuo: "is being + participio".'},
 ],
 "7-29": [
  {t:'p', q:'The instructions on the box were useless. It took me two hours ____ what a child could have done in ten minutes. I threw the manual away.', o:['to understand','understanding','for understand','understand'], a:0, why:'"It takes + tiempo + infinitivo con to" para expresar cuánto cuesta hacer algo.'},
  {t:'p', q:'She had prepared for months and knew every question by heart. She was the first candidate ____ the exam that year. The university offered her a scholarship.', o:['to pass','passing','passed','for passing'], a:0, why:'Tras un superlativo u ordinal ("the first") se usa el infinitivo con "to".'},
 ],
 "8-32": [
  {t:'p', q:'They offered me the job in Bogotá with a good salary. Honestly, I would ____ stay here and earn a little less. My whole family lives in this town.', o:['rather','prefer','better to','rather to'], a:0, why:'"Would rather + verbo base" expresa preferencia.'},
  {t:'p', q:'We can meet on Friday evening or Saturday morning, whatever suits you. I would prefer ____ on Saturday, if that is all right. Fridays I finish very late.', o:['to meet','meeting to','meet','that meet'], a:0, why:'"Would prefer + infinitivo con to" (frente a "would rather + verbo base").'},
 ],
 "8-33": [
  {t:'p', q:'People always ask me how I learned English so fast. I improved a lot ____ series without subtitles for a whole year. At first I understood almost nothing.', o:['by watching','for watching','with watch','by watch'], a:0, why:'"By + gerundio" explica el método con el que se consigue algo.'},
  {t:'p', q:'The recipe is simpler than it looks. You get the perfect texture ____ the eggs slowly and never stopping. My grandmother did it for fifty years.', o:['by adding','for adding','by add','with adding'], a:0, why:'El modo se expresa con "by + gerundio".'},
 ],
 "9-37": [
  {t:'p', q:'I never cut my own hair, I would ruin it. I ____ every six weeks at the same place near my office. It costs very little.', o:['have it cut','have cut it','have it cutting','am cutting it'], a:0, why:'"Have something done": otra persona hace el trabajo por ti.'},
  {t:'p', q:'The screen broke when the phone fell in the street. I am ____ tomorrow, because a new phone is too expensive. The shop said it takes an hour.', o:['getting it repaired','getting repair it','getting it repair','repairing it done'], a:0, why:'"Get something done" es la variante informal de "have something done".'},
 ],
 "9-38": [
  {t:'p', q:'You have been staring at that page for an hour and nothing is coming. Why ____ a walk and come back later? It always works for me.', o:["don't you take",'not you take','you don\'t take','not to take'], a:0, why:'Sugerencia con pregunta negativa: "Why don\'t you + verbo base?".'},
  {t:'p', q:'The room feels empty and the walls are completely white. How about ____ some plants near the window? It would change everything.', o:['putting','put','to put','we put'], a:0, why:'Tras "How about" el verbo va en gerundio.'},
 ],
 "10-41": [
  {t:'p', q:'Don\'t call me between six and eight tomorrow. I ____ my final exam at that time. After that, I am completely free.', o:['will be taking','will take','am taking to','will have taken'], a:0, why:'Futuro continuo: acción en curso en un momento concreto del futuro.'},
  {t:'p', q:'The builders started in January and they are ahead of schedule. By December they ____ the whole building. We should be able to move in before Christmas.', o:['will have finished','will finish','will be finishing','finish'], a:0, why:'"By + fecha futura" pide futuro perfecto: acción terminada antes de ese momento.'},
 ],
 "10-42": [
  {t:'p', q:'I have not seen my cousin in a very long time. We have not spoken ____ her wedding in 2019. I should send her a message today.', o:['since','for','during','from'], a:0, why:'"Since" marca el punto de inicio; "for", la duración.'},
  {t:'p', q:'The museum was much emptier than I expected. ____ the visit, I was almost the only person in the building. I could take photos of everything.', o:['During','For','While','Since'], a:0, why:'"During + sustantivo" señala el periodo en el que ocurre algo.'},
 ],
 "11-46": [
  {t:'p', q:'The taxi was already outside and I was still looking for my passport. ____ I found it, we had lost twenty minutes. We ran through the airport.', o:['By the time','Until','As soon','The moment when'], a:0, why:'"By the time + frase" = para cuando ocurrió eso, ya había pasado otra cosa.'},
  {t:'p', q:'I will not relax until this project is delivered. ____ I send the last file, I am going to sleep for two days. My phone will be off.', o:['The moment','During','By','Until'], a:0, why:'"The moment (that) + frase" = justo cuando, en el instante en que.'},
 ],
 "11-47": [
  {t:'p', q:'The meeting was a disaster and everybody knew it. We ____ the report before presenting it. Now we have to explain the mistakes to the client.', o:['should have checked','should check','must have checked','would check'], a:0, why:'"Should have + participio" lamenta algo que no se hizo.'},
  {t:'p', q:'I sold my old flat two months before prices went up. If I ____ a little longer, I would have made much more money. That is life.', o:['had waited','waited','would wait','have waited'], a:0, why:'Tercer condicional: "if + past perfect", consecuencia con "would have + participio".'},
 ],
 "12-50": [
  {t:'p', q:'The seats at the back were completely full. It was impossible ____ the speaker from there. We left after fifteen minutes.', o:['to hear','hearing','for hear','hear'], a:0, why:'"It is + adjetivo + infinitivo con to" para valorar una acción.'},
  {t:'p', q:'I recorded the whole lesson on my phone. It was the easiest way ____ to review the material later. Two classmates asked me for a copy.', o:['for us','of us','to us','for we'], a:0, why:'"For + persona + infinitivo" indica quién realiza la acción del infinitivo.'},
 ],
 "12-51": [
  {t:'p', q:'The match was cancelled at the last minute. It was called off ____ the heavy rain, not because of the referee. They will play again on Tuesday.', o:['because of','because','since of','for that'], a:0, why:'"Because of + sustantivo"; "because" iría seguido de sujeto y verbo.'},
  {t:'p', q:'The office was closed all afternoon and nobody warned the clients. ____ the delay was a power cut in the whole building. We apologised by email.', o:['The reason for','The reason','Due','Because of'], a:0, why:'"The reason for + sustantivo" introduce la causa como sujeto de la frase.'},
 ],
 "13-55": [
  {t:'p', q:'Nobody answered the door and all the curtains were closed. They ____ on holiday already. Their car was not in the garage either.', o:['must have gone','must go','should have gone','can have gone'], a:0, why:'Deducción casi segura sobre el pasado: "must have + participio".'},
  {t:'p', q:'She never replied to my message, which is strange. She ____ it, because she changed her phone that week. I will ask her when I see her.', o:['may not have received','may not receive','might not receiving','must not have received'], a:0, why:'Posibilidad negativa en el pasado: "may/might not have + participio".'},
 ],
 "13-56": [
  {t:'p', q:'He signed the contract without reading the last two pages. He ____ it to a lawyer first. Now he is stuck for three years.', o:['could have shown','could show','can have shown','would show'], a:0, why:'"Could have + participio" señala una posibilidad pasada que no se aprovechó.'},
  {t:'p', q:'They drove for nine hours without stopping and arrived exhausted. I ____ somewhere halfway and continued the next morning. But they never listen to me.', o:['would have stopped','would stop','will have stopped','should stop'], a:0, why:'"Would have + participio" expresa lo que uno habría hecho en su lugar.'},
 ],
 "14-59": [
  {t:'p', q:'The process is much simpler than most people imagine. First the beans ____ and left to dry for several days. Only then are they roasted.', o:['are washed','wash','are washing','washed'], a:0, why:'Pasiva de presente para describir procesos: "are + participio".'},
  {t:'p', q:'Handle the equipment carefully during the experiment. The samples ____ at a constant temperature or the results are useless. Check the thermometer twice a day.', o:['must be kept','must keep','must be keeping','must kept'], a:0, why:'Pasiva con modal: "modal + be + participio".'},
 ],
 "14-60": [
  {t:'p', q:'My aunt Teresa, ____ lived in Canada for thirty years, is coming back in June. She has already bought a house near the river. The whole family is excited.', o:['who','that','which','whom'], a:0, why:'En una relativa explicativa (entre comas) no se puede usar "that": se usa "who".'},
  {t:'p', q:'They cancelled the last two trains of the night, ____ left hundreds of people at the station. Some of them waited until five in the morning. The company apologised the next day.', o:['which','that','who','what'], a:0, why:'"Which" se refiere a toda la idea anterior en una relativa explicativa.'},
 ],
 "15-64": [
  {t:'p', q:'The instructions on the box are very clear. The medicine ____ in the fridge and never in the bathroom. Otherwise it loses its effect.', o:['should be kept','should keep','should be keeping','should to be kept'], a:0, why:'Modal pasivo: "should be + participio".'},
  {t:'p', q:'Do not sign anything today. The contract ____ by a lawyer before you accept it. These clauses are unusual.', o:['ought to be read','ought to read','ought be read','ought to being read'], a:0, why:'"Ought to be + participio" es la pasiva modal equivalente a "should be read".'},
 ],
 "15-65": [
  {t:'p', q:'We had been walking for three hours and the view was extraordinary. "It was worth it, ____?" I said, and everybody agreed. Nobody complained about the climb again.', o:["wasn't it",'was it','isn\'t it','didn\'t it'], a:0, why:'La coletilla repite el auxiliar en negativo: "It was..., wasn\'t it?".'},
  {t:'p', q:'The new timetable does not help anybody, least of all the students. You don\'t agree with it, ____? I have not met a single person who does.', o:['do you','don\'t you','are you','did you'], a:0, why:'Frase negativa: la coletilla va en afirmativo ("do you?").'},
 ],
 "16-68": [
  {t:'p', q:'My sister has always been the ambitious one in the family. She ____ two languages and started her own company before turning thirty. Now she is learning a third one.', o:['has learned','learned to','was learning','had learned'], a:0, why:'Logros vistos como parte de una vida que continúa: presente perfecto.'},
  {t:'p', q:'The team had an extraordinary season. They ____ the championship in 2018 and never repeated it. Most of those players have already retired.', o:['won','have won','had won','were winning'], a:0, why:'Con una fecha concreta y cerrada ("in 2018") va el pasado simple.'},
 ],
 "16-69": [
  {t:'p', q:'The course lasts three years and I started last September. By the summer of 2028 I ____ all the practical modules. Then I can apply for the licence.', o:['will have completed','will complete','will be completing','complete'], a:0, why:'"By + momento futuro" con acción ya terminada: futuro perfecto.'},
  {t:'p', q:'My grandfather sold the farm before I was born. I would like ____ it at least once. All I have are the photographs.', o:['to have seen','to see','seeing','have seen'], a:0, why:'"Would like to have + participio" habla de un deseo sobre algo ya imposible.'},
 ],
};
