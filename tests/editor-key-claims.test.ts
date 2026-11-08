import assert from 'node:assert/strict';
import test from 'node:test';
import { editorKeyClaims } from '../demo/src/editor/key-claims';
import { Keymap, type Platform } from '../demo/src/editor/keymap';
import { anyChordMatches, parseKeyChords, type KeyPress } from '../src/key-claims';

// The chords the editor claims (demo/src/editor/key-claims.ts) are made from its key table, so the browser keeps none of what the editor does.

function press(key: string, code: string, modifiers: Partial<KeyPress> = {}): KeyPress {
  return { key, code, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, ...modifiers };
}

function claimed(platform: Platform, event: KeyPress): boolean {
  return anyChordMatches(parseKeyChords(editorKeyClaims(new Keymap(platform))), event, platform);
}

test('every row of the editor\'s key table is a chord that reads', () => {
  for (const platform of ['mac', 'other'] as const) {
    const keymap = new Keymap(platform);
    const claims = editorKeyClaims(keymap);
    assert.equal(claims.length, keymap.entries().length);
    assert.doesNotThrow(() => parseKeyChords(claims), platform);
  }
});

test('the editor claims what it does with a key, on a Mac and elsewhere', () => {
  const macCmd = (key: string, code: string, shiftKey = false) => press(key, code, { metaKey: true, shiftKey });
  const ctrl = (key: string, code: string, shiftKey = false) => press(key, code, { ctrlKey: true, shiftKey });
  // Cmd+L selects a line, Cmd+D the next occurrence, Cmd+Z and Cmd+Shift+Z undo and redo, Cmd+C and Cmd+X copy and cut.
  for (const [key, code] of [['l', 'KeyL'], ['d', 'KeyD'], ['z', 'KeyZ'], ['c', 'KeyC'], ['x', 'KeyX'], ['a', 'KeyA'], ['/', 'Slash'], ['[', 'BracketLeft']] as const) {
    assert.equal(claimed('mac', macCmd(key, code)), true, `Cmd+${key}`);
    assert.equal(claimed('other', ctrl(key, code)), true, `Ctrl+${key}`);
  }
  assert.equal(claimed('mac', macCmd('Z', 'KeyZ', true)), true, 'redo');
  assert.equal(claimed('mac', macCmd('ArrowLeft', 'ArrowLeft')), true, 'Cmd+Left is the line start');
  assert.equal(claimed('mac', press('ArrowLeft', 'ArrowLeft', { altKey: true })), true, 'Option+Left is a word');
  assert.equal(claimed('other', ctrl('ArrowLeft', 'ArrowLeft')), true, 'Ctrl+Left is a word');
  assert.equal(claimed('mac', press('Tab', 'Tab')), true, 'Tab indents');
});

test('the editor does not claim what a browser has and the editor does not', () => {
  // Reload, new tab, find, address bar, tools, and the zoom keys.
  for (const [key, code] of [['r', 'KeyR'], ['t', 'KeyT'], ['n', 'KeyN'], ['w', 'KeyW'], ['p', 'KeyP'], ['s', 'KeyS'], ['=', 'Equal'], ['0', 'Digit0']] as const) {
    assert.equal(claimed('mac', press(key, code, { metaKey: true })), false, `Cmd+${key}`);
    assert.equal(claimed('other', press(key, code, { ctrlKey: true })), false, `Ctrl+${key}`);
  }
  assert.equal(claimed('mac', press('F5', 'F5')), false);
  assert.equal(claimed('mac', press('F12', 'F12')), false);
  assert.equal(claimed('mac', press('Tab', 'Tab', { ctrlKey: true })), false, 'Ctrl+Tab switches tabs');
});
