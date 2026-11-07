/** An encoding the site stores a copy of a file in, besides its own bytes. */
export type StoredEncoding = 'br';

export interface ReleaseFile {
  /** Path inside the release, as the page requests it: `index.pck`. */
  readonly path: string;
  /** Hash of the file's own bytes: its object's address. */
  readonly hash: string;
  readonly type: string;
  /** Size of the file's own bytes. */
  readonly size: number;
  /** Size of each stored encoded copy; an encoding is absent when a copy would not have been smaller. */
  readonly encodings: Readonly<Partial<Record<StoredEncoding, number>>>;
}

export interface ReleaseManifest {
  readonly version: 1;
  readonly id: string;
  readonly createdAt: string;
  /** Where the export came from (engine profile, content digest), for whoever wonders what a release is. */
  readonly source: Readonly<Record<string, unknown>>;
  readonly files: readonly ReleaseFile[];
}

export interface PointerHistoryEntry {
  readonly release: string;
  readonly deployedAt: string;
}

export interface ReleasePointer {
  readonly version: 1;
  /** The release the site shows. */
  readonly release: string;
  readonly deployedAt: string;
  /** Hash of the Worker source the last deploy ran with, so the next deploy knows whether the Worker needs deploying. */
  readonly workerSha256: string | undefined;
  /** Every release the pointer has named, newest first, the current one included. */
  readonly history: readonly PointerHistoryEntry[];
}

export const POINTER_KEY: string;
export const DOCUMENT_PATH: string;
export const RELEASE_URL_PREFIX: string;
export const OBJECT_URL_PREFIX: string;
export const IMMUTABLE_CACHE_CONTROL: string;
export const REVALIDATE_CACHE_CONTROL: string;
export const POINTER_HISTORY_LENGTH: number;
export const MAXIMUM_ENCODED_FRACTION: number;
export const RELEASE_ID_LENGTH: number;
export const OBJECT_HASH_LENGTH: number;
export const RELEASE_ID_PATTERN: RegExp;
export const OBJECT_HASH_PATTERN: RegExp;

export function extensionOf(path: string): string;
export function contentTypeOf(path: string): string;
export function isCompressible(path: string): boolean;
export function redirectsToObject(path: string): boolean;
export function releaseKey(id: string): string;
export function objectKey(hash: string, encoding: 'identity' | StoredEncoding): string;
export function acceptsEncoding(header: string | null | undefined, encoding: string): boolean;
export function parseReleaseManifest(value: unknown): ReleaseManifest;
export function parsePointer(value: unknown): ReleasePointer;
