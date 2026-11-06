import { Text, View } from 'godot-react-ui';

/**
 * Phase H1 (docs/tracks/hidpi.md): what the verifier looks at in the raster when the window runs at a device pixel ratio
 * of two. Everything is black or indigo on white, so a pixel's luminance says how much of it is covered.
 *
 * - `hidpi-stems`: a line of lower-case ls. Each is a vertical stem, so one row of the raster crosses its edges and the
 *   steepest step along that row says how crisp the glyph was drawn.
 * - `hidpi-reference`: an empty white strip. The verifier puts a Godot `Label` with the same text, font and size over
 *   it: the engine's own control, drawn the way the engine draws text at this scale.
 * - `hidpi-box`: a rounded box on an integer position, antialiased by `StyleBoxFlat`.
 * - `hidpi-square-border` and `hidpi-round-border`: a one logical pixel border without and with rounded corners.
 *
 * The page must fit a portrait window (300 logical pixels wide at a content scale of two).
 */
export const HIDPI_STEM_TEXT = 'lllllllllllll';

export function HidpiLab() {
  return (
    <View testID="hidpi-page" className="flex-1 gap-2 bg-white p-2">
      <Text testID="hidpi-stems" className="text-2xl text-black">{HIDPI_STEM_TEXT}</Text>
      <View testID="hidpi-reference" className="h-12 w-full bg-white" />
      <View className="flex-row gap-2">
        <View testID="hidpi-box" className="h-10 w-20 rounded-lg bg-indigo-600" />
        <View testID="hidpi-square-border" className="h-10 w-20 border border-slate-900 bg-white" />
        <View testID="hidpi-round-border" className="h-10 w-20 rounded-lg border border-slate-900 bg-white" />
      </View>
      <Text testID="hidpi-body" className="text-base text-black">Hamburgefonstiv 0123</Text>
    </View>
  );
}
