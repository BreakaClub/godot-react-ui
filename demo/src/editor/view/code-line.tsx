import { memo } from 'react';
import { Text, type UIHandle } from 'godot-react-ui';
import { PLAIN_TEXT_COLOR } from '../highlight';
import type { LineSpec, Segment } from '../lines';
import { THEME } from '../theme';
import { CODE_TEXT_CLASS } from './grid-probe';

/**
 * One line of the editor: one `Text` that holds the line's text, with a nested `Text` for each segment of it, so a line is one native
 * node however it is coloured. The line's own text is the document's: a hint, the preedit of a composition and
 * the selected line break are `inlay` spans, which the text shows and does not count, so the offsets of a caret, a press and a range are
 * the document's own. A selection, a bracket match and a diagnostic are a background and a decoration on the span they cover, drawn by
 * the paragraph itself, which puts them where its glyphs are. Only what is not in the line's own colour is a span: the rest is the line's text,
 * which keeps what a keystroke sends (the text and every span of the line) small.
 */

export interface CodeLineProps {
  readonly spec: LineSpec;
  readonly lineHeight: number;
  /** The x of the first column: the width of the line number column. */
  readonly left: number;
  /** The caret is on this line and nothing is selected. */
  readonly current: boolean;
  /** The line's `Text`, or null once it is gone: the editor asks it where its text is when the line is not on the grid. */
  readonly onHandle: (line: number, handle: UIHandle | null) => void;
}

/** Text in the line's own colour with nothing behind or under it needs no span: it is the line's text. */
function isPlain(segment: Segment): boolean {
  return segment.kind === 'text' && segment.color === PLAIN_TEXT_COLOR && segment.background === undefined && segment.underline === undefined;
}

/** The style of a segment's span: the longhands a nested `Text` may set (`SPAN_STYLE_KEYS`). */
function spanStyle(segment: Segment) {
  return {
    color: segment.color,
    ...(segment.background === undefined ? {} : { backgroundColor: segment.background }),
    ...(segment.underline === undefined ? {} : {
      textDecorationLine: 'underline' as const,
      textDecorationStyle: segment.underline.style,
      textDecorationColor: segment.underline.color,
    }),
  };
}

export const CodeLine = memo(function CodeLine({ spec, lineHeight, left, current, onHandle }: CodeLineProps) {
  return (
    <Text
      ref={handle => { onHandle(spec.number, handle); }}
      testID={`code-line-${spec.number}`}
      className={`${CODE_TEXT_CLASS} absolute right-0`}
      style={{ left, top: (spec.number - 1) * lineHeight, height: lineHeight, color: PLAIN_TEXT_COLOR, backgroundColor: current ? THEME.currentLine : undefined }}
    >
      {spec.segments.map((segment, index) => (isPlain(segment) ? segment.text : (
        <Text key={index} inlay={segment.kind !== 'text'} style={spanStyle(segment)}>{segment.text}</Text>
      )))}
    </Text>
  );
});
