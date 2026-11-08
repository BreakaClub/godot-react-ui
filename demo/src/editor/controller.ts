import { EditorSelection } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import {
  deleteCharBackward, deleteCharForward, deleteGroupBackward, deleteGroupForward, deleteLineBoundaryBackward,
  deleteLineBoundaryForward, insertNewlineAndIndent, redo, undo,
} from '@codemirror/commands';
import { AnnotationSet, remapPoint, remapRange, type AnnotationOutcome } from './annotations';
import { ExhaustiveCheckError } from './exhaustive';
import type { ClipboardPort } from './clipboard';
import { LinewiseMemory } from './clipboard';
import type { ViewMetrics } from './command-target';
import {
  copySelection, cutSelection, pasteText, typeText, type CommandContext, type EditorCommand,
} from './commands';
import type { EditorDiagnostic, EditorInlay } from './diagnostics';
import { HighlightCache, ParseScheduler } from './highlight';
import { SINK_TEXT, decodeSoftKeyboardText } from './sink';
import { editorKeyClaims } from './key-claims';
import { Keymap, codeMirrorCommand, type KeyChord, type Platform } from './keymap';
import {
  LineBuilder, insertionsFor, matchedBrackets, type Composition, type LineSpec,
} from './lines';
import { LineLayout } from './line-layout';
import { EditorModel, type ModelUpdate } from './model';
import { PointerSelection, type PointerDown } from './pointer-selection';

/**
 * One open file in the editor: the document, its selections and history, what the services have said about it, and the answers to
 * the events of the input sink (a key, `beforeinput`, a composition) and of the pointer. Everything here runs in Node, with no
 * Godot and no React; the view only draws it and forwards events to it.
 */

/** The fields of a `keydown` the controller reads; `UIKeyboardEvent` has them. */
export interface KeyEventFields extends KeyChord {
  readonly isComposing: boolean;
  /** Milliseconds on the engine's tick clock when native queued the event (`UISyntheticEvent.timeStamp`). */
  readonly timeStamp: number;
}

/** The `inputType`s of a `beforeinput` the text input makes (`UIBeforeInputEvent.inputType`). */
export type InputKind =
  | 'insertText' | 'insertLineBreak' | 'insertFromPaste' | 'insertReplacementText' | 'deleteContentBackward'
  | 'deleteContentForward' | 'deleteWordBackward' | 'deleteWordForward' | 'deleteSoftLineBackward'
  | 'deleteSoftLineForward' | 'deleteByCut' | 'historyUndo' | 'historyRedo';

export interface CursorPosition {
  /** From 1. */
  readonly line: number;
  /** From 1. */
  readonly column: number;
}

/**
 * A caret as it is drawn. On a line that is `onGrid` it stands at `column` of what is drawn; on any other the line's own `Text` says where
 * `offset` is (`getCaretRect(offset, side)`), and `column` is only a guess.
 */
export interface CaretPlacement {
  readonly line: number;
  /** The column of what is drawn, hints and preedit counted. */
  readonly column: number;
  /** The offset in the line's text. */
  readonly offset: number;
  /** Before the generated text at the offset (a hint), or after all of it: after the preedit while one is shown. */
  readonly side: 'before' | 'after';
  readonly onGrid: boolean;
  readonly main: boolean;
}

export interface EditorControllerOptions {
  readonly doc: string;
  readonly platform: Platform;
  readonly clipboard: ClipboardPort;
  readonly metrics: ViewMetrics;
  readonly now?: () => number;
  readonly readOnly?: boolean;
}

type Listener = () => void;

/**
 * How much room around the caret a reveal keeps in view. A key that moved the caret keeps a few lines and columns of context around it, as an
 * editor's scroll-off does; a press puts the caret under the pointer, which is in view already, so all it may ask is that the caret's line and
 * character are shown whole (a line only partly in view at the edge of the viewport) and no more.
 */
export type RevealMargin = 'context' | 'minimal';

/**
 * After a soft keyboard's text reaches the input (`insertReplacementText`: the engine's `_set_text`), the engine presses Right once for
 * each character the keyboard's caret is past (`DisplayServerWeb::_vk_input_text_callback`), a frame later. They are not the person's
 * arrows and must not move the editor's caret; they come within this long of the text.
 */
const SOFT_KEYBOARD_PRESS_WINDOW_MS = 250;

/** How long a composition that has ended waits for the commit that follows it before its preedit is taken away. */
const COMPOSITION_COMMIT_WAIT_MS = 50;

/** The text the editor's input holds (`sink.ts`). */
export { SINK_TEXT };

export class EditorController {
  readonly model: EditorModel;
  /** What the type checker found, for the text it checked. */
  readonly checkerDiagnostics = new AnnotationSet<EditorDiagnostic>(remapRange);
  /** What the compiler and the check of the classes found, for the text that was last sent: they come before the checker's answer. */
  readonly localDiagnostics = new AnnotationSet<EditorDiagnostic>(remapRange);
  readonly inlays = new AnnotationSet<EditorInlay>(remapPoint);
  private readonly keymap: Keymap;
  private keyChords: readonly string[] | undefined;
  private readonly clipboard: ClipboardPort;
  private readonly linewise = new LinewiseMemory();
  private readonly highlight = new HighlightCache();
  private readonly lineBuilder = new LineBuilder();
  private readonly scheduler: ParseScheduler;
  private readonly listeners = new Set<Listener>();
  private currentMetrics: ViewMetrics;
  private currentComposition: Composition | undefined;
  private compositionEnded = false;
  /** How many of the engine's Right presses after a soft keyboard's text are still to come, and when the text came. */
  private softKeyboardPresses = { remaining: 0, at: 0 };
  private compositionTimer: ReturnType<typeof setTimeout> | undefined;
  private isFocused = false;
  private revisionCount = 0;
  private revealCount = 0;
  private revealKind: RevealMargin = 'context';
  private keyboardCount = 0;
  private pointer: PointerSelection | undefined;
  private bracketsFor: { state: object; ranges: ReturnType<typeof matchedBrackets> } | undefined;
  private mergedDiagnostics: { checker: readonly EditorDiagnostic[]; local: readonly EditorDiagnostic[]; merged: readonly EditorDiagnostic[] } | undefined;

  constructor(options: EditorControllerOptions) {
    this.model = new EditorModel(options.doc, { now: options.now, readOnly: options.readOnly });
    this.keymap = new Keymap(options.platform);
    this.clipboard = options.clipboard;
    this.currentMetrics = options.metrics;
    this.scheduler = new ParseScheduler(() => this.changed());
    this.model.subscribe(update => this.onUpdate(update));
  }

  // ---- What the view reads -------------------------------------------------------------------------------------------------

  /** The chords of the key table, spelled as `keyClaims` takes them: what the browser must not get while the editor has the keyboard. */
  get keyClaims(): readonly string[] {
    this.keyChords ??= editorKeyClaims(this.keymap);
    return this.keyChords;
  }

  /** Grows with everything the view draws: text, selection, composition, focus, annotations, metrics, the parse. */
  get revision(): number {
    return this.revisionCount;
  }

  /** Grows when the caret should be brought into view. */
  get revealEpoch(): number {
    return this.revealCount;
  }

  /** How much room the reveal that `revealEpoch` last announced keeps around the caret. */
  get revealMargin(): RevealMargin {
    return this.revealKind;
  }

  /** Grows when the view should give the keyboard to its input again (`requestKeyboard`). */
  get keyboardEpoch(): number {
    return this.keyboardCount;
  }

  get metrics(): ViewMetrics {
    return this.currentMetrics;
  }

  get focused(): boolean {
    return this.isFocused;
  }

  get composition(): Composition | undefined {
    return this.currentComposition;
  }

  get lineCount(): number {
    return this.model.doc.lines;
  }

  /** An arrow property: `useSyncExternalStore` calls it on its own. */
  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  /** Where the main selection's head is, from 1. */
  position(): CursorPosition {
    const head = this.model.state.selection.main.head;
    const line = this.model.doc.lineAt(head);
    return { line: line.number, column: head - line.from + 1 };
  }

  /** How many lines `lines` has built from their parts since this was made (a keystroke builds the one it changed); for tests and profiles. */
  get linesBuilt(): number {
    return this.lineBuilder.built;
  }

  /** The specs of lines `first` to `last` (from 1), parsing as far as the last one with the parse budget. */
  lines(first: number, last: number): LineSpec[] {
    const { state } = this.model;
    const lastLine = Math.min(last, state.doc.lines);
    const firstLine = Math.max(first, 1);
    const tree = this.scheduler.treeFor(state, state.doc.line(lastLine).to);
    this.highlight.keepOnly(firstLine, lastLine);
    this.lineBuilder.keepOnly(firstLine, lastLine);
    if (this.bracketsFor?.state !== state) this.bracketsFor = { state, ranges: matchedBrackets(state) };
    const colors = this.highlight.window(tree, state.doc, firstLine, lastLine);
    return this.lineBuilder.build({
      state, spans: number => colors[number - firstLine] ?? [], diagnostics: this.diagnostics, inlays: this.inlays.items,
      composition: this.currentComposition, focused: this.isFocused, brackets: this.bracketsFor.ranges,
    }, firstLine, lastLine);
  }

  /** The map between offsets and columns of a line as it is drawn now, with its hints and the preedit. */
  layoutOf(lineNumber: number): LineLayout {
    const line = this.model.doc.line(lineNumber);
    return new LineLayout(line.text, insertionsFor(line.from, line.to, this.inlays.items, this.currentComposition));
  }

  /** Where each selection's head is drawn: its line and column of what is drawn, the main one marked. */
  caretPlacements(): readonly CaretPlacement[] {
    const { selection } = this.model.state;
    // The caret is after the preedit once one is shown; before that (a composition just begun) it is where it was.
    const preeditShown = this.currentComposition !== undefined && this.currentComposition.text !== '';
    return selection.ranges.map((range, index) => {
      const line = this.model.doc.lineAt(range.head);
      const layout = this.layoutOf(line.number);
      const offset = range.head - line.from;
      const side = preeditShown && index === selection.mainIndex ? 'after' : 'before';
      return {
        line: line.number, column: layout.columnOf(offset, side), offset, side,
        onGrid: layout.onGrid, main: index === selection.mainIndex,
      };
    });
  }

  /** The document offset for the caret boundary at `column` of what is drawn on line `lineNumber`. */
  offsetAtColumn(lineNumber: number, column: number): number {
    const line = this.model.doc.line(Math.min(Math.max(lineNumber, 1), this.model.doc.lines));
    return line.from + this.layoutOf(line.number).offsetAt(column);
  }

  /** The tree the lines were last coloured with: for tests that check the parse is complete. */
  get tree(): ReturnType<typeof syntaxTree> {
    return syntaxTree(this.model.state);
  }

  // ---- What the view tells it ----------------------------------------------------------------------------------------------

  setMetrics(metrics: ViewMetrics): void {
    const same = metrics.advance === this.currentMetrics.advance && metrics.lineHeight === this.currentMetrics.lineHeight
      && metrics.viewportHeight === this.currentMetrics.viewportHeight;
    if (same) return;
    this.currentMetrics = metrics;
    this.changed();
  }

  setFocused(focused: boolean): void {
    if (focused === this.isFocused) return;
    this.isFocused = focused;
    this.changed();
  }

  /**
   * Every problem the editor knows of, in the text now. A syntax error that the compiler drew before the checker answered is dropped
   * when the checker has the same error, which it describes better.
   */
  get diagnostics(): readonly EditorDiagnostic[] {
    const checker = this.checkerDiagnostics.items;
    const local = this.localDiagnostics.items;
    if (this.mergedDiagnostics?.checker === checker && this.mergedDiagnostics.local === local) return this.mergedDiagnostics.merged;
    const merged = [...checker, ...local.filter(candidate => !checker.some(found => found.from === candidate.from))];
    this.mergedDiagnostics = { checker, local, merged };
    return merged;
  }

  /**
   * Marks the diagnostics of the text of `version` as those of the checker, or (`source` 'local') of the compiler and the class check;
   * `refused` when the model no longer knows the edits made since.
   */
  setDiagnostics(version: number, diagnostics: readonly EditorDiagnostic[], source: 'checker' | 'local' = 'checker'): AnnotationOutcome {
    const set = source === 'checker' ? this.checkerDiagnostics : this.localDiagnostics;
    const outcome = set.replace(this.model, version, diagnostics);
    if (outcome !== 'refused') this.changed();
    return outcome;
  }

  setInlays(version: number, inlays: readonly EditorInlay[]): AnnotationOutcome {
    const outcome = this.inlays.replace(this.model, version, inlays);
    if (outcome !== 'refused') this.changed();
    return outcome;
  }

  // ---- The text input's events ---------------------------------------------------------------------------------------------

  /** A `keydown` on the sink. True when the editor handled the key, which the caller then prevents so native does not see it. */
  keyDown(event: KeyEventFields): boolean {
    // The IME owns the keys of a composition.
    if (event.isComposing) return false;
    if (this.isSoftKeyboardPress(event)) return true;
    const handler = this.keymap.lookup(event);
    if (handler === undefined) return false;
    const acted = handler.command(this.commandContext());
    return acted || handler.preventDefault;
  }

  /**
   * A `beforeinput` on the sink: the edit native was about to make, as a transaction on the document. Always handled, so that the
   * sink's own buffer stays empty.
   */
  beforeInput(kind: InputKind, data: string | null, timeStamp = 0): void {
    const context = this.commandContext();
    switch (kind) {
      case 'insertReplacementText':
        // The soft keyboard's element holds the whole text it sent (the input's one character and what was typed, or nothing for a
        // Backspace), and the engine moves the caret in it by pressing Right.
        this.softKeyboardPresses = { remaining: data?.length ?? 0, at: timeStamp };
        this.typeSoftKeyboardText(context, data);
        return;
      case 'insertText': {
        const composed = this.currentComposition !== undefined;
        this.endComposition();
        typeText(context, data ?? '', composed ? 'input.type.compose' : 'input.type');
        return;
      }
      case 'insertFromPaste': pasteText(context, data ?? ''); return;
      case 'insertLineBreak': this.run(codeMirrorCommand(insertNewlineAndIndent)); return;
      case 'deleteContentBackward': this.run(codeMirrorCommand(deleteCharBackward)); return;
      case 'deleteContentForward': this.run(codeMirrorCommand(deleteCharForward)); return;
      case 'deleteWordBackward': this.run(codeMirrorCommand(deleteGroupBackward)); return;
      case 'deleteWordForward': this.run(codeMirrorCommand(deleteGroupForward)); return;
      case 'deleteSoftLineBackward': this.run(codeMirrorCommand(deleteLineBoundaryBackward)); return;
      case 'deleteSoftLineForward': this.run(codeMirrorCommand(deleteLineBoundaryForward)); return;
      case 'deleteByCut': this.run(cutSelection); return;
      case 'historyUndo': this.run(codeMirrorCommand(undo)); return;
      case 'historyRedo': this.run(codeMirrorCommand(redo)); return;
      default: throw new ExhaustiveCheckError(kind);
    }
  }

  private typeSoftKeyboardText(context: CommandContext, data: string | null): void {
    const input = decodeSoftKeyboardText(data);
    const composed = this.currentComposition !== undefined;
    this.endComposition();
    if (input.kind === 'backspace') this.run(codeMirrorCommand(deleteCharBackward));
    else typeText(context, input.text, composed ? 'input.type.compose' : 'input.type');
  }

  /** Whether a key is one of the Right presses the engine makes after a soft keyboard's text: consumed, and counted off. */
  private isSoftKeyboardPress(event: KeyEventFields): boolean {
    const pending = this.softKeyboardPresses;
    const plainRight = event.key === 'ArrowRight' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
    if (!plainRight || pending.remaining === 0 || event.timeStamp - pending.at > SOFT_KEYBOARD_PRESS_WINDOW_MS) return false;
    this.softKeyboardPresses = { remaining: pending.remaining - 1, at: pending.at };
    return true;
  }

  /** The IME began a composition: its preedit is shown at the caret until the committed text arrives. */
  compositionStart(): void {
    this.compositionEnded = false;
    this.clearCompositionTimer();
    this.currentComposition = { at: this.model.state.selection.main.head, text: '' };
    this.changed();
  }

  compositionUpdate(text: string): void {
    const at = this.currentComposition?.at ?? this.model.state.selection.main.head;
    this.compositionEnded = false;
    this.currentComposition = { at, text };
    this.changed();
  }

  /**
   * The IME finished. The committed text follows as a `beforeinput`, so the preedit stays until it arrives; a composition that was
   * cancelled sends none, and `settleComposition` removes it.
   */
  compositionEnd(): void {
    this.compositionEnded = true;
    this.clearCompositionTimer();
    this.compositionTimer = setTimeout(() => {
      this.compositionTimer = undefined;
      this.settleComposition();
    }, COMPOSITION_COMMIT_WAIT_MS);
  }

  /** Removes the preedit of a composition that has ended and was not followed by a commit. */
  settleComposition(): void {
    if (this.currentComposition !== undefined && this.compositionEnded) this.endComposition();
  }

  // ---- The pointer ---------------------------------------------------------------------------------------------------------

  /**
   * A press on the text at `offset`. The selection follows `pointerMove` until `pointerUp`. The caret is where the pointer is, so it is
   * revealed with no margin: only a line that is partly out of view is scrolled, and only until it is whole.
   */
  pointerDown(down: PointerDown): void {
    this.pointer = new PointerSelection(this.model.state, down);
    // The request comes first so that the render the new selection causes sees it; a press on the caret that is there changes no selection,
    // and the line may still be only partly in view.
    this.requestReveal('minimal');
    if (!this.select(this.pointer.selectionAt(this.model.state, down.offset))) this.changed();
  }

  /**
   * The pointer of a press is over `offset`. The selection follows it and nothing is revealed: the pointer is inside the viewport, or the
   * autoscroll (`view/autoscroll.ts`) is carrying the viewport after it, and a reveal of its own would scroll under a pointer that holds still.
   */
  pointerMove(offset: number): void {
    if (this.pointer === undefined) return;
    this.select(this.pointer.selectionAt(this.model.state, offset));
  }

  pointerUp(): void {
    this.pointer = undefined;
  }

  get selecting(): boolean {
    return this.pointer !== undefined;
  }

  /**
   * A touch selection's handle was dragged: the selection from the end that stays (`fixed`) to `offset`. A move onto `fixed` leaves what
   * there is, as the root's handles do: they keep a character selected, and cross each other where the text goes the other way.
   */
  dragSelectionEnd(fixed: number, offset: number): void {
    if (offset === fixed) return;
    this.select(EditorSelection.single(fixed, offset));
  }

  /** The menu's Select All: the whole document. */
  selectAllText(): void {
    this.setSelection(EditorSelection.single(0, this.model.doc.length));
  }

  /** Moves the selection and brings the caret into view with the context a key keeps (a jump to a problem, Select All). */
  setSelection(selection: EditorSelection): void {
    if (selection.eq(this.model.state.selection)) return;
    this.requestReveal('context');
    this.select(selection);
  }

  /**
   * Asks the view to give the keyboard to its input again. The view does it once it has drawn the input at the caret: a focused input is
   * brought into view by the platform, and one still at the caret's old place would scroll the editor back there.
   */
  requestKeyboard(): void {
    this.keyboardCount += 1;
    this.changed();
  }

  /** Runs an editor command as the keymap would. */
  run(command: EditorCommand): boolean {
    return command(this.commandContext());
  }

  copy(): boolean {
    return copySelection(this.commandContext());
  }

  commandContext(): CommandContext {
    return { model: this.model, metrics: this.currentMetrics, clipboard: this.clipboard, linewise: this.linewise };
  }

  dispose(): void {
    this.scheduler.cancel();
    this.clearCompositionTimer();
    this.listeners.clear();
  }

  // ---- Internals -----------------------------------------------------------------------------------------------------------

  private clearCompositionTimer(): void {
    if (this.compositionTimer !== undefined) clearTimeout(this.compositionTimer);
    this.compositionTimer = undefined;
  }

  private endComposition(): void {
    this.clearCompositionTimer();
    this.currentComposition = undefined;
    this.compositionEnded = false;
    this.changed();
  }

  private onUpdate(update: ModelUpdate): void {
    if (update.docChanged) {
      this.checkerDiagnostics.follow(update.transaction.changes);
      this.localDiagnostics.follow(update.transaction.changes);
      this.inlays.follow(update.transaction.changes);
    }
    if (update.transaction.scrollIntoView) this.requestReveal('context');
    this.changed();
  }

  /** Dispatches a selection; false when it is the one there is. */
  private select(selection: EditorSelection): boolean {
    if (selection.eq(this.model.state.selection)) return false;
    this.model.dispatch({ selection, userEvent: 'select.pointer' });
    return true;
  }

  private requestReveal(margin: RevealMargin): void {
    this.revealKind = margin;
    this.revealCount += 1;
  }

  private changed(): void {
    this.revisionCount += 1;
    for (const listener of [...this.listeners]) listener();
  }
}
