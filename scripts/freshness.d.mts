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

export interface BuildStamp extends BuildInputs {
  engine: string;
  probe: boolean;
  library: string;
  sha256: string;
}

export interface BuildCheck {
  /** The built file (absolute path). */
  library: string;
  stamp: unknown;
  engine: string;
  probe: boolean;
  current: BuildInputs;
  /** Names the file in a message: `installed libgodot_react_ui.dylib`. */
  subject: string;
}

export function collectInputs(options: { root: string; apiFiles: readonly string[]; features: readonly string[] }): BuildInputs;
export function collectContentInputs(options: { root: string; paths: readonly string[]; extra?: Record<string, string>; features?: readonly string[] }): BuildInputs;
export function compareInputs(built: BuildInputs, current: BuildInputs): InputDifference;
export function describeDifference(difference: InputDifference): string;
export function stampFor(options: { library: string; engine: string; probe: boolean; inputs: BuildInputs }): BuildStamp;
export function writeStamp(path: string, stamp: unknown): void;
export function readStamp(path: string): Record<string, unknown> | undefined;
export function findProblem(check: BuildCheck): string | undefined;
export function requireBuild(check: BuildCheck & { fix: string }): void;

/** What to do about an installed build: use it (`ready`), copy the profile's current target build over it (`install`), or compile (`build`). */
export type InstallAction = 'ready' | 'install' | 'build';
export interface InstallAssessment {
  action: InstallAction;
  /** Why the installed build cannot be used; undefined when `action` is `ready`. */
  problem: string | undefined;
  /** Why the target directory's build cannot be installed; undefined when it can (or when nothing needs installing). */
  builtProblem: string | undefined;
}
/** `installed` is the installed build, `built` the one in the profile's cargo target directory (each a build check). */
export function assessInstall(builds: { installed: BuildCheck; built: BuildCheck }): InstallAssessment;
/** The refusal for an assessment (why it cannot be used, and the one command that fixes it), or undefined when it can be used. */
export function installRefusal(assessment: InstallAssessment, commands: { buildFix: string; installFix: string; builtSubject: string }): string | undefined;
/** Stage a sibling of `destination` and rename it into place; with `sha256` the staged copy must hash to it or nothing is renamed. */
export function installFile(source: string, destination: string, options?: { sha256?: string }): void;
/** Copy the target directory's build and its stamp into place. Throws, naming `fix`, unless `built` is the profile's build of the current sources. */
export function installBuilt(options: { built: BuildCheck; destination: string; stampPath: string; fix: string }): void;
export type SwitchOutcome = 'current' | 'installed' | 'needs-build';
export interface SwitchResult {
  outcome: SwitchOutcome;
  /** Why the installed build was not usable (undefined for `current`). */
  problem: string | undefined;
  /** Only with `needs-build`: nothing was installed to begin with. */
  absent?: boolean;
  /** Only with `needs-build`: the command that compiles the build. */
  fix?: string;
}
export function switchBuild(options: { installed: BuildCheck; built: BuildCheck; destination: string; stampPath: string; fix: string; absent?: boolean }): SwitchResult;
export function prepareTarget(options: Omit<BuildCheck, 'stamp'> & { stampPath: string; clean: (reason: string) => void }): string | undefined;
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
