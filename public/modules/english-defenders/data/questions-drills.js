// Completion sentences — drills rápidos de gramática y vocabulario (A1–A2)
// Autor: Teacher Esteban Yepes. Se fusionan con los bancos base en quiz.js.
// Formato corto: una sola frase con un hueco. Es el formato dominante en A1 y sigue
// presente en A2, donde empieza a alternar con los "text completions" (data/passages-*.js).
// Clave: "unidad-clase" según INT-ANX-005. q=frase, o=opciones, a=índice correcto, why=explicación.

export const DRILLS = {
 A1: {
  "1-1": [
   {q:'I ____ twelve years old.', o:['am','is','are','be'], a:0, why:'Con "I" el verbo to be es siempre "am".'},
   {q:'____ old is your brother?', o:['How','What','Who','Where'], a:0, why:'"How old...?" pregunta por la edad.'},
  ],
  "1-2": [
   {q:'Am I late? — No, you ____.', o:["aren't","isn't","amn't","don't"], a:0, why:'La respuesta a "Am I...?" usa "you aren\'t".'},
   {q:'Is this your bag? — Yes, ____ is.', o:['it','this','that','they'], a:0, why:'En la respuesta corta el objeto se sustituye por "it".'},
  ],
  "2-5": [
   {q:'Why ____ your sister study English?', o:['does','do','is','are'], a:0, why:'"Your sister" = she: el auxiliar es "does".'},
   {q:'She ____ to the gym every Friday.', o:['goes','go','gos','going'], a:0, why:'Verbos en -o añaden -es: "goes".'},
  ],
  "2-6": [
   {q:'The shop closes ____ 8 p.m.', o:['at','in','on','from'], a:0, why:'Con horas exactas siempre "at".'},
   {q:'I do my homework ____ dinner, never before.', o:['after','until','around','on'], a:0, why:'"After" = después de.'},
  ],
  "3-10": [
   {q:'____ apples in my hand are green.', o:['These','This','That','Those'], a:0, why:'Plural + cerca = "these".'},
   {q:'Do you see ____ mountains far away?', o:['those','these','this','that'], a:0, why:'Plural + lejos = "those".'},
  ],
  "3-11": [
   {q:'This exercise is ____ difficult than the last one.', o:['more','most','much','many'], a:0, why:'Adjetivo largo: "more difficult than".'},
   {q:'My bag is ____ than yours.', o:['heavier','more heavy','heaviest','heavy'], a:0, why:'Adjetivo corto en -y: y → i + -er ("heavier").'},
  ],
  "4-14": [
   {q:'I like Ana. I see ____ every day at school.', o:['her','she','hers','him'], a:0, why:'Como objeto del verbo, "she" se convierte en "her".'},
   {q:'These books are for you and me. Take ____ home.', o:['them','they','it','us'], a:0, why:'"Books" es plural: el pronombre objeto es "them".'},
  ],
  "4-15": [
   {q:'____ you like some water?', o:['Would','Do','Are','Will'], a:0, why:'Ofrecimientos corteses: "Would you like...?".'},
   {q:'Would you like a coffee? — Yes, ____.', o:['please','I do','I would like','thanks you'], a:0, why:'Aceptar una oferta: "Yes, please."'},
  ],
  "5-19": [
   {q:'What ____ your cousins doing right now?', o:['are','is','do','does'], a:0, why:'Presente continuo con plural: "are + -ing".'},
   {q:'My mother\'s brother is my ____.', o:['uncle','nephew','cousin','son'], a:0, why:'El hermano de la madre es el tío ("uncle").'},
  ],
  "5-20": [
   {q:'____ all my classmates passed the test — only one failed.', o:['Nearly','No one','Few','Not many'], a:0, why:'"Nearly all" = casi todos.'},
   {q:'____ came to the party. It was empty!', o:['No one','A lot of','Many','All'], a:0, why:'"No one" = nadie.'},
  ],
  "6-23": [
   {q:'I ____ eat breakfast. It is my favourite meal.', o:['always','never','hardly ever','not'], a:0, why:'"Always" (100 %) encaja con una comida favorita.'},
   {q:'She is ____ late for class.', o:['hardly ever','ever hardly','never not','always never'], a:0, why:'"Hardly ever" = casi nunca; va después del verbo to be.'},
  ],
  "6-24": [
   {q:'____ often do you play football?', o:['How','What','When','Where'], a:0, why:'"How often...?" pregunta por la frecuencia.'},
   {q:'How ____ do you sleep? — About eight hours.', o:['long','far','many','much'], a:0, why:'"How long...?" pregunta por la duración.'},
  ],
  "7-28": [
   {q:'They ____ a movie last night.', o:['watched','watch','watches','watching'], a:0, why:'Pasado simple regular: verbo + -ed.'},
   {q:'____ you finish your homework yesterday?', o:['Did','Do','Was','Were'], a:0, why:'Preguntas en pasado con verbos ordinarios: auxiliar "did".'},
  ],
  "7-29": [
   {q:'We ____ at the beach last weekend.', o:['were','was','are','did'], a:0, why:'Con "we" el pasado de to be es "were".'},
   {q:'The film ____ boring, so I left.', o:['was','were','did','is'], a:0, why:'Sujeto singular en pasado: "was".'},
  ],
  "8-32": [
   {q:'There ____ two chairs in the kitchen.', o:['are','is','be','has'], a:0, why:'Plural ("two chairs") pide "there are".'},
   {q:'The bank is ____ the supermarket, on the other side of the street.', o:['across from','on','in','behind'], a:0, why:'"Across from" = enfrente de, al otro lado.'},
  ],
  "8-33": [
   {q:'How ____ sugar do you want?', o:['much','many','lot','few'], a:0, why:'"Sugar" es incontable: "how much".'},
   {q:'There are only a ____ eggs left.', o:['few','little','much','lot'], a:0, why:'"A few" acompaña a contables plurales.'},
  ],
  "9-37": [
   {q:'What ____ your teacher look like?', o:['does','is','do','has'], a:0, why:'Descripción física: "What does ... look like?".'},
   {q:'My father is not short; he is quite ____.', o:['tall','young','thin','old'], a:0, why:'El contrario de "short" (estatura) es "tall".'},
  ],
  "9-38": [
   {q:'Which one is she? — The girl ____ a red jacket.', o:['wearing','wears','wear','wore'], a:0, why:'Modificador con participio presente: "the girl wearing...".'},
   {q:'That is my brother, the boy ____ next to the door.', o:['standing','stands','stand','stood'], a:0, why:'"Standing" describe al chico sin necesidad de "who is".'},
  ],
  "10-41": [
   {q:'I have ____ finished my project.', o:['already','yet','still','ever'], a:0, why:'"Already" en afirmativas: algo ya está hecho.'},
   {q:'She hasn\'t called me ____.', o:['yet','already','never','still'], a:0, why:'"Yet" cierra frases negativas: todavía no.'},
  ],
  "10-42": [
   {q:'I ____ to Cartagena in 2019.', o:['went','have gone','have been','go'], a:0, why:'Con un tiempo pasado concreto (2019) va el pasado simple.'},
   {q:'She ____ never eaten sushi.', o:['has','did','was','is'], a:0, why:'Experiencias sin fecha: presente perfecto "has never eaten".'},
  ],
  "11-46": [
   {q:'The exam was ____ easy.', o:['really','real','much','very much'], a:0, why:'Antes de un adjetivo va el adverbio "really", no "real".'},
   {q:'I was tired, ____ I finished the work.', o:['but','so','because','and then'], a:0, why:'"But" une dos ideas que contrastan.'},
  ],
  "11-47": [
   {q:'You ____ drink more water. It is good for you.', o:['should','can','must not','would'], a:0, why:'"Should" da un consejo.'},
   {q:'____ you swim? — Yes, a little.', o:['Can','Should','Would','Do'], a:0, why:'"Can" pregunta por una habilidad.'},
  ],
  "12-50": [
   {q:'It is a good idea ____ early.', o:['to arrive','arrive','arriving','arrived'], a:0, why:'Tras "It is a good idea" va infinitivo con "to".'},
   {q:'Try ____ more vegetables.', o:['to eat','eat','eating to','ate'], a:0, why:'"Try to + verbo" para recomendar.'},
  ],
  "12-51": [
   {q:'____ you help me with this box, please?', o:['Could','Should','Do','Must'], a:0, why:'"Could you...?" es una petición cortés.'},
   {q:'____ we go to the cinema tonight?', o:['Should','Can I','Would you mind','Do'], a:0, why:'"Should we...?" propone un plan a los dos.'},
  ],
  "13-55": [
   {q:'I love pizza. — ____ do I.', o:['So','Too','Neither','Either'], a:0, why:'Acuerdo en afirmativo: "So do I."'},
   {q:'I don\'t like horror films. — ____ do I.', o:['Neither','So','Too','Either'], a:0, why:'Acuerdo en negativo: "Neither do I."'},
  ],
  "13-56": [
   {q:'____ you open the window, please?', o:['Would','Do','Are','Should'], a:0, why:'"Would you...?" pide algo de forma cortés.'},
   {q:'Would you pass me the salt? — Sure, ____.', o:['here you are','here you have','take it you','you are here'], a:0, why:'"Here you are" se dice al entregar algo.'},
  ],
  "14-59": [
   {q:'The Amazon is the ____ river in South America.', o:['longest','longer','most long','long'], a:0, why:'Superlativo de adjetivo corto: "the longest".'},
   {q:'A very dry place with sand is a ____.', o:['desert','forest','valley','lake'], a:0, why:'"Desert" = desierto.'},
  ],
  "14-60": [
   {q:'How ____ is that building? — About 40 metres.', o:['tall','long','deep','far'], a:0, why:'"How tall" para la altura de personas y edificios.'},
   {q:'How ____ is the lake? — Twelve metres.', o:['deep','high','long','hot'], a:0, why:'"How deep" pregunta por la profundidad.'},
  ],
  "15-64": [
   {q:'We ____ going to visit my grandmother on Sunday.', o:['are','is','be','will'], a:0, why:'"We are going to + verbo" para un plan.'},
   {q:'I ____ meeting Ana at six tonight.', o:['am','will','do','go'], a:0, why:'Presente continuo para citas ya acordadas: "I am meeting".'},
  ],
  "15-65": [
   {q:'Can you ____ him I called?', o:['tell','say','say to','tell to'], a:0, why:'"Tell + persona": tell him.'},
   {q:'She didn\'t ____ anything about the party.', o:['say','tell','told','speak'], a:0, why:'"Say + algo" sin persona: "say anything".'},
  ],
  "16-68": [
   {q:'The town is much ____ than it was ten years ago.', o:['busier','busy','busiest','more busy'], a:0, why:'Adjetivo en -y: "busier than".'},
   {q:'They ____ a new stadium last year.', o:['built','have built','build','building'], a:0, why:'Momento pasado concreto ("last year"): pasado simple.'},
  ],
  "16-69": [
   {q:'She hopes ____ a doctor.', o:['to be','be','being','is'], a:0, why:'"Hope to + verbo" para un deseo futuro.'},
   {q:'We would ____ to visit Japan.', o:['like','want','hope','going'], a:0, why:'"Would like to + verbo" = nos gustaría.'},
  ],
 },
 A2: {
  "1-1": [
   {q:'The concert ____ amazing last night.', o:['was','were','is','did'], a:0, why:'Sujeto singular en pasado: "was".'},
   {q:'They ____ arrive until midnight.', o:["didn't",'weren\'t','not','doesn\'t'], a:0, why:'Negativo en pasado con verbo ordinario: "didn\'t arrive".'},
  ],
  "1-2": [
   {q:'I ____ play tennis, but I stopped last year.', o:['used to','use to','am used to','was used'], a:0, why:'Hábito pasado: "used to + verbo".'},
   {q:'____ you use to live in Cali?', o:['Did','Do','Were','Have'], a:0, why:'En preguntas se usa "did + use to" (sin -d).'},
  ],
  "2-5": [
   {q:'There isn\'t ____ milk in the fridge.', o:['much','many','a few','several'], a:0, why:'"Milk" es incontable: "much" en negativas.'},
   {q:'We only have ____ minutes before the bus leaves.', o:['a few','a little','much','less'], a:0, why:'"A few" con contables plurales.'},
  ],
  "2-6": [
   {q:'Could you tell me where ____?', o:['the station is','is the station','the station','does the station'], a:0, why:'En preguntas indirectas el orden es sujeto + verbo.'},
   {q:'Do you know if she ____ Spanish?', o:['speaks','does speak','speak','is speak'], a:0, why:'Tras "if" la frase mantiene el orden normal: "she speaks".'},
  ],
  "3-10": [
   {q:'This hotel is not as ____ as the other one.', o:['expensive','more expensive','expensiver','most expensive'], a:0, why:'"Not as + adjetivo base + as" para comparar.'},
   {q:'My flat has ____ rooms than yours.', o:['fewer','less','fewest','little'], a:0, why:'"Fewer" con nombres contables ("rooms").'},
  ],
  "3-11": [
   {q:'I wish I ____ more free time.', o:['had','have','has','having'], a:0, why:'Tras "I wish" el verbo va en pasado: "had".'},
   {q:'She wishes she ____ swim.', o:['could','can','will','would can'], a:0, why:'Deseo sobre una habilidad: "could".'},
  ],
  "4-14": [
   {q:'I ____ that film three times.', o:['have seen','saw','see','had seen'], a:0, why:'Experiencia acumulada hasta ahora: presente perfecto.'},
   {q:'We ____ the museum yesterday morning.', o:['visited','have visited','visit','has visited'], a:0, why:'"Yesterday" marca un pasado terminado: pasado simple.'},
  ],
  "4-15": [
   {q:'____, add the eggs and mix everything.', o:['After that','At last time','Finally then','In first'], a:0, why:'"After that" enlaza el paso siguiente.'},
   {q:'____, bake the cake for 30 minutes.', o:['Finally','First','Then after','Next of all'], a:0, why:'"Finally" cierra la secuencia de pasos.'},
  ],
  "5-19": [
   {q:'Look at those clouds — it ____ rain.', o:['is going to','will','goes to','would'], a:0, why:'Con evidencia presente se usa "be going to".'},
   {q:'The phone is ringing. I ____ answer it.', o:["'ll",'am going to','would','was going to'], a:0, why:'Decisión espontánea: "will".'},
  ],
  "5-20": [
   {q:'You ____ take your passport to the airport.', o:['have to','should to','must to','need'], a:0, why:'Obligación externa: "have to + verbo".'},
   {q:'You ____ book the tickets early. Prices go up.', o:['ought to','ought','should to','must to'], a:0, why:'"Ought to + verbo" es un consejo.'},
  ],
  "6-23": [
   {q:'I can\'t hear you. Could you ____ the TV?', o:['turn down','turn off down','down turn','turn to down'], a:0, why:'"Turn down" = bajar el volumen.'},
   {q:'Can you pick me up at seven? — Sure, I ____.', o:['will','do','am','would'], a:0, why:'"Will" acepta una petición en el momento.'},
  ],
  "6-24": [
   {q:'Would you mind ____ the door?', o:['closing','to close','close','closed'], a:0, why:'Tras "would you mind" va gerundio.'},
   {q:'Would you mind if I ____ the window?', o:['opened','open','opening','to open'], a:0, why:'"Would you mind if I + pasado" para pedir permiso.'},
  ],
  "7-28": [
   {q:'A corkscrew is used ____ bottles.', o:['for opening','to opening','for open','open'], a:0, why:'"Used for + gerundio" describe el uso de un objeto.'},
   {q:'I went to the shop ____ some bread.', o:['to buy','for buy','for buying','buy'], a:0, why:'Propósito de una acción: infinitivo con "to".'},
  ],
  "7-29": [
   {q:'____ down and relax for a moment.', o:['Sit','To sit','Sitting','You sit to'], a:0, why:'Un consejo directo se da en imperativo: "Sit down".'},
   {q:'Don\'t ____ to lock the door.', o:['forget','forgetting','forgot','to forget'], a:0, why:'Imperativo negativo: "Don\'t + verbo base".'},
  ],
  "8-32": [
   {q:'Summer is the season ____ we go to the coast.', o:['when','which','who','where'], a:0, why:'"When" introduce una relativa de tiempo.'},
   {q:'December is the month ____ everyone travels.', o:['when','that when','who','what'], a:0, why:'Con periodos de tiempo se usa "when".'},
  ],
  "8-33": [
   {q:'____ I finish work, I will call you.', o:['After','During','While after','Until'], a:0, why:'"After + frase" indica que una acción sigue a otra.'},
   {q:'Brush your teeth ____ you go to bed.', o:['before','after that','until','while before'], a:0, why:'"Before" = antes de que.'},
  ],
  "9-37": [
   {q:'Ten years ago I lived in Pasto, but now I ____ in Bogotá.', o:['live','lived','am living to','will live'], a:0, why:'Presente simple para la situación actual.'},
   {q:'Next year they ____ move to a bigger house.', o:['are going to','were going to','went to','go'], a:0, why:'Plan futuro: "are going to move".'},
  ],
  "9-38": [
   {q:'If it rains, we ____ at home.', o:['will stay','stay will','would stay','stayed'], a:0, why:'Primer condicional: "if + presente, will + verbo".'},
   {q:'If you ____ hard, you will pass.', o:['study','will study','studied','are studying'], a:0, why:'Tras "if" va el presente simple, nunca "will".'},
  ],
  "10-41": [
   {q:'I enjoy ____ to music before I sleep.', o:['listening','to listen','listen','listened'], a:0, why:'Tras "enjoy" siempre va gerundio.'},
   {q:'I don\'t mind ____ the dishes.', o:['washing','to wash','wash','washed'], a:0, why:'"Don\'t mind + gerundio" = no me importa hacerlo.'},
  ],
  "10-42": [
   {q:'I stayed home ____ I felt sick.', o:['because','because of','so that','due'], a:0, why:'"Because + frase completa" (sujeto + verbo).'},
   {q:'She was happy ____ she got the job.', o:['because','because of','for','so'], a:0, why:'"Because" introduce la causa.'},
  ],
  "11-46": [
   {q:'The letter ____ by my grandfather in 1950.', o:['was written','wrote','is written','has written'], a:0, why:'Pasiva en pasado: "was + participio".'},
   {q:'The song was composed ____ a young student.', o:['by','from','of','with'], a:0, why:'"By" introduce al agente en la pasiva.'},
  ],
  "11-47": [
   {q:'Coffee ____ in many countries.', o:['is grown','grows by','is growing','grew'], a:0, why:'Pasiva en presente sin agente: "is grown".'},
   {q:'These shoes ____ in Italy.', o:['are made','is made','make','are making'], a:0, why:'Sujeto plural: "are made".'},
  ],
  "12-50": [
   {q:'I ____ TV when the lights went out.', o:['was watching','watched','have watched','watch'], a:0, why:'Acción en curso interrumpida: pasado continuo.'},
   {q:'While she ____, the phone rang.', o:['was cooking','cooked','cooks','has cooked'], a:0, why:'Tras "while" suele ir el pasado continuo.'},
  ],
  "12-51": [
   {q:'I ____ English for three years.', o:['have been studying','study','am studying','studied'], a:0, why:'Acción que empezó antes y sigue: presente perfecto continuo.'},
   {q:'They have been waiting ____ two hours.', o:['for','since','during','ago'], a:0, why:'"For" con periodos de duración.'},
  ],
  "13-55": [
   {q:'The trip was ____. I want to go again.', o:['exciting','excited','excite','excitement'], a:0, why:'El participio en -ing describe la cosa que causa la emoción.'},
   {q:'She was ____ with her exam results.', o:['disappointed','disappointing','disappoint','disappointment'], a:0, why:'El participio en -ed describe cómo se siente la persona.'},
  ],
  "13-56": [
   {q:'That is the man ____ helped us.', o:['who','which','whose','what'], a:0, why:'"Who" se refiere a personas.'},
   {q:'This is the book ____ changed my mind.', o:['that','who','whom','what'], a:0, why:'"That" o "which" se refieren a cosas.'},
  ],
  "14-59": [
   {q:'She isn\'t answering. She ____ be asleep.', o:['might','can','would','should'], a:0, why:'"Might" expresa una posibilidad.'},
   {q:'The lights are on, so they ____ be home.', o:['must','might not','can\'t','could not'], a:0, why:'"Must" expresa una deducción casi segura.'},
  ],
  "14-60": [
   {q:'You ____ smoke in the hospital.', o:['mustn\'t','don\'t have to','shouldn\'t to','can to'], a:0, why:'"Mustn\'t" = prohibición.'},
   {q:'It is Saturday, so we ____ get up early.', o:["don't have to",'mustn\'t','can\'t','shouldn\'t have'], a:0, why:'"Don\'t have to" = no es necesario (no está prohibido).'},
  ],
  "15-64": [
   {q:'If I ____ rich, I would travel the world.', o:['were','am','will be','have been'], a:0, why:'Condicional irreal: "if + past simple" ("were" para todas las personas).'},
   {q:'If we had a car, we ____ to the beach.', o:['would drive','will drive','drove','would drove'], a:0, why:'La otra parte lleva "would + verbo base".'},
  ],
  "15-65": [
   {q:'You ____ told me earlier!', o:['should have','should','must to have','would had'], a:0, why:'"Should have + participio" critica algo que no se hizo.'},
   {q:'I ____ gone, but I was too tired.', o:['would have','would','will have','had'], a:0, why:'"Would have + participio" para algo que no llegó a pasar.'},
  ],
  "16-68": [
   {q:'He asked me ____ the window.', o:['to close','close','closing','that I close'], a:0, why:'Petición reportada: "ask someone to + verbo".'},
   {q:'She told us ____ late.', o:['not to be','to not be','don\'t be','no be'], a:0, why:'Negativo en estilo indirecto: "not to + verbo".'},
  ],
  "16-69": [
   {q:'"I am tired." → He said he ____ tired.', o:['was','is','were','has been'], a:0, why:'En estilo indirecto el presente pasa a pasado.'},
   {q:'"We will help." → They said they ____ help.', o:['would','will','would to','had'], a:0, why:'"Will" se convierte en "would".'},
  ],
 },
};
