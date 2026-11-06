import type { LayoutRect } from '../native';

export type PopoverSide = 'top' | 'bottom';

export interface PopoverPlacementInput {
  /** The element the popover opens from, in root-local pixels (`getRect()`). */
  readonly anchor: LayoutRect;
  /**
   * The popover's own size, measured after layout: its natural size, not one an earlier placement capped
   * with `maxHeight` (a scroll container reports that as its `scrollHeight`).
   */
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
  /**
   * The tallest the popover can be on that side without leaving the viewport or covering the anchor: the
   * popover must be given this as its `maxHeight` (and scroll what does not fit), and `top` is for a
   * popover no taller than that. Never negative.
   */
  readonly maxHeight: number;
}

/** `value` held to `[low, high]`; where the range is empty (`high < low`) the low end wins. */
function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(value, Math.max(low, high)));
}

/**
 * Where a popover goes: under its anchor with its left edges aligned, unless it does not fit below and
 * there is more room above, in which case it flips above; then pushed back inside the viewport. A
 * popover taller than the side it ends up on is limited to that side's room (`maxHeight`), so a list
 * that is too long for either side scrolls instead of leaving the viewport. Pure: the caller measures the
 * anchor, the popover and the viewport, and applies `maxHeight`.
 */
export function placePopover(input: PopoverPlacementInput): PopoverPlacement {
  const { anchor, content, viewport, gap, padding } = input;
  const spaceBelow = viewport.height - (anchor.y + anchor.height) - gap - padding;
  const spaceAbove = anchor.y - gap - padding;
  const side: PopoverSide = content.height <= spaceBelow || spaceBelow >= spaceAbove ? 'bottom' : 'top';
  const maxHeight = Math.max(0, side === 'bottom' ? spaceBelow : spaceAbove);
  const height = Math.min(content.height, maxHeight);
  const wantedTop = side === 'bottom' ? anchor.y + anchor.height + gap : anchor.y - gap - height;
  return {
    left: clamp(anchor.x, padding, viewport.width - padding - content.width),
    top: clamp(wantedTop, padding, viewport.height - padding - height),
    side,
    maxHeight,
  };
}
