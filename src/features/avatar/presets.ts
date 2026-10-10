import type { BgId, BuilderParams } from './options';

export interface BuilderPreset {
  name: string;
  bg: BgId;
  params: BuilderParams;
}

const base: BuilderParams = {
  skin: 'sand',
  face: 'round',
  hair: 'short',
  hairColor: 'darkbrown',
  brows: 'natural',
  eyes: 'round',
  eyeColor: 'dark',
  mouth: 'smile',
  facialHair: 'none',
  glasses: 'none',
  headwear: 'none',
  earrings: 'none',
  clothing: 'hoodie',
  clothingColor: 'black',
};

const p = (name: string, bg: BgId, over: Partial<BuilderParams>): BuilderPreset => ({ name, bg, params: { ...base, ...over } });

/** Characters inspired by the reference portraits. */
export const PRESETS: BuilderPreset[] = [
  p('Leo', 'blue', { hair: 'short', hairColor: 'black', brows: 'thick', clothing: 'hoodie', clothingColor: 'black' }),
  p('Sofía', 'pink', { skin: 'ivory', face: 'oval', hair: 'wavy', hairColor: 'brown', eyes: 'lashes', brows: 'arched', clothing: 'sweater', clothingColor: 'cream' }),
  p('Mateo', 'lavender', { skin: 'ivory', hair: 'sidepart', hairColor: 'brown', glasses: 'round', clothing: 'denim', clothingColor: 'cream' }),
  p('Emma', 'cream', { skin: 'porcelain', face: 'oval', hair: 'bun', hairColor: 'blonde', eyes: 'lashes', brows: 'arched', clothing: 'turtleneck', clothingColor: 'black', earrings: 'studs' }),
  p('Diego', 'mint', { skin: 'honey', face: 'square', hair: 'curly', hairColor: 'black', brows: 'thick', facialHair: 'stubble', clothing: 'tshirt', clothingColor: 'black', mouth: 'smirk' }),
  p('Valentina', 'sky', { skin: 'ivory', face: 'oval', hair: 'long', hairColor: 'darkbrown', eyes: 'lashes', brows: 'arched', clothing: 'tshirt', clothingColor: 'white', earrings: 'hoops' }),
  p('Kenji', 'periwinkle', { skin: 'sand', hair: 'sidepart', hairColor: 'black', glasses: 'round', clothing: 'hoodie', clothingColor: 'gray', brows: 'straight' }),
  p('Lucía', 'peach', { skin: 'caramel', face: 'oval', hair: 'ponytail', hairColor: 'black', eyes: 'lashes', brows: 'arched', clothing: 'hoodie', clothingColor: 'black', earrings: 'studs' }),
  p('Tomás', 'sky', { skin: 'ivory', hair: 'short', hairColor: 'brown', mouth: 'grin', clothing: 'tshirt', clothingColor: 'navy', eyeColor: 'hazel' }),
  p('Camila', 'lilac', { skin: 'ivory', face: 'oval', hair: 'long', hairColor: 'black', glasses: 'round', eyes: 'lashes', brows: 'arched', clothing: 'sweater', clothingColor: 'cream' }),
  p('Gael', 'blue', { skin: 'honey', face: 'square', hair: 'curly', hairColor: 'black', glasses: 'square', facialHair: 'beard', clothing: 'tshirt', clothingColor: 'black', mouth: 'grin' }),
  p('Ana', 'pink', { skin: 'sand', face: 'oval', hair: 'long', hairColor: 'darkbrown', headwear: 'cap', eyes: 'lashes', brows: 'arched', clothing: 'hoodie', clothingColor: 'black' }),
  p('Olivia', 'peach', { skin: 'ivory', face: 'oval', hair: 'wavy', hairColor: 'blonde', eyes: 'lashes', brows: 'arched', eyeColor: 'blue', clothing: 'tshirt', clothingColor: 'cream', mouth: 'grin' }),
  p('Zoe', 'candy', { skin: 'caramel', face: 'round', hair: 'curlylong', hairColor: 'auburn', eyes: 'happy', brows: 'natural', clothing: 'sweater', clothingColor: 'skyblue', mouth: 'grin', earrings: 'studs' }),
  p('Amara', 'aurora', { skin: 'umber', face: 'round', hair: 'afro', hairColor: 'black', eyes: 'lashes', brows: 'arched', clothing: 'sweater', clothingColor: 'mustard', earrings: 'hoops', mouth: 'grin' }),
  p('Max', 'brand', { skin: 'bronze', face: 'square', hair: 'buzz', hairColor: 'black', facialHair: 'moustache', clothing: 'blazer', clothingColor: 'navy', glasses: 'sunglasses' }),
];

export const DEFAULT_BUILDER: BuilderParams = PRESETS[0]!.params;
