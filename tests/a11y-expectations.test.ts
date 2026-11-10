import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { ELEMENTS, checkElements, checkFocus, type Reading, type SnapshotElement, type SnapshotScroll } from '../scripts/a11y-expectations.mjs';
import { findByLabel, flatten, labelOf, type AxNode, type Frame } from '../scripts/ax-tree.mjs';

// Readings written by hand in the shape scripts/ax-dump.swift prints, for a window whose content is 0.5 points
// per Godot pixel (a retina display) and starts at (639, 400). They encode what the verifier expects of the
// platform's adapter; they are not recordings of one.
const SCALE = 0.5;
const ORIGIN = { x: 639, y: 400 };
const WINDOW: Frame = { x: 639, y: 368, width: 450, height: 520 };

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
  'a11y-log': { x: 16, y: 776, width: 320, height: 72 },
  'a11y-gallery': { x: 16, y: 860, width: 320, height: 72 },
};

// The scroll containers' native state and the tracks of their bars: what a faithful tree's AXScrollBar elements must say.
const scrollState = (overrides: Partial<SnapshotScroll>): SnapshotScroll => ({
  scrollLeft: 0, scrollTop: 0, minScrollLeft: 0, maxScrollLeft: 0, minScrollTop: 0, maxScrollTop: 0, tracks: null, ...overrides,
});
const TRACKS: Record<string, { x?: Frame; y?: Frame }> = {
  'a11y-scroller': { y: { x: 328, y: 424, width: 6, height: 88 } },
  'a11y-log': { y: { x: 328, y: 780, width: 6, height: 64 } },
  'a11y-gallery': { x: { x: 18, y: 924, width: 294, height: 6 }, y: { x: 328, y: 862, width: 6, height: 58 } },
};
const SCROLLS: Record<string, SnapshotScroll> = {
  'a11y-scroller': scrollState({ scrollTop: 0, maxScrollTop: 260, tracks: { x: null, y: TRACKS['a11y-scroller']?.y ?? null } }),
  'a11y-log': scrollState({ scrollTop: 0, maxScrollTop: 60, tracks: { x: null, y: TRACKS['a11y-log']?.y ?? null } }),
  'a11y-gallery': scrollState({
    scrollLeft: 20, scrollTop: 10, maxScrollLeft: 330, maxScrollTop: 90,
    tracks: { x: TRACKS['a11y-gallery']?.x ?? null, y: TRACKS['a11y-gallery']?.y ?? null },
  }),
  // Fits its text: a scroll container with nothing to scroll has no tracks.
  'a11y-notes': scrollState({ tracks: { x: null, y: null } }),
};
const IN_VIEW = ['a11y-message-1', 'a11y-message-2', 'a11y-message-3'];

const snapshots: Record<string, SnapshotElement> = Object.fromEntries(
  Object.entries(RECTS).map(([id, rect]) => [id, SCROLLS[id] === undefined ? { rect } : { rect, scroll: SCROLLS[id] }]),
);

function toFrame(rect: Frame, shift = 0): Frame {
  return {
    x: ORIGIN.x + rect.x * SCALE + shift, y: ORIGIN.y + rect.y * SCALE,
    width: rect.width * SCALE, height: rect.height * SCALE,
  };
}

function frameOf(id: string, shift = 0): Frame {
  const rect = RECTS[id];
  assert.ok(rect, id);
  return toFrame(rect, shift);
}

/** The AXScrollBar a faithful adapter shows for `axis` of scroll container `id`: native's offset, range and track, with the axis' orientation. */
function barOf(id: string, axis: 'x' | 'y'): AxNode {
  const scroll = SCROLLS[id];
  const track = TRACKS[id]?.[axis];
  assert.ok(scroll && track, `${id} ${axis}`);
  return {
    role: 'AXScrollBar', roleDescription: 'scroll bar',
    value: axis === 'x' ? scroll.scrollLeft : scroll.scrollTop,
    minValue: axis === 'x' ? scroll.minScrollLeft : scroll.minScrollTop,
    maxValue: axis === 'x' ? scroll.maxScrollLeft : scroll.maxScrollTop,
    orientation: axis === 'x' ? 'AXHorizontalOrientation' : 'AXVerticalOrientation',
    frame: toFrame(track), actionNames: ['AXIncrement', 'AXDecrement'],
  };
}

interface Variation {
  remove?: string; shift?: Record<string, number>; patch?: Record<string, Partial<AxNode>>; extra?: AxNode[];
  /** Change the children of an element (its scroll bars, in these tests). */
  children?: Record<string, (children: AxNode[]) => AxNode[]>;
}

/** What a faithful adapter would show, `phase` 0 before the Godot-side input and 1 after. */
function reading(phase: 0 | 1, variation: Variation = {}): Reading {
  const values = (id: string): number | undefined => ELEMENTS.find(element => element.id === id)?.value?.[phase];
  const node = (id: string, base: AxNode): AxNode => {
    const children = variation.children?.[id]?.(base.children ?? []) ?? base.children;
    return { ...base, ...(children === undefined ? {} : { children }), frame: frameOf(id, variation.shift?.[id] ?? 0), ...variation.patch?.[id] };
  };
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
    ['a11y-scroller', { role: 'AXScrollArea', description: 'Messages', children: [barOf('a11y-scroller', 'y')] }],
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
    ['a11y-log', {
      role: 'AXTextArea', title: 'Log', enabled: true, numberOfCharacters: 23, selectedTextRange: { location: 23, length: 0 },
      selectedText: '', insertionPointLineNumber: 4, stringForRange: 'one\ntwo\nthree\nfour\nfive',
      settableAttributeNames: ['AXFocused', 'AXSelectedTextRange', 'AXValue'], children: [barOf('a11y-log', 'y')],
    }],
    ['a11y-gallery', {
      role: 'AXScrollArea', description: 'Gallery',
      children: [{ role: 'AXStaticText', value: 'Photo 1', actionNames: ['AXScrollToVisible'] }, barOf('a11y-gallery', 'x'), barOf('a11y-gallery', 'y')],
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

test('a scroll container has an AXScrollBar for each axis that can move, and a wrong reading of any is named', () => {
  assert.deepEqual(checkElements(reading(0), 0, snapshots), []);
  assert.deepEqual(checkElements(reading(1), 1, snapshots), []);
  const failuresOf = (variation: Variation) => checkElements(reading(1, variation), 1, snapshots);
  const edit = (id: string, change: Partial<AxNode>): Variation => ({ children: { [id]: children => children.map(child => (child.role === 'AXScrollBar' ? { ...child, ...change } : child)) } });
  const messages = 'a11y-scroller vertical scroll bar';
  // How many there are, and which axis each is.
  assert.ok(failuresOf({ children: { 'a11y-scroller': () => [] } }).includes('a11y-scroller: expected 1 scroll bar(s) (vertical), found 0'), 'a scroll view with no bar');
  assert.ok(failuresOf({ children: { 'a11y-notes': () => [barOf('a11y-scroller', 'y')] } }).includes('a11y-notes: expected 0 scroll bar(s) (none), found 1'),
    'a text area that fits its text has no bar');
  assert.ok(failuresOf({ children: { 'a11y-gallery': children => children.slice(0, 2) } }).includes('a11y-gallery: expected 2 scroll bar(s) (horizontal, vertical), found 1'),
    'a bar missing for an axis that scrolls');
  assert.ok(failuresOf({ children: { 'a11y-log': () => [] } }).includes('a11y-log: expected 1 scroll bar(s) (vertical), found 0'), 'a text area that overflows has one');
  // Where they sit: after the content, horizontal first.
  assert.ok(failuresOf({ children: { 'a11y-gallery': children => [children[0], children[2], children[1]].filter((child): child is AxNode => child !== undefined) } })
    .some(failure => failure.startsWith('a11y-gallery horizontal scroll bar: AXOrientation is "AXVerticalOrientation", expected AXHorizontalOrientation')), 'the bars in the wrong order');
  assert.ok(failuresOf({ children: { 'a11y-gallery': children => [children[1], children[2], children[0]].filter((child): child is AxNode => child !== undefined) } })
    .includes('a11y-gallery: the scroll bars should be the last children of the scroll container, after its content'), 'bars before the content');
  // What each says.
  assert.ok(failuresOf(edit('a11y-scroller', { value: 12 })).includes(`${messages}: AXValue is 12, expected 0 (scrollTop)`), 'the offset');
  assert.ok(failuresOf(edit('a11y-scroller', { maxValue: 100 })).includes(`${messages}: AXMaxValue is 100, expected 260 (maxScrollTop)`), 'the range');
  assert.ok(failuresOf(edit('a11y-scroller', { minValue: -5 })).includes(`${messages}: AXMinValue is -5, expected 0 (minScrollTop)`), 'the start of the range');
  assert.ok(failuresOf(edit('a11y-scroller', { orientation: 'AXUnknownOrientation' }))
    .includes(`${messages}: AXOrientation is "AXUnknownOrientation", expected AXVerticalOrientation (the horizontal bar comes first)`), 'an orientation that was not conveyed');
  assert.ok(failuresOf(edit('a11y-scroller', { actionNames: ['AXIncrement'] })).some(failure => failure.startsWith(`${messages}: the platform does not advertise AXDecrement`)), 'a missing action, judged by checkActions like every other element\'s');
  assert.ok(failuresOf(edit('a11y-scroller', { actionNames: undefined })).some(failure => failure.startsWith(`${messages}: the platform does not advertise AXIncrement`)), 'and no actions at all');
  assert.ok(failuresOf(edit('a11y-scroller', { title: 'Vertical' })).includes(`${messages}: it should have no name, it is named "Vertical"`), 'a name the stock bars do not have');
  assert.ok(failuresOf(edit('a11y-scroller', { frame: undefined })).includes(`${messages}: the element has no AXFrame`), 'no frame');
  // Its frame is the track: one that is somewhere else disagrees with the rest of the tree.
  const displaced = failuresOf({ children: { 'a11y-gallery': children => children.map(child => (child.role === 'AXScrollBar' && child.frame ? { ...child, frame: { ...child.frame, x: child.frame.x + 40 } } : child)) } });
  assert.ok(displaced.some(failure => failure.startsWith('frames disagree with the snapshot geometry')), displaced.join('\n'));
  // A tree that did not follow a scroll keeps the old offset on its bar. Native has scrolled the view 40 pixels.
  const scrolled: Record<string, SnapshotElement> = { ...snapshots, 'a11y-scroller': { rect: RECTS['a11y-scroller'] as Frame, scroll: { ...(SCROLLS['a11y-scroller'] as SnapshotScroll), scrollTop: 40 } } };
  assert.ok(checkElements(reading(1), 1, scrolled).includes(`${messages}: AXValue is 0, expected 40 (scrollTop)`), 'a bar that kept its old value after a scroll');
  // Both axes of the gallery are read from their own offsets.
  const sideways: Record<string, SnapshotElement> = { ...snapshots, 'a11y-gallery': { rect: RECTS['a11y-gallery'] as Frame, scroll: { ...(SCROLLS['a11y-gallery'] as SnapshotScroll), scrollLeft: 50 } } };
  assert.deepEqual(checkElements(reading(1), 1, sideways), ['a11y-gallery horizontal scroll bar: AXValue is 20, expected 50 (scrollLeft)']);
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
  // The real macOS tree of the lab: no group named Size, and the mixed checkbox unchecked.
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
const recordedGeometry = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'ax-lab', 'snapshot-geometry-after.json'), 'utf8')) as Record<string, SnapshotElement>;
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
  assert.deepEqual(notes.map(note => note.split(':')[0]).sort(), [
    'a11y-gallery', 'a11y-gallery', 'a11y-gallery', 'a11y-log', 'a11y-notes', 'a11y-readonly',
    'a11y-scroller', 'a11y-scroller', 'a11y-scroller', 'a11y-scroller', 'a11y-select-all', 'a11y-size',
  ]);
  for (const fragment of ['AXUnknown, not AXScrollArea', 'no scroll position or range', 'no scroll up, down, left, right or set-offset action', 'leaves out scroll view children']) {
    assert.ok(noteFor(notes, 'a11y-scroller', fragment), fragment);
  }
  // The position and range are not gaps any more: the scroll bars carry them, and they are judged against native (no failure above).
  assert.ok(!notes.some(note => note.includes('now exposes scroll state')), notes.join('\n'));
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
  // The content in the tree follows the viewport: the top of the list, then just past the top, then the end. The last row, the button,
  // is in the tree at every position in this recording (an earlier one without scroll bar children left it out until the end).
  const contentOf = (reading: Reading): AxNode[] => (recordedScroller(reading).children ?? []).filter(child => child.role !== 'AXScrollBar');
  const labelsOf = (reading: Reading): string[] => contentOf(reading).map(child => labelOf(child));
  assert.deepEqual(labelsOf(before), ['Message 1', 'Message 2', 'Message 3', 'Message 4', 'Message 5', 'Mark all read']);
  assert.deepEqual(labelsOf(scrolled), ['Message 1', 'Message 2', 'Message 3', 'Message 4', 'Message 5', 'Message 6', 'Message 7', 'Mark all read']);
  assert.deepEqual(labelsOf(end), ['Message 10', 'Message 11', 'Message 12', 'Mark all read']);
  // Every child advertises scroll-into-view, and the last one is a button too.
  assert.deepEqual(findByLabel(flatten(end.tree), 'Mark all read', ['AXButton'])[0]?.actionNames, ['AXScrollToVisible', 'AXPress']);
  for (const reading of [before, scrolled, end]) {
    for (const child of contentOf(reading)) assert.ok(child.actionNames?.includes('AXScrollToVisible'), labelOf(child));
  }
});

test('the recorded scroll bar of the messages follows the scroll: 0, then 40, then the end of its range, and nothing else changes', () => {
  const bars = ['macos-before.json', 'macos-scrolled.json', 'macos-scrolled-end.json'].map(name => {
    const scrollBars = (recordedScroller(recordedReading(name)).children ?? []).filter(child => child.role === 'AXScrollBar');
    assert.equal(scrollBars.length, 1, `${name}: one bar for the one axis that scrolls`);
    assert.ok(scrollBars[0]);
    return scrollBars[0];
  });
  assert.deepEqual(bars.map(bar => bar.value), [0, RECORDED_SCROLL_PX, bars[2]?.maxValue], 'the value is the scroll offset, and at the end it is the maximum');
  assert.ok(bars.every(bar => bar.minValue === 0 && bar.maxValue === bars[0]?.maxValue && bar.orientation === 'AXVerticalOrientation'));
  assert.deepEqual(bars.map(bar => bar.frame), [bars[0]?.frame, bars[0]?.frame, bars[0]?.frame], 'the track does not move when the content does');
  assert.ok(bars.every(bar => bar.actionNames?.join() === 'AXIncrement,AXDecrement' && labelOf(bar) === ''));
  // The bar is the track native reports (scaled to points), judged in checkElements: its stale value is caught.
  const stale: Reading = structuredClone(recordedReading('macos-scrolled.json'));
  const bar = (recordedScroller(stale).children ?? []).find(child => child.role === 'AXScrollBar');
  assert.ok(bar);
  bar.value = 0;
  const failures = checkElements(stale, 1, { ...recordedGeometry, 'a11y-scroller': { ...(recordedGeometry['a11y-scroller'] as SnapshotElement), scroll: { ...(recordedGeometry['a11y-scroller']?.scroll as SnapshotScroll), scrollTop: RECORDED_SCROLL_PX } } });
  assert.ok(failures.includes('a11y-scroller vertical scroll bar: AXValue is 0, expected 40 (scrollTop)'), failures.join('\n'));
});

/** The scroll bars among a node's children, and the other children. */
const barsAndContent = (node: AxNode): { bars: AxNode[]; content: AxNode[] } => ({
  bars: (node.children ?? []).filter(child => child.role === 'AXScrollBar'),
  content: (node.children ?? []).filter(child => child.role !== 'AXScrollBar'),
});

test('the recorded scroll bars are the stock controls\' scroll bars: same element, same place, same order; what differs is documented', () => {
  const lab = recordedReading('macos-after.json');
  const stockContainers = recordedReading('macos-stock-scroll-controls.json');
  const stockTextEdits = recordedReading('macos-stock-text-area-scroll-controls.json');
  const container = (reading: Reading, bars: number): AxNode => {
    const found = flatten(reading.tree).filter(node => barsAndContent(node).bars.length === bars && node.role === 'AXUnknown' && node.title !== 'SceneLauncher');
    assert.equal(found.length, 1, `one container with ${bars} bar(s)`);
    return found[0] as AxNode;
  };
  // A ScrollContainer that overflows on both axes against the lab's gallery, and one that overflows on one against the messages.
  const pairs: Array<[string, AxNode, AxNode]> = [
    ['both axes', container(stockContainers, 2), findByLabel(flatten(lab.tree), 'Gallery', ['AXUnknown'])[0] as AxNode],
    ['one axis', container(stockContainers, 1), findByLabel(flatten(lab.tree), 'Messages', ['AXUnknown'])[0] as AxNode],
  ];
  for (const [name, stock, ours] of pairs) {
    const [stockParts, ourParts] = [barsAndContent(stock), barsAndContent(ours)];
    assert.equal(ourParts.bars.length, stockParts.bars.length, `${name}: a bar per axis that scrolls`);
    assert.ok(stock.children?.slice(-stockParts.bars.length).every(child => child.role === 'AXScrollBar'), `${name}: the stock bars come after the content`);
    assert.ok(ours.children?.slice(-ourParts.bars.length).every(child => child.role === 'AXScrollBar'), `${name}: and so do ours`);
    ourParts.bars.forEach((bar, index) => {
      const control = stockParts.bars[index] as AxNode;
      for (const attribute of ['role', 'roleDescription', 'subrole'] as const) assert.equal(bar[attribute], control[attribute], `${name} ${index} ${attribute}`);
      assert.equal(bar.minValue, control.minValue, `${name} ${index}: the range starts at 0`);
      assert.equal(typeof bar.value, typeof control.value);
      // The horizontal bar is the first, as it is in the stock container: it is wider than it is tall.
      const horizontal = (node: AxNode): boolean => (node.frame?.width ?? 0) > (node.frame?.height ?? 0);
      assert.equal(horizontal(bar), horizontal(control), `${name} ${index}: the same axis in the same place`);
      assert.equal(bar.orientation, horizontal(bar) ? 'AXHorizontalOrientation' : 'AXVerticalOrientation');
      // The differences: the stock bar says nothing of its orientation, and has the scroll-into-view action every stock Control has.
      assert.equal(control.orientation, 'AXUnknownOrientation');
      assert.deepEqual(control.actionNames, ['AXScrollToVisible', 'AXIncrement', 'AXDecrement']);
      assert.deepEqual(bar.actionNames, ['AXIncrement', 'AXDecrement']);
    });
  }
  // Godot's maximum is the size of the content, which the value never reaches; ours is the farthest offset the content can scroll to.
  const stockMax = Number(barsAndContent(container(stockContainers, 1)).bars[0]?.maxValue);
  assert.ok(stockMax > 0 && stockMax !== 251, 'the stock bar of the 12-row container has the content height as its maximum');
  // A text area: the stock TextEdit that overflows has bars as children, one that fits its text has none, and a LineEdit never does.
  const stockAreas = new Map(flatten(stockTextEdits.tree).filter(node => node.role === 'AXTextArea' || node.role === 'AXTextField').map(node => [labelOf(node), node]));
  assert.deepEqual([...stockAreas.keys()].sort(), ['Line', 'Short notes', 'Tall notes']);
  assert.equal(barsAndContent(stockAreas.get('Tall notes') as AxNode).bars.length, 2, 'a stock TextEdit with long lines and many has both bars');
  assert.equal(barsAndContent(stockAreas.get('Short notes') as AxNode).bars.length, 0, 'one that fits its text has none');
  assert.equal(barsAndContent(stockAreas.get('Line') as AxNode).bars.length, 0, 'a LineEdit has none, however far it scrolls its text');
  const ourAreas = new Map(flatten(lab.tree).filter(node => node.role === 'AXTextArea' || node.role === 'AXTextField').map(node => [labelOf(node), node]));
  assert.equal(barsAndContent(ourAreas.get('Log') as AxNode).bars.length, 1, 'ours that overflows on one axis has a bar for it');
  assert.equal(barsAndContent(ourAreas.get('Notes') as AxNode).bars.length, 0);
  assert.equal(barsAndContent(ourAreas.get('Name') as AxNode).bars.length, 0);
  // The text area's children are its bars only, in both: the line elements the engine makes are not in the platform tree.
  assert.equal(ourAreas.get('Log')?.children?.length, 1);
  assert.ok((stockAreas.get('Tall notes')?.children ?? []).every(child => child.role === 'AXScrollBar'));
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

test('the recorded text area that stopped overflowing has no scroll bar left, and the one that overflows has its bar again', () => {
  const log = (reading: Reading): AxNode => {
    const found = findByLabel(flatten(reading.tree), 'Log', ['AXTextArea']);
    assert.equal(found.length, 1);
    return found[0] as AxNode;
  };
  // macos-log-fits: the Godot-side half set the log to "short"; the adapter's tree has the text area and no bar under it.
  const fits = log(recordedReading('macos-log-fits.json'));
  assert.equal(fits.stringForRange, 'short');
  assert.deepEqual(fits.children ?? [], []);
  // macos-after: the text is back and its bar is, scrolled a step back from the end of its range.
  const bars = barsAndContent(log(recordedReading('macos-after.json'))).bars;
  assert.equal(bars.length, 1);
  assert.equal(bars[0]?.orientation, 'AXVerticalOrientation');
  assert.ok(Number(bars[0]?.value) > 0 && Number(bars[0]?.value) < Number(bars[0]?.maxValue));
});

test('a recorded tree without the scroll bars (the adapter\'s reading before they existed) fails for each scroll container', () => {
  const withoutBars = (node: AxNode): AxNode => ({ ...node, ...(node.children === undefined ? {} : { children: node.children.filter(child => child.role !== 'AXScrollBar').map(withoutBars) }) });
  const recorded = recordedReading('macos-after.json');
  const without: Reading = { ...recorded, tree: withoutBars(recorded.tree) };
  const failures = checkElements(without, 1, recordedGeometry);
  assert.ok(failures.includes('a11y-scroller: expected 1 scroll bar(s) (vertical), found 0'), failures.join('\n'));
  assert.ok(failures.includes('a11y-gallery: expected 2 scroll bar(s) (horizontal, vertical), found 0'));
  assert.ok(failures.includes('a11y-log: expected 1 scroll bar(s) (vertical), found 0'));
});
