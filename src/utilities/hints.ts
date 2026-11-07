import { animatedProperties, isTransitionGroup } from './transition';

/**
 * What to say after "Unsupported utility class" when the class is a real Tailwind one that has an honest alternative here, so
 * the message teaches the fix: `space-y-4` has no child combinator to stand on, and its job is `gap-4`. A class that only has a
 * typo, or no alternative, gets no hint.
 */

const INLINE_DISPLAY = /^(inline|inline-block|inline-flex|inline-grid|inline-table)$/;
const INTRINSIC_LIMIT = /^(min|max)-([wh])-(min|max|fit)$/;
const FLOAT_OR_CLEAR = /^(float|clear)-/;

export function unsupportedHint(utility: string): string | undefined {
  if (/^space-[xy]-/.test(utility)) {
    const axis = utility.startsWith('space-x') ? 'x' : 'y';
    return `there is no child combinator to put margins on the children; use gap-${axis === 'x' ? 'x-' : 'y-'}<n> (or gap-<n>) on the container, which spaces flex and grid children the same way`;
  }
  if (/^divide-/.test(utility)) {
    return 'there is no child combinator to put borders between the children; give each child but the first a border-t (or border-l) or leave a gap-<n> and draw a 1px element between them';
  }
  if (INLINE_DISPLAY.test(utility)) {
    return `there is no inline layout, and a flex or grid parent makes its children block-level anyway; use ${utility === 'inline-grid' ? 'grid' : utility === 'inline-flex' ? 'flex' : 'block or flex'}`;
  }
  if (utility === 'contents') return 'display: contents is not supported; remove the wrapper element, or keep it as a flex or grid container';
  if (/^(table|table-.+|list-item)$/.test(utility) && !/^table-(auto|fixed)$/.test(utility)) {
    return 'there is no table layout; use grid with grid-cols-<n> or [..] tracks';
  }
  if (FLOAT_OR_CLEAR.test(utility)) return 'there are no floats; use flex with ml-auto or justify-end, or grid';
  if (/^(columns-|break-(before|after|inside)-)/.test(utility)) return 'there is no multi-column layout; use grid-cols-<n>';
  if (utility === 'sticky') return 'there is no sticky positioning; use relative, absolute or fixed';
  if (utility === 'isolate' || utility === 'isolation-auto') return 'z-index here never creates a stacking context, so there is nothing to isolate';
  if (utility === 'collapse') return 'visibility: collapse is not supported; use invisible to keep the layout, or hidden to remove it';
  const limit = INTRINSIC_LIMIT.exec(utility);
  if (limit?.[1] !== undefined && limit[2] !== undefined && limit[3] !== undefined) {
    return `Taffy's minimum and maximum sizes take lengths and percentages only, not min-content; size the box itself with ${limit[2]}-${limit[3]}`;
  }
  if (utility === 'max-w-prose') return 'the ch unit (65ch) needs the font\'s metrics, which a size does not have; use max-w-[<n>px] or max-w-2xl';
  if (/subgrid$/.test(utility)) return 'Taffy has no subgrid; write the tracks again on the nested grid';
  if (/^(place-)?content-baseline$/.test(utility)) return 'Taffy has no baseline content alignment; use content-start or content-center';
  if (utility.includes('calc(')) return 'calc() is not supported in a size; use px, rem, a percentage, or a flex or grid layout that does the sum';
  const transition = /^transition-(.+)$/.exec(utility)?.[1];
  if (transition !== undefined && isTransitionGroup(transition) && animatedProperties(transition).length === 0) {
    return `${transition} is not a property this build animates; transition-colors, transition-opacity and transition-all are`;
  }
  return undefined;
}
