import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LongPress, dragTarget, grabOffset, menuActions, placeMenu, type Edge, type MenuAction, type Point, type Timers,
} from '../demo/src/editor/touch-selection';
import {
  HANDLE_BALL_RADIUS_PX, MENU_EDGE_MARGIN_PX, MENU_GAP_PX, MENU_HEIGHT_PX, MENU_ITEM_PADDING_PX, TOUCH_SELECT_HOLD_MS, TOUCH_SLOP_PX,
} from '../src/touch-selection';

/** A clock the test turns by hand: a timer fires when `advance` passes its time. */
class ManualTimers implements Timers<number> {
  now = 0;
  private next = 1;
  private readonly timers = new Map<number, { at: number; callback: () => void }>();

  set(callback: () => void, ms: number): number {
    const handle = this.next;
    this.next += 1;
    this.timers.set(handle, { at: this.now + ms, callback });
    return handle;
  }

  clear(handle: number): void {
    this.timers.delete(handle);
  }

  advance(ms: number): void {
    this.now += ms;
    for (const [handle, timer] of [...this.timers]) {
      if (timer.at <= this.now) {
        this.timers.delete(handle);
        timer.callback();
      }
    }
  }

  get pending(): number {
    return this.timers.size;
  }
}

function hold() {
  const timers = new ManualTimers();
  const holds: Array<{ pointerId: number; origin: Point }> = [];
  const press = new LongPress<number>(timers, (pointerId, origin) => { holds.push({ pointerId, origin }); });
  return { timers, holds, press };
}

test('a finger held still for the long press time is a hold, once', () => {
  const { timers, holds, press } = hold();
  press.start(2, { x: 10, y: 20 });
  assert.equal(press.waiting, true);
  timers.advance(TOUCH_SELECT_HOLD_MS - 1);
  assert.deepEqual(holds, []);
  timers.advance(1);
  assert.deepEqual(holds, [{ pointerId: 2, origin: { x: 10, y: 20 } }]);
  assert.equal(press.waiting, false);
  timers.advance(TOUCH_SELECT_HOLD_MS * 2);
  assert.equal(holds.length, 1);
});

test('a finger that leaves the slop, lifts or is cancelled is not a hold', () => {
  const left = hold();
  left.press.start(2, { x: 10, y: 20 });
  left.press.moved(2, { x: 10 + TOUCH_SLOP_PX, y: 20 });
  assert.equal(left.press.waiting, true, 'the slop itself is still holding');
  left.press.moved(2, { x: 10 + TOUCH_SLOP_PX + 1, y: 20 });
  assert.equal(left.press.waiting, false);
  assert.equal(left.timers.pending, 0, 'and its timer is gone');
  left.timers.advance(TOUCH_SELECT_HOLD_MS);
  assert.deepEqual(left.holds, []);

  const lifted = hold();
  lifted.press.start(2, { x: 0, y: 0 });
  lifted.press.end(2);
  lifted.timers.advance(TOUCH_SELECT_HOLD_MS);
  assert.deepEqual(lifted.holds, []);
});

test('another finger neither moves nor ends the hold, and a new press replaces it', () => {
  const { timers, holds, press } = hold();
  press.start(2, { x: 0, y: 0 });
  press.moved(3, { x: 500, y: 500 });
  press.end(3);
  assert.equal(press.waiting, true);
  press.start(4, { x: 5, y: 5 });
  assert.equal(timers.pending, 1, 'one timer: the first was cleared');
  timers.advance(TOUCH_SELECT_HOLD_MS);
  assert.deepEqual(holds, [{ pointerId: 4, origin: { x: 5, y: 5 } }]);
});

const EDGE: Edge = { x: 100, top: 40, bottom: 56 };

test('a dragged handle keeps its distance from the finger', () => {
  const grab = grabOffset(EDGE, { x: 103, y: 70 });
  assert.deepEqual(grab, { x: -3, y: -22 });
  assert.deepEqual(dragTarget({ x: 103, y: 70 }, grab), { x: 100, y: 48 }, 'no jump when the finger has not moved');
  assert.deepEqual(dragTarget({ x: 150, y: 90 }, grab), { x: 147, y: 68 });
});

test('the menu offers what the selection allows, in the platforms\' order', () => {
  assert.deepEqual(menuActions({ editable: true, hasSelection: true, allSelected: false }), ['cut', 'copy', 'paste', 'selectAll']);
  assert.deepEqual(menuActions({ editable: false, hasSelection: true, allSelected: false }), ['copy', 'selectAll']);
  assert.deepEqual(menuActions({ editable: true, hasSelection: true, allSelected: true }), ['cut', 'copy', 'paste']);
  assert.deepEqual(menuActions({ editable: true, hasSelection: false, allSelected: false }), ['paste', 'selectAll']);
});

const BOUNDS = { x: 0, y: 0, width: 400, height: 800 };
const labels = (actions: MenuAction[]) => actions.map(action => ({ action, width: 40 }));

test('the menu goes above the start handle, centred on the ends, or below the end handle when there is no room', () => {
  const width = 2 * (40 + 2 * MENU_ITEM_PADDING_PX);
  const above = placeMenu(labels(['copy', 'selectAll']), [{ x: 100, top: 300, bottom: 320 }, { x: 200, top: 300, bottom: 320 }], BOUNDS);
  assert.ok(above);
  assert.equal(above.box.x, 150 - width / 2);
  assert.equal(above.box.y, 300 - 2 * HANDLE_BALL_RADIUS_PX - MENU_GAP_PX - MENU_HEIGHT_PX);
  assert.deepEqual(above.items.map(item => item.action), ['copy', 'selectAll']);
  const [first, second] = above.items;
  assert.ok(first && second);
  assert.equal(second.box.x, above.box.x + first.box.width, 'the segments tile the menu');
  const below = placeMenu(labels(['copy']), [{ x: 100, top: 10, bottom: 30 }], BOUNDS);
  assert.equal(below?.box.y, 30 + 2 * HANDLE_BALL_RADIUS_PX + MENU_GAP_PX);
});

test('the menu stays inside the editor with a margin, and a selection as tall as it gets the menu over it', () => {
  const left = placeMenu(labels(['copy', 'selectAll']), [{ x: 5, top: 300, bottom: 320 }], BOUNDS);
  assert.equal(left?.box.x, MENU_EDGE_MARGIN_PX);
  const right = placeMenu(labels(['copy', 'selectAll']), [{ x: 398, top: 300, bottom: 320 }], BOUNDS);
  assert.equal((right?.box.x ?? 0) + (right?.box.width ?? 0), BOUNDS.width - MENU_EDGE_MARGIN_PX);
  const tall = placeMenu(labels(['copy']), [{ x: 100, top: 5, bottom: 795 }], BOUNDS);
  assert.equal(tall?.box.y, MENU_EDGE_MARGIN_PX);
  assert.equal(placeMenu([], [EDGE], BOUNDS), undefined);
  assert.equal(placeMenu(labels(['copy']), [], BOUNDS), undefined);
});
