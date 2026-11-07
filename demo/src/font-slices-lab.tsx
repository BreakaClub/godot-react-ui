import { useEffect, useState } from 'react';
import { Button, Text, View } from 'godot-react-ui';
import { FONT_SAMPLES, sampleNamed, type FontSample } from './font-slices-data';
import { currentFontSlices, subscribeToFontSlices, type FontSlicesView } from './font-slices-store';

export interface FontSlicesLabProps {
  /** Show this sample alone, bare, as the verifier does; without it the lab has its buttons. */
  sample?: string;
}

const TEXT_CLASS = 'font-sans text-2xl leading-8 text-slate-900';
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

function statusLine(view: FontSlicesView): string {
  if (!view.installed || view.status === undefined) return 'Not installed: characters no font has stay hex boxes (the Web installs it; native uses the system fonts).';
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

function Paragraphs({ sample }: { sample: FontSample }) {
  return (
    <View className="gap-2">
      <Text testID="fs-plain" className={TEXT_CLASS}>{sample.text}</Text>
      <Text testID="fs-spans" className={TEXT_CLASS}>
        {sample.pieces.map(([text, tone], index) => (tone === '' ? text : <Text key={index} className={tone}>{text}</Text>))}
      </Text>
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
  return (
    <View testID="fs-page" className="flex-1 gap-3 bg-white p-4">
      {only === undefined && (
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
      <Paragraphs sample={sample} />
      <Text testID="fs-theme" className={THEME_TEXT_CLASS}>{sample.text}</Text>
      <Text testID="fs-status" className="text-sm text-slate-600">{statusLine(view)}</Text>
    </View>
  );
}
