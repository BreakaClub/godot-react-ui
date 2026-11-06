import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withoutInvalidExportDeclaration } from '../scripts/typings.mjs';

// Upstream GodotJS declares `export function export(...)` in `godot.annotations`, which is not valid TypeScript
// (scripts/typings.mjs). Its declarations use CRLF line endings; a regex written for LF silently removed nothing.
const DECLARATION = [
  '    /** @deprecated Use createClassBinder() instead. */',
  '    export function export(type: Godot.Variant.Type, details?: {',
  '        class?: ClassSpecifier;',
  '        usage?: Godot.PropertyUsageFlags;',
  '    }): (target: any, name: string) => void;',
  '',
].join('\n');
const KEPT = '    /** @deprecated Use createClassBinder() instead. */\n    export function export_(type: Godot.Variant.Type): void;\n';

test('the invalid export declaration is removed with either line ending, and its neighbours stay', () => {
  for (const ending of ['\n', '\r\n']) {
    const source = `${KEPT}${DECLARATION}    const next = 1;\n`.replaceAll('\n', ending);
    const cleaned = withoutInvalidExportDeclaration(source);
    assert.ok(!cleaned.includes('export function export('), JSON.stringify(ending));
    assert.ok(cleaned.includes('export function export_('));
    assert.ok(cleaned.includes('const next = 1;'));
  }
});

test('declarations without it are returned unchanged', () => {
  assert.equal(withoutInvalidExportDeclaration(KEPT), KEPT);
});
