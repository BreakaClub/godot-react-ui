/**
 * Font faces for `fontFamily`, `fontWeight` and `fontStyle`. A root draws text in its theme font until faces are registered;
 * text that names a registered family is drawn with the face CSS font matching picks from it (the nearest weight, an italic
 * face for an italic request), and a bold or italic the family lacks is made up as a browser makes it up.
 */

/** One face of a family. `font` is a Godot `Font` (a `FontFile`): the root keeps it and draws with it. */
export interface FontFace<Font> {
  /** The name `fontFamily` uses: `sans`, `serif` and `mono` are what `font-sans`, `font-serif` and `font-mono` ask for. Case is ignored. */
  family: string;
  /** The weight a static face has, or `[lightest, heaviest]` for a variable font's `wght` axis. CSS weights run from 1 to 1000. */
  weight: number | readonly [number, number];
  /** Whether this face is the family's italic; the default is upright. */
  style?: 'normal' | 'italic';
  font: Font;
}

/** What registers faces: a `ReactUiRoot`. */
export interface FontFaceHost<Font> {
  /** An empty string means success; anything else says why nothing changed. */
  registerFontFace(family: string, weightMin: number, weightMax: number, italic: boolean, font: Font): string;
}

/**
 * Register `face` with `host`. Registering the same family, weights and style again replaces the earlier face. Text already on
 * screen that names the family is shaped again.
 */
export function registerFontFace<Font>(host: FontFaceHost<Font>, face: FontFace<Font>): void {
  const [weightMin, weightMax] = typeof face.weight === 'number' ? [face.weight, face.weight] : face.weight;
  const error = host.registerFontFace(face.family, weightMin, weightMax, face.style === 'italic', face.font);
  if (error !== '') throw new Error(`Cannot register the ${face.family} face: ${error}`);
}
