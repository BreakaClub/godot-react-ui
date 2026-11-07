import { useState, useSyncExternalStore } from 'react';
import { EditorSelection } from '@codemirror/state';
import { Button, Text, View } from 'godot-react-ui';
import type { Lab } from './labs';
import type { LabCode } from './editor/lab-code';
import { EditorView } from './editor/view/editor-view';
import { ProblemsList, type ProblemRow } from './editor/view/problems';
import { StatusBar } from './editor/view/status-bar';
import { THEME } from './editor/theme';
import type { EditorDiagnostic } from './editor/diagnostics';

/**
 * The code panel of the navigator: tabs for the lab's files, the editor of the one that is open, the problems the type check
 * found and a status bar. The text, the live session behind it and everything asynchronous are in `editor/` (workspace.ts,
 * controller.ts); this lays them out. The lab on the stage is the live session's, so an edit made here is on the page when
 * the workspace has sent it (`editor/workspace.ts`).
 */

export interface CodeEditorProps {
  readonly lab: Lab;
  readonly code: LabCode;
}

const TAB_BASE = 'flex-row items-center gap-1 rounded-t px-3 py-1';

export function CodeEditor({ lab, code }: CodeEditorProps) {
  const { workspace } = code;
  useSyncExternalStore(workspace.subscribe, () => workspace.revision);
  const [problemsOpen, setProblemsOpen] = useState(false);
  const file = workspace.active;
  const { controller } = file;
  const position = controller.position();
  const rows: ProblemRow[] = workspace.problems().map(diagnostic => {
    const line = controller.model.doc.lineAt(diagnostic.from);
    return { diagnostic, line: line.number, column: diagnostic.from - line.from + 1 };
  });
  const jump = (diagnostic: EditorDiagnostic): void => {
    controller.setSelection(EditorSelection.single(diagnostic.from));
  };

  return (
    <View testID="code-editor" role="region" aria-label={`Code of ${lab.title}`} className="min-h-0 min-w-0 flex-1" style={{ backgroundColor: THEME.background }}>
      <View className="flex-row items-end justify-between gap-2 border-b border-slate-800 bg-slate-950 px-2 pt-1">
        <View className="min-w-0 shrink flex-row gap-1">
          {workspace.files.map(candidate => {
            const active = candidate === file;
            const modified = candidate.controller.model.text !== candidate.original;
            return (
              <Button
                key={candidate.path}
                testID={`code-tab-${candidate.name}`}
                role="tab"
                aria-selected={active}
                className={`${TAB_BASE} ${active ? 'border-t-2 border-indigo-500 bg-slate-900' : 'hover:bg-slate-900'}`}
                onClick={() => workspace.setActive(candidate.path)}
              >
                <Text className={`font-mono text-xs ${active ? 'text-slate-100' : 'text-slate-400'}`}>{candidate.name}</Text>
                {modified ? <View testID={`code-modified-${candidate.name}`} className="h-1.5 w-1.5 rounded-full bg-amber-300" /> : null}
              </Button>
            );
          })}
        </View>
        {code.kind === 'live' ? (
          <Button testID="code-reset" aria-label="Reset the code to the source" className="mb-1 shrink-0 rounded px-2 py-0.5 hover:bg-slate-800" onClick={() => workspace.reset()}>
            <Text className="text-xs text-slate-300">Reset</Text>
          </Button>
        ) : null}
      </View>
      {code.kind === 'read-only' ? (
        <Text testID="code-read-only" className="border-b border-amber-900 bg-amber-950 px-3 py-1 text-xs text-amber-200">
          {`Read-only. ${code.reason}`}
        </Text>
      ) : null}
      <EditorView key={file.path} workspace={workspace} file={file} />
      {problemsOpen ? <ProblemsList rows={rows} onJump={jump} /> : null}
      <StatusBar
        position={position}
        selections={controller.model.state.selection.ranges.length}
        fileName={file.name}
        run={workspace.run}
        check={workspace.check}
        problemsOpen={problemsOpen}
        onToggleProblems={() => setProblemsOpen(open => !open)}
      />
    </View>
  );
}
