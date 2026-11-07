import {
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore,
} from 'react';
import {
  TextInput, View, useRootSize,
  type TextInputHandle, type UIBeforeInputEvent, type UICompositionEvent, type UIHandle, type UIKeyboardEvent, type UIPointerEvent, type UIScrollEvent,
} from 'godot-react-ui';
import type { LayoutRect } from '../../../../src/native';
import type { EditorController } from '../controller';
import type { EditorDiagnostic } from '../diagnostics';
import {
  TRAILING_COLUMNS, columnAtX, gutterWidthFor, lineAtY, scrollToReveal, visibleLines, xOfColumn, yOfLine, type Grid,
} from '../geometry';
import { THEME } from '../theme';
import type { EditorWorkspace, FileEditor } from '../workspace';
import { Autoscroll } from './autoscroll';
import { ClickSequence } from './click-sequence';
import { Carets, type CaretRect } from './carets';
import { GutterCell } from './gutter';
import { GridProbe, type MeasuredGrid } from './grid-probe';
import { HoverTracker, type HoverTarget } from './hover';
import { HoverTooltip, type TooltipLine } from './hover-tooltip';
import { RunLine } from './run-line';

/**
 * The editor's body: the lines in view, the line numbers, the selections and carets, and the invisible text input that is the
 * keyboard's way in. The text is the controller's (CodeMirror state); this draws it and passes keys, composition, `beforeinput`
 * and the pointer on to it. Nothing here keeps the text.
 *
 * - The content is one scrolling `View` as tall as the file and as wide as its longest line; only the lines near the viewport
 *   are elements. A scroll event moves the window; a line that stays in it keeps its props and costs no native commit.
 * - The caret blinks inside `Carets` alone. The text input is an empty, one-column-wide `TextInput` at the caret, so the IME's
 *   window and the soft keyboard follow the caret; every `keydown` and `beforeinput` is answered by the controller and prevented.
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

export interface EditorViewProps {
  readonly workspace: EditorWorkspace;
  readonly file: FileEditor;
}

/** The length in columns of the longest line, with the hints that stand in it. */
function longestLine(controller: EditorController): number {
  const { doc } = controller.model;
  let longest = 0;
  for (let number = 1; number <= doc.lines; number += 1) longest = Math.max(longest, doc.line(number).length);
  const hinted = new Map<number, number>();
  for (const inlay of controller.inlays.items) {
    const line = doc.lineAt(inlay.at);
    hinted.set(line.number, (hinted.get(line.number) ?? 0) + inlay.label.length);
  }
  for (const [number, extra] of hinted) longest = Math.max(longest, doc.line(number).length + extra);
  return longest;
}

function wordAt(controller: EditorController, grid: Grid, x: number, y: number): HoverTarget | undefined {
  const lineNumber = lineAtY(y, grid, controller.lineCount);
  const line = controller.model.doc.line(lineNumber);
  const column = Math.floor((x - grid.gutterWidth) / grid.advance);
  if (column < 0) return undefined;
  const layout = controller.layoutOf(lineNumber);
  const offset = layout.offsetAt(column);
  // Over a hint or past the end of the line there is no word.
  if (layout.columnOf(offset) !== column || offset >= line.length) return undefined;
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

  // Bring the caret into view when it moved because of what the person did.
  useLayoutEffect(() => {
    if (grid === undefined || main === undefined) return;
    const state = scrollerRef.current?.getScrollState();
    if (state === undefined) return;
    const margin = REVEAL_MARGIN_LINES * grid.lineHeight;
    const top = scrollToReveal(state.scrollTop, state.clientHeight, yOfLine(main.line, grid), yOfLine(main.line, grid) + grid.lineHeight, margin);
    const textWidth = state.clientWidth - grid.gutterWidth;
    const caretX = main.column * grid.advance;
    const left = scrollToReveal(state.scrollLeft, textWidth, caretX, caretX + grid.advance, REVEAL_MARGIN_COLUMNS * grid.advance);
    if (top !== state.scrollTop || left !== state.scrollLeft) scrollerRef.current?.scrollTo({ top, left });
  }, [controller.revealEpoch, grid === undefined]);

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
      const startColumn = layout.columnOf(target.from - line.from);
      const endColumn = layout.columnOf(Math.min(target.to, line.to) - line.from);
      setTooltip({
        anchor: {
          x: content.x + xOfColumn(startColumn, current), y: content.y + yOfLine(line.number, current),
          width: Math.max(current.advance, (endColumn - startColumn) * current.advance), height: current.lineHeight,
        },
        lines,
      });
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
      if (offset !== undefined) controller.pointerMove(offset);
    },
  }), [controller]);
  useEffect(() => () => autoscroll.stop(), [autoscroll]);

  /** The document offset of the caret boundary at root-local (`x`, `y`), from the content's rectangle now. */
  function offsetAt(x: number, y: number): number | undefined {
    const content = contentRef.current?.getRect();
    const current = gridRef.current;
    if (content === undefined || current === undefined) return undefined;
    const line = lineAtY(y - content.y, current, controller.lineCount);
    return controller.offsetAtColumn(line, columnAtX(x - content.x, current));
  }

  function offsetUnderPointer(): number | undefined {
    const pointer = pointerRef.current;
    return pointer === undefined ? undefined : offsetAt(pointer.x, pointer.y);
  }

  /**
   * Gives the keyboard to the input again. Focusing the element that has the focus is no change, and the platform's text session (the IME
   * on a desktop browser, the soft keyboard on a touch one) is begun by a change of focus: after the browser has given its focus to the
   * canvas or the keyboard has been put away, a press that only calls `focus()` would leave the editor without either. A press is the
   * gesture a browser allows that in.
   */
  const takeKeyboard = (): void => {
    sinkRef.current?.blur();
    sinkRef.current?.focus();
  };

  const onPointerDown = (event: UIPointerEvent): void => {
    if (event.pointerType === 'touch' || event.button !== PRIMARY_BUTTON) return;
    const offset = offsetAt(event.x, event.y);
    if (offset === undefined) return;
    hover.cancel();
    takeKeyboard();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerRef.current = { x: event.x, y: event.y };
    controller.pointerDown({ offset, clicks: clicks.current.press(event.x, event.y, event.timeStamp), shiftKey: event.shiftKey, altKey: event.altKey });
    event.preventDefault();
  };

  const onPointerMove = (event: UIPointerEvent): void => {
    pointerRef.current = { x: event.x, y: event.y };
    if (controller.selecting) {
      const offset = offsetAt(event.x, event.y);
      if (offset !== undefined) controller.pointerMove(offset);
      autoscroll.update();
      return;
    }
    if (event.pointerType === 'touch' || grid === undefined) return;
    const content = contentRef.current?.getRect();
    if (content === undefined) return;
    hover.moved(wordAt(controller, grid, event.x - content.x, event.y - content.y));
  };

  const endPointer = (): void => {
    controller.pointerUp();
    autoscroll.stop();
  };

  // A tap: touch has no press-and-drag (the finger pans), so the caret goes where the finger lifted, and the keyboard comes up.
  const onClick = (event: UIPointerEvent): void => {
    if (event.pointerType !== 'touch') return;
    const offset = offsetAt(event.x, event.y);
    if (offset === undefined) return;
    takeKeyboard();
    controller.pointerDown({ offset, clicks: Math.max(1, event.detail), shiftKey: false, altKey: false });
    controller.pointerUp();
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
  const carets: CaretRect[] = grid === undefined ? [] : placements.map(placement => ({
    left: xOfColumn(placement.column, grid), top: yOfLine(placement.line, grid), height: grid.lineHeight, main: placement.main,
  }));
  const inView = grid === undefined ? undefined : visibleLines(scroll.top, scroll.height, grid, controller.lineCount);
  const specs = inView === undefined ? [] : controller.lines(inView.first, inView.last);
  const restartKey = `${controller.model.version}:${selection.ranges.map(range => `${range.anchor}-${range.head}`).join(',')}`;

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
              <RunLine
                key={spec.number}
                spec={spec}
                advance={grid.advance}
                lineHeight={grid.lineHeight}
                left={grid.gutterWidth}
                current={selectionEmpty && currentLines.has(spec.number)}
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
            <TextInput
              ref={sinkRef}
              testID="editor-input-sink"
              aria-label="Code editor input"
              role="textbox"
              multiline
              autoFocus
              className="absolute opacity-0 pointer-events-none"
              style={{
                left: main === undefined ? 0 : xOfColumn(main.column, grid),
                top: main === undefined ? 0 : yOfLine(main.line, grid),
                width: 1, height: grid.lineHeight,
              }}
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
