import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { POINTER_KEY, objectKey, parsePointer, parseReleaseManifest, releaseKey } from '../deploy/release-layout.mjs';
import { rejectUnknownArguments } from './arguments.mjs';
import { fontSliceKeysOf, planFontSlices } from './font-slices/release.mjs';
import { MANIFEST_FILE } from './font-slices/manifest.mjs';
import { buildRelease } from './release-bundle.mjs';
import { objectKeysOf, pointerAfter, rollbackTarget } from './release-pointer.mjs';
import { assertReleasePack, planReleaseStageOf } from './release-stage.mjs';

// Publishes the release Web export to react.breaka.club, or rolls the site back.
//
//   node scripts/deploy-web.mjs                  plan: stage and compress the release, print what would be uploaded; touches nothing
//   node scripts/deploy-web.mjs --execute        upload what the bucket lacks, point the site at the new release, deploy the Worker if its source changed
//   node scripts/deploy-web.mjs --releases       list the releases the site has shown, newest first
//   node scripts/deploy-web.mjs --rollback [--execute]          point the site at the release it showed before the current one
//   node scripts/deploy-web.mjs --rollback=<id> [--execute]     point the site at a named release
//   --rebuild builds the release export first; --deploy-worker deploys the Worker even if its source has not changed
//   --check-bucket makes the plan read the bucket (read-only) to say exactly which objects it lacks, instead of listing all of them
//   --local --persist-to=<directory> does all of it against wrangler's local R2 state in that directory instead of the real bucket
//   (for `wrangler dev --persist-to <directory>`); a local run never deploys the Worker and never reaches the network.
//
// Publishing is: objects first, then the release's manifest, then the pointer. The pointer is one object, so the site changes in one atomic write,
// and a release that is half uploaded is never shown. A rollback writes only the pointer.

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
rejectUnknownArguments(argv, {
  flags: ['--execute', '--dry-run', '--rebuild', '--local', '--releases', '--rollback', '--deploy-worker', '--check-bucket'],
  prefixes: ['--persist-to=', '--rollback='],
});

const execute = argv.includes('--execute');
const rebuild = argv.includes('--rebuild');
const checkBucket = argv.includes('--check-bucket');
const local = argv.includes('--local');
const deployWorkerRequested = argv.includes('--deploy-worker');
const listReleases = argv.includes('--releases');
const rollbackArgument = argv.find(argument => argument === '--rollback' || argument.startsWith('--rollback='));
const requestedRelease = rollbackArgument?.startsWith('--rollback=') ? rollbackArgument.slice('--rollback='.length) : undefined;
if (requestedRelease === '') throw new Error('--rollback= needs a release id');
const persistTo = argv.find(argument => argument.startsWith('--persist-to='))?.slice('--persist-to='.length);
if (local && !persistTo) throw new Error('--local needs --persist-to=<directory>: a local run must not touch the shared local R2 state that root `pnpm dev` uses.');
if (!local && persistTo !== undefined) throw new Error('--persist-to= is for --local runs only.');
if (execute && argv.includes('--dry-run')) throw new Error('--execute and --dry-run contradict each other.');

const bucketName = process.env.REACT_DEMO_R2_BUCKET || 'breaka-asset-uploads';
const prefix = (process.env.REACT_DEMO_R2_PREFIX || 'react-demo/v2').replace(/^\/+|\/+$/g, '');
/** How many objects are uploaded at once to the bucket; a local run writes wrangler's local state, which two writers at once corrupt a write of, so one. */
const UPLOAD_CONCURRENCY = 4;
const UPLOAD_ATTEMPTS = 3;
const UPLOAD_RETRY_DELAY_MS = 2000;
/** How many releases back the bucket is asked what it already has: the pointer remembers 20, and a manifest means all its objects are there. */
const RELEASES_CHECKED = 5;
const releaseDirectory = join(root, 'artifacts', 'web-release');
const cacheDirectory = join(root, 'artifacts', 'web-deploy-cache');
const workerConfiguration = resolve(root, 'wrangler.react-demo.jsonc');
const workerSourceFiles = [resolve(root, 'deploy/cloudflare-worker.ts'), resolve(root, 'deploy/release-layout.mjs'), workerConfiguration];

function findWrangler() {
  const candidates = [
    process.env.WRANGLER,
    resolve(root, 'node_modules/.bin/wrangler'),
    resolve('/Users/ben/Development/breaka/breaka-platform/node_modules/.bin/wrangler'),
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return 'wrangler';
}

const wrangler = findWrangler();
const storageFlags = local ? ['--local', '--persist-to', resolve(persistTo)] : ['--remote'];
const where = local ? `local R2 state in ${resolve(persistTo)}` : `R2 bucket "${bucketName}"`;
const MISSING_OBJECT = /does not exist|NoSuchKey|10007/iu;

function runWrangler(args, { allowFailure = false } = {}) {
  const result = spawnSync(wrangler, args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`wrangler ${args.slice(0, 3).join(' ')} failed (exit ${result.status}):\n${result.stderr || result.stdout}`);
  }
  return result;
}

/** `wrangler`, without blocking: the font slices are hundreds of small objects, uploaded a few at a time. Resolves like `runWrangler` with `allowFailure`. */
function runWranglerAsync(args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(wrangler, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', status => resolvePromise({ status, stdout, stderr }));
  });
}

/** Run `tasks` (functions returning promises), at most `limit` at once. The first failure is thrown once the ones running have finished. */
async function runLimited(tasks, limit) {
  let next = 0;
  let failure;
  async function worker() {
    while (failure === undefined && next < tasks.length) {
      const index = next;
      next += 1;
      try {
        await tasks[index]();
      } catch (error) {
        failure ??= error;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  if (failure !== undefined) throw failure;
}

function bucketPath(key) {
  return `${bucketName}/${prefix}/${key}`;
}

/** The parsed JSON of a bucket object, or `null` when the object does not exist. Any other failure is an error. */
function readJson(key) {
  const scratch = mkdtempSync(join(tmpdir(), 'deploy-web-'));
  try {
    const file = join(scratch, 'object.json');
    const result = runWrangler(['r2', 'object', 'get', bucketPath(key), '--file', file, ...storageFlags], { allowFailure: true });
    if (result.status !== 0) {
      if (MISSING_OBJECT.test(`${result.stderr}${result.stdout}`)) return null;
      throw new Error(`Could not read ${bucketPath(key)} (exit ${result.status}):\n${result.stderr || result.stdout}`);
    }
    return JSON.parse(readFileSync(file, 'utf8'));
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

function putFile(key, file, contentType, extra = []) {
  runWrangler(['r2', 'object', 'put', bucketPath(key), '--file', file, '--content-type', contentType, ...extra, ...storageFlags]);
}

/** An upload that fails is tried again: hundreds of small puts will see a dropped connection, and a deploy that stops at one leaves the others to be put again. */
async function putFileAsync(key, file, contentType) {
  for (let attempt = 1; ; attempt += 1) {
    const result = await runWranglerAsync(['r2', 'object', 'put', bucketPath(key), '--file', file, '--content-type', contentType, ...storageFlags]);
    if (result.status === 0) return;
    if (attempt === UPLOAD_ATTEMPTS) throw new Error(`wrangler r2 object put ${bucketPath(key)} failed ${attempt} times (exit ${result.status}):\n${result.stderr || result.stdout}`);
    console.log(`  ${key}: attempt ${attempt} failed (exit ${result.status}), trying again`);
    await new Promise(resolvePromise => setTimeout(resolvePromise, UPLOAD_RETRY_DELAY_MS * attempt));
  }
}

function putJson(key, value) {
  const scratch = mkdtempSync(join(tmpdir(), 'deploy-web-'));
  try {
    const file = join(scratch, 'object.json');
    writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
    putFile(key, file, 'application/json; charset=utf-8', ['--cache-control', 'no-store']);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

function readPointer() {
  const value = readJson(POINTER_KEY);
  return value === null ? null : parsePointer(value);
}

function megabytes(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2).padStart(8);
}

function workerSourceHash() {
  const hash = createHash('sha256');
  for (const file of workerSourceFiles) hash.update(readFileSync(file));
  return hash.digest('hex');
}

function printReleases(pointer) {
  if (pointer === null) {
    console.log(`[deploy-web] ${where}: no pointer yet, so nothing has been published with this layout.`);
    return;
  }
  console.log(`[deploy-web] ${where}, prefix "${prefix}". Releases, newest first (current marked):`);
  for (const entry of pointer.history) console.log(`  ${entry.release === pointer.release ? '*' : ' '} ${entry.release}  ${entry.deployedAt}`);
}

function writePointer(pointer) {
  putJson(POINTER_KEY, pointer);
  console.log(`[deploy-web] The site now shows release ${pointer.release} (pointer written, ${where}).`);
}

function rollback() {
  const pointer = readPointer();
  const target = rollbackTarget(pointer, requestedRelease);
  // The target must be a release the bucket still has: a pointer to a missing manifest is a site that serves a 500.
  const manifest = readJson(releaseKey(target));
  if (manifest === null) throw new Error(`The bucket has no manifest for release ${target}; it cannot be rolled back to.`);
  parseReleaseManifest(manifest);
  console.log(`[deploy-web] Rollback: ${pointer.release} -> ${target} (${where}).`);
  if (!execute) {
    console.log('[deploy-web] DRY RUN. Re-run with --execute to point the site at that release.');
    return;
  }
  writePointer(pointerAfter({ previous: pointer, release: target, now: new Date().toISOString() }));
}

async function publish() {
  if (rebuild || !existsSync(releaseDirectory)) {
    console.log('[deploy-web] Building release web export...');
    const build = spawnSync('node', [resolve(root, 'scripts/build-web.mjs'), '--release'], { cwd: root, stdio: 'inherit', encoding: 'utf8' });
    if (build.status !== 0) throw new Error('Release web export failed');
  }
  const receiptPath = join(releaseDirectory, 'build-receipt.json');
  const receipt = existsSync(receiptPath) ? JSON.parse(readFileSync(receiptPath, 'utf8')) : undefined;
  if (receipt !== undefined && receipt.mode !== 'release') throw new Error(`${releaseDirectory} holds a ${receipt.mode} export; deploy a release export.`);
  // An export made before the release pack was stripped (or a debug export copied here) would publish tens of megabytes nobody runs.
  const pack = assertReleasePack(join(releaseDirectory, 'index.pck'), planReleaseStageOf(join(root, 'demo')));
  console.log(`[deploy-web] The release pack holds ${pack.length} files and no source maps or verification scripts.`);
  console.log('[deploy-web] Staging the release (brotli at quality 11; copies are cached by content, so only changed binaries cost time)...');
  const { manifest, objects: releaseObjects } = await buildRelease({
    sourceDirectory: releaseDirectory,
    cacheDirectory,
    source: receipt === undefined ? {} : { engine: receipt.engine, mode: receipt.mode, contentDigest: receipt.content?.digest },
  });
  // The font slices are not part of the release: the manifest and the licence are release files (listed above), and the indexes and slices are
  // content-addressed objects shared by every release that names them.
  console.log('[deploy-web] Checking the font slices against the manifest the release carries (size and SHA-256 of every file)...');
  const fonts = await planFontSlices({ exportDirectory: releaseDirectory, cacheDirectory });
  const objects = [...releaseObjects, ...fonts.objects];

  console.log(`[deploy-web] Release ${manifest.id} for ${where}, prefix "${prefix}":`);
  console.log(`  ${'file'.padEnd(34)} ${'bytes (MB)'.padStart(10)} ${'brotli (MB)'.padStart(11)}  how a visitor gets it`);
  let rawTotal = 0;
  let sentTotal = 0;
  for (const file of manifest.files) {
    const sent = file.encodings.br ?? file.size;
    rawTotal += file.size;
    sentTotal += sent;
    const how = /\.(wasm|pck)$/u.test(file.path) ? 'redirect to /o/<hash>/, cached for a year, shared by releases' : 'under /r/<release>/, cached for a year';
    console.log(`  ${file.path.padEnd(34)} ${megabytes(file.size)}   ${file.encodings.br === undefined ? '   (as is)' : megabytes(file.encodings.br)}  ${how}`);
  }
  console.log(`  ${'total'.padEnd(34)} ${megabytes(rawTotal)}   ${megabytes(sentTotal)}  (what a first visit transfers, to a browser that accepts br)`);
  const origins = [...new Set(fonts.manifest.families.map(family => `${family.origin.name} ${family.origin.release}`))].join(', ');
  console.log(`\n[deploy-web] Font slices (${origins}; ${fonts.manifest.license.id}), not part of the release; a visitor downloads one only when text needs it:`);
  console.log(`  ${MANIFEST_FILE} and ${fonts.manifest.license.file} are release files (above)`);
  for (const family of fonts.manifest.families) {
    console.log(`  ${family.id.padEnd(16)} ${String(family.slices).padStart(4)} slices ${megabytes(family.sliceBytes)} MB, index ${megabytes(family.index.bytes)} MB`);
  }
  console.log(`  ${'total'.padEnd(16)} ${String(fonts.slices).padStart(4)} slices ${megabytes(fonts.sliceBytes)} MB, ${fonts.indexes} indexes (with brotli copies): ${fonts.objects.length} objects, ${megabytes(fonts.bytes)} MB, at /o/<hash>/<name>, cached for a year, shared by releases`);

  const workerHash = workerSourceHash();
  if (!execute && !checkBucket) {
    console.log(`\n[deploy-web] DRY RUN: nothing was uploaded and the bucket was not read. ${releaseObjects.length} release objects and ${fonts.objects.length} font objects would be put unless the bucket has them, then the manifest, the pointer, then the Worker if needed.`);
    console.log('[deploy-web] --check-bucket reads the bucket (read-only) and lists exactly which objects it lacks. Re-run with --execute to publish.');
    return;
  }

  const previous = readPointer();
  // A manifest in the bucket means all of its objects are there (objects are put before the manifest), so the objects of the releases the pointer
  // remembers need no upload. The same holds for the font slices a release's manifest names: they are read from its font slice manifest and indexes.
  const present = new Set();
  const fontManifestsSeen = new Set();
  const readObject = key => readJson(key);
  for (const entry of previous?.history.slice(0, RELEASES_CHECKED) ?? []) {
    const known = readJson(releaseKey(entry.release));
    if (known === null) continue;
    const earlier = parseReleaseManifest(known);
    for (const key of objectKeysOf(earlier)) present.add(key);
    const fontFile = earlier.files.find(file => file.path === MANIFEST_FILE);
    if (fontFile === undefined || fontManifestsSeen.has(fontFile.hash)) continue;
    fontManifestsSeen.add(fontFile.hash);
    const fontManifest = readJson(objectKey(fontFile.hash, 'identity'));
    if (fontManifest !== null) for (const key of fontSliceKeysOf(fontManifest, readObject)) present.add(key);
  }
  const missing = objects.filter(object => !present.has(object.key));
  const missingFonts = missing.filter(object => fonts.objects.includes(object));
  console.log(`\n[deploy-web] ${missing.length} of ${objects.length} objects are missing from ${where}: ${missing.length - missingFonts.length} of ${releaseObjects.length} release objects, ${missingFonts.length} of ${fonts.objects.length} font objects (${megabytes(missingFonts.reduce((total, object) => total + object.bytes, 0)).trim()} MB).`);
  if (!execute) {
    for (const object of missing.filter(candidate => !fonts.objects.includes(candidate))) console.log(`  ${object.key}  ${megabytes(statSync(object.file).size).trim()} MB`);
    console.log(`[deploy-web] DRY RUN: nothing was uploaded. Re-run with --execute to publish.`);
    return;
  }
  const concurrency = local ? 1 : UPLOAD_CONCURRENCY;
  console.log(`[deploy-web] Uploading (${concurrency} at a time)...`);
  let uploaded = 0;
  await runLimited(missing.map(object => async () => {
    await putFileAsync(object.key, object.file, object.contentType);
    uploaded += 1;
    if (!fonts.objects.includes(object)) console.log(`  ${object.key}  ${megabytes(statSync(object.file).size).trim()} MB`);
    else if (uploaded % 50 === 0 || uploaded === missing.length) console.log(`  ${uploaded} of ${missing.length} objects uploaded`);
  }), concurrency);
  if (readJson(releaseKey(manifest.id)) === null) putJson(releaseKey(manifest.id), manifest);
  else console.log(`[deploy-web] Manifest ${manifest.id} is already in the bucket (the same files were published before).`);

  // The pointer goes before the Worker: the first deploy of this layout must not leave a new Worker with nothing to serve, and the Worker that
  // is still running ignores the pointer. The pointer records the Worker source that was deployed only once the Worker is up, so a failed Worker
  // deploy is tried again by the next run.
  const published = pointerAfter({ previous, release: manifest.id, now: new Date().toISOString() });
  writePointer(published);

  const workerChanged = previous?.workerSha256 !== workerHash;
  if (local) {
    console.log('[deploy-web] Local run: the Worker is not deployed (run `wrangler dev` against this state).');
  } else if (workerChanged || deployWorkerRequested) {
    console.log(`\n[deploy-web] Deploying the Worker for react.breaka.club (${deployWorkerRequested ? 'requested' : 'its source changed since the last deploy'})...`);
    const deployed = spawnSync(wrangler, ['deploy', '-c', workerConfiguration], { cwd: root, stdio: 'inherit', encoding: 'utf8' });
    if (deployed.status !== 0) throw new Error('Failed to deploy the Cloudflare Worker; the release is published, so run the deploy again to retry the Worker');
    putJson(POINTER_KEY, { ...published, workerSha256: workerHash });
  } else {
    console.log('[deploy-web] The Worker source is unchanged since the last deploy; not deploying it (--deploy-worker forces it).');
  }
  console.log(`\n[deploy-web] Published release ${manifest.id}.${local ? '' : ' Roll back with: node scripts/deploy-web.mjs --rollback --execute'}`);
}

mkdirSync(cacheDirectory, { recursive: true });
try {
  if (listReleases) printReleases(readPointer());
  else if (rollbackArgument !== undefined) rollback();
  else await publish();
} catch (error) {
  // What went wrong, in a line the person reading a deploy can act on; a stack trace would only bury it. Nothing is half-done silently: a failed
  // step stops the deploy before the pointer moves.
  console.error(`[deploy-web] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
