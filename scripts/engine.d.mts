import type { BuildInputs, BuildRecord } from './freshness.mjs';

export type { BuildInputs, BuildRecord };

export const ENGINE_VARIABLE: string;
export const ENGINE_FLAG: string;
export const DEFAULT_ENGINE: string;
/** The Cargo package the native and the Web build compile, and the one a stale target has cleaned. */
export const CARGO_PACKAGE: string;

/** The Web side module's file in the addon for each threading of a Web export, as `react_ui.gdextension` names it. */
export const WEB_LIBRARY_NAMES: { readonly threads: string; readonly nothreads: string };

/**
 * Which Web build: the probe build, or (with `threads: false`) the side module for an export without threads. The two do not combine, and
 * only a profile with a `webNothreads` target has the second.
 */
export interface WebBuildOptions {
  probe?: boolean;
  threads?: boolean;
}

export interface WebProfile {
  /** The export preset in `demo/export_presets.cfg` that carries this profile's engine templates. */
  presetName: string;
  /** The Emscripten SDK root the side module is linked with (4.0.11 for stock, 6.0.12 for Breaka's). */
  emscripten: string;
  /** Whether the templates use Breaka's lazy function-table ABI (the extension's final link must match). */
  lazyFunctionTable: boolean;
  nightly: string;
  /** Whether the engine's Web input turns a browser `touchcancel` into a cancelled touch (stock 4.7.2 does not). */
  reportsCancelledTouch: boolean;
}

export interface Engine {
  name: string;
  description: string;
  /** The Godot binary: `GODOT` if set, else the profile's. */
  godot: string;
  versionPrefix: string;
  /** The directory of the API dump pair the profile's Web build is bound to. The native builds are bound to `NATIVE_BINDING_API` instead. */
  apiDirectory: string;
  artifacts: string;
  /** The profile's Web cargo target directories. The native builds have none per profile (scripts/native-binding.mjs `NATIVE_TARGETS`). */
  targets: { web: string; webProbe: string; webNothreads?: string };
  web: WebProfile;
  root: string;
  /** `release` if the arguments say `--release`, else `debug`. */
  webMode(argv?: readonly string[]): 'debug' | 'release';
  artifactPath(...names: string[]): string;
  /** The API dump pair the profile's Web build binds against, as godot-rust's environment variables. */
  webBindingEnvironment(): Record<string, string>;
  /** The `godot --version` line. Throws if the binary is not the profile's, or is older than the API the native builds are bound to. */
  verifiedVersion(): string;
  /**
   * Throws unless every native build a demo run loads may be loaded: the UI library and, if one is installed, the godot-tsc addon
   * (`godotTsc: false` skips it, for a run that takes it out of the project). Bound to `NATIVE_BINDING_API`, the variant asked for, built from the
   * current sources; the profile does not enter into it.
   */
  requireInstalledBuilds(options?: { probe?: boolean; faults?: boolean; godotTsc?: boolean }): void;
  /** Throws unless the installed Web side module is this profile's build of the current sources. */
  requireInstalledWasm(options?: WebBuildOptions): void;
  installedWasmStamp(): Record<string, unknown> | undefined;
  /** Throws unless the library in the native target directory is a build of the current sources bound to the native API. */
  requireBuiltLibrary(): void;
  /** Throws unless the Web export (`--release` or debug) carries this profile's side module built from the current sources. */
  requireFreshWebExport(options?: { probe?: boolean }): void;
  prepareNative(options?: { probe?: boolean; faults?: boolean; godotTsc?: boolean }): string;
  /** The cargo features a Web build enables. */
  webFeatures(options?: WebBuildOptions): string[];
  webSourceInputs(options?: WebBuildOptions): BuildInputs;
  /** Where a Web build is compiled (its cargo target directory), where cargo leaves its module and where the module is installed. */
  webBuildPaths(options?: WebBuildOptions): { target: string; built: string; installed: string };
  /** The inputs of the pack, shell and engine template of the Web export in `mode` (scripts/web-content.mjs). */
  webContentInputs(mode: string): BuildInputs;
  /** Hash the Web build's inputs, have `clean` run if cargo's last output is not provably a build of them, and return the recording steps. */
  beginWebBuild(options: WebBuildOptions & { clean: () => void }): BuildRecord;
}

export function argsWithoutEngine(argv: readonly string[]): string[];
export function selectEngineName(argv: readonly string[], env: Record<string, string | undefined>): string;
export function selectEngine(argv?: readonly string[], env?: Record<string, string | undefined>): Engine;

/** How to start `godot` without its launcher script, if it is a profile's script. */
export function directLaunchOf(godot: string): { command: string; env: Record<string, string>; directories: string[] } | undefined;
