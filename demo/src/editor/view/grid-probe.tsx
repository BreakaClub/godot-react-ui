import { useLayoutEffect, useRef } from 'react';
import { Text, type UIHandle } from 'godot-react-ui';

/** The classes every piece of code in the editor is set in, so the probe below measures the font the lines are drawn in. */
export const CODE_TEXT_CLASS = 'font-mono text-xs leading-4 whitespace-pre';

/** The probe is this many columns wide: the line is longer than any the editor is likely to show, so no column is past what was measured. */
export const PROBE_COLUMNS = 400;

/** What the probe measured: the width of a column and the height of a line, in logical pixels. */
export interface MeasuredGrid {
  readonly advance: number;
  readonly lineHeight: number;
}

/**
 * An invisible line of `PROBE_COLUMNS` characters in the editor's font, laid out by the same text engine as the code. The monospace
 * advance is the distance the text says between a caret at its start and one at its end, over the columns: what the paragraph's
 * glyphs are laid out at, not the width of a box (which layout rounds to whole pixels), so it is exact to a column however far along
 * the line. The line height is the height of its one line: measured, not assumed from the font's size. Reports once the layout is
 * there, and again if the size changes.
 */
export function GridProbe({ onMeasured }: { readonly onMeasured: (grid: MeasuredGrid) => void }) {
  const handle = useRef<UIHandle | null>(null);
  const measuredBox = useRef<{ readonly width: number; readonly height: number } | undefined>(undefined);
  useLayoutEffect(() => {
    const probe = handle.current;
    const box = probe?.getRect();
    if (probe === null || box === undefined || box.width === 0 || box.height === 0) {
      throw new Error('The editor\'s grid probe has no size: its font did not lay out');
    }
    // The carets are asked for when the probe's box is not what they were last asked in: a keystroke renders the editor again and the font is the same.
    if (measuredBox.current?.width === box.width && measuredBox.current.height === box.height) return;
    const start = probe.getCaretRect(0);
    const end = probe.getCaretRect(PROBE_COLUMNS);
    if (start === undefined || end === undefined || end.x <= start.x) throw new Error('The editor\'s grid probe has no carets: its font did not lay out');
    measuredBox.current = { width: box.width, height: box.height };
    onMeasured({ advance: (end.x - start.x) / PROBE_COLUMNS, lineHeight: box.height });
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
