/**
 * What `live-compile`'s library says, as data (`live-compile/core/protocol.rs`, `check.rs`): the extension answers in JSON text, and
 * these are the shapes it is read into. A reply that is none of them is an error, not a value (`parse*` throw).
 */

export type Severity = 'error' | 'warning';

/** A problem the compiler found: positions in UTF-16 code units, as a JavaScript string index is; `line` and `character` count from 0. */
export interface CompileDiagnostic {
  readonly start: number;
  readonly end: number;
  readonly line: number;
  readonly character: number;
  readonly severity: Severity;
  readonly message: string;
}

export interface Compiled {
  readonly ok: true;
  /** A function body: `require`, `exports`, `module`, `$RefreshReg$` and `$RefreshSig$` are its free identifiers. */
  readonly code: string;
  /** The specifiers it requires, once each, in order. */
  readonly imports: readonly string[];
  readonly exports: readonly string[];
  readonly diagnostics: readonly CompileDiagnostic[];
}

export interface CompileFailed {
  readonly ok: false;
  readonly diagnostics: readonly CompileDiagnostic[];
}

export type CompileResult = Compiled | CompileFailed;

/** `DiagnosticCategory` in TypeScript's API. */
export const CATEGORY_ERROR = 1;

export interface Position {
  readonly line: number;
  readonly character: number;
}

/** A diagnostic of the checker, as TypeScript's API gives it: `pos` and `end` are UTF-16 offsets into the file's text. */
export interface CheckDiagnostic {
  readonly fileName?: string;
  readonly pos: number;
  readonly end: number;
  readonly startPosition?: Position;
  readonly endPosition?: Position;
  readonly code: number;
  readonly category: number;
  readonly messageText: string;
}

export interface CheckReport {
  readonly diagnostics: readonly CheckDiagnostic[];
  readonly filesLoaded: number;
  /** The files the check ran out of stack in: their diagnostics may be missing. */
  readonly incomplete: readonly string[];
  readonly deepestStack: number;
}

/** What is under a position: the name there and its type, as TypeScript's quick info has them. `start` and `end` are UTF-16 offsets. */
export interface Hover {
  readonly start: number;
  readonly end: number;
  readonly name: string;
  readonly type: string;
}

/** A hint drawn in the text: the type TypeScript inferred for a declaration (after its name), or the name of the parameter an argument is for (before it). */
export interface InlayHint {
  readonly position: number;
  readonly kind: 'type' | 'parameter';
  readonly label: string;
}

/** Which arguments get their parameter's name: none, the literals, or all but the ones that are the name. */
export type ParameterNames = 'none' | 'literals' | 'all';

/** What a `requestCheck` came to: its report, a failure, or that a newer check took its place before it began. */
export type CheckOutcome =
  | { readonly kind: 'checked'; readonly report: CheckReport; /** The time the service thread took, from its own clock: the answer reaches JavaScript a frame later at the soonest. */ readonly serviceMs: number }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'superseded'; readonly by: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isCompileDiagnostic(value: unknown): value is CompileDiagnostic {
  return isRecord(value) && typeof value.start === 'number' && typeof value.end === 'number' && typeof value.line === 'number'
    && typeof value.character === 'number' && (value.severity === 'error' || value.severity === 'warning') && typeof value.message === 'string';
}

function diagnosticsOf(value: unknown): CompileDiagnostic[] {
  if (!Array.isArray(value) || !value.every(isCompileDiagnostic)) throw new Error('A reply of the compiler has diagnostics that are not diagnostics');
  return value;
}

export function parseCompileResult(json: string): CompileResult {
  const reply: unknown = JSON.parse(json);
  if (!isRecord(reply)) throw new Error(`The compiler's reply is not an object: ${json.slice(0, 200)}`);
  if (reply.ok === true) {
    const { code, imports, exports } = reply;
    if (typeof code !== 'string' || !isStringArray(imports) || !isStringArray(exports)) throw new Error('The compiler said ok without code, imports and exports');
    return { ok: true, code, imports, exports, diagnostics: diagnosticsOf(reply.diagnostics) };
  }
  return { ok: false, diagnostics: diagnosticsOf(reply.diagnostics) };
}

function isCheckDiagnostic(value: unknown): value is CheckDiagnostic {
  return isRecord(value) && typeof value.pos === 'number' && typeof value.end === 'number' && typeof value.code === 'number'
    && typeof value.category === 'number' && typeof value.messageText === 'string';
}

function isCheckReport(value: unknown): value is CheckReport {
  return isRecord(value) && Array.isArray(value.diagnostics) && value.diagnostics.every(isCheckDiagnostic) && typeof value.filesLoaded === 'number'
    && isStringArray(value.incomplete) && typeof value.deepestStack === 'number';
}

/** A reply `poll` handed over: the id of the request it answers, and what came of it. */
export type Reply =
  | { readonly id: number; readonly kind: 'check'; readonly outcome: CheckOutcome }
  | { readonly id: number; readonly kind: 'query'; readonly serviceMs: number; readonly result: Record<string, unknown> };

export function parseReply(json: string): Reply {
  const reply: unknown = JSON.parse(json);
  if (!isRecord(reply) || typeof reply.id !== 'number' || (reply.kind !== 'check' && reply.kind !== 'query')) throw new Error(`A reply of the service is not one: ${json.slice(0, 200)}`);
  if (reply.kind === 'query') {
    if (!isRecord(reply.result)) throw new Error('A query has no result');
    return { id: reply.id, kind: 'query', serviceMs: typeof reply.ms === 'number' ? reply.ms : 0, result: reply.result };
  }
  if (reply.superseded === true) {
    if (typeof reply.by !== 'number') throw new Error('A superseded check says nothing of what superseded it');
    return { id: reply.id, kind: 'check', outcome: { kind: 'superseded', by: reply.by } };
  }
  const result = reply.result;
  if (!isRecord(result)) throw new Error('A check has no result');
  if (result.ok === true && isCheckReport(result.report) && typeof reply.ms === 'number') {
    return { id: reply.id, kind: 'check', outcome: { kind: 'checked', report: result.report, serviceMs: reply.ms } };
  }
  const first = Array.isArray(result.diagnostics) ? result.diagnostics[0] : undefined;
  const message = isCompileDiagnostic(first) ? first.message : `the check failed: ${JSON.stringify(result).slice(0, 300)}`;
  return { id: reply.id, kind: 'check', outcome: { kind: 'failed', message } };
}

/** The project the editor opens: `scripts/live-compile-project.mjs` writes it. */
export interface ProjectFile {
  readonly path: string;
  readonly text: string;
}

export interface LabProject {
  /** The checker's configuration for the lab: its sources are the roots. */
  readonly config: string;
  readonly sources: readonly string[];
}

export interface Project {
  readonly version: 1;
  readonly libDir: string;
  readonly files: readonly ProjectFile[];
  readonly labs: Readonly<Record<string, LabProject>>;
}

export function parseProject(json: string): Project {
  const value: unknown = JSON.parse(json);
  if (!isRecord(value) || value.version !== 1 || typeof value.libDir !== 'string' || !Array.isArray(value.files) || !isRecord(value.labs)) {
    throw new Error('The live-compile project is not a version 1 project');
  }
  const files = value.files.map((file: unknown): ProjectFile => {
    if (!isRecord(file) || typeof file.path !== 'string' || typeof file.text !== 'string') throw new Error('A file of the live-compile project has no path and text');
    return { path: file.path, text: file.text };
  });
  const labs: Record<string, LabProject> = {};
  for (const [id, lab] of Object.entries(value.labs)) {
    if (!isRecord(lab) || typeof lab.config !== 'string' || !isStringArray(lab.sources)) throw new Error(`The lab ${id} of the live-compile project is malformed`);
    labs[id] = { config: lab.config, sources: lab.sources };
  }
  return { version: 1, libDir: value.libDir, files, labs };
}

export function parseHover(result: Record<string, unknown>): Hover | null {
  if (result.ok !== true) throw new Error(`A hover failed: ${JSON.stringify(result).slice(0, 300)}`);
  const hover = result.hover;
  if (hover === null) return null;
  if (!isRecord(hover) || typeof hover.start !== 'number' || typeof hover.end !== 'number' || typeof hover.name !== 'string' || typeof hover.type !== 'string') {
    throw new Error('A hover has no span, name and type');
  }
  return { start: hover.start, end: hover.end, name: hover.name, type: hover.type };
}

export function parseInlayHints(result: Record<string, unknown>): InlayHint[] {
  if (result.ok !== true || !Array.isArray(result.hints)) throw new Error(`Inlay hints failed: ${JSON.stringify(result).slice(0, 300)}`);
  return result.hints.map((hint: unknown): InlayHint => {
    if (!isRecord(hint) || typeof hint.position !== 'number' || (hint.kind !== 'type' && hint.kind !== 'parameter') || typeof hint.label !== 'string') {
      throw new Error('An inlay hint has no position, kind and label');
    }
    return { position: hint.position, kind: hint.kind, label: hint.label };
  });
}
