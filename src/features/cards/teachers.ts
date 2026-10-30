/* Class Wars / Impostor characters and collectible cards: the teaching team.
   Every portrait is a friendly cartoon — keep descriptions kind. */

export type Skin = "porcelain" | "fair" | "light" | "tan" | "brown" | "deep";
export type Hair =
  | "wavyLong" | "styledLong" | "afro" | "shortNeat" | "bob" | "straightLong" | "midCurly" | "receding"
  | "shortCurly" | "longCurly" | "emoFringe" | "slick" | "ponytail" | "sporty" | "silverNeat" | "bun";
export type Glasses = "none" | "round" | "rect" | "cat";
export type Outfit = "blouse" | "blazer" | "shirt" | "sweater" | "tracksuit" | "polo" | "suit" | "hoodieBlack" | "stripes" | "vest" | "cardigan" | "uniform";
export type Prop = "none" | "book" | "whistle" | "coffee" | "clipboard" | "beretFR" | "pinFR" | "tattoos" | "earrings" | "scarf" | "lanyard" | "pointer" | "guardCap" | "scanner";

export interface TeacherLook {
  skin: Skin;
  hair: Hair;
  hairColor: string;
  glasses: Glasses;
  beard: "none" | "stubble" | "short" | "full";
  smile: "big" | "soft" | "serious" | "shy" | "smirk" | "mysterious";
  outfit: Outfit;
  top: string; // main clothing colour
  height: number; // 0.85 (shortest) … 1.18 (tallest)
  build: "slim" | "regular" | "broad";
  props: Prop[];
  lips?: string;
}

export interface TeacherCard {
  id: string;
  name: string;
  role: "Teacher" | "Coordinator" | "French Teacher";
  /* short, kind flavour text shown on the card (English practice!) */
  about: string;
  look: TeacherLook;
  special?: boolean;
}

const BROWN = "#4a2c1a", DARK = "#1f1a17", BLACK = "#0e0d0d", CHESTNUT = "#6b3a1e", HONEY = "#9a6a2f", SILVER = "#b8b4ac";

export const TEACHERS: TeacherCard[] = [
  { id: "camila", name: "Camila", role: "Teacher", about: "Wavy hair and the biggest smile in the building.",
    look: { skin: "light", hair: "wavyLong", hairColor: CHESTNUT, glasses: "none", beard: "none", smile: "big", outfit: "blouse", top: "#ef8f7a", height: 1, build: "regular", props: [] } },
  { id: "sofia", name: "Sofía", role: "Teacher", about: "Always stylish — perfect hair, perfect outfit.",
    look: { skin: "light", hair: "styledLong", hairColor: DARK, glasses: "none", beard: "none", smile: "soft", outfit: "blazer", top: "#9b6bd3", height: 1.02, build: "slim", props: ["earrings"], lips: "#c9485b" } },
  { id: "gabriel", name: "Gabriel", role: "Teacher", about: "Curly afro, cool glasses, great vibes.",
    look: { skin: "tan", hair: "afro", hairColor: BLACK, glasses: "round", beard: "none", smile: "soft", outfit: "shirt", top: "#3fa7d6", height: 1.04, build: "regular", props: [] } },
  { id: "sander", name: "Sander", role: "Teacher", about: "Tall, calm and always ready to explain one more time.",
    look: { skin: "brown", hair: "shortNeat", hairColor: BLACK, glasses: "rect", beard: "none", smile: "soft", outfit: "shirt", top: "#4fb39a", height: 1.14, build: "slim", props: [] } },
  { id: "nataly", name: "Nataly", role: "Teacher", about: "Short hair, cute smile and sharp glasses.",
    look: { skin: "light", hair: "bob", hairColor: DARK, glasses: "cat", beard: "none", smile: "big", outfit: "blouse", top: "#e98fc0", height: 0.96, build: "regular", props: [] } },
  { id: "anyela", name: "Anyela", role: "Teacher", about: "Never without a good book.",
    look: { skin: "light", hair: "straightLong", hairColor: CHESTNUT, glasses: "round", beard: "none", smile: "soft", outfit: "cardigan", top: "#c9a227", height: 1, build: "regular", props: ["book"] } },
  { id: "julian", name: "Julián", role: "Teacher", about: "The caring, dad-like teacher everyone trusts.",
    look: { skin: "tan", hair: "shortNeat", hairColor: DARK, glasses: "rect", beard: "stubble", smile: "soft", outfit: "sweater", top: "#5b7a4a", height: 1.05, build: "regular", props: ["coffee"] } },
  { id: "freddy", name: "Freddy", role: "Teacher", about: "Sporty and full of energy — class is a workout!",
    look: { skin: "tan", hair: "sporty", hairColor: BLACK, glasses: "none", beard: "none", smile: "big", outfit: "tracksuit", top: "#e23d4f", height: 1.04, build: "regular", props: ["whistle"] } },
  { id: "andres", name: "Andrés", role: "Teacher", about: "Big beard, big heart, big laugh.",
    look: { skin: "light", hair: "shortNeat", hairColor: BROWN, glasses: "rect", beard: "full", smile: "big", outfit: "shirt", top: "#3a5bc7", height: 1.02, build: "broad", props: [] } },
  { id: "angie", name: "Angie", role: "Teacher", about: "Glasses on, ideas flowing.",
    look: { skin: "brown", hair: "wavyLong", hairColor: DARK, glasses: "cat", beard: "none", smile: "big", outfit: "blouse", top: "#f07a1a", height: 1, build: "regular", props: ["earrings"] } },
  { id: "lina", name: "Lina", role: "Teacher", about: "Slim, smart and super organised.",
    look: { skin: "light", hair: "straightLong", hairColor: HONEY, glasses: "rect", beard: "none", smile: "soft", outfit: "blouse", top: "#2fb3a0", height: 1.03, build: "slim", props: [] } },
  { id: "valentina", name: "Valentina", role: "Teacher", about: "The tallest teacher — curls up high!",
    look: { skin: "light", hair: "longCurly", hairColor: CHESTNUT, glasses: "none", beard: "none", smile: "big", outfit: "blouse", top: "#f5c518", height: 1.18, build: "slim", props: [] } },
  { id: "esteban", name: "Esteban", role: "Teacher", about: "Glasses, beard and a smile that wins every debate.",
    look: { skin: "light", hair: "slick", hairColor: DARK, glasses: "rect", beard: "short", smile: "smirk", outfit: "shirt", top: "#22282c", height: 1.06, build: "regular", props: [] } },
  { id: "sebastian", name: "Sebastián", role: "Teacher", about: "Curly hair, glasses and a mysterious look… is he the impostor?",
    look: { skin: "fair", hair: "midCurly", hairColor: DARK, glasses: "round", beard: "stubble", smile: "mysterious", outfit: "blazer", top: "#3b4349", height: 1.05, build: "slim", props: [] } },
  { id: "javier", name: "Javier", role: "Teacher", about: "Quiet and kind — a polo shirt for every day of the week.",
    look: { skin: "tan", hair: "receding", hairColor: BROWN, glasses: "none", beard: "none", smile: "shy", outfit: "polo", top: "#3a5bc7", height: 1.02, build: "regular", props: [] } },
  { id: "anny", name: "Anny", role: "Teacher", about: "Small but mighty — and always in glasses.",
    look: { skin: "light", hair: "ponytail", hairColor: BROWN, glasses: "round", beard: "none", smile: "big", outfit: "cardigan", top: "#ef8fc4", height: 0.9, build: "slim", props: [] } },
  { id: "estephania", name: "Estephania", role: "Teacher", about: "Cute smile, long straight hair, glasses — tiny and brilliant.",
    look: { skin: "fair", hair: "straightLong", hairColor: DARK, glasses: "round", beard: "none", smile: "big", outfit: "blouse", top: "#7bbf5a", height: 0.85, build: "slim", props: [] } },
  { id: "dager", name: "Dager", role: "Teacher", about: "Experienced and serious — the voice of wisdom.",
    look: { skin: "tan", hair: "silverNeat", hairColor: SILVER, glasses: "none", beard: "none", smile: "serious", outfit: "suit", top: "#2b3236", height: 1.06, build: "regular", props: [] } },
  { id: "liliana", name: "Liliana", role: "Teacher", about: "Short curly hair and coffee in hand — ready for anything.",
    look: { skin: "light", hair: "shortCurly", hairColor: CHESTNUT, glasses: "none", beard: "none", smile: "soft", outfit: "cardigan", top: "#b4441f", height: 0.92, build: "regular", props: ["coffee"] } },
  { id: "norvey", name: "Norvey", role: "Teacher", about: "Elegant suit and a big smile — every sentence is a speech.",
    look: { skin: "tan", hair: "slick", hairColor: BLACK, glasses: "none", beard: "none", smile: "big", outfit: "suit", top: "#1b2023", height: 1.06, build: "regular", props: ["pointer"] } },
  { id: "mafe", name: "Mafe", role: "Teacher", about: "All black everything — the coolest dark style in town.",
    look: { skin: "porcelain", hair: "emoFringe", hairColor: BLACK, glasses: "none", beard: "none", smile: "smirk", outfit: "hoodieBlack", top: "#141414", height: 1, build: "slim", props: [], lips: "#4a1d2e" } },
  { id: "jhonathan", name: "Jhonathan", role: "French Teacher", about: "Bonjour! Our French teacher from Bogotá.",
    look: { skin: "light", hair: "shortNeat", hairColor: DARK, glasses: "none", beard: "stubble", smile: "soft", outfit: "stripes", top: "#3a5bc7", height: 1.04, build: "regular", props: ["beretFR", "scarf"] } },
  { id: "jalbleidy", name: "Jalbleidy", role: "Coordinator", about: "The coordinator: tall, confident and in charge.", special: true,
    look: { skin: "light", hair: "bun", hairColor: DARK, glasses: "none", beard: "none", smile: "smirk", outfit: "blazer", top: "#7d2f16", height: 1.12, build: "regular", props: ["clipboard", "lanyard", "earrings"], lips: "#b4441f" } },
  { id: "juanpablo", name: "Juan Pablo", role: "Teacher", about: "Elegant, glasses and tattoos — style with a story.",
    look: { skin: "light", hair: "slick", hairColor: BROWN, glasses: "rect", beard: "none", smile: "smirk", outfit: "vest", top: "#2b3236", height: 1.06, build: "regular", props: ["tattoos"] } },
  { id: "vanessa", name: "Vanessa", role: "French Teacher", about: "Curly and cute — she taught English, now it's French!",
    look: { skin: "light", hair: "longCurly", hairColor: BROWN, glasses: "none", beard: "none", smile: "big", outfit: "stripes", top: "#e23d4f", height: 0.98, build: "regular", props: ["pinFR"] } }
];

export const SKIN: Record<Skin, { c: string; d: string }> = {
  porcelain: { c: "#f8ece6", d: "#e6cfc4" },
  fair: { c: "#f6d9c4", d: "#e2b99c" },
  light: { c: "#eec3a0", d: "#d6a27c" },
  tan: { c: "#d49a6a", d: "#b57b4e" },
  brown: { c: "#a8693e", d: "#87512c" },
  deep: { c: "#6e4126", d: "#55301b" }
};

/* points needed for each new card */
export const POINTS_PER_CARD = 4;
/* the coordinator card only appears after this many others */
export const SPECIAL_AFTER = 10;

/* the academy's watchman (an NPC, not a collectible card) */
export const WATCHMAN: TeacherLook = {
  skin: "tan", hair: "shortNeat", hairColor: "#1f1a17", glasses: "none", beard: "stubble", smile: "soft",
  outfit: "uniform", top: "#22305a", height: 1.08, build: "broad", props: ["guardCap", "scanner"]
};
