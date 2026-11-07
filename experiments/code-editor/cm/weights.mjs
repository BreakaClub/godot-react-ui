// What each layer weighs once bundled and minified (esbuild, tree-shaken, ESM -> one file), and gzipped. Run from the worktree root:
//   node experiments/code-editor/cm/weights.mjs
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';

const here = import.meta.dirname;
const ENTRIES = {
  'state only (document, changes, selection, transactions, RangeSet)': "export { EditorState, ChangeSet, EditorSelection, RangeSet, Text, StateField, StateEffect } from '@codemirror/state';",
  'lezer parser (javascript + highlight + common)': "export { parser } from '@lezer/javascript'; export { highlightTree, classHighlighter } from '@lezer/highlight';",
  'language + lang-javascript (parse state, indent, brackets, fold, ensureSyntaxTree)': "export { ensureSyntaxTree, syntaxTree, matchBrackets, foldable, getIndentation } from '@codemirror/language'; export { javascript } from '@codemirror/lang-javascript';",
  'history + the state commands (what runs without a view)': "export { history, undo, redo, insertNewlineAndIndent, indentMore, indentLess, toggleComment, deleteCharBackward, moveLineUp, copyLineDown, selectLine, selectAll, cursorCharRight, cursorLineDown, deleteLine } from '@codemirror/commands';",
  'lint state (setDiagnostics, forEachDiagnostic)': "export { setDiagnostics, forEachDiagnostic, diagnosticCount } from '@codemirror/lint';",
  'autocomplete (CompletionContext, completeFromList)': "export { CompletionContext, completeFromList } from '@codemirror/autocomplete';",
  'search (SearchCursor)': "export { SearchCursor } from '@codemirror/search';",
  'whole headless route, together': "export { EditorState, ChangeSet, EditorSelection, RangeSet } from '@codemirror/state'; export { ensureSyntaxTree, matchBrackets, foldable, getIndentation } from '@codemirror/language'; export { javascript } from '@codemirror/lang-javascript'; export { highlightTree, classHighlighter } from '@lezer/highlight'; export { history, undo, redo, insertNewlineAndIndent, indentMore, indentLess, toggleComment, deleteCharBackward, moveLineUp, copyLineDown, cursorCharRight, cursorLineDown, deleteLine } from '@codemirror/commands'; export { setDiagnostics, forEachDiagnostic } from '@codemirror/lint';",
  'for reference: @codemirror/view alone (the DOM layer)': "export { EditorView, Decoration, ViewPlugin } from '@codemirror/view';",
};
for (const [label, contents] of Object.entries(ENTRIES)) {
  const result = await build({
    stdin: { contents, resolveDir: here, loader: 'js' }, bundle: true, minify: true, write: false, format: 'esm', platform: 'neutral',
    mainFields: ['module', 'main'], conditions: ['import', 'module', 'default'], nodePaths: [resolve(here, 'node_modules')], logLevel: 'error',
  });
  const bytes = result.outputFiles[0].contents;
  console.log(`${String(bytes.length).padStart(8)} min  ${String(gzipSync(bytes).length).padStart(7)} gzip  ${label}`);
}
