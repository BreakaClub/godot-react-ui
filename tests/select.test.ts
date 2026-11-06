import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { createElement as h, createRef, useState, type ReactNode } from 'react';
import { Select, type UIHandle } from '../src';
import { edgeEnabled, stepEnabled, typeAheadMatch, TYPE_AHEAD_RESET_MS } from '../src/kit/listbox';
import { placePopover } from '../src/kit/popover-position';
import { KitHost } from './kit-host';
import { createTestRoot, isRecord } from './recording-host';

// ---------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------

type Root = ReturnType<typeof createTestRoot>['root'];

interface Mounted {
  readonly host: KitHost;
  readonly root: Root;
  /** The native tag of the element with this `testID`; fails if there is none. */
  tag(testID: string): number;
  /** Whether an element with this `testID` is mounted. */
  has(testID: string): boolean;
  /** The native props of the element. */
  props(testID: string): Record<string, unknown>;
  /** The element's unconditional style layers, merged. */
  style(testID: string): Record<string, unknown>;
  /** The `testID`s of the elements of the overlay layer, in document order. */
  overlay(): string[];
}

function mount(element: ReactNode): Mounted {
  const host = new KitHost();
  const { root } = createTestRoot(host);
  root.render(element);
  const tag = (testID: string): number => {
    const found = root.findByTestID(testID);
    assert.ok(found, `no element with testID "${testID}"`);
    return found.id;
  };
  const props = (testID: string): Record<string, unknown> => {
    const node = host.nodes.get(tag(testID));
    assert.ok(node);
    return node.props;
  };
  return {
    host, root, tag, props,
    has: (testID) => root.findByTestID(testID) !== undefined,
    style: (testID) => {
      const style = props(testID).style;
      if (style === undefined) return {};
      assert.ok(isRecord(style) && Array.isArray(style.layers));
      const merged: Record<string, unknown> = {};
      for (const layer of style.layers) {
        assert.ok(isRecord(layer) && isRecord(layer.style));
        if (layer.states === undefined && layer.minWidth === undefined) Object.assign(merged, layer.style);
      }
      return merged;
    },
    overlay: () => {
      const names: string[] = [];
      const visit = (tag: number) => {
        const node = host.nodes.get(tag);
        assert.ok(node);
        if (typeof node.props.testID === 'string') names.push(node.props.testID);
        node.children.forEach(visit);
      };
      (host.layerRoots[1] ?? []).forEach(visit);
      return names;
    },
  };
}

function click(m: Mounted, testID: string): void {
  m.host.event(m.tag(testID), 'click');
  m.root.dispatchEvents();
}

function focus(m: Mounted, testID: string): void {
  assert.equal(m.host.focusNode(m.tag(testID), 1), '');
}

function focusedTestID(m: Mounted): string | undefined {
  const focused = m.host.focused;
  const id = focused === null ? undefined : m.host.nodes.get(focused)?.props.testID;
  return typeof id === 'string' ? id : undefined;
}

/** The text of a `Text` element; native is sent no `text` for an empty one. */
function textOf(m: Mounted, testID: string): unknown {
  return m.props(testID).text ?? '';
}

interface FruitSpec {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

const FRUITS: readonly FruitSpec[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'blueberry', label: 'Blueberry' },
  { value: 'cherry', label: 'Cherry', disabled: true },
  { value: 'date', label: 'Date' },
];

interface SelectOptions {
  readonly root?: Record<string, unknown>;
  readonly items?: readonly FruitSpec[];
  readonly content?: Record<string, unknown>;
  readonly trigger?: Record<string, unknown>;
}

/** A select whose parts all have a `testID`: `trigger`, `value`, `list`, `item-<value>` and `mark-<value>`. */
function fruitSelect(options: SelectOptions = {}): ReactNode {
  const items = options.items ?? FRUITS;
  return h(Select.Root, options.root ?? {},
    h(Select.Trigger, { testID: 'trigger', 'aria-label': 'Fruit', ...options.trigger },
      h(Select.Value, { testID: 'value', placeholder: 'Pick one' }), h(Select.Icon, { testID: 'icon' })),
    h(Select.Content, { testID: 'list', ...options.content },
      ...items.map((item) => h(Select.Item, {
        key: item.value, value: item.value, disabled: item.disabled, testID: `item-${item.value}`,
      }, h(Select.ItemText, { testID: `text-${item.value}` }, item.label), h(Select.ItemIndicator, { testID: `mark-${item.value}` })))));
}

/** A parent that owns the value, the way an app controls a select. */
function Controlled(props: { initial: string | null; seen: Array<string>; options?: SelectOptions }): ReactNode {
  const [value, setValue] = useState<string | null>(props.initial);
  return fruitSelect({
    ...props.options,
    root: { value, onValueChange: (next: string) => { props.seen.push(next); setValue(next); }, ...props.options?.root },
  });
}

/** The trigger and the list in the places layout would put them (the fake host does no layout). */
function lay(m: Mounted, rects: { trigger: { x: number; y: number; width: number; height: number }; list: { width: number; height: number } }): void {
  m.host.rectsByTestID.set('trigger', rects.trigger);
  m.host.rectsByTestID.set('list', { x: 0, y: 0, ...rects.list });
}

const TRIGGER_RECT = { x: 100, y: 100, width: 120, height: 30 };
const LIST_SIZE = { width: 90, height: 200 };

// ---------------------------------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------------------------------

const VIEWPORT = { width: 1000, height: 800 };
const GAP = 4;
const PADDING = 8;

test('placePopover opens under the anchor with the left edges aligned', () => {
  const placement = placePopover({
    anchor: { x: 100, y: 100, width: 120, height: 30 }, content: { width: 90, height: 200 }, viewport: VIEWPORT, gap: GAP, padding: PADDING,
  });
  assert.deepEqual(placement, { left: 100, top: 134, side: 'bottom' });
});

test('placePopover flips above when it does not fit below and there is more room above', () => {
  const input = { content: { width: 90, height: 200 }, viewport: VIEWPORT, gap: GAP, padding: PADDING };
  assert.deepEqual(placePopover({ ...input, anchor: { x: 100, y: 700, width: 120, height: 30 } }), { left: 100, top: 496, side: 'top' });
  // Just fits below: stays below.
  const bottom = VIEWPORT.height - PADDING - 200;
  assert.equal(placePopover({ ...input, anchor: { x: 100, y: bottom - GAP - 30, width: 120, height: 30 } }).side, 'bottom');
  assert.equal(placePopover({ ...input, anchor: { x: 100, y: bottom - GAP - 30 + 1, width: 120, height: 30 } }).side, 'top',
    'a pixel less room below flips it, there being more above');
});

test('placePopover stays below when neither side has room but below has more', () => {
  const placement = placePopover({
    anchor: { x: 100, y: 100, width: 120, height: 30 }, content: { width: 90, height: 900 }, viewport: VIEWPORT, gap: GAP, padding: PADDING,
  });
  assert.equal(placement.side, 'bottom', 'more room below than above');
  assert.equal(placement.top, PADDING, 'a popover taller than the viewport is pinned to the top edge and overflows the bottom');
});

test('placePopover clamps horizontally into the viewport', () => {
  const input = { content: { width: 300, height: 100 }, viewport: VIEWPORT, gap: GAP, padding: PADDING };
  assert.equal(placePopover({ ...input, anchor: { x: 900, y: 100, width: 100, height: 30 } }).left, 1000 - PADDING - 300, 'pushed in from the right');
  assert.equal(placePopover({ ...input, anchor: { x: -50, y: 100, width: 100, height: 30 } }).left, PADDING, 'and from the left');
  assert.equal(placePopover({ ...input, content: { width: 2000, height: 100 }, anchor: { x: 300, y: 100, width: 100, height: 30 } }).left, PADDING,
    'a popover wider than the viewport starts at the left edge');
});

test('stepEnabled steps over disabled items and stops at the ends', () => {
  const items = [{ disabled: true }, { disabled: false }, { disabled: true }, { disabled: false }, { disabled: true }];
  assert.equal(stepEnabled(items, 1, 1), 3, 'skips the disabled item between');
  assert.equal(stepEnabled(items, 3, 1), undefined, 'does not wrap at the end');
  assert.equal(stepEnabled(items, 3, -1), 1);
  assert.equal(stepEnabled(items, 1, -1), undefined, 'does not wrap at the start');
  assert.equal(stepEnabled(items, -1, 1), 1, 'with nothing focused, forward finds the first enabled item');
  assert.equal(stepEnabled(items, -1, -1), 3, 'and backward the last');
  assert.equal(stepEnabled([], -1, 1), undefined);
  assert.equal(edgeEnabled(items, 'first'), 1);
  assert.equal(edgeEnabled(items, 'last'), 3);
  assert.equal(edgeEnabled([{ disabled: true }], 'first'), undefined);
});

test('typeAheadMatch finds the next enabled item that starts with the search, wrapping and ignoring case', () => {
  const items = [
    { label: 'Apple', disabled: false }, { label: 'Banana', disabled: false }, { label: 'blueberry', disabled: false },
    { label: 'Blackberry', disabled: true }, { label: 'Date', disabled: false },
  ];
  assert.equal(typeAheadMatch(items, -1, 'b'), 1, 'nothing focused: the first match');
  assert.equal(typeAheadMatch(items, 1, 'b'), 2, 'one letter moves on from the current item');
  assert.equal(typeAheadMatch(items, 2, 'b'), 1, 'and wraps, skipping the disabled Blackberry');
  assert.equal(typeAheadMatch(items, 1, 'bb'), 2, 'a repeated letter is that letter');
  assert.equal(typeAheadMatch(items, 2, 'bl'), 2, 'a longer search may stay on the current item');
  assert.equal(typeAheadMatch(items, 1, 'bl'), 2, 'or move to the one that matches it');
  assert.equal(typeAheadMatch(items, 0, 'd'), 4);
  assert.equal(typeAheadMatch(items, 4, 'd'), undefined, 'the only match is the current item');
  assert.equal(typeAheadMatch(items, 0, 'z'), undefined);
  assert.equal(typeAheadMatch(items, 0, ''), undefined);
  assert.equal(typeAheadMatch(items, 0, 'blac'), undefined, 'a disabled item is never a match');
});

// ---------------------------------------------------------------------------------------------------
// Closed
// ---------------------------------------------------------------------------------------------------

test('Select closed: the trigger is a button, nothing is in the overlay layer, and no item takes part in layout', () => {
  const m = mount(fruitSelect());
  assert.equal(m.host.nodes.get(m.tag('trigger'))?.kind, 'button');
  assert.equal(m.host.layerRoots[1]?.length, 0, 'no overlay');
  assert.ok(!m.has('list') && !m.has('item-apple'), 'neither the list nor any item is mounted');
  assert.equal(m.props('trigger').disabled, undefined);
  m.root.unmount();
});

test('Select closed adds one hidden node to the main layer and nothing the user wrote inside the list', () => {
  const m = mount(h(Select.Root, null,
    h(Select.Trigger, { testID: 'trigger' }, h(Select.Value, null)),
    h(Select.Content, null, h('view', { testID: 'stray' }, h(Select.Item, { value: 'a' }, 'A')))));
  const hidden = [...m.host.nodes.values()].filter((node) => {
    const style = node.props.style;
    return isRecord(style) && Array.isArray(style.layers)
      && style.layers.some((layer) => isRecord(layer) && isRecord(layer.style) && layer.style.display === 'none');
  });
  assert.equal(hidden.length, 1, 'one collecting node, which takes no part in layout');
  assert.equal(hidden[0]?.children.length, 1, 'holding what the list\'s children rendered, which is not an item');
  m.root.unmount();
});

test('Select.Value shows the placeholder while nothing is selected, then the selected item\'s text, never opened', () => {
  const empty = mount(fruitSelect());
  assert.equal(textOf(empty, 'value'), 'Pick one');
  const chosen = mount(fruitSelect({ root: { defaultValue: 'banana' } }));
  assert.equal(textOf(chosen, 'value'), 'Banana', 'the text comes from the item, which only registered itself');
  assert.ok(!chosen.has('item-banana'));
  const unknown = mount(fruitSelect({ root: { value: 'kiwi' } }));
  assert.equal(textOf(unknown, 'value'), '', 'a value no item has is shown as nothing, not as its id');
  const none = mount(fruitSelect({ root: { value: null } }));
  assert.equal(textOf(none, 'value'), 'Pick one', 'null is a controlled select with nothing selected');
  for (const mounted of [empty, chosen, unknown, none]) mounted.root.unmount();
});

test('Select.Value takes its text from textValue, string children and Select.ItemText, in that order of preference', () => {
  const m = mount(h(Select.Root, { value: 'c' },
    h(Select.Trigger, { testID: 'trigger' }, h(Select.Value, { testID: 'value' })),
    h(Select.Content, null,
      h(Select.Item, { value: 'a', textValue: 'Explicit' }, h(Select.ItemText, null, 'Ignored')),
      h(Select.Item, { value: 'b' }, 'Plain ', 3),
      h(Select.Item, { value: 'c' }, h(Select.ItemText, null, 'Nested'), h(Select.ItemText, null, ' text')))));
  assert.equal(textOf(m, 'value'), 'Nested text');
  m.root.render(h(Select.Root, { value: 'a' },
    h(Select.Trigger, { testID: 'trigger' }, h(Select.Value, { testID: 'value' })),
    h(Select.Content, null, h(Select.Item, { value: 'a', textValue: 'Explicit' }, h(Select.ItemText, null, 'Ignored')))));
  assert.equal(textOf(m, 'value'), 'Explicit');
  m.root.render(h(Select.Root, { value: 'b' },
    h(Select.Trigger, { testID: 'trigger' }, h(Select.Value, { testID: 'value' })),
    h(Select.Content, null, h(Select.Item, { value: 'b' }, 'Plain ', 3))));
  assert.equal(textOf(m, 'value'), 'Plain 3');
  m.root.render(h(Select.Root, { value: 'b' },
    h(Select.Trigger, { testID: 'trigger' }, h(Select.Value, { testID: 'value' })),
    h(Select.Content, null, h(Select.Item, { value: 'b' }, h('view', null)))));
  assert.equal(textOf(m, 'value'), 'b', 'an item with no text is named by its value');
  m.root.unmount();
});

test('Select.Value children replace the item\'s text', () => {
  const m = mount(h(Select.Root, { defaultValue: 'a' },
    h(Select.Trigger, { testID: 'trigger' }, h(Select.Value, { testID: 'value' }, 'Custom')),
    h(Select.Content, null, h(Select.Item, { value: 'a' }, 'Alpha'))));
  assert.equal(textOf(m, 'value'), 'Custom');
  m.root.unmount();
});

// ---------------------------------------------------------------------------------------------------
// Opening and choosing with the pointer
// ---------------------------------------------------------------------------------------------------

test('Select: pressing the trigger opens the list in the overlay layer, backdrop first, and focuses the selected item', () => {
  const m = mount(fruitSelect({ root: { defaultValue: 'banana' } }));
  click(m, 'trigger');
  assert.deepEqual(m.overlay().filter((id) => id === 'list-backdrop' || id === 'list'), ['list-backdrop', 'list'],
    'the backdrop is under the list');
  assert.equal(m.host.nodes.get(m.tag('list'))?.layer, 1);
  for (const value of ['apple', 'banana', 'blueberry', 'cherry', 'date']) {
    assert.equal(m.host.nodes.get(m.tag(`item-${value}`))?.layer, 1, `${value} is in the overlay layer`);
    assert.equal(m.host.nodes.get(m.tag(`item-${value}`))?.kind, 'button');
    assert.equal(m.props(`item-${value}`).tabIndex, -1, `${value} is not a tab stop`);
  }
  assert.equal(focusedTestID(m), 'item-banana', 'focus moves to the selected item');
  assert.equal(m.props('item-cherry').disabled, undefined, 'a disabled item is not disabled natively (see Select.Item)');
  m.root.unmount();
});

test('Select: with nothing selected, or a selected item that is disabled, focus goes to the first enabled item', () => {
  const none = mount(fruitSelect());
  click(none, 'trigger');
  assert.equal(focusedTestID(none), 'item-apple');
  const disabledSelected = mount(fruitSelect({ root: { defaultValue: 'cherry' }, items: [{ value: 'cherry', label: 'Cherry', disabled: true }, ...FRUITS.slice(0, 2)] }));
  click(disabledSelected, 'trigger');
  assert.equal(focusedTestID(disabledSelected), 'item-apple', 'a disabled item cannot take focus, so the first enabled one does');
  none.root.unmount();
  disabledSelected.root.unmount();
});

test('Select: a list with no enabled item takes focus itself, so Escape still has somewhere to go', () => {
  const m = mount(fruitSelect({ items: [{ value: 'a', label: 'A', disabled: true }] }));
  click(m, 'trigger');
  assert.equal(focusedTestID(m), 'list');
  assert.equal(m.props('list').tabIndex, -1, 'focusable, but not a tab stop');
  assert.equal(m.host.pressKey(m.root, 'Escape').prevented, true);
  assert.ok(!m.has('list'));
  m.root.unmount();
});

test('Select: pressing an item chooses it, reports it once, closes the list and gives focus back to the trigger', () => {
  const changes: string[] = [];
  const opens: boolean[] = [];
  const m = mount(fruitSelect({ root: { onValueChange: (v: string) => changes.push(v), onOpenChange: (o: boolean) => opens.push(o) } }));
  click(m, 'trigger');
  click(m, 'item-banana');
  assert.deepEqual(changes, ['banana']);
  assert.deepEqual(opens, [true, false]);
  assert.ok(!m.has('list') && !m.has('list-backdrop') && !m.has('item-banana'), 'the list is gone');
  assert.equal(m.host.focused, m.tag('trigger'), 'focus is back on the trigger');
  assert.equal(textOf(m, 'value'), 'Banana');
  click(m, 'trigger');
  assert.equal(focusedTestID(m), 'item-banana', 'the next opening starts on the chosen item');
  assert.equal(m.host.nodes.get(m.tag('mark-banana'))?.kind, 'view', 'and only it shows an indicator');
  assert.ok(!m.has('mark-apple') && !m.has('mark-blueberry'));
  click(m, 'item-banana');
  assert.deepEqual(changes, ['banana'], 'choosing the selected item again is no change');
  assert.deepEqual(opens, [true, false, true, false]);
  m.root.unmount();
});

test('Select: pressing the backdrop closes the list, changes nothing and focuses the trigger', () => {
  const changes: string[] = [];
  const m = mount(fruitSelect({ root: { defaultValue: 'apple', onValueChange: (v: string) => changes.push(v) } }));
  click(m, 'trigger');
  click(m, 'list-backdrop');
  assert.ok(!m.has('list'));
  assert.deepEqual(changes, []);
  assert.equal(m.host.focused, m.tag('trigger'));
  m.root.unmount();
});

test('Select: pressing a disabled item is the list\'s press, so focus stays in the list', () => {
  const m = mount(fruitSelect({ root: { defaultValue: 'apple' } }));
  click(m, 'trigger');
  m.host.pointer(m.root, 'pointerdown', { x: 5, y: 5 }, { over: m.tag('item-cherry') });
  assert.equal(m.host.wasPrevented(m.host.resolutions.at(-1)?.seq ?? -1), true,
    'native sends the press (the item is not disabled natively) and the list prevents its default, which would clear focus');
  assert.equal(focusedTestID(m), 'item-apple');
  m.root.unmount();
});

test('Select: a pointer entering an item focuses it without a ring, and a disabled item takes nothing', () => {
  const m = mount(fruitSelect({ root: { defaultValue: 'apple' } }));
  click(m, 'trigger');
  m.host.event(m.tag('item-blueberry'), 'pointerenter');
  m.root.dispatchEvents();
  assert.equal(focusedTestID(m), 'item-blueberry');
  assert.equal(m.host.focusRequests.at(-1)?.focusVisible, 0, 'focus() with focusVisible false: the highlight, not the keyboard ring');
  const requests = m.host.focusRequests.length;
  m.host.event(m.tag('item-cherry'), 'pointerenter');
  m.root.dispatchEvents();
  assert.equal(m.host.focusRequests.length, requests, 'a disabled item is not asked to focus');
  assert.equal(focusedTestID(m), 'item-blueberry');
  click(m, 'item-cherry');
  assert.ok(m.has('list'), 'and it cannot be chosen: the list stays open');
  assert.equal(m.host.focused, m.tag('item-blueberry'));
  m.root.unmount();
});

test('Select: a press on the list is not allowed to take focus out of it', () => {
  const m = mount(fruitSelect());
  click(m, 'trigger');
  m.host.pointer(m.root, 'pointerdown', { x: 5, y: 5 }, { over: m.tag('list') });
  const press = m.host.wasPrevented(m.host.resolutions.at(-1)?.seq ?? -1);
  assert.equal(press, true, 'the default of a press, which clears focus on something that takes none, is prevented');
  m.root.unmount();
});

// ---------------------------------------------------------------------------------------------------
// Keyboard
// ---------------------------------------------------------------------------------------------------

test('Select trigger: ArrowDown and ArrowUp open the list and are prevented; Enter and Space open it through the button', () => {
  for (const key of ['ArrowDown', 'ArrowUp']) {
    const m = mount(fruitSelect());
    focus(m, 'trigger');
    assert.equal(m.host.pressKey(m.root, key).prevented, true, `${key} is the trigger's`);
    assert.ok(m.has('list'), `${key} opens the list`);
    m.root.unmount();
  }
  for (const key of ['Enter', ' ']) {
    const m = mount(fruitSelect());
    focus(m, 'trigger');
    assert.equal(m.host.pressKey(m.root, key).prevented, false, `${key} is left to the button`);
    assert.ok(m.has('list'), `${key} opens the list through the button's click`);
    m.root.unmount();
  }
});

test('Select trigger: other keys, and arrows with Ctrl, Alt or Meta, are not its own', () => {
  const m = mount(fruitSelect());
  focus(m, 'trigger');
  for (const init of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }]) {
    assert.equal(m.host.pressKey(m.root, 'ArrowDown', init).prevented, false);
  }
  assert.equal(m.host.pressKey(m.root, 'ArrowLeft').prevented, false);
  assert.equal(m.host.pressKey(m.root, 'a').prevented, false);
  assert.ok(!m.has('list'));
  m.root.unmount();
});

test('Select list: arrows move focus without wrapping and skip disabled items; every handled key is prevented', () => {
  const changes: string[] = [];
  const m = mount(fruitSelect({ root: { defaultValue: 'apple', onValueChange: (v: string) => changes.push(v) } }));
  click(m, 'trigger');
  const visited: Array<string | undefined> = [];
  const prevented: boolean[] = [];
  for (const key of ['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowUp']) {
    prevented.push(m.host.pressKey(m.root, key).prevented);
    visited.push(focusedTestID(m));
  }
  assert.deepEqual(visited, [
    'item-banana', 'item-blueberry', 'item-date', 'item-date', 'item-blueberry', 'item-banana', 'item-apple', 'item-apple',
  ], 'cherry is skipped both ways and neither end wraps');
  assert.ok(prevented.every(Boolean));
  assert.deepEqual(changes, [], 'moving does not choose');
  m.root.unmount();
});

test('Select list: Home and End jump to the first and last enabled items', () => {
  const m = mount(fruitSelect({ items: [{ value: 'z', label: 'Z', disabled: true }, ...FRUITS, { value: 'y', label: 'Y', disabled: true }], root: { defaultValue: 'banana' } }));
  click(m, 'trigger');
  assert.equal(m.host.pressKey(m.root, 'End').prevented, true);
  assert.equal(focusedTestID(m), 'item-date', 'the disabled last item is not the end');
  assert.equal(m.host.pressKey(m.root, 'Home').prevented, true);
  assert.equal(focusedTestID(m), 'item-apple');
  m.root.unmount();
});

test('Select list: Enter and Space choose the focused item through the button, and Enter on a moved focus chooses that one', () => {
  for (const key of ['Enter', ' ']) {
    const changes: string[] = [];
    const m = mount(fruitSelect({ root: { onValueChange: (v: string) => changes.push(v) } }));
    focus(m, 'trigger');
    m.host.pressKey(m.root, 'ArrowDown');
    m.host.pressKey(m.root, 'ArrowDown');
    assert.equal(focusedTestID(m), 'item-banana');
    const press = m.host.pressKey(m.root, key);
    assert.equal(press.prevented, false, `${key} is the button's, not the list's`);
    assert.deepEqual(changes, ['banana'], `${key} chose the focused item`);
    assert.ok(!m.has('list'));
    assert.equal(m.host.focused, m.tag('trigger'));
    m.root.unmount();
  }
});

test('Select list: Escape closes without choosing and gives focus back to the trigger', () => {
  const changes: string[] = [];
  const m = mount(fruitSelect({ root: { defaultValue: 'apple', onValueChange: (v: string) => changes.push(v) } }));
  focus(m, 'trigger');
  m.host.pressKey(m.root, 'ArrowDown');
  m.host.pressKey(m.root, 'ArrowDown');
  assert.equal(m.host.pressKey(m.root, 'Escape').prevented, true);
  assert.ok(!m.has('list'));
  assert.deepEqual(changes, []);
  assert.equal(m.host.focused, m.tag('trigger'));
  assert.equal(textOf(m, 'value'), 'Apple');
  m.root.unmount();
});

test('Select list: Tab chooses the focused item, closes, focuses the trigger and is left to native to move on', () => {
  const changes: string[] = [];
  const m = mount(fruitSelect({ root: { onValueChange: (v: string) => changes.push(v) } }));
  focus(m, 'trigger');
  m.host.pressKey(m.root, 'ArrowDown');
  m.host.pressKey(m.root, 'ArrowDown');
  assert.equal(m.host.pressKey(m.root, 'Tab').prevented, false, 'native moves on from the trigger');
  assert.deepEqual(changes, ['banana']);
  assert.ok(!m.has('list'));
  assert.equal(m.host.focused, m.tag('trigger'));
  m.root.unmount();
});

test('Select list: Tab with the list itself focused closes without choosing', () => {
  const changes: string[] = [];
  const m = mount(fruitSelect({ items: [{ value: 'a', label: 'A', disabled: true }], root: { onValueChange: (v: string) => changes.push(v) } }));
  click(m, 'trigger');
  m.host.pressKey(m.root, 'Tab');
  assert.deepEqual(changes, []);
  assert.ok(!m.has('list'));
  m.root.unmount();
});

test('Select list ignores chords with Ctrl, Alt or Meta, and keys that are nobody\'s', () => {
  const m = mount(fruitSelect({ root: { defaultValue: 'apple' } }));
  click(m, 'trigger');
  for (const init of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }]) {
    assert.equal(m.host.pressKey(m.root, 'ArrowDown', init).prevented, false);
    assert.equal(m.host.pressKey(m.root, 'Escape', init).prevented, false);
  }
  assert.equal(focusedTestID(m), 'item-apple');
  assert.ok(m.has('list'));
  assert.equal(m.host.pressKey(m.root, 'F5').prevented, false, 'a named key with no meaning here is left alone');
  assert.equal(m.host.pressKey(m.root, 'ArrowLeft').prevented, false);
  m.root.unmount();
});

test('Select list ignores keys while an IME composes', () => {
  const m = mount(fruitSelect({ root: { defaultValue: 'apple' } }));
  click(m, 'trigger');
  const down = m.host.keyEvent(m.host.focused ?? 0, 'keydown', { key: 'ArrowDown', code: 'ArrowDown', isComposing: true });
  m.host.events.push(down);
  m.root.dispatchEvents();
  assert.equal(m.host.wasPrevented(down.seq), false);
  assert.equal(focusedTestID(m), 'item-apple');
  m.root.unmount();
});

// ---------------------------------------------------------------------------------------------------
// Type-ahead
// ---------------------------------------------------------------------------------------------------

test('Select type-ahead: letters move to the next item that starts with them, and are the list\'s (prevented)', () => {
  const changes: string[] = [];
  const m = mount(fruitSelect({ root: { defaultValue: 'apple', onValueChange: (v: string) => changes.push(v) } }));
  click(m, 'trigger');
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    assert.equal(m.host.pressKey(m.root, 'b').prevented, true, 'a letter is the list\'s, not the game\'s');
    assert.equal(focusedTestID(m), 'item-banana');
    mock.timers.tick(TYPE_AHEAD_RESET_MS);
    m.host.pressKey(m.root, 'b');
    assert.equal(focusedTestID(m), 'item-blueberry', 'the same letter after a pause walks on');
    mock.timers.tick(TYPE_AHEAD_RESET_MS);
    m.host.pressKey(m.root, 'D');
    assert.equal(focusedTestID(m), 'item-date', 'case is ignored');
    mock.timers.tick(TYPE_AHEAD_RESET_MS);
    m.host.pressKey(m.root, 'z');
    assert.equal(focusedTestID(m), 'item-date', 'no match leaves focus where it is');
  } finally {
    mock.timers.reset();
  }
  assert.deepEqual(changes, [], 'searching does not choose');
  m.root.unmount();
});

test('Select type-ahead: letters typed within the pause make one search, and the pause ends it', () => {
  const m = mount(fruitSelect({ root: { defaultValue: 'apple' } }));
  click(m, 'trigger');
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    m.host.pressKey(m.root, 'b');
    mock.timers.tick(TYPE_AHEAD_RESET_MS - 1);
    m.host.pressKey(m.root, 'l');
    assert.equal(focusedTestID(m), 'item-blueberry', '"bl" is blueberry; banana does not match it');
    mock.timers.tick(TYPE_AHEAD_RESET_MS - 1);
    m.host.pressKey(m.root, 'u');
    assert.equal(focusedTestID(m), 'item-blueberry', 'the timer restarts with each letter: "blu" is still the search');
    mock.timers.tick(TYPE_AHEAD_RESET_MS);
    m.host.pressKey(m.root, 'b');
    assert.equal(focusedTestID(m), 'item-banana', 'after the pause "b" is a new search: from blueberry it wraps round to banana');
  } finally {
    mock.timers.reset();
  }
  m.root.unmount();
});

test('Select type-ahead: a space continues a word being typed, and otherwise chooses as the button does', () => {
  const changes: string[] = [];
  const items: readonly FruitSpec[] = [{ value: 'ice', label: 'Ice cream' }, { value: 'icy', label: 'Icy pole' }, { value: 'tea', label: 'Tea' }];
  const m = mount(fruitSelect({ items, root: { onValueChange: (v: string) => changes.push(v) } }));
  click(m, 'trigger');
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    for (const key of ['i', 'c', 'e']) m.host.pressKey(m.root, key);
    assert.equal(focusedTestID(m), 'item-ice');
    const space = m.host.pressKey(m.root, ' ');
    assert.equal(space.prevented, true, 'a space in a word is not a button press');
    assert.deepEqual(changes, []);
    m.host.pressKey(m.root, 'c');
    assert.equal(focusedTestID(m), 'item-ice', '"ice c" is Ice cream');
    mock.timers.tick(TYPE_AHEAD_RESET_MS);
    m.host.pressKey(m.root, ' ');
    assert.deepEqual(changes, ['ice'], 'with no word being typed a space chooses the focused item');
  } finally {
    mock.timers.reset();
  }
  m.root.unmount();
});

test('Select type-ahead cancels its pending reset when the list goes', () => {
  const m = mount(fruitSelect());
  click(m, 'trigger');
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    m.host.pressKey(m.root, 'b');
    const cancel = mock.method(globalThis, 'clearTimeout');
    m.host.pressKey(m.root, 'Escape');
    assert.ok(!m.has('list'));
    m.root.unmount();
    assert.equal(cancel.mock.callCount(), 1, 'the reset that was still pending was cleared with the list');
    cancel.mock.restore();
  } finally {
    mock.timers.reset();
  }
});

// ---------------------------------------------------------------------------------------------------
// Controlled and uncontrolled
// ---------------------------------------------------------------------------------------------------

test('Select controlled value: the parent decides and a declined change leaves the value', () => {
  const m = mount(fruitSelect({ root: { value: 'apple', onValueChange: () => {} } }));
  click(m, 'trigger');
  click(m, 'item-banana');
  assert.equal(textOf(m, 'value'), 'Apple', 'the parent did not accept the change');
  click(m, 'trigger');
  assert.equal(focusedTestID(m), 'item-apple');
  m.root.unmount();
});

test('Select controlled by a parent that accepts: the value follows and each change is reported once', () => {
  const seen: string[] = [];
  const m = mount(h(Controlled, { initial: 'apple', seen }));
  click(m, 'trigger');
  click(m, 'item-date');
  assert.deepEqual(seen, ['date']);
  assert.equal(textOf(m, 'value'), 'Date');
  m.root.unmount();
});

test('Select controlled open: the list is open when the parent says so and the parent can decline closing', () => {
  const opens: boolean[] = [];
  const m = mount(fruitSelect({ root: { open: true, onOpenChange: (o: boolean) => opens.push(o) } }));
  assert.ok(m.has('list'), 'open from the first render');
  assert.equal(focusedTestID(m), 'item-apple');
  m.host.pressKey(m.root, 'Escape');
  assert.deepEqual(opens, [false], 'Escape asked to close');
  assert.ok(m.has('list'), 'and the parent kept it open');
  m.root.render(fruitSelect({ root: { open: false, onOpenChange: (o: boolean) => opens.push(o) } }));
  assert.ok(!m.has('list'), 'the parent closed it');
  m.root.unmount();
});

test('Select defaultOpen opens it uncontrolled', () => {
  const m = mount(fruitSelect({ root: { defaultOpen: true } }));
  assert.ok(m.has('list'));
  assert.equal(focusedTestID(m), 'item-apple');
  m.host.pressKey(m.root, 'Escape');
  assert.ok(!m.has('list'));
  m.root.unmount();
});

test('Select disabled: native is told, a press does not open it, and Escape on a disabled select that was open closes it', () => {
  const m = mount(fruitSelect({ root: { disabled: true } }));
  assert.equal(m.props('trigger').disabled, true);
  click(m, 'trigger');
  assert.ok(!m.has('list'));
  assert.notEqual(m.host.focusNode(m.tag('trigger'), 1), '', 'and it cannot take focus');
  m.root.unmount();

  const open = mount(fruitSelect({ root: { disabled: true, defaultOpen: true } }));
  assert.ok(open.has('list'), 'open and disabled together');
  open.host.pressKey(open.root, 'Escape');
  assert.ok(!open.has('list'), 'closing a disabled select must not try to focus its trigger');
  open.root.unmount();
});

test('Select tolerates a change of the items while it is open: an inserted item is walked where it is shown', () => {
  const m = mount(fruitSelect({ root: { defaultValue: 'apple' }, items: [FRUITS[0] as FruitSpec, FRUITS[1] as FruitSpec] }));
  click(m, 'trigger');
  m.root.render(fruitSelect({
    root: { defaultValue: 'apple' },
    items: [FRUITS[0] as FruitSpec, { value: 'avocado', label: 'Avocado' }, FRUITS[1] as FruitSpec],
  }));
  m.host.pressKey(m.root, 'ArrowDown');
  assert.equal(focusedTestID(m), 'item-avocado', 'between apple and banana, though it mounted last');
  m.root.render(fruitSelect({
    root: { defaultValue: 'apple' },
    items: [FRUITS[1] as FruitSpec, { value: 'avocado', label: 'Avocado' }, FRUITS[0] as FruitSpec],
  }));
  m.host.pressKey(m.root, 'Home');
  assert.equal(focusedTestID(m), 'item-banana', 'after a reorder Home is the item shown first');
  m.host.pressKey(m.root, 'End');
  assert.equal(focusedTestID(m), 'item-apple');
  m.root.unmount();
});

test('Select: an item that appears or disappears while closed changes the text Value shows', () => {
  const m = mount(fruitSelect({ root: { value: 'kiwi' } }));
  assert.equal(textOf(m, 'value'), '');
  m.root.render(fruitSelect({ root: { value: 'kiwi' }, items: [...FRUITS, { value: 'kiwi', label: 'Kiwi' }] }));
  assert.equal(textOf(m, 'value'), 'Kiwi', 'the item arrived');
  m.root.render(fruitSelect({ root: { value: 'kiwi' }, items: FRUITS }));
  assert.equal(textOf(m, 'value'), '', 'and left');
  m.root.unmount();
});

// ---------------------------------------------------------------------------------------------------
// Placement
// ---------------------------------------------------------------------------------------------------

test('Select places the list under the trigger, as wide as the trigger at least, in the second pass', () => {
  const m = mount(fruitSelect());
  lay(m, { trigger: TRIGGER_RECT, list: LIST_SIZE });
  click(m, 'trigger');
  const style = m.style('list');
  assert.equal(style.left, 100);
  assert.equal(style.top, 134, 'under the trigger, 4 px below its bottom edge');
  assert.equal(style.minWidth, 120, 'at least as wide as the trigger');
  assert.equal(style.position, 'absolute');
  m.root.unmount();
});

test('Select flips above the trigger when there is not room below, and honours sideOffset and collisionPadding', () => {
  const m = mount(fruitSelect({ content: { sideOffset: 10, collisionPadding: 20 } }));
  lay(m, { trigger: { x: 100, y: 700, width: 120, height: 30 }, list: LIST_SIZE });
  click(m, 'trigger');
  assert.equal(m.style('list').top, 700 - 10 - 200, 'above, 10 px clear of the trigger');
  m.root.unmount();

  const low = mount(fruitSelect({ content: { collisionPadding: 20 } }));
  lay(low, { trigger: { x: 980, y: 100, width: 100, height: 30 }, list: { width: 300, height: 100 } });
  click(low, 'trigger');
  assert.equal(low.style('list').left, 1024 - 20 - 300, 'kept 20 px inside the right edge of the 1024 px root');
  low.root.unmount();
});

test('Select closes when the root is resized while it is open, and watches the root only while open', () => {
  const m = mount(fruitSelect({ root: { defaultValue: 'apple' } }));
  lay(m, { trigger: { x: 100, y: 500, width: 120, height: 30 }, list: LIST_SIZE });
  const closed = m.host.calls.length;
  m.host.resize(1024, 700);
  m.root.dispatchEvents();
  assert.ok(!m.host.callsSince(closed).includes('getSize'), 'a closed select does not watch the root');

  click(m, 'trigger');
  assert.ok(m.has('list'));
  m.root.dispatchEvents();
  assert.ok(m.has('list'), 'a frame in which the size did not change leaves it open');
  m.host.resize(1024, 600);
  m.root.dispatchEvents();
  assert.ok(!m.has('list'), 'a resize closes it: it was placed for the old size');
  assert.equal(m.host.focused, m.tag('trigger'), 'and gives the trigger focus back');
  assert.equal(textOf(m, 'value'), 'Apple', 'without choosing anything');
  const after = m.host.calls.length;
  m.host.resize(1024, 500);
  m.root.dispatchEvents();
  assert.ok(!m.host.callsSince(after).includes('getSize'), 'once closed it stops watching');
  m.root.unmount();
});

test('Select list takes className and style after its defaults, and the ref is the list\'s handle', () => {
  const ref = createRef<UIHandle>();
  const m = mount(h(Select.Root, { defaultOpen: true },
    h(Select.Trigger, { testID: 'trigger', className: 'bg-rose-500', style: { height: 44 } }, h(Select.Value, null)),
    h(Select.Content, { ref, testID: 'list', className: 'bg-amber-50', style: { width: 222 } }, h(Select.Item, { value: 'a' }, 'A'))));
  assert.equal(ref.current?.id, m.tag('list'));
  assert.equal(m.style('list').backgroundColor, '#fffbeb', 'the caller\'s colour wins over the default white');
  assert.equal(m.style('list').width, 222);
  assert.equal(m.style('trigger').backgroundColor, '#f43f5e');
  assert.equal(m.style('trigger').height, 44);
  m.root.unmount();
});

// ---------------------------------------------------------------------------------------------------
// Errors and ARIA
// ---------------------------------------------------------------------------------------------------

test('Select parts outside their parents are errors that name the part', () => {
  assert.throws(() => mount(h(Select.Trigger, null)), /<Select\.Trigger> must be rendered inside <Select\.Root>/);
  assert.throws(() => mount(h(Select.Value, null)), /<Select\.Value> must be rendered inside <Select\.Root>/);
  assert.throws(() => mount(h(Select.Content, null)), /<Select\.Content> must be rendered inside <Select\.Root>/);
  assert.throws(() => mount(h(Select.Item, { value: 'a' })), /<Select\.Item> must be rendered inside <Select\.Root>/);
  assert.throws(() => mount(h(Select.Root, null, h(Select.Item, { value: 'a' }))), /<Select\.Item> must be rendered inside <Select\.Content>/);
  assert.throws(() => mount(h(Select.Root, null, h(Select.Content, null, h(Select.ItemText, null, 'x')))),
    /<Select\.ItemText> must be rendered inside <Select\.Item>/);
});

test('Select without a trigger cannot place its list and says so', () => {
  assert.throws(
    () => mount(h(Select.Root, { defaultOpen: true }, h(Select.Content, null, h(Select.Item, { value: 'a' }, 'A')))),
    /needs a mounted <Select\.Trigger>/,
  );
});

/** The `role` and `aria*` fields among the native props an element was sent. */
function ariaOf(m: Mounted, testID: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(m.props(testID)).filter(([key]) => key === 'role' || key.startsWith('aria')));
}

test('Select sends role combobox with ariaExpanded, role listbox, and role option with ariaSelected', () => {
  const render = (open: boolean) => fruitSelect({ root: { value: 'banana', open, onOpenChange: () => {} } });
  const m = mount(render(false));
  assert.deepEqual(ariaOf(m, 'trigger'), { role: 'combobox', ariaExpanded: false, ariaLabel: 'Fruit' });
  m.root.unmount();

  const open = mount(render(true));
  assert.deepEqual(ariaOf(open, 'trigger'), { role: 'combobox', ariaExpanded: true, ariaLabel: 'Fruit' });
  assert.deepEqual(ariaOf(open, 'list'), { role: 'listbox' });
  // A false `aria-disabled` is absent natively (a boolean whose default is false is sent only when true).
  assert.deepEqual(ariaOf(open, 'item-apple'), { role: 'option', ariaSelected: false });
  assert.deepEqual(ariaOf(open, 'item-banana'), { role: 'option', ariaSelected: true });
  assert.deepEqual(ariaOf(open, 'item-cherry'), { role: 'option', ariaSelected: false, ariaDisabled: true });
  open.root.unmount();
});

test('Select passes the caller\'s aria props to the trigger and the list, and its own role and state win', () => {
  const m = mount(h(Select.Root, { defaultOpen: true },
    h(Select.Trigger, { testID: 'trigger', 'aria-label': 'Size', 'aria-description': 'Pick a size' }, h(Select.Value, null)),
    h(Select.Content, { testID: 'list', 'aria-label': 'Sizes' }, h(Select.Item, { value: 's', testID: 's', 'aria-label': 'Small' }, 'S'))));
  assert.equal(ariaOf(m, 'trigger').ariaLabel, 'Size');
  assert.equal(ariaOf(m, 'trigger').ariaDescription, 'Pick a size');
  assert.equal(ariaOf(m, 'list').ariaLabel, 'Sizes');
  assert.equal(ariaOf(m, 's').ariaLabel, 'Small');
  m.root.unmount();
});
