// Which key chords the UI claims, and which chords a browser keeps for itself.
//
// On the Web the engine's key listeners `preventDefault()` every key, so a page built on the library could not reload, find or open a tab
// with the keyboard. A browser decides what a key does when its event has finished being dispatched, long before the engine's next frame
// runs the handlers that say whether the UI used it. The decision therefore has to be made ahead, from what is known at the moment the key
// goes down: this file is that knowledge. It has no engine and no DOM in it, so every rule is tested in Node.

/** The keyboard convention of the machine: the command modifier is Cmd on macOS (and iPadOS) and Ctrl elsewhere. */
export type KeyPlatform = 'mac' | 'other';

/** The fields of a key press that claims read. A DOM `KeyboardEvent` has all of them, and so has `UIKeyboardEvent`. */
export interface KeyPress {
  /** DOM `key`: the character the layout produced, else the key's name (`ArrowLeft`, `F5`). */
  readonly key: string;
  /** DOM `code`: the physical key (`KeyA`, `Slash`). */
  readonly code: string;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
}

/** A key press as a page's `keydown` listener sees it: the key, and whether an input method is composing it. */
export interface PageKeyPress extends KeyPress {
  readonly isComposing: boolean;
}

/**
 * A chord an element or an app claims: the keys it handles itself, so the browser must not. Parsed from the text `parseKeyChord` reads.
 * `mod` is the command modifier of the machine the chord is matched on (Cmd on macOS, Ctrl elsewhere), so one chord is right everywhere.
 */
export interface KeyChord {
  /** The key, in the one spelling `parseKeyChord` and `chordMatches` share: a single character in lower case, `Space`, or a DOM key name. */
  readonly key: string;
  readonly mod: boolean;
  readonly ctrl: boolean;
  readonly alt: boolean;
  readonly shift: boolean;
  readonly meta: boolean;
}

/** Keys that are not one character, by their DOM `key` value. */
const NAMED_KEYS = [
  'Enter', 'Tab', 'Backspace', 'Delete', 'Escape', 'Space', 'Insert', 'Home', 'End', 'PageUp', 'PageDown',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
] as const;
const FIRST_FUNCTION_KEY = 1;
const LAST_FUNCTION_KEY = 24;
const FUNCTION_KEYS = Array.from({ length: LAST_FUNCTION_KEY - FIRST_FUNCTION_KEY + 1 }, (_, index) => `F${index + FIRST_FUNCTION_KEY}`);
const FUNCTION_KEY = /^F([1-9]|1[0-9]|2[0-4])$/u;

/** Alternative spellings in a chord's text, by lower-case name. */
const KEY_ALIASES: Readonly<Record<string, string>> = {
  return: 'Enter', esc: 'Escape', del: 'Delete', ins: 'Insert', left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown',
  pgup: 'PageUp', pgdn: 'PageDown', pageup: 'PageUp', pagedown: 'PageDown', plus: '+',
};

/** The name of every key a chord can name, by lower case, for reading a chord's text. */
const CANONICAL_NAMES: ReadonlyMap<string, string> = new Map([...NAMED_KEYS, ...FUNCTION_KEYS].map(name => [name.toLowerCase(), name]));

const MODIFIER_NAMES = {
  mod: 'mod', command: 'meta', cmd: 'meta', meta: 'meta', control: 'ctrl', ctrl: 'ctrl', option: 'alt', alt: 'alt', shift: 'shift',
} as const satisfies Readonly<Record<string, 'mod' | 'ctrl' | 'alt' | 'shift' | 'meta'>>;

const CHORD_SEPARATOR = '+';

function isModifierName(name: string): name is keyof typeof MODIFIER_NAMES {
  return Object.hasOwn(MODIFIER_NAMES, name);
}

/** The number of code points in `text`: `key` of a character outside the BMP is two code units. */
function codePointCount(text: string): number {
  return [...text].length;
}

/**
 * The key a chord's last part names, in the spelling chords are compared in. A single character is itself, lower case; any other
 * part is a key name (`Enter`, `ArrowLeft`, `F5`, in any case, with the aliases above). `+` is `Plus`, because `+` separates the parts.
 */
function parseKeyName(part: string, text: string): string {
  if (codePointCount(part) === 1) return part === ' ' ? 'Space' : part.toLowerCase();
  const lower = part.toLowerCase();
  const key = KEY_ALIASES[lower] ?? CANONICAL_NAMES.get(lower);
  if (key === undefined) throw new Error(`Invalid key chord "${text}": "${part}" is not a key name (use a character, or a name such as Enter, ArrowLeft or F5)`);
  return key;
}

/**
 * Read a chord such as `Mod+S`, `Mod+Shift+/`, `Ctrl+ArrowLeft` or `F5`: modifiers (`Mod`, `Ctrl`, `Alt`, `Shift`, `Meta`, in any case, joined with
 * `+`) and then the key. `Mod` is Cmd on macOS and Ctrl elsewhere. Throws for text that is not a chord, so a typo fails where it is written.
 */
export function parseKeyChord(text: string): KeyChord {
  const parts = text.split(CHORD_SEPARATOR);
  const last = parts.pop();
  if (last === undefined || parts.some(part => part === '')) throw new Error(`Invalid key chord "${text}": empty part`);
  if (last === '') throw new Error(`Invalid key chord "${text}": ${text === '' ? 'it is empty' : 'it ends with a +; write the plus key as Plus'}`);
  const modifiers = { mod: false, ctrl: false, alt: false, shift: false, meta: false };
  for (const part of parts) {
    const name = part.toLowerCase();
    if (!isModifierName(name)) throw new Error(`Invalid key chord "${text}": "${part}" is not a modifier (Mod, Ctrl, Alt, Shift or Meta)`);
    const modifier = MODIFIER_NAMES[name];
    if (modifiers[modifier]) throw new Error(`Invalid key chord "${text}": ${part} twice`);
    modifiers[modifier] = true;
  }
  return { key: parseKeyName(last, text), ...modifiers };
}

/** Parse each chord of a list. */
export function parseKeyChords(texts: readonly string[]): readonly KeyChord[] {
  return texts.map(parseKeyChord);
}

const PUNCTUATION_BY_CODE: Readonly<Record<string, string>> = {
  Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: '\'',
  Comma: ',', Period: '.', Slash: '/',
};
const LETTER_CODE = /^Key([A-Z])$/u;
const DIGIT_CODE = /^Digit([0-9])$/u;
const NUMPAD_ENTER = 'NumpadEnter';

/** What a press's `key` value is called as a chord key, or `undefined` for a value that names no key (`Dead`, `Process`, `Unidentified`). */
function nameOfKeyValue(key: string): string | undefined {
  if (codePointCount(key) === 1) return key === ' ' ? 'Space' : key.toLowerCase();
  return CANONICAL_NAMES.get(key.toLowerCase());
}

/** What a press's `code` is called as a chord key: the character the physical key has with no modifier, so a layout and Shift do not change it. */
function nameOfCode(code: string): string | undefined {
  const letter = LETTER_CODE.exec(code)?.[1];
  if (letter !== undefined) return letter.toLowerCase();
  const digit = DIGIT_CODE.exec(code)?.[1];
  if (digit !== undefined) return digit;
  if (code === NUMPAD_ENTER) return 'Enter';
  return PUNCTUATION_BY_CODE[code] ?? CANONICAL_NAMES.get(code.toLowerCase());
}

/** Whether `chord`, on a machine of `platform`, is the press: the same modifiers exactly, and the key by what it types or by where it is. */
export function chordMatches(chord: KeyChord, press: KeyPress, platform: KeyPlatform): boolean {
  const command = chord.mod;
  const ctrl = chord.ctrl || (command && platform === 'other');
  const meta = chord.meta || (command && platform === 'mac');
  if (press.ctrlKey !== ctrl || press.metaKey !== meta || press.altKey !== chord.alt || press.shiftKey !== chord.shift) return false;
  return nameOfKeyValue(press.key) === chord.key || nameOfCode(press.code) === chord.key;
}

const parsedLists = new WeakMap<readonly string[], readonly KeyChord[]>();

/** The chords of a `keyClaims` list, parsed once for as long as the list is the same array. Throws for a chord that does not parse. */
export function parseKeyChordsOf(texts: readonly string[]): readonly KeyChord[] {
  let chords = parsedLists.get(texts);
  if (chords === undefined) {
    chords = parseKeyChords(texts);
    parsedLists.set(texts, chords);
  }
  return chords;
}

/** Whether any of `chords` is the press. */
export function anyChordMatches(chords: readonly KeyChord[], press: KeyPress, platform: KeyPlatform): boolean {
  return chords.some(chord => chordMatches(chord, press, platform));
}

/** The keys that only hold a modifier down. */
const MODIFIER_KEYS: ReadonlySet<string> = new Set(['Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'OS', 'CapsLock', 'Fn', 'FnLock']);
/** The keys a browser or an operating system uses with Ctrl to switch tabs, on a machine whose command modifier is not Ctrl. */
const TAB_SWITCH_KEYS: ReadonlySet<string> = new Set(['Tab', 'PageUp', 'PageDown']);
/** The keys a browser uses with Alt to move through history, on a machine whose command modifier is Ctrl. */
const HISTORY_KEYS: ReadonlySet<string> = new Set(['ArrowLeft', 'ArrowRight', 'Home']);

/**
 * Whether a key press is a chord a browser might act on: the command modifier with any key (Cmd+R, Cmd+L, Cmd+T, Cmd+F, Ctrl+Shift+I),
 * a function key (F5, F11, F12), Ctrl+Tab, Ctrl+PageUp and Ctrl+PageDown on a Mac, and Alt+Left, Alt+Right and Alt+Home elsewhere. Everything
 * else is the page's own: typing, caret movement, Tab, Escape, and Alt (Option) with a character, which types one on a Mac. A modifier by
 * itself is no chord, so a chord's modifier reaches the engine and the engine sees its release; so is anything an input method is composing.
 */
export function isBrowserChord(press: PageKeyPress, platform: KeyPlatform): boolean {
  if (press.isComposing || MODIFIER_KEYS.has(press.key)) return false;
  if (FUNCTION_KEY.test(press.key)) return true;
  if (platform === 'mac') {
    if (press.metaKey) return true;
    return press.ctrlKey && !press.altKey && TAB_SWITCH_KEYS.has(press.key);
  }
  // Ctrl with Alt is AltGr on many layouts: it types a character.
  if (press.ctrlKey) return !press.altKey;
  return press.altKey && HISTORY_KEYS.has(press.key);
}

/** Whether a Mac, an iPad or an iPhone: where the command modifier is Cmd. */
export function platformOf(navigatorValue: unknown): KeyPlatform {
  if (typeof navigatorValue !== 'object' || navigatorValue === null) return 'other';
  const data: unknown = Reflect.get(navigatorValue, 'userAgentData');
  const fromData = typeof data === 'object' && data !== null ? Reflect.get(data, 'platform') : undefined;
  const legacy: unknown = Reflect.get(navigatorValue, 'platform');
  const name = typeof fromData === 'string' && fromData !== '' ? fromData : legacy;
  return typeof name === 'string' && /mac|iphone|ipad|ipod/iu.test(name) ? 'mac' : 'other';
}
