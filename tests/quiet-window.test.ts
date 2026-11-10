import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LOADED_MARKER, quietLaunch, quietWindowProblem } from '../scripts/quiet-window.mjs';

// The mechanism itself runs inside Godot (scripts/quiet-window/quiet_window.m) has the measurement
// that a run keeps the frontmost application. These tests cover what the runner decides, and open no window.

const library = (): string => '/somewhere/libquiet.dylib';

test('a binary is started as it is, with the library', () => {
  const { command, env } = quietLaunch('/some/godot', { KEEP: '1' }, { platform: 'darwin', library });
  assert.equal(command, '/some/godot');
  assert.equal(env.DYLD_INSERT_LIBRARIES, library());
  assert.equal(env.KEEP, '1');
});

test('the stock launcher script is bypassed, since the system strips the library on the way into /bin/sh', () => {
  // The directories the script would have made are made by the runner: recorded here, so the test makes none on the machine it runs on.
  const made: string[] = [];
  const { command, env } = quietLaunch('/Users/ben/Development/godot-stock/bin/godot-stock', {}, { platform: 'darwin', library, makeDirectory: directory => { made.push(directory); } });
  assert.equal(command, '/Users/ben/Development/godot-stock/bin/godot.macos.editor.arm64');
  assert.equal(env.HOME, '/Users/ben/Development/godot-stock/home');
  assert.equal(env.DYLD_INSERT_LIBRARIES, library());
  assert.deepEqual(made, ['/Users/ben/Development/godot-stock/home/Library/Application Support', '/Users/ben/Development/godot-stock/home/Library/Caches']);
});

test('other platforms start the command unchanged', () => {
  assert.deepEqual(quietLaunch('/some/godot', { A: '1' }, { platform: 'linux', library }), { command: '/some/godot', env: { A: '1' } });
});

test('a run is quiet only if the library said it loaded and nothing went wrong', () => {
  assert.equal(quietWindowProblem(`${LOADED_MARKER} this process cannot take focus\nthe rest of the log`, 'darwin'), undefined);
  assert.match(quietWindowProblem('a log from a launcher that dropped it', 'darwin') ?? '', /without the quiet-window library/u);
  assert.match(quietWindowProblem(`${LOADED_MARKER} x\nQUIET_WINDOW_ACTIVATED the application became active`, 'darwin') ?? '', /became active/u);
  assert.match(quietWindowProblem(`${LOADED_MARKER} x\nQUIET_WINDOW_MISSING GodotWindow canBecomeKeyWindow`, 'darwin') ?? '', /canBecomeKeyWindow/u);
  assert.equal(quietWindowProblem('no marker on another platform', 'linux'), undefined);
});
