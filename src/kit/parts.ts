import { useCallback, useMemo, type ForwardedRef, type MutableRefObject } from 'react';
import type { Style, StyleProp } from '../types';

/** The two props every part of a kit component accepts. They are applied after the part's defaults. */
export interface PartProps {
  className?: string;
  style?: StyleProp;
}

/**
 * Join class names, defaults first: the cascade is ordered, so a later token overrides an earlier one
 * with the same conditions (`compileStyle` merges adjacent layers in order).
 */
export function joinClassNames(...names: ReadonlyArray<string | false | null | undefined>): string {
  return names.filter((name): name is string => typeof name === 'string' && name !== '').join(' ');
}

/**
 * A part's own style followed by the caller's. The result is stable while its inputs are, which is
 * what lets the renderer reuse the compiled style instead of compiling on every render.
 */
export function useStyle(own: Style | undefined, extra: StyleProp): StyleProp {
  return useMemo(() => (extra === undefined || extra === null || extra === false ? own : [own, extra]), [own, extra]);
}

/** Set a forwarded ref, which is a callback or an object. */
function assignRef<T>(ref: ForwardedRef<T>, value: T | null): void {
  if (typeof ref === 'function') ref(value);
  else if (ref !== null) ref.current = value;
}

/** A ref callback that sets `inner` (for the component's own use) and the ref the caller forwarded. */
export function useComposedRef<T>(inner: MutableRefObject<T | null>, forwarded: ForwardedRef<T>): (value: T | null) => void {
  return useCallback((value: T | null) => {
    inner.current = value;
    assignRef(forwarded, value);
  }, [inner, forwarded]);
}
