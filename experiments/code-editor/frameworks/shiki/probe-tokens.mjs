// Proves: shiki as a pure tokeniser in Node with the browser globals trapped: JavaScript regex engine (no wasm), token
// shape (colour, fontStyle, offsets), speed on a 1,000-line TSX sample, incremental use (re-tokenise from a line's grammar state).
//
//   node --require ./experiments/code-editor/frameworks/trap-globals.cjs experiments/code-editor/frameworks/shiki/probe-tokens.mjs
import { createRequire } from 'node:module';
import { createHighlighter } from 'shiki';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

const { sampleText, sampleLines } = createRequire(import.meta.url)('../lib/sample.cjs');
console.log('globals touched while importing shiki:', globalThis.__touchedGlobals());

let t = performance.now();
const highlighter = await createHighlighter({ themes: ['github-dark'], langs: ['tsx'], engine: createJavaScriptRegexEngine() });
console.log(`createHighlighter(tsx, github-dark, JS regex engine): ${(performance.now() - t).toFixed(0)} ms`);

t = performance.now();
const first = highlighter.codeToTokens(sampleText, { lang: 'tsx', theme: 'github-dark' });
console.log(`first codeToTokens of ${sampleLines.length} lines (cold regex compilation): ${(performance.now() - t).toFixed(0)} ms`);
const runs = 3;
t = performance.now();
for (let i = 0; i < runs; i += 1) highlighter.codeToTokens(sampleText, { lang: 'tsx', theme: 'github-dark' });
console.log(`warm codeToTokens of the whole 1,000-line file: ${((performance.now() - t) / runs).toFixed(0)} ms (mean of ${runs})`);

const count = first.tokens.reduce((n, line) => n + line.length, 0);
console.log('lines', first.tokens.length, 'tokens', count, '| result keys', Object.keys(first).join(','), '| fg', first.fg, 'bg', first.bg);
const sampleIndex = sampleLines.findIndex((line) => line.includes('export function'));
console.log('line', sampleIndex + 1, JSON.stringify(first.tokens[sampleIndex]?.slice(0, 4)));

// incremental: tokenize one changed line given the previous line's grammar state
const withStates = highlighter.codeToTokens(sampleText, { lang: 'tsx', theme: 'github-dark', includeExplanation: false });
t = performance.now();
const one = highlighter.codeToTokens(sampleLines[sampleIndex], { lang: 'tsx', theme: 'github-dark', grammarState: highlighter.getLastGrammarState(sampleLines.slice(0, sampleIndex).join('\n'), { lang: 'tsx', theme: 'github-dark' }) });
console.log(`one line re-tokenised from the previous line's grammar state (incl. computing that state from lines 1..${sampleIndex}): ${(performance.now() - t).toFixed(1)} ms; tokens`, one.tokens[0]?.length);
void withStates;
console.log('touched at the end:', globalThis.__touchedGlobals());
