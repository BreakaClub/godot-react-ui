/**
 * The samples of the text styles lab (`text-styles-lab.tsx`), as plain data: the lab renders them with the library, the Chrome
 * reference (`scripts/text-styles-reference.mjs`) renders the same class strings as HTML with the CSS Tailwind 3.4.17 makes of
 * them, and the verifier (`verify-text-styles.ts`) walks them. No dependency on the library, so the reference uses the same file.
 *
 * Every page is a column of cells; a cell holds one text. The sample's `className` is the whole style: the same string is the
 * `className` of the `Text` and the `class` of the HTML element.
 */

export interface TextSample {
  /** Unique across the pages; the `testID` of the text and the key of its numbers in the reference. */
  id: string;
  /** What the sample shows: a short description for the side-by-side pictures. */
  note: string;
  className: string;
  text: string;
  /** The cell the text sits in, and so the width it wraps to. */
  cellClassName?: string;
  /** Not compared with Chrome: it uses the theme font, which Chrome does not have. */
  themeFont?: boolean;
  /** Wrapped in a parent that has this class (decoration, which propagates). */
  parentClassName?: string;
}

export interface TextPage {
  id: string;
  title: string;
  /** The page's own classes: the column, the font every sample inherits, and the colours. */
  className: string;
  samples: readonly TextSample[];
}

/** The classes every page has: a column of cells, black on white, as wide as the narrowest window the lab is shown in (a retina one). */
const PAGE = 'flex flex-col gap-2 p-2 text-black bg-white w-[540px]';
/** Pages that lay their cells out as a wrapping row. */
const GRID = 'flex flex-row flex-wrap gap-2 p-2 text-black bg-white w-[540px]';
const WIDE = 'flex flex-col w-[480px]';
const NARROW = 'flex flex-col w-[220px]';
const QUOTE = 'The quick brown fox jumps over the lazy dog and keeps on running';
const WORDS = 'Hamburgefonstiv 0123456789';

function weights(family: string, names: readonly string[]): TextSample[] {
  return names.map(name => ({
    id: `weight-${family}-${name}`, note: `font-${family} font-${name}`, className: `font-${family} font-${name} text-base`, text: WORDS, cellClassName: WIDE,
  }));
}

function leadings(names: readonly string[], prefix: string): TextSample[] {
  return names.map(name => ({
    id: `${prefix}-${name}`.replaceAll(/[[\].]/g, '_'), note: `text-sm leading-${name}`, className: `text-sm leading-${name}`, text: QUOTE, cellClassName: 'flex flex-col w-[220px]',
  }));
}

export const PAGES: readonly TextPage[] = [
  {
    id: 'weights-sans', title: 'Open Sans, a variable font: weights', className: PAGE,
    samples: weights('sans', ['thin', 'extralight', 'light', 'normal', 'medium', 'semibold', 'bold', 'extrabold', 'black']),
  },
  {
    id: 'weights-faces', title: 'PT Serif (two static faces) and JetBrains Mono (variable)', className: PAGE,
    samples: [
      ...weights('serif', ['light', 'normal', 'medium', 'semibold', 'bold', 'black']),
      ...weights('mono', ['thin', 'normal', 'bold', 'extrabold']),
    ],
  },
  {
    id: 'styles', title: 'Italic: a true italic face, and a slant made up', className: PAGE,
    samples: [
      { id: 'italic-sans', note: 'italic face', className: 'font-sans italic text-base', text: WORDS, cellClassName: WIDE },
      { id: 'italic-sans-bold', note: 'italic face, bold', className: 'font-sans font-bold italic text-base', text: WORDS, cellClassName: WIDE },
      { id: 'italic-serif', note: 'slanted', className: 'font-serif italic text-base', text: WORDS, cellClassName: WIDE },
      { id: 'italic-serif-bold', note: 'slanted bold face', className: 'font-serif font-bold italic text-base', text: WORDS, cellClassName: WIDE },
      { id: 'italic-mono', note: 'slanted variable', className: 'font-mono italic text-base', text: WORDS, cellClassName: WIDE },
      { id: 'italic-mono-bold', note: 'slanted variable bold', className: 'font-mono font-bold italic text-base', text: WORDS, cellClassName: WIDE },
      { id: 'italic-not', note: 'not-italic under italic', className: 'not-italic text-base', text: WORDS, cellClassName: WIDE, parentClassName: 'italic' },
      { id: 'theme-normal', note: 'theme font', className: 'font-normal text-base', text: WORDS, cellClassName: WIDE, themeFont: true },
      { id: 'theme-bold', note: 'theme font, bold', className: 'font-bold text-base', text: WORDS, cellClassName: WIDE, themeFont: true },
      { id: 'theme-italic', note: 'theme font, slanted', className: 'italic text-base', text: WORDS, cellClassName: WIDE, themeFont: true },
    ],
  },
  {
    id: 'leading', title: 'Line height: the named steps (text-sm)', className: GRID,
    samples: leadings(['none', 'tight', 'snug', 'normal', 'relaxed', 'loose'], 'leading'),
  },
  {
    id: 'leading-lengths', title: 'Line height: leading-3 to leading-10 and arbitrary', className: GRID,
    samples: [
      ...['3', '4', '5', '6', '7', '8', '9', '10', '[1.4]', '[22px]'].map(name => ({
        id: `leading-${name}`.replaceAll(/[[\].]/g, '_'), note: `text-xs leading-${name}`, className: `text-xs leading-${name}`, text: 'Two or three short lines of text', cellClassName: 'flex flex-col w-[110px]',
      })),
      { id: 'leading-slash-6', note: 'text-sm/6', className: 'text-sm/6', text: QUOTE, cellClassName: NARROW },
      { id: 'leading-slash-loose', note: 'text-sm/loose', className: 'text-sm/loose', text: QUOTE, cellClassName: NARROW },
    ],
  },
  {
    id: 'sizes', title: 'Text sizes and their paired line heights', className: PAGE,
    samples: ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl'].map(name => ({
      id: `size-${name}`, note: `text-${name}`, className: `text-${name}`, text: 'Sphinx of black quartz, judge my vow', cellClassName: WIDE,
    })),
  },
  {
    id: 'tracking', title: 'Letter spacing: the named steps at text-sm and text-base', className: GRID,
    samples: ['tighter', 'tight', 'normal', 'wide', 'wider', 'widest'].flatMap(name => ['text-sm', 'text-base'].map(size => ({
      id: `tracking-${name}-${size.slice(5)}`, note: `${size} tracking-${name}`, className: `${size} tracking-${name}`, text: 'Typography 0123', cellClassName: 'flex flex-col w-[230px]',
    }))),
  },
  {
    id: 'tracking-more', title: 'Letter spacing: arbitrary, wrapped, centred, right', className: PAGE,
    samples: [
      { id: 'tracking-em', note: 'tracking-[0.05em]', className: 'text-base tracking-[0.05em]', text: 'Letter spacing in em', cellClassName: WIDE },
      { id: 'tracking-px', note: 'tracking-[1px]', className: 'text-base tracking-[1px]', text: 'Letter spacing in px', cellClassName: WIDE },
      { id: 'tracking-neg', note: 'tracking-[-0.5px]', className: 'text-base tracking-[-0.5px]', text: 'Letter spacing, negative', cellClassName: WIDE },
      { id: 'tracking-caps', note: 'uppercase tracking-widest text-xs', className: 'text-xs uppercase tracking-widest', text: 'Section heading', cellClassName: WIDE },
      { id: 'tracking-odd', note: 'text-[13px] tracking-wide', className: 'text-[13px] tracking-wide', text: 'Odd size, fractional spacing 0.325 px', cellClassName: WIDE },
      { id: 'tracking-wrap', note: 'wrapped, tracking-wide', className: 'text-sm tracking-wide', text: QUOTE, cellClassName: NARROW },
      { id: 'tracking-center', note: 'centred, tracking-widest', className: 'text-sm text-center tracking-widest', text: 'Centred', cellClassName: NARROW },
      { id: 'tracking-right', note: 'right, tracking-wider', className: 'text-sm text-right tracking-wider', text: 'Right aligned', cellClassName: NARROW },
    ],
  },
  {
    id: 'case', title: 'Text transform', className: PAGE,
    samples: [
      { id: 'case-upper', note: 'uppercase', className: 'uppercase text-base', text: "Straße, don't stop: ÉCOLE élève", cellClassName: WIDE },
      { id: 'case-lower', note: 'lowercase', className: 'lowercase text-base', text: "Straße, DON'T STOP: ÉCOLE élève", cellClassName: WIDE },
      { id: 'case-capitalize', note: 'capitalize', className: 'capitalize text-base', text: "the quick brown fox, don't stop: hello-world e.g. 3rd", cellClassName: WIDE },
      { id: 'case-normal', note: 'normal-case under uppercase', className: 'normal-case text-base', text: 'Left as written', cellClassName: WIDE, parentClassName: 'uppercase' },
      { id: 'case-wrap', note: 'uppercase wrapped', className: 'uppercase text-sm', text: QUOTE, cellClassName: NARROW },
    ],
  },
  {
    id: 'decoration', title: 'Decoration', className: PAGE,
    samples: [
      { id: 'deco-underline', note: 'underline', className: 'underline text-base', text: 'Underlined text with gjpqy', cellClassName: WIDE },
      { id: 'deco-overline', note: 'overline', className: 'overline text-base', text: 'Overlined text', cellClassName: WIDE },
      { id: 'deco-line-through', note: 'line-through', className: 'line-through text-base', text: 'Struck through text', cellClassName: WIDE },
      { id: 'deco-colour', note: 'underline decoration-red-500', className: 'underline decoration-red-500 text-base', text: 'Red underline', cellClassName: WIDE },
      { id: 'deco-thick-2', note: 'underline decoration-2', className: 'underline decoration-2 text-base', text: 'Two pixels', cellClassName: WIDE },
      { id: 'deco-thick-4', note: 'underline decoration-4 underline-offset-4', className: 'underline decoration-4 underline-offset-4 text-base', text: 'Four pixels, offset four', cellClassName: WIDE },
      { id: 'deco-large', note: 'underline text-4xl', className: 'underline text-4xl', text: 'Large Gg', cellClassName: WIDE },
      { id: 'deco-wrap', note: 'underline wrapped', className: 'underline text-sm', text: QUOTE, cellClassName: NARROW },
      { id: 'deco-inherited', note: 'underline on the parent', className: 'text-base', text: 'The parent is underlined in blue', cellClassName: WIDE, parentClassName: 'underline decoration-blue-600' },
      { id: 'deco-none', note: 'no-underline under underline', className: 'no-underline text-base', text: 'No underline cannot undo the parent', cellClassName: WIDE, parentClassName: 'underline' },
    ],
  },
  {
    id: 'overflow', title: 'Overflow and line clamp', className: PAGE,
    samples: [
      { id: 'truncate', note: 'truncate', className: 'truncate text-base', text: QUOTE, cellClassName: 'flex flex-col w-[200px]' },
      { id: 'ellipsis', note: 'overflow-hidden whitespace-nowrap text-ellipsis', className: 'overflow-hidden whitespace-nowrap text-ellipsis text-base', text: QUOTE, cellClassName: 'flex flex-col w-[200px]' },
      { id: 'clip', note: 'overflow-hidden whitespace-nowrap text-clip', className: 'overflow-hidden whitespace-nowrap text-clip text-base', text: QUOTE, cellClassName: 'flex flex-col w-[200px]' },
      { id: 'clamp-1', note: 'line-clamp-1', className: 'line-clamp-1 text-sm', text: `${QUOTE}. ${QUOTE}.`, cellClassName: NARROW },
      { id: 'clamp-2', note: 'line-clamp-2', className: 'line-clamp-2 text-sm', text: `${QUOTE}. ${QUOTE}.`, cellClassName: NARROW },
      { id: 'clamp-3', note: 'line-clamp-3', className: 'line-clamp-3 text-sm', text: `${QUOTE}. ${QUOTE}.`, cellClassName: NARROW },
      { id: 'clamp-none', note: 'line-clamp-2 then line-clamp-none', className: 'line-clamp-2 line-clamp-none text-sm', text: `${QUOTE}.`, cellClassName: NARROW },
    ],
  },
  {
    id: 'whitespace', title: 'White space, breaking and justification', className: GRID,
    samples: [
      ...['normal', 'nowrap', 'pre', 'pre-line', 'pre-wrap'].map(name => ({
        id: `space-${name}`, note: `whitespace-${name}`, className: `whitespace-${name} text-sm`, text: 'A  line   with\n   runs of space\nand a break', cellClassName: 'flex flex-col w-[150px] overflow-hidden',
      })),
      { id: 'break-normal', note: 'break-normal', className: 'break-normal text-sm', text: 'A very Pneumonoultramicroscopic word', cellClassName: 'flex flex-col w-[100px]' },
      { id: 'break-words', note: 'break-words', className: 'break-words text-sm', text: 'A very Pneumonoultramicroscopic word', cellClassName: 'flex flex-col w-[100px]' },
      { id: 'break-all', note: 'break-all', className: 'break-all text-sm', text: 'A very Pneumonoultramicroscopic word', cellClassName: 'flex flex-col w-[100px]' },
      { id: 'justify', note: 'text-justify', className: 'text-justify text-sm', text: `${QUOTE}. ${QUOTE}.`, cellClassName: NARROW },
      { id: 'align-end', note: 'text-end', className: 'text-end text-sm', text: QUOTE, cellClassName: NARROW },
    ],
  },
  {
    id: 'numerals', title: 'Numerals', className: PAGE,
    samples: [
      { id: 'nums-proportional', note: 'proportional digits (default)', className: 'text-base', text: '1111 8888 0000', cellClassName: WIDE },
      { id: 'nums-tabular', note: 'tabular-nums', className: 'text-base tabular-nums', text: '1111 8888 0000', cellClassName: WIDE },
      { id: 'nums-tabular-lining', note: 'tabular-nums lining-nums', className: 'text-base tabular-nums lining-nums', text: '1111 8888 0000', cellClassName: WIDE },
      { id: 'nums-oldstyle', note: 'oldstyle-nums', className: 'text-base oldstyle-nums', text: '1234567890', cellClassName: WIDE },
      { id: 'nums-zero', note: 'slashed-zero (mono)', className: 'font-mono text-base slashed-zero', text: '0O 1l 10', cellClassName: WIDE },
      { id: 'nums-antialiased', note: 'antialiased: no change', className: 'text-base antialiased', text: WORDS, cellClassName: WIDE },
    ],
  },
];

/**
 * The classes a sample's text has: its own, and the sans family unless it names another or is for the theme font. (The page
 * sets no family, so a theme font sample inherits none.)
 */
export function textClassName(sample: TextSample): string {
  const names = sample.className.split(' ');
  const hasFamily = names.some(name => name === 'font-serif' || name === 'font-mono' || name === 'font-sans');
  return sample.themeFont === true || hasFamily ? sample.className : `font-sans ${sample.className}`;
}

/** Every sample, flat. */
export function allSamples(): readonly TextSample[] {
  return PAGES.flatMap(page => page.samples);
}

/** Every class any page uses, once, for the CSS generator. */
export function allClassNames(): readonly string[] {
  const names = new Set<string>();
  for (const page of PAGES) {
    for (const name of page.className.split(' ')) names.add(name);
    for (const sample of page.samples) {
      for (const field of [sample.className, sample.cellClassName ?? '', sample.parentClassName ?? '']) {
        for (const name of field.split(' ')) if (name !== '') names.add(name);
      }
    }
  }
  return [...names];
}

/** The families of the registered faces, as the lab registers them and the reference declares them. */
export interface DemoFace {
  family: 'sans' | 'serif' | 'mono';
  /** The file under `demo/fonts`. */
  file: string;
  weight: number | readonly [number, number];
  style: 'normal' | 'italic';
}

export const DEMO_FACES: readonly DemoFace[] = [
  { family: 'sans', file: 'OpenSans-Variable.ttf', weight: [300, 800], style: 'normal' },
  { family: 'sans', file: 'OpenSans-Italic-Variable.ttf', weight: [300, 800], style: 'italic' },
  { family: 'serif', file: 'PTSerif-Regular.ttf', weight: 400, style: 'normal' },
  { family: 'serif', file: 'PTSerif-Bold.ttf', weight: 700, style: 'normal' },
  { family: 'mono', file: 'JetBrainsMono-Variable.ttf', weight: [100, 800], style: 'normal' },
];
