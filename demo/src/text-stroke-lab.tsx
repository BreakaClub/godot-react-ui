import { Text, View, type Style } from 'godot-react-ui';
import { LAB_CARD_CLASS, LabCase, LabGrid, LabIntro } from './lab-parts';

/**
 * Text with a stroke (`WebkitTextStrokeWidth`, `WebkitTextStrokeColor`, `paintOrder: 'stroke'`): a stroke is drawn under the glyphs,
 * which is how a HUD gets words that read on any background. Every case is a pair or a trio of the same text on the same slate
 * backdrop, one without a stroke and the rest with one, so that the verifier (`verify-text-stroke.ts`) can hold what is drawn to the
 * plain text: the fill must be the same, the stroke must be under it and reach `STROKE_OUTLINE_PX` past it, and the layout the same.
 * The twin of a white stroke is on white: a glyph's edge pixel is its colour blended with what is behind it, so the twin's edge
 * pixels are the same colours as the stroked text's and the two have the same count of solid pixels.
 *
 * Each case takes a different path through the native drawing: a whole line at a time, a glyph at a time (a tracked font), several
 * lines (one line's stroke never covers its neighbour's glyphs), and runs with colours of their own.
 */

/** CSS width of the stroke. Godot's outline takes the distance outside the glyph, half of this. */
export const STROKE_WIDTH_PX = 6;
/** How far the stroke reaches outside the glyph. */
export const STROKE_OUTLINE_PX = STROKE_WIDTH_PX / 2;
/** The width of the stroke that takes the colour of the text. */
export const CURRENT_COLOR_WIDTH_PX = 4;
export const CURRENT_COLOR_OUTLINE_PX = CURRENT_COLOR_WIDTH_PX / 2;

export const STROKE_COLOR = '#ffffff';
export const BACKDROP_CLASS = 'bg-slate-500';
/** The backdrop of a text whose twin has a white stroke. */
const WHITE_BACKDROP_CLASS = 'bg-white';
/** The backdrop's colour (Tailwind slate-500) and the colours the samples are drawn in. */
export const BACKDROP: readonly [number, number, number] = [100, 116, 139];
export const INK: readonly [number, number, number] = [0, 0, 0];
export const YELLOW: readonly [number, number, number] = [253, 224, 71];
export const RED: readonly [number, number, number] = [220, 38, 38];
export const BLUE: readonly [number, number, number] = [29, 78, 216];
export const WHITE: readonly [number, number, number] = [255, 255, 255];

const WHITE_STROKE: Style = { WebkitTextStrokeWidth: STROKE_WIDTH_PX, WebkitTextStrokeColor: STROKE_COLOR, paintOrder: 'stroke' };
const CURRENT_COLOR_STROKE: Style = { WebkitTextStrokeWidth: CURRENT_COLOR_WIDTH_PX, paintOrder: 'stroke' };
const BIG = 'text-3xl';

/** A text of the lab: its test id, classes and style, and the runs it is made of (one plain run, or runs with colours of their own). */
export interface StrokeSample {
  readonly id: string;
  readonly className: string;
  /** What is behind the text: slate unless it says. */
  readonly backdropClassName?: string;
  readonly style?: Style;
  readonly runs: readonly { readonly text: string; readonly className?: string }[];
}

export interface StrokeCase {
  readonly id: string;
  readonly title: string;
  readonly caption: string;
  readonly samples: readonly StrokeSample[];
}

const plain = (text: string) => [{ text }] as const;
const RICH_RUNS = [
  { text: 'Red', className: 'text-red-600' },
  { text: ' and ', className: '' },
  { text: 'Blue', className: 'text-blue-700' },
] as const;

export const STROKE_CASES: readonly StrokeCase[] = [
  {
    id: 'whole-line',
    title: 'A line, plain and stroked',
    caption: 'The same word in black on slate. The stroked one has a white edge 3 px outside every glyph, and its black is not covered by it.',
    samples: [
      { id: 'whole-line-plain', backdropClassName: WHITE_BACKDROP_CLASS, className: `${BIG} text-black`, runs: plain('Stroke') },
      { id: 'whole-line-stroked', className: `${BIG} text-black`, style: WHITE_STROKE, runs: plain('Stroke') },
      { id: 'whole-line-small', backdropClassName: WHITE_BACKDROP_CLASS, className: 'text-2xl text-black', runs: plain('Stroke') },
    ],
  },
  {
    id: 'tracked',
    title: 'Letter-spaced',
    caption: 'Letter-spacing is drawn a glyph at a time. The stroke is drawn the same way, under the glyphs.',
    samples: [
      { id: 'tracked-plain', backdropClassName: WHITE_BACKDROP_CLASS, className: `${BIG} text-black`, style: { letterSpacing: 3 }, runs: plain('Stroke') },
      { id: 'tracked-stroked', className: `${BIG} text-black`, style: { letterSpacing: 3, ...WHITE_STROKE }, runs: plain('Stroke') },
    ],
  },
  {
    id: 'wrapped',
    title: 'Lines that overlap',
    caption: 'The leading is tighter than the type, so the strokes of one line reach the glyphs of the next. All the strokes go down first.',
    samples: [
      { id: 'wrapped-plain', backdropClassName: WHITE_BACKDROP_CLASS, className: `${BIG} w-[150px] text-black`, style: { lineHeight: 24 }, runs: plain('Wrapped gypsy jumpy lines') },
      {
        id: 'wrapped-stroked', className: `${BIG} w-[150px] text-black`, style: { lineHeight: 24, ...WHITE_STROKE },
        runs: plain('Wrapped gypsy jumpy lines'),
      },
    ],
  },
  {
    id: 'current-color',
    title: 'The text colour',
    caption: 'With no stroke colour the stroke is the colour of the text, so the letters only get heavier.',
    samples: [
      { id: 'current-plain', className: `${BIG} text-yellow-300`, runs: plain('Stroke') },
      { id: 'current-stroked', className: `${BIG} text-yellow-300`, style: CURRENT_COLOR_STROKE, runs: plain('Stroke') },
    ],
  },
  {
    id: 'rich',
    title: 'Runs with colours',
    caption: 'Nested Text takes the stroke of its parent. A white stroke goes round every run; with none, each run is edged in its own colour.',
    samples: [
      { id: 'rich-plain', backdropClassName: WHITE_BACKDROP_CLASS, className: `${BIG} text-black`, runs: RICH_RUNS },
      { id: 'rich-white', className: `${BIG} text-black`, style: WHITE_STROKE, runs: RICH_RUNS },
      { id: 'rich-current', className: `${BIG} text-black`, style: CURRENT_COLOR_STROKE, runs: RICH_RUNS },
    ],
  },
];

/** The place the verifier measures a sample in: the padding of its backdrop, so a stroke has room and nothing else is near. */
export const SAMPLE_PADDING_PX = 16;

function Sample({ sample }: { sample: StrokeSample }) {
  return (
    <View className={`rounded-lg p-4 ${sample.backdropClassName ?? BACKDROP_CLASS}`}>
      <Text testID={sample.id} className={sample.className} style={sample.style}>
        {sample.runs.map((run, index) => (run.className === undefined || run.className === ''
          ? run.text
          : <Text key={`${run.text}-${index}`} className={run.className}>{run.text}</Text>))}
      </Text>
    </View>
  );
}

function Samples({ strokeCase }: { strokeCase: StrokeCase }) {
  return (
    <View testID={`stroke-case-${strokeCase.id}`} className="flex-row flex-wrap items-start gap-3">
      {strokeCase.samples.map(sample => <Sample key={sample.id} sample={sample} />)}
    </View>
  );
}

export interface TextStrokeLabProps {
  /** Show this case alone, bare, as the verifier does; without it the lab shows them all with their captions. */
  case?: string;
}

const INTRO = [
  'A stroke is an edge drawn round the glyphs, under them: white behind black words so they read on any background. WebkitTextStrokeWidth is the width, as in CSS, so half of it lies outside the glyph; WebkitTextStrokeColor is its colour (the text colour when it is not set) and paintOrder: stroke puts it under the fill.',
  'It is painted only: the text takes the same room with a stroke or without, and the stroke may reach past the box. A stroke over the fill (CSS\'s default order) is refused.',
];

export function TextStrokeLab({ case: caseId }: TextStrokeLabProps) {
  if (caseId !== undefined) {
    const found = STROKE_CASES.find(candidate => candidate.id === caseId);
    if (found === undefined) {
      throw new Error(`There is no text stroke case "${caseId}"; the cases are ${STROKE_CASES.map(candidate => candidate.id).join(', ')}`);
    }
    return <Samples strokeCase={found} />;
  }
  return (
    <View testID="text-stroke-lab" className="gap-3 p-1">
      <LabIntro title="Text with a stroke" paragraphs={INTRO} />
      <LabGrid>
        {STROKE_CASES.map(strokeCase => (
          <LabCase key={strokeCase.id} title={strokeCase.title} caption={strokeCase.caption} className={LAB_CARD_CLASS}>
            <Samples strokeCase={strokeCase} />
          </LabCase>
        ))}
      </LabGrid>
    </View>
  );
}
