import { Font, FontFile, GArray, OS, ResourceLoader, Rid, SystemFont, TextServer, TextServerManager, type ReactUiRoot } from 'godot';
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

/**
 * The system families that have Han characters, in the order they are tried (`SystemFont.fontNames`: the first one the system has is
 * used). The engine does look for a system font for a character no font has (`TextServerAdvanced::_find_system_fallback`), and it asks
 * the platform for one font file. macOS 26 answers for Han with `PingFangUI.ttc`, which is made of `hvgl` outlines that FreeType cannot
 * open, so every glyph of it is missing and the character is a hex box (docs/tracks/missing-glyph.md). These families are ones FreeType
 * reads, found by shaping the character in every family `OS.getSystemFonts()` lists. The Web has no system fonts.
 */
const HAN_SYSTEM_FAMILIES = ['Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', 'WenQuanYi Micro Hei'];

/** The first face registered for each family, to shape text with the way a paragraph of that family is. */
const registeredFonts = new Map<string, FontFile>();
/** The size the characters of {@link fontsOfText} are shaped at. */
const PROBE_FONT_SIZE = 16;

function createHanFallback(): SystemFont | undefined {
  if (!OS.hasFeature('system_fonts')) return undefined;
  const font = new SystemFont();
  font.fontNames = HAN_SYSTEM_FAMILIES;
  return font;
}

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
 * these files, so a browser and the library draw the same fonts. Each of them falls back to the engine's system fonts, and, where
 * the platform has them, to a system family with Han characters (see {@link HAN_SYSTEM_FAMILIES}); `bare` has no fallback.
 */
export function registerDemoFonts(root: ReactUiRoot): void {
  const hanFallback = createHanFallback();
  for (const face of DEMO_FACES) {
    const font = loadFace(face.file);
    font.allowSystemFallback = true;
    if (hanFallback !== undefined) font.fallbacks = GArray.create<Font>([hanFallback]);
    registerFontFace(root, { family: face.family, weight: face.weight, style: face.style, font });
    if (!registeredFonts.has(face.family)) registeredFonts.set(face.family, font);
  }
  // The same file as `sans`, and a font of its own: its settings are not the sans faces'.
  const bare = loadFace(BARE_FACE_FILE, ResourceLoader.CacheMode.CacheModeIgnore);
  bare.allowSystemFallback = false;
  registerFontFace(root, { family: BARE_FAMILY, weight: BARE_FACE_WEIGHTS, style: 'normal', font: bare });
  registeredFonts.set(BARE_FAMILY, bare);
}
