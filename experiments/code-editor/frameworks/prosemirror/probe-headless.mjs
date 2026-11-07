// Proves: prosemirror-model/-transform/-state/-history run in Node with nothing touched, and prosemirror-view's
// DecorationSet/Decoration (inline, widget = inlay) work from state alone: create, find, map through edits, cost at
// ~9,000 token decorations over a 1,000-line document. prosemirror-view's import touches `navigator` and `document` only
// for feature detection (dist/index.js:170-171).
//
//   node --require ./experiments/code-editor/frameworks/trap-globals.cjs experiments/code-editor/frameworks/prosemirror/probe-headless.mjs
import { createRequire } from 'node:module';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { history, undo, redo, undoDepth } from 'prosemirror-history';
import { Decoration, DecorationSet } from 'prosemirror-view';

const { sampleLines } = createRequire(import.meta.url)('../lib/sample.cjs');
console.log('globals touched while importing model/state/history/view:', globalThis.__touchedGlobals());

const schema = new Schema({
  nodes: {
    doc: { content: 'code_line+' },
    code_line: { content: 'text*', code: true },
    text: {},
  },
});
let t = performance.now();
const doc = schema.node('doc', null, sampleLines.map((line) => schema.node('code_line', null, line.length > 0 ? schema.text(line) : undefined)));
console.log(`built a ${sampleLines.length}-line doc in ${(performance.now() - t).toFixed(1)} ms; size (flat positions) ${doc.content.size}, nodeSize ${doc.nodeSize}`);

let state = EditorState.create({ doc, plugins: [history()] });

// 1. positions: flat integers; line N starts after N-1 node boundaries
function lineStart(index) { let pos = 0; for (let i = 0; i < index; i += 1) pos += doc.child(i).nodeSize; return pos + 1; }
console.log('start of line 442 (flat pos):', lineStart(441), '| text there:', JSON.stringify(doc.textBetween(lineStart(441), lineStart(441) + 6)));

// 2. a transaction: insert text, selection mapped; undo/redo through prosemirror-history
const at = lineStart(500) + 4;
let tr = state.tr.insertText('XY', at);
state = state.apply(tr);
console.log('after insertText: line 501 starts', JSON.stringify(state.doc.child(500).textContent.slice(0, 10)), '| undoDepth', undoDepth(state));
undo(state, (undoTr) => { state = state.apply(undoTr); });
console.log('after undo: line 501 starts', JSON.stringify(state.doc.child(500).textContent.slice(0, 10)));
redo(state, (redoTr) => { state = state.apply(redoTr); });
console.log('after redo: line 501 starts', JSON.stringify(state.doc.child(500).textContent.slice(0, 10)));

// 3. decorations built from tokens: one inline decoration per token (here: every word), plus an inlay widget on a line
function tokenDecorations(currentDoc) {
  const decorations = [];
  let pos = 0;
  currentDoc.forEach((line) => {
    const text = line.textContent;
    for (const match of text.matchAll(/[A-Za-z_]\w*|\d+|[^\sA-Za-z_\d]/g)) {
      const from = pos + 1 + match.index;
      decorations.push(Decoration.inline(from, from + match[0].length, { class: /^(const|export|function|return|if|for|import)$/.test(match[0]) ? 'kw' : 'tok' }));
    }
    pos += line.nodeSize;
  });
  return decorations;
}
t = performance.now();
const inline = tokenDecorations(state.doc);
console.log(`tokenDecorations: ${inline.length} inline decorations computed in ${(performance.now() - t).toFixed(0)} ms`);
t = performance.now();
const inlay = Decoration.widget(lineStart(441) + 26, () => ({ label: ': string' }), { side: 1, key: 'inlay-442' });
const underline = Decoration.inline(lineStart(441) + 7, lineStart(441) + 15, { class: 'squiggle', nodeName: 'span' });
let set = DecorationSet.create(state.doc, [...inline, inlay, underline]);
console.log(`DecorationSet.create over ${inline.length + 2} decorations: ${(performance.now() - t).toFixed(0)} ms`);
t = performance.now();
const visible = set.find(lineStart(441), lineStart(441) + 60);
console.log(`find() over line 442: ${visible.length} decorations in ${(performance.now() - t).toFixed(2)} ms ->`, visible.slice(0, 3).map((d) => `${d.from}-${d.to}:${d.type.attrs?.class ?? (d.type.toDOM ? 'widget' : '?')}`).join(' '), '...');
console.log('widget decoration (inlay) from == to (occupies no document position):', visible.filter((d) => d.from === d.to).map((d) => `${d.from}-${d.to}`));

// 4. an edit: map the whole set through the transaction (cost) and check an inlay/underline moved
const edit = state.tr.insertText('>>', lineStart(441));
t = performance.now();
const mapped = set.map(edit.mapping, edit.doc);
console.log(`DecorationSet.map through one 2-char insert: ${(performance.now() - t).toFixed(1)} ms; underline now at`, mapped.find(0, edit.doc.content.size, (spec) => true).filter((d) => d.type.attrs?.class === 'squiggle').map((d) => `${d.from}-${d.to}`), '(was', `${lineStart(441) + 7}-${lineStart(441) + 15})`);
console.log('inlay widget now at', mapped.find(0, edit.doc.content.size, (spec) => spec.key === 'inlay-442').map((d) => `${d.from}-${d.to}`), '(was', `${lineStart(441) + 26})`);
void set; void TextSelection;
console.log('touched at the end:', globalThis.__touchedGlobals());
