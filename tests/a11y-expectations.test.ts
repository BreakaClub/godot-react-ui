import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { ELEMENTS, checkElements, checkFocus, type Reading } from '../scripts/a11y-expectations.mjs';
import { findByLabel, flatten, labelOf, type AxNode, type Frame } from '../scripts/ax-tree.mjs';

// Readings written by hand in the shape scripts/ax-dump.swift prints, for a window whose content is 0.5 points
// per Godot pixel (a retina display) and starts at (639, 400). They encode what the verifier expects of the
// platform's adapter; they are not recordings of one.
const SCALE = 0.5;
const ORIGIN = { x: 639, y: 400 };
const WINDOW: Frame = { x: 639, y: 368, width: 450, height: 450 };

const RECTS: Record<string, Frame> = {
  'a11y-save': { x: 16, y: 120, width: 80, height: 40 },
  'a11y-delete': { x: 108, y: 120, width: 90, height: 40 },
  'a11y-title': { x: 16, y: 16, width: 220, height: 28 },
  'a11y-subscribe': { x: 16, y: 200, width: 260, height: 28 },
  'a11y-select-all': { x: 16, y: 240, width: 200, height: 28 },
  'a11y-sound': { x: 16, y: 280, width: 44, height: 24 },
  'a11y-size': { x: 16, y: 320, width: 300, height: 40 },
  'a11y-size-small': { x: 16, y: 320, width: 90, height: 40 },
  'a11y-size-medium': { x: 112, y: 320, width: 100, height: 40 },
  'a11y-size-large': { x: 218, y: 320, width: 90, height: 40 },
  'a11y-volume-thumb': { x: 120, y: 380, width: 20, height: 20 },
  'a11y-scroller': { x: 16, y: 420, width: 320, height: 96 },
  // The scroll view's children: three wholly in view, one half out of its bottom edge, one beyond it.
  'a11y-message-1': { x: 24, y: 428, width: 304, height: 20 },
  'a11y-message-2': { x: 24, y: 452, width: 304, height: 20 },
  'a11y-message-3': { x: 24, y: 476, width: 304, height: 20 },
  'a11y-message-4': { x: 24, y: 500, width: 304, height: 20 },
  'a11y-message-5': { x: 24, y: 524, width: 304, height: 20 },
  'a11y-name': { x: 16, y: 530, width: 320, height: 42 },
  'a11y-notes': { x: 16, y: 584, width: 320, height: 72 },
  'a11y-readonly': { x: 16, y: 668, width: 320, height: 42 },
  'a11y-search': { x: 16, y: 722, width: 320, height: 42 },
};
const IN_VIEW = ['a11y-message-1', 'a11y-message-2', 'a11y-message-3'];

const snapshots: Record<string, { rect: Frame }> = Object.fromEntries(
  Object.entries(RECTS).map(([id, rect]) => [id, { rect }]),
);

function frameOf(id: string, shift = 0): Frame {
  const rect = RECTS[id];
  assert.ok(rect, id);
  return {
    x: ORIGIN.x + rect.x * SCALE + shift, y: ORIGIN.y + rect.y * SCALE,
    width: rect.width * SCALE, height: rect.height * SCALE,
  };
}

interface Variation { remove?: string; shift?: Record<string, number>; patch?: Record<string, Partial<AxNode>>; extra?: AxNode[] }

/** What a faithful adapter would show, `phase` 0 before the Godot-side input and 1 after. */
function reading(phase: 0 | 1, variation: Variation = {}): Reading {
  const values = (id: string): number | undefined => ELEMENTS.find(element => element.id === id)?.value?.[phase];
  const node = (id: string, base: AxNode): AxNode => ({
    ...base, frame: frameOf(id, variation.shift?.[id] ?? 0), ...variation.patch?.[id],
  });
  const nodes: Array<[string, AxNode]> = [
    ['a11y-save', { role: 'AXButton', title: 'Save', enabled: true, actionNames: ['AXPress'] }],
    ['a11y-delete', { role: 'AXButton', title: 'Delete', enabled: false }],
    ['a11y-title', { role: 'AXStaticText', value: 'Accessibility lab' }],
    ['a11y-subscribe', { role: 'AXCheckBox', title: 'Subscribe to updates', value: values('a11y-subscribe'), actionNames: ['AXPress'] }],
    ['a11y-select-all', { role: 'AXCheckBox', title: 'Select all', value: 2, actionNames: ['AXPress'] }],
    ['a11y-sound', { role: 'AXCheckBox', subrole: 'AXSwitch', description: 'Sound', value: values('a11y-sound'), actionNames: ['AXPress'] }],
    ['a11y-size', { role: 'AXGroup', description: 'Size' }],
    ['a11y-size-small', { role: 'AXRadioButton', title: 'Small', value: values('a11y-size-small'), actionNames: ['AXPress'] }],
    ['a11y-size-medium', { role: 'AXRadioButton', title: 'Medium', value: values('a11y-size-medium'), actionNames: ['AXPress'] }],
    ['a11y-size-large', { role: 'AXRadioButton', title: 'Large', value: values('a11y-size-large'), actionNames: ['AXPress'] }],
    ['a11y-volume-thumb', { role: 'AXSlider', description: 'Volume', value: values('a11y-volume-thumb'), minValue: 0, maxValue: 100, actionNames: ['AXIncrement', 'AXDecrement'] }],
    ['a11y-scroller', { role: 'AXScrollArea', description: 'Messages' }],
    ...(['a11y-message-1', 'a11y-message-2', 'a11y-message-3', 'a11y-message-4'] as const).map((id, index): [string, AxNode] => [
      id, { role: 'AXStaticText', value: `Message ${index + 1}`, actionNames: ['AXScrollToVisible'] },
    ]),
    ['a11y-name', {
      role: 'AXTextField', title: 'Name', enabled: true, value: phase === 0 ? 'Ada' : 'Ada Lovelace',
      numberOfCharacters: phase === 0 ? 3 : 12, selectedTextRange: phase === 0 ? { location: 3, length: 0 } : { location: 4, length: 8 },
      selectedText: phase === 0 ? '' : 'Lovelace', insertionPointLineNumber: 0, stringForRange: phase === 0 ? 'Ada' : 'Ada Lovelace',
      settableAttributeNames: ['AXFocused', 'AXSelectedTextRange', 'AXValue'],
    }],
    ['a11y-notes', {
      role: 'AXTextArea', title: 'Notes', enabled: true, numberOfCharacters: 12, selectedTextRange: { location: 12, length: 0 },
      selectedText: '', insertionPointLineNumber: 1, stringForRange: 'first\nsecond',
      settableAttributeNames: ['AXFocused', 'AXSelectedTextRange', 'AXValue'],
    }],
    ['a11y-readonly', {
      role: 'AXTextField', title: 'Reference', value: 'Fixed', numberOfCharacters: 5, stringForRange: 'Fixed',
      selectedTextRange: phase === 0 ? { location: 5, length: 0 } : { location: 0, length: 5 }, selectedText: phase === 0 ? '' : 'Fixed',
      insertionPointLineNumber: 0, settableAttributeNames: ['AXFocused', 'AXSelectedTextRange', 'AXValue'],
    }],
    ['a11y-search', {
      role: 'AXTextField', title: 'Search', value: '', placeholder: 'Search', numberOfCharacters: 0, stringForRange: '',
      selectedTextRange: { location: 0, length: 0 }, selectedText: '', insertionPointLineNumber: 0,
      settableAttributeNames: ['AXFocused', 'AXSelectedTextRange', 'AXValue'],
    }],
  ];
  const children = nodes.filter(([id]) => id !== variation.remove).map(([id, base]) => node(id, base));
  children.push({ role: 'AXStaticText', value: phase === 0 ? 'Saved 0 times' : 'Saved 1 times', frame: { x: 650, y: 560, width: 90, height: 12 } });
  children.push(...(variation.extra ?? []));
  return {
    tree: { role: 'AXApplication', children: [{ role: 'AXWindow', frame: WINDOW, children }] },
    focusedElement: { role: 'AXSlider', description: 'Volume' },
  };
}

test('a faithful reading passes both phases', () => {
  assert.deepEqual(checkElements(reading(0), 0, snapshots), []);
  assert.deepEqual(checkElements(reading(1), 1, snapshots), []);
});

test('the same element in the wrong phase is reported with its value', () => {
  const failures = checkElements(reading(1), 0, snapshots);
  assert.ok(failures.some(failure => failure.startsWith('a11y-subscribe: AXValue is 0, expected 1')), failures.join('\n'));
  assert.ok(failures.some(failure => failure.startsWith('a11y-volume-thumb: AXValue is 80, expected 30')));
  assert.ok(failures.some(failure => failure.includes('Saved 0 times')));
});

test('each way a reading can be wrong is named', () => {
  const failuresOf = (variation: Variation, phase: 0 | 1 = 0) => checkElements(reading(phase, variation), phase, snapshots);
  assert.ok(failuresOf({ remove: 'a11y-save' }).some(failure => failure.startsWith('a11y-save: expected one AXButton named "Save", found 0')));
  assert.ok(failuresOf({ extra: [{ role: 'AXButton', title: 'Save', frame: frameOf('a11y-save') }] })
    .some(failure => failure.includes('found 2')));
  assert.ok(failuresOf({ patch: { 'a11y-delete': { enabled: true } } }).some(failure => failure.startsWith('a11y-delete: AXEnabled is true')));
  assert.ok(failuresOf({ remove: 'a11y-scroller' }).some(failure => failure.startsWith('a11y-scroller: expected one AXScrollArea or AXUnknown named "Messages", found 0')),
    'a scroll container that is not in the tree is named');
  assert.ok(failuresOf({ patch: { 'a11y-scroller': { role: 'AXGroup' } } }).some(failure => failure.startsWith('a11y-scroller: expected one AXScrollArea')),
    'and so is one that is exposed as a plain group');
  assert.ok(failuresOf({ patch: { 'a11y-volume-thumb': { maxValue: 10 } } }).some(failure => failure.includes('range is 0..10')));
  assert.ok(failuresOf({ patch: { 'a11y-select-all': { value: 1 } } }).some(failure => failure.includes('mixed')), 'a mixed checkbox that reads as checked is wrong');
  assert.deepEqual(failuresOf({ patch: { 'a11y-select-all': { value: 0, valueDescription: 'mixed' } } }), [], 'a description counts');
  assert.ok(failuresOf({ extra: [{ role: 'AXGroup', description: 'Size', frame: frameOf('a11y-size') }] }).some(failure => failure.includes('found 2')), 'two Size groups are wrong');
  assert.ok(failuresOf({ extra: [{ role: 'AXStaticText', value: 'Secret' }] }).some(failure => failure.includes('"Secret" is inside an aria-hidden subtree')));
  assert.ok(failuresOf({ extra: [{ role: 'AXButton', description: 'Hidden text' }] }).some(failure => failure.includes('"Hidden text"')));
});

test('a text field is a text field or a text area with its text, selection and placeholder, and a wrong reading of any is named', () => {
  const failuresOf = (variation: Variation, phase: 0 | 1 = 0) => checkElements(reading(phase, variation), phase, snapshots);
  assert.ok(failuresOf({ patch: { 'a11y-name': { value: 'Ada Lovelace' } } })
    .some(failure => failure === 'a11y-name: AXValue is "Ada Lovelace", expected "Ada"'), 'the text before the Godot-side edit');
  assert.ok(failuresOf({ patch: { 'a11y-name': { value: 'Ada' } } }, 1)
    .some(failure => failure === 'a11y-name: AXValue is "Ada", expected "Ada Lovelace"'), 'and after it');
  assert.ok(failuresOf({ patch: { 'a11y-notes': { role: 'AXTextField' } } })
    .some(failure => failure.startsWith('a11y-notes: expected one AXTextArea named "Notes", found 0')), 'a text area exposed as a one-line field');
  assert.ok(failuresOf({ patch: { 'a11y-name': { role: 'AXStaticText' } } })
    .some(failure => failure.startsWith('a11y-name: expected one AXTextField named "Name", found 0')), 'a field exposed as static text');
  assert.ok(failuresOf({ remove: 'a11y-readonly' }).some(failure => failure.startsWith('a11y-readonly: expected one AXTextField')));
  // The counts, the selection, the caret's line and the placeholder, each wrong in the way the double line break was.
  assert.ok(failuresOf({ patch: { 'a11y-notes': { numberOfCharacters: 13 } } })
    .some(failure => failure === 'a11y-notes: AXNumberOfCharacters is 13, expected 12'), 'a line break counted twice');
  assert.ok(failuresOf({ patch: { 'a11y-notes': { stringForRange: 'first\n\nsecond' } } })
    .some(failure => failure.startsWith('a11y-notes: the text read by range is')), 'the text of a text area is read by range');
  assert.ok(failuresOf({ patch: { 'a11y-name': { selectedTextRange: { location: 0, length: 0 } } } })
    .some(failure => failure.startsWith('a11y-name: AXSelectedTextRange is')), 'a selection that did not arrive');
  assert.ok(failuresOf({ patch: { 'a11y-name': { selectedText: 'Ada' } } }, 1)
    .some(failure => failure === 'a11y-name: AXSelectedText is "Ada", expected "Lovelace"'), 'the selected text');
  assert.ok(failuresOf({ patch: { 'a11y-notes': { insertionPointLineNumber: 0 } } })
    .some(failure => failure.startsWith('a11y-notes: AXInsertionPointLineNumber is 0')), 'the caret line of a text area');
  assert.ok(failuresOf({ patch: { 'a11y-name': { placeholder: 'Your name' } } })
    .some(failure => failure.startsWith('a11y-name: AXPlaceholderValue')), 'a placeholder that shows while the field has text');
  assert.ok(failuresOf({ patch: { 'a11y-search': { placeholder: undefined } } })
    .some(failure => failure.startsWith('a11y-search: AXPlaceholderValue')), 'an empty field with no placeholder');
  assert.ok(failuresOf({ patch: { 'a11y-name': { settableAttributeNames: ['AXFocused'] } } })
    .some(failure => failure.startsWith('a11y-name: an editable field should let AXValue')), 'an editable field that cannot be set');
  // The gaps are notes, not failures.
  const notes: string[] = [];
  assert.deepEqual(checkElements(reading(0), 0, snapshots, notes), []);
  assert.ok(notes.some(note => note.startsWith('a11y-notes: a text area has no AXValue')));
  assert.ok(notes.some(note => note.startsWith('a11y-readonly: the platform does not say that a read-only field is read-only')));
});

test('a frame that does not agree with the others, or leaves the window, is reported', () => {
  const displaced = checkElements(reading(0, { shift: { 'a11y-size-large': 30 } }), 0, snapshots);
  assert.ok(displaced.some(failure => failure.startsWith('frames disagree with the snapshot geometry')), displaced.join('\n'));
  const outside = checkElements(reading(0, { patch: { 'a11y-save': { frame: { x: 2000, y: 2000, width: 20, height: 10 } } } }), 0, snapshots);
  assert.ok(outside.some(failure => failure.startsWith('a11y-save: its frame')), outside.join('\n'));
  const missing = checkElements(reading(0, { patch: { 'a11y-save': { frame: undefined } } }), 0, snapshots);
  assert.ok(missing.some(failure => failure === 'a11y-save: the element has no AXFrame'), missing.join('\n'));
  const scaled = { ...snapshots, ...Object.fromEntries(Object.entries(RECTS).map(([id, rect]) => [id, { rect: { ...rect, x: rect.x * 10, y: rect.y * 10, width: rect.width * 10, height: rect.height * 10 } }])) };
  assert.ok(checkElements(reading(0), 0, scaled).some(failure => failure.includes('times the snapshot geometry')), 'a wrong scale is reported');
});

test('too few comparable elements is a failure, not a pass', () => {
  const failures = checkElements(reading(0), 0, { 'a11y-save': { rect: RECTS['a11y-save'] as Frame } });
  assert.ok(failures.some(failure => failure.includes('only 1 elements could be compared')), failures.join('\n'));
});

test('platform focus must be the volume slider when the window is key, and is not judged when it is not', () => {
  const keyWindow = (focusedElement?: AxNode): Reading => ({
    tree: { role: 'AXApplication', children: [{ role: 'AXWindow', focused: true, frame: WINDOW }] },
    ...(focusedElement === undefined ? {} : { focusedElement }),
  });
  assert.deepEqual(checkFocus(keyWindow({ role: 'AXSlider', description: 'Volume' })), { failures: [] });
  assert.deepEqual(checkFocus(keyWindow()), { failures: ['the application reports no focused element'] });
  const wrong = checkFocus(keyWindow({ role: 'AXButton', title: 'Save' }));
  assert.ok(wrong.failures[0]?.includes('should be the Volume slider'));
  // A verifier's window is never key: nothing to read, said so, and not a pass or a failure on no evidence.
  const unkeyed = checkFocus(reading(1));
  assert.deepEqual(unkeyed.failures, []);
  assert.match(unkeyed.note ?? '', /not the key window/);
});

const noteFor = (notes: readonly string[], id: string, fragment: string): boolean => notes.some(note => note.startsWith(`${id}: `) && note.includes(fragment));

test('what the engine cannot convey is noted and is not a failure', () => {
  // The real macOS tree of the lab (docs/tracks/stock-engine.md): no group named Size, and the mixed checkbox unchecked.
  const notes: string[] = [];
  const asRecorded = reading(0, { remove: 'a11y-size', patch: { 'a11y-select-all': { value: 0 } } });
  assert.deepEqual(checkElements(asRecorded, 0, snapshots, notes, { mixedGap: true }), []);
  assert.ok(noteFor(notes, 'a11y-size', 'no group role'), notes.join('\n'));
  assert.ok(noteFor(notes, 'a11y-select-all', 'unchecked'));
  // A faithful adapter that gave a scroll area its role but no scroll state, and left out the far child, is still noted for those.
  assert.ok(noteFor(notes, 'a11y-scroller', 'no scroll position or range'));
  assert.ok(noteFor(notes, 'a11y-scroller', 'leaves out scroll view children'));
  assert.ok(!notes.some(note => note.includes('AXUnknown')), 'a scroll area that is an AXScrollArea has no role gap');
});

test('a scroll view as the real adapter shows it is AXUnknown with no scroll state or scroll actions, and passes with each noted', () => {
  const notes: string[] = [];
  const asRecorded = reading(1, { patch: { 'a11y-scroller': { role: 'AXUnknown', description: undefined, title: 'Messages' } } });
  assert.deepEqual(checkElements(asRecorded, 1, snapshots, notes), []);
  assert.ok(noteFor(notes, 'a11y-scroller', 'AXUnknown, not AXScrollArea'), notes.join('\n'));
  assert.ok(noteFor(notes, 'a11y-scroller', 'no scroll position or range'));
  assert.ok(noteFor(notes, 'a11y-scroller', 'no scroll up, down, left, right or set-offset action'));
  // The scroll view as a plain group is wrong whatever the adapter, and so is one that is not there.
  assert.ok(checkElements(reading(1, { patch: { 'a11y-scroller': { role: 'AXGroup' } } }), 1, snapshots).some(failure => failure.startsWith('a11y-scroller: expected one AXScrollArea or AXUnknown')));
  // Scroll state, if a platform ever exposes it, is noted for judging, not ignored.
  const exposed: string[] = [];
  checkElements(reading(1, { patch: { 'a11y-scroller': { value: 12, minValue: 0, maxValue: 40 } } }), 1, snapshots, exposed);
  assert.ok(noteFor(exposed, 'a11y-scroller', 'now exposes scroll state'), exposed.join('\n'));
});

test('children in view must be in the platform tree, with frames that follow the scroll', () => {
  const failuresOf = (variation: Variation) => checkElements(reading(1, variation), 1, snapshots);
  for (const id of IN_VIEW) {
    const label = `Message ${id.slice(-1)}`;
    assert.ok(failuresOf({ remove: id }).some(failure => failure === `${id}: "${label}" is in view in the scroll view but not in the platform tree`), id);
  }
  // A child half out of the view may be left out; one beyond it is not even in the table's geometry for this reading.
  assert.deepEqual(failuresOf({ remove: 'a11y-message-4' }), []);
  // A platform tree that did not follow a scroll leaves its children where they were: the frames disagree.
  const stale = failuresOf({ shift: Object.fromEntries(IN_VIEW.map(id => [id, 40])) });
  assert.ok(stale.some(failure => failure.startsWith('frames disagree with the snapshot geometry')), stale.join('\n'));
  // Two children with one name are wrong.
  assert.ok(failuresOf({ extra: [{ role: 'AXStaticText', value: 'Message 1', frame: frameOf('a11y-message-1') }] }).some(failure => failure.includes('at most one')));
});

test('scroll into view is advertised by a scroll view\'s contents and by nothing else', () => {
  assert.deepEqual(checkElements(reading(1), 1, snapshots), []);
  const missing = checkElements(reading(1, { patch: { 'a11y-message-2': { actionNames: ['AXPress'] } } }), 1, snapshots);
  assert.ok(missing.some(failure => failure === 'a11y-message-2: it is inside a scroll view but does not advertise AXScrollToVisible'), missing.join('\n'));
  const extra = checkElements(reading(1, { patch: { 'a11y-save': { actionNames: ['AXPress', 'AXScrollToVisible'] } } }), 1, snapshots);
  assert.ok(extra.some(failure => failure === 'a11y-save: it advertises AXScrollToVisible but is not inside a scroll view'), extra.join('\n'));
});

// tests/fixtures/ax-lab: the readings of a real `pnpm verify:a11y --engine=stock` run (stock Godot 4.7.2, AccessKit 0.22.3), read from the
// lab's own process by scripts/ax-dump.swift, and the native geometry at its end. Not hand-written: this is what the adapter showed.
// macos-before: no scroll yet. macos-scrolled: the scroll view set to a scroll offset of 40 pixels. macos-scrolled-end: scrolled to its end.
// macos-after: after the Godot-side input and a scroll back (the view is 8 pixels down, which is where scroll-into-view of its first row leaves it).
const recordedReading = (name: string): Reading => JSON.parse(readFileSync(join(__dirname, 'fixtures', 'ax-lab', name), 'utf8')) as Reading;
const recordedGeometry = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'ax-lab', 'snapshot-geometry-after.json'), 'utf8')) as Record<string, { rect: Frame }>;
const recordedScroller = (reading: Reading): AxNode => {
  const scroller = findByLabel(flatten(reading.tree), 'Messages', ['AXUnknown'])[0];
  assert.ok(scroller, 'the recording has the scroll view');
  return scroller;
};
const recordedY = (reading: Reading, label: string): number | undefined => findByLabel(flatten(reading.tree), label)[0]?.frame?.y;
/** The scroll offset the verifier set for the scrolled recording, in Godot pixels, and the display's points per pixel. */
const RECORDED_SCROLL_PX = 40;
const RECORDED_POINTS_PER_PIXEL = 0.5;

test('the recorded macOS tree of the lab passes, with what the engine cannot convey noted', () => {
  const notes: string[] = [];
  assert.deepEqual(checkElements(recordedReading('macos-after.json'), 1, recordedGeometry, notes, { mixedGap: true }), []);
  assert.deepEqual(notes.map(note => note.split(':')[0]).sort(), ['a11y-notes', 'a11y-readonly', 'a11y-scroller', 'a11y-scroller', 'a11y-scroller', 'a11y-scroller', 'a11y-select-all', 'a11y-size']);
  for (const fragment of ['AXUnknown, not AXScrollArea', 'no scroll position or range', 'no scroll up, down, left, right or set-offset action', 'leaves out scroll view children']) {
    assert.ok(noteFor(notes, 'a11y-scroller', fragment), fragment);
  }
  // The same recording judged against the other phase is wrong in exactly the values the Godot-side input changed.
  const wrongPhase = checkElements(recordedReading('macos-after.json'), 0, recordedGeometry, [], { mixedGap: true });
  assert.ok(wrongPhase.some(failure => failure.startsWith('a11y-volume-thumb: AXValue is 80, expected 30')), wrongPhase.join('\n'));
});

/** The text fields and text areas of a recorded reading, by title. */
const recordedTextInputs = (reading: Reading): Map<string, AxNode> => new Map(
  flatten(reading.tree).filter(node => node.role === 'AXTextField' || node.role === 'AXTextArea').map(node => [labelOf(node), node]),
);

test('the recorded text inputs read exactly as a stock LineEdit and TextEdit do through the same adapter', () => {
  const ours = recordedTextInputs(recordedReading('macos-after.json'));
  // The stock controls: a LineEdit and a read-only one, one with only a placeholder, and a TextEdit, in the same engine and adapter.
  const stock = recordedTextInputs(recordedReading('macos-stock-controls.json'));
  for (const name of ['Name', 'Notes', 'Reference', 'Search']) {
    const mine = ours.get(name);
    const control = stock.get(name);
    assert.ok(mine && control, name);
    for (const attribute of ['role', 'roleDescription', 'subrole', 'orientation', 'enabled'] as const) {
      assert.equal(mine[attribute], control[attribute], `${name} ${attribute}`);
    }
    assert.deepEqual([...(mine.attributeNames ?? [])].sort(), [...(control.attributeNames ?? [])].sort(), `${name} attributes`);
    assert.deepEqual(mine.settableAttributeNames, control.settableAttributeNames, `${name} settable attributes`);
    assert.equal(mine.value === undefined, control.value === undefined, `${name} has an AXValue in the same cases`);
  }
  // What the adapter cannot convey, read from the controls, not from the library: a text area has no AXValue, and a read-only
  // field is as settable as an editable one.
  assert.equal(stock.get('Notes')?.value, undefined);
  assert.ok(stock.get('Reference')?.settableAttributeNames?.includes('AXValue'));
  // The count of characters of a two-line text is the text's length in both: a line break counted twice read 13 (observed).
  assert.equal(ours.get('Notes')?.numberOfCharacters, 12);
  assert.equal(ours.get('Notes')?.stringForRange, 'first\nsecond');
  assert.equal(stock.get('Notes')?.numberOfCharacters, 12);
  // A placeholder shows on the empty field, which a field with no label takes its name from, as the stock one does.
  assert.equal(ours.get('Search')?.placeholder, 'Search');
  assert.equal(stock.get('Search')?.placeholder, 'Search');
  assert.equal(ours.get('Name')?.placeholder, undefined, 'a placeholder is not shown while the field has text');
  // The selection of the last Godot-side step.
  assert.deepEqual(ours.get('Name')?.selectedTextRange, { location: 4, length: 8 });
  assert.equal(ours.get('Name')?.selectedText, 'Lovelace');
});

test('the recorded scroll view: AXUnknown with no scroll state, and a tree that follows every scroll to the pixel', () => {
  const before = recordedReading('macos-before.json');
  const scrolled = recordedReading('macos-scrolled.json');
  const end = recordedReading('macos-scrolled-end.json');
  for (const reading of [before, scrolled, end]) {
    const scroller = recordedScroller(reading);
    assert.equal(scroller.roleDescription, 'unknown');
    assert.deepEqual([scroller.value, scroller.minValue, scroller.maxValue, scroller.verticalScrollBar, scroller.horizontalScrollBar], [undefined, undefined, undefined, undefined, undefined]);
    assert.equal(scroller.actionNames, undefined);
  }
  // A scroll by 40 pixels moves every child still in the tree by 40 pixels, in points.
  for (const label of ['Message 2', 'Message 3', 'Message 4']) {
    const moved = (recordedY(before, label) ?? NaN) - (recordedY(scrolled, label) ?? NaN);
    assert.equal(moved, RECORDED_SCROLL_PX * RECORDED_POINTS_PER_PIXEL, label);
  }
  // The children in the tree follow the viewport: the top of the list, then just past the top, then the end, with the last child only there.
  const labelsOf = (reading: Reading): string[] => recordedScroller(reading).children?.map(child => labelOf(child)) ?? [];
  assert.deepEqual(labelsOf(before), ['Message 1', 'Message 2', 'Message 3', 'Message 4', 'Message 5']);
  assert.deepEqual(labelsOf(scrolled), ['Message 1', 'Message 2', 'Message 3', 'Message 4', 'Message 5', 'Message 6', 'Message 7']);
  assert.deepEqual(labelsOf(end), ['Message 10', 'Message 11', 'Message 12', 'Mark all read']);
  // Every child advertises scroll-into-view, and the last one is a button too.
  assert.deepEqual(findByLabel(flatten(end.tree), 'Mark all read', ['AXButton'])[0]?.actionNames, ['AXScrollToVisible', 'AXPress']);
  for (const reading of [before, scrolled, end]) {
    for (const child of recordedScroller(reading).children ?? []) assert.ok(child.actionNames?.includes('AXScrollToVisible'), labelOf(child));
  }
});

test('a tree that kept the children where they were before a scroll is caught by the recorded geometry', () => {
  const stale: Reading = structuredClone(recordedReading('macos-after.json'));
  for (const child of recordedScroller(stale).children ?? []) {
    if (child.frame !== undefined) child.frame.y += RECORDED_SCROLL_PX * RECORDED_POINTS_PER_PIXEL;
  }
  const failures = checkElements(stale, 1, recordedGeometry);
  assert.ok(failures.some(failure => failure.startsWith('frames disagree with the snapshot geometry')), failures.join('\n'));
});

test('the actions the platform advertises are judged: each expected one is there, and a disabled element has none that acts', () => {
  const failuresOf = (variation: Variation) => checkElements(reading(0, variation), 0, snapshots);
  assert.deepEqual(failuresOf({}), []);
  assert.ok(failuresOf({ patch: { 'a11y-save': { actionNames: [] } } }).some(failure => failure.startsWith('a11y-save: the platform does not advertise AXPress')));
  assert.ok(failuresOf({ patch: { 'a11y-subscribe': { actionNames: undefined } } }).some(failure => failure.startsWith('a11y-subscribe: the platform does not advertise AXPress')));
  assert.ok(failuresOf({ patch: { 'a11y-volume-thumb': { actionNames: ['AXIncrement'] } } }).some(failure => failure.startsWith('a11y-volume-thumb: the platform does not advertise AXDecrement')));
  assert.ok(failuresOf({ patch: { 'a11y-delete': { actionNames: ['AXPress'] } } }).some(failure => failure.startsWith('a11y-delete: a disabled element advertises AXPress')));
  // The window's and the other elements' extra actions are not judged.
  assert.deepEqual(failuresOf({ patch: { 'a11y-save': { actionNames: ['AXPress', 'AXShowMenu'] } } }), []);
});

test('the recorded macOS tree advertises the actions the lab expects, and the same tree without them fails', () => {
  const recorded = recordedReading('macos-after.json');
  assert.deepEqual(checkElements(recorded, 1, recordedGeometry, [], { mixedGap: true }), []);
  const stripped: Reading = JSON.parse(JSON.stringify(recorded));
  const strip = (node: AxNode): void => {
    if (labelOf(node) === 'Save' || labelOf(node) === 'Volume') delete node.actionNames;
    for (const child of node.children ?? []) strip(child);
  };
  strip(stripped.tree);
  const failures = checkElements(stripped, 1, recordedGeometry, [], { mixedGap: true });
  assert.ok(failures.some(failure => failure.startsWith('a11y-save: the platform does not advertise AXPress')), failures.join('\n'));
});

test('a mixed checkbox that reads unchecked is a recorded gap only where it was recorded, and only if it says nothing else', () => {
  const asRecorded = { patch: { 'a11y-select-all': { value: 0 } } };
  const notes: string[] = [];
  assert.deepEqual(checkElements(reading(0, asRecorded), 0, snapshots, notes, { mixedGap: true }), []);
  assert.ok(noteFor(notes, 'a11y-select-all', 'unchecked'));
  // Another engine has not recorded the gap: the same reading is a failure there.
  const elsewhere = checkElements(reading(0, asRecorded), 0, snapshots);
  assert.ok(elsewhere.some(failure => failure.startsWith('a11y-select-all: a mixed checkbox reads as neither')), elsewhere.join('\n'));
  // On the engine of the gap, unchecked with a description that says something else, or checked, is still wrong.
  const described = checkElements(reading(0, { patch: { 'a11y-select-all': { value: 0, valueDescription: 'unchecked' } } }), 0, snapshots, [], { mixedGap: true });
  assert.ok(described.some(failure => failure.startsWith('a11y-select-all: a mixed checkbox reads as neither')));
  const checked = checkElements(reading(0, { patch: { 'a11y-select-all': { value: 1 } } }), 0, snapshots, [], { mixedGap: true });
  assert.ok(checked.some(failure => failure.startsWith('a11y-select-all: a mixed checkbox reads as neither')));
  // Conveyed, by value or by description, passes anywhere.
  assert.deepEqual(checkElements(reading(0, { patch: { 'a11y-select-all': { value: 0, valueDescription: 'mixed' } } }), 0, snapshots), []);
  assert.deepEqual(checkElements(reading(0), 0, snapshots), []);
});
