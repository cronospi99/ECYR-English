// Text completions — Nivel C1 — English Defenders
// Autor: Teacher Esteban Yepes.
// Pasajes de 2 a 4 frases con un hueco. En C1 es el formato predominante: registro,
// matiz y cohesión del párrafo deciden la respuesta tanto como la estructura.
// Clave: "unidad-clase" según INT-ANX-005.

export const PASSAGES_C1 = {
 "1-3": [
  {t:'p', q:'The negotiations had been going well until the last session. At the final meeting the other side ____ the whole agreement without explanation. Six months of work disappeared in an afternoon.', o:['backed out of','backed up','backed off to','backed down of'], a:0, why:'"Back out of something" = retirarse de un acuerdo ya cerrado.'},
  {t:'p', q:'Nobody expected the small publisher to survive the crisis. Somehow they ____ two very difficult years and are now profitable. Their catalogue is better than ever.', o:['got through','got over with','got by with','got round'], a:0, why:'"Get through something" = superar un periodo difícil.'},
 ],
 "1-6": [
  {t:'p', q:'He had rehearsed the speech a hundred times in his kitchen. He will never forget ____ in front of two thousand people that evening. His hands shook for the first minute.', o:['standing','to stand','stand','to standing'], a:0, why:'"Forget + gerundio" evoca el recuerdo de algo vivido; con infinitivo sería un olvido.'},
  {t:'p', q:'The department was drowning in paperwork and morale was low. They went on ____ the same procedures for another three years before anything changed. By then half the staff had left.', o:['using','to use','use','to using'], a:0, why:'"Go on + gerundio" = continuar con lo mismo; "go on to" sería pasar a otra cosa.'},
 ],
 "2-9": [
  {t:'p', q:'The board had already decided before the meeting began. They made the director ____ the resignation letter that same afternoon. He signed without arguing.', o:['sign','to sign','signing','signed'], a:0, why:'"Make somebody + verbo base" en activa, sin "to".'},
  {t:'p', q:'The evidence was thin and the witnesses contradicted each other. The lawyer advised her ____ anything until the second hearing. She followed the advice.', o:['not to say','to not say','not saying','not say'], a:0, why:'"Advise somebody not to + verbo": la negación precede al infinitivo.'},
 ],
 "2-12": [
  {t:'p', q:'The salary was never really the issue for her. ____ she wanted was the freedom to choose her own projects. The company could not offer that.', o:['What','That','Which','It'], a:0, why:'Frase escindida con "what": destaca el elemento importante como sujeto.'},
  {t:'p', q:'People assume the crisis was caused by the new management. In fact, ____ the collapse was a decision taken years earlier. The documents prove it.', o:['what triggered','which triggered','that triggered','it triggered'], a:0, why:'"What + verbo" abre la cleft sentence y funciona como sujeto de "was".'},
 ],
 "3-15": [
  {t:'p', q:'She was appointed last spring after a long selection process. She is now ____ head of the research unit. Her first decision was to double the budget.', o:['the','a','an','—'], a:0, why:'Con un cargo único dentro de una institución se usa el artículo definido.'},
  {t:'p', q:'His new book is not really about politics at all. It is ____ study of how families remember their own history. Critics have compared it to a novel.', o:['a','the','an','—'], a:0, why:'Primera mención, no identificada: artículo indefinido "a study".'},
 ],
 "3-18": [
  {t:'p', q:'The letter arrived on a Tuesday, twelve years after she had sent hers. ____ what it might contain, she left it on the table until the evening. Then she opened it in one movement.', o:['Not knowing','Not to know','Not known','Without know'], a:0, why:'Cláusula de -ing con valor causal; la negación va delante del gerundio.'},
  {t:'p', q:'The company had ignored every warning from its own engineers. ____ badly from the start, the project was abandoned after two years. The final cost was never published.', o:['Having been managed','Having managed','Being managing','Managed having'], a:0, why:'Participio perfecto pasivo: la mala gestión es anterior al abandono.'},
 ],
 "4-21": [
  {t:'p', q:'The minister spoke for less than four minutes and took no questions. He ____ that the figures had been misinterpreted by the press. Few journalists were convinced.', o:['maintained','told','said to','insisted to'], a:0, why:'"Maintain that + frase" introduce una afirmación sostenida frente a las dudas.'},
  {t:'p', q:'The report was returned twice before it was accepted. The committee ____ the authors of exaggerating their results. They rewrote the conclusions completely.', o:['accused','claimed','denied','admitted'], a:0, why:'"Accuse somebody of + gerundio" es el único patrón que encaja con la preposición.'},
 ],
 "4-24": [
  {t:'p', q:'The rumours started on Monday and spread through the whole company. It ____ that the factory would close before the summer. Management denied it on Friday.', o:['was rumoured','rumoured','has rumoured','was rumouring'], a:0, why:'Construcción impersonal en pasiva: "It was rumoured that...".'},
  {t:'p', q:'Nobody has seen the writer in public since 2011. She ____ to be living somewhere on the coast. Her publisher refuses to confirm anything.', o:['is believed','believes','has believed','is believing'], a:0, why:'Pasiva de reporte con infinitivo: "She is believed to be...".'},
 ],
 "5-27": [
  {t:'p', q:'We had prepared for the worst and cancelled two flights. ____, the storm changed direction and the airport reopened at noon. Everyone travelled the same day.', o:['Fortunately','Nevertheless','Otherwise','Admittedly'], a:0, why:'El adverbio de frase comenta el hecho como un golpe de suerte.'},
  {t:'p', q:'The design is elegant and the price is reasonable. ____, the battery lasts less than a working day, which for many buyers is decisive. That single detail explains the reviews.', o:['Admittedly','Therefore','Accordingly','Likewise'], a:0, why:'"Admittedly" concede un punto negativo dentro de una valoración favorable.'},
 ],
 "5-30": [
  {t:'p', q:'The queue went round the building and down two streets. There was ____ interest in the exhibition that the museum opened at seven in the morning. Even so, many people were turned away.', o:['such','so','so much of','such a'], a:0, why:'"Such + sustantivo incontable + that" (con adjetivo suelto sería "so").'},
  {t:'p', q:'The negotiations lasted eleven hours without a single break. The two sides were ____ far apart that a second meeting was pointless. The talks collapsed the next morning.', o:['so','such','such so','so much'], a:0, why:'"So + adjetivo/adverbio + that": aquí modifica a "far apart".'},
 ],
 "6-33": [
  {t:'p', q:'Every new version of the software adds another layer of menus. ____ the interface becomes, the fewer people actually use the advanced tools. Simplicity was never a priority.', o:['The more complex','More complex','The most complex','Complex more'], a:0, why:'Comparativo doble: "The + comparativo..., the + comparativo...".'},
  {t:'p', q:'He kept rewriting the same three chapters for a decade. The longer he worked on the book, ____ it seemed to him. He finally published it unfinished.', o:['the worse','worse','the worst','the more worse'], a:0, why:'La segunda parte de la estructura también lleva "the + comparativo": "the worse".'},
 ],
 "6-36": [
  {t:'p', q:'My father has followed the same routine for forty years. He ____ read the whole newspaper before anybody else is awake. Nothing interrupts it, not even holidays.', o:['will','would','is going to','used to'], a:0, why:'"Will" describe un hábito característico y previsible en el presente.'},
  {t:'p', q:'The house was cold and my grandmother refused to turn on the heating. She ____ sit by the window with a blanket and read until midnight. That image is my whole childhood.', o:['would','will','used','was going to'], a:0, why:'"Would" describe hábitos característicos del pasado en un relato.'},
 ],
 "7-39": [
  {t:'p', q:'The archive contains thousands of unpublished letters. The documents ____ we consulted last week had never been catalogued. Two of them changed the whole thesis.', o:['that','what','who','whose'], a:0, why:'Relativa de objeto: se puede usar "that/which" u omitir el pronombre.'},
  {t:'p', q:'Only three people had access to that floor of the building. The technician ____ discovered the fault was a temporary employee. His report was ignored for a month.', o:['who','which','whom','whose'], a:0, why:'El pronombre es sujeto de la relativa, así que no puede omitirse: "who/that".'},
 ],
 "7-42": [
  {t:'p', q:'He walked into the room and greeted everyone by name. He behaved ____ nothing had happened the previous evening. Nobody dared to mention it.', o:['as if','like of','as','the way that like'], a:0, why:'"As if + frase" introduce una comparación con una situación irreal.'},
  {t:'p', q:'The restaurant has not changed a single detail since 1978. They still make the sauce ____ the founder\'s mother did. That is the whole point of the place.', o:['the way','as if','like that','as though'], a:0, why:'"The way + frase" indica el modo real en que se hace algo.'},
 ],
 "8-45": [
  {t:'p', q:'The archive finally answered after three months of silence. They sent ____ a copy of the original manuscript. It arrived in a wooden box.', o:['her','to her','for her','at her'], a:0, why:'Objeto indirecto sin preposición cuando va delante del directo: "sent her a copy".'},
  {t:'p', q:'The lecture was long and the room was too warm. At the end she explained ____ why the second experiment had failed. It was the clearest part of the afternoon.', o:['to us','us','for us','at us'], a:0, why:'"Explain" exige siempre la preposición: "explain something to somebody".'},
 ],
 "8-48": [
  {t:'p', q:'The committee met in private for less than an hour. They recommended that the report ____ before publication. Two members voted against.', o:['be revised','is revised','was revised','will be revised'], a:0, why:'Tras "recommend that" el verbo va en subjuntivo: forma base, también en pasiva.'},
  {t:'p', q:'The situation in the laboratory had become untenable. It is essential that every technician ____ the new protocol before Monday. There will be no second training session.', o:['read','reads','will read','is reading'], a:0, why:'"It is essential that + sujeto + verbo base": subjuntivo, sin -s en tercera persona.'},
 ],
 "9-51": [
  {t:'p', q:'I have never been able to work in silence. ____ I sit down to write, I put the same album on. It has become a superstition.', o:['Whenever','When','Wherever','However'], a:0, why:'"Whenever" = cada vez que, sin excepción; "when" señalaría un momento concreto.'},
  {t:'p', q:'She has moved eleven times in fifteen years. ____ she goes, the first thing she unpacks is her grandmother\'s clock. Everything else can wait.', o:['Wherever','Where','Whenever','Whichever'], a:0, why:'"Wherever" = a cualquier lugar al que vaya, sin especificar.'},
 ],
 "9-54": [
  {t:'p', q:'The rules of the competition are unusually simple. ____ finishes the course first receives the whole prize. There is no second place.', o:['Whoever','Whomever','Whichever','Whatever'], a:0, why:'"Whoever" funciona como sujeto de la cláusula nominal.'},
  {t:'p', q:'She has stopped explaining her decisions to the family. ____ she chooses now, someone will criticise it. She has decided to accept that.', o:['Whatever','Whichever one','Whoever','However'], a:0, why:'"Whatever" es el objeto de "chooses" y engloba cualquier opción.'},
 ],
 "10-57": [
  {t:'p', q:'The painting had been hanging in a corridor for decades. It ____ to be a copy until a student noticed the signature. The museum has now insured it for millions.', o:['had been thought','had thought','has thought','was thinking'], a:0, why:'Pasiva en pasado perfecto: la creencia era anterior al descubrimiento.'},
  {t:'p', q:'The results will not be released before the end of the audit. All the samples ____ again next week by an independent laboratory. Only then will the report be published.', o:['will be analysed','will analyse','are analysing','will have analysed'], a:0, why:'Pasiva de futuro: "will be + participio".'},
 ],
 "10-60": [
  {t:'p', q:'The survey was sent to every department in the building. Each of the responses ____ carefully before the summary was written. The process took three weeks.', o:['was read','were read','have been read','are read'], a:0, why:'"Each of + plural" lleva el verbo en singular.'},
  {t:'p', q:'Half the building was empty when the inspection began. Half of the offices ____ still waiting for furniture. The move had been badly planned.', o:['were','was','has been','is'], a:0, why:'Con "half of + plural" el verbo concuerda con el sustantivo: plural.'},
 ],
 "11-63": [
  {t:'p', q:'The interview lasted twenty minutes and she said almost nothing. Her answers were polite but ____, which told us everything. We chose another candidate.', o:['carefully worded','careful worded','carefully word','worded carefully-'], a:0, why:'Adjetivo compuesto adverbio + participio: "carefully worded answers".'},
  {t:'p', q:'The village survives on tourism for three months a year. It is a ____ community with fewer than four hundred permanent residents. In February the streets are empty.', o:['tight-knit','tightly-knitted','tight-knitting','knit-tight'], a:0, why:'"Tight-knit" es el adjetivo compuesto fijo para una comunidad muy unida.'},
 ],
 "11-66": [
  {t:'p', q:'Three studios competed for the same weekend in December. It turned out to be the ____ release of the decade. The budget was larger than the previous two together.', o:['most eagerly awaited','most eager awaited','eagerliest awaited','more eagerly awaited'], a:0, why:'Superlativo de un compuesto con adverbio: "the most eagerly awaited".'},
  {t:'p', q:'The prize is decided by public vote every November. She has just become the ____ author in the history of the award. The previous record had stood for forty years.', o:['best-selling','most best-selling','best-sold','well-selling'], a:0, why:'"Best-selling" ya contiene el superlativo de "well": no admite "most".'},
 ],
 "12-69": [
  {t:'p', q:'The deadline is on Friday and half the data is missing. ____ we to postpone the launch, the sponsors would withdraw immediately. Nobody wants to make that call.', o:['Were','Was','If were','Had'], a:0, why:'Inversión formal del segundo condicional: "Were we to postpone..." = "If we were to postpone...".'},
  {t:'p', q:'The warning signs were in the first audit, but nobody read it. ____ the board acted then, the company would still exist today. The report was published four years too late.', o:['Had','If had','Would have','Should'], a:0, why:'Inversión del tercer condicional: "Had the board acted..." = "If the board had acted...".'},
 ],
 "12-72": [
  {t:'p', q:'The permit takes six weeks and the season starts in June. ____ the paperwork is submitted before April, the works can begin on time. Otherwise we lose the whole summer.', o:['As long as','As long','So long','In long as'], a:0, why:'"As long as + frase" expresa la condición necesaria.'},
  {t:'p', q:'The council will not fund a second study. They will approve the project ____ the neighbours withdraw their objections. That is the only remaining obstacle.', o:['on condition that','on condition','in condition that','with condition that'], a:0, why:'"On condition that + frase" introduce la condición formal de un acuerdo.'},
 ],
};
