// Usage: node experiments/code-editor/frameworks/import-probe.cjs <family-dir> <specifier> [<specifier>...]
// For each specifier: a bare dynamic import() in a fresh Node process with the browser globals trapped (trap-globals.cjs)
// and cwd = the family directory (never inside node_modules). Prints ok/exports count/touched globals, or the first error.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
// STUB_CSS=1 in the environment is passed through to trap-globals.cjs.
const [family, ...specifiers] = process.argv.slice(2);
const cwd = path.join(__dirname, family);
const trap = path.join(__dirname, 'trap-globals.cjs');
for (const specifier of specifiers) {
  const code = `
    const started = performance.now();
    try {
      const mod = await import(${JSON.stringify(specifier)});
      const keys = Object.keys(mod);
      console.log(JSON.stringify({ ok: true, exports: keys.length, sample: keys.slice(0, 6), ms: Math.round(performance.now() - started), touched: globalThis.__touchedGlobals() }));
    } catch (error) {
      const stack = String(error && error.stack || error).split('\\n').slice(0, 7).join(' | ');
      console.log(JSON.stringify({ ok: false, error: String(error && error.message || error).split('\\n')[0], code: error && error.code, stack, touched: globalThis.__touchedGlobals() }));
    }`;
  const result = spawnSync(process.execPath, ['--require', trap, '--input-type=module', '-e', code], { cwd, encoding: 'utf8', timeout: 60000 });
  const line = (result.stdout || '').trim().split('\n').pop() || '';
  let parsed;
  try { parsed = JSON.parse(line); } catch { parsed = { ok: false, error: 'no JSON output', stderr: (result.stderr || '').slice(0, 400), status: result.status }; }
  console.log(`${family}: ${specifier}\n  ${JSON.stringify(parsed)}`);
}
