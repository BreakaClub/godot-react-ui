import type { ReactNode } from 'react';
import type { HostProps } from './components';
import { sameSpans, type FlatText, type NativeSpan } from './rich-text';
import { compileStyle, styleKey } from './styles';
import type { CompiledStyle, UIRole } from './types';

/** What kind of native node an element becomes. */
export type NativeKind = 'view' | 'text' | 'button' | 'textinput';

/**
 * The subset of an element's React props that native needs (plan 3.5). Event handlers and
 * everything else stay in JavaScript. A prop is absent, never `undefined`-valued or `false`, when it
 * has its default, so a diff can say "reset" with `null`.
 */
export interface NativeProps {
  /** Compiled `className` and `style`. */
  readonly style?: CompiledStyle;
  /** The string of a `text` node. With `spans` it is the source text: every string child, no inlay. */
  readonly text?: string;
  /** The styled ranges and inlays of a `text` node made of nested `Text` (`src/rich-text.ts`); absent for plain text. */
  readonly spans?: readonly NativeSpan[];
  readonly disabled?: true;
  /** Suspense is showing a fallback: the element and its subtree take no space. */
  readonly hidden?: true;
  readonly testID?: string;
  /** `0` is focusable and in the tab order; `-1` focusable only. Buttons need neither. */
  readonly tabIndex?: 0 | -1;
  /** Focus the element when it is first mounted. */
  readonly autoFocus?: true;
  /** A press that moves on (or a touch that is held) drags the element (plan 3.19). */
  readonly draggable?: true;
  /** What follows the pointer while the element is dragged; `native` when absent. */
  readonly dragPreview?: 'native' | 'none';
  /** Explicit accessibility role (plan Appendix D). `Button`, `Text` and `TextInput` have implicit ones. */
  readonly role?: UIRole;
  readonly ariaLabel?: string;
  readonly ariaDescription?: string;
  readonly ariaValueText?: string;
  readonly ariaPlaceholder?: string;
  /** Absent when false: hidden is the default. `aria-expanded`, `aria-selected` and `aria-checked` keep `false`. */
  readonly ariaHidden?: true;
  readonly ariaDisabled?: true;
  /** `false` means collapsed; absent means the element does not expand. */
  readonly ariaExpanded?: boolean;
  /** `false` means not selected; absent means the element is not selectable. */
  readonly ariaSelected?: boolean;
  readonly ariaReadOnly?: true;
  readonly ariaRequired?: true;
  readonly ariaModal?: true;
  /** `'mixed'` is the third state of a checkbox. */
  readonly ariaChecked?: boolean | 'mixed';
  readonly ariaValueMin?: number;
  readonly ariaValueMax?: number;
  readonly ariaValueNow?: number;
  readonly ariaLive?: 'off' | 'polite' | 'assertive';
  readonly ariaOrientation?: 'horizontal' | 'vertical';
  /** The tag of the element a combobox is on; see `aria-activedescendant` in `UIAriaProps`. */
  readonly ariaActiveDescendant?: number;
  /** The tag of the element this one controls. */
  readonly ariaControls?: number;
  /** `TextInput` only. The text it starts with; later changes are not sent (the buffer owns the text). */
  readonly defaultValue?: string;
  readonly placeholder?: string;
  readonly multiline?: true;
  readonly readOnly?: true;
  readonly secure?: true;
  readonly selectOnFocus?: true;
  readonly rows?: number;
  readonly maxLength?: number;
  readonly keyboardType?: KeyboardType;
}

/** Which on-screen keyboard a text input asks for (one to one with `DisplayServer.VirtualKeyboardType`). */
export type KeyboardType = 'default' | 'multiline' | 'number' | 'decimal' | 'phone' | 'email' | 'url' | 'password';

/** The accessibility fields of {@link NativeProps}: each one is a plain value that is compared with `!==`. */
const ACCESSIBILITY_KEYS = [
  'role', 'ariaLabel', 'ariaDescription', 'ariaValueText', 'ariaPlaceholder', 'ariaHidden', 'ariaDisabled',
  'ariaExpanded', 'ariaSelected', 'ariaReadOnly', 'ariaRequired', 'ariaModal', 'ariaChecked', 'ariaValueMin',
  'ariaValueMax', 'ariaValueNow', 'ariaLive', 'ariaOrientation', 'ariaActiveDescendant', 'ariaControls',
] as const satisfies readonly (keyof NativeProps)[];

/** The `TextInput` fields of {@link NativeProps} that are compared with `!==` (`defaultValue` is creation-only). */
const TEXT_INPUT_KEYS = [
  'placeholder', 'multiline', 'readOnly', 'secure', 'selectOnFocus', 'rows', 'maxLength', 'keyboardType',
] as const satisfies readonly (keyof NativeProps)[];

/** The changed keys of a node's native props; `null` resets a key to its default. */
export type NativePropsDiff = { [K in keyof NativeProps]?: NativeProps[K] | null };

/**
 * The keys of {@link NativeProps}, which is the whole table of native props: a React prop that is
 * not here is JavaScript-only. Native rejects any other key (`deny_unknown_fields`).
 */
export const NATIVE_PROP_KEYS = [
  'style', 'text', 'spans', 'disabled', 'hidden', 'testID', 'tabIndex', 'autoFocus', 'draggable', 'dragPreview', ...ACCESSIBILITY_KEYS,
  'defaultValue', ...TEXT_INPUT_KEYS,
] as const satisfies readonly (keyof NativeProps)[];

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
  readonly props: HostProps;
  readonly native: NativeProps;
}

/**
 * Derive the native props of an element. Compiling a style is the one costly step, so a clone whose
 * `className` and `style` props are unchanged reuses the previous compiled style.
 */
export function nativeProps(
  kind: NativeKind, props: HostProps, hidden: boolean, previous?: PreviousProps, rich?: FlatText,
): NativeProps {
  const native: { -readonly [K in keyof NativeProps]: NativeProps[K] } = {};
  if (previous !== undefined && previous.props.className === props.className && previous.props.style === props.style) {
    if (previous.native.style !== undefined) native.style = previous.native.style;
  } else if (props.className || props.style) {
    const compiled = compileStyle(props.className, props.style);
    if (compiled.layers.length > 0) native.style = compiled;
  }
  if (kind === 'text') {
    const text = rich === undefined ? scalarText(props.children) : rich.text;
    if (text === undefined) throw new Error('A Text whose children are not plain strings or numbers needs its flattened content (flattenRichText)');
    if (text !== '') native.text = text;
    if (rich !== undefined && rich.spans.length > 0) native.spans = rich.spans;
  }
  if (props.disabled === true) native.disabled = true;
  if (hidden) native.hidden = true;
  if (props.testID !== undefined) native.testID = props.testID;
  if (props.tabIndex !== undefined) {
    if (props.tabIndex !== 0 && props.tabIndex !== -1) throw new Error(`tabIndex must be 0 or -1, not ${String(props.tabIndex)}`);
    native.tabIndex = props.tabIndex;
  }
  if (props.autoFocus === true) native.autoFocus = true;
  if (props.draggable === true) native.draggable = true;
  if (props.dragPreview !== undefined) {
    if (props.dragPreview !== 'native' && props.dragPreview !== 'none') {
      throw new Error(`dragPreview must be 'native' or 'none', not ${String(props.dragPreview)}`);
    }
    native.dragPreview = props.dragPreview;
  }
  accessibilityProps(props, native);
  if (kind === 'textinput') textInputProps(props, native);
  else rejectTextInputProps(kind, props);
  return native;
}

/** The props only a text input has; a nonnegative `maxLength` and a positive `rows`, as native validates again. */
function textInputProps(props: HostProps, native: { -readonly [K in keyof NativeProps]: NativeProps[K] }): void {
  if (props.defaultValue !== undefined) native.defaultValue = props.defaultValue;
  if (props.placeholder !== undefined) native.placeholder = props.placeholder;
  if (props.multiline === true) native.multiline = true;
  if (props.readOnly === true) native.readOnly = true;
  if (props.secure === true) native.secure = true;
  if (props.selectTextOnFocus === true) native.selectOnFocus = true;
  if (props.rows !== undefined) {
    if (props.multiline !== true) throw new Error('rows is only valid with multiline');
    if (!Number.isInteger(props.rows) || props.rows < 1) throw new Error(`rows must be a positive integer, not ${String(props.rows)}`);
    native.rows = props.rows;
  }
  if (props.maxLength !== undefined) {
    if (!Number.isInteger(props.maxLength) || props.maxLength < 0) {
      throw new Error(`maxLength must be a nonnegative integer, not ${String(props.maxLength)}`);
    }
    native.maxLength = props.maxLength;
  }
  if (props.keyboardType !== undefined) native.keyboardType = props.keyboardType;
}

/** A text input prop on any other element is a mistake native would reject; say which prop. */
function rejectTextInputProps(kind: NativeKind, props: HostProps): void {
  const names = [
    'defaultValue', 'placeholder', 'multiline', 'readOnly', 'secure', 'selectTextOnFocus', 'rows', 'maxLength', 'keyboardType',
  ] as const;
  const present = names.find((name) => props[name] !== undefined);
  if (present !== undefined) throw new Error(`${present} is only valid on TextInput, not on a ${kind} element`);
}

/** `value` if it is a finite number, else a thrown error that names the JSX prop (native validates again). */
function finiteNumber(value: number | undefined, prop: string): number | undefined {
  if (value !== undefined && !Number.isFinite(value)) throw new Error(`${prop} must be a finite number, not ${String(value)}`);
  return value;
}

/** `value` if it is the tag of an element (a positive integer: tag 0 is the layer), else a thrown error that names the JSX prop. */
function elementTag(value: number | undefined, prop: string): number | undefined {
  if (value !== undefined && !(Number.isSafeInteger(value) && value > 0)) {
    throw new Error(`${prop} must be the id of an element handle (a positive integer), not ${String(value)}`);
  }
  return value;
}

/**
 * The accessibility props (plan 4.2, Phase I10): `role` and the JSX `aria-*` names mapped to the
 * camelCase native fields. A boolean whose default is false is sent only when true; `aria-expanded`,
 * `aria-selected` and `aria-checked` send `false` too, because absent means "not applicable".
 */
function accessibilityProps(props: HostProps, native: { -readonly [K in keyof NativeProps]: NativeProps[K] }): void {
  if (props.role !== undefined) native.role = props.role;
  if (props['aria-label'] !== undefined) native.ariaLabel = props['aria-label'];
  if (props['aria-description'] !== undefined) native.ariaDescription = props['aria-description'];
  if (props['aria-valuetext'] !== undefined) native.ariaValueText = props['aria-valuetext'];
  if (props['aria-placeholder'] !== undefined) native.ariaPlaceholder = props['aria-placeholder'];
  if (props['aria-hidden'] === true) native.ariaHidden = true;
  if (props['aria-disabled'] === true) native.ariaDisabled = true;
  if (props['aria-expanded'] !== undefined) native.ariaExpanded = props['aria-expanded'];
  if (props['aria-selected'] !== undefined) native.ariaSelected = props['aria-selected'];
  if (props['aria-readonly'] === true) native.ariaReadOnly = true;
  if (props['aria-required'] === true) native.ariaRequired = true;
  if (props['aria-modal'] === true) native.ariaModal = true;
  if (props['aria-checked'] !== undefined) native.ariaChecked = props['aria-checked'];
  const min = finiteNumber(props['aria-valuemin'], 'aria-valuemin');
  const max = finiteNumber(props['aria-valuemax'], 'aria-valuemax');
  const now = finiteNumber(props['aria-valuenow'], 'aria-valuenow');
  if (min !== undefined) native.ariaValueMin = min;
  if (max !== undefined) native.ariaValueMax = max;
  if (now !== undefined) native.ariaValueNow = now;
  if (props['aria-live'] !== undefined) native.ariaLive = props['aria-live'];
  if (props['aria-orientation'] !== undefined) native.ariaOrientation = props['aria-orientation'];
  const activeDescendant = elementTag(props['aria-activedescendant'], 'aria-activedescendant');
  const controls = elementTag(props['aria-controls'], 'aria-controls');
  if (activeDescendant !== undefined) native.ariaActiveDescendant = activeDescendant;
  if (controls !== undefined) native.ariaControls = controls;
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
  if (!sameSpans(previous.spans, next.spans)) {
    diff.spans = next.spans ?? null;
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
  if (previous.tabIndex !== next.tabIndex) {
    diff.tabIndex = next.tabIndex ?? null;
    changed = true;
  }
  if (previous.autoFocus !== next.autoFocus) {
    diff.autoFocus = next.autoFocus ?? null;
    changed = true;
  }
  if (previous.draggable !== next.draggable) {
    diff.draggable = next.draggable ?? null;
    changed = true;
  }
  if (previous.dragPreview !== next.dragPreview) {
    diff.dragPreview = next.dragPreview ?? null;
    changed = true;
  }
  for (const key of ACCESSIBILITY_KEYS) {
    if (diffScalar(diff, previous, next, key)) changed = true;
  }
  for (const key of TEXT_INPUT_KEYS) {
    if (diffScalar(diff, previous, next, key)) changed = true;
  }
  return changed ? diff : null;
}

/** Record `key` in `diff` if it changed between `previous` and `next`, `null` for a key that went absent. */
function diffScalar<K extends keyof NativeProps>(
  diff: { -readonly [P in keyof NativePropsDiff]: NativePropsDiff[P] },
  previous: NativeProps,
  next: NativeProps,
  key: K,
): boolean {
  if (previous[key] === next[key]) return false;
  diff[key] = next[key] ?? null;
  return true;
}
