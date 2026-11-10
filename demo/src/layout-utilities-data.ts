/**
 * The layout utilities lab as data (`layout-utilities-lab.tsx` renders it with the library, `scripts/layout-utilities-reference.mjs`
 * as plain HTML under Tailwind's own CSS in headless Chrome), so the two are the same page. Every box has an id; the verifier
 * compares each box's rectangle with Chrome's `getBoundingClientRect` (`layout-utilities-reference.ts`).
 *
 * Boxes have fixed sizes wherever the size is not what a case is about, and no text beside the one-line captions (which sit in
 * fixed-height rows), so a difference between the engines' fonts cannot move a rectangle.
 */

export interface LabBox {
  readonly id: string;
  readonly className: string;
  readonly children?: readonly LabBox[];
}

export interface LabCase {
  readonly title: string;
  /**
   * Set when the library is known to differ from Chrome in this case: the boxes of the case are left out of the comparison and the
   * reason is reported. The case stays in the lab so that the page shows it.
   */
  readonly known?: string;
  /** The classes that give the case's stage its size; the stage is the box with the case's id. */
  readonly stage: LabBox;
}

export type LayoutPageName = 'margins' | 'sizes' | 'grid' | 'alignment' | 'misc';

export interface LayoutPage {
  readonly name: LayoutPageName;
  readonly cases: readonly LabCase[];
}

/** The width of the page whatever the window is (the viewport units are the only thing a window changes). */
export const PAGE_WIDTH = 1120;
// `shrink-0 self-start`: the library's layer root is a flex row (a browser's body is a block), which would shrink a page wider than the
// window and stretch it to the window's height; the page keeps its own size in both.
export const PAGE_CLASS = `flex-row flex-wrap content-start gap-4 p-4 bg-slate-100 shrink-0 self-start w-[${PAGE_WIDTH}px]`;
/**
 * A caption sits over its stage, out of flow: a long title must not widen the cell (the width of its text is the font's, and the
 * engines' fonts differ), so the cell is as wide as its stage and the caption is clipped to it.
 */
export const CAPTION_CLASS = 'absolute top-0 left-0 h-4 w-full overflow-hidden text-[10px] text-slate-500';
export const CELL_CLASS = 'relative pt-5 shrink-0';

const INDIGO = 'bg-indigo-500';
const EMERALD = 'bg-emerald-500';
const ROSE = 'bg-rose-500';
const AMBER = 'bg-amber-500';
const SKY = 'bg-sky-500';
const STAGE = 'bg-slate-200';

function box(id: string, className: string, children?: readonly LabBox[]): LabBox {
  return children === undefined ? { id, className } : { id, className, children };
}

function stage(id: string, title: string, className: string, children: readonly LabBox[]): LabCase {
  return { title, stage: box(id, `${className} ${STAGE}`, children) };
}

/** `count` boxes of a given size class under one id prefix, in the palette's order. */
function boxes(prefix: string, count: number, className: string): LabBox[] {
  const palette = [INDIGO, EMERALD, ROSE, AMBER, SKY];
  return Array.from({ length: count }, (_, index) => box(`${prefix}.${index + 1}`, `${className} ${palette[index % palette.length]}`));
}

const margins: LayoutPage = {
  name: 'margins',
  cases: [
    stage('margins.auto-column', 'mx-auto, ml-auto, mr-auto', 'w-[240px] h-[110px]', [
      box('margins.auto-column.a', `h-6 w-12 mx-auto ${INDIGO}`),
      box('margins.auto-column.b', `h-6 w-12 ml-auto ${EMERALD}`),
      box('margins.auto-column.c', `h-6 w-12 mr-auto ${ROSE}`),
    ]),
    stage('margins.auto-row', 'row: ml-auto, my-auto, m-auto', 'w-[240px] h-[80px] flex-row', [
      box('margins.auto-row.a', `w-10 h-6 ${INDIGO}`),
      box('margins.auto-row.b', `w-10 h-6 ml-auto my-auto ${EMERALD}`),
      box('margins.auto-row.c', `w-10 h-6 m-auto ${ROSE}`),
    ]),
    stage('margins.auto-single', 'm-auto centres both ways', 'w-[240px] h-[80px] flex-row', [
      box('margins.auto-single.a', `w-16 h-8 m-auto ${INDIGO}`),
    ]),
    stage('margins.negative', '-mx-2, -mt-3, -mb-3', 'w-[240px] h-[110px] p-4', [
      box('margins.negative.a', `h-6 -mx-2 ${INDIGO}`),
      box('margins.negative.b', `h-6 w-20 -mt-3 ${EMERALD}`),
      box('margins.negative.c', `h-6 w-20 -mb-3 ${ROSE}`),
      box('margins.negative.d', `h-3 w-20 ${AMBER}`),
    ]),
    stage('margins.percent', 'm-[10%] and ml-[5%] mt-[2%]', 'w-[240px] h-[110px]', [
      box('margins.percent.a', `h-6 w-12 m-[10%] ${INDIGO}`),
      box('margins.percent.b', `h-4 w-12 ml-[5%] mt-[2%] ${EMERALD}`),
    ]),
    stage('margins.logical', 'ms-4 me-2 ps-2 pe-4', 'w-[240px] h-[40px] flex-row ps-2 pe-4', [
      box('margins.logical.a', `w-10 h-6 ms-4 me-2 ${INDIGO}`),
      box('margins.logical.b', `w-10 h-6 -ms-1 ${EMERALD}`),
    ]),
    stage('margins.arbitrary', 'p-[1rem] gap-[0.5rem] mt-[3px]', 'w-[240px] h-[110px] p-[1rem] gap-[0.5rem]', [
      box('margins.arbitrary.a', `h-4 mt-[3px] ${INDIGO}`),
      box('margins.arbitrary.b', `h-4 ${EMERALD}`),
    ]),
    stage('margins.override', 'm-4 mx-auto: the later class wins', 'w-[240px] h-[80px]', [
      box('margins.override.a', `h-6 w-16 m-4 mx-auto ${INDIGO}`),
    ]),
  ],
};

const sizes: LayoutPage = {
  name: 'sizes',
  cases: [
    stage('sizes.fractions', 'w-1/2, w-1/3, w-full, w-[25%], h-1/2', 'w-[240px] h-[120px]', [
      box('sizes.fractions.a', `w-1/2 h-4 ${INDIGO}`),
      box('sizes.fractions.b', `w-1/3 h-4 ${EMERALD}`),
      box('sizes.fractions.c', `w-full h-4 ${ROSE}`),
      box('sizes.fractions.d', `w-[25%] h-1/2 ${AMBER}`),
    ]),
    stage('sizes.size', 'size-8, size-1/2, size-[3rem], size-px', 'w-[240px] h-[110px] flex-row items-start gap-2', [
      box('sizes.size.a', `size-8 ${INDIGO}`),
      box('sizes.size.b', `size-1/2 ${EMERALD}`),
      box('sizes.size.c', `size-[3rem] ${ROSE}`),
      box('sizes.size.d', `size-px ${AMBER}`),
    ]),
    stage('sizes.intrinsic', 'w-min, w-max, w-fit', 'w-[300px] h-[100px] items-start gap-1', [
      box('sizes.intrinsic.max', 'flex-row flex-wrap gap-1 w-max bg-slate-300', [
        box('sizes.intrinsic.max.1', `w-8 h-3 ${INDIGO}`), box('sizes.intrinsic.max.2', `w-10 h-3 ${EMERALD}`), box('sizes.intrinsic.max.3', `w-12 h-3 ${ROSE}`),
      ]),
      box('sizes.intrinsic.fit', 'flex-row flex-wrap gap-1 w-fit bg-slate-300', [
        box('sizes.intrinsic.fit.1', `w-8 h-3 ${INDIGO}`), box('sizes.intrinsic.fit.2', `w-10 h-3 ${EMERALD}`), box('sizes.intrinsic.fit.3', `w-12 h-3 ${ROSE}`),
      ]),
    ]),
    stage('sizes.intrinsic-narrow', 'w-fit in 100 px: as much as there is', 'w-[100px] h-[100px] items-start gap-1', [
      box('sizes.intrinsic-narrow.fit', 'flex-row flex-wrap gap-1 w-fit bg-slate-300', [
        box('sizes.intrinsic-narrow.fit.1', `w-8 h-3 ${INDIGO}`), box('sizes.intrinsic-narrow.fit.2', `w-10 h-3 ${EMERALD}`), box('sizes.intrinsic-narrow.fit.3', `w-12 h-3 ${ROSE}`),
      ]),
    ]),
    {
      ...stage('sizes.intrinsic-min', 'w-min on a wrapping row: the height is Taffy\'s', 'w-[100px] h-[100px] items-start gap-1', [
        box('sizes.intrinsic-min.min', 'flex-row flex-wrap gap-1 w-min bg-slate-300', [
          box('sizes.intrinsic-min.min.1', `w-8 h-3 ${INDIGO}`), box('sizes.intrinsic-min.min.2', `w-10 h-3 ${EMERALD}`), box('sizes.intrinsic-min.min.3', `w-12 h-3 ${ROSE}`),
        ]),
        box('sizes.intrinsic-min.after', `w-8 h-3 ${AMBER}`),
      ]),
      known: 'Taffy sizes a wrapping flex container of width min-content one line high, so its height and what follows it are off',
    },
    stage('sizes.intrinsic-height', 'h-fit, h-min, h-max on content', 'w-[240px] h-[110px] flex-row items-start gap-2', [
      box('sizes.intrinsic-height.fit', 'h-fit w-12 bg-slate-300', [box('sizes.intrinsic-height.fit.1', `h-4 ${INDIGO}`), box('sizes.intrinsic-height.fit.2', `h-6 ${EMERALD}`)]),
      box('sizes.intrinsic-height.min', 'h-min w-12 bg-slate-300', [box('sizes.intrinsic-height.min.1', `h-4 ${INDIGO}`), box('sizes.intrinsic-height.min.2', `h-6 ${EMERALD}`)]),
      box('sizes.intrinsic-height.max', 'h-max w-12 bg-slate-300', [box('sizes.intrinsic-height.max.1', `h-4 ${INDIGO}`), box('sizes.intrinsic-height.max.2', `h-6 ${EMERALD}`)]),
    ]),
    stage('sizes.limits', 'min-w, max-w, max-w-xs, max-w-full, max-h, min-h', 'w-[240px] h-[130px] gap-1', [
      box('sizes.limits.a', `w-4 min-w-[100px] h-4 ${INDIGO}`),
      box('sizes.limits.b', `w-full max-w-[80px] h-4 ${EMERALD}`),
      box('sizes.limits.c', `w-full max-w-xs h-4 ${ROSE}`),
      box('sizes.limits.d', `w-[500px] max-w-full h-4 ${AMBER}`),
      box('sizes.limits.e', `h-20 max-h-8 w-8 ${SKY}`),
      box('sizes.limits.f', `h-2 min-h-[1rem] w-8 ${INDIGO}`),
      box('sizes.limits.g', `w-24 h-4 max-w-none ${EMERALD}`),
    ]),
    stage('sizes.viewport', 'w-screen, w-[50vw], h-screen, h-[10vh], min-h-[5vh], max-h-[2vh]', 'w-[240px] h-[110px] flex-row items-start overflow-hidden', [
      box('sizes.viewport.w', `w-screen h-4 shrink-0 ${INDIGO}`),
    ]),
    stage('sizes.viewport-more', 'w-[50vw], h-[10vh], min-h-[5vh], max-h-[2vh]', 'w-[240px] h-[110px] flex-row items-start gap-1 overflow-hidden', [
      box('sizes.viewport-more.a', `w-[50vw] h-4 shrink-0 ${INDIGO}`),
      box('sizes.viewport-more.b', `w-4 h-[10vh] shrink-0 ${EMERALD}`),
      box('sizes.viewport-more.c', `w-4 min-h-[5vh] shrink-0 ${ROSE}`),
      box('sizes.viewport-more.d', `w-4 h-screen max-h-[2vh] shrink-0 ${AMBER}`),
    ]),
    stage('sizes.screen-height', 'h-screen and min-h-screen', 'w-[240px] h-[60px] flex-row items-start gap-1 overflow-hidden', [
      box('sizes.screen-height.a', `w-4 h-screen shrink-0 ${INDIGO}`),
      box('sizes.screen-height.b', `w-4 min-h-screen shrink-0 ${EMERALD}`),
      box('sizes.screen-height.c', `w-4 h-4 max-h-screen shrink-0 ${ROSE}`),
    ]),
    stage('sizes.min-w-0', 'min-w-0 lets a flex item give way', 'w-[240px] h-[40px] flex-row gap-2', [
      box('sizes.min-w-0.a', 'flex-row min-w-0 bg-slate-300', [box('sizes.min-w-0.a.1', `w-[300px] h-6 shrink-0 ${INDIGO}`)]),
      box('sizes.min-w-0.b', `w-8 h-6 shrink-0 ${EMERALD}`),
    ]),
    stage('sizes.min-w-auto', 'without it the item keeps its content', 'w-[240px] h-[40px] flex-row gap-2', [
      box('sizes.min-w-auto.a', 'flex-row bg-slate-300', [box('sizes.min-w-auto.a.1', `w-[300px] h-6 shrink-0 ${INDIGO}`)]),
      box('sizes.min-w-auto.b', `w-8 h-6 shrink-0 ${EMERALD}`),
    ]),
    stage('sizes.overflow-min', 'overflow-hidden gives way, overflow-clip does not', 'w-[240px] h-[80px] gap-2', [
      box('sizes.overflow-min.row', 'flex-row gap-2 h-8', [
        box('sizes.overflow-min.hidden', 'flex-row overflow-hidden bg-slate-300', [box('sizes.overflow-min.hidden.1', `w-[300px] h-6 shrink-0 ${INDIGO}`)]),
        box('sizes.overflow-min.hidden-b', `w-8 h-6 shrink-0 ${EMERALD}`),
      ]),
      box('sizes.overflow-min.row2', 'flex-row gap-2 h-8', [
        box('sizes.overflow-min.clip', 'flex-row overflow-clip bg-slate-300', [box('sizes.overflow-min.clip.1', `w-[300px] h-6 shrink-0 ${INDIGO}`)]),
        box('sizes.overflow-min.clip-b', `w-8 h-6 shrink-0 ${EMERALD}`),
      ]),
    ]),
    stage('sizes.flex-growth', 'grow-[2], grow, grow-0, basis-1/4, flex-[3]', 'w-[240px] h-[40px] flex-row', [
      box('sizes.flex-growth.a', `grow-[2] h-6 ${INDIGO}`),
      box('sizes.flex-growth.b', `grow h-6 ${EMERALD}`),
      box('sizes.flex-growth.c', `grow-0 w-8 h-6 ${ROSE}`),
      box('sizes.flex-growth.d', `basis-1/4 shrink-0 h-6 ${AMBER}`),
    ]),
    stage('sizes.flex-shorthand', 'flex-[3], flex-[1_1_auto], flex-1, flex-none', 'w-[240px] h-[40px] flex-row', [
      box('sizes.flex-shorthand.a', `flex-[3] h-6 ${INDIGO}`),
      box('sizes.flex-shorthand.b', `flex-[1_1_auto] w-8 h-6 ${EMERALD}`),
      box('sizes.flex-shorthand.c', `flex-1 h-6 ${ROSE}`),
      box('sizes.flex-shorthand.d', `flex-none w-8 h-6 ${AMBER}`),
    ]),
    {
      ...stage('sizes.flex-1-column', 'flex-1 in a column of unknown height', 'w-[240px]', [
        box('sizes.flex-1-column.a', `flex-1 h-4 ${INDIGO}`),
        box('sizes.flex-1-column.b', `flex-1 h-6 ${EMERALD}`),
      ]),
      known: 'Chrome takes the 0% of flex-1 against an unknown height as the content (nothing) and Taffy shares the height by the boxes\' own',
    },
    stage('sizes.flex-1-definite', 'flex-1 in a column of known height', 'w-[240px] h-[80px]', [
      box('sizes.flex-1-definite.a', `flex-1 ${INDIGO}`),
      box('sizes.flex-1-definite.b', `flex-1 ${EMERALD}`),
    ]),
  ],
};

const grid: LayoutPage = {
  name: 'grid',
  cases: [
    stage('grid.tracks', 'grid-cols-[100px_1fr_auto] gap-1', 'grid grid-cols-[100px_1fr_auto] gap-1 w-[240px] h-[60px]', [
      box('grid.tracks.a', `h-6 ${INDIGO}`),
      box('grid.tracks.b', `h-6 ${EMERALD}`),
      box('grid.tracks.c', `h-6 w-10 ${ROSE}`),
      box('grid.tracks.d', `h-6 col-span-2 ${AMBER}`),
    ]),
    stage('grid.spans', 'grid-cols-3 grid-rows-2: col-span-2, row-span-2, col-start-2', 'grid grid-cols-3 grid-rows-2 gap-1 w-[240px] h-[100px]', [
      box('grid.spans.a', `col-span-2 ${INDIGO}`),
      box('grid.spans.b', `row-span-2 ${EMERALD}`),
      box('grid.spans.c', `${ROSE}`),
      box('grid.spans.d', `col-start-2 ${AMBER}`),
    ]),
    stage('grid.span-order', 'col-start-2 col-span-2 in both orders', 'grid grid-cols-4 grid-rows-2 gap-1 w-[240px] h-[60px]', [
      box('grid.span-order.a', `col-start-2 col-span-2 ${INDIGO}`),
      box('grid.span-order.b', `col-span-2 col-start-2 ${EMERALD}`),
    ]),
    stage('grid.flow-col', 'grid-flow-col grid-rows-2 auto-cols-[40px]', 'grid grid-flow-col grid-rows-2 auto-cols-[40px] gap-1 w-[240px] h-[60px]', boxes('grid.flow-col', 5, 'h-full')),
    stage('grid.auto-rows', 'auto-rows-[24px] grid-cols-2', 'grid grid-cols-2 auto-rows-[24px] gap-1 w-[240px] h-[110px] content-start', boxes('grid.auto-rows', 5, '')),
    stage('grid.auto-fill', 'repeat(auto-fill, minmax(60px, 1fr))', 'grid grid-cols-[repeat(auto-fill,minmax(60px,1fr))] gap-1 w-[240px] h-[80px] content-start', boxes('grid.auto-fill', 7, 'h-6')),
    stage('grid.full-span', 'col-span-full, col-start-2 row-span-2', 'grid grid-cols-[1fr_2fr] gap-1 w-[240px] h-[110px] content-start', [
      box('grid.full-span.a', `col-span-full h-4 ${INDIGO}`),
      box('grid.full-span.b', `h-6 ${EMERALD}`),
      box('grid.full-span.c', `col-start-2 row-span-2 ${ROSE}`),
      box('grid.full-span.d', `h-6 ${AMBER}`),
    ]),
    stage('grid.dense', 'grid-flow-row-dense fills the hole', 'grid grid-cols-3 grid-flow-row-dense gap-1 w-[240px] h-[80px] content-start', [
      box('grid.dense.a', `col-span-2 h-6 ${INDIGO}`),
      box('grid.dense.b', `col-span-2 h-6 ${EMERALD}`),
      box('grid.dense.c', `h-6 ${ROSE}`),
      box('grid.dense.d', `h-6 ${AMBER}`),
    ]),
    stage('grid.sparse', 'without dense the hole stays', 'grid grid-cols-3 gap-1 w-[240px] h-[80px] content-start', [
      box('grid.sparse.a', `col-span-2 h-6 ${INDIGO}`),
      box('grid.sparse.b', `col-span-2 h-6 ${EMERALD}`),
      box('grid.sparse.c', `h-6 ${ROSE}`),
      box('grid.sparse.d', `h-6 ${AMBER}`),
    ]),
    stage('grid.place-items', 'place-items-center, justify-self-end, self-end, place-self-start', 'grid grid-cols-2 grid-rows-2 place-items-center gap-1 w-[240px] h-[100px]', [
      box('grid.place-items.a', `w-8 h-6 ${INDIGO}`),
      box('grid.place-items.b', `w-8 h-6 justify-self-end ${EMERALD}`),
      box('grid.place-items.c', `w-8 h-6 self-end ${ROSE}`),
      box('grid.place-items.d', `w-8 h-6 place-self-start ${AMBER}`),
    ]),
    stage('grid.stretch-self', 'place-self-stretch and justify-items-end', 'grid grid-cols-2 grid-rows-2 justify-items-end gap-1 w-[240px] h-[100px]', [
      box('grid.stretch-self.a', `w-8 h-6 ${INDIGO}`),
      box('grid.stretch-self.b', `place-self-stretch ${EMERALD}`),
      box('grid.stretch-self.c', `w-8 ${ROSE}`),
      box('grid.stretch-self.d', `w-8 h-6 justify-self-auto ${AMBER}`),
    ]),
    stage('grid.content', 'content-between and place-content-center', 'grid grid-cols-[40px_40px] grid-rows-[20px_20px] content-between gap-1 w-[240px] h-[100px]', boxes('grid.content', 4, '')),
    stage('grid.place-content', 'place-content-center', 'grid grid-cols-[40px_40px] grid-rows-[20px_20px] place-content-center gap-1 w-[240px] h-[100px]', boxes('grid.place-content', 4, '')),
    stage('grid.auto-tracks', 'grid-cols-[auto_auto] stretches its auto tracks', 'grid grid-cols-[auto_auto] gap-1 w-[240px] h-[40px]', [
      box('grid.auto-tracks.a', `w-10 h-6 ${INDIGO}`),
      box('grid.auto-tracks.b', `w-20 h-6 ${EMERALD}`),
    ]),
    stage('grid.minmax', 'minmax(0,1fr) minmax(0,2fr) and fit-content', 'grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_fit-content(30px)] gap-1 w-[240px] h-[40px]', [
      box('grid.minmax.a', `h-6 ${INDIGO}`),
      box('grid.minmax.b', `h-6 ${EMERALD}`),
      box('grid.minmax.c', `w-20 h-6 ${ROSE}`),
    ]),
    stage('grid.rows', 'grid-rows-[auto_1fr] and grid-cols-none', 'grid grid-rows-[auto_1fr] grid-cols-none gap-1 w-[240px] h-[100px]', [
      box('grid.rows.a', `h-6 ${INDIGO}`),
      box('grid.rows.b', `${EMERALD}`),
    ]),
    stage('grid.min-content', 'grid-cols-[min-content_max-content]', 'grid grid-cols-[min-content_max-content] gap-1 w-[240px] h-[40px]', [
      box('grid.min-content.a', 'flex-row flex-wrap w-fit bg-slate-300', [box('grid.min-content.a.1', `w-8 h-4 ${INDIGO}`), box('grid.min-content.a.2', `w-10 h-4 ${EMERALD}`)]),
      box('grid.min-content.b', 'flex-row bg-slate-300', [box('grid.min-content.b.1', `w-8 h-4 ${ROSE}`), box('grid.min-content.b.2', `w-10 h-4 ${AMBER}`)]),
    ]),
  ],
};

const alignmentStages: LabCase[] = ['start', 'center', 'end', 'between', 'around', 'evenly', 'stretch', 'normal'].map(value =>
  stage(`alignment.content-${value}`, `content-${value}`, `w-[110px] h-[90px] flex-row flex-wrap content-${value} gap-x-1`, boxes(`alignment.content-${value}`, 3, 'w-12 h-4')));

const alignment: LayoutPage = {
  name: 'alignment',
  cases: [
    ...alignmentStages,
    stage('alignment.justify-stretch', 'justify-stretch and justify-normal change nothing in flex', 'w-[240px] h-[40px] flex-row justify-stretch', boxes('alignment.justify-stretch', 2, 'w-10 h-6')),
    stage('alignment.justify-normal', 'justify-normal', 'w-[240px] h-[40px] flex-row justify-normal', boxes('alignment.justify-normal', 2, 'w-10 h-6')),
    stage('alignment.self', 'self-end, self-center, self-auto, self-stretch', 'w-[240px] h-[60px] flex-row items-start gap-1', [
      box('alignment.self.a', `w-10 h-6 self-end ${INDIGO}`),
      box('alignment.self.b', `w-10 h-6 self-center ${EMERALD}`),
      box('alignment.self.c', `w-10 h-6 self-auto ${ROSE}`),
      box('alignment.self.d', `w-10 self-stretch ${AMBER}`),
    ]),
    stage('alignment.self-auto', 'self-auto follows items-end', 'w-[240px] h-[60px] flex-row items-end gap-1', [
      box('alignment.self-auto.a', `w-10 h-6 self-auto ${INDIGO}`),
      box('alignment.self-auto.b', `w-10 h-6 self-start ${EMERALD}`),
    ]),
    stage('alignment.order', 'order-3, order-1, order-2, order-first, -order-1', 'w-[240px] h-[30px] flex-row gap-1', [
      box('alignment.order.a', `order-3 w-8 h-6 ${INDIGO}`),
      box('alignment.order.b', `order-1 w-10 h-6 ${EMERALD}`),
      box('alignment.order.c', `order-2 w-12 h-6 ${ROSE}`),
      box('alignment.order.d', `order-first w-6 h-6 ${AMBER}`),
      box('alignment.order.e', `-order-1 w-4 h-6 ${SKY}`),
    ]),
    stage('alignment.order-column', 'order in a column and order-last', 'w-[240px] h-[110px] gap-1', [
      box('alignment.order-column.a', `order-last h-4 ${INDIGO}`),
      box('alignment.order-column.b', `h-6 ${EMERALD}`),
      box('alignment.order-column.c', `order-none h-4 ${ROSE}`),
      box('alignment.order-column.d', `order-[-2] h-3 ${AMBER}`),
    ]),
    stage('alignment.order-grid', 'order places grid items', 'grid grid-cols-3 gap-1 w-[240px] h-[60px]', [
      box('alignment.order-grid.a', `order-3 h-6 ${INDIGO}`),
      box('alignment.order-grid.b', `order-1 h-6 ${EMERALD}`),
      box('alignment.order-grid.c', `order-2 h-6 ${ROSE}`),
      box('alignment.order-grid.d', `h-6 ${AMBER}`),
    ]),
  ],
};

const misc: LayoutPage = {
  name: 'misc',
  cases: [
    stage('misc.invisible', 'invisible keeps layout, a visible child inside shows', 'w-[240px] h-[80px] flex-row items-start gap-2', [
      box('misc.invisible.a', `invisible w-16 h-10 ${INDIGO}`, [box('misc.invisible.a.1', `visible w-8 h-4 ${ROSE}`)]),
      box('misc.invisible.b', `w-16 h-10 ${EMERALD}`),
    ]),
    stage('misc.clip', 'overflow-clip clips the child to the box', 'w-[240px] h-[60px] flex-row items-start gap-2', [
      box('misc.clip.a', `w-16 h-8 overflow-clip bg-slate-300`, [box('misc.clip.a.1', `w-32 h-12 shrink-0 ${INDIGO}`)]),
      box('misc.clip.b', `w-16 h-8 overflow-visible bg-slate-300`, [box('misc.clip.b.1', `w-8 h-12 shrink-0 ${EMERALD}`)]),
    ]),
    stage('misc.hidden', 'hidden takes no space', 'w-[240px] h-[40px] flex-row gap-2', [
      box('misc.hidden.a', `w-10 h-6 ${INDIGO}`),
      box('misc.hidden.b', `hidden w-10 h-6 ${EMERALD}`),
      box('misc.hidden.c', `w-10 h-6 ${ROSE}`),
    ]),
    stage('misc.aspect', 'aspect-square, aspect-video, aspect-[4/3], aspect-auto', 'w-[300px] h-[110px] flex-row items-start gap-2', [
      box('misc.aspect.a', `w-12 aspect-square ${INDIGO}`),
      box('misc.aspect.b', `w-16 aspect-video ${EMERALD}`),
      box('misc.aspect.c', `w-12 aspect-[4/3] ${ROSE}`),
      box('misc.aspect.d', `w-12 h-6 aspect-auto ${AMBER}`),
      box('misc.aspect.e', `h-10 aspect-square ${SKY}`),
    ]),
    stage('misc.box', 'box-content and box-border', 'w-[240px] h-[80px] flex-row items-start gap-2', [
      box('misc.box.a', `w-20 h-10 p-2 border-4 box-content ${INDIGO}`),
      box('misc.box.b', `w-20 h-10 p-2 border-4 box-border ${EMERALD}`),
    ]),
    stage('misc.block', 'block: margins collapse, auto centres, children fill', 'block w-[240px] h-[130px]', [
      box('misc.block.a', `h-6 mb-4 ${INDIGO}`),
      box('misc.block.b', `h-6 mt-6 ${EMERALD}`),
      box('misc.block.c', `h-6 w-20 mx-auto ${ROSE}`),
      box('misc.block.d', `h-4 ml-auto w-10 ${AMBER}`),
    ]),
    stage('misc.flow-root', 'flow-root contains the margin of its child', 'block w-[240px] h-[110px]', [
      box('misc.flow-root.a', 'flow-root bg-slate-300', [box('misc.flow-root.a.1', `h-6 mt-4 ${INDIGO}`)]),
      box('misc.flow-root.b', `h-6 mt-2 ${EMERALD}`),
    ]),
    stage('misc.block-collapse', 'a block parent and child share the margin', 'block w-[240px] h-[110px]', [
      box('misc.block-collapse.a', 'block bg-slate-300', [box('misc.block-collapse.a.1', `h-6 mt-4 ${INDIGO}`)]),
      box('misc.block-collapse.b', `h-6 mt-2 ${EMERALD}`),
    ]),
  ],
};

export const LAYOUT_PAGES: readonly LayoutPage[] = [margins, sizes, grid, alignment, misc];

/** Every box of a page, depth first. */
export function pageBoxes(page: LayoutPage): LabBox[] {
  const all: LabBox[] = [];
  const visit = (entry: LabBox): void => {
    all.push(entry);
    entry.children?.forEach(visit);
  };
  page.cases.forEach(entry => visit(entry.stage));
  return all;
}

/** Every distinct class the lab uses, for the stylesheet the reference compiles. */
export function allClasses(): string[] {
  const classes = new Set<string>();
  const add = (className: string): void => className.split(/\s+/).filter(Boolean).forEach(name => classes.add(name));
  [PAGE_CLASS, CAPTION_CLASS, CELL_CLASS].forEach(add);
  for (const page of LAYOUT_PAGES) pageBoxes(page).forEach(entry => add(entry.className));
  TRANSITION_SCENARIOS.forEach(scenario => add(scenario.className));
  // The transition page's own layout.
  add('flex-row flex-wrap content-start gap-4 p-4 bg-slate-100 w-[1120px] gap-1 shrink-0 w-[260px]');
  return [...classes];
}

// ---- Transition classes ----

/** The properties of an element that a transition scenario can read back, in the form both engines report them. */
export type ScenarioProperty = 'backgroundColor' | 'color' | 'borderColor' | 'opacity' | 'width';

/**
 * An element that moves from its resting style to its `hover:` style, and the properties of it to compare with Chrome's
 * transition at the same progress. `delayMs` and `durationMs` are what the classes say (the hover style's, where it changes them);
 * Chrome's own timeline is read at `delay + progress * duration`, so the table needs only the progress.
 */
export interface TransitionScenario {
  readonly id: string;
  readonly title: string;
  readonly className: string;
  /** What to compare. A property Chrome animates and this library jumps (a width from pixels to a percentage) is left out. */
  readonly compare: readonly ScenarioProperty[];
  readonly delayMs: number;
  readonly durationMs: number;
  /** The Text inside the element, whose colour is the element's, inherited: it follows the animation. */
  readonly inheritedText: boolean;
}

const SWATCH = 'w-24 h-10 border-2';
const PALETTE = 'bg-blue-500 border-red-500 text-white hover:bg-red-500 hover:border-green-500 hover:text-black';

export const TRANSITION_SCENARIOS: readonly TransitionScenario[] = [
  {
    id: 'colors', title: 'transition-colors duration-500 ease-in-out',
    className: `${SWATCH} ${PALETTE} transition-colors duration-500 ease-in-out`,
    compare: ['backgroundColor', 'color', 'borderColor'], delayMs: 0, durationMs: 500, inheritedText: true,
  },
  {
    id: 'opacity', title: 'transition-opacity duration-500 ease-linear',
    className: `${SWATCH} bg-indigo-500 border-slate-700 opacity-100 hover:opacity-20 transition-opacity duration-500 ease-linear`,
    compare: ['opacity'], delayMs: 0, durationMs: 500, inheritedText: false,
  },
  {
    id: 'default', title: 'transition duration-500 ease-in',
    className: `${SWATCH} ${PALETTE} transition duration-500 ease-in`,
    compare: ['backgroundColor', 'color', 'borderColor'], delayMs: 0, durationMs: 500, inheritedText: true,
  },
  {
    id: 'ease-out', title: 'transition-colors duration-500 ease-out',
    className: `${SWATCH} ${PALETTE} transition-colors duration-500 ease-out`,
    compare: ['backgroundColor'], delayMs: 0, durationMs: 500, inheritedText: false,
  },
  {
    id: 'all-width', title: 'transition-all duration-500 ease-out: width and colour',
    className: 'h-10 w-20 border-2 bg-emerald-500 border-slate-700 hover:w-40 hover:bg-amber-500 transition-all duration-500 ease-out',
    compare: ['backgroundColor', 'width'], delayMs: 0, durationMs: 500, inheritedText: false,
  },
  {
    id: 'all-percent', title: 'transition-all: a width to a percentage jumps, the colour moves',
    className: 'h-10 w-20 border-2 bg-emerald-500 border-slate-700 hover:w-1/2 hover:bg-amber-500 transition-all duration-500',
    compare: ['backgroundColor'], delayMs: 0, durationMs: 500, inheritedText: false,
  },
  {
    id: 'duration-only', title: 'duration-500 alone animates everything',
    className: `${SWATCH} ${PALETTE} duration-500`,
    compare: ['backgroundColor', 'color', 'borderColor'], delayMs: 0, durationMs: 500, inheritedText: false,
  },
  {
    id: 'delay-curve', title: 'delay-100 ease-[cubic-bezier(0.1,0.7,1,0.1)]',
    className: `${SWATCH} ${PALETTE} transition-colors duration-500 delay-100 ease-[cubic-bezier(0.1,0.7,1,0.1)]`,
    compare: ['backgroundColor'], delayMs: 100, durationMs: 500, inheritedText: false,
  },
  {
    id: 'hover-duration', title: 'hover:duration-[700ms] over duration-300',
    className: `${SWATCH} ${PALETTE} transition-colors duration-300 hover:duration-[700ms]`,
    compare: ['backgroundColor'], delayMs: 0, durationMs: 700, inheritedText: false,
  },
];

/** The progress values of the table Chrome's transitions are read at, and so the resolution a sample is interpolated from. */
export const TRANSITION_TABLE_STEPS = 100;
