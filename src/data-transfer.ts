/**
 * HTML `DataTransfer` for drag and drop (plan 3.19), without the DOM: the drag data store with its
 * three protection modes, `setData` / `getData` / `clearData` / `types`, and the `effectAllowed` /
 * `dropEffect` negotiation. Native decides when each drag event happens; JS owns the data, because
 * only JS handlers read and write it. Specification: WHATWG HTML, "Drag and drop"
 * (https://html.spec.whatwg.org/multipage/dnd.html).
 *
 * # How the renderer uses it (Phase I9)
 *
 * One {@link DragDataStore} per drag session, created when native reports `dragstart`. Every event's
 * handlers get a fresh {@link DataTransfer} bound to that store, put in the mode its event calls for:
 *
 * ```ts
 * const store = new DragDataStore();                                    // dragstart
 * const prevented = store.dispatch('dragstart', (transfer) => run(transfer));  // handlers call setData
 * if (prevented) store.dispose();
 * store.dispatch('drag', run);                                          // also dragenter, dragleave
 * const effect = store.dispatchDragOver((transfer) => runAndReturnDefaultPrevented(transfer));
 * resolveEvent(host, seq, defaultPrevented, effect);                    // the negotiated effect
 * store.dispatchDrop((transfer) => runAndReturnDefaultPrevented(transfer));
 * store.dispatchDragEnd(nativeDropEffect, run);                         // then the store is disposed
 * ```
 *
 * Not modelled (no files, no `items` list, no native clipboard-like data): `files`, `items`,
 * `setDragImage` (the ghost is `dragPreview` on the element), and the UA behaviours for text controls
 * and links.
 */

/** `DataTransfer.dropEffect` values. */
export const DROP_EFFECTS = ['none', 'copy', 'link', 'move'] as const;
export type DropEffect = (typeof DROP_EFFECTS)[number];

/** `DataTransfer.effectAllowed` values. */
export const EFFECTS_ALLOWED = [
  'none', 'copy', 'copyLink', 'copyMove', 'link', 'linkMove', 'move', 'all', 'uninitialized',
] as const;
export type EffectAllowed = (typeof EFFECTS_ALLOWED)[number];

/** The drag events whose handlers receive a `DataTransfer`. */
export type DragEventType = 'dragstart' | 'drag' | 'dragenter' | 'dragover' | 'dragleave' | 'drop' | 'dragend';

/**
 * The drag data store's mode: `read-write` during `dragstart` (data can be added), `read-only` during
 * `drop` (data can be read), `protected` otherwise (formats are visible, data is hidden and nothing can
 * be added).
 */
export type DataStoreMode = 'read-write' | 'read-only' | 'protected';

const MODE_BY_EVENT: Record<DragEventType, DataStoreMode> = {
  dragstart: 'read-write',
  drag: 'protected',
  dragenter: 'protected',
  dragover: 'protected',
  dragleave: 'protected',
  drop: 'read-only',
  dragend: 'protected',
};

/** The effects a drop effect other than `none` needs `effectAllowed` to include. */
const EFFECTS_ALLOWING: Record<Exclude<DropEffect, 'none'>, readonly EffectAllowed[]> = {
  copy: ['uninitialized', 'copy', 'copyLink', 'copyMove', 'all'],
  link: ['uninitialized', 'link', 'copyLink', 'linkMove', 'all'],
  move: ['uninitialized', 'move', 'copyMove', 'linkMove', 'all'],
};

const MIME_PLAIN_TEXT = 'text/plain';
const MIME_URI_LIST = 'text/uri-list';
const URI_LIST_COMMENT_PREFIX = '#';
const LINE_BREAK = /\r\n|\r|\n/;

export function isDropEffect(value: unknown): value is DropEffect {
  return DROP_EFFECTS.some((effect) => effect === value);
}

export function isEffectAllowed(value: unknown): value is EffectAllowed {
  return EFFECTS_ALLOWED.some((effect) => effect === value);
}

/**
 * The effect `dropEffect` starts with on `dragenter` and `dragover`, from the source's
 * `effectAllowed`: the spec's table, taking the first alternative where it lists several. With
 * `uninitialized` the spec's default depends on what is dragged (a text selection, a link); none of
 * that exists here, so it is the generic `copy`.
 */
export function defaultDropEffect(effectAllowed: EffectAllowed): DropEffect {
  switch (effectAllowed) {
    case 'none': return 'none';
    case 'copy':
    case 'copyLink':
    case 'copyMove':
    case 'all':
    case 'uninitialized': return 'copy';
    case 'link':
    case 'linkMove': return 'link';
    case 'move': return 'move';
  }
}

/**
 * The current drag operation after a canceled `dragover`: the handler's `dropEffect` if the source's
 * `effectAllowed` permits it, otherwise `none`, which makes the drop impossible.
 */
export function negotiateDropEffect(effectAllowed: EffectAllowed, dropEffect: DropEffect): DropEffect {
  if (dropEffect === 'none') return 'none';
  return EFFECTS_ALLOWING[dropEffect].includes(effectAllowed) ? dropEffect : 'none';
}

/** Format names are case-insensitive, and `text` and `url` are legacy names for two MIME types. */
function normalizeFormat(format: string): string {
  const lowered = format.toLowerCase();
  if (lowered === 'text') return MIME_PLAIN_TEXT;
  if (lowered === 'url') return MIME_URI_LIST;
  return lowered;
}

/** The first URL of a `text/uri-list`: the first line that is neither empty nor a comment. */
function firstUri(uriList: string): string {
  for (const line of uriList.split(LINE_BREAK)) {
    if (line !== '' && !line.startsWith(URI_LIST_COMMENT_PREFIX)) return line;
  }
  return '';
}

const EMPTY_TYPES: readonly string[] = Object.freeze([]);

interface DataItem {
  readonly type: string;
  readonly data: string;
}

export interface DragDataStoreOptions {
  readonly mode?: DataStoreMode;
  readonly allowedEffects?: EffectAllowed;
}

/**
 * The state of one drag: its items, `effectAllowed`, the current drag operation and the mode that says
 * what handlers may do. Created in the `dragstart` state, so the first {@link DragDataStore.dispatch} of
 * a session is its `dragstart`.
 */
export class DragDataStore {
  #items: DataItem[] = [];
  #types: readonly string[] | null = null;
  #mode: DataStoreMode;
  #allowedEffects: EffectAllowed;
  #operation: DropEffect = 'none';
  #associated = true;

  /** A store for a drag: `uninitialized` effects, protected between events. */
  constructor(options: DragDataStoreOptions = {}) {
    this.#mode = options.mode ?? 'protected';
    this.#allowedEffects = options.allowedEffects ?? 'uninitialized';
  }

  /** False once the drag is over: transfers kept by handlers then see an empty, inert object. */
  get isAssociated(): boolean { return this.#associated; }
  get mode(): DataStoreMode { return this.#mode; }
  get allowedEffects(): EffectAllowed { return this.#allowedEffects; }

  /** The drag operation the last `dragover` (or `drop`) settled on. */
  get currentOperation(): DropEffect { return this.#operation; }

  /** The formats of the items in the order they were added; always readable, in every mode. */
  types(): readonly string[] {
    if (!this.#associated) return EMPTY_TYPES;
    this.#types ??= Object.freeze(this.#items.map((item) => item.type));
    return this.#types;
  }

  /** `''` when the format is absent or the store is protected. */
  getData(format: string): string {
    if (!this.#associated || this.#mode === 'protected') return '';
    const type = normalizeFormat(format);
    const found = this.#items.find((item) => item.type === type);
    if (found === undefined) return '';
    return type === MIME_URI_LIST && format.toLowerCase() === 'url' ? firstUri(found.data) : found.data;
  }

  /** Replaces an item of the same format (the new one goes last). Ignored unless read/write. */
  setData(format: string, data: string): void {
    if (!this.#associated || this.#mode !== 'read-write') return;
    const type = normalizeFormat(format);
    this.#items = this.#items.filter((item) => item.type !== type);
    this.#items.push({ type, data });
    this.#types = null;
  }

  /** Removes one format, or every item. Ignored unless read/write. */
  clearData(format?: string): void {
    if (!this.#associated || this.#mode !== 'read-write') return;
    const type = format === undefined ? undefined : normalizeFormat(format);
    this.#items = type === undefined ? [] : this.#items.filter((item) => item.type !== type);
    this.#types = null;
  }

  /** Only a read/write store takes a new `effectAllowed`, and only a valid one; anything else is ignored. */
  setAllowedEffects(value: string): void {
    if (this.#associated && this.#mode === 'read-write' && isEffectAllowed(value)) this.#allowedEffects = value;
  }

  /**
   * Run `run` with a new `DataTransfer` for a `type` event (any but `dragover`, `drop` and `dragend`,
   * which have their own methods) while the store is in that event's mode; returns what `run` returns.
   * The mode is restored afterwards even if `run` throws.
   */
  dispatch<T>(type: Exclude<DragEventType, 'dragover' | 'drop' | 'dragend'>, run: (transfer: DataTransfer) => T): T {
    return this.#dispatch(type, run);
  }

  /**
   * Run the `dragover` handlers. `run` returns whether the event ended up `defaultPrevented`. The
   * result is the negotiated drag operation to report to native with `resolveEvent`: the handler's
   * `dropEffect` if it prevented the event and `effectAllowed` permits it, else `none` (no drop).
   * (The spec's one other accepted case, a drop on a text control, does not exist here.)
   */
  dispatchDragOver(run: (transfer: DataTransfer) => boolean): DropEffect {
    return this.#dispatch('dragover', (transfer) => {
      const prevented = run(transfer);
      this.#operation = prevented ? negotiateDropEffect(this.#allowedEffects, transfer.dropEffect) : 'none';
      return this.#operation;
    });
  }

  /**
   * Run the `drop` handlers (read-only store). `dropEffect` starts as the operation of the last
   * `dragover`. If a handler prevents the event the operation becomes the `dropEffect` it leaves
   * (the spec), else `none`; that is the result to report to native.
   */
  dispatchDrop(run: (transfer: DataTransfer) => boolean): DropEffect {
    return this.#dispatch('drop', (transfer) => {
      const prevented = run(transfer);
      this.#operation = prevented ? transfer.dropEffect : 'none';
      return this.#operation;
    });
  }

  /**
   * Run the `dragend` handlers with `dropEffect` set to what native reports, then dispose the store:
   * the drag is over.
   */
  dispatchDragEnd(dropEffect: DropEffect, run: (transfer: DataTransfer) => void): void {
    this.#operation = dropEffect;
    try {
      this.#dispatch('dragend', run);
    } finally {
      this.dispose();
    }
  }

  /** End the association: every `DataTransfer` of this store becomes empty and inert. */
  dispose(): void {
    this.#associated = false;
    this.#items = [];
    this.#types = null;
    this.#mode = 'protected';
  }

  #dispatch<T>(type: DragEventType, run: (transfer: DataTransfer) => T): T {
    if (!this.#associated) throw new Error(`Cannot dispatch ${type}: the drag data store was disposed`);
    const previous = this.#mode;
    this.#mode = MODE_BY_EVENT[type];
    const transfer = new DataTransfer(this);
    transfer.dropEffect = this.#initialDropEffect(type);
    try {
      return run(transfer);
    } finally {
      // A disposed store stays protected; otherwise go back to where the dispatch found it.
      this.#mode = this.#associated ? previous : 'protected';
    }
  }

  #initialDropEffect(type: DragEventType): DropEffect {
    switch (type) {
      case 'dragstart':
      case 'drag':
      case 'dragleave': return 'none';
      case 'drop':
      case 'dragend': return this.#operation;
      case 'dragenter':
      case 'dragover': return defaultDropEffect(this.#allowedEffects);
    }
  }
}

/**
 * The object drag event handlers read and write. Bound to a {@link DragDataStore}; what it may do
 * depends on the store's mode at the time (see {@link DataStoreMode}). Construct one yourself for a
 * standalone read/write transfer with `effectAllowed` `none`, as `new DataTransfer()` is in browsers.
 */
export class DataTransfer {
  #store: DragDataStore;
  #dropEffect: DropEffect = 'none';

  constructor(store: DragDataStore = new DragDataStore({ mode: 'read-write', allowedEffects: 'none' })) {
    this.#store = store;
  }

  /** The formats added so far, oldest first. Visible in every mode. */
  get types(): readonly string[] { return this.#store.types(); }

  /** `''` for a missing format and, in `dragenter`, `dragover`, `dragleave`, `drag` and `dragend`, always. */
  getData(format: string): string { return this.#store.getData(format); }

  /** Only during `dragstart`. */
  setData(format: string, data: string): void { this.#store.setData(format, data); }

  /** Only during `dragstart`. */
  clearData(format?: string): void { this.#store.clearData(format); }

  /** What the source allows; `none` once the drag is over. Only assignable during `dragstart`. */
  get effectAllowed(): EffectAllowed { return this.#store.isAssociated ? this.#store.allowedEffects : 'none'; }
  set effectAllowed(value: string) { this.#store.setAllowedEffects(value); }

  /**
   * What a drop here would do. Handlers of `dragenter` and `dragover` set it to say which operation
   * they accept; it starts as {@link defaultDropEffect} of `effectAllowed`. Any string that is not an
   * effect is ignored, as in browsers.
   */
  get dropEffect(): DropEffect { return this.#dropEffect; }
  set dropEffect(value: string) {
    if (isDropEffect(value)) this.#dropEffect = value;
  }
}
