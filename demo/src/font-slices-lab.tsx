import { useEffect, useState } from 'react';
import { Button, Text, View } from 'godot-react-ui';
import { FONT_SAMPLES, sampleNamed, type FontSample } from './font-slices-data';
import { LabIntro } from './lab-parts';
import { currentFontSlices, subscribeToFontSlices, type FontSlicesView } from './font-slices-store';

export interface FontSlicesLabProps {
  /** Show this sample alone, bare, as the verifier does; without it the lab has its buttons. */
  sample?: string;
}

const TEXT_CLASS = 'font-sans text-2xl leading-8 text-slate-900';
/**
 * The lab on its own (not the verifier's bare page) lets a word wider than the window break where it must. A line of Chinese or Japanese has no
 * spaces, and a Text wider than its box is cut at the box, so on a phone the end of the line would be missing. The verifier's page is measured
 * against Chrome as it is, so it does not get this.
 */
const WRAPPING_CLASS = 'break-words';
const BYTES_PER_KIBIBYTE = 1024;

/** The loader's state as the lab shows it, and re-read whenever the loader says it moved. */
function useFontSlices(): FontSlicesView {
  const [view, setView] = useState<FontSlicesView>(currentFontSlices);
  useEffect(() => {
    setView(currentFontSlices());
    return subscribeToFontSlices(() => { setView(currentFontSlices()); });
  }, []);
  return view;
}

/** What a visitor is told about the lab, above the buttons. */
const INTRO = [
  'Characters that none of the demo\'s fonts has (Chinese, Japanese, Korean, emoji) need a fallback font. On the Web a page has no system fonts, so it downloads a slice of a Noto font that holds the characters, the first time they appear, and shapes the text again. Until the slice arrives the characters are boxes. Nothing is downloaded unless such text appears.',
  'Natively the system supplies the font (macOS, Windows, Linux, Android and iOS have system fonts), so nothing is downloaded and the status line says no loader is installed. This is a browser\'s font fallback, done by the library: Google Fonts serves CJK as many small files in the same way. Pick a text below.',
];

/** What each sample shows. */
interface SampleNote {
  readonly id: string;
  readonly note: string;
}

export const SAMPLE_NOTES: readonly SampleNote[] = [
  { id: 'simplified', note: 'Simplified Chinese. The red words are in a coloured span.' },
  { id: 'traditional', note: 'Traditional Chinese: the same sentence in Traditional forms, which another font family draws.' },
  { id: 'japanese', note: 'Japanese, which mixes kana and Han characters. It needs more slices than the Chinese lines.' },
  { id: 'korean', note: 'Korean, in Hangul.' },
  { id: 'emoji', note: 'Colour emoji among Latin text, with a skin tone sequence and a flag. The emoji font is larger, so on a slow connection they take longer to appear.' },
  { id: 'emoji-only', note: 'Emoji alone, in the same three lines.' },
  { id: 'mixed', note: 'Latin, Japanese, Korean and an emoji in one line: each script comes from the font that has it.' },
  { id: 'unmapped', note: 'A private use character no font has. It stays a box, nothing is downloaded for it, and the browser console gets a warning.' },
  { id: 'latin', note: 'Latin only: every registered font has these characters, so this text asks for nothing. The status line counts what earlier samples fetched.' },
];

function noteOf(sample: FontSample): string {
  const found = SAMPLE_NOTES.find(candidate => candidate.id === sample.id);
  if (found === undefined) throw new Error(`The font fallback lab has no note for the sample "${sample.id}"`);
  return found.note;
}

const LINE_CAPTIONS = {
  plain: 'Plain text in the font-sans family.',
  spans: 'The same text with the red words in a coloured span, which is drawn glyph by glyph. It must show the same glyphs, in red.',
  theme: 'The same text with no font family, so in the engine\'s own theme font, which gets the fallback font as well.',
};
const STATUS_NOTE = 'The manifest lists the font families, an index lists one family\'s slices, and a slice is a small piece of a Noto font that holds some characters. '
  + 'The line counts what this page has fetched. Showing the same text again fetches nothing more. The font for a Han character that Chinese, Japanese and Korean share depends on the language the loader is told: the page\'s own language unless the app sets one.';

function statusLine(view: FontSlicesView): string {
  if (!view.installed || view.status === undefined) return 'No download loader is installed here. Natively the system\'s fonts supply characters no registered font has, and a character no font has stays a hex box.';
  const { status } = view;
  const loaded = status.slicesLoaded.length;
  const parts = [
    `manifest ${status.manifest}`,
    `${status.indexesLoaded.length} ${status.indexesLoaded.length === 1 ? 'index' : 'indexes'}`,
    `${loaded} ${loaded === 1 ? 'slice' : 'slices'} added, ${status.slicesLoading} loading, ${status.slicesFailed.length} failed`,
    `${status.requests} ${status.requests === 1 ? 'request' : 'requests'}, ${(status.bytesFetched / BYTES_PER_KIBIBYTE).toFixed(1)} KiB`,
  ];
  return `${parts.join('; ')}${view.language === undefined ? '' : `; language ${view.language}`}`;
}

/** The text of a lab with no font family: it is drawn with the root's own theme font, which has no fonts of the lab's behind it until the root puts them there. */
const THEME_TEXT_CLASS = 'text-2xl leading-8 text-slate-900';

const CAPTION_CLASS = 'text-xs text-slate-500';

/** The plain line and the one with a span. `explain` puts a caption under each: the verifiers show the lab without, and measure what is left. */
function Paragraphs({ sample, explain }: { sample: FontSample; explain: boolean }) {
  const textClass = explain ? `${TEXT_CLASS} ${WRAPPING_CLASS}` : TEXT_CLASS;
  return (
    <View className="gap-2">
      <Text testID="fs-plain" className={textClass}>{sample.text}</Text>
      {explain ? <Text className={CAPTION_CLASS}>{LINE_CAPTIONS.plain}</Text> : null}
      <Text testID="fs-spans" className={textClass}>
        {sample.pieces.map(([text, tone], index) => (tone === '' ? text : <Text key={index} className={tone}>{text}</Text>))}
      </Text>
      {explain ? <Text className={CAPTION_CLASS}>{LINE_CAPTIONS.spans}</Text> : null}
    </View>
  );
}

/**
 * Font fallback (docs/tracks/font-slices.md): text with characters no registered font has, which a Web page draws with a font it downloads for them when
 * they first appear, in plain text and in a coloured span. Until the font has arrived the characters are the engine's hex boxes; then the text is shaped
 * again and laid out with real glyphs. A sample that needs nothing downloaded (Latin only) makes no request. The status line is the loader's.
 */
export function FontSlicesLab({ sample: only }: FontSlicesLabProps) {
  const [chosen, setChosen] = useState(FONT_SAMPLES[0]?.id ?? '');
  const view = useFontSlices();
  const sample = sampleNamed(only ?? chosen);
  // With a `sample` the verifier shows the lab bare and measures it against Chrome: only the lab on its own explains itself.
  const explain = only === undefined;
  return (
    <View testID="fs-page" className="flex-1 gap-3 bg-white p-4">
      {explain && <LabIntro title="Fonts that arrive when they are needed" paragraphs={INTRO} />}
      {explain && (
        <View className="flex-row flex-wrap gap-2">
          {FONT_SAMPLES.map(item => (
            <Button
              key={item.id} testID={`fs-pick-${item.id}`} onClick={() => { setChosen(item.id); }}
              className={`rounded-lg border px-3 py-1 ${item.id === chosen ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-900'}`}
            >
              {item.label}
            </Button>
          ))}
        </View>
      )}
      {explain && <Text className="text-sm text-slate-600">{noteOf(sample)}</Text>}
      <Paragraphs sample={sample} explain={explain} />
      <Text testID="fs-theme" className={explain ? `${THEME_TEXT_CLASS} ${WRAPPING_CLASS}` : THEME_TEXT_CLASS}>{sample.text}</Text>
      {explain && <Text className={CAPTION_CLASS}>{LINE_CAPTIONS.theme}</Text>}
      <Text testID="fs-status" className="text-sm text-slate-600">{statusLine(view)}</Text>
      {explain && <Text className={CAPTION_CLASS}>{STATUS_NOTE}</Text>}
    </View>
  );
}
