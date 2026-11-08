import {
  createContext, forwardRef, useCallback, useContext, useId, useLayoutEffect, useMemo, useRef, useState,
  type MutableRefObject, type ReactNode,
} from 'react';
import { Button, View, type UIHandle } from '../components';
import type { UIKeyboardEvent } from '../events';
import type { StyleProp, UIAriaProps } from '../types';
import { inDocumentOrder, useInDocumentOrder } from './collection';
import { hasShortcutModifier, Key } from './keys';
import { joinClassNames, useComposedRef, type PartProps } from './parts';
import { useControllableState } from './use-controllable-state';

export type RadioOrientation = 'horizontal' | 'vertical';

export interface RadioGroupRootProps extends PartProps, Omit<UIAriaProps, 'role' | 'aria-orientation'> {
  /** The selected item's `value`; `null` is a controlled group with nothing selected. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
  /** Disables every item. */
  disabled?: boolean;
  /**
   * Which arrow keys move between items: `'horizontal'` takes Left and Right, `'vertical'` Up and
   * Down, and unset takes all four (the WAI-ARIA Authoring Practices pattern). Also the layout
   * direction the group defaults to, and `aria-orientation`.
   */
  orientation?: RadioOrientation;
  testID?: string;
  children?: ReactNode;
}

export interface RadioGroupItemProps extends PartProps, Omit<UIAriaProps, 'role' | 'aria-checked'> {
  /** What the group's value is while this item is selected. Unique within the group. */
  value: string;
  disabled?: boolean;
  testID?: string;
  /** The label. It is part of the button, so pressing it selects the item too. */
  children?: ReactNode;
  /** The ring that holds the dot. */
  circleClassName?: string;
  circleStyle?: StyleProp;
  /** The filled inner dot of the selected item. */
  indicatorClassName?: string;
  indicatorStyle?: StyleProp;
}

/** What the group knows of an item: enough to find its neighbours and to decide the tab stop. */
interface ItemEntry {
  readonly id: string;
  readonly value: string;
  readonly disabled: boolean;
  /** Set by the item's button; read when an arrow key moves focus to it. */
  readonly handle: MutableRefObject<UIHandle | null>;
}

interface RadioGroupContext {
  readonly value: string | null;
  readonly select: (value: string) => void;
  readonly disabled: boolean;
  readonly orientation: RadioOrientation | undefined;
  readonly entries: readonly ItemEntry[];
  /** The one item Tab reaches (`tabIndex` 0); every other item is `-1`. */
  readonly tabStopId: string | null;
  readonly upsert: (entry: ItemEntry) => void;
  readonly remove: (id: string) => void;
}

const GroupContext = createContext<RadioGroupContext | null>(null);

function useGroup(part: string): RadioGroupContext {
  const group = useContext(GroupContext);
  if (group === null) throw new Error(`<RadioGroup.${part}> must be rendered inside <RadioGroup.Root>`);
  return group;
}

const ROOT_COLUMN_CLASS = 'flex-col gap-2';
const ROOT_ROW_CLASS = 'flex-row gap-4';
const ITEM_CLASS = 'flex-row items-center justify-start gap-2 text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-50';
const CIRCLE_CLASS = 'w-5 h-5 rounded-full border-2 border-slate-400 bg-white items-center justify-center';
const CIRCLE_SELECTED_CLASS = 'border-indigo-600';
const DOT_CLASS = 'w-2.5 h-2.5 rounded-full bg-indigo-600';

/** The same item after an edit, or the same array when nothing a neighbour can see changed. */
function upsertEntry(entries: readonly ItemEntry[], entry: ItemEntry): readonly ItemEntry[] {
  const index = entries.findIndex((existing) => existing.id === entry.id);
  if (index === -1) return [...entries, entry];
  const existing = entries[index];
  if (existing !== undefined && existing.value === entry.value && existing.disabled === entry.disabled) return entries;
  return entries.map((candidate, position) => (position === index ? entry : candidate));
}

/**
 * Which way an arrow key moves between items, or `undefined` if it is not one this group uses. Right
 * and Down go forward, Left and Up back, as in the Authoring Practices.
 */
export function arrowDirection(key: string, orientation: RadioOrientation | undefined): 1 | -1 | undefined {
  const horizontal = orientation !== 'vertical';
  const vertical = orientation !== 'horizontal';
  switch (key) {
    case Key.ArrowRight: return horizontal ? 1 : undefined;
    case Key.ArrowLeft: return horizontal ? -1 : undefined;
    case Key.ArrowDown: return vertical ? 1 : undefined;
    case Key.ArrowUp: return vertical ? -1 : undefined;
    default: return undefined;
  }
}

/**
 * The item `direction` steps from `from`, wrapping past either end and skipping disabled items. After
 * a full circle it is `from` itself, so a group with one enabled item stays on it. `undefined` if every
 * item is disabled.
 */
export function adjacentEnabledIndex(
  items: readonly { readonly disabled: boolean }[], from: number, direction: 1 | -1,
): number | undefined {
  const count = items.length;
  for (let offset = 1; offset <= count; offset += 1) {
    const index = (((from + direction * offset) % count) + count) % count;
    if (items[index]?.disabled === false) return index;
  }
  return undefined;
}

const RadioGroupRoot = forwardRef<UIHandle, RadioGroupRootProps>(function RadioGroupRoot(props, ref) {
  const {
    value, defaultValue = null, onValueChange, disabled = false, orientation, className, style, testID, children, ...aria
  } = props;
  const [selected, select] = useControllableState<string | null, string>({
    prop: value, defaultProp: defaultValue, onChange: onValueChange, name: 'RadioGroup',
  });
  const [entries, setEntries] = useState<readonly ItemEntry[]>([]);
  const upsert = useCallback((entry: ItemEntry) => { setEntries((current) => upsertEntry(current, entry)); }, []);
  const remove = useCallback((id: string) => {
    setEntries((current) => (current.some((entry) => entry.id === id) ? current.filter((entry) => entry.id !== id) : current));
  }, []);

  // The first enabled item is the first one *shown*, which is not the first one that mounted once an
  // item was inserted in the middle or the list was reordered.
  const ordered = useInDocumentOrder(entries, (entry) => entry.handle.current);
  const tabStopId = useMemo(() => {
    if (disabled) return null;
    const enabled = ordered.filter((entry) => !entry.disabled);
    return (enabled.find((entry) => entry.value === selected) ?? enabled[0])?.id ?? null;
  }, [ordered, selected, disabled]);
  const context = useMemo(
    (): RadioGroupContext => ({ value: selected, select, disabled, orientation, entries, tabStopId, upsert, remove }),
    [selected, select, disabled, orientation, entries, tabStopId, upsert, remove],
  );

  return (
    <View
      {...aria}
      ref={ref}
      testID={testID}
      disabled={disabled}
      className={joinClassNames(orientation === 'horizontal' ? ROOT_ROW_CLASS : ROOT_COLUMN_CLASS, className)}
      style={style}
      role="radiogroup"
      aria-orientation={orientation}
    >
      <GroupContext.Provider value={context}>{children}</GroupContext.Provider>
    </View>
  );
});
RadioGroupRoot.displayName = 'RadioGroup.Root';

/**
 * One radio: a `Button` with `role="radio"`, a ring and, when selected, a filled dot.
 *
 * Only one item of a group is in the Tab order (`tabIndex` 0): the selected one, else the first
 * enabled one; the rest are `-1`. Inside the group the arrow keys move focus and selection together
 * (see `arrowDirection`), wrapping and skipping disabled items. Space selects through the button's
 * `click`; Enter does not (the Authoring Practices give a radio group no Enter), so its default is
 * prevented.
 *
 * Items are walked in document order (`UIHandle.compareDocumentOrder`), so an item inserted into the
 * middle of a mounted group, or a keyed reorder, is walked where it is shown.
 */
const RadioGroupItem = forwardRef<UIHandle, RadioGroupItemProps>(function RadioGroupItem(props, ref) {
  const {
    value, disabled: itemDisabled = false, className, style, testID, children,
    circleClassName, circleStyle, indicatorClassName, indicatorStyle, ...aria
  } = props;
  const group = useGroup('Item');
  const { upsert, remove } = group;
  const id = useId();
  const handle = useRef<UIHandle | null>(null);
  const setRef = useComposedRef(handle, ref);
  const disabled = group.disabled || itemDisabled;
  const checked = group.value === value;

  useLayoutEffect(() => {
    upsert({ id, value, disabled: itemDisabled, handle });
  }, [upsert, id, value, itemDisabled]);
  useLayoutEffect(() => () => { remove(id); }, [remove, id]);

  // A click never reaches a disabled button or anything inside it, so there is nothing to guard.
  const select = () => { group.select(value); };
  const swallowEnter = (event: UIKeyboardEvent) => {
    if (event.key === Key.Enter) event.preventDefault();
  };
  const move = (event: UIKeyboardEvent) => {
    if (event.key === Key.Enter) {
      event.preventDefault();
      return;
    }
    if (disabled || hasShortcutModifier(event)) return;
    const direction = arrowDirection(event.key, group.orientation);
    if (direction === undefined) return;
    event.preventDefault();
    const entries = inDocumentOrder(group.entries, (entry) => entry.handle.current)
      .map((entry) => ({ ...entry, disabled: entry.disabled || group.disabled }));
    const from = entries.findIndex((entry) => entry.id === id);
    if (from === -1) throw new Error(`RadioGroup.Item "${value}" handled a key before it registered with its group`);
    const targetIndex = adjacentEnabledIndex(entries, from, direction);
    const target = targetIndex === undefined ? undefined : entries[targetIndex];
    if (target === undefined) return;
    const targetHandle = target.handle.current;
    if (targetHandle === null) throw new Error(`RadioGroup.Item "${target.value}" is registered but not mounted`);
    group.select(target.value);
    targetHandle.focus();
  };

  return (
    <Button
      {...aria}
      ref={setRef}
      testID={testID}
      disabled={disabled}
      tabIndex={group.tabStopId === id ? 0 : -1}
      className={joinClassNames(ITEM_CLASS, className)}
      style={style}
      role="radio"
      aria-checked={checked}
      onClick={select}
      onKeyDown={move}
      onKeyUp={swallowEnter}
    >
      <View className={joinClassNames(CIRCLE_CLASS, checked && CIRCLE_SELECTED_CLASS, circleClassName)} style={circleStyle}>
        {checked && <View className={joinClassNames(DOT_CLASS, indicatorClassName)} style={indicatorStyle} />}
      </View>
      {children}
    </Button>
  );
});
RadioGroupItem.displayName = 'RadioGroup.Item';

export const RadioGroup = { Root: RadioGroupRoot, Item: RadioGroupItem } as const;
