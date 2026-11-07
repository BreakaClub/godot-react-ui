import type { BuildInputs } from './freshness.mjs';
import type { Engine } from './engine.mjs';

/** What the Web side module's build and checks read of an engine profile. */
export type WebProfile = Pick<Engine, 'name' | 'webBindingEnvironment'>;

/** What the Web export of a profile does with the extension: leave it out, or list the module stamped for the profile. */
export type LiveCompileWebPlan = { include: false } | { include: true; name: string; stamp: Record<string, unknown> | undefined };

/** Where the extension is built, stamped and installed (absolute paths). */
export interface LiveCompileLayout {
  targetDirectory: string;
  /** The library cargo leaves in the target directory, and the stamp beside it. */
  built: string;
  builtStamp: string;
  installDirectory: string;
  /** The installed library every demo run loads, its stamp and the manifest Godot reads. */
  library: string;
  stamp: string;
  manifest: string;
}

export const INSTALL_DIRECTORY: string;
export const LIBRARY_NAME: string;
export const INSTALLED_LIBRARY: string;
export const INSTALLED_STAMP: string;
export const GDEXTENSION_FILE: string;
export const BUN_CHECKOUT: string;
export const WEB_LIBRARY_NAME: string;
export const TARGET_DIRECTORY: string;
/** The command that builds and installs the extension. */
export const FIX: string;
export function liveCompileSourceFiles(): string[];
export function liveCompileInputs(): BuildInputs;
export function liveCompileLayout(): LiveCompileLayout;
/** Why a native run must not load the installed extension (undefined when it may); `required` also refuses an absent one. */
export function liveCompileRefusal(options?: { required?: boolean }): string | undefined;
/** Throws unless the extension is installed, bound to the native binding API and built from the current sources. */
export function requireLiveCompile(): void;
/** The file name of a profile's Web side module; Breaka's keeps `live_compile.web.wasm`. */
export function webLibraryNameOf(engine: Pick<Engine, 'name'>): string;
export function webLibraryOf(engine: Pick<Engine, 'name'>): string;
export function webStampOf(engine: Pick<Engine, 'name'>): string;
export function webTargetDirectoryOf(engine: Pick<Engine, 'name'>): string;
/** The command that builds the profile's Web side module. */
export function WEB_FIX(engine: Pick<Engine, 'name'>): string;
export function liveCompileWebInputs(engine: WebProfile): BuildInputs;
/** What the profile's Web export does with the extension; throws, naming the build, if a module is installed that is not this profile's current build. */
export function liveCompileWebPlan(engine: WebProfile): LiveCompileWebPlan;
/** Why an export's files do not carry exactly the module its receipt records (`null` for none), or undefined if they do. */
export function liveCompileWebExportProblem(engine: WebProfile, directory: string, recorded: unknown): string | undefined;
/** Throws, naming the build, unless the export in `directory` carries the profile's live-compile Web side module. */
export function requireLiveCompileWebModule(engine: Pick<Engine, 'name'>, directory: string, mode: 'debug' | 'release'): void;
export function removeLiveCompileWebModules(directory: string): void;
/** Run `action` with the extension's manifest out of the project and put it back afterwards, whatever `action` does. */
export function withoutLiveCompileManifest<T>(action: () => T, manifest?: string): T;
/** The extension's manifest; a Web library is listed only when the caller names its file (the profile's Web export does, just before exporting). */
export function writeGdextension(options?: { installDirectory?: string; webLibrary?: string }): void;
