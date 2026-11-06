import { Fragment, createContext, forwardRef, useContext, useId, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { Button, View, type UIHandle } from '../components';
import type { UIKeyboardEvent } from '../events';
import type { UIAriaProps } from '../types';
import { inDocumentOrder } from './collection';
import { chipLabel, useCombobox } from './combobox-context';
import { Key, hasShortcutModifier } from './keys';
import { joinClassNames, useComposedRef, type PartProps } from './parts';

export interface ComboboxChipsProps extends PartProps, Omit<UIAriaProps, 'role'> {
  testID?: string;
  /**
   * Draws the chip for a chosen value; `label` is its option's text. The default is a `Combobox.Chip` with a
   * `Combobox.ChipRemove`.
   */
  renderChip?: (value: string, label: string) => ReactNode;
  /** What follows the chips on their lines, usually the `Combobox.Input`. */
  children?: ReactNode;
}

export interface ComboboxChipProps extends PartProps, Omit<UIAriaProps, 'role'> {
  /** The chosen value this chip stands for. */
  value: string;
  testID?: string;
  /** The label, and a `Combobox.ChipRemove`. By default the option's text. */
  children?: ReactNode;
}

export interface ComboboxChipRemoveProps extends PartProps, Omit<UIAriaProps, 'role'> {
  testID?: string;
  /** Replaces the cross. */
  children?: ReactNode;
}

/**
 * The chips and the input are one wrapping line of boxes: the container is a wrapping row, so the input takes what
 * the last chip leaves of its line and drops to a line of its own when that is too little.
 */
const CHIPS_CLASS = 'grow shrink basis-0 min-w-0 flex-row flex-wrap items-center gap-1';
const CHIP_CLASS = 'flex-row items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 pl-2 pr-1 py-0.5 text-sm text-indigo-900 cursor-default focus:border-indigo-500 focus:bg-indigo-100';
const CHIP_REMOVE_CLASS = 'items-center justify-center rounded px-1 text-indigo-700 cursor-pointer hover:bg-indigo-200 active:bg-indigo-300';

interface ChipContext {
  readonly value: string;
  readonly label: string;
}
const ChipContextValue = createContext<ChipContext | null>(null);

/**
 * The container of the chips of a multiple combobox, which also holds the input so that the two share lines.
 * It draws a chip for each chosen value, in the order they were chosen.
 */
export const ComboboxChips = forwardRef<UIHandle, ComboboxChipsProps>(function ComboboxChips(props, ref) {
  const { className, style, testID, renderChip, children, ...aria } = props;
  const combobox = useCombobox('Chips');
  return (
    <View {...aria} ref={ref} testID={testID} className={joinClassNames(CHIPS_CLASS, className)} style={style}>
      {combobox.values.map((value) => {
        const label = chipLabel(combobox, value);
        return (
          <Fragment key={value}>
            {renderChip === undefined
              ? <ComboboxChip value={value}>{label}<ComboboxChipRemove /></ComboboxChip>
              : renderChip(value, label)}
          </Fragment>
        );
      })}
      {children}
    </View>
  );
});
ComboboxChips.displayName = 'Combobox.Chips';

/**
 * One chosen value. It can take focus (never in the Tab order; the arrow keys from the input reach it): ArrowLeft and
 * ArrowRight walk the chips, ArrowRight past the last returns to the input, and Backspace or Delete removes the
 * focused chip and returns to the input. A held key does not repeat the removal. It is a group named for its label,
 * holding the label and its remove button.
 */
export const ComboboxChip = forwardRef<UIHandle, ComboboxChipProps>(function ComboboxChip(props, ref) {
  const { value, className, style, testID, children, ...aria } = props;
  const combobox = useCombobox('Chip');
  const id = useId();
  const handle = useRef<UIHandle | null>(null);
  const setRef = useComposedRef(handle, ref);
  const label = chipLabel(combobox, value);
  const chip = useMemo((): ChipContext => ({ value, label }), [value, label]);
  const { upsert, remove } = combobox.chips;

  useLayoutEffect(() => {
    upsert({ id, value, handle });
  }, [upsert, id, value]);
  useLayoutEffect(() => () => { remove(id); }, [remove, id]);

  const onKeyDown = (event: UIKeyboardEvent) => {
    if (combobox.disabled || event.isComposing || hasShortcutModifier(event)) return;
    const walk = (offset: -1 | 1) => {
      const chips = inDocumentOrder(combobox.chips.registry.current, (entry) => entry.handle.current);
      const target = chips[chips.findIndex((entry) => entry.id === id) + offset];
      if (target !== undefined) target.handle.current?.focus();
      else if (offset === 1) combobox.input.current?.focus();
    };
    switch (event.key) {
      case Key.ArrowLeft:
        event.preventDefault();
        walk(-1);
        return;
      case Key.ArrowRight:
        event.preventDefault();
        walk(1);
        return;
      case Key.Backspace:
      case Key.Delete:
        event.preventDefault();
        // Removing the focused element would clear the focus: the input takes it first. A key held down is one press.
        if (event.repeat) return;
        combobox.input.current?.focus();
        combobox.remove(value);
        return;
      default:
    }
  };

  return (
    <ChipContextValue.Provider value={chip}>
      <Button
        {...aria}
        ref={setRef}
        testID={testID}
        tabIndex={-1}
        disabled={combobox.disabled}
        role="group"
        aria-label={aria['aria-label'] ?? label}
        className={joinClassNames(CHIP_CLASS, className)}
        style={style}
        // A chip is not the control's padding: a press on it takes focus, and its click is not a click on the control.
        onPointerDown={(event) => { event.stopPropagation(); }}
        onClick={(event) => { event.stopPropagation(); }}
        onKeyDown={onKeyDown}
      >
        {children ?? label}
      </Button>
    </ChipContextValue.Provider>
  );
});
ComboboxChip.displayName = 'Combobox.Chip';

/**
 * Takes the chip out of the selection. Its `aria-label` names the chip ("Remove Apple"). A press on it never takes
 * focus from the input. A disabled combobox shows its chips with no removal, so this renders nothing there.
 */
export const ComboboxChipRemove = forwardRef<UIHandle, ComboboxChipRemoveProps>(function ComboboxChipRemove(props, ref) {
  const { className, style, testID, children, 'aria-label': ariaLabel, ...aria } = props;
  const combobox = useCombobox('ChipRemove');
  const chip = useContext(ChipContextValue);
  if (chip === null) throw new Error('<Combobox.ChipRemove> must be rendered inside <Combobox.Chip>');
  if (combobox.disabled) return null;
  return (
    <Button
      {...aria}
      ref={ref}
      testID={testID}
      tabIndex={-1}
      aria-label={ariaLabel ?? `Remove ${chip.label}`}
      className={joinClassNames(CHIP_REMOVE_CLASS, className)}
      style={style}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
        combobox.remove(chip.value);
      }}
    >
      {children ?? '×'}
    </Button>
  );
});
ComboboxChipRemove.displayName = 'Combobox.ChipRemove';
