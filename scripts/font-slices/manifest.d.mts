import type { PlannedSlice, RangePair } from './partition.mjs';

export interface ManifestObject {
  /** `<hash>/<name>`, below the object base URL. */
  path: string;
  bytes: number;
  sha256: string;
}

export interface FamilyOrigin {
  name: string;
  release: string;
  url: string;
  /** The font's own copyright notice (its name record 0). */
  copyright: string;
}

export interface ManifestFamily {
  id: string;
  name: string;
  origin: FamilyOrigin;
  weight: number;
  style: 'normal' | 'italic';
  /** BCP 47 prefixes, lowercase. */
  languages: string[];
  /** Where the family is looked up before the others whatever the language, as `unicode-range` syntax; empty for none. */
  first: string;
  slices: number;
  sliceBytes: number;
  /** The blocks of `COVERAGE_BLOCK` code points in which the family has a character, as `unicode-range` syntax. */
  coverage: string;
  index: ManifestObject;
}

export interface IndexSlice extends ManifestObject {
  id: string;
  glyphs: number;
  partition: string;
  ranges: string;
}

export interface FamilyIndex {
  version: 1;
  family: string;
  slices: IndexSlice[];
}

export interface FontSlicesManifest {
  version: 1;
  license: { id: string; file: string; url: string };
  tools: Record<string, string>;
  families: ManifestFamily[];
}

export interface MadeSlice extends Omit<PlannedSlice, 'included'> {
  language: string;
  bytes: number;
  sha256: string;
  glyphs: number;
}

export interface BuiltIndex {
  family: { language: string; id: string; name: string; languages: string[]; first: string; shared: boolean; tailSize?: number };
  index: FamilyIndex;
  text: string;
  sha256: string;
  name: string;
  bytes: number;
  sliceBytes: number;
  coverage: string;
}

export const MANIFEST_VERSION: 1;
export const COVERAGE_BLOCK: number;
export function coverageOf(codepoints: readonly number[]): string;
export const OBJECT_HASH_LENGTH: number;
export const MANIFEST_FILE: string;
export const LICENSE_FILE: string;
export const FAMILIES: ReadonlyArray<{ language: string; id: string; name: string; languages: string[]; first: string; shared: boolean; tailSize?: number }>;
export function sha256Hex(bytes: Uint8Array): string;
export function objectPath(sha256: string, name: string): string;
export function sliceFileName(sliceId: string): string;
export function indexFileName(familyId: string): string;
export function indexText(index: FamilyIndex): string;
export function buildManifest(options: { origins: Record<string, FamilyOrigin>; tools: Record<string, string>; slices: readonly MadeSlice[] }): { manifest: FontSlicesManifest; indexes: BuiltIndex[] };
export function manifestProblems(manifest: FontSlicesManifest, indexOf: (family: ManifestFamily) => FamilyIndex): string[];
export function manifestObjects(manifest: FontSlicesManifest, indexOf: (family: ManifestFamily) => FamilyIndex): ManifestObject[];

export type { RangePair };
