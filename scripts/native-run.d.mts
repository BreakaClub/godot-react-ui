export const MAX_DISTURBED_RERUNS: number;

export interface NativeVerifierRun {
  godot: string;
  project: string;
  /** Where `run.log` (the last attempt's log) and `run-attempt-N.log` go. */
  output: string;
  name: string;
  resolution: string;
  /** Godot arguments before the `--` that separates the scripts' own (a scene path). */
  leading?: string[];
  scriptArgs: string[];
  successMarker: string;
  /** Where the verifier writes its captures; defaults to `output`. */
  artifacts?: string;
  errorPattern: RegExp;
  deadlineMs: number;
}

export function runNativeVerifier(run: NativeVerifierRun): Promise<void>;
