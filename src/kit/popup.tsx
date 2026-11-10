import {
  Children, isValidElement, useCallback, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode,
} from 'react';
import { View, useRootSize, type UIHandle } from '../components';
import type { Style, StyleProp } from '../types';
import { joinClassNames } from './parts';
import { placePopover, type PopoverPlacement } from './popover-position';

/**
 * What `Select` and `Combobox` share: a list of items in the overlay layer placed against an anchor, the registry
 * their items report to, and the pieces that draw the same way. Neither component's behaviour is here.
 */

/** The gap between the anchor and the list, and the margin to the root's edges, in logical pixels. */
export const DEFAULT_SIDE_OFFSET = 4;
export const DEFAULT_COLLISION_PADDING = 8;

/**
 * Items render in two modes. While the list is closed its content still renders its children, in `collect`
 * mode, where an item only registers itself (so the component can show the selected item's text before the list
 * was ever opened) and renders nothing. While it is open they render `item`s.
 */
export type ItemMode = 'collect' | 'item';

/** The closed list's children render here: nothing inside it takes part in layout. */
const COLLECTING_CLASS = 'hidden';

/** Renders `children` where they take no part in layout, for the items of a list that is not shown. */
export function CollectingItems(props: { children?: ReactNode }): ReactNode {
  return <View className={COLLECTING_CLASS}>{props.children}</View>;
}

const ICON_CLASS = 'items-center';
const ICON_ROW_CLASS = 'h-px bg-slate-500';
/** The widths of the caret's rows, top to bottom: a triangle drawn with one pixel high boxes (no icons). */
const CARET_ROW_WIDTHS: readonly number[] = [9, 7, 5, 3, 1];
const CARET_ROW_STYLES: readonly Style[] = CARET_ROW_WIDTHS.map((width) => Object.freeze({ width }));

export interface CaretProps {
  className?: string;
  style?: StyleProp;
  testID?: string;
}

/** A small downward caret, drawn from boxes: there are no icons or transforms. */
export function Caret(props: CaretProps): ReactNode {
  const { className, style, testID } = props;
  return (
    <View testID={testID} className={joinClassNames(ICON_CLASS, className)} style={style}>
      {CARET_ROW_STYLES.map((rowStyle, index) => <View key={CARET_ROW_WIDTHS[index]} className={ICON_ROW_CLASS} style={rowStyle} />)}
    </View>
  );
}

/**
 * Whether a press at (`x`, `y`) is on one of the list's scrollbar thumbs. Native starts dragging a thumb
 * only if the press's `pointerdown` was not prevented, and a list prevents the presses that are its
 * padding's, so a press on a thumb has to be told apart (the thumb is drawn over the items, and the
 * press's target is the list).
 */
export function isOnThumb(list: UIHandle | null, x: number, y: number): boolean {
  const thumbs = list?.getScrollState()?.thumbs;
  if (thumbs === undefined || thumbs === null) return false;
  return [thumbs.x, thumbs.y].some((thumb) => thumb !== null
    && x >= thumb.x && x < thumb.x + thumb.width && y >= thumb.y && y < thumb.y + thumb.height);
}

/** Where a list stands against its anchor. The list is at least as wide as the anchor. */
export interface ListPlacement extends PopoverPlacement {
  readonly minWidth: number;
}

/** `placement` as the same value when nothing moved, so a state update with it renders nothing. */
function samePlacement(left: ListPlacement | undefined, right: ListPlacement): boolean {
  return left !== undefined && left.left === right.left && left.top === right.top && left.minWidth === right.minWidth
    && left.maxHeight === right.maxHeight;
}

export interface PopupPlacementOptions {
  /** The element the list opens from: a select's trigger, a combobox's control. Read at each placement. */
  readonly anchor: () => UIHandle | null;
  /** The list itself, a scroll container whose own height is what placement fits. */
  readonly popup: MutableRefObject<UIHandle | null>;
  /** The space between the anchor and the list. */
  readonly sideOffset: number;
  /** The margin kept between the list and the root's edges. */
  readonly collisionPadding: number;
  /** Said when the anchor or the list is not mounted, naming the component that needs them. */
  readonly missing: string;
}

export interface PopupPlacement {
  /** The style that puts the list in place: `left`, `top`, and once placed `minWidth` and `maxHeight`. */
  readonly style: Style;
  /** The root's size the list is placed in. */
  readonly viewport: { readonly width: number; readonly height: number };
}

/**
 * Place a list against its anchor, measured and in the same JS turn. The list renders at the origin, a layout
 * effect reads the anchor's and the list's rectangles and the root's size, and `placePopover` says where it goes;
 * both commits happen before anything is drawn. It runs after every render, because the list's size depends on
 * its items and the anchor can move. The height placed for is the items' own: a list capped by an earlier
 * placement reports its box, but its `scrollHeight` is what its items need.
 */
export function usePopupPlacement(options: PopupPlacementOptions): PopupPlacement {
  const { anchor, popup, sideOffset, collisionPadding, missing } = options;
  const viewport = useRootSize();
  const [placement, setPlacement] = useState<ListPlacement | undefined>(undefined);
  useLayoutEffect(() => {
    const anchorRect = anchor()?.getRect();
    const box = popup.current?.getRect();
    if (anchorRect === undefined || box === undefined) throw new Error(missing);
    // A list that is not a scroll container (the caller turned `overflow` off) is as tall as its items.
    const scroll = popup.current?.getScrollState();
    const height = scroll === undefined ? box.height : box.height - scroll.clientHeight + scroll.scrollHeight;
    const next: ListPlacement = {
      ...placePopover({
        anchor: anchorRect, content: { width: box.width, height }, viewport, gap: sideOffset, padding: collisionPadding,
      }),
      minWidth: anchorRect.width,
    };
    setPlacement((current) => (samePlacement(current, next) ? current : next));
  });
  const style = useMemo((): Style => ({
    left: placement?.left ?? 0,
    top: placement?.top ?? 0,
    ...(placement === undefined ? {} : { minWidth: placement.minWidth, maxHeight: placement.maxHeight }),
  }), [placement]);
  return { style, viewport };
}

/** The entries an item registry holds: each names the item that registered it. */
export interface RegistryEntry {
  readonly id: string;
}

/**
 * `entries` with `entry` added, or replaced where an entry with its id is; the same array when `same` says nothing
 * changed, so a state update with it renders nothing.
 */
export function upsertEntry<T extends RegistryEntry>(
  entries: readonly T[], entry: T, same: (existing: T, next: T) => boolean,
): readonly T[] {
  const index = entries.findIndex((existing) => existing.id === entry.id);
  if (index === -1) return [...entries, entry];
  const existing = entries[index];
  if (existing !== undefined && same(existing, entry)) return entries;
  return entries.map((candidate, position) => (position === index ? entry : candidate));
}

export interface ItemRegistry<T extends RegistryEntry> {
  /** The items as of the last render: what a closed list's value shows. */
  readonly entries: readonly T[];
  /** The items as of now, for key handlers: registered the moment an item mounts. */
  readonly registry: MutableRefObject<readonly T[]>;
  readonly upsert: (entry: T) => void;
  readonly remove: (id: string) => void;
}

/**
 * The items a list holds. Items register in a layout effect (see `ItemMode`). The registry is the latest list;
 * `entries` is the same list as state, so renders see it.
 */
export function useItemRegistry<T extends RegistryEntry>(same: (existing: T, next: T) => boolean): ItemRegistry<T> {
  const registry = useRef<readonly T[]>([]);
  const [entries, setEntries] = useState<readonly T[]>(registry.current);
  const upsert = useCallback((entry: T) => {
    const next = upsertEntry(registry.current, entry, same);
    if (next === registry.current) return;
    registry.current = next;
    setEntries(next);
  }, [same]);
  const remove = useCallback((id: string) => {
    if (!registry.current.some((entry) => entry.id === id)) return;
    registry.current = registry.current.filter((entry) => entry.id !== id);
    setEntries(registry.current);
  }, []);
  return { entries, registry, upsert, remove };
}

/**
 * One item's text from its children: strings and numbers, and what the item's text parts (`isTextPart`)
 * hold.
 */
export function textOfChildren(node: ReactNode, isTextPart: (type: unknown) => boolean): string | undefined {
  let text: string | undefined;
  Children.forEach(node, (child) => {
    if (typeof child === 'string' || typeof child === 'number') {
      text = (text ?? '') + String(child);
    } else if (isValidElement<{ children?: ReactNode }>(child) && isTextPart(child.type)) {
      const inner = textOfChildren(child.props.children, isTextPart);
      if (inner !== undefined) text = (text ?? '') + inner;
    }
  });
  return text;
}
