import type { FontSliceLoader, FontSliceStatus } from '../../src';

/**
 * Where the demo keeps the font slice loader its owner installed (`demo/src/font-fallback.ts`), so the lab (`font-slices-lab.tsx`) can show what it has
 * fetched without the lab owning the loader: the owner installs it at start and the verifier reinstalls it with other options. A component reads
 * `currentFontSlices()` and listens with `subscribeToFontSlices`; the owner calls `changed()` when the loader's state moves.
 */
export interface FontSlicesOwner {
  readonly loader: FontSliceLoader;
  /** Ask for fonts for the characters of `text` that no registered font has. */
  requestFonts(text: string): void;
}

let owner: FontSlicesOwner | undefined;
let language: string | undefined;
const listeners = new Set<() => void>();

export interface FontSlicesView {
  readonly installed: boolean;
  /** The language the loader was told, or undefined when it was told none and the page's is used. */
  readonly language: string | undefined;
  readonly status: FontSliceStatus | undefined;
}

export function setFontSlicesOwner(next: FontSlicesOwner | undefined, configuredLanguage: string | undefined): void {
  owner = next;
  language = configuredLanguage;
  changed();
}

export function currentFontSlices(): FontSlicesView {
  return { installed: owner !== undefined, language, status: owner?.loader.status() };
}

/** The loader installed now, for the owner's inspection surface. */
export function installedFontSlices(): FontSlicesOwner | undefined {
  return owner;
}

export function subscribeToFontSlices(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** The loader's state moved: a manifest, an index or a slice arrived or failed. */
export function changed(): void {
  for (const listener of [...listeners]) listener();
}

/** Ask the installed loader for fonts for the characters of `text` no registered font has; nothing when none is installed (natively the system has them). */
export function requestFontsFor(text: string): void {
  owner?.requestFonts(text);
}
