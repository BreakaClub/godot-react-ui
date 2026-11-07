/**
 * The pointer resting over text asks for what is there (its type, its problems) once it has rested, and the answer is shown while
 * the pointer stays over the same word. One timer and one generation: a move to another word ends the wait for the old one and
 * discards an answer that was on its way.
 */

/** How long the pointer rests on a word before the tooltip is asked for. */
export const HOVER_DELAY_MS = 350;

export interface HoverTarget {
  /** The word under the pointer: its start and end, document offsets; the key that tells one word from another. */
  readonly from: number;
  readonly to: number;
  /** What the pointer is over, for the request. */
  readonly offset: number;
}

export class HoverTracker<T> {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;
  private current: HoverTarget | undefined;
  /** Whether `show` was last given something to show, which `cancel` then takes back. */
  private shown = false;
  private readonly delayMs: number;
  private readonly request: (target: HoverTarget) => Promise<T | undefined>;
  private readonly show: (value: T | undefined, target: HoverTarget | undefined) => void;

  constructor(
    request: (target: HoverTarget) => Promise<T | undefined>,
    show: (value: T | undefined, target: HoverTarget | undefined) => void,
    delayMs: number = HOVER_DELAY_MS,
  ) {
    this.request = request;
    this.show = show;
    this.delayMs = delayMs;
  }

  /** The pointer is over `target`, or over nothing (`undefined`). */
  moved(target: HoverTarget | undefined): void {
    const same = target !== undefined && this.current !== undefined && target.from === this.current.from && target.to === this.current.to;
    if (same) return;
    this.cancel();
    this.current = target;
    if (target === undefined) return;
    const generation = this.generation;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.request(target).then(value => {
        if (generation !== this.generation) return;
        this.shown = value !== undefined;
        this.show(value, target);
      }, (error: unknown) => {
        // A failed hover shows nothing; the failure is reported, not swallowed.
        console.error(`The hover at ${target.offset} failed: ${error instanceof Error ? error.message : String(error)}`);
      });
    }, this.delayMs);
  }

  /**
   * Ends the wait, discards an answer on its way, and hides the tooltip if one is shown. A key calls this, and a `show` that sets state to
   * what it already is still renders the component that owns it again.
   */
  cancel(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    this.generation += 1;
    this.current = undefined;
    if (!this.shown) return;
    this.shown = false;
    this.show(undefined, undefined);
  }
}
