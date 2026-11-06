export const ENGINE_VARIABLE: string;
export const ENGINE_FLAG: string;
export const DEFAULT_ENGINE: string;
/** The Cargo package both builds compile, and the one a stale target has cleaned. */
export const CARGO_PACKAGE: string;

export interface WebProfile {
  /** The export preset in `demo/export_presets.cfg` that carries this profile's engine templates. */
  presetName: string;
  /** The Emscripten SDK root the side module is linked with. */
  emscripten: string;
  /** Whether the templates use Breaka's lazy function-table ABI (the extension's final link must match). */
  lazyFunctionTable: boolean;
  nightly: string;
  /** Whether the engine's Web input turns a browser `touchcancel` into a cancelled touch (stock 4.7.2 does not). */
  reportsCancelledTouch: boolean;
}

/** Which artifact a build makes: the native library, or the Web side module. */
export type BuildKind = 'native' | 'web';

/** What a build is made from (scripts/freshness.mjs): cargo features and a content hash of every input file. */
export interface BuildInputs {
  features: string[];
  digest: string;
  inputs: Record<string, string>;
}

/** The steps that record a build, returned by `Engine.beginBuild`. */
export interface BuildRecord {
  /** Cargo has succeeded: stamp its output. Throws if the sources changed while it ran. */
  compiled(): void;
  /** The artifact is in place: stamp the installed copy. */
  installed(): void;
}

export interface Engine {
  name: string;
  description: string;
  /** The Godot binary: `GODOT` if set, else the profile's. */
  godot: string;
  versionPrefix: string;
  /** The directory of the API dump pair, undefined for the default profile (`.cargo/config.toml` names its own). */
  apiDirectory: string | undefined;
  artifacts: string;
  targets: { native: string; nativeProbe: string; web: string; webProbe: string };
  web: WebProfile;
  root: string;
  libraryName: string;
  installDirectory: string;
  installedLibrary: string;
  /** `release` if the arguments say `--release`, else `debug`. */
  webMode(argv?: readonly string[]): 'debug' | 'release';
  artifactPath(...names: string[]): string;
  bindingEnvironment(): Record<string, string>;
  verifiedVersion(): string;
  /** Throws unless the installed native library is this profile's build of the current sources. */
  requireInstalledLibrary(options?: { probe?: boolean }): void;
  /** Throws unless the installed Web side module is this profile's build of the current sources. */
  requireInstalledWasm(options?: { probe?: boolean }): void;
  installedWasmStamp(): Record<string, unknown> | undefined;
  /** Throws unless the library in the profile's native target directory is its build of the current sources. */
  requireBuiltLibrary(): void;
  /** Throws unless the Web export (`--release` or debug) carries this profile's side module built from the current sources. */
  requireFreshWebExport(options?: { probe?: boolean }): void;
  prepareNative(options?: { probe?: boolean }): string;
  /** The cargo features a build of `kind` enables. */
  features(kind: BuildKind, options?: { probe?: boolean }): string[];
  sourceInputs(kind: BuildKind, options?: { probe?: boolean }): BuildInputs;
  /** Hash the inputs, have `clean` run if cargo's last output is not provably a build of them, and return the recording steps. */
  beginBuild(kind: BuildKind, options: { probe?: boolean; clean: () => void }): BuildRecord;
}

export function argsWithoutEngine(argv: readonly string[]): string[];
export function selectEngineName(argv: readonly string[], env: Record<string, string | undefined>): string;
export function selectEngine(argv?: readonly string[], env?: Record<string, string | undefined>): Engine;
