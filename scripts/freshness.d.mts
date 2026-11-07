export interface BuildInputs {
  features: string[];
  digest: string;
  inputs: Record<string, string>;
}

export interface InputDifference {
  same: boolean;
  changed: string[];
  added: string[];
  removed: string[];
  features: { built: string[]; wanted: string[] } | undefined;
}

/** What a native build is bound to: the Godot API version and the hash of the dump pair (scripts/native-binding.mjs). */
export interface StampBinding {
  api: string;
  dump: string;
}

/** A build's stamp. A Web side module records `engine` (the profile it was linked for); a native build records `binding` (the API it was compiled against). */
export interface BuildStamp extends BuildInputs {
  engine?: string;
  binding?: StampBinding;
  probe: boolean;
  library: string;
  sha256: string;
}

/** The identity a build is checked against: the `engine` profile of a Web side module, or the Godot API `binding` of a native build (one of the two). */
export type BuildIdentity = { engine: string; binding?: undefined } | { binding: StampBinding; engine?: undefined };

export type BuildCheck = BuildIdentity & {
  /** The built file (absolute path). */
  library: string;
  stamp: unknown;
  probe: boolean;
  current: BuildInputs;
  /** Names the file in a message: `installed libgodot_react_ui.dylib`. */
  subject: string;
};

export function collectInputs(options: { root: string; apiFiles: readonly string[]; features: readonly string[] }): BuildInputs;
export function collectContentInputs(options: { root: string; paths: readonly string[]; extra?: Record<string, string>; features?: readonly string[] }): BuildInputs;
export function compareInputs(built: BuildInputs, current: BuildInputs): InputDifference;
export function describeDifference(difference: InputDifference): string;
export function stampFor(options: BuildIdentity & { library: string; probe: boolean; inputs: BuildInputs }): BuildStamp;
/** A binding in a sentence: `Godot API 4.7.2 (dump 8c1f0a2b9d3e)`. */
export function describeBinding(binding: StampBinding): string;
export function writeStamp(path: string, stamp: unknown): void;
export function readStamp(path: string): Record<string, unknown> | undefined;
export function findProblem(check: BuildCheck): string | undefined;
export function requireBuild(check: BuildCheck & { fix: string }): void;
/** Stage a sibling of `destination` and rename it into place; with `sha256` the staged copy must hash to it or nothing is renamed. */
export function installFile(source: string, destination: string, options?: { sha256?: string }): void;

export function prepareTarget(options: Omit<BuildCheck, 'stamp'> & { stampPath: string; clean: (reason: string) => void }): string | undefined;

/** The steps that record a build, returned by `beginBuild`. */
export interface BuildRecord {
  /** The compiler has succeeded: stamp its output. Throws if the sources changed while it ran. */
  compiled(): void;
  /** The artifact is in place: stamp the installed copy. */
  installed(): void;
}
/** Hash the inputs and, if the artifact the compiler left is not provably a build of them, have `clean` remove it; return the recording steps. */
export function beginBuild(options: {
  identity: BuildIdentity;
  probe: boolean;
  collect: () => BuildInputs;
  built: string;
  targetStamp: string;
  installed: string;
  installedStamp: string;
  subject: string;
  compiler: string;
  fix: string;
  crate: string;
  clean: () => void;
}): BuildRecord;
/** Why the files of an export directory are not the ones its receipt lists; empty when they are. */
export function exportFileProblems(directory: string, receipt: unknown): string[];
export function requireExport(options: {
  directory: string;
  receiptName: string;
  libraryName: string;
  engine: string;
  probe: boolean;
  current: BuildInputs;
  /** The inputs of the pack, shell and engine template now (scripts/web-content.mjs); when given, the export must match them. */
  content?: BuildInputs;
  subject: string;
  fix: string;
}): void;
