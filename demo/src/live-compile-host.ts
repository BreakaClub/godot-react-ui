import { FileAccess, LiveCompile, PackedStringArray, RefCounted } from 'godot';
import {
  parseCompileResult, parseHover, parseInlayHints, parseProject, parseReply, type CheckOutcome, type CompileResult, type Hover, type InlayHint, type ParameterNames, type Project, type ProjectFile,
} from './live-compile-protocol';

// `LiveCompile` is the class of the live-compile extension (`live-compile/ext/lib.rs`, `demo/addons/live-compile/`). The extension is
// built on request (`node scripts/build-live-compile.mjs`), so the generated typings do not describe it and a build without it has
// no such class: it is declared here, as the probe classes are (`probe.ts`), and `openExtensionHost` says what to do when it is
// missing. The names are camel-cased by GodotJS (`runtime/core/camel_case_bindings_enabled`).
declare module 'godot' {
  class LiveCompile extends RefCounted {
    ping(): string;
    setFile(path: string, text: string): void;
    setFiles(paths: PackedStringArray, texts: PackedStringArray): void;
    removeFile(path: string): void;
    compile(path: string, source: string, refresh: boolean): string;
    requestCheck(config: string, libDir: string): number;
    requestQuery(requestJson: string): number;
    poll(): string;
    start(): void;
  }
}

/** Where `scripts/live-compile-project.mjs` puts the project the editor opens. */
export const PROJECT_RESOURCE = 'res://live-compile/project.json';

/**
 * The compiler and the checker of one project, behind the same typed calls wherever they run. Calls that change the project
 * (`setFile`) return at once; `compile` waits for its answer, which takes milliseconds; `requestCheck` answers later, on the
 * service's own thread, and never holds a frame.
 */
export interface LiveCompileHost {
  compile(path: string, source: string, refresh: boolean): CompileResult;
  setFile(path: string, text: string): void;
  setFiles(files: readonly ProjectFile[]): void;
  /** Starts a check of the project whose configuration file is `config`. A check not begun when the next is requested is superseded. */
  requestCheck(config: string, libDir: string): Promise<CheckOutcome>;
  /** What is under `offset` (UTF-16) in the file at `path`, in the project the configuration `config` names: the name and its type. */
  hover(config: string, libDir: string, path: string, offset: number): Promise<Hover | null>;
  /** The inferred types of declarations and the parameter names of arguments between two UTF-16 offsets of a file. */
  inlayHints(config: string, libDir: string, path: string, from: number, to: number, parameterNames: ParameterNames): Promise<InlayHint[]>;
  close(): void;
}

/** How soon `poll` asks again while a check is outstanding. Nothing polls while none is. */
const POLL_INTERVAL_MS = 1;

export class ExtensionHost implements LiveCompileHost {
  private readonly service: LiveCompile;
  private readonly waiting = new Map<number, (outcome: CheckOutcome) => void>();
  private readonly queries = new Map<number, (result: Record<string, unknown>) => void>();
  private polling = false;
  private closed = false;

  constructor(service: LiveCompile) {
    this.service = service;
  }

  compile(path: string, source: string, refresh: boolean): CompileResult {
    return parseCompileResult(this.service.compile(path, source, refresh));
  }

  setFile(path: string, text: string): void {
    this.service.setFile(path, text);
  }

  setFiles(files: readonly ProjectFile[]): void {
    this.service.setFiles(new PackedStringArray(files.map(file => file.path)), new PackedStringArray(files.map(file => file.text)));
  }

  requestCheck(config: string, libDir: string): Promise<CheckOutcome> {
    if (this.closed) return Promise.reject(new Error('The live-compile host is closed'));
    const id = this.service.requestCheck(config, libDir);
    return new Promise(resolve => {
      this.waiting.set(id, resolve);
      this.schedulePoll();
    });
  }

  hover(config: string, libDir: string, path: string, offset: number): Promise<Hover | null> {
    return this.query({ op: 'hover', config, libDir, path, offset }).then(parseHover);
  }

  inlayHints(config: string, libDir: string, path: string, from: number, to: number, parameterNames: ParameterNames): Promise<InlayHint[]> {
    return this.query({ op: 'inlayHints', config, libDir, path, from, to, parameterNames }).then(parseInlayHints);
  }

  close(): void {
    this.closed = true;
    this.waiting.clear();
    this.queries.clear();
  }

  private query(request: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (this.closed) return Promise.reject(new Error('The live-compile host is closed'));
    const id = this.service.requestQuery(JSON.stringify(request));
    return new Promise(resolve => {
      this.queries.set(id, resolve);
      this.schedulePoll();
    });
  }

  private schedulePoll(): void {
    if (this.polling) return;
    this.polling = true;
    setTimeout(() => this.poll(), POLL_INTERVAL_MS);
  }

  private poll(): void {
    this.polling = false;
    for (let json = this.service.poll(); json !== ''; json = this.service.poll()) {
      const reply = parseReply(json);
      if (reply.kind === 'query') {
        const resolveQuery = this.queries.get(reply.id);
        if (resolveQuery === undefined) throw new Error(`The service answered query ${reply.id}, which nobody is waiting for`);
        this.queries.delete(reply.id);
        resolveQuery(reply.result);
        continue;
      }
      const resolve = this.waiting.get(reply.id);
      if (resolve === undefined) throw new Error(`The service answered check ${reply.id}, which nobody is waiting for`);
      this.waiting.delete(reply.id);
      resolve(reply.outcome);
    }
    if (this.waiting.size > 0 || this.queries.size > 0) this.schedulePoll();
  }
}

/** The extension's host, or an error that says how to get the extension. */
export function openExtensionHost(): ExtensionHost {
  // The class is a property of the engine's module only when the extension loaded.
  if (typeof LiveCompile !== 'function') {
    throw new Error('The live-compile extension is not loaded: run "node scripts/build-live-compile.mjs", then import the project once (pnpm demo does)');
  }
  const service = new LiveCompile();
  // The thread starts now, not at the first request that waits for it (a browser starts it from a pool of workers).
  service.start();
  return new ExtensionHost(service);
}

/** The project the build wrote, read from the Godot project (a file in the pack on the Web). */
export function readProject(): Project {
  const text = FileAccess.getFileAsString(PROJECT_RESOURCE);
  if (text === '') throw new Error(`${PROJECT_RESOURCE} is missing or empty: run "node scripts/live-compile-project.mjs" (the export needs it in the pack too)`);
  return parseProject(text);
}
