import type { ReactNode } from 'react';
import { compileStyle } from './styles';
import type { CompiledStyle, LonghandStyle, StyleProp } from './types';

/**
 * Nested `Text` is one attributed paragraph, as in React Native: `<Text>const <Text className="text-purple-400">x</Text> = 1</Text>`
 * is one native node whose `text` is `const x = 1` and whose `spans` say which ranges are styled. This module is the flattening
 * (`flattenRichText`): the renderer collects a `Text`'s children as runs (strings) and spans (nested `Text`), and the commit walk
 * calls this once per changed text. Native resolves the spans (`native/text_span.rs`).
 */

/** The longhands a nested `Text` may set. Everything else is layout or belongs to an element, and is refused by name. */
export const SPAN_STYLE_KEYS = [
  'color', 'backgroundColor', 'fontFamily', 'fontWeight', 'fontStyle', 'textDecorationLine', 'textDecorationColor',
  'textDecorationStyle', 'textDecorationThickness', 'textUnderlineOffset',
] as const;

type SpanStyleKey = typeof SPAN_STYLE_KEYS[number];

/** The style of one span on the wire: the longhands of {@link SPAN_STYLE_KEYS} that its classes and style set. */
export type NativeSpanStyle = Readonly<Pick<LonghandStyle, SpanStyleKey>>;

/**
 * One styled range of a text, or one inlay. `start` and `end` are UTF-16 offsets into the node's `text` (which never contains an
 * inlay). A span's `children` lie inside it, in order, and inherit from it as nested elements do in CSS. An inlay has
 * `start === end` (where it sits in the source text) and the text it shows in `inlay`.
 */
export interface NativeSpan {
  readonly start: number;
  readonly end: number;
  readonly style?: NativeSpanStyle;
  readonly inlay?: string;
  readonly children?: readonly NativeSpan[];
}

/** The props a nested `Text` accepts. It is a run of its parent's text, not an element. */
export interface SpanProps {
  readonly children?: ReactNode;
  readonly className?: string;
  readonly style?: StyleProp;
  /** Generated text: shown, measured and wrapped like text, but not part of the source text. See `TextProps.inlay`. */
  readonly inlay?: boolean;
  readonly ref?: unknown;
}

/** A string child of a text. */
export interface RichRun {
  readonly kind: 'run';
  readonly text: string;
}

/** A nested `Text`, with what it holds in order. */
export interface RichSpan {
  readonly kind: 'span';
  readonly props: SpanProps;
  readonly content: readonly RichPart[];
  /** Suspense is showing a fallback: the span contributes nothing. */
  readonly hidden: boolean;
}

export type RichPart = RichRun | RichSpan;

/** What a text node sends natively when it holds spans. */
export interface FlatText {
  readonly text: string;
  readonly spans: readonly NativeSpan[];
}

const ALLOWED_PROPS: readonly string[] = ['children', 'className', 'style', 'inlay', 'ref'];

/** Throw for a prop a nested `Text` cannot have, naming it. */
export function checkSpanProps(props: object): void {
  for (const name of Object.keys(props)) {
    if (ALLOWED_PROPS.includes(name)) continue;
    throw new Error(
      `${name} cannot be set on a nested <Text>: it styles a run of its parent's text and is not an element `
      + `(it accepts className, style and inlay)`,
    );
  }
}

function isSpanStyleKey(key: string): key is SpanStyleKey {
  return SPAN_STYLE_KEYS.some((allowed) => allowed === key);
}

const merged = new WeakMap<CompiledStyle, NativeSpanStyle | undefined>();

/**
 * The style of a span: its classes and style merged in order into one set of longhands. Conditions (`hover:`, `md:`) are refused:
 * a span is not a pointer target, and its parent does not restyle it when the viewport changes.
 */
function mergeSpanStyle(compiled: CompiledStyle): NativeSpanStyle | undefined {
  if (merged.has(compiled)) return merged.get(compiled);
  const result: { -readonly [K in SpanStyleKey]?: LonghandStyle[K] } = {};
  function copy<K extends SpanStyleKey>(key: K, style: Readonly<LonghandStyle>): void {
    const value = style[key];
    if (value !== undefined) result[key] = value;
  }
  for (const layer of compiled.layers) {
    if (layer.minWidth !== undefined || layer.states !== undefined) {
      throw new Error(
        'a nested <Text> cannot use a breakpoint or a state (md:, hover:, focus:...) class: it is a run of its parent\'s text, '
        + 'which is not restyled by them. Style the parent <Text>, or choose the class in JavaScript',
      );
    }
    for (const key of Object.keys(layer.style)) {
      if (!isSpanStyleKey(key)) {
        throw new Error(
          `${key} cannot be set on a nested <Text>: it styles a run of its parent's text (it accepts ${SPAN_STYLE_KEYS.join(', ')})`,
        );
      }
      copy(key, layer.style);
    }
  }
  const style = Object.keys(result).length === 0 ? undefined : Object.freeze(result);
  merged.set(compiled, style);
  return style;
}

function styleOf(props: SpanProps): NativeSpanStyle | undefined {
  if (!props.className && !props.style) return undefined;
  return mergeSpanStyle(compileStyle(props.className, props.style));
}

/** The text of an inlay's content, which holds plain text only. */
function inlayText(content: readonly RichPart[]): string {
  let text = '';
  for (const part of content) {
    if (part.kind === 'span') throw new Error('an inlay holds plain text: it cannot contain a nested <Text>');
    text += part.text;
  }
  return text;
}

/**
 * The text of `content` (every string, in order, inlays left out) and its spans. A nested `Text` that sets no style is
 * transparent: its children are hoisted. An empty one is dropped.
 */
export function flattenRichText(content: readonly RichPart[]): FlatText {
  let text = '';
  function walk(parts: readonly RichPart[], into: NativeSpan[]): void {
    for (const part of parts) {
      if (part.kind === 'run') {
        text += part.text;
        continue;
      }
      if (part.hidden) continue;
      const style = styleOf(part.props);
      if (part.props.inlay === true) {
        const label = inlayText(part.content);
        if (label !== '') into.push({ start: text.length, end: text.length, inlay: label, ...(style === undefined ? {} : { style }) });
        continue;
      }
      const start = text.length;
      const children: NativeSpan[] = [];
      walk(part.content, children);
      if (style === undefined) {
        into.push(...children);
      } else if (text.length > start || children.length > 0) {
        into.push({ start, end: text.length, style, ...(children.length > 0 ? { children } : {}) });
      }
    }
  }
  const spans: NativeSpan[] = [];
  walk(content, spans);
  return { text, spans };
}

const keys = new WeakMap<readonly NativeSpan[], string>();

function keyOf(spans: readonly NativeSpan[]): string {
  let key = keys.get(spans);
  if (key === undefined) {
    key = JSON.stringify(spans);
    keys.set(spans, key);
  }
  return key;
}

/** Whether two `spans` props say the same thing: the commit diff sends them again only when they differ. */
export function sameSpans(left: readonly NativeSpan[] | undefined, right: readonly NativeSpan[] | undefined): boolean {
  if (left === right) return true;
  if (left === undefined || right === undefined) return false;
  return keyOf(left) === keyOf(right);
}
