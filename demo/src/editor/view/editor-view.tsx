import {
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore,
} from 'react';
import {
  TextInput, View, useRootSize,
  type TextInputHandle, type UIBeforeInputEvent, type UICompositionEvent, type UIHandle, type UIKeyboardEvent, type UIPointerEvent, type UIScrollEvent,
} from 'godot-react-ui';
import type { LayoutRect } from '../../../../src/native';
import type { CaretPlacement, EditorController } from '../controller';
import type { EditorDiagnostic } from '../diagnostics';
import {
  TRAILING_COLUMNS, columnAtX, displayColumns, gutterWidthFor, lineAtY, scrollToReveal, visibleLines, xOfColumn, yOfLine, type Grid,
} from '../geometry';
import { THEME } from '../theme';
import type { EditorWorkspace, FileEditor } from '../workspace';
import { SINK_TEXT } from '../sink';
import { cutSelection, pasteText } from '../commands';
import {
  LongPress, MENU_LABELS, dragTarget, grabOffset, menuActions, placeMenu, type Edge, type MenuAction, type Point, type Timers,
} from '../touch-selection';
import { SelectionHandle, SelectionMenu, type HandleEnd } from './touch-chrome';
import { Autoscroll } from './autoscroll';
import { ClickSequence } from './click-sequence';
import { Carets, type CaretRect } from './carets';
import { GutterCell } from './gutter';
import { GridProbe, type MeasuredGrid } from './grid-probe';
import { HoverTracker, type HoverTarget } from './hover';
import { HoverTooltip, type TooltipLine } from './hover-tooltip';
import { CodeLine } from './code-line';

/**
 * The editor's body: the lines in view, the line numbers, the selections and carets, and the invisible text input that is the
 * keyboard's way in. The text is the controller's (CodeMirror state); this draws it and passes keys, composition, `beforeinput`
 * and the pointer on to it. Nothing here keeps the text.
 *
 * - The content is one scrolling `View` as tall as the file and as wide as its longest line; only the lines near the viewport
 *   are elements. A scroll event moves the window; a line that stays in it keeps its props and costs no native commit.
 * - The caret blinks inside `Carets` alone. The text input is a one-column-wide `TextInput` at the caret, so the IME's
 *   window and the soft keyboard follow the caret; every `keydown` and `beforeinput` is answered by the controller and prevented.
 * - A line is one `Text` (`code-line.tsx`). Where a caret stands and which offset a press lands on is the monospace grid's to say on a
 *   line of printable ASCII (`LineLayout.onGrid`), which is exact and costs no query. On any other line (CJK, emoji, combining marks, a
 *   tab) it is the line's own text that says, through `getCaretRect`, `getOffsetAtPoint` and `getRangeRects`.
 */

/** Lines kept clear above and below the caret when it is scrolled into view. */
const REVEAL_MARGIN_LINES = 2;
const PRIMARY_BUTTON = 0;
/** The columns a caret scrolled into view keeps clear of the viewport's right edge, past its own. */
const REVEAL_MARGIN_COLUMNS = 3;

interface ScrollPosition {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

const NOT_SCROLLED: ScrollPosition = { top: 0, left: 0, width: 0, height: 0 };

/** The clock a long press is timed on. */
const BROWSER_TIMERS: Timers<ReturnType<typeof setTimeout>> = { set: (callback, ms) => setTimeout(callback, ms), clear: handle => { clearTimeout(handle); } };
/** About how wide a character of the menu's labels is (14 px text), to place the menu before it is laid out. */
const MENU_LABEL_ADVANCE_PX = 7.4;

export interface EditorViewProps {
  readonly workspace: EditorWorkspace;
  readonly file: FileEditor;
}

/** About how many columns the longest line takes, with the hints that stand in it (`displayColumns`: an estimate, for the width of the content). */
function longestLine(controller: EditorController): number {
  const { doc } = controller.model;
  const hinted = new Map<number, number>();
  for (const inlay of controller.inlays.items) {
    const line = doc.lineAt(inlay.at);
    hinted.set(line.number, (hinted.get(line.number) ?? 0) + displayColumns(inlay.label));
  }
  let longest = 0;
  for (let number = 1; number <= doc.lines; number += 1) longest = Math.max(longest, displayColumns(doc.line(number).text) + (hinted.get(number) ?? 0));
  return longest;
}

/** The word around `offset` of line `number`: the run of characters of one category the character at `offset` is in. */
function wordAround(controller: EditorController, lineNumber: number, offset: number): HoverTarget | undefined {
  const line = controller.model.doc.line(lineNumber);
  if (offset < 0 || offset >= line.length) return undefined;
  const character = line.text.charAt(offset);
  if (/\s/u.test(character)) return undefined;
  const group = controller.model.state.charCategorizer(line.from + offset);
  const category = group(character);
  let from = offset;
  let to = offset + 1;
  while (from > 0 && group(line.text.charAt(from - 1)) === category) from -= 1;
  while (to < line.length && group(line.text.charAt(to)) === category) to += 1;
  return { from: line.from + from, to: line.from + to, offset: line.from + offset };
}

/** The offset of the character that starts before the boundary `offset` of `text` (a surrogate pair is one character). */
function previousCharacterStart(text: string, offset: number): number {
  const unit = text.charCodeAt(offset - 1);
  const isLowSurrogate = unit >= LOW_SURROGATE_START && unit <= LOW_SURROGATE_END;
  return isLowSurrogate && offset >= 2 ? offset - 2 : offset - 1;
}

const LOW_SURROGATE_START = 0xdc00;
const LOW_SURROGATE_END = 0xdfff;
const ASTRAL_START = 0x10000;

/** Where the editor has measured a caret that is not on the grid: the content's x of it, for the caret at `key`. */
interface MeasuredCaret {
  readonly key: string;
  readonly left: number;
}

const NO_MEASURED_CARETS: readonly MeasuredCaret[] = [];

function caretKey(placement: CaretPlacement): string {
  return `${placement.line}:${placement.offset}:${placement.side}`;
}

function sameMeasuredCarets(a: readonly MeasuredCaret[], b: readonly MeasuredCaret[]): boolean {
  return a.length === b.length && a.every((caret, index) => caret.key === b[index]?.key && caret.left === b[index]?.left);
}

export function EditorView({ workspace, file }: EditorViewProps) {
  const { controller } = file;
  useSyncExternalStore(controller.subscribe, () => controller.revision);
  useSyncExternalStore(workspace.subscribe, () => workspace.revision);
  const rootSize = useRootSize();

  const [measured, setMeasured] = useState<MeasuredGrid | undefined>(undefined);
  const [scroll, setScroll] = useState<ScrollPosition>(NOT_SCROLLED);
  const [tooltip, setTooltip] = useState<{ readonly anchor: LayoutRect; readonly lines: readonly TooltipLine[] } | undefined>(undefined);
  const scrollerRef = useRef<UIHandle | null>(null);
  const contentRef = useRef<UIHandle | null>(null);
  const sinkRef = useRef<TextInputHandle | null>(null);
  const pointerRef = useRef<{ x: number; y: number } | undefined>(undefined);
  const gridRef = useRef<Grid | undefined>(undefined);
  const clicks = useRef(new ClickSequence());
  // Touch selection (plan D71): a long press selects the word under the finger, handles move its ends and a menu acts on it. The selection is
  // the controller's, so the root cannot draw them.
  const heldRef = useRef<(pointerId: number, origin: Point) => void>(() => undefined);
  const longPress = useMemo(() => new LongPress<ReturnType<typeof setTimeout>>(BROWSER_TIMERS, (pointerId, origin) => { heldRef.current(pointerId, origin); }), []);
  /** The element a touch went down on, which takes the finger when a long press selects. */
  const touchHolder = useRef<UIHandle | undefined>(undefined);
  /** The finger that selected a word by a long press and is still down: it extends the selection. */
  const heldTouch = useRef<number | undefined>(undefined);
  /** A finger dragging a handle: the end that stays and how far the handle was from the finger when it went down. */
  const handleDrag = useRef<{ readonly pointerId: number; readonly fixed: number; readonly grab: Point } | undefined>(undefined);
  /** The lift of a long press is no tap: the click that follows it must not put the caret over the selection. */
  const heldLift = useRef(false);
  const [touchOwned, setTouchOwned] = useState(false);
  const [touchBusy, setTouchBusy] = useState(false);
  const [menuDismissedFor, setMenuDismissedFor] = useState<string | undefined>(undefined);
  // The `Text` of each line in view: asked where its text is when the line is not on the grid.
  const lineHandles = useRef(new Map<number, UIHandle>());
  const [measuredCarets, setMeasuredCarets] = useState<readonly MeasuredCaret[]>(NO_MEASURED_CARETS);
  // What `measuredCarets` holds, to see whether a measurement changed it without setting state: setting an equal state still renders again.
  const measuredCaretsRef = useRef<readonly MeasuredCaret[]>(NO_MEASURED_CARETS);
  const onLineHandle = useCallback((line: number, handle: UIHandle | null): void => {
    if (handle === null) lineHandles.current.delete(line);
    else lineHandles.current.set(line, handle);
  }, []);

  // The probe measures after every render; a measurement that has not changed is not a new state.
  const onMeasured = useCallback((next: MeasuredGrid): void => {
    setMeasured(current => (current !== undefined && current.advance === next.advance && current.lineHeight === next.lineHeight ? current : next));
  }, []);

  const { doc } = controller.model;
  const inlays = controller.inlays.items;
  const columns = useMemo(() => longestLine(controller), [doc, inlays]);
  const grid: Grid | undefined = measured === undefined ? undefined : {
    advance: measured.advance, lineHeight: measured.lineHeight, gutterWidth: gutterWidthFor(doc.lines, measured.advance),
  };
  // Handlers made once (the hover tracker, the autoscroll) read the grid of the render they run after.
  gridRef.current = grid;

  // The grid the controller moves the caret on, for Page Up and the vertical goal column: the same numbers the lines are drawn with.
  useLayoutEffect(() => {
    if (measured !== undefined) controller.setMetrics({ advance: measured.advance, lineHeight: measured.lineHeight, viewportHeight: scroll.height });
  }, [controller, measured, scroll.height]);

  // The size of the scroll container, read again when the root is resized.
  useLayoutEffect(() => {
    const state = scrollerRef.current?.getScrollState();
    if (state === undefined) return;
    setScroll(current => (
      current.top === state.scrollTop && current.left === state.scrollLeft && current.width === state.clientWidth && current.height === state.clientHeight
        ? current : { top: state.scrollTop, left: state.scrollLeft, width: state.clientWidth, height: state.clientHeight }
    ));
  }, [rootSize.width, rootSize.height, measured]);

  const placements = controller.caretPlacements();
  const main = placements.find(placement => placement.main) ?? placements[0];
  const { selection } = controller.model.state;
  const selectionEmpty = selection.ranges.every(range => range.empty);
  const currentLines = useMemo(() => new Set(placements.map(placement => placement.line)), [placements.map(placement => placement.line).join(',')]);

  /**
   * The content's x of a caret: from the grid on a line that is on it, else where the line's text says its caret is. `undefined` for a
   * line that is not on the grid and has no text laid out yet (not in the window).
   */
  function caretLeft(placement: CaretPlacement, current: Grid): number | undefined {
    if (placement.onGrid) return xOfColumn(placement.column, current);
    const rect = lineHandles.current.get(placement.line)?.getCaretRect(placement.offset, placement.side);
    const content = contentRef.current?.getRect();
    return rect === undefined || content === undefined ? undefined : rect.x - content.x;
  }

  // The carets that are not on the grid are measured after the lines they are on are laid out, and drawn from that.
  useLayoutEffect(() => {
    const offGrid = grid === undefined ? [] : placements.filter(placement => !placement.onGrid);
    const next: MeasuredCaret[] = [];
    for (const placement of offGrid) {
      const left = grid === undefined ? undefined : caretLeft(placement, grid);
      if (left !== undefined) next.push({ key: caretKey(placement), left });
    }
    const measuredNow = next.length === 0 ? NO_MEASURED_CARETS : next;
    if (sameMeasuredCarets(measuredCaretsRef.current, measuredNow)) return;
    measuredCaretsRef.current = measuredNow;
    setMeasuredCarets(measuredNow);
  });

  // Bring the caret into view when it moved because of what the person did.
  useLayoutEffect(() => {
    if (grid === undefined || main === undefined) return;
    const state = scrollerRef.current?.getScrollState();
    if (state === undefined) return;
    // A key that moved the caret keeps some context round it; a press put it under the pointer, so only a line that is partly in view is moved.
    const withContext = controller.revealMargin === 'context';
    const margin = withContext ? REVEAL_MARGIN_LINES * grid.lineHeight : 0;
    const top = scrollToReveal(state.scrollTop, state.clientHeight, yOfLine(main.line, grid), yOfLine(main.line, grid) + grid.lineHeight, margin);
    const textWidth = state.clientWidth - grid.gutterWidth;
    const caretX = (caretLeft(main, grid) ?? xOfColumn(main.column, grid)) - grid.gutterWidth;
    const left = scrollToReveal(state.scrollLeft, textWidth, caretX, caretX + grid.advance, withContext ? REVEAL_MARGIN_COLUMNS * grid.advance : 0);
    if (top !== state.scrollTop || left !== state.scrollLeft) scrollerRef.current?.scrollTo({ top, left });
  }, [controller.revealEpoch, grid === undefined]);

  // Give the keyboard to the input again when something asked for it (`takeKeyboard`). This is after the render that moved the input to the
  // caret, and after the reveal above: focusing an input brings it into view, as `focus()` does in a browser, so an input still standing at the
  // caret's old place (scrolled out of view by the wheel since) would scroll the editor back to it, from under a press that is in progress.
  const keyboardHandled = useRef(controller.keyboardEpoch);
  useLayoutEffect(() => {
    if (keyboardHandled.current === controller.keyboardEpoch) return;
    keyboardHandled.current = controller.keyboardEpoch;
    sinkRef.current?.blur();
    sinkRef.current?.focus();
  });

  const hover = useMemo(() => new HoverTracker<TooltipLine[]>(
    async target => {
      const lines: TooltipLine[] = [];
      for (const diagnostic of controller.diagnostics) {
        if (diagnostic.from <= target.offset && diagnostic.to > target.offset && (diagnostic.severity === 'error' || diagnostic.severity === 'warning')) {
          lines.push({ kind: diagnostic.severity, text: diagnosticText(diagnostic) });
        }
      }
      const answer = await workspace.hoverAt(target.offset);
      if (answer !== undefined) lines.push({ kind: 'type', text: `${answer.hover.name}: ${answer.hover.type}` });
      return lines.length === 0 ? undefined : lines;
    },
    (lines, target) => {
      const current = gridRef.current;
      if (lines === undefined || target === undefined || current === undefined) {
        setTooltip(undefined);
        return;
      }
      const content = contentRef.current?.getRect();
      if (content === undefined) return;
      const line = controller.model.doc.lineAt(target.from);
      const layout = controller.layoutOf(line.number);
      const to = Math.min(target.to, line.to);
      if (layout.onGrid) {
        const startColumn = layout.columnOf(target.from - line.from);
        const endColumn = layout.columnOf(to - line.from);
        setTooltip({
          anchor: {
            x: content.x + xOfColumn(startColumn, current), y: content.y + yOfLine(line.number, current),
            width: Math.max(current.advance, (endColumn - startColumn) * current.advance), height: current.lineHeight,
          },
          lines,
        });
        return;
      }
      // A line that is not on the grid says where the word is: the first box of its range.
      const [anchor] = lineHandles.current.get(line.number)?.getRangeRects(target.from - line.from, to - line.from) ?? [];
      if (anchor !== undefined) setTooltip({ anchor, lines });
    },
  ), [controller, workspace]);
  useEffect(() => () => hover.cancel(), [hover]);
  useEffect(() => { hover.cancel(); }, [hover, controller.model.version, scroll.top, scroll.left]);

  const autoscroll = useMemo(() => new Autoscroll({
    measure: () => {
      const rect = scrollerRef.current?.getRect();
      const pointer = pointerRef.current;
      if (rect === undefined || pointer === undefined) return undefined;
      return { edges: { left: rect.x, top: rect.y, right: rect.x + rect.width, bottom: rect.y + rect.height }, x: pointer.x, y: pointer.y };
    },
    scrollBy: delta => scrollerRef.current?.scrollBy(delta),
    scrolled: () => {
      const offset = offsetUnderPointer();
      if (offset === undefined) return;
      const drag = handleDrag.current;
      if (drag === undefined) controller.pointerMove(offset);
      else controller.dragSelectionEnd(drag.fixed, offset);
    },
  }), [controller]);
  useEffect(() => () => autoscroll.stop(), [autoscroll]);
  useEffect(() => () => longPress.cancel(), [longPress]);

  /**
   * The document offset of the caret boundary at root-local (`x`, `y`), from the content's rectangle now: by the grid on a line that is on
   * it, else by the line's text. `undefined` for a line that is not on the grid and is not laid out (a drag that outran the window).
   */
  function offsetAt(x: number, y: number): number | undefined {
    const content = contentRef.current?.getRect();
    const current = gridRef.current;
    if (content === undefined || current === undefined) return undefined;
    const number = lineAtY(y - content.y, current, controller.lineCount);
    if (controller.layoutOf(number).onGrid) return controller.offsetAtColumn(number, columnAtX(x - content.x, current));
    const position = lineHandles.current.get(number)?.getOffsetAtPoint(x, content.y + yOfLine(number, current) + current.lineHeight / 2);
    return position === undefined ? undefined : controller.model.doc.line(number).from + position.offset;
  }

  /**
   * The word under root-local (`x`, `y`), for the hover: none over a hint, whitespace or past the end of a line. On a line that is not on
   * the grid the character is the one whose box holds `x`, of the two beside the nearest caret position.
   */
  function wordUnder(x: number, y: number): HoverTarget | undefined {
    const content = contentRef.current?.getRect();
    const current = gridRef.current;
    if (content === undefined || current === undefined) return undefined;
    const number = lineAtY(y - content.y, current, controller.lineCount);
    const layout = controller.layoutOf(number);
    if (layout.onGrid) {
      const column = Math.floor((x - content.x - current.gutterWidth) / current.advance);
      if (column < 0) return undefined;
      const offset = layout.offsetAt(column);
      return layout.columnOf(offset) === column ? wordAround(controller, number, offset) : undefined;
    }
    const handle = lineHandles.current.get(number);
    const position = handle?.getOffsetAtPoint(x, content.y + yOfLine(number, current) + current.lineHeight / 2);
    if (handle === undefined || position === undefined) return undefined;
    const { text } = controller.model.doc.line(number);
    const starts = position.offset === 0 ? [0] : [position.offset, previousCharacterStart(text, position.offset)];
    for (const start of starts) {
      if (start >= text.length) continue;
      const end = start + ((text.codePointAt(start) ?? 0) >= ASTRAL_START ? 2 : 1);
      if (handle.getRangeRects(start, end)?.some(rect => x >= rect.x && x < rect.x + rect.width) === true) return wordAround(controller, number, start);
    }
    return undefined;
  }

  function offsetUnderPointer(): number | undefined {
    const pointer = pointerRef.current;
    return pointer === undefined ? undefined : offsetAt(pointer.x, pointer.y);
  }

  /**
   * Asks for the keyboard to go to the input again, once it stands at the caret (the layout effect above). Focusing the element that has the
   * focus is no change, and the platform's text session (the IME on a desktop browser, the soft keyboard on a touch one) is begun by a change of
   * focus: after the browser has given its focus to the canvas or the keyboard has been put away, a press that only calls `focus()` would leave
   * the editor without either. A press is the gesture a browser allows that in.
   */
  const takeKeyboard = (): void => { controller.requestKeyboard(); };

  /**
   * A finger held still on a word (`LongPress`): the word is selected, the finger is the selection's from now on (JS captures it, so it no
   * longer pans the editor), and it extends the selection by words as it moves. Over white space, or nothing, nothing is selected.
   */
  heldRef.current = (pointerId: number, origin: Point): void => {
    const target = wordUnder(origin.x, origin.y);
    const holder = touchHolder.current;
    if (target === undefined || holder === undefined) return;
    holder.setPointerCapture(pointerId);
    heldTouch.current = pointerId;
    pointerRef.current = origin;
    controller.pointerDown({ offset: target.offset, clicks: 2, shiftKey: false, altKey: false });
    setTouchOwned(true);
    setTouchBusy(true);
  };

  const onPointerDown = (event: UIPointerEvent): void => {
    if (event.pointerType === 'touch') {
      // A touch is a tap or a pan until it has been held: the root says which, and a hold selects a word.
      heldLift.current = false;
      touchHolder.current = event.currentTarget;
      longPress.start(event.pointerId, { x: event.x, y: event.y });
      return;
    }
    if (event.button !== PRIMARY_BUTTON) return;
    setTouchOwned(false);
    const offset = offsetAt(event.x, event.y);
    if (offset === undefined) return;
    hover.cancel();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerRef.current = { x: event.x, y: event.y };
    controller.pointerDown({ offset, clicks: clicks.current.press(event.x, event.y, event.timeStamp), shiftKey: event.shiftKey, altKey: event.altKey });
    takeKeyboard();
    event.preventDefault();
  };

  const onPointerMove = (event: UIPointerEvent): void => {
    pointerRef.current = { x: event.x, y: event.y };
    if (event.pointerType === 'touch') longPress.moved(event.pointerId, pointerRef.current);
    if (controller.selecting) {
      const offset = offsetAt(event.x, event.y);
      if (offset !== undefined) controller.pointerMove(offset);
      autoscroll.update();
      return;
    }
    if (event.pointerType === 'touch') return;
    hover.moved(wordUnder(event.x, event.y));
  };

  const endPointer = (event: UIPointerEvent): void => {
    if (event.pointerType === 'touch') {
      longPress.end(event.pointerId);
      if (heldTouch.current === event.pointerId) {
        heldTouch.current = undefined;
        heldLift.current = true;
        setTouchBusy(false);
        // The keyboard went away with the finger's first touch of the canvas, and comes back with its lift, as after a tap.
        takeKeyboard();
      }
    }
    controller.pointerUp();
    autoscroll.stop();
  };

  // A tap: touch has no press-and-drag (the finger pans), so the caret goes where the finger lifted, and the keyboard comes up.
  const onClick = (event: UIPointerEvent): void => {
    if (event.pointerType !== 'touch') return;
    if (heldLift.current) {
      heldLift.current = false;
      return;
    }
    const offset = offsetAt(event.x, event.y);
    if (offset === undefined) return;
    controller.pointerDown({ offset, clicks: Math.max(1, event.detail), shiftKey: false, altKey: false });
    controller.pointerUp();
    takeKeyboard();
  };

  /** Where the selection's end `offset` is, in the content's frame: a stem the height of its line. `undefined` for a line that is not laid out. */
  function edgeOf(offset: number): Edge | undefined {
    const current = gridRef.current;
    if (current === undefined) return undefined;
    const line = controller.model.doc.lineAt(offset);
    const layout = controller.layoutOf(line.number);
    const inLine = offset - line.from;
    let x: number | undefined;
    if (layout.onGrid) {
      x = xOfColumn(layout.columnOf(inLine), current);
    } else {
      const rect = lineHandles.current.get(line.number)?.getCaretRect(inLine, 'before');
      const content = contentRef.current?.getRect();
      x = rect === undefined || content === undefined ? undefined : rect.x - content.x;
    }
    if (x === undefined) return undefined;
    const top = yOfLine(line.number, current);
    return { x, top, bottom: top + current.lineHeight };
  }

  /** A finger went down on a handle: the other end stays, and the handle keeps its distance from the finger. */
  const onHandleGrab = (end: HandleEnd, event: UIPointerEvent): void => {
    const content = contentRef.current?.getRect();
    const { main: range } = controller.model.state.selection;
    const edge = edgeOf(end === 'start' ? range.from : range.to);
    if (content === undefined || edge === undefined) return;
    const grab = grabOffset({ x: content.x + edge.x, top: content.y + edge.top, bottom: content.y + edge.bottom }, { x: event.x, y: event.y });
    handleDrag.current = { pointerId: event.pointerId, fixed: end === 'start' ? range.to : range.from, grab };
    pointerRef.current = dragTarget({ x: event.x, y: event.y }, grab);
    setTouchBusy(true);
  };

  const onHandleDrag = (event: UIPointerEvent): void => {
    const drag = handleDrag.current;
    if (drag?.pointerId !== event.pointerId) return;
    const target = dragTarget({ x: event.x, y: event.y }, drag.grab);
    pointerRef.current = target;
    const offset = offsetAt(target.x, target.y);
    if (offset !== undefined) controller.dragSelectionEnd(drag.fixed, offset);
    autoscroll.update();
  };

  const onHandleRelease = (event: UIPointerEvent): void => {
    if (handleDrag.current?.pointerId !== event.pointerId) return;
    handleDrag.current = undefined;
    autoscroll.stop();
    setTouchBusy(false);
    takeKeyboard();
  };

  const onMenuAction = (action: MenuAction): void => {
    switch (action) {
      case 'copy':
        controller.copy();
        // The selection stays, so it shows what was copied; the menu has done its work.
        setMenuDismissedFor(restartKey);
        break;
      case 'cut':
        controller.run(cutSelection);
        break;
      case 'paste': {
        const text = controller.commandContext().clipboard.readText?.() ?? '';
        if (text !== '') controller.run(context => pasteText(context, text));
        break;
      }
      case 'selectAll':
        controller.selectAllText();
        break;
    }
    takeKeyboard();
  };

  const onKeyDown = (event: UIKeyboardEvent): void => {
    hover.cancel();
    if (controller.keyDown(event)) event.preventDefault();
  };

  const onBeforeInput = (event: UIBeforeInputEvent): void => {
    hover.cancel();
    controller.beforeInput(event.inputType, event.data, event.timeStamp);
    // The editor's text is the controller's; the input's own buffer is never allowed to hold any.
    event.preventDefault();
  };

  const onScroll = useCallback((event: UIScrollEvent): void => {
    setScroll({ top: event.scrollTop, left: event.scrollLeft, width: event.clientWidth, height: event.clientHeight });
  }, []);

  const focused = controller.focused;
  // Until a line that is not on the grid has been measured its caret is where the grid would put it.
  const leftOf = (placement: CaretPlacement, current: Grid): number => (
    placement.onGrid ? xOfColumn(placement.column, current)
      : measuredCarets.find(caret => caret.key === caretKey(placement))?.left ?? xOfColumn(placement.column, current)
  );
  const carets: CaretRect[] = grid === undefined ? [] : placements.map(placement => ({
    left: leftOf(placement, grid), top: yOfLine(placement.line, grid), height: grid.lineHeight, main: placement.main,
  }));
  const inView = grid === undefined ? undefined : visibleLines(scroll.top, scroll.height, grid, controller.lineCount);
  const specs = inView === undefined ? [] : controller.lines(inView.first, inView.last);
  const restartKey = `${controller.model.version}:${selection.ranges.map(range => `${range.anchor}-${range.head}`).join(',')}`;
  // A touch selection's chrome: the handles at the ends of the main selection, and the menu over them.
  useEffect(() => { if (selectionEmpty && touchOwned) setTouchOwned(false); }, [selectionEmpty, touchOwned]);
  const showChrome = touchOwned && !selectionEmpty && grid !== undefined;
  const chromeRange = selection.main;
  const startEdge = showChrome ? edgeOf(chromeRange.from) : undefined;
  const endEdge = showChrome ? edgeOf(chromeRange.to) : undefined;
  const clipboardText = controller.commandContext().clipboard.readText?.();
  const offered = menuActions({ editable: !controller.model.state.readOnly, hasSelection: true, allSelected: chromeRange.from === 0 && chromeRange.to === doc.length })
    .filter(action => action !== 'paste' || (clipboardText !== undefined && clipboardText !== ''));
  const inScrollerView = (edge: Edge): boolean => (
    edge.top >= scroll.top - 1 && edge.bottom <= scroll.top + scroll.height + 1 && edge.x >= scroll.left && edge.x <= scroll.left + scroll.width
  );
  const menu = showChrome && !touchBusy && menuDismissedFor !== restartKey
    ? placeMenu(
      offered.map(action => ({ action, width: MENU_LABELS[action].length * MENU_LABEL_ADVANCE_PX })),
      [startEdge, endEdge].filter((edge): edge is Edge => edge !== undefined && inScrollerView(edge)),
      { x: scroll.left, y: scroll.top, width: scroll.width, height: scroll.height },
    )
    : undefined;

  return (
    <View testID="code-view" className="relative min-h-0 min-w-0 flex-1" style={{ backgroundColor: THEME.background }}>
      <GridProbe onMeasured={onMeasured} />
      {grid === undefined ? null : (
        <View ref={scrollerRef} testID="code-scroll" className="absolute inset-0 overflow-auto" onScroll={onScroll}>
          <View
            ref={contentRef}
            testID="code-content"
            className="relative cursor-text"
            style={{
              width: Math.max(scroll.width, grid.gutterWidth + (columns + TRAILING_COLUMNS) * grid.advance),
              height: Math.max(scroll.height, controller.lineCount * grid.lineHeight),
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            onPointerLeave={() => { hover.cancel(); }}
            onClick={onClick}
          >
            {specs.map(spec => (
              <CodeLine
                key={spec.number}
                spec={spec}
                lineHeight={grid.lineHeight}
                left={grid.gutterWidth}
                current={selectionEmpty && currentLines.has(spec.number)}
                onHandle={onLineHandle}
              />
            ))}
            <View
              testID="code-gutter"
              className="absolute top-0 select-none"
              style={{ left: scroll.left, width: grid.gutterWidth, height: controller.lineCount * grid.lineHeight, backgroundColor: THEME.gutterBackground }}
            >
              {specs.map(spec => (
                <GutterCell
                  key={spec.number}
                  number={spec.number}
                  severity={spec.severity}
                  current={currentLines.has(spec.number)}
                  advance={grid.advance}
                  lineHeight={grid.lineHeight}
                  width={grid.gutterWidth}
                />
              ))}
            </View>
            <Carets carets={carets} focused={focused} restart={restartKey} />
            {startEdge === undefined ? null : <SelectionHandle end="start" edge={startEdge} onGrab={onHandleGrab} onDrag={onHandleDrag} onRelease={onHandleRelease} />}
            {endEdge === undefined ? null : <SelectionHandle end="end" edge={endEdge} onGrab={onHandleGrab} onDrag={onHandleDrag} onRelease={onHandleRelease} />}
            {menu === undefined ? null : <SelectionMenu placement={menu} onAction={onMenuAction} />}
            <TextInput
              ref={sinkRef}
              testID="editor-input-sink"
              aria-label="Code editor input"
              role="textbox"
              multiline
              autoFocus
              defaultValue={SINK_TEXT}
              className="absolute opacity-0 pointer-events-none"
              style={{
                left: main === undefined ? 0 : leftOf(main, grid),
                top: main === undefined ? 0 : yOfLine(main.line, grid),
                width: 1, height: grid.lineHeight,
              }}
              keyClaims={controller.keyClaims}
              onKeyDown={onKeyDown}
              onBeforeInput={onBeforeInput}
              onCompositionStart={(_: UICompositionEvent) => controller.compositionStart()}
              onCompositionUpdate={(event: UICompositionEvent) => controller.compositionUpdate(event.data)}
              onCompositionEnd={(_: UICompositionEvent) => controller.compositionEnd()}
              onFocus={() => controller.setFocused(true)}
              onBlur={() => controller.setFocused(false)}
            />
          </View>
        </View>
      )}
      {tooltip === undefined ? null : <HoverTooltip anchor={tooltip.anchor} lines={tooltip.lines} />}
    </View>
  );
}

function diagnosticText(diagnostic: EditorDiagnostic): string {
  return diagnostic.code === undefined ? diagnostic.message : `${diagnostic.message} (TS${diagnostic.code})`;
}
