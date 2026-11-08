import { Button, ScrollView, Text, View } from 'godot-react-ui';
import type { EditorDiagnostic } from '../diagnostics';

/** The errors and warnings of the file as a list; pressing one puts the caret on it. */

export interface ProblemRow {
  readonly diagnostic: EditorDiagnostic;
  readonly line: number;
  readonly column: number;
}

export interface ProblemsListProps {
  readonly rows: readonly ProblemRow[];
  readonly onJump: (diagnostic: EditorDiagnostic) => void;
}

export function ProblemsList({ rows, onJump }: ProblemsListProps) {
  return (
    <ScrollView testID="code-problems" className="max-h-32 border-t border-slate-800 bg-slate-900" focusable={false}>
      {rows.length === 0 ? <Text className="px-3 py-1 text-xs text-slate-500">No problems in this file.</Text> : rows.map((row, index) => (
        <Button
          key={`${row.diagnostic.from}-${row.diagnostic.message}-${index}`}
          testID={`code-problem-${index}`}
          className="flex-row items-start justify-start text-left gap-2 px-3 py-0.5 hover:bg-slate-800"
          onClick={() => onJump(row.diagnostic)}
        >
          <View className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.diagnostic.severity === 'error' ? '#f87171' : '#fbbf24' }} />
          <Text className="shrink-0 font-mono text-xs text-slate-500">{`${row.line}:${row.column}`}</Text>
          <Text className="min-w-0 shrink text-xs text-slate-200">
            {row.diagnostic.code === undefined ? row.diagnostic.message : `${row.diagnostic.message} (TS${row.diagnostic.code})`}
          </Text>
        </Button>
      ))}
    </ScrollView>
  );
}
