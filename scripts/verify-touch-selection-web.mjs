// The `touch-selection` section of the Web interaction verifier (docs/tracks/touch-selection.md), on the touch page: real touch input from Chrome
// over the DevTools Protocol (`Input.dispatchTouchEvent`: touchstart, touchmove and touchend with a finger held down for real time, no OS input) on
// the touch selection lab (demo/src/touch-selection-lab.tsx). The checks are the native section's (demo/src/verify-touch-selection.ts), made
// with the events a browser sends, and what only a browser has: the engine's soft keyboard element stays up through selection changes, and the
// clipboard is written inside the touch's user activation.

/** `TOUCH_SELECT_HOLD_MS` in native/touch_selection.rs, and how long a finger is held for the hold to have elapsed with slack for frames. */
const HOLD_MS = 500;
const HELD_MS = HOLD_MS + 500;
const EARLY_MS = 250;
const POSITION_TOLERANCE_PX = 1.5;
const DRAG_STEPS = 5;
const PAN_STEPS = 6;
const PAN_STEP_PX = 20;
const PAN_FOLLOWED_PX = (PAN_STEPS - 1) * PAN_STEP_PX;
const SCROLL_TOLERANCE_PX = 1.5;
const PIXEL_TOLERANCE = 18;
/** The handles' default colour (blue-500) and the menu's (slate-900), as 8-bit channels. */
const HANDLE_RGB = [0x3b, 0x82, 0xf6];
const MENU_RGB = [0x0f, 0x17, 0x2a];
const PAGE = 'touch-selection-page';
const P1 = 'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.';
const INPUT_VALUE = 'alpha beta gamma delta epsilon zeta eta theta';

const near = (actual, expected, tolerance = POSITION_TOLERANCE_PX) => Math.abs(actual - expected) <= tolerance;
const centreOf = (rect) => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });

/** What a scenario needs from the verifier that runs it. */
function helpers(context) {
  const { demo, page, frames, find, check, waitUntil, pagePoint, text } = context;
  const rest = (ms) => page.evaluate((duration) => new Promise((resolve) => setTimeout(resolve, duration)), ms);

  const selection = () => page.evaluate(() => {
    const selected = globalThis.godotReactDemo.selection();
    if (!selected) return null;
    return {
      text: selected.text, isCollapsed: selected.isCollapsed,
      anchor: { testID: selected.anchor.node.testID ?? null, offset: selected.anchor.offset },
      focus: { testID: selected.focus.node.testID ?? null, offset: selected.focus.offset },
    };
  });
  const chrome = () => demo('touchSelection');
  const inputState = async (testID) => {
    const { textInput } = await find(testID);
    return { value: textInput.value, start: textInput.selectionStart, end: textInput.selectionEnd };
  };
  const rangeRect = async (testID, start, end) => (await demo('textRanges', testID, start, end))[0];
  const caretX = async (testID, offset, side) => (await demo('textCaret', testID, offset, side)).x;
  const stemMiddle = (handle) => ({ x: handle.stem.x + handle.stem.width / 2, y: handle.stem.y + handle.stem.height / 2 });
  const ballOf = (handle) => ({ x: handle.ball.x, y: handle.ball.y });
  const handleOf = async (end) => {
    const handle = (await chrome())?.handles.find((candidate) => candidate.end === end);
    check(`The ${end} handle is shown`, handle !== undefined);
    return handle;
  };
  const menuActions = async () => (await chrome())?.menu?.items.map((item) => item.action) ?? [];
  const menuItemPoint = async (action) => {
    const item = (await chrome())?.menu?.items.find((candidate) => candidate.action === action);
    check(`The menu offers ${action}`, item !== undefined, await menuActions());
    return centreOf(item.rect);
  };

  /** A finger on the screen, in logical points: the DevTools Protocol's touch events, one finger. */
  const cdp = page.createCDPSession();
  const finger = {
    async send(type, point) {
      const session = await cdp;
      const touchPoints = type === 'touchEnd' ? [] : [{ x: point.x, y: point.y, id: 1 }];
      await session.send('Input.dispatchTouchEvent', { type, touchPoints });
    },
    async down(point) {
      this.at = point;
      await this.send('touchStart', await pagePoint(point.x, point.y));
      await frames();
    },
    async move(point) {
      this.at = point;
      await this.send('touchMove', await pagePoint(point.x, point.y));
      await frames();
    },
    async up() {
      await this.send('touchEnd', await pagePoint(this.at.x, this.at.y));
      await frames();
    },
    async glide(to, steps = DRAG_STEPS) {
      const from = this.at;
      for (let step = 1; step <= steps; step += 1) await this.move({ x: from.x + (to.x - from.x) * step / steps, y: from.y + (to.y - from.y) * step / steps });
    },
  };
  const tap = async (point) => {
    await finger.down(point);
    await finger.up();
    await frames();
  };
  const holdDown = async (point) => {
    await finger.down(point);
    await rest(HELD_MS);
    await frames();
  };
  const holdThenLift = async (point) => {
    await holdDown(point);
    await finger.up();
  };
  const selectWord = async (testID, start, end) => {
    const at = centreOf(await rangeRect(testID, start, end));
    await holdThenLift(at);
    return at;
  };
  const dragHandle = async (end, target) => {
    const handle = await handleOf(end);
    const from = ballOf(handle);
    const middle = stemMiddle(handle);
    const to = { x: target.x - (middle.x - from.x), y: target.y - (middle.y - from.y) };
    await finger.down(from);
    check(`A finger on the ${end} handle drags it`, (await chrome())?.gesture === 'handle', await chrome());
    await finger.glide(to);
    await finger.up();
  };
  const scrollTop = async (testID) => (await find(testID)).scroll.scrollTop;
  return {
    ...context, rest, selection, chrome, inputState, rangeRect, caretX, stemMiddle, ballOf, handleOf, menuActions, menuItemPoint, finger, tap,
    holdDown, holdThenLift, selectWord, dragHandle, scrollTop, near, centreOf,
  };
}

async function openLab(h) {
  const { demo, waitUntil, nodeExists } = h;
  await demo('showLab', 'hud');
  await h.frames();
  await demo('showLab', 'touch-selection');
  await waitUntil('the touch selection lab mounts', () => nodeExists('touch-selection-lab'));
  await demo('scrollTo', PAGE, 0);
  await h.frames();
  await demo('resetSelectionChanges');
  await demo('resetPointerCancels');
}

export async function runTouchSelectionScenario(context) {
  const h = helpers(context);
  const { demo, page, frames, find, check, capture, rest, selection, chrome, finger, tap, holdDown, holdThenLift, selectWord, dragHandle, scrollTop, handleOf, menuActions, menuItemPoint, rangeRect, caretX, stemMiddle, ballOf, inputState } = h;
  await openLab(h);

  // The browser's clipboard writes, with whether each came inside the user activation of the touch that caused it.
  await page.evaluate(() => {
    globalThis.__clipboardWrites = [];
    const write = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = (text) => {
      globalThis.__clipboardWrites.push({ text, active: navigator.userActivation.isActive });
      return write(text);
    };
  });
  const writes = () => page.evaluate(() => globalThis.__clipboardWrites);

  // --- Text: a touch is not a selection until it has been held, then it is the word under the finger.
  const brown = { start: P1.indexOf('brown'), end: P1.indexOf('brown') + 5 };
  const at = centreOf(await rangeRect('ts-p1', brown.start, brown.end));
  await finger.down(at);
  await rest(250);
  check('Before the hold has elapsed nothing is selected', (await selection()) === null);
  await rest(HELD_MS - 250);
  await frames();
  const word = await selection();
  check('A long press selects the word under the finger, offsets 10 to 15', word?.text === 'brown' && word.anchor.testID === 'ts-p1' && word.anchor.offset === 10 && word.focus.offset === 15, word);
  check('and tells the root with a selectionchange', (await demo('selectionChanges')) >= 1);
  check('and ends the finger\'s pointer events with a pointercancel', (await demo('pointerCancels')) === 1, await demo('pointerCancels'));
  const held = await chrome();
  check('The handles show while the finger is still down, and the menu waits', held?.owner?.kind === 'document' && held.handles.length === 2 && held.gesture === 'extending' && held.menu === null, held);
  await finger.up();
  check('Lifting keeps the selection and shows Copy and Select All', (await selection())?.text === 'brown' && (await menuActions()).join() === 'copy,selectAll', await menuActions());
  check('and the lift is no pointer event', (await demo('pointerCancels')) === 1);
  const start = await handleOf('start');
  const end = await handleOf('end');
  const startCaret = await demo('textCaret', 'ts-p1', brown.start, 'after');
  const endCaret = await demo('textCaret', 'ts-p1', brown.end, 'before');
  check('The start handle stands on the word\'s start and the end handle on its end', near(stemMiddle(start).x, startCaret.x) && near(start.stem.y, startCaret.y) && near(stemMiddle(end).x, endCaret.x), { start, startCaret });
  check('A handle hangs outside its line and is grabbed by a 44 px square', start.ball.y < start.stem.y && end.ball.y > end.stem.y + end.stem.height && start.target.width >= 44, start);
  await capture('touch-selection-01-word');
  const pixel = async (point) => {
    const image = await context.canvasImage();
    const scale = image.width / (await context.snapshot()).width;
    const offset = (Math.floor(point.y * scale) * image.width + Math.floor(point.x * scale)) * image.channels;
    return [image.pixels[offset], image.pixels[offset + 1], image.pixels[offset + 2]];
  };
  const closeTo = (pixelValue, expected) => pixelValue.every((channel, index) => Math.abs(channel - expected[index]) <= PIXEL_TOLERANCE);
  const menu = (await chrome()).menu;
  const ball = await pixel(ballOf(start));
  const body = await pixel({ x: menu.items[0].rect.x + 3, y: menu.items[0].rect.y + menu.items[0].rect.height / 2 });
  check('A handle is drawn in the selection\'s colour and the menu dark', closeTo(ball, HANDLE_RGB) && closeTo(body, MENU_RGB), { ball, body });

  // --- The handles move the ends, by characters.
  const fox = P1.indexOf('fox') + 3;
  await dragHandle('end', { x: await caretX('ts-p1', fox, 'before'), y: stemMiddle(end).y });
  let moved = await selection();
  check('Dragging the end handle right extends the selection to 19', moved?.text === 'brown fox' && moved.anchor.offset === 10 && moved.focus.offset === fox, moved);
  await capture('touch-selection-02-end-dragged');
  await dragHandle('end', { x: await caretX('ts-p1', 13, 'before'), y: stemMiddle(await handleOf('end')).y });
  moved = await selection();
  check('and left shrinks it to 13', moved?.text === 'bro' && moved.anchor.offset === 10 && moved.focus.offset === 13, moved);
  const quick = P1.indexOf('quick');
  await dragHandle('start', { x: await caretX('ts-p1', quick, 'after'), y: stemMiddle(await handleOf('start')).y });
  moved = await selection();
  check('The start handle moves the start to 4', moved?.text === 'quick bro' && moved.focus.offset === quick && moved.anchor.offset === 13, moved);
  const past = P1.indexOf('jumps');
  await dragHandle('start', { x: await caretX('ts-p1', past, 'after'), y: stemMiddle(await handleOf('start')).y });
  moved = await selection();
  check('A start handle dragged past the end flips the selection', moved?.text === P1.slice(13, past) && moved.anchor.offset === 13 && moved.focus.offset === past, moved);
  await dragHandle('end', { x: await caretX('ts-p1', 14, 'before'), y: stemMiddle(await handleOf('end')).y });
  await dragHandle('end', { x: await caretX('ts-p1', 13, 'before'), y: stemMiddle(await handleOf('end')).y });
  check('A handle never collapses the selection: one character is left', (await selection())?.text === P1.slice(13, 14), await selection());

  // --- Copy writes the browser's clipboard inside the touch's user activation, and leaves the selection.
  const before = (await selection()).text;
  const writesBefore = (await writes()).length;
  await tap(await menuItemPoint('copy'));
  await h.waitUntil('Copy wrote the clipboard', async () => (await writes()).length > writesBefore);
  const written = (await writes()).at(-1);
  check('Copy writes the selected text to the browser\'s clipboard, inside the touch\'s user activation', written.text === before && written.active === true, written);
  check('and keeps the selection and its handles, with the menu gone', (await selection())?.text === before && (await chrome()).handles.length === 2 && (await chrome()).menu === null);

  // --- A tap elsewhere clears; Select All selects every selectable text.
  await tap({ x: 2, y: 2 });
  check('A tap elsewhere clears the selection and hides the handles and menu', (await selection()) === null && (await chrome()) === undefined);
  await selectWord('ts-p1', brown.start, brown.end);
  await tap(await menuItemPoint('selectAll'));
  const all = await selection();
  check('Select All selects all the selectable text', all?.text.startsWith('The quick brown fox') && all.text.includes('Scrolling row 13') && all.text.endsWith('it does not select.'), all?.text.slice(0, 40));
  check('and the menu then offers Copy only', (await menuActions()).join() === 'copy', await menuActions());
  await capture('touch-selection-03-all');
  await tap(centreOf((await find('ts-readout')).rect));
  check('A tap on plain text clears it', (await selection()) === null && (await chrome()) === undefined);

  // --- A swipe still scrolls and selects nothing; a swipe keeps a selection.
  const page0 = await find(PAGE);
  check('The lab page scrolls', page0.scroll.maxScrollTop > PAN_FOLLOWED_PX, page0.scroll);
  const onText = centreOf((await find('ts-p2')).rect);
  await finger.down(onText);
  await finger.glide({ x: onText.x, y: onText.y - PAN_STEPS * PAN_STEP_PX }, PAN_STEPS);
  await rest(HELD_MS);
  check('A swipe that began on selectable text selects nothing, though the finger rests past the hold', (await selection()) === null && (await chrome()) === undefined);
  await finger.up();
  await rest(300);
  check('and scrolls the page by the finger\'s travel from the slop', near(await scrollTop(PAGE), PAN_FOLLOWED_PX, SCROLL_TOLERANCE_PX), await scrollTop(PAGE));
  await demo('scrollTo', PAGE, 0);
  await frames();
  const p2 = centreOf((await find('ts-p2')).rect);
  await finger.down(p2);
  await finger.glide({ x: p2.x + 30, y: p2.y }, 2);
  await finger.glide(p2, 2);
  await rest(HELD_MS);
  await finger.up();
  check('A finger that left the slop and came back selects nothing', (await selection()) === null);
  const space = P1.indexOf(' ', 'The quick'.length);
  const lastRect = await rangeRect('ts-p1', P1.length - 1, P1.length);
  for (const [name, point] of [['the space between two words', centreOf(await rangeRect('ts-p1', space, space + 1))], ['the empty room beside the last line', { x: lastRect.x + 90, y: lastRect.y + 6 }]]) {
    await holdDown(point);
    check(`A long press on ${name} selects nothing`, (await selection()) === null && (await chrome()) === undefined);
    await finger.up();
  }
  await selectWord('ts-p1', 10, 15);
  const endBefore = (await handleOf('end')).stem.y;
  const swipeFrom = centreOf((await find('ts-readout')).rect);
  await finger.down(swipeFrom);
  await finger.glide({ x: swipeFrom.x, y: swipeFrom.y - PAN_STEPS * PAN_STEP_PX }, PAN_STEPS);
  check('A swipe keeps the selection, and the menu steps aside while the page scrolls', (await selection())?.text === 'brown' && (await chrome()).menu === null);
  // The finger rests before it lifts, so nothing coasts: a flick would take the selection out of view (docs/tracks/dropdown-touch.md).
  await rest(300);
  await finger.up();
  await h.waitUntil('the menu is back once the page has stopped', async () => (await menuActions()).join() === 'copy,selectAll');
  check('The handles stay on the text as the page scrolls under them', near(endBefore - (await handleOf('end')).stem.y, await scrollTop(PAGE)), { endBefore, now: (await handleOf('end')).stem.y, scrolled: await scrollTop(PAGE) });
  await demo('scrollTo', PAGE, 0);
  await frames();
  await tap(centreOf((await find('ts-readout')).rect));

  // --- A long press in a draggable element is the drag's.
  const dragAt = centreOf((await find('ts-drag-text')).rect);
  await holdDown(dragAt);
  check('A long press inside a draggable element selects nothing and starts the drag', (await selection()) === null && (await context.snapshot()).drag.state === 'dragging', (await context.snapshot()).drag.state);
  await finger.up();

  // --- A text input: the soft keyboard stays up, and its element holds the selection.
  const fieldRect = (await find('ts-input')).rect;
  const y = fieldRect.y + fieldRect.height / 2;
  const word0 = (name) => ({ start: INPUT_VALUE.indexOf(name), end: INPUT_VALUE.indexOf(name) + name.length });
  const [beta, delta] = [word0('beta'), word0('delta')];
  const gammaEnd = INPUT_VALUE.indexOf('gamma') + 5;
  const xs = new Map();
  for (const offset of [beta.start, beta.end, gammaEnd, delta.start, delta.end]) xs.set(offset, (await demo('inputCaretAt', 'ts-input', offset)).x);
  await tap({ x: xs.get(beta.start) - 3, y });
  await h.waitUntil('the soft keyboard is up for the field', async () => (await context.keyboardElement())?.tag === 'INPUT');
  const mid = (word) => ({ x: (xs.get(word.start) + xs.get(word.end)) / 2, y });
  await holdDown(mid(beta));
  const during = await inputState('ts-input');
  check('A long press in a focused text input selects the word under the finger', during.start === beta.start && during.end === beta.end, during);
  check('as the input\'s own selection, with handles', (await chrome())?.owner?.kind === 'input' && (await chrome()).handles.length === 2 && (await selection()) === null);
  await finger.up();
  await h.waitUntil('the soft keyboard element is back with the finger\'s lift', async () => (await context.keyboardElement())?.tag === 'INPUT');
  let keyboard = await context.keyboardElement();
  check('The soft keyboard stays up through the selection, its element holding the field\'s text and the selected word', keyboard.value === INPUT_VALUE && keyboard.selectionStart === beta.start && keyboard.selectionEnd === beta.end, keyboard);
  check('The menu of an editable field has Cut, Copy, Paste and Select All', (await menuActions()).join() === 'cut,copy,paste,selectAll', await menuActions());
  await dragHandle('end', { x: xs.get(gammaEnd), y });
  const extended = await inputState('ts-input');
  check('Dragging the end handle extends the field\'s selection to 16', extended.start === beta.start && extended.end === gammaEnd, extended);
  await h.waitUntil('the soft keyboard element follows the selection', async () => {
    const element = await context.keyboardElement();
    return element?.selectionStart === beta.start && element.selectionEnd === gammaEnd;
  });
  check('The soft keyboard is still up after the handle was dragged', (await context.keyboardElement())?.tag === 'INPUT');
  await capture('touch-selection-05-input');
  const copies = (await writes()).length;
  await tap(await menuItemPoint('copy'));
  await h.waitUntil('Copy in a field wrote the clipboard', async () => (await writes()).length > copies);
  check('Copy in a field writes its selection inside the touch\'s user activation', (await writes()).at(-1).text === 'beta gamma' && (await writes()).at(-1).active === true, (await writes()).at(-1));
  check('and the soft keyboard is still up', (await context.keyboardElement())?.tag === 'INPUT');
  // The keyboard's next key replaces the selection: its element's selection and the field's are one.
  await h.waitUntil('the keyboard element holds the selection again', async () => (await context.keyboardElement())?.selectionEnd === gammaEnd);
  await page.keyboard.type('X');
  await h.waitUntil('a key of the soft keyboard replaces the selected words', async () => (await inputState('ts-input')).value === INPUT_VALUE.replace('beta gamma', 'X'));
  check('A key of the soft keyboard replaces the selected text', (await inputState('ts-input')).value === INPUT_VALUE.replace('beta gamma', 'X'), await inputState('ts-input'));
  check('and the handles went with the selection', (await chrome()) === undefined);
  // Paste puts the clipboard's text over a selected word.
  const deltaAt = (await demo('inputCaretAt', 'ts-input', INPUT_VALUE.replace('beta gamma', 'X').indexOf('delta') + 2)).x;
  await holdThenLift({ x: deltaAt, y });
  const pasteTarget = await inputState('ts-input');
  check('A long press selects "delta" in the edited field', pasteTarget.value.slice(pasteTarget.start, pasteTarget.end) === 'delta', pasteTarget);
  await tap(await menuItemPoint('paste'));
  await h.waitUntil('Paste read the clipboard and put its text in', async () => (await inputState('ts-input')).value.includes('beta gamma'));
  check('Paste puts the clipboard\'s text in place of the selection', (await inputState('ts-input')).value === INPUT_VALUE.replace('beta gamma', 'X').replace('delta', 'beta gamma'), await inputState('ts-input'));
  await tap(centreOf((await find('ts-readout')).rect));
}

/** A shorter run at a device pixel ratio of 2: the handles and the menu are drawn, in the right places and colours, and still work. */
export async function runTouchSelectionRetinaScenario(context) {
  const h = helpers(context);
  const { demo, check, capture, selection, chrome, finger, selectWord, handleOf, menuActions, ballOf, centreOf: centre } = h;
  await openLab(h);
  const brown = P1.indexOf('brown');
  await selectWord('ts-p1', brown, brown + 5);
  check('A long press selects the word at a device pixel ratio of 2', (await selection())?.text === 'brown', await selection());
  check('and shows the menu', (await menuActions()).join() === 'copy,selectAll');
  const start = await handleOf('start');
  const startCaret = await demo('textCaret', 'ts-p1', brown, 'after');
  check('The start handle stands on the word\'s start', near(start.stem.x + start.stem.width / 2, startCaret.x) && near(start.stem.y, startCaret.y), { start, startCaret });
  const image = await context.canvasImage();
  const scale = image.width / (await context.snapshot()).width;
  check('The canvas is drawn at twice the logical size', scale === 2, scale);
  const pixel = (point) => {
    const offset = (Math.floor(point.y * scale) * image.width + Math.floor(point.x * scale)) * image.channels;
    return [image.pixels[offset], image.pixels[offset + 1], image.pixels[offset + 2]];
  };
  const closeTo = (value, expected) => value.every((channel, index) => Math.abs(channel - expected[index]) <= PIXEL_TOLERANCE);
  const menu = (await chrome()).menu;
  check('A handle is the selection\'s colour and the menu dark', closeTo(pixel(ballOf(start)), HANDLE_RGB) && closeTo(pixel({ x: menu.items[0].rect.x + 3, y: menu.items[0].rect.y + menu.items[0].rect.height / 2 }), MENU_RGB), { ball: pixel(ballOf(start)) });
  await capture('touch-selection-07-retina');
  void finger; void centre;
  await h.tap({ x: 2, y: 2 });
  check('A tap elsewhere clears it', (await selection()) === null && (await chrome()) === undefined);
}
