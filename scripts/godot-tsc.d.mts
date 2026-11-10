import type { Engine } from './engine.mjs';

/** What the Web checks read of an engine profile. */
export type WebProfile = Pick<Engine, 'name' | 'webBindingEnvironment'>;

/** The Godot dump pair a godot-tsc binary is bound to, as its build record has it. */
export interface Binding {
  extensionApiSha256: string;
  gdextensionInterfaceSha256: string;
}

/** The package's `addon/godot-tsc/build.json`, as far as the scripts read it. */
export interface BuildRecord {
  version: string;
  nativeApi: Binding & { version: string };
  webModules: Record<string, { profile: string; binding: Binding }>;
  /** Every binary of the addon's `bin/`, by file name: its SHA-256. */
  binaries: Record<string, string>;
}

/** What the Web export of a profile does with the extension: leave it out, or list the profile's module. */
export type GodotTscWebPlan = { include: false } | { include: true; name: string; sha256: string };

export const PACKAGE_DIRECTORY: string;
export const PACKAGED_ADDON: string;
export const INSTALL_DIRECTORY: string;
export const INSTALLED_RECORD: string;
export const GDEXTENSION_FILE: string;
/** The command that installs the package's addon into the demo. */
export const FIX: string;
/** The environment variable that names a built `godot-tsc-cli`, the package's native test process (a checkout of godot-tsc builds it). */
export const CLI_VARIABLE: string;
/** What to do to give the tests the process. */
export const CLI_FIX: string;
/** The process `GODOT_TSC_CLI` names, or undefined when the variable is not set; throws when it names no file. */
export function godotTscCli(env?: Record<string, string | undefined>): string | undefined;
export function typescriptLibBundle(): string;
export function parseBuildRecord(text: string, source: string): BuildRecord;
export function isInstalled(): boolean;
/** Why a native run must not load the installed addon (undefined when it may); `required` also refuses an absent one. */
export function godotTscRefusal(options?: { required?: boolean }): string | undefined;
/** Throws unless the package's current addon is installed in the demo and bound to the native binding API. */
export function requireGodotTsc(): void;
export function webModuleNameOf(engine: Pick<Engine, 'name'>): string;
export function webModuleOf(engine: Pick<Engine, 'name'>): string;
/** Throws unless the export in `directory` carries the profile's godot-tsc Web side module. */
export function requireGodotTscWebModule(engine: Pick<Engine, 'name'>, directory: string, mode: 'debug' | 'release'): void;
export function removeGodotTscWebModules(directory: string): void;
/** What the profile's Web export does with the extension; throws, saying what fixes it, if the installed addon is not the package's current one. */
export function godotTscWebPlan(engine: WebProfile): GodotTscWebPlan;
/** Why an export's files do not carry exactly the module its receipt records (`null` for none), or undefined if they do. */
export function godotTscWebExportProblem(engine: WebProfile, directory: string, recorded: unknown): string | undefined;
/** The package's manifest with its Web library lines naming `webLibrary`. */
export function manifestNaming(packagedManifest: string, webLibrary: string): string;
/** Run `action` with the installed manifest as `plan` decides (naming the profile's module, or out of the project), then put the package's back. */
export function withGodotTscWebManifest<T>(plan: GodotTscWebPlan, action: () => T): T;
/** Run `action` with the addon's manifest out of the project and put it back afterwards, whatever `action` does. */
export function withoutGodotTscManifest<T>(action: () => T, manifest?: string): T;
