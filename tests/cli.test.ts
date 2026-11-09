import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const root = resolve(__dirname, '..');
const cliPath = resolve(root, 'bin', 'cli.mjs');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

test('cli --help prints usage and exits 0', () => {
  const result = spawnSync('node', [cliPath, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /godot-react-ui v\d+\.\d+\.\d+ CLI/);
  assert.match(result.stdout, /godot-react-ui setup/);
});

test('cli setup without project.godot fails with exit 1', () => {
  const emptyDir = join(tmpdir(), `godot-cli-test-empty-${Date.now()}`);
  mkdirSync(emptyDir, { recursive: true });
  try {
    const result = spawnSync('node', [cliPath, 'setup', '--project-dir', emptyDir], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Could not locate 'project\.godot'/);
  } finally {
    rmSync(emptyDir, { recursive: true, force: true });
  }
});

test('cli --postinstall without project.godot exits 0 cleanly', () => {
  const emptyDir = join(tmpdir(), `godot-cli-test-postinstall-${Date.now()}`);
  mkdirSync(emptyDir, { recursive: true });
  try {
    const result = spawnSync('node', [cliPath, '--postinstall'], {
      encoding: 'utf8',
      env: { ...process.env, INIT_CWD: emptyDir },
    });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /No project\.godot found/);
  } finally {
    rmSync(emptyDir, { recursive: true, force: true });
  }
});

test('cli setup in a mock Godot project installs addon, writes .version and ensures .gdignore', () => {
  const mockDir = join(tmpdir(), `godot-cli-test-project-${Date.now()}`);
  const mockNodeModules = join(mockDir, 'node_modules');
  mkdirSync(mockNodeModules, { recursive: true });
  writeFileSync(join(mockDir, 'project.godot'), '; Godot Project Config\n');

  try {
    // 1. Initial setup
    const result = spawnSync('node', [cliPath, 'setup', '--project-dir', mockDir], { encoding: 'utf8' });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Installed GDExtension/);
    assert.match(result.stdout, /Created node_modules\/\.gdignore/);

    const targetAddon = join(mockDir, 'addons', 'godot-react-ui');
    assert.ok(existsSync(join(targetAddon, 'react_ui.gdextension')));
    assert.ok(existsSync(join(targetAddon, '.version')));
    assert.equal(readFileSync(join(targetAddon, '.version'), 'utf8'), pkg.version);
    assert.ok(existsSync(join(mockNodeModules, '.gdignore')));

    // 2. Idempotent second run
    const secondResult = spawnSync('node', [cliPath, 'setup', '--project-dir', mockDir], { encoding: 'utf8' });
    assert.equal(secondResult.status, 0);
    assert.match(secondResult.stdout, /Addon is already up to date/);

    // 3. Forced re-run
    const forcedResult = spawnSync('node', [cliPath, 'setup', '--project-dir', mockDir, '--force'], { encoding: 'utf8' });
    assert.equal(forcedResult.status, 0);
    assert.match(forcedResult.stdout, /Installed GDExtension/);
  } finally {
    rmSync(mockDir, { recursive: true, force: true });
  }
});
