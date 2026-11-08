import type { CompileDiagnostic, CompileResult } from './live-compile-protocol';
import type { RequestScope } from './live-compile-scope';

/**
 * The module registry of the live code editor: the compiled files of the project, evaluated in the realm that is running (this
 * one), with the library, React and the other things the demo's bundle holds as the modules they import.
 *
 * A compiled file is a function body (`live-compile/core/lower.rs`): `require`, `exports`, `module`, `$RefreshReg$` and
 * `$RefreshSig$` are its free identifiers. `require` answers a module's namespace, a stable object that reads the module's current
 * exports at the time of each use, so a module that is evaluated again (an edit) is seen by every importer without re-evaluating
 * them. An edit that cannot be seen that way, because the module exports something that is not a component (a constant an
 * importer read when it ran), is propagated to the importers, as every hot-reloading bundler does (`isRefreshBoundary`).
 *
 * An edit is transactional. `prepare` compiles the new text and everything it newly imports, then evaluates them; if either fails
 * nothing has changed. If both succeed the new instances are in place and the `Change` that is returned registers their components
 * with React Fast Refresh (`register`) or puts the old instances back (`revert`). Registration is deferred because it is the one
 * thing that reaches outside the registry: a module that throws halfway leaves React Refresh's families as they were.
 *
 * Compiling is asked of the service and answered a frame later, so `prepare` and `load` wait for it, and the module bodies cannot
 * ask for a compile in the middle of running (they are synchronous). Everything a body will `require` is therefore compiled
 * first: the compiler reports each file's static imports, and a file that is not loaded yet is compiled before the evaluation
 * that needs it begins. Evaluation then never waits. The requests of one `prepare` are made under the `scope` it is given, and
 * cancelling the scope takes them back and fails the `prepare` with `RequestCancelled`: nothing of an edit that was given up
 * is evaluated.
 */

/** A component, as the Fast Refresh runtime is told of it: the id is the module's path and the name the compiler gave it. */
export interface Registration {
  readonly type: unknown;
  readonly id: string;
}

/** What the registry needs of the Fast Refresh runtime (`refresh.ts` is the one that has it). */
export interface RefreshHooks {
  /** `$RefreshSig$`: a signature function for one module. */
  createSignature(): unknown;
  register(type: unknown, id: string): void;
  isLikelyComponentType(type: unknown): boolean;
}

/** The compiler: the extension's, or a stand-in in a test. It answers when the service has; `scope` takes the request back. */
export type CompileFunction = (path: string, source: string, scope: RequestScope) => Promise<CompileResult>;

type Exports = Record<string, unknown>;

/** A file that was compiled to be required by a module that is about to run: its code, or why it has none. */
type Dependency = { readonly ok: true; readonly code: string } | { readonly ok: false; readonly message: string };

/** The files compiled for one evaluation, by path. Only files that were not loaded are in it. */
type Dependencies = ReadonlyMap<string, Dependency>;

const NO_DEPENDENCIES: Dependencies = new Map();

/** One evaluation of a module's compiled code. */
interface Instance {
  readonly source: string;
  readonly code: string;
  readonly exports: Exports;
  readonly registrations: readonly Registration[];
}

class ModuleRecord {
  /** The current instance, or none while the module has not been loaded. */
  instance: Instance | undefined;
  /** The exports object of an evaluation in progress, which an import cycle reads. */
  evaluating: Exports | undefined;
  /** The modules that required this one, to re-evaluate when it changes in a way importers cannot see. */
  readonly importers = new Set<string>();
  readonly namespace: object;

  constructor(readonly path: string, public source: string) {
    this.namespace = createNamespace(this);
  }

  liveExports(): Exports {
    const exports = this.instance?.exports ?? this.evaluating;
    if (exports === undefined) throw new Error(`The module ${this.path} is not loaded`);
    return exports;
  }
}

/** The object `require` returns: a module namespace over whatever the module's exports are now. */
function createNamespace(record: ModuleRecord): object {
  const readOnly = (): never => {
    throw new TypeError(`The module ${record.path} is read-only: its exports cannot be changed from outside`);
  };
  return new Proxy({}, {
    get: (_target, property) => Reflect.get(record.liveExports(), property),
    has: (_target, property) => Reflect.has(record.liveExports(), property),
    ownKeys: () => Reflect.ownKeys(record.liveExports()),
    // A proxy must not report a property as non-configurable that its (empty) target does not have.
    getOwnPropertyDescriptor: (_target, property) => {
      const descriptor = Reflect.getOwnPropertyDescriptor(record.liveExports(), property);
      return descriptor === undefined ? undefined : { ...descriptor, configurable: true };
    },
    set: readOnly,
    defineProperty: readOnly,
    deleteProperty: readOnly,
  });
}

/** What `prepare` did, if it changed anything. */
export interface Change {
  /** The modules that were evaluated again (the edited one, and any importer that had to be), in order. */
  readonly evaluated: readonly string[];
  /** Tells React Fast Refresh about the new components. Call once, then ask the Fast Refresh runtime to refresh. */
  register(): void;
  /**
   * Puts the previous instances back, so that importers read them again. It does not touch React Fast Refresh: its runtime registers each
   * function once (a function it has seen is ignored), so the families cannot be handed their old functions back. To return the page to the
   * previous version the caller evaluates the previous source again (`prepare`), which makes new functions, and registers those.
   */
  revert(): void;
}

export type PrepareFailure =
  | { readonly ok: false; readonly phase: 'compile'; readonly path: string; readonly diagnostics: readonly CompileDiagnostic[] }
  | { readonly ok: false; readonly phase: 'evaluate'; readonly path: string; readonly error: Error };

export type PrepareResult = { readonly ok: true; readonly change: Change } | PrepareFailure;

const SOURCE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'] as const;

function directoryOf(path: string): string {
  return path.slice(0, path.lastIndexOf('/'));
}

/** `base/../x/./y` as `x/y`; the path is absolute. */
function normalise(path: string): string {
  const parts: string[] = [];
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return `/${parts.join('/')}`;
}

function asError(thrown: unknown): Error {
  return thrown instanceof Error ? thrown : new Error(String(thrown));
}

export interface RegistryOptions {
  /** The files of the project, by absolute path, with their text. */
  readonly files: ReadonlyMap<string, string>;
  /** Modules the realm already holds, by specifier: React, the JSX runtime, the library. */
  readonly externals: Readonly<Record<string, object>>;
  /** Specifiers that mean an external module under another name (a lab imports the library by its source path). */
  readonly aliases?: Readonly<Record<string, string>>;
  readonly compile: CompileFunction;
  readonly refresh: RefreshHooks;
  /**
   * For each evaluation of a module, a function that gives the module its own view of an external it requires (`react` with a
   * `memo` that knows which module is calling it). Called once per evaluation, so it can count what the module makes.
   */
  readonly moduleExternals?: (path: string) => (specifier: string, external: object) => object;
}

export class ModuleRegistry {
  private readonly records = new Map<string, ModuleRecord>();
  private readonly options: RegistryOptions;

  constructor(options: RegistryOptions) {
    this.options = options;
    for (const [path, text] of options.files) this.records.set(path, new ModuleRecord(path, text));
  }

  has(path: string): boolean {
    return this.records.has(path);
  }

  /** The text the module was last successfully evaluated from, or its original text while it has not been loaded. */
  sourceOf(path: string): string {
    return this.record(path).instance?.source ?? this.record(path).source;
  }

  isLoaded(path: string): boolean {
    return this.record(path).instance !== undefined;
  }

  /** The value of one export of a loaded module. */
  exportOf(path: string, name: string): unknown {
    const record = this.record(path);
    if (record.instance === undefined) throw new Error(`The module ${path} is not loaded`);
    return Reflect.get(record.instance.exports, name);
  }

  /** Loads a module and everything it imports, from the text the project has. The change is the first evaluation. */
  load(path: string, scope: RequestScope): Promise<PrepareResult> {
    const record = this.record(path);
    return this.prepare(path, record.source, scope, true);
  }

  /**
   * Compiles `source` as the new text of `path` and evaluates it. A file that has not been loaded only takes the new text. Nothing
   * is changed if the compile or an evaluation fails, or if `scope` is cancelled before the answers arrive (then this fails with
   * `RequestCancelled`).
   */
  async prepare(path: string, source: string, scope: RequestScope, forceEvaluate = false): Promise<PrepareResult> {
    const record = this.record(path);
    if (record.instance === undefined && !forceEvaluate) {
      record.source = source;
      return { ok: true, change: { evaluated: [], register() {}, revert() {} } };
    }
    const compiled = await this.options.compile(path, source, scope);
    scope.throwIfCancelled();
    if (!compiled.ok) return { ok: false, phase: 'compile', path, diagnostics: compiled.diagnostics };
    const dependencies = await this.compileDependencies(path, compiled.imports, scope);
    scope.throwIfCancelled();
    return this.apply(path, record, source, compiled.code, dependencies);
  }

  /**
   * Evaluates `path` again from the code its current instance ran from, with no compile. A page is put back as it was after a
   * render threw (`LiveSession.update`), and what it was is already compiled.
   */
  reload(path: string): PrepareResult {
    const record = this.record(path);
    const instance = record.instance;
    if (instance === undefined) return { ok: true, change: { evaluated: [], register() {}, revert() {} } };
    return this.apply(path, record, instance.source, instance.code, NO_DEPENDENCIES);
  }

  /** Evaluates `code` as the instance of `record` and the importers that cannot see it change, in one transaction. */
  private apply(path: string, record: ModuleRecord, source: string, code: string, dependencies: Dependencies): PrepareResult {
    const transaction = new Transaction(this.options.refresh);
    try {
      this.evaluate(transaction, record, source, code, dependencies);
      this.propagate(transaction, record, new Set([path]), dependencies);
    } catch (thrown) {
      transaction.undo();
      return { ok: false, phase: 'evaluate', path: thrown instanceof ModuleError ? thrown.path : path, error: asError(thrown instanceof ModuleError ? thrown.cause : thrown) };
    }
    return { ok: true, change: transaction };
  }

  /**
   * Compiles the files that `imports` of `path`, and the files those import in turn, that are not loaded: what the evaluation of
   * `path` will `require`. A specifier that is no file of the project (a module the demo provides, or one that does not exist) is
   * left to the evaluation, which reports it as it always did. The files of one level are asked for together, under one scope.
   */
  private async compileDependencies(path: string, imports: readonly string[], scope: RequestScope): Promise<Dependencies> {
    const compiled = new Map<string, Dependency>();
    let wanted: ReadonlyArray<{ readonly from: string; readonly specifiers: readonly string[] }> = [{ from: path, specifiers: imports }];
    while (wanted.length > 0) {
      const unloaded = new Map<string, ModuleRecord>();
      for (const { from, specifiers } of wanted) {
        for (const specifier of specifiers) {
          const resolved = this.projectModuleOf(from, specifier);
          // The module being prepared is compiled already (a cycle back to it finds it evaluating, not unloaded).
          if (resolved === undefined || resolved === path || compiled.has(resolved) || unloaded.has(resolved)) continue;
          const record = this.record(resolved);
          if (record.instance === undefined && record.evaluating === undefined) unloaded.set(resolved, record);
        }
      }
      const answers = await Promise.all([...unloaded].map(async ([resolved, record]) => ({ resolved, result: await this.options.compile(resolved, record.source, scope) })));
      scope.throwIfCancelled();
      const next: { from: string; specifiers: readonly string[] }[] = [];
      for (const { resolved, result } of answers) {
        if (result.ok) {
          compiled.set(resolved, { ok: true, code: result.code });
          next.push({ from: resolved, specifiers: result.imports });
        } else {
          compiled.set(resolved, { ok: false, message: result.diagnostics.map(diagnostic => diagnostic.message).join('; ') });
        }
      }
      wanted = next;
    }
    return compiled;
  }

  /** The project file a specifier means when `from` requires it, or nothing when it is a module the demo provides or is not found. */
  private projectModuleOf(from: string, specifier: string): string | undefined {
    const aliased = this.options.aliases?.[specifier] ?? specifier;
    if (this.options.externals[aliased] !== undefined) return undefined;
    return this.tryResolve(from, aliased);
  }

  private record(path: string): ModuleRecord {
    const record = this.records.get(path);
    if (record === undefined) throw new Error(`The project has no file ${path}`);
    return record;
  }

  /**
   * A module whose exports are not all components cannot be refreshed in place by itself: an importer may have read one of them
   * when it ran. Its importers are evaluated again, and theirs in turn until a module that is a boundary.
   */
  private propagate(transaction: Transaction, record: ModuleRecord, visited: Set<string>, dependencies: Dependencies): void {
    const instance = record.instance;
    if (instance === undefined || this.isRefreshBoundary(instance.exports)) return;
    for (const importerPath of record.importers) {
      if (visited.has(importerPath)) continue;
      visited.add(importerPath);
      const importer = this.record(importerPath);
      if (importer.instance === undefined) continue;
      this.evaluate(transaction, importer, importer.instance.source, importer.instance.code, dependencies);
      this.propagate(transaction, importer, visited, dependencies);
    }
  }

  /** Metro's rule: a module is a refresh boundary if it exports components and nothing else. */
  private isRefreshBoundary(exports: Exports): boolean {
    let hasExports = false;
    for (const name of Object.keys(exports)) {
      hasExports = true;
      if (!this.options.refresh.isLikelyComponentType(Reflect.get(exports, name))) return false;
    }
    return hasExports;
  }

  private evaluate(transaction: Transaction, record: ModuleRecord, source: string, code: string, dependencies: Dependencies): void {
    const exports: Exports = {};
    const module = { exports };
    const registrations: Registration[] = [];
    const registerComponent = (type: unknown, id: string): void => {
      registrations.push({ type, id: `${record.path} ${id}` });
    };
    const body = new Function('require', 'exports', 'module', '$RefreshReg$', '$RefreshSig$', `${code}\n//# sourceURL=live-compile:${record.path}`);
    const previous = record.instance;
    record.evaluating = exports;
    const viewOf = this.options.moduleExternals?.(record.path);
    try {
      Reflect.apply(body, undefined, [(specifier: string) => this.require(record.path, specifier, transaction, viewOf, dependencies), exports, module, registerComponent, () => this.options.refresh.createSignature()]);
    } catch (thrown) {
      // A module this one required that threw is the one to name.
      throw thrown instanceof ModuleError ? thrown : new ModuleError(record.path, asError(thrown));
    } finally {
      record.evaluating = undefined;
    }
    record.instance = { source, code, exports: module.exports, registrations };
    transaction.record(record, previous);
  }

  private require(from: string, specifier: string, transaction: Transaction, viewOf: ((specifier: string, external: object) => object) | undefined, dependencies: Dependencies): object {
    const aliased = this.options.aliases?.[specifier] ?? specifier;
    const external = this.options.externals[aliased];
    if (external !== undefined) return viewOf === undefined ? external : viewOf(aliased, external);
    const resolved = this.resolve(from, aliased);
    const record = this.record(resolved);
    record.importers.add(from);
    if (record.instance === undefined && record.evaluating === undefined) {
      // `compileDependencies` compiled everything a module that is about to run requires and has not loaded: one that is missing here
      // was not reachable from the imports the compiler reported, which is a defect, not a state to recover from.
      const dependency = dependencies.get(resolved);
      if (dependency === undefined) throw new Error(`${resolved} was required by ${from} before it was compiled`);
      if (!dependency.ok) throw new ModuleError(resolved, new Error(`${resolved} does not compile: ${dependency.message}`));
      this.evaluate(transaction, record, record.source, dependency.code, dependencies);
    }
    return record.namespace;
  }

  /** The project file `specifier` names from `from`, or nothing: it is not a relative path, or no file of the project is there. */
  private tryResolve(from: string, specifier: string): string | undefined {
    if (!specifier.startsWith('./') && !specifier.startsWith('../')) return undefined;
    const base = normalise(`${directoryOf(from)}/${specifier}`);
    const candidates = [base, ...SOURCE_EXTENSIONS.map(extension => `${base}${extension}`), ...SOURCE_EXTENSIONS.map(extension => `${base}/index${extension}`)];
    return candidates.find(candidate => this.records.has(candidate));
  }

  private resolve(from: string, specifier: string): string {
    if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
      throw new Error(`Cannot find module '${specifier}' imported by ${from}: it is neither a module the demo provides nor a path in the project`);
    }
    const found = this.tryResolve(from, specifier);
    if (found === undefined) throw new Error(`Cannot find module '${specifier}' imported by ${from}`);
    return found;
  }
}

/** An evaluation that threw, with the module it threw in (which is not the edited one when a dependency fails). */
class ModuleError extends Error {
  constructor(readonly path: string, readonly cause: Error) {
    super(cause.message);
  }
}

/** The instances an edit replaced, in the order it replaced them: undo puts them back. */
class Transaction implements Change {
  private readonly steps: { readonly record: ModuleRecord; readonly previous: Instance | undefined }[] = [];
  private readonly refresh: RefreshHooks;

  constructor(refresh: RefreshHooks) {
    this.refresh = refresh;
  }

  get evaluated(): readonly string[] {
    return this.steps.map(step => step.record.path);
  }

  record(record: ModuleRecord, previous: Instance | undefined): void {
    this.steps.push({ record, previous });
  }

  /** Puts every record back as it was. */
  undo(): void {
    for (const step of [...this.steps].reverse()) step.record.instance = step.previous;
    this.steps.length = 0;
  }

  register(): void {
    for (const { record } of this.steps) {
      for (const registration of record.instance?.registrations ?? []) this.refresh.register(registration.type, registration.id);
    }
  }

  revert(): void {
    this.undo();
  }
}
