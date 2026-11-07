import { memo } from 'react';
import { Text, View } from 'godot-react-ui';
import type { LineSpec, Segment } from '../lines';
import { THEME } from '../theme';
import { CODE_TEXT_CLASS } from './grid-probe';

/**
 * One line of the editor as a row of runs: a `Text` for each segment, as wide as its characters are columns. This is the part of
 * the view that changes when `Text` takes attributed spans: a line then becomes one `Text`, and the segments become its spans,
 * wavy underlines and inlays included (docs/tracks/code-editor-evaluation.md, section 6.2). Until then a run has a solid underline
 * where a span would have a wavy one.
 */

export interface RunLineProps {
  readonly spec: LineSpec;
  /** The width of a column, measured. */
  readonly advance: number;
  readonly lineHeight: number;
  /** The x of the first column: the width of the line number column. */
  readonly left: number;
  /** The caret is on this line and nothing is selected. */
  readonly current: boolean;
}

function runStyle(segment: Segment, advance: number) {
  return {
    width: segment.text.length * advance,
    flexShrink: 0,
    color: segment.color,
    backgroundColor: segment.background,
    ...(segment.underline === undefined ? {} : {
      textDecorationLine: 'underline' as const,
      textDecorationColor: segment.underline.color,
    }),
  };
}

export const RunLine = memo(function RunLine({ spec, advance, lineHeight, left, current }: RunLineProps) {
  return (
    <View
      testID={`code-line-${spec.number}`}
      className="absolute right-0 flex-row"
      style={{ left, top: (spec.number - 1) * lineHeight, height: lineHeight, backgroundColor: current ? THEME.currentLine : undefined }}
    >
      {spec.segments.map((segment, index) => (
        <Text key={index} className={CODE_TEXT_CLASS} style={runStyle(segment, advance)}>{segment.text}</Text>
      ))}
      {spec.breakSelected ? <View style={{ width: advance, height: lineHeight, flexShrink: 0, backgroundColor: THEME.selection }} /> : null}
    </View>
  );
});
