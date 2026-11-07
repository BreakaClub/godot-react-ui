// Proves, under plain Node with the DOM globals removed: which tokenisers/models run headless, their output API, and their speed on a
// 1,000+ line TSX file assembled from this repo's demo/src (whole files, so it parses). Timings are the median of 7 runs after 2 warm-ups,
// on this Mac in Node 22, JS only (no GodotJS/V8-embedded measurement).
// Run: node_modules/.bin/tsx experiments/code-editor/overlay/tokenisers-headless.tsx
import { sampleWholeFiles } from './lib/sample';

for (const g of ['document', 'window', 'navigator', 'self', 'MutationObserver', 'ResizeObserver']) Reflect.deleteProperty(globalThis, g);

const source = sampleWholeFiles(1000);
const lineCount = source.split('\n').length;

function median(fn: () => void): string {
  for (let i = 0; i < 2; i += 1) fn();
  const times: number[] = [];
  for (let i = 0; i < 7; i += 1) { const t = performance.now(); fn(); times.push(performance.now() - t); }
  return times.sort((a, b) => a - b)[3].toFixed(1);
}

async function main() {
  console.log(`source: ${lineCount} lines, ${source.length} chars (whole demo/src files)`);

  // prismjs
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Prism = require('prismjs');
  require('prismjs/components/prism-jsx'); require('prismjs/components/prism-typescript'); require('prismjs/components/prism-tsx');
  const prismTokens = Prism.tokenize(source, Prism.languages.tsx) as Array<string | { type: string; content: unknown; alias?: unknown }>;
  console.log(`prismjs 1.30      tokenize(): ${median(() => Prism.tokenize(source, Prism.languages.tsx))} ms; top-level tokens ${prismTokens.length}; output = array of string | Token{type, content (string | nested array), alias}`);
  console.log('   first tokens:', JSON.stringify(prismTokens.slice(0, 4).map((t) => (typeof t === 'string' ? t : { type: t.type, content: typeof t.content === 'string' ? t.content : '[nested]' }))));

  // highlight.js
  const hljs = require('highlight.js');
  const result = hljs.highlight(source, { language: 'typescript' });
  console.log(`highlight.js 11.12 highlight(typescript): ${median(() => hljs.highlight(source, { language: 'typescript' }))} ms; output = HTML string (${result.value.length} chars) with <span class="hljs-*">; tags in JSX recognised: ${/hljs-tag/.test(result.value)}; tsx alias registered: ${hljs.getLanguage('tsx') !== undefined}`);
  // The only structured route is a custom emitter (hljs.configure({__emitter})), undocumented, or lowlight (HAST).
  console.log('   token API: string only (an undocumented __emitter option exists); lowlight is the structured wrapper');

  // prism-code-editor tokenizer (ESM only)
  const pce = await import('prism-code-editor/prism');
  await import('prism-code-editor/prism/languages/tsx');
  const pceTokens = pce.tokenizeText(source, pce.languages.tsx);
  console.log(`prism-code-editor 5.4 tokenizeText(tsx): ${median(() => pce.tokenizeText(source, pce.languages.tsx))} ms; top-level tokens ${pceTokens.length}; output = TokenStream (Token{type, content, length, alias}); DOM-free (prism/ has no document/window)`);

  // Ace headless
  const aceModule = require('ace-builds/src-noconflict/ace.js');
  require('ace-builds/src-noconflict/mode-typescript.js');
  require('ace-builds/src-noconflict/mode-tsx.js');
  const ace = (globalThis as { ace?: typeof aceModule }).ace ?? aceModule;
  try {
    const { EditSession } = ace.require('ace/edit_session');
    const { Document } = ace.require('ace/document');
    const { UndoManager } = ace.require('ace/undomanager');
    const { Mode } = ace.require('ace/mode/typescript');
    const session = new EditSession(new Document(source), new Mode());
    session.setUndoManager(new UndoManager());
    const tokenizeAll = () => { const s = new EditSession(new Document(source), new Mode()); for (let row = 0; row < s.getLength(); row += 1) s.getTokens(row); };
    console.log(`ace-builds 1.45 EditSession+Document+UndoManager+typescript Mode construct OK headless (rows ${session.getLength()}); tokenise all rows via getTokens: ${median(tokenizeAll)} ms`);
    const row0 = session.getTokens(0);
    console.log('   output = per-row [{type: "keyword.operator", value}] e.g.', JSON.stringify(row0.slice(0, 3)));
    session.insert({ row: 0, column: 0 }, 'x');
    session.getUndoManager().undo(session);
    console.log('   insert + undo through the model: OK, row 0 starts', JSON.stringify(session.getLine(0).slice(0, 12)));
    // Does the worker (type checking/lint) path need DOM? Not exercised.
    console.log('   Editor / VirtualRenderer: requires a DOM container; constructing it headless:');
    try { ace.edit(null as never); } catch (error) { console.log('     ace.edit(null) threw:', (error as Error).message.split('\n')[0]); }
  } catch (error) {
    console.log('ace headless THREW:', (error as Error).message.split('\n')[0]);
  }
}
main();
