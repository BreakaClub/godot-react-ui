import type { UIHandle } from './components';
import { DragDataStore, type DataTransfer, type DropEffect } from './data-transfer';
import { dispatchEvent, NOT_DISPATCHED, type DispatchResult, type PathNode, type RootTarget } from './events';
import type { NativeDragEndEvent, NativeDragEvent } from './native';

/** What dispatching a drag event produced: the usual result, and what native is told with `resolveEvent`. */
export interface DragDispatch extends DispatchResult {
  /**
   * The effect `resolveEvent` carries: for `dragover` and `drop` the negotiated one (`none` refuses), else ''.
   * Native requires one for a prevented `dragover` or `drop`.
   */
  readonly dropEffect: DropEffect | '';
}

function dispatched(result: DispatchResult, dropEffect: DropEffect | ''): DragDispatch {
  return { defaultPrevented: result.defaultPrevented, failure: result.failure, dropEffect };
}

/**
 * The `DataTransfer` stores of a root's drags, one per drag, found by the session id native numbers
 * the drag's events with. A store is made at `dragstart`, dropped when a handler prevents it or when `dragend`
 * has been delivered, and wiped when the root unmounts. Native always ends a drag with `dragend` (addressed to
 * the root when the dragged element has gone), so no store outlives its drag.
 */
export class DragSessions {
  readonly #stores = new Map<number, DragDataStore>();

  /** How many drags are underway: stores that have not seen their `dragend`. */
  get size(): number { return this.#stores.size; }

  /**
   * Dispatch `native` with a `DataTransfer` from its drag's store, in the mode the event calls for. `related`
   * is the other side of `dragenter` and `dragleave`.
   */
  dispatch(
    native: NativeDragEvent | NativeDragEndEvent, path: readonly PathNode[], related: UIHandle | null, root: RootTarget,
  ): DragDispatch {
    if (native.type === 'dragstart') return this.#start(native, path, related, root);
    const store = this.#stores.get(native.sessionId);
    if (store === undefined) {
      const failure = new Error(`UI internal error: ${native.type} for drag ${native.sessionId}, which has no data store`);
      return { defaultPrevented: false, failure, dropEffect: '' };
    }
    let result: DispatchResult = NOT_DISPATCHED;
    const run = (transfer: DataTransfer): void => {
      result = dispatchEvent(native, path, related, root, transfer);
    };
    switch (native.type) {
      case 'dragover': {
        const effect = store.dispatchDragOver((transfer) => { run(transfer); return result.defaultPrevented; });
        return dispatched(result, effect);
      }
      case 'drop': {
        const effect = store.dispatchDrop((transfer) => { run(transfer); return result.defaultPrevented; });
        return dispatched(result, effect);
      }
      case 'dragend':
        try {
          store.dispatchDragEnd(native.dropEffect, run);
        } finally {
          this.#stores.delete(native.sessionId);
        }
        return dispatched(result, '');
      case 'drag': case 'dragenter': case 'dragleave':
        store.dispatch(native.type, run);
        return dispatched(result, '');
    }
  }

  #start(native: NativeDragEvent, path: readonly PathNode[], related: UIHandle | null, root: RootTarget): DragDispatch {
    const store = new DragDataStore();
    this.#stores.set(native.sessionId, store);
    let result: DispatchResult = NOT_DISPATCHED;
    store.dispatch('dragstart', (transfer) => { result = dispatchEvent(native, path, related, root, transfer); });
    if (result.defaultPrevented) {
      // A drag that was stopped has no further events, so nothing else would end its store.
      store.dispose();
      this.#stores.delete(native.sessionId);
    }
    return dispatched(result, '');
  }

  /** The root is going away: end every drag's store. */
  clear(): void {
    for (const store of this.#stores.values()) store.dispose();
    this.#stores.clear();
  }
}
