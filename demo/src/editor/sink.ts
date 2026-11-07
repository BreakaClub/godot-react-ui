/**
 * What the editor's text input holds. It is never edited (every `keydown` and `beforeinput` is answered by the controller and
 * prevented), so it always holds this one character and nothing else.
 *
 * A soft keyboard types into a hidden element that holds the text of the focused input and sends all of it with every key
 * (`DisplayServerWeb::_vk_input_text_callback`); an element that held nothing would have nothing for Backspace to delete, and a
 * phone's or tablet's Backspace would reach the editor as nothing at all. With a zero-width space in it, a key arrives as the space
 * and what was typed, and Backspace as an empty text: `decodeSoftKeyboardText` says which.
 */
export const SINK_TEXT = '\u200B';

export type SoftKeyboardInput =
  | { readonly kind: 'type'; readonly text: string }
  | { readonly kind: 'backspace' };

/**
 * What an `insertReplacementText` of `data` from the soft keyboard means, the whole text of its element: the input's one character
 * wherever the keyboard's caret left it, with what was typed beside it, or nothing when the character was deleted.
 */
export function decodeSoftKeyboardText(data: string | null): SoftKeyboardInput {
  const typed = (data ?? '').split(SINK_TEXT).join('');
  if (typed === '') return { kind: 'backspace' };
  return { kind: 'type', text: typed };
}
