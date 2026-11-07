// The code editor evaluation's measurements, run inside Godot (GodotJS) with `--headless` (docs/tracks/code-editor-evaluation.md).
// Headless means no window, no pixels and no draw: what is measured is JS (React, the commit walk, JSON), native commit, layout and
// geometry, the text server's shaping, and memory. The draw cost and GPU memory are not measured.
import { createElement } from 'react';
import {
  Callable, Engine, InputEventKey, Key, Node, OS, ReactUiRoot, SystemFont, Theme, Time, Vector2,
} from 'godot';
import { createClassBinder } from 'godot.annotations';
import { createRoot, readActivity, takeNativeProfile, type ReactRoot } from '../../../../src';
import { parseVerifierEvent } from '../../../../demo/src/verifier-input';
import { createState, parse, runsForLines, type Run } from './runs';
import { controls, LINE_HEIGHT, PlainLines, RichLines, VIEWPORT_HEIGHT, VirtualRichLines, WholeInput, WholeText } from './scenarios';
import { SAMPLE_TEXT } from './sample';

const bind = createClassBinder();
const MICROSECONDS_PER_MILLISECOND = 1000;
const FRAME_POLL_MS = 4;
const SETTLE_FRAMES = 4;
const KEYSTROKES = 5;
const LABEL = 'GODOT_REACT_EDITOR_BENCH';
const RSS_WAIT_MS = 400;
const TRIALS = 3;
const MONOSPACE_FONTS = ['Menlo', 'Monaco', 'Courier New', 'monospace'];

function now(): number { return Time.getTicksUsec() / MICROSECONDS_PER_MILLISECOND; }
function round(value: number): number { return Math.round(value * 100) / 100; }
function report(name: string, data: unknown): void { console.log(`${LABEL} ${JSON.stringify({ name, ...(data as object) })}`); }

async function frames(count: number): Promise<void> {
  const start = Engine.getProcessFrames();
  while (Engine.getProcessFrames() - start < count) await new Promise((resolve) => setTimeout(resolve, FRAME_POLL_MS));
}

/**
 * The runner (run.mjs) reads the resident size of this process when it sees this line, then the bench goes on. `ps` is the runner's
 * to run: the engine's own counters miss the text server's and V8's memory.
 */
async function markResidentMemory(label: string): Promise<void> {
  console.log(`GODOT_REACT_EDITOR_RSS_MARK ${label}`);
  await new Promise((resolve) => setTimeout(resolve, RSS_WAIT_MS));
}

@bind()
export default class Bench extends Node {
  private surface: ReactUiRoot | null = null;
  private renderer: ReactRoot | null = null;

  /** The owner calls `dispatchEvents` once per frame, for events native queued outside an input callback (a scroll the code asked for). */
  override _process(): void {
    this.renderer?.dispatchEvents();
  }

  override _ready(): void {
    void this.run().then(
      () => { this.getTree()?.quit(0); },
      (error: unknown) => { console.log(`${LABEL}_FAILED ${error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error)}`); this.getTree()?.quit(1); },
    );
  }

  private require(): { surface: ReactUiRoot; renderer: ReactRoot } {
    if (this.surface === null || this.renderer === null) throw new Error('not mounted');
    return { surface: this.surface, renderer: this.renderer };
  }

  private mount(): void {
    const surface = new ReactUiRoot();
    // A monospace face before the root enters the tree: the root reads the theme font when it becomes ready.
    const font = new SystemFont();
    font.fontNames = MONOSPACE_FONTS;
    const theme = new Theme();
    theme.defaultFont = font;
    theme.defaultFontSize = 14;
    surface.theme = theme;
    surface.setName('EditorBench');
    this.addChild(surface);
    surface.size = new Vector2(1120, 800);
    this.surface = surface;
    this.renderer = createRoot(surface, {
      now,
      subscribeToEvents: (listener) => {
        const callable = Callable.create(listener);
        surface.eventsReady.connect(callable);
        return () => surface.eventsReady.disconnect(callable);
      },
    });
  }

  /** Render, wait, and read JS and native profiles for the mount. */
  private async measureRender(name: string, element: ReturnType<typeof createElement>, extra: object = {}): Promise<void> {
    const { surface, renderer } = this.require();
    await frames(SETTLE_FRAMES);
    await markResidentMemory(`${name}:before`);
    const staticBefore = OS.getStaticMemoryUsage();
    const activityBefore = readActivity(surface);
    renderer.setProfiling(true);
    surface.setProfiling(true);
    const started = now();
    renderer.render(element);
    const renderedMs = now() - started;
    await frames(SETTLE_FRAMES);
    const wallMs = now() - started;
    const js = renderer.takeProfile();
    const native = takeNativeProfile(surface);
    renderer.setProfiling(false);
    surface.setProfiling(false);
    const activity = readActivity(surface);
    const flush = js.samples.filter((sample) => sample.kind === 'flush');
    const sum = (pick: (sample: (typeof flush)[number]) => number): number => round(flush.reduce((total, sample) => total + pick(sample), 0));
    const batches = native.samples.filter((sample) => sample.kind === 'batch');
    const nativeFrames = native.samples.filter((sample) => sample.kind === 'frame');
    const sumNative = (list: readonly Record<string, unknown>[], key: string): number =>
      round(list.reduce((total, sample) => total + Number(sample[key] ?? 0), 0) / MICROSECONDS_PER_MILLISECOND);
    report(name, {
      ...extra,
      nodes: activity.nodeCount, nodesAdded: activity.nodeCount - activityBefore.nodeCount,
      renderCallMs: round(renderedMs), wallMsUntilFramesSettled: round(wallMs),
      js: {
        flushes: flush.length, walkMs: sum((s) => s.walkMs), jsonEncodeMs: sum((s) => s.jsonEncodeMs), nativeCallMs: sum((s) => s.nativeCallMs),
        fullFlushMs: sum((s) => s.fullFlushMs), jsonChars: sum((s) => s.jsonChars), commands: sum((s) => s.commandCount),
        reconcileMs: round(js.samples.filter((s) => s.kind === 'reconcile').reduce((t, s) => t + s.durationMs, 0)),
      },
      native: {
        batches: batches.length,
        parseMs: sumNative(batches, 'parseMicros'), validateMs: sumNative(batches, 'validateMicros'), mountMs: sumNative(batches, 'mountMicros'),
        layoutMs: sumNative(batches, 'layoutMicros'), geometryMs: sumNative(batches, 'geometryMicros'), totalMs: sumNative(batches, 'totalMicros'),
        frames: nativeFrames.length, frameMeasureMs: sumNative(nativeFrames, 'measureMicros'), frameLayoutMs: sumNative(nativeFrames, 'layoutMicros'),
        frameGeometryMs: sumNative(nativeFrames, 'geometryMicros'), frameStyleMs: sumNative(nativeFrames, 'styleMicros'),
        boxRecords: activity.boxRecords - activityBefore.boxRecords, contentRecords: activity.contentRecords - activityBefore.contentRecords,
      },
      staticDeltaKiB: Math.round((OS.getStaticMemoryUsage() - staticBefore) / 1024),
    });
    await markResidentMemory(`${name}:after`);
  }

  /** Change the document with `change`, wait for React and native to settle, report the cost of that one change. */
  private async measureChange(name: string, change: () => void, extra: object = {}): Promise<void> {
    const { surface, renderer } = this.require();
    await frames(SETTLE_FRAMES);
    renderer.setProfiling(true);
    surface.setProfiling(true);
    controls.renders.lines = 0;
    const activityBefore = readActivity(surface);
    const started = now();
    change();
    await frames(SETTLE_FRAMES);
    const wallMs = now() - started;
    const js = renderer.takeProfile();
    const native = takeNativeProfile(surface);
    renderer.setProfiling(false);
    surface.setProfiling(false);
    const activity = readActivity(surface);
    const flush = js.samples.filter((sample) => sample.kind === 'flush');
    const batches = native.samples.filter((sample) => sample.kind === 'batch');
    const ms = (list: readonly Record<string, unknown>[], key: string): number =>
      round(list.reduce((total, sample) => total + Number(sample[key] ?? 0), 0) / MICROSECONDS_PER_MILLISECOND);
    const firstFlush = flush[0];
    const lastFlush = flush[flush.length - 1];
    report(name, {
      ...extra, lineRenders: controls.renders.lines,
      // From the call that changed the document to the end of the last commit: React's render, the walk, the JSON, native's mount and layout.
      latencyToCommitEndMs: lastFlush === undefined ? null : round(lastFlush.startMs + lastFlush.fullFlushMs - started),
      reactBeforeFlushMs: firstFlush === undefined ? null : round(firstFlush.startMs - started),
      reconcileMs: round(js.samples.filter((s) => s.kind === 'reconcile').reduce((t, s) => t + s.durationMs, 0)),
      walkMs: round(flush.reduce((t, s) => t + s.walkMs, 0)), jsonEncodeMs: round(flush.reduce((t, s) => t + s.jsonEncodeMs, 0)),
      nativeCallMs: round(flush.reduce((t, s) => t + s.nativeCallMs, 0)), fullFlushMs: round(flush.reduce((t, s) => t + s.fullFlushMs, 0)),
      commands: flush.reduce((t, s) => t + s.commandCount, 0), jsonChars: flush.reduce((t, s) => t + s.jsonChars, 0),
      visitedNodes: flush.reduce((t, s) => t + s.visitedNodes, 0),
      nativeBatches: batches.length, nativeTotalMs: ms(batches, 'totalMicros'), nativeMountMs: ms(batches, 'mountMicros'),
      nativeLayoutMs: ms(batches, 'layoutMicros'), nativeGeometryMs: ms(batches, 'geometryMicros'),
      nodesChanged: activity.nodesUpdated - activityBefore.nodesUpdated, boxRecords: activity.boxRecords - activityBefore.boxRecords,
      contentRecords: activity.contentRecords - activityBefore.contentRecords, wallMsUntilFramesSettled: round(wallMs),
    });
  }

  private async run(): Promise<void> {
    report('environment', {
      engine: Engine.getVersionInfo().string, headless: true,
      globals: {
        document: typeof (globalThis as Record<string, unknown>).document, window: typeof (globalThis as Record<string, unknown>).window,
        navigator: typeof (globalThis as Record<string, unknown>).navigator, requestIdleCallback: typeof (globalThis as Record<string, unknown>).requestIdleCallback,
        requestAnimationFrame: typeof (globalThis as Record<string, unknown>).requestAnimationFrame,
        queueMicrotask: typeof queueMicrotask, TextEncoder: typeof TextEncoder, WebAssembly: typeof (globalThis as Record<string, unknown>).WebAssembly,
        performance: typeof performance, setTimeout: typeof setTimeout,
      },
      lines: SAMPLE_TEXT.split('\n').length, chars: SAMPLE_TEXT.length, fonts: MONOSPACE_FONTS,
    });

    // ---- CodeMirror's DOM-free layers inside GodotJS: five cold-to-warm rounds of the same work --------------------------------------
    let rows: Run[][] = [];
    for (let round_ = 0; round_ < TRIALS + 2; round_ += 1) {
      let started = now();
      const state = createState(SAMPLE_TEXT);
      const created = now() - started;
      started = now();
      const tree = parse(state);
      const parsed = now() - started;
      let nodeCount = 0;
      tree.iterate({ enter: () => { nodeCount += 1; } });
      started = now();
      rows = runsForLines(state, 1, state.doc.lines);
      const highlighted = now() - started;
      started = now();
      runsForLines(state, 500, 540);
      const viewportMs = now() - started;
      started = now();
      const typed = state.update({ changes: { from: state.doc.line(1000).to, insert: ' ' } });
      const updateMs = now() - started;
      started = now();
      parse(typed.state);
      const reparsedMs = now() - started;
      started = now();
      runsForLines(typed.state, 1000, 1000);
      const oneLineMs = now() - started;
      report('codemirror-in-godotjs', {
        round: round_, createStateMs: round(created), fullParseMs: round(parsed), syntaxNodes: nodeCount, highlightAllLinesMs: round(highlighted),
        highlightViewport40Ms: round(viewportMs), stateUpdateWithOneCharMs: round(updateMs), ensureTreeAfterUpdateMs: round(reparsedMs),
        highlightOneLineMs: round(oneLineMs), runsTotal: rows.reduce((count, row) => count + row.length, 0), lines: rows.length,
      });
    }
    const lines = SAMPLE_TEXT.split('\n');
    const farLine = lines.length - 1;
    const editedRow = (index: number): readonly Run[] => {
      const row = rows[index] ?? [];
      const first = row[0];
      return first === undefined ? [{ text: 'x', color: '#ffffff' }] : [{ text: `${first.text}x`, color: first.color }, ...row.slice(1)];
    };

    // ---- the editor body on today's primitives, three trials each so a starved machine shows as spread -----------------------------------
    for (let trial = 0; trial < TRIALS; trial += 1) {
      this.mount();
      await this.measureRender(`rich-lines#${trial}`, createElement(RichLines, { rows }), { runs: rows.reduce((count, row) => count + row.length, 0) });
      if (trial === 0) this.runLayoutCheck(rows.length);
      for (const index of [0, 500, farLine]) {
        await this.measureChange(`rich-lines-edit-line-${index + 1}#${trial}`, () => { controls.setLine?.(index, editedRow(index)); }, { line: index + 1 });
      }
      await this.unmount();
    }
    for (let trial = 0; trial < TRIALS; trial += 1) {
      this.mount();
      await this.measureRender(`plain-lines#${trial}`, createElement(PlainLines, { lines }));
      await this.measureChange(`plain-lines-edit-line-${farLine + 1}#${trial}`, () => { controls.setText?.(farLine, `${lines[farLine] ?? ''}x`); }, { line: farLine + 1 });
      await this.unmount();
    }
    for (let trial = 0; trial < TRIALS; trial += 1) {
      this.mount();
      await this.measureRender(`virtual-rich-lines#${trial}`, createElement(VirtualRichLines, { rows }));
      await this.measureChange(`virtual-scroll-one-line#${trial}`, () => { controls.scroll?.scrollTo({ top: LINE_HEIGHT }); });
      await this.measureChange(`virtual-scroll-one-page#${trial}`, () => { controls.scroll?.scrollTo({ top: LINE_HEIGHT + VIEWPORT_HEIGHT }); });
      await this.measureChange(`virtual-scroll-to-end#${trial}`, () => { controls.scroll?.scrollTo({ top: (rows.length - 38) * LINE_HEIGHT }); });
      await this.measureChange(`virtual-edit-visible-line#${trial}`, () => { controls.setLine?.(rows.length - 10, editedRow(rows.length - 10)); });
      await this.unmount();
    }
    for (let trial = 0; trial < TRIALS; trial += 1) {
      this.mount();
      await this.measureRender(`whole-text#${trial}`, createElement(WholeText, { text: SAMPLE_TEXT }));
      await this.unmount();
    }
    this.mount();
    let valueLength = 0;
    await this.measureRender('whole-textinput#0', createElement(WholeInput, { text: SAMPLE_TEXT, onValue: (length: number) => { valueLength = length; } }));
    await this.typeIntoInput(() => valueLength);
    await this.unmount();
  }

  private async unmount(): Promise<void> {
    this.require().renderer.unmount();
    this.renderer = null;
    this.surface?.queueFree();
    this.surface = null;
    await frames(SETTLE_FRAMES);
  }

  /** Are the runs of a line contiguous, and is a line as wide as characters times one advance? Read from the layout, no pixels. */
  private runLayoutCheck(rows: number): void {
    const { renderer } = this.require();
    const nodes = renderer.getSnapshot().nodes;
    const index = new Map(nodes.map((node) => [node.id, node]));
    // A line is a `view` whose children are all `text`, with more than two of them.
    const lineNodes = nodes.filter((node) => node.kind === 'view' && node.children.length > 2 && node.children.every((child) => index.get(child)?.kind === 'text'));
    const samples = lineNodes.slice(5, 25).map((line) => {
      const children = line.children.map((child) => index.get(child)).filter((child): child is NonNullable<typeof child> => child !== undefined);
      const characters = children.reduce((count, child) => count + child.text.length, 0);
      const width = children.reduce((total, child) => total + child.rect.width, 0);
      let gap = 0;
      for (let at = 1; at < children.length; at += 1) {
        const previous = children[at - 1];
        const current = children[at];
        if (previous !== undefined && current !== undefined) gap = Math.max(gap, Math.abs(current.rect.x - (previous.rect.x + previous.rect.width)));
      }
      return { characters, widthSum: round(width), perCharacter: round(width / Math.max(1, characters)), maxGap: round(gap), runs: children.length, lineWidth: round(line.rect.width), lineHeight: round(line.rect.height) };
    });
    const advances = [...new Set(samples.map((sample) => sample.perCharacter))];
    // Single glyph widths from the same layout: a monospace font gives one advance for every character.
    const widthsByText = new Map<string, number>();
    for (const node of nodes) if (node.kind === 'text' && node.text.length === 1) widthsByText.set(node.text, round(node.rect.width));
    report('rich-lines-layout', {
      totalLineRows: lineNodes.length, rowsInDocument: rows, rowsChecked: samples.length, perCharacterAdvances: advances,
      maxGapBetweenRuns: Math.max(...samples.map((sample) => sample.maxGap)), samples: samples.slice(0, 3),
      singleCharacterWidths: Object.fromEntries([...widthsByText].slice(0, 12)),
      whitespaceRunWidths: Object.fromEntries(nodes.filter((node) => node.kind === 'text' && /^ +$/.test(node.text)).slice(0, 6).map((node) => [JSON.stringify(node.text), round(node.rect.width)])),
    });
  }

  private async typeIntoInput(valueLength: () => number): Promise<void> {
    const input = controls.input;
    if (input === null || input === undefined) throw new Error('the text input has no handle');
    input.focus();
    await frames(SETTLE_FRAMES);
    input.setSelectionRange(input.value.length, input.value.length);
    await frames(SETTLE_FRAMES);
    const { surface, renderer } = this.require();
    renderer.setProfiling(true);
    surface.setProfiling(true);
    const starts: number[] = [];
    for (let count = 0; count < KEYSTROKES; count += 1) {
      const event = new InputEventKey();
      event.keycode = Key.KeyX;
      event.physicalKeycode = Key.KeyX;
      event.keyLabel = Key.KeyX;
      event.unicode = 'x'.codePointAt(0) ?? 0;
      event.pressed = true;
      const started = now();
      parseVerifierEvent(event);
      await frames(1);
      starts.push(now() - started);
    }
    const js = renderer.takeProfile();
    const native = takeNativeProfile(surface);
    renderer.setProfiling(false);
    surface.setProfiling(false);
    const flush = js.samples.filter((sample) => sample.kind === 'flush');
    const events = js.samples.filter((sample) => sample.kind === 'events');
    const batches = native.samples.filter((sample) => sample.kind === 'batch');
    const nativeFrames = native.samples.filter((sample) => sample.kind === 'frame');
    const frameMs = (key: string): number => round(nativeFrames.reduce((total, sample) => total + Number(sample[key] ?? 0), 0) / MICROSECONDS_PER_MILLISECOND);
    report('whole-textinput-keystroke-at-end', {
      nativeFrames: nativeFrames.length, frameStyleMs: frameMs('styleMicros'), frameMeasureMs: frameMs('measureMicros'), frameLayoutMs: frameMs('layoutMicros'),
      frameGeometryMs: frameMs('geometryMicros'),
      keystrokes: KEYSTROKES, valueLengthAfter: valueLength(), textLengthAfter: input.value.length,
      wallMsPerKeystrokeUntilNextFrame: round(starts.reduce((t, v) => t + v, 0) / KEYSTROKES),
      eventDispatchMsTotal: round(events.reduce((t, s) => t + s.durationMs, 0)), reconcileMsTotal: round(js.samples.filter((s) => s.kind === 'reconcile').reduce((t, s) => t + s.durationMs, 0)),
      flushes: flush.length, nativeBatches: batches.length,
    });
  }
}
