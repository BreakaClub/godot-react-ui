export type RangePair = [start: number, end: number];

/** One `@font-face` of Google's stylesheet, as `google-ranges.json` records it. */
export interface GoogleFace {
  /** The comment before a named slice (`latin`), or null for a numbered one. */
  name: string | null;
  /** The number in a numbered slice's file name, or null for a named one. */
  index: number | null;
  /** The `unicode-range` of the slice, as CSS writes it. */
  ranges: string;
}

export interface PlannedSlice {
  /** `sc-004` (Google's slice 4), `sc-latin`, `sc-t012` (the thirteenth tail slice). */
  id: string;
  /** `google-4`, `google-latin` or `tail`. */
  source: string;
  /** The code points the slice is looked up for: sorted and distinct, and in no other slice. */
  codepoints: number[];
  /** The code points its font file holds: `codepoints`, and with `shared` the others Google lists in it. */
  included: number[];
}

export const TAIL_SLICE_CODEPOINTS: number;
export function parseUnicodeRange(text: string): RangePair[];
export function codepointsOf(pairs: readonly RangePair[]): number[];
export function rangesOf(codepoints: readonly number[]): RangePair[];
export function formatRanges(pairs: readonly RangePair[]): string;
export function planSlices(options: { language: string; codepoints: readonly number[]; faces: readonly GoogleFace[]; tailSize?: number; shared?: boolean }): { slices: PlannedSlice[]; overlapping: number };
