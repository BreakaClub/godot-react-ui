// The real native renderer rejects an entire commit if any style layer carries a key outside `StyleSpec`
// (native/props.rs: `#[serde(deny_unknown_fields)]` on StyleSpec, around line 447). The JS side (src/styles.ts compileStyle) does
// not check keys, and tests/recording-host.ts does not either. This reads the field list from the Rust source and applies the same
// rule to every style in a recorded tree, so a probe can say "native would have refused this commit" without a Godot run.
import fs from 'node:fs';
import path from 'node:path';
import type { NativeSnapshotNode } from '../../../../src/native';

const propsRs = path.join(__dirname, '../../../../native/props.rs');

function camel(snake: string): string {
  return snake.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

/** Field names of `pub struct StyleSpec`, camelCased as serde does (rename_all = camelCase). */
export function nativeStyleKeys(): Set<string> {
  const source = fs.readFileSync(propsRs, 'utf8');
  const start = source.indexOf('pub struct StyleSpec');
  const end = source.indexOf('\n}', start);
  const keys = new Set<string>();
  for (const match of source.slice(start, end).matchAll(/^\s*pub ([a-z_0-9]+):/gm)) keys.add(camel(match[1]));
  return keys;
}

interface StyleLayerLike { readonly style: Record<string, unknown> }

/** Style keys on the nodes that native would reject, with how many nodes carry each. */
export function rejectedStyleKeys(nodes: readonly NativeSnapshotNode[]): Map<string, number> {
  const allowed = nativeStyleKeys();
  const rejected = new Map<string, number>();
  for (const node of nodes) {
    const style = node.props.style as { layers?: StyleLayerLike[] } | undefined;
    for (const layer of style?.layers ?? []) {
      for (const key of Object.keys(layer.style)) {
        if (!allowed.has(key)) rejected.set(key, (rejected.get(key) ?? 0) + 1);
      }
    }
  }
  return rejected;
}
