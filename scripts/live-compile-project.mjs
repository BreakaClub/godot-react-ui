// Writes the project the live code editor opens, as one JSON file: the checker's files.
//
//   demo/live-compile/project.json   { version, config, libDir, files: [{ path, text }], labs: { <id>: { config, sources } } }
//
// The checker has no file system: it reads the files it is given, at the paths it is given. The project is
//
//   /project/lab/<name>.tsx|ts      the demo's labs, as the person edits them (the closure of each lab's imports)
//   /project/types/godot-react-ui   the library's declarations (`tsc -p tsconfig.package.json` emits them into dist/)
//   /project/types/react            @types/react, and csstype beside it
//   /project/tsconfig.<id>.json     one configuration for each lab: its sources are the roots, everything else is shared
//   /libs/lib.*.d.ts                the standard library's declarations: Bun's bundle of TypeScript 7.0.2's
//
// The Godot project packages the file (`include_filter` in demo/export_presets.cfg) and the editor reads it with FileAccess,
// natively and in the Web pack. Nothing here is in the library's package.
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { zstdDecompressSync } from 'node:zlib';
import { rejectUnknownArguments } from './arguments.mjs';

rejectUnknownArguments(process.argv.slice(2));

// Bun's lib bundle is zstd with dictionaries, which `node:zlib` reads from Node 24 (22.16 reports corruption). A run under an older Node
// starts the newest Node 24 nodenv has and does the same there.
const NODE_WITH_ZSTD_DICTIONARIES = 24;
if (Number(process.versions.node.split('.')[0]) < NODE_WITH_ZSTD_DICTIONARIES) {
  const versions = readdirSync(path.join(homedir(), '.nodenv/versions')).filter(version => version.startsWith(`${NODE_WITH_ZSTD_DICTIONARIES}.`)).sort();
  const newest = versions.at(-1);
  if (newest === undefined) throw new Error(`Bun's lib bundle needs Node ${NODE_WITH_ZSTD_DICTIONARIES} (zstd dictionaries in node:zlib), and nodenv has none`);
  const again = spawnSync(path.join(homedir(), '.nodenv/versions', newest, 'bin/node'), [import.meta.filename, ...process.argv.slice(2)], { stdio: 'inherit' });
  process.exit(again.status ?? 1);
}

const root = path.resolve(import.meta.dirname, '..');
const OUTPUT = path.join(root, 'demo/live-compile/project.json');
const LIB_BUNDLE = path.join(root, 'live-compile/vendor/bun/typescript_libs.bin');
export const PROJECT_DIR = '/project';
export const LIB_DIR = '/libs';
const LAB_DIR = `${PROJECT_DIR}/lab`;
const TYPES_DIR = `${PROJECT_DIR}/types`;
const DEMO_SOURCES = path.join(root, 'demo/src');

/** Bun's bundle: a `u32` count, that many 52-byte records (name length, a 39-byte name, the frame's start and length, its
 * dictionary), then the files, each a zstd frame of its own (`src/runtime/cli/typescript_libs.rs`). From UCGE's reader. */
const NAME_LENGTH = 39;
const RECORD_LENGTH = 1 + NAME_LENGTH + 4 + 4 + 4;
/** The files that are the others' dictionaries; a record's dictionary is 1 or 2, or 0 for none. */
const DICTIONARIES = ['lib.es5.d.ts', 'lib.dom.d.ts'];

function libFiles(bundle) {
  const count = bundle.readUInt32LE(0);
  const records = Array.from({ length: count }, (_, index) => {
    const record = bundle.subarray(4 + index * RECORD_LENGTH, 4 + (index + 1) * RECORD_LENGTH);
    const start = record.readUInt32LE(1 + NAME_LENGTH);
    const frame = bundle.subarray(start, start + record.readUInt32LE(1 + NAME_LENGTH + 4));
    return { name: record.subarray(1, 1 + record[0]).toString('utf8'), frame, dictionary: record.readUInt32LE(1 + NAME_LENGTH + 8) };
  });
  const dictionaries = DICTIONARIES.map(name => {
    const record = records.find(entry => entry.name === name);
    if (!record) throw new Error(`The lib bundle has no ${name}`);
    return zstdDecompressSync(record.frame);
  });
  const texts = new Map();
  for (const record of records) {
    const dictionary = record.dictionary === 0 ? undefined : dictionaries[record.dictionary - 1];
    if (record.dictionary !== 0 && !dictionary) throw new Error(`${record.name} names dictionary ${record.dictionary}, which the bundle does not have`);
    texts.set(record.name, zstdDecompressSync(record.frame, dictionary ? { dictionary } : {}).toString('utf8'));
  }
  return texts;
}

/** The directory of a package in pnpm's layout, found from this repository. */
function packageDirectory(name) {
  const store = path.join(root, 'node_modules/.pnpm');
  const [folder] = readdirSync(store).filter(entry => entry.startsWith(`${name.replace('/', '+')}@`));
  if (!folder) throw new Error(`${name} is not installed`);
  return path.join(store, folder, 'node_modules', name);
}

function readText(file) {
  return readFileSync(file, 'utf8');
}

/** Every `.d.ts` under `directory` (recursively), as [path relative to it, text]. */
function declarations(directory, prefix = '') {
  const found = [];
  for (const entry of readdirSync(path.join(directory, prefix), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) found.push(...declarations(directory, relative));
    else if (entry.name.endsWith('.d.ts')) found.push([relative, readText(path.join(directory, relative))]);
  }
  return found;
}

/** The lab modules: every TSX file of the demo, and the modules each imports by a relative path (esbuild's input list). */
async function labModules() {
  const entries = readdirSync(DEMO_SOURCES).filter(name => name.endsWith('.tsx')).map(name => path.join(DEMO_SOURCES, name));
  const result = await build({
    absWorkingDir: root, entryPoints: entries, bundle: true, write: false, metafile: true, outdir: 'unused', format: 'esm',
    platform: 'neutral', logLevel: 'error', tsconfigRaw: '{}', packages: 'external', external: ['../../src'],
  });
  return Object.keys(result.metafile.inputs).map(input => path.join(root, input)).filter(file => file.startsWith(DEMO_SOURCES + path.sep));
}

/** Labs as the registry names them: `id` and `sources`, read from the registry's source text (an array of string literals). */
function labRegistry() {
  const text = readText(path.join(DEMO_SOURCES, 'labs.tsx'));
  const entries = [];
  for (const match of text.matchAll(/\bid: '([a-z0-9-]+)'[\s\S]*?\bsources: \[([^\]]*)\]/g)) {
    const sources = [...match[2].matchAll(/'res:\/\/src\/([^']+)'/g)].map(source => source[1]);
    entries.push({ id: match[1], sources });
  }
  return entries;
}

const COMPILER_OPTIONS = {
  target: 'ES2022',
  module: 'ESNext',
  moduleResolution: 'bundler',
  jsx: 'react-jsx',
  strict: true,
  noUncheckedIndexedAccess: true,
  esModuleInterop: true,
  skipLibCheck: true,
  noEmit: true,
  lib: ['ES2022'],
  types: [],
  paths: {
    react: [`./types/react/index.d.ts`],
    'react/jsx-runtime': [`./types/react/jsx-runtime.d.ts`],
    'react/jsx-dev-runtime': [`./types/react/jsx-dev-runtime.d.ts`],
    csstype: [`./types/csstype/index.d.ts`],
    'godot-react-ui': [`./types/godot-react-ui/index.d.ts`],
  },
};

/** The globals the labs use that the standard library does not declare (they run in a JavaScript host with a console and timers). */
const HOST_GLOBALS = `declare const console: {
  log(...data: unknown[]): void;
  warn(...data: unknown[]): void;
  error(...data: unknown[]): void;
  info(...data: unknown[]): void;
  debug(...data: unknown[]): void;
};
declare function setTimeout(handler: () => void, timeout?: number): number;
declare function clearTimeout(handle: number | undefined): void;
declare function setInterval(handler: () => void, timeout?: number): number;
declare function clearInterval(handle: number | undefined): void;
`;

const files = [];
function add(file, text) {
  files.push({ path: file, text });
}

/** The root library files of the configuration (`lib: ["ES2022"]` and the decorators the compiler always includes). */
const LIB_ROOTS = ['lib.es2022.d.ts', 'lib.decorators.d.ts', 'lib.decorators.legacy.d.ts'];

/** The library files the configuration reaches: the roots and what each names in a `/// <reference lib="..." />`. */
function reachableLibs(libs) {
  const reached = new Set();
  const visit = name => {
    if (reached.has(name)) return;
    const text = libs.get(name);
    if (text === undefined) throw new Error(`The lib bundle has no ${name}`);
    reached.add(name);
    for (const reference of text.matchAll(/\/\/\/\s*<reference\s+lib="([^"]+)"\s*\/>/g)) visit(`lib.${reference[1]}.d.ts`);
  };
  LIB_ROOTS.forEach(visit);
  return [...reached].sort();
}

let libs;
try {
  libs = libFiles(readFileSync(LIB_BUNDLE));
} catch (error) {
  if (error?.code === 'ZSTD_error_corruption_detected') {
    throw new Error(`Bun's lib bundle needs zstd dictionaries in node:zlib, which Node ${process.versions.node} lacks: run this with Node 24 (NODENV_VERSION=24.7.0)`);
  }
  throw error;
}
for (const name of reachableLibs(libs)) add(`${LIB_DIR}/${name}`, libs.get(name));

/** The library's declarations from its sources as they are now, not from a `dist/` an earlier build left (the same emit as `pnpm build`'s). */
function emitDeclarations() {
  const directory = path.join(root, 'artifacts/live-compile-types');
  rmSync(directory, { recursive: true, force: true });
  const result = spawnSync(path.join(root, 'node_modules/.bin/tsc'), ['-p', 'tsconfig.package.json', '--outDir', directory], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`tsc could not emit the library's declarations:\n${result.stdout}${result.stderr}`);
  return directory;
}

for (const [relative, text] of declarations(emitDeclarations())) add(`${TYPES_DIR}/godot-react-ui/${relative}`, text);
// One lab imports the library by its source path (`../../src`), as the demo's own bundle may; in the project that path is `/src`, from `/project/lab`, and it is the package.
add('/src/index.d.ts', "export * from 'godot-react-ui';\n");
// The four declaration files of @types/react that a project of the library needs (its `ts5.0` and `experimental` variants are not).
for (const name of ['index.d.ts', 'global.d.ts', 'jsx-runtime.d.ts', 'jsx-dev-runtime.d.ts']) {
  add(`${TYPES_DIR}/react/${name}`, readText(path.join(packageDirectory('@types/react'), name)));
}
add(`${TYPES_DIR}/csstype/index.d.ts`, readText(path.join(packageDirectory('csstype'), 'index.d.ts')));
add(`${PROJECT_DIR}/host-globals.d.ts`, HOST_GLOBALS);

const modules = await labModules();
for (const file of modules.sort()) add(`${LAB_DIR}/${path.relative(DEMO_SOURCES, file)}`, readText(file));

const labs = {};
for (const lab of labRegistry()) {
  const sources = lab.sources.map(source => `${LAB_DIR}/${source}`);
  for (const source of sources) {
    if (!files.some(file => file.path === source)) throw new Error(`The lab ${lab.id} names ${source}, which the project does not have`);
  }
  const config = `${PROJECT_DIR}/tsconfig.${lab.id}.json`;
  add(config, `${JSON.stringify({ compilerOptions: COMPILER_OPTIONS, files: ['host-globals.d.ts', ...sources.map(source => path.posix.relative(PROJECT_DIR, source))] }, null, 2)}\n`);
  labs[lab.id] = { config, sources };
}

const project = { version: 1, config: null, libDir: LIB_DIR, files, labs };
const text = JSON.stringify(project);
mkdirSync(path.dirname(OUTPUT), { recursive: true });
const staged = `${OUTPUT}.${process.pid}.tmp`;
writeFileSync(staged, text);
renameSync(staged, OUTPUT);
const digest = createHash('sha256').update(text).digest('hex').slice(0, 12);
console.log(`live-compile project: ${files.length} files, ${(text.length / 1024).toFixed(0)} KiB, ${Object.keys(labs).length} labs, sha256 ${digest} -> ${path.relative(root, OUTPUT)}`);
