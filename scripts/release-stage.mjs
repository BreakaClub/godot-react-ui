import { constants, cpSync, existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { DEMO_ENTRY_POINTS, DEMO_RELEASE_ENTRY_POINTS } from './demo-entry-points.mjs';
import { readPackEntries } from './pack-contents.mjs';

/**
 * The release Web export: the pack that `pnpm build:web --release` makes holds what the deployed playground runs and nothing
 * else, and no source maps. The debug export, which the Web verifiers use, is unchanged.
 *
 * Why the export is staged instead of configured. GodotJS's export plugin turns every `.ts` Godot resource into a remap and a compiled module and
 * adds the module's source map (`GodotJS/editor/packaging/source_map_included`, a project-wide setting read with `GLOBAL_GET`, which no export
 * mode or preset overrides in either GodotJS). The Web export needs a compiled module for every `.ts` it packs ("failed to include module"), so the
 * way to leave a verifier out is to leave its source out, and `export_presets.cfg` holds one preset per engine profile, not per mode
 * (`tests/engine.test.ts` pins the pair as identical but for name, path and templates). So the release export runs on a copy of `demo/` from which
 * the verification-only scripts, the scenes that exist for them, and every source map have been removed. Godot itself then makes a consistent
 * pack, shell and file sizes; nothing edits a pack.
 */

const SCRIPT_DIRECTORY = 'demo/src/';
const GODOTJS_OUTPUT = '.godot/GodotJS';

/** `demo/src/verify-glass.ts` is the script `verify-glass`. */
export function scriptName(entryPoint) {
  if (!entryPoint.startsWith(SCRIPT_DIRECTORY) || !entryPoint.endsWith('.ts')) throw new Error(`${entryPoint} is not a demo script`);
  return entryPoint.slice(SCRIPT_DIRECTORY.length, -'.ts'.length);
}

/** The scripts a scene file names (`ext_resource type="Script" path="res://src/main.ts"`), as repository-relative entry points. */
export function scriptsOfScene(text) {
  const scripts = [];
  for (const match of text.matchAll(/^\[ext_resource\s[^\]]*type="Script"[^\]]*path="res:\/\/([^"]+)"/gmu)) {
    scripts.push(`demo/${match[1]}`);
  }
  return scripts;
}

/** The scripts `project.godot` starts as autoloads (`Name="*res://src/x.ts"`), as repository-relative entry points. */
export function autoloadScripts(text) {
  const section = /^\[autoload\]\s*$([\s\S]*?)(?=^\[|(?![\s\S]))/mu.exec(text);
  if (section === null) return [];
  const scripts = [];
  for (const match of (section[1] ?? '').matchAll(/^[^=\n]+="\*?res:\/\/([^"]+)"/gmu)) scripts.push(`demo/${match[1]}`);
  return scripts;
}

/**
 * What the release leaves out, decided from the declared lists and checked against what Godot loads by itself: `sceneScripts` maps each scene file
 * (`main.tscn`) to the scripts it names, `autoloads` are the scripts `project.godot` starts. A kept scene or autoload whose script is left out would
 * ship broken, and a scene with some scripts kept and some not has no sensible fate, so each is an error here, at build time.
 */
export function planReleaseStage({ entryPoints = DEMO_ENTRY_POINTS, releaseEntryPoints = DEMO_RELEASE_ENTRY_POINTS, sceneScripts, autoloads }) {
  const unknown = releaseEntryPoints.filter(entry => !entryPoints.includes(entry));
  if (unknown.length > 0) throw new Error(`Release entry points that are not demo entry points: ${unknown.join(', ')}`);
  const kept = new Set(releaseEntryPoints);
  for (const autoload of autoloads) {
    if (!kept.has(autoload)) throw new Error(`The autoload ${autoload} is not a release entry point, so the release would start without it`);
  }
  const removedScenes = [];
  const keptScenes = [];
  for (const [scene, scripts] of sceneScripts) {
    const left = scripts.filter(script => !kept.has(script));
    if (left.length === 0) keptScenes.push(scene);
    else if (left.length === scripts.length) removedScenes.push(scene);
    else throw new Error(`${scene} names release scripts and others (${left.join(', ')}); decide whether the scene ships`);
  }
  return {
    keptScripts: releaseEntryPoints.map(scriptName),
    // Only a `.ts` file is a Godot script resource; `app.tsx` is bundled into the owners that import it and has no module of its own in the pack.
    removedScripts: entryPoints.filter(entry => entry.endsWith('.ts') && !kept.has(entry)).map(scriptName),
    keptScenes: keptScenes.sort(),
    removedScenes: removedScenes.sort(),
  };
}

/** Read the scenes and autoloads of the project in `demoDirectory` and plan the release from them. */
export function planReleaseStageOf(demoDirectory) {
  const sceneScripts = new Map(readdirSync(demoDirectory).filter(name => name.endsWith('.tscn')).sort().map(name => [name, scriptsOfScene(readFileSync(join(demoDirectory, name), 'utf8'))]));
  return planReleaseStage({ sceneScripts, autoloads: autoloadScripts(readFileSync(join(demoDirectory, 'project.godot'), 'utf8')) });
}

function removeIfPresent(path) {
  rmSync(path, { force: true });
}

function sourceMapsUnder(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceMapsUnder(path);
    return entry.name.endsWith('.map') ? [path] : [];
  });
}

/**
 * Copy the project to `stageDirectory` and take out what `plan` leaves out. A copy-on-write clone where the file system has them (APFS), so the
 * staging is not the size of the project. Timestamps are kept: the editor decides what to re-import from them.
 */
export function stageReleaseProject({ demoDirectory, stageDirectory, plan }) {
  rmSync(stageDirectory, { recursive: true, force: true });
  cpSync(demoDirectory, stageDirectory, { recursive: true, mode: constants.COPYFILE_FICLONE, preserveTimestamps: true, verbatimSymlinks: true });
  for (const name of plan.removedScripts) {
    removeIfPresent(join(stageDirectory, 'src', `${name}.ts`));
    removeIfPresent(join(stageDirectory, 'src', `${name}.ts.uid`));
    removeIfPresent(join(stageDirectory, GODOTJS_OUTPUT, 'src', `${name}.js`));
  }
  for (const scene of plan.removedScenes) {
    removeIfPresent(join(stageDirectory, scene));
    removeIfPresent(join(stageDirectory, `${scene}.uid`));
  }
  for (const map of sourceMapsUnder(join(stageDirectory, GODOTJS_OUTPUT))) removeIfPresent(map);
  return stageDirectory;
}

/** What is wrong with a release pack's file list: a source map, a script bundle or remap that is not a release script, a removed scene. */
export function releasePackViolations(entries, plan) {
  const keptScripts = new Set(plan.keptScripts);
  const violations = [];
  for (const { path } of entries) {
    if (path.endsWith('.map')) violations.push(`${path}: a source map`);
    else if (path.startsWith(`${GODOTJS_OUTPUT}/`) && path.endsWith('.js')) {
      const stem = path.slice(path.lastIndexOf('/') + 1, -'.js'.length);
      if (!keptScripts.has(stem)) violations.push(`${path}: a compiled script that is not a release script`);
    } else if (path.startsWith('src/') && path.endsWith('.ts.remap')) {
      const stem = path.slice('src/'.length, -'.ts.remap'.length);
      if (!keptScripts.has(stem)) violations.push(`${path}: the remap of a script that is not a release script`);
    } else if (plan.removedScenes.some(scene => path === `${scene}.remap` || path.endsWith(`-${scene.replace(/\.tscn$/u, '')}.scn`))) {
      violations.push(`${path}: a scene that exists for verification`);
    }
  }
  const present = new Set(entries.map(entry => entry.path));
  for (const name of plan.keptScripts) {
    if (!present.has(`src/${name}.ts.remap`)) violations.push(`src/${name}.ts.remap: missing, the release script ${name} is not in the pack`);
    if (!present.has(`${GODOTJS_OUTPUT}/src/${name}.js`)) violations.push(`${GODOTJS_OUTPUT}/src/${name}.js: missing, the release script ${name} is not in the pack`);
  }
  return violations;
}

/** Read the pack at `packPath` and throw, naming every offender, unless it holds exactly what the release should. Returns its entries. */
export function assertReleasePack(packPath, plan) {
  const entries = readPackEntries(packPath);
  const violations = releasePackViolations(entries, plan);
  if (violations.length > 0) {
    throw new Error(`${relative(process.cwd(), packPath)} is not a release pack (${violations.length} problems):\n  ${violations.slice(0, 20).join('\n  ')}`);
  }
  return entries;
}
