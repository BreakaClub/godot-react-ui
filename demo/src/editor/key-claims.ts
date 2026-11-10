import type { Keymap } from './keymap';

/**
 * The chords the editor handles, as `keyClaims` spells them. On the Web a chord nothing claims goes to the
 * browser, and the editor's `onKeyDown` never sees it: Cmd+L would focus the address bar instead of selecting a line, and Cmd+D would bookmark
 * the page instead of selecting the next occurrence. So every row of the key table the controller looks keys up in is claimed, and nothing else:
 * the table is the editor's one list of what it does with a key, and the claims are made from it, not written beside it.
 */
export function editorKeyClaims(keymap: Keymap): readonly string[] {
  return keymap.entries().map(([name]) => chordText(name));
}

/** A table name (`Shift-Meta-Ctrl-Alt-` and then the key, as `normalizeKeyName` writes it) as a chord. The key may itself be `-`. */
const NAME_SEPARATOR = /-(?!$)/u;

function chordText(name: string): string {
  const parts = name.split(NAME_SEPARATOR);
  const key = parts.pop() ?? '';
  return [...parts, keyText(key)].join('+');
}

/** The key as a chord spells it: a space is `Space` and the plus key is `Plus`, because `+` separates the parts. */
function keyText(key: string): string {
  if (key === ' ') return 'Space';
  if (key === '+') return 'Plus';
  return key;
}
