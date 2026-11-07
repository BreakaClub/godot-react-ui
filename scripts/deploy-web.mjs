import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rejectUnknownArguments } from './arguments.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
rejectUnknownArguments(argv, { flags: ['--execute', '--dry-run', '--rebuild'] });

const execute = argv.includes('--execute');
const rebuild = argv.includes('--rebuild');

const bucketName = process.env.REACT_DEMO_R2_BUCKET || 'breaka-asset-uploads';
const prefix = (process.env.REACT_DEMO_R2_PREFIX || 'react-demo/current').replace(/^\/+|\/+$/g, '');
const distDir = join(root, 'artifacts', 'web-release');

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

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.wasm', 'application/wasm'],
  ['.pck', 'application/octet-stream'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

function getContentType(filePath) {
  return contentTypes.get(extname(filePath).toLowerCase()) || 'application/octet-stream';
}

if (rebuild || !existsSync(distDir)) {
  console.log('[deploy-web] Building release web export...');
  const buildResult = spawnSync('node', [resolve(root, 'scripts/build-web.mjs'), '--release'], {
    cwd: root,
    stdio: 'inherit',
    encoding: 'utf8',
  });
  if (buildResult.status !== 0) {
    throw new Error('Release web export failed');
  }
}

const files = readdirSync(distDir)
  .filter(f => statSync(join(distDir, f)).isFile())
  .sort();

console.log(`[deploy-web] Target: R2 bucket "${bucketName}", prefix "${prefix}"`);
console.log(`[deploy-web] Found ${files.length} release files to upload in ${distDir}:`);
for (const f of files) {
  const full = join(distDir, f);
  const sizeMb = (statSync(full).size / (1024 * 1024)).toFixed(2);
  const contentType = getContentType(full);
  console.log(`  - ${f.padEnd(35)} ${sizeMb.padStart(7)} MB  (${contentType})`);
}

if (!execute) {
  console.log('\n[deploy-web] DRY RUN complete. To upload to R2 and deploy the Cloudflare Worker, re-run with --execute.');
  process.exit(0);
}

console.log('\n[deploy-web] Executing upload to R2...');
for (const file of files) {
  const localPath = join(distDir, file);
  const objectKey = `${prefix}/${file}`;
  const contentType = getContentType(localPath);
  console.log(`Uploading ${objectKey}...`);
  const putResult = spawnSync(wrangler, [
    'r2', 'object', 'put', `${bucketName}/${objectKey}`,
    '--file', localPath,
    '--content-type', contentType,
    '--remote',
  ], {
    cwd: root,
    stdio: 'inherit',
    encoding: 'utf8',
  });
  if (putResult.status !== 0) {
    throw new Error(`Failed to upload ${objectKey} to R2`);
  }
}

console.log('\n[deploy-web] Deploying Cloudflare Worker for react.breaka.club...');
const deployResult = spawnSync(wrangler, [
  'deploy',
  '-c', resolve(root, 'wrangler.react-demo.jsonc'),
], {
  cwd: root,
  stdio: 'inherit',
  encoding: 'utf8',
});

if (deployResult.status !== 0) {
  throw new Error('Failed to deploy Cloudflare worker');
}

console.log('\n[deploy-web] Successfully deployed to react.breaka.club!');
