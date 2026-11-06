import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { startExportServer } from './web-server.mjs';

/**
 * Which server a Web verifier talks to, and proof that it serves the export that was checked
 * (docs/tracks/verifier-integrity.md, finding 2). `requireFreshWebExport` judges the export on disk; a browser pointed at
 * whatever answers on a port may be shown another one (another checkout, the other engine profile, an older build of the
 * side module under an identical pack).
 *
 * With no `GODOT_REACT_WEB_URL` the verifier serves the export itself, on a free port that only it knows, and closes the
 * server when it is done: nothing else can answer. With one, every file the export's receipt lists is fetched from it and
 * compared with the receipt before the browser opens, and the verifier says which URL it checked.
 */
export const WEB_URL_VARIABLE = 'GODOT_REACT_WEB_URL';
const RECEIPT = 'build-receipt.json';

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Fetch every file of `files` (the receipt's `{ name, bytes, sha256 }` list) from `base` and name each that is not served, is
 * served with another status, or differs. Empty when `base` serves exactly the export.
 */
export async function servedAssetProblems(base, files, fetchAsset = fetch) {
  const problems = [];
  for (const { name, bytes, sha256: expected } of files) {
    let response;
    try {
      response = await fetchAsset(new URL(name, base));
    } catch (error) {
      problems.push(`${name} could not be fetched (${error instanceof Error ? error.message : String(error)})`);
      continue;
    }
    if (response.status !== 200) {
      problems.push(`${name} is answered with status ${response.status}`);
      continue;
    }
    const served = Buffer.from(await response.arrayBuffer());
    if (served.length !== bytes || sha256(served) !== expected) problems.push(`${name} differs from the export (${served.length} bytes served, ${bytes} exported)`);
  }
  return problems;
}

/**
 * The server for the verifier of the export in `directory`: its own, or the one `process.env.GODOT_REACT_WEB_URL` names after
 * every served asset has been compared with the export's receipt. Returns `{ url, close, origin }`.
 */
export async function startVerificationServer(engine, { env = process.env, log = console.log } = {}) {
  const directory = engine.artifactPath(`web-${engine.webMode()}`);
  const named = env[WEB_URL_VARIABLE];
  if (named === undefined || named === '') {
    const own = await startExportServer({ root: directory });
    log(`Serving ${relative(engine.root, directory)} on ${own.url} (a free port, this verifier's own server)`);
    return { url: own.url, own: true, close: own.close };
  }
  const receipt = JSON.parse(readFileSync(join(directory, RECEIPT), 'utf8'));
  if (!Array.isArray(receipt.files) || receipt.files.length === 0) throw new Error(`${join(directory, RECEIPT)} lists no files to compare ${named} with`);
  const problems = await servedAssetProblems(named, receipt.files);
  if (problems.length > 0) {
    throw new Error(`${named} does not serve the ${engine.name} export ${relative(engine.root, directory)} that was checked: ${problems.slice(0, 4).join('; ')}${problems.length > 4 ? ` and ${problems.length - 4} more` : ''}. Stop that server, or unset ${WEB_URL_VARIABLE} to let the verifier serve the export itself.`);
  }
  log(`${named} serves exactly the ${receipt.files.length} files of ${relative(engine.root, directory)} (compared by hash)`);
  return { url: named, own: false, close: async () => {} };
}
