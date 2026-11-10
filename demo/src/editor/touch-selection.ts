import {
  HANDLE_BALL_RADIUS_PX, MENU_EDGE_MARGIN_PX, MENU_GAP_PX, MENU_HEIGHT_PX, MENU_ITEM_PADDING_PX, TOUCH_SELECT_HOLD_MS, TOUCH_SLOP_PX,
} from '../../../src/touch-selection';

/**
 * Touch selection in the code editor, without the engine. The selection is CodeMirror's, so
 * the root's own long press, handles and menu (`native/touch_selection*.rs`) cannot act on it: the editor's view asks this for the
 * hold that starts a selection, the handles' geometry and the menu's, and draws them itself, with the root's numbers.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** What a hold needs of the clock, so a test can run it by hand. */
export interface Timers<Handle> {
  set(callback: () => void, ms: number): Handle;
  clear(handle: Handle): void;
}

/**
 * One finger that went down on text and may be a long press: it is one if it is still within the slop when the hold has elapsed. A finger
 * that moves farther first is a pan or a tap, which the native root decides, and a finger that lifts or is cancelled has been neither.
 */
export class LongPress<Handle> {
  private pending: { readonly pointerId: number; readonly origin: Point; readonly timer: Handle } | undefined;

  constructor(
    private readonly timers: Timers<Handle>,
    private readonly onHold: (pointerId: number, origin: Point) => void,
  ) {}

  get waiting(): boolean {
    return this.pending !== undefined;
  }

  /** A finger went down at `origin`. */
  start(pointerId: number, origin: Point): void {
    this.cancel();
    const timer = this.timers.set(() => {
      this.pending = undefined;
      this.onHold(pointerId, origin);
    }, TOUCH_SELECT_HOLD_MS);
    this.pending = { pointerId, origin, timer };
  }

  /** The finger moved: beyond the slop it is not holding. */
  moved(pointerId: number, position: Point): void {
    const { pending } = this;
    if (pending?.pointerId !== pointerId) return;
    if (Math.hypot(position.x - pending.origin.x, position.y - pending.origin.y) > TOUCH_SLOP_PX) this.cancel();
  }

  /** The finger lifted, or the root cancelled it. */
  end(pointerId: number): void {
    if (this.pending?.pointerId === pointerId) this.cancel();
  }

  cancel(): void {
    if (this.pending !== undefined) this.timers.clear(this.pending.timer);
    this.pending = undefined;
  }
}

/** A selection end as a line: the stem's x and its top and bottom, in the frame the editor draws in. */
export interface Edge {
  readonly x: number;
  readonly top: number;
  readonly bottom: number;
}

/** The distance from the finger that went down on a handle to the point the handle marks, which a dragged handle keeps. */
export function grabOffset(edge: Edge, finger: Point): Point {
  return { x: edge.x - finger.x, y: (edge.top + edge.bottom) / 2 - finger.y };
}

/** The point of the text a handle marks when the finger is at `finger`. */
export function dragTarget(finger: Point, grab: Point): Point {
  return { x: finger.x + grab.x, y: finger.y + grab.y };
}

export type MenuAction = 'cut' | 'copy' | 'paste' | 'selectAll';

export const MENU_LABELS: Readonly<Record<MenuAction, string>> = { cut: 'Cut', copy: 'Copy', paste: 'Paste', selectAll: 'Select All' };

/** What the selection allows. */
export interface MenuContext {
  readonly editable: boolean;
  readonly hasSelection: boolean;
  readonly allSelected: boolean;
}

/** The actions the menu offers, in the order both platforms use: Cut, Copy, Paste, Select All. */
export function menuActions(context: MenuContext): MenuAction[] {
  const actions: MenuAction[] = [];
  if (context.editable && context.hasSelection) actions.push('cut');
  if (context.hasSelection) actions.push('copy');
  if (context.editable) actions.push('paste');
  if (!context.allSelected) actions.push('selectAll');
  return actions;
}

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface MenuPlacement {
  readonly box: Box;
  readonly items: ReadonlyArray<{ readonly action: MenuAction; readonly box: Box }>;
}

/**
 * Where a menu of `labels` (each action and the width its label measures) goes over a selection whose visible ends are `ends`: centred
 * on them, above the start handle's ball or below the end handle's when there is no room above, inside `bounds` with a margin
 * (`layout_menu` in `native/touch_selection.rs`). `undefined` when nothing is offered or no end is visible.
 */
export function placeMenu(labels: ReadonlyArray<{ readonly action: MenuAction; readonly width: number }>, ends: readonly Edge[], bounds: Box): MenuPlacement | undefined {
  if (labels.length === 0 || ends.length === 0) return undefined;
  const width = labels.reduce((total, label) => total + label.width + 2 * MENU_ITEM_PADDING_PX, 0);
  const top = Math.min(...ends.map(edge => edge.top));
  const bottom = Math.max(...ends.map(edge => edge.bottom));
  const left = Math.min(...ends.map(edge => edge.x));
  const right = Math.max(...ends.map(edge => edge.x));
  const clearance = 2 * HANDLE_BALL_RADIUS_PX + MENU_GAP_PX;
  const above = top - clearance - MENU_HEIGHT_PX;
  const below = bottom + clearance;
  const lowest = bounds.y + bounds.height - MENU_EDGE_MARGIN_PX - MENU_HEIGHT_PX;
  const highest = bounds.y + MENU_EDGE_MARGIN_PX;
  let y: number;
  if (above >= highest) y = above;
  else if (below <= lowest) y = below;
  // Neither side has room (a selection as tall as the editor): over the selection, as near the top as the margin lets it.
  else y = Math.min(highest, lowest);
  const x = Math.max(bounds.x + MENU_EDGE_MARGIN_PX, Math.min((left + right) / 2 - width / 2, bounds.x + bounds.width - MENU_EDGE_MARGIN_PX - width));
  let cursor = x;
  const items = labels.map(label => {
    const segment = label.width + 2 * MENU_ITEM_PADDING_PX;
    const box = { x: cursor, y, width: segment, height: MENU_HEIGHT_PX };
    cursor += segment;
    return { action: label.action, box };
  });
  return { box: { x, y, width, height: MENU_HEIGHT_PX }, items };
}
