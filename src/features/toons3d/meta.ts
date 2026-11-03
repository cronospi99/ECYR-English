/* Toons 3D — names shared by the model builder, the runtime and the games. */

/** Animation clips inside every toon .glb. `jump`, `hit` and `slide` play once and hold the end. */
export const TOON_CLIPS = ['idle', 'walk', 'run', 'jump', 'fall', 'slide', 'hit', 'cheer'] as const;
export type ToonClip = (typeof TOON_CLIPS)[number];
export const TOON_ONCE: readonly ToonClip[] = ['jump', 'hit', 'slide'];

/** Model units: feet at y = 0, facing +Z; 1 unit = 100 card-toon units (a toon is ~1.3 units tall). */
export const TOON_FOLDER = 'toons3d';

/** Scale of a hidden expression piece (eyes / mouths that are not showing). */
export const FACE_OFF = 0.001;
export type Face = 'smile' | 'grin' | 'happy' | 'surprised' | 'wink' | 'sad' | 'love';
/** Which eye / mouth pieces show for each expression. */
export const FACES: Record<Face, { eyeL: 'Open' | 'Shut' | 'Heart'; eyeR: 'Open' | 'Shut' | 'Heart'; mouth: 'N' | 'O' | 'S' | 'F'; wide?: number }> = {
  smile: { eyeL: 'Open', eyeR: 'Open', mouth: 'N' },
  grin: { eyeL: 'Open', eyeR: 'Open', mouth: 'O' },
  happy: { eyeL: 'Shut', eyeR: 'Shut', mouth: 'O' },
  surprised: { eyeL: 'Open', eyeR: 'Open', mouth: 'S', wide: 1.14 },
  wink: { eyeL: 'Shut', eyeR: 'Open', mouth: 'O' },
  sad: { eyeL: 'Open', eyeR: 'Open', mouth: 'F', wide: 0.9 },
  love: { eyeL: 'Heart', eyeR: 'Heart', mouth: 'O' },
};
