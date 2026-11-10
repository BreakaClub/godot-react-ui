import { Button, Text, TextInput, View, useRootSize } from 'godot-react-ui';
import { LabIntro, LabLimit } from './lab-parts';

/**
 * What the verifier looks at in the raster when the window runs at a device pixel ratio
 * of two. Everything is black or indigo on white, so a pixel's luminance says how much of it is covered.
 *
 * - `hidpi-stems`: a line of lower-case ls. Each is a vertical stem, so one row of the raster crosses its edges and the
 *   steepest step along that row says how crisp the glyph was drawn.
 * - `hidpi-reference`: an empty white strip. The verifier puts a Godot `Label` with the same text, font and size over
 *   it: the engine's own control, drawn the way the engine draws text at this scale.
 * - `hidpi-box`: a rounded box on an integer position, antialiased by `StyleBoxFlat`.
 * - `hidpi-square-border` and `hidpi-round-border`: a one logical pixel border without and with rounded corners.
 *
 * - `hidpi-field`: a text input whose text is a line of stems longer than the field, so it scrolls to follow the caret; the
 *   verifier looks at the caret, a selection and the scrolled text in it.
 * - `hidpi-button`: a rounded button after the field, which Tab focuses, for the focus ring.
 *
 * The page must fit a portrait window (300 logical pixels wide at a content scale of two), and every node of it must stay inside the window
 * (the verifier's geometry gate): the explanation under the samples is a short note in a window that is not tall enough for the whole of it
 * (the verifier's windows at a content scale of two are 400 and 450 logical pixels tall) and the whole of it where there is room (the
 * navigator, the Web verifier's windows). The samples, their order and their test ids are the same either way.
 */
export const HIDPI_STEM_TEXT = 'lllllllllllll';
/** Longer than the field is wide, whatever the font: forty stems. */
export const HIDPI_FIELD_TEXT = 'l'.repeat(40);

/** The root height from which the page has room for the whole explanation under the samples (they take about 250 px). */
const FULL_NOTES_MIN_HEIGHT = 640;

/** The explanation in a window too short for the whole of it: what crisp means and what the empty strip is. */
function ShortNote() {
  return (
    <Text testID="hidpi-notes" className="text-xs text-slate-600">
      Crisp means hard edges at your screen's pixel ratio: each l a solid bar with no grey fringe, borders single sharp lines, the caret a thin bar. The empty strip is where the verifier draws a Godot Label to compare.
    </Text>
  );
}

/** What each sample is and what to look at in it, in the order the page shows them. */
const SAMPLE_NOTES: readonly string[] = [
  "The l's: stems are the easiest letters to judge. Under them is an empty strip, where the verifier draws a Godot Label with the same text and compares the two; you see nothing in it.",
  'The boxes: an indigo rounded box, then a square and a rounded box with a 1 px border. At ratio 2 a 1 px border is two device pixels wide, in a hard line.',
  'The field: tap it for the caret, a thin solid bar. Its text is longer than the field, so moving the caret to the end scrolls it; the stems stay as crisp as at rest.',
  'Press: with a keyboard, press Tab from the field to focus it and see the focus ring, a 2 px stroke with rounded corners.',
  "Hamburgefonstiv 0123: ordinary text to compare with the l's.",
];

/** The whole explanation: what the ratio is, what crisp means, a note on each sample, and what the lab has not measured. */
function FullNotes() {
  return (
    <View testID="hidpi-notes" className="gap-2 pt-2">
      <LabIntro
        title="Crisp at any pixel ratio"
        paragraphs={[
          'A screen has more device pixels than the page has logical ones: one per logical pixel on a plain screen, two on a retina one, 2.625 on a 412 px wide Android phone. The library draws text and rounded edges at that ratio, so stems, borders and corners keep their detail instead of being drawn small and stretched.',
          'Crisp means hard edges: a stem of an l is a solid dark bar with no grey fringe beside it, a border is one sharp line, a rounded corner has no halo and the caret is a thin solid bar. Soft, smeared edges are what a page drawn at one pixel per logical pixel and then scaled up looks like.',
        ]}
      />
      {SAMPLE_NOTES.map(note => <Text key={note} className="text-xs text-slate-600">{note}</Text>)}
      <LabLimit>At a ratio that is not a whole number, such as 2.625, a logical pixel is a fraction of a device pixel and layout rounds positions to whole logical pixels, so an edge can fall between two device pixels and look slightly softer than at 1 or 2. The track measured 1, 1.5 and 2; 2.625 was not measured.</LabLimit>
    </View>
  );
}

export function HidpiLab() {
  const { height } = useRootSize();
  return (
    <View testID="hidpi-page" className="flex-1 gap-2 bg-white p-2">
      <Text testID="hidpi-stems" className="text-2xl text-black">{HIDPI_STEM_TEXT}</Text>
      <View testID="hidpi-reference" className="h-12 w-full bg-white" />
      <View className="flex-row gap-2">
        <View testID="hidpi-box" className="h-10 w-20 rounded-lg bg-indigo-600" />
        <View testID="hidpi-square-border" className="h-10 w-20 border border-slate-900 bg-white" />
        <View testID="hidpi-round-border" className="h-10 w-20 rounded-lg border border-slate-900 bg-white" />
      </View>
      <TextInput
        testID="hidpi-field" defaultValue={HIDPI_FIELD_TEXT}
        className="w-40 rounded-md border border-slate-300 bg-white px-2 py-1 text-base text-black caret-indigo-600"
      />
      <Button testID="hidpi-button" className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1 text-black">Press</Button>
      <Text testID="hidpi-body" className="text-base text-black">Hamburgefonstiv 0123</Text>
      {height >= FULL_NOTES_MIN_HEIGHT ? <FullNotes /> : <ShortNote />}
    </View>
  );
}
