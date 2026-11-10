import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rejectUnknownArguments } from './arguments.mjs';
import { machOArchitectures } from './macho.mjs';
import { importsSharedMemory } from './wasm-memory.mjs';

// `--require-all-platforms` is how a release stages: every library the extension's manifest names must be in the source, the macOS library
// must hold every architecture the manifest gives it to, and each Web side module must import the memory of its threading, or nothing is
// staged. Without it the script stages whatever is there, which is what a checkout that has built one platform has (`prepack` runs it that
// way).
const REQUIRE_ALL_PLATFORMS = '--require-all-platforms';
rejectUnknownArguments(process.argv.slice(2), { flags: [REQUIRE_ALL_PLATFORMS], prefixes: ['--source='], engine: false });

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const sourceArg = process.argv.slice(2).find((arg) => arg.startsWith('--source='));
const sourceDir = sourceArg ? resolve(sourceArg.slice('--source='.length)) : resolve(root, 'demo', 'addons', 'godot-react-ui');
const destDir = resolve(root, 'addon', 'godot-react-ui');

const requireAllPlatforms = process.argv.slice(2).includes(REQUIRE_ALL_PLATFORMS);
const MANIFEST = 'react_ui.gdextension';
// Where the manifest says each library is, inside a project the addon is installed into.
const INSTALLED_BIN = 'res://addons/godot-react-ui/bin/';

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

/** The library files a manifest names under `[libraries]`, each with the feature tags that select it (`macos.release.arm64`, ...). */
function manifestLibraries(manifest) {
  const libraries = new Map();
  let section = '';
  for (const line of manifest.split('\n')) {
    const heading = /^\[(.+)\]\s*$/u.exec(line);
    if (heading) {
      section = heading[1];
      continue;
    }
    const entry = /^([^=\s]+)\s*=\s*"(.+)"\s*$/u.exec(line);
    if (section !== 'libraries' || !entry) continue;
    const [, tags, path] = entry;
    if (!path.startsWith(INSTALLED_BIN)) throw new Error(`[stage-addon] ${MANIFEST} names a library outside ${INSTALLED_BIN}: ${path}`);
    const name = path.slice(INSTALLED_BIN.length);
    libraries.set(name, [...libraries.get(name) ?? [], tags.split('.')]);
  }
  return libraries;
}

/**
 * Why a library is not the one its feature tags promise, or undefined. A macOS library is one file for every architecture, and a Web side
 * module is one of two that differ only in the memory they import: the name alone does not say that the right build is under it.
 */
function mismatch(name, tagSets, bytes) {
  const [platform] = tagSets[0];
  if (platform === 'macos') {
    const promised = [...new Set(tagSets.map(tags => tags.at(-1)))];
    const held = machOArchitectures(bytes);
    const lacking = promised.filter(architecture => !held.includes(architecture));
    if (lacking.length > 0) return `${name} holds ${held.join(', ')} and not ${lacking.join(', ')}`;
  }
  if (platform === 'web') {
    const threaded = tagSets.some(tags => tags.includes('threads'));
    if (importsSharedMemory(bytes) !== threaded) {
      return `${name} imports ${threaded ? 'an unshared' : 'a shared'} memory, so it is not a side module ${threaded ? 'with' : 'without'} threads`;
    }
  }
  return undefined;
}

if (!existsSync(sourceDir)) {
  if (requireAllPlatforms) throw new Error(`[stage-addon] ${REQUIRE_ALL_PLATFORMS}: source directory not found: ${sourceDir}`);
  console.warn(`[stage-addon] Source directory not found: ${sourceDir}`);
  process.exit(0);
}

if (requireAllPlatforms) {
  const libraries = manifestLibraries(readFileSync(join(sourceDir, MANIFEST), 'utf8'));
  const names = [...libraries.keys()];
  if (names.length === 0) throw new Error(`[stage-addon] ${REQUIRE_ALL_PLATFORMS}: ${MANIFEST} names no library`);
  const missing = names.filter((name) => !existsSync(join(sourceDir, 'bin', name)));
  if (missing.length > 0) {
    throw new Error(`[stage-addon] ${REQUIRE_ALL_PLATFORMS}: ${join(sourceDir, 'bin')} lacks ${missing.join(', ')} (${MANIFEST} names ${names.join(', ')}). Nothing was staged.`);
  }
  const mismatches = names.map((name) => mismatch(name, libraries.get(name), readFileSync(join(sourceDir, 'bin', name)))).filter((reason) => reason !== undefined);
  if (mismatches.length > 0) throw new Error(`[stage-addon] ${REQUIRE_ALL_PLATFORMS}: ${mismatches.join('; ')}. Nothing was staged.`);
}

mkdirSync(join(destDir, 'bin'), { recursive: true });

// Copy extension manifest and metadata
for (const file of [MANIFEST, `${MANIFEST}.uid`]) {
  const src = join(sourceDir, file);
  if (existsSync(src)) {
    cpSync(src, join(destDir, file), { force: true });
  }
}

// Copy binaries from source/bin
const sourceBin = join(sourceDir, 'bin');
let binaryCount = 0;
if (existsSync(sourceBin)) {
  const binaryExtensions = new Set(['.dylib', '.so', '.dll', '.wasm']);
  for (const entry of readdirSync(sourceBin)) {
    const ext = entry.slice(entry.lastIndexOf('.'));
    if (binaryExtensions.has(ext)) {
      cpSync(join(sourceBin, entry), join(destDir, 'bin', entry), { force: true });
      binaryCount++;
    }
  }
}

writeFileSync(join(destDir, '.version'), pkg.version, 'utf8');
console.log(`[stage-addon] Staged godot-react-ui v${pkg.version} addon with ${binaryCount} binary file(s) into ${destDir}`);
