import {
  useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState,
} from 'react';
import {
  EditorSelection, EditorState, findClusterBreak, Transaction, CharCategory,
  type TransactionSpec,
} from '@codemirror/state';
import { ensureSyntaxTree, bracketMatching, indentUnit } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import {
  history, undo, redo, cursorCharLeft, cursorCharRight, cursorLineUp, cursorLineDown,
  cursorLineStart, cursorLineEnd, deleteCharBackward, deleteCharForward, insertNewlineAndIndent,
  selectAll, insertTab, indentMore, indentLess,
} from '@codemirror/commands';
import { highlightTree, tags as t, type Tag } from '@lezer/highlight';
import {
  Virtualizer, type VirtualItem, type VirtualizerOptions,
} from '@tanstack/virtual-core';
import {
  Button, ScrollView, Text, TextInput, View,
  type TextInputHandle, type UIHandle, type UIKeyboardEvent, type UIScrollEvent,
} from 'godot-react-ui';
import type { Lab } from './labs';
import type { ExtensionHost } from './live-compile-host';

// Safely obtain the Godot module when running in GodotJS, without failing under Node.js tests.
function getGodot(): typeof import('godot') | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return typeof require === 'function' ? require('godot') : undefined;
  } catch {
    return undefined;
  }
}

function tryOpenExtensionHost(): ExtensionHost | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const hostModule = typeof require === 'function' ? require('./live-compile-host') : undefined;
    return hostModule ? hostModule.openExtensionHost() : null;
  } catch {
    return null;
  }
}

const CHAR_WIDTH = 7.8;
const LINE_HEIGHT = 20;
const GUTTER_WIDTH = 44;
const BLINK_INTERVAL_MS = 530;

// ---- Syntax token colors (One Dark palette) -----------------------------------------------------------------

function colorForTag(tags: readonly Tag[]): `#${string}` | undefined {
  for (const tag of tags) {
    if (tag === t.keyword || tag === t.operatorKeyword || tag === t.modifier) return '#c678dd';
    if (tag === t.string || tag === t.special(t.string)) return '#98c379';
    if (tag === t.comment || tag === t.lineComment || tag === t.blockComment) return '#64748b';
    if (tag === t.number || tag === t.bool || tag === t.null) return '#d19a66';
    if (tag === t.typeName || tag === t.standard(t.typeName)) return '#e5c07b';
    if (tag === t.function(t.variableName) || tag === t.definition(t.variableName)) return '#61afef';
    if (tag === t.tagName || tag === t.angleBracket) return '#e06c75';
    if (tag === t.attributeName) return '#d19a66';
    if (tag === t.variableName || tag === t.propertyName) return '#e2e8f0';
    if (tag === t.punctuation || tag === t.bracket) return '#94a3b8';
  }
  return undefined;
}

const customHighlighter = {
  style(tags: readonly Tag[]): string | null {
    return colorForTag(tags) ?? null;
  },
};

interface StyledSpan {
  from: number;
  to: number;
  color?: `#${string}`;
}

function getLineSpans(state: EditorState, lineFrom: number, lineTo: number): StyledSpan[] {
  const tree = ensureSyntaxTree(state, lineTo, 100);
  if (!tree) return [{ from: lineFrom, to: lineTo }];

  const rawSpans: Array<{ from: number; to: number; color: `#${string}` }> = [];
  highlightTree(
    tree,
    customHighlighter,
    (from, to, color) => {
      rawSpans.push({ from: Math.max(from, lineFrom), to: Math.min(to, lineTo), color: color as `#${string}` });
    },
    lineFrom,
    lineTo,
  );

  const result: StyledSpan[] = [];
  let current = lineFrom;

  for (const span of rawSpans) {
    if (span.from > current) {
      result.push({ from: current, to: span.from });
    }
    result.push(span);
    current = Math.max(current, span.to);
  }

  if (current < lineTo) {
    result.push({ from: current, to: lineTo });
  }

  return result.length === 0 ? [{ from: lineFrom, to: lineTo }] : result;
}

// ---- MonospaceCommandTarget ---------------------------------------------------------------------------------

class MonospaceCommandTarget {
  readonly state: EditorState;
  readonly dispatch: (...specs: unknown[]) => void;
  readonly charWidth: number;
  readonly defaultLineHeight: number;
  readonly scrollDOM: {
    clientHeight: number;
    scrollTop: number;
    scrollHeight: number;
    getBoundingClientRect: () => { left: number; right: number; top: number; bottom: number };
  };
  readonly lineWrapping = false;
  readonly documentTop = 0;
  readonly dom = { getBoundingClientRect: () => ({ left: 0, right: 10_000, top: 0, bottom: 10_000 }) };

  constructor(
    state: EditorState,
    dispatch: (tr: Transaction) => void,
    options: { charWidth?: number; lineHeight?: number; viewportHeight?: number } = {},
  ) {
    this.state = state;
    this.charWidth = options.charWidth ?? CHAR_WIDTH;
    this.defaultLineHeight = options.lineHeight ?? LINE_HEIGHT;
    const viewportHeight = options.viewportHeight ?? 400;

    this.dispatch = (...specs: unknown[]) => {
      if (specs.length === 1 && specs[0] instanceof Transaction) {
        dispatch(specs[0]);
      } else {
        dispatch(state.update(...(specs as TransactionSpec[])));
      }
    };

    this.scrollDOM = {
      clientHeight: viewportHeight,
      scrollTop: 0,
      scrollHeight: state.doc.lines * this.defaultLineHeight + viewportHeight,
      getBoundingClientRect: () => ({ left: 0, right: 10_000, top: 0, bottom: viewportHeight }),
    };
  }

  textDirectionAt(): number {
    return 0; // LTR
  }

  moveByChar(
    start: { head: number },
    forward: boolean,
    by?: (char: string) => ((next: string) => boolean) | boolean,
  ): { head: number } {
    const doc = this.state.doc;
    let head = start.head;
    let check: ((char: string) => boolean) | null = null;
    for (;;) {
      const line = doc.lineAt(head);
      let next: number;
      let char: string;
      if (forward ? head === line.to : head === line.from) {
        if (line.number === (forward ? doc.lines : 1)) break;
        next = forward ? doc.line(line.number + 1).from : doc.line(line.number - 1).to;
        char = '\n';
      } else {
        const offset = findClusterBreak(line.text, head - line.from, forward);
        next = line.from + offset;
        char = line.text.slice(Math.min(offset, head - line.from), Math.max(offset, head - line.from));
      }
      if (check === null) {
        if (by === undefined) return EditorSelection.cursor(next);
        const res = by(char);
        if (typeof res === 'function') {
          check = res;
        } else if (!res) {
          break;
        }
      } else if (!check(char)) {
        break;
      }
      head = next;
    }
    return EditorSelection.cursor(head);
  }

  moveByGroup(start: { head: number }, forward: boolean): { head: number } {
    const categorize = this.state.charCategorizer(start.head);
    return this.moveByChar(start, forward, (initial: string) => {
      let category = categorize(initial);
      return (next: string) => {
        const nextCategory = categorize(next);
        if (category === CharCategory.Space) category = nextCategory;
        return category === nextCategory;
      };
    });
  }

  moveToLineBoundary(start: { head: number }, forward: boolean): { head: number } {
    const line = this.state.doc.lineAt(start.head);
    return EditorSelection.cursor(forward ? line.to : line.from, forward ? 1 : -1);
  }

  moveVertically(start: { head: number; goalColumn?: number }, forward: boolean, distance?: number): { head: number } {
    const doc = this.state.doc;
    const line = doc.lineAt(start.head);
    const goal = start.goalColumn ?? (start.head - line.from) * this.charWidth;
    const lines = distance === undefined ? 1 : Math.max(1, Math.round(distance / this.defaultLineHeight));
    const target = Math.min(doc.lines, Math.max(1, line.number + (forward ? lines : -lines)));
    if (target === line.number) return EditorSelection.cursor(forward ? doc.length : 0, undefined, undefined, goal);
    const destination = doc.line(target);
    const column = Math.min(destination.length, Math.round(goal / this.charWidth));
    return EditorSelection.cursor(destination.from + column, undefined, undefined, goal);
  }

  lineBlockAt(pos: number) {
    const line = this.state.doc.lineAt(pos);
    const top = (line.number - 1) * this.defaultLineHeight;
    return { from: line.from, to: line.to, top, bottom: top + this.defaultLineHeight, height: this.defaultLineHeight, length: line.length, type: 0 };
  }

  coordsAtPos(pos: number) {
    const line = this.state.doc.lineAt(pos);
    const top = (line.number - 1) * this.defaultLineHeight;
    const left = (pos - line.from) * this.charWidth;
    return { left, right: left, top, bottom: top + this.defaultLineHeight };
  }

  setTabFocusMode(): void {}
}

// ---- Virtualizer Adapter -----------------------------------------------------------------------------------

class GodotScrollSource {
  scrollTop = 0;
  scrollLeft = 0;
  clientWidth = 0;
  clientHeight = 0;
  scrollWidth = 0;
  scrollHeight = 0;
  handle: UIHandle | null = null;
  readonly scrollListeners = new Set<() => void>();

  readonly window = {
    requestAnimationFrame: (cb: () => void) => Number(setTimeout(cb, 16)),
    cancelAnimationFrame: (id: number) => clearTimeout(id),
    setTimeout,
    clearTimeout,
    performance: { now: () => Date.now() },
  };

  attach = (handle: UIHandle | null): void => {
    this.handle = handle;
    if (handle === null) return;
    try {
      const state = handle.getScrollState();
      if (state !== undefined) {
        this.scrollTop = state.scrollTop;
        this.clientWidth = state.clientWidth;
        this.clientHeight = state.clientHeight;
        this.scrollWidth = state.scrollWidth;
        this.scrollHeight = state.scrollHeight;
      }
    } catch {
      // Ignore in mock test environments
    }
  };

  onScroll = (event: UIScrollEvent): void => {
    this.scrollTop = event.scrollTop;
    this.scrollLeft = event.scrollLeft;
    this.clientWidth = event.clientWidth;
    this.clientHeight = event.clientHeight;
    this.scrollWidth = event.scrollWidth;
    this.scrollHeight = event.scrollHeight;
    this.scrollListeners.forEach(fn => fn());
  };

  scrollTo(options: { top?: number; left?: number }): void {
    if (this.handle !== null) {
      try {
        this.handle.scrollTo({ top: options.top, left: options.left });
      } catch {
        // In test environments without native scroll containers, ignore
      }
    }
  }
}

type GodotOptions = Omit<
  VirtualizerOptions<Element, Element>,
  'getScrollElement' | 'observeElementRect' | 'observeElementOffset' | 'scrollToFn' | 'onChange'
>;

function useGodotVirtualizer(options: GodotOptions) {
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const [{ source, virtualizer }] = useState(() => {
    const scrollSource = new GodotScrollSource();
    const resolved: VirtualizerOptions<Element, Element> = {
      ...options,
      getScrollElement: () => (scrollSource.handle === null ? null : (scrollSource as unknown as Element)),
      observeElementRect: (_inst, cb) => {
        cb({ width: scrollSource.clientWidth, height: scrollSource.clientHeight });
        const listener = () => cb({ width: scrollSource.clientWidth, height: scrollSource.clientHeight });
        scrollSource.scrollListeners.add(listener);
        return () => { scrollSource.scrollListeners.delete(listener); };
      },
      observeElementOffset: (_inst, cb) => {
        const listener = () => cb(scrollSource.scrollTop, true);
        scrollSource.scrollListeners.add(listener);
        return () => { scrollSource.scrollListeners.delete(listener); };
      },
      scrollToFn: (offset, { adjustments = 0 }) => {
        scrollSource.scrollTo({ top: offset + adjustments });
      },
      onChange: () => { rerender(); },
    };
    return { source: scrollSource, virtualizer: new Virtualizer<Element, Element>(resolved) };
  });

  virtualizer.setOptions({
    ...virtualizer.options,
    ...options,
    onChange: () => { rerender(); },
  });

  useLayoutEffect(() => virtualizer._didMount(), [virtualizer]);
  useLayoutEffect(() => virtualizer._willUpdate());

  return {
    source,
    containerRef: source.attach,
    onScroll: source.onScroll,
    items: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
  };
}

// ---- Source Loading Helper ----------------------------------------------------------------------------------

function loadSourceText(path: string): string {
  try {
    const godot = getGodot();
    if (godot?.FileAccess) {
      const text = godot.FileAccess.getFileAsString(path);
      if (text !== '') return text;
    }
  } catch {
    // Fall through to project JSON
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const hostModule = typeof require === 'function' ? require('./live-compile-host') : undefined;
    if (hostModule?.readProject) {
      const project = hostModule.readProject();
      const normalized = path.replace(/^res:\/\/src\//u, '/project/lab/').replace(/^\.\.\/demo\/src\//u, '/project/lab/');
      const file = project.files.find((f: { path: string }) => f.path.endsWith(normalized) || normalized.endsWith(f.path));
      if (file) return file.text;
    }
  } catch {
    // Live compile project not loaded
  }

  return '// Source file could not be read.';
}

// ---- CodeEditor Component -----------------------------------------------------------------------------------

export interface CodeEditorProps {
  readonly lab: Lab;
}

export function CodeEditor({ lab }: CodeEditorProps) {
  const sources = lab.sources ?? [];
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const activePath = sources[activeSourceIndex] ?? '';

  // Initial document text for the active file
  const initialText = useMemo(() => {
    return activePath ? loadSourceText(activePath) : '';
  }, [activePath]);

  // CodeMirror State
  const [editorState, setEditorState] = useState(() => {
    return EditorState.create({
      doc: initialText,
      extensions: [
        javascript({ jsx: true, typescript: true }),
        history(),
        EditorState.allowMultipleSelections.of(true),
        indentUnit.of('  '),
        bracketMatching(),
      ],
    });
  });

  // Re-create state when active file changes
  useEffect(() => {
    setEditorState(
      EditorState.create({
        doc: initialText,
        extensions: [
          javascript({ jsx: true, typescript: true }),
          history(),
          EditorState.allowMultipleSelections.of(true),
          indentUnit.of('  '),
          bracketMatching(),
        ],
      }),
    );
  }, [initialText]);

  // Caret blink state
  const [caretVisible, setCaretVisible] = useState(true);
  useEffect(() => {
    const timer = setInterval(() => {
      setCaretVisible(v => !v);
    }, BLINK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // Live compile host
  const hostRef = useRef<ExtensionHost | null>(null);
  useEffect(() => {
    hostRef.current = tryOpenExtensionHost();
  }, []);

  // Compile status
  const [compileStatus, setCompileStatus] = useState<{ ok: boolean; message: string }>({
    ok: true,
    message: 'Ready',
  });

  // Push changes to live compile host
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onDocChange = useCallback((text: string) => {
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    updateTimeoutRef.current = setTimeout(() => {
      const host = hostRef.current;
      if (!host) return;

      const started = Date.now();
      const res = host.compile(activePath, text, true);
      const elapsed = Date.now() - started;

      if (res.ok) {
        setCompileStatus({ ok: true, message: `✓ Live compiled in ${elapsed}ms` });
      } else {
        const firstErr = res.diagnostics[0]?.message ?? 'Syntax error';
        setCompileStatus({ ok: false, message: `❌ ${firstErr}` });
      }
    }, 150);
  }, [activePath]);

  // Input Sink handle
  const inputRef = useRef<TextInputHandle | null>(null);

  // Command target
  const dispatchTransaction = useCallback((tr: Transaction) => {
    setEditorState(tr.state);
    if (tr.docChanged) {
      onDocChange(tr.newDoc.toString());
    }
  }, [onDocChange]);

  const commandTarget = useMemo(() => {
    return new MonospaceCommandTarget(editorState, dispatchTransaction, {
      charWidth: CHAR_WIDTH,
      lineHeight: LINE_HEIGHT,
      viewportHeight: 400,
    });
  }, [editorState, dispatchTransaction]);

  // Keyboard navigation & editing
  const onKeyDown = (event: UIKeyboardEvent) => {
    const target = commandTarget as unknown as Parameters<typeof cursorCharLeft>[0];
    let handled = false;

    if (event.key === 'ArrowLeft') {
      handled = cursorCharLeft(target);
    } else if (event.key === 'ArrowRight') {
      handled = cursorCharRight(target);
    } else if (event.key === 'ArrowUp') {
      handled = cursorLineUp(target);
    } else if (event.key === 'ArrowDown') {
      handled = cursorLineDown(target);
    } else if (event.key === 'Home') {
      handled = cursorLineStart(target);
    } else if (event.key === 'End') {
      handled = cursorLineEnd(target);
    } else if (event.key === 'Backspace') {
      handled = deleteCharBackward(target);
    } else if (event.key === 'Delete') {
      handled = deleteCharForward(target);
    } else if (event.key === 'Enter') {
      handled = insertNewlineAndIndent(target);
    } else if (event.key === 'Tab') {
      handled = event.shiftKey ? indentLess(target) : insertTab(target);
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      handled = event.shiftKey ? redo(target) : undo(target);
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      handled = redo(target);
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      handled = selectAll(target);
    }

    if (handled) {
      event.preventDefault();
      setCaretVisible(true);
    }
  };

  // Virtualizer for lines
  const virtualizer = useGodotVirtualizer({
    count: editorState.doc.lines,
    estimateSize: () => LINE_HEIGHT,
    overscan: 6,
  });

  // Cursor position info
  const cursorHead = editorState.selection.main.head;
  const cursorLine = editorState.doc.lineAt(cursorHead);
  const cursorCol = cursorHead - cursorLine.from;

  // Caret coordinate relative to content
  const caretX = GUTTER_WIDTH + cursorCol * CHAR_WIDTH;
  const caretY = (cursorLine.number - 1) * LINE_HEIGHT;

  return (
    <View testID="code-editor" className="flex-1 flex-col bg-slate-900 border-l border-slate-800">
      {/* Tab bar for multi-file labs */}
      {sources.length > 1 ? (
        <View className="flex-row items-center border-b border-slate-800 bg-slate-950 px-2 pt-1 gap-1">
          {sources.map((src, index) => {
            const fileName = src.split('/').pop() ?? src;
            const isActive = index === activeSourceIndex;
            return (
              <Button
                key={src}
                className={`rounded-t px-3 py-1 text-xs font-mono transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-slate-100 border-t-2 border-indigo-500 font-medium'
                    : 'bg-transparent text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => setActiveSourceIndex(index)}
              >
                <Text className={isActive ? 'text-slate-100 font-semibold' : 'text-slate-400'}>
                  {fileName}
                </Text>
              </Button>
            );
          })}
        </View>
      ) : null}

      {/* Editor Body */}
      <View className="relative flex-1 min-h-0 min-w-0" onClick={() => inputRef.current?.focus()}>
        <ScrollView
          ref={virtualizer.containerRef}
          onScroll={virtualizer.onScroll}
          className="absolute inset-0 overflow-y-auto"
          contentStyle={{ height: virtualizer.totalSize, position: 'relative' }}
        >
          {/* Virtualized visible lines */}
          {virtualizer.items.map((virtualItem: VirtualItem) => {
            const lineNum = virtualItem.index + 1;
            const line = editorState.doc.line(lineNum);
            const spans = getLineSpans(editorState, line.from, line.to);

            return (
              <View
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: virtualItem.start,
                  left: 0,
                  right: 0,
                  height: LINE_HEIGHT,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                {/* Gutter */}
                <View style={{ width: GUTTER_WIDTH, paddingRight: 10, alignItems: 'flex-end' }}>
                  <Text className="font-mono text-xs text-slate-600 select-none">
                    {String(lineNum)}
                  </Text>
                </View>

                {/* Line text runs */}
                <View className="flex-row flex-1 min-w-0">
                  {spans.map((span, sIndex) => {
                    const text = editorState.doc.sliceString(span.from, span.to);
                    return (
                      <Text
                        key={sIndex}
                        style={{ color: span.color ?? '#abb2bf' }}
                        className="font-mono text-xs whitespace-pre"
                      >
                        {text}
                      </Text>
                    );
                  })}
                </View>
              </View>
            );
          })}

          {/* Caret */}
          <View
            style={{
              position: 'absolute',
              left: caretX,
              top: caretY,
              width: 2,
              height: LINE_HEIGHT,
              backgroundColor: '#60a5fa',
              opacity: caretVisible ? 1 : 0,
              pointerEvents: 'none',
            }}
          />
        </ScrollView>

        {/* 1px Transparent TextInput input sink */}
        <TextInput
          ref={inputRef}
          testID="editor-input-sink"
          autoFocus
          value=""
          onKeyDown={onKeyDown}
          onChange={(event) => {
            if (event.value) {
              const tr = editorState.update(editorState.replaceSelection(event.value));
              dispatchTransaction(tr);
            }
          }}
          style={{
            position: 'absolute',
            left: caretX,
            top: caretY,
            width: 1,
            height: 1,
            opacity: 0,
          }}
        />
      </View>

      {/* Status Bar */}
      <View className="flex-row items-center justify-between border-t border-slate-800 bg-slate-950 px-3 py-1">
        <View className="flex-row items-center gap-3">
          <Text className="font-mono text-xs text-slate-400">
            {`Ln ${cursorLine.number}, Col ${cursorCol + 1}`}
          </Text>
          <Text className="text-xs text-slate-500">
            {activePath.split('/').pop()}
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          <Text
            className={`text-xs font-mono ${
              compileStatus.ok ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {compileStatus.message}
          </Text>
        </View>
      </View>
    </View>
  );
}
