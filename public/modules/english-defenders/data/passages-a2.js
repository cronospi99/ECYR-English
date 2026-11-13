// Text completions — Nivel A2 — English Defenders
// Autor: Teacher Esteban Yepes.
// Pasajes de 2 a 4 frases con un hueco: el alumno decide por CONTEXTO, no sólo por la regla.
// Marcados con t:'p' para que quiz.js los dosifique según el nivel (en A2 son ~1 de cada 3).
// Clave: "unidad-clase" según INT-ANX-005.

export const PASSAGES_A2 = {
 "1-1": [
  {t:'p', q:'Last Saturday my cousins came to visit. We ____ so happy to see them because they live very far away. In the afternoon we cooked together and told old family stories.', o:['were','was','are','did'], a:0, why:'El sujeto es "we" y el texto habla del sábado pasado: pasado de to be = "were".'},
  {t:'p', q:'The trip to the coast was terrible. Our bus ____ two hours late and it rained all morning. Still, the beach was beautiful when the sun finally came out.', o:['arrived','arrives','has arrived','arrive'], a:0, why:'Todo el relato está en pasado terminado: pasado simple regular "arrived".'},
 ],
 "1-2": [
  {t:'p', q:'When I was a child, my family lived in a small town. Every Sunday we ____ walk to my grandmother\'s house for lunch. Now we live in the city and we only see her twice a year.', o:['used to','use to','are used to','used'], a:0, why:'Hábito repetido en el pasado que ya no ocurre: "used to + verbo".'},
  {t:'p', q:'My father tells me that he ____ like vegetables when he was young. His mother had to hide them in the soup! Today he grows tomatoes and lettuce in the garden.', o:["didn't use to",'didn\'t used to','wasn\'t used to','not used to'], a:0, why:'En negativo se usa "didn\'t use to" (sin -d), porque "did" ya marca el pasado.'},
 ],
 "2-5": [
  {t:'p', q:'I opened the fridge to make dinner and found almost nothing. There were only ____ eggs and half a tomato. In the end I ordered a pizza.', o:['a few','a little','much','less'], a:0, why:'"Eggs" es contable plural, así que la cantidad pequeña se dice con "a few".'},
  {t:'p', q:'The recipe looked easy, but I made a mistake. I put too ____ salt in the soup and nobody could eat it. Next time I will measure everything.', o:['much','many','few','a lot'], a:0, why:'"Salt" es incontable: "too much salt".'},
 ],
 "2-6": [
  {t:'p', q:'I was completely lost in the old part of the city. I stopped a woman and asked her, "Could you tell me where the museum ____?" She smiled and pointed at the building right behind me.', o:['is','is it','does it be','it is'], a:0, why:'En preguntas indirectas se recupera el orden normal: sujeto + verbo ("the museum is").'},
  {t:'p', q:'The new student wanted to join the football team but he was shy. He came to me and asked if I ____ the coach. I said yes and took him to the office.', o:['knew','know','did know','knows'], a:0, why:'Tras "if" el orden es normal y el tiempo concuerda con el relato en pasado: "knew".'},
 ],
 "3-10": [
  {t:'p', q:'We visited two hotels before choosing one. The second was cheaper, but the rooms were not as ____ as the first one. We paid a bit more and slept very well.', o:['comfortable','more comfortable','comfortabler','most comfortable'], a:0, why:'La estructura "not as ... as" lleva el adjetivo en su forma base.'},
  {t:'p', q:'My old school was tiny. There were ____ students in the whole building than there are in one class here. That is why everybody knew everybody.', o:['fewer','less','fewest','little'], a:0, why:'"Students" es contable plural, así que la comparación usa "fewer than".'},
 ],
 "3-11": [
  {t:'p', q:'It is raining again and the match is cancelled. I wish the weather ____ better this weekend. We have been waiting a whole month to play.', o:['were','is','will be','has been'], a:0, why:'Tras "wish" el verbo va en pasado; con to be se prefiere "were" en todas las personas.'},
  {t:'p', q:'My cousin plays the guitar beautifully and sings at every party. I wish I ____ play an instrument too. Maybe I will start lessons next year.', o:['could','can','will can','would can'], a:0, why:'Un deseo sobre una habilidad que no se tiene: "I wish I could".'},
 ],
 "4-14": [
  {t:'p', q:'My sister is packing her bags again. She ____ to six countries already and she is only twenty-two. This time she is going to Peru.', o:['has travelled','travelled','travels','is travelling'], a:0, why:'Experiencia acumulada hasta hoy, sin fecha concreta: presente perfecto.'},
  {t:'p', q:'We had a wonderful holiday in Santa Marta. We ____ there in December and stayed for two weeks. The photos are still on my phone.', o:['went','have gone','have been','go'], a:0, why:'Hay un momento pasado concreto ("in December"): pasado simple.'},
 ],
 "4-15": [
  {t:'p', q:'Making arepas is easier than it looks. First, mix the flour with warm water and a little salt. ____, shape the dough with your hands and cook them until they are golden.', o:['Then','At the end','After','Finally then'], a:0, why:'"Then" enlaza el segundo paso de una secuencia.'},
  {t:'p', q:'The teacher explained the plan for the trip. First we will visit the old church, then we will have lunch in the square. ____, we will walk back to the bus at four o\'clock.', o:['Finally','First','Next of all','After that then'], a:0, why:'"Finally" marca el último paso de la secuencia.'},
 ],
 "5-19": [
  {t:'p', q:'Look at the sky! Those clouds are black and the wind is getting stronger. It ____ rain before we get home.', o:['is going to','will','goes to','would'], a:0, why:'Hay evidencia presente de lo que va a pasar: "be going to".'},
  {t:'p', q:'My bags are so heavy and the shop is still far away. — Don\'t worry, I ____ help you carry them.', o:["'ll",'am going to','was going to','would'], a:0, why:'Ofrecimiento decidido en el momento: "will".'},
 ],
 "5-20": [
  {t:'p', q:'The flight leaves at six in the morning. We ____ be at the airport two hours before, so we should sleep early tonight. I have already set two alarms.', o:['have to','should to','must to','need'], a:0, why:'Obligación que viene de una norma externa: "have to + verbo".'},
  {t:'p', q:'Your cough sounds terrible and you have had it for a week. You ____ see a doctor instead of taking more pills. I can go with you tomorrow.', o:['ought to','ought','should to','must to'], a:0, why:'"Ought to + verbo base" da un consejo firme.'},
 ],
 "6-23": [
  {t:'p', q:'The music was so loud that we could not talk at all. I asked my brother to ____ the volume a little. He did, and the evening got much better.', o:['turn down','turn down of','down turn','turn to down'], a:0, why:'"Turn down" (verbo de dos partes) = bajar el volumen.'},
  {t:'p', q:'My friend called me because her car broke down on the road. She asked me to pick her up. "Of course, I ____ be there in ten minutes," I said.', o:["'ll",'am','would','was going to'], a:0, why:'"Will" responde a una petición en el momento de aceptarla.'},
 ],
 "6-24": [
  {t:'p', q:'The library was silent and my phone rang twice. The girl next to me looked at me and said, "Would you mind ____ your phone off?" I apologised immediately.', o:['turning','to turn','turn','turned'], a:0, why:'Tras "Would you mind" el verbo va en gerundio.'},
  {t:'p', q:'It was very hot inside the classroom and nobody could concentrate. Ana raised her hand and asked, "Would you mind if I ____ the window?" The teacher said it was a great idea.', o:['opened','open','opening','to open'], a:0, why:'"Would you mind if I + pasado simple" es una petición de permiso muy cortés.'},
 ],
 "7-28": [
  {t:'p', q:'My grandmother keeps an old wooden box in the kitchen. It is used ____ spices and dry herbs. Everything inside smells wonderful.', o:['for storing','to storing','for store','store'], a:0, why:'"Be used for + gerundio" describe la función de un objeto.'},
  {t:'p', q:'I woke up very early on Saturday. I went to the market ____ fresh fruit for my mother. She was still asleep when I came back.', o:['to buy','for buy','for buying','buy'], a:0, why:'El propósito de una acción se expresa con infinitivo con "to".'},
 ],
 "7-29": [
  {t:'p', q:'You look really nervous about the interview. ____ deeply and answer slowly. They want to know you, not to test you.', o:['Breathe','To breathe','Breathing','You breathe to'], a:0, why:'Los consejos directos se dan en imperativo: verbo en forma base.'},
  {t:'p', q:'The trail up the mountain is long and the sun is strong. ____ forget to take water and a hat. You will need both after the first hour.', o:['Don\'t','No','Not','Doesn\'t'], a:0, why:'Imperativo negativo: "Don\'t + verbo base".'},
 ],
 "8-32": [
  {t:'p', q:'December is my favourite time of the year. It is the month ____ my whole family gets together. We cook for two days and nobody sleeps much.', o:['when','which','who','where'], a:0, why:'Relativa de tiempo sobre un mes: se introduce con "when".'},
  {t:'p', q:'I still remember the summer ____ we learned to swim. My father took us to the river every afternoon. By September, none of us was afraid of the water.', o:['when','what','who','which time'], a:0, why:'"When" acompaña a periodos de tiempo como "the summer".'},
 ],
 "8-33": [
  {t:'p', q:'My evenings are always the same. ____ I finish my homework, I help my mother in the kitchen. Then we watch a series together.', o:['After','During','Until','While after'], a:0, why:'"After + frase" indica que una acción sigue a la otra.'},
  {t:'p', q:'The train leaves at 7:15 and the station is far. Have breakfast ____ you leave, because there is nothing to eat on the way. I will wake you at six.', o:['before','after that','until','while before'], a:0, why:'"Before + frase" señala lo que ocurre antes.'},
 ],
 "9-37": [
  {t:'p', q:'Ten years ago my neighbourhood was very quiet and there were no shops. Today it ____ full of cafés and people. I like it, but I miss the silence.', o:['is','was','will be','has been'], a:0, why:'El contraste marca "today": presente simple.'},
  {t:'p', q:'I studied accounting and I worked in a bank for six years. Now I teach mathematics at a school. Next year I ____ start a master\'s degree in education.', o:['am going to','was going to','went to','go'], a:0, why:'Plan para el futuro: "be going to + verbo".'},
 ],
 "9-38": [
  {t:'p', q:'The picnic is on Sunday and the forecast is not good. If it ____, we will move everything to my uncle\'s garage. He already said yes.', o:['rains','will rain','rained','is raining'], a:0, why:'Primer condicional: tras "if" va el presente simple, nunca "will".'},
  {t:'p', q:'You have two weeks before the exam and the material is not difficult. If you study a little every day, you ____ without any problem. I can lend you my notes.', o:['will pass','pass will','would pass','passed'], a:0, why:'La consecuencia del primer condicional va con "will + verbo base".'},
 ],
 "10-41": [
  {t:'p', q:'My weekends are quiet and I like them that way. I enjoy ____ in the park with a book and a coffee. Sometimes I stay there for hours.', o:['sitting','to sit','sit','sat'], a:0, why:'Tras "enjoy" el verbo siempre va en gerundio.'},
  {t:'p', q:'My roommate cooks every night and I think that is fair. I don\'t mind ____ the dishes afterwards. It only takes ten minutes.', o:['washing','to wash','wash','washed'], a:0, why:'"Don\'t mind + gerundio" = no me molesta hacerlo.'},
 ],
 "10-42": [
  {t:'p', q:'I didn\'t go to the concert in the end. I stayed at home ____ I had a terrible headache. My friends sent me videos, which was nice.', o:['because','because of','so that','due'], a:0, why:'"Because" va seguido de una frase completa (sujeto + verbo).'},
  {t:'p', q:'Ana was smiling all morning and everybody noticed. She was happy ____ the university had accepted her application. She starts in August.', o:['because','because of','for','so'], a:0, why:'La causa se introduce con "because" + sujeto y verbo.'},
 ],
 "11-46": [
  {t:'p', q:'The old house on the corner has a long history. It ____ in 1902 by a Spanish architect. Today it is a small museum.', o:['was built','built','is built','has built'], a:0, why:'Pasiva en pasado: "was + participio".'},
  {t:'p', q:'Everyone knows the song, but few people know who wrote it. It was composed ____ a nineteen-year-old student in one afternoon. She never became famous.', o:['by','from','of','with'], a:0, why:'En la pasiva, el agente se introduce con "by".'},
 ],
 "11-47": [
  {t:'p', q:'Colombia is famous all over the world for its coffee. The best beans ____ high in the mountains, where the nights are cold. The harvest is done by hand.', o:['are grown','is grown','grow by','are growing'], a:0, why:'Sujeto plural en pasiva de presente: "are + participio".'},
  {t:'p', q:'This is a small family workshop, not a factory. Every pair of shoes ____ by hand and it takes two days. That is why they are expensive.', o:['is made','are made','makes','is making'], a:0, why:'"Every pair" es singular: "is made".'},
 ],
 "12-50": [
  {t:'p', q:'The storm started just after nine. I ____ dinner when the lights suddenly went out. We finished eating with candles on the table.', o:['was cooking','cooked','have cooked','cook'], a:0, why:'Acción en curso interrumpida por otra: pasado continuo + pasado simple.'},
  {t:'p', q:'It was a strange morning. While the children ____ in the garden, a huge bird landed on the roof. Nobody moved for a whole minute.', o:['were playing','played','play','have played'], a:0, why:'Tras "while" se usa el pasado continuo para el fondo de la escena.'},
 ],
 "12-51": [
  {t:'p', q:'My hands hurt and there is still paint everywhere. I ____ this room since eight this morning. I hope to finish before dinner.', o:['have been painting','painted','am painting','paint'], a:0, why:'Acción que empezó en el pasado y continúa: presente perfecto continuo.'},
  {t:'p', q:'The doctor is still with another patient. We have been waiting ____ almost two hours and nobody has told us anything. I am starting to lose my patience.', o:['for','since','during','ago'], a:0, why:'"For" acompaña a periodos de duración; "since" a un momento de inicio.'},
 ],
 "13-55": [
  {t:'p', q:'We spent the whole afternoon at the science museum. The exhibition about space was absolutely ____ and nobody wanted to leave. We are going back next month.', o:['fascinating','fascinated','fascinate','fascination'], a:0, why:'El participio en -ing describe la cosa que produce la emoción.'},
  {t:'p', q:'She studied for weeks and was sure about her answers. When the results came out, she was really ____ with her grade. Her teacher told her to try again in June.', o:['disappointed','disappointing','disappoint','disappointment'], a:0, why:'El participio en -ed describe cómo se siente la persona.'},
 ],
 "13-56": [
  {t:'p', q:'There is a woman at the door asking for you. She is the neighbour ____ helped us when the pipe broke last winter. I think she needs a favour.', o:['who','which','whose','what'], a:0, why:'"Who" introduce una relativa referida a personas.'},
  {t:'p', q:'I finally found it on the top shelf. It is the book ____ my grandfather gave me when I turned ten. I have read it four times.', o:['that','who','whom','what'], a:0, why:'Con cosas se usa "that" o "which".'},
 ],
 "14-59": [
  {t:'p', q:'I have called Marta three times and she never answers. She ____ be in the meeting she told me about. I will try again after lunch.', o:['might','can','would','should'], a:0, why:'"Might + verbo" expresa una posibilidad, no una certeza.'},
  {t:'p', q:'The car is in the garage and all the lights are on. They ____ be at home. Let\'s knock on the door.', o:['must','can\'t','might not','would'], a:0, why:'Con pruebas claras se deduce con "must".'},
 ],
 "14-60": [
  {t:'p', q:'The signs are everywhere in the corridor. You ____ use your phone inside the hospital rooms. Outside, in the garden, it is fine.', o:['mustn\'t','don\'t have to','shouldn\'t to','can to'], a:0, why:'"Mustn\'t" expresa prohibición.'},
  {t:'p', q:'Classes start at eight from Monday to Friday. On Saturdays we ____ get up early, so I usually sleep until ten. It is the best day of the week.', o:["don't have to",'mustn\'t','can\'t','shouldn\'t have'], a:0, why:'"Don\'t have to" = no es necesario, no está prohibido.'},
 ],
 "15-64": [
  {t:'p', q:'I love this city, but the rent is impossible. If I ____ more money, I would rent a flat near the centre. For now, I take the bus every morning.', o:['had','have','would have','will have'], a:0, why:'Condicional irreal: tras "if" va el pasado simple.'},
  {t:'p', q:'We spend all our holidays at home because of the car. If we had a bigger one, we ____ to the coast every summer. Maybe next year.', o:['would drive','will drive','drove','would drove'], a:0, why:'La consecuencia irreal lleva "would + verbo base".'},
 ],
 "15-65": [
  {t:'p', q:'I arrived at the station and the last train had already left. You ____ me the timetable had changed! Now I have to wait until morning.', o:['should have told','should tell','must have told','would tell'], a:0, why:'"Should have + participio" critica algo que no se hizo.'},
  {t:'p', q:'They invited me to the wedding and I said yes, but I felt terrible that morning. I ____ gone, but I could not even get out of bed. I sent flowers instead.', o:['would have','would','will have','had'], a:0, why:'"Would have + participio" describe algo que no llegó a ocurrir.'},
 ],
 "16-68": [
  {t:'p', q:'It was very cold and the windows were open all night. In the morning my mother asked me ____ them before going out. I forgot, of course.', o:['to close','close','closing','that I close'], a:0, why:'Petición reportada: "ask someone to + verbo".'},
  {t:'p', q:'The meeting was at nine and the manager was already annoyed. He told us ____ late again. Nobody was late after that.', o:['not to be','to not be','don\'t be','no be'], a:0, why:'En estilo indirecto el negativo se forma con "not to + verbo".'},
 ],
 "16-69": [
  {t:'p', q:'I called my brother yesterday and he sounded terrible. He said he ____ very tired because of his new job. He works ten hours a day.', o:['was','is','were','has been'], a:0, why:'Al reportar, el presente simple pasa a pasado simple.'},
  {t:'p', q:'The neighbours came to see the broken fence. They said they ____ us fix it on Saturday. So far nobody has appeared.', o:['would help','will help','would to help','helped'], a:0, why:'"Will" se transforma en "would" en el estilo indirecto.'},
 ],
};
