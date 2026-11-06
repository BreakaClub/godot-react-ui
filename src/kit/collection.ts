import { useLayoutEffect, useState } from 'react';
import type { UIHandle } from '../components';

/**
 * `items` in the order their elements stand in the document (`UIHandle.compareDocumentOrder`). A compound
 * component registers its parts as they mount, which is not the order they are shown in once a part was
 * inserted in the middle or a keyed list was reordered; this puts them right. Every item must have an
 * element: one that is registered but not mounted is a bug in the caller, not something to skip.
 */
export function inDocumentOrder<T>(items: readonly T[], handleOf: (item: T) => UIHandle | null): T[] {
  const placed = items.map((item) => {
    const handle = handleOf(item);
    if (handle === null) throw new Error('A registered part has no element, so it has no place in document order');
    return { item, handle };
  });
  placed.sort((left, right) => left.handle.compareDocumentOrder(right.handle));
  return placed.map((entry) => entry.item);
}

function sameItems<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function sameMembers<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((item) => right.includes(item));
}

/**
 * `items` in document order, kept right across commits. The order a render can read is the previous
 * commit's, so after a reorder it is one commit behind; this checks again in a layout effect, once the
 * commit has landed, and renders again only if the order is not the registration order it started as.
 * A group that mounts in the order it is shown therefore costs no extra render.
 */
export function useInDocumentOrder<T>(items: readonly T[], handleOf: (item: T) => UIHandle | null): readonly T[] {
  const [reordered, setReordered] = useState<readonly T[] | null>(null);
  useLayoutEffect(() => {
    // A part that unmounted in this very commit is still in `items` (its removal is a state update that
    // renders next) but its element is gone: leave the order alone, the render that drops it checks again.
    if (items.some((item) => handleOf(item) === null)) return;
    const sorted = inDocumentOrder(items, handleOf);
    const next = sameItems(sorted, items) ? null : sorted;
    setReordered((current) => (current === next || (current !== null && next !== null && sameItems(current, next)) ? current : next));
  });
  // `reordered` describes the items of an earlier render until the effect above has run for this one.
  return reordered !== null && sameMembers(reordered, items) ? reordered : items;
}
