import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { FONT_SLICES_DIRECTORY, exportedFontSliceProblems } from './font-slices/paths.mjs';
import { startExportServer } from './web-server.mjs';

/**
 * Which server a Web verifier talks to, and proof that it serves the export that was checked.
 * `requireFreshWebExport` judges the export on disk; a browser pointed at
 * whatever answers on a port may be shown another one (another checkout, the other engine profile, an older build of the
 * side module under an identical pack).
 *
 * With no `GODOT_REACT_WEB_URL` the verifier serves the export itself, on a free port that only it knows, and closes the
 * server when it is done: nothing else can answer. With one, every file the export's receipt lists is fetched from it and
 * compared with the receipt before the browser opens, and the verifier says which URL it checked.
 */
export const WEB_URL_VARIABLE = 'GODOT_REACT_WEB_URL';
const RECEIPT = 'build-receipt.json';
/** How long one file of a named server may take to arrive, headers and body: a server that accepts the connection and never answers must not hang the verifier. */
export const SERVED_ASSET_TIMEOUT_MS = 30_000;

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Fetch every file of `files` (the receipt's `{ name, bytes, sha256 }` list) from `base` and name each that is not served, is
 * served with another status, or differs. Empty when `base` serves exactly the export. Each file gets `timeoutMs` (its
 * request and its body, through the signal `fetchAsset` is given); one that is not served in time is a problem like any other.
 */
export async function servedAssetProblems(base, files, fetchAsset = fetch, timeoutMs = SERVED_ASSET_TIMEOUT_MS) {
  const problems = [];
  for (const { name, bytes, sha256: expected } of files) {
    let served;
    try {
      const response = await fetchAsset(new URL(name, base), { signal: AbortSignal.timeout(timeoutMs) });
      if (response.status !== 200) {
        problems.push(`${name} is answered with status ${response.status}`);
        continue;
      }
      served = Buffer.from(await response.arrayBuffer());
    } catch (error) {
      problems.push(`${name} could not be fetched (${error instanceof Error ? error.message : String(error)})`);
      continue;
    }
    if (served.length !== bytes || sha256(served) !== expected) problems.push(`${name} differs from the export (${served.length} bytes served, ${bytes} exported)`);
  }
  return problems;
}

/**
 * The evidence every Web verifier leaves in `output` when it is done, passed or not: `report.json` and `browser.log` (the
 * page's console, one line per message). Stamps `report.finishedAt`.
 */
export async function writeEvidence(output, report, now = () => new Date()) {
  report.finishedAt = now().toISOString();
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await writeFile(join(output, 'browser.log'), report.console.map((entry) => `[${entry.type}] ${entry.text}`).join('\n') + '\n');
}

/**
 * The line a Web verifier prints when it passed, `marker` and a JSON summary, or `undefined` if it did not pass (a failed run
 * has printed its own failure line, and no line may say "passed" for it). `details` are added to the summary.
 */
export function passedLine(marker, report, output, details = {}) {
  if (!report.passed) return undefined;
  return `${marker} ${JSON.stringify({ assertions: report.assertions.length, captures: report.captures.length, ...details, report: join(output, 'report.json') })}`;
}

/**
 * The server for the verifier of the export in `directory`: its own, or the one `process.env.GODOT_REACT_WEB_URL` names after
 * every served asset has been compared with the export's receipt. Returns `{ url, close, origin }`.
 */
export async function startVerificationServer(engine, { env = process.env, log = console.log, fontSlices = FONT_SLICES_DIRECTORY } = {}) {
  const directory = engine.artifactPath(`web-${engine.webMode()}`);
  const named = env[WEB_URL_VARIABLE];
  const fontSliceProblems = exportedFontSliceProblems(directory, fontSlices);
  if (fontSliceProblems.length > 0) throw new Error(`The ${engine.name} export ${relative(engine.root, directory)} and the font slices disagree: ${fontSliceProblems.join('; ')}. Run \`pnpm build:web --export-only${engine.webMode() === 'release' ? ' --release' : ''}\` ${engine.name === 'breaka' ? '' : `--engine=${engine.name} `}after the slice build.`);
  if (named === undefined || named === '') {
    const own = await startExportServer({ root: directory, objects: join(fontSlices, 'o') });
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
