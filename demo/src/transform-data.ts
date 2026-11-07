/**
 * The numbers and cases of the transforms lab (`transform-lab.tsx`), with no dependency on the library so that the
 * plain-HTML reference page (`scripts/transform-reference.mjs`) draws exactly the same thing in Chrome.
 *
 * Every shape case is one card on a plain stage, transformed. The card has a border, a radius, a fill and two lines of
 * text, so the picture shows how a transform treats edges, antialiasing and glyphs.
 */

/** The stage every shape case is drawn on, in logical pixels: it fits the 560 x 400 window of a content scale of two. */
export const STAGE = { width: 520, height: 320, background: '#f8fafc' } as const;

/** The card: a box with a 4 px border, rounded corners and text, at an integer position in the stage. */
export const CARD = {
  left: 150, top: 100, width: 220, height: 120, radius: 16, border: 4, padding: 12,
  fill: '#fde68a', borderColor: '#b45309', ink: '#1e293b',
  title: 'Transform', body: 'Hamburgefonstiv 0123',
} as const;

/** The child of the nested case: smaller, inside the parent card, and transformed in the parent's turned frame. */
export const CHILD = { left: 24, top: 56, width: 110, height: 40, radius: 8, border: 2, fill: '#bfdbfe', borderColor: '#1d4ed8' } as const;

export interface ShapeCase {
  readonly name: string;
  /** CSS `transform` of the card. */
  readonly transform: string;
  /** CSS `transform-origin` of the card (the middle when absent). */
  readonly origin?: string;
  /** The nested case: the card also holds a child with this transform. */
  readonly child?: { readonly transform: string; readonly origin?: string };
  /** The card has square corners: a box under a transform is drawn from feathered triangles (`native/box_mesh.rs`), square or rounded. */
  readonly squareCorners?: true;
  /** What the case shows. */
  readonly note: string;
}

export const SHAPE_CASES: readonly ShapeCase[] = [
  { name: 'identity', transform: 'none', note: 'no transform: the font and the box as the browser draws them' },
  { name: 'translate', transform: 'translate(24px, -16px)', note: 'a move' },
  { name: 'rotate', transform: 'rotate(15deg)', note: 'a turn about the middle' },
  { name: 'rotate-corner', transform: 'rotate(-20deg)', origin: 'top left', note: 'a turn about a corner' },
  { name: 'scale-up', transform: 'scale(1.5)', note: 'text must stay sharp' },
  { name: 'scale-down', transform: 'scale(0.6)', note: 'smaller' },
  { name: 'skew', transform: 'skewX(-18deg) skewY(6deg)', note: 'a shear' },
  { name: 'matrix', transform: 'matrix(1, 0.15, -0.25, 0.9, 12, 6)', note: 'a raw matrix' },
  { name: 'rotate-x', transform: 'rotateX(50deg)', note: 'flat: y squeezed by cos 50, no perspective' },
  { name: 'rotate-y', transform: 'rotateY(40deg)', note: 'flat: x squeezed by cos 40, no perspective' },
  { name: 'rotate-xyz', transform: 'rotateX(30deg) rotateY(-20deg) rotateZ(10deg)', note: 'three axes, flattened' },
  { name: 'percent', transform: 'translate(30%, -40%) rotate(8deg)', note: 'percentages are of the card' },
  { name: 'mirror', transform: 'scale(-1, 1)', note: 'a mirror' },
  {
    name: 'nested', transform: 'rotate(10deg)', child: { transform: 'scale(0.8) translate(10px, 6px) rotate(-5deg)' },
    note: 'a turned parent holding a transformed child, flattened per element',
  },
  { name: 'square-rotate', transform: 'rotate(15deg)', squareCorners: true, note: 'square corners, turned: a staircase if the edges are hard' },
  { name: 'square-rotate-x', transform: 'rotateX(50deg)', squareCorners: true, note: 'square corners, y squeezed: a pixel of feather on each axis' },
  { name: 'square-skew', transform: 'skewX(-18deg) skewY(6deg)', squareCorners: true, note: 'square corners, sheared' },
];

/** The cases whose pictures are compared pixel by pixel with Chrome's. */
export function shapeCase(name: string): ShapeCase {
  const found = SHAPE_CASES.find(candidate => candidate.name === name);
  if (found === undefined) throw new Error(`No shape case named ${name}`);
  return found;
}

/** A transition the verifier samples: a list, the list it goes to, the duration, and the fractions it is sampled at. */
export interface TransitionCase {
  readonly name: string;
  readonly from: string;
  readonly to: string;
  readonly durationMs: number;
  /** Where the card is while the transition runs. */
  readonly note: string;
}

export const TRANSITION_DURATION_MS = 2000;

export const TRANSITION_CASES: readonly TransitionCase[] = [
  { name: 'rotate', from: 'rotate(0deg)', to: 'rotate(90deg)', durationMs: TRANSITION_DURATION_MS, note: 'matching rotate()' },
  { name: 'scale', from: 'scale(1)', to: 'scale(1.8)', durationMs: TRANSITION_DURATION_MS, note: 'matching scale()' },
  {
    name: 'mismatch', from: 'rotate(30deg)', to: 'translateX(40%) scale(1.5)', durationMs: TRANSITION_DURATION_MS,
    note: 'lists that do not match: matrix decomposition, with a percentage of the card',
  },
  { name: 'tailwind', from: 'translate(0px, 0px) rotate(0deg) skewX(0deg) skewY(0deg) scaleX(1) scaleY(1)', to: 'translate(-50%, 0px) rotate(0deg) skewX(0deg) skewY(0deg) scaleX(1.1) scaleY(1.1)', durationMs: TRANSITION_DURATION_MS, note: 'Tailwind\'s composed list, `-translate-x-1/2 scale-110`' },
];

/**
 * The fractions of a transition at which Chrome's matrix is recorded (`transform-golden.ts`). The verifier samples the
 * library's matrix wherever the frames fall and compares it with the golden ones linearly interpolated.
 */
export const TRANSITION_SAMPLES: readonly number[] = Array.from({ length: 21 }, (_, step) => step / 20);

/** The card of the behaviour cases: where its parts sit in the stage. */
export const BEHAVIOUR = {
  /** A bar to click in a turned frame. */
  bar: { left: 150, top: 130, width: 220, height: 56, transform: 'rotate(30deg)' },
  /** A card that scales up on hover. */
  hover: { left: 190, top: 110, width: 140, height: 90, scale: 1.25 },
  /** A text field in a turned, scaled card. */
  input: { left: 120, top: 100, width: 280, height: 90, transform: 'rotate(-6deg) scale(1.2)' },
  /** Selectable text in a turned frame. */
  selectable: { left: 130, top: 100, width: 280, transform: 'rotate(8deg)' },
  /** A draggable card, turned, and the target it is dragged to. */
  drag: { left: 60, top: 120, width: 140, height: 70, transform: 'rotate(20deg)', targetLeft: 340, targetTop: 110, targetSize: 120 },
  /** A scroll container, tilted, and one turned a quarter with its content running along its own x. */
  tilted: { left: 40, top: 40, width: 180, height: 140, transform: 'rotate(8deg)', rows: 14, rowHeight: 28 },
  quarter: { left: 300, top: 60, width: 160, height: 100, transform: 'rotate(90deg)', cells: 12, cellWidth: 60 },
  /** A popover trigger, turned, and the popover anchored to its bounding box. */
  anchor: { left: 160, top: 120, width: 120, height: 40, transform: 'rotate(40deg)' },
  /** Clipping: the same clipped box under a scale (exact) and under a rotation (a bounding box, with an error logged). */
  /** A static element under a translate, the containing block of an absolute and of a fixed child (CSS: a transform makes one). */
  contain: { left: 100, top: 80, width: 200, height: 120, transform: 'translate(40px, 30px)', absolute: { left: 10, top: 10, size: 30 }, fixed: { left: 70, top: 10, size: 30 } },
  /**
   * A box squeezed to 0.6 on y about its top edge and moved 0.1 px down: its straight edges fall inside a pixel row, so their
   * antialiasing shows. Three times: rounded (`edge`), with square corners (`edgeFlat`), and rounded with an outline of a border
   * 1 px thick and no fill (`edgeRing`), which the squeeze makes thinner than a device pixel. All are drawn from feathered triangles,
   * whose feather is one device pixel across each edge whichever axis it is on.
   */
  edge: { left: 100, top: 100, width: 200, height: 100, transform: 'translateY(0.1px) scaleY(0.6)' },
  edgeFlat: { left: 100, top: 200, width: 200, height: 100, transform: 'translateY(0.1px) scaleY(0.6)' },
  edgeRing: { left: 340, top: 200, width: 140, height: 100, border: 1, radius: 8, transform: 'translateY(0.1px) scaleY(0.6)' },
  /** A plain square-cornered box turned 30 degrees: all four edges are slanted, so a hard edge shows as a staircase. */
  turnedSquare: { left: 340, top: 80, size: 100, transform: 'rotate(30deg)' },
  /**
   * The same turn for the layered drawing (a gradient over the fill, a border over the gradient): a square one with a gradient of one
   * colour (so that its coverage reads from one channel), and a rounded one with a border of that colour. Their edges are as soft as the plain box's.
   */
  turnedGradient: { left: 24, top: 110, size: 56, transform: 'rotate(30deg)' },
  turnedGradientRing: { left: 24, top: 200, size: 56, border: 4, radius: 10, transform: 'rotate(30deg)' },
  clipped: { left: 90, top: 100, size: 100, scale: 'scale(1.3)', rotate: 'rotate(30deg)', gap: 220 },
} as const;
