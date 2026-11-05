import type { ReactNode } from 'react';
import type { UIProps } from './components';
import { compileStyle, styleKey } from './styles';
import type { CompiledStyle } from './types';

/** What kind of native node an element becomes. */
export type NativeKind = 'view' | 'text' | 'button';

/**
 * The subset of an element's React props that native needs (plan 3.5). Event handlers and
 * everything else stay in JavaScript. A prop is absent, never `undefined`-valued or `false`, when it
 * has its default, so a diff can say "reset" with `null`.
 */
export interface NativeProps {
  /** Compiled `className` and `style`. */
  readonly style?: CompiledStyle;
  /** The string of a `text` node. */
  readonly text?: string;
  readonly disabled?: true;
  /** Suspense is showing a fallback: the element and its subtree take no space. */
  readonly hidden?: true;
  readonly testID?: string;
}

/** The changed keys of a node's native props; `null` resets a key to its default. */
export type NativePropsDiff = { [K in keyof NativeProps]?: NativeProps[K] | null };

/**
 * The keys of {@link NativeProps}, which is the whole table of native props: a React prop that is
 * not here is JavaScript-only. Native rejects any other key (`deny_unknown_fields`).
 */
export const NATIVE_PROP_KEYS = ['style', 'text', 'disabled', 'hidden', 'testID'] as const satisfies readonly (keyof NativeProps)[];

/** The text a `text` element shows, or `undefined` if its children are not plain strings or numbers. */
export function scalarText(children: ReactNode): string | undefined {
  if (children === null || children === undefined || typeof children === 'boolean') return '';
  if (typeof children === 'string' || typeof children === 'number' || typeof children === 'bigint') {
    return String(children);
  }
  if (Array.isArray(children)) {
    let text = '';
    for (const child of children) {
      const part = scalarText(child);
      if (part === undefined) return undefined;
      text += part;
    }
    return text;
  }
  return undefined;
}

/** The previous element's props and native props, when a clone can reuse part of its work. */
export interface PreviousProps {
  readonly props: UIProps;
  readonly native: NativeProps;
}

/**
 * Derive the native props of an element. Compiling a style is the one costly step, so a clone whose
 * `className` and `style` props are unchanged reuses the previous compiled style.
 */
export function nativeProps(kind: NativeKind, props: UIProps, hidden: boolean, previous?: PreviousProps): NativeProps {
  const native: { -readonly [K in keyof NativeProps]: NativeProps[K] } = {};
  if (previous !== undefined && previous.props.className === props.className && previous.props.style === props.style) {
    if (previous.native.style !== undefined) native.style = previous.native.style;
  } else if (props.className || props.style) {
    const compiled = compileStyle(props.className, props.style);
    if (compiled.layers.length > 0) native.style = compiled;
  }
  if (kind === 'text') {
    const text = scalarText(props.children);
    if (text === undefined) throw new Error('Text children must be strings or numbers');
    if (text !== '') native.text = text;
  }
  if (props.disabled === true) native.disabled = true;
  if (hidden) native.hidden = true;
  if (props.testID !== undefined) native.testID = props.testID;
  return native;
}

function sameStyle(left: CompiledStyle | undefined, right: CompiledStyle | undefined): boolean {
  if (left === right) return true;
  // Interned styles are identical when equal; only a cleared intern table makes equal ones differ.
  return left !== undefined && right !== undefined && styleKey(left) === styleKey(right);
}

/**
 * The changed keys between two native prop sets, or `null` if nothing native changed (a handler-only
 * change). A key that went from set to absent is `null`.
 */
export function diffNativeProps(previous: NativeProps, next: NativeProps): NativePropsDiff | null {
  const diff: { -readonly [K in keyof NativePropsDiff]: NativePropsDiff[K] } = {};
  let changed = false;
  if (!sameStyle(previous.style, next.style)) {
    diff.style = next.style ?? null;
    changed = true;
  }
  if (previous.text !== next.text) {
    diff.text = next.text ?? null;
    changed = true;
  }
  if (previous.disabled !== next.disabled) {
    diff.disabled = next.disabled ?? null;
    changed = true;
  }
  if (previous.hidden !== next.hidden) {
    diff.hidden = next.hidden ?? null;
    changed = true;
  }
  if (previous.testID !== next.testID) {
    diff.testID = next.testID ?? null;
    changed = true;
  }
  return changed ? diff : null;
}
