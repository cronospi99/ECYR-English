/**
 * Every customisable avatar option lives here as a closed list of ids. The
 * store's `sanitizeAvatar` validates untrusted JSON against these lists, so
 * adding an option means adding it here (and drawing it in BuilderSvg).
 */

export interface Opt<Id extends string = string> {
  id: Id;
  label: string;
}
export interface ColorOpt<Id extends string = string> extends Opt<Id> {
  color: string;
}

const ids = <T extends readonly { id: string }[]>(list: T) => list.map((o) => o.id) as T[number]['id'][];

// ------------------------------------------------------------- background --

export const BACKGROUNDS = [
  { id: 'sky', label: 'Cielo', css: '#B3D6FB', swatch: '#B3D6FB' },
  { id: 'blue', label: 'Azul', css: '#86BEFB', swatch: '#86BEFB' },
  { id: 'periwinkle', label: 'Pervinca', css: '#B5C1FA', swatch: '#B5C1FA' },
  { id: 'lavender', label: 'Lavanda', css: '#D3C6FA', swatch: '#D3C6FA' },
  { id: 'lilac', label: 'Lila', css: '#DDB4F3', swatch: '#DDB4F3' },
  { id: 'pink', label: 'Rosa', css: '#F9B8D4', swatch: '#F9B8D4' },
  { id: 'peach', label: 'Melocotón', css: '#FCCDB0', swatch: '#FCCDB0' },
  { id: 'cream', label: 'Crema', css: '#F5DFC2', swatch: '#F5DFC2' },
  { id: 'lemon', label: 'Limón', css: '#F8EAA6', swatch: '#F8EAA6' },
  { id: 'mint', label: 'Menta', css: '#BFEED3', swatch: '#BFEED3' },
  { id: 'cloud', label: 'Nube', css: '#E5E5EA', swatch: '#E5E5EA' },
  { id: 'graphite', label: 'Grafito', css: '#3A3A3C', swatch: '#3A3A3C' },
  { id: 'brand', label: 'ECYR', css: 'linear-gradient(135deg,#1A7CFF,#A35CFF)', swatch: 'linear-gradient(135deg,#1A7CFF,#A35CFF)' },
  { id: 'ocean', label: 'Océano', css: 'linear-gradient(135deg,#48C6EF,#6F86D6)', swatch: 'linear-gradient(135deg,#48C6EF,#6F86D6)' },
  { id: 'sunset', label: 'Atardecer', css: 'linear-gradient(135deg,#FFB88C,#FF6A88)', swatch: 'linear-gradient(135deg,#FFB88C,#FF6A88)' },
  { id: 'candy', label: 'Algodón', css: 'linear-gradient(135deg,#FBC2EB,#A6C1EE)', swatch: 'linear-gradient(135deg,#FBC2EB,#A6C1EE)' },
  { id: 'aurora', label: 'Aurora', css: 'linear-gradient(135deg,#84FAB0,#8FD3F4)', swatch: 'linear-gradient(135deg,#84FAB0,#8FD3F4)' },
  { id: 'night', label: 'Noche', css: 'linear-gradient(135deg,#232A4D,#5B3A8C)', swatch: 'linear-gradient(135deg,#232A4D,#5B3A8C)' },
] as const;
export type BgId = (typeof BACKGROUNDS)[number]['id'];
export const BG_IDS = ids(BACKGROUNDS);

export const RINGS = [
  { id: 'none', label: 'Sin aro' },
  { id: 'brand', label: 'ECYR' },
  { id: 'level', label: 'Nivel' },
  { id: 'gold', label: 'Oro' },
] as const satisfies readonly Opt[];
export type RingId = (typeof RINGS)[number]['id'];
export const RING_IDS = ids(RINGS);

export const SHAPES = [
  { id: 'circle', label: 'Círculo' },
  { id: 'squircle', label: 'Squircle' },
] as const satisfies readonly Opt[];
export type ShapeId = (typeof SHAPES)[number]['id'];
export const SHAPE_IDS = ids(SHAPES);

// -------------------------------------------------------------- portraits --

export const PORTRAITS = [
  { id: 'p01', label: 'Leo', keyed: true, bg: 'blue' },
  { id: 'p02', label: 'Sofía', keyed: true, bg: 'pink' },
  { id: 'p03', label: 'Mateo', keyed: true, bg: 'lavender' },
  { id: 'p04', label: 'Emma', keyed: true, bg: 'cream' },
  { id: 'p05', label: 'Diego', keyed: true, bg: 'mint' },
  { id: 'p06', label: 'Valentina', keyed: true, bg: 'sky' },
  { id: 'p07', label: 'Kenji', keyed: true, bg: 'periwinkle' },
  { id: 'p08', label: 'Lucía', keyed: true, bg: 'peach' },
  { id: 'p09', label: 'Tomás', keyed: true, bg: 'sky' },
  { id: 'p10', label: 'Camila', keyed: true, bg: 'lilac' },
  { id: 'p11', label: 'Liam', keyed: true, bg: 'sky' },
  { id: 'p12', label: 'Isabela', keyed: true, bg: 'mint' },
  { id: 'p13', label: 'Hugo', keyed: true, bg: 'peach' },
  { id: 'p14', label: 'Martina', keyed: true, bg: 'pink' },
  { id: 'p15', label: 'Daniel', keyed: true, bg: 'sky' },
  { id: 'p16', label: 'Mía', keyed: true, bg: 'lilac' },
  { id: 'p17', label: 'Ken', keyed: true, bg: 'mint' },
  { id: 'p18', label: 'Olivia', keyed: true, bg: 'peach' },
  { id: 'p19', label: 'Gael', keyed: true, bg: 'sky' },
  { id: 'p20', label: 'Ana', keyed: true, bg: 'pink' },
] as const satisfies readonly (Opt & { keyed: boolean; bg: BgId })[];
export type PortraitId = (typeof PORTRAITS)[number]['id'];
export const PORTRAIT_IDS = ids(PORTRAITS);
export const portraitSrc = (id: PortraitId) => `/avatars/${id}.webp`;

// ---------------------------------------------------------------- builder --

export const SKINS = [
  { id: 'porcelain', label: 'Porcelana', color: '#FBE3D6' },
  { id: 'ivory', label: 'Marfil', color: '#F6D2BC' },
  { id: 'sand', label: 'Arena', color: '#EDBF9E' },
  { id: 'honey', label: 'Miel', color: '#DDA47C' },
  { id: 'caramel', label: 'Caramelo', color: '#C68658' },
  { id: 'bronze', label: 'Bronce', color: '#A66B44' },
  { id: 'umber', label: 'Canela', color: '#7F4E31' },
  { id: 'ebony', label: 'Ébano', color: '#5C3723' },
] as const satisfies readonly ColorOpt[];

export const FACES = [
  { id: 'round', label: 'Redonda' },
  { id: 'oval', label: 'Ovalada' },
  { id: 'square', label: 'Cuadrada' },
] as const satisfies readonly Opt[];

export const HAIRS = [
  { id: 'short', label: 'Corto' },
  { id: 'sidepart', label: 'Raya al lado' },
  { id: 'curly', label: 'Rizos cortos' },
  { id: 'buzz', label: 'Rapado' },
  { id: 'long', label: 'Largo liso' },
  { id: 'wavy', label: 'Largo ondulado' },
  { id: 'bun', label: 'Moño' },
  { id: 'ponytail', label: 'Coleta' },
  { id: 'bob', label: 'Bob' },
  { id: 'curlylong', label: 'Rizos largos' },
  { id: 'afro', label: 'Afro' },
  { id: 'bald', label: 'Calvo' },
] as const satisfies readonly Opt[];

export const HAIR_COLORS = [
  { id: 'black', label: 'Negro', color: '#24201F' },
  { id: 'darkbrown', label: 'Castaño oscuro', color: '#45302A' },
  { id: 'brown', label: 'Castaño', color: '#7A4E33' },
  { id: 'auburn', label: 'Caoba', color: '#9C4428' },
  { id: 'ginger', label: 'Pelirrojo', color: '#D0733A' },
  { id: 'blonde', label: 'Rubio', color: '#E2B871' },
  { id: 'platinum', label: 'Platino', color: '#EFE2C8' },
  { id: 'gray', label: 'Gris', color: '#A9A9AD' },
  { id: 'pink', label: 'Rosa', color: '#F08BB4' },
  { id: 'blue', label: 'Azul', color: '#4F7CF0' },
  { id: 'purple', label: 'Violeta', color: '#8E5BE0' },
  { id: 'mint', label: 'Menta', color: '#5CCFB4' },
] as const satisfies readonly ColorOpt[];

export const BROWS = [
  { id: 'natural', label: 'Naturales' },
  { id: 'thick', label: 'Gruesas' },
  { id: 'arched', label: 'Arqueadas' },
  { id: 'straight', label: 'Rectas' },
] as const satisfies readonly Opt[];

export const EYES = [
  { id: 'round', label: 'Abiertos' },
  { id: 'lashes', label: 'Pestañas' },
  { id: 'happy', label: 'Felices' },
  { id: 'wink', label: 'Guiño' },
  { id: 'sleepy', label: 'Relajados' },
] as const satisfies readonly Opt[];

export const EYE_COLORS = [
  { id: 'dark', label: 'Oscuros', color: '#2B1D16' },
  { id: 'brown', label: 'Marrones', color: '#6B3E22' },
  { id: 'hazel', label: 'Avellana', color: '#8A6A2E' },
  { id: 'green', label: 'Verdes', color: '#4E8A4A' },
  { id: 'blue', label: 'Azules', color: '#3F7FC4' },
  { id: 'gray', label: 'Grises', color: '#6E7F8C' },
] as const satisfies readonly ColorOpt[];

export const MOUTHS = [
  { id: 'smile', label: 'Sonrisa' },
  { id: 'grin', label: 'Risa' },
  { id: 'smirk', label: 'Pícara' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'wow', label: '¡Wow!' },
] as const satisfies readonly Opt[];

export const FACIAL_HAIRS = [
  { id: 'none', label: 'Ninguno' },
  { id: 'stubble', label: 'Barba de días' },
  { id: 'beard', label: 'Barba' },
  { id: 'moustache', label: 'Bigote' },
] as const satisfies readonly Opt[];

export const GLASSES = [
  { id: 'none', label: 'Sin gafas' },
  { id: 'round', label: 'Redondas' },
  { id: 'square', label: 'Cuadradas' },
  { id: 'sunglasses', label: 'De sol' },
] as const satisfies readonly Opt[];

export const HEADWEAR = [
  { id: 'none', label: 'Nada' },
  { id: 'cap', label: 'Gorra' },
  { id: 'beanie', label: 'Gorro' },
  { id: 'headband', label: 'Diadema' },
] as const satisfies readonly Opt[];

export const EARRINGS = [
  { id: 'none', label: 'Sin pendientes' },
  { id: 'studs', label: 'Botones' },
  { id: 'hoops', label: 'Aros' },
] as const satisfies readonly Opt[];

export const CLOTHES = [
  { id: 'hoodie', label: 'Sudadera' },
  { id: 'sweater', label: 'Jersey' },
  { id: 'turtleneck', label: 'Cuello alto' },
  { id: 'tshirt', label: 'Camiseta' },
  { id: 'shirt', label: 'Camisa' },
  { id: 'blazer', label: 'Blazer' },
  { id: 'denim', label: 'Chaqueta vaquera' },
] as const satisfies readonly Opt[];

export const CLOTH_COLORS = [
  { id: 'black', label: 'Negro', color: '#232326' },
  { id: 'white', label: 'Blanco', color: '#F4F4F2' },
  { id: 'cream', label: 'Crema', color: '#EEE4D3' },
  { id: 'gray', label: 'Gris', color: '#A4A6AD' },
  { id: 'navy', label: 'Marino', color: '#27365F' },
  { id: 'blue', label: 'Azul', color: '#2F7BF5' },
  { id: 'skyblue', label: 'Celeste', color: '#A9C8EE' },
  { id: 'red', label: 'Rojo', color: '#E2463F' },
  { id: 'green', label: 'Verde', color: '#3E9A6A' },
  { id: 'mustard', label: 'Mostaza', color: '#E2A932' },
  { id: 'pink', label: 'Rosa', color: '#F29BBE' },
  { id: 'purple', label: 'Violeta', color: '#7E5BD6' },
] as const satisfies readonly ColorOpt[];

export type SkinId = (typeof SKINS)[number]['id'];
export type FaceId = (typeof FACES)[number]['id'];
export type HairId = (typeof HAIRS)[number]['id'];
export type HairColorId = (typeof HAIR_COLORS)[number]['id'];
export type BrowsId = (typeof BROWS)[number]['id'];
export type EyesId = (typeof EYES)[number]['id'];
export type EyeColorId = (typeof EYE_COLORS)[number]['id'];
export type MouthId = (typeof MOUTHS)[number]['id'];
export type FacialHairId = (typeof FACIAL_HAIRS)[number]['id'];
export type GlassesId = (typeof GLASSES)[number]['id'];
export type HeadwearId = (typeof HEADWEAR)[number]['id'];
export type EarringsId = (typeof EARRINGS)[number]['id'];
export type ClothingId = (typeof CLOTHES)[number]['id'];
export type ClothColorId = (typeof CLOTH_COLORS)[number]['id'];

export interface BuilderParams {
  skin: SkinId;
  face: FaceId;
  hair: HairId;
  hairColor: HairColorId;
  brows: BrowsId;
  eyes: EyesId;
  eyeColor: EyeColorId;
  mouth: MouthId;
  facialHair: FacialHairId;
  glasses: GlassesId;
  headwear: HeadwearId;
  earrings: EarringsId;
  clothing: ClothingId;
  clothingColor: ClothColorId;
}

/** Option list per builder param — drives both the editor rows and validation. */
export const BUILDER_OPTIONS = {
  skin: SKINS,
  face: FACES,
  hair: HAIRS,
  hairColor: HAIR_COLORS,
  brows: BROWS,
  eyes: EYES,
  eyeColor: EYE_COLORS,
  mouth: MOUTHS,
  facialHair: FACIAL_HAIRS,
  glasses: GLASSES,
  headwear: HEADWEAR,
  earrings: EARRINGS,
  clothing: CLOTHES,
  clothingColor: CLOTH_COLORS,
} as const satisfies { [K in keyof BuilderParams]: readonly Opt<BuilderParams[K]>[] };

export const BUILDER_KEYS = Object.keys(BUILDER_OPTIONS) as (keyof BuilderParams)[];

export const colorOf = <T extends readonly ColorOpt[]>(list: T, id: T[number]['id']) =>
  (list.find((o) => o.id === id) ?? list[0]!).color;
export const bgCss = (id: BgId) => (BACKGROUNDS.find((b) => b.id === id) ?? BACKGROUNDS[0]).css;
