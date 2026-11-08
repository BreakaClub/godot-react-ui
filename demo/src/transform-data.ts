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
  /** What the case shows, in a few words. */
  readonly note: string;
  /** What the lab says under the case: what it shows and what to look at, in one or two plain sentences. */
  readonly caption: string;
}

export const SHAPE_CASES: readonly ShapeCase[] = [
  {
    name: 'identity', transform: 'none', note: 'no transform: the font and the box as the browser draws them',
    caption: 'The card with no transform. Choose the other shapes to see each transform applied to this same card.',
  },
  {
    name: 'translate', transform: 'translate(24px, -16px)', note: 'a move',
    caption: 'translate(24px, -16px) moves the card 24 px right and 16 px up. The layout around it does not change.',
  },
  {
    name: 'rotate', transform: 'rotate(15deg)', note: 'a turn about the middle',
    caption: 'rotate(15deg) turns the card 15 degrees clockwise about its middle. Its text and rounded corners are drawn at that angle.',
  },
  {
    name: 'rotate-corner', transform: 'rotate(-20deg)', origin: 'top left', note: 'a turn about a corner',
    caption: 'rotate(-20deg) with transform-origin: top left turns the card anticlockwise about its top left corner, so its right end swings upward.',
  },
  {
    name: 'scale-up', transform: 'scale(1.5)', note: 'text must stay sharp',
    caption: 'scale(1.5) draws the card one and a half times as large about its middle. The text is drawn at the larger size, so it stays sharp.',
  },
  {
    name: 'scale-down', transform: 'scale(0.6)', note: 'smaller',
    caption: 'scale(0.6) draws the card at 60% of its size about its middle.',
  },
  {
    name: 'skew', transform: 'skewX(-18deg) skewY(6deg)', note: 'a shear',
    caption: 'skewX(-18deg) skewY(6deg) shears the card: its edges stay straight but its corners are no longer right angles.',
  },
  {
    name: 'matrix', transform: 'matrix(1, 0.15, -0.25, 0.9, 12, 6)', note: 'a raw matrix',
    caption: 'matrix(1, 0.15, -0.25, 0.9, 12, 6) sets the six numbers of a 2D transform directly: a shear, a slight squash and a small move.',
  },
  {
    name: 'rotate-x', transform: 'rotateX(50deg)', note: 'flat: y squeezed by cos 50, no perspective',
    caption: 'rotateX(50deg) with no perspective squeezes the card to 64% of its height (the cosine of 50 degrees), as a browser draws it. There is no depth: perspective() is not supported.',
  },
  {
    name: 'rotate-y', transform: 'rotateY(40deg)', note: 'flat: x squeezed by cos 40, no perspective',
    caption: 'rotateY(40deg) with no perspective squeezes the card to 77% of its width (the cosine of 40 degrees). There is no depth: perspective() is not supported.',
  },
  {
    name: 'rotate-xyz', transform: 'rotateX(30deg) rotateY(-20deg) rotateZ(10deg)', note: 'three axes, flattened',
    caption: 'rotateX(30deg) rotateY(-20deg) rotateZ(10deg) turns the card about three axes, then flattens it onto the screen, as a browser does without perspective.',
  },
  {
    name: 'percent', transform: 'translate(30%, -40%) rotate(8deg)', note: 'percentages are of the card',
    caption: "translate(30%, -40%) rotate(8deg): percentages are of the card's own size, so it moves 66 px right and 48 px up, and is turned.",
  },
  {
    name: 'mirror', transform: 'scale(-1, 1)', note: 'a mirror',
    caption: 'scale(-1, 1) mirrors the card left to right, so its text reads backwards.',
  },
  {
    name: 'nested', transform: 'rotate(10deg)', child: { transform: 'scale(0.8) translate(10px, 6px) rotate(-5deg)' },
    note: 'a turned parent holding a transformed child, flattened per element',
    caption: "The card is turned 10 degrees and holds a blue bar with a transform of its own, scale(0.8) translate(10px, 6px) rotate(-5deg), which applies inside the card's turned frame.",
  },
  {
    name: 'square-rotate', transform: 'rotate(15deg)', squareCorners: true, note: 'square corners, turned: a staircase if the edges are hard',
    caption: 'A card with square corners turned 15 degrees. Look at its slanted edges: they should be smooth, with no jagged steps.',
  },
  {
    name: 'square-rotate-x', transform: 'rotateX(50deg)', squareCorners: true, note: 'square corners, y squeezed: a pixel of feather on each axis',
    caption: 'A card with square corners squeezed by rotateX(50deg). Look at its top and bottom edges: they should be smooth, not hard lines that jump from one pixel row to the next.',
  },
  {
    name: 'square-skew', transform: 'skewX(-18deg) skewY(6deg)', squareCorners: true, note: 'square corners, sheared',
    caption: 'A card with square corners sheared by skewX(-18deg) skewY(6deg). Look at its slanted edges: they should be smooth.',
  },
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
  /** What the lab says under the case: what it shows and what to try, in one or two plain sentences. */
  readonly caption: string;
}

export const TRANSITION_DURATION_MS = 2000;

export const TRANSITION_CASES: readonly TransitionCase[] = [
  {
    name: 'rotate', from: 'rotate(0deg)', to: 'rotate(90deg)', durationMs: TRANSITION_DURATION_MS, note: 'matching rotate()',
    caption: 'Press Flip: the card turns from rotate(0deg) to rotate(90deg) over two seconds. Press it again to turn the card back.',
  },
  {
    name: 'scale', from: 'scale(1)', to: 'scale(1.8)', durationMs: TRANSITION_DURATION_MS, note: 'matching scale()',
    caption: 'Press Flip: the card grows from scale(1) to scale(1.8) over two seconds. Press it again to shrink it back.',
  },
  {
    name: 'mismatch', from: 'rotate(30deg)', to: 'translateX(40%) scale(1.5)', durationMs: TRANSITION_DURATION_MS,
    note: 'lists that do not match: matrix decomposition, with a percentage of the card',
    caption: 'Press Flip: rotate(30deg) changes to translateX(40%) scale(1.5) over two seconds. The two lists do not match, so the path between them is worked out from their matrices, as a browser does.',
  },
  {
    name: 'tailwind', from: 'translate(0px, 0px) rotate(0deg) skewX(0deg) skewY(0deg) scaleX(1) scaleY(1)', to: 'translate(-50%, 0px) rotate(0deg) skewX(0deg) skewY(0deg) scaleX(1.1) scaleY(1.1)', durationMs: TRANSITION_DURATION_MS, note: 'Tailwind\'s composed list, `-translate-x-1/2 scale-110`',
    caption: 'Press Flip: the card moves half its width to the left while it grows by 10% over two seconds, as Tailwind\'s -translate-x-1/2 scale-110 would.',
  },
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
  /**
   * The rest of the hit page: a square scaled up 1.4 times about its middle (`parent`), a bar turned 25 degrees inside it (`child`, placed in
   * the square's own frame), and a box scaled to nothing (`collapsed`), which is hit nowhere.
   */
  hitParent: { left: 20, top: 20, size: 90, transform: 'scale(1.4)' },
  hitChild: { left: 30, top: 10, width: 50, height: 24, transform: 'rotate(25deg)' },
  hitCollapsed: { left: 400, top: 40, size: 60, transform: 'scale(0)' },
  /** A card that scales up on hover. */
  hover: { left: 190, top: 110, width: 140, height: 90, scale: 1.25 },
  /** A text field in a turned, scaled card. */
  input: { left: 120, top: 100, width: 280, height: 90, transform: 'rotate(-6deg) scale(1.2)' },
  /** Selectable text in a turned frame. */
  selectable: { left: 90, top: 100, width: 340, transform: 'rotate(8deg)' },
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

/** The cases of the behaviour pages: what the lab's case list shows for each, and the caption that explains it. */
export interface BehaviourCase {
  readonly id: string;
  readonly label: string;
  readonly caption: string;
}

export const BEHAVIOUR_CASES: readonly BehaviourCase[] = [
  {
    id: 'combined', label: 'Combined transition (transform + paint + size)',
    caption: 'Press Toggle combined transition: the indigo card moves, turns, grows, fades and changes colour together over 0.4 seconds. Press and hold the green pill to shrink it; with a mouse, hover it to grow and lift it.',
  },
  {
    id: 'loop', label: 'Looping transform animation',
    caption: 'The card loops through four steps that move, turn, resize and recolour it, one step every 0.28 seconds. Pause loop stops it; Next keyframe moves it on by one step.',
  },
  {
    id: 'starting', label: '@starting-style (starting: mount transition)',
    caption: 'Press Remount card: the card animates in from its starting style (faded out, 32 px lower, turned back 12 degrees, half size, amber). Hide the second card and show it again to see it animate in from display: none.',
  },
  {
    id: 'contain', label: 'Containing block of a transformed element',
    caption: 'A transform makes an element the containing block of its absolute and fixed children, as in CSS. The pale box is moved 40 px right and 30 px down; the red square (absolute) and the green square (fixed) are placed inside it, and move with it.',
  },
  {
    id: 'edge', label: 'Squeezed edges (antialiasing on one axis)',
    caption: 'The brown boxes in the middle are squeezed to 60% of their height; the brown square at the top right and the two indigo boxes at the left are turned 30 degrees. Look closely: every edge should be smooth, with no jagged steps or hard lines.',
  },
  {
    id: 'hit', label: 'Hit testing (rotated & scaled)',
    caption: 'Taps hit the shape you see after the transform: the turned bar counts only inside its slanted outline, not in the empty corners of its thin unturned box. The yellow square is scaled 1.4 times and the red bar in it is turned 25 degrees, so a tap on the bar counts for both; the box at the right is scaled to zero and never counts.',
  },
  {
    id: 'hover', label: 'Hover scale (1.25x)',
    caption: 'Move the pointer over the card: it grows to 1.25 times its size and stays hovered across the whole grown card, past its original edges. On a touch screen, press and hold the card instead.',
  },
  {
    id: 'utilities', label: 'Tailwind transform utilities',
    caption: 'The classes -translate-x-1/2 -translate-y-1/4 rotate-6 origin-top-left move the card left by half its width, up by a quarter of its height and turn it 6 degrees about its top left corner. Hover it (or press and hold) and hover:scale-110 grows it without losing the rest.',
  },
  {
    id: 'input', label: 'Text input in a turned card',
    caption: 'Tap the field and type. The card is turned and scaled, and the caret, the text and your tap all follow the turned field: tap at different places along the text to move the caret.',
  },
  {
    id: 'selection', label: 'Text selection in a turned frame',
    caption: 'Drag across the turned text with a mouse to select it, or touch and hold a word on a touch screen. The highlight follows the turned line.',
  },
  {
    id: 'drag', label: 'Drag & drop across rotations',
    caption: 'Drag the yellow card onto the green square: the card is dragged turned, as it is drawn, and the square shows what it received. On a touch screen, hold the card still for half a second, then move.',
  },
  {
    id: 'scroll', label: 'Scrolling inside a rotation',
    caption: 'Scroll the tilted list on the left and the row turned a quarter on the right, with the wheel or by dragging. Each scrolls along its own axis, not the screen\'s: the quarter-turned row scrolls sideways along itself when you move down the screen. A row can show just outside the tilted list\'s edge: the library clips a turned list to the box round it, a known limit.',
  },
  {
    id: 'anchor', label: 'Popover anchor (getRect)',
    caption: 'The blue bar is turned 40 degrees. getRect() returns the box around it (the thin outline), and the red marker is placed at that box\'s bottom right corner, as a popover anchored to a turned trigger would be.',
  },
  {
    id: 'clip', label: 'Overflow clipping',
    caption: 'Both squares hide the red square that overflows them. The left one is scaled 1.3 times and clips exactly. The right one is turned 30 degrees and is clipped to the box around it instead, a known limit that the library logs once: rotate the content, not the clip.',
  },
  {
    id: 'sharp', label: 'Glyph sharpness at scale(1.5)',
    caption: 'Two lines the same size: the first is 16 px text scaled by 1.5, the second is plain 24 px text. Look closely: both should be equally sharp.',
  },
];

/** Every case of the lab in the order the list shows them: the shapes, the transitions, then the behaviour pages. */
export interface CaseOption {
  readonly id: string;
  readonly label: string;
  readonly caption: string;
}

export function caseOptions(): readonly CaseOption[] {
  return [
    ...SHAPE_CASES.map(spec => ({ id: `shape:${spec.name}`, label: `Shape: ${spec.name}`, caption: spec.caption })),
    ...TRANSITION_CASES.map(spec => ({ id: `transition:${spec.name}`, label: `Transition: ${spec.name}`, caption: spec.caption })),
    ...BEHAVIOUR_CASES,
  ];
}

/** What a tap lands on in the hit page. `empty` is the bare stage; `collapsed` is the box scaled to nothing, which is never hit. */
export type HitTarget = 'bar' | 'child' | 'parent' | 'collapsed' | 'empty';

/** The results the hit page shows under its stage, in the order they are shown: each is a part of the stage, its colour, and what it is called. */
export const HIT_RESULTS: ReadonlyArray<{ readonly target: HitTarget; readonly label: string; readonly colour: `#${string}` }> = [
  { target: 'bar', label: 'Turned bar', colour: '#4f46e5' },
  { target: 'child', label: 'Red bar', colour: '#be123c' },
  { target: 'parent', label: 'Yellow square', colour: '#fde68a' },
  { target: 'collapsed', label: 'Box scaled to zero', colour: '#0f172a' },
  { target: 'empty', label: 'Empty stage', colour: '#cbd5e1' },
];
