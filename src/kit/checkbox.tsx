import { forwardRef, type ReactNode } from 'react';
import { Button, View, type UIHandle } from '../components';
import type { UIKeyboardEvent } from '../events';
import type { StyleProp, UIAriaProps } from '../types';
import { Key } from './keys';
import { joinClassNames, type PartProps } from './parts';
import { useControllableState } from './use-controllable-state';

/** `'indeterminate'` is shown as a bar and reported as `aria-checked="mixed"`; a click makes it checked. */
export type CheckedState = boolean | 'indeterminate';

export interface CheckboxProps extends PartProps, Omit<UIAriaProps, 'role' | 'aria-checked'> {
  checked?: CheckedState;
  defaultChecked?: CheckedState;
  /** The state a click or key press asks for; always `true` or `false`. */
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  testID?: string;
  /** The label. It is part of the button, so pressing it toggles the box too. */
  children?: ReactNode;
  /** The square that holds the mark. */
  boxClassName?: string;
  boxStyle?: StyleProp;
  /** The filled inner box that is the checkmark (a bar when indeterminate). */
  indicatorClassName?: string;
  indicatorStyle?: StyleProp;
}

const ROOT_CLASS = 'flex-row items-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50';
const BOX_CLASS = 'w-5 h-5 rounded border-2 border-slate-400 bg-white items-center justify-center';
const BOX_MARKED_CLASS = 'border-indigo-600';
const MARK_CLASS = 'w-3 h-3 rounded-sm bg-indigo-600';
const MIXED_MARK_CLASS = 'w-3 h-1 rounded-sm bg-indigo-600';

/**
 * A checkbox: a `Button` with `role="checkbox"`, a box and, when marked, a filled inner box.
 *
 * Pressing, and Space on the focused button, toggle it through the button's own `click`. Enter does
 * not toggle (WAI-ARIA Authoring Practices, checkbox): the button would activate on it, so the
 * component prevents Enter's default on both `keydown` and `keyup`.
 */
export const Checkbox = forwardRef<UIHandle, CheckboxProps>(function Checkbox(props, ref) {
  const {
    checked, defaultChecked = false, onCheckedChange, disabled = false, className, style, testID, children,
    boxClassName, boxStyle, indicatorClassName, indicatorStyle, ...aria
  } = props;
  const [state, setState] = useControllableState<CheckedState, boolean>({
    prop: checked, defaultProp: defaultChecked, onChange: onCheckedChange, name: 'Checkbox',
  });
  const marked = state !== false;

  // A click never reaches a disabled button or anything inside it, so there is nothing to guard.
  const toggle = () => { setState(state !== true); };
  const swallowEnter = (event: UIKeyboardEvent) => {
    if (event.key === Key.Enter) event.preventDefault();
  };

  return (
    <Button
      {...aria}
      ref={ref}
      testID={testID}
      disabled={disabled}
      className={joinClassNames(ROOT_CLASS, className)}
      style={style}
      role="checkbox"
      aria-checked={state === 'indeterminate' ? 'mixed' : state}
      onClick={toggle}
      onKeyDown={swallowEnter}
      onKeyUp={swallowEnter}
    >
      <View className={joinClassNames(BOX_CLASS, marked && BOX_MARKED_CLASS, boxClassName)} style={boxStyle}>
        {marked && (
          <View
            className={joinClassNames(state === 'indeterminate' ? MIXED_MARK_CLASS : MARK_CLASS, indicatorClassName)}
            style={indicatorStyle}
          />
        )}
      </View>
      {children}
    </Button>
  );
});
Checkbox.displayName = 'Checkbox';
