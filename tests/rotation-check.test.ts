import assert from 'node:assert/strict';
import test from 'node:test';
import {
  OVERFLOW_TOLERANCE_PX, outsideTheRoot, rotationProblems, transientRootProblems, type RotationObservation, type RotationSnapshot, type RotationViewport,
} from '../scripts/rotation-check.mjs';

// The judgement of the Web verifier's `rotation` section (scripts/verify-rotation-web.mjs, docs/tracks/rotation.md), against the observations of a
// phone in Chrome's mobile emulation: the healthy one, and the broken one a page gave after landscape back to portrait, recorded on main.

const PHONE: RotationViewport = { width: 412, height: 915, deviceScaleFactor: 2.625 };

/** A phone in portrait, as a page that fills it is observed (the numbers are the emulation's). */
const FILLED: RotationObservation = {
  innerWidth: 412, innerHeight: 915, visualScale: 1, devicePixelRatio: 2.625,
  documentClientWidth: 412, documentClientHeight: 915, documentScrollWidth: 412, documentScrollHeight: 915,
  canvas: { left: 0, top: 0, width: 411, height: 914, backingWidth: 1081, backingHeight: 2401 },
  root: { width: 411.8095, height: 914.6667 }, outside: [],
};

/** The same phone after landscape back to portrait on main: the browser zoomed out to fit the canvas, and the canvas and root followed `innerWidth`. */
const STUCK_WIDE: RotationObservation = {
  innerWidth: 912, innerHeight: 2026, visualScale: 0.4517543911933899, devicePixelRatio: 2.625,
  documentClientWidth: 412, documentClientHeight: 915, documentScrollWidth: 912, documentScrollHeight: 2026,
  canvas: { left: 0, top: 0, width: 912, height: 2025, backingWidth: 2394, backingHeight: 5318 },
  root: { width: 912, height: 2025.90478515625 }, outside: [],
};

test('a page that fills the viewport has no problem', () => {
  assert.deepEqual(rotationProblems(FILLED, PHONE), []);
});

test('the page main left after landscape back to portrait is refused, in every layer it went wrong in', () => {
  const problems = rotationProblems(STUCK_WIDE, PHONE);
  assert.equal(problems.length, 6, problems.join('\n'));
  assert.match(problems[0] ?? '', /layout viewport is 912 x 2026 .*not the device's 412 x 915/u);
  assert.match(problems[1] ?? '', /zoomed the page to 0\.45/u);
  assert.match(problems[2] ?? '', /content is 912 x 2026, larger than its 412 x 915 layout viewport/u);
  assert.match(problems[3] ?? '', /canvas is 912 x 2025 at 0,0, not 412 x 915 at 0,0/u);
  assert.match(problems[4] ?? '', /backing store is 2394 x 5318 pixels, not 1081 x 2401/u);
  assert.match(problems[5] ?? '', /root is 912 x 2025\.9, not the viewport's 412 x 915/u);
  const rootOnly = rotationProblems({ ...STUCK_WIDE, innerWidth: 412, innerHeight: 915, visualScale: 1, documentScrollWidth: 412, documentScrollHeight: 915, canvas: FILLED.canvas }, PHONE);
  assert.equal(rootOnly.length, 1, 'a root that kept the wide size is refused even when every layer above it is right');
  assert.match(rootOnly[0] ?? '', /the root is 912 x 2025\.9/u);
});

test('a root that is narrower than the viewport, or missing, is refused as well', () => {
  assert.match(rotationProblems({ ...FILLED, root: { width: 20, height: 914.6667 } }, PHONE).join('\n'), /the root is 20 x 914\.7/u);
  assert.match(rotationProblems({ ...FILLED, root: null }, PHONE).join('\n'), /no root to measure/u);
});

test('the engine\'s flooring is not a problem: a root or canvas up to a pixel short passes, two do not', () => {
  assert.deepEqual(rotationProblems({ ...FILLED, root: { width: 411.2, height: 914.2 }, canvas: { ...FILLED.canvas, width: 411.2, backingWidth: 1080.6 } }, PHONE), []);
  assert.equal(rotationProblems({ ...FILLED, root: { width: 410, height: 914.6667 } }, PHONE).length, 1);
});

test('the viewport is another device pixel ratio than the page reports: refused', () => {
  assert.match(rotationProblems({ ...FILLED, devicePixelRatio: 1 }, PHONE).join('\n'), /device pixel ratio is 1, not 2\.625/u);
});

const NODE = { kind: 'view', scroll: null, props: {} };

/** A 412 x 915 root with a bar, a list that scrolls and a card in the list, a popover and a label that reach past the right edge. */
const SNAPSHOT: RotationSnapshot = {
  width: 412, height: 915,
  nodes: [
    { ...NODE, id: 1, children: [2, 4], rect: { x: 0, y: 0, width: 412, height: 915 } },
    { ...NODE, id: 2, children: [3], rect: { x: 0, y: 0, width: 412, height: 80 } },
    { ...NODE, id: 3, kind: 'text', children: [], rect: { x: 300, y: 20, width: 180, height: 20 }, props: { testID: 'lab-menu-value' } },
    { ...NODE, id: 4, children: [5], rect: { x: 0, y: 80, width: 412, height: 835 }, scroll: { scrollTop: 0 } },
    { ...NODE, id: 5, children: [], rect: { x: 0, y: 80, width: 900, height: 2000 } },
  ],
};

test('a node past the root is named with its test id and rectangle; what a scroll container holds is left alone', () => {
  assert.deepEqual(outsideTheRoot(SNAPSHOT), ['lab-menu-value#3 300,20 180x20 in 412x915']);
  assert.deepEqual(outsideTheRoot({ ...SNAPSHOT, nodes: SNAPSHOT.nodes.slice(0, 2) }), []);
});

test('a node within the tolerance of the root\'s edge, or with no area, is not outside it', () => {
  const edge = { ...NODE, id: 6, children: [], rect: { x: 0, y: 0, width: 412 + OVERFLOW_TOLERANCE_PX, height: 10 } };
  const empty = { ...NODE, id: 7, children: [], rect: { x: 900, y: 0, width: 0, height: 10 } };
  assert.deepEqual(outsideTheRoot({ ...SNAPSHOT, nodes: [edge, empty] }), []);
  assert.equal(outsideTheRoot({ ...SNAPSHOT, nodes: [{ ...edge, rect: { ...edge.rect, width: edge.rect.width + 1 } }] }).length, 1);
});

test('the root\'s size at each frame of a turn is the size of one orientation or the other; a frame outside both is named', () => {
  const healthy: [number, number][] = [[411.8, 914.7], [411.8, 914.7], [914.7, 411.8], [914.7, 411.8]];
  assert.deepEqual(transientRootProblems(healthy, PHONE), []);
  const problems = transientRootProblems([...healthy, [20, 914.7], [1830, 5000]], PHONE);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /outside 412 to 915 in 2 of 6 frames, from 20 to 5000 \(first 20 x 914\.7, 1830 x 5000\)/u);
});
