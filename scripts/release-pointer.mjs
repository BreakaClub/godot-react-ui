import { POINTER_HISTORY_LENGTH, objectKey } from '../deploy/release-layout.mjs';

/**
 * The pointer's bookkeeping (docs/tracks/web-load.md): which release `current.json` names after a deploy or a rollback, which release a rollback
 * means, and which objects a release needs that the bucket already has. Pure, so the decisions are tested without a bucket.
 */

/** The bucket keys of every object a release's manifest names (a file's own bytes and, where it has one, its brotli copy). */
export function objectKeysOf(manifest) {
  return manifest.files.flatMap(file => [objectKey(file.hash, 'identity'), ...(file.encodings.br === undefined ? [] : [objectKey(file.hash, 'br')])]);
}

/**
 * The pointer after publishing `release`. The history is newest first, holds each release once, and is cut to `POINTER_HISTORY_LENGTH`;
 * publishing the release that is already current changes nothing but the time.
 */
export function pointerAfter({ previous, release, now, workerSha256 }) {
  const earlier = previous === null ? [] : previous.history.filter(entry => entry.release !== release);
  return {
    version: 1,
    release,
    deployedAt: now,
    workerSha256: workerSha256 ?? previous?.workerSha256,
    history: [{ release, deployedAt: now }, ...earlier].slice(0, POINTER_HISTORY_LENGTH),
  };
}

/**
 * The release a rollback names: `requested` when given, else the one that was current before the current one. Throws when there is nothing to roll
 * back to or the release is not one the pointer has named (an id that was never deployed would be a site that serves nothing).
 */
export function rollbackTarget(pointer, requested) {
  if (pointer === null) throw new Error('There is no pointer: nothing has been deployed with this layout yet.');
  if (requested !== undefined) {
    if (!pointer.history.some(entry => entry.release === requested)) {
      throw new Error(`Release ${requested} is not in the pointer's history (${pointer.history.map(entry => entry.release).join(', ')}).`);
    }
    if (requested === pointer.release) throw new Error(`Release ${requested} is already current.`);
    return requested;
  }
  const before = pointer.history.find(entry => entry.release !== pointer.release);
  if (before === undefined) throw new Error('The pointer has named only one release; there is nothing earlier to roll back to.');
  return before.release;
}
