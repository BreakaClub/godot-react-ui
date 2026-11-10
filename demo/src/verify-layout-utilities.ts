import { Color, Engine, GError, InputEventMouseMotion, Node, OS, RenderingServer, Vector2 } from 'godot';
import type { NativeSnapshot, NativeSnapshotNode } from '../../src/native';
import type { LayoutUtilitiesPage } from './layout-utilities-lab';
import {
  LAYOUT_PAGES, TRANSITION_SCENARIOS, pageBoxes, type LayoutPage, type ScenarioProperty, type TransitionScenario,
} from './layout-utilities-data';
import { LAYOUT_REFERENCE, LAYOUT_REFERENCE_CHROME, TRANSITION_REFERENCE, TRANSITION_STEPS, type ReferenceValue } from './layout-utilities-reference';
import { assertionTally, parseVerifierEvent } from './verifier-input';

/**
 * The `layout-utilities` section of the interaction verifier: the layout lab's pages (`layout-utilities-lab.tsx`) laid out by the
 * library and compared with Chrome's `getBoundingClientRect` for the same page under Tailwind's CSS (`layout-utilities-reference.ts`,
 * written by `scripts/layout-utilities-reference.mjs`), box by box; the things a rectangle cannot show (what `invisible` paints and
 * what it hits, what `overflow-clip` clips) read from the raster and the pointer; and the transition classes, sampled while they run
 * and compared with Chrome's transition of the same classes at the same progress.
 */
export interface LayoutUtilitiesInspection {
  snapshot(): NativeSnapshot;
  find(testID: string): NativeSnapshotNode | undefined;
  showLayoutUtilities(page: LayoutUtilitiesPage): void;
}

const FRAME_POLL_MS = 10;
const SETTLE_FRAMES = 4;
/** A box edge may differ from Chrome's by this much, in CSS pixels (the library lays out in whole pixels, Chrome in 1/64). */
const EDGE_TOLERANCE_PX = 0.5;
/** Float slack on top of it. */
const EDGE_EPSILON = 0.001;
const PAINT_TOLERANCE = 0.02;
const LEVELS = 255;
/**
 * Transition values are compared in 8-bit levels for a colour, in pixels for a width, as they are for opacity. A sample is taken
 * from the library's clock a frame at a time, and its value matched Chrome's curve at the same progress to within a few milliseconds
 * of that progress, never in one direction (the mean difference is zero): so a sample must
 * lie within what Chrome's curve covers over `TIME_SLACK_MS` either side of its progress, widened by the rounding of 8 bits, which
 * is the tolerance of a steep curve where a millisecond is several levels.
 */
const COLOR_ROUNDING_LEVELS = 1;
const OPACITY_TOLERANCE = 0.01;
const TIME_SLACK_MS = 5;
const WIDTH_TOLERANCE_PX = 1;
/** Samples inside the transition's progress range, away from its ends, where the curves of different classes part. */
const MIN_PROGRESS = 0.03;
const MAX_PROGRESS = 0.97;
const MIN_SAMPLES = 6;
/** A transition of 700 ms with a delay must have started and ended inside this. */
const TRANSITION_DEADLINE_MS = 6000;
const FAR_CORNER = new Vector2(1, 1);
/** How far into the 8 px gap beside a box a probe is. */
const CLIP_GAP_PROBE_PX = 4;
/** Tailwind colours of the lab's paint (slate-200 stage, rose-500 and emerald-500 boxes) as Godot reads them. */
const STAGE_PAINT = '#e2e8f0';
const ROSE_PAINT = '#f43f5e';
const EMERALD_PAINT = '#10b981';
const INDIGO_PAINT = '#6366f1';
const REPORT_DECIMALS = 100;
const MAX_REPORTED_MISMATCHES = 12;

function assert(condition: unknown, message: string): asserts condition {
  assertionTally.count += 1;
  if (!condition) throw new Error(message);
}

function round(value: number): number {
  return Math.round(value * REPORT_DECIMALS) / REPORT_DECIMALS;
}

async function frames(count: number): Promise<void> {
  const start = Engine.getProcessFrames();
  while (Engine.getProcessFrames() - start < count) await new Promise(resolve => setTimeout(resolve, FRAME_POLL_MS));
}

function move(at: Vector2): void {
  const event = new InputEventMouseMotion();
  event.position = at;
  event.globalPosition = at;
  parseVerifierEvent(event);
}

function node(api: LayoutUtilitiesInspection, testID: string): NativeSnapshotNode {
  const found = api.find(testID);
  assert(found, `Missing layout target ${testID}`);
  return found;
}

function viewportKey(snapshot: NativeSnapshot): string {
  const root = snapshot.nodes.find(candidate => candidate.id === 0);
  assert(root, 'The snapshot has the root');
  return `${root.rect.width}x${root.rect.height}`;
}

const HEX_DIGITS = 2;

/** `#rrggbb` or `#rrggbbaa` as channels in 0 to 255 (an opaque colour has alpha 255). */
function hexLevels(text: string): [number, number, number, number] {
  const match = /^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/.exec(text);
  assert(match?.[1] !== undefined, `${text} is a #rrggbb or #rrggbbaa colour`);
  const channel = (index: number): number => Number.parseInt(match[1]?.slice(index * HEX_DIGITS, (index + 1) * HEX_DIGITS) ?? '0', 16);
  return [channel(0), channel(1), channel(2), match[2] === undefined ? LEVELS : Number.parseInt(match[2], 16)];
}

function near(actual: Color, expected: string): boolean {
  const [red, green, blue] = hexLevels(expected);
  return Math.abs(actual.r - red / LEVELS) <= PAINT_TOLERANCE && Math.abs(actual.g - green / LEVELS) <= PAINT_TOLERANCE
    && Math.abs(actual.b - blue / LEVELS) <= PAINT_TOLERANCE;
}

function pixel(owner: Node, x: number, y: number): Color {
  RenderingServer.forceDraw();
  const image = owner.getViewport()?.getTexture()?.getImage();
  assert(image, 'The layout verification reads a rendered viewport');
  return image.getPixel(Math.floor(x), Math.floor(y));
}

/** Save the window as `<evidence>/<name>.png` for the side by side with Chrome (`artifacts/utilities-layout-motion-compare`). */
function savePicture(owner: Node, name: string): void {
  const directory = OS.getEnvironment('GODOT_REACT_ARTIFACTS') || 'user://react-ui-verification';
  RenderingServer.forceDraw();
  const image = owner.getViewport()?.getTexture()?.getImage();
  assert(image, 'The layout verification reads a rendered viewport');
  assert(image.savePng(`${directory}/${name}.png`) === GError.Ok, `Could not save ${name}.png`);
}

interface RectMismatch {
  id: string;
  classes: string;
  actual: readonly number[];
  expected: readonly number[];
  difference: number;
}

/** The four edges of `[x, y, width, height]`. */
function edges(rect: readonly number[]): [number, number, number, number] {
  const [x = 0, y = 0, width = 0, height = 0] = rect;
  return [x, y, x + width, y + height];
}

function compareEdges(actual: readonly number[], expected: readonly number[]): number {
  const left = edges(actual);
  const right = edges(expected);
  return Math.max(...left.map((value, index) => Math.abs(value - (right[index] ?? 0))));
}

interface PageReport {
  page: string;
  boxes: number;
  worst: number;
  mean: number;
  /** The cases left out because the library is known to differ from Chrome there, with the reason. */
  known: string[];
}

/** Every box of a page against Chrome's rectangle for it, at this window size. */
async function verifyPage(owner: Node, api: LayoutUtilitiesInspection, page: LayoutPage): Promise<PageReport> {
  api.showLayoutUtilities(page.name);
  await frames(SETTLE_FRAMES);
  const snapshot = api.snapshot();
  const byTestID = new Map<string, NativeSnapshotNode>();
  for (const candidate of snapshot.nodes) {
    const testID: unknown = candidate.props.testID;
    if (typeof testID === 'string') byTestID.set(testID, candidate);
  }
  const key = viewportKey(snapshot);
  const reference = LAYOUT_REFERENCE[key];
  assert(reference, `No Chrome reference for a window of ${key}; run scripts/layout-utilities-reference.mjs for it`);
  const mismatches: RectMismatch[] = [];
  let total = 0;
  let worst = 0;
  const knownIds = new Set(page.cases.filter(entry => entry.known !== undefined).flatMap(entry => pageBoxes({ name: page.name, cases: [entry] }).map(box => box.id)));
  const boxes = pageBoxes(page).filter(box => !knownIds.has(box.id));
  for (const box of boxes) {
    const found = byTestID.get(box.id);
    assert(found, `The ${page.name} page has no ${box.id}`);
    const expected = reference[box.id];
    assert(expected, `Chrome has no rectangle for ${box.id}`);
    const actual = [found.rect.x, found.rect.y, found.rect.width, found.rect.height];
    // A `display: none` box has no place in Chrome (it reports the origin) and no size here.
    if (expected[2] === 0 && expected[3] === 0) {
      assert(found.rect.width === 0 && found.rect.height === 0, `${box.id} has no size, as in Chrome: [${actual.join(', ')}]`);
      continue;
    }
    const difference = compareEdges(actual, expected);
    total += difference;
    worst = Math.max(worst, difference);
    if (difference > EDGE_TOLERANCE_PX + EDGE_EPSILON) mismatches.push({ id: box.id, classes: box.className, actual, expected, difference });
    assertionTally.count += 1;
  }
  if (mismatches.length > 0) {
    const lines = mismatches.slice(0, MAX_REPORTED_MISMATCHES).map(mismatch =>
      `${mismatch.id} [${mismatch.classes}] library [${mismatch.actual.join(', ')}] Chrome [${mismatch.expected.join(', ')}] by ${round(mismatch.difference)} px`);
    throw new Error(`${mismatches.length} of ${boxes.length} boxes on the ${page.name} page (window ${key}) are more than ${EDGE_TOLERANCE_PX} px from Chrome's:\n${lines.join('\n')}`);
  }
  savePicture(owner, `layout-utilities-${page.name}-${key}`);
  const known = page.cases.flatMap(entry => (entry.known === undefined ? [] : [`${entry.stage.id}: ${entry.known}`]));
  return { page: page.name, boxes: boxes.length, worst: round(worst), mean: round(total / boxes.length), known };
}

/** What a rectangle cannot say: `invisible` paints nothing and takes no pointer but keeps a visible child; `overflow-clip` clips. */
async function verifyPaintAndPointer(owner: Node, api: LayoutUtilitiesInspection): Promise<void> {
  api.showLayoutUtilities('misc');
  await frames(SETTLE_FRAMES);
  const probes = (id: string, dx: number, dy: number): Vector2 => {
    const { rect } = node(api, id);
    const at = new Vector2(rect.x + dx, rect.y + dy);
    const snapshot = api.snapshot();
    const root = snapshot.nodes.find(candidate => candidate.id === 0);
    assert(root && at.x < root.rect.width && at.y < root.rect.height, `${id} (${at.x}, ${at.y}) is inside the window`);
    return at;
  };
  const hovered = async (at: Vector2): Promise<number | null> => {
    move(at);
    await frames(SETTLE_FRAMES);
    return api.snapshot().hovered;
  };

  // `invisible w-16 h-10 bg-indigo-500` with a `visible w-8 h-4 bg-rose-500` child: the box itself shows the stage's paint and takes
  // no pointer, the child shows and takes it, and its neighbour (the same box without `invisible`) is as painted.
  const empty = probes('misc.invisible.a', 48, 30);
  assert(near(pixel(owner, empty.x, empty.y), STAGE_PAINT), `invisible paints nothing of the box: ${pixel(owner, empty.x, empty.y).toHtml()}`);
  const child = probes('misc.invisible.a.1', 16, 8);
  assert(near(pixel(owner, child.x, child.y), ROSE_PAINT), `a visible child inside an invisible parent paints: ${pixel(owner, child.x, child.y).toHtml()}`);
  const neighbour = probes('misc.invisible.b', 32, 20);
  assert(near(pixel(owner, neighbour.x, neighbour.y), EMERALD_PAINT), 'a box without invisible paints');
  assert(await hovered(empty) === node(api, 'misc.invisible').id, 'the pointer passes through an invisible box to what is behind it');
  assert(await hovered(child) === node(api, 'misc.invisible.a.1').id, 'a visible child of an invisible box takes the pointer');
  assert(await hovered(neighbour) === node(api, 'misc.invisible.b').id, 'a box without invisible takes the pointer');
  move(FAR_CORNER);
  await frames(SETTLE_FRAMES);

  // `overflow-clip w-16 h-8` holding a `w-32 h-12` box clips it at the box (the box and the pixel past its right edge are the stage's);
  // `overflow-visible` lets a taller child hang below its box.
  const clipped = node(api, 'misc.clip.a');
  const inside = probes('misc.clip.a', clipped.rect.width / 2, clipped.rect.height / 2);
  // In the gap between the two boxes (`gap-2` is 8 px), where only the clipped child could be painted.
  const outside = probes('misc.clip.a', clipped.rect.width + CLIP_GAP_PROBE_PX, clipped.rect.height / 2);
  assert(near(pixel(owner, inside.x, inside.y), INDIGO_PAINT), 'the clipped child paints inside its box');
  assert(near(pixel(owner, outside.x, outside.y), STAGE_PAINT), `overflow-clip hides what is past the box: ${pixel(owner, outside.x, outside.y).toHtml()}`);
  const hanging = probes('misc.clip.b', 16, node(api, 'misc.clip.b').rect.height + 8);
  assert(near(pixel(owner, hanging.x, hanging.y), EMERALD_PAINT), 'overflow-visible shows a child that hangs past its box');
  // And `hidden` takes no space and has no rectangle to speak of.
  const hiddenBox = node(api, 'misc.hidden.b');
  assert(hiddenBox.rect.width === 0 && hiddenBox.rect.height === 0, 'display: none has no size');
}

// ---- Transitions ----

interface Sample {
  progress: number;
  values: Partial<Record<ScenarioProperty | 'textColor', string | number>>;
}

/** Chrome's value of the table at `progress`, interpolated between the two steps around it. */
function referenceAt(table: readonly ReferenceValue[], progress: number): ReferenceValue {
  const position = Math.min(Math.max(progress, 0), 1) * TRANSITION_STEPS;
  const low = Math.floor(position);
  const high = Math.min(low + 1, TRANSITION_STEPS);
  const share = position - low;
  const first = table[low];
  const second = table[high];
  assert(first !== undefined && second !== undefined, `the Chrome table has step ${low}`);
  if (typeof first === 'number' && typeof second === 'number') return first + (second - first) * share;
  assert(typeof first !== 'number' && typeof second !== 'number', 'a table holds numbers or colours, not both');
  const between = (from: number | undefined, to: number | undefined): number => (from ?? 0) + ((to ?? 0) - (from ?? 0)) * share;
  return [between(first[0], second[0]), between(first[1], second[1]), between(first[2], second[2]), between(first[3], second[3])];
}

function presentedValue(snapshotNode: NativeSnapshotNode, property: ScenarioProperty): string | number {
  const { presentation } = snapshotNode;
  switch (property) {
    case 'backgroundColor': return presentation.backgroundColor;
    case 'color': return presentation.color;
    case 'borderColor': return presentation.borderColor;
    case 'opacity': return presentation.opacity;
    case 'width': return presentation.width;
  }
}

interface ScenarioReport {
  scenario: string;
  samples: number;
  worstColorLevels: number;
  worstOpacity: number;
  worstWidthPx: number;
}

/** Hover a scenario's element, sample the library's transition each frame, and compare each sample with Chrome's at its progress. */
async function verifyScenario(api: LayoutUtilitiesInspection, scenario: TransitionScenario): Promise<ScenarioReport> {
  const elementID = `transition.${scenario.id}`;
  const reference = TRANSITION_REFERENCE[scenario.id];
  assert(reference, `Chrome has no transition for ${scenario.id}`);
  const { rect } = node(api, elementID);
  const samples: Sample[] = [];
  const widthBefore = node(api, elementID).presentation.width;
  move(new Vector2(rect.x + rect.width / 2, rect.y + rect.height / 2));
  const started = Date.now();
  let startedAtMs: number | undefined;
  let recordedProperties: string[] = [];
  let jumpedWidth: number | undefined;
  while (Date.now() - started < TRANSITION_DEADLINE_MS) {
    await frames(1);
    const snapshot = api.snapshot();
    const element = snapshot.nodes.find(candidate => candidate.props.testID === elementID);
    assert(element, `Missing ${elementID}`);
    const records = snapshot.transitions.filter(record => record.id === element.id);
    if (records.length === 0) {
      if (startedAtMs !== undefined) break;
      // Not started yet (the pointer event has not reached native), or a style with nothing to animate.
      if (Date.now() - started > TRANSITION_DEADLINE_MS / 2) break;
      continue;
    }
    if (startedAtMs === undefined) {
      startedAtMs = Math.min(...records.map(record => record.startedAtMs));
      recordedProperties = records.map(record => record.property);
      jumpedWidth = element.presentation.width;
      for (const record of records) {
        assert(Math.abs(record.durationMs - scenario.durationMs) < 1, `${scenario.id} runs ${record.durationMs} ms, the classes say ${scenario.durationMs}`);
      }
    }
    const progress = (snapshot.clockMs - startedAtMs - scenario.delayMs) / scenario.durationMs;
    const values: Sample['values'] = {};
    for (const property of scenario.compare) values[property] = presentedValue(element, property);
    if (scenario.inheritedText) {
      const text = snapshot.nodes.find(candidate => candidate.props.testID === `${elementID}.text`);
      assert(text, `Missing ${elementID}.text`);
      values.textColor = text.presentation.color;
    }
    samples.push({ progress, values });
  }
  move(FAR_CORNER);
  const inside = samples.filter(sample => sample.progress > MIN_PROGRESS && sample.progress < MAX_PROGRESS);
  assert(inside.length >= MIN_SAMPLES, `${scenario.id}: ${inside.length} samples inside the transition, ${MIN_SAMPLES} needed (${samples.length} in all)`);
  const report: ScenarioReport = { scenario: scenario.id, samples: inside.length, worstColorLevels: 0, worstOpacity: 0, worstWidthPx: 0 };
  for (const sample of inside) {
    for (const [name, value] of Object.entries(sample.values)) {
      const table = reference.properties[name];
      assert(table, `Chrome has no ${name} for ${scenario.id}`);
      const slack = TIME_SLACK_MS / scenario.durationMs;
      const expected = referenceAt(table, sample.progress);
      const early = referenceAt(table, sample.progress - slack);
      const late = referenceAt(table, sample.progress + slack);
      if (typeof value === 'string' && typeof expected !== 'number' && typeof early !== 'number' && typeof late !== 'number') {
        const actual = hexLevels(value);
        const wanted = [expected[0], expected[1], expected[2], expected[3] * LEVELS];
        const difference = Math.max(...actual.map((level, channel) => Math.abs(level - (wanted[channel] ?? 0))));
        report.worstColorLevels = Math.max(report.worstColorLevels, difference);
        const covered = actual.every((level, channel) => {
          const scale = channel === 3 ? LEVELS : 1;
          const ends = [expected[channel], early[channel], late[channel]].map(end => (end ?? 0) * scale);
          return level >= Math.min(...ends) - COLOR_ROUNDING_LEVELS && level <= Math.max(...ends) + COLOR_ROUNDING_LEVELS;
        });
        assert(covered, `${scenario.id} ${name} at ${round(sample.progress)}: library ${value} [${actual.map(round)}], Chrome [${wanted.map(round)}] (${round(difference)} levels apart, and not within ${TIME_SLACK_MS} ms of its curve)`);
      } else if (typeof value === 'number' && typeof expected === 'number' && typeof early === 'number' && typeof late === 'number') {
        const difference = Math.abs(value - expected);
        const tolerance = name === 'opacity' ? OPACITY_TOLERANCE : WIDTH_TOLERANCE_PX;
        if (name === 'opacity') report.worstOpacity = Math.max(report.worstOpacity, difference);
        else report.worstWidthPx = Math.max(report.worstWidthPx, difference);
        const covered = value >= Math.min(expected, early, late) - tolerance && value <= Math.max(expected, early, late) + tolerance;
        assert(covered, `${scenario.id} ${name} at ${round(sample.progress)}: library ${value}, Chrome ${round(expected)} (not within ${TIME_SLACK_MS} ms of its curve)`);
      } else {
        assert(false, `${scenario.id} ${name}: the library and Chrome report different kinds of value`);
      }
    }
  }
  // Every property Chrome animated on a compared property was animated here too, and a width that cannot animate (pixels to a percentage)
  // was not: it jumped to its end at once, and nothing was reported.
  if (scenario.compare.includes('backgroundColor')) {
    assert(recordedProperties.includes('backgroundColor'), `${scenario.id} ran no backgroundColor transition: ${recordedProperties.join(', ')}`);
  }
  if (scenario.id === 'all-percent') {
    assert(!recordedProperties.includes('width'), `a width from pixels to a percentage does not animate under transition-all: ${recordedProperties.join(', ')}`);
    assert(jumpedWidth !== undefined && jumpedWidth > widthBefore, `the width jumped to its end at once (${widthBefore} to ${jumpedWidth})`);
  }
  // Wait until the element is back at rest before the next scenario hovers another.
  await settleRest(api, elementID);
  return report;
}

/** Until the element has no transition running (it is leaving its hover state, which may run one), bounded. */
async function settleRest(api: LayoutUtilitiesInspection, elementID: string): Promise<void> {
  const started = Date.now();
  for (;;) {
    await frames(SETTLE_FRAMES);
    const snapshot = api.snapshot();
    const element = snapshot.nodes.find(candidate => candidate.props.testID === elementID);
    assert(element, `Missing ${elementID}`);
    if (!snapshot.transitions.some(record => record.id === element.id)) return;
    assert(Date.now() - started < TRANSITION_DEADLINE_MS, `${elementID} did not come to rest`);
  }
}

async function verifyTransitions(api: LayoutUtilitiesInspection): Promise<ScenarioReport[]> {
  api.showLayoutUtilities('transitions');
  await frames(SETTLE_FRAMES);
  const reports: ScenarioReport[] = [];
  for (const scenario of TRANSITION_SCENARIOS) reports.push(await verifyScenario(api, scenario));
  return reports;
}

export async function verifyLayoutUtilities(owner: Node, api: LayoutUtilitiesInspection): Promise<void> {
  const pages: PageReport[] = [];
  for (const page of LAYOUT_PAGES) pages.push(await verifyPage(owner, api, page));
  await verifyPaintAndPointer(owner, api);
  const transitions = await verifyTransitions(api);
  console.log('layout-utilities', JSON.stringify({ chrome: LAYOUT_REFERENCE_CHROME, pages, transitions }));
}
