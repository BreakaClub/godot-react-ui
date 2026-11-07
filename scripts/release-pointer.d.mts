import type { ReleaseManifest, ReleasePointer } from '../deploy/release-layout.mjs';

export function objectKeysOf(manifest: ReleaseManifest): string[];
export function pointerAfter(options: {
  readonly previous: ReleasePointer | null;
  readonly release: string;
  readonly now: string;
  readonly workerSha256?: string | undefined;
}): ReleasePointer;
export function rollbackTarget(pointer: ReleasePointer | null, requested?: string): string;
