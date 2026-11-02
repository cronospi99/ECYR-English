/* Toons 3D — names shared by the model builder, the runtime and the games. */

/** Animation clips inside every toon .glb. `jump`, `hit` and `slide` play once and hold the end. */
export const TOON_CLIPS = ['idle', 'walk', 'run', 'jump', 'fall', 'slide', 'hit', 'cheer'] as const;
export type ToonClip = (typeof TOON_CLIPS)[number];
export const TOON_ONCE: readonly ToonClip[] = ['jump', 'hit', 'slide'];

/** Model units: feet at y = 0, facing +Z; 1 unit = 100 card-toon units (a toon is ~1.3 units tall). */
export const TOON_FOLDER = 'toons3d';
