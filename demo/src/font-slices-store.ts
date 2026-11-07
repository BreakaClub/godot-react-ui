import type { FontSliceLoader, FontSliceStatus } from '../../src';

/**
 * Where the demo keeps the font slice loader its owner installed (`demo/src/font-fallback.ts`), so the lab (`font-slices-lab.tsx`) can show what it has
 * fetched without the lab owning the loader: the owner installs it at start and the verifier reinstalls it with other options. A component reads
 * `current()` and listens with `subscribe`; the owner calls `changed()` when the loader's state moves.
 */
let loader: FontSliceLoader | undefined;
let language: string | undefined;
const listeners = new Set<() => void>();

export interface FontSlicesView {
  readonly installed: boolean;
  /** The language the loader was told, or the page's when it was told none. */
  readonly language: string | undefined;
  readonly status: FontSliceStatus | undefined;
}

export function setFontSlicesLoader(next: FontSliceLoader | undefined, configuredLanguage: string | undefined): void {
  loader = next;
  language = configuredLanguage;
  changed();
}

export function currentFontSlices(): FontSlicesView {
  return { installed: loader !== undefined, language, status: loader?.status() };
}

export function subscribeToFontSlices(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** The loader's state moved: a manifest, an index or a slice arrived or failed. */
export function changed(): void {
  for (const listener of [...listeners]) listener();
}
