// Reproduction: OUR component finding. A controlled <TextInput value> plus an imperative handle.setTextAndSelection(...) (the DOM pattern
// `input.value = x; input.selectionStart = a; input.selectionEnd = b` that editors use) loses the selection: TextInput's cache of native's
// text (src/text-input.tsx `native` ref) is only updated by its own commands and `input` events, so after the caller's imperative command
// the component sees `value !== native.current.value` and sends its own setTextAndSelection with no selection, which puts the caret at the end.
// Run: node_modules/.bin/tsx experiments/code-editor/overlay/textinput-imperative-vs-controlled.tsx
import { createElement as h, createRef, useState } from 'react';
import { TextInput, type TextInputHandle } from '../../../src';
import { mountInput } from './lib/mount-input';

const handle = createRef<TextInputHandle>();

function App() {
  const [value, setValue] = useState('hello world');
  return h(TextInput, {
    ref: handle, testID: 'field', multiline: true, value,
    onChange: (event) => setValue(event.value),
    // the app's own edit command, e.g. "indent": change the text, set the selection, then store the text
    onKeyDown: (event) => {
      if (event.key !== 'Tab') return;
      event.preventDefault();
      const field = handle.current;
      if (field === null) return;
      const next = '  hello world';
      field.setTextAndSelection(0, next, 2, 7); // eventCount 0: no input event has happened yet
      setValue(next);
    },
  });
}

async function main() {
  const m = await mountInput(h(App));
  const field = m.nodes().find((n) => n.kind === 'textinput');
  if (!field) throw new Error('no text input');
  m.host.focused = field.id;
  const state = () => { const s = m.host.textInputs.get(field.id); return `value=${JSON.stringify(s?.value)} selection=${s?.selectionStart}..${s?.selectionEnd}`; };
  console.log('before:', state());
  m.host.keyDown(m.root, 'Tab');
  await m.settle();
  console.log('after Tab (expected selection 2..7):', state());
  console.log('setTextAndSelection commands the host received:');
  for (const c of m.host.textCommands) console.log('  ', JSON.stringify(c));
  m.unmount();
}
main();
