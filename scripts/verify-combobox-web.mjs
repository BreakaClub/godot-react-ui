// The `combobox` section of the Web interaction verifier (docs/tracks/combobox.md): the native section's reads of the combobox lab
// (demo/src/verify-combobox.ts), with real Chrome input: its keyboard, its mouse and wheel, an IME composition driven through the
// Chrome DevTools Protocol, and, on the touch page, a finger tapping and panning with the virtual keyboard up. The lab's four
// comboboxes are the native section's; what differs is only how input arrives and how the state is read.

import assert from 'node:assert/strict';

/** The gap between a control and its list (`DEFAULT_SIDE_OFFSET` in src/kit/popup.tsx). */
const LIST_GAP = 4;
const GEOMETRY_TOLERANCE = 1.5;
/** How far a finger drags the list, and in how many steps. */
const PAN_DISTANCE_PX = 140;
const PAN_STEPS = 6;
/** The options that make the multiple combobox's chips wrap at 320 px. */
const CHIPS_TO_WRAP = ['blueberry', 'date', 'fig'];
/** Key repeats of a held Backspace. */
const HELD_REPEATS = 5;

export async function runComboboxScenario(context) {
  const { demo, page, frames, snapshot, find, check, capture, waitUntil, moveTo, centerOf, click, wheelAt, nodeExists, text, expectFocused, actionTimeoutMs } = context;
  const { viewport } = context;
  void actionTimeoutMs;
  const readout = async () => JSON.parse(await text('cb-json'));
  const near = (name, actual, expected) => check(name, Math.abs(actual - expected) <= GEOMETRY_TOLERANCE, { actual, expected });
  const testIDOf = (node) => (typeof node?.props?.testID === 'string' ? node.props.testID : '');
  const inputText = async (id) => (await find(`cb-${id}-input`)).textInput.value;
  const focusedTestID = async () => {
    const data = await snapshot();
    return testIDOf(data.nodes.find((node) => node.id === data.focused));
  };
  const listed = async (id) => {
    const prefix = `cb-${id}-item-`;
    return (await snapshot()).nodes.filter((node) => testIDOf(node).startsWith(prefix))
      .sort((left, right) => left.documentIndex - right.documentIndex).map((node) => testIDOf(node).slice(prefix.length));
  };
  const chipValues = async (id) => {
    const prefix = `cb-${id}-chip-`;
    return (await snapshot()).nodes.filter((node) => testIDOf(node).startsWith(prefix))
      .sort((left, right) => left.documentIndex - right.documentIndex).map((node) => testIDOf(node).slice(prefix.length));
  };
  const activeOption = async (id) => {
    const input = await find(`cb-${id}-input`);
    const tag = input.props.ariaActiveDescendant ?? null;
    if (tag === null) return undefined;
    const target = (await snapshot()).nodes.find((node) => node.id === tag);
    assert.ok(target, `aria-activedescendant names ${tag}, which is not mounted`);
    return testIDOf(target).slice(`cb-${id}-item-`.length);
  };
  const press = async (key, modifiers = []) => {
    for (const modifier of modifiers) await page.keyboard.down(modifier);
    await page.keyboard.press(key);
    for (const modifier of [...modifiers].reverse()) await page.keyboard.up(modifier);
    await frames();
  };
  const closed = async (id) => !(await nodeExists(`cb-${id}-list`));
  const clickOption = async (id, value) => click(`cb-${id}-item-${value}`);

  await demo('showLab', 'combobox');
  await waitUntil('the combobox lab mounts', () => nodeExists('combobox-lab'));
  await demo('scrollTo', 'combobox-page', 0);
  await frames();
  await capture(`combobox-rest-${viewport.name}`);

  // ---- The single combobox -------------------------------------------------------------------------------------------------
  await click('cb-fruit-input');
  await expectFocused((await find('cb-fruit-input')).id, 'A press in the input focuses it');
  await waitUntil('a press in the input opens the list', async () => nodeExists('cb-fruit-list'));
  const control = (await find('cb-fruit')).rect;
  const list = (await find('cb-fruit-list')).rect;
  near('The list is left-aligned with the control', list.x, control.x);
  near('The list is a gap under the control', list.y, control.y + control.height + LIST_GAP);
  check('The list is at least as wide as the control', list.width >= control.width - GEOMETRY_TOLERANCE, { list, control });
  const input = await find('cb-fruit-input');
  check('The input is a combobox that is expanded and names its list', input.props.role === 'combobox' && input.props.ariaExpanded === true
    && input.props.ariaControls === (await find('cb-fruit-list')).id, input.props);
  await capture(`combobox-open-${viewport.name}`);

  await page.keyboard.type('b');
  await waitUntil('typing filters the list', async () => (await listed('fruit')).join() === 'banana,blueberry');
  await press('ArrowDown');
  await waitUntil('ArrowDown makes the first match active', async () => (await activeOption('fruit')) === 'banana');
  check('The focus stays in the input while an option is active', (await focusedTestID()) === 'cb-fruit-input');
  await press('ArrowDown');
  await press('ArrowDown');
  check('ArrowDown goes round past the last option', (await activeOption('fruit')) === 'banana');
  await press('ArrowUp');
  check('ArrowUp goes round before the first', (await activeOption('fruit')) === 'blueberry');
  await capture(`combobox-filtered-${viewport.name}`);
  await press('Home');
  await waitUntil('Home is the caret\'s', async () => (await find('cb-fruit-input')).textInput.selectionStart === 0);
  check('and leaves the active option alone', (await activeOption('fruit')) === 'blueberry');
  await press('End');
  await press('Enter');
  await waitUntil('Enter chooses the active option', async () => (await readout()).fruit === 'blueberry');
  check('The input shows the choice, the list closed, the focus stayed', (await inputText('fruit')) === 'Blueberry' && await closed('fruit')
    && (await focusedTestID()) === 'cb-fruit-input');
  await capture(`combobox-single-selected-${viewport.name}`);

  await press('Escape');
  await waitUntil('Escape on a closed list clears the choice and the text', async () => (await readout()).fruit === null && (await inputText('fruit')) === '');

  // An IME composition owns the keys: none of them moves the active option, and Enter does not choose.
  await press('ArrowDown', ['Alt']);
  await waitUntil('Alt+ArrowDown opens the list with no option active', async () => !(await closed('fruit')) && (await activeOption('fruit')) === undefined);
  await press('ArrowDown');
  await waitUntil('an option is active', async () => (await activeOption('fruit')) === 'apple');
  const cdp = await page.createCDPSession();
  await waitUntil('the IME element holds browser focus', async () => page.evaluate(() => document.activeElement?.className === 'ime'));
  await cdp.send('Input.imeSetComposition', { text: 'ñ', selectionStart: 1, selectionEnd: 1 });
  await waitUntil('the composition shows in the input', async () => (await find('cb-fruit-input')).textInput.composing);
  await press('ArrowDown');
  await press('Enter');
  check('A key during a composition moves nothing and chooses nothing', (await activeOption('fruit')) !== undefined
    && (await readout()).fruit === null, { active: await activeOption('fruit'), readout: await readout() });
  check('and the list is still open', !(await closed('fruit')));
  await cdp.send('Input.insertText', { text: 'ñ' });
  await waitUntil('the composition commits as text, which lists nothing', async () => (await inputText('fruit')) === 'ñ' && (await listed('fruit')).length === 0);
  check('and the empty message shows', await nodeExists('cb-fruit-empty'));
  await capture(`combobox-empty-${viewport.name}`);
  await cdp.detach();
  await press('Escape');
  await press('Escape');
  await waitUntil('Escape twice clears the text', async () => (await inputText('fruit')) === '');

  // The pointer makes an option active; a click chooses it and the input keeps its focus.
  await press('ArrowDown', ['Alt']);
  await waitUntil('open for the pointer', async () => !(await closed('fruit')));
  await context.click(`cb-fruit-item-fig`);
  await waitUntil('a click on an option chooses it', async () => (await readout()).fruit === 'fig');
  check('and the input keeps the focus, with the list closed', (await focusedTestID()) === 'cb-fruit-input' && await closed('fruit'));

  // Typing text nobody matches, then a click on bare page, closes the list and puts the choice back. A button beside it takes the click.
  await page.keyboard.type('zz');
  await waitUntil('the empty message shows', async () => nodeExists('cb-fruit-empty'));
  await click('cb-title');
  await waitUntil('a press elsewhere closes the list', async () => closed('fruit'));
  check('and puts the choice back in the input', (await inputText('fruit')) === 'Fig' && (await readout()).fruit === 'fig');
  await click('cb-fruit-input');
  await waitUntil('open again', async () => !(await closed('fruit')));
  await click('cb-next');
  await waitUntil('a press outside the list reaches the button under it', async () => (await text('cb-next')) === 'Next 1');
  check('and the list closed', await closed('fruit'));

  // A wheel over the page closes the list; Tab leaves.
  await click('cb-fruit-input');
  await waitUntil('open for the wheel', async () => !(await closed('fruit')));
  await wheelAt(await centerOf('cb-title'), 0, 100);
  await waitUntil('a wheel over the page closes the list', async () => closed('fruit'));
  check('and the input keeps its focus', (await focusedTestID()) === 'cb-fruit-input');
  await demo('scrollTo', 'combobox-page', 0);
  await page.keyboard.type('a');
  await press('ArrowDown');
  await press('Tab');
  await waitUntil('Tab closes the list and moves on', async () => (await closed('fruit')) && (await focusedTestID()) === 'cb-next');
  check('and chooses nothing', (await readout()).fruit === 'fig');

  // ---- The multiple combobox -----------------------------------------------------------------------------------------------
  check('The chips are the value', (await chipValues('tags')).join() === 'apple,banana');
  const oneLine = (await find('cb-tags')).rect.height;
  await click('cb-tags-input');
  await waitUntil('the tags list opens', async () => !(await closed('tags')));
  for (const value of CHIPS_TO_WRAP) {
    await clickOption('tags', value);
    await waitUntil(`${value} becomes a chip`, async () => (await readout()).tags.includes(value));
    check('and the list stays open, the input keeps the focus', !(await closed('tags')) && (await focusedTestID()) === 'cb-tags-input');
    const rect = (await find('cb-tags')).rect;
    near('and the list follows the control', (await find('cb-tags-list')).rect.y, rect.y + rect.height + LIST_GAP);
  }
  const grown = (await find('cb-tags')).rect;
  check('The chips wrapped and the control grew', grown.height > oneLine + GEOMETRY_TOLERANCE, { grown, oneLine });
  await capture(`combobox-chips-wrapped-${viewport.name}`);
  await press('Escape');
  const before = await chipValues('tags');
  // A held Backspace moves onto the last chip once and removes nothing.
  await page.keyboard.down('Backspace');
  for (let count = 0; count < HELD_REPEATS; count += 1) await page.keyboard.down('Backspace');
  await page.keyboard.up('Backspace');
  await frames();
  check('Backspace in an empty input moves onto the last chip', (await focusedTestID()) === `cb-tags-chip-${before.at(-1)}`, await focusedTestID());
  check('and a held key removes nothing', (await chipValues('tags')).join() === before.join());
  await capture(`combobox-chip-focused-${viewport.name}`);
  await press('Backspace');
  await waitUntil('a second Backspace press removes it and returns to the input', async () => (await chipValues('tags')).join() === before.slice(0, -1).join()
    && (await focusedTestID()) === 'cb-tags-input');
  await press('ArrowLeft');
  await press('ArrowLeft');
  await press('Delete');
  await waitUntil('Delete removes the focused chip', async () => (await chipValues('tags')).length === before.length - 2 && (await focusedTestID()) === 'cb-tags-input');
  const target = (await chipValues('tags'))[0];
  await click(`cb-tags-remove-${target}`);
  await waitUntil('a press on the remove button removes its chip', async () => !(await chipValues('tags')).includes(target));
  check('and the focus stays in the input', (await focusedTestID()) === 'cb-tags-input');
  await page.keyboard.type('kiwi,');
  await waitUntil('a comma adds the typed text as a chip', async () => (await readout()).tags.at(-1) === 'kiwi' && (await inputText('tags')) === '');
  await page.keyboard.type('plum');
  await press('Enter');
  await waitUntil('Enter with no active option adds the typed text', async () => (await readout()).tags.at(-1) === 'plum');

  // The disabled combobox shows chips with no removal and takes no press.
  check('The disabled combobox has its chips and no way to remove them', (await chipValues('locked')).join() === 'fig,grape' && !(await nodeExists('cb-locked-remove-fig')));
  await click('cb-locked-input');
  check('and a press on it neither focuses it nor opens it', (await focusedTestID()) !== 'cb-locked-input' && await closed('locked'));
  await capture(`combobox-disabled-${viewport.name}`);

  // ---- The bottom combobox: flips, caps, scrolls ---------------------------------------------------------------------------
  await click('cb-bottom-input');
  await waitUntil('the bottom list opens', async () => !(await closed('bottom')));
  const bottomControl = (await find('cb-bottom')).rect;
  const bottomList = (await find('cb-bottom-list'));
  near('Too low for its list, it opens above the control', bottomList.rect.y + bottomList.rect.height, bottomControl.y - LIST_GAP);
  check('Sixty options are more than the room: the list is capped and scrolls', bottomList.scroll.scrollHeight > bottomList.scroll.clientHeight);
  await press('ArrowUp');
  await waitUntil('ArrowUp starts at the last option', async () => (await activeOption('bottom')) === 'option-60');
  check('and the list scrolled to show it', (await find('cb-bottom-list')).scroll.scrollTop > 0);
  const pageTop = (await find('combobox-page')).scroll.scrollTop;
  const scrolled = (await find('cb-bottom-list')).scroll.scrollTop;
  await wheelAt(await centerOf('cb-bottom-list'), 0, -100);
  await waitUntil('a wheel over the list scrolls it', async () => (await find('cb-bottom-list')).scroll.scrollTop < scrolled);
  check('and leaves the list open, the active option alone and the page where it was', !(await closed('bottom'))
    && (await activeOption('bottom')) === 'option-60' && (await find('combobox-page')).scroll.scrollTop === pageTop);
  await capture(`combobox-flipped-${viewport.name}`);
  await press('Escape');
  await click('cb-title');

  // ---- Resizing the page under an open list --------------------------------------------------------------------------------
  // (The Web page's size is the browser's; the native section resizes the root's Control.)
  void moveTo;
}

/**
 * The touch page: a finger and the virtual keyboard. A tap on the input focuses it and brings the engine's hidden element up;
 * a tap on an option chooses it with the keyboard still up; a finger that pans the list scrolls it and chooses nothing, and
 * neither closes the list nor takes the input's focus for good (the press focuses the list for a moment, which hands it back).
 */
export async function runTouchComboboxScenario(context) {
  const { demo, page, frames, snapshot, find, check, waitUntil, nodeExists, text, pointerPoint, keyboardElement } = context;
  const readout = async () => JSON.parse(await text('cb-json'));
  const testIDOf = (node) => (typeof node?.props?.testID === 'string' ? node.props.testID : '');
  const focusedTestID = async () => {
    const data = await snapshot();
    return testIDOf(data.nodes.find((node) => node.id === data.focused));
  };
  const tap = async (testID) => {
    const point = await pointerPoint(testID);
    await page.touchscreen.tap(point.x, point.y);
    await frames();
  };
  const closed = async (id) => !(await nodeExists(`cb-${id}-list`));

  await demo('showLab', 'combobox');
  await waitUntil('the combobox lab mounts on touch', () => nodeExists('combobox-lab'));
  await demo('scrollTo', 'combobox-page', 0);
  await frames();

  await tap('cb-fruit-input');
  await waitUntil('a tap focuses the input', async () => (await focusedTestID()) === 'cb-fruit-input');
  await waitUntil('the engine brings its hidden element up', async () => (await keyboardElement()) !== null);
  await waitUntil('and a tap opens the list', async () => !(await closed('fruit')));
  await page.keyboard.type('b');
  await waitUntil('typing on the virtual keyboard filters the list', async () => (await find('cb-fruit-input')).textInput.value === 'b'
    && (await nodeExists('cb-fruit-item-banana')) && !(await nodeExists('cb-fruit-item-apple')));
  await tap('cb-fruit-item-banana');
  await waitUntil('a tap on an option chooses it', async () => (await readout()).fruit === 'banana');
  check('and the input is still focused, the list closed and the keyboard still up', (await focusedTestID()) === 'cb-fruit-input'
    && await closed('fruit') && (await keyboardElement()) !== null, { focused: await focusedTestID(), keyboard: await keyboardElement() });

  // A finger that pans the list scrolls it and chooses nothing.
  await tap('cb-bottom-input');
  await waitUntil('the bottom list opens', async () => !(await closed('bottom')));
  const before = (await find('cb-bottom-list')).scroll.scrollTop;
  const from = await pointerPoint('cb-bottom-item-option-50');
  const client = await page.createCDPSession();
  void client;
  await page.touchscreen.touchStart(from.x, from.y);
  for (let step = 1; step <= PAN_STEPS; step += 1) {
    await page.touchscreen.touchMove(from.x, from.y - (PAN_DISTANCE_PX * step) / PAN_STEPS);
    await frames();
  }
  await page.touchscreen.touchEnd();
  await frames();
  await client.detach();
  await waitUntil('a finger dragging the list scrolls it', async () => (await find('cb-bottom-list')).scroll.scrollTop > before);
  check('and chooses nothing, leaving the list open', (await readout()).bottom === null && !(await closed('bottom')));
  check('and the input has the focus again, with the keyboard up', (await focusedTestID()) === 'cb-bottom-input' && (await keyboardElement()) !== null,
    { focused: await focusedTestID(), keyboard: await keyboardElement() });

  // A tap on bare page closes the list and takes the focus, and the keyboard goes.
  await tap('cb-title');
  await waitUntil('a tap on bare page closes the list', async () => closed('bottom'));
  check('and the keyboard goes', (await keyboardElement()) === null);
  await demo('scrollTo', 'combobox-page', 0);
}
