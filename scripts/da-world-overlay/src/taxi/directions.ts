/**
 * Taxi Rush — "Asking and giving directions" phrase bank (data only).
 *
 * Coastal city: boardwalk, pier, beach, palms. British spelling (metres).
 * TTS rules: no digits, no "&", no "$" — numbers and ordinals are written as
 * words. Placeholders in braces are replaced by the game before display/TTS:
 *   {place}    a destination name from CENTRE_PLACES / NEW_PLACES (e.g. "Pepe's Bakery")
 *   {landmark} a landmark name, with its article if it needs one ("the pier", "Cine Estrella")
 *   {street}   a street name, bare ("Ocean Drive", "Palm Avenue")
 * GPS lines are at most eight words (placeholders count as one word).
 */

export type CefrLevel = 'A1' | 'A2' | 'B1';

export interface Phrase {
  id: string;
  /** English text, may contain {place}, {landmark} or {street}. */
  text: string;
  /** Short Spanish translation (optional, for the hint/review screen). */
  es?: string;
  level: CefrLevel;
}

// ---------------------------------------------------------------- pickup

export type PickupKind = 'request' | 'question';
export type PickupTone = 'polite' | 'neutral' | 'friendly' | 'urgent';

export interface PickupLine extends Phrase {
  kind: PickupKind;
  tone: PickupTone;
}

const p = (
  id: string,
  kind: PickupKind,
  tone: PickupTone,
  level: CefrLevel,
  text: string,
  es: string,
): PickupLine => ({ id, kind, tone, level, text, es });

/** What the passenger says when getting in. All contain {place}. */
export const PICKUP_LINES: PickupLine[] = [
  // A1 — short, direct
  p('pk01', 'request', 'polite', 'A1', 'Take me to {place}, please!', '¡Lléveme a {place}, por favor!'),
  p('pk02', 'request', 'neutral', 'A1', '{place}, please.', '{place}, por favor.'),
  p('pk03', 'request', 'neutral', 'A1', 'To {place}, please.', 'A {place}, por favor.'),
  p('pk04', 'request', 'friendly', 'A1', 'Hello! {place}, please.', '¡Hola! {place}, por favor.'),
  p('pk05', 'request', 'polite', 'A1', 'Go to {place}, please.', 'Vaya a {place}, por favor.'),
  p('pk06', 'request', 'urgent', 'A1', 'Quick! Go to {place}!', '¡Rápido! ¡Vaya a {place}!'),
  p('pk07', 'request', 'friendly', 'A1', 'Hi! I want to go to {place}.', '¡Hola! Quiero ir a {place}.'),
  p('pk08', 'request', 'neutral', 'A1', 'I need to go to {place}.', 'Necesito ir a {place}.'),
  p('pk09', 'question', 'polite', 'A1', 'Can you take me to {place}?', '¿Puede llevarme a {place}?'),
  p('pk10', 'question', 'neutral', 'A1', 'Can we go to {place}, please?', '¿Podemos ir a {place}, por favor?'),
  p('pk11', 'request', 'urgent', 'A1', 'Hurry, please! {place}!', '¡Dese prisa, por favor! ¡{place}!'),
  p('pk12', 'request', 'friendly', 'A1', 'Good morning! {place}, please.', '¡Buenos días! {place}, por favor.'),
  // A2 — polite forms, simple questions, reasons
  p('pk13', 'question', 'polite', 'A2', 'How do we get to {place}?', '¿Cómo llegamos a {place}?'),
  p('pk14', 'question', 'polite', 'A2', 'Could you take me to {place}?', '¿Podría llevarme a {place}?'),
  p('pk15', 'question', 'polite', 'B1', 'Could you head towards {place}, please?', '¿Podría ir hacia {place}?'),
  p('pk16', 'question', 'neutral', 'A2', 'Do you know {place}? I need to go there.', '¿Conoce {place}? Necesito ir allí.'),
  p('pk17', 'question', 'neutral', 'A2', 'Do you know the way to {place}?', '¿Sabe cómo llegar a {place}?'),
  p('pk18', 'question', 'neutral', 'A2', 'Is {place} far from here?', '¿Está lejos {place}?'),
  p('pk19', 'question', 'neutral', 'A2', 'How long to {place}?', '¿Cuánto se tarda hasta {place}?'),
  p('pk20', 'request', 'urgent', 'A2', "I'm late! Please hurry to {place}!", '¡Voy tarde! ¡Rápido a {place}!'),
  p('pk21', 'request', 'urgent', 'A2', 'Please be quick. I need to be at {place}!', 'Sea rápido, por favor. ¡Necesito estar en {place}!'),
  p('pk22', 'request', 'friendly', 'A2', "Hi! I'm going to {place}. Can you take me?", 'Hola, voy a {place}. ¿Me lleva?'),
  p('pk23', 'request', 'polite', 'A2', "I'd like to go to {place}, please.", 'Quisiera ir a {place}, por favor.'),
  p('pk24', 'request', 'polite', 'A2', "I'd like to get to {place}, please.", 'Quisiera llegar a {place}, por favor.'),
  p('pk25', 'request', 'friendly', 'A1', "Nice car! Take me to {place}, please.", '¡Qué buen auto! Lléveme a {place}, por favor.'),
  p('pk26', 'request', 'neutral', 'A2', "I'm meeting a friend at {place}.", 'Voy a ver a un amigo en {place}.'),
  p('pk27', 'request', 'neutral', 'A2', "I'm going to {place}. Is that OK?", 'Voy a {place}. ¿Está bien?'),
  p('pk28', 'question', 'polite', 'A2', 'Excuse me, can you drive me to {place}?', 'Disculpe, ¿me lleva a {place}?'),
  p('pk29', 'request', 'polite', 'A2', 'Take me to {place}, if you can.', 'Lléveme a {place}, si puede.'),
  p('pk30', 'request', 'urgent', 'A2', 'Go, go! I need to get to {place} now!', '¡Vamos, vamos! ¡Necesito llegar a {place} ya!'),
  // B1 — fuller structures, indirect questions, softeners
  p('pk31', 'question', 'polite', 'B1', 'Could you tell me the best way to {place}?', '¿Me diría la mejor ruta a {place}?'),
  p('pk32', 'question', 'polite', 'B1', 'Would you mind taking me to {place}?', '¿Le importaría llevarme a {place}?'),
  p('pk33', 'question', 'polite', 'B1', 'Do you know how to get to {place}?', '¿Sabe cómo llegar a {place}?'),
  p('pk34', 'question', 'polite', 'B1', 'Could you tell me how far {place} is?', '¿Podría decirme a qué distancia está {place}?'),
  p('pk35', 'question', 'neutral', 'B1', "What's the quickest way to {place}?", '¿Cuál es la ruta más rápida a {place}?'),
  p('pk36', 'question', 'neutral', 'B1', 'Which way should we go to {place}?', '¿Por dónde vamos a {place}?'),
  p('pk37', 'request', 'urgent', 'B1', 'I have to be at {place} in ten minutes!', '¡Debo estar en {place} en diez minutos!'),
  p('pk38', 'request', 'urgent', 'B1', "I'm running late. Could you get me to {place} quickly?", 'Voy tarde. ¿Podría llevarme rápido a {place}?'),
  p('pk39', 'request', 'urgent', 'B1', 'Please get me to {place} as fast as you can!', '¡Lléveme a {place} lo más rápido posible!'),
  p('pk40', 'request', 'polite', 'B1', 'I was hoping you could take me to {place}.', 'Esperaba que pudiera llevarme a {place}.'),
  p('pk41', 'request', 'friendly', 'B1', "Hello! I'd love a ride to {place}, please.", '¡Hola! Me encantaría ir a {place}, por favor.'),
  p('pk42', 'request', 'friendly', 'B1', "Hi there! I'm heading to {place}. Can you help?", '¡Hola! Voy hacia {place}. ¿Me ayuda?'),
  p('pk43', 'request', 'neutral', 'B1', "I need to get to {place}. What's the best route?", 'Necesito llegar a {place}. ¿Cuál es la mejor ruta?'),
  p('pk44', 'question', 'polite', 'B1', 'Would you be able to drop me at {place}?', '¿Podría dejarme en {place}?'),
  p('pk45', 'request', 'neutral', 'B1', "Please take the fastest route to {place}. I'm in a hurry.", 'Tome la ruta más rápida a {place}, por favor. Tengo prisa.'),
];

// ------------------------------------------------------------------- GPS

export type DirectionCueKey =
  | 'left'
  | 'right'
  | 'straight'
  | 'uTurn'
  | 'takeFirstLeft'
  | 'takeSecondLeft'
  | 'takeThirdLeft'
  | 'takeFirstRight'
  | 'takeSecondRight'
  | 'takeThirdRight'
  | 'pastLandmark'
  | 'alongStreet'
  | 'endOfStreet'
  | 'acrossBridge'
  | 'throughTunnel'
  | 'merge'
  | 'exit'
  | 'almostLeft'
  | 'almostRight'
  | 'arrived';

/**
 * A GPS callout. `near` lines already include a spoken distance.
 * `noDistance` = do not prepend a GPS_DISTANCE_PREFIXES opener (urgent or already-near lines).
 * Integrator notes: when a distance prefix is prepended, lowercase the first letter of the cue
 * ("In fifty metres, turn left."). In `es`, {landmark}/{street} must be replaced by a Spanish
 * name, or the `es` text must not be shown.
 */
export interface DirectionCue extends Phrase {
  near?: boolean;
  noDistance?: boolean;
}

const g = (
  id: string,
  level: CefrLevel,
  text: string,
  es: string,
  near = false,
  noDistance = false,
): DirectionCue => ({
  id,
  level,
  text,
  es,
  ...(near ? { near: true } : {}),
  ...(noDistance ? { noDistance: true } : {}),
});

/** At most eight words per line. 3–5 variants per key. */
export const GPS_CUES: Record<DirectionCueKey, DirectionCue[]> = {
  left: [
    g('l1', 'A1', 'Turn left.', 'Gire a la izquierda.'),
    g('l2', 'A1', 'Turn left now!', '¡Gire a la izquierda ya!', false, true),
    g('l3', 'A1', 'Left here.', 'Aquí a la izquierda.'),
    g('l4', 'A2', 'Turn left at the corner.', 'Gire a la izquierda en la esquina.'),
    g('l5', 'A2', 'In one hundred metres, turn left.', 'En cien metros, gire a la izquierda.', true, true),
  ],
  right: [
    g('r1', 'A1', 'Turn right.', 'Gire a la derecha.'),
    g('r2', 'A1', 'Turn right now!', '¡Gire a la derecha ya!', false, true),
    g('r3', 'A1', 'Right here.', 'Aquí a la derecha.'),
    g('r4', 'A2', 'Turn right at the corner.', 'Gire a la derecha en la esquina.'),
    g('r5', 'A2', 'In one hundred metres, turn right.', 'En cien metros, gire a la derecha.', true, true),
  ],
  straight: [
    g('s1', 'A1', 'Go straight on.', 'Siga recto.'),
    g('s2', 'A1', 'Keep going straight.', 'Siga recto.'),
    g('s3', 'A1', 'Go straight ahead.', 'Siga de frente.'),
    g('s4', 'A2', 'Go straight on for two hundred metres.', 'Siga recto doscientos metros.', true, true),
  ],
  uTurn: [
    g('u1', 'A2', 'Turn around.', 'Dé la vuelta.'),
    g('u2', 'A2', 'Make a U-turn.', 'Dé media vuelta.'),
    g('u3', 'A2', 'Turn around when you can.', 'Dé la vuelta cuando pueda.'),
    g('u4', 'B1', 'When possible, make a U-turn.', 'Cuando sea posible, dé media vuelta.'),
  ],
  takeFirstLeft: [
    g('fl1', 'A2', 'Take the first left.', 'Tome la primera a la izquierda.'),
    g('fl2', 'A2', 'Take the first street on the left.', 'Tome la primera calle a la izquierda.'),
    g('fl3', 'A2', 'The first left, please.', 'La primera a la izquierda.'),
    g('fl4', 'A2', 'Turn left at the next street.', 'Gire a la izquierda en la próxima calle.'),
  ],
  takeSecondLeft: [
    g('sl1', 'A2', 'Take the second left.', 'Tome la segunda a la izquierda.'),
    g('sl2', 'A2', 'Take the second street on the left.', 'Tome la segunda calle a la izquierda.'),
    g('sl3', 'A2', 'Go past the first street, then turn left.', 'Pase la primera calle y gire a la izquierda.'),
    g('sl4', 'A2', 'The second left, please.', 'La segunda a la izquierda.'),
  ],
  takeThirdLeft: [
    g('tl1', 'B1', 'Take the third left.', 'Tome la tercera a la izquierda.'),
    g('tl2', 'B1', 'Take the third street on the left.', 'Tome la tercera calle a la izquierda.'),
    g('tl3', 'B1', 'Go past two streets, then turn left.', 'Pase dos calles y gire a la izquierda.'),
  ],
  takeFirstRight: [
    g('fr1', 'A2', 'Take the first right.', 'Tome la primera a la derecha.'),
    g('fr2', 'A2', 'Take the first street on the right.', 'Tome la primera calle a la derecha.'),
    g('fr3', 'A2', 'The first right, please.', 'La primera a la derecha.'),
    g('fr4', 'A2', 'Turn right at the next street.', 'Gire a la derecha en la próxima calle.'),
  ],
  takeSecondRight: [
    g('sr1', 'A2', 'Take the second right.', 'Tome la segunda a la derecha.'),
    g('sr2', 'A2', 'Take the second street on the right.', 'Tome la segunda calle a la derecha.'),
    g('sr3', 'A2', 'Go past the first street, then turn right.', 'Pase la primera calle y gire a la derecha.'),
    g('sr4', 'A2', 'The second right, please.', 'La segunda a la derecha.'),
  ],
  takeThirdRight: [
    g('tr1', 'B1', 'Take the third right.', 'Tome la tercera a la derecha.'),
    g('tr2', 'B1', 'Take the third street on the right.', 'Tome la tercera calle a la derecha.'),
    g('tr3', 'B1', 'Go past two streets, then turn right.', 'Pase dos calles y gire a la derecha.'),
  ],
  pastLandmark: [
    g('pl1', 'A2', 'Go past {landmark}.', 'Pase por delante de {landmark}.'),
    g('pl2', 'A2', 'Drive past {landmark}.', 'Deje atrás {landmark}.'),
    g('pl3', 'A2', 'Go past {landmark}, then keep going.', 'Pase {landmark} y siga.'),
    g('pl4', 'B1', 'You will pass {landmark} on your left.', 'Pasará {landmark} a su izquierda.'),
    g('pl5', 'B1', 'After {landmark}, keep straight on.', 'Después de {landmark}, siga recto.'),
  ],
  alongStreet: [
    g('as1', 'A2', 'Go along {street}.', 'Siga por {street}.'),
    g('as2', 'A2', 'Drive along {street}.', 'Conduzca por {street}.'),
    g('as3', 'B1', 'Stay on {street} until the end.', 'Quédese en {street} hasta el final.'),
    g('as4', 'B1', 'Stay on {street} until you reach {landmark}.', 'Siga por {street} hasta llegar a {landmark}.'),
  ],
  endOfStreet: [
    g('es1', 'A2', 'Go to the end of the street.', 'Vaya hasta el final de la calle.'),
    g('es2', 'A2', 'Drive to the end of the street.', 'Conduzca hasta el final de la calle.'),
    g('es3', 'A2', 'Keep going to the end of the street.', 'Siga hasta el final de la calle.'),
    g('es4', 'B1', 'Carry on to the end of the road.', 'Continúe hasta el final de la calle.'),
  ],
  acrossBridge: [
    g('ab1', 'A2', 'Go across the bridge.', 'Cruce el puente.'),
    g('ab2', 'A2', 'Cross the bridge.', 'Cruce el puente.'),
    g('ab3', 'A2', 'Go over the bridge.', 'Pase sobre el puente.'),
    g('ab4', 'A2', 'Drive across the bridge towards {landmark}.', 'Cruce el puente hacia {landmark}.'),
  ],
  throughTunnel: [
    g('tt1', 'A2', 'Go through the tunnel.', 'Atraviese el túnel.'),
    g('tt2', 'A2', 'Drive through the tunnel.', 'Conduzca por el túnel.'),
    g('tt3', 'A2', 'Go through the tunnel, then keep going.', 'Cruce el túnel y siga.'),
    g('tt4', 'B1', 'Go straight through the tunnel.', 'Siga recto por el túnel.'),
  ],
  merge: [
    g('m1', 'B1', 'Merge onto the coast road.', 'Incorpórese a la carretera costera.'),
    g('m2', 'B1', 'Merge onto the main road.', 'Incorpórese a la vía principal.'),
    g('m3', 'B1', 'Merge onto {street}.', 'Incorpórese a {street}.'),
    g('m4', 'B1', 'Merge onto the seafront road.', 'Incorpórese a la avenida costera.'),
  ],
  exit: [
    g('x1', 'B1', 'Exit at the next junction.', 'Salga en el próximo cruce.'),
    g('x2', 'B1', 'Take the next exit.', 'Tome la próxima salida.'),
    g('x3', 'B1', 'Take the exit towards {landmark}.', 'Tome la salida hacia {landmark}.'),
    g('x4', 'B1', 'Take the exit for {street}.', 'Tome la salida hacia {street}.'),
  ],
  almostLeft: [
    g('al1', 'A1', 'Left turn ahead.', 'Giro a la izquierda adelante.'),
    g('al2', 'A2', 'Get ready to turn left.', 'Prepárese para girar a la izquierda.'),
    g('al3', 'A2', 'Turn left in fifty metres.', 'Gire a la izquierda en cincuenta metros.', true, true),
    g('al4', 'B1', 'Left turn coming up.', 'Se acerca un giro a la izquierda.'),
  ],
  almostRight: [
    g('ar1', 'A1', 'Right turn ahead.', 'Giro a la derecha adelante.'),
    g('ar2', 'A2', 'Get ready to turn right.', 'Prepárese para girar a la derecha.'),
    g('ar3', 'A2', 'Turn right in fifty metres.', 'Gire a la derecha en cincuenta metros.', true, true),
    g('ar4', 'B1', 'Right turn coming up.', 'Se acerca un giro a la derecha.'),
  ],
  arrived: [
    g('ad1', 'A1', 'You have arrived.', 'Ha llegado.'),
    g('ad2', 'A1', 'Here we are!', '¡Ya llegamos!'),
    g('ad3', 'A2', 'You have reached your destination.', 'Ha llegado a su destino.'),
    g('ad4', 'A2', 'You have arrived at {place}.', 'Ha llegado a {place}.'),
  ],
};

/** Optional spoken distance openers, for the game to prepend to a plain cue. */
export const GPS_DISTANCE_PREFIXES: string[] = [
  'In fifty metres,',
  'In one hundred metres,',
  'In two hundred metres,',
  'In five hundred metres,',
];

// ------------------------------------------------- arrival and reactions

export type ReactionKey = 'onTime' | 'late' | 'crash' | 'wrongTurn';

export type ReactionMood = 'happy' | 'neutral' | 'angry' | 'scared';

export interface Reaction extends Phrase {
  mood: ReactionMood;
}

const rx = (id: string, mood: ReactionMood, level: CefrLevel, text: string, es: string): Reaction => ({
  id,
  mood,
  level,
  text,
  es,
});

export const REACTIONS: Record<ReactionKey, Reaction[]> = {
  onTime: [
    rx('ot1', 'happy', 'A1', 'Great! Thank you!', '¡Genial! ¡Gracias!'),
    rx('ot2', 'happy', 'A1', "Perfect! I'm on time.", '¡Perfecto! Llego a tiempo.'),
    rx('ot3', 'happy', 'A1', "Good job! Here's a tip.", '¡Buen trabajo! Aquí tiene una propina.'),
    rx('ot4', 'happy', 'A2', "You're a great driver!", '¡Es un gran conductor!'),
    rx('ot5', 'happy', 'A2', 'That was fast. Thanks a lot!', 'Qué rápido. ¡Muchas gracias!'),
    rx('ot6', 'happy', 'A2', 'Right on time. Well done!', 'Justo a tiempo. ¡Bien hecho!'),
    rx('ot7', 'happy', 'B1', 'Brilliant! I made it with time to spare.', '¡Genial! Llegué con tiempo de sobra.'),
  ],
  late: [
    rx('lt1', 'angry', 'A1', "Oh no! I'm late.", '¡Oh no! Llego tarde.'),
    rx('lt2', 'angry', 'A1', "You're too slow!", '¡Es demasiado lento!'),
    rx('lt3', 'neutral', 'A2', "We're late, but it's OK.", 'Llegamos tarde, pero está bien.'),
    rx('lt4', 'angry', 'A2', "I'm late because of you!", '¡Llego tarde por su culpa!'),
    rx('lt5', 'angry', 'A2', 'That took too long. No tip!', 'Tardó demasiado. ¡Sin propina!'),
    rx('lt6', 'neutral', 'A2', 'Thanks, but I missed the start.', 'Gracias, pero me perdí el inicio.'),
    rx('lt7', 'angry', 'B1', 'You should have driven faster.', 'Debería haber conducido más rápido.'),
  ],
  crash: [
    rx('cr1', 'scared', 'A1', 'Watch out!', '¡Cuidado!'),
    rx('cr2', 'scared', 'A1', 'Oh no! Be careful!', '¡Oh no! ¡Tenga cuidado!'),
    rx('cr3', 'angry', 'A1', 'Stop! That was terrible!', '¡Pare! ¡Eso fue terrible!'),
    rx('cr4', 'scared', 'A2', 'Are you OK? Please slow down!', '¿Está bien? ¡Más despacio!'),
    rx('cr5', 'angry', 'A2', "Be careful! I don't want to get hurt.", '¡Cuidado! No quiero hacerme daño.'),
    rx('cr6', 'scared', 'A2', 'Ouch! Please drive more carefully.', '¡Ay! Conduzca con más cuidado.'),
    rx('cr7', 'angry', 'B1', 'That was dangerous! Please pay attention.', '¡Eso fue peligroso! Preste atención.'),
  ],
  wrongTurn: [
    rx('wt1', 'neutral', 'A1', 'No, not this way!', '¡No, por aquí no!'),
    rx('wt2', 'neutral', 'A1', 'Wrong way! Turn around.', '¡Por aquí no es! Dé la vuelta.'),
    rx('wt3', 'neutral', 'A2', 'Oh no, this is the wrong street.', 'Oh, no, nos equivocamos de calle.'),
    rx('wt4', 'angry', 'A2', "We're lost! Listen to the GPS!", '¡Estamos perdidos! ¡Escuche el GPS!'),
    rx('wt5', 'neutral', 'A2', 'I think you missed the turn.', 'Creo que se le pasó el giro.'),
    rx('wt6', 'neutral', 'A2', 'That was the wrong turn. Try again.', 'Fue el giro equivocado. Intente otra vez.'),
    rx('wt7', 'neutral', 'B1', 'I think we should have turned at that corner.', 'Creo que debimos girar en esa esquina.'),
  ],
};

// ------------------------------------------------------------------ utils

/** Pure, deterministic pick: the same seed always gives the same item. */
export function pick<T>(list: readonly T[], seed: number): T {
  if (list.length === 0) throw new Error('pick: empty list');
  // mulberry32-style integer hash, so nearby seeds do not give nearby indices
  let t = (seed | 0) + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return list[Math.floor(r * list.length)];
}
