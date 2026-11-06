import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement as h, createRef, useState, type ReactNode } from 'react';
import { isTextInputHandle, TextField, View, type TextInputHandle, type UIInputEvent } from '../src';
import { createTestRoot } from './recording-host';
import { TextInputHost } from './text-input-host';

function mount(element: ReactNode) {
  const host = new TextInputHost();
  const { root } = createTestRoot(host);
  root.render(element);
  const tag = (testID: string): number => {
    const found = root.findByTestID(testID);
    assert.ok(found, `no element with testID "${testID}"`);
    return found.id;
  };
  const maybeTag = (testID: string): number | undefined => root.findByTestID(testID)?.id;
  const props = (testID: string): Record<string, unknown> => {
    const node = host.nodes.get(tag(testID));
    assert.ok(node, `${testID} is not mounted`);
    return node.props;
  };
  /** The border colour native was given for the node, from its unconditional style layers. */
  const borderColor = (testID: string): unknown => {
    const style = props(testID).style;
    assert.ok(typeof style === 'object' && style !== null && 'layers' in style && Array.isArray(style.layers));
    let color: unknown;
    for (const layer of style.layers) {
      if (typeof layer === 'object' && layer !== null && 'style' in layer && typeof layer.style === 'object' && layer.style !== null
        && !('states' in layer && layer.states !== undefined) && 'borderColor' in layer.style) color = layer.style.borderColor;
    }
    return color;
  };
  const children = (testID: string): readonly number[] => host.nodes.get(tag(testID))?.children ?? [];
  const textOf = (testID: string): string => {
    const node = host.nodes.get(tag(testID));
    assert.ok(node, `${testID} is not mounted`);
    const own = typeof node.props.text === 'string' ? node.props.text : '';
    return own + (node.children ?? []).map((child) => {
      const entry = host.nodes.get(child);
      return typeof entry?.props.text === 'string' ? entry.props.text : '';
    }).join('');
  };
  return { host, root, tag, maybeTag, props, borderColor, children, textOf };
}

test('a field is a label, an input and a message, each with a test id of its own', () => {
  const m = mount(h(TextField, { testID: 'name', label: 'Name', helperText: 'As on your card', placeholder: 'Ada' }));
  assert.deepEqual(m.children('name'), [m.tag('name-label'), m.tag('name-input'), m.tag('name-message')]);
  assert.equal(m.host.nodes.get(m.tag('name-input'))?.kind, 'textinput');
  assert.equal(m.textOf('name-label'), 'Name');
  assert.equal(m.textOf('name-message'), 'As on your card');
  assert.equal(m.props('name-input').placeholder, 'Ada');
});

test('without a label or a message the field is the input alone', () => {
  const m = mount(h(TextField, { testID: 'bare' }));
  assert.deepEqual(m.children('bare'), [m.tag('bare-input')]);
  assert.equal(m.maybeTag('bare-label'), undefined);
  assert.equal(m.maybeTag('bare-message'), undefined);
  assert.equal(m.props('bare-input').ariaLabel, undefined);
  assert.equal(m.props('bare-input').ariaDescription, undefined);
});

test('the label names the input and the helper describes it, for assistive technology', () => {
  const m = mount(h(TextField, { testID: 'f', label: 'Email', helperText: 'We never share it' }));
  assert.equal(m.props('f-input').ariaLabel, 'Email');
  assert.equal(m.props('f-input').ariaDescription, 'We never share it');
});

test('an explicit name and description win over the ones the text gives', () => {
  const m = mount(h(TextField, {
    testID: 'f', label: 'Email', helperText: 'Hint', 'aria-label': 'Work email', 'aria-description': 'Used for invoices',
  }));
  assert.equal(m.props('f-input').ariaLabel, 'Work email');
  assert.equal(m.props('f-input').ariaDescription, 'Used for invoices');
});

test('an error takes the helper\'s place, is what describes the input, and turns the border rose', () => {
  function App(): ReactNode {
    const [value, setValue] = useState('');
    return h(TextField, {
      testID: 'f', label: 'Code', helperText: 'Six characters', errorText: value.length > 0 && value.length < 6 ? 'Too short' : undefined,
      value, onChange: (event: UIInputEvent) => setValue(event.value),
    });
  }
  const m = mount(h(App));
  const calm = m.borderColor('f-input');
  assert.equal(m.textOf('f-message'), 'Six characters');
  assert.equal(m.props('f-input').ariaDescription, 'Six characters');

  m.host.type(m.root, 'abc', m.tag('f-input'));
  assert.equal(m.textOf('f-message'), 'Too short');
  assert.equal(m.props('f-input').ariaDescription, 'Too short');
  assert.notEqual(m.borderColor('f-input'), calm, 'the border changed colour');
  const message = m.props('f-message').style;
  assert.ok(JSON.stringify(message).includes('#e11d48'), 'the message is rose-600');

  m.host.type(m.root, 'def', m.tag('f-input'));
  assert.equal(m.textOf('f-message'), 'Six characters', 'the helper is back');
  assert.equal(m.borderColor('f-input'), calm, 'and the border is as it was');
});

test('a press on the label focuses the input, unless the input is disabled', () => {
  const m = mount(h(View2));
  m.host.event(m.tag('open-label'), 'click');
  m.root.dispatchEvents();
  assert.deepEqual(m.host.focusRequests.map((request) => request.tag), [m.tag('open-input')]);

  m.host.event(m.tag('locked-label'), 'click');
  m.root.dispatchEvents();
  assert.equal(m.host.focusRequests.length, 1, 'a disabled field is not focused by its label');
});

/** An enabled and a disabled field side by side. */
function View2(): ReactNode {
  return h(View, {}, h(TextField, { testID: 'open', label: 'Open' }), h(TextField, { testID: 'locked', label: 'Locked', disabled: true }));
}

test('the props of a text input pass through to it, and the ref is its handle', () => {
  const ref = createRef<TextInputHandle>();
  const m = mount(h(TextField, {
    ref, testID: 'f', label: 'Notes', multiline: true, rows: 4, maxLength: 120, readOnly: true, defaultValue: 'start', keyboardType: 'multiline',
  }));
  const input = m.props('f-input');
  assert.equal(input.multiline, true);
  assert.equal(input.rows, 4);
  assert.equal(input.maxLength, 120);
  assert.equal(input.readOnly, true);
  assert.equal(input.defaultValue, 'start');
  assert.equal(input.keyboardType, 'multiline');
  assert.ok(isTextInputHandle(ref.current), 'the ref is a text input handle');
  assert.equal(ref.current.id, m.tag('f-input'));
});

test('a controlled field follows its value, as a controlled input does', () => {
  const seen: string[] = [];
  function App(): ReactNode {
    const [value, setValue] = useState('');
    return h(TextField, {
      testID: 'f', label: 'Shout', value, onChange: (event: UIInputEvent) => { seen.push(event.value); setValue(event.value.toUpperCase()); },
    });
  }
  const m = mount(h(App));
  m.host.type(m.root, 'hi', m.tag('f-input'));
  assert.deepEqual(seen, ['h', 'Hi'], 'the second edit is made on the capital the first became');
  assert.equal(m.host.textInputs.get(m.tag('f-input'))?.value, 'HI', 'native holds the capitals');
});
