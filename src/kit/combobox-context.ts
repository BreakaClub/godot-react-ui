import { createContext, useContext, type MutableRefObject } from 'react';
import type { TextInputHandle, UIHandle } from '../components';
import type { UIKeyboardEvent } from '../events';
import type { ItemRegistry } from './popup';

/** What the combobox knows of an option: its text, to show, to search and to name a chip, and its element while it is in the list. */
export interface OptionEntry {
  readonly id: string;
  readonly value: string;
  readonly textValue: string;
  readonly disabled: boolean;
  /** Set only while the option is rendered: the list is shown and the option matches the input. */
  readonly handle: MutableRefObject<UIHandle | null>;
}

/** One chip: its value and its element, to walk the chips with the arrow keys. */
export interface ChipEntry {
  readonly id: string;
  readonly value: string;
  readonly handle: MutableRefObject<UIHandle | null>;
}

/**
 * Why the active option is what it is: the keys (the list scrolls to show it), the pointer (it is already in view,
 * and moving the list under a resting pointer must not change it) or the component itself (opening on the selected
 * option, `autoHighlight`).
 */
export type ActiveCause = 'keyboard' | 'pointer' | 'automatic';

export interface ComboboxContext {
  readonly multiple: boolean;
  readonly disabled: boolean;
  /** The selected values, in the order they were chosen. A single combobox holds at most one. */
  readonly values: readonly string[];
  /** The text of the input. */
  readonly inputValue: string;
  /** Whether the list was asked to be open. */
  readonly open: boolean;
  /** Whether the list is on screen: asked for, and there is an option to show or an `Empty` to say there is none. */
  readonly popupVisible: boolean;
  /** The `value` of the active option: the one `Enter` chooses, which the input announces. */
  readonly activeValue: string | null;
  readonly activeCause: MutableRefObject<ActiveCause>;
  /** The tags `aria-activedescendant` and `aria-controls` name, once the elements exist. */
  readonly activeTag: number | undefined;
  readonly listboxTag: number | undefined;
  readonly setListboxTag: (tag: number | undefined) => void;
  /** The `value`s of the options that match the input, disabled ones included. */
  readonly matched: ReadonlySet<string>;
  readonly options: ItemRegistry<OptionEntry>;
  readonly chips: ItemRegistry<ChipEntry>;
  /** Whether a `Combobox.Empty` is mounted: with one, the list shows when nothing matches. */
  readonly setHasEmpty: (present: boolean) => void;
  readonly input: MutableRefObject<TextInputHandle | null>;
  /** The box the list opens from. Without a `Combobox.Control` the list opens from the input. */
  readonly control: MutableRefObject<UIHandle | null>;
  readonly anchor: () => UIHandle | null;
  readonly setOpen: (open: boolean) => void;
  /** The user edited the text: filter, and open. */
  readonly typed: (text: string) => void;
  /** Choose the option: a single combobox takes its text and closes, a multiple one toggles it and clears the text. */
  readonly choose: (value: string) => void;
  /** Take `value` out of the selection. */
  readonly remove: (value: string) => void;
  /** Empty the selection and the text, and give the input focus. */
  readonly clear: () => void;
  /** The pointer moved over an option. */
  readonly hover: (value: string) => void;
  /** Focus left the input towards `to`: out of the combobox, onto a chip, or onto the list. */
  readonly inputBlurred: (to: UIHandle | null) => void;
  /** The input's keys. */
  readonly inputKeyDown: (event: UIKeyboardEvent) => void;
  /**
   * A comma was typed. In a multiple combobox that allows custom values it adds the typed text as a chip and
   * returns true, and the comma is not typed. Otherwise it returns false and the comma is text.
   */
  readonly commaTyped: () => boolean;
  /** Focus the input and open the list, as a press on the control does. */
  readonly activate: () => void;
  /** A press on the trigger. */
  readonly toggle: () => void;
}

export const ComboboxContextValue = createContext<ComboboxContext | null>(null);

/** The combobox a part is in; a part outside `Combobox.Root` is a mistake worth a clear error. */
export function useCombobox(part: string): ComboboxContext {
  const combobox = useContext(ComboboxContextValue);
  if (combobox === null) throw new Error(`<Combobox.${part}> must be rendered inside <Combobox.Root>`);
  return combobox;
}

/** The text a value goes by in the chips: its option's, else the value. */
export function chipLabel(combobox: Pick<ComboboxContext, 'options'>, value: string): string {
  return combobox.options.entries.find((entry) => entry.value === value)?.textValue ?? value;
}
