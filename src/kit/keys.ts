import type { UIKeyboardEvent } from '../events';

/** DOM `key` values (plan Appendix B) for the keys the kit handles. Enter and Space activate buttons natively. */
export const Key = {
  Enter: 'Enter',
  Escape: 'Escape',
  Tab: 'Tab',
  Space: ' ',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  Home: 'Home',
  End: 'End',
  Backspace: 'Backspace',
  Delete: 'Delete',
} as const;

/**
 * A chord with Ctrl, Alt or Meta is a shortcut for the platform or the game, not a keyboard
 * interaction with the control (the same rule native applies to Tab, D19d).
 */
export function hasShortcutModifier(event: Pick<UIKeyboardEvent, 'ctrlKey' | 'altKey' | 'metaKey'>): boolean {
  return event.ctrlKey || event.altKey || event.metaKey;
}
