/** How long a child gets to leave after SIGTERM before it is killed. */
export const KILL_GRACE_MS: number;

/** Pass whole lines on, each starting with `prefix`, however the text arrives; `flush` writes a last line that has no newline. */
export function lineWriter(prefix: string, write: (text: string) => void): { push(text: string): void; flush(): void };

export interface SupervisedProcess {
  command: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
  cwd?: string;
  /** After this long the child gets SIGTERM, and SIGKILL `killGraceMs` later. */
  deadlineMs: number;
  killGraceMs?: number;
  /** Starts every line of the child's output that is echoed to stdout; empty (the default) echoes it as it arrives. */
  outputPrefix?: string;
}

export interface SupervisedResult {
  /** Everything the child printed on either stream. */
  log: string;
  /** The exit code, or null when a signal ended it. */
  code: number | null;
  timedOut: boolean;
  /** The signal this process was sent, if the child was closed because of one. */
  interrupted: NodeJS.Signals | undefined;
}

/** Start a child and wait for it; every way out closes it (its deadline, a signal sent to this process, this process exiting). */
export function runSupervised(options: SupervisedProcess): Promise<SupervisedResult>;
