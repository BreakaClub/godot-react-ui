export interface ArgumentSet {
  /** Arguments taken as written, such as `--release`. */
  flags?: readonly string[];
  /** Arguments taken when they start with one of these, such as `--only=`. */
  prefixes?: readonly string[];
}

/** Throws for the first argument the script does not take. `--engine=<name>` is always taken. */
export function rejectUnknownArguments(argv: readonly string[], accepted?: ArgumentSet): void;
