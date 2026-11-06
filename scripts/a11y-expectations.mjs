// What the lab (demo/src/a11y-panel.tsx) must look like in the platform's accessibility tree, and the checks
// that compare a reading of the tree (scripts/ax-dump.swift) with it. Pure: tests/a11y-expectations.test.ts runs
// them against hand-written trees, including ones that are wrong in each way the checks look for.
import { containsFrame, findByLabel, fitFrames, flatten, labelOf, mentions } from './ax-tree.mjs';

/** A frame in the accessibility tree may differ from the snapshot's, scaled and offset, by this much (points). */
const FRAME_TOLERANCE = 2;
/** The windowed content may be scaled against Godot's logical pixels (a retina display); anything outside this is wrong. */
const SCALE_RANGE = [0.4, 2.6];
const CONTAINMENT_SLACK = 2;
/** What the lab shows and what an assistive technology must therefore read, before and after the Godot-side changes. */
export const ELEMENTS = [
  { id: 'a11y-save', label: 'Save', roles: ['AXButton'], enabled: true },
  { id: 'a11y-delete', label: 'Delete', roles: ['AXButton'], enabled: false },
  { id: 'a11y-title', label: 'Accessibility lab', roles: ['AXStaticText'] },
  { id: 'a11y-subscribe', label: 'Subscribe to updates', roles: ['AXCheckBox'], value: [1, 0] },
  { id: 'a11y-select-all', label: 'Select all', roles: ['AXCheckBox'], mixed: true },
  { id: 'a11y-sound', label: 'Sound', roles: ['AXCheckBox'], value: [0, 1] },
  { id: 'a11y-size', label: 'Size', roles: ['AXGroup', 'AXRadioGroup'] },
  { id: 'a11y-size-small', label: 'Small', roles: ['AXRadioButton'], value: [0, 0] },
  { id: 'a11y-size-medium', label: 'Medium', roles: ['AXRadioButton'], value: [1, 0] },
  { id: 'a11y-size-large', label: 'Large', roles: ['AXRadioButton'], value: [0, 1] },
  { id: 'a11y-volume-thumb', label: 'Volume', roles: ['AXSlider'], value: [30, 80], range: [0, 100] },
];
/** Static text whose content changes with the Godot-side input. */
const SAVES_LABELS = ['Saved 0 times', 'Saved 1 times'];
/** Text inside the `aria-hidden` subtree: it must appear nowhere in the tree. */
const HIDDEN_TEXTS = ['Hidden text', 'Secret'];

export function numeric(value) {
  return typeof value === 'number' ? value : Number(value);
}

/**
 * The elements of one reading checked against what the lab shows. `phase` is 0 before the Godot-side input and
 * 1 after it. Returns the failures and the frame pairs for the geometry check.
 */
export function checkElements(reading, phase, snapshots) {
  const failures = [];
  const pairs = [];
  const nodes = flatten(reading.tree);
  const windows = nodes.filter(node => node.role === 'AXWindow' && node.frame !== undefined);
  for (const expected of ELEMENTS) {
    const matches = findByLabel(nodes, expected.label, expected.roles);
    if (matches.length !== 1) {
      failures.push(`${expected.id}: expected one ${expected.roles.join(' or ')} named "${expected.label}", found ${matches.length}`);
      continue;
    }
    const node = matches[0];
    if (expected.enabled !== undefined && node.enabled !== expected.enabled) {
      failures.push(`${expected.id}: AXEnabled is ${node.enabled}, expected ${expected.enabled}`);
    }
    if (expected.value !== undefined && numeric(node.value) !== expected.value[phase]) {
      failures.push(`${expected.id}: AXValue is ${JSON.stringify(node.value)}, expected ${expected.value[phase]}`);
    }
    if (expected.mixed) {
      const conveyed = numeric(node.value) === 2 || /mixed/iu.test(String(node.valueDescription ?? ''));
      if (!conveyed) {
        failures.push(`${expected.id}: a mixed checkbox is neither AXValue 2 nor described as mixed (AXValue ${JSON.stringify(node.value)}, AXValueDescription ${JSON.stringify(node.valueDescription)})`);
      }
    }
    if (expected.range !== undefined
      && (numeric(node.minValue) !== expected.range[0] || numeric(node.maxValue) !== expected.range[1])) {
      failures.push(`${expected.id}: range is ${node.minValue}..${node.maxValue}, expected ${expected.range.join('..')}`);
    }
    const snapshot = snapshots[expected.id]?.rect;
    if (node.frame === undefined) {
      failures.push(`${expected.id}: the element has no AXFrame`);
    } else if (snapshot !== undefined) {
      pairs.push({ id: expected.id, snapshot, frame: node.frame });
      if (!windows.some(window => containsFrame(window.frame, node.frame, CONTAINMENT_SLACK))) {
        failures.push(`${expected.id}: its frame ${JSON.stringify(node.frame)} is outside every window ${JSON.stringify(windows.map(window => window.frame))}`);
      }
    }
  }
  const saves = findByLabel(nodes, SAVES_LABELS[phase], ['AXStaticText']);
  if (saves.length !== 1) failures.push(`a11y-saves: expected one static text "${SAVES_LABELS[phase]}", found ${saves.length}`);
  for (const text of HIDDEN_TEXTS) {
    if (mentions(nodes, text)) failures.push(`"${text}" is inside an aria-hidden subtree but the platform tree has it`);
  }
  if (pairs.length >= 3) {
    const fit = fitFrames(pairs);
    if (fit.residual > FRAME_TOLERANCE) {
      failures.push(`frames disagree with the snapshot geometry by up to ${fit.residual.toFixed(2)} points after a fit of scale ${fit.scale.toFixed(3)}`);
    }
    if (fit.scale < SCALE_RANGE[0] || fit.scale > SCALE_RANGE[1]) {
      failures.push(`frames are ${fit.scale.toFixed(3)} times the snapshot geometry, outside ${SCALE_RANGE.join('..')}`);
    }
    console.log(`GEOMETRY phase ${phase}: scale ${fit.scale.toFixed(3)}, offset ${fit.offsetX.toFixed(1)},${fit.offsetY.toFixed(1)}, residual ${fit.residual.toFixed(3)} points over ${pairs.length} elements`);
  } else {
    failures.push(`only ${pairs.length} elements could be compared with the snapshot geometry`);
  }
  return failures;
}

/** The expectations that read the tree after the change: focus. */
export function checkFocus(reading) {
  const focused = reading.focusedElement;
  if (focused === undefined) return ['the application reports no focused element'];
  return focused.role === 'AXSlider' && labelOf(focused) === 'Volume'
    ? []
    : [`the focused element should be the Volume slider, it is ${JSON.stringify({ role: focused.role, label: labelOf(focused) })}`];
}

