import type { ReleaseManifest } from '../deploy/release-layout.mjs';

export interface ReleaseObject {
  /** Key below the bucket prefix. */
  readonly key: string;
  /** File holding the bytes. */
  readonly file: string;
  readonly contentType: string;
}

export interface BuiltRelease {
  readonly manifest: ReleaseManifest;
  readonly manifestKey: string;
  readonly objects: readonly ReleaseObject[];
}

export function hashBytes(bytes: Uint8Array): string;
export function releaseIdOf(files: ReadonlyArray<{ readonly path: string; readonly hash: string }>): string;
export function injectBase(html: string, id: string): string;
export function buildRelease(options: {
  readonly sourceDirectory: string;
  readonly cacheDirectory: string;
  readonly source?: Readonly<Record<string, unknown>>;
  readonly createdAt?: string;
}): Promise<BuiltRelease>;
