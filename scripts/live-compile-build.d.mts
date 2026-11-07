import type { BuildInputs } from './freshness.mjs';

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
export function writeGdextension(options?: { installDirectory?: string }): void;
