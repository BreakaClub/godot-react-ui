import assert from 'node:assert/strict';
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mock } from 'node:test';
import type { Engine } from '../scripts/engine.mjs';
import type * as Freshness from '../scripts/freshness.mjs';
import type * as LiveCompileBuild from '../scripts/live-compile-build.mjs';
import type * as NativeBinding from '../scripts/native-binding.mjs';

// A temporary repository holding the real scripts that decide what a native run and a Web export may load (engine.mjs, freshness.mjs, live-compile-build.mjs,
// native-binding.mjs, web-content.mjs, arguments.mjs), with a stub for `godot --version`: the real wiring runs with no cargo, no Godot and no window.
// tests/single-build.test.ts uses it for the native guard, tests/stock-web.test.ts for the Web side modules.

export const SCRIPTS = join(__dirname, '..', 'scripts');
export const COPIED_SCRIPTS = ['engine', 'freshness', 'live-compile-build', 'native-binding', 'web-content', 'arguments'];
export const BREAKA_VERSION = '4.8.beta.custom_build.1225394ce';
export const STOCK_VERSION = '4.7.2.stable.custom_build.ed1daf0bf';
export const DUMP_HEADER = (version: string): string => `{\n\t"header": {\n\t\t"version_major": 4,\n\t\t"version_minor": ${version.split('.')[1]},\n\t\t"version_patch": ${version.split('.')[2]},\n\t\t"version_status": "stable"\n\t}\n}`;
export const NATIVE_BUILD = 'pnpm build:native';
export const LIVE_COMPILE_BUILD = 'node scripts/build-live-compile.mjs';
export const OTHER_API = { api: '4.8.0', dump: 'ab'.repeat(32) };

export type ProfileName = 'breaka' | 'stock';
export type Variant = { probe?: boolean; faults?: boolean };

export interface Skeleton {
  root: string;
  engine(name: ProfileName, version?: string): Engine;
  native: typeof NativeBinding;
  liveCompile: typeof LiveCompileBuild;
  /** A native compile that left `bytes` in the variant's target directory, recorded as `scripts/build-native.mjs` records it; `install` also installs it. */
  buildNative(bytes: string, options?: Variant & { install?: boolean }): void;
  /** The same for the live-compile extension (`scripts/build-live-compile.mjs`). */
  buildLiveCompile(bytes: string, options?: { install?: boolean }): void;
  write(path: string, content: string): void;
  /** Rewrite the installed native library's stamp: another API, another profile's identity, and so on. */
  restampNative(change: (stamp: Record<string, unknown>) => void): void;
  restampLiveCompile(change: (stamp: Record<string, unknown>) => void): void;
  /** Make the repository one git knows, with the export presets and engine templates `webContentInputs` reads, so a Web export can be checked. */
  prepareWeb(): void;
  /** The UI library's Web side module for the profile, built and installed as `pnpm build:web --wasm-only` leaves it. */
  buildWebUi(name: ProfileName, bytes?: string): void;
  /** The live-compile Web side module for the profile, built, stamped and installed as `scripts/build-live-compile-web.mjs` leaves it. */
  buildLiveCompileWeb(name: ProfileName, bytes: string): void;
  /**
   * A debug Web export of the profile as `scripts/build-web.mjs` leaves it: the UI side module, `files` beside it and a receipt. The receipt records
   * `liveCompile` as given (`null` for none; leave it out to write a receipt from before the field existed).
   */
  writeWebExport(name: ProfileName, options?: { files?: Record<string, string>; liveCompile?: unknown; withoutLiveCompileField?: boolean }): string;
  /** The profile's export directory (`artifacts/web-debug`, `artifacts/stock/web-debug`). */
  exportDirectory(name: ProfileName): string;
}

export function write(root: string, path: string, content: string): string {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  return file;
}

/** A Godot stand-in that answers `--version` the way a binary does. */
function stubGodot(root: string, name: string, version: string): string {
  const stub = write(root, `bin/godot-${name}`, `#!/bin/sh\necho '${version}'\n`);
  chmodSync(stub, 0o755);
  return stub;
}

export async function makeSkeleton(): Promise<Skeleton> {
  // The real path: the scripts find their root from where they are, and the temporary directory is a symbolic link on macOS.
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'single-build-')));
  for (const name of COPIED_SCRIPTS) {
    mkdirSync(join(root, 'scripts'), { recursive: true });
    copyFileSync(join(SCRIPTS, `${name}.mjs`), join(root, 'scripts', `${name}.mjs`));
  }
  for (const path of [
    'Cargo.toml', 'Cargo.lock', 'native/lib.rs',
    'live-compile/core/lib.rs', 'live-compile/ext/lib.rs', 'live-compile/patches/bun.patch', 'live-compile/stubs/io.rs',
    'live-compile/Cargo.toml', 'live-compile/Cargo.lock', 'live-compile/rust-toolchain.toml', 'live-compile/.cargo/config.toml', 'live-compile/scripts/vendor-bun.py',
  ]) write(root, path, `contents of ${path}\n`);
  // The 4.7.2 pair the native builds are bound to, and Breaka's 4.8 pair its Web build is.
  for (const [directory, version] of [['native/api/stock-4.7.2', '4.7.2'], ['native/api', '4.8.0']] as const) {
    write(root, `${directory}/extension_api.json`, DUMP_HEADER(version));
    write(root, `${directory}/gdextension_interface.json`, `{"interface":"${version}"}`);
  }
  const godots = { breaka: stubGodot(root, 'breaka', BREAKA_VERSION), stock: stubGodot(root, 'stock', STOCK_VERSION) };
  const engineModule: typeof import('../scripts/engine.mjs') = await import(pathToFileURL(join(root, 'scripts/engine.mjs')).href);
  const native: typeof NativeBinding = await import(pathToFileURL(join(root, 'scripts/native-binding.mjs')).href);
  const liveCompile: typeof LiveCompileBuild = await import(pathToFileURL(join(root, 'scripts/live-compile-build.mjs')).href);
  const freshness: typeof Freshness = await import(pathToFileURL(join(root, 'scripts/freshness.mjs')).href);
  const quietly = <T>(action: () => T): T => {
    const log = mock.method(console, 'log', () => undefined);
    try {
      return action();
    } finally {
      log.mock.restore();
    }
  };
  const restamp = (path: string, change: (stamp: Record<string, unknown>) => void): void => {
    const stamp = freshness.readStamp(path);
    assert.ok(stamp !== undefined, `${path} has a stamp to change`);
    change(stamp);
    freshness.writeStamp(path, stamp);
  };
  const engine = (name: ProfileName, version?: string): Engine => engineModule.selectEngine([`--engine=${name}`], { GODOT: version === undefined ? godots[name] : stubGodot(root, `${name}-${version}`, version) });
  const sha = (bytes: string | Buffer): string => createHash('sha256').update(bytes).digest('hex');
  return {
    root, native, liveCompile, engine,
    write: (path, content) => { write(root, path, content); },
    buildNative(bytes, { install = false, probe = false, faults = false } = {}) {
      const variant = native.nativeVariant({ probe, faults });
      write(root, variant.built.slice(root.length + 1), bytes);
      // The build script's own steps: `beginNativeBuild` hashes the inputs, `compiled` stamps cargo's output, `installed` stamps the installed copy.
      quietly(() => {
        const build = native.beginNativeBuild({ probe, faults, clean: () => undefined });
        build.compiled();
        if (install) {
          freshness.installFile(variant.built, native.NATIVE_INSTALLED_LIBRARY);
          build.installed();
        }
      });
    },
    buildLiveCompile(bytes, { install = false } = {}) {
      const layout = liveCompile.liveCompileLayout();
      write(root, layout.built.slice(root.length + 1), bytes);
      quietly(() => {
        const build = freshness.beginBuild({
          identity: { binding: native.nativeBinding() }, probe: false, collect: liveCompile.liveCompileInputs,
          built: layout.built, targetStamp: layout.builtStamp, installed: layout.library, installedStamp: layout.stamp,
          subject: 'liblive_compile built in live-compile/target', compiler: 'cargo', fix: liveCompile.FIX, crate: 'live_compile_core', clean: () => undefined,
        });
        build.compiled();
        if (install) {
          freshness.installFile(layout.built, layout.library);
          liveCompile.writeGdextension({ installDirectory: layout.installDirectory });
          build.installed();
        }
      });
    },
    restampNative: change => restamp(native.NATIVE_INSTALLED_STAMP, change),
    restampLiveCompile: change => restamp(liveCompile.INSTALLED_STAMP, change),
    prepareWeb() {
      execFileSync('git', ['init', '-q'], { cwd: root });
      write(root, 'demo/src/main.ts', 'main\n');
      const presets = ['Web', 'Web (stock)'].map((name, index) => {
        const template = (mode: string): string => write(root, `templates/${index}-${mode}.zip`, `template ${name} ${mode}`);
        return `[preset.${index}]\nname="${name}"\n\n[preset.${index}.options]\ncustom_template/debug="${template('debug')}"\ncustom_template/release="${template('release')}"\n`;
      });
      write(root, 'demo/export_presets.cfg', `${presets.join('\n')}\n`);
    },
    buildWebUi(name, bytes = `ui side module for ${name}`) {
      const profile = engine(name);
      const built = write(profile.targets.web, 'wasm32-unknown-emscripten/release/godot_react_ui.wasm', bytes);
      quietly(() => {
        const build = profile.beginWebBuild({ clean: () => undefined });
        build.compiled();
        freshness.installFile(built, join(native.NATIVE_INSTALL_DIRECTORY, 'godot_react_ui.web.wasm'));
        build.installed();
      });
    },
    buildLiveCompileWeb(name, bytes) {
      const profile = engine(name);
      const built = write(liveCompile.webTargetDirectoryOf(profile), 'wasm32-unknown-emscripten/wasm/live_compile.wasm', bytes);
      quietly(() => {
        const build = freshness.beginBuild({
          identity: { engine: name }, probe: false, collect: () => liveCompile.liveCompileWebInputs(profile),
          built, targetStamp: join(liveCompile.webTargetDirectoryOf(profile), 'live_compile.web.build.json'),
          installed: liveCompile.webLibraryOf(profile), installedStamp: liveCompile.webStampOf(profile),
          subject: 'live_compile.wasm built in live-compile/target', compiler: 'cargo', fix: liveCompile.WEB_FIX(profile), crate: 'live_compile_core', clean: () => undefined,
        });
        build.compiled();
        freshness.installFile(built, liveCompile.webLibraryOf(profile));
        build.installed();
      });
    },
    exportDirectory: name => engine(name).artifactPath('web-debug'),
    writeWebExport(name, { files = {}, liveCompile: recorded, withoutLiveCompileField = false } = {}) {
      const profile = engine(name);
      const directory = profile.artifactPath('web-debug');
      const ui = join(native.NATIVE_INSTALL_DIRECTORY, 'godot_react_ui.web.wasm');
      rmSync(directory, { recursive: true, force: true });
      write(directory, 'godot_react_ui.web.wasm', readFileSync(ui, 'utf8'));
      write(directory, 'index.html', 'page');
      for (const [file, content] of Object.entries(files)) write(directory, file, content);
      const listed = readdirSync(directory).filter(file => file !== 'build-receipt.json');
      write(directory, 'build-receipt.json', `${JSON.stringify({
        engine: name, mode: 'debug', extension: profile.installedWasmStamp(), content: profile.webContentInputs('debug'),
        ...withoutLiveCompileField ? {} : { liveCompile: recorded ?? null },
        files: listed.map(file => ({ name: file, bytes: statSync(join(directory, file)).size, sha256: sha(readFileSync(join(directory, file))) })),
      }, null, 2)}\n`);
      return directory;
    },
  };
}

