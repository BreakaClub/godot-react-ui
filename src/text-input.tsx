import { createElement, forwardRef, useCallback, useLayoutEffect, useReducer, useRef, type ForwardedRef } from 'react';
import type { TextInputHandle, TextInputHostProps, UIHandle, UIProps } from './components';
import type { UIInputEvent, UIKeyboardEvent, UITextSelectionChangeEvent } from './events';

/**
 * The props of {@link TextInput}: the settings of a text input (`placeholder`, `multiline`, `readOnly`, `secure`,
 * `maxLength`, `selectTextOnFocus`, `rows`, `keyboardType`), its events (`onBeforeInput`, `onSelectionChange`, ...)
 * and React Native's controlled-input protocol on top of them.
 */
export interface TextInputProps extends Omit<UIProps, 'children'>, Omit<TextInputHostProps, 'defaultValue'> {
  /**
   * The text. Setting it makes the input controlled: whenever it differs from what native holds, the component sends
   * it with `setTextAndSelection`, so an `onChange` that stores something else (uppercase, a filtered string, the old
   * value) takes effect at once. Leave it out for an uncontrolled input.
   */
  value?: string;
  /** The text an uncontrolled input starts with. Not read after the input is created. */
  defaultValue?: string;
  /** The text changed because of an edit; `event.value` is all of it. */
  onChange?: (event: UIInputEvent) => void;
  /** The same event as `onChange`, as React DOM names it. */
  onInput?: (event: UIInputEvent) => void;
  /** Enter was pressed in a single-line input that is not composing, and nothing prevented it. */
  onSubmit?: (value: string) => void;
}

/** What the component knows of native's text between renders: JS has no other copy of it. */
interface NativeText {
  value: string;
  eventCount: number;
  selectionStart: number;
  selectionEnd: number;
}

/** Whether an element handle is a text input's, which has the selection methods. */
export function isTextInputHandle(handle: UIHandle | null): handle is TextInputHandle {
  return handle !== null && 'setTextAndSelection' in handle && 'setSelectionRange' in handle;
}

/** React Native's protocol: native owns the text, and JS answers an edit with a command. */
export const TextInput = forwardRef<TextInputHandle, TextInputProps>((props, forwardedRef) => {
  const {
    value, defaultValue, onChange, onInput, onSubmit, onKeyDown, onSelectionChange, multiline, ...host
  } = props;
  const handle = useRef<TextInputHandle | null>(null);
  // The text native has, as the last `input` event or accepted command left it. Updating it from an event also
  // renders again (React Native's `lastNativeText` state): an `onChange` that stores nothing still has to see a
  // controlled input put back.
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const initial = value ?? defaultValue ?? '';
  const startingText = useRef(initial);
  const native = useRef<NativeText>({ value: initial, eventCount: 0, selectionStart: initial.length, selectionEnd: initial.length });
  // What the text and the selection were before the last edit, to put back an edit that was rejected.
  const before = useRef<NativeText>(native.current);

  const setRef = useCallback((element: UIHandle | null) => {
    handle.current = isTextInputHandle(element) ? element : null;
    assignRef(forwardedRef, handle.current);
  }, [forwardedRef]);

  useLayoutEffect(() => {
    const element = handle.current;
    if (value === undefined || element === null || value === native.current.value) return;
    const known = native.current;
    // The selection to keep: same length (a transform such as uppercase) keeps the caret where it is; a return to the text
    // from before the edit (a rejection) puts back the selection from before it; anything else goes to the end.
    let start: number | undefined;
    let end: number | undefined;
    if (value.length === known.value.length) {
      start = known.selectionStart;
      end = known.selectionEnd;
    } else if (value === before.current.value) {
      start = before.current.selectionStart;
      end = before.current.selectionEnd;
    }
    const applied = element.setTextAndSelection(known.eventCount, value, start, end);
    // A command made stale by typing since is ignored; that typing's `input` event reconciles again.
    if (applied) {
      native.current = {
        value, eventCount: known.eventCount,
        selectionStart: start ?? value.length, selectionEnd: end ?? value.length,
      };
    }
  });

  const handleInput = (event: UIInputEvent) => {
    before.current = native.current;
    native.current = {
      value: event.value, eventCount: event.eventCount,
      selectionStart: event.selectionStart, selectionEnd: event.selectionEnd,
    };
    rerender();
    onChange?.(event);
    onInput?.(event);
  };

  const handleSelectionChange = (event: UITextSelectionChangeEvent) => {
    native.current = { ...native.current, selectionStart: event.selectionStart, selectionEnd: event.selectionEnd };
    onSelectionChange?.(event);
  };

  const handleKeyDown = (event: UIKeyboardEvent) => {
    onKeyDown?.(event);
    if (
      onSubmit !== undefined && multiline !== true && event.key === 'Enter' && !event.isComposing && !event.repeat
      && !event.defaultPrevented
    ) {
      onSubmit(native.current.value);
    }
  };

  return createElement('textinput', {
    ...host,
    multiline,
    defaultValue: startingText.current,
    onInput: handleInput,
    onSelectionChange: handleSelectionChange,
    onKeyDown: handleKeyDown,
    ref: setRef,
  });
});
TextInput.displayName = 'TextInput';

/** Give a ref (an object or a callback) the element, as React does for a ref passed to a host component. */
function assignRef<T>(ref: ForwardedRef<T>, element: T | null): void {
  if (typeof ref === 'function') ref(element);
  else if (ref !== null) ref.current = element;
}
