import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { createElement as h, createRef, useState, type ReactNode } from 'react';
import {
  Button, Checkbox, RadioGroup, Slider, Switch, Text, View, type CheckedState, type UIHandle, type UIProps,
} from '../src';
import { adjacentEnabledIndex, arrowDirection } from '../src/kit/radio-group';
import {
  PAGE_STEPS, clampToBounds, fractionAtPointer, fractionOf, sliderBounds, snapToStep, valueAtFraction,
  valueForAccessibilityAction, valueForKey,
} from '../src/kit/slider-math';
import { useControllableState } from '../src/kit/use-controllable-state';
import { NATIVE_PROP_KEYS, nativeProps } from '../src/props';
import { KitHost } from './kit-host';
import { createTestRoot, isRecord } from './recording-host';

// ---------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------

type Root = ReturnType<typeof createTestRoot>['root'];

interface Mounted {
  readonly host: KitHost;
  readonly root: Root;
  /** The native tag of the element with this `testID`. */
  tag(testID: string): number;
  /** What native knows of it, merged from its unconditional style layers (states and breakpoints are not in play). */
  style(testID: string): Record<string, unknown>;
  styleOfTag(tag: number): Record<string, unknown>;
  /** The children of any node, by tag. */
  childrenOfTag(tag: number): readonly number[];
  /** The native props of the element. */
  props(testID: string): Record<string, unknown>;
  children(testID: string): readonly number[];
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
  const styleOfTag = (target: number): Record<string, unknown> => {
    const style = host.nodes.get(target)?.props.style;
    if (style === undefined) return {};
    assert.ok(isRecord(style) && Array.isArray(style.layers));
    const merged: Record<string, unknown> = {};
    for (const layer of style.layers) {
      assert.ok(isRecord(layer) && isRecord(layer.style));
      if (layer.states === undefined && layer.minWidth === undefined) Object.assign(merged, layer.style);
    }
    return merged;
  };
  const childrenOfTag = (target: number): readonly number[] => host.nodes.get(target)?.children ?? [];
  return {
    host, root, tag, props, styleOfTag, childrenOfTag,
    style: (testID) => styleOfTag(tag(testID)),
    children: (testID) => childrenOfTag(tag(testID)),
  };
}

/** Let React's scheduler run what a continuous event (a pointer move) left pending. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 10));
}

function click(m: Mounted, testID: string): void {
  m.host.event(m.tag(testID), 'click');
  m.root.dispatchEvents();
}

function focus(m: Mounted, testID: string): void {
  assert.equal(m.host.focusNode(m.tag(testID), 1), '');
}

/** A state-owning parent, the way an app would control a kit component. */
function Controlled<T>(props: { initial: T; render: (value: T, set: (next: T) => void) => ReactNode }): ReactNode {
  const [value, setValue] = useState<T>(props.initial);
  return props.render(value, setValue);
}

/** The `role` and `aria*` fields among a node's native props. */
function ariaPropsOf(props: Record<string, unknown> | undefined): Record<string, unknown> {
  assert.ok(props !== undefined, 'the node is mounted');
  const aria: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key === 'role' || key.startsWith('aria')) aria[key] = value;
  }
  return aria;
}

// ---------------------------------------------------------------------------------------------------
// ARIA props
// ---------------------------------------------------------------------------------------------------

test('role and aria props are typed on every element and cross to native as the camelCase fields', () => {
  const aria: UIProps = {
    role: 'checkbox', 'aria-label': 'Sound', 'aria-description': 'Turns the sound on', 'aria-valuetext': 'loud',
    'aria-placeholder': 'none', 'aria-hidden': false, 'aria-disabled': false, 'aria-expanded': false,
    'aria-selected': false, 'aria-readonly': false, 'aria-required': true, 'aria-modal': false,
    'aria-checked': 'mixed', 'aria-valuemin': 0, 'aria-valuemax': 10, 'aria-valuenow': 3, 'aria-live': 'polite',
    'aria-orientation': 'vertical',
  };
  // A false whose default is false is absent; `aria-expanded` and `aria-selected` keep their false.
  const expected = {
    role: 'checkbox', ariaLabel: 'Sound', ariaDescription: 'Turns the sound on', ariaValueText: 'loud',
    ariaPlaceholder: 'none', ariaExpanded: false, ariaSelected: false, ariaRequired: true, ariaChecked: 'mixed',
    ariaValueMin: 0, ariaValueMax: 10, ariaValueNow: 3, ariaLive: 'polite', ariaOrientation: 'vertical',
  };
  for (const kind of ['view', 'text', 'button'] as const) {
    assert.deepEqual(nativeProps(kind, aria, false), expected, `${kind} sends role and aria props`);
  }
  for (const key of Object.keys(expected)) {
    assert.ok((NATIVE_PROP_KEYS as readonly string[]).includes(key), `${key} is a native prop`);
  }

  const host = new KitHost();
  const { root } = createTestRoot(host);
  root.render(h(View, { testID: 'view', ...aria }, h(Button, { testID: 'button', ...aria }, 'ok')));
  for (const testID of ['view', 'button']) {
    const found = root.findByTestID(testID);
    assert.ok(found, testID);
    assert.deepEqual(ariaPropsOf(host.nodes.get(found.id)?.props), expected, `${testID} reached native with its aria props`);
  }
  const sent = new Set<string>();
  for (const { payload } of host.commits) {
    for (const entry of [...payload.created, ...payload.updated]) Object.keys(entry.props).forEach((key) => sent.add(key));
  }
  assert.ok(sent.size > 0);
  for (const key of sent) assert.ok((NATIVE_PROP_KEYS as readonly string[]).includes(key), `native received "${key}"`);
  root.unmount();
});

test('every kit component renders with only native props crossing to native', () => {
  const m = mount(h(View, null,
    h(Checkbox, { testID: 'checkbox', defaultChecked: 'indeterminate', 'aria-label': 'All' }, 'All'),
    h(Switch, { testID: 'switch', defaultChecked: true, 'aria-label': 'Sound' }),
    h(RadioGroup.Root, { testID: 'group', orientation: 'horizontal', 'aria-label': 'Size' },
      h(RadioGroup.Item, { value: 'a', testID: 'a' }, 'A')),
    h(Slider.Root, { testID: 'slider' },
      h(Slider.Track, null, h(Slider.Range), h(Slider.Thumb, { 'aria-label': 'Volume' })))));
  const sent = new Set<string>();
  for (const { payload } of m.host.commits) {
    for (const entry of [...payload.created, ...payload.updated]) Object.keys(entry.props).forEach((key) => sent.add(key));
  }
  for (const key of sent) assert.ok((NATIVE_PROP_KEYS as readonly string[]).includes(key), `native received "${key}"`);
  m.root.unmount();
});

// ---------------------------------------------------------------------------------------------------
// useControllableState
// ---------------------------------------------------------------------------------------------------

interface ProbeProps {
  readonly prop?: number;
  readonly defaultProp: number;
  readonly onChange?: (value: number) => void;
  /** Runs inside a click handler, with the hook's setter. */
  readonly action: (set: (value: number) => void) => void;
}

function Probe(props: ProbeProps): ReactNode {
  const [value, setValue] = useControllableState<number>({
    prop: props.prop, defaultProp: props.defaultProp, onChange: props.onChange, name: 'Probe',
  });
  return h(Button, { testID: 'go', onClick: () => props.action(setValue) }, h(Text, { testID: 'shown' }, String(value)));
}

test('an uncontrolled value is held by the hook, and each distinct change is reported once', () => {
  const changes: number[] = [];
  const m = mount(h(Probe, { defaultProp: 1, onChange: (v) => changes.push(v), action: (set) => { set(5); set(5); } }));
  assert.equal(m.props('shown').text, '1');
  click(m, 'go');
  assert.equal(m.props('shown').text, '5');
  assert.deepEqual(changes, [5], 'the repeat of 5 is not a change');
  m.root.unmount();
});

test('a controlled value is the parent\'s: the hook reports the request and renders what it is given', () => {
  const changes: number[] = [];
  const m = mount(h(Probe, { prop: 1, defaultProp: 99, onChange: (v) => changes.push(v), action: (set) => set(2) }));
  assert.equal(m.props('shown').text, '1', 'the controlled prop wins over defaultProp');
  click(m, 'go');
  assert.deepEqual(changes, [2]);
  assert.equal(m.props('shown').text, '1', 'a parent that does not accept the change keeps its value');
  m.root.unmount();
});

test('a change back to the rendered value within one batch is still a change', () => {
  // A drag delivers several pointer moves per render. 1 -> 2 -> 1 must end at 1, not stay at 2 because
  // the second request equals the value React last rendered.
  const changes: number[] = [];
  const m = mount(h(Probe, { defaultProp: 1, onChange: (v) => changes.push(v), action: (set) => { set(2); set(1); } }));
  click(m, 'go');
  assert.deepEqual(changes, [2, 1]);
  assert.equal(m.props('shown').text, '1');
  m.root.unmount();
});

test('a controlled parent that declines is asked again, but one batch does not repeat a request', () => {
  const changes: number[] = [];
  let presses = 0;
  const m = mount(h(Probe, {
    prop: 1, defaultProp: 1, onChange: (v) => changes.push(v),
    action: (set) => { presses += 1; set(2); set(2); },
  }));
  click(m, 'go');
  assert.deepEqual(changes, [2], 'the second request in the handler repeats the first');
  click(m, 'go');
  assert.deepEqual(changes, [2, 2], 'the parent still shows 1, so a later request for 2 is a new request');
  assert.equal(presses, 2);
  m.root.unmount();
});

test('switching between controlled and uncontrolled is reported', () => {
  const errors = mock.method(console, 'error', () => {});
  try {
    const m = mount(h(Probe, { prop: 1, defaultProp: 1, action: () => {} }));
    assert.equal(errors.mock.callCount(), 0);
    m.root.render(h(Probe, { defaultProp: 1, action: () => {} }));
    assert.equal(errors.mock.callCount(), 1);
    assert.match(String(errors.mock.calls[0]?.arguments[0]), /Probe changed from controlled to uncontrolled/);
    m.root.unmount();
  } finally {
    errors.mock.restore();
  }
});

// ---------------------------------------------------------------------------------------------------
// Checkbox
// ---------------------------------------------------------------------------------------------------

/** The box is the button's first child; its children are the mark, if any. */
function boxOf(m: Mounted, testID: string): number {
  const box = m.children(testID)[0];
  assert.ok(box !== undefined, `${testID} has no box`);
  return box;
}

function markOf(m: Mounted, testID: string): number | undefined {
  return m.childrenOfTag(boxOf(m, testID))[0];
}

test('Checkbox uncontrolled: a click toggles the mark and reports each new state', () => {
  const changes: boolean[] = [];
  const m = mount(h(Checkbox, { testID: 'cb', onCheckedChange: (checked) => changes.push(checked) }, 'Accept'));
  assert.equal(markOf(m, 'cb'), undefined, 'unchecked by default');
  click(m, 'cb');
  assert.notEqual(markOf(m, 'cb'), undefined);
  click(m, 'cb');
  assert.equal(markOf(m, 'cb'), undefined);
  assert.deepEqual(changes, [true, false]);
  m.root.unmount();
});

test('Checkbox defaultChecked starts it marked, and a bar marks indeterminate', () => {
  const checked = mount(h(Checkbox, { testID: 'cb', defaultChecked: true }));
  const mark = markOf(checked, 'cb');
  assert.ok(mark !== undefined);
  assert.deepEqual([checked.styleOfTag(mark).width, checked.styleOfTag(mark).height], [12, 12], 'a filled inner box');
  const mixed = mount(h(Checkbox, { testID: 'cb', defaultChecked: 'indeterminate' }));
  const bar = markOf(mixed, 'cb');
  assert.ok(bar !== undefined);
  assert.deepEqual([mixed.styleOfTag(bar).width, mixed.styleOfTag(bar).height], [12, 4], 'a bar');
  checked.root.unmount();
  mixed.root.unmount();
});

test('Checkbox: a click on an indeterminate box asks for checked', () => {
  const changes: boolean[] = [];
  const m = mount(h(Checkbox, { testID: 'cb', defaultChecked: 'indeterminate', onCheckedChange: (c) => changes.push(c) }));
  click(m, 'cb');
  assert.deepEqual(changes, [true]);
  assert.deepEqual([m.styleOfTag(markOf(m, 'cb') ?? -1).width, m.styleOfTag(markOf(m, 'cb') ?? -1).height], [12, 12]);
  m.root.unmount();
});

test('Checkbox controlled: the parent decides, and a declined change leaves the box as it was', () => {
  const changes: boolean[] = [];
  function Owner(): ReactNode {
    const [checked, setChecked] = useState<CheckedState>(false);
    return h(Checkbox, { testID: 'owned', checked, onCheckedChange: (next) => { changes.push(next); setChecked(next); } });
  }
  const owned = mount(h(Owner));
  click(owned, 'owned');
  assert.notEqual(markOf(owned, 'owned'), undefined);
  assert.deepEqual(changes, [true]);

  const declined: boolean[] = [];
  const fixed = mount(h(Checkbox, { testID: 'fixed', checked: false, onCheckedChange: (c) => declined.push(c) }));
  click(fixed, 'fixed');
  assert.deepEqual(declined, [true], 'the request is reported');
  assert.equal(markOf(fixed, 'fixed'), undefined, 'a controlled value only changes when the parent changes it');
  owned.root.unmount();
  fixed.root.unmount();
});

test('Checkbox: Space toggles once through the button\'s own activation, and Enter does not', () => {
  const changes: boolean[] = [];
  const m = mount(h(Checkbox, { testID: 'cb', onCheckedChange: (c) => changes.push(c) }));
  focus(m, 'cb');
  const space = m.host.pressKey(m.root, ' ');
  assert.deepEqual(changes, [true], 'Space toggled it once');
  assert.deepEqual(space, { prevented: false, upPrevented: false }, 'Space is left to the button; the key is consumed natively');
  const enter = m.host.pressKey(m.root, 'Enter');
  assert.deepEqual(changes, [true], 'Enter did not toggle it');
  assert.deepEqual(enter, { prevented: true, upPrevented: true }, 'Enter is prevented so the button does not activate');
  m.root.unmount();
});

test('Checkbox leaves every other key to native and the game', () => {
  const m = mount(h(Checkbox, { testID: 'cb' }));
  focus(m, 'cb');
  for (const key of ['Tab', 'a', 'ArrowRight', 'Escape']) {
    assert.deepEqual(m.host.pressKey(m.root, key), { prevented: false, upPrevented: false }, key);
  }
  assert.equal(markOf(m, 'cb'), undefined);
  m.root.unmount();
});

test('Checkbox disabled: native is told, it takes no focus, and a click changes nothing', () => {
  const changes: boolean[] = [];
  const m = mount(h(Checkbox, { testID: 'cb', disabled: true, onCheckedChange: (c) => changes.push(c) }));
  assert.equal(m.props('cb').disabled, true);
  assert.match(m.host.focusNode(m.tag('cb'), 1), /cannot take focus: it or an ancestor is disabled/);
  click(m, 'cb');
  assert.deepEqual(changes, []);
  assert.equal(markOf(m, 'cb'), undefined);
  m.root.unmount();
});

test('Checkbox: pressing its label toggles it, and the label is a text node of the button', () => {
  const changes: boolean[] = [];
  const m = mount(h(Checkbox, { testID: 'cb', onCheckedChange: (c) => changes.push(c) }, 'Accept the terms'));
  const label = m.children('cb')[1];
  assert.ok(label !== undefined);
  assert.equal(m.host.nodes.get(label)?.text, 'Accept the terms');
  m.host.event(label, 'click');
  m.root.dispatchEvents();
  assert.deepEqual(changes, [true]);
  m.root.unmount();
});

test('Checkbox parts take className and style after their defaults, and the ref is the button\'s handle', () => {
  const ref = createRef<UIHandle>();
  const m = mount(h(Checkbox, {
    ref, testID: 'cb', defaultChecked: true,
    className: 'bg-rose-500', style: { opacity: 0.25 },
    boxClassName: 'border-rose-500', boxStyle: { borderRadius: 1 },
    indicatorClassName: 'bg-emerald-500', indicatorStyle: { width: 9 },
  }));
  assert.equal(ref.current?.id, m.tag('cb'));
  assert.equal(m.style('cb').backgroundColor, '#f43f5e');
  assert.equal(m.style('cb').opacity, 0.25);
  const box = boxOf(m, 'cb');
  assert.equal(m.styleOfTag(box).borderColor, '#f43f5e', 'a caller class after the default class wins');
  assert.equal(m.styleOfTag(box).borderRadius, 1, 'inline style wins over the class');
  assert.equal(m.styleOfTag(box).width, 20, 'the rest of the default stays');
  const mark = markOf(m, 'cb');
  assert.ok(mark !== undefined);
  assert.equal(m.styleOfTag(mark).backgroundColor, '#10b981');
  assert.equal(m.styleOfTag(mark).width, 9);
  assert.equal(m.styleOfTag(mark).height, 12);
  m.root.unmount();
});

// ---------------------------------------------------------------------------------------------------
// Switch
// ---------------------------------------------------------------------------------------------------

function switchParts(m: Mounted, testID: string): { track: number; spacer: number; thumb: number } {
  const track = m.children(testID)[0];
  assert.ok(track !== undefined);
  const [spacer, thumb] = m.childrenOfTag(track);
  assert.ok(spacer !== undefined && thumb !== undefined, 'a track holds the spacer and the thumb');
  return { track, spacer, thumb };
}

test('Switch uncontrolled: a click moves the thumb by growing the spacer, and reports each state', () => {
  const changes: boolean[] = [];
  const m = mount(h(Switch, { testID: 'sw', onCheckedChange: (c) => changes.push(c) }));
  const { spacer, track } = switchParts(m, 'sw');
  assert.equal(m.styleOfTag(spacer).width, 0);
  assert.equal(m.styleOfTag(track).backgroundColor, '#cbd5e1');
  click(m, 'sw');
  assert.equal(m.styleOfTag(spacer).width, 20, 'the track is 44 wide, the thumb 20, and 2 either side are the inset');
  assert.equal(m.styleOfTag(track).backgroundColor, '#4f46e5');
  click(m, 'sw');
  assert.equal(m.styleOfTag(spacer).width, 0);
  assert.deepEqual(changes, [true, false]);
  m.root.unmount();
});

test('Switch animates the thumb with a width transition of the spacer and the track colour with its own', () => {
  const m = mount(h(Switch, { testID: 'sw' }));
  const { spacer, track, thumb } = switchParts(m, 'sw');
  assert.deepEqual(m.styleOfTag(spacer).transition, { properties: ['width'], durationMs: 150, easing: 'ease-out' });
  assert.deepEqual(m.styleOfTag(track).transition, { properties: ['backgroundColor'], durationMs: 150, easing: 'ease-out' });
  assert.equal(m.styleOfTag(thumb).transition, undefined, 'the thumb itself never animates');
  m.root.unmount();
});

test('Switch geometry comes from its props: the thumb travels trackWidth - thumbSize - 2 * thumbInset', () => {
  const m = mount(h(Switch, { testID: 'sw', defaultChecked: true, trackWidth: 60, thumbSize: 24, thumbInset: 4 }));
  const { spacer, track, thumb } = switchParts(m, 'sw');
  assert.equal(m.styleOfTag(spacer).width, 28);
  assert.deepEqual([m.styleOfTag(track).width, m.styleOfTag(track).height], [60, 32]);
  assert.deepEqual([m.styleOfTag(thumb).width, m.styleOfTag(thumb).height], [24, 24]);
  assert.equal(m.styleOfTag(track).paddingLeft, 4);
  m.root.unmount();
  assert.throws(() => mount(h(Switch, { trackWidth: 20, thumbSize: 20 })), /Switch trackWidth 20 is too narrow for a 20px thumb inset by 2px/);
});

test('Switch controlled: it shows what the parent says', () => {
  const requests: boolean[] = [];
  function Owner(): ReactNode {
    const [on, setOn] = useState(true);
    return h(Switch, { testID: 'sw', checked: on, onCheckedChange: (next) => { requests.push(next); setOn(next); } });
  }
  const owned = mount(h(Owner));
  click(owned, 'sw');
  assert.equal(owned.styleOfTag(switchParts(owned, 'sw').spacer).width, 0);
  assert.deepEqual(requests, [false]);
  const fixed = mount(h(Switch, { testID: 'fixed', checked: true, onCheckedChange: () => {} }));
  click(fixed, 'fixed');
  assert.equal(fixed.styleOfTag(switchParts(fixed, 'fixed').spacer).width, 20, 'declined');
  owned.root.unmount();
  fixed.root.unmount();
});

test('Switch: Space and Enter each toggle it once, as the button\'s activation keys', () => {
  const changes: boolean[] = [];
  const m = mount(h(Switch, { testID: 'sw', onCheckedChange: (c) => changes.push(c) }));
  focus(m, 'sw');
  assert.deepEqual(m.host.pressKey(m.root, ' '), { prevented: false, upPrevented: false });
  assert.deepEqual(changes, [true]);
  assert.deepEqual(m.host.pressKey(m.root, 'Enter'), { prevented: false, upPrevented: false });
  assert.deepEqual(changes, [true, false]);
  for (const key of ['Tab', 'a', 'ArrowLeft']) {
    assert.equal(m.host.pressKey(m.root, key).prevented, false, key);
  }
  assert.deepEqual(changes, [true, false], 'no other key toggles it');
  m.root.unmount();
});

test('Switch: a held key is one press, however many repeats arrive', () => {
  const changes: boolean[] = [];
  const m = mount(h(Switch, { testID: 'sw', onCheckedChange: (c) => changes.push(c) }));
  focus(m, 'sw');
  m.host.keyDown(m.root, ' ');
  m.host.keyDown(m.root, ' ', { repeat: true });
  m.host.keyDown(m.root, ' ', { repeat: true });
  m.host.keyUp(m.root, ' ');
  assert.deepEqual(changes, [true]);
  m.root.unmount();
});

test('Switch disabled: it takes no focus and a click changes nothing', () => {
  const changes: boolean[] = [];
  const m = mount(h(Switch, { testID: 'sw', disabled: true, onCheckedChange: (c) => changes.push(c) }));
  assert.equal(m.props('sw').disabled, true);
  assert.match(m.host.focusNode(m.tag('sw'), 1), /cannot take focus/);
  click(m, 'sw');
  assert.deepEqual(changes, []);
  assert.equal(m.styleOfTag(switchParts(m, 'sw').spacer).width, 0);
  m.root.unmount();
});

test('Switch parts take className and style after their defaults, and the ref is the button\'s handle', () => {
  const ref = createRef<UIHandle>();
  const m = mount(h(Switch, {
    ref, testID: 'sw', defaultChecked: true, className: 'opacity-75', style: { gap: 9 },
    trackClassName: 'bg-emerald-500', trackStyle: { borderRadius: 3 },
    thumbClassName: 'bg-amber-300', thumbStyle: { opacity: 0.5 },
  }, 'Sound'));
  assert.equal(ref.current?.id, m.tag('sw'));
  const { track, thumb } = switchParts(m, 'sw');
  assert.equal(m.style('sw').opacity, 0.75);
  assert.equal(m.style('sw').rowGap, 9);
  assert.equal(m.styleOfTag(track).backgroundColor, '#10b981', 'a caller class after the state class wins');
  assert.equal(m.styleOfTag(track).borderRadius, 3);
  assert.equal(m.styleOfTag(track).width, 44, 'the geometry stays');
  assert.equal(m.styleOfTag(thumb).backgroundColor, '#fcd34d');
  assert.equal(m.styleOfTag(thumb).opacity, 0.5);
  assert.equal(m.host.nodes.get(m.children('sw')[1] ?? -1)?.text, 'Sound', 'the label follows the track');
  m.root.unmount();
});

// ---------------------------------------------------------------------------------------------------
// RadioGroup
// ---------------------------------------------------------------------------------------------------

interface ItemSpec {
  readonly value: string;
  readonly disabled?: boolean;
}

const ABC: readonly ItemSpec[] = [{ value: 'a' }, { value: 'b' }, { value: 'c' }];

function radioGroup(items: readonly ItemSpec[] = ABC, rootProps: Record<string, unknown> = {}): ReactNode {
  return h(RadioGroup.Root, { testID: 'group', ...rootProps },
    ...items.map((item) => h(RadioGroup.Item, { key: item.value, testID: item.value, ...item }, item.value.toUpperCase())));
}

/** The `tabIndex` native has for each item. */
function tabIndexes(m: Mounted, values: readonly string[] = ['a', 'b', 'c']): unknown[] {
  return values.map((value) => m.props(value).tabIndex);
}

/** The values whose ring holds a dot. */
function selectedValues(m: Mounted, values: readonly string[] = ['a', 'b', 'c']): string[] {
  return values.filter((value) => m.childrenOfTag(boxOf(m, value)).length > 0);
}

test('RadioGroup uncontrolled: a click selects an item and reports it once; clicking it again is no change', () => {
  const changes: string[] = [];
  const m = mount(radioGroup(ABC, { onValueChange: (v: string) => changes.push(v) }));
  assert.deepEqual(selectedValues(m), []);
  click(m, 'b');
  assert.deepEqual(selectedValues(m), ['b']);
  click(m, 'b');
  click(m, 'c');
  assert.deepEqual(selectedValues(m), ['c'], 'only one item is ever selected');
  assert.deepEqual(changes, ['b', 'c']);
  m.root.unmount();
});

test('RadioGroup defaultValue starts selected, and a controlled value is the parent\'s', () => {
  const starting = mount(radioGroup(ABC, { defaultValue: 'c' }));
  assert.deepEqual(selectedValues(starting), ['c']);

  const requests: string[] = [];
  function Owner(): ReactNode {
    const [value, setValue] = useState<string | null>(null);
    return radioGroup(ABC, { value, onValueChange: (next: string) => { requests.push(next); setValue(next); } });
  }
  const owned = mount(h(Owner));
  assert.deepEqual(selectedValues(owned), [], 'null is a controlled group with nothing selected');
  click(owned, 'a');
  assert.deepEqual(selectedValues(owned), ['a']);

  const fixed = mount(radioGroup(ABC, { value: 'b', onValueChange: (next: string) => requests.push(`fixed:${next}`) }));
  click(fixed, 'c');
  assert.deepEqual(selectedValues(fixed), ['b'], 'a declined change leaves the selection');
  assert.deepEqual(requests, ['a', 'fixed:c']);
  starting.root.unmount();
  owned.root.unmount();
  fixed.root.unmount();
});

test('RadioGroup roving tabIndex: the selected item, else the first enabled one, is the only tab stop', () => {
  const none = mount(radioGroup());
  assert.deepEqual(tabIndexes(none), [0, -1, -1], 'nothing selected: the first');
  click(none, 'c');
  assert.deepEqual(tabIndexes(none), [-1, -1, 0], 'the tab stop follows the selection');

  const chosen = mount(radioGroup(ABC, { defaultValue: 'b' }));
  assert.deepEqual(tabIndexes(chosen), [-1, 0, -1]);

  const firstOff = mount(radioGroup([{ value: 'a', disabled: true }, { value: 'b' }, { value: 'c' }]));
  assert.deepEqual(tabIndexes(firstOff), [-1, 0, -1], 'a disabled first item cannot be the tab stop');

  const selectedOff = mount(radioGroup([{ value: 'a' }, { value: 'b', disabled: true }, { value: 'c' }], { defaultValue: 'b' }));
  assert.deepEqual(tabIndexes(selectedOff), [0, -1, -1], 'a disabled selected item falls back to the first enabled one');

  const allOff = mount(radioGroup(ABC, { disabled: true }));
  assert.deepEqual(tabIndexes(allOff), [-1, -1, -1]);
  for (const mounted of [none, chosen, firstOff, selectedOff, allOff]) mounted.root.unmount();
});

test('RadioGroup arrow keys move focus and selection together, forward on Down and Right, back on Up and Left', () => {
  const changes: string[] = [];
  const m = mount(radioGroup(ABC, { onValueChange: (v: string) => changes.push(v) }));
  focus(m, 'a');
  const presses = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].map((key) => m.host.pressKey(m.root, key));
  assert.deepEqual(presses.map((press) => press.prevented), [true, true, true, true], 'every handled key is prevented');
  assert.deepEqual(changes, ['b', 'c', 'b', 'a']);
  assert.equal(m.host.focused, m.tag('a'), 'focus ends where the selection is');
  assert.deepEqual(selectedValues(m), ['a']);
  assert.deepEqual(tabIndexes(m), [0, -1, -1]);
  const moved = m.host.focusRequests.filter((request) => request.focusVisible !== undefined).map((request) => request.tag);
  assert.deepEqual(moved, [m.tag('a'), m.tag('b'), m.tag('c'), m.tag('b'), m.tag('a')], 'each key called focus() on its target');
  assert.ok(m.host.focusRequests.slice(1).every((request) => request.focusVisible === -1), 'focus follows the input modality');
  m.root.unmount();
});

test('RadioGroup arrows wrap past either end and skip disabled items', () => {
  const m = mount(radioGroup([{ value: 'a' }, { value: 'b', disabled: true }, { value: 'c' }, { value: 'd', disabled: true }]));
  focus(m, 'a');
  m.host.pressKey(m.root, 'ArrowDown');
  assert.deepEqual(selectedValues(m, ['a', 'b', 'c', 'd']), ['c'], 'b is skipped');
  assert.equal(m.host.focused, m.tag('c'));
  m.host.pressKey(m.root, 'ArrowDown');
  assert.deepEqual(selectedValues(m, ['a', 'b', 'c', 'd']), ['a'], 'd is skipped and the end wraps to the start');
  m.host.pressKey(m.root, 'ArrowUp');
  assert.deepEqual(selectedValues(m, ['a', 'b', 'c', 'd']), ['c'], 'the start wraps to the end, past d');
  m.root.unmount();
});

test('RadioGroup with one enabled item stays on it', () => {
  const changes: string[] = [];
  const m = mount(radioGroup([{ value: 'a', disabled: true }, { value: 'b' }], { onValueChange: (v: string) => changes.push(v) }));
  focus(m, 'b');
  assert.equal(m.host.pressKey(m.root, 'ArrowDown').prevented, true, 'the key is still the group\'s');
  assert.deepEqual(changes, ['b']);
  assert.equal(m.host.focused, m.tag('b'));
  m.root.unmount();
});

test('RadioGroup orientation limits the arrow keys to its axis; unset uses all four', () => {
  const horizontal = mount(radioGroup(ABC, { orientation: 'horizontal' }));
  focus(horizontal, 'a');
  assert.equal(horizontal.host.pressKey(horizontal.root, 'ArrowDown').prevented, false);
  assert.equal(horizontal.host.pressKey(horizontal.root, 'ArrowUp').prevented, false);
  assert.deepEqual(selectedValues(horizontal), []);
  assert.equal(horizontal.host.pressKey(horizontal.root, 'ArrowRight').prevented, true);
  assert.deepEqual(selectedValues(horizontal), ['b']);

  const vertical = mount(radioGroup(ABC, { orientation: 'vertical' }));
  focus(vertical, 'a');
  assert.equal(vertical.host.pressKey(vertical.root, 'ArrowRight').prevented, false);
  assert.equal(vertical.host.pressKey(vertical.root, 'ArrowLeft').prevented, false);
  assert.deepEqual(selectedValues(vertical), []);
  assert.equal(vertical.host.pressKey(vertical.root, 'ArrowDown').prevented, true);
  assert.deepEqual(selectedValues(vertical), ['b']);
  horizontal.root.unmount();
  vertical.root.unmount();
});

test('RadioGroup ignores arrow chords with Ctrl, Alt or Meta, and every other key', () => {
  const m = mount(radioGroup());
  focus(m, 'a');
  for (const init of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }]) {
    assert.equal(m.host.pressKey(m.root, 'ArrowDown', init).prevented, false, JSON.stringify(init));
  }
  for (const key of ['Tab', 'a', 'Home', 'End', 'Escape', 'PageDown']) {
    assert.equal(m.host.pressKey(m.root, key).prevented, false, key);
  }
  assert.deepEqual(selectedValues(m), []);
  assert.equal(m.host.focused, m.tag('a'));
  m.root.unmount();
});

test('RadioGroup: Space selects the focused item through the button\'s activation, and Enter does not', () => {
  const changes: string[] = [];
  const m = mount(radioGroup(ABC, { onValueChange: (v: string) => changes.push(v) }));
  focus(m, 'b');
  assert.deepEqual(m.host.pressKey(m.root, ' '), { prevented: false, upPrevented: false });
  assert.deepEqual(changes, ['b']);
  focus(m, 'c');
  assert.deepEqual(m.host.pressKey(m.root, 'Enter'), { prevented: true, upPrevented: true });
  assert.deepEqual(changes, ['b'], 'Enter selected nothing');
  m.root.unmount();
});

test('RadioGroup disabled item and disabled group: native is told, nothing can focus or select them', () => {
  const changes: string[] = [];
  const m = mount(radioGroup([{ value: 'a' }, { value: 'b', disabled: true }], { onValueChange: (v: string) => changes.push(v) }));
  assert.equal(m.props('b').disabled, true);
  assert.match(m.host.focusNode(m.tag('b'), 1), /cannot take focus/);
  click(m, 'b');
  assert.equal(changes.length, 0);
  click(m, 'a');
  assert.deepEqual(changes, ['a']);

  const off = mount(radioGroup(ABC, { disabled: true, onValueChange: (v: string) => changes.push(v) }));
  assert.equal(off.props('group').disabled, true);
  assert.equal(off.props('a').disabled, true, 'every item is disabled too');
  click(off, 'a');
  assert.deepEqual(changes, ['a']);
  m.root.unmount();
  off.root.unmount();
});

test('RadioGroup follows its items: a removed item leaves the walk and the tab stop moves on', () => {
  const m = mount(radioGroup());
  focus(m, 'a');
  m.root.render(radioGroup([{ value: 'a' }, { value: 'c' }]));
  m.host.pressKey(m.root, 'ArrowDown');
  assert.deepEqual(selectedValues(m, ['a', 'c']), ['c'], 'b is gone');
  m.root.render(radioGroup([{ value: 'c' }]));
  assert.deepEqual(tabIndexes(m, ['c']), [0]);
  m.root.unmount();
});

test('RadioGroup changing an item\'s disabled prop changes the walk and the tab stop', () => {
  const m = mount(radioGroup());
  m.root.render(radioGroup([{ value: 'a', disabled: true }, { value: 'b' }, { value: 'c' }]));
  assert.deepEqual(tabIndexes(m), [-1, 0, -1]);
  focus(m, 'c');
  m.host.pressKey(m.root, 'ArrowDown');
  assert.deepEqual(selectedValues(m), ['b'], 'a is skipped now that it is disabled');
  m.root.unmount();
});

test('RadioGroup.Item outside a RadioGroup.Root is an error that names it', () => {
  assert.throws(() => mount(h(RadioGroup.Item, { value: 'a' })), /<RadioGroup\.Item> must be rendered inside <RadioGroup\.Root>/);
});

test('RadioGroup parts take className and style after their defaults, and the ref is the item\'s handle', () => {
  const ref = createRef<UIHandle>();
  const m = mount(h(RadioGroup.Root, { testID: 'group', className: 'gap-8', style: { opacity: 0.5 }, defaultValue: 'a' },
    h(RadioGroup.Item, {
      ref, value: 'a', testID: 'a', className: 'opacity-25', style: { rowGap: 3 },
      circleClassName: 'border-rose-500', circleStyle: { borderRadius: 2 },
      indicatorClassName: 'bg-amber-500', indicatorStyle: { width: 7 },
    }, 'A')));
  assert.equal(ref.current?.id, m.tag('a'));
  assert.equal(m.style('group').rowGap, 32, 'the caller\'s gap replaces the default');
  assert.equal(m.style('group').opacity, 0.5);
  assert.equal(m.style('a').opacity, 0.25);
  assert.equal(m.style('a').rowGap, 3);
  const circle = boxOf(m, 'a');
  assert.equal(m.styleOfTag(circle).borderColor, '#f43f5e');
  assert.equal(m.styleOfTag(circle).borderRadius, 2);
  const dot = m.childrenOfTag(circle)[0];
  assert.ok(dot !== undefined);
  assert.equal(m.styleOfTag(dot).backgroundColor, '#f59e0b');
  assert.equal(m.styleOfTag(dot).width, 7);
  assert.equal(m.styleOfTag(dot).height, 10);
  m.root.unmount();
});

test('arrowDirection maps keys to a direction within an orientation', () => {
  const table = (orientation: 'horizontal' | 'vertical' | undefined) =>
    ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'a'].map((key) => arrowDirection(key, orientation));
  assert.deepEqual(table(undefined), [1, -1, 1, -1, undefined, undefined]);
  assert.deepEqual(table('horizontal'), [1, -1, undefined, undefined, undefined, undefined]);
  assert.deepEqual(table('vertical'), [undefined, undefined, 1, -1, undefined, undefined]);
});

test('adjacentEnabledIndex wraps, skips disabled items, and finds itself when it is the only one enabled', () => {
  const items = (...flags: boolean[]) => flags.map((disabled) => ({ disabled }));
  assert.equal(adjacentEnabledIndex(items(false, false, false), 2, 1), 0);
  assert.equal(adjacentEnabledIndex(items(false, false, false), 0, -1), 2);
  assert.equal(adjacentEnabledIndex(items(false, true, false), 0, 1), 2);
  assert.equal(adjacentEnabledIndex(items(false, true, true), 0, 1), 0, 'a full circle ends on itself');
  assert.equal(adjacentEnabledIndex(items(true, true), 0, 1), undefined);
  assert.equal(adjacentEnabledIndex(items(), 0, 1), undefined);
});

// ---------------------------------------------------------------------------------------------------
// Slider math
// ---------------------------------------------------------------------------------------------------

test('sliderBounds validates its inputs and ends the slider on the last value of the grid', () => {
  assert.throws(() => sliderBounds(0, 10, 0), /step must be positive, not 0/);
  assert.throws(() => sliderBounds(0, 10, -1), /step must be positive/);
  assert.throws(() => sliderBounds(5, 5, 1), /max \(5\) must be greater than min \(5\)/);
  assert.throws(() => sliderBounds(0, 1, 2), /step 2 is larger than max - min \(1\)/);
  assert.throws(() => sliderBounds(0, Number.NaN, 1), /finite/);
  assert.throws(() => sliderBounds(0, Number.POSITIVE_INFINITY, 1), /finite/);
  assert.equal(sliderBounds(0, 10, 3).max, 9, 'the largest value of the grid at or below max');
  assert.equal(sliderBounds(1, 10, 2).max, 9, 'the grid starts at min');
  assert.equal(sliderBounds(0, 0.3, 0.1).max, 0.3, '0.3 / 0.1 is 2.9999999999999996 in floats and still three steps');
  assert.equal(sliderBounds(0, 100, 1).max, 100);
  assert.equal(sliderBounds(0, 1e-6, 1e-7).decimals, 7, 'exponent notation counts its digits');
  assert.equal(sliderBounds(0.05, 1, 0.1).decimals, 2, 'a fractional min needs its digits too');
});

test('snapToStep lands on the grid without float noise, clamps, and rounds an exact half up', () => {
  const tenths = sliderBounds(0, 1, 0.1);
  assert.equal(snapToStep(0.1 * 3, tenths), 0.3, '0.1 * 3 is 0.30000000000000004');
  assert.equal(snapToStep(-4, tenths), 0);
  assert.equal(snapToStep(7, tenths), 1);
  assert.equal(snapToStep(0.34, tenths), 0.3);
  assert.equal(snapToStep(0.36, tenths), 0.4);
  const offset = sliderBounds(1, 10, 2);
  // 2 is exactly half a step from both 1 and 3; the quotient is exact in floats, so it rounds up.
  assert.deepEqual([1, 2, 2.9, 3.9, 9.9].map((raw) => snapToStep(raw, offset)), [1, 3, 3, 3, 9]);
});

test('fractionOf, valueAtFraction and clampToBounds agree about where a value sits', () => {
  const bounds = sliderBounds(10, 20, 1);
  assert.equal(fractionOf(10, bounds), 0);
  assert.equal(fractionOf(15, bounds), 0.5);
  assert.equal(fractionOf(99, bounds), 1, 'a value past the end sits at the end');
  assert.equal(clampToBounds(99, bounds), 20);
  assert.equal(clampToBounds(12.5, bounds), 12.5, 'clamping does not snap');
  assert.equal(valueAtFraction(0.5, bounds), 15);
  assert.equal(valueAtFraction(-1, bounds), 10);
  assert.equal(valueAtFraction(2, bounds), 20);
});

test('valueForKey: arrows step, Page keys move ten steps, Home and End go to the ends', () => {
  const bounds = sliderBounds(0, 100, 2);
  const at = (key: string) => valueForKey(key, 50, bounds);
  assert.equal(PAGE_STEPS, 10);
  assert.deepEqual(
    ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].map(at),
    [52, 52, 48, 48, 70, 30, 0, 100],
  );
  assert.deepEqual(['Tab', 'a', ' ', 'Enter', 'Escape'].map(at), [undefined, undefined, undefined, undefined, undefined]);
  assert.equal(valueForKey('PageUp', 90, bounds), 100, 'clamped');
  assert.equal(valueForKey('ArrowLeft', 0, bounds), 0);
});

test('valueForAccessibilityAction: one step either way, or a number moved onto the grid and held to the ends', () => {
  const bounds = sliderBounds(1, 10, 3);
  assert.equal(bounds.max, 10, 'the grid is 1, 4, 7, 10');
  assert.equal(valueForAccessibilityAction('increment', undefined, 4, bounds), 7);
  assert.equal(valueForAccessibilityAction('decrement', undefined, 4, bounds), 1);
  assert.equal(valueForAccessibilityAction('decrement', undefined, 1, bounds), 1, 'clamped');
  assert.equal(valueForAccessibilityAction('increment', undefined, 10, bounds), 10);
  assert.equal(valueForAccessibilityAction('setValue', 5, 1, bounds), 4, 'nearest grid value');
  assert.equal(valueForAccessibilityAction('setValue', 6, 1, bounds), 7);
  assert.equal(valueForAccessibilityAction('setValue', -50, 4, bounds), 1);
  assert.equal(valueForAccessibilityAction('setValue', 50, 4, bounds), 10);
  assert.equal(valueForAccessibilityAction('setValue', 0, 4, sliderBounds(0, 1, 0.1)), 0, '0 is a number');
  assert.throws(() => valueForAccessibilityAction('setValue', undefined, 4, bounds), /needs a finite number/);
  assert.throws(() => valueForAccessibilityAction('setValue', Number.NaN, 4, bounds), /needs a finite number/);
});

test('fractionAtPointer puts the thumb\'s centre under the pointer and keeps the thumb inside the track', () => {
  const axis = { start: 100, length: 300, thumbLength: 20, reversed: false };
  assert.equal(fractionAtPointer(110, axis), 0, 'the thumb at the start has its centre half a thumb in');
  assert.equal(fractionAtPointer(250, axis), 0.5);
  assert.equal(fractionAtPointer(390, axis), 1);
  assert.equal(fractionAtPointer(-1000, axis), 0);
  assert.equal(fractionAtPointer(1000, axis), 1);
  const upward = { ...axis, reversed: true };
  assert.equal(fractionAtPointer(390, upward), 0, 'a vertical slider has its minimum at the far edge');
  assert.equal(fractionAtPointer(110, upward), 1);
  assert.equal(fractionAtPointer(250, upward), 0.5);
  assert.equal(fractionAtPointer(50, { start: 0, length: 20, thumbLength: 20, reversed: false }), 0, 'no travel, no movement');
});

// ---------------------------------------------------------------------------------------------------
// Slider
// ---------------------------------------------------------------------------------------------------

/** The layout the fake host reports: a 300 wide track at x 100 with a 20 wide thumb, so the thumb's centre travels 280. */
const TRACK_RECT = { x: 100, y: 10, width: 300, height: 6 };
const THUMB_RECT = { x: 100, y: 3, width: 20, height: 20 };
const TRACK_LEFT = TRACK_RECT.x;
const THUMB_HALF = THUMB_RECT.width / 2;
const TRAVEL = TRACK_RECT.width - THUMB_RECT.width;
const MIDLINE = 13;

/** The x at which a 0..100 slider's thumb centre is `percent` of the way along. */
function xAt(percent: number): number {
  return TRACK_LEFT + THUMB_HALF + (TRAVEL * percent) / 100;
}

interface SliderOptions {
  readonly root?: Record<string, unknown>;
  readonly thumb?: Record<string, unknown>;
}

function sliderElement(options: SliderOptions = {}): ReactNode {
  return h(Slider.Root, { testID: 'slider', ...options.root },
    h(Slider.Track, { testID: 'track' },
      h(Slider.Range, { testID: 'range' }),
      h(Slider.Thumb, { testID: 'thumb', 'aria-label': 'Volume', ...options.thumb })));
}

function mountSlider(options: SliderOptions = {}): Mounted {
  const m = mount(sliderElement(options));
  m.host.setRect(m.tag('track'), TRACK_RECT);
  m.host.setRect(m.tag('thumb'), THUMB_RECT);
  return m;
}

/** The share of the track the filled range and the remainder have been given. */
function growth(m: Mounted): { range: unknown; remainder: unknown } {
  const remainder = m.children('track').at(-1);
  assert.ok(remainder !== undefined);
  return { range: m.style('range').flexGrow, remainder: m.styleOfTag(remainder).flexGrow };
}

function press(m: Mounted, percent: number, init: { over?: number; pointerId?: number; pointerType?: 'mouse' | 'touch'; button?: number } = {}) {
  return m.host.pointer(m.root, 'pointerdown', { x: xAt(percent), y: MIDLINE }, { over: m.tag('track'), ...init });
}

test('Slider: pressing the track puts the thumb\'s centre under the pointer, captures it, focuses the thumb and prevents the default', async () => {
  const changes: number[] = [];
  const m = mountSlider({ root: { onValueChange: (v: number) => changes.push(v) } });
  const down = press(m, 25);
  assert.equal(down.prevented, true, 'native would otherwise move focus off the thumb');
  assert.deepEqual(changes, [25]);
  assert.equal(m.host.captures.get(1), m.tag('slider'), 'the root captured the pointer');
  assert.equal(m.host.focused, m.tag('thumb'));
  assert.deepEqual(growth(m), { range: 25, remainder: 75 });
  m.root.unmount();
});

test('Slider snaps pointer values to the step', () => {
  const changes: number[] = [];
  const m = mountSlider({ root: { step: 10, onValueChange: (v: number) => changes.push(v) } });
  press(m, 14);
  m.host.pointer(m.root, 'pointermove', { x: xAt(26), y: MIDLINE });
  m.host.pointer(m.root, 'pointermove', { x: xAt(44), y: MIDLINE });
  assert.deepEqual(changes, [10, 30, 40]);
  m.root.unmount();
});

test('Slider keeps following a captured pointer beyond either end of the track, clamped to the ends', async () => {
  const changes: number[] = [];
  const m = mountSlider({ root: { onValueChange: (v: number) => changes.push(v) } });
  press(m, 50);
  m.host.pointer(m.root, 'pointermove', { x: 5000, y: 4000 });
  assert.equal(m.host.captures.get(1), m.tag('slider'));
  m.host.pointer(m.root, 'pointermove', { x: -5000, y: -4000 });
  m.host.pointer(m.root, 'pointermove', { x: TRACK_LEFT + TRACK_RECT.width, y: MIDLINE });
  assert.deepEqual(changes, [50, 100, 0, 100], 'the track\'s far edge is past the thumb centre\'s last position');
  await settle();
  assert.deepEqual(growth(m), { range: 100, remainder: 0 });
  m.root.unmount();
});

test('Slider stops following when the pointer goes up, and reports the final value once', async () => {
  const changes: number[] = [];
  const commits: number[] = [];
  const m = mountSlider({ root: { onValueChange: (v: number) => changes.push(v), onValueCommit: (v: number) => commits.push(v) } });
  press(m, 20);
  m.host.pointer(m.root, 'pointermove', { x: xAt(60), y: MIDLINE });
  assert.deepEqual(commits, [], 'nothing is committed while the pointer is down');
  m.host.pointer(m.root, 'pointerup', { x: xAt(60), y: MIDLINE });
  assert.deepEqual(commits, [60]);
  assert.equal(m.host.captures.has(1), false, 'the capture ended with the press');
  // Hovering over the track afterwards reaches the root through the bubble phase and must do nothing.
  m.host.pointer(m.root, 'pointermove', { x: xAt(90), y: MIDLINE }, { over: m.tag('track') });
  assert.deepEqual(changes, [20, 60]);
  await settle();
  assert.deepEqual(growth(m), { range: 60, remainder: 40 });
  m.root.unmount();
});

test('Slider commits a cancelled drag at the value it reached, and nothing when it did not move', () => {
  const commits: number[] = [];
  const m = mountSlider({ root: { defaultValue: 40, onValueCommit: (v: number) => commits.push(v) } });
  press(m, 70);
  m.host.pointer(m.root, 'pointercancel', { x: xAt(70), y: MIDLINE });
  assert.deepEqual(commits, [70]);

  const still = mountSlider({ root: { defaultValue: 40, onValueCommit: (v: number) => commits.push(v) } });
  press(still, 40);
  still.host.pointer(still.root, 'pointerup', { x: xAt(40), y: MIDLINE });
  assert.deepEqual(commits, [70], 'a press that ends where it began is not a commit');
  m.root.unmount();
  still.root.unmount();
});

test('Slider takes touch the same way', () => {
  const changes: number[] = [];
  const m = mountSlider({ root: { onValueChange: (v: number) => changes.push(v) } });
  const touch = { pointerId: 3, pointerType: 'touch' as const };
  press(m, 30, touch);
  assert.equal(m.host.captures.get(3), m.tag('slider'));
  m.host.pointer(m.root, 'pointermove', { x: xAt(80), y: MIDLINE }, touch);
  m.host.pointer(m.root, 'pointerup', { x: xAt(80), y: MIDLINE }, touch);
  assert.deepEqual(changes, [30, 80]);
  m.root.unmount();
});

test('Slider: only the primary button starts a drag, and a second pointer is ignored while one drags', () => {
  const changes: number[] = [];
  const m = mountSlider({ root: { onValueChange: (v: number) => changes.push(v) } });
  const secondary = press(m, 30, { button: 2 });
  assert.equal(secondary.prevented, false, 'a secondary press is not the slider\'s');
  assert.equal(m.host.captures.size, 0);
  assert.equal(changes.length, 0);

  press(m, 30);
  press(m, 90, { pointerId: 2, pointerType: 'touch' });
  m.host.pointer(m.root, 'pointermove', { x: xAt(95), y: MIDLINE }, { over: m.tag('track'), pointerId: 2, pointerType: 'touch' });
  assert.deepEqual(changes, [30], 'the second pointer neither started a drag nor moved the first');
  assert.equal(m.host.captures.has(2), false);
  m.root.unmount();
});

test('Slider: grabbing the thumb does not move it, and the drag keeps the grab offset', () => {
  const changes: number[] = [];
  const m = mountSlider({ root: { defaultValue: 50, onValueChange: (v: number) => changes.push(v) } });
  m.host.setRect(m.tag('thumb'), { ...THUMB_RECT, x: xAt(50) - THUMB_HALF });
  // Grab 5px right of the thumb's centre.
  const down = m.host.pointer(m.root, 'pointerdown', { x: xAt(50) + 5, y: MIDLINE }, { over: m.tag('thumb') });
  assert.equal(down.prevented, true);
  assert.deepEqual(changes, [], 'a press on the thumb alone is no change');
  assert.equal(m.host.focused, m.tag('thumb'));
  // The thumb's centre follows the pointer minus the 5px offset: 28 px is 10 points of 280.
  m.host.pointer(m.root, 'pointermove', { x: xAt(50) + 5 + 28, y: MIDLINE });
  assert.deepEqual(changes, [60]);
  m.root.unmount();
});

test('Slider vertical: the minimum is at the bottom and the pointer\'s y decides', () => {
  const changes: number[] = [];
  const m = mount(sliderElement({ root: { orientation: 'vertical', onValueChange: (v: number) => changes.push(v) } }));
  const track = { x: 10, y: 100, width: 6, height: 300 };
  m.host.setRect(m.tag('track'), track);
  m.host.setRect(m.tag('thumb'), { x: 3, y: 380, width: 20, height: 20 });
  const yAt = (percent: number) => track.y + track.height - THUMB_HALF - (TRAVEL * percent) / 100;
  m.host.pointer(m.root, 'pointerdown', { x: 13, y: yAt(25) }, { over: m.tag('track') });
  m.host.pointer(m.root, 'pointermove', { x: 900, y: yAt(100) });
  m.host.pointer(m.root, 'pointermove', { x: 900, y: 5000 });
  assert.deepEqual(changes, [25, 100, 0]);
  assert.equal(m.style('slider').flexDirection, 'column');
  assert.equal(m.style('track').flexDirection, 'column-reverse', 'more is up');
  m.root.unmount();
});

test('Slider keeps the last of many pointer moves delivered between two renders, even when it is the rendered value', async () => {
  const changes: number[] = [];
  const m = mountSlider({ root: { onValueChange: (v: number) => changes.push(v) } });
  press(m, 30);
  const move = (percent: number) => m.host.pointerEvent(m.tag('slider'), 'pointermove', { x: xAt(percent), y: MIDLINE });
  // A drag delivers several moves per frame; React renders after all of them.
  m.host.events.push(move(60), move(30));
  m.root.dispatchEvents();
  await settle();
  assert.deepEqual(changes, [30, 60, 30]);
  assert.deepEqual(growth(m), { range: 30, remainder: 70 });
  m.root.unmount();
});

test('Slider controlled: the parent\'s value is shown, a declined change is not, and a value past an end sits at the end', async () => {
  const changes: number[] = [];
  const fixed = mountSlider({ root: { value: 40, onValueChange: (v: number) => changes.push(v) } });
  press(fixed, 90);
  assert.deepEqual(changes, [90]);
  assert.deepEqual(growth(fixed), { range: 40, remainder: 60 }, 'the parent did not accept it');

  function Owner(): ReactNode {
    const [value, setValue] = useState(10);
    return sliderElement({ root: { value, onValueChange: setValue } });
  }
  const owned = mount(h(Owner));
  owned.host.setRect(owned.tag('track'), TRACK_RECT);
  owned.host.setRect(owned.tag('thumb'), THUMB_RECT);
  press(owned, 70);
  assert.deepEqual(growth(owned), { range: 70, remainder: 30 });

  const beyond = mountSlider({ root: { value: 150 } });
  assert.deepEqual(growth(beyond), { range: 100, remainder: 0 });
  for (const mounted of [fixed, owned, beyond]) mounted.root.unmount();
});

test('Slider layout: the range and the remainder share the track in proportion and the thumb keeps its size', () => {
  const m = mountSlider({ root: { min: 10, max: 30, defaultValue: 15 } });
  assert.deepEqual(growth(m), { range: 25, remainder: 75 });
  const range = m.style('range');
  assert.deepEqual([range.flexBasis, range.flexShrink], [0, 0], 'the range has no size of its own');
  const remainder = m.styleOfTag(m.children('track').at(-1) ?? -1);
  assert.deepEqual([remainder.flexBasis, remainder.flexShrink], [0, 0]);
  const thumb = m.style('thumb');
  assert.deepEqual([thumb.width, thumb.height, thumb.flexShrink], [20, 20, 0], 'the thumb is fixed and never shrinks');
  assert.equal(m.children('track').length, 3, 'the track holds the range, the thumb and the remainder');
  assert.equal(m.children('track')[1], m.tag('thumb'));
  assert.equal(m.style('slider').flexDirection, 'row');
  m.root.unmount();
});

test('Slider keys: arrows step, Page keys move ten steps, Home and End go to the ends, and each is prevented', () => {
  const cases: ReadonlyArray<readonly [key: string, expected: number]> = [
    ['ArrowRight', 55], ['ArrowUp', 55], ['ArrowLeft', 45], ['ArrowDown', 45],
    ['PageUp', 100], ['PageDown', 0], ['Home', 0], ['End', 100],
  ];
  for (const [key, expected] of cases) {
    const changes: number[] = [];
    const commits: number[] = [];
    const m = mountSlider({
      root: { defaultValue: 50, step: 5, onValueChange: (v: number) => changes.push(v), onValueCommit: (v: number) => commits.push(v) },
    });
    focus(m, 'thumb');
    assert.equal(m.host.pressKey(m.root, key).prevented, true, `${key} is prevented`);
    assert.deepEqual(changes, [expected], key);
    assert.deepEqual(commits, [expected], `${key} commits`);
    m.root.unmount();
  }
});

test('Slider Page keys move ten steps and clamp to the ends', () => {
  const changes: number[] = [];
  const m = mountSlider({ root: { defaultValue: 50, step: 2, onValueChange: (v: number) => changes.push(v) } });
  focus(m, 'thumb');
  m.host.pressKey(m.root, 'PageUp');
  m.host.pressKey(m.root, 'PageUp');
  m.host.pressKey(m.root, 'PageUp');
  assert.deepEqual(changes, [70, 90, 100]);
  m.root.unmount();
});

test('Slider keys at an end are still the slider\'s but change and commit nothing', () => {
  const changes: number[] = [];
  const commits: number[] = [];
  const m = mountSlider({
    root: { defaultValue: 100, onValueChange: (v: number) => changes.push(v), onValueCommit: (v: number) => commits.push(v) },
  });
  focus(m, 'thumb');
  for (const key of ['ArrowRight', 'ArrowUp', 'PageUp', 'End']) {
    assert.equal(m.host.pressKey(m.root, key).prevented, true, key);
  }
  assert.equal(changes.length + commits.length, 0);
  m.root.unmount();
});

/** An assistive technology's action on the thumb, delivered the way native delivers it. */
function accessibilityAction(m: Mounted, action: 'increment' | 'decrement' | 'setValue', value: number | null = null): void {
  m.host.events.push(m.host.accessibilityActionEvent(m.tag('thumb'), action, value));
  m.root.dispatchEvents();
}

test('Slider accessibility actions: increment and decrement take one step, setValue snaps and clamps, each commits once', () => {
  const changes: number[] = [];
  const commits: number[] = [];
  const m = mountSlider({
    root: { defaultValue: 50, step: 5, onValueChange: (v: number) => changes.push(v), onValueCommit: (v: number) => commits.push(v) },
  });
  accessibilityAction(m, 'increment');
  accessibilityAction(m, 'decrement');
  accessibilityAction(m, 'decrement');
  accessibilityAction(m, 'setValue', 62);
  accessibilityAction(m, 'setValue', 1e6);
  accessibilityAction(m, 'setValue', -3);
  assert.deepEqual(changes, [55, 50, 45, 60, 100, 0]);
  assert.deepEqual(commits, changes, 'one commit per action, like a key press');
  m.root.unmount();
});

test('Slider accessibility actions that change nothing, and those on a disabled slider, commit nothing', () => {
  const changes: number[] = [];
  const commits: number[] = [];
  const handlers = { onValueChange: (v: number) => changes.push(v), onValueCommit: (v: number) => commits.push(v) };
  const atEnd = mountSlider({ root: { defaultValue: 100, ...handlers } });
  accessibilityAction(atEnd, 'increment');
  accessibilityAction(atEnd, 'setValue', 100);
  accessibilityAction(atEnd, 'setValue', 100.4);
  const disabled = mountSlider({ root: { defaultValue: 10, disabled: true, ...handlers } });
  accessibilityAction(disabled, 'increment');
  accessibilityAction(disabled, 'setValue', 90);
  assert.equal(changes.length + commits.length, 0);
  atEnd.root.unmount();
  disabled.root.unmount();
});

test('Slider setValue without a number is an error, and the value stays', () => {
  const m = mountSlider({ root: { defaultValue: 30 } });
  assert.throws(() => accessibilityAction(m, 'setValue'), /setValue action needs a finite number/);
  assert.equal(ariaOf(m, 'thumb').ariaValueNow, 30);
  m.root.unmount();
});

test('Slider accessibility actions move the value that native is told', () => {
  const m = mountSlider({ root: { defaultValue: 20 } });
  accessibilityAction(m, 'increment');
  assert.equal(ariaOf(m, 'thumb').ariaValueNow, 21);
  accessibilityAction(m, 'setValue', 77);
  assert.equal(ariaOf(m, 'thumb').ariaValueNow, 77);
  m.root.unmount();
});

test('Slider leaves every other key, and chords with Ctrl, Alt or Meta, to native and the game', () => {
  const changes: number[] = [];
  const m = mountSlider({ root: { defaultValue: 50, onValueChange: (v: number) => changes.push(v) } });
  focus(m, 'thumb');
  for (const key of ['Tab', 'a', 'Enter', ' ', 'Escape', 'Delete']) {
    assert.deepEqual(m.host.pressKey(m.root, key), { prevented: false, upPrevented: false }, key);
  }
  for (const init of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }]) {
    assert.equal(m.host.pressKey(m.root, 'ArrowRight', init).prevented, false, JSON.stringify(init));
  }
  assert.equal(changes.length, 0);
  m.root.unmount();
});

test('Slider keeps stepping while a key repeats', () => {
  const changes: number[] = [];
  const m = mountSlider({ root: { defaultValue: 10, onValueChange: (v: number) => changes.push(v) } });
  focus(m, 'thumb');
  m.host.keyDown(m.root, 'ArrowRight');
  m.host.keyDown(m.root, 'ArrowRight', { repeat: true });
  m.host.keyDown(m.root, 'ArrowRight', { repeat: true });
  assert.deepEqual(changes, [11, 12, 13]);
  m.root.unmount();
});

test('Slider controlled by keys: the request is reported and the shown value waits for the parent', () => {
  const changes: number[] = [];
  const m = mountSlider({ root: { value: 40, onValueChange: (v: number) => changes.push(v) } });
  focus(m, 'thumb');
  m.host.pressKey(m.root, 'ArrowRight');
  m.host.pressKey(m.root, 'ArrowRight');
  assert.deepEqual(changes, [41, 41], 'each press asks for one step from the value the parent shows');
  assert.deepEqual(growth(m), { range: 40, remainder: 60 });
  m.root.unmount();
});

test('Slider steps by a decimal without float noise, and its end is the last value on its grid', () => {
  const tenths: number[] = [];
  const m = mountSlider({ root: { min: 0, max: 1, step: 0.1, defaultValue: 0.2, onValueChange: (v: number) => tenths.push(v) } });
  focus(m, 'thumb');
  m.host.pressKey(m.root, 'ArrowRight');
  m.host.pressKey(m.root, 'ArrowRight');
  assert.deepEqual(tenths, [0.3, 0.4], '0.2 + 0.1 is 0.30000000000000004 in floats');

  const ends: number[] = [];
  const odd = mountSlider({ root: { min: 0, max: 10, step: 3, onValueChange: (v: number) => ends.push(v) } });
  focus(odd, 'thumb');
  odd.host.pressKey(odd.root, 'End');
  assert.deepEqual(ends, [9], 'max 10 is not on the grid 0, 3, 6, 9');
  assert.deepEqual(growth(odd), { range: 100, remainder: 0 }, 'so the thumb reaches the end of the track at 9');
  m.root.unmount();
  odd.root.unmount();
});

test('Slider disabled: native is told, the thumb is not a tab stop, and neither a press nor a key does anything', () => {
  const changes: number[] = [];
  const m = mountSlider({ root: { disabled: true, defaultValue: 50, onValueChange: (v: number) => changes.push(v) } });
  assert.equal(m.props('slider').disabled, true);
  assert.equal(m.props('thumb').disabled, true);
  assert.equal(m.props('thumb').tabIndex, undefined);
  assert.match(m.host.focusNode(m.tag('thumb'), 1), /cannot take focus/);
  // Native would not deliver these; a batch can, when the slider is disabled by an earlier event of it.
  const down = press(m, 80);
  assert.equal(down.prevented, false);
  assert.equal(m.host.captures.size, 0);
  m.host.events.push(m.host.keyEvent(m.tag('thumb'), 'keydown', { key: 'ArrowRight' }));
  m.root.dispatchEvents();
  assert.equal(m.host.wasPrevented(m.host.resolutions.at(-1)?.seq ?? -1), false);
  assert.equal(changes.length, 0);
  m.root.unmount();
});

test('Slider: the thumb is a tab stop, and Tab is not a key it handles', () => {
  const m = mountSlider();
  assert.equal(m.props('thumb').tabIndex, 0);
  m.root.unmount();
});

test('Slider without a thumb cannot map a press to a value and says so', () => {
  const m = mount(h(Slider.Root, { testID: 'slider' }, h(Slider.Track, { testID: 'track' }, h(Slider.Range))));
  m.host.setRect(m.tag('track'), TRACK_RECT);
  m.host.pointersDown.add(1);
  m.host.events.push(m.host.pointerEvent(m.tag('track'), 'pointerdown', { cancelable: true }));
  assert.throws(() => m.root.dispatchEvents(), /<Slider\.Root> needs a <Slider\.Track> that contains a <Slider\.Thumb>/);
  m.root.unmount();
});

test('Slider parts outside a Slider.Root, and impossible bounds, are errors that name the problem', () => {
  assert.throws(() => mount(h(Slider.Track)), /<Slider\.Track> must be rendered inside <Slider\.Root>/);
  assert.throws(() => mount(h(Slider.Range)), /<Slider\.Range> must be rendered inside <Slider\.Root>/);
  assert.throws(() => mount(h(Slider.Thumb)), /<Slider\.Thumb> must be rendered inside <Slider\.Root>/);
  assert.throws(() => mount(h(Slider.Root, { min: 5, max: 5 })), /max \(5\) must be greater than min \(5\)/);
  assert.throws(() => mount(h(Slider.Root, { step: 0 })), /step must be positive/);
});

test('Slider parts take className and style after their defaults, and each ref is its part\'s handle', () => {
  const refs = { root: createRef<UIHandle>(), track: createRef<UIHandle>(), range: createRef<UIHandle>(), thumb: createRef<UIHandle>() };
  const m = mount(h(Slider.Root, { ref: refs.root, testID: 'slider', className: 'bg-rose-500', style: { opacity: 0.5 } },
    h(Slider.Track, { ref: refs.track, testID: 'track', className: 'bg-emerald-500', style: { height: 9 } },
      h(Slider.Range, { ref: refs.range, testID: 'range', className: 'bg-amber-500', style: { opacity: 0.25 } }),
      h(Slider.Thumb, { ref: refs.thumb, testID: 'thumb', className: 'border-rose-500', style: { width: 33 } }))));
  for (const [part, testID] of [['root', 'slider'], ['track', 'track'], ['range', 'range'], ['thumb', 'thumb']] as const) {
    assert.equal(refs[part].current?.id, m.tag(testID), `${part} ref`);
  }
  assert.equal(m.style('slider').backgroundColor, '#f43f5e');
  assert.equal(m.style('slider').opacity, 0.5);
  assert.equal(m.style('track').backgroundColor, '#10b981', 'a class after the default class wins');
  assert.equal(m.style('track').height, 9, 'inline style wins over the class');
  assert.equal(m.style('range').backgroundColor, '#f59e0b');
  assert.equal(m.style('range').opacity, 0.25);
  assert.equal(m.style('range').flexGrow, 0, 'the proportion stays the kit\'s');
  assert.equal(m.style('thumb').borderColor, '#f43f5e');
  assert.equal(m.style('thumb').width, 33);
  assert.equal(m.style('thumb').height, 20);
  m.root.unmount();
});

// ---------------------------------------------------------------------------------------------------
// ARIA output (what native receives)
// ---------------------------------------------------------------------------------------------------

function ariaOf(m: Mounted, testID: string): Record<string, unknown> {
  return ariaPropsOf(m.host.nodes.get(m.tag(testID))?.props);
}

test('Checkbox sends role checkbox and ariaChecked true, false or mixed, with the caller\'s aria props', () => {
  const m = mount(h(View, null,
    h(Checkbox, { testID: 'off', 'aria-label': 'Off' }),
    h(Checkbox, { testID: 'on', defaultChecked: true, 'aria-description': 'It is on' }),
    h(Checkbox, { testID: 'mixed', checked: 'indeterminate', onCheckedChange: () => {}, 'aria-required': true })));
  assert.deepEqual(ariaOf(m, 'off'), { role: 'checkbox', ariaChecked: false, ariaLabel: 'Off' });
  assert.deepEqual(ariaOf(m, 'on'), { role: 'checkbox', ariaChecked: true, ariaDescription: 'It is on' });
  assert.deepEqual(ariaOf(m, 'mixed'), { role: 'checkbox', ariaChecked: 'mixed', ariaRequired: true });
  m.root.unmount();
});

test('a Checkbox that is clicked sends its new ariaChecked to native', () => {
  const m = mount(h(Checkbox, { testID: 'box', 'aria-label': 'Box' }));
  assert.equal(ariaOf(m, 'box').ariaChecked, false);
  click(m, 'box');
  assert.equal(ariaOf(m, 'box').ariaChecked, true);
  click(m, 'box');
  assert.equal(ariaOf(m, 'box').ariaChecked, false);
  m.root.unmount();
});

test('Switch sends role switch and ariaChecked', () => {
  const m = mount(h(View, null,
    h(Switch, { testID: 'off', 'aria-label': 'Sound' }), h(Switch, { testID: 'on', defaultChecked: true })));
  assert.deepEqual(ariaOf(m, 'off'), { role: 'switch', ariaChecked: false, ariaLabel: 'Sound' });
  assert.deepEqual(ariaOf(m, 'on'), { role: 'switch', ariaChecked: true });
  m.root.unmount();
});

test('RadioGroup sends role radiogroup with its orientation, and role radio with ariaChecked per item', () => {
  const m = mount(radioGroup(ABC, { defaultValue: 'b', orientation: 'horizontal', 'aria-label': 'Size' }));
  assert.deepEqual(ariaOf(m, 'group'), { role: 'radiogroup', ariaOrientation: 'horizontal', ariaLabel: 'Size' });
  assert.deepEqual(ariaOf(m, 'a'), { role: 'radio', ariaChecked: false });
  assert.deepEqual(ariaOf(m, 'b'), { role: 'radio', ariaChecked: true });
  assert.deepEqual(ariaOf(m, 'c'), { role: 'radio', ariaChecked: false });
  const unset = mount(radioGroup());
  assert.deepEqual(ariaOf(unset, 'group'), { role: 'radiogroup' }, 'no orientation unless asked for');
  m.root.unmount();
  unset.root.unmount();
});

test('Slider\'s thumb sends role slider with its range, value and orientation, and the caller\'s label', () => {
  const m = mount(sliderElement({ root: { min: 10, max: 20, step: 2, defaultValue: 14 }, thumb: { 'aria-valuetext': '14 percent' } }));
  assert.deepEqual(ariaOf(m, 'thumb'), {
    role: 'slider', ariaValueMin: 10, ariaValueMax: 20, ariaValueNow: 14, ariaOrientation: 'horizontal',
    ariaLabel: 'Volume', ariaValueText: '14 percent',
  });
  const vertical = mount(sliderElement({ root: { orientation: 'vertical', min: 0, max: 10, step: 3, value: 99 } }));
  assert.deepEqual(ariaOf(vertical, 'thumb'), {
    role: 'slider', ariaValueMin: 0, ariaValueMax: 9, ariaValueNow: 9, ariaOrientation: 'vertical', ariaLabel: 'Volume',
  }, 'max is the last value on the grid, and a value past it is shown at it');
  m.root.unmount();
  vertical.root.unmount();
});
