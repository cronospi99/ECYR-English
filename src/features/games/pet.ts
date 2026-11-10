/* Animal avatars for the party games (Pass the Doodle, You Draw). One integer travels over the
   network: animal + colour + hat + face extra, packed as av = a + A·(c + C·(h + H·f)). */
export const ANIMALS = ['cat', 'dog', 'bear', 'rabbit', 'fox', 'panda', 'frog', 'pig', 'owl', 'penguin', 'lion', 'axolotl'] as const;
export const FURS = ['#ff9f43', '#a4b0be', '#b07a45', '#ffe3b8', '#ff8fb1', '#6ec6ff', '#7be0a6', '#b69cff'] as const;
export const HATS = ['none', 'tophat', 'crown', 'party', 'propeller', 'viking', 'chef', 'unicorn', 'halo', 'banana', 'flower', 'egg'] as const;
export const FACES = ['none', 'shades', 'hearts', 'monocle', 'mustache', 'patch', 'clown', 'bowtie', '3d', 'gum', 'googly'] as const;

const A = ANIMALS.length, C = FURS.length, H = HATS.length, F = FACES.length;
export const AV_MAX = A * C * H * F;

export interface Pet { a: number; c: number; h: number; f: number }
export const decodePet = (av: number): Pet => {
  let v = Math.abs(Math.floor(av)) % AV_MAX;
  const a = v % A; v = Math.floor(v / A);
  const c = v % C; v = Math.floor(v / C);
  const h = v % H; v = Math.floor(v / H);
  return { a, c, h, f: v % F };
};
export const encodePet = ({ a, c, h, f }: Pet) => a + A * (c + C * (h + H * f));
export const randomPet = () => encodePet({
  a: Math.floor(Math.random() * A), c: Math.floor(Math.random() * C),
  h: Math.floor(Math.random() * H), f: Math.floor(Math.random() * F),
});
/** Clamp an avatar number that came over the network. */
export const cleanAv = (x: unknown) => Math.max(0, Math.min(AV_MAX - 1, Number(x) | 0));

const KEY = 'pet:av';
export const savedPet = () => {
  try { const raw = localStorage.getItem(KEY); const v = raw === null ? NaN : Number(raw); return Number.isInteger(v) && v >= 0 && v < AV_MAX ? v : randomPet(); } catch { return randomPet(); }
};
export const storePet = (v: number) => { try { localStorage.setItem(KEY, String(v)); } catch { /* ignore */ } };
