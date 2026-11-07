// Proves: Lexical's core, @lexical/headless, @lexical/code-core + @lexical/code-prism (Prism tokenizer) and @lexical/history
// run in Node with the browser globals trapped: build a code block, read highlight tokens, edit, undo/redo, time it on a
// 1,000-line TSX sample. Also probes what Lexical has for selections and inlays.
//
//   node --require ./experiments/code-editor/frameworks/trap-globals.cjs experiments/code-editor/frameworks/lexical/probe-headless.mjs
import { createRequire } from 'node:module';
import {
  $createTextNode, $getRoot, $getSelection, $isRangeSelection, $createRangeSelection, $setSelection, $isTextNode, $isLineBreakNode,
  UNDO_COMMAND, REDO_COMMAND, CONTROLLED_TEXT_INSERTION_COMMAND, $isElementNode, $createLineBreakNode,
} from 'lexical';
import { createHeadlessEditor } from '@lexical/headless';
import { $createCodeNode, $isCodeNode, $isCodeHighlightNode, CodeNode, CodeHighlightNode } from '@lexical/code-core';
import { PrismTokenizer, registerCodeHighlighting } from '@lexical/code-prism';
import { createEmptyHistoryState, registerHistory } from '@lexical/history';

const { sampleText, sampleLines } = createRequire(import.meta.url)('../lib/sample.cjs');
console.log('globals touched while importing:', globalThis.__touchedGlobals());

const errors = [];
const editor = createHeadlessEditor({ namespace: 'probe', nodes: [CodeNode, CodeHighlightNode], onError: (error) => { errors.push(error); } });
try { editor.getRootElement(); } catch (error) { console.log('headless editor: getRootElement() throws:', error.message); }
registerCodeHighlighting(editor, PrismTokenizer);
const history = createEmptyHistoryState();
registerHistory(editor, history, 0);

// 1. a small block first: shape of the tokens
editor.update(() => {
  const code = $createCodeNode('typescript');
  code.append($createTextNode('const x: number = 42; // answer'));
  $getRoot().append(code);
}, { discrete: true });
function dump() {
  return editor.getEditorState().read(() => {
    const out = [];
    for (const block of $getRoot().getChildren()) {
      if (!$isCodeNode(block)) { out.push(`<${block.getType()}>`); continue; }
      for (const child of block.getChildren()) {
        if ($isCodeHighlightNode(child)) out.push(`${JSON.stringify(child.getTextContent())}:${child.getHighlightType() ?? 'none'}`);
        else if ($isLineBreakNode(child)) out.push('\\n');
        else out.push(`<${child.getType()}>`);
      }
    }
    return out;
  });
}
console.log('tokens:', dump().join(' '));
console.log('errors', errors.length, errors.map(String));

// 2. a 1,000-line sample: how long does the whole round trip take, and what is the tree size
const started = performance.now();
editor.update(() => {
  const code = $getRoot().getFirstChild();
  if (!$isCodeNode(code)) throw new Error('expected a code node');
  code.clear();
  sampleLines.forEach((line, index) => {
    if (index > 0) code.append($createLineBreakNode());
    if (line.length > 0) code.append($createTextNode(line));
  });
}, { discrete: true });
const buildMs = performance.now() - started;
const stats = editor.getEditorState().read(() => {
  const code = $getRoot().getFirstChild();
  const kinds = new Map();
  for (const child of code.getChildren()) kinds.set(child.getType(), (kinds.get(child.getType()) ?? 0) + 1);
  return { children: code.getChildrenSize(), kinds: Object.fromEntries(kinds), textLength: $getRoot().getTextContent().length };
});
console.log(`1,000-line sample (${sampleText.length} chars): build + highlight ${buildMs.toFixed(0)} ms, nodes`, stats);

// 3. one keystroke into the big document (the cost of re-highlighting)
function typeAt(lineIndex, text) {
  editor.update(() => {
    const code = $getRoot().getFirstChild();
    const selection = $createRangeSelection();
    // find the Nth line break boundary: walk children
    let line = 0;
    let target = code.getFirstChild();
    while (target && line < lineIndex) { if ($isLineBreakNode(target)) line += 1; target = target.getNextSibling(); }
    if (!$isTextNode(target)) throw new Error('no text node at line');
    selection.anchor.set(target.getKey(), 0, 'text');
    selection.focus.set(target.getKey(), 0, 'text');
    $setSelection(selection);
    editor.dispatchCommand(CONTROLLED_TEXT_INSERTION_COMMAND, text);
  }, { discrete: true });
}
// CONTROLLED_TEXT_INSERTION_COMMAND has no handler without @lexical/plain-text or rich-text: insert directly instead.
const before = editor.getEditorState().read(() => $getRoot().getTextContent());
const t1 = performance.now();
editor.update(() => {
  const selection = $getSelection();
  void selection;
  const code = $getRoot().getFirstChild();
  const first = code.getFirstDescendant();
  if (!$isTextNode(first)) throw new Error('no text');
  first.spliceText(0, 0, '// edited\n', true);
}, { discrete: true });
const typeMs = performance.now() - t1;
const after = editor.getEditorState().read(() => $getRoot().getTextContent());
console.log(`one splice into the 1,000-line block: ${typeMs.toFixed(1)} ms, length ${before.length} -> ${after.length}`);
void typeAt;

// 4. undo / redo through the registered history (commands)
console.log('history stacks: undo', history.undoStack.length, 'redo', history.redoStack.length);
// the history plugin applies the old state with setEditorState, which commits in a microtask (not discrete)
const nextMicrotask = () => new Promise((resolve) => queueMicrotask(resolve));
const stateBeforeAwait = editor.getEditorState().read(() => $getRoot().getTextContent());
editor.dispatchCommand(UNDO_COMMAND, undefined);
console.log('read right after UNDO_COMMAND (before awaiting a microtask) is still the edited text:', stateBeforeAwait === editor.getEditorState().read(() => $getRoot().getTextContent()));
await nextMicrotask();
const afterUndo = editor.getEditorState().read(() => $getRoot().getTextContent());
console.log('after UNDO_COMMAND, text restored:', afterUndo === before, '| stacks undo', history.undoStack.length, 'redo', history.redoStack.length);
editor.dispatchCommand(REDO_COMMAND, undefined);
await nextMicrotask();
console.log('after REDO_COMMAND, text re-applied:', editor.getEditorState().read(() => $getRoot().getTextContent()) === after);

// 5. selection model in headless: a single RangeSelection (anchor/focus point) at a time
editor.update(() => {
  const selection = $createRangeSelection();
  const first = $getRoot().getFirstChild().getFirstDescendant();
  selection.anchor.set(first.getKey(), 0, 'text');
  selection.focus.set(first.getKey(), 5, 'text');
  $setSelection(selection);
}, { discrete: true });
console.log('selection after $setSelection:', editor.getEditorState().read(() => { const s = $getSelection(); return $isRangeSelection(s) ? { text: s.getTextContent(), collapsed: s.isCollapsed() } : String(s); }));
console.log('serialised editor state size:', JSON.stringify(editor.getEditorState().toJSON()).length, 'bytes');
console.log('touched at the end:', globalThis.__touchedGlobals());
