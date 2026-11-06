import type { LayoutRect } from '../native';

export type PopoverSide = 'top' | 'bottom';

export interface PopoverPlacementInput {
  /** The element the popover opens from, in root-local pixels (`getRect()`). */
  readonly anchor: LayoutRect;
  /** The popover's own size, measured after layout. */
  readonly content: { readonly width: number; readonly height: number };
  /** The root's size (`useRootSize()`): the popover is kept inside it. */
  readonly viewport: { readonly width: number; readonly height: number };
  /** The space between the anchor and the popover. */
  readonly gap: number;
  /** The margin kept between the popover and the root's edges. */
  readonly padding: number;
}

export interface PopoverPlacement {
  /** The popover's top-left corner, root-local. */
  readonly left: number;
  readonly top: number;
  /** The side of the anchor it opened on: `top` means it flipped. */
  readonly side: PopoverSide;
}

/** `value` held to `[low, high]`; where the range is empty (`high < low`) the low end wins. */
function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(value, Math.max(low, high)));
}

/**
 * Where a popover goes: under its anchor with its left edges aligned, unless it does not fit below and
 * there is more room above, in which case it flips above; then pushed back inside the viewport. A
 * popover taller than either side is pinned to the nearer edge of the viewport and overflows the other,
 * which is clipped by the window (a scrolling list is the answer to that, not a smaller popover).
 * Pure: the caller measures the anchor, the popover and the viewport.
 */
export function placePopover(input: PopoverPlacementInput): PopoverPlacement {
  const { anchor, content, viewport, gap, padding } = input;
  const spaceBelow = viewport.height - (anchor.y + anchor.height) - gap - padding;
  const spaceAbove = anchor.y - gap - padding;
  const side: PopoverSide = content.height <= spaceBelow || spaceBelow >= spaceAbove ? 'bottom' : 'top';
  const wantedTop = side === 'bottom' ? anchor.y + anchor.height + gap : anchor.y - gap - content.height;
  return {
    left: clamp(anchor.x, padding, viewport.width - padding - content.width),
    top: clamp(wantedTop, padding, viewport.height - padding - content.height),
    side,
  };
}
