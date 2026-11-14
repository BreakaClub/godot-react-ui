import './setup';
import assert from 'node:assert/strict';
import test from 'node:test';
import { PLAIN_TEXT_COLOR, SYNTAX_COLORS } from '../demo/src/editor/highlight';
import { highlightShell, highlightTsx } from '../demo/src/project-pages';

// The colouring of the project pages' code blocks (demo/src/project-pages.tsx): the code editor's parser and palette, for code that never changes.

const SAMPLE = `import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return <View className="gap-4">{count}</View>;
}`;

/** The colour of the first segment whose text is `text`. */
function colourOf(segments: ReturnType<typeof highlightTsx>, text: string): string | undefined {
  return segments.find(segment => segment.text === text)?.color;
}

test('TSX is cut into stretches that spell the code exactly, coloured as the code editor colours it', () => {
  const segments = highlightTsx(SAMPLE);
  assert.equal(segments.map(segment => segment.text).join(''), SAMPLE);
  assert.equal(colourOf(segments, 'import'), SYNTAX_COLORS.keyword);
  assert.equal(colourOf(segments, 'export'), SYNTAX_COLORS.keyword);
  assert.equal(colourOf(segments, "'react'"), SYNTAX_COLORS.string);
  assert.equal(colourOf(segments, '"gap-4"'), SYNTAX_COLORS.string);
  assert.equal(colourOf(segments, '0'), SYNTAX_COLORS.number);
  assert.equal(colourOf(segments, 'View'), SYNTAX_COLORS.tag);
  assert.equal(colourOf(segments, 'className'), SYNTAX_COLORS.attribute);
  assert.ok(segments.some(segment => segment.color === PLAIN_TEXT_COLOR), 'white space and plain names stay plain');
});

test('a shell command colours its program and its options, and keeps every character', () => {
  const commands = 'pnpm add react@19.2.0 godot-react-ui\npnpm exec godot-react-ui setup --project-dir path/to/project';
  const segments = highlightShell(commands);
  assert.equal(segments.map(segment => segment.text).join(''), commands);
  assert.deepEqual(segments.filter(segment => segment.text === 'pnpm').map(segment => segment.color), [SYNTAX_COLORS.function, SYNTAX_COLORS.function]);
  assert.equal(colourOf(segments, '--project-dir'), SYNTAX_COLORS.attribute);
  assert.equal(colourOf(segments, 'setup'), PLAIN_TEXT_COLOR);
});
