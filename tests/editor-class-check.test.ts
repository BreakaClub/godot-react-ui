import assert from 'node:assert/strict';
import test from 'node:test';
import { findUnsupportedClasses } from '../demo/src/editor/class-check';

// The classes written in a text that the library has no utility for (demo/src/editor/class-check.ts), which it would throw for when the page rendered.

const names = (text: string): string[] => findUnsupportedClasses(text).map(problem => problem.name);

test('a class the library has is not a problem, whatever its variants', () => {
  assert.deepEqual(names('<View className="p-4 bg-emerald-100 hover:bg-sky-100 md:flex w-[240px] rounded-lg" />'), []);
});

test('a partial class is, with the offsets of exactly that class', () => {
  const text = '<View className="p-4 bg-e gap-3" />';
  const [problem] = findUnsupportedClasses(text);
  assert.ok(problem);
  assert.equal(text.slice(problem.from, problem.to), 'bg-e');
  assert.equal(problem.name, 'bg-e');
});

test('every literal form of an attribute ending in className is read, and a computed class is not', () => {
  assert.deepEqual(names('<View className=\'nope-1\' contentClassName="nope-2" inputClassName={"nope-3"} boxClassName={\'nope-4\'} labelClassName={`nope-5`} />'),
    ['nope-1', 'nope-2', 'nope-3', 'nope-4', 'nope-5']);
  assert.deepEqual(names('<View className={`p-4 ${size}`} className={cn("nope-6")} style={{}} />'), []);
});

test('a text with several problems lists them in the order of the text, and the same class twice twice', () => {
  const found = findUnsupportedClasses('<A className="bad-1 p-4 bad-2" />\n<B className="bad-1" />');
  assert.deepEqual(found.map(problem => problem.name), ['bad-1', 'bad-2', 'bad-1']);
  assert.ok(found[0] !== undefined && found[1] !== undefined && found[2] !== undefined && found[0].from < found[1].from && found[1].from < found[2].from);
});

test('text with no className is nothing', () => {
  assert.deepEqual(names('const a = 1;\n// className="nope"'), ['nope'], 'a comment that looks like an attribute is read as one: the class check is on the text, not the parse');
  assert.deepEqual(names('const a = 1;'), []);
});
