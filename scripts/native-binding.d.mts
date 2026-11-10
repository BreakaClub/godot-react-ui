import type { BuildInputs, BuildRecord } from './freshness.mjs';

/** What a native build is bound to, as its stamp records it: the Godot API version and the hash of the dump pair. */
export interface NativeBinding {
  api: string;
  dump: string;
}

/** The Godot API the native builds are compiled against, and the dump pair godot-rust generates its bindings from. */
export interface NativeBindingApi {
  readonly version: string;
  readonly dumps: { readonly extensionApi: string; readonly gdextensionInterface: string };
}

/** One variant of the native build (default, probe or faults): its target directory, cargo features and stamp. */
export interface NativeVariant {
  probe: boolean;
  faults: boolean;
  target: string;
  features: string[];
  built: string;
  targetStamp: string;
  /** The command that builds it. */
  fix: string;
}

export interface NativeVariantOptions {
  probe?: boolean;
  faults?: boolean;
}

/** One native build: the Rust targets compiled, the file cargo leaves, the library's name in the addon and its manifest architecture tags. */
export interface BinaryTarget {
  readonly platform: 'macos' | 'linux' | 'windows' | 'android' | 'ios';
  readonly triples: readonly string[];
  readonly artifact: string;
  readonly library: string;
  readonly features: readonly string[];
}

export const CARGO_PACKAGE: string;
/** Where scripts/build-binary.mjs puts a release build, one file per target. */
export const OUT_BIN: string;
export const BINARY_TARGETS: Readonly<Record<string, BinaryTarget>>;
/** The targets a release ships, one library each: the universal macOS build and every build of another platform. */
export const RELEASE_TARGETS: readonly string[];
/** The target of the machine this runs on, or undefined where there is no build for it. */
export function hostBinaryTarget(): string | undefined;
/** What a plain `cargo build` leaves in a release directory on this machine. */
export const NATIVE_ARTIFACT_NAME: string;
/** The name this machine's library has in the addon. */
export const NATIVE_LIBRARY_NAME: string;
export const NATIVE_INSTALL_DIRECTORY: string;
export const NATIVE_INSTALLED_LIBRARY: string;
export const NATIVE_INSTALLED_STAMP: string;
export const NATIVE_TARGETS: { readonly default: string; readonly probe: string; readonly faults: string };
export const NATIVE_BINDING_API: NativeBindingApi;
export function nativeBindingEnvironment(): { GDRUST_GODOT_API_JSON: string; GDRUST_GODOT_INTERFACE_JSON: string };
export function nativeDumpFiles(): string[];
/** The Godot version a dump was generated from, read from its header. */
export function dumpVersion(path: string): string;
/** The binding a native build must record; throws if the dump is not a dump of `NATIVE_BINDING_API.version`. */
export function nativeBinding(): NativeBinding;
export function nativeVariant(options?: NativeVariantOptions): NativeVariant;
export function nativeSourceInputs(options?: NativeVariantOptions): BuildInputs;
/** Why a native run must not load the installed library (undefined when it may); the message ends with the command that fixes it. */
export function nativeRefusal(options?: NativeVariantOptions): string | undefined;
export function requireInstalledNative(options?: NativeVariantOptions): void;
/** Throws unless the library in the default target directory is a build of the current sources bound to `NATIVE_BINDING_API`. */
export function requireBuiltNative(): void;
export function beginNativeBuild(options: NativeVariantOptions & { clean: () => void }): BuildRecord;
