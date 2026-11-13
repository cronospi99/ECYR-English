// Banco de VOCABULARIO por nivel CEFR — English Defenders
// Autor: Teacher Esteban Yepes.
//
// A diferencia de los bancos de gramática (que se indexan por "unidad-clase" del
// programa INT-ANX-005), el vocabulario se agrupa en SETS temáticos y cada set se
// ancla a una unidad del nivel. Así el mismo mecanismo de "unidad actual + repaso
// de unidades anteriores" que ya usa el juego sirve también para el vocabulario.
//
// Formato de cada ítem, idéntico al de las preguntas: q=enunciado, o=opciones,
// a=índice de la correcta, why=explicación en español.
export const VOCAB = {

  /* ============================ A1 ============================ */
  A1: [
    { unit: 1, topic: 'Vocabulary · Family and people', items: [
      {q:'My mother\'s mother is my ____.', o:['grandmother','aunt','sister','cousin'], a:0, why:'"Grandmother" = abuela. "Aunt" es tía y "cousin", prima/o.'},
      {q:'My father\'s brother is my ____.', o:['uncle','nephew','grandfather','son'], a:0, why:'"Uncle" = tío. "Nephew" es sobrino.'},
      {q:'My parents\' daughter is my ____.', o:['sister','mother','niece','wife'], a:0, why:'La hija de tus padres es tu hermana: "sister".'},
      {q:'A boy who is not married is ____.', o:['single','married','divorced','widowed'], a:0, why:'"Single" = soltero. "Married" es casado.'},
      {q:'My best ____ is called Daniel. We study together.', o:['friend','family','neighbour','teacher'], a:0, why:'"Friend" = amigo. "Neighbour" es vecino.'},
    ]},
    { unit: 3, topic: 'Vocabulary · Colours and numbers', items: [
      {q:'The sky on a clear day is ____.', o:['blue','brown','purple','grey'], a:0, why:'"Blue" = azul. "Grey" (gris) sería un día nublado.'},
      {q:'Bananas are usually ____.', o:['yellow','black','blue','pink'], a:0, why:'"Yellow" = amarillo.'},
      {q:'Ten plus five is ____.', o:['fifteen','fifty','five','fourteen'], a:0, why:'15 = "fifteen". Ojo: "fifty" es 50.'},
      {q:'The number after twenty-nine is ____.', o:['thirty','twenty-ten','thirteen','forty'], a:0, why:'Después de 29 viene 30 = "thirty".'},
      {q:'Grass and leaves are ____.', o:['green','orange','white','red'], a:0, why:'"Green" = verde.'},
    ]},
    { unit: 5, topic: 'Vocabulary · The classroom', items: [
      {q:'You write in your ____.', o:['notebook','window','chair','floor'], a:0, why:'"Notebook" = cuaderno.'},
      {q:'The teacher writes on the ____.', o:['board','desk','bag','door'], a:0, why:'"Board" = pizarra. "Desk" es el pupitre.'},
      {q:'I keep my books in my ____.', o:['backpack','shoe','plate','cup'], a:0, why:'"Backpack" = mochila.'},
      {q:'Use a ____ to make your drawing colourful.', o:['pencil','spoon','towel','key'], a:0, why:'"Pencil" = lápiz. "Spoon" es cuchara.'},
      {q:'Please open your books on ____ twelve.', o:['page','paper','line','letter'], a:0, why:'"Page" = página.'},
    ]},
    { unit: 7, topic: 'Vocabulary · Food and drink', items: [
      {q:'I drink a glass of ____ with breakfast.', o:['milk','bread','rice','cheese'], a:0, why:'"Milk" = leche; es lo único que se bebe de la lista.'},
      {q:'An ____ is a red or green fruit.', o:['apple','onion','egg','oil'], a:0, why:'"Apple" = manzana. "Onion" (cebolla) es una verdura.'},
      {q:'We eat soup with a ____.', o:['spoon','fork','knife','plate'], a:0, why:'"Spoon" = cuchara. Con "fork" (tenedor) no se toma sopa.'},
      {q:'____ is very sweet. Be careful with your teeth!', o:['Sugar','Salt','Pepper','Lemon'], a:0, why:'"Sugar" = azúcar. "Salt" es sal.'},
      {q:'I\'m hungry. Let\'s have ____ at one o\'clock.', o:['lunch','breakfast','dinner','supper'], a:0, why:'A la una del mediodía se almuerza: "lunch".'},
    ]},
    { unit: 9, topic: 'Vocabulary · Clothes', items: [
      {q:'When it is cold, I wear a ____.', o:['coat','swimsuit','sandal','cap'], a:0, why:'"Coat" = abrigo.'},
      {q:'You wear ____ on your feet.', o:['shoes','gloves','hats','belts'], a:0, why:'"Shoes" = zapatos. "Gloves" son guantes (manos).'},
      {q:'My jeans are a kind of ____.', o:['trousers','shirt','jacket','sock'], a:0, why:'Los jeans son pantalones: "trousers" (UK) o "pants" (US).'},
      {q:'She wears a ____ and a blouse to work.', o:['skirt','soup','floor','clock'], a:0, why:'"Skirt" = falda.'},
      {q:'It\'s raining. Take your ____.', o:['umbrella','sunglasses','towel','fan'], a:0, why:'"Umbrella" = paraguas.'},
    ]},
    { unit: 11, topic: 'Vocabulary · The house', items: [
      {q:'We cook in the ____.', o:['kitchen','bedroom','garage','garden'], a:0, why:'"Kitchen" = cocina. "Bedroom" es el dormitorio.'},
      {q:'I sleep in my ____.', o:['bed','table','sink','shelf'], a:0, why:'"Bed" = cama.'},
      {q:'We watch TV in the ____.', o:['living room','bathroom','attic','roof'], a:0, why:'"Living room" = sala/salón.'},
      {q:'Please close the ____ — it\'s cold outside.', o:['window','wall','stairs','carpet'], a:0, why:'"Window" = ventana. Una pared ("wall") no se cierra.'},
      {q:'Put the milk in the ____ so it stays cold.', o:['fridge','oven','lamp','mirror'], a:0, why:'"Fridge" = nevera. "Oven" es el horno.'},
    ]},
    { unit: 13, topic: 'Vocabulary · Animals', items: [
      {q:'A ____ says "miau" and likes to sleep a lot.', o:['cat','dog','cow','horse'], a:0, why:'"Cat" = gato.'},
      {q:'A ____ gives us milk on a farm.', o:['cow','chicken','fish','bee'], a:0, why:'"Cow" = vaca.'},
      {q:'____ can fly and have feathers.', o:['Birds','Fish','Snakes','Frogs'], a:0, why:'"Birds" = aves; tienen plumas ("feathers").'},
      {q:'A ____ lives in the water and swims.', o:['fish','lion','bear','rabbit'], a:0, why:'"Fish" = pez.'},
      {q:'The ____ is a very big grey animal with a long trunk.', o:['elephant','mouse','duck','goat'], a:0, why:'"Elephant" = elefante; "trunk" es la trompa.'},
    ]},
    { unit: 15, topic: 'Vocabulary · Jobs and places', items: [
      {q:'A ____ helps sick people in a hospital.', o:['doctor','driver','farmer','painter'], a:0, why:'"Doctor" = médico.'},
      {q:'A ____ teaches students at school.', o:['teacher','waiter','pilot','builder'], a:0, why:'"Teacher" = profesor.'},
      {q:'We buy bread at the ____.', o:['bakery','library','bank','station'], a:0, why:'"Bakery" = panadería. "Library" es biblioteca.'},
      {q:'A ____ brings your food in a restaurant.', o:['waiter','nurse','singer','police officer'], a:0, why:'"Waiter" = mesero/camarero.'},
      {q:'You can borrow books from the ____.', o:['library','bookshop','museum','cinema'], a:0, why:'En la "library" (biblioteca) se prestan libros; en la "bookshop" se compran.'},
    ]},
    { unit: 2, topic: 'Vocabulary · The body', items: [
      {q:'You wear a hat on your ____.', o:['head','hand','foot','knee'], a:0, why:'"Head" = cabeza.'},
      {q:'You write with your ____.', o:['hand','ear','nose','back'], a:0, why:'"Hand" = mano.'},
      {q:'You wear a shoe on your ____.', o:['foot','arm','neck','eye'], a:0, why:'"Foot" = pie (plural: "feet").'},
      {q:'You see with your ____.', o:['eyes','ears','teeth','fingers'], a:0, why:'"Eyes" = ojos. Con los "ears" (orejas) se oye.'},
      {q:'She has long black ____.', o:['hair','hairs','head','face'], a:0, why:'"Hair" es incontable cuando hablamos del pelo en general.'},
      {q:'You eat and speak with your ____.', o:['mouth','nose','ear','elbow'], a:0, why:'"Mouth" = boca.'},
    ]},
    { unit: 6, topic: 'Vocabulary · Days and time', items: [
      {q:'The first day of the school week is ____.', o:['Monday','Sunday','Friday','Saturday'], a:0, why:'"Monday" = lunes.'},
      {q:'Saturday and Sunday are the ____.', o:['weekend','weekday','holiday','vacation'], a:0, why:'"Weekend" = fin de semana.'},
      {q:'I have breakfast in the ____.', o:['morning','evening','night','midnight'], a:0, why:'"Morning" = mañana.'},
      {q:'The stars come out at ____.', o:['night','noon','morning','afternoon'], a:0, why:'"Night" = noche.'},
      {q:'Look at the ____ to see what time it is.', o:['clock','calendar','window','mirror'], a:0, why:'"Clock" = reloj de pared. El "calendar" muestra la fecha.'},
      {q:'Today is Monday, so ____ is Tuesday.', o:['tomorrow','yesterday','tonight','now'], a:0, why:'"Tomorrow" = mañana (el día siguiente).'},
    ]},
    { unit: 10, topic: 'Vocabulary · Around the house and school', items: [
      {q:'You have a shower in the ____.', o:['bathroom','kitchen','garage','hall'], a:0, why:'"Bathroom" = baño.'},
      {q:'We grow flowers in the ____.', o:['garden','cellar','attic','roof'], a:0, why:'"Garden" = jardín.'},
      {q:'Children play outside at break in the ____.', o:['playground','classroom','library','office'], a:0, why:'"Playground" = patio de recreo.'},
      {q:'The student sits at a ____.', o:['desk','sofa','bed','shelf'], a:0, why:'"Desk" = pupitre o escritorio.'},
      {q:'Please close the ____ when you come in.', o:['door','floor','ceiling','wall'], a:0, why:'"Door" = puerta.'},
      {q:'Don\'t drop it — it will break on the ____.', o:['floor','sky','roof','door'], a:0, why:'"Floor" = suelo.'},
    ]},
    { unit: 14, topic: 'Vocabulary · Everyday actions', items: [
      {q:'I ____ every morning in the park to keep fit.', o:['run','sit','sleep','stand'], a:0, why:'"Run" = correr.'},
      {q:'We ____ dinner at eight o\'clock.', o:['eat','drink','cook up','take'], a:0, why:'"Eat dinner" = cenar.'},
      {q:'She likes to ____ books before bed.', o:['read','write','listen','watch'], a:0, why:'"Read" = leer.'},
      {q:'Babies ____ for many hours every day.', o:['sleep','wake','walk','run'], a:0, why:'"Sleep" = dormir.'},
      {q:'Please ____ your name at the top of the page.', o:['write','read','say','draw'], a:0, why:'"Write" = escribir.'},
      {q:'I ____ a lot of water when it is hot.', o:['drink','eat','take','put'], a:0, why:'"Drink" = beber.'},
    ]},
  ],

  /* ============================ A2 ============================ */
  A2: [
    { unit: 1, topic: 'Vocabulary · Daily routine and free time', items: [
      {q:'I usually ____ up at seven o\'clock.', o:['get','take','make','do'], a:0, why:'"Get up" = levantarse. Es un phrasal verb fijo.'},
      {q:'On Sundays I ____ my grandparents.', o:['visit','assist','watch','look'], a:0, why:'"Visit" = visitar. "Assist" significa ayudar, no asistir.'},
      {q:'She ____ the guitar in a band.', o:['plays','does','makes','goes'], a:0, why:'Con instrumentos se usa "play": "play the guitar".'},
      {q:'We ____ shopping every Saturday morning.', o:['go','make','take','play'], a:0, why:'"Go shopping" es la colocación correcta.'},
      {q:'He ____ his homework before dinner.', o:['does','makes','takes','gets'], a:0, why:'"Do homework", no "make homework".'},
    ]},
    { unit: 3, topic: 'Vocabulary · Shopping and money', items: [
      {q:'How much does this jacket ____?', o:['cost','pay','spend','buy'], a:0, why:'"Cost" = costar. "Pay" es pagar (una persona paga).'},
      {q:'These shoes are on sale — they are very ____.', o:['cheap','expensive','rich','poor'], a:0, why:'"Cheap" = barato; lo contrario de "expensive".'},
      {q:'Can I pay by ____ card?', o:['credit','paper','money','coin'], a:0, why:'"Credit card" = tarjeta de crédito.'},
      {q:'The shop assistant gave me my ____ after I paid.', o:['receipt','recipe','bill','ticket'], a:0, why:'"Receipt" = recibo. Ojo: "recipe" es una receta de cocina.'},
      {q:'I want to try this on. Where is the ____ room?', o:['fitting','living','waiting','dining'], a:0, why:'"Fitting room" = probador.'},
    ]},
    { unit: 5, topic: 'Vocabulary · Travel and transport', items: [
      {q:'We took a ____ from the airport to the hotel.', o:['taxi','bicycle','boat','lift'], a:0, why:'"Taxi" es lo lógico desde el aeropuerto.'},
      {q:'Don\'t forget your ____ — you can\'t travel abroad without it.', o:['passport','wallet','helmet','map'], a:0, why:'"Passport" = pasaporte.'},
      {q:'The train ____ at platform four.', o:['arrives','arrive','arriving','arrived'], a:0, why:'Horarios en presente simple: "The train arrives...".'},
      {q:'We stayed in a small ____ near the beach.', o:['hotel','office','factory','stadium'], a:0, why:'"Hotel" = hotel; los otros no son alojamiento.'},
      {q:'My flight was ____ for two hours because of the storm.', o:['delayed','late','slow','lost'], a:0, why:'"Delayed" = retrasado; es el término que se usa con vuelos.'},
    ]},
    { unit: 7, topic: 'Vocabulary · Health and the body', items: [
      {q:'I have a ____ — I think I need an aspirin.', o:['headache','headpain','headsick','headhurt'], a:0, why:'"Headache" = dolor de cabeza. El sufijo -ache indica dolor.'},
      {q:'You should see a ____ if your tooth hurts.', o:['dentist','chemist','nurse','surgeon'], a:0, why:'"Dentist" = dentista.'},
      {q:'She broke her ____ playing football, so she can\'t walk.', o:['leg','ear','nose','finger'], a:0, why:'Si no puede caminar, se rompió la pierna: "leg".'},
      {q:'Take this ____ twice a day with water.', o:['medicine','food','drink','sugar'], a:0, why:'"Medicine" = medicamento.'},
      {q:'I feel ____. I think I have a cold.', o:['ill','good','happy','strong'], a:0, why:'"Ill" (o "sick") = enfermo.'},
    ]},
    { unit: 9, topic: 'Vocabulary · The city', items: [
      {q:'You can send a letter at the ____ office.', o:['post','police','ticket','tourist'], a:0, why:'"Post office" = oficina de correos.'},
      {q:'Cross the street at the ____ crossing.', o:['pedestrian','vehicle','traffic','road'], a:0, why:'"Pedestrian crossing" = paso de peatones.'},
      {q:'There is a lot of ____ in the city at 8 a.m.', o:['traffic','traffics','cars traffic','transport'], a:0, why:'"Traffic" es incontable: nunca lleva -s.'},
      {q:'We watched a film at the ____.', o:['cinema','theatre','gallery','court'], a:0, why:'"Cinema" = cine; "theatre" es teatro.'},
      {q:'Turn left at the ____ and the bank is on your right.', o:['corner','centre','middle','side'], a:0, why:'"At the corner" = en la esquina.'},
    ]},
    { unit: 11, topic: 'Vocabulary · Weather and seasons', items: [
      {q:'It\'s ____ today — take your umbrella.', o:['raining','sunny','dry','hot'], a:0, why:'Si necesitas paraguas, está lloviendo: "raining".'},
      {q:'In ____ the leaves fall from the trees.', o:['autumn','spring','summer','winter'], a:0, why:'"Autumn" = otoño (US: "fall").'},
      {q:'It\'s very ____ today — I can\'t keep my hat on.', o:['windy','cloudy','foggy','warm'], a:0, why:'"Windy" = ventoso.'},
      {q:'The temperature is below zero. It\'s ____.', o:['freezing','boiling','mild','warm'], a:0, why:'"Freezing" = helado. "Boiling" es hirviendo.'},
      {q:'Flowers grow in ____.', o:['spring','winter','autumn','night'], a:0, why:'"Spring" = primavera.'},
    ]},
    { unit: 13, topic: 'Vocabulary · Feelings and personality', items: [
      {q:'She was ____ when she heard the good news.', o:['delighted','boring','tired','angry'], a:0, why:'"Delighted" = encantado, muy contento.'},
      {q:'He is very ____ — he always helps other people.', o:['kind','rude','mean','lazy'], a:0, why:'"Kind" = amable.'},
      {q:'I\'m ____ about the exam tomorrow.', o:['nervous','nerve','nervy','nerves'], a:0, why:'El adjetivo es "nervous" (nervioso).'},
      {q:'The film was really ____. I fell asleep.', o:['boring','bored','excited','exciting'], a:0, why:'La película causa aburrimiento: -ing. "Bored" es cómo te sientes tú.'},
      {q:'My brother is very ____ — he never shares anything.', o:['selfish','generous','friendly','polite'], a:0, why:'"Selfish" = egoísta.'},
    ]},
    { unit: 15, topic: 'Vocabulary · Technology', items: [
      {q:'I need to ____ my phone — the battery is dead.', o:['charge','load','fill','power'], a:0, why:'"Charge" = cargar (la batería).'},
      {q:'Can you ____ me that photo by email?', o:['send','put','give','pass'], a:0, why:'"Send" = enviar; es el verbo de correo y mensajes.'},
      {q:'You need a ____ to connect to the internet here.', o:['password','passport','permission','ticket'], a:0, why:'"Password" = contraseña. Ojo con "passport".'},
      {q:'____ the app from the store — it\'s free.', o:['Download','Upload','Unload','Reload'], a:0, why:'"Download" = descargar (bajar al aparato).'},
      {q:'My computer is very slow. I should ____ it.', o:['restart','rewind','return','replay'], a:0, why:'"Restart" = reiniciar.'},
    ]},
    { unit: 2, topic: 'Vocabulary · Housework', items: [
      {q:'Could you ____ your room before lunch?', o:['tidy','clean up of','order','arrange up'], a:0, why:'"Tidy (up) your room" = ordenar la habitación.'},
      {q:'I have to ____ the dishes after dinner.', o:['wash','clean','bath','rinse off'], a:0, why:'"Wash the dishes" = lavar los platos.'},
      {q:'Take a broom and ____ the floor.', o:['sweep','swipe','brush up','wipe'], a:0, why:'"Sweep" = barrer.'},
      {q:'I hate having to ____ my shirts.', o:['iron','press down','flat','steam up'], a:0, why:'"Iron" = planchar.'},
      {q:'Please take the ____ out to the bin.', o:['rubbish','rubbishes','trashes','garbages'], a:0, why:'"Rubbish" (UK) es incontable: nunca lleva -s.'},
      {q:'The ____ is still wet — leave it on the line.', o:['laundry','laundries','washings','clothing wash'], a:0, why:'"Laundry" = la ropa que se lava; también es incontable.'},
    ]},
    { unit: 6, topic: 'Vocabulary · Cooking', items: [
      {q:'Follow the ____ exactly and the cake will be perfect.', o:['recipe','receipt','prescription','instruction'], a:0, why:'"Recipe" = receta de cocina. "Receipt" es el recibo de una compra.'},
      {q:'____ the water before you add the pasta.', o:['Boil','Bake','Fry','Roast'], a:0, why:'"Boil" = hervir.'},
      {q:'Can you ____ the bread for me?', o:['slice','cut off','chop up in','break'], a:0, why:'"Slice" = cortar en rebanadas.'},
      {q:'____ the soup to see if it needs salt.', o:['Taste','Try on','Prove','Flavour'], a:0, why:'"Taste" = probar (el sabor).'},
      {q:'We had ice cream for ____.', o:['dessert','desert','starter','main'], a:0, why:'"Dessert" = postre. Ojo: "desert" es desierto.'},
      {q:'I only want a quick ____, not a full meal.', o:['snack','dish','course','plate'], a:0, why:'"Snack" = tentempié.'},
    ]},
    { unit: 10, topic: 'Vocabulary · Sport and free time', items: [
      {q:'She goes ____ at the pool three times a week.', o:['swimming','swim','to swim','swimmed'], a:0, why:'Con "go" las actividades llevan -ing: "go swimming".'},
      {q:'____ is good exercise and you only need a bike.', o:['Cycling','Cicling','Biking up','Bicycle'], a:0, why:'"Cycling" = ciclismo.'},
      {q:'Football is a ____ sport: eleven players each side.', o:['team','group','couple','crowd'], a:0, why:'"Team sport" = deporte de equipo.'},
      {q:'We watched an exciting ____ on Sunday.', o:['match','play','game of match','party'], a:0, why:'"Match" = partido.'},
      {q:'He lifts weights at the ____ every evening.', o:['gym','court','field','track'], a:0, why:'"Gym" = gimnasio.'},
      {q:'We went ____ in the mountains all weekend.', o:['hiking','walking up','climb','trekked'], a:0, why:'"Go hiking" = hacer senderismo.'},
    ]},
    { unit: 14, topic: 'Vocabulary · School subjects', items: [
      {q:'In ____ we study numbers and equations.', o:['maths','math of','numbers','counting'], a:0, why:'"Maths" (UK) / "math" (US) = matemáticas.'},
      {q:'____ is about kings, wars and the past.', o:['History','Story','Historic','Past'], a:0, why:'"History" = historia (la asignatura). "Story" es un cuento.'},
      {q:'In ____ we do experiments in the laboratory.', o:['science','sciences of','scientific','scientist'], a:0, why:'"Science" = ciencias.'},
      {q:'In ____ class we paint and draw.', o:['art','arts of','artist','artistic'], a:0, why:'"Art" = plástica, arte.'},
      {q:'The teacher gave us a lot of ____ for the weekend.', o:['homework','homeworks','houseworks','tasks of home'], a:0, why:'"Homework" es incontable: nunca "homeworks".'},
      {q:'I have to study — there is an ____ on Friday.', o:['exam','examen','exame','examination of'], a:0, why:'"Exam" (o "examination") = examen.'},
    ]},
  ],

  /* ============================ B1 ============================ */
  B1: [
    { unit: 1, topic: 'Vocabulary · Work and study', items: [
      {q:'She ____ for a job at a big company last week.', o:['applied','asked','requested','demanded'], a:0, why:'"Apply for a job" = postularse. Se usa siempre con "for".'},
      {q:'You need a good ____ to send with your application.', o:['CV','notebook','licence','receipt'], a:0, why:'"CV" (curriculum vitae) = hoja de vida.'},
      {q:'He was ____ after ten years in the same company.', o:['promoted','raised','lifted','grown'], a:0, why:'"Promoted" = ascendido.'},
      {q:'I have a job ____ on Monday at nine.', o:['interview','conversation','question','speech'], a:0, why:'"Job interview" = entrevista de trabajo.'},
      {q:'She earns a good ____ as an engineer.', o:['salary','price','cost','fee'], a:0, why:'"Salary" = sueldo. "Price" es el precio de algo.'},
    ]},
    { unit: 3, topic: 'Vocabulary · The environment', items: [
      {q:'We should ____ paper and plastic instead of throwing them away.', o:['recycle','reuse','refuse','reduce'], a:0, why:'"Recycle" = reciclar (convertirlo en material nuevo).'},
      {q:'Air ____ in big cities is a serious health problem.', o:['pollution','dirt','rubbish','smoke'], a:0, why:'"Pollution" = contaminación.'},
      {q:'Solar and wind power are ____ energy sources.', o:['renewable','returnable','removable','reliable'], a:0, why:'"Renewable" = renovable.'},
      {q:'Many species are in danger of becoming ____.', o:['extinct','extinguished','excluded','expired'], a:0, why:'"Extinct" = extinto (una especie que desaparece).'},
      {q:'Cutting down forests is called ____.', o:['deforestation','defrosting','deformation','deviation'], a:0, why:'"Deforestation" = deforestación.'},
    ]},
    { unit: 5, topic: 'Vocabulary · Phrasal verbs', items: [
      {q:'I need to ____ up early tomorrow for my flight.', o:['get','take','put','look'], a:0, why:'"Get up" = levantarse.'},
      {q:'Could you ____ after my dog while I\'m away?', o:['look','see','watch','care'], a:0, why:'"Look after" = cuidar de alguien o algo.'},
      {q:'The meeting was ____ off because of the storm.', o:['called','put','taken','given'], a:0, why:'"Call off" = cancelar.'},
      {q:'She ____ up smoking two years ago.', o:['gave','took','put','went'], a:0, why:'"Give up" = dejar (un hábito).'},
      {q:'I ____ across an old photo while cleaning the attic.', o:['came','went','got','fell'], a:0, why:'"Come across" = encontrarse algo por casualidad.'},
    ]},
    { unit: 7, topic: 'Vocabulary · Media and news', items: [
      {q:'The story was on the front ____ of every newspaper.', o:['page','sheet','paper','cover'], a:0, why:'"Front page" = portada de un periódico.'},
      {q:'A ____ writes articles for a newspaper.', o:['journalist','author','editor','printer'], a:0, why:'"Journalist" = periodista.'},
      {q:'Don\'t believe everything — some of it is fake ____.', o:['news','new','notice','novelty'], a:0, why:'"News" es incontable y siempre lleva -s: "fake news".'},
      {q:'The programme was ____ live from the stadium.', o:['broadcast','transmitted','sent','published'], a:0, why:'"Broadcast" = transmitir por radio o televisión.'},
      {q:'I read an interesting ____ about climate change.', o:['article','articule','notice','writing'], a:0, why:'"Article" = artículo.'},
    ]},
    { unit: 9, topic: 'Vocabulary · Describing people', items: [
      {q:'He is very ____ — he never stops working.', o:['hard-working','hardly working','hard-work','work-hard'], a:0, why:'"Hard-working" = trabajador. Ojo: "hardly" significa apenas.'},
      {q:'She is ____ enough to solve any problem.', o:['clever','cleverly','cleverness','clever-ly'], a:0, why:'Después de "be" va el adjetivo: "clever".'},
      {q:'My neighbour is very ____ — she talks to everyone.', o:['outgoing','outstanding','outdoor','outside'], a:0, why:'"Outgoing" = extrovertido, sociable.'},
      {q:'He\'s so ____ that he believes everything you tell him.', o:['naive','naughty','narrow','nasty'], a:0, why:'"Naive" = ingenuo.'},
      {q:'Don\'t be so ____ — the glass is half full!', o:['pessimistic','optimistic','realistic','artistic'], a:0, why:'"Pessimistic" = pesimista; el contrario de "optimistic".'},
    ]},
    { unit: 11, topic: 'Vocabulary · Money and consumer life', items: [
      {q:'I try to ____ some money every month for a holiday.', o:['save','spend','waste','lose'], a:0, why:'"Save money" = ahorrar dinero.'},
      {q:'Can I ____ some money until Friday? I\'ll pay you back.', o:['borrow','lend','loan','owe'], a:0, why:'"Borrow" = pedir prestado. "Lend" es prestar TÚ a otro.'},
      {q:'The bank gave him a ____ to buy the house.', o:['loan','borrow','debt','fee'], a:0, why:'"Loan" = préstamo.'},
      {q:'Everything is more expensive: prices keep going ____.', o:['up','on','over','out'], a:0, why:'"Go up" = subir (los precios).'},
      {q:'I can\'t ____ a new car this year.', o:['afford','permit','allow','accept'], a:0, why:'"Afford" = poder permitirse (económicamente).'},
    ]},
    { unit: 13, topic: 'Vocabulary · Common collocations', items: [
      {q:'Could you ____ me a favour?', o:['do','make','take','give'], a:0, why:'"Do someone a favour" es la colocación fija.'},
      {q:'We need to ____ a decision before Friday.', o:['make','do','take','have'], a:0, why:'En inglés se dice "make a decision".'},
      {q:'She ____ a photo of the sunset.', o:['took','made','did','got'], a:0, why:'"Take a photo" = tomar una foto.'},
      {q:'They ____ a party for her birthday.', o:['had','made','did','put'], a:0, why:'"Have a party" = hacer una fiesta.'},
      {q:'Please ____ attention to the instructions.', o:['pay','put','give','make'], a:0, why:'"Pay attention" = prestar atención.'},
    ]},
    { unit: 15, topic: 'Vocabulary · Travel problems', items: [
      {q:'We ____ our flight because of the traffic.', o:['missed','lost','failed','forgot'], a:0, why:'"Miss a flight" = perder un vuelo. "Lose" es perder un objeto.'},
      {q:'The airline ____ my suitcase — it went to another country.', o:['lost','missed','left','dropped'], a:0, why:'Un objeto extraviado: "lost my suitcase".'},
      {q:'I had to ____ my booking because I got ill.', o:['cancel','delete','erase','refuse'], a:0, why:'"Cancel a booking" = cancelar una reserva.'},
      {q:'There was a long ____ at passport control.', o:['queue','line-up','row','tail'], a:0, why:'"Queue" (UK) = fila. En US se dice "line".'},
      {q:'Our train was ____ so we arrived two hours late.', o:['delayed','retarded','slowed','stopped'], a:0, why:'"Delayed" es el término correcto para un retraso.'},
    ]},
    { unit: 2, topic: 'Vocabulary · Character and behaviour', items: [
      {q:'He is completely ____ — he has never let me down.', o:['reliable','reliant','relying','reliably'], a:0, why:'"Reliable" = de fiar, confiable.'},
      {q:'She is so ____ that she never changes her mind.', o:['stubborn','stubbornly','stubbornness','stubborned'], a:0, why:'"Stubborn" = terco.'},
      {q:'Teachers need to be ____ with young children.', o:['patient','patience','patiently','patients'], a:0, why:'Tras "be" va el adjetivo "patient"; "patience" es el sustantivo.'},
      {q:'An ____ person always tells the truth.', o:['honest','honesty','honestly','honoured'], a:0, why:'"Honest" = honesto.'},
      {q:'She is very ____ and wants to run the company one day.', o:['ambitious','ambition','ambitiously','ambitioned'], a:0, why:'"Ambitious" = ambicioso.'},
      {q:'My boss is ____ — nothing ever worries him.', o:['easy-going','easy-doing','easy-taking','easily going'], a:0, why:'"Easy-going" = tranquilo, de trato fácil.'},
    ]},
    { unit: 6, topic: 'Vocabulary · Health and lifestyle', items: [
      {q:'A balanced ____ is better than any pill.', o:['diet','regime','food plan of','eating'], a:0, why:'"Diet" = alimentación, dieta.'},
      {q:'He goes to the gym to improve his ____.', o:['fitness','fit','fitting','fitly'], a:0, why:'"Fitness" = forma física (sustantivo).'},
      {q:'Too much work causes ____ and bad sleep.', o:['stress','stressed','stressful','stresses of'], a:0, why:'"Stress" es el sustantivo incontable.'},
      {q:'She got an ____ playing basketball and missed the season.', o:['injury','injure','injured','injuring'], a:0, why:'"Injury" = lesión (sustantivo).'},
      {q:'It took him a month to ____ from the operation.', o:['recover','discover','uncover','recovery'], a:0, why:'"Recover from" = recuperarse de.'},
      {q:'Smoking is a very hard ____ to break.', o:['habit','custom','routine of','ability'], a:0, why:'"Habit" = hábito; "break a habit" = dejarlo.'},
    ]},
    { unit: 10, topic: 'Vocabulary · Internet and devices', items: [
      {q:'Open your ____ and type the address.', o:['browser','searcher','navigator of','explorer of web'], a:0, why:'"Browser" = navegador.'},
      {q:'____ the photo so everyone can see it online.', o:['Upload','Download','Unload','Load off'], a:0, why:'"Upload" = subir (lo contrario de "download").'},
      {q:'You need an ____ to use this service.', o:['account','accountant','account of bank','accounting'], a:0, why:'"Account" = cuenta de usuario.'},
      {q:'This app works on any ____ — phone, tablet or laptop.', o:['device','devise','machine of','apparel'], a:0, why:'"Device" = dispositivo. Ojo: "devise" es un verbo (idear).'},
      {q:'I have no ____ left on my phone for more photos.', o:['storage','store','storing','stores'], a:0, why:'"Storage" = almacenamiento.'},
      {q:'You should ____ the app to fix that bug.', o:['update','upgrade of','actualise','renew'], a:0, why:'"Update" = actualizar.'},
    ]},
    { unit: 14, topic: 'Vocabulary · Crime and safety', items: [
      {q:'The police asked the ____ what she had seen.', o:['witness','watcher','viewer','spectator'], a:0, why:'"Witness" = testigo.'},
      {q:'A ____ stole my wallet on the bus.', o:['thief','thieve','robber of','steal'], a:0, why:'"Thief" = ladrón (plural: "thieves").'},
      {q:'There was not enough ____ to take him to court.', o:['evidence','evidences','proofs of','prove'], a:0, why:'"Evidence" es incontable: nunca "evidences".'},
      {q:'The officers had to ____ him at the scene.', o:['arrest','detent','capture of','prison'], a:0, why:'"Arrest" = detener, arrestar.'},
      {q:'He was given a ____ instead of a fine.', o:['warning','warn','warned','warningly'], a:0, why:'"Warning" = advertencia (sustantivo).'},
      {q:'Wear a helmet — it is a question of ____.', o:['safety','safe','safely','saving'], a:0, why:'"Safety" = seguridad (sustantivo).'},
    ]},
  ],

  /* ============================ B2 ============================ */
  B2: [
    { unit: 1, topic: 'Vocabulary · Opinion and argument', items: [
      {q:'She put ____ a convincing argument for the change.', o:['forward','up','off','through'], a:0, why:'"Put forward an argument" = presentar un argumento.'},
      {q:'His conclusion is not ____ by the evidence.', o:['supported','sustained','held','carried'], a:0, why:'"Supported by evidence" es la colocación académica correcta.'},
      {q:'I\'m ____ to agree with you on that point.', o:['inclined','tended','leaned','turned'], a:0, why:'"Be inclined to" = tender a, estar dispuesto a.'},
      {q:'The two studies reached ____ conclusions.', o:['contradictory','contradicting','contrary','contrast'], a:0, why:'"Contradictory conclusions" = conclusiones contradictorias.'},
      {q:'Let\'s consider this issue from another ____.', o:['perspective','vision','sight','view point'], a:0, why:'"From another perspective" = desde otra perspectiva.'},
    ]},
    { unit: 2, topic: 'Vocabulary · Word formation', items: [
      {q:'His ____ to finish the project impressed everyone. (determine)', o:['determination','determining','determined','determinable'], a:0, why:'El sustantivo de "determine" es "determination".'},
      {q:'The instructions were completely ____. (understand)', o:['incomprehensible','ununderstandable','discomprehensible','misunderstood'], a:0, why:'El adjetivo negativo es "incomprehensible".'},
      {q:'We need to ____ the process to save time. (simple)', o:['simplify','simplicate','simple','simpleness'], a:0, why:'El verbo se forma con -ify: "simplify".'},
      {q:'She spoke with great ____. (confident)', o:['confidence','confidently','confidential','confiding'], a:0, why:'El sustantivo de "confident" es "confidence".'},
      {q:'The results were ____ disappointing. (extreme)', o:['extremely','extreme','extremity','extremist'], a:0, why:'Delante de un adjetivo va el adverbio: "extremely".'},
    ]},
    { unit: 4, topic: 'Vocabulary · Business and work', items: [
      {q:'The company plans to ____ into the Asian market.', o:['expand','extend','enlarge','increase'], a:0, why:'"Expand into a market" = expandirse a un mercado.'},
      {q:'We need to ____ costs without cutting staff.', o:['reduce','lower down','diminish','shorten'], a:0, why:'"Reduce costs" es la colocación estándar.'},
      {q:'The deal fell ____ at the last minute.', o:['through','down','off','out'], a:0, why:'"Fall through" = venirse abajo, fracasar (un acuerdo).'},
      {q:'She was ____ to manager after only a year.', o:['promoted','ascended','elevated','upgraded'], a:0, why:'"Promoted" = ascendido; los demás no se usan con personas.'},
      {q:'Our main ____ launched a similar product last month.', o:['competitor','competition','competence','competitive'], a:0, why:'La persona/empresa rival es el "competitor".'},
    ]},
    { unit: 5, topic: 'Vocabulary · Science and research', items: [
      {q:'The scientists ____ an experiment to test the theory.', o:['carried out','made out','took out','brought out'], a:0, why:'"Carry out an experiment" = llevar a cabo un experimento.'},
      {q:'These results are not ____ — we need more data.', o:['conclusive','concluding','conclusion','concluded'], a:0, why:'"Conclusive evidence/results" = concluyente.'},
      {q:'The study was based on a ____ of 2,000 people.', o:['sample','example','simple','sampling'], a:0, why:'"Sample" = muestra estadística.'},
      {q:'There is a clear ____ between diet and health.', o:['correlation','correspondence','coincidence','connection point'], a:0, why:'"Correlation" es el término técnico para una relación estadística.'},
      {q:'The findings ____ the original hypothesis.', o:['confirm','confirmate','confirmation','confirming'], a:0, why:'Hace falta el verbo: "confirm".'},
    ]},
    { unit: 7, topic: 'Vocabulary · Idiomatic expressions', items: [
      {q:'Learning the whole poem by heart was a piece of ____.', o:['cake','bread','pie','fruit'], a:0, why:'"A piece of cake" = pan comido, muy fácil.'},
      {q:'I don\'t know the answer — I\'m in the ____ too.', o:['dark','night','shade','black'], a:0, why:'"In the dark" = sin información, a oscuras.'},
      {q:'Let\'s not beat about the ____ — tell me the truth.', o:['bush','tree','grass','wood'], a:0, why:'"Beat about the bush" = andarse por las ramas.'},
      {q:'The exam was hard, but I passed by the skin of my ____.', o:['teeth','hands','nose','feet'], a:0, why:'"By the skin of one\'s teeth" = por muy poco.'},
      {q:'She spilled the ____ about the surprise party.', o:['beans','milk','water','salt'], a:0, why:'"Spill the beans" = revelar un secreto.'},
    ]},
    { unit: 8, topic: 'Vocabulary · Connectors and linking', items: [
      {q:'The plan is expensive; ____, it is our best option.', o:['nevertheless','moreover','therefore','likewise'], a:0, why:'"Nevertheless" introduce un contraste (sin embargo).'},
      {q:'He didn\'t study. ____, he failed the exam.', o:['Consequently','Nevertheless','However','Although'], a:0, why:'"Consequently" marca la consecuencia.'},
      {q:'____ the bad weather, the match went ahead.', o:['Despite','Although','However','Even'], a:0, why:'"Despite" va seguido de sustantivo; "although" necesitaría una oración.'},
      {q:'The city is beautiful; ____, it is quite expensive.', o:['on the other hand','on the contrary','in other words','as a result'], a:0, why:'"On the other hand" presenta el otro lado del argumento.'},
      {q:'She is fluent in French ____ Italian.', o:['as well as','as well','so as','as much'], a:0, why:'"As well as" = además de, y también.'},
    ]},
    { unit: 10, topic: 'Vocabulary · Society and culture', items: [
      {q:'The government introduced a new ____ to protect tenants.', o:['policy','politic','politics','policeman'], a:0, why:'"Policy" = política (medida). "Politics" es la actividad política.'},
      {q:'Education should be ____ to everyone, regardless of income.', o:['accessible','accessed','accession','access'], a:0, why:'Hace falta el adjetivo: "accessible".'},
      {q:'There is a growing ____ between rich and poor.', o:['gap','hole','space','distance'], a:0, why:'"Gap" = brecha; "the gap between rich and poor".'},
      {q:'Many young people ____ to the city looking for work.', o:['migrate','emigrate to','immigrate','transfer'], a:0, why:'"Migrate to" describe el movimiento en general.'},
      {q:'The festival is an important part of our cultural ____.', o:['heritage','inheritance','legacy fund','tradition day'], a:0, why:'"Cultural heritage" = patrimonio cultural.'},
    ]},
    { unit: 11, topic: 'Vocabulary · Precision and nuance', items: [
      {q:'The difference between the two versions is very ____.', o:['subtle','subtile','submissive','substantial'], a:0, why:'"Subtle" = sutil, difícil de percibir.'},
      {q:'His explanation was rather ____ — nobody understood it.', o:['vague','vast','valid','vain'], a:0, why:'"Vague" = vago, poco preciso.'},
      {q:'She gave a ____ account of what happened.', o:['detailed','detailing','detail','detailer'], a:0, why:'Delante del sustantivo va el adjetivo: "a detailed account".'},
      {q:'The report is ____ but it lacks depth.', o:['accurate','accurated','accuracy','accurately'], a:0, why:'Después de "is" va el adjetivo: "accurate" (preciso).'},
      {q:'I was ____ surprised by how good it was.', o:['genuinely','genuine','genuineness','genius'], a:0, why:'Modifica al adjetivo "surprised", así que va el adverbio.'},
    ]},
    { unit: 3, topic: 'Vocabulary · Work and careers', items: [
      {q:'My ____ has doubled since the team shrank.', o:['workload','workforce','workshop','workbench'], a:0, why:'"Workload" = carga de trabajo.'},
      {q:'I get on well with every ____ in my department.', o:['colleague','college','collegue','companion of work'], a:0, why:'"Colleague" = colega de trabajo. "College" es una institución.'},
      {q:'She works ____, so she chooses her own clients.', o:['freelance','freelancing of','free lancer','on free'], a:0, why:'"Work freelance" = trabajar por cuenta propia.'},
      {q:'He works the night ____ at the hospital.', o:['shift','turn','change','journey'], a:0, why:'"Shift" = turno de trabajo.'},
      {q:'She decided to ____ after ten years in the job.', o:['resign','resignate','renounce of','quit from'], a:0, why:'"Resign" = dimitir, renunciar.'},
      {q:'The company offers excellent ____ such as health cover.', o:['benefits','beneficts','profits','advantages of pay'], a:0, why:'"Benefits" = prestaciones laborales.'},
    ]},
    { unit: 6, topic: 'Vocabulary · Education', items: [
      {q:'She finished her ____ in engineering last June.', o:['degree','career','grade','title'], a:0, why:'"Degree" = título universitario. Ojo: "career" es la trayectoria profesional.'},
      {q:'____ fees at that university are very high.', o:['Tuition','Tuitions','Teaching of','Educative'], a:0, why:'"Tuition fees" = matrícula.'},
      {q:'He won a ____ that pays for his whole course.', o:['scholarship','scholarity','beca','studentship of money'], a:0, why:'"Scholarship" = beca.'},
      {q:'The professor gave a two-hour ____ on economics.', o:['lecture','lection','conference of class','reading'], a:0, why:'"Lecture" = clase magistral.'},
      {q:'The ____ has to be handed in before Friday.', o:['assignment','assignation','asignment','homework of class'], a:0, why:'"Assignment" = trabajo asignado.'},
      {q:'She will ____ from university next summer.', o:['graduate','graduate of','grade','degree'], a:0, why:'"Graduate" también es verbo: graduarse.'},
    ]},
    { unit: 9, topic: 'Vocabulary · Emotions and reactions', items: [
      {q:'With so many tasks at once I feel completely ____.', o:['overwhelmed','overcome of','overworked out','overturned'], a:0, why:'"Overwhelmed" = desbordado.'},
      {q:'I was ____ when I heard everyone was safe.', o:['relieved','relief','relieving','relievable'], a:0, why:'Tras "was" va el participio-adjetivo "relieved" (aliviado).'},
      {q:'He gets ____ when the internet is slow.', o:['frustrated','frustrating','frustration','frustrate'], a:0, why:'La persona se siente "frustrated"; algo que frustra es "frustrating".'},
      {q:'We were ____ by how much the city had changed.', o:['astonished','astonishing','astonishment','astonish'], a:0, why:'"Astonished" = asombrado (cómo te sientes).'},
      {q:'She was ____ to admit that she had been wrong.', o:['reluctant','reluctance','reluctantly','reluct'], a:0, why:'"Be reluctant to" = ser reacio a.'},
      {q:'He seems perfectly ____ with his simple life.', o:['content','contented of','contents','contentment'], a:0, why:'"Content with" = satisfecho con.'},
    ]},
    { unit: 12, topic: 'Vocabulary · Describing change', items: [
      {q:'Sales ____ by 60% after the advert went viral.', o:['soared','sank','slid','sailed'], a:0, why:'"Soar" = dispararse hacia arriba.'},
      {q:'Prices ____ when the crisis began.', o:['plummeted','plumped','plunged down of','plumbed'], a:0, why:'"Plummet" = desplomarse.'},
      {q:'The numbers ____ between 20 and 30 all year.', o:['fluctuated','floated','flowed','fluctered'], a:0, why:'"Fluctuate" = fluctuar.'},
      {q:'The market began to ____ after the new rules.', o:['stabilise','stable','stability of','stabilite'], a:0, why:'Hace falta el verbo: "stabilise".'},
      {q:'There has been a steady ____ in newspaper sales.', o:['decline','declining of','declination','decrease of down'], a:0, why:'"A decline in" = un descenso en.'},
      {q:'Demand ____ in December and then fell away.', o:['peaked','peak of','picked','topped up'], a:0, why:'"Peak" como verbo = alcanzar el máximo.'},
    ]},
  ],

  /* ============================ C1 ============================ */
  C1: [
    { unit: 1, topic: 'Vocabulary · Academic collocations', items: [
      {q:'The paper ____ a compelling case for reform.', o:['makes','does','takes','gives'], a:0, why:'"Make a case for" = argumentar a favor de algo.'},
      {q:'These findings ____ significant implications for policy.', o:['have','make','take','do'], a:0, why:'"Have implications" es la colocación establecida.'},
      {q:'The author ____ a distinction between the two concepts.', o:['draws','pulls','makes out','sets'], a:0, why:'"Draw a distinction" = establecer una distinción.'},
      {q:'Her research ____ new light on the subject.', o:['sheds','throws down','puts','gives'], a:0, why:'"Shed light on" = arrojar luz sobre un tema.'},
      {q:'The theory has been widely ____ in recent years.', o:['challenged','challenging','challenge','challenger'], a:0, why:'Voz pasiva: participio "challenged" (cuestionada).'},
    ]},
    { unit: 2, topic: 'Vocabulary · Register and formality', items: [
      {q:'Formal writing prefers "purchase"; informal prefers ____.', o:['buy','acquire','obtain','procure'], a:0, why:'"Buy" es el término neutro/informal; los demás son formales.'},
      {q:'In an academic essay, avoid contractions such as ____.', o:["don't",'do not','cannot','will not'], a:0, why:'Las contracciones ("don\'t") son informales; en formal se escribe completo.'},
      {q:'"To put it bluntly" signals that the speaker is being ____.', o:['direct','polite','vague','formal'], a:0, why:'"Bluntly" = sin rodeos, de forma directa (a veces brusca).'},
      {q:'A formal alternative to "ask for" is ____.', o:['request','beg','demand','order'], a:0, why:'"Request" es el equivalente formal y neutro de "ask for".'},
      {q:'"I regret to inform you" is typical of a ____ letter.', o:['formal','friendly','casual','personal'], a:0, why:'Es una fórmula fija de la correspondencia formal.'},
    ]},
    { unit: 4, topic: 'Vocabulary · Nuanced adjectives', items: [
      {q:'His argument was ____ — it convinced even the critics.', o:['cogent','cogitated','congenial','cognate'], a:0, why:'"Cogent" = convincente, sólido (argumento).'},
      {q:'The evidence is ____; we cannot draw firm conclusions.', o:['tenuous','tenacious','tentative plan','tender'], a:0, why:'"Tenuous" = débil, endeble (una conexión o prueba).'},
      {q:'She gave a ____ analysis that left nothing out.', o:['thorough','through','thoroughfare','throughout'], a:0, why:'"Thorough" = exhaustivo. Ojo con "through" (a través de).'},
      {q:'The rules are too ____ to allow any exceptions.', o:['rigid','rigorous exam','rigid-like','rigour'], a:0, why:'"Rigid" = rígido, inflexible.'},
      {q:'His remarks were ____ and offended several people.', o:['tactless','tactful','tactic','tactical'], a:0, why:'"Tactless" = sin tacto. "Tactful" es justo lo contrario.'},
    ]},
    { unit: 5, topic: 'Vocabulary · Advanced phrasal verbs', items: [
      {q:'The committee will ____ the proposal at length.', o:['go into','go over with','go for','go on'], a:0, why:'"Go into" = examinar en detalle.'},
      {q:'She managed to ____ the difficulties and finish the course.', o:['get over','get on','get in','get by with'], a:0, why:'"Get over" = superar (dificultades, una enfermedad).'},
      {q:'The new evidence ____ his entire theory.', o:['undermines','underlines','undertakes','undergoes'], a:0, why:'"Undermine" = socavar. "Underline" es subrayar.'},
      {q:'They had to ____ back on spending during the crisis.', o:['cut','put','take','set'], a:0, why:'"Cut back on" = recortar gastos.'},
      {q:'The meeting ____ down to a single question.', o:['boiled','cooked','burned','melted'], a:0, why:'"Boil down to" = reducirse a.'},
    ]},
    { unit: 7, topic: 'Vocabulary · Abstract nouns', items: [
      {q:'The ____ of the evidence points to one conclusion.', o:['weight','heaviness','load','mass'], a:0, why:'"The weight of the evidence" = el peso de las pruebas.'},
      {q:'There is a growing ____ that reform is necessary.', o:['consensus','consent','consensual','concession'], a:0, why:'"Consensus" = consenso.'},
      {q:'The ____ of the problem was underestimated.', o:['magnitude','magnificence','magnifier','magnate'], a:0, why:'"Magnitude" = magnitud, envergadura.'},
      {q:'His ____ to the project never wavered.', o:['commitment','commission','committee','commitment fee'], a:0, why:'"Commitment to" = compromiso con.'},
      {q:'The policy had unintended ____.', o:['consequences','consequents','consequence of','consequentials'], a:0, why:'"Unintended consequences" = consecuencias imprevistas.'},
    ]},
    { unit: 8, topic: 'Vocabulary · Idioms in context', items: [
      {q:'The project is on the back ____ until funding arrives.', o:['burner','seat','door','shelf'], a:0, why:'"On the back burner" = aparcado, en pausa.'},
      {q:'We should take his promises with a pinch of ____.', o:['salt','sugar','pepper','spice'], a:0, why:'"Take with a pinch of salt" = no tomárselo del todo en serio.'},
      {q:'Cutting the budget now would be a false ____.', o:['economy','saving','profit','account'], a:0, why:'"A false economy" = un ahorro que sale caro después.'},
      {q:'She was thrown in at the deep ____ on her first day.', o:['end','side','water','part'], a:0, why:'"Thrown in at the deep end" = enfrentar algo difícil sin preparación.'},
      {q:'That argument doesn\'t hold ____.', o:['water','air','ground','weight'], a:0, why:'"Hold water" = sostenerse, ser lógico (un argumento).'},
    ]},
    { unit: 10, topic: 'Vocabulary · Hedging and caution', items: [
      {q:'The data ____ that the trend may continue.', o:['suggests','proves','demonstrates','confirms'], a:0, why:'"Suggest" matiza; los otros afirman con demasiada seguridad.'},
      {q:'This is ____ the most important factor.', o:['arguably','certainly','definitely','undoubtedly'], a:0, why:'"Arguably" = probablemente/se puede sostener que; es el matiz cauto.'},
      {q:'The results are ____ inconclusive at this stage.', o:['somewhat','totally','absolutely','entirely'], a:0, why:'"Somewhat" suaviza la afirmación.'},
      {q:'It ____ that the two events are connected.', o:['appears','shows','proves','states'], a:0, why:'"It appears that" es la fórmula prudente.'},
      {q:'These conclusions should be treated with ____.', o:['caution','care taking','cautious','precaution'], a:0, why:'"With caution" = con cautela (sustantivo tras la preposición).'},
    ]},
    { unit: 11, topic: 'Vocabulary · Commonly confused words', items: [
      {q:'The new rules will ____ everyone in the department.', o:['affect','effect','afflict','effectuate'], a:0, why:'"Affect" es el verbo (afectar); "effect" es normalmente el sustantivo.'},
      {q:'Please ____ the instructions carefully.', o:['follow','fulfil','accomplish','obey to'], a:0, why:'"Follow instructions" es la colocación correcta.'},
      {q:'Her performance was ____ to his in every respect.', o:['superior','superior than','more superior','superiority'], a:0, why:'"Superior to" — nunca "superior than".'},
      {q:'The number of applicants ____ our expectations.', o:['exceeded','excelled','accessed','excepted'], a:0, why:'"Exceed" = superar (una cifra o expectativa).'},
      {q:'I would ____ that you reconsider the decision.', o:['advise','advice','advisor','advisable'], a:0, why:'"Advise" es el verbo; "advice" es el sustantivo incontable.'},
    ]},
    { unit: 3, topic: 'Vocabulary · Argument and persuasion', items: [
      {q:'She was willing to ____ that her first estimate was wrong.', o:['concede','concert','conceive','concert with'], a:0, why:'"Concede" = admitir, reconocer (algo en contra tuya).'},
      {q:'The study ____ the claims made in the earlier paper.', o:['refutes','refutates','rebuts of','refuses'], a:0, why:'"Refute" = refutar. "Refuse" es rechazar/negarse.'},
      {q:'You must ____ that claim with hard data.', o:['substantiate','substance','substantial','substantively'], a:0, why:'"Substantiate" = respaldar con pruebas.'},
      {q:'These figures seriously ____ his conclusion.', o:['undermine','underline','undertake','undergo'], a:0, why:'"Undermine" = socavar. "Underline" es subrayar.'},
      {q:'The report ____ a complete change of policy.', o:['advocates','advocated for of','advises of','advertises'], a:0, why:'"Advocate something" = abogar por algo (sin preposición).'},
      {q:'He was careful to ____ his statement with "in most cases".', o:['qualify','quality','qualificate','quantify'], a:0, why:'"Qualify a statement" = matizarla.'},
    ]},
    { unit: 6, topic: 'Vocabulary · Formal writing verbs', items: [
      {q:'This example ____ the point perfectly.', o:['illustrates','illustrate of','illustration','illustrative'], a:0, why:'"Illustrate" = ilustrar, ejemplificar.'},
      {q:'The author never says it, but the text ____ that he disagreed.', o:['implies','infers','impliqued','implicates in'], a:0, why:'"Imply" lo hace el texto; "infer" lo hace el lector.'},
      {q:'The word ____ from Latin.', o:['derives','derivates','derivation of','derived of'], a:0, why:'"Derive from" = proceder de.'},
      {q:'Historians ____ the decline to poor harvests.', o:['attribute','attributed of','attribution','attributive'], a:0, why:'"Attribute A to B" = atribuir A a B.'},
      {q:'These three factors ____ the core of the argument.', o:['constitute','constitution of','consist','constitutive'], a:0, why:'"Constitute" = constituir. "Consist" necesitaría "of".'},
      {q:'A single assumption ____ the entire theory.', o:['underpins','underpasses','undertakes','underlies of'], a:0, why:'"Underpin" = sustentar, servir de base.'},
    ]},
    { unit: 9, topic: 'Vocabulary · Subtle distinctions', items: [
      {q:'The wording is ____ — it could mean two different things.', o:['ambiguous','ambitious','ambivalent','amphibious'], a:0, why:'"Ambiguous" = ambiguo (el texto). "Ambivalent" son sentimientos encontrados.'},
      {q:'She feels ____ about moving: excited and afraid at once.', o:['ambivalent','ambiguous','ambitious','ambient'], a:0, why:'"Ambivalent" = con sentimientos contradictorios.'},
      {q:'The criticism was never stated; it was only ____.', o:['implicit','explicit','implicated','impliable'], a:0, why:'"Implicit" = implícito.'},
      {q:'The contract is ____ about who pays the costs.', o:['explicit','implicit','exploited','expressive of'], a:0, why:'"Explicit" = explícito, dicho con claridad.'},
      {q:'That is a ____ explanation, though we cannot prove it.', o:['plausible','plausive','possible of','probable to'], a:0, why:'"Plausible" = verosímil, creíble.'},
      {q:'His account of events seems rather ____.', o:['dubious','doubtless','doubtful of','dubitable'], a:0, why:'"Dubious" = dudoso, poco fiable.'},
    ]},
    { unit: 12, topic: 'Vocabulary · Abstract collocations', items: [
      {q:'Several parents ____ concerns about the new timetable.', o:['raised','rose','lifted','elevated'], a:0, why:'"Raise concerns" = plantear preocupaciones. "Rise" no lleva objeto.'},
      {q:'The product failed to ____ expectations.', o:['meet','reach to','accomplish of','fill'], a:0, why:'"Meet expectations" = cumplir las expectativas.'},
      {q:'Burning waste can ____ a risk to health.', o:['pose','put','make of','give'], a:0, why:'"Pose a risk" = suponer un riesgo.'},
      {q:'It is too early to ____ firm conclusions.', o:['draw','take','make of','pull'], a:0, why:'"Draw conclusions" = sacar conclusiones.'},
      {q:'The committee finally ____ consensus after hours of debate.', o:['reached','arrived','got to of','achieved to'], a:0, why:'"Reach consensus" = alcanzar un consenso.'},
      {q:'Managers must ____ responsibility for these decisions.', o:['bear','carry of','hold on','support'], a:0, why:'"Bear responsibility" = asumir la responsabilidad.'},
    ]},
  ],
};

// Aplana un nivel a la forma que consume el motor de preguntas: cada ítem lleva su
// tema y la unidad a la que pertenece, igual que las preguntas de gramática.
export function vocabQuestions(level) {
  const sets = VOCAB[level] || [];
  const out = [];
  for (const s of sets) {
    for (const it of s.items) out.push({ ...it, topic: s.topic, unit: s.unit, key: `vocab-${s.unit}`, vocab: true });
  }
  return out;
}
