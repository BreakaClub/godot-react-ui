import assert from 'node:assert/strict';
import type { UIRoot } from '../src';
import type { LayoutRect, NativeKeyEvent, NativePointerEvent, NativePointerType, NativeScrollState } from '../src/native';
import { RecordingHost } from './recording-host';

/** The keys that press a focused button (native/keyboard_input.rs `is_activation_key`), as DOM `key`s. */
const ACTIVATION_KEYS: readonly string[] = ['Enter', ' '];
/** DOM `code` for the keys the kit tests press; `key` and `code` agree except for the space bar. */
const CODE_OF_KEY: Readonly<Record<string, string>> = { ' ': 'Space' };

export interface KeyInit {
  readonly repeat?: boolean;
  readonly shiftKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly altKey?: boolean;
  readonly metaKey?: boolean;
}

export interface PointerInit {
  /** The element under the pointer; 0 is nothing. A captured pointer goes to its capture instead. */
  readonly over?: number;
  readonly pointerId?: number;
  readonly pointerType?: NativePointerType;
  readonly button?: number;
}

/**
 * The recording host plus the parts of native that the kit's behaviour depends on and that the kit
 * tests would otherwise have to script by hand, each copied from the native source it names:
 *
 * - `focusNode` refuses what native refuses: an element that is not a button and has no `tabIndex`, or
 *   that is or sits in a disabled element (`native/focus.rs` `nearest_focusable`).
 * - Enter and Space press a focused enabled button when `keydown` is not prevented (a repeat is part of
 *   the press), and releasing that key clicks it with pointer 0 and no pointer type
 *   (`native/keyboard_input.rs` `key_down_default`, `key_up_default`). A prevented key does neither.
 * - A key is cancelable in both directions (native awaits `keyup` too).
 * - A pointer that an element captured is delivered to that element wherever it is
 *   (`PointerInit.over` only matters for a pointer nobody captured), and a pointer going up or being
 *   cancelled ends its capture.
 */
export class KitHost extends RecordingHost {
  /**
   * The rectangle `getRect()` answers for the element with a `testID`, ahead of its mounting: layout does
   * not run here, and an overlay measures itself in the commit that creates it.
   */
  readonly rectsByTestID = new Map<string, LayoutRect>();
  /**
   * The state `getScrollState()` answers for the element with a `testID`, ahead of its mounting, for the
   * same reason (a scroll container's size is layout's). An element with none is not a scroll container.
   */
  readonly scrollStatesByTestID = new Map<string, NativeScrollState>();
  private readonly awaitedKeys = new Map<number, NativeKeyEvent>();
  private activation: { readonly key: string; readonly tag: number } | undefined;

  override focusNode(tag: number, focusVisible: number): string {
    this.calls.push('focusNode');
    this.focusRequests.push({ tag, focusVisible });
    const problem = this.focusProblem(tag);
    if (problem !== undefined) return problem;
    this.focused = tag;
    return '';
  }

  override getNodeRect(tag: number): string {
    const testID = this.nodes.get(tag)?.props.testID;
    const preset = typeof testID === 'string' ? this.rectsByTestID.get(testID) : undefined;
    if (preset === undefined) return super.getNodeRect(tag);
    this.calls.push('getNodeRect');
    return JSON.stringify(preset);
  }

  override getScrollState(tag: number): string {
    const testID = this.nodes.get(tag)?.props.testID;
    const preset = typeof testID === 'string' ? this.scrollStatesByTestID.get(testID) : undefined;
    if (preset === undefined) return super.getScrollState(tag);
    this.calls.push('getScrollState');
    return JSON.stringify(preset);
  }

  /** Why `tag` cannot take focus, or `undefined` if it can. */
  private focusProblem(tag: number): string | undefined {
    const target = this.nodes.get(tag);
    if (target === undefined || tag === 0) return `node ${tag} is not mounted`;
    for (let current = target; ; ) {
      if (current.props.disabled === true) return `node ${tag} cannot take focus: it or an ancestor is disabled`;
      const parent = current.parent === null ? undefined : this.nodes.get(current.parent);
      if (parent === undefined || parent.id === 0) break;
      current = parent;
    }
    if (target.kind !== 'button' && target.props.tabIndex === undefined) {
      return `node ${tag} cannot take focus: it is not a button and has no tabIndex`;
    }
    return undefined;
  }

  override keyEvent(target: number, type: 'keydown' | 'keyup', overrides: Partial<NativeKeyEvent> = {}): NativeKeyEvent {
    return { ...super.keyEvent(target, type, overrides), cancelable: true };
  }

  override drainEvents(): string {
    for (const event of this.events) {
      if (event.cancelable && (event.type === 'keydown' || event.type === 'keyup')) this.awaitedKeys.set(event.seq, event);
    }
    return super.drainEvents();
  }

  override resolveEvent(seq: number, defaultPrevented: boolean, dropEffect: string): string {
    const result = super.resolveEvent(seq, defaultPrevented, dropEffect);
    const key = this.awaitedKeys.get(seq);
    this.awaitedKeys.delete(seq);
    if (key !== undefined && !defaultPrevented && result === '') this.runKeyDefault(key);
    return result;
  }

  private isEnabledButton(tag: number): boolean {
    return this.nodes.get(tag)?.kind === 'button' && this.focusProblem(tag) === undefined;
  }

  private runKeyDefault(event: NativeKeyEvent): void {
    if (!ACTIVATION_KEYS.includes(event.key)) return;
    if (event.type === 'keydown') {
      if (event.repeat) return;
      const focused = this.focused;
      if (focused !== null && this.isEnabledButton(focused)) this.activation = { key: event.key, tag: focused };
      return;
    }
    const pressed = this.activation;
    if (pressed === undefined || pressed.key !== event.key) return;
    this.activation = undefined;
    if (this.focused === pressed.tag) {
      this.events.push(this.pointerEvent(pressed.tag, 'click', { pointerId: 0, pointerType: '', button: 0, detail: 0 }));
    }
  }

  /** Whether JS prevented the default of the event with sequence number `seq`. */
  wasPrevented(seq: number): boolean {
    const resolution = this.resolutions.find((candidate) => candidate.seq === seq);
    assert.ok(resolution, `event ${seq} was never resolved: it was not cancelable or not delivered`);
    return resolution.defaultPrevented;
  }

  /** A key going down on the focused element (or on the root when nothing is focused). */
  keyDown(root: UIRoot, key: string, init: KeyInit = {}): { readonly prevented: boolean } {
    const down = this.keyEvent(this.focused ?? 0, 'keydown', { key, code: CODE_OF_KEY[key] ?? key, ...init });
    this.events.push(down);
    root.dispatchEvents();
    return { prevented: this.wasPrevented(down.seq) };
  }

  keyUp(root: UIRoot, key: string, init: KeyInit = {}): { readonly prevented: boolean } {
    const up = this.keyEvent(this.focused ?? 0, 'keyup', { key, code: CODE_OF_KEY[key] ?? key, ...init });
    this.events.push(up);
    root.dispatchEvents();
    return { prevented: this.wasPrevented(up.seq) };
  }

  /** A key press and release. `prevented` is the verdict on the `keydown`. */
  pressKey(root: UIRoot, key: string, init: KeyInit = {}): { readonly prevented: boolean; readonly upPrevented: boolean } {
    const down = this.keyDown(root, key, init);
    const up = this.keyUp(root, key, init);
    return { prevented: down.prevented, upPrevented: up.prevented };
  }

  /** The root-local rectangle `getRect()` reports for `tag`: what layout would have produced. */
  setRect(tag: number, rect: LayoutRect): void {
    const target = this.nodes.get(tag);
    assert.ok(target, `node ${tag} is not mounted`);
    target.rect = rect;
  }

  /** One pointer event at root-local (`x`, `y`). `pointerdown` is cancelable, as the primary press is. */
  pointer(
    root: UIRoot,
    type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
    at: { readonly x: number; readonly y: number },
    init: PointerInit = {},
  ): { readonly prevented: boolean } {
    const pointerId = init.pointerId ?? 1;
    if (type === 'pointerdown') this.pointersDown.add(pointerId);
    const target = this.captures.get(pointerId) ?? init.over ?? 0;
    const overrides: Partial<NativePointerEvent> = {
      x: at.x, y: at.y, viewportX: at.x, viewportY: at.y, pointerId, pointerType: init.pointerType ?? 'mouse',
      cancelable: type === 'pointerdown',
    };
    if (init.button !== undefined) overrides.button = init.button;
    const event = this.pointerEvent(target, type, overrides);
    this.events.push(event);
    root.dispatchEvents();
    if (type === 'pointerup' || type === 'pointercancel') {
      this.pointersDown.delete(pointerId);
      this.captures.delete(pointerId);
    }
    return { prevented: type === 'pointerdown' && this.wasPrevented(event.seq) };
  }
}
