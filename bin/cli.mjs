#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '..');
const PACKAGED_ADDON_DIR = join(PACKAGE_ROOT, 'addon', 'godot-react-ui');
const DEV_ADDON_DIR = join(PACKAGE_ROOT, 'demo', 'addons', 'godot-react-ui');
const SOURCE_ADDON_DIR = existsSync(PACKAGED_ADDON_DIR) ? PACKAGED_ADDON_DIR : DEV_ADDON_DIR;

// Read the package metadata
const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf8'));

/**
 * Ascend directory tree looking for project.godot
 */
function findGodotRoot(startDir) {
  let current = resolve(startDir);
  while (true) {
    if (existsSync(join(current, 'project.godot'))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

/**
 * Ensure node_modules/.gdignore exists to prevent Godot from locking/indexing npm dependencies
 */
function ensureGdignore(godotRoot) {
  const nodeModulesDir = join(godotRoot, 'node_modules');
  if (existsSync(nodeModulesDir)) {
    const gdignorePath = join(nodeModulesDir, '.gdignore');
    if (!existsSync(gdignorePath)) {
      writeFileSync(gdignorePath, '');
      return true;
    }
  }
  return false;
}

function printHelp() {
  console.log(`
godot-react-ui v${pkg.version} CLI

Usage:
  godot-react-ui setup [options]     Install or update the GDExtension in your Godot project

Options:
  --project-dir <path>  Path to the Godot project directory (defaults to searching upwards)
  --force               Reinstall addon files even if version matches
  --help, -h            Show this help message
`);
}

function run() {
  const args = process.argv.slice(2);
  const isPostinstall = args.includes('--postinstall');

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  // Custom project dir override: --project-dir <path>
  const dirArgIndex = args.indexOf('--project-dir');
  const customDir = dirArgIndex !== -1 ? args[dirArgIndex + 1] : null;

  // npm, pnpm, and yarn set INIT_CWD to the directory where the user ran the command
  const searchStart = customDir ?? process.env.INIT_CWD ?? process.cwd();

  // Guard: if running inside godot-react-ui's own dev repository during development, skip
  if (isPostinstall && resolve(searchStart) === PACKAGE_ROOT) {
    return;
  }

  // Guard: check that prebuilt addon exists in this npm package
  if (!existsSync(SOURCE_ADDON_DIR)) {
    if (!isPostinstall) {
      console.error(`[godot-react-ui] Error: Prebuilt addon directory not found at ${SOURCE_ADDON_DIR}`);
      process.exit(1);
    }
    return;
  }

  const godotRoot = findGodotRoot(searchStart);

  if (!godotRoot) {
    if (isPostinstall) {
      // Quiet no-op in monorepo roots, backend subprojects, or non-Godot contexts
      console.log(`[godot-react-ui] Note: No project.godot found near ${searchStart}. Run 'pnpm exec godot-react-ui setup' in your Godot project root to link the extension.`);
      return;
    } else {
      console.error(`[godot-react-ui] Error: Could not locate 'project.godot' ascending from: ${searchStart}`);
      console.error(`Please run the command from inside your Godot project directory or specify --project-dir <path>.`);
      process.exit(1);
    }
  }

  const targetAddonDir = join(godotRoot, 'addons', 'godot-react-ui');

  // Check version stamp to avoid redundant disk churn
  const stampFile = join(targetAddonDir, '.version');
  if (existsSync(stampFile)) {
    try {
      const installedVersion = readFileSync(stampFile, 'utf8').trim();
      if (installedVersion === pkg.version && !args.includes('--force')) {
        if (!isPostinstall) {
          console.log(`[godot-react-ui] Addon is already up to date (v${pkg.version}) at res://addons/godot-react-ui/`);
        }
        return;
      }
    } catch {
      // Proceed with copy on read error
    }
  }

  // Sync addon files
  mkdirSync(targetAddonDir, { recursive: true });
  cpSync(SOURCE_ADDON_DIR, targetAddonDir, { recursive: true, force: true });
  writeFileSync(stampFile, pkg.version, 'utf8');

  // Ensure node_modules has .gdignore
  const createdGdignore = ensureGdignore(godotRoot);

  console.log(`✓ [godot-react-ui] Installed GDExtension v${pkg.version} to res://addons/godot-react-ui/`);
  if (createdGdignore) {
    console.log(`✓ [godot-react-ui] Created node_modules/.gdignore (prevents Godot editor hang)`);
  }
}

run();
