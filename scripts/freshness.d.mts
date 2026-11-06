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
