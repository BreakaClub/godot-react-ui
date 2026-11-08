export const SIZE_TOLERANCE_PX: number;
export const OVERFLOW_TOLERANCE_PX: number;

/** The device's viewport in CSS pixels and its device pixel ratio. */
export interface RotationViewport {
  width: number;
  height: number;
  deviceScaleFactor: number;
}

/** The page as one moment of it was observed: every layer the size passes through, from the browser's layout viewport to the nodes of the root. */
export interface RotationObservation {
  /** `window.innerWidth`, the number Godot's Web display server sizes the canvas from. */
  innerWidth: number;
  innerHeight: number;
  /** `visualViewport.scale`: 1 unless the browser zoomed the page out to fit overflowing content. */
  visualScale: number;
  devicePixelRatio: number;
  /** The layout viewport (`documentElement.clientWidth`). */
  documentClientWidth: number;
  documentClientHeight: number;
  /** What the document's content needs: the canvas, while it is wider than the layout viewport. */
  documentScrollWidth: number;
  documentScrollHeight: number;
  /** The canvas's rect on the page and its backing store. */
  canvas: { left: number; top: number; width: number; height: number; backingWidth: number; backingHeight: number };
  /** The root's size as the snapshot reports it, `null` while the demo has no root. */
  root: { width: number; height: number } | null;
  /** The nodes that extend past the root, outside every scroll container (`outsideTheRoot`). */
  outside: readonly string[];
}

/** Every way the observation differs from a page that fills the viewport, one sentence each, with the numbers; empty when it fills it. */
export function rotationProblems(observation: RotationObservation, viewport: RotationViewport): string[];

/** The part of a native snapshot `outsideTheRoot` reads. */
export interface RotationSnapshot {
  width: number;
  height: number;
  nodes: readonly {
    id: number;
    kind: string;
    children: readonly number[];
    rect: { x: number; y: number; width: number; height: number };
    props: Record<string, unknown>;
    scroll: unknown;
  }[];
}

/** The nodes of a snapshot that extend past its root, outside every scroll container: one string per node, with its rectangle. */
export function outsideTheRoot(snapshot: RotationSnapshot, tolerance?: number): string[];

/** The root's size at every frame of a turn, as `[width, height]` pairs: one sentence if any frame is outside the device's two sides, else none. */
export function transientRootProblems(samples: readonly (readonly [number, number])[], device: { width: number; height: number }): string[];
