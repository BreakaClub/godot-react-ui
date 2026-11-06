import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement as h, createRef, useState, type ReactNode } from 'react';
import { TextInput, View, type TextInputHandle, type UIHandle, type UIInputEvent, type UIKeyboardEvent } from '../src';
import { diffNativeProps, NATIVE_PROP_KEYS, nativeProps } from '../src/props';
import { createTestRoot } from './recording-host';
import { TextInputHost } from './text-input-host';

// ---------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------

function mount(element: ReactNode) {
  const host = new TextInputHost();
  const { root } = createTestRoot(host);
  root.render(element);
  const tag = (testID: string): number => {
    const found = root.findByTestID(testID);
    assert.ok(found, `no element with testID "${testID}"`);
    return found.id;
  };
  const input = (testID: string) => {
    const state = host.textInputs.get(tag(testID));
    assert.ok(state, `${testID} is not a text input`);
    return state;
  };
  return { host, root, tag, input };
}

/** A controlled input whose `transform` decides what the app stores for each edit. */
function controlled(transform: (typed: string, previous: string) => string, onValue?: (value: string) => void) {
  const handle = createRef<TextInputHandle>();
  const seen: UIInputEvent[] = [];
  function App(): ReactNode {
    const [value, setValue] = useState('');
    return h(TextInput, {
      ref: handle, testID: 'field', value,
      onChange: (event: UIInputEvent) => {
        seen.push(event);
        const next = transform(event.value, value);
        setValue(next);
        onValue?.(next);
      },
    });
  }
  return { ...mount(h(App)), handle, seen };
}

/** Focus the input as native does for a press or Tab, by the handle. */
function focus(handle: { current: TextInputHandle | null }): TextInputHandle {
  assert.ok(handle.current, 'the input has no handle');
  handle.current.focus();
  return handle.current;
}

// ---------------------------------------------------------------------------------------------------
// Native props
// ---------------------------------------------------------------------------------------------------

test('a text input sends the props native reads, and only the ones it was given', () => {
  const full = nativeProps('textinput', {
    defaultValue: 'abc', placeholder: 'Name', multiline: true, readOnly: true, secure: true, selectTextOnFocus: true,
    rows: 4, maxLength: 12, keyboardType: 'email',
  }, false);
  assert.deepEqual(full, {
    defaultValue: 'abc', placeholder: 'Name', multiline: true, readOnly: true, secure: true, selectOnFocus: true,
    rows: 4, maxLength: 12, keyboardType: 'email',
  });
  assert.deepEqual(nativeProps('textinput', {}, false), {});
  // `false` is the default, so it is absent rather than sent.
  assert.deepEqual(nativeProps('textinput', { readOnly: false, secure: false, multiline: false }, false), {});
  for (const key of ['defaultValue', 'placeholder', 'multiline', 'readOnly', 'secure', 'selectOnFocus', 'rows', 'maxLength', 'keyboardType']) {
    assert.ok(NATIVE_PROP_KEYS.some((known) => known === key), `${key} is a native prop`);
  }
});

test('text input props are errors on other elements, and bad values are errors on a text input', () => {
  assert.throws(() => nativeProps('view', { placeholder: 'x' }, false), /placeholder is only valid on TextInput, not on a view/);
  assert.throws(() => nativeProps('button', { maxLength: 3 }, false), /maxLength is only valid on TextInput/);
  assert.throws(() => nativeProps('textinput', { rows: 3 }, false), /rows is only valid with multiline/);
  assert.throws(() => nativeProps('textinput', { multiline: true, rows: 0 }, false), /rows must be a positive integer/);
  assert.throws(() => nativeProps('textinput', { multiline: true, rows: 1.5 }, false), /rows must be a positive integer/);
  assert.throws(() => nativeProps('textinput', { maxLength: -1 }, false), /maxLength must be a nonnegative integer/);
  assert.doesNotThrow(() => nativeProps('textinput', { maxLength: 0 }, false));
});

test('a change of defaultValue is not sent, and a change of anything else is', () => {
  const before = nativeProps('textinput', { defaultValue: 'a', placeholder: 'x' }, false);
  assert.equal(diffNativeProps(before, nativeProps('textinput', { defaultValue: 'b', placeholder: 'x' }, false)), null);
  assert.deepEqual(diffNativeProps(before, nativeProps('textinput', { defaultValue: 'a', placeholder: 'y' }, false)), { placeholder: 'y' });
  assert.deepEqual(diffNativeProps(before, nativeProps('textinput', { defaultValue: 'a' }, false)), { placeholder: null });
  assert.deepEqual(
    diffNativeProps(before, nativeProps('textinput', { defaultValue: 'a', placeholder: 'x', maxLength: 5, readOnly: true }, false)),
    { maxLength: 5, readOnly: true },
  );
});

// ---------------------------------------------------------------------------------------------------
// The component
// ---------------------------------------------------------------------------------------------------

test('a text input is a textinput element that starts with its defaultValue or value', () => {
  const uncontrolled = mount(h(TextInput, { testID: 'a', defaultValue: 'hello', placeholder: 'p' }));
  const node = uncontrolled.host.nodes.get(uncontrolled.tag('a'));
  assert.equal(node?.kind, 'textinput');
  assert.equal(node?.props.defaultValue, 'hello');
  assert.equal(node?.props.placeholder, 'p');
  assert.equal(uncontrolled.input('a').value, 'hello');
  const withValue = mount(h(TextInput, { testID: 'b', value: 'given', onChange: () => {} }));
  assert.equal(withValue.input('b').value, 'given');
  assert.equal(withValue.host.textCommands.length, 0, 'a controlled input that matches native sends nothing');
  const children = mount(h(View, { testID: 'row' }, h(TextInput, { testID: 'c' })));
  assert.equal(children.host.nodes.get(children.tag('row'))?.children.length, 1);
});

test('typing into an uncontrolled input reaches onChange and sends no command', () => {
  const handle = createRef<TextInputHandle>();
  const events: UIInputEvent[] = [];
  const { host, root, input } = mount(h(TextInput, {
    ref: handle, testID: 'field', defaultValue: 'ab', onChange: (event: UIInputEvent) => events.push(event),
  }));
  focus(handle);
  host.type(root, 'cd');
  assert.deepEqual(events.map((event) => [event.inputType, event.data, event.value, event.eventCount]), [
    ['insertText', 'c', 'abc', 1],
    ['insertText', 'd', 'abcd', 2],
  ]);
  assert.equal(events[1]?.selectionStart, 4);
  assert.equal(input('field').value, 'abcd');
  assert.equal(host.textCommands.length, 0, 'nothing answers an uncontrolled edit');
});

test('a controlled input that stores what was typed sends no command', () => {
  const { host, root, handle, seen } = controlled((typed) => typed);
  focus(handle);
  host.type(root, 'hey');
  assert.deepEqual(seen.map((event) => event.value), ['h', 'he', 'hey']);
  assert.equal(host.textCommands.length, 0);
  assert.equal(handle.current?.value, 'hey');
});

test('a controlled input that transforms an edit answers it with a command that keeps the caret', () => {
  const { host, root, handle, input } = controlled((typed) => typed.toUpperCase());
  focus(handle);
  host.type(root, 'ab');
  assert.equal(input('field').value, 'AB');
  assert.deepEqual(
    host.textCommands.map(({ eventCount, value, start, end, result }) => [eventCount, value, start, end, result]),
    [[1, 'A', 1, 1, ''], [2, 'AB', 2, 2, '']],
    'each answer carries the count of the event it answers and keeps the caret (same length)',
  );
  // Editing in the middle keeps the caret there, not at the end.
  host.select(root, host.focused ?? 0, 1, 1);
  host.type(root, 'x');
  const last = host.textCommands.at(-1);
  assert.deepEqual([last?.value, last?.start, last?.end], ['AXB', 2, 2]);
});

test('a controlled input that rejects an edit is put back, with the selection it had', () => {
  const { host, root, handle, input } = controlled((typed, previous) => (/^[0-9]*$/.test(typed) ? typed : previous));
  focus(handle);
  host.type(root, '12');
  assert.equal(input('field').value, '12');
  host.select(root, host.focused ?? 0, 1, 1);
  host.type(root, 'x');
  assert.equal(input('field').value, '12', 'the rejected character is gone');
  const state = input('field');
  assert.deepEqual([state.selectionStart, state.selectionEnd], [1, 1], 'the caret is back where it was');
  assert.equal(host.textCommands.at(-1)?.value, '12');
  host.type(root, '7');
  assert.equal(input('field').value, '172');
});

test('a command made stale by typing is ignored, and the edit that made it stale reconciles again', () => {
  const handle = createRef<TextInputHandle>();
  function App({ value }: { value: string }): ReactNode {
    return h(TextInput, { ref: handle, testID: 'field', value, onChange: () => {} });
  }
  const host = new TextInputHost();
  const { root } = createTestRoot(host);
  root.render(h(App, { value: '' }));
  const tag = root.findByTestID('field')?.id ?? -1;
  focus(handle);
  // The user typed before the app's value reached native: the count JS read is old.
  const state = host.textInputs.get(tag);
  assert.ok(state);
  state.eventCount = 5;
  state.value = 'typed';
  root.render(h(App, { value: 'from the app' }));
  assert.equal(host.textCommands.at(-1)?.result, 'stale', 'native ignored it');
  assert.equal(state.value, 'typed');
  // An ignored command is not remembered as applied: the next render tries again.
  const attempts = host.textCommands.length;
  root.render(h(App, { value: 'from the app' }));
  assert.equal(host.textCommands.length, attempts + 1, 'a command native ignored is sent again by the next render');
  // The typing's own `input` event then tells JS the count, and the app's value is sent again.
  host.type(root, '!');
  const applied = host.textCommands.at(-1);
  assert.equal(applied?.result, '');
  assert.equal(state.value, 'from the app');
  assert.equal(handle.current?.setTextAndSelection(0, 'old count'), false);
  assert.equal(state.value, 'from the app', 'the handle reports a stale command as false and changes nothing');
});

test('a value set from outside reaches native with the caret at the end', () => {
  const handle = createRef<TextInputHandle>();
  function App({ value }: { value: string }): ReactNode {
    return h(TextInput, { ref: handle, testID: 'field', value, onChange: () => {} });
  }
  const host = new TextInputHost();
  const { root } = createTestRoot(host);
  root.render(h(App, { value: 'one' }));
  root.render(h(App, { value: 'something else' }));
  const state = host.textInputs.get(root.findByTestID('field')?.id ?? -1);
  assert.equal(state?.value, 'something else');
  assert.deepEqual([state?.selectionStart, state?.selectionEnd], [14, 14]);
  assert.deepEqual(host.textCommands.at(-1) && [host.textCommands.at(-1)?.start, host.textCommands.at(-1)?.end], [-1, -1]);
});

test('onSubmit runs for Enter in a single-line input only when nothing prevents it and no IME composes', () => {
  const handle = createRef<TextInputHandle>();
  const submitted: string[] = [];
  const prevented: boolean[] = [];
  const { host, root } = mount(h(TextInput, {
    ref: handle, testID: 'field', defaultValue: 'go', onSubmit: (value: string) => submitted.push(value),
    onKeyDown: (event: UIKeyboardEvent) => { if (event.key === 'Enter' && event.altKey) { event.preventDefault(); prevented.push(true); } },
  }));
  focus(handle);
  host.pressKey(root, 'Enter');
  assert.deepEqual(submitted, ['go']);
  host.pressKey(root, 'Enter', { repeat: true });
  assert.deepEqual(submitted, ['go'], 'a held key does not submit again');
  host.pressKey(root, 'Enter', { altKey: true });
  assert.deepEqual(submitted, ['go'], 'the app prevented it');
  assert.deepEqual(prevented, [true]);
  host.pressKey(root, 'a');
  assert.deepEqual(submitted, ['go']);
  // An IME confirming a candidate with Enter is not a submit.
  const composing = host.keyEvent(host.focused ?? 0, 'keydown', { key: 'Enter', code: 'Enter', isComposing: true });
  host.events.push(composing);
  root.dispatchEvents();
  assert.deepEqual(submitted, ['go']);
});

test('Enter in a multi-line input is a line break, not a submit', () => {
  const handle = createRef<TextInputHandle>();
  const submitted: string[] = [];
  const { host, root } = mount(h(TextInput, {
    ref: handle, testID: 'area', multiline: true, onSubmit: (value: string) => submitted.push(value),
  }));
  focus(handle);
  host.pressKey(root, 'Enter');
  assert.deepEqual(submitted, []);
});

test('onBeforeInput can reject an edit, and the edit is then never made', () => {
  const handle = createRef<TextInputHandle>();
  const inputs: string[] = [];
  const { host, root, input } = mount(h(TextInput, {
    ref: handle, testID: 'field',
    onBeforeInput: (event) => { if (event.inputType === 'insertText' && !/[a-z]/.test(event.data ?? '')) event.preventDefault(); },
    onChange: (event: UIInputEvent) => inputs.push(event.value),
  }));
  focus(handle);
  host.type(root, 'a1b');
  assert.equal(input('field').value, 'ab');
  assert.deepEqual(inputs, ['a', 'ab']);
  assert.deepEqual(host.beforeInputs.map((entry) => [entry.data, entry.prevented]), [['a', false], ['1', true], ['b', false]]);
});

test('beforeinput and input bubble, selectionchange does not', () => {
  const log: string[] = [];
  const handle = createRef<TextInputHandle>();
  const { host, root } = mount(h(View, {
    testID: 'outer',
    onBeforeInput: () => log.push('outer beforeinput'),
    onInput: () => log.push('outer input'),
    onSelectionChange: () => log.push('outer selectionchange'),
  }, h(TextInput, {
    ref: handle, testID: 'field',
    onSelectionChange: () => log.push('field selectionchange'),
  })));
  focus(handle);
  host.type(root, 'a');
  assert.deepEqual(log, ['outer beforeinput', 'outer input', 'field selectionchange']);
});

test('composition events reach their handlers with the preedit', () => {
  const log: string[] = [];
  const handle = createRef<TextInputHandle>();
  const { host, root, tag } = mount(h(TextInput, {
    ref: handle, testID: 'field',
    onCompositionStart: (event) => log.push(`start ${event.data}`),
    onCompositionUpdate: (event) => log.push(`update ${event.data}`),
    onCompositionEnd: (event) => log.push(`end ${event.data}`),
  }));
  const target = tag('field');
  for (const [type, data] of [['compositionstart', ''], ['compositionupdate', 'か'], ['compositionend', '']] as const) {
    host.events.push({
      seq: 900 + log.length, target, path: host.pathOf(target), cancelable: false, timeStamp: 1, type, data,
    });
    root.dispatchEvents();
  }
  assert.deepEqual(log, ['start ', 'update か', 'end ']);
});

test('the handle reads and moves the selection through native', () => {
  const handle = createRef<TextInputHandle>();
  const { host, input } = mount(h(TextInput, { ref: handle, testID: 'field', defaultValue: 'hello world' }));
  const element = handle.current;
  assert.ok(element);
  assert.deepEqual([element.value, element.selectionStart, element.selectionEnd, element.selectionDirection], ['hello world', 11, 11, 'forward']);
  element.select();
  assert.deepEqual([input('field').selectionStart, input('field').selectionEnd], [0, 11]);
  element.setSelectionRange(2, 5);
  assert.deepEqual([element.selectionStart, element.selectionEnd], [2, 5]);
  element.setSelectionRange(1, 3, 'backward');
  assert.equal(element.selectionDirection, 'backward');
  assert.deepEqual(host.selectionCommands.at(-1), { tag: element.id, start: 1, end: 3, backward: true });
  assert.throws(() => element.setSelectionRange(3, 99), /setSelectionRange failed/);
  assert.throws(() => element.setTextAndSelection(0, 'x', 1), /both a start and an end, or neither/);
});

test('the handle of a text input is the same object across renders, and a View has no selection methods', () => {
  const handle = createRef<TextInputHandle>();
  const view = createRef<UIHandle>();
  const { root } = mount(h(View, { ref: view }, h(TextInput, { ref: handle, testID: 'field' })));
  const first = handle.current;
  root.render(h(View, { ref: view }, h(TextInput, { ref: handle, testID: 'field', placeholder: 'now with a placeholder' })));
  assert.equal(handle.current, first);
  assert.ok(view.current);
  assert.equal('setSelectionRange' in view.current, false);
});
