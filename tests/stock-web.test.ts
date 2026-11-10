import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import type { Engine } from '../scripts/engine.mjs';
import { GODOT_TSC_SETUP, GODOT_TSC_WEB_MODULES, makeSkeleton, SCRIPTS, write, type ProfileName, type Skeleton } from './skeleton';

// The godot-tsc Web side module is per engine profile. A side module is linked with the Emscripten of the engine whose templates
// load it, and the stock page cannot read a Breaka module ("unknown dylink.0 subsection: 6", then `__breaka_lazy_register` of undefined). The package says
// in its build record which profile each of its modules is for and which dumps it is bound to; an export contains exactly its own profile's module, or none,
// and a Web verifier refuses an export that does anything else before it opens a page. The scripts that decide are copied into a temporary repository with
// a stand-in package (tests/skeleton.ts), which ships a module for either profile so that both sides of each rule are tested (the published package ships
// the stock one only); no cargo, Godot, Emscripten or browser is involved.

const BREAKA_MODULE = GODOT_TSC_WEB_MODULES.breaka;
const STOCK_MODULE = GODOT_TSC_WEB_MODULES.stock;
const BREAKA_BYTES = 'godot-tsc Web side module linked with Emscripten 6.0.12';
const STOCK_BYTES = 'godot-tsc Web side module linked with Emscripten 4.0.11';
const BYTES: Readonly<Record<ProfileName, string>> = { breaka: BREAKA_BYTES, stock: STOCK_BYTES };
const EXPORT_ONLY_STOCK = 'pnpm build:web --export-only --engine=stock';
const pattern = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

/** A repository ready for Web exports, with the godot-tsc package shipping the modules named in `web` and its addon installed. */
async function webSkeleton(web: Partial<Record<ProfileName, string>> = BYTES): Promise<Skeleton> {
  const skeleton = await makeSkeleton();
  skeleton.prepareWeb();
  skeleton.packageGodotTsc({ web });
  skeleton.installGodotTsc();
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
  return readFileSync(skeleton.godotTsc.GDEXTENSION_FILE, 'utf8');
}

/** The receipt's record of the profile's module, as the plan gives it. */
function recordOf(skeleton: Skeleton, name: ProfileName): { name: string; sha256: string } {
  const plan = skeleton.godotTsc.godotTscWebPlan(skeleton.engine(name));
  assert.ok(plan.include, `the package ships the ${name} module`);
  return { name: plan.name, sha256: plan.sha256 };
}

// ---- What the export does with the module -------------------------------------------------------------------------------------------------------------------

test('each profile has its own module file', async () => {
  const skeleton = await webSkeleton();
  const { godotTsc } = skeleton;
  const [breaka, stock] = [skeleton.engine('breaka'), skeleton.engine('stock')];
  assert.equal(godotTsc.webModuleNameOf(breaka), BREAKA_MODULE);
  assert.equal(godotTsc.webModuleNameOf(stock), STOCK_MODULE);
  assert.notEqual(godotTsc.webModuleOf(breaka), godotTsc.webModuleOf(stock));
});

test('nothing installed, or no module in the package for the profile: the export lists none, and the other profile\'s module does not count', async () => {
  const bare = await makeSkeleton();
  bare.packageGodotTsc({ web: BYTES });
  assert.deepEqual(bare.godotTsc.godotTscWebPlan(bare.engine('stock')), { include: false }, 'a package that is not installed is not in the project');
  const skeleton = await webSkeleton({ breaka: BREAKA_BYTES });
  assert.equal(skeleton.godotTsc.godotTscWebPlan(skeleton.engine('breaka')).include, true);
  assert.deepEqual(skeleton.godotTsc.godotTscWebPlan(skeleton.engine('stock')), { include: false }, 'Breaka\'s module is in the install and is not the stock export\'s');
});

test('the profile\'s module is listed by name for its export, and only that one; the package\'s manifest is back afterwards', async () => {
  const skeleton = await webSkeleton();
  const { godotTsc } = skeleton;
  const packaged = manifest(skeleton);
  assert.match(packaged, new RegExp(`web\\.debug\\.threads\\.wasm32 = "res://addons/godot-tsc/bin/${pattern(STOCK_MODULE)}"`, 'u'), 'the package names the stock module');
  for (const [name, file] of [['breaka', BREAKA_MODULE], ['stock', STOCK_MODULE]] as const) {
    const plan = godotTsc.godotTscWebPlan(skeleton.engine(name));
    assert.deepEqual(plan, { include: true, name: file, sha256: recordOf(skeleton, name).sha256 });
    const during = godotTsc.withGodotTscWebManifest(plan, () => manifest(skeleton));
    for (const kind of ['debug', 'release']) {
      assert.ok(during.includes(`web.${kind}.threads.wasm32 = "res://addons/godot-tsc/bin/${file}"`), `the ${name} export's manifest names ${file} for ${kind}`);
      assert.ok(during.includes(`macos.${kind}.arm64 = "res://addons/godot-tsc/bin/libgodot_tsc.dylib"`), `and keeps the package's native ${kind} entry`);
    }
    assert.equal(during.match(/^web\./gmu)?.length, 2, `the ${name} export's manifest names one module`);
    assert.equal(manifest(skeleton), packaged, 'the package\'s manifest is put back');
  }
  assert.throws(() => godotTsc.withGodotTscWebManifest(godotTsc.godotTscWebPlan(skeleton.engine('breaka')), () => { throw new Error('the export failed'); }), /the export failed/u);
  assert.equal(manifest(skeleton), packaged, 'and put back when the export fails');
  assert.equal(godotTsc.godotTscRefusal(), undefined, 'the install is the package\'s again for the next native run');
});

test('the manifest for a profile replaces the package\'s Web lines and keeps the rest as the package wrote it', async () => {
  const skeleton = await webSkeleton();
  const native = '[configuration]\nentry_symbol = "gdext_rust_init"\n\n[libraries]\nmacos.debug.arm64 = "res://addons/godot-tsc/bin/libgodot_tsc.dylib"\n';
  const named = skeleton.godotTsc.manifestNaming(`${native}web.debug.threads.wasm32 = "res://addons/godot-tsc/bin/${STOCK_MODULE}"\nweb.release.threads.wasm32 = "res://addons/godot-tsc/bin/${STOCK_MODULE}"\n`, BREAKA_MODULE);
  assert.equal(named, `${native}web.debug.threads.wasm32 = "res://addons/godot-tsc/bin/${BREAKA_MODULE}"\nweb.release.threads.wasm32 = "res://addons/godot-tsc/bin/${BREAKA_MODULE}"\n`);
  assert.equal(skeleton.godotTsc.manifestNaming(native, STOCK_MODULE), `${native}web.debug.threads.wasm32 = "res://addons/godot-tsc/bin/${STOCK_MODULE}"\nweb.release.threads.wasm32 = "res://addons/godot-tsc/bin/${STOCK_MODULE}"\n`, 'a package manifest with no Web line gets the profile\'s');
  assert.throws(() => skeleton.godotTsc.manifestNaming('[configuration]\n', STOCK_MODULE), /has no \[libraries\] section/u);
});

test('an installed addon that is not the package\'s current build, or a module bound to another profile\'s dumps, is refused, never left out', async () => {
  const refused = async (change: (skeleton: Skeleton) => void, name: ProfileName, expected: RegExp): Promise<void> => {
    const skeleton = await webSkeleton();
    change(skeleton);
    assert.throws(() => skeleton.godotTsc.godotTscWebPlan(skeleton.engine(name)), error => {
      assert.match(error instanceof Error ? error.message : '', expected);
      return true;
    });
  };
  // The package rebuilt, and not installed again.
  await refused(skeleton => skeleton.packageGodotTsc({ web: { ...BYTES, stock: 'a rebuilt stock module' } }), 'stock',
    new RegExp(`^The installed godot-tsc addon is not the package's current build[^]*Run \`${pattern(GODOT_TSC_SETUP)}\` first\\.$`, 'u'));
  // The installed module replaced after the install.
  await refused(skeleton => write(skeleton.godotTsc.INSTALL_DIRECTORY, `bin/${STOCK_MODULE}`, 'a module of some other build'), 'stock', /bin\/godot_tsc\.web\.stock\.wasm is not the file its build record lists/u);
  // Bound to other dumps than the profile's: a module linked for the profile but against another pair, or the profile's dump regenerated since.
  const elsewhere = { extensionApiSha256: 'ab'.repeat(32), gdextensionInterfaceSha256: 'cd'.repeat(32) };
  await refused(skeleton => { skeleton.packageGodotTsc({ web: BYTES, webBinding: { stock: elsewhere } }); skeleton.installGodotTsc(); }, 'stock',
    /^The installed godot_tsc\.web\.stock\.wasm is bound to other Godot dumps than the stock profile's \(native\/api\/stock-4\.7\.2\): extension_api\.json abababababab/u);
  await refused(skeleton => skeleton.write('native/api/extension_api.json', '{"header":{"version_major":4,"version_minor":8,"version_patch":0},"regenerated":true}'), 'breaka',
    /^The installed godot_tsc\.web\.breaka\.wasm is bound to other Godot dumps than the breaka profile's \(native\/api\): extension_api\.json/u);
  // The other profile's dump does not touch this one.
  const skeleton = await webSkeleton();
  skeleton.write('native/api/extension_api.json', '{"header":{"version_major":4,"version_minor":8,"version_patch":0},"regenerated":true}');
  assert.equal(skeleton.godotTsc.godotTscWebPlan(skeleton.engine('stock')).include, true);
});

test('removing the modules from an export directory takes godot-tsc\'s and the in-repo extension\'s, and leaves the UI side module and the page', async () => {
  const skeleton = await webSkeleton();
  const directory = join(skeleton.root, 'export');
  for (const file of [BREAKA_MODULE, STOCK_MODULE, 'live_compile.web.wasm', 'live_compile.web.stock.wasm', 'godot_react_ui.web.wasm', 'index.html', 'libgodot_tsc.dylib']) write(directory, file, file);
  skeleton.godotTsc.removeGodotTscWebModules(directory);
  assert.deepEqual(readdirSync(directory).sort(), ['godot_react_ui.web.wasm', 'index.html', 'libgodot_tsc.dylib']);
  skeleton.godotTsc.removeGodotTscWebModules(join(skeleton.root, 'no-such-export'));
});

// ---- What a Web verifier accepts ------------------------------------------------------------------------------------------------------------------------------

test('the failure this track fixed: a stock export carrying Breaka\'s module is refused before any page is opened', async () => {
  const skeleton = await webSkeleton();
  skeleton.buildWebUi('stock');
  // An export from before the receipt recorded the module, with Breaka's module beside the page: the in-repo extension's, or godot-tsc's.
  skeleton.writeWebExport('stock', { files: { 'live_compile.web.wasm': BREAKA_BYTES }, withoutGodotTscField: true });
  const refusal = refusalOf(skeleton.engine('stock')) ?? '';
  assert.match(refusal, /^The Web export artifacts\/stock\/web-debug was made before its receipt recorded the godot-tsc Web side module, and contains live_compile\.web\.wasm\./u);
  assert.ok(refusal.includes(`Run \`${EXPORT_ONLY_STOCK}\` first`), refusal);
  // The module under a receipt that says there is none.
  skeleton.writeWebExport('stock', { files: { [BREAKA_MODULE]: BREAKA_BYTES }, godotTsc: null });
  assert.match(refusalOf(skeleton.engine('stock')) ?? '', /contains godot_tsc\.web\.breaka\.wasm, which its receipt does not record: a godot-tsc Web side module must be the stock profile's/u);
  // And under a receipt that records it, by its own name and hash: the files agree with the receipt, and it is still Breaka's module.
  skeleton.writeWebExport('stock', { files: { [BREAKA_MODULE]: BREAKA_BYTES }, godotTsc: recordOf(skeleton, 'breaka') });
  assert.match(refusalOf(skeleton.engine('stock')) ?? '', /receipt records the godot-tsc Web side module godot_tsc\.web\.breaka\.wasm, which is not the stock profile's \(godot_tsc\.web\.stock\.wasm\)/u);
});

test('an export with no module and a receipt that says none is accepted, and so is one made before the field existed when it has no module', async () => {
  const skeleton = await webSkeleton();
  skeleton.buildWebUi('stock');
  skeleton.writeWebExport('stock', { godotTsc: null });
  assert.equal(refusalOf(skeleton.engine('stock')), undefined);
  skeleton.writeWebExport('stock', { withoutGodotTscField: true });
  assert.equal(refusalOf(skeleton.engine('stock')), undefined);
});

test('an export with its profile\'s module is accepted, for each profile, and refused as soon as the module or its record is anything else', async () => {
  for (const [name, file, bytes] of [['breaka', BREAKA_MODULE, BREAKA_BYTES], ['stock', STOCK_MODULE, STOCK_BYTES]] as const) {
    const skeleton = await webSkeleton();
    const engine = skeleton.engine(name);
    skeleton.buildWebUi(name);
    const recorded = recordOf(skeleton, name);
    skeleton.writeWebExport(name, { files: { [file]: bytes }, godotTsc: recorded });
    assert.equal(refusalOf(engine), undefined, `${name}: the package's module for the profile`);

    // Recorded, but not there; or there with other bytes than were recorded.
    skeleton.writeWebExport(name, { godotTsc: recorded });
    assert.match(refusalOf(engine) ?? '', new RegExp(`should contain the godot-tsc Web side module ${pattern(file)} and no other; it contains none`, 'u'));
    skeleton.writeWebExport(name, { files: { [file]: 'a module of some other build' }, godotTsc: recorded });
    assert.match(refusalOf(engine) ?? '', new RegExp(`'s ${pattern(file)} is not the file its receipt records`, 'u'));
    // Another module as well as the recorded one.
    const other = file === BREAKA_MODULE ? STOCK_MODULE : BREAKA_MODULE;
    skeleton.writeWebExport(name, { files: { [file]: bytes, [other]: 'the other profile\'s module' }, godotTsc: recorded });
    assert.match(refusalOf(engine) ?? '', new RegExp(`should contain the godot-tsc Web side module ${pattern(file)} and no other; it contains ${pattern([file, other].sort().join(', '))}`, 'u'));
    // Recorded as the other profile's module.
    skeleton.writeWebExport(name, { files: { [other]: bytes }, godotTsc: { name: other, sha256: recorded.sha256 } });
    assert.match(refusalOf(engine) ?? '', new RegExp(`records the godot-tsc Web side module ${pattern(other)}, which is not the ${name} profile's`, 'u'));
    // The package rebuilt and installed again after the export was made: the export carries the old module.
    skeleton.writeWebExport(name, { files: { [file]: bytes }, godotTsc: recorded });
    assert.equal(refusalOf(engine), undefined);
    skeleton.packageGodotTsc({ web: { ...BYTES, [name]: `${bytes}, rebuilt` } });
    skeleton.installGodotTsc();
    assert.match(refusalOf(engine) ?? '', new RegExp(`'s ${pattern(file)} is not the installed godot-tsc package's module: the package was rebuilt, reinstalled or removed since the export`, 'u'));
  }
});

test('the other profile\'s export is judged by its own profile: Breaka\'s accepted export is a refusal for stock', async () => {
  const skeleton = await webSkeleton();
  skeleton.buildWebUi('breaka');
  skeleton.writeWebExport('breaka', { files: { [BREAKA_MODULE]: BREAKA_BYTES }, godotTsc: recordOf(skeleton, 'breaka') });
  assert.equal(refusalOf(skeleton.engine('breaka')), undefined);
  assert.ok(existsSync(join(skeleton.exportDirectory('breaka'), BREAKA_MODULE)));
  assert.match(refusalOf(skeleton.engine('stock')) ?? '', /^No stock Web export artifacts\/stock\/web-debug exists/u, 'stock has an export directory of its own');
});

test('an export with no module for its profile is made with the addon out of the project, and the manifest is back afterwards, whatever happens', async () => {
  const skeleton = await webSkeleton({ breaka: BREAKA_BYTES });
  const { godotTsc } = skeleton;
  const manifestPath = godotTsc.GDEXTENSION_FILE;
  const text = readFileSync(manifestPath, 'utf8');
  let seen: boolean | undefined;
  const plan = godotTsc.godotTscWebPlan(skeleton.engine('stock'));
  assert.deepEqual(plan, { include: false });
  const result = godotTsc.withGodotTscWebManifest(plan, () => {
    seen = existsSync(manifestPath);
    return 'the export';
  });
  assert.equal(result, 'the export');
  assert.equal(seen, false, 'the addon is not in the project while the export is made');
  assert.equal(readFileSync(manifestPath, 'utf8'), text, 'and the manifest is put back byte for byte');
  assert.equal(existsSync(`${manifestPath}.hidden`), false);
  // An export that throws still gives it back.
  assert.throws(() => godotTsc.withoutGodotTscManifest(() => { throw new Error('the export failed'); }), /the export failed/u);
  assert.equal(readFileSync(manifestPath, 'utf8'), text);
  // A run that was killed while the manifest was hidden left it hidden: the next one puts it back first.
  rmSync(manifestPath);
  write(skeleton.root, 'demo/addons/godot-tsc/godot_tsc.gdextension.hidden', text);
  godotTsc.withoutGodotTscManifest(() => { seen = existsSync(manifestPath); });
  assert.equal(seen, false);
  assert.equal(readFileSync(manifestPath, 'utf8'), text, 'a manifest left hidden by a killed run is restored');
  // A hidden copy left beside a manifest that was installed again since is stale: it is dropped, not put over the newer one.
  write(skeleton.root, 'demo/addons/godot-tsc/godot_tsc.gdextension.hidden', 'stale');
  godotTsc.withoutGodotTscManifest(() => undefined);
  assert.equal(existsSync(`${manifestPath}.hidden`), false);
  assert.equal(readFileSync(manifestPath, 'utf8'), text);
  // No manifest at all (the addon was never installed): nothing to hide, nothing invented.
  rmSync(manifestPath);
  godotTsc.withoutGodotTscManifest(() => { seen = existsSync(manifestPath); });
  assert.equal(existsSync(manifestPath), false);
});

test('the live-compile Web section is refused up front for an export that has no module, saying what to install, or that the package has none for the profile', async () => {
  const skeleton = await webSkeleton();
  const stock = skeleton.engine('stock');
  const directory = skeleton.exportDirectory('stock');
  write(directory, 'index.html', 'page');
  assert.throws(() => skeleton.godotTsc.requireGodotTscWebModule(stock, directory, 'debug'), error => {
    const message = error instanceof Error ? error.message : '';
    assert.match(message, /^The stock Web export has no godot-tsc side module \(its code editor is read-only\)/u);
    assert.ok(message.includes(`Install the package's addon (\`${GODOT_TSC_SETUP}\`)`), message);
    assert.ok(message.endsWith(`then run \`${EXPORT_ONLY_STOCK}\`.`), message);
    return true;
  });
  assert.throws(() => skeleton.godotTsc.requireGodotTscWebModule(stock, directory, 'release'), /pnpm build:web --export-only --release --engine=stock/u);
  write(directory, STOCK_MODULE, STOCK_BYTES);
  skeleton.godotTsc.requireGodotTscWebModule(stock, directory, 'debug');
  assert.throws(() => skeleton.godotTsc.requireGodotTscWebModule(skeleton.engine('breaka'), directory, 'debug'), /The breaka Web export has no godot-tsc side module/u, 'Breaka\'s section does not run on the stock module');
  // The published package: a module for the stock profile only. There is nothing to install for Breaka's export, and the message does not say to.
  const published = await webSkeleton({ stock: STOCK_BYTES });
  assert.throws(() => published.godotTsc.requireGodotTscWebModule(published.engine('breaka'), published.exportDirectory('breaka'), 'debug'), error => {
    const message = error instanceof Error ? error.message : '';
    assert.match(message, /^The breaka Web export has no godot-tsc side module \(its code editor is read-only\), so there is nothing for this section to run\. The godot-tsc package ships no Web side module for the breaka profile \(only for stock\)\.$/u);
    return true;
  });
  // No package in node_modules at all.
  const bare = await makeSkeleton();
  assert.throws(() => bare.godotTsc.requireGodotTscWebModule(bare.engine('stock'), bare.exportDirectory('stock'), 'debug'), /The godot-tsc package has no built addon: run `pnpm install`\.$/u);
  assert.ok(readFileSync(join(SCRIPTS, 'verify-live-compile-web.mjs'), 'utf8').includes('requireGodotTscWebModule(engine, exportDirectory, engine.webMode())'), 'the verifier makes the check');
});

// ---- The wiring of the real scripts -----------------------------------------------------------------------------------------------------------------------

test('the Web build lists a module only through the plan, clears stale ones, checks what was exported and records it; nothing else names a Web library', () => {
  const read = (name: string): string => readFileSync(join(SCRIPTS, name), 'utf8');
  const buildWeb = read('build-web.mjs');
  for (const call of ['godotTscWebPlan(engine)', 'withGodotTscWebManifest(godotTsc, makeExport)', 'removeGodotTscWebModules(output)', 'godotTscWebExportProblem(engine, output, recordedGodotTsc)', 'godotTsc: recordedGodotTsc']) {
    assert.ok(buildWeb.includes(call), `build-web.mjs must contain ${call}`);
  }
  assert.ok(buildWeb.indexOf('removeGodotTscWebModules(') < buildWeb.indexOf('--export-${mode}'), 'stale modules are cleared before the export');
  assert.ok(buildWeb.indexOf('const makeExport') < buildWeb.indexOf('withGodotTscWebManifest(godotTsc, makeExport)'), 'the release stage is made inside the manifest the plan decided');
  const writers = readdirSync(SCRIPTS).filter(name => name.endsWith('.mjs') && name !== 'godot-tsc.mjs' && /withGodotTscWebManifest\(|manifestNaming\(/u.test(read(name)));
  assert.deepEqual(writers, ['build-web.mjs'], 'only the Web export names a Web library in the manifest');
  assert.ok(read('engine.mjs').includes('godotTscWebExportProblem(this, directory, receipt.godotTsc)'), 'requireFreshWebExport checks the godot-tsc module');
  // The demo opens the service only through the package's `openTsc`, which asks ClassDB before it names the class: on the Web, naming a class the engine lacks is an
  // engine error even when caught, and an export with no module for its profile must give a read-only code editor and no console error.
  const demo = join(SCRIPTS, '..', 'demo/src');
  const naming = readdirSync(demo).filter(name => /\.tsx?$/u.test(name) && /\bnew GodotTsc\b|\bGodotTsc\b/u.test(readFileSync(join(demo, name), 'utf8')));
  assert.deepEqual(naming, [], 'no demo module names the GodotTsc class itself');
  assert.ok(read('../demo/src/main.ts').includes('openTsc()'), 'the page opens the service with openTsc');
});
