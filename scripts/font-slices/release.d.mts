import type { FontSlicesManifest } from './manifest.mjs';

export interface FontSliceObject {
  /** Key below the bucket prefix: `objects/<hash>` or `objects/<hash>.br`. */
  readonly key: string;
  readonly file: string;
  readonly contentType: string;
  readonly bytes: number;
  readonly kind: 'slice' | 'index' | 'index-br';
}

export interface FontSlicePlan {
  readonly manifest: FontSlicesManifest;
  readonly objects: readonly FontSliceObject[];
  readonly slices: number;
  readonly indexes: number;
  /** The bytes of the slices alone, and of every object the plan holds. */
  readonly sliceBytes: number;
  readonly bytes: number;
}

export function planFontSlices(options: { exportDirectory: string; cacheDirectory: string; directory?: string }): Promise<FontSlicePlan>;
export function fontSliceKeysOf(manifest: FontSlicesManifest, readObjectJson: (key: string) => unknown): string[];
