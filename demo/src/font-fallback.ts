import { Callable, FontFile, GArray, OS, TextServer, type ReactUiRoot } from 'godot';
import { installFontSlices, type FontSliceFailure, type FontSliceHost, type FontSliceLoader, type FontSliceOptions } from '../../src';
import { changed, setFontSlicesOwner } from './font-slices-store';

/**
 * Where the demo's fonts for characters no registered font has are (docs/tracks/font-slices.md). The library takes both addresses from its owner and
 * knows nothing of this host: `font-slices.json` is a file of the release the page is part of (the document's `<base>` makes the address relative to
 * the release), and the slices are content-addressed objects at `/o/<hash>/<name>`, which every release shares.
 *
 * Natively there is nothing to install: the root looks for a system font FreeType can read when text first has a character no font has, and the platform
 * has system fonts. The Web has none, so the root tells this loader of the characters, it downloads a slice, and the root adds it behind its fonts.
 */
export const FONT_SLICES_MANIFEST_URL = 'font-slices.json';
export const FONT_SLICES_BASE_URL = '/o/';

/** `OS.hasFeature` for the Web platform: the only one that has no system fonts to fall back to. */
const WEB_FEATURE = 'web';

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

/** What the demo's owner holds: the loader, and the way to take it away. */
export interface DemoFontSlices {
  readonly loader: FontSliceLoader;
  dispose(): void;
}

/** The root as the loader's host: it tells of the characters no font has, and takes the fonts that have them. */
function hostOf(root: ReactUiRoot): FontSliceHost<FontFile> {
  return {
    addFontFallbacks(fonts) {
      const list = new GArray();
      for (const font of fonts) list.pushBack(font);
      return root.addFontFallbacks(list);
    },
    subscribeToMissingGlyphs(listener) {
      const callable = Callable.create(() => {
        const taken = root.takeMissingCodepoints();
        listener(Array.from({ length: taken.size() }, (_, index) => taken.get(index)));
      });
      // A GodotJS Callable holds its function strongly, so it is disconnected when the loader is disposed.
      root.missingGlyphsReady.connect(callable);
      root.setMissingGlyphReporting(true);
      return () => {
        root.setMissingGlyphReporting(false);
        root.missingGlyphsReady.disconnect(callable);
      };
    },
  };
}

export function installDemoFontSlices(
  root: ReactUiRoot, options: { readonly language?: string; readonly manifestUrl?: string; readonly onFailure?: (failure: FontSliceFailure) => void } = {},
): DemoFontSlices | undefined {
  if (!OS.hasFeature(WEB_FEATURE)) return undefined;
  const settings: FontSliceOptions<FontFile> = {
    manifestUrl: options.manifestUrl ?? FONT_SLICES_MANIFEST_URL,
    sliceBaseUrl: FONT_SLICES_BASE_URL,
    makeFont: makeFontFile,
    onChange: changed,
    ...options.language === undefined ? {} : { language: options.language },
    ...options.onFailure === undefined ? {} : { onFailure: options.onFailure },
  };
  const loader = installFontSlices(hostOf(root), settings);
  const installed: DemoFontSlices = {
    loader,
    dispose() {
      loader.dispose();
      setFontSlicesOwner(undefined, undefined);
    },
  };
  setFontSlicesOwner(installed, options.language);
  return installed;
}
