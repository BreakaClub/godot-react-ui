import { FontFile, GArray, OS, ResourceLoader, TextServer, type Font, type ReactUiRoot } from 'godot';
import { installFontSlices, registerFontFace, type FontSliceFailure, type FontSliceHost, type FontSliceLoader, type FontSliceOptions } from '../../src';
import { changed, setFontSlicesOwner } from './font-slices-store';
import { DEMO_FACES } from './text-styles-data';

/**
 * Where the demo's fonts for characters no registered font has are (docs/tracks/font-slices.md). The library takes both addresses from its owner and
 * knows nothing of this host: `font-slices.json` is a file of the release the page is part of (the document's `<base>` makes the address relative to
 * the release), and the slices are content-addressed objects at `/o/<hash>/<name>`, which every release shares.
 */
export const FONT_SLICES_MANIFEST_URL = 'font-slices.json';
export const FONT_SLICES_BASE_URL = '/o/';

const FONT_DIRECTORY = 'res://fonts';
/** `OS.hasFeature` for the Web platform: the only one that has no system fonts to fall back to. */
const WEB_FEATURE = 'web';

/** The demo's registered fonts, the same `FontFile` objects `registerDemoFonts` registered (`ResourceLoader` answers one cached resource per file). */
function registeredFonts(): Array<{ face: (typeof DEMO_FACES)[number]; font: FontFile }> {
  return DEMO_FACES.map(face => {
    const path = `${FONT_DIRECTORY}/${face.file}`;
    const font = ResourceLoader.load(path);
    if (!(font instanceof FontFile)) throw new Error(`${path} is not a font file`);
    return { face, font };
  });
}

/** A font made from a slice's bytes. It throws if the engine did not read them: a font that has none of the slice's characters is not the slice. */
function makeFontFile(bytes: ArrayBuffer, slice: { readonly id: string; readonly ranges: readonly { readonly start: number }[] }): FontFile {
  const font = new FontFile();
  font.data = bytes;
  // As the demo's own fonts: a browser places glyphs at quarter pixels at every size.
  font.subpixelPositioning = TextServer.SubpixelPositioning.SubpixelPositioningOneQuarter;
  const probe = slice.ranges[0]?.start;
  if (probe === undefined) throw new Error(`the slice ${slice.id} lists no characters`);
  if (!font.hasChar(probe)) throw new Error(`the font made from ${slice.id} has no glyph for U+${probe.toString(16).toUpperCase()}, which the manifest says it has`);
  return font;
}

/**
 * What the demo's owner installs on the Web: the loader, with the demo's root as its host. A character no registered font has is asked for by
 * whoever shows it (`requestFonts`); the loader fetches the slice, and the fallback is added to every registered face and the faces registered
 * again, which shapes the text that names them again.
 */
export interface DemoFontSlices {
  readonly loader: FontSliceLoader;
  /** Ask for fonts for the characters of `text` that no registered font has. */
  requestFonts(text: string): void;
  dispose(): void;
}

/** Characters the shaper leaves out, which no font needs a glyph for: format characters, joiners, variation selectors. */
function isIgnorable(codepoint: number): boolean {
  return (codepoint >= 0x200b && codepoint <= 0x200f) || (codepoint >= 0x2028 && codepoint <= 0x202e) || (codepoint >= 0x2060 && codepoint <= 0x206f)
    || (codepoint >= 0xfe00 && codepoint <= 0xfe0f) || codepoint === 0xfeff || codepoint === 0xad || (codepoint >= 0xe0000 && codepoint <= 0xe0fff);
}

export function installDemoFontSlices(
  root: ReactUiRoot, options: { readonly language?: string; readonly manifestUrl?: string; readonly onFailure?: (failure: FontSliceFailure) => void } = {},
): DemoFontSlices | undefined {
  if (!OS.hasFeature(WEB_FEATURE)) return undefined;
  const faces = registeredFonts();
  const reporters = new Set<(codepoints: readonly number[]) => void>();
  const host: FontSliceHost<FontFile> = {
    addFontFallbacks(fonts) {
      for (const { face, font } of faces) {
        const fallbacks = new GArray<Font>();
        const existing = font.fallbacks;
        for (let index = 0; index < existing.size(); index += 1) fallbacks.pushBack(existing.get(index));
        for (const added of fonts) fallbacks.pushBack(added);
        font.fallbacks = fallbacks;
        // Registering a face again shapes the text that names its family again.
        registerFontFace(root, { family: face.family, weight: face.weight, style: face.style, font });
      }
      return '';
    },
    subscribeToMissingGlyphs(listener) {
      reporters.add(listener);
      return () => { reporters.delete(listener); };
    },
  };
  const sans = faces[0]?.font;
  if (sans === undefined) throw new Error('The demo registers no faces');
  const settings: FontSliceOptions<FontFile> = {
    manifestUrl: options.manifestUrl ?? FONT_SLICES_MANIFEST_URL,
    sliceBaseUrl: FONT_SLICES_BASE_URL,
    makeFont: makeFontFile,
    onChange: changed,
    ...options.language === undefined ? {} : { language: options.language },
    ...options.onFailure === undefined ? {} : { onFailure: options.onFailure },
  };
  const loader = installFontSlices(host, settings);
  const installed: DemoFontSlices = {
    loader,
    requestFonts(text) {
      const missing = new Set<number>();
      for (const character of text) {
        const codepoint = character.codePointAt(0);
        if (codepoint !== undefined && codepoint >= 0x20 && !isIgnorable(codepoint) && !sans.hasChar(codepoint)) missing.add(codepoint);
      }
      if (missing.size > 0) for (const report of reporters) report([...missing]);
    },
    dispose() {
      loader.dispose();
      setFontSlicesOwner(undefined, undefined);
    },
  };
  setFontSlicesOwner(installed, options.language);
  return installed;
}
