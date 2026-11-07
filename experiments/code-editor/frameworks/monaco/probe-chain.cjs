// Reads (never runs) monaco-editor's ESM sources: the transitive static-import closure of a module, its size, and every
// file in it under a /browser/ directory (monaco's DOM layer). Also the size of the prebuilt bundle an app would ship.
//
//   node experiments/code-editor/frameworks/monaco/probe-chain.cjs
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, 'node_modules', 'monaco-editor');
const esm = path.join(root, 'esm');

function closure(entry) {
  const seen = new Set();
  const stack = [entry];
  while (stack.length > 0) {
    const file = stack.pop();
    if (seen.has(file) || !fs.existsSync(file)) continue;
    seen.add(file);
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/^\s*(?:import|export)\s[^'"\n]*?from\s+['"]([^'"]+)['"]|^\s*import\s+['"]([^'"]+)['"]/gm)) {
      const specifier = match[1] ?? match[2];
      if (specifier.startsWith('.')) stack.push(path.resolve(path.dirname(file), specifier));
    }
  }
  return seen;
}
function report(label, entry) {
  const files = closure(path.join(esm, entry));
  let bytes = 0;
  const dom = [];
  const css = [];
  for (const file of files) {
    bytes += fs.statSync(file).size;
    const relative = path.relative(esm, file);
    if (relative.includes(`${path.sep}browser${path.sep}`)) dom.push(relative);
    if (file.endsWith('.css')) css.push(relative);
  }
  console.log(`${label}: ${files.size} files, ${(bytes / 1024).toFixed(0)} KiB source (unminified ESM); under /browser/: ${dom.length}${dom.length ? ' e.g. ' + dom.slice(0, 3).join(', ') : ''}; css imports: ${css.length}`);
}
report('textModel.js (model + undo + decorations)', 'vs/editor/common/model/textModel.js');
report('monarchLexer.js (tokenizer)', 'vs/editor/standalone/common/monarch/monarchLexer.js');
report('editor.api.js (the public API)', 'vs/editor/editor.api.js');
report('editor.main.js (api + all contributions)', 'vs/editor/editor.main.js');

const size = (relative) => { const file = path.join(root, relative); return fs.existsSync(file) ? fs.statSync(file).size : null; };
const kib = (n) => (n === null ? 'n/a' : `${(n / 1024).toFixed(0)} KiB`);
console.log('prebuilt min/ files:', { 'min/vs/loader.js': kib(size('min/vs/loader.js')), 'min/vs/editor/editor.main.js': kib(size('min/vs/editor/editor.main.js')), 'min/vs/editor/editor.main.css': kib(size('min/vs/editor/editor.main.css')), 'min/vs/base/worker/workerMain.js': kib(size('min/vs/base/worker/workerMain.js')) });
let total = 0;
(function walk(dir) { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) walk(full); else total += fs.statSync(full).size; } })(path.join(root, 'min'));
console.log(`min/ total: ${(total / 1024 / 1024).toFixed(1)} MiB (includes every language and the TS/CSS/HTML/JSON workers)`);
