/**
 * The samples of the rich text lab (`rich-text-lab.tsx`), as plain data: the lab renders them with the library as nested `Text`, the
 * Chrome reference (`scripts/rich-text-reference.mjs`) renders the same tree as nested `<span>`s with the CSS the same classes make,
 * and the verifier (`verify-rich-text.ts`) walks them. No dependency on the library, so the reference can use the same file.
 *
 * A sample is a paragraph: its `className` is on the outer `Text` (and the HTML element), and `runs` are its children, in order.
 * A run is a string or a nested span with its own classes. An inlay is generated text: the library shows it as a `<Text inlay>`, the
 * reference as a plain `<span>` (a browser has no source text to leave it out of), so every other glyph lands where it does in both.
 */

export interface Span {
  readonly className?: string;
  /** Generated text. Its runs are plain text. */
  readonly inlay?: boolean;
  readonly runs: readonly Run[];
}

export type Run = string | Span;

export interface RichSample {
  /** Unique across the pages; the `testID` of the text and the key of its numbers in the reference. */
  readonly id: string;
  /** What the sample shows: a short description for the side-by-side pictures. */
  readonly note: string;
  readonly className: string;
  readonly runs: readonly Run[];
  /** The verifier selects in this text with the pointer and copies it, and clicks it to hit test, so the reference records each character. */
  readonly interact?: boolean;
}

export interface RichPage {
  readonly id: string;
  readonly title: string;
  readonly samples: readonly RichSample[];
  /** `false`: the page is not rendered by Chrome (it has no CSS here for what it uses); the verifier checks it against itself. */
  readonly chrome?: false;
}

/** A nested span. */
export function span(className: string, ...runs: Run[]): Span {
  return { className, runs };
}

/** Generated text. */
export function inlay(className: string, text: string): Span {
  return { className, inlay: true, runs: [text] };
}

/** The text the sample's source holds: every string, an inlay's left out. */
export function sourceText(runs: readonly Run[]): string {
  return runs.map(run => (typeof run === 'string' ? run : run.inlay === true ? '' : sourceText(run.runs))).join('');
}

/** The text the sample shows: the source with its inlays in. */
export function displayText(runs: readonly Run[]): string {
  return runs.map(run => (typeof run === 'string' ? run : displayText(run.runs))).join('');
}

/** Where each inlay sits in the source (UTF-16 offset) and the text it shows. */
export function inlaysOf(runs: readonly Run[]): { readonly at: number; readonly text: string }[] {
  const found: { at: number; text: string }[] = [];
  let at = 0;
  const walk = (list: readonly Run[]): void => {
    for (const run of list) {
      if (typeof run === 'string') at += run.length;
      else if (run.inlay === true) found.push({ at, text: displayText(run.runs) });
      else walk(run.runs);
    }
  };
  walk(runs);
  return found;
}

/** Every class the samples use, for the reference to check it can write the CSS of each. */
export function classesOf(runs: readonly Run[]): string[] {
  return runs.flatMap(run => (typeof run === 'string' ? [] : [...(run.className ?? '').split(/\s+/u).filter(Boolean), ...classesOf(run.runs)]));
}

/** The classes every page has: a column of cells, dark on white, as wide as the narrowest window the lab is shown in (a retina one). */
export const PAGE_CLASS = 'flex flex-col gap-3 p-3 bg-white w-[520px] self-start select-text';
/** The size and the face of a code line. */
const CODE = 'font-mono text-sm whitespace-pre text-slate-900';
const PROSE = 'font-sans text-base leading-6 text-slate-900 w-[400px]';
/** A line whose text is invisible, so that only what is drawn round it (a decoration, a background) is in the picture. */
const ONLY = 'font-mono text-sm whitespace-pre text-transparent';

const DIGITS = '0123456789012345678901234567890123456789';

/** One row of the decorations page: 'abcdefghij' with 'cdefgh' in a span that is decorated. */
function decorated(id: string, note: string, classes: string, only = true): RichSample {
  return {
    id, note, className: only ? ONLY : CODE, runs: ['ab', span(classes, 'cdefghijklmnopqr'), 'st'],
  };
}

type DecorationStyleName = 'solid' | 'double' | 'dotted' | 'dashed' | 'wavy';

/** The rows of one style: auto thickness and 1, 2 and 4 px. */
function decorationRows(style: DecorationStyleName): RichSample[] {
  return [
    decorated(`deco-${style}-auto`, `underline decoration-${style}, auto thickness`, `underline decoration-${style} decoration-red-600`),
    ...[1, 2, 4].map(thickness => decorated(
      `deco-${style}-${thickness}`, `underline decoration-${style} decoration-${thickness}`, `underline decoration-${style} decoration-red-600 decoration-${thickness}`,
    )),
  ];
}

const wavyRows: RichSample[] = [
  ...decorationRows('wavy'),
  decorated('deco-wavy-3', 'wavy, 3 px', 'underline decoration-wavy decoration-red-600 decoration-[3px]'),
  decorated('deco-wavy-offset', 'wavy with underline-offset-4', 'underline decoration-wavy decoration-red-600 decoration-2 underline-offset-4'),
  {
    id: 'deco-restart', note: 'a wavy underline over nested spans: the pattern starts again at each span, as in Chrome', className: ONLY,
    runs: ['ab', span('underline decoration-wavy decoration-red-600 decoration-2', 'cdef', span('font-bold', 'ghij'), 'klm', span('italic', 'nop'), 'qr'), 'st'],
  },
];

const moreRows: RichSample[] = [
  decorated('deco-double-offset', 'double with underline-offset-4', 'underline decoration-double decoration-red-600 decoration-2 underline-offset-4'),
  decorated('deco-visible', 'a wavy underline under visible text', 'underline decoration-wavy decoration-red-600', false),
  {
    id: 'deco-wrap', note: 'a wavy underline over a wrapped paragraph: each line starts it again', className: `${PROSE} text-transparent`,
    runs: ['The ', span('underline decoration-wavy decoration-red-600 decoration-2', 'quick brown fox jumps over the lazy dog and keeps on running through the whole wide field'), ' end'],
  },
];

export const PAGES: readonly RichPage[] = [
  {
    id: 'colours',
    title: 'Colours, weights and backgrounds',
    samples: [
      {
        id: 'code-line', note: 'a line of code: spans change the colour', className: CODE, interact: true,
        runs: ['const ', span('text-purple-600', 'x'), ' = ', span('text-orange-600', '42'), '; ', span('text-green-700', '// the answer')],
      },
      {
        id: 'prose', note: 'a wrapping paragraph with weights, a slant and a background', className: PROSE, interact: true,
        runs: [
          'The ', span('font-bold', 'quick'), ' ', span('text-red-600 italic', 'brown'), ' fox ', span('bg-yellow-200', 'jumps over'), ' the ',
          span('text-blue-600 font-semibold', 'lazy'), ' dog and then keeps on running through the field until the paragraph wraps.',
        ],
      },
      {
        id: 'nested', note: 'spans inside spans inherit what they do not set', className: PROSE,
        runs: ['outer ', span('text-red-600 font-bold', 'bold red ', span('italic text-blue-600', 'blue italic'), ' back'), ' end'],
      },
      {
        id: 'backgrounds', note: 'backgrounds, nested: the outermost is drawn first', className: CODE,
        runs: ['a ', span('bg-yellow-200', 'yellow'), ' ', span('bg-sky-200 text-sky-900', 'nested ', span('bg-pink-200', 'pink')), ' z'],
      },
      {
        id: 'families', note: 'a serif and a monospace span in a sans paragraph', className: PROSE,
        runs: ['Plain ', span('font-serif', 'serif words'), ' and ', span('font-mono', 'mono words'), ' together.'],
      },
    ],
  },
  {
    id: 'columns',
    title: 'Monospace columns',
    samples: [
      { id: 'columns-plain', note: 'forty characters in one run', className: CODE, runs: [DIGITS], interact: true },
      {
        id: 'columns-spans', note: 'the same forty split into ten spans of colour and weight', className: CODE, interact: true,
        runs: [
          '0123', span('text-red-600', '4567'), '8901', span('font-bold text-blue-600', '2345'), '6789', span('italic', '0123'), span('text-green-700 font-bold', '4567'),
          '8901', span('text-purple-600', '2345'), '6789',
        ],
      },
      {
        id: 'columns-single', note: 'every character its own span', className: CODE,
        runs: [...[...'0123456789'].map((digit, index) => (index % 2 === 0 ? span('text-red-600', digit) : span('font-bold', digit))), '0123456789'],
      },
      {
        id: 'columns-code', note: 'a TypeScript line', className: CODE, interact: true,
        runs: [span('text-purple-600', 'export'), ' ', span('text-purple-600', 'function'), ' ', span('text-blue-600', 'main'), '(argv: ', span('text-teal-700', 'string'), '[]): ', span('text-teal-700', 'number'), ' {'],
      },
    ],
  },
  { id: 'decorations-solid', title: 'Decoration styles: solid and double', samples: [...decorationRows('solid'), ...decorationRows('double')] },
  { id: 'decorations-dotted', title: 'Decoration styles: dotted and dashed', samples: [...decorationRows('dotted'), ...decorationRows('dashed')] },
  { id: 'decorations-wavy', title: 'Decoration styles: wavy', samples: wavyRows },
  { id: 'decorations-more', title: 'Decoration styles: offsets, wrapping and visible text', samples: moreRows },
  {
    id: 'inlays',
    title: 'Inlays',
    samples: [
      {
        id: 'inlay-hint', note: 'a type hint after a name', className: CODE, interact: true,
        runs: ['let count', inlay('text-slate-500', ': number'), ' = 42;'],
      },
      {
        id: 'inlay-group', note: 'two inlays at one offset, one at the start and one at the end', className: CODE, interact: true,
        runs: [inlay('text-slate-500 bg-slate-100', 'first: '), 'call(', inlay('text-slate-500', 'a: '), 'x', inlay('text-slate-500', ' b:'), inlay('text-slate-500', '[2]'), ', y)', inlay('text-slate-500', ' // end')],
      },
      {
        id: 'inlay-glue', note: 'an inlay inside a word: the word spans it', className: CODE, interact: true,
        runs: ['abc', inlay('text-slate-500', 'def'), 'ghi jkl'],
      },
      {
        id: 'inlay-wrap', note: 'an inlay in a wrapping paragraph', className: PROSE, interact: true,
        runs: ['The quick brown fox jumps', inlay('text-slate-500 italic', ' (loudly)'), ' over the lazy dog and keeps on running through the field.'],
      },
    ],
  },
  {
    id: 'transformed',
    title: 'Under transforms',
    chrome: false,
    samples: [
      { id: 'scaled', note: 'scaled by one and a half from its corner', className: `${CODE} origin-top-left scale-150`, runs: ['let ', span('text-red-600', 'count'), inlay('text-slate-500', ': number'), ' = 42;'], interact: true },
      { id: 'rotated', note: 'turned a quarter, about its centre', className: `${CODE} rotate-90 my-16 self-start`, runs: ['let ', span('text-red-600', 'count'), inlay('text-slate-500', ': number'), ' = 42;'], interact: true },
    ],
  },
  {
    id: 'changes',
    title: 'Changes',
    samples: [
      { id: 'recolour', note: 'a span whose colour changes with the tone', className: CODE, runs: ['let ', span('text-red-600', 'x'), ' = 1;'] },
      { id: 'retext', note: 'a span whose text changes with the tone', className: CODE, runs: ['let ', span('text-red-600', 'x'), ' = 1;'] },
    ],
  },
];

/** The tones of the `recolour` and `retext` samples: the first is what the page starts with. */
export const TONES = [
  { colour: 'text-red-600', word: 'x' },
  { colour: 'text-blue-600', word: 'xy' },
] as const;
