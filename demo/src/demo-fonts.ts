import { FontFile, ResourceLoader, TextServer, type ReactUiRoot } from 'godot';
import { registerFontFace } from '../../src';
import { DEMO_FACES } from './text-styles-data';

const FONT_DIRECTORY = 'res://fonts';

/**
 * Register the demo's faces with a root: Open Sans (variable, upright and italic) as `sans`, PT Serif (two static faces) as
 * `serif`, JetBrains Mono (variable) as `mono`. The library needs none of them; the text styles lab and its Chrome reference use
 * these files, so a browser and the library draw the same fonts.
 */
export function registerDemoFonts(root: ReactUiRoot): void {
  for (const face of DEMO_FACES) {
    const path = `${FONT_DIRECTORY}/${face.file}`;
    const font = ResourceLoader.load(path);
    if (!(font instanceof FontFile)) throw new Error(`${path} is not a font file`);
    // Chrome places glyphs at quarter pixels at every size; a font that rounds its advances above 20 px (the default) would
    // not match it. This is the owner's choice for its font, not the library's.
    font.subpixelPositioning = TextServer.SubpixelPositioning.SubpixelPositioningOneQuarter;
    font.allowSystemFallback = true;
    registerFontFace(root, { family: face.family, weight: face.weight, style: face.style, font });
  }
}
