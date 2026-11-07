import { createElement, type ComponentType } from 'react';
import type { ReactRoot } from 'godot-react-ui';
import type { LiveCompileHost } from './live-compile-host';
import { liveTree } from './live-compile-root';
import { ModuleRegistry, type RefreshHooks } from './live-compile-modules';
import type { CheckOutcome, CompileDiagnostic, CompileResult, Project } from './live-compile-protocol';

/**
 * A page the person edits: one lab of the demo, mounted from its compiled source and kept up to date as the source changes.
 *
 * `update(path, text)` is the call an editor makes on each change, and it is all the editor has to call. It
 *
 * 1. gives the text to the checker's project and asks for a check, which runs on the extension's thread while the rest goes on;
 * 2. compiles the file (Bun's parser and printer, with React Fast Refresh instrumentation);
 * 3. evaluates the result in this realm and, if it ran, registers the components and asks React Fast Refresh to re-render what
 *    changed, keeping the state of every component whose hooks are the same;
 * 4. if the render then throws, puts the last version that worked back and renders it.
 *
 * A file that does not compile, or whose module throws when it runs, changes nothing on the page. A type error changes nothing
 * either: the check reports it, and the page runs the new code as a browser's dev server does (the decision is in
 * docs/tracks/live-compile.md). The check's outcome is the report's `check`, a promise: the editor shows its diagnostics when it
 * arrives, and a newer edit's check supersedes an older one that has not begun.
 */

export type UpdateOutcome = 'swapped' | 'compile-failed' | 'evaluation-failed' | 'render-failed';

export interface UpdateTimings {
  /** Parser, lowering and printer, through the extension. */
  readonly compileMs: number;
  /** Running the compiled code, registering, and React's refresh (render and commit). */
  readonly swapMs: number;
  readonly totalMs: number;
}

export interface UpdateReport {
  readonly path: string;
  readonly outcome: UpdateOutcome;
  /** Syntax errors, when the file did not compile. */
  readonly diagnostics: readonly CompileDiagnostic[];
  /** The message of the error a module or a render threw. */
  readonly error?: string;
  /** The modules that were evaluated again. */
  readonly evaluated: readonly string[];
  /** True when the page shows the last good version because the new one threw while it rendered. */
  readonly rolledBack: boolean;
  readonly timings: UpdateTimings;
  /** The type check of the project with this text in it. It starts at once and does not wait for the swap. */
  readonly check: Promise<CheckOutcome>;
}

export interface LiveSessionOptions {
  readonly host: LiveCompileHost;
  readonly project: Project;
  /** The lab to edit: its id in the registry (`demo/src/labs.tsx`), as the project names it. */
  readonly labId: string;
  /** The name the lab's component is exported under from its first source file. */
  readonly exportName: string;
  /** The modules the demo's bundle holds, by the specifier the labs import them with. */
  readonly externals: Readonly<Record<string, object>>;
  readonly aliases: Readonly<Record<string, string>>;
  readonly root: ReactRoot;
  readonly refresh: RefreshHooks;
  /** Asks React Fast Refresh to re-render what the registrations since the last call changed (`refresh.ts`). */
  readonly performRefresh: () => unknown;
  /** Milliseconds, from a clock with sub-millisecond resolution. */
  readonly now: () => number;
}

const LAB_SOURCE_PATTERN = /^\/project\/lab\/.+\.tsx?$/u;

/** Narrows an export to something React can render; the Fast Refresh runtime has already judged it a component by its shape. */
function asComponent(value: unknown, where: string): ComponentType {
  if (typeof value !== 'function') throw new Error(`${where} is not a component (it is ${typeof value})`);
  // A function export is a component here: the compiler registered it with Fast Refresh, which does so only for functions that
  // are named like components. `ComponentType` has no runtime tag to check.
  return value as ComponentType;
}

export class LiveSession {
  private readonly options: LiveSessionOptions;
  private readonly registry: ModuleRegistry;
  private readonly entryPath: string;
  private epoch = 0;
  private renderError: Error | undefined;
  private compileMs = 0;
  private mounted = false;

  private readonly Entry: ComponentType = () => createElement(asComponent(this.registry.exportOf(this.entryPath, this.options.exportName), `${this.entryPath}'s ${this.options.exportName}`));

  constructor(options: LiveSessionOptions) {
    this.options = options;
    const lab = options.project.labs[options.labId];
    if (lab === undefined) throw new Error(`The live-compile project has no lab ${options.labId}`);
    const [entry] = lab.sources;
    if (entry === undefined) throw new Error(`The lab ${options.labId} has no source`);
    this.entryPath = entry;
    const files = new Map(options.project.files.filter(file => LAB_SOURCE_PATTERN.test(file.path)).map(file => [file.path, file.text]));
    this.registry = new ModuleRegistry({
      files,
      externals: options.externals,
      aliases: options.aliases,
      refresh: options.refresh,
      compile: (path, source) => this.compile(path, source),
    });
  }

  /** The text a module last ran from. */
  sourceOf(path: string): string {
    return this.registry.sourceOf(path);
  }

  /** The lab's source files, the one with the component first. */
  get sources(): readonly string[] {
    return this.options.project.labs[this.options.labId]?.sources ?? [];
  }

  /** Gives the checker the project, compiles and runs the lab and mounts it. Throws if the lab as the project has it does not run. */
  open(): void {
    this.options.host.setFiles(this.options.project.files);
    const loaded = this.registry.load(this.entryPath);
    if (!loaded.ok) {
      throw new Error(loaded.phase === 'compile' ? `${loaded.path} does not compile: ${loaded.diagnostics.map(diagnostic => diagnostic.message).join('; ')}` : `${loaded.path} threw: ${loaded.error.message}`);
    }
    loaded.change.register();
    this.mount();
  }

  /** Checks the project as the checker has it now. */
  check(): Promise<CheckOutcome> {
    const lab = this.options.project.labs[this.options.labId];
    if (lab === undefined) return Promise.reject(new Error(`The live-compile project has no lab ${this.options.labId}`));
    return this.options.host.requestCheck(lab.config, this.options.project.libDir);
  }

  update(path: string, text: string): UpdateReport {
    const { host, now, performRefresh } = this.options;
    const started = now();
    this.compileMs = 0;
    // The checker has every text, working or not, and checks while the swap happens.
    host.setFile(path, text);
    const check = this.check();
    const prepared = this.registry.prepare(path, text);
    const report = (outcome: UpdateOutcome, extra: Partial<UpdateReport>): UpdateReport => {
      const finished = now();
      return {
        path, outcome, diagnostics: [], evaluated: [], rolledBack: false, check,
        timings: { compileMs: this.compileMs, swapMs: finished - started - this.compileMs, totalMs: finished - started },
        ...extra,
      };
    };
    if (!prepared.ok) {
      return prepared.phase === 'compile'
        ? report('compile-failed', { diagnostics: prepared.diagnostics })
        : report('evaluation-failed', { error: prepared.error.message });
    }
    const { change } = prepared;
    change.register();
    this.renderError = undefined;
    let thrown: Error | undefined;
    try {
      performRefresh();
    } catch (error) {
      thrown = error instanceof Error ? error : new Error(String(error));
    }
    const failure = thrown ?? this.renderError;
    if (failure === undefined) return report('swapped', { evaluated: change.evaluated });
    // The new components threw while they rendered: React has dropped what they were rendering. The last version that ran is
    // registered again and rendered from a fresh boundary, so the page shows it (its state starts again: the tree that held it
    // is gone).
    const evaluated = change.evaluated;
    change.revert();
    this.renderError = undefined;
    performRefresh();
    this.epoch += 1;
    this.mount();
    return report('render-failed', { error: failure.message, evaluated, rolledBack: true });
  }

  unmount(): void {
    if (!this.mounted) return;
    this.mounted = false;
    this.options.root.render(null);
  }

  private compile(path: string, source: string): CompileResult {
    const started = this.options.now();
    const result = this.options.host.compile(path, source, true);
    this.compileMs += this.options.now() - started;
    return result;
  }

  private mount(): void {
    this.mounted = true;
    this.options.root.render(liveTree(this.Entry, this.epoch, error => {
      this.renderError = error;
    }));
  }
}
