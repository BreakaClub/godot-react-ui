import { diffNativeProps, type NativeKind, type NativeProps, type NativePropsDiff } from './props';

/**
 * The part of a JS instance the commit walk reads. The renderer's own instances (which also carry
 * the full React props with their handlers) satisfy `CommitNode<Self>` with `Self` being themselves.
 */
export interface CommitNode<Self extends CommitNode<Self>> {
  readonly tag: number;
  readonly kind: NativeKind;
  readonly native: NativeProps;
  readonly children: readonly Self[];
}

/** The `commit(layer, payload_json)` payload: only what changed (`native/commit.rs`). */
export interface CommitPayload {
  /** Nodes new to this root, with their full native props. */
  created: { tag: number; kind: NativeKind; props: NativeProps }[];
  /** Mounted nodes whose native props changed: changed keys only, `null` resets a key. */
  updated: { tag: number; props: NativePropsDiff }[];
  /** Every node whose child list changed and every created node with children. Tag 0 is the layer. */
  children: { tag: number; children: number[] }[];
}

/** The layer's own top-level child list, in `CommitPayload.children`. */
export const LAYER_ROOT_TAG = 0;

export interface BuiltCommit<N extends CommitNode<N>> {
  /** `undefined` when nothing native changed: the renderer then makes no native call at all. */
  payload: CommitPayload | undefined;
  /**
   * The instances the walk visited, by tag. They become the committed instances once native
   * accepts the payload (a handler-only change is in here but not in the payload).
   */
  updates: Map<number, N>;
  /** The layer's top-level tags after this commit. */
  rootTags: number[];
  /** Instances the walk entered (not skipped by identity); proportional to the changed paths. */
  visited: number;
}

function tagsOf(nodes: readonly { readonly tag: number }[]): number[] {
  return nodes.map((node) => node.tag);
}

function sameTags(previous: readonly { readonly tag: number }[], next: readonly { readonly tag: number }[]): boolean {
  if (previous === next) return true;
  if (previous.length !== next.length) return false;
  for (let index = 0; index < next.length; index += 1) {
    if (previous[index] !== next[index] && previous[index]?.tag !== next[index]?.tag) return false;
  }
  return true;
}

/**
 * Diff a layer's new tree against what native has committed. Pure, and independent of
 * React: persistent mode clones every ancestor of a changed node, so an instance that is identical
 * (`===`) to its committed one has an unchanged subtree and is skipped whole. The walk therefore
 * visits only the changed paths.
 *
 * Throws if a tag appears twice (a cycle or duplicate child) or an instance changed kind.
 */
export function buildCommit<N extends CommitNode<N>>(
  committed: ReadonlyMap<number, N>,
  previousRootTags: readonly number[],
  rootChildren: readonly N[],
): BuiltCommit<N> {
  const created: CommitPayload['created'] = [];
  const updated: CommitPayload['updated'] = [];
  const children: CommitPayload['children'] = [];
  const updates = new Map<number, N>();
  let visited = 0;

  function visitAll(nodes: readonly N[], previous: readonly N[] | undefined): void {
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      if (node === undefined) continue;
      // Index-aligned identity is the cheap common case for a long list with one changed child.
      if (previous?.[index] === node) continue;
      visit(node);
    }
  }

  function visit(node: N): void {
    if (committed.get(node.tag) === node) return;
    if (updates.has(node.tag)) throw new Error(`UI tree contains node ${node.tag} twice (a cycle or a duplicate child)`);
    visited += 1;
    const previous = committed.get(node.tag);
    updates.set(node.tag, node);
    if (previous === undefined) {
      created.push({ tag: node.tag, kind: node.kind, props: node.native });
      if (node.children.length > 0) children.push({ tag: node.tag, children: tagsOf(node.children) });
    } else {
      if (previous.kind !== node.kind) throw new Error(`UI node ${node.tag} changed kind from ${previous.kind} to ${node.kind}`);
      const diff = diffNativeProps(previous.native, node.native);
      if (diff !== null) updated.push({ tag: node.tag, props: diff });
      if (!sameTags(previous.children, node.children)) children.push({ tag: node.tag, children: tagsOf(node.children) });
    }
    visitAll(node.children, previous?.children);
  }

  visitAll(rootChildren, undefined);
  const rootTags = tagsOf(rootChildren);
  if (rootTags.length !== previousRootTags.length || rootTags.some((tag, index) => tag !== previousRootTags[index])) {
    children.push({ tag: LAYER_ROOT_TAG, children: rootTags });
  }
  const empty = created.length === 0 && updated.length === 0 && children.length === 0;
  return { payload: empty ? undefined : { created, updated, children }, updates, rootTags, visited };
}
