import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';

/**
 * The freshness guard: a build records what it was made from, and a run compares that with
 * the working tree before it uses the build.
 *
 * What a build is made from is the *content* of its inputs, never their modification times. Cargo decides what to
 * rebuild from mtimes, and a file restored to its old content with its old mtime (a negative control put back, a
 * `git checkout`, a restore from a backup) looks unchanged to it, so cargo keeps the artifact built from the other
 * content. The digest here sees the restored content, so the stamp can say the artifact is stale and a build can
 * refuse to keep it.
 *
 * The stamp is the one the installed library and side module already carried (`probe`, `library`, `sha256`); it gains `features`,
 * `digest` and `inputs`. It also says what the build is bound to, in one of two forms. A Web side module records `engine`, the profile
 * whose Emscripten and templates it was linked for. A native build records `binding`, the Godot API (`api`, a version) and the hash
 * of the dump pair (`dump`) it was compiled against, never a profile: one native build serves every engine at least as new as its API
 * (scripts/native-binding.mjs). The same stamp is written beside cargo's own output, which is how a build
 * knows whether cargo's cache can be trusted (`prepareTarget`), and inside a Web export's receipt.
 */

/** Files outside `native/` that every cargo build reads. A missing optional file is not an input. */
const REQUIRED_FILES = ['Cargo.toml', 'Cargo.lock'];
const OPTIONAL_FILES = ['build.rs', 'rust-toolchain.toml', '.cargo/config.toml'];
const SOURCE_DIRECTORY = 'native';
/** The API dumps under `native/api` are chosen per profile and passed in; Markdown there and elsewhere is prose. */
const DUMP_DIRECTORY = 'native/api';
const IGNORED_NAMES = new Set(['.DS_Store']);
const IGNORED_EXTENSION = '.md';
/** How many digits of a dump hash a message shows. */
const BINDING_DIGITS = 12;
/** How many files a message names before it says "and N more". */
const LISTED_PATHS = 4;

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function byCodePoint(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function posix(path) {
  return path.split(sep).join('/');
}

/** Repository-relative paths of every file under `directory` (itself relative to `root`), in a fixed order. */
function sourceFiles(root, directory) {
  const found = [];
  const entries = readdirSync(resolve(root, directory), { withFileTypes: true }).sort((a, b) => byCodePoint(a.name, b.name));
  for (const entry of entries) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      if (path !== DUMP_DIRECTORY) found.push(...sourceFiles(root, path));
    } else if (entry.isFile() && !IGNORED_NAMES.has(entry.name) && !entry.name.endsWith(IGNORED_EXTENSION)) {
      found.push(path);
    }
  }
  return found;
}

function digestOf(features, inputs) {
  return createHash('sha256').update(JSON.stringify([features, Object.entries(inputs).sort(([a], [b]) => byCodePoint(a, b))])).digest('hex');
}

/**
 * Everything a cargo build of this crate reads, as content hashes: `native/` (without its API dumps and prose),
 * `Cargo.toml`, `Cargo.lock`, `build.rs`, the toolchain pin and cargo's config if present, and `apiFiles`, the API dump
 * pair of the profile being built (absolute paths). The cargo `features` are part of it, so a probe build is never
 * fresh for a default run. `digest` is one hash over all of it; `inputs` keeps each file's hash so a refusal can name
 * what changed.
 */
export function collectInputs({ root, apiFiles, features }) {
  const paths = [
    ...REQUIRED_FILES,
    ...OPTIONAL_FILES.filter(path => existsSync(resolve(root, path))),
    ...sourceFiles(root, SOURCE_DIRECTORY),
    ...apiFiles.map(file => posix(relative(root, file))),
  ];
  const inputs = {};
  for (const path of [...new Set(paths)].sort(byCodePoint)) inputs[path] = sha256(resolve(root, path));
  const sortedFeatures = [...features].sort(byCodePoint);
  return { features: sortedFeatures, digest: digestOf(sortedFeatures, inputs), inputs };
}

/**
 * The same record for inputs the caller names: `paths` (relative to `root`) hashed by content, plus `extra`, a map of
 * already-computed hashes under their own names. Used for what a Web export's pack and shell are made from
 * (scripts/web-content.mjs).
 */
export function collectContentInputs({ root, paths, extra = {}, features = [] }) {
  const inputs = { ...extra };
  for (const path of [...new Set(paths)]) inputs[path] = sha256(resolve(root, path));
  const sorted = Object.fromEntries(Object.entries(inputs).sort(([a], [b]) => byCodePoint(a, b)));
  const sortedFeatures = [...features].sort(byCodePoint);
  return { features: sortedFeatures, digest: digestOf(sortedFeatures, sorted), inputs: sorted };
}

/** How the inputs of a build differ from the inputs now; `same` is true when nothing does. */
export function compareInputs(built, current) {
  const changed = [];
  const added = [];
  const removed = [];
  for (const [path, hash] of Object.entries(current.inputs)) {
    if (!Object.hasOwn(built.inputs, path)) added.push(path);
    else if (built.inputs[path] !== hash) changed.push(path);
  }
  for (const path of Object.keys(built.inputs)) if (!Object.hasOwn(current.inputs, path)) removed.push(path);
  const featuresDiffer = JSON.stringify(built.features) !== JSON.stringify(current.features);
  return {
    same: built.digest === current.digest && changed.length === 0 && added.length === 0 && removed.length === 0 && !featuresDiffer,
    changed, added, removed,
    features: featuresDiffer ? { built: built.features, wanted: current.features } : undefined,
  };
}

function listPaths(paths) {
  const shown = paths.slice(0, LISTED_PATHS).join(', ');
  return paths.length > LISTED_PATHS ? `${shown} and ${paths.length - LISTED_PATHS} more` : shown;
}

/** The comparison in words, for a refusal: which files changed, which appeared or went, which features differ. */
export function describeDifference(difference) {
  const parts = [];
  if (difference.changed.length > 0) parts.push(`changed: ${listPaths(difference.changed)}`);
  if (difference.added.length > 0) parts.push(`added: ${listPaths(difference.added)}`);
  if (difference.removed.length > 0) parts.push(`removed: ${listPaths(difference.removed)}`);
  if (difference.features !== undefined) {
    parts.push(`cargo features differ: built with [${difference.features.built.join(', ')}], wanted [${difference.features.wanted.join(', ')}]`);
  }
  return parts.join('; ');
}

/** A stamp is usable for comparison only if it carries the digest, the features and the per-file hashes. */
function hasDigest(stamp) {
  return typeof stamp.digest === 'string' && Array.isArray(stamp.features) && typeof stamp.inputs === 'object' && stamp.inputs !== null;
}

/**
 * The stamp for `library`, built from `inputs`: bound to the `engine` profile (a Web side module) or to the Godot API `binding`
 * (`{ api, dump }`, a native build); exactly one of them.
 */
export function stampFor({ library, engine, binding, probe, inputs }) {
  if ((engine === undefined) === (binding === undefined)) throw new Error('A stamp is bound to an engine profile or to a Godot API binding, one of the two.');
  const bound = binding === undefined ? { engine } : { binding: { api: binding.api, dump: binding.dump } };
  return { ...bound, probe, library: basename(library), sha256: sha256(library), features: inputs.features, digest: inputs.digest, inputs: inputs.inputs };
}

/** Write a stamp so a reader never sees half of it: stage a sibling and rename it over the old one. */
export function writeStamp(path, stamp) {
  const staged = `${path}.${process.pid}.tmp`;
  writeFileSync(staged, `${JSON.stringify(stamp, null, 2)}\n`);
  renameSync(staged, path);
}

/** The stamp at `path`, or undefined if there is none or it cannot be read (both mean the build cannot be vouched for). */
export function readStamp(path) {
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return undefined;
  }
}

/** A binding in a sentence: `Godot API 4.7.2 (dump 8c1f0a2b9d3e)`. */
export function describeBinding(binding) {
  return `Godot API ${binding.api} (dump ${String(binding.dump).slice(0, BINDING_DIGITS)})`;
}

function isBinding(value) {
  return typeof value === 'object' && value !== null && typeof value.api === 'string' && typeof value.dump === 'string';
}

/**
 * Why `library` cannot be used as the build (a probe build or not) of the sources `current` describes, or undefined if it can. A Web
 * side module is the `engine` profile's; a native build is bound to the Godot API `binding` (`{ api, dump }`): one is given, not both.
 * `subject` names it in the sentence, for example `installed libgodot_react_ui.dylib`.
 */
export function findProblem({ library, stamp, engine, binding, probe, current, subject }) {
  if (stamp === undefined || typeof stamp !== 'object' || stamp === null || !existsSync(library)) {
    return binding === undefined
      ? `No ${engine} build of ${basename(library)} is available: the ${subject} or its build stamp is missing.`
      : `No build of ${basename(library)} bound to ${describeBinding(binding)} is available: the ${subject} or its build stamp is missing.`;
  }
  if (binding === undefined) {
    if (stamp.engine !== engine || stamp.probe !== probe) {
      const was = typeof stamp.engine === 'string' ? `the ${stamp.engine} profile's${stamp.probe ? ' probe build' : ''}` : stampedAs(stamp);
      return `The ${subject} is ${was}, not the ${engine} profile's${probe ? ' probe build' : ''}.`;
    }
  } else if (!sameBinding(stamp.binding, binding)) {
    return `The ${subject} is ${stampedAs(stamp)}, not bound to ${describeBinding(binding)}.`;
  } else if (stamp.probe !== probe) {
    return `The ${subject} is ${stamp.probe ? 'a probe build' : 'a default build'}, not ${probe ? 'a probe build' : 'a default build'}.`;
  }
  if (stamp.sha256 !== sha256(library)) {
    return `The ${subject} differs from the one its build recorded${binding === undefined ? ` for ${engine}` : ''}: it was replaced after it was built.`;
  }
  if (!hasDigest(stamp)) {
    return `The ${subject} is stale: its stamp records no source digest (it was built before the freshness guard), so it cannot be shown to match the sources.`;
  }
  const difference = compareInputs(stamp, current);
  if (!difference.same) {
    const detail = describeDifference(difference);
    return `The ${subject} is stale: it was built from different sources than the working tree${detail === '' ? '' : ` (${detail})`}.`;
  }
  return undefined;
}

function sameBinding(recorded, wanted) {
  return isBinding(recorded) && recorded.api === wanted.api && recorded.dump === wanted.dump;
}

/** What a stamp says the build is bound to, in a sentence. */
function stampedAs(stamp) {
  if (isBinding(stamp.binding)) return `bound to ${describeBinding(stamp.binding)}`;
  if (typeof stamp.engine === 'string') return `the ${stamp.engine} profile's build, made before native builds were bound to one Godot API`;
  return 'a build that records no binding';
}

/** Throw unless `library` is the build the check describes (`findProblem`); the message ends with the command that fixes it. */
export function requireBuild({ fix, ...check }) {
  const problem = findProblem(check);
  if (problem !== undefined) throw new Error(`${problem} Run \`${fix}\` first.`);
}

/**
 * Put the file at `source` at `destination` so that no process which has `destination` mapped sees it change: stage a sibling
 * and rename it over the old file. `copyFileSync` onto a loaded library truncates and rewrites it in place and corrupts the
 * running process's mapping; a rename swaps the directory entry, and a running process keeps its inode. With `sha256`, the staged
 * copy must hash to it (the source changed while it was copied, or is not the file a stamp describes) or nothing is renamed.
 */
export function installFile(source, destination, { sha256: expected } = {}) {
  mkdirSync(dirname(destination), { recursive: true });
  const staged = `${destination}.${process.pid}.tmp`;
  try {
    copyFileSync(source, staged);
    if (expected !== undefined && sha256(staged) !== expected) {
      throw new Error(`${source} is not the file its stamp describes (it changed while it was copied), so it was not installed.`);
    }
    renameSync(staged, destination);
  } finally {
    rmSync(staged, { force: true });
  }
}

/**
 * Cargo decides what to rebuild from file modification times, so it keeps an artifact built from content that has
 * since been restored with its old mtime. Before a build, make sure the artifact in cargo's target directory is the
 * build of these sources: if its stamp (written by the last build there) does not say so, drop the stamp and call
 * `clean(reason)`, which removes this crate's artifacts so cargo must rebuild them. The dependencies stay cached.
 * Returns the reason it cleaned, or undefined if the target could be trusted.
 *
 * The stamp goes before the clean: a build that dies half way must not leave a stamp vouching for what is left.
 */
export function prepareTarget({ stampPath, library, engine, binding, probe, current, subject, clean }) {
  const problem = findProblem({ library, stamp: readStamp(stampPath), engine, binding, probe, current, subject });
  if (problem === undefined) return undefined;
  rmSync(stampPath, { force: true });
  clean(problem);
  return problem;
}

/**
 * Start a build of the artifact `built` (`library` of a stamp: a native library, a Web side module): hash the inputs (`collect()`) and, if the
 * artifact cargo left from the last build is not provably a build of them, have `clean` remove this crate's artifacts so cargo cannot keep it
 * (`prepareTarget`). `identity` says what the build is bound to, `{ engine }` or `{ binding }` (`stampFor`). Returns the steps that record the
 * build: `compiled()` once the compiler has succeeded (stamps its output; throws if the sources changed while it ran, naming `fix`) and
 * `installed()` once the artifact is in place at `installed`.
 */
export function beginBuild({ identity, probe, collect, built, targetStamp, installed, installedStamp, subject, compiler, fix, crate, clean }) {
  const inputs = collect();
  prepareTarget({
    stampPath: targetStamp, library: built, ...identity, probe, current: inputs, subject,
    clean: reason => {
      console.log(`${reason} Cleaning ${crate} so cargo rebuilds it from the current sources (its dependencies stay cached).`);
      clean();
    },
  });
  return {
    compiled() {
      if (collect().digest !== inputs.digest) {
        throw new Error(`The sources changed while ${compiler} was compiling them, so the result cannot be stamped. Run \`${fix}\` again.`);
      }
      writeStamp(targetStamp, stampFor({ library: built, ...identity, probe, inputs }));
    },
    installed: () => writeStamp(installedStamp, stampFor({ library: installed, ...identity, probe, inputs })),
  };
}

/**
 * Why the files of the export in `directory` are not the ones its receipt lists (`receipt.files`: name, size and hash of each,
 * taken when it was made): a file missing, resized or changed. Empty when the directory is what was exported.
 */
export function exportFileProblems(directory, receipt) {
  const problems = [];
  for (const { name, bytes, sha256: expected } of Array.isArray(receipt?.files) ? receipt.files : []) {
    const path = join(directory, name);
    if (!existsSync(path)) problems.push(`${name} is missing`);
    else if (statSync(path).size !== bytes || sha256(path) !== expected) problems.push(`${name} differs from the export`);
  }
  return problems;
}

/**
 * Throw unless the Web export in `directory` carries the `engine` profile's side module built from the current
 * sources. A Web export records the side module's stamp as `extension` in its receipt, and the module itself sits
 * beside it, which is what the browser runs. With `content` (the pack, shell and template inputs now: scripts/web-content.mjs),
 * the export must also have been made from them, and every file in it must still be the one it was made with.
 */
export function requireExport({ directory, receiptName, libraryName, engine, probe, current, content, subject, fix }) {
  const receiptPath = join(directory, receiptName);
  if (!existsSync(receiptPath)) throw new Error(`No ${engine} ${subject} exists: ${receiptPath} is missing. Run \`${fix}\` first.`);
  let receipt;
  try {
    receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
  } catch {
    receipt = undefined;
  }
  requireBuild({ library: join(directory, libraryName), stamp: receipt?.extension, engine, probe, current, subject, fix });
  if (content === undefined) return;
  const exportOnly = fix.replace('build:web', 'build:web --export-only');
  if (receipt?.content === undefined || !hasDigest(receipt.content)) {
    throw new Error(`The ${subject} is stale: its receipt records no digest of the pack, shell and template it was made from (it was made before that guard), so it cannot be shown to match the sources. Run \`${exportOnly}\` first.`);
  }
  const difference = compareInputs(receipt.content, content);
  if (!difference.same) {
    throw new Error(`The ${subject} is stale: its pack, shell or engine template were made from different sources than the working tree (${describeDifference(difference)}). Run \`${exportOnly}\` first.`);
  }
  const problems = exportFileProblems(directory, receipt);
  if (problems.length > 0) {
    throw new Error(`The ${subject} is not the export its receipt describes (${listPaths(problems)}). Run \`${exportOnly}\` first.`);
  }
}
