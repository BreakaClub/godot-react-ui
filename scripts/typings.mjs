import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scrubOpenScripts } from './editor-session.mjs';

// The GodotJS declarations the `stock` engine profile typechecks against (docs/tracks/stock-engine.md).
//
// `demo/typings` and `demo/gen` are tracked and are Breaka's engine's: that is what the default profile checks. The
// stock editor writes different declarations (a different GodotJS, a different Godot), so they are generated in a
// staged copy of the project, with the library built for the stock engine, and kept untracked in the stock
// profile's target directory, which `tsconfig.stock.json` includes.
//
// The declarations list the library's classes, so they are only as current as the library. They are never generated
// from, or checked against, a library built from older sources (docs/tracks/freshness.md): that would report the
// newest `#[func]`s as missing types. A typecheck never builds the library; it says which build to run.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GENERATE_TIMEOUT_MS = 120_000;

/** Where the stock profile keeps its declarations, and the record of what they were generated from. */
export function stockTypingsPaths(engine) {
  return {
    directory: resolve(engine.targets.native, 'typings'),
    record: resolve(engine.targets.native, 'typings.json'),
    stage: resolve(engine.targets.native, 'typings-project'),
    library: resolve(engine.targets.native, 'release', engine.libraryName),
  };
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/**
 * What the declarations depend on: the editor that wrote them, the library whose classes they list and the sources
 * (the same digest the library's stamp records) that library was built from.
 */
function stockTypingsSource(engine, version) {
  const paths = stockTypingsPaths(engine);
  return {
    godotVersion: version, librarySha256: sha256(paths.library), apiSha256: sha256(resolve(engine.apiDirectory, 'extension_api.json')),
    sourceDigest: engine.sourceInputs('native').digest,
  };
}

/**
 * Upstream GodotJS at the stock tree's commit declares a deprecated `export function export(...)` in its
 * `godot.annotations` module (with CRLF line endings). That is not valid TypeScript: the compiler reports a syntax error and then skips every
 * semantic diagnostic of the project. Drop that one declaration (the supported spelling, `export_`, is declared
 * next to it). If upstream stops emitting it, nothing is removed.
 */
export function withoutInvalidExportDeclaration(source) {
  return source.replace(/ {4}\/\*\* @deprecated Use createClassBinder\(\) instead\. \*\/\r?\n {4}export function export\(type: Godot\.Variant\.Type, details\?: \{.*?\}\): \(target: any, name: string\) => void;\r?\n/su, '');
}

/** Generate the stock declarations in a staged copy of the project. Needs the stock library built from the current sources. */
export function generateStockTypings(engine) {
  const version = engine.verifiedVersion();
  const paths = stockTypingsPaths(engine);
  engine.requireBuiltLibrary();
  mkdirSync(paths.stage, {recursive: true});
  // The project as the stock editor sees it: the demo, its compiled scripts, and the stock library at the path the
  // `.gdextension` names. Breaka's typings and scene wrappers, and whichever library is installed, are left out.
  // The live-compile extension and its project are optional (docs/tracks/live-compile.md): the typings must not describe a class a checkout without it lacks.
  const excluded = [
    resolve(root, 'demo/typings'), resolve(root, 'demo/gen'), resolve(root, 'demo/addons/godot-react-ui/bin'),
    resolve(root, 'demo/addons/live-compile'), resolve(root, 'demo/live-compile'),
  ];
  cpSync(resolve(root, 'demo'), paths.stage, {
    recursive: true, force: true, filter: source => !excluded.some(path => source === path || source.startsWith(`${path}/`)),
  });
  const bin = resolve(paths.stage, 'addons/godot-react-ui/bin');
  mkdirSync(bin, {recursive: true});
  cpSync(paths.library, resolve(bin, engine.libraryName), {force: true});
  rmSync(resolve(paths.stage, 'typings'), {recursive: true, force: true});
  // The staged project carries the demo's editor layout; an editor must not open its TypeScript (scripts/editor-session.mjs).
  scrubOpenScripts(paths.stage);
  const result = spawnSync(engine.godot, ['--headless', '--audio-driver', 'Dummy', '--editor', '--generate-types', '--path', paths.stage], {
    cwd: root, stdio: 'inherit', timeout: GENERATE_TIMEOUT_MS,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`The stock editor failed generating types (exit ${result.status})`);
  const generated = resolve(paths.stage, 'typings');
  if (!existsSync(generated)) throw new Error(`The stock editor wrote no typings in ${generated}`);
  rmSync(paths.directory, {recursive: true, force: true});
  cpSync(generated, paths.directory, {recursive: true});
  const annotations = resolve(paths.directory, 'jsb.runtime.bundle.d.ts');
  writeFileSync(annotations, withoutInvalidExportDeclaration(readFileSync(annotations, 'utf8')));
  writeFileSync(paths.record, `${JSON.stringify(stockTypingsSource(engine, version), null, 2)}\n`);
  console.log(`Stock typings (${readdirSync(paths.directory).length} files) written to ${paths.directory}`);
}

/**
 * Generate the stock declarations unless the ones on disk came from this editor and this library. Refuses, naming
 * the build to run, if the library is not a build of the current sources; it never builds one.
 */
export function ensureStockTypings(engine) {
  const paths = stockTypingsPaths(engine);
  engine.requireBuiltLibrary();
  if (existsSync(paths.record) && existsSync(paths.directory)) {
    const recorded = JSON.parse(readFileSync(paths.record, 'utf8'));
    const current = stockTypingsSource(engine, engine.verifiedVersion());
    if (Object.keys(current).every(key => recorded[key] === current[key])) return;
  }
  generateStockTypings(engine);
}
