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
import { Keymap, codeMirrorCommand, type KeyChord, type Platform } from './keymap';
import {
  LineSpecCache, buildLine, insertionsFor, matchedBrackets, type Composition, type LineSpec,
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

/** A caret as it is drawn: the line and the column of what is drawn at which it stands. */
export interface CaretPlacement {
  readonly line: number;
  readonly column: number;
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

/** How long a composition that has ended waits for the commit that follows it before its preedit is taken away. */
const COMPOSITION_COMMIT_WAIT_MS = 50;

export class EditorController {
  readonly model: EditorModel;
  readonly diagnostics = new AnnotationSet<EditorDiagnostic>(remapRange);
  readonly inlays = new AnnotationSet<EditorInlay>(remapPoint);
  private readonly keymap: Keymap;
  private readonly clipboard: ClipboardPort;
  private readonly linewise = new LinewiseMemory();
  private readonly highlight = new HighlightCache();
  private readonly lineCache = new LineSpecCache();
  private readonly scheduler: ParseScheduler;
  private readonly listeners = new Set<Listener>();
  private currentMetrics: ViewMetrics;
  private currentComposition: Composition | undefined;
  private compositionEnded = false;
  private compositionTimer: ReturnType<typeof setTimeout> | undefined;
  private isFocused = false;
  private revisionCount = 0;
  private revealCount = 0;
  private pointer: PointerSelection | undefined;
  private bracketsFor: { state: object; ranges: ReturnType<typeof matchedBrackets> } | undefined;

  constructor(options: EditorControllerOptions) {
    this.model = new EditorModel(options.doc, { now: options.now, readOnly: options.readOnly });
    this.keymap = new Keymap(options.platform);
    this.clipboard = options.clipboard;
    this.currentMetrics = options.metrics;
    this.scheduler = new ParseScheduler(() => this.changed());
    this.model.subscribe(update => this.onUpdate(update));
  }

  // ---- What the view reads -------------------------------------------------------------------------------------------------

  /** Grows with everything the view draws: text, selection, composition, focus, annotations, metrics, the parse. */
  get revision(): number {
    return this.revisionCount;
  }

  /** Grows when the caret should be brought into view. */
  get revealEpoch(): number {
    return this.revealCount;
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

  /** The specs of lines `first` to `last` (from 1), parsing as far as the last one with the parse budget. */
  lines(first: number, last: number): LineSpec[] {
    const { state } = this.model;
    const lastLine = Math.min(last, state.doc.lines);
    const firstLine = Math.max(first, 1);
    const tree = this.scheduler.treeFor(state, state.doc.line(lastLine).to);
    this.highlight.keepOnly(firstLine, lastLine);
    this.lineCache.keepOnly(firstLine, lastLine);
    if (this.bracketsFor?.state !== state) this.bracketsFor = { state, ranges: matchedBrackets(state) };
    const inputs = {
      state, tree, highlight: this.highlight, diagnostics: this.diagnostics.items, inlays: this.inlays.items,
      composition: this.currentComposition, focused: this.isFocused, brackets: this.bracketsFor.ranges,
    };
    const specs: LineSpec[] = [];
    for (let number = firstLine; number <= lastLine; number += 1) specs.push(this.lineCache.stable(buildLine(inputs, number)));
    return specs;
  }

  /** The map between offsets and columns of a line as it is drawn now, with its hints and the preedit. */
  layoutOf(lineNumber: number): LineLayout {
    const line = this.model.doc.line(lineNumber);
    return new LineLayout(line.text, insertionsFor(line.from, line.to, this.inlays.items, this.currentComposition));
  }

  /** Where each selection's head is drawn: its line and column of what is drawn, the main one marked. */
  caretPlacements(): readonly CaretPlacement[] {
    const { selection } = this.model.state;
    const composing = this.currentComposition !== undefined;
    return selection.ranges.map((range, index) => {
      const line = this.model.doc.lineAt(range.head);
      const side = composing && index === selection.mainIndex ? 'after-preedit' : 'before';
      return { line: line.number, column: this.layoutOf(line.number).columnOf(range.head - line.from, side), main: index === selection.mainIndex };
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

  /** Marks the diagnostics of the text of `version`; `refused` when the model no longer knows the edits made since. */
  setDiagnostics(version: number, diagnostics: readonly EditorDiagnostic[]): AnnotationOutcome {
    const outcome = this.diagnostics.replace(this.model, version, diagnostics);
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
    const handler = this.keymap.lookup(event);
    if (handler === undefined) return false;
    const acted = handler.command(this.commandContext());
    return acted || handler.preventDefault;
  }

  /**
   * A `beforeinput` on the sink: the edit native was about to make, as a transaction on the document. Always handled, so that the
   * sink's own buffer stays empty.
   */
  beforeInput(kind: InputKind, data: string | null): void {
    const context = this.commandContext();
    switch (kind) {
      case 'insertText':
      case 'insertReplacementText': {
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

  /** A press on the text at `offset`. The selection follows `pointerMove` until `pointerUp`. */
  pointerDown(down: PointerDown): void {
    this.pointer = new PointerSelection(this.model.state, down);
    this.setSelection(this.pointer.selectionAt(this.model.state, down.offset));
  }

  pointerMove(offset: number): void {
    if (this.pointer === undefined) return;
    this.setSelection(this.pointer.selectionAt(this.model.state, offset));
  }

  pointerUp(): void {
    this.pointer = undefined;
  }

  get selecting(): boolean {
    return this.pointer !== undefined;
  }

  setSelection(selection: EditorSelection): void {
    if (selection.eq(this.model.state.selection)) return;
    this.model.dispatch({ selection, userEvent: 'select.pointer' });
    this.revealCount += 1;
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
      this.diagnostics.follow(update.transaction.changes);
      this.inlays.follow(update.transaction.changes);
    }
    if (update.transaction.scrollIntoView) this.revealCount += 1;
    this.changed();
  }

  private changed(): void {
    this.revisionCount += 1;
    for (const listener of [...this.listeners]) listener();
  }
}
