import type { FontSlice, FontSliceIndex } from './manifest';

/** Finds the slice of one family that holds a code point: its ranges sorted, searched by bisection. */
export class SliceLookup {
  private readonly starts: Int32Array;
  private readonly ends: Int32Array;
  private readonly slices: readonly FontSlice[];

  /** Throws if two slices claim a code point: the index is not one a lookup can answer from. */
  constructor(index: FontSliceIndex) {
    const runs: Array<{ start: number; end: number; slice: FontSlice }> = [];
    for (const slice of index.slices) {
      for (const range of slice.ranges) runs.push({ start: range.start, end: range.end, slice });
    }
    runs.sort((left, right) => left.start - right.start);
    for (let position = 1; position < runs.length; position += 1) {
      const previous = runs[position - 1];
      const current = runs[position];
      if (previous !== undefined && current !== undefined && current.start <= previous.end) {
        throw new Error(`The index of ${index.family} lists U+${current.start.toString(16)} in both ${previous.slice.id} and ${current.slice.id}`);
      }
    }
    this.starts = Int32Array.from(runs, run => run.start);
    this.ends = Int32Array.from(runs, run => run.end);
    this.slices = runs.map(run => run.slice);
  }

  /** The slice that holds `codepoint`, if the family has one. */
  sliceOf(codepoint: number): FontSlice | undefined {
    let low = 0;
    let high = this.starts.length - 1;
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      if ((this.starts[middle] ?? 0) > codepoint) high = middle - 1;
      else if ((this.ends[middle] ?? 0) < codepoint) low = middle + 1;
      else return this.slices[middle];
    }
    return undefined;
  }
}
