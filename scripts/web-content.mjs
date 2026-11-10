import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { collectContentInputs } from './freshness.mjs';

/**
 * What a Web export's pack, HTML shell and engine template are made from, as the freshness guard sees it.
 * `freshness.mjs` covers the Rust side module; the rest of an export is
 * the demo's resources and compiled scripts (the pack), `web-shell.html`, and the engine template zip the preset names. A
 * Web verifier that ran an export older than any of them judged old JavaScript.
 *
 * The inputs are the project's source files: whatever git lists under the directories below, tracked or not, that its
 * ignore rules do not hide (so not `node_modules`, `.godot`, `target`, the installed binaries), without `demo/typings`
 * (the preset excludes it from the pack) and `demo/gen` (a `.gdignore` hides it from the project). The compiled scripts in
 * `demo/.godot` are not inputs: `pnpm build` makes them from these, and the export runs it.
 */
const SOURCE_PATHS = ['src', 'demo', 'package.json', 'pnpm-lock.yaml', 'tsconfig.json', 'scripts/build.mjs'];
const EXCLUDED_PREFIXES = ['demo/typings/', 'demo/gen/'];

/** The `custom_template/<mode>` path of the export preset named `presetName` in `export_presets.cfg`. */
export function presetTemplate(presets, presetName, mode) {
  const sections = presets.split(/^\[(preset\.\d+(?:\.options)?)\]$/mu);
  for (let index = 1; index < sections.length; index += 2) {
    if (sections[index].endsWith('.options') || sections[index + 1].match(/^name="([^"]*)"$/mu)?.[1] !== presetName) continue;
    const options = sections[sections.indexOf(`${sections[index]}.options`) + 1] ?? '';
    return options.match(new RegExp(`^custom_template/${mode}="([^"]+)"$`, 'mu'))?.[1];
  }
  throw new Error(`No export preset named "${presetName}" in export_presets.cfg`);
}

/** The repository-relative source files of the export, in a fixed order. */
export function webSourcePaths(root) {
  let listed;
  try {
    listed = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...SOURCE_PATHS], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    throw new Error(`Cannot list the sources of the Web export with git in ${root}: ${error.message}`);
  }
  return [...new Set(listed.split('\0').filter(path => path !== ''))]
    .filter(path => !EXCLUDED_PREFIXES.some(prefix => path.startsWith(prefix)) && existsSync(resolve(root, path)))
    .sort();
}

/**
 * The content inputs of the Web export in `mode` for the preset `presetName`: every source file, and the engine template zip
 * the preset names (as `template:<path>`; a missing template is an error, not an absent input).
 */
export function webContentInputs({ root, presetName, mode }) {
  const template = presetTemplate(readFileSync(resolve(root, 'demo/export_presets.cfg'), 'utf8'), presetName, mode);
  if (!template) throw new Error(`Missing ${mode} template in the "${presetName}" export preset`);
  if (!existsSync(template)) throw new Error(`The ${mode} template of the "${presetName}" export preset does not exist: ${template}`);
  const templateHash = createHash('sha256').update(readFileSync(template)).digest('hex');
  return collectContentInputs({ root, paths: webSourcePaths(root), extra: { [`template:${template}`]: templateHash }, features: [mode] });
}
