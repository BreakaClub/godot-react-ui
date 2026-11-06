import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { scrubOpenScripts } from './editor-session.mjs';

/** Godot discovers addons/imports through the editor on a fresh checkout. */
export function importDemo(godot) {
  const project = resolve(import.meta.dirname, '../demo');
  // The editor rewrites a TypeScript file it has open (scripts/editor-session.mjs).
  scrubOpenScripts(project);
  const result = spawnSync(godot, ['--headless', '--audio-driver', 'Dummy', '--editor', '--import', '--path', project], {
    stdio: 'inherit', timeout: 120_000,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Godot demo import failed (${result.status})`);
}
