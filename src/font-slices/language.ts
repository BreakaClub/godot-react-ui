import type { FontSliceFamily } from './manifest';

/**
 * Which family serves Han characters. The characters of Chinese, Japanese and Korean text are largely the same code points drawn with different
 * glyph forms, and which forms are right depends on the language, so the families a character is looked up in are ordered by the language of
 * the text. Browsers choose it the same way: the language of the element, else the language of the page or the browser.
 *
 * This library has no per-element `lang` (no style or prop carries one), so the language is the one the app configures, else the page's:
 * `navigator.language`. An app that shows text in another language than the page's sets it.
 */

/** The subtags of a BCP 47 tag, lowercase; a POSIX locale (`zh_CN`, `ja_JP.UTF-8`) is read as the tag it stands for. */
export function languageSubtags(tag: string): string[] {
  const withoutEncoding = tag.split('.')[0] ?? '';
  return withoutEncoding.toLowerCase().split(/[-_]/u).filter(subtag => subtag !== '');
}

/**
 * How well `family` fits the language: the number of subtags of the longest of its prefixes that begin `subtags`, 0 for none. `zh-tw` fits a family
 * that lists `zh-tw` (2) better than one that lists `zh` (1), and `zh-hant-hk` fits `zh-hant` (2).
 */
export function familyFit(family: FontSliceFamily, subtags: readonly string[]): number {
  let best = 0;
  for (const prefix of family.languages) {
    const parts = languageSubtags(prefix);
    if (parts.length > best && parts.length <= subtags.length && parts.every((part, index) => part === subtags[index])) best = parts.length;
  }
  return best;
}

/**
 * The families in the order a character is looked up in: those that fit `language`, best fit first, then the others in the manifest's order (the
 * order it lists them in is the one to use for a text no family prefers). The sort is stable, so equal fits keep the manifest's order.
 */
export function familiesFor(families: readonly FontSliceFamily[], language: string | undefined): FontSliceFamily[] {
  const subtags = language === undefined ? [] : languageSubtags(language);
  return families
    .map((family, order) => ({ family, order, fit: familyFit(family, subtags) }))
    .sort((left, right) => right.fit - left.fit || left.order - right.order)
    .map(entry => entry.family);
}

/** The language the page is in, as the browser reports it; `undefined` where there is no `navigator` (the native runtimes). */
export function pageLanguage(): string | undefined {
  const navigatorValue: unknown = Reflect.get(globalThis, 'navigator');
  if (typeof navigatorValue !== 'object' || navigatorValue === null) return undefined;
  const language: unknown = Reflect.get(navigatorValue, 'language');
  return typeof language === 'string' && language !== '' ? language : undefined;
}
