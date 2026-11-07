import type { BuildInputs } from './freshness.mjs';
import type { SwitchResult } from './freshness.mjs';

/** What the live-compile build reads of an engine profile. */
export interface LiveCompileEngine {
  name: string;
  bindingEnvironment(): Record<string, string>;
}

/** Where the profile's extension is built, stamped and installed (absolute paths below one repository). */
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
export function targetDirectoryOf(engine: Pick<LiveCompileEngine, 'name'>): string;
/** The command that builds the profile's extension. */
export function FIX(engine: Pick<LiveCompileEngine, 'name'>): string;
/** The command that installs the profile's built extension from its target directory. */
export function INSTALL_FIX(engine: Pick<LiveCompileEngine, 'name'>): string;
export function liveCompileSourceFiles(base?: string): string[];
export function liveCompileInputs(engine: LiveCompileEngine, base?: string): BuildInputs;
export function liveCompileLayout(engine: Pick<LiveCompileEngine, 'name'>, base?: string): LiveCompileLayout;
/** Why a run must not load the installed extension (undefined when it may); `required` also refuses an absent one. */
export function liveCompileRefusal(engine: LiveCompileEngine, options?: { required?: boolean; base?: string }): string | undefined;
/** Throws unless the extension is installed as the profile's build of the current sources. */
export function requireLiveCompile(engine: LiveCompileEngine, options?: { base?: string }): void;
/** Install the profile's build from its target directory when that is current and the installed one is not usable. */
export function switchLiveCompile(engine: LiveCompileEngine, options?: { base?: string }): SwitchResult;
export function writeGdextension(options?: { installDirectory?: string }): void;
