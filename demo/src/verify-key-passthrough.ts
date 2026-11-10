import { Engine, InputEventKey, Key, LineEdit, Node, OS } from 'godot';
import type { InteractionInspection } from './verify-interaction';
import { assertionTally, parseVerifierEvent } from './verifier-input';

/**
 * The `key-passthrough` section, native half: what the root says it uses, asked the way the Web page asks,
 * with a DOM key (`code`, `key` and the modifiers) and no key press. The answer decides whether a chord goes to the browser, so it is checked
 * against what the root really does with the key, in the states the page can be in: a Godot control holding the keyboard, the root holding it
 * with nothing focused, a text input, a button, a plain focusable element. The Web half (`scripts/verify-key-passthrough-web.mjs`) checks the
 * listeners, the events the browser ends up with and what the engine hears.
 *
 * Nothing here presses a key at the engine except Tab, which moves focus; the questions are the point.
 */

const SETTLE_MS = 100;
const MIN_SETTLE_FRAMES = 2;
const FRAME_POLL_MS = 10;
/** The most Tab presses it takes to reach a stop of the lab; a bound, since the order is known. */
const MAX_TAB_STEPS = 20;

function assert(condition: unknown, message: string): asserts condition {
  assertionTally.count += 1;
  if (!condition) throw new Error(message);
}

async function settle(): Promise<void> {
  const startFrame = Engine.getProcessFrames();
  await new Promise(resolve => setTimeout(resolve, SETTLE_MS));
  while (Engine.getProcessFrames() - startFrame < MIN_SETTLE_FRAMES) {
    await new Promise(resolve => setTimeout(resolve, FRAME_POLL_MS));
  }
}

type Api = Pick<InteractionInspection, 'showLab' | 'snapshot' | 'find' | 'grabSurfaceFocus' | 'surfaceHasFocus' | 'claimsKeyChord' | 'focusedPath' | 'restoreDemo'>;

interface Chord {
  readonly code: string;
  readonly key: string;
  readonly shift?: boolean;
  readonly ctrl?: boolean;
  readonly alt?: boolean;
  readonly meta?: boolean;
}

function claims(api: Api, chord: Chord): boolean {
  return api.claimsKeyChord(chord.code, chord.key, chord.shift === true, chord.ctrl === true, chord.alt === true, chord.meta === true);
}

/** The platform's command modifier, the way the engine's own `InputMap` has it. */
const ON_MAC = ['macos', 'web_macos', 'ios', 'web_ios'].some(feature => OS.hasFeature(feature));
const COMMAND = ON_MAC ? { meta: true } : { ctrl: true };

const letter = (name: string, modifiers: Partial<Chord> = {}): Chord => ({ code: `Key${name.toUpperCase()}`, key: name, ...modifiers });

/** Chords a browser acts on and no part of the lab does. */
const BROWSER_ONLY: ReadonlyArray<readonly [string, Chord]> = [
  ['reload', letter('r', COMMAND)],
  ['the address bar', letter('l', COMMAND)],
  ['a new tab', letter('t', COMMAND)],
  ['find', letter('f', COMMAND)],
  ['print', letter('p', COMMAND)],
  ['the tools', { code: 'KeyI', key: 'I', shift: true, ...COMMAND }],
  ['F5', { code: 'F5', key: 'F5' }],
  ['F11', { code: 'F11', key: 'F11' }],
  ['F12', { code: 'F12', key: 'F12' }],
  ['Ctrl+Tab', { code: 'Tab', key: 'Tab', ctrl: true }],
  ['a key the engine has no name for', { code: 'Unidentified', key: 'Unidentified', ...COMMAND }],
];

function tabStop(api: Api): string | undefined {
  const focused = api.snapshot().focused;
  if (focused === null) return undefined;
  const testID = api.snapshot().nodes.find(candidate => candidate.id === focused)?.props.testID;
  return typeof testID === 'string' ? testID : undefined;
}

async function tabTo(api: Api, testID: string): Promise<void> {
  for (let step = 0; step <= MAX_TAB_STEPS && tabStop(api) !== testID; step += 1) {
    for (const pressed of [true, false]) {
      const event = new InputEventKey();
      event.keycode = Key.KeyTab;
      event.physicalKeycode = Key.KeyTab;
      event.pressed = pressed;
      parseVerifierEvent(event);
      await settle();
    }
  }
  assert(tabStop(api) === testID, `Tab reaches ${testID}: ${tabStop(api)}`);
}

export async function verifyKeyPassthrough(owner: Node, api: Api): Promise<void> {
  api.showLab('key-passthrough');
  await settle();

  // A Godot control that is not a root holds the keyboard: native knows nothing of what it uses, so every key is its.
  const field = new LineEdit();
  owner.addChild(field);
  field.grabFocus();
  await settle();
  for (const [name, chord] of BROWSER_ONLY) {
    assert(claims(api, chord), `A control of the game's that holds the keyboard keeps ${name} from the browser`);
  }
  field.releaseFocus();
  owner.removeChild(field);
  field.free();
  await settle();

  // No control holds the keyboard: nothing is the root's to claim, not even select all.
  assert(!api.surfaceHasFocus(), 'With the control gone the root does not hold the keyboard');
  for (const [name, chord] of BROWSER_ONLY) assert(!claims(api, chord), `With nothing holding the keyboard ${name} goes to the browser`);
  assert(!claims(api, letter('a', COMMAND)), 'With nothing holding the keyboard select all is not the root\'s');
  assert(api.focusedPath().length === 0, 'Nothing is focused');

  // The root holds the keyboard and nothing in it is focused: the document's selection has select all, and nothing else.
  api.grabSurfaceFocus();
  await settle();
  assert(api.surfaceHasFocus(), 'The root holds the keyboard');
  for (const [name, chord] of BROWSER_ONLY) assert(!claims(api, chord), `With nothing focused ${name} goes to the browser`);
  assert(claims(api, letter('a', COMMAND)), 'The document\'s text selection has select all');
  assert(!claims(api, letter('c', COMMAND)), 'and copy only while something is selected');

  // A focused text input uses its editing chords, whatever they are bound to, and the clipboard and select all with either modifier.
  await tabTo(api, 'kp-input');
  const input = api.find('kp-input');
  assert(input !== undefined && api.focusedPath()[0] === input.id, `The path of the focus starts at the input: ${api.focusedPath().join(',')}`);
  assert(api.focusedPath().length > 1, 'and goes up through the lab');
  for (const name of ['a', 'c', 'x', 'v']) {
    assert(claims(api, letter(name, { ctrl: true })), `A text input uses Ctrl+${name}`);
    assert(claims(api, letter(name, { meta: true })), `A text input uses Cmd+${name}`);
  }
  assert(claims(api, letter('z', COMMAND)), 'A text input undoes');
  assert(claims(api, letter('z', { ...COMMAND, shift: true })), 'and redoes');
  assert(!claims(api, letter('z', { ...COMMAND, alt: true })), 'but not Z with Alt as well');
  assert(claims(api, { code: 'Backspace', key: 'Backspace', ...(ON_MAC ? { alt: true } : { ctrl: true }) }), 'A text input deletes a word');
  assert(claims(api, { code: 'ArrowLeft', key: 'ArrowLeft', ...(ON_MAC ? { alt: true } : { ctrl: true }) }), 'and moves by a word');
  for (const [name, chord] of BROWSER_ONLY) assert(!claims(api, chord), `A text input leaves ${name} to the browser`);
  assert(!claims(api, letter('a', { ...COMMAND, shift: true })), 'Select all with Shift is not select all');

  // A focused button is pressed by Enter and Space, with or without a modifier, and uses nothing else.
  await tabTo(api, 'kp-focus-input');
  assert(claims(api, { code: 'Enter', key: 'Enter' }), 'A button uses Enter');
  assert(claims(api, { code: 'Space', key: ' ' }), 'and Space');
  assert(claims(api, { code: 'Enter', key: 'Enter', ...COMMAND }), 'whatever modifier is down');
  for (const [name, chord] of BROWSER_ONLY) assert(!claims(api, chord), `A button leaves ${name} to the browser`);

  // A focused element of no particular kind: select all is the document's, and what it declares is JavaScript's to say (the Web half).
  await tabTo(api, 'kp-panel');
  const panel = api.find('kp-panel');
  assert(panel !== undefined && api.focusedPath()[0] === panel.id, 'The path of the focus starts at the panel');
  assert(!claims(api, letter('k', COMMAND)), 'Native does not know the panel\'s claim; the root asks the element');
  assert(!claims(api, { code: 'Enter', key: 'Enter' }), 'and Enter is not a button\'s there');
  for (const [name, chord] of BROWSER_ONLY) assert(!claims(api, chord), `A panel leaves ${name} to the browser`);

  api.restoreDemo();
  await settle();
}
