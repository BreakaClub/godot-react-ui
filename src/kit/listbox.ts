/**
 * The parts of a listbox that need no React: stepping over disabled items and the type-ahead search.
 * `Select` uses them; they follow the WAI-ARIA Authoring Practices (listbox, select-only combobox).
 */

/** How long a pause ends a type-ahead search (Radix's value; the practices leave it open). */
export const TYPE_AHEAD_RESET_MS = 1000;

/**
 * The enabled item `direction` steps from `from`, without wrapping (a listbox stops at its ends), or
 * `undefined` when there is none. `from` is -1 when no item is focused: stepping forward then finds the
 * first enabled item and stepping back the last.
 */
export function stepEnabled(
  items: readonly { readonly disabled: boolean }[], from: number, direction: 1 | -1,
): number | undefined {
  const start = from === -1 && direction === -1 ? items.length : from;
  for (let index = start + direction; index >= 0 && index < items.length; index += direction) {
    if (items[index]?.disabled === false) return index;
  }
  return undefined;
}

/** The first enabled item, or the last. */
export function edgeEnabled(items: readonly { readonly disabled: boolean }[], edge: 'first' | 'last'): number | undefined {
  return edge === 'first' ? stepEnabled(items, -1, 1) : stepEnabled(items, items.length, -1);
}

/**
 * The item a type-ahead `search` selects, or `undefined`: the first enabled item, from `current` on and
 * wrapping, whose label starts with it (case ignored). A one-letter search moves on from the current item,
 * so typing the same letter again walks the items that start with it; a search of one letter repeated
 * (`"aaa"`) is that one letter; a longer search may stay on the current item, so typing `ba` on `banana`
 * keeps it. `current` is -1 when no item is focused.
 */
export function typeAheadMatch(
  items: readonly { readonly label: string; readonly disabled: boolean }[], current: number, search: string,
): number | undefined {
  const characters = [...search];
  const first = characters[0];
  if (first === undefined) return undefined;
  const repeated = characters.length > 1 && characters.every((character) => character === first);
  const needle = (repeated ? first : search).toLowerCase();
  const skipCurrent = current !== -1 && [...needle].length === 1;
  const start = current === -1 ? 0 : current;
  for (let offset = skipCurrent ? 1 : 0; offset < items.length; offset += 1) {
    const index = (start + offset) % items.length;
    const item = items[index];
    if (item !== undefined && !item.disabled && item.label.toLowerCase().startsWith(needle)) return index;
  }
  return undefined;
}
