// What the Web verifier's `rotation` section judges (scripts/verify-rotation-web.mjs), kept apart from the browser so
// that the judgement can be tested against the observations a broken page really gave.

/** The most a size may differ from the viewport's: the engine floors the canvas's CSS size and its backing store, so a root is up to a pixel short. */
export const SIZE_TOLERANCE_PX = 1;
/** The most a node may reach past the root before it counts as extending past the viewport: the geometry gate's own tolerance. */
export const OVERFLOW_TOLERANCE_PX = 2;

/**
 * The page as one moment of it was observed (`observe` in the verifier) and the viewport the emulated device has: every layer the size
 * passes through, from the browser's layout viewport to the nodes of the root.
 *
 * @typedef {object} RotationObservation
 * @property {number} innerWidth `window.innerWidth`, the number Godot's Web display server sizes the canvas from.
 * @property {number} innerHeight
 * @property {number} visualScale `visualViewport.scale`: 1 unless the browser zoomed the page out to fit overflowing content.
 * @property {number} devicePixelRatio
 * @property {number} documentClientWidth The layout viewport (`documentElement.clientWidth`).
 * @property {number} documentClientHeight
 * @property {number} documentScrollWidth What the document's content needs: the canvas, while it is wider than the layout viewport.
 * @property {number} documentScrollHeight
 * @property {{ left: number, top: number, width: number, height: number, backingWidth: number, backingHeight: number }} canvas The canvas's rect on the page and its backing store.
 * @property {{ width: number, height: number } | null} root The root's size as the snapshot reports it, `null` while the demo has no root.
 * @property {readonly string[]} outside The nodes that extend past the root, outside every scroll container (`outsideTheRoot`).
 */

/** A size as a person reads it: to a tenth of a pixel. */
const tenth = (value) => Math.round(value * 10) / 10;

/** Every way the observation differs from a page that fills the viewport, one sentence each, with the numbers; empty when it fills it. */
export function rotationProblems(observation, viewport) {
  const problems = [];
  const differs = (actual, expected, tolerance = SIZE_TOLERANCE_PX) => !(Math.abs(actual - expected) <= tolerance);
  const size = (width, height) => `${tenth(width)} x ${tenth(height)}`;
  const { canvas, root } = observation;
  if (observation.innerWidth !== viewport.width || observation.innerHeight !== viewport.height) {
    problems.push(`the browser's layout viewport is ${size(observation.innerWidth, observation.innerHeight)} (window.innerWidth/innerHeight), not the device's ${size(viewport.width, viewport.height)}`);
  }
  if (observation.visualScale !== 1) problems.push(`the browser zoomed the page to ${observation.visualScale} (visualViewport.scale), not 1`);
  if (differs(observation.devicePixelRatio, viewport.deviceScaleFactor, 0)) {
    problems.push(`the device pixel ratio is ${observation.devicePixelRatio}, not ${viewport.deviceScaleFactor}`);
  }
  if (observation.documentScrollWidth > observation.documentClientWidth || observation.documentScrollHeight > observation.documentClientHeight) {
    problems.push(`the document's content is ${size(observation.documentScrollWidth, observation.documentScrollHeight)}, larger than its ${size(observation.documentClientWidth, observation.documentClientHeight)} layout viewport`);
  }
  if (differs(canvas.width, viewport.width) || differs(canvas.height, viewport.height) || differs(canvas.left, 0, 0) || differs(canvas.top, 0, 0)) {
    problems.push(`the canvas is ${size(canvas.width, canvas.height)} at ${canvas.left},${canvas.top}, not ${size(viewport.width, viewport.height)} at 0,0`);
  }
  const backing = size(Math.floor(viewport.width * viewport.deviceScaleFactor), Math.floor(viewport.height * viewport.deviceScaleFactor));
  if (differs(canvas.backingWidth, viewport.width * viewport.deviceScaleFactor) || differs(canvas.backingHeight, viewport.height * viewport.deviceScaleFactor)) {
    problems.push(`the canvas's backing store is ${size(canvas.backingWidth, canvas.backingHeight)} pixels, not ${backing}`);
  }
  if (root === null) {
    problems.push('the demo has no root to measure');
  } else if (differs(root.width, viewport.width) || differs(root.height, viewport.height)) {
    problems.push(`the root is ${size(root.width, root.height)}, not the viewport's ${size(viewport.width, viewport.height)}`);
  }
  if (observation.outside.length > 0) {
    problems.push(`${observation.outside.length} node(s) extend past the root: ${observation.outside.slice(0, 6).join('; ')}`);
  }
  return problems;
}

/**
 * The nodes of a snapshot that extend past its root, outside every scroll container (what a scroll container holds reaches past it by design, as
 * in the interaction verifier's geometry gate). One string per node: its test id or kind, its id and its rectangle.
 */
export function outsideTheRoot(snapshot, tolerance = OVERFLOW_TOLERANCE_PX) {
  const byId = new Map(snapshot.nodes.map((node) => [node.id, node]));
  const scrolled = new Set();
  const collect = (id) => {
    for (const child of byId.get(id)?.children ?? []) {
      scrolled.add(child);
      collect(child);
    }
  };
  for (const node of snapshot.nodes) if (node.scroll !== null) collect(node.id);
  const outside = [];
  for (const node of snapshot.nodes) {
    const { x, y, width, height } = node.rect;
    if (width === 0 || height === 0 || scrolled.has(node.id)) continue;
    if (x < -tolerance || y < -tolerance || x + width > snapshot.width + tolerance || y + height > snapshot.height + tolerance) {
      const name = typeof node.props.testID === 'string' ? node.props.testID : node.kind;
      outside.push(`${name}#${node.id} ${Math.round(x)},${Math.round(y)} ${Math.round(width)}x${Math.round(height)} in ${Math.round(snapshot.width)}x${Math.round(snapshot.height)}`);
    }
  }
  return outside;
}

/**
 * The root's size at every frame of a turn, as `[width, height]` pairs: a root has the size of one orientation or the other, so a frame in
 * which it is outside the device's two sides is a root that was not told the window's size (the Web batch regression once saw one 32 px wide
 * for no proven reason). One sentence, or none.
 */
export function transientRootProblems(samples, device) {
  const shorter = Math.min(device.width, device.height);
  const longer = Math.max(device.width, device.height);
  const outside = samples.filter(([width, height]) => [width, height].some((side) => side < shorter - SIZE_TOLERANCE_PX || side > longer + SIZE_TOLERANCE_PX));
  if (outside.length === 0) return [];
  const narrowest = Math.min(...outside.flat());
  const widest = Math.max(...outside.flat());
  return [`the root was outside ${tenth(shorter)} to ${tenth(longer)} in ${outside.length} of ${samples.length} frames, from ${tenth(narrowest)} to ${tenth(widest)} (first ${outside.slice(0, 3).map(([width, height]) => `${tenth(width)} x ${tenth(height)}`).join(', ')})`];
}
