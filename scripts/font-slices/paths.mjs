import { copyFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LICENSE_FILE, MANIFEST_FILE } from './manifest.mjs';

// Where the font slices are, and how a Web export gets the part of them that belongs to it.
//
// `scripts/build-font-slices.mjs` writes `artifacts/font-slices/dist`: the manifest and the licence, which are release files, and `o/<hash>/<name>`, the
// content-addressed slices and indexes, which are not part of any release. A Web export carries the manifest and the licence beside its page (the
// release is the unit the manifest belongs to: it is published with it, and the page reads it by a relative address); the slices are served at `/o/` by
// the site, and by `scripts/web-server.mjs` from `dist/o` for a verifier or a person looking at an export.

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const FONT_SLICES_DIRECTORY = join(root, 'artifacts', 'font-slices', 'dist');
export const FONT_SLICE_OBJECTS_DIRECTORY = join(FONT_SLICES_DIRECTORY, 'o');
/** The files of the slice build a Web export carries. */
export const EXPORTED_FONT_FILES = [MANIFEST_FILE, LICENSE_FILE];
export const FONT_SLICES_BUILD_COMMAND = 'node scripts/build-font-slices.mjs';

/** Whether the slice build has been run (its manifest is where it writes it). */
export function fontSlicesBuilt(directory = FONT_SLICES_DIRECTORY) {
  return existsSync(join(directory, MANIFEST_FILE));
}

function hashOf(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/**
 * Put the slice manifest and the licence into the Web export in `output`, or take the copies of an earlier export out when the slices have not been
 * built (Godot copies files into an export and never deletes them, and the receipt must describe what is there). A release export without them would
 * publish a site whose text cannot fall back to a font, so it is an error, with the command that makes them.
 */
export function exportFontSlices({ output, release, directory = FONT_SLICES_DIRECTORY }) {
  if (!fontSlicesBuilt(directory)) {
    for (const name of EXPORTED_FONT_FILES) rmSync(join(output, name), { force: true });
    if (release) throw new Error(`A release export carries the font slice manifest, and there is none: run \`${FONT_SLICES_BUILD_COMMAND}\` first.`);
    console.log(`The font slices are not built, so this export has no ${MANIFEST_FILE}; text with characters no font has stays boxes (run \`${FONT_SLICES_BUILD_COMMAND}\`).`);
    return false;
  }
  for (const name of EXPORTED_FONT_FILES) copyFileSync(join(directory, name), join(output, name));
  return true;
}

/**
 * What is wrong with the font slices an export carries, as sentences: it has a manifest that is not the one the slice build last made (so the slices a
 * server hands out are not the ones the manifest names), or it has none while the build exists. Empty when the export and the build agree.
 */
export function exportedFontSliceProblems(output, directory = FONT_SLICES_DIRECTORY) {
  const exported = join(output, MANIFEST_FILE);
  if (!fontSlicesBuilt(directory)) return existsSync(exported) ? [`${MANIFEST_FILE} is in the export and the slices are not built here (${FONT_SLICES_BUILD_COMMAND})`] : [];
  if (!existsSync(exported)) return [`the export has no ${MANIFEST_FILE}, and the slices are built`];
  if (hashOf(exported) !== hashOf(join(directory, MANIFEST_FILE))) return [`the export's ${MANIFEST_FILE} is not the one the slice build last made`];
  return [];
}
