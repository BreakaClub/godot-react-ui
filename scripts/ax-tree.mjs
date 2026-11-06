// Pure helpers for reading the JSON that scripts/ax-dump.swift prints: no process, no file, no Godot.
// scripts/verify-a11y.mjs uses them and tests/ax-tree.test.ts checks them against hand-written trees.

/**
 * @typedef {{x: number, y: number, width: number, height: number}} Frame
 * @typedef {{role?: string, subrole?: string, title?: string, description?: string, value?: unknown,
 *   valueDescription?: string, enabled?: boolean, focused?: boolean, selected?: boolean, expanded?: boolean,
 *   minValue?: unknown, maxValue?: unknown, orientation?: string, frame?: Frame, children?: AxNode[]}} AxNode
 */

/** Every node of the tree, parents before children, each with the nodes above it. @returns {Array<AxNode & {ancestors: AxNode[]}>} */
export function flatten(root) {
  const nodes = [];
  const visit = (node, ancestors) => {
    nodes.push({ ...node, ancestors });
    for (const child of node.children ?? []) visit(child, [...ancestors, node]);
  };
  visit(root, []);
  return nodes;
}

/**
 * What a screen reader would call the node. AccessKit's macOS adapter puts a name in `AXTitle` for roles that
 * take their name from their content (buttons, checkboxes) and in `AXDescription` for the others; static text
 * has its text as the value.
 * @returns {string}
 */
export function labelOf(node) {
  for (const candidate of [node.title, node.description]) {
    if (typeof candidate === 'string' && candidate !== '') return candidate;
  }
  if (node.role === 'AXStaticText' && typeof node.value === 'string') return node.value;
  return '';
}

/**
 * The nodes whose label is `label`, restricted to `roles` when given.
 * @returns {Array<AxNode & {ancestors: AxNode[]}>}
 */
export function findByLabel(nodes, label, roles) {
  return nodes.filter(node => labelOf(node) === label && (roles === undefined || roles.includes(node.role ?? '')));
}

/** Whether any node's label, description or string value is `text`: used to prove something is absent. */
export function mentions(nodes, text) {
  return nodes.some(node => [node.title, node.description, node.value, node.help].some(candidate => candidate === text));
}

/**
 * The scale and offset that best map snapshot rectangles (logical pixels, root-local) onto accessibility
 * frames (points, screen), by least squares on both corners, and the largest distance any corner is from where
 * the fit puts it. A tree the platform laid out faithfully has a residual near zero whatever the scale is
 * (a retina window, a content scale factor): the test is that every element agrees, not what the factor is.
 * @param {Array<{snapshot: Frame, frame: Frame}>} pairs
 * @returns {{scale: number, offsetX: number, offsetY: number, residual: number}}
 */
export function fitFrames(pairs) {
  if (pairs.length < 2) throw new Error('fitFrames needs at least two elements to fit');
  const points = [];
  for (const { snapshot, frame } of pairs) {
    points.push(
      { sx: snapshot.x, sy: snapshot.y, fx: frame.x, fy: frame.y },
      { sx: snapshot.x + snapshot.width, sy: snapshot.y + snapshot.height, fx: frame.x + frame.width, fy: frame.y + frame.height },
    );
  }
  // frame = scale * snapshot + offset, with one scale for both axes: fit x and y samples together.
  const samples = points.flatMap(point => [{ s: point.sx, f: point.fx, axis: 0 }, { s: point.sy, f: point.fy, axis: 1 }]);
  const count = samples.length;
  const meanS = [0, 1].map(axis => mean(samples.filter(sample => sample.axis === axis).map(sample => sample.s)));
  const meanF = [0, 1].map(axis => mean(samples.filter(sample => sample.axis === axis).map(sample => sample.f)));
  let numerator = 0;
  let denominator = 0;
  for (const sample of samples) {
    numerator += (sample.s - meanS[sample.axis]) * (sample.f - meanF[sample.axis]);
    denominator += (sample.s - meanS[sample.axis]) ** 2;
  }
  if (count === 0 || denominator === 0) throw new Error('fitFrames: the snapshot rectangles have no extent to fit');
  const scale = numerator / denominator;
  const offsetX = meanF[0] - scale * meanS[0];
  const offsetY = meanF[1] - scale * meanS[1];
  let residual = 0;
  for (const point of points) {
    residual = Math.max(
      residual,
      Math.abs(scale * point.sx + offsetX - point.fx),
      Math.abs(scale * point.sy + offsetY - point.fy),
    );
  }
  return { scale, offsetX, offsetY, residual };
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Whether `inner` lies inside `outer`, allowing `slack` points of rounding at each edge. */
export function containsFrame(outer, inner, slack) {
  return inner.x >= outer.x - slack && inner.y >= outer.y - slack
    && inner.x + inner.width <= outer.x + outer.width + slack
    && inner.y + inner.height <= outer.y + outer.height + slack;
}
