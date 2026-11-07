/**
 * How many presses in a row this press is: 1 for a click, 2 for the second of a double click, 3 for the third. A `pointerdown`
 * carries no count (its `detail` is 0, as in the DOM; only `click` has one), and a drag that selects by words needs the count when
 * the button goes down, so the editor counts presses itself by the rule native counts `click`s by.
 */

/** A press continues the sequence if it is no later than this after the last one (`CLICK_COUNT_INTERVAL_MS` in native/pointer_state.rs). */
export const CLICK_INTERVAL_MS = 500;
/** and no farther than this from where the sequence began (`CLICK_COUNT_SLOP_PX` in native/pointer_state.rs). */
export const CLICK_SLOP_PX = 4;

interface Press {
  readonly x: number;
  readonly y: number;
  readonly timeMs: number;
  readonly count: number;
}

export class ClickSequence {
  private last: Press | undefined;

  /** Counts a press of the primary button at root-local (`x`, `y`) at `timeMs`, on the engine's tick clock. */
  press(x: number, y: number, timeMs: number): number {
    const last = this.last;
    const continues = last !== undefined && timeMs - last.timeMs >= 0 && timeMs - last.timeMs <= CLICK_INTERVAL_MS
      && Math.hypot(x - last.x, y - last.y) <= CLICK_SLOP_PX;
    // The sequence's origin stays where it began, as native's does: a slow drift of the pointer ends it.
    const count = continues ? last.count + 1 : 1;
    this.last = continues ? { x: last.x, y: last.y, timeMs, count } : { x, y, timeMs, count };
    return count;
  }
}
