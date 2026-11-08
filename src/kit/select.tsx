import {
  createContext, forwardRef, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef,
  type MutableRefObject, type ReactNode,
} from 'react';
import { Button, Portal, Text, View, type UIHandle } from '../components';
import type { UIKeyboardEvent } from '../events';
import type { UIAriaProps } from '../types';
import { inDocumentOrder } from './collection';
import { hasShortcutModifier, Key } from './keys';
import { TYPE_AHEAD_RESET_MS, edgeEnabled, stepEnabled, typeAheadMatch } from './listbox';
import { joinClassNames, useComposedRef, useStyle, type PartProps } from './parts';
import {
  Caret, CollectingItems, DEFAULT_COLLISION_PADDING, DEFAULT_SIDE_OFFSET, isOnThumb, textOfChildren, useItemRegistry,
  usePopupPlacement, type ItemMode,
} from './popup';
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

/** The mode the items of `Select.Content` render in: see `ItemMode`. `Select.Value` shows the selected item's text before the list was ever opened. */
const ItemModeContext = createContext<ItemMode | null>(null);

interface ItemContext {
  readonly selected: boolean;
}
const ItemContextValue = createContext<ItemContext | null>(null);

const TRIGGER_CLASS = 'flex-row items-center justify-between gap-2 text-left rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 cursor-pointer hover:bg-slate-50 active:bg-slate-100 focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50';
const VALUE_CLASS = 'text-slate-900';
const PLACEHOLDER_CLASS = 'text-slate-400';
/**
 * The list scrolls (`overflow-y-auto`) once placement has capped its height to the room the side it opens
 * on has; a wheel that reaches an end of it stays in the list (`overscroll-contain`).
 */
const CONTENT_CLASS = 'absolute overflow-y-auto overscroll-contain rounded-lg border border-slate-200 bg-white p-1 gap-0.5';
const BACKDROP_CLASS = 'absolute inset-0';
/** Items never shrink to fit the list: a list with too many of them scrolls instead. */
const ITEM_CLASS = 'shrink-0 flex-row items-center justify-between gap-3 text-left rounded-md px-2 py-1.5 text-sm text-slate-800';
const ENABLED_ITEM_CLASS = 'cursor-pointer focus:bg-indigo-50 active:bg-indigo-100';
/** A disabled item is dimmed by its own class: see `SelectItem` for why native is not told it is disabled. */
const DISABLED_ITEM_CLASS = 'cursor-not-allowed opacity-50';
const ITEM_TEXT_CLASS = 'text-slate-800';
const INDICATOR_CLASS = 'w-2 h-2 rounded-sm bg-indigo-600';
/** Whether an item registered again says anything new: a state update with the same entry renders nothing. */
function sameEntry(existing: ItemEntry, next: ItemEntry): boolean {
  return existing.value === next.value && existing.textValue === next.textValue && existing.disabled === next.disabled;
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
  const { entries, registry, upsert, remove } = useItemRegistry(sameEntry);

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
  return <Caret testID={testID} className={className} style={style} />;
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
  return textOfChildren(node, (type) => type === SelectItemText);
}

/**
 * One option: a `Button` with `role="option"` and `aria-selected`, not in the Tab order (focus moves
 * between items with the arrow keys). Choosing it is the button's `click`, so a press, Enter and Space
 * all do it. The item the pointer moves over takes focus, so the pointer and the keyboard share one highlight
 * (`focus:`); that focus shows no ring.
 *
 * A disabled item is dimmed, skipped by the keys, and chooses nothing, but native is not told it is
 * `disabled`: native sends no pointer event for a press on a disabled element, so the list could not
 * prevent the press's default, which clears focus from an element that takes none, and the keys would stop
 * reaching the list. It is `aria-disabled` instead, and the press is the list's like any other.
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
        tabIndex={-1}
        className={joinClassNames(ITEM_CLASS, disabled ? DISABLED_ITEM_CLASS : ENABLED_ITEM_CLASS, className)}
        style={style}
        role="option"
        aria-selected={selected}
        aria-disabled={disabled}
        onClick={() => { if (!disabled) select.choose(value); }}
        // Moving the pointer over an item takes it, not merely being over it: scrolling the list under a pointer that
        // rests on it changes the item under the pointer, and that must not move focus off the item the keys chose.
        // A finger dragging the list is not choosing.
        onPointerMove={(event) => {
          if (!disabled && event.pointerType !== 'touch') event.currentTarget.focus({ focusVisible: false });
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
  const listbox = useRef<UIHandle | null>(null);
  const setRef = useComposedRef(listbox, ref);

  // Placed from what layout made of it, after every render: its size depends on its items, and the
  // trigger can move.
  const { style: own, viewport } = usePopupPlacement({
    anchor: () => select.trigger.current, popup: listbox, sideOffset, collisionPadding,
    missing: '<Select.Content> needs a mounted <Select.Trigger> and a mounted list to place the list',
  });

  // The list was placed for the size the root had when it opened. A resize lays the page out again and
  // native drops the focus of an element that layout pushed out of the root before JS can place the list
  // again, so, as Radix's Select does, the list closes instead. `dismiss` gives the trigger focus back.
  const openedIn = useRef(viewport);
  const { dismiss } = select;
  useLayoutEffect(() => {
    if (viewport !== openedIn.current) dismiss();
  }, [viewport, dismiss]);

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
        // A mouse press on the list's padding must not take focus out of it (native clears element focus for a
        // press on something that cannot take it); items still click. A press on a scrollbar thumb is
        // left alone, so it drags the list. A touch is left alone too: a prevented press cannot become a pan
        // (`may_pan` in native/pointer_input.rs), and the list has to scroll under a finger. The press then
        // focuses the item or the list under it, and a tap clicks the item as before.
        onPointerDown={(event) => {
          if (event.pointerType !== 'touch' && !isOnThumb(listbox.current, event.x, event.y)) event.preventDefault();
        }}
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
 * kept inside the root. A list taller than the room on that side is capped to it and scrolls (wheel,
 * touch, its scrollbar, and the keys that move focus bring the focused item into view). It closes if the
 * root is resized while it is open.
 */
const SelectContent = forwardRef<UIHandle, SelectContentProps>(function SelectContent(props, ref) {
  const select = useSelect('Content');
  if (select.open) return <OpenContent {...props} ref={ref} />;
  return (
    <CollectingItems>
      <ItemModeContext.Provider value="collect">{props.children}</ItemModeContext.Provider>
    </CollectingItems>
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
