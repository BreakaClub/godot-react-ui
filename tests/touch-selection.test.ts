import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { readTouchSelection } from '../src/native';
import * as shared from '../src/touch-selection';
import { createTestRoot, RecordingHost } from './recording-host';

const RECT = { x: 1, y: 2, width: 3, height: 4 };

/** What native answers for a document selection with both handles and a Copy and Select All menu. */
function chrome(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    owner: { kind: 'document' },
    gesture: 'idle',
    handles: [
      { end: 'start', stem: RECT, ball: { x: 10, y: 20, radius: 6 }, target: RECT },
      { end: 'end', stem: RECT, ball: { x: 30, y: 40, radius: 6 }, target: RECT },
    ],
    menu: {
      area: RECT,
      items: [
        { action: 'copy', label: 'Copy', rect: RECT },
        { action: 'selectAll', label: 'Select All', rect: RECT },
      ],
    },
    ...overrides,
  };
}

test('getTouchSelection is undefined with no chrome and reads the handles and the menu when there is some', () => {
  const host = new RecordingHost();
  const { root } = createTestRoot(host);
  assert.equal(root.getTouchSelection(), undefined);

  host.touchSelection = chrome();
  const shown = root.getTouchSelection();
  assert.ok(shown);
  assert.deepEqual(shown.owner, { kind: 'document' });
  assert.equal(shown.gesture, 'idle');
  assert.deepEqual(shown.handles.map((handle) => handle.end), ['start', 'end']);
  assert.deepEqual(shown.handles[1]?.ball, { x: 30, y: 40, radius: 6 });
  assert.deepEqual(shown.menu?.items.map((item) => item.action), ['copy', 'selectAll']);
  assert.deepEqual(shown.menu?.items[0]?.rect, RECT);

  host.touchSelection = chrome({ owner: { kind: 'input', tag: 7 }, gesture: 'handle', menu: null, handles: [] });
  assert.deepEqual(root.getTouchSelection(), { owner: { kind: 'input', tag: 7 }, gesture: 'handle', menu: null, handles: [] });
  assert.ok(host.calls.includes('getTouchSelection'));
});

test('a malformed touch selection from native is refused, not guessed at', () => {
  const host = new RecordingHost();
  const read = (value: unknown) => {
    host.touchSelection = value;
    return readTouchSelection(host);
  };
  assert.throws(() => read(chrome({ gesture: 'dragging' })), /touch selection\.gesture/);
  assert.throws(() => read(chrome({ owner: { kind: 'page' } })), /owner\.kind/);
  assert.throws(() => read(chrome({ owner: { kind: 'input' } })), /owner\.tag/);
  assert.throws(() => read(chrome({ handles: [{ end: 'middle', stem: RECT, ball: { x: 0, y: 0, radius: 1 }, target: RECT }] })), /handles\[0\]\.end/);
  assert.throws(() => read(chrome({ menu: { area: RECT, items: [{ action: 'share', label: 'Share', rect: RECT }] } })), /items\[0\]\.action/);
  assert.throws(() => read(chrome({ handles: 'none' })), /handles/);
  assert.throws(() => read(chrome({ menu: { area: { x: 'left', y: 0, width: 1, height: 1 }, items: [] } })), /menu\.area\.x/);
});

// The code editor draws handles and a menu of its own (demo/src/editor/view/touch-chrome.tsx) from `src/touch-selection.ts`. They must be
// the root's: a number changed in the Rust file and not here would make the two disagree about what a long press is.

const native = (file: string): string => readFileSync(resolve(__dirname, '..', 'native', file), 'utf8');

function rustNumber(source: string, name: string): number {
  const match = new RegExp(`const ${name}: (?:f32|f64|i32) = (-?[0-9.]+);`).exec(source);
  assert.ok(match?.[1] !== undefined, `native has a number named ${name}`);
  return Number(match[1]);
}

function rustString(source: string, name: string): string {
  const match = new RegExp(`const ${name}: &str = "([^"]*)";`).exec(source);
  assert.ok(match?.[1] !== undefined, `native has a string named ${name}`);
  return match[1];
}

test('the editor\'s touch selection numbers are the root\'s', () => {
  const model = native('touch_selection.rs');
  for (const name of [
    'TOUCH_SELECT_HOLD_MS', 'HANDLE_STEM_WIDTH_PX', 'HANDLE_BALL_RADIUS_PX', 'HANDLE_TOUCH_TARGET_PX', 'MENU_HEIGHT_PX', 'MENU_ITEM_PADDING_PX',
    'MENU_RADIUS_PX', 'MENU_GAP_PX', 'MENU_EDGE_MARGIN_PX', 'MENU_FONT_SIZE_PX',
  ] as const) {
    assert.equal(shared[name], rustNumber(model, name), name);
  }
  assert.equal(shared.TOUCH_SLOP_PX, rustNumber(native('scroll.rs'), 'TOUCH_SLOP_PX'));
  const chrome = native('touch_selection_input.rs');
  assert.equal(shared.HANDLE_RING_WIDTH_PX, rustNumber(chrome, 'HANDLE_RING_WIDTH_PX'));
  for (const [name, value] of [
    ['MENU_BACKGROUND', shared.MENU_BACKGROUND], ['MENU_LABEL', shared.MENU_LABEL], ['MENU_PRESSED', shared.MENU_PRESSED], ['MENU_DIVIDER', shared.MENU_DIVIDER],
  ] as const) {
    assert.equal(value, rustString(chrome, name), name);
  }
  // The handles are the default selection colour, opaque.
  assert.equal(`${shared.HANDLE_COLOR}59`, rustString(native('text_input_godot.rs'), 'DEFAULT_SELECTION_COLOR'));
});
