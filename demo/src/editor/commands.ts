import { EditorSelection, type SelectionRange, type TransactionSpec } from '@codemirror/state';
import { deleteLine, indentMore } from '@codemirror/commands';
import { INDENT_UNIT, TAB_SIZE, type EditorModel } from './model';
import { commandTargetFor, type CommandTarget, type ViewMetrics } from './command-target';
import type { ClipboardPort, LinewiseMemory } from './clipboard';

/**
 * The commands of the editor that CodeMirror's command set does not have, and the pieces its keymap and the text input share:
 * typed and pasted text, Copy and Cut through the clipboard port, Tab, and "select the next occurrence".
 */

/** What a command needs: the document, the grid it moves on, and the clipboard. */
export interface CommandContext {
  readonly model: EditorModel;
  readonly metrics: ViewMetrics;
  readonly clipboard: ClipboardPort;
  readonly linewise: LinewiseMemory;
}

/** Returns whether it acted: a key that a command acted on is consumed, so native does not see it. */
export type EditorCommand = (context: CommandContext) => boolean;

const LINE_BREAK = '\n';
const WINDOWS_LINE_BREAK = /\r\n?/gu;
const TAB = /\t/gu;
const SELECTED_TEXT_SEPARATOR = LINE_BREAK;

/** Text from outside the editor, in the editor's own conventions: `\n` line breaks and spaces for tabs. */
export function normalizeIncoming(text: string): string {
  return text.replace(WINDOWS_LINE_BREAK, LINE_BREAK).replace(TAB, INDENT_UNIT);
}

function dispatchSpec(context: CommandContext, spec: TransactionSpec): void {
  context.model.dispatch(spec);
}

/** Typed text, or the text an IME committed, replaces each selection. */
export function typeText(context: CommandContext, text: string, userEvent: 'input.type' | 'input.type.compose' = 'input.type'): boolean {
  const { state } = context.model;
  if (state.readOnly || text === '') return false;
  context.linewise.forget();
  dispatchSpec(context, { ...state.replaceSelection(normalizeIncoming(text)), scrollIntoView: true, userEvent });
  return true;
}

/**
 * Pasted text. With as many lines as there are selections, each selection gets one line; text copied as a line, pasted with
 * nothing selected, goes in above the line the caret is on; anything else replaces each selection.
 */
export function pasteText(context: CommandContext, pasted: string): boolean {
  const { state } = context.model;
  const text = normalizeIncoming(pasted);
  if (state.readOnly || text === '') return false;
  const { ranges } = state.selection;
  if (context.linewise.matches(text) && ranges.every(range => range.empty)) {
    const seen = new Set<number>();
    const spec = state.changeByRange(range => {
      const line = state.doc.lineAt(range.head);
      const insert = seen.has(line.from) ? '' : text;
      seen.add(line.from);
      return { changes: { from: line.from, insert }, range: EditorSelection.cursor(range.head + insert.length) };
    });
    dispatchSpec(context, { ...spec, scrollIntoView: true, userEvent: 'input.paste' });
    return true;
  }
  const lines = text.split(LINE_BREAK);
  if (ranges.length > 1 && lines.length === ranges.length) {
    let next = 0;
    const spec = state.changeByRange(range => {
      const insert = lines[next] ?? '';
      next += 1;
      return { changes: { from: range.from, to: range.to, insert }, range: EditorSelection.cursor(range.from + insert.length) };
    });
    dispatchSpec(context, { ...spec, scrollIntoView: true, userEvent: 'input.paste' });
    context.linewise.forget();
    return true;
  }
  context.linewise.forget();
  dispatchSpec(context, { ...state.replaceSelection(text), scrollIntoView: true, userEvent: 'input.paste' });
  return true;
}

/** The text Copy puts on the clipboard: the selections, one to a line; or, with none selected, the lines the carets are on. */
export function selectedText(context: CommandContext): { readonly text: string; readonly wholeLines: boolean } {
  const { state } = context.model;
  const selected = state.selection.ranges.filter(range => !range.empty);
  if (selected.length > 0) {
    return { text: selected.map(range => state.sliceDoc(range.from, range.to)).join(SELECTED_TEXT_SEPARATOR), wholeLines: false };
  }
  const starts = new Set<number>();
  const lines: string[] = [];
  for (const range of state.selection.ranges) {
    const line = state.doc.lineAt(range.head);
    if (starts.has(line.from)) continue;
    starts.add(line.from);
    lines.push(line.text);
  }
  return { text: lines.join(LINE_BREAK) + LINE_BREAK, wholeLines: true };
}

export const copySelection: EditorCommand = context => {
  const { text, wholeLines } = selectedText(context);
  context.clipboard.writeText(text);
  if (wholeLines) context.linewise.remember(text);
  else context.linewise.forget();
  return true;
};

export const cutSelection: EditorCommand = context => {
  const { state } = context.model;
  const { text, wholeLines } = selectedText(context);
  context.clipboard.writeText(text);
  if (state.readOnly) return true;
  if (wholeLines) {
    context.linewise.remember(text);
    deleteLine(asEditorView(commandTargetFor(context.model, context.metrics)));
    return true;
  }
  context.linewise.forget();
  const spec = state.changeByRange(range => ({ changes: { from: range.from, to: range.to }, range: EditorSelection.cursor(range.from) }));
  dispatchSpec(context, { ...spec, scrollIntoView: true, userEvent: 'delete.cut' });
  return true;
};

/** Tab: with lines selected, indent them; otherwise insert spaces up to the next indent column at each caret. */
export const insertIndent: EditorCommand = context => {
  const { state } = context.model;
  if (state.readOnly) return false;
  const spansLines = state.selection.ranges.some(range => !range.empty && state.doc.lineAt(range.from).number !== state.doc.lineAt(range.to).number);
  if (spansLines) {
    return indentMore({ state, dispatch: transaction => { context.model.dispatch(transaction); } });
  }
  const spec = state.changeByRange(range => {
    const column = range.from - state.doc.lineAt(range.from).from;
    const insert = ' '.repeat(TAB_SIZE - (column % TAB_SIZE));
    return { changes: { from: range.from, to: range.to, insert }, range: EditorSelection.cursor(range.from + insert.length) };
  });
  dispatchSpec(context, { ...spec, scrollIntoView: true, userEvent: 'input.type' });
  return true;
};

/**
 * Cmd+D: with nothing selected, select the word at the caret; with something selected, add the next place the same text occurs
 * (after the last selection, wrapping round, skipping what is selected already) as a new selection.
 */
export const selectNextOccurrence: EditorCommand = context => {
  const { state } = context.model;
  const { main } = state.selection;
  if (main.empty) {
    const word = state.wordAt(main.head);
    if (word === null) return false;
    dispatchSpec(context, { selection: EditorSelection.single(word.from, word.to), scrollIntoView: true, userEvent: 'select' });
    return true;
  }
  const needle = state.sliceDoc(main.from, main.to);
  const haystack = state.doc.toString();
  const taken = (from: number): boolean => state.selection.ranges.some(range => range.from === from);
  const start = Math.max(...state.selection.ranges.map(range => range.to));
  const found = findOccurrence(haystack, needle, start, taken);
  if (found === undefined) return false;
  const added: SelectionRange = EditorSelection.range(found, found + needle.length);
  dispatchSpec(context, { selection: EditorSelection.create([...state.selection.ranges, added], state.selection.ranges.length), scrollIntoView: true, userEvent: 'select' });
  return true;
};

/** The first occurrence of `needle` at or after `start`, else the first from the beginning, that `taken` does not refuse. */
function findOccurrence(haystack: string, needle: string, start: number, taken: (from: number) => boolean): number | undefined {
  for (const origin of [start, 0]) {
    for (let at = haystack.indexOf(needle, origin); at !== -1; at = haystack.indexOf(needle, at + 1)) {
      if (!taken(at)) return at;
    }
  }
  return undefined;
}

type CommandView = Parameters<typeof deleteLine>[0];

/**
 * CodeMirror's commands are typed against `EditorView`, a class with private members, so nothing else can be passed as one.
 * They call only the members `CommandTarget` has (command-target.ts lists them and tests/editor-commands.test.ts runs every
 * command the keymap binds against it), so the assertion is safe for the commands this editor binds. It goes when
 * `@codemirror/commands` types its commands against the interface they use.
 */
export function asEditorView(target: CommandTarget): CommandView {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  return target as unknown as CommandView;
}
