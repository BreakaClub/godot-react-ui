import assert from 'node:assert/strict';
import type { UIRoot } from '../src';
import type { NativeBeforeInputEvent, NativeInputType } from '../src/native';
import { KitHost } from './kit-host';

/**
 * The kit host plus the part of native a text input's JavaScript depends on, each copied from the native source it
 * names (`native/text_input_godot/pipeline.rs`, `native/text_input.rs`):
 *
 * - an edit is a `beforeinput` that native awaits; when JS does not prevent it the edit is made, the event count goes
 *   up by one, and `input` follows with all of the text, the selection and the new count;
 * - `selectionchange` follows an edit that moved the selection, after `input`;
 * - `maxLength` cuts an insertion to what fits, counted in UTF-16 units;
 * - `setTextAndSelection` (in the recording host) applies only to the current event count.
 */
export class TextInputHost extends KitHost {
  private readonly awaited = new Map<number, NativeBeforeInputEvent>();
  /** Every `beforeinput` JS was shown, and whether it prevented it. */
  readonly beforeInputs: Array<{ inputType: NativeInputType; data: string | null; prevented: boolean }> = [];

  override drainEvents(): string {
    for (const event of this.events) {
      if (event.type === 'beforeinput' && event.cancelable) this.awaited.set(event.seq, event);
    }
    return super.drainEvents();
  }

  override resolveEvent(seq: number, defaultPrevented: boolean, dropEffect: string): string {
    const result = super.resolveEvent(seq, defaultPrevented, dropEffect);
    const before = this.awaited.get(seq);
    this.awaited.delete(seq);
    if (before === undefined || result !== '') return result;
    this.beforeInputs.push({ inputType: before.inputType, data: before.data, prevented: defaultPrevented });
    if (!defaultPrevented) this.makeEdit(before.target, before.inputType, before.data);
    return result;
  }

  private makeEdit(tag: number, inputType: NativeInputType, data: string | null): void {
    const input = this.textInputs.get(tag);
    assert.ok(input, `node ${tag} is not a text input`);
    const maxLength = this.nodes.get(tag)?.props.maxLength;
    const start = Math.min(input.selectionStart, input.selectionEnd);
    const end = Math.max(input.selectionStart, input.selectionEnd);
    const before = { start: input.selectionStart, end: input.selectionEnd };
    let from = start;
    let inserted = '';
    if (inputType === 'insertText' || inputType === 'insertFromPaste' || inputType === 'insertReplacementText') {
      inserted = data ?? '';
      if (typeof maxLength === 'number') inserted = inserted.slice(0, Math.max(0, maxLength - (input.value.length - (end - start))));
    } else if (inputType === 'deleteContentBackward' && start === end) {
      from = Math.max(0, start - 1);
    } else if (inputType !== 'deleteContentBackward' && inputType !== 'deleteContentForward') {
      assert.fail(`the fake host does not make ${inputType} edits`);
    }
    const to = inputType === 'deleteContentForward' && start === end ? Math.min(input.value.length, end + 1) : end;
    input.value = input.value.slice(0, from) + inserted + input.value.slice(to);
    input.selectionStart = from + inserted.length;
    input.selectionEnd = input.selectionStart;
    input.eventCount += 1;
    this.events.push(this.inputEvent(
      tag, inputType, inputType.startsWith('insert') ? inserted : null, input.value, input.eventCount,
      { start: input.selectionStart, end: input.selectionEnd },
    ));
    if (before.start !== input.selectionStart || before.end !== input.selectionEnd) {
      this.events.push(this.textSelectionChangeEvent(tag, input.selectionStart, input.selectionEnd));
    }
  }

  /** The user types `text` into the focused input, a character at a time. */
  type(root: UIRoot, text: string, tag = this.focused): void {
    assert.ok(tag !== null, 'no input is focused');
    for (const character of text) {
      this.events.push(this.beforeInputEvent(tag, 'insertText', character));
      root.dispatchEvents();
    }
  }

  /** One edit that carries no text, such as `deleteContentBackward`. */
  edit(root: UIRoot, inputType: NativeInputType, data: string | null = null, tag = this.focused): void {
    assert.ok(tag !== null, 'no input is focused');
    this.events.push(this.beforeInputEvent(tag, inputType, data));
    root.dispatchEvents();
  }

  /** The user (or native) moved the selection with no edit. */
  select(root: UIRoot, tag: number, start: number, end: number): void {
    const input = this.textInputs.get(tag);
    assert.ok(input, `node ${tag} is not a text input`);
    input.selectionStart = start;
    input.selectionEnd = end;
    this.events.push(this.textSelectionChangeEvent(tag, start, end));
    root.dispatchEvents();
  }
}
