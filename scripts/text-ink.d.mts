/** An 8-bit RGB or RGBA picture: `pixels` holds `channels` bytes per pixel, row after row. */
export interface InkImage {
  readonly width: number;
  readonly height: number;
  readonly channels: number;
  readonly pixels: ArrayLike<number>;
}

/** A rectangle in logical pixels. */
export interface InkRect {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export const EDGE_INK: number;
export function inkAt(image: InkImage, x: number, y: number): number;
export function inkMass(image: InkImage, scale: number, rect: InkRect): number;
export function inkRightEdge(image: InkImage, scale: number, rect: InkRect): number | undefined;

export const EDGE_REACH_PX: number;

/** A text's box and one of its lines, as the golden numbers have them (`demo/src/text-styles-golden.ts`). */
export interface InkBox {
  readonly x: number;
  readonly width: number;
}

export interface InkLine {
  readonly top: number;
  readonly bottom: number;
}

/** A character that has ink: its index in the text, its left and right edge, and its line. */
export type InkCell = readonly [number, number, number, number];

export interface InkText {
  readonly box: InkBox;
  readonly lines: readonly InkLine[];
  readonly cells?: readonly InkCell[];
}

export interface TextInk {
  readonly edges: readonly (number | null)[];
  readonly glyphs?: readonly number[];
}

export function lineWindow(box: InkBox, line: InkLine): InkRect;
export function cellWindow(cell: InkCell, line: InkLine): InkRect;
export function measureTextInk(image: InkImage, scale: number, text: InkText): TextInk;

export const INK_EDGE_TOLERANCE_PX: number;
export const GLYPH_INK_MIN_SHARE: number;
export const GLYPH_INK_MAX_SHARE: number;
export const GLYPH_INK_FLOOR: number;

/** One ink number that is further from Chrome's than allowed; `null` is a line with no ink in its window. */
export interface InkDeviation {
  readonly what: string;
  readonly ours: number | null;
  readonly chrome: number | null;
}

export function inkDeviations(ours: TextInk, chrome: TextInk, cells: readonly InkCell[] | undefined, characters: readonly string[]): InkDeviation[];
