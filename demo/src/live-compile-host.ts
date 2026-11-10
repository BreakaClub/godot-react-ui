import { ClassDB, FileAccess, LiveCompile, PackedStringArray, RefCounted } from 'godot';
import {
  parseProject, type CheckOutcome, type CompileResult, type Hover, type InlayHint, type ParameterNames, type Project, type ProjectFile,
} from './live-compile-protocol';
import type { RequestScope } from './live-compile-scope';
import { ExtensionHost, type ServiceLink } from './live-compile-service';

// `LiveCompile` is the class of the live-compile extension (`live-compile/ext/lib.rs`, `demo/addons/live-compile/`). The extension is
// built on request (`node scripts/build-live-compile.mjs`), so the generated typings do not describe it and a build without it has
// no such class: it is declared here, as the probe classes are (`probe.ts`), and `openExtensionHost` says what to do when it is
// missing. The names are camel-cased by GodotJS (`runtime/core/camel_case_bindings_enabled`).
declare module 'godot' {
  class LiveCompile extends RefCounted {
    start(): void;
    stop(): void;
    setFile(path: string, text: string): void;
    setFiles(paths: PackedStringArray, texts: PackedStringArray): void;
    removeFile(path: string): void;
    requestPing(): number;
    requestCompile(path: string, source: string, refresh: boolean): number;
    requestCheck(config: string, libDir: string): number;
    requestQuery(requestJson: string): number;
    requestStall(milliseconds: number): number;
    cancel(id: number): boolean;
    poll(): string;
    state(): string;
  }
}

/** Where `scripts/live-compile-project.mjs` puts the project the editor opens. */
export const PROJECT_RESOURCE = 'res://live-compile/project.json';

/**
 * The compiler and the checker of one project, behind the same typed calls wherever they run. **No call waits for the service
 * thread.** Calls that change the project (`setFile`, `setFiles`) return at once; `compile`, `requestCheck`, `hover` and `inlayHints`
 * return a promise that is settled on a frame after the service thread has answered, and the frame goes on meanwhile. A browser
 * starts the service thread only when the page's own thread returns to its event loop, so a call that waited for it could stall the page.
 */
export interface LiveCompileHost {
  /**
   * The compiled form of the file. If `scope` is cancelled before the answer arrives the request is taken back and the promise fails
   * with `RequestCancelled`: an answer that was given up is never delivered.
   */
  compile(path: string, source: string, refresh: boolean, scope: RequestScope): Promise<CompileResult>;
  setFile(path: string, text: string): void;
  setFiles(files: readonly ProjectFile[]): void;
  /**
   * Starts a check of the project whose configuration file is `config`. A check not begun when the next is requested is superseded. With a
   * `scope`, cancelling it takes the check back like a compile, and the promise fails with `RequestCancelled`.
   */
  requestCheck(config: string, libDir: string, scope?: RequestScope): Promise<CheckOutcome>;
  /** What is under `offset` (UTF-16) in the file at `path`, in the project the configuration `config` names: the name and its type. */
  hover(config: string, libDir: string, path: string, offset: number, scope?: RequestScope): Promise<Hover | null>;
  /** The inferred types of declarations and the parameter names of arguments between two UTF-16 offsets of a file. */
  inlayHints(config: string, libDir: string, path: string, from: number, to: number, parameterNames: ParameterNames, scope?: RequestScope): Promise<InlayHint[]>;
  /** Ends the service. Every request still outstanding fails with `RequestCancelled`. */
  close(): void;
}

/** The extension's `LiveCompile` object behind the typed link the host speaks (`live-compile-service.ts`). */
class GodotLink implements ServiceLink {
  private readonly service = new LiveCompile();

  start(): void {
    this.service.start();
  }

  stop(): void {
    this.service.stop();
  }

  setFile(path: string, text: string): void {
    this.service.setFile(path, text);
  }

  setFiles(files: readonly ProjectFile[]): void {
    this.service.setFiles(new PackedStringArray(files.map(file => file.path)), new PackedStringArray(files.map(file => file.text)));
  }

  removeFile(path: string): void {
    this.service.removeFile(path);
  }

  requestPing(): number {
    return this.service.requestPing();
  }

  requestCompile(path: string, source: string, refresh: boolean): number {
    return this.service.requestCompile(path, source, refresh);
  }

  requestCheck(config: string, libDir: string): number {
    return this.service.requestCheck(config, libDir);
  }

  requestQuery(requestJson: string): number {
    return this.service.requestQuery(requestJson);
  }

  requestStall(milliseconds: number): number {
    return this.service.requestStall(milliseconds);
  }

  cancel(id: number): boolean {
    return this.service.cancel(id);
  }

  poll(): string {
    return this.service.poll();
  }

  state(): string {
    return this.service.state();
  }
}

/** The extension's host, or an error that says how to get the extension. */
export function openExtensionHost(): ExtensionHost {
  // Ask the engine before naming the class. A build without the extension has no such class, and on the Web naming a class the engine lacks makes the engine log
  // `godot class not found` as an error, caught or not: a Web export with no live-compile module for its profile would then fail a verifier
  // for a read-only panel that works. The class is also a property of the engine's module only when the extension loaded.
  if (!ClassDB.classExists('LiveCompile') || typeof LiveCompile !== 'function') {
    throw new Error('The live-compile extension is not loaded: natively, run "node scripts/build-live-compile.mjs" and import the project once (pnpm demo does); on the Web, run "node scripts/build-live-compile-web.mjs" for the profile (--engine=stock for stock) and "pnpm build:web --export-only"');
  }
  const link = new GodotLink();
  // The thread starts now, not at the first request, so a browser has begun its worker by the time the first request is asked for. Nothing waits for it.
  link.start();
  return new ExtensionHost(link);
}

/** The project the build wrote, read from the Godot project (a file in the pack on the Web). */
export function readProject(): Project {
  const text = FileAccess.getFileAsString(PROJECT_RESOURCE);
  if (text === '') throw new Error(`${PROJECT_RESOURCE} is missing or empty: run "node scripts/live-compile-project.mjs" (the export needs it in the pack too)`);
  return parseProject(text);
}
