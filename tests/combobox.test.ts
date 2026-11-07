import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement as h, createRef, useState, type ReactNode } from 'react';
import { Combobox, type TextInputHandle, type UIHandle } from '../src';
import { containsFilter, stepEnabledLooping } from '../src/kit/listbox';
import type { KeyInit } from './kit-host';
import { ComboboxHost } from './combobox-host';
import { createTestRoot, isRecord } from './recording-host';

// ---------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------

type Root = ReturnType<typeof createTestRoot>['root'];

interface Mounted {
  readonly host: ComboboxHost;
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
  const host = new ComboboxHost();
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

/** Continuous events (a pointer move) are rendered later, by React's scheduler. */
const settle = () => new Promise<void>((resolve) => { setTimeout(resolve, 10); });

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

interface ComboboxOptions {
  readonly root?: Record<string, unknown>;
  readonly items?: readonly FruitSpec[];
  readonly input?: Record<string, unknown>;
  readonly content?: Record<string, unknown>;
  /** The `Combobox.Empty` text; `null` leaves it out. */
  readonly empty?: string | null;
}

function fruitItems(items: readonly FruitSpec[]): ReactNode[] {
  return items.map((item) => h(Combobox.Item, {
    key: item.value, value: item.value, disabled: item.disabled, testID: `item-${item.value}`,
  }, h(Combobox.ItemText, { testID: `text-${item.value}` }, item.label), h(Combobox.ItemIndicator, { testID: `mark-${item.value}` })));
}

function emptyPart(options: ComboboxOptions): ReactNode {
  return options.empty === null ? null : h(Combobox.Empty, { testID: 'empty' }, options.empty ?? 'No matches');
}

/** A single combobox whose parts all have a `testID`: `control`, `input`, `clear`, `trigger`, `list`, `item-<value>`, `empty`. */
function fruitCombobox(options: ComboboxOptions = {}): ReactNode {
  return h(Combobox.Root, options.root ?? {},
    h(Combobox.Control, { testID: 'control' },
      h(Combobox.Input, { testID: 'input', 'aria-label': 'Fruit', placeholder: 'Pick one', ...options.input }),
      h(Combobox.Clear, { testID: 'clear' }),
      h(Combobox.Trigger, { testID: 'trigger' })),
    h(Combobox.Content, { testID: 'list', ...options.content }, ...fruitItems(options.items ?? FRUITS), emptyPart(options)));
}

/** A multiple combobox with `chips`, `chip-<value>` and `remove-<value>` besides the parts of {@link fruitCombobox}. */
function tagsCombobox(options: ComboboxOptions = {}): ReactNode {
  return h(Combobox.Root, { multiple: true, ...options.root },
    h(Combobox.Control, { testID: 'control' },
      h(Combobox.Chips, {
        testID: 'chips',
        renderChip: (value: string, label: string) => h(Combobox.Chip, { value, testID: `chip-${value}` },
          label, h(Combobox.ChipRemove, { testID: `remove-${value}` })),
      }, h(Combobox.Input, { testID: 'input', 'aria-label': 'Fruits', placeholder: 'Add fruit', ...options.input })),
      h(Combobox.Clear, { testID: 'clear' }),
      h(Combobox.Trigger, { testID: 'trigger' })),
    h(Combobox.Content, { testID: 'list', ...options.content }, ...fruitItems(options.items ?? FRUITS), emptyPart(options)));
}

const CONTROL_RECT = { x: 100, y: 100, width: 300, height: 36 };
const LIST_SIZE = { width: 280, height: 200 };

/** The control and the list in the places layout would put them (the fake host does no layout). */
function lay(m: Mounted, control = CONTROL_RECT, list = LIST_SIZE): void {
  m.host.rectsByTestID.set('control', control);
  m.host.rectsByTestID.set('list', { x: 0, y: 0, ...list });
}

function mountFruits(options: ComboboxOptions = {}): Mounted {
  const m = mount(fruitCombobox(options));
  lay(m);
  return m;
}

function mountTags(options: ComboboxOptions = {}): Mounted {
  const m = mount(tagsCombobox(options));
  lay(m);
  return m;
}

function focusInput(m: Mounted): void {
  assert.equal(m.host.focusNode(m.tag('input'), 1), '');
  m.root.dispatchEvents();
}

function focusedTestID(m: Mounted): string | undefined {
  const focused = m.host.focused;
  const id = focused === null ? undefined : m.host.nodes.get(focused)?.props.testID;
  return typeof id === 'string' ? id : undefined;
}

function key(m: Mounted, name: string, init: KeyInit = {}): { readonly prevented: boolean } {
  return m.host.pressKey(m.root, name, init);
}

/** The user types into the input, which has focus. */
function type(m: Mounted, text: string): void {
  m.host.type(m.root, text, m.tag('input'));
}

/** The text native holds in the input. */
function inputText(m: Mounted): string {
  return m.host.textInputs.get(m.tag('input'))?.value ?? '';
}

function click(m: Mounted, testID: string): void {
  m.host.event(m.tag(testID), 'click');
  m.root.dispatchEvents();
}

/** The options in the list, in document order. */
function listed(m: Mounted): string[] {
  return m.overlay().filter((id) => id.startsWith('item-')).map((id) => id.slice('item-'.length));
}

/** The option the input says it is on, by `aria-activedescendant`, or `undefined`. */
function activeOption(m: Mounted): string | undefined {
  const tag = m.props('input').ariaActiveDescendant;
  if (tag === undefined) return undefined;
  for (const [id, node] of m.host.nodes) {
    if (id === tag) {
      const testID = node.props.testID;
      assert.equal(typeof testID, 'string');
      return String(testID).slice('item-'.length);
    }
  }
  return assert.fail(`aria-activedescendant names ${String(tag)}, which is not mounted`);
}

function chips(m: Mounted): string[] {
  const node = m.host.nodes.get(m.tag('chips'));
  assert.ok(node);
  return node.children
    .map((child) => m.host.nodes.get(child)?.props.testID)
    .filter((id): id is string => typeof id === 'string' && id.startsWith('chip-'))
    .map((id) => id.slice('chip-'.length));
}

// ---------------------------------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------------------------------

test('stepEnabledLooping goes round from either end and skips disabled items', () => {
  const items = [{ disabled: false }, { disabled: true }, { disabled: false }, { disabled: false }];
  assert.equal(stepEnabledLooping(items, 0, 1), 2, 'skips the disabled item');
  assert.equal(stepEnabledLooping(items, 3, 1), 0, 'past the last goes to the first');
  assert.equal(stepEnabledLooping(items, 0, -1), 3, 'before the first goes to the last');
  assert.equal(stepEnabledLooping(items, 2, -1), 0, 'backwards skips the disabled item too');
  assert.equal(stepEnabledLooping(items, -1, 1), 0, 'from nothing, forwards is the first');
  assert.equal(stepEnabledLooping(items, -1, -1), 3, 'from nothing, backwards is the last');
  assert.equal(stepEnabledLooping([{ disabled: false }], 0, 1), 0, 'stepping off the only enabled item stays on it');
  assert.equal(stepEnabledLooping([{ disabled: true }, { disabled: true }], 0, 1), undefined, 'nothing enabled, nowhere to go');
  assert.equal(stepEnabledLooping([], -1, 1), undefined, 'no items');
});

test('the default filter is a case-insensitive substring match, and an empty query matches everything', () => {
  assert.equal(containsFilter('Blueberry', 'BLUE'), true);
  assert.equal(containsFilter('Blueberry', 'err'), true, 'anywhere in the text, not only the start');
  assert.equal(containsFilter('Apple', 'x'), false);
  assert.equal(containsFilter('Apple', ''), true);
  assert.equal(containsFilter('', 'a'), false);
});

// ---------------------------------------------------------------------------------------------------
// Closed
// ---------------------------------------------------------------------------------------------------

test('closed, the combobox is the control and its input, with no list in the overlay layer', () => {
  const m = mountFruits();
  assert.deepEqual(m.overlay(), []);
  assert.equal(m.host.nodes.get(m.tag('input'))?.kind, 'textinput');
  assert.equal(m.props('input').role, 'combobox');
  assert.equal(m.props('input').ariaExpanded, false);
  assert.equal(m.props('input').ariaActiveDescendant, undefined);
  assert.equal(m.props('input').ariaControls, undefined);
  assert.equal(m.props('input').placeholder, 'Pick one');
  assert.equal(m.props('input').ariaLabel, 'Fruit');
});

test('focusing the input does not open the list', () => {
  const m = mountFruits();
  focusInput(m);
  assert.deepEqual(m.overlay(), []);
});

test('the clear button shows only while there is something to clear', () => {
  const m = mountFruits();
  assert.equal(m.has('clear'), false);
  focusInput(m);
  type(m, 'a');
  assert.equal(m.has('clear'), true);
});

// ---------------------------------------------------------------------------------------------------
// Typing
// ---------------------------------------------------------------------------------------------------

test('typing opens the list and lists the options whose text contains it, ignoring case', () => {
  const m = mountFruits();
  focusInput(m);
  type(m, 'B');
  assert.deepEqual(listed(m), ['banana', 'blueberry']);
  type(m, 'lu');
  assert.deepEqual(listed(m), ['blueberry']);
  assert.equal(m.props('input').ariaExpanded, true);
});

test('deleting the text lists every option again and leaves the list open', () => {
  const m = mountFruits();
  focusInput(m);
  type(m, 'zzz');
  assert.equal(m.has('empty'), true);
  m.host.edit(m.root, 'deleteContentBackward');
  m.host.edit(m.root, 'deleteContentBackward');
  m.host.edit(m.root, 'deleteContentBackward');
  assert.deepEqual(listed(m), ['apple', 'banana', 'blueberry', 'cherry', 'date']);
});

test('Combobox.Empty shows when nothing matches, and a combobox without one does not open on nothing', () => {
  const withEmpty = mountFruits();
  focusInput(withEmpty);
  type(withEmpty, 'zzz');
  assert.deepEqual(listed(withEmpty), []);
  assert.equal(withEmpty.has('empty'), true, 'the list opens to say so');
  assert.equal(withEmpty.props('empty').ariaLive, 'polite', 'and is announced');

  const without = mountFruits({ empty: null });
  focusInput(without);
  type(without, 'zzz');
  assert.deepEqual(without.overlay(), [], 'no list for nothing to list');
  assert.equal(without.props('input').ariaExpanded, false);
  without.host.edit(without.root, 'deleteContentBackward');
  without.host.edit(without.root, 'deleteContentBackward');
  without.host.edit(without.root, 'deleteContentBackward');
  assert.ok(without.has('list'), 'it opens again as soon as something matches');
});

test('the empty message goes when an option matches again', () => {
  const m = mountFruits();
  focusInput(m);
  type(m, 'zz');
  assert.equal(m.has('empty'), true);
  m.host.edit(m.root, 'deleteContentBackward');
  m.host.edit(m.root, 'deleteContentBackward');
  assert.equal(m.has('empty'), false);
  assert.equal(listed(m).length, 5);
});

test('a filter prop replaces the default, and is given the option\'s text, the query and its value', () => {
  const calls: Array<[string, string, string]> = [];
  const m = mountFruits({
    root: {
      filter: (text: string, query: string, value: string) => {
        calls.push([text, query, value]);
        return text.toLowerCase().startsWith(query.toLowerCase());
      },
    },
  });
  focusInput(m);
  type(m, 'b');
  assert.deepEqual(listed(m), ['banana', 'blueberry']);
  type(m, 'l');
  assert.deepEqual(listed(m), ['blueberry'], 'a prefix filter: "bl" starts only Blueberry');
  assert.ok(calls.some((call) => call[0] === 'Blueberry' && call[1] === 'bl' && call[2] === 'blueberry'));
  assert.ok(calls.every((call) => call[1] !== ''), 'an empty query lists everything without asking the filter');
});

test('filter null lists every option whatever is typed', () => {
  const m = mountFruits({ root: { filter: null } });
  focusInput(m);
  type(m, 'zzz');
  assert.deepEqual(listed(m), ['apple', 'banana', 'blueberry', 'cherry', 'date']);
  assert.equal(m.has('empty'), false);
});

// ---------------------------------------------------------------------------------------------------
// Keyboard: opening and moving the active option
// ---------------------------------------------------------------------------------------------------

test('ArrowDown opens the list on the first enabled option and the input announces it', () => {
  const m = mountFruits();
  focusInput(m);
  assert.equal(key(m, 'ArrowDown').prevented, true, 'the key is the combobox\'s, not the text caret\'s');
  assert.deepEqual(listed(m), ['apple', 'banana', 'blueberry', 'cherry', 'date']);
  assert.equal(activeOption(m), 'apple');
  assert.equal(m.props('input').ariaExpanded, true);
  assert.equal(m.props('input').ariaControls, m.tag('list'));
  assert.equal(m.host.focused, m.tag('input'), 'focus stays in the input');
});

test('ArrowUp opens the list on the last enabled option', () => {
  const m = mountFruits();
  focusInput(m);
  key(m, 'ArrowUp');
  assert.equal(activeOption(m), 'date');
});

test('the arrows move the active option, skip disabled ones and loop from one end to the other', () => {
  const m = mountFruits();
  focusInput(m);
  key(m, 'ArrowDown');
  const walk: Array<string | undefined> = [activeOption(m)];
  for (let step = 0; step < 5; step += 1) {
    key(m, 'ArrowDown');
    walk.push(activeOption(m));
  }
  assert.deepEqual(walk, ['apple', 'banana', 'blueberry', 'date', 'apple', 'banana'], 'cherry is disabled; past date it goes round');
  key(m, 'ArrowUp');
  assert.equal(activeOption(m), 'apple');
  key(m, 'ArrowUp');
  assert.equal(activeOption(m), 'date', 'before the first it goes to the last');
});

test('with loop off the arrows stop at the ends', () => {
  const m = mountFruits({ root: { loop: false } });
  focusInput(m);
  key(m, 'ArrowDown');
  key(m, 'ArrowUp');
  assert.equal(activeOption(m), 'apple');
  for (let step = 0; step < 6; step += 1) key(m, 'ArrowDown');
  assert.equal(activeOption(m), 'date');
});

test('Alt+ArrowDown opens the list without choosing an option, and Alt+ArrowUp closes it', () => {
  const m = mountFruits();
  focusInput(m);
  assert.equal(key(m, 'ArrowDown', { altKey: true }).prevented, true);
  assert.equal(listed(m).length, 5);
  assert.equal(activeOption(m), undefined, 'nothing is active until a key moves it');
  assert.equal(key(m, 'ArrowUp', { altKey: true }).prevented, true);
  assert.deepEqual(m.overlay(), []);
  assert.equal(m.host.focused, m.tag('input'));
});

test('Home and End are left to the text caret', () => {
  const m = mountFruits();
  focusInput(m);
  key(m, 'ArrowDown');
  const before = activeOption(m);
  assert.equal(key(m, 'Home').prevented, false);
  assert.equal(key(m, 'End').prevented, false);
  assert.equal(activeOption(m), before);
});

test('Enter chooses the active option; with none active it chooses nothing and is not taken', () => {
  const chosen: Array<string | null> = [];
  const m = mountFruits({ root: { onValueChange: (value: string | null) => chosen.push(value) } });
  focusInput(m);
  key(m, 'ArrowDown');
  assert.equal(key(m, 'Enter').prevented, true);
  assert.deepEqual(chosen, ['apple']);
  assert.deepEqual(m.overlay(), [], 'a single combobox closes when it has chosen');

  const none: Array<string | null> = [];
  const fresh = mountFruits({ root: { onValueChange: (value: string | null) => none.push(value) } });
  focusInput(fresh);
  key(fresh, 'ArrowDown', { altKey: true });
  assert.equal(key(fresh, 'Enter').prevented, false, 'no active option: Enter is not the combobox\'s');
  assert.deepEqual(none, []);
  assert.equal(fresh.has('list'), true, 'and the list stays');
});

test('a disabled option is never active and Enter on a list of only disabled options chooses nothing', () => {
  const m = mountFruits({ items: [{ value: 'cherry', label: 'Cherry', disabled: true }] });
  focusInput(m);
  key(m, 'ArrowDown');
  assert.equal(activeOption(m), undefined);
  assert.equal(key(m, 'Enter').prevented, false);
});

test('Escape closes the list, and with the list closed clears the text and a single combobox\'s choice', () => {
  const m = mountFruits({ root: { defaultValue: 'banana' } });
  assert.equal(inputText(m), 'Banana', 'the chosen option\'s text is in the input from the start');
  focusInput(m);
  type(m, 'x');
  assert.equal(m.has('list'), true);
  assert.equal(key(m, 'Escape').prevented, true);
  assert.deepEqual(m.overlay(), []);
  assert.equal(inputText(m), 'Bananax', 'the first Escape only closes');
  assert.equal(key(m, 'Escape').prevented, true);
  assert.equal(inputText(m), '', 'the second clears the text');
  assert.equal(m.has('clear'), false, 'and the choice, so there is nothing to clear any more');
  assert.equal(key(m, 'Escape').prevented, false, 'with nothing to clear Escape is left to whoever wants it');
});

test('an IME composition owns the keys: none is taken and Enter does not choose', () => {
  const chosen: Array<string | null> = [];
  const m = mountFruits({ root: { onValueChange: (value: string | null) => chosen.push(value) } });
  focusInput(m);
  key(m, 'ArrowDown');
  for (const name of ['ArrowDown', 'ArrowUp', 'Enter', 'Escape']) {
    assert.equal(key(m, name, { isComposing: true }).prevented, false, `${name} while composing`);
  }
  assert.equal(activeOption(m), 'apple', 'nothing moved');
  assert.deepEqual(chosen, []);
  assert.equal(m.has('list'), true, 'and Escape did not close the list');
});

test('Tab leaves: the list closes and nothing is chosen', () => {
  const chosen: Array<string | null> = [];
  const m = mountFruits({ root: { onValueChange: (value: string | null) => chosen.push(value) } });
  focusInput(m);
  key(m, 'ArrowDown');
  key(m, 'ArrowDown');
  assert.equal(key(m, 'Tab').prevented, false, 'Tab moves on as it always does');
  assert.deepEqual(chosen, []);
  // Native moves the focus on; the fake host does it for us.
  m.host.blurNode(m.tag('input'));
  m.root.dispatchEvents();
  assert.deepEqual(m.overlay(), []);
  assert.deepEqual(chosen, [], 'an active option is not a choice');
});

test('ArrowLeft, ArrowRight and shifted arrows are the text\'s', () => {
  const m = mountFruits();
  focusInput(m);
  key(m, 'ArrowDown');
  assert.equal(key(m, 'ArrowLeft').prevented, false);
  assert.equal(key(m, 'ArrowRight').prevented, false);
  assert.equal(key(m, 'ArrowDown', { shiftKey: true }).prevented, false, 'Shift+Down selects text');
  assert.equal(key(m, 'ArrowDown', { ctrlKey: true }).prevented, false);
  assert.equal(key(m, 'ArrowDown', { metaKey: true }).prevented, false);
  assert.equal(activeOption(m), 'apple');
});

test('autoHighlight makes the first enabled match active as the text changes', () => {
  const m = mountFruits({ root: { autoHighlight: true } });
  focusInput(m);
  type(m, 'b');
  assert.equal(activeOption(m), 'banana');
  type(m, 'lu');
  assert.equal(activeOption(m), 'blueberry', 'when the active option stops matching, the new first match takes over');
  assert.equal(key(m, 'Enter').prevented, true);
  assert.equal(inputText(m), 'Blueberry');
});

test('without autoHighlight typing leaves no option active', () => {
  const m = mountFruits();
  focusInput(m);
  type(m, 'b');
  assert.equal(activeOption(m), undefined);
  key(m, 'ArrowDown');
  assert.equal(activeOption(m), 'banana');
  type(m, 'l');
  assert.equal(activeOption(m), undefined, 'typing starts the choice over');
});

test('a list that opens by ArrowDown on a chosen option starts there', () => {
  const m = mountFruits({ root: { defaultValue: 'blueberry' } });
  focusInput(m);
  key(m, 'ArrowDown');
  assert.equal(listed(m).length, 5, 'the text is the chosen option\'s, so it lists all of them');
  assert.equal(activeOption(m), 'blueberry');
  key(m, 'ArrowDown');
  assert.equal(activeOption(m), 'date');
});

// ---------------------------------------------------------------------------------------------------
// Single: choosing, leaving, custom values
// ---------------------------------------------------------------------------------------------------

test('choosing an option fills the input with its text, closes the list and keeps focus in the input', () => {
  const chosen: Array<string | null> = [];
  const texts: string[] = [];
  const m = mountFruits({ root: {
    onValueChange: (value: string | null) => chosen.push(value), onInputValueChange: (text: string) => texts.push(text),
  } });
  focusInput(m);
  type(m, 'blue');
  click(m, 'item-blueberry');
  assert.deepEqual(chosen, ['blueberry']);
  assert.equal(inputText(m), 'Blueberry');
  assert.deepEqual(m.overlay(), []);
  assert.equal(focusedTestID(m), 'input');
  assert.equal(texts.at(-1), 'Blueberry');
});

test('the chosen option shows its indicator and is aria-selected; the others are not', () => {
  const m = mountFruits({ root: { defaultValue: 'banana' } });
  focusInput(m);
  key(m, 'ArrowDown');
  assert.equal(m.has('mark-banana'), true);
  assert.equal(m.has('mark-apple'), false);
  assert.equal(m.props('item-banana').ariaSelected, true);
  assert.equal(m.props('item-apple').ariaSelected, false);
});

test('a disabled option is dimmed, aria-disabled and chooses nothing', () => {
  const chosen: Array<string | null> = [];
  const m = mountFruits({ root: { onValueChange: (value: string | null) => chosen.push(value) } });
  focusInput(m);
  key(m, 'ArrowDown');
  assert.equal(m.props('item-cherry').ariaDisabled, true);
  assert.equal(m.props('item-cherry').disabled, undefined, 'not natively disabled: the list keeps its presses');
  click(m, 'item-cherry');
  assert.deepEqual(chosen, []);
  assert.equal(m.has('list'), true, 'and the list stays');
});

test('leaving the input with text typed and nothing chosen puts the chosen option\'s text back', () => {
  const m = mountFruits({ root: { defaultValue: 'apple' } });
  focusInput(m);
  type(m, 'zz');
  assert.equal(inputText(m), 'Applezz');
  m.host.blurNode(m.tag('input'));
  m.root.dispatchEvents();
  assert.equal(inputText(m), 'Apple');
  assert.deepEqual(m.overlay(), []);
});

test('leaving with nothing chosen empties the text', () => {
  const m = mountFruits();
  focusInput(m);
  type(m, 'zz');
  m.host.blurNode(m.tag('input'));
  m.root.dispatchEvents();
  assert.equal(inputText(m), '');
});

test('with allowCustomValue leaving keeps the typed text and reports it as the value', () => {
  const chosen: Array<string | null> = [];
  const m = mountFruits({ root: { allowCustomValue: true, onValueChange: (value: string | null) => chosen.push(value) } });
  focusInput(m);
  type(m, 'kiwi');
  m.host.blurNode(m.tag('input'));
  m.root.dispatchEvents();
  assert.equal(inputText(m), 'kiwi');
  assert.deepEqual(chosen, ['kiwi']);
});

test('with allowCustomValue Enter with no active option keeps the typed text and closes the list', () => {
  const chosen: Array<string | null> = [];
  const m = mountFruits({ root: { allowCustomValue: true, onValueChange: (value: string | null) => chosen.push(value) } });
  focusInput(m);
  type(m, 'kiwi');
  assert.equal(key(m, 'Enter').prevented, true);
  assert.deepEqual(chosen, ['kiwi']);
  assert.deepEqual(m.overlay(), []);
  assert.equal(inputText(m), 'kiwi');
});

test('typed text that is an option\'s text is that option, not a custom value', () => {
  const chosen: Array<string | null> = [];
  const m = mountFruits({ root: { allowCustomValue: true, onValueChange: (value: string | null) => chosen.push(value) } });
  focusInput(m);
  type(m, 'Banana');
  key(m, 'Enter');
  assert.deepEqual(chosen, ['banana']);
});

test('with allowCustomValue, emptying the text and leaving clears the value', () => {
  const chosen: Array<string | null> = [];
  const m = mountFruits({ root: { allowCustomValue: true, defaultValue: 'apple', onValueChange: (value: string | null) => chosen.push(value) } });
  focusInput(m);
  m.host.edit(m.root, 'deleteContentBackward');
  for (let more = 0; more < 4; more += 1) m.host.edit(m.root, 'deleteContentBackward');
  assert.equal(inputText(m), '');
  m.host.blurNode(m.tag('input'));
  m.root.dispatchEvents();
  assert.deepEqual(chosen, [null]);
});

test('a custom value the combobox is given shows as its own text', () => {
  const m = mountFruits({ root: { allowCustomValue: true, defaultValue: 'kiwi' } });
  assert.equal(inputText(m), 'kiwi');
});

test('the text of a chosen option follows the option when it changes while the user is not editing', () => {
  function App(): ReactNode {
    const [label, setLabel] = useState('Apple');
    return h(Combobox.Root, { defaultValue: 'apple' },
      h(Combobox.Control, { testID: 'control' }, h(Combobox.Input, { testID: 'input' }), h('view', { testID: 'rename', onClick: () => setLabel('Pomme') })),
      h(Combobox.Content, { testID: 'list' }, h(Combobox.Item, { value: 'apple', textValue: label, testID: 'item-apple' }, h(Combobox.ItemText, {}, label))));
  }
  const m = mount(h(App));
  lay(m);
  assert.equal(inputText(m), 'Apple');
  click(m, 'rename');
  assert.equal(inputText(m), 'Pomme');
});

test('Clear empties the choice and the text, keeps the focus in the input and closes the list', () => {
  const chosen: Array<string | null> = [];
  const m = mountFruits({ root: { defaultValue: 'apple', onValueChange: (value: string | null) => chosen.push(value) } });
  focusInput(m);
  key(m, 'ArrowDown');
  assert.equal(m.has('list'), true);
  const down = m.host.press(m.root, m.tag('clear'));
  assert.equal(down.prevented, true, 'a press on it does not move the focus');
  assert.deepEqual(chosen, [null]);
  assert.equal(inputText(m), '');
  assert.deepEqual(m.overlay(), []);
  assert.equal(focusedTestID(m), 'input');
  assert.equal(m.has('clear'), false);
});

test('Clear pressed by an assistive technology, with the focus elsewhere, gives the input the focus', () => {
  const m = mountFruits({ root: { defaultValue: 'apple' } });
  assert.equal(m.host.focused, null);
  click(m, 'clear');
  assert.equal(focusedTestID(m), 'input');
  assert.equal(inputText(m), '');
});

test('the trigger opens and closes the list and never takes focus from the input', () => {
  const m = mountFruits();
  focusInput(m);
  assert.equal(m.host.press(m.root, m.tag('trigger')).prevented, true);
  assert.equal(m.has('list'), true);
  assert.equal(m.props('trigger').ariaExpanded, true);
  m.host.press(m.root, m.tag('trigger'));
  assert.equal(m.has('list'), false);
  assert.equal(focusedTestID(m), 'input');
});

test('a press on the trigger of an unfocused combobox focuses the input and opens the list', () => {
  const m = mountFruits();
  m.host.press(m.root, m.tag('trigger'));
  assert.equal(focusedTestID(m), 'input');
  assert.equal(m.has('list'), true);
});

test('a click in the input opens the list; a press on the control\'s padding focuses the input and opens it', () => {
  const m = mountFruits();
  m.host.press(m.root, m.tag('input'));
  assert.equal(focusedTestID(m), 'input');
  assert.equal(m.has('list'), true);

  const padding = mountFruits();
  assert.equal(padding.host.press(padding.root, padding.tag('control')).prevented, true, 'a mouse press there must not blur the input');
  assert.equal(focusedTestID(padding), 'input');
  assert.equal(padding.has('list'), true);
});

test('a single combobox selects its text when the input is focused, so typing replaces it', () => {
  const m = mountFruits();
  assert.equal(m.props('input').selectOnFocus, true);
  const multiple = mountTags();
  assert.equal(multiple.props('input').selectOnFocus, undefined);
});

// ---------------------------------------------------------------------------------------------------
// Controlled and uncontrolled
// ---------------------------------------------------------------------------------------------------

test('a controlled value is the parent\'s: a declined change leaves the input and the list as they were', () => {
  const seen: Array<string | null> = [];
  const m = mountFruits({ root: { value: 'apple', onValueChange: (value: string | null) => seen.push(value) } });
  focusInput(m);
  key(m, 'ArrowDown');
  key(m, 'ArrowDown');
  key(m, 'Enter');
  assert.deepEqual(seen, ['banana']);
  assert.equal(m.has('list'), false, 'the list closed');
  assert.equal(inputText(m), 'Apple', 'and the input shows what the parent still holds');
  key(m, 'ArrowDown');
  assert.equal(m.props('item-apple').ariaSelected, true, 'apple is still the value');
  assert.equal(activeOption(m), 'apple');
});

test('a parent that owns the value, the input text and the open state drives all three', () => {
  const log: string[] = [];
  function App(): ReactNode {
    const [value, setValue] = useState<string | null>(null);
    const [text, setText] = useState('');
    const [open, setOpen] = useState(false);
    return h(Combobox.Root, {
      value, onValueChange: (next: string | null) => { log.push(`value ${String(next)}`); setValue(next); },
      inputValue: text, onInputValueChange: (next: string) => { log.push(`text ${next}`); setText(next); },
      open, onOpenChange: (next: boolean) => { log.push(`open ${String(next)}`); setOpen(next); },
    },
    h(Combobox.Control, { testID: 'control' }, h(Combobox.Input, { testID: 'input' })),
    h(Combobox.Content, { testID: 'list' }, ...fruitItems(FRUITS), h(Combobox.Empty, { testID: 'empty' }, 'None')));
  }
  const m = mount(h(App));
  lay(m);
  focusInput(m);
  type(m, 'ban');
  assert.deepEqual(listed(m), ['banana']);
  click(m, 'item-banana');
  assert.deepEqual(log, ['text b', 'open true', 'text ba', 'text ban', 'value banana', 'text Banana', 'open false']);
  assert.equal(inputText(m), 'Banana');
});

test('open is controllable: the parent can open the list without a key', () => {
  function App(props: { open: boolean }): ReactNode {
    return h(Combobox.Root, { open: props.open },
      h(Combobox.Control, { testID: 'control' }, h(Combobox.Input, { testID: 'input' })),
      h(Combobox.Content, { testID: 'list' }, ...fruitItems(FRUITS)));
  }
  const m = mount(h(App, { open: false }));
  lay(m);
  assert.deepEqual(m.overlay(), []);
  m.root.render(h(App, { open: true }));
  assert.equal(m.has('list'), true);
  m.root.render(h(App, { open: false }));
  assert.deepEqual(m.overlay(), []);
});

test('a default open list is open on the first render', () => {
  const m = mount(h(Combobox.Root, { defaultOpen: true },
    h(Combobox.Control, { testID: 'control' }, h(Combobox.Input, { testID: 'input' })),
    h(Combobox.Content, { testID: 'list' }, ...fruitItems(FRUITS))));
  lay(m);
  m.root.render(h(Combobox.Root, { defaultOpen: true },
    h(Combobox.Control, { testID: 'control' }, h(Combobox.Input, { testID: 'input' })),
    h(Combobox.Content, { testID: 'list' }, ...fruitItems(FRUITS))));
  assert.equal(m.has('list'), true);
});

// ---------------------------------------------------------------------------------------------------
// Multiple: chips
// ---------------------------------------------------------------------------------------------------

test('choosing adds a chip, clears the input, keeps the list open and the focus in the input', () => {
  const seen: Array<readonly string[]> = [];
  const m = mountTags({ root: { onValueChange: (value: readonly string[]) => seen.push(value) } });
  focusInput(m);
  type(m, 'b');
  assert.deepEqual(listed(m), ['banana', 'blueberry']);
  key(m, 'ArrowDown');
  key(m, 'Enter');
  assert.deepEqual(seen, [['banana']]);
  assert.deepEqual(chips(m), ['banana']);
  assert.equal(inputText(m), '', 'the text is cleared');
  assert.equal(m.has('list'), true, 'and the list stays open');
  assert.deepEqual(listed(m), ['apple', 'banana', 'blueberry', 'cherry', 'date'], 'listing every option again');
  assert.equal(focusedTestID(m), 'input');
  assert.equal(activeOption(m), 'banana', 'the option just chosen is still the active one');
});

test('choosing a chosen option removes its chip', () => {
  const m = mountTags({ root: { defaultValue: ['apple', 'banana'] } });
  focusInput(m);
  key(m, 'ArrowDown');
  assert.equal(m.props('item-apple').ariaSelected, true);
  key(m, 'Enter');
  assert.deepEqual(chips(m), ['banana']);
  assert.equal(m.props('item-apple').ariaSelected, false);
});

test('chips come in the order they were chosen and are named by their option\'s text', () => {
  const m = mountTags({ root: { defaultValue: ['date', 'apple'] } });
  assert.deepEqual(chips(m), ['date', 'apple']);
  const chipText = (value: string): string => {
    const node = m.host.nodes.get(m.tag(`chip-${value}`));
    assert.ok(node);
    return node.children.map((child) => String(m.host.nodes.get(child)?.props.text ?? '')).join('');
  };
  assert.equal(chipText('date'), 'Date');
  assert.equal(m.props('chip-date').ariaLabel, 'Date');
  assert.equal(m.props('chip-date').role, 'group');
});

test('a chip\'s remove button is a button named for the chip, and removes it without taking the focus', () => {
  const seen: Array<readonly string[]> = [];
  const m = mountTags({ root: { defaultValue: ['apple', 'banana'], onValueChange: (value: readonly string[]) => seen.push(value) } });
  assert.equal(m.host.nodes.get(m.tag('remove-apple'))?.kind, 'button');
  assert.equal(m.props('remove-apple').ariaLabel, 'Remove Apple');
  assert.equal(m.props('remove-banana').ariaLabel, 'Remove Banana');
  focusInput(m);
  assert.equal(m.host.press(m.root, m.tag('remove-apple')).prevented, true);
  assert.deepEqual(seen, [['banana']]);
  assert.deepEqual(chips(m), ['banana']);
  assert.equal(focusedTestID(m), 'input');
});

test('the default chip is the label with a remove button', () => {
  const m = mount(h(Combobox.Root, { multiple: true, defaultValue: ['apple'] },
    h(Combobox.Control, { testID: 'control' }, h(Combobox.Chips, { testID: 'chips' }, h(Combobox.Input, { testID: 'input' }))),
    h(Combobox.Content, { testID: 'list' }, ...fruitItems(FRUITS))));
  lay(m);
  const node = m.host.nodes.get(m.tag('chips'));
  assert.ok(node);
  assert.equal(node.children.length, 2, 'one chip, then the input');
  const chip = m.host.nodes.get(node.children[0] ?? -1);
  assert.equal(chip?.props.ariaLabel, 'Apple');
  const [label, remove] = chip?.children ?? [];
  assert.equal(m.host.nodes.get(label ?? -1)?.props.text, 'Apple');
  assert.equal(m.host.nodes.get(remove ?? -1)?.props.ariaLabel, 'Remove Apple');
});

test('Backspace in an empty input moves onto the last chip; a second Backspace removes it and returns to the input', () => {
  const m = mountTags({ root: { defaultValue: ['apple', 'banana'] } });
  focusInput(m);
  assert.equal(key(m, 'Backspace').prevented, true);
  assert.equal(focusedTestID(m), 'chip-banana');
  assert.deepEqual(chips(m), ['apple', 'banana'], 'the first press removes nothing');
  assert.equal(key(m, 'Backspace').prevented, true);
  assert.deepEqual(chips(m), ['apple']);
  assert.equal(focusedTestID(m), 'input');
});

test('a held Backspace does not eat the chips', () => {
  const m = mountTags({ root: { defaultValue: ['apple', 'banana', 'date'] } });
  focusInput(m);
  key(m, 'Backspace');
  for (let repeat = 0; repeat < 5; repeat += 1) m.host.keyDown(m.root, 'Backspace', { repeat: true });
  assert.deepEqual(chips(m), ['apple', 'banana', 'date'], 'repeats remove nothing and move nothing');
  assert.equal(focusedTestID(m), 'chip-date');
});

test('a Backspace repeat that reaches the empty input moves onto no chip', () => {
  const m = mountTags({ root: { defaultValue: ['apple', 'banana'] } });
  focusInput(m);
  type(m, 'a');
  m.host.edit(m.root, 'deleteContentBackward');
  assert.equal(inputText(m), '', 'the text went');
  // Holding the key goes on to the empty input: that is a repeat of the press that emptied it, not a new one.
  assert.equal(m.host.keyDown(m.root, 'Backspace', { repeat: true }).prevented, false);
  assert.equal(focusedTestID(m), 'input');
  assert.equal(key(m, 'Backspace').prevented, true, 'a press of its own does move onto the chip');
  assert.equal(focusedTestID(m), 'chip-banana');
});

test('Backspace with text in the input edits the text, not the chips', () => {
  const m = mountTags({ root: { defaultValue: ['apple'] } });
  focusInput(m);
  type(m, 'x');
  assert.equal(key(m, 'Backspace').prevented, false);
  assert.equal(focusedTestID(m), 'input');
});

test('Backspace with no chips does nothing', () => {
  const m = mountTags();
  focusInput(m);
  assert.equal(key(m, 'Backspace').prevented, false);
});

test('ArrowLeft at the start of the text moves onto the last chip; anywhere else it is the caret\'s', () => {
  const m = mountTags({ root: { defaultValue: ['apple', 'banana'] } });
  focusInput(m);
  type(m, 'ab');
  assert.equal(key(m, 'ArrowLeft').prevented, false, 'the caret is at the end');
  m.host.setCaret(m.tag('input'), 1);
  assert.equal(key(m, 'ArrowLeft').prevented, false, 'in the middle');
  m.host.setCaret(m.tag('input'), 0, 2);
  assert.equal(key(m, 'ArrowLeft').prevented, false, 'with a selection');
  m.host.setCaret(m.tag('input'), 0);
  assert.equal(key(m, 'ArrowLeft').prevented, true);
  assert.equal(focusedTestID(m), 'chip-banana');
  assert.equal(inputText(m), 'ab', 'the text stays');
});

test('the arrows walk the chips and ArrowRight past the last returns to the input', () => {
  const m = mountTags({ root: { defaultValue: ['apple', 'banana', 'date'] } });
  focusInput(m);
  key(m, 'ArrowLeft');
  assert.equal(focusedTestID(m), 'chip-date');
  key(m, 'ArrowLeft');
  assert.equal(focusedTestID(m), 'chip-banana');
  key(m, 'ArrowLeft');
  assert.equal(focusedTestID(m), 'chip-apple');
  assert.equal(key(m, 'ArrowLeft').prevented, true);
  assert.equal(focusedTestID(m), 'chip-apple', 'it stops at the first chip');
  key(m, 'ArrowRight');
  assert.equal(focusedTestID(m), 'chip-banana');
  key(m, 'ArrowRight');
  key(m, 'ArrowRight');
  assert.equal(focusedTestID(m), 'input', 'past the last chip is the input');
});

test('Delete and Backspace on a focused chip remove it and focus returns to the input', () => {
  const m = mountTags({ root: { defaultValue: ['apple', 'banana', 'date'] } });
  focusInput(m);
  key(m, 'ArrowLeft');
  key(m, 'ArrowLeft');
  assert.equal(focusedTestID(m), 'chip-banana');
  assert.equal(key(m, 'Delete').prevented, true);
  assert.deepEqual(chips(m), ['apple', 'date']);
  assert.equal(focusedTestID(m), 'input');
});

test('a key repeat on a focused chip removes nothing', () => {
  const m = mountTags({ root: { defaultValue: ['apple', 'banana'] } });
  focusInput(m);
  key(m, 'ArrowLeft');
  m.host.keyDown(m.root, 'Delete', { repeat: true });
  assert.deepEqual(chips(m), ['apple', 'banana']);
  assert.equal(focusedTestID(m), 'chip-banana');
});

test('focus on a chip closes the list but keeps the text; focus out of the combobox drops text that was not entered', () => {
  const m = mountTags({ root: { defaultValue: ['apple'] } });
  focusInput(m);
  type(m, 'b');
  assert.equal(m.has('list'), true);
  m.host.setCaret(m.tag('input'), 0);
  key(m, 'ArrowLeft');
  assert.equal(focusedTestID(m), 'chip-apple');
  assert.deepEqual(m.overlay(), [], 'the list closes');
  assert.equal(inputText(m), 'b', 'the text stays');
  m.host.blurNode(m.tag('chip-apple'));
  m.root.dispatchEvents();
  focusInput(m);
  type(m, 'c');
  m.host.blurNode(m.tag('input'));
  m.root.dispatchEvents();
  assert.equal(inputText(m), '', 'leaving drops the text');
  assert.deepEqual(chips(m), ['apple'], 'and adds no chip');
});

test('with allowCustomValue Enter with no active option adds the typed text as a chip', () => {
  const seen: Array<readonly string[]> = [];
  const m = mountTags({ root: { allowCustomValue: true, onValueChange: (value: readonly string[]) => seen.push(value) } });
  focusInput(m);
  type(m, 'kiwi');
  assert.equal(key(m, 'Enter').prevented, true);
  assert.deepEqual(seen, [['kiwi']]);
  assert.deepEqual(chips(m), ['kiwi']);
  assert.equal(inputText(m), '');
  assert.equal(m.props('chip-kiwi').ariaLabel, 'kiwi', 'a custom chip is named by its value');
  key(m, 'Enter');
  assert.deepEqual(seen, [['kiwi']], 'Enter on empty text adds nothing');
});

test('a comma adds the typed text as a chip, when custom values are allowed, and is not typed', () => {
  const m = mountTags({ root: { allowCustomValue: true } });
  focusInput(m);
  type(m, 'kiwi,');
  assert.deepEqual(chips(m), ['kiwi']);
  assert.equal(inputText(m), '', 'the comma is not text');
  type(m, ',');
  assert.deepEqual(chips(m), ['kiwi'], 'a comma on empty text adds nothing');
  assert.equal(inputText(m), '');
  assert.equal(m.host.beforeInputs.at(-1)?.prevented, true);
});

test('a comma is just text where custom values are not allowed', () => {
  const m = mountTags();
  focusInput(m);
  type(m, 'a,b');
  assert.equal(inputText(m), 'a,b');
});

test('custom text that is an option\'s text adds that option, once', () => {
  const m = mountTags({ root: { allowCustomValue: true, defaultValue: ['banana'] } });
  focusInput(m);
  type(m, 'Banana');
  key(m, 'Enter');
  assert.deepEqual(chips(m), ['banana'], 'it is already chosen');
  type(m, 'Date');
  key(m, 'Enter');
  assert.deepEqual(chips(m), ['banana', 'date']);
});

test('a disabled combobox shows its chips with no removal and takes no key', () => {
  const m = mountTags({ root: { disabled: true, defaultValue: ['apple', 'banana'] } });
  assert.deepEqual(chips(m), ['apple', 'banana']);
  assert.equal(m.has('remove-apple'), false, 'no remove buttons');
  assert.equal(m.props('input').disabled, true);
  assert.equal(m.props('chip-apple').disabled, true);
  assert.equal(m.props('control').disabled, true);
  assert.equal(m.props('trigger').disabled, true);
  m.host.press(m.root, m.tag('trigger'));
  assert.deepEqual(m.overlay(), []);
  assert.equal(m.props('clear').disabled, true, 'the clear button is shown and disabled');
});

test('a disabled single combobox cannot be opened', () => {
  const m = mountFruits({ root: { disabled: true, defaultValue: 'apple' } });
  m.host.press(m.root, m.tag('control'));
  assert.deepEqual(m.overlay(), []);
  assert.equal(m.props('input').disabled, true);
  assert.equal(m.props('clear').disabled, true);
});

test('the placeholder is shown only while no chip is', () => {
  const empty = mountTags();
  assert.equal(empty.props('input').placeholder, 'Add fruit');
  const full = mountTags({ root: { defaultValue: ['apple'] } });
  assert.equal(full.props('input').placeholder, undefined);
});

test('Clear empties every chip and the text', () => {
  const seen: Array<readonly string[]> = [];
  const m = mountTags({ root: { defaultValue: ['apple', 'banana'], onValueChange: (value: readonly string[]) => seen.push(value) } });
  focusInput(m);
  m.host.press(m.root, m.tag('clear'));
  assert.deepEqual(seen, [[]]);
  assert.deepEqual(chips(m), []);
});

test('Escape in a multiple combobox closes the list, then clears the typed text and keeps the chips', () => {
  const m = mountTags({ root: { defaultValue: ['apple'] } });
  focusInput(m);
  type(m, 'b');
  key(m, 'Escape');
  assert.deepEqual(m.overlay(), []);
  assert.equal(inputText(m), 'b');
  assert.equal(key(m, 'Escape').prevented, true);
  assert.equal(inputText(m), '');
  assert.deepEqual(chips(m), ['apple']);
  assert.equal(key(m, 'Escape').prevented, false);
});

test('a chip\'s pieces take the control\'s click: clicking a chip does not focus the input from under it', () => {
  const m = mountTags({ root: { defaultValue: ['apple'] } });
  focusInput(m);
  m.host.press(m.root, m.tag('chip-apple'));
  assert.equal(focusedTestID(m), 'chip-apple', 'the press focused the chip and the click did not take it back');
  assert.deepEqual(m.overlay(), []);
});

// ---------------------------------------------------------------------------------------------------
// Pointer
// ---------------------------------------------------------------------------------------------------

test('the pointer moving over an option makes it active, and a resting pointer does not take it back from the keys', async () => {
  const m = mountFruits();
  focusInput(m);
  key(m, 'ArrowDown');
  m.host.moveOver(m.root, m.tag('item-blueberry'));
  await settle();
  assert.equal(activeOption(m), 'blueberry', 'moving over an option takes it');
  key(m, 'ArrowDown');
  assert.equal(activeOption(m), 'date', 'the keys go on from there');
  // The list scrolls under a pointer that rests: the option under it changes, but the pointer did not move.
  await settle();
  assert.equal(activeOption(m), 'date', 'only pointer movement moves the active option');
});

test('moving over a disabled option, or a touch moving over any, changes nothing', async () => {
  const m = mountFruits();
  focusInput(m);
  key(m, 'ArrowDown');
  m.host.moveOver(m.root, m.tag('item-cherry'));
  await settle();
  assert.equal(activeOption(m), 'apple');
  m.host.moveOver(m.root, m.tag('item-date'), 'touch');
  await settle();
  assert.equal(activeOption(m), 'apple');
});

test('a mouse press on an option does not move the focus, and the click chooses it', () => {
  const chosen: Array<string | null> = [];
  const m = mountFruits({ root: { onValueChange: (value: string | null) => chosen.push(value) } });
  focusInput(m);
  key(m, 'ArrowDown');
  const down = m.host.press(m.root, m.tag('item-banana'));
  assert.equal(down.prevented, true);
  assert.deepEqual(chosen, ['banana']);
  assert.equal(focusedTestID(m), 'input');
  assert.equal(inputText(m), 'Banana');
});

test('a mouse press on the list\'s padding keeps the focus in the input and the list open', () => {
  const m = mountFruits();
  focusInput(m);
  key(m, 'ArrowDown');
  assert.equal(m.host.press(m.root, m.tag('list')).prevented, true);
  assert.equal(focusedTestID(m), 'input');
  assert.equal(m.has('list'), true);
});

test('a mouse press on a scrollbar thumb is left alone so that it drags', () => {
  const m = mountFruits();
  m.host.scrollStatesByTestID.set('list', {
    scrollLeft: 0, scrollTop: 0, scrollWidth: 280, scrollHeight: 400, clientWidth: 280, clientHeight: 200,
    minScrollLeft: 0, maxScrollLeft: 0, minScrollTop: 0, maxScrollTop: 200,
    thumbs: { x: null, y: { x: 270, y: 0, width: 8, height: 100 } },
    tracks: { x: null, y: { x: 270, y: 0, width: 8, height: 200 } },
  });
  focusInput(m);
  key(m, 'ArrowDown');
  const onThumb = m.host.pointer(m.root, 'pointerdown', { x: 272, y: 20 }, { over: m.tag('list') });
  assert.equal(onThumb.prevented, false, 'a press on the thumb is native\'s to drag');
  m.host.pointer(m.root, 'pointerup', { x: 272, y: 20 }, { over: m.tag('list') });
  const beside = m.host.pointer(m.root, 'pointerdown', { x: 100, y: 20 }, { over: m.tag('list') });
  assert.equal(beside.prevented, true, 'a press beside it is the list\'s padding');
});

test('a touch press on the list is not prevented, so the list can be panned; the focus goes straight back to the input', () => {
  const m = mountFruits();
  focusInput(m);
  key(m, 'ArrowDown');
  const down = m.host.press(m.root, m.tag('item-banana'), { pointerType: 'touch', release: false });
  assert.equal(down.prevented, false, 'a prevented press cannot become a pan');
  assert.equal(focusedTestID(m), 'input', 'the list took the focus for a moment and gave it back');
  assert.equal(m.has('list'), true, 'and the list never closed');
});

test('a touch that pans the list chooses nothing', () => {
  const chosen: Array<string | null> = [];
  const m = mountFruits({ root: { onValueChange: (value: string | null) => chosen.push(value) } });
  focusInput(m);
  key(m, 'ArrowDown');
  m.host.press(m.root, m.tag('item-banana'), { pointerType: 'touch', release: false });
  m.host.pointer(m.root, 'pointercancel', { x: 50, y: 20 }, { over: m.tag('item-banana'), pointerType: 'touch' });
  assert.deepEqual(chosen, [], 'the pan cancels the pointer, and a cancelled pointer does not click');
  assert.equal(m.has('list'), true);
  assert.equal(focusedTestID(m), 'input');
});

test('a tap on an option with a finger chooses it', () => {
  const chosen: Array<string | null> = [];
  const m = mountFruits({ root: { onValueChange: (value: string | null) => chosen.push(value) } });
  focusInput(m);
  key(m, 'ArrowDown');
  m.host.press(m.root, m.tag('item-banana'), { pointerType: 'touch' });
  assert.deepEqual(chosen, ['banana']);
  assert.equal(focusedTestID(m), 'input');
});

test('a press outside the combobox closes the list through the input\'s blur and reaches what is under it', () => {
  const clicked: string[] = [];
  const m = mount(h('view', {},
    fruitCombobox(),
    h('button', { testID: 'under', onClick: () => clicked.push('under') })));
  lay(m);
  focusInput(m);
  key(m, 'ArrowDown');
  m.host.press(m.root, m.tag('under'));
  assert.deepEqual(m.overlay(), []);
  assert.deepEqual(clicked, ['under'], 'there is no backdrop in the way');
  assert.equal(focusedTestID(m), 'under');
});

test('a press on nothing focusable closes the list too', () => {
  const m = mount(h('view', {}, fruitCombobox(), h('view', { testID: 'page' })));
  lay(m);
  focusInput(m);
  key(m, 'ArrowDown');
  m.host.press(m.root, m.tag('page'));
  assert.deepEqual(m.overlay(), []);
});

test('a wheel over the list leaves it open; a wheel anywhere else closes it', async () => {
  const m = mount(h('view', {}, fruitCombobox(), h('view', { testID: 'page' })));
  lay(m);
  focusInput(m);
  key(m, 'ArrowDown');
  assert.equal(m.host.wheelOver(m.root, m.tag('item-banana')).prevented, false, 'the list\'s own scroll is native\'s');
  assert.equal(m.host.wheelOver(m.root, m.tag('list')).prevented, false);
  await settle();
  assert.equal(m.has('list'), true);
  m.host.wheelOver(m.root, m.tag('page'));
  await settle();
  assert.deepEqual(m.overlay(), [], 'the page may scroll under the list');
  assert.equal(focusedTestID(m), 'input', 'the input keeps its focus');
});

test('the wheel does nothing to a list that is not open', async () => {
  const m = mountFruits();
  focusInput(m);
  m.host.wheelOver(m.root, m.tag('control'));
  await settle();
  assert.deepEqual(m.overlay(), []);
  assert.equal(m.props('input').ariaExpanded, false);
});

test('focus moving to the list without a press (an assistive technology) goes straight back to the input', () => {
  const m = mountFruits();
  focusInput(m);
  key(m, 'ArrowDown');
  m.host.focusNode(m.tag('list'), 1);
  m.root.dispatchEvents();
  assert.equal(focusedTestID(m), 'input');
  assert.equal(m.has('list'), true);
});

// ---------------------------------------------------------------------------------------------------
// Placement
// ---------------------------------------------------------------------------------------------------

test('the list opens under the control with the left edges aligned, and is at least as wide as it', () => {
  const m = mountFruits();
  focusInput(m);
  key(m, 'ArrowDown');
  const style = m.style('list');
  assert.equal(style.left, 100);
  assert.equal(style.top, 100 + 36 + 4, 'under the control, a gap below');
  assert.equal(style.minWidth, 300);
  assert.equal(typeof style.maxHeight, 'number');
});

test('the list flips above the control when it does not fit below', () => {
  const m = mountFruits();
  lay(m, { x: 100, y: 700, width: 300, height: 36 }, { width: 280, height: 200 });
  focusInput(m);
  key(m, 'ArrowDown');
  assert.equal(m.style('list').top, 700 - 4 - 200);
});

test('a resize while the list is open places it again against the new size', () => {
  const m = mountFruits();
  lay(m, { x: 100, y: 500, width: 300, height: 36 }, { width: 280, height: 200 });
  focusInput(m);
  key(m, 'ArrowDown');
  assert.equal(m.style('list').top, 540, 'there is room below in 768');
  m.host.resize(1024, 600);
  m.root.dispatchEvents();
  assert.equal(m.has('list'), true, 'the list stays open: the input still has focus');
  assert.equal(m.style('list').top, 500 - 4 - 200, 'and it flipped above the control');
});

test('the list scrolls the active option into view when the keys move it, and not when the pointer does', async () => {
  const m = mountFruits();
  focusInput(m);
  key(m, 'ArrowDown');
  const before = m.host.scrollRequests.length;
  key(m, 'ArrowDown');
  const request = m.host.scrollRequests.at(-1);
  assert.ok(m.host.scrollRequests.length > before);
  assert.deepEqual(request, { method: 'scrollIntoView', tag: m.tag('item-banana') });
  const after = m.host.scrollRequests.length;
  m.host.moveOver(m.root, m.tag('item-blueberry'));
  await settle();
  assert.equal(activeOption(m), 'blueberry');
  assert.equal(m.host.scrollRequests.length, after, 'the pointer is already over it');
});

test('a combobox with no control opens its list from the input', () => {
  const m = mount(h(Combobox.Root, {},
    h(Combobox.Input, { testID: 'input' }),
    h(Combobox.Content, { testID: 'list' }, ...fruitItems(FRUITS))));
  m.host.rectsByTestID.set('input', { x: 20, y: 30, width: 200, height: 24 });
  m.host.rectsByTestID.set('list', { x: 0, y: 0, width: 150, height: 100 });
  focusInput(m);
  key(m, 'ArrowDown');
  assert.equal(m.style('list').left, 20);
  assert.equal(m.style('list').top, 30 + 24 + 4);
});

// ---------------------------------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------------------------------

test('the input is a combobox that names its list and its active option; the list is a listbox of options', () => {
  const m = mountFruits();
  focusInput(m);
  key(m, 'ArrowDown');
  key(m, 'ArrowDown');
  const input = m.props('input');
  assert.equal(input.role, 'combobox');
  assert.equal(input.ariaExpanded, true);
  assert.equal(input.ariaControls, m.tag('list'));
  assert.equal(input.ariaActiveDescendant, m.tag('item-banana'));
  assert.equal(m.props('list').role, 'listbox');
  assert.equal(m.props('item-banana').role, 'option');
  assert.equal(m.props('item-banana').ariaSelected, false);
  assert.equal(m.host.focused, m.tag('input'), 'the active option is announced, not focused');
});

test('closing takes the list and the active option out of the input\'s attributes', () => {
  const m = mountFruits();
  focusInput(m);
  key(m, 'ArrowDown');
  key(m, 'Escape');
  const input = m.props('input');
  assert.equal(input.ariaExpanded, false);
  assert.equal(input.ariaActiveDescendant, undefined);
  assert.equal(input.ariaControls, undefined);
});

test('the active option follows the keys in aria-activedescendant', () => {
  const m = mountFruits();
  focusInput(m);
  key(m, 'ArrowDown');
  const first = m.props('input').ariaActiveDescendant;
  key(m, 'ArrowDown');
  const second = m.props('input').ariaActiveDescendant;
  assert.notEqual(first, second);
  assert.equal(second, m.tag('item-banana'));
});

test('the trigger and clear buttons are named, and the trigger says whether the list is open', () => {
  const m = mountFruits({ root: { defaultValue: 'apple' } });
  assert.equal(m.props('trigger').ariaLabel, 'Show options');
  assert.equal(m.props('clear').ariaLabel, 'Clear');
  assert.equal(m.props('trigger').ariaExpanded, false);
  m.host.press(m.root, m.tag('trigger'));
  assert.equal(m.props('trigger').ariaExpanded, true);
});

test('aria props on the input, other than the ones the combobox owns, pass through', () => {
  const m = mountFruits({ input: { 'aria-label': 'Pick a fruit', 'aria-description': 'Type to filter', autoFocus: true } });
  assert.equal(m.props('input').ariaLabel, 'Pick a fruit');
  assert.equal(m.props('input').ariaDescription, 'Type to filter');
});

// ---------------------------------------------------------------------------------------------------
// Parts: className, style, ref, testID, errors
// ---------------------------------------------------------------------------------------------------

test('every part takes a className and a style (the caller\'s after the part\'s own) and forwards a ref', () => {
  const refs = {
    control: createRef<UIHandle>(), input: createRef<TextInputHandle>(), clear: createRef<UIHandle>(), trigger: createRef<UIHandle>(),
    list: createRef<UIHandle>(), item: createRef<UIHandle>(), text: createRef<UIHandle>(), empty: createRef<UIHandle>(),
    chips: createRef<UIHandle>(), chip: createRef<UIHandle>(), remove: createRef<UIHandle>(),
  };
  const m = mount(h(Combobox.Root, { multiple: true, defaultValue: ['apple'], defaultOpen: true, filter: null },
    h(Combobox.Control, { ref: refs.control, testID: 'control', className: 'p-9', style: { opacity: 0.5 } },
      h(Combobox.Chips, { ref: refs.chips, testID: 'chips', className: 'gap-7', renderChip: (value: string) => h(Combobox.Chip, {
        key: value, ref: refs.chip, value, testID: 'chip', className: 'p-8', style: { opacity: 0.4 },
      }, 'Apple', h(Combobox.ChipRemove, { ref: refs.remove, testID: 'remove', className: 'p-6' })) },
      h(Combobox.Input, { ref: refs.input, testID: 'input', className: 'p-5', style: { opacity: 0.3 } })),
      h(Combobox.Clear, { ref: refs.clear, testID: 'clear', className: 'p-4' }),
      h(Combobox.Trigger, { ref: refs.trigger, testID: 'trigger', className: 'p-3' })),
    h(Combobox.Content, { ref: refs.list, testID: 'list', className: 'p-2', style: { opacity: 0.2 } },
      h(Combobox.Item, { ref: refs.item, value: 'apple', testID: 'item', className: 'p-1' },
        h(Combobox.ItemText, { ref: refs.text, testID: 'text', className: 'p-10' }, 'Apple')),
      h(Combobox.Empty, { ref: refs.empty, testID: 'empty' }, 'None'))));
  lay(m);
  const paddings: Array<[string, number]> = [
    ['control', 9], ['chips', 0], ['chip', 8], ['remove', 6], ['input', 5], ['clear', 4], ['trigger', 3], ['list', 2], ['item', 1], ['text', 10],
  ];
  for (const [testID, padding] of paddings) {
    if (padding !== 0) assert.equal(m.style(testID).paddingTop, padding * 4, `${testID}: the caller\'s class wins over the part\'s own`);
  }
  assert.equal(m.style('chips').rowGap, 28, 'gap-7 replaces the default gap');
  assert.equal(m.style('control').opacity, 0.5);
  assert.equal(m.style('list').opacity, 0.2);
  for (const [name, ref] of Object.entries(refs)) {
    if (name === 'empty') continue;
    assert.ok(ref.current, `the ${name} part forwards its ref`);
  }
  assert.equal(refs.input.current?.id, m.tag('input'));
  assert.equal(refs.list.current?.id, m.tag('list'));
  assert.equal(refs.chip.current?.id, m.tag('chip'));
});

test('a part outside Combobox.Root says so', () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const parts: Array<[string, () => ReactNode]> = [
      ['Control', () => h(Combobox.Control, {})], ['Input', () => h(Combobox.Input, {})], ['Clear', () => h(Combobox.Clear, {})],
      ['Trigger', () => h(Combobox.Trigger, {})], ['Content', () => h(Combobox.Content, {})], ['Chips', () => h(Combobox.Chips, {})],
    ];
    for (const [part, element] of parts) {
      assert.throws(() => mount(element()), new RegExp(`<Combobox\\.${part}> must be rendered inside <Combobox\\.Root>`));
    }
  } finally {
    console.error = originalError;
  }
});

test('an item outside Combobox.Content, and an item part outside an item, say so', () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.throws(() => mount(h(Combobox.Root, {}, h(Combobox.Item, { value: 'a' }))), /<Combobox\.Item> must be rendered inside <Combobox\.Content>/);
    assert.throws(() => mount(h(Combobox.Root, {}, h(Combobox.Content, {}, h(Combobox.ItemText, {}, 'x')))), /<Combobox\.ItemText> must be rendered inside <Combobox\.Item>/);
    assert.throws(() => mount(h(Combobox.Root, {}, h(Combobox.Chips, {}, h(Combobox.ChipRemove, {})))), /<Combobox\.ChipRemove> must be rendered inside <Combobox\.Chip>/);
  } finally {
    console.error = originalError;
  }
});
