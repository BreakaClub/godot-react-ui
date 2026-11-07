/**
 * The step glyphs are placed at, in logical pixels: the demo registers its fonts with `SubpixelPositioningOneQuarter`
 * (`demo/src/demo-fonts.ts`), which places each glyph at a quarter of a pixel. A font registered with another step needs this to
 * match, or the editor's columns will not be the paint's.
 */
export const GLYPH_POSITION_STEP_PX = 0.25;
