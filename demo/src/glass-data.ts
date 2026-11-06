/**
 * What the glass showcase (`glass-lab.tsx`) is made of, apart from its markup: colours, copy and the layout rules that
 * need numbers. It has no dependency on the library so `scripts/glass-reference.mjs` can build the same page for Chrome
 * from the same data.
 */
export type Hex = `#${string}`;

/** The page's base colour; the blobs on it give the glass something to frost. */
export const BASE_COLOUR: Hex = '#1e1b4b';

export interface Blob {
  /** The blob's centre as a fraction of the window, and its diameter as a fraction of the window's shorter side. */
  x: number;
  y: number;
  size: number;
  colour: Hex;
}
/** Large circles, blurred by `blur-3xl` in the page: soft overlapping colour. */
export const BLOBS: readonly Blob[] = [
  { x: 0.12, y: 0.16, size: 0.62, colour: '#9d174d' },
  { x: 0.88, y: 0.12, size: 0.5, colour: '#9a3412' },
  { x: 0.5, y: 0.5, size: 0.7, colour: '#5b21b6' },
  { x: 0.1, y: 0.82, size: 0.55, colour: '#155e75' },
  { x: 0.9, y: 0.78, size: 0.6, colour: '#9f1239' },
  { x: 0.62, y: 0.2, size: 0.28, colour: '#854d0e' },
];

/** Crisp coloured tiles that scroll under the bar, so the blur has hard edges to soften. */
export const TILES = [
  { name: 'Neon', colour: '#db2777' },
  { name: 'Sunset', colour: '#d97706' },
  { name: 'Lagoon', colour: '#059669' },
  { name: 'Skyline', colour: '#0284c7' },
  { name: 'Ember', colour: '#e11d48' },
  { name: 'Dusk', colour: '#7c3aed' },
] as const;

export const CARDS = [
  { title: 'Night drive', body: 'Slow synths and long roads, 42 minutes tuned to the dark.', icon: '#fde047' },
  { title: 'Morning light', body: 'Soft guitars to open a window to, refreshed every Monday.', icon: '#5eead4' },
  { title: 'Deep focus', body: 'No lyrics, no surprises: three hours of steady rhythm.', icon: '#f9a8d4' },
] as const;

export const ROWS = [
  { name: 'Aurora', detail: 'Maya Chen', colour: '#34d399' },
  { name: 'Low tide', detail: 'The Overlap', colour: '#38bdf8' },
  { name: 'Paper moons', detail: 'Ines Duarte', colour: '#fbbf24' },
  { name: 'Static bloom', detail: 'Hollow Pines', colour: '#f472b6' },
  { name: 'Glasshouse', detail: 'Okafor & Lee', colour: '#a78bfa' },
  { name: 'Midnight map', detail: 'Sora', colour: '#fb7185' },
] as const;

/** The search field's placeholder. */
export const SEARCH_PLACEHOLDER = 'Search by mood or artist';

/** Crisp shapes behind the stacked panels, in CSS pixels from the stack's top left: what the stack's blur softens. */
export const STACK_DECOR = [
  { left: 40, top: 20, size: 120, colour: '#fbbf24' },
  { left: 130, top: 60, size: 110, colour: '#34d399' },
  { left: 230, top: 10, size: 90, colour: '#38bdf8' },
  { left: 330, top: 70, size: 130, colour: '#f472b6' },
] as const;
export const STACK_HEIGHT = 224;

/** The classes every glass surface shares: what a browser developer writes. */
export const GLASS = 'border border-white/30 bg-white/20 backdrop-blur-xl backdrop-saturate-150';
export const GLASS_BAR_INSET = 12;
export const GLASS_BAR_HEIGHT = 56;

/** Widths at which the page goes to three columns (and shows the bar's links) and to two. */
const WIDE_PX = 900;
const TWO_COLUMNS_PX = 540;
export const PAGE_PADDING = 16;
export const CARD_GAP = 16;

export interface GlassLayout {
  wide: boolean;
  columns: number;
  cardWidth: number;
}

export function glassLayout(width: number): GlassLayout {
  const wide = width >= WIDE_PX;
  const columns = wide ? 3 : width >= TWO_COLUMNS_PX ? 2 : 1;
  return { wide, columns, cardWidth: Math.floor((width - 2 * PAGE_PADDING - (columns - 1) * CARD_GAP) / columns) };
}

/** Where a blob is drawn: its centre sits at a fraction of the window, so a blob near an edge bleeds past it, as a page's would. */
export function blobRect(blob: Blob, width: number, height: number): { left: number; top: number; size: number } {
  const size = Math.round(blob.size * Math.min(width, height));
  return { left: Math.round(blob.x * width - size / 2), top: Math.round(blob.y * height - size / 2), size };
}
