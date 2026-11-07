import type { CompileDiagnostic, CompileResult } from './live-compile-protocol';

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
 * An edit is transactional. `prepare` compiles the new text and evaluates it (and what it newly imports); if either fails nothing
 * has changed. If both succeed the new instances are in place and the `Change` that is returned registers their components with
 * React Fast Refresh (`register`) or puts the old instances back (`revert`). Registration is deferred because it is the one thing
 * that reaches outside the registry: a module that throws halfway leaves React Refresh's families as they were.
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

/** The compiler: the extension's, or a stand-in in a test. */
export type CompileFunction = (path: string, source: string) => CompileResult;

type Exports = Record<string, unknown>;

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
  load(path: string): PrepareResult {
    const record = this.record(path);
    return this.prepare(path, record.source, true);
  }

  /**
   * Compiles `source` as the new text of `path` and evaluates it. A file that has not been loaded only takes the new text. Nothing
   * is changed if the compile or an evaluation fails.
   */
  prepare(path: string, source: string, forceEvaluate = false): PrepareResult {
    const record = this.record(path);
    if (record.instance === undefined && !forceEvaluate) {
      record.source = source;
      return { ok: true, change: { evaluated: [], register() {}, revert() {} } };
    }
    const compiled = this.options.compile(path, source);
    if (!compiled.ok) return { ok: false, phase: 'compile', path, diagnostics: compiled.diagnostics };
    const transaction = new Transaction(this.options.refresh);
    try {
      this.evaluate(transaction, record, source, compiled.code);
      this.propagate(transaction, record, new Set([path]));
    } catch (thrown) {
      transaction.undo();
      return { ok: false, phase: 'evaluate', path: thrown instanceof ModuleError ? thrown.path : path, error: asError(thrown instanceof ModuleError ? thrown.cause : thrown) };
    }
    return { ok: true, change: transaction };
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
  private propagate(transaction: Transaction, record: ModuleRecord, visited: Set<string>): void {
    const instance = record.instance;
    if (instance === undefined || this.isRefreshBoundary(instance.exports)) return;
    for (const importerPath of record.importers) {
      if (visited.has(importerPath)) continue;
      visited.add(importerPath);
      const importer = this.record(importerPath);
      if (importer.instance === undefined) continue;
      this.evaluate(transaction, importer, importer.instance.source, importer.instance.code);
      this.propagate(transaction, importer, visited);
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

  private evaluate(transaction: Transaction, record: ModuleRecord, source: string, code: string): void {
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
      Reflect.apply(body, undefined, [(specifier: string) => this.require(record.path, specifier, transaction, viewOf), exports, module, registerComponent, () => this.options.refresh.createSignature()]);
    } catch (thrown) {
      // A module this one required that threw is the one to name.
      throw thrown instanceof ModuleError ? thrown : new ModuleError(record.path, asError(thrown));
    } finally {
      record.evaluating = undefined;
    }
    record.instance = { source, code, exports: module.exports, registrations };
    transaction.record(record, previous);
  }

  private require(from: string, specifier: string, transaction: Transaction, viewOf: ((specifier: string, external: object) => object) | undefined): object {
    const aliased = this.options.aliases?.[specifier] ?? specifier;
    const external = this.options.externals[aliased];
    if (external !== undefined) return viewOf === undefined ? external : viewOf(aliased, external);
    const resolved = this.resolve(from, aliased);
    const record = this.record(resolved);
    record.importers.add(from);
    if (record.instance === undefined && record.evaluating === undefined) {
      const compiled = this.options.compile(resolved, record.source);
      if (!compiled.ok) {
        throw new ModuleError(resolved, new Error(`${resolved} does not compile: ${compiled.diagnostics.map(diagnostic => diagnostic.message).join('; ')}`));
      }
      this.evaluate(transaction, record, record.source, compiled.code);
    }
    return record.namespace;
  }

  private resolve(from: string, specifier: string): string {
    if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
      throw new Error(`Cannot find module '${specifier}' imported by ${from}: it is neither a module the demo provides nor a path in the project`);
    }
    const base = normalise(`${directoryOf(from)}/${specifier}`);
    const candidates = [base, ...SOURCE_EXTENSIONS.map(extension => `${base}${extension}`), ...SOURCE_EXTENSIONS.map(extension => `${base}/index${extension}`)];
    const found = candidates.find(candidate => this.records.has(candidate));
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
