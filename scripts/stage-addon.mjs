import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rejectUnknownArguments } from './arguments.mjs';

rejectUnknownArguments(process.argv.slice(2), { prefixes: ['--source='], engine: false });

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const sourceArg = process.argv.slice(2).find((arg) => arg.startsWith('--source='));
const sourceDir = sourceArg ? resolve(sourceArg.slice('--source='.length)) : resolve(root, 'demo', 'addons', 'godot-react-ui');
const destDir = resolve(root, 'addon', 'godot-react-ui');

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

if (!existsSync(sourceDir)) {
  console.warn(`[stage-addon] Source directory not found: ${sourceDir}`);
  process.exit(0);
}

mkdirSync(join(destDir, 'bin'), { recursive: true });

// Copy extension manifest and metadata
for (const file of ['react_ui.gdextension', 'react_ui.gdextension.uid']) {
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
