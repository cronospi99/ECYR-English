/**
 * Colour helpers. Vivid accents are for fills; as text they are pulled toward
 * the label colour (darker in light mode, lighter in dark mode), which keeps
 * coloured words readable on white and on tinted cards in both themes.
 */
export const ink = (color: string, pct = 58) => `color-mix(in srgb, ${color} ${pct}%, var(--label))`;
export const tint = (color: string, pct = 12) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
/** A fill dark enough to carry white text (chips, number badges). */
export const deep = (color: string, pct = 62) => `color-mix(in srgb, ${color} ${pct}%, #000)`;
