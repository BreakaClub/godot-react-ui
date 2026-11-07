/**
 * What the paint lab (`paint-lab.tsx`) shows: pages of boxes, each with the Tailwind v3 classes under test, on a backdrop.
 * It has no dependency on the library, so `scripts/paint-reference.mjs` builds the same pages for Chrome from the same data
 * (with Tailwind's own compiler) and the two rasters can be compared pixel by pixel.
 *
 * A page is a `PAINT_STAGE` sized stage that fits every window the verifiers use at both device pixel ratios (the portrait
 * window at ratio two is 300 x 450 logical pixels). A box carries no text, so the faces of the two renderers do not differ.
 */
export type Hex = `#${string}`;

export const PAINT_STAGE = { width: 296, height: 392 } as const;

/** A flat rectangle (or a circle, with `radius`) behind the boxes under test. */
export interface Shape {
  left: number;
  top: number;
  width: number;
  height: number;
  colour: Hex;
  radius?: number;
}

export interface PaintCell {
  /** The test id in the lab, and the name in the report. */
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  /** The classes under test. */
  className: string;
  /** Inline styles that Tailwind has no class for (the same CSS text goes to Chrome). */
  inline?: { boxShadow?: string; backgroundImage?: string };
}

export interface PaintPage {
  name: string;
  /** The stage's base colour, and shapes on it. */
  base: Hex;
  shapes?: readonly Shape[];
  cells: readonly PaintCell[];
}

const COLUMNS = [24, 112, 200];
const ROWS = [24, 104, 184, 264, 344];
const CELL = { width: 64, height: 56 };

/** A cell in the page's grid (three columns, four rows), at the grid's size unless it says otherwise. */
function cell(page: string, index: number, className: string, extra: Partial<PaintCell> = {}): PaintCell {
  const column = COLUMNS[index % COLUMNS.length];
  const row = ROWS[Math.floor(index / COLUMNS.length)];
  if (column === undefined || row === undefined) throw new Error(`Cell ${index} is outside the grid`);
  return { id: `paint-${page}-${index}`, left: column, top: row, ...CELL, className, ...extra };
}

function page(name: string, base: Hex, classes: readonly string[], options: { shapes?: readonly Shape[]; extra?: readonly Partial<PaintCell>[] } = {}): PaintPage {
  return {
    name,
    base,
    ...(options.shapes === undefined ? {} : { shapes: options.shapes }),
    cells: classes.map((className, index) => cell(name, index, className, options.extra?.[index])),
  };
}

/** Horizontal bands, so a box that shows its backdrop through itself shows a different colour on each row. */
const STRIPES: readonly Shape[] = ['#f97316', '#10b981', '#3b82f6', '#a855f7', '#f43f5e', '#eab308', '#06b6d4', '#84cc16'].map((colour, index) => ({
  left: 0, top: index * 49, width: PAINT_STAGE.width, height: 49, colour: colour as Hex,
}));

const BLOBS: readonly Shape[] = [
  { left: -20, top: -10, width: 160, height: 160, colour: '#db2777', radius: 80 },
  { left: 150, top: 20, width: 170, height: 170, colour: '#f59e0b', radius: 85 },
  { left: 40, top: 160, width: 190, height: 190, colour: '#06b6d4', radius: 95 },
  { left: 190, top: 230, width: 150, height: 150, colour: '#7c3aed', radius: 75 },
];

export const PAINT_PAGES: readonly PaintPage[] = [
  // Box shadows on opaque boxes: the Tailwind scale, a colour, an arbitrary value, a pill.
  page('shadows', '#f1f5f9', [
    'bg-white rounded-lg shadow-sm',
    'bg-white rounded-lg shadow',
    'bg-white rounded-lg shadow-md',
    'bg-white rounded-lg shadow-lg',
    'bg-white rounded-lg shadow-xl',
    'bg-white rounded-lg shadow-2xl',
    'bg-white rounded-lg shadow-inner',
    'bg-white rounded-lg shadow-none border border-slate-300',
    'bg-white rounded-lg shadow-lg shadow-indigo-500/50',
    'bg-white rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.3)]',
    'bg-sky-500 rounded-lg shadow-xl shadow-red-500/40',
    'bg-white rounded-full shadow-md',
  ]),
  // The same shadows under boxes that let the backdrop through: the shadow must not show inside the box.
  page('shadows-translucent', '#ffffff', [
    'bg-white/40 rounded-lg',
    'bg-white/40 rounded-lg shadow-xl',
    'bg-black/30 rounded-lg shadow-lg',
    'bg-transparent rounded-lg shadow-lg',
    'bg-white/20 rounded-2xl shadow-2xl',
    'bg-sky-500/30 rounded-lg shadow-md border border-white/40',
    'bg-white/30 rounded-lg shadow-inner',
    'bg-white/30 rounded-full shadow-lg',
    'bg-white/30 rounded-t-3xl shadow-lg',
    'bg-white/40 shadow-lg',
    'bg-white/40 rounded-lg shadow-[0_0_0_4px_rgba(0,0,0,0.5)]',
    'bg-transparent rounded-lg shadow-[4px_6px_0_#000000]',
  ], { shapes: STRIPES }),
  // Shadows follow the corners; small boxes, wide bars and tall ones bake masks of their own size.
  page('shadows-shapes', '#e2e8f0', [
    'bg-white rounded-t-2xl shadow-lg',
    'bg-white rounded-br-3xl rounded-tl-3xl shadow-lg',
    'bg-white rounded-none shadow-md',
    'bg-white rounded-3xl shadow-xl',
    'bg-white rounded-full shadow-lg',
    'bg-white rounded-lg shadow-2xl',
    'bg-white rounded-md shadow-lg',
    'bg-white rounded-lg shadow-md',
    'bg-white rounded-xl shadow-xl',
    'bg-white rounded-lg shadow-lg',
    'bg-white rounded-lg shadow-md',
    'bg-white rounded-lg shadow-lg',
    'bg-white rounded-lg shadow-2xl',
  ], {
    extra: [
      {}, {}, {}, {}, { width: 56, height: 56 }, { width: 28, height: 20 }, { width: 24, height: 24 }, { width: 8, height: 8 },
      { width: 64, height: 24 }, { left: 24, top: 340, width: 248, height: 28 }, { left: 270, top: 24, width: 14, height: 240 },
      { left: 112, top: 268, width: 20, height: 56 },
      // Wholly off the stage's left edge, with a gap (the engine counts rectangles that touch as intersecting, so a box that ended at the
      // edge would be drawn whatever its rectangle said): only its shadow reaches in, so the item's rectangle has to include the shadow
      // for the engine not to cull it.
      { left: -72, top: 320, width: 64, height: 56 },
    ],
  }),
  // Rings: Tailwind's width scale, a colour, an opacity, inset, an offset.
  page('rings', '#f8fafc', [
    'bg-white rounded-lg ring',
    'bg-white rounded-lg ring-1 ring-black/10',
    'bg-white rounded-lg ring-2 ring-indigo-500',
    'bg-white rounded-lg ring-4 ring-sky-500/50',
    'bg-white rounded-lg ring-8 ring-emerald-500',
    'bg-white rounded-lg ring-[6px] ring-rose-500',
    'bg-white rounded-lg ring-2 ring-inset ring-indigo-500',
    'bg-white rounded-lg ring-4 ring-inset ring-amber-500/60',
    'bg-white rounded-lg ring-2 ring-indigo-500 ring-offset-2',
    'bg-white rounded-lg ring-2 ring-indigo-500 ring-offset-4 ring-offset-slate-200',
    'bg-slate-900 rounded-lg ring-2 ring-white ring-offset-2 ring-offset-slate-900',
    'bg-white rounded-none ring-2 ring-red-500',
  ]),
  // Rings with shadows, across states (the page checks the composition separately): the card pattern.
  page('rings-shadows', '#f1f5f9', [
    'bg-white rounded-lg shadow-sm ring-1 ring-black/5',
    'bg-white rounded-xl shadow-lg ring-1 ring-slate-900/5',
    'bg-white rounded-lg shadow-md ring-2 ring-indigo-500',
    'bg-white rounded-lg shadow-inner ring-1 ring-slate-300',
    'bg-white rounded-lg shadow-xl ring-4 ring-sky-500/30',
    'bg-slate-800 rounded-lg shadow-lg ring-1 ring-white/10',
    'bg-white/60 rounded-lg shadow-lg ring-1 ring-white',
    'bg-white rounded-full shadow-md ring-2 ring-pink-500',
    'bg-white rounded-lg shadow ring-2 ring-offset-2 ring-blue-500',
    'bg-white rounded-lg shadow-none ring-0',
    'bg-white rounded-lg ring-2 ring-inset ring-indigo-500 shadow-sm',
    'bg-white rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_8px_16px_rgba(0,0,0,0.2)]',
  ]),
  // Outlines: width, offset (also negative), colour, a corner radius they follow.
  page('outlines', '#f8fafc', [
    'bg-white rounded-lg outline outline-2 outline-blue-500',
    'bg-white rounded-lg outline outline-2 outline-offset-2 outline-blue-500',
    'bg-white rounded-lg outline outline-2 -outline-offset-2 outline-blue-500',
    'bg-white rounded-xl outline outline-4 outline-indigo-500',
    'bg-white rounded-lg outline outline-1 outline-slate-900',
    'bg-white rounded-lg outline outline-8 outline-offset-4 outline-rose-500/60',
    'bg-white rounded-none outline outline-2 outline-offset-1 outline-emerald-600',
    'bg-white rounded-full outline outline-2 outline-offset-4 outline-sky-600',
    'bg-white rounded-t-xl outline outline-2 outline-offset-2 outline-purple-600',
    'bg-white rounded-lg outline outline-0 outline-red-500',
    'bg-white rounded-lg outline-none',
    'bg-white rounded-lg outline outline-2 outline-offset-0 outline-orange-500',
  ]),
  // Borders by side: widths, colours, the accent border, with and without corners.
  page('borders', '#f1f5f9', [
    'bg-white border-t-4 border-indigo-500',
    'bg-white border-b-2 border-slate-400',
    'bg-white border-l-4 border-emerald-500',
    'bg-white border-r-8 border-rose-500',
    'bg-white border-x-4 border-sky-500',
    'bg-white border-y-2 border-amber-500',
    'bg-white rounded-lg border-t-4 border-indigo-500',
    'bg-white rounded-xl border-b-4 border-slate-700',
    'bg-white rounded-lg border-l-8 border-emerald-500',
    'bg-white rounded-2xl border-2 border-b-8 border-purple-500',
    'bg-white/50 rounded-lg border-t-4 border-white/70',
    'bg-white rounded-full border-b-4 border-red-500',
  ]),
  // Borders whose sides differ in colour: joined along the mitres, with corners and unequal widths.
  page('borders-mixed', '#f1f5f9', [
    'bg-white border-4 border-t-red-500 border-r-blue-500 border-b-green-500 border-l-yellow-500',
    'bg-white rounded-lg border-4 border-t-red-500 border-r-blue-500 border-b-green-500 border-l-yellow-500',
    'bg-white rounded-3xl border-8 border-t-indigo-600 border-b-pink-500 border-x-slate-800',
    'bg-white border-t-8 border-l-2 border-t-red-600 border-l-blue-600',
    'bg-white rounded-xl border-t-8 border-l-2 border-t-red-600 border-l-blue-600',
    'bg-white border-2 border-y-slate-900 border-x-slate-300',
    'bg-sky-100 rounded-lg border-4 border-t-white border-l-white border-b-slate-400 border-r-slate-400',
    'bg-white rounded-full border-4 border-t-orange-500 border-b-teal-500 border-x-slate-300',
    'bg-white/50 border-4 border-t-black/60 border-b-white/60 border-x-sky-500/60',
    'bg-slate-800 rounded-md border-2 border-t-white border-b-black border-x-slate-500',
    'bg-white rounded-tl-3xl border-4 border-t-fuchsia-500 border-l-lime-500 border-b-cyan-500 border-r-amber-500',
    'bg-white border-b-4 border-r-4 border-b-red-500 border-r-blue-500',
  ]),
  // Corners by side and by corner, with a border.
  page('radii', '#f1f5f9', [
    'bg-sky-500 rounded-t-xl',
    'bg-sky-500 rounded-r-xl',
    'bg-sky-500 rounded-b-xl',
    'bg-sky-500 rounded-l-xl',
    'bg-indigo-500 rounded-tl-3xl',
    'bg-indigo-500 rounded-tr-3xl',
    'bg-indigo-500 rounded-br-3xl',
    'bg-indigo-500 rounded-bl-3xl',
    'bg-emerald-500 rounded-tl-3xl rounded-br-3xl',
    'bg-emerald-500 rounded-t-none rounded-b-2xl border-2 border-emerald-800',
    'bg-rose-500 rounded-lg rounded-tr-none border-4 border-rose-800',
    'bg-amber-500 rounded-t-full border-b-4 border-amber-800',
  ]),
  // Linear gradients in all eight directions, and the three stops.
  page('gradients', '#0f172a', [
    'bg-gradient-to-t from-indigo-500 to-pink-500',
    'bg-gradient-to-tr from-indigo-500 to-pink-500',
    'bg-gradient-to-r from-indigo-500 to-pink-500',
    'bg-gradient-to-br from-indigo-500 to-pink-500',
    'bg-gradient-to-b from-indigo-500 to-pink-500',
    'bg-gradient-to-bl from-indigo-500 to-pink-500',
    'bg-gradient-to-l from-indigo-500 to-pink-500',
    'bg-gradient-to-tl from-indigo-500 to-pink-500',
    'bg-gradient-to-r from-sky-400 via-purple-500 to-rose-500',
    'bg-gradient-to-r from-emerald-400 from-10% via-yellow-300 via-30% to-red-500 to-90%',
    'bg-gradient-to-b from-white to-black',
    'bg-gradient-to-br from-blue-500 to-blue-500/0',
  ], { extra: [{ width: 64, height: 56 }, { width: 80, height: 40 }, { width: 80, height: 40 }, { width: 64, height: 56 }, {}, {}, {}, {}, {}, {}, {}, {}] }),
  // Gradients with corners, borders, transparency and inline values.
  page('gradients-rounded', '#e2e8f0', [
    'bg-gradient-to-r from-indigo-500 to-pink-500 rounded-xl',
    'bg-gradient-to-br from-indigo-500 to-pink-500 rounded-full',
    'bg-gradient-to-r from-sky-500 to-emerald-500 rounded-xl border-4 border-slate-900',
    'bg-gradient-to-b from-transparent to-black/60 rounded-lg bg-sky-400',
    'bg-gradient-to-r from-white/80 to-white/0 rounded-lg bg-indigo-600',
    'bg-gradient-to-tr from-amber-400 to-rose-600 rounded-t-3xl border-b-4 border-rose-900',
    'rounded-xl bg-white shadow-lg',
    'rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-xl shadow-fuchsia-500/40',
    'rounded-lg',
    'rounded-lg',
    'bg-gradient-to-r from-red-500 from-50% to-blue-500 to-50% rounded-lg',
    'bg-gradient-to-br from-slate-100 to-slate-300 rounded-lg ring-1 ring-black/10 shadow-md',
    'bg-white bg-gradient-to-r from-red-500 to-transparent rounded-lg',
  ], { extra: [{}, {}, {}, {}, {}, {}, { inline: { backgroundImage: 'linear-gradient(45deg, #ef4444 0%, #f59e0b 40%, #10b981 100%)' } }, {}, { inline: { backgroundImage: 'linear-gradient(90deg, #4f46e5 0%, rgba(79, 70, 229, 0.2) 50%, #db2777 100%)' } }, { inline: { backgroundImage: 'linear-gradient(200deg, #0ea5e9, #22c55e 30%, #eab308 60%, #ef4444)' } }, {}, {}, { height: 40 }] }),
  // Frosted glass with a shadow and a ring: the key use.
  page('glass', '#1e1b4b', [
    'bg-white/20 rounded-2xl border border-white/30 backdrop-blur-xl shadow-lg',
    'bg-white/10 rounded-xl border border-white/20 backdrop-blur-md shadow-xl',
    'bg-black/20 rounded-2xl ring-1 ring-white/20 backdrop-blur-lg shadow-2xl',
    'bg-white/25 rounded-3xl border border-white/40 backdrop-blur-xl shadow-lg shadow-indigo-900/40',
    'bg-white/15 rounded-lg border border-white/30 backdrop-blur-sm shadow-md',
    'bg-white/20 rounded-t-3xl border border-white/30 backdrop-blur-xl shadow-lg',
    'bg-gradient-to-br from-white/40 to-white/5 rounded-2xl border border-white/30 backdrop-blur-xl shadow-lg',
    'bg-white/20 rounded-full border border-white/30 backdrop-blur-xl shadow-lg',
    'bg-white/20 rounded-xl border-t-2 border-white/60 backdrop-blur-xl shadow-lg',
    'bg-white/20 rounded-xl border border-white/30 backdrop-blur-xl shadow-inner',
    'bg-white/20 rounded-xl border border-white/30 backdrop-blur-xl ring-2 ring-white/40',
    'bg-white/20 rounded-xl outline outline-2 outline-offset-2 outline-white/60 backdrop-blur-xl',
  ], { shapes: BLOBS }),
];

/** Names of the pages, in the order the verifier shows them. */
export const PAINT_PAGE_NAMES: readonly string[] = PAINT_PAGES.map(entry => entry.name);
