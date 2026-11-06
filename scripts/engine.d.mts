export const ENGINE_VARIABLE: string;
export const ENGINE_FLAG: string;
export const DEFAULT_ENGINE: string;

export interface WebProfile {
  /** The export preset in `demo/export_presets.cfg` that carries this profile's engine templates. */
  presetName: string;
  /** The Emscripten SDK root the side module is linked with. */
  emscripten: string;
  /** Whether the templates use Breaka's lazy function-table ABI (the extension's final link must match). */
  lazyFunctionTable: boolean;
  nightly: string;
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
  artifactPath(...names: string[]): string;
  bindingEnvironment(): Record<string, string>;
  verifiedVersion(): string;
  recordInstalledLibrary(probe: boolean): void;
  requireInstalledLibrary(options?: { probe?: boolean }): void;
  recordInstalledWasm(probe: boolean): void;
  requireInstalledWasm(options?: { probe?: boolean }): void;
  prepareNative(options?: { probe?: boolean }): string;
}

export function argsWithoutEngine(argv: readonly string[]): string[];
export function selectEngineName(argv: readonly string[], env: Record<string, string | undefined>): string;
export function selectEngine(argv?: readonly string[], env?: Record<string, string | undefined>): Engine;
