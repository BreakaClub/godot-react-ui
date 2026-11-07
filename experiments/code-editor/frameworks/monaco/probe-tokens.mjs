// Proves: Monaco's Monarch tokenizer (the TypeScript grammar from languages/definitions) tokenizes in Node with no DOM,
// outside any editor: scope names per token, line states carried forward. Reports the speed on a 1,000-line TSX sample.
//
//   node --require ./experiments/code-editor/frameworks/trap-globals.cjs experiments/code-editor/frameworks/monaco/probe-tokens.mjs
import { createRequire } from 'node:module';
import { compile } from 'monaco-editor/editor/standalone/common/monarch/monarchCompile.js';
import { MonarchTokenizer } from 'monaco-editor/editor/standalone/common/monarch/monarchLexer.js';
import { readFileSync } from 'node:fs';
import { LanguageService } from 'monaco-editor/editor/common/services/languageService.js';
import { Event } from 'monaco-editor/base/common/event.js';
import { ModesRegistry } from 'monaco-editor/editor/common/languages/modesRegistry.js';
import { IndentAction } from 'monaco-editor/editor/common/languages/languageConfiguration.js';

const require = createRequire(import.meta.url);
const { sampleLines } = require('../lib/sample.cjs');

// The grammar module imports `editor.api.js` (the whole DOM editor API) only for a type annotation; the data after it is
// plain JSON-like. Import it as a data: URL with that one import line removed (what a bundler's tree shaking does).
const grammarPath = require.resolve('monaco-editor/languages/definitions/typescript/typescript.js');
globalThis.languages = { IndentAction }; // the one runtime use of the removed import: `languages.IndentAction.*` in the grammar's `conf`
const grammarSource = readFileSync(grammarPath, 'utf8').replace(/^import \{ languages \} from .*$/m, '');
const { language } = await import(`data:text/javascript;base64,${Buffer.from(grammarSource).toString('base64')}`);
console.log('globals touched while importing:', globalThis.__touchedGlobals());

ModesRegistry.registerLanguage({ id: 'typescript', extensions: ['.ts', '.tsx'] });
const languageService = new LanguageService(false);
const configurationService = { _serviceBrand: undefined, getValue: () => undefined, onDidChangeConfiguration: Event.None };
// MonarchTokenizer only asks the theme service for colours when producing ENCODED tokens (tokenizeEncoded);
// the scope-name `tokenize` below never calls it.
const themeService = { _serviceBrand: undefined };
const lexer = compile('typescript', language);
const tokenizer = new MonarchTokenizer(languageService, themeService, 'typescript', lexer, configurationService);

function run() {
  let state = tokenizer.getInitialState();
  let tokenCount = 0;
  const perLine = [];
  for (const line of sampleLines) {
    const result = tokenizer.tokenize(line, true, state);
    tokenCount += result.tokens.length;
    perLine.push(result.tokens);
    state = result.endState;
  }
  return { tokenCount, perLine };
}
const warm = run();
const started = performance.now();
const runs = 5;
for (let i = 0; i < runs; i += 1) run();
const ms = (performance.now() - started) / runs;
console.log(`${sampleLines.length} lines, ${warm.tokenCount} tokens, ${ms.toFixed(1)} ms per full pass (mean of ${runs} after a warm-up)`);
const sampleLine = sampleLines.findIndex((line) => line.includes('export function'));
console.log('line', sampleLine + 1, JSON.stringify(sampleLines[sampleLine]));
console.log('tokens (startIndex, scopes):', JSON.stringify(warm.perLine[sampleLine]));
console.log('touched at the end:', globalThis.__touchedGlobals());
