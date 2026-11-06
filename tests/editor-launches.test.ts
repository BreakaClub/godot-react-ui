import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

// Godot's script editor rewrites a TypeScript file it has open (docs/tracks/verifier-integrity.md, finding 5), so every script that
// launches an editor on the project takes TypeScript out of the saved layout first (`scrubOpenScripts`, scripts/editor-session.mjs).

const scripts = resolve(__dirname, '..', 'scripts');
/** How a script starts an editor, or an export that runs one: the Godot options that load the project in the editor. */
const LAUNCHES_AN_EDITOR = /'--editor'|--generate-types|`--export-\$\{|'--import'/;

test('build:web scrubs the saved editor layout before its headless export', () => {
  const text = readFileSync(resolve(scripts, 'build-web.mjs'), 'utf8');
  const scrub = text.indexOf('scrubOpenScripts(join(root, \'demo\'))');
  const exportRun = text.indexOf('`--export-${mode}`');
  assert.ok(scrub > 0, 'build-web.mjs does not scrub');
  assert.ok(exportRun > 0);
  assert.ok(scrub < exportRun, 'the scrub comes after the export');
});

test('every script that starts an editor, or imports through scripts/import-demo.mjs, scrubs first', () => {
  const launching = readdirSync(scripts)
    .filter((name) => name.endsWith('.mjs'))
    .filter((name) => LAUNCHES_AN_EDITOR.test(readFileSync(resolve(scripts, name), 'utf8')))
    .map((name) => name.replace(/\.mjs$/, ''));
  assert.ok(launching.includes('build-web') && launching.includes('dev') && launching.includes('import-demo'), `the pattern found only ${launching.join(', ')}`);
  for (const name of launching) {
    assert.match(readFileSync(resolve(scripts, `${name}.mjs`), 'utf8'), /scrubOpenScripts\(/, `scripts/${name}.mjs starts an editor and does not scrub`);
  }
});
