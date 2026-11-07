import type { Style, TextDecorationStyle } from '../types';

/**
 * Tailwind v3 (3.4.17) `text-decoration-style` utilities: `decoration-solid|double|dotted|dashed|wavy`. They set the one
 * longhand CSS's `text-decoration-style` sets; native draws it (`native/text_decoration.rs`). The other `decoration-*` classes
 * (colour, thickness) are `text.ts`'s.
 */
const DECORATION_STYLES: readonly TextDecorationStyle[] = ['solid', 'double', 'dotted', 'dashed', 'wavy'];

export function decorationStyleUtility(utility: string): Style | undefined {
  if (!utility.startsWith('decoration-')) return undefined;
  const value = utility.slice('decoration-'.length);
  const style = DECORATION_STYLES.find((candidate) => candidate === value);
  return style === undefined ? undefined : { textDecorationStyle: style };
}
