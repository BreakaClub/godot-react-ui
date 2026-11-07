import { FontFile, ResourceLoader, Rid, SystemFont, TextServer, TextServerManager, type ReactUiRoot } from 'godot';
import { registerFontFace } from '../../src';
import { DEMO_FACES } from './text-styles-data';

const FONT_DIRECTORY = 'res://fonts';

/**
 * The family of a face made to have no fallback at all: Open Sans, which has no private-use characters, with the engine's system
 * fallback off and nothing else behind it. A character it lacks is missing from every font the text server can reach on any machine,
 * so the text server draws its hex box (the rich text lab's `glyphs` page).
 */
export const BARE_FAMILY = 'bare';
const BARE_FACE_FILE = 'OpenSans-Variable.ttf';
const BARE_FACE_WEIGHTS: [number, number] = [300, 800];

/** The first face registered for each family, to shape text with the way a paragraph of that family is. */
const registeredFonts = new Map<string, FontFile>();
/** The size the characters of {@link fontsOfText} are shaped at. */
const PROBE_FONT_SIZE = 16;

/**
 * The font each character of `text` is drawn with when a paragraph of `family` shapes it, as the text server decides: the name of the
 * font (the face itself, a fallback of it, or a system font the engine found), or `undefined` for a character no font has, which is
 * drawn as a hex box. A character that takes more than one glyph or none is not meant for this.
 */
export function fontsOfText(family: string, text: string): (string | undefined)[] {
  const server = TextServerManager.getPrimaryInterface();
  const font = registeredFonts.get(family);
  if (server === null) throw new Error('There is no primary text server');
  if (font === undefined) throw new Error(`No face of ${family} is registered`);
  const shaped = server.createShapedText();
  try {
    if (!server.shapedTextAddString(shaped, text, font.getRids(), PROBE_FONT_SIZE)) throw new Error(`The text server did not take ${JSON.stringify(text)}`);
    return Array.from(server.shapedTextGetGlyphs(shaped), (glyph) => {
      const rid = glyph.getKeyed('font_rid');
      if (!(rid instanceof Rid)) throw new Error(`A glyph of ${JSON.stringify(text)} has a font_rid that is not a Rid`);
      return rid.isValid() ? server.fontGetName(rid) : undefined;
    });
  } finally {
    server.freeRid(shaped);
  }
}

/**
 * The names of the fonts behind the first face registered for `family`, in order: what the face had of its own and what the library added since
 * (docs/tracks/font-slices.md). A system font is named by the family it was asked for, so that naming it does not read its file.
 */
export function fallbackNamesOf(family: string): string[] {
  const font = registeredFonts.get(family);
  if (font === undefined) throw new Error(`No face of ${family} is registered`);
  return Array.from({ length: font.fallbacks.size() }, (_, index) => {
    const fallback = font.fallbacks.get(index);
    if (!(fallback instanceof SystemFont)) return fallback.getFontName();
    return Array.from({ length: fallback.fontNames.size() }, (__, name) => fallback.fontNames.get(name)).join('|');
  });
}

/** The font of `file`. A load answers the one cached resource of a file, so a face that needs settings of its own is loaded again, uncached. */
function loadFace(file: string, cache = ResourceLoader.CacheMode.CacheModeReuse): FontFile {
  const path = `${FONT_DIRECTORY}/${file}`;
  const font = ResourceLoader.load(path, '', cache);
  if (!(font instanceof FontFile)) throw new Error(`${path} is not a font file`);
  // Chrome places glyphs at quarter pixels at every size; a font that rounds its advances above 20 px (the default) would
  // not match it. This is the owner's choice for its font, not the library's.
  font.subpixelPositioning = TextServer.SubpixelPositioning.SubpixelPositioningOneQuarter;
  return font;
}

/**
 * Register the demo's faces with a root: Open Sans (variable, upright and italic) as `sans`, PT Serif (two static faces) as
 * `serif`, JetBrains Mono (variable) as `mono`. The library needs none of them; the text styles lab and its Chrome reference use
 * these files, so a browser and the library draw the same fonts. Each of them falls back to the engine's system fonts; for the
 * characters those do not have, the library adds a font when the text that has them first appears (a system font FreeType can read,
 * or on the Web a downloaded slice: docs/tracks/font-slices.md), and nothing is read until then. `bare` has no fallback at all.
 */
export function registerDemoFonts(root: ReactUiRoot): void {
  for (const face of DEMO_FACES) {
    const font = loadFace(face.file);
    font.allowSystemFallback = true;
    registerFontFace(root, { family: face.family, weight: face.weight, style: face.style, font });
    if (!registeredFonts.has(face.family)) registeredFonts.set(face.family, font);
  }
  // The same file as `sans`, and a font of its own: its settings are not the sans faces'.
  const bare = loadFace(BARE_FACE_FILE, ResourceLoader.CacheMode.CacheModeIgnore);
  bare.allowSystemFallback = false;
  registerFontFace(root, { family: BARE_FAMILY, weight: BARE_FACE_WEIGHTS, style: 'normal', font: bare });
  registeredFonts.set(BARE_FAMILY, bare);
}
