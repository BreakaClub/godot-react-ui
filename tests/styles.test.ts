import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveStyles, StyleSheet } from '../src/styles';

test('spacing expands shorthands in composition order', () => {
  assert.deepEqual(resolveStyles('p-6 px-3 pl-1 gap-4 gap-y-2'), {
    paddingTop: 24, paddingRight: 12, paddingBottom: 24, paddingLeft: 4,
    rowGap: 8, columnGap: 16,
  });
  assert.equal(resolveStyles('pl-8 p-2').paddingLeft, 8);
  assert.equal(resolveStyles('p-6 pl-8', { padding: 2 }).paddingLeft, 2);
});

test('responsive grid recomposes in logical pixels and drops old state', () => {
  const classes = 'grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4';
  assert.equal(resolveStyles(classes, undefined, { width: 600 }).gridTemplateColumns, 2);
  assert.equal(resolveStyles(classes, undefined, { width: 768 }).gridTemplateColumns, 3);
  assert.equal(resolveStyles(classes, undefined, { width: 1120 }).gridTemplateColumns, 4);
  assert.equal(resolveStyles(classes, undefined, { width: 600 }).gridTemplateColumns, 2);
  assert.equal(resolveStyles('hidden md:flex', undefined, { width: 1120 }).display, 'flex');
});

test('state variants combine and restore base paint', () => {
  const classes = 'bg-white hover:bg-indigo-50 md:hover:bg-indigo-100 active:bg-indigo-600 disabled:opacity-50';
  assert.equal(resolveStyles(classes, undefined, { width: 600, hover: true }).backgroundColor, '#eef2ff');
  assert.equal(resolveStyles(classes, undefined, { width: 1000, hover: true }).backgroundColor, '#e0e7ff');
  assert.equal(resolveStyles(classes, undefined, { width: 1000, hover: true, active: true }).backgroundColor, '#4f46e5');
  assert.equal(resolveStyles(classes, undefined, { width: 1000 }).backgroundColor, '#ffffff');
  assert.equal(resolveStyles(classes, undefined, { width: 1000, disabled: true }).opacity, 0.5);
});

test('supported arbitrary values remain typed native values', () => {
  assert.deepEqual(resolveStyles('w-[50%] h-[123px] min-w-0 max-w-xl text-[23px] bg-[#1234] rounded-[9px]'), {
    width: '50%', height: 123, minWidth: 0, maxWidth: 576,
    fontSize: 23, backgroundColor: '#1234', borderRadius: 9,
  });
  assert.equal(resolveStyles('w-1/2').width, '50%');
  assert.equal(resolveStyles('w-auto').width, 'auto');
});

test('stylesheets preserve identity, freeze definitions and compose nested arrays', () => {
  const source = { card: { padding: 24, backgroundColor: '#fff' as const } };
  const sheet = StyleSheet.create(source);
  assert.equal(sheet, source);
  assert.equal(sheet.card, source.card);
  assert.ok(Object.isFrozen(sheet));
  assert.ok(Object.isFrozen(sheet.card));
  assert.deepEqual(resolveStyles('p-1', [sheet.card, false, null, [undefined, { paddingLeft: 8 }]]), {
    paddingTop: 24, paddingRight: 24, paddingBottom: 24, paddingLeft: 8, backgroundColor: '#fff',
  });
});

test('unsupported styles fail before interaction instead of silently disappearing', () => {
  for (const utility of [
    'hover:shadow-xl', 'md:bg-missing-500', 'dark:bg-white', 'p-[calc(1px)]',
    'w-[NaN%]', 'w-1/0', 'text-[0px]', 'text-[1.5px]', 'bg-[#12]',
    'grid-cols-0', 'opacity-101', 'hover:', 'p-Infinity',
    'toString', 'bg-toString', 'max-w-constructor', `w-[${'9'.repeat(400)}%]`,
  ]) {
    assert.throws(() => resolveStyles(utility, undefined, { width: 0 }), /Unsupported|Invalid/);
  }
  assert.throws(() => resolveStyles('', undefined, { width: Number.NaN }), /finite/);
});
