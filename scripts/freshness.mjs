import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';

/**
 * The freshness guard (docs/tracks/freshness.md): a build records what it was made from, and a run compares that with
 * the working tree before it uses the build.
 *
 * What a build is made from is the *content* of its inputs, never their modification times. Cargo decides what to
 * rebuild from mtimes, and a file restored to its old content with its old mtime (a negative control put back, a
 * `git checkout`, a restore from a backup) looks unchanged to it, so cargo keeps the artifact built from the other
 * content. The digest here sees the restored content, so the stamp can say the artifact is stale and a build can
 * refuse to keep it.
 *
 * The stamp is the one the installed library and side module already carried (`engine`, `probe`, `library`,
 * `sha256`); it gains `features`, `digest` and `inputs`. The same stamp is written beside cargo's own output, which
 * is how a build knows whether cargo's cache can be trusted (`prepareTarget`), and inside a Web export's receipt.
 */

/** Files outside `native/` that every cargo build reads. A missing optional file is not an input. */
const REQUIRED_FILES = ['Cargo.toml', 'Cargo.lock'];
const OPTIONAL_FILES = ['build.rs', 'rust-toolchain.toml', '.cargo/config.toml'];
const SOURCE_DIRECTORY = 'native';
/** The API dumps under `native/api` are chosen per profile and passed in; Markdown there and elsewhere is prose. */
const DUMP_DIRECTORY = 'native/api';
const IGNORED_NAMES = new Set(['.DS_Store']);
const IGNORED_EXTENSION = '.md';
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

export function stampFor({ library, engine, probe, inputs }) {
  return { engine, probe, library: basename(library), sha256: sha256(library), features: inputs.features, digest: inputs.digest, inputs: inputs.inputs };
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

/**
 * Why `library` cannot be used as the `engine` profile's build (a probe build or not) of the sources `current`
 * describes, or undefined if it can. `subject` names it in the sentence, for example `installed libgodot_react_ui.dylib`.
 */
export function findProblem({ library, stamp, engine, probe, current, subject }) {
  if (stamp === undefined || typeof stamp !== 'object' || stamp === null || !existsSync(library)) {
    return `No ${engine} build of ${basename(library)} is available: the ${subject} or its build stamp is missing.`;
  }
  if (stamp.engine !== engine || stamp.probe !== probe) {
    return `The ${subject} is the ${stamp.engine} profile's${stamp.probe ? ' probe build' : ''}, not the ${engine} profile's${probe ? ' probe build' : ''}.`;
  }
  if (stamp.sha256 !== sha256(library)) {
    return `The ${subject} differs from the one its build recorded for ${engine}: it was replaced after it was built.`;
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

/** Throw unless `library` is the `engine` profile's build of the current sources; the message ends with the command that fixes it. */
export function requireBuild({ fix, ...check }) {
  const problem = findProblem(check);
  if (problem !== undefined) throw new Error(`${problem} Run \`${fix}\` first.`);
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
export function prepareTarget({ stampPath, library, engine, probe, current, subject, clean }) {
  const problem = findProblem({ library, stamp: readStamp(stampPath), engine, probe, current, subject });
  if (problem === undefined) return undefined;
  rmSync(stampPath, { force: true });
  clean(problem);
  return problem;
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
