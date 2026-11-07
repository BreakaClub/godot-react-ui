// A deliberately small DOM-element shim: `createElement('div' | 'span' | 'pre' | 'textarea' | 'button' | ...)` -> View / Text / TextInput / Button,
// with props it cannot honour dropped AND COUNTED in `shimLog` (a shim that drops silently would hide the gaps; this one reports them).
// It is a probe, not a proposal: see the findings in the report for what it cannot do.
import { Children, Fragment, createElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { Button, Text, TextInput, View, type UIHandle } from '../../../../src';
import type { TextInputHandle } from '../../../../src';
import { compileStyle } from '../../../../src/styles';
import type { Style } from '../../../../src/types';
import { toHex } from './css-colour';
import { nativeStyleKeys } from './native-style-check';

/** What the shim dropped or approximated: `what -> count`. */
export const shimLog = new Map<string, number>();
const note = (what: string) => shimLog.set(what, (shimLog.get(what) ?? 0) + 1);

/** The caret colour for a transparent-text textarea (-webkit-text-fill-color: transparent keeps a visible caret in a browser; here it must be said). */
export const shimOptions = { caretColor: '#d4d4d4' as `#${string}` };

const BLOCK = new Set(['div', 'section', 'article', 'main', 'header', 'footer', 'nav', 'aside', 'ul', 'ol', 'li', 'form', 'figure']);
const INLINE = new Set(['span', 'pre', 'code', 'p', 'a', 'b', 'i', 'em', 'strong', 'small', 'label', 'kbd', 'samp', 'sub', 'sup', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
/** Inline-level in the list above, but block-level in CSS: their element children stack, they do not flow. */
const BLOCK_LIKE_TEXT = new Set(['pre', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const INERT = new Set(['style', 'script', 'br', 'link', 'meta']);
const ALLOWED_STYLE = nativeStyleKeys();
const PX = /^(-?[\d.]+)(px)?$/;

function translateStyle(css: Record<string, unknown> | undefined): Style | undefined {
  if (css === undefined) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(css)) {
    if (raw === undefined || raw === null) continue;
    if (key === 'WebkitTextFillColor') {
      if (raw === 'transparent') { out.color = '#00000000'; out.caretColor = shimOptions.caretColor; note('WebkitTextFillColor:transparent -> color #00000000 + assumed caretColor'); }
      else note(`style.${key}`);
      continue;
    }
    if (key === 'color' || key === 'backgroundColor') {
      const hex = toHex(String(raw));
      if (hex === undefined) note(`style.${key}=${String(raw)} (not a flat colour)`); else out[key] = hex;
      continue;
    }
    if (!ALLOWED_STYLE.has(key) && key !== 'padding' && key !== 'margin' && key !== 'gap' && key !== 'overflow' && key !== 'inset') { note(`style.${key}`); continue; }
    if (typeof raw === 'string') {
      const match = PX.exec(raw);
      if (match && key !== 'overflow') out[key] = parseFloat(match[1]);
      else if (/%$|^auto$|^(visible|hidden|scroll|auto|absolute|relative|fixed|static|flex|none|row|column|nowrap|wrap|center|start|end|stretch)$/.test(raw)) out[key] = raw;
      else note(`style.${key}=${raw} (unit/keyword)`);
    } else out[key] = raw;
  }
  return out as Style;
}

/** DOM-era class names: keep the tokens our compiler accepts, drop and count the rest (an unknown class would throw at render). */
function translateClassName(className: unknown): string | undefined {
  if (typeof className !== 'string') return undefined;
  const kept: string[] = [];
  for (const token of className.split(/\s+/).filter(Boolean)) {
    try { compileStyle(token); kept.push(token); } catch { note('className token (unknown to compiler)'); }
  }
  return kept.length ? kept.join(' ') : undefined;
}

const KEY_CODES: Readonly<Record<string, number>> = { '(': 57, '[': 219, '{': 219, "'": 222, '"': 222, '`': 192, Enter: 13, Tab: 9, Backspace: 8, Escape: 27 };
/** Our UIKeyboardEvent has `key`/`code` but no legacy `keyCode`; libraries still read it (react-simple-code-editor does for undo, redo and bracket pairs). */
function keyCodeOf(key: string): number {
  return KEY_CODES[key] ?? (key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0);
}
function withKeyCode<E extends { key: string }>(event: E): E {
  note('event.keyCode synthesised');
  return new Proxy(event, {
    get(target, property) {
      if (property === 'keyCode') return keyCodeOf(target.key);
      const value: unknown = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

interface Run { text: string; style: Style | undefined }

/** Flatten host spans (and our Text) into text runs, splitting at newlines; undefined when a child is a component we cannot see into. */
function flatten(node: ReactNode, inherited: Style | undefined, lines: Run[][]): boolean {
  if (node === null || node === undefined || typeof node === 'boolean') return true;
  if (typeof node === 'string' || typeof node === 'number') {
    node = String(node);
    const parts = (node as string).split('\n');
    parts.forEach((part, index) => {
      if (index > 0) lines.push([]);
      if (part !== '') lines[lines.length - 1].push({ text: part, style: inherited });
    });
    return true;
  }
  if (Array.isArray(node)) return node.every((child) => flatten(child, inherited, lines));
  if (!isValidElement(node)) return false;
  const element = node as ReactElement<{ style?: Style & Record<string, unknown>; children?: ReactNode }>;
  if (element.type === Fragment) return flatten(element.props.children, inherited, lines);
  if (typeof element.type === 'string' && (INLINE.has(element.type) || element.type === 'br')) {
    if (element.type === 'br') { lines.push([]); return true; }
    return flatten(element.props.children, { ...inherited, ...translateStyle(element.props.style) }, lines);
  }
  if (element.type === Text) return flatten(element.props.children, { ...inherited, ...element.props.style }, lines);
  return false;
}

function mergeStyles(...styles: Array<Style | undefined>): Style | undefined {
  const merged = Object.assign({}, ...styles.filter(Boolean));
  return Object.keys(merged).length ? merged : undefined;
}

function isTextOnly(children: ReactNode): boolean {
  return Children.toArray(children).every((child) => typeof child === 'string' || typeof child === 'number');
}

/** A textarea ref the library can treat like a DOM node: value / selectionStart / selectionEnd are assignable and write through to native. */
function textAreaRef(userRef: unknown, eventCount: { current: number }) {
  return (handle: TextInputHandle | null) => {
    let proxy: unknown = null;
    if (handle !== null) {
      proxy = {
        get value() { return handle.value; },
        set value(text: string) { handle.setTextAndSelection(eventCount.current, text); note('ref.value= via setTextAndSelection'); },
        get selectionStart() { return handle.selectionStart; },
        set selectionStart(start: number) { handle.setSelectionRange(start, Math.max(start, handle.selectionEnd)); note('ref.selectionStart= via setSelectionRange'); },
        get selectionEnd() { return handle.selectionEnd; },
        set selectionEnd(end: number) { handle.setSelectionRange(Math.min(handle.selectionStart, end), end); note('ref.selectionEnd= via setSelectionRange'); },
        focus: () => handle.focus(), blur: () => handle.blur(), select: () => handle.select(),
      };
    }
    if (typeof userRef === 'function') userRef(proxy); else if (userRef && typeof userRef === 'object') (userRef as { current: unknown }).current = proxy;
  };
}

export function shimCreateElement(type: unknown, props: Record<string, unknown> | null, ...children: ReactNode[]): ReactNode {
  if (typeof type !== 'string') return createElement(type as never, props, ...children);
  if (INERT.has(type)) { note(`<${type}> removed`); return null; }
  const { className, style, children: propChildren, dangerouslySetInnerHTML, ref, key, ...rest } = props ?? {};
  const kids: ReactNode = children.length ? children : (propChildren as ReactNode);
  if (dangerouslySetInnerHTML !== undefined) note(`dangerouslySetInnerHTML dropped on <${type}>`);
  const isField = type === 'textarea' || type === 'input';
  const FIELD_PROPS = new Set(['value', 'defaultValue', 'placeholder', 'readOnly', 'onChange', 'onKeyDown', 'maxLength']);
  const common: Record<string, unknown> = { key, ref, className: translateClassName(className), style: translateStyle(style as Record<string, unknown> | undefined) };
  // Keep only props our elements understand: handlers, aria-*, role, testID, tabIndex, disabled. Everything else is a DOM attribute.
  for (const [name, value] of Object.entries(rest)) {
    if (isField && FIELD_PROPS.has(name)) continue;
    if (/^on[A-Z]/.test(name) || name.startsWith('aria-') || name === 'role' || name === 'testID' || name === 'tabIndex' || name === 'disabled' || name === 'autoFocus') common[name] = value;
    else note(`prop ${name} (DOM attribute) dropped`);
  }
  if (isField) {
    // `eventCount` is how many `input` events native has made; setTextAndSelection only applies if it matches, and the handle does not expose it,
    // so the shim keeps the last one it saw (0 before the first edit).
    const eventCount = { current: 0 };
    const onChange = rest.onChange as ((e: unknown) => void) | undefined;
    const onKeyDown = rest.onKeyDown as ((e: unknown) => void) | undefined;
    if (rest.maxLength !== undefined) note('maxLength passed through');
    return createElement(TextInput, {
      ...common as object, key: key as never, multiline: type === 'textarea',
      value: rest.value as string | undefined, defaultValue: rest.defaultValue as string | undefined,
      readOnly: rest.readOnly as boolean | undefined, placeholder: rest.placeholder as string | undefined,
      maxLength: rest.maxLength as number | undefined,
      ref: textAreaRef(ref, eventCount) as never,
      onChange: (event) => { eventCount.current = event.eventCount; onChange?.(event); },
      onKeyDown: (event) => onKeyDown?.(withKeyCode(event)),
    });
  }
  if (type === 'button') return createElement(Button, common as never, kids);
  if (BLOCK.has(type)) {
    // A block holding bare strings next to elements: wrap strings in Text, as a View may not hold raw strings.
    const wrapped = Children.toArray(kids).map((child, index) => (typeof child === 'string' || typeof child === 'number') ? createElement(Text, { key: `t${index}` }, child) : child);
    return createElement(View, common as never, ...wrapped);
  }
  if (INLINE.has(type)) {
    if (isTextOnly(kids)) return createElement(Text, common as never, ...Children.toArray(kids));
    const lines: Run[][] = [[]];
    if (flatten(kids, undefined, lines)) {
      note(`<${type}> children flattened to runs (inline flow emulated as rows of Text)`);
      return createElement(View, { ...common, style: mergeStyles(common.style as Style | undefined) } as never,
        ...lines.map((line, lineIndex) => createElement(View, { key: lineIndex, style: { flexDirection: 'row' } },
          ...line.map((run, runIndex) => createElement(Text, { key: runIndex, style: run.style }, run.text)))));
    }
    const stacked = BLOCK_LIKE_TEXT.has(type);
    note(`<${type}> has component/element children we cannot flatten: laid out as a ${stacked ? 'column (block-level)' : 'wrapping row (inline flow only approximated)'}`);
    return createElement(View, { ...common, style: mergeStyles(stacked ? undefined : { flexDirection: 'row', flexWrap: 'wrap' }, common.style as Style | undefined) } as never,
      ...Children.toArray(kids).map((child, index) => (typeof child === 'string' || typeof child === 'number') ? createElement(Text, { key: `t${index}` }, child) : child));
  }
  note(`unknown element <${type}> -> View`);
  return createElement(View, common as never, ...Children.toArray(kids));
}

export const shimJsx = (type: unknown, props: Record<string, unknown>, key?: string) => shimCreateElement(type, key === undefined ? props : { ...props, key });
export type { UIHandle };
