/**
 * Scrolling a view while a selection is dragged beyond its edge. One timer, started by the first move outside and ended by the
 * release, the cancel or the view going away: it is owned by the gesture and by nothing else.
 */

/** How often the view is scrolled while the pointer stays outside it. */
export const AUTOSCROLL_INTERVAL_MS = 16;
/** Pixels scrolled per tick for each pixel the pointer is beyond the edge. */
export const AUTOSCROLL_PX_PER_TICK_PER_PX = 0.15;
/** The most one tick scrolls. */
export const AUTOSCROLL_MAX_PX_PER_TICK = 24;

export interface Edges {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** How far the pointer is beyond the view on each axis, negative above and left: zero while it is inside. */
export function overshoot(x: number, y: number, edges: Edges): { readonly dx: number; readonly dy: number } {
  const dx = x < edges.left ? x - edges.left : x > edges.right ? x - edges.right : 0;
  const dy = y < edges.top ? y - edges.top : y > edges.bottom ? y - edges.bottom : 0;
  return { dx, dy };
}

/** The distance one tick scrolls for an overshoot of `distance` pixels. */
export function stepFor(distance: number): number {
  const step = distance * AUTOSCROLL_PX_PER_TICK_PER_PX;
  return Math.max(-AUTOSCROLL_MAX_PX_PER_TICK, Math.min(AUTOSCROLL_MAX_PX_PER_TICK, step));
}

export interface AutoscrollTarget {
  /** The view's edges and the pointer, in the same space. */
  measure(): { readonly edges: Edges; readonly x: number; readonly y: number } | undefined;
  scrollBy(delta: { readonly left: number; readonly top: number }): void;
  /** Called after each scroll: the selection follows the pointer to the text that is now under it. */
  scrolled(): void;
}

export class Autoscroll {
  private timer: ReturnType<typeof setInterval> | undefined;
  private readonly target: AutoscrollTarget;

  constructor(target: AutoscrollTarget) {
    this.target = target;
  }

  get running(): boolean {
    return this.timer !== undefined;
  }

  /** Called on every move of the dragging pointer: starts the timer when the pointer is outside, ends it when it is back in. */
  update(): void {
    const measured = this.target.measure();
    const outside = measured !== undefined && (overshoot(measured.x, measured.y, measured.edges).dx !== 0 || overshoot(measured.x, measured.y, measured.edges).dy !== 0);
    if (outside && this.timer === undefined) this.timer = setInterval(() => this.tick(), AUTOSCROLL_INTERVAL_MS);
    if (!outside) this.stop();
  }

  stop(): void {
    if (this.timer !== undefined) clearInterval(this.timer);
    this.timer = undefined;
  }

  private tick(): void {
    const measured = this.target.measure();
    if (measured === undefined) {
      this.stop();
      return;
    }
    const { dx, dy } = overshoot(measured.x, measured.y, measured.edges);
    if (dx === 0 && dy === 0) {
      this.stop();
      return;
    }
    this.target.scrollBy({ left: stepFor(dx), top: stepFor(dy) });
    this.target.scrolled();
  }
}
