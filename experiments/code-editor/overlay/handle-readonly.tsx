// Proves a TextInputHandle is not DOM-assignable: `value`, `selectionStart`, `selectionEnd` are read-only accessors (src/renderer.ts
// textInputMethods), so DOM-style `input.value = x` / `input.selectionStart = n` (react-simple-code-editor, @uiw/react-textarea-code-editor)
// throw in strict mode, and the handle has no `setRangeText` (the uiw editor calls it).
// Run: node_modules/.bin/tsx experiments/code-editor/overlay/handle-readonly.tsx
'use strict';
import { createElement as h, createRef } from 'react';
import { TextInput, type TextInputHandle } from '../../../src';
import { mountInput } from './lib/mount-input';

async function main() {
  const ref = createRef<TextInputHandle>();
  const m = await mountInput(h(TextInput, { ref, defaultValue: 'abc' }));
  const handle = ref.current as unknown as Record<string, unknown>;
  for (const key of ['value', 'selectionStart', 'selectionEnd']) {
    const descriptor = Object.getOwnPropertyDescriptor(handle, key);
    console.log(key.padEnd(15), 'descriptor:', descriptor ? `get=${typeof descriptor.get} set=${typeof descriptor.set}` : 'not an own property');
    try { handle[key] = key === 'value' ? 'x' : 1; console.log('   assignment: no throw'); } catch (error) { console.log('   assignment threw:', (error as Error).message); }
  }
  console.log('typeof setSelectionRange/select/focus/blur:', ['setSelectionRange', 'select', 'focus', 'blur'].map((k) => typeof handle[k]).join(','), '| setRangeText:', typeof handle.setRangeText, '| setTextAndSelection:', typeof handle.setTextAndSelection);
  m.unmount();
}
main();
