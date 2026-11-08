import { Button, Text, View } from 'godot-react-ui';
import type { CheckStatus, RunKind, RunStatus } from '../workspace';
import type { CursorPosition } from '../controller';
import type { HexColor } from '../highlight';

/** The strip under the editor: where the caret is, what became of the last text sent to the page, and what the type check found. */

const RUN_COLORS: Readonly<Record<RunKind, HexColor>> = {
  ready: '#94a3b8', unavailable: '#fcd34d', pending: '#94a3b8', compiling: '#94a3b8', swapped: '#6ee7b7',
  'compile-failed': '#fda4af', 'class-error': '#fda4af', 'evaluation-failed': '#fda4af', 'render-failed': '#fdba74', broken: '#fda4af',
};

export interface StatusBarProps {
  readonly position: CursorPosition;
  readonly selections: number;
  readonly fileName: string;
  readonly run: RunStatus;
  readonly check: CheckStatus;
  readonly problemsOpen: boolean;
  readonly onToggleProblems: () => void;
}

export function checkSummary(check: CheckStatus): string {
  switch (check.kind) {
    case 'idle': return 'Not checked';
    case 'checking': return 'Checking…';
    case 'failed': return `Check failed: ${check.message ?? 'no reason given'}`;
    case 'checked': {
      if (check.errors === 0 && check.warnings === 0) return 'No problems';
      const parts: string[] = [];
      if (check.errors > 0) parts.push(`${check.errors} ${check.errors === 1 ? 'error' : 'errors'}`);
      if (check.warnings > 0) parts.push(`${check.warnings} ${check.warnings === 1 ? 'warning' : 'warnings'}`);
      return parts.join(', ');
    }
  }
}

function checkColor(check: CheckStatus): HexColor {
  if (check.kind === 'failed' || check.errors > 0) return '#fda4af';
  if (check.warnings > 0) return '#fcd34d';
  return check.kind === 'checked' ? '#6ee7b7' : '#94a3b8';
}

export function StatusBar({ position, selections, fileName, run, check, problemsOpen, onToggleProblems }: StatusBarProps) {
  return (
    <View testID="code-status" role="region" aria-label="Editor status" className="flex-row items-center gap-3 border-t border-slate-800 bg-slate-950 px-3 py-1">
      <Text testID="code-status-position" className="shrink-0 font-mono text-xs text-slate-400">
        {`Ln ${position.line}, Col ${position.column}${selections > 1 ? `  ${selections} selections` : ''}`}
      </Text>
      <Text testID="code-status-file" className="shrink-0 text-xs text-slate-500">{fileName}</Text>
      <Text testID="code-status-run" className="min-w-0 flex-1 truncate text-xs" style={{ color: RUN_COLORS[run.kind] }}>{run.message}</Text>
      <Button
        testID="code-status-check"
        aria-label="Problems"
        aria-pressed={problemsOpen}
        className="shrink-0 rounded px-2 hover:bg-slate-800"
        onClick={onToggleProblems}
      >
        <Text className="text-xs" style={{ color: checkColor(check) }}>{checkSummary(check)}</Text>
      </Button>
    </View>
  );
}
