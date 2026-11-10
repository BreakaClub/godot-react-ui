import assert from 'node:assert/strict';
import type { UIRoot } from '../src';
import type { NativePointerType } from '../src/native';
import { TextInputHost } from './text-input-host';

/** Where the fake host puts every pointer event; the combobox never reads a position except for scrollbar thumbs. */
const POINT = { x: 50, y: 50 };

export interface PressInit {
  readonly pointerType?: NativePointerType;
  /** Release the pointer and click, as a press that stays where it is does. False leaves the pointer down. */
  readonly release?: boolean;
}

/**
 * The text input host plus the parts of native a combobox's focus handling depends on, each copied from the native
 * source it names:
 *
 * - focus moves announce themselves: `focusNode` on another element sends `blur` to the one that had focus (with the
 *   new one as `relatedTarget`) and `focus` to the new one, and `blurNode` sends `blur` with nothing related
 *   (`native/focus.rs`, `native/lib.rs` `set_focus`);
 * - a primary press that JS did not prevent focuses the nearest focusable ancestor-or-self, and a press on nothing
 *   focusable clears element focus, which sends a `blur`.
 */
export class ComboboxHost extends TextInputHost {
  override focusNode(tag: number, focusVisible: number): string {
    const previous = this.focused;
    const problem = super.focusNode(tag, focusVisible);
    if (problem === '' && previous !== tag) {
      if (previous !== null) this.events.push(this.focusEvent(previous, 'blur', tag));
      this.events.push(this.focusEvent(tag, 'focus', previous, focusVisible !== 0));
    }
    return problem;
  }

  override blurNode(tag: number): string {
    const had = this.focused === tag;
    const result = super.blurNode(tag);
    if (had) this.events.push(this.focusEvent(tag, 'blur', null));
    return result;
  }

  /** Native's default for a press on `tag` that nothing prevented. */
  private focusByDefault(tag: number): void {
    for (const candidate of this.pathOf(tag)) {
      if (this.focusNode(candidate, 0) === '') return;
    }
    if (this.focused !== null) {
      const previous = this.focused;
      this.focused = null;
      this.events.push(this.focusEvent(previous, 'blur', null));
    }
  }

  /**
   * A primary press on `over`: `pointerdown`, then native's default if it was not prevented, then (unless `release` is
   * false) `pointerup` and `click`. Returns whether JS prevented the `pointerdown`.
   */
  press(root: UIRoot, over: number, init: PressInit = {}): { readonly prevented: boolean } {
    const pointerType = init.pointerType ?? 'mouse';
    const down = this.pointer(root, 'pointerdown', POINT, { over, pointerType });
    if (!down.prevented) {
      this.focusByDefault(over);
      root.dispatchEvents();
    }
    if (init.release === false) return down;
    this.pointer(root, 'pointerup', POINT, { over, pointerType });
    this.events.push(this.pointerEvent(over, 'click', { pointerType, ...POINT, viewportX: POINT.x, viewportY: POINT.y }));
    root.dispatchEvents();
    return down;
  }

  /** The pointer moves over `over`. A continuous event: the caller waits for React to render it. */
  moveOver(root: UIRoot, over: number, pointerType: NativePointerType = 'mouse'): void {
    this.pointer(root, 'pointermove', POINT, { over, pointerType });
  }

  /** A wheel tick over `over`; returns whether JS prevented it. */
  wheelOver(root: UIRoot, over: number): { readonly prevented: boolean } {
    const event = this.wheelEvent(over);
    this.events.push(event);
    root.dispatchEvents();
    return { prevented: this.wasPrevented(event.seq) };
  }

  /** The text input `tag`'s caret and selection, as native holds them. */
  setCaret(tag: number, start: number, end = start): void {
    const input = this.textInputs.get(tag);
    assert.ok(input, `node ${tag} is not a text input`);
    input.selectionStart = start;
    input.selectionEnd = end;
  }
}
