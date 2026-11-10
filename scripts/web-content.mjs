import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
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
 * The directory Godot keeps its export templates in, for the version directory `GODOT_VERSION_FULL_CONFIG` (core/version.h): beside the executable
 * in self-contained mode (a `._sc_` or `_sc_` file there, or beside the `.app` on macOS), otherwise in the system's data directory for Godot
 * (`EditorPaths::EditorPaths`, editor/file_system/editor_paths.cpp; `OS::get_data_path` and `get_godot_dir_name` of each platform).
 */
function exportTemplatesDirectory(executable, env = process.env, platform = process.platform) {
  const executableDirectory = dirname(executable);
  const candidates = [executableDirectory];
  if (platform === 'darwin' && executableDirectory.endsWith('/Contents/MacOS')) candidates.push(resolve(executableDirectory, '../../..'));
  for (const directory of candidates) {
    if (existsSync(join(directory, '._sc_')) || existsSync(join(directory, '_sc_'))) return join(directory, 'editor_data', 'export_templates');
  }
  const home = env.HOME ?? homedir();
  if (platform === 'darwin') return join(home, 'Library', 'Application Support', 'Godot', 'export_templates');
  if (platform === 'win32') {
    if (!env.APPDATA) throw new Error('APPDATA is not set, so the directory Godot installs export templates in is unknown.');
    return join(env.APPDATA, 'Godot', 'export_templates');
  }
  return join(env.XDG_DATA_HOME || join(home, '.local', 'share'), 'godot', 'export_templates');
}

/**
 * The directory name Godot installs a version's export templates under, `GODOT_VERSION_FULL_CONFIG` (`4.7.2.stable`, `4.7.2.stable.mono`), from the
 * line `godot --version` prints: `GODOT_VERSION_FULL_BUILD` (the configuration and the build name, `custom_build` or `official`) and the commit hash
 * when the build has one (main/main.cpp).
 */
export function templateVersionOf(version) {
  const parts = version.trim().split('.');
  if (/^[0-9a-f]{7,}$/u.test(parts.at(-1) ?? '')) parts.pop();
  // Number, status and the build name at least.
  const CONFIG_AND_BUILD_PARTS = 3;
  if (parts.length <= CONFIG_AND_BUILD_PARTS) throw new Error(`"${version}" is not a Godot version line (number.status.build[.hash]).`);
  parts.pop();
  return parts.join('.');
}

/**
 * The engine template a Web export in `mode` is made with, chosen the way Godot's Web exporter chooses it (`EditorExportPlatformWeb::export_project`,
 * platform/web/export/export_plugin.cpp): the preset's `custom_template/<mode>` when it names one, otherwise the template Godot installed for its
 * version, `web_dlink_<mode>.zip` (both presets here export with extensions and threads: `_get_template_name`, export_plugin.h). `executable` is the
 * Godot binary that exports and `version` returns its `--version` line; neither is used when the preset names its template.
 */
export function webTemplate({ root, presetName, mode, executable, version }) {
  const custom = presetTemplate(readFileSync(resolve(root, 'demo/export_presets.cfg'), 'utf8'), presetName, mode);
  if (custom) return custom;
  if (executable === undefined || version === undefined) {
    throw new Error(`The "${presetName}" export preset names no ${mode} template, and no Godot was given to find the one it installed.`);
  }
  return join(exportTemplatesDirectory(executable), templateVersionOf(version()), `web_dlink_${mode}.zip`);
}

/**
 * The content inputs of the Web export in `mode` for the preset `presetName`: every source file, and the engine template zip
 * the export uses (`webTemplate`, as `template:<path>`; a missing template is an error, not an absent input).
 */
export function webContentInputs({ root, presetName, mode, executable, version }) {
  const template = webTemplate({ root, presetName, mode, executable, version });
  if (!existsSync(template)) throw new Error(`The ${mode} template of the "${presetName}" export preset does not exist: ${template}`);
  const templateHash = createHash('sha256').update(readFileSync(template)).digest('hex');
  return collectContentInputs({ root, paths: webSourcePaths(root), extra: { [`template:${template}`]: templateHash }, features: [mode] });
}
