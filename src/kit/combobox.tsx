import {
  createContext, forwardRef, useCallback, useContext, useId, useLayoutEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import { Button, Portal, Text, View, useRootEvent, type TextInputHandle, type UIHandle } from '../components';
import type { UIKeyboardEvent } from '../events';
import { TextInput, type TextInputProps } from '../text-input';
import type { UIAriaProps } from '../types';
import { inDocumentOrder } from './collection';
import { ComboboxChip, ComboboxChipRemove, ComboboxChips } from './combobox-chips';
import {
  ComboboxContextValue, useCombobox, type ActiveCause, type ChipEntry, type ComboboxContext, type OptionEntry,
} from './combobox-context';
import { Key } from './keys';
import { containsFilter, stepEnabled, stepEnabledLooping } from './listbox';
import { joinClassNames, useComposedRef, useStyle, type PartProps } from './parts';
import {
  Caret, CollectingItems, DEFAULT_COLLISION_PADDING, DEFAULT_SIDE_OFFSET, isOnThumb, textOfChildren, useItemRegistry,
  usePopupPlacement, type ItemMode,
} from './popup';
import { useControllableState } from './use-controllable-state';

/**
 * Whether the option with `textValue` (and `value`) is listed for `query`. Called only for a non-empty query, since
 * an empty one lists everything.
 */
export type ComboboxFilter = (textValue: string, query: string, value: string) => boolean;

interface ComboboxRootBaseProps {
  /** The text of the input. Defining it makes the text the parent's. */
  inputValue?: string;
  defaultInputValue?: string;
  /** The text changed: the user edited it, or a selection put its option's text there. */
  onInputValueChange?: (inputValue: string) => void;
  /** Whether the list is open. Defining it makes the open state the parent's. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Which options the text lists. By default an option whose text contains the text, ignoring case. `null` lists
   * every option, for a parent that filters (fetches) by itself and renders what matches.
   */
  filter?: ComboboxFilter | null;
  disabled?: boolean;
  /** Make the first enabled option active whenever the text changes, so `Enter` chooses it. */
  autoHighlight?: boolean;
  /**
   * The text can be a value that is not an option. A single combobox then keeps what was typed when the input
   * loses focus and when `Enter` is pressed with no active option, and reports it to `onValueChange`; a multiple
   * one adds what was typed as a chip on `Enter` or a comma.
   */
  allowCustomValue?: boolean;
  /** Let ArrowDown and ArrowUp go on from one end of the list to the other. Default true. */
  loop?: boolean;
  children?: ReactNode;
}

export interface ComboboxSingleRootProps extends ComboboxRootBaseProps {
  multiple?: false;
  /** The chosen option's `value`; `null` is a controlled combobox with nothing chosen. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
}

export interface ComboboxMultipleRootProps extends ComboboxRootBaseProps {
  /** Each chosen option adds a chip, and choosing a chosen option removes it. */
  multiple: true;
  /** The chosen `value`s, in the order they were chosen. */
  value?: readonly string[];
  defaultValue?: readonly string[];
  onValueChange?: (value: readonly string[]) => void;
}

export type ComboboxRootProps = ComboboxSingleRootProps | ComboboxMultipleRootProps;

export interface ComboboxControlProps extends PartProps, Omit<UIAriaProps, 'role'> {
  testID?: string;
  /** Usually the `Combobox.Input`, or `Combobox.Chips` holding it, then `Combobox.Clear` and `Combobox.Trigger`. */
  children?: ReactNode;
}

type InputOwnProps =
  | 'className' | 'style' | 'value' | 'defaultValue' | 'multiline' | 'secure' | 'rows' | 'readOnly' | 'disabled' | 'role'
  | 'aria-expanded' | 'aria-activedescendant' | 'aria-controls';

/** A `TextInput` with `role="combobox"`. Its text, `disabled` and the `aria-*` props that name the list are the combobox's. */
export interface ComboboxInputProps extends PartProps, Omit<TextInputProps, InputOwnProps> {}

export interface ComboboxButtonProps extends PartProps, Omit<UIAriaProps, 'role'> {
  testID?: string;
  /** Replaces the default drawing (a cross; a caret). */
  children?: ReactNode;
}

export interface ComboboxContentProps extends PartProps, Omit<UIAriaProps, 'role'> {
  testID?: string;
  /** The space between the control and the list. */
  sideOffset?: number;
  /** The margin kept between the list and the root's edges. */
  collisionPadding?: number;
  /** `Combobox.Item`s and a `Combobox.Empty`, and components that render them. */
  children?: ReactNode;
}

export interface ComboboxItemProps extends PartProps, Omit<UIAriaProps, 'role' | 'aria-selected'> {
  /** What the combobox's value holds while this option is chosen. Unique within the combobox. */
  value: string;
  disabled?: boolean;
  /**
   * The option's text, for the input, the chips and the filter. By default the text of the item's string children
   * and `Combobox.ItemText`s.
   */
  textValue?: string;
  testID?: string;
  children?: ReactNode;
}

export interface ComboboxItemTextProps extends PartProps {
  testID?: string;
  children?: ReactNode;
}

export interface ComboboxItemIndicatorProps extends PartProps {
  testID?: string;
  /** Shown while the option is chosen. Without it, a small filled square. */
  children?: ReactNode;
}

export interface ComboboxEmptyProps extends PartProps {
  testID?: string;
  /** What to say when no option matches. */
  children?: ReactNode;
}

const EMPTY_VALUES: readonly string[] = Object.freeze([]);

/** The control looks like one input: the input, the chips and the buttons share its border. */
const CONTROL_CLASS = 'flex-row items-center gap-1 rounded-lg border border-slate-300 bg-white pl-3 pr-2 py-1 text-sm text-slate-900 cursor-text focus-within:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50';
/** The input has no box of its own; it takes the room the chips leave on its line, and wraps to a line of its own when that is under its minimum. */
const INPUT_CLASS = 'grow shrink basis-24 min-w-24 bg-transparent py-1 text-sm text-slate-900 placeholder-slate-400 caret-indigo-600';
const BUTTON_CLASS = 'items-center justify-center rounded px-1 py-0.5 text-slate-500 cursor-pointer hover:text-slate-800 active:bg-slate-100';
const CLEAR_TEXT_CLASS = 'text-base';
/** Like the select's list, and for the same reasons: placement caps its height to the room on its side, and the list scrolls. */
const CONTENT_CLASS = 'absolute overflow-y-auto overscroll-contain rounded-lg border border-slate-200 bg-white p-1 gap-0.5';
const ITEM_CLASS = 'shrink-0 flex-row items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm text-slate-800';
/** The active option is the one the keys or the pointer chose; its class comes before `active:` so a press still shows. */
const ACTIVE_ITEM_CLASS = 'bg-indigo-50';
const ENABLED_ITEM_CLASS = 'cursor-pointer active:bg-indigo-100';
const DISABLED_ITEM_CLASS = 'cursor-not-allowed opacity-50';
const ITEM_TEXT_CLASS = 'text-slate-800';
const INDICATOR_CLASS = 'w-2 h-2 rounded-sm bg-indigo-600';
const EMPTY_CLASS = 'px-2 py-1.5 text-sm text-slate-500';

/** The mode the options render in: see `ItemMode`. A closed list, and one with nothing to show, only collects them. */
const ItemModeContext = createContext<ItemMode | null>(null);

interface ItemContext {
  readonly selected: boolean;
}
const ItemContextValue = createContext<ItemContext | null>(null);

function useItem(part: string): ItemContext {
  const item = useContext(ItemContextValue);
  if (item === null) throw new Error(`<Combobox.${part}> must be rendered inside <Combobox.Item>`);
  return item;
}

function sameOption(existing: OptionEntry, next: OptionEntry): boolean {
  return existing.value === next.value && existing.textValue === next.textValue && existing.disabled === next.disabled;
}

function sameChip(existing: ChipEntry, next: ChipEntry): boolean {
  return existing.value === next.value;
}

/** Which end of the list an arrow key opening the list asked for. */
type OpenIntent = 'first' | 'last';

interface CoreProps extends ComboboxRootBaseProps {
  readonly multiple: boolean;
  readonly values: readonly string[];
  readonly setValues: (next: readonly string[]) => void;
}

/**
 * The state both modes share. The selection arrives as a list of values and goes out as one (`setValues`): a single
 * combobox is a list of at most one. See {@link Combobox}.
 */
function ComboboxCore(props: CoreProps): ReactNode {
  const {
    multiple, values, setValues, inputValue: inputValueProp, defaultInputValue = '', onInputValueChange,
    open: openProp, defaultOpen = false, onOpenChange, filter = containsFilter, disabled = false,
    autoHighlight = false, allowCustomValue = false, loop = true, children,
  } = props;

  const [inputValue, setInputValue] = useControllableState<string>({
    prop: inputValueProp, defaultProp: defaultInputValue, onChange: onInputValueChange, name: 'Combobox input value',
  });
  const [open, setOpenState] = useControllableState<boolean>({
    prop: openProp, defaultProp: defaultOpen, onChange: onOpenChange, name: 'Combobox open',
  });
  const options = useItemRegistry(sameOption);
  const chips = useItemRegistry(sameChip);
  const input = useRef<TextInputHandle | null>(null);
  const control = useRef<UIHandle | null>(null);

  // What the text means. A single combobox shows its chosen option's text; once the user edits it, it is a query
  // until a choice, or leaving the input, puts the chosen option's text back.
  const [edited, setEdited] = useState(false);
  const [activeValue, setActiveValue] = useState<string | null>(null);
  const activeCause = useRef<ActiveCause>('automatic');
  const [hasEmpty, setHasEmpty] = useState(false);
  const [listboxTag, setListboxTag] = useState<number | undefined>(undefined);
  const [activeTag, setActiveTag] = useState<number | undefined>(undefined);

  // Key and focus handlers run between renders, and several events can arrive before one: they read the latest
  // request, not the rendered value. Every render makes the rendered value the latest again.
  const valuesRef = useRef(values);
  const textRef = useRef(inputValue);
  useLayoutEffect(() => {
    valuesRef.current = values;
    textRef.current = inputValue;
  });
  const commitValues = (next: readonly string[]) => {
    valuesRef.current = next;
    setValues(next);
  };
  const writeText = (text: string) => {
    textRef.current = text;
    setInputValue(text);
  };

  const selectedValue = multiple ? null : values[0] ?? null;
  const query = !multiple && !edited && selectedValue !== null ? '' : inputValue;
  const matched = useMemo((): ReadonlySet<string> => {
    const found = new Set<string>();
    for (const entry of options.entries) {
      if (filter === null || query === '' || filter(entry.textValue, query, entry.value)) found.add(entry.value);
    }
    return found;
  }, [options.entries, filter, query]);
  const popupVisible = open && !disabled && (matched.size > 0 || hasEmpty);

  /** The text the input shows for a chosen value: its option's, else the value if custom values are allowed. */
  const textOfValue = (value: string): string => (
    options.registry.current.find((entry) => entry.value === value)?.textValue ?? (allowCustomValue ? value : '')
  );

  const setOpen = (next: boolean) => {
    if (next && disabled) return;
    setOpenState(next);
  };

  /** The options in the list, in document order. Only a rendered option has a place in it. */
  const rendered = (): OptionEntry[] => inDocumentOrder(
    options.registry.current.filter((entry) => entry.handle.current !== null), (entry) => entry.handle.current,
  );
  const orderedChips = (): ChipEntry[] => inDocumentOrder(chips.registry.current, (entry) => entry.handle.current);
  const focusInput = () => {
    if (!disabled) input.current?.focus();
  };

  // A single combobox shows its chosen option's text. A new choice always puts it there (its option may only register
  // after the choice, so this runs again as options come and go); while the user is editing, the same choice leaves
  // the text alone.
  const syncedValue = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (multiple) return;
    const changed = syncedValue.current !== selectedValue;
    syncedValue.current = selectedValue;
    if (!changed && (edited || selectedValue === null)) return;
    setEdited(false);
    writeText(selectedValue === null ? '' : textOfValue(selectedValue));
  }, [multiple, selectedValue, options.entries, edited]);

  const choose = (value: string) => {
    const entry = options.registry.current.find((candidate) => candidate.value === value);
    if (entry === undefined || entry.disabled || disabled) return;
    if (multiple) {
      const current = valuesRef.current;
      commitValues(current.includes(value) ? current.filter((existing) => existing !== value) : [...current, value]);
      keepActive.current = true;
      writeText('');
      return;
    }
    commitValues([value]);
    setEdited(false);
    writeText(entry.textValue);
    setOpenState(false);
  };

  /** A single combobox that lost its input's focus, or got `Enter`, with the text edited: keep it or put the chosen text back. */
  const settleSingle = (): boolean => {
    const text = textRef.current;
    const chosen = valuesRef.current[0];
    const label = chosen === undefined ? '' : textOfValue(chosen);
    setEdited(false);
    if (text === label) return false;
    if (!allowCustomValue) {
      writeText(label);
      return false;
    }
    if (text === '') {
      commitValues([]);
      return true;
    }
    const match = options.registry.current.find((entry) => entry.textValue === text && !entry.disabled);
    commitValues([match?.value ?? text]);
    writeText(match?.textValue ?? text);
    return true;
  };

  /** Add the typed text as a chip (a multiple combobox) or keep it as the value (a single one). */
  const commitTyped = (): boolean => {
    const text = textRef.current.trim();
    if (!allowCustomValue || text === '') return false;
    if (!multiple) {
      const settled = settleSingle();
      setOpenState(false);
      return settled;
    }
    const match = options.registry.current.find((entry) => entry.textValue === text && !entry.disabled);
    const value = match?.value ?? text;
    if (!valuesRef.current.includes(value)) commitValues([...valuesRef.current, value]);
    writeText('');
    return true;
  };

  // The active option: only the keys and the pointer move it, apart from the moments the list (re)starts: it opens,
  // the query changes or the active option leaves the list. Then it is the chosen option when the list opens on it
  // (a single combobox, text not edited), else the first enabled one with `autoHighlight`, else nothing.
  const openIntent = useRef<OpenIntent | undefined>(undefined);
  // Choosing in a multiple combobox empties the text, which changes the query, but leaves the list where it was.
  const keepActive = useRef(false);
  const wasShown = useRef(false);
  const lastQuery = useRef(query);
  useLayoutEffect(() => {
    const opened = popupVisible && !wasShown.current;
    const queryChanged = query !== lastQuery.current;
    const keep = keepActive.current;
    keepActive.current = false;
    wasShown.current = popupVisible;
    lastQuery.current = query;
    let next: string | null = activeValue;
    if (!popupVisible) {
      openIntent.current = undefined;
      next = null;
    } else {
      const present = activeValue !== null
        && options.registry.current.some((entry) => entry.value === activeValue && entry.handle.current !== null);
      if (opened || (queryChanged && !(keep && present)) || (activeValue !== null && !present)) {
        const intent = openIntent.current;
        openIntent.current = undefined;
        const enabled = rendered().filter((entry) => !entry.disabled);
        const chosen = !multiple && !edited && selectedValue !== null
          ? enabled.find((entry) => entry.value === selectedValue) : undefined;
        activeCause.current = intent === undefined ? 'automatic' : 'keyboard';
        if (intent === 'first') next = (chosen ?? enabled[0])?.value ?? null;
        else if (intent === 'last') next = (chosen ?? enabled[enabled.length - 1])?.value ?? null;
        else if (chosen !== undefined) next = chosen.value;
        else next = autoHighlight ? enabled[0]?.value ?? null : null;
      }
    }
    if (next !== activeValue) setActiveValue(next);
    setActiveTag(next === null ? undefined : options.registry.current.find((entry) => entry.value === next)?.handle.current?.id);
  });

  const move = (direction: 1 | -1) => {
    const list = rendered();
    const from = list.findIndex((entry) => entry.value === activeValue);
    const index = (loop ? stepEnabledLooping : stepEnabled)(list, from, direction);
    const target = index === undefined ? undefined : list[index];
    if (target === undefined) return;
    activeCause.current = 'keyboard';
    setActiveValue(target.value);
  };

  const clear = () => {
    commitValues([]);
    setEdited(false);
    writeText('');
    setOpenState(false);
    focusInput();
  };

  const inputKeyDown = (event: UIKeyboardEvent) => {
    // An IME composition owns the keys: Enter confirms the composition, it does not choose.
    if (disabled || event.isComposing || event.ctrlKey || event.metaKey) return;
    if (event.altKey) {
      if (event.key === Key.ArrowDown) {
        event.preventDefault();
        setOpen(true);
      } else if (event.key === Key.ArrowUp) {
        event.preventDefault();
        setOpenState(false);
      }
      return;
    }
    switch (event.key) {
      case Key.ArrowDown:
      case Key.ArrowUp: {
        if (event.shiftKey) return;
        event.preventDefault();
        const direction = event.key === Key.ArrowDown ? 1 : -1;
        if (popupVisible) {
          move(direction);
        } else {
          openIntent.current = direction === 1 ? 'first' : 'last';
          setOpen(true);
        }
        return;
      }
      case Key.Enter: {
        const active = activeValue === null || !popupVisible
          ? undefined : options.registry.current.find((entry) => entry.value === activeValue && !entry.disabled);
        if (active !== undefined) {
          event.preventDefault();
          choose(active.value);
        } else if (commitTyped()) {
          event.preventDefault();
        }
        return;
      }
      case Key.Escape: {
        if (open) {
          event.preventDefault();
          setOpenState(false);
        } else if (textRef.current !== '' || (!multiple && valuesRef.current.length > 0)) {
          // The list is closed, so the key clears: the text, and a single combobox's choice with it.
          event.preventDefault();
          if (!multiple) commitValues([]);
          setEdited(false);
          writeText('');
        }
        return;
      }
      case Key.Backspace:
      case Key.ArrowLeft: {
        // The way to the chips. Backspace in an empty input only moves onto the last chip, and a repeat does nothing, so
        // holding the key does not eat the chips: removing one is a second, separate key press.
        const field = input.current;
        if (!multiple || event.shiftKey || field === null) return;
        const atStart = event.key === Key.Backspace
          ? !event.repeat && field.value === ''
          : field.selectionStart === 0 && field.selectionEnd === 0;
        const last = atStart ? orderedChips().at(-1) : undefined;
        if (last === undefined) return;
        event.preventDefault();
        last.handle.current?.focus();
        return;
      }
      default:
    }
  };

  const inputBlurred = (to: UIHandle | null) => {
    // Pressing the list moves focus to it for a moment (it is where a press that is not prevented lands, which is every
    // touch): it hands the focus back, and the combobox stays as it was.
    if (to !== null && to.id === listboxTag) return;
    setOpenState(false);
    // On to a chip is still in the combobox: the text stays.
    if (to !== null && chips.registry.current.some((chip) => chip.handle.current?.id === to.id)) return;
    if (multiple) {
      writeText('');
      setEdited(false);
    } else {
      settleSingle();
    }
  };

  const context: ComboboxContext = {
    multiple,
    disabled,
    values,
    inputValue,
    open,
    popupVisible,
    activeValue,
    activeCause,
    activeTag,
    listboxTag,
    setListboxTag,
    matched,
    options,
    chips,
    setHasEmpty,
    input,
    control,
    anchor: () => control.current ?? input.current,
    setOpen,
    typed: (text) => {
      setEdited(true);
      writeText(text);
      setOpen(true);
    },
    choose,
    remove: (value) => { commitValues(valuesRef.current.filter((existing) => existing !== value)); },
    clear,
    hover: (value) => {
      if (value === activeValue) return;
      activeCause.current = 'pointer';
      setActiveValue(value);
    },
    inputBlurred,
    inputKeyDown,
    commaTyped: () => {
      if (!multiple || !allowCustomValue) return false;
      commitTyped();
      return true;
    },
    activate: () => {
      focusInput();
      setOpen(true);
    },
    toggle: () => {
      if (disabled) return;
      if (open) {
        setOpenState(false);
      } else {
        focusInput();
        setOpen(true);
      }
    },
  };
  return <ComboboxContextValue.Provider value={context}>{children}</ComboboxContextValue.Provider>;
}

function SingleRoot(props: ComboboxSingleRootProps): ReactNode {
  const { value, defaultValue = null, onValueChange, ...rest } = props;
  const [selected, setSelected] = useControllableState<string | null>({
    prop: value, defaultProp: defaultValue, onChange: onValueChange, name: 'Combobox value',
  });
  const values = useMemo(() => (selected === null ? EMPTY_VALUES : [selected]), [selected]);
  const setValues = useCallback((next: readonly string[]) => { setSelected(next[0] ?? null); }, [setSelected]);
  return <ComboboxCore {...rest} multiple={false} values={values} setValues={setValues} />;
}

function MultipleRoot(props: ComboboxMultipleRootProps): ReactNode {
  const { value, defaultValue = EMPTY_VALUES, onValueChange, ...rest } = props;
  const [selected, setSelected] = useControllableState<readonly string[]>({
    prop: value, defaultProp: defaultValue, onChange: onValueChange, name: 'Combobox value',
  });
  return <ComboboxCore {...rest} multiple values={selected} setValues={setSelected} />;
}

/**
 * An editable combobox: a text input that filters a list of options, with the focus staying in the input. With
 * `multiple` each chosen option becomes a chip. The practices followed are the WAI-ARIA Authoring Practices'
 * editable combobox with list autocomplete.
 *
 * ```tsx
 * <Combobox.Root value={fruit} onValueChange={setFruit}>
 *   <Combobox.Control>
 *     <Combobox.Input placeholder="Pick a fruit" aria-label="Fruit" />
 *     <Combobox.Clear />
 *     <Combobox.Trigger />
 *   </Combobox.Control>
 *   <Combobox.Content>
 *     <Combobox.Item value="apple"><Combobox.ItemText>Apple</Combobox.ItemText><Combobox.ItemIndicator /></Combobox.Item>
 *     <Combobox.Empty>No matches</Combobox.Empty>
 *   </Combobox.Content>
 * </Combobox.Root>
 * ```
 *
 * Keys, in the input (IME composition takes none): typing filters and opens; ArrowDown and ArrowUp open the list and
 * move the active option, skipping disabled ones and going round from one end to the other (`loop`); Alt+ArrowDown
 * opens without moving and Alt+ArrowUp closes; Enter chooses the active option; Escape closes, and with the list
 * closed clears the text (and a single combobox's choice); Home and End stay with the text caret; Tab moves on and
 * chooses nothing. In a multiple combobox ArrowLeft at the start of the text, and Backspace in an empty input, move
 * onto the last chip; the arrows walk the chips and a second Backspace, or Delete, removes the focused one.
 *
 * Leaving the input closes the list, and puts the text right: a single combobox gets its chosen option's text back (or
 * keeps what was typed, with `allowCustomValue`), a multiple one drops text that was not entered.
 */
function ComboboxRoot(props: ComboboxRootProps): ReactNode {
  return props.multiple === true ? <MultipleRoot {...props} /> : <SingleRoot {...props} />;
}
ComboboxRoot.displayName = 'Combobox.Root';

/** The box that looks like one input. A press on its padding focuses the input, and the focus ring of the input sits inside it. */
const ComboboxControl = forwardRef<UIHandle, ComboboxControlProps>(function ComboboxControl(props, ref) {
  const { className, style, testID, children, ...aria } = props;
  const combobox = useCombobox('Control');
  const setRef = useComposedRef(combobox.control, ref);
  return (
    <View
      {...aria}
      ref={setRef}
      testID={testID}
      disabled={combobox.disabled}
      className={joinClassNames(CONTROL_CLASS, className)}
      style={style}
      // Only a press on the control's own padding reaches here: the parts that take a press stop it. A mouse press
      // there must not take focus off the input (native clears element focus for a press on something that cannot
      // take it); a touch is left alone, so the page can still be panned from here, and the click focuses the input.
      onPointerDown={(event) => { if (event.pointerType !== 'touch') event.preventDefault(); }}
      onClick={combobox.activate}
    >
      {children}
    </View>
  );
});
ComboboxControl.displayName = 'Combobox.Control';

/**
 * The text input, `role="combobox"`. It keeps focus while the list is open: the active option is announced through
 * `aria-activedescendant`, not focused. A single combobox selects its text when focused, so typing replaces it.
 */
const ComboboxInput = forwardRef<TextInputHandle, ComboboxInputProps>(function ComboboxInput(props, ref) {
  const {
    className, style, placeholder, selectTextOnFocus, onChange, onKeyDown, onBeforeInput, onBlur, onClick, ...rest
  } = props;
  const combobox = useCombobox('Input');
  const setRef = useComposedRef(combobox.input, ref);
  return (
    <TextInput
      {...rest}
      ref={setRef}
      className={joinClassNames(INPUT_CLASS, className)}
      style={style}
      value={combobox.inputValue}
      disabled={combobox.disabled}
      // With chips the placeholder would sit after them in a sliver of a line.
      placeholder={combobox.multiple && combobox.values.length > 0 ? undefined : placeholder}
      selectTextOnFocus={selectTextOnFocus ?? !combobox.multiple}
      role="combobox"
      aria-expanded={combobox.popupVisible}
      aria-activedescendant={combobox.popupVisible ? combobox.activeTag : undefined}
      aria-controls={combobox.popupVisible ? combobox.listboxTag : undefined}
      onChange={(event) => {
        onChange?.(event);
        combobox.typed(event.value);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (!event.defaultPrevented) combobox.inputKeyDown(event);
      }}
      onBeforeInput={(event) => {
        onBeforeInput?.(event);
        if (!event.defaultPrevented && event.inputType === 'insertText' && event.data === ',' && combobox.commaTyped()) {
          event.preventDefault();
        }
      }}
      onBlur={(event) => {
        onBlur?.(event);
        combobox.inputBlurred(event.relatedTarget);
      }}
      onClick={(event) => {
        onClick?.(event);
        event.stopPropagation();
        combobox.activate();
      }}
    />
  );
});
ComboboxInput.displayName = 'Combobox.Input';

/** Empties the selection and the text. Shown only while there is something to empty, and never takes focus from the input. */
const ComboboxClear = forwardRef<UIHandle, ComboboxButtonProps>(function ComboboxClear(props, ref) {
  const { className, style, testID, children, 'aria-label': ariaLabel = 'Clear', ...aria } = props;
  const combobox = useCombobox('Clear');
  if (combobox.values.length === 0 && combobox.inputValue === '') return null;
  return (
    <Button
      {...aria}
      ref={ref}
      testID={testID}
      tabIndex={-1}
      disabled={combobox.disabled}
      aria-label={ariaLabel}
      className={joinClassNames(BUTTON_CLASS, CLEAR_TEXT_CLASS, className)}
      style={style}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
        combobox.clear();
      }}
    >
      {children ?? '×'}
    </Button>
  );
});
ComboboxClear.displayName = 'Combobox.Clear';

/** Opens and closes the list with a press, and never takes focus from the input. */
const ComboboxTrigger = forwardRef<UIHandle, ComboboxButtonProps>(function ComboboxTrigger(props, ref) {
  const { className, style, testID, children, 'aria-label': ariaLabel = 'Show options', ...aria } = props;
  const combobox = useCombobox('Trigger');
  return (
    <Button
      {...aria}
      ref={ref}
      testID={testID}
      tabIndex={-1}
      disabled={combobox.disabled}
      aria-label={ariaLabel}
      aria-expanded={combobox.popupVisible}
      className={joinClassNames(BUTTON_CLASS, className)}
      style={style}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
        combobox.toggle();
      }}
    >
      {children ?? <Caret />}
    </Button>
  );
});
ComboboxTrigger.displayName = 'Combobox.Trigger';

/** One option's text from its children: strings and numbers, and what `Combobox.ItemText` holds. */
function textOf(node: ReactNode): string | undefined {
  return textOfChildren(node, (type) => type === ComboboxItemText);
}

/**
 * One option: a `View` with `role="option"` and `aria-selected`, not focusable (the input keeps the focus). The
 * pointer moving over it makes it the active option, and a click chooses it. A disabled option is dimmed, skipped by
 * the keys and chooses nothing; it is `aria-disabled` and not natively `disabled`, as in `Select`, so that a press
 * on it is still the list's.
 */
const ComboboxItem = forwardRef<UIHandle, ComboboxItemProps>(function ComboboxItem(props, ref) {
  const { value, disabled = false, textValue, className, style, testID, children, ...aria } = props;
  const combobox = useCombobox('Item');
  const mode = useContext(ItemModeContext);
  if (mode === null) throw new Error('<Combobox.Item> must be rendered inside <Combobox.Content>');
  const { upsert, remove } = combobox.options;
  const id = useId();
  const handle = useRef<UIHandle | null>(null);
  const setRef = useComposedRef(handle, ref);
  const label = textValue ?? textOf(children) ?? value;
  const selected = combobox.values.includes(value);
  const item = useMemo((): ItemContext => ({ selected }), [selected]);

  useLayoutEffect(() => {
    upsert({ id, value, textValue: label, disabled, handle });
  }, [upsert, id, value, label, disabled]);
  useLayoutEffect(() => () => { remove(id); }, [remove, id]);

  if (mode === 'collect' || !combobox.matched.has(value)) return null;
  return (
    <ItemContextValue.Provider value={item}>
      <View
        {...aria}
        ref={setRef}
        testID={testID}
        className={joinClassNames(
          ITEM_CLASS, combobox.activeValue === value && ACTIVE_ITEM_CLASS, disabled ? DISABLED_ITEM_CLASS : ENABLED_ITEM_CLASS,
          className,
        )}
        style={style}
        role="option"
        aria-selected={selected}
        aria-disabled={disabled}
        onClick={() => { if (!disabled) combobox.choose(value); }}
        // Moving the pointer over an option makes it active, not merely being over it: scrolling the list under a
        // pointer that rests on it changes the option under the pointer, and that must not move what the keys chose.
        // A finger dragging the list is not choosing.
        onPointerMove={(event) => {
          if (!disabled && event.pointerType !== 'touch') combobox.hover(value);
        }}
      >
        {children}
      </View>
    </ItemContextValue.Provider>
  );
});
ComboboxItem.displayName = 'Combobox.Item';

/** The option's text. Its string is also what the input and the chips show and what the filter searches. */
const ComboboxItemText = forwardRef<UIHandle, ComboboxItemTextProps>(function ComboboxItemText(props, ref) {
  const { className, style, testID, children } = props;
  useItem('ItemText');
  return <Text ref={ref} testID={testID} className={joinClassNames(ITEM_TEXT_CLASS, className)} style={style}>{children}</Text>;
});
ComboboxItemText.displayName = 'Combobox.ItemText';

/** Renders only in a chosen option. */
function ComboboxItemIndicator(props: ComboboxItemIndicatorProps): ReactNode {
  const { className, style, testID, children } = props;
  const item = useItem('ItemIndicator');
  if (!item.selected) return null;
  return (
    <View testID={testID} className={joinClassNames(children === undefined && INDICATOR_CLASS, className)} style={style}>
      {children}
    </View>
  );
}
ComboboxItemIndicator.displayName = 'Combobox.ItemIndicator';

/**
 * Shown in the list when no option matches the text. With one mounted, the list opens and says so; without one, a
 * list with nothing to show does not open. It is a polite live region, so a screen reader says it.
 */
const ComboboxEmpty = forwardRef<UIHandle, ComboboxEmptyProps>(function ComboboxEmpty(props, ref) {
  const { className, style, testID, children } = props;
  const combobox = useCombobox('Empty');
  const mode = useContext(ItemModeContext);
  if (mode === null) throw new Error('<Combobox.Empty> must be rendered inside <Combobox.Content>');
  const { setHasEmpty } = combobox;
  useLayoutEffect(() => {
    setHasEmpty(true);
    return () => { setHasEmpty(false); };
  }, [setHasEmpty]);
  if (mode === 'collect' || combobox.matched.size > 0) return null;
  const plain = typeof children === 'string' || typeof children === 'number';
  const Content = plain ? Text : View;
  return (
    <Content ref={ref} testID={testID} aria-live="polite" className={joinClassNames(EMPTY_CLASS, className)} style={style}>
      {children}
    </Content>
  );
});
ComboboxEmpty.displayName = 'Combobox.Empty';

/**
 * The list while it is shown: the listbox in the overlay layer, under the control or above it where there is more
 * room, at least as wide as the control and kept inside the root. There is no backdrop: a press outside reaches what
 * is under it, and the input losing focus closes the list. A wheel anywhere but over the list closes it too, since
 * the page it hangs from may scroll under it.
 */
const OpenContent = forwardRef<UIHandle, ComboboxContentProps>(function OpenContent(props, ref) {
  const {
    className, style, testID, children, sideOffset = DEFAULT_SIDE_OFFSET, collisionPadding = DEFAULT_COLLISION_PADDING, ...aria
  } = props;
  const combobox = useCombobox('Content');
  const listbox = useRef<UIHandle | null>(null);
  const setRef = useComposedRef(listbox, ref);
  const { setListboxTag, setOpen, input } = combobox;
  const { style: own } = usePopupPlacement({
    anchor: combobox.anchor, popup: listbox, sideOffset, collisionPadding,
    missing: '<Combobox.Content> needs a mounted <Combobox.Control> (or <Combobox.Input>) and a mounted list to place the list',
  });

  useLayoutEffect(() => {
    setListboxTag(listbox.current?.id);
    return () => { setListboxTag(undefined); };
  }, [setListboxTag]);

  useRootEvent('wheel', () => { setOpen(false); });

  // The active option is shown, once the list is placed and capped: the keys and the list opening on an option scroll to
  // it, the pointer does not (it is where the pointer is).
  const { activeValue, activeCause, options } = combobox;
  useLayoutEffect(() => {
    if (activeValue === null || activeCause.current === 'pointer') return;
    options.registry.current.find((entry) => entry.value === activeValue)?.handle.current?.scrollIntoView();
  }, [activeValue, activeCause, options.registry, own]);

  const merged = useStyle(own, style);
  return (
    <Portal>
      <View
        {...aria}
        ref={setRef}
        testID={testID}
        // Focusable, so that a press that is not prevented lands on the list and not on nothing, which would clear focus.
        tabIndex={-1}
        className={joinClassNames(CONTENT_CLASS, className)}
        style={merged}
        role="listbox"
        // A mouse press on the list must not take focus out of the input; a press on a scrollbar thumb is left alone, so it
        // drags the list. A touch is left alone too: a prevented press cannot become a pan, and the list has to scroll. The
        // press then focuses the list, which hands the focus straight back to the input.
        onPointerDown={(event) => {
          if (event.pointerType !== 'touch' && !isOnThumb(listbox.current, event.x, event.y)) event.preventDefault();
        }}
        onFocus={() => { if (!combobox.disabled) input.current?.focus(); }}
        onWheel={(event) => { event.stopPropagation(); }}
      >
        <ItemModeContext.Provider value="item">{children}</ItemModeContext.Provider>
      </View>
    </Portal>
  );
});
OpenContent.displayName = 'Combobox.OpenContent';

/**
 * The list. Not shown, it only collects its options (see `ItemMode`), so the chips and the input can name a chosen
 * option before the list was ever opened.
 */
const ComboboxContent = forwardRef<UIHandle, ComboboxContentProps>(function ComboboxContent(props, ref) {
  const combobox = useCombobox('Content');
  if (combobox.popupVisible) return <OpenContent {...props} ref={ref} />;
  return (
    <CollectingItems>
      <ItemModeContext.Provider value="collect">{props.children}</ItemModeContext.Provider>
    </CollectingItems>
  );
});
ComboboxContent.displayName = 'Combobox.Content';

export const Combobox = {
  Root: ComboboxRoot,
  Control: ComboboxControl,
  Input: ComboboxInput,
  Clear: ComboboxClear,
  Trigger: ComboboxTrigger,
  Content: ComboboxContent,
  Item: ComboboxItem,
  ItemText: ComboboxItemText,
  ItemIndicator: ComboboxItemIndicator,
  Empty: ComboboxEmpty,
  Chips: ComboboxChips,
  Chip: ComboboxChip,
  ChipRemove: ComboboxChipRemove,
} as const;

export { containsFilter as defaultComboboxFilter };
