// The `key-passthrough` section of the Web interaction verifier (docs/tracks/key-passthrough.md): key chords that nothing in the UI claims reach
// the browser, and the ones it claims stay with the UI. Real Chrome, driven by its own keyboard through puppeteer (CDP, headless: no OS input).
//
// What the browser does with a key is decided when the key's event has finished being dispatched: it acts unless something called
// `preventDefault()`. So the section reads the event after dispatch, and reads what the engine heard:
//
// - a recorder in the page, which sees every key event twice over: a `window` listener in the bubble phase, which runs after the engine's own
//   listeners and is reached only by an event nothing stopped, and the call of `stopImmediatePropagation()` itself, which is how the library
//   keeps an event from the engine. Each event object is kept, so `defaultPrevented` is read at the end of the event, as the browser reads it;
// - the engine: `Input.is_key_pressed` for a key that must not stay down, the keys the game's `_unhandled_input` was given, and the keys that
//   reached the UI's own listener (the lab's log).
//
// A chord is run as a hand does it: the modifier down, the key down, the key up, the modifier up. The recorder never calls `preventDefault()`
// itself, so what it reads is what the page decided. Headless Chrome has no accelerator to act on a chord that reached it (Cmd+R does not reload the
// page the verifier is driving), which the section does not rely on: it reads the event, not the page after it.

/** Godot's `Key` values (core/os/keyboard.h): letters are their ASCII codes and special keys are `KEY_SPECIAL | n`. */
const KEY_SPECIAL = 1 << 22;
const KEY_TAB = KEY_SPECIAL | 0x02;
const KEY_CTRL = KEY_SPECIAL | 0x16;
const KEY_META = KEY_SPECIAL | 0x17;
const KEY_F5 = KEY_SPECIAL | 0x20;
const KEY_F12 = KEY_SPECIAL | 0x27;
const letterKey = (letter) => letter.charCodeAt(0);
/** The text the lab's input starts with. */
const INPUT_START = 'Select this and try Cmd+A, Cmd+C, Cmd+Z';
/** The width under which the navigator has no Code button. */
const PHONE_BREAKPOINT_PX = 768;
/**
 * The scenario presses the first line of the lab's source that has a few words on it, this far into the line: a line's element is as wide as the
 * code's widest line, which can be wider than the window, so the middle of the element is no place to press.
 */
const CLICK_LINE_MIN_CHARACTERS = 10;
const LINE_PRESS_INSET_PX = 40;

/** Install the recorder in the page, or clear the one that is there: every key event, whether the page's listeners got it or `stopImmediatePropagation()` kept it. */
async function installRecorder(page) {
  await page.evaluate(() => {
    if (globalThis.__keyRecorder !== undefined) {
      globalThis.__keyRecorder.entries.length = 0;
      return;
    }
    const entries = [];
    const original = Event.prototype.stopImmediatePropagation;
    Event.prototype.stopImmediatePropagation = function stopImmediatePropagation() {
      if (this instanceof KeyboardEvent) entries.push({ outcome: 'stopped', event: this });
      return original.call(this);
    };
    for (const type of ['keydown', 'keyup']) {
      window.addEventListener(type, event => entries.push({ outcome: 'reached', event }), false);
    }
    globalThis.__keyRecorder = { entries };
  });
}

/** What happened to each key event since the recorder was cleared, read now, after the events finished: `reached` or `stopped`, and whether the page prevented it. */
async function recorded(page) {
  return page.evaluate(() => globalThis.__keyRecorder.entries.map(({ outcome, event }) => ({
    type: event.type, code: event.code, key: event.key, repeat: event.repeat, outcome, defaultPrevented: event.defaultPrevented,
  })));
}

/** The steps both halves share: pressing chords and asking what became of them. */
function keyHelpers(context, { modifierName }) {
  const { demo, page, frames, check, text } = context;
  const events = (all, type, code) => all.filter(entry => entry.type === type && entry.code === code);
  const clear = async () => {
    await page.evaluate(() => { globalThis.__keyRecorder.entries.length = 0; });
    await demo('resetPassthrough');
  };
  /** A chord as a hand does it. `held` are the modifiers, outermost first; `key` is a puppeteer key name. */
  const chord = async (held, key) => {
    for (const modifier of held) await page.keyboard.down(modifier);
    await page.keyboard.down(key);
    await page.keyboard.up(key);
    for (const modifier of [...held].reverse()) await page.keyboard.up(modifier);
    await frames();
  };
  /**
   * The key `code` was kept from the engine, whole: its press was stopped and not prevented (so the browser acts on it), its release was withheld
   * too, and neither the game's `_unhandled_input` nor the UI's own listener heard it.
   */
  const wentToTheBrowser = async (name, held, key, code, keycode, logId = 'kp-log') => {
    const checkLog = logId !== undefined && logId !== null && logId !== false;
    const logBefore = checkLog ? await text(logId) : undefined;
    await clear();
    await chord(held, key);
    const all = await recorded(page);
    const downs = events(all, 'keydown', code);
    const ups = events(all, 'keyup', code);
    check(`${name}: the page gets the press, stopped for the engine, and nothing prevented it, so the browser acts on it`,
      downs.length === 1 && downs.every(entry => entry.outcome === 'stopped' && entry.defaultPrevented === false), downs);
    check(`${name}: the release is kept from the engine too`, ups.length === 1 && ups.every(entry => entry.outcome === 'stopped'), ups);
    const heard = (await demo('passthrough')).unhandledKeys[keycode] ?? 0;
    check(`${name}: the engine did not hear it`, heard === 0, { heard });
    if (checkLog) check(`${name}: and the UI's own listener did not either`, (await text(logId)) === logBefore, { before: logBefore, after: await text(logId) });
    return all;
  };
  /** The key `code` reached the engine and was prevented, as every key was before this track. */
  const stayedWithTheEngine = async (name, held, key, code) => {
    await clear();
    await chord(held, key);
    const all = await recorded(page);
    const downs = events(all, 'keydown', code);
    const ups = events(all, 'keyup', code);
    check(`${name}: the engine gets the press and prevents it`, downs.length === 1 && downs.every(entry => entry.outcome === 'reached' && entry.defaultPrevented), downs);
    check(`${name}: and the release`, ups.length === 1 && ups.every(entry => entry.outcome === 'reached' && entry.defaultPrevented), ups);
    return all;
  };
  const nothingStuck = async (name, keycodes) => {
    const down = [];
    for (const keycode of keycodes) if (await demo('keyPressed', keycode)) down.push(keycode);
    check(`${name}: no key is left down in the engine`, down.length === 0, down);
  };
  return { events, clear, chord, wentToTheBrowser, stayedWithTheEngine, nothingStuck, modifierName };
}

export async function runKeyPassthroughScenario(context) {
  const { demo, page, frames, snapshot, find, check, waitUntil, text, click, nodeExists } = context;
  const mac = await page.evaluate(() => /Mac|iPhone|iPad|iPod/u.test(navigator.platform));
  /** The platform's command modifier, as puppeteer names the key, and the engine's code for it. */
  const command = mac ? 'Meta' : 'Control';
  const commandCode = mac ? 'MetaLeft' : 'ControlLeft';
  const commandKey = mac ? KEY_META : KEY_CTRL;
  const h = keyHelpers(context, { modifierName: mac ? 'Cmd' : 'Ctrl' });
  const { events, clear, wentToTheBrowser, stayedWithTheEngine, nothingStuck } = h;
  const cmd = h.modifierName;

  await demo('showLab', 'key-passthrough');
  await waitUntil('the key pass-through lab', () => nodeExists('key-passthrough-lab'));
  await installRecorder(page);

  const inputState = async () => (await find('kp-input')).textInput;
  const focused = async (testID) => (await snapshot()).focused === (await find(testID)).id;
  const stuckKeys = [commandKey, letterKey('R'), letterKey('T'), letterKey('L'), letterKey('F'), letterKey('I'), KEY_F5, KEY_F12, KEY_TAB];

  // ---- Nothing focused: the browser's chords are the browser's -----------------------------------------------------------------
  await click('kp-clear-focus');
  await waitUntil('nothing is focused', async () => (await snapshot()).focused === null);
  check('With nothing focused the root does not hold the keyboard', !(await demo('surfaceHasFocus')));

  // The positive control: a modifier the engine does hear is seen by every observation, so the silence about the chords below means something.
  await clear();
  await page.keyboard.down(command);
  await frames();
  const modifierDown = await recorded(page);
  check('A modifier by itself reaches the engine, which prevents it', modifierDown.length === 1 && modifierDown[0].outcome === 'reached' && modifierDown[0].defaultPrevented, modifierDown);
  check('and the engine reports it down (so the constant for it is the engine\'s)', await demo('keyPressed', commandKey));
  await page.keyboard.up(command);
  await frames();
  check('and up again', !(await demo('keyPressed', commandKey)));

  const reload = await wentToTheBrowser(`${cmd}+R with nothing focused`, [command], 'KeyR', 'KeyR', letterKey('R'), undefined);
  check(`${cmd}+R: the modifier reached the engine on its way, down and up`,
    events(reload, 'keydown', commandCode).concat(events(reload, 'keyup', commandCode)).length === 2
    && events(reload, 'keydown', commandCode).concat(events(reload, 'keyup', commandCode)).every(entry => entry.outcome === 'reached'), reload);
  await nothingStuck(`After ${cmd}+R`, stuckKeys);
  await wentToTheBrowser(`${cmd}+L with nothing focused`, [command], 'KeyL', 'KeyL', letterKey('L'), null);
  await wentToTheBrowser(`${cmd}+T with nothing focused`, [command], 'KeyT', 'KeyT', letterKey('T'), null);
  await wentToTheBrowser(`${cmd}+F with nothing focused`, [command], 'KeyF', 'KeyF', letterKey('F'), null);
  await wentToTheBrowser(`${cmd}+Shift+I with nothing focused`, [command, 'Shift'], 'KeyI', 'KeyI', letterKey('I'), null);
  await wentToTheBrowser('F5 with nothing focused', [], 'F5', 'F5', KEY_F5, null);
  await wentToTheBrowser('F12 with nothing focused', [], 'F12', 'F12', KEY_F12, null);
  await nothingStuck('After the chords', stuckKeys);

  // Repetition and order. A chord held down repeats its key; a modifier let go first still leaves the key's release for the browser.
  await clear();
  await page.keyboard.down(command);
  await page.keyboard.down('KeyR');
  await page.keyboard.down('KeyR');
  await page.keyboard.down('KeyR');
  await page.keyboard.up(command);
  await page.keyboard.up('KeyR');
  await frames();
  const held = await recorded(page);
  const repeats = events(held, 'keydown', 'KeyR');
  check('A held chord repeats, and every repeat goes to the browser', repeats.length === 3 && repeats.every(entry => entry.outcome === 'stopped' && !entry.defaultPrevented) && repeats.some(entry => entry.repeat), repeats);
  check('A modifier let go first still leaves the key\'s release withheld', events(held, 'keyup', 'KeyR').length === 1 && events(held, 'keyup', 'KeyR').every(entry => entry.outcome === 'stopped'), events(held, 'keyup', 'KeyR'));
  check('and the modifier\'s release reached the engine', events(held, 'keyup', commandCode).length === 1 && events(held, 'keyup', commandCode).every(entry => entry.outcome === 'reached'), held);
  await nothingStuck('After a held chord with the modifier let go first', stuckKeys);

  if (mac) {
    // Ctrl is no command modifier on a Mac: Ctrl+R is not a browser chord, and the engine has it as ever.
    await stayedWithTheEngine('Ctrl+R on a Mac (not a chord)', ['Control'], 'KeyR', 'KeyR');
  }
  await stayedWithTheEngine('A plain letter', [], 'KeyQ', 'KeyQ');
  await stayedWithTheEngine('Escape', [], 'Escape', 'Escape');

  // ---- A focused text input uses its own chords and leaves the rest ------------------------------------------------------------
  await click('kp-focus-input');
  await waitUntil('the input has focus', () => focused('kp-input'));
  check('The input starts with its text', (await inputState()).value === INPUT_START, await inputState());
  await stayedWithTheEngine('A letter typed in the input', [], 'KeyQ', 'KeyQ');
  check('The letter was typed', (await inputState()).value === `${INPUT_START}q`, await inputState());
  await stayedWithTheEngine(`${cmd}+Z in the input`, [command], 'KeyZ', 'KeyZ');
  check('Undo took the letter back', (await inputState()).value === INPUT_START, await inputState());
  await stayedWithTheEngine(`${cmd}+A in the input`, [command], 'KeyA', 'KeyA');
  const selected = await inputState();
  check('Select all selected the text', selected.selectionStart === 0 && selected.selectionEnd === INPUT_START.length, selected);
  await stayedWithTheEngine(`${cmd}+C in the input`, [command], 'KeyC', 'KeyC');
  await waitUntil('the copy reaches the browser\'s clipboard', async () => (await page.evaluate(() => navigator.clipboard.readText())) === INPUT_START);
  check('The input\'s text is the clipboard\'s', true, INPUT_START);
  await stayedWithTheEngine(`${cmd}+Shift+Z in the input`, [command, 'Shift'], 'KeyZ', 'KeyZ');
  await stayedWithTheEngine(`${cmd}+Left in the input`, [command], 'ArrowLeft', 'ArrowLeft');
  await stayedWithTheEngine(`${cmd}+Backspace in the input`, [command], 'Backspace', 'Backspace');
  // The engine's input method element holds DOM focus while an input has the keyboard, so the chords below reach the page through it.
  await waitUntil('the IME element holds browser focus', async () => page.evaluate(() => document.activeElement?.className === 'ime'));
  const focusOwner = await page.evaluate(() => ({ tag: document.activeElement?.tagName, className: document.activeElement?.className }));
  check('The engine\'s input method element holds DOM focus while the input has the keyboard', focusOwner.className === 'ime', focusOwner);

  const valueBeforeChords = (await inputState()).value;
  const inInput = await wentToTheBrowser(`${cmd}+R in the input`, [command], 'KeyR', 'KeyR', letterKey('R'));
  check(`${cmd}+R in the input did not edit it`, (await inputState()).value === valueBeforeChords, { before: valueBeforeChords, after: await inputState() });
  check('and its modifier went to the engine', events(inInput, 'keydown', commandCode).every(entry => entry.outcome === 'reached'), inInput);
  await wentToTheBrowser(`${cmd}+F in the input`, [command], 'KeyF', 'KeyF', letterKey('F'));
  await wentToTheBrowser('F5 in the input', [], 'F5', 'F5', KEY_F5);
  await wentToTheBrowser('Ctrl+Tab in the input', ['Control'], 'Tab', 'Tab', KEY_TAB);
  await nothingStuck('After the chords in the input', stuckKeys);
  check('The chords did not edit the input', (await inputState()).value === valueBeforeChords, { before: valueBeforeChords, after: await inputState() });
  await stayedWithTheEngine('A letter typed in the input after the chords', [], 'KeyW', 'KeyW');
  check('and it was typed: the input still has the keyboard', (await inputState()).value.length === valueBeforeChords.length + 1 && (await inputState()).value.includes('w'), { before: valueBeforeChords, after: await inputState() });

  // Tab moves focus, as before.
  const before = (await snapshot()).focused;
  await stayedWithTheEngine('Tab in the input', [], 'Tab', 'Tab');
  check('Tab moved the focus', (await snapshot()).focused !== before, { before, after: (await snapshot()).focused });

  // ---- An element's own claim, and the app's -----------------------------------------------------------------------------------
  await click('kp-focus-panel');
  await waitUntil('the panel has focus', () => focused('kp-panel'));
  await stayedWithTheEngine(`${cmd}+K in the panel that claims it`, [command], 'KeyK', 'KeyK');
  check('and the panel used it', (await text('kp-panel-uses')) === 'Cmd+K used here 1 times', await text('kp-panel-uses'));
  await wentToTheBrowser(`${cmd}+Shift+K in the panel (not its chord)`, [command, 'Shift'], 'KeyK', 'KeyK', letterKey('K'));
  await stayedWithTheEngine(`${cmd}+J in the panel, which the page claims wherever focus is`, [command], 'KeyJ', 'KeyJ');
  check('and the page used it', (await text('kp-page-uses')).endsWith('used 1 times'), await text('kp-page-uses'));
  await click('kp-focus-plain');
  await waitUntil('the plain box has focus', () => focused('kp-plain'));
  await wentToTheBrowser(`${cmd}+K in the box that claims nothing`, [command], 'KeyK', 'KeyK', letterKey('K'));
  check('and the panel did not use it', (await text('kp-panel-uses')) === 'Cmd+K used here 1 times', await text('kp-panel-uses'));
  await stayedWithTheEngine(`${cmd}+J in the plain box`, [command], 'KeyJ', 'KeyJ');
  check('and the page used it again', (await text('kp-page-uses')).endsWith('used 2 times'), await text('kp-page-uses'));
  await click('kp-focus-input');
  await waitUntil('the input has focus again', () => focused('kp-input'));
  await stayedWithTheEngine(`${cmd}+J in the input`, [command], 'KeyJ', 'KeyJ');
  check('and the page used it a third time', (await text('kp-page-uses')).endsWith('used 3 times'), await text('kp-page-uses'));

  // ---- The control: with the pass-through off every key is the engine's, as before this track ---------------------------------
  await demo('setKeyPassthrough', false);
  await click('kp-clear-focus');
  await waitUntil('nothing is focused again', async () => (await snapshot()).focused === null);
  await stayedWithTheEngine(`${cmd}+R with the pass-through off`, [command], 'KeyR', 'KeyR');
  check('and the engine heard it this time', ((await demo('passthrough')).unhandledKeys[letterKey('R')] ?? 0) > 0, (await demo('passthrough')).unhandledKeys);
  await stayedWithTheEngine('F5 with the pass-through off', [], 'F5', 'F5');
  await demo('setKeyPassthrough', true);
  await wentToTheBrowser(`${cmd}+R with the pass-through on again`, [command], 'KeyR', 'KeyR', letterKey('R'), undefined);

  await demo('restoreDemo');
  await frames();
}

/**
 * The code editor's chords stay with the editor, and the browser's chords it has no use for go to the browser: its sink is a text input
 * that declares the chords of the editor's key table (`demo/src/editor/key-claims.ts`).
 */
export async function runKeyPassthroughEditorScenario(context) {
  const { demo, page, frames, snapshot, find, check, waitUntil, text, click, nodeExists, pagePoint } = context;
  const mac = await page.evaluate(() => /Mac|iPhone|iPad|iPod/u.test(navigator.platform));
  const command = mac ? 'Meta' : 'Control';
  const h = keyHelpers(context, { modifierName: mac ? 'Cmd' : 'Ctrl' });
  const { stayedWithTheEngine, wentToTheBrowser } = h;
  const cmd = h.modifierName;

  await demo('showNavigator', { initialLab: 'inputs' });
  await waitUntil('the navigator', () => nodeExists('lab-header'));
  if ((await snapshot()).width < PHONE_BREAKPOINT_PX) return;
  await click('toggle-code');
  await waitUntil('the first line of code', () => nodeExists('code-line-1'));
  await waitUntil('the caret', () => nodeExists('code-caret'));
  await installRecorder(page);

  const sourceLines = String(await demo('labSource', 'inputs')).split('\n');
  const clickLine = sourceLines.findIndex((line) => line.length >= CLICK_LINE_MIN_CHARACTERS) + 1;
  check('The lab\'s source has a line with words on it', clickLine > 0, clickLine);
  const pressLine = async () => {
    const line = (await find(`code-line-${clickLine}`)).rect;
    const at = await pagePoint(line.x + LINE_PRESS_INSET_PX, line.y + line.height / 2);
    await page.mouse.click(at.x, at.y);
    await frames();
  };
  await pressLine();
  await waitUntil('the editor\'s input has the focus', async () => (await snapshot()).focused === (await find('editor-input-sink')).id);
  const position = async () => text('code-status-position');
  const start = await position();
  await stayedWithTheEngine(`${cmd}+A in the editor`, [command], 'KeyA', 'KeyA');
  await stayedWithTheEngine(`${cmd}+L in the editor (select line)`, [command], 'KeyL', 'KeyL');
  await pressLine();
  const clicked = await position();
  await stayedWithTheEngine(`${cmd}+L in the editor (select line), from a caret`, [command], 'KeyL', 'KeyL');
  check(`${cmd}+L selected the line instead of going to the browser's address bar`, (await position()) !== clicked, { start, clicked, after: await position() });
  await stayedWithTheEngine(`${cmd}+D in the editor (select the next occurrence)`, [command], 'KeyD', 'KeyD');
  await stayedWithTheEngine(`${cmd}+Left in the editor`, [command], 'ArrowLeft', 'ArrowLeft');
  await stayedWithTheEngine(`${cmd}+Z in the editor`, [command], 'KeyZ', 'KeyZ');
  await wentToTheBrowser(`${cmd}+R in the editor`, [command], 'KeyR', 'KeyR', letterKey('R'), null);
  await wentToTheBrowser(`${cmd}+T in the editor`, [command], 'KeyT', 'KeyT', letterKey('T'), null);
  await wentToTheBrowser('F5 in the editor', [], 'F5', 'F5', KEY_F5, null);
  await wentToTheBrowser('F12 in the editor', [], 'F12', 'F12', KEY_F12, null);
  await frames();
  await demo('restoreDemo');
  await frames();
}
