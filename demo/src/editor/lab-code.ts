import type { InlineLab } from '../labs';
import type { LiveSession } from '../live-compile-session';
import { RequestCancelled } from '../live-compile-scope';
import type { ClipboardPort } from './clipboard';
import type { Platform } from './keymap';
import { COMPILING_RUN, EditorWorkspace, StaticBackend, UNMEASURED_METRICS, type RunStatus } from './workspace';

/**
 * A lab's code as the navigator holds it: the live session that runs the edited lab and the workspace that edits its files, or, when
 * there is no session, the files to read and the reason there is no session.
 */

/** What the owner gives the navigator so that a lab can be edited. */
export interface CodeSupport {
  /** The live session of a lab, rendered inside the navigator's own tree. Throws, saying how to fix it, when the compiler is not there. */
  openSession(lab: InlineLab): LiveSession;
  /** The text of a lab's source file as the build holds it; empty when it does not. For a lab with no live session. */
  readSource(path: string): string;
  readonly platform: Platform;
  readonly clipboard: ClipboardPort;
  /** Milliseconds from a clock with sub-millisecond resolution. */
  readonly now: () => number;
}

export type LabCode =
  | { readonly kind: 'live'; readonly session: LiveSession; readonly workspace: EditorWorkspace }
  | { readonly kind: 'read-only'; readonly reason: string; readonly workspace: EditorWorkspace };

export function releaseLabCode(code: LabCode): void {
  code.workspace.dispose();
  if (code.kind === 'live') code.session.unmount();
}

/** A number for each code that was opened, for a view to be keyed by: the files of a lab and of its read-only replacement have the same paths. */
const KEYS = new WeakMap<LabCode, number>();
let nextKey = 0;

export function labCodeKey(code: LabCode): number {
  let key = KEYS.get(code);
  if (key === undefined) {
    key = nextKey;
    nextKey += 1;
    KEYS.set(code, key);
  }
  return key;
}

function messageOf(thrown: unknown): string {
  return thrown instanceof Error ? thrown.message : String(thrown);
}

type CommonOptions = Pick<ConstructorParameters<typeof EditorWorkspace>[0], 'platform' | 'clipboard' | 'metrics' | 'now'>;

/** The lab's files to read, with the reason they cannot be run. */
function readOnlyCode(lab: InlineLab, support: CodeSupport, common: CommonOptions, reason: string): LabCode {
  console.warn(`The code of ${lab.id} is read-only: ${reason}`);
  const initialRun: RunStatus = { kind: 'unavailable', message: `Read-only. Live compile is not available: ${reason}`, path: undefined, timings: undefined, offset: undefined };
  const backend = new StaticBackend(lab.sources, path => support.readSource(path));
  return { kind: 'read-only', reason, workspace: new EditorWorkspace({ ...common, backend, readOnly: true, initialRun }) };
}

/**
 * Opens the lab for editing and returns at once: a live session over the lab's source, with a workspace over the same files that can be
 * edited while the lab is compiled (its status says so, and `session.Lab` shows the bundled lab until the compiled one is ready). The
 * compile is answered by the service thread a frame or more later, and nothing here waits for it.
 *
 * If the session cannot start (the extension is not built, the project is missing) the files are shown read-only and the reason is the
 * first thing the panel says, and that is what is returned. If it starts and the lab then does not run as the project has it,
 * `unavailable` is called with the read-only code that replaces the live one: the owner shows it and releases the live one.
 */
export function openLabCode(lab: InlineLab, support: CodeSupport, unavailable: (readOnly: LabCode) => void): LabCode {
  const common = { platform: support.platform, clipboard: support.clipboard, metrics: UNMEASURED_METRICS, now: support.now };
  let session: LiveSession | undefined;
  let workspace: EditorWorkspace | undefined;
  try {
    session = support.openSession(lab);
    workspace = new EditorWorkspace({ ...common, backend: session, initialRun: COMPILING_RUN });
  } catch (thrown) {
    session?.unmount();
    workspace?.dispose();
    return readOnlyCode(lab, support, common, messageOf(thrown));
  }
  const opened = workspace;
  session.open().then(() => {
    opened.opened();
    // Checked once the lab has opened, as the service takes its requests in order and the lab's own files come first.
    opened.start();
  }).catch((thrown: unknown) => {
    // The code was released before the answer: nobody is showing it.
    if (thrown instanceof RequestCancelled) return;
    unavailable(readOnlyCode(lab, support, common, messageOf(thrown)));
  });
  return { kind: 'live', session, workspace };
}
