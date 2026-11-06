import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { compileStyle } from '../src/styles';
import {
  diffNativeProps, NATIVE_PROP_KEYS, nativeProps, scalarText, type NativeProps,
} from '../src/props';

test('only the native prop table crosses: handlers and unrelated props stay in JavaScript', () => {
  const native = nativeProps('button', {
    className: 'p-2', testID: 'go', disabled: true, onClick() {}, onPointerDown() {}, children: 'ignored for buttons',
  }, true);
  assert.deepEqual(Object.keys(native).sort(), ['disabled', 'hidden', 'style', 'testID']);
  assert.deepEqual(native, {
    style: compileStyle('p-2'), testID: 'go', disabled: true, hidden: true,
  });
  for (const key of Object.keys(native)) assert.ok((NATIVE_PROP_KEYS as readonly string[]).includes(key));
  assert.deepEqual(nativeProps('view', {}, false), {}, 'a bare element has no native props at all');
  assert.deepEqual(nativeProps('view', { className: '', style: [] }, false), {}, 'an empty style is no style');
});

test('defaults are absent, never false or undefined', () => {
  const native = nativeProps('view', { disabled: false, testID: undefined, className: undefined }, false);
  assert.deepEqual(native, {});
  assert.ok(!('disabled' in native) && !('hidden' in native) && !('testID' in native));
});

test('a text element carries its string, and children must be plain strings or numbers', () => {
  assert.equal(nativeProps('text', { children: 'Hello' }, false).text, 'Hello');
  assert.equal(nativeProps('text', { children: ['Count: ', 5, null, false, ' items'] }, false).text, 'Count: 5 items');
  assert.equal(nativeProps('text', { children: 0 }, false).text, '0');
  assert.deepEqual(nativeProps('text', {}, false), {}, 'empty text is the default');
  assert.deepEqual(nativeProps('text', { children: '' }, false), {});
  assert.throws(() => nativeProps('text', { children: createElement('span') }, false), /strings or numbers/);
  // Only text elements read their children.
  assert.equal(nativeProps('view', { children: 'x' }, false).text, undefined);
  assert.equal(scalarText(['a', ['b', 2]]), 'ab2');
  assert.equal(scalarText(createElement('span')), undefined);
});

test('a clone with unchanged className and style reuses the compiled style object', () => {
  const style = { width: 4 };
  const first = { className: 'p-1', style, onClick() {} };
  const before = nativeProps('view', first, false);
  const second = { className: 'p-1', style, onClick() {} };
  const after = nativeProps('view', second, false, { props: first, native: before });
  assert.equal(after.style, before.style);
  const changed = nativeProps('view', { className: 'p-2', style }, false, { props: first, native: before });
  assert.notEqual(changed.style, before.style);
  const restyled = nativeProps('view', { className: 'p-1', style: { width: 4 } }, false, { props: first, native: before });
  assert.equal(restyled.style, before.style, 'a new but equal style object interns to the same compiled style');
});

test('a diff names exactly the changed keys, with null for a key that returned to its default', () => {
  const base: NativeProps = {
    style: compileStyle('p-1'), text: 'a', disabled: true, hidden: true, testID: 'x',
  };
  assert.equal(diffNativeProps(base, { ...base }), null, 'nothing native changed');
  assert.deepEqual(diffNativeProps(base, { ...base, text: 'b' }), { text: 'b' });
  assert.deepEqual(diffNativeProps(base, { ...base, style: compileStyle('p-2') }), { style: compileStyle('p-2') });
  assert.deepEqual(diffNativeProps(base, {}), {
    style: null, text: null, disabled: null, hidden: null, testID: null,
  });
  assert.deepEqual(diffNativeProps({}, base), {
    style: base.style, text: 'a', disabled: true, hidden: true, testID: 'x',
  });
  assert.deepEqual(diffNativeProps({ disabled: true }, {}), { disabled: null });
  assert.deepEqual(diffNativeProps({}, { testID: 'y' }), { testID: 'y' });
  for (const diff of [diffNativeProps(base, {}), diffNativeProps({}, base)]) {
    for (const key of Object.keys(diff ?? {})) assert.ok((NATIVE_PROP_KEYS as readonly string[]).includes(key));
  }
});

test('tabIndex and autoFocus are native props with a 0 or -1 tabIndex and an absent false', () => {
  assert.deepEqual(nativeProps('view', { tabIndex: 0, autoFocus: true }, false), { tabIndex: 0, autoFocus: true });
  assert.deepEqual(nativeProps('view', { tabIndex: -1, autoFocus: false }, false), { tabIndex: -1 }, 'false is the default');
  assert.deepEqual(nativeProps('button', { autoFocus: undefined }, false), {});
  for (const invalid of [1, 2, -2, 100, 0.5, Number.NaN]) {
    // @ts-expect-error tabIndex is typed 0 | -1; the runtime check is for callers that bypass the types
    assert.throws(() => nativeProps('view', { tabIndex: invalid }, false), /tabIndex must be 0 or -1/, String(invalid));
  }
  assert.deepEqual(diffNativeProps({}, { tabIndex: 0, autoFocus: true }), { tabIndex: 0, autoFocus: true });
  assert.deepEqual(diffNativeProps({ tabIndex: 0 }, { tabIndex: -1 }), { tabIndex: -1 });
  assert.deepEqual(diffNativeProps({ tabIndex: -1, autoFocus: true }, {}), { tabIndex: null, autoFocus: null });
  assert.equal(diffNativeProps({ tabIndex: 0 }, { tabIndex: 0 }), null);
});

test('equal styles that were interned apart do not produce a diff', () => {
  const left = compileStyle('p-1 bg-white');
  const equalButDistinct: NativeProps = { style: { layers: left.layers.map((layer) => ({ ...layer })) } };
  // A hand-built object is not an interned style; comparing by content needs the key, which only
  // compileStyle results have.
  assert.throws(() => diffNativeProps({ style: left }, equalButDistinct), /needs a style from compileStyle/);
  assert.equal(diffNativeProps({ style: left }, { style: compileStyle('bg-white p-1') }), null);
});

test('diffs are stable: equal changes serialize to the same payload however the classes were written', () => {
  const first = JSON.stringify(diffNativeProps({}, { style: compileStyle('p-1 w-4'), text: 'x' }));
  const second = JSON.stringify(diffNativeProps({}, { style: compileStyle('w-4 p-1'), text: 'x' }));
  assert.equal(first, second);
  assert.equal(JSON.stringify(diffNativeProps({}, { text: 'x', style: compileStyle('p-1 w-4') })), first, 'and in a fixed key order');
});

test('role and aria props map to camelCase native fields; a boolean whose default is false is sent only when true', () => {
  assert.deepEqual(nativeProps('view', { role: 'group', 'aria-label': 'Options', 'aria-description': 'Pick one' }, false), {
    role: 'group', ariaLabel: 'Options', ariaDescription: 'Pick one',
  });
  const everything = nativeProps('view', {
    'aria-hidden': true, 'aria-disabled': true, 'aria-readonly': true, 'aria-required': true, 'aria-modal': true,
    'aria-valuetext': 'half', 'aria-placeholder': 'type', 'aria-live': 'assertive', 'aria-orientation': 'vertical',
  }, false);
  assert.deepEqual(everything, {
    ariaHidden: true, ariaDisabled: true, ariaReadOnly: true, ariaRequired: true, ariaModal: true,
    ariaValueText: 'half', ariaPlaceholder: 'type', ariaLive: 'assertive', ariaOrientation: 'vertical',
  });
  assert.deepEqual(nativeProps('view', {
    'aria-hidden': false, 'aria-disabled': false, 'aria-readonly': false, 'aria-required': false, 'aria-modal': false,
  }, false), {}, 'false is the default for these');
  // Absent means "not applicable" for these three, so a false is information.
  assert.deepEqual(nativeProps('view', { 'aria-expanded': false, 'aria-selected': false, 'aria-checked': false }, false), {
    ariaExpanded: false, ariaSelected: false, ariaChecked: false,
  });
  assert.deepEqual(nativeProps('view', { 'aria-expanded': true, 'aria-selected': true, 'aria-checked': 'mixed' }, false), {
    ariaExpanded: true, ariaSelected: true, ariaChecked: 'mixed',
  });
  assert.deepEqual(nativeProps('view', { 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 0 }, false), {
    ariaValueMin: 0, ariaValueMax: 100, ariaValueNow: 0,
  }, 'a value of 0 is a value');
  assert.deepEqual(nativeProps('view', { 'aria-label': '' }, false), { ariaLabel: '' }, 'an empty label is still a label');
});

test('aria numbers must be finite', () => {
  for (const prop of ['aria-valuemin', 'aria-valuemax', 'aria-valuenow'] as const) {
    for (const invalid of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      assert.throws(() => nativeProps('view', { [prop]: invalid }, false), new RegExp(`${prop} must be a finite number`), `${prop} ${invalid}`);
    }
  }
});

test('a diff names each accessibility field that changed, with null when it went away', () => {
  const checked: NativeProps = { role: 'checkbox', ariaChecked: false, ariaLabel: 'Sound' };
  assert.equal(diffNativeProps(checked, { ...checked }), null);
  assert.deepEqual(diffNativeProps(checked, { ...checked, ariaChecked: true }), { ariaChecked: true });
  assert.deepEqual(diffNativeProps(checked, { ...checked, ariaChecked: 'mixed' }), { ariaChecked: 'mixed' });
  assert.deepEqual(diffNativeProps(checked, { role: 'checkbox', ariaChecked: false }), { ariaLabel: null });
  assert.deepEqual(diffNativeProps(checked, {}), { role: null, ariaChecked: null, ariaLabel: null });
  assert.deepEqual(diffNativeProps({}, { ariaHidden: true, ariaValueNow: 0 }), { ariaHidden: true, ariaValueNow: 0 });
  assert.deepEqual(diffNativeProps({ ariaValueNow: 3 }, { ariaValueNow: 0 }), { ariaValueNow: 0 }, '0 replaces 3, it does not reset');
  assert.deepEqual(diffNativeProps({ ariaExpanded: true }, { ariaExpanded: false }), { ariaExpanded: false });
  for (const diff of [diffNativeProps(checked, {}), diffNativeProps({}, checked)]) {
    for (const key of Object.keys(diff ?? {})) assert.ok((NATIVE_PROP_KEYS as readonly string[]).includes(key), key);
  }
});
