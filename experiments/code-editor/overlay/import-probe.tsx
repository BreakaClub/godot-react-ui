// Proves: which candidates can be imported under plain Node with no document/window/navigator, and which
// DOM-ish globals each one READS while importing. Each package is required in a CHILD process so one failure
// cannot hide another. In the child, every DOM global is replaced by an accessor that returns undefined and
// records the first stack frame outside node:internal that read it (so `typeof window` is caught), and Node 22's
// own `navigator` is deleted so the environment looks like GodotJS's (no navigator, no window, no document).
// Run: node_modules/.bin/tsx experiments/code-editor/overlay/import-probe.tsx
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const here = __dirname;
const candidates = [
  'react-simple-code-editor',
  '@uiw/react-textarea-code-editor',
  'prism-react-renderer',
  'react-syntax-highlighter',
  'react-syntax-highlighter/dist/esm/prism-light',
  'react-live',
  'use-editable',
  'sucrase',
  'prism-code-editor',
  'prism-code-editor/prism',
  'react-ace',
  'ace-builds',
  'ace-builds/src-noconflict/ace',
  'highlight.js',
  'prismjs',
];

function main() {
  const resolveFrom = path.join(here, 'noop.js');
  for (const name of candidates) {
    const code = `
      const watched = ['document','window','navigator','self','HTMLElement','Element','Node','getComputedStyle','MutationObserver',
        'ResizeObserver','requestAnimationFrame','localStorage','location','Worker','WorkerGlobalScope','CSS','Range','Selection','addEventListener','XMLHttpRequest'];
      const reads = new Map();
      for (const g of watched) {
        try { delete globalThis[g]; } catch {}
        Object.defineProperty(globalThis, g, { configurable: true, get() {
          const frame = (new Error().stack || '').split('\\n').slice(2).find(l => !l.includes('node:internal')) || '';
          if (!reads.has(g)) reads.set(g, frame.trim().replace(/^at /, '').replace(${JSON.stringify(here)}, '.'));
          return undefined;
        }});
      }
      const before = new Set(Object.getOwnPropertyNames(globalThis));
      try {
        const req = require('node:module').createRequire(${JSON.stringify(resolveFrom)});
        const mod = req(${JSON.stringify(name)});
        const added = Object.getOwnPropertyNames(globalThis).filter(k => !before.has(k));
        console.log('OK    exports=' + Object.keys(mod).slice(0,6).join(',') + (added.length ? '\\n      NEW GLOBALS: ' + added.join(',') : ''));
      } catch (e) {
        console.log('THROW ' + e.constructor.name + ': ' + String(e.message).split('\\n')[0].slice(0,160));
      }
      for (const [g, f] of reads) console.log('      read global ' + g + ' at ' + f);
    `;
    const result = spawnSync(process.execPath, ['-e', code], { cwd: here, encoding: 'utf8' });
    console.log(name.padEnd(46), (result.stdout + result.stderr).trim().replace(/\n/g, '\n' + ' '.repeat(46)));
  }
}
main();
