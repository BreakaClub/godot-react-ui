import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scrubOpenScripts } from './editor-session.mjs';
import { NATIVE_LIBRARY_NAME, NATIVE_TARGETS, nativeBinding, nativeSourceInputs } from './native-binding.mjs';

// The GodotJS declarations the `stock` engine profile typechecks against.
//
// Typings stay per profile because GodotJS differs, though the native library does not.
// `demo/typings` and `demo/gen` are tracked and are Breaka's engine's: that is what the default profile checks. The
// stock editor writes different declarations (a different GodotJS, a different Godot), so they are generated in a
// staged copy of the project, with the one native library (bound to Godot API 4.7.2, the stock editor's own), and kept
// untracked in `target/stock-typings`, which `tsconfig.stock.json` includes.
//
// The declarations list the library's classes, so they are only as current as the library. They are never generated
// from, or checked against, a library built from older sources: that would report the
// newest `#[func]`s as missing types. A typecheck never builds the library; it says which build to run.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GENERATE_TIMEOUT_MS = 120_000;

/**
 * The parts of `demo/` the staged project does not have: Breaka's typings and scene wrappers, whichever library is installed, the code editor's
 * (optional) godot-tsc addon and its project, and the in-repo extension's install that the godot-tsc package replaced, which an earlier stage copied.
 */
const STAGE_LEFT_OUT = ['typings', 'gen', 'addons/godot-react-ui/bin', 'addons/godot-tsc', 'addons/live-compile', 'live-compile'];

/** Where the stock profile keeps its declarations, and the record of what they were generated from. The library is the one native build. */
export function stockTypingsPaths() {
  const directory = resolve(root, 'target/stock-typings');
  return {
    directory: resolve(directory, 'typings'),
    record: resolve(directory, 'typings.json'),
    stage: resolve(directory, 'project'),
    library: resolve(NATIVE_TARGETS.default, 'release', NATIVE_LIBRARY_NAME),
  };
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/**
 * What the declarations depend on: the editor that wrote them, the library whose classes they list and the sources
 * (the same digest the library's stamp records) that library was built from.
 */
function stockTypingsSource(version) {
  const paths = stockTypingsPaths();
  return {
    godotVersion: version, librarySha256: sha256(paths.library), apiDump: nativeBinding().dump,
    sourceDigest: nativeSourceInputs().digest,
    // What the staged project leaves out: declarations generated with another stage are not these.
    leftOut: STAGE_LEFT_OUT.join(','),
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

/** Generate the stock declarations in a staged copy of the project. Needs the native library built from the current sources. */
export function generateStockTypings(engine) {
  const version = engine.verifiedVersion();
  const paths = stockTypingsPaths();
  engine.requireBuiltLibrary();
  mkdirSync(paths.stage, {recursive: true});
  // The project as the stock editor sees it: the demo, its compiled scripts, and the stock library at the path the
  // `.gdextension` names. Breaka's typings and scene wrappers, and whichever library is installed, are left out.
  const excluded = STAGE_LEFT_OUT.map(part => resolve(root, 'demo', part));
  // The copy adds and overwrites but removes nothing: what an earlier stage had of the parts it now leaves out would be loaded again.
  for (const part of STAGE_LEFT_OUT) rmSync(resolve(paths.stage, part), {recursive: true, force: true});
  cpSync(resolve(root, 'demo'), paths.stage, {
    recursive: true, force: true, filter: source => !excluded.some(path => source === path || source.startsWith(`${path}/`)),
  });
  const bin = resolve(paths.stage, 'addons/godot-react-ui/bin');
  mkdirSync(bin, {recursive: true});
  cpSync(paths.library, resolve(bin, NATIVE_LIBRARY_NAME), {force: true});
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
  writeFileSync(paths.record, `${JSON.stringify(stockTypingsSource(version), null, 2)}\n`);
  console.log(`Stock typings (${readdirSync(paths.directory).length} files) written to ${paths.directory}`);
}

/**
 * Generate the stock declarations unless the ones on disk came from this editor and this library. Refuses, naming
 * the build to run, if the library is not a build of the current sources; it never builds one.
 */
export function ensureStockTypings(engine) {
  const paths = stockTypingsPaths();
  engine.requireBuiltLibrary();
  if (existsSync(paths.record) && existsSync(paths.directory)) {
    const recorded = JSON.parse(readFileSync(paths.record, 'utf8'));
    const current = stockTypingsSource(engine.verifiedVersion());
    if (Object.keys(current).every(key => recorded[key] === current[key])) return;
  }
  generateStockTypings(engine);
}
