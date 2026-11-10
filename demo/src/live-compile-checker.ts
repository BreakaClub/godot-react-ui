import {
  LspError, LspSession, SERVER_CANCELLED, pathOfUri, type InlayParameterNames, type LspDiagnostic, type LspPosition,
  type ProjectFile, type ProjectOptions, type RequestScope, type TscHost,
} from 'godot-tsc/host';

/**
 * The code editor's type checker: what it asks of a lab's project (a check, the type under a position, the inlay hints of a range), in the
 * editor's own terms, UTF-16 offsets into a file's text. It is the godot-tsc package's language server (`LspSession`), whose positions are
 * LSP's lines and characters: `LspChecker` converts both ways with the text the checker has of each file.
 *
 * One service serves every lab of the page, and each checker is a language server session of its own on it, for its lab's project: the
 * sessions share the service's thread and its files, and one lab's checks never replace another's.
 */

/** TypeScript's `DiagnosticCategory` (`category`): 0 a warning, 1 an error, 2 a suggestion, 3 a message. */
export type DiagnosticCategory = 0 | 1 | 2 | 3;
export const CATEGORY_ERROR: DiagnosticCategory = 1;

/** A diagnostic of a check: `pos` and `end` are UTF-16 offsets into the text of `fileName`. */
export interface CheckDiagnostic {
  readonly fileName: string;
  readonly pos: number;
  readonly end: number;
  readonly code: number;
  readonly category: DiagnosticCategory;
  readonly messageText: string;
}

export interface CheckReport {
  readonly diagnostics: readonly CheckDiagnostic[];
  readonly filesLoaded: number;
  /** The files the check ran out of stack in: their diagnostics may be missing. */
  readonly incomplete: readonly string[];
}

/** What a check came to: its report, a failure, or that a newer check took its place before it began. */
export type CheckOutcome =
  | { readonly kind: 'checked'; readonly report: CheckReport; /** The time the service thread took, from its own clock. */ readonly serviceMs: number }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'superseded' };

/** What is under a position: the name there and its type, over the UTF-16 range `start` to `end` of the name. */
export interface Hover {
  readonly start: number;
  readonly end: number;
  readonly name: string;
  readonly type: string;
}

/** A hint drawn in the text at a UTF-16 offset: the type TypeScript inferred for a declaration (after its name), or the name of the parameter an argument is for (before it). */
export interface InlayHint {
  readonly position: number;
  readonly kind: 'type' | 'parameter';
  readonly label: string;
}

/** What the editor asks of a lab's project. `setText` gives the checker a file's new text (`TscHost.setFile` gives the service it). */
export interface TypeChecker {
  setText(path: string, text: string): void;
  check(scope?: RequestScope): Promise<CheckOutcome>;
  hover(path: string, offset: number, scope?: RequestScope): Promise<Hover | null>;
  inlayHints(path: string, from: number, to: number, scope?: RequestScope): Promise<InlayHint[]>;
  /** Ends the checker's session with the service. */
  close(): Promise<void>;
}

/** The UTF-16 offset of each line's start in `text`, lines split at `\n` as the language server splits them. */
function lineStarts(text: string): number[] {
  const starts = [0];
  for (let index = text.indexOf('\n'); index !== -1; index = text.indexOf('\n', index + 1)) starts.push(index + 1);
  return starts;
}

/** The offset of an LSP position in `text`: a character past its line's end is the line's end, as LSP says. */
export function offsetOf(text: string, position: LspPosition): number {
  const starts = lineStarts(text);
  const start = starts[Math.min(position.line, starts.length - 1)] ?? 0;
  const next = starts[position.line + 1];
  const lineEnd = next === undefined ? text.length : next - 1;
  return position.line >= starts.length ? text.length : Math.min(start + position.character, lineEnd);
}

/** The LSP position of an offset of `text`. */
export function positionOf(text: string, offset: number): LspPosition {
  const starts = lineStarts(text);
  let line = 0;
  while (line + 1 < starts.length && (starts[line + 1] ?? Infinity) <= offset) line += 1;
  return { line, character: offset - (starts[line] ?? 0) };
}

/** LSP's `DiagnosticSeverity` as TypeScript's category: 1 error, 2 warning, 3 information (a message), 4 hint (a suggestion). */
function categoryOf(severity: LspDiagnostic['severity']): DiagnosticCategory {
  switch (severity) {
    case 1: return 1;
    case 2: return 0;
    case 3: return 3;
    case 4: return 2;
  }
}

/**
 * The name and type of a hover's markdown: the language server writes the quick info as one TypeScript code block, `name: type`, or the
 * type alone when there is no name (`core/lsp.rs`).
 */
export function hoverText(markdown: string): { readonly name: string; readonly type: string } {
  const block = /^```typescript\n([^]*)\n```$/u.exec(markdown);
  if (block === null) throw new Error(`The language server's hover is not a TypeScript code block: ${JSON.stringify(markdown.slice(0, 200))}`);
  const shown = block[1] ?? '';
  const colon = shown.indexOf(': ');
  return colon === -1 ? { name: '', type: shown } : { name: shown.slice(0, colon), type: shown.slice(colon + 2) };
}

/** The language server of a service, for one lab's project (`ProjectOptions`), in the editor's terms. */
export class LspChecker implements TypeChecker {
  private readonly lsp: LspSession;
  /** The session's start (`initialize`, then `initialized`), from the first request on, and whether it has finished. */
  private starting: Promise<void> | undefined;
  private started = false;
  /** The text the checker has of each file of the project, which the language server's positions are positions in. */
  private readonly texts: Map<string, string>;

  constructor(host: TscHost, project: ProjectOptions, files: readonly ProjectFile[], inlayParameterNames: InlayParameterNames = 'literals') {
    this.lsp = new LspSession(host, project, { inlayParameterNames });
    this.texts = new Map(files.map(file => [file.path, file.text]));
  }

  setText(path: string, text: string): void {
    this.texts.set(path, text);
  }

  private textOf(path: string): string {
    const text = this.texts.get(path);
    if (text === undefined) throw new Error(`The checker has no text of ${path}`);
    return text;
  }

  /**
   * Start the session, the first time it is asked something: a request waits for that once, as LSP has it. Every later request is sent in
   * the turn it is asked for, so the service has it in its queue at once, in the order the page asked (a check after its edit's compile).
   * The start belongs to no request's scope, so a request given up does not take it back; a start that failed is made again by the next.
   */
  private start(): Promise<void> {
    this.starting ??= this.lsp.initialize().then(() => {
      this.started = true;
    }, (error: unknown) => {
      this.starting = undefined;
      throw error;
    });
    return this.starting;
  }

  async close(): Promise<void> {
    if (this.starting === undefined) return;
    this.starting = undefined;
    this.started = false;
    await this.lsp.close();
  }

  async check(scope?: RequestScope): Promise<CheckOutcome> {
    if (!this.started) await this.start();
    try {
      const { result, serviceMs } = await this.lsp.workspaceDiagnostics(scope);
      const diagnostics = result.items.flatMap(document => {
        const fileName = pathOfUri(document.uri);
        const text = this.textOf(fileName);
        return document.items.map((diagnostic): CheckDiagnostic => ({
          fileName,
          pos: offsetOf(text, diagnostic.range.start),
          end: offsetOf(text, diagnostic.range.end),
          code: diagnostic.code,
          category: categoryOf(diagnostic.severity),
          messageText: diagnostic.message,
        }));
      });
      return { kind: 'checked', report: { diagnostics, filesLoaded: result.filesLoaded, incomplete: result.incomplete }, serviceMs };
    } catch (thrown) {
      if (thrown instanceof LspError) return thrown.code === SERVER_CANCELLED ? { kind: 'superseded' } : { kind: 'failed', message: thrown.message };
      throw thrown;
    }
  }

  async hover(path: string, offset: number, scope?: RequestScope): Promise<Hover | null> {
    const text = this.textOf(path);
    if (!this.started) await this.start();
    const answer = await this.lsp.hover(path, positionOf(text, offset), scope);
    if (answer === null) return null;
    return { ...hoverText(answer.contents.value), start: offsetOf(text, answer.range.start), end: offsetOf(text, answer.range.end) };
  }

  async inlayHints(path: string, from: number, to: number, scope?: RequestScope): Promise<InlayHint[]> {
    const text = this.textOf(path);
    if (!this.started) await this.start();
    const hints = await this.lsp.inlayHints(path, { start: positionOf(text, from), end: positionOf(text, to) }, scope);
    return hints.map(hint => ({ position: offsetOf(text, hint.position), kind: hint.kind === 1 ? 'type' : 'parameter', label: hint.label }));
  }
}
