// Proves (or not): @kroy665/code-editor-engine 1.2.3 ("headless code editor engine for any platform") imports with nothing touched
// and can open a document, edit, undo and tokenize in Node. One young single-author package: read its code before trusting it.
//
//   node --require ./experiments/code-editor/frameworks/trap-globals.cjs experiments/code-editor/frameworks/survey/probe-kroy665.cjs
const { createEditor, position } = require('@kroy665/code-editor-engine');
const { sampleText } = require('../lib/sample.cjs');
(async () => {
  console.log('globals touched while importing:', globalThis.__touchedGlobals());
  const { editor } = createEditor({ languages: ['typescript'] });
  let t = performance.now();
  await editor.openDocument('file:///sample.tsx', sampleText, 'typescript');
  console.log(`openDocument (1,000 lines): ${(performance.now() - t).toFixed(1)} ms; lines`, editor.document?.lineCount);
  t = performance.now();
  await editor.insertText('XY', position(500, 4));
  console.log(`insertText: ${(performance.now() - t).toFixed(2)} ms; line 501 starts`, JSON.stringify(editor.document?.getLineContent(500).slice(0, 10)), '| canUndo', editor.canUndo());
  await editor.undo();
  console.log('after undo: line 501 starts', JSON.stringify(editor.document?.getLineContent(500).slice(0, 10)));
  const service = editor.getLanguageService('typescript');
  console.log('language service:', service ? Object.keys(service).concat(Object.getOwnPropertyNames(Object.getPrototypeOf(service))).filter((k) => !k.startsWith('_')).slice(0, 12).join(',') : service);
  console.log('touched at the end:', globalThis.__touchedGlobals());
})().catch((error) => { console.error('probe failed:', error); process.exitCode = 1; });
