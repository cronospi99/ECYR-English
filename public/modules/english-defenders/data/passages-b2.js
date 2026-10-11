// Text completions — Nivel B2 — English Defenders
// Autor: Teacher Esteban Yepes.
// Pasajes de 2 a 4 frases con un hueco. En B2 el contexto pesa más que la frase suelta:
// la opción correcta sólo se distingue leyendo todo el párrafo.
// Clave: "unidad-clase" según INT-ANX-005.

export const PASSAGES_B2 = {
 "1-3": [
  {t:'p', q:'She had been talking about that trip for years. Last month she finally quit ____ excuses and bought the ticket. She leaves in April.', o:['making','to make','make','made'], a:0, why:'"Quit" pertenece al grupo de verbos que se construyen con gerundio.'},
  {t:'p', q:'The neighbours complained about the noise every single weekend. In the end the bar owner denied ____ the rules and the case went to court. Nobody was surprised.', o:['breaking','to break','break','that break'], a:0, why:'"Deny" siempre va seguido de gerundio, nunca de infinitivo.'},
 ],
 "1-6": [
  {t:'p', q:'Everyone blames the traffic, the weather or bad luck. The truth is ____ we started the project far too late. Two extra weeks would have solved everything.', o:['that','what','which','if'], a:0, why:'"The truth is that + frase": cláusula nominal introducida por "that".'},
  {t:'p', q:'He never explains his decisions and that is the real problem. The question is ____ the team will follow him after this. Nobody has said anything openly yet.', o:['whether','that','what if','which'], a:0, why:'Cuando la duda es entre dos posibilidades, la cláusula nominal usa "whether".'},
 ],
 "2-10": [
  {t:'p', q:'The client was waiting in the lobby for forty minutes. Someone ____ him the meeting had been moved. Now we have to apologise in writing.', o:['should have told','should tell','must have told','had to tell'], a:0, why:'"Should have + participio" reprocha una obligación pasada que no se cumplió.'},
  {t:'p', q:'I got to the airport three hours early out of pure nerves. In the end I ____ hurry at all: the flight was delayed until midnight. I read an entire novel.', o:["didn't have to",'mustn\'t','shouldn\'t have','didn\'t must'], a:0, why:'"Didn\'t have to" = no fue necesario (no hubo obligación).'},
 ],
 "2-13": [
  {t:'p', q:'The lights went out at nine and the whole street was dark. It ____ have been a problem with the main cable, but nobody is sure. The company is still investigating.', o:['could','should','must not','will'], a:0, why:'"Could have + participio" plantea una explicación posible entre varias.'},
  {t:'p', q:'She has answered every message within a minute all week. She ____ be waiting for news about the job. I would be nervous too.', o:['must','can','should','would'], a:0, why:'Con evidencia clara, "must" expresa deducción lógica en presente.'},
 ],
 "3-17": [
  {t:'p', q:'Our office moved last year and the change was radical. The building ____ we work in now was a textile factory a century ago. You can still see the old machines in the hall.', o:['that','what','who','whose'], a:0, why:'Relativa especificativa referida a una cosa: "that" o "which" (aquí incluso omisible).'},
  {t:'p', q:'The prize went to a name nobody expected. Professor Ruiz, ____ research was ignored for decades, received it at eighty-one. She said the wait had been worth it.', o:['whose','who','which','that'], a:0, why:'"Whose" expresa posesión dentro de la relativa: la investigación de ella.'},
 ],
 "3-18": [
  {t:'p', q:'The flat was small but full of character. In the corner there was ____ table that had belonged to her grandmother. She refused to sell it.', o:['a beautiful old wooden','an old beautiful wooden','a wooden beautiful old','an old wooden beautiful'], a:0, why:'El orden habitual de los modificadores es opinión + edad + material.'},
  {t:'p', q:'The photograph on the wall was taken in 1962. It shows ____ men standing in front of the first factory. Two of them were my great-uncles.', o:['three tall young Italian','Italian three young tall','young three Italian tall','tall Italian three young'], a:0, why:'Primero el número, después tamaño y edad, y el origen justo antes del nombre.'},
 ],
 "3-20": [
  {t:'p', q:'The salary was excellent and the office was five minutes from my house. ____, I turned the job down, because the hours were impossible. My family comes first.', o:['Nevertheless','Therefore','Moreover','As a result'], a:0, why:'El texto contrasta ventajas con la decisión final: se necesita un conector de contraste.'},
  {t:'p', q:'Sales fell for three quarters in a row and two shops closed. ____, the company decided to change its whole strategy. The results should be visible next year.', o:['Consequently','However','Nevertheless','In spite of'], a:0, why:'Aquí la segunda frase es la consecuencia de la primera: "Consequently".'},
 ],
 "4-24": [
  {t:'p', q:'The letter had been in the drawer for years. ____ the envelope, she recognised her father\'s handwriting immediately. She read it twice before saying anything.', o:['On opening','On opened','By open','In open'], a:0, why:'Cláusula temporal reducida: "On + gerundio" equivale a "When she opened...".'},
  {t:'p', q:'The safety rules in the laboratory are strict for a reason. ____ these substances, always wear gloves and keep the window open. One mistake is enough.', o:['When handling','When handled','When handle','While to handle'], a:0, why:'La reducida conserva la conjunción y usa el gerundio: "When handling...".'},
 ],
 "4-25": [
  {t:'p', q:'The concert was cancelled two hours before it started. ____ the storm warning, the organisers preferred not to risk it. Tickets will be refunded next week.', o:['Given','Given that','Because','Since that'], a:0, why:'"Given + sustantivo" introduce la razón; "given that" iría con frase completa.'},
  {t:'p', q:'The library closes at six sharp during the winter. ____ you need to stay longer, ask for a key at the desk. Very few students do.', o:['In case','In case of','Unless that','Whether'], a:0, why:'"In case + frase" plantea una condición previsora.'},
 ],
 "4-27": [
  {t:'p', q:'The landlord finally agreed to the new contract. We can move in on the first of March ____ we pay two months in advance. That was his only condition.', o:['provided that','whether or not','now that','even that'], a:0, why:'"Provided that" introduce la condición imprescindible del acuerdo.'},
  {t:'p', q:'The board meets on Thursday and the decision is already made. The factory will close in June ____ the union accepts the offer. The only difference is the compensation.', o:['whether or not','provided that','now that','unless that'], a:0, why:'"Whether or not" indica que el resultado no depende de esa condición.'},
 ],
 "5-29": [
  {t:'p', q:'He spent three years preparing for that competition. He will always remember ____ the stage for the first time. The audience was completely silent.', o:['walking onto','to walk onto','walk onto','to walking onto'], a:0, why:'"Remember + gerundio" se refiere a un recuerdo del pasado; con infinitivo sería una tarea pendiente.'},
  {t:'p', q:'The house was freezing when we came back from holiday. I forgot ____ the heating on before we left. The pipes were fine, luckily.', o:['to leave','leaving','leave','having left'], a:0, why:'"Forget to + infinitivo" = olvidarse de hacer algo que había que hacer.'},
 ],
 "5-32": [
  {t:'p', q:'I met Andrés at the station on Friday and he looked exhausted. He said he ____ for two weeks without a single day off. I told him to talk to his manager.', o:['had been working','has been working','was working','worked'], a:0, why:'Al reportar, el presente perfecto continuo se transforma en pasado perfecto continuo.'},
  {t:'p', q:'The technician came on Tuesday and looked at the machine for an hour. He told us the problem ____ from the beginning. Nobody had noticed it before.', o:['had been there','has been there','is there','was being there'], a:0, why:'El presente perfecto del estilo directo pasa a pasado perfecto en el indirecto.'},
 ],
 "5-34": [
  {t:'p', q:'The doctor was very clear during the appointment. She said I ____ carry anything heavy for six weeks. My brother has been doing the shopping since then.', o:["shouldn't",'shouldn\'t have','mustn\'t have','won\'t'], a:0, why:'"Should" no cambia de forma en el estilo indirecto.'},
  {t:'p', q:'We asked about the delivery date twice before signing. They said the furniture ____ arrive before the end of the month. It is the fifteenth of the next one already.', o:['would','will','would have','was going'], a:0, why:'"Will" se convierte en "would" al reportar.'},
 ],
 "6-36": [
  {t:'p', q:'This company has changed a lot since I joined. I ____ here for eleven years and I have had four different managers. The last one is by far the best.', o:['have worked','worked','had worked','work'], a:0, why:'El periodo llega hasta el presente: presente perfecto.'},
  {t:'p', q:'My first job was in a bookshop in the old town. I ____ there for two summers while I was studying. The shop closed in 2015.', o:['worked','have worked','have been working','had worked'], a:0, why:'Periodo cerrado y terminado en el pasado: pasado simple.'},
 ],
 "6-37": [
  {t:'p', q:'Look at the state of this kitchen. I ____ bread all afternoon and there is flour everywhere. The first two loaves were a disaster.', o:['have been making','have made','made','am making'], a:0, why:'Lo relevante es la actividad prolongada y sus efectos visibles: presente perfecto continuo.'},
  {t:'p', q:'The shelf is finally up and the boxes are gone. I ____ three of them this morning, so there is space in the hall now. Only the books are left.', o:['have emptied','have been emptying','was emptying','empty'], a:0, why:'El foco está en el resultado y la cantidad terminada: presente perfecto simple.'},
 ],
 "6-39": [
  {t:'p', q:'I ran to the platform with the ticket in my hand. The train had ____ left when I arrived. The next one was in two hours.', o:['already','yet','still','ever'], a:0, why:'"Already" se coloca entre el auxiliar y el participio en frases afirmativas.'},
  {t:'p', q:'The results were supposed to be published on Monday. They had not appeared ____ when I checked on Wednesday night. Everyone in the group was nervous.', o:['yet','already','still','even'], a:0, why:'"Yet" cierra frases negativas: todavía no había ocurrido.'},
 ],
 "7-45": [
  {t:'p', q:'The road has been closed since Monday morning. A new bridge ____ over the river at the moment. Drivers have to take the old mountain route.', o:['is being built','is built','has built','is building'], a:0, why:'Pasiva del presente continuo: "is being + participio".'},
  {t:'p', q:'The security system was completely obsolete. All the locks ____ since the robbery in January. The insurance company demanded it.', o:['have been changed','are changed','have changed','were being changed'], a:0, why:'Pasiva del presente perfecto: "have been + participio", con "since" marcando el periodo.'},
 ],
 "7-48": [
  {t:'p', q:'Nobody in the department was told about the new schedule. It seems unfair, ____? Even the supervisors found out by email.', o:["doesn't it",'isn\'t it','does it','wasn\'t it'], a:0, why:'La coletilla repite el auxiliar de "seems": "doesn\'t it?".'},
  {t:'p', q:'You were at the meeting when they announced the merger. That ____ a shock for everyone in the room? I heard people stopped taking notes.', o:["wasn't it",'was it','isn\'t it','didn\'t it'], a:0, why:'Pregunta negativa para dar una opinión que se espera compartida: "Wasn\'t that a shock...?".'},
 ],
 "8-50": [
  {t:'p', q:'Two hundred people applied for the position. The candidates ____ for the second interview will hear from us on Friday. The others have already been informed.', o:['selected','selecting','who select','they selected'], a:0, why:'Relativa reducida en pasiva: "who were selected" → "selected".'},
  {t:'p', q:'The exhibition is in the east wing of the building. The paintings ____ from the private collection are the most valuable. They are only here for a month.', o:['coming','come','which come from','that they come'], a:0, why:'Relativa reducida en activa: "which come from" → "coming from".'},
 ],
 "8-55": [
  {t:'p', q:'They cancelled the whole programme with two days\' notice. ____ meant that forty families lost their places. The letters arrived after the deadline.', o:['This','Which','That which','What'], a:0, why:'"Which" no puede abrir una frase nueva: se retoma la idea anterior con "This".'},
  {t:'p', q:'She answered every question without looking at her notes, ____ impressed the whole committee. They offered her the position that afternoon. She accepted the next day.', o:['which','that','what','this'], a:0, why:'Dentro de la misma frase, "which" comenta toda la idea anterior.'},
 ],
 "9-59": [
  {t:'p', q:'The hotel was cheap, clean and very close to the beach. ____ the noise from the port, we would have stayed another week. We still recommend it.', o:['Except for','Except','Apart','Besides'], a:0, why:'"Except for + sustantivo" introduce la única excepción a una valoración positiva.'},
  {t:'p', q:'____ they had trained for months, the team lost in the first round. Nobody could explain what happened that afternoon. The coach resigned a week later.', o:['Even though','In spite of','Despite','However'], a:0, why:'"Even though + frase completa"; "despite/in spite of" pedirían sustantivo o gerundio.'},
 ],
 "9-60": [
  {t:'p', q:'Summers at my grandparents\' house followed the same pattern every year. After lunch my grandfather ____ sit on the porch and tell us the same three stories. We never got tired of them.', o:['would','used','was used to','did use'], a:0, why:'"Would + verbo base" describe acciones repetidas y típicas del pasado.'},
  {t:'p', q:'The village has changed completely in twenty years. There ____ be a cinema and two bakeries on the main street. Now there is only a supermarket.', o:['used to','would','was used to','use to'], a:0, why:'Con estados (no acciones repetidas) sólo funciona "used to", no "would".'},
 ],
 "9-62": [
  {t:'p', q:'We were looking at old photographs of the neighbourhood. "____ you use to play in this square?" my cousin asked. I had completely forgotten about it.', o:['Did','Do','Were','Would have'], a:0, why:'La pregunta se forma con "did + use to" (sin -d final).'},
  {t:'p', q:'My mother was describing her school years in the countryside. I asked her what she ____ do during the long winters. She said they read everything they could find.', o:['would','used','was used to','did used to'], a:0, why:'"Would + verbo base" pregunta por costumbres repetidas en el pasado.'},
 ],
 "10-66": [
  {t:'p', q:'The report explains the delay in detail, but nobody has read it. What surprised me most was ____ nobody had checked the figures. Two of the tables were wrong.', o:['that','what','which','it'], a:0, why:'Cláusula nominal como atributo del verbo "be": se introduce con "that".'},
  {t:'p', q:'The company hired three consultants in six months. The one ____ advice we followed was the only one who visited the factory. The results speak for themselves.', o:['whose','which','who','that'], a:0, why:'"Whose" marca la posesión: el consejo de esa persona.'},
 ],
 "10-69": [
  {t:'p', q:'The form was long and the instructions were confusing. I called the office to ask ____ the documents by email or by post. Nobody could give me a clear answer.', o:['whether to send','whether send','if to sending','that to send'], a:0, why:'Pregunta indirecta reducida: "whether + infinitivo con to".'},
  {t:'p', q:'She had been offered two jobs on the same day. She wanted to know ____ before the end of the week. I told her to sleep on it.', o:['which one she should accept','which one should she accept','which one to accepting','that which she accept'], a:0, why:'En la interrogativa indirecta el orden es sujeto + verbo, sin inversión.'},
 ],
 "11-73": [
  {t:'p', q:'The application closes on Friday and my portfolio is not ready. ____ I finish it tonight, I will lose the whole year. I have already cancelled my weekend plans.', o:['Unless','Only if','Even if','Provided'], a:0, why:'"Unless" equivale a "if not": si no lo termino, pierdo el año.'},
  {t:'p', q:'He has made the same promise three times and nothing has changed. ____ he apologised, I would not go back to that job. Some things cannot be fixed.', o:['Even if','Only if','Unless','Provided that'], a:0, why:'"Even if" indica que ni siquiera esa condición cambiaría el resultado.'},
 ],
 "11-76": [
  {t:'p', q:'I signed the lease without reading the fine print. I wish I ____ a lawyer before agreeing to those terms. Now I am stuck for two years.', o:['had consulted','consulted','would consult','have consulted'], a:0, why:'Arrepentimiento sobre el pasado: "wish + past perfect".'},
  {t:'p', q:'This flat faces a wall and the rooms are always dark. I wish it ____ more light in the mornings. On grey days I have to work with the lamp on.', o:['got','gets','would get','had got'], a:0, why:'Deseo sobre una situación presente: "wish + past simple".'},
 ],
 "12-80": [
  {t:'p', q:'The renovation started in March and it is going well. By the time you visit in July, we ____ the kitchen and both bathrooms. Only the garden will be left.', o:['will have finished','will finish','will be finishing','finish'], a:0, why:'Acción terminada antes de un momento futuro: futuro perfecto.'},
  {t:'p', q:'She started the company straight after university and never stopped. Next December she ____ it for twenty-five years. They are planning a big celebration.', o:['will have been running','will have run','will be running','will run'], a:0, why:'Duración continuada hasta un punto del futuro: futuro perfecto continuo.'},
 ],
 "12-83": [
  {t:'p', q:'I turned down that offer in Madrid three years ago. If I ____ it, I would be living abroad now. Sometimes I still think about it.', o:['had accepted','accepted','would accept','have accepted'], a:0, why:'Condicional mixto: causa pasada ("had accepted") con consecuencia presente.'},
  {t:'p', q:'He never listens to anybody, and that is his real problem. If he ____ a more patient person, he would not have lost so many clients last year. His talent is not in question.', o:['were','had been','is','would be'], a:0, why:'Condicional mixto inverso: condición presente permanente + consecuencia pasada.'},
 ],
};
