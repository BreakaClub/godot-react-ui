import { EditorSelection, type SelectionRange } from '@codemirror/state';
import { MemoryClipboard } from '../demo/src/editor/clipboard';
import { EditorController, type KeyEventFields } from '../demo/src/editor/controller';
import type { Platform } from '../demo/src/editor/keymap';
import type { ViewMetrics } from '../demo/src/editor/command-target';

/** The grid the tests move on: nothing here depends on a font. */
export const TEST_METRICS: ViewMetrics = { advance: 8, lineHeight: 20, viewportHeight: 200 };

const MARKERS = new Set(['|', '<', '>']);

/**
 * Text with the selection drawn into it: `|` is a caret, `<` and `>` are the two ends of a selection (`<abc>` selects forwards,
 * `>abc<` backwards, the anchor at the first marker). Several marks are several selections; the last one is the main one.
 */
export function parseMarked(marked: string): { readonly doc: string; readonly selection: EditorSelection } {
  let doc = '';
  const ranges: SelectionRange[] = [];
  let open: { readonly mark: string; readonly at: number } | undefined;
  for (const character of marked) {
    if (!MARKERS.has(character)) {
      doc += character;
      continue;
    }
    if (character === '|') {
      ranges.push(EditorSelection.cursor(doc.length));
    } else if (open === undefined) {
      open = { mark: character, at: doc.length };
    } else {
      if (open.mark === character) throw new Error(`Two ${character} in a row in "${marked}"`);
      ranges.push(open.mark === '<' ? EditorSelection.range(open.at, doc.length) : EditorSelection.range(doc.length, open.at));
      open = undefined;
    }
  }
  if (open !== undefined) throw new Error(`An unclosed selection mark in "${marked}"`);
  return { doc, selection: EditorSelection.create(ranges.length === 0 ? [EditorSelection.cursor(0)] : ranges, Math.max(0, ranges.length - 1)) };
}

/** The inverse of `parseMarked`: what the editor holds, with its selections drawn in. */
export function marked(editor: EditorController): string {
  const { state } = editor.model;
  const inserts: { readonly at: number; readonly mark: string }[] = [];
  for (const range of state.selection.ranges) {
    if (range.empty) inserts.push({ at: range.from, mark: '|' });
    else if (range.anchor < range.head) inserts.push({ at: range.from, mark: '<' }, { at: range.to, mark: '>' });
    else inserts.push({ at: range.from, mark: '>' }, { at: range.to, mark: '<' });
  }
  inserts.sort((a, b) => a.at - b.at);
  let result = '';
  let last = 0;
  const text = state.doc.toString();
  for (const insert of inserts) {
    result += text.slice(last, insert.at) + insert.mark;
    last = insert.at;
  }
  return result + text.slice(last);
}

export interface Modifiers {
  readonly shift?: boolean;
  readonly ctrl?: boolean;
  readonly alt?: boolean;
  readonly meta?: boolean;
}

const NAMED_KEYS = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown', 'Enter', 'Backspace', 'Delete', 'Tab', 'Escape',
]);

function codeOf(key: string): string {
  if (NAMED_KEYS.has(key)) return key;
  if (/^[a-z]$/iu.test(key)) return `Key${key.toUpperCase()}`;
  if (/^[0-9]$/u.test(key)) return `Digit${key}`;
  const punctuation: Record<string, string> = { '/': 'Slash', '[': 'BracketLeft', ']': 'BracketRight', '\\': 'Backslash' };
  return punctuation[key] ?? '';
}

export function keyEvent(key: string, modifiers: Modifiers = {}): KeyEventFields {
  const typed = modifiers.shift === true && key.length === 1 ? key.toUpperCase() : key;
  return {
    key: typed, code: codeOf(key), shiftKey: modifiers.shift === true, ctrlKey: modifiers.ctrl === true,
    altKey: modifiers.alt === true, metaKey: modifiers.meta === true, isComposing: false,
  };
}

export interface TestEditor {
  readonly editor: EditorController;
  readonly clipboard: MemoryClipboard;
  /** Presses a key as the sink sees it. Returns whether the editor consumed it. */
  press(key: string, modifiers?: Modifiers): boolean;
  /** Types text as the sink's `beforeinput` of type `insertText` delivers it. */
  type(text: string): void;
  text(): string;
  marked(): string;
}

export function openEditor(markedDoc: string, platform: Platform = 'mac', now?: () => number): TestEditor {
  const parsed = parseMarked(markedDoc);
  const clipboard = new MemoryClipboard();
  const editor = new EditorController({ doc: parsed.doc, platform, clipboard, metrics: TEST_METRICS, now });
  editor.setSelection(parsed.selection);
  return {
    editor, clipboard,
    press: (key, modifiers) => editor.keyDown(keyEvent(key, modifiers)),
    type: text => { editor.beforeInput('insertText', text); },
    text: () => editor.model.text,
    marked: () => marked(editor),
  };
}
