import type { InlineLab } from '../labs';
import type { LiveSession } from '../live-compile-session';
import type { ClipboardPort } from './clipboard';
import type { Platform } from './keymap';
import { EditorWorkspace, StaticBackend, UNMEASURED_METRICS, type RunStatus } from './workspace';

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

function messageOf(thrown: unknown): string {
  return thrown instanceof Error ? thrown.message : String(thrown);
}

/**
 * Opens the lab for editing: a live session over the lab's source, started and on its way to the page (render `session.Lab`),
 * with a workspace over the same files. If the session cannot start (the extension is not built, the project is missing, the lab does
 * not run as the project has it) the files are shown read-only and the reason is the first thing the panel says.
 */
export function openLabCode(lab: InlineLab, support: CodeSupport): LabCode {
  const common = { platform: support.platform, clipboard: support.clipboard, metrics: UNMEASURED_METRICS, now: support.now };
  let session: LiveSession | undefined;
  try {
    session = support.openSession(lab);
    session.open();
    const workspace = new EditorWorkspace({ ...common, backend: session });
    workspace.start();
    return { kind: 'live', session, workspace };
  } catch (thrown) {
    session?.unmount();
    const reason = messageOf(thrown);
    console.warn(`The code of ${lab.id} is read-only: ${reason}`);
    const initialRun: RunStatus = { kind: 'unavailable', message: `Read-only. Live compile is not available: ${reason}`, path: undefined, timings: undefined, offset: undefined };
    const backend = new StaticBackend(lab.sources, path => support.readSource(path));
    return { kind: 'read-only', reason, workspace: new EditorWorkspace({ ...common, backend, readOnly: true, initialRun }) };
  }
}
