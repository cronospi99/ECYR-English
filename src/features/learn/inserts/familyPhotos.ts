/**
 * The three family portraits (public/visuals/family-*.webp), with where each
 * person is (x, y as % of the photo, at the face) and questions about how they
 * are related. Roles are from the children's point of view, as on the labels.
 */
export interface Person {
  name: string;
  role: string;
  es: string;
  x: number;
  y: number;
  /** One sentence the explorer reads aloud. */
  say: string;
}

export interface FamilyPhoto {
  id: string;
  title: string;
  intro: string;
  people: Person[];
  /** "Tap …": the answer is a person's name. */
  questions: { q: string; a: string }[];
}

export const FAMILY_PHOTOS: FamilyPhoto[] = [
  {
    id: 'family-living-room',
    title: 'The Ortiz Family at Home',
    intro: 'Three generations in the living room: grandparents, parents, an uncle, a cousin and two children.',
    people: [
      { name: 'Carlos', role: 'grandfather', es: 'abuelo', x: 26, y: 12, say: 'This is Carlos. He is Santiago and Valentina’s grandfather. He’s wearing a navy sweater.' },
      { name: 'Elena', role: 'grandmother', es: 'abuela', x: 34, y: 22, say: 'This is Elena. She is the children’s grandmother and Carlos’s wife.' },
      { name: 'Andrés', role: 'father', es: 'padre', x: 51, y: 13, say: 'This is Andrés. He is the father. He has got a beard and a big smile.' },
      { name: 'Lucía', role: 'mother', es: 'madre', x: 59, y: 21, say: 'This is Lucía. She is the mother and Andrés’s wife. She has got long dark hair.' },
      { name: 'Mateo', role: 'uncle', es: 'tío', x: 74, y: 12, say: 'This is Mateo, the uncle. He is Andrés’s brother. He’s wearing a blue hoodie.' },
      { name: 'Santiago', role: 'son', es: 'hijo', x: 38, y: 45, say: 'This is Santiago. He is Andrés and Lucía’s son. He’s wearing a striped T-shirt.' },
      { name: 'Valentina', role: 'daughter', es: 'hija', x: 49, y: 47, say: 'This is Valentina. She is the daughter. She’s wearing a pink dress.' },
      { name: 'Camila', role: 'cousin', es: 'prima', x: 67, y: 43, say: 'This is Camila, the cousin. She is Mateo’s daughter.' },
    ],
    questions: [
      { q: 'Tap Santiago’s grandfather.', a: 'Carlos' },
      { q: 'Tap Valentina’s mother.', a: 'Lucía' },
      { q: 'Tap the children’s uncle.', a: 'Mateo' },
      { q: 'Tap Lucía’s husband.', a: 'Andrés' },
      { q: 'Tap Carlos’s wife.', a: 'Elena' },
      { q: 'Tap Santiago’s sister.', a: 'Valentina' },
      { q: 'Tap Valentina’s cousin.', a: 'Camila' },
      { q: 'Tap Elena’s grandson.', a: 'Santiago' },
    ],
  },
  {
    id: 'family-garden',
    title: 'The Herrera Family in the Garden',
    intro: 'A sunny afternoon at the grandparents’ house — with Max the dog and Mía the cat.',
    people: [
      { name: 'Daniel', role: 'uncle', es: 'tío', x: 23, y: 11, say: 'This is Daniel, the uncle. He is Mariana’s brother. He’s wearing a green shirt.' },
      { name: 'Sofía', role: 'cousin', es: 'prima', x: 31, y: 20, say: 'This is Sofía, the cousin. She is Daniel’s daughter.' },
      { name: 'Mariana', role: 'mother', es: 'madre', x: 43, y: 19, say: 'This is Mariana, the mother. She has got long dark hair.' },
      { name: 'Fernando', role: 'father', es: 'padre', x: 51, y: 12, say: 'This is Fernando, the father. He is Mariana’s husband.' },
      { name: 'Isabel', role: 'grandmother', es: 'abuela', x: 70, y: 24, say: 'This is Isabel, the grandmother. She has got grey hair.' },
      { name: 'Rogelio', role: 'grandfather', es: 'abuelo', x: 80, y: 13, say: 'This is Rogelio, the grandfather. He’s wearing glasses and a cap.' },
      { name: 'Simón', role: 'son', es: 'hijo', x: 48.5, y: 52, say: 'This is Simón. He is Fernando and Mariana’s son.' },
      { name: 'Emilia', role: 'daughter', es: 'hija', x: 63, y: 54, say: 'This is Emilia, the daughter. She’s wearing a flowery dress.' },
      { name: 'Max', role: 'dog', es: 'perro', x: 25, y: 79, say: 'This is Max, the family dog. He is very friendly.' },
      { name: 'Mía', role: 'cat', es: 'gata', x: 79, y: 86, say: 'This is Mía, the family cat.' },
    ],
    questions: [
      { q: 'Tap Emilia’s grandmother.', a: 'Isabel' },
      { q: 'Tap Simón’s father.', a: 'Fernando' },
      { q: 'Tap the children’s cousin.', a: 'Sofía' },
      { q: 'Tap Mariana’s brother.', a: 'Daniel' },
      { q: 'Tap Isabel’s husband.', a: 'Rogelio' },
      { q: 'Tap Emilia’s brother.', a: 'Simón' },
      { q: 'Tap the family’s dog.', a: 'Max' },
      { q: 'Tap Fernando’s daughter.', a: 'Emilia' },
    ],
  },
  {
    id: 'family-multicultural',
    title: 'A Multicultural Family',
    intro: 'A family with roots in four countries, together on the living-room rug.',
    people: [
      { name: 'Aiko', role: 'grandmother', es: 'abuela', x: 21.5, y: 20, say: 'This is Aiko, the grandmother. She is from Japan.' },
      { name: 'Marcus', role: 'father', es: 'padre', x: 36.5, y: 18, say: 'This is Marcus, the father. He is Aiko’s son-in-law.' },
      { name: 'Valentina', role: 'mother', es: 'madre', x: 47.5, y: 24, say: 'This is Valentina, the mother. She has got long curly hair.' },
      { name: 'Liam', role: 'uncle', es: 'tío', x: 61, y: 19, say: 'This is Liam, the uncle. He is Priya’s husband.' },
      { name: 'Priya', role: 'aunt', es: 'tía', x: 73.5, y: 13, say: 'This is Priya, the aunt. She is wearing a beautiful sari.' },
      { name: 'Omar', role: 'grandfather', es: 'abuelo', x: 85, y: 28, say: 'This is Omar, the grandfather. He’s wearing a white headscarf.' },
      { name: 'Noah', role: 'son', es: 'hijo', x: 30.5, y: 41, say: 'This is Noah, the son. He’s wearing a white hoodie.' },
      { name: 'Isabella', role: 'daughter', es: 'hija', x: 49.5, y: 45, say: 'This is Isabella, the daughter. She has got long dark hair.' },
      { name: 'Maya', role: 'cousin', es: 'prima', x: 69, y: 42, say: 'This is Maya, the cousin. She is Liam and Priya’s daughter.' },
      { name: 'Buddy', role: 'dog', es: 'perro', x: 19.5, y: 72, say: 'This is Buddy, the dog.' },
    ],
    questions: [
      { q: 'Tap Noah’s aunt.', a: 'Priya' },
      { q: 'Tap Isabella’s grandfather.', a: 'Omar' },
      { q: 'Tap Marcus’s wife.', a: 'Valentina' },
      { q: 'Tap Priya’s husband.', a: 'Liam' },
      { q: 'Tap Liam and Priya’s daughter.', a: 'Maya' },
      { q: 'Tap Isabella’s brother.', a: 'Noah' },
      { q: 'Tap the children’s grandmother from Japan.', a: 'Aiko' },
      { q: 'Tap Valentina’s son.', a: 'Noah' },
    ],
  },
];
