import type { CheckOutcome, CompileDiagnostic, Hover, InlayHint, ParameterNames } from '../live-compile-protocol';
import type { UpdateReport, UpdateTimings } from '../live-compile-session';
import type { ClipboardPort } from './clipboard';
import type { ViewMetrics } from './command-target';
import { EditorController } from './controller';
import { findUnsupportedClasses } from './class-check';
import { severityOfCategory, type EditorDiagnostic, type EditorInlay } from './diagnostics';
import type { Platform } from './keymap';

/**
 * The files of one lab as the code panel edits them, and the loop that keeps the page and the type information in step with the
 * text: each change is debounced, sent to the live session (compile, run, swap in place, keep state), and the type check that the
 * session starts for that text is awaited and drawn when it arrives, mapped through whatever was typed meanwhile.
 *
 * The session is a `LiveBackend`: `LiveSession` is one, and a test gives another.
 */

/** What the workspace needs of a live session. */
export interface LiveBackend {
  /** The lab's source files, the one with the component first. */
  readonly sources: readonly string[];
  sourceOf(path: string): string;
  update(path: string, text: string): UpdateReport;
  /** Gives the checker this text of a file and checks it, without running it. */
  checkText(path: string, text: string): Promise<CheckOutcome>;
  hover(path: string, offset: number): Promise<Hover | null>;
  inlayHints(path: string, from: number, to: number, parameterNames?: ParameterNames): Promise<InlayHint[]>;
}

export interface WorkspaceOptions {
  readonly backend: LiveBackend;
  readonly platform: Platform;
  readonly clipboard: ClipboardPort;
  readonly metrics: ViewMetrics;
  /** Milliseconds since some fixed time, for debouncing and the history's typing groups. */
  readonly now: () => number;
  /** After the last change, how long before the text is sent. */
  readonly debounceMs?: number;
  /** A change waits for no more than this when typing goes on. */
  readonly maxWaitMs?: number;
  /** The text can be read and copied but not changed; `initialRun` says why. */
  readonly readOnly?: boolean;
  readonly initialRun?: RunStatus;
}

/** After the last change, the text is sent once this long has passed: a pause in typing, not every key. */
export const UPDATE_DEBOUNCE_MS = 150;
/** Typing that never pauses still reaches the page this often. */
export const UPDATE_MAX_WAIT_MS = 600;

/**
 * The grid before the view has measured the font: a column and a line are one unit each. The view sets the real metrics when it
 * has them, before anything can be typed.
 */
export const UNMEASURED_METRICS: ViewMetrics = { advance: 1, lineHeight: 1, viewportHeight: 1 };

export type RunKind = 'ready' | 'unavailable' | 'pending' | 'swapped' | 'compile-failed' | 'class-error' | 'evaluation-failed' | 'render-failed' | 'broken';

/** What became of the last text sent to the page. */
export interface RunStatus {
  readonly kind: RunKind;
  readonly message: string;
  readonly path: string | undefined;
  readonly timings: UpdateTimings | undefined;
  /** For an error with a place in the text: where, as a document offset of the version it was sent from. */
  readonly offset: number | undefined;
}

export type CheckKind = 'idle' | 'checking' | 'checked' | 'failed';

export interface CheckStatus {
  readonly kind: CheckKind;
  readonly errors: number;
  readonly warnings: number;
  /** The checker's own time for the last answer, in milliseconds. */
  readonly serviceMs: number | undefined;
  readonly message: string | undefined;
}

const NOT_RUN: RunStatus = { kind: 'ready', message: 'Live. The page is the lab as it is in the source.', path: undefined, timings: undefined, offset: undefined };
const NOT_CHECKED: CheckStatus = { kind: 'idle', errors: 0, warnings: 0, serviceMs: undefined, message: undefined };

/** One file of the lab. */
export class FileEditor {
  readonly path: string;
  readonly name: string;
  readonly controller: EditorController;
  readonly original: string;
  /** The document version of the text the page and the checker last received. */
  syncedVersion = 0;
  /** The text is newer than what the page has. */
  dirty = false;
  timer: ReturnType<typeof setTimeout> | undefined;
  pendingSince: number | undefined;
  /** The newest version a check result has been drawn for: an older result that arrives after it is dropped. */
  checkedVersion = -1;
  unsubscribe: () => void = () => {};

  constructor(path: string, original: string, controller: EditorController) {
    this.path = path;
    this.name = path.slice(path.lastIndexOf('/') + 1);
    this.original = original;
    this.controller = controller;
  }
}

type Listener = () => void;

export class EditorWorkspace {
  readonly files: readonly FileEditor[];
  private readonly backend: LiveBackend;
  private readonly now: () => number;
  private readonly debounceMs: number;
  private readonly maxWaitMs: number;
  private readonly listeners = new Set<Listener>();
  private activeFile: FileEditor;
  private runStatus: RunStatus;
  private checkStatus: CheckStatus = NOT_CHECKED;
  private revisionCount = 0;
  private disposed = false;

  constructor(options: WorkspaceOptions) {
    this.backend = options.backend;
    this.now = options.now;
    this.debounceMs = options.debounceMs ?? UPDATE_DEBOUNCE_MS;
    this.maxWaitMs = options.maxWaitMs ?? UPDATE_MAX_WAIT_MS;
    this.runStatus = options.initialRun ?? NOT_RUN;
    const files = options.backend.sources.map(path => {
      const text = options.backend.sourceOf(path);
      const controller = new EditorController({
        doc: text, platform: options.platform, clipboard: options.clipboard, metrics: options.metrics, now: options.now, readOnly: options.readOnly,
      });
      return new FileEditor(path, text, controller);
    });
    const [first] = files;
    if (first === undefined) throw new Error('A lab with no source files cannot be edited');
    this.files = files;
    this.activeFile = first;
    for (const file of files) {
      file.unsubscribe = file.controller.model.subscribe(update => {
        if (update.docChanged) this.changed(file);
      });
      file.controller.subscribe(() => this.emit());
    }
  }

  // ---- What the panel reads ------------------------------------------------------------------------------------------------

  get revision(): number {
    return this.revisionCount;
  }

  get active(): FileEditor {
    return this.activeFile;
  }

  get run(): RunStatus {
    return this.runStatus;
  }

  get check(): CheckStatus {
    return this.checkStatus;
  }

  /** The gravest problems of the active file in the order of the text, for the problems list. */
  problems(): readonly EditorDiagnostic[] {
    return this.activeFile.controller.diagnostics.filter(item => item.severity === 'error' || item.severity === 'warning');
  }

  /** An arrow property: `useSyncExternalStore` calls it on its own. */
  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  // ---- What the panel asks -------------------------------------------------------------------------------------------------

  setActive(path: string): void {
    const found = this.files.find(file => file.path === path);
    if (found === undefined) throw new Error(`The lab has no source file ${path}`);
    if (found === this.activeFile) return;
    this.activeFile = found;
    this.emit();
  }

  /** Sends any text that is waiting, now. */
  flush(file: FileEditor = this.activeFile): void {
    if (file.timer !== undefined) clearTimeout(file.timer);
    file.timer = undefined;
    file.pendingSince = undefined;
    if (!file.dirty || this.disposed) return;
    this.send(file);
  }

  /** Puts every file back to its source and sends it. */
  reset(): void {
    for (const file of this.files) {
      const { model } = file.controller;
      if (model.text === file.original) continue;
      model.dispatch({ changes: { from: 0, to: model.doc.length, insert: file.original }, userEvent: 'input.reset' });
      this.flush(file);
    }
  }

  /** What is under `offset` of the active file, for the text of the version that is on the page; `undefined` once the text has moved on. */
  async hoverAt(offset: number): Promise<{ readonly hover: Hover; readonly version: number } | undefined> {
    const file = this.activeFile;
    this.flush(file);
    const version = file.syncedVersion;
    const hover = await this.backend.hover(file.path, offset);
    if (hover === null || file.controller.model.version !== version || this.disposed) return undefined;
    return { hover, version };
  }

  dispose(): void {
    this.disposed = true;
    for (const file of this.files) {
      if (file.timer !== undefined) clearTimeout(file.timer);
      file.timer = undefined;
      file.unsubscribe();
      file.controller.dispose();
    }
    this.listeners.clear();
  }

  // ---- The loop --------------------------------------------------------------------------------------------------------------

  private changed(file: FileEditor): void {
    file.dirty = true;
    const now = this.now();
    file.pendingSince ??= now;
    const waited = now - file.pendingSince;
    if (file.timer !== undefined) clearTimeout(file.timer);
    file.timer = setTimeout(() => this.flush(file), Math.max(0, Math.min(this.debounceMs, this.maxWaitMs - waited)));
    if (this.runStatus.kind !== 'pending') this.setRun({ ...this.runStatus, kind: 'pending', message: 'Waiting for a pause in typing…' });
  }

  private send(file: FileEditor): void {
    const { model } = file.controller;
    const version = model.version;
    const text = model.text;
    file.dirty = false;
    file.syncedVersion = version;
    const classes = findUnsupportedClasses(text);
    let check: Promise<CheckOutcome>;
    if (classes.length > 0) {
      // A render with a class the library does not have throws, and the page would lose its state: the page is left as it is.
      check = this.backend.checkText(file.path, text);
      const [first] = classes;
      const where = first === undefined ? undefined : model.doc.lineAt(first.from);
      this.setRun({
        kind: 'class-error', path: file.path, timings: undefined, offset: first?.from,
        message: first === undefined || where === undefined ? 'Not applied: a class is not one the library has.'
          : `Not applied, the last good page is showing. No utility called "${first.name}" at ${where.number}:${first.from - where.from + 1}${classes.length > 1 ? ` (and ${classes.length - 1} more)` : ''}.`,
      });
      file.controller.setDiagnostics(version, classes.map((problem): EditorDiagnostic => ({
        from: problem.from, to: problem.to, severity: 'error', message: `No utility called "${problem.name}" in this library`, code: undefined, source: 'classes',
      })), 'local');
    } else {
      let report: UpdateReport;
      try {
        report = this.backend.update(file.path, text);
      } catch (thrown) {
        const message = thrown instanceof Error ? thrown.message : String(thrown);
        console.error(`The live session failed on an edit of ${file.path}: ${message}`);
        this.setRun({ kind: 'broken', message: `The live session failed: ${message}`, path: file.path, timings: undefined, offset: undefined });
        return;
      }
      this.setRun(this.describe(file, report));
      file.controller.setDiagnostics(version, report.outcome === 'compile-failed' ? report.diagnostics.map(diagnostic => compilerDiagnostic(diagnostic)) : [], 'local');
      check = report.check;
    }
    this.setCheck({ ...this.checkStatus, kind: 'checking' });
    check.then(outcome => this.checked(file, version, text, outcome), (error: unknown) => {
      this.setCheck({ kind: 'failed', errors: 0, warnings: 0, serviceMs: undefined, message: error instanceof Error ? error.message : String(error) });
    });
  }

  private describe(file: FileEditor, report: UpdateReport): RunStatus {
    const { timings } = report;
    switch (report.outcome) {
      case 'swapped':
        return {
          kind: 'swapped', path: file.path, timings, offset: undefined,
          message: `Swapped in ${format(timings.totalMs)} ms (compile ${format(timings.compileMs)}, run ${format(timings.swapMs)}). State kept where the hooks are the same.`,
        };
      case 'compile-failed': {
        const first = report.diagnostics[0];
        return {
          kind: 'compile-failed', path: file.path, timings, offset: first?.start,
          message: first === undefined ? 'Not applied: the file does not compile.' : `Not applied, the last good page is showing. Syntax error at ${first.line + 1}:${first.character + 1}: ${first.message}`,
        };
      }
      case 'evaluation-failed':
        return { kind: 'evaluation-failed', path: file.path, timings, offset: undefined, message: `Not applied, the last good page is showing. The module threw: ${report.error ?? 'an error'}` };
      case 'render-failed':
        return { kind: 'render-failed', path: file.path, timings, offset: undefined, message: `Rolled back to the last good page (its state started again). The new page threw while it rendered: ${report.error ?? 'an error'}` };
    }
  }

  private checked(file: FileEditor, version: number, text: string, outcome: CheckOutcome): void {
    if (this.disposed) return;
    if (outcome.kind === 'superseded') return;
    if (outcome.kind === 'failed') {
      this.setCheck({ kind: 'failed', errors: 0, warnings: 0, serviceMs: undefined, message: outcome.message });
      return;
    }
    if (version < file.checkedVersion) return;
    file.checkedVersion = version;
    const diagnostics = outcome.report.diagnostics
      .filter(diagnostic => diagnostic.fileName === file.path)
      .map((diagnostic): EditorDiagnostic => {
        const [from, to] = visibleRange(text, diagnostic.pos, diagnostic.end);
        return { from, to, severity: severityOfCategory(diagnostic.category), message: diagnostic.messageText, code: diagnostic.code, source: 'checker' };
      });
    const placed = file.controller.setDiagnostics(version, diagnostics, 'checker');
    const errors = diagnostics.filter(diagnostic => diagnostic.severity === 'error').length;
    const warnings = diagnostics.filter(diagnostic => diagnostic.severity === 'warning').length;
    this.setCheck({
      kind: 'checked', errors, warnings, serviceMs: outcome.serviceMs,
      message: placed === 'refused' ? 'The text has changed too much since this check for its problems to be placed.' : undefined,
    });
    if (placed !== 'refused') {
      this.requestInlays(file).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Inlay hints for ${file.path} failed: ${message}`);
        this.setCheck({ ...this.checkStatus, message: `Inlay hints failed: ${message}` });
      });
    }
  }

  private async requestInlays(file: FileEditor): Promise<void> {
    const version = file.syncedVersion;
    const length = file.controller.model.doc.length;
    const hints = await this.backend.inlayHints(file.path, 0, length, 'literals');
    if (this.disposed) return;
    file.controller.setInlays(version, hints.map((hint): EditorInlay => ({
      at: hint.position, kind: hint.kind, label: hint.kind === 'parameter' ? `${hint.label} ` : hint.label,
    })));
  }

  private setRun(status: RunStatus): void {
    this.runStatus = status;
    this.emit();
  }

  private setCheck(status: CheckStatus): void {
    this.checkStatus = status;
    this.emit();
  }

  private emit(): void {
    this.revisionCount += 1;
    for (const listener of [...this.listeners]) listener();
  }
}

/** Milliseconds in the status bar are shown to a tenth. */
const MS_DIGITS = 1;

function format(ms: number): string {
  return ms.toFixed(MS_DIGITS);
}

function compilerDiagnostic(diagnostic: CompileDiagnostic): EditorDiagnostic {
  return {
    from: diagnostic.start, to: Math.max(diagnostic.end, diagnostic.start + 1), severity: diagnostic.severity,
    message: diagnostic.message, code: undefined, source: 'compiler',
  };
}

/**
 * The range to underline for a diagnostic at `pos` to `end` of `text`: at least one character wide, so that "expected" errors
 * that TypeScript puts at a single position (the end of the line, the end of the file) can be seen.
 */
export function visibleRange(text: string, pos: number, end: number): readonly [number, number] {
  const from = Math.min(Math.max(pos, 0), text.length);
  const to = Math.min(Math.max(end, from), text.length);
  if (to > from) return [from, to];
  if (from < text.length && text[from] !== '\n') return [from, from + 1];
  return from > 0 ? [from - 1, from] : [from, from];
}

/** A backend for a lab that has no live session: its text can be shown, and it can never be changed. */
export class StaticBackend implements LiveBackend {
  readonly sources: readonly string[];
  private readonly read: (path: string) => string;

  constructor(sources: readonly string[], read: (path: string) => string) {
    this.sources = sources;
    this.read = read;
  }

  sourceOf(path: string): string {
    return this.read(path);
  }

  update(): never {
    throw new Error('This code is read-only: there is no live session to run it');
  }

  checkText(): never {
    throw new Error('This code is read-only: there is no live session to check it');
  }

  hover(): Promise<null> {
    return Promise.resolve(null);
  }

  inlayHints(): Promise<InlayHint[]> {
    return Promise.resolve([]);
  }
}
