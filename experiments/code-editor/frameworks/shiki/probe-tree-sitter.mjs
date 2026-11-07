// Proves: web-tree-sitter (WebAssembly) runs in Node with the browser globals trapped, parses the 1,000-line TSX sample with
// tree-sitter-typescript's tsx grammar, and reports sizes and incremental-edit cost. Wasm sizes are read from disk.
//
//   node --require ./experiments/code-editor/frameworks/trap-globals.cjs experiments/code-editor/frameworks/shiki/probe-tree-sitter.mjs
import { createRequire } from 'node:module';
import { statSync } from 'node:fs';
import { Parser, Language } from 'web-tree-sitter';

const require = createRequire(import.meta.url);
const { sampleText } = require('../lib/sample.cjs');
const runtimeWasm = require.resolve('web-tree-sitter/web-tree-sitter.wasm');
const tsxWasm = require.resolve('tree-sitter-typescript/tree-sitter-tsx.wasm');
console.log(`wasm sizes: runtime ${(statSync(runtimeWasm).size / 1024).toFixed(0)} KiB, tsx grammar ${(statSync(tsxWasm).size / 1024).toFixed(0)} KiB`);

let t = performance.now();
await Parser.init({ locateFile: () => runtimeWasm });
const language = await Language.load(tsxWasm);
const parser = new Parser();
parser.setLanguage(language);
console.log(`Parser.init + Language.load: ${(performance.now() - t).toFixed(0)} ms`);

t = performance.now();
let tree = parser.parse(sampleText);
console.log(`full parse of the 1,000-line TSX: ${(performance.now() - t).toFixed(1)} ms; root ${tree.rootNode.type}, ${tree.rootNode.descendantCount} nodes, hasError ${tree.rootNode.hasError}`);

// incremental: insert 2 chars on line 501 and re-parse with the old tree
const offset = sampleText.split('\n').slice(0, 500).join('\n').length + 1 + 4;
const edited = sampleText.slice(0, offset) + 'XY' + sampleText.slice(offset);
tree.edit({ startIndex: offset, oldEndIndex: offset, newEndIndex: offset + 2, startPosition: { row: 500, column: 4 }, oldEndPosition: { row: 500, column: 4 }, newEndPosition: { row: 500, column: 6 } });
t = performance.now();
const next = parser.parse(edited, tree);
console.log(`incremental re-parse after a 2-char edit: ${(performance.now() - t).toFixed(1)} ms; changed ranges`, next.getChangedRanges(tree).length);

// highlight-ish query: node types on line 442 (what a highlighter would walk)
const line = tree.rootNode.descendantForPosition({ row: 441, column: 0 });
console.log('node at 442:0 ->', line?.type, JSON.stringify(line?.text));
console.log('touched at the end:', globalThis.__touchedGlobals());
