import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { ELEMENTS, checkElements, checkFocus, type Reading } from '../scripts/a11y-expectations.mjs';
import type { AxNode, Frame } from '../scripts/ax-tree.mjs';

// Readings written by hand in the shape scripts/ax-dump.swift prints, for a window whose content is 0.5 points
// per Godot pixel (a retina display) and starts at (639, 400). They encode what the verifier expects of the
// platform's adapter; they are not recordings of one.
const SCALE = 0.5;
const ORIGIN = { x: 639, y: 400 };
const WINDOW: Frame = { x: 639, y: 368, width: 450, height: 382 };

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
};

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
    ['a11y-save', { role: 'AXButton', title: 'Save', enabled: true }],
    ['a11y-delete', { role: 'AXButton', title: 'Delete', enabled: false }],
    ['a11y-title', { role: 'AXStaticText', value: 'Accessibility lab' }],
    ['a11y-subscribe', { role: 'AXCheckBox', title: 'Subscribe to updates', value: values('a11y-subscribe') }],
    ['a11y-select-all', { role: 'AXCheckBox', title: 'Select all', value: 2 }],
    ['a11y-sound', { role: 'AXCheckBox', subrole: 'AXSwitch', description: 'Sound', value: values('a11y-sound') }],
    ['a11y-size', { role: 'AXGroup', description: 'Size' }],
    ['a11y-size-small', { role: 'AXRadioButton', title: 'Small', value: values('a11y-size-small') }],
    ['a11y-size-medium', { role: 'AXRadioButton', title: 'Medium', value: values('a11y-size-medium') }],
    ['a11y-size-large', { role: 'AXRadioButton', title: 'Large', value: values('a11y-size-large') }],
    ['a11y-volume-thumb', { role: 'AXSlider', description: 'Volume', value: values('a11y-volume-thumb'), minValue: 0, maxValue: 100 }],
    ['a11y-scroller', { role: 'AXScrollArea', description: 'Messages' }],
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
  assert.ok(failuresOf({ remove: 'a11y-scroller' }).some(failure => failure.startsWith('a11y-scroller: expected one AXScrollArea named "Messages", found 0')),
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

test('what the engine cannot convey is noted, once per element, and is not a failure', () => {
  // The real macOS tree of the lab (docs/tracks/stock-engine.md): no group named Size, and the mixed checkbox unchecked.
  const notes: string[] = [];
  const asRecorded = reading(0, { remove: 'a11y-size', patch: { 'a11y-select-all': { value: 0 } } });
  assert.deepEqual(checkElements(asRecorded, 0, snapshots, notes), []);
  assert.equal(notes.length, 2, notes.join('\n'));
  assert.ok(notes.some(note => note.startsWith('a11y-size: ') && note.includes('no group role')));
  assert.ok(notes.some(note => note.startsWith('a11y-select-all: ') && note.includes('unchecked')));
  // A faithful adapter needs no notes.
  const none: string[] = [];
  assert.deepEqual(checkElements(reading(0), 0, snapshots, none), []);
  assert.deepEqual(none, []);
});

test('the recorded macOS tree of the lab (stock Godot 4.7.2, AccessKit 0.22.3) passes, with the two things the engine cannot convey noted', () => {
  // tests/fixtures/ax-lab: ax-after.json and snapshot-geometry.json (as macos-after.json and snapshot-geometry-after.json) of a real `pnpm verify:a11y --engine=stock` run, read
  // from the lab's own process by scripts/ax-dump.swift. Not hand-written: this is what the adapter showed.
  const read = (name: string): unknown => JSON.parse(readFileSync(join(__dirname, 'fixtures', 'ax-lab', name), 'utf8'));
  const recorded = read('macos-after.json') as Reading;
  const geometry = read('snapshot-geometry-after.json') as Record<string, { rect: Frame }>;
  const notes: string[] = [];
  assert.deepEqual(checkElements(recorded, 1, geometry, notes), []);
  assert.deepEqual(notes.map(note => note.split(':')[0]), ['a11y-select-all', 'a11y-size']);
  // The same recording judged against the other phase is wrong in exactly the values the Godot-side input changed.
  const wrongPhase = checkElements(recorded, 0, geometry);
  assert.ok(wrongPhase.some(failure => failure.startsWith('a11y-volume-thumb: AXValue is 80, expected 30')), wrongPhase.join('\n'));
});
