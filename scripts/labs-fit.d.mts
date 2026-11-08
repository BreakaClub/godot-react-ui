export const FIT_TOLERANCE_PX: number;
/** The test id of the navigator's content area, which holds the lab and never excuses what is under it. */
export const PAGE_SCROLLER: string;

/** The parts of a snapshot node the judgement reads. */
export interface FitNode {
  id: number;
  kind: string;
  children: readonly number[];
  rect: { x: number; y: number; width: number; height: number };
  props: Readonly<Record<string, unknown>>;
  scroll: null | { scrollWidth: number; clientWidth: number };
}

export interface FitSnapshot {
  width: number;
  nodes: readonly FitNode[];
}

/**
 * The nodes of a snapshot that pass the viewport sideways, one string each, and the content area's own sideways scroll if it has any. A node
 * under a container that scrolls sideways is not counted, nor is the node a test id in `exceptions` names with everything under it.
 */
export function fitProblems(snapshot: FitSnapshot, exceptions?: Readonly<Record<string, string>>, tolerance?: number): string[];
