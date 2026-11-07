import assert from 'node:assert/strict';
import test from 'node:test';
import { EditorSelection } from '@codemirror/state';
import { Keymap, chordNames, normalizeKeyName, type KeyChord, type Platform } from '../demo/src/editor/keymap';
import { keyEvent, openEditor } from './editor-helpers';

// The key table (demo/src/editor/keymap.ts): CodeMirror's bindings, matched against the fields of a `UIKeyboardEvent`.

test('key names are normalised as CodeMirror does: Shift, Meta, Ctrl, Alt, then the key; Mod is Cmd on macOS and Ctrl elsewhere', () => {
  assert.equal(normalizeKeyName('Shift-Alt-ArrowUp', 'mac'), 'Shift-Alt-ArrowUp');
  assert.equal(normalizeKeyName('Alt-Shift-ArrowUp', 'mac'), 'Shift-Alt-ArrowUp');
  assert.equal(normalizeKeyName('Mod-z', 'mac'), 'Meta-z');
  assert.equal(normalizeKeyName('Mod-z', 'other'), 'Ctrl-z');
  assert.equal(normalizeKeyName('Mod-Alt-\\', 'other'), 'Ctrl-Alt-\\');
  assert.equal(normalizeKeyName('Space', 'mac'), ' ');
  assert.throws(() => normalizeKeyName('Hyper-a', 'mac'), /Unrecognized modifier/u);
});

function chord(key: string, code: string, modifiers: Partial<Pick<KeyChord, 'shiftKey' | 'ctrlKey' | 'altKey' | 'metaKey'>> = {}): KeyChord {
  return { key, code, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, ...modifiers };
}

test('a character key is a command only with Ctrl, Alt or Cmd down, and the layout cannot change which key it is', () => {
  assert.deepEqual(chordNames(chord('a', 'KeyA'), 'mac'), []);
  assert.deepEqual(chordNames(chord('A', 'KeyA', { shiftKey: true }), 'mac'), []);
  assert.ok(chordNames(chord('z', 'KeyZ', { metaKey: true }), 'mac').includes('Meta-z'));
  // Cmd+Shift+Z: the layout says "Z", the physical key says z.
  assert.ok(chordNames(chord('Z', 'KeyZ', { metaKey: true, shiftKey: true }), 'mac').includes('Shift-Meta-z'));
  // A layout whose slash needs Shift is still the slash key.
  assert.ok(chordNames(chord('?', 'Slash', { ctrlKey: true, shiftKey: true }), 'other').includes('Shift-Ctrl-/'));
  assert.deepEqual(chordNames(chord('å', 'KeyA', { altKey: true }), 'mac'), [], 'on macOS Alt+a types a character');
  assert.ok(chordNames(chord('a', 'KeyA', { altKey: true }), 'other').length > 0, 'elsewhere Alt+a can be a command');
  assert.deepEqual(chordNames(chord('a', 'KeyA', { altKey: true, ctrlKey: true }), 'other'), [], 'Ctrl+Alt is AltGr on Windows');
});

test('a named key is itself, with Shift in front when Shift is down', () => {
  assert.deepEqual(chordNames(chord('ArrowLeft', 'ArrowLeft'), 'mac'), ['ArrowLeft']);
  assert.deepEqual(chordNames(chord('ArrowLeft', 'ArrowLeft', { shiftKey: true, altKey: true }), 'mac'), ['Shift-Alt-ArrowLeft']);
});

for (const platform of ['mac', 'other'] as const satisfies readonly Platform[]) {
  test(`${platform}: no key is bound twice`, () => {
    assert.deepEqual(new Keymap(platform).overridden, []);
  });
}

test('the word jump is on Alt on macOS and on Ctrl elsewhere', () => {
  const mac = new Keymap('mac');
  const other = new Keymap('other');
  assert.ok(mac.lookup(keyEvent('ArrowLeft', { alt: true })));
  assert.ok(other.lookup(keyEvent('ArrowLeft', { ctrl: true })));
  // The same keys are other commands on the other platform: Ctrl+Left is not a word jump on macOS, Alt+Left is a syntax jump elsewhere.
  const macWord = mac.lookup(keyEvent('ArrowLeft', { alt: true }));
  const otherSyntax = other.lookup(keyEvent('ArrowLeft', { alt: true }));
  assert.ok(macWord !== undefined && otherSyntax !== undefined && macWord !== otherSyntax);
});

const SELECTION_KINDS = ['caret at the start', 'caret in the middle', 'caret at the end', 'a selection over everything', 'three carets'] as const;

function selectionOf(kind: (typeof SELECTION_KINDS)[number], length: number): EditorSelection {
  const middle = Math.floor(length / 2);
  switch (kind) {
    case 'caret at the start': return EditorSelection.single(0);
    case 'caret in the middle': return EditorSelection.single(middle);
    case 'caret at the end': return EditorSelection.single(length);
    case 'a selection over everything': return EditorSelection.single(0, length);
    case 'three carets': return EditorSelection.create([...new Set([0, middle, length])].map(at => EditorSelection.cursor(at)));
  }
}

test('every command the keymap binds runs against the view stand-in, on every platform, in every kind of document', () => {
  const documents = [
    'function f() {\n  return 1;\n}\n\nconst a = [1, 2, 3];\nexport default f;\n',
    '',
    'one',
    'x\n'.repeat(80),
  ];
  let ran = 0;
  for (const platform of ['mac', 'other'] as const) {
    for (const doc of documents) {
      for (const kind of SELECTION_KINDS) {
        for (const [name, handler] of new Keymap(platform).entries()) {
          const editor = openEditor(doc, platform);
          editor.editor.setSelection(selectionOf(kind, doc.length));
          assert.doesNotThrow(() => handler.command(editor.editor.commandContext()), `${platform} ${name} on ${JSON.stringify(doc.slice(0, 12))} with ${kind}`);
          ran += 1;
        }
      }
    }
  }
  assert.ok(ran > 1000, `ran ${ran} commands`);
});
