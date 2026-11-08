import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement as h } from 'react';
import { createRoot, Text, useKeyClaims, View } from '../src';
import {
  anyChordMatches, chordMatches, isBrowserChord, parseKeyChord, parseKeyChords, parseKeyChordsOf, platformOf,
  type KeyPlatform, type PageKeyPress,
} from '../src/key-claims';
import { isPageEventTarget, KeyPassthrough, type PageEventTarget, type PageKeyboardEvent } from '../src/key-passthrough';
import { RecordingHost } from './recording-host';

const NO_SUBSCRIPTION = () => () => {};

/** A key press with every modifier off. */
function press(key: string, code: string, modifiers: Partial<PageKeyPress> = {}): PageKeyPress {
  return { key, code, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, isComposing: false, ...modifiers };
}

const CMD_R = press('r', 'KeyR', { metaKey: true });
const CTRL_R = press('r', 'KeyR', { ctrlKey: true });

// ---- The text of a chord ---------------------------------------------------------------------------------------

test('a chord is modifiers and a key, with the key in one spelling', () => {
  assert.deepEqual(parseKeyChord('Mod+S'), { key: 's', mod: true, ctrl: false, alt: false, shift: false, meta: false });
  assert.deepEqual(parseKeyChord('mod+shift+P'), { key: 'p', mod: true, ctrl: false, alt: false, shift: true, meta: false });
  assert.deepEqual(parseKeyChord('Ctrl+Alt+Shift+Meta+x'), { key: 'x', mod: false, ctrl: true, alt: true, shift: true, meta: true });
  assert.deepEqual(parseKeyChord('Control+Option+Command+z'), { key: 'z', mod: false, ctrl: true, alt: true, shift: false, meta: true });
  assert.equal(parseKeyChord('f5').key, 'F5');
  assert.equal(parseKeyChord('Mod+left').key, 'ArrowLeft');
  assert.equal(parseKeyChord('Mod+Esc').key, 'Escape');
  assert.equal(parseKeyChord('Mod+Return').key, 'Enter');
  assert.equal(parseKeyChord('Mod+PgUp').key, 'PageUp');
  assert.equal(parseKeyChord('Mod+Space').key, 'Space');
  assert.equal(parseKeyChord('Mod+/').key, '/');
  assert.equal(parseKeyChord('Mod+Plus').key, '+', 'the plus key is Plus, because + separates the parts');
  assert.equal(parseKeyChord('Mod+F24').key, 'F24');
});

test('text that is not a chord throws where it is written', () => {
  for (const [text, problem] of [
    ['', /empty/u],
    ['Mod+', /ends with a \+/u],
    ['+S', /empty part/u],
    ['Mod++S', /empty part/u],
    ['Hyper+S', /not a modifier/u],
    ['Mod+Mod+S', /twice/u],
    ['Mod+Ctrl+Ctrl+S', /twice/u],
    ['Mod+F25', /not a key name/u],
    ['Mod+Bogus', /not a key name/u],
    ['S+Mod', /not a modifier/u],
  ] as const) {
    assert.throws(() => parseKeyChord(text), problem, text);
  }
  assert.throws(() => parseKeyChords(['Mod+S', 'nope+S']), /not a modifier/u);
});

// ---- Matching a press ------------------------------------------------------------------------------------------

test('Mod is Cmd on a Mac and Ctrl elsewhere, and the modifiers must be exactly the chord\'s', () => {
  const save = parseKeyChord('Mod+S');
  assert.equal(chordMatches(save, press('s', 'KeyS', { metaKey: true }), 'mac'), true);
  assert.equal(chordMatches(save, press('s', 'KeyS', { ctrlKey: true }), 'mac'), false, 'Ctrl+S is not Cmd+S on a Mac');
  assert.equal(chordMatches(save, press('s', 'KeyS', { ctrlKey: true }), 'other'), true);
  assert.equal(chordMatches(save, press('s', 'KeyS', { metaKey: true }), 'other'), false, 'the Windows key is not the command modifier');
  assert.equal(chordMatches(save, press('S', 'KeyS', { metaKey: true, shiftKey: true }), 'mac'), false, 'Shift is part of the chord');
  assert.equal(chordMatches(save, press('s', 'KeyS', { metaKey: true, altKey: true }), 'mac'), false, 'so is Alt');
  assert.equal(chordMatches(save, press('s', 'KeyS'), 'mac'), false);
  const explicit = parseKeyChord('Mod+Ctrl+S');
  assert.equal(chordMatches(explicit, press('s', 'KeyS', { metaKey: true, ctrlKey: true }), 'mac'), true);
  assert.equal(chordMatches(explicit, press('s', 'KeyS', { ctrlKey: true }), 'other'), true, 'Mod and Ctrl are the one Ctrl there');
});

test('a key is matched by what it types and by where it is, so a layout, Shift and Option do not hide a chord', () => {
  // AZERTY: Cmd+Z is the key at W's place.
  assert.equal(chordMatches(parseKeyChord('Mod+Z'), press('z', 'KeyW', { metaKey: true }), 'mac'), true);
  assert.equal(chordMatches(parseKeyChord('Mod+W'), press('z', 'KeyW', { metaKey: true }), 'mac'), true);
  // Shift changes the character but not the key.
  assert.equal(chordMatches(parseKeyChord('Mod+Shift+/'), press('?', 'Slash', { metaKey: true, shiftKey: true }), 'mac'), true);
  assert.equal(chordMatches(parseKeyChord('Mod+Shift+?'), press('?', 'Slash', { metaKey: true, shiftKey: true }), 'mac'), true);
  // Option makes another character on a Mac: å is still the A key.
  assert.equal(chordMatches(parseKeyChord('Mod+Alt+A'), press('å', 'KeyA', { metaKey: true, altKey: true }), 'mac'), true);
  // A named key is itself, and so is a function key.
  assert.equal(chordMatches(parseKeyChord('Mod+ArrowLeft'), press('ArrowLeft', 'ArrowLeft', { metaKey: true }), 'mac'), true);
  assert.equal(chordMatches(parseKeyChord('F5'), press('F5', 'F5'), 'other'), true);
  assert.equal(chordMatches(parseKeyChord('Mod+Space'), press(' ', 'Space', { ctrlKey: true }), 'other'), true);
  assert.equal(chordMatches(parseKeyChord('Mod+1'), press('1', 'Digit1', { ctrlKey: true }), 'other'), true);
  assert.equal(chordMatches(parseKeyChord('Mod+Enter'), press('Enter', 'NumpadEnter', { ctrlKey: true }), 'other'), true);
  // A dead key or an input method's key names no key.
  assert.equal(chordMatches(parseKeyChord('Mod+S'), press('Dead', 'Quote', { metaKey: true }), 'mac'), false);
  assert.equal(anyChordMatches([parseKeyChord('Mod+K'), parseKeyChord('Mod+S')], press('s', 'KeyS', { metaKey: true }), 'mac'), true);
  assert.equal(anyChordMatches([], press('s', 'KeyS', { metaKey: true }), 'mac'), false);
});

// ---- What a browser might act on -------------------------------------------------------------------------------

test('a chord a browser acts on is the command modifier with a key, a function key, or a tab or history key', () => {
  const chords: Array<[string, KeyPlatform, PageKeyPress, boolean]> = [
    ['Cmd+R on a Mac', 'mac', CMD_R, true],
    ['Cmd+Shift+T on a Mac', 'mac', press('T', 'KeyT', { metaKey: true, shiftKey: true }), true],
    ['Cmd+Option+I on a Mac', 'mac', press('i', 'KeyI', { metaKey: true, altKey: true }), true],
    ['Cmd+Left on a Mac', 'mac', press('ArrowLeft', 'ArrowLeft', { metaKey: true }), true],
    ['Cmd+[ on a Mac', 'mac', press('[', 'BracketLeft', { metaKey: true }), true],
    ['Ctrl+R on a Mac is no chord (Ctrl+A is the caret to the line start)', 'mac', CTRL_R, false],
    ['Ctrl+Tab on a Mac', 'mac', press('Tab', 'Tab', { ctrlKey: true }), true],
    ['Ctrl+Shift+Tab on a Mac', 'mac', press('Tab', 'Tab', { ctrlKey: true, shiftKey: true }), true],
    ['Ctrl+PageDown on a Mac', 'mac', press('PageDown', 'PageDown', { ctrlKey: true }), true],
    ['Ctrl+Option+Tab on a Mac', 'mac', press('Tab', 'Tab', { ctrlKey: true, altKey: true }), false],
    ['Option+A on a Mac types å', 'mac', press('å', 'KeyA', { altKey: true }), false],
    ['Ctrl+R elsewhere', 'other', CTRL_R, true],
    ['Ctrl+Shift+I elsewhere', 'other', press('I', 'KeyI', { ctrlKey: true, shiftKey: true }), true],
    ['Ctrl+Tab elsewhere', 'other', press('Tab', 'Tab', { ctrlKey: true }), true],
    ['Ctrl+Alt+Q elsewhere is AltGr: it types a character', 'other', press('@', 'KeyQ', { ctrlKey: true, altKey: true }), false],
    ['Cmd+R elsewhere is the Windows key', 'other', CMD_R, false],
    ['Alt+Left elsewhere is back', 'other', press('ArrowLeft', 'ArrowLeft', { altKey: true }), true],
    ['Alt+Home elsewhere', 'other', press('Home', 'Home', { altKey: true }), true],
    ['Alt+A elsewhere', 'other', press('a', 'KeyA', { altKey: true }), false],
    ['F5', 'mac', press('F5', 'F5'), true],
    ['F12 with Shift', 'other', press('F12', 'F12', { shiftKey: true }), true],
    ['F24', 'other', press('F24', 'F24'), true],
    ['a letter', 'mac', press('r', 'KeyR'), false],
    ['Shift+A', 'other', press('A', 'KeyA', { shiftKey: true }), false],
    ['Tab', 'other', press('Tab', 'Tab'), false],
    ['Shift+Tab', 'mac', press('Tab', 'Tab', { shiftKey: true }), false],
    ['Escape', 'mac', press('Escape', 'Escape'), false],
    ['Backspace', 'other', press('Backspace', 'Backspace'), false],
    ['ArrowLeft', 'mac', press('ArrowLeft', 'ArrowLeft'), false],
    ['Meta by itself, down', 'mac', press('Meta', 'MetaLeft', { metaKey: true }), false],
    ['Control by itself, down', 'other', press('Control', 'ControlLeft', { ctrlKey: true }), false],
    ['Shift with Cmd held', 'mac', press('Shift', 'ShiftLeft', { metaKey: true, shiftKey: true }), false],
    ['Alt with Ctrl held', 'other', press('Alt', 'AltLeft', { ctrlKey: true, altKey: true }), false],
    ['a chord an input method is composing', 'mac', press('r', 'KeyR', { metaKey: true, isComposing: true }), false],
  ];
  for (const [name, platform, event, expected] of chords) {
    assert.equal(isBrowserChord(event, platform), expected, name);
  }
});

test('the platform is read from the navigator, new or old, and anything else is not a Mac', () => {
  assert.equal(platformOf({ platform: 'MacIntel' }), 'mac');
  assert.equal(platformOf({ platform: 'iPad' }), 'mac');
  assert.equal(platformOf({ platform: 'Win32' }), 'other');
  assert.equal(platformOf({ platform: 'Linux x86_64' }), 'other');
  assert.equal(platformOf({ userAgentData: { platform: 'macOS' }, platform: 'Win32' }), 'mac', 'the newer API wins');
  assert.equal(platformOf({ userAgentData: { platform: '' }, platform: 'MacIntel' }), 'mac');
  assert.equal(platformOf({}), 'other');
  assert.equal(platformOf(undefined), 'other');
});

// ---- The page's listeners --------------------------------------------------------------------------------------

interface Delivered {
  readonly type: 'keydown' | 'keyup';
  readonly code: string;
  /** Whether a listener stopped the event for the listeners after it. */
  stopped: boolean;
  /** Every listener that ran, in order, by the name it was registered under. */
  readonly ranListeners: string[];
}

/** A page: listeners in the order they were added, capture listeners before the others, and `stopImmediatePropagation` ending the run. */
class FakePage implements PageEventTarget {
  readonly listeners: Array<{ type: string; listener: (event: PageKeyboardEvent) => void; capture: boolean; name: string }> = [];
  private nextName = 'listener';

  addEventListener(type: string, listener: (event: PageKeyboardEvent) => void, capture: boolean): void {
    this.listeners.push({ type, listener, capture, name: this.nextName });
  }

  removeEventListener(type: string, listener: (event: PageKeyboardEvent) => void, capture: boolean): void {
    const index = this.listeners.findIndex(entry => entry.type === type && entry.listener === listener && entry.capture === capture);
    assert.notEqual(index, -1, `no ${type} listener to remove`);
    this.listeners.splice(index, 1);
  }

  /** Add a listener under a name, standing for a script of the page (the engine's canvas listener, a shell's handler). */
  script(type: 'keydown' | 'keyup', name: string, capture = false): void {
    this.nextName = name;
    this.addEventListener(type, () => {}, capture);
    this.nextName = 'listener';
  }

  count(type: string): number {
    return this.listeners.filter(entry => entry.type === type).length;
  }

  /** A key event: capture listeners first, then the rest, as the browser orders them for `window`. */
  key(type: 'keydown' | 'keyup', init: PageKeyPress): Delivered {
    const delivered: Delivered = { type, code: init.code, stopped: false, ranListeners: [] };
    const event: PageKeyboardEvent = { ...init, stopImmediatePropagation: () => { delivered.stopped = true; } };
    const ordered = [...this.listeners.filter(entry => entry.type === type && entry.capture), ...this.listeners.filter(entry => entry.type === type && !entry.capture)];
    for (const entry of ordered) {
      if (delivered.stopped) break;
      delivered.ranListeners.push(entry.name);
      entry.listener(event);
    }
    return delivered;
  }

  blur(): void {
    const event: PageKeyboardEvent = { ...press('', ''), stopImmediatePropagation() {} };
    for (const entry of this.listeners.filter(candidate => candidate.type === 'blur')) entry.listener(event);
  }
}

/** A root that claims the chords whose key `code` is listed. */
function claiming(...codes: string[]) {
  return { claims: (event: PageKeyPress) => codes.includes(event.code) };
}

test('an unclaimed browser chord is stopped for the engine, and its release with it', () => {
  const page = new FakePage();
  const passthrough = new KeyPassthrough(page, 'mac');
  passthrough.add(claiming(), true);
  assert.equal(passthrough.isListening, true);
  page.script('keydown', 'engine');
  assert.equal(page.key('keydown', press('Meta', 'MetaLeft', { metaKey: true })).stopped, false, 'a modifier by itself reaches the engine');
  const down = page.key('keydown', CMD_R);
  assert.equal(down.stopped, true, 'the engine never hears Cmd+R');
  assert.deepEqual(down.ranListeners, ['listener'], 'it was this decision that ran, and nothing after it');
  assert.deepEqual(passthrough.withheldCodes, ['KeyR']);
  assert.equal(page.key('keyup', press('r', 'KeyR', { metaKey: true })).stopped, true, 'nor its release');
  assert.deepEqual(passthrough.withheldCodes, []);
  assert.equal(page.key('keyup', press('Meta', 'MetaLeft')).stopped, false, 'the modifier the engine heard go down comes up there too');
});

test('a claimed chord and everything that is not a chord reach the engine', () => {
  const page = new FakePage();
  const passthrough = new KeyPassthrough(page, 'mac');
  passthrough.add(claiming('KeyA'), true);
  const claimed = page.key('keydown', press('a', 'KeyA', { metaKey: true }));
  assert.equal(claimed.stopped, false);
  assert.equal(page.key('keyup', press('a', 'KeyA', { metaKey: true })).stopped, false, 'the release of a key the engine heard reaches it');
  for (const plain of [press('a', 'KeyA'), press('Tab', 'Tab'), press('Escape', 'Escape'), press('ArrowLeft', 'ArrowLeft'), press('r', 'KeyR', { ctrlKey: true })]) {
    assert.equal(page.key('keydown', plain).stopped, false, plain.key);
    assert.equal(page.key('keyup', plain).stopped, false, plain.key);
  }
  assert.deepEqual(passthrough.withheldCodes, []);
});

test('a repeated chord goes on to the browser, and a release the engine did not need is not withheld twice', () => {
  const page = new FakePage();
  const passthrough = new KeyPassthrough(page, 'other');
  passthrough.add(claiming(), true);
  for (let repeat = 0; repeat < 3; repeat += 1) assert.equal(page.key('keydown', CTRL_R).stopped, true);
  assert.deepEqual(passthrough.withheldCodes, ['KeyR']);
  assert.equal(page.key('keyup', CTRL_R).stopped, true);
  assert.equal(page.key('keyup', CTRL_R).stopped, false, 'a second release has nothing to withhold');
});

test('a key that went to the browser and then to the engine keeps its release for the engine', () => {
  const page = new FakePage();
  const passthrough = new KeyPassthrough(page, 'mac');
  let claimed = false;
  passthrough.add({ claims: () => claimed }, true);
  assert.equal(page.key('keydown', CMD_R).stopped, true);
  // The page never saw the release (macOS sends none for a key pressed with Cmd), and the key is next pressed where the UI uses it.
  claimed = true;
  assert.equal(page.key('keydown', CMD_R).stopped, false);
  assert.deepEqual(passthrough.withheldCodes, [], 'the new press owns the release');
  assert.equal(page.key('keyup', CMD_R).stopped, false);
  // And the plain key: typed after a chord that went to the browser.
  claimed = false;
  assert.equal(page.key('keydown', CMD_R).stopped, true);
  assert.equal(page.key('keydown', press('r', 'KeyR')).stopped, false);
  assert.equal(page.key('keyup', press('r', 'KeyR')).stopped, false, 'the typed r is released in the engine that heard it');
});

test('losing the page forgets the releases that will never come', () => {
  const page = new FakePage();
  const passthrough = new KeyPassthrough(page, 'mac');
  passthrough.add(claiming(), true);
  page.key('keydown', press('t', 'KeyT', { metaKey: true }));
  assert.deepEqual(passthrough.withheldCodes, ['KeyT']);
  page.blur();
  assert.deepEqual(passthrough.withheldCodes, []);
  assert.equal(page.key('keyup', press('t', 'KeyT')).stopped, false);
});

test('the listeners are on while a root is registered, and a root with it off, or none, leaves every key to the engine', () => {
  const page = new FakePage();
  const passthrough = new KeyPassthrough(page, 'mac');
  assert.equal(page.listeners.length, 0, 'nothing listens before a root joins');
  const first = passthrough.add(claiming(), false);
  assert.equal(page.count('keydown'), 1);
  assert.equal(page.count('keyup'), 1);
  assert.equal(page.count('blur'), 1);
  assert.equal(page.key('keydown', CMD_R).stopped, false, 'a root with it off passes nothing');
  first.enabled = true;
  assert.equal(page.key('keydown', CMD_R).stopped, true);
  const second = passthrough.add(claiming('KeyR'), true);
  assert.equal(page.key('keydown', CMD_R).stopped, false, 'any root that claims it keeps it');
  first.remove();
  assert.equal(page.count('keydown'), 1, 'one root is left');
  second.remove();
  assert.equal(page.listeners.length, 0, 'the last root to go takes the listeners off');
  assert.equal(passthrough.isListening, false);
  const third = passthrough.add(claiming(), true);
  assert.equal(page.count('keydown'), 1, 'and they come back');
  third.remove();
});

test('a page with no keyboard to listen to costs nothing', () => {
  const passthrough = new KeyPassthrough(undefined, 'other');
  const registration = passthrough.add(claiming(), true);
  assert.equal(passthrough.isListening, false);
  registration.enabled = false;
  registration.remove();
  assert.equal(isPageEventTarget({}), false);
  assert.equal(isPageEventTarget(new FakePage()), true);
});

test('a claim that throws leaves the key to the engine and reaches the page as an error', () => {
  const page = new FakePage();
  const passthrough = new KeyPassthrough(page, 'mac');
  passthrough.add({ claims: () => { throw new Error('native refused'); } }, true);
  assert.throws(() => page.key('keydown', CMD_R), /native refused/u);
  assert.deepEqual(passthrough.withheldCodes, [], 'the chord was not stopped');
});

// ---- A root's claims -------------------------------------------------------------------------------------------

function mountedRoot(page: FakePage, platform: KeyPlatform = 'mac') {
  const host = new RecordingHost();
  const passthrough = new KeyPassthrough(page, platform);
  const root = createRoot(host, { subscribeToEvents: NO_SUBSCRIPTION, keyPassthroughPage: passthrough });
  return { host, root, passthrough };
}

function tagOf(root: ReturnType<typeof createRoot>, testID: string): number {
  const found = root.findByTestID(testID);
  assert.ok(found, `no ${testID}`);
  return found.id;
}

test('a root asks native first, then the focused element and its ancestors, then the app', () => {
  const page = new FakePage();
  const { host, root } = mountedRoot(page);
  root.render(h(View, { testID: 'outer', tabIndex: 0, keyClaims: ['Mod+K'] },
    h(View, { testID: 'inner', tabIndex: 0, keyClaims: ['Mod+Shift+P', 'F2'] }, h(Text, { testID: 'label' }, 'x')),
    h(View, { testID: 'sibling', tabIndex: 0, keyClaims: ['Mod+J'] })));
  const cmd = (key: string, code: string) => press(key, code, { metaKey: true });
  const stopped = (event: PageKeyPress) => page.key('keydown', event).stopped;

  assert.equal(stopped(cmd('k', 'KeyK')), true, 'nothing focused: nothing is claimed');
  assert.equal(stopped(cmd('j', 'KeyJ')), true);
  page.key('keyup', cmd('k', 'KeyK'));
  page.key('keyup', cmd('j', 'KeyJ'));

  host.focused = tagOf(root, 'inner');
  assert.equal(stopped(cmd('k', 'KeyK')), false, 'an ancestor of the focused element claims it');
  assert.equal(stopped(press('P', 'KeyP', { metaKey: true, shiftKey: true })), false, 'the focused element claims its own');
  assert.equal(stopped(press('F2', 'F2')), false);
  assert.equal(stopped(cmd('j', 'KeyJ')), true, 'a sibling\'s claim is not the focused element\'s');
  page.key('keyup', cmd('j', 'KeyJ'));
  assert.equal(stopped(cmd('p', 'KeyP')), true, 'Shift is part of the chord');
  page.key('keyup', cmd('p', 'KeyP'));

  host.focused = tagOf(root, 'sibling');
  assert.equal(stopped(cmd('j', 'KeyJ')), false);
  assert.equal(stopped(cmd('k', 'KeyK')), false, 'the sibling is inside the outer element too');

  host.nativeKeyClaims.add('KeyZ');
  host.focused = null;
  assert.equal(stopped(cmd('z', 'KeyZ')), false, 'native uses it (an input\'s undo)');
  assert.ok(host.calls.includes('claimsKeyChord'));
  root.unmount();
});

test('an app claims chords for the whole root, and releases them', () => {
  const page = new FakePage();
  const { root } = mountedRoot(page);
  root.render(h(View, { testID: 'plain' }));
  const palette = press('k', 'KeyK', { metaKey: true });
  assert.equal(page.key('keydown', palette).stopped, true);
  page.key('keyup', palette);
  const release = root.claimKeys(['Mod+K']);
  const releaseAgain = root.claimKeys(['Mod+K', 'Mod+Shift+K']);
  assert.equal(page.key('keydown', palette).stopped, false, 'whatever has focus');
  release();
  assert.equal(page.key('keydown', palette).stopped, false, 'the second claim still holds it');
  releaseAgain();
  assert.equal(page.key('keydown', palette).stopped, true);
  assert.throws(() => root.claimKeys(['Mod+Bogus']), /not a key name/u);
  root.unmount();
});

test('a chord that does not parse fails when the element is rendered', () => {
  const page = new FakePage();
  const { root } = mountedRoot(page);
  assert.throws(() => root.render(h(View, { testID: 'bad', keyClaims: ['Mod+Nope'] })), /Invalid key chord "Mod\+Nope"/u);
  root.unmount();
});

test('a root can turn the pass-through off and on, and leaves the page when it unmounts', () => {
  const page = new FakePage();
  const { root, passthrough } = mountedRoot(page);
  root.render(h(View, { testID: 'plain' }));
  assert.equal(page.key('keydown', CMD_R).stopped, true);
  page.key('keyup', CMD_R);
  root.setKeyPassthrough(false);
  assert.equal(page.key('keydown', CMD_R).stopped, false, 'as without the library: the engine gets every key');
  root.setKeyPassthrough(true);
  assert.equal(page.key('keydown', CMD_R).stopped, true);
  root.unmount();
  assert.equal(passthrough.isListening, false);
  assert.equal(page.listeners.length, 0);
});

test('a root made with the pass-through off starts with it off', () => {
  const page = new FakePage();
  const host = new RecordingHost();
  const root = createRoot(host, { subscribeToEvents: NO_SUBSCRIPTION, keyPassthrough: false, keyPassthroughPage: new KeyPassthrough(page, 'mac') });
  assert.equal(page.key('keydown', CMD_R).stopped, false);
  root.unmount();
});

test('a claim list is read once for as long as it is the same array', () => {
  const list = ['Mod+S', 'F2'];
  assert.equal(parseKeyChordsOf(list), parseKeyChordsOf(list));
  assert.notEqual(parseKeyChordsOf(list), parseKeyChordsOf([...list]));
  assert.deepEqual(parseKeyChordsOf(list).map(chord => chord.key), ['s', 'F2']);
});

test('a component claims chords for the root while it is mounted, and a list written inline does not churn the claim', () => {
  const page = new FakePage();
  const { root } = mountedRoot(page);
  let renders = 0;
  function Palette({ extra }: { extra: boolean }) {
    renders += 1;
    // A new array on every render, with the same chords.
    useKeyClaims(extra ? ['Mod+K', 'Mod+Shift+K'] : ['Mod+K']);
    return h(Text, { testID: 'palette' }, 'palette');
  }
  const palette = press('k', 'KeyK', { metaKey: true });
  const shifted = press('K', 'KeyK', { metaKey: true, shiftKey: true });
  assert.equal(page.key('keydown', palette).stopped, true, 'nothing claims it yet');
  page.key('keyup', palette);

  root.render(h(Palette, { extra: false }));
  assert.equal(page.key('keydown', palette).stopped, false, 'the mounted component claims it');
  root.render(h(Palette, { extra: false }));
  assert.equal(page.key('keydown', palette).stopped, false, 'and keeps it across a render');
  assert.equal(page.key('keydown', shifted).stopped, true, 'but not the chord it did not list');
  page.key('keyup', shifted);

  root.render(h(Palette, { extra: true }));
  assert.equal(page.key('keydown', shifted).stopped, false, 'a longer list claims the new chord');
  assert.ok(renders >= 3);

  root.render(h(Text, { testID: 'gone' }, 'gone'));
  assert.equal(page.key('keydown', palette).stopped, true, 'the claim goes with the component');
  assert.throws(() => root.render(h(function Bad() { useKeyClaims(['Mod+Bogus']); return null; })), /not a key name/u);
  root.unmount();
});
