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

/**
 * A run is as wide as its glyphs are painted, rounded up to a whole pixel: layout makes every box a whole number of pixels, and a box
 * narrower than its glyphs makes the paragraph skip the last one.
 */
function runWidth(segment: Segment, advance: number): number {
  return Math.ceil(segment.text.length * advance);
}

/**
 * Every run is placed at its own column (`left` is the column times the advance) and not after the one before it: in a row, the
 * rounding of each box to whole pixels would add up, and a run twenty columns in stood a pixel and a half off its column. The
 * background of a run is a box of its own, exactly the columns it covers, under the text.
 */
function runStyle(segment: Segment, advance: number) {
  return {
    position: 'absolute' as const,
    left: segment.column * advance,
    top: 0,
    width: runWidth(segment, advance),
    color: segment.color,
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
      className="absolute right-0"
      style={{ left, top: (spec.number - 1) * lineHeight, height: lineHeight, backgroundColor: current ? THEME.currentLine : undefined }}
    >
      {spec.segments.map((segment, index) => (segment.background === undefined ? null : (
        <View
          key={`background-${index}`}
          className="absolute"
          style={{ left: segment.column * advance, top: 0, width: segment.text.length * advance, height: lineHeight, backgroundColor: segment.background }}
        />
      )))}
      {spec.segments.map((segment, index) => (
        <Text key={index} className={CODE_TEXT_CLASS} style={runStyle(segment, advance)}>{segment.text}</Text>
      ))}
      {spec.breakSelected ? (
        <View className="absolute" style={{ left: spec.layout.displayLength * advance, top: 0, width: advance, height: lineHeight, backgroundColor: THEME.selection }} />
      ) : null}
    </View>
  );
});
