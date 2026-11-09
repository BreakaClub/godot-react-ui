import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import type { Engine } from '../scripts/engine.mjs';
import { makeSkeleton, SCRIPTS, write, type ProfileName, type Skeleton } from './skeleton';

// The live-compile extension's Web side module is per engine profile (docs/tracks/stock-web.md). A side module is linked with the Emscripten of the engine whose
// templates load it, and the stock page cannot read a Breaka module ("unknown dylink.0 subsection: 6", then `__breaka_lazy_register` of undefined). So an export
// contains exactly the module stamped for its own profile, or none, and a Web verifier refuses an export that does anything else before it opens a page.
// The scripts that decide are copied into a temporary repository (tests/skeleton.ts); no cargo, Godot, Emscripten or browser is involved.

const BREAKA_MODULE = 'live_compile.web.wasm';
const STOCK_MODULE = 'live_compile.web.stock.wasm';
const BREAKA_BYTES = 'live-compile Web side module linked with Emscripten 6.0.12';
const STOCK_BYTES = 'live-compile Web side module linked with Emscripten 4.0.11';
const EXPORT_ONLY_STOCK = 'pnpm build:web --export-only --engine=stock';

async function webSkeleton(): Promise<Skeleton> {
  const skeleton = await makeSkeleton();
  skeleton.prepareWeb();
  mkdirSync(skeleton.liveCompile.INSTALL_DIRECTORY, { recursive: true });
  return skeleton;
}

/** What `requireFreshWebExport` throws for the profile's export as it stands, or undefined when the Web verifiers may serve it. */
function refusalOf(engine: Engine): string | undefined {
  try {
    engine.requireFreshWebExport();
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function manifest(skeleton: Skeleton): string {
  return readFileSync(skeleton.liveCompile.GDEXTENSION_FILE, 'utf8');
}

// ---- What the export does with the module -------------------------------------------------------------------------------------------------------------------

test('each profile has its own module file, stamp and target; Breaka\'s keeps the name it always had', async () => {
  const skeleton = await webSkeleton();
  const { liveCompile } = skeleton;
  const [breaka, stock] = [skeleton.engine('breaka'), skeleton.engine('stock')];
  assert.equal(liveCompile.webLibraryNameOf(breaka), BREAKA_MODULE);
  assert.equal(liveCompile.webLibraryNameOf(stock), STOCK_MODULE);
  assert.notEqual(liveCompile.webStampOf(breaka), liveCompile.webStampOf(stock));
  assert.notEqual(liveCompile.webTargetDirectoryOf(breaka), liveCompile.webTargetDirectoryOf(stock));
  assert.match(liveCompile.webTargetDirectoryOf(breaka), /live-compile\/target\/web$/u);
  assert.equal(liveCompile.WEB_FIX(stock), 'node scripts/build-live-compile-web.mjs --engine=stock');
});

test('no module installed for the profile: the export lists none, the manifest has no Web entry, and the other profile\'s module does not count', async () => {
  const skeleton = await webSkeleton();
  const { liveCompile } = skeleton;
  assert.deepEqual(liveCompile.liveCompileWebPlan(skeleton.engine('stock')), { include: false });
  skeleton.buildLiveCompileWeb('breaka', BREAKA_BYTES);
  assert.equal(liveCompile.liveCompileWebPlan(skeleton.engine('breaka')).include, true);
  assert.deepEqual(liveCompile.liveCompileWebPlan(skeleton.engine('stock')), { include: false }, 'Breaka\'s module sits in the shared install and is not the stock export\'s');
  liveCompile.writeGdextension({ webLibrary: undefined });
  assert.doesNotMatch(manifest(skeleton), /web\./u);
  assert.match(manifest(skeleton), /macos\.release\.arm64 = "res:\/\/addons\/live-compile\/bin\/liblive_compile\.(dylib|so|dll)"/u, 'the native entries are unchanged');
});

test('a module stamped for the profile is listed by name, and only that one', async () => {
  const skeleton = await webSkeleton();
  const { liveCompile } = skeleton;
  skeleton.buildLiveCompileWeb('breaka', BREAKA_BYTES);
  skeleton.buildLiveCompileWeb('stock', STOCK_BYTES);
  for (const [name, file] of [['breaka', BREAKA_MODULE], ['stock', STOCK_MODULE]] as const) {
    const plan = liveCompile.liveCompileWebPlan(skeleton.engine(name));
    assert.ok(plan.include);
    assert.equal(plan.name, file);
    assert.equal(plan.stamp?.engine, name, 'the stamp records the profile the module was linked for');
    liveCompile.writeGdextension({ webLibrary: plan.name });
    const text = manifest(skeleton);
    assert.match(text, new RegExp(`web\\.debug\\.threads\\.wasm32 = "res://addons/live-compile/bin/${file.replaceAll('.', '\\.')}"`, 'u'));
    assert.match(text, new RegExp(`web\\.release\\.threads\\.wasm32 = "res://addons/live-compile/bin/${file.replaceAll('.', '\\.')}"`, 'u'));
    assert.doesNotMatch(text, new RegExp(file === BREAKA_MODULE ? 'stock\\.wasm' : 'bin/live_compile\\.web\\.wasm"', 'u'), `the manifest of the ${name} export does not name the other profile's module`);
  }
});

test('a module that is installed and is not the profile\'s current build is refused with the build command, never left out', async () => {
  const fix = (name: string): string => `node scripts/build-live-compile-web.mjs --engine=${name}`;
  const refused = async (change: (skeleton: Skeleton) => void, name: ProfileName, pattern: RegExp): Promise<void> => {
    const skeleton = await webSkeleton();
    skeleton.buildLiveCompileWeb(name, name === 'breaka' ? BREAKA_BYTES : STOCK_BYTES);
    change(skeleton);
    assert.throws(() => skeleton.liveCompile.liveCompileWebPlan(skeleton.engine(name)), error => {
      const message = error instanceof Error ? error.message : '';
      assert.match(message, pattern);
      assert.ok(message.endsWith(`Run \`${fix(name)}\` first.`), message);
      return true;
    });
  };
  const stampPath = (skeleton: Skeleton, name: ProfileName): string => skeleton.liveCompile.webStampOf(skeleton.engine(name));
  const libraryPath = (skeleton: Skeleton, name: ProfileName): string => skeleton.liveCompile.webLibraryOf(skeleton.engine(name));
  // Another profile's stamp on the file: someone copied a module over.
  await refused(skeleton => {
    const stamp = JSON.parse(readFileSync(stampPath(skeleton, 'stock'), 'utf8')) as Record<string, unknown>;
    stamp.engine = 'breaka';
    write(skeleton.root, stampPath(skeleton, 'stock').slice(skeleton.root.length + 1), JSON.stringify(stamp));
  }, 'stock', /is the breaka profile's, not the stock profile's/u);
  // Older sources.
  await refused(skeleton => skeleton.write('live-compile/core/lib.rs', 'a change to the checker\n'), 'stock', /stale[^]*changed: live-compile\/core\/lib\.rs/u);
  // The profile's own Web dump: Breaka's module goes stale with Breaka's dump and not with stock's, and the other way round.
  await refused(skeleton => skeleton.write('native/api/extension_api.json', '{"header":{"version_major":4,"version_minor":8,"version_patch":0},"regenerated":true}'), 'breaka', /changed: native\/api\/extension_api\.json/u);
  // Replaced after it was built, stamp without a file, file without a stamp.
  await refused(skeleton => skeleton.write(libraryPath(skeleton, 'stock').slice(skeleton.root.length + 1), 'a module of some other build'), 'stock', /replaced after it was built/u);
  await refused(skeleton => rmSync(libraryPath(skeleton, 'stock')), 'stock', /No stock build of live_compile\.web\.stock\.wasm is available/u);
  await refused(skeleton => rmSync(stampPath(skeleton, 'breaka')), 'breaka', /No breaka build of live_compile\.web\.wasm is available/u);
  // The other profile's dump does not stale this one.
  const skeleton = await webSkeleton();
  skeleton.buildLiveCompileWeb('stock', STOCK_BYTES);
  skeleton.write('native/api/extension_api.json', '{"header":{"version_major":4,"version_minor":8,"version_patch":0},"regenerated":true}');
  assert.equal(skeleton.liveCompile.liveCompileWebPlan(skeleton.engine('stock')).include, true);
});

test('removing a profile\'s modules from an export directory leaves the UI side module and the page', async () => {
  const skeleton = await webSkeleton();
  const directory = join(skeleton.root, 'export');
  for (const file of [BREAKA_MODULE, STOCK_MODULE, 'godot_react_ui.web.wasm', 'index.html', 'live_compile.dylib']) write(directory, file, file);
  skeleton.liveCompile.removeLiveCompileWebModules(directory);
  assert.deepEqual(readdirSync(directory).sort(), ['godot_react_ui.web.wasm', 'index.html', 'live_compile.dylib']);
  skeleton.liveCompile.removeLiveCompileWebModules(join(skeleton.root, 'no-such-export'));
});

// ---- What a Web verifier accepts ------------------------------------------------------------------------------------------------------------------------------

test('the failure this track fixed: a stock export carrying Breaka\'s module is refused before any page is opened', async () => {
  const skeleton = await webSkeleton();
  skeleton.buildWebUi('stock');
  skeleton.buildLiveCompileWeb('breaka', BREAKA_BYTES);
  // What the broken export was: the stock export of the day, whose receipt knew nothing of the module, and Breaka's module beside the page.
  skeleton.writeWebExport('stock', { files: { [BREAKA_MODULE]: BREAKA_BYTES }, withoutLiveCompileField: true });
  const refusal = refusalOf(skeleton.engine('stock')) ?? '';
  assert.match(refusal, /^The Web export artifacts\/stock\/web-debug was made before the live-compile Web side module was stamped per profile, and contains live_compile\.web\.wasm\./u);
  assert.ok(refusal.includes(`Run \`${EXPORT_ONLY_STOCK}\` first`), refusal);
  // The same module under a receipt that says there is none.
  skeleton.writeWebExport('stock', { files: { [BREAKA_MODULE]: BREAKA_BYTES }, liveCompile: null });
  assert.match(refusalOf(skeleton.engine('stock')) ?? '', /contains live_compile\.web\.wasm, which its receipt does not record: a live-compile Web side module must be the one stamped for the stock profile/u);
  // And under a receipt that records it, with the stamp it really has: the profile on the stamp is Breaka's.
  const breakaStamp = skeleton.liveCompile.liveCompileWebPlan(skeleton.engine('breaka'));
  assert.ok(breakaStamp.include);
  skeleton.writeWebExport('stock', { files: { [BREAKA_MODULE]: BREAKA_BYTES }, liveCompile: { name: BREAKA_MODULE, stamp: breakaStamp.stamp } });
  assert.match(refusalOf(skeleton.engine('stock')) ?? '', /exported live_compile\.web\.wasm is the breaka profile's, not the stock profile's/u);
});

test('an export with no module and a receipt that says none is accepted, and so is one made before the field existed when it has no module', async () => {
  const skeleton = await webSkeleton();
  skeleton.buildWebUi('stock');
  skeleton.writeWebExport('stock', { liveCompile: null });
  assert.equal(refusalOf(skeleton.engine('stock')), undefined);
  skeleton.writeWebExport('stock', { withoutLiveCompileField: true });
  assert.equal(refusalOf(skeleton.engine('stock')), undefined);
});

test('an export with the module stamped for its profile is accepted, for each profile, and refused as soon as the module or its record is anything else', async () => {
  for (const [name, file, bytes] of [['breaka', BREAKA_MODULE, BREAKA_BYTES], ['stock', STOCK_MODULE, STOCK_BYTES]] as const) {
    const skeleton = await webSkeleton();
    const engine = skeleton.engine(name);
    skeleton.buildWebUi(name);
    skeleton.buildLiveCompileWeb(name, bytes);
    const plan = skeleton.liveCompile.liveCompileWebPlan(engine);
    assert.ok(plan.include);
    const recorded = { name: file, stamp: plan.stamp };
    skeleton.writeWebExport(name, { files: { [file]: bytes }, liveCompile: recorded });
    assert.equal(refusalOf(engine), undefined, `${name}: the module its profile stamped`);

    // Recorded, but not there; or there with other bytes than were stamped.
    skeleton.writeWebExport(name, { liveCompile: recorded });
    assert.match(refusalOf(engine) ?? '', new RegExp(`should contain the live-compile Web side module ${file.replaceAll('.', '\\.')} and no other; it contains none`, 'u'));
    skeleton.writeWebExport(name, { files: { [file]: 'a module of some other build' }, liveCompile: recorded });
    assert.match(refusalOf(engine) ?? '', /replaced after it was built|differs from the one/u);
    // Another module as well as the recorded one.
    const other = file === BREAKA_MODULE ? STOCK_MODULE : BREAKA_MODULE;
    skeleton.writeWebExport(name, { files: { [file]: bytes, [other]: 'the other profile\'s module' }, liveCompile: recorded });
    assert.match(refusalOf(engine) ?? '', new RegExp(`should contain the live-compile Web side module ${file.replaceAll('.', '\\.')} and no other; it contains ${[file, other].sort().join(', ').replaceAll('.', '\\.')}`, 'u'));
    // Recorded for the other profile.
    skeleton.writeWebExport(name, { files: { [file]: bytes }, liveCompile: { name: file, stamp: { ...plan.stamp, engine: other === STOCK_MODULE ? 'stock' : 'breaka' } } });
    assert.match(refusalOf(engine) ?? '', /is the (stock|breaka) profile's, not the (stock|breaka) profile's/u);
    // Sources that moved on after the export was made.
    skeleton.writeWebExport(name, { files: { [file]: bytes }, liveCompile: recorded });
    assert.equal(refusalOf(engine), undefined);
    skeleton.write('live-compile/ext/lib.rs', 'a change to the extension\n');
    assert.match(refusalOf(engine) ?? '', /stale[^]*changed: live-compile\/ext\/lib\.rs/u);
  }
});

test('the other profile\'s export is judged by its own profile: Breaka\'s accepted export is a refusal for stock', async () => {
  const skeleton = await webSkeleton();
  skeleton.buildWebUi('breaka');
  skeleton.buildLiveCompileWeb('breaka', BREAKA_BYTES);
  const plan = skeleton.liveCompile.liveCompileWebPlan(skeleton.engine('breaka'));
  assert.ok(plan.include);
  skeleton.writeWebExport('breaka', { files: { [BREAKA_MODULE]: BREAKA_BYTES }, liveCompile: { name: BREAKA_MODULE, stamp: plan.stamp } });
  assert.equal(refusalOf(skeleton.engine('breaka')), undefined);
  assert.ok(existsSync(join(skeleton.exportDirectory('breaka'), BREAKA_MODULE)));
  assert.match(refusalOf(skeleton.engine('stock')) ?? '', /^No stock Web export artifacts\/stock\/web-debug exists/u, 'stock has an export directory of its own');
});

test('an export with no module for its profile is made with the extension out of the project, and the manifest is back afterwards, whatever happens', async () => {
  const skeleton = await webSkeleton();
  const { liveCompile } = skeleton;
  liveCompile.writeGdextension();
  const manifestPath = liveCompile.GDEXTENSION_FILE;
  const text = readFileSync(manifestPath, 'utf8');
  let seen: boolean | undefined;
  const result = liveCompile.withoutLiveCompileManifest(() => {
    seen = existsSync(manifestPath);
    return 'the export';
  });
  assert.equal(result, 'the export');
  assert.equal(seen, false, 'the extension is not in the project while the export is made');
  assert.equal(readFileSync(manifestPath, 'utf8'), text, 'and the manifest is put back byte for byte');
  assert.equal(existsSync(`${manifestPath}.hidden`), false);
  // An export that throws still gives it back.
  assert.throws(() => liveCompile.withoutLiveCompileManifest(() => { throw new Error('the export failed'); }), /the export failed/u);
  assert.equal(readFileSync(manifestPath, 'utf8'), text);
  // A run that was killed while the manifest was hidden left it hidden: the next one puts it back first.
  rmSync(manifestPath);
  write(skeleton.root, 'demo/addons/live-compile/live_compile.gdextension.hidden', text);
  liveCompile.withoutLiveCompileManifest(() => { seen = existsSync(manifestPath); });
  assert.equal(seen, false);
  assert.equal(readFileSync(manifestPath, 'utf8'), text, 'a manifest left hidden by a killed run is restored');
  // A hidden copy left beside a manifest that was written again since is stale: it is dropped, not put over the newer one.
  write(skeleton.root, 'demo/addons/live-compile/live_compile.gdextension.hidden', 'stale');
  liveCompile.withoutLiveCompileManifest(() => undefined);
  assert.equal(existsSync(`${manifestPath}.hidden`), false);
  assert.equal(readFileSync(manifestPath, 'utf8'), text);
  // No manifest at all (the extension was never built): nothing to hide, nothing invented.
  rmSync(manifestPath);
  liveCompile.withoutLiveCompileManifest(() => { seen = existsSync(manifestPath); });
  assert.equal(existsSync(manifestPath), false);
});

test('the live-compile Web section is refused up front for an export that has no module, naming the build', async () => {
  const skeleton = await webSkeleton();
  const stock = skeleton.engine('stock');
  const directory = skeleton.exportDirectory('stock');
  write(directory, 'index.html', 'page');
  assert.throws(() => skeleton.liveCompile.requireLiveCompileWebModule(stock, directory, 'debug'), error => {
    const message = error instanceof Error ? error.message : '';
    assert.match(message, /^The stock Web export has no live-compile side module \(its code editor is read-only\)/u);
    assert.ok(message.endsWith('Run `node scripts/build-live-compile-web.mjs --engine=stock`, then `pnpm build:web --export-only --engine=stock`.'), message);
    return true;
  });
  assert.throws(() => skeleton.liveCompile.requireLiveCompileWebModule(stock, directory, 'release'), /pnpm build:web --export-only --release --engine=stock/u);
  write(directory, STOCK_MODULE, STOCK_BYTES);
  skeleton.liveCompile.requireLiveCompileWebModule(stock, directory, 'debug');
  assert.throws(() => skeleton.liveCompile.requireLiveCompileWebModule(skeleton.engine('breaka'), directory, 'debug'), /The breaka Web export has no live-compile side module/u, 'Breaka\'s section does not run on the stock module');
  assert.ok(readFileSync(join(SCRIPTS, 'verify-live-compile-web.mjs'), 'utf8').includes('requireLiveCompileWebModule(engine, exportDirectory, engine.webMode())'), 'the verifier makes the check');
});

// ---- The wiring of the real scripts -----------------------------------------------------------------------------------------------------------------------

test('the Web build lists a module only through the plan, clears stale ones, checks what was exported and records it; nothing else writes a Web entry', () => {
  const read = (name: string): string => readFileSync(join(SCRIPTS, name), 'utf8');
  const buildWeb = read('build-web.mjs');
  for (const call of ['liveCompileWebPlan(engine)', 'if (liveCompile.include) writeGdextension({ webLibrary: liveCompile.name })', 'else withoutLiveCompileManifest(makeExport)', 'removeLiveCompileWebModules(output)', 'liveCompileWebExportProblem(engine, output, recordedLiveCompile)', 'liveCompile: recordedLiveCompile']) {
    assert.ok(buildWeb.includes(call), `build-web.mjs must contain ${call}`);
  }
  assert.ok(buildWeb.indexOf('writeGdextension(') < buildWeb.indexOf('planReleaseStageOf(join(root'), 'the manifest is written before a release export copies the project');
  assert.ok(buildWeb.indexOf('removeLiveCompileWebModules(') < buildWeb.indexOf('--export-${mode}'), 'stale modules are cleared before the export');
  const writers = readdirSync(SCRIPTS).filter(name => name.endsWith('.mjs') && /writeGdextension\(\{ webLibrary:/u.test(read(name)));
  assert.deepEqual(writers, ['build-web.mjs'], 'only the Web export names a Web library in the manifest');
  assert.ok(!/webLibrary/u.test(read('build-live-compile.mjs')), 'the native build writes a manifest without a Web library');
  const moduleBuild = read('build-live-compile-web.mjs');
  assert.ok(moduleBuild.includes('identity: { engine: engine.name }') && moduleBuild.includes('build.compiled()') && moduleBuild.includes('build.installed()'), 'the module is stamped with its profile');
  assert.ok(!moduleBuild.includes('writeGdextension('), 'building a module does not touch the manifest');
  assert.ok(read('engine.mjs').includes('liveCompileWebExportProblem(this, directory, receipt.liveCompile)'), 'requireFreshWebExport checks the live-compile module');
  // The demo asks the engine whether the class exists before it names it: on the Web, naming a class the engine lacks is an engine error even when caught, and an export
  // with no module for its profile must give a read-only code editor and no console error.
  const host = readFileSync(join(SCRIPTS, '..', 'demo/src/live-compile-host.ts'), 'utf8');
  const open = host.slice(host.indexOf('export function openExtensionHost'));
  assert.ok(open.indexOf("ClassDB.classExists('LiveCompile')") >= 0 && open.indexOf("ClassDB.classExists('LiveCompile')") < open.indexOf('typeof LiveCompile'), 'openExtensionHost asks ClassDB before it names LiveCompile');
});
