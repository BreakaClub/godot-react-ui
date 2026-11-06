import assert from 'node:assert/strict';
import test from 'node:test';
import { containsFrame, findByLabel, fitFrames, flatten, labelOf, mentions, type AxNode } from '../scripts/ax-tree.mjs';

// A hand-written tree in the shape scripts/ax-dump.swift prints. It encodes what the verifier expects of
// AccessKit's macOS adapter; it is not a recording of one.
const tree: AxNode = {
  role: 'AXApplication', children: [{
    role: 'AXWindow', frame: { x: 100, y: 50, width: 450, height: 380 }, children: [
      { role: 'AXButton', title: 'Save', frame: { x: 110, y: 90, width: 60, height: 30 } },
      { role: 'AXStaticText', value: 'Accessibility lab', frame: { x: 110, y: 60, width: 200, height: 20 } },
      { role: 'AXGroup', description: 'Size', children: [{ role: 'AXRadioButton', title: 'Small', value: 0 }] },
      { role: 'AXCheckBox', description: 'Sound', subrole: 'AXSwitch', value: 1 },
    ],
  }],
};

test('flatten lists parents before children with the nodes above each', () => {
  const nodes = flatten(tree);
  assert.deepEqual(nodes.map(node => node.role), [
    'AXApplication', 'AXWindow', 'AXButton', 'AXStaticText', 'AXGroup', 'AXRadioButton', 'AXCheckBox',
  ]);
  assert.deepEqual(nodes[5]?.ancestors.map(node => node.role), ['AXApplication', 'AXWindow', 'AXGroup']);
});

test('a label is the title, else the description, else static text\'s value', () => {
  assert.equal(labelOf({ role: 'AXButton', title: 'Save', description: 'ignored' }), 'Save');
  assert.equal(labelOf({ role: 'AXGroup', title: '', description: 'Size' }), 'Size');
  assert.equal(labelOf({ role: 'AXStaticText', value: 'Hello' }), 'Hello');
  assert.equal(labelOf({ role: 'AXSlider', value: 30 }), '', 'a number is not a name');
  assert.equal(labelOf({ role: 'AXCheckBox', value: 'x' }), '', 'only static text is named by its value');
});

test('findByLabel narrows by role and mentions finds text anywhere', () => {
  const nodes = flatten(tree);
  assert.equal(findByLabel(nodes, 'Save', ['AXButton']).length, 1);
  assert.equal(findByLabel(nodes, 'Save', ['AXCheckBox']).length, 0);
  assert.equal(findByLabel(nodes, 'Sound').length, 1);
  assert.ok(mentions(nodes, 'Accessibility lab'));
  assert.ok(!mentions(nodes, 'Secret'));
});

test('fitFrames recovers the scale and offset of a faithful layout whatever they are', () => {
  const rectangles = [
    { x: 16, y: 16, width: 120, height: 24 }, { x: 16, y: 60, width: 320, height: 24 }, { x: 40, y: 200, width: 20, height: 20 },
  ];
  for (const [scale, offsetX, offsetY] of [[1, 100, 50], [0.5, 8, 31.5], [2, -3, 400]] as const) {
    const pairs = rectangles.map(snapshot => ({
      snapshot,
      frame: { x: snapshot.x * scale + offsetX, y: snapshot.y * scale + offsetY, width: snapshot.width * scale, height: snapshot.height * scale },
    }));
    const fit = fitFrames(pairs);
    assert.ok(Math.abs(fit.scale - scale) < 1e-9 && Math.abs(fit.offsetX - offsetX) < 1e-9 && Math.abs(fit.offsetY - offsetY) < 1e-9, JSON.stringify(fit));
    assert.ok(fit.residual < 1e-9);
  }
});

test('fitFrames reports an element that is not where the others say it should be', () => {
  const pairs = [
    { snapshot: { x: 0, y: 0, width: 100, height: 20 }, frame: { x: 100, y: 50, width: 100, height: 20 } },
    { snapshot: { x: 0, y: 40, width: 100, height: 20 }, frame: { x: 100, y: 90, width: 100, height: 20 } },
    { snapshot: { x: 0, y: 80, width: 100, height: 20 }, frame: { x: 100, y: 130, width: 100, height: 20 } },
    { snapshot: { x: 0, y: 120, width: 100, height: 20 }, frame: { x: 100, y: 190, width: 100, height: 20 } },
  ];
  assert.ok(fitFrames(pairs).residual > 3, 'a 20 point error is visible');
  assert.throws(() => fitFrames(pairs.slice(0, 1)), /at least two/);
  const point = { snapshot: { x: 5, y: 5, width: 0, height: 0 }, frame: { x: 105, y: 55, width: 0, height: 0 } };
  assert.throws(() => fitFrames([point, point]), /no extent/);
});

test('containsFrame allows only the stated slack', () => {
  const window = { x: 100, y: 50, width: 450, height: 380 };
  assert.ok(containsFrame(window, { x: 110, y: 90, width: 60, height: 30 }, 0));
  assert.ok(containsFrame(window, { x: 99, y: 50, width: 450, height: 380 }, 1));
  assert.ok(!containsFrame(window, { x: 98, y: 50, width: 450, height: 380 }, 1));
  assert.ok(!containsFrame(window, { x: 500, y: 400, width: 100, height: 100 }, 1));
});
