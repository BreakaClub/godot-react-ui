// Proves: Ace's EditSession + Document + UndoManager + Tokenizer (mode-typescript) work in Node with no DOM. Reports tokens,
// markers (background highlights), undo, multiple selections (Selection.rangeList is editor-bound: see the report), speed on 1,000 lines.
//
//   node --require ./experiments/code-editor/frameworks/trap-globals.cjs experiments/code-editor/frameworks/survey/probe-ace-session.cjs
const path = require('node:path');
const ace = require('ace-builds/src-noconflict/ace.js');
require('ace-builds/src-noconflict/mode-typescript.js');
const { sampleText, sampleLines } = require('../lib/sample.cjs');
console.log('globals touched while loading ace + mode-typescript:', globalThis.__touchedGlobals());

const { EditSession } = ace.require('ace/edit_session');
const { UndoManager } = ace.require('ace/undomanager');
const { Range } = ace.require('ace/range');
let t = performance.now();
const session = new EditSession(sampleText, 'ace/mode/typescript');
session.setUndoManager(new UndoManager());
console.log(`EditSession over ${sampleLines.length} lines created in ${(performance.now() - t).toFixed(1)} ms (tokenizer is lazy)`);
t = performance.now();
let tokenCount = 0;
for (let row = 0; row < session.getLength(); row += 1) tokenCount += session.getTokens(row).length;
console.log(`tokenised all rows: ${tokenCount} tokens in ${(performance.now() - t).toFixed(0)} ms`);
const row = sampleLines.findIndex((line) => line.includes('export function'));
console.log('row', row, JSON.stringify(session.getTokens(row).slice(0, 5)));

session.insert({ row: 500, column: 4 }, 'XY');
console.log('after insert, line 501:', JSON.stringify(session.getLine(500).slice(0, 10)), '| undo stack', session.getUndoManager().$undoStack.length);
const markerId = session.addMarker(new Range(441, 0, 441, 6), 'hl-keyword', 'text', false);
console.log('marker (background highlight) added, id', markerId, 'ranges', JSON.stringify(Object.values(session.getMarkers(false)).map((m) => `${m.clazz}:${m.range.start.column}-${m.range.end.column}`)));
session.insert({ row: 441, column: 0 }, '>>');
console.log('marker columns after inserting 2 chars at column 0 of its line (observed: addMarker ranges do not move):', JSON.stringify(Object.values(session.getMarkers(false)).map((m) => `${m.range.start.column}-${m.range.end.column}`)));
session.getUndoManager().undo(session);
console.log('after undo: line 442 starts', JSON.stringify(session.getLine(441).slice(0, 8)));
console.log('touched at the end:', globalThis.__touchedGlobals());
