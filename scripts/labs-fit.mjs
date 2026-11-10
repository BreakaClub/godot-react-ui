// What the Web verifier's `labs-fit` section judges (scripts/verify-labs-fit-web.mjs), kept apart from the browser so that
// the judgement can be tested against snapshots a broken lab really gave.
//
// A lab fits a phone when nothing of it runs off the right (or left) edge of the viewport: no node outside a scroll container that scrolls sideways
// reaches past the root, and the navigator's content area, which holds the lab, has nothing to scroll sideways.

/** The most a node may reach past the root before it counts as passing the viewport: the geometry gate's own tolerance. */
export const FIT_TOLERANCE_PX = 2;

/**
 * The content area of the navigator: it scrolls the lab up and down. A lab wider than the window makes it scroll sideways, which is the failure,
 * so it never excuses the nodes under it however far they reach.
 */
export const PAGE_SCROLLER = 'lab-scroll';

/**
 * The nodes of a snapshot that pass the viewport sideways, one string each (the test id or kind, the node id, the rectangle, the root's width),
 * and the content area's own sideways scroll if it has any.
 *
 * Not counted: a node under a scroll container that can scroll sideways (its content reaches past it by design: a person pans to it), and the
 * node a test id in `exceptions` names with everything under it (`exceptions` maps a test id to the reason, which the verifier states where it
 * is listed: a lab that clips on purpose, for example).
 *
 * @param {{ width: number, nodes: Array<{ id: number, kind: string, children: number[], rect: { x: number, y: number, width: number, height: number }, props: Record<string, unknown>, scroll: null | { scrollWidth: number, clientWidth: number } }> }} snapshot
 * @param {Readonly<Record<string, string>>} [exceptions]
 * @param {number} [tolerance]
 * @returns {string[]}
 */
export function fitProblems(snapshot, exceptions = {}, tolerance = FIT_TOLERANCE_PX) {
  const byId = new Map(snapshot.nodes.map((node) => [node.id, node]));
  const excused = new Set();
  const excuseSubtree = (id) => {
    for (const child of byId.get(id)?.children ?? []) {
      excused.add(child);
      excuseSubtree(child);
    }
  };
  const problems = [];
  for (const node of snapshot.nodes) {
    const testID = typeof node.props.testID === 'string' ? node.props.testID : undefined;
    if (testID === PAGE_SCROLLER) {
      if (node.scroll !== null && node.scroll.scrollWidth > node.scroll.clientWidth + tolerance) {
        problems.push(`${PAGE_SCROLLER} scrolls sideways: its content is ${Math.round(node.scroll.scrollWidth)} wide in ${Math.round(node.scroll.clientWidth)}`);
      }
      continue;
    }
    const pans = node.scroll !== null && node.scroll.scrollWidth > node.scroll.clientWidth + tolerance;
    if (pans || (testID !== undefined && Object.hasOwn(exceptions, testID))) {
      excuseSubtree(node.id);
      if (testID !== undefined && Object.hasOwn(exceptions, testID)) excused.add(node.id);
    }
  }
  for (const node of snapshot.nodes) {
    const { x, y, width, height } = node.rect;
    if (width === 0 || height === 0 || excused.has(node.id) || node.props.testID === PAGE_SCROLLER) continue;
    if (x < -tolerance || x + width > snapshot.width + tolerance) {
      const name = typeof node.props.testID === 'string' ? node.props.testID : node.kind;
      problems.push(`${name}#${node.id} ${Math.round(x)},${Math.round(y)} ${Math.round(width)}x${Math.round(height)} in a root ${Math.round(snapshot.width)} wide`);
    }
  }
  return problems;
}
