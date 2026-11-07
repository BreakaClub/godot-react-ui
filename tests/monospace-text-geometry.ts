import type { LayoutRect } from '../src/native';
import type { NativeSpan } from '../src/rich-text';
import type { RecordingHost } from './recording-host';

/**
 * The text geometry queries (`getCaretRect`, `getOffsetAtPoint`, `getRangeRects`) of a fake host, answered for a monospace font by the
 * rule of the native text (docs/tracks/rich-text.md): offsets are the source text's, an inlay is `advance` times its length of width at the
 * offset it stands at and is not counted, a caret is on either side of the group of inlays at an offset, and a character that is wide
 * (CJK, an emoji) is two columns. Where a text is comes from `origin`, which the test says per element.
 */
export interface MonospaceGeometryOptions {
  readonly advance: number;
  readonly lineHeight: number;
  /** The root-local top left of the text of the element with this tag, or undefined for one this geometry does not answer for. */
  readonly origin: (tag: number) => { readonly x: number; readonly y: number } | undefined;
}

interface Piece {
  /** The source offset where the piece starts, and where it ends (an inlay is a point). */
  readonly from: number;
  readonly to: number;
  readonly columns: number;
  readonly inlay: boolean;
}

/** The `side` argument of `getCaretRect` on the wire for "before" (native.ts); anything else is after. */
const SIDE_BEFORE = -1;
const WIDE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\uff00-\uff60\u{1f000}-\u{1faff}]/u;

/** The columns the text of a node takes, as pieces in order: its characters, with its inlays at their offsets. */
function pieces(text: string, spans: readonly NativeSpan[] | undefined): Piece[] {
  const found: Piece[] = [];
  const inlays = (spans ?? []).filter(span => span.inlay !== undefined);
  const inlaysAt = (offset: number): void => {
    for (const span of inlays) if (span.start === offset) found.push({ from: offset, to: offset, columns: span.inlay?.length ?? 0, inlay: true });
  };
  let offset = 0;
  for (const character of text) {
    inlaysAt(offset);
    found.push({ from: offset, to: offset + character.length, columns: WIDE.test(character) ? 2 : 1, inlay: false });
    offset += character.length;
  }
  inlaysAt(offset);
  return found;
}

/** The columns before the position `offset`/`side` (`after` is after the inlays at the offset). */
function columnsBefore(all: readonly Piece[], offset: number, side: 'before' | 'after'): number {
  let columns = 0;
  for (const piece of all) {
    const before = piece.inlay ? piece.from < offset || (piece.from === offset && side === 'after') : piece.to <= offset;
    if (before) columns += piece.columns;
  }
  return columns;
}

export function installMonospaceGeometry(host: RecordingHost, options: MonospaceGeometryOptions): void {
  const { advance, lineHeight } = options;
  host.textGeometry = (method, tag, args) => {
    const origin = options.origin(tag);
    const node = host.nodes.get(tag);
    if (origin === undefined || node === undefined) return null;
    const spans = Array.isArray(node.props.spans) ? (node.props.spans as NativeSpan[]) : undefined;
    const all = pieces(node.text, spans);
    const length = node.text.length;
    const rect = (columns: number, width = 0): LayoutRect => ({ x: origin.x + columns * advance, y: origin.y, width: width * advance, height: lineHeight });
    const [first = 0, second = 0] = args;
    if (method === 'getCaretRect') return rect(columnsBefore(all, first, second === SIDE_BEFORE ? 'before' : 'after'));
    if (method === 'getRangeRects') {
      const start = columnsBefore(all, first, 'after');
      const end = columnsBefore(all, second, 'before');
      return first === second ? { rects: [] } : { rects: [rect(start, end - start)] };
    }
    // getOffsetAtPoint: the nearest of the positions the text has, as columns from its origin.
    const wanted = (first - origin.x) / advance;
    let best = { offset: 0, side: 'after' as 'before' | 'after', distance: Infinity };
    for (let offset = 0; offset <= length; offset += 1) {
      if (all.some(piece => !piece.inlay && piece.from < offset && piece.to > offset)) continue;
      for (const side of ['before', 'after'] as const) {
        const distance = Math.abs(columnsBefore(all, offset, side) - wanted);
        if (distance < best.distance) best = { offset, side, distance };
      }
    }
    return { offset: best.offset, side: best.side };
  };
}
