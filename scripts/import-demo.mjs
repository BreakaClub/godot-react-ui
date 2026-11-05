import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

/** Godot discovers addons/imports through the editor on a fresh checkout. */
export function importDemo(godot) {
  const project = resolve(import.meta.dirname, '../demo');
  const result = spawnSync(godot, ['--headless', '--audio-driver', 'Dummy', '--editor', '--import', '--path', project], {
    stdio: 'inherit', timeout: 120_000,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Godot demo import failed (${result.status})`);
}
