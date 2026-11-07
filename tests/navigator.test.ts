import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement as h, type ReactNode } from 'react';
import { Text } from '../src';
import { LABS, labsInOrder, type InlineLab, type Lab, type SceneLab } from '../demo/src/labs';
import { Navigator, type NavigatorProps } from '../demo/src/navigator';
import { CASE_OPTIONS, setTransformCase } from '../demo/src/transform-lab';
import { createTestRoot } from './recording-host';
import { TextInputHost } from './text-input-host';

// The navigator (demo/src/navigator.tsx) against the fake host: what it lists, what it opens, how the keyboard moves it and what
// it does with a lab that throws. Layout is native's and is checked in the interaction verifier's `navigator` section.

function mount(props: NavigatorProps = {}) {
  const host = new TextInputHost();
  const { root } = createTestRoot(host);
  root.render(h(Navigator, props));
  const tag = (testID: string): number => {
    const found = root.findByTestID(testID);
    assert.ok(found, `no element with testID "${testID}"`);
    return found.id;
  };
  const has = (testID: string): boolean => root.findByTestID(testID) !== undefined;
  const props_ = (testID: string): Record<string, unknown> => {
    const node = host.nodes.get(tag(testID));
    assert.ok(node, `${testID} is not mounted`);
    return node.props;
  };
  const textOf = (testID: string): string => {
    const collect = (id: number): string => {
      const node = host.nodes.get(id);
      return (typeof node?.props.text === 'string' ? node.props.text : '') + (node?.children ?? []).map(collect).join('');
    };
    return collect(tag(testID));
  };
  const click = (testID: string): void => {
    host.event(tag(testID), 'click');
    root.dispatchEvents();
  };
  const focus = (testID: string): void => { assert.equal(host.focusNode(tag(testID), 1), ''); };
  const focusedTestID = (): string | undefined => {
    const id = host.focused === null ? undefined : host.nodes.get(host.focused)?.props.testID;
    return typeof id === 'string' ? id : undefined;
  };
  const title = (): string => textOf('lab-title');
  return { host, root, tag, has, props: props_, textOf, click, focus, focusedTestID, title };
}

const ORDERED = labsInOrder(LABS);
const FIRST = ORDERED[0];
const SECOND = ORDERED[1];
const LAST = ORDERED[ORDERED.length - 1];
assert.ok(FIRST !== undefined && SECOND !== undefined && LAST !== undefined);

function labItemIds(m: ReturnType<typeof mount>): string[] {
  return ORDERED.filter((lab) => m.has(`lab-item-${lab.id}`)).map((lab) => lab.id);
}

test('it opens the first lab, lists every lab in the sidebar and names the current one in the header', () => {
  const m = mount();
  assert.equal(m.title(), FIRST.title);
  assert.equal(m.textOf('lab-description'), FIRST.description);
  assert.deepEqual(labItemIds(m), ORDERED.map((lab) => lab.id));
  assert.equal(m.textOf('lab-position'), `1 of ${ORDERED.length}`);
});

test('the current lab is the one option that is selected, and the only tab stop of the list', () => {
  const m = mount();
  for (const lab of ORDERED) {
    const props = m.props(`lab-item-${lab.id}`);
    assert.equal(props.role, 'option');
    assert.equal(props.ariaSelected, lab.id === FIRST.id, `${lab.id} is selected only if it is the current lab`);
    assert.equal(props.tabIndex, lab.id === FIRST.id ? 0 : -1);
  }
  assert.equal(m.props('lab-list').role, 'listbox');
});

test('choosing a lab opens it: the header, the position and the selected option follow, and the previous lab unmounts', () => {
  const chosen: string[] = [];
  const m = mount({ onLabChange: (id) => chosen.push(id) });
  assert.ok(m.has('counter-lab'));
  m.click('lab-item-keyboard');
  assert.deepEqual(chosen, ['keyboard']);
  assert.equal(m.title(), 'Keyboard');
  assert.equal(m.props('lab-item-keyboard').ariaSelected, true);
  assert.equal(m.props('lab-item-counter').ariaSelected, false);
  assert.ok(!m.has('counter-lab'), 'leaving a lab unmounts it');
  assert.ok(m.has('keyboard-lab'));
});

test('every lab that is a page opens without an error, and a launch lab shows its card instead', () => {
  const m = mount();
  for (const lab of ORDERED) {
    m.click(`lab-item-${lab.id}`);
    assert.equal(m.title(), lab.title);
    assert.ok(!m.has('lab-error'), `${lab.id} threw: ${m.has('lab-error') ? m.textOf('lab-error-message') : ''}`);
    assert.equal(m.has('lab-launch'), lab.kind !== 'inline', `${lab.id} shows a launch card only if it is a window or scene lab`);
  }
});

test('every case in the transforms lab (shapes, transitions, combined, loop, starting, behaviours) renders without error', () => {
  const m = mount({ initialLab: 'transforms' });
  try {
    for (const option of CASE_OPTIONS) {
      m.click('transform-case-select');
      m.click(`transform-case-${option.id}`);
      assert.ok(!m.has('lab-error'), `transforms case ${option.id} threw: ${m.has('lab-error') ? m.textOf('lab-error-message') : ''}`);
      assert.ok(m.has('transform-stage'), `transforms case ${option.id} mounted transform-stage`);
      if (option.id.startsWith('transition:')) {
        assert.ok(m.has('transform-flip'), `transition case ${option.id} renders the Flip button`);
        m.click('transform-flip');
        assert.ok(!m.has('lab-error'), `transition case ${option.id} flip to 'to' rendered cleanly`);
        m.click('transform-flip');
      }
    }
  } finally {
    setTransformCase('shape:identity');
  }
});

test('previous and next walk the labs in the sidebar\'s order and wrap at both ends', () => {
  const m = mount();
  m.click('lab-next');
  assert.equal(m.title(), SECOND.title);
  m.click('lab-previous');
  assert.equal(m.title(), FIRST.title);
  m.click('lab-previous');
  assert.equal(m.title(), LAST.title, 'previous from the first lab is the last');
  m.click('lab-next');
  assert.equal(m.title(), FIRST.title, 'next from the last lab is the first');
});

test('Alt+Down and Alt+Up open the next and previous lab from anywhere in the shell, and plain arrows do not', () => {
  const m = mount();
  m.focus('lab-previous');
  assert.equal(m.host.keyDown(m.root, 'ArrowDown', { altKey: true }).prevented, true);
  assert.equal(m.title(), SECOND.title);
  assert.equal(m.host.keyDown(m.root, 'ArrowUp', { altKey: true }).prevented, true);
  assert.equal(m.title(), FIRST.title);
  assert.equal(m.host.keyDown(m.root, 'ArrowDown').prevented, false, 'a plain arrow on a header button is not ours');
  assert.equal(m.title(), FIRST.title);
  assert.equal(m.host.keyDown(m.root, 'ArrowDown', { altKey: true, ctrlKey: true }).prevented, false, 'Ctrl+Alt is another chord');
  assert.equal(m.title(), FIRST.title);
});

test('a lab that handles Alt+Down itself keeps it', () => {
  const swallowing: InlineLab = {
    id: 'swallow', kind: 'inline', group: 'Input', title: 'Swallow', description: 'A lab that handles the chord.',
    sources: ['res://src/labs.tsx'], component: () => h(Text, { testID: 'swallow-body', onKeyDown: (event) => event.preventDefault(), tabIndex: 0 }, 'x'),
  };
  const m = mount({ labs: [swallowing, ...LABS.filter((lab) => lab.group !== 'Input')] });
  m.click('lab-item-swallow');
  m.focus('swallow-body');
  const before = m.title();
  assert.equal(m.host.keyDown(m.root, 'ArrowDown', { altKey: true }).prevented, true);
  assert.equal(m.title(), before, 'the lab prevented the key, so the shell did not move');
});

test('arrow keys, Home and End move focus through the list without opening anything; Enter opens the focused lab', () => {
  const m = mount();
  m.focus('lab-item-counter');
  m.host.pressKey(m.root, 'ArrowDown');
  assert.equal(m.focusedTestID(), `lab-item-${SECOND.id}`);
  assert.equal(m.title(), FIRST.title, 'focus moved, the lab did not');
  m.host.pressKey(m.root, 'End');
  assert.equal(m.focusedTestID(), `lab-item-${LAST.id}`);
  m.host.pressKey(m.root, 'ArrowDown');
  assert.equal(m.focusedTestID(), `lab-item-${LAST.id}`, 'the list does not wrap');
  m.host.pressKey(m.root, 'ArrowUp');
  m.host.pressKey(m.root, 'Home');
  assert.equal(m.focusedTestID(), `lab-item-${FIRST.id}`);
  m.host.pressKey(m.root, 'ArrowDown');
  const target = SECOND;
  m.host.pressKey(m.root, 'Enter');
  assert.equal(m.title(), target.title, 'Enter presses the focused option');
  assert.equal(m.props(`lab-item-${target.id}`).tabIndex, 0, 'the tab stop follows the current lab');
});

test('typing in the filter narrows the list, hides empty groups and keeps the current lab\'s option out of it when it no longer matches', () => {
  const m = mount();
  m.focus('lab-filter-input');
  m.host.type(m.root, 'glass');
  assert.deepEqual(labItemIds(m), ['glass']);
  assert.equal(m.title(), FIRST.title, 'filtering does not open anything');
  assert.equal(m.props('lab-item-glass').tabIndex, 0, 'with the current lab filtered out, the first match is the tab stop');
  m.host.type(m.root, 'zzzz');
  assert.deepEqual(labItemIds(m), []);
  assert.ok(m.has('lab-list-empty'), 'a filter that matches nothing says so');
});

test('Enter in the filter opens the first match, Escape clears it and Down goes to the list', () => {
  const m = mount();
  m.focus('lab-filter-input');
  m.host.type(m.root, 'scroll');
  m.host.pressKey(m.root, 'Enter');
  assert.equal(m.title(), 'Scrolling');
  m.host.pressKey(m.root, 'ArrowDown');
  assert.equal(m.focusedTestID(), 'lab-item-scroll', 'the first match takes focus');
  m.focus('lab-filter-input');
  m.host.pressKey(m.root, 'Escape');
  assert.equal(labItemIds(m).length, ORDERED.length, 'Escape in the filter clears it');
});

test('previous and next walk only the labs the filter shows', () => {
  const m = mount();
  m.focus('lab-filter-input');
  m.host.type(m.root, 'text');
  const shown = labItemIds(m);
  assert.ok(shown.length >= 2 && shown.length < ORDERED.length);
  m.click('lab-next');
  assert.equal(m.title(), ORDERED.find((lab) => lab.id === shown[0])?.title, 'from a lab the filter hides, next is the first match');
  m.click('lab-next');
  assert.equal(m.title(), ORDERED.find((lab) => lab.id === shown[1])?.title);
});

test('an unknown initial lab is an error on screen, lists the ids that work, and opens nothing', () => {
  const m = mount({ initialLab: 'nope' });
  assert.ok(m.has('lab-missing'));
  assert.match(m.textOf('lab-missing-message'), /There is no lab called "nope"/);
  for (const lab of LABS) assert.ok(m.textOf('lab-missing-ids').split(', ').includes(lab.id), `${lab.id} is offered`);
  assert.equal(m.title(), 'Lab not found');
  assert.ok(!m.has('counter-lab'), 'no other lab was opened in its place');
  m.click('lab-item-pointers');
  assert.ok(!m.has('lab-missing'), 'choosing a lab leaves the error');
  assert.equal(m.title(), 'Pointers');
});

test('a known initial lab opens first', () => {
  const m = mount({ initialLab: 'drag' });
  assert.equal(m.title(), 'Drag and drop');
  assert.ok(m.has('drag-lab'));
});

test('a lab that throws shows its error in place, the shell stays, and the next lab works', (t) => {
  const failing: InlineLab = {
    id: 'breaks', kind: 'inline', group: 'Input', title: 'Breaks', description: 'A lab that throws.', sources: ['res://src/labs.tsx'],
    component: () => { throw new Error('this lab is broken on purpose'); },
  };
  const logged: unknown[] = [];
  t.mock.method(console, 'error', (...args: unknown[]) => { logged.push(args); });
  const m = mount({ labs: [failing, ...LABS] });
  m.click('lab-item-breaks');
  assert.ok(m.has('lab-error'));
  assert.match(m.textOf('lab-error-message'), /this lab is broken on purpose/);
  assert.ok(m.has('lab-list'), 'the sidebar is still there');
  assert.equal(m.title(), 'Breaks');
  m.click('lab-item-pointers');
  assert.ok(!m.has('lab-error'));
  assert.ok(m.has('pointer-lab'), 'the next lab renders');
  assert.ok(logged.length > 0, 'the error was reported, not swallowed');
});

test('Try again mounts the failing lab from nothing', (t) => {
  let broken = true;
  const flaky: InlineLab = {
    id: 'flaky', kind: 'inline', group: 'Input', title: 'Flaky', description: 'Fails until it is mended.', sources: ['res://src/labs.tsx'],
    component: () => {
      if (broken) throw new Error('not mended yet');
      return h(Text, { testID: 'flaky-body' }, 'ok');
    },
  };
  t.mock.method(console, 'error', () => {});
  const m = mount({ labs: [flaky, ...LABS] });
  m.click('lab-item-flaky');
  assert.ok(m.has('lab-error'));
  m.click('lab-error-retry');
  assert.ok(m.has('lab-error'), 'still broken, still shown');
  broken = false;
  m.click('lab-error-retry');
  assert.ok(m.has('flaky-body'));
  assert.ok(!m.has('lab-error'));
});

test('a window lab shows a card, opens in the whole window with a way back in the overlay, and Escape comes back', () => {
  const m = mount();
  m.click('lab-item-glass');
  assert.ok(m.has('lab-launch'));
  assert.ok(!m.has('glass-root'));
  m.click('lab-launch-open');
  assert.ok(m.has('glass-root'), 'the lab has the window');
  assert.ok(!m.has('lab-list'), 'nothing of the shell is mounted behind it');
  const bar = m.host.layerRoots[1] ?? [];
  assert.ok(bar.length > 0 && m.has('window-back'), 'the way back is in the overlay layer');
  m.click('window-back');
  assert.ok(m.has('lab-launch') && m.has('lab-list') && !m.has('glass-root'));
  m.click('lab-launch-open');
  assert.ok(m.has('glass-root'));
  assert.equal(m.props('window-back').autoFocus, true, 'the way back asks for focus, so Escape works at once (native applies it; the fake host does not)');
  m.focus('window-back');
  assert.equal(m.host.keyDown(m.root, 'Escape').prevented, true);
  assert.ok(!m.has('glass-root') && m.has('lab-list'), 'Escape leaves the full window');
});

test('a scene lab asks its host to open the scene, and says so when the host cannot', () => {
  const opened: SceneLab[] = [];
  const m = mount({ onOpenScene: (lab) => opened.push(lab) });
  m.click('lab-item-world');
  assert.ok(m.has('lab-launch'));
  assert.notEqual(m.props('lab-launch-open').disabled, true);
  m.click('lab-launch-open');
  assert.deepEqual(opened.map((lab) => lab.scene), ['res://world.tscn']);
  const bare = mount();
  bare.click('lab-item-world');
  assert.equal(bare.props('lab-launch-open').disabled, true, 'without a host that can change scene the button is disabled');
});

test('a game-surface lab lets pointers through its area, and a page lab paints it', () => {
  const m = mount();
  const stageClass = (): unknown => m.props('lab-stage').style;
  m.click('lab-item-hud');
  assert.ok(m.has('hud'));
  const game = JSON.stringify(stageClass());
  m.click('lab-item-pointers');
  const page = JSON.stringify(stageClass());
  assert.notEqual(game, page);
  assert.match(game, /pointerEvents/);
  assert.doesNotMatch(page, /pointerEvents/);
});

test('with a custom list it lists those labs only, in group order', () => {
  const only: Lab[] = ORDERED.filter((lab) => lab.id === 'motion' || lab.id === 'counter');
  const m = mount({ labs: only });
  assert.deepEqual(labItemIds(m), ['counter', 'motion']);
});

test('the narrow menu holds the current lab even when the filter hides it', () => {
  const m = mount();
  m.focus('lab-filter-input');
  m.host.type(m.root, 'glass');
  assert.ok(m.has('lab-menu'));
  const root: ReactNode = null;
  void root;
  assert.equal(m.textOf('lab-menu-value'), FIRST.title);
});
