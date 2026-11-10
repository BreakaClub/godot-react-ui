/**
 * Fonts for characters no registered font has, downloaded when text first needs them.
 *
 * A browser draws a character its page's fonts lack with a font from the system. A WebGL page cannot read the system's fonts, so on the Web the same
 * is done with fonts the app hosts: the root reports the characters its text has no glyph for, this module finds the font file (a slice of Noto Sans
 * CJK, by unicode-range, as Google Fonts serves them) that holds them, downloads it, and adds it as a fallback, and the root shapes the text again
 * with real glyphs. Nothing is downloaded unless such text appears. Natively the engine uses the system's fonts and none of this runs.
 */
import { createFontSliceLoader, type FontFallbackHost, type FontSliceLoader, type FontSliceOptions } from './loader';

export { createFontSliceLoader } from './loader';
export type {
  FontFallbackHost, FontSliceFailure, FontSliceFailureKind, FontSliceFetch, FontSliceLoader, FontSliceOptions, FontSliceResponse, FontSliceStatus,
} from './loader';
export { FONT_SLICE_MANIFEST_VERSION, parseCodepointRanges, parseFontSliceIndex, parseFontSliceManifest } from './manifest';
export type { CodepointRange, FontSlice, FontSliceFamily, FontSliceIndex, FontSliceManifest, FontSliceObject, FontSliceOrigin } from './manifest';
export { familiesFor, familyFit, languageSubtags, pageLanguage } from './language';

/** What a root offers the loader: the characters it has no glyph for, and a place to put the font that has them. */
export interface FontSliceHost<Font> extends FontFallbackHost<Font> {
  /**
   * Call `listener` with the code points text was shaped without a glyph for, whenever the root finds some. Returns a function that stops the calls.
   * A root reports each character once, until a font is added.
   */
  subscribeToMissingGlyphs(listener: (codepoints: readonly number[]) => void): () => void;
}

/**
 * Download fonts for the characters `host`'s text is missing, as they are found, and add them to `host`. Returns the loader: `status()` says what
 * has been fetched and what failed, `whenIdle()` resolves when everything asked for has been served or has failed, `dispose()` stops it.
 *
 * Nothing is requested until the host reports a missing character. A failure (a manifest or a slice that cannot be fetched, or that the engine cannot
 * read) leaves the text as boxes, goes to `onFailure` (the console by default) and is kept in `status().failures`.
 */
export function installFontSlices<Font>(host: FontSliceHost<Font>, options: FontSliceOptions<Font>): FontSliceLoader {
  const loader = createFontSliceLoader(host, options);
  const stop = host.subscribeToMissingGlyphs(codepoints => { loader.request(codepoints); });
  return {
    request: codepoints => { loader.request(codepoints); },
    status: () => loader.status(),
    whenIdle: () => loader.whenIdle(),
    dispose: () => {
      stop();
      loader.dispose();
    },
  };
}
