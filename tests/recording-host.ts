import assert from 'node:assert/strict';
import {
  createRoot, type RootOptions, type UIRoot,
} from '../src';
import type {
  NativeEvent, NativeEventType, NativeFocusEventType, NativeHost, NativePointerEvent,
  NativePointerEventType, NativeSnapshot, NativeSnapshotNode,
} from '../src/native';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function node(id: number, kind: 'view' | 'text' | 'button'): NativeSnapshotNode {
  return {
    id, kind, text: '', parent: null, children: [], style: {},
    rect: { x: 0, y: 0, width: 100, height: 40 },
    clipRect: null,
    presentation: {width: 100, height: 40, widthIsAuto: false, heightIsAuto: false, opacity: 1, backgroundColor: '#00000000'},
  };
}

/** Records the real React renderer's protocol output; it deliberately does no layout or event synthesis. */
export class RecordingHost implements NativeHost {
  readonly nodes = new Map<number, NativeSnapshotNode>([[0, node(0, 'view')]]);
  readonly batches: Array<Array<{ op: string; id: number }>> = [];
  events: NativeEvent[] = [];
  rejectNextBatch = false;
  /** Every `resolveEvent` call, in order. */
  readonly resolutions: Array<{ seq: number; defaultPrevented: boolean; dropEffect: string }> = [];
  /** What `resolveEvent` returns; a nonempty string simulates native rejecting the answer. */
  resolveError = '';
  /** Extra events appended to every drain, for storm tests. */
  produceEvents: (() => NativeEvent[]) | undefined;
  private nextSeq = 1;

  applyBatch(json: string): string {
    if (this.rejectNextBatch) {
      this.rejectNextBatch = false;
      return 'deliberate transport failure';
    }
    const parsed: unknown = JSON.parse(json);
    assert.ok(Array.isArray(parsed));
    const entries: unknown[] = parsed;
    const recorded: Array<{ op: string; id: number }> = [];
    for (const entry of entries) {
      assert.ok(isRecord(entry));
      assert.equal(typeof entry.op, 'string');
      assert.equal(typeof entry.id, 'number');
      if (typeof entry.op !== 'string' || typeof entry.id !== 'number') throw new Error('Invalid command');
      recorded.push({ op: entry.op, id: entry.id });
      if (entry.op === 'create') {
        assert.ok(entry.kind === 'view' || entry.kind === 'text' || entry.kind === 'button');
        assert.ok(!this.nodes.has(entry.id), 'Native IDs must never be recreated');
        this.nodes.set(entry.id, node(entry.id, entry.kind));
        continue;
      }
      const target = this.nodes.get(entry.id);
      assert.ok(target, `Command ${entry.op} requires an existing native node ${entry.id}`);
      switch (entry.op) {
        case 'style':
          assert.ok(isRecord(entry.style));
          target.style = entry.style;
          break;
        case 'text':
          assert.equal(typeof entry.text, 'string');
          if (typeof entry.text !== 'string') throw new Error('Invalid text');
          target.text = entry.text;
          break;
        case 'children': {
          assert.ok(Array.isArray(entry.children));
          const children: unknown[] = entry.children;
          for (const previous of target.children) {
            const child = this.nodes.get(previous);
            if (child?.parent === target.id) child.parent = null;
          }
          target.children = children.map((id) => {
            assert.equal(typeof id, 'number');
            if (typeof id !== 'number') throw new Error('Invalid child ID');
            const child = this.nodes.get(id);
            assert.ok(child);
            if (child.parent !== null) {
              const previous = this.nodes.get(child.parent);
              assert.ok(previous);
              previous.children = previous.children.filter((other) => other !== id);
            }
            child.parent = target.id;
            return id;
          });
          break;
        }
        case 'remove':
          this.remove(target.id);
          break;
        default:
          throw new Error(`Unexpected native command ${entry.op}`);
      }
    }
    this.batches.push(recorded);
    return '';
  }

  private remove(id: number): void {
    const current = this.nodes.get(id);
    assert.ok(current);
    for (const child of [...current.children]) this.remove(child);
    if (current.parent !== null) {
      const parent = this.nodes.get(current.parent);
      assert.ok(parent);
      parent.children = parent.children.filter((child) => child !== id);
    }
    this.nodes.delete(id);
  }

  drainEvents(): string {
    const events = [...this.events, ...(this.produceEvents?.() ?? [])];
    this.events = [];
    return JSON.stringify(events);
  }

  resolveEvent(seq: number, defaultPrevented: boolean, dropEffect: string): string {
    this.resolutions.push({ seq, defaultPrevented, dropEffect });
    return this.resolveError;
  }

  getSnapshot(): string {
    const snapshot: NativeSnapshot = {
      clockMs: 0, transitions: [],
      nodes: [...this.nodes.values()],
      width: 1024, height: 768, hovered: null, focused: null, pressed: null,
      stats: { batches: this.batches.length, nodeCount: this.nodes.size - 1, layoutPasses: 0, paintPasses: 0, layoutMicros: 0 },
    };
    return JSON.stringify(snapshot);
  }

  /** Queue a pointer or focus event with the next sequence number. */
  event(target: number, type: NativeEventType, overrides: Partial<NativePointerEvent> = {}): NativeEvent {
    const event = isFocusType(type) ? this.focusEvent(target, type) : this.pointerEvent(target, type, overrides);
    this.events.push(event);
    return event;
  }

  pointerEvent(target: number, type: NativePointerEventType, overrides: Partial<NativePointerEvent> = {}): NativePointerEvent {
    return {
      seq: this.nextSeq++, target, cancelable: false, timeStamp: 1.5, type,
      x: 10, y: 20, viewportX: 10, viewportY: 20, pointerId: 1, pointerType: 'mouse',
      button: type === 'pointerdown' || type === 'pointerup' || type === 'click' ? 0 : -1,
      buttons: 0, detail: 0, relatedTarget: null,
      shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
      ...overrides,
    };
  }

  focusEvent(target: number, type: NativeFocusEventType, cancelable = false): NativeEvent {
    return { seq: this.nextSeq++, target, cancelable, timeStamp: 1.5, type };
  }
}

function isFocusType(type: NativeEventType): type is NativeFocusEventType {
  return type === 'focus' || type === 'blur';
}

/** Stands in for the Godot owner's `eventsReady` connection. */
export class FakeSubscription {
  listener: (() => void) | undefined;
  unsubscribed = 0;
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listener = listener;
    return () => {
      this.unsubscribed += 1;
      this.listener = undefined;
    };
  };

  /** Native emitting `eventsReady` from inside an input callback. */
  fire(): void {
    this.listener?.();
  }
}

export const NO_SUBSCRIPTION: RootOptions['subscribeToEvents'] = () => () => {};

export function createTestRoot(host: NativeHost, options: Partial<RootOptions> = {}): { root: UIRoot; subscription: FakeSubscription } {
  const subscription = new FakeSubscription();
  const root = createRoot(host, { subscribeToEvents: subscription.subscribe, ...options });
  return { root, subscription };
}

