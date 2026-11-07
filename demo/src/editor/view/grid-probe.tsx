import { useLayoutEffect, useRef } from 'react';
import { Text, type UIHandle } from 'godot-react-ui';

/**
 * The classes every piece of code in the editor is set in, so the probe below measures the font the lines are drawn in.
 */
export const CODE_TEXT_CLASS = 'font-mono text-xs leading-5 whitespace-pre';

/** The probe is this many columns wide: the error of a measured advance is a whole pixel over this many columns at worst. */
export const PROBE_COLUMNS = 400;

/** What the probe measured: the width of a column and the height of a line, in logical pixels. */
export interface MeasuredGrid {
  readonly advance: number;
  readonly lineHeight: number;
}

/**
 * An invisible line of `PROBE_COLUMNS` characters in the editor's font, laid out by the same text engine as the code. The
 * monospace advance is the width the engine gave it divided by the columns, and the line height is the height of its one line:
 * measured, not assumed from the font's size. Reports once the layout is there, and again if the size changes.
 */
export function GridProbe({ onMeasured }: { readonly onMeasured: (grid: MeasuredGrid) => void }) {
  const handle = useRef<UIHandle | null>(null);
  useLayoutEffect(() => {
    const rect = handle.current?.getRect();
    if (rect === undefined || rect.width === 0 || rect.height === 0) {
      throw new Error('The editor\'s grid probe has no size: its font did not lay out');
    }
    onMeasured({ advance: rect.width / PROBE_COLUMNS, lineHeight: rect.height });
  });
  return (
    <Text
      ref={handle}
      testID="editor-grid-probe"
      aria-hidden
      className={`${CODE_TEXT_CLASS} absolute left-0 top-0 opacity-0 pointer-events-none`}
    >
      {'0'.repeat(PROBE_COLUMNS)}
    </Text>
  );
}
