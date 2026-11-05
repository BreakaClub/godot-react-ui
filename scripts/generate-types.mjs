import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const godot = process.env.GODOT ?? '/Applications/Godot48.app/Contents/MacOS/Godot';
for (const [command, args] of [
  ['pnpm', ['build']],
  [godot, ['--headless', '--audio-driver', 'Dummy', '--editor', '--generate-types', '--path', resolve(root, 'demo')]],
]) {
  const result = spawnSync(command, args, {cwd:root, stdio:'inherit', timeout:120_000});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
