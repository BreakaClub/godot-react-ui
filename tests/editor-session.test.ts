import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { scrubLayoutText, scrubOpenScripts } from '../scripts/editor-session.mjs';

// The guard that keeps TypeScript out of Godot's script editor: the editor rewrites
// the indentation of a script it has open when it saves, and it opens whatever the saved layout lists.

/** A layout in the shape Godot writes, with the script editor's part set by `scriptEditor`. */
function layout(scriptEditor: string, shaderEditor = 'open_scripts=[]\nselected_script=""'): string {
  return `[docks]

dock_3="Scene,Import"

[EditorNode]

open_scenes=PackedStringArray("res://main.tscn")

[ScriptEditor]

${scriptEditor}
open_help=[]
script_split_offset=200
zoom_factor=1.0

[GameView]

floating_window_rect=Rect2i(0, 0, 0, 0)

[ShaderEditor]

${shaderEditor}
open_help=[]
`;
}

test('a layout that lists main.ts loses it and its selection, and nothing else changes', () => {
  const before = layout('open_scripts=["res://src/main.ts"]\nselected_script="res://src/main.ts"');
  const { text, removed } = scrubLayoutText(before);
  assert.deepEqual(removed, ['res://src/main.ts', 'res://src/main.ts']);
  assert.equal(text, layout('open_scripts=[]\nselected_script=""'));
});

test('only TypeScript entries go: other scripts and the selection among them stay, in order', () => {
  const before = layout('open_scripts=["res://a.gd", "res://src/main.ts", "res://b.tsx", "res://c.cs", "res://types.d.ts", "res://UPPER.TS"]\nselected_script="res://c.cs"');
  const { text, removed } = scrubLayoutText(before);
  assert.deepEqual(removed, ['res://src/main.ts', 'res://b.tsx', 'res://types.d.ts', 'res://UPPER.TS']);
  assert.equal(text, layout('open_scripts=["res://a.gd", "res://c.cs"]\nselected_script="res://c.cs"'));
});

test('a value over several lines, and entries that are dictionaries, are read as Godot writes them', () => {
  const before = layout('open_scripts=[{\n"path": "res://src/main.ts",\n"line": 12\n}, "res://keep.gd", {\n"path": "res://keep.cs"\n}]\nselected_script="res://keep.gd"');
  const { text, removed } = scrubLayoutText(before);
  assert.deepEqual(removed, ['res://src/main.ts']);
  assert.equal(text, layout('open_scripts=["res://keep.gd", {\n"path": "res://keep.cs"\n}]\nselected_script="res://keep.gd"'));
});

test('only the script editor is scrubbed: the shader editor and every other section keep their lines', () => {
  const before = layout('open_scripts=[]\nselected_script=""', 'open_scripts=["res://shaders/x.gdshader", "res://odd.ts"]\nselected_script="res://odd.ts"');
  const { text, removed } = scrubLayoutText(before);
  assert.deepEqual(removed, []);
  assert.equal(text, before);
});

test('a layout with no TypeScript is returned byte for byte, and so is one without a script editor section', () => {
  const plain = layout('open_scripts=["res://a.gd"]\nselected_script="res://a.gd"');
  assert.deepEqual(scrubLayoutText(plain), { text: plain, removed: [] });
  assert.deepEqual(scrubLayoutText('[docks]\n\ndock_3="Scene"\n'), { text: '[docks]\n\ndock_3="Scene"\n', removed: [] });
});

test('line endings are kept', () => {
  const before = layout('open_scripts=["res://src/main.ts", "res://a.gd"]\nselected_script="res://src/main.ts"').replaceAll('\n', '\r\n');
  const { text } = scrubLayoutText(before);
  assert.equal(text, layout('open_scripts=["res://a.gd"]\nselected_script=""').replaceAll('\n', '\r\n'));
});

test('a path that only looks like TypeScript in its directory is not TypeScript', () => {
  const before = layout('open_scripts=["res://src.ts/file.gd", "res://notes.txt"]\nselected_script="res://src.ts/file.gd"');
  assert.deepEqual(scrubLayoutText(before), { text: before, removed: [] });
});

test('an array that is not closed is refused, not guessed at', () => {
  assert.throws(() => scrubLayoutText(layout('open_scripts=["res://src/main.ts"\nselected_script=""')), /not closed/);
});

test('the project layout is rewritten in one step, only when it lists TypeScript', () => {
  const project = mkdtempSync(join(tmpdir(), 'editor-session-'));
  const directory = join(project, '.godot/editor');
  mkdirSync(directory, { recursive: true });
  const file = join(directory, 'editor_layout.cfg');
  const messages: string[] = [];
  assert.deepEqual(scrubOpenScripts(project, { log: message => messages.push(message) }), [], 'no layout file: nothing to do');

  writeFileSync(file, layout('open_scripts=["res://src/main.ts"]\nselected_script="res://src/main.ts"'));
  const removed = scrubOpenScripts(project, { log: message => messages.push(message) });
  assert.deepEqual(removed, ['res://src/main.ts', 'res://src/main.ts']);
  assert.equal(readFileSync(file, 'utf8'), layout('open_scripts=[]\nselected_script=""'));
  assert.equal(messages.length, 1);
  assert.match(messages[0] ?? '', /closed res:\/\/src\/main\.ts in the script editor/);
  assert.deepEqual(readdirSync(directory), ['editor_layout.cfg'], 'the staged file was renamed over the layout');

  // A second call finds nothing, writes nothing and says nothing.
  const modified = statSync(file).mtimeMs;
  assert.deepEqual(scrubOpenScripts(project, { log: message => messages.push(message) }), []);
  assert.equal(statSync(file).mtimeMs, modified);
  assert.equal(messages.length, 1);
});
