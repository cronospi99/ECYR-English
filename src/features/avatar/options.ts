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
  { id: 'sky', label: 'Sky', css: '#B3D6FB', swatch: '#B3D6FB' },
  { id: 'blue', label: 'Blue', css: '#86BEFB', swatch: '#86BEFB' },
  { id: 'periwinkle', label: 'Periwinkle', css: '#B5C1FA', swatch: '#B5C1FA' },
  { id: 'lavender', label: 'Lavender', css: '#D3C6FA', swatch: '#D3C6FA' },
  { id: 'lilac', label: 'Lilac', css: '#DDB4F3', swatch: '#DDB4F3' },
  { id: 'pink', label: 'Pink', css: '#F9B8D4', swatch: '#F9B8D4' },
  { id: 'peach', label: 'Peach', css: '#FCCDB0', swatch: '#FCCDB0' },
  { id: 'cream', label: 'Cream', css: '#F5DFC2', swatch: '#F5DFC2' },
  { id: 'lemon', label: 'Lemon', css: '#F8EAA6', swatch: '#F8EAA6' },
  { id: 'mint', label: 'Mint', css: '#BFEED3', swatch: '#BFEED3' },
  { id: 'cloud', label: 'Cloud', css: '#E5E5EA', swatch: '#E5E5EA' },
  { id: 'graphite', label: 'Graphite', css: '#3A3A3C', swatch: '#3A3A3C' },
  { id: 'brand', label: 'ECYR', css: 'linear-gradient(135deg,#1565E0,#8A47E6)', swatch: 'linear-gradient(135deg,#1565E0,#8A47E6)' },
  { id: 'ocean', label: 'Ocean', css: 'linear-gradient(135deg,#1F86B8,#4F63BE)', swatch: 'linear-gradient(135deg,#1F86B8,#4F63BE)' },
  { id: 'sunset', label: 'Sunset', css: 'linear-gradient(135deg,#FFB88C,#FF6A88)', swatch: 'linear-gradient(135deg,#FFB88C,#FF6A88)' },
  { id: 'candy', label: 'Cotton', css: 'linear-gradient(135deg,#FBC2EB,#A6C1EE)', swatch: 'linear-gradient(135deg,#FBC2EB,#A6C1EE)' },
  { id: 'aurora', label: 'Aurora', css: 'linear-gradient(135deg,#84FAB0,#8FD3F4)', swatch: 'linear-gradient(135deg,#84FAB0,#8FD3F4)' },
  { id: 'night', label: 'Night', css: 'linear-gradient(135deg,#232A4D,#5B3A8C)', swatch: 'linear-gradient(135deg,#232A4D,#5B3A8C)' },
] as const;
export type BgId = (typeof BACKGROUNDS)[number]['id'];
export const BG_IDS = ids(BACKGROUNDS);

export const RINGS = [
  { id: 'none', label: 'No ring' },
  { id: 'brand', label: 'ECYR' },
  { id: 'level', label: 'Level' },
  { id: 'gold', label: 'Gold' },
] as const satisfies readonly Opt[];
export type RingId = (typeof RINGS)[number]['id'];
export const RING_IDS = ids(RINGS);

export const SHAPES = [
  { id: 'circle', label: 'Circle' },
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
  { id: 'porcelain', label: 'Porcelain', color: '#FBE3D6' },
  { id: 'ivory', label: 'Ivory', color: '#F6D2BC' },
  { id: 'sand', label: 'Sand', color: '#EDBF9E' },
  { id: 'honey', label: 'Honey', color: '#DDA47C' },
  { id: 'caramel', label: 'Caramel', color: '#C68658' },
  { id: 'bronze', label: 'Bronze', color: '#A66B44' },
  { id: 'umber', label: 'Cinnamon', color: '#7F4E31' },
  { id: 'ebony', label: 'Ebony', color: '#5C3723' },
] as const satisfies readonly ColorOpt[];

export const FACES = [
  { id: 'round', label: 'Round' },
  { id: 'oval', label: 'Oval' },
  { id: 'square', label: 'Square' },
] as const satisfies readonly Opt[];

export const HAIRS = [
  { id: 'short', label: 'Short' },
  { id: 'sidepart', label: 'Side part' },
  { id: 'curly', label: 'Short curls' },
  { id: 'buzz', label: 'Shaved' },
  { id: 'long', label: 'Long straight' },
  { id: 'wavy', label: 'Long wavy' },
  { id: 'bun', label: 'Bun' },
  { id: 'ponytail', label: 'Ponytail' },
  { id: 'bob', label: 'Bob' },
  { id: 'curlylong', label: 'Long curls' },
  { id: 'afro', label: 'Afro' },
  { id: 'bald', label: 'Bald' },
] as const satisfies readonly Opt[];

export const HAIR_COLORS = [
  { id: 'black', label: 'Black', color: '#24201F' },
  { id: 'darkbrown', label: 'Dark chestnut', color: '#45302A' },
  { id: 'brown', label: 'Chestnut', color: '#7A4E33' },
  { id: 'auburn', label: 'Mahogany', color: '#9C4428' },
  { id: 'ginger', label: 'Red', color: '#D0733A' },
  { id: 'blonde', label: 'Blond', color: '#E2B871' },
  { id: 'platinum', label: 'Platinum', color: '#EFE2C8' },
  { id: 'gray', label: 'Grey', color: '#A9A9AD' },
  { id: 'pink', label: 'Pink', color: '#F08BB4' },
  { id: 'blue', label: 'Blue', color: '#4F7CF0' },
  { id: 'purple', label: 'Violet', color: '#8E5BE0' },
  { id: 'mint', label: 'Mint', color: '#5CCFB4' },
] as const satisfies readonly ColorOpt[];

export const BROWS = [
  { id: 'natural', label: 'Natural' },
  { id: 'thick', label: 'Thick' },
  { id: 'arched', label: 'Arched' },
  { id: 'straight', label: 'Straight' },
] as const satisfies readonly Opt[];

export const EYES = [
  { id: 'round', label: 'Wide open' },
  { id: 'lashes', label: 'Tabs' },
  { id: 'happy', label: 'Happy' },
  { id: 'wink', label: 'Wink' },
  { id: 'sleepy', label: 'Relaxed' },
] as const satisfies readonly Opt[];

export const EYE_COLORS = [
  { id: 'dark', label: 'Dark', color: '#2B1D16' },
  { id: 'brown', label: 'Brown', color: '#6B3E22' },
  { id: 'hazel', label: 'Hazel', color: '#8A6A2E' },
  { id: 'green', label: 'Green', color: '#4E8A4A' },
  { id: 'blue', label: 'Blue', color: '#3F7FC4' },
  { id: 'gray', label: 'Grey', color: '#6E7F8C' },
] as const satisfies readonly ColorOpt[];

export const MOUTHS = [
  { id: 'smile', label: 'Smile' },
  { id: 'grin', label: 'Laugh' },
  { id: 'smirk', label: 'Mischievous' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'wow', label: 'Wow!' },
] as const satisfies readonly Opt[];

export const FACIAL_HAIRS = [
  { id: 'none', label: 'None' },
  { id: 'stubble', label: 'Stubble' },
  { id: 'beard', label: 'Beard' },
  { id: 'moustache', label: 'Moustache' },
] as const satisfies readonly Opt[];

export const GLASSES = [
  { id: 'none', label: 'No glasses' },
  { id: 'round', label: 'Round' },
  { id: 'square', label: 'Square' },
  { id: 'sunglasses', label: 'Sunglasses' },
] as const satisfies readonly Opt[];

export const HEADWEAR = [
  { id: 'none', label: 'Nothing' },
  { id: 'cap', label: 'Cap' },
  { id: 'beanie', label: 'Hat' },
  { id: 'headband', label: 'Headband' },
] as const satisfies readonly Opt[];

export const EARRINGS = [
  { id: 'none', label: 'No earrings' },
  { id: 'studs', label: 'Buttons' },
  { id: 'hoops', label: 'Hoops' },
] as const satisfies readonly Opt[];

export const CLOTHES = [
  { id: 'hoodie', label: 'Hoodie' },
  { id: 'sweater', label: 'Sweater' },
  { id: 'turtleneck', label: 'Turtleneck' },
  { id: 'tshirt', label: 'T-shirt' },
  { id: 'shirt', label: 'Shirt' },
  { id: 'blazer', label: 'Blazer' },
  { id: 'denim', label: 'Denim jacket' },
] as const satisfies readonly Opt[];

export const CLOTH_COLORS = [
  { id: 'black', label: 'Black', color: '#232326' },
  { id: 'white', label: 'White', color: '#F4F4F2' },
  { id: 'cream', label: 'Cream', color: '#EEE4D3' },
  { id: 'gray', label: 'Grey', color: '#A4A6AD' },
  { id: 'navy', label: 'Navy', color: '#27365F' },
  { id: 'blue', label: 'Blue', color: '#2F7BF5' },
  { id: 'skyblue', label: 'Light blue', color: '#A9C8EE' },
  { id: 'red', label: 'Red', color: '#E2463F' },
  { id: 'green', label: 'Green', color: '#3E9A6A' },
  { id: 'mustard', label: 'Mustard', color: '#E2A932' },
  { id: 'pink', label: 'Pink', color: '#F29BBE' },
  { id: 'purple', label: 'Violet', color: '#7E5BD6' },
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
