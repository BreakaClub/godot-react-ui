import {
  defaultKeymap, historyKeymap, indentLess, selectLine,
} from '@codemirror/commands';
import {
  asEditorView, copySelection, cutSelection, insertIndent, selectNextOccurrence, type CommandContext, type EditorCommand,
} from './commands';
import { commandTargetFor } from './command-target';

/**
 * What a key press does in the editor. The table is CodeMirror's own (`defaultKeymap` and `historyKeymap`: arrows, word jumps,
 * Home and End, pages, Shift to select, select all and line, indent and outdent, comment, move and copy line, add a cursor,
 * undo and redo, delete by grapheme, word and line) plus Tab, Copy, Cut, "select next occurrence" and "select line" on the
 * command key. CodeMirror matches a binding against a DOM `KeyboardEvent` in `@codemirror/view`, which needs a DOM; this
 * matches it against the fields `UIKeyboardEvent` has.
 *
 * Alt jumps by word on macOS and Ctrl elsewhere, because the table says so (`Mod-ArrowLeft`, `mac: Alt-ArrowLeft`).
 */

export type Platform = 'mac' | 'other';

/** The fields of a key press the keymap reads; `UIKeyboardEvent` has them. */
export interface KeyChord {
  /** DOM `key`: the character the layout produced, else the key's name (`ArrowLeft`, `Enter`). */
  readonly key: string;
  /** DOM `code`: the physical key (`KeyA`, `Slash`); empty when the sender has none. */
  readonly code: string;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
}

/** A row of the key table: CodeMirror's `KeyBinding`, with the command taking the editor's context. */
export interface EditorBinding {
  readonly key?: string;
  readonly mac?: string;
  readonly win?: string;
  readonly linux?: string;
  readonly run: EditorCommand;
  /** The command that runs when Shift is held, under `Shift-` + the key. */
  readonly shift?: EditorCommand;
  /** Consume the key even when the command did nothing (an arrow key at the end of the text). */
  readonly preventDefault?: boolean;
}

export interface KeyHandler {
  readonly command: EditorCommand;
  readonly preventDefault: boolean;
}

type CodeMirrorBinding = (typeof defaultKeymap)[number];
type CodeMirrorCommand = NonNullable<CodeMirrorBinding['run']>;

/** Runs a CodeMirror command against the editor's stand-in for a view. */
export function codeMirrorCommand(command: CodeMirrorCommand): EditorCommand {
  return (context: CommandContext) => command(asEditorView(commandTargetFor(context.model, context.metrics)));
}

function adapt(binding: CodeMirrorBinding): EditorBinding | undefined {
  if (binding.run === undefined) return undefined;
  return {
    key: binding.key, mac: binding.mac, win: binding.win, linux: binding.linux,
    run: codeMirrorCommand(binding.run),
    shift: binding.shift === undefined ? undefined : codeMirrorCommand(binding.shift),
    preventDefault: binding.preventDefault,
  };
}

/** Bindings that are CodeMirror's for a DOM editor and mean nothing here: Tab focus mode has no browser focus order to leave. */
const NOT_BOUND = new Set(['Ctrl-m', 'Shift-Alt-m']);

const EXTRA_BINDINGS: readonly EditorBinding[] = [
  { key: 'Tab', run: insertIndent, shift: codeMirrorCommand(indentLess), preventDefault: true },
  { key: 'Mod-c', run: copySelection, preventDefault: true },
  { key: 'Mod-x', run: cutSelection, preventDefault: true },
  { key: 'Mod-d', run: selectNextOccurrence, preventDefault: true },
  { key: 'Mod-l', run: codeMirrorCommand(selectLine), preventDefault: true },
];

export const EDITOR_BINDINGS: readonly EditorBinding[] = [
  ...[...defaultKeymap, ...historyKeymap]
    .filter(binding => !NOT_BOUND.has(binding.mac ?? '') && !NOT_BOUND.has(binding.key ?? ''))
    .map(adapt)
    .filter((binding): binding is EditorBinding => binding !== undefined),
  ...EXTRA_BINDINGS,
];

const MODIFIER_SEPARATOR = /-(?!$)/u;

/** CodeMirror's `normalizeKeyName`: the modifiers as `Shift-Meta-Ctrl-Alt-` in front of the key; `Mod` is Cmd on macOS and Ctrl elsewhere. */
export function normalizeKeyName(name: string, platform: Platform): string {
  const parts = name.split(MODIFIER_SEPARATOR);
  const last = parts[parts.length - 1] ?? '';
  let result = last === 'Space' ? ' ' : last;
  let alt = false;
  let ctrl = false;
  let shift = false;
  let meta = false;
  for (const modifier of parts.slice(0, -1)) {
    if (/^(cmd|meta|m)$/iu.test(modifier)) meta = true;
    else if (/^a(lt)?$/iu.test(modifier)) alt = true;
    else if (/^(c|ctrl|control)$/iu.test(modifier)) ctrl = true;
    else if (/^s(hift)?$/iu.test(modifier)) shift = true;
    else if (/^mod$/iu.test(modifier)) {
      if (platform === 'mac') meta = true;
      else ctrl = true;
    } else throw new Error(`Unrecognized modifier name in key binding "${name}": ${modifier}`);
  }
  if (alt) result = `Alt-${result}`;
  if (ctrl) result = `Ctrl-${result}`;
  if (meta) result = `Meta-${result}`;
  if (shift) result = `Shift-${result}`;
  return result;
}

const PUNCTUATION_BY_CODE: Readonly<Record<string, string>> = {
  Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: '\'',
  Comma: ',', Period: '.', Slash: '/',
};
const LETTER_CODE = /^Key([A-Z])$/u;
const DIGIT_CODE = /^Digit([0-9])$/u;

/** The character a physical key has with no modifier, so that `Cmd+Shift+/` is the `/` key whatever the layout makes of Shift. */
function baseCharacter(chord: KeyChord): string {
  const letter = LETTER_CODE.exec(chord.code)?.[1];
  if (letter !== undefined) return letter.toLowerCase();
  const digit = DIGIT_CODE.exec(chord.code)?.[1];
  if (digit !== undefined) return digit;
  return PUNCTUATION_BY_CODE[chord.code] ?? chord.key.toLowerCase();
}

function modifierPrefix(chord: KeyChord, withShift: boolean): string {
  return `${withShift ? 'Shift-' : ''}${chord.metaKey ? 'Meta-' : ''}${chord.ctrlKey ? 'Ctrl-' : ''}${chord.altKey ? 'Alt-' : ''}`;
}

/**
 * The binding names a key press can match, most specific first. A named key (`ArrowLeft`) is itself, with `Shift-` when Shift is
 * down. A character key is a command chord only with Ctrl, Alt or Cmd down; on macOS, Alt alone makes another character (`Alt+a` is
 * `å`) and on Windows Ctrl+Alt is AltGr, so neither is.
 */
export function chordNames(chord: KeyChord, platform: Platform): string[] {
  const isCharacter = [...chord.key].length === 1;
  if (!isCharacter) return [`${modifierPrefix(chord, chord.shiftKey)}${chord.key}`];
  const commandModifier = chord.ctrlKey || chord.altKey || chord.metaKey;
  if (!commandModifier) return [];
  if (platform === 'mac' && chord.altKey && !chord.ctrlKey && !chord.metaKey) return [];
  if (platform === 'other' && chord.altKey && chord.ctrlKey) return [];
  const base = baseCharacter(chord);
  const names = [`${modifierPrefix(chord, chord.shiftKey)}${base}`, `${modifierPrefix(chord, false)}${chord.key}`];
  if (chord.shiftKey) names.push(`${modifierPrefix(chord, false)}${chord.key.toUpperCase()}`);
  return [...new Set(names)];
}

export class Keymap {
  private readonly handlers = new Map<string, KeyHandler>();
  private readonly platform: Platform;
  /** Names bound more than once; the later binding won. */
  readonly overridden: string[] = [];

  constructor(platform: Platform, bindings: readonly EditorBinding[] = EDITOR_BINDINGS) {
    this.platform = platform;
    for (const binding of bindings) {
      for (const name of this.namesOf(binding)) {
        this.add(name, binding.run, binding.preventDefault === true);
        if (binding.shift !== undefined) this.add(`Shift-${name}`, binding.shift, binding.preventDefault === true);
      }
    }
  }

  /** The handler for a key press, or `undefined` when the key is not the editor's and native should see it. */
  lookup(chord: KeyChord): KeyHandler | undefined {
    for (const name of chordNames(chord, this.platform)) {
      const handler = this.handlers.get(name);
      if (handler !== undefined) return handler;
    }
    return undefined;
  }

  /** The normalised names bound and what each does, for tests. */
  entries(): readonly (readonly [string, KeyHandler])[] {
    return [...this.handlers.entries()];
  }

  private namesOf(binding: EditorBinding): string[] {
    const raw = this.platform === 'mac'
      ? [binding.mac ?? binding.key]
      : [binding.win ?? binding.key, binding.linux ?? binding.key];
    const names = raw.filter((name): name is string => name !== undefined).map(name => normalizeKeyName(name, this.platform));
    return [...new Set(names)];
  }

  private add(name: string, command: EditorCommand, preventDefault: boolean): void {
    const normalized = normalizeKeyName(name, this.platform);
    if (this.handlers.has(normalized)) this.overridden.push(normalized);
    this.handlers.set(normalized, { command, preventDefault });
  }
}
