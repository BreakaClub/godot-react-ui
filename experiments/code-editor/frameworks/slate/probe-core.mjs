// Proves: slate core + slate-history run in Node with no DOM at all (nothing touched at load): document tree, operations,
// transforms, normalization, undo, ranges, Text.decorations (the leaf-splitting that slate-react's `decorate` feeds),
// inline void nodes (inlay-like). Times a 1,000-line document. Then records what slate-react needs.
//
//   node --require ./experiments/code-editor/frameworks/trap-globals.cjs experiments/code-editor/frameworks/slate/probe-core.mjs
import { createRequire } from 'node:module';
import { createEditor, Editor, Transforms, Node, Text, Range, Point, Path } from 'slate';
import { withHistory } from 'slate-history';

const { sampleLines } = createRequire(import.meta.url)('../lib/sample.cjs');
console.log('globals touched while importing slate + slate-history:', globalThis.__touchedGlobals());

const makeDocument = () => sampleLines.map((line) => ({ type: 'code-line', children: [{ text: line }] }));
const editor = withHistory(createEditor());
// slate has no inline-void unless the editor says so: this is the whole "inlay" mechanism
const { isInline, isVoid } = editor;
editor.isInline = (element) => element.type === 'inlay' || isInline(element);
editor.isVoid = (element) => element.type === 'inlay' || isVoid(element);

let t = performance.now();
editor.children = makeDocument();
Editor.normalize(editor, { force: true });
console.log(`1,000 lines: set + force-normalize ${(performance.now() - t).toFixed(0)} ms; top-level blocks`, editor.children.length, 'string length', Node.string(editor).length);

// 1. one keystroke in the middle (insertText at a point), the operation log and the cost
const point = { path: [500, 0], offset: 4 };
Transforms.select(editor, point);
editor.operations.length = 0;
t = performance.now();
Transforms.insertText(editor, 'XY');
console.log(`insertText 'XY' at line 501: ${(performance.now() - t).toFixed(2)} ms; operations:`, JSON.stringify(editor.operations));
console.log('selection after:', JSON.stringify(editor.selection));

// 2. split line (Enter) and join, then undo them all
Transforms.splitNodes(editor, { always: true });
console.log('after Enter: blocks', editor.children.length, '| selection', JSON.stringify(editor.selection));
console.log('history: undos', editor.history.undos.length, 'redos', editor.history.redos.length);
editor.undo();
console.log('after undo: blocks', editor.children.length, 'line 501 begins', JSON.stringify(Node.string(editor.children[500]).slice(0, 12)));
editor.undo();
console.log('after 2nd undo: line 501 begins', JSON.stringify(Node.string(editor.children[500]).slice(0, 12)), '| original', JSON.stringify(sampleLines[500].slice(0, 12)));
editor.redo();
console.log('after redo: line 501 begins', JSON.stringify(Node.string(editor.children[500]).slice(0, 12)));

// 3. decorations: slate core's Text.decorations splits one text node into leaves for ranges that slate-react's `decorate` yields
const textNode = editor.children[441].children[0];
const rangesOnLine = [
  { anchor: { path: [441, 0], offset: 0 }, focus: { path: [441, 0], offset: 6 }, token: 'keyword' },
  { anchor: { path: [441, 0], offset: 7 }, focus: { path: [441, 0], offset: 15 }, token: 'keyword', underline: true },
  { anchor: { path: [441, 0], offset: 16 }, focus: { path: [441, 0], offset: 26 }, bg: 'highlight' },
];
const leaves = Text.decorations(textNode, rangesOnLine).map((leaf) => ({ text: leaf.text, ...Object.fromEntries(Object.entries(leaf).filter(([k]) => k !== 'text')) }));
console.log('Text.decorations leaves for line 442:', JSON.stringify(leaves.slice(0, 5)));

// 4. an inlay: an inline void element with an empty text; the document string does not contain it
Transforms.insertNodes(editor, { type: 'inlay', label: ': string', children: [{ text: '' }] }, { at: { path: [441, 0], offset: 26 } });
const line = editor.children[441];
console.log('line 442 children after inserting an inlay:', JSON.stringify(line.children.map((c) => (c.type ? `<${c.type}>` : c.text.length + ' chars'))));
console.log('Node.string(line 442) unchanged by the inlay:', Node.string(line) === sampleLines[441]);

// 5. selections: one at a time
console.log('selection model: editor.selection is a single Range|null ->', JSON.stringify(editor.selection), '| Range.isRange', Range.isRange(editor.selection));
// 6. offsets: slate has no flat offset; a Point is (path, offset). Convert by walking.
function flatOffset(p) { let n = 0; for (let i = 0; i < p.path[0]; i += 1) n += Node.string(editor.children[i]).length + 1; return n + p.offset; }
console.log('flat offset of line 3 col 5 =', flatOffset({ path: [2, 0], offset: 5 }), '(computed by walking blocks; slate offers none)');
void Point; void Path;

// 7. a burst of 1,000 single-char inserts, one per line
t = performance.now();
for (let i = 0; i < 1000; i += 1) Transforms.insertText(editor, 'z', { at: { path: [i, 0], offset: 0 } });
console.log(`1,000 insertText calls, one per line: ${(performance.now() - t).toFixed(0)} ms (undo stack ${editor.history.undos.length} batches)`);
console.log('touched at the end:', globalThis.__touchedGlobals());
