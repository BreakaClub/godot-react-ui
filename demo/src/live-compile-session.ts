import { createElement, useSyncExternalStore, type ComponentType } from 'react';
import type { ReactRoot } from 'godot-react-ui';
import type { LiveCompileHost } from './live-compile-host';
import { onPerformRefresh, resolveRefreshComponent, stableWrapper } from './live-compile-refresh';
import { liveTree } from './live-compile-root';
import { ModuleRegistry, type RefreshHooks } from './live-compile-modules';
import type { CheckOutcome, CompileDiagnostic, CompileResult, Hover, InlayHint, ParameterNames, Project } from './live-compile-protocol';

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
  /**
   * The root the lab renders in. Without `embedded` the session mounts the lab as the root's whole tree. With it the root is
   * the one the caller's tree is mounted in (`root.flushSync` commits an edit before `update` returns) and the caller renders
   * `session.Lab` wherever the lab belongs in that tree.
   */
  readonly root: ReactRoot;
  /** The caller renders `Lab` inside a tree of its own; the session does not mount anything. */
  readonly embedded?: boolean;
  readonly refresh: RefreshHooks;
  /** Asks React Fast Refresh to re-render what the registrations since the last call changed (`refresh.ts`). */
  readonly performRefresh: () => unknown;
  /** Milliseconds, from a clock with sub-millisecond resolution. */
  readonly now: () => number;
}

const LAB_SOURCE_PATTERN = /^\/project\/lab\/.+\.tsx?$/u;

/** Wraps React externals so that any component rendered via createElement/jsx/jsxs is resolved to its family proxy. */
function wrapExternals(externals: Readonly<Record<string, object>>): Record<string, object> {
  const result: Record<string, object> = { ...externals };

  const reactExternal = externals['react'];
  if (reactExternal !== undefined) {
    result['react'] = new Proxy(reactExternal, {
      get(target, prop) {
        const value = Reflect.get(target, prop);
        if (prop === 'createElement' && typeof value === 'function') {
          return (type: unknown, props: unknown, ...children: unknown[]) =>
            Reflect.apply(value, target, [resolveRefreshComponent(type), props, ...children]);
        }
        return value;
      },
    });
  }

  const jsxExternal = externals['react/jsx-runtime'];
  if (jsxExternal !== undefined) {
    result['react/jsx-runtime'] = new Proxy(jsxExternal, {
      get(target, prop) {
        const value = Reflect.get(target, prop);
        if ((prop === 'jsx' || prop === 'jsxs') && typeof value === 'function') {
          return (type: unknown, props: unknown, key: unknown) =>
            Reflect.apply(value, target, [resolveRefreshComponent(type), props, key]);
        }
        return value;
      },
    });
  }

  const jsxDevExternal = externals['react/jsx-dev-runtime'];
  if (jsxDevExternal !== undefined) {
    result['react/jsx-dev-runtime'] = new Proxy(jsxDevExternal, {
      get(target, prop) {
        const value = Reflect.get(target, prop);
        if (prop === 'jsxDEV' && typeof value === 'function') {
          return (type: unknown, props: unknown, key: unknown, isStatic: unknown, source: unknown, self: unknown) =>
            Reflect.apply(value, target, [resolveRefreshComponent(type), props, key, isStatic, source, self]);
        }
        return value;
      },
    });
  }

  return result;
}

/**
 * A module's own `react`: `memo` and `forwardRef` made one object for each component whatever the number of times the module is
 * evaluated (`stableWrapper`). The rest is the shared `react`.
 */
function reactForModule(react: object, path: string): object {
  const made = new Map<string, number>();
  const keyOf = (component: unknown, kind: string): string => {
    const name = typeof component === 'function' ? component.name : '';
    const label = `${kind}:${name}`;
    const index = made.get(label) ?? 0;
    made.set(label, index + 1);
    return `${path} ${label}#${index}`;
  };
  return new Proxy(react, {
    get(target, property) {
      const value = Reflect.get(target, property);
      if ((property === 'memo' || property === 'forwardRef') && typeof value === 'function') {
        return (component: unknown, compare?: unknown) => stableWrapper(
          keyOf(component, property), component, compare,
          (inner, comparison) => Reflect.apply(value, target, property === 'memo' ? [inner, comparison] : [inner]),
        );
      }
      return value;
    },
  });
}

/** Narrows an export to something React can render; the Fast Refresh runtime has already judged it a component by its shape. */
function asComponent(value: unknown, where: string): ComponentType<{ readonly __refreshEpoch?: number }> {
  if (typeof value !== 'function') throw new Error(`${where} is not a component (it is ${typeof value})`);
  // A function export is a component here: the compiler registered it with Fast Refresh, which does so only for functions that
  // are named like components. `ComponentType` has no runtime tag to check.
  return value as ComponentType<{ readonly __refreshEpoch?: number }>;
}

export class LiveSession {
  private readonly options: LiveSessionOptions;
  private readonly registry: ModuleRegistry;
  private readonly entryPath: string;
  private epoch = 0;
  private refreshTick = 0;
  private renderError: Error | undefined;
  private compileMs = 0;
  private mounted = false;
  private readonly unsubscribeRefresh: () => void;
  /** An embedded session tells the `Lab` components rendered from it that the lab has to render again. */
  private readonly renderListeners = new Set<() => void>();
  private renderVersion = 0;

  private readonly recordRenderError = (error: Error): void => {
    this.renderError = error;
  };

  private readonly subscribeToRender = (listener: () => void): (() => void) => {
    this.renderListeners.add(listener);
    return () => { this.renderListeners.delete(listener); };
  };

  private readonly readRenderVersion = (): number => this.renderVersion;

  private readonly Entry: ComponentType = () => {
    const raw = this.registry.exportOf(this.entryPath, this.options.exportName);
    const resolved = resolveRefreshComponent(raw);
    const component = asComponent(resolved, `${this.entryPath}'s ${this.options.exportName}`);
    return createElement(component, { __refreshEpoch: this.refreshTick });
  };

  /**
   * The lab as a component, for a session opened with `embedded`: render it wherever the lab belongs in the caller's tree. It
   * renders the edited component inside the error boundary, and again each time an edit is swapped in.
   */
  readonly Lab: ComponentType = () => {
    useSyncExternalStore(this.subscribeToRender, this.readRenderVersion);
    return liveTree(this.Entry, this.epoch, this.recordRenderError);
  };

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
      externals: wrapExternals(options.externals),
      aliases: options.aliases,
      refresh: options.refresh,
      compile: (path, source) => this.compile(path, source),
      moduleExternals: path => (specifier, external) => (specifier === 'react' ? reactForModule(external, path) : external),
    });
    this.unsubscribeRefresh = onPerformRefresh(() => this.refreshRender());
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
    const exported = this.registry.exportOf(this.entryPath, this.options.exportName);
    if (typeof exported !== 'function') {
      throw new Error(`${this.entryPath} does not export a component called ${this.options.exportName}`);
    }
    this.mount();
  }

  /** Checks the project as the checker has it now. */
  check(): Promise<CheckOutcome> {
    const lab = this.options.project.labs[this.options.labId];
    if (lab === undefined) return Promise.reject(new Error(`The live-compile project has no lab ${this.options.labId}`));
    return this.options.host.requestCheck(lab.config, this.options.project.libDir);
  }

  /** Gives the checker `text` as the new text of `path` and checks the project, without compiling or running it. */
  checkText(path: string, text: string): Promise<CheckOutcome> {
    this.options.host.setFile(path, text);
    return this.check();
  }

  /** What is under a UTF-16 offset of a source file: the name and its type. The checker has the text of the last `update`. */
  hover(path: string, offset: number): Promise<Hover | null> {
    const lab = this.lab();
    return this.options.host.hover(lab.config, this.options.project.libDir, path, offset);
  }

  /** The inferred types and parameter names to draw between two UTF-16 offsets of a source file. */
  inlayHints(path: string, from: number, to: number, parameterNames: ParameterNames = 'literals'): Promise<InlayHint[]> {
    const lab = this.lab();
    return this.options.host.inlayHints(lab.config, this.options.project.libDir, path, from, to, parameterNames);
  }

  private lab(): { readonly config: string } {
    const lab = this.options.project.labs[this.options.labId];
    if (lab === undefined) throw new Error(`The live-compile project has no lab ${this.options.labId}`);
    return lab;
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
    // The new components threw while they rendered: React has dropped what they were rendering. The registry goes back to the instances it
    // had, and the last version that ran is evaluated again from its source: Fast Refresh registers each function once, so its families
    // can be given the old code only as new functions. The page then renders from a fresh boundary and shows that version (its state
    // starts again: the tree that held it is gone).
    const evaluated = change.evaluated;
    change.revert();
    this.renderError = undefined;
    for (const path of evaluated) {
      const previous = this.registry.prepare(path, this.registry.sourceOf(path));
      if (!previous.ok) throw new Error(`The last version of ${path} that ran does not run again: ${previous.phase === 'evaluate' ? previous.error.message : previous.diagnostics.map(diagnostic => diagnostic.message).join('; ')}`);
      previous.change.register();
    }
    performRefresh();
    this.epoch += 1;
    this.mount();
    return report('render-failed', { error: failure.message, evaluated, rolledBack: true });
  }

  unmount(): void {
    if (!this.mounted) return;
    this.mounted = false;
    this.unsubscribeRefresh();
    // An embedded lab goes when the caller's tree stops rendering `Lab`.
    if (this.options.embedded !== true) this.options.root.render(null);
  }

  private refreshRender(): void {
    if (!this.mounted) return;
    this.refreshTick += 1;
    this.render();
  }

  /** Puts the lab on the page, now: as the root's tree, or by telling the `Lab` components to render and committing them. */
  private render(): void {
    const { root, embedded } = this.options;
    if (embedded === true) {
      root.flushSync(() => {
        this.renderVersion += 1;
        for (const listener of [...this.renderListeners]) listener();
      });
      return;
    }
    root.render(liveTree(this.Entry, this.epoch, this.recordRenderError));
  }

  private compile(path: string, source: string): CompileResult {
    const started = this.options.now();
    const result = this.options.host.compile(path, source, true);
    this.compileMs += this.options.now() - started;
    return result;
  }

  private mount(): void {
    this.mounted = true;
    this.render();
  }
}
