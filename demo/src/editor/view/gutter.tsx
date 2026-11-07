import { memo } from 'react';
import { Text, View } from 'godot-react-ui';
import type { Severity } from '../diagnostics';
import { THEME } from '../theme';
import { CODE_TEXT_CLASS } from './grid-probe';

/** The line numbers at the left of the editor, with a mark on the lines that have a problem. */

export interface GutterCellProps {
  readonly number: number;
  readonly severity: Severity | undefined;
  readonly current: boolean;
  readonly advance: number;
  readonly lineHeight: number;
  readonly width: number;
}

const MARKER_COLUMNS = 0.5;

export const GutterCell = memo(function GutterCell({ number, severity, current, advance, lineHeight, width }: GutterCellProps) {
  const marker = severity === undefined ? undefined : severity === 'error' ? THEME.error : severity === 'warning' ? THEME.warning : undefined;
  return (
    <View
      testID={`code-gutter-${number}`}
      className="absolute left-0 flex-row items-center justify-end"
      style={{ top: (number - 1) * lineHeight, height: lineHeight, width, backgroundColor: current ? THEME.currentLine : undefined }}
    >
      {marker === undefined ? null : (
        <View
          testID={`code-marker-${number}`}
          className="absolute rounded-full"
          style={{ left: advance * MARKER_COLUMNS, top: (lineHeight - advance) / 2, width: advance * MARKER_COLUMNS, height: advance * MARKER_COLUMNS, backgroundColor: marker }}
        />
      )}
      <Text className={`${CODE_TEXT_CLASS} select-none`} style={{ color: current ? THEME.gutterTextCurrent : THEME.gutterText, paddingRight: advance * 1.5 }}>
        {String(number)}
      </Text>
    </View>
  );
});
