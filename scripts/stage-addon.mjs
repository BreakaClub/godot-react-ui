import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rejectUnknownArguments } from './arguments.mjs';

// `--require-all-platforms` is how a release stages: every library the extension's manifest names must be in the source, or nothing is staged.
// Without it the script stages whatever is there, which is what a checkout that has built one platform has (`prepack` runs it that way).
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

/** The library files a manifest names under `[libraries]`, each once. */
function manifestLibraries(manifest) {
  const names = new Set();
  let section = '';
  for (const line of manifest.split('\n')) {
    const heading = /^\[(.+)\]\s*$/u.exec(line);
    if (heading) {
      section = heading[1];
      continue;
    }
    const entry = /^[^=]+=\s*"(.+)"\s*$/u.exec(line);
    if (section !== 'libraries' || !entry) continue;
    if (!entry[1].startsWith(INSTALLED_BIN)) throw new Error(`[stage-addon] ${MANIFEST} names a library outside ${INSTALLED_BIN}: ${entry[1]}`);
    names.add(entry[1].slice(INSTALLED_BIN.length));
  }
  return [...names];
}

if (!existsSync(sourceDir)) {
  if (requireAllPlatforms) throw new Error(`[stage-addon] ${REQUIRE_ALL_PLATFORMS}: source directory not found: ${sourceDir}`);
  console.warn(`[stage-addon] Source directory not found: ${sourceDir}`);
  process.exit(0);
}

if (requireAllPlatforms) {
  const libraries = manifestLibraries(readFileSync(join(sourceDir, MANIFEST), 'utf8'));
  if (libraries.length === 0) throw new Error(`[stage-addon] ${REQUIRE_ALL_PLATFORMS}: ${MANIFEST} names no library`);
  const missing = libraries.filter((name) => !existsSync(join(sourceDir, 'bin', name)));
  if (missing.length > 0) {
    throw new Error(`[stage-addon] ${REQUIRE_ALL_PLATFORMS}: ${join(sourceDir, 'bin')} lacks ${missing.join(', ')} (${MANIFEST} names ${libraries.join(', ')}). Nothing was staged.`);
  }
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
