import {
  Children, createContext, forwardRef, isValidElement, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo,
  useRef, useState, type MutableRefObject, type ReactNode,
} from 'react';
import { Button, Portal, Text, View, useRootSize, type UIHandle } from '../components';
import type { UIKeyboardEvent } from '../events';
import type { Style, UIAriaProps } from '../types';
import { inDocumentOrder } from './collection';
import { hasShortcutModifier, Key } from './keys';
import { TYPE_AHEAD_RESET_MS, edgeEnabled, stepEnabled, typeAheadMatch } from './listbox';
import { joinClassNames, useComposedRef, useStyle, type PartProps } from './parts';
import { placePopover, type PopoverPlacement } from './popover-position';
import { useControllableState } from './use-controllable-state';

export interface SelectRootProps {
  /** The selected item's `value`; `null` is a controlled select with nothing selected. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
  /** Whether the list is open. Defining it makes the open state the parent's. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  children?: ReactNode;
}

export interface SelectTriggerProps extends PartProps, Omit<UIAriaProps, 'role' | 'aria-expanded'> {
  testID?: string;
  /** Usually `Select.Value` and `Select.Icon`. */
  children?: ReactNode;
}

export interface SelectValueProps extends PartProps {
  testID?: string;
  /** Shown while nothing is selected. */
  placeholder?: string;
  /** Replaces the selected item's text. */
  children?: ReactNode;
}

export interface SelectIconProps extends PartProps {
  testID?: string;
}

export interface SelectContentProps extends PartProps, Omit<UIAriaProps, 'role'> {
  /** The list's `testID`; its backdrop's is this with `-backdrop` appended. */
  testID?: string;
  /** The space between the trigger and the list. */
  sideOffset?: number;
  /** The margin kept between the list and the root's edges. */
  collisionPadding?: number;
  /** `Select.Item`s, and components that render them. */
  children?: ReactNode;
}

export interface SelectItemProps extends PartProps, Omit<UIAriaProps, 'role' | 'aria-selected'> {
  /** What the select's value is while this item is selected. Unique within the select. */
  value: string;
  disabled?: boolean;
  /**
   * The item's text for the select's `Value` and for type-ahead. By default it is the text of the item's
   * string children and `Select.ItemText`s; set it when the item shows something else.
   */
  textValue?: string;
  testID?: string;
  children?: ReactNode;
}

export interface SelectItemTextProps extends PartProps {
  testID?: string;
  children?: ReactNode;
}

export interface SelectItemIndicatorProps extends PartProps {
  testID?: string;
  /** Shown while the item is selected. Without it, a small filled square. */
  children?: ReactNode;
}

/** What the select knows of an item: its text, to show and to search, and its element, to move focus to. */
interface ItemEntry {
  readonly id: string;
  readonly value: string;
  readonly textValue: string;
  readonly disabled: boolean;
  readonly handle: MutableRefObject<UIHandle | null>;
}

interface SelectContext {
  readonly value: string | null;
  readonly open: boolean;
  readonly disabled: boolean;
  readonly setOpen: (open: boolean) => void;
  /** Select `value`, close the list and give focus back to the trigger. */
  readonly choose: (value: string) => void;
  /** Close the list without choosing and give focus back to the trigger. */
  readonly dismiss: () => void;
  readonly trigger: MutableRefObject<UIHandle | null>;
  /** The items as of the last render: what `Value` shows. */
  readonly entries: readonly ItemEntry[];
  /** The items as of now, for the key handlers: registered the moment an item mounts. */
  readonly registry: MutableRefObject<readonly ItemEntry[]>;
  readonly upsert: (entry: ItemEntry) => void;
  readonly remove: (id: string) => void;
}

const SelectContextValue = createContext<SelectContext | null>(null);

function useSelect(part: string): SelectContext {
  const select = useContext(SelectContextValue);
  if (select === null) throw new Error(`<Select.${part}> must be rendered inside <Select.Root>`);
  return select;
}

/**
 * Items render in two modes. While the list is closed `Select.Content` still renders its children, in
 * `collect` mode, where an item only registers itself (so `Select.Value` can show the selected item's
 * text before the list was ever opened) and renders nothing. While it is open they render `item`s.
 */
type ItemMode = 'collect' | 'item';
const ItemModeContext = createContext<ItemMode | null>(null);

interface ItemContext {
  readonly selected: boolean;
}
const ItemContextValue = createContext<ItemContext | null>(null);

/** The gap between the trigger and the list, and the margin to the root's edges, in logical pixels. */
const DEFAULT_SIDE_OFFSET = 4;
const DEFAULT_COLLISION_PADDING = 8;

const TRIGGER_CLASS = 'flex-row items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 cursor-pointer hover:bg-slate-50 active:bg-slate-100 focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50';
const VALUE_CLASS = 'text-slate-900';
const PLACEHOLDER_CLASS = 'text-slate-400';
const ICON_CLASS = 'items-center';
const ICON_ROW_CLASS = 'h-px bg-slate-500';
/** The widths of the caret's rows, top to bottom: a triangle drawn with one pixel high boxes (no icons, plan 3.23). */
const CARET_ROW_WIDTHS: readonly number[] = [9, 7, 5, 3, 1];
const CARET_ROW_STYLES: readonly Style[] = CARET_ROW_WIDTHS.map((width) => Object.freeze({ width }));
const CONTENT_CLASS = 'absolute rounded-lg border border-slate-200 bg-white p-1 gap-0.5';
const BACKDROP_CLASS = 'absolute inset-0';
const ITEM_CLASS = 'flex-row items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm text-slate-800 cursor-pointer focus:bg-indigo-50 active:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50';
const ITEM_TEXT_CLASS = 'text-slate-800';
const INDICATOR_CLASS = 'w-2 h-2 rounded-sm bg-indigo-600';
/** The closed list's children render here: nothing inside it takes part in layout. */
const COLLECTING_CLASS = 'hidden';

function upsertEntry(entries: readonly ItemEntry[], entry: ItemEntry): readonly ItemEntry[] {
  const index = entries.findIndex((existing) => existing.id === entry.id);
  if (index === -1) return [...entries, entry];
  const existing = entries[index];
  if (existing !== undefined && existing.value === entry.value && existing.textValue === entry.textValue
    && existing.disabled === entry.disabled) {
    return entries;
  }
  return entries.map((candidate, position) => (position === index ? entry : candidate));
}

/**
 * A select: a trigger that shows the selected item's text and a list of items in the overlay layer.
 *
 * ```tsx
 * <Select.Root value={fruit} onValueChange={setFruit}>
 *   <Select.Trigger aria-label="Fruit"><Select.Value placeholder="Pick one" /><Select.Icon /></Select.Trigger>
 *   <Select.Content>
 *     <Select.Item value="apple"><Select.ItemText>Apple</Select.ItemText><Select.ItemIndicator /></Select.Item>
 *   </Select.Content>
 * </Select.Root>
 * ```
 *
 * Keyboard (WAI-ARIA Authoring Practices, select-only combobox): on the trigger, Enter and Space (the
 * button's own activation) and ArrowDown and ArrowUp open the list. Opening focuses the selected item,
 * or the first enabled one. In the list ArrowDown and ArrowUp move, Home and End jump, Enter and Space
 * choose (the item is a button), Escape closes, Tab chooses the focused item and moves on, and a letter
 * moves to the next item that starts with what was typed. Closing, however it happens, gives focus back
 * to the trigger. A press outside the list closes it.
 */
function SelectRoot(props: SelectRootProps): ReactNode {
  const { value, defaultValue = null, onValueChange, open, defaultOpen = false, onOpenChange, disabled = false, children } = props;
  const [selected, setSelected] = useControllableState<string | null, string>({
    prop: value, defaultProp: defaultValue, onChange: onValueChange, name: 'Select value',
  });
  const [isOpen, setOpen] = useControllableState<boolean>({
    prop: open, defaultProp: defaultOpen, onChange: onOpenChange, name: 'Select open',
  });
  const trigger = useRef<UIHandle | null>(null);
  // The registry is the latest list; `entries` is the same list as state, so renders see it.
  const registry = useRef<readonly ItemEntry[]>([]);
  const [entries, setEntries] = useState<readonly ItemEntry[]>(registry.current);
  const upsert = useCallback((entry: ItemEntry) => {
    const next = upsertEntry(registry.current, entry);
    if (next === registry.current) return;
    registry.current = next;
    setEntries(next);
  }, []);
  const remove = useCallback((id: string) => {
    if (!registry.current.some((entry) => entry.id === id)) return;
    registry.current = registry.current.filter((entry) => entry.id !== id);
    setEntries(registry.current);
  }, []);

  const dismiss = useCallback(() => {
    // Focus first: closing removes the focused item, and native then clears the focus it held.
    // A disabled trigger cannot take focus (and `focus()` refuses it).
    if (!disabled) trigger.current?.focus();
    setOpen(false);
  }, [disabled, setOpen]);
  const choose = useCallback((next: string) => {
    setSelected(next);
    dismiss();
  }, [setSelected, dismiss]);

  const context = useMemo((): SelectContext => ({
    value: selected, open: isOpen, disabled, setOpen, choose, dismiss, trigger, entries, registry, upsert, remove,
  }), [selected, isOpen, disabled, setOpen, choose, dismiss, entries, upsert, remove]);
  return <SelectContextValue.Provider value={context}>{children}</SelectContextValue.Provider>;
}
SelectRoot.displayName = 'Select.Root';

/** The button that opens the list: `role="combobox"`, and `aria-expanded` while the list is open. */
const SelectTrigger = forwardRef<UIHandle, SelectTriggerProps>(function SelectTrigger(props, ref) {
  const { className, style, testID, children, ...aria } = props;
  const select = useSelect('Trigger');
  const setRef = useComposedRef(select.trigger, ref);
  const onKeyDown = (event: UIKeyboardEvent) => {
    if (hasShortcutModifier(event)) return;
    if (event.key !== Key.ArrowDown && event.key !== Key.ArrowUp) return;
    event.preventDefault();
    select.setOpen(true);
  };
  return (
    <Button
      {...aria}
      ref={setRef}
      testID={testID}
      disabled={select.disabled}
      className={joinClassNames(TRIGGER_CLASS, className)}
      style={style}
      role="combobox"
      aria-expanded={select.open}
      onClick={() => { select.setOpen(!select.open); }}
      onKeyDown={onKeyDown}
    >
      {children}
    </Button>
  );
});
SelectTrigger.displayName = 'Select.Trigger';

/** The selected item's text, or the placeholder while nothing is selected. */
function SelectValue(props: SelectValueProps): ReactNode {
  const { className, style, testID, placeholder = '', children } = props;
  const select = useSelect('Value');
  const empty = select.value === null;
  const label = empty ? undefined : select.entries.find((entry) => entry.value === select.value)?.textValue;
  return (
    <Text testID={testID} className={joinClassNames(empty ? PLACEHOLDER_CLASS : VALUE_CLASS, className)} style={style}>
      {children ?? (empty ? placeholder : label ?? '')}
    </Text>
  );
}
SelectValue.displayName = 'Select.Value';

/** A small downward caret, drawn from boxes: there are no icons or transforms. */
function SelectIcon(props: SelectIconProps): ReactNode {
  const { className, style, testID } = props;
  return (
    <View testID={testID} className={joinClassNames(ICON_CLASS, className)} style={style}>
      {CARET_ROW_STYLES.map((rowStyle, index) => <View key={CARET_ROW_WIDTHS[index]} className={ICON_ROW_CLASS} style={rowStyle} />)}
    </View>
  );
}
SelectIcon.displayName = 'Select.Icon';

/** How a selected item's `Select.ItemIndicator` is told it is selected. */
function useItem(part: string): ItemContext {
  const item = useContext(ItemContextValue);
  if (item === null) throw new Error(`<Select.${part}> must be rendered inside <Select.Item>`);
  return item;
}

/** One item's text from its children: strings and numbers, and what `Select.ItemText` holds. */
function textOf(node: ReactNode): string | undefined {
  let text: string | undefined;
  Children.forEach(node, (child) => {
    if (typeof child === 'string' || typeof child === 'number') {
      text = (text ?? '') + String(child);
    } else if (isValidElement<{ children?: ReactNode }>(child) && child.type === SelectItemText) {
      const inner = textOf(child.props.children);
      if (inner !== undefined) text = (text ?? '') + inner;
    }
  });
  return text;
}

/**
 * One option: a `Button` with `role="option"` and `aria-selected`, not in the Tab order (focus moves
 * between items with the arrow keys). Choosing it is the button's `click`, so a press, Enter and Space
 * all do it. The item under the pointer takes focus, so the pointer and the keyboard share one highlight
 * (`focus:`); that focus shows no ring.
 */
const SelectItem = forwardRef<UIHandle, SelectItemProps>(function SelectItem(props, ref) {
  const { value, disabled = false, textValue, className, style, testID, children, ...aria } = props;
  const select = useSelect('Item');
  const mode = useContext(ItemModeContext);
  if (mode === null) throw new Error('<Select.Item> must be rendered inside <Select.Content>');
  const { upsert, remove } = select;
  const id = useId();
  const handle = useRef<UIHandle | null>(null);
  const setRef = useComposedRef(handle, ref);
  const label = textValue ?? textOf(children) ?? value;

  useLayoutEffect(() => {
    upsert({ id, value, textValue: label, disabled, handle });
  }, [upsert, id, value, label, disabled]);
  useLayoutEffect(() => () => { remove(id); }, [remove, id]);

  if (mode === 'collect') return null;
  const selected = select.value === value;
  return (
    <ItemContextValue.Provider value={{ selected }}>
      <Button
        {...aria}
        ref={setRef}
        testID={testID}
        disabled={disabled}
        tabIndex={-1}
        className={joinClassNames(ITEM_CLASS, className)}
        style={style}
        role="option"
        aria-selected={selected}
        onClick={() => { select.choose(value); }}
        onPointerEnter={(event) => {
          // A pointer can enter the label of a disabled item, whose button takes no focus.
          if (!disabled) event.currentTarget.focus({ focusVisible: false });
        }}
      >
        {children}
      </Button>
    </ItemContextValue.Provider>
  );
});
SelectItem.displayName = 'Select.Item';

/** The item's text. Its string is also what `Select.Value` shows and what type-ahead searches. */
const SelectItemText = forwardRef<UIHandle, SelectItemTextProps>(function SelectItemText(props, ref) {
  const { className, style, testID, children } = props;
  useItem('ItemText');
  return <Text ref={ref} testID={testID} className={joinClassNames(ITEM_TEXT_CLASS, className)} style={style}>{children}</Text>;
});
SelectItemText.displayName = 'Select.ItemText';

/** Renders only in the selected item. */
function SelectItemIndicator(props: SelectItemIndicatorProps): ReactNode {
  const { className, style, testID, children } = props;
  const item = useItem('ItemIndicator');
  if (!item.selected) return null;
  return (
    <View testID={testID} className={joinClassNames(children === undefined && INDICATOR_CLASS, className)} style={style}>
      {children}
    </View>
  );
}
SelectItemIndicator.displayName = 'Select.ItemIndicator';

/** `placement` as the same value when nothing moved, so a state update with it renders nothing. */
function samePlacement(left: ListPlacement | undefined, right: ListPlacement): boolean {
  return left !== undefined && left.left === right.left && left.top === right.top && left.minWidth === right.minWidth;
}

interface ListPlacement extends PopoverPlacement {
  /** The trigger's width: the list is at least as wide as the trigger. */
  readonly minWidth: number;
}

/**
 * The list while the select is open: a backdrop that closes it, and the listbox, both in the overlay
 * layer. Overlay events bubble along the overlay's own tree (plan D26), so everything that handles them
 * is inside it: the listbox for the keys and the items for their clicks.
 */
const OpenContent = forwardRef<UIHandle, SelectContentProps>(function OpenContent(props, ref) {
  const {
    className, style, testID, children, sideOffset = DEFAULT_SIDE_OFFSET, collisionPadding = DEFAULT_COLLISION_PADDING, ...aria
  } = props;
  const select = useSelect('Content');
  const viewport = useRootSize();
  const listbox = useRef<UIHandle | null>(null);
  const setRef = useComposedRef(listbox, ref);
  const [placement, setPlacement] = useState<ListPlacement | undefined>(undefined);

  // Placed from what layout made of it, after every render: its size depends on its items, and the
  // trigger and the root can move. The first pass is at the origin, and the second is final; both happen
  // before anything is drawn.
  useLayoutEffect(() => {
    const anchor = select.trigger.current?.getRect();
    const box = listbox.current?.getRect();
    if (anchor === undefined || box === undefined) {
      throw new Error('<Select.Content> needs a mounted <Select.Trigger> and a mounted list to place the list');
    }
    const next: ListPlacement = {
      ...placePopover({
        anchor, content: { width: box.width, height: box.height }, viewport, gap: sideOffset, padding: collisionPadding,
      }),
      minWidth: anchor.width,
    };
    setPlacement((current) => (samePlacement(current, next) ? current : next));
  });

  // Focus moves into the list: the selected item, else the first enabled one, else the list itself.
  // Only on opening (no dependencies): the items are registered by now, children's effects run first.
  useLayoutEffect(() => {
    const items = inDocumentOrder(select.registry.current, (entry) => entry.handle.current);
    const target = items.find((entry) => !entry.disabled && entry.value === select.value) ?? items.find((entry) => !entry.disabled);
    (target?.handle.current ?? listbox.current)?.focus();
  }, []);

  const search = useRef('');
  const searchReset = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => {
    if (searchReset.current !== undefined) clearTimeout(searchReset.current);
  }, []);

  const onKeyDown = (event: UIKeyboardEvent) => {
    if (hasShortcutModifier(event) || event.isComposing) return;
    const items = inDocumentOrder(select.registry.current, (entry) => entry.handle.current);
    const focused = items.findIndex((entry) => entry.handle.current?.id === event.target.id);
    const focusItem = (index: number | undefined) => {
      const target = index === undefined ? undefined : items[index];
      if (target !== undefined && index !== focused) target.handle.current?.focus();
    };
    switch (event.key) {
      case Key.Escape:
        event.preventDefault();
        select.dismiss();
        return;
      case Key.ArrowDown:
        event.preventDefault();
        focusItem(stepEnabled(items, focused, 1));
        return;
      case Key.ArrowUp:
        event.preventDefault();
        focusItem(stepEnabled(items, focused, -1));
        return;
      case Key.Home:
        event.preventDefault();
        focusItem(edgeEnabled(items, 'first'));
        return;
      case Key.End:
        event.preventDefault();
        focusItem(edgeEnabled(items, 'last'));
        return;
      case Key.Tab: {
        // Not prevented: after the list closes and the trigger has focus, native moves on from the trigger.
        const item = items[focused];
        if (item !== undefined && !item.disabled) select.choose(item.value);
        else select.dismiss();
        return;
      }
      case Key.Enter:
        return;
      default:
        break;
    }
    // A space chooses the focused item, as Enter does, unless it continues a word being typed.
    const typing = search.current !== '';
    if (event.key === Key.Space && !typing) return;
    if ([...event.key].length !== 1) return;
    event.preventDefault();
    search.current += event.key;
    if (searchReset.current !== undefined) clearTimeout(searchReset.current);
    searchReset.current = setTimeout(() => {
      search.current = '';
      searchReset.current = undefined;
    }, TYPE_AHEAD_RESET_MS);
    const labels = items.map((entry) => ({ label: entry.textValue, disabled: entry.disabled }));
    focusItem(typeAheadMatch(labels, focused, search.current));
  };

  const own = useMemo((): Style => ({
    left: placement?.left ?? 0, top: placement?.top ?? 0, ...(placement === undefined ? {} : { minWidth: placement.minWidth }),
  }), [placement]);
  const merged = useStyle(own, style);

  return (
    <Portal>
      <View testID={testID === undefined ? undefined : `${testID}-backdrop`} className={BACKDROP_CLASS} onClick={select.dismiss} />
      <View
        {...aria}
        ref={setRef}
        testID={testID}
        // Focusable, so a list with no enabled item still has somewhere for focus and Escape to go.
        tabIndex={-1}
        className={joinClassNames(CONTENT_CLASS, className)}
        style={merged}
        role="listbox"
        onKeyDown={onKeyDown}
        // A press on the list's padding must not take focus out of it (native clears element focus for a
        // press on something that cannot take it); items still click.
        onPointerDown={(event) => { event.preventDefault(); }}
      >
        <ItemModeContext.Provider value="item">{children}</ItemModeContext.Provider>
      </View>
    </Portal>
  );
});
OpenContent.displayName = 'Select.OpenContent';

/**
 * The list. Closed, it only collects its items (see `ItemMode`); open, it is the listbox in the overlay
 * layer, under the trigger or above it where there is more room, at least as wide as the trigger and
 * kept inside the root. A list taller than the space it has is clipped by the window: scrolling comes
 * with `ScrollView` (Phase I5).
 */
const SelectContent = forwardRef<UIHandle, SelectContentProps>(function SelectContent(props, ref) {
  const select = useSelect('Content');
  if (select.open) return <OpenContent {...props} ref={ref} />;
  return (
    <View className={COLLECTING_CLASS}>
      <ItemModeContext.Provider value="collect">{props.children}</ItemModeContext.Provider>
    </View>
  );
});
SelectContent.displayName = 'Select.Content';

export const Select = {
  Root: SelectRoot,
  Trigger: SelectTrigger,
  Value: SelectValue,
  Icon: SelectIcon,
  Content: SelectContent,
  Item: SelectItem,
  ItemText: SelectItemText,
  ItemIndicator: SelectItemIndicator,
} as const;
