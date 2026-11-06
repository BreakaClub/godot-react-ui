// What the lab (demo/src/a11y-panel.tsx) must look like in the platform's accessibility tree, and the checks
// that compare a reading of the tree (scripts/ax-dump.swift) with it. Pure: tests/a11y-expectations.test.ts runs
// them against hand-written trees, including ones that are wrong in each way the checks look for.
import { containsFrame, findByLabel, fitFrames, flatten, labelOf, mentions } from './ax-tree.mjs';

/** A frame in the accessibility tree may differ from the snapshot's, scaled and offset, by this much (points). */
const FRAME_TOLERANCE = 2;
/** The windowed content may be scaled against Godot's logical pixels (a retina display); anything outside this is wrong. */
const SCALE_RANGE = [0.4, 2.6];
const CONTAINMENT_SLACK = 2;
/**
 * What the engine cannot convey, found by reading the real macOS tree (stock Godot 4.7.2 with AccessKit, docs/tracks/stock-engine.md).
 * An element with an `engineGap` may be absent; when it is, the check says so as a note, never silently.
 * - A group: the engine's `AccessibilityRole` has no group or radio group, only a generic container, and AccessKit leaves
 *   a generic container out of the platform tree (its children move up to the nearest element that is in it). The role
 *   the engine does have, `PANEL`, appears as `AXUnknown` with its title, not as `AXGroup`.
 * - The mixed state: `update_set_checked` takes a bool, so the platform reads a mixed checkbox as unchecked, and the
 *   state description native sets with it ("mixed") reaches no attribute the Accessibility API exposes.
 * - A scroll view (plan D38): AccessKit's macOS adapter has no scroll area role, so a SCROLL_VIEW is `AXUnknown` (a stock
 *   Godot `ScrollContainer` is too), it ignores the scroll position and range set on the node (the element has no AXValue,
 *   AXMinValue, AXMaxValue or scroll bar; the stock container conveys them through a SCROLL_BAR child element, which this
 *   library does not create), and macOS has no scroll up, down or set-offset action to advertise (only `AXScrollToVisible`,
 *   which the scroll view's contents do advertise). The adapter also leaves out children that lie a little beyond the
 *   viewport's edge. What it does convey is checked: the children in view, their frames, which follow the scroll, and
 *   the scroll-into-view action on the contents and nowhere else.
 */
const GROUP_GAP = 'the platform tree has no group named "Size": the engine has no group role, and the macOS adapter leaves out the generic container it has (the radio buttons are in the tree)';
const MIXED_GAP = 'the platform reports the mixed checkbox as unchecked (AXValue 0) and has no state text for it: the engine can only set a checkbox to checked or unchecked';
const SCROLL_ROLE_GAP = 'the scroll view reaches the platform as AXUnknown, not AXScrollArea: the macOS adapter has no scroll area role (a stock Godot ScrollContainer is AXUnknown too)';
const SCROLL_VALUES_GAP = 'the platform exposes no scroll position or range for the scroll view (no AXValue, AXMinValue, AXMaxValue or scroll bar): the macOS adapter ignores the scroll properties set on a node; a stock Godot ScrollContainer conveys them through an AXScrollBar child element';
const SCROLL_ACTIONS_GAP = 'the platform advertises no scroll up, down, left, right or set-offset action on the scroll view: macOS has AXScrollToVisible only, which its contents do advertise';
const SCROLL_CULL_GAP = 'the platform tree leaves out scroll view children that lie beyond a margin outside the viewport, so a child scrolled far out of view is not in it until it comes near';
/** The one action macOS has for scrolling something into view; D38's `scroll_into_view` is advertised as this. */
const SCROLL_TO_VISIBLE = 'AXScrollToVisible';
/** The scroll view's children (demo/src/a11y-panel.tsx) and what the platform calls them. */
export const SCROLL_ITEMS = [
  ...Array.from({ length: 12 }, (_, index) => ({ id: `a11y-message-${index + 1}`, label: `Message ${index + 1}`, roles: ['AXStaticText'] })),
  { id: 'a11y-scroll-end', label: 'Mark all read', roles: ['AXButton'] },
];
/** How far (snapshot pixels) a child may poke outside the scroll view and still count as in view. */
const VIEW_SLACK = 0.5;

/** What the lab shows and what an assistive technology must therefore read, before and after the Godot-side changes. */
export const ELEMENTS = [
  { id: 'a11y-save', label: 'Save', roles: ['AXButton'], enabled: true },
  { id: 'a11y-delete', label: 'Delete', roles: ['AXButton'], enabled: false },
  { id: 'a11y-title', label: 'Accessibility lab', roles: ['AXStaticText'] },
  { id: 'a11y-subscribe', label: 'Subscribe to updates', roles: ['AXCheckBox'], value: [1, 0] },
  { id: 'a11y-select-all', label: 'Select all', roles: ['AXCheckBox'], mixed: true },
  { id: 'a11y-sound', label: 'Sound', roles: ['AXCheckBox'], value: [0, 1] },
  { id: 'a11y-size', label: 'Size', roles: ['AXGroup', 'AXRadioGroup'], engineGap: GROUP_GAP },
  { id: 'a11y-size-small', label: 'Small', roles: ['AXRadioButton'], value: [0, 0] },
  { id: 'a11y-size-medium', label: 'Medium', roles: ['AXRadioButton'], value: [1, 0] },
  { id: 'a11y-size-large', label: 'Large', roles: ['AXRadioButton'], value: [0, 1] },
  { id: 'a11y-volume-thumb', label: 'Volume', roles: ['AXSlider'], value: [30, 80], range: [0, 100] },
  // A text input is a text field (AXTextField) or a text area (AXTextArea). Its text is what the platform reads of it, its
  // selection and caret are where the Godot-side half left them (a name edited and "Lovelace" selected, a read-only field
  // selected whole), a placeholder shows only while the field is empty, and a field with no label is named by its placeholder.
  // `line` is the caret's line. See checkTextField.
  { id: 'a11y-name', label: 'Name', roles: ['AXTextField'], enabled: true, textField: {
    text: ['Ada', 'Ada Lovelace'], selection: [[3, 0], [4, 8]], selected: ['', 'Lovelace'], line: [0, 0],
  } },
  { id: 'a11y-notes', label: 'Notes', roles: ['AXTextArea'], enabled: true, textField: {
    text: ['first\nsecond', 'first\nsecond'], selection: [[12, 0], [12, 0]], selected: ['', ''], line: [1, 1], multiline: true,
  } },
  { id: 'a11y-readonly', label: 'Reference', roles: ['AXTextField'], textField: {
    text: ['Fixed', 'Fixed'], selection: [[5, 0], [0, 5]], selected: ['', 'Fixed'], line: [0, 0], readOnly: true,
  } },
  { id: 'a11y-search', label: 'Search', roles: ['AXTextField'], textField: {
    text: ['', ''], selection: [[0, 0], [0, 0]], selected: ['', ''], line: [0, 0], placeholder: 'Search',
  } },
  // A scroll container is a SCROLL_VIEW. The macOS adapter has no scroll area role, so it is AXUnknown (SCROLL_ROLE_GAP);
  // AXScrollArea would be right if an adapter had one, and either is accepted, one noted.
  { id: 'a11y-scroller', label: 'Messages', roles: ['AXScrollArea', 'AXUnknown'], scroll: true },
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
 * 1 after it. Returns the failures; what the engine cannot convey is appended to `notes` (see GROUP_GAP, MIXED_GAP).
 */
export function checkElements(reading, phase, snapshots, notes = []) {
  const failures = [];
  const pairs = [];
  const nodes = flatten(reading.tree);
  const windows = nodes.filter(node => node.role === 'AXWindow' && node.frame !== undefined);
  for (const expected of ELEMENTS) {
    const matches = findByLabel(nodes, expected.label, expected.roles);
    if (matches.length === 0 && expected.engineGap !== undefined) {
      notes.push(`${expected.id}: ${expected.engineGap}`);
      continue;
    }
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
    if (expected.textField !== undefined) failures.push(...checkTextField(expected, node, phase, notes));
    if (expected.mixed) {
      // Conveyed (AXValue 2, or a description saying so) is a pass. Unchecked is what this engine can do, and is noted.
      // Anything else, a mixed checkbox that reads as checked above all, is wrong.
      const conveyed = numeric(node.value) === 2 || /mixed/iu.test(String(node.valueDescription ?? ''));
      if (!conveyed && numeric(node.value) === 0) {
        notes.push(`${expected.id}: ${MIXED_GAP}`);
      } else if (!conveyed) {
        failures.push(`${expected.id}: a mixed checkbox reads as neither AXValue 2, described as mixed, nor unchecked (AXValue ${JSON.stringify(node.value)}, AXValueDescription ${JSON.stringify(node.valueDescription)})`);
      }
    }
    if (expected.range !== undefined
      && (numeric(node.minValue) !== expected.range[0] || numeric(node.maxValue) !== expected.range[1])) {
      failures.push(`${expected.id}: range is ${node.minValue}..${node.maxValue}, expected ${expected.range.join('..')}`);
    }
    if (expected.scroll) checkScrollView(node, notes);
    else if (node.actionNames?.includes(SCROLL_TO_VISIBLE)) {
      failures.push(`${expected.id}: it advertises ${SCROLL_TO_VISIBLE} but is not inside a scroll view`);
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
  failures.push(...checkScrollItems(nodes, snapshots, pairs, notes));
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

const TEXT_AREA_VALUE_GAP = 'a text area has no AXValue in the platform tree (a stock Godot TextEdit has none either); its text is read through AXStringForRange, which is checked';
const READ_ONLY_GAP = 'the platform does not say that a read-only field is read-only: its AXValue stays settable, exactly as a stock LineEdit with editable off shows it, and the adapter offers no attribute for it';

/**
 * What the platform says of a text input: its text (the AXValue of a field; a text area has none, so the text read by range),
 * the number of characters, the selection and what it selects, the caret's line, and the placeholder, which belongs to the
 * field only while it is empty. A read-only field is noted as a gap, never failed: the adapter cannot convey it (READ_ONLY_GAP).
 */
function checkTextField(expected, node, phase, notes) {
  const failures = [];
  const field = expected.textField;
  const text = field.text[phase];
  const name = expected.id;
  const byRange = node.stringForRange;
  if (field.multiline) {
    if (node.value !== undefined) notes.push(`${name}: the platform now gives a text area an AXValue (${JSON.stringify(node.value)}); judge it`);
    else notes.push(`${name}: ${TEXT_AREA_VALUE_GAP}`);
  } else if (String(node.value ?? '') !== text) {
    failures.push(`${name}: AXValue is ${JSON.stringify(node.value)}, expected ${JSON.stringify(text)}`);
  }
  if (byRange !== undefined && byRange !== text) {
    failures.push(`${name}: the text read by range is ${JSON.stringify(byRange)}, expected ${JSON.stringify(text)}`);
  }
  if (field.multiline && byRange === undefined) failures.push(`${name}: the platform could not read the text area's text by range`);
  if (numeric(node.numberOfCharacters) !== text.length) {
    failures.push(`${name}: AXNumberOfCharacters is ${JSON.stringify(node.numberOfCharacters)}, expected ${text.length}`);
  }
  const [location, length] = field.selection[phase];
  if (node.selectedTextRange?.location !== location || node.selectedTextRange?.length !== length) {
    failures.push(`${name}: AXSelectedTextRange is ${JSON.stringify(node.selectedTextRange)}, expected ${JSON.stringify({ location, length })}`);
  }
  if (String(node.selectedText ?? '') !== field.selected[phase]) {
    failures.push(`${name}: AXSelectedText is ${JSON.stringify(node.selectedText)}, expected ${JSON.stringify(field.selected[phase])}`);
  }
  if (numeric(node.insertionPointLineNumber) !== field.line[phase]) {
    failures.push(`${name}: AXInsertionPointLineNumber is ${JSON.stringify(node.insertionPointLineNumber)}, expected ${field.line[phase]}`);
  }
  if (field.placeholder !== undefined ? node.placeholder !== field.placeholder : (node.placeholder ?? '') !== '') {
    failures.push(`${name}: AXPlaceholderValue is ${JSON.stringify(node.placeholder)}, expected ${JSON.stringify(field.placeholder ?? '')}`);
  }
  const settable = node.settableAttributeNames;
  if (settable !== undefined) {
    if (field.readOnly) {
      if (settable.includes('AXValue')) notes.push(`${name}: ${READ_ONLY_GAP}`);
    } else if (!settable.includes('AXValue') || !settable.includes('AXSelectedTextRange')) {
      failures.push(`${name}: an editable field should let AXValue and AXSelectedTextRange be set, it offers ${JSON.stringify(settable)}`);
    }
  }
  return failures;
}

/** What the platform says about the scroll view itself: noted where the adapter cannot convey it (see SCROLL_ROLE_GAP). */
function checkScrollView(node, notes) {
  if (node.role === 'AXUnknown') notes.push(`a11y-scroller: ${SCROLL_ROLE_GAP}`);
  const exposed = [node.value, node.minValue, node.maxValue, node.verticalScrollBar, node.horizontalScrollBar].some(value => value !== undefined);
  if (!exposed) notes.push(`a11y-scroller: ${SCROLL_VALUES_GAP}`);
  else notes.push(`a11y-scroller: the platform now exposes scroll state (${JSON.stringify({ value: node.value, min: node.minValue, max: node.maxValue, verticalScrollBar: node.verticalScrollBar })}); judge it in scripts/a11y-expectations.mjs`);
  // The dump tool leaves out an empty action list, so an element with no `actionNames` advertises none.
  if (!(node.actionNames ?? []).some(name => /^AXScroll(Up|Down|Left|Right)/u.test(name))) {
    notes.push(`a11y-scroller: ${SCROLL_ACTIONS_GAP}`);
  }
}

/**
 * The scroll view's children as the platform tree has them at this scroll position. A child that lies wholly inside the
 * view must be in the tree; the others may be left out (SCROLL_CULL_GAP). Every child that is in it must have the frame
 * the native geometry says (appended to `pairs` for the fit that judges every frame together), which is what makes a
 * tree that did not follow a scroll fail, and must advertise scroll-into-view.
 */
function checkScrollItems(nodes, snapshots, pairs, notes) {
  const failures = [];
  const view = snapshots['a11y-scroller']?.rect;
  if (view === undefined) return failures;
  let leftOut = 0;
  for (const item of SCROLL_ITEMS) {
    const rect = snapshots[item.id]?.rect;
    if (rect === undefined) continue;
    const wholly = rect.x >= view.x - VIEW_SLACK && rect.y >= view.y - VIEW_SLACK
      && rect.x + rect.width <= view.x + view.width + VIEW_SLACK && rect.y + rect.height <= view.y + view.height + VIEW_SLACK;
    const matches = findByLabel(nodes, item.label, item.roles);
    if (matches.length > 1) {
      failures.push(`${item.id}: expected at most one ${item.roles.join(' or ')} named "${item.label}", found ${matches.length}`);
      continue;
    }
    const node = matches[0];
    if (node === undefined) {
      if (wholly) failures.push(`${item.id}: "${item.label}" is in view in the scroll view but not in the platform tree`);
      else leftOut += 1;
      continue;
    }
    if (node.frame === undefined) failures.push(`${item.id}: the element has no AXFrame`);
    else pairs.push({ id: item.id, snapshot: rect, frame: node.frame });
    if (!(node.actionNames ?? []).includes(SCROLL_TO_VISIBLE)) {
      failures.push(`${item.id}: it is inside a scroll view but does not advertise ${SCROLL_TO_VISIBLE}`);
    }
  }
  if (leftOut > 0) notes.push(`a11y-scroller: ${SCROLL_CULL_GAP}`);
  return failures;
}

/**
 * The expectation that reads the tree after the change: the Volume slider has platform focus. The platform
 * reports focus only while the application's window is the key window. An unfocusable window (plan D21) never is,
 * and the accessibility lab's is not unfocusable because that empties the platform tree (docs/tracks/stock-engine.md),
 * but a window started from a script usually is not key either (it was not in the recorded runs). When it is not,
 * there is nothing to read: the check is skipped, with a note saying why, instead of passing or failing on no
 * evidence.
 * @returns {{failures: string[], note?: string}}
 */
export function checkFocus(reading) {
  const window = flatten(reading.tree).find(node => node.role === 'AXWindow');
  if (window?.focused !== true) {
    return { failures: [], note: 'platform focus was not checked: the window is not the key window (a verifier run does not take key status from the person working in another window)' };
  }
  const focused = reading.focusedElement;
  if (focused === undefined) return { failures: ['the application reports no focused element'] };
  return focused.role === 'AXSlider' && labelOf(focused) === 'Volume'
    ? { failures: [] }
    : { failures: [`the focused element should be the Volume slider, it is ${JSON.stringify({ role: focused.role, label: labelOf(focused) })}`] };
}
