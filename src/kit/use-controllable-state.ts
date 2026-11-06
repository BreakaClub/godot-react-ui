import { useCallback, useLayoutEffect, useReducer, useRef, useState } from 'react';

export interface ControllableStateOptions<T, S extends T> {
  /** The controlled value. `undefined` means the component is uncontrolled. */
  readonly prop: T | undefined;
  /** The starting value of an uncontrolled component. */
  readonly defaultProp: T;
  /** Called with each change the user makes, in controlled and uncontrolled use alike. */
  readonly onChange?: (value: S) => void;
  /** The component's name, for the controlled/uncontrolled switch error. */
  readonly name: string;
}

/**
 * A value that is either owned by the parent (`prop` is defined) or held here (`defaultProp`), with one
 * setter for both. `T` is every value the state can hold; `S` is what the user can produce (a checkbox
 * can be shown `'indeterminate'`, but a click only makes it `true` or `false`).
 *
 * The setter compares with the value most recently requested, not the one last rendered: handlers
 * that run several times before React renders again (a drag delivers many `pointermove`s per frame)
 * must not skip a change back to the rendered value, because that rendered value is already
 * superseded. Every render makes the rendered value the latest again. A controlled parent that
 * declines a change would not render, so a controlled request also renders this component: the
 * parent's value is shown again and the same request can be made, and reported, again.
 */
export function useControllableState<T, S extends T = T>(
  options: ControllableStateOptions<T, S>,
): readonly [value: T, setValue: (next: S) => void] {
  const { prop, defaultProp, onChange, name } = options;
  const [uncontrolled, setUncontrolled] = useState<T>(defaultProp);
  const [, rerender] = useReducer((renders: number) => renders + 1, 0);
  const controlled = prop !== undefined;
  const value = prop !== undefined ? prop : uncontrolled;

  const latest = useRef(value);
  const latestOnChange = useRef(onChange);
  const isControlled = useRef(controlled);
  const wasControlled = useRef(controlled);

  useLayoutEffect(() => {
    latest.current = value;
    latestOnChange.current = onChange;
    isControlled.current = controlled;
    if (wasControlled.current !== controlled) {
      // React's own rule for inputs: the owner of a value must not change from the component to the parent.
      console.error(
        `${name} changed from ${wasControlled.current ? 'controlled' : 'uncontrolled'} to ` +
        `${controlled ? 'controlled' : 'uncontrolled'}. Decide for the component's whole life whether its value ` +
        'is controlled (a defined prop) or uncontrolled (undefined).',
      );
      wasControlled.current = controlled;
    }
  });

  const setValue = useCallback((next: S) => {
    if (Object.is(next, latest.current)) return;
    latest.current = next;
    if (isControlled.current) rerender();
    else setUncontrolled(next);
    latestOnChange.current?.(next);
  }, []);

  return [value, setValue];
}
